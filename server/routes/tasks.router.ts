import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { invalidateCache } from "../cache";
import { insertTaskSchema } from "@shared/schema";
import { handleValidationError, requireOrgUser, verifyOwnership } from "./utils";
import { notifyTaskAssigned } from "../notification-service";
import { verifyFirebaseToken } from "../middleware/firebase-auth";

export const tasksRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/tasks - List tasks with authorization
// Protected: Requires authentication
tasksRouter.get("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { projectId, assigneeId } = req.query;
    let tasks: any[] = [];

    if (projectId) {
      // IDOR protection: Verify user has access to this project's tasks
      const project = await storage.getProject(parseInt(projectId as string));
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Organizations can see their projects' tasks, volunteers only if assigned
      if (authenticatedUser.userType === 'organization') {
        if (authenticatedUser.organizationId !== project.organizationId) {
          return res.status(403).json({
            message: "Access denied. This project belongs to a different organization.",
            code: "FORBIDDEN"
          });
        }
      }
      tasks = await storage.listTasksByProject(parseInt(projectId as string));

      // Filter for volunteers - only show tasks they're assigned to
      if (authenticatedUser.userType === 'volunteer') {
        tasks = tasks.filter(t => t.assigneeId === authenticatedUser.id);
      }
    } else if (assigneeId) {
      // IDOR protection: Users can only view their own assigned tasks
      if (authenticatedUser.id !== parseInt(assigneeId as string)) {
        return res.status(403).json({
          message: "Access denied. You can only view your own assigned tasks.",
          code: "FORBIDDEN"
        });
      }
      tasks = await storage.listTasksByAssignee(parseInt(assigneeId as string));
    } else {
      // Default: Return tasks based on user type
      if (authenticatedUser.userType === 'organization' && authenticatedUser.organizationId) {
        const orgProjects = await storage.listProjectsByOrganization(authenticatedUser.organizationId);
        const orgProjectIds = new Set(orgProjects.map(p => p.id));
        const allTasks = await storage.listTasks();
        tasks = allTasks.filter(t => t.projectId && orgProjectIds.has(t.projectId));
      } else if (authenticatedUser.userType === 'volunteer') {
        tasks = await storage.listTasksByAssignee(authenticatedUser.id);
      } else {
        return res.status(400).json({ message: "Invalid user type" });
      }
    }

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// GET /api/tasks/:id - Get task by ID with authorization
// Protected: Requires authentication
tasksRouter.get("/:id", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const authenticatedUser = req.authenticatedUser;

    if (!authenticatedUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const task = await storage.getTask(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // IDOR protection: Verify user has access to this task
    if (authenticatedUser.userType === 'volunteer') {
      if (task.assigneeId !== authenticatedUser.id) {
        return res.status(403).json({
          message: "Access denied. You are not assigned to this task.",
          code: "FORBIDDEN"
        });
      }
    } else if (authenticatedUser.userType === 'organization' && authenticatedUser.organizationId) {
      if (task.projectId) {
        const project = await storage.getProject(task.projectId);
        if (!project || project.organizationId !== authenticatedUser.organizationId) {
          return res.status(403).json({
            message: "Access denied. This task belongs to a different organization.",
            code: "FORBIDDEN"
          });
        }
      }
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch task" });
  }
});

// POST /api/tasks - Create new task
// Protected: Requires authentication and organization ownership
tasksRouter.post("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser || authenticatedUser.userType !== 'organization' || !authenticatedUser.organizationId) {
      return res.status(403).json({
        message: "Organization authorization required",
        code: "ORG_REQUIRED"
      });
    }

    const taskData = insertTaskSchema.parse(req.body);

    if (taskData.projectId) {
      const project = await storage.getProject(taskData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      // IDOR protection: Can only create tasks for own organization's projects
      if (project.organizationId !== authenticatedUser.organizationId) {
        return res.status(403).json({
          message: "Access denied. This project belongs to a different organization.",
          code: "FORBIDDEN"
        });
      }
    }

    const task = await storage.createTask(taskData);

    if (task.assigneeId) {
      await notifyTaskAssigned(
        task.assigneeId,
        task.id,
        task.title,
        task.projectId || undefined
      );
    }

    if (task.projectId) {
      const project = await storage.getProject(task.projectId);
      const projectTasks = await storage.listTasksByProject(task.projectId);
      const completedTasks = projectTasks.filter(t => t.status?.toLowerCase() === "completed").length;
      const completionPercentage = projectTasks.length > 0
        ? Math.round((completedTasks / projectTasks.length) * 100)
        : 0;

      let newStatus = project?.status;
      if (project && ["Planning", "In Progress", "Completed"].includes(project.status)) {
        if (completionPercentage === 0) {
          newStatus = "Planning";
        } else if (completionPercentage === 100) {
          newStatus = "Completed";
        } else {
          newStatus = "In Progress";
        }
      }

      await storage.updateProject(task.projectId, {
        completionPercentage,
        ...(newStatus !== project?.status && { status: newStatus })
      });

      const updatedProject = await storage.getProject(task.projectId);
      if (updatedProject) {
        broadcastUpdate("project_updated", updatedProject);
      }
    }

    // OPTIMIZATION: Invalidate caches when task is created
    if (task.projectId) {
      const project = await storage.getProject(task.projectId);
      if (project?.organizationId) {
        invalidateCache.forOrganization(project.organizationId);
      }
    }
    if (task.assigneeId) {
      invalidateCache.forUser(task.assigneeId);
    }

    broadcastUpdate("task_created", task);
    res.status(201).json(task);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// PATCH /api/tasks/:id - Update task
// Protected: Requires authentication and authorization
tasksRouter.patch("/:id", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const authenticatedUser = req.authenticatedUser;

    if (!authenticatedUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const existingTask = await storage.getTask(taskId);
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // IDOR protection: Check authorization based on user type
    let isAuthorized = false;

    if (authenticatedUser.userType === 'organization' && existingTask.projectId) {
      const project = await storage.getProject(existingTask.projectId);
      if (project && project.organizationId === authenticatedUser.organizationId) {
        isAuthorized = true;
      }
    }

    // Volunteers can update tasks assigned to them
    if (authenticatedUser.userType === 'volunteer' && existingTask.assigneeId === authenticatedUser.id) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        message: "Access denied. You are not authorized to update this task.",
        code: "FORBIDDEN"
      });
    }

    const taskData = insertTaskSchema.partial().parse(req.body);
    const updatedTask = await storage.updateTask(taskId, taskData);

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (taskData.assigneeId && taskData.assigneeId !== existingTask.assigneeId) {
      await notifyTaskAssigned(
        taskData.assigneeId,
        updatedTask.id,
        updatedTask.title,
        updatedTask.projectId || undefined
      );
    }

    if (taskData.status && updatedTask.projectId) {
      const project = await storage.getProject(updatedTask.projectId);
      const projectTasks = await storage.listTasksByProject(updatedTask.projectId);
      const completedTasks = projectTasks.filter(t => t.status?.toLowerCase() === "completed").length;
      const completionPercentage = projectTasks.length > 0
        ? Math.round((completedTasks / projectTasks.length) * 100)
        : 0;

      let newStatus = project?.status;
      if (project && ["Planning", "In Progress", "Completed"].includes(project.status)) {
        if (completionPercentage === 0) {
          newStatus = "Planning";
        } else if (completionPercentage === 100) {
          newStatus = "Completed";
        } else {
          newStatus = "In Progress";
        }
      }

      await storage.updateProject(updatedTask.projectId, {
        completionPercentage,
        ...(newStatus !== project?.status && { status: newStatus })
      });

      const updatedProject = await storage.getProject(updatedTask.projectId);
      if (updatedProject) {
        broadcastUpdate("project_updated", updatedProject);
      }
    }

    // OPTIMIZATION: Invalidate caches when task is updated
    if (updatedTask.projectId) {
      const project = await storage.getProject(updatedTask.projectId);
      if (project?.organizationId) {
        invalidateCache.forOrganization(project.organizationId);
      }
    }
    if (updatedTask.assigneeId) {
      invalidateCache.forUser(updatedTask.assigneeId);
    }

    broadcastUpdate("task_updated", updatedTask);
    res.json(updatedTask);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});
