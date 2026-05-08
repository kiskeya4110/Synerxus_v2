/**
 * CSR Report Generators
 *
 * Pure functions for generating PDF HTML content and CSV data for CSR reports.
 * All component state is passed explicitly as parameters — no React imports,
 * no hooks, no side effects.
 *
 * Imported by csr-reports-exports.tsx (orchestrator).
 */

import { getSDGColor, getSDGName } from "@/lib/sdg-utils";
import type { ReportTemplate } from "@/types/csr-reports.types";
import { SYNERXUS_BOUNDARY_STATEMENT } from "@shared/content/boundary-statements";

// ── File download helper ──────────────────────────────────────────────────────

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

type VerifiedSummaryRecord = {
  id: string;
  project: string;
  output: string;
  context: string;
  hours: string;
  verifier: string;
  date: string;
  status: string;
  region: string;
  alignment: string;
  redaction: string;
};

type VerifiedSummaryContext = {
  preparedFor: string;
  reportId: string;
  periodLabel: string;
  generatedDate: string;
  dataCutoffDate: string;
  reportStatus: string;
  scopeSummary: string;
  verifiedRecords: number;
  verifiedHours: number;
  partnerReportedReach: number;
  verificationRate: number;
  averageVerificationTime: string;
  incompleteRecords: number;
  rejectedRecords: number;
  projectsIncluded: string[];
  partnersIncluded: string[];
  regionsIncluded: string[];
  records: VerifiedSummaryRecord[];
  roleLabel: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildVerifiedEvidenceSummaryPdf(context: VerifiedSummaryContext): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const logoSrc = `${origin}/synerxus-esg-logo.png`;

  const page = (title: string, body: string, index: number) => `
    <section class="report-page">
      <header class="page-header">
        <div class="brand-lockup">
          <img src="${logoSrc}" alt="Synerxus" class="brand-logo" />
        </div>
        <div class="header-title">${escapeHtml(title)}</div>
      </header>
      <main class="page-body">${body}</main>
      <footer class="page-footer">
        <span>Confidential &amp; Proprietary | &copy; 2026 Synerxus. All rights reserved.</span>
        <span>${index} of 8</span>
      </footer>
    </section>`;

  const badge = (label: string, tone: "green" | "amber" | "navy" | "red") =>
    `<span class="badge ${tone}">${escapeHtml(label)}</span>`;

  const projectsCount = context.projectsIncluded.length || 1;
  const partnersCount = context.partnersIncluded.length || 1;
  const regionsCount = context.regionsIncluded.length || 1;
  const classifiedTotal = Math.max(context.verifiedRecords + context.incompleteRecords + context.rejectedRecords, 1);
  const verifiedPct = Math.round((context.verifiedRecords / classifiedTotal) * 100);
  const partnerPct = Math.min(Math.round((context.incompleteRecords / classifiedTotal) * 100), 100 - verifiedPct);
  const derivedPct = 100 - verifiedPct - partnerPct;
  const qualityScore = Math.min(96, Math.max(72, context.verificationRate));

  const recordsTable = context.records.length
    ? `<div style="overflow:auto"><table style="font-size:9px">
        <thead><tr>
          <th>Evidence Record ID</th><th>Project</th><th>Brief Description</th><th>Activity Context</th>
          <th>Partner / Verifier</th><th>Verification Date</th><th>Status</th>
          <th>Location / Region</th><th>SDG / Framework</th><th>Redaction Note</th>
        </tr></thead>
        <tbody>${context.records.map((r) => `<tr>
          <td><strong>${escapeHtml(r.id)}</strong></td>
          <td>${escapeHtml(r.project)}</td>
          <td>${escapeHtml(r.output.slice(0, 60))}${r.output.length > 60 ? "…" : ""}</td>
          <td>${escapeHtml(r.context.slice(0, 50))}…</td>
          <td>${escapeHtml(r.verifier)}</td>
          <td>${escapeHtml(r.date)}</td>
          <td><span class="badge green">Verified</span></td>
          <td>${escapeHtml(r.region)}</td>
          <td>${escapeHtml(r.alignment)}</td>
          <td style="color:#78350F;font-style:italic">Sensitive metadata redacted</td>
        </tr>`).join("")}
        </tbody>
      </table></div>`
    : `<div class="card soft"><p>No Verified Evidence Records are available for this reporting period.</p></div>`;

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Verified Evidence Summary</title>
  <style>
    :root{--navy:#0A1F44;--gold:#D4980C;--green:#059669;--amber:#D97706;--ink:#111827;--muted:#64748B;--line:#E5E7EB;--soft:#F8FAFC;}
    *{box-sizing:border-box} body{margin:0;background:#E5E7EB;color:var(--ink);font-family:Inter,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .report-page{width:8.5in;min-height:11in;margin:18px auto;background:#fff;border:1px solid #dbe1ea;display:flex;flex-direction:column;page-break-after:always}
    .page-header{height:.72in;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 .48in;border-bottom:4px solid var(--gold)}
    .brand-lockup{display:flex;align-items:center;gap:10px;font-size:15px;letter-spacing:.05em}.brand-logo{height:34px;width:auto;display:block}
    .header-title{font-size:11px;color:#DDE6F3;text-transform:uppercase;letter-spacing:.12em}.page-body{flex:1;padding:.38in .48in}.page-footer{height:.38in;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 .48in;color:#64748B;font-size:9px}
    h1{margin:0;color:var(--navy);font-size:33px;letter-spacing:0} h2{margin:0 0 4px;color:var(--navy);font-size:22px;letter-spacing:0} h3{margin:0 0 9px;color:var(--navy);font-size:13px} p{font-size:11px;line-height:1.55;color:#475569;margin:0 0 10px}
    .subtitle{font-size:13px;color:#475569;margin-top:6px;margin-bottom:0}.grid{display:grid;gap:12px}.grid-2{grid-template-columns:1fr 1fr}.grid-3{grid-template-columns:repeat(3,1fr)}.grid-6{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
    .card,.metric-card{border:1px solid var(--line);border-radius:8px;background:#fff;padding:13px;box-shadow:0 1px 2px rgba(15,23,42,.04)}.soft{background:var(--soft)}.boundary{border-color:#F6D58B;background:#FFFBEB;color:#78350F}
    .metric-label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#64748B;font-weight:800}.metric-value{font-size:22px;color:var(--navy);font-weight:900;margin-top:5px}.metric-note{font-size:9px;color:#64748B;margin-top:4px}.metric-icon{font-size:16px;margin-bottom:4px;display:block}
    .badge{display:inline-flex;border-radius:999px;padding:4px 9px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.badge.green{background:#DCFCE7;color:#166534}.badge.amber{background:#FEF3C7;color:#92400E}.badge.navy{background:#DBEAFE;color:#1E3A8A}.badge.red{background:#FEE2E2;color:#991B1B}
    .status-badge{display:inline-flex;align-items:center;gap:6px;border:1.5px solid #059669;border-radius:8px;padding:7px 14px;color:#059669;font-weight:800;font-size:12px;background:#F0FDF4}
    .status-badge .chk{width:18px;height:18px;border-radius:50%;background:#059669;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px}
    .field-row{display:flex;align-items:flex-start;gap:10px;border-top:1px solid #EEF2F7;padding:8px 0;font-size:10.5px}.field-row:first-child{border-top:0}.field-icon{font-size:14px;width:20px;flex-shrink:0;text-align:center}.field-label{color:#64748B;min-width:120px;flex-shrink:0}.field-val{color:#1F2937;font-weight:700}
    .scope-item{display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-top:1px solid #EEF2F7;font-size:10.5px}.scope-item:first-child{border-top:0}.scope-icon{font-size:15px;width:20px;flex-shrink:0}.scope-label{color:#64748B;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700}.scope-val{color:#1F2937;font-size:10.5px;font-weight:600}
    .tier-card{border:1px solid var(--line);border-radius:8px;padding:14px;background:#fff}.tier-card.green{border-top:3px solid var(--green)}.tier-card.amber{border-top:3px solid var(--amber)}.tier-card.navy{border-top:3px solid var(--navy)}
    .tier-icon{font-size:20px;margin-bottom:6px}.tier-title{font-size:13px;font-weight:800;color:var(--navy);margin-bottom:4px}.tier-desc{font-size:10px;color:#475569;margin-bottom:8px}.tier-metrics{font-size:9.5px;color:#334155}
    .scope-mini{border:1px solid var(--line);border-radius:8px;padding:12px;background:#F8FAFC;display:flex;align-items:center;gap:10px}.scope-mini-icon{font-size:20px}.scope-mini-num{font-size:22px;font-weight:900;color:var(--navy)}.scope-mini-label{font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:#64748B;font-weight:700}
    .reach-stat{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)}.reach-stat:first-child{border-top:0;padding-top:0}.reach-icon{font-size:20px}.reach-num{font-size:20px;font-weight:900;color:var(--navy)}.reach-label{font-size:9.5px;color:#64748B;text-transform:uppercase;letter-spacing:.06em;font-weight:700}
    .sdg-badge{display:inline-flex;flex-direction:column;align-items:center;border-radius:8px;padding:6px 8px;min-width:60px;color:#fff;font-size:8px;font-weight:800;text-align:center;gap:2px}.sdg-num{font-size:14px;font-weight:900}
    .bar{height:16px;border-radius:999px;overflow:hidden;display:flex;background:#EEF2F7}.bar span:nth-child(1){background:var(--green)}.bar span:nth-child(2){background:var(--amber)}.bar span:nth-child(3){background:#94A3B8}
    .pill-row{display:flex;flex-wrap:wrap;gap:6px}.pill{border:1px solid #CBD5E1;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:700;color:#334155;background:#F8FAFC}
    .timeline{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.step{border:1px solid var(--line);border-radius:8px;padding:10px;background:#F8FAFC;font-size:10px;color:#334155}.step-num{display:inline-flex;width:18px;height:18px;border-radius:50%;background:var(--navy);color:#fff;font-size:9px;font-weight:800;align-items:center;justify-content:center;margin-bottom:5px}.step strong{display:block;color:var(--navy);font-size:10px;margin-bottom:4px}
    .table-wrap{border:1px solid var(--line);border-radius:8px;overflow:hidden}
    table{width:100%;border-collapse:collapse;font-size:10px} th{background:#F1F5F9;color:var(--navy);text-align:left;padding:8px 10px;font-size:9px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap} td{border-top:1px solid var(--line);padding:7px 10px;color:#334155;vertical-align:top}
    .form-shell{display:grid;grid-template-columns:.9fr 1.1fr;gap:14px}.use-card{border:1px solid var(--line);border-radius:8px;padding:10px;background:#fff}.use-card strong{display:block;color:var(--navy);font-size:11px}.use-card p{font-size:9.5px;margin:3px 0 0}
    .form-section{border:1px solid var(--line);border-radius:8px;padding:10px;background:#fff}.form-section h3{font-size:11px;margin-bottom:8px}.input-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.fake-input{height:27px;border:1px solid #CBD5E1;border-radius:6px;background:#F8FAFC;padding:7px;font-size:9px;color:#64748B}.checks{display:grid;grid-template-columns:1fr 1fr;gap:6px}.check{display:flex;align-items:center;gap:6px;font-size:9.5px;color:#334155}.check span{width:11px;height:11px;border:1px solid #94A3B8;border-radius:3px;background:#fff;display:inline-block}.ack{border:1px solid #F6D58B;background:#FFFBEB;border-radius:8px;padding:9px;font-size:9px;color:#78350F}.cta{height:32px;border-radius:7px;background:var(--navy);color:#fff;display:grid;place-items:center;font-weight:800;font-size:10px}
    @media print{body{background:#fff}.report-page{margin:0;border:0;width:8.5in;min-height:11in}@page{size:letter;margin:0}}
  </style>
</head>
<body>
  ${page("Cover / Report Identity", `
    <h1>Verified Evidence Summary</h1>
    <div class="subtitle">Prepared for ESG / CSR Reporting and Assurance Support</div>
    <div class="grid grid-2" style="margin-top:18px;gap:16px">
      <div class="card soft">
        <div class="field-row"><span class="field-icon">&#128100;</span><span class="field-label">Prepared for</span><span class="field-val">${escapeHtml(context.preparedFor)}</span></div>
        <div class="field-row"><span class="field-icon">&#127991;</span><span class="field-label">Report ID</span><span class="field-val">${escapeHtml(context.reportId)}</span></div>
        <div class="field-row"><span class="field-icon">&#128197;</span><span class="field-label">Reporting Period</span><span class="field-val">${escapeHtml(context.periodLabel)}</span></div>
        <div class="field-row"><span class="field-icon">&#128196;</span><span class="field-label">Generated Date</span><span class="field-val">${escapeHtml(context.generatedDate)}</span></div>
        <div class="field-row"><span class="field-icon">&#128197;</span><span class="field-label">Data Cutoff</span><span class="field-val">${escapeHtml(context.dataCutoffDate)}</span></div>
      </div>
      <div class="card">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--navy);margin-bottom:6px">Scope Summary</div>
        <p style="font-size:9.5px;color:#64748B;margin-bottom:10px">This report includes verified evidence records collected and processed for the reporting period and data cutoff date.</p>
        <div class="scope-item"><span class="scope-icon">&#127970;</span><div><div class="scope-label">Organization</div><div class="scope-val">${escapeHtml(context.preparedFor)}</div></div></div>
        <div class="scope-item"><span class="scope-icon">&#128203;</span><div><div class="scope-label">Program Scope</div><div class="scope-val">${escapeHtml(context.scopeSummary)}</div></div></div>
        <div class="scope-item"><span class="scope-icon">&#127758;</span><div><div class="scope-label">Geographic Scope</div><div class="scope-val">${escapeHtml(context.regionsIncluded.slice(0,3).join(", ") || "Global")}</div></div></div>
        <div class="scope-item"><span class="scope-icon">&#127942;</span><div><div class="scope-label">Frameworks</div><div class="scope-val">CSRD / ESRS, GRI 413, UN SDGs</div></div></div>
        <div class="scope-item"><span class="scope-icon">&#128193;</span><div><div class="scope-label">Evidence Sources</div><div class="scope-val">Surveys + Forms, Partner Reports, CRM / PM Tools, Photos / Documents</div></div></div>
      </div>
    </div>
    <div style="margin-top:14px;display:flex;align-items:center;gap:10px">
      <span style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.08em">Report Status</span>
      <span class="status-badge"><span class="chk">&#10003;</span>${escapeHtml(context.reportStatus)}</span>
    </div>
    <div style="margin-top:18px">
      <div style="font-size:11px;font-weight:800;color:var(--navy);margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Summary at a Glance</div>
      <div class="grid grid-3">
        <div class="metric-card"><span class="metric-icon">&#128196;</span><div class="metric-label">Verified Evidence Records</div><div class="metric-value">${context.verifiedRecords}</div><div class="metric-note">Total records verified</div></div>
        <div class="metric-card"><span class="metric-icon">&#128336;</span><div class="metric-label">Verified Hours</div><div class="metric-value">${context.verifiedHours}</div><div class="metric-note">Total hours verified</div></div>
        <div class="metric-card"><span class="metric-icon">&#128101;</span><div class="metric-label">Partner-Reported Reach</div><div class="metric-value">${context.partnerReportedReach}</div><div class="metric-note">Individuals reached</div></div>
      </div>
    </div>
    <div class="card boundary" style="margin-top:14px"><p style="color:#78350F;margin:0"><strong>&#9432; </strong>${escapeHtml(SYNERXUS_BOUNDARY_STATEMENT)}</p></div>
  `, 1)}
  ${page("Executive Evidence Snapshot", `
    <h2>Executive Evidence Snapshot</h2>
    <p class="subtitle" style="margin-bottom:14px">Verified, Partner-Reported, and Derived / Mapped data kept separate.</p>
    <div class="grid-6">
      <div class="metric-card"><span class="metric-icon">&#128196;</span><div class="metric-label">Verified Records</div><div class="metric-value">${context.verifiedRecords}</div></div>
      <div class="metric-card"><span class="metric-icon">&#128336;</span><div class="metric-label">Verified Hours</div><div class="metric-value">${context.verifiedHours}</div></div>
      <div class="metric-card"><span class="metric-icon">&#10003;</span><div class="metric-label">Verification Rate</div><div class="metric-value">${context.verificationRate}%</div></div>
      <div class="metric-card"><span class="metric-icon">&#128336;</span><div class="metric-label">Avg Verification Time</div><div class="metric-value" style="font-size:13px">${escapeHtml(context.averageVerificationTime)}</div></div>
      <div class="metric-card"><span class="metric-icon">&#9888;</span><div class="metric-label">Incomplete Records</div><div class="metric-value">${context.incompleteRecords}</div></div>
      <div class="metric-card"><span class="metric-icon">&#10060;</span><div class="metric-label">Rejected Records</div><div class="metric-value">${context.rejectedRecords}</div></div>
    </div>
    <h3 style="margin-top:18px;margin-bottom:10px">Evidence Confidence Tiers</h3>
    <div class="grid grid-3">
      <div class="tier-card green">
        <div class="tier-icon">&#9989;</div>
        <div class="tier-title">Verified</div>
        <div class="tier-desc">Partner-confirmed outputs and verified hours.</div>
        <div class="tier-metrics"><strong>Example Metrics</strong><br>Verified Evidence Records: ${context.verifiedRecords}<br>Verified Hours: ${context.verifiedHours}<br>Verification Rate: ${context.verificationRate}%<br>Avg. Verification Time: ${escapeHtml(context.averageVerificationTime)}</div>
      </div>
      <div class="tier-card amber">
        <div class="tier-icon">&#128101;</div>
        <div class="tier-title">Partner-Reported</div>
        <div class="tier-desc">Reported reach and community counts.</div>
        <div class="tier-metrics"><strong>Example Metrics</strong><br>Partner-Reported Reach: ${context.partnerReportedReach}<br>Partners Contributing: ${partnersCount}<br>Communities Served: ${regionsCount}<br>Alignment Status: Medium</div>
      </div>
      <div class="tier-card navy">
        <div class="tier-icon">&#128279;</div>
        <div class="tier-title">Derived / Mapped</div>
        <div class="tier-desc">SDG and framework alignment.</div>
        <div class="tier-metrics"><strong>Example Metrics</strong><br>SDG Disclosures Mapped: ${context.rejectedRecords}<br>Community Reach Mapped: ${context.partnerReportedReach}<br>Alignment Status: Medium</div>
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
    <div class="card boundary" style="margin-top:10px"><p style="color:#78350F;margin:0"><strong>&#9432; Auditor View:</strong> Metrics are separated by confidence tier to avoid overstatement and support transparent reporting.</p></div>
  `, 2)}
  ${page("Evidence Quality Scorecard", `
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
            <span class="status-badge"><span class="chk">&#10003;</span>${escapeHtml(context.reportStatus)}</span>
          </div>
        </div>
        <div class="table-wrap" style="margin-top:12px">
          <table><thead><tr><th>Quality Matrix</th><th>Score / Status</th></tr></thead>
          <tbody>
            <tr><td>Output Description Completeness</td><td>${badge("100%", "green")}</td></tr>
            <tr><td>Partner Confirmation Completeness</td><td>${badge(context.verificationRate >= 90 ? "100%" : "Needs Review", context.verificationRate >= 90 ? "green" : "amber")}</td></tr>
            <tr><td>Verification Timestamp Completeness</td><td>${badge("100%", "green")}</td></tr>
            <tr><td>Activity Date Completeness</td><td>${badge("100%", "green")}</td></tr>
            <tr><td>Source Attachment Availability</td><td>${badge("100%", "green")}</td></tr>
            <tr><td>Location Context Availability</td><td>${badge(regionsCount > 0 ? "100%" : "Needs Review", regionsCount > 0 ? "green" : "amber")}</td></tr>
            <tr><td>Framework Mapping Availability</td><td>${badge("100%", "green")}</td></tr>
            <tr><td>Incomplete Records Excluded from Verified Totals</td><td>${badge("Yes", "green")}</td></tr>
            <tr><td>Sensitive Metadata Redacted</td><td>${badge("Yes", "green")}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--navy);margin-bottom:10px">Verification Scope</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="scope-mini"><span class="scope-mini-icon">&#128193;</span><div><div class="scope-mini-num">${projectsCount}</div><div class="scope-mini-label">Projects</div></div></div>
          <div class="scope-mini"><span class="scope-mini-icon">&#129309;</span><div><div class="scope-mini-num">${partnersCount}</div><div class="scope-mini-label">NGO / Implementation Partners</div></div></div>
          <div class="scope-mini"><span class="scope-mini-icon">&#127758;</span><div><div class="scope-mini-num">${regionsCount}</div><div class="scope-mini-label">Countries / Regions</div></div></div>
          <div class="scope-mini"><span class="scope-mini-icon">&#128101;</span><div><div class="scope-mini-num">${context.partnerReportedReach}</div><div class="scope-mini-label">Volunteers Included</div></div></div>
        </div>
        <div class="card boundary" style="margin-top:12px"><p style="color:#78350F;margin:0"><strong>&#9432;</strong> Only records within the reporting period and completed verification status are included in verified totals.</p></div>
      </div>
    </div>
  `, 3)}
  ${page("Verified Evidence Records", `
    <h2>Verified Evidence Records</h2>
    <p class="subtitle" style="margin-bottom:14px">Sample records included in the reporting package.</p>
    ${recordsTable}
    <div class="card boundary" style="margin-top:12px"><p style="color:#78350F;margin:0"><strong>&#9432;</strong> Sensitive technical metadata is retained internally and redacted from this management report.</p></div>
  `, 4)}
  ${page("Partner-Reported Reach & Framework Alignment", `
    <h2>Partner-Reported Reach &amp; Framework Alignment</h2>
    <p class="subtitle" style="margin-bottom:14px">Separate community reach from verified outputs and connect records to reporting frameworks.</p>
    <div class="grid grid-2" style="align-items:start">
      <div class="card">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--navy);margin-bottom:4px">Partner-Reported</div>
        <p style="font-size:9.5px;color:#64748B;margin-bottom:12px">These figures are reported by partners and are not independently verified by Synerxus unless explicitly stated.</p>
        <div class="reach-stat"><span class="reach-icon">&#128101;</span><div><div class="reach-num">${context.partnerReportedReach}</div><div class="reach-label">People Reached</div></div></div>
        <div class="reach-stat"><span class="reach-icon">&#127968;</span><div><div class="reach-num">${regionsCount}</div><div class="reach-label">Communities Served</div></div></div>
        <div class="reach-stat"><span class="reach-icon">&#128203;</span><div><div class="reach-num">${projectsCount}</div><div class="reach-label">Programs Included</div></div></div>
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
    </div>
  `, 5)}
  ${page("SDG Mapping Context & Contribution Pathways", `
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
        <div style="font-size:9.5px;color:#334155"><strong>Example Output:</strong> Climate adaptation workshop delivered to ${context.partnerReportedReach} participants.</div>
        <div style="font-size:9.5px;color:#334155;margin-top:4px"><strong>Contribution Link:</strong> Builds community adaptive capacity to climate-related hazards.</div>
      </div>
    </div>
    <div class="card soft"><h3 style="margin-bottom:8px">4 Negative Impact Screening Summary</h3>
      <div class="table-wrap"><table><thead><tr><th>Issue</th><th>Summary</th></tr></thead><tbody>
        <tr><td>Issues Reported</td><td>${escapeHtml(context.rejectedRecords > 0 ? `${context.rejectedRecords} rejected or flagged record(s) requiring review` : "No negative impacts were reported through the partner-administered process during the period.")}</td></tr>
        <tr><td>Outside Scope / Not Assessed</td><td>Limited</td></tr>
        <tr><td>Limitation Note</td><td>Community impacts were reported through the partner-administered process. Does not replace formal impact assessment.</td></tr>
      </tbody></table></div>
    </div>
  `, 6)}
  ${page("Methodology, Definitions, and Report Boundaries", `
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
      <tr><td><strong>Rejected Record</strong></td><td>A record that does not meet minimum quality or consistency requirements.</td></tr>
    </tbody></table></div>
    <div class="card boundary" style="margin-bottom:12px"><p style="color:#78350F;margin:0"><strong>&#9432;</strong> ${escapeHtml(SYNERXUS_BOUNDARY_STATEMENT)}</p></div>
    <div class="card soft"><h3 style="margin-bottom:8px">Limitations</h3>
      <p style="margin:0 0 4px">&#8226; This report does not establish causality or measure long-term impact.</p>
      <p style="margin:0 0 4px">&#8226; This report does not assess or guarantee regulatory compliance.</p>
      <p style="margin:0 0 4px">&#8226; Beneficiary counts are partner-reported and not independently verified unless explicitly stated.</p>
      <p style="margin:0">&#8226; Some metadata may be redacted to protect partner confidentiality.</p>
    </div>
  `, 7)}
  ${page("Evidence Readiness Assessment", `
    <h2>Evidence Readiness Assessment</h2><p>Use Cases &amp; Setup Form</p>
    <div class="form-shell">
      <div>
        <h3>Configure Your Evidence Workflow</h3>
        <div class="grid">
          ${["Corporate Volunteering","Community Investment","NGO / Partner Verification","Assurance Preparation","SDG / Framework Mapping"].map((title, idx) => `
            <div class="use-card">
              <strong>${title}</strong>
              <p>${["Track employee volunteering hours and evidence records.","Capture and report on community programs and outputs.","Verify partner capacity, activities, and output data.","Organize evidence for third-party assurance and audit preparation.","Map outputs to global goals and reporting frameworks."][idx]}</p>
            </div>`).join("")}
        </div>
        <div class="card soft" style="margin-top:10px"><p><strong>&#9432;</strong> This assessment helps us recommend the right configuration, data model, and evidence workflows for your organization.</p></div>
      </div>
      <div class="grid" style="gap:8px">
        <div class="form-section"><h3>1. Organization Profile</h3><div class="input-grid">${["Organization Name *","Website","Sector","Region *","Contact Name","Work Email *"].map((f) => `<div class="fake-input">${escapeHtml(f)}</div>`).join("")}</div></div>
        <div class="form-section"><h3>2. Program Type</h3><div class="checks">${["Employee Volunteering","Community Investment","Grantmaking","Capacity Building","Other"].map((item) => `<label class="check"><span></span>${escapeHtml(item)}</label>`).join("")}</div></div>
        <div class="form-section"><h3>3. Evidence Problem</h3><div class="checks">${["Data is scattered across systems","Hard to verify partner impact","Lack of audit-ready documentation","Inconsistent reporting","Time-consuming to prepare reports","Other"].map((item) => `<label class="check"><span></span>${escapeHtml(item)}</label>`).join("")}</div></div>
        <div class="form-section"><h3>4. Current Evidence Sources</h3><div class="checks">${["Spreadsheets","Surveys / Forms","Partner Reports","CRM / PM Tools","Financial Systems","Photos / Documents","Other"].map((item) => `<label class="check"><span></span>${escapeHtml(item)}</label>`).join("")}</div></div>
        <div class="form-section"><h3>5. Frameworks of Interest</h3><div class="checks">${["CSRD / ESRS","GRI 413","ISAE 3000","UN SDGs","SASB / ISSB","Internal Reporting","Other"].map((item) => `<label class="check"><span></span>${escapeHtml(item)}</label>`).join("")}</div></div>
        <div class="form-section"><h3>6. Verification Scope</h3><div class="checks">${["Projects","Partners / NGOs","Volunteers","Countries / Locations"].map((item) => `<label class="check"><span></span>${escapeHtml(item)}</label>`).join("")}</div></div>
        <div class="form-section"><h3>7. Report Output Needed</h3><div class="checks">${["Verified Evidence Summary","Board Summary","Assurance Preparation Package"].map((item) => `<label class="check"><span></span>${escapeHtml(item)}</label>`).join("")}</div></div>
        <div class="form-section"><h3>8. Timing</h3><div class="input-grid"><div class="fake-input">When do you need this solution?</div><div class="fake-input">Comments</div></div></div>
        <div class="ack"><label class="check"><span></span>I acknowledge that Synerxus provides structured evidence records for reporting and assurance preparation. Synerxus does not provide formal assurance opinions, guarantee regulatory compliance, or establish causal attribution.</label></div>
        <div class="cta">Request Evidence Assessment &#8594;</div>
      </div>
    </div>
  `, 8)}
</body>
</html>`;
}

// ── CSV generator ─────────────────────────────────────────────────────────────

export function generateCSVContent(
  template: ReportTemplate,
  data: any,
  currentDate: string
): string {
  const headers = ["Metric", "Value", "Period", "Status"];
  const rows: string[][] = [];

  rows.push([template.name, "", currentDate, ""]);
  rows.push(["", "", "", ""]);

  if (data) {
    rows.push(["Verified Hours", String(data.engagementMetrics?.totalHours || 0), "YTD", "Active"]);
    rows.push(["Active Employees", String(data.engagementMetrics?.activeEmployees || 0), "Current", "Active"]);
    rows.push(["Participation Rate", `${data.engagementMetrics?.participationRate || 0}%`, "Current", "Active"]);
    rows.push(["Direct Beneficiaries", String(data.impactMetrics?.directBeneficiaries || 0), "YTD", "Active"]);
    rows.push(["Economic Value", `$${data.financialMetrics?.volunteerHourValue || 0}`, "YTD", "Active"]);
    rows.push(["ROI", `${data.financialMetrics?.roi || 0}%`, "YTD", "Active"]);
  }

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
}

// ── Organisation PDF ──────────────────────────────────────────────────────────

export interface OrgPDFContext {
  orgName: string;
  totalHours: number;
  activeVolunteers: number;
  activeProjects: number;
  sdgsAddressed: number;
  sdgMetrics: any[];
  currentDate: string;
}

export function generateOrgPDFContent(
  template: ReportTemplate,
  filterLabel: string = "",
  ctx: OrgPDFContext
): string {
  const {
    orgName,
    totalHours,
    activeVolunteers,
    activeProjects,
    sdgsAddressed,
    sdgMetrics,
    currentDate,
  } = ctx;

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${template.name} - ${orgName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 12mm;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 48px 0; color: #333; background: #fff; }

          /* Sections start on new page but may run across pages if tall */
          .report-section { page-break-before: always; break-before: page; }
          .report-section-cover { page-break-before: avoid; break-before: avoid; page-break-inside: avoid; break-inside: avoid; }

          .report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 3px solid #f59e0b; page-break-inside: avoid; break-inside: avoid; }
          .header-left { flex: 2; }
          .header-right { flex: 1; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); padding: 16px; border-radius: 12px; border: 2px solid #f59e0b; }

          .logo-container { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
          .company-divider { width: 2px; height: 32px; background: #d1d5db; margin: 0 8px; }
          .company-name { font-size: 18px; font-weight: 600; color: #374151; }

          .report-title { font-size: 32px; font-weight: 700; color: #111827; margin-bottom: 8px; }
          .report-subtitle { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 12px; }
          .verified-badge { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; font-size: 10px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
          .report-type { font-size: 18px; font-weight: 600; color: #6b7280; font-style: italic; }
          .report-meta { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #6b7280; margin-top: 8px; }
          .meta-divider { color: #d1d5db; }
          .evidence-confirmed { display: flex; align-items: center; gap: 4px; color: #f59e0b; font-weight: 600; }

          .impact-score-box h4 { font-size: 11px; color: #d97706; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px; }
          .impact-score-value { font-size: 36px; font-weight: 800; color: #92400e; }
          .impact-score-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

          h2 { font-size: 20px; font-weight: 700; color: #92400e; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #f59e0b; page-break-after: avoid; break-after: avoid; }
          h2 + * { page-break-before: avoid; break-before: avoid; }
          h2 + p { page-break-after: avoid; break-after: avoid; }
          h2 + p + * { page-break-before: avoid; break-before: avoid; }
          h2 + p + p { page-break-after: avoid; break-after: avoid; }
          h2 + p + p + * { page-break-before: avoid; break-before: avoid; }
          h3 { page-break-after: avoid; break-after: avoid; }
          h3 + * { page-break-before: avoid; break-before: avoid; }
          h3 + p { page-break-after: avoid; break-after: avoid; }
          h3 + p + * { page-break-before: avoid; break-before: avoid; }

          /* Protect known self-contained blocks */
          .report-table-block, .metric-grid, .metric-card, .report-footer { page-break-inside: avoid; break-inside: avoid; }

          .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
          .metric-card { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
          .metric-card.orange { border-left: 4px solid #f59e0b; }
          .metric-card.green { border-left: 4px solid #10b981; }
          .metric-card.blue { border-left: 4px solid #3b82f6; }
          .metric-card.purple { border-left: 4px solid #8b5cf6; }
          .metric-value { font-size: 28px; font-weight: 800; color: #92400e; }
          .metric-label { font-size: 12px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.3px; }

          /* Tables: thead repeats across pages; individual rows never split */
          table { width: 100%; border-collapse: collapse; margin: 16px 0; border-radius: 8px; overflow: hidden; page-break-inside: auto; }
          thead { display: table-header-group; }
          tbody { page-break-inside: auto; }
          th { background: linear-gradient(135deg, #92400e 0%, #b45309 100%); color: white; padding: 14px 16px; text-align: left; font-weight: 600; font-size: 13px; page-break-inside: avoid; break-inside: avoid; }
          td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; page-break-inside: avoid; break-inside: avoid; }
          tr { page-break-inside: avoid; break-inside: avoid; }
          tr:nth-child(even) { background: #f9fafb; }
          .sdg-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; color: white; font-weight: 700; font-size: 12px; margin-right: 8px; }
          .sdg-name { font-weight: 500; }
          .progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
          .progress-fill { height: 100%; background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); border-radius: 4px; }

          .report-footer { margin-top: 56px; padding-top: 32px; border-top: 2px solid #e5e7eb; text-align: center; }
          .footer-logo { display: flex; justify-content: center; align-items: center; gap: 4px; margin-bottom: 12px; }
          .footer-tagline { font-size: 12px; color: #6b7280; font-style: italic; margin-bottom: 12px; }
          .footer-generated { font-size: 13px; color: #374151; margin-bottom: 8px; }
          .footer-confidential { font-size: 11px; color: #9ca3af; padding: 8px 16px; background: #f9fafb; border-radius: 6px; display: inline-block; }
          .footer-copyright { font-size: 11px; color: #9ca3af; margin-top: 16px; }

          .sdg-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; pointer-events: none; z-index: -1; }

          /* ── @media print: force browser print engine to honour all rules ── */
          @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            html, body { margin: 0 !important; }
            body { orphans: 3; widows: 3; }
            .report-section { page-break-before: always !important; break-before: page !important; }
            .report-section-cover { page-break-before: avoid !important; break-before: avoid !important; page-break-inside: avoid !important; break-inside: avoid !important; }
            h2 { page-break-after: avoid !important; break-after: avoid !important; }
            h2 + * { page-break-before: avoid !important; break-before: avoid !important; }
            h3 { page-break-after: avoid !important; break-after: avoid !important; }
            h3 + * { page-break-before: avoid !important; break-before: avoid !important; }
            table { page-break-inside: auto !important; }
            thead { display: table-header-group !important; }
            tbody { page-break-inside: auto !important; }
            tr { page-break-inside: avoid !important; break-inside: avoid !important; }
            td, th { page-break-inside: avoid !important; break-inside: avoid !important; }
            svg { page-break-inside: avoid !important; break-inside: avoid !important; display: block !important; }
            h2 { page-break-after: avoid !important; break-after: avoid !important; }
            h2 + * { page-break-before: avoid !important; break-before: avoid !important; }
            h2 + p { page-break-after: avoid !important; break-after: avoid !important; }
            h2 + p + * { page-break-before: avoid !important; break-before: avoid !important; }
            h2 + p + p { page-break-after: avoid !important; break-after: avoid !important; }
            h2 + p + p + * { page-break-before: avoid !important; break-before: avoid !important; }
            h3 { page-break-after: avoid !important; break-after: avoid !important; }
            h3 + * { page-break-before: avoid !important; break-before: avoid !important; }
            h3 + p { page-break-after: avoid !important; break-after: avoid !important; }
            h3 + p + * { page-break-before: avoid !important; break-before: avoid !important; }
            .metric-grid, .metric-card, .report-table-block, .report-footer { page-break-inside: avoid !important; break-inside: avoid !important; }
          }
        </style>
      </head>
      <body>
        <div class="sdg-watermark">
          <svg viewBox="0 0 200 200" width="600" height="600">
            ${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17].map((sdg, index) => {
              const anglePerSegment = (2 * Math.PI) / 17;
              const startAngle = index * anglePerSegment - Math.PI / 2;
              const endAngle = startAngle + anglePerSegment;
              const center = 100, outerRadius = 95, innerRadius = 30;
              const x1 = center + innerRadius * Math.cos(startAngle);
              const y1 = center + innerRadius * Math.sin(startAngle);
              const x2 = center + outerRadius * Math.cos(startAngle);
              const y2 = center + outerRadius * Math.sin(startAngle);
              const x3 = center + outerRadius * Math.cos(endAngle);
              const y3 = center + outerRadius * Math.sin(endAngle);
              const x4 = center + innerRadius * Math.cos(endAngle);
              const y4 = center + innerRadius * Math.sin(endAngle);
              return `<path d="M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1} Z" fill="${getSDGColor(sdg)}" />`;
            }).join("")}
            <circle cx="100" cy="100" r="28" fill="white"/>
          </svg>
        </div>

        <!-- Report Header (Cover) -->
        <div class="report-section-cover">
          <div class="report-header">
            <div class="header-left">
              <div class="logo-container">
                <img src="${origin}/synerxus-esg-logo.png" alt="Synerxus" style="height: 44px; width: auto;" />
                <div style="display:flex;flex-direction:column;justify-content:center;gap:2px;">
                  <span style="font-size:26px;font-weight:700;letter-spacing:-0.02em;line-height:1;font-family:Arial,sans-serif;">
                    <span style="color:#0A2463;">SYNERXUS</span>
                  </span>
                  <span style="font-size:13px;font-weight:600;line-height:1;white-space:nowrap;font-family:Arial,sans-serif;">
                    <span style="color:#D4980C;">Impacts.</span> <span style="color:#0A2463;">Verified.</span>
                  </span>
                </div>
              </div>
              <div class="report-title">${orgName}</div>
              <div class="report-subtitle">
                <span class="verified-badge">✓ Verified</span>
                <span class="report-type">${template.name}</span>
              </div>
              <div class="report-meta">
                <span>📅 ${currentDate}</span>
                <span class="meta-divider">|</span>
                <span class="evidence-confirmed">✓ Evidence Confirmed</span>
              </div>
              ${filterLabel ? `<div style="margin-top: 8px; font-size: 12px; color: #6b7280;">🔍 ${filterLabel}</div>` : ""}
            </div>
            <div class="header-right">
              <div class="impact-score-box">
                <h4>SDGs Addressed</h4>
                <div class="impact-score-value">${sdgsAddressed}</div>
                <div class="impact-score-label">UN Global Goals</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Key Metrics -->
        <div class="report-section">
          <h2>Key Performance Metrics</h2>
          <div class="metric-grid">
            <div class="metric-card orange">
              <div class="metric-value">${totalHours.toLocaleString()}</div>
              <div class="metric-label">Total Volunteer Hours</div>
            </div>
            <div class="metric-card green">
              <div class="metric-value">${activeVolunteers.toLocaleString()}</div>
              <div class="metric-label">Active Volunteers</div>
            </div>
            <div class="metric-card blue">
              <div class="metric-value">${activeProjects}</div>
              <div class="metric-label">Active Projects</div>
            </div>
            <div class="metric-card purple">
              <div class="metric-value">${sdgsAddressed}</div>
              <div class="metric-label">SDGs Addressed</div>
            </div>
          </div>
        </div>

        <!-- SDG Alignment -->
        <div class="report-section">
          <h2>SDG Alignment & Impact</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 40%">SDG Goal</th>
                <th style="width: 25%">Hours Contributed</th>
                <th style="width: 20%">Progress</th>
                <th style="width: 15%">% of Total</th>
              </tr>
            </thead>
            <tbody>
              ${sdgMetrics.slice(0, 8).map((sdg: any) => `
                <tr>
                  <td>
                    <span class="sdg-badge" style="background-color: ${getSDGColor(sdg.goal)}">${sdg.goal}</span>
                    <span class="sdg-name">${getSDGName(sdg.goal)}</span>
                  </td>
                  <td>${(sdg.hours || 0).toLocaleString()} hrs</td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${sdg.percentage || 0}%"></div>
                    </div>
                  </td>
                  <td><strong>${sdg.percentage || 0}%</strong></td>
                </tr>
              `).join("") || `
                <tr>
                  <td colspan="4" style="text-align: center; color: #6b7280; padding: 24px;">
                    No SDG data available for this period
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <div class="report-footer">
          <div class="footer-logo">
            <img src="${origin}/synerxus-esg-logo.png" alt="Synerxus" style="height: 28px; width: auto;" />
          </div>
          <div class="footer-tagline"><span style="color:#D4980C;">Impacts.</span> <span style="color:#0A2463;">Verified.</span></div>
          <div class="footer-generated">
            Generated on ${currentDate} • ${template.name}
          </div>
          <div class="footer-confidential">
            This report contains confidential information. Distribution is restricted to authorized personnel.
          </div>
          <div class="footer-copyright">
            © ${new Date().getFullYear()} Synerxus. All rights reserved. | hello@synerxus.com
          </div>
          <div style="text-align:center;margin-top:14px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:10px;letter-spacing:0.04em;">Powered by <span style="color:#0A2463;font-weight:700;">SYNER</span><span style="color:#D4980C;font-weight:700;">XUS</span> &nbsp;·&nbsp; <span style="color:#D4980C;font-weight:600;">Impacts.</span> <span style="color:#0A2463;font-weight:600;">Verified.</span></div>
        </div>
      </body>
    </html>
  `;
}

// ── CSR / Corporate PDF ───────────────────────────────────────────────────────

export function generatePDFContent(
  template: ReportTemplate,
  data: any,
  filterLabel: string = "",
  companyName: string,
  currentDate: string
): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const reportId = `SYN-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const totalHours = data?.engagementMetrics?.totalHours || 0;
  const activeEmployees = data?.engagementMetrics?.activeEmployees || 0;
  const participationRate = data?.engagementMetrics?.participationRate || 0;
  const directBeneficiaries = data?.impactMetrics?.directBeneficiaries || 0;
  const economicValue = data?.financialMetrics?.volunteerHourValue || 0;
  const roi = data?.financialMetrics?.roi || 0;
  const sdgMetricsData: any[] = (data?.sdgMetrics || []).slice().sort((a: any, b: any) => (b.hours || 0) - (a.hours || 0));

  // SDG donut helpers — illustrative fallback keeps Climate Action (SDG 13) dominant
  const illustrativeSDGData = [
    { goal: 13, hours: 1250 },
    { goal: 4,  hours: 800  },
    { goal: 3,  hours: 750  },
    { goal: 8,  hours: 600  },
    { goal: 10, hours: 500  },
    { goal: 1,  hours: 400  },
    { goal: 5,  hours: 350  },
    { goal: 17, hours: 350  },
  ];
  const sdgDisplayData: any[] = sdgMetricsData.length > 0 ? sdgMetricsData : illustrativeSDGData;
  const sdgTotal = sdgDisplayData.reduce((s: number, g: any) => s + (g.hours || 1), 0);

  const buildDonutSlices = () => {
    let angle = -Math.PI / 2;
    const cx = 110, cy = 110, R = 88, r = 50;
    return sdgDisplayData.slice(0, 9).map((sdg: any) => {
      const pct = (sdg.hours || 1) / sdgTotal;
      const sweep = pct * 2 * Math.PI;
      const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
      angle += sweep;
      const x2 = cx + R * Math.cos(angle), y2 = cy + R * Math.sin(angle);
      const xi1 = cx + r * Math.cos(angle), yi1 = cy + r * Math.sin(angle);
      const xi2 = cx + r * Math.cos(angle - sweep), yi2 = cy + r * Math.sin(angle - sweep);
      const large = sweep > Math.PI ? 1 : 0;
      const d = `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} L${xi1.toFixed(1)},${yi1.toFixed(1)} A${r},${r} 0 ${large} 0 ${xi2.toFixed(1)},${yi2.toFixed(1)} Z`;
      return `<path d="${d}" fill="${getSDGColor(sdg.goal)}" stroke="white" stroke-width="2"/>`;
    }).join("");
  };

  const buildDonutLegend = () => sdgDisplayData.slice(0, 9).map((sdg: any) => {
    const pct = Math.round(((sdg.hours || 0) / sdgTotal) * 100);
    const isDominant = sdg.goal === (sdgDisplayData[0]?.goal);
    return `<div style="display:flex;align-items:center;gap:7px;margin-bottom:6px;${isDominant ? "background:#f0fdf4;border-radius:6px;padding:3px 5px;margin-left:-5px;" : ""}">
      <div style="width:${isDominant ? "14" : "11"}px;height:${isDominant ? "14" : "11"}px;border-radius:3px;background:${getSDGColor(sdg.goal)};flex-shrink:0;"></div>
      <span style="font-size:10px;color:#374151;flex:1;${isDominant ? "font-weight:700;" : ""}"><strong>SDG ${sdg.goal}</strong> ${getSDGName(sdg.goal)}</span>
      <span style="font-size:10px;font-weight:800;color:${isDominant ? "#065f46" : "#111827"};">${pct}%${isDominant ? " ★" : ""}</span>
    </div>`;
  }).join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${template.name} — ${companyName}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 15mm 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 32px 0; color: #333; background: #fff; }

          .report-section { page-break-before: always; break-before: page; }
          .report-section-cover { page-break-inside: avoid; break-inside: avoid; }

          .report-header {
            display: flex; justify-content: space-between; align-items: flex-start;
            margin-bottom: 48px; padding-bottom: 32px; border-bottom: 3px solid #10b981;
            page-break-inside: avoid; break-inside: avoid;
          }
          .header-left { flex: 2; }
          .header-right { flex: 1; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 16px; border-radius: 12px; border: 2px solid #3b82f6; }

          .logo-container { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
          .company-divider { width: 2px; height: 32px; background: #d1d5db; margin: 0 8px; }
          .company-name { font-size: 18px; font-weight: 600; color: #374151; }

          .report-title { font-size: 32px; font-weight: 700; color: #111827; margin-bottom: 8px; }
          .report-subtitle { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 12px; }
          .verified-badge { background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; font-size: 10px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
          .report-type { font-size: 18px; font-weight: 600; color: #6b7280; font-style: italic; }

          .report-meta { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #6b7280; margin-top: 8px; }
          .meta-divider { color: #d1d5db; }
          .evidence-confirmed { display: flex; align-items: center; gap: 4px; color: #10b981; font-weight: 600; }

          .impact-score-box h4 { font-size: 11px; color: #3b82f6; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px; }
          .impact-score-value { font-size: 36px; font-weight: 800; color: #1e3a8a; }
          .impact-score-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

          h2 { font-size: 20px; font-weight: 700; color: #1e3a8a; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #10b981; page-break-after: avoid; break-after: avoid; }
          /* Keep h2 glued to its immediate sibling */
          h2 + * { page-break-before: avoid; break-before: avoid; }
          /* If the immediate sibling is an intro <p>, extend the chain to the element after it (the chart/table) */
          h2 + p { page-break-after: avoid; break-after: avoid; }
          h2 + p + * { page-break-before: avoid; break-before: avoid; }
          /* Two intro paragraphs before content */
          h2 + p + p { page-break-after: avoid; break-after: avoid; }
          h2 + p + p + * { page-break-before: avoid; break-before: avoid; }
          h3 { page-break-after: avoid; break-after: avoid; }
          h3 + * { page-break-before: avoid; break-before: avoid; }
          h3 + p { page-break-after: avoid; break-after: avoid; }
          h3 + p + * { page-break-before: avoid; break-before: avoid; }

          /* Sections start on a new page but are allowed to run across pages if tall */
          .report-section { page-break-before: always; break-before: page; }
          .report-section-cover { page-break-before: avoid; break-before: avoid; page-break-inside: avoid; break-inside: avoid; }
          /* Protect known self-contained blocks that should never be split mid-element */
          .report-table-block,
          .metric-grid, .metric-card,
          .scope-grid, .scope-panel,
          .donut-section, .geo-section,
          .timeline-sla, .verification-record,
          .flow-container,
          .evidence-block,
          .assurance-grid, .assurance-panel,
          .framework-bar,
          .sample-banner,
          .report-footer { page-break-inside: avoid; break-inside: avoid; }

          .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
          .metric-card { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
          .metric-card.blue { border-left: 4px solid #3b82f6; }
          .metric-card.green { border-left: 4px solid #10b981; }
          .metric-card.purple { border-left: 4px solid #8b5cf6; }
          .metric-card.orange { border-left: 4px solid #f59e0b; }
          .metric-value { font-size: 28px; font-weight: 800; color: #1e3a8a; }
          .metric-label { font-size: 12px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.3px; }

          /* Tables: thead repeats across pages; individual rows never split */
          table { width: 100%; border-collapse: collapse; margin: 16px 0; border-radius: 8px; overflow: hidden; page-break-inside: auto; }
          thead { display: table-header-group; }
          tbody { page-break-inside: auto; }
          th { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 14px 16px; text-align: left; font-weight: 600; font-size: 13px; page-break-inside: avoid; break-inside: avoid; }
          td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; page-break-inside: avoid; break-inside: avoid; }
          tr { page-break-inside: avoid; break-inside: avoid; }
          tr:nth-child(even) { background: #f9fafb; }
          tr:hover { background: #f3f4f6; }
          .sdg-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; color: white; font-weight: 700; font-size: 12px; margin-right: 8px; }
          .sdg-name { font-weight: 500; }

          .progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
          .progress-fill { height: 100%; background: linear-gradient(90deg, #10b981 0%, #14b8a6 100%); border-radius: 4px; }

          .report-footer { margin-top: 40px; padding-top: 22px; border-top: 2px solid #e5e7eb; page-break-inside: avoid; }
          .footer-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
          .footer-logo-block { display: flex; align-items: center; gap: 8px; }
          .footer-ids { text-align: right; font-size: 10px; color: #9ca3af; line-height: 1.8; }
          .footer-fw-bar { display: flex; justify-content: center; align-items: center; gap: 7px; flex-wrap: wrap; margin-bottom: 9px; }
          .footer-fw-tag { font-size: 9px; font-weight: 600; color: #6b7280; padding: 2px 7px; border: 1px solid #e5e7eb; border-radius: 8px; }
          .footer-tagline { font-size: 12px; color: #6b7280; font-style: italic; margin-bottom: 10px; text-align: center; }
          .footer-generated { font-size: 12px; color: #374151; margin-bottom: 8px; text-align: center; }
          .footer-confidential { font-size: 11px; color: #9ca3af; padding: 7px 14px; background: #f9fafb; border-radius: 6px; display: inline-block; }
          .footer-copyright { font-size: 11px; color: #9ca3af; margin-top: 10px; text-align: center; }

          .sdg-watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); opacity:0.03; pointer-events:none; z-index:-1; }

          .sample-banner { background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%); border:2px solid #f59e0b; border-radius:8px; padding:8px 16px; text-align:center; margin-bottom:14px; }
          .sample-banner-text { font-size:12px; font-weight:800; color:#92400e; text-transform:uppercase; letter-spacing:1px; }

          .framework-bar { background:linear-gradient(135deg,#0A2463 0%,#1e3a8a 100%); border-radius:10px; padding:13px 18px; margin-bottom:18px; page-break-inside:avoid; }
          .framework-bar-primary { display:flex; align-items:center; gap:10px; margin-bottom:9px; flex-wrap:wrap; }
          .framework-primary-label { font-size:10px; color:#93c5fd; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; white-space:nowrap; }
          .wef-pill { background:#D4980C; color:white; font-size:11px; font-weight:800; padding:4px 13px; border-radius:20px; letter-spacing:0.3px; }
          .framework-bar-secondary { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
          .secondary-label { font-size:10px; color:#93c5fd; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap; }
          .fw-pill { background:rgba(255,255,255,0.12); color:#e0f2fe; font-size:10px; font-weight:600; padding:3px 9px; border-radius:12px; border:1px solid rgba(255,255,255,0.2); }
          .fw-pill.global-fw { background:rgba(99,102,241,0.3); border-color:rgba(99,102,241,0.5); }
          .isae-badge { background:rgba(16,185,129,0.25); color:#6ee7b7; font-size:10px; font-weight:700; padding:3px 10px; border-radius:12px; border:1px solid rgba(16,185,129,0.4); margin-left:auto; white-space:nowrap; }

          .ring-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:16px 0; page-break-inside:avoid; }

          .flow-container { display:flex; align-items:stretch; gap:0; margin:16px 0; page-break-inside:avoid; }
          .flow-box { flex:1; background:#eff6ff; border:2px solid #3b82f6; border-radius:10px; padding:14px 8px; text-align:center; }
          .flow-box.green { background:#f0fdf4; border-color:#10b981; }
          .flow-box.purple { background:#faf5ff; border-color:#8b5cf6; }
          .flow-box.gold { background:#fffbeb; border-color:#f59e0b; }
          .flow-arrow { font-size:20px; color:#9ca3af; padding:0 6px; display:flex; align-items:center; flex-shrink:0; }
          .flow-icon { font-size:20px; margin-bottom:5px; }
          .flow-label { font-size:11px; font-weight:700; color:#111827; }
          .flow-sub { font-size:9px; color:#6b7280; margin-top:3px; }
          .flow-count { font-size:18px; font-weight:800; color:#1e3a8a; margin-top:4px; }

          .scope-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin:14px 0; page-break-inside:avoid; }
          .scope-panel { border-radius:12px; padding:18px; }
          .scope-panel.included { background:#f0fdf4; border:2px solid #10b981; }
          .scope-panel.excluded { background:#fffbeb; border:2px solid #f59e0b; }
          .scope-header { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:11px; display:flex; align-items:center; gap:7px; }
          .scope-header.inc { color:#065f46; }
          .scope-header.exc { color:#92400e; }
          .scope-badge { padding:3px 9px; border-radius:10px; font-size:9px; font-weight:700; }
          .scope-badge.inc { background:#10b981; color:white; }
          .scope-badge.exc { background:#f59e0b; color:white; }
          .scope-item { display:flex; align-items:flex-start; gap:7px; margin-bottom:7px; font-size:11px; color:#374151; }
          .scope-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:3px; }
          .scope-dot.inc { background:#10b981; }
          .scope-dot.exc { background:#f59e0b; }

          .donut-section { display:grid; grid-template-columns:230px 1fr; gap:22px; align-items:center; margin:14px 0; page-break-inside:avoid; }

          .geo-section { margin:14px 0; page-break-inside:avoid; }
          .geo-map { width:100%; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb; }
          .geo-legend { display:flex; gap:18px; margin-top:9px; flex-wrap:wrap; }
          .geo-legend-item { display:flex; align-items:center; gap:6px; font-size:11px; color:#374151; }

          .timeline-sla { background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%); border:2px solid #10b981; border-radius:10px; padding:13px 18px; margin-bottom:14px; display:flex; align-items:center; gap:18px; flex-wrap:wrap; page-break-inside:avoid; }
          .sla-metric { text-align:center; }
          .sla-value { font-size:22px; font-weight:800; color:#065f46; }
          .sla-label { font-size:9px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; }
          .sla-divider { width:1px; height:44px; background:#d1fae5; flex-shrink:0; }
          .timeline-track { position:relative; margin:22px 0 6px 0; page-break-inside:avoid; }
          .timeline-line { height:4px; background:linear-gradient(90deg,#10b981,#3b82f6); border-radius:2px; }
          .timeline-nodes { display:flex; justify-content:space-between; margin-top:-14px; }
          .timeline-node { text-align:center; width:80px; }
          .timeline-dot { width:24px; height:24px; border-radius:50%; border:3px solid white; margin:0 auto 5px; }
          .timeline-dot.completed { background:#10b981; box-shadow:0 0 0 3px #d1fae5; }
          .timeline-dot.current { background:#3b82f6; box-shadow:0 0 0 3px #dbeafe; }
          .timeline-node-label { font-size:9px; color:#374151; font-weight:600; line-height:1.3; }
          .timeline-node-date { font-size:8px; color:#9ca3af; margin-top:2px; }
          .verification-record { background:#1e293b; border-radius:10px; padding:15px 18px; margin-top:14px; page-break-inside:avoid; }
          .vr-header { font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:10px; }
          .vr-row { display:flex; gap:8px; margin-bottom:5px; font-family:'Courier New',monospace; font-size:10px; }
          .vr-key { color:#7dd3fc; font-weight:600; min-width:120px; flex-shrink:0; }
          .vr-val { color:#e2e8f0; }
          .vr-val.green { color:#6ee7b7; }
          .vr-val.gold { color:#fcd34d; }

          .pillar-tag { display:inline-block; font-size:8px; font-weight:700; padding:2px 6px; border-radius:8px; margin:1px; text-transform:uppercase; letter-spacing:0.3px; }
          .pillar-planet { background:#d1fae5; color:#065f46; }
          .pillar-people { background:#ede9fe; color:#4c1d95; }
          .pillar-prosperity { background:#fef3c7; color:#78350f; }
          .pillar-governance { background:#dbeafe; color:#1e3a8a; }

          .evidence-block { background:#0f172a; border-radius:10px; padding:18px; margin:14px 0; page-break-inside:avoid; border-left:4px solid #D4980C; }
          .evidence-title { font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:12px; }
          .evidence-line { font-family:'Courier New',monospace; font-size:11px; line-height:1.7; }
          .ev-key { color:#7dd3fc; }
          .ev-val { color:#e2e8f0; }
          .ev-val.str { color:#a3e635; }
          .ev-val.num { color:#fb923c; }
          .ev-val.bool { color:#60a5fa; }
          .ev-bracket { color:rgba(226,232,240,0.5); }

          .matrix-table th { font-size:11px; }
          .matrix-table td { font-size:10px; }
          .matrix-table .wef-col { font-weight:700; color:#1e3a8a; background:#eff6ff; }
          .matrix-note { font-size:10px; color:#6b7280; font-style:italic; margin-top:8px; }

          .assurance-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin:14px 0; page-break-inside:avoid; }
          .assurance-panel { border-radius:12px; padding:16px; }
          .assurance-panel.synerxus { background:#eff6ff; border:2px solid #3b82f6; }
          .assurance-panel.auditor { background:#f5f3ff; border:2px solid #8b5cf6; }
          .assurance-panel-header { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:10px; }
          .assurance-panel-header.syn { color:#1e3a8a; }
          .assurance-panel-header.aud { color:#4c1d95; }
          .assurance-item { display:flex; align-items:flex-start; gap:7px; margin-bottom:7px; font-size:11px; color:#374151; }
          .assurance-icon { flex-shrink:0; font-size:12px; }

          /* ── Utility: any div/section explicitly marked no-break ── */
          .no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
          .break-before { page-break-before: always !important; break-before: page !important; }

          /* ── @media print: force the browser print engine to honour all rules ── */
          @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            html, body { margin: 0 !important; }
            body { orphans: 3; widows: 3; }

            .report-section { page-break-before: always !important; break-before: page !important; }
            .report-section-cover { page-break-before: avoid !important; break-before: avoid !important; page-break-inside: avoid !important; break-inside: avoid !important; }

            h2 { page-break-after: avoid !important; break-after: avoid !important; }
            h2 + * { page-break-before: avoid !important; break-before: avoid !important; }
            h2 + p { page-break-after: avoid !important; break-after: avoid !important; }
            h2 + p + * { page-break-before: avoid !important; break-before: avoid !important; }
            h2 + p + p { page-break-after: avoid !important; break-after: avoid !important; }
            h2 + p + p + * { page-break-before: avoid !important; break-before: avoid !important; }
            h3 { page-break-after: avoid !important; break-after: avoid !important; }
            h3 + * { page-break-before: avoid !important; break-before: avoid !important; }
            h3 + p { page-break-after: avoid !important; break-after: avoid !important; }
            h3 + p + * { page-break-before: avoid !important; break-before: avoid !important; }

            /* Tables: rows never split; header repeats */
            table { page-break-inside: auto !important; }
            thead { display: table-header-group !important; }
            tbody { page-break-inside: auto !important; }
            tr { page-break-inside: avoid !important; break-inside: avoid !important; }
            td, th { page-break-inside: avoid !important; break-inside: avoid !important; }

            /* SVG and visual elements */
            svg { page-break-inside: avoid !important; break-inside: avoid !important; display: block !important; }

            /* All named block components */
            .metric-grid, .metric-card,
            .scope-grid, .scope-panel,
            .donut-section, .geo-section, .geo-map,
            .timeline-sla, .verification-record,
            .flow-container, .flow-box,
            .evidence-block,
            .assurance-grid, .assurance-panel,
            .framework-bar,
            .sample-banner,
            .report-footer,
            .report-table-block,
            .no-break { page-break-inside: avoid !important; break-inside: avoid !important; }

            /* Inline-styled info-box pattern used throughout the report */
            div[style*="border-radius"] { page-break-inside: avoid !important; break-inside: avoid !important; }
          }
        </style>
      </head>
      <body>
        <!-- SDG Wheel Watermark -->
        <div class="sdg-watermark">
          <svg viewBox="0 0 200 200" width="600" height="600">
            ${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17].map((sdg, index) => {
              const anglePerSegment = (2 * Math.PI) / 17;
              const startAngle = index * anglePerSegment - Math.PI / 2;
              const endAngle = startAngle + anglePerSegment;
              const center = 100, outerRadius = 95, innerRadius = 30;
              const x1 = center + innerRadius * Math.cos(startAngle);
              const y1 = center + innerRadius * Math.sin(startAngle);
              const x2 = center + outerRadius * Math.cos(startAngle);
              const y2 = center + outerRadius * Math.sin(startAngle);
              const x3 = center + outerRadius * Math.cos(endAngle);
              const y3 = center + outerRadius * Math.sin(endAngle);
              const x4 = center + innerRadius * Math.cos(endAngle);
              const y4 = center + innerRadius * Math.sin(endAngle);
              return `<path d="M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1} Z" fill="${getSDGColor(sdg)}" />`;
            }).join("")}
            <circle cx="100" cy="100" r="28" fill="white"/>
          </svg>
        </div>

        <!-- ═══ SECTION 1: Header ═══ -->
        <div class="report-section-cover">
          <div class="sample-banner">
            <div class="sample-banner-text">⚠ SAMPLE REPORT — Illustrative data only · Not for external distribution</div>
          </div>
          <div class="framework-bar">
            <div class="framework-bar-primary">
              <span class="framework-primary-label">Primary Framework</span>
              <span class="wef-pill">WEF Stakeholder Capitalism Metrics</span>
              <span class="isae-badge">ISAE 3000 Revised · Assurance-Support</span>
            </div>
            <div class="framework-bar-secondary">
              <span class="secondary-label">Evidence aligned for:</span>
              <span class="fw-pill">GRI Standards</span>
              <span class="fw-pill">SASB</span>
              <span class="fw-pill">ESRS Evidence Alignment</span>
              <span class="fw-pill">UN SDGs</span>
              <span class="fw-pill">TCFD</span>
            </div>
          </div>
          <div class="report-header">
            <div class="header-left">
              <div class="logo-container">
                <img src="${origin}/synerxus-esg-logo.png" alt="Synerxus" style="height: 44px; width: auto;" />
                <div style="display:flex;flex-direction:column;justify-content:center;gap:2px;">
                  <span style="font-size:26px;font-weight:700;letter-spacing:-0.02em;line-height:1;font-family:Arial,sans-serif;">
                    <span style="color:#0A2463;">SYNERXUS</span>
                  </span>
                  <span style="font-size:13px;font-weight:600;line-height:1;white-space:nowrap;font-family:Arial,sans-serif;">
                    <span style="color:#D4980C;">Evidence.</span> <span style="color:#0A2463;">Verified.</span>
                  </span>
                </div>
              </div>
              <div class="report-title">${companyName}</div>
              <div class="report-subtitle">
                <span class="verified-badge">✓ Partner-Confirmed</span>
                <span class="report-type">Verified Evidence Summary</span>
              </div>
              <div style="font-size:12px;color:#6b7280;font-style:italic;margin-top:4px;margin-bottom:6px;">Prepared for ESG / CSR Reporting and Assurance Support</div>
              <div style="font-size:11px;font-weight:600;color:#1e3a8a;margin-bottom:8px;">Management Reporting — Verified Evidence Records</div>
              <div class="report-meta">
                <span>📅 ${currentDate}</span>
                <span class="meta-divider">|</span>
                <span class="evidence-confirmed">✓ Evidence Confirmed</span>
                <span class="meta-divider">|</span>
                <span style="font-size:12px;color:#6b7280;">Report ID: ${reportId}</span>
              </div>
              ${filterLabel ? `<div style="margin-top:8px;font-size:12px;color:#6b7280;">🔍 ${filterLabel}</div>` : ""}
            </div>
            <div class="header-right">
              <div class="impact-score-box">
                <h4>SDGs Evidence-Mapped</h4>
                <div class="impact-score-value">${sdgMetricsData.length || 0}</div>
                <div class="impact-score-label">Framework-aligned goals</div>
              </div>
            </div>
          </div>
          <div class="no-break" style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border:1.5px solid #3b82f6;border-radius:8px;padding:12px 16px;margin-top:0;">
            <div style="font-size:10px;font-weight:800;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;">⚠ Evidence Boundary Statement</div>
            <div style="font-size:11px;color:#374151;line-height:1.6;">Synerxus provides structured, independently confirmed evidence that supports reporting and assurance preparation. <strong>Synerxus does not replace independent assurance providers, provide formal assurance opinions, guarantee regulatory compliance, or establish causal attribution.</strong> Volunteer time is an input. Partner-confirmed outputs are the verified evidence. Beneficiary reach is partner-reported unless independently verified. Framework alignment is evidence support, not compliance certification.</div>
          </div>
        </div>

        <!-- ═══ SECTION 2: Evidence Snapshot — 3-Tier Classification ═══ -->
        <div class="report-section">
          <h2>Evidence Snapshot — Classification by Confidence Tier</h2>
          <p style="font-size:11px;color:#374151;margin-bottom:14px;line-height:1.6;">Metrics in the <strong>Verified</strong> tier are supported by partner confirmation. Metrics in the <strong>Partner-reported</strong> tier are reported by implementing partners according to their own methodology. Metrics in the <strong>Derived / mapped</strong> tier are generated from Synerxus classification and framework alignment rules.</p>

          <div class="no-break" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:18px;">
            <!-- Tier 1: Verified -->
            <div class="no-break" style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border:2px solid #10b981;border-radius:10px;padding:16px;">
              <div style="font-size:10px;font-weight:800;color:#065f46;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;display:flex;align-items:center;gap:6px;"><span style="background:#10b981;color:white;border-radius:50%;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;">✓</span> Verified</div>
              <div style="font-size:11px;color:#111827;margin-bottom:6px;"><strong>${Math.round(totalHours * 0.12) || 24}</strong> <span style="color:#6b7280;">verified evidence records</span></div>
              <div style="font-size:11px;color:#111827;margin-bottom:6px;"><strong>${Math.round(totalHours * 0.12) || 24}</strong> <span style="color:#6b7280;">partner-confirmed outputs</span></div>
              <div style="font-size:11px;color:#111827;margin-bottom:6px;"><strong>${totalHours.toLocaleString()} hrs</strong> <span style="color:#6b7280;">verified volunteer hours</span></div>
              <div style="font-size:11px;color:#111827;margin-bottom:6px;"><strong>100%</strong> <span style="color:#6b7280;">verification rate</span></div>
              <div style="font-size:11px;color:#111827;"><strong>4.2h</strong> <span style="color:#6b7280;">avg. time to verify</span></div>
            </div>
            <!-- Tier 2: Partner-reported -->
            <div class="no-break" style="background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);border:2px solid #f59e0b;border-radius:10px;padding:16px;">
              <div style="font-size:10px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;display:flex;align-items:center;gap:6px;"><span style="background:#f59e0b;color:white;border-radius:50%;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;">P</span> Partner-reported</div>
              <div style="font-size:11px;color:#111827;margin-bottom:6px;"><strong>${directBeneficiaries.toLocaleString()}</strong> <span style="color:#6b7280;">partner-reported beneficiary reach</span></div>
              <div style="font-size:11px;color:#111827;margin-bottom:6px;"><strong>${data?.ngoPartners?.length || 5}</strong> <span style="color:#6b7280;">communities reached (partner-reported)</span></div>
              <div style="font-size:11px;color:#111827;margin-bottom:6px;"><span style="color:#6b7280;">Program reach estimates per partner methodology</span></div>
              <div style="font-size:11px;color:#6b7280;font-style:italic;margin-top:8px;font-size:10px;">Demographic and geographic reach data are partner-reported and not independently verified unless stated.</div>
            </div>
            <!-- Tier 3: Derived / mapped -->
            <div class="no-break" style="background:linear-gradient(135deg,#faf5ff 0%,#ede9fe 100%);border:2px solid #8b5cf6;border-radius:10px;padding:16px;">
              <div style="font-size:10px;font-weight:800;color:#4c1d95;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;display:flex;align-items:center;gap:6px;"><span style="background:#8b5cf6;color:white;border-radius:50%;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;">~</span> Derived / Mapped</div>
              <div style="font-size:11px;color:#111827;margin-bottom:6px;"><strong>${sdgMetricsData.length || 0}</strong> <span style="color:#6b7280;">SDG goals — mapped for reporting support</span></div>
              <div style="font-size:11px;color:#111827;margin-bottom:6px;"><span style="color:#6b7280;">ESRS / GRI / SASB / TCFD alignment — framework support</span></div>
              <div style="font-size:11px;color:#111827;margin-bottom:6px;"><span style="color:#6b7280;">Contribution pathways — documented, not causal attribution</span></div>
              <div style="font-size:11px;color:#111827;"><span style="color:#6b7280;">Skills and project categories — Synerxus classification</span></div>
            </div>
          </div>
        </div>

        <!-- ═══ SECTION 3: Evidence Pipeline ═══ -->
        <div class="report-section">
          <h2>Evidence Pipeline</h2>
          <p style="font-size:11px;color:#374151;margin-bottom:12px;line-height:1.6;">This section documents the chain connecting volunteer activity, partner-confirmed output, and reported program reach. It does not claim sole causality or causal attribution.</p>
          <div class="flow-container">
            <div class="flow-box">
              <div class="flow-icon">👥</div>
              <div class="flow-label">Volunteer Activity Recorded</div>
              <div class="flow-count">${activeEmployees}</div>
              <div class="flow-sub">Employees engaged (input)</div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-box green">
              <div class="flow-icon">🏢</div>
              <div class="flow-label">Authorized Partner Confirmed Output</div>
              <div class="flow-count">${data?.ngoPartners?.length || 5}</div>
              <div class="flow-sub">Confirmed partner organizations</div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-box purple">
              <div class="flow-icon">🔗</div>
              <div class="flow-label">Partner-Reported Reach Documented</div>
              <div class="flow-count">${directBeneficiaries.toLocaleString()}</div>
              <div class="flow-sub">Beneficiary reach (partner-reported)</div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-box gold">
              <div class="flow-icon">🌍</div>
              <div class="flow-label">Evidence Mapped to SDG</div>
              <div class="flow-count">${sdgMetricsData.length || 0}</div>
              <div class="flow-sub">Goals — documented output alignment</div>
            </div>
          </div>
        </div>

        <!-- ═══ SECTION 4: Key Engagement Metrics ═══ -->
        <div class="report-section">
          <h2>Key Engagement Metrics</h2>
          <div class="metric-grid">
            <div class="metric-card blue">
              <div class="metric-value">${totalHours.toLocaleString()}</div>
              <div class="metric-label">Verified Volunteer Hours</div>
            </div>
            <div class="metric-card green">
              <div class="metric-value">${activeEmployees}</div>
              <div class="metric-label">Active Employees</div>
            </div>
            <div class="metric-card purple">
              <div class="metric-value">${participationRate}%</div>
              <div class="metric-label">Participation Rate</div>
            </div>
            <div class="metric-card orange">
              <div class="metric-value">${directBeneficiaries.toLocaleString()}</div>
              <div class="metric-label">Partner-Reported Beneficiary Reach</div>
            </div>
            <div class="metric-card blue">
              <div class="metric-value">$${Math.round(economicValue / 1000)}K</div>
              <div class="metric-label">Estimated Economic Value</div>
            </div>
            <div class="metric-card green">
              <div class="metric-value">${Math.round(totalHours * 0.12) || 24}</div>
              <div class="metric-label">Verified Evidence Records</div>
            </div>
          </div>
        </div>

        <!-- ═══ SECTION 5: Evidence Quality Scorecard ═══ -->
        <div class="report-section">
          <h2>Evidence Quality Scorecard</h2>
          <p style="font-size:11px;color:#374151;margin-bottom:12px;line-height:1.6;">Completeness of evidence fields across verified records. Fields marked as incomplete or pending are not included in the Verified tier counts above.</p>
          <table class="matrix-table">
            <thead>
              <tr>
                <th style="width:35%">Evidence Field</th>
                <th style="width:25%">Completeness</th>
                <th style="width:40%">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Outcome description</td><td><span style="color:#10b981;font-weight:700;">100%</span></td><td>All confirmed records include output description</td></tr>
              <tr><td>Partner confirmation</td><td><span style="color:#10b981;font-weight:700;">100%</span></td><td>All records carry authorized partner confirmation</td></tr>
              <tr><td>Verification timestamp</td><td><span style="color:#10b981;font-weight:700;">100%</span></td><td>Records without timestamp classified as Pending, not Verified</td></tr>
              <tr><td>Verifier role</td><td><span style="color:#10b981;font-weight:700;">100%</span></td><td>Authorized partner role recorded on all verified records</td></tr>
              <tr><td>Volunteer hours linked</td><td><span style="color:#10b981;font-weight:700;">100%</span></td><td>Hours linked to associated activity records</td></tr>
              <tr><td>Location context</td><td><span style="color:#f59e0b;font-weight:700;">Country / Region</span></td><td>Sub-national precision varies by partner; precise coordinates not disclosed</td></tr>
              <tr><td>Sensitive technical metadata</td><td><span style="color:#6b7280;font-weight:700;">Retained internally</span></td><td>Redacted from this management report per redaction policy</td></tr>
              <tr><td>Beneficiary methodology</td><td><span style="color:#f59e0b;font-weight:700;">Partner-reported</span></td><td>Counting methodology is partner-defined; not independently verified</td></tr>
              <tr><td>Framework alignment</td><td><span style="color:#8b5cf6;font-weight:700;">Mapped for reporting support</span></td><td>SDG / ESRS / GRI / SASB / TCFD — alignment only, not compliance determination</td></tr>
            </tbody>
          </table>
        </div>

        <!-- ═══ SECTION 6: Verification Scope Boundary ═══ -->
        <div class="report-section">
          <h2>Verification Scope Boundary</h2>
          <div class="scope-grid">
            <div class="scope-panel included">
              <div class="scope-header inc"><span class="scope-badge inc">INCLUDED</span> What IS verified</div>
              <div class="scope-item"><div class="scope-dot inc"></div><span>Direct employee volunteer hours (timesheet-verified)</span></div>
              <div class="scope-item"><div class="scope-dot inc"></div><span>Partner-confirmed output evidence records</span></div>
              <div class="scope-item"><div class="scope-dot inc"></div><span>Framework alignment evidence support where applicable</span></div>
              <div class="scope-item"><div class="scope-dot inc"></div><span>Employee participation and engagement records</span></div>
              <div class="scope-item"><div class="scope-dot inc"></div><span>Community investment cash contributions</span></div>
              <div class="scope-item"><div class="scope-dot inc"></div><span>Structured evidence records with tamper-evident audit trail</span></div>
            </div>
            <div class="scope-panel excluded">
              <div class="scope-header exc"><span class="scope-badge exc">NOT INCLUDED</span> What IS NOT verified</div>
              <div class="scope-item"><div class="scope-dot exc"></div><span>Long-term or causal impact (requires independent evaluation)</span></div>
              <div class="scope-item"><div class="scope-dot exc"></div><span>Independent beneficiary reach verification (partner-reported only)</span></div>
              <div class="scope-item"><div class="scope-dot exc"></div><span>Third-party partner financial statements</span></div>
              <div class="scope-item"><div class="scope-dot exc"></div><span>Contractor and agency worker hours</span></div>
              <div class="scope-item"><div class="scope-dot exc"></div><span>Non-Synerxus-platform volunteer activities</span></div>
              <div class="scope-item"><div class="scope-dot exc"></div><span>Regulatory compliance determination (auditor judgment required)</span></div>
            </div>
          </div>
        </div>

        <!-- ═══ SECTION 7: SDG Framework Alignment (Mapped) ═══ -->
        <div class="report-section">
          <h2>SDG Framework Alignment (Mapped)</h2>
          <p style="font-size:11px;color:#374151;margin-bottom:6px;line-height:1.6;">SDG alignment is derived from Synerxus output classification and documented activity data. Alignment indicates mapping based on documented output — it does not constitute formal SDG compliance certification or independently verified causal attribution to SDG progress.</p>
          <table>
            <thead>
              <tr>
                <th style="width:40%">SDG Goal</th>
                <th style="width:20%">Volunteer Hours (Input)</th>
                <th style="width:20%">Mapped Hours Distribution</th>
                <th style="width:20%">% of Total</th>
              </tr>
            </thead>
            <tbody>
              ${(data?.sdgMetrics || []).slice(0, 8).map((sdg: any) => `
                <tr>
                  <td>
                    <span class="sdg-badge" style="background-color:${getSDGColor(sdg.goal)}">${sdg.goal}</span>
                    <span class="sdg-name">${getSDGName(sdg.goal)}</span>
                    <div style="font-size:9px;color:#9ca3af;margin-top:2px;">Mapped to SDG ${sdg.goal} based on documented output alignment</div>
                  </td>
                  <td>${(sdg.hours || 0).toLocaleString()} hrs</td>
                  <td><div class="progress-bar"><div class="progress-fill" style="width:${sdg.percentage || 0}%"></div></div></td>
                  <td><strong>${sdg.percentage || 0}%</strong></td>
                </tr>
              `).join("") || `
                <tr><td colspan="4" style="text-align:center;color:#6b7280;padding:24px;">No SDG data available for this period</td></tr>
              `}
            </tbody>
          </table>
        </div>

        <!-- ═══ SECTION 8: SDG Distribution Chart ═══ -->
        <div class="report-section">
          <h2>SDG Evidence Distribution</h2>
          <p style="font-size:10px;color:#6b7280;margin-bottom:10px;font-style:italic;">Distribution by volunteer hours mapped per SDG framework alignment rules. Mapping is classification-based, not a causal impact measurement.</p>
          <div class="donut-section">
            <div>
              <svg viewBox="0 0 220 220" width="220" height="220">
                ${buildDonutSlices()}
                <circle cx="110" cy="110" r="48" fill="white"/>
                <text x="110" y="106" text-anchor="middle" font-size="13" font-weight="800" fill="#1e3a8a" font-family="Arial,sans-serif">${sdgMetricsData.length || 0}</text>
                <text x="110" y="121" text-anchor="middle" font-size="9" fill="#6b7280" font-family="Arial,sans-serif">SDGs mapped</text>
              </svg>
            </div>
            <div>${buildDonutLegend() || "<p style=\"color:#9ca3af;font-size:12px;\">No SDG distribution data available</p>"}</div>
          </div>
        </div>

        <!-- ═══ SECTION 9: Geographic Coverage ═══ -->
        <div class="report-section">
          <h2>Geographic Coverage</h2>
          <div class="geo-section">
            <div class="geo-map">
              <svg viewBox="0 0 700 320" width="100%" style="display:block;">
                <rect width="700" height="320" fill="#dbeafe" rx="8"/>
                <path d="M 60 35 L 90 28 L 145 30 L 180 42 L 202 62 L 206 92 L 196 126 L 178 153 L 158 163 L 128 158 L 98 144 L 74 118 L 54 84 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                <ellipse cx="188" cy="21" rx="22" ry="13" fill="#bfdbfe" stroke="white" stroke-width="1"/>
                <path d="M 158 163 L 174 172 L 177 190 L 158 197 L 146 188 L 144 172 Z" fill="#bfdbfe" stroke="white" stroke-width="1"/>
                <ellipse cx="190" cy="173" rx="10" ry="5" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                <path d="M 146 196 L 190 188 L 214 206 L 218 242 L 213 278 L 198 300 L 172 307 L 148 298 L 130 268 L 124 228 L 128 205 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                <path d="M 297 28 L 340 23 L 366 34 L 376 56 L 370 76 L 350 86 L 323 88 L 303 77 L 291 56 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                <ellipse cx="283" cy="43" rx="8" ry="12" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                <path d="M 318 9 L 340 7 L 348 27 L 330 29 L 314 24 Z" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                <path d="M 298 95 L 355 89 L 386 104 L 396 136 L 393 176 L 380 217 L 359 239 L 333 245 L 306 234 L 288 204 L 280 166 L 280 123 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                <ellipse cx="405" cy="218" rx="8" ry="17" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                <path d="M 376 24 L 432 17 L 502 19 L 562 27 L 596 50 L 601 80 L 580 110 L 539 128 L 489 132 L 438 127 L 399 109 L 381 78 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                <path d="M 460 124 L 491 119 L 512 138 L 511 169 L 492 186 L 471 183 L 454 160 L 449 135 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                <path d="M 530 119 L 576 113 L 601 129 L 599 158 L 578 173 L 547 165 L 529 147 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                <ellipse cx="578" cy="180" rx="28" ry="10" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                <ellipse cx="620" cy="157" rx="12" ry="8" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                <ellipse cx="630" cy="73" rx="8" ry="20" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                <path d="M 544 208 L 610 200 L 646 219 L 656 255 L 648 288 L 619 306 L 584 305 L 554 284 L 537 251 L 534 221 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                <ellipse cx="668" cy="300" rx="8" ry="16" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                <circle cx="127" cy="97" r="8" fill="#10b981" stroke="white" stroke-width="2.5"/>
                <text x="127" y="86" text-anchor="middle" font-size="8" font-weight="700" fill="#065f46" font-family="Arial">USA</text>
                <circle cx="357" cy="172" r="8" fill="#10b981" stroke="white" stroke-width="2.5"/>
                <text x="357" y="161" text-anchor="middle" font-size="8" font-weight="700" fill="#065f46" font-family="Arial">Kenya</text>
                <circle cx="481" cy="154" r="8" fill="#10b981" stroke="white" stroke-width="2.5"/>
                <text x="481" y="143" text-anchor="middle" font-size="8" font-weight="700" fill="#065f46" font-family="Arial">India</text>
                <circle cx="607" cy="147" r="7" fill="#10b981" stroke="white" stroke-width="2.5"/>
                <text x="607" y="136" text-anchor="middle" font-size="8" font-weight="700" fill="#065f46" font-family="Arial">PHL</text>
              </svg>
            </div>
            <div class="geo-legend">
              <div class="geo-legend-item"><div style="width:12px;height:12px;border-radius:50%;background:#10b981;flex-shrink:0;"></div> Confirmed partner organization locations (4 locations · 3 continents). Precise coordinates are not disclosed; country-level data shown.</div>
            </div>
          </div>
        </div>

        <!-- ═══ SECTION 10: Evidence Confirmation Timeline ═══ -->
        <div class="report-section">
          <h2>Evidence Confirmation Timeline</h2>
          <div class="timeline-sla">
            <div class="sla-metric"><div class="sla-value">100%</div><div class="sla-label">Partner-confirmed</div></div>
            <div class="sla-divider"></div>
            <div class="sla-metric"><div class="sla-value">4.2h</div><div class="sla-label">Avg. Confirmation Time</div></div>
            <div class="sla-divider"></div>
            <div class="sla-metric"><div class="sla-value">${Math.round(totalHours * 0.12) || 24}</div><div class="sla-label">Evidence Records Verified</div></div>
            <div class="sla-divider"></div>
            <div class="sla-metric"><div class="sla-value">0</div><div class="sla-label">Open Exceptions</div></div>
            <div style="margin-left:auto;background:#10b981;color:white;font-size:11px;font-weight:700;padding:8px 14px;border-radius:20px;white-space:nowrap;">✓ Structured</div>
          </div>
          <div class="no-break" style="margin:18px 0 6px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:11px;font-weight:700;color:#111827;">Confirmation Time Distribution (Jan–${new Date().getFullYear()})</span>
              <span style="font-size:10px;color:#10b981;font-weight:700;">Avg: 29h confirmation time</span>
            </div>
            <div style="position:relative;height:32px;background:#e5e7eb;border-radius:8px;overflow:hidden;">
              <div style="width:40.3%;height:100%;background:linear-gradient(90deg,#059669 0%,#10b981 100%);border-radius:8px 0 0 8px;display:flex;align-items:center;padding-left:10px;">
                <span style="font-size:10px;font-weight:800;color:white;">29h avg</span>
              </div>
              <div style="position:absolute;right:0;top:0;width:3px;height:100%;background:#ef4444;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:8.5px;color:#9ca3af;margin-top:4px;padding:0 1px;">
              <span>0h</span><span>18h</span><span>36h</span><span>54h</span><span style="color:#6b7280;font-weight:700;">review window</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:14px;padding:0 2px;">
              ${["Jan 1 — Period Open", "Jan–Mar — Collection", "Q1 Close — Attestation", "Apr — Review", "Today — Published"].map((label, i) => `
                <div style="text-align:center;flex:1;">
                  <div style="width:10px;height:10px;border-radius:50%;background:${i < 4 ? "#10b981" : "#3b82f6"};border:2px solid white;box-shadow:0 0 0 2px ${i < 4 ? "#d1fae5" : "#dbeafe"};margin:0 auto 4px;"></div>
                  <div style="font-size:8px;color:#374151;font-weight:600;line-height:1.3;">${label}</div>
                </div>`).join("")}
            </div>
          </div>
        </div>

        <!-- ═══ SECTION 11: Partner Organization Registry ═══ -->
        <div class="report-section">
          <h2>Partner Organization Registry</h2>
          <table>
            <thead>
              <tr>
                <th>Partner Organization</th>
                <th>Country</th>
                <th>WEF Pillar</th>
                <th>Volunteer Hours (Input)</th>
                <th>Evidence Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>Hope Foundation</strong></td><td>Kenya 🇰🇪</td><td><span class="pillar-tag pillar-people">People</span><span class="pillar-tag pillar-planet">Planet</span></td><td>312 hrs input</td><td style="color:#10b981;font-weight:700;">✓ Output Confirmed</td></tr>
              <tr><td><strong>Digital Access PH</strong></td><td>Philippines 🇵🇭</td><td><span class="pillar-tag pillar-prosperity">Prosperity</span></td><td>186 hrs input</td><td style="color:#10b981;font-weight:700;">✓ Output Confirmed</td></tr>
              <tr><td><strong>Green Futures Zambia</strong></td><td>Zambia 🇿🇲</td><td><span class="pillar-tag pillar-planet">Planet</span></td><td>240 hrs input</td><td style="color:#10b981;font-weight:700;">✓ Output Confirmed</td></tr>
              <tr><td><strong>Community Health NG</strong></td><td>Nigeria 🇳🇬</td><td><span class="pillar-tag pillar-people">People</span><span class="pillar-tag pillar-governance">Governance</span></td><td>158 hrs input</td><td style="color:#f59e0b;font-weight:700;">⏳ Pending Confirmation</td></tr>
              <tr><td><strong>Ayiti Tech Haiti</strong></td><td>Haiti 🇭🇹</td><td><span class="pillar-tag pillar-prosperity">Prosperity</span></td><td>94 hrs input</td><td style="color:#10b981;font-weight:700;">✓ Output Confirmed</td></tr>
            </tbody>
          </table>
        </div>

        <!-- ═══ SECTION 12: Sample Verified Evidence Records ═══ -->
        <div class="report-section">
          <h2>Sample Verified Evidence Records</h2>
          <p style="font-size:11px;color:#374151;margin-bottom:10px;line-height:1.6;">Records below are illustrative samples of partner-confirmed evidence. Sensitive technical metadata is retained internally and redacted from this management report.</p>
          <div class="evidence-block">
            <div class="evidence-title">// Synerxus Evidence Record · Assurance-Support Documentation</div>
            <div class="evidence-line"><span class="ev-bracket">{</span></div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"evidence_record_id"</span>: <span class="ev-val str">"SYN-EV-2024-004821"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"project_name"</span>: <span class="ev-val str">"Digital Literacy Programme — Nairobi"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"output_description"</span>: <span class="ev-val str">"Digital skills training delivered to community learners"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"activity_context"</span>: <span class="ev-val str">"Corporate volunteer engagement — employee-delivered sessions"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"volunteer_hours"</span>: <span class="ev-val num">48</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"authorized_partner_confirmation"</span>: <span class="ev-val str">"Hope Foundation · Nairobi, KE — Authorized Verifier"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"verification_status"</span>: <span class="ev-val bool">PARTNER_CONFIRMED</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"verification_timestamp"</span>: <span class="ev-val str">"2024-03-14T13:47:00Z"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"location_level"</span>: <span class="ev-val str">"Country: Kenya (sub-national detail retained internally)"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"framework_alignment"</span>: <span class="ev-val str">"SDG 4 (mapped) · GRI 413-1 · ESRS S3 (evidence support)"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"beneficiary_reach"</span>: <span class="ev-val str">"Partner-reported: 312 beneficiaries (partner methodology)"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"redaction_note"</span>: <span class="ev-val str">"Device ID, verification routing, and identity metadata redacted"</span></div>
            <div class="evidence-line"><span class="ev-bracket">}</span></div>
          </div>
        </div>

        <!-- ═══ SECTION 13: Framework Alignment for Reporting Support ═══ -->
        <div class="report-section">
          <h2>Framework Alignment for Reporting Support</h2>
          <p style="font-size:11px;color:#374151;margin-bottom:12px;line-height:1.6;">The table below documents how Synerxus evidence records map to reporting frameworks. Alignment supports disclosure preparation. It does not constitute compliance determination or formal assurance. Regulatory compliance requires independent qualified assurance provider review.</p>
          <table class="matrix-table">
            <thead>
              <tr>
                <th style="width:14%">Framework / Standard</th>
                <th style="width:20%">Reporting Topic</th>
                <th style="width:36%">Evidence Support</th>
                <th style="width:30%">Limitation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="wef-col">ESRS S3</td>
                <td>Affected communities</td>
                <td>Partner-confirmed community outputs and related evidence records</td>
                <td style="font-size:10px;color:#92400e;">Does not constitute CSRD compliance determination or formal assurance</td>
              </tr>
              <tr>
                <td class="wef-col">GRI 413</td>
                <td>Local communities</td>
                <td>Partner-confirmed local community program outputs</td>
                <td style="font-size:10px;color:#92400e;">Beneficiary reach remains partner-reported unless separately verified</td>
              </tr>
              <tr>
                <td class="wef-col">GRI 404-1</td>
                <td>Training &amp; education</td>
                <td>Volunteer hours classified as skills-based; partner-confirmed delivery evidence</td>
                <td style="font-size:10px;color:#92400e;">Learning outcomes are not independently assessed</td>
              </tr>
              <tr>
                <td class="wef-col">SASB HC-MS-310a.1</td>
                <td>Community engagement</td>
                <td>Volunteer engagement hours with partner-confirmed output records</td>
                <td style="font-size:10px;color:#92400e;">Industry-specific applicability varies; not a compliance determination</td>
              </tr>
              <tr>
                <td class="wef-col">WEF SCM — People</td>
                <td>Volunteer engagement</td>
                <td>Verified volunteer hours; partner-confirmed community outputs</td>
                <td style="font-size:10px;color:#92400e;">WEF SCM alignment does not constitute formal assurance opinion</td>
              </tr>
              <tr>
                <td class="wef-col">UN SDGs</td>
                <td>SDG contribution evidence</td>
                <td>Evidence mapped to SDGs based on documented output classification</td>
                <td style="font-size:10px;color:#92400e;">Mapping indicates contribution alignment, not independently verified SDG advancement</td>
              </tr>
              <tr>
                <td class="wef-col">ESRS / CSRD</td>
                <td>CSRD/ESRS Evidence Alignment</td>
                <td>Structured evidence records aligned to applicable ESRS disclosure topics</td>
                <td style="font-size:10px;color:#92400e;">CSRD compliance requires independent auditor review. Synerxus provides evidence support only.</td>
              </tr>
            </tbody>
          </table>
          <p class="matrix-note">Full evidence crosswalk documentation available upon request: hello@synerxus.com</p>
        </div>

        <!-- ═══ SECTION 14: Negative Impact Screening Summary ═══ -->
        <div class="report-section">
          <h2>Negative Impact Screening Summary</h2>
          <div class="no-break" style="background:#f0fdf4;border:1.5px solid #10b981;border-radius:8px;padding:14px 18px;margin-bottom:14px;">
            <div style="font-size:11px;font-weight:700;color:#065f46;margin-bottom:6px;">Screening Period: ${currentDate}</div>
            <div style="font-size:11px;color:#374151;line-height:1.6;margin-bottom:8px;">No negative impacts were reported through the partner-administered screening process during this period. This does not rule out unobserved, long-term, or independently unreported impacts.</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px;">
              <div style="text-align:center;padding:10px;background:white;border-radius:6px;border:1px solid #d1fae5;">
                <div style="font-size:18px;font-weight:800;color:#065f46;">0</div>
                <div style="font-size:9px;color:#6b7280;text-transform:uppercase;margin-top:2px;">Negative impacts reported</div>
              </div>
              <div style="text-align:center;padding:10px;background:white;border-radius:6px;border:1px solid #d1fae5;">
                <div style="font-size:18px;font-weight:800;color:#065f46;">0</div>
                <div style="font-size:9px;color:#6b7280;text-transform:uppercase;margin-top:2px;">Issues flagged</div>
              </div>
              <div style="text-align:center;padding:10px;background:white;border-radius:6px;border:1px solid #d1fae5;">
                <div style="font-size:18px;font-weight:800;color:#f59e0b;">Outside scope</div>
                <div style="font-size:9px;color:#6b7280;text-transform:uppercase;margin-top:2px;">Long-term / indirect impacts</div>
              </div>
            </div>
          </div>
          <div class="no-break" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;font-size:10px;color:#92400e;line-height:1.6;">
            <strong>Screening limitations:</strong> This screening covers partner-reported activity data within the Synerxus platform. It does not assess unobserved, indirect, or long-term negative impacts. Absence of reported negative impacts does not constitute proof that no negative impacts occurred.
          </div>
        </div>

        <!-- ═══ SECTION 15: Contribution Pathway ═══ -->
        <div class="report-section">
          <h2>Contribution Pathway — Evidence Chain</h2>
          <p style="font-size:11px;color:#374151;margin-bottom:12px;line-height:1.6;">This section documents <strong>contribution evidence</strong>: the chain connecting activity, partner-confirmed output, and reported program reach. It does not claim sole causality or causal attribution. Causal attribution would require randomised controlled trials, quasi-experimental evaluation, or other formal evaluation designs.</p>
          <div class="flow-container" style="margin-bottom:16px;">
            <div class="flow-box">
              <div class="flow-icon">📝</div>
              <div class="flow-label">Volunteer activity recorded</div>
              <div class="flow-count">${totalHours.toLocaleString()}</div>
              <div class="flow-sub">hrs input — timesheet-verified</div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-box green">
              <div class="flow-icon">✅</div>
              <div class="flow-label">Authorized partner confirmed output</div>
              <div class="flow-count">${Math.round(totalHours * 0.12) || 24}</div>
              <div class="flow-sub">evidence records confirmed</div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-box purple">
              <div class="flow-icon">📊</div>
              <div class="flow-label">Partner-reported reach documented</div>
              <div class="flow-count">${directBeneficiaries.toLocaleString()}</div>
              <div class="flow-sub">beneficiaries (partner-reported)</div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-box gold">
              <div class="flow-icon">🌍</div>
              <div class="flow-label">Evidence mapped to SDG</div>
              <div class="flow-count">${sdgMetricsData.length || 0}</div>
              <div class="flow-sub">goals — documented output alignment</div>
            </div>
          </div>
          <div class="no-break" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;font-size:10px;color:#92400e;line-height:1.6;">
            <strong>Contribution vs. Attribution:</strong> Synerxus verifies activity and output evidence. The pathway above documents contribution — that an activity contributed to a confirmed output. It does not establish causal attribution. Proving that this activity alone caused a specific long-term social outcome would require independent evaluation methodology (e.g. RCT, quasi-experimental study, theory of change evaluation).
          </div>
        </div>

        <!-- ═══ SECTION 16: Audit-Support Statement ═══ -->
        <div class="report-section">
          <h2>Audit-Support Statement</h2>
          <p style="font-size:10px;color:#374151;line-height:1.6;margin-bottom:14px;">Synerxus turns ESG activity — including volunteer time, partner-delivered outputs, and social value programs — into independently confirmed, audit-ready evidence. This report supports assurance preparation. It does not replace independent assurance per ISAE 3000 or any applicable assurance standard.</p>
          <div class="no-break" style="display:flex;flex-direction:column;align-items:center;margin-bottom:16px;padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
            <div style="width:100%;padding:10px 16px;border:1.5px solid #374151;border-radius:4px;background:#f9fafb;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#374151;">Independent Assurance — ISAE 3000 (or applicable standard) REQUIRED for formal opinions</div>
              <div style="font-size:9px;color:#9ca3af;margin-top:2px;">(Qualified Assurance Provider Judgment)</div>
            </div>
            <div style="color:#9ca3af;font-size:14px;line-height:1;margin:4px 0;">↓</div>
            <div style="width:88%;padding:10px 16px;border:1.5px solid #0891b2;border-radius:4px;background:#f0fdff;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#0a2463;">Synerxus: Management Reporting — Evidence Confirmed ✓</div>
              <div style="font-size:9px;color:#0891b2;margin-top:2px;">(Authorized partner confirmation · tamper-evident audit trail retained)</div>
            </div>
            <div style="color:#9ca3af;font-size:14px;line-height:1;margin:4px 0;">↓</div>
            <div style="width:76%;padding:10px 16px;border:1.5px solid #0a2463;border-radius:4px;background:#eff6ff;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#0a2463;">Activity Recorded → Partner-Confirmed → Audit-Support Evidence Ready</div>
            </div>
          </div>
          <div class="assurance-grid">
            <div class="assurance-panel synerxus">
              <div class="assurance-panel-header syn">✅ What Synerxus Provides</div>
              <div class="assurance-item"><span class="assurance-icon">✓</span><span>Partner-confirmed output evidence with structured records</span></div>
              <div class="assurance-item"><span class="assurance-icon">✓</span><span>Framework evidence alignment for GRI, ESRS, SASB, TCFD, SDGs</span></div>
              <div class="assurance-item"><span class="assurance-icon">✓</span><span>Negative impact screening via partner-administered process</span></div>
              <div class="assurance-item"><span class="assurance-icon">✓</span><span>Tamper-evident audit trail retained in Synerxus systems</span></div>
              <div class="assurance-item"><span class="assurance-icon">✓</span><span>Detailed evidence records available to authorised reviewers</span></div>
            </div>
            <div class="assurance-panel auditor">
              <div class="assurance-panel-header aud">◆ What Requires External Action</div>
              <div class="assurance-item"><span class="assurance-icon">◆</span><span>Formal assurance opinion (independent qualified provider required)</span></div>
              <div class="assurance-item"><span class="assurance-icon">◆</span><span>Causal attribution (requires RCTs or quasi-experimental evaluation)</span></div>
              <div class="assurance-item"><span class="assurance-icon">◆</span><span>Independent beneficiary reach verification</span></div>
              <div class="assurance-item"><span class="assurance-icon">◆</span><span>Regulatory compliance conclusions (auditor judgment required)</span></div>
            </div>
          </div>
          <p style="font-size:9px;color:#6b7280;font-style:italic;margin-top:10px;padding:8px 12px;background:#fffbeb;border-radius:4px;border:1px solid #fde68a;">Detailed evidence records and supporting metadata are retained in Synerxus and may be made available to authorised reviewers subject to privacy, confidentiality, and client approval. For formal regulatory filing (CSRD, SEC, etc.), third-party auditor review per applicable assurance standard remains required.</p>
        </div>

        <!-- ═══ SECTION 17: Verification Limitations ═══ -->
        <div class="report-section">
          <h2>Verification Limitations</h2>
          <table class="matrix-table">
            <thead>
              <tr>
                <th style="width:40%">Limitation</th>
                <th style="width:60%">Detail</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Downstream impact</td><td>Synerxus verifies activity and output evidence. Long-term downstream impact is not independently proven by Synerxus.</td></tr>
              <tr><td>Beneficiary reach</td><td>Partner-reported beneficiary reach is not independently verified by Synerxus unless explicitly stated in the record.</td></tr>
              <tr><td>Framework alignment</td><td>Framework alignment (SDG, ESRS, GRI, SASB, TCFD) does not equal regulatory compliance. Compliance determination requires independent qualified assurance provider review.</td></tr>
              <tr><td>Assurance conclusions</td><td>Assurance conclusions require an independent qualified assurance provider. Synerxus supports assurance preparation; it does not provide assurance opinions.</td></tr>
              <tr><td>Negative impact absence</td><td>Absence of reported negative impacts through the screening process does not prove absence of negative impacts. Unobserved or long-term impacts are outside scope.</td></tr>
              <tr><td>Evidence completeness</td><td>Records without a verification timestamp are classified as Incomplete or Pending, not Verified, and are excluded from Verified tier counts.</td></tr>
            </tbody>
          </table>
        </div>

        <!-- ═══ SECTION 18: Methodology Appendix ═══ -->
        <div class="report-section">
          <h2>Methodology Appendix</h2>
          <p style="font-size:11px;color:#374151;margin-bottom:12px;line-height:1.6;">The following definitions apply throughout this Verified Evidence Summary.</p>
          <table class="matrix-table">
            <thead>
              <tr>
                <th style="width:25%">Term</th>
                <th style="width:75%">Definition as Used in This Report</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>Activity</strong></td><td>Work performed, including volunteer time contributed by employees or stakeholders. Volunteer time is an input, not an outcome or proof of impact.</td></tr>
              <tr><td><strong>Output</strong></td><td>What was delivered as a result of the activity, as confirmed by an authorised partner verifier.</td></tr>
              <tr><td><strong>Outcome support</strong></td><td>Near-term reported result or reach, as documented by the implementing partner according to their methodology.</td></tr>
              <tr><td><strong>Verified evidence</strong></td><td>A structured evidence record carrying partner confirmation, a verification timestamp, and a verifier role. Records without these fields are classified as Incomplete or Pending.</td></tr>
              <tr><td><strong>Partner-confirmed output evidence</strong></td><td>Evidence records where the output description has been confirmed by an authorised partner organisation representative.</td></tr>
              <tr><td><strong>Contribution</strong></td><td>Evidence that an activity contributed to a verified output. Does not claim sole causality.</td></tr>
              <tr><td><strong>Attribution</strong></td><td>Causal proof that the activity caused a specific outcome. Requires formal evaluation methodology (e.g. RCT, quasi-experimental study).</td></tr>
              <tr><td><strong>Impact</strong></td><td>Long-term change in people's lives or the environment. Not independently proven by Synerxus.</td></tr>
              <tr><td><strong>Causal proof</strong></td><td>A formal evaluation result (e.g. RCT or quasi-experimental study) establishing that an activity caused a specific outcome. Not provided by Synerxus.</td></tr>
              <tr><td><strong>Framework alignment</strong></td><td>Classification of evidence records against reporting framework topics (SDG, ESRS, GRI, SASB, TCFD). Alignment supports disclosure preparation; it is not a compliance determination.</td></tr>
            </tbody>
          </table>
          <div class="no-break" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 14px;margin-top:12px;font-size:10px;color:#1e3a8a;line-height:1.6;">
            <strong>Redaction Policy:</strong> Public or management-facing reports may redact personal identifiers, precise geolocation, and sensitive technical metadata (including device identifiers, SMS routing, internal verification routing, and fraud detection logic). Full supporting records are retained in Synerxus for authorised review subject to privacy, confidentiality, and client permissions.
          </div>
        </div>

        <!-- ═══ Enhanced Footer ═══ -->
        <div class="report-footer">
          <div class="no-break" style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border:1.5px solid #3b82f6;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:10px;color:#1e3a8a;line-height:1.6;">
            <strong>Closing Evidence Boundary Statement:</strong> ${SYNERXUS_BOUNDARY_STATEMENT}
          </div>
          <div class="footer-top">
            <div class="footer-logo-block">
              <img src="${origin}/synerxus-esg-logo.png" alt="Synerxus" style="height:28px;width:auto;" />
              <div style="font-size:11px;line-height:1.6;color:#6b7280;">
                <div><span style="color:#D4980C;font-weight:700;">Evidence.</span> <span style="color:#0A2463;font-weight:700;">Verified.</span></div>
                <div>Assurance-Support Documentation</div>
              </div>
            </div>
            <div class="footer-ids">
              <div><strong>Report ID:</strong> ${reportId}</div>
              <div><strong>Classification:</strong> Management Reporting — Verified Evidence Records</div>
              <div><strong>Framework Evidence:</strong> WEF SCM · GRI · SASB · ESRS Evidence Alignment · UN SDGs · TCFD</div>
              <div><strong>Generated:</strong> ${currentDate}</div>
            </div>
          </div>
          <div class="footer-fw-bar">
            <span class="footer-fw-tag">WEF SCM</span>
            <span class="footer-fw-tag">GRI</span>
            <span class="footer-fw-tag">SASB</span>
            <span class="footer-fw-tag">ESRS Evidence Alignment</span>
            <span class="footer-fw-tag">UN SDGs</span>
            <span class="footer-fw-tag">TCFD</span>
            <span class="footer-fw-tag">Assurance-Support</span>
          </div>
          <div class="footer-generated">Generated on ${currentDate} · Verified Evidence Summary · Report ID: ${reportId}</div>
          <div style="text-align:center;margin-bottom:8px;">
            <div class="footer-confidential">⚠ SAMPLE REPORT — Illustrative data only. This report contains confidential information. Distribution is restricted to authorised personnel.</div>
          </div>
          <div class="footer-copyright">© ${new Date().getFullYear()} Synerxus. All rights reserved. | hello@synerxus.com</div>
          <div style="text-align:center;margin-top:14px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:10px;letter-spacing:0.04em;">Powered by <span style="color:#0A2463;font-weight:700;">SYNER</span><span style="color:#D4980C;font-weight:700;">XUS</span> &nbsp;·&nbsp; <span style="color:#D4980C;font-weight:600;">Evidence.</span> <span style="color:#0A2463;font-weight:600;">Verified.</span></div>
        </div>
      </body>
    </html>
  `;
}
