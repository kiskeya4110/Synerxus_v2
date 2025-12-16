import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertProjectSchema, updateProjectSchema, projectAiuSettings } from "@shared/schema";
import { handleValidationError, requireOrgUser, verifyOwnership } from "./utils";
import { getVisibleProjectIdsForVolunteer } from "../dashboard-service";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { notifyProjectVolunteersAiuVerification } from "../notification-service";
import { calculateProjectAIU } from "../aiu-service";

export const projectsRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/projects - List projects with authorization
projectsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { organizationId, userId } = req.query;

    if (!organizationId && !userId) {
      return res.status(401).json({
        message: "Authentication required: userId must be provided"
      });
    }

    let projects;
    if (organizationId) {
      projects = await storage.listProjectsByOrganization(parseInt(organizationId as string));
    } else if (userId) {
      const userIdNum = parseInt(userId as string);
      const user = await storage.getUser(userIdNum);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.userType === 'organization' && user.organizationId) {
        projects = await storage.listProjectsByOrganization(user.organizationId);
      } else if (user.userType === 'volunteer') {
        const visibleProjectIds = await getVisibleProjectIdsForVolunteer(userIdNum, false);
        const allProjects = await storage.listProjects();
        projects = allProjects.filter(p => visibleProjectIds.has(p.id));
      } else {
        return res.status(400).json({ message: "Invalid user type" });
      }
    } else {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});

// GET /api/projects/:id - Get project by ID with authorization
projectsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const { userId } = req.query;

    const project = await storage.getProject(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (userId) {
      const userIdNum = parseInt(userId as string);
      const user = await storage.getUser(userIdNum);

      if (user) {
        if (user.userType === 'volunteer') {
          const visibleProjectIds = await getVisibleProjectIdsForVolunteer(userIdNum, false);
          if (!visibleProjectIds.has(projectId)) {
            return res.status(404).json({ message: "Project not found" });
          }
        } else if (user.userType === 'organization' && user.organizationId) {
          if (project.organizationId !== user.organizationId) {
            return res.status(404).json({ message: "Project not found" });
          }
        }
      }
    }

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch project" });
  }
});

// POST /api/projects - Create new project
projectsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = await requireOrgUser(req);
    const projectData = insertProjectSchema.parse(req.body);

    if (projectData.organizationId !== user.organizationId) {
      return res.status(403).json({ message: "Resource not owned by your organization" });
    }

    const project = await storage.createProject(projectData);
    broadcastUpdate("project_created", project);
    res.status(201).json(project);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// GET /api/projects/:id/metrics - Get real-time project metrics including engagement
