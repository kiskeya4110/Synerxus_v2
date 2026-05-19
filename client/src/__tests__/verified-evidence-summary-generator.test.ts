import { describe, expect, it } from "vitest";
import { generatePDFContent } from "@/lib/csr-report-generators";
import { reportTemplates } from "@/types/csr-reports.types";

const template = reportTemplates.find((item) => item.id === "verified-evidence-summary");

describe("Evidence Summary generator", () => {
  it("renders the Evidence Summary layout instead of the old evidence summary shell", () => {
    expect(template).toBeTruthy();

    const html = generatePDFContent(
      template!,
      {
        summary: { totalVerifiedOutcomes: 3, incompleteRecords: 1, rejectedRecords: 1 },
        impactMetrics: { directBeneficiaries: 42 },
        logs: [
          {
            projectName: "Community Water Program",
            outcomeText: "Water filters installed",
            outcomeType: "output",
            hours: 12,
            verifierName: "Authorized Partner",
            verifiedAt: "2026-05-06T00:00:00Z",
            sdgTags: [6],
            location: "East Africa",
          },
        ],
      },
      "Filtered by: Projects",
      "Acme Corp",
      "May 6, 2026",
    );

    expect(html).toContain("Evidence Summary");
    expect(html).toContain('src="/synerxus-esg-logo.png"');
    expect(html).toContain("<h1>Evidence Summary</h1>");
    expect(html).toContain("Evidence Readiness Assessment");
    expect(html).toContain('class="report-page"');
    expect(html).not.toContain("Evidence Summary");
  });
});
