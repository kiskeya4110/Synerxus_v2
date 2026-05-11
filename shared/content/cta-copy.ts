/**
 * Call-to-action copy
 *
 * Canonical button labels, headlines, and short marketing strings. Centralised
 * so messaging can be A/B tested or localised in one place.
 */

import { SYNERXUS_POSITIONING } from "./approved-claims";

/** Primary marketing headline. Mirrors the approved positioning sentence. */
export const HERO_HEADLINE = SYNERXUS_POSITIONING;

/** Sub-headline shown beneath the hero on the landing page. */
export const HERO_SUBHEADLINE =
  "Capture volunteer time and partner-delivered outputs, confirm them with the partner, and produce structured evidence records for ESG / CSR reporting preparation.";

/** Primary CTA buttons used across marketing surfaces. */
export const CTA_BUTTONS = {
  REQUEST_DEMO: "Request a demo",
  START_FREE: "Start free",
  SEE_SAMPLE_REPORT: "See a sample report",
  TALK_TO_SALES: "Talk to sales",
  VIEW_PRICING: "View pricing",
  EXPORT_REPORT: "Export evidence summary",
  ADD_PROJECT: "Add a project",
  INVITE_PARTNER: "Invite a partner organisation",
  CONFIRM_OUTPUT: "Confirm partner-delivered output",
} as const;

export type CtaButton = (typeof CTA_BUTTONS)[keyof typeof CTA_BUTTONS];

/** Section headlines used on the marketing site. */
export const SECTION_HEADLINES = {
  HOW_IT_WORKS: "How Synerxus works",
  WHAT_YOU_GET: "What you get",
  FOR_CORPORATES: "For corporate ESG / CSR teams",
  FOR_NGOS: "For NGO and partner organisations",
  FOR_VOLUNTEERS: "For volunteers",
  FRAMEWORKS_SUPPORTED: "Reporting frameworks supported",
  EVIDENCE_BOUNDARY: "What Synerxus is and is not",
} as const;

/** In-product empty-state messages. */
export const EMPTY_STATE_COPY = {
  NO_VERIFIED_EVIDENCE:
    "No partner-confirmed evidence records yet. Confirm a partner-delivered output to add the first record.",
  NO_PROJECTS:
    "No projects yet. Add a project to start capturing volunteer time and partner-delivered outputs.",
  NO_PARTNERS:
    "No partner organisations yet. Invite a partner so they can confirm delivered outputs.",
} as const;
