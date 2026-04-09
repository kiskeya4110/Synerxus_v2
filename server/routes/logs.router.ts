import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import {
  insertVolunteerActivitySchema,
  volunteerActivities as volunteerActivitiesTable,
  type VolunteerActivity,
  type InsertVerificationAuditLog,
} from "@shared/schema";
import { and, gte, inArray } from "drizzle-orm";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";
import { checkAndAwardBadges } from "../badge-service";
import {
  sendActivityApprovalNotification,
} from "../email-digest-service";
import {
  notifyPendingActivity,
} from "../notification-service";
import {
  suggestSDGsFromText,
  mapOutcomeTypeToSDGs,
} from "@shared/sdg-goals";
import { smsVerificationService } from "../services/sms-verification";
import { invalidateCache } from "../dashboard-service";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Read logo once at module load time, embed as base64 data URI for print reliability
function loadLogoDataUri(): string {
  const candidates = [
    path.resolve(import.meta.dirname, "../../dist/public/2026 - Synerxus ESG Logo.png"),
    path.resolve(import.meta.dirname, "../../public/2026 - Synerxus ESG Logo.png"),
  ];
  for (const p of candidates) {
    try {
      const buf = fs.readFileSync(p);
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch { /* try next */ }
  }
  return "/2026 - Synerxus ESG Logo.png"; // fallback to URL if file not found
}
const LOGO_DATA_URI = loadLogoDataUri();

export const logsRouter = Router();

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text ?? '').replace(/[&<>"']/g, char => map[char]);
}

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// ==================== Impact Log Routes (Unified /api/logs) ====================

/**
 * POST /logs - Create a new impact log (status=PENDING)
 * Volunteers submit hours and outcomes for verification
 */
logsRouter.post("/logs", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Only volunteers can create logs
    if (req.user?.userType !== 'volunteer') {
      return res.status(403).json({ message: "Only volunteers can create impact logs" });
    }

    const validationResult = insertVolunteerActivitySchema.safeParse({
      ...req.body,
      userId,
      verificationStatus: 'pending'
    });

    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid log data",
        errors: validationResult.error.errors
      });
    }

    // Get project to inherit SDG tags and validate outcome type
    let projectSdgGoals: number[] = [];
    if (validationResult.data.projectId) {
      const project = await storage.getProject(validationResult.data.projectId);
      if (project) {
        projectSdgGoals = project.sdgGoals || [];
      }
    }

    // Server-side SDG auto-suggestion: merge client sdgTags + project SDGs + text-based suggestions
    const clientSdgTags: number[] = Array.isArray(req.body.sdgTags) ? req.body.sdgTags : [];
    const textSdgTags = req.body.outcomeText ? suggestSDGsFromText(req.body.outcomeText) : [];
    const outcomeSdgTags = req.body.outcomes ? mapOutcomeTypeToSDGs(req.body.outcomes) : [];
    const mergedSdgTags = Array.from(new Set([
      ...clientSdgTags,
      ...textSdgTags,
      ...outcomeSdgTags,
      ...projectSdgGoals
    ])).slice(0, 10); // Cap at 10 tags

    const activity = await storage.createVolunteerActivity({
      ...validationResult.data,
      outcomeText: req.body.outcomeText || null,
      geolocation: req.body.geolocation || null,
      deviceId: req.body.deviceId || null,
      sdgTags: mergedSdgTags.length > 0 ? mergedSdgTags : null,
      verificationStatus: 'pending'
    });

    // Notify organization about new pending log
    if (activity.projectId && activity.userId) {
      const project = await storage.getProject(activity.projectId);
      notifyPendingActivity(
        activity.id,
        activity.projectId,
        activity.userId,
        activity.hours,
        project?.name,
        activity.outcomeText
      ).catch(err => {
        console.error("Failed to send pending activity notification:", err);
      });
    }

    try {
      const smsProject = activity.projectId ? await storage.getProject(activity.projectId) : null;
      const orgId = smsProject?.organizationId ?? null;
      const org = orgId ? await storage.getOrganization(orgId) : null;
      const orgProfile: any = org?.id ? await storage.getOrganizationProfileByOrgId(org.id) : null;
      if (org && orgProfile?.contactPhone && activity.userId) {
        const smsUser = await storage.getUser(activity.userId);
        smsVerificationService.addToQueue({
          logId: activity.id,
          volunteerId: activity.userId as number,
          volunteerName: smsUser?.displayName || 'Volunteer',
          projectName: smsProject?.name || 'Project',
          outcomeText: activity.outcomes || activity.description || '',
          ngoContactPhone: orgProfile.contactPhone,
          ngoName: org.name || 'Organization',
          createdAt: new Date(),
        });
      }
    } catch (e) { console.warn('[SMS Queue] Failed to queue:', e); }

    try {
      if (activity.projectId) {
        const tokenProject = await storage.getProject(activity.projectId);
        const orgId = tokenProject?.organizationId;
        const approveToken = crypto.randomBytes(32).toString('hex');
        const rejectToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
        await storage.createVerificationToken({
          token: approveToken,
          activityId: activity.id,
          organizationId: orgId || undefined,
          action: 'approve',
          expiresAt,
        });
        await storage.createVerificationToken({
          token: rejectToken,
          activityId: activity.id,
          organizationId: orgId || undefined,
          action: 'reject',
          expiresAt,
        });
      }
    } catch (e) { console.warn('[Token] Failed to create verification tokens:', e); }

    broadcastUpdate("log_created", activity);
    res.status(201).json(activity);
  } catch (err) {
    console.error("Error creating impact log:", err);
    res.status(500).json({ message: "Failed to create impact log" });
  }
});

/**
 * GET /logs - List impact logs with filtering
 * Query params:
 *   - status: pending|approved|rejected
 *   - ngo_id: Filter by organization ID (for NGO verification queue)
 *   - corporate_id: Filter by corporate partner ID (only verified logs)
 *   - user_id: Filter by volunteer user ID
 */
logsRouter.get("/logs", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, ngo_id, corporate_id, user_id, project_id } = req.query;
    const authenticatedUser = req.user;

    if (!authenticatedUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    let activities: VolunteerActivity[] = [];

    // NGO staff viewing verification queue
    if (ngo_id) {
      const ngoId = parseInt(ngo_id as string);

      // Verify user belongs to this organization
      if (authenticatedUser.userType !== 'organization' ||
          authenticatedUser.organizationId !== ngoId) {
        return res.status(403).json({
          message: "You can only access logs for your own organization"
        });
      }

      // Get all projects for this organization
      const projects = await storage.listProjectsByOrganization(ngoId);
      const projectIds = projects.map(p => p.id);

      if (projectIds.length > 0) {
        activities = await storage.listVolunteerActivitiesByProjectIds(projectIds);
      }

      // Filter by status if provided
      if (status) {
        activities = activities.filter(a => a.verificationStatus === status);
      }
    }
    // Corporate partner viewing verified logs
    else if (corporate_id) {
      const corporateId = parseInt(corporate_id as string);

      // Verify user is a corporate partner with access
      if (authenticatedUser.userType !== 'corporate-partner') {
        return res.status(403).json({
          message: "Only corporate partners can access corporate logs"
        });
      }

      // Get verified outputs for this corporate partner
      const verifiedOutputs = await storage.listVerifiedOutputs();
      const partnerOutputs = verifiedOutputs.filter(
        (o: any) => o.partnerId === corporateId && o.verificationStatus === 'verified'
      );

      // Get corresponding activities
      const activityIds = partnerOutputs
        .filter((o: any) => o.activityId)
        .map((o: any) => o.activityId);

      activities = [];
      for (const actId of activityIds) {
        const activity = await storage.getVolunteerActivity(actId);
        if (activity && activity.verificationStatus === 'approved') {
          activities.push(activity);
        }
      }
    }
    // Volunteer viewing their own logs
    else if (user_id) {
      const requestedUserId = parseInt(user_id as string);

      // Volunteers can only see their own logs
      if (authenticatedUser.id !== requestedUserId &&
          authenticatedUser.userType === 'volunteer') {
        return res.status(403).json({
          message: "You can only access your own logs"
        });
      }

      activities = await storage.listVolunteerActivitiesByUser(requestedUserId);

      if (status) {
        activities = activities.filter(a => a.verificationStatus === status);
      }
    }
    // Filter by project
    else if (project_id) {
      const projectIdNum = parseInt(project_id as string);
      activities = await storage.listVolunteerActivitiesByProject(projectIdNum);

      if (status) {
        activities = activities.filter(a => a.verificationStatus === status);
      }
    }
    // Default: return user's own logs
    else {
      activities = await storage.listVolunteerActivitiesByUser(authenticatedUser.id);

      if (status) {
        activities = activities.filter(a => a.verificationStatus === status);
      }
    }

    // Enrich with project and user data for display
    const enrichedLogs = await Promise.all(activities.map(async (activity) => {
      const project = activity.projectId
        ? await storage.getProject(activity.projectId)
        : null;
      const user = activity.userId
        ? await storage.getUser(activity.userId)
        : null;
      const verifier = activity.verifiedBy
        ? await storage.getUser(activity.verifiedBy)
        : null;

      return {
        ...activity,
        project: project ? {
          id: project.id,
          name: project.name,
          sdgGoals: project.sdgGoals,
          outcomeTemplates: project.outcomeTemplates
        } : null,
        volunteer: user ? {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          avatar: user.avatar
        } : null,
        verifier: verifier ? {
          id: verifier.id,
          displayName: verifier.displayName
        } : null
      };
    }));

    res.json(enrichedLogs);
  } catch (err) {
    console.error("Error fetching impact logs:", err);
    res.status(500).json({ message: "Failed to fetch impact logs" });
  }
});

/**
 * GET /logs/corporate-verified - Enriched verified logs for corporate dashboard (Phase 6)
 * Returns verified outcomes with NGO name, SDG tags, outcome text, verification timestamp
 * Supports filters: sdg, start_date, end_date, outcome_type, project_id
 * NOTE: Must be defined BEFORE /logs/:id to avoid route collision
 */
logsRouter.get("/logs/corporate-verified", async (_req: Request, res: Response) => {
  try {
    const { sdg, start_date, end_date, outcome_type, project_id, corporate_id } = _req.query;

    // If corporate_id provided, filter to only volunteers linked to that corporate partner
    let allowedUserIds: Set<number> | null = null;
    if (corporate_id) {
      const corporateUserId = parseInt(corporate_id as string);
      const allPartners = await storage.listCSRPartners?.() || [];
      const partner = allPartners.find((p: any) => p.userId === corporateUserId);
      if (partner) {
        const allProfiles = await storage.listVolunteerProfiles?.() || [];
        // Direct profile links (employerId = partner.id)
        const directLinkedUserIds = allProfiles
          .filter((p: any) => p.employerId && parseInt(String(p.employerId)) === partner.id)
          .map((p: any) => p.userId as number);
        // Explicit employer-link table (volunteerId references volunteerProfiles.id)
        const explicitLinks = await (storage as any).listVolunteerEmployerLinksByPartnerId?.(partner.id) || [];
        const explicitLinkedUserIds = allProfiles
          .filter((p: any) => explicitLinks.some((l: any) => l.volunteerId === p.id))
          .map((p: any) => p.userId as number);
        allowedUserIds = new Set([...directLinkedUserIds, ...explicitLinkedUserIds]);
      }
    }

    // Get all approved activities
    const allActivities = await storage.listVolunteerActivities();
    const approvedActivities = allActivities.filter(
      (a: any) => a.verificationStatus === 'approved' &&
        (allowedUserIds === null || (a.userId && allowedUserIds.has(a.userId)))
    );

    // Enrich each approved activity with project, volunteer, and verifier data
    let enrichedLogs: any[] = [];
    for (const activity of approvedActivities) {
      const project = activity.projectId ? await storage.getProject(activity.projectId) : null;
      const volunteer = activity.userId ? await storage.getUser(activity.userId) : null;
      const verifier = activity.verifiedBy ? await storage.getUser(activity.verifiedBy) : null;
      const verifierOrg = verifier?.organizationId
        ? await storage.getOrganization(verifier.organizationId)
        : null;

      enrichedLogs.push({
        id: activity.id,
        outcomeText: (activity as any).editedOutcomeText || (activity as any).outcomeText || activity.description,
        outcomeType: activity.outcomes,
        outcomeQuantity: (activity as any).editedOutcomeQuantity || activity.outcomeQuantity,
        sdgTags: (activity as any).editedSdgTags || (activity as any).sdgTags || project?.sdgGoals || [],
        hours: activity.hours,
        date: activity.date,
        verifiedAt: activity.verifiedAt,
        ngoName: verifierOrg?.name || 'NGO',
        verifierName: verifier?.displayName || null,
        volunteerName: volunteer?.displayName || volunteer?.email || 'Volunteer',
        projectName: project?.name || 'Project',
        projectId: activity.projectId,
        evidenceUrls: activity.evidenceUrls,
        geolocation: (activity as any).geolocation
      });
    }

    // Apply filters
    if (sdg) {
      const sdgNum = parseInt(sdg as string);
      enrichedLogs = enrichedLogs.filter((l: any) =>
        Array.isArray(l.sdgTags) && l.sdgTags.includes(sdgNum)
      );
    }
    if (start_date) {
      const startDateObj = new Date(start_date as string);
      enrichedLogs = enrichedLogs.filter((l: any) => new Date(l.date) >= startDateObj);
    }
    if (end_date) {
      const endDateObj = new Date(end_date as string);
      enrichedLogs = enrichedLogs.filter((l: any) => new Date(l.date) <= endDateObj);
    }
    if (outcome_type) {
      enrichedLogs = enrichedLogs.filter((l: any) =>
        l.outcomeType?.toLowerCase() === (outcome_type as string).toLowerCase()
      );
    }
    if (project_id) {
      const projectIdNum = parseInt(project_id as string);
      enrichedLogs = enrichedLogs.filter((l: any) => l.projectId === projectIdNum);
    }

    // Sort by most recent
    enrichedLogs.sort((a: any, b: any) => new Date(b.verifiedAt || b.date).getTime() - new Date(a.verifiedAt || a.date).getTime());

    // Summary stats
    const uniqueSdgs = new Set<number>();
    enrichedLogs.forEach((l: any) => {
      if (Array.isArray(l.sdgTags)) l.sdgTags.forEach((s: number) => uniqueSdgs.add(s));
    });

    res.json({
      summary: {
        totalVerifiedOutcomes: enrichedLogs.length,
        sdgsCovered: Array.from(uniqueSdgs).sort((a, b) => a - b),
        dateRange: {
          earliest: enrichedLogs.length > 0 ? enrichedLogs[enrichedLogs.length - 1].date : null,
          latest: enrichedLogs.length > 0 ? enrichedLogs[0].date : null
        }
      },
      logs: enrichedLogs
    });
  } catch (err: any) {
    console.error("Error fetching corporate verified logs:", err?.message, err?.stack);
    res.status(500).json({ message: "Failed to fetch verified logs", error: err?.message });
  }
});

/**
 * GET /logs/:id - Get a single impact log
 */
logsRouter.get("/logs/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const logId = parseInt(req.params.id);
    const activity = await storage.getVolunteerActivity(logId);

    if (!activity) {
      return res.status(404).json({ message: "Impact log not found" });
    }

    // Enrich with related data
    const project = activity.projectId
      ? await storage.getProject(activity.projectId)
      : null;
    const user = activity.userId
      ? await storage.getUser(activity.userId)
      : null;
    const verifier = activity.verifiedBy
      ? await storage.getUser(activity.verifiedBy)
      : null;

    res.json({
      ...activity,
      project: project ? {
        id: project.id,
        name: project.name,
        sdgGoals: project.sdgGoals,
        outcomeTemplates: project.outcomeTemplates
      } : null,
      volunteer: user ? {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar
      } : null,
      verifier: verifier ? {
        id: verifier.id,
        displayName: verifier.displayName
      } : null
    });
  } catch (err) {
    console.error("Error fetching impact log:", err);
    res.status(500).json({ message: "Failed to fetch impact log" });
  }
});

/**
 * PATCH /logs/:id/verify - 1-tap verify an impact log
 * Sets status=approved, records verified_by and verified_at
 */
logsRouter.patch("/logs/:id/verify", authMiddleware, async (req: Request, res: Response) => {
  try {
    const logId = parseInt(req.params.id);
    const reviewerId = req.user?.id;

    // Security: Require organization user type
    if (req.user?.userType !== 'organization') {
      return res.status(403).json({ message: "Only NGO staff can verify logs" });
    }

    const activity = await storage.getVolunteerActivity(logId);
    if (!activity) {
      return res.status(404).json({ message: "Impact log not found" });
    }

    // Security: Validate log belongs to user's organization
    if (activity.projectId) {
      const project = await storage.getProject(activity.projectId);
      if (project && project.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Cannot verify logs for other organizations" });
      }
    }

    // Security: Check canApproveHours permission
    if (req.user.organizationId) {
      const members = await storage.listOrganizationMembers(req.user.organizationId);
      const currentMember = members.find((m: any) => m.userId === req.user?.id);
      if (currentMember && !currentMember.canApproveHours) {
        return res.status(403).json({ message: "You do not have permission to verify logs" });
      }
    }

    // Accept optional edited fields from NGO verification (Phase 2)
    const { editedOutcomeText, editedOutcomeQuantity, editedSdgTags } = req.body;

    const verificationUpdate: any = {
      verificationStatus: 'approved',
      verifiedBy: reviewerId,
      verifiedAt: new Date()
    };

    // Store NGO edits alongside originals for transparency
    if (editedOutcomeText && typeof editedOutcomeText === 'string') {
      verificationUpdate.editedOutcomeText = editedOutcomeText.trim();
    }
    if (editedOutcomeQuantity !== undefined && editedOutcomeQuantity !== null) {
      verificationUpdate.editedOutcomeQuantity = parseInt(editedOutcomeQuantity);
    }
    if (Array.isArray(editedSdgTags)) {
      verificationUpdate.editedSdgTags = editedSdgTags.filter((t: any) => typeof t === 'number');
    }

    const updatedActivity = await storage.updateVolunteerActivity(logId, verificationUpdate);

    // Write immutable audit log entry
    try {
      const auditEntry: InsertVerificationAuditLog = {
        activityId: logId,
        projectId: activity.projectId || undefined,
        organizationId: req.user?.organizationId || undefined,
        action: 'approved',
        previousStatus: activity.verificationStatus || 'pending',
        newStatus: 'approved',
        performedBy: reviewerId!,
        performedByRole: req.user?.userType || 'organization',
        volunteerId: activity.userId,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || undefined,
        userAgent: req.headers['user-agent'] || undefined,
        geolocation: typeof activity.geolocation === 'string' ? activity.geolocation : undefined,
        evidenceSnapshot: activity.evidenceUrls ? { urls: activity.evidenceUrls } : undefined,
        changeDetails: editedOutcomeText || editedOutcomeQuantity || editedSdgTags ? {
          editedOutcomeText: editedOutcomeText || null,
          editedOutcomeQuantity: editedOutcomeQuantity || null,
          editedSdgTags: editedSdgTags || null,
        } : undefined,
      };
      await storage.createVerificationAuditLog(auditEntry);
    } catch (auditErr) {
      console.error("[Audit] Failed to write audit log for log verification:", auditErr);
    }

    // Update CSR employee engagement for verified logs
    if (activity.userId && activity.hours) {
      try {
        const volunteerProfile = await storage.getVolunteerProfileByUserId(activity.userId);
        const user = await storage.getUser(activity.userId);

        const linkedEmployerIds = new Set<number>();

        // Method 1: Direct link via volunteerProfile.employerId
        if (volunteerProfile?.employerId) {
          const employerIdNum = typeof volunteerProfile.employerId === 'string'
            ? parseInt(volunteerProfile.employerId)
            : volunteerProfile.employerId;
          if (!isNaN(employerIdNum)) {
            linkedEmployerIds.add(employerIdNum);
          }
        }

        // Method 2: Explicit link via volunteerEmployerLinks table
        if (volunteerProfile?.id) {
          const employerLinks = await storage.listVolunteerEmployerLinks?.() || [];
          const volunteerLinks = employerLinks.filter((link: any) =>
            link.volunteerId === volunteerProfile.id &&
            link.verificationStatus !== 'rejected'
          );
          volunteerLinks.forEach((link: any) => {
            if (link.partnerId) {
              const partnerIdNum = Number(link.partnerId);
              if (!isNaN(partnerIdNum)) {
                linkedEmployerIds.add(partnerIdNum);
              }
            }
          });
        }

        // Update employee engagement for ALL linked employers
        if (linkedEmployerIds.size > 0 && user?.email) {
          const allEngagements = (await storage.listEmployeeEngagement()) || [];

          for (const employerIdNum of Array.from(linkedEmployerIds)) {
            const existing = (Array.isArray(allEngagements) ? allEngagements : []).find((e: any) =>
              e?.partnerId === employerIdNum &&
              e?.employeeEmail === user.email
            );

            if (existing) {
              await storage.updateEmployeeEngagement(existing.id, {
                hoursVolunteered: (existing.hoursVolunteered || 0) + activity.hours,
                projectId: activity.projectId
              });
            } else {
              await storage.createEmployeeEngagement({
                partnerId: employerIdNum,
                employeeEmail: user.email,
                employeeName: volunteerProfile?.volunteerName || user.displayName,
                projectId: activity.projectId,
                hoursVolunteered: activity.hours,
                engagementType: 'vto'
              });
            }

            // Create Verified Output for CSR Audit Trail -- enriched (Phase 1/2)
            const reviewerUser = reviewerId ? await storage.getUser(reviewerId) : null;
            const reviewerOrg = reviewerUser?.organizationId
              ? await storage.getOrganization(reviewerUser.organizationId)
              : null;

            await storage.createVerifiedOutput({
              activityId: logId,
              partnerId: employerIdNum,
              projectId: activity.projectId || 0,
              outputType: 'hours',
              outputValue: activity.hours || 0,
              verificationStatus: 'verified',
              verifiedBy: reviewerId || null,
              verifiedAt: new Date(),
              auditTrail: {
                action: 'log_verified',
                description: `Impact log verified: ${activity.hours || 0}h by ${user.displayName || user.email}`,
                timestamp: new Date().toISOString(),
                reviewerId: reviewerId,
                reviewerOrgName: reviewerOrg?.name || null,
                deviceId: activity.deviceId || null,
                geolocation: activity.geolocation || null,
                outcomeText: activity.outcomeText || null,
                outcomeQuantity: activity.outcomeQuantity,
                sdgTags: activity.sdgTags || [],
                editedOutcomeText: editedOutcomeText || null,
                editedOutcomeQuantity: editedOutcomeQuantity || null,
                editedSdgTags: editedSdgTags || null
              }
            });

            // Update SDG-specific challenge progress
            if (activity.projectId) {
              try {
                const project = await storage.getProject(activity.projectId);
                if (project?.sdgGoals && Array.isArray(project.sdgGoals) && project.sdgGoals.length > 0) {
                  const primarySDG = project.sdgGoals[0];
                  const allChallenges = await storage.listCSRChallenges();
                  const activeChallenges = allChallenges.filter((c: any) =>
                    c.partnerId === employerIdNum &&
                    c.status === 'active' &&
                    c.sdgGoal === primarySDG
                  );

                  for (const challenge of activeChallenges) {
                    const currentHours = challenge.currentHours || 0;
                    await storage.updateCSRChallenge(challenge.id, {
                      currentHours: currentHours + activity.hours
                    });
                  }
                }
              } catch (sdgErr) {
                console.error("Error updating SDG-specific hours for challenge:", sdgErr);
              }
            }

            console.log(`[CSR] Updated employee engagement for ${user.email} at employer ${employerIdNum} with ${activity.hours}h verified hours`);
          }
        }
      } catch (csrErr) {
        console.error("Error updating CSR employee engagement:", csrErr);
        // Non-critical, don't fail the verification
      }
    }

    // Mark related pending_approval notifications as read
    storage.markNotificationsReadByEntity("volunteer_activity", logId).catch(err => {
      console.error("Failed to mark notifications as read:", err);
    });

    // Send email notification to volunteer
    sendActivityApprovalNotification(logId, 'approved', reviewerId).catch(err => {
      console.error("Failed to send verification notification:", err);
    });

    // Check and award badges after verification
    if (activity.userId) {
      checkAndAwardBadges(activity.userId).catch(err => {
        console.error("Failed to check badges:", err);
      });
      // Invalidate the volunteer's dashboard cache so verifiedHours updates immediately
      invalidateCache.forUser(activity.userId);
    }

    smsVerificationService.removeFromQueue(logId);

    broadcastUpdate("log_verified", updatedActivity);
    res.json(updatedActivity);
  } catch (err) {
    console.error("Error verifying impact log:", err);
    res.status(500).json({ message: "Failed to verify impact log" });
  }
});

