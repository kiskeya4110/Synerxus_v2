import { suggestSDGsFromText } from "@shared/sdg-goals";
import { aiService } from "./ai-service";
import { cache } from "../cache";
import { logger } from "../logger";
import { storage } from "../storage";
import fs from "fs";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CONCURRENCY = 2;
const CACHE_PREFIX = "impact-text-verification:";

function getPersistPath(): string | null {
  if (process.env.NODE_ENV === "test") {
    return null;
  }
  if (process.env.NODE_ENV === "production") {
    return process.env.IMPACT_TEXT_VERIFICATION_PERSIST_PATH || "/tmp/impact-text-verification-results.json";
  }
  return null;
}

export type ImpactTextVerificationStatus = "queued" | "processing" | "complete" | "failed";

export interface ImpactTextVerificationResult {
  logId: number;
  status: ImpactTextVerificationStatus;
  version: string;
  generatedAt: string | null;
  confidence: number | null;
  recommendation: "approve" | "review" | "reject" | null;
  suggestedSdgs: number[];
  extractedNumbers: number[];
  reasons: string[];
  flags: string[];
  normalizedText: string | null;
  summary: string | null;
  source: "heuristic" | "heuristic+ai";
  error?: string | null;
}

interface QueueItem {
  logId: number;
  force: boolean;
}

interface AIRefinementOutput {
  confidence?: number;
  recommendation?: "approve" | "review" | "reject";
  reasons?: string[];
  flags?: string[];
  summary?: string;
  suggestedSdgs?: number[];
}

const ACTION_VERBS = [
  "trained",
  "supported",
  "delivered",
  "mentored",
  "taught",
  "planted",
  "distributed",
  "helped",
  "organized",
  "coordinated",
  "facilitated",
  "provided",
  "served",
  "repaired",
  "installed",
  "cleaned",
  "educated",
  "visited",
];

const BENEFICIARY_TERMS = [
  "student",
  "students",
  "patient",
  "patients",
  "family",
  "families",
  "farmer",
  "farmers",
  "teacher",
  "teachers",
  "community",
  "communities",
  "resident",
  "residents",
  "child",
  "children",
  "youth",
  "women",
  "people",
  "beneficiar",
];

const LOW_SIGNAL_TERMS = [
  "test",
  "testing",
  "demo",
  "sample",
  "n/a",
  "none",
  "asdf",
  "lorem",
  "placeholder",
];

