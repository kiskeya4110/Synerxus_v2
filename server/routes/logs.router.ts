import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import {
  insertVolunteerActivitySchema,
  type VolunteerActivity,
  type InsertVerificationAuditLog,
} from "@shared/schema";
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
    const { sdg, start_date, end_date, outcome_type, project_id } = _req.query;

    // Get all approved activities
    const allActivities = await storage.listVolunteerActivities();
    const approvedActivities = allActivities.filter(
      (a: any) => a.verificationStatus === 'approved'
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

    let allActivities: any[] = [];
    for (const pid of projectIds) {
      const acts = await storage.listVolunteerActivitiesByProject(pid);
      allActivities.push(...acts);
    }

    const verified = allActivities.filter(a => a.verificationStatus === 'approved');
    const pending = allActivities.filter(a => a.verificationStatus === 'pending');
    const rejected = allActivities.filter(a => a.verificationStatus === 'rejected');

    const totalHours = verified.reduce((s, a) => s + (a.hours || 0), 0);
    const totalOutcomes = verified.reduce((s, a) => s + (a.outcomeQuantity || 0), 0);
    const uniqueVolunteers = new Set(verified.map(a => a.userId)).size;

    const verificationRate = allActivities.length > 0
      ? Math.round((verified.length / allActivities.length) * 100) : 0;

    const verificationTimes = verified
      .filter(a => a.verifiedAt && a.createdAt)
      .map(a => (new Date(a.verifiedAt!).getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60));
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
    const totalBeneficiaries = verified.reduce((s, a) => s + (a.beneficiaryCount || 0), 0) || totalOutcomes;
    const allSkills = new Set(verified.flatMap(a => a.skillsApplied || []));
    const uniqueSkillsCount = allSkills.size || 0;

    // Period label
    const periodLabel = `${now.getFullYear()} YTD (Jan 1\u2013${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;

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

    // Top 3 verified activities for page 2 (fetch volunteer names)
    const top3 = [...verified]
      .filter(a => (a.outcomeText || a.description) && a.hours)
      .sort((a, b) => (b.hours || 0) - (a.hours || 0))
      .slice(0, 3);
    const topUserIds = Array.from(new Set(top3.map(a => a.userId).filter(Boolean))) as number[];
    const topUsers = topUserIds.length > 0 ? await storage.getUsersByIds(topUserIds) : [];
    const userMap = new Map(topUsers.map(u => [u.id, u.displayName || u.username || 'Volunteer']));

    const outcomeCards = top3.map(a => {
      const volunteerName = userMap.get(a.userId!) || 'Volunteer';
      const text = a.outcomeText || a.description || 'Impact logged';
      const skills = (a.skillsApplied || []).slice(0, 3);
      const primarySdg = (a.sdgTags || [])[0];
      const sdgColor = primarySdg ? (SDG_COLORS[primarySdg] || '#888') : '#6b7280';
      const verifiedDate = a.verifiedAt
        ? new Date(a.verifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A';
      const skillTags = skills.map((s: string) =>
        `<span style="font-size:10px;background:#f9fafb;color:#6b7280;padding:3px 8px;border-radius:4px;border:0.5px solid #e5e7eb;">${s}</span>`
      ).join('');
      return `<div style="border:0.5px solid #e5e7eb;border-radius:10px;padding:14px;">
        <div style="display:flex;justify-content:space-between;gap:12px;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              ${primarySdg ? `<div style="width:28px;height:28px;background:${sdgColor};border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:500;font-size:11px;flex-shrink:0;">${primarySdg}</div>` : ''}
              <span style="font-weight:500;font-size:12px;color:#111827;">${volunteerName}</span>
            </div>
            <div style="font-size:12px;color:#6b7280;line-height:1.5;margin-bottom:8px;">${text}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${skillTags}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="background:#ecfdf5;border:0.5px solid #a7f3d0;border-radius:6px;padding:8px 12px;margin-bottom:6px;">
              <div style="font-size:16px;font-weight:500;color:#059669;">${a.hours ? Math.round(a.hours) + 'h' : 'N/A'}</div>
              <div style="font-size:9px;color:#059669;">verified</div>
            </div>
            <div style="font-size:10px;color:#9ca3af;">${verifiedDate}</div>
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;font-size:9px;color:#059669;margin-top:4px;">
              <span style="width:4px;height:4px;border-radius:50%;background:#10b981;display:inline-block;"></span>Audit trail
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

    // Project breakdown rows for page 2
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
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break { page-break-before: always; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: var(--txt-p); line-height: 1.5; background: var(--bg-s); padding: 24px; }
    .page { background: var(--bg-p); border-radius: var(--r); border: 0.5px solid var(--bd); padding: 32px; max-width: 860px; margin: 0 auto 24px; }
  </style>
</head>
<body>

<!-- PAGE 1 -->
<div class="page">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:10px;">
      <img src="/synerxus-logo.png" alt="Synerxus" style="width:36px;height:36px;border-radius:8px;object-fit:contain;">
      <div>
        <div style="font-weight:600;font-size:15px;color:var(--txt-p);letter-spacing:0.5px;">SYNERXUS</div>
        <div style="font-size:11px;color:#0891b2;">Impact, verified.</div>
      </div>
    </div>
    <div style="text-align:right;font-size:11px;color:var(--txt-t);">
      <div>Generated: ${reportDate}</div>
      <div>Report ID: ${reportId}</div>
    </div>
  </div>

  <!-- Title Banner -->
  <div style="background:linear-gradient(135deg,#0891b2,#0e7490);border-radius:var(--r);padding:24px;color:#fff;margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:6px;font-size:11px;opacity:0.8;margin-bottom:6px;">
      <span style="width:6px;height:6px;border-radius:50%;background:#34d399;display:inline-block;"></span>
      VERIFIED IMPACT SUMMARY
    </div>
    <div style="font-size:22px;font-weight:500;margin-bottom:4px;">${orgName}</div>
    ${org?.description ? `<div style="font-size:13px;opacity:0.9;">${org.description.slice(0, 90)}${org.description.length > 90 ? '\u2026' : ''}</div>` : ''}
    <div style="font-size:11px;opacity:0.7;margin-top:12px;">${periodLabel}</div>
  </div>

  <!-- Key Metrics (3-col) -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
    <div style="background:#ecfdf5;border:0.5px solid #a7f3d0;border-radius:var(--r);padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:500;color:#059669;">${verified.length}</div>
      <div style="font-size:12px;color:var(--txt-s);margin-top:2px;">Verified outcomes</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:4px;font-size:10px;color:#059669;margin-top:8px;">
        <span style="width:5px;height:5px;border-radius:50%;background:#10b981;display:inline-block;"></span>NGO-confirmed
      </div>
    </div>
    <div style="background:#ecfeff;border:0.5px solid #a5f3fc;border-radius:var(--r);padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:500;color:#0891b2;">${Math.round(totalHours)}</div>
      <div style="font-size:12px;color:var(--txt-s);margin-top:2px;">Verified hours</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:4px;font-size:10px;color:#0891b2;margin-top:8px;">
        <span style="width:5px;height:5px;border-radius:50%;background:#06b6d4;display:inline-block;"></span>Not self-reported
      </div>
    </div>
    <div style="background:#f5f3ff;border:0.5px solid #ddd6fe;border-radius:var(--r);padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:500;color:#7c3aed;">${totalBeneficiaries.toLocaleString()}</div>
      <div style="font-size:12px;color:var(--txt-s);margin-top:2px;">Beneficiaries reached</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:4px;font-size:10px;color:#7c3aed;margin-top:8px;">
        <span style="width:5px;height:5px;border-radius:50%;background:#8b5cf6;display:inline-block;"></span>Estimated
      </div>
    </div>
  </div>

  <!-- Secondary Metrics (4-col) -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:24px;">
    <div style="background:var(--bg-s);border-radius:var(--r);padding:12px;text-align:center;">
      <div style="font-size:18px;font-weight:500;color:var(--txt-p);">${uniqueVolunteers}</div>
      <div style="font-size:10px;color:var(--txt-t);">Volunteers</div>
    </div>
    <div style="background:var(--bg-s);border-radius:var(--r);padding:12px;text-align:center;">
      <div style="font-size:18px;font-weight:500;color:var(--txt-p);">${uniqueSkillsCount || uniqueVolunteers}</div>
      <div style="font-size:10px;color:var(--txt-t);">Skill categories</div>
    </div>
    <div style="background:var(--bg-s);border-radius:var(--r);padding:12px;text-align:center;">
      <div style="font-size:18px;font-weight:500;color:var(--txt-p);">${projectStats.length}</div>
      <div style="font-size:10px;color:var(--txt-t);">Active projects</div>
    </div>
    <div style="background:var(--bg-s);border-radius:var(--r);padding:12px;text-align:center;">
      <div style="font-size:18px;font-weight:500;color:var(--txt-p);">${verificationRate}%</div>
      <div style="font-size:10px;color:var(--txt-t);">Verification rate</div>
    </div>
  </div>

  ${sortedSdgs.length > 0 ? `<!-- SDG Impact -->
  <div style="margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <span style="width:3px;height:16px;background:#0891b2;border-radius:2px;display:inline-block;"></span>
      <span style="font-weight:500;font-size:14px;color:var(--txt-p);">UN Sustainable Development Goals impact</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">${sdgBars}</div>
  </div>` : ''}

  <!-- Audit Trail Badge -->
  <div style="background:#ecfdf5;border:0.5px solid #a7f3d0;border-radius:var(--r);padding:14px;display:flex;align-items:center;gap:14px;">
    <div style="width:40px;height:40px;background:#d1fae5;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">\u2713</div>
    <div style="flex:1;">
      <div style="font-weight:500;font-size:13px;color:#065f46;">Full audit trail available</div>
      <div style="font-size:11px;color:#047857;margin-top:2px;">Every outcome includes: verification timestamp, verifier identity, device ID, geolocation, and hours \u2014 all NGO-confirmed with immutable records.</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#059669;flex-shrink:0;">
      <div>${verificationRate}% complete</div>
      ${avgVerificationHours > 0 ? `<div style="font-size:10px;color:#10b981;">Avg. ${avgVerificationHours}h to verify</div>` : ''}
    </div>
  </div>

  <!-- Page 1 Footer -->
  <div style="margin-top:20px;padding-top:12px;border-top:0.5px solid var(--bd);text-align:center;font-size:10px;color:var(--txt-t);">
    Page 1 of 2 \u2022 This document contains NGO-verified data with immutable audit trails
  </div>
</div>

<!-- PAGE 2 -->
<div class="page page-break">

  <!-- Mini Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:0.5px solid var(--bd);margin-bottom:20px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <img src="/synerxus-logo.png" alt="Synerxus" style="width:24px;height:24px;border-radius:6px;object-fit:contain;">
      <span style="font-weight:500;font-size:13px;color:var(--txt-p);">SYNERXUS</span>
      <span style="color:#d1d5db;margin:0 6px;">|</span>
      <span style="font-size:12px;color:var(--txt-s);">${orgName}</span>
    </div>
    <div style="font-size:11px;color:var(--txt-t);">Verified impact summary \u2022 ${now.getFullYear()} YTD</div>
  </div>

  ${top3.length > 0 ? `<!-- Top Verified Outcomes -->
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
    <span style="width:3px;height:16px;background:#0891b2;border-radius:2px;display:inline-block;"></span>
    <span style="font-weight:500;font-size:14px;color:var(--txt-p);">Top verified outcomes</span>
  </div>
  <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">${outcomeCards}</div>` : ''}

  ${projectStats.length > 0 ? `<!-- Project Breakdown -->
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
    <span style="width:3px;height:16px;background:#0891b2;border-radius:2px;display:inline-block;"></span>
    <span style="font-weight:500;font-size:14px;color:var(--txt-p);">Project breakdown</span>
  </div>
  <div style="margin-bottom:24px;">${projectBreakdown}</div>` : ''}

  <!-- Verification Methodology -->
  <div style="margin-bottom:20px;">
    <div style="font-weight:500;font-size:12px;color:var(--txt-p);margin-bottom:10px;">Verification methodology</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
      <div style="background:var(--bg-s);border-radius:var(--r);padding:12px;">
        <div style="font-weight:500;font-size:11px;color:var(--txt-p);margin-bottom:4px;">1. Volunteer submission</div>
        <div style="font-size:10px;color:var(--txt-t);line-height:1.4;">Volunteers log outcome description and hours claimed through the Synerxus platform.</div>
      </div>
      <div style="background:var(--bg-s);border-radius:var(--r);padding:12px;">
        <div style="font-weight:500;font-size:11px;color:var(--txt-p);margin-bottom:4px;">2. NGO verification</div>
        <div style="font-size:10px;color:var(--txt-t);line-height:1.4;">${orgName} confirms both the outcome AND hours with a single tap, creating an immutable record.</div>
      </div>
      <div style="background:var(--bg-s);border-radius:var(--r);padding:12px;">
        <div style="font-weight:500;font-size:11px;color:var(--txt-p);margin-bottom:4px;">3. Audit trail</div>
        <div style="font-size:10px;color:var(--txt-t);line-height:1.4;">System captures verifier identity, timestamp, device ID, and geolocation for each verification.</div>
      </div>
    </div>
  </div>

  <!-- CSRD Compliance Statement -->
  <div style="background:#fffbeb;border:0.5px solid #fde68a;border-radius:var(--r);padding:12px;font-size:11px;color:#92400e;margin-bottom:20px;">
    <strong>CSRD Audit Statement:</strong> This report contains ${verified.length} verified impact records representing ${Math.round(totalHours)} volunteer hours across ${projectStats.length} project${projectStats.length !== 1 ? 's' : ''}. All entries have been verified by authorized ${orgName} staff with immutable audit trails maintained for CSRD compliance. Generated by Synerxus Impact Data Infrastructure.
  </div>

  <!-- Footer -->
  <div style="padding-top:16px;border-top:0.5px solid var(--bd);">
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--txt-t);margin-bottom:12px;">
      <div>
        <div>This report was generated by Synerxus on behalf of ${orgName}.</div>
        <div>All data is NGO-verified with complete audit trails available upon request.</div>
      </div>
      <div style="text-align:right;">
        <div>Questions? support@synerxus.com</div>
        <div>Page 2 of 2</div>
      </div>
    </div>
    <div style="text-align:center;">
      <span style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-s);border-radius:100px;padding:6px 14px;font-size:11px;color:var(--txt-s);">
        <span style="width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block;"></span>
        Powered by Synerxus \u2022 Impact, verified.
      </span>
    </div>
  </div>
</div>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="ngo-impact-summary-${new Date().toISOString().split('T')[0]}.html"`);
    res.send(html);
  } catch (err) {
    console.error("Error generating NGO impact summary:", err);
    res.status(500).json({ message: "Failed to generate impact summary report" });
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
