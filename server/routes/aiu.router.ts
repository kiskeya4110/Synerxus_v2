/**
 * AIU (Attributable Impact Units) API Router
 *
 * Provides endpoints for AIU calculations at all levels:
 * - Volunteer: Individual AIU summaries
 * - Project: Project-level AIU calculations
 * - Organization: Organization-wide AIU aggregation
 * - CSR: Comprehensive CSR reporting
 *
 * SHADOW MODE (Feature Flag):
 * When ENABLE_AIU_DISPLAY is false, these endpoints return 403 to prevent
 * accidental exposure of AIU data in network inspection tools.
 * The AIU calculations still run internally for data collection.
 *
 * TODO (Post-Pilot): Enable AIU display once marketing materials are ready.
 */

import { Router, Request, Response, NextFunction } from "express";
import {
  calculateProjectAIU,
  calculateVolunteerAIU,
  calculateOrganizationAIU,
  generateCSRAIUReport,
  getVolunteerQuickAIUStats,
} from "../aiu-service";
import {
  generateAIUCsvExport,
  generateAIUJsonExport,
  calculateProjectAIUs,
  type AIUCalculationInput,
} from "@shared/aiu-calculations";
import { isAIUDisplayEnabled } from "@shared/feature-flags";

export const aiuRouter = Router();

/**
 * Impact Score API (formerly AIU)
 *
 * NOTE: As of pilot phase, we use "Impact Score" terminology in the UI.
 * The underlying calculation system remains unchanged.
 * API endpoints continue to function but return data labeled as Impact Score.
 *
 * TODO (Post-Pilot): Consider renaming endpoints to /api/impact-score/
 */

// No middleware blocking - Impact Score data flows to all clients
// Only the UI terminology changes, not the data availability

/**
 * GET /api/aiu/volunteer/:volunteerId
 * Get AIU summary for a specific volunteer
 */
aiuRouter.get("/volunteer/:volunteerId", async (req: Request, res: Response) => {
  try {
    const volunteerId = parseInt(req.params.volunteerId);
    if (isNaN(volunteerId)) {
      return res.status(400).json({ error: "Invalid volunteer ID" });
    }

    const summary = await calculateVolunteerAIU(volunteerId);
    if (!summary) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    res.json(summary);
  } catch (error) {
    console.error("Error fetching volunteer AIU:", error);
    res.status(500).json({ error: "Failed to calculate volunteer AIU" });
  }
});

/**
 * GET /api/aiu/volunteer/:volunteerId/quick
 * Get quick AIU stats for dashboard display
 */
aiuRouter.get("/volunteer/:volunteerId/quick", async (req: Request, res: Response) => {
  try {
    const volunteerId = parseInt(req.params.volunteerId);
    if (isNaN(volunteerId)) {
      return res.status(400).json({ error: "Invalid volunteer ID" });
    }

    const stats = await getVolunteerQuickAIUStats(volunteerId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching quick AIU stats:", error);
    res.status(500).json({ error: "Failed to get quick AIU stats" });
  }
});

/**
 * GET /api/aiu/project/:projectId
 * Get AIU summary for a specific project
 */
aiuRouter.get("/project/:projectId", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const summary = await calculateProjectAIU(projectId);
    if (!summary) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(summary);
  } catch (error) {
    console.error("Error fetching project AIU:", error);
    res.status(500).json({ error: "Failed to calculate project AIU" });
  }
});

/**
 * GET /api/aiu/organization/:organizationId
 * Get AIU summary for a specific organization
 *
 * Query params:
 * - projectId: Filter to specific project
 * - startDate: Filter activities/impacts from this date (ISO string)
 * - endDate: Filter activities/impacts until this date (ISO string)
 * - timePeriod: Convenience filter (7d, 30d, 90d, 1y)
 * - sdgGoal: Filter to projects with specific SDG
 */
aiuRouter.get("/organization/:organizationId", async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    if (isNaN(organizationId)) {
      return res.status(400).json({ error: "Invalid organization ID" });
    }

    // Parse filter parameters
    const projectIdParam = req.query.projectId as string | undefined;
    const startDateParam = req.query.startDate as string | undefined;
    const endDateParam = req.query.endDate as string | undefined;
    const timePeriodParam = req.query.timePeriod as string | undefined;
    const sdgGoalParam = req.query.sdgGoal as string | undefined;

    // Build filters
    const filters: {
      projectId?: number;
      startDate?: Date;
      endDate?: Date;
      sdgGoal?: number;
    } = {};

    if (projectIdParam && projectIdParam !== 'all') {
      filters.projectId = parseInt(projectIdParam);
    }

    if (sdgGoalParam) {
      filters.sdgGoal = parseInt(sdgGoalParam);
    }

    // Handle time period convenience filter
    if (timePeriodParam && timePeriodParam !== 'all') {
      const now = new Date();
      filters.endDate = now;
      if (timePeriodParam === '7d') {
        filters.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timePeriodParam === '30d') {
        filters.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (timePeriodParam === '90d') {
        filters.startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else if (timePeriodParam === '1y') {
        // "Last year" means the previous calendar year (Jan 1 - Dec 31)
        const previousYear = new Date().getFullYear() - 1;
        filters.startDate = new Date(previousYear, 0, 1);
        filters.endDate = new Date(previousYear, 11, 31, 23, 59, 59, 999);
      }
    } else if (startDateParam || endDateParam) {
      // Use explicit date range if provided
      if (startDateParam) {
        filters.startDate = new Date(startDateParam);
      }
      if (endDateParam) {
        filters.endDate = new Date(endDateParam);
      }
    }

    const summary = await calculateOrganizationAIU(organizationId, Object.keys(filters).length > 0 ? filters : undefined);
    if (!summary) {
      return res.status(404).json({ error: "Organization not found" });
    }

    res.json(summary);
  } catch (error) {
    console.error("Error fetching organization AIU:", error);
    res.status(500).json({ error: "Failed to calculate organization AIU" });
  }
});

