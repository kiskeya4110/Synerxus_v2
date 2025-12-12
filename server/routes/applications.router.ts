import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertApplicationSchema } from "@shared/schema";
import { handleValidationError } from "./utils";
import { calculateMatchScore } from "../matching-algorithm";
import { notifyApplicationStatusChange, notifyNewAssignment } from "../notification-service";

export const applicationsRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/applications - List applications
applicationsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { opportunityId, volunteerId, organizationId } = req.query;

    let applications;
    if (opportunityId) {
      applications = await storage.listApplicationsByOpportunity(parseInt(opportunityId as string));
    } else if (volunteerId) {
      applications = await storage.listApplicationsByVolunteer(parseInt(volunteerId as string));
    } else if (organizationId) {
      applications = await storage.listApplicationsByOrganization(parseInt(organizationId as string));
    } else {
      applications = await storage.listApplications();
    }

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch applications" });
  }
});

// GET /api/applications/:id - Get application by ID
applicationsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.id);
    const application = await storage.getApplication(applicationId);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json(application);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch application" });
  }
});

// POST /api/applications - Create new application
applicationsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = insertApplicationSchema.parse(req.body);
    const { opportunityId, volunteerId } = validatedData;

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
applicationsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.id);
    const applicationData = req.body;

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
applicationsRouter.post("/:id/review", async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { status, notes, reviewerId } = req.body;

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

    const updatedApplication = await storage.updateApplication(applicationId, {
      status,
      reviewedAt: new Date(),
      reviewedBy: reviewerId || null,
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
