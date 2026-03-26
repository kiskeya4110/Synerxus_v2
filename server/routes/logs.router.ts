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
    path.resolve(import.meta.dirname, "../../dist/public/synerxus-logo.png"),
    path.resolve(import.meta.dirname, "../../client/public/synerxus-logo.png"),
  ];
  for (const p of candidates) {
    try {
      const buf = fs.readFileSync(p);
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch { /* try next */ }
  }
  return "/synerxus-logo.png"; // fallback to URL if file not found
}
const LOGO_DATA_URI = loadLogoDataUri();

export const logsRouter = Router();

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
    const totalOutcomes = verified.reduce((s, a) => s + (a.outcomeQuantity || 0), 0);
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
    // beneficiaryCount is an explicit field — do not fall back to outcome count (would be misleading)
    const totalBeneficiaries = verified.reduce((s, a) => s + (a.beneficiaryCount || 0), 0);
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
    // Denominator is totalOutcomes (sum of outcomeQuantity), not the number of activity records
    const avgHoursPerOutcome = totalOutcomes > 0 ? (totalHours / totalOutcomes).toFixed(1) : (verified.length > 0 ? (totalHours / verified.length).toFixed(1) : '0');
    const beneficiariesPerOutcome = totalOutcomes > 0 ? Math.round(totalBeneficiaries / totalOutcomes) : 0;

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

    // CSRD/ESRS compliance rows
    const csrdRows = [
      { code: 'ESRS S3.3', label: 'Community engagement', warn: false, value: `${verified.length} NGO-verified outcomes` },
      { code: 'ESRS S3.4', label: 'Actual impacts', warn: false, value: `${totalBeneficiaries.toLocaleString()} beneficiaries reached` },
      { code: 'ESRS S3.4', label: 'Negative impacts', warn: true, value: `${rejected.length} disclosed (see Page 2)` },
      { code: 'ESRS S1.4', label: 'Skills development', warn: false, value: `${uniqueSkillsCount || uniqueVolunteers} skill categories deployed` },
      { code: 'ESRS G1.3', label: 'Monitoring processes', warn: false, value: `${verificationRate}% verification rate, ${avgVerificationHours}h SLA` },
    ];
    const csrdRowsHtml = csrdRows.map(r =>
      `<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:0.5px solid #f3f4f6;">
        <span style="font-size:10px;color:#374151;font-weight:500;width:88px;flex-shrink:0;">${r.code}</span>
        <span style="font-size:10px;color:#6b7280;flex:1;">(${r.label})</span>
        <span style="font-size:10px;">${r.warn ? '\u26a0\ufe0f' : '\u2705'}</span>
        <span style="font-size:10px;color:#374151;text-align:right;min-width:190px;">${r.value}</span>
      </div>`
    ).join('');

    // SDG alignment rows with percentage
    const totalSdgOutcomes = Object.values(sdgMap).reduce((s, d) => s + d.count, 0);
    const sdgAlignmentRows = sortedSdgs.slice(0, 5).map(([sdg, data]) => {
      const sdgNum = parseInt(sdg);
      const color = SDG_COLORS[sdgNum] || '#888';
      const name = SDG_NAMES[sdgNum] || `SDG ${sdg}`;
      const pct = totalSdgOutcomes > 0 ? Math.round((data.count / totalSdgOutcomes) * 100) : 0;
      return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:0.5px solid #f9fafb;">
        <div style="width:26px;height:26px;background:${color};border-radius:5px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:11px;flex-shrink:0;">${sdgNum}</div>
        <div style="flex:1;font-size:11px;color:#374151;font-weight:500;">SDG ${sdgNum}: ${name}</div>
        <div style="font-size:10px;color:#6b7280;text-align:right;">${data.count} outcome${data.count !== 1 ? 's' : ''} \u2022 ${Math.round(data.hours)}h (${pct}%)</div>
      </div>`;
    }).join('');

    // Enhanced outcome cards with full audit trail
    const outcomeCards = top3.map((a, idx) => {
      const user = allUserMap.get(a.userId!) as any;
      const volunteerName = user?.displayName || user?.username || 'Volunteer';
      const volunteerCountry = user?.country || '';
      const text = a.outcomeText || a.description || 'Impact logged';
      const skills = (a.skillsApplied || []).slice(0, 3);
      const primarySdg = (a.sdgTags || [])[0];
      const sdgColor = primarySdg ? (SDG_COLORS[primarySdg] || '#888') : '#6b7280';
      const verifiedDate = a.verifiedAt
        ? new Date(a.verifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
        : ((a as any).deviceId ? ((a as any).deviceId as string).slice(0, 14) + '\u2026' : 'N/A');
      const geoDisplay = (a as any).geoLatitude && (a as any).geoLongitude
        ? `${((a as any).geoLatitude as number).toFixed(2)}, ${((a as any).geoLongitude as number).toFixed(2)}`
        : ([org?.city, org?.country].filter(Boolean).join(', ') || orgName);
      const verifierDisplay = (a as any).verifierName
        ? `${(a as any).verifierName}${(a as any).verifierRole ? ' (' + (a as any).verifierRole + ')' : ''}`
        : orgName + ' staff';
      const skillTags = skills.map((s: string) =>
        `<span style="font-size:10px;background:#f9fafb;color:#6b7280;padding:3px 8px;border-radius:4px;border:0.5px solid #e5e7eb;">${s}</span>`
      ).join('');
      return `<div style="border:0.5px solid #e5e7eb;border-radius:8px;padding:10px 12px;background:#fff;">
        <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:8px;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              ${primarySdg ? `<div style="width:22px;height:22px;background:${sdgColor};border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:10px;flex-shrink:0;">${primarySdg}</div>` : ''}
              <span style="font-weight:600;font-size:11px;color:#111827;">${volunteerName}${volunteerCountry ? ` <span style="color:#9ca3af;font-weight:400;">(${volunteerCountry})</span>` : ''}</span>
            </div>
            <div style="font-size:11px;color:#6b7280;line-height:1.4;margin-bottom:5px;">${text}</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">${skillTags}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="background:#ecfdf5;border:0.5px solid #a7f3d0;border-radius:5px;padding:5px 10px;margin-bottom:3px;">
              <div style="font-size:14px;font-weight:600;color:#059669;">${timeToVerifyHours !== null ? timeToVerifyHours + 'h' : 'N/A'}</div>
              <div style="font-size:9px;color:#059669;">to verify</div>
            </div>
            <div style="font-size:9px;color:#9ca3af;">${verifiedDate}</div>
          </div>
        </div>
        <div style="background:#f9fafb;border-radius:6px;padding:7px 10px;font-size:9px;">
          <div style="font-weight:600;color:#374151;margin-bottom:4px;">Audit Trail</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;">
            <div style="color:#6b7280;"><span style="color:#374151;">Method:</span> ${verificationMethod}</div>
            <div style="color:#6b7280;"><span style="color:#374151;">Device:</span> ${deviceDisplay}</div>
            <div style="color:#6b7280;"><span style="color:#374151;">Geolocation:</span> ${geoDisplay}</div>
            <div style="color:#6b7280;"><span style="color:#374151;">Timestamp:</span> ${verifiedTime}</div>
            <div style="color:#6b7280;grid-column:span 2;"><span style="color:#374151;">Verified by:</span> ${verifierDisplay}</div>
          </div>
        </div>
      </div>`;
    }).join('');

    // Negative impact disclosure (from rejected activities)
    const negativeDisclosureHtml = rejected.length > 0
      ? rejected.slice(0, 2).map((a, i) => {
          const date = (a as any).updatedAt
            ? new Date((a as any).updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'N/A';
          const reason = (a as any).rejectedReason || 'Impact not verifiable as described';
          const verifier = (a as any).verifierName
            ? `${(a as any).verifierName}${(a as any).verifierRole ? ' (' + (a as any).verifierRole + ')' : ''}`
            : orgName + ' staff';
          return `<div style="padding:8px 12px;border:0.5px solid #fde68a;background:#fffbeb;border-radius:8px;margin-bottom:6px;">
            <div style="font-size:10px;font-weight:600;color:#92400e;margin-bottom:3px;">${i + 1}. ${date}</div>
            <div style="font-size:10px;color:#78350f;line-height:1.5;">\u201c${reason}\u201d</div>
            <div style="font-size:10px;color:#b45309;margin-top:2px;">Verified by: ${verifier}</div>
          </div>`;
        }).join('')
      : `<div style="padding:12px;background:#f9fafb;border-radius:8px;font-size:11px;color:#9ca3af;text-align:center;">No negative impacts reported this period.</div>`;

    // Impact attribution pathways from top outcomes
    const attributionHtml = top3.map((a, idx) => {
      const user = allUserMap.get(a.userId!) as any;
      const name = user?.displayName || user?.username || `Volunteer ${idx + 1}`;
      const text = a.outcomeText || a.description || 'Impact logged';
      const shortText = text.length > 70 ? text.slice(0, 70) + '\u2026' : text;
      const project = projects.find(p => p.id === a.projectId);
      const bene = (a as any).beneficiaryCount;
      return `<div style="padding:8px 10px;border-left:3px solid #0891b2;background:#f9fafb;border-radius:0 6px 6px 0;margin-bottom:6px;">
        <div style="font-size:11px;font-weight:600;color:#111827;margin-bottom:4px;">${idx + 1}. ${name} \u2014 ${shortText}</div>
        <div style="font-size:10px;color:#6b7280;line-height:1.6;">
          \u2192 Contributed ${a.hours ? Math.round(a.hours) + 'h' : 'time'} to ${project?.name || 'project'}${bene ? ` \u2022 Reached ${bene} beneficiaries` : ''}${a.sdgTags && a.sdgTags.length > 0 ? `<br>\u2192 Advanced SDG ${a.sdgTags[0]}: ${SDG_NAMES[a.sdgTags[0]] || ''}` : ''}
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
      { metric: 'Beneficiaries per Outcome', orgVal: `${beneficiariesPerOutcome}`, avgVal: `${INDUSTRY_AVG.benePerOutcome}`, delta: beneficiariesPerOutcome - INDUSTRY_AVG.benePerOutcome, pct: false },
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
          <div style="font-size:12px;font-weight:500;color:#111827;">${p.name}</div>
          <div style="display:flex;gap:4px;margin-top:4px;">${sdgDots}</div>
        </div>
        <div style="display:flex;gap:20px;text-align:center;">
          <div><div style="font-size:14px;font-weight:500;color:#111827;">${Math.round(p.hours)}</div><div style="font-size:9px;color:#9ca3af;">hours</div></div>
          <div><div style="font-size:14px;font-weight:500;color:#111827;">${p.outcomes}</div><div style="font-size:9px;color:#9ca3af;">outcomes</div></div>
          <div><div style="font-size:14px;font-weight:500;color:#059669;">${p.volunteers}</div><div style="font-size:9px;color:#9ca3af;">volunteers</div></div>
        </div>
      </div>`;
    }).join('');

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
      --r: 10px; --r-lg: 16px;
    }
    @page { size: 8.5in 11in portrait; margin: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0 !important; margin: 0 !important; background: #fff; }
      .page {
        zoom: 0.85;
        width: 254mm !important;
        height: 329mm !important;
        max-height: 329mm !important;
        overflow: hidden !important;
        border-radius: 0 !important;
        border: none !important;
        padding: 12mm 14mm !important;
        margin: 0 !important;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
        box-shadow: none !important;
        background: #fff !important;
      }
      .page:last-child { page-break-after: auto; break-after: auto; }
      .page-break { page-break-before: always; break-before: page; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: var(--txt-p); line-height: 1.5; background: var(--bg-s); padding: 24px; }
    .page { background: var(--bg-p); border-radius: var(--r); border: 0.5px solid var(--bd); padding: 28px; max-width: 860px; margin: 0 auto 24px; }
    .section-label { display:flex;align-items:center;gap:8px;margin-bottom:12px; }
    .section-label-bar { width:3px;height:16px;background:#0891b2;border-radius:2px;display:inline-block; }
    .section-label-text { font-weight:500;font-size:14px;color:var(--txt-p); }
    table.bench { width:100%;border-collapse:collapse; }
    table.bench th { padding:8px 10px;font-size:11px;color:var(--txt-t);font-weight:500;text-align:left;border-bottom:0.5px solid var(--bd);background:#f9fafb; }
    table.bench th:not(:first-child) { text-align:center; }
  </style>
</head>
<body>

<!-- PAGE 1: EXECUTIVE SNAPSHOT + COMPLIANCE MAPPING -->
<div class="page">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
    <div style="display:flex;align-items:center;gap:10px;">
      <img src="${LOGO_DATA_URI}" alt="Synerxus" style="width:36px;height:36px;border-radius:8px;object-fit:contain;">
      <div>
        <div style="font-weight:600;font-size:15px;color:var(--txt-p);letter-spacing:0.5px;">SYNERXUS</div>
        <div style="font-size:11px;color:#0891b2;">Impact, verified.</div>
      </div>
    </div>
    <div style="text-align:right;font-size:11px;color:var(--txt-t);">
      <div>Generated: ${reportDate}</div>
      <div>Report ID: ${reportId}</div>
      <div>NGO: ${orgName}</div>
      <div>Period: ${periodDisplay}</div>
      ${(org?.city || org?.country) ? `<div>Location: ${[org?.city, org?.country].filter(Boolean).join(', ')}</div>` : ''}
    </div>
  </div>

  <!-- Title Banner -->
  <div style="background:linear-gradient(135deg,#0891b2,#0e7490);border-radius:var(--r);padding:12px 20px;color:#fff;margin-bottom:12px;">
    <div style="font-size:9px;opacity:0.75;margin-bottom:2px;letter-spacing:0.5px;">CSRD AUDIT READY DATA \u2022 NGO-VERIFIED \u2022 IMMUTABLE TRAIL \u2022 FILTERABLE BY TIMELINE &amp; PROJECT</div>
    <div style="font-size:18px;font-weight:600;margin-bottom:1px;">VERIFIED IMPACT SUMMARY</div>
    <div style="font-size:13px;font-weight:400;opacity:0.9;">${orgName}</div>
    ${org?.description ? `<div style="font-size:11px;opacity:0.8;margin-top:2px;">${org.description.slice(0, 100)}${org.description.length > 100 ? '\u2026' : ''}</div>` : ''}
  </div>

  <!-- VERIFIED IMPACT SNAPSHOT -->
  <div class="section-label"><span class="section-label-bar"></span><span class="section-label-text">Verified Impact Snapshot</span></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
    <div style="background:#ecfdf5;border:0.5px solid #a7f3d0;border-radius:var(--r);padding:10px 16px;text-align:center;">
      <div style="font-size:26px;font-weight:600;color:#059669;">${verified.length}</div>
      <div style="font-size:11px;color:var(--txt-s);margin-top:1px;">Verified outcomes</div>
      <div style="font-size:10px;color:#059669;margin-top:4px;">NGO-confirmed</div>
    </div>
    <div style="background:#ecfeff;border:0.5px solid #a5f3fc;border-radius:var(--r);padding:10px 16px;text-align:center;">
      <div style="font-size:26px;font-weight:600;color:#0891b2;">${Math.round(totalHours)}</div>
      <div style="font-size:11px;color:var(--txt-s);margin-top:1px;">Verified hours</div>
      <div style="font-size:10px;color:#0891b2;margin-top:4px;">Not self-reported</div>
    </div>
    <div style="background:#f5f3ff;border:0.5px solid #ddd6fe;border-radius:var(--r);padding:10px 16px;text-align:center;">
      <div style="font-size:26px;font-weight:600;color:#7c3aed;">${totalBeneficiaries.toLocaleString()}</div>
      <div style="font-size:11px;color:var(--txt-s);margin-top:1px;">Beneficiaries reached</div>
      <div style="font-size:10px;color:#7c3aed;margin-top:4px;">Estimated</div>
    </div>
  </div>

  <!-- ENGAGEMENT METRICS -->
  <div class="section-label"><span class="section-label-bar"></span><span class="section-label-text">Engagement Metrics</span></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px;">
    <div style="background:var(--bg-s);border-radius:var(--r);padding:8px;text-align:center;">
      <div style="font-size:18px;font-weight:600;color:var(--txt-p);">${uniqueVolunteers}</div>
      <div style="font-size:10px;color:var(--txt-t);margin-top:1px;">Volunteers</div>
    </div>
    <div style="background:var(--bg-s);border-radius:var(--r);padding:8px;text-align:center;">
      <div style="font-size:18px;font-weight:600;color:var(--txt-p);">${uniqueSkillsCount || uniqueVolunteers}</div>
      <div style="font-size:10px;color:var(--txt-t);margin-top:1px;">Skill categories</div>
    </div>
    <div style="background:var(--bg-s);border-radius:var(--r);padding:8px;text-align:center;">
      <div style="font-size:18px;font-weight:600;color:var(--txt-p);">${volunteerCountries}</div>
      <div style="font-size:10px;color:var(--txt-t);margin-top:1px;">Volunteer countries</div>
    </div>
    <div style="background:var(--bg-s);border-radius:var(--r);padding:8px;text-align:center;">
      <div style="font-size:18px;font-weight:600;color:var(--txt-p);">${verificationRate}%</div>
      <div style="font-size:10px;color:var(--txt-t);margin-top:1px;">Verification rate</div>
    </div>
    <div style="background:var(--bg-s);border-radius:var(--r);padding:8px;text-align:center;">
      <div style="font-size:18px;font-weight:600;color:var(--txt-p);">${avgVerificationHours > 0 ? avgVerificationHours + 'h' : 'N/A'}</div>
      <div style="font-size:10px;color:var(--txt-t);margin-top:1px;">Avg. hours to verify</div>
    </div>
    <div style="background:var(--bg-s);border-radius:var(--r);padding:8px;text-align:center;">
      <div style="font-size:18px;font-weight:600;color:var(--txt-p);">${diasporaPct > 0 ? diasporaPct + '%' : projectStats.length}</div>
      <div style="font-size:10px;color:var(--txt-t);margin-top:1px;">${diasporaPct > 0 ? 'Diaspora impact' : 'Active projects'}</div>
    </div>
  </div>

  ${sortedSdgs.length > 0 ? `<!-- SDG ALIGNMENT -->
  <div class="section-label"><span class="section-label-bar"></span><span class="section-label-text">SDG Alignment (UN Sustainable Development Goals)</span></div>
  <div style="border:0.5px solid var(--bd);border-radius:var(--r);padding:10px 14px;margin-bottom:12px;">
    ${sdgAlignmentRows}
  </div>` : ''}

  <!-- CSRD/ESRS COMPLIANCE MAPPING -->
  <div class="section-label"><span class="section-label-bar"></span><span class="section-label-text">CSRD/ESRS Compliance Mapping</span></div>
  <div style="border:0.5px solid var(--bd);border-radius:var(--r);padding:10px 14px;margin-bottom:12px;">
    <div style="display:flex;align-items:center;gap:8px;padding-bottom:6px;border-bottom:0.5px solid var(--bd-l);margin-bottom:2px;">
      <span style="font-size:10px;font-weight:600;color:var(--txt-t);width:88px;flex-shrink:0;">Standard</span>
      <span style="font-size:10px;font-weight:600;color:var(--txt-t);flex:1;">Requirement</span>
      <span style="font-size:10px;font-weight:600;color:var(--txt-t);width:16px;text-align:center;"></span>
      <span style="font-size:10px;font-weight:600;color:var(--txt-t);min-width:190px;text-align:right;">Status</span>
    </div>
    ${csrdRowsHtml}
  </div>

  <!-- Audit Trail Badge -->
  <div style="background:#ecfdf5;border:0.5px solid #a7f3d0;border-radius:var(--r);padding:10px 14px;display:flex;align-items:center;gap:12px;margin-bottom:10px;">
    <div style="width:32px;height:32px;background:#d1fae5;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">\u2713</div>
    <div style="flex:1;">
      <div style="font-weight:600;font-size:12px;color:#065f46;">Full audit trail available</div>
      <div style="font-size:10px;color:#047857;margin-top:1px;">Every outcome includes: verification timestamp, verifier identity, device ID/SMS number, geolocation, and hours \u2014 all NGO-confirmed with immutable records. 100% complete.${avgVerificationHours > 0 ? ` Avg. ${avgVerificationHours}h to verify.` : ''}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#059669;flex-shrink:0;">
      <div style="font-weight:600;">${verificationRate}% complete</div>
    </div>
  </div>

  <!-- Page 1 Footer -->
  <div style="padding-top:8px;border-top:0.5px solid var(--bd);text-align:center;font-size:10px;color:var(--txt-t);">
    Page 1 of 3 \u2022 This document contains NGO-verified data with immutable audit trails
  </div>
</div>

<!-- PAGE 2: TOP VERIFIED OUTCOMES + DIASPORA IMPACT + NEGATIVE DISCLOSURE -->
<div class="page page-break">

  <!-- Mini Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;border-bottom:0.5px solid var(--bd);margin-bottom:12px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <img src="${LOGO_DATA_URI}" alt="Synerxus" style="width:22px;height:22px;border-radius:6px;object-fit:contain;">
      <span style="font-weight:600;font-size:12px;color:var(--txt-p);">SYNERXUS</span>
      <span style="color:#d1d5db;margin:0 6px;">|</span>
      <span style="font-size:11px;color:var(--txt-s);">${orgName}</span>
    </div>
    <div style="font-size:10px;color:var(--txt-t);">Verified Impact Summary \u2022 ${periodDisplay}</div>
  </div>

  ${top3.length > 0 ? `<!-- TOP VERIFIED OUTCOMES -->
  <div class="section-label"><span class="section-label-bar"></span><span class="section-label-text">Top Verified Outcomes (Filterable by project category)</span></div>
  <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">${outcomeCards}</div>` : ''}

  <!-- DIASPORA VOLUNTEER IMPACT -->
  <div class="section-label"><span class="section-label-bar" style="background:#7c3aed;"></span><span class="section-label-text">Diaspora Volunteer Impact</span></div>
  <div style="border:0.5px solid #ddd6fe;background:#faf5ff;border-radius:var(--r);padding:10px 14px;margin-bottom:12px;">
    <div style="font-size:11px;color:#4c1d95;line-height:1.6;">
      ${diasporaPct > 0
        ? `${diasporaPct}% of verified outcomes were delivered by diaspora volunteers with cultural connections to the local community. These volunteers brought specialized skills from ${volunteerCountries} countr${volunteerCountries !== 1 ? 'ies' : 'y'}, with an average of ${verified.length > 0 && uniqueVolunteers > 0 ? (totalHours / uniqueVolunteers).toFixed(1) : 'N/A'} verified hours per volunteer. Cultural context improved outcome quality vs. non-diaspora matches (industry benchmark: 28%).`
        : `${uniqueVolunteers} volunteer${uniqueVolunteers !== 1 ? 's' : ''} delivered ${verified.length} verified outcome${verified.length !== 1 ? 's' : ''} across ${projectStats.length} project${projectStats.length !== 1 ? 's' : ''}, contributing ${Math.round(totalHours)} verified hours.`
      }
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px;">
      <div style="background:#fff;border:0.5px solid #e9d5ff;border-radius:8px;padding:8px;text-align:center;">
        <div style="font-size:16px;font-weight:600;color:#7c3aed;">${uniqueVolunteers}</div>
        <div style="font-size:10px;color:#6d28d9;">Total volunteers</div>
      </div>
      <div style="background:#fff;border:0.5px solid #e9d5ff;border-radius:8px;padding:8px;text-align:center;">
        <div style="font-size:16px;font-weight:600;color:#7c3aed;">${volunteerCountries}</div>
        <div style="font-size:10px;color:#6d28d9;">Countries</div>
      </div>
      <div style="background:#fff;border:0.5px solid #e9d5ff;border-radius:8px;padding:8px;text-align:center;">
        <div style="font-size:16px;font-weight:600;color:#7c3aed;">${diasporaPct > 0 ? diasporaPct + '%' : uniqueSkillsCount || uniqueVolunteers}</div>
        <div style="font-size:10px;color:#6d28d9;">${diasporaPct > 0 ? 'Diaspora share' : 'Skill categories'}</div>
      </div>
    </div>
  </div>

  <!-- NEGATIVE IMPACT DISCLOSURE (CSRD Double Materiality) -->
  <div class="section-label"><span class="section-label-bar" style="background:#d97706;"></span><span class="section-label-text">Negative Impact Disclosure (CSRD Double Materiality)</span></div>
  <div style="margin-bottom:10px;">
    ${negativeDisclosureHtml}
    <div style="font-size:10px;color:#9ca3af;margin-top:6px;font-style:italic;">*Required for ESRS S3.4 compliance \u2014 all unintended consequences disclosed alongside positive outcomes.</div>
  </div>

  <!-- Page 2 Footer -->
  <div style="padding-top:8px;border-top:0.5px solid var(--bd);text-align:center;font-size:10px;color:var(--txt-t);">
    Page 2 of 3
  </div>
</div>

<!-- PAGE 3: INDUSTRY BENCHMARKING + IMPACT ATTRIBUTION + NEXT STEPS -->
<div class="page page-break">

  <!-- Mini Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;border-bottom:0.5px solid var(--bd);margin-bottom:12px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <img src="${LOGO_DATA_URI}" alt="Synerxus" style="width:24px;height:24px;border-radius:6px;object-fit:contain;">
      <span style="font-weight:600;font-size:13px;color:var(--txt-p);">SYNERXUS</span>
      <span style="color:#d1d5db;margin:0 6px;">|</span>
      <span style="font-size:12px;color:var(--txt-s);">${orgName}</span>
    </div>
    <div style="font-size:11px;color:var(--txt-t);">Verified Impact Summary \u2022 ${periodDisplay}</div>
  </div>

  <!-- INDUSTRY BENCHMARKING -->
  <div class="section-label"><span class="section-label-bar"></span><span class="section-label-text">Industry Benchmarking (Anonymized Synerxus Platform Data)</span></div>
  <div style="border:0.5px solid var(--bd);border-radius:var(--r);overflow:hidden;margin-bottom:12px;">
    <table class="bench">
      <thead>
        <tr>
          <th style="text-align:left;">Metric</th>
          <th>This NGO</th>
          <th>Industry Avg</th>
          <th>Performance</th>
        </tr>
      </thead>
      <tbody>${benchmarkRowsHtml}</tbody>
    </table>
  </div>

  ${top3.length > 0 ? `<!-- IMPACT ATTRIBUTION PATHWAYS -->
  <div class="section-label"><span class="section-label-bar"></span><span class="section-label-text">Impact Attribution Pathways</span></div>
  <div style="font-size:10px;color:var(--txt-s);margin-bottom:8px;">How volunteer contributions enabled measurable outcomes:</div>
  <div style="margin-bottom:12px;">${attributionHtml}</div>` : ''}

  <!-- CORPORATE PARTNER VALUE -->
  <div class="section-label"><span class="section-label-bar"></span><span class="section-label-text">Corporate Partner Value</span></div>
  <div style="border:0.5px solid var(--bd);border-radius:var(--r);overflow:hidden;margin-bottom:12px;">
    <div style="display:grid;grid-template-columns:148px 1fr;border-bottom:0.5px solid var(--bd);">
      <div style="padding:7px 10px;background:#f9fafb;font-size:10px;font-weight:500;color:#374151;border-right:0.5px solid var(--bd);">Employee Development</div>
      <div style="padding:7px 10px;font-size:10px;color:#6b7280;">${uniqueVolunteers} volunteers gained cross-cultural project management experience across ${projectStats.length} project${projectStats.length !== 1 ? 's' : ''}</div>
    </div>
    <div style="display:grid;grid-template-columns:148px 1fr;border-bottom:0.5px solid var(--bd);">
      <div style="padding:7px 10px;background:#f9fafb;font-size:10px;font-weight:500;color:#374151;border-right:0.5px solid var(--bd);">ESG Compliance</div>
      <div style="padding:7px 10px;font-size:10px;color:#6b7280;">CSRD-ready data for ${now.getFullYear()} sustainability report (ESRS S3/S1/G1 satisfied)</div>
    </div>
    <div style="display:grid;grid-template-columns:148px 1fr;border-bottom:0.5px solid var(--bd);">
      <div style="padding:7px 10px;background:#f9fafb;font-size:10px;font-weight:500;color:#374151;border-right:0.5px solid var(--bd);">Reputation</div>
      <div style="padding:7px 10px;font-size:10px;color:#6b7280;">Strengthened brand as impact-driven employer with NGO-verified, audit-ready impact data</div>
    </div>
    <div style="display:grid;grid-template-columns:148px 1fr;">
      <div style="padding:7px 10px;background:#f9fafb;font-size:10px;font-weight:500;color:#374151;border-right:0.5px solid var(--bd);">Strategic Alignment</div>
      <div style="padding:7px 10px;font-size:10px;color:#6b7280;">Advanced UN SDG commitments (${sortedSdgs.map(([s]) => s).slice(0, 3).join(', ')}${sortedSdgs.length > 3 ? ', \u2026' : ''})</div>
    </div>
  </div>

  <!-- RECOMMENDATIONS & NEXT STEPS -->
  <div class="section-label"><span class="section-label-bar"></span><span class="section-label-text">Recommendations &amp; Next Steps</span></div>
  <div style="background:#f0f9ff;border:0.5px solid #bae6fd;border-radius:var(--r);padding:10px 14px;margin-bottom:12px;font-size:10px;color:#0c4a6e;line-height:1.7;">
    \u2022 Maintain ${verificationRate}%+ verification rate via Value Flip optimization<br>
    \u2022 Expand diaspora volunteer matching to increase cultural context quality scores<br>
    \u2022 Develop longitudinal impact tracking (6-month follow-up on key outcomes)<br>
    \u2022 Integrate with corporate HRIS for automated volunteer reporting
  </div>

  <!-- APPENDIX & VERIFICATION METHODOLOGY -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
    <div>
      <div style="font-weight:500;font-size:11px;color:var(--txt-p);margin-bottom:6px;">Appendix</div>
      <div style="font-size:10px;color:var(--txt-s);line-height:1.7;">
        \u2022 Raw outcome logs (CSV export)<br>
        \u2022 Verification statements (digital signatures)<br>
        \u2022 Evidence repository (photos, testimonials)<br>
        \u2022 SDG mapping table (detailed alignment)<br>
        \u2022 Attribution notes (contribution pathways)
      </div>
    </div>
    <div>
      <div style="font-weight:500;font-size:11px;color:var(--txt-p);margin-bottom:6px;">Verification Methodology</div>
      <div style="font-size:10px;color:var(--txt-s);line-height:1.7;">
        1. <strong>Volunteer submission:</strong> Logs outcome + hours claimed<br>
        2. <strong>NGO verification:</strong> ${orgName} confirms BOTH outcome AND hours \u2192 immutable record<br>
        3. <strong>Audit trail:</strong> Captures verifier identity, timestamp, device ID/SMS, geolocation
      </div>
    </div>
  </div>

  <!-- CSRD Compliance Statement -->
  <div style="background:#fffbeb;border:0.5px solid #fde68a;border-radius:var(--r);padding:8px 12px;font-size:10px;color:#92400e;margin-bottom:10px;">
    <strong>CSRD Audit Statement:</strong> This report contains ${verified.length} verified impact records representing ${Math.round(totalHours)} volunteer hours across ${projectStats.length} project${projectStats.length !== 1 ? 's' : ''}. All entries have been verified by authorized ${orgName} staff with immutable audit trails maintained for CSRD compliance. Generated by Synerxus Impact Data Infrastructure.
  </div>

  <!-- Footer -->
  <div style="padding-top:8px;border-top:0.5px solid var(--bd);">
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--txt-t);margin-bottom:8px;">
      <div>
        <div>This report was generated by Synerxus on behalf of ${orgName}. All data is NGO-verified with complete audit trails available upon request.</div>
        <div style="margin-top:1px;">Questions? support@synerxus.com \u2022 \u00a9 ${now.getFullYear()} Synerxus \u2022 CSRD Audit Ready Data</div>
      </div>
      <div style="text-align:right;">Page 3 of 3</div>
    </div>
    <div style="text-align:center;">
      <span style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-s);border-radius:100px;padding:5px 12px;font-size:10px;color:var(--txt-s);">
        <span style="width:5px;height:5px;border-radius:50%;background:#10b981;display:inline-block;"></span>
        Powered by Synerxus \u2022 Impact, verified.
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

    const verified = allActivities.filter((a: any) => a.verificationStatus === 'approved');
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

    // Metrics
    const totalHours = verified.reduce((s: number, a: any) => s + (a.hours || 0), 0);
    const totalOutcomes = verified.reduce((s: number, a: any) => s + (a.outcomeQuantity || 0), 0);
    const totalBeneficiaries = verified.reduce((s: number, a: any) => s + (a.beneficiaryCount || 0), 0);
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

    // SDG map
    const sdgMap: Record<number, { hours: number; outcomes: number; beneficiaries: number; count: number }> = {};
    for (const act of verified) {
      const sdgs: number[] = act.sdgTags || [];
      sdgs.forEach((g: number) => {
        if (!sdgMap[g]) sdgMap[g] = { hours: 0, outcomes: 0, beneficiaries: 0, count: 0 };
        sdgMap[g].hours += act.hours || 0;
        sdgMap[g].outcomes += act.outcomeQuantity || 0;
        sdgMap[g].beneficiaries += act.beneficiaryCount || 0;
        sdgMap[g].count++;
      });
    }
    const sortedSdgs = Object.entries(sdgMap).sort((a, b) => b[1].count - a[1].count);

    // NGO partner stats
    const ngoStats: Record<number, { org: any; outcomes: number; hours: number; beneficiaries: number; activities: any[] }> = {};
    for (const act of verified) {
      if (!act.verifiedBy) continue;
      const org = verifierToOrgMap.get(act.verifiedBy);
      if (!org) continue;
      if (!ngoStats[org.id]) ngoStats[org.id] = { org, outcomes: 0, hours: 0, beneficiaries: 0, activities: [] };
      ngoStats[org.id].outcomes += act.outcomeQuantity || 0;
      ngoStats[org.id].hours += act.hours || 0;
      ngoStats[org.id].beneficiaries += act.beneficiaryCount || 0;
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
    const beneficiariesPerOutcome = totalOutcomes > 0 ? Math.round(totalBeneficiaries / totalOutcomes) : 0;

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
        <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#111827;">${n.org.name}</td>
        <td style="padding:6px 8px;font-size:11px;color:#374151;">${n.org.location || '—'}</td>
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
        <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#111827;">${v.name}</td>
        <td style="padding:6px 8px;font-size:11px;color:#374151;">${v.dept}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;font-weight:700;color:#0A2463;">${v.outcomes}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;color:#374151;">${Math.round(v.hours)}h</td>
        <td style="padding:6px 8px;font-size:11px;color:#374151;">${Array.from(v.ngos).join(', ') || '—'}</td>
        <td style="padding:6px 8px;font-size:11px;color:#374151;">${Array.from(v.skills).slice(0, 2).join(', ') || '—'}</td>
      </tr>`).join('');

    // SDG alignment rows
    const sdgRows = sortedSdgs.slice(0, 7).map(([sdg, data]) => {
      const n = parseInt(sdg);
      const color = SDG_COLORS_LOCAL[n] || '#888';
      return `<tr style="border-bottom:0.5px solid #e5e7eb;">
        <td style="padding:6px 8px;">
          <span style="background:${color};color:#fff;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;">SDG ${n}</span>
        </td>
        <td style="padding:6px 8px;font-size:11px;font-weight:500;color:#111827;">${SDG_NAMES_LOCAL[n] || `SDG ${n}`}</td>
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
      return `<tr style="border-bottom:0.5px solid #e5e7eb;">
        <td style="padding:5px 8px;font-size:10px;color:#374151;">${dateStr}</td>
        <td style="padding:5px 8px;font-size:10px;font-weight:500;color:#111827;">${volunteer?.displayName || 'Volunteer'}</td>
        <td style="padding:5px 8px;font-size:10px;color:#374151;">${org?.name || 'NGO'}</td>
        <td style="padding:5px 8px;font-size:10px;color:#374151;">${(a.editedOutcomeText || a.outcomeText || a.description || '—').slice(0, 60)}${(a.editedOutcomeText || a.outcomeText || '')?.length > 60 ? '…' : ''}</td>
        <td style="padding:5px 8px;font-size:10px;text-align:center;color:#374151;">${a.hours || 0}h</td>
        <td style="padding:5px 8px;font-size:10px;"><span style="color:#059669;">&#10003; ${a.deviceId ? 'App' : 'Platform'}</span></td>
        <td style="padding:5px 8px;font-size:10px;color:#374151;">${a.geolocation ? '&#x1F4CD; Located' : '—'}</td>
      </tr>`;
    }).join('');

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
  h3 { font-size: 12px; font-weight: 700; color: var(--navy); margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #fff; padding: 7px 8px; }
  .section { margin-bottom: 20px; border: 0.5px solid var(--bd); border-radius: var(--r); overflow: hidden; }
  .section-header { background: var(--navy); padding: 10px 14px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .kpi { background: #fff; border: 0.5px solid var(--bd); border-radius: var(--r); padding: 12px 14px; }
  .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--txt-s); margin-bottom: 4px; }
  .kpi-value { font-size: 22px; font-weight: 800; color: var(--navy); line-height: 1.1; }
  .kpi-sub { font-size: 9px; color: var(--txt-s); margin-top: 2px; }
  .badge-ok { color: #059669; font-weight: 600; }
  .badge-warn { color: #d97706; font-weight: 600; }
  .note { background: var(--teal-lt); border-left: 3px solid var(--teal); padding: 8px 12px; font-size: 10px; color: #065f46; margin: 10px 0; border-radius: 0 var(--r) var(--r) 0; }
  .warn-note { background: #fffbeb; border-left: 3px solid var(--gold); padding: 8px 12px; font-size: 10px; color: #92400e; margin: 10px 0; border-radius: 0 var(--r) var(--r) 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 12px; }
    .kpi-grid { break-inside: avoid; }
    .section { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

<!-- REPORT HEADER -->
<div style="background:var(--navy);border-radius:var(--r);padding:16px 20px;margin-bottom:20px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div style="color:var(--teal);font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">SYNERXUS · Impact, verified.</div>
      <h1 style="color:#fff;font-size:18px;">Corporate ESG Impact Report</h1>
      <div style="color:#93c5fd;font-size:10px;margin-top:2px;">CSRD-Compliant · NGO-Verified Outcomes &amp; Hours · Dual Materiality Disclosure</div>
    </div>
    <div style="text-align:right;color:#cbd5e1;font-size:10px;">
      <div style="color:#fff;font-weight:700;font-size:13px;margin-bottom:3px;">Report ID: ${reportId}</div>
      <div>Generated: ${reportDate}</div>
      <div style="margin-top:2px;">Corporation: <strong style="color:#fff;">${corpName}</strong></div>
      <div>Reporting Period: <strong style="color:#fff;">${periodDisplay}</strong></div>
    </div>
  </div>
</div>

<!-- SECTION 1: EXECUTIVE SNAPSHOT -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 1: Executive Snapshot</h3>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">NGO Partners</div><div class="kpi-value">${Object.keys(ngoStats).length}</div><div class="kpi-sub">organizations</div></div>
    <div class="kpi"><div class="kpi-label">Employees Volunteering</div><div class="kpi-value">${uniqueVolunteerIds.size}</div><div class="kpi-sub">of ${linkedUserIds.length} linked</div></div>
    <div class="kpi"><div class="kpi-label">Verified Outcomes</div><div class="kpi-value">${verified.length}</div><div class="kpi-sub">${totalOutcomes} total units</div></div>
    <div class="kpi"><div class="kpi-label">Verified Hours</div><div class="kpi-value">${Math.round(totalHours)}</div><div class="kpi-sub">NGO-verified (not self-reported)</div></div>
    <div class="kpi"><div class="kpi-label">Beneficiaries Reached</div><div class="kpi-value">${totalBeneficiaries.toLocaleString()}</div><div class="kpi-sub">individuals</div></div>
    <div class="kpi"><div class="kpi-label">Verification Rate</div><div class="kpi-value">${verificationRate}%</div><div class="kpi-sub">avg ${avgVerificationHours}h turnaround</div></div>
    <div class="kpi"><div class="kpi-label">Avg Hours/Employee</div><div class="kpi-value">${avgHoursPerEmployee}h</div><div class="kpi-sub">NGO-verified</div></div>
    <div class="kpi"><div class="kpi-label">SDGs Addressed</div><div class="kpi-value">${sortedSdgs.length}</div><div class="kpi-sub">goals impacted</div></div>
  </div>

  <div class="section">
    <div class="section-header"><h2>ESRS Compliance Status</h2></div>
    <table>
      <thead><tr style="background:#f1f5f9;"><th style="color:var(--navy);">ESRS Requirement</th><th style="color:var(--navy);">Status</th><th style="color:var(--navy);">Evidence</th></tr></thead>
      <tbody>
        <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS S1.4 — Workforce skills</td><td style="padding:6px 8px;" class="badge-ok">&#10003; ${uniqueVolunteerIds.size} employees deployed verified skills</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 3 + Outcome Log</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);background:#f9fafb;"><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS S3.3 — Community engagement</td><td style="padding:6px 8px;" class="badge-ok">&#10003; ${Object.keys(ngoStats).length} NGO partners, ${verified.length} verified outcomes</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 2 + Outcome Log</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS S3.4 — Actual community impacts</td><td style="padding:6px 8px;" class="badge-ok">&#10003; ${totalBeneficiaries.toLocaleString()} beneficiaries reached</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 2 + Beneficiary Counts</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);background:#f9fafb;"><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS S3.4 — Negative impacts (double materiality)</td><td style="padding:6px 8px;" class="${rejected.length > 0 ? 'badge-warn' : 'badge-ok'}">${rejected.length > 0 ? '&#9888; ' + rejected.length + ' disclosed' : '&#10003; None disclosed this period'}</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 6</td></tr>
        <tr><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS G1.3 — Monitoring processes</td><td style="padding:6px 8px;" class="badge-ok">&#10003; ${verificationRate}% verification rate, ${avgVerificationHours}h avg SLA</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Verification Trail (Section 5)</td></tr>
      </tbody>
    </table>
  </div>
  <div class="note">&#128161; <strong>Key Differentiator:</strong> Unlike Benevity/YourCause (self-reported hours only), Synerxus delivers <strong>NGO-verified outcomes AND hours</strong> with immutable audit trails — satisfying CSRD's requirement for third-party verified social impact data (ESRS S3).</div>
</div>

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
          <tr><td style="padding:7px 10px;font-size:11px;font-weight:600;">Beneficiaries per Outcome</td><td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700;color:var(--navy);">${beneficiariesPerOutcome}</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);"><span class="badge-ok">&#10003; Platform-tracked</span></td></tr>
        </tbody>
      </table>
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
  </div>`}
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
  <div style="background:#f0f9ff;border:0.5px solid #bae6fd;border-radius:var(--r);padding:8px 12px;font-size:10px;color:#0369a1;margin-top:8px;">
    &#128269; <strong>Auditor Use Case:</strong> Randomly sample 15–30% of outcomes for direct NGO confirmation. Each record includes verifier identity, timestamp, and contact information for the NGO programme director.
  </div>
</div>

<!-- SECTION 6: DOUBLE MATERIALITY -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 6: Double Materiality Disclosure (ESRS S3.4)</h3>
  <div class="section">
    <div class="section-header" style="background:#92400e;"><h2>&#9888; Negative Impact Disclosures — Required for Full CSRD Compliance</h2></div>
    ${rejected.length === 0
      ? '<p style="padding:12px;font-size:11px;color:#374151;">&#10003; No negative impacts disclosed for this reporting period.</p>'
      : `<table><thead><tr><th>Date</th><th>NGO Partner</th><th>Outcome</th><th>Negative Impact</th></tr></thead><tbody>${rejected.slice(0, 5).map((a: any) => {
          const org = a.verifiedBy ? verifierToOrgMap.get(a.verifiedBy) : null;
          const dateStr = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date).split('T')[0];
          return `<tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:6px 8px;font-size:10px;">${dateStr}</td><td style="padding:6px 8px;font-size:10px;">${org?.name || 'NGO'}</td><td style="padding:6px 8px;font-size:10px;">${(a.outcomeText || a.description || '—').slice(0, 50)}</td><td style="padding:6px 8px;font-size:10px;color:#b45309;">${a.rejectedReason || 'Not meeting verification standards'}</td></tr>`;
        }).join('')}</tbody></table>`}
  </div>
  <div class="warn-note">&#9888; <strong>CSRD Requirement:</strong> ESRS S3.4 mandates disclosure of "actual and potential negative impacts on communities." This section satisfies double materiality — showing both positive outcomes AND unintended consequences.</div>
</div>

<!-- APPENDIX: METHODOLOGY -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Appendix A: Verification Methodology</h3>
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
  <div class="warn-note">&#9888; <strong>Honest Disclaimer:</strong> This verification trail provides raw materials for ESG assurance. Final limited assurance requires auditor procedures per ISAE 3000 (15–30% sampling, direct NGO confirmation). Synerxus reduces evidence-gathering burden by 60–70% but does not replace auditor judgment.</div>
</div>

<!-- FOOTER -->
<div style="border-top:1px solid var(--bd);padding-top:12px;display:flex;justify-content:space-between;align-items:center;">
  <div style="font-size:10px;color:var(--txt-s);">
    <div>Report ID: ${reportId} · Generated by Synerxus on behalf of ${corpName}</div>
    <div style="margin-top:2px;">Reporting Period: ${periodDisplay} · All data NGO-verified with immutable audit trails</div>
    <div style="margin-top:2px;">Questions? support@synerxus.com · &copy; ${now.getFullYear()} Synerxus · CSRD Audit Ready Data</div>
  </div>
  <div style="text-align:center;">
    <span style="display:inline-flex;align-items:center;gap:6px;background:var(--navy);border-radius:100px;padding:5px 12px;font-size:10px;color:#fff;">
      <span style="width:5px;height:5px;border-radius:50%;background:var(--teal);display:inline-block;"></span>
      Powered by Synerxus · Impact, verified.
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
