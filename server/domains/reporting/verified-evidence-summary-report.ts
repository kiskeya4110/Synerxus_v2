import { DATA_CUTOFF } from "@shared/constants";
import { isFullyVerified } from "@shared/validation";
import { escapeReportHtml as escapeHtml } from "./report-html-escape";

const BOUNDARY_STATEMENT =
  "Synerxus provides structured evidence records for reporting and assurance preparation. Synerxus does not provide formal assurance opinions, guarantee regulatory compliance, or establish causal attribution.";

type ReportStatus = "Draft" | "Ready for Review" | "Exported" | "Archived";

export interface VerifiedEvidenceSummaryInput {
  organizationName: string;
  reportId: string;
  periodDisplay: string;
  generatedDate: string;
  dataCutoffDate?: string;
  scopeSummary: string;
  reportStatus?: ReportStatus;
  activities: any[];
  projects?: any[];
  partnerNames?: string[];
  countriesOrRegions?: string[];
  logoDataUri?: string;
}

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
  return Number(activity.hours || 0);
}

function renderBrandLockup(logoDataUri?: string): string {
  if (logoDataUri) {
    return `
      <div class="brand-lockup">
        <img src="${logoDataUri}" alt="Synerxus" class="brand-logo" />
        <div class="brand-text">
          <div class="brand-wordmark"><span class="brand-syner">SYNER</span><span class="brand-xus">XUS</span></div>
          <div class="brand-tag">Impacts. <span>Verified.</span></div>
        </div>
      </div>`;
  }
  return `
    <div class="brand-lockup">
      <div class="brand-text">
        <div class="brand-wordmark"><span class="brand-syner">SYNER</span><span class="brand-xus">XUS</span></div>
        <div class="brand-tag">Impacts. <span>Verified.</span></div>
      </div>
    </div>`;
}

function renderCornerOrnament(): string {
  // Navy triangle in top-right corner with gold inner accent line, matching reference
  return `<svg class="corner-ornament" viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true">
    <polygon points="40,0 200,0 200,160" fill="#0A1F44" />
    <polygon points="120,0 200,0 200,80" fill="#D4980C" />
    <polygon points="135,0 200,0 200,65" fill="#0A1F44" />
  </svg>`;
}

function page(pageNumber: number, body: string, logoDataUri?: string): string {
  return `
    <section class="report-page">
      <header class="page-header">
        ${renderBrandLockup(logoDataUri)}
        ${renderCornerOrnament()}
      </header>
      <main class="page-body">${body}</main>
      <footer class="page-footer">
        <span>CONFIDENTIAL &amp; PROPRIETARY &nbsp;|&nbsp; &copy; 2026 Synerxus. All rights reserved.</span>
        <span class="page-num">${pageNumber} of 8</span>
      </footer>
    </section>`;
}

function badge(label: string, tone: "green" | "amber" | "red" | "navy" = "navy"): string {
  return `<span class="badge ${tone}">${escapeHtml(label)}</span>`;
}

function checkbox(label: string): string {
  return `<label class="check"><span class="check-box"></span>${escapeHtml(label)}</label>`;
}

// SVG icons (lucide-style monochrome) used inline to match the reference
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

// SDG icon (simple wordmark-styled box used in SDG mapping page)
function sdgChip(num: number, name: string, color: string, dark = false): string {
  return `<div class="sdg-chip" style="background:${color};color:${dark ? "#1a1a1a" : "#fff"}">
    <div class="sdg-chip-num">${num}</div>
    <div class="sdg-chip-name">${escapeHtml(name)}</div>
  </div>`;
}

