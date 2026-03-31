import { Router, type Request, type Response } from "express";
import { storage, DuplicateAssignmentError } from "../storage";
import { insertProjectAssignmentSchema } from "@shared/schema";
import { handleValidationError, getAuthenticatedUser } from "./utils";
import { authMiddleware } from "../middleware/auth";
import { notifyNewAssignment } from "../notification-service";

export const projectAssignmentsRouter = Router();

// SECURITY: Require authentication for all project assignment routes
projectAssignmentsRouter.use(authMiddleware);

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/project-assignments - List all project assignments
// Supports filtering by projectId or volunteerId
projectAssignmentsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { projectId, volunteerId } = req.query;

    let assignments;
    if (projectId) {
      if (projectId === 'undefined' || projectId === 'null') {
        return res.status(400).json({ message: "Project ID must be a valid number" });
      }
      const projId = parseInt(projectId as string);
      if (isNaN(projId)) {
        return res.status(400).json({ message: "Project ID must be a valid number" });
      }
      assignments = await storage.listProjectAssignmentsByProject(projId);
    } else if (volunteerId) {
      if (volunteerId === 'undefined' || volunteerId === 'null') {
        return res.status(400).json({ message: "Volunteer ID must be a valid number" });
      }
      const volId = parseInt(volunteerId as string);
      if (isNaN(volId)) {
        return res.status(400).json({ message: "Volunteer ID must be a valid number" });
      }
      assignments = await storage.listProjectAssignmentsByVolunteer(volId);
    } else {
      assignments = await storage.listProjectAssignments();
    }

    // Batch-fetch all projects and organizations to avoid N+1 queries
    const projectIds = Array.from(new Set(assignments.map((a: any) => a.projectId).filter(Boolean)));
    const projects = projectIds.length > 0 ? await storage.getProjectsByIds(projectIds) : [];
    const projectMap = new Map(projects.map((p: any) => [p.id, p]));

    const orgIds = Array.from(new Set(projects.map((p: any) => p.organizationId).filter(Boolean)));
    const orgs = orgIds.length > 0 ? await storage.getOrganizationsByIds(orgIds) : [];
    const orgMap = new Map(orgs.map((o: any) => [o.id, o]));

    const enrichedAssignments = assignments.map((assignment: any) => {
      const project = projectMap.get(assignment.projectId) ?? null;
      const organization = project?.organizationId ? orgMap.get(project.organizationId) ?? null : null;
      return { ...assignment, project, organization };
    });

    res.json(enrichedAssignments);
  } catch (err) {
    console.error("Error fetching project assignments:", err);
    res.status(500).json({ message: "Failed to fetch project assignments" });
  }
});

// GET /api/project-assignments/details - Get enriched assignment details
// Returns assignments with team members, activities, and full project info
projectAssignmentsRouter.get("/details", async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    let volunteerId = req.query.volunteerId as string;

    // If volunteerId not provided, use the authenticated user's ID
    if (!volunteerId || volunteerId === 'undefined' || volunteerId === 'null') {
      volunteerId = authUser.id.toString();
    }

    const volId = parseInt(volunteerId);

    if (isNaN(volId)) {
      return res.status(400).json({ message: "volunteerId must be a valid number" });
    }

    const assignments = await storage.listProjectAssignmentsByVolunteer(volId);

    // Batch-fetch all projects and organizations up front to avoid N+1 queries
    const detailProjectIds = Array.from(new Set(assignments.map((a: any) => a.projectId).filter(Boolean)));
    const detailProjects = detailProjectIds.length > 0 ? await storage.getProjectsByIds(detailProjectIds) : [];
    const detailProjectMap = new Map(detailProjects.map((p: any) => [p.id, p]));

    const detailOrgIds = Array.from(new Set(detailProjects.map((p: any) => p.organizationId).filter(Boolean)));
    const detailOrgs = detailOrgIds.length > 0 ? await storage.getOrganizationsByIds(detailOrgIds) : [];
    const detailOrgMap = new Map(detailOrgs.map((o: any) => [o.id, o]));

    // Fetch all assignments for these projects in two queries (one per project batch is unavoidable
    // here since listProjectAssignmentsByProject doesn't support multi-id yet — we cap at 5 per project)
    const volunteerActivities = await storage.listVolunteerActivitiesByUser(volId);

    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment: any) => {
        try {
          const project = detailProjectMap.get(assignment.projectId) ?? null;
          const organization = project?.organizationId ? detailOrgMap.get(project.organizationId) ?? null : null;
          const hoursCommitted = assignment.hoursCommitted || project?.ongoingHoursPerWeek || 0;

          // Get team members — batch their user lookups
          const allAssignments = await storage.listProjectAssignmentsByProject(assignment.projectId);
          const teamAssignments = allAssignments
            .filter((a: any) => a.volunteerId !== volId && a.status === 'active')
            .slice(0, 5);
          const teamMemberIds = teamAssignments.map((a: any) => a.volunteerId).filter(Boolean);
          const teamUsers = teamMemberIds.length > 0 ? await storage.getUsersByIds(teamMemberIds) : [];
          const teamUserMap = new Map(teamUsers.map((u: any) => [u.id, u]));
          const teamMembers = teamAssignments.map((a: any) => {
            const user = teamUserMap.get(a.volunteerId);
            return user ? { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, role: a.role } : null;
          }).filter(Boolean);

          const activities = volunteerActivities
            .filter((activity: any) => activity.projectId === assignment.projectId)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

          return {
            ...assignment,
            hoursCommitted,
            project: project ? { id: project.id, name: project.name, description: project.description } : null,
            organization: organization ? { id: organization.id, name: organization.name } : null,
            teamMembers,
            activities
          };
        } catch (error) {
          console.error(`Error enriching assignment ${assignment.id}:`, error);
          return { ...assignment, hoursCommitted: assignment.hoursCommitted || 0, teamMembers: [], activities: [] };
        }
      })
    );

    res.json(enrichedAssignments);
  } catch (err) {
    console.error("Error fetching enriched assignments:", err);
    res.status(500).json({ message: "Failed to fetch enriched assignments" });
  }
});