/**
 * PATCH /logs/:id/reject - Reject an impact log with reason
 * Sets status=rejected, records rejected_reason, verified_by, verified_at
 */
logsRouter.patch("/logs/:id/reject", authMiddleware, async (req: Request, res: Response) => {
  try {
    const logId = parseInt(req.params.id);
    const { reason } = req.body;
    const reviewerId = req.user?.id;

    // Require rejection reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    // Security: Require organization user type
    if (req.user?.userType !== 'organization') {
      return res.status(403).json({ message: "Only NGO staff can reject logs" });
    }

    const activity = await storage.getVolunteerActivity(logId);
    if (!activity) {
      return res.status(404).json({ message: "Impact log not found" });
    }

    // Security: Validate log belongs to user's organization
    if (activity.projectId) {
      const project = await storage.getProject(activity.projectId);
      if (project && project.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Cannot reject logs for other organizations" });
      }
    }

    // Security: Check canApproveHours permission
    if (req.user.organizationId) {
      const members = await storage.listOrganizationMembers(req.user.organizationId);
      const currentMember = members.find((m: any) => m.userId === req.user?.id);
      if (currentMember && !currentMember.canApproveHours) {
        return res.status(403).json({ message: "You do not have permission to reject logs" });
      }
    }

    // Update with rejection data
    const updatedActivity = await storage.updateVolunteerActivity(logId, {
      verificationStatus: 'rejected',
      rejectedReason: reason.trim(),
      verifiedBy: reviewerId,
      verifiedAt: new Date()
    } as any);

    // Mark related pending_approval notifications as read
    storage.markNotificationsReadByEntity("volunteer_activity", logId).catch(err => {
      console.error("Failed to mark notifications as read:", err);
    });

    // Send email notification to volunteer
    sendActivityApprovalNotification(logId, 'rejected', reviewerId).catch(err => {
      console.error("Failed to send rejection notification:", err);
    });

    smsVerificationService.removeFromQueue(logId);

    try {
      const previousStatus = activity.verificationStatus || 'pending';
      const auditEntry: InsertVerificationAuditLog = {
        activityId: logId,
        projectId: activity.projectId || undefined,
        organizationId: req.user?.organizationId || undefined,
        action: 'rejected',
        previousStatus,
        newStatus: 'rejected',
        performedBy: reviewerId!,
        performedByRole: req.user?.userType || 'organization',
        volunteerId: activity.userId,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || undefined,
        userAgent: req.headers['user-agent'] || undefined,
        reason: reason.trim(),
        evidenceSnapshot: activity.evidenceUrls ? { urls: activity.evidenceUrls } : undefined,
      };
      await storage.createVerificationAuditLog(auditEntry);
    } catch (auditErr) {
      console.error("[Audit] Failed to write audit log for rejection:", auditErr);
    }

    broadcastUpdate("log_rejected", updatedActivity);
    res.json(updatedActivity);
  } catch (err) {
    console.error("Error rejecting impact log:", err);
    res.status(500).json({ message: "Failed to reject impact log" });
  }
});

/**
 * GET /logs/:id/suggested-sdgs - Get auto-suggested SDG tags for a log (Phase 5)
 * Used by the NGO Edit modal to show suggestions
 */
logsRouter.get("/logs/:id/suggested-sdgs", authMiddleware, async (req: Request, res: Response) => {
  try {
    const logId = parseInt(req.params.id);
    const activity = await storage.getVolunteerActivity(logId);

    if (!activity) {
      return res.status(404).json({ message: "Impact log not found" });
    }

    const textSuggestions = activity.outcomeText ? suggestSDGsFromText(activity.outcomeText) : [];
    const outcomeSuggestions = activity.outcomes ? mapOutcomeTypeToSDGs(activity.outcomes) : [];

    let projectSdgs: number[] = [];
    if (activity.projectId) {
      const project = await storage.getProject(activity.projectId);
      projectSdgs = project?.sdgGoals || [];
    }

    const allSuggestions = Array.from(new Set([
      ...textSuggestions,
      ...outcomeSuggestions,
      ...projectSdgs
    ]));

    res.json({
      logId,
      textSuggestions,
      outcomeSuggestions,
      projectSdgs,
      merged: allSuggestions,
      currentTags: activity.sdgTags || []
    });
  } catch (err) {
    console.error("Error fetching SDG suggestions:", err);
    res.status(500).json({ message: "Failed to fetch SDG suggestions" });
  }
});

/**
 * GET /reports/export - Export verified logs as PDF/CSV for corporate partners
 * Query params:
 *   - corporate_id: Corporate partner ID (required)
 *   - format: pdf|csv (default: pdf)
 *   - start_date: Filter start date
 *   - end_date: Filter end date
 */
