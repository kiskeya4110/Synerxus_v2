import {
  EVIDENCE_STATUS_VALUES,
  CONFIDENCE_TIER,
  type ConfidenceTier,
} from "../constants";

export function isFullyVerified(record: {
  verificationStatus?: string | null;
  verifiedAt?: Date | string | null;
  verifiedBy?: number | string | null;
  date?: Date | string | null;
}): boolean {
  return (
    record.verificationStatus === 'approved' &&
    !!record.verifiedAt &&
    !!record.verifiedBy &&
    !!record.date
  );
}

export function classifyConfidenceTier(record: {
  verificationStatus?: string | null;
  verifiedAt?: Date | string | null;
  verifiedBy?: number | string | null;
  date?: Date | string | null;
}): ConfidenceTier {
  if (isFullyVerified(record)) return CONFIDENCE_TIER.VERIFIED;
  if (record.verificationStatus === 'approved') return CONFIDENCE_TIER.PARTNER_REPORTED;
  return CONFIDENCE_TIER.DERIVED_MAPPED;
}

export function isKnownEvidenceStatus(value: unknown): boolean {
  return typeof value === 'string' && (EVIDENCE_STATUS_VALUES as string[]).includes(value);
}