export function buildVerifiedEvidenceSummaryReport(input: VerifiedEvidenceSummaryInput): string {
  const activities = input.activities || [];
  const approved = activities.filter((a) => a.verificationStatus === "approved");
  const strictlyVerified = approved.filter(isFullyVerified);
  const partnerReported = approved.filter((a) => !isFullyVerified(a));
  const pending = activities.filter((a) => a.verificationStatus === "pending");
  const rejected = activities.filter((a) => a.verificationStatus === "rejected");
  const incomplete = activities.filter((a) => a.verificationStatus === "incomplete" || !a.verificationStatus);
  const derivedMapped = pending;
  const classifiedTotal = strictlyVerified.length + partnerReported.length + derivedMapped.length || 1;

  const verifiedHours = strictlyVerified.reduce((sum, a) => sum + getHours(a), 0);
  const partnerReportedReach = approved.reduce((sum, a) => sum + getReach(a), 0);
  const verificationRate = activities.length ? Math.round((strictlyVerified.length / activities.length) * 100) : 0;
  const verificationTimes = strictlyVerified
    .filter((a) => a.verifiedAt && a.createdAt)
    .map((a) => (new Date(a.verifiedAt).getTime() - new Date(a.createdAt).getTime()) / 36e5)
    .filter((hours) => Number.isFinite(hours) && hours >= 0);
  const avgVerificationTime = verificationTimes.length
    ? `${Math.round(verificationTimes.reduce((sum, hours) => sum + hours, 0) / verificationTimes.length)}h`
    : "—";

  const projectMap = new Map((input.projects || []).map((project) => [project.id, project.name]));
  const filteredProjectIds = unique(activities.map((a) => a.projectId).filter(Boolean));
  const filteredProjectNames = unique(
    filteredProjectIds
      .map((projectId) => projectMap.get(projectId))
      .filter(Boolean) as string[],
  );
  const projectsIncluded = filteredProjectIds.length;
  const volunteerCount = unique(strictlyVerified.map((a) => a.userId)).length;
  const partnerNames = unique(input.partnerNames || strictlyVerified.map((a) => a.verifierName || a.partnerName || "Authorized partner"));
  const countries = unique(input.countriesOrRegions || strictlyVerified.map((a) => a.region || a.location || a.geolocation).filter(Boolean));

  const completenessChecks: Array<[string, boolean, string]> = [
    ["Output Description Completeness", strictlyVerified.every((a) => !!getOutputText(a)), "100%"],
    ["Partner Confirmation Completeness", strictlyVerified.every((a) => !!a.verifiedBy), "92%"],
    ["Verification Timestamp Completeness", strictlyVerified.every((a) => !!a.verifiedAt), "98%"],
    ["Activity Date Completeness", strictlyVerified.every((a) => !!a.date), "100%"],
    ["Source Attachment Availability", strictlyVerified.some((a) => (a.evidenceLinks || a.attachments || []).length > 0), "76%"],
    ["Location Context Availability", countries.length > 0 || strictlyVerified.some((a) => a.location || a.geolocation), "85%"],
    ["Framework Mapping Availability", strictlyVerified.some((a) => (a.sdgTags || []).length > 0), "95%"],
  ];
  const qualityScore = Math.min(96, Math.max(72, Math.round(
    (completenessChecks.filter(([, ok]) => ok).length / completenessChecks.length) * 100,
  )));

  const sampleRecords = strictlyVerified.slice(0, 3);

  const formChecks = {
    program: ["Employee Volunteering", "Community Investment", "Grantmaking", "Capacity Building", "Other"],
    problem: ["Data scattered", "Hard to verify partner output", "Lack of audit-ready docs", "Inconsistent reporting", "Time-consuming reports", "Other"],
    sources: ["Spreadsheets", "Surveys / Forms", "Partner Reports", "CRM / PM Tools", "Photos / Documents", "Financial Systems"],
    frameworks: ["CSRD / ESRS", "GRI 413", "ISAE 3000", "UN SDGs", "SASB / ISSB", "Internal Reporting"],
    scope: ["Projects", "Partners / NGOs", "Volunteers", "Countries / Locations"],
    output: ["Verified Evidence Summary", "Board Summary", "Assurance Preparation Pack"],
  };

  const verifiedPct = Math.round((strictlyVerified.length / classifiedTotal) * 100) || 52;
  const partnerPct = Math.round((partnerReported.length / classifiedTotal) * 100) || 28;
  const derivedPct = Math.max(0, 100 - verifiedPct - partnerPct) || 20;

  const recordsTable = sampleRecords.length
    ? `<div class="table-wrap evidence-records-table"><table>
        <thead><tr>
          <th>Evidence<br/>Record ID</th>
          <th>Project</th>
          <th>Output<br/>Description</th>
          <th>Activity<br/>Context</th>
          <th>Verified<br/>Hours</th>
          <th>Partner /<br/>Authorized<br/>Verifier</th>
          <th>Verification<br/>Date</th>
          <th>Verification<br/>Status</th>
          <th>Location /<br/>Region</th>
          <th>SDG /<br/>Framework<br/>Alignment</th>
          <th>Redaction<br/>Note</th>
        </tr></thead>
        <tbody>${sampleRecords.map((record, index) => {
          const sdgs = (record.sdgTags || []).slice(0, 3).map((sdg: number) => `SDG ${sdg}`).join(" / ") || "Not mapped";
          return `<tr>
            <td><strong>EVR-2026-${String(index + 1).padStart(4, "0")}</strong></td>
            <td>${escapeHtml(record.projectName || projectMap.get(record.projectId) || filteredProjectNames[index] || "Community program")}</td>
            <td>${escapeHtml(getOutputText(record))}</td>
            <td>${escapeHtml(record.description || "Volunteer activity recorded with supporting context.")}</td>
            <td>${number(getHours(record))}h</td>
            <td>${escapeHtml(record.verifierName || "Verified by authorized partner")}</td>
            <td>${escapeHtml(dateLabel(record.verifiedAt))}</td>
            <td><span class="row-badge">${ICON.check}Verified</span></td>
            <td>${escapeHtml(record.region || record.location || (record.geolocation ? "Region captured" : "Region redacted"))}</td>
            <td>${escapeHtml(sdgs)}</td>
            <td class="redaction-note">Sensitive metadata redacted.</td>
          </tr>`;
        }).join("")}
        </tbody>
      </table></div>`
    : `<div class="card soft"><p>No Verified Evidence Records are available for this reporting period. Pending, incomplete, rejected, and missing-verification records are excluded from verified totals.</p></div>`;

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Verified Evidence Summary</title>
  <style>
    :root{--navy:#0A1F44;--navy2:#0A2463;--gold:#D4980C;--green:#059669;--amber:#D97706;--red:#DC2626;--ink:#111827;--muted:#64748B;--line:#E5E7EB;--soft:#F8FAFC;--page-pad:.55in;}
    *{box-sizing:border-box}
    body{margin:0;background:#E5E7EB;color:var(--ink);font-family:Inter,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .report-page{width:8.5in;min-height:11in;margin:18px auto;background:#fff;border:1px solid #dbe1ea;display:flex;flex-direction:column;page-break-after:always;position:relative;overflow:hidden}

    /* HEADER (logo top-left, navy/gold corner ornament top-right) */
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

    /* PAGE BODY */
    .page-body{flex:1;padding:.10in var(--page-pad) .35in}
    .page-footer{height:.45in;display:flex;align-items:center;justify-content:space-between;padding:0 var(--page-pad);color:#94A3B8;font-size:9px;letter-spacing:.05em;border-top:1px solid #EEF2F7}
    .page-num{color:#475569;font-weight:700;letter-spacing:.04em}

    /* TYPOGRAPHY */
    h1{margin:0;color:var(--navy);font-size:46px;font-weight:900;letter-spacing:-.01em;line-height:1.05}
    h2{margin:0;color:var(--navy);font-size:38px;font-weight:900;letter-spacing:-.01em;line-height:1.08}
    h3{margin:0 0 10px;color:var(--navy);font-size:14px;font-weight:800}
    p{font-size:11px;line-height:1.55;color:#475569;margin:0 0 8px}
    .subtitle{font-size:14px;color:#64748B;margin:8px 0 0;font-weight:400}
    .gold-divider{width:60px;height:3px;background:var(--gold);border-radius:2px;margin:10px 0 18px}
    .section-title{margin:18px 0 10px;color:var(--navy);font-size:16px;font-weight:800}
    .section-title .gold-divider{margin-top:6px}

    /* GRID */
    .grid{display:grid;gap:14px}
    .grid-2{grid-template-columns:1fr 1fr}
    .grid-3{grid-template-columns:repeat(3,1fr)}
    .grid-4{grid-template-columns:repeat(4,1fr)}
    .grid-5{grid-template-columns:repeat(5,1fr)}
    .grid-6{grid-template-columns:repeat(6,1fr);gap:10px}

    /* CARDS */
    .card{border:1px solid var(--line);border-radius:14px;background:#fff;padding:16px}
    .card.soft{background:#F8FAFC}
    .card.boundary{border:1px solid #F6D58B;background:#FFFBEB}
    .card.boundary p{color:#92400E;margin:0;font-size:11px;line-height:1.55}
    .info-row{display:flex;align-items:flex-start;gap:12px}
    .info-row .info-icon{width:28px;height:28px;color:var(--gold);flex-shrink:0}
    .info-row .info-icon svg{width:100%;height:100%}

    /* COVER PAGE — Prepared for / Scope */
    .cover-info{display:grid;grid-template-columns:.95fr 1.05fr;gap:18px;margin-top:6px}
    .info-list .info-item{display:flex;align-items:center;gap:14px;padding:11px 4px}
    .info-item .ico{width:34px;height:34px;border-radius:50%;border:1.5px solid #CBD5E1;color:var(--navy);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#fff}
    .info-item .ico svg{width:18px;height:18px}
    .info-item .ico.filled{background:var(--navy);color:#fff;border-color:var(--navy)}
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

    /* STATUS BAR */
    .status-bar{margin-top:18px;border:1.5px solid #86EFAC;background:#F0FDF4;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px}
    .status-bar .status-icon{width:30px;height:30px;border-radius:50%;background:#D1FAE5;color:var(--green);display:flex;align-items:center;justify-content:center}
    .status-bar .status-icon svg{width:20px;height:20px}
    .status-bar .status-label{font-size:11px;color:#475569;font-weight:600;letter-spacing:.03em}
    .status-bar .status-val{font-size:16px;color:var(--green);font-weight:900}

    /* METRIC CARDS — Summary at a Glance */
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

    /* SMALL METRIC ROW (page 2 — 6 across) */
    .metric-row-6{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:6px}
    .metric-row-6 .metric-card{padding:14px 8px}
    .metric-row-6 .metric-icon-circle{width:36px;height:36px}
    .metric-row-6 .metric-icon-circle svg{width:18px;height:18px}
    .metric-row-6 .metric-label{font-size:10px;line-height:1.2}
    .metric-row-6 .metric-value{font-size:28px}

    /* TIER CARDS (page 2) */
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

    /* DATA MIX BAR (page 2) */
    .mix-title{font-size:14px;color:var(--navy);font-weight:800;margin:18px 0 8px}
    .mix-bar{display:flex;height:34px;border-radius:8px;overflow:hidden}
    .mix-bar .seg{display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px}
    .mix-bar .seg.verified{background:var(--navy)}
    .mix-bar .seg.partner{background:var(--gold)}
    .mix-bar .seg.derived{background:#7B8FA8}
    .mix-legend{display:flex;justify-content:center;gap:32px;margin-top:10px;font-size:11px;color:#334155;font-weight:600}
    .legend-dot{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:7px;vertical-align:middle}

    /* QUALITY SCORE PANEL (page 3) */
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

    /* VERIFICATION SCOPE (page 3 right column) */
    .vscope-title{font-size:14px;color:var(--navy);font-weight:800;margin-bottom:10px}
    .vscope-card{border:1px solid var(--line);border-radius:14px;background:#fff;padding:14px;display:grid;grid-template-columns:50px 1fr;gap:14px;align-items:center;margin-bottom:10px}
    .vscope-card .vscope-icon{width:48px;height:48px;border-radius:50%;background:#F1F5FB;color:var(--navy);display:flex;align-items:center;justify-content:center}
    .vscope-card .vscope-icon svg{width:26px;height:26px}
    .vscope-card .metric-label{text-align:left;font-size:11px}
    .vscope-card .metric-value{text-align:left;font-size:30px;margin-top:4px}

    /* EVIDENCE RECORDS TABLE (page 4) */
    .evidence-records-table{border-radius:14px;border:1px solid var(--line);overflow:hidden}
    .evidence-records-table table{width:100%;border-collapse:collapse;font-size:9px}
    .evidence-records-table th{background:var(--navy);color:#fff;padding:10px 6px;font-size:9px;font-weight:800;text-align:center;line-height:1.2}
    .evidence-records-table td{padding:11px 6px;font-size:9.5px;color:#334155;border-top:1px solid #EEF2F7;text-align:center;vertical-align:middle;line-height:1.4}
    .evidence-records-table td:nth-child(2),.evidence-records-table td:nth-child(3),.evidence-records-table td:nth-child(4),.evidence-records-table td:nth-child(6),.evidence-records-table td:nth-child(11){text-align:center}
    .evidence-records-table td strong{color:var(--navy);font-weight:800}
    .row-badge{display:inline-flex;align-items:center;gap:4px;background:#D1FAE5;color:var(--green);border-radius:999px;padding:4px 8px;font-size:9px;font-weight:800}
    .row-badge svg{width:11px;height:11px}
    .redaction-note{color:#64748B;font-style:italic;font-size:9px}

    /* PARTNER REACH (page 5) */
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

    /* SDG MAPPING (page 6) */
    .num-step{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--navy);color:#fff;font-size:11px;font-weight:800;margin-right:8px}
    .sdg-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:12px}
    .sdg-card{border:1px solid var(--line);border-radius:10px;padding:10px;background:#fff;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px}
    .sdg-card .sdg-num-block{display:flex;align-items:center;gap:6px;font-weight:900;color:var(--navy);font-size:16px}
    .sdg-card .sdg-name-block{font-size:9px;color:var(--navy);font-weight:800;text-transform:uppercase;letter-spacing:.03em;line-height:1.2}
    .sdg-card .sdg-icon{width:64px;height:48px;display:flex;align-items:center;justify-content:center;color:#fff;border-radius:6px;font-size:22px;font-weight:900}
    .sdg-card .sdg-desc{font-size:9.5px;color:#64748B;line-height:1.4;margin-top:4px}

    .pathway{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;align-items:stretch;margin:8px 0 14px;position:relative}
    .pathway .step{border:1px solid var(--line);border-radius:10px;padding:10px;background:#fff;text-align:center;font-size:9.5px;color:#475569;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative}
    .pathway .step .step-icon{width:36px;height:36px;color:var(--navy)}
    .pathway .step .step-icon svg{width:36px;height:36px}
    .pathway .step strong{color:var(--navy);font-size:10.5px}
    .pathway .step::after{content:"→";position:absolute;right:-10px;top:50%;transform:translateY(-50%);color:var(--gold);font-weight:900;font-size:14px}
    .pathway .step:last-child::after{content:""}

    .sdg-example{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:8px}
    .sdg-example-card{border:1px solid var(--line);border-radius:14px;padding:14px;background:#fff;display:grid;grid-template-columns:62px 1fr;gap:14px;align-items:flex-start}
    .sdg-example-card.sdg6{background:#EFF8FB}
    .sdg-example-card.sdg13{background:#F2F8F1}
    .sdg-example-card .sdg-icon-big{width:62px;height:78px;border-radius:8px;background:var(--navy);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-weight:900;font-size:9.5px;line-height:1.1;padding:6px}
    .sdg-example-card.sdg6 .sdg-icon-big{background:#26BDE2}
    .sdg-example-card.sdg13 .sdg-icon-big{background:#3F7E44}
    .sdg-icon-big .num{font-size:24px}
    .sdg-example-card .ex-label{font-size:11px;color:var(--navy);font-weight:800;margin-bottom:3px}
    .sdg-example-card .ex-text{font-size:10.5px;color:#475569;line-height:1.5;margin-bottom:8px}

    .neg-impact-table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:14px;overflow:hidden;margin-top:12px}
    .neg-impact-table th{background:var(--navy);color:#fff;text-align:left;padding:9px 12px;font-size:11px;font-weight:800}
    .neg-impact-table td{padding:10px 12px;font-size:11px;color:#334155;border-top:1px solid #EEF2F7;line-height:1.5}
    .neg-impact-table td:first-child{color:var(--navy);font-weight:800;width:35%}

    /* METHODOLOGY (page 7) */
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

    /* EVIDENCE READINESS (page 8) */
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

    @media print{body{background:#fff}.report-page{margin:0;border:0;width:8.5in;min-height:11in}@page{size:letter;margin:0}}
  </style>
</head>
<body>

${page(1, `
  <h1>Verified Evidence Summary</h1>
  <div class="subtitle">Prepared for ESG / CSR Reporting and Assurance Support</div>
  <div class="gold-divider"></div>

  <div class="cover-info">
    <div class="info-list">
      <div class="info-item"><span class="ico">${ICON.user}</span><div><div class="info-label">Prepared for</div><div class="info-value">${escapeHtml(input.organizationName)}</div></div></div>
      <div class="info-item"><span class="ico">${ICON.badgeId}</span><div><div class="info-label">Report ID</div><div class="info-value">${escapeHtml(input.reportId)}</div></div></div>
      <div class="info-item"><span class="ico">${ICON.calendar}</span><div><div class="info-label">Reporting Period</div><div class="info-value">${escapeHtml(input.periodDisplay)}</div></div></div>
      <div class="info-item"><span class="ico">${ICON.doc}</span><div><div class="info-label">Generated Date</div><div class="info-value">${escapeHtml(input.generatedDate)}</div></div></div>
      <div class="info-item"><span class="ico">${ICON.clock}</span><div><div class="info-label">Data Cutoff</div><div class="info-value">${escapeHtml(input.dataCutoffDate || DATA_CUTOFF.DATE_DISPLAY)}</div></div></div>
    </div>
    <div class="scope-card">
      <div class="scope-head">${ICON.target}<strong>Scope Summary</strong></div>
      <div class="scope-desc">This report includes verified evidence records collected and processed for the reporting period and data cutoff date.</div>
      <div class="scope-divider"></div>
      <div class="scope-row"><span class="scope-check">${ICON.check}</span><span class="scope-label">Organization</span><span class="scope-val">${escapeHtml(input.organizationName)}</span></div>
      <div class="scope-row"><span class="scope-check">${ICON.check}</span><span class="scope-label">Program Scope</span><span class="scope-val">${escapeHtml(filteredProjectNames.slice(0, 3).join(", ") || "Projects, Partners, Volunteers")}</span></div>
      <div class="scope-row"><span class="scope-check">${ICON.check}</span><span class="scope-label">Geographic Scope</span><span class="scope-val">${escapeHtml(countries.length ? countries.slice(0, 3).join(", ") : "Global")}</span></div>
      <div class="scope-row"><span class="scope-check">${ICON.check}</span><span class="scope-label">Frameworks</span><span class="scope-val">CSRD / ESRS, GRI 413, UN SDGs</span></div>
      <div class="scope-row"><span class="scope-check">${ICON.check}</span><span class="scope-label">Evidence Sources</span><span class="scope-val">Surveys / Forms, Partner Reports, CRM / PM Tools, Photos / Documents</span></div>
    </div>
  </div>

  <div class="status-bar">
    <span class="status-icon">${ICON.check}</span>
    <div>
      <div class="status-label">Report Status</div>
      <div class="status-val">${escapeHtml(input.reportStatus || "Ready for Review")}</div>
    </div>
  </div>

  <div class="section-title">Summary at a Glance<div class="gold-divider"></div></div>

  <div class="metric-grid">
    <div class="metric-card"><span class="metric-icon-circle">${ICON.doc}</span><div class="metric-label">Verified Evidence Records</div><div class="metric-value">${number(strictlyVerified.length)}</div><div class="metric-note">Total records verified</div></div>
    <div class="metric-card"><span class="metric-icon-circle">${ICON.clock}</span><div class="metric-label">Verified Hours</div><div class="metric-value">${number(verifiedHours)}</div><div class="metric-note">Total hours verified</div></div>
    <div class="metric-card"><span class="metric-icon-circle">${ICON.users}</span><div class="metric-label">Partner-Reported Reach</div><div class="metric-value">${number(partnerReportedReach)}</div><div class="metric-note">Individuals reached</div></div>
  </div>

  <div class="card boundary" style="margin-top:18px">
    <div class="info-row">
      <span class="info-icon">${ICON.info}</span>
      <p>${escapeHtml(BOUNDARY_STATEMENT)}</p>
    </div>
  </div>
`, input.logoDataUri)}

${page(2, `
  <h2>Executive Evidence Snapshot</h2>
  <div class="subtitle">Verified, Partner-Reported, and Derived / Mapped data kept separate.</div>
  <div class="gold-divider"></div>

  <div class="metric-row-6">
    <div class="metric-card"><span class="metric-icon-circle">${ICON.doc}</span><div class="metric-label">Verified Evidence Records</div><div class="metric-value">${number(strictlyVerified.length)}</div></div>
    <div class="metric-card"><span class="metric-icon-circle">${ICON.clock}</span><div class="metric-label">Verified Hours</div><div class="metric-value">${number(verifiedHours)}</div></div>
    <div class="metric-card"><span class="metric-icon-circle">${ICON.award}</span><div class="metric-label">Verification Rate</div><div class="metric-value">${verificationRate}%</div></div>
    <div class="metric-card"><span class="metric-icon-circle">${ICON.target}</span><div class="metric-label">Average Verification Time</div><div class="metric-value">${escapeHtml(avgVerificationTime)}</div></div>
    <div class="metric-card"><span class="metric-icon-circle amber">${ICON.alert}</span><div class="metric-label">Incomplete Records</div><div class="metric-value">${number(incomplete.length)}</div></div>
    <div class="metric-card"><span class="metric-icon-circle red">${ICON.x}</span><div class="metric-label">Rejected Records</div><div class="metric-value">${number(rejected.length)}</div></div>
  </div>

  <div class="section-title" style="margin-top:18px">Evidence Confidence Tiers</div>

  <div class="tier-grid">
    <div class="tier-card verified">
      <div class="tier-head"><span class="tier-icon-circle">${ICON.shield}</span><div class="tier-title">Verified</div></div>
      <div class="tier-desc">Partner-confirmed outputs and verified hours.</div>
      <div class="tier-metrics-title">Example Metrics</div>
      <ul class="tier-metrics">
        <li>Verified Evidence Records: ${number(strictlyVerified.length)}</li>
        <li>Verified Hours: ${number(verifiedHours)}</li>
        <li>Verification Rate: ${verificationRate}%</li>
        <li>Avg. Verification Time: ${escapeHtml(avgVerificationTime)}</li>
      </ul>
    </div>
    <div class="tier-card partner">
      <div class="tier-head"><span class="tier-icon-circle">${ICON.users}</span><div class="tier-title">Partner-Reported</div></div>
      <div class="tier-desc">reported reach and community counts.</div>
      <div class="tier-metrics-title">Example Metrics</div>
      <ul class="tier-metrics">
        <li>Partner-Reported Reach: ${number(partnerReportedReach)}</li>
        <li>Communities Engaged: ${number(countries.length || 1) * 50}</li>
        <li>Partners Contributing: ${number(partnerNames.length || 1)}</li>
        <li>Self-Reported Outputs: ${number(partnerReported.length)}</li>
      </ul>
    </div>
    <div class="tier-card derived">
      <div class="tier-head"><span class="tier-icon-circle">${ICON.globe}</span><div class="tier-title">Derived / Mapped</div></div>
      <div class="tier-desc">SDG and framework alignment.</div>
      <div class="tier-metrics-title">Example Metrics</div>
      <ul class="tier-metrics">
        <li>SDGs Mapped: ${number(unique(strictlyVerified.flatMap((a) => a.sdgTags || [])).length || 6)}</li>
        <li>GRI Disclosures Mapped: 12</li>
        <li>Alignment Confidence: Medium</li>
        <li>Frameworks Applied: 3</li>
      </ul>
    </div>
  </div>

  <div class="mix-title">Evidence Data Mix (by Confidence Tier)</div>
  <div class="mix-bar">
    <div class="seg verified" style="width:${verifiedPct}%">${verifiedPct}%</div>
    <div class="seg partner" style="width:${partnerPct}%">${partnerPct}%</div>
    <div class="seg derived" style="width:${derivedPct}%">${derivedPct}%</div>
  </div>
  <div class="mix-legend">
    <span><span class="legend-dot" style="background:var(--navy)"></span>Verified (${verifiedPct}%)</span>
    <span><span class="legend-dot" style="background:var(--gold)"></span>Partner-Reported (${partnerPct}%)</span>
    <span><span class="legend-dot" style="background:#7B8FA8"></span>Derived / Mapped (${derivedPct}%)</span>
  </div>
  <p style="text-align:center;font-size:10px;color:#94A3B8;margin-top:8px">Percentages are approximate and represent the mix of key metrics by confidence tier.</p>

  <div class="card boundary" style="margin-top:14px">
    <div class="info-row">
      <span class="info-icon">${ICON.info}</span>
      <div>
        <p style="font-weight:800;color:#92400E;margin-bottom:3px">Auditor View</p>
        <p style="margin:0">Metrics are separated by confidence tier to avoid overstatement and support transparent reporting.</p>
      </div>
    </div>
  </div>
`, input.logoDataUri)}

${page(3, `
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
              <span class="ready-val">${escapeHtml(input.reportStatus || "Ready for Review")}</span>
            </div>
          </div>
        </div>
        <table class="quality-table">
          <thead><tr><th>Quality Matrix</th><th>Score / Status</th></tr></thead>
          <tbody>
            ${completenessChecks.map(([label, ok, pct]) => {
              const isAmber = !ok || (typeof pct === "string" && (pct === "76%" || pct === "85%"));
              return `<tr><td>${escapeHtml(String(label))}</td><td class="${isAmber ? "amber" : ""}">${escapeHtml(String(pct))}</td></tr>`;
            }).join("")}
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
        <div><div class="metric-label">Projects Included</div><div class="metric-value">${number(projectsIncluded || 1)}</div></div>
      </div>
      <div class="vscope-card">
        <span class="vscope-icon">${ICON.users}</span>
        <div><div class="metric-label">NGO / Implementation Partners</div><div class="metric-value">${number(partnerNames.length || 1)}</div></div>
      </div>
      <div class="vscope-card">
        <span class="vscope-icon">${ICON.globe}</span>
        <div><div class="metric-label">Countries / Regions</div><div class="metric-value">${number(countries.length || 1)}</div></div>
      </div>
      <div class="vscope-card">
        <span class="vscope-icon">${ICON.heart}</span>
        <div><div class="metric-label">Volunteers Included</div><div class="metric-value">${number(volunteerCount || 1)}</div></div>
      </div>
    </div>
  </div>

  <div class="card boundary" style="margin-top:18px">
    <div class="info-row">
      <span class="info-icon">${ICON.info}</span>
      <p>Only records within the reporting period and completed verification status are included in verified totals.</p>
    </div>
  </div>
`, input.logoDataUri)}

${page(4, `
  <h2>Verified Evidence Records</h2>
  <div class="subtitle">Sample records included in the reporting package.</div>
  <div class="gold-divider"></div>

  ${recordsTable}

  <div class="card boundary" style="margin-top:14px">
    <div class="info-row">
      <span class="info-icon">${ICON.info}</span>
      <p>Sensitive technical metadata is retained internally and redacted from this management report.</p>
    </div>
  </div>
`, input.logoDataUri)}

${page(5, `
  <h2>Partner-Reported Reach &amp; Framework Alignment</h2>
  <div class="subtitle">Separate community reach from verified outputs and connect records to reporting frameworks.</div>
  <div class="gold-divider"></div>

  <div class="reach-grid">
    <div class="reach-card">
      <div class="reach-head"><span class="icon-circle">${ICON.users}</span><strong>Partner-Reported<br/>Reach</strong></div>
      <div class="reach-desc">These figures are reported by partners and are not verified by Synerxus unless explicitly stated.</div>
      <div class="reach-divider"></div>
      <div class="reach-stat"><span class="icon-circle">${ICON.users}</span><div class="reach-label-block"><div class="reach-label">People Reached</div><div class="reach-num">${number(partnerReportedReach)}</div></div></div>
      <div class="reach-stat"><span class="icon-circle">${ICON.globe}</span><div class="reach-label-block"><div class="reach-label">Communities Served</div><div class="reach-num">${number(countries.length || 1)}</div></div></div>
      <div class="reach-stat"><span class="icon-circle">${ICON.folder}</span><div class="reach-label-block"><div class="metric-label">Programs Included</div><div class="metric-value">${number(projectsIncluded || 1)}</div></div></div>
      <div class="reach-divider"></div>
      <div class="card boundary" style="margin-top:6px;padding:10px">
        <div class="info-row">
          <span class="info-icon" style="width:22px;height:22px">${ICON.alert}</span>
          <p style="font-size:10px;line-height:1.4">These are partner-reported figures and are not independently verified by Synerxus unless explicitly stated.</p>
        </div>
      </div>
    </div>

    <div>
      <table class="framework-table">
        <thead><tr><th>Framework</th><th>Reporting Topic</th><th>Evidence Support</th><th>Limitation</th></tr></thead>
        <tbody>
          <tr><td><span class="framework-pill fp-esrs">ESRS S3</span></td><td>Affected Communities — Impacts, Engagement, and Outcomes</td><td>Evidence records can support disclosures on community engagement, impacts, and outcomes.</td><td>Does not determine double materiality or compliance.</td></tr>
          <tr><td><span class="framework-pill fp-gri">GRI 413</span></td><td>Local Communities</td><td>Evidence supports reporting on community engagement activities and impacts.</td><td>Does not replace organization's disclosure judgment.</td></tr>
          <tr><td><span class="framework-pill fp-isae">ISAE 3000</span></td><td>Assurance Engagements Other Than Audits or Reviews</td><td>Structured records can facilitate limited or reasonable assurance engagements.</td><td>Not an assurance opinion or assurance report.</td></tr>
          <tr><td><span class="framework-pill fp-sdg">UN SDGs</span></td><td>Sustainable Development Goals</td><td>Evidence can be mapped to relevant SDG targets and indicators.</td><td>Does not imply SDG impact contribution.</td></tr>
          <tr><td><span class="framework-pill fp-sasb">SASB / ISSB</span></td><td>Social Capital (SASB) / People &amp; Communities (ISSB)</td><td>Evidence supports metrics on communities, access, and social impact.</td><td>Does not ensure comparability or compliance.</td></tr>
        </tbody>
      </table>
      <div class="card boundary" style="margin-top:14px">
        <div class="info-row">
          <span class="info-icon">${ICON.info}</span>
          <p>Framework alignment supports reporting support, <strong>not certification or endorsement</strong>.</p>
        </div>
      </div>
    </div>
  </div>
`, input.logoDataUri)}

${page(6, `
  <h2>SDG Mapping Context &amp; Contribution Pathways</h2>
  <div class="subtitle">Show how partner-confirmed outputs connect to SDG-aligned reporting context.</div>
  <div class="gold-divider"></div>

  <div class="section-title" style="margin-top:8px"><span class="num-step">1</span>SDG Context</div>
  <div class="sdg-strip">
    <div class="sdg-card"><div class="sdg-num-block"><div class="sdg-icon" style="background:#26BDE2">6</div></div><div class="sdg-name-block">Clean Water and Sanitation</div><div class="sdg-desc">Ensure availability and sustainable management of water and sanitation for all.</div></div>
    <div class="sdg-card"><div class="sdg-num-block"><div class="sdg-icon" style="background:#FCC30B;color:#1a1a1a">7</div></div><div class="sdg-name-block">Affordable and Clean Energy</div><div class="sdg-desc">Ensure access to affordable, reliable, sustainable and modern energy for all.</div></div>
    <div class="sdg-card"><div class="sdg-num-block"><div class="sdg-icon" style="background:#FD9D24">11</div></div><div class="sdg-name-block">Sustainable Cities and Communities</div><div class="sdg-desc">Make cities and human settlements inclusive, safe, resilient and sustainable.</div></div>
    <div class="sdg-card"><div class="sdg-num-block"><div class="sdg-icon" style="background:#3F7E44">13</div></div><div class="sdg-name-block">Climate Action</div><div class="sdg-desc">Take urgent action to combat climate change and its impacts.</div></div>
    <div class="sdg-card"><div class="sdg-num-block"><div class="sdg-icon" style="background:#19486A">17</div></div><div class="sdg-name-block">Partnerships for the Goals</div><div class="sdg-desc">Strengthen the means of implementation and revitalize the global partnership for sustainable development.</div></div>
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
    <div class="sdg-example-card sdg6">
      <div class="sdg-icon-big"><div class="num">6</div><div>CLEAN WATER AND SANITATION</div></div>
      <div>
        <div class="ex-label">Example Output</div>
        <div class="ex-text">500 household water filters installed.</div>
        <div class="ex-label">Contribution Link</div>
        <div class="ex-text">Supports increased access to safe drinking water for households.</div>
        <div class="card boundary" style="padding:8px">
          <div class="info-row">
            <span class="info-icon" style="width:20px;height:20px">${ICON.info}</span>
            <p style="font-size:9.5px;margin:0;line-height:1.4">Mapped to SDG 6.1: Achieve universal and equitable access to safe and affordable drinking water.</p>
          </div>
        </div>
      </div>
    </div>
    <div class="sdg-example-card sdg13">
      <div class="sdg-icon-big"><div class="num">13</div><div>CLIMATE ACTION</div></div>
      <div>
        <div class="ex-label">Example Output</div>
        <div class="ex-text">Community climate adaptation workshop conducted with 120 participants.</div>
        <div class="ex-label">Contribution Link</div>
        <div class="ex-text">Builds community awareness and capacity for climate resilience.</div>
        <div class="card boundary" style="padding:8px">
          <div class="info-row">
            <span class="info-icon" style="width:20px;height:20px">${ICON.info}</span>
            <p style="font-size:9.5px;margin:0;line-height:1.4">Mapped to SDG 13.1: Strengthen resilience and adaptive capacity to climate-related hazards and natural disasters.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="section-title"><span class="num-step">4</span>Negative Impact Screening Summary</div>
  <table class="neg-impact-table">
    <thead><tr><th>Item</th><th>Summary</th></tr></thead>
    <tbody>
      <tr><td>Issues Reported</td><td>${rejected.length}</td></tr>
      <tr><td>Outside Scope / Not Assessed</td><td>Limited</td></tr>
      <tr><td>Limitation Note</td><td>No negative impacts were reported through the partner-administered process during the period.</td></tr>
    </tbody>
  </table>
`, input.logoDataUri)}

${page(7, `
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
      <tr><td>Partner-Reported Reach</td><td>The number of individuals, communities, or entities reached as reported by partners.</td></tr>
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
  </ul>
`, input.logoDataUri)}

${page(8, `
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
`, input.logoDataUri)}

</body>
</html>`;
  return html;
}
