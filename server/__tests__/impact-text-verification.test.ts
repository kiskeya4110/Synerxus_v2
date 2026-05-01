import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../storage", () => ({
  storage: {
    getVolunteerActivity: vi.fn(),
    getProject: vi.fn(),
  },
}));

vi.mock("../services/ai-service", () => ({
  aiService: {
    chat: vi.fn(),
  },
}));

import { storage } from "../storage";
import { aiService } from "../services/ai-service";
import { impactTextVerificationService } from "../services/impact-text-verification";

describe("Impact Text Verification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.IMPACT_TEXT_VERIFICATION_AI_ENABLED;
  });

  it("scores rich impact text higher and recommends approval", async () => {
    vi.mocked(storage.getVolunteerActivity).mockResolvedValue({
      id: 101,
      projectId: 11,
      outcomeText: "Trained 24 students in digital literacy and helped 3 teachers deliver the workshop.",
      description: null,
      outcomes: "training",
      editedOutcomeText: null,
      editedSdgTags: null,
      sdgTags: [4],
      outcomeQuantity: 24,
      beneficiaryCount: 27,
    } as any);
    vi.mocked(storage.getProject).mockResolvedValue({
      id: 11,
      sdgGoals: [4, 8],
    } as any);

    impactTextVerificationService.enqueue(101, { force: true });
    await new Promise((resolve) => setTimeout(resolve, 20));

    const result = impactTextVerificationService.get(101);
    expect(result?.status).toBe("complete");
    expect(result?.confidence).toBeGreaterThan(0.75);
    expect(result?.recommendation).toBe("approve");
    expect(result?.extractedNumbers).toContain(24);
    expect(result?.suggestedSdgs).toContain(4);
  });

  it("flags placeholder text for review or rejection", async () => {
    vi.mocked(storage.getVolunteerActivity).mockResolvedValue({
      id: 202,
      projectId: 12,
      outcomeText: "test",
      description: null,
      outcomes: null,
      editedOutcomeText: null,
      editedSdgTags: null,
      sdgTags: null,
      outcomeQuantity: null,
      beneficiaryCount: null,
    } as any);
    vi.mocked(storage.getProject).mockResolvedValue({
      id: 12,
      sdgGoals: [],
    } as any);

    impactTextVerificationService.enqueue(202, { force: true });
    await new Promise((resolve) => setTimeout(resolve, 20));

    const result = impactTextVerificationService.get(202);
    expect(result?.status).toBe("complete");
    expect(result?.flags).toContain("low_signal_text");
    expect(result?.recommendation).toBe("reject");
  });

  it("can refine borderline cases with the optional AI second pass", async () => {
    process.env.IMPACT_TEXT_VERIFICATION_AI_ENABLED = "true";
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY = "test-key";

    vi.mocked(storage.getVolunteerActivity).mockResolvedValue({
      id: 303,
      projectId: 13,
      outcomeText: "Supported 18 families with food packs.",
      description: null,
      outcomes: "distribution",
      editedOutcomeText: null,
      editedSdgTags: null,
      sdgTags: [2],
      outcomeQuantity: 18,
      beneficiaryCount: 18,
    } as any);
    vi.mocked(storage.getProject).mockResolvedValue({
      id: 13,
      sdgGoals: [2],
    } as any);
    vi.mocked(aiService.chat).mockResolvedValue(JSON.stringify({
      confidence: 0.83,
      recommendation: "approve",
      reasons: ["AI found the outcome text specific and measurable."],
      flags: [],
      summary: "AI second pass found the text suitable for streamlined review.",
      suggestedSdgs: [2, 10],
    }));

    impactTextVerificationService.enqueue(303, { force: true });
    await new Promise((resolve) => setTimeout(resolve, 20));

    const result = impactTextVerificationService.get(303);
    expect(result?.status).toBe("complete");
    expect(result?.source).toBe("heuristic+ai");
    expect(result?.recommendation).toBe("approve");
    expect(result?.confidence).toBe(0.83);
    expect(result?.suggestedSdgs).toContain(10);
  });
});
