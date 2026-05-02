import { describe, it, expect } from "vitest";
import { CONFIDENCE_TIER } from "@shared/constants";
import {
  isFullyVerified,
  classifyConfidenceTier,
} from "@shared/validation";

const base = {
  verificationStatus: "approved" as string | null,
  verifiedAt: new Date("2026-02-01T00:00:00Z") as Date | null,
  verifiedBy: 7 as number | null,
  date: new Date("2026-01-31T00:00:00Z") as Date | null,
};

describe("incomplete records cannot be labeled Verified", () => {
  it("missing verifiedAt fails the strict gate", () => {
    const r = { ...base, verifiedAt: null };
    expect(isFullyVerified(r)).toBe(false);
    expect(classifyConfidenceTier(r)).not.toBe(CONFIDENCE_TIER.VERIFIED);
  });

  it("missing verifiedBy fails the strict gate", () => {
    const r = { ...base, verifiedBy: null };
    expect(isFullyVerified(r)).toBe(false);
    expect(classifyConfidenceTier(r)).not.toBe(CONFIDENCE_TIER.VERIFIED);
  });

  it("missing date fails the strict gate", () => {
    const r = { ...base, date: null };
    expect(isFullyVerified(r)).toBe(false);
    expect(classifyConfidenceTier(r)).not.toBe(CONFIDENCE_TIER.VERIFIED);
  });

  it("status 'pending' fails the strict gate even if all other fields present", () => {
    const r = { ...base, verificationStatus: "pending" };
    expect(isFullyVerified(r)).toBe(false);
    expect(classifyConfidenceTier(r)).not.toBe(CONFIDENCE_TIER.VERIFIED);
  });

  it("status 'incomplete' fails the strict gate", () => {
    const r = { ...base, verificationStatus: "incomplete" };
    expect(isFullyVerified(r)).toBe(false);
    expect(classifyConfidenceTier(r)).not.toBe(CONFIDENCE_TIER.VERIFIED);
  });

  it("status 'rejected' fails the strict gate", () => {
    const r = { ...base, verificationStatus: "rejected" };
    expect(isFullyVerified(r)).toBe(false);
    expect(classifyConfidenceTier(r)).not.toBe(CONFIDENCE_TIER.VERIFIED);
  });

  it("only the full strict combination passes", () => {
    expect(isFullyVerified(base)).toBe(true);
    expect(classifyConfidenceTier(base)).toBe(CONFIDENCE_TIER.VERIFIED);
  });
});
