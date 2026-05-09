import { isFullyVerified } from "@shared/validation";
import { escapeReportHtml as escapeHtml } from "./report-html-escape";

const BOUNDARY_STATEMENT =
  "Synerxus provides structured evidence records for reporting and assurance preparation. Synerxus does not provide formal assurance opinions, guarantee regulatory compliance, or establish causal attribution.";

export type ReportStatus =
  | "Draft"
  | "Needs Data"
  | "Needs Review"
  | "Ready for Review"
  | "Exported"
  | "Archived";

export interface VerifiedEvidenceSummaryInput {
  organizationName: string;
  reportId: string;
  /** Human-readable period label, e.g. "All Time" or "Jan 1, 2026 – May 7, 2026" */
  periodDisplay: string;
  generatedDate: string;
  /** Actual data cutoff date (end of report period or latest record date) */
  dataCutoffDate?: string;
  scopeSummary: string;
  reportStatus?: ReportStatus;
  activities: any[];
  projects?: any[];
  partnerNames?: string[];
  countriesOrRegions?: string[];
  /** Frameworks selected during report generation or configured on the org */
  frameworksIncluded?: string[];
  /** SDGs from evidence records (derived, not hardcoded) */
  sdgsIncluded?: number[];
  /** Evidence sources from org config (not hardcoded) */
  evidenceSources?: string[];
  /** Number of distinct communities served (from partner-reported data) */
  communitiesServed?: number;
  logoDataUri?: string;
}

// ─── SDG metadata ────────────────────────────────────────────────────────────

const SDG_COLORS: Record<number, string> = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
  6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
  11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
  16: "#00689D", 17: "#19486A",
};

const SDG_NAMES: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health and Well-being",
  4: "Quality Education", 5: "Gender Equality", 6: "Clean Water and Sanitation",
  7: "Affordable and Clean Energy", 8: "Decent Work and Economic Growth",
  9: "Industry, Innovation and Infrastructure", 10: "Reduced Inequalities",
  11: "Sustainable Cities and Communities",
  12: "Responsible Consumption and Production", 13: "Climate Action",
  14: "Life Below Water", 15: "Life on Land",
  16: "Peace, Justice and Strong Institutions", 17: "Partnerships for the Goals",
};

const SDG_DESCRIPTIONS: Record<number, string> = {
  1: "End poverty in all its forms everywhere.",
  2: "End hunger, achieve food security and improved nutrition.",
  3: "Ensure healthy lives and promote well-being for all ages.",
  4: "Ensure inclusive and equitable quality education.",
  5: "Achieve gender equality and empower all women and girls.",
  6: "Ensure availability and sustainable management of water and sanitation for all.",
  7: "Ensure access to affordable, reliable, sustainable and modern energy.",
  8: "Promote sustained, inclusive and sustainable economic growth.",
  9: "Build resilient infrastructure and foster innovation.",
  10: "Reduce inequality within and among countries.",
  11: "Make cities inclusive, safe, resilient and sustainable.",
  12: "Ensure sustainable consumption and production patterns.",
  13: "Take urgent action to combat climate change and its impacts.",
  14: "Conserve and sustainably use the oceans, seas and marine resources.",
  15: "Protect, restore and promote sustainable use of terrestrial ecosystems.",
  16: "Promote peaceful and inclusive societies for sustainable development.",
  17: "Strengthen the means of implementation and revitalize the global partnership.",
};

/** Framework definitions for supported reporting frameworks */
const FRAMEWORK_DEFINITIONS: Record<
  string,
  { pill: string; pillClass: string; topic: string; support: string; limitation: string }
> = {
  "CSRD / ESRS": {
    pill: "CSRD / ESRS",
    pillClass: "fp-esrs",
    topic: "ESRS S3 – Affected Communities",
    support: "Evidence records support disclosures on community engagement, impacts, and outcomes.",
    limitation: "Does not determine double materiality or regulatory compliance.",
  },
  "ESRS S3": {
    pill: "ESRS S3",
    pillClass: "fp-esrs",
    topic: "Affected Communities — Impacts, Engagement, and Outcomes",
    support: "Evidence records can support disclosures on community engagement, impacts, and outcomes.",
    limitation: "Does not determine double materiality or compliance.",
  },
  "GRI 413": {
    pill: "GRI 413",
    pillClass: "fp-gri",
    topic: "Local Communities",
    support: "Evidence supports reporting on community engagement activities and impacts.",
    limitation: "Does not replace organization's disclosure judgment.",
  },
  "ISAE 3000": {
    pill: "ISAE 3000",
    pillClass: "fp-isae",
    topic: "Assurance Engagements Other Than Audits or Reviews",
    support: "Structured records can facilitate limited or reasonable assurance engagements.",
    limitation: "Not an assurance opinion or assurance report.",
  },
  "UN SDGs": {
    pill: "UN SDGs",
    pillClass: "fp-sdg",
    topic: "Sustainable Development Goals",
    support: "Evidence can be mapped to relevant SDG targets and indicators.",
    limitation: "Does not imply SDG impact contribution.",
  },
  "SASB": {
    pill: "SASB",
    pillClass: "fp-sasb",
    topic: "Social Capital — Communities",
    support: "Evidence supports metrics on communities, access, and social impact.",
    limitation: "Does not ensure comparability or compliance.",
  },
  "ISSB": {
    pill: "ISSB",
    pillClass: "fp-sasb",
    topic: "People and Communities",
    support: "Evidence supports IFRS S1/S2 disclosure preparation on social topics.",
    limitation: "Does not ensure comparability or compliance.",
  },
  "SASB / ISSB": {
    pill: "SASB / ISSB",
    pillClass: "fp-sasb",
    topic: "Social Capital (SASB) / People & Communities (ISSB)",
    support: "Evidence supports metrics on communities, access, and social impact.",
    limitation: "Does not ensure comparability or compliance.",
  },
  "TCFD": {
    pill: "TCFD",
    pillClass: "fp-esrs",
    topic: "Climate-Related Financial Disclosures",
    support: "Evidence supports narrative reporting on climate-related activities and community resilience.",
    limitation: "Does not address financial risk quantification or scenario analysis.",
  },
  "Internal ESG / CSR reporting": {
    pill: "Internal ESG",
    pillClass: "fp-sasb",
    topic: "Internal ESG / CSR Reporting",
    support: "Evidence records support internal tracking and management reporting.",
    limitation: "Internal use only; does not satisfy external assurance requirements.",
  },
};

// ─── Utility functions ───────────────────────────────────────────────────────

function number(value: number): string {
  return Math.round(value || 0).toLocaleString("en-US");
}

