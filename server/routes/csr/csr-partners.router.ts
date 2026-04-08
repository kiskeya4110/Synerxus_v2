/**
 * CSR Partners Router
 * Handles partner management, challenges, budget links, and verified outputs
 */

import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { safeParseInt, handleValidationError, createErrorResponse } from "./csr-utils";
import { authMiddleware } from "../../middleware/auth";
import { getAuthenticatedUser } from "../utils";
import { logger } from "../../logger";

export const csrPartnersRouter = Router();

// ==================== CSR PARTNER MANAGEMENT ROUTES ====================

/**
 * POST /csr/partners
 * Create a new CSR Partner
 */
csrPartnersRouter.post("/csr/partners", async (req: Request, res: Response) => {
  try {
    const { userId, companyName, contactEmail, contactPhone, industryType, employeeCount, annualCSRBudget, primarySdgs, subscriptionTier } = req.body;

    const VALID_TIERS = ["free", "pilot", "starter", "growth", "enterprise"];
    const partner = {
      userId,
      companyName,
      contactEmail,
      contactPhone,
      industryType,
      employeeCount,
      annualCSRBudget,
      primarySdgs: primarySdgs || [],
      rosterSyncStatus: "pending",
      subscriptionTier: VALID_TIERS.includes(subscriptionTier) ? subscriptionTier : "pilot",
    };

    const created = await storage.createCSRPartner?.(partner) || { id: Date.now() };
    res.json(created);
  } catch (err) {
    logger.error("[CSR] Error creating CSR partner", { error: err });
    res.status(500).json({ error: "Failed to create partner" });
  }
});

/**
 * GET /csr/partners
 * Get CSR Partner for current user
 */
csrPartnersRouter.get("/csr/partners", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;
    const userId = authUser.id;

    const allPartners = await storage.listCSRPartners?.() || [];
    const userPartners = allPartners.filter((p: any) => p.userId === userId);

    if (userPartners.length === 0) {
      return res.json(null);
    }

    const partner = userPartners[0];

    // Add user avatar fallback if partner doesn't have logoUrl
    if (!partner.logoUrl) {
      const users = await storage.listUsers?.() || [];
      const partnerUser = users.find((u: any) => u.id === partner.userId);
      if (partnerUser?.avatar) {
        partner.logoUrl = partnerUser.avatar;
      }
    }

    res.json(partner);
  } catch (err) {
    logger.error("[CSR] Error fetching CSR partners", { error: err });
    res.status(500).json({ error: "Failed to fetch partners" });
  }
});

/**
 * GET /csr/partners/list
 * List all CSR Partners for volunteer employer selection
 */
csrPartnersRouter.get("/csr/partners/list", async (req: Request, res: Response) => {
  try {
    const allPartners = await storage.listCSRPartners?.() || [];
    res.json(allPartners);
  } catch (err) {
    logger.error("[CSR] Error fetching CSR partners list", { error: err });
    res.status(500).json({ error: "Failed to fetch partners" });
  }
});

/**
 * PATCH /csr/partners/:id
 * Update a CSR Partner
 */
csrPartnersRouter.patch("/csr/partners/:id", async (req: Request, res: Response) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "Invalid partner ID" });
    }

    const { companyName, contactEmail, contactPhone, industryType, employeeCount, annualCSRBudget, primarySdgs, vtoTrackingEnabled, logo, logoUrl } = req.body;

    const updated = await storage.updateCSRPartner?.(id, {
      companyName,
      contactEmail,
      contactPhone,
      industryType,
      employeeCount,
      annualCSRBudget,
      primarySdgs,
      vtoTrackingEnabled,
      logoUrl: logo || logoUrl
    });

    if (!updated) {
      return res.status(404).json({ error: "CSR Partner not found" });
    }
    res.json(updated);
  } catch (err) {
    logger.error("[CSR] Error updating CSR partner", { error: err });
    res.status(500).json({ error: "Failed to update partner" });
  }
});

/**
 * POST /csr/recognize-employee
 * Employee Recognition - Recognize top performers
 */
csrPartnersRouter.post("/csr/recognize-employee", async (req: Request, res: Response) => {
  try {
    const { employeeId, badge, message, recognizedBy, rewards } = req.body;

    if (!employeeId || !badge || !message || !recognizedBy) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get the user details
    const users = await storage.listUsers?.() || [];
    const employee = users.find((u: any) => u.id === parseInt(employeeId));
    const recognizer = users.find((u: any) => u.id === parseInt(recognizedBy));

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Create recognition record
    const recognition = {
      id: Date.now(),
      employeeId: parseInt(employeeId),
      employeeName: employee.displayName || "Unknown Employee",
      badge,
      message,
      recognizedBy: parseInt(recognizedBy),
      recognizerName: recognizer?.displayName || "CSR Admin",
      rewards: rewards || [],
      createdAt: new Date().toISOString(),
      status: "sent"
    };

    logger.info("[CSR] Recognition created", { recognition });

    res.json({
      success: true,
      recognition,
      message: `Recognition sent to ${employee.displayName || 'the employee'}`
    });
  } catch (err) {
    logger.error("[CSR] Error creating recognition", { error: err });
    res.status(500).json({ error: "Failed to send recognition" });
  }
});

// ==================== VOLUNTEER EMPLOYER LINKING ROUTES ====================

/**
 * POST /volunteer-employers
 * Link volunteer to employer
 */
csrPartnersRouter.post("/volunteer-employers", async (req: Request, res: Response) => {
  try {
    const { volunteerId, partnerId, employeeId, department, jobTitle } = req.body;

    const link = await storage.createVolunteerEmployerLink?.({
      volunteerId,
      partnerId,
      employeeId,
      department,
      jobTitle,
      verificationStatus: "pending"
    });

    res.json(link);
  } catch (err) {
    logger.error("[CSR] Error linking volunteer to employer", { error: err });
    res.status(500).json({ error: "Failed to link employer" });
  }
});

