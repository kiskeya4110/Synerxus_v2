import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertApplicationSchema } from "@shared/schema";
import { handleValidationError } from "./utils";
import { calculateMatchScore } from "../matching-algorithm";
import { notifyApplicationStatusChange, notifyNewAssignment } from "../notification-service";
import { verifyFirebaseToken } from "../middleware/firebase-auth";

export const applicationsRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/applications - List applications
// Protected: Requires authentication and ownership/organization verification
applicationsRouter.get("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { opportunityId, volunteerId, organizationId } = req.query;
    const authenticatedUser = req.authenticatedUser;

    if (!authenticatedUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    let applications: any[] = [];

    // IDOR protection: Users can only see their own applications or their organization's applications
    if (volunteerId) {
      // Volunteers can only see their own applications
      if (authenticatedUser.id !== parseInt(volunteerId as string)) {
        return res.status(403).json({
          message: "Access denied. You can only view your own applications.",
          code: "FORBIDDEN"
        });
      }
      applications = await storage.listApplicationsByVolunteer(parseInt(volunteerId as string));
    } else if (organizationId) {
      // Organization members can only see their organization's applications
      if (authenticatedUser.organizationId !== parseInt(organizationId as string)) {
        return res.status(403).json({
          message: "Access denied. You can only view your organization's applications.",
          code: "FORBIDDEN"
        });
      }
      applications = await storage.listApplicationsByOrganization(parseInt(organizationId as string));
    } else if (opportunityId) {
      // Check if user has permission to view applications for this opportunity
      const opportunity = await storage.getOpportunity(parseInt(opportunityId as string));
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      if (authenticatedUser.organizationId !== opportunity.organizationId) {
        return res.status(403).json({
          message: "Access denied. You can only view applications for your organization's opportunities.",
          code: "FORBIDDEN"
        });
      }
      applications = await storage.listApplicationsByOpportunity(parseInt(opportunityId as string));
    } else {
      // Default: Return user's own applications or their organization's applications
      if (authenticatedUser.userType === 'volunteer') {
        applications = await storage.listApplicationsByVolunteer(authenticatedUser.id);
      } else if (authenticatedUser.organizationId) {
        applications = await storage.listApplicationsByOrganization(authenticatedUser.organizationId);
      } else {
        applications = [];
      }
    }

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch applications" });
  }
});

// GET /api/applications/:id - Get application by ID
// Protected: Requires authentication and ownership/organization verification
applicationsRouter.get("/:id", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.id);
    const application = await storage.getApplication(applicationId);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // IDOR protection: Only the applicant or the opportunity's organization can view
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const isApplicant = authenticatedUser.id === application.volunteerId;

    // Check if user belongs to the organization that owns the opportunity
    const opportunity = await storage.getOpportunity(application.opportunityId);
    const isOrganizationMember = opportunity && authenticatedUser.organizationId === opportunity.organizationId;

    if (!isApplicant && !isOrganizationMember) {
      return res.status(403).json({
        message: "Access denied. You can only view your own applications or applications to your organization.",
        code: "FORBIDDEN"
      });
    }

    res.json(application);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch application" });
  }
});

// POST /api/applications - Create new application
// Protected: Requires authentication and applicant verification
applicationsRouter.post("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const validatedData = insertApplicationSchema.parse(req.body);
    const { opportunityId, volunteerId } = validatedData;

    // IDOR protection: Users can only apply as themselves
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser || authenticatedUser.id !== volunteerId) {
      return res.status(403).json({
        message: "Access denied. You can only create applications for yourself.",
        code: "FORBIDDEN"
      });
    }

    const existingApplication = await storage.findApplicationByVolunteerAndOpportunity(
      volunteerId,
      opportunityId
    );

    if (existingApplication) {
      return res.status(409).json({
        message: "You have already applied to this opportunity",
        existingStatus: existingApplication.status
      });
    }

    let matchScore = null;
    try {
      const volunteer = await storage.getUser(volunteerId);
      const opportunity = await storage.getOpportunity(opportunityId);

      if (volunteer && opportunity) {
        let volunteerProfile = null;
        if (volunteer.email) {
          volunteerProfile = await storage.getVolunteerProfileByUserId(volunteerId);
        }

        const volunteerWithProfile = {
          ...volunteer,
          profile: volunteerProfile || undefined
        } as any;

        const matchResult = calculateMatchScore(volunteerWithProfile, opportunity);
        matchScore = Math.round(matchResult.score || 0);
      }
    } catch (err) {
      // Continue with application creation even if match score calculation fails
    }

    const application = await storage.createApplication({
      ...validatedData,
      matchScore
    });

    broadcastUpdate("application_created", application);
    res.status(201).json(application);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// PATCH /api/applications/:id - Update application
// Protected: Requires authentication and ownership verification
applicationsRouter.patch("/:id", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.id);
    const applicationData = req.body;

    const application = await storage.getApplication(applicationId);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // IDOR protection: Only the applicant can update their application
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser || authenticatedUser.id !== application.volunteerId) {
      return res.status(403).json({
        message: "Access denied. You can only update your own applications.",
        code: "FORBIDDEN"
      });
    }

    const updatedApplication = await storage.updateApplication(applicationId, applicationData);
    if (!updatedApplication) {
      return res.status(404).json({ message: "Application not found" });
    }

    broadcastUpdate("application_updated", updatedApplication);
    res.json(updatedApplication);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// POST /api/applications/:id/review - Accept/Reject application
// Protected: Requires authentication and organization ownership verification
applicationsRouter.post("/:id/review", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { status, notes } = req.body;

    if (!status || !["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'accepted' or 'rejected'" });
    }

    const application = await storage.getApplication(applicationId);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const opportunity = await storage.getOpportunity(application.opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    // IDOR protection: Only the organization that owns the opportunity can review
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser || authenticatedUser.organizationId !== opportunity.organizationId) {
      return res.status(403).json({
        message: "Access denied. Only the organization can review applications.",
        code: "FORBIDDEN"
      });
    }

    const updatedApplication = await storage.updateApplication(applicationId, {
      status,
      reviewedAt: new Date(),
      reviewedBy: authenticatedUser.id, // Use authenticated user's ID
      notes: notes || null
    });

    if (!updatedApplication) {
      return res.status(500).json({ message: "Failed to update application" });
    }

    if (status === "accepted" && opportunity.projectId) {
      const existingAssignments = await storage.listProjectAssignmentsByProject(opportunity.projectId);
      const alreadyAssigned = existingAssignments.some(
        (assignment: any) => assignment.volunteerId === application.volunteerId
      );

      if (!alreadyAssigned) {
        await storage.createProjectAssignment({
          projectId: opportunity.projectId,
          volunteerId: application.volunteerId,
          role: "Volunteer",
          status: "active",
          assignedAt: new Date(),
          respondedAt: new Date(),
          hoursCommitted: opportunity.ongoingHoursPerWeek || 0
        });

        const project = await storage.getProject(opportunity.projectId);
        if (project && project.organizationId) {
          await notifyNewAssignment(
            application.volunteerId,
            opportunity.projectId,
            project.organizationId
          );
        }

        await storage.createVolunteerActivity({
          userId: application.volunteerId,
          projectId: opportunity.projectId,
          description: `Accepted application for ${opportunity.title}`,
          date: new Date(),
          hours: 0
        });
      }
    }

    await notifyApplicationStatusChange(
      application.volunteerId,
      application.opportunityId,
      status,
      opportunity.title
    );

    broadcastUpdate("application_reviewed", updatedApplication);
    res.json(updatedApplication);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});
