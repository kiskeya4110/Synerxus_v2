import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import {
  insertVolunteerActivitySchema,
  insertImpactMetricSchema,
  insertProjectImpactSchema,
  insertExternalVolunteerSchema,
  type VolunteerActivity,
  type ProjectImpact,
  type ExternalVolunteer,
  type InsertVerificationAuditLog,
} from "@shared/schema";
import {
  handleValidationError,
  calculateProjectProgress,
  detectDuplicateImpact,
  applyRoleBasedAttribution,
  updateAiuKpiFromImpacts
} from "./utils";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../middleware/auth";
import { checkAndAwardBadges } from "../badge-service";
import {
  sendActivityApprovalNotification,
  sendImpactApprovalNotification,
} from "../email-digest-service";
import {
  notifyPendingImpact,
  notifyPendingActivity,
} from "../notification-service";
import { persistKPIsForActivity } from "../kpi-persistence-service";

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
 *   - userId: Filter by user ID (requires auth - can only access own activities)
 *   - projectId: Filter by project ID (requires project assignment)
 *   - organizationId: Filter by org ID (requires org membership)
 *
 * Authorization:
 *   - Volunteers can only access their own activities
 *   - Organizations can access activities for their projects
 *   - CSR partners can access activities for their linked employees
 */
activitiesRouter.get("/volunteer-activities", optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, projectId, organizationId } = req.query;
    const authenticatedUser = req.user;

    let activities: VolunteerActivity[] = [];

    if (userId) {
      const requestedUserId = parseInt(userId as string);

      // SECURITY: Require authentication when querying by userId
      if (!authenticatedUser) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Authentication required to access user activities"
        });
      }

      // Authorization check: Users can only access their own activities
      // unless they are an organization viewing their project's activities
      if (authenticatedUser.id !== requestedUserId &&
          authenticatedUser.userType !== 'organization' &&
          authenticatedUser.userType !== 'corporate-partner') {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "You can only access your own activities"
        });
      }

      activities = await storage.listVolunteerActivitiesByUser(requestedUserId);
    } else if (projectId) {
      const projectIdNum = parseInt(projectId as string);

      // SECURITY: Require authentication when querying by projectId
      if (!authenticatedUser) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Authentication required to access project activities"
        });
      }

      // Verify user has access to this project
      const project = await storage.getProject(projectIdNum);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check authorization: must be volunteer assigned to project or org owner
      if (authenticatedUser.userType === 'volunteer') {
        const assignments = await storage.listProjectAssignmentsByVolunteer(authenticatedUser.id);
        if (!assignments.some(a => a.projectId === projectIdNum)) {
          return res.status(403).json({
            error: "FORBIDDEN",
            message: "You must be assigned to this project to view activities"
          });
        }
      } else if (authenticatedUser.userType === 'organization') {
        if (project.organizationId !== authenticatedUser.organizationId) {
          return res.status(403).json({
            error: "FORBIDDEN",
            message: "You can only view activities for your organization's projects"
          });
        }
      }

      activities = await storage.listVolunteerActivitiesByProject(projectIdNum);
    } else if (organizationId) {
      const orgId = parseInt(organizationId as string);

      // SECURITY: Require authentication when querying by organizationId
      if (!authenticatedUser) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Authentication required to access organization activities"
        });
      }

      // Authorization: Only organization members can view org activities
      if (authenticatedUser.userType === 'organization') {
        if (authenticatedUser.organizationId !== orgId) {
          return res.status(403).json({
            error: "FORBIDDEN",
            message: "You can only view activities for your own organization"
          });
        }
      }

      const orgProjects = await storage.listProjectsByOrganization(orgId);
      const orgProjectIds = new Set(orgProjects.map(p => p.id));
      const allActivities = await storage.listVolunteerActivities();
      activities = allActivities.filter(a => a.projectId && orgProjectIds.has(a.projectId));
    } else {
      // No filter - require authentication and limit based on user type
      if (!authenticatedUser) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Authentication required to list all activities"
        });
      }

      if (authenticatedUser.userType === 'volunteer') {
        // Volunteers only see their own activities
        activities = await storage.listVolunteerActivitiesByUser(authenticatedUser.id);
      } else if (authenticatedUser.userType === 'organization' && authenticatedUser.organizationId) {
        // Organizations see activities for their projects
        const orgProjects = await storage.listProjectsByOrganization(authenticatedUser.organizationId);
        const orgProjectIds = new Set(orgProjects.map(p => p.id));
        const allActivities = await storage.listVolunteerActivities();
        activities = allActivities.filter(a => a.projectId && orgProjectIds.has(a.projectId));
      } else {
        activities = [];
      }
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
        const userProjectActivities = userActivities.filter(
          (a: any) => a.projectId === activity.projectId
        );

        // Calculate user's total hours on this project (for assignment tracking)
        const userHoursLogged = userProjectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);

        // Find and update the assignment
        const assignments = await storage.listProjectAssignmentsByProject(activity.projectId);
        const assignment = assignments.find((a: any) => a.volunteerId === activity.userId);

        if (assignment) {
          await storage.updateProjectAssignment(assignment.id, {
            hoursCompleted: userHoursLogged,
            // Auto-complete if hours reach commitment
            status: userHoursLogged >= (assignment.hoursCommitted || 0) ? "completed" : assignment.status
          });
        }

        // **AI Algorithm**: Auto-calculate and update project completion percentage
        // Get ALL activities for this project (not just this user's) for accurate total
        const allProjectActivities = await storage.listVolunteerActivitiesByProject(activity.projectId);
        const totalProjectHours = allProjectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);

        const progressPercentage = await calculateProjectProgress(activity.projectId);
        await storage.updateProject(activity.projectId, {
          completionPercentage: progressPercentage,
          totalHoursLogged: totalProjectHours
        });
      } catch (updateErr) {
        console.error("Error updating assignment or project progress:", updateErr);
        // Don't fail the activity creation if update fails
      }
    }

    // **CSR Dashboard KPI Tracking**: Note - Employee engagement hours are now updated
    // only when hours are APPROVED (not at creation time). This ensures only verified
    // hours flow to CSR corporate dashboards. See POST /volunteer-activities/:id/approve

    // Notify organization about pending activity approval
    // Default verificationStatus from schema is 'pending'
    if (activity.projectId && activity.userId) {
      try {
        await notifyPendingActivity(
          activity.id,
          activity.projectId,
          activity.userId,
          activity.hours || 0
        );
      } catch (notifyErr) {
        console.error("Error sending pending activity notification:", notifyErr);
        // Don't fail activity creation if notification fails
      }
    }

    // Persist KPIs (fire-and-forget)
    if (activity.userId) {
      const project = activity.projectId ? await storage.getProject(activity.projectId) : null;
      persistKPIsForActivity(activity.userId, project?.organizationId).catch(err =>
        console.error("[KPI] Error persisting KPIs after activity creation:", err)
      );
    }

    broadcastUpdate("volunteer_activity_created", activity);
    res.status(201).json(activity);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

