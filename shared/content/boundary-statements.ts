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
 *   - In-product disclosures shown next to verified evidence records
 */
export const SYNERXUS_BOUNDARY_STATEMENT =
  "Synerxus provides structured, independently confirmed evidence that supports reporting and assurance preparation. " +
  "Synerxus does not replace independent assurance providers, provide formal assurance opinions, guarantee regulatory compliance, or establish causal attribution.";

/**
 * Short, single-sentence variant for tight UI surfaces (badges, tooltips,
 * mobile footers). Conveys the same scope without the full enumeration.
 */
export const SYNERXUS_BOUNDARY_STATEMENT_SHORT =
  "Synerxus supports reporting and assurance preparation; it does not replace independent assurance providers or provide formal assurance opinions.";

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
