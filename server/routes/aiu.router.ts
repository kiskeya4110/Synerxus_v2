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
import { db } from "../db";
import { projectAiuSettings, projects } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

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

// =====================================================
// PROJECT AIU SETTINGS CRUD OPERATIONS
// =====================================================

/**
 * GET /api/aiu/project/:projectId/settings
 * Get AIU settings for a specific project
 */
aiuRouter.get("/project/:projectId/settings", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    // Check if project exists
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Get the most recent AIU settings for this project
    const [settings] = await db
      .select()
      .from(projectAiuSettings)
      .where(eq(projectAiuSettings.projectId, projectId))
      .orderBy(desc(projectAiuSettings.createdAt))
      .limit(1);

    res.json(settings || null);
  } catch (error) {
    console.error("Error fetching project AIU settings:", error);
    res.status(500).json({ error: "Failed to fetch project AIU settings" });
  }
});

/**
 * POST /api/aiu/project/:projectId/settings
 * Create or update AIU settings for a specific project
 */
aiuRouter.post("/project/:projectId/settings", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    // Check if project exists
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const {
      sdgIndicator,
      kpiName,
      kpiUnit,
      kpiBefore,
      kpiAfter,
      kpiMeasurementDate,
      attributionFactor,
      attributionMethodology,
      reportingWindowStart,
      reportingWindowEnd,
      notes,
      evidenceLinks,
    } = req.body;

    // Validate required fields
    if (!sdgIndicator || !kpiName || !kpiUnit || kpiBefore === undefined) {
      return res.status(400).json({
        error: "Missing required fields: sdgIndicator, kpiName, kpiUnit, and kpiBefore are required"
      });
    }

    // Validate kpiBefore is a number
    if (typeof kpiBefore !== 'number' || isNaN(kpiBefore)) {
      return res.status(400).json({ error: "kpiBefore must be a valid number" });
    }

    // Validate kpiAfter if provided
    if (kpiAfter !== undefined && kpiAfter !== null && (typeof kpiAfter !== 'number' || isNaN(kpiAfter))) {
      return res.status(400).json({ error: "kpiAfter must be a valid number" });
    }

    // Validate attribution factor if provided (must be between 0 and 1)
    const validAttributionFactor = attributionFactor !== undefined
      ? Math.min(Math.max(attributionFactor, 0), 1)
      : 0.2;

    // Check if settings already exist for this project
    const [existingSettings] = await db
      .select()
      .from(projectAiuSettings)
      .where(eq(projectAiuSettings.projectId, projectId))
      .orderBy(desc(projectAiuSettings.createdAt))
      .limit(1);

    if (existingSettings) {
      // Update existing settings
      const [updated] = await db
        .update(projectAiuSettings)
        .set({
          sdgIndicator,
          kpiName,
          kpiUnit,
          kpiBefore,
          kpiAfter: kpiAfter ?? null,
          kpiMeasurementDate: kpiMeasurementDate ? new Date(kpiMeasurementDate) : null,
          attributionFactor: validAttributionFactor,
          attributionMethodology: attributionMethodology || null,
          reportingWindowStart: reportingWindowStart ? new Date(reportingWindowStart) : null,
          reportingWindowEnd: reportingWindowEnd ? new Date(reportingWindowEnd) : null,
          notes: notes || null,
          evidenceLinks: evidenceLinks || null,
          updatedAt: new Date(),
        })
        .where(eq(projectAiuSettings.id, existingSettings.id))
        .returning();

      return res.json(updated);
    } else {
      // Create new settings
      const [created] = await db
        .insert(projectAiuSettings)
        .values({
          projectId,
          sdgIndicator,
          kpiName,
          kpiUnit,
          kpiBefore,
          kpiAfter: kpiAfter ?? null,
          kpiMeasurementDate: kpiMeasurementDate ? new Date(kpiMeasurementDate) : null,
          attributionFactor: validAttributionFactor,
          attributionMethodology: attributionMethodology || null,
          reportingWindowStart: reportingWindowStart ? new Date(reportingWindowStart) : null,
          reportingWindowEnd: reportingWindowEnd ? new Date(reportingWindowEnd) : null,
          notes: notes || null,
          evidenceLinks: evidenceLinks || null,
        })
        .returning();

      return res.status(201).json(created);
    }
  } catch (error) {
    console.error("Error saving project AIU settings:", error);
    res.status(500).json({ error: "Failed to save project AIU settings" });
  }
});

/**
 * DELETE /api/aiu/project/:projectId/settings
 * Delete AIU settings for a specific project
 */
aiuRouter.delete("/project/:projectId/settings", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const deleted = await db
      .delete(projectAiuSettings)
      .where(eq(projectAiuSettings.projectId, projectId))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: "No AIU settings found for this project" });
    }

    res.json({ message: "AIU settings deleted successfully", deleted: deleted.length });
  } catch (error) {
    console.error("Error deleting project AIU settings:", error);
    res.status(500).json({ error: "Failed to delete project AIU settings" });
  }
});

export default aiuRouter;
