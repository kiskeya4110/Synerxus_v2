import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertOpportunitySchema } from "@shared/schema";
import { handleValidationError, requireOrgUser, verifyOwnership } from "./utils";
import { getProjectsForVolunteer } from "../dashboard-service";
import { deriveCategoryFromSDGs } from "../matching-algorithm";
import { verifyFirebaseToken } from "../middleware/firebase-auth";

export const opportunitiesRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/opportunities/matches - Get AI-matched opportunities for volunteer
opportunitiesRouter.get("/matches", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;
    const thresholdParam = req.query.threshold as string | undefined;

    if (!userId) {
      return res.status(400).json({ message: "userId query parameter is required" });
    }

    const userIdNum = parseInt(userId);
    const threshold = thresholdParam ? parseInt(thresholdParam) : 40;

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
opportunitiesRouter.get("/discover", async (req: Request, res: Response) => {
  try {
    const userIdParam = req.query.userId as string;
    const thresholdParam = req.query.threshold as string;

    if (!userIdParam) {
      return res.status(400).json({ message: "userId parameter is required" });
    }

    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

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
// Protected: Requires authentication and ownership verification
opportunitiesRouter.get("/status", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const volunteerId = req.query.volunteerId as string;

    if (!volunteerId) {
      return res.status(400).json({ message: "volunteerId is required" });
    }

    const vid = Number(volunteerId);

    if (isNaN(vid)) {
      return res.status(400).json({ message: "volunteerId must be a valid number" });
    }

    // IDOR protection: Volunteers can only view their own status
    if (authenticatedUser.id !== vid) {
      return res.status(403).json({
        message: "Access denied. You can only view your own opportunity status.",
        code: "FORBIDDEN"
      });
    }

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

// GET /api/opportunities - List opportunities with authorization and optional pagination
opportunitiesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { organizationId, userId, page, limit } = req.query;

    if (!organizationId && !userId) {
      return res.status(400).json({
        message: "Either organizationId or userId must be provided for data security"
      });
    }

    // If pagination params are provided and querying for volunteer (open opportunities)
    const usePagination = page || limit;
    const paginationParams = usePagination ? {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    } : undefined;

    let opportunities;
    if (organizationId) {
      opportunities = await storage.listOpportunitiesByOrganization(parseInt(organizationId as string));
      return res.json(opportunities);
    } else if (userId) {
      const userIdNum = parseInt(userId as string);
      const user = await storage.getUser(userIdNum);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.userType === 'organization' && user.organizationId) {
        opportunities = await storage.listOpportunitiesByOrganization(user.organizationId);
        return res.json(opportunities);
      } else if (user.userType === 'volunteer') {
        // Use paginated query for volunteers browsing open opportunities
        if (paginationParams) {
          const result = await storage.listOpportunitiesPaginated(paginationParams);
          result.data = result.data.filter(opp => opp.status === 'open');
          return res.json(result);
        }
        const allOpportunities = await storage.listOpportunities();
        opportunities = allOpportunities.filter(opp => opp.status === 'open');
        return res.json(opportunities);
      } else {
        return res.status(400).json({ message: "Invalid user type" });
      }
    } else {
      return res.status(400).json({ message: "Missing required parameters" });
    }
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch opportunities" });
  }
});

// GET /api/opportunities/:id - Get opportunity by ID
opportunitiesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const opportunityId = parseInt(req.params.id);
    const opportunity = await storage.getOpportunity(opportunityId);

    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    let enrichedOpportunity: any = { ...opportunity };
    if (opportunity.organizationId) {
      const organization = await storage.getOrganization(opportunity.organizationId);
      if (organization) {
        enrichedOpportunity.organizationName = organization.name;
        enrichedOpportunity.organization = organization;
      }
    }

    res.json(enrichedOpportunity);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch opportunity" });
  }
});

// POST /api/opportunities - Create new opportunity
// Protected: Requires authentication and organization membership
opportunitiesRouter.post("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser || authenticatedUser.userType !== 'organization' || !authenticatedUser.organizationId) {
      return res.status(403).json({
        message: "Organization authorization required",
        code: "ORG_REQUIRED"
      });
    }

    const opportunityData = insertOpportunitySchema.parse(req.body);

    // IDOR protection: Can only create opportunities for own organization
    if (opportunityData.organizationId !== authenticatedUser.organizationId) {
      return res.status(403).json({
        message: "Access denied. You can only create opportunities for your own organization.",
        code: "FORBIDDEN"
      });
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
