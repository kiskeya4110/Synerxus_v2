/**
 * Framework language
 *
 * Canonical descriptions of the ESG / sustainability reporting frameworks
 * Synerxus supports. Each entry includes the short name, the long name, the
 * one-line description shown in marketing material, and the boundary
 * disclosure that must appear wherever a report claims alignment with the
 * framework.
 *
 * All language is written to support disclosure preparation — it never
 * claims certification, compliance, or formal assurance.
 */

export interface FrameworkLanguage {
  /** Short identifier used in code (e.g. "CSRD"). */
  key: string;
  /** Acronym shown in UI (e.g. "CSRD"). */
  shortName: string;
  /** Full official name (e.g. "Corporate Sustainability Reporting Directive"). */
  longName: string;
  /** Plain-language one-liner suitable for marketing copy. */
  description: string;
  /**
   * Boundary disclosure that must appear wherever a report claims alignment
   * with this framework. Combines with the canonical boundary statement.
   */
  boundary: string;
}

export const FRAMEWORK_LANGUAGE: Readonly<Record<string, FrameworkLanguage>> = Object.freeze({
  CSRD: {
    key: "CSRD",
    shortName: "CSRD",
    longName: "Corporate Sustainability Reporting Directive",
    description:
      "EU directive requiring large companies to report on sustainability matters using the European Sustainability Reporting Standards (ESRS).",
    boundary:
      "Synerxus supports CSRD/ESRS disclosure preparation. CSRD compliance determination requires independent assurance providers.",
  },
  ESRS: {
    key: "ESRS",
    shortName: "ESRS",
    longName: "European Sustainability Reporting Standards",
    description:
      "The standards used to satisfy CSRD disclosure requirements. Synerxus evidence records map to relevant ESRS data points.",
    boundary:
      "Mapping to ESRS data points supports disclosure preparation. It does not constitute compliance determination.",
  },
  ISAE_3000: {
    key: "ISAE_3000",
    shortName: "ISAE 3000",
    longName: "International Standard on Assurance Engagements 3000",
    description:
      "The standard used by independent auditors when issuing assurance opinions over non-financial information.",
    boundary:
      "Synerxus structures evidence records for ISAE 3000 assurance preparation. Formal assurance opinions are issued by independent qualified providers.",
  },
  GRI: {
    key: "GRI",
    shortName: "GRI",
    longName: "Global Reporting Initiative Standards",
    description:
      "Widely adopted sustainability reporting standards. Synerxus evidence records align to relevant GRI disclosures where applicable.",
    boundary:
      "GRI alignment supports disclosure preparation. It does not constitute formal assurance.",
  },
  SASB: {
    key: "SASB",
    shortName: "SASB",
    longName: "Sustainability Accounting Standards Board Standards",
    description:
      "Industry-specific sustainability disclosure standards (now part of the IFRS Foundation).",
    boundary:
      "SASB alignment supports disclosure preparation. It does not constitute formal assurance.",
  },
  TCFD: {
    key: "TCFD",
    shortName: "TCFD",
    longName: "Task Force on Climate-related Financial Disclosures",
    description:
      "Recommendations for climate-related financial disclosures. Synerxus evidence supports the metrics and targets pillar where relevant.",
    boundary:
      "TCFD alignment supports disclosure preparation. It does not constitute formal assurance.",
  },
  WEF_SCM: {
    key: "WEF_SCM",
    shortName: "WEF SCM",
    longName: "World Economic Forum Stakeholder Capitalism Metrics",
    description:
      "A common set of stakeholder-capitalism metrics for cross-industry comparability.",
    boundary:
      "WEF SCM alignment supports disclosure preparation. It does not constitute a formal assurance opinion.",
  },
});

export type FrameworkKey = keyof typeof FRAMEWORK_LANGUAGE;
