import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import {
  insertVolunteerActivitySchema,
  type VolunteerActivity,
} from "@shared/schema";
import { authMiddleware } from "../middleware/auth";
import { checkAndAwardBadges } from "../badge-service";
import {
  sendActivityApprovalNotification,
} from "../email-digest-service";
import {
  notifyPendingActivity,
} from "../notification-service";

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
    let sdgGoals: number[] = [];
    if (validationResult.data.projectId) {
      const project = await storage.getProject(validationResult.data.projectId);
      if (project) {
        sdgGoals = project.sdgGoals || [];
      }
    }

    const activity = await storage.createVolunteerActivity({
      ...validationResult.data,
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
        project?.name
      ).catch(err => {
        console.error("Failed to send pending activity notification:", err);
      });
    }

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

    // Update with verification data
    const updatedActivity = await storage.updateVolunteerActivity(logId, {
      verificationStatus: 'approved',
      verifiedBy: reviewerId,
      verifiedAt: new Date()
    } as any);

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

            // Create Verified Output for CSR Audit Trail
            await storage.createVerifiedOutput({
              activityId: logId,
              partnerId: employerIdNum,
              projectId: activity.projectId || 0,
              outputType: 'hours',
              outputValue: activity.hours,
              verificationStatus: 'verified',
              verifiedBy: reviewerId || null,
              verifiedAt: new Date(),
              auditTrail: {
                action: 'log_verified',
                description: `Impact log verified: ${activity.hours}h by ${user.displayName || user.email}`,
                timestamp: new Date().toISOString(),
                reviewerId: reviewerId,
                outcomeQuantity: activity.outcomeQuantity
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

    // Send email notification to volunteer
    sendActivityApprovalNotification(logId, 'approved', reviewerId).catch(err => {
      console.error("Failed to send verification notification:", err);
    });

    // Check and award badges after verification
    if (activity.userId) {
      checkAndAwardBadges(activity.userId).catch(err => {
        console.error("Failed to check badges:", err);
      });
    }

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

    // Send email notification to volunteer
    sendActivityApprovalNotification(logId, 'rejected', reviewerId).catch(err => {
      console.error("Failed to send rejection notification:", err);
    });

    broadcastUpdate("log_rejected", updatedActivity);
    res.json(updatedActivity);
  } catch (err) {
    console.error("Error rejecting impact log:", err);
    res.status(500).json({ message: "Failed to reject impact log" });
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
