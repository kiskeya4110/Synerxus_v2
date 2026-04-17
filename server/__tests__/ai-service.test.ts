import { describe, it, expect, vi } from "vitest";

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("openai", () => {
  function MockOpenAI() {
    return { chat: { completions: { create: mockCreate } } };
  }
  MockOpenAI.prototype = {};
  return { default: MockOpenAI };
});

import { aiService } from "../services/ai-service";

describe("AIService", () => {
  it("returns content from chat completion", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "Hello world" } }],
    });
    const result = await aiService.chat([{ role: "user", content: "Hi" }]);
    expect(result).toBe("Hello world");
  });

  it("returns empty string when choices is empty", async () => {
    mockCreate.mockResolvedValueOnce({ choices: [] });
    const result = await aiService.chat([{ role: "user", content: "Hi" }]);
    expect(result).toBe("");
  });

  it("passes temperature and maxTokens to OpenAI", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "ok" } }],
    });
    await aiService.chat([{ role: "user", content: "test" }], {
      temperature: 0.3,
      maxTokens: 100,
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.3, max_tokens: 100 })
    );
  });
});
