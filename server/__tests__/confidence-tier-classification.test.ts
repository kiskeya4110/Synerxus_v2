import { describe, it, expect } from "vitest";
import { CONFIDENCE_TIER } from "@shared/constants";
import {
  classifyConfidenceTier,
  isFullyVerified,
} from "@shared/validation";

const fullRecord = {
  verificationStatus: "approved",
  verifiedAt: new Date("2026-01-15T10:00:00Z"),
  verifiedBy: 42,
  date: new Date("2026-01-14T09:00:00Z"),
};

describe("report confidence tier classification", () => {
  it("classifies a fully-gated approved record as Verified", () => {
    expect(classifyConfidenceTier(fullRecord)).toBe(CONFIDENCE_TIER.VERIFIED);
    expect(isFullyVerified(fullRecord)).toBe(true);
  });

  it("classifies an approved record missing verifiedAt as Partner-Reported", () => {
    expect(
      classifyConfidenceTier({ ...fullRecord, verifiedAt: null }),
    ).toBe(CONFIDENCE_TIER.PARTNER_REPORTED);
  });

  it("classifies an approved record missing verifiedBy as Partner-Reported", () => {
    expect(
      classifyConfidenceTier({ ...fullRecord, verifiedBy: null }),
    ).toBe(CONFIDENCE_TIER.PARTNER_REPORTED);
  });

  it("classifies an approved record missing date as Partner-Reported", () => {
    expect(
      classifyConfidenceTier({ ...fullRecord, date: null }),
    ).toBe(CONFIDENCE_TIER.PARTNER_REPORTED);
  });

  it("classifies pending / non-approved records as Derived / Mapped", () => {
    for (const status of ["pending", "rejected", "incomplete", null, undefined]) {
      expect(
        classifyConfidenceTier({ ...fullRecord, verificationStatus: status as any }),
      ).toBe(CONFIDENCE_TIER.DERIVED_MAPPED);
    }
  });

  it("never returns an unknown tier", () => {
    const known = new Set<string>(Object.values(CONFIDENCE_TIER));
    const samples = [
      fullRecord,
      { ...fullRecord, verifiedAt: null },
      { ...fullRecord, verificationStatus: "pending" },
      {},
    ];
    for (const r of samples) {
      expect(known.has(classifyConfidenceTier(r as any))).toBe(true);
    }
  });
});
