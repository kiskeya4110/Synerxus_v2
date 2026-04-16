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
    rows.push(["Total Hours", String(data.engagementMetrics?.totalHours || 0), "YTD", "Active"]);
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
          @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } body { -webkit-print-color-adjust: exact; } }
          @media print { html, body { margin: 0 !important; } }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 48px 0; color: #333; background: #fff; }

          .report-section {
            page-break-before: always;
            break-before: page;
          }
          .report-section-cover {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 48px;
            padding-bottom: 32px;
            border-bottom: 3px solid #f59e0b;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .header-left { flex: 2; }
          .header-right {
            flex: 1;
            background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
            padding: 16px;
            border-radius: 12px;
            border: 2px solid #f59e0b;
          }

          .logo-container {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
          }
          .company-divider { width: 2px; height: 32px; background: #d1d5db; margin: 0 8px; }
          .company-name { font-size: 18px; font-weight: 600; color: #374151; }

          .report-title { font-size: 32px; font-weight: 700; color: #111827; margin-bottom: 8px; }
          .report-subtitle { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 12px; }
          .verified-badge {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white; font-size: 10px; font-weight: 700;
            padding: 4px 12px; border-radius: 20px;
            text-transform: uppercase; letter-spacing: 0.5px;
          }
          .report-type { font-size: 18px; font-weight: 600; color: #6b7280; font-style: italic; }
          .report-meta { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #6b7280; margin-top: 8px; }
          .meta-divider { color: #d1d5db; }
          .blockchain-verified { display: flex; align-items: center; gap: 4px; color: #f59e0b; font-weight: 600; }

          .impact-score-box h4 { font-size: 11px; color: #d97706; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px; }
          .impact-score-value { font-size: 36px; font-weight: 800; color: #92400e; }
          .impact-score-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

          h2 {
            font-size: 20px; font-weight: 700; color: #92400e;
            margin: 0 0 16px 0; padding-bottom: 8px;
            border-bottom: 2px solid #f59e0b;
            page-break-after: avoid;
            break-after: avoid;
          }
          h2 + * { page-break-before: avoid; break-before: avoid; }
          h3 { page-break-after: avoid; break-after: avoid; }
          h3 + * { page-break-before: avoid; break-before: avoid; }
          .report-section, .report-table-block {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; page-break-inside: avoid; break-inside: avoid; }
          .metric-card {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center;
            page-break-inside: avoid; break-inside: avoid;
          }
          .metric-card.orange { border-left: 4px solid #f59e0b; }
          .metric-card.green { border-left: 4px solid #10b981; }
          .metric-card.blue { border-left: 4px solid #3b82f6; }
          .metric-card.purple { border-left: 4px solid #8b5cf6; }
          .metric-value { font-size: 28px; font-weight: 800; color: #92400e; }
          .metric-label { font-size: 12px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.3px; }

          table { width: 100%; border-collapse: collapse; margin: 24px 0; border-radius: 8px; overflow: hidden; }
          thead { display: table-header-group; }
          th { background: linear-gradient(135deg, #92400e 0%, #b45309 100%); color: white; padding: 14px 16px; text-align: left; font-weight: 600; font-size: 13px; page-break-inside: avoid; break-inside: avoid; }
          td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; page-break-inside: avoid; break-inside: avoid; }
          tr { page-break-inside: avoid; break-inside: avoid; }
          tr:nth-child(even) { background: #f9fafb; }
          .sdg-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; color: white; font-weight: 700; font-size: 12px; margin-right: 8px; }
          .sdg-name { font-weight: 500; }
          .progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
          .progress-fill { height: 100%; background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); border-radius: 4px; }

          .report-footer { margin-top: 56px; padding-top: 32px; border-top: 2px solid #e5e7eb; text-align: center; page-break-inside: avoid; break-inside: avoid; }
          .footer-logo { display: flex; justify-content: center; align-items: center; gap: 4px; margin-bottom: 12px; }
          .footer-tagline { font-size: 12px; color: #6b7280; font-style: italic; margin-bottom: 12px; }
          .footer-generated { font-size: 13px; color: #374151; margin-bottom: 8px; }
          .footer-confidential { font-size: 11px; color: #9ca3af; padding: 8px 16px; background: #f9fafb; border-radius: 6px; display: inline-block; }
          .footer-copyright { font-size: 11px; color: #9ca3af; margin-top: 16px; }

          .sdg-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; pointer-events: none; z-index: -1; }
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
                <img src="${origin}/favicon-512.png" alt="Synerxus" style="height: 44px; width: auto;" />
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
                <span class="blockchain-verified">✓ Blockchain Verified</span>
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
            <img src="${origin}/favicon-512.png" alt="Synerxus" style="height: 28px; width: auto;" />
          </div>
          <div class="footer-tagline"><span style="color:#D4980C;">Impacts.</span> <span style="color:#0A2463;">Verified.</span></div>
          <div class="footer-generated">
            Generated on ${currentDate} • ${template.name}
          </div>
          <div class="footer-confidential">
            This report contains confidential information. Distribution is restricted to authorized personnel.
          </div>
          <div class="footer-copyright">
            © ${new Date().getFullYear()} Synerxus. All rights reserved. | support@synerxus.com
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
  const impactScore = data?.impactMetrics?.impactScore || Math.round((participationRate || 0) * 0.8 + 20);

  // Ring chart helper — pure SVG
  const makeRing = (displayVal: string, pct: number, color: string, metricLabel: string, badge: string, badgeColor: string) => {
    const r = 52;
    const circ = 2 * Math.PI * r;
    const filled = (circ * Math.min(Math.max(pct, 0), 1)).toFixed(1);
    const empty = (circ - parseFloat(filled)).toFixed(1);
    return `<div style="text-align:center;padding:8px 4px;">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="9"/>
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="9" stroke-dasharray="${filled} ${empty}" stroke-linecap="round" transform="rotate(-90 60 60)"/>
        <text x="60" y="54" text-anchor="middle" font-size="15" font-weight="800" fill="#111827" font-family="Arial,sans-serif">${displayVal}</text>
        <text x="60" y="70" text-anchor="middle" font-size="9" fill="#6b7280" font-family="Arial,sans-serif">${Math.round(pct * 100)}%</text>
      </svg>
      <div style="font-size:11px;color:#111827;font-weight:700;margin-top:2px;line-height:1.3;">${metricLabel}</div>
      <div style="font-size:9px;font-weight:700;color:${badgeColor};margin-top:3px;padding:2px 8px;background:${badgeColor}1a;border-radius:10px;display:inline-block;">${badge}</div>
    </div>`;
  };

  // Radar chart helper — 6-axis WEF-pillar spider
  const buildRadarChart = () => {
    const dims = [
      { label: "People",       sub: "Engagement",    score: Math.min(100, activeEmployees > 0 ? Math.round((activeEmployees / 300) * 100) : 72) },
      { label: "Planet",       sub: "Environmental", score: 65 },
      { label: "Prosperity",   sub: "Economic",      score: Math.min(100, directBeneficiaries > 0 ? Math.round((directBeneficiaries / 8000) * 100) : 58) },
      { label: "Governance",   sub: "Integrity",     score: 90 },
      { label: "SDG",          sub: "Coverage",      score: Math.min(100, sdgMetricsData.length > 0 ? Math.round((sdgMetricsData.length / 12) * 100) : 67) },
      { label: "Verification", sub: "Quality",       score: 95 },
    ];
    const cx = 150, cy = 150, R = 100;
    const N = dims.length;
    const pt = (i: number, r: number) => {
      const a = -Math.PI / 2 + i * (2 * Math.PI / N);
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    };
    const gridRings = [25, 50, 75, 100].map(pct => {
      const r = R * pct / 100;
      const pts = dims.map((_, i) => { const p = pt(i, r); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ");
      return `<polygon points="${pts}" fill="none" stroke="${pct === 100 ? "#cbd5e1" : "#e5e7eb"}" stroke-width="${pct === 100 ? "1.5" : "0.8"}"/>`;
    }).join("");
    const axes = dims.map((_, i) => {
      const p = pt(i, R);
      return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`;
    }).join("");
    const dataPts = dims.map((d, i) => { const p = pt(i, R * d.score / 100); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ");
    const dots = dims.map((d, i) => {
      const p = pt(i, R * d.score / 100);
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#10b981" stroke="white" stroke-width="2"/>`;
    }).join("");
    const labels = dims.map((d, i) => {
      const p = pt(i, R + 26);
      const anchor = p.x > cx + 10 ? "start" : p.x < cx - 10 ? "end" : "middle";
      return `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="${anchor}" font-size="9.5" font-weight="700" fill="#111827" font-family="Arial,sans-serif">${d.label}</text>
        <text x="${p.x.toFixed(1)}" y="${(p.y + 11).toFixed(1)}" text-anchor="${anchor}" font-size="8" fill="#6b7280" font-family="Arial,sans-serif">${d.sub}</text>
        <text x="${p.x.toFixed(1)}" y="${(p.y + 22).toFixed(1)}" text-anchor="${anchor}" font-size="9" font-weight="800" fill="#10b981" font-family="Arial,sans-serif">${d.score}%</text>`;
    }).join("");
    const pctLabels = [25, 50, 75].map(pct => {
      const p = pt(0, R * pct / 100);
      return `<text x="${(p.x + 3).toFixed(1)}" y="${(p.y - 2).toFixed(1)}" font-size="7" fill="#9ca3af" font-family="Arial,sans-serif">${pct}%</text>`;
    }).join("");
    return `<svg viewBox="0 0 300 300" width="300" height="300" style="display:block;">
      ${gridRings}${axes}
      <polygon points="${dataPts}" fill="rgba(16,185,129,0.12)" stroke="#10b981" stroke-width="2" stroke-linejoin="round"/>
      ${dots}${pctLabels}${labels}
    </svg>`;
  };

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
        <title>${template.name}</title>
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
          .blockchain-verified { display: flex; align-items: center; gap: 4px; color: #10b981; font-weight: 600; }

          .impact-score-box h4 { font-size: 11px; color: #3b82f6; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px; }
          .impact-score-value { font-size: 36px; font-weight: 800; color: #1e3a8a; }
          .impact-score-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

          h2 { font-size: 20px; font-weight: 700; color: #1e3a8a; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #10b981; page-break-after: avoid; break-after: avoid; }
          h2 + * { page-break-before: avoid; break-before: avoid; }
          h3 { page-break-after: avoid; break-after: avoid; }
          h3 + * { page-break-before: avoid; break-before: avoid; }
          .report-section, .report-table-block { page-break-inside: avoid; break-inside: avoid; }

          .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; page-break-inside: avoid; break-inside: avoid; }
          .metric-card { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; page-break-inside: avoid; break-inside: avoid; }
          .metric-card.blue { border-left: 4px solid #3b82f6; }
          .metric-card.green { border-left: 4px solid #10b981; }
          .metric-card.purple { border-left: 4px solid #8b5cf6; }
          .metric-card.orange { border-left: 4px solid #f59e0b; }
          .metric-value { font-size: 28px; font-weight: 800; color: #1e3a8a; }
          .metric-label { font-size: 12px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.3px; }

          table { width: 100%; border-collapse: collapse; margin: 24px 0; border-radius: 8px; overflow: hidden; }
          thead { display: table-header-group; }
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

        <!-- ═══ SECTION 1: Header with WEF-first Framework Disclosure ═══ -->
        <div class="report-section-cover">
          <div class="sample-banner">
            <div class="sample-banner-text">⚠ SAMPLE REPORT — Illustrative data only · Not for external distribution</div>
          </div>
          <div class="framework-bar">
            <div class="framework-bar-primary">
              <span class="framework-primary-label">Primary Framework</span>
              <span class="wef-pill">WEF Stakeholder Capitalism Metrics</span>
              <span class="isae-badge">ISAE 3000 Revised · Audit-Supported</span>
            </div>
            <div class="framework-bar-secondary">
              <span class="secondary-label">Also aligned:</span>
              <span class="fw-pill">GRI Standards</span>
              <span class="fw-pill">SASB</span>
              <span class="fw-pill">TCFD</span>
              <span class="fw-pill global-fw">SEC Climate Rules</span>
              <span class="fw-pill">UN SDGs</span>
            </div>
          </div>
          <div class="report-header">
            <div class="header-left">
              <div class="logo-container">
                <img src="${origin}/favicon-512.png" alt="Synerxus" style="height: 44px; width: auto;" />
                <div style="display:flex;flex-direction:column;justify-content:center;gap:2px;">
                  <span style="font-size:26px;font-weight:700;letter-spacing:-0.02em;line-height:1;font-family:Arial,sans-serif;">
                    <span style="color:#0A2463;">SYNERXUS</span>
                  </span>
                  <span style="font-size:13px;font-weight:600;line-height:1;white-space:nowrap;font-family:Arial,sans-serif;">
                    <span style="color:#D4980C;">Impacts.</span> <span style="color:#0A2463;">Verified.</span>
                  </span>
                </div>
              </div>
              <div class="report-title">${companyName}</div>
              <div class="report-subtitle">
                <span class="verified-badge">✓ Verified</span>
                <span class="report-type">${template.name}</span>
              </div>
              <div class="report-meta">
                <span>📅 ${currentDate}</span>
                <span class="meta-divider">|</span>
                <span class="blockchain-verified">✓ Blockchain Verified</span>
              </div>
              ${filterLabel ? `<div style="margin-top:8px;font-size:12px;color:#6b7280;">🔍 ${filterLabel}</div>` : ""}
            </div>
            <div class="header-right">
              <div class="impact-score-box">
                <h4>Overall Impact Score</h4>
                <div class="impact-score-value">${impactScore}</div>
                <div class="impact-score-label">out of 100</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ SECTION 2: Ring Charts — 4 Hero Metrics ═══ -->
        <div class="report-section">
          <h2>Executive Metric Snapshot</h2>
          <div class="ring-grid">
            ${makeRing(
              totalHours >= 1000 ? (totalHours / 1000).toFixed(1) + "K" : String(totalHours),
              Math.min(totalHours / 5000, 1),
              "#10b981", "Volunteer Hours", "✓ Audited", "#10b981"
            )}
            ${makeRing(
              String(activeEmployees),
              Math.min(activeEmployees / 500, 1),
              "#3b82f6", "Active Employees", "✓ Verified", "#3b82f6"
            )}
            ${makeRing(
              participationRate + "%",
              participationRate / 100,
              "#8b5cf6", "Participation Rate", "✓ NGO-Confirmed", "#8b5cf6"
            )}
            ${makeRing(
              "100%",
              1,
              "#10b981", "Verification Rate", "✓ Fully Audited", "#10b981"
            )}
          </div>
        </div>

        <!-- ═══ SECTION 3: Impact Flow — Volunteer → NGO → Evidence → SDG ═══ -->
        <div class="report-section">
          <h2>Impact Pipeline</h2>
          <div class="flow-container">
            <div class="flow-box">
              <div class="flow-icon">👥</div>
              <div class="flow-label">Volunteer Action</div>
              <div class="flow-count">${activeEmployees}</div>
              <div class="flow-sub">Employees engaged</div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-box green">
              <div class="flow-icon">🏢</div>
              <div class="flow-label">NGO Partner</div>
              <div class="flow-count">${data?.ngoPartners?.length || 5}</div>
              <div class="flow-sub">Verified partners</div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-box purple">
              <div class="flow-icon">🔗</div>
              <div class="flow-label">Evidence Object</div>
              <div class="flow-count">${Math.round(totalHours * 0.12) || 24}</div>
              <div class="flow-sub">Verified records</div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-box gold">
              <div class="flow-icon">🌍</div>
              <div class="flow-label">SDG Outcome</div>
              <div class="flow-count">${sdgMetricsData.length || 6}</div>
              <div class="flow-sub">Goals addressed</div>
            </div>
          </div>
        </div>

        <!-- ═══ SECTION 4: Key Performance Metrics ═══ -->
        <div class="report-section">
          <h2>Key Performance Metrics</h2>
          <div class="metric-grid">
            <div class="metric-card blue">
              <div class="metric-value">${totalHours.toLocaleString()}</div>
              <div class="metric-label">Total Volunteer Hours</div>
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
              <div class="metric-label">Direct Beneficiaries</div>
            </div>
            <div class="metric-card blue">
              <div class="metric-value">$${Math.round(economicValue / 1000)}K</div>
              <div class="metric-label">Economic Value</div>
            </div>
            <div class="metric-card green">
              <div class="metric-value">${roi}%</div>
              <div class="metric-label">Return on Investment</div>
            </div>
          </div>
        </div>

        <!-- ═══ SECTION 5: Verification Scope Boundary ═══ -->
        <div class="report-section">
          <h2>Verification Scope Boundary</h2>
          <div class="scope-grid">
            <div class="scope-panel included">
              <div class="scope-header inc"><span class="scope-badge inc">INCLUDED</span> What IS verified</div>
              <div class="scope-item"><div class="scope-dot inc"></div><span>Direct employee volunteer hours (timesheet-verified)</span></div>
              <div class="scope-item"><div class="scope-dot inc"></div><span>NGO-confirmed beneficiary outcomes (signed attestations)</span></div>
              <div class="scope-item"><div class="scope-dot inc"></div><span>GHG Scope 1 &amp; 2 direct operations emissions</span></div>
              <div class="scope-item"><div class="scope-dot inc"></div><span>Employee participation and engagement records</span></div>
              <div class="scope-item"><div class="scope-dot inc"></div><span>Community investment cash contributions</span></div>
              <div class="scope-item"><div class="scope-dot inc"></div><span>Blockchain-anchored evidence objects</span></div>
            </div>
            <div class="scope-panel excluded">
              <div class="scope-header exc"><span class="scope-badge exc">NOT INCLUDED</span> What IS NOT verified</div>
              <div class="scope-item"><div class="scope-dot exc"></div><span>Supply chain / Scope 3 indirect emissions</span></div>
              <div class="scope-item"><div class="scope-dot exc"></div><span>Estimated or projected future outcomes</span></div>
              <div class="scope-item"><div class="scope-dot exc"></div><span>Third-party partner financial statements</span></div>
              <div class="scope-item"><div class="scope-dot exc"></div><span>Contractor and agency worker hours</span></div>
              <div class="scope-item"><div class="scope-dot exc"></div><span>Pro-bono service valuations (self-reported only)</span></div>
              <div class="scope-item"><div class="scope-dot exc"></div><span>Non-Synerxus-platform volunteer activities</span></div>
            </div>
          </div>
        </div>

        <!-- ═══ SECTION 6: SDG Alignment Table ═══ -->
        <div class="report-section">
          <h2>SDG Alignment &amp; Impact</h2>
          <table>
            <thead>
              <tr>
                <th style="width:40%">SDG Goal</th>
                <th style="width:25%">Hours Contributed</th>
                <th style="width:20%">Progress</th>
                <th style="width:15%">% of Total</th>
              </tr>
            </thead>
            <tbody>
              ${(data?.sdgMetrics || []).slice(0, 8).map((sdg: any) => `
                <tr>
                  <td>
                    <span class="sdg-badge" style="background-color:${getSDGColor(sdg.goal)}">${sdg.goal}</span>
                    <span class="sdg-name">${getSDGName(sdg.goal)}</span>
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

        <!-- ═══ SECTION 7: SDG Radial Donut Chart ═══ -->
        <div class="report-section">
          <h2>SDG Distribution (Radial)</h2>
          <div class="donut-section">
            <div>
              <svg viewBox="0 0 220 220" width="220" height="220">
                ${buildDonutSlices()}
                <circle cx="110" cy="110" r="48" fill="white"/>
                <text x="110" y="106" text-anchor="middle" font-size="13" font-weight="800" fill="#1e3a8a" font-family="Arial,sans-serif">${sdgMetricsData.length || 0}</text>
                <text x="110" y="121" text-anchor="middle" font-size="9" fill="#6b7280" font-family="Arial,sans-serif">SDGs</text>
              </svg>
            </div>
            <div>${buildDonutLegend() || "<p style=\"color:#9ca3af;font-size:12px;\">No SDG distribution data available</p>"}</div>
          </div>
        </div>

        <!-- ═══ SECTION 8: Geographic Impact ═══ -->
        <div class="report-section">
          <h2>Geographic Impact</h2>
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
              <div class="geo-legend-item"><div style="width:12px;height:12px;border-radius:50%;background:#10b981;flex-shrink:0;"></div> Verified NGO Partner (4 locations · 3 continents)</div>
            </div>
          </div>
        </div>

        <!-- ═══ SECTION 9: Verification Timeline & SLA Compliance ═══ -->
        <div class="report-section">
          <h2>Verification Timeline &amp; SLA Compliance</h2>
          <div class="timeline-sla">
            <div class="sla-metric"><div class="sla-value">100%</div><div class="sla-label">Within 72h SLA</div></div>
            <div class="sla-divider"></div>
            <div class="sla-metric"><div class="sla-value">4.2h</div><div class="sla-label">Avg. Verify Time</div></div>
            <div class="sla-divider"></div>
            <div class="sla-metric"><div class="sla-value">${Math.round(totalHours * 0.12) || 24}</div><div class="sla-label">Records Verified</div></div>
            <div class="sla-divider"></div>
            <div class="sla-metric"><div class="sla-value">0</div><div class="sla-label">SLA Breaches</div></div>
            <div style="margin-left:auto;background:#10b981;color:white;font-size:11px;font-weight:700;padding:8px 14px;border-radius:20px;white-space:nowrap;">✓ Fully Compliant</div>
          </div>
          <div style="margin:18px 0 6px 0;page-break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:11px;font-weight:700;color:#111827;">Verification Time Distribution (Jan–${new Date().getFullYear()})</span>
              <span style="font-size:10px;color:#10b981;font-weight:700;">Avg: 29h · SLA ceiling: 72h</span>
            </div>
            <div style="position:relative;height:32px;background:#e5e7eb;border-radius:8px;overflow:hidden;">
              <div style="width:40.3%;height:100%;background:linear-gradient(90deg,#059669 0%,#10b981 100%);border-radius:8px 0 0 8px;display:flex;align-items:center;padding-left:10px;">
                <span style="font-size:10px;font-weight:800;color:white;">29h avg</span>
              </div>
              <div style="position:absolute;right:0;top:0;width:3px;height:100%;background:#ef4444;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:8.5px;color:#9ca3af;margin-top:4px;padding:0 1px;">
              <span>0h</span><span>18h</span><span>36h</span><span>54h</span><span style="color:#ef4444;font-weight:700;">72h SLA</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:14px;padding:0 2px;">
              ${["Jan 1 — Period Open", "Jan–Mar — Collection", "Q1 Close — Attestation", "Apr — Review", "Today — Published"].map((label, i) => `
                <div style="text-align:center;flex:1;">
                  <div style="width:10px;height:10px;border-radius:50%;background:${i < 4 ? "#10b981" : "#3b82f6"};border:2px solid white;box-shadow:0 0 0 2px ${i < 4 ? "#d1fae5" : "#dbeafe"};margin:0 auto 4px;"></div>
                  <div style="font-size:8px;color:#374151;font-weight:600;line-height:1.3;">${label}</div>
                </div>`).join("")}
            </div>
          </div>
          <div class="verification-record">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(148,163,184,0.2);">
              <div class="vr-header" style="margin-bottom:0;">▸ Sample Verification Record</div>
              <span style="font-family:'Courier New',monospace;font-size:9px;color:#475569;background:rgba(71,85,105,0.15);padding:3px 8px;border-radius:4px;">hash: 0x4a7f2c…d9e831</span>
            </div>
            <div class="vr-row"><span class="vr-key">record_id</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val green">SYN-VR-2024-00847</span></div>
            <div class="vr-row"><span class="vr-key">submitted_by</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val">J. Mwangi · Project Lead, ${companyName}</span></div>
            <div class="vr-row"><span class="vr-key">verified_by</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val green">Hope Foundation NGO · Nairobi, KE</span></div>
            <div class="vr-row"><span class="vr-key">outcome</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val gold">48 beneficiaries · Digital Literacy · SDG 4</span></div>
            <div class="vr-row"><span class="vr-key">method</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val">NGO_ATTESTATION + ATTENDANCE_REGISTER + PHOTO</span></div>
            <div class="vr-row"><span class="vr-key">submitted_at</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val">2024-03-14T09:22:00Z</span></div>
            <div class="vr-row"><span class="vr-key">verified_at</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val green">2024-03-14T13:47:00Z</span></div>
            <div class="vr-row" style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(148,163,184,0.2);"><span class="vr-key">time_to_verify</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val green" style="font-weight:700;">4h 25m ✓ Within 72h SLA</span></div>
          </div>
        </div>

        <!-- ═══ SECTION 10: NGO Partners Table ═══ -->
        <div class="report-section">
          <h2>NGO Partner Registry</h2>
          <table>
            <thead>
              <tr>
                <th>Partner Organization</th>
                <th>Country</th>
                <th>WEF Pillar</th>
                <th>Verified Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>Hope Foundation</strong></td><td>Kenya 🇰🇪</td><td><span class="pillar-tag pillar-people">People</span><span class="pillar-tag pillar-planet">Planet</span></td><td>312 hrs</td><td style="color:#10b981;font-weight:700;">✓ Verified</td></tr>
              <tr><td><strong>Digital Access PH</strong></td><td>Philippines 🇵🇭</td><td><span class="pillar-tag pillar-prosperity">Prosperity</span></td><td>186 hrs</td><td style="color:#10b981;font-weight:700;">✓ Verified</td></tr>
              <tr><td><strong>Green Futures Zambia</strong></td><td>Zambia 🇿🇲</td><td><span class="pillar-tag pillar-planet">Planet</span></td><td>240 hrs</td><td style="color:#10b981;font-weight:700;">✓ Verified</td></tr>
              <tr><td><strong>Community Health NG</strong></td><td>Nigeria 🇳🇬</td><td><span class="pillar-tag pillar-people">People</span><span class="pillar-tag pillar-governance">Governance</span></td><td>158 hrs</td><td style="color:#f59e0b;font-weight:700;">⏳ Pending Attestation</td></tr>
              <tr><td><strong>Ayiti Tech Haiti</strong></td><td>Haiti 🇭🇹</td><td><span class="pillar-tag pillar-prosperity">Prosperity</span></td><td>94 hrs</td><td style="color:#10b981;font-weight:700;">✓ Verified</td></tr>
            </tbody>
          </table>
        </div>

        <!-- ═══ SECTION 11: Sample Evidence Object ═══ -->
        <div class="report-section">
          <h2>Sample Evidence Object</h2>
          <div class="evidence-block">
            <div class="evidence-title">// Synerxus Evidence Object · ISAE 3000 Revised · Blockchain-Anchored</div>
            <div class="evidence-line"><span class="ev-bracket">{</span></div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"evidence_id"</span>: <span class="ev-val str">"SYN-EV-2024-004821"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"framework"</span>: <span class="ev-val str">"WEF Stakeholder Capitalism Metrics v2.0"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"wef_pillar"</span>: <span class="ev-val str">"People"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"sdg_mapping"</span>: [<span class="ev-val num">4</span>, <span class="ev-val num">8</span>, <span class="ev-val num">10</span>],</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"volunteer_hours"</span>: <span class="ev-val num">48</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"beneficiaries_direct"</span>: <span class="ev-val num">312</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"ngo_verified"</span>: <span class="ev-val bool">true</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"verification_method"</span>: <span class="ev-val str">"NGO_ATTESTATION + ATTENDANCE_REGISTER"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"assurance_standard"</span>: <span class="ev-val str">"ISAE 3000 Revised"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"blockchain_hash"</span>: <span class="ev-val str">"0x4a7f2c...d9e831"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"timestamp_utc"</span>: <span class="ev-val str">"2024-03-14T13:47:00Z"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"gri_disclosure"</span>: <span class="ev-val str">"GRI 413-1"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"sasb_indicator"</span>: <span class="ev-val str">"HC-MS-310a.1"</span>,</div>
            <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"framework_mapping"</span>: <span class="ev-val str">"GRI 403 · SASB SO-ES-110.C · TCFD Principle 7"</span></div>
            <div class="evidence-line"><span class="ev-bracket">}</span></div>
          </div>
        </div>

        <!-- ═══ SECTION 12: Framework Alignment Matrix ═══ -->
        <div class="report-section">
          <h2>Framework Alignment Matrix</h2>
          <p style="font-size:11px;color:#6b7280;margin-bottom:12px;font-style:italic;">Primary framework: WEF Stakeholder Capitalism Metrics. Secondary alignments shown below.</p>
          <table class="matrix-table">
            <thead>
              <tr>
                <th style="width:22%">WEF SCM Metric</th>
                <th style="width:14%">Pillar</th>
                <th style="width:16%">GRI Standard</th>
                <th style="width:16%">SASB</th>
                <th style="width:16%">TCFD</th>
                <th style="width:16%">SEC / Global</th>
              </tr>
            </thead>
            <tbody>
              <tr><td class="wef-col">Volunteer Engagement Hours</td><td><span class="pillar-tag pillar-people">People</span></td><td>GRI 413-1</td><td>HC-MS-310a.1</td><td>No direct equiv.</td><td>SEC Item 103</td></tr>
              <tr><td class="wef-col">Community Investment ($)</td><td><span class="pillar-tag pillar-prosperity">Prosperity</span></td><td>GRI 201-1</td><td>No direct equiv.</td><td>No direct equiv.</td><td>SEC S-K 101</td></tr>
              <tr><td class="wef-col">GHG Emissions (Scope 1&amp;2)</td><td><span class="pillar-tag pillar-planet">Planet</span></td><td>GRI 305-1/2</td><td>EM-IS-110a.1</td><td>Metrics &amp; Targets</td><td>SEC Climate Rules</td></tr>
              <tr><td class="wef-col">Board Diversity &amp; Structure</td><td><span class="pillar-tag pillar-governance">Governance</span></td><td>GRI 405-1</td><td>CG-EC-330a.1</td><td>Governance</td><td>SEC S-K 402</td></tr>
              <tr><td class="wef-col">Employee Training Investment</td><td><span class="pillar-tag pillar-people">People</span></td><td>GRI 404-1</td><td>HC-MS-330a.1</td><td>No direct equiv.</td><td>SEC HCM Disc.</td></tr>
              <tr><td class="wef-col">Beneficiaries Reached</td><td><span class="pillar-tag pillar-prosperity">Prosperity</span></td><td>GRI 413-1</td><td>No direct equiv.</td><td>No direct equiv.</td><td>SDG 17.17</td></tr>
            </tbody>
          </table>
          <p class="matrix-note">Full crosswalk documentation available upon request: assurance@synerxus.com</p>
        </div>

        <!-- ═══ SECTION 13: Impact Radar Chart ═══ -->
        <div class="report-section">
          <h2>Impact Performance Radar — WEF Pillar Overview</h2>
          <div style="display:grid;grid-template-columns:300px 1fr;gap:28px;align-items:center;page-break-inside:avoid;">
            <div style="display:flex;justify-content:center;">
              ${buildRadarChart()}
            </div>
            <div>
              <p style="font-size:11px;color:#374151;margin-bottom:14px;line-height:1.6;">Performance scored across the six WEF Stakeholder Capitalism Metric pillars.</p>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${["People · Engagement", "Planet · Environmental", "Prosperity · Economic", "Governance · Integrity", "SDG · Coverage", "Verification · Quality"].map((label, i) => {
                  const scores = [
                    Math.min(100, activeEmployees > 0 ? Math.round((activeEmployees / 300) * 100) : 72),
                    65,
                    Math.min(100, directBeneficiaries > 0 ? Math.round((directBeneficiaries / 8000) * 100) : 58),
                    90,
                    Math.min(100, sdgMetricsData.length > 0 ? Math.round((sdgMetricsData.length / 12) * 100) : 67),
                    95,
                  ];
                  const s = scores[i];
                  const color = s >= 85 ? "#10b981" : s >= 60 ? "#3b82f6" : "#f59e0b";
                  return `<div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:10px;font-weight:600;color:#374151;min-width:150px;">${label}</span>
                    <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
                      <div style="width:${s}%;height:100%;background:${color};border-radius:4px;"></div>
                    </div>
                    <span style="font-size:10px;font-weight:800;color:${color};min-width:32px;text-align:right;">${s}%</span>
                  </div>`;
                }).join("")}
              </div>
              <p style="font-size:9px;color:#9ca3af;margin-top:12px;font-style:italic;">Scores calculated from verified platform data. Illustrative values used where live data is unavailable.</p>
            </div>
          </div>
        </div>

        <!-- ═══ SECTION 14: Assurance Boundary ═══ -->
        <div class="report-section">
          <h2>Assurance Boundary: Global Verification Scope</h2>
          <p style="font-size:10px;color:#374151;line-height:1.6;margin-bottom:14px;">This report provides verified outcome data supporting multiple global sustainability frameworks. It does not replace independent assurance per ISAE 3000.</p>
          <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:16px;padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
            <div style="width:100%;padding:10px 16px;border:1.5px solid #374151;border-radius:4px;background:#f9fafb;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#374151;">Independent Assurance — ISAE 3000 REQUIRED</div>
              <div style="font-size:9px;color:#9ca3af;margin-top:2px;">(Auditor Judgment)</div>
            </div>
            <div style="color:#9ca3af;font-size:14px;line-height:1;margin:4px 0;">↓</div>
            <div style="width:88%;padding:10px 16px;border:1.5px solid #0891b2;border-radius:4px;background:#f0fdff;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#0a2463;">Synerxus: Management Reporting Verified ✓</div>
              <div style="font-size:9px;color:#0891b2;margin-top:2px;">(NGO Verification)</div>
            </div>
            <div style="color:#9ca3af;font-size:14px;line-height:1;margin:4px 0;">↓</div>
            <div style="width:76%;padding:10px 16px;border:1.5px solid #0a2463;border-radius:4px;background:#eff6ff;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#0a2463;">Self-Reported → Verified → Audit-Ready</div>
            </div>
          </div>
          <div class="assurance-grid">
            <div class="assurance-panel synerxus">
              <div class="assurance-panel-header syn">✅ What Synerxus Provides</div>
              <div class="assurance-item"><span class="assurance-icon">✓</span><span>NGO-verified outcomes with immutable audit trails</span></div>
              <div class="assurance-item"><span class="assurance-icon">✓</span><span>Structured evidence objects for GRI 413, SASB SO-ES-110</span></div>
              <div class="assurance-item"><span class="assurance-icon">✓</span><span>Stakeholder impact alignment via negative impact screening</span></div>
              <div class="assurance-item"><span class="assurance-icon">✓</span><span>Global framework alignment (SDGs, GRI, SASB, TCFD)</span></div>
            </div>
            <div class="assurance-panel auditor">
              <div class="assurance-panel-header aud">❌ What Requires External Action</div>
              <div class="assurance-item"><span class="assurance-icon">◆</span><span>Formal assurance opinion (independent auditor required)</span></div>
              <div class="assurance-item"><span class="assurance-icon">◆</span><span>Causal attribution (requires RCTs)</span></div>
              <div class="assurance-item"><span class="assurance-icon">◆</span><span>Financial valuation (SROI not calculated)</span></div>
              <div class="assurance-item"><span class="assurance-icon">◆</span><span>Regulatory compliance guarantee (auditor judgment required)</span></div>
            </div>
          </div>
          <p style="font-size:9px;color:#6b7280;font-style:italic;margin-top:10px;padding:8px 12px;background:#fffbeb;border-radius:4px;border:1px solid #fde68a;">For formal regulatory filing (CSRD, SEC, etc.), third-party auditor review per ISAE 3000 remains required.</p>
        </div>

        <!-- ═══ Enhanced Footer ═══ -->
        <div class="report-footer">
          <div class="footer-top">
            <div class="footer-logo-block">
              <img src="${origin}/favicon-512.png" alt="Synerxus" style="height:28px;width:auto;" />
              <div style="font-size:11px;line-height:1.6;color:#6b7280;">
                <div><span style="color:#D4980C;font-weight:700;">Impacts.</span> <span style="color:#0A2463;font-weight:700;">Verified.</span></div>
                <div>ISAE 3000 Revised · Audit-Supported</div>
              </div>
            </div>
            <div class="footer-ids">
              <div><strong>Report ID:</strong> ${reportId}</div>
              <div><strong>Framework:</strong> WEF SCM v2.0 · GRI · SASB · TCFD · SEC Climate Rules · UN SDGs</div>
              <div><strong>Assurance:</strong> ISAE 3000 Revised · Audit-Supported</div>
              <div><strong>Generated:</strong> ${currentDate}</div>
            </div>
          </div>
          <div class="footer-fw-bar">
            <span class="footer-fw-tag">WEF SCM</span>
            <span class="footer-fw-tag">GRI</span>
            <span class="footer-fw-tag">SASB</span>
            <span class="footer-fw-tag">TCFD</span>
            <span class="footer-fw-tag">SEC Rules</span>
            <span class="footer-fw-tag">UN SDGs</span>
            <span class="footer-fw-tag">ISAE 3000</span>
          </div>
          <div class="footer-tagline"><span style="color:#D4980C;">Impact,</span> <span style="color:#0A2463;">Verified.</span></div>
          <div class="footer-generated">Generated on ${currentDate} · ${template.name} · Report ID: ${reportId}</div>
          <div style="text-align:center;margin-bottom:8px;">
            <div class="footer-confidential">⚠ SAMPLE REPORT — Illustrative data only. This report contains confidential information. Distribution is restricted to authorized personnel.</div>
          </div>
          <div class="footer-copyright">© ${new Date().getFullYear()} Synerxus. All rights reserved. | support@synerxus.com | assurance@synerxus.com</div>
          <div style="text-align:center;margin-top:14px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:10px;letter-spacing:0.04em;">Powered by <span style="color:#0A2463;font-weight:700;">SYNER</span><span style="color:#D4980C;font-weight:700;">XUS</span> &nbsp;·&nbsp; <span style="color:#D4980C;font-weight:600;">Impacts.</span> <span style="color:#0A2463;font-weight:600;">Verified.</span></div>
        </div>
      </body>
    </html>
  `;
}
