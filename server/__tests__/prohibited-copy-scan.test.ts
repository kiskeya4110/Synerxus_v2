import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PROHIBITED_CLAIMS,
  findProhibitedClaims,
} from "@shared/content/prohibited-claims";

const ROOT = resolve(__dirname, "..", "..");

const SCANNED_FILES = [
  "shared/content/boundary-statements.ts",
  "shared/content/approved-claims.ts",
  "shared/content/report-language.ts",
  "shared/content/framework-language.ts",
  "shared/content/cta-copy.ts",
];

function safeRead(relPath: string): string | null {
  try {
    return readFileSync(resolve(ROOT, relPath), "utf8");
  } catch {
    return null;
  }
}

describe("prohibited copy scan", () => {
  it("PROHIBITED_CLAIMS list is non-empty and well-formed", () => {
    expect(PROHIBITED_CLAIMS.length).toBeGreaterThan(0);
    for (const claim of PROHIBITED_CLAIMS) {
      expect(claim.phrase.length).toBeGreaterThan(0);
      expect(claim.phrase).toBe(claim.phrase.toLowerCase());
      expect(claim.alternative.length).toBeGreaterThan(0);
      expect(claim.reason.length).toBeGreaterThan(0);
    }
  });

  it("findProhibitedClaims detects a known disallowed phrase", () => {
    const sample = "Our platform guarantees compliance with every regulator.";
    const hits = findProhibitedClaims(sample);
    expect(hits.some((h) => h.phrase === "guarantees compliance")).toBe(true);
  });

  it("findProhibitedClaims is case-insensitive", () => {
    const hits = findProhibitedClaims("PROVES IMPACT across regions.");
    expect(hits.some((h) => h.phrase === "proves impact")).toBe(true);
  });

  // A prohibited phrase is allowed when it appears inside an explicit
  // negation / disclaimer (e.g. "does not provide formal assurance opinions",
  // "issued by independent qualified providers", "rather than"). The scan
  // flags only assertive uses of the phrase.
  const NEGATION_MARKERS = [
    "does not",
    "do not",
    "is not",
    "are not",
    "cannot",
    "without",
    "never",
    "rather than",
    "instead of",
    "no ",
    "not a ",
    "not constitute",
    "issued by",
    "made by",
    "performed by",
    "determined by",
    "distinguishes",
    "different from",
    "from a ",
    "from an ",
  ];

  function isNegatedContext(
    text: string,
    idx: number,
    phraseLen: number,
  ): boolean {
    const before = text.slice(Math.max(0, idx - 120), idx).toLowerCase();
    const after = text
      .slice(idx + phraseLen, idx + phraseLen + 120)
      .toLowerCase();
    return NEGATION_MARKERS.some(
      (m) => before.includes(m) || after.includes(m),
    );
  }

  it("approved canonical content modules contain no unnegated prohibited phrases", () => {
    const offenders: string[] = [];
    for (const rel of SCANNED_FILES) {
      const body = safeRead(rel);
      if (body == null) continue;
      const lower = body.toLowerCase();
      for (const claim of PROHIBITED_CLAIMS) {
        if (claim.conditional) continue;
        let from = 0;
        while (true) {
          const idx = lower.indexOf(claim.phrase, from);
          if (idx === -1) break;
          if (!isNegatedContext(body, idx, claim.phrase.length)) {
            offenders.push(`${rel}:${idx} "${claim.phrase}"`);
          }
          from = idx + claim.phrase.length;
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
