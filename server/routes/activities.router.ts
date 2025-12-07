import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import {
  insertVolunteerActivitySchema,
  insertImpactMetricSchema,
  insertProjectImpactSchema
} from "@shared/schema";
import {
  handleValidationError,
  calculateProjectProgress,
  detectDuplicateImpact,
  applyRoleBasedAttribution
} from "./utils";

export const activitiesRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// ==================== Volunteer Activity Routes ====================

/**
 * GET /volunteer-activities - List volunteer activities
 * Query params:
 *   - userId: Filter by user ID
 *   - projectId: Filter by project ID
 */
activitiesRouter.get("/volunteer-activities", async (req: Request, res: Response) => {
  try {
    const { userId, projectId } = req.query;

    let activities;
    if (userId) {
      activities = await storage.listVolunteerActivitiesByUser(parseInt(userId as string));
    } else if (projectId) {
      activities = await storage.listVolunteerActivitiesByProject(parseInt(projectId as string));
    } else {
      activities = await storage.listVolunteerActivities();
    }

    res.json(activities);
  } catch (err) {
    console.error("Error fetching volunteer activities:", err);
    res.status(500).json({ message: "Failed to fetch volunteer activities" });
  }
});

/**
 * GET /volunteer-activities/:id - Get a single volunteer activity by ID
 */
activitiesRouter.get("/volunteer-activities/:id", async (req: Request, res: Response) => {
  try {
    const activityId = parseInt(req.params.id);
    const activity = await storage.getVolunteerActivity(activityId);

    if (!activity) {
      return res.status(404).json({ message: "Volunteer activity not found" });
    }

    res.json(activity);
  } catch (err) {
    console.error("Error fetching volunteer activity:", err);
    res.status(500).json({ message: "Failed to fetch volunteer activity" });
  }
});

/**
 * POST /volunteer-activities - Create a new volunteer activity
 * Also updates:
 *   - Assignment hours completed and status
 *   - Project completion percentage and total hours logged
 *   - Employee engagement hours for CSR tracking
 */
