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

/**
 * Verify that the calling user has access to a project assignment.
 * - Volunteers may only access their own assignments.
 * - Organization users may only access assignments for projects owned by their org.
 * Returns the assignment on success, or sends the appropriate error response and returns null.
 */
async function getAssignmentWithAccess(
  assignmentId: number,
  req: Request,
  res: Response
): Promise<any | null> {
  const authUser = getAuthenticatedUser(req, res);
  if (!authUser) return null;

  const assignment = await storage.getProjectAssignment(assignmentId);
  if (!assignment) {
    res.status(404).json({ message: "Project assignment not found" });
    return null;
  }

  if (authUser.userType === "volunteer") {
    if (assignment.volunteerId !== authUser.id) {
      res.status(403).json({ message: "Access denied: you can only access your own assignments" });
      return null;
    }
    return assignment;
  }

  if (authUser.userType === "organization") {
    if (!authUser.organizationId) {
      res.status(403).json({ message: "Access denied: no organization associated with your account" });
      return null;
    }
    const project = await storage.getProject(assignment.projectId);
    if (!project || project.organizationId !== authUser.organizationId) {
      res.status(403).json({ message: "Access denied: this assignment does not belong to your organization" });
      return null;
    }
    return assignment;
  }

  res.status(403).json({ message: "Access denied" });
  return null;
}

