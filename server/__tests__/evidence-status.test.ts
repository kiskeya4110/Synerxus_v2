import { describe, it, expect } from "vitest";
import {
  EVIDENCE_STATUS,
  EVIDENCE_STATUS_VALUES,
} from "@shared/constants";
import { isKnownEvidenceStatus } from "@shared/validation";

describe("evidence status validation", () => {
  it("exposes the four required canonical statuses", () => {
    expect(EVIDENCE_STATUS.PENDING).toBe("pending");
    expect(EVIDENCE_STATUS.VERIFIED).toBe("verified");
    expect(EVIDENCE_STATUS.REJECTED).toBe("rejected");
    expect(EVIDENCE_STATUS.INCOMPLETE).toBe("incomplete");
  });

  it("EVIDENCE_STATUS_VALUES contains exactly the four statuses", () => {
    expect(EVIDENCE_STATUS_VALUES.slice().sort()).toEqual(
      ["incomplete", "pending", "rejected", "verified"],
    );
  });

  it("isKnownEvidenceStatus accepts each canonical status", () => {
    for (const s of EVIDENCE_STATUS_VALUES) {
      expect(isKnownEvidenceStatus(s)).toBe(true);
    }
  });

  it("isKnownEvidenceStatus rejects unknown / malformed values", () => {
    for (const v of [
      "approved",
      "VERIFIED",
      "",
      " pending",
      null,
      undefined,
      0,
      {},
    ]) {
      expect(isKnownEvidenceStatus(v as unknown)).toBe(false);
    }
  });
});
