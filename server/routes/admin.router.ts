import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { extractUserId } from "./utils";
import { sendWeeklyDigest, sendWeeklyDigestsToAll, sendOrganizationWeeklyDigest } from "../email-digest-service";
import OpenAI from "openai";

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

    // Delete associated data based on user type
    if (user.userType === 'volunteer') {
      // Delete from matching tables
      if (user.email) {
        try {
          const volunteer = await storage.getVolunteerByEmail(user.email);
          if (volunteer) {
            // Note: We can't directly delete from volunteers table without a storage method
            // The deletion will be handled by Firebase user deletion in frontend
            console.log(`Volunteer profile for ${user.email} should be cleaned up`);
          }
        } catch (err) {
          console.error("Error deleting volunteer profile:", err);
        }
      }

      // Delete volunteer activities
      // Note: Would need storage.deleteVolunteerActivitiesByUserId method

    } else if (user.userType === 'organization') {
      // Delete from matching tables
      if (user.email) {
        try {
          const matchableOrg = await storage.getMatchableOrganizationByEmail(user.email);
          if (matchableOrg) {
            console.log(`Matchable org for ${user.email} should be cleaned up`);
          }
        } catch (err) {
          console.error("Error deleting matchable organization:", err);
        }
      }

      // Organization data cleanup would happen here
      // Projects, tasks, opportunities, etc.
    }

    // Note: The actual user deletion happens in Firebase on the frontend
    // This route serves as a placeholder for backend data cleanup
    // In a production app, you would delete all associated records here

    res.json({
      message: "Account deletion initiated. Please complete deletion in Firebase Auth.",
      success: true
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
adminRouter.post("/generate-impact-report", async (req: Request, res: Response) => {
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
        const shortSystemPrompt = `You are an expert at crafting brief, impactful stories for nonprofit organizations. Write a SHORT 2-3 sentence impact story that is:
- Concise and punchy (max 50 words)
- Uses ONLY the metrics provided (skip any that are 0)
- Focuses on human impact and outcomes
- Written for the specific organization (not Synerxus platform)
- Dynamic - adapts to whatever metrics are available
- No headers, bullet points, or formatting - just flowing prose`;

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
      const systemPrompt = `You are an expert impact report writer for nonprofit organizations. Create compelling, funder-ready impact reports that are well-structured, data-driven, and emotionally resonant.

MANDATORY RULES - NON-NEGOTIABLE:
- EACH METRIC APPEARS EXACTLY ONCE - NO EXCEPTIONS
- NEVER list the same metric multiple times
- SUM all similar metrics into a single total (not separate line items)
- Example: DO NOT say "Students Educated: 35" then "Students Educated: 35" again
- Example DO: "Students Educated: 70" (if there were two instances of 35)
- Treat ALL beneficiary-type metrics as ONE "Total People Impacted" figure
- Format as a professional, compelling narrative`;

      const userPrompt = `Generate a professional Impact Report for ${organizationName || "the organization"} with ZERO metric duplication:

ORGANIZATION: ${organizationName}
PROJECT: ${projectTitle}
REPORTING PERIOD: ${reportingPeriod}
LOCATIONS: ${locationsServed}

MASTER METRICS (these are the ONLY numbers to reference, each once):
- Volunteers: ${volunteerCount}
- Hours: ${totalHours}
- Projects: ${projectCount}
- Total People Impacted: ${beneficiaryTotal}

IMPACT STORY (already deduplicated):
${cleanStories}

CSR/ESG: ${csrAlignment}

Target: ${targetAudience} | Tone: ${tone} | Focus: ${impactFocus}

REPORT FORMAT:
1. Header (Organization, Date)
2. Executive Summary (use the master metrics ONCE each)
3. Key Achievements (reference master metrics, no duplication)
4. Impact Story (from deduplicated story above)
5. CSR/ESG Alignment
6. Next Steps

CRITICAL: If you reference "Students Educated: 35" or any metric, it must ONLY appear once in the entire report. If similar metrics exist, combine them into totals.`;

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
adminRouter.post("/email-digest/send", async (req: Request, res: Response) => {
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
adminRouter.post("/email-digest/send-all", async (req: Request, res: Response) => {
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
adminRouter.post("/email-digest/organization/:organizationId", async (req: Request, res: Response) => {
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
adminRouter.post("/admin/backfill-employer-engagement", async (req: Request, res: Response) => {
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