activitiesRouter.post("/volunteer-activities", async (req: Request, res: Response) => {
  try {
    const activityData = insertVolunteerActivitySchema.parse(req.body);
    const activity = await storage.createVolunteerActivity(activityData);

    // **KPI Tracking**: Update assignment's hoursCompleted when activity is logged
    if (activity.projectId && activity.userId) {
      try {
        // Get activities for this project-volunteer pair using optimized query
        const userActivities = await storage.listVolunteerActivitiesByUser(activity.userId);
        const projectActivities = userActivities.filter(
          (a: any) => a.projectId === activity.projectId
        );

        // Calculate total hours logged
        const totalHoursLogged = projectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);

        // Find and update the assignment
        const assignments = await storage.listProjectAssignmentsByProject(activity.projectId);
        const assignment = assignments.find((a: any) => a.volunteerId === activity.userId);

        if (assignment) {
          await storage.updateProjectAssignment(assignment.id, {
            hoursCompleted: totalHoursLogged,
            // Auto-complete if hours reach commitment
            status: totalHoursLogged >= (assignment.hoursCommitted || 0) ? "completed" : assignment.status
          });
        }

        // **AI Algorithm**: Auto-calculate and update project completion percentage
        const progressPercentage = await calculateProjectProgress(activity.projectId);
        await storage.updateProject(activity.projectId, {
          completionPercentage: progressPercentage,
          totalHoursLogged: totalHoursLogged
        });
      } catch (updateErr) {
        console.error("Error updating assignment or project progress:", updateErr);
        // Don't fail the activity creation if update fails
      }
    }

    // **CSR Dashboard KPI Tracking**: Update employee engagement hours when volunteer with employer link logs activity
    if (activity.userId && activity.hours) {
      try {
        const volunteerProfile = await storage.getVolunteerProfileByUserId(activity.userId);

        if (volunteerProfile?.employerId) {
          // Get user email for employee engagement tracking
          const user = await storage.getUser(activity.userId);
          if (user?.email) {
            // Get existing employee engagement record (ensure type consistency)
            const allEngagements = (await storage.listEmployeeEngagement()) || [];
            const employerIdNum = typeof volunteerProfile.employerId === 'string'
              ? parseInt(volunteerProfile.employerId)
              : volunteerProfile.employerId;

            const existing = (Array.isArray(allEngagements) ? allEngagements : []).find((e: any) =>
              e?.partnerId === employerIdNum &&
              e?.employeeEmail === user.email
            );

            if (existing) {
              // Increment hours
              await storage.updateEmployeeEngagement(existing.id, {
                hoursVolunteered: (existing.hoursVolunteered || 0) + activity.hours,
                projectId: activity.projectId
              });
            } else {
              // Create new employee engagement record with correct partnerId type
              await storage.createEmployeeEngagement({
                partnerId: employerIdNum,
                employeeEmail: user.email,
                employeeName: volunteerProfile.volunteerName || user.displayName,
                projectId: activity.projectId,
                hoursVolunteered: activity.hours,
                engagementType: 'vto'
              });
            }

            // **SDG-Specific Hours Tracking**: Update CSR challenge progress if activity contributes to SDG
            if (activity.projectId) {
              try {
                const project = await storage.getProject(activity.projectId);
                if (project?.sdgGoals && Array.isArray(project.sdgGoals) && project.sdgGoals.length > 0) {
                  const primarySDG = project.sdgGoals[0];
                  const allChallenges = await storage.listCSRChallenges();
                  const activeChallenges = allChallenges.filter((c: any) =>
                    c.partnerId === employerIdNum &&
                    c.status === 'active' &&
                    c.sdgGoal === primarySDG
                  );

                  for (const challenge of activeChallenges) {
                    const currentHours = challenge.currentHours || 0;
                    await storage.updateCSRChallenge(challenge.id, {
                      currentHours: currentHours + activity.hours
                    });
                  }
                }
              } catch (sdgErr) {
                console.error("Error updating SDG-specific hours for challenge:", sdgErr);
                // Non-critical
              }
            }
          }
        }
      } catch (crsErr) {
        console.error("Error updating employee engagement hours:", crsErr);
        // Non-critical, don't fail the activity creation
      }
    }

    broadcastUpdate("volunteer_activity_created", activity);
    res.status(201).json(activity);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

/**
 * PATCH /volunteer-activities/:id - Update an existing volunteer activity
 * Recalculates assignment hours and employee engagement hours when activity hours change
 */
activitiesRouter.patch("/volunteer-activities/:id", async (req: Request, res: Response) => {
  try {
    const activityId = parseInt(req.params.id);

    // Get the old activity to compare hours
    const oldActivity = await storage.getVolunteerActivity(activityId);
    const activityData = insertVolunteerActivitySchema.partial().parse(req.body);

    const updatedActivity = await storage.updateVolunteerActivity(activityId, activityData);
    if (!updatedActivity) {
      return res.status(404).json({ message: "Volunteer activity not found" });
    }

    // **KPI Tracking**: Recalculate and update assignment hoursCompleted when activity is updated
    if (updatedActivity.projectId && updatedActivity.userId) {
      try {
        // Get all activities for this project-volunteer pair
        const allActivities = await storage.listVolunteerActivities();
        const projectActivities = allActivities.filter(
          (a: any) => a.projectId === updatedActivity.projectId && a.userId === updatedActivity.userId
        );

        // Calculate total hours logged
        const totalHoursLogged = projectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);

        // Find and update the assignment
        const assignments = await storage.listProjectAssignmentsByProject(updatedActivity.projectId);
        const assignment = assignments.find((a: any) => a.volunteerId === updatedActivity.userId);

        if (assignment) {
          await storage.updateProjectAssignment(assignment.id, {
            hoursCompleted: totalHoursLogged,
            // Auto-complete if hours reach commitment
            status: totalHoursLogged >= (assignment.hoursCommitted || 0) ? "completed" : assignment.status
          });
        }
      } catch (updateErr) {
        console.error("Error updating assignment hoursCompleted:", updateErr);
        // Don't fail the activity update if assignment update fails
      }
    }

    // **CSR Dashboard KPI Tracking**: Update employee engagement hours when activity hours are changed
    if (updatedActivity.userId && oldActivity && oldActivity.hours !== updatedActivity.hours) {
      try {
        const volunteerProfile = await storage.getVolunteerProfileByUserId(updatedActivity.userId);
        if (volunteerProfile?.employerId) {
          const user = await storage.getUser(updatedActivity.userId);
          if (user?.email) {
            // Ensure type consistency for partnerId comparison
            const employerIdNum = typeof volunteerProfile.employerId === 'string'
              ? parseInt(volunteerProfile.employerId)
              : volunteerProfile.employerId;
            const allEngagements = (await storage.listEmployeeEngagement()) || [];
            const existing = (Array.isArray(allEngagements) ? allEngagements : []).find((e: any) =>
              e?.partnerId === employerIdNum &&
              e?.employeeEmail === user.email
            );

            if (existing) {
              // Calculate hour difference
              const hourDifference = (updatedActivity.hours || 0) - (oldActivity.hours || 0);
              await storage.updateEmployeeEngagement(existing.id, {
                hoursVolunteered: (existing.hoursVolunteered || 0) + hourDifference
              });
            }
          }
        }
      } catch (csrErr) {
        console.error("Error updating employee engagement hours on activity update:", csrErr);
        // Non-critical, don't fail the activity update
      }
    }

    broadcastUpdate("volunteer_activity_updated", updatedActivity);
    res.json(updatedActivity);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// ==================== Impact Metric Routes ====================

/**
 * GET /impact-metrics - List impact metrics
 * Query params:
 *   - category: Filter by category
 *   - sdgGoal: Filter by SDG goal number
 */
activitiesRouter.get("/impact-metrics", async (req: Request, res: Response) => {
  try {
    const { category, sdgGoal } = req.query;

    let metrics;
    if (category) {
      metrics = await storage.listImpactMetricsByCategory(category as string);
    } else if (sdgGoal) {
      metrics = await storage.listImpactMetricsBySDG(parseInt(sdgGoal as string));
    } else {
      metrics = await storage.listImpactMetrics();
    }

    res.json(metrics);
  } catch (err) {
    console.error("Error fetching impact metrics:", err);
    res.status(500).json({ message: "Failed to fetch impact metrics" });
  }
});

/**
 * GET /impact-metrics/:id - Get a single impact metric by ID
 */
activitiesRouter.get("/impact-metrics/:id", async (req: Request, res: Response) => {
  try {
    const metricId = parseInt(req.params.id);
    const metric = await storage.getImpactMetric(metricId);

    if (!metric) {
      return res.status(404).json({ message: "Impact metric not found" });
    }

    res.json(metric);
  } catch (err) {
    console.error("Error fetching impact metric:", err);
    res.status(500).json({ message: "Failed to fetch impact metric" });
  }
});

/**
 * POST /impact-metrics - Create a new impact metric
 */
activitiesRouter.post("/impact-metrics", async (req: Request, res: Response) => {
  try {
    const metricData = insertImpactMetricSchema.parse(req.body);
    const metric = await storage.createImpactMetric(metricData);

    broadcastUpdate("impact_metric_created", metric);
    res.status(201).json(metric);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

/**
 * PATCH /impact-metrics/:id - Update an existing impact metric
 */
activitiesRouter.patch("/impact-metrics/:id", async (req: Request, res: Response) => {
  try {
    const metricId = parseInt(req.params.id);
    const metricData = insertImpactMetricSchema.partial().parse(req.body);

    const updatedMetric = await storage.updateImpactMetric(metricId, metricData);
    if (!updatedMetric) {
      return res.status(404).json({ message: "Impact metric not found" });
    }

    broadcastUpdate("impact_metric_updated", updatedMetric);
    res.json(updatedMetric);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// ==================== Project Impact Routes ====================

/**
 * GET /project-impacts - List project impacts
 * Query params:
 *   - projectId: Filter by project ID
 *   - metricId: Filter by metric ID
 */
activitiesRouter.get("/project-impacts", async (req: Request, res: Response) => {
  try {
    const { projectId, metricId } = req.query;

    let impacts;
    if (projectId) {
      impacts = await storage.listProjectImpactsByProject(parseInt(projectId as string));
    } else if (metricId) {
      impacts = await storage.listProjectImpactsByMetric(parseInt(metricId as string));
    } else {
      impacts = await storage.listProjectImpacts();
    }

    res.json(impacts);
  } catch (err) {
    console.error("Error fetching project impacts:", err);
    res.status(500).json({ message: "Failed to fetch project impacts" });
  }
});

/**
 * GET /project-impacts/:id - Get a single project impact by ID
 */
activitiesRouter.get("/project-impacts/:id", async (req: Request, res: Response) => {
  try {
    const impactId = parseInt(req.params.id);
    const impact = await storage.getProjectImpact(impactId);

    if (!impact) {
      return res.status(404).json({ message: "Project impact not found" });
    }

    res.json(impact);
  } catch (err) {
    console.error("Error fetching project impact:", err);
    res.status(500).json({ message: "Failed to fetch project impact" });
  }
});

/**
 * POST /project-impacts - Create a new project impact
 * Features:
 *   - Deduplication detection for shared outcomes
 *   - Role-based attribution weighting (lead/support/observer)
 *   - Automatic project completion percentage update
 */
activitiesRouter.post("/project-impacts", async (req: Request, res: Response) => {
  try {
    const impactData = insertProjectImpactSchema.parse(req.body);

    // **DEDUPLICATION**: Detect duplicate impacts
    const dedup = await detectDuplicateImpact(
      impactData.projectId!,
      impactData.userId || 0,
      impactData.metricId!,
      impactData.outcomeType || 'individual',
      new Date(impactData.date),
      storage
    );

    // Apply role-based attribution weighting
    const attributedValue = applyRoleBasedAttribution(
      impactData.value,
      impactData.role || 'support'
    );

    // Create impact with deduplication metadata
    const impact = await storage.createProjectImpact({
      ...impactData,
      value: attributedValue,
      isDuplicated: dedup.isDuplicate,
      dedupGroupId: dedup.dedupGroupId,
      verificationStatus: impactData.verificationStatus || 'pending'
    });

    // **AI Algorithm**: Auto-calculate and update project completion percentage when impact is logged
    if (impact.projectId) {
      try {
        const progressPercentage = await calculateProjectProgress(impact.projectId);
        await storage.updateProject(impact.projectId, {
          completionPercentage: progressPercentage
        });
      } catch (updateErr) {
        console.error("Error updating project progress:", updateErr);
        // Don't fail impact creation if progress update fails
      }
    }

    broadcastUpdate("project_impact_created", {
      ...impact,
      deduplicationAlert: dedup.isDuplicate ? {
        message: "Potential duplicate detected",
        matchingCount: (dedup.matchingImpacts?.length || 0)
      } : null
    });
    res.status(201).json(impact);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

/**
 * PATCH /project-impacts/:id - Update an existing project impact
 */
activitiesRouter.patch("/project-impacts/:id", async (req: Request, res: Response) => {
  try {
    const impactId = parseInt(req.params.id);
    const impactData = insertProjectImpactSchema.partial().parse(req.body);

    const updatedImpact = await storage.updateProjectImpact(impactId, impactData);
    if (!updatedImpact) {
      return res.status(404).json({ message: "Project impact not found" });
    }

    broadcastUpdate("project_impact_updated", updatedImpact);
    res.json(updatedImpact);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});