projectsRouter.get("/:id/metrics", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Get all relevant data for this project
    const [tasks, assignments, activities] = await Promise.all([
      storage.listTasksByProject(projectId),
      storage.listProjectAssignmentsByProject(projectId),
      storage.listVolunteerActivitiesByProject(projectId),
    ]);

    // Calculate task metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status?.toLowerCase() === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status?.toLowerCase() === 'in progress').length;
    const pendingTasks = totalTasks - completedTasks - inProgressTasks;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate volunteer metrics
    const activeAssignments = assignments.filter(a =>
      a.status === 'active' || a.status === 'accepted' || a.status === 'completed'
    );
    const uniqueVolunteerIds = new Set([
      ...activeAssignments.map(a => a.volunteerId),
      ...activities.map(a => a.userId)
    ]);
    const volunteerCount = uniqueVolunteerIds.size;

    // Calculate hours metrics
    const totalHoursCommitted = assignments.reduce((sum, a) => sum + (a.hoursCommitted || 0), 0);
    const totalHoursCompleted = assignments.reduce((sum, a) => sum + (a.hoursCompleted || 0), 0);
    const totalHoursLogged = activities.reduce((sum, a) => sum + (a.hours || 0), 0);

    // Calculate engagement score (0-100)
    // Based on: volunteer participation, task completion, hours logged, activity frequency
    const volunteerScore = Math.min((volunteerCount / 10) * 25, 25); // Max 25 points
    const taskScore = taskCompletionRate * 0.30; // Max 30 points (30% of 100)
    const hoursScore = totalHoursCommitted > 0
      ? Math.min((totalHoursCompleted / totalHoursCommitted) * 25, 25)
      : 0; // Max 25 points

    // Activity frequency: recent activities in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentActivities = activities.filter(a => new Date(a.createdAt) >= thirtyDaysAgo);
    const activityScore = Math.min((recentActivities.length / 10) * 20, 20); // Max 20 points

    const engagementScore = Math.round(volunteerScore + taskScore + hoursScore + activityScore);

    // Determine engagement level
    let engagementLevel: string;
    if (engagementScore >= 80) engagementLevel = 'excellent';
    else if (engagementScore >= 60) engagementLevel = 'good';
    else if (engagementScore >= 40) engagementLevel = 'moderate';
    else if (engagementScore >= 20) engagementLevel = 'low';
    else engagementLevel = 'minimal';

    res.json({
      projectId,
      projectName: project.name,
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        pending: pendingTasks,
        completionRate: taskCompletionRate
      },
      volunteers: {
        count: volunteerCount,
        activeAssignments: activeAssignments.length
      },
      hours: {
        committed: totalHoursCommitted,
        completed: totalHoursCompleted,
        logged: totalHoursLogged,
        utilizationRate: totalHoursCommitted > 0
          ? Math.round((totalHoursCompleted / totalHoursCommitted) * 100)
          : 0
      },
      engagement: {
        score: engagementScore,
        level: engagementLevel,
        breakdown: {
          volunteerParticipation: Math.round(volunteerScore),
          taskCompletion: Math.round(taskScore),
          hoursUtilization: Math.round(hoursScore),
          activityFrequency: Math.round(activityScore)
        },
        recentActivityCount: recentActivities.length
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    console.error("Error fetching project metrics:", err);
    res.status(500).json({ message: "Failed to fetch project metrics" });
  }
});

// PATCH /api/projects/:id - Update project
projectsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const user = await requireOrgUser(req);
    const projectId = parseInt(req.params.id);

    const existingProject = await storage.getProject(projectId);
    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    verifyOwnership(user, existingProject);

    const projectData = updateProjectSchema.parse(req.body);
    const updatedProject = await storage.updateProject(projectId, projectData);

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    broadcastUpdate("project_updated", updatedProject);
    res.json(updatedProject);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// GET /api/projects/:id/aiu-settings - Get AIU settings for a project
projectsRouter.get("/:id/aiu-settings", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);

    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Get the most recent AIU settings for this project
    const [settings] = await db
      .select()
      .from(projectAiuSettings)
      .where(eq(projectAiuSettings.projectId, projectId))
      .orderBy(desc(projectAiuSettings.createdAt))
      .limit(1);

    if (!settings) {
      return res.status(404).json({ message: "AIU settings not found for this project" });
    }

    res.json(settings);
  } catch (err) {
    console.error("Error fetching AIU settings:", err);
    res.status(500).json({ message: "Failed to fetch AIU settings" });
  }
});