function cacheKey(logId: number): string {
  return `${CACHE_PREFIX}${logId}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value: string | null | undefined): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function defaultResult(logId: number, status: ImpactTextVerificationStatus): ImpactTextVerificationResult {
  return {
    logId,
    status,
    version: "v1",
    generatedAt: null,
    confidence: null,
    recommendation: null,
    suggestedSdgs: [],
    extractedNumbers: [],
    reasons: [],
    flags: [],
    normalizedText: null,
    summary: null,
    source: "heuristic",
    error: null,
  };
}

function isAISecondPassEnabled(): boolean {
  return process.env.IMPACT_TEXT_VERIFICATION_AI_ENABLED === "true";
}

function hasAIProviderConfig(): boolean {
  return Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
}

function shouldRunAISecondPass(_confidence: number, flags: string[]): boolean {
  if (!isAISecondPassEnabled() || !hasAIProviderConfig()) {
    return false;
  }

  if (flags.includes("low_signal_text")) {
    return false;
  }

  return true;
}

async function refineWithAI(input: {
  sourceText: string;
  baseConfidence: number;
  baseRecommendation: "approve" | "review" | "reject";
  suggestedSdgs: number[];
  extractedNumbers: number[];
  reasons: string[];
  flags: string[];
  outcomeQuantity?: number | null;
  beneficiaryCount?: number | null;
}): Promise<AIRefinementOutput | null> {
  const prompt = [
    "You are reviewing a volunteer impact outcome text for verification support.",
    "Return only valid JSON.",
    'Schema: {"confidence":number,"recommendation":"approve|review|reject","reasons":string[],"flags":string[],"summary":string,"suggestedSdgs":number[]}',
    "Use conservative judgment. Do not approve weak or vague text.",
    `Outcome text: ${JSON.stringify(input.sourceText)}`,
    `Base confidence: ${input.baseConfidence}`,
    `Base recommendation: ${input.baseRecommendation}`,
    `Suggested SDGs: ${JSON.stringify(input.suggestedSdgs)}`,
    `Extracted numbers: ${JSON.stringify(input.extractedNumbers)}`,
    `Recorded outcome quantity: ${input.outcomeQuantity ?? null}`,
    `Recorded beneficiary count: ${input.beneficiaryCount ?? null}`,
    `Base reasons: ${JSON.stringify(input.reasons)}`,
    `Base flags: ${JSON.stringify(input.flags)}`,
  ].join("\n");

  try {
    const raw = await aiService.chat([
      {
        role: "system",
        content: "You are a strict verification assistant. Respond with JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ], {
      model: process.env.IMPACT_TEXT_VERIFICATION_AI_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      maxTokens: 300,
    });

    const parsed = JSON.parse(raw) as AIRefinementOutput;
    return parsed;
  } catch (error) {
    logger.warn("[ImpactTextVerification] AI refinement skipped after parse/provider failure:", error);
    return null;
  }
}

class ImpactTextVerificationService {
  private queue: QueueItem[] = [];
  private queuedLogIds = new Set<number>();
  private activeWorkers = 0;
  private persistPath = getPersistPath();
  private persistedResults = new Map<number, ImpactTextVerificationResult>();
  private persistTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadPersistedResults();
  }

  get(logId: number): ImpactTextVerificationResult | null {
    const cached = cache.get<ImpactTextVerificationResult>(cacheKey(logId));
    if (cached) {
      return cached;
    }

    const persisted = this.persistedResults.get(logId) || null;
    if (persisted) {
      cache.set(cacheKey(logId), persisted, CACHE_TTL_MS);
    }
    return persisted;
  }

  getOrQueue(logId: number): ImpactTextVerificationResult {
    const existing = this.get(logId);
    if (existing) {
      return existing;
    }

    this.enqueue(logId);
    return defaultResult(logId, "queued");
  }

  enqueue(logId: number, options: { force?: boolean } = {}): void {
    const force = options.force === true;
    if (!force) {
      const existing = this.get(logId);
      if (existing && (existing.status === "queued" || existing.status === "processing" || existing.status === "complete")) {
        return;
      }
    }

    if (this.queuedLogIds.has(logId)) {
      return;
    }

    this.queuedLogIds.add(logId);
    this.storeResult(defaultResult(logId, "queued"));
    this.queue.push({ logId, force });
    this.schedule();
  }

  private schedule(): void {
    while (this.activeWorkers < MAX_CONCURRENCY && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) return;
      this.activeWorkers++;
      void this.process(next).finally(() => {
        this.activeWorkers--;
        this.queuedLogIds.delete(next.logId);
        this.schedule();
      });
    }
  }

  private async process(item: QueueItem): Promise<void> {
    const { logId } = item;
    this.storeResult(defaultResult(logId, "processing"));

    try {
      const activity = await storage.getVolunteerActivity(logId);
      if (!activity) {
        this.storeResult({
          ...defaultResult(logId, "failed"),
          generatedAt: new Date().toISOString(),
          error: "Impact log not found",
        });
        return;
      }

      const project = activity.projectId ? await storage.getProject(activity.projectId) : null;
      const sourceText = normalizeText(activity.editedOutcomeText || activity.outcomeText || activity.description || activity.outcomes);

      if (!sourceText) {
        this.storeResult({
          ...defaultResult(logId, "complete"),
          generatedAt: new Date().toISOString(),
          confidence: 0.15,
          recommendation: "review",
          reasons: ["No impact text available to analyze."],
          flags: ["missing_text"],
          normalizedText: "",
          summary: "No outcome text was available for background verification.",
          suggestedSdgs: activity.editedSdgTags || activity.sdgTags || project?.sdgGoals || [],
          extractedNumbers: [],
        });
        return;
      }

      const numbers = Array.from(sourceText.matchAll(/\b\d+(?:\.\d+)?\b/g)).map((m) => Number(m[0]));
      const lowered = sourceText.toLowerCase();
      const suggestedSdgs = Array.from(new Set([
        ...suggestSDGsFromText(sourceText),
        ...(activity.editedSdgTags || []),
        ...(activity.sdgTags || []),
        ...(project?.sdgGoals || []),
      ]));

      const flags: string[] = [];
      const reasons: string[] = [];
      let confidence = 0.5;

      if (sourceText.length >= 25) {
        confidence += 0.1;
        reasons.push("Outcome text is sufficiently descriptive.");
      } else {
        confidence -= 0.18;
        flags.push("short_text");
        reasons.push("Outcome text is very short and may need manual review.");
      }

      if (ACTION_VERBS.some((verb) => lowered.includes(verb))) {
        confidence += 0.1;
        reasons.push("Outcome text contains concrete action verbs.");
      } else {
        confidence -= 0.08;
        flags.push("missing_action_verb");
        reasons.push("Outcome text lacks a concrete action verb.");
      }

      if (BENEFICIARY_TERMS.some((term) => lowered.includes(term))) {
        confidence += 0.08;
        reasons.push("Outcome text references beneficiaries or affected groups.");
      }

      if (numbers.length > 0) {
        confidence += 0.1;
        reasons.push("Outcome text includes measurable quantities.");
      } else if (activity.outcomeQuantity) {
        confidence -= 0.06;
        flags.push("quantity_not_mentioned");
        reasons.push("Recorded quantity is not reflected in the outcome text.");
      }

      if (activity.outcomeQuantity && numbers.length > 0 && !numbers.includes(activity.outcomeQuantity)) {
        confidence -= 0.08;
        flags.push("quantity_mismatch");
        reasons.push("Outcome quantity does not clearly match the numbers found in the text.");
      }

      if (LOW_SIGNAL_TERMS.some((term) => lowered.includes(term))) {
        confidence -= 0.35;
        flags.push("low_signal_text");
        reasons.push("Outcome text contains placeholder or test-like wording.");
      }

      if (sourceText.length > 600) {
        confidence -= 0.05;
        flags.push("very_long_text");
        reasons.push("Outcome text is unusually long and may need human review.");
      }

      if (suggestedSdgs.length > 0) {
        confidence += 0.05;
        reasons.push("Outcome text aligns with detectable SDG themes.");
      } else {
        flags.push("no_sdg_signal");
        reasons.push("No strong SDG signal was detected from the outcome text.");
      }

      if ((activity.beneficiaryCount || 0) > 0 && !BENEFICIARY_TERMS.some((term) => lowered.includes(term))) {
        flags.push("beneficiary_context_missing");
        confidence -= 0.05;
        reasons.push("Beneficiary count exists but beneficiary context is missing from the text.");
      }

      confidence = clamp(Number(confidence.toFixed(2)), 0.05, 0.99);

      let recommendation: ImpactTextVerificationResult["recommendation"] = "review";
      if (confidence >= 0.78 && !flags.includes("quantity_mismatch") && !flags.includes("low_signal_text")) {
        recommendation = "approve";
      } else if (confidence <= 0.32 || flags.includes("low_signal_text")) {
        recommendation = "reject";
      }

      const summaryParts = [
        recommendation === "approve"
          ? "Text quality is strong enough for streamlined NGO review."
          : recommendation === "reject"
            ? "Text is low-signal and likely needs correction before verification."
            : "Text contains useful impact detail but still needs human review.",
        numbers.length > 0 ? `Detected ${numbers.length} measurable value${numbers.length > 1 ? "s" : ""}.` : "No measurable values detected in text.",
        suggestedSdgs.length > 0 ? `Suggested SDGs: ${suggestedSdgs.join(", ")}.` : "No SDG suggestions detected.",
      ];

      let source: ImpactTextVerificationResult["source"] = "heuristic";

      if (shouldRunAISecondPass(confidence, flags)) {
        const aiRefinement = await refineWithAI({
          sourceText,
          baseConfidence: confidence,
          baseRecommendation: recommendation,
          suggestedSdgs,
          extractedNumbers: numbers,
          reasons,
          flags,
          outcomeQuantity: activity.outcomeQuantity,
          beneficiaryCount: activity.beneficiaryCount,
        });

        if (aiRefinement) {
          source = "heuristic+ai";
          if (typeof aiRefinement.confidence === "number") {
            confidence = clamp(Number(aiRefinement.confidence.toFixed(2)), 0.05, 0.99);
          }
          if (aiRefinement.recommendation) {
            recommendation = aiRefinement.recommendation;
          }
          if (Array.isArray(aiRefinement.reasons) && aiRefinement.reasons.length > 0) {
            reasons.push(...aiRefinement.reasons.slice(0, 3));
          }
          if (Array.isArray(aiRefinement.flags) && aiRefinement.flags.length > 0) {
            flags.push(...aiRefinement.flags.slice(0, 3));
          }
          if (Array.isArray(aiRefinement.suggestedSdgs) && aiRefinement.suggestedSdgs.length > 0) {
            for (const sdg of aiRefinement.suggestedSdgs) {
              if (typeof sdg === "number" && !suggestedSdgs.includes(sdg)) {
                suggestedSdgs.push(sdg);
              }
            }
          }
          if (typeof aiRefinement.summary === "string" && aiRefinement.summary.trim()) {
            summaryParts[0] = aiRefinement.summary.trim();
          }
        }
      }

      const result: ImpactTextVerificationResult = {
        logId,
        status: "complete",
        version: "v1",
        generatedAt: new Date().toISOString(),
        confidence,
        recommendation,
        suggestedSdgs,
        extractedNumbers: numbers,
        reasons,
        flags,
        normalizedText: sourceText,
        summary: summaryParts.join(" "),
        source,
        error: null,
      };

      this.storeResult(result);
    } catch (error) {
      logger.error("[ImpactTextVerification] Analysis failed:", error);
      this.storeResult({
        ...defaultResult(logId, "failed"),
        generatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown analysis error",
      });
    }
  }

  private storeResult(result: ImpactTextVerificationResult): void {
    cache.set(cacheKey(result.logId), result, CACHE_TTL_MS);
    this.persistedResults.set(result.logId, result);
    this.schedulePersist();
  }

  private loadPersistedResults(): void {
    if (!this.persistPath) {
      return;
    }

    try {
      if (!fs.existsSync(this.persistPath)) {
        return;
      }

      const raw = fs.readFileSync(this.persistPath, "utf8");
      if (!raw.trim()) {
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, ImpactTextVerificationResult>;
      for (const [logId, result] of Object.entries(parsed)) {
        const numericId = Number(logId);
        if (!Number.isNaN(numericId) && result) {
          this.persistedResults.set(numericId, result);
          cache.set(cacheKey(numericId), result, CACHE_TTL_MS);
        }
      }
    } catch (error) {
      logger.warn("[ImpactTextVerification] Failed to load persisted results:", error);
    }
  }

  private schedulePersist(): void {
    if (!this.persistPath) {
      return;
    }

    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }

    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persistToDisk();
    }, 250);
  }

  private persistToDisk(): void {
    if (!this.persistPath) {
      return;
    }

    try {
      const payload = Object.fromEntries(
        Array.from(this.persistedResults.entries()).map(([logId, result]) => [String(logId), result]),
      );
      fs.writeFileSync(this.persistPath, JSON.stringify(payload), "utf8");
    } catch (error) {
      logger.warn("[ImpactTextVerification] Failed to persist results:", error);
    }
  }
}

export const impactTextVerificationService = new ImpactTextVerificationService();
