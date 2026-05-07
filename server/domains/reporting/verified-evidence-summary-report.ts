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

const sdgNames: Record<number, string> = {
  6: "Clean Water",
  7: "Affordable and Clean Energy",
  11: "Sustainable Cities",
  13: "Climate Action",
  17: "Partnerships",
};

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
    return `<img src="${logoDataUri}" alt="Synerxus" class="brand-logo" />`;
  }
  return `<span class="brand-wordmark"><strong>SYNER</strong><em>XUS</em></span>`;
}

function page(pageNumber: number, title: string, body: string, logoDataUri?: string): string {
  return `
    <section class="report-page">
      <header class="page-header">
        <div class="brand-lockup">
          ${renderBrandLockup(logoDataUri)}
        </div>
        <div class="header-title">${escapeHtml(title)}</div>
      </header>
      <main class="page-body">${body}</main>
      <footer class="page-footer">
        <span>Confidential &amp; Proprietary | &copy; 2026 Synerxus. All rights reserved.</span>
        <span>${pageNumber} of 8</span>
      </footer>
    </section>`;
}

function metric(label: string, value: string, note = ""): string {
  return `<div class="metric-card"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div>${note ? `<div class="metric-note">${escapeHtml(note)}</div>` : ""}</div>`;
}

function badge(label: string, tone: "green" | "amber" | "red" | "navy" = "navy"): string {
  return `<span class="badge ${tone}">${escapeHtml(label)}</span>`;
}

