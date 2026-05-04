import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PUBLIC_REPORT_REDACTED_TOPICS,
  PUBLIC_REPORT_REDACTION_NOTE,
} from "../domains/reporting/report-redaction-policy";

const ROOT = resolve(__dirname, "..", "..");

const REPORT_TEMPLATE_PATH = resolve(
  ROOT,
  "server",
  "routes",
  "logs.router.ts",
);

describe("public report redaction rules", () => {
  const source = readFileSync(REPORT_TEMPLATE_PATH, "utf8");

  it("includes the canonical Redaction Note label", () => {
    const matches = source.match(/Redaction Note:/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("routes render the centralized redaction policy note", () => {
    expect(source).toContain("PUBLIC_REPORT_REDACTION_NOTE");
  });

  it("centralized redaction policy enumerates every required redacted topic", () => {
    const lower = PUBLIC_REPORT_REDACTION_NOTE.toLowerCase();
    const missing = PUBLIC_REPORT_REDACTED_TOPICS.filter(
      (topic) => !lower.includes(topic.toLowerCase()),
    );
    expect(missing).toEqual([]);
  });

  it("does not surface raw verifier internal-id labels in report HTML strings", () => {
    const reportHtmlRegions = source.match(/`<[^`]*Verified[^`]*`/g) ?? [];
    for (const region of reportHtmlRegions) {
      expect(region.toLowerCase()).not.toMatch(/verifier[_-]?id\s*[:=]/);
      expect(region.toLowerCase()).not.toMatch(/\bfraud[_-]?score\b/);
      expect(region.toLowerCase()).not.toMatch(/\bdevice[_-]?id\b/);
    }
  });

  it("uses the strict-verification predicate to gate the Verified tier", () => {
    expect(source).toMatch(
      /import\s+\{\s*isFullyVerified\s*\}\s+from\s+["']@shared\/validation["']/,
    );
    expect(source).not.toMatch(/const\s+isFullyVerified\s*=/);
  });
});