// GET /api/project-assignments - List project assignments
// Volunteers see only their own; org users see only their org's project assignments
projectAssignmentsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const { projectId, volunteerId } = req.query;

    let assignments: any[];

    if (authUser.userType === "volunteer") {
      // Volunteers can only see their own assignments
      if (volunteerId && parseInt(volunteerId as string) !== authUser.id) {
        return res.status(403).json({ message: "Access denied: you can only view your own assignments" });
      }
      assignments = await storage.listProjectAssignmentsByVolunteer(authUser.id);

      // If caller also filters by projectId, honour it (still scoped to their own assignments)
      if (projectId) {
        const projId = parseInt(projectId as string);
        if (isNaN(projId)) {
          return res.status(400).json({ message: "Project ID must be a valid number" });
        }
        assignments = assignments.filter((a: any) => a.projectId === projId);
      }
    } else if (authUser.userType === "organization") {
      if (!authUser.organizationId) {
        return res.status(403).json({ message: "Access denied: no organization associated with your account" });
      }

      if (projectId) {
        const projId = parseInt(projectId as string);
        if (isNaN(projId)) {
          return res.status(400).json({ message: "Project ID must be a valid number" });
        }
        // Verify the project belongs to this org
        const project = await storage.getProject(projId);
        if (!project || project.organizationId !== authUser.organizationId) {
          return res.status(403).json({ message: "Access denied: this project does not belong to your organization" });
        }
        assignments = await storage.listProjectAssignmentsByProject(projId);
      } else if (volunteerId) {
        // Org may look up a specific volunteer's assignments, but only for their own projects
        const volId = parseInt(volunteerId as string);
        if (isNaN(volId)) {
          return res.status(400).json({ message: "Volunteer ID must be a valid number" });
        }
        const allVolAssignments = await storage.listProjectAssignmentsByVolunteer(volId);
        // Filter to only assignments whose project belongs to this org
        const orgProjectIds = (await storage.listProjectsByOrganization(authUser.organizationId)).map((p: any) => p.id);
        assignments = allVolAssignments.filter((a: any) => orgProjectIds.includes(a.projectId));
      } else {
        // No filter: return all assignments for this org's projects
        const orgProjects = await storage.listProjectsByOrganization(authUser.organizationId);
        const orgProjectIds = orgProjects.map((p: any) => p.id);
        if (orgProjectIds.length === 0) {
          assignments = [];
        } else {
          const perProject = await Promise.all(
            orgProjectIds.map((pid: number) => storage.listProjectAssignmentsByProject(pid))
          );
          assignments = perProject.flat();
        }
      }
    } else {
      return res.status(403).json({ message: "Access denied" });
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
// Volunteers can only fetch their own details; org users can only fetch details
// for volunteers assigned to their org's projects.
projectAssignmentsRouter.get("/details", async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    let volId: number;

    if (authUser.userType === "volunteer") {
      // Volunteers can only view their own assignment details
      const requestedId = req.query.volunteerId as string | undefined;
      if (requestedId && requestedId !== 'undefined' && requestedId !== 'null') {
        const parsed = parseInt(requestedId);
        if (!isNaN(parsed) && parsed !== authUser.id) {
          return res.status(403).json({ message: "Access denied: you can only view your own assignment details" });
        }
      }
      volId = authUser.id;
    } else if (authUser.userType === "organization") {
      if (!authUser.organizationId) {
        return res.status(403).json({ message: "Access denied: no organization associated with your account" });
      }
      const requestedId = req.query.volunteerId as string | undefined;
      if (!requestedId || requestedId === 'undefined' || requestedId === 'null') {
        return res.status(400).json({ message: "volunteerId is required for organization users" });
      }
      const parsed = parseInt(requestedId);
      if (isNaN(parsed)) {
        return res.status(400).json({ message: "volunteerId must be a valid number" });
      }
      volId = parsed;
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    const assignments = await storage.listProjectAssignmentsByVolunteer(volId);

    // For org users: filter to only assignments in their org's projects
    let filteredAssignments = assignments;
    if (authUser.userType === "organization" && authUser.organizationId) {
      const orgProjects = await storage.listProjectsByOrganization(authUser.organizationId);
      const orgProjectIds = new Set(orgProjects.map((p: any) => p.id));
      filteredAssignments = assignments.filter((a: any) => orgProjectIds.has(a.projectId));
    }

    // Batch-fetch all projects and organizations up front to avoid N+1 queries
    const detailProjectIds = Array.from(new Set(filteredAssignments.map((a: any) => a.projectId).filter(Boolean)));
    const detailProjects = detailProjectIds.length > 0 ? await storage.getProjectsByIds(detailProjectIds) : [];
    const detailProjectMap = new Map(detailProjects.map((p: any) => [p.id, p]));

    const detailOrgIds = Array.from(new Set(detailProjects.map((p: any) => p.organizationId).filter(Boolean)));
    const detailOrgs = detailOrgIds.length > 0 ? await storage.getOrganizationsByIds(detailOrgIds) : [];
    const detailOrgMap = new Map(detailOrgs.map((o: any) => [o.id, o]));

    const volunteerActivities = await storage.listVolunteerActivitiesByUser(volId);

    const enrichedAssignments = await Promise.all(
      filteredAssignments.map(async (assignment: any) => {
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
// Volunteers can only access their own; org users only their org's projects.
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

    const assignment = await getAssignmentWithAccess(assignmentId, req, res);
    if (!assignment) return;

    res.json(assignment);
  } catch (err) {
    console.error("Error fetching project assignment:", err);
    res.status(500).json({ message: "Failed to fetch project assignment" });
  }
});

// POST /api/project-assignments - Create new assignment
// Only organization users may directly assign volunteers; the project must belong to their org.
projectAssignmentsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    if (authUser.userType !== "organization") {
      return res.status(403).json({ message: "Access denied: only organization accounts can create project assignments" });
    }

    if (!authUser.organizationId) {
      return res.status(403).json({ message: "Access denied: no organization associated with your account" });
    }

    // Validate request payload with schema
    const assignmentData = insertProjectAssignmentSchema.parse(req.body);

    // Verify the target project belongs to the calling org
    const project = await storage.getProject(assignmentData.projectId);
    if (!project || project.organizationId !== authUser.organizationId) {
      return res.status(403).json({ message: "Access denied: you can only create assignments for your own organization's projects" });
    }

    const newAssignment = await storage.createProjectAssignment(assignmentData);

    if (project.organizationId) {
      await notifyNewAssignment(
        assignmentData.volunteerId,
        assignmentData.projectId,
        project.organizationId
      );
    }

    broadcastUpdate("project_assignment_created", newAssignment);
    res.status(201).json(newAssignment);
  } catch (err) {
    if (err instanceof DuplicateAssignmentError) {
      return res.status(409).json({ message: (err as DuplicateAssignmentError).message });
    }

    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// POST /api/project-assignments/invite - Organization invites a volunteer
// Only organization users may invite; the project must belong to their org.
projectAssignmentsRouter.post("/invite", async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    if (authUser.userType !== "organization") {
      return res.status(403).json({ message: "Access denied: only organization accounts can invite volunteers" });
    }

    if (!authUser.organizationId) {
      return res.status(403).json({ message: "Access denied: no organization associated with your account" });
    }

    const { volunteerId, projectId, hoursCommitted, role } = req.body;

    if (volunteerId === undefined || volunteerId === null || volunteerId === '' || volunteerId === 'undefined' || volunteerId === 'null') {
      return res.status(400).json({ message: "volunteerId is required" });
    }
    if (projectId === undefined || projectId === null || projectId === '' || projectId === 'undefined' || projectId === 'null') {
      return res.status(400).json({ message: "projectId is required" });
    }

    const volId = parseInt(volunteerId);
    if (isNaN(volId)) {
      return res.status(400).json({ message: "volunteerId must be a valid number" });
    }

    const projId = parseInt(projectId);
    if (isNaN(projId)) {
      return res.status(400).json({ message: "projectId must be a valid number" });
    }

    // Verify the target project belongs to the calling org
    const project = await storage.getProject(projId);
    if (!project || project.organizationId !== authUser.organizationId) {
      return res.status(403).json({ message: "Access denied: you can only invite volunteers to your own organization's projects" });
    }

    const assignmentData = {
      volunteerId: volId,
      projectId: projId,
      hoursCommitted: hoursCommitted || 10,
      status: "pending",
      role: role || "Volunteer",
    };

    const newAssignment = await storage.createProjectAssignment(assignmentData);

    if (project.organizationId) {
      await notifyNewAssignment(
        volunteerId,
        projId,
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
      return res.status(409).json({ message: (err as DuplicateAssignmentError).message });
    }
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// PATCH /api/project-assignments/:id - Update assignment
// Volunteers may only update their own assignments and only a restricted set of fields
// (status, respondedAt). Organization users may only update assignments for their
// org's projects and are restricted from changing tenancy-defining fields
// (projectId, volunteerId) which would allow cross-tenant reassignment.
projectAssignmentsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const assignmentId = parseInt(req.params.id);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ message: "Assignment ID must be a valid number" });
    }

    const assignment = await getAssignmentWithAccess(assignmentId, req, res);
    if (!assignment) return;

    // Reject any attempt to change tenancy-defining fields regardless of user type.
    // Changing projectId or volunteerId after creation could silently move the record
    // across tenant boundaries. Callers must delete and re-create the assignment instead.
    if (req.body.projectId !== undefined || req.body.volunteerId !== undefined) {
      return res.status(400).json({
        message: "projectId and volunteerId cannot be changed after creation. Delete and re-create the assignment instead."
      });
    }

    let updateData: Record<string, any>;

    if (authUser.userType === "volunteer") {
      // Volunteers may only accept or decline an invitation — no other field changes.
      const VOLUNTEER_ALLOWED_FIELDS = new Set(["status", "respondedAt"]);
      const attempted = Object.keys(req.body).filter(k => !VOLUNTEER_ALLOWED_FIELDS.has(k));
      if (attempted.length > 0) {
        return res.status(403).json({
          message: `Access denied: volunteers may only update the following fields: status, respondedAt`
        });
      }
      // Only allow valid volunteer status transitions (accepting/declining an invite)
      if (req.body.status !== undefined && !["active", "declined"].includes(req.body.status)) {
        return res.status(403).json({
          message: "Access denied: volunteers may only set status to 'active' or 'declined'"
        });
      }
      updateData = {};
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.respondedAt !== undefined) updateData.respondedAt = req.body.respondedAt;
    } else if (authUser.userType === "organization") {
      // Organization users may update operational fields but not tenancy-defining ones.
      const ORG_ALLOWED_FIELDS = new Set(["status", "respondedAt", "role", "hoursCommitted", "notes"]);
      const attempted = Object.keys(req.body).filter(k => !ORG_ALLOWED_FIELDS.has(k));
      if (attempted.length > 0) {
        return res.status(400).json({
          message: `Invalid update fields: ${attempted.join(", ")}. Allowed fields: ${Array.from(ORG_ALLOWED_FIELDS).join(", ")}`
        });
      }
      updateData = {};
      for (const field of Array.from(ORG_ALLOWED_FIELDS)) {
        if (req.body[field] !== undefined) updateData[field] = req.body[field];
      }
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    // If status is being changed to active or declined, set respondedAt automatically
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
// Only organization users may delete assignments, and only for their own org's projects.
projectAssignmentsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    if (authUser.userType !== "organization") {
      return res.status(403).json({ message: "Access denied: only organization accounts can delete project assignments" });
    }

    const assignmentId = parseInt(req.params.id);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ message: "Assignment ID must be a valid number" });
    }

    const assignment = await getAssignmentWithAccess(assignmentId, req, res);
    if (!assignment) return;

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
