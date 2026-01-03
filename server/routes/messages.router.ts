import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertOrgMessageSchema } from "@shared/schema";
import { handleValidationError } from "./utils";
import { notifyNewMessage, notifyThreadMessage } from "../notification-service";

export const messagesRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/messages - Get all messages for a user
messagesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userIdParam = req.query.userId as string;

    if (!userIdParam) {
      return res.status(400).json({ message: "userId query parameter is required" });
    }

    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

    const sentMessages = await storage.listMessagesBySender(userId);
    const receivedMessages = await storage.listMessagesByReceiver(userId);

    const allMessages = [...sentMessages, ...receivedMessages].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json(allMessages);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// GET /api/messages/conversation/:userId - Get conversation between two users
messagesRouter.get("/conversation/:userId", async (req: Request, res: Response) => {
  try {
    const otherUserId = parseInt(req.params.userId);
    const currentUserIdParam = req.query.currentUserId as string;

    if (!currentUserIdParam) {
      return res.status(400).json({ message: "currentUserId query parameter is required" });
    }

    const currentUserId = parseInt(currentUserIdParam);
    if (isNaN(currentUserId) || isNaN(otherUserId)) {
      return res.status(400).json({ message: "User IDs must be valid numbers" });
    }

    const conversation = await storage.listConversation(currentUserId, otherUserId);
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch conversation" });
  }
});

// POST /api/messages - Create new message
messagesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const messageData = insertOrgMessageSchema.parse(req.body);
    const message = await storage.createMessage(messageData);

    // Create notification for the recipient
    try {
      await notifyNewMessage(
        message.receiverId,
        message.senderId,
        message.subject || undefined
      );
    } catch (notifyErr) {
      // Log but don't fail the request if notification fails
      console.error("Failed to create message notification:", notifyErr);
    }

    broadcastUpdate("message_created", message);
    res.status(201).json(message);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// PATCH /api/messages/:id/read - Mark message as read
messagesRouter.patch("/:id/read", async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.id);
    const updatedMessage = await storage.markMessageAsRead(messageId);

    if (!updatedMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    broadcastUpdate("message_read", updatedMessage);
    res.json(updatedMessage);
  } catch (err) {
    res.status(500).json({ message: "Failed to mark message as read" });
  }
});

// PATCH /api/messages/:id/delivered - Mark message as delivered (for live chat confirmation)
messagesRouter.patch("/:id/delivered", async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.id);
    const updatedMessage = await storage.markMessageAsDelivered(messageId);

    if (!updatedMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    broadcastUpdate("message_delivered", updatedMessage);
    res.json(updatedMessage);
  } catch (err) {
    res.status(500).json({ message: "Failed to mark message as delivered" });
  }
});

// POST /api/messages/mark-delivered - Mark multiple messages as delivered (batch)
messagesRouter.post("/mark-delivered", async (req: Request, res: Response) => {
  try {
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: "messageIds array is required" });
    }

    const results = await Promise.all(
      messageIds.map(async (id: number) => {
        try {
          return await storage.markMessageAsDelivered(id);
        } catch {
          return null;
        }
      })
    );

    const updated = results.filter(r => r !== null);
    updated.forEach(msg => broadcastUpdate("message_delivered", msg));

    res.json({ updated: updated.length, total: messageIds.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark messages as delivered" });
  }
});

// GET /api/conversation-threads/organization/:organizationId - Get threads for organization
messagesRouter.get("/conversation-threads/organization/:organizationId", async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "organizationId must be a valid number" });
    }

    const threads = await storage.listConversationThreadsByOrganization(organizationId);

    const enrichedThreads = await Promise.all(threads.map(async (thread) => {
      const volunteer = await storage.getUser(thread.volunteerId);
      let project = null;
      if (thread.projectId) {
        project = await storage.getProject(thread.projectId);
      }
      return {
        ...thread,
        volunteerName: volunteer?.displayName || volunteer?.username || 'Unknown Volunteer',
        volunteerAvatar: volunteer?.avatar,
        projectName: project?.name || null
      };
    }));

    res.json(enrichedThreads);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch conversation threads" });
  }
});

