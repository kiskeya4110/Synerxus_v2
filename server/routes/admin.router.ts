import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { extractUserId } from "./utils";
import { sendWeeklyDigest, sendWeeklyDigestsToAll, sendOrganizationWeeklyDigest } from "../email-digest-service";
import OpenAI from "openai";
import { queueMiddleware } from "../request-queue";
import { db } from "../db";
import { volunteerActivities, organizations, employeeEngagement, projects } from "@shared/schema";

export const adminRouter = Router();

// ===== USER ACCOUNT MANAGEMENT =====

/**
 * DELETE /users/me
 * Delete user account and all associated data
 * Note: The actual user deletion happens in Firebase on the frontend
 * This route serves as a placeholder for backend data cleanup
 */
adminRouter.delete("/users/me", async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await storage.deleteUserAndData(userId);

    res.json({
      message: "Account and all associated data deleted successfully",
      success: true,
      ...result
    });
  } catch (err) {
    console.error("Error deleting user account:", err);
    res.status(500).json({ message: "Failed to delete account" });
  }
});

// ===== USER DATA VALIDATION ROUTES =====

/**
 * GET /user-validation/:userId
 * Validate user data consistency across tables
 * Users can only validate their own data
 * Checks for name mismatches, missing profiles, etc.
 */
