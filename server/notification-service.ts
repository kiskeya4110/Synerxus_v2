import { storage } from "./storage";
import type { InsertNotification } from "@shared/schema";
import nodemailer from "nodemailer";

type BroadcastFn = (type: string, data: any) => void;
let broadcastNotification: BroadcastFn = () => {};

export function setNotificationBroadcast(fn: BroadcastFn) {
  broadcastNotification = fn;
}

async function broadcastToUser(userId: number, notification: InsertNotification) {
  try {
    broadcastNotification("notification", {
      ...notification,
      targetUserId: userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error broadcasting notification:", error);
  }
}

// Email configuration for instant notifications
const EMAIL_CONFIG = {
  provider: process.env.EMAIL_PROVIDER || (process.env.SMTP_USER ? "smtp" : "mock"),
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
    },
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
  },
  from: process.env.EMAIL_FROM || "hello@synerxus.com",
};

// Create email transporter
function createEmailTransporter() {
  if (EMAIL_CONFIG.provider === "smtp" && EMAIL_CONFIG.smtp.auth.user) {
    return nodemailer.createTransport({
      host: EMAIL_CONFIG.smtp.host,
      port: EMAIL_CONFIG.smtp.port,
      secure: EMAIL_CONFIG.smtp.secure,
      auth: EMAIL_CONFIG.smtp.auth,
    });
  }

  if (EMAIL_CONFIG.provider === "sendgrid" && EMAIL_CONFIG.sendgrid.apiKey) {
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      auth: {
        user: "apikey",
        pass: EMAIL_CONFIG.sendgrid.apiKey,
      },
    });
  }

  // Mock transporter for development
  return {
    sendMail: async (options: any) => {
      console.log(`[EMAIL-MOCK] To: ${options.to}, Subject: ${options.subject}`);
      return { response: "Email queued (mock)", messageId: `mock-${Date.now()}` };
    },
  };
}

const emailTransporter = createEmailTransporter();

// SMS Provider interface (Phase 2 stub -- no-op implementation)
export interface SMSProvider {
  sendSMS(to: string, body: string): Promise<{ success: boolean; messageId?: string }>;
}

class NoOpSMSProvider implements SMSProvider {
  async sendSMS(to: string, body: string): Promise<{ success: boolean; messageId?: string }> {
    console.log(`[SMS-NOOP] To: ${to}, Body: ${body.substring(0, 80)}...`);
    return { success: true, messageId: `sms-noop-${Date.now()}` };
  }
}

// Push Provider interface (Phase 2 stub -- no-op implementation)
export interface PushProvider {
  sendPush(userId: number, title: string, body: string, data?: Record<string, string>): Promise<{ success: boolean }>;
}

class NoOpPushProvider implements PushProvider {
  async sendPush(userId: number, title: string, body: string): Promise<{ success: boolean }> {
    console.log(`[PUSH-NOOP] User: ${userId}, Title: ${title}, Body: ${body.substring(0, 80)}...`);
    return { success: true };
  }
}

export const smsProvider: SMSProvider = new NoOpSMSProvider();
export const pushProvider: PushProvider = new NoOpPushProvider();

export async function notifyProjectUpdate(
  projectId: number,
  userId: number,
  message: string,
  projectName?: string
): Promise<void> {
  try {
    const notification: InsertNotification = {
      userId,
      type: "project_update",
      title: "Project Update",
      message: projectName ? `${projectName}: ${message}` : message,
      relatedEntityType: "project",
      relatedEntityId: projectId,
      read: false,
    };

    await storage.createNotification(notification);
    await broadcastToUser(userId, notification);
  } catch (error) {
    console.error("Error creating project update notification:", error);
  }
}

