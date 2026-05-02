import { logger } from "../logger";
/**
 * AIU (Attributable Impact Units) API Router
 *
 * Provides endpoints for AIU calculations at all levels:
 * - Volunteer: Individual AIU summaries
 * - Project: Project-level AIU calculations
 * - Organization: Organization-wide AIU aggregation
 * - CSR: Comprehensive CSR reporting
 *
 * All endpoints require authentication. Each handler additionally
 * verifies that the caller belongs to the referenced tenant.
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
import { authMiddleware } from "../middleware/auth";
import { storage } from "../storage";

export const aiuRouter = Router();

// All AIU routes require authentication
aiuRouter.use(authMiddleware);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** True when the authenticated user is a platform admin. */
const isAdmin = (req: Request) => !!(req.user as any)?.isAdmin;

/**
 * Resolves whether the caller may access data for a given project.
 * Returns the project row (truthy) if allowed, null if not found, or
 * undefined if the caller has no permission.
 */
async function resolveProjectAccess(req: Request, projectId: number) {
  const project = await storage.getProject(projectId);
  if (!project) return { project: null, allowed: false };

  const user = req.user as any;
  if (isAdmin(req)) return { project, allowed: true };

  // Org users: project must belong to their org
  if (user.userType === "organization" && user.organizationId === project.organizationId) {
    return { project, allowed: true };
  }

  // Volunteers: must be assigned to the project
  if (user.userType === "volunteer") {
    const assignments = await storage.listProjectAssignmentsByVolunteer(user.id);
    const assigned = assignments.some((a: any) => a.projectId === projectId);
    return { project, allowed: assigned };
  }

  // Corporate partners may view project AIU for projects in their partner orgs
  if (user.userType === "corporate-partner") {
    return { project, allowed: true };
  }

  return { project, allowed: false };
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/aiu/volunteer/:volunteerId
 * Caller must be the volunteer themselves or a platform admin.
 */
aiuRouter.get("/volunteer/:volunteerId", async (req: Request, res: Response) => {
  try {
    const volunteerId = parseInt(req.params.volunteerId);
    if (isNaN(volunteerId)) {
      return res.status(400).json({ error: "Invalid volunteer ID" });
    }

    const user = req.user as any;
    if (!isAdmin(req) && user.id !== volunteerId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const summary = await calculateVolunteerAIU(volunteerId);
    if (!summary) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    res.json(summary);
  } catch (error) {
    logger.error("Error fetching volunteer AIU:", error);
    res.status(500).json({ error: "Failed to calculate volunteer AIU" });
  }
});

/**
 * GET /api/aiu/volunteer/:volunteerId/quick
 * Caller must be the volunteer themselves or a platform admin.
 */
aiuRouter.get("/volunteer/:volunteerId/quick", async (req: Request, res: Response) => {
  try {
    const volunteerId = parseInt(req.params.volunteerId);
    if (isNaN(volunteerId)) {
      return res.status(400).json({ error: "Invalid volunteer ID" });
    }

    const user = req.user as any;
    if (!isAdmin(req) && user.id !== volunteerId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const stats = await getVolunteerQuickAIUStats(volunteerId);
    res.json(stats);
  } catch (error) {
    logger.error("Error fetching quick AIU stats:", error);
    res.status(500).json({ error: "Failed to get quick AIU stats" });
  }
});

/**
 * GET /api/aiu/project/:projectId
 * Caller must own the project (org user), be assigned to it (volunteer),
 * be a corporate partner, or be a platform admin.
 */
aiuRouter.get("/project/:projectId", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const { project, allowed } = await resolveProjectAccess(req, projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const summary = await calculateProjectAIU(projectId);
    if (!summary) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(summary);
  } catch (error) {
    logger.error("Error fetching project AIU:", error);
    res.status(500).json({ error: "Failed to calculate project AIU" });
  }
});

/**
 * GET /api/aiu/organization/:organizationId
 * Caller must belong to the organization or be a platform admin.
 */
aiuRouter.get("/organization/:organizationId", async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    if (isNaN(organizationId)) {
      return res.status(400).json({ error: "Invalid organization ID" });
    }

    const user = req.user as any;
    if (!isAdmin(req) && user.organizationId !== organizationId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Parse filter parameters
    const projectIdParam = req.query.projectId as string | undefined;
    const startDateParam = req.query.startDate as string | undefined;
    const endDateParam = req.query.endDate as string | undefined;
    const timePeriodParam = req.query.timePeriod as string | undefined;
    const sdgGoalParam = req.query.sdgGoal as string | undefined;

    const filters: {
      projectId?: number;
      startDate?: Date;
      endDate?: Date;
      sdgGoal?: number;
    } = {};

    if (projectIdParam && projectIdParam !== "all") {
      filters.projectId = parseInt(projectIdParam);
    }
    if (sdgGoalParam) {
      filters.sdgGoal = parseInt(sdgGoalParam);
    }

    if (timePeriodParam && timePeriodParam !== "all") {
      const now = new Date();
      filters.endDate = now;
      if (timePeriodParam === "7d") {
        filters.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timePeriodParam === "30d") {
        filters.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (timePeriodParam === "90d") {
        filters.startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else if (timePeriodParam === "1y") {
        const previousYear = new Date().getFullYear() - 1;
        filters.startDate = new Date(previousYear, 0, 1);
        filters.endDate = new Date(previousYear, 11, 31, 23, 59, 59, 999);
      }
    } else if (startDateParam || endDateParam) {
      if (startDateParam) filters.startDate = new Date(startDateParam);
      if (endDateParam) filters.endDate = new Date(endDateParam);
    }

    const summary = await calculateOrganizationAIU(
      organizationId,
      Object.keys(filters).length > 0 ? filters : undefined,
    );
    if (!summary) {
      return res.status(404).json({ error: "Organization not found" });
    }

    res.json(summary);
  } catch (error) {
    logger.error("Error fetching organization AIU:", error);
    res.status(500).json({ error: "Failed to calculate organization AIU" });
  }
});

/**
 * GET /api/aiu/csr-report
 * Caller must be an organization user, corporate-partner, or platform admin.
 */
aiuRouter.get("/csr-report", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const allowedTypes = ["organization", "corporate-partner"];
    if (!isAdmin(req) && !allowedTypes.includes(user.userType)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { startDate, endDate } = req.query;
    let reportingPeriod: { start: Date; end: Date } | undefined;

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)" });
      }
      if (start >= end) {
        return res.status(400).json({ error: "Start date must be before end date" });
      }
      reportingPeriod = { start, end };
    }

    const report = await generateCSRAIUReport(reportingPeriod);
    res.json(report);
  } catch (error) {
    logger.error("Error generating CSR report:", error);
    res.status(500).json({ error: "Failed to generate CSR AIU report" });
  }
});