adminRouter.get("/user-validation/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Authorization: Users can only validate their own data
    const authenticatedUserId = extractUserId(req);
    if (!authenticatedUserId || authenticatedUserId !== userId) {
      return res.status(403).json({ message: "You can only validate your own data" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const discrepancies: any[] = [];

    // Check volunteer profile name consistency
    if (user.userType === 'volunteer') {
      const volunteerProfile = await storage.getVolunteerProfileByUserId(userId);
      if (volunteerProfile) {
        const userName = (user.displayName || '').trim().toLowerCase();
        const profileName = (volunteerProfile.volunteerName || '').trim().toLowerCase();

        if (userName && profileName && userName !== profileName) {
          discrepancies.push({
            type: 'name_mismatch',
            field: 'displayName',
            userValue: user.displayName,
            profileValue: volunteerProfile.volunteerName,
            severity: 'warning',
            message: `User display name "${user.displayName}" differs from profile name "${volunteerProfile.volunteerName}"`
          });

          // Log the discrepancy
          await storage.createUserDataAuditLog({
            userId,
            action: 'validation_check',
            tableName: 'volunteer_profiles',
            recordId: volunteerProfile.id,
            previousData: { displayName: user.displayName },
            newData: { volunteerName: volunteerProfile.volunteerName },
            discrepancyType: 'name_mismatch',
            discrepancyDetails: `Name mismatch: "${user.displayName}" vs "${volunteerProfile.volunteerName}"`,
            resolvedAt: null,
            resolvedBy: null,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null
          });
        }
      } else {
        discrepancies.push({
          type: 'missing_profile',
          field: 'volunteerProfile',
          severity: 'warning',
          message: 'Volunteer user is missing their volunteer profile'
        });
      }
    }

    // Check organization profile consistency
    if (user.userType === 'organization' && user.organizationId) {
      const orgProfile = await storage.getOrganizationProfileByOrgId(user.organizationId);
      if (!orgProfile) {
        discrepancies.push({
          type: 'missing_profile',
          field: 'organizationProfile',
          severity: 'warning',
          message: 'Organization user is missing their organization profile'
        });
      }
    }

    res.json({
      userId,
      isValid: discrepancies.filter(d => d.severity === 'error').length === 0,
      discrepancies,
      checkedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Error validating user data:", err);
    res.status(500).json({ message: "Failed to validate user data" });
  }
});

/**
 * POST /user-validation/:userId/sync-name
 * Sync user display name across all related tables
 * Users can only sync their own data
 * Updates users table and volunteer_profiles table with the new name
 */
adminRouter.post("/user-validation/:userId/sync-name", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { displayName } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Authorization: Users can only sync their own data
    const authenticatedUserId = extractUserId(req);
    if (!authenticatedUserId || authenticatedUserId !== userId) {
      return res.status(403).json({ message: "You can only update your own data" });
    }

    if (!displayName || typeof displayName !== 'string') {
      return res.status(400).json({ message: "displayName is required" });
    }

    // Validate name format
    const trimmedName = displayName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ message: "Name must be between 2 and 100 characters" });
    }

    const nameRegex = /^[a-zA-Z\s\-'.]+$/;
    if (!nameRegex.test(trimmedName)) {
      return res.status(400).json({ message: "Name contains invalid characters" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const previousDisplayName = user.displayName;

    // Update user display name
    await storage.updateUser(userId, { displayName: trimmedName });

    // Log the change
    await storage.createUserDataAuditLog({
      userId,
      action: 'update',
      tableName: 'users',
      recordId: userId,
      previousData: { displayName: previousDisplayName },
      newData: { displayName: trimmedName },
      discrepancyType: null,
      discrepancyDetails: null,
      resolvedAt: null,
      resolvedBy: null,
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null
    });

    // Sync to volunteer profile if applicable
    if (user.userType === 'volunteer') {
      const volunteerProfile = await storage.getVolunteerProfileByUserId(userId);
      if (volunteerProfile) {
        const previousVolunteerName = volunteerProfile.volunteerName;
        await storage.updateVolunteerProfile(volunteerProfile.id, { volunteerName: trimmedName });

        await storage.createUserDataAuditLog({
          userId,
          action: 'data_sync',
          tableName: 'volunteer_profiles',
          recordId: volunteerProfile.id,
          previousData: { volunteerName: previousVolunteerName },
          newData: { volunteerName: trimmedName },
          discrepancyType: null,
          discrepancyDetails: 'Synced volunteer profile name to match user display name',
          resolvedAt: null,
          resolvedBy: null,
          ipAddress: req.ip || null,
          userAgent: req.get('user-agent') || null
        });
      }
    }

    res.json({
      success: true,
      message: 'Name synced successfully across all profiles',
      userId,
      displayName: trimmedName
    });
  } catch (err) {
    console.error("Error syncing user name:", err);
    res.status(500).json({ message: "Failed to sync user name" });
  }
});

/**
 * GET /user-validation/:userId/audit-logs
 * Get user data audit logs
 * Users can only view their own audit logs
 * Returns a history of all data changes and validations
 */
adminRouter.get("/user-validation/:userId/audit-logs", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Authorization: Users can only view their own audit logs
    const authenticatedUserId = extractUserId(req);
    if (!authenticatedUserId || authenticatedUserId !== userId) {
      return res.status(403).json({ message: "You can only view your own audit logs" });
    }

    const auditLogs = await storage.getUserDataAuditLogs(userId);
    res.json(auditLogs);
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
});

/**
 * GET /user-validation/discrepancies/unresolved
 * Get unresolved data discrepancies for the authenticated user
 * Users can only view their own discrepancies
 * Returns validation issues that need to be addressed
 */
adminRouter.get("/user-validation/discrepancies/unresolved", async (req: Request, res: Response) => {
  try {
    // Authorization: Require user ID and validate ownership
    const authenticatedUserId = extractUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Users can only fetch their own discrepancies
    const discrepancies = await storage.getUnresolvedDiscrepancies(authenticatedUserId);
    res.json(discrepancies);
  } catch (err) {
    console.error("Error fetching unresolved discrepancies:", err);
    res.status(500).json({ message: "Failed to fetch unresolved discrepancies" });
  }
});

/**
 * POST /user-validation/discrepancies/:id/resolve
 * Resolve a data discrepancy
 * Users can only resolve their own discrepancies
 * Marks the discrepancy as resolved in the system
 */
adminRouter.post("/user-validation/discrepancies/:id/resolve", async (req: Request, res: Response) => {
  try {
    const discrepancyId = parseInt(req.params.id);

    if (isNaN(discrepancyId)) {
      return res.status(400).json({ message: "Invalid discrepancy ID" });
    }

    // Authorization: Get authenticated user
    const authenticatedUserId = extractUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify the discrepancy belongs to the authenticated user
    const discrepancy = await storage.getDiscrepancyById(discrepancyId);
    if (!discrepancy) {
      return res.status(404).json({ message: "Discrepancy not found" });
    }

    if (discrepancy.userId !== authenticatedUserId) {
      return res.status(403).json({ message: "You can only resolve your own discrepancies" });
    }

    const resolved = await storage.resolveDiscrepancy(discrepancyId, authenticatedUserId);

    if (!resolved) {
      return res.status(404).json({ message: "Discrepancy not found" });
    }

    res.json(resolved);
  } catch (err) {
    console.error("Error resolving discrepancy:", err);
    res.status(500).json({ message: "Failed to resolve discrepancy" });
  }
});

// ===== AI-POWERED IMPACT REPORT GENERATION =====

/**
 * Helper: Deduplicate and aggregate metrics from stories
 * Removes repeated metrics and aggregates similar values
 */
function deduplicateMetrics(text: string): string {
  if (!text) return "";

  const metricMap = new Map<string, number>();

  // Pattern to find metrics like "X increased by Y (percentage%)" or just "X: Y"
  const metricPattern = /([A-Za-z\s]+?)\s+(?:increased\s+)?(?:by\s+)?(\d+)/gi;
  let match;

  while ((match = metricPattern.exec(text)) !== null) {
    const metricName = match[1].toLowerCase().trim();
    const value = parseInt(match[2]);

    // Aggregate - sum duplicate metrics
    metricMap.set(metricName, (metricMap.get(metricName) || 0) + value);
  }

  // Rebuild the text without duplicates
  let cleanText = text;
  metricMap.forEach((total, metric) => {
    // Remove all occurrences of this metric
    const pattern = new RegExp(`${metric}\\s+(?:increased\\s+)?(?:by\\s+)?\\d+[^,\\.]*`, 'gi');
    cleanText = cleanText.replace(pattern, '');
  });

  // Add aggregated metrics once
  let aggregatedMetrics = "";
  metricMap.forEach((total, metric) => {
    aggregatedMetrics += `${metric} (${total}), `;
  });

  // Clean up the text and append aggregated metrics
  cleanText = cleanText.replace(/\s{2,}/g, ' ').trim();
  if (aggregatedMetrics) {
    cleanText = cleanText + "\n\nKey Impact Metrics: " + aggregatedMetrics.slice(0, -2);
  }

  return cleanText;
}

/**
 * POST /generate-impact-report
 * AI-Powered Impact Report Generation
 * Generates professional impact reports using OpenAI
 * Accepts project details, metrics, and preferences
 * Returns a formatted report ready for stakeholders
 */
adminRouter.post("/generate-impact-report", queueMiddleware('heavy'), async (req: Request, res: Response) => {
  try {
    const {
      projectTitle,
      reportingPeriod,
      locationsServed,
      keyStories,
      csrAlignment,
      targetAudience,
      tone,
      impactFocus,
      organizationName,
      metrics,
      storyType, // "short" for brief organization stories, "full" for detailed reports
      reportType, // "volunteer" | "organization" | "csr"
    } = req.body;

    if (!projectTitle || !reportingPeriod) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    try {
      // DEDUPLICATE the keyStories to remove repeated metrics
      const cleanStories = deduplicateMetrics(keyStories);

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      // Extract aggregated totals from metrics
      const volunteerCount = metrics?.activeVolunteers || metrics?.totalVolunteers || 0;
      const totalHours = metrics?.totalHours || 0;
      const projectCount = metrics?.activeProjects || metrics?.projectCount || 0;
      const beneficiaryTotal = metrics?.totalBeneficiariesReached || metrics?.peopleImpacted || 0;
      const sdgsAddressed = metrics?.sdgsAddressed || 0;
      const skills = metrics?.skills || "";

      // Generate short, dynamic organization impact story
      if (storyType === "short" && reportType === "organization") {
        const todayDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        const shortSystemPrompt = `You are an expert at crafting brief, impactful stories for nonprofit organizations. Write a SHORT 2-3 sentence impact story that is:
- Concise and punchy (max 50 words)
- Uses ONLY the metrics provided (skip any that are 0)
- Focuses on human impact and outcomes
- Written for the specific organization (not Synerxus platform)
- Dynamic - adapts to whatever metrics are available
- No headers, bullet points, or formatting - just flowing prose
- IMPORTANT: Today's date is ${todayDate} - use current/recent timeframes, not outdated dates`;

        // Build dynamic metric context (only include non-zero values)
        const availableMetrics: string[] = [];
        if (totalHours > 0) availableMetrics.push(`${totalHours.toLocaleString()} volunteer hours`);
        if (beneficiaryTotal > 0) availableMetrics.push(`${beneficiaryTotal.toLocaleString()} lives impacted`);
        if (projectCount > 0) availableMetrics.push(`${projectCount} projects`);
        if (volunteerCount > 0) availableMetrics.push(`${volunteerCount} volunteers`);
        if (sdgsAddressed > 0) availableMetrics.push(`${sdgsAddressed} SDGs addressed`);

        const shortUserPrompt = `Write a brief 2-3 sentence impact story for ${organizationName || "this organization"} during ${reportingPeriod}.

Available metrics (use only what's relevant, skip zeros):
${availableMetrics.length > 0 ? availableMetrics.join(", ") : "No metrics available yet"}
${csrAlignment ? `\nSDG Focus: ${csrAlignment}` : ""}
${skills ? `\nKey skills: ${skills}` : ""}

Write a short, compelling story that highlights the organization's real impact. Be specific but concise. Focus on outcomes and people helped.`;

        const shortCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: shortSystemPrompt },
            { role: "user", content: shortUserPrompt },
          ],
          temperature: 0.7,
          max_tokens: 150,
        });

        const shortStory = shortCompletion.choices[0]?.message?.content;
        if (!shortStory) {
          return res.status(500).json({ message: "Failed to generate story" });
        }

        return res.json({
          report: shortStory.trim(),
          generatedAt: new Date().toISOString(),
          success: true,
        });
      }

      // Full report generation (existing logic)
      const currentDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const isVolunteerReport = reportType === "volunteer";

      const systemPrompt = `You are an expert impact report writer for nonprofit organizations and volunteers. Create compelling, funder-ready impact reports that are well-structured, data-driven, and emotionally resonant.

TODAY'S DATE: ${currentDate}
REPORT TYPE: ${isVolunteerReport ? "Individual Volunteer Impact Report" : "Organization Impact Report"}

MANDATORY RULES - NON-NEGOTIABLE:
- USE THE CURRENT DATE PROVIDED ABOVE - Never use outdated dates like "October 2023"
- The report date MUST be ${currentDate}
- EACH METRIC APPEARS EXACTLY ONCE - NO EXCEPTIONS
- NEVER list the same metric multiple times
- SUM all similar metrics into a single total (not separate line items)
- For volunteer reports: Focus on the individual's personal contribution and impact
- Format as a professional, compelling narrative`;

      const reportSubject = isVolunteerReport
        ? (projectTitle || "Volunteer's Impact Report")
        : (organizationName || "the organization");

      const userPrompt = `Generate a professional Impact Report for ${reportSubject} with ZERO metric duplication:

REPORT DATE: ${currentDate} (USE THIS DATE - NOT ANY OTHER DATE)
REPORT TYPE: ${isVolunteerReport ? "Individual Volunteer" : "Organization"}
${isVolunteerReport ? `VOLUNTEER: ${projectTitle?.replace("'s Impact", "") || "Volunteer"}` : `ORGANIZATION: ${organizationName}`}
PROJECT/TITLE: ${projectTitle}
REPORTING PERIOD: ${reportingPeriod}
LOCATIONS: ${locationsServed}

MASTER METRICS (these are the ONLY numbers to reference, each once):
${isVolunteerReport ? `- Hours Contributed: ${totalHours}` : `- Volunteers: ${volunteerCount}\n- Hours: ${totalHours}`}
- Projects: ${projectCount}
- Total People Impacted: ${beneficiaryTotal}
${sdgsAddressed > 0 ? `- SDGs Addressed: ${sdgsAddressed}` : ""}
${skills ? `- Skills Applied: ${skills}` : ""}

IMPACT STORY (already deduplicated):
${cleanStories}

CSR/ESG: ${csrAlignment}

Target: ${targetAudience} | Tone: ${tone} | Focus: ${impactFocus}

REPORT FORMAT:
1. Header (${isVolunteerReport ? "Volunteer Name" : "Organization"}, Date: ${currentDate})
2. Executive Summary (use the master metrics ONCE each)
3. Key Achievements (reference master metrics, no duplication)
4. Impact Story (from deduplicated story above)
5. CSR/ESG Alignment
6. Next Steps

CRITICAL REMINDERS:
- Report Date MUST be: ${currentDate}
- If you reference any metric, it must ONLY appear once in the entire report
- For volunteer reports, celebrate personal contribution and growth`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 2500,
      });

      const reportContent = completion.choices[0]?.message?.content;
      if (!reportContent) {
        return res.status(500).json({ message: "Failed to generate report content" });
      }

      return res.json({
        report: reportContent,
        generatedAt: new Date().toISOString(),
        success: true,
      });
    } catch (openaiErr: any) {
      console.error("OpenAI API Error:", openaiErr.message || openaiErr);
      return res.status(503).json({
        message: "OpenAI service unavailable. Check API key configuration.",
        error: openaiErr.message
      });
    }
  } catch (err) {
    console.error("Error generating impact report:", err);
    res.status(500).json({ message: "Failed to generate impact report" });
  }
});