export async function notifyNewAssignment(
  volunteerId: number,
  projectId: number,
  organizationId: number
): Promise<void> {
  try {
    const project = await storage.getProject(projectId);
    const organization = await storage.getOrganization(organizationId);

    if (!project || !organization) {
      console.error("Project or organization not found for notification");
      return;
    }

    const notification: InsertNotification = {
      userId: volunteerId,
      type: "project_assignment",
      title: "New Project Assignment",
      message: `You have been assigned to "${project.name}" by ${organization.name}`,
      relatedEntityType: "project",
      relatedEntityId: projectId,
      ...(project.sdgGoals && project.sdgGoals.length > 0 && { sdgGoals: project.sdgGoals }),
      read: false,
    };

    await storage.createNotification(notification);
    await broadcastToUser(volunteerId, notification);
  } catch (error) {
    console.error("Error creating assignment notification:", error);
  }
}

export async function notifyApplicationStatusChange(
  volunteerId: number,
  opportunityId: number,
  status: string,
  opportunityTitle?: string
): Promise<void> {
  try {
    const opportunity = opportunityTitle
      ? { title: opportunityTitle }
      : await storage.getOpportunity(opportunityId);

    if (!opportunity) {
      console.error("Opportunity not found for notification");
      return;
    }

    let message = "";
    let title = "";

    if (status === "accepted") {
      title = "Application Accepted";
      message = `Your application for "${opportunity.title}" has been accepted! The organization will contact you soon.`;
    } else if (status === "rejected") {
      title = "Application Update";
      message = `Thank you for your interest in "${opportunity.title}". The organization has moved forward with other candidates.`;
    } else {
      title = "Application Status Update";
      message = `Your application for "${opportunity.title}" status has been updated to: ${status}`;
    }

    const notification: InsertNotification = {
      userId: volunteerId,
      type: "application_status",
      title,
      message,
      relatedEntityType: "opportunity",
      relatedEntityId: opportunityId,
      read: false,
    };

    await storage.createNotification(notification);
    await broadcastToUser(volunteerId, notification);
  } catch (error) {
    console.error("Error creating application status notification:", error);
  }
}

