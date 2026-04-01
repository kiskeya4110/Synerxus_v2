import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { runMatchmaker, getVolunteerMatches, getOrganizationMatches } from "../matchmaker-service";

export const matchmakerRouter = Router();

/**
 * POST /api/matchmaker/run - Run matchmaker algorithm for all volunteers and organizations
 * Query params:
 * - threshold: Minimum match score (default: 40.0)
 */
matchmakerRouter.post("/run", async (req: Request, res: Response) => {
  try {
    const parsedThreshold0 = req.query.threshold ? parseFloat(req.query.threshold as string) : NaN;
    const threshold = (!isNaN(parsedThreshold0) && parsedThreshold0 >= 0) ? parsedThreshold0 : 40.0;

    // Get all volunteers and organizations
    const volunteers = await storage.listVolunteers();
    const organizations = await storage.listMatchableOrganizations();

    if (volunteers.length === 0) {
      return res.status(400).json({ message: "No volunteers found in database" });
    }

    if (organizations.length === 0) {
      return res.status(400).json({ message: "No organizations found in database" });
    }

    // Run the matchmaker
    const result = await runMatchmaker(volunteers, organizations, threshold);

    if (!result.success) {
      return res.status(500).json({
        message: "Matchmaker failed",
        error: result.error
      });
    }

    res.json(result);
  } catch (err) {
    console.error("Error running matchmaker:", err);
    res.status(500).json({
      message: "Failed to run matchmaker",
      error: err instanceof Error ? err.message : String(err)
    });
  }
});

/**
 * GET /api/matchmaker/volunteer/:id - Get top matches for a specific volunteer
 * Query params:
 * - limit: Maximum number of matches (default: 3 for Impact Log model)
 * - threshold: Minimum match score (default: 40.0)
 */
matchmakerRouter.get("/volunteer/:id", async (req: Request, res: Response) => {
  try {
    const volunteerId = req.params.id;
    const parsedLimit1 = req.query.limit ? parseInt(req.query.limit as string) : NaN;
    const limit = (!isNaN(parsedLimit1) && parsedLimit1 > 0) ? parsedLimit1 : 3;
    const parsedThreshold1 = req.query.threshold ? parseFloat(req.query.threshold as string) : NaN;
    const threshold = (!isNaN(parsedThreshold1) && parsedThreshold1 >= 0) ? parsedThreshold1 : 40.0;

    // Get all volunteers and organizations
    const volunteers = await storage.listVolunteers();
    const organizations = await storage.listMatchableOrganizations();

    // Check if volunteer exists
    const volunteer = volunteers.find(v => v.id === volunteerId);
    if (!volunteer) {
      return res.status(404).json({ message: "Volunteer not found" });
    }

    if (organizations.length === 0) {
      return res.json({
        volunteer_id: volunteerId,
        matches: [],
        message: "No organizations available for matching"
      });
    }

    // Get matches for this volunteer
    const matches = await getVolunteerMatches(
      volunteerId,
      volunteers,
      organizations,
      limit,
      threshold
    );

    res.json({
      volunteer_id: volunteerId,
      volunteer_name: volunteer.name,
      matches,
      total_matches: matches.length
    });
  } catch (err) {
    console.error("Error getting volunteer matches:", err);
    // Return empty matches on error instead of 500 to prevent client-side errors
    res.json({
      volunteer_id: req.params.id,
      matches: [],
      message: "Unable to compute matches at this time",
      error: err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err))
    });
  }
});

/**
 * POST /api/matchmaker/volunteer/:volunteerId - Get top 3 project matches for volunteer
 * Used by Impact Log model for quick project selection
 * Always returns exactly 3 (or fewer if unavailable) active projects
 */
matchmakerRouter.post("/volunteer/:volunteerId", async (req: Request, res: Response) => {
  try {
    const volunteerId = req.params.volunteerId;

    // Get all volunteers and organizations (projects)
    const volunteers = await storage.listVolunteers();
    const organizations = await storage.listMatchableOrganizations();

    // Check if volunteer exists
    const volunteer = volunteers.find(v => v.id === volunteerId);
    if (!volunteer) {
      return res.status(404).json({ message: "Volunteer not found" });
    }

    if (organizations.length === 0) {
      return res.json({
        volunteer_id: volunteerId,
        matches: [],
        message: "No projects available for matching"
      });
    }

    // Get top 3 matches for this volunteer (fixed for Impact Log model)
    const matches = await getVolunteerMatches(
      volunteerId,
      volunteers,
      organizations,
      3, // Always return top 3 for Impact Log model
      40.0
    );

    res.json({
      volunteer_id: volunteerId,
      volunteer_name: volunteer.name,
      matches
    });
  } catch (err) {
    console.error("Error getting volunteer project matches:", err);
    res.status(500).json({
      message: "Failed to get project matches",
      error: err instanceof Error ? err.message : String(err)
    });
  }
});

/**
 * GET /api/matchmaker/organization/:id - Get top volunteers for a specific organization
 * Query params:
 * - limit: Maximum number of matches (default: 10)
 * - threshold: Minimum match score (default: 40.0)
 */
matchmakerRouter.get("/organization/:id", async (req: Request, res: Response) => {
  try {
    const organizationId = req.params.id;
    const parsedLimit2 = req.query.limit ? parseInt(req.query.limit as string) : NaN;
    const limit = (!isNaN(parsedLimit2) && parsedLimit2 > 0) ? parsedLimit2 : 10;
    const parsedThreshold2 = req.query.threshold ? parseFloat(req.query.threshold as string) : NaN;
    const threshold = (!isNaN(parsedThreshold2) && parsedThreshold2 >= 0) ? parsedThreshold2 : 40.0;

    // Get all volunteers and organizations
    const volunteers = await storage.listVolunteers();
    const organizations = await storage.listMatchableOrganizations();

    // Check if organization exists
    const organization = organizations.find(o => o.id === organizationId);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    if (volunteers.length === 0) {
      return res.json({
        organization_id: organizationId,
        matches: [],
        message: "No volunteers available for matching"
      });
    }

    // Get matches for this organization
    const matches = await getOrganizationMatches(
      organizationId,
      volunteers,
      organizations,
      limit,
      threshold
    );

    res.json({
      organization_id: organizationId,
      organization_name: organization.name,
      matches,
      total_matches: matches.length
    });
  } catch (err) {
    console.error("Error getting organization matches:", err);
    res.status(500).json({
      message: "Failed to get organization matches",
      error: err instanceof Error ? err.message : String(err)
    });
  }
});
