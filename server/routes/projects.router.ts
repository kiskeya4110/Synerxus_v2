import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertProjectSchema, updateProjectSchema } from "@shared/schema";
import { handleValidationError, requireOrgUser, verifyOwnership } from "./utils";
import { getVisibleProjectIdsForVolunteer } from "../dashboard-service";

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