// ===== EMAIL DIGEST ROUTES =====

/**
 * POST /email-digest/send
 * Send weekly digest email to authenticated user
 * Requires authentication
 */
adminRouter.post("/email-digest/send", queueMiddleware('heavy'), async (req: Request, res: Response) => {
  try {
    const userId = await extractUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const success = await sendWeeklyDigest(userId);
    if (success) {
      return res.json({
        message: "Weekly digest sent successfully",
        success: true
      });
    } else {
      return res.status(500).json({
        message: "Failed to send email digest",
        success: false
      });
    }
  } catch (err) {
    console.error("Error sending email digest:", err);
    res.status(500).json({ message: "Error sending email digest" });
  }
});

/**
 * POST /email-digest/send-all
 * Send weekly digests to all users
 * Only organization managers can use this endpoint
 */
adminRouter.post("/email-digest/send-all", queueMiddleware('heavy'), async (req: Request, res: Response) => {
  try {
    const userId = await extractUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user || user.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization managers can use this endpoint" });
    }

    const result = await sendWeeklyDigestsToAll();
    return res.json({
      message: "Weekly digests sent",
      ...result
    });
  } catch (err) {
    console.error("Error sending all digests:", err);
    res.status(500).json({ message: "Error sending digests" });
  }
});

/**
 * POST /email-digest/organization/:organizationId
 * Send weekly digest to an organization
 * Users can only send digests for their own organization
 */
