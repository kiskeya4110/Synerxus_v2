import { conversations, communications } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db";

export interface IChatStorage {
  getConversation(id: number): Promise<typeof conversations.$inferSelect | undefined>;
  getAllConversations(): Promise<(typeof conversations.$inferSelect)[]>;
  createConversation(title: string): Promise<typeof conversations.$inferSelect>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<(typeof communications.$inferSelect)[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<typeof communications.$inferSelect>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  },

  async getAllConversations() {
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  },

  async createConversation(title: string) {
    const [conversation] = await db.insert(conversations).values({ title }).returning();
    return conversation;
  },

  async deleteConversation(id: number) {
    await db.delete(communications).where(eq(communications.threadId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    return db.select().from(communications).where(eq(communications.threadId, conversationId)).orderBy(communications.createdAt);
  },

  async createMessage(conversationId: number, role: string, content: string) {
    // In chat context, threadId maps to conversationId
    const [message] = await db.insert(communications).values({ 
      threadId: conversationId, 
      content,
      senderId: 1, // Default system user
      receiverId: 1,
      messageType: 'general'
    }).returning();
    return message;
  },
};

