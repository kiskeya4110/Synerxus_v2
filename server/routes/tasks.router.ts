import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { invalidateCache } from "../cache";
import { insertTaskSchema } from "@shared/schema";
import { handleValidationError, requireOrgUser, verifyOwnership } from "./utils";
import { notifyTaskAssigned } from "../notification-service";

export const tasksRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/tasks - List tasks with authorization
tasksRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { projectId, assigneeId, userId } = req.query;

    let tasks;
    if (projectId) {
      tasks = await storage.listTasksByProject(parseInt(projectId as string));
    } else if (assigneeId) {
      tasks = await storage.listTasksByAssignee(parseInt(assigneeId as string));
    } else if (userId) {
      const userIdNum = parseInt(userId as string);
      const user = await storage.getUser(userIdNum);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.userType === 'organization' && user.organizationId) {
        const orgProjects = await storage.listProjectsByOrganization(user.organizationId);
        const orgProjectIds = new Set(orgProjects.map(p => p.id));
        const allTasks = await storage.listTasks();
        tasks = allTasks.filter(t => t.projectId && orgProjectIds.has(t.projectId));
      } else if (user.userType === 'volunteer') {
        tasks = await storage.listTasksByAssignee(userIdNum);
      } else {
        return res.status(400).json({ message: "Invalid user type" });
      }
    } else {
      tasks = await storage.listTasks();
    }

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// GET /api/tasks/:id - Get task by ID with authorization
tasksRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const { userId } = req.query;

    const task = await storage.getTask(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (userId) {
      const userIdNum = parseInt(userId as string);
      const user = await storage.getUser(userIdNum);

      if (user) {
        if (user.userType === 'volunteer') {
          const isDirectlyAssigned = task.assigneeId === userIdNum;
          if (!isDirectlyAssigned) {
            return res.status(404).json({ message: "Task not found" });
          }
        } else if (user.userType === 'organization' && user.organizationId) {
          if (task.projectId) {
            const project = await storage.getProject(task.projectId);
            if (!project || project.organizationId !== user.organizationId) {
              return res.status(404).json({ message: "Task not found" });
            }
          }
        }
      }
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch task" });
  }
});

// POST /api/tasks - Create new task
tasksRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = await requireOrgUser(req);
    const taskData = insertTaskSchema.parse(req.body);

    if (taskData.projectId) {
      const project = await storage.getProject(taskData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      verifyOwnership(user, project);
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
tasksRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);

    const existingTask = await storage.getTask(taskId);
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    let currentUser;

    try {
      currentUser = await requireOrgUser(req);
    } catch (err) {
      const userIdFromQuery = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userIdFromBody = req.body.userId ? parseInt(req.body.userId) : null;
      const currentUserId = userIdFromQuery || userIdFromBody;

      if (currentUserId && !isNaN(currentUserId)) {
        currentUser = await storage.getUser(currentUserId);
      }
    }

    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized - please log in" });
    }

    let isAuthorized = false;

    if (currentUser.userType === 'organization' && existingTask.projectId) {
      const project = await storage.getProject(existingTask.projectId);
      if (project && project.organizationId === currentUser.organizationId) {
        isAuthorized = true;
      }
    }

    if (currentUser.userType === 'volunteer' && existingTask.assigneeId === currentUser.id) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to update this task" });
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
