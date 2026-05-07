import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { AssessmentCta, SectionHeader } from "@/components/marketing/marketing-sections";

const solutions = [
  {
    title: "Claim Registry",
    body: "Centralize ESG claims across business units, projects, partners, suppliers, and reporting cycles.",
    detail:
      "A shared claim registry gives ESG teams a single source of truth for every sustainability statement in scope — regardless of where the underlying activity happened or who owns the evidence.",
    who: "ESG managers, sustainability teams, program owners",
  },
  {
    title: "Evidence Object Builder",
    body: "Turn ESG claims into structured evidence records with required fields, documentation, ownership, and status.",
    detail:
      "The Evidence Object Builder guides teams through defining the claim, attaching source files, assigning reviewers, and tracking progress from initial scope to disclosure-ready.",
    who: "ESG program teams, sustainability officers",
  },
  {
    title: "Evidence Ladder Scoring",
    body: "Evaluate claim defensibility and identify what is needed to strengthen each claim before disclosure.",
    detail:
      "Each claim receives a Level 0–5 score based on evidence quality, confirmation status, custody history, and framework mapping — giving teams a clear view of which claims need attention.",
    who: "ESG leads, advisors, assurance preparation teams",
  },
  {
    title: "Partner Confirmation Workflows",
    body: "Invite NGOs, suppliers, contractors, and implementation partners to confirm outcomes.",
    detail:
      "Focused confirmation requests give partners a clear review scope, attached evidence, and structured response options — without requiring them to join a full corporate reporting platform.",
    who: "Corporate ESG teams, NGO program leads, supplier managers",
  },
  {
    title: "Chain-of-Custody Management",
    body: "Preserve submissions, changes, confirmations, reviewer activity, and disclosure usage.",
    detail:
      "Every action on an Evidence Object is timestamped and attributed. Teams can trace which version was used in which report, and what changed between reporting cycles.",
    who: "ESG leads, internal reviewers, assurance advisors",
  },
  {
    title: "Framework Cross-Walking",
    body: "Map Evidence Objects to multiple reporting frameworks, SDGs, and stakeholder categories.",
    detail:
      "One confirmed Evidence Object can simultaneously support GRI, CSRD/ESRS, SASB/ISSB, SDGs, and internal scorecards — eliminating duplicate evidence collection across reporting cycles.",
    who: "ESG reporting teams, sustainability consultants, advisors",
  },
  {
    title: "Negative Impact Screening",
    body: "Flag adverse impacts, stakeholder concerns, conflicting documentation, or overclaimed outcomes.",
    detail:
      "Screening prompts guide reviewers through checking for unresolved concerns, adverse impacts, conflicting records, and whether the evidence fully supports the stated outcome.",
    who: "ESG leads, compliance reviewers, sustainability advisors",
  },
  {
    title: "Reporting Outputs",
    body: "Generate structured summaries for ESG reports, investor updates, board materials, and stakeholder disclosures.",
    detail:
      "Evidence Objects can be extracted as claim-level summaries for annual reports, investor materials, board decks, and regulatory disclosure support — drawing from confirmed records rather than narrative.",
    who: "ESG reporting leads, investor relations teams, board support",
  },
];

export default function SolutionsPage() {
  const [activeCapability, setActiveCapability] = useState(0);

  return (
    <MarketingLayout>
      <section className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
            Solutions
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
            ESG evidence infrastructure for claim-level verification.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
            Synerxus gives ESG teams the infrastructure to organize proof, involve
            trusted partners, preserve chain of custody, and prepare claims for
            reporting, review, and assurance workflows.
          </p>
          <Button asChild className="mt-7 bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
            <Link href="/request-assessment">Request Assessment</Link>
          </Button>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Platform capabilities"
            title="Eight capabilities. One evidence layer."
            body="Select a capability to see what it does, who uses it, and how it connects to the broader evidence workflow."
          />
          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {solutions.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActiveCapability(index)}
                  onMouseEnter={() => setActiveCapability(index)}
                  onFocus={() => setActiveCapability(index)}
                  aria-pressed={activeCapability === index}
                  className={`rounded-2xl border p-5 text-left transition-all hover:-translate-y-1 hover:shadow-xl ${
                    activeCapability === index
                      ? "border-[#0A1F44] bg-[#0A1F44]"
                      : "border-slate-200 bg-white shadow-sm"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold ${
                      activeCapability === index
                        ? "bg-[#D4980C]/20 text-[#D4980C]"
                        : "bg-[#D4980C]/15 text-[#0A1F44]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <h2
                    className={`mt-3 font-extrabold ${
                      activeCapability === index ? "text-[#D4980C]" : "text-[#0A1F44]"
                    }`}
                  >
                    {item.title}
                  </h2>
                  <p
                    className={`mt-2 text-sm leading-relaxed ${
                      activeCapability === index ? "text-[#D4980C]" : "text-slate-600"
                    }`}
                  >
                    {item.body}
                  </p>
                </button>
              ))}
            </div>

            <aside className="sticky top-24 h-fit rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
                Capability detail
              </p>
              <h3 className="mt-2 text-xl font-extrabold text-[#0A1F44]">
                {solutions[activeCapability].title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {solutions[activeCapability].detail}
              </p>
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Who uses this
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {solutions[activeCapability].who}
                </p>
              </div>
              <Button asChild className="mt-5 bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
                <Link href="/platform">Explore Platform</Link>
              </Button>
            </aside>
          </div>
        </div>
      </section>

      <AssessmentCta />
    </MarketingLayout>
  );
}
