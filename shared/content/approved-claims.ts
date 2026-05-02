/**
 * Approved claims
 *
 * Marketing- and legal-reviewed positioning copy and product labels. Use these
 * verbatim wherever the corresponding concept appears in the UI or in
 * generated reports. Any new label or positioning string must be added here
 * before being used elsewhere.
 */

/**
 * Primary positioning sentence. Use on the landing hero, sales decks, and
 * report cover pages.
 */
export const SYNERXUS_POSITIONING =
  "Synerxus turns ESG activity — including volunteer time, partner-delivered outputs, and social value programs — into independently confirmed, audit-ready evidence.";

/**
 * Approved product labels. These are the canonical names for evidence and
 * reporting concepts shown in the UI. Use the constants — never hand-type
 * the strings — so a future rename is a single-file change.
 */
export const PRODUCT_LABELS = {
  VERIFIED_EVIDENCE_SUMMARY: "Verified Evidence Summary",
  EVIDENCE_ALIGNMENT: "Evidence Alignment",
  REPORTING_AND_ASSURANCE_SUPPORT: "Reporting and Assurance Support",
  PARTNER_CONFIRMED_OUTPUT: "Partner-Confirmed Output",
  PARTNER_REPORTED_REACH: "Partner-Reported Reach",
  DERIVED_MAPPED_ALIGNMENT: "Derived / Mapped Alignment",
  VERIFIED_EVIDENCE_RECORD: "Verified Evidence Record",
} as const;

export type ProductLabel = (typeof PRODUCT_LABELS)[keyof typeof PRODUCT_LABELS];

/**
 * Convenience array of every approved label, in declaration order. Used by
 * the prohibited-claims linter to know which labels are reserved vocabulary
 * and by storybook/docs to enumerate the canonical set.
 */
export const ALL_PRODUCT_LABELS: readonly ProductLabel[] = Object.freeze(
  Object.values(PRODUCT_LABELS),
);
