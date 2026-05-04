import { useState } from "react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { AssessmentCta, BoundaryNotice, SectionHeader } from "@/components/marketing/marketing-sections";

const frameworkDetails = [
  {
    name: "CSRD / ESRS",
    region: "EU",
    scope:
      "Mandatory sustainability reporting for large EU companies and non-EU companies with significant EU activity. Covers double materiality across environmental, social, and governance topics.",
    howEvidenceObjects:
      "Structures source documentation, partner confirmations, and chain-of-custody records for the double materiality disclosures required under ESRS topics.",
  },
  {
    name: "GRI",
    region: "Global",
    scope:
      "Voluntary sustainability reporting standards used globally across environmental, social, and governance topics. Widely recognized by stakeholders, investors, and regulators.",
    howEvidenceObjects:
      "Maps confirmed Evidence Objects to GRI disclosure topics, helping teams show that reported outcomes are backed by source evidence and external confirmation.",
  },
  {
    name: "SASB / ISSB",
    region: "US / Global",
    scope:
      "Industry-specific sustainability accounting standards for investor-focused disclosure. ISSB now incorporates SASB into a global baseline covering sustainability and climate.",
    howEvidenceObjects:
      "Connects claim evidence to investor-relevant sustainability categories and ISSB S1/S2 disclosure requirements with structured source records.",
  },
  {
    name: "TCFD",
    region: "US / Capital markets",
    scope:
      "Framework for climate-related financial disclosures covering governance, strategy, risk management, and climate metrics and targets.",
    howEvidenceObjects:
      "Supports climate-related evidence workflows where claims connect to climate risk, resilience, transition activity, or emissions data.",
  },
  {
    name: "WEF Stakeholder Capitalism Metrics",
    region: "Global",
    scope:
      "Cross-industry metrics for reporting on ESG performance aligned with the UN SDGs and the Paris Agreement, designed for comparability across organizations.",
    howEvidenceObjects:
      "Organizes ESG evidence for organizations reporting against WEF-aligned stakeholder capitalism categories.",
  },
  {
    name: "UN Sustainable Development Goals",
    region: "Global",
    scope:
      "Seventeen global goals covering poverty, climate, health, education, and more — widely used for ESG impact alignment and stakeholder communications.",
    howEvidenceObjects:
      "Connects confirmed Evidence Objects to SDG targets where source records support the stated community, environmental, or social outcome.",
  },
  {
    name: "CDP support workflows",
    region: "Global climate disclosure",
    scope:
      "Voluntary disclosure system for climate, water, and forests used by investors and supply chain buyers. Requires structured evidence of emissions, risks, and targets.",
    howEvidenceObjects:
      "Structures supporting evidence for climate, supplier, and environmental disclosure workflows aligned with CDP question formats.",
  },
  {
    name: "Supplier and Scope 3 evidence workflows",
    region: "US / Global",
    scope:
      "Value chain ESG evidence collection from suppliers, contractors, vendors, and distributed field operations for Scope 3 and supply chain reporting.",
    howEvidenceObjects:
      "Organizes supplier-provided evidence, confirmation records, and chain-of-custody history for Scope 3 and value chain ESG disclosures.",
  },
  {
    name: "Custom ESG scorecards",
    region: "Company-specific",
    scope:
      "Internal materiality categories, board reporting frameworks, and investor-specific ESG assessment criteria unique to an organization's stakeholder context.",
    howEvidenceObjects:
      "Maps Evidence Objects to internal scorecard categories, board-level reporting requirements, and custom materiality assessments.",
  },
  {
    name: "Internal materiality categories",
    region: "Company-specific",
    scope:
      "Organization-defined materiality topics used to prioritize ESG focus areas, resource allocation, and stakeholder reporting across reporting cycles.",
    howEvidenceObjects:
      "Connects Evidence Objects to internal materiality categories, allowing teams to track evidence across priority topics without re-collecting across cycles.",
  },
];

export default function FrameworksPage() {
  const [activeFramework, setActiveFramework] = useState(0);

  return (
    <MarketingLayout>
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
            Frameworks
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
            Evidence mapping for ESG frameworks and stakeholder reporting.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
            Synerxus helps organizations structure verified Evidence Objects around the
            frameworks, SDGs, and reporting categories stakeholders already recognize.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            title="Frameworks define what to disclose. Synerxus helps structure the evidence behind it."
            body="Select a framework to see its scope and how Evidence Objects support it."
          />
          <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
            <div className="grid gap-3 sm:grid-cols-2">
              {frameworkDetails.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setActiveFramework(index)}
                  onMouseEnter={() => setActiveFramework(index)}
                  onFocus={() => setActiveFramework(index)}
                  aria-pressed={activeFramework === index}
                  className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    activeFramework === index
                      ? "border-[#0A1F44] bg-[#0A1F44]"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      activeFramework === index ? "text-[#D4980C]" : "text-slate-400"
                    }`}
                  >
                    {item.region}
                  </p>
                  <h3
                    className={`mt-1 font-extrabold ${
                      activeFramework === index ? "text-[#D4980C]" : "text-[#0A1F44]"
                    }`}
                  >
                    {item.name}
                  </h3>
                </button>
              ))}
            </div>

            <aside className="sticky top-24 h-fit rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {frameworkDetails[activeFramework].region}
              </p>
              <h3 className="mt-2 text-xl font-extrabold text-[#0A1F44]">
                {frameworkDetails[activeFramework].name}
              </h3>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Scope
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {frameworkDetails[activeFramework].scope}
                </p>
              </div>
              <div className="mt-3 rounded-xl border border-[#D4980C]/30 bg-[#D4980C]/10 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a5200]">
                  How Evidence Objects support this
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {frameworkDetails[activeFramework].howEvidenceObjects}
                </p>
              </div>
            </aside>
          </div>

          <div className="mt-10">
            <BoundaryNotice />
            <p className="mt-4 text-sm font-semibold text-slate-600">
              Synerxus does not replace legal, accounting, audit, or assurance advice.
            </p>
          </div>
        </div>
      </section>

      <AssessmentCta />
    </MarketingLayout>
  );
}
