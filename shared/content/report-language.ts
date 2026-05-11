/**
 * Report language
 *
 * Canonical paragraphs used inside generated CSR / ESG reports. Imported by
 * server-side and client-side report generators so a single edit propagates
 * to every report template.
 */

import {
  SYNERXUS_BOUNDARY_STATEMENT,
  CSRD_BOUNDARY_FOOTNOTE,
  ISAE_3000_BOUNDARY_FOOTNOTE,
} from "./boundary-statements";
import { PRODUCT_LABELS } from "./approved-claims";

/**
 * Report classification line shown on every generated report. Distinguishes
 * Synerxus output from a formal assurance opinion under ISAE 3000.
 */
export const REPORT_CLASSIFICATION_LINE =
  `${PRODUCT_LABELS.VERIFIED_EVIDENCE_SUMMARY} — Management Reporting Sample. ` +
  "This report is not a formal assurance opinion under ISAE 3000.";

/**
 * Sample report banner text. Shown above demo reports rendered with
 * fictitious data so the reader cannot mistake them for live customer output.
 */
export const SAMPLE_REPORT_BANNER =
  "This is a sample report using fictitious data to demonstrate the Synerxus verification architecture. " +
  "All names, figures, and organisations are illustrative.";

/**
 * Closing evidence boundary block placed at the end of every generated report.
 * Combines the canonical boundary statement with the framework-specific
 * footnotes so each report stands on its own without external context.
 */
export const REPORT_CLOSING_BOUNDARY = [
  SYNERXUS_BOUNDARY_STATEMENT,
  CSRD_BOUNDARY_FOOTNOTE,
  ISAE_3000_BOUNDARY_FOOTNOTE,
].join("\n\n");

/**
 * Methodology paragraph shown in the front matter of every report. Explains
 * what each evidence category means in plain language using only approved
 * product labels.
 */
export const REPORT_METHODOLOGY_PARAGRAPH =
  `Volunteer time is recorded as an input. ` +
  `${PRODUCT_LABELS.PARTNER_CONFIRMED_OUTPUT} records carry partner attestation and a verification timestamp. ` +
  `${PRODUCT_LABELS.PARTNER_REPORTED_REACH} reflects beneficiary reach as reported by the partner organisation and is not independently verified unless explicitly noted. ` +
  `${PRODUCT_LABELS.DERIVED_MAPPED_ALIGNMENT} shows how partner-confirmed records map to reporting frameworks and is classification support, not compliance certification.`;

/**
 * Short caption shown next to verified records in the UI and in report tables.
 */
export const VERIFIED_RECORD_CAPTION =
  `${PRODUCT_LABELS.VERIFIED_EVIDENCE_RECORD} — partner-confirmed and timestamped.`;
