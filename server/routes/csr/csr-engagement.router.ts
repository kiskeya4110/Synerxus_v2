/**
 * CSR Employee Engagement Router
 * Handles employee engagement tracking, commitments, milestones, and CSR goals
 *
 * Routes:
 * - /employee-engagement/summary - Engagement summary for CSR partner
 * - /employee-engagement/log-hours - Log employee hours
 * - /employee-engagement/commitments - Get/create commitments
 * - /employee-engagement/milestones - Create milestones
 * - /employee-engagement/csr-goals - Get/create CSR goals
 * - /employee-engagement/impact-dashboard/:userId - User impact dashboard
 * - /employee-engagement/send-tips - Send engagement tips
 */

import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import {
  insertEmployeeCommitmentSchema,
  insertEmployeeActivityLogSchema,
  insertEmployeeMilestoneSchema,
  insertCSRCommitmentGoalSchema
} from "@shared/schema";
import { calculateVolunteerAIU } from "../../aiu-service";
import {
  safeParseInt,
  safeArray,
  handleValidationError,
  getLinkedEmployeeUserIds,
  getTimeAgo
} from "./csr-utils";
import { authMiddleware } from "../../middleware/auth";
import { getAuthenticatedUser } from "../utils";

export const csrEngagementRouter = Router();

// ==================== EMPLOYEE ENGAGEMENT ROUTES ====================

/**
 * POST /employee-engagement/log-hours
 * Log employee volunteer hours
 */
csrEngagementRouter.post("/employee-engagement/log-hours", async (req: Request, res: Response) => {
  try {
    const data = insertEmployeeActivityLogSchema.parse(req.body);
    const log = await storage.createEmployeeActivityLog?.(data);

    if (!log) {
      return res.status(500).json({ error: "Failed to create activity log" });
    }

    res.json(log);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

/**
 * GET /employee-engagement/commitments
 * Get employee commitments for a CSR partner
 */
csrEngagementRouter.get("/employee-engagement/commitments", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const partnerId = safeParseInt(req.query.partnerId);

    let commitments = await storage.listEmployeeCommitments?.() || [];

    if (partnerId) {
      commitments = commitments.filter((c: any) => c.partnerId === partnerId);
    }
    // Filter to authenticated user's commitments only
    commitments = commitments.filter((c: any) => c.userId === authUser.id);

    res.json(commitments);
  } catch (err) {
    console.error("Error fetching commitments:", err);
    res.status(500).json({ error: "Failed to fetch commitments" });
  }
});

/**
 * POST /employee-engagement/commitments
 * Create a new employee commitment
 */
csrEngagementRouter.post("/employee-engagement/commitments", async (req: Request, res: Response) => {
  try {
    const data = insertEmployeeCommitmentSchema.parse(req.body);
    const commitment = await storage.createEmployeeCommitment?.(data);

    if (!commitment) {
      return res.status(500).json({ error: "Failed to create commitment" });
    }

    res.json(commitment);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

/**
 * POST /employee-engagement/milestones
 * Create a new employee milestone
 */
csrEngagementRouter.post("/employee-engagement/milestones", async (req: Request, res: Response) => {
  try {
    const data = insertEmployeeMilestoneSchema.parse(req.body);
    const milestone = await storage.createEmployeeMilestone?.(data);

    if (!milestone) {
      return res.status(500).json({ error: "Failed to create milestone" });
    }

    res.json(milestone);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

/**
 * GET /employee-engagement/csr-goals
 * Get CSR commitment goals for a partner
 */
csrEngagementRouter.get("/employee-engagement/csr-goals", async (req: Request, res: Response) => {
  try {
    const partnerId = safeParseInt(req.query.partnerId);
    let goals = await storage.listCSRCommitmentGoals?.() || [];

    if (partnerId) {
      goals = goals.filter((g: any) => g.partnerId === partnerId);
    }

    res.json(goals);
  } catch (err) {
    console.error("Error fetching CSR goals:", err);
    res.status(500).json({ error: "Failed to fetch CSR goals" });
  }
});

/**
 * POST /employee-engagement/csr-goals
 * Create a new CSR commitment goal
 */
csrEngagementRouter.post("/employee-engagement/csr-goals", async (req: Request, res: Response) => {
  try {
    const data = insertCSRCommitmentGoalSchema.parse(req.body);
    const goal = await storage.createCSRCommitmentGoal?.(data);

    if (!goal) {
      return res.status(500).json({ error: "Failed to create CSR goal" });
    }

    res.json(goal);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

/**
 * GET /employee-engagement/impact-dashboard/:userId
 * Get employee impact dashboard data
 */
csrEngagementRouter.get("/employee-engagement/impact-dashboard/:userId", async (req: Request, res: Response) => {
  try {
    const userId = safeParseInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Get volunteer activities for this user
    const activities = await storage.listVolunteerActivitiesByUser?.(userId) || [];

    // Calculate impact metrics
    const totalHours = activities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
    const projectIds = new Set(activities.map((a: any) => a.projectId).filter(Boolean));
    const projectsContributed = projectIds.size;

    // Get AIU data
    let aiuData = null;
    try {
      aiuData = await calculateVolunteerAIU(userId);
    } catch (err) {
      console.error("Error calculating volunteer AIU:", err);
    }

    // Get recent activities
    const recentActivities = activities
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((a: any) => ({
        id: a.id,
        date: a.date,
        hours: a.hours,
        description: a.description,
        projectId: a.projectId,
        verificationStatus: a.verificationStatus,
        timeAgo: getTimeAgo(new Date(a.date))
      }));

    res.json({
      userId,
      totalHours,
      projectsContributed,
      totalAiu: aiuData?.totalAiu || 0,
      sdgsContributed: aiuData?.sdgsContributed || [],
      recentActivities,
      monthlyBreakdown: [], // Would need more complex calculation
      impactScore: Math.round(totalHours * 3.5)
    });
  } catch (err) {
    console.error("Error fetching impact dashboard:", err);
    res.status(500).json({ error: "Failed to fetch impact dashboard" });
  }
});

/**
 * POST /employee-engagement/send-tips
 * Send engagement tips to employees
 */
csrEngagementRouter.post("/employee-engagement/send-tips", async (req: Request, res: Response) => {
  try {
    const { partnerId, tipType, recipients, message } = req.body;

    if (!partnerId || !tipType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // In production, this would send emails/notifications to employees
    console.log(`Sending ${tipType} tips to partner ${partnerId}:`, { recipients, message });

    res.json({
      success: true,
      message: `Tips sent to ${recipients?.length || 'all'} employees`
    });
  } catch (err) {
    console.error("Error sending tips:", err);
    res.status(500).json({ error: "Failed to send tips" });
  }
});