/**
 * GET /api/aiu/csr-report
 * Generate comprehensive CSR AIU report
 */
aiuRouter.get("/csr-report", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    let reportingPeriod: { start: Date; end: Date } | undefined;
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)" });
      }

      // Validate date range
      if (start >= end) {
        return res.status(400).json({ error: "Start date must be before end date" });
      }

      reportingPeriod = { start, end };
    }

    const report = await generateCSRAIUReport(reportingPeriod);
    res.json(report);
  } catch (error) {
    console.error("Error generating CSR report:", error);
    res.status(500).json({ error: "Failed to generate CSR AIU report" });
  }
});

/**
 * GET /api/aiu/project/:projectId/export/csv
 * Export project AIU data as CSV
 */
aiuRouter.get("/project/:projectId/export/csv", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const summary = await calculateProjectAIU(projectId);
    if (!summary) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Build AIU calculation input from summary
    const aiuInput: AIUCalculationInput = {
      kpiBefore: summary.kpiBefore,
      kpiAfter: summary.kpiAfter || summary.kpiBefore,
      attributionFactor: summary.attributionFactor,
      volunteers: summary.volunteers.map(v => ({
        volunteerId: v.volunteerId,
        volunteerName: v.volunteerName,
        role: v.role,
        hours: v.hours,
        reliabilityStatus: 'pending',
      })),
    };

    const aiuResult = calculateProjectAIUs(aiuInput);

    const csv = generateAIUCsvExport(
      {
        projectId: summary.projectId,
        projectName: summary.projectName,
        sdgIndicator: summary.sdgIndicator,
        kpiBefore: summary.kpiBefore,
        kpiAfter: summary.kpiAfter || summary.kpiBefore,
        verificationStatus: summary.verificationStatus,
        verifier: null,
        evidenceLinks: [],
      },
      aiuResult
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="aiu_${summary.projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error("Error exporting AIU CSV:", error);
    res.status(500).json({ error: "Failed to export AIU data" });
  }
});

/**
 * GET /api/aiu/project/:projectId/export/json
 * Export project AIU data as JSON
 */
aiuRouter.get("/project/:projectId/export/json", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const summary = await calculateProjectAIU(projectId);
    if (!summary) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Build AIU calculation input from summary
    const aiuInput: AIUCalculationInput = {
      kpiBefore: summary.kpiBefore,
      kpiAfter: summary.kpiAfter || summary.kpiBefore,
      attributionFactor: summary.attributionFactor,
      volunteers: summary.volunteers.map(v => ({
        volunteerId: v.volunteerId,
        volunteerName: v.volunteerName,
        role: v.role,
        hours: v.hours,
        reliabilityStatus: 'pending',
      })),
    };

    const aiuResult = calculateProjectAIUs(aiuInput);

    const jsonExport = generateAIUJsonExport(
      {
        projectId: summary.projectId,
        projectName: summary.projectName,
        sdgIndicator: summary.sdgIndicator,
        kpiBefore: summary.kpiBefore,
        kpiAfter: summary.kpiAfter || summary.kpiBefore,
        kpiUnit: 'percentage',
        verificationStatus: summary.verificationStatus,
        verifier: null,
        verifiedAt: null,
        evidenceLinks: [],
        submitter: 'System',
        submittedAt: new Date(),
        lastModifiedAt: new Date(),
      },
      aiuResult
    );

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="aiu_${summary.projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json"`
    );
    res.json(jsonExport);
  } catch (error) {
    console.error("Error exporting AIU JSON:", error);
    res.status(500).json({ error: "Failed to export AIU data" });
  }
});

/**
 * POST /api/aiu/calculate
 * Calculate AIUs with custom inputs (for testing/simulation)
 */
aiuRouter.post("/calculate", async (req: Request, res: Response) => {
  try {
    const input: AIUCalculationInput = req.body;

    // Validate required fields exist
    if (input.kpiBefore === undefined || input.kpiAfter === undefined ||
        input.attributionFactor === undefined || !input.volunteers) {
      return res.status(400).json({
        error: "Missing required fields: kpiBefore, kpiAfter, attributionFactor, volunteers",
      });
    }

    // Validate numeric types
    if (typeof input.kpiBefore !== 'number' || typeof input.kpiAfter !== 'number' ||
        typeof input.attributionFactor !== 'number') {
      return res.status(400).json({
        error: "kpiBefore, kpiAfter, and attributionFactor must be numbers",
      });
    }

    // Validate attribution factor is between 0 and 1
    if (input.attributionFactor < 0 || input.attributionFactor > 1) {
      return res.status(400).json({
        error: "attributionFactor must be between 0 and 1",
      });
    }

    // Validate volunteers array
    if (!Array.isArray(input.volunteers) || input.volunteers.length === 0) {
      return res.status(400).json({
        error: "volunteers must be a non-empty array",
      });
    }

    // Validate each volunteer has positive hours
    for (const volunteer of input.volunteers) {
      if (typeof volunteer.hours !== 'number' || volunteer.hours < 0) {
        return res.status(400).json({
          error: `Invalid hours for volunteer ${volunteer.volunteerName || volunteer.volunteerId}: must be a non-negative number`,
        });
      }
    }

    const result = calculateProjectAIUs(input);
    res.json(result);
  } catch (error) {
    console.error("Error calculating AIU:", error);
    res.status(500).json({ error: "Failed to calculate AIU" });
  }
});

export default aiuRouter;