// POST /api/projects/:id/aiu-settings - Create or update AIU settings for a project
projectsRouter.post("/:id/aiu-settings", async (req: Request, res: Response) => {
  try {
    const user = await requireOrgUser(req);
    const projectId = parseInt(req.params.id);

    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    verifyOwnership(user, project);

    const {
      kpiName,
      kpiUnit,
      kpiBefore,
      kpiAfter,
      attributionFactor, // Comes as 0-100 percentage from frontend
      attributionMethodology,
    } = req.body;

    // Validate required fields
    if (!kpiName || !kpiUnit || kpiBefore === undefined) {
      return res.status(400).json({
        message: "Missing required fields: kpiName, kpiUnit, kpiBefore"
      });
    }

    // Build SDG indicator from project's primary SDG
    const primarySdg = project.primarySdg || (project.sdgGoals && project.sdgGoals[0]) || 1;
    const sdgIndicator = `SDG ${primarySdg}.1.1`;

    // Convert attribution factor from percentage (0-100) to decimal (0-1)
    const attributionFactorDecimal = typeof attributionFactor === 'number'
      ? attributionFactor / 100
      : 0.2;

    // Check if settings already exist
    const [existingSettings] = await db
      .select()
      .from(projectAiuSettings)
      .where(eq(projectAiuSettings.projectId, projectId))
      .orderBy(desc(projectAiuSettings.createdAt))
      .limit(1);

    let result;
    if (existingSettings) {
      // Update existing settings
      [result] = await db
        .update(projectAiuSettings)
        .set({
          sdgIndicator,
          kpiName,
          kpiUnit,
          kpiBefore: parseFloat(kpiBefore),
          kpiAfter: kpiAfter !== undefined ? parseFloat(kpiAfter) : null,
          attributionFactor: attributionFactorDecimal,
          attributionMethodology: attributionMethodology || null,
          updatedAt: new Date(),
        })
        .where(eq(projectAiuSettings.id, existingSettings.id))
        .returning();
    } else {
      // Create new settings
      [result] = await db
        .insert(projectAiuSettings)
        .values({
          projectId,
          sdgIndicator,
          kpiName,
          kpiUnit,
          kpiBefore: parseFloat(kpiBefore),
          kpiAfter: kpiAfter !== undefined ? parseFloat(kpiAfter) : null,
          attributionFactor: attributionFactorDecimal,
          attributionMethodology: attributionMethodology || null,
          verificationStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    }

    res.json(result);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// POST /api/projects/:id/verify-aiu - Verify, reject, or adjust AIU for a project
projectsRouter.post("/:id/verify-aiu", async (req: Request, res: Response) => {
  try {
    const user = await requireOrgUser(req);
    const projectId = parseInt(req.params.id);

    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    verifyOwnership(user, project);

    const { status, adjustedLivesImpacted, notes } = req.body;

    if (!status || !['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'verified' or 'rejected'" });
    }

    // Get AIU settings if they exist
    const [aiuSettings] = await db
      .select()
      .from(projectAiuSettings)
      .where(eq(projectAiuSettings.projectId, projectId))
      .orderBy(desc(projectAiuSettings.createdAt))
      .limit(1);

    // Update AIU settings verification status if they exist
    if (aiuSettings) {
      await db
        .update(projectAiuSettings)
        .set({
          verificationStatus: status,
          updatedAt: new Date(),
        })
        .where(eq(projectAiuSettings.id, aiuSettings.id));
    }

    // If lives touched was adjusted, update the project
    if (adjustedLivesImpacted !== undefined && adjustedLivesImpacted !== project.livesTouched) {
      await storage.updateProject(projectId, {
        livesTouched: adjustedLivesImpacted,
      });
    }

    // Get the calculated AIU data to include in notifications
    const projectAIU = await calculateProjectAIU(projectId);

    // Prepare volunteer AIU data for notifications
    const volunteerAius = projectAIU?.volunteers?.map(v => ({
      volunteerId: v.volunteerId,
      aiu: v.aiu
    })) || [];

    // Determine notification status
    const notificationStatus = adjustedLivesImpacted !== undefined && adjustedLivesImpacted !== project.livesTouched
      ? 'adjusted'
      : status as 'verified' | 'rejected';

    // Notify all volunteers on this project
    await notifyProjectVolunteersAiuVerification(
      projectId,
      notificationStatus,
      project.name,
      volunteerAius,
      notes
    );

    // Broadcast update
    broadcastUpdate("aiu_verification", {
      projectId,
      status: notificationStatus,
      projectName: project.name,
      totalAiu: projectAIU?.totalAiu || 0,
    });

    res.json({
      success: true,
      message: `AIU ${notificationStatus === 'adjusted' ? 'adjusted and verified' : notificationStatus}`,
      projectId,
      status: notificationStatus,
      totalAiu: projectAIU?.totalAiu || 0,
      livesTouched: adjustedLivesImpacted ?? project.livesTouched,
    });
  } catch (err) {
    console.error("Error verifying AIU:", err);
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});
