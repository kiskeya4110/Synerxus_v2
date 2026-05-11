export const ASSURANCE_BOUNDARY =
  "Synerxus provides structured evidence records for reporting and assurance preparation. Synerxus does not provide formal assurance opinions, guarantee regulatory compliance, certify SDG impact, or establish causal attribution.";

export const evidenceObjectFields = [
  "Claim ID",
  "Claim title",
  "ESG category",
  "Claimed outcome",
  "Project or initiative",
  "Location",
  "Reporting period",
  "Evidence owner",
  "Source evidence",
  "Partner reviewer",
  "Reviewer organization",
  "Confirmation status",
  "Confirmation date",
  "Chain-of-custody history",
  "Version history",
  "Negative impact screening status",
  "Framework mappings",
  "SDG alignment",
  "Risk notes",
  "Disclosure-readiness status",
  "Evidence Ladder level",
];

export const sampleEvidenceObject = {
  claim: "240 residents completed solar workforce training.",
  category: "Social impact / workforce development",
  project: "Community Solar Workforce Training Program",
  location: "Sacramento County, California",
  evidence:
    "Attendance logs, completion certificates, partner report, site photos",
  confirmedBy: "Local workforce development partner",
  framework: "GRI social impact indicators, SDG 7, SDG 8",
  screening: "No unresolved partner concerns flagged",
  ladder: "Level 4 - Framework-Mapped",
  disclosure: "Review-ready",
};

export const evidenceLadderLevels = [
  {
    level: "Level 0",
    title: "Unsupported Claim",
    meaning: "A claim exists, but no supporting evidence has been attached.",
    risk: "Critical",
    action: "Do not publish. Attach source documentation.",
  },
  {
    level: "Level 1",
    title: "Internal Assertion",
    meaning:
      "The claim is documented internally but depends primarily on internal narrative or self-reported data.",
    risk: "High",
    action:
      "Add source files, records, methodology notes, or operational data.",
  },
  {
    level: "Level 2",
    title: "Source Evidence Attached",
    meaning:
      "The claim includes supporting documents, photos, reports, certificates, data exports, or project records.",
    risk: "Moderate",
    action: "Invite external partner confirmation.",
  },
  {
    level: "Level 3",
    title: "Partner-Confirmed",
    meaning:
      "A trusted NGO, supplier, implementation partner, or reviewer confirms that the evidence supports the claim.",
    risk: "Lower",
    action:
      "Map the claim to relevant frameworks and reporting categories.",
  },
  {
    level: "Level 4",
    title: "Framework-Mapped",
    meaning:
      "The partner-confirmed claim has been mapped to relevant ESG frameworks, SDGs, disclosure categories, or stakeholder reporting needs. Level 4 shows reporting alignment support; it is not final disclosure readiness.",
    risk: "Low",
    action:
      "Complete chain-of-custody review, negative impact screening, version review, and disclosure-readiness approval before using externally.",
  },
  {
    level: "Level 5",
    title: "Review-Ready Evidence Packet",
    meaning:
      "The claim includes source evidence, partner confirmation, chain-of-custody history, negative impact screening, framework mapping, version history, and disclosure-readiness status.",
    risk: "Lowest",
    action:
      "Use in ESG reports, investor updates, board materials, stakeholder disclosures, or assurance preparation.",
  },
];

export const frameworks = [
  "CSRD / ESRS",
  "GRI",
  "SASB / ISSB",
  "TCFD",
  "Selected stakeholder reporting frameworks",
  "UN Sustainable Development Goals",
  "CDP support workflows",
  "Supplier and Scope 3 evidence workflows",
  "Custom ESG scorecards",
  "Internal materiality categories",
];

export const primaryUseCases = [
  {
    title: "Corporate ESG Reporting",
    body: "Turn annual ESG statements into traceable Evidence Objects with source files, confirmations, and framework mappings.",
  },
  {
    title: "Greenwashing Risk Reduction",
    body: "Identify weak or unsupported claims before they appear in reports, websites, investor materials, or marketing language.",
  },
  {
    title: "Supplier and Value Chain Evidence",
    body: "Collect and confirm ESG evidence from suppliers, contractors, vendors, and distributed field operations.",
  },
  {
    title: "NGO and Partner Confirmation",
    body: "Give trusted external partners a structured way to confirm the outcomes they helped deliver.",
  },
  {
    title: "Infrastructure and Community Benefit",
    body: "Track workforce, resilience, environmental, social, and community-benefit outcomes across infrastructure-related projects.",
  },
  {
    title: "Investor and Board Reporting",
    body: "Provide leadership with evidence-backed summaries instead of unsupported ESG narratives.",
  },
];

export const insights = [
  {
    title: "What is an ESG Evidence Object?",
    body: "A practical introduction to structured claim records, source evidence, partner confirmations, and chain-of-custody history.",
  },
  {
    title: "The Evidence Ladder: A maturity model for claim defensibility",
    body: "How to evaluate whether ESG claims are unsupported, internally asserted, partner-confirmed, or disclosure-ready.",
  },
  {
    title: "Why partner confirmation matters in ESG reporting",
    body: "How NGOs, suppliers, and implementation partners can strengthen the credibility of corporate sustainability claims.",
  },
  {
    title: "From greenwashing risk to claim defensibility",
    body: "Why organizations need to review the evidence behind sustainability statements before publishing them.",
  },
];

export const dedicatedInsights = [
  ...insights.slice(0, 2),
  {
    title: "Why ESG reporting is shifting from disclosure to evidence",
    body: "Why teams need defensible records behind the language used in external reports.",
  },
  {
    title: "How partner confirmation reduces greenwashing risk",
    body: "How focused external review can improve claim confidence before publication.",
  },
  {
    title: "What review-ready ESG evidence actually means",
    body: "A practical view of source files, confirmations, custody history, and disclosure status.",
  },
  {
    title: "How NGOs can strengthen corporate ESG claims",
    body: "Why implementation partners are central to credible evidence workflows.",
  },
  {
    title: "Why every sustainability claim needs a source record",
    body: "How traceable source records reduce ambiguity in reporting and review.",
  },
  {
    title: "Chain of custody in ESG reporting: why it matters",
    body: "Why timestamps, reviewer actions, and version history are central to defensibility.",
  },
];