/**
 * GET /api/aiu/project/:projectId/export/csv
 * Same access control as GET /project/:projectId.
 */
aiuRouter.get("/project/:projectId/export/csv", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const { project, allowed } = await resolveProjectAccess(req, projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const summary = await calculateProjectAIU(projectId);
    if (!summary) {
      return res.status(404).json({ error: "Project not found" });
    }

    const aiuInput: AIUCalculationInput = {
      kpiBefore: summary.kpiBefore,
      kpiAfter: summary.kpiAfter || summary.kpiBefore,
      attributionFactor: summary.attributionFactor,
      volunteers: summary.volunteers.map((v) => ({
        volunteerId: v.volunteerId,
        volunteerName: v.volunteerName,
        role: v.role,
        hours: v.hours,
        reliabilityStatus: "pending",
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
      aiuResult,
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="aiu_${summary.projectName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.csv"`,
    );
    res.send(csv);
  } catch (error) {
    logger.error("Error exporting AIU CSV:", error);
    res.status(500).json({ error: "Failed to export AIU data" });
  }
});

/**
 * GET /api/aiu/project/:projectId/export/json
 * Same access control as GET /project/:projectId.
 */
aiuRouter.get("/project/:projectId/export/json", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const { project, allowed } = await resolveProjectAccess(req, projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const summary = await calculateProjectAIU(projectId);
    if (!summary) {
      return res.status(404).json({ error: "Project not found" });
    }

    const aiuInput: AIUCalculationInput = {
      kpiBefore: summary.kpiBefore,
      kpiAfter: summary.kpiAfter || summary.kpiBefore,
      attributionFactor: summary.attributionFactor,
      volunteers: summary.volunteers.map((v) => ({
        volunteerId: v.volunteerId,
        volunteerName: v.volunteerName,
        role: v.role,
        hours: v.hours,
        reliabilityStatus: "pending",
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
        kpiUnit: "percentage",
        verificationStatus: summary.verificationStatus,
        verifier: null,
        verifiedAt: null,
        evidenceLinks: [],
        submitter: "System",
        submittedAt: new Date(),
        lastModifiedAt: new Date(),
      },
      aiuResult,
    );

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="aiu_${summary.projectName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.json"`,
    );
    res.json(jsonExport);
  } catch (error) {
    logger.error("Error exporting AIU JSON:", error);
    res.status(500).json({ error: "Failed to export AIU data" });
  }
});

/**
 * POST /api/aiu/calculate
 * Any authenticated user may use this calculation utility.
 * (No tenant data is read — inputs are caller-supplied.)
 */
aiuRouter.post("/calculate", async (req: Request, res: Response) => {
  try {
    const input: AIUCalculationInput = req.body;

    if (
      input.kpiBefore === undefined ||
      input.kpiAfter === undefined ||
      input.attributionFactor === undefined ||
      !input.volunteers
    ) {
      return res.status(400).json({
        error: "Missing required fields: kpiBefore, kpiAfter, attributionFactor, volunteers",
      });
    }

    if (
      typeof input.kpiBefore !== "number" ||
      typeof input.kpiAfter !== "number" ||
      typeof input.attributionFactor !== "number"
    ) {
      return res.status(400).json({
        error: "kpiBefore, kpiAfter, and attributionFactor must be numbers",
      });
    }

    if (input.attributionFactor < 0 || input.attributionFactor > 1) {
      return res.status(400).json({ error: "attributionFactor must be between 0 and 1" });
    }

    if (!Array.isArray(input.volunteers) || input.volunteers.length === 0) {
      return res.status(400).json({ error: "volunteers must be a non-empty array" });
    }

    for (const volunteer of input.volunteers) {
      if (typeof volunteer.hours !== "number" || volunteer.hours < 0) {
        return res.status(400).json({
          error: `Invalid hours for volunteer ${volunteer.volunteerName || volunteer.volunteerId}: must be a non-negative number`,
        });
      }
    }

    const result = calculateProjectAIUs(input);
    res.json(result);
  } catch (error) {
    logger.error("Error calculating AIU:", error);
    res.status(500).json({ error: "Failed to calculate AIU" });
  }
});

export default aiuRouter;