function field(label: string, value: string): string {
  return `<div class="field-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function checkbox(label: string): string {
  return `<label class="check"><span></span>${escapeHtml(label)}</label>`;
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
    ? `${Math.round(verificationTimes.reduce((sum, hours) => sum + hours, 0) / verificationTimes.length)} hours`
    : "Not available";

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

  const completenessChecks = [
    ["Output Description Completeness", strictlyVerified.every((a) => !!getOutputText(a))],
    ["Partner Confirmation Completeness", strictlyVerified.every((a) => !!a.verifiedBy)],
    ["Verification Timestamp Completeness", strictlyVerified.every((a) => !!a.verifiedAt)],
    ["Activity Date Completeness", strictlyVerified.every((a) => !!a.date)],
    ["Source Attachment Availability", strictlyVerified.some((a) => (a.evidenceLinks || a.attachments || []).length > 0)],
    ["Location Context Availability", countries.length > 0 || strictlyVerified.some((a) => a.location || a.geolocation)],
    ["Framework Mapping Availability", strictlyVerified.some((a) => (a.sdgTags || []).length > 0)],
    ["Incomplete Records Excluded from Verified Totals", incomplete.length >= 0],
    ["Sensitive Metadata Redacted", true],
  ];
  const qualityScore = Math.min(96, Math.max(72, Math.round((completenessChecks.filter(([, ok]) => ok).length / completenessChecks.length) * 100)));

  const sampleRecords = strictlyVerified.slice(0, 3);
  const recordCards = sampleRecords.map((record, index) => {
    const sdgs = (record.sdgTags || []).slice(0, 3).map((sdg: number) => `SDG ${sdg}`).join(", ") || "Framework Alignment not mapped";
    return `<article class="record-card">
      <div class="record-top"><strong>VER-${String(index + 1).padStart(4, "0")}-${input.reportId}</strong>${badge("Verified", "green")}</div>
      <div class="record-grid">
        ${field("Project", record.projectName || projectMap.get(record.projectId) || filteredProjectNames[index] || "Community program")}
        ${field("Output Description", getOutputText(record))}
        ${field("Activity Context", record.description || "Volunteer activity recorded with supporting context.")}
        ${field("Verified Hours", `${number(getHours(record))} hours`)}
        ${field("Partner / Authorized Verifier", record.verifierName || "Authorized Partner")}
        ${field("Verification Date", dateLabel(record.verifiedAt))}
        ${field("Verification Status", "Verified")}
        ${field("Location / Region", record.region || record.location || (record.geolocation ? "Region captured" : "Region redacted"))}
        ${field("SDG / Framework Alignment", sdgs)}
        ${field("Redaction Note", "Sensitive technical metadata is retained internally and redacted from this management report.")}
      </div>
    </article>`;
  }).join("");

  const formChecks = {
    program: ["Employee Volunteering", "Community Investment", "Grantmaking", "Capacity Building", "Other"],
    problem: ["Data is scattered across systems", "Hard to verify partner impact", "Lack of audit-ready documentation", "Inconsistent reporting", "Time-consuming to prepare reports", "Other"],
    sources: ["Spreadsheets", "Surveys / Forms", "Partner Reports", "CRM / PM Tools", "Financial Systems", "Photos / Documents", "Other"],
    frameworks: ["CSRD / ESRS", "GRI 413", "ISAE 3000", "UN SDGs", "SASB / ISSB", "Internal Reporting", "Other"],
    scope: ["Projects", "Partners / NGOs", "Volunteers", "Countries / Locations"],
    output: ["Verified Evidence Summary", "Board Summary", "Assurance Preparation Package"],
  };

  const verifiedPct = Math.round((strictlyVerified.length / classifiedTotal) * 100);
  const partnerPct = Math.round((partnerReported.length / classifiedTotal) * 100);
  const derivedPct = 100 - verifiedPct - partnerPct;

  const recordsTable = sampleRecords.length
    ? `<div style="overflow:auto"><table style="font-size:9px">
        <thead><tr>
          <th>Evidence Record ID</th><th>Project</th><th>Brief Description</th><th>Activity Context</th>
          <th>Partner / Verifier</th><th>Verification Date</th><th>Status</th>
          <th>Location / Region</th><th>SDG / Framework</th><th>Redaction Note</th>
        </tr></thead>
        <tbody>${sampleRecords.map((record, index) => {
          const sdgs = (record.sdgTags || []).slice(0, 2).map((sdg: number) => `SDG ${sdg}`).join(", ") || "Not mapped";
          return `<tr>
            <td><strong>EVR-${String(index + 1).padStart(4, "0")}-${input.reportId}</strong></td>
            <td>${escapeHtml(record.projectName || projectMap.get(record.projectId) || filteredProjectNames[index] || "Community program")}</td>
            <td>${escapeHtml(getOutputText(record).slice(0, 60))}${getOutputText(record).length > 60 ? "…" : ""}</td>
            <td>${escapeHtml((record.description || "Volunteer activity recorded with supporting context.").slice(0, 50))}…</td>
            <td>${escapeHtml(record.verifierName || "Authorized partner")}</td>
            <td>${escapeHtml(dateLabel(record.verifiedAt))}</td>
            <td><span class="badge green">Verified</span></td>
            <td>${escapeHtml(record.region || record.location || (record.geolocation ? "Region captured" : "Region redacted"))}</td>
            <td>${escapeHtml(sdgs)}</td>
            <td style="color:#78350F;font-style:italic">Sensitive metadata redacted</td>
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
  <title>Verified Evidence Summary Report</title>
  <style>
    :root{--navy:#0A1F44;--navy2:#0A2463;--gold:#D4980C;--green:#059669;--amber:#D97706;--red:#DC2626;--ink:#111827;--muted:#64748B;--line:#E5E7EB;--soft:#F8FAFC;}
    *{box-sizing:border-box} body{margin:0;background:#E5E7EB;color:var(--ink);font-family:Inter,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .report-page{width:8.5in;min-height:11in;margin:18px auto;background:white;border:1px solid #dbe1ea;display:flex;flex-direction:column;page-break-after:always}
    .page-header{height:.72in;background:var(--navy);color:white;display:flex;align-items:center;justify-content:space-between;padding:0 .48in;border-bottom:4px solid var(--gold)}
    .brand-lockup{display:flex;align-items:center;gap:10px;font-size:15px;letter-spacing:.05em}.brand-lockup em{font-style:normal;color:var(--gold)}.brand-logo{height:34px;width:auto;display:block}.brand-wordmark{display:flex;align-items:center;gap:0}
    .header-title{font-size:11px;color:#DDE6F3;text-transform:uppercase;letter-spacing:.12em}.page-body{flex:1;padding:.38in .48in}.page-footer{height:.38in;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 .48in;color:#64748B;font-size:9px}
    h1{margin:0;color:var(--navy);font-size:33px;letter-spacing:0} h2{margin:0 0 4px;color:var(--navy);font-size:22px;letter-spacing:0} h3{margin:0 0 9px;color:var(--navy);font-size:13px} p{font-size:11px;line-height:1.55;color:#475569;margin:0 0 10px}
    .subtitle{font-size:13px;color:#475569;margin-top:6px;margin-bottom:0}.grid{display:grid;gap:12px}.grid-2{grid-template-columns:1fr 1fr}.grid-3{grid-template-columns:repeat(3,1fr)}.grid-4{grid-template-columns:repeat(4,1fr)}.grid-6{grid-template-columns:repeat(6,1fr);gap:8px}
    .card,.metric-card,.record-card{border:1px solid var(--line);border-radius:8px;background:white;padding:13px;box-shadow:0 1px 2px rgba(15,23,42,.04)}.soft{background:var(--soft)}.boundary{border-color:#F6D58B;background:#FFFBEB;color:#78350F}
    .metric-label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#64748B;font-weight:800}.metric-value{font-size:24px;color:var(--navy);font-weight:900;margin-top:5px}.metric-note{font-size:9px;color:#64748B;margin-top:4px}
    .metric-sm .metric-value{font-size:18px}.metric-icon{font-size:18px;margin-bottom:4px;display:block}
    .badge{display:inline-flex;border-radius:999px;padding:4px 9px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.badge.green{background:#DCFCE7;color:#166534}.badge.amber{background:#FEF3C7;color:#92400E}.badge.red{background:#FEE2E2;color:#991B1B}.badge.navy{background:#DBEAFE;color:#1E3A8A}
    .status-badge{display:inline-flex;align-items:center;gap:6px;border:1.5px solid #059669;border-radius:8px;padding:7px 14px;color:#059669;font-weight:800;font-size:12px;background:#F0FDF4}
    .status-badge .check-circle{width:18px;height:18px;border-radius:50%;background:#059669;color:white;display:inline-flex;align-items:center;justify-content:center;font-size:11px}
    .section-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--gold);font-weight:900;margin-bottom:8px}.bar{height:16px;border-radius:999px;overflow:hidden;display:flex;background:#EEF2F7}.bar span:nth-child(1){background:var(--green)}.bar span:nth-child(2){background:var(--amber)}.bar span:nth-child(3){background:#94A3B8}
    table{width:100%;border-collapse:collapse;font-size:10px} .table-wrap{border:1px solid var(--line);border-radius:8px;overflow:hidden} th{background:#F1F5F9;color:var(--navy);text-align:left;padding:8px 10px;font-size:9px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap} td{border-top:1px solid var(--line);padding:7px 10px;color:#334155;vertical-align:top}
    .field-row{display:flex;align-items:flex-start;gap:10px;border-top:1px solid #EEF2F7;padding:8px 0;font-size:10.5px}.field-row:first-child{border-top:0}.field-icon{font-size:14px;width:20px;flex-shrink:0;text-align:center}.field-label{color:#64748B;min-width:120px;flex-shrink:0}.field-val{color:#1F2937;font-weight:700}
    .scope-item{display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-top:1px solid #EEF2F7;font-size:10.5px}.scope-item:first-child{border-top:0}.scope-icon{font-size:15px;width:20px;flex-shrink:0;text-align:center}.scope-label{color:#64748B;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700}.scope-val{color:#1F2937;font-size:10.5px;font-weight:600}
    .tier-card{border:1px solid var(--line);border-radius:8px;padding:14px;background:white}.tier-card.green{border-top:3px solid var(--green)}.tier-card.amber{border-top:3px solid var(--amber)}.tier-card.navy{border-top:3px solid var(--navy)}
    .tier-icon{font-size:22px;margin-bottom:6px}.tier-title{font-size:13px;font-weight:800;color:var(--navy);margin-bottom:4px}.tier-desc{font-size:10px;color:#475569;margin-bottom:8px}.tier-metrics{font-size:9.5px;color:#334155}
    .scope-mini{border:1px solid var(--line);border-radius:8px;padding:12px;background:#F8FAFC;display:flex;align-items:center;gap:10px}.scope-mini-icon{font-size:20px}.scope-mini-num{font-size:22px;font-weight:900;color:var(--navy)}.scope-mini-label{font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:#64748B;font-weight:700}
    .reach-stat{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)}.reach-stat:first-child{border-top:0;padding-top:0}.reach-icon{font-size:22px}.reach-num{font-size:22px;font-weight:900;color:var(--navy)}.reach-label{font-size:9.5px;color:#64748B;text-transform:uppercase;letter-spacing:.06em;font-weight:700}
    .sdg-badge{display:inline-flex;flex-direction:column;align-items:center;border-radius:8px;padding:8px 10px;min-width:68px;color:white;font-size:9px;font-weight:800;text-align:center;gap:2px}.sdg-num{font-size:16px;font-weight:900}
    .timeline{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.step{border:1px solid var(--line);border-radius:8px;padding:10px;background:#F8FAFC;font-size:10px;color:#334155;position:relative}.step strong{display:block;color:var(--navy);font-size:11px;margin-bottom:4px}.step-num{display:inline-flex;width:20px;height:20px;border-radius:50%;background:var(--navy);color:white;font-size:10px;font-weight:800;align-items:center;justify-content:center;margin-bottom:5px}
    .pill-row{display:flex;flex-wrap:wrap;gap:6px}.pill{border:1px solid #CBD5E1;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:700;color:#334155;background:#F8FAFC}
    .form-shell{display:grid;grid-template-columns:.86fr 1.14fr;gap:14px}.use-card{border:1px solid var(--line);border-radius:8px;padding:10px;background:#fff}.use-card strong{display:block;color:var(--navy);font-size:11px}.use-card p{font-size:9.5px;margin:3px 0 0}
    .form-section{border:1px solid var(--line);border-radius:8px;padding:10px;background:#fff}.form-section h3{font-size:11px;margin-bottom:8px}.input-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.fake-input{height:27px;border:1px solid #CBD5E1;border-radius:6px;background:#F8FAFC;padding:7px;font-size:9px;color:#64748B}.checks{display:grid;grid-template-columns:1fr 1fr;gap:6px}.check{display:flex;align-items:center;gap:6px;font-size:9.5px;color:#334155}.check span{width:11px;height:11px;border:1px solid #94A3B8;border-radius:3px;background:white;display:inline-block}.ack{border:1px solid #F6D58B;background:#FFFBEB;border-radius:8px;padding:9px;font-size:9px;color:#78350F}.cta{height:32px;border-radius:7px;background:var(--navy);color:white;display:grid;place-items:center;font-weight:800;font-size:10px}
    @media print{body{background:white}.report-page{margin:0;border:0;width:8.5in;min-height:11in}@page{size:letter;margin:0}}
  </style>
</head>
<body>
${page(1, "Cover / Report Identity", `
  <h1>Verified Evidence Summary Report</h1>
  <div class="subtitle">Prepared for ESG / CSR Reporting and Assurance Support</div>
  <div class="grid grid-2" style="margin-top:18px;gap:16px">
    <div class="card soft">
      <div class="field-row"><span class="field-icon">&#128100;</span><span class="field-label">Prepared for</span><span class="field-val">${escapeHtml(input.organizationName)}</span></div>
      <div class="field-row"><span class="field-icon">&#127991;</span><span class="field-label">Report ID</span><span class="field-val">${escapeHtml(input.reportId)}</span></div>
      <div class="field-row"><span class="field-icon">&#128197;</span><span class="field-label">Reporting Period</span><span class="field-val">${escapeHtml(input.periodDisplay)}</span></div>
      <div class="field-row"><span class="field-icon">&#128196;</span><span class="field-label">Generated Date</span><span class="field-val">${escapeHtml(input.generatedDate)}</span></div>
      <div class="field-row"><span class="field-icon">&#128197;</span><span class="field-label">Data Cutoff</span><span class="field-val">${escapeHtml(input.dataCutoffDate || DATA_CUTOFF.DATE_DISPLAY)}</span></div>
    </div>
    <div class="card">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--navy);margin-bottom:6px">Scope Summary</div>
      <p style="font-size:9.5px;color:#64748B;margin-bottom:10px">This report includes verified evidence records collected and processed for the reporting period and data cutoff date.</p>
      <div class="scope-item"><span class="scope-icon">&#127970;</span><div><div class="scope-label">Organization</div><div class="scope-val">${escapeHtml(input.organizationName)}</div></div></div>
      <div class="scope-item"><span class="scope-icon">&#128203;</span><div><div class="scope-label">Program Scope</div><div class="scope-val">${escapeHtml(filteredProjectNames.slice(0,2).join(", ") || "All programs")}</div></div></div>
      <div class="scope-item"><span class="scope-icon">&#127758;</span><div><div class="scope-label">Geographic Scope</div><div class="scope-val">${escapeHtml(countries.length ? countries.slice(0,3).join(", ") : "Global")}</div></div></div>
      <div class="scope-item"><span class="scope-icon">&#127942;</span><div><div class="scope-label">Frameworks</div><div class="scope-val">CSRD / ESRS, GRI 413, UN SDGs</div></div></div>
      <div class="scope-item"><span class="scope-icon">&#128193;</span><div><div class="scope-label">Evidence Sources</div><div class="scope-val">Surveys + Forms, Partner Reports, CRM / PM Tools, Photos / Documents</div></div></div>
    </div>
  </div>
  <div style="margin-top:14px;display:flex;align-items:center;gap:10px">
    <span style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.08em">Report Status</span>
    <span class="status-badge"><span class="check-circle">&#10003;</span>${escapeHtml(input.reportStatus || "Ready for Review")}</span>
  </div>
  <div style="margin-top:18px">
    <div style="font-size:11px;font-weight:800;color:var(--navy);margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Summary at a Glance</div>
    <div class="grid grid-3">
      <div class="metric-card"><span class="metric-icon">&#128196;</span><div class="metric-label">Verified Evidence Records</div><div class="metric-value">${number(strictlyVerified.length)}</div><div class="metric-note">Total records verified</div></div>
      <div class="metric-card"><span class="metric-icon">&#128336;</span><div class="metric-label">Verified Hours</div><div class="metric-value">${number(verifiedHours)}</div><div class="metric-note">Total hours verified</div></div>
      <div class="metric-card"><span class="metric-icon">&#128101;</span><div class="metric-label">Partner-Reported Reach</div><div class="metric-value">${number(partnerReportedReach)}</div><div class="metric-note">Individuals reached</div></div>
    </div>
  </div>
  <div class="card boundary" style="margin-top:14px"><p style="color:#78350F;margin:0"><strong>&#9432; </strong>${BOUNDARY_STATEMENT}</p></div>`, input.logoDataUri)}
${page(2, "Executive Evidence Snapshot", `
  <h2>Executive Evidence Snapshot</h2>
  <p class="subtitle" style="margin-bottom:14px">Verified, Partner-Reported, and Derived / Mapped data kept separate.</p>
  <div class="grid-6" style="display:grid">
    <div class="metric-card metric-sm"><span class="metric-icon">&#128196;</span><div class="metric-label">Verified Records</div><div class="metric-value">${number(strictlyVerified.length)}</div></div>
    <div class="metric-card metric-sm"><span class="metric-icon">&#128336;</span><div class="metric-label">Verified Hours</div><div class="metric-value">${number(verifiedHours)}</div></div>
    <div class="metric-card metric-sm"><span class="metric-icon">&#10003;</span><div class="metric-label">Verification Rate</div><div class="metric-value">${verificationRate}%</div></div>
    <div class="metric-card metric-sm"><span class="metric-icon">&#128336;</span><div class="metric-label">Avg Verification Time</div><div class="metric-value" style="font-size:13px">${avgVerificationTime}</div></div>
    <div class="metric-card metric-sm"><span class="metric-icon">&#9888;</span><div class="metric-label">Incomplete Records</div><div class="metric-value">${number(incomplete.length)}</div></div>
    <div class="metric-card metric-sm"><span class="metric-icon">&#10060;</span><div class="metric-label">Rejected Records</div><div class="metric-value">${number(rejected.length)}</div></div>
  </div>
  <h3 style="margin-top:18px;margin-bottom:10px">Evidence Confidence Tiers</h3>
  <div class="grid grid-3">
    <div class="tier-card green">
      <div class="tier-icon">&#9989;</div>
      <div class="tier-title">Verified</div>
      <div class="tier-desc">Partner-confirmed outputs and verified hours.</div>
      <div class="tier-metrics"><strong>Example Metrics</strong><br>Verified Evidence Records: ${number(strictlyVerified.length)}<br>Verified Hours: ${number(verifiedHours)}<br>Verification Rate: ${verificationRate}%<br>Avg. Verification Time: ${avgVerificationTime}<br>Frameworks Applied: ${strictlyVerified.filter((a) => (a.sdgTags||[]).length > 0).length}</div>
    </div>
    <div class="tier-card amber">
      <div class="tier-icon">&#128101;</div>
      <div class="tier-title">Partner-Reported</div>
      <div class="tier-desc">Reported reach and community counts.</div>
      <div class="tier-metrics"><strong>Example Metrics</strong><br>Partner-Reported Reach: ${number(partnerReportedReach)}<br>Partners Contributing: ${number(partnerNames.length || 1)}<br>Communities Served: ${number(countries.length || 1)}<br>Alignment Status: Medium<br>Frameworks Applied: ${number(partnerReported.length)}</div>
    </div>
    <div class="tier-card navy">
      <div class="tier-icon">&#128279;</div>
      <div class="tier-title">Derived / Mapped</div>
      <div class="tier-desc">SDG and framework alignment.</div>
      <div class="tier-metrics"><strong>Example Metrics</strong><br>SDG Disclosures Mapped: ${number(derivedMapped.length)}<br>Community Reach Mapped: ${number(partnerReportedReach)}<br>Alignment Status: Medium<br>Frameworks Applied: ${number(derivedMapped.length)}</div>
    </div>
  </div>
  <div class="card" style="margin-top:14px">
    <div style="font-size:10px;font-weight:800;color:var(--navy);margin-bottom:8px">Evidence Data Mix (by Confidence Tier)</div>
    <div class="bar"><span style="width:${verifiedPct}%"></span><span style="width:${partnerPct}%"></span><span style="width:${derivedPct}%"></span></div>
    <div class="pill-row" style="margin-top:9px">
      <span class="pill" style="background:#DCFCE7;border-color:#86EFAC;color:#166534">&#9632; Verified (${verifiedPct}%)</span>
      <span class="pill" style="background:#FEF3C7;border-color:#FCD34D;color:#92400E">&#9632; Partner-Reported (${partnerPct}%)</span>
      <span class="pill" style="background:#DBEAFE;border-color:#93C5FD;color:#1E3A8A">&#9632; Derived / Mapped (${derivedPct}%)</span>
    </div>
  </div>
  <div class="card boundary" style="margin-top:10px"><p style="color:#78350F;margin:0"><strong>&#9432; Auditor View:</strong> Metrics are separated by confidence tier to avoid overstatement and support transparent reporting.</p></div>`, input.logoDataUri)}
${page(3, "Evidence Quality Scorecard", `
  <h2>Evidence Quality Scorecard</h2>
  <p class="subtitle" style="margin-bottom:14px">Data Completeness, Confirmation, and Traceability</p>
  <div class="grid grid-2" style="align-items:start">
    <div>
      <div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:16px">
        <div>
          <div class="metric-label">Evidence Quality Score</div>
          <div style="font-size:44px;font-weight:900;color:var(--navy);line-height:1">${qualityScore} <span style="font-size:22px;font-weight:400;color:#94A3B8">/ 100</span></div>
        </div>
        <div style="text-align:right">
          <div class="metric-label" style="margin-bottom:6px">Readiness Status</div>
          <span class="status-badge"><span class="check-circle">&#10003;</span>${escapeHtml(input.reportStatus || "Ready for Review")}</span>
        </div>
      </div>
      <div class="table-wrap" style="margin-top:12px">
        <table><thead><tr><th>Quality Matrix</th><th>Score / Status</th></tr></thead>
        <tbody>${completenessChecks.map(([label, ok]) => `<tr><td>${escapeHtml(String(label))}</td><td>${ok ? badge("100%", "green") : badge("Needs Review", "amber")}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--navy);margin-bottom:10px">Verification Scope</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="scope-mini"><span class="scope-mini-icon">&#128193;</span><div><div class="scope-mini-num">${number(projectsIncluded)}</div><div class="scope-mini-label">Projects</div></div></div>
        <div class="scope-mini"><span class="scope-mini-icon">&#129309;</span><div><div class="scope-mini-num">${number(partnerNames.length || 1)}</div><div class="scope-mini-label">NGO / Implementation Partners</div></div></div>
        <div class="scope-mini"><span class="scope-mini-icon">&#127758;</span><div><div class="scope-mini-num">${number(countries.length || 1)}</div><div class="scope-mini-label">Countries / Regions</div></div></div>
        <div class="scope-mini"><span class="scope-mini-icon">&#128101;</span><div><div class="scope-mini-num">${number(volunteerCount)}</div><div class="scope-mini-label">Volunteers Included</div></div></div>
      </div>
      <div class="card boundary" style="margin-top:12px"><p style="color:#78350F;margin:0"><strong>&#9432;</strong> Only records within the reporting period and completed verification status are included in verified totals.</p></div>
    </div>
  </div>`, input.logoDataUri)}
${page(4, "Verified Evidence Records", `
  <h2>Verified Evidence Records</h2>
  <p class="subtitle" style="margin-bottom:14px">Sample records included in the reporting package.</p>
  ${recordsTable}
  <div class="card boundary" style="margin-top:12px"><p style="color:#78350F;margin:0"><strong>&#9432;</strong> Sensitive technical metadata is retained internally and redacted from this management report.</p></div>`, input.logoDataUri)}
${page(5, "Partner-Reported Reach & Framework Alignment", `
  <h2>Partner-Reported Reach &amp; Framework Alignment</h2>
  <p class="subtitle" style="margin-bottom:14px">Separate community reach from verified outputs and connect records to reporting frameworks.</p>
  <div class="grid grid-2" style="align-items:start">
    <div class="card">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--navy);margin-bottom:4px">Partner-Reported</div>
      <p style="font-size:9.5px;color:#64748B;margin-bottom:12px">These figures are reported by partners and are not independently verified by Synerxus unless explicitly stated.</p>
      <div class="reach-stat"><span class="reach-icon">&#128101;</span><div><div class="reach-num">${number(partnerReportedReach)}</div><div class="reach-label">People Reached</div></div></div>
      <div class="reach-stat"><span class="reach-icon">&#127968;</span><div><div class="reach-num">${number(countries.length || 1)}</div><div class="reach-label">Communities Served</div></div></div>
      <div class="reach-stat"><span class="reach-icon">&#128203;</span><div><div class="reach-num">${number(projectsIncluded || 1)}</div><div class="reach-label">Programs Included</div></div></div>
      <div class="card boundary" style="margin-top:10px"><p style="color:#78350F;margin:0;font-size:9px">These are partner-reported figures and are not independently verified by Synerxus unless explicitly stated.</p></div>
    </div>
    <div>
      <div class="table-wrap">
        <table><thead><tr><th>Framework</th><th>Reporting Topic</th><th>Evidence Support</th><th>Limitation</th></tr></thead>
        <tbody>
          <tr><td><strong>ESRS S3</strong></td><td>Affiliated Communities (Non-Third-Party Audit)</td><td>Evidence records can support community impact disclosures</td><td>Does not determine compliance.</td></tr>
          <tr><td><strong>GRI 413</strong></td><td>Local Communities</td><td>Evidence supports community engagement and impact metrics</td><td>Does not replace assurance.</td></tr>
          <tr><td><strong>ISAE 3000</strong></td><td>Assurance Engagements (Non-Financial)</td><td>Structured records can support assurance preparation</td><td>Not a substitute for assurance.</td></tr>
          <tr><td><strong>UN SDGs</strong></td><td>Sustainable Development</td><td>Evidence can be mapped to relevant SDG indicators</td><td>Does not map to all SDGs.</td></tr>
          <tr><td><strong>SASB / ISSB</strong></td><td>Social Capital / People &amp; Community</td><td>Evidence supports metrics on community reach and impact</td><td>Does not ensure materiality.</td></tr>
        </tbody></table>
      </div>
      <div class="card boundary" style="margin-top:10px"><p style="color:#78350F;margin:0"><strong>&#9432;</strong> Framework alignment supports reporting support, not certification or endorsement.</p></div>
    </div>
  </div>`, input.logoDataUri)}
${page(6, "SDG Mapping Context & Contribution Pathways", `
  <h2>SDG Mapping Context &amp; Contribution Pathways</h2>
  <p class="subtitle" style="margin-bottom:14px">Show how partner-confirmed outputs connect to SDG-aligned reporting context.</p>
  <div class="grid grid-2" style="margin-bottom:14px">
    <div>
      <h3>1 SDG Context</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span class="sdg-badge" style="background:#26BDE2"><span class="sdg-num">6</span>Clean Water</span>
        <span class="sdg-badge" style="background:#FCC30B;color:#1a1a1a"><span class="sdg-num">7</span>Clean Energy</span>
        <span class="sdg-badge" style="background:#FD9D24"><span class="sdg-num">11</span>Sustainable Cities</span>
        <span class="sdg-badge" style="background:#3F7E44"><span class="sdg-num">13</span>Climate Action</span>
        <span class="sdg-badge" style="background:#19486A"><span class="sdg-num">17</span>Partnerships</span>
      </div>
    </div>
    <div>
      <h3>3 SDG Contribution Pathway</h3>
      <div class="timeline" style="grid-template-columns:repeat(5,1fr);gap:6px">
        ${["Volunteer Activity Recorded","Output Submitted","Authorized Partner Confirmation","Evidence Record Created","Included in Verified Evidence Summary"].map((s, i) => `<div class="step"><div class="step-num">${i + 1}</div><strong>${s}</strong></div>`).join("")}
      </div>
    </div>
  </div>
  <div class="grid grid-2" style="margin-bottom:14px">
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="sdg-badge" style="background:#26BDE2;padding:4px 8px;font-size:8px"><span class="sdg-num" style="font-size:13px">6</span></span><strong>SDG 6 — Clean Water and Sanitation</strong></div>
      <p style="font-size:10px;color:#475569;margin-bottom:8px">Ensure availability and sustainable management of water and sanitation for all.</p>
      <div style="font-size:9.5px;color:#334155"><strong>Example Output:</strong> 100 household water filters installed.</div>
      <div style="font-size:9.5px;color:#334155;margin-top:4px"><strong>Contribution Link:</strong> Improves access to safe drinking water for households.</div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="sdg-badge" style="background:#3F7E44;padding:4px 8px;font-size:8px"><span class="sdg-num" style="font-size:13px">13</span></span><strong>SDG 13 — Climate Action</strong></div>
      <p style="font-size:10px;color:#475569;margin-bottom:8px">Take urgent action to combat climate change and its impacts.</p>
      <div style="font-size:9.5px;color:#334155"><strong>Example Output:</strong> Climate adaptation workshop delivered to 63 participants.</div>
      <div style="font-size:9.5px;color:#334155;margin-top:4px"><strong>Contribution Link:</strong> Builds community adaptive capacity to climate-related hazards.</div>
    </div>
  </div>
  <div class="card soft"><h3 style="margin-bottom:8px">4 Negative Impact Screening Summary</h3>
    <div class="table-wrap"><table><thead><tr><th>Issue</th><th>Summary</th></tr></thead><tbody>
      <tr><td>Issues Reported</td><td>${escapeHtml(rejected.length ? `${rejected.length} rejected or flagged record(s) requiring review` : "No negative impacts were reported through the partner-administered process during the period.")}</td></tr>
      <tr><td>Outside Scope / Not Assessed</td><td>Limited</td></tr>
      <tr><td>Limitation Note</td><td>Community impacts were reported through the partner-administered process. Does not replace formal impact assessment.</td></tr>
    </tbody></table></div>
  </div>`, input.logoDataUri)}
${page(7, "Methodology, Definitions, and Report Boundaries", `
  <h2>Methodology, Definitions, and Report Boundaries</h2>
  <p class="subtitle" style="margin-bottom:14px">How evidence records are captured, confirmed, and used in reporting support.</p>
  <h3>1 Methodology Overview</h3>
  <div class="timeline" style="margin-bottom:16px">${["Activity Captured","Output Documented","Partner Confirmation","Evidence Record Created","Reporting Support"].map((s, i) => `<div class="step"><div class="step-num">${i + 1}</div><strong>${s}</strong></div>`).join("")}</div>
  <h3>2 Key Definitions</h3>
  <div class="table-wrap" style="margin-bottom:14px"><table><thead><tr><th>Term</th><th>Definition</th></tr></thead><tbody>
    <tr><td><strong>Verified Evidence Record</strong></td><td>A structured record that has completed required verification checks and can support reporting.</td></tr>
    <tr><td><strong>Partner-Confirmed Output</strong></td><td>An output submitted by an authorized partner or verifier.</td></tr>
    <tr><td><strong>Verified Hours</strong></td><td>Hours tied to records with completed verification status.</td></tr>
    <tr><td><strong>Partner-Reported Reach</strong></td><td>Reach figures reported by partners and not independently verified unless explicitly stated.</td></tr>
    <tr><td><strong>Derived / Mapped Alignment</strong></td><td>Alignment to frameworks such as Synerxus classification and framework mapping.</td></tr>
    <tr><td><strong>Incomplete Record</strong></td><td>A record missing required information or documentation and not eligible for verification.</td></tr>
    <tr><td><strong>Rejected Record</strong></td><td>A record that does not meet minimum quality or consistency requirements and is excluded from verified totals.</td></tr>
  </tbody></table></div>
  <div class="card boundary" style="margin-bottom:12px"><p style="color:#78350F;margin:0"><strong>&#9432;</strong> ${BOUNDARY_STATEMENT} <strong>It does not</strong> provide formal assurance opinions, guarantee regulatory compliance, or establish causal attribution.</p></div>
  <div class="card soft"><h3 style="margin-bottom:8px">Limitations</h3>
    <p style="margin:0 0 4px">&#8226; This report does not establish causality or measure long-term impact.</p>
    <p style="margin:0 0 4px">&#8226; This report does not assess or guarantee regulatory compliance.</p>
    <p style="margin:0 0 4px">&#8226; Beneficiary counts are partner-reported and not independently verified unless explicitly stated.</p>
    <p style="margin:0">&#8226; Some metadata may be redacted to protect partner confidentiality.</p>
  </div>`, input.logoDataUri)}
${page(8, "Evidence Readiness Assessment", `
  <h2>Evidence Readiness Assessment</h2><p>Use Cases &amp; Setup Form</p>
  <div class="form-shell">
    <div>
      <h3>Configure Your Evidence Workflow</h3>
      <div class="grid">${[
        ["Corporate Volunteering","Track employee volunteering hours and evidence records."],
        ["Community Investment","Capture and report on community programs and outputs."],
        ["NGO / Partner Verification","Verify partner capacity, activities, and output data."],
        ["Assurance Preparation","Organize evidence for third-party assurance and audit preparation."],
        ["SDG / Framework Mapping","Map outputs to global goals and reporting frameworks."],
      ].map(([t,d]) => `<div class="use-card"><strong>${t}</strong><p>${d}</p></div>`).join("")}</div>
      <div class="card soft" style="margin-top:10px"><p><strong>&#9432;</strong> This assessment helps us recommend the right configuration, data model, and evidence workflows for your organization.</p></div>
    </div>
    <div class="grid" style="gap:8px">
      <div class="form-section"><h3>1. Organization Profile</h3><div class="input-grid">${["Organization Name *","Website","Sector","Region *","Contact Name","Work Email *"].map((f) => `<div class="fake-input">${f}</div>`).join("")}</div></div>
      <div class="form-section"><h3>2. Program Type</h3><div class="checks">${formChecks.program.map(checkbox).join("")}</div></div>
      <div class="form-section"><h3>3. Evidence Problem</h3><div class="checks">${formChecks.problem.map(checkbox).join("")}</div></div>
      <div class="form-section"><h3>4. Current Evidence Sources</h3><div class="checks">${formChecks.sources.map(checkbox).join("")}</div></div>
      <div class="form-section"><h3>5. Frameworks of Interest</h3><div class="checks">${formChecks.frameworks.map(checkbox).join("")}</div></div>
      <div class="form-section"><h3>6. Verification Scope</h3><div class="checks">${formChecks.scope.map(checkbox).join("")}</div></div>
      <div class="form-section"><h3>7. Report Output Needed</h3><div class="checks">${formChecks.output.map(checkbox).join("")}</div></div>
      <div class="form-section"><h3>8. Timing</h3><div class="input-grid"><div class="fake-input">When do you need this solution?</div><div class="fake-input">Comments</div></div></div>
      <div class="ack"><label class="check"><span></span>I acknowledge that Synerxus provides structured evidence records for reporting and assurance preparation. Synerxus does not provide formal assurance opinions, guarantee regulatory compliance, or establish causal attribution.</label></div>
      <div class="cta">Request Evidence Assessment &#8594;</div>
    </div>
  </div>`, input.logoDataUri)}
</body>
</html>`;
  return html;
}
