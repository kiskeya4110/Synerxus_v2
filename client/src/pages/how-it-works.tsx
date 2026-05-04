import { useState } from "react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { AssessmentCta, SectionHeader } from "@/components/marketing/marketing-sections";

const steps = [
  {
    title: "Register the claim",
    body: "Define the exact ESG claim — stated outcome, reporting period, location, ESG category, and evidence owner — before any evidence is attached.",
    detail: "A claim without a structured record is just a statement. Registering first establishes exact scope before evidence collection begins, preventing ambiguity during review.",
    outcome: "Claim scoped",
    ladder: null as string | null,
  },
  {
    title: "Build the Evidence Object",
    body: "Create the structured record that will hold the claim, source evidence, confirmation, chain of custody, screening status, and framework mappings.",
    detail: "The Evidence Object is the fundamental unit of defensibility. Every subsequent step attaches to this record, making the claim reviewable as a complete package.",
    outcome: "Record created",
    ladder: null as string | null,
  },
  {
    title: "Attach source evidence",
    body: "Connect the claim to source files: logs, certificates, reports, photos, data exports, project records, and partner documentation.",
    detail: "Source evidence moves a claim from Level 1 (Internal Assertion) to Level 2 (Source Evidence Attached) on the Evidence Ladder — a meaningful step toward defensibility.",
    outcome: "Source-backed",
    ladder: "Level 2",
  },
  {
    title: "Score on the Evidence Ladder",
    body: "Evaluate the current defensibility of the claim and identify what is needed to advance it toward partner confirmation and disclosure readiness.",
    detail: "The Evidence Ladder gives teams a shared language for claim strength, helping prioritize which claims need the most attention before publication or reporting.",
    outcome: "Level assigned",
    ladder: null as string | null,
  },
  {
    title: "Invite partner confirmation",
    body: "Send a focused review request to an NGO, supplier, contractor, or implementation partner so they can confirm, comment, or flag concerns.",
    detail: "Partner confirmation advances the claim to Level 3. The reviewer's identity, response, notes, and timestamps are preserved in the Evidence Object as part of the permanent record.",
    outcome: "Partner-confirmed",
    ladder: "Level 3",
  },
  {
    title: "Resolve evidence gaps",
    body: "Address clarification requests, additional evidence needs, or partner concerns raised during the confirmation step.",
    detail: "Unresolved gaps are tracked against the Evidence Object. Teams see exactly what is outstanding before the record can advance toward disclosure readiness.",
    outcome: "Gaps resolved",
    ladder: null as string | null,
  },
  {
    title: "Screen for negative impacts",
    body: "Check for adverse impacts, conflicting documentation, community objections, or outcomes that may be overstated relative to the evidence.",
    detail: "Negative impact screening ensures Evidence Objects reflect the full picture — not just positive outcomes — protecting against selective disclosure.",
    outcome: "Screening complete",
    ladder: null as string | null,
  },
  {
    title: "Map to frameworks",
    body: "Cross-walk the confirmed Evidence Object to ESG frameworks, SDGs, investor categories, and internal scorecard items.",
    detail: "One confirmed Evidence Object can simultaneously support GRI, CSRD/ESRS, SASB/ISSB, SDGs, and internal scorecards without collecting the same evidence twice.",
    outcome: "Framework-mapped",
    ladder: "Level 4",
  },
  {
    title: "Preserve chain of custody",
    body: "Retain a timestamped record of every submission, review, confirmation, change, and disclosure use tied to the Evidence Object.",
    detail: "Chain-of-custody records show reviewers and advisors who touched the record, what changed, and which version was used in each reporting cycle.",
    outcome: "Custody active",
    ladder: null as string | null,
  },
  {
    title: "Use in reports and disclosures",
    body: "Deploy the Evidence Object across ESG reports, investor updates, board materials, regulatory disclosures, and assurance preparation.",
    detail: "A completed Evidence Object at Level 5 carries source evidence, partner confirmation, screening status, framework mappings, and full custody history as one reviewable record.",
    outcome: "Disclosure-ready",
    ladder: "Level 5",
  },
];

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <MarketingLayout>
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
            How It Works
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
            From ESG claim to disclosure-ready Evidence Object.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
            Synerxus follows a structured evidence workflow — from claim registration
            through partner confirmation, framework mapping, and disclosure readiness.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Evidence Workflow"
            title="Ten steps to a defensible Evidence Object."
            body="Select any step to see what happens, why it matters, and where it sits in the Evidence Ladder."
          />
          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <div className="grid gap-2 sm:grid-cols-2">
              {steps.map((step, index) => {
                const active = activeStep === index;
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    onMouseEnter={() => setActiveStep(index)}
                    onFocus={() => setActiveStep(index)}
                    aria-pressed={active}
                    className={`flex gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      active
                        ? "border-[#0A1F44] bg-[#0A1F44] shadow-lg"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${
                        active
                          ? "bg-white/10 text-[#D4980C]"
                          : "bg-[#D4980C]/15 text-[#0A1F44]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p
                        className={`font-bold leading-snug ${
                          active ? "text-[#D4980C]" : "text-[#0A1F44]"
                        }`}
                      >
                        {step.title}
                      </p>
                      {step.ladder && (
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            active
                              ? "bg-[#D4980C]/20 text-[#D4980C]"
                              : "bg-[#0A1F44]/10 text-[#0A1F44]"
                          }`}
                        >
                          {step.ladder}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <aside className="sticky top-24 h-fit rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A1F44] text-sm font-extrabold text-[#D4980C]">
                  {activeStep + 1}
                </span>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Step {activeStep + 1} of {steps.length}
                </p>
              </div>
              <h3 className="mt-3 text-xl font-extrabold text-[#0A1F44]">
                {steps[activeStep].title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {steps[activeStep].body}
              </p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Why it matters
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {steps[activeStep].detail}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  {steps[activeStep].outcome}
                </span>
                {steps[activeStep].ladder && (
                  <span className="rounded-full border border-[#D4980C]/30 bg-[#D4980C]/10 px-3 py-1 text-xs font-bold text-[#7a5200]">
                    {steps[activeStep].ladder}
                  </span>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <AssessmentCta />
    </MarketingLayout>
  );
}