// GET /api/project-assignments/:id - Get assignment by ID
projectAssignmentsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ message: "Assignment ID is required and must be a valid number" });
    }

    const assignmentId = parseInt(id);

    if (isNaN(assignmentId)) {
      return res.status(400).json({ message: "Assignment ID must be a valid number" });
    }

    const assignment = await storage.getProjectAssignment(assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: "Project assignment not found" });
    }

    res.json(assignment);
  } catch (err) {
    console.error("Error fetching project assignment:", err);
    res.status(500).json({ message: "Failed to fetch project assignment" });
  }
});

// POST /api/project-assignments - Create new assignment
projectAssignmentsRouter.post("/", async (req: Request, res: Response) => {
  try {
    // Validate request payload with schema
    const assignmentData = insertProjectAssignmentSchema.parse(req.body);
    const newAssignment = await storage.createProjectAssignment(assignmentData);

    const project = await storage.getProject(assignmentData.projectId);
    if (project && project.organizationId) {
      await notifyNewAssignment(
        assignmentData.volunteerId,
        assignmentData.projectId,
        project.organizationId
      );
    }

    broadcastUpdate("project_assignment_created", newAssignment);
    res.status(201).json(newAssignment);
  } catch (err) {
    // Handle duplicate assignment error
    if (err instanceof DuplicateAssignmentError) {
      return res.status(409).json({ message: err.message });
    }

    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// POST /api/project-assignments/invite - Organization invite volunteers
// Creates a pending assignment (invitation) for volunteer
projectAssignmentsRouter.post("/invite", async (req: Request, res: Response) => {
  try {
    const { volunteerId, projectId, hoursCommitted, role } = req.body;

    if (!volunteerId || !projectId) {
      return res.status(400).json({ message: "volunteerId and projectId are required" });
    }

    // Create pending assignment (status="pending" is default)
    const assignmentData = {
      volunteerId: parseInt(volunteerId),
      projectId: parseInt(projectId),
      hoursCommitted: hoursCommitted || 10,
      status: "pending", // Pending invitation
      role: role || "Volunteer", // Default role is Volunteer
    };

    const newAssignment = await storage.createProjectAssignment(assignmentData);

    const project = await storage.getProject(projectId);
    if (project && project.organizationId) {
      await notifyNewAssignment(
        volunteerId,
        projectId,
        project.organizationId
      );
    }

    broadcastUpdate("project_assignment_created", newAssignment);
    res.status(201).json({
      ...newAssignment,
      message: "Invitation sent to volunteer"
    });
  } catch (err) {
    if (err instanceof DuplicateAssignmentError) {
      return res.status(409).json({ message: err.message });
    }
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// PATCH /api/project-assignments/:id - Update assignment
projectAssignmentsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.id);
    const updateData = { ...req.body };

    // If status is being changed to active or declined, set respondedAt
    if ((updateData.status === "active" || updateData.status === "declined") && !updateData.respondedAt) {
      updateData.respondedAt = new Date();
    }

    const updatedAssignment = await storage.updateProjectAssignment(assignmentId, updateData);

    if (!updatedAssignment) {
      return res.status(404).json({ message: "Project assignment not found" });
    }

    broadcastUpdate("project_assignment_updated", updatedAssignment);
    res.json(updatedAssignment);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// DELETE /api/project-assignments/:id - Delete assignment
projectAssignmentsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.id);
    const deleted = await storage.deleteProjectAssignment(assignmentId);

    if (!deleted) {
      return res.status(404).json({ message: "Project assignment not found" });
    }

    broadcastUpdate("project_assignment_deleted", { id: assignmentId });
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting project assignment:", err);
    res.status(500).json({ message: "Failed to delete project assignment" });
  }
});