// GET /api/conversation-threads/volunteer/:volunteerId - Get threads for volunteer
messagesRouter.get("/conversation-threads/volunteer/:volunteerId", async (req: Request, res: Response) => {
  try {
    const volunteerId = parseInt(req.params.volunteerId);
    if (isNaN(volunteerId)) {
      return res.status(400).json({ message: "volunteerId must be a valid number" });
    }

    const threads = await storage.listConversationThreadsByVolunteer(volunteerId);

    const enrichedThreads = await Promise.all(threads.map(async (thread) => {
      const organization = await storage.getOrganization(thread.organizationId);
      let project = null;
      if (thread.projectId) {
        project = await storage.getProject(thread.projectId);
      }
      return {
        ...thread,
        organizationName: organization?.name || 'Unknown Organization',
        organizationLogo: organization?.logo,
        projectName: project?.name || null
      };
    }));

    res.json(enrichedThreads);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch conversation threads" });
  }
});

// GET /api/conversation-threads/:threadId/messages - Get messages in a thread
messagesRouter.get("/conversation-threads/:threadId/messages", async (req: Request, res: Response) => {
  try {
    const threadId = parseInt(req.params.threadId);
    const userIdParam = req.query.userId as string;

    if (isNaN(threadId)) {
      return res.status(400).json({ message: "threadId must be a valid number" });
    }

    if (!userIdParam) {
      return res.status(400).json({ message: "userId query parameter is required for authorization" });
    }

    const requestingUserId = parseInt(userIdParam);
    if (isNaN(requestingUserId)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

    const thread = await storage.getConversationThread(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const requestingUser = await storage.getUser(requestingUserId);
    if (!requestingUser) {
      return res.status(401).json({ message: "User not found" });
    }

    const isVolunteerInThread = thread.volunteerId === requestingUserId;
    const isOrganizationMember = requestingUser.organizationId === thread.organizationId;

    if (!isVolunteerInThread && !isOrganizationMember) {
      return res.status(403).json({ message: "Access denied. You are not authorized to view messages in this thread." });
    }

    const messages = await storage.listMessagesByThread(threadId);

    // Mark messages as delivered when recipient fetches them (live chat delivery confirmation)
    const messagesToMarkDelivered = messages.filter(
      msg => msg.receiverId === requestingUserId &&
             msg.deliveryStatus === 'sent' &&
             msg.senderId !== requestingUserId
    );

    // Update delivery status in background (don't wait for this)
    if (messagesToMarkDelivered.length > 0) {
      Promise.all(
        messagesToMarkDelivered.map(msg => storage.markMessageAsDelivered(msg.id))
      ).then(updated => {
        updated.forEach(msg => {
          if (msg) broadcastUpdate("message_delivered", msg);
        });
      }).catch(err => console.error("Failed to mark messages as delivered:", err));
    }

    const enrichedMessages = await Promise.all(messages.map(async (msg) => {
      const sender = await storage.getUser(msg.senderId);
      // Update the status to 'delivered' for messages we just marked
      const isBeingDelivered = messagesToMarkDelivered.some(m => m.id === msg.id);
      return {
        ...msg,
        deliveryStatus: isBeingDelivered ? 'delivered' : (msg.deliveryStatus || 'sent'),
        senderName: sender?.displayName || sender?.username || 'Unknown',
        senderAvatar: sender?.avatar
      };
    }));

    res.json({
      thread,
      messages: enrichedMessages
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch thread messages" });
  }
});

// POST /api/conversation-threads - Create new conversation thread
messagesRouter.post("/conversation-threads", async (req: Request, res: Response) => {
  try {
    const { organizationId, volunteerId, topic, projectId, initialMessage } = req.body;

    if (!organizationId || !volunteerId || !topic) {
      return res.status(400).json({ message: "organizationId, volunteerId, and topic are required" });
    }

    const existingThread = await storage.getConversationThreadBetween(
      parseInt(organizationId),
      parseInt(volunteerId),
      topic
    );

    if (existingThread) {
      return res.status(409).json({
        message: "A conversation thread with this topic already exists",
        thread: existingThread
      });
    }

    const thread = await storage.createConversationThread({
      organizationId: parseInt(organizationId),
      volunteerId: parseInt(volunteerId),
      topic,
      projectId: projectId ? parseInt(projectId) : null,
      status: 'active',
      lastMessageAt: new Date()
    });

    if (initialMessage) {
      // Determine who is the sender - could be volunteer or organization
      const volunteer = await storage.getUser(parseInt(volunteerId));

      // Try to find org user - first by organizationId field, then by org membership
      let orgUser = await storage.getUserByOrganizationId(parseInt(organizationId));
      if (!orgUser) {
        // Fallback: get any user from the organization
        const orgUsers = await storage.listUsersByOrganization(parseInt(organizationId));
        if (orgUsers.length > 0) {
          orgUser = orgUsers[0];
        }
      }

      // If the request has a senderId, use that to determine who is sending
      const senderId = req.body.senderId ? parseInt(req.body.senderId) : null;
      const isVolunteerSending = senderId === parseInt(volunteerId) || !senderId;

      if (isVolunteerSending && volunteer && orgUser) {
        // Volunteer is starting conversation
        const message = await storage.createMessage({
          senderId: parseInt(volunteerId),
          receiverId: orgUser.id,
          content: initialMessage,
          messageType: 'inquiry',
          threadId: thread.id
        });

        await storage.createNotification({
          userId: orgUser.id,
          type: 'message',
          title: 'New Message',
          message: `${volunteer.displayName || volunteer.username} sent you a message about "${topic}"`,
          relatedEntityType: 'thread',
          relatedEntityId: thread.id
        });

        broadcastUpdate("message_created", message);
      } else if (senderId && orgUser) {
        // Organization user is starting conversation (outreach)
        // Use the actual senderId from the request, not the orgUser lookup
        const actualSender = await storage.getUser(senderId);
        const senderName = actualSender?.displayName || actualSender?.username || 'Organization';

        const message = await storage.createMessage({
          senderId: senderId, // Use actual sender ID from request
          receiverId: parseInt(volunteerId),
          content: initialMessage,
          messageType: 'outreach',
          threadId: thread.id
        });

        await storage.createNotification({
          userId: parseInt(volunteerId),
          type: 'message',
          title: 'New Message',
          message: `${senderName} sent you a message about "${topic}"`,
          relatedEntityType: 'thread',
          relatedEntityId: thread.id
        });

        broadcastUpdate("message_created", message);
      } else if (orgUser) {
        // Fallback: Organization starting conversation but no senderId provided
        const message = await storage.createMessage({
          senderId: orgUser.id,
          receiverId: parseInt(volunteerId),
          content: initialMessage,
          messageType: 'outreach',
          threadId: thread.id
        });

        await storage.createNotification({
          userId: parseInt(volunteerId),
          type: 'message',
          title: 'New Message',
          message: `You have a new message about "${topic}"`,
          relatedEntityType: 'thread',
          relatedEntityId: thread.id
        });

        broadcastUpdate("message_created", message);
      } else if (volunteer) {
        // Volunteer is starting conversation but no org user found - still create message
        // This ensures messages aren't lost even if org user lookup fails
        console.warn(`No org user found for organization ${organizationId}, creating message with volunteer as both sender and temporary receiver`);
        const message = await storage.createMessage({
          senderId: parseInt(volunteerId),
          receiverId: parseInt(volunteerId), // Temporary - will be corrected when org user responds
          content: initialMessage,
          messageType: 'inquiry',
          threadId: thread.id
        });

        broadcastUpdate("message_created", message);
      }
    }

    broadcastUpdate("thread_created", thread);
    res.status(201).json(thread);
  } catch (err) {
    res.status(500).json({ message: "Failed to create conversation thread" });
  }
});

// POST /api/conversation-threads/:threadId/messages - Send message in thread
messagesRouter.post("/conversation-threads/:threadId/messages", async (req: Request, res: Response) => {
  try {
    const threadId = parseInt(req.params.threadId);
    const { senderId, content, messageType = 'text' } = req.body;

    if (isNaN(threadId)) {
      return res.status(400).json({ message: "threadId must be a valid number" });
    }

    if (!senderId || !content) {
      return res.status(400).json({ message: "senderId and content are required" });
    }

    const thread = await storage.getConversationThread(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const senderUser = await storage.getUser(parseInt(senderId));
    if (!senderUser) {
      return res.status(401).json({ message: "Sender not found" });
    }

    const isVolunteerInThread = thread.volunteerId === parseInt(senderId);
    const isOrganizationMember = senderUser.organizationId === thread.organizationId;

    if (!isVolunteerInThread && !isOrganizationMember) {
      return res.status(403).json({ message: "Access denied. You are not authorized to send messages in this thread." });
    }

    // Determine the receiver based on who is sending
    let receiverId: number | undefined;

    if (parseInt(senderId) === thread.volunteerId) {
      // Volunteer is sending - find org user to receive
      // First try getUserByOrganizationId, then fall back to listUsersByOrganization
      const orgUser = await storage.getUserByOrganizationId(thread.organizationId);
      if (orgUser) {
        receiverId = orgUser.id;
      } else {
        // Fallback: get any user from the organization
        const orgUsers = await storage.listUsersByOrganization(thread.organizationId);
        if (orgUsers.length > 0) {
          receiverId = orgUsers[0].id;
        }
      }
    } else {
      // Organization is sending - volunteer receives
      receiverId = thread.volunteerId;
    }

    if (!receiverId) {
      console.error(`Could not determine message recipient for thread ${threadId}, org ${thread.organizationId}`);
      return res.status(400).json({ message: "Could not determine message recipient. Organization may not have any users." });
    }

    const message = await storage.createMessage({
      senderId: parseInt(senderId),
      receiverId,
      content,
      messageType,
      threadId
    });

    await storage.updateConversationThread(threadId, {
      lastMessageAt: new Date()
    });

    // Create notification for the recipient with sender info
    try {
      await notifyThreadMessage(
        receiverId,
        parseInt(senderId),
        threadId,
        thread.topic
      );
    } catch (notifyErr) {
      console.error("Failed to create thread message notification:", notifyErr);
    }

    const sender = await storage.getUser(parseInt(senderId));
    const enrichedMessage = {
      ...message,
      senderName: sender?.displayName || sender?.username || 'Unknown',
      senderAvatar: sender?.avatar
    };

    broadcastUpdate("message_created", enrichedMessage);
    res.status(201).json(enrichedMessage);
  } catch (err) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

// PATCH /api/conversation-threads/:threadId - Update thread status
messagesRouter.patch("/conversation-threads/:threadId", async (req: Request, res: Response) => {
  try {
    const threadId = parseInt(req.params.threadId);
    const { status } = req.body;

    if (isNaN(threadId)) {
      return res.status(400).json({ message: "threadId must be a valid number" });
    }

    const updatedThread = await storage.updateConversationThread(threadId, { status });

    if (!updatedThread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    broadcastUpdate("thread_updated", updatedThread);
    res.json(updatedThread);
  } catch (err) {
    res.status(500).json({ message: "Failed to update thread" });
  }
});

// GET /api/organization/:organizationId/contactable-volunteers - Get all volunteers connected to organization
// Returns volunteers who are assigned to projects OR have applied to opportunities
messagesRouter.get("/organization/:organizationId/contactable-volunteers", async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "organizationId must be a valid number" });
    }

    // Get all projects for this organization
    const projects = await storage.listProjectsByOrganization(organizationId);
    const projectIds = projects.map(p => p.id);

    // Get all opportunities for this organization
    const opportunities = await storage.listOpportunitiesByOrganization(organizationId);
    const opportunityIds = opportunities.map(o => o.id);

    // Get volunteers assigned to projects
    const assignments = projectIds.length > 0
      ? await storage.listProjectAssignmentsByProjectIds(projectIds)
      : [];

    // Get volunteers who have applied to opportunities
    const applications = opportunityIds.length > 0
      ? await storage.listApplicationsByOpportunityIds(opportunityIds)
      : [];

    // Combine unique volunteer IDs
    const volunteerIdSet = new Set<number>();
    const volunteerProjectMap = new Map<number, { projects: number[], applications: number[], status: string }>();

    // Add assigned volunteers
    for (const assignment of assignments) {
      if (assignment.volunteerId) {
        volunteerIdSet.add(assignment.volunteerId);
        if (!volunteerProjectMap.has(assignment.volunteerId)) {
          volunteerProjectMap.set(assignment.volunteerId, { projects: [], applications: [], status: 'assigned' });
        }
        volunteerProjectMap.get(assignment.volunteerId)!.projects.push(assignment.projectId);
      }
    }

    // Add applicant volunteers
    for (const application of applications) {
      if (application.volunteerId) {
        volunteerIdSet.add(application.volunteerId);
        if (!volunteerProjectMap.has(application.volunteerId)) {
          volunteerProjectMap.set(application.volunteerId, { projects: [], applications: [], status: 'applicant' });
        }
        volunteerProjectMap.get(application.volunteerId)!.applications.push(application.opportunityId);
      }
    }

    // Fetch volunteer details
    const volunteerIds = Array.from(volunteerIdSet);
    const volunteers = await Promise.all(
      volunteerIds.map(async (id) => {
        const user = await storage.getUser(id);
        const connection = volunteerProjectMap.get(id);
        return user ? {
          id: user.id,
          displayName: user.displayName || user.username,
          email: user.email,
          avatar: user.avatar,
          skills: user.skills,
          connectionType: connection?.projects.length ? 'assigned' : 'applicant',
          projectIds: connection?.projects || [],
          applicationIds: connection?.applications || []
        } : null;
      })
    );

    res.json(volunteers.filter(v => v !== null));
  } catch (err) {
    console.error("Error fetching contactable volunteers:", err);
    res.status(500).json({ message: "Failed to fetch contactable volunteers" });
  }
});

// POST /api/organization/:organizationId/bulk-message - Send message to multiple volunteers
messagesRouter.post("/organization/:organizationId/bulk-message", async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    const { senderId, volunteerIds, subject, content, messageType = 'announcement', projectId } = req.body;

    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "organizationId must be a valid number" });
    }

    if (!senderId || !volunteerIds || !Array.isArray(volunteerIds) || volunteerIds.length === 0) {
      return res.status(400).json({ message: "senderId and volunteerIds array are required" });
    }

    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }

    // Verify sender belongs to organization
    const sender = await storage.getUser(parseInt(senderId));
    if (!sender || sender.organizationId !== organizationId) {
      return res.status(403).json({ message: "Sender is not authorized for this organization" });
    }

    const organization = await storage.getOrganization(organizationId);
    const senderName = sender.displayName || sender.username || organization?.name || 'Organization';

    const results = {
      sent: 0,
      failed: 0,
      messages: [] as any[]
    };

    // Send message to each volunteer
    for (const volunteerId of volunteerIds) {
      try {
        // Create or get conversation thread
        let thread = await storage.getConversationThreadBetween(
          organizationId,
          parseInt(volunteerId),
          subject || 'Organization Message'
        );

        if (!thread) {
          thread = await storage.createConversationThread({
            organizationId,
            volunteerId: parseInt(volunteerId),
            topic: subject || 'Organization Message',
            projectId: projectId ? parseInt(projectId) : null,
            status: 'active',
            lastMessageAt: new Date()
          });
        }

        // Create the message
        const message = await storage.createMessage({
          senderId: parseInt(senderId),
          receiverId: parseInt(volunteerId),
          subject,
          content,
          messageType,
          threadId: thread.id,
          projectId: projectId ? parseInt(projectId) : undefined
        });

        // Update thread's last message time
        await storage.updateConversationThread(thread.id, {
          lastMessageAt: new Date()
        });

        // Create notification for the volunteer
        await storage.createNotification({
          userId: parseInt(volunteerId),
          type: 'new_message',
          title: 'New Message from Organization',
          message: subject
            ? `${senderName} sent you a message: "${subject}"`
            : `${senderName} sent you a message`,
          relatedEntityType: 'thread',
          relatedEntityId: thread.id,
          relatedUserId: parseInt(senderId),
          read: false
        });

        results.sent++;
        results.messages.push(message);
        broadcastUpdate("message_created", message);
      } catch (err) {
        console.error(`Failed to send message to volunteer ${volunteerId}:`, err);
        results.failed++;
      }
    }

    res.status(201).json({
      success: true,
      summary: `Sent ${results.sent} messages, ${results.failed} failed`,
      ...results
    });
  } catch (err) {
    console.error("Error sending bulk messages:", err);
    res.status(500).json({ message: "Failed to send bulk messages" });
  }
});

