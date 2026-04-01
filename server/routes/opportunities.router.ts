import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertOpportunitySchema } from "@shared/schema";
import { handleValidationError, requireOrgUser, verifyOwnership, getAuthenticatedUser } from "./utils";
import { getProjectsForVolunteer } from "../dashboard-service";
import { deriveCategoryFromSDGs, calculateMatchScore } from "../matching-algorithm";
import { authMiddleware } from "../middleware/auth";

export const opportunitiesRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/opportunities/matches - Get AI-matched opportunities for volunteer
opportunitiesRouter.get("/matches", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Verify authenticated user
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const thresholdParam = req.query.threshold as string | undefined;

    // SECURITY: Use authenticated user's ID
    const userIdNum = authUser.id;
    const parsedT = thresholdParam ? parseInt(thresholdParam) : NaN;
    const threshold = (!isNaN(parsedT) && parsedT >= 0 && parsedT <= 100) ? parsedT : 40;

    const matchedOpportunities = await getProjectsForVolunteer(userIdNum, threshold);

    const formattedMatches = matchedOpportunities.map((opp: any) => ({
      ...opp,
      matchPercentage: opp.matchScore,
      matchReasons: opp.matchReasons
    }));

    res.json(formattedMatches);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch matched opportunities", error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/opportunities/discover - Discover opportunities with enrichment
opportunitiesRouter.get("/discover", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Verify authenticated user
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const thresholdParam = req.query.threshold as string;

    // SECURITY: Use authenticated user's ID
    const userId = authUser.id;

    let matchThreshold = 50;
    if (thresholdParam) {
      const parsedThreshold = parseInt(thresholdParam);
      if (!isNaN(parsedThreshold) && parsedThreshold >= 0 && parsedThreshold <= 100) {
        matchThreshold = parsedThreshold;
      }
    }

    const { getEnrichedOpportunities } = await import("../opportunity-enrichment-service");

    const enrichedOpportunities = await getEnrichedOpportunities(storage, {
      includeMatch: true,
      volunteerId: userId,
      matchThreshold,
    });

    res.json(enrichedOpportunities);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch opportunities" });
  }
});

// GET /api/opportunities/status - Get opportunity status for volunteer
opportunitiesRouter.get("/status", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Verify authenticated user
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    // SECURITY: Use authenticated user's ID
    const vid = authUser.id;

    const [saved, rejected, applications] = await Promise.all([
      storage.listSavedOpportunitiesByVolunteer(vid),
      storage.listRejectedOpportunitiesByVolunteer(vid),
      storage.listApplicationsByVolunteer(vid)
    ]);

    const savedIds = saved.map(s => s.opportunityId);
    const rejectedIds = rejected.map(r => r.opportunityId);
    const appliedIds = applications.map(a => a.opportunityId);

    res.json({ savedIds, rejectedIds, appliedIds });
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// GET /api/opportunities - List opportunities with authorization
opportunitiesRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Verify authenticated user
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    let opportunities;

    // SECURITY: Use authenticated user's data instead of query parameters
    if (authUser.userType === 'organization' && authUser.organizationId) {
      opportunities = await storage.listOpportunitiesByOrganization(authUser.organizationId);
    } else if (authUser.userType === 'volunteer') {
      const allOpportunities = await storage.listOpportunities();
      opportunities = allOpportunities.filter(opp => opp.status === 'open');
    } else {
      // For other user types, get opportunities from their organization if they have one
      if (authUser.organizationId) {
        opportunities = await storage.listOpportunitiesByOrganization(authUser.organizationId);
      } else {
        const allOpportunities = await storage.listOpportunities();
        opportunities = allOpportunities.filter(opp => opp.status === 'open');
      }
    }

    res.json(opportunities);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch opportunities" });
  }
});

// GET /api/opportunities/:id - Get opportunity by ID with optional match analysis
opportunitiesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const opportunityId = parseInt(req.params.id);
    if (isNaN(opportunityId)) return res.status(400).json({ message: "Invalid opportunity ID" });
    const userId = req.query.userId as string | undefined;
    const opportunity = await storage.getOpportunity(opportunityId);

    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    let enrichedOpportunity: any = { ...opportunity };

    // Add organization info
    if (opportunity.organizationId) {
      const organization = await storage.getOrganization(opportunity.organizationId);
      if (organization) {
        enrichedOpportunity.organizationName = organization.name;
        enrichedOpportunity.organization = organization;
      }
    }

    // Calculate match score if userId is provided (for volunteers)
    if (userId) {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) return res.status(400).json({ message: "Invalid user ID" });
      const user = await storage.getUser(userIdNum);

      if (user && user.userType === 'volunteer') {
        // Get volunteer profile for comprehensive matching
        const volunteerProfile = await storage.getVolunteerProfile(userIdNum);
        const volunteerWithProfile = {
          ...user,
          profile: volunteerProfile
        };

        // Calculate match score with full breakdown
        const matchResult = calculateMatchScore(volunteerWithProfile, opportunity);

        enrichedOpportunity.matchScore = matchResult.score;
        enrichedOpportunity.matchReasons = matchResult.reasons;
        enrichedOpportunity.matchCategory = matchResult.matchCategory;
        enrichedOpportunity.matchBreakdown = matchResult.breakdown;
        enrichedOpportunity.dataQualityWarnings = matchResult.dataQualityWarnings;
      }
    }

    res.json(enrichedOpportunity);
  } catch (err) {
    console.error("Failed to fetch opportunity:", err);
    res.status(500).json({ message: "Failed to fetch opportunity" });
  }
});

// POST /api/opportunities - Create new opportunity
opportunitiesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = await requireOrgUser(req);
    const opportunityData = insertOpportunitySchema.parse(req.body);

    if (opportunityData.organizationId !== user.organizationId) {
      return res.status(403).json({ message: "Resource not owned by your organization" });
    }

    if (!opportunityData.category && (opportunityData.sdgGoals || opportunityData.primarySdg)) {
      const derivedCategory = deriveCategoryFromSDGs(
        opportunityData.sdgGoals as number[] | null,
        opportunityData.primarySdg as number | null
      );
      if (derivedCategory) {
        (opportunityData as any).category = derivedCategory;
      }
    }

    const opportunity = await storage.createOpportunity(opportunityData);
    broadcastUpdate("opportunity_created", opportunity);
    res.status(201).json(opportunity);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// PATCH /api/opportunities/:id - Update opportunity
opportunitiesRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const user = await requireOrgUser(req);
    const opportunityId = parseInt(req.params.id);
    if (isNaN(opportunityId)) return res.status(400).json({ message: "Invalid opportunity ID" });

    const existingOpportunity = await storage.getOpportunity(opportunityId);
    if (!existingOpportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }
    verifyOwnership(user, existingOpportunity);

    const opportunityData = insertOpportunitySchema.partial().parse(req.body);
    const updatedOpportunity = await storage.updateOpportunity(opportunityId, opportunityData);

    if (!updatedOpportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    broadcastUpdate("opportunity_updated", updatedOpportunity);
    res.json(updatedOpportunity);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});