adminRouter.post("/email-digest/organization/:organizationId", queueMiddleware('heavy'), async (req: Request, res: Response) => {
  try {
    const userId = await extractUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user || user.organizationId?.toString() !== req.params.organizationId) {
      return res.status(403).json({ message: "You can only send digests for your own organization" });
    }

    const success = await sendOrganizationWeeklyDigest(parseInt(req.params.organizationId));
    if (success) {
      return res.json({
        message: "Organization digest sent successfully",
        success: true
      });
    } else {
      return res.status(500).json({
        message: "Failed to send organization digest",
        success: false
      });
    }
  } catch (err) {
    console.error("Error sending org digest:", err);
    res.status(500).json({ message: "Error sending digest" });
  }
});

/**
 * PATCH /email-digest/preferences/volunteer
 * Toggle email digest preference for volunteers
 * Enables or disables weekly digest emails
 */
adminRouter.patch("/email-digest/preferences/volunteer", async (req: Request, res: Response) => {
  try {
    const userId = await extractUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { enabled } = req.body;
    const profile = await storage.updateVolunteerProfile(userId, { emailDigestEnabled: enabled });

    if (!profile) {
      return res.status(404).json({ message: "Volunteer profile not found" });
    }

    res.json({
      message: `Email digests ${enabled ? "enabled" : "disabled"}`,
      emailDigestEnabled: profile.emailDigestEnabled,
      success: true
    });
  } catch (err) {
    console.error("Error toggling volunteer digest preference:", err);
    res.status(500).json({ message: "Error updating digest preference" });
  }
});

/**
 * PATCH /email-digest/preferences/organization
 * Toggle email digest preference for organizations
 * Only organization managers can use this endpoint
 */
adminRouter.patch("/email-digest/preferences/organization", async (req: Request, res: Response) => {
  try {
    const userId = await extractUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user || user.userType !== 'organization' || !user.organizationId) {
      return res.status(403).json({ message: "Only organization managers can use this endpoint" });
    }

    const { enabled } = req.body;
    const profile = await storage.updateOrganizationProfile(user.organizationId, { emailDigestEnabled: enabled });

    if (!profile) {
      return res.status(404).json({ message: "Organization profile not found" });
    }

    res.json({
      message: `Email digests ${enabled ? "enabled" : "disabled"}`,
      emailDigestEnabled: profile.emailDigestEnabled,
      success: true
    });
  } catch (err) {
    console.error("Error toggling organization digest preference:", err);
    res.status(500).json({ message: "Error updating digest preference" });
  }
});

// ===== ORGANIZATION APPROVAL MANAGEMENT =====

/**
 * GET /organizations
 * Get all organizations for admin review
 * Only platform admins can access this endpoint
 */
adminRouter.get("/organizations", async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if user is a platform admin
    const user = await storage.getUser(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Get all organizations
    const organizations = await storage.listOrganizations();
    res.json(organizations);
  } catch (err) {
    console.error("Error fetching organizations for admin:", err);
    res.status(500).json({ message: "Failed to fetch organizations" });
  }
});

/**
 * POST /organizations/:orgId/approval
 * Approve or reject an organization
 * Only platform admins can access this endpoint
 */
adminRouter.post("/organizations/:orgId/approval", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { userId, status, notes } = req.body;

    if (isNaN(orgId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if user is a platform admin
    const user = await storage.getUser(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
    }

    // Update organization approval status
    const updated = await storage.updateOrganization(orgId, {
      approvalStatus: status,
      approvalNotes: notes || null,
      approvedBy: userId,
      approvedAt: new Date(),
    });

    if (!updated) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // TODO: Send notification to organization about approval/rejection

    res.json({
      success: true,
      message: `Organization ${status}`,
      organization: updated,
    });
  } catch (err) {
    console.error("Error updating organization approval:", err);
    res.status(500).json({ message: "Failed to update organization approval" });
  }
});

// ===== VOLUNTEER-EMPLOYER LINKING UTILITIES =====

/**
 * GET /admin/diagnose-volunteer-employer
 * Diagnose volunteer-employer linking issues
 * Query params:
 *   - volunteerName: Name to search for (partial match)
 *   - volunteerEmail: Email to search for
 *   - employerName: Employer/CSR partner name to search for
 */