/**
 * POST /admin/volunteer-activities - Admin logs activity on behalf of a volunteer
 * Allows organization admins to log hours for registered or external volunteers
 *
 * Body: {
 *   volunteerType: "registered" | "external",
 *   userId?: number,           // For registered volunteers
 *   externalVolunteerId?: number, // For existing external volunteers
 *   newExternalVolunteer?: {   // To create new external volunteer inline
 *     fullName: string,
 *     email?: string,
 *     phone?: string,
 *     notes?: string,
 *     source?: string
 *   },
 *   projectId: number,
 *   taskId?: number,
 *   hours: number,
 *   date: string,
 *   description?: string,
 *   skillsApplied?: string[],
 *   outcomes?: string,
 *   evidenceUrls?: string[],
 *   autoApprove?: boolean (default: true)
 * }
 */
activitiesRouter.post("/admin/volunteer-activities", optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    // Try token-based auth first, fall back to x-user-id header for demo mode
    // Note: Cannot use req.body.userId for admin identity because that field
    // contains the target volunteer's userId in this endpoint
    let user = req.user;
    if (!user) {
      const headerUserId = req.headers['x-user-id'] as string;
      const fallbackUserId = headerUserId ? parseInt(headerUserId) : null;
      if (fallbackUserId && !isNaN(fallbackUserId)) {
        const fallbackUser = await storage.getUser(fallbackUserId);
        if (fallbackUser) {
          user = {
            id: fallbackUser.id,
            email: fallbackUser.email,
            userType: fallbackUser.userType || 'volunteer',
            organizationId: fallbackUser.organizationId,
            firebaseUid: fallbackUser.firebaseUid,
          };
          req.user = user;
        }
      }
    }

    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Only organization users can log activities on behalf of others
    if (user.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization users can log activities for volunteers" });
    }

    // Get user's organization
    if (!user.organizationId) {
      return res.status(403).json({ message: "Organization not found" });
    }
    const userOrg = await storage.getOrganization(user.organizationId);
    if (!userOrg) {
      return res.status(403).json({ message: "Organization not found" });
    }

    const {
      volunteerType,
      userId,
      externalVolunteerId,
      newExternalVolunteer,
      projectId,
      taskId,
      hours,
      date,
      description,
      skillsApplied,
      outcomes,
      evidenceUrls,
      autoApprove = true, // Default to auto-approve for admin-logged activities
      outcomeQuantity,
      outcomeText,
      outcomeType
    } = req.body;

    // Validate required fields
    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }
    if (!hours || hours <= 0) {
      return res.status(400).json({ message: "hours must be a positive number" });
    }
    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    // Verify the project belongs to the user's organization
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (project.organizationId !== userOrg.id) {
      return res.status(403).json({ message: "Project does not belong to your organization" });
    }

    let targetUserId: number | undefined;
    let targetExternalVolunteerId: number | undefined;

    if (volunteerType === 'registered') {
      // Logging for a registered volunteer
      if (!userId) {
        return res.status(400).json({ message: "userId is required for registered volunteers" });
      }
      targetUserId = userId;

      // Verify the volunteer exists
      const volunteer = await storage.getUser(userId);
      if (!volunteer) {
        return res.status(404).json({ message: "Volunteer user not found" });
      }
    } else if (volunteerType === 'external') {
      // Logging for an external volunteer
      if (externalVolunteerId) {
        // Using existing external volunteer
        const extVol = await storage.getExternalVolunteer(externalVolunteerId);
        if (!extVol) {
          return res.status(404).json({ message: "External volunteer not found" });
        }
        if (extVol.organizationId !== userOrg.id) {
          return res.status(403).json({ message: "External volunteer does not belong to your organization" });
        }
        targetExternalVolunteerId = externalVolunteerId;
      } else if (newExternalVolunteer && newExternalVolunteer.fullName) {
        // Create new external volunteer inline
        const newExtVol = await storage.createExternalVolunteer({
          organizationId: userOrg.id,
          fullName: newExternalVolunteer.fullName,
          email: newExternalVolunteer.email,
          phone: newExternalVolunteer.phone,
          notes: newExternalVolunteer.notes,
          source: newExternalVolunteer.source || 'admin-logged',
          createdBy: user.id
        });
        targetExternalVolunteerId = newExtVol.id;
      } else {
        return res.status(400).json({ message: "Either externalVolunteerId or newExternalVolunteer.fullName is required for external volunteers" });
      }
    } else {
      return res.status(400).json({ message: "volunteerType must be 'registered' or 'external'" });
    }

    // Create the activity
    const activityData: any = {
      userId: targetUserId || null,
      externalVolunteerId: targetExternalVolunteerId || null,
      projectId,
      taskId: taskId || null,
      hours,
      date: new Date(date),
      description: description || null,
      skillsApplied: skillsApplied || null,
      outcomes: outcomes || null,
      evidenceUrls: evidenceUrls || null,
      loggedBy: user.id,
      loggedByType: 'admin',
      verificationStatus: autoApprove ? 'approved' : 'pending',
      outcomeQuantity: outcomeQuantity || null,
      outcomeText: outcomeText || null,
      outcomeType: outcomeType || null,
    };

    const activity = await storage.createVolunteerActivity(activityData);

    // Update project hours if this is for a registered volunteer
    if (activity.projectId && targetUserId) {
      try {
        // Get activities for this project-volunteer pair
        const userActivities = await storage.listVolunteerActivitiesByUser(targetUserId);
        const userProjectActivities = userActivities.filter(
          (a: any) => a.projectId === activity.projectId
        );
        const userHoursLogged = userProjectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);

        // Update assignment if exists
        const assignments = await storage.listProjectAssignmentsByProject(activity.projectId);
        const assignment = assignments.find((a: any) => a.volunteerId === targetUserId);

        if (assignment) {
          await storage.updateProjectAssignment(assignment.id, {
            hoursCompleted: userHoursLogged,
            status: userHoursLogged >= (assignment.hoursCommitted || 0) ? "completed" : assignment.status
          });
        }

        // Update project total hours
        const allProjectActivities = await storage.listVolunteerActivitiesByProject(activity.projectId);
        const totalProjectHours = allProjectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);

        const progressPercentage = await calculateProjectProgress(activity.projectId);
        await storage.updateProject(activity.projectId, {
          completionPercentage: progressPercentage,
          totalHoursLogged: totalProjectHours
        });
      } catch (updateErr) {
        console.error("Error updating project progress for admin-logged activity:", updateErr);
      }
    }

    // Update project hours for external volunteer activities too
    if (activity.projectId && targetExternalVolunteerId) {
      try {
        const allProjectActivities = await storage.listVolunteerActivitiesByProject(activity.projectId);
        const totalProjectHours = allProjectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);

        const progressPercentage = await calculateProjectProgress(activity.projectId);
        await storage.updateProject(activity.projectId, {
          completionPercentage: progressPercentage,
          totalHoursLogged: totalProjectHours
        });
      } catch (updateErr) {
        console.error("Error updating project progress for external volunteer activity:", updateErr);
      }
    }

    // **CSR Integration for Auto-Approved Activities**
    // When admin logs and auto-approves, create verified_outputs and update employee engagement
    if (autoApprove && targetUserId && activity.hours) {
      try {
        const volunteerProfile = await storage.getVolunteerProfileByUserId(targetUserId);
        const volunteer = await storage.getUser(targetUserId);

        // Find all employer IDs linked to this volunteer
        const linkedEmployerIds = new Set<number>();

        // Method 1: Direct link via volunteerProfile.employerId
        if (volunteerProfile?.employerId) {
          const employerIdNum = typeof volunteerProfile.employerId === 'string'
            ? parseInt(volunteerProfile.employerId)
            : volunteerProfile.employerId;
          if (!isNaN(employerIdNum)) {
            linkedEmployerIds.add(employerIdNum);
          }
        }

        // Method 2: Explicit link via volunteerEmployerLinks table
        if (volunteerProfile?.id) {
          const employerLinks = await storage.listVolunteerEmployerLinks?.() || [];
          const volunteerLinks = employerLinks.filter((link: any) =>
            link.volunteerId === volunteerProfile.id &&
            link.verificationStatus !== 'rejected'
          );
          volunteerLinks.forEach((link: any) => {
            if (link.partnerId) {
              const partnerIdNum = Number(link.partnerId);
              if (!isNaN(partnerIdNum)) {
                linkedEmployerIds.add(partnerIdNum);
              }
            }
          });
        }

        // Update employee engagement and create verified outputs for all linked employers
        if (linkedEmployerIds.size > 0 && volunteer?.email) {
          const allEngagements = (await storage.listEmployeeEngagement()) || [];

          for (const employerIdNum of Array.from(linkedEmployerIds)) {
            const existing = (Array.isArray(allEngagements) ? allEngagements : []).find((e: any) =>
              e?.partnerId === employerIdNum &&
              e?.employeeEmail === volunteer.email
            );

            if (existing) {
              await storage.updateEmployeeEngagement(existing.id, {
                hoursVolunteered: (existing.hoursVolunteered || 0) + activity.hours,
                projectId: activity.projectId
              });
            } else {
              await storage.createEmployeeEngagement({
                partnerId: employerIdNum,
                employeeEmail: volunteer.email,
                employeeName: volunteerProfile?.volunteerName || volunteer.displayName,
                projectId: activity.projectId,
                hoursVolunteered: activity.hours,
                engagementType: 'vto'
              });
            }

            // Create verified output for audit trail
            await storage.createVerifiedOutput({
              activityId: activity.id,
              partnerId: employerIdNum,
              projectId: activity.projectId || 0,
              outputType: 'hours',
              outputValue: activity.hours,
              verificationStatus: 'verified',
              verifiedBy: user.id,
              verifiedAt: new Date(),
              auditTrail: {
                action: 'hours_admin_approved',
                description: `Admin-logged hours approved: ${activity.hours}h for ${volunteer.displayName || volunteer.email}`,
                timestamp: new Date().toISOString(),
                reviewerId: user.id,
                loggedByType: 'admin'
              }
            });

            console.log(`[CSR] Admin-logged activity: Updated employee engagement for ${volunteer.email} at employer ${employerIdNum} with ${activity.hours}h verified hours`);
          }
        }
      } catch (csrErr) {
        console.error("Error updating CSR integration for admin-logged activity:", csrErr);
        // Non-critical, don't fail the creation
      }
    }

    // Persist KPIs (fire-and-forget)
    if (activity.userId) {
      persistKPIsForActivity(activity.userId, userOrg.id).catch(err =>
        console.error("[KPI] Error persisting KPIs after admin activity creation:", err)
      );
    }

    broadcastUpdate("volunteer_activity_created", activity);
    res.status(201).json({
      ...activity,
      message: autoApprove ? "Activity logged and approved" : "Activity logged and pending approval"
    });
  } catch (err) {
    console.error("Error creating admin-logged activity:", err);
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
        // Get this user's activities for this project (for assignment tracking)
        const userActivities = await storage.listVolunteerActivitiesByUser(updatedActivity.userId);
        const userProjectActivities = userActivities.filter(
          (a: any) => a.projectId === updatedActivity.projectId
        );

        // Calculate user's total hours on this project
        const userHoursLogged = userProjectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);

        // Find and update the assignment
        const assignments = await storage.listProjectAssignmentsByProject(updatedActivity.projectId);
        const assignment = assignments.find((a: any) => a.volunteerId === updatedActivity.userId);

        if (assignment) {
          await storage.updateProjectAssignment(assignment.id, {
            hoursCompleted: userHoursLogged,
            // Auto-complete if hours reach commitment
            status: userHoursLogged >= (assignment.hoursCommitted || 0) ? "completed" : assignment.status
          });
        }

        // **AI Algorithm**: Auto-calculate and update project completion percentage
        // Get ALL activities for this project (not just this user's) for accurate total
        const allProjectActivities = await storage.listVolunteerActivitiesByProject(updatedActivity.projectId);
        const totalProjectHours = allProjectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);

        const progressPercentage = await calculateProjectProgress(updatedActivity.projectId);
        await storage.updateProject(updatedActivity.projectId, {
          completionPercentage: progressPercentage,
          totalHoursLogged: totalProjectHours
        });
      } catch (updateErr) {
        console.error("Error updating assignment or project progress:", updateErr);
        // Don't fail the activity update if update fails
      }
    }

    // **CSR Dashboard KPI Tracking**: Update employee engagement hours when APPROVED activity hours are changed
    // Only update CSR engagement if the activity is already approved
    if (updatedActivity.userId && oldActivity && oldActivity.hours !== updatedActivity.hours &&
        updatedActivity.verificationStatus === 'approved') {
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

    // Persist KPIs (fire-and-forget)
    if (updatedActivity.userId) {
      const project = updatedActivity.projectId ? await storage.getProject(updatedActivity.projectId) : null;
      persistKPIsForActivity(updatedActivity.userId, project?.organizationId).catch(err =>
        console.error("[KPI] Error persisting KPIs after activity update:", err)
      );
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

      // **AIU Auto-Update**: Update AIU kpiAfter value from cumulative impacts
      try {
        await updateAiuKpiFromImpacts(impact.projectId);
      } catch (aiuErr) {
        console.error("Error updating AIU settings:", aiuErr);
        // Don't fail impact creation if AIU update fails
      }
    }

    // Notify organization about pending impact approval
    if (impact.verificationStatus === 'pending' && impact.projectId && impact.userId) {
      try {
        await notifyPendingImpact(
          impact.id,
          impact.projectId,
          impact.userId,
          impact.metricId,
          impact.value
        );
      } catch (notifyErr) {
        console.error("Error sending pending impact notification:", notifyErr);
        // Don't fail impact creation if notification fails
      }
    }

    // Persist KPIs (fire-and-forget)
    if (impact.userId) {
      const project = impact.projectId ? await storage.getProject(impact.projectId) : null;
      persistKPIsForActivity(impact.userId, project?.organizationId).catch(err =>
        console.error("[KPI] Error persisting KPIs after impact creation:", err)
      );
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
 * Also recalculates AIU kpiAfter when verification status changes
 */
activitiesRouter.patch("/project-impacts/:id", async (req: Request, res: Response) => {
  try {
    const impactId = parseInt(req.params.id);
    const impactData = insertProjectImpactSchema.partial().parse(req.body);

    const updatedImpact = await storage.updateProjectImpact(impactId, impactData);
    if (!updatedImpact) {
      return res.status(404).json({ message: "Project impact not found" });
    }

    // **AIU Auto-Update**: Recalculate AIU when impact is updated (especially verification status changes)
    if (updatedImpact.projectId) {
      try {
        await updateAiuKpiFromImpacts(updatedImpact.projectId);
      } catch (aiuErr) {
        console.error("Error updating AIU settings:", aiuErr);
        // Don't fail impact update if AIU update fails
      }
    }

    // Persist KPIs (fire-and-forget)
    if (updatedImpact.userId) {
      const project = updatedImpact.projectId ? await storage.getProject(updatedImpact.projectId) : null;
      persistKPIsForActivity(updatedImpact.userId, project?.organizationId).catch(err =>
        console.error("[KPI] Error persisting KPIs after impact update:", err)
      );
    }

    broadcastUpdate("project_impact_updated", updatedImpact);
    res.json(updatedImpact);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// ==================== Approval Routes ====================

/**
 * GET /pending-approvals - Get all pending items awaiting approval for an organization
 * Uses authMiddleware for proper authentication via Bearer token
 */
activitiesRouter.get("/pending-approvals", authMiddleware, async (req: Request, res: Response) => {
  try {
    // Use authenticated user from middleware
    const requestingUser = req.user;

    if (!requestingUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Only organization users can view pending approvals
    if (requestingUser.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization admins can view pending approvals" });
    }

    const results: {
      pendingActivities: VolunteerActivity[];
      pendingImpacts: ProjectImpact[];
      totalPending: number;
    } = {
      pendingActivities: [],
      pendingImpacts: [],
      totalPending: 0
    };

    // Get organization's projects - use authenticated user's org
    let projectIds: number[] = [];
    const targetOrgId = requestingUser.organizationId;
    if (targetOrgId) {
      const orgProjects = await storage.listProjectsByOrganization(targetOrgId);
      projectIds = orgProjects.map(p => p.id);
    }

    if (projectIds.length === 0) {
      return res.json(results);
    }

    // Get pending volunteer activities (include 'pending', 'self_reported', or undefined status)
    const allActivities = await storage.listVolunteerActivities();
    const pendingActivities = allActivities.filter((a: any) =>
      a.projectId &&
      projectIds.includes(a.projectId) &&
      (a.verificationStatus === 'pending' || a.verificationStatus === 'self_reported' || !a.verificationStatus)
    );

    // Enrich activities with volunteer info
    for (const activity of pendingActivities) {
      const volunteer = activity.userId ? await storage.getUser(activity.userId) : null;
      const project = activity.projectId ? await storage.getProject(activity.projectId) : null;
      results.pendingActivities.push({
        ...(activity as any),
        volunteerName: volunteer?.displayName || volunteer?.email || 'Unknown',
        volunteerEmail: volunteer?.email,
        projectName: project?.name || 'Unknown Project',
        type: 'hours'
      });
    }

    // Get pending project impacts (include both 'pending' and 'self_reported' status)
    const allImpacts = await storage.listProjectImpacts();
    const pendingImpacts = allImpacts.filter((i: any) =>
      i.projectId &&
      projectIds.includes(i.projectId) &&
      (i.verificationStatus === 'pending' || i.verificationStatus === 'self_reported')
    );

    // Enrich impacts with volunteer and project info
    for (const impact of pendingImpacts) {
      const volunteer = impact.userId ? await storage.getUser(impact.userId) : null;
      const project = impact.projectId ? await storage.getProject(impact.projectId) : null;
      const metric = impact.metricId ? await storage.getImpactMetric(impact.metricId) : null;
      results.pendingImpacts.push({
        ...(impact as any),
        volunteerName: volunteer?.displayName || volunteer?.email || 'System',
        volunteerEmail: volunteer?.email,
        projectName: project?.name || 'Unknown Project',
        metricName: metric?.name || 'Unknown Metric',
        type: 'impact'
      });
    }

    results.totalPending = results.pendingActivities.length + results.pendingImpacts.length;

    res.json(results);
  } catch (err) {
    console.error("Error fetching pending approvals:", err);
    res.status(500).json({ message: "Failed to fetch pending approvals" });
  }
});

/**
 * POST /volunteer-activities/:id/approve - Approve a volunteer activity (hours)
 * Also updates CSR employee engagement, challenge progress, and creates verified output records
 */
activitiesRouter.post("/volunteer-activities/:id/approve", authMiddleware, async (req: Request, res: Response) => {
  try {
    const activityId = parseInt(req.params.id);
    const reviewerId = req.user?.id;

    // Security: Require organization user type
    if (req.user?.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization users can approve activities" });
    }

    const activity = await storage.getVolunteerActivity(activityId);
    if (!activity) {
      return res.status(404).json({ message: "Volunteer activity not found" });
    }

    // Security: Validate activity belongs to user's organization
    if (activity.projectId) {
      const project = await storage.getProject(activity.projectId);
      if (project && project.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Cannot approve activities for other organizations" });
      }
    }

    // Security: Check canApproveHours permission
    if (req.user.organizationId) {
      const members = await storage.listOrganizationMembers(req.user.organizationId);
      const currentMember = members.find((m: any) => m.userId === req.user?.id);
      if (currentMember && !currentMember.canApproveHours) {
        return res.status(403).json({ message: "You do not have permission to approve hours" });
      }
    }

    const previousStatus = activity.verificationStatus || 'pending';
    const updatedActivity = await storage.updateVolunteerActivity(activityId, {
      verificationStatus: 'approved'
    });

    // Write immutable audit log entry
    try {
      const auditEntry: InsertVerificationAuditLog = {
        activityId,
        projectId: activity.projectId || undefined,
        organizationId: req.user?.organizationId || undefined,
        action: 'approved',
        previousStatus,
        newStatus: 'approved',
        performedBy: reviewerId!,
        performedByRole: req.user?.userType || 'organization',
        volunteerId: activity.userId,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || undefined,
        userAgent: req.headers['user-agent'] || undefined,
        geolocation: typeof activity.geolocation === 'string' ? activity.geolocation : undefined,
        evidenceSnapshot: activity.evidenceUrls ? { urls: activity.evidenceUrls } : undefined,
      };
      await (storage as any).createVerificationAuditLog?.(auditEntry);
    } catch (auditErr) {
      console.error("[Audit] Failed to write audit log for activity approval:", auditErr);
      // Don't fail the approval if audit log fails - log and continue
    }

    // **CSR Dashboard KPI Tracking**: Update employee engagement when activity is approved
    // This ensures verified hours flow to CSR corporate dashboards
    // Check BOTH linking methods: volunteerProfile.employerId AND volunteerEmployerLinks table
    if (activity.userId && activity.hours) {
      try {
        const volunteerProfile = await storage.getVolunteerProfileByUserId(activity.userId);
        const user = await storage.getUser(activity.userId);

        // Find all employer IDs linked to this volunteer (both methods)
        const linkedEmployerIds = new Set<number>();

        // Method 1: Direct link via volunteerProfile.employerId
        if (volunteerProfile?.employerId) {
          const employerIdNum = typeof volunteerProfile.employerId === 'string'
            ? parseInt(volunteerProfile.employerId)
            : volunteerProfile.employerId;
          if (!isNaN(employerIdNum)) {
            linkedEmployerIds.add(employerIdNum);
          }
        }

        // Method 2: Explicit link via volunteerEmployerLinks table
        if (volunteerProfile?.id) {
          const employerLinks = await storage.listVolunteerEmployerLinks?.() || [];
          const volunteerLinks = employerLinks.filter((link: any) =>
            link.volunteerId === volunteerProfile.id &&
            link.verificationStatus !== 'rejected'
          );
          volunteerLinks.forEach((link: any) => {
            if (link.partnerId) {
              // Use Number() to handle string/number type mismatches
              const partnerIdNum = Number(link.partnerId);
              if (!isNaN(partnerIdNum)) {
                linkedEmployerIds.add(partnerIdNum);
              }
            }
          });
        }

        // Update employee engagement for ALL linked employers
        if (linkedEmployerIds.size > 0 && user?.email) {
          const allEngagements = (await storage.listEmployeeEngagement()) || [];

          for (const employerIdNum of Array.from(linkedEmployerIds)) {
            const existing = (Array.isArray(allEngagements) ? allEngagements : []).find((e: any) =>
              e?.partnerId === employerIdNum &&
              e?.employeeEmail === user.email
            );

            if (existing) {
              // Increment hours for verified activity
              await storage.updateEmployeeEngagement(existing.id, {
                hoursVolunteered: (existing.hoursVolunteered || 0) + activity.hours,
                projectId: activity.projectId
              });
            } else {
              // Create new employee engagement record
              await storage.createEmployeeEngagement({
                partnerId: employerIdNum,
                employeeEmail: user.email,
                employeeName: volunteerProfile?.volunteerName || user.displayName,
                projectId: activity.projectId,
                hoursVolunteered: activity.hours,
                engagementType: 'vto'
              });
            }

            // **Create Verified Output for CSR Audit Trail**
            await storage.createVerifiedOutput({
              activityId: activityId,
              partnerId: employerIdNum,
              projectId: activity.projectId || 0,
              outputType: 'hours',
              outputValue: activity.hours,
              verificationStatus: 'verified',
              verifiedBy: reviewerId || null,
              verifiedAt: new Date(),
              auditTrail: {
                action: 'hours_approved',
                description: `Volunteer hours approved: ${activity.hours}h by ${user.displayName || user.email}`,
                timestamp: new Date().toISOString(),
                reviewerId: reviewerId
              }
            });

            // **SDG-Specific Hours Tracking**: Update CSR challenge progress
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
              }
            }

            console.log(`[CSR] Updated employee engagement for ${user.email} at employer ${employerIdNum} with ${activity.hours}h verified hours`);
          }
        }

        // **Update Volunteer Profile Metrics**: Track total verified hours on volunteer's profile
        if (volunteerProfile?.id) {
          // Note: If you want to track total hours on volunteer profile, add a totalVerifiedHours field
          // For now, we ensure the leaderboard stats are updated via the existing activity records
          console.log(`[Volunteer] Activity ${activityId} approved for volunteer profile ${volunteerProfile.id}`);
        }
      } catch (csrErr) {
        console.error("Error updating CSR employee engagement:", csrErr);
        // Non-critical, don't fail the approval
      }
    }

    // Send email notification to volunteer (non-blocking)
    sendActivityApprovalNotification(activityId, 'approved', reviewerId).catch(err => {
      console.error("Failed to send approval notification:", err);
    });

    // Check and award badges after activity approval (non-blocking)
    if (activity.userId) {
      checkAndAwardBadges(activity.userId).catch(err => {
        console.error("Failed to check badges:", err);
      });
    }

    // Persist KPIs (fire-and-forget)
    if (activity.userId) {
      const project = activity.projectId ? await storage.getProject(activity.projectId) : null;
      persistKPIsForActivity(activity.userId, project?.organizationId).catch(err =>
        console.error("[KPI] Error persisting KPIs after activity approval:", err)
      );
    }

    broadcastUpdate("activity_approved", updatedActivity);
    res.json(updatedActivity);
  } catch (err) {
    console.error("Error approving activity:", err);
    res.status(500).json({ message: "Failed to approve activity" });
  }
});

/**
 * POST /volunteer-activities/:id/reject - Reject a volunteer activity (hours)
 */
activitiesRouter.post("/volunteer-activities/:id/reject", authMiddleware, async (req: Request, res: Response) => {
  try {
    const activityId = parseInt(req.params.id);

    // Security: Require organization user type
    if (req.user?.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization users can reject activities" });
    }

    const activity = await storage.getVolunteerActivity(activityId);
    if (!activity) {
      return res.status(404).json({ message: "Volunteer activity not found" });
    }

    // Security: Validate activity belongs to user's organization
    if (activity.projectId) {
      const project = await storage.getProject(activity.projectId);
      if (project && project.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Cannot reject activities for other organizations" });
      }
    }

    // Security: Check canApproveHours permission (same permission for approve/reject)
    if (req.user.organizationId) {
      const members = await storage.listOrganizationMembers(req.user.organizationId);
      const currentMember = members.find((m: any) => m.userId === req.user?.id);
      if (currentMember && !currentMember.canApproveHours) {
        return res.status(403).json({ message: "You do not have permission to reject hours" });
      }
    }

    const previousStatus = activity.verificationStatus || 'pending';
    const updatedActivity = await storage.updateVolunteerActivity(activityId, {
      verificationStatus: 'rejected'
    });

    // Write immutable audit log entry
    try {
      const auditEntry: InsertVerificationAuditLog = {
        activityId,
        projectId: activity.projectId || undefined,
        organizationId: req.user?.organizationId || undefined,
        action: 'rejected',
        previousStatus,
        newStatus: 'rejected',
        performedBy: req.user!.id,
        performedByRole: req.user?.userType || 'organization',
        volunteerId: activity.userId,
        reason: req.body.reason || undefined,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || undefined,
        userAgent: req.headers['user-agent'] || undefined,
      };
      await (storage as any).createVerificationAuditLog?.(auditEntry);
    } catch (auditErr) {
      console.error("[Audit] Failed to write audit log for activity rejection:", auditErr);
    }

    // Send email notification to volunteer (non-blocking)
    sendActivityApprovalNotification(activityId, 'rejected', req.user?.id).catch(err => {
      console.error("Failed to send rejection notification:", err);
    });

    // Persist KPIs (fire-and-forget)
    if (activity?.userId) {
      const project = activity.projectId ? await storage.getProject(activity.projectId) : null;
      persistKPIsForActivity(activity.userId, project?.organizationId).catch(err =>
        console.error("[KPI] Error persisting KPIs after activity rejection:", err)
      );
    }

    broadcastUpdate("activity_rejected", updatedActivity);
    res.json(updatedActivity);
  } catch (err) {
    console.error("Error rejecting activity:", err);
    res.status(500).json({ message: "Failed to reject activity" });
  }
});

/**
 * POST /project-impacts/:id/approve - Approve a project impact (AIU/KPI)
 * Also updates CSR verified outputs and employee impact data when applicable
 */
activitiesRouter.post("/project-impacts/:id/approve", authMiddleware, async (req: Request, res: Response) => {
  try {
    const impactId = parseInt(req.params.id);
    const reviewerId = req.user?.id;

    // Security: Require organization user type
    if (req.user?.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization users can approve impacts" });
    }

    const impact = await storage.getProjectImpact(impactId);
    if (!impact) {
      return res.status(404).json({ message: "Project impact not found" });
    }

    // Security: Validate impact belongs to user's organization
    if (impact.projectId) {
      const project = await storage.getProject(impact.projectId);
      if (project && project.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Cannot approve impacts for other organizations" });
      }
    }

    // Security: Check canApproveHours permission (same permission for impacts)
    if (req.user.organizationId) {
      const members = await storage.listOrganizationMembers(req.user.organizationId);
      const currentMember = members.find((m: any) => m.userId === req.user?.id);
      if (currentMember && !currentMember.canApproveHours) {
        return res.status(403).json({ message: "You do not have permission to approve impacts" });
      }
    }

    const updatedImpact = await storage.updateProjectImpact(impactId, {
      verificationStatus: 'approved'
    });

    // Recalculate AIU when impact is approved
    if (updatedImpact?.projectId) {
      try {
        await updateAiuKpiFromImpacts(updatedImpact.projectId);
      } catch (aiuErr) {
        console.error("Error updating AIU settings:", aiuErr);
      }
    }

    // **CSR Dashboard Integration**: Create verified output record for approved impacts
    // This ensures impact data flows to CSR dashboards for reporting
    // Check BOTH linking methods: volunteerProfile.employerId AND volunteerEmployerLinks table
    if (impact.userId && impact.projectId && impact.value) {
      try {
        const volunteerProfile = await storage.getVolunteerProfileByUserId(impact.userId);

        // Find all employer IDs linked to this volunteer (both methods)
        const linkedEmployerIds = new Set<number>();

        // Method 1: Direct link via volunteerProfile.employerId
        if (volunteerProfile?.employerId) {
          const employerIdNum = typeof volunteerProfile.employerId === 'string'
            ? parseInt(volunteerProfile.employerId)
            : volunteerProfile.employerId;
          if (!isNaN(employerIdNum)) {
            linkedEmployerIds.add(employerIdNum);
          }
        }

        // Method 2: Explicit link via volunteerEmployerLinks table
        if (volunteerProfile?.id) {
          const employerLinks = await storage.listVolunteerEmployerLinks?.() || [];
          const volunteerLinks = employerLinks.filter((link: any) =>
            link.volunteerId === volunteerProfile.id &&
            link.verificationStatus !== 'rejected'
          );
          volunteerLinks.forEach((link: any) => {
            if (link.partnerId) {
              // Use Number() to handle string/number type mismatches
              const partnerIdNum = Number(link.partnerId);
              if (!isNaN(partnerIdNum)) {
                linkedEmployerIds.add(partnerIdNum);
              }
            }
          });
        }

        // Create verified output records for ALL linked employers
        for (const employerIdNum of Array.from(linkedEmployerIds)) {
          await storage.createVerifiedOutput({
            activityId: null, // This is an impact, not an activity
            partnerId: employerIdNum,
            projectId: impact.projectId,
            outputType: 'outcomes_achieved',
            outputValue: impact.value,
            verificationStatus: 'verified',
            verifiedBy: reviewerId || null,
            verifiedAt: new Date(),
            auditTrail: {
              action: 'impact_approved',
              description: `Impact approved: ${impact.value} units`,
              timestamp: new Date().toISOString(),
              reviewerId: reviewerId
            }
          });

          console.log(`[CSR] Created verified output for impact ${impactId} from volunteer ${impact.userId} at employer ${employerIdNum}`);
        }
      } catch (csrErr) {
        console.error("Error creating CSR verified output:", csrErr);
        // Non-critical, don't fail the approval
      }
    }

    // Mark related pending_approval notifications as read
    storage.markNotificationsReadByEntity("project_impact", impactId).catch(err => {
      console.error("Failed to mark notifications as read:", err);
    });

    // Send email notification to volunteer (non-blocking)
    sendImpactApprovalNotification(impactId, 'approved', reviewerId).catch(err => {
      console.error("Failed to send impact approval notification:", err);
    });

    // Check and award badges after impact approval (non-blocking)
    if (impact.userId) {
      checkAndAwardBadges(impact.userId).catch(err => {
        console.error("Failed to check badges:", err);
      });
    }

    // Persist KPIs (fire-and-forget)
    if (impact.userId) {
      const project = impact.projectId ? await storage.getProject(impact.projectId) : null;
      persistKPIsForActivity(impact.userId, project?.organizationId).catch(err =>
        console.error("[KPI] Error persisting KPIs after impact approval:", err)
      );
    }

    broadcastUpdate("impact_approved", updatedImpact);
    res.json(updatedImpact);
  } catch (err) {
    console.error("Error approving impact:", err);
    res.status(500).json({ message: "Failed to approve impact" });
  }
});

/**
 * POST /project-impacts/:id/reject - Reject a project impact (AIU/KPI)
 */
activitiesRouter.post("/project-impacts/:id/reject", authMiddleware, async (req: Request, res: Response) => {
  try {
    const impactId = parseInt(req.params.id);

    // Security: Require organization user type
    if (req.user?.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization users can reject impacts" });
    }

    const impact = await storage.getProjectImpact(impactId);
    if (!impact) {
      return res.status(404).json({ message: "Project impact not found" });
    }

    // Security: Validate impact belongs to user's organization
    if (impact.projectId) {
      const project = await storage.getProject(impact.projectId);
      if (project && project.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Cannot reject impacts for other organizations" });
      }
    }

    // Security: Check canApproveHours permission (same permission for impacts)
    if (req.user.organizationId) {
      const members = await storage.listOrganizationMembers(req.user.organizationId);
      const currentMember = members.find((m: any) => m.userId === req.user?.id);
      if (currentMember && !currentMember.canApproveHours) {
        return res.status(403).json({ message: "You do not have permission to reject impacts" });
      }
    }

    const updatedImpact = await storage.updateProjectImpact(impactId, {
      verificationStatus: 'rejected'
    });

    // Recalculate AIU when impact is rejected
    if (updatedImpact?.projectId) {
      try {
        await updateAiuKpiFromImpacts(updatedImpact.projectId);
      } catch (aiuErr) {
        console.error("Error updating AIU settings:", aiuErr);
      }
    }

    // Mark related pending_approval notifications as read
    storage.markNotificationsReadByEntity("project_impact", impactId).catch(err => {
      console.error("Failed to mark notifications as read:", err);
    });

    // Send email notification to volunteer (non-blocking)
    sendImpactApprovalNotification(impactId, 'rejected', req.user?.id).catch(err => {
      console.error("Failed to send impact rejection notification:", err);
    });

    // Persist KPIs (fire-and-forget)
    if (impact?.userId) {
      const impactProject = impact.projectId ? await storage.getProject(impact.projectId) : null;
      persistKPIsForActivity(impact.userId, impactProject?.organizationId).catch(err =>
        console.error("[KPI] Error persisting KPIs after impact rejection:", err)
      );
    }

    broadcastUpdate("impact_rejected", updatedImpact);
    res.json(updatedImpact);
  } catch (err) {
    console.error("Error rejecting impact:", err);
    res.status(500).json({ message: "Failed to reject impact" });
  }
});
