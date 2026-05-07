import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { AssessmentCta, SectionHeader } from "@/components/marketing/marketing-sections";
import { Button } from "@/components/ui/button";

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
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 py-7 md:py-10">
        <div className="absolute inset-x-0 bottom-0 h-24 bg-white" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 md:px-8 lg:grid-cols-[1fr_0.95fr]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-[#D4980C]/30 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0A1F44] shadow-sm">
              Use Cases
            </div>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl lg:text-6xl">
              Use Synerxus wherever ESG claims need evidence.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 md:text-xl">
              From annual ESG reporting to greenwashing risk reduction, partner confirmation,
              and supplier evidence — Synerxus structures proof across every claim type.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
                <Link href="/request-assessment">Request Assessment</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[#0A1F44] text-[#0A1F44] hover:bg-[#0A1F44] hover:text-[#D4980C]">
                <a href="#use-case-explorer">
                  Explore Use Cases <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {["8 evidence workflows", "Partner-confirmed records", "Framework-mapped claims"].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#D4980C]" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="lg:justify-self-end">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <img
                src="/optimized/ESG%20use%20cases%20hero.png"
                alt="ESG use cases evidence workflow preview"
                className="block aspect-[4/3] w-full object-cover object-center lg:max-w-[620px]"
              />
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg lg:min-w-64">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Evidence object coverage
              </p>
              <p className="mt-1 text-sm font-bold text-[#0A1F44]">
                Claims, source records, confirmation, custody, and framework mapping.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="use-case-explorer" className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Evidence use cases"
            title="Eight scenarios where Evidence Objects matter."
            body="Select a use case to see the evidence workflow, common source types, and relevant reporting frameworks."
          />
          <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {allUseCases.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActiveUseCase(index)}
                  onMouseEnter={() => setActiveUseCase(index)}
                  onFocus={() => setActiveUseCase(index)}
                  aria-pressed={activeUseCase === index}
                  className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-1 hover:shadow-xl sm:p-5 ${
                    activeUseCase === index
                      ? "border-[#0A1F44] bg-[#0A1F44]"
                      : "border-slate-200 bg-white shadow-sm"
                  }`}
                >
                  <h2
                    className={`text-sm font-extrabold leading-snug sm:text-base ${
                      activeUseCase === index ? "text-[#D4980C]" : "text-[#0A1F44]"
                    }`}
                  >
                    {item.title}
                  </h2>
                  <p
                    className={`mt-2 text-xs leading-relaxed sm:text-sm ${
                      activeUseCase === index ? "text-[#D4980C]" : "text-slate-600"
                    }`}
                  >
                    {item.body}
                  </p>
                </button>
              ))}
            </div>

            <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm lg:sticky lg:top-24 lg:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
                Use case detail
              </p>
              <h3 className="mt-2 text-lg font-extrabold text-[#0A1F44] sm:text-xl">
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
