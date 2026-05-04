import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");
const REPORT_TEMPLATE_PATH = resolve(
  ROOT,
  "server",
  "routes",
  "logs.router.ts",
);

describe("report terminology centralization", () => {
  const source = readFileSync(REPORT_TEMPLATE_PATH, "utf8");

  it("uses shared confidence-tier labels in backend report templates", () => {
    expect(source).toContain("CONFIDENCE_TIER_LABELS[CONFIDENCE_TIER.VERIFIED]");
    expect(source).toContain(
      "CONFIDENCE_TIER_LABELS[CONFIDENCE_TIER.PARTNER_REPORTED]",
    );
    expect(source).toContain(
      "CONFIDENCE_TIER_LABELS[CONFIDENCE_TIER.DERIVED_MAPPED]",
    );
  });

  it("uses shared report section labels for evidence confidence sections", () => {
    expect(source).toContain(
      "REPORT_SECTION_LABELS[REPORT_SECTION.EVIDENCE_CONFIDENCE_TIERS]",
    );
  });
});