adminRouter.get("/admin/diagnose-volunteer-employer", async (req: Request, res: Response) => {
  try {
    const { volunteerName, volunteerEmail, employerName } = req.query;

    const users = await storage.listUsers();
    const volunteerProfiles = await storage.listVolunteerProfiles();
    const csrPartners = await storage.listCSRPartners?.() || [];
    const employerLinks = await storage.listVolunteerEmployerLinks?.() || [];
    const activities = await storage.listVolunteerActivities();
    const engagements = await storage.listEmployeeEngagement?.() || [];

    // Find volunteer
    let matchedUsers: any[] = [];
    let matchedProfiles: any[] = [];

    if (volunteerName) {
      const searchName = (volunteerName as string).toLowerCase();
      matchedUsers = users.filter((u: any) =>
        u.displayName?.toLowerCase().includes(searchName) ||
        u.email?.toLowerCase().includes(searchName)
      );
      matchedProfiles = volunteerProfiles.filter((vp: any) =>
        vp.volunteerName?.toLowerCase().includes(searchName)
      );
    }

    if (volunteerEmail) {
      const searchEmail = (volunteerEmail as string).toLowerCase();
      matchedUsers = users.filter((u: any) =>
        u.email?.toLowerCase() === searchEmail
      );
    }

    // Find employer
    let matchedEmployers: any[] = [];
    if (employerName) {
      const searchEmployer = (employerName as string).toLowerCase();
      matchedEmployers = csrPartners.filter((p: any) =>
        p.companyName?.toLowerCase().includes(searchEmployer)
      );
    }

    // Compile diagnostic info
    const diagnostics: any[] = [];

    for (const user of matchedUsers) {
      const profile = volunteerProfiles.find((vp: any) => vp.userId === user.id);
      const userActivities = activities.filter((a: any) => a.userId === user.id);
      const approvedActivities = userActivities.filter((a: any) =>
        a.verificationStatus?.toLowerCase() === 'approved' ||
        a.verificationStatus?.toLowerCase() === 'verified'
      );

      // Check employer linkage
      let linkedEmployers: any[] = [];

      // Method 1: Direct link via employerId
      if (profile?.employerId) {
        const employer = csrPartners.find((p: any) => p.id === profile.employerId);
        if (employer) {
          linkedEmployers.push({
            method: 'volunteerProfile.employerId',
            partnerId: profile.employerId,
            companyName: employer.companyName,
            status: 'active'
          });
        }
      }

      // Method 2: Via volunteerEmployerLinks
      if (profile?.id) {
        const links = employerLinks.filter((l: any) => l.volunteerId === profile.id);
        links.forEach((link: any) => {
          const employer = csrPartners.find((p: any) => p.id === link.partnerId);
          linkedEmployers.push({
            method: 'volunteerEmployerLinks',
            partnerId: link.partnerId,
            companyName: employer?.companyName || 'Unknown',
            status: link.verificationStatus,
            linkId: link.id
          });
        });
      }

      // Check engagement records
      const userEngagements = engagements.filter((e: any) =>
        e.employeeEmail?.toLowerCase() === user.email?.toLowerCase()
      );

      diagnostics.push({
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          userType: user.userType
        },
        volunteerProfile: profile ? {
          id: profile.id,
          volunteerName: profile.volunteerName,
          employerId: profile.employerId,
          departmentName: profile.departmentName
        } : null,
        linkedEmployers,
        activities: {
          total: userActivities.length,
          approved: approvedActivities.length,
          totalHours: approvedActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0)
        },
        engagementRecords: userEngagements.map((e: any) => ({
          partnerId: e.partnerId,
          companyName: csrPartners.find((p: any) => p.id === e.partnerId)?.companyName,
          hoursVolunteered: e.hoursVolunteered
        })),
        issues: []
      });

      // Identify issues
      const diag = diagnostics[diagnostics.length - 1];
      if (!profile) {
        diag.issues.push('No volunteer profile found');
      }
      if (linkedEmployers.length === 0) {
        diag.issues.push('Not linked to any employer');
      }
      if (approvedActivities.length > 0 && userEngagements.length === 0) {
        diag.issues.push('Has approved activities but no engagement records - data not flowing to employer');
      }
    }

    res.json({
      matchedEmployers: matchedEmployers.map((p: any) => ({
        id: p.id,
        companyName: p.companyName,
        employeeCount: p.employeeCount
      })),
      diagnostics
    });
  } catch (err) {
    console.error("Error diagnosing volunteer-employer link:", err);
    res.status(500).json({ message: "Failed to diagnose volunteer-employer link" });
  }
});

/**
 * POST /admin/link-volunteer-employer
 * Link a volunteer to an employer (CSR partner)
 * Body:
 *   - volunteerId: Volunteer profile ID
 *   - partnerId: CSR partner ID
 *   - method: 'profile' (set employerId) or 'link' (create volunteerEmployerLink)
 */
adminRouter.post("/admin/link-volunteer-employer", async (req: Request, res: Response) => {
  try {
    const { volunteerId, userId, partnerId, method = 'profile' } = req.body;

    if (!partnerId) {
      return res.status(400).json({ message: "partnerId is required" });
    }

    // Find the volunteer profile
    let profile;
    if (volunteerId) {
      profile = await storage.getVolunteerProfile(volunteerId);
    } else if (userId) {
      profile = await storage.getVolunteerProfileByUserId(userId);
    }

    if (!profile) {
      return res.status(404).json({ message: "Volunteer profile not found" });
    }

    // Verify CSR partner exists
    const csrPartners = await storage.listCSRPartners?.() || [];
    const partner = csrPartners.find((p: any) => p.id === partnerId);
    if (!partner) {
      return res.status(404).json({ message: "CSR partner not found" });
    }

    if (method === 'profile') {
      // Method 1: Update volunteerProfile.employerId
      await storage.updateVolunteerProfile(profile.id, {
        employerId: partnerId
      });

      res.json({
        success: true,
        message: `Volunteer ${profile.volunteerName || profile.id} linked to ${partner.companyName} via profile.employerId`,
        profile: { id: profile.id, employerId: partnerId }
      });
    } else if (method === 'link') {
      // Method 2: Create volunteerEmployerLink
      const newLink = await storage.createVolunteerEmployerLink?.({
        volunteerId: profile.id,
        partnerId: partnerId,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      });

      res.json({
        success: true,
        message: `Volunteer ${profile.volunteerName || profile.id} linked to ${partner.companyName} via volunteerEmployerLinks`,
        link: newLink
      });
    } else {
      return res.status(400).json({ message: "Invalid method. Use 'profile' or 'link'" });
    }
  } catch (err) {
    console.error("Error linking volunteer to employer:", err);
    res.status(500).json({ message: "Failed to link volunteer to employer" });
  }
});

/**
 * POST /admin/backfill-employer-engagement
 * Backfill employee engagement records for approved activities
 * This fixes data for volunteers whose activities were approved before they were linked to an employer
 * Body:
 *   - userId: User ID to backfill (optional - if not provided, backfills all)
 *   - partnerId: Only backfill for this employer (optional)
 */
