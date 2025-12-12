import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertMessageSchema } from "@shared/schema";
import { handleValidationError } from "./utils";
import { notifyNewMessage, notifyThreadMessage } from "../notification-service";
import { verifyFirebaseToken } from "../middleware/firebase-auth";
import { sanitizeUser } from "../utils/sanitize-response";

export const messagesRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/messages - Get all messages for a user
// Protected: Requires authentication and ownership verification
messagesRouter.get("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const userIdParam = req.query.userId as string;

    if (!userIdParam) {
      return res.status(400).json({ message: "userId query parameter is required" });
    }

    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

    // IDOR protection: Users can only access their own messages
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser || authenticatedUser.id !== userId) {
      return res.status(403).json({
        message: "Access denied. You can only view your own messages.",
        code: "FORBIDDEN"
      });
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
// Protected: Requires authentication and ownership verification
messagesRouter.get("/conversation/:userId", verifyFirebaseToken, async (req: Request, res: Response) => {
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

    // IDOR protection: Users can only view their own conversations
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser || authenticatedUser.id !== currentUserId) {
      return res.status(403).json({
        message: "Access denied. You can only view your own conversations.",
        code: "FORBIDDEN"
      });
    }

    const conversation = await storage.listConversation(currentUserId, otherUserId);
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch conversation" });
  }
});

// POST /api/messages - Create new message
// Protected: Requires authentication and sender verification
messagesRouter.post("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const messageData = insertMessageSchema.parse(req.body);

    // IDOR protection: Verify authenticated user is the sender
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser || authenticatedUser.id !== messageData.senderId) {
      return res.status(403).json({
        message: "Access denied. You can only send messages as yourself.",
        code: "FORBIDDEN"
      });
    }

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
// Protected: Requires authentication and recipient verification
messagesRouter.patch("/:id/read", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.id);
    const message = await storage.getMessage(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // IDOR protection: Only the recipient can mark a message as read
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser || authenticatedUser.id !== message.receiverId) {
      return res.status(403).json({
        message: "Access denied. You can only mark your own received messages as read.",
        code: "FORBIDDEN"
      });
    }

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

// GET /api/conversation-threads/organization/:organizationId - Get threads for organization
// Protected: Requires authentication and organization ownership verification
messagesRouter.get("/conversation-threads/organization/:organizationId", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "organizationId must be a valid number" });
    }

    // IDOR protection: Only organization members can view their threads
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser || authenticatedUser.organizationId !== organizationId) {
      return res.status(403).json({
        message: "Access denied. You can only view your organization's conversation threads.",
        code: "FORBIDDEN"
      });
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
// Protected: Requires authentication and ownership verification
messagesRouter.get("/conversation-threads/volunteer/:volunteerId", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const volunteerId = parseInt(req.params.volunteerId);
    if (isNaN(volunteerId)) {
      return res.status(400).json({ message: "volunteerId must be a valid number" });
    }

    // IDOR protection: Volunteers can only view their own threads
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser || authenticatedUser.id !== volunteerId) {
      return res.status(403).json({
        message: "Access denied. You can only view your own conversation threads.",
        code: "FORBIDDEN"
      });
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
// Protected: Requires authentication and thread membership verification
messagesRouter.get("/conversation-threads/:threadId/messages", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const threadId = parseInt(req.params.threadId);

    if (isNaN(threadId)) {
      return res.status(400).json({ message: "threadId must be a valid number" });
    }

    const thread = await storage.getConversationThread(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Use authenticated user instead of query param (IDOR protection)
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const isVolunteerInThread = thread.volunteerId === authenticatedUser.id;
    const isOrganizationMember = authenticatedUser.organizationId === thread.organizationId;

    if (!isVolunteerInThread && !isOrganizationMember) {
      return res.status(403).json({
        message: "Access denied. You are not authorized to view messages in this thread.",
        code: "FORBIDDEN"
      });
    }

    const messages = await storage.listMessagesByThread(threadId);

    const enrichedMessages = await Promise.all(messages.map(async (msg) => {
      const sender = await storage.getUser(msg.senderId);
      return {
        ...msg,
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
// Protected: Requires authentication and participant verification
messagesRouter.post("/conversation-threads", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { organizationId, volunteerId, topic, projectId, initialMessage } = req.body;

    if (!organizationId || !volunteerId || !topic) {
      return res.status(400).json({ message: "organizationId, volunteerId, and topic are required" });
    }

    // IDOR protection: User must be either the volunteer or belong to the organization
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const isVolunteer = authenticatedUser.id === parseInt(volunteerId);
    const isOrganizationMember = authenticatedUser.organizationId === parseInt(organizationId);

    if (!isVolunteer && !isOrganizationMember) {
      return res.status(403).json({
        message: "Access denied. You can only create threads you are a participant in.",
        code: "FORBIDDEN"
      });
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
      const orgUser = await storage.getUserByOrganizationId(parseInt(organizationId));

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
      } else if (orgUser) {
        // Organization is starting conversation (outreach)
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
      }
    }

    broadcastUpdate("thread_created", thread);
    res.status(201).json(thread);
  } catch (err) {
    res.status(500).json({ message: "Failed to create conversation thread" });
  }
});

// POST /api/conversation-threads/:threadId/messages - Send message in thread
// Protected: Requires authentication and thread membership verification
messagesRouter.post("/conversation-threads/:threadId/messages", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const threadId = parseInt(req.params.threadId);
    const { content, messageType = 'text' } = req.body;

    if (isNaN(threadId)) {
      return res.status(400).json({ message: "threadId must be a valid number" });
    }

    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }

    const thread = await storage.getConversationThread(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Use authenticated user instead of senderId from body (IDOR protection)
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const isVolunteerInThread = thread.volunteerId === authenticatedUser.id;
    const isOrganizationMember = authenticatedUser.organizationId === thread.organizationId;

    if (!isVolunteerInThread && !isOrganizationMember) {
      return res.status(403).json({
        message: "Access denied. You are not authorized to send messages in this thread.",
        code: "FORBIDDEN"
      });
    }

    // Use authenticated user's ID as senderId
    const senderId = authenticatedUser.id;

    const receiverId = senderId === thread.volunteerId
      ? (await storage.getUserByOrganizationId(thread.organizationId))?.id
      : thread.volunteerId;

    if (!receiverId) {
      return res.status(400).json({ message: "Could not determine message recipient" });
    }

    const message = await storage.createMessage({
      senderId,
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
        senderId,
        threadId,
        thread.topic
      );
    } catch (notifyErr) {
      console.error("Failed to create thread message notification:", notifyErr);
    }

    const sender = await storage.getUser(senderId);
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
// Protected: Requires authentication and thread membership verification
messagesRouter.patch("/conversation-threads/:threadId", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const threadId = parseInt(req.params.threadId);
    const { status } = req.body;

    if (isNaN(threadId)) {
      return res.status(400).json({ message: "threadId must be a valid number" });
    }

    const thread = await storage.getConversationThread(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // IDOR protection: Only thread participants can update it
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const isVolunteerInThread = thread.volunteerId === authenticatedUser.id;
    const isOrganizationMember = authenticatedUser.organizationId === thread.organizationId;

    if (!isVolunteerInThread && !isOrganizationMember) {
      return res.status(403).json({
        message: "Access denied. You are not authorized to update this thread.",
        code: "FORBIDDEN"
      });
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