function dateLabel(value: unknown): string {
  if (!value) return "Not shown";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "Not shown";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function getOutputText(activity: any): string {
  return activity.editedOutcomeText || activity.outcomeText || activity.description || "Partner-confirmed output recorded";
}

function getReach(activity: any): number {
  return Number(activity.beneficiaryCount || activity.editedOutcomeQuantity || activity.outcomeQuantity || 0);
}

function getHours(activity: any): number {
  if (typeof activity.hours === 'number' && !isNaN(activity.hours)) return activity.hours;
  const parsed = parseFloat(activity.hours);
  return isNaN(parsed) ? 0 : parsed;
}

/** Resolve SDG tags for an activity, falling back to project sdgGoals */
function resolveActivitySdgs(activity: any, projectMap: Map<number, any>): number[] {
  if (Array.isArray(activity.sdgTags) && activity.sdgTags.length > 0) return activity.sdgTags;
  const proj = projectMap.get(activity.projectId);
  return Array.isArray(proj?.sdgGoals) ? proj.sdgGoals : [];
}

// ─── Rendering helpers ───────────────────────────────────────────────────────

function renderBrandLockup(logoDataUri?: string): string {
  if (logoDataUri) {
    return `<div class="brand-lockup">
      <img src="${logoDataUri}" alt="Synerxus" class="brand-logo" />
      <div class="brand-text">
        <div class="brand-wordmark"><span class="brand-syner">SYNER</span><span class="brand-xus">XUS</span></div>
        <div class="brand-tag">Impacts. <span>Verified.</span></div>
      </div>
    </div>`;
  }
  return `<div class="brand-lockup">
    <div class="brand-text">
      <div class="brand-wordmark"><span class="brand-syner">SYNER</span><span class="brand-xus">XUS</span></div>
      <div class="brand-tag">Impacts. <span>Verified.</span></div>
    </div>
  </div>`;
}

function renderCornerOrnament(): string {
  return `<svg class="corner-ornament" viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true">
    <polygon points="40,0 200,0 200,160" fill="#0A1F44" />
    <polygon points="120,0 200,0 200,80" fill="#D4980C" />
    <polygon points="135,0 200,0 200,65" fill="#0A1F44" />
  </svg>`;
}

function page(pageNumber: number, totalPages: number, body: string, logoDataUri?: string): string {
  return `<section class="report-page">
    <header class="page-header">
      ${renderBrandLockup(logoDataUri)}
      ${renderCornerOrnament()}
    </header>
    <main class="page-body">${body}</main>
    <footer class="page-footer">
      <span>CONFIDENTIAL &amp; PROPRIETARY &nbsp;|&nbsp; &copy; 2026 Synerxus. All rights reserved.</span>
      <span class="page-num">${pageNumber} of ${totalPages}</span>
    </footer>
  </section>`;
}

function badge(label: string, tone: "green" | "amber" | "red" | "navy" = "navy"): string {
  return `<span class="badge ${tone}">${escapeHtml(label)}</span>`;
}

function checkbox(label: string): string {
  return `<label class="check"><span class="check-box"></span>${escapeHtml(label)}</label>`;
}

const ICON = {
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>`,
  badgeId: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="2.4"/><path d="M9 16h6"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="3"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="8" r="2.4"/><path d="M15 14c2.5 0 5 1.5 5 4"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6z"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.7l-7.5 13a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13a2 2 0 0 0-3.4 0z"/><path d="M12 9v5M12 17v.5"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 8.5a4.5 4.5 0 0 0-8-2.8A4.5 4.5 0 0 0 4 8.5c0 5 8 10.5 8 10.5s8-5.5 8-10.5z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/></svg>`,
  award: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M9 14l-2 7 5-3 5 3-2-7"/></svg>`,
  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 7"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7L12.5 17"/></svg>`,
  database: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
};

// ─── Status bar rendering ────────────────────────────────────────────────────

function renderStatusBar(status: ReportStatus): string {
  const isReady = status === "Ready for Review" || status === "Exported";
  const isNeeds = status === "Needs Data" || status === "Needs Review";
  const borderColor = isReady ? "#86EFAC" : isNeeds ? "#FCD34D" : "#CBD5E1";
  const bgColor = isReady ? "#F0FDF4" : isNeeds ? "#FFFBEB" : "#F8FAFC";
  const iconBg = isReady ? "#D1FAE5" : isNeeds ? "#FEF9C3" : "#F1F5F9";
  const textColor = isReady ? "var(--green)" : isNeeds ? "var(--amber)" : "#64748B";
  const icon = isReady ? ICON.check : isNeeds ? ICON.alert : ICON.info;
  return `<div class="status-bar" style="border-color:${borderColor};background:${bgColor}">
    <span class="status-icon" style="background:${iconBg};color:${textColor}">${icon}</span>
    <div>
      <div class="status-label">Report Status</div>
      <div class="status-val" style="color:${textColor}">${escapeHtml(status)}</div>
    </div>
  </div>`;
}

// ─── Main builder ────────────────────────────────────────────────────────────

export function buildVerifiedEvidenceSummaryReport(input: VerifiedEvidenceSummaryInput): string {
  const activities = input.activities || [];
  const projectMap = new Map((input.projects || []).map((p) => [p.id, p]));

  // Canonical verified = approved status (matches dashboard verifiedCount)
  const verified = activities.filter(
    (a) => a.verificationStatus === "approved" || a.verificationStatus === "verified",
  );
  // Strict chain (has verifiedAt, verifiedBy, date) — used for quality scorecard
  const strictlyVerified = verified.filter(isFullyVerified);
  const partnerReported = verified.filter((a) => !isFullyVerified(a));
  const pending = activities.filter((a) => a.verificationStatus === "pending");
  const rejected = activities.filter((a) => a.verificationStatus === "rejected");
  const incomplete = activities.filter((a) => a.verificationStatus === "incomplete");
  // KPIs (use verified = approved, matching dashboard)
  const verifiedHours = verified.reduce((sum, a) => sum + getHours(a), 0);
  const partnerReportedReach = verified.reduce((sum, a) => sum + getReach(a), 0);

  // Verification rate: eligible = verified + pending + incomplete + rejected (no drafts)
  const eligible = verified.length + pending.length + incomplete.length + rejected.length;
  const verificationRate = eligible > 0 ? Math.round((verified.length / eligible) * 100) : 0;

  const verificationTimes = verified
    .filter((a) => a.verifiedAt && (a.submittedAt || a.createdAt))
    .map((a) => {
      const vMs = new Date(a.verifiedAt).getTime();
      const sMs = a.submittedAt
        ? new Date(a.submittedAt).getTime()
        : new Date(a.createdAt).getTime();
      return (vMs - sMs) / 3_600_000;
    })
    .filter((h) => Number.isFinite(h) && h >= 0);
  const avgVerificationTime =
    verificationTimes.length > 0
      ? `${Math.round(verificationTimes.reduce((s, h) => s + h, 0) / verificationTimes.length)}h`
      : "N/A";

  const filteredProjectIds = unique(activities.map((a) => a.projectId).filter(Boolean));
  const filteredProjectNames = unique(
    filteredProjectIds.map((id) => projectMap.get(id)?.name).filter(Boolean) as string[],
  );
  const projectsIncluded = filteredProjectIds.length;
  const volunteerCount = unique(verified.map((a) => a.userId)).length;
  const partnerNames = unique(
    input.partnerNames || verified.map((a) => a.verifierName || a.partnerName || "").filter(Boolean),
  );
  const organizationScopeValue = partnerNames.length > 0
    ? partnerNames.join(", ")
    : "No partner organizations in selected scope";
  const countries = unique(
    (input.countriesOrRegions || []).concat(
      verified.map((a) => a.region || a.location || a.geolocation).filter(Boolean),
    ),
  );
  const communitiesServed = input.communitiesServed ?? countries.length;

  // SDGs: derive from records, fall back to project sdgGoals
  const sdgsFromRecords: number[] = unique(
    verified.flatMap((a) => resolveActivitySdgs(a, projectMap)),
  ).sort((a, b) => a - b) as number[];
  const sdgsDisplay: number[] = input.sdgsIncluded && input.sdgsIncluded.length > 0
    ? input.sdgsIncluded
    : sdgsFromRecords;

  // Frameworks: use provided list, or empty (no hardcoded defaults)
  const frameworksDisplay: string[] = input.frameworksIncluded ?? [];

  // Evidence sources: use provided list, or derive label
  const evidenceSources: string[] =
    input.evidenceSources && input.evidenceSources.length > 0
      ? input.evidenceSources
      : ["Volunteer Activity Records", "Partner-Confirmed Outputs"];

  // Completeness checks for quality scorecard
  const completenessChecks: Array<[string, boolean, string]> = [];
  if (verified.length > 0) {
    const chk = (label: string, count: number): [string, boolean, string] => {
      const pct = Math.round((count / verified.length) * 100);
      return [label, count === verified.length, `${pct}%`];
    };
    completenessChecks.push(
      chk("Output Description Completeness", verified.filter((a) => getOutputText(a) !== "Partner-confirmed output recorded").length),
      chk("Partner Confirmation Completeness", verified.filter((a) => !!a.verifiedBy).length),
      chk("Verification Timestamp Completeness", verified.filter((a) => !!a.verifiedAt).length),
      chk("Activity Date Completeness", verified.filter((a) => !!a.date).length),
      chk("Source Attachment Availability", verified.filter((a) => (a.evidenceLinks || a.attachments || []).length > 0).length),
      chk("Location Context Availability", (verified.filter((a) => a.location || a.geolocation || a.region).length > 0 || countries.length > 0) ? verified.filter((a) => a.location || a.geolocation || a.region || countries.length > 0).length : 0),
      chk("Framework Mapping Availability", verified.filter((a) => resolveActivitySdgs(a, projectMap).length > 0).length),
    );
  }

  // Weighted quality score
  const weights: Record<string, number> = {
    "Output Description Completeness": 15,
    "Partner Confirmation Completeness": 20,
    "Verification Timestamp Completeness": 15,
    "Activity Date Completeness": 10,
    "Source Attachment Availability": 10,
    "Location Context Availability": 10,
    "Framework Mapping Availability": 10,
  };
  let rawQuality = 0;
  for (const [label, , pctStr] of completenessChecks) {
    const w = weights[label] ?? 0;
    const pctNum = parseInt(pctStr.replace("%", ""), 10);
    if (!isNaN(pctNum)) rawQuality += w * (pctNum / 100);
  }
  rawQuality += 5; // incomplete excluded
  rawQuality += 5; // metadata redacted
  const qualityScore = Math.min(100, Math.max(0, Math.round(rawQuality)));

  // Report status (calculated, not static)
  const resolvedStatus: ReportStatus = input.reportStatus ?? (
    verified.length === 0 ? "Needs Data" :
    qualityScore < 70 ? "Needs Review" :
    "Ready for Review"
  );

  // Pipeline status breakdown: percentages over ALL submitted activities
  const totalForBar = activities.length || 1;
  const verifiedPct = Math.round((verified.length / totalForBar) * 100);
  const pendingPct = Math.round((pending.length / totalForBar) * 100);
  const incompletePct = Math.round((incomplete.length / totalForBar) * 100);
  const rejectedPct = Math.round((rejected.length / totalForBar) * 100);

  // All verified records (not capped at 3)
  // Evidence records table + inline bar chart grouped by project/SDG
  const hoursBarChart = (() => {
    if (verified.length === 0) return "";
    // Aggregate hours by project
    const byProject: Record<string, number> = {};
    for (const a of verified) {
      const pName = projectMap.get(a.projectId)?.name || filteredProjectNames[0] || "Other";
      byProject[pName] = (byProject[pName] || 0) + getHours(a);
    }
    const entries = Object.entries(byProject).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (entries.length === 0) return "";
    const maxH = Math.max(...entries.map(([, h]) => h), 1);
    const barW = 320, barH = 14, gapY = 28, padL = 140, svgH = entries.length * gapY + 10;
    const bars = entries.map(([label, hrs], i) => {
      const w = Math.max(2, Math.round((hrs / maxH) * barW));
      const y = i * gapY;
      const short = label.length > 22 ? label.slice(0, 20) + "…" : label;
      return `<text x="${padL - 8}" y="${y + barH - 2}" text-anchor="end" font-size="9" fill="#475569" font-family="Inter,Arial,sans-serif">${escapeHtml(short)}</text>
<rect x="${padL}" y="${y}" width="${w}" height="${barH}" rx="3" fill="#0A1F44"/>
<text x="${padL + w + 5}" y="${y + barH - 2}" font-size="9" fill="#0A1F44" font-family="Inter,Arial,sans-serif" font-weight="600">${Math.round(hrs)}h</text>`;
    }).join("");
    return `<div style="margin-top:18px">
      <div class="section-title" style="font-size:12px;margin-bottom:8px">Verified Hours by Project</div>
      <svg viewBox="0 0 ${padL + barW + 60} ${svgH}" style="width:100%;max-width:520px;overflow:visible" role="img" aria-label="Verified hours by project bar chart">
        ${bars}
      </svg>
    </div>`;
  })();

  const EVIDENCE_TABLE_HEAD = `<thead><tr>
          <th>Record ID</th>
          <th>Project</th>
          <th>Output Description</th>
          <th>Hours</th>
          <th>Verifier</th>
          <th>Verified</th>
          <th>Location</th>
          <th>SDG / Framework</th>
        </tr></thead>`;

  const evidenceRowArr: string[] = verified.map((record, index) => {
    const sdgNums = resolveActivitySdgs(record, projectMap);
    const sdgChips = sdgNums.length > 0
      ? sdgNums.slice(0, 3).map((n) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:3px;background:${SDG_COLORS[n] || "#888"};color:#fff;font-size:8px;font-weight:700;margin-right:2px">${n}</span>`).join("")
      : "<span style='color:#94A3B8;font-size:9px'>Unmapped</span>";
    const projName = record.projectName
      || projectMap.get(record.projectId)?.name
      || filteredProjectNames[0]
      || "Community program";
    return `<tr>
            <td><strong>EVR-${String(index + 1).padStart(4, "0")}</strong></td>
            <td>${escapeHtml(projName)}</td>
            <td>${escapeHtml(getOutputText(record))}</td>
            <td>${number(getHours(record))}h</td>
            <td>${escapeHtml(record.verifierName || (record.verifiedBy ? "Authorized partner" : "Pending"))}</td>
            <td>${escapeHtml(dateLabel(record.verifiedAt))}</td>
            <td>${escapeHtml(record.region || record.location || (record.geolocation ? "Region captured" : "—"))}</td>
            <td>${sdgChips}</td>
          </tr>`;
  });

  const EVIDENCE_ROWS_PER_PAGE = 15;
  const evidenceChunks: string[][] = evidenceRowArr.length > 0
    ? (() => {
        const chunks: string[][] = [];
        for (let i = 0; i < evidenceRowArr.length; i += EVIDENCE_ROWS_PER_PAGE) {
          chunks.push(evidenceRowArr.slice(i, i + EVIDENCE_ROWS_PER_PAGE));
        }
        return chunks;
      })()
    : [[]];

  // SDG record counts (used by strip + examples)
  const sdgRecordCounts: Record<number, { count: number; hours: number; examples: any[] }> = {};
  for (const a of verified) {
    const nums = resolveActivitySdgs(a, projectMap);
    for (const num of nums) {
      if (!sdgRecordCounts[num]) sdgRecordCounts[num] = { count: 0, hours: 0, examples: [] };
      sdgRecordCounts[num].count++;
      sdgRecordCounts[num].hours += getHours(a);
      if (sdgRecordCounts[num].examples.length < 2) sdgRecordCounts[num].examples.push(a);
    }
  }

  // SDG strip: UN-style icons — colored square with number badge + goal abbreviation + description
  const sdgStripHtml = sdgsDisplay.length > 0
    ? sdgsDisplay.slice(0, 6).map((num) => {
        const color = SDG_COLORS[num] || "#888";
        const name = SDG_NAMES[num] || `SDG ${num}`;
        const desc = SDG_DESCRIPTIONS[num] || "";
        const textColor = (num === 7 || num === 12) ? "#1a1a1a" : "#fff";
        const recordCount = sdgRecordCounts[num]?.count ?? 0;
        const hours = sdgRecordCounts[num]?.hours ?? 0;
        return `<div class="sdg-card">
          <div class="sdg-icon-un" style="background:${color};color:${textColor}">
            <div class="sdg-badge">${num}</div>
            <svg class="sdg-un-wheel" viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r="8" fill="none" stroke="${textColor}" stroke-width="1.2" opacity="0.35"/>
              <circle cx="20" cy="20" r="14" fill="none" stroke="${textColor}" stroke-width="0.8" opacity="0.2"/>
              ${[0,45,90,135,180,225,270,315].map(a => `<line x1="20" y1="20" x2="${(20+14*Math.cos(a*Math.PI/180)).toFixed(1)}" y2="${(20+14*Math.sin(a*Math.PI/180)).toFixed(1)}" stroke="${textColor}" stroke-width="0.6" opacity="0.2"/>`).join("")}
            </svg>
            <div class="sdg-name-on-icon">${escapeHtml(name.split(" ").slice(0, 3).join(" ").toUpperCase())}</div>
          </div>
          <div class="sdg-name-block">${escapeHtml(name)}</div>
          <div class="sdg-desc">${escapeHtml(desc)}</div>
          ${recordCount > 0 ? `<div class="sdg-count-pill">${recordCount} record${recordCount !== 1 ? "s" : ""} · ${Math.round(hours)}h</div>` : ""}
        </div>`;
      }).join("")
    : `<div class="card soft"><p>No SDG mappings found in included evidence records.</p></div>`;

  // SDG contribution examples: top 3 SDGs by verified record count from actual data
  const topSdgs = Object.entries(sdgRecordCounts)
    .sort((a, b) => b[1].count - a[1].count || b[1].hours - a[1].hours)
    .slice(0, 3)
    .map(([sdg, data]) => ({ sdg: parseInt(sdg), ...data }));

  const sdgExamplesHtml = topSdgs.length > 0
    ? topSdgs.map(({ sdg, count, hours, examples }) => {
        const color = SDG_COLORS[sdg] || "#888";
        const name = SDG_NAMES[sdg] || `SDG ${sdg}`;
        const desc = SDG_DESCRIPTIONS[sdg] || "";
        const textColor = (sdg === 7 || sdg === 12) ? "#1a1a1a" : "#fff";
        const totalReach = examples.reduce((s, e) => s + getReach(e), 0);

        const exampleRows = examples.slice(0, 2).map((ex) => {
          const projName = ex.projectName || projectMap.get(ex.projectId)?.name || "Community program";
          const verifier = ex.verifierName || (ex.verifiedBy ? "Authorized partner" : "—");
          const exDate = ex.verifiedAt ? dateLabel(ex.verifiedAt) : "—";
          const exReach = getReach(ex);
          return `<tr>
            <td style="max-width:160px;white-space:normal">${escapeHtml(getOutputText(ex))}</td>
            <td>${escapeHtml(projName)}</td>
            <td style="text-align:right">${number(getHours(ex))}h</td>
            ${exReach > 0 ? `<td style="text-align:right">${number(exReach)}</td>` : `<td style="color:#94A3B8">—</td>`}
            <td>${escapeHtml(verifier)}</td>
            <td>${escapeHtml(exDate)}</td>
          </tr>`;
        }).join("");

        const fwTagsForSdg = frameworksDisplay.length > 0
          ? frameworksDisplay.slice(0, 3).map((fw) => {
              const def = FRAMEWORK_DEFINITIONS[fw];
              return def ? `<span class="framework-pill ${def.pillClass} sdg-fw-pill">${escapeHtml(def.pill)}</span>` : "";
            }).join("")
          : `<span class="framework-pill fp-sdg sdg-fw-pill">UN SDGs</span>`;

        return `<div class="sdg-detail-card">
          <div class="sdg-detail-header" style="border-bottom:1px solid var(--line)">
            <div class="sdg-detail-icon-block" style="background:${color};color:${textColor}">
              <svg style="position:absolute;inset:0;width:100%;height:100%;opacity:0.12" viewBox="0 0 88 88" aria-hidden="true"><circle cx="44" cy="44" r="22" fill="none" stroke="${textColor}" stroke-width="3"/><circle cx="44" cy="44" r="36" fill="none" stroke="${textColor}" stroke-width="1.5"/>${[0,45,90,135,180,225,270,315].map(a=>`<line x1="44" y1="44" x2="${(44+36*Math.cos(a*Math.PI/180)).toFixed(1)}" y2="${(44+36*Math.sin(a*Math.PI/180)).toFixed(1)}" stroke="${textColor}" stroke-width="1.5"/>`).join("")}</svg>
              <div class="sdg-detail-icon-num">${sdg}</div>
              <div class="sdg-detail-icon-name">${escapeHtml(name.split(" ").slice(0, 4).join(" ").toUpperCase())}</div>
            </div>
            <div class="sdg-detail-content">
              <div class="sdg-detail-name">SDG ${sdg}: ${escapeHtml(name)}</div>
              <div class="sdg-detail-desc">${escapeHtml(desc)}</div>
              <div class="sdg-stat-chips">
                <span class="sdg-stat-chip records">${ICON.doc}&nbsp;${count} verified record${count !== 1 ? "s" : ""}</span>
                <span class="sdg-stat-chip hours">${ICON.clock}&nbsp;${Math.round(hours)}h logged</span>
                ${totalReach > 0 ? `<span class="sdg-stat-chip reach">${ICON.users}&nbsp;${number(totalReach)} reached</span>` : ""}
              </div>
            </div>
          </div>
          <div style="padding:10px 14px 4px">
            <div style="font-size:9.5px;font-weight:800;color:var(--navy);margin-bottom:5px;text-transform:uppercase;letter-spacing:.04em">Example Evidence Records</div>
            <table class="sdg-activities-mini">
              <thead><tr><th>Output</th><th>Project</th><th>Hours</th><th>Reach</th><th>Verifier</th><th>Verified</th></tr></thead>
              <tbody>${exampleRows}</tbody>
            </table>
            <div class="sdg-mini-chain">
              <span class="chain-step" style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE">${ICON.user}&nbsp;Activity recorded</span>
              <span class="chain-arrow">→</span>
              <span class="chain-step" style="background:#F0FDF4;color:#15803D;border:1px solid #BBF7D0">${ICON.check}&nbsp;Partner confirmed</span>
              <span class="chain-arrow">→</span>
              <span class="chain-step" style="background:#F8FAFC;color:var(--navy);border:1px solid var(--line)">${ICON.shield}&nbsp;Evidence structured</span>
              <span class="chain-arrow">→</span>
              <span class="chain-step" style="background:${color}1A;color:var(--navy);border:1px solid ${color}55;font-weight:800">SDG ${sdg} mapped</span>
            </div>
            <div class="sdg-fw-tags">${fwTagsForSdg}</div>
          </div>
        </div>`;
      }).join("")
    : `<div class="card soft"><p>No SDG contribution examples available for this reporting period.</p></div>`;

  // Framework alignment table: derived from frameworksDisplay (not hardcoded)
  const frameworkTableRows = frameworksDisplay.length > 0
    ? frameworksDisplay.map((fw) => {
        const def = FRAMEWORK_DEFINITIONS[fw] || {
          pill: fw,
          pillClass: "fp-sasb",
          topic: fw,
          support: "Evidence records can support disclosures aligned to this framework.",
          limitation: "Does not determine compliance or replace organization's disclosure judgment.",
        };
        return `<tr>
          <td><span class="framework-pill ${def.pillClass}">${escapeHtml(def.pill)}</span></td>
          <td>${escapeHtml(def.topic)}</td>
          <td>${escapeHtml(def.support)}</td>
          <td>${escapeHtml(def.limitation)}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="4" style="text-align:center;color:#94A3B8;padding:16px">No frameworks selected for this report. Select frameworks in the Evidence Readiness Assessment or report generation settings.</td></tr>`;

  const formChecks = {
    program: ["Employee Volunteering", "Community Investment", "Grantmaking", "Capacity Building", "Other"],
    problem: ["Data scattered", "Hard to verify partner output", "Lack of audit-ready docs", "Inconsistent reporting", "Time-consuming reports", "Other"],
    sources: ["Spreadsheets", "Surveys / Forms", "Partner Reports", "CRM / PM Tools", "Photos / Documents", "Financial Systems"],
    frameworks: ["CSRD / ESRS", "ESRS S3", "GRI 413", "ISAE 3000", "UN SDGs", "SASB / ISSB", "TCFD", "Internal ESG / CSR reporting", "Other"],
    scope: ["Projects", "Partners / NGOs", "Volunteers", "Countries / Locations"],
    output: ["Verified Evidence Summary", "Board Summary", "Assurance Preparation Pack"],
  };

  // ─── Page 5: Partner-Reported Reach section ─────────────────────────────

  const noPartnerReach = partnerReportedReach === 0;
  const partnerReachSection = noPartnerReach
    ? `<div class="card soft"><p>No partner-reported reach data was submitted for this reporting period.</p></div>`
    : `<div class="reach-stat"><span class="icon-circle">${ICON.users}</span><div class="reach-label-block"><div class="reach-label">People Reached (Partner-Reported)</div><div class="reach-num">${number(partnerReportedReach)}</div></div></div>
       <div class="reach-stat"><span class="icon-circle">${ICON.globe}</span><div class="reach-label-block"><div class="reach-label">Communities Served</div><div class="reach-num">${number(communitiesServed)}</div></div></div>
       <div class="reach-stat"><span class="icon-circle">${ICON.folder}</span><div class="reach-label-block"><div class="metric-label">Programs Included</div><div class="metric-value">${number(projectsIncluded)}</div></div></div>`;

  // ─── HTML ────────────────────────────────────────────────────────────────

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Verified Evidence Summary</title>
  <style>
    :root{--navy:#0A1F44;--navy2:#0A2463;--gold:#D4980C;--green:#059669;--amber:#D97706;--red:#DC2626;--ink:#111827;--muted:#64748B;--line:#E5E7EB;--soft:#F8FAFC;--page-pad:.55in;}
    *{box-sizing:border-box}
    body{margin:0;background:#E5E7EB;color:var(--ink);font-family:Inter,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .report-page{width:8.5in;height:11in;margin:18px auto;background:#fff;border:1px solid #dbe1ea;display:flex;flex-direction:column;page-break-after:always;position:relative;overflow:hidden}
    .page-header{position:relative;height:.95in;padding:.32in var(--page-pad) 0;display:flex;align-items:flex-start;justify-content:space-between}
    .brand-lockup{display:flex;align-items:center;gap:10px}
    .brand-logo{height:46px;width:auto;display:block}
    .brand-text{display:flex;flex-direction:column;justify-content:center;line-height:1}
    .brand-wordmark{font-size:22px;font-weight:900;letter-spacing:.02em}
    .brand-syner{color:var(--navy)}
    .brand-xus{color:var(--gold)}
    .brand-tag{font-size:10px;color:var(--gold);font-weight:600;margin-top:3px;letter-spacing:.01em}
    .brand-tag span{color:var(--gold)}
    .corner-ornament{position:absolute;top:0;right:0;width:1.65in;height:1.05in;display:block}
    .page-body{flex:1;padding:.10in var(--page-pad) .35in;overflow:hidden}
    .page-footer{height:.45in;display:flex;align-items:center;justify-content:space-between;padding:0 var(--page-pad);color:#94A3B8;font-size:9px;letter-spacing:.05em;border-top:1px solid #EEF2F7}
    .page-num{color:#475569;font-weight:700;letter-spacing:.04em}
    h1{margin:0;color:var(--navy);font-size:46px;font-weight:900;letter-spacing:-.01em;line-height:1.05}
    h2{margin:0;color:var(--navy);font-size:38px;font-weight:900;letter-spacing:-.01em;line-height:1.08}
    h3{margin:0 0 10px;color:var(--navy);font-size:14px;font-weight:800}
    p{font-size:11px;line-height:1.55;color:#475569;margin:0 0 8px}
    .subtitle{font-size:14px;color:#64748B;margin:8px 0 0;font-weight:400}
    .gold-divider{width:60px;height:3px;background:var(--gold);border-radius:2px;margin:10px 0 18px}
    .section-title{margin:18px 0 10px;color:var(--navy);font-size:16px;font-weight:800}
    .section-title .gold-divider{margin-top:6px}
    .grid{display:grid;gap:14px}
    .grid-2{grid-template-columns:1fr 1fr}
    .grid-3{grid-template-columns:repeat(3,1fr)}
    .card{border:1px solid var(--line);border-radius:14px;background:#fff;padding:16px}
    .card.soft{background:#F8FAFC}
    .card.boundary{border:1px solid #F6D58B;background:#FFFBEB}
    .card.boundary p{color:#92400E;margin:0;font-size:11px;line-height:1.55}
    .info-row{display:flex;align-items:flex-start;gap:12px}
    .info-row .info-icon{width:28px;height:28px;color:var(--gold);flex-shrink:0}
    .info-row .info-icon svg{width:100%;height:100%}
    .cover-info{display:grid;grid-template-columns:.95fr 1.05fr;gap:18px;margin-top:6px}
    .info-list .info-item{display:flex;align-items:center;gap:14px;padding:11px 4px}
    .info-item .ico{width:34px;height:34px;border-radius:50%;border:1.5px solid #CBD5E1;color:var(--navy);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#fff}
    .info-item .ico svg{width:18px;height:18px}
    .info-item .info-label{font-size:11px;color:#64748B;font-weight:500;line-height:1.2;margin-bottom:3px}
    .info-item .info-value{font-size:13px;color:var(--navy);font-weight:800}
    .scope-card{border:1px solid var(--line);border-radius:14px;padding:18px;background:#fff}
    .scope-card .scope-head{display:flex;align-items:center;gap:10px;color:var(--green);margin-bottom:8px}
    .scope-card .scope-head svg{width:22px;height:22px}
    .scope-card .scope-head strong{color:var(--navy);font-size:15px}
    .scope-card .scope-desc{font-size:11px;color:#64748B;margin-bottom:10px;line-height:1.5}
    .scope-card .scope-divider{height:1px;background:#EEF2F7;margin:10px 0}
    .scope-row{display:grid;grid-template-columns:24px 1fr 1.1fr;gap:10px;align-items:center;padding:7px 0;font-size:11.5px}
    .scope-row .scope-check{color:var(--green);width:18px;height:18px}
    .scope-row .scope-check svg{width:18px;height:18px}
    .scope-row .scope-label{color:var(--navy);font-weight:800}
    .scope-row .scope-val{color:#334155;font-weight:500}
    .status-bar{margin-top:18px;border:1.5px solid #86EFAC;background:#F0FDF4;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px}
    .status-bar .status-icon{width:30px;height:30px;border-radius:50%;background:#D1FAE5;color:var(--green);display:flex;align-items:center;justify-content:center}
    .status-bar .status-icon svg{width:20px;height:20px}
    .status-bar .status-label{font-size:11px;color:#475569;font-weight:600;letter-spacing:.03em}
    .status-bar .status-val{font-size:16px;color:var(--green);font-weight:900}
    .metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:8px}
    .metric-card{border:1px solid var(--line);border-radius:14px;background:#fff;padding:18px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px}
    .metric-icon-circle{width:42px;height:42px;border-radius:50%;background:#F0FDF4;color:var(--green);display:flex;align-items:center;justify-content:center;margin-bottom:4px}
    .metric-icon-circle svg{width:22px;height:22px}
    .metric-icon-circle.amber{background:#FEF3C7;color:var(--amber)}
    .metric-icon-circle.navy{background:#DBEAFE;color:var(--navy)}
    .metric-icon-circle.red{background:#FEE2E2;color:var(--red)}
    .metric-label{font-size:11px;color:var(--navy);font-weight:800;position:relative;padding-bottom:8px}
    .metric-label::after{content:"";display:block;width:60px;height:1px;background:var(--line);position:absolute;left:50%;bottom:0;transform:translateX(-50%)}
    .metric-value{font-size:36px;color:var(--navy);font-weight:900;line-height:1;margin-top:8px}
    .metric-note{font-size:9.5px;color:#64748B;margin-top:4px}
    .metric-row-6{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:6px}
    .metric-row-6 .metric-card{padding:14px 8px;gap:0}
    .metric-row-6 .metric-card-top{height:90px;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:6px;overflow:hidden}
    .metric-row-6 .metric-icon-circle{width:36px;height:36px;flex-shrink:0}
    .metric-row-6 .metric-icon-circle svg{width:18px;height:18px}
    .metric-row-6 .metric-label{font-size:10px;line-height:1.2;flex-shrink:0}
    .metric-row-6 .metric-value{font-size:28px;margin-top:8px}
    .tier-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:10px}
    .tier-card{border:1px solid var(--line);border-radius:14px;padding:16px;background:#fff}
    .tier-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
    .tier-icon-circle{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
    .tier-icon-circle svg{width:22px;height:22px}
    .tier-card.verified .tier-icon-circle{background:var(--navy)}
    .tier-card.partner .tier-icon-circle{background:var(--gold)}
    .tier-card.derived .tier-icon-circle{background:#7B8FA8}
    .tier-card.verified{border-color:#CFD8E6}
    .tier-card.partner{background:#FFF8E8;border-color:#F6D58B}
    .tier-card.derived{background:#F1F5FB;border-color:#CFD8E6}
    .tier-title{font-size:14px;font-weight:800;color:var(--navy)}
    .tier-card.partner .tier-title{color:var(--amber)}
    .tier-card.derived .tier-title{color:#475569}
    .tier-desc{font-size:11px;color:#475569;line-height:1.5;margin-bottom:10px}
    .tier-metrics-title{font-size:12px;color:var(--navy);font-weight:800;margin:8px 0 4px}
    .tier-metrics{font-size:10.5px;color:#334155;line-height:1.65;list-style:none;padding:0;margin:0}
    .tier-metrics li{padding:1px 0}
    .tier-metrics li::before{content:"• ";color:#94A3B8}
    .mix-title{font-size:14px;color:var(--navy);font-weight:800;margin:18px 0 8px}
    .mix-bar{display:flex;height:34px;border-radius:8px;overflow:hidden}
    .mix-bar .seg{display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px}
    .mix-bar .seg.verified{background:var(--navy)}
    .mix-bar .seg.pending{background:var(--gold)}
    .mix-bar .seg.incomplete{background:#F97316}
    .mix-bar .seg.rejected{background:#EF4444}
    .mix-legend{display:flex;justify-content:center;gap:24px;margin-top:10px;font-size:10.5px;color:#334155;font-weight:600;flex-wrap:wrap}
    .legend-dot{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:7px;vertical-align:middle}
    .pipeline-table{width:100%;border-collapse:collapse;margin-top:14px;font-size:11px}
    .pipeline-table th{background:#F1F5F9;color:var(--navy);padding:7px 12px;text-align:left;font-weight:800;font-size:10.5px}
    .pipeline-table th:not(:first-child){text-align:right}
    .pipeline-table td{padding:7px 12px;border-top:1px solid #EEF2F7;color:#334155;vertical-align:middle}
    .pipeline-table td:not(:first-child){text-align:right;font-weight:700}
    .pipeline-table tr.total-row td{border-top:2px solid #CBD5E1;color:var(--navy);font-weight:800;background:#F8FAFC}
    .pipeline-table .status-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;vertical-align:middle}
    .pipeline-table .pct-bar{display:inline-block;height:7px;border-radius:3px;vertical-align:middle;margin-left:6px;min-width:2px}
    .quality-grid{display:grid;grid-template-columns:1.65fr 1fr;gap:16px;margin-top:6px;align-items:start}
    .quality-card{border:1px solid var(--line);border-radius:14px;background:#fff;padding:18px}
    .quality-top{display:grid;grid-template-columns:1fr 1fr;gap:14px;text-align:center;margin-bottom:14px}
    .quality-top .qt-title{font-size:13px;color:var(--navy);font-weight:800;margin-bottom:8px}
    .quality-top .qt-score{font-size:64px;color:var(--navy);font-weight:900;line-height:1}
    .quality-top .qt-score small{font-size:24px;font-weight:600;color:#94A3B8}
    .readiness{display:flex;flex-direction:column;align-items:center;gap:8px}
    .readiness .ready-icon{width:46px;height:46px;border-radius:50%;background:#D1FAE5;color:var(--green);display:flex;align-items:center;justify-content:center}
    .readiness .ready-icon svg{width:30px;height:30px}
    .readiness .ready-val{color:var(--green);font-weight:900;font-size:18px}
    .quality-table{width:100%;border-collapse:separate;border-spacing:0}
    .quality-table th{background:var(--navy);color:#fff;text-align:left;padding:10px 14px;font-size:11px;font-weight:800;letter-spacing:.04em}
    .quality-table th:last-child{text-align:right}
    .quality-table td{padding:10px 14px;font-size:11px;color:var(--navy);font-weight:700;border-top:1px solid #EEF2F7}
    .quality-table td:last-child{text-align:right;font-weight:900;color:var(--green)}
    .quality-table td.amber{color:var(--amber)}
    .quality-table td .yes{display:inline-flex;align-items:center;gap:6px;color:var(--green);font-weight:800}
    .quality-table td .yes svg{width:14px;height:14px}
    .vscope-title{font-size:14px;color:var(--navy);font-weight:800;margin-bottom:10px}
    .vscope-card{border:1px solid var(--line);border-radius:14px;background:#fff;padding:14px;display:grid;grid-template-columns:50px 1fr;gap:14px;align-items:center;margin-bottom:10px}
    .vscope-card .vscope-icon{width:48px;height:48px;border-radius:50%;background:#F1F5FB;color:var(--navy);display:flex;align-items:center;justify-content:center}
    .vscope-card .vscope-icon svg{width:26px;height:26px}
    .vscope-card .metric-label{text-align:left;font-size:11px}
    .vscope-card .metric-value{text-align:left;font-size:30px;margin-top:4px}
    .evidence-records-table{border-radius:14px;border:1px solid var(--line);overflow:hidden}
    .evidence-records-table table{width:100%;border-collapse:collapse;font-size:9px}
    .evidence-records-table th{background:var(--navy);color:#fff;padding:10px 6px;font-size:9px;font-weight:800;text-align:center;line-height:1.2}
    .evidence-records-table td{padding:8px 6px;font-size:9.5px;color:#334155;border-top:1px solid #EEF2F7;text-align:center;vertical-align:middle;line-height:1.3;max-height:32px;overflow:hidden}
    .evidence-records-table td:nth-child(3){text-align:left;max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .evidence-records-table td strong{color:var(--navy);font-weight:800}
    .row-badge{display:inline-flex;align-items:center;gap:4px;background:#D1FAE5;color:var(--green);border-radius:999px;padding:4px 8px;font-size:9px;font-weight:800}
    .row-badge svg{width:11px;height:11px}
    .redaction-note{color:#64748B;font-style:italic;font-size:9px}
    .reach-grid{display:grid;grid-template-columns:.95fr 1.65fr;gap:16px;margin-top:4px;align-items:start}
    .reach-card{border:1px solid var(--line);border-radius:14px;padding:14px;background:#fff}
    .reach-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .reach-head .icon-circle{width:36px;height:36px;border-radius:50%;background:#DBEAFE;color:var(--navy);display:flex;align-items:center;justify-content:center}
    .reach-head .icon-circle svg{width:20px;height:20px}
    .reach-head strong{color:var(--navy);font-size:13px}
    .reach-desc{font-size:10.5px;color:#64748B;line-height:1.5;margin-bottom:10px}
    .reach-divider{height:1px;background:#EEF2F7;margin:10px 0}
    .reach-stat{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid #EEF2F7}
    .reach-stat:first-of-type{border-top:0}
    .reach-stat .icon-circle{width:42px;height:42px;border-radius:50%;background:#DBEAFE;color:var(--navy);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .reach-stat .icon-circle svg{width:22px;height:22px}
    .reach-stat .reach-label-block{flex:1}
    .reach-stat .reach-label{font-size:11px;color:var(--navy);font-weight:800}
    .reach-stat .reach-num{font-size:26px;color:var(--navy);font-weight:900;line-height:1}
    .framework-table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:14px;overflow:hidden}
    .framework-table th{background:var(--navy);color:#fff;text-align:left;padding:10px 12px;font-size:11px;font-weight:800}
    .framework-table td{padding:12px;font-size:10.5px;color:#334155;border-top:1px solid #EEF2F7;vertical-align:top;line-height:1.5}
    .framework-pill{display:inline-block;padding:5px 12px;border-radius:999px;font-size:11px;font-weight:800;border:1px solid;background:#fff}
    .fp-esrs{color:#1E40AF;border-color:#BFDBFE;background:#EFF6FF}
    .fp-gri{color:#166534;border-color:#86EFAC;background:#F0FDF4}
    .fp-isae{color:#6B21A8;border-color:#D8B4FE;background:#FAF5FF}
    .fp-sdg{color:#92400E;border-color:#FCD34D;background:#FFFBEB}
    .fp-sasb{color:#475569;border-color:#CBD5E1;background:#F8FAFC}
    .num-step{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--navy);color:#fff;font-size:11px;font-weight:800;margin-right:8px}
    .sdg-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:12px}
    .sdg-card{border:1px solid var(--line);border-radius:10px;padding:10px;background:#fff;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px}
    .sdg-card .sdg-name-block{font-size:9px;color:var(--navy);font-weight:800;text-transform:uppercase;letter-spacing:.03em;line-height:1.2}
    .sdg-card .sdg-desc{font-size:9.5px;color:#64748B;line-height:1.4;margin-top:2px}
    .sdg-card .sdg-count-pill{font-size:8.5px;color:#fff;background:var(--navy);border-radius:10px;padding:2px 7px;margin-top:2px;font-weight:700}
    .sdg-icon-un{width:76px;height:76px;border-radius:6px;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:4px 4px 5px;overflow:hidden;flex-shrink:0}
    .sdg-icon-un .sdg-badge{position:absolute;top:4px;left:5px;font-size:18px;font-weight:900;line-height:1;z-index:2}
    .sdg-icon-un .sdg-un-wheel{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;z-index:1}
    .sdg-icon-un .sdg-name-on-icon{font-size:7px;font-weight:800;line-height:1.1;text-align:center;letter-spacing:.02em;z-index:2;max-width:64px}
    .pathway{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;align-items:stretch;margin:8px 0 14px;position:relative}
    .pathway .step{border:1px solid var(--line);border-radius:10px;padding:10px;background:#fff;text-align:center;font-size:9.5px;color:#475569;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative}
    .pathway .step .step-icon{width:36px;height:36px;color:var(--navy)}
    .pathway .step .step-icon svg{width:36px;height:36px}
    .pathway .step strong{color:var(--navy);font-size:10.5px}
    .pathway .step::after{content:"→";position:absolute;right:-10px;top:50%;transform:translateY(-50%);color:var(--gold);font-weight:900;font-size:14px}
    .pathway .step:last-child::after{content:""}
    .sdg-example{display:flex;flex-direction:column;gap:10px;margin-top:8px}
    .sdg-detail-card{border:1px solid var(--line);border-radius:14px;background:#fff;overflow:hidden;margin-bottom:6px}
    .sdg-detail-header{display:grid;grid-template-columns:88px 1fr;align-items:stretch}
    .sdg-detail-icon-block{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 6px;position:relative;min-height:84px}
    .sdg-detail-icon-num{font-size:32px;font-weight:900;line-height:1;z-index:2}
    .sdg-detail-icon-name{font-size:6px;font-weight:800;text-align:center;line-height:1.1;z-index:2;padding:2px 4px;margin-top:3px;max-width:76px}
    .sdg-detail-content{padding:12px 14px;display:flex;flex-direction:column;justify-content:center}
    .sdg-detail-name{font-size:12px;font-weight:800;color:var(--navy);margin-bottom:3px}
    .sdg-detail-desc{font-size:9.5px;color:#475569;line-height:1.45;margin-bottom:7px}
    .sdg-stat-chips{display:flex;gap:6px;flex-wrap:wrap}
    .sdg-stat-chip{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:999px;font-size:8.5px;font-weight:700}
    .sdg-stat-chip svg{width:10px;height:10px;flex-shrink:0}
    .sdg-stat-chip.records{background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE}
    .sdg-stat-chip.hours{background:#F0FDF4;color:#15803D;border:1px solid #BBF7D0}
    .sdg-stat-chip.reach{background:#FFF7ED;color:#C2410C;border:1px solid #FED7AA}
    .sdg-activities-mini{width:100%;border-collapse:collapse;font-size:8.5px;margin-bottom:6px}
    .sdg-activities-mini th{background:#F1F5F9;color:var(--navy);padding:4px 8px;text-align:left;font-weight:800;font-size:8px;letter-spacing:.03em}
    .sdg-activities-mini td{padding:4px 8px;color:#334155;border-top:1px solid #F1F5F9;vertical-align:middle;line-height:1.35}
    .sdg-mini-chain{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:6px;padding:6px 8px;background:#F8FAFC;border-radius:8px;margin-bottom:6px}
    .chain-step{display:inline-flex;align-items:center;gap:3px;font-size:8px;padding:3px 8px;border-radius:4px;font-weight:700}
    .chain-step svg{width:10px;height:10px;flex-shrink:0}
    .chain-arrow{color:#94A3B8;font-size:11px;font-weight:700;line-height:1}
    .sdg-fw-tags{display:flex;gap:5px;flex-wrap:wrap;padding-bottom:10px}
    .sdg-fw-pill{font-size:9px;padding:2px 8px}
    .sdg-example-card .ex-label{font-size:11px;color:var(--navy);font-weight:800;margin-bottom:3px}
    .sdg-example-card .ex-text{font-size:10.5px;color:#475569;line-height:1.5;margin-bottom:8px}
    .neg-impact-table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:14px;overflow:hidden;margin-top:12px}
    .neg-impact-table th{background:var(--navy);color:#fff;text-align:left;padding:9px 12px;font-size:11px;font-weight:800}
    .neg-impact-table td{padding:10px 12px;font-size:11px;color:#334155;border-top:1px solid #EEF2F7;line-height:1.5}
    .neg-impact-table td:first-child{color:var(--navy);font-weight:800;width:35%}
    .method-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:8px 0 18px;position:relative}
    .method-step{border:1px solid var(--line);border-radius:10px;padding:12px 8px;background:#fff;text-align:center;font-size:10px;color:#475569;line-height:1.4;position:relative}
    .method-step::after{content:"→";position:absolute;right:-9px;top:50%;transform:translateY(-50%);color:var(--gold);font-weight:900;font-size:13px}
    .method-step:last-child::after{content:""}
    .method-step .num{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;color:var(--navy);font-size:24px;font-weight:900;margin-bottom:6px}
    .method-step strong{display:block;color:var(--navy);font-size:11px;margin-bottom:4px}
    .def-table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:14px;overflow:hidden}
    .def-table th{background:var(--navy);color:#fff;text-align:left;padding:9px 14px;font-size:11px;font-weight:800}
    .def-table td{padding:11px 14px;font-size:10.5px;color:#334155;border-top:1px solid #EEF2F7;line-height:1.5;vertical-align:top}
    .def-table td:first-child{color:var(--navy);font-weight:800;width:32%}
    .lim-list{margin:10px 0 0;padding:0;list-style:none;column-count:2;column-gap:32px;font-size:11px;color:#475569;line-height:1.6}
    .lim-list li{padding:3px 0;break-inside:avoid}
    .lim-list li::before{content:"• ";color:#94A3B8}
    .form-shell{display:grid;grid-template-columns:.85fr 1.15fr;gap:14px;margin-top:6px}
    .form-shell .left-col h3{margin-bottom:10px}
    .left-col-title{color:var(--navy);font-size:22px;font-weight:900;line-height:1.1;margin-bottom:10px}
    .left-col-desc{font-size:11px;color:#64748B;line-height:1.55;margin-bottom:14px}
    .use-card{border:1px solid var(--line);border-radius:12px;padding:12px;background:#fff;display:grid;grid-template-columns:32px 1fr;gap:10px;align-items:center;margin-bottom:8px}
    .use-card .use-check{width:30px;height:30px;border-radius:50%;background:#F0FDF4;color:var(--green);display:flex;align-items:center;justify-content:center}
    .use-card .use-check svg{width:18px;height:18px}
    .use-card strong{display:block;color:var(--navy);font-size:11.5px;font-weight:800}
    .use-card p{font-size:10px;margin:2px 0 0;color:#64748B}
    .form-section{border:1px solid var(--line);border-radius:12px;padding:12px;background:#fff;margin-bottom:8px}
    .form-section h3{display:flex;align-items:center;gap:6px;margin:0 0 8px;color:var(--navy);font-size:12px}
    .form-section h3 .num{color:var(--navy)}
    .input-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .input-label{font-size:10px;color:var(--navy);font-weight:700;margin-bottom:4px}
    .input-label .req{color:var(--red)}
    .fake-input{height:30px;border:1px solid #CBD5E1;border-radius:6px;background:#F8FAFC;padding:8px;font-size:10px;color:#94A3B8}
    .checks{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:10px;color:#334155}
    .check{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--navy);font-weight:600}
    .check-box{width:14px;height:14px;border:1.5px solid #94A3B8;border-radius:3px;background:#fff;display:inline-block;flex-shrink:0}
    .ack-box{border:1px solid #CBD5E1;border-radius:8px;padding:10px;background:#fff;font-size:10px;color:#475569;line-height:1.4;margin-top:6px}
    .cta{height:42px;border-radius:8px;background:var(--gold);color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:800;font-size:13px;margin-top:8px}
    @media print{body{background:#fff}.report-page{margin:0;border:0;width:8.5in;height:11in;overflow:hidden}@page{size:letter;margin:0}}
  </style>
</head>
<body>

PAGES_PLACEHOLDER
</body>
</html>`;

  // ─── Build page bodies dynamically ──────────────────────────────────────────

  const pageBodies: string[] = [];

  // Page 1 — Cover
  pageBodies.push(`
  <h1>Verified Evidence Summary</h1>
  <div class="subtitle">Prepared for ESG / CSR Reporting and Assurance Support</div>
  <div class="gold-divider"></div>

  <div class="cover-info">
    <div class="info-list">
      <div class="info-item"><span class="ico">${ICON.user}</span><div><div class="info-label">Prepared for</div><div class="info-value">${escapeHtml(input.organizationName)}</div></div></div>
      <div class="info-item"><span class="ico">${ICON.badgeId}</span><div><div class="info-label">Report ID</div><div class="info-value">${escapeHtml(input.reportId)}</div></div></div>
      <div class="info-item"><span class="ico">${ICON.calendar}</span><div><div class="info-label">Reporting Period</div><div class="info-value">${escapeHtml(input.periodDisplay)}</div></div></div>
      <div class="info-item"><span class="ico">${ICON.doc}</span><div><div class="info-label">Generated Date</div><div class="info-value">${escapeHtml(input.generatedDate)}</div></div></div>
      <div class="info-item"><span class="ico">${ICON.clock}</span><div><div class="info-label">Data Cutoff</div><div class="info-value">${escapeHtml(input.dataCutoffDate || input.generatedDate)}</div></div></div>
    </div>
    <div class="scope-card">
      <div class="scope-head">${ICON.target}<strong>Scope Summary</strong></div>
      <div class="scope-desc">This report includes verified evidence records collected and processed for the reporting period and data cutoff date.</div>
      <div class="scope-divider"></div>
      <div class="scope-row"><span class="scope-check">${ICON.check}</span><span class="scope-label">Organizations</span><span class="scope-val">${escapeHtml(organizationScopeValue)}</span></div>
      <div class="scope-row"><span class="scope-check">${ICON.check}</span><span class="scope-label">Program Scope</span><span class="scope-val">${escapeHtml(filteredProjectNames.slice(0, 3).join(", ") || "All programs")}</span></div>
      <div class="scope-row"><span class="scope-check">${ICON.check}</span><span class="scope-label">Geographic Scope</span><span class="scope-val">${escapeHtml(countries.length ? countries.slice(0, 3).join(", ") : "Global")}</span></div>
      <div class="scope-row"><span class="scope-check">${ICON.check}</span><span class="scope-label">Frameworks</span><span class="scope-val">${escapeHtml(frameworksDisplay.length > 0 ? frameworksDisplay.slice(0, 3).join(", ") : "No frameworks selected")}</span></div>
      <div class="scope-row"><span class="scope-check">${ICON.check}</span><span class="scope-label">Evidence Sources</span><span class="scope-val">${escapeHtml(evidenceSources.slice(0, 3).join(", "))}</span></div>
    </div>
  </div>

  ${renderStatusBar(resolvedStatus)}

  <div class="section-title">Summary at a Glance<div class="gold-divider"></div></div>

  <div class="metric-grid">
    <div class="metric-card"><span class="metric-icon-circle">${ICON.doc}</span><div class="metric-label">Verified Evidence Records</div><div class="metric-value">${number(verified.length)}</div><div class="metric-note">Records with verified status</div></div>
    <div class="metric-card"><span class="metric-icon-circle">${ICON.clock}</span><div class="metric-label">Verified Hours</div><div class="metric-value">${number(verifiedHours)}</div><div class="metric-note">Hours in verified records</div></div>
    <div class="metric-card"><span class="metric-icon-circle">${ICON.users}</span><div class="metric-label">Partner-Reported Reach</div><div class="metric-value">${number(partnerReportedReach)}</div><div class="metric-note">Partner-reported, not independently verified</div></div>
  </div>

  <div class="card boundary" style="margin-top:18px">
    <div class="info-row">
      <span class="info-icon">${ICON.info}</span>
      <p>${escapeHtml(BOUNDARY_STATEMENT)}</p>
    </div>
  </div>
`);

  // Page 2 — Executive Evidence Snapshot
  pageBodies.push(`
  <h2>Executive Evidence Snapshot</h2>
  <div class="subtitle">Verified, Partner-Reported, and Derived / Mapped data kept separate.</div>
  <div class="gold-divider"></div>

  <div class="metric-row-6">
    <div class="metric-card"><div class="metric-card-top"><span class="metric-icon-circle">${ICON.doc}</span><div class="metric-label">Verified Evidence Records</div></div><div class="metric-value">${number(verified.length)}</div></div>
    <div class="metric-card"><div class="metric-card-top"><span class="metric-icon-circle">${ICON.clock}</span><div class="metric-label">Verified Hours</div></div><div class="metric-value">${number(verifiedHours)}</div></div>
    <div class="metric-card"><div class="metric-card-top"><span class="metric-icon-circle">${ICON.award}</span><div class="metric-label">Verification Rate</div></div><div class="metric-value">${eligible > 0 ? verificationRate : "N/A"}${eligible > 0 ? "%" : ""}</div></div>
    <div class="metric-card"><div class="metric-card-top"><span class="metric-icon-circle">${ICON.target}</span><div class="metric-label">Average Verification Time</div></div><div class="metric-value">${escapeHtml(avgVerificationTime)}</div></div>
    <div class="metric-card"><div class="metric-card-top"><span class="metric-icon-circle amber">${ICON.alert}</span><div class="metric-label">Incomplete Records</div></div><div class="metric-value">${number(incomplete.length)}</div></div>
    <div class="metric-card"><div class="metric-card-top"><span class="metric-icon-circle red">${ICON.x}</span><div class="metric-label">Rejected Records</div></div><div class="metric-value">${number(rejected.length)}</div></div>
  </div>

  <div class="section-title" style="margin-top:18px">Evidence Confidence Tiers</div>

  <div class="tier-grid">
    <div class="tier-card verified">
      <div class="tier-head"><span class="tier-icon-circle">${ICON.shield}</span><div class="tier-title">Verified</div></div>
      <div class="tier-desc">Records with verified status and full evidence chain.</div>
      <div class="tier-metrics-title">Metrics</div>
      <ul class="tier-metrics">
        <li>Verified Evidence Records: ${number(verified.length)}</li>
        <li>Verified Hours: ${number(verifiedHours)}</li>
        <li>Verification Rate: ${eligible > 0 ? verificationRate + "%" : "N/A"}</li>
        <li>Avg. Verification Time: ${escapeHtml(avgVerificationTime)}</li>
      </ul>
    </div>
    <div class="tier-card partner">
      <div class="tier-head"><span class="tier-icon-circle">${ICON.users}</span><div class="tier-title">Partner-Reported</div></div>
      <div class="tier-desc">Reported by partners and not independently verified by Synerxus.</div>
      <div class="tier-metrics-title">Metrics</div>
      <ul class="tier-metrics">
        <li>Partner-Reported Reach: ${number(partnerReportedReach)}</li>
        <li>Communities Served: ${number(communitiesServed)}</li>
        <li>Partners Contributing: ${number(partnerNames.length)}</li>
        <li>Self-Reported Outputs: ${number(partnerReported.length)}</li>
      </ul>
    </div>
    <div class="tier-card derived">
      <div class="tier-head"><span class="tier-icon-circle">${ICON.globe}</span><div class="tier-title">Derived / Mapped</div></div>
      <div class="tier-desc">SDG and framework alignment derived from record classification.</div>
      <div class="tier-metrics-title">Metrics</div>
      <ul class="tier-metrics">
        <li>SDGs Mapped: ${number(sdgsDisplay.length)}</li>
        <li>Frameworks Selected: ${number(frameworksDisplay.length)}</li>
        <li>Pending Records: ${number(pending.length)}</li>
        <li>Contribution Pathways: ${number(sdgsDisplay.length > 0 ? sdgsDisplay.length : 0)}</li>
      </ul>
    </div>
  </div>

  <div class="mix-title">Record Verification Status</div>
  ${activities.length > 0
    ? `<div class="mix-bar">
        <div class="seg verified" style="width:${Math.max(verifiedPct, verifiedPct > 0 ? 3 : 0)}%" title="Verified: ${verified.length}">${verifiedPct > 10 ? verifiedPct + "%" : ""}</div>
        <div class="seg pending" style="width:${Math.max(pendingPct, pendingPct > 0 ? 3 : 0)}%" title="Pending: ${pending.length}">${pendingPct > 10 ? pendingPct + "%" : ""}</div>
        <div class="seg incomplete" style="width:${Math.max(incompletePct, incompletePct > 0 ? 3 : 0)}%" title="Incomplete: ${incomplete.length}">${incompletePct > 10 ? incompletePct + "%" : ""}</div>
        <div class="seg rejected" style="width:${Math.max(rejectedPct, rejectedPct > 0 ? 3 : 0)}%" title="Rejected: ${rejected.length}">${rejectedPct > 10 ? rejectedPct + "%" : ""}</div>
      </div>
      <div class="mix-legend">
        <span><span class="legend-dot" style="background:var(--navy)"></span>Verified</span>
        <span><span class="legend-dot" style="background:var(--gold)"></span>Pending Verification</span>
        <span><span class="legend-dot" style="background:#F97316"></span>Incomplete</span>
        <span><span class="legend-dot" style="background:#EF4444"></span>Rejected</span>
      </div>
      <table class="pipeline-table">
        <thead><tr><th>Status</th><th>Records</th><th>% of Submitted</th><th style="text-align:left;padding-left:18px">Pipeline bar</th></tr></thead>
        <tbody>
          <tr>
            <td><span class="status-dot" style="background:var(--navy)"></span>Verified</td>
            <td>${verified.length}</td>
            <td>${verifiedPct}%</td>
            <td style="text-align:left;padding-left:18px"><span class="pct-bar" style="width:${Math.round(verifiedPct * 1.4)}px;background:var(--navy);opacity:0.85"></span></td>
          </tr>
          <tr>
            <td><span class="status-dot" style="background:var(--gold)"></span>Pending Verification</td>
            <td>${pending.length}</td>
            <td>${pendingPct}%</td>
            <td style="text-align:left;padding-left:18px"><span class="pct-bar" style="width:${Math.round(pendingPct * 1.4)}px;background:var(--gold)"></span></td>
          </tr>
          <tr>
            <td><span class="status-dot" style="background:#F97316"></span>Incomplete</td>
            <td>${incomplete.length}</td>
            <td>${incompletePct}%</td>
            <td style="text-align:left;padding-left:18px"><span class="pct-bar" style="width:${Math.round(incompletePct * 1.4)}px;background:#F97316"></span></td>
          </tr>
          <tr>
            <td><span class="status-dot" style="background:#EF4444"></span>Rejected</td>
            <td>${rejected.length}</td>
            <td>${rejectedPct}%</td>
            <td style="text-align:left;padding-left:18px"><span class="pct-bar" style="width:${Math.round(rejectedPct * 1.4)}px;background:#EF4444"></span></td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="total-row"><td>Total Submitted</td><td>${activities.length}</td><td>100%</td><td></td></tr>
        </tfoot>
      </table>
      <p style="font-size:9.5px;color:#64748B;margin-top:8px;line-height:1.5">Verified totals include only records with completed verification status. Pending, incomplete, and rejected records are excluded from verified evidence totals.</p>`
    : `<div class="card soft"><p>No activity records found for this reporting period.</p></div>`
  }

  <div class="card boundary" style="margin-top:14px">
    <div class="info-row">
      <span class="info-icon">${ICON.info}</span>
      <div>
        <p style="font-weight:800;color:#92400E;margin-bottom:3px">Auditor View</p>
        <p style="margin:0">Metrics are separated by confidence tier to avoid overstatement and support transparent reporting.</p>
      </div>
    </div>
  </div>
`);

  // Page 3 — Evidence Quality Scorecard
  pageBodies.push(`
  <h2>Evidence Quality Scorecard</h2>
  <div class="subtitle">Data Completeness, Confirmation, and Traceability</div>
  <div class="gold-divider"></div>

  <div class="quality-grid">
    <div>
      <div class="quality-card">
        <div class="quality-top">
          <div>
            <div class="qt-title">Evidence Quality Score</div>
            <div class="qt-score">${qualityScore}<small> / 100</small></div>
          </div>
          <div>
            <div class="qt-title">Readiness Status</div>
            <div class="readiness">
              <span class="ready-icon">${ICON.check}</span>
              <span class="ready-val">${escapeHtml(resolvedStatus)}</span>
            </div>
          </div>
        </div>
        <table class="quality-table">
          <thead><tr><th>Quality Matrix</th><th>Score / Status</th></tr></thead>
          <tbody>
            ${completenessChecks.length > 0
              ? completenessChecks.map(([label, ok, pct]) => {
                  const pctNum = parseInt(pct.replace("%", ""), 10);
                  const isAmber = !ok || (!isNaN(pctNum) && pctNum < 90);
                  return `<tr><td>${escapeHtml(String(label))}</td><td class="${isAmber ? "amber" : ""}">${escapeHtml(String(pct))}</td></tr>`;
                }).join("")
              : `<tr><td colspan="2" style="text-align:center;color:#94A3B8">No verified records to score in this reporting period.</td></tr>`
            }
            <tr><td>Incomplete Records Excluded from Verified Totals</td><td><span class="yes">${ICON.check}Yes</span></td></tr>
            <tr><td>Sensitive Metadata Redacted</td><td><span class="yes">${ICON.check}Yes</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <div class="vscope-title">Verification Scope</div>
      <div class="vscope-card">
        <span class="vscope-icon">${ICON.folder}</span>
        <div><div class="metric-label">Projects Included</div><div class="metric-value">${number(projectsIncluded)}</div></div>
      </div>
      <div class="vscope-card">
        <span class="vscope-icon">${ICON.users}</span>
        <div><div class="metric-label">NGO / Implementation Partners</div><div class="metric-value">${number(partnerNames.length)}</div></div>
      </div>
      <div class="vscope-card">
        <span class="vscope-icon">${ICON.globe}</span>
        <div><div class="metric-label">Countries / Regions</div><div class="metric-value">${number(countries.length)}</div></div>
      </div>
      <div class="vscope-card">
        <span class="vscope-icon">${ICON.heart}</span>
        <div><div class="metric-label">Volunteers Included</div><div class="metric-value">${number(volunteerCount)}</div></div>
      </div>
    </div>
  </div>

  <div class="card boundary" style="margin-top:18px">
    <div class="info-row">
      <span class="info-icon">${ICON.info}</span>
      <p>Only records within the reporting period and with verified status are included in verified totals. Incomplete and rejected records are excluded.</p>
    </div>
  </div>
`);

  // Evidence Record pages — one HTML page per chunk of 15 rows
  if (evidenceRowArr.length === 0) {
    pageBodies.push(`
  <h2>Verified Evidence Records</h2>
  <div class="subtitle">No verified records in this reporting period.</div>
  <div class="gold-divider"></div>
  <div class="card soft"><p>No Verified Evidence Records are available for this reporting period. Pending, incomplete, rejected, and unverified records are excluded from verified totals.</p></div>
`);
  } else {
    evidenceChunks.forEach((chunk, ci) => {
      const isFirst = ci === 0;
      const isLast = ci === evidenceChunks.length - 1;
      const continuedLabel = evidenceChunks.length > 1 ? ` (${ci + 1} of ${evidenceChunks.length})` : "";
      pageBodies.push(`
  <h2>Verified Evidence Records${isFirst ? "" : " (continued)"}</h2>
  <div class="subtitle">${isFirst
    ? `${number(verified.length)} verified record${verified.length !== 1 ? "s" : ""} included in this reporting package${evidenceChunks.length > 1 ? ` — page ${ci + 1} of ${evidenceChunks.length}` : ""}.`
    : `Continued${continuedLabel} — ${number(verified.length)} total verified records.`
  }</div>
  ${isFirst ? '<div class="gold-divider"></div>' : ""}
  <div class="table-wrap evidence-records-table"><table>
    ${EVIDENCE_TABLE_HEAD}
    <tbody>${chunk.join("")}</tbody>
  </table></div>
  ${isLast ? hoursBarChart : ""}
  ${isLast ? `<div class="card boundary" style="margin-top:14px">
    <div class="info-row">
      <span class="info-icon">${ICON.info}</span>
      <p>Sensitive technical metadata is retained internally and redacted from this management report. Records marked "Unmapped" in SDG / Framework Alignment have been flagged in the Evidence Quality Scorecard.</p>
    </div>
  </div>` : ""}
`);
    });
  }


  // Partner-Reported Reach & Framework Alignment — always its own page
  pageBodies.push(`
  <h2>Partner-Reported Reach &amp; Framework Alignment</h2>
  <div class="subtitle">Separate community reach from verified outputs and connect records to reporting frameworks.</div>
  <div class="gold-divider"></div>

  <div class="reach-grid">
    <div class="reach-card">
      <div class="reach-head"><span class="icon-circle">${ICON.users}</span><strong>Partner-Reported<br/>Reach</strong></div>
      <div class="reach-desc">These figures are reported by partners and are not verified by Synerxus unless explicitly stated.</div>
      <div class="reach-divider"></div>
      ${partnerReachSection}
      <div class="reach-divider"></div>
      <div class="card boundary" style="margin-top:6px;padding:10px">
        <div class="info-row">
          <span class="info-icon" style="width:22px;height:22px">${ICON.alert}</span>
          <p style="font-size:10px;line-height:1.4">${
            noPartnerReach
              ? "No partner-reported reach data was submitted for this reporting period."
              : "These are partner-reported figures and are not independently verified by Synerxus unless explicitly stated."
          }</p>
        </div>
      </div>
    </div>

    <div>
      <table class="framework-table">
        <thead><tr><th>Framework</th><th>Reporting Topic</th><th>Evidence Support</th><th>Limitation</th></tr></thead>
        <tbody>
          ${frameworkTableRows}
        </tbody>
      </table>
      <div class="card boundary" style="margin-top:14px">
        <div class="info-row">
          <span class="info-icon">${ICON.info}</span>
          <p>Framework alignment supports reporting preparation, <strong>not certification or endorsement</strong>. It does not determine compliance, replace organization disclosure judgment, or imply formal assurance.</p>
        </div>
      </div>
    </div>
  </div>
`);

  // SDG Mapping Context & Contribution Pathways
  pageBodies.push(`
  <h2>SDG Mapping Context &amp; Contribution Pathways</h2>
  <div class="subtitle">How partner-confirmed outputs connect to SDG-aligned reporting context.</div>
  <div class="gold-divider"></div>

  <div class="section-title" style="margin-top:8px"><span class="num-step">1</span>SDG Context</div>
  <div class="sdg-strip">
    ${sdgStripHtml}
  </div>

  <div class="section-title"><span class="num-step">2</span>Contribution Pathway</div>
  <div class="pathway">
    <div class="step"><span class="step-icon">${ICON.user}</span><strong>Volunteer Activity Recorded</strong>Activities are logged with details, location, and context.</div>
    <div class="step"><span class="step-icon">${ICON.doc}</span><strong>Output Submitted</strong>Partners submit outputs and supporting documents or data.</div>
    <div class="step"><span class="step-icon">${ICON.users}</span><strong>Authorized Partner Confirmation</strong>An authorized partner verifies accuracy and completeness.</div>
    <div class="step"><span class="step-icon">${ICON.shield}</span><strong>Evidence Record Created</strong>Synerxus structures records with metadata, tags, and links.</div>
    <div class="step"><span class="step-icon">${ICON.database}</span><strong>Included in Verified Evidence Summary</strong>Verified records roll up into reports aligned to SDG frameworks.</div>
  </div>

  <div class="section-title"><span class="num-step">3</span>SDG Contribution Examples</div>
  <div class="sdg-example">
    ${sdgExamplesHtml}
  </div>

  <div class="section-title"><span class="num-step">4</span>Negative Impact Screening Summary</div>
  <table class="neg-impact-table">
    <thead><tr><th>Item</th><th>Summary</th></tr></thead>
    <tbody>
      <tr><td>Issues Reported</td><td>${rejected.length > 0 ? rejected.length : "0"}</td></tr>
      <tr><td>Outside Scope / Not Assessed</td><td>Limited</td></tr>
      <tr><td>Limitation Note</td><td>No negative impacts were reported through the partner-administered process during the period. This does not rule out unobserved or independently unreported impacts.</td></tr>
    </tbody>
  </table>
`);

  // Methodology, Definitions, and Report Boundaries
  pageBodies.push(`
  <h2>Methodology, Definitions, and Report Boundaries</h2>
  <div class="subtitle">How evidence records are captured, confirmed, and used in reporting support.</div>
  <div class="gold-divider"></div>

  <div class="section-title"><span class="num-step">1</span>Methodology Overview</div>
  <div class="method-steps">
    <div class="method-step"><div class="num">1</div><strong>Activity Captured</strong>Projects and partner activities are logged with core details and context.</div>
    <div class="method-step"><div class="num">2</div><strong>Output Documented</strong>Partners submit outputs and supporting documents following defined templates.</div>
    <div class="method-step"><div class="num">3</div><strong>Partner Confirmation</strong>Authorized partners review and confirm outputs for accuracy and completeness.</div>
    <div class="method-step"><div class="num">4</div><strong>Evidence Record Created</strong>Synerxus structures records with metadata, tags, and links.</div>
    <div class="method-step"><div class="num">5</div><strong>Reporting Support</strong>Verified records are organized to support reporting and assurance preparation.</div>
  </div>

  <div class="section-title"><span class="num-step">2</span>Key Definitions</div>
  <table class="def-table">
    <thead><tr><th>Term</th><th>Definition</th></tr></thead>
    <tbody>
      <tr><td>Verified Evidence Record</td><td>A structured record that has completed required verification checks and can support reporting workflows.</td></tr>
      <tr><td>Partner-Confirmed Output</td><td>An output submitted by a partner and confirmed by an authorized partner or verifier.</td></tr>
      <tr><td>Verified Hours</td><td>Hours attached to records with a completed verified status.</td></tr>
      <tr><td>Partner-Reported Reach</td><td>The number of individuals, communities, or entities reached as reported by partners and not independently verified by Synerxus unless explicitly stated.</td></tr>
      <tr><td>Derived / Mapped Alignment</td><td>Alignment to frameworks or standards derived from Synerxus classification and mapping rules.</td></tr>
      <tr><td>Incomplete Record</td><td>A record missing required information or documentation and not yet eligible for verification.</td></tr>
      <tr><td>Rejected Record</td><td>A record that does not meet minimum quality or consistency requirements and is excluded from verified totals.</td></tr>
    </tbody>
  </table>

  <div class="card boundary" style="margin-top:16px">
    <div class="info-row">
      <span class="info-icon">${ICON.info}</span>
      <p>Synerxus provides structured evidence records for reporting and assurance preparation. <strong>It does not</strong> provide formal assurance opinions, guarantee regulatory compliance, or establish causal attribution.</p>
    </div>
  </div>

  <div class="section-title">Limitations</div>
  <ul class="lim-list">
    <li>This report does not establish causality or measure long-term impact.</li>
    <li>This report does not assess or guarantee regulatory compliance.</li>
    <li>Beneficiary counts are partner-reported unless explicitly stated otherwise.</li>
    <li>Some metadata may be redacted to protect privacy and confidentiality.</li>
    <li>Partner-reported reach is not independently verified by Synerxus unless explicitly stated.</li>
    <li>SDG and framework alignment does not imply certification or endorsement.</li>
  </ul>
`);

  // Evidence Readiness Assessment
  pageBodies.push(`
  <h2>Evidence Readiness Assessment</h2>
  <div class="subtitle">Use Cases &amp; Setup Form</div>
  <div class="gold-divider"></div>

  <div class="form-shell">
    <div class="left-col">
      <div class="left-col-title">Configure Your Evidence Workflow</div>
      <div class="left-col-desc">Select your primary use cases and provide key details so we can tailor your Synerxus evidence system.</div>

      <div class="use-card"><span class="use-check">${ICON.check}</span><div><strong>Corporate Volunteering</strong><p>Track employee volunteering hours and evidence records.</p></div></div>
      <div class="use-card"><span class="use-check">${ICON.check}</span><div><strong>Community Investment</strong><p>Capture and report on community programs and outputs.</p></div></div>
      <div class="use-card"><span class="use-check">${ICON.check}</span><div><strong>NGO / Partner Verification</strong><p>Verify partner capacity, activities, and output data.</p></div></div>
      <div class="use-card"><span class="use-check">${ICON.check}</span><div><strong>Assurance Preparation</strong><p>Organize evidence for third-party assurance preparation.</p></div></div>
      <div class="use-card"><span class="use-check">${ICON.check}</span><div><strong>SDG / Framework Mapping</strong><p>Map outputs to global goals and reporting frameworks.</p></div></div>

      <div class="card boundary" style="margin-top:10px;padding:10px">
        <div class="info-row">
          <span class="info-icon" style="width:22px;height:22px">${ICON.info}</span>
          <p style="font-size:10.5px;margin:0">This assessment helps recommend the right configuration, data model, and evidence workflow.</p>
        </div>
      </div>
    </div>

    <div>
      <div class="form-section">
        <h3><span class="num">1.</span>Organization Profile</h3>
        <div class="input-grid">
          <div><div class="input-label">Organization Name <span class="req">*</span></div><div class="fake-input">Enter organization name</div></div>
          <div><div class="input-label">Website</div><div class="fake-input">https://...</div></div>
          <div><div class="input-label">Sector <span class="req">*</span></div><div class="fake-input">Select sector</div></div>
          <div><div class="input-label">Region <span class="req">*</span></div><div class="fake-input">Select region</div></div>
          <div><div class="input-label">Contact Name <span class="req">*</span></div><div class="fake-input">Enter full name</div></div>
          <div><div class="input-label">Work Email <span class="req">*</span></div><div class="fake-input">name@organization.org</div></div>
        </div>
      </div>
      <div class="form-section"><h3><span class="num">2.</span>Program Type</h3><div class="checks">${formChecks.program.map(checkbox).join("")}</div></div>
      <div class="form-section"><h3><span class="num">3.</span>Evidence Problem</h3><div class="checks">${formChecks.problem.map(checkbox).join("")}</div></div>
      <div class="form-section"><h3><span class="num">4.</span>Current Evidence Sources</h3><div class="checks">${formChecks.sources.map(checkbox).join("")}</div></div>
      <div class="form-section"><h3><span class="num">5.</span>Frameworks of Interest</h3><div class="checks">${formChecks.frameworks.map(checkbox).join("")}</div></div>
      <div class="form-section"><h3><span class="num">6.</span>Verification Scope</h3><div class="checks">${formChecks.scope.map(checkbox).join("")}</div></div>
      <div class="form-section"><h3><span class="num">7.</span>Report Output Needed</h3><div class="checks">${formChecks.output.map(checkbox).join("")}</div></div>
      <div class="form-section">
        <h3><span class="num">8.</span>Timing</h3>
        <div class="input-grid">
          <div><div class="input-label">Need assessment by</div><div class="fake-input">Select date</div></div>
          <div><div class="input-label">Comments</div><div class="fake-input">Optional</div></div>
        </div>
      </div>
      <div class="ack-box">
        <label class="check"><span class="check-box"></span>I acknowledge and agree to the boundary statement: ${escapeHtml(BOUNDARY_STATEMENT)}</label>
      </div>
      <div class="cta">Request Evidence Assessment ${ICON.arrow}</div>
    </div>
  </div>
`);

  // ─── Render all pages with dynamic total ────────────────────────────────────
  const totalPages = pageBodies.length;
  const pagesHtml = pageBodies
    .map((body, i) => page(i + 1, totalPages, body, input.logoDataUri))
    .join("\n");

  return html.replace("PAGES_PLACEHOLDER", pagesHtml);
}