adminRouter.post("/admin/backfill-employer-engagement", queueMiddleware('heavy'), async (req: Request, res: Response) => {
  try {
    const { userId, partnerId } = req.body;

    const users = await storage.listUsers();
    const volunteerProfiles = await storage.listVolunteerProfiles();
    const activities = await storage.listVolunteerActivities();
    const employerLinks = await storage.listVolunteerEmployerLinks?.() || [];
    const engagements = await storage.listEmployeeEngagement?.() || [];
    const csrPartners = await storage.listCSRPartners?.() || [];

    let backfillCount = 0;
    const results: any[] = [];

    // Filter users if userId provided
    const targetUsers = userId
      ? users.filter((u: any) => u.id === userId)
      : users;

    for (const user of targetUsers) {
      const profile = volunteerProfiles.find((vp: any) => vp.userId === user.id);
      if (!profile) continue;

      // Get linked employer IDs (both methods)
      // Use Number() conversion to handle string/number type mismatches from database
      const linkedEmployerIds = new Set<number>();

      if (profile.employerId) {
        linkedEmployerIds.add(Number(profile.employerId));
      }

      const profileLinks = employerLinks.filter((l: any) =>
        l.volunteerId === profile.id && l.verificationStatus !== 'rejected'
      );
      profileLinks.forEach((link: any) => {
        if (link.partnerId) linkedEmployerIds.add(Number(link.partnerId));
      });

      if (linkedEmployerIds.size === 0) continue;

      // Filter by partnerId if specified
      const targetEmployers = partnerId
        ? Array.from(linkedEmployerIds).filter(id => id === partnerId)
        : Array.from(linkedEmployerIds);

      if (targetEmployers.length === 0) continue;

      // Get approved activities
      const approvedActivities = activities.filter((a: any) =>
        a.userId === user.id &&
        (a.verificationStatus?.toLowerCase() === 'approved' ||
         a.verificationStatus?.toLowerCase() === 'verified')
      );

      if (approvedActivities.length === 0) continue;

      const totalHours = approvedActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);

      for (const employerId of targetEmployers) {
        // Check existing engagement
        const existing = engagements.find((e: any) =>
          e.partnerId === employerId && e.employeeEmail === user.email
        );

        const partner = csrPartners.find((p: any) => p.id === employerId);

        if (existing) {
          // Update if hours are different
          if (existing.hoursVolunteered !== totalHours) {
            await storage.updateEmployeeEngagement(existing.id, {
              hoursVolunteered: totalHours
            });
            results.push({
              user: user.displayName || user.email,
              employer: partner?.companyName || employerId,
              action: 'updated',
              previousHours: existing.hoursVolunteered,
              newHours: totalHours
            });
            backfillCount++;
          }
        } else {
          // Create new engagement record
          await storage.createEmployeeEngagement({
            partnerId: employerId,
            employeeEmail: user.email,
            employeeName: profile.volunteerName || user.displayName,
            hoursVolunteered: totalHours,
            engagementType: 'vto'
          });
          results.push({
            user: user.displayName || user.email,
            employer: partner?.companyName || employerId,
            action: 'created',
            hours: totalHours
          });
          backfillCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `Backfilled ${backfillCount} employee engagement records`,
      results
    });
  } catch (err) {
    console.error("Error backfilling employer engagement:", err);
    res.status(500).json({ message: "Failed to backfill employer engagement" });
  }
});

// ===== PHASE 4: PRE-FILLED NGO ACCOUNTS + DRAFT PROJECTS =====

/**
 * POST /admin/create-ngo-account
 * Create a pre-filled NGO account from discovery call notes
 * Only platform admins can use this endpoint
 * Creates: organization + user + organization member records
 */
