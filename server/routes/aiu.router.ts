/**
 * AIU (Attributable Impact Units) API Router
 *
 * Provides endpoints for AIU calculations at all levels:
 * - Volunteer: Individual AIU summaries
 * - Project: Project-level AIU calculations
 * - Organization: Organization-wide AIU aggregation
 * - CSR: Comprehensive CSR reporting
 */

import { Router, Request, Response } from "express";
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

export const aiuRouter = Router();

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
 */
aiuRouter.get("/organization/:organizationId", async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    if (isNaN(organizationId)) {
      return res.status(400).json({ error: "Invalid organization ID" });
    }

    const summary = await calculateOrganizationAIU(organizationId);
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
      reportingPeriod = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };
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

    if (!input.kpiBefore || input.kpiAfter === undefined || !input.attributionFactor || !input.volunteers) {
      return res.status(400).json({
        error: "Missing required fields: kpiBefore, kpiAfter, attributionFactor, volunteers",
      });
    }

    const result = calculateProjectAIUs(input);
    res.json(result);
  } catch (error) {
    console.error("Error calculating AIU:", error);
    res.status(500).json({ error: "Failed to calculate AIU" });
  }
});

export default aiuRouter;