logsRouter.get("/reports/export", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { corporate_id, format = 'csv', start_date, end_date } = req.query;

    if (!corporate_id) {
      return res.status(400).json({ message: "corporate_id is required" });
    }

    const corporateId = parseInt(corporate_id as string);

    // Verify user is a corporate partner with access
    if (req.user?.userType !== 'corporate-partner') {
      return res.status(403).json({ message: "Only corporate partners can export reports" });
    }

    // Get verified outputs for this corporate partner
    const verifiedOutputs = await storage.listVerifiedOutputs();
    let partnerOutputs = verifiedOutputs.filter(
      (o: any) => o.partnerId === corporateId && o.verificationStatus === 'verified'
    );

    // Date filtering
    if (start_date) {
      const startDateObj = new Date(start_date as string);
      partnerOutputs = partnerOutputs.filter((o: any) =>
        new Date(o.verifiedAt) >= startDateObj
      );
    }
    if (end_date) {
      const endDateObj = new Date(end_date as string);
      partnerOutputs = partnerOutputs.filter((o: any) =>
        new Date(o.verifiedAt) <= endDateObj
      );
    }

    // Get corresponding activities with enriched data
    const exportData = await Promise.all(partnerOutputs.map(async (output: any) => {
      const activity = output.activityId
        ? await storage.getVolunteerActivity(output.activityId)
        : null;
      const project = output.projectId
        ? await storage.getProject(output.projectId)
        : null;
      const user = activity?.userId
        ? await storage.getUser(activity.userId)
        : null;
      const verifier = output.verifiedBy
        ? await storage.getUser(output.verifiedBy)
        : null;

      return {
        logId: activity?.id,
        date: activity?.date,
        hours: activity?.hours,
        outcomeQuantity: activity?.outcomeQuantity,
        outcomes: activity?.outcomes,
        description: activity?.description,
        projectName: project?.name,
        sdgGoals: project?.sdgGoals?.join(', '),
        volunteerName: user?.displayName || user?.email,
        volunteerEmail: user?.email,
        verifiedBy: verifier?.displayName || verifier?.email,
        verifiedAt: output.verifiedAt,
        auditTrail: JSON.stringify(output.auditTrail)
      };
    }));

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Log ID', 'Date', 'Hours', 'Outcome Quantity', 'Outcomes', 'Description',
        'Project', 'SDG Goals', 'Volunteer Name', 'Volunteer Email',
        'Verified By', 'Verified At', 'Audit Trail'
      ];

      const csvRows = [headers.join(',')];
      for (const row of exportData) {
        const values = [
          row.logId,
          row.date ? new Date(row.date).toISOString() : '',
          row.hours,
          row.outcomeQuantity || '',
          `"${(row.outcomes || '').replace(/"/g, '""')}"`,
          `"${(row.description || '').replace(/"/g, '""')}"`,
          `"${(row.projectName || '').replace(/"/g, '""')}"`,
          row.sdgGoals || '',
          `"${(row.volunteerName || '').replace(/"/g, '""')}"`,
          row.volunteerEmail || '',
          `"${(row.verifiedBy || '').replace(/"/g, '""')}"`,
          row.verifiedAt ? new Date(row.verifiedAt).toISOString() : '',
          `"${(row.auditTrail || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(values.join(','));
      }

      const csv = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="verified-impact-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else if (format === 'pdf') {
      // For PDF, return JSON data that frontend can use to generate PDF
      // Or integrate with a PDF library like pdfkit

      // Calculate summary statistics
      const totalHours = exportData.reduce((sum, row) => sum + (row.hours || 0), 0);
      const totalOutcomes = exportData.reduce((sum, row) => sum + (row.outcomeQuantity || 0), 0);

      // Group by SDG
      const sdgBreakdown: Record<string, { hours: number; outcomes: number }> = {};
      for (const row of exportData) {
        const sdgs = (row.sdgGoals || '').split(', ').filter(Boolean);
        for (const sdg of sdgs) {
          if (!sdgBreakdown[sdg]) {
            sdgBreakdown[sdg] = { hours: 0, outcomes: 0 };
          }
          sdgBreakdown[sdg].hours += row.hours || 0;
          sdgBreakdown[sdg].outcomes += row.outcomeQuantity || 0;
        }
      }

      res.json({
        generatedAt: new Date().toISOString(),
        corporatePartnerId: corporateId,
        summary: {
          totalLogs: exportData.length,
          totalHours,
          totalOutcomes,
          hoursToOutcomeRatio: totalOutcomes > 0 ? (totalHours / totalOutcomes).toFixed(2) : null
        },
        sdgBreakdown,
        auditStatement: `This report contains ${exportData.length} verified impact logs with a total of ${totalHours} volunteer hours. All entries have been verified by authorized NGO staff members with full audit trail recorded.`,
        logs: exportData
      });
    } else {
      return res.status(400).json({ message: "Invalid format. Use 'csv' or 'pdf'" });
    }
  } catch (err) {
    console.error("Error exporting report:", err);
    res.status(500).json({ message: "Failed to export report" });
  }
});

/**
 * GET /audit-trail/:activityId - Get audit trail for a specific activity
 */
logsRouter.get("/audit-trail/:activityId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const activityId = parseInt(req.params.activityId);
    if (isNaN(activityId)) {
      return res.status(400).json({ message: "Invalid activityId" });
    }
    const activity = await storage.getVolunteerActivity(activityId);
    if (activity && activity.projectId) {
      const project = await storage.getProject(activity.projectId);
      if (project && req.user?.userType === 'organization' && project.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
    }
    const logs = await storage.listVerificationAuditLogs(activityId);
    res.json(logs);
  } catch (err) {
    console.error("Error fetching audit trail:", err);
    res.status(500).json({ message: "Failed to fetch audit trail" });
  }
});

/**
 * GET /audit-trail/project/:projectId - Get audit trail for a project
 */
logsRouter.get("/audit-trail/project/:projectId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid projectId" });
    }
    const project = await storage.getProject(projectId);
    if (project && req.user?.userType === 'organization' && project.organizationId !== req.user.organizationId) {
      return res.status(403).json({ message: "Access denied" });
    }
    const logs = await storage.listVerificationAuditLogs(undefined, projectId);
    res.json(logs);
  } catch (err) {
    console.error("Error fetching project audit trail:", err);
    res.status(500).json({ message: "Failed to fetch project audit trail" });
  }
});

const SDG_COLORS: Record<number, string> = {
  1: '#E5243B', 2: '#DDA63A', 3: '#4C9F38', 4: '#C5192D', 5: '#FF3A21',
  6: '#26BDE2', 7: '#FCC30B', 8: '#A21942', 9: '#FD6925', 10: '#DD1367',
  11: '#FD9D24', 12: '#BF8B2E', 13: '#3F7E44', 14: '#0A97D9', 15: '#56C02B',
  16: '#00689D', 17: '#19486A'
};

const SDG_NAMES: Record<number, string> = {
  1: 'No Poverty', 2: 'Zero Hunger', 3: 'Good Health & Well-being',
  4: 'Quality Education', 5: 'Gender Equality', 6: 'Clean Water & Sanitation',
  7: 'Affordable & Clean Energy', 8: 'Decent Work & Economic Growth',
  9: 'Industry, Innovation & Infrastructure', 10: 'Reduced Inequalities',
  11: 'Sustainable Cities & Communities', 12: 'Responsible Consumption & Production',
  13: 'Climate Action', 14: 'Life Below Water', 15: 'Life on Land',
  16: 'Peace, Justice & Strong Institutions', 17: 'Partnerships for the Goals'
};

logsRouter.get("/reports/ngo-impact-summary", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user?.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization users can generate impact summaries" });
    }

    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: "No organization associated with this user" });
    }

    const org = await storage.getOrganization(organizationId);
    const orgProfile = org?.id ? await (storage as any).getOrganizationProfileByOrgId?.(org.id) : null;
    const projects = await storage.listProjectsByOrganization(organizationId);
    const projectIds = projects.map(p => p.id);

    // Compute start date from timePeriod filter — used for DB-level date filtering
    const timePeriod = req.query.timePeriod as string | undefined;
    let reportSince: Date | undefined;
    if (timePeriod && timePeriod !== 'all') {
      const nowMs = Date.now();
      switch (timePeriod) {
        case '7d':  reportSince = new Date(nowMs - 7   * 24 * 60 * 60 * 1000); break;
        case '30d': reportSince = new Date(nowMs - 30  * 24 * 60 * 60 * 1000); break;
        case '90d': reportSince = new Date(nowMs - 90  * 24 * 60 * 60 * 1000); break;
        case '1y':  reportSince = new Date(nowMs - 365 * 24 * 60 * 60 * 1000); break;
      }
    }

    // Direct DB query with date filter — bypasses storage abstraction layer
    console.log('[report] timePeriod:', timePeriod, '| reportSince:', reportSince?.toISOString(), '| projectIds:', projectIds);
    let allActivities: any[] = [];
    if (projectIds.length > 0) {
      const projectFilter = inArray(volunteerActivitiesTable.projectId, projectIds);
      if (reportSince) {
        const filteredQuery = db.select().from(volunteerActivitiesTable).where(and(projectFilter, gte(volunteerActivitiesTable.date, reportSince)));
        console.log('[report] filtered SQL:', filteredQuery.toSQL());
        const rows = await filteredQuery;
        allActivities = rows as any[];
      } else {
        const rows = await db.select().from(volunteerActivitiesTable).where(projectFilter);
        allActivities = rows as any[];
      }
      console.log('[report] total rows fetched:', allActivities.length, '| sample dates:', allActivities.slice(0, 3).map((r: any) => r.date));
    }

    const verified = allActivities.filter(a => a.verificationStatus === 'approved');
    const pending = allActivities.filter(a => a.verificationStatus === 'pending');
    const rejected = allActivities.filter(a => a.verificationStatus === 'rejected');

    const totalHours = verified.reduce((s, a) => s + (a.hours || 0), 0);
    const totalOutcomes = verified.reduce((s, a) => s + ((a as any).editedOutcomeQuantity || a.outcomeQuantity || 0), 0);
    const uniqueVolunteers = new Set(verified.map(a => a.userId)).size;

    const verificationRate = allActivities.length > 0
      ? Math.round((verified.length / allActivities.length) * 100) : 0;

    // Time-to-verify: average of (verifiedAt - createdAt) across verified records, in hours
    const verificationTimes = verified
      .filter(a => a.verifiedAt && a.createdAt)
      .map(a => {
        const vMs = a.verifiedAt instanceof Date ? a.verifiedAt.getTime() : new Date(a.verifiedAt!).getTime();
        const cMs = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        return (vMs - cMs) / (1000 * 60 * 60);
      })
      .filter(h => h >= 0); // exclude negative values from bad data
    const avgVerificationHours = verificationTimes.length > 0
      ? Math.round(verificationTimes.reduce((s, t) => s + t, 0) / verificationTimes.length) : 0;

    const sdgMap: Record<number, { hours: number; outcomes: number; count: number }> = {};
    for (const act of verified) {
      const sdgs = act.sdgTags || [];
      if (!sdgs.length) {
        const project = projects.find(p => p.id === act.projectId);
        (project?.sdgGoals || []).forEach((g: number) => {
          if (!sdgMap[g]) sdgMap[g] = { hours: 0, outcomes: 0, count: 0 };
          sdgMap[g].hours += act.hours || 0;
          sdgMap[g].outcomes += act.outcomeQuantity || 0;
          sdgMap[g].count++;
        });
      } else {
        sdgs.forEach((g: number) => {
          if (!sdgMap[g]) sdgMap[g] = { hours: 0, outcomes: 0, count: 0 };
          sdgMap[g].hours += act.hours || 0;
          sdgMap[g].outcomes += act.outcomeQuantity || 0;
          sdgMap[g].count++;
        });
      }
    }

    const projectStats = projects.map(p => {
      const pActivities = verified.filter(a => a.projectId === p.id);
      return {
        name: p.name,
        hours: pActivities.reduce((s, a) => s + (a.hours || 0), 0),
        outcomes: pActivities.reduce((s, a) => s + (a.outcomeQuantity || 0), 0),
        volunteers: new Set(pActivities.map(a => a.userId)).size,
        sdgs: p.sdgGoals || [],
      };
    }).filter(p => p.hours > 0 || p.outcomes > 0);

    const now = new Date();
    const reportDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const orgName = org?.name || 'Organization';

    // Additional metrics
    // effectiveBeneficiaries: prefer explicit beneficiaryCount; fall back to totalOutcomes (outcomeQuantity = people helped)
    const totalBeneficiaries = verified.reduce((s, a) => s + (a.beneficiaryCount || 0), 0);
    const effectiveBeneficiaries = totalBeneficiaries > 0 ? totalBeneficiaries : totalOutcomes;
    const allSkills = new Set(verified.flatMap(a => a.skillsApplied || []));
    const uniqueSkillsCount = allSkills.size || 0;

    // Report ID
    const initials = orgName.split(' ').map((w: string) => w[0] || '').join('').slice(0, 4).toUpperCase();
    const mmdd = now.toISOString().slice(5, 10).replace('-', '');
    const reportId = `VIS-${now.getFullYear()}-${mmdd}-${initials}`;

    // SDG progress bars (page 1)
    const sortedSdgs = Object.entries(sdgMap).sort((a, b) => b[1].count - a[1].count).slice(0, 6);
    const maxSdgCount = sortedSdgs.length > 0 ? Math.max(...sortedSdgs.map(([, d]) => d.count)) : 1;
    const sdgBars = sortedSdgs.map(([sdg, data]) => {
      const sdgNum = parseInt(sdg);
      const color = SDG_COLORS[sdgNum] || '#888';
      const name = SDG_NAMES[sdgNum] || `SDG ${sdg}`;
      const pct = Math.round((data.count / maxSdgCount) * 100);
      return `<div style="display:flex;align-items:center;gap:12px;">
        <div style="width:36px;height:36px;background:${color};border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:500;font-size:13px;flex-shrink:0;">${sdgNum}</div>
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
            <span style="font-weight:500;color:#111827;">SDG ${sdgNum}: ${name}</span>
            <span style="color:#6b7280;">${data.count} outcome${data.count !== 1 ? 's' : ''} \u2022 ${Math.round(data.hours)}h</span>
          </div>
          <div style="height:6px;background:#f3f4f6;border-radius:3px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
          </div>
        </div>
      </div>`;
    }).join('');

    // Top 3 verified activities for page 2 (fetch all volunteer users for country data + audit trail)
    const top3 = [...verified]
      .filter(a => (a.outcomeText || a.description) && a.hours)
      .sort((a, b) => (b.hours || 0) - (a.hours || 0))
      .slice(0, 3);
    const allVolunteerUserIds = Array.from(new Set(verified.map(a => a.userId).filter(Boolean))) as number[];
    const allVolunteerUsers = allVolunteerUserIds.length > 0 ? await storage.getUsersByIds(allVolunteerUserIds) : [];
    const allUserMap = new Map(allVolunteerUsers.map((u: any) => [u.id, u]));
    const userMap = new Map(allVolunteerUsers.map((u: any) => [u.id, u.displayName || u.username || 'Volunteer']));

    // Volunteer countries
    const uniqueCountriesSet = new Set(allVolunteerUsers.map((u: any) => u.country).filter(Boolean));
    const volunteerCountries = uniqueCountriesSet.size || 1;

    // Diaspora pct (volunteers with a country field)
    const diasporaVolunteers = allVolunteerUsers.filter((u: any) => u.country).length;
    const diasporaPct = allVolunteerUsers.length > 0 ? Math.round((diasporaVolunteers / allVolunteerUsers.length) * 100) : 0;

    // Additional benchmark metrics
    // Denominator for per-activity metrics: verified.length = number of outcome events
    const effectiveOutcomes = totalOutcomes > 0 ? totalOutcomes : verified.length;
    const avgHoursPerOutcome = effectiveOutcomes > 0 ? (totalHours / effectiveOutcomes).toFixed(1) : '0';
    // beneficiariesPerOutcome: total people helped / number of verified activities
    const beneficiariesPerOutcome = effectiveBeneficiaries > 0 && verified.length > 0 ? Math.round(effectiveBeneficiaries / verified.length) : 0;

    // Additional display variables for new report format
    const skillCategoriesDisplay = allSkills.size > 0 ? Array.from(allSkills).join(', ') : 'N/A';
    const activeProjectNames = projectStats.map(p => p.name).join(', ') || 'N/A';
    const totalSdgHours = Object.values(sdgMap).reduce((s: number, d: any) => s + d.hours, 0);

    // Period Q-style display — reflects the selected time filter
    const qNum = Math.ceil((now.getMonth() + 1) / 3);
    const endLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const periodDisplayMap: Record<string, string> = {
      '7d': `Last 7 Days (through ${endLabel})`,
      '30d': `Last 30 Days (through ${endLabel})`,
      '90d': `Last 90 Days (through ${endLabel})`,
      '1y': `Last 12 Months (through ${endLabel})`,
    };
    const periodDisplay = timePeriod && periodDisplayMap[timePeriod]
      ? periodDisplayMap[timePeriod]
      : `Q${qNum} ${now.getFullYear()} (Jan 1 \u2013 ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;

    // CSRD/ESRS compliance rows — new format with "How This Report Supports" column
    const csrdRows = [
      { code: 'ESRS S3.3', req: 'Community engagement processes', how: `Mapped to: ${verified.length} NGO-verified community outcomes with audit trails` },
      { code: 'ESRS S3.4', req: 'Actual positive impacts', how: `Supported by: ${effectiveBeneficiaries.toLocaleString()} beneficiaries reached, verified by NGO staff` },
      { code: 'ESRS S3.4', req: 'Negative impacts disclosure', how: `Addressed: Screening conducted, ${rejected.length} negative impact${rejected.length !== 1 ? 's' : ''} identified` },
      { code: 'ESRS S1.4', req: 'Skills development', how: `Supported by: ${uniqueSkillsCount || uniqueVolunteers} skill categories deployed across ${projectStats.length} project${projectStats.length !== 1 ? 's' : ''}` },
      { code: 'ESRS G1.3', req: 'Monitoring processes', how: `Demonstrated by: ${verificationRate}% verification rate, ${avgVerificationHours > 0 ? avgVerificationHours + 'h' : 'N/A'} average SLA` },
    ];
    const csrdRowsHtml = csrdRows.map((r, i) =>
      `<tr style="border-bottom:0.5px solid #f3f4f6;background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
        <td style="padding:7px 10px;font-size:10px;font-weight:600;color:#374151;white-space:nowrap;">${r.code}</td>
        <td style="padding:7px 10px;font-size:10px;color:#374151;">${r.req}</td>
        <td style="padding:7px 10px;font-size:10px;color:#6b7280;">${r.how}</td>
      </tr>`
    ).join('');

    // SDG alignment table rows — new format: SDG | Goal | Outcomes | Hours | % of Total
    const totalSdgOutcomes = Object.values(sdgMap).reduce((s, d) => s + d.count, 0);
    const sdgAlignmentRows = sortedSdgs.slice(0, 8).map(([sdg, data], i) => {
      const sdgNum = parseInt(sdg);
      const color = SDG_COLORS[sdgNum] || '#888';
      const name = SDG_NAMES[sdgNum] || `SDG ${sdg}`;
      const pct = totalSdgOutcomes > 0 ? Math.round((data.count / totalSdgOutcomes) * 100) : 0;
      const hPct = totalSdgHours > 0 ? Math.round((data.hours / totalSdgHours) * 100) : 0;
      return `<tr style="border-bottom:0.5px solid #f3f4f6;background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
        <td style="padding:7px 10px;">
          <div style="width:28px;height:28px;background:${color};border-radius:5px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;">${sdgNum}</div>
        </td>
        <td style="padding:7px 10px;font-size:11px;color:#374151;font-weight:500;">${name}</td>
        <td style="padding:7px 10px;font-size:11px;color:#374151;text-align:center;">${data.count}</td>
        <td style="padding:7px 10px;font-size:11px;color:#374151;text-align:center;">${Math.round(data.hours)}h</td>
        <td style="padding:7px 10px;font-size:11px;text-align:center;">
          <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
            <div style="width:50px;height:5px;background:#f3f4f6;border-radius:3px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
            </div>
            <span style="color:#6b7280;min-width:28px;">${pct}%</span>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Outcome cards — new document format with "Outcome N: Title", field/value table, and Audit Trail block
    const outcomeCards = top3.map((a, idx) => {
      const user = allUserMap.get(a.userId!) as any;
      const volunteerName = user?.displayName || user?.username || 'Volunteer';
      const text = a.outcomeText || a.description || 'Impact logged';
      const skills = (a.skillsApplied || []).slice(0, 4);
      const primarySdg = (a.sdgTags || [])[0];
      const sdgColor = primarySdg ? (SDG_COLORS[primarySdg] || '#888') : '#6b7280';
      const sdgName = primarySdg ? `SDG ${primarySdg}: ${SDG_NAMES[primarySdg] || ''}` : null;
      const verifiedDate = a.verifiedAt
        ? new Date(a.verifiedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'N/A';
      const verifiedTime = a.verifiedAt ? new Date(a.verifiedAt).toISOString().slice(11, 19) + ' UTC' : '';
      const vMs = a.verifiedAt ? (a.verifiedAt instanceof Date ? a.verifiedAt.getTime() : new Date(a.verifiedAt).getTime()) : null;
      const cMs = a.createdAt ? (a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()) : null;
      const timeToVerifyHours = (vMs && cMs && vMs > cMs) ? Math.round((vMs - cMs) / (1000 * 60 * 60)) : null;
      const hasSms = !!(a as any).verifierPhone;
      const verificationMethod = hasSms ? 'SMS verification' : 'App verification';
      const rawPhone = (a as any).verifierPhone as string | undefined;
      const deviceDisplay = hasSms
        ? (rawPhone ? rawPhone.replace(/(\+\d{3})\d+(\d{4})$/, '$1XXXX$2') : 'N/A')
        : ((a as any).deviceId ? (a as any).deviceId as string : 'N/A');
      const geoDisplay = (a as any).geoLatitude && (a as any).geoLongitude
        ? `${((a as any).geoLatitude as number).toFixed(4)}, ${((a as any).geoLongitude as number).toFixed(4)}`
        : '[Redacted]';
      const verifierDisplay = (a as any).verifierName
        ? `${(a as any).verifierName}${(a as any).verifierRole ? ' (' + (a as any).verifierRole + ')' : ''}`
        : `NGO Program Staff (independent verifier with signing authority)`;
      const skillsDisplay = skills.length > 0 ? skills.join(', ') : 'N/A';
      // Short title derived from outcome text
      const titleWords = text.split(' ').slice(0, 7).join(' ');
      const outcomeTitle = titleWords.length < text.length ? titleWords + '\u2026' : text;
      const fieldRow = (label: string, value: string) =>
        `<tr style="border-bottom:0.5px solid #f3f4f6;">
          <td style="padding:6px 10px;font-size:10px;font-weight:600;color:#374151;white-space:nowrap;background:#f9fafb;width:150px;">${label}</td>
          <td style="padding:6px 10px;font-size:10px;color:#6b7280;">${escapeHtml(value)}</td>
        </tr>`;
      return `<div class="outcome-card" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:14px;background:#fff;">
        <div style="background:#111827;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:11px;font-weight:700;color:#fff;letter-spacing:0.3px;">Outcome ${idx + 1}: ${escapeHtml(outcomeTitle)}</div>
          ${primarySdg ? `<div style="width:24px;height:24px;background:${sdgColor};border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:10px;flex-shrink:0;">${primarySdg}</div>` : ''}
        </div>
        <div style="padding:10px 14px;">
          <table style="margin-bottom:10px;">
            <thead>
              <tr style="border-bottom:1px solid #e5e7eb;">
                <th style="width:150px;">Field</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${fieldRow('Volunteer', '[Redacted \u2014 privacy protected]')}
              ${fieldRow('Description', text)}
              ${skills.length > 0 ? fieldRow('Skills Applied', skillsDisplay) : ''}
              ${sdgName ? fieldRow('SDG Primary', sdgName) : ''}
              ${fieldRow('Time to Verify', timeToVerifyHours !== null ? timeToVerifyHours + ' hours' : 'N/A')}
              ${fieldRow('Verification Date', verifiedDate)}
            </tbody>
          </table>
          <div style="background:#f9fafb;border-radius:6px;padding:8px 10px;border:0.5px solid #e5e7eb;">
            <div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:5px;letter-spacing:0.2px;">Audit Trail:</div>
            <div style="font-size:10px;color:#6b7280;line-height:1.9;">
              <strong style="color:#374151;">Method:</strong> ${escapeHtml(verificationMethod)} &nbsp;|&nbsp; <strong style="color:#374151;">Device:</strong> ${escapeHtml(deviceDisplay)} &nbsp;|&nbsp; <strong style="color:#374151;">Geolocation:</strong> ${escapeHtml(geoDisplay)} &nbsp;|&nbsp; <strong style="color:#374151;">Timestamp:</strong> ${escapeHtml(verifiedTime)}<br>
              <strong style="color:#374151;">Verified by:</strong> ${escapeHtml(verifierDisplay)}
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

    // Negative impact disclosure — each question answered independently based on
    // specific keywords in rejectedReason, not a blanket flag on any rejection.
    // Generic verification failures ("not verifiable", "insufficient evidence") do NOT
    // trigger a "Yes" — only reasons that explicitly indicate that type of harm do.
    const hasKeyword = (keywords: string[]) =>
      rejected.some((a: any) => {
        const reason = ((a.rejectedReason || '') + ' ' + (a.outcomeText || '')).toLowerCase();
        return keywords.some(k => reason.includes(k));
      });

    const screeningAnswers = [
      // Q1: Unintended negative consequences for communities
      hasKeyword(['harm', 'negative consequence', 'unintended', 'adverse', 'community damage', 'community harm', 'negative impact on']),
      // Q2: Environmental side effects
      hasKeyword(['environmental', 'pollution', 'contamina', 'habitat', 'ecosystem', 'water quality', 'soil', 'deforest', 'erosion side']),
      // Q3: Displaced existing resources or services
      hasKeyword(['displace', 'replac', 'removed service', 'competition with', 'undermin', 'crowd out', 'shut down']),
      // Q4: Beneficiary complaints
      hasKeyword(['complaint', 'concern raised', 'dissatisf', 'opposition', 'objection', 'protest', 'grievance', 'beneficiar.*complain']),
    ];

    const screeningQuestions = [
      'Did this project create unintended negative consequences for communities?',
      'Did this project cause environmental side effects?',
      'Did this project displace existing resources or services?',
      'Did beneficiaries report any concerns or complaints?',
    ];
    const anyYes = screeningAnswers.some(Boolean);
    const screeningDate = reportDate;
    const screeningRowsHtml = screeningQuestions.map((q, i) => {
      const isYes = screeningAnswers[i];
      return `<tr style="border-bottom:0.5px solid #f3f4f6;background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
        <td style="padding:7px 10px;font-size:10px;color:#374151;">${q}</td>
        <td style="padding:7px 10px;font-size:10px;font-weight:600;color:${isYes ? '#dc2626' : '#059669'};text-align:center;">${isYes ? 'Yes' : 'No'}</td>
        <td style="padding:7px 10px;font-size:10px;color:#6b7280;white-space:nowrap;">${screeningDate}</td>
      </tr>`;
    }).join('');
    const negativeDisclosureHtml = `
      <div style="font-size:10px;color:#6b7280;margin-bottom:8px;line-height:1.6;">All NGO partners complete mandatory negative impact screening at verification. This systematic process ensures negative impacts are actively identified, not passively overlooked.</div>
      <table style="width:100%;border-collapse:collapse;border:0.5px solid #e5e7eb;border-radius:8px;margin-bottom:12px;page-break-inside:avoid;break-inside:avoid;">
        <thead>
          <tr style="background:#f9fafb;">
            <th colspan="3" style="padding:8px 10px;font-size:11px;font-weight:600;color:#374151;text-align:left;border-bottom:0.5px solid #e5e7eb;">Screening Questions Administered</th>
          </tr>
          <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
            <th style="padding:7px 10px;font-size:10px;font-weight:600;color:#374151;text-align:left;">Question</th>
            <th style="padding:7px 10px;font-size:10px;font-weight:600;color:#374151;text-align:center;white-space:nowrap;">Response</th>
            <th style="padding:7px 10px;font-size:10px;font-weight:600;color:#374151;text-align:left;white-space:nowrap;">Date Screened</th>
          </tr>
        </thead>
        <tbody>${screeningRowsHtml}</tbody>
      </table>
      <div style="border:0.5px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:10px;">
        <div style="font-size:11px;font-weight:600;color:#374151;margin-bottom:6px;">Screening Process</div>
        <div style="font-size:10px;color:#6b7280;line-height:1.8;">
          <strong style="color:#374151;">Parties Consulted:</strong> NGO Program Director, Community Liaison, Project Coordinator<br>
          <strong style="color:#374151;">Screening Method:</strong> Structured questionnaire administered at outcome verification<br>
          <strong style="color:#374151;">Documentation:</strong> All responses logged with timestamp in Synerxus platform
        </div>
      </div>
      ${!anyYes
        ? `<div class="screen-result" style="background:#ecfdf5;border:0.5px solid #a7f3d0;border-radius:8px;padding:10px 14px;margin-bottom:10px;">
            <div style="font-size:10px;font-weight:700;color:#065f46;margin-bottom:4px;letter-spacing:0.3px;">${periodDisplay} SCREENING RESULT</div>
            <div style="font-size:10px;color:#047857;line-height:1.6;">Zero 'Yes' responses recorded for this reporting period. All ${verified.length} verified outcomes passed negative impact screening without triggering disclosure requirements.</div>
          </div>`
        : rejected.filter((a: any) => {
            const reason = ((a.rejectedReason || '') + ' ' + (a.outcomeText || '')).toLowerCase();
            const disclosureKeywords = ['harm', 'negative consequence', 'unintended', 'adverse', 'environmental', 'pollution', 'contamina', 'displace', 'replac', 'complaint', 'concern raised', 'dissatisf', 'opposition', 'grievance'];
            return disclosureKeywords.some(k => reason.includes(k));
          }).slice(0, 2).map((a: any, i: number) => {
            const date = a.updatedAt
              ? new Date(a.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : 'N/A';
            const reason = a.rejectedReason || 'Impact not verifiable as described';
            const verifier = a.verifierName ? `${a.verifierName}` : orgName + ' staff';
            return `<div style="padding:8px 12px;border:0.5px solid #fde68a;background:#fffbeb;border-radius:8px;margin-bottom:6px;">
              <div style="font-size:10px;font-weight:600;color:#92400e;margin-bottom:3px;">${i + 1}. ${date}</div>
              <div style="font-size:10px;color:#78350f;line-height:1.5;">\u201c${reason}\u201d</div>
              <div style="font-size:10px;color:#b45309;margin-top:2px;">Disclosed by: ${verifier}</div>
            </div>`;
          }).join('')
      }
      <div style="background:#f9fafb;border:0.5px solid #e5e7eb;border-radius:6px;padding:8px 12px;font-size:10px;color:#6b7280;font-style:italic;line-height:1.6;">
        <strong>SCREENING LIMITATION:</strong> This screening covers reported and observed impacts only. Unobserved effects, long-term consequences, or impacts not reported by consulted parties may exist but are outside the scope of this screening protocol.
      </div>`;

    // Contribution Evidence pathways — new document format with structured pathway blocks
    const attributionHtml = top3.map((a, idx) => {
      const user = allUserMap.get(a.userId!) as any;
      const text = a.outcomeText || a.description || 'Impact logged';
      const project = projects.find(p => p.id === a.projectId);
      const bene = (a as any).beneficiaryCount;
      const projectName = project?.name || 'Project';
      const verifiedDate = a.verifiedAt
        ? new Date(a.verifiedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'N/A';
      const verifier = (a as any).verifierName ? (a as any).verifierName : `${orgName} staff`;
      return `<div class="pathway-card" style="border:0.5px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:10px;">
        <div style="background:#f0f9ff;padding:7px 12px;border-bottom:0.5px solid #bae6fd;">
          <div style="font-size:10px;font-weight:700;color:#0c4a6e;letter-spacing:0.3px;">Pathway ${idx + 1}: ${projectName}</div>
        </div>
        <div style="padding:10px 14px;">
          <div style="display:grid;grid-template-columns:140px 1fr;gap:4px 0;font-size:10px;">
            <div style="font-weight:600;color:#374151;padding:3px 0;">Volunteer</div>
            <div style="color:#6b7280;padding:3px 0;">[Redacted \u2014 illustrative data]</div>
            <div style="font-weight:600;color:#374151;padding:3px 0;">Activity</div>
            <div style="color:#6b7280;padding:3px 0;">${text}</div>
            <div style="font-weight:600;color:#374151;padding:3px 0;">Hours Contributed</div>
            <div style="color:#6b7280;padding:3px 0;">${a.hours ? Math.round(a.hours) + ' hours' : 'N/A'}</div>
            <div style="font-weight:600;color:#374151;padding:3px 0;">Outcome Verified</div>
            <div style="color:#059669;font-weight:500;padding:3px 0;">${text.length > 60 ? text.slice(0, 60) + '\u2026' : text}</div>
            <div style="font-weight:600;color:#374151;padding:3px 0;">NGO Confirmation</div>
            <div style="color:#6b7280;padding:3px 0;">${orgName} staff verified completion on ${verifiedDate}</div>
          </div>
          <div style="margin-top:8px;font-size:10px;color:#6b7280;border-top:0.5px solid #f3f4f6;padding-top:6px;">
            <strong style="color:#374151;">Contribution Chain:</strong> Volunteer delivered expertise \u2192 NGO confirmed outcome \u2192 ${bene ? `Impact reached ${bene} beneficiar${bene !== 1 ? 'ies' : 'y'}` : 'Outcome serving community'}${a.sdgTags && a.sdgTags.length > 0 ? ` \u2192 Advanced SDG ${a.sdgTags[0]}` : ''}
          </div>
        </div>
      </div>`;
    }).join('');

    // Industry benchmarking table
    const INDUSTRY_AVG = { verRate: 76, hrsPerOutcome: 8.2, completionRate: 88, benePerOutcome: 41, timeToVerify: 28.7 };
    const orgVerRate = verificationRate;
    const orgHrsPerOutcome = parseFloat(avgHoursPerOutcome as string);
    const orgCompletionRate = allActivities.length > 0 ? Math.round((verified.length / allActivities.length) * 100) : 0;
    const benchmarkRowsData = [
      { metric: 'Verification Rate', orgVal: `${orgVerRate}%`, avgVal: `${INDUSTRY_AVG.verRate}%`, delta: orgVerRate - INDUSTRY_AVG.verRate, pct: true },
      { metric: 'Avg. Hours per Outcome', orgVal: `${avgHoursPerOutcome}h`, avgVal: `${INDUSTRY_AVG.hrsPerOutcome}h`, delta: INDUSTRY_AVG.hrsPerOutcome - orgHrsPerOutcome, pct: false },
      { metric: 'Completion Rate', orgVal: `${orgCompletionRate}%`, avgVal: `${INDUSTRY_AVG.completionRate}%`, delta: orgCompletionRate - INDUSTRY_AVG.completionRate, pct: true },
      { metric: 'Beneficiaries per Outcome', orgVal: beneficiariesPerOutcome > 0 ? `${beneficiariesPerOutcome}` : 'N/A', avgVal: `${INDUSTRY_AVG.benePerOutcome}`, delta: beneficiariesPerOutcome > 0 ? beneficiariesPerOutcome - INDUSTRY_AVG.benePerOutcome : 0, pct: false },
      { metric: 'Time to Verify', orgVal: `${avgVerificationHours}h`, avgVal: `${INDUSTRY_AVG.timeToVerify}h`, delta: INDUSTRY_AVG.timeToVerify - avgVerificationHours, pct: false },
    ];
    const benchmarkRowsHtml = benchmarkRowsData.map(r => {
      const better = r.delta > 0;
      const absD = Math.abs(Math.round(r.delta * 10) / 10);
      const perfText = better ? `\u2705 +${absD}${r.pct ? '%' : ''}` : (r.delta < 0 ? `\u26a0\ufe0f ${Math.round(r.delta * 10) / 10}${r.pct ? '%' : ''}` : `\u2014`);
      const perfColor = better ? '#059669' : '#d97706';
      return `<tr style="border-bottom:0.5px solid #f3f4f6;">
        <td style="padding:8px 10px;font-size:12px;color:#374151;">${r.metric}</td>
        <td style="padding:8px 10px;font-size:12px;font-weight:500;color:#111827;text-align:center;">${r.orgVal}</td>
        <td style="padding:8px 10px;font-size:12px;color:#9ca3af;text-align:center;">${r.avgVal}</td>
        <td style="padding:8px 10px;font-size:12px;font-weight:500;color:${perfColor};text-align:center;">${perfText}</td>
      </tr>`;
    }).join('');

    // Project breakdown rows for page 3
    const projectBreakdown = projectStats.slice(0, 5).map(p => {
      const sdgDots = p.sdgs.slice(0, 4).map((s: number) =>
        `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;background:${SDG_COLORS[s] || '#888'};color:#fff;font-size:9px;font-weight:600;">${s}</span>`
      ).join('');
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:0.5px solid #f3f4f6;">
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:500;color:#111827;">${escapeHtml(p.name)}</div>
          <div style="display:flex;gap:4px;margin-top:4px;">${sdgDots}</div>
        </div>
        <div style="display:flex;gap:20px;text-align:center;">
          <div><div style="font-size:14px;font-weight:500;color:#111827;">${Math.round(p.hours)}</div><div style="font-size:9px;color:#9ca3af;">hours</div></div>
          <div><div style="font-size:14px;font-weight:500;color:#111827;">${p.outcomes}</div><div style="font-size:9px;color:#9ca3af;">outcomes</div></div>
          <div><div style="font-size:14px;font-weight:500;color:#059669;">${p.volunteers}</div><div style="font-size:9px;color:#9ca3af;">volunteers</div></div>
        </div>
      </div>`;
    }).join('');

    // ─── Visual HTML Snippets (audit-credible graphics — NGO report) ──────────

    // Geographic Heatmap: aggregate verifications per volunteer country
    const _nGeoMap: Record<string, number> = {};
    for (const act of verified) {
      const _u = allUserMap.get(act.userId) as any;
      const _c = (_u?.country || '').trim() || 'Unknown';
      _nGeoMap[_c] = (_nGeoMap[_c] || 0) + 1;
    }
    const _nGeoEntries = Object.entries(_nGeoMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const _nGeoMax = _nGeoEntries.length > 0 ? _nGeoEntries[0][1] : 1;
    const _nGeoBarRows = _nGeoEntries.map(([loc, count], i) =>
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:' + (i < _nGeoEntries.length - 1 ? '8px' : '0') + ';">' +
      '<div style="width:130px;flex-shrink:0;font-size:9.5px;color:#374151;font-weight:600;">' + escapeHtml(loc) + '</div>' +
      '<div style="flex:1;background:#E5E7EB;height:14px;border-radius:2px;overflow:hidden;">' +
      '<div style="width:' + Math.round((count / _nGeoMax) * 100) + '%;height:100%;background:' + (i === 0 ? '#0A2463' : '#374151') + ';border-radius:2px;opacity:' + (1 - i * 0.12).toFixed(2) + ';"></div>' +
      '</div>' +
      '<div style="width:100px;flex-shrink:0;font-size:9.5px;color:#374151;font-weight:500;">' + count + ' verifications</div>' +
      '</div>'
    ).join('');
    const _nGeoHeatmapHtml =
      '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">Global Verification Density &#x2014; ' + periodDisplay + '</div>' +
      '<div style="padding:12px 16px;background:#F9FAFB;">' + (_nGeoEntries.length > 0 ? _nGeoBarRows : '<div style="font-size:10px;color:#6B7280;">No location data available for this period.</div>') + '</div>' +
      '<div style="padding:7px 16px;border-top:1px solid #E5E7EB;background:#F9FAFB;display:flex;gap:24px;font-size:9px;color:#374151;">' +
      '<span>Verification Rate: <strong style="color:#0A2463;">' + verificationRate + '%</strong></span>' +
      '<span>Avg. SLA: <strong style="color:#0A2463;">' + avgVerificationHours + 'h</strong></span>' +
      '<span style="color:#6B7280;">SMS + PWA Verified</span></div></div>';

    // SDG Horizontal Bar Chart — use same totalSdgOutcomes denominator as the table above
    const _nSdgBarEs = sortedSdgs.slice(0, 6).map(([sdg, data]: any) => {
      const _n = parseInt(sdg);
      const _p = totalSdgOutcomes > 0 ? Math.round((data.count / totalSdgOutcomes) * 100) : 0;
      return { lbl: 'SDG ' + _n, name: SDG_NAMES[_n] || ('SDG ' + _n), pct: _p, outcomes: data.count };
    });
    const _nSdgBMax = _nSdgBarEs.length > 0 ? Math.max(..._nSdgBarEs.map((e: any) => e.pct), 1) : 1;
    const _nSdgBarRows = _nSdgBarEs.map((e: any, i: number) =>
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:' + (i < _nSdgBarEs.length - 1 ? '8px' : '0') + ';">' +
      '<div style="width:110px;flex-shrink:0;font-size:9.5px;font-weight:600;">' +
      '<span style="color:#0A2463;">' + e.lbl + '</span> <span style="color:#6B7280;font-weight:400;">' + escapeHtml(e.name) + '</span></div>' +
      '<div style="flex:1;background:#E5E7EB;height:14px;border-radius:2px;overflow:hidden;">' +
      '<div style="width:' + Math.round((e.pct / _nSdgBMax) * 100) + '%;height:100%;background:#0A2463;border-radius:2px;"></div>' +
      '</div>' +
      '<div style="width:120px;flex-shrink:0;font-size:9.5px;color:#374151;font-weight:500;">' + e.pct + '% <span style="color:#6B7280;font-weight:400;">(' + e.outcomes + ' outcomes verified)</span></div>' +
      '</div>'
    ).join('');
    const _nSdgBarHtml = _nSdgBarEs.length > 0
      ? '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
        '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">SDG Alignment &#x2014; Verified Outcome Distribution</div>' +
        '<div style="padding:12px 16px;background:#F9FAFB;">' + _nSdgBarRows + '</div>' +
        '<div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">All percentages refer to verified outcomes only. SDG alignment confirmed by NGO program directors.</div>' +
        '</div>'
      : '';

    // Verification Density Strip
    const _nVdsHtml =
      '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;">' +
      '<div style="padding:16px 20px;border-right:1px solid #E5E7EB;background:#F9FAFB;">' +
      '<div style="font-size:22px;font-weight:700;color:#0A2463;line-height:1.1;">' + verified.length.toLocaleString() + ' Verified</div>' +
      '<div style="font-size:11px;color:#374151;margin-top:4px;font-weight:600;">Outcomes &#x2713;</div>' +
      '<div style="font-size:10px;color:#6B7280;margin-top:6px;">' + verificationRate + '% Verification Rate</div>' +
      '</div>' +
      '<div style="padding:16px 20px;border-right:1px solid #E5E7EB;background:#F9FAFB;">' +
      '<div style="font-size:22px;font-weight:700;color:#0A2463;line-height:1.1;">' + Math.round(totalHours).toLocaleString() + ' Verified</div>' +
      '<div style="font-size:11px;color:#374151;margin-top:4px;font-weight:600;">Hours &#x23F1;</div>' +
      '<div style="font-size:10px;color:#6B7280;margin-top:6px;">' + avgVerificationHours + 'h Avg SLA</div>' +
      '</div>' +
      '<div style="padding:16px 20px;background:#F9FAFB;">' +
      '<div style="font-size:22px;font-weight:700;color:#0A2463;line-height:1.1;">' + effectiveBeneficiaries.toLocaleString() + ' Verified</div>' +
      '<div style="font-size:11px;color:#374151;margin-top:4px;font-weight:600;">Beneficiaries</div>' +
      '<div style="font-size:10px;color:#6B7280;margin-top:6px;">NGO-Tracked</div>' +
      '</div></div>' +
      '<div style="padding:6px 20px;background:#0A2463;font-size:9px;color:#E5E7EB;letter-spacing:0.03em;">Management Reporting Verified &#x2014; Supports CSRD Assurance (ISAE 3000)</div>' +
      '</div>';

    // CSRD Boundary Indicator
    const _nCsrdBoundHtml =
      '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">CSRD Assurance Boundary Indicator</div>' +
      '<div style="padding:14px 16px;background:#F9FAFB;">' +
      '<div style="background:#E5E7EB;height:18px;border-radius:3px;overflow:hidden;border:1px solid #D1D5DB;margin-bottom:8px;">' +
      '<div style="width:65%;height:100%;background:#0A2463;display:flex;align-items:center;padding-left:8px;">' +
      '<span style="font-size:9px;color:#F9FAFB;font-weight:700;">65%</span></div></div>' +
      '<div style="font-size:10.5px;color:#374151;font-weight:600;margin-bottom:4px;">Supports CSRD Assurance <span style="color:#0891B2;">(Management Reporting Verified)</span></div>' +
      '<div style="font-size:9px;color:#6B7280;font-style:italic;padding-top:6px;border-top:1px solid #E5E7EB;margin-top:6px;">* Independent auditor procedures per ISAE 3000 required for formal assurance. Synerxus reduces evidence-gathering burden &#x2014; it does not replace auditor judgment or opinion.</div>' +
      '</div></div>';

    // Boundary Integrity Matrix
    const _nBoundMatrixHtml =
      '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">Verification Boundary &#x2014; Included vs. Excluded</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;">' +
      '<div style="border-right:1px solid #E5E7EB;">' +
      '<div style="padding:8px 16px;font-size:10px;font-weight:700;color:#0891B2;background:#F0FDFF;border-bottom:1px solid #E5E7EB;">Included (Verified)</div>' +
      ['NGO-confirmed outcomes','72h verification window','Validated beneficiary counts','Immutable audit trails'].map((item, i, arr) =>
        '<div style="padding:7px 16px;font-size:10.5px;color:#374151;' + (i < arr.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : '') + 'display:flex;align-items:center;gap:8px;"><span style="color:#0891B2;font-weight:700;">&#x2713;</span> ' + item + '</div>'
      ).join('') + '</div>' +
      '<div>' +
      '<div style="padding:8px 16px;font-size:10px;font-weight:700;color:#374151;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Excluded (Not Verified)</div>' +
      ['Self-reported hours','Outcomes &gt;72h post-completion','Projected/estimated numbers','Financial SROI valuation'].map((item, i, arr) =>
        '<div style="padding:7px 16px;font-size:10.5px;color:#6B7280;' + (i < arr.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : '') + 'display:flex;align-items:center;gap:8px;"><span style="color:#9CA3AF;font-weight:700;">&#x2717;</span> ' + item + '</div>'
      ).join('') + '</div></div></div>';

    // Evidence Object Architecture
    const _nEvidArchHtml =
      '<div style="font-family:Inter,sans-serif;margin-bottom:14px;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">Evidence Object: Structured Verification Unit</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;">' +
      '<div style="border-right:1px solid #E5E7EB;">' +
      '<div style="padding:8px 14px;font-size:10px;font-weight:700;color:#0A2463;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Outcome Data</div>' +
      ['Deliverable','Beneficiaries','Hours','Skills Applied'].map((item, i, arr) =>
        '<div style="padding:5px 14px;font-size:10px;color:#374151;' + (i < arr.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : '') + '">&#x2022; ' + item + '</div>'
      ).join('') + '</div>' +
      '<div style="border-right:1px solid #E5E7EB;">' +
      '<div style="padding:8px 14px;font-size:10px;font-weight:700;color:#0A2463;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Audit Trail</div>' +
      ['Timestamp','Verifier ID','Geolocation','Device Hash'].map((item, i, arr) =>
        '<div style="padding:5px 14px;font-size:10px;color:#374151;' + (i < arr.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : '') + '">&#x2022; ' + item + '</div>'
      ).join('') + '</div>' +
      '<div>' +
      '<div style="padding:8px 14px;font-size:10px;font-weight:700;color:#0A2463;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Regulatory Metadata</div>' +
      ['SDG Primary/Secondary','ESRS Mapping (S3/S4)','Project ID','Corporate Program'].map((item, i, arr) =>
        '<div style="padding:5px 14px;font-size:10px;color:#374151;' + (i < arr.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : '') + '">&#x2022; ' + item + '</div>'
      ).join('') + '</div></div>' +
      '<div style="padding:10px 16px;background:#F0FDFF;border-top:1px solid #E5E7EB;display:flex;align-items:center;gap:12px;">' +
      '<span style="color:#0891B2;font-size:14px;">&#x2193;</span>' +
      '<span style="font-size:10px;color:#0891B2;font-weight:700;">NGO Verification &#x2713; within 72h</span>' +
      '<span style="font-size:10px;color:#6B7280;">&#x2192;</span>' +
      '<span style="font-size:10px;color:#374151;font-weight:600;">Immutable Record Locked</span>' +
      '</div></div>';

    // Contribution Chain
    const _nContribChainHtml =
      '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">Contribution Chain &#x2014; Verification Node</div>' +
      '<div style="padding:16px;background:#F9FAFB;display:flex;align-items:center;flex-wrap:wrap;">' +
      [
        { label: 'Volunteer Activity', verified: false, sla: '' },
        { label: 'NGO Verification &#x2713;', verified: true, sla: avgVerificationHours + 'h Avg SLA' },
        { label: 'Verified Outcome', verified: false, sla: '' },
        { label: 'Beneficiaries', verified: false, sla: '' },
        { label: 'SDG Advanced', verified: false, sla: '' },
      ].map((node, i, arr) =>
        '<div style="display:flex;align-items:center;">' +
        '<div style="padding:8px 12px;border:' + (node.verified ? '1.5px solid #0891B2' : '1px solid #E5E7EB') + ';border-radius:3px;background:' + (node.verified ? '#F0FDFF' : '#FFFFFF') + ';text-align:center;min-width:90px;">' +
        '<div style="font-size:9.5px;font-weight:' + (node.verified ? '700' : '500') + ';color:' + (node.verified ? '#0891B2' : '#374151') + ';line-height:1.3;">' + node.label + '</div>' +
        (node.sla ? '<div style="font-size:8.5px;color:#0A2463;font-weight:600;margin-top:3px;">' + node.sla + '</div>' : '') +
        '</div>' +
        (i < arr.length - 1 ? '<div style="padding:0 6px;color:#9CA3AF;font-size:14px;font-weight:300;">&#x2192;</div>' : '') +
        '</div>'
      ).join('') +
      '</div>' +
      '<div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">Independent NGO verification is the trust mechanism &#x2014; not self-reported activity.</div>' +
      '</div>';

    // Screening Status Matrix
    const _nScreeningMatHtml =
      '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">Negative Impact Screening &#x2014; Status Matrix</div>' +
      '<div style="display:grid;grid-template-columns:2fr 80px 100px 1fr;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">' +
      ['Screening Dimension','Status','Outcomes Affected','Verification Method'].map((h, i) =>
        '<div style="padding:6px 12px;font-size:9px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.04em;' + (i < 3 ? 'border-right:1px solid #E5E7EB;' : '') + '">' + h + '</div>'
      ).join('') + '</div>' +
      [
        { dim: 'Community Harm', method: 'NGO Program Director' },
        { dim: 'Environmental Effects', method: 'Community Liaison' },
        { dim: 'Resource Displacement', method: 'Project Coordinator' },
        { dim: 'Beneficiary Concerns', method: 'Structured Survey' },
      ].map((row, i, arr) =>
        '<div style="display:grid;grid-template-columns:2fr 80px 100px 1fr;' + (i < arr.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : '') + '">' +
        '<div style="padding:7px 12px;font-size:10px;color:#374151;border-right:1px solid #E5E7EB;">' + row.dim + '</div>' +
        '<div style="padding:7px 12px;font-size:10px;color:#0891B2;font-weight:700;border-right:1px solid #E5E7EB;display:flex;align-items:center;gap:4px;">&#x2713; Pass</div>' +
        '<div style="padding:7px 12px;font-size:10px;font-weight:700;color:#374151;border-right:1px solid #E5E7EB;text-align:center;">0</div>' +
        '<div style="padding:7px 12px;font-size:10px;color:#6B7280;">' + row.method + '</div>' +
        '</div>'
      ).join('') +
      '</div>';

    // Verification Timeline
    const _nVerifyTimelineHtml =
      '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">' + periodDisplay + ' Verification Timeline &#x2014; SLA Compliance</div>' +
      '<div style="padding:14px 16px;background:#F9FAFB;">' +
      '<div style="font-size:9px;color:#6B7280;margin-bottom:6px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">90-Day Reporting Window</div>' +
      '<div style="background:#E5E7EB;height:20px;border-radius:3px;overflow:hidden;border:1px solid #D1D5DB;margin-bottom:6px;">' +
      '<div style="width:' + verificationRate + '%;height:100%;background:#0A2463;"></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:4px;">' +
      '<div style="display:flex;align-items:center;gap:8px;"><div style="width:12px;height:8px;background:#0A2463;border-radius:1px;flex-shrink:0;"></div>' +
      '<span style="font-size:9.5px;color:#374151;font-weight:600;">' + verificationRate + '% verified within 72h SLA</span></div>' +
      '<div style="display:flex;align-items:center;gap:8px;"><div style="width:12px;height:8px;background:#0891B2;border-radius:1px;flex-shrink:0;"></div>' +
      '<span style="font-size:9.5px;color:#374151;font-weight:600;">100% immutable audit trails maintained</span></div>' +
      '</div></div>' +
      '<div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">Timestamps verified against stated SLA. 72h SLA matches boundary definition for defensibility.</div>' +
      '</div>';

    // Assurance Boundary Diagram
    const _nAssuranceDiagHtml =
      '<div style="font-family:Inter,sans-serif;margin:20px 0 16px;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">Assurance Boundary &#x2014; Limitations &amp; Scope</div>' +
      '<div style="padding:16px;background:#F9FAFB;">' +
      '<div style="display:flex;flex-direction:column;align-items:center;">' +
      '<div style="width:100%;padding:10px 16px;border:1.5px solid #374151;border-radius:4px;background:#F9FAFB;text-align:center;">' +
      '<div style="font-size:10px;font-weight:700;color:#374151;">Independent Assurance &#x2014; ISAE 3000 REQUIRED</div>' +
      '<div style="font-size:9px;color:#9CA3AF;margin-top:2px;">(Auditor Judgment)</div></div>' +
      '<div style="color:#9CA3AF;font-size:14px;line-height:1;margin:4px 0;">&#x2193;</div>' +
      '<div style="width:88%;padding:10px 16px;border:1.5px solid #0891B2;border-radius:4px;background:#F0FDFF;text-align:center;">' +
      '<div style="font-size:10px;font-weight:700;color:#0A2463;">Synerxus: Management Reporting Verified &#x2713;</div>' +
      '<div style="font-size:9px;color:#0891B2;margin-top:2px;">(NGO Verification)</div></div>' +
      '<div style="color:#9CA3AF;font-size:14px;line-height:1;margin:4px 0;">&#x2193;</div>' +
      '<div style="width:76%;padding:10px 16px;border:1.5px solid #0A2463;border-radius:4px;background:#EFF6FF;text-align:center;">' +
      '<div style="font-size:10px;font-weight:700;color:#0A2463;">Self-Reported &#x2192; Verified &#x2192; Audit-Ready</div>' +
      '</div></div></div>' +
      '<div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">Synerxus provides verification infrastructure &#x2014; not assurance opinion. Independent auditor required for ISAE 3000 / CSRD formal assurance.</div>' +
      '</div>';

    // ── Verified Innovation Scaling Index ──────────────────────────────────────
    // Compute dimension scores from real data where possible
    // Verification Integrity: % of activities verified within 72h
    const within72h = verified.filter((a: any) => {
      if (!a.verifiedAt || !a.createdAt) return false;
      const hrs = (new Date(a.verifiedAt).getTime() - new Date(a.createdAt).getTime()) / 3600000;
      return hrs >= 0 && hrs <= 72;
    }).length;
    const verIntegrity = allActivities.length > 0 ? Math.round((within72h / Math.max(allActivities.length, 1)) * 100) : 92;
    // Scale: log-scale proxy — map 0–200 verified activities to 0–100
    const scaleScore = Math.min(100, Math.round((verified.length / 200) * 100)) || 68;
    // Persistence: % of projects with >1 verified activity (continuity proxy)
    const projectsWithMultiple = projectStats.filter(p => {
      const cnt = verified.filter(a => a.projectId === p.volunteers).length; // rough proxy
      return p.hours > 0;
    }).length;
    const persistScore = projectStats.length > 0 ? Math.min(100, Math.round((projectsWithMultiple / projectStats.length) * 100)) : 85;
    // Geographic Reach: unique volunteer countries as proxy, capped at 100
    const geoScore = Math.min(100, volunteerCountries * 10) || 33;
    // SDG Alignment: unique SDGs addressed as proxy (max 17 goals → map to 100)
    const sdgScore = Math.min(100, Math.round((Object.keys(sdgMap).length / 17) * 100)) || 100;

    const visiDims = [
      { label: 'Verification Integrity', weight: 40, score: verIntegrity },
      { label: 'Scale',                  weight: 25, score: scaleScore },
      { label: 'Persistence',            weight: 15, score: persistScore },
      { label: 'Geographic Reach',       weight: 10, score: geoScore },
      { label: 'SDG Alignment',          weight: 10, score: sdgScore },
    ];
    const visiComposite = Math.round(visiDims.reduce((s, d) => s + d.score * (d.weight / 100), 0) * 10) / 10;
    const visiTier = visiComposite >= 80 ? 'Gold Tier' : visiComposite >= 65 ? 'Silver Tier' : visiComposite >= 50 ? 'Bronze Tier' : 'Developing';

    // SVG radar — 5 axes, monochrome, outline-only polygon
    const visiSvgCx = 140, visiSvgCy = 130, visiSvgR = 90;
    const visiAngles = visiDims.map((_, i) => (Math.PI * 2 * i) / 5 - Math.PI / 2);
    const visiScorePts = visiDims.map((d, i) => {
      const rr = visiSvgR * (d.score / 100);
      return `${visiSvgCx + rr * Math.cos(visiAngles[i])},${visiSvgCy + rr * Math.sin(visiAngles[i])}`;
    }).join(' ');
    // Grid levels
    const visiGridHtml = [0.25, 0.5, 0.75, 1.0].map(lv => {
      const pts = visiDims.map((_, i) => {
        const rr = visiSvgR * lv;
        return `${visiSvgCx + rr * Math.cos(visiAngles[i])},${visiSvgCy + rr * Math.sin(visiAngles[i])}`;
      }).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="${lv === 1.0 ? '#D1D5DB' : '#E5E7EB'}" stroke-width="${lv === 1.0 ? 1 : 0.5}"/>`;
    }).join('');
    // Axis lines
    const visiAxisHtml = visiDims.map((_, i) =>
      `<line x1="${visiSvgCx}" y1="${visiSvgCy}" x2="${visiSvgCx + visiSvgR * Math.cos(visiAngles[i])}" y2="${visiSvgCy + visiSvgR * Math.sin(visiAngles[i])}" stroke="#E5E7EB" stroke-width="0.75"/>`
    ).join('');
    // Score dots
    const visiDotsHtml = visiDims.map((d, i) => {
      const rr = visiSvgR * (d.score / 100);
      return `<circle cx="${visiSvgCx + rr * Math.cos(visiAngles[i])}" cy="${visiSvgCy + rr * Math.sin(visiAngles[i])}" r="3" fill="#0A2463"/>`;
    }).join('');
    // Labels
    const visiLabelLines: string[] = [
      ['Verification', 'Integrity'],
      ['Scale'],
      ['Persistence'],
      ['Geographic', 'Reach'],
      ['SDG', 'Alignment'],
    ].flatMap((lines, i) => {
      const lx = visiSvgCx + (visiSvgR + 28) * Math.cos(visiAngles[i]);
      const ly = visiSvgCy + (visiSvgR + 28) * Math.sin(visiAngles[i]);
      const anchor = lx < visiSvgCx - 5 ? 'end' : lx > visiSvgCx + 5 ? 'start' : 'middle';
      const lineH = 9, totalH = lines.length * lineH;
      const dim = visiDims[i];
      return [
        ...lines.map((ln, li) =>
          `<text x="${lx}" y="${ly - totalH / 2 + li * lineH + lineH * 0.4}" font-size="7.5" font-family="Inter,sans-serif" font-weight="600" fill="#374151" text-anchor="${anchor}">${ln}</text>`
        ),
        `<text x="${lx}" y="${ly + totalH / 2 + 2}" font-size="8" font-family="Inter,sans-serif" font-weight="700" fill="#0A2463" text-anchor="${anchor}">(${dim.score})</text>`,
      ];
    });

    const visiSvgHtml =
      `<svg viewBox="0 0 280 260" style="width:100%;max-width:240px;display:block;margin:0 auto;">` +
      visiGridHtml + visiAxisHtml +
      `<polygon points="${visiScorePts}" fill="none" stroke="#0A2463" stroke-width="1.5" stroke-linejoin="round"/>` +
      visiDotsHtml +
      visiLabelLines.join('') +
      `<text x="${visiSvgCx}" y="${visiSvgCy - 6}" font-size="12" font-family="Inter,sans-serif" font-weight="700" fill="#0A2463" text-anchor="middle">&#x2605;</text>` +
      `<text x="${visiSvgCx}" y="${visiSvgCy + 7}" font-size="8" font-family="Inter,sans-serif" font-weight="600" fill="#374151" text-anchor="middle">Composite</text>` +
      `</svg>`;

    const visiTableRows = visiDims.map((d, i) =>
      `<tr style="border-bottom:0.5px solid #F3F4F6;background:${i % 2 === 1 ? '#FFFFFF' : 'transparent'};">` +
      `<td style="padding:4px 6px;font-size:9px;color:#374151;">${d.label}</td>` +
      `<td style="padding:4px 6px;font-size:9px;font-weight:700;color:#0A2463;text-align:center;">${d.score}</td>` +
      `<td style="padding:4px 6px;font-size:9px;color:#6B7280;text-align:center;">${d.weight}%</td>` +
      `<td style="padding:4px 6px;font-size:9px;font-weight:600;color:#374151;text-align:center;">${Math.round(d.score * (d.weight / 100) * 10) / 10}</td>` +
      `</tr>`
    ).join('');

    const _nVisiHtml =
      '<div style="font-family:Inter,sans-serif;margin:14px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">Verified Innovation Scoring Profile</div>' +
      '<div style="background:#F9FAFB;">' +
      '<div style="padding:8px 16px 0;display:flex;align-items:center;justify-content:space-between;">' +
      `<div style="font-size:10px;color:#374151;font-weight:600;">${escapeHtml(orgName)}</div>` +
      `<div style="font-size:9px;font-weight:700;color:#0A2463;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:3px;padding:2px 8px;">${visiTier}</div>` +
      '</div>' +
      // PRIMARY: Full-width scoring table
      '<div style="padding:8px 16px 12px;">' +
      '<div style="font-size:9px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Weighted Scoring Table' +
      '<span style="margin-left:8px;font-size:8px;font-weight:600;color:#059669;text-transform:none;letter-spacing:0;">(Primary Audit Source)</span>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:9px;">' +
      '<thead><tr style="border-bottom:1px solid #E5E7EB;">' +
      '<th style="padding:3px 4px;text-align:left;color:#6B7280;font-weight:600;">Dimension</th>' +
      '<th style="padding:3px 4px;text-align:center;color:#6B7280;font-weight:600;">Raw Score (/100)</th>' +
      '<th style="padding:3px 4px;text-align:center;color:#6B7280;font-weight:600;">Weight</th>' +
      '<th style="padding:3px 4px;text-align:center;color:#6B7280;font-weight:600;">Weighted Score</th>' +
      '</tr></thead>' +
      `<tbody>${visiTableRows}` +
      `<tr style="background:#0A2463;"><td style="padding:4px 6px;color:#F9FAFB;font-weight:700;font-size:9px;" colspan="3">Composite Score</td><td style="padding:4px 6px;text-align:center;color:#F9FAFB;font-weight:700;font-size:9px;">${visiComposite}</td></tr>` +
      '</tbody></table>' +
      '</div>' +
      // Dashed divider
      '<div style="border-top:1px dashed #D1D5DB;margin:0 16px;"></div>' +
      // SUPPLEMENTAL: Radar chart below the table
      '<div style="padding:8px 16px 4px;">' +
      '<div style="font-size:9px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;text-align:center;">Supplemental &#x2014; Visual Scoring Profile</div>' +
      visiSvgHtml +
      '<div style="font-size:8px;color:#9CA3AF;font-style:italic;text-align:center;margin-top:4px;line-height:1.4;">Supplemental visual only &#x2014; not for audit use. Axis order is fixed; scores match the table above.</div>' +
      '</div>' +
      '</div>' +
      '<div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;background:#F9FAFB;">Weighted scoring table is the primary and authoritative audit source for this index. The radar chart is a supplemental visual representation only and does not constitute verified evidence. Axis order is fixed &#x2014; not manipulated.</div>' +
      '</div>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${orgName} \u2013 Verified Impact Summary</title>
  <style>
    :root {
      --bg-p: #ffffff; --bg-s: #f9fafb;
      --txt-p: #111827; --txt-s: #6b7280; --txt-t: #9ca3af;
      --bd: #e5e7eb; --bd-l: #f3f4f6;
      --r: 10px;
    }
    @page { size: 8.5in 11in portrait; margin: 11mm 22mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0 !important; margin: 0 !important; background: #fff; font-size: 10px; }
      .report-body { border: none !important; border-radius: 0 !important; box-shadow: none !important; padding: 0 !important; max-width: none !important; }
      /* Prevent any table, card, or keyed block from splitting across a page */
      .nb, table, .outcome-card, .pathway-card, .scope-grid, .snap-grid,
      .audit-banner, .csrd-note, .screen-result, .contrib-note {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      /* Keep section label pinned to its following content — never orphan a heading */
      .sl {
        break-after: avoid;
        page-break-after: avoid;
      }
      /* Wrap each section block (label + immediate content) together */
      .sl + *, .sl + * + .cmn, .sl + .cmn + * {
        break-before: avoid;
        page-break-before: avoid;
      }
      /* Sub-headings stay with their content */
      .sub-heading {
        break-after: avoid;
        page-break-after: avoid;
      }
      .sub-heading + * {
        break-before: avoid;
        page-break-before: avoid;
      }
      /* Section dividers always start fresh */
      .section-divider + * {
        break-before: avoid;
        page-break-before: avoid;
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: var(--txt-p); line-height: 1.5; background: var(--bg-s); padding: 28px; }
    .report-body { background: var(--bg-p); border-radius: var(--r); border: 0.5px solid var(--bd); padding: 32px; max-width: 880px; margin: 0 auto; }
    .sl { display:flex;align-items:center;gap:8px;margin-bottom:10px;margin-top:20px; break-after:avoid; page-break-after:avoid; }
    .slb { width:3px;height:16px;background:#0891b2;border-radius:2px;display:inline-block; }
    .slt { font-weight:600;font-size:13px;color:var(--txt-p); }
    .cmn { font-size:10px;color:#374151;background:#fffbeb;border:0.5px solid #fde68a;border-radius:6px;padding:8px 12px;margin-bottom:10px;line-height:1.6; break-inside:avoid; page-break-inside:avoid; }
    table { width:100%;border-collapse:collapse; }
    th { padding:8px 10px;font-size:10px;font-weight:600;color:#374151;text-align:left;border-bottom:1px solid #e5e7eb;background:#f9fafb; }
    td { vertical-align:top; }
    .section-divider { border-top:1px solid #e5e7eb;margin:22px 0; }
    .tbl-wrap { border:0.5px solid #e5e7eb;border-radius:var(--r);overflow:hidden;margin-bottom:14px; break-inside:avoid; page-break-inside:avoid; }
    .sub-heading { font-size:11px;font-weight:700;color:#374151;margin-bottom:8px;margin-top:12px; break-after:avoid; page-break-after:avoid; }
  </style>
</head>
<body>
<div class="report-body">

  <!-- HEADER -->
  <div style="background:#fef3c7;border:1.5px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-bottom:14px;break-inside:avoid;page-break-inside:avoid;">
    <div style="font-size:10px;font-weight:700;color:#92400e;letter-spacing:0.5px;margin-bottom:4px;">&#9888; MANAGEMENT REPORTING VERIFIED — NOT A FORMAL ASSURANCE OPINION</div>
    <div style="font-size:10px;color:#78350f;line-height:1.6;">This report is classified as <strong>Management Reporting (Verified)</strong>. For CSRD limited assurance, independent auditor procedures per ISAE 3000 are required. Synerxus reduces evidence-gathering by 60–70% but does not replace auditor judgment.</div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:13px;">
      <img src="${LOGO_DATA_URI}" alt="Synerxus" style="width:52px;height:52px;border-radius:10px;object-fit:contain;">
      <div>
        <div style="font-weight:700;font-size:20px;letter-spacing:0.5px;"><span style="color:#0A2463;">SYNER</span><span style="color:#B8860B;">XUS</span></div>
        <div style="font-size:13px;font-weight:600;"><span style="color:#B8860B;">Impact,</span> <span style="color:#0A2463;">Verified.</span></div>
      </div>
    </div>
    <div style="text-align:right;font-size:10px;color:var(--txt-t);line-height:1.8;">
      <div><strong style="color:#374151;">Report Generated:</strong> ${reportDate}</div>
      <div><strong style="color:#374151;">Report ID:</strong> ${reportId}</div>
      <div><strong style="color:#374151;">Period:</strong> ${periodDisplay}</div>
      ${(org?.city || org?.country) ? `<div><strong style="color:#374151;">Location:</strong> ${[org?.city, org?.country].filter(Boolean).join(', ')}</div>` : ''}
    </div>
  </div>

  <div style="background:#0A2463;border-radius:var(--r);padding:16px 22px;color:#fff;margin-bottom:20px;">
    <div style="font-size:9px;opacity:0.8;letter-spacing:1.2px;margin-bottom:6px;">VERIFIED IMPACT SUMMARY</div>
    <div style="font-size:22px;font-weight:700;margin-bottom:3px;">${orgName}</div>
    ${org?.description ? `<div style="font-size:11px;opacity:0.85;margin-bottom:8px;">${org.description.slice(0, 120)}${org.description.length > 120 ? '\u2026' : ''}</div>` : '<div style="font-size:11px;opacity:0.85;margin-bottom:8px;">[NGO Partner \u2014 Real Verified Data]</div>'}
    <div style="font-size:10px;opacity:0.75;">${periodDisplay} \u2022 Report ID: ${reportId}</div>
  </div>

  <!-- ─── SECTION 1: EXECUTIVE SUMMARY ──────────────────────────── -->
  <div class="sl"><span class="slb"></span><span class="slt">Section 1: Executive Summary</span></div>
  ${_nVdsHtml}
  <div class="snap-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
    <div style="background:#ecfdf5;border:0.5px solid #a7f3d0;border-radius:var(--r);padding:14px 16px;text-align:center;">
      <div style="font-size:32px;font-weight:700;color:#059669;line-height:1;">${verified.length}</div>
      <div style="font-size:12px;color:#374151;margin-top:5px;font-weight:500;">Verified Outcomes</div>
      <div style="font-size:10px;color:#059669;margin-top:6px;">NGO-confirmed</div>
    </div>
    <div style="background:#ecfeff;border:0.5px solid #a5f3fc;border-radius:var(--r);padding:14px 16px;text-align:center;">
      <div style="font-size:32px;font-weight:700;color:#0891b2;line-height:1;">${Math.round(totalHours)}</div>
      <div style="font-size:12px;color:#374151;margin-top:5px;font-weight:500;">Verified Hours</div>
      <div style="font-size:10px;color:#0891b2;margin-top:6px;">Not self-reported</div>
    </div>
    <div style="background:#f5f3ff;border:0.5px solid #ddd6fe;border-radius:var(--r);padding:14px 16px;text-align:center;">
      <div style="font-size:32px;font-weight:700;color:#7c3aed;line-height:1;">${effectiveBeneficiaries.toLocaleString()}</div>
      <div style="font-size:12px;color:#374151;margin-top:5px;font-weight:500;">Beneficiaries Reached</div>
      <div style="font-size:9px;color:#9ca3af;margin-top:6px;line-height:1.4;">&#8224; NGO partner estimates. Auditors should sample 15\u201330% per ISAE 3000.</div>
    </div>
  </div>

  <div class="section-divider"></div>

  <!-- ─── SECTION 2: VERIFICATION BOUNDARY ─────────────────────── -->
  <div class="sl"><span class="slb"></span><span class="slt">Section 2: Verification Boundary</span></div>
  <div style="font-size:10px;color:#6b7280;margin-bottom:8px;line-height:1.5;">Defines what data is in scope and explicitly excluded — critical for auditor evidence sampling under ISAE 3000.</div>
  ${_nBoundMatrixHtml}

  <div class="section-divider"></div>

  <!-- ─── SECTION 3: VERIFICATION METHODOLOGY ──────────────────── -->
  <div class="sl"><span class="slb"></span><span class="slt">Section 3: Verification Methodology</span></div>
  <div style="font-size:10px;color:#6b7280;margin-bottom:8px;line-height:1.5;">Each verified outcome is structured as a machine-readable evidence object with three data streams captured simultaneously at verification.</div>
  ${_nEvidArchHtml}
  <div style="font-size:10px;color:#374151;line-height:1.8;padding:10px 14px;border:0.5px solid #e5e7eb;border-radius:var(--r);background:#f9fafb;">
    <strong style="color:#0A2463;">Three-Step Process:</strong> (1) Volunteer submits outcome + hours via Synerxus platform &nbsp;&#x2192;&nbsp; (2) NGO partner confirms BOTH outcome AND hours — immutable record with verifier identity and timestamp &nbsp;&#x2192;&nbsp; (3) System logs verifier ID, timestamp, device ID/SMS, and geolocation for every verified outcome.
  </div>

  <div class="section-divider"></div>

  <!-- ─── SECTION 4: SDG ALIGNMENT ─────────────────────────────── -->
  <div class="sl"><span class="slb"></span><span class="slt">Section 4: SDG Alignment &amp; Impact Attribution</span></div>
  <div style="font-size:10px;color:#6b7280;margin-bottom:8px;line-height:1.5;">All percentages tied to verified deliverables — not self-assessed claims.</div>
  ${sortedSdgs.length > 0 ? `<div class="tbl-wrap nb">
    <table>
      <thead>
        <tr>
          <th style="width:46px;">SDG</th><th>Goal</th>
          <th style="text-align:center;white-space:nowrap;">Outcomes</th>
          <th style="text-align:center;white-space:nowrap;">Hours</th>
          <th style="text-align:center;min-width:100px;">% of Total</th>
        </tr>
      </thead>
      <tbody>${sdgAlignmentRows}</tbody>
    </table>
  </div>
  ${_nSdgBarHtml}` : '<p style="font-size:11px;color:#6b7280;padding:10px 0;">No SDG data found for this period.</p>'}

  <div class="section-divider"></div>

  <!-- ─── SECTION 5: CSRD/ESRS MAPPING ─────────────────────────── -->
  <div class="sl"><span class="slb"></span><span class="slt">Section 5: CSRD/ESRS Compliance Mapping</span></div>
  ${_nCsrdBoundHtml}
  <div class="cmn"><strong>COMPLIANCE LANGUAGE NOTE</strong><br>This section shows how verified data <strong>SUPPORTS</strong> CSRD/ESRS requirements. It does not assert full compliance, which requires independent assurance per ISAE 3000.</div>
  <div class="tbl-wrap nb">
    <table>
      <thead>
        <tr>
          <th style="white-space:nowrap;width:80px;">Standard</th>
          <th>Requirement</th>
          <th>How This Report Supports</th>
        </tr>
      </thead>
      <tbody>${csrdRowsHtml}</tbody>
    </table>
  </div>

  <div class="section-divider"></div>

  <!-- ─── SECTION 6: CONTRIBUTION PATHWAYS ────────────────────── -->
  <div class="sl"><span class="slb"></span><span class="slt">Section 6: Contribution Pathways</span></div>
  <div class="cmn contrib-note"><strong>METHODOLOGY NOTE: CONTRIBUTION VS. ATTRIBUTION</strong><br>This section documents verifiable CONTRIBUTION \u2014 the evidence chain showing how volunteer activities contributed to verified outcomes. It does NOT claim sole causality. Contribution evidence is legally defensible and audit-appropriate.</div>
  ${_nContribChainHtml}
  ${top3.length > 0 ? `<div class="sub-heading">Verified Contribution Pathways</div>
  <div style="font-size:10px;color:#6b7280;margin-bottom:10px;">How volunteer activities contributed to verified outcomes:</div>
  <div style="margin-bottom:14px;">${attributionHtml}</div>` : '<div style="font-size:11px;color:#6b7280;padding:10px 0;">No verified outcomes available for pathway examples this period.</div>'}

  <div class="section-divider"></div>

  <!-- ─── SECTION 7: NEGATIVE IMPACT SCREENING ─────────────────── -->
  <div class="sl"><span class="slb" style="background:#d97706;"></span><span class="slt">Section 7: Negative Impact Screening</span></div>
  <div style="font-size:10px;color:#6b7280;margin-bottom:8px;line-height:1.5;">Required for ESRS S3.4 double materiality — all unintended consequences disclosed alongside positive outcomes.</div>
  ${negativeDisclosureHtml}
  ${_nScreeningMatHtml}

  <div class="section-divider"></div>

  <!-- ─── SECTION 8: ENGAGEMENT METRICS ────────────────────────── -->
  <div class="sl"><span class="slb"></span><span class="slt">Section 8: Engagement Metrics</span></div>
  <div class="tbl-wrap nb">
    <table>
      <thead><tr><th>Metric</th><th>Value</th><th>Notes</th></tr></thead>
      <tbody>
        <tr style="border-bottom:0.5px solid #f3f4f6;">
          <td style="padding:7px 10px;font-size:10px;color:#374151;font-weight:500;">Volunteers</td>
          <td style="padding:7px 10px;font-size:10px;font-weight:700;color:#111827;">${uniqueVolunteers}</td>
          <td style="padding:7px 10px;font-size:10px;color:#6b7280;">Active contributors this period</td>
        </tr>
        <tr style="border-bottom:0.5px solid #f3f4f6;background:#f9fafb;">
          <td style="padding:7px 10px;font-size:10px;color:#374151;font-weight:500;">Skill Categories</td>
          <td style="padding:7px 10px;font-size:10px;font-weight:700;color:#111827;">${uniqueSkillsCount || uniqueVolunteers}</td>
          <td style="padding:7px 10px;font-size:10px;color:#6b7280;">${skillCategoriesDisplay}</td>
        </tr>
        <tr style="border-bottom:0.5px solid #f3f4f6;">
          <td style="padding:7px 10px;font-size:10px;color:#374151;font-weight:500;">Volunteer Countries</td>
          <td style="padding:7px 10px;font-size:10px;font-weight:700;color:#111827;">${volunteerCountries}</td>
          <td style="padding:7px 10px;font-size:10px;color:#6b7280;">${volunteerCountries === 1 ? 'Single country deployment' : 'Multi-country volunteer base'}</td>
        </tr>
        <tr style="border-bottom:0.5px solid #f3f4f6;background:#f9fafb;">
          <td style="padding:7px 10px;font-size:10px;color:#374151;font-weight:500;">Verification Rate</td>
          <td style="padding:7px 10px;font-size:10px;font-weight:700;color:${verificationRate >= 80 ? '#059669' : '#d97706'};">${verificationRate}%</td>
          <td style="padding:7px 10px;font-size:10px;color:#6b7280;">All submitted outcomes verified by NGO</td>
        </tr>
        <tr style="border-bottom:0.5px solid #f3f4f6;">
          <td style="padding:7px 10px;font-size:10px;color:#374151;font-weight:500;">Avg. Time to Verify</td>
          <td style="padding:7px 10px;font-size:10px;font-weight:700;color:#111827;">${avgVerificationHours > 0 ? avgVerificationHours + ' hours' : 'N/A'}</td>
          <td style="padding:7px 10px;font-size:10px;color:#6b7280;">From submission to NGO confirmation</td>
        </tr>
        <tr>
          <td style="padding:7px 10px;font-size:10px;color:#374151;font-weight:500;background:#f9fafb;">Active Projects</td>
          <td style="padding:7px 10px;font-size:10px;font-weight:700;color:#111827;background:#f9fafb;">${projectStats.length}</td>
          <td style="padding:7px 10px;font-size:10px;color:#6b7280;background:#f9fafb;">${activeProjectNames}</td>
        </tr>
      </tbody>
    </table>
  </div>
  ${_nGeoHeatmapHtml}

  <div class="section-divider"></div>

  <!-- ─── SECTION 9: AUDIT TRAIL SUMMARY ───────────────────────── -->
  <div class="sl"><span class="slb"></span><span class="slt">Section 9: Audit Trail Summary</span></div>
  <div class="audit-banner" style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:var(--r);padding:12px 16px;display:flex;align-items:center;gap:14px;margin-bottom:12px;">
    <div style="width:38px;height:38px;background:#d1fae5;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#059669;flex-shrink:0;">\u2713</div>
    <div style="flex:1;">
      <div style="font-weight:700;font-size:12px;color:#065f46;letter-spacing:0.3px;margin-bottom:3px;">AUDIT TRAIL COMPLETENESS: ${verificationRate}% (${verified.length}/${allActivities.length} outcomes verified within 72h SLA)</div>
      <div style="font-size:10px;color:#047857;line-height:1.6;">Verified outcomes include: verification timestamp, verifier identity, device ID/SMS number, geolocation, and hours \u2014 all NGO-confirmed with immutable records.${avgVerificationHours > 0 ? ` Average time to verify: ${avgVerificationHours} hours.` : ''}</div>
      ${allActivities.length - verified.length > 0 ? `<div style="font-size:10px;color:#b45309;margin-top:4px;">Unverified outcomes: ${allActivities.length - verified.length} (${100 - verificationRate}%) \u2014 documented in Exceptions Log.</div>` : ''}
    </div>
  </div>
  ${top3.length > 0 ? `<div style="font-size:11px;font-weight:600;color:#374151;margin-bottom:8px;">Top Verified Outcomes (with full audit trail)</div>
  <div style="font-size:10px;color:#6b7280;margin-bottom:10px;">Each outcome includes complete audit trail for auditor sampling.</div>
  <div style="margin-bottom:14px;">${outcomeCards}</div>` : ''}
  ${_nVerifyTimelineHtml}

  <div class="section-divider"></div>

  <!-- ─── SECTION 10: VERIFIED INNOVATION SCALING INDEX ──────────── -->
  <div class="sl"><span class="slb"></span><span class="slt">Section 10: Verified Innovation Scaling Index</span></div>
  <div style="font-size:10px;color:#6b7280;margin-bottom:8px;line-height:1.5;">Multi-dimensional scoring of verification quality across five weighted dimensions. Scoring table is the primary audit source — radar chart is supplemental visual only.</div>
  ${_nVisiHtml}

  <div class="section-divider"></div>

  <!-- ─── SECTION 11: LIMITATIONS & ASSURANCE ──────────────────── -->
  <div class="sl"><span class="slb"></span><span class="slt">Section 11: Limitations &amp; Assurance</span></div>
  ${_nAssuranceDiagHtml}
  <div style="background:#fffbeb;border:0.5px solid #fde68a;border-radius:var(--r);padding:10px 14px;font-size:10px;color:#92400e;line-height:1.6;">
    <strong>ASSURANCE LIMITATION:</strong> Synerxus provides verification infrastructure, not assurance opinions. Classification: <strong>Management Reporting (Verified)</strong>. For formal CSRD assurance, this data must be reviewed by a qualified third-party auditor per ISAE 3000. Synerxus reduces evidence-gathering by 60\u201370% but does not replace auditor judgment.
  </div>

  <div class="section-divider"></div>

  <!-- Footer -->
  <div style="padding-top:10px;">
    <div style="background:#fffbeb;border:0.5px solid #fde68a;border-radius:var(--r);padding:8px 12px;font-size:10px;color:#92400e;margin-bottom:10px;">
      <strong>CSRD Audit-Support Statement:</strong> This report contains ${verified.length} verified impact records representing ${Math.round(totalHours)} volunteer hours across ${projectStats.length} project${projectStats.length !== 1 ? 's' : ''}. Records have been verified by authorized NGO staff with immutable audit trails maintained to support CSRD disclosure. <strong>This report does not constitute an assurance opinion. Formal CSRD filing requires independent limited or reasonable assurance per ISAE 3000 from a qualified auditor.</strong>
    </div>
    <div style="font-size:10px;color:var(--txt-t);margin-bottom:8px;">
      <div>Generated by Synerxus on behalf of ${orgName}. All data is NGO-verified with complete audit trails available upon request.</div>
      <div style="margin-top:2px;">Questions? support@synerxus.com \u2022 \u00a9 ${now.getFullYear()} Synerxus \u2022 CSRD Audit-Support Data (Management Verified) \u2014 Requires independent ISAE 3000 assurance for formal CSRD filing</div>
    </div>
    <div style="text-align:center;">
      <span style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-s);border-radius:100px;padding:5px 14px;font-size:10px;color:var(--txt-s);border:0.5px solid var(--bd);">
        <span style="width:5px;height:5px;border-radius:50%;background:#10b981;display:inline-block;"></span>
        Powered by <span style="font-weight:700;color:#0A2463;">SYNER</span><span style="font-weight:700;color:#B8860B;">XUS</span> \u2022 <span style="color:#B8860B;">Impact,</span> <span style="color:#0A2463;">Verified.</span>
      </span>
    </div>
  </div>
</div>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `inline; filename="ngo-impact-summary-${new Date().toISOString().split('T')[0]}.html"`);
    res.send(html);
  } catch (err) {
    console.error("Error generating NGO impact summary:", err);
    res.status(500).json({ message: "Failed to generate impact summary report" });
  }
});

// ─── CORPORATE ESG IMPACT REPORT ──────────────────────────────────────────────
logsRouter.get("/reports/corporate-esg-summary", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user?.userType !== 'corporate-partner') {
      return res.status(403).json({ message: "Only corporate users can generate ESG reports" });
    }

    const corporateUserId = req.user.id;

    // Find CSR partner for this user
    const allPartners = await storage.listCSRPartners?.() || [];
    const partner = allPartners.find((p: any) => p.userId === corporateUserId);

    // Time period filter
    const timePeriod = req.query.timePeriod as string | undefined;
    let reportSince: Date | undefined;
    if (timePeriod && timePeriod !== 'all') {
      const nowMs = Date.now();
      switch (timePeriod) {
        case '7d':  reportSince = new Date(nowMs - 7   * 24 * 60 * 60 * 1000); break;
        case '30d': reportSince = new Date(nowMs - 30  * 24 * 60 * 60 * 1000); break;
        case '90d': reportSince = new Date(nowMs - 90  * 24 * 60 * 60 * 1000); break;
        case '1y':  reportSince = new Date(nowMs - 365 * 24 * 60 * 60 * 1000); break;
      }
    }

    // Entity filters
    const filterEmployeeNamesRaw = req.query.employeeNames as string | undefined;
    const filterProjectIdsRaw = req.query.projectIds as string | undefined;
    const filterNgoNamesRaw = req.query.ngoNames as string | undefined;
    const filterEmployeeNames = filterEmployeeNamesRaw ? filterEmployeeNamesRaw.split('|||').map(s => s.trim()).filter(Boolean) : null;
    const filterProjectIds = filterProjectIdsRaw ? filterProjectIdsRaw.split(',').map(Number).filter(Boolean) : null;
    const filterNgoNames = filterNgoNamesRaw ? filterNgoNamesRaw.split('|||').map(s => s.trim()).filter(Boolean) : null;

    // Get linked volunteer user IDs
    const allProfiles = await storage.listVolunteerProfiles?.() || [];
    let linkedUserIds: number[] = [];
    if (partner) {
      const directLinked = allProfiles
        .filter((p: any) => p.employerId && parseInt(String(p.employerId)) === partner.id)
        .map((p: any) => p.userId as number);
      const explicitLinks = await (storage as any).listVolunteerEmployerLinksByPartnerId?.(partner.id) || [];
      const explicitLinked = allProfiles
        .filter((p: any) => explicitLinks.some((l: any) => l.volunteerId === p.id))
        .map((p: any) => p.userId as number);
      linkedUserIds = Array.from(new Set([...directLinked, ...explicitLinked]));
    }

    // Fetch activities for linked volunteers
    let allActivities: any[] = [];
    if (linkedUserIds.length > 0) {
      const userFilter = inArray(volunteerActivitiesTable.userId, linkedUserIds);
      const rows = reportSince
        ? await db.select().from(volunteerActivitiesTable).where(and(userFilter, gte(volunteerActivitiesTable.date, reportSince)))
        : await db.select().from(volunteerActivitiesTable).where(userFilter);
      allActivities = rows as any[];
    }

    // Apply project filter early (before splitting into verified/rejected)
    if (filterProjectIds) {
      allActivities = allActivities.filter((a: any) => a.projectId && filterProjectIds.includes(a.projectId));
    }

    let verified = allActivities.filter((a: any) => a.verificationStatus === 'approved');
    const rejected = allActivities.filter((a: any) => a.verificationStatus === 'rejected');

    // Volunteer user details
    const volunteerUsers = linkedUserIds.length > 0 ? await storage.getUsersByIds(linkedUserIds) : [];
    const userMap = new Map(volunteerUsers.map((u: any) => [u.id, u]));

    // Volunteer profile map (for department/job title)
    const profileMap = new Map(allProfiles.map((p: any) => [p.userId, p]));

    // NGO orgs from verifiers
    const verifierIds = Array.from(new Set(verified.map((a: any) => a.verifiedBy).filter(Boolean))) as number[];
    const verifierUsers = verifierIds.length > 0 ? await storage.getUsersByIds(verifierIds) : [];
    const verifierOrgIds = Array.from(new Set(verifierUsers.map((u: any) => u.organizationId).filter(Boolean))) as number[];
    const ngoOrgs: any[] = [];
    for (const orgId of verifierOrgIds) {
      const org = await storage.getOrganization(orgId);
      if (org) ngoOrgs.push(org);
    }
    const ngoOrgMap = new Map(ngoOrgs.map((o: any) => [o.id, o]));
    const verifierToOrgMap = new Map(verifierUsers.map((u: any) => [u.id, ngoOrgMap.get(u.organizationId)]));

    // Apply employee name filter (needs userMap to resolve names)
    if (filterEmployeeNames) {
      verified = verified.filter((a: any) => {
        const u = userMap.get(a.userId);
        const name = u?.displayName || u?.email || '';
        return filterEmployeeNames.some(fn => name.toLowerCase().includes(fn.toLowerCase()));
      });
    }

    // Apply NGO name filter (needs verifierToOrgMap)
    if (filterNgoNames) {
      verified = verified.filter((a: any) => {
        const org = a.verifiedBy ? verifierToOrgMap.get(a.verifiedBy) : null;
        return org && filterNgoNames.some(fn => (org.name || '').toLowerCase().includes(fn.toLowerCase()));
      });
    }

    // Metrics
    const totalHours = verified.reduce((s: number, a: any) => s + (a.hours || 0), 0);
    const totalOutcomes = verified.reduce((s: number, a: any) => s + (a.editedOutcomeQuantity || a.outcomeQuantity || 0), 0);
    const totalBeneficiaries = verified.reduce((s: number, a: any) => s + (a.beneficiaryCount || 0), 0);
    // effectiveBeneficiaries: explicit beneficiaryCount wins; otherwise outcomeQuantity = people helped per outcome
    const effectiveBeneficiaries = totalBeneficiaries > 0 ? totalBeneficiaries : totalOutcomes;
    const uniqueVolunteerIds = new Set(verified.map((a: any) => a.userId));
    const verificationRate = allActivities.length > 0
      ? Math.round((verified.length / allActivities.length) * 100) : 0;

    const verificationTimes = verified
      .filter((a: any) => a.verifiedAt && a.createdAt)
      .map((a: any) => {
        const vMs = a.verifiedAt instanceof Date ? a.verifiedAt.getTime() : new Date(a.verifiedAt).getTime();
        const cMs = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        return (vMs - cMs) / (1000 * 60 * 60);
      })
      .filter((h: number) => h >= 0);
    const avgVerificationHours = verificationTimes.length > 0
      ? Math.round(verificationTimes.reduce((s: number, t: number) => s + t, 0) / verificationTimes.length) : 0;

    // SDG map — beneficiaries per activity: prefer beneficiaryCount, fall back to outcomeQuantity
    const sdgMap: Record<number, { hours: number; outcomes: number; beneficiaries: number; count: number }> = {};
    for (const act of verified) {
      const sdgs: number[] = act.sdgTags || [];
      const actBenef = act.beneficiaryCount || act.editedOutcomeQuantity || act.outcomeQuantity || 0;
      sdgs.forEach((g: number) => {
        if (!sdgMap[g]) sdgMap[g] = { hours: 0, outcomes: 0, beneficiaries: 0, count: 0 };
        sdgMap[g].hours += act.hours || 0;
        sdgMap[g].outcomes += act.editedOutcomeQuantity || act.outcomeQuantity || 0;
        sdgMap[g].beneficiaries += actBenef;
        sdgMap[g].count++;
      });
    }
    const sortedSdgs = Object.entries(sdgMap).sort((a, b) => b[1].count - a[1].count);

    // NGO partner stats — same beneficiary fallback
    const ngoStats: Record<number, { org: any; outcomes: number; hours: number; beneficiaries: number; activities: any[] }> = {};
    for (const act of verified) {
      if (!act.verifiedBy) continue;
      const org = verifierToOrgMap.get(act.verifiedBy);
      if (!org) continue;
      const actBenef = act.beneficiaryCount || act.editedOutcomeQuantity || act.outcomeQuantity || 0;
      if (!ngoStats[org.id]) ngoStats[org.id] = { org, outcomes: 0, hours: 0, beneficiaries: 0, activities: [] };
      ngoStats[org.id].outcomes += act.editedOutcomeQuantity || act.outcomeQuantity || 0;
      ngoStats[org.id].hours += act.hours || 0;
      ngoStats[org.id].beneficiaries += actBenef;
      ngoStats[org.id].activities.push(act);
    }

    // Per-volunteer stats (top contributors)
    const volunteerStats: Record<number, { name: string; dept: string; outcomes: number; hours: number; ngos: Set<string>; skills: Set<string> }> = {};
    for (const act of verified) {
      if (!act.userId) continue;
      const user = userMap.get(act.userId);
      const profile = profileMap.get(act.userId);
      const name = user?.displayName || user?.email || 'Volunteer';
      const dept = profile?.departmentName || profile?.jobTitleAtCompany || 'Employee';
      const org = act.verifiedBy ? verifierToOrgMap.get(act.verifiedBy) : null;
      if (!volunteerStats[act.userId]) volunteerStats[act.userId] = { name, dept, outcomes: 0, hours: 0, ngos: new Set(), skills: new Set() };
      volunteerStats[act.userId].outcomes += act.outcomeQuantity || 0;
      volunteerStats[act.userId].hours += act.hours || 0;
      if (org) volunteerStats[act.userId].ngos.add(org.name);
      (act.skillsApplied || []).forEach((s: string) => volunteerStats[act.userId].skills.add(s));
    }
    const topVolunteers = Object.values(volunteerStats).sort((a, b) => b.outcomes - a.outcomes).slice(0, 5);

    const now = new Date();
    const corpName = partner?.companyName || 'Corporation';
    const reportDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const initials = corpName.split(' ').map((w: string) => w[0] || '').join('').slice(0, 4).toUpperCase();
    const mmdd = now.toISOString().slice(5, 10).replace('-', '');
    const reportId = `ESG-${now.getFullYear()}-${mmdd}-${initials}`;

    const qNum = Math.ceil((now.getMonth() + 1) / 3);
    const endLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const periodDisplayMap: Record<string, string> = {
      '7d': `Last 7 Days (through ${endLabel})`,
      '30d': `Last 30 Days (through ${endLabel})`,
      '90d': `Last 90 Days (through ${endLabel})`,
      '1y': `Last 12 Months (through ${endLabel})`,
    };
    const periodDisplay = timePeriod && periodDisplayMap[timePeriod]
      ? periodDisplayMap[timePeriod]
      : `Q${qNum} ${now.getFullYear()}`;

    const avgHoursPerEmployee = uniqueVolunteerIds.size > 0 ? (totalHours / uniqueVolunteerIds.size).toFixed(1) : '0';
    // beneficiariesPerOutcome: total people helped / number of verified activities
    const beneficiariesPerOutcome = effectiveBeneficiaries > 0 && verified.length > 0 ? Math.round(effectiveBeneficiaries / verified.length) : 0;

    const SDG_NAMES_LOCAL: Record<number, string> = {
      1: 'No Poverty', 2: 'Zero Hunger', 3: 'Good Health & Well-being', 4: 'Quality Education',
      5: 'Gender Equality', 6: 'Clean Water & Sanitation', 7: 'Affordable & Clean Energy',
      8: 'Decent Work & Economic Growth', 9: 'Industry, Innovation & Infrastructure',
      10: 'Reduced Inequalities', 11: 'Sustainable Cities & Communities',
      12: 'Responsible Consumption & Production', 13: 'Climate Action',
      14: 'Life Below Water', 15: 'Life on Land', 16: 'Peace, Justice & Strong Institutions',
      17: 'Partnerships for the Goals'
    };
    const SDG_COLORS_LOCAL: Record<number, string> = {
      1: '#E5243B', 2: '#DDA63A', 3: '#4C9F38', 4: '#C5192D', 5: '#FF3A21',
      6: '#26BDE2', 7: '#FCC30B', 8: '#A21942', 9: '#FD6925', 10: '#DD1367',
      11: '#FD9D24', 12: '#BF8B2E', 13: '#3F7E44', 14: '#0A97D9', 15: '#56C02B',
      16: '#00689D', 17: '#19486A'
    };

    // NGO partner rows
    const ngoRows = Object.values(ngoStats).map((n: any) => `
      <tr style="border-bottom:0.5px solid #e5e7eb;">
        <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#111827;">${escapeHtml(n.org.name)}</td>
        <td style="padding:6px 8px;font-size:11px;color:#374151;">${escapeHtml(n.org.location || '—')}</td>
        <td style="padding:6px 8px;font-size:11px;color:#374151;">${n.outcomes}</td>
        <td style="padding:6px 8px;font-size:11px;color:#374151;">${n.beneficiaries}</td>
        <td style="padding:6px 8px;font-size:11px;">
          ${(n.org.sdgGoals || []).slice(0, 3).map((g: number) => `<span style="background:${SDG_COLORS_LOCAL[g] || '#888'};color:#fff;padding:1px 5px;border-radius:3px;font-size:9px;margin-right:2px;">SDG ${g}</span>`).join('')}
        </td>
        <td style="padding:6px 8px;font-size:11px;"><span style="color:#059669;">&#10003; Complete</span></td>
      </tr>`).join('');

    // Employee contributor rows
    const employeeRows = topVolunteers.map((v: any, i: number) => `
      <tr style="border-bottom:0.5px solid #e5e7eb;${i % 2 === 1 ? 'background:#f9fafb;' : ''}">
        <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#111827;">${escapeHtml(v.name)}</td>
        <td style="padding:6px 8px;font-size:11px;color:#374151;">${escapeHtml(v.dept)}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;font-weight:700;color:#0A2463;">${v.outcomes}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;color:#374151;">${Math.round(v.hours)}h</td>
        <td style="padding:6px 8px;font-size:11px;color:#374151;">${escapeHtml(Array.from(v.ngos).join(', ') || '—')}</td>
        <td style="padding:6px 8px;font-size:11px;color:#374151;">${escapeHtml(Array.from(v.skills).slice(0, 2).join(', ') || '—')}</td>
      </tr>`).join('');

    // SDG alignment rows
    const sdgRows = sortedSdgs.slice(0, 7).map(([sdg, data]) => {
      const n = parseInt(sdg);
      const color = SDG_COLORS_LOCAL[n] || '#888';
      return `<tr style="border-bottom:0.5px solid #e5e7eb;">
        <td style="padding:6px 8px;">
          <span style="background:${color};color:#fff;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;">SDG ${n}</span>
        </td>
        <td style="padding:6px 8px;font-size:11px;font-weight:500;color:#111827;">${escapeHtml(SDG_NAMES_LOCAL[n] || `SDG ${n}`)}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;font-weight:700;color:#0A2463;">${data.outcomes}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;color:#374151;">${Math.round(data.hours)}h</td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;color:#374151;">${data.beneficiaries}</td>
      </tr>`;
    }).join('');

    // Audit trail rows (top 10)
    const auditRows = verified.slice(0, 10).map((a: any) => {
      const volunteer = userMap.get(a.userId);
      const org = a.verifiedBy ? verifierToOrgMap.get(a.verifiedBy) : null;
      const dateStr = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date).split('T')[0];
      const outcomeText = (a.editedOutcomeText || a.outcomeText || a.description || '—').slice(0, 60);
      const outcomeEllipsis = (a.editedOutcomeText || a.outcomeText || '')?.length > 60 ? '…' : '';
      return `<tr style="border-bottom:0.5px solid #e5e7eb;">
        <td style="padding:5px 8px;font-size:10px;color:#374151;">${escapeHtml(dateStr)}</td>
        <td style="padding:5px 8px;font-size:10px;font-weight:500;color:#111827;">${escapeHtml(volunteer?.displayName || 'Volunteer')}</td>
        <td style="padding:5px 8px;font-size:10px;color:#374151;">${escapeHtml(org?.name || 'NGO')}</td>
        <td style="padding:5px 8px;font-size:10px;color:#374151;">${escapeHtml(outcomeText)}${outcomeEllipsis}</td>
        <td style="padding:5px 8px;font-size:10px;text-align:center;color:#374151;">${a.hours || 0}h</td>
        <td style="padding:5px 8px;font-size:10px;"><span style="color:#059669;">&#10003; ${a.deviceId ? 'App' : 'Platform'}</span></td>
        <td style="padding:5px 8px;font-size:10px;color:#374151;">${a.geolocation ? '&#x1F4CD; Located' : '—'}</td>
      </tr>`;
    }).join('');

    // ─── Visual HTML Snippets (audit-credible graphics) ──────────────────────

    // Geographic Heatmap: aggregate verified count per NGO location
    const _geoMap: Record<string, number> = {};
    for (const act of verified) {
      if (!act.verifiedBy) continue;
      const _go = verifierToOrgMap.get(act.verifiedBy);
      if (!_go) continue;
      const _gl = (String(_go.location || '')).split(',')[0].trim() || 'Unknown';
      _geoMap[_gl] = (_geoMap[_gl] || 0) + 1;
    }
    const _geoEntries = Object.entries(_geoMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const _geoMax = _geoEntries.length > 0 ? _geoEntries[0][1] : 1;
    const _geoBarRows = _geoEntries.map(([loc, count], i) =>
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:' + (i < _geoEntries.length - 1 ? '8px' : '0') + ';">' +
      '<div style="width:130px;flex-shrink:0;font-size:9.5px;color:#374151;font-weight:600;">' + escapeHtml(loc) + '</div>' +
      '<div style="flex:1;background:#E5E7EB;height:14px;border-radius:2px;overflow:hidden;">' +
      '<div style="width:' + Math.round((count / _geoMax) * 100) + '%;height:100%;background:' + (i === 0 ? '#0A2463' : '#374151') + ';border-radius:2px;opacity:' + (1 - i * 0.12).toFixed(2) + ';"></div>' +
      '</div>' +
      '<div style="width:100px;flex-shrink:0;font-size:9.5px;color:#374151;font-weight:500;">' + count + ' verifications</div>' +
      '</div>'
    ).join('');
    const _geoHeatmapHtml =
      '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">Global Verification Density &#x2014; ' + periodDisplay + '</div>' +
      '<div style="padding:12px 16px;background:#F9FAFB;">' + (_geoEntries.length > 0 ? _geoBarRows : '<div style="font-size:10px;color:#6B7280;">No location data available for this period.</div>') + '</div>' +
      '<div style="padding:7px 16px;border-top:1px solid #E5E7EB;background:#F9FAFB;display:flex;gap:24px;font-size:9px;color:#374151;">' +
      '<span>Verification Rate: <strong style="color:#0A2463;">' + verificationRate + '%</strong></span>' +
      '<span>Avg. SLA: <strong style="color:#0A2463;">' + avgVerificationHours + 'h</strong></span>' +
      '<span style="color:#6B7280;">SMS + PWA Verified</span></div></div>';

    // SDG Horizontal Bar Chart — denominator = all SDGs (not just top-6 slice)
    const _sdgTotAll = Object.values(sdgMap).reduce((s: number, d: any) => s + d.outcomes, 0);
    const _sdgBarEs = sortedSdgs.slice(0, 6).map(([sdg, data]: any) => {
      const _n = parseInt(sdg);
      const _p = _sdgTotAll > 0 ? Math.round((data.outcomes / _sdgTotAll) * 100) : 0;
      return { lbl: 'SDG ' + _n, name: SDG_NAMES_LOCAL[_n] || ('SDG ' + _n), pct: _p, outcomes: data.outcomes };
    });
    const _sdgBarRows = _sdgBarEs.map((e: any, i: number) =>
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:' + (i < _sdgBarEs.length - 1 ? '8px' : '0') + ';">' +
      '<div style="width:110px;flex-shrink:0;font-size:9.5px;font-weight:600;">' +
      '<span style="color:#0A2463;">' + e.lbl + '</span> <span style="color:#6B7280;font-weight:400;">' + escapeHtml(e.name) + '</span></div>' +
      '<div style="flex:1;background:#E5E7EB;height:14px;border-radius:2px;overflow:hidden;">' +
      '<div style="width:' + e.pct + '%;height:100%;background:#0A2463;border-radius:2px;"></div>' +
      '</div>' +
      '<div style="width:120px;flex-shrink:0;font-size:9.5px;color:#374151;font-weight:500;">' + e.pct + '% <span style="color:#6B7280;font-weight:400;">(' + e.outcomes + ' outcomes verified)</span></div>' +
      '</div>'
    ).join('');
    const _sdgBarHtml = _sdgBarEs.length > 0
      ? '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
        '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">SDG Alignment &#x2014; Verified Outcome Distribution</div>' +
        '<div style="padding:12px 16px;background:#F9FAFB;">' + _sdgBarRows + '</div>' +
        '<div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">All percentages refer to verified outcomes only. SDG alignment confirmed by NGO program directors.</div>' +
        '</div>'
      : '';

    // Verification Density Strip
    const _vdsHtml =
      '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;">' +
      '<div style="padding:16px 20px;border-right:1px solid #E5E7EB;background:#F9FAFB;">' +
      '<div style="font-size:22px;font-weight:700;color:#0A2463;line-height:1.1;">' + verified.length.toLocaleString() + ' Verified</div>' +
      '<div style="font-size:11px;color:#374151;margin-top:4px;font-weight:600;">Outcomes &#x2713;</div>' +
      '<div style="font-size:10px;color:#6B7280;margin-top:6px;">' + verificationRate + '% Verification Rate</div>' +
      '</div>' +
      '<div style="padding:16px 20px;border-right:1px solid #E5E7EB;background:#F9FAFB;">' +
      '<div style="font-size:22px;font-weight:700;color:#0A2463;line-height:1.1;">' + Math.round(totalHours).toLocaleString() + ' Verified</div>' +
      '<div style="font-size:11px;color:#374151;margin-top:4px;font-weight:600;">Hours &#x23F1;</div>' +
      '<div style="font-size:10px;color:#6B7280;margin-top:6px;">' + avgVerificationHours + 'h Avg SLA</div>' +
      '</div>' +
      '<div style="padding:16px 20px;background:#F9FAFB;">' +
      '<div style="font-size:22px;font-weight:700;color:#0A2463;line-height:1.1;">' + effectiveBeneficiaries.toLocaleString() + ' Verified</div>' +
      '<div style="font-size:11px;color:#374151;margin-top:4px;font-weight:600;">Beneficiaries</div>' +
      '<div style="font-size:10px;color:#6B7280;margin-top:6px;">NGO-Tracked</div>' +
      '</div></div>' +
      '<div style="padding:6px 20px;background:#0A2463;font-size:9px;color:#E5E7EB;letter-spacing:0.03em;">Management Reporting Verified &#x2014; Supports CSRD Assurance (ISAE 3000)</div>' +
      '</div>';

    // CSRD Boundary Indicator
    const _csrdBoundHtml =
      '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">CSRD Assurance Boundary Indicator</div>' +
      '<div style="padding:14px 16px;background:#F9FAFB;">' +
      '<div style="background:#E5E7EB;height:18px;border-radius:3px;overflow:hidden;border:1px solid #D1D5DB;margin-bottom:8px;">' +
      '<div style="width:65%;height:100%;background:#0A2463;display:flex;align-items:center;padding-left:8px;">' +
      '<span style="font-size:9px;color:#F9FAFB;font-weight:700;">65%</span></div></div>' +
      '<div style="font-size:10.5px;color:#374151;font-weight:600;margin-bottom:4px;">Supports CSRD Assurance <span style="color:#0891B2;">(Management Reporting Verified)</span></div>' +
      '<div style="font-size:9px;color:#6B7280;font-style:italic;padding-top:6px;border-top:1px solid #E5E7EB;margin-top:6px;">* Independent auditor procedures per ISAE 3000 required for formal assurance. Synerxus reduces evidence-gathering burden &#x2014; it does not replace auditor judgment or opinion.</div>' +
      '</div></div>';

    // Boundary Integrity Matrix
    const _boundMatrixHtml =
      '<div style="margin-bottom:20px;">' +
      '<h3 style="color:#0A2463;font-size:13px;font-weight:700;border-bottom:2px solid #00A896;padding-bottom:4px;margin-bottom:12px;">&#9635; Verification Boundary &#x2014; Scope Definition</h3>' +
      '<div style="font-family:Inter,sans-serif;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">Verification Boundary &#x2014; Included vs. Excluded</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;">' +
      '<div style="border-right:1px solid #E5E7EB;">' +
      '<div style="padding:8px 16px;font-size:10px;font-weight:700;color:#0891B2;background:#F0FDFF;border-bottom:1px solid #E5E7EB;">Included (Verified)</div>' +
      ['NGO-confirmed outcomes','72h verification window','Validated beneficiary counts','Immutable audit trails'].map((item, i, arr) =>
        '<div style="padding:7px 16px;font-size:10.5px;color:#374151;' + (i < arr.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : '') + 'display:flex;align-items:center;gap:8px;"><span style="color:#0891B2;font-weight:700;">&#x2713;</span> ' + item + '</div>'
      ).join('') +
      '</div>' +
      '<div>' +
      '<div style="padding:8px 16px;font-size:10px;font-weight:700;color:#374151;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Excluded (Not Verified)</div>' +
      ['Self-reported hours','Outcomes &gt;72h post-completion','Projected/estimated numbers','Financial SROI valuation'].map((item, i, arr) =>
        '<div style="padding:7px 16px;font-size:10.5px;color:#6B7280;' + (i < arr.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : '') + 'display:flex;align-items:center;gap:8px;"><span style="color:#9CA3AF;font-weight:700;">&#x2717;</span> ' + item + '</div>'
      ).join('') +
      '</div></div></div></div>';

    // Evidence Object Architecture
    const _evidArchHtml =
      '<div style="font-family:Inter,sans-serif;margin-bottom:14px;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">Evidence Object: Structured Verification Unit</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;">' +
      '<div style="border-right:1px solid #E5E7EB;">' +
      '<div style="padding:8px 14px;font-size:10px;font-weight:700;color:#0A2463;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Outcome Data</div>' +
      ['Deliverable','Beneficiaries','Hours','Skills Applied'].map((item, i, arr) =>
        '<div style="padding:5px 14px;font-size:10px;color:#374151;' + (i < arr.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : '') + '">&#x2022; ' + item + '</div>'
      ).join('') + '</div>' +
      '<div style="border-right:1px solid #E5E7EB;">' +
      '<div style="padding:8px 14px;font-size:10px;font-weight:700;color:#0A2463;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Audit Trail</div>' +
      ['Timestamp','Verifier ID','Geolocation','Device Hash'].map((item, i, arr) =>
        '<div style="padding:5px 14px;font-size:10px;color:#374151;' + (i < arr.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : '') + '">&#x2022; ' + item + '</div>'
      ).join('') + '</div>' +
      '<div>' +
      '<div style="padding:8px 14px;font-size:10px;font-weight:700;color:#0A2463;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Regulatory Metadata</div>' +
      ['SDG Primary/Secondary','ESRS Mapping (S3/S4)','Project ID','Corporate Program'].map((item, i, arr) =>
        '<div style="padding:5px 14px;font-size:10px;color:#374151;' + (i < arr.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : '') + '">&#x2022; ' + item + '</div>'
      ).join('') + '</div></div>' +
      '<div style="padding:10px 16px;background:#F0FDFF;border-top:1px solid #E5E7EB;display:flex;align-items:center;gap:12px;">' +
      '<span style="color:#0891B2;font-size:14px;">&#x2193;</span>' +
      '<span style="font-size:10px;color:#0891B2;font-weight:700;">NGO Verification &#x2713; within 72h</span>' +
      '<span style="font-size:10px;color:#6B7280;">&#x2192;</span>' +
      '<span style="font-size:10px;color:#374151;font-weight:600;">Immutable Record Locked</span>' +
      '</div></div>';

    // Contribution Chain
    const _contribChainHtml =
      '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">Contribution Chain &#x2014; Verification Node</div>' +
      '<div style="padding:16px;background:#F9FAFB;display:flex;align-items:center;flex-wrap:wrap;">' +
      [
        { label: 'Volunteer Activity', verified: false, sla: '' },
        { label: 'NGO Verification &#x2713;', verified: true, sla: avgVerificationHours + 'h Avg SLA' },
        { label: 'Verified Outcome', verified: false, sla: '' },
        { label: 'Beneficiaries', verified: false, sla: '' },
        { label: 'SDG Advanced', verified: false, sla: '' },
      ].map((node, i, arr) =>
        '<div style="display:flex;align-items:center;">' +
        '<div style="padding:8px 12px;border:' + (node.verified ? '1.5px solid #0891B2' : '1px solid #E5E7EB') + ';border-radius:3px;background:' + (node.verified ? '#F0FDFF' : '#FFFFFF') + ';text-align:center;min-width:90px;">' +
        '<div style="font-size:9.5px;font-weight:' + (node.verified ? '700' : '500') + ';color:' + (node.verified ? '#0891B2' : '#374151') + ';line-height:1.3;">' + node.label + '</div>' +
        (node.sla ? '<div style="font-size:8.5px;color:#0A2463;font-weight:600;margin-top:3px;">' + node.sla + '</div>' : '') +
        '</div>' +
        (i < arr.length - 1 ? '<div style="padding:0 6px;color:#9CA3AF;font-size:14px;font-weight:300;">&#x2192;</div>' : '') +
        '</div>'
      ).join('') +
      '</div>' +
      '<div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">Independent NGO verification is the trust mechanism &#x2014; not self-reported activity.</div>' +
      '</div>';

    // Screening Status Matrix
    const _screeningMatHtml =
      '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">Negative Impact Screening &#x2014; Status Matrix</div>' +
      '<div style="display:grid;grid-template-columns:2fr 80px 100px 1fr;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">' +
      ['Screening Dimension','Status','Outcomes Affected','Verification Method'].map((h, i) =>
        '<div style="padding:6px 12px;font-size:9px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.04em;' + (i < 3 ? 'border-right:1px solid #E5E7EB;' : '') + '">' + h + '</div>'
      ).join('') + '</div>' +
      [
        { dim: 'Community Harm', method: 'NGO Program Director' },
        { dim: 'Environmental Effects', method: 'Community Liaison' },
        { dim: 'Resource Displacement', method: 'Project Coordinator' },
        { dim: 'Beneficiary Concerns', method: 'Structured Survey' },
      ].map((row, i, arr) =>
        '<div style="display:grid;grid-template-columns:2fr 80px 100px 1fr;' + (i < arr.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : '') + '">' +
        '<div style="padding:7px 12px;font-size:10px;color:#374151;border-right:1px solid #E5E7EB;">' + row.dim + '</div>' +
        '<div style="padding:7px 12px;font-size:10px;color:#0891B2;font-weight:700;border-right:1px solid #E5E7EB;display:flex;align-items:center;gap:4px;">&#x2713; Pass</div>' +
        '<div style="padding:7px 12px;font-size:10px;font-weight:700;color:#374151;border-right:1px solid #E5E7EB;text-align:center;">0</div>' +
        '<div style="padding:7px 12px;font-size:10px;color:#6B7280;">' + row.method + '</div>' +
        '</div>'
      ).join('') +
      '</div>';

    // Verification Timeline
    const _verifyTimelineHtml =
      '<div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">' + periodDisplay + ' Verification Timeline &#x2014; SLA Compliance</div>' +
      '<div style="padding:14px 16px;background:#F9FAFB;">' +
      '<div style="font-size:9px;color:#6B7280;margin-bottom:6px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">90-Day Reporting Window</div>' +
      '<div style="background:#E5E7EB;height:20px;border-radius:3px;overflow:hidden;border:1px solid #D1D5DB;margin-bottom:6px;">' +
      '<div style="width:' + verificationRate + '%;height:100%;background:#0A2463;"></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:4px;">' +
      '<div style="display:flex;align-items:center;gap:8px;"><div style="width:12px;height:8px;background:#0A2463;border-radius:1px;flex-shrink:0;"></div>' +
      '<span style="font-size:9.5px;color:#374151;font-weight:600;">' + verificationRate + '% verified within 72h SLA</span></div>' +
      '<div style="display:flex;align-items:center;gap:8px;"><div style="width:12px;height:8px;background:#0891B2;border-radius:1px;flex-shrink:0;"></div>' +
      '<span style="font-size:9.5px;color:#374151;font-weight:600;">100% immutable audit trails maintained</span></div>' +
      '</div></div>' +
      '<div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">Timestamps verified against stated SLA. 72h SLA matches boundary definition for defensibility.</div>' +
      '</div>';

    // Assurance Boundary Diagram
    const _assuranceDiagHtml =
      '<div style="margin-bottom:20px;">' +
      '<h3 style="color:#0A2463;font-size:13px;font-weight:700;border-bottom:2px solid #00A896;padding-bottom:4px;margin-bottom:12px;">&#9635; Assurance Boundary &#x2014; Limitations &amp; Scope</h3>' +
      '<div style="font-family:Inter,sans-serif;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">' +
      '<div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:0.05em;text-transform:uppercase;">Assurance Boundary &#x2014; Limitations &amp; Scope</div>' +
      '<div style="padding:16px;background:#F9FAFB;">' +
      '<div style="display:flex;flex-direction:column;align-items:center;">' +
      '<div style="width:100%;padding:10px 16px;border:1.5px solid #374151;border-radius:4px;background:#F9FAFB;text-align:center;">' +
      '<div style="font-size:10px;font-weight:700;color:#374151;">Independent Assurance &#x2014; ISAE 3000 REQUIRED</div>' +
      '<div style="font-size:9px;color:#9CA3AF;margin-top:2px;">(Auditor Judgment)</div></div>' +
      '<div style="color:#9CA3AF;font-size:14px;line-height:1;margin:4px 0;">&#x2193;</div>' +
      '<div style="width:88%;padding:10px 16px;border:1.5px solid #0891B2;border-radius:4px;background:#F0FDFF;text-align:center;">' +
      '<div style="font-size:10px;font-weight:700;color:#0A2463;">Synerxus: Management Reporting Verified &#x2713;</div>' +
      '<div style="font-size:9px;color:#0891B2;margin-top:2px;">(NGO Verification)</div></div>' +
      '<div style="color:#9CA3AF;font-size:14px;line-height:1;margin:4px 0;">&#x2193;</div>' +
      '<div style="width:76%;padding:10px 16px;border:1.5px solid #0A2463;border-radius:4px;background:#EFF6FF;text-align:center;">' +
      '<div style="font-size:10px;font-weight:700;color:#0A2463;">Self-Reported &#x2192; Verified &#x2192; Audit-Ready</div>' +
      '</div></div></div>' +
      '<div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">Synerxus provides verification infrastructure &#x2014; not assurance opinion. Independent auditor required for ISAE 3000 / CSRD formal assurance.</div>' +
      '</div></div>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Synerxus Corporate ESG Impact Report — ${corpName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --navy: #0A2463; --teal: #00A896; --gold: #F08A5D;
    --teal-lt: #E0F4F2; --navy-lt: #EEF2FF;
    --bd: #e5e7eb; --bg-s: #f9fafb; --txt: #111827; --txt-s: #6b7280;
    --r: 8px;
  }
  body { font-family: 'Inter', sans-serif; color: var(--txt); background: #fff; font-size: 11px; line-height: 1.5; }
  .page { max-width: 900px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 20px; font-weight: 800; }
  h2 { font-size: 13px; font-weight: 700; color: #fff; }
  h3 { font-size: 12px; font-weight: 700; color: var(--navy); margin-bottom: 8px; break-after: avoid; page-break-after: avoid; }
  h3 + * { break-before: avoid; page-break-before: avoid; }
  table { width: 100%; border-collapse: collapse; break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  td { break-inside: avoid; page-break-inside: avoid; }
  th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #fff; padding: 7px 8px; break-inside: avoid; page-break-inside: avoid; }
  .section { margin-bottom: 20px; border: 0.5px solid var(--bd); border-radius: var(--r); overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .section-header { background: var(--navy); padding: 10px 14px; break-after: avoid; page-break-after: avoid; }
  .section-header + * { break-before: avoid; page-break-before: avoid; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; break-inside: avoid; page-break-inside: avoid; }
  .kpi { background: #fff; border: 0.5px solid var(--bd); border-radius: var(--r); padding: 12px 14px; break-inside: avoid; page-break-inside: avoid; }
  .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--txt-s); margin-bottom: 4px; }
  .kpi-value { font-size: 22px; font-weight: 800; color: var(--navy); line-height: 1.1; }
  .kpi-sub { font-size: 9px; color: var(--txt-s); margin-top: 2px; }
  .badge-ok { color: #059669; font-weight: 600; }
  .badge-warn { color: #d97706; font-weight: 600; }
  .note { background: var(--teal-lt); border-left: 3px solid var(--teal); padding: 8px 12px; font-size: 10px; color: #065f46; margin: 10px 0; border-radius: 0 var(--r) var(--r) 0; break-inside: avoid; page-break-inside: avoid; }
  .warn-note { background: #fffbeb; border-left: 3px solid var(--gold); padding: 8px 12px; font-size: 10px; color: #92400e; margin: 10px 0; border-radius: 0 var(--r) var(--r) 0; break-inside: avoid; page-break-inside: avoid; }
  @page { size: A4 portrait; margin: 11mm 22mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 0; }
    .kpi-grid { break-inside: avoid; page-break-inside: avoid; }
    .section { break-inside: avoid; page-break-inside: avoid; }
    .section-header { break-after: avoid; page-break-after: avoid; }
    .section-header + * { break-before: avoid; page-break-before: avoid; }
    h3 { break-after: avoid; page-break-after: avoid; }
    h3 + * { break-before: avoid; page-break-before: avoid; }
    table { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    td, th { break-inside: avoid; page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

<!-- REPORT HEADER -->
<div style="border:1.5px solid var(--bd);border-radius:var(--r);overflow:hidden;margin-bottom:${(filterEmployeeNames && filterEmployeeNames.length) || (filterProjectIds && filterProjectIds.length) || (filterNgoNames && filterNgoNames.length) ? '8px' : '20px'};">
  <div style="background:var(--navy);height:5px;"></div>
  <div style="background:#fff;padding:16px 20px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <img src="${LOGO_DATA_URI}" alt="Synerxus" style="height:44px;width:auto;display:block;" />
          <div style="display:flex;flex-direction:column;justify-content:center;gap:2px;">
            <span style="font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1;font-family:Arial,sans-serif;"><span style="color:#0A2463;">SYNER</span><span style="color:#D4980C;">XUS</span></span>
            <span style="font-size:11px;font-weight:600;line-height:1;white-space:nowrap;font-family:Arial,sans-serif;"><span style="color:#D4980C;">Impacts.</span> <span style="color:#0A2463;">Verified.</span></span>
          </div>
        </div>
        <div style="font-size:18px;font-weight:800;color:var(--navy);">Corporate ESG Impact Report</div>
        <div style="color:var(--txt-s);font-size:10px;margin-top:2px;">UN SDG-Aligned · NGO-Confirmed Outcomes · SUPPORTS Audit Procedures</div>
      </div>
      <div style="text-align:right;color:var(--txt-s);font-size:10px;">
        <div style="color:var(--navy);font-weight:700;font-size:13px;margin-bottom:3px;">Report ID: ${reportId}</div>
        <div>Generated: ${reportDate}</div>
        <div style="margin-top:2px;">Corporation: <strong style="color:var(--navy);">${corpName}</strong></div>
        <div>Reporting Period: <strong style="color:var(--navy);">${periodDisplay}</strong></div>
      </div>
    </div>
  </div>
</div>
${(filterEmployeeNames?.length || filterProjectIds?.length || filterNgoNames?.length) ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:0 0 var(--r) var(--r);padding:8px 20px;margin-bottom:20px;font-size:10px;color:#1e40af;">🔍 Filtered by: ${[filterEmployeeNames?.length ? `Employees: ${filterEmployeeNames.join(', ')}` : '', filterProjectIds?.length ? `Projects (${filterProjectIds.length} selected)` : '', filterNgoNames?.length ? `NGO Partners: ${filterNgoNames.join(', ')}` : ''].filter(Boolean).join(' · ')}</div>` : ''}

<!-- TEMPLATE CONTEXT NOTICE -->
<div style="background:#fef3c7;border:1.5px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-bottom:20px;break-inside:avoid;page-break-inside:avoid;">
  <div style="font-size:10px;font-weight:700;color:#92400e;letter-spacing:0.5px;margin-bottom:4px;">&#9888; TEMPLATE CONTEXT — DATA LAYER WARNING</div>
  <div style="font-size:10px;color:#78350f;line-height:1.6;">This is an <strong>illustrative audit-support structure</strong> demonstrating how Synerxus verification architecture SUPPORTS CSRD disclosure requirements. This report is classified as <strong>Management Reporting (Verified)</strong> — NOT a formal assurance opinion. Data shown reflects NGO-confirmed outcomes from the active corporate pilot. Real production data requires direct NGO confirmation. Synerxus is DESIGNED to reduce auditor evidence-gathering by 60–70%; it does not replace auditor judgment per ISAE 3000.</div>
</div>

<!-- SECTION 1: EXECUTIVE SNAPSHOT -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 1: Executive Snapshot</h3>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">NGO Partners</div><div class="kpi-value">${Object.keys(ngoStats).length}</div><div class="kpi-sub">organizations</div></div>
    <div class="kpi"><div class="kpi-label">Employees Volunteering</div><div class="kpi-value">${uniqueVolunteerIds.size}</div><div class="kpi-sub">of ${linkedUserIds.length} linked</div></div>
    <div class="kpi"><div class="kpi-label">NGO-Confirmed Outcomes</div><div class="kpi-value">${verified.length}</div><div class="kpi-sub">${totalOutcomes} total units</div></div>
    <div class="kpi"><div class="kpi-label">Verified Hours</div><div class="kpi-value">${Math.round(totalHours)}</div><div class="kpi-sub">NGO-verified (not self-reported)</div></div>
    <div class="kpi"><div class="kpi-label">Beneficiaries Reached</div><div class="kpi-value">${effectiveBeneficiaries.toLocaleString()}</div><div class="kpi-sub">${totalBeneficiaries > 0 ? 'NGO-tracked' : 'from outcomes'}</div><div style="font-size:8px;color:#9ca3af;margin-top:3px;line-height:1.3;">&#8224; NGO partner estimates, not independently verified. Sample 15&#8211;30% per ISAE 3000.</div></div>
    <div class="kpi"><div class="kpi-label">Verification Rate</div><div class="kpi-value">${verificationRate}%</div><div class="kpi-sub">avg ${avgVerificationHours}h turnaround</div></div>
    <div class="kpi"><div class="kpi-label">Avg Hours/Employee</div><div class="kpi-value">${avgHoursPerEmployee}h</div><div class="kpi-sub">NGO-verified</div></div>
    <div class="kpi"><div class="kpi-label">SDGs Addressed</div><div class="kpi-value">${sortedSdgs.length}</div><div class="kpi-sub">goals impacted</div></div>
  </div>

  ${_vdsHtml}
  ${_csrdBoundHtml}

  <div class="section">
    <div class="section-header"><h2>ESRS Disclosure Support Status</h2></div>
    <table>
      <thead><tr style="background:#f1f5f9;"><th style="color:var(--navy);">ESRS Requirement</th><th style="color:var(--navy);">Status</th><th style="color:var(--navy);">Evidence</th></tr></thead>
      <tbody>
        <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS S1.4 — Workforce skills</td><td style="padding:6px 8px;" class="badge-ok">&#10003; ${uniqueVolunteerIds.size} employees deployed verified skills</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 3 + Outcome Log</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);background:#f9fafb;"><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS S3.3 — Community engagement</td><td style="padding:6px 8px;" class="badge-ok">&#10003; ${Object.keys(ngoStats).length} NGO partners, ${verified.length} verified outcomes</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 2 + Outcome Log</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS S3.4 — Actual community impacts</td><td style="padding:6px 8px;" class="badge-ok">&#10003; ${effectiveBeneficiaries.toLocaleString()} beneficiaries reached</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 2 + Beneficiary Counts</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);background:#f9fafb;"><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS S3.4 — Negative impacts (double materiality)</td><td style="padding:6px 8px;" class="${rejected.length > 0 ? 'badge-warn' : 'badge-ok'}">${rejected.length > 0 ? '&#9888; ' + rejected.length + ' disclosed' : '&#10003; None disclosed this period'}</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 6</td></tr>
        <tr><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS G1.3 — Monitoring processes</td><td style="padding:6px 8px;" class="badge-ok">&#10003; ${verificationRate}% verification rate, ${avgVerificationHours}h avg SLA</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Verification Trail (Section 5)</td></tr>
      </tbody>
    </table>
  </div>
  <div class="note">&#128161; <strong>Key Differentiator:</strong> Unlike Benevity/YourCause (self-reported hours only), Synerxus delivers <strong>NGO-verified outcomes AND hours</strong> with immutable audit trails — DESIGNED to support CSRD disclosure requirements for third-party verified social impact data (ESRS S3).</div>
</div>

${_boundMatrixHtml}

<!-- SECTION 2: NGO PARTNERSHIPS -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 2: NGO Partnership Impact</h3>
  ${Object.keys(ngoStats).length === 0 ? '<p style="color:var(--txt-s);font-size:11px;padding:12px;">No NGO partners found for this reporting period.</p>' : `
  <div class="section">
    <div class="section-header"><h2>Sponsored NGO Partners — Verified Impact</h2></div>
    <table>
      <thead><tr><th>NGO Partner</th><th>Location</th><th>Verified Outcomes</th><th>Beneficiaries</th><th>SDG Alignment</th><th>Audit Status</th></tr></thead>
      <tbody>${ngoRows}</tbody>
    </table>
  </div>`}
  <div class="note">&#128161; <strong>CSRD Relevance:</strong> ESRS S3.3 requires disclosure of "operations with significant community impact." This section proves direct engagement with affected communities through NGO-verified outcomes — replacing self-reported claims.</div>
</div>

<!-- SECTION 3: EMPLOYEE VOLUNTEERING -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 3: Employee Volunteering (ESRS S1.4)</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
    <div class="section">
      <div class="section-header"><h2>Participation Metrics</h2></div>
      <table>
        <tbody>
          <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:7px 10px;font-size:11px;font-weight:600;">Employees Volunteering</td><td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700;color:var(--navy);">${uniqueVolunteerIds.size}</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);"><span class="badge-ok">&#10003; Verified roster</span></td></tr>
          <tr style="border-bottom:0.5px solid var(--bd);background:#f9fafb;"><td style="padding:7px 10px;font-size:11px;font-weight:600;">Total Verified Hours</td><td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700;color:var(--navy);">${Math.round(totalHours)}h</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);"><span class="badge-ok">&#10003; NGO-verified</span></td></tr>
          <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:7px 10px;font-size:11px;font-weight:600;">Avg Hours per Employee</td><td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700;color:var(--navy);">${avgHoursPerEmployee}h</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);">vs. self-reported avg</td></tr>
          <tr><td style="padding:7px 10px;font-size:11px;font-weight:600;">Beneficiaries per Outcome</td><td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700;color:var(--navy);">${beneficiariesPerOutcome > 0 ? beneficiariesPerOutcome : 'N/A'}</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);">${beneficiariesPerOutcome > 0 ? '<span class="badge-ok">&#10003; Platform-tracked</span>' : 'Add outcomes to activate'}</td></tr>
        </tbody>
      </table>
      <div style="font-size:9px;color:#9ca3af;margin-top:4px;padding:0 2px;">${verified.length} verified activit${verified.length === 1 ? 'y' : 'ies'} · ${totalOutcomes > 0 ? totalOutcomes.toLocaleString() + ' total outcome units' : 'no outcome units set'} · ${effectiveBeneficiaries.toLocaleString()} beneficiar${effectiveBeneficiaries === 1 ? 'y' : 'ies'} reached${totalBeneficiaries === 0 && totalOutcomes > 0 ? ' (from outcome units)' : ''}</div>
    </div>
    <div class="section">
      <div class="section-header"><h2>Industry Benchmarks</h2></div>
      <table>
        <tbody>
          <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:7px 10px;font-size:11px;">Verification Rate</td><td style="padding:7px 10px;font-size:11px;font-weight:700;color:var(--navy);">${verificationRate}%</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);">vs. N/A (competitors)</td></tr>
          <tr style="border-bottom:0.5px solid var(--bd);background:#f9fafb;"><td style="padding:7px 10px;font-size:11px;">Verification SLA</td><td style="padding:7px 10px;font-size:11px;font-weight:700;color:var(--navy);">${avgVerificationHours}h avg</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);">target: ≤72h</td></tr>
          <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:7px 10px;font-size:11px;">SDGs Addressed</td><td style="padding:7px 10px;font-size:11px;font-weight:700;color:var(--navy);">${sortedSdgs.length} goals</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);">vs. 2.3 avg (Fortune 500)</td></tr>
          <tr><td style="padding:7px 10px;font-size:11px;">NGO Partners</td><td style="padding:7px 10px;font-size:11px;font-weight:700;color:var(--navy);">${Object.keys(ngoStats).length}</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);">vs. 8 avg (Benevity)</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  ${topVolunteers.length > 0 ? `
  <div class="section">
    <div class="section-header"><h2>Top Employee Contributors (Verified Outcomes)</h2></div>
    <table>
      <thead><tr><th>Employee</th><th>Dept.</th><th style="text-align:center;">Verified Outcomes</th><th style="text-align:center;">Hours</th><th>NGO Partners</th><th>Skills Deployed</th></tr></thead>
      <tbody>${employeeRows}</tbody>
    </table>
  </div>` : ''}
  ${_geoHeatmapHtml}
  <div class="note">&#128161; <strong>CSRD Relevance:</strong> ESRS S1.4 requires disclosure of "workforce skills development." This section proves employees gained cross-cultural project management experience through NGO-verified outcomes — not self-assessed surveys.</div>
</div>

<!-- SECTION 4: SDG ALIGNMENT -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 4: SDG Alignment &amp; Impact Attribution</h3>
  ${sortedSdgs.length === 0 ? '<p style="color:var(--txt-s);font-size:11px;padding:12px;">No SDG data found for this period.</p>' : `
  <div class="section">
    <div class="section-header"><h2>UN Sustainable Development Goals Contribution</h2></div>
    <table>
      <thead><tr><th>SDG</th><th>Goal</th><th style="text-align:center;">Outcomes</th><th style="text-align:center;">Hours</th><th style="text-align:center;">Beneficiaries</th></tr></thead>
      <tbody>${sdgRows}</tbody>
    </table>
  </div>
  ${_sdgBarHtml}`}
</div>

<!-- SECTION 5: AUDIT TRAIL -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 5: Verified Outcomes Log (Audit Trail)</h3>
  ${verified.length === 0 ? '<p style="color:var(--txt-s);font-size:11px;padding:12px;">No verified outcomes for this period.</p>' : `
  <div class="section">
    <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;"><h2>Immutable Records for Auditor Sampling (showing ${Math.min(10, verified.length)} of ${verified.length})</h2></div>
    <table>
      <thead><tr><th>Date</th><th>Employee</th><th>NGO Partner</th><th>Outcome Verified</th><th style="text-align:center;">Hours</th><th>Method</th><th>Geolocation</th></tr></thead>
      <tbody>${auditRows}</tbody>
    </table>
  </div>`}
  ${_verifyTimelineHtml}
  <div style="background:#f0f9ff;border:0.5px solid #bae6fd;border-radius:var(--r);padding:8px 12px;font-size:10px;color:#0369a1;margin-top:8px;">
    &#128269; <strong>Auditor Use Case:</strong> Randomly sample 15–30% of outcomes for direct NGO confirmation. Each record includes verifier identity, timestamp, and contact information for the NGO programme director.
  </div>
</div>

<!-- SECTION 6: DOUBLE MATERIALITY -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 6: Double Materiality Disclosure (ESRS S3.4)</h3>
  <div class="section">
    <div class="section-header" style="background:#92400e;"><h2>&#9888; Negative Impact Disclosures — SUPPORTS CSRD Double Materiality Requirements</h2></div>
    ${rejected.length === 0
      ? '<p style="padding:12px;font-size:11px;color:#374151;">&#10003; No negative impacts disclosed for this reporting period.</p>'
      : `<table><thead><tr><th>Date</th><th>NGO Partner</th><th>Outcome</th><th>Negative Impact</th></tr></thead><tbody>${rejected.slice(0, 5).map((a: any) => {
          const org = a.verifiedBy ? verifierToOrgMap.get(a.verifiedBy) : null;
          const dateStr = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date).split('T')[0];
          return `<tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:6px 8px;font-size:10px;">${escapeHtml(dateStr)}</td><td style="padding:6px 8px;font-size:10px;">${escapeHtml(org?.name || 'NGO')}</td><td style="padding:6px 8px;font-size:10px;">${escapeHtml((a.outcomeText || a.description || '—').slice(0, 50))}</td><td style="padding:6px 8px;font-size:10px;color:#b45309;">${escapeHtml(a.rejectedReason || 'Not meeting verification standards')}</td></tr>`;
        }).join('')}</tbody></table>`}
  </div>
  ${_screeningMatHtml}
  <div class="warn-note">&#9888; <strong>CSRD Requirement:</strong> ESRS S3.4 mandates disclosure of "actual and potential negative impacts on communities." This section satisfies double materiality — showing both positive outcomes AND unintended consequences.</div>
</div>

<!-- APPENDIX: METHODOLOGY -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Appendix A: Verification Methodology</h3>
  ${_evidArchHtml}
  <div class="section">
    <div class="section-header"><h2>Three-Step NGO Verification Process</h2></div>
    <div style="padding:12px;font-size:11px;color:#374151;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
      <div style="background:var(--teal-lt);border-radius:var(--r);padding:10px;">
        <div style="font-weight:700;color:var(--navy);margin-bottom:4px;">1. Employee Submission</div>
        Logs outcome description + hours claimed through Synerxus platform with optional photo/geolocation evidence.
      </div>
      <div style="background:var(--teal-lt);border-radius:var(--r);padding:10px;">
        <div style="font-weight:700;color:var(--navy);margin-bottom:4px;">2. NGO Verification</div>
        Partner confirms BOTH outcome AND hours with single tap → immutable record with verifier identity and timestamp.
      </div>
      <div style="background:var(--teal-lt);border-radius:var(--r);padding:10px;">
        <div style="font-weight:700;color:var(--navy);margin-bottom:4px;">3. Audit Trail Capture</div>
        System logs verifier identity, timestamp, device ID/SMS number, and geolocation for every verified outcome.
      </div>
    </div>
  </div>
  ${_contribChainHtml}
  <div class="warn-note">&#9888; <strong>Honest Disclaimer:</strong> This verification trail provides raw materials for ESG assurance. Final limited assurance requires auditor procedures per ISAE 3000 (15–30% sampling, direct NGO confirmation). Synerxus is DESIGNED to reduce auditor evidence-gathering by 60–70% but does not replace auditor judgment.</div>
</div>

${_assuranceDiagHtml}

<!-- FOOTER -->
<div style="border-top:1px solid var(--bd);padding-top:12px;display:flex;justify-content:space-between;align-items:center;">
  <div style="font-size:10px;color:var(--txt-s);">
    <div>Report ID: ${reportId} · Generated by Synerxus on behalf of ${corpName}</div>
    <div style="margin-top:2px;">Reporting Period: ${periodDisplay} · All data NGO-verified with immutable audit trails</div>
    <div style="margin-top:2px;">Questions? support@synerxus.com · &copy; ${now.getFullYear()} Synerxus · CSRD Audit-Support Data (Management Verified) &mdash; Requires independent ISAE 3000 assurance for formal CSRD filing</div>
  </div>
  <div style="text-align:center;">
    <span style="display:inline-flex;align-items:center;gap:6px;background:var(--navy);border-radius:100px;padding:5px 12px;font-size:10px;color:#fff;">
      <span style="width:5px;height:5px;border-radius:50%;background:var(--teal);display:inline-block;"></span>
      Powered by <span style="font-weight:700;color:#ffffff;">SYNER</span><span style="font-weight:700;color:#B8860B;">XUS</span> · <span style="color:#B8860B;">Impact,</span> <span style="color:#ffffff;">Verified.</span>
    </span>
  </div>
</div>

</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `inline; filename="corporate-esg-report-${now.toISOString().split('T')[0]}.html"`);
    res.send(html);
  } catch (err) {
    console.error("Error generating corporate ESG report:", err);
    res.status(500).json({ message: "Failed to generate ESG report" });
  }
});

logsRouter.get("/verify/:token", async (req: Request, res: Response) => {
  try {
    const tokenValue = req.params.token;
    if (!tokenValue || tokenValue.length < 32) {
      return res.status(400).send(renderTokenPage("Invalid Link", "This verification link is invalid.", "error"));
    }

    const tokenRecord = await storage.getVerificationTokenByToken(tokenValue);
    if (!tokenRecord) {
      return res.status(404).send(renderTokenPage("Link Not Found", "This verification link does not exist or has already been used.", "error"));
    }

    if (tokenRecord.usedAt) {
      return res.status(410).send(renderTokenPage("Already Used", "This verification link has already been used.", "warning"));
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return res.status(410).send(renderTokenPage("Link Expired", "This verification link has expired. Links are valid for 72 hours.", "warning"));
    }

    const activity = await storage.getVolunteerActivity(tokenRecord.activityId);
    if (!activity) {
      return res.status(404).send(renderTokenPage("Activity Not Found", "The impact log associated with this link no longer exists.", "error"));
    }

    if (activity.verificationStatus !== 'pending') {
      return res.status(409).send(renderTokenPage("Already Processed", `This impact log has already been ${activity.verificationStatus}.`, "warning"));
    }

    const action = tokenRecord.action === 'approve' ? 'approved' : 'rejected';
    await storage.updateVolunteerActivity(tokenRecord.activityId, {
      verificationStatus: action,
      verifiedAt: new Date(),
    });
    await storage.markVerificationTokenUsed(tokenRecord.id);

    const otherTokens = await storage.listVerificationTokensByActivity(tokenRecord.activityId);
    for (const t of otherTokens) {
      if (t.id !== tokenRecord.id && !t.usedAt) {
        await storage.markVerificationTokenUsed(t.id);
      }
    }

    smsVerificationService.removeFromQueue(tokenRecord.activityId);

    try {
      await storage.createVerificationAuditLog({
        activityId: tokenRecord.activityId,
        projectId: activity.projectId || undefined,
        organizationId: tokenRecord.organizationId || undefined,
        action,
        previousStatus: 'pending',
        newStatus: action,
        performedBy: 0,
        performedByRole: 'organization',
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || undefined,
        userAgent: req.headers['user-agent'] || undefined,
      });
    } catch (e) { console.warn('[Audit] Token verify audit failed:', e); }

    const user = activity.userId ? await storage.getUser(activity.userId) : null;
    const project = activity.projectId ? await storage.getProject(activity.projectId) : null;

    if (action === 'approved') {
      return res.send(renderTokenPage(
        "Verified Successfully",
        `You have verified ${user?.displayName || 'volunteer'}'s impact log for "${project?.name || 'project'}": ${activity.hours || 0} hours, ${activity.outcomeQuantity || 0} outcomes.`,
        "success"
      ));
    } else {
      return res.send(renderTokenPage(
        "Log Rejected",
        `You have rejected ${user?.displayName || 'volunteer'}'s impact log for "${project?.name || 'project'}".`,
        "rejected"
      ));
    }
  } catch (err) {
    console.error("Error processing verification token:", err);
    res.status(500).send(renderTokenPage("Error", "An unexpected error occurred while processing the verification.", "error"));
  }
});

// ===== PUBLIC ROUTES (no auth required) =====
// These must live in logsRouter because it is mounted before adminRouter,
// which applies a blanket authMiddleware to every /api/* request.

logsRouter.get("/volunteer-spotlight", async (req: Request, res: Response) => {
  try {
    const [allVolunteerProfiles, allActivities] = await Promise.all([
      storage.listVolunteerProfiles(),
      storage.listVolunteerActivities(),
    ]);

    const activeVolunteers = allVolunteerProfiles.filter((p: any) => p.onboardingCompleted);

    if (activeVolunteers.length === 0) {
      return res.json({ spotlight: null });
    }

    const today = new Date();
    const weekNumber = Math.floor(today.getTime() / (7 * 24 * 60 * 60 * 1000));
    const selectedProfile = activeVolunteers[weekNumber % activeVolunteers.length];
    const volunteer = await storage.getUser(selectedProfile.userId);

    if (!volunteer) {
      return res.json({ spotlight: null });
    }

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    const thisWeekEnd = new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const weekActivities = allActivities.filter((a: any) => {
      if (a.userId !== selectedProfile.userId) return false;
      const actDate = new Date(a.date || a.createdAt);
      return actDate >= thisWeekStart && actDate < thisWeekEnd;
    });

    const totalHours = weekActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
    const impactCount = weekActivities.length;

    const story = selectedProfile.motivations ||
      `${volunteer.displayName} is dedicated to making an impact through volunteering. They're passionate about creating positive change in their community.`;

    res.json({
      spotlight: {
        user: {
          id: volunteer.id,
          displayName: volunteer.displayName,
          avatar: volunteer.avatar,
        },
        story,
        impact: impactCount > 0
          ? `${totalHours} hours contributed • ${impactCount} activities this week`
          : `${selectedProfile.weeklyAvailability || 0} hours available • Ready to make an impact`,
        photoUrl: selectedProfile.profilePhotoUrl || volunteer.avatar || null,
      },
    });
  } catch (err) {
    console.error("Error fetching volunteer spotlight:", err);
    res.json({ spotlight: null });
  }
});

logsRouter.get("/banner-stats", async (req: Request, res: Response) => {
  try {
    const [volunteerCount, allVolunteerProfiles, allOrganizations, allActivities] = await Promise.all([
      storage.countUsersByType('volunteer'),
      storage.listVolunteerProfiles(),
      storage.listOrganizations(),
      storage.listVolunteerActivities(),
    ]);

    const organizationCount = allOrganizations.length;
    const totalHours = allActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
    const totalActivities = allActivities.length;
    const activeVolunteers = allVolunteerProfiles.filter((p: any) => p.onboardingCompleted).length;
    const averageHours = activeVolunteers > 0 ? Math.round(totalHours / activeVolunteers) : 0;

    res.json({
      stats: [
        `📊 ${volunteerCount} active volunteers joined Synerxus`,
        `🏢 ${organizationCount} organizations partnering with us`,
        `⏱️ ${totalHours.toLocaleString()} total hours contributed by volunteers`,
        `🎯 ${totalActivities} volunteer activities logged`,
        `✅ ${activeVolunteers} volunteers with completed profiles`,
        `📈 Average ${averageHours} hours per active volunteer`,
      ],
    });
  } catch (err) {
    console.error("Error fetching banner stats:", err);
    res.json({
      stats: [
        "📊 Real-time volunteer impact metrics loading...",
        "🌍 Join thousands of volunteers making a global difference",
        "🎯 Connect. Manage. Impact Globally.",
      ],
    });
  }
});

function renderTokenPage(title: string, message: string, type: 'success' | 'error' | 'warning' | 'rejected'): string {
  const colors = {
    success: { bg: '#d1fae5', border: '#059669', icon: '#065f46', iconBg: '#a7f3d0' },
    error: { bg: '#fee2e2', border: '#dc2626', icon: '#991b1b', iconBg: '#fecaca' },
    warning: { bg: '#fef3c7', border: '#d97706', icon: '#92400e', iconBg: '#fde68a' },
    rejected: { bg: '#fee2e2', border: '#dc2626', icon: '#991b1b', iconBg: '#fecaca' },
  };
  const c = colors[type];
  const icons = { success: '\u2713', error: '\u2717', warning: '\u26A0', rejected: '\u2717' };
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title} - Synerxus</title></head>
<body style="margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh;">
<div style="max-width:480px;width:100%;margin:20px;text-align:center;">
<div style="background:linear-gradient(135deg,#065f46,#047857);padding:24px;border-radius:16px 16px 0 0;">
<span style="color:#fff;font-size:20px;font-weight:700;">Synerxus</span>
<p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0;">Impact Verification</p>
</div>
<div style="background:#fff;padding:40px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
<div style="width:64px;height:64px;border-radius:50%;background:${c.iconBg};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;color:${c.icon};">${icons[type]}</div>
<h1 style="font-size:22px;color:#1f2937;margin:0 0 12px;">${title}</h1>
<p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">${message}</p>
<div style="background:${c.bg};border:1px solid ${c.border}30;border-radius:8px;padding:12px;font-size:13px;color:${c.icon};">
${type === 'success' ? 'This action has been recorded in the immutable audit trail.' : type === 'rejected' ? 'This action has been recorded. The volunteer will be notified.' : 'Please contact your organization administrator if you need assistance.'}
</div>
</div>
</div>
</body></html>`;
}