adminRouter.post("/admin/create-ngo-account", async (req: Request, res: Response) => {
  try {
    const adminUserId = extractUserId(req);
    if (!adminUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const adminUser = await storage.getUser(adminUserId);
    if (!adminUser?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const {
      orgName,
      contactName,
      contactEmail,
      tempPassword,
      country,
      city,
      sdgFocus,
      outcomeTypes,
      description
    } = req.body;

    if (!orgName || !contactName || !contactEmail) {
      return res.status(400).json({ message: "orgName, contactName, and contactEmail are required" });
    }

    // 1. Create the organization
    const org = await storage.createOrganization({
      name: orgName,
      description: description || `${orgName} - Created via admin onboarding`,
      contactEmail: contactEmail,
      country: country || null,
      city: city || null,
      primarySdgs: Array.isArray(sdgFocus) ? sdgFocus : [],
      approvalStatus: 'approved',
      approvedBy: adminUserId,
      approvedAt: new Date(),
      approvalNotes: 'Pre-approved during onboarding by admin',
    });

    // 2. Create the user account for the NGO contact
    const user = await storage.createUser({
      email: contactEmail,
      displayName: contactName,
      username: contactEmail.split('@')[0] + '_' + Date.now(),
      userType: 'organization',
      organizationId: org.id,
      firebaseUid: `admin_created_${Date.now()}`,
    });

    // 3. Create organization member record
    try {
      await storage.createOrganizationMember({
        organizationId: org.id,
        userId: user.id,
        role: 'admin',
        canApproveHours: true,
        canManageProjects: true,
      });
    } catch (memberErr) {
      console.error("Error creating org member (non-critical):", memberErr);
    }

    res.status(201).json({
      success: true,
      message: `NGO account created for ${orgName}`,
      organization: { id: org.id, name: org.name },
      user: { id: user.id, email: user.email, displayName: user.displayName },
      note: tempPassword
        ? "Temp password set. User should change on first login."
        : "No password set. User will need to use password reset flow."
    });
  } catch (err) {
    console.error("Error creating NGO account:", err);
    res.status(500).json({ message: "Failed to create NGO account" });
  }
});

/**
 * POST /admin/create-draft-project
 * Create a draft project with pre-filled outcome templates and SDGs
 * Only platform admins can use this endpoint
 */
adminRouter.post("/admin/create-draft-project", async (req: Request, res: Response) => {
  try {
    const adminUserId = extractUserId(req);
    if (!adminUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const adminUser = await storage.getUser(adminUserId);
    if (!adminUser?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const {
      organizationId,
      projectName,
      description,
      sdgGoals,
      outcomeTemplates,
      location,
      startDate,
      endDate,
    } = req.body;

    if (!organizationId || !projectName) {
      return res.status(400).json({ message: "organizationId and projectName are required" });
    }

    // Verify organization exists
    const org = await storage.getOrganization(organizationId);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Create the project
    const project = await storage.createProject({
      name: projectName,
      description: description || `${projectName} - Draft project for ${org.name}`,
      organizationId: organizationId,
      status: 'draft',
      sdgGoals: Array.isArray(sdgGoals) ? sdgGoals : [],
      outcomeTemplates: Array.isArray(outcomeTemplates) ? outcomeTemplates : [],
      location: location || org.city || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    });

    res.status(201).json({
      success: true,
      message: `Draft project "${projectName}" created for ${org.name}`,
      project: {
        id: project.id,
        name: project.name,
        organizationId: project.organizationId,
        status: project.status,
        sdgGoals: project.sdgGoals,
        outcomeTemplates: project.outcomeTemplates,
      }
    });
  } catch (err) {
    console.error("Error creating draft project:", err);
    res.status(500).json({ message: "Failed to create draft project" });
  }
});

// ===== ADMIN PILOT DASHBOARD =====

/**
 * GET /pilot-dashboard
 * Aggregated real-time data for the admin MVP Pilot Dashboard.
 * Admin-only.
 */
adminRouter.get("/pilot-dashboard", async (req: Request, res: Response) => {
  try {
    const adminUserId = extractUserId(req);
    if (!adminUserId) return res.status(401).json({ message: "Authentication required" });
    const adminUser = await storage.getUser(adminUserId);
    if (!adminUser?.isAdmin) return res.status(403).json({ message: "Admin access required" });

    // Admin sees ALL data — no date cutoff
    const silentCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // --- Fetch all core data in parallel ---
    const [allActivities, allOrgs, allProjects, allUsers, partners, engagements] = await Promise.all([
      db.select().from(volunteerActivities),
      db.select().from(organizations),
      db.select({ id: projects.id, name: projects.name, organizationId: projects.organizationId }).from(projects),
      storage.listUsers(),
      storage.listCSRPartners(),
      db.select().from(employeeEngagement),
    ]);

    const verifiedActivities = allActivities.filter(a => a.verificationStatus === 'approved');
    const pendingActivities  = allActivities.filter(a => a.verificationStatus === 'pending');

    const totalVerifiedOutcomes = verifiedActivities.length;
    const totalVerifiedHours    = verifiedActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
    const totalVolunteers       = allUsers.filter(u => u.userType === 'volunteer').length;

    // --- Project → org map ---
    const projectOrgMap = new Map<number, number>();
    for (const p of allProjects) {
      if (p.organizationId != null) projectOrgMap.set(p.id, p.organizationId);
    }
    const orgMap = new Map(allOrgs.map(o => [o.id, o]));

    // --- Org activity stats (use activity date for silent detection, not verifiedAt) ---
    const UNASSIGNED = 0;
    const orgActivityMap = new Map<number, {
      total: number; verified: number; pending: number; hours: number; lastActivity: Date | null;
    }>();
    for (const a of allActivities) {
      const orgId = (a.projectId ? projectOrgMap.get(a.projectId) : undefined) ?? UNASSIGNED;
      if (!orgActivityMap.has(orgId)) {
        orgActivityMap.set(orgId, { total: 0, verified: 0, pending: 0, hours: 0, lastActivity: null });
      }
      const entry = orgActivityMap.get(orgId)!;
      entry.total++;
      if (a.verificationStatus === 'approved') {
        entry.verified++;
        entry.hours += (a.hours || 0);
      } else if (a.verificationStatus === 'pending') {
        entry.pending++;
      }
      // Track most recent activity by logged date (verifiedAt is often null)
      const actDate = a.date instanceof Date ? a.date : (a.date ? new Date(a.date as string) : null);
      if (actDate && (!entry.lastActivity || actDate > entry.lastActivity)) {
        entry.lastActivity = actDate;
      }
    }

    // Silent NGO = has projects on platform but no activity in past 14 days (or no activity at all)
    const orgsWithProjects = new Set<number>();
    for (const p of allProjects) {
      if (p.organizationId != null) orgsWithProjects.add(p.organizationId);
    }
    let silentNGOCount = 0;
    for (const orgId of Array.from(orgsWithProjects)) {
      const stats = orgActivityMap.get(orgId);
      if (!stats || !stats.lastActivity || stats.lastActivity < silentCutoff) silentNGOCount++;
    }

    // --- Verification health by country ---
    // Include ALL orgs that have projects, even those with zero activities
    interface CountryEntry {
      country: string; total: number; verified: number; pending: number;
      hours: number; silentNGOs: number; orgIdSet: number[];
    }
    const countryStats = new Map<string, CountryEntry>();

    for (const orgId of Array.from(orgsWithProjects)) {
      const org = orgMap.get(orgId);
      // Use country when set; fall back to org name so each org is identifiable
      const country = org?.country || org?.name || 'Unknown';
      if (!countryStats.has(country)) {
        countryStats.set(country, { country, total: 0, verified: 0, pending: 0, hours: 0, silentNGOs: 0, orgIdSet: [] });
      }
      const cs = countryStats.get(country)!;
      if (!cs.orgIdSet.includes(orgId)) cs.orgIdSet.push(orgId);
      const stats = orgActivityMap.get(orgId);
      if (stats) {
        cs.total    += stats.total;
        cs.verified += stats.verified;
        cs.pending  += stats.pending;
        cs.hours    += stats.hours;
      }
      if (!stats || !stats.lastActivity || stats.lastActivity < silentCutoff) cs.silentNGOs++;
    }

    // Add "Unassigned" bucket for activities with no project link
    const unassigned = orgActivityMap.get(UNASSIGNED);
    if (unassigned && unassigned.total > 0) {
      countryStats.set('Unassigned', {
        country: 'Unassigned', total: unassigned.total, verified: unassigned.verified,
        pending: unassigned.pending, hours: unassigned.hours, silentNGOs: 0, orgIdSet: [],
      });
    }

    const verificationHealth = Array.from(countryStats.values()).map(cs => ({
      country: cs.country,
      rate: cs.total > 0 ? Math.round((cs.verified / cs.total) * 100) : 0,
      outcomes: cs.verified,
      pending: cs.pending,
      hours: Math.round(cs.hours),
      silentNGOs: cs.silentNGOs,
      orgCount: cs.orgIdSet.length,
    })).sort((a, b) => b.outcomes - a.outcomes || a.rate - b.rate);

    // --- Recent verifications (live feed) ---
    // Sort by date DESC — verifiedAt is often null, date is always set
    const recentVerified = [...verifiedActivities]
      .sort((a, b) => {
        const bTime = (b.verifiedAt ?? b.date)?.getTime() ?? 0;
        const aTime = (a.verifiedAt ?? a.date)?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 10);

    const volunteerIdSet = new Set<number>();
    for (const a of recentVerified) { if (a.userId) volunteerIdSet.add(a.userId); }
    const volunteerUsers = volunteerIdSet.size > 0 ? await storage.getUsersByIds(Array.from(volunteerIdSet)) : [];
    const userMap = new Map(volunteerUsers.map(u => [u.id, u]));

    const projectIdSet = new Set<number>();
    for (const a of recentVerified) { if (a.projectId) projectIdSet.add(a.projectId); }
    const projectDetails = allProjects.filter(p => projectIdSet.has(p.id));
    const projectMap = new Map(projectDetails.map(p => [p.id, p]));

    const ngoIdSet = new Set<number>();
    for (const p of projectDetails) { if (p.organizationId != null) ngoIdSet.add(p.organizationId); }
    const ngoOrgs = allOrgs.filter(o => ngoIdSet.has(o.id));
    const ngoMap = new Map(ngoOrgs.map(o => [o.id, o]));

    const recentVerifications = recentVerified.map(a => {
      const volunteer = a.userId ? userMap.get(a.userId) : undefined;
      const project   = a.projectId ? projectMap.get(a.projectId) : undefined;
      const ngo       = project ? ngoMap.get(project.organizationId ?? 0) : undefined;
      const refTime   = a.verifiedAt ?? a.date;
      const diffMs    = Date.now() - (refTime?.getTime() ?? Date.now());
      const diffMin   = Math.floor(diffMs / 60000);
      const diffH     = Math.floor(diffMin / 60);
      const diffD     = Math.floor(diffH / 24);
      const timeLabel = diffMin < 1 ? 'just now'
        : diffMin < 60  ? `${diffMin}m ago`
        : diffH   < 24  ? `${diffH}h ago`
        : `${diffD}d ago`;

      return {
        id: a.id,
        ngo: ngo?.name ?? 'Unknown NGO',
        country: ngo?.country ?? '?',
        outcome: a.outcomeText ?? a.outcomes ?? a.description ?? 'Volunteer activity',
        hours: a.hours ?? 0,
        volunteer: volunteer?.displayName ?? volunteer?.username ?? 'Volunteer',
        time: timeLabel,
        method: 'app' as const,
      };
    });

    // --- Corporate pilots ---
    // Outcomes = verified activities by this partner's engaged employees (via email match)
    const projectCountryMap = new Map<number, string>();
    for (const p of allProjects) {
      if (p.organizationId == null) continue;
      const org = orgMap.get(p.organizationId);
      if (org?.country) projectCountryMap.set(p.id, org.country);
    }

    // Build email → user map for matching engagements to activities
    const userByEmail = new Map(allUsers.map(u => [u.email, u]));

    const corporatePilots = partners.map(p => {
      const allPEngagements = engagements.filter(e => e.partnerId === p.id);
      const employeeEmails  = new Set(allPEngagements.map(e => e.employeeEmail).filter(Boolean) as string[]);

      // Count verified activities logged by this partner's employees
      let outcomes = 0;
      let hours    = 0;
      for (const email of Array.from(employeeEmails)) {
        const user = userByEmail.get(email);
        if (!user) continue;
        const userVerified = verifiedActivities.filter(a => a.userId === user.id);
        outcomes += userVerified.length;
        hours    += userVerified.reduce((s, a) => s + (a.hours || 0), 0);
      }

      // Distinct countries from this partner's engagement projects
      const countryNames = new Set<string>();
      for (const e of allPEngagements) {
        if (e.projectId) {
          const c = projectCountryMap.get(e.projectId);
          if (c) countryNames.add(c);
        }
      }

      const uniqueEmployees = employeeEmails.size;
      const status: 'active' | 'pilot' | 'onboarding' = outcomes >= 10 ? 'active' : outcomes >= 1 ? 'pilot' : 'onboarding';
      const health: 'good' | 'warning' | 'new'        = outcomes >= 10 ? 'good'   : outcomes >= 1 ? 'warning' : 'new';

      return {
        id: p.id, name: p.companyName, outcomes, hours: Math.round(hours),
        countries: countryNames.size, employees: uniqueEmployees, status, health,
      };
    });

    // --- Audit metrics ---
    // Completeness: activities with any outcome text (outcomeText, outcomes, or description) + hours
    const withBothFieldsCount = verifiedActivities.filter(a =>
      (a.outcomeText || a.outcomes || a.description) && a.hours
    ).length;
    const completenessRate = verifiedActivities.length > 0
      ? Math.round((withBothFieldsCount / verifiedActivities.length) * 100) : 0;

    // Verified within 72h (only meaningful when verifiedAt is set)
    const seventyTwoHours  = 72 * 60 * 60 * 1000;
    const verifiedWithin72h = verifiedActivities.filter(a =>
      a.verifiedAt && a.createdAt &&
      (a.verifiedAt.getTime() - a.createdAt.getTime()) <= seventyTwoHours
    ).length;
    const within72hRate = verifiedActivities.length > 0
      ? Math.round((verifiedWithin72h / verifiedActivities.length) * 100) : 0;

    const withSdg = verifiedActivities.filter(a => a.sdgTags && a.sdgTags.length > 0).length;
    const sdgRate = verifiedActivities.length > 0
      ? Math.round((withSdg / verifiedActivities.length) * 100) : 0;

    const withKnownOrg = verifiedActivities.filter(a => {
      if (!a.projectId) return false;
      const orgId = projectOrgMap.get(a.projectId);
      return !!orgId && orgMap.has(orgId);
    }).length;
    const ngoIdentityRate = verifiedActivities.length > 0
      ? Math.round((withKnownOrg / verifiedActivities.length) * 100) : 0;

    const auditMetrics = [
      { label: "Full audit trail (outcome + hours)", value: completenessRate, target: 100 },
      { label: "Verified within 72h of submission",  value: within72hRate,    target: 80  },
      { label: "SDG auto-mapping",                   value: sdgRate,          target: 100 },
      { label: "NGO identity verified",              value: ngoIdentityRate,  target: 100 },
    ];

    // --- Overall verification rate ---
    const avgRate = allActivities.length > 0
      ? Math.round((verifiedActivities.length / allActivities.length) * 100) : 0;

    res.json({
      stats: {
        totalVerifiedOutcomes,
        totalVerifiedHours:    Math.round(totalVerifiedHours),
        silentNGOs:            silentNGOCount,
        totalPending:          pendingActivities.length,
        avgVerificationRate:   avgRate,
        totalVolunteers,
        totalOrganizations:    allOrgs.length,
        totalActivities:       allActivities.length,
      },
      verificationHealth,
      recentVerifications,
      corporatePilots,
      auditMetrics,
    });
  } catch (err) {
    console.error("Error fetching pilot dashboard data:", err);
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
});