// POST /api/organization/:organizationId/project/:projectId/message-volunteers - Message all volunteers on a project
messagesRouter.post("/organization/:organizationId/project/:projectId/message-volunteers", async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    const projectId = parseInt(req.params.projectId);
    const { senderId, subject, content, messageType = 'project_update' } = req.body;

    if (isNaN(organizationId) || isNaN(projectId)) {
      return res.status(400).json({ message: "organizationId and projectId must be valid numbers" });
    }

    if (!senderId || !content) {
      return res.status(400).json({ message: "senderId and content are required" });
    }

    // Verify project belongs to organization
    const project = await storage.getProject(projectId);
    if (!project || project.organizationId !== organizationId) {
      return res.status(403).json({ message: "Project does not belong to this organization" });
    }

    // Get all volunteers assigned to this project
    const assignments = await storage.listProjectAssignmentsByProject(projectId);
    const activeAssignments = assignments.filter(a =>
      a.status === 'active' || a.status === 'accepted' || a.status === 'completed'
    );

    if (activeAssignments.length === 0) {
      return res.status(400).json({ message: "No volunteers assigned to this project" });
    }

    const volunteerIds = activeAssignments
      .map(a => a.volunteerId)
      .filter((id): id is number => id !== null);

    // Use bulk send
    req.body.volunteerIds = volunteerIds;
    req.body.projectId = projectId;
    req.body.subject = subject || `Update: ${project.name}`;

    // Forward to bulk endpoint logic
    const sender = await storage.getUser(parseInt(senderId));
    if (!sender || sender.organizationId !== organizationId) {
      return res.status(403).json({ message: "Sender is not authorized for this organization" });
    }

    const organization = await storage.getOrganization(organizationId);
    const senderName = sender.displayName || sender.username || organization?.name || 'Organization';

    const results = { sent: 0, failed: 0, messages: [] as any[] };

    for (const volunteerId of volunteerIds) {
      try {
        let thread = await storage.getConversationThreadBetween(
          organizationId,
          volunteerId,
          `Project: ${project.name}`
        );

        if (!thread) {
          thread = await storage.createConversationThread({
            organizationId,
            volunteerId,
            topic: `Project: ${project.name}`,
            projectId,
            status: 'active',
            lastMessageAt: new Date()
          });
        }

        const message = await storage.createMessage({
          senderId: parseInt(senderId),
          receiverId: volunteerId,
          subject: subject || `Update: ${project.name}`,
          content,
          messageType,
          threadId: thread.id,
          projectId
        });

        await storage.updateConversationThread(thread.id, { lastMessageAt: new Date() });

        await storage.createNotification({
          userId: volunteerId,
          type: 'project_update',
          title: `Project Update: ${project.name}`,
          message: `${senderName} sent a message about "${project.name}"`,
          relatedEntityType: 'project',
          relatedEntityId: projectId,
          relatedUserId: parseInt(senderId),
          read: false
        });

        results.sent++;
        results.messages.push(message);
        broadcastUpdate("message_created", message);
      } catch (err) {
        console.error(`Failed to send project message to volunteer ${volunteerId}:`, err);
        results.failed++;
      }
    }

    res.status(201).json({
      success: true,
      project: project.name,
      volunteersContacted: results.sent,
      summary: `Sent ${results.sent} messages, ${results.failed} failed`,
      ...results
    });
  } catch (err) {
    console.error("Error sending project messages:", err);
    res.status(500).json({ message: "Failed to send project messages" });
  }
});

