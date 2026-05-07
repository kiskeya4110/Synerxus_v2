import { describe, expect, it } from "vitest";
import { buildVerifiedEvidenceSummaryReport } from "../domains/reporting/verified-evidence-summary-report";

const verifiedRecord = {
  verificationStatus: "approved",
  verifiedAt: new Date("2026-04-15T12:00:00Z"),
  verifiedBy: 7,
  createdAt: new Date("2026-04-14T12:00:00Z"),
  date: new Date("2026-04-14T09:00:00Z"),
  projectId: 1,
  hours: 12,
  beneficiaryCount: 50,
  outcomeText: "Water filters installed",
  description: "Volunteer activity recorded",
  sdgTags: [6],
};

function renderReport() {
  return buildVerifiedEvidenceSummaryReport({
    organizationName: "Acme Foundation",
    reportId: "VES-2026-0506-ACME",
    periodDisplay: "Q2 2026",
    generatedDate: "May 6, 2026",
    scopeSummary: "Test scope",
    activities: [
      verifiedRecord,
      { ...verifiedRecord, verifiedAt: null, hours: 20, beneficiaryCount: 80 },
      { ...verifiedRecord, verificationStatus: "pending", hours: 30, beneficiaryCount: 90 },
      { ...verifiedRecord, verificationStatus: "rejected", hours: 40, beneficiaryCount: 100 },
      { ...verifiedRecord, verificationStatus: "incomplete", hours: 50, beneficiaryCount: 110 },
    ],
    projects: [{ id: 1, name: "Clean Water Program" }, { id: 2, name: "Unused Project" }],
    logoDataUri: "data:image/png;base64,abc123",
  });
}

describe("Verified Evidence Summary report", () => {
  it("renders the required 8-page report structure and boundary acknowledgement", () => {
    const html = renderReport();

    expect(html.match(/class="report-page"/g)).toHaveLength(8);
    expect(html).toContain("<title>Verified Evidence Summary</title>");
    expect(html).toContain("Prepared for ESG / CSR Reporting and Assurance Support");
    expect(html).toContain("Evidence Readiness Assessment");
    expect(html).toContain("I acknowledge and agree to the boundary statement");
    expect(html).toContain(
      "Synerxus provides structured evidence records for reporting and assurance preparation. Synerxus does not provide formal assurance opinions, guarantee regulatory compliance, or establish causal attribution.",
    );
  });

  it("keeps verified totals separate from partner-reported, pending, rejected, and incomplete records", () => {
    const html = renderReport();

    expect(html).toContain('<div class="metric-label">Verified Evidence Records</div><div class="metric-value">1</div>');
    expect(html).toContain('<div class="metric-label">Verified Hours</div><div class="metric-value">12</div>');
    expect(html).toContain('<div class="metric-label">Partner-Reported Reach</div><div class="metric-value">130</div>');
    expect(html).toContain('<div class="metric-label">Incomplete Records</div><div class="metric-value">1</div>');
    expect(html).toContain('<div class="metric-label">Rejected Records</div><div class="metric-value">1</div>');
  });

  it("does not expose sensitive technical metadata terms", () => {
    const html = renderReport().toLowerCase();

    expect(html).not.toContain("device id");
    expect(html).not.toContain("sms number");
    expect(html).not.toContain("raw telemetry");
    expect(html).not.toContain("fraud detection logic");
    expect(html).not.toContain("precise geolocation");
  });

  it("renders the supplied Synerxus logo asset and keeps project counts tied to filtered report data", () => {
    const html = renderReport();

    expect(html).toContain('src="data:image/png;base64,abc123"');
    expect(html).toContain('<div class="metric-label">Projects Included</div><div class="metric-value">1</div>');
    expect(html).toContain('<div class="metric-label">Programs Included</div><div class="metric-value">1</div>');
    expect(html).not.toContain("Unused Project");
  });
});
