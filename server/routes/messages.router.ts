import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertMessageSchema } from "@shared/schema";
import { handleValidationError } from "./utils";

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
    const messageData = insertMessageSchema.parse(req.body);
    const message = await storage.createMessage(messageData);

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
      const orgUser = await storage.getUserByOrganizationId(parseInt(organizationId));
      if (orgUser) {
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

    const receiverId = parseInt(senderId) === thread.volunteerId
      ? (await storage.getUserByOrganizationId(thread.organizationId))?.id
      : thread.volunteerId;

    if (!receiverId) {
      return res.status(400).json({ message: "Could not determine message recipient" });
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

    await storage.createNotification({
      userId: receiverId,
      type: 'message',
      title: 'New Message',
      message: `New message in "${thread.topic}"`,
      relatedEntityType: 'thread',
      relatedEntityId: threadId
    });

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
