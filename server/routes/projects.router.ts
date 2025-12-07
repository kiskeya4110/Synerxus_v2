import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertProjectSchema } from "@shared/schema";
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

    const projectData = insertProjectSchema.partial().parse(req.body);
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
