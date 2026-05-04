import { useState } from "react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { AssessmentCta, SectionHeader } from "@/components/marketing/marketing-sections";

const allUseCases = [
  {
    title: "Corporate ESG Reporting",
    body: "Turn annual ESG statements into traceable Evidence Objects with source files, confirmations, and framework mappings.",
    detail:
      "Corporate ESG teams face pressure to support sustainability claims across annual reports, investor materials, regulatory disclosures, and stakeholder communications. Synerxus organizes the evidence behind each claim before it is published.",
    evidenceTypes: ["Internal program data", "Partner reports", "Completion records", "Site documentation"],
    frameworks: ["GRI", "CSRD / ESRS", "SASB / ISSB", "SDGs"],
  },
  {
    title: "Greenwashing Risk Reduction",
    body: "Identify weak or unsupported claims before they appear in reports, websites, investor materials, or marketing language.",
    detail:
      "The Evidence Ladder helps teams triage claims before publication — flagging which sustainability statements are unsupported (Level 0), weakly asserted (Level 1), or ready for disclosure (Level 4–5).",
    evidenceTypes: ["Evidence Ladder scoring", "Source evidence review", "Gap analysis", "Pre-publication screening"],
    frameworks: ["Internal review", "Regulatory guidance"],
  },
  {
    title: "Supplier and Value Chain Evidence",
    body: "Collect and confirm ESG evidence from suppliers, contractors, vendors, and distributed field operations.",
    detail:
      "Supplier ESG claims often lack source documentation or external confirmation. Synerxus gives procurement and supply chain teams a structured way to collect, confirm, and preserve value chain evidence.",
    evidenceTypes: ["Supplier reports", "Audit outputs", "Certification records", "Field documentation"],
    frameworks: ["CSRD / ESRS", "Scope 3 workflows", "SASB / ISSB"],
  },
  {
    title: "NGO and Partner Validation",
    body: "Give trusted external partners a structured way to confirm the outcomes they helped deliver.",
    detail:
      "NGOs, implementation partners, and community organizations are often the best source of confirmation for corporate ESG claims. Synerxus gives them a focused review workflow that preserves their response as part of the Evidence Object.",
    evidenceTypes: ["Partner confirmation records", "Field reports", "Beneficiary documentation", "Site photos"],
    frameworks: ["GRI", "SDGs", "Internal CSR scorecards"],
  },
  {
    title: "Infrastructure and Community Benefit",
    body: "Track workforce, resilience, environmental, social, and community-benefit outcomes across infrastructure-related projects.",
    detail:
      "Infrastructure projects generate complex ESG claims across workforce development, community benefit, environmental resilience, and local economic impact. Synerxus structures the evidence across all these dimensions.",
    evidenceTypes: ["Workforce records", "Community impact data", "Environmental monitoring", "Partner reports"],
    frameworks: ["GRI", "SDGs", "Local impact frameworks"],
  },
  {
    title: "Investor and Board Reporting",
    body: "Provide leadership with evidence-backed summaries instead of unsupported ESG narratives.",
    detail:
      "Boards and investors need more than narrative ESG summaries. Evidence Objects give leadership a claim-level view of which sustainability statements are source-backed, partner-confirmed, and disclosure-ready.",
    evidenceTypes: ["Evidence Ladder summaries", "Chain-of-custody records", "Framework mapping outputs"],
    frameworks: ["TCFD", "SASB / ISSB", "Custom scorecards"],
  },
  {
    title: "Grant, CSR, and Sponsorship Reporting",
    body: "Create source-backed records for funded programs, sponsorship outcomes, and partner-delivered initiatives.",
    detail:
      "Grant and CSR reporting requires proof of outcomes delivered through external partners. Synerxus structures the evidence, collects partner confirmation, and preserves the record for funder review.",
    evidenceTypes: ["Program reports", "Beneficiary records", "Partner confirmation", "Financial documentation"],
    frameworks: ["SDGs", "Internal CSR frameworks", "Funder requirements"],
  },
  {
    title: "Public ESG Claims and Stakeholder Communications",
    body: "Review the evidence behind public sustainability statements before they are published.",
    detail:
      "Public-facing ESG claims carry reputational risk if they cannot be supported. Evidence Ladder scoring helps teams assess which claims are ready for publication and which need strengthening before going out.",
    evidenceTypes: ["Pre-publication screening", "Evidence Ladder scoring", "Source evidence review"],
    frameworks: ["Internal review", "Regulatory guidance"],
  },
];

export default function UseCasesPage() {
  const [activeUseCase, setActiveUseCase] = useState(0);

  return (
    <MarketingLayout>
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
            Use Cases
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
            Use Synerxus wherever ESG claims need evidence.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
            From annual ESG reporting to greenwashing risk reduction, partner confirmation,
            and supplier evidence — Synerxus structures proof across every claim type.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Evidence use cases"
            title="Eight scenarios where Evidence Objects matter."
            body="Select a use case to see the evidence workflow, common source types, and relevant reporting frameworks."
          />
          <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
            <div className="grid gap-3 sm:grid-cols-2">
              {allUseCases.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActiveUseCase(index)}
                  onMouseEnter={() => setActiveUseCase(index)}
                  onFocus={() => setActiveUseCase(index)}
                  aria-pressed={activeUseCase === index}
                  className={`rounded-2xl border p-5 text-left transition-all hover:-translate-y-1 hover:shadow-xl ${
                    activeUseCase === index
                      ? "border-[#0A1F44] bg-[#0A1F44]"
                      : "border-slate-200 bg-white shadow-sm"
                  }`}
                >
                  <h2
                    className={`font-extrabold ${
                      activeUseCase === index ? "text-[#D4980C]" : "text-[#0A1F44]"
                    }`}
                  >
                    {item.title}
                  </h2>
                  <p
                    className={`mt-2 text-sm leading-relaxed ${
                      activeUseCase === index ? "text-[#D4980C]" : "text-slate-600"
                    }`}
                  >
                    {item.body}
                  </p>
                </button>
              ))}
            </div>

            <aside className="sticky top-24 h-fit rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
                Use case detail
              </p>
              <h3 className="mt-2 text-xl font-extrabold text-[#0A1F44]">
                {allUseCases[activeUseCase].title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {allUseCases[activeUseCase].detail}
              </p>
              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Common evidence types
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allUseCases[activeUseCase].evidenceTypes.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Relevant frameworks
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allUseCases[activeUseCase].frameworks.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-[#0A1F44] px-2.5 py-1 text-xs font-bold text-[#D4980C]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <AssessmentCta />
    </MarketingLayout>
  );
}
