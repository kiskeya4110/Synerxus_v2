import { storage } from "./storage";
import type { InsertNotification } from "@shared/schema";

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
  } catch (error) {
    console.error("Error creating application status notification:", error);
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
