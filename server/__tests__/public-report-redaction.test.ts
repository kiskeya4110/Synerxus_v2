import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");

const REPORT_TEMPLATE_PATH = resolve(
  ROOT,
  "server",
  "routes",
  "logs.router.ts",
);

const REQUIRED_REDACTED_TOPICS = [
  "device identifiers",
  "SMS routing",
  "telemetry",
  "fraud control",
  "proprietary verification mechanics",
];

describe("public report redaction rules", () => {
  const source = readFileSync(REPORT_TEMPLATE_PATH, "utf8");

  it("includes the canonical Redaction Note label", () => {
    const matches = source.match(/Redaction Note:/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("enumerates every required redacted topic in the note text", () => {
    const lower = source.toLowerCase();
    const missing = REQUIRED_REDACTED_TOPICS.filter(
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
    expect(source).toMatch(/isFullyVerified/);
    expect(source).toMatch(
      /verificationStatus\s*===\s*['"]approved['"][\s\S]{0,80}verifiedAt[\s\S]{0,80}verifiedBy/,
    );
  });
});
