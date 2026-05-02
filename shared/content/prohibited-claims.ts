/**
 * Prohibited claims
 *
 * Phrases that must NOT appear in user-facing copy, generated reports, or
 * marketing material. Each entry includes the disallowed phrase, the reason
 * it is disallowed, and the approved alternative wording to use instead.
 *
 * The list is exported in a machine-checkable form so a future lint rule or
 * pre-commit hook can scan source files for violations.
 */

export interface ProhibitedClaim {
  /** Lowercase substring to scan for (case-insensitive matching). */
  phrase: string;
  /** Why the phrase is disallowed. */
  reason: string;
  /** Approved replacement wording. */
  alternative: string;
  /**
   * If true, the phrase is conditionally allowed when the surrounding code
   * provides explicit technical documentation supporting the claim. The
   * linter should warn rather than fail in that case.
   */
  conditional?: boolean;
}

export const PROHIBITED_CLAIMS: readonly ProhibitedClaim[] = Object.freeze([
  {
    phrase: "guarantees compliance",
    reason:
      "Synerxus does not guarantee regulatory compliance. Compliance determinations are made by independent assurance providers and regulators.",
    alternative: "supports compliance preparation",
  },
  {
    phrase: "proves impact",
    reason:
      "Causal proof of impact requires controlled study designs Synerxus does not perform. Synerxus produces evidence of activity and partner-confirmed outputs.",
    alternative: "documents partner-confirmed outputs that support impact reporting",
  },
  {
    phrase: "certified csrd compliant",
    reason:
      "There is no certification body that certifies CSRD compliance via Synerxus. Compliance is determined by independent assurance providers.",
    alternative: "supports CSRD/ESRS disclosure preparation",
  },
  {
    phrase: "formal assurance opinion",
    reason:
      "Only independent qualified assurance providers issue formal assurance opinions (e.g. per ISAE 3000). Synerxus prepares evidence.",
    alternative: "supports formal assurance preparation by an independent provider",
  },
  {
    phrase: "causal proof",
    reason:
      "Causal proof requires controlled study designs Synerxus does not perform.",
    alternative: "evidence of contribution",
  },
  {
    phrase: "auditor-approved",
    reason:
      "Synerxus is not approved or endorsed by any specific auditor or audit body. Auditors evaluate evidence on a per-engagement basis.",
    alternative: "structured for auditor review",
  },
  {
    phrase: "fully compliant",
    reason:
      "Compliance is determined per regulation by independent assurance providers, not by Synerxus.",
    alternative: "supports compliance preparation",
  },
  {
    phrase: "only evidence infrastructure",
    reason:
      "Synerxus is not the only evidence infrastructure on the market. This claim is unsupported and competitively risky.",
    alternative: "purpose-built evidence infrastructure for ESG / CSR programs",
  },
  {
    phrase: "csrd compliant evidence",
    reason:
      "Evidence cannot be 'CSRD compliant' on its own. CSRD compliance is determined at the disclosure level by independent assurance providers.",
    alternative: "evidence that supports CSRD/ESRS disclosure preparation",
  },
  {
    phrase: "immutable audit trail",
    reason:
      "Only allowed when the implementation is technically documented as append-only with cryptographic integrity. Without that documentation the claim is misleading.",
    alternative:
      "tamper-evident audit trail (or, with documentation: append-only audit trail with hash-chained integrity)",
    conditional: true,
  },
  {
    phrase: "impact proof",
    reason:
      "Synerxus does not produce proof of impact. It produces independently confirmed evidence of activity and partner-delivered outputs.",
    alternative: "verified evidence of activity and partner-delivered outputs",
  },
]);

/**
 * Returns any prohibited claims found in the supplied text. Case-insensitive
 * substring match. Use in tests or a future lint script.
 */
export function findProhibitedClaims(text: string): ProhibitedClaim[] {
  const haystack = text.toLowerCase();
  return PROHIBITED_CLAIMS.filter((c) => haystack.includes(c.phrase));
}