// POST /api/organization/:organizationId/message-applicants - Message all applicants for organization's opportunities
messagesRouter.post("/organization/:organizationId/message-applicants", async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    const { senderId, subject, content, opportunityId, status: filterStatus, messageType = 'outreach' } = req.body;

    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "organizationId must be a valid number" });
    }

    if (!senderId || !content) {
      return res.status(400).json({ message: "senderId and content are required" });
    }

    // Get opportunities for this organization
    let opportunities = await storage.listOpportunitiesByOrganization(organizationId);

    // Filter by specific opportunity if provided
    if (opportunityId) {
      opportunities = opportunities.filter(o => o.id === parseInt(opportunityId));
    }

    if (opportunities.length === 0) {
      return res.status(400).json({ message: "No opportunities found for this organization" });
    }

    // Get all applications for these opportunities
    const opportunityIds = opportunities.map(o => o.id);
    let applications = await storage.listApplicationsByOpportunityIds(opportunityIds);

    // Filter by status if provided
    if (filterStatus) {
      applications = applications.filter(app => app.status === filterStatus);
    }

    if (applications.length === 0) {
      return res.status(400).json({ message: "No applications found matching criteria" });
    }

    // Get unique volunteer IDs
    const volunteerIdSet = new Set<number>();
    applications.forEach(app => {
      if (app.volunteerId) volunteerIdSet.add(app.volunteerId);
    });
    const volunteerIds = Array.from(volunteerIdSet);

    // Verify sender
    const sender = await storage.getUser(parseInt(senderId));
    if (!sender || sender.organizationId !== organizationId) {
      return res.status(403).json({ message: "Sender is not authorized for this organization" });
    }

    const organization = await storage.getOrganization(organizationId);
    const senderName = sender.displayName || sender.username || organization?.name || 'Organization';

    const results = { sent: 0, failed: 0, messages: [] as any[] };

    for (const volunteerId of volunteerIds) {
      try {
        let thread = await storage.getConversationThreadBetween(
          organizationId,
          volunteerId,
          subject || 'Opportunity Update'
        );

        if (!thread) {
          thread = await storage.createConversationThread({
            organizationId,
            volunteerId,
            topic: subject || 'Opportunity Update',
            status: 'active',
            lastMessageAt: new Date()
          });
        }

        const message = await storage.createMessage({
          senderId: parseInt(senderId),
          receiverId: volunteerId,
          subject,
          content,
          messageType,
          threadId: thread.id
        });

        await storage.updateConversationThread(thread.id, { lastMessageAt: new Date() });

        await storage.createNotification({
          userId: volunteerId,
          type: 'new_message',
          title: 'Message from Organization',
          message: `${senderName} sent you a message${subject ? `: "${subject}"` : ''}`,
          relatedEntityType: 'thread',
          relatedEntityId: thread.id,
          relatedUserId: parseInt(senderId),
          read: false
        });

        results.sent++;
        results.messages.push(message);
        broadcastUpdate("message_created", message);
      } catch (err) {
        console.error(`Failed to send message to applicant ${volunteerId}:`, err);
        results.failed++;
      }
    }

    res.status(201).json({
      success: true,
      applicantsContacted: results.sent,
      summary: `Sent ${results.sent} messages, ${results.failed} failed`,
      ...results
    });
  } catch (err) {
    console.error("Error sending applicant messages:", err);
    res.status(500).json({ message: "Failed to send messages to applicants" });
  }
});