/**
 * GET /volunteer-employers/:volunteerId
 * Get volunteer's employer link
 */
csrPartnersRouter.get("/volunteer-employers/:volunteerId", async (req: Request, res: Response) => {
  try {
    const volunteerId = safeParseInt(req.params.volunteerId);
    if (!volunteerId) {
      return res.status(400).json({ error: "Invalid volunteer ID" });
    }
    const link = await storage.getVolunteerEmployerLink?.(volunteerId);
    res.json(link || null);
  } catch (err) {
    logger.error("[CSR] Error fetching employer link", { error: err });
    res.status(500).json({ error: "Failed to fetch employer" });
  }
});

// ==================== CSR CHALLENGES ROUTES ====================

/**
 * POST /csr/challenges
 * Create a new CSR Challenge
 */
csrPartnersRouter.post("/csr/challenges", async (req: Request, res: Response) => {
  try {
    const { partnerId, title, description, sdgGoal, targetHours, targetParticipants, startDate, endDate, rewardType, rewardValue } = req.body;

    const challenge = {
      partnerId,
      title,
      description,
      sdgGoal,
      targetHours,
      targetParticipants,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      rewardType,
      rewardValue,
      status: "active",
      currentHours: 0,
      currentParticipants: 0
    };

    const created = await storage.createCSRChallenge?.(challenge) || { id: Date.now() };
    res.json(created);
  } catch (err) {
    logger.error("[CSR] Error creating CSR challenge", { error: err });
    res.status(500).json({ error: "Failed to create challenge" });
  }
});

/**
 * GET /csr/challenges
 * List CSR Challenges
 */
csrPartnersRouter.get("/csr/challenges", async (req: Request, res: Response) => {
  try {
    const partnerId = safeParseInt(req.query.partnerId);
    let challenges = await storage.listCSRChallenges?.() || [];

    if (partnerId) {
      challenges = challenges.filter((c: any) => c.partnerId === partnerId);
    }

    res.json(challenges);
  } catch (err) {
    logger.error("[CSR] Error fetching CSR challenges", { error: err });
    res.status(500).json({ error: "Failed to fetch challenges" });
  }
});

// ==================== PROJECT BUDGET LINKS ROUTES ====================

/**
 * POST /csr/budget-links
 * Create a Project Budget Link
 */
csrPartnersRouter.post("/csr/budget-links", async (req: Request, res: Response) => {
  try {
    const { projectId, partnerId, budgetLineItem, allocatedBudget, volunteerHoursValue, attributedTo } = req.body;

    const budgetLink = {
      projectId,
      partnerId,
      budgetLineItem,
      allocatedBudget,
      volunteerHoursValue: volunteerHoursValue || 50,
      attributedTo: attributedTo || [],
      estimatedRoi: allocatedBudget || 0,
      actualRoi: 0
    };

    const created = await storage.createProjectBudgetLink?.(budgetLink) || { id: Date.now() };
    res.json(created);
  } catch (err) {
    logger.error("[CSR] Error creating budget link", { error: err });
    res.status(500).json({ error: "Failed to create budget link" });
  }
});

/**
 * GET /csr/budget-links
 * List Project Budget Links
 */
csrPartnersRouter.get("/csr/budget-links", async (req: Request, res: Response) => {
  try {
    const partnerId = safeParseInt(req.query.partnerId);
    const projectId = safeParseInt(req.query.projectId);
    let budgetLinks = await storage.listProjectBudgetLinks?.() || [];

    if (partnerId) {
      budgetLinks = budgetLinks.filter((b: any) => b.partnerId === partnerId);
    }
    if (projectId) {
      budgetLinks = budgetLinks.filter((b: any) => b.projectId === projectId);
    }

    res.json(budgetLinks);
  } catch (err) {
    logger.error("[CSR] Error fetching budget links", { error: err });
    res.status(500).json({ error: "Failed to fetch budget links" });
  }
});

// ==================== VERIFIED OUTPUTS ROUTES ====================

/**
 * POST /csr/verified-outputs
 * Create a Verified Output
 */
csrPartnersRouter.post("/csr/verified-outputs", async (req: Request, res: Response) => {
  try {
    const { projectId, partnerId, outputType, outputValue, evidence } = req.body;

    const output = {
      projectId,
      partnerId,
      outputType,
      outputValue,
      verificationStatus: "pending",
      evidence: evidence || {},
      auditTrail: [{
        timestamp: new Date(),
        action: "created",
        userId: 0
      }]
    };

    const created = await storage.createVerifiedOutput?.(output) || { id: Date.now() };
    res.json(created);
  } catch (err) {
    logger.error("[CSR] Error creating verified output", { error: err });
    res.status(500).json({ error: "Failed to create verified output" });
  }
});

/**
 * GET /csr/verified-outputs
 * List Verified Outputs
 */
csrPartnersRouter.get("/csr/verified-outputs", async (req: Request, res: Response) => {
  try {
    const partnerId = safeParseInt(req.query.partnerId);
    const projectId = safeParseInt(req.query.projectId);
    let outputs = await storage.listVerifiedOutputs?.() || [];

    if (partnerId) {
      outputs = outputs.filter((o: any) => o.partnerId === partnerId);
    }
    if (projectId) {
      outputs = outputs.filter((o: any) => o.projectId === projectId);
    }

    res.json(outputs);
  } catch (err) {
    logger.error("[CSR] Error fetching verified outputs", { error: err });
    res.status(500).json({ error: "Failed to fetch verified outputs" });
  }
});
