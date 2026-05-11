/**
 * Boundary statements
 *
 * Canonical, legally-reviewed disclaimers describing what Synerxus is and is
 * not. These strings are the single source of truth — do not paraphrase them
 * inline in other files. Import from here instead.
 *
 * Any change to these strings must be reviewed alongside marketing and any
 * applicable legal counsel before merging.
 */

/**
 * The standard Synerxus boundary statement. Use this verbatim in:
 *   - Generated CSR / ESG reports (footer or methodology section)
 *   - Marketing pages that describe assurance scope
 *   - In-product disclosures shown next to partner-confirmed evidence records
 */
export const SYNERXUS_BOUNDARY_STATEMENT =
  "Synerxus provides structured evidence records for reporting, internal review, and assurance preparation. " +
  "Synerxus does not provide formal assurance opinions, guarantee regulatory compliance, certify SDG impact, independently verify all partner-reported reach figures, or establish causal attribution.";

/**
 * Short, single-sentence variant for tight UI surfaces (badges, tooltips,
 * mobile footers). Conveys the same scope without the full enumeration.
 */
export const SYNERXUS_BOUNDARY_STATEMENT_SHORT =
  "Synerxus supports reporting, internal review, and assurance preparation; it does not provide formal assurance opinions or guarantee regulatory compliance.";

/**
 * ISAE 3000 footnote — used wherever a report references ISAE 3000 directly.
 */
export const ISAE_3000_BOUNDARY_FOOTNOTE =
  "Independent auditor procedures per ISAE 3000 required for formal assurance. " +
  "Synerxus supports evidence preparation — it does not replace auditor judgment or opinion.";

/**
 * CSRD footnote — used wherever a report references CSRD or ESRS alignment.
 */
export const CSRD_BOUNDARY_FOOTNOTE =
  "Framework alignment supports disclosure preparation. " +
  "It does not constitute CSRD compliance determination or formal assurance opinion.";
