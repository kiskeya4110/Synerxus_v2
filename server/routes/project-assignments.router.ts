import { Router, type Request, type Response } from "express";
import { storage, DuplicateAssignmentError } from "../storage";
import { insertProjectAssignmentSchema } from "@shared/schema";
import { handleValidationError } from "./utils";
import { notifyNewAssignment } from "../notification-service";
import { extractUserId } from "../user-validation";

export const projectAssignmentsRouter = Router();

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

    // Enrich assignments with project and organization data
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment: any) => {
        if (!assignment.projectId) {
          return { ...assignment, project: null, organization: null };
        }
        const project = await storage.getProject(assignment.projectId);
        const organization = project?.organizationId ? await storage.getOrganization(project.organizationId) : null;
        return {
          ...assignment,
          project,
          organization
        };
      })
    );

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
    let volunteerId = req.query.volunteerId as string;

    // If volunteerId not provided, try to extract from request
    if (!volunteerId || volunteerId === 'undefined' || volunteerId === 'null') {
      const requestingUserId = extractUserId(req);
      if (requestingUserId) {
        volunteerId = requestingUserId.toString();
      } else {
        return res.status(400).json({ message: "volunteerId is required and must be a valid number" });
      }
    }

    const volId = parseInt(volunteerId);

    if (isNaN(volId)) {
      return res.status(400).json({ message: "volunteerId must be a valid number" });
    }

    const assignments = await storage.listProjectAssignmentsByVolunteer(volId);

    // Enrich each assignment with team members, activities, and project info
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment: any) => {
        try {
          // Fetch project details (for fallback hoursCommitted and organization info)
          const project = await storage.getProject(assignment.projectId);

          // Fetch organization details
          let organization = null;
          if (project?.organizationId) {
            organization = await storage.getOrganization(project.organizationId);
          }

          // Use hoursCommitted from assignment, or fallback to project's ongoingHoursPerWeek
          const hoursCommitted = assignment.hoursCommitted || project?.ongoingHoursPerWeek || 0;

          // Get team members (other volunteers on this project)
          const allAssignments = await storage.listProjectAssignmentsByProject(assignment.projectId);
          const teamMembers = await Promise.all(
            allAssignments
              .filter((a: any) => a.volunteerId !== volId && a.status === 'active')
              .slice(0, 5) // Limit to 5 team members for performance
              .map(async (a: any) => {
                const user = await storage.getUser(a.volunteerId);
                return user ? {
                  id: user.id,
                  username: user.username,
                  displayName: user.displayName,
                  avatar: user.avatar,
                  role: a.role
                } : null;
              })
          );

          // Get recent activities for this volunteer on this project
          const allActivities = await storage.listVolunteerActivities();
          const activities = allActivities
            .filter((activity: any) =>
              activity.projectId === assignment.projectId &&
              activity.userId === volId
            )
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5); // Last 5 activities

          return {
            ...assignment,
            hoursCommitted, // Use fallback value if not set
            project: project ? {
              id: project.id,
              name: project.name,
              description: project.description
            } : null,
            organization: organization ? {
              id: organization.id,
              name: organization.name
            } : null,
            teamMembers: teamMembers.filter((m: any) => m !== null),
            activities
          };
        } catch (error) {
          console.error(`Error enriching assignment ${assignment.id}:`, error);
          return {
            ...assignment,
            hoursCommitted: assignment.hoursCommitted || 0,
            teamMembers: [],
            activities: []
          };
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
