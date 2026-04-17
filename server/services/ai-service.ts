import OpenAI from "openai";
import { logger } from "../logger";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIService {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}

class OpenAIService implements AIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: options.model ?? "gpt-4o-mini",
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });
    return completion.choices[0]?.message?.content ?? "";
  }
}

// Singleton — one client, injected wherever needed
export const aiService: AIService = new OpenAIService();