export async function broadcastCriticalUpdate(
  message: string,
  targetUserIds?: number[]
): Promise<void> {
  try {
    if (targetUserIds && targetUserIds.length > 0) {
      for (const userId of targetUserIds) {
        const notification: InsertNotification = {
          userId,
          type: "system_alert",
          title: "Critical Update",
          message,
          read: false,
        };
        await storage.createNotification(notification);
        await broadcastToUser(userId, notification);
      }
    } else {
      broadcastNotification("critical_update", {
        type: "critical_update",
        title: "Critical Update",
        message,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error broadcasting critical update:", error);
  }
}

export async function notifyTaskAssigned(
  volunteerId: number,
  taskId: number,
  taskTitle: string,
  projectId?: number
): Promise<void> {
  try {
    const notification: InsertNotification = {
      userId: volunteerId,
      type: "task_assignment",
      title: "New Task Assigned",
      message: `You have been assigned a new task: "${taskTitle}"`,
      relatedEntityType: "task",
      relatedEntityId: taskId,
      read: false,
    };

    if (projectId) {
      const project = await storage.getProject(projectId);
      if (project) {
        notification.message += ` in project "${project.name}"`;
        if (project.sdgGoals && project.sdgGoals.length > 0) {
          notification.sdgGoals = project.sdgGoals;
        }
      }
    }

    await storage.createNotification(notification);
    await broadcastToUser(volunteerId, notification);
  } catch (error) {
    console.error("Error creating task assignment notification:", error);
  }
}

export async function notifyNewMessage(
  receiverId: number,
  senderId: number,
  subject?: string
): Promise<void> {
  try {
    const sender = await storage.getUser(senderId);

    if (!sender) {
      console.error("Sender not found for notification");
      return;
    }

    const notification: InsertNotification = {
      userId: receiverId,
      type: "new_message",
      title: "New Message",
      message: subject
        ? `${sender.displayName || sender.username} sent you a message: "${subject}"`
        : `${sender.displayName || sender.username} sent you a message`,
      relatedEntityType: "user",
      relatedEntityId: senderId,
      relatedUserId: senderId,
      read: false,
    };

    await storage.createNotification(notification);
  } catch (error) {
    console.error("Error creating new message notification:", error);
  }
}

export async function notifyOpportunityMatch(
  volunteerId: number,
  opportunityId: number,
  matchScore?: number
): Promise<void> {
  try {
    const opportunity = await storage.getOpportunity(opportunityId);

    if (!opportunity) {
      console.error("Opportunity not found for notification");
      return;
    }

    const scoreText = matchScore ? ` (${matchScore}% match)` : "";

    const notification: InsertNotification = {
      userId: volunteerId,
      type: "opportunity_match",
      title: "New Opportunity Match",
      message: `A new opportunity matches your profile${scoreText}: "${opportunity.title}"`,
      relatedEntityType: "opportunity",
      relatedEntityId: opportunityId,
      ...(opportunity.sdgGoals && opportunity.sdgGoals.length > 0 && { sdgGoals: opportunity.sdgGoals }),
      read: false,
    };

    await storage.createNotification(notification);
  } catch (error) {
    console.error("Error creating opportunity match notification:", error);
  }
}

export async function notifyProjectCompletion(
  volunteerId: number,
  projectId: number,
  projectName: string
): Promise<void> {
  try {
    const notification: InsertNotification = {
      userId: volunteerId,
      type: "project_completion",
      title: "Project Completed",
      message: `Congratulations! The project "${projectName}" has been marked as completed. Thank you for your contribution!`,
      relatedEntityType: "project",
      relatedEntityId: projectId,
      read: false,
    };

    await storage.createNotification(notification);
  } catch (error) {
    console.error("Error creating project completion notification:", error);
  }
}

export async function notifyVolunteerJoined(
  organizationUserId: number,
  volunteerId: number,
  projectId: number
): Promise<void> {
  try {
    const volunteer = await storage.getUser(volunteerId);
    const project = await storage.getProject(projectId);

    if (!volunteer || !project) {
      console.error("Volunteer or project not found for notification");
      return;
    }

    const notification: InsertNotification = {
      userId: organizationUserId,
      type: "volunteer_joined",
      title: "New Volunteer Joined",
      message: `${volunteer.displayName || volunteer.username} has joined "${project.name}"`,
      relatedEntityType: "project",
      relatedEntityId: projectId,
      relatedUserId: volunteerId,
      read: false,
    };

    await storage.createNotification(notification);
  } catch (error) {
    console.error("Error creating volunteer joined notification:", error);
  }
}

/**
 * Notify user of a new message in a conversation thread
 */
export async function notifyThreadMessage(
  receiverId: number,
  senderId: number,
  threadId: number,
  threadTopic: string
): Promise<void> {
  try {
    const sender = await storage.getUser(senderId);

    if (!sender) {
      console.error("Sender not found for thread message notification");
      return;
    }

    const senderName = sender.displayName || sender.username || "Someone";

    const notification: InsertNotification = {
      userId: receiverId,
      type: "new_message",
      title: "New Message",
      message: `${senderName} sent you a message in "${threadTopic}"`,
      relatedEntityType: "thread",
      relatedEntityId: threadId,
      relatedUserId: senderId,
      read: false,
    };

    await storage.createNotification(notification);
  } catch (error) {
    console.error("Error creating thread message notification:", error);
  }
}

/**
 * Notify organization users when a new application is submitted
 */
export async function notifyNewApplication(
  opportunityId: number,
  volunteerId: number,
  applicationId: number,
  matchScore?: number | null
): Promise<void> {
  try {
    const opportunity = await storage.getOpportunity(opportunityId);
    const volunteer = await storage.getUser(volunteerId);

    if (!opportunity || !volunteer) {
      console.error("Opportunity or volunteer not found for notification");
      return;
    }

    // Get the organization to find organization users to notify
    const organization = await storage.getOrganization(opportunity.organizationId);
    if (!organization) {
      console.error("Organization not found for notification");
      return;
    }

    // Find all users belonging to this organization
    const orgUsers = await storage.listUsersByOrganization(opportunity.organizationId);

    if (!orgUsers || orgUsers.length === 0) {
      console.error("No organization users found for notification");
      return;
    }

    const volunteerName = volunteer.displayName || volunteer.username || "A volunteer";
    const scoreText = matchScore ? ` (${matchScore}% match)` : "";

    // Create notification for each organization user
    for (const orgUser of orgUsers) {
      const notification: InsertNotification = {
        userId: orgUser.id,
        type: "new_application",
        title: "New Application Received",
        message: `${volunteerName} applied for "${opportunity.title}"${scoreText}. Review their application now.`,
        relatedEntityType: "application",
        relatedEntityId: applicationId,
        relatedUserId: volunteerId,
        ...(opportunity.sdgGoals && opportunity.sdgGoals.length > 0 && { sdgGoals: opportunity.sdgGoals }),
        read: false,
      };

      await storage.createNotification(notification);
    }
  } catch (error) {
    console.error("Error creating new application notification:", error);
  }
}

/**
 * Send instant email notification to organization when a new application is submitted
 */
export async function sendNewApplicationEmail(
  opportunityId: number,
  volunteerId: number,
  applicationId: number,
  matchScore?: number | null
): Promise<void> {
  try {
    const opportunity = await storage.getOpportunity(opportunityId);
    const volunteer = await storage.getUser(volunteerId);

    if (!opportunity || !volunteer) {
      console.error("[EMAIL] Opportunity or volunteer not found for application email");
      return;
    }

    const organization = await storage.getOrganization(opportunity.organizationId);
    if (!organization) {
      console.error("[EMAIL] Organization not found for application email");
      return;
    }

    // Get organization users with email addresses
    const orgUsers = await storage.listUsersByOrganization(opportunity.organizationId);
    const usersWithEmail = orgUsers.filter(u => u.email);

    if (usersWithEmail.length === 0) {
      console.log("[EMAIL] No organization users with email found");
      return;
    }

    const volunteerName = volunteer.displayName || volunteer.username || "A volunteer";
    const scoreText = matchScore ? ` with a ${matchScore}% match score` : "";
    const reviewUrl = `${process.env.APP_URL || "https://synerxus.com"}/applications?highlight=${applicationId}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Volunteer Application</h1>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>${volunteerName}</strong> has applied for your opportunity <strong>"${opportunity.title}"</strong>${scoreText}.
          </p>

          ${matchScore && matchScore >= 70 ? `
          <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #059669; font-weight: 600;">
              High Match Score: ${matchScore}%
            </p>
            <p style="margin: 5px 0 0 0; color: #065f46; font-size: 14px;">
              This volunteer's skills and experience closely align with your requirements.
            </p>
          </div>
          ` : ""}

          <div style="text-align: center; margin: 25px 0;">
            <a href="${reviewUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Review Application
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            You're receiving this email because you're a member of ${organization.name} on Synerxus.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email to all organization users
    for (const orgUser of usersWithEmail) {
      try {
        await emailTransporter.sendMail({
          from: EMAIL_CONFIG.from,
          to: orgUser.email,
          subject: `New Application: ${volunteerName} applied for "${opportunity.title}"`,
          html: emailHtml,
        });
        console.log(`[EMAIL] Application notification sent to ${orgUser.email}`);
      } catch (emailError) {
        console.error(`[EMAIL] Failed to send to ${orgUser.email}:`, emailError);
      }
    }
  } catch (error) {
    console.error("[EMAIL] Error sending new application email:", error);
  }
}

/**
 * Notify volunteers about AIU verification status changes
 */
export async function notifyAiuVerification(
  volunteerId: number,
  projectId: number,
  status: 'verified' | 'rejected' | 'adjusted',
  projectName: string,
  aiuAmount?: number,
  adjustmentNotes?: string
): Promise<void> {
  try {
    let title: string;
    let message: string;

    switch (status) {
      case 'verified':
        title = "AIU Impact Verified";
        message = `Your impact contribution on "${projectName}" has been verified by the organization.${aiuAmount ? ` You earned ${aiuAmount.toFixed(2)} AIUs.` : ''}`;
        break;
      case 'rejected':
        title = "AIU Impact Needs Review";
        message = `Your impact submission for "${projectName}" requires adjustments. Please review and resubmit your contribution data.`;
        break;
      case 'adjusted':
        title = "AIU Impact Adjusted & Verified";
        message = `Your impact contribution on "${projectName}" has been adjusted and verified by the organization.${aiuAmount ? ` Updated AIU: ${aiuAmount.toFixed(2)}.` : ''}${adjustmentNotes ? ` Note: ${adjustmentNotes}` : ''}`;
        break;
    }

    const notification: InsertNotification = {
      userId: volunteerId,
      type: "aiu_verification",
      title,
      message,
      relatedEntityType: "project",
      relatedEntityId: projectId,
      read: false,
    };

    await storage.createNotification(notification);
  } catch (error) {
    console.error("Error creating AIU verification notification:", error);
  }
}

/**
 * Notify all volunteers on a project about AIU verification
 */
export async function notifyProjectVolunteersAiuVerification(
  projectId: number,
  status: 'verified' | 'rejected' | 'adjusted',
  projectName: string,
  volunteerAius?: Array<{ volunteerId: number; aiu: number }>,
  adjustmentNotes?: string
): Promise<void> {
  try {
    // Get all project assignments (volunteers)
    const assignments = await storage.listProjectAssignmentsByProject(projectId);
    const activeVolunteerIds: number[] = assignments
      .filter(a => a.status === 'active' || a.status === 'accepted' || a.status === 'completed')
      .map(a => a.volunteerId)
      .filter((id): id is number => id !== null);

    // Also get volunteers from activities
    const activities = await storage.listVolunteerActivitiesByProject(projectId);
    const activityUserIds = activities
      .map(a => a.userId)
      .filter((id): id is number => id !== null);

    // Combine unique volunteer IDs
    const combinedIds = [...activeVolunteerIds, ...activityUserIds];
    const uniqueSet = new Set(combinedIds);
    const allVolunteerIds = Array.from(uniqueSet);

    // Notify each volunteer
    for (const volunteerId of allVolunteerIds) {
      const volunteerAiu = volunteerAius?.find(v => v.volunteerId === volunteerId)?.aiu;
      await notifyAiuVerification(
        volunteerId,
        projectId,
        status,
        projectName,
        volunteerAiu,
        adjustmentNotes
      );
    }
  } catch (error) {
    console.error("Error notifying project volunteers about AIU verification:", error);
  }
}

/**
 * Notify organization users when a volunteer submits an impact for approval
 * This ensures organizations are aware of pending impacts that need review
 */
export async function notifyPendingImpact(
  impactId: number,
  projectId: number,
  volunteerId: number,
  metricId?: number | null,
  value?: number,
  projectName?: string
): Promise<void> {
  try {
    // Get project to find organization
    const project = await storage.getProject(projectId);
    if (!project || !project.organizationId) {
      console.log("[Notification] No organization found for project:", projectId);
      return;
    }

    // Get volunteer name
    const volunteer = await storage.getUser(volunteerId);
    const volunteerName = volunteer?.displayName || volunteer?.username || "A volunteer";

    // Get metric name if available
    let metricName = "impact";
    if (metricId) {
      const metric = await storage.getImpactMetric(metricId);
      if (metric) {
        metricName = metric.name || "impact";
      }
    }

    // Get organization users to notify
    const orgUsers = await storage.listUsersByOrganization(project.organizationId);
    if (!orgUsers || orgUsers.length === 0) {
      console.log("[Notification] No organization users found to notify for org:", project.organizationId);
      return;
    }

    const usedProjectName = projectName || project.name || "a project";

    // Create notification for each organization user
    for (const orgUser of orgUsers) {
      const notification: InsertNotification = {
        userId: orgUser.id,
        type: "pending_approval",
        title: "Impact Awaiting Approval",
        message: `${volunteerName} submitted ${value || 0} ${metricName} for "${usedProjectName}". Review and approve to add this to their verified impact record.`,
        relatedEntityType: "project_impact",
        relatedEntityId: impactId,
        relatedUserId: volunteerId,
        ...(project.sdgGoals && project.sdgGoals.length > 0 && { sdgGoals: project.sdgGoals }),
        read: false,
      };

      await storage.createNotification(notification);
    }

    console.log(`[Notification] Pending impact notification sent to ${orgUsers.length} organization users`);
  } catch (error) {
    console.error("Error creating pending impact notification:", error);
  }
}

/**
 * Notify organization users when a volunteer submits hours for approval
 */
export async function notifyPendingActivity(
  activityId: number,
  projectId: number,
  volunteerId: number,
  hours: number | null,
  projectName?: string,
  outcomeText?: string | null
): Promise<void> {
  try {
    // Get project to find organization
    const project = await storage.getProject(projectId);
    if (!project || !project.organizationId) {
      console.log("[Notification] No organization found for project:", projectId);
      return;
    }

    // Get volunteer name
    const volunteer = await storage.getUser(volunteerId);
    const volunteerName = volunteer?.displayName || volunteer?.username || "A volunteer";

    // Get organization users to notify
    const orgUsers = await storage.listUsersByOrganization(project.organizationId);
    if (!orgUsers || orgUsers.length === 0) {
      console.log("[Notification] No organization users found to notify for org:", project.organizationId);
      return;
    }

    const usedProjectName = projectName || project.name || "a project";

    // Build outcome-first message (Phase 2: include outcomeText, not just hours)
    let messageBody: string;
    if (outcomeText) {
      messageBody = `${volunteerName} submitted an outcome for "${usedProjectName}": "${outcomeText.substring(0, 100)}${outcomeText.length > 100 ? '...' : ''}"`;
      if (hours && hours > 0) {
        messageBody += ` (${hours} hours)`;
      }
      messageBody += `. Review and verify.`;
    } else if (hours && hours > 0) {
      messageBody = `${volunteerName} logged ${hours} hours for "${usedProjectName}". Review and approve to add this to their verified activity record.`;
    } else {
      messageBody = `${volunteerName} submitted an impact log for "${usedProjectName}". Review and verify.`;
    }

    // Create notification for each organization user
    for (const orgUser of orgUsers) {
      const notification: InsertNotification = {
        userId: orgUser.id,
        type: "pending_approval",
        title: outcomeText ? "Outcome Awaiting Verification" : "Hours Awaiting Approval",
        message: messageBody,
        relatedEntityType: "volunteer_activity",
        relatedEntityId: activityId,
        relatedUserId: volunteerId,
        ...(project.sdgGoals && project.sdgGoals.length > 0 && { sdgGoals: project.sdgGoals }),
        read: false,
      };

      await storage.createNotification(notification);

      // Push notification stub (Phase 2)
      pushProvider.sendPush(
        orgUser.id,
        notification.title,
        messageBody
      ).catch(err => console.error("[PUSH] Failed:", err));
    }

    console.log(`[Notification] Pending activity notification sent to ${orgUsers.length} organization users`);
  } catch (error) {
    console.error("Error creating pending activity notification:", error);
  }
}

/**
 * Notify a user that they have earned a badge
 */
export async function notifyBadgeEarned(
  userId: number,
  badgeId: number,
  badgeName: string,
  badgeIcon: string | null,
  badgeTier: string | null
): Promise<void> {
  try {
    const tierEmoji = {
      bronze: "🥉",
      silver: "🥈",
      gold: "🥇",
      platinum: "💎"
    }[badgeTier || "bronze"] || "🏅";

    const notification: InsertNotification = {
      userId,
      type: "badge_earned",
      title: `${tierEmoji} Badge Earned!`,
      message: `Congratulations! You've earned the "${badgeName}" badge. ${badgeIcon || "🎉"} Keep up the great work!`,
      relatedEntityType: "badge",
      relatedEntityId: badgeId,
      read: false,
    };

    await storage.createNotification(notification);
    console.log(`[Notification] Badge earned notification sent to user ${userId} for badge "${badgeName}"`);
  } catch (error) {
    console.error("Error creating badge earned notification:", error);
  }
}
