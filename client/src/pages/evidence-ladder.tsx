import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import {
  AssessmentCta,
  EvidenceLadderSection,
  SectionHeader,
} from "@/components/marketing/marketing-sections";

const ladderCards = [
  {
    title: "Triage",
    body: "Identify unsupported or weakly supported claims before they appear in reports, websites, investor materials, or regulatory disclosures.",
  },
  {
    title: "Prioritize",
    body: "Focus evidence collection on high-visibility claims, public commitments, investor-facing metrics, and regulatory disclosure items.",
  },
  {
    title: "Confirm",
    body: "Route claims to the right NGO, supplier, contractor, implementation partner, or field operator for external review.",
  },
  {
    title: "Prepare",
    body: "Map confirmed Evidence Objects to frameworks, SDGs, internal scorecards, and stakeholder reporting categories.",
  },
  {
    title: "Support Review",
    body: "Preserve chain of custody, reviewer identity, timestamps, version history, negative impact screening, and disclosure-readiness status.",
  },
];

const actionMatrix = [
  {
    level: "Level 5",
    status: "Audit-Ready Evidence Object",
    risk: "Lowest",
    riskClass: "border-green-200 bg-green-50 text-green-800",
    rowClass: "bg-green-50/40",
    action:
      "Use in reports, investor updates, board materials, stakeholder disclosures, or assurance preparation.",
  },
  {
    level: "Level 4",
    status: "Framework-Mapped",
    risk: "Low",
    riskClass: "border-[#D4980C]/30 bg-[#D4980C]/10 text-[#7a5200]",
    rowClass: "",
    action:
      "Complete chain-of-custody review, negative impact screening, and disclosure-readiness approval.",
  },
  {
    level: "Level 3",
    status: "Partner-Confirmed",
    risk: "Lower",
    riskClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rowClass: "",
    action:
      "Map the Evidence Object to relevant frameworks, SDGs, scorecards, and reporting categories.",
  },
  {
    level: "Level 2",
    status: "Source Evidence Attached",
    risk: "Moderate",
    riskClass: "border-amber-200 bg-amber-50 text-amber-800",
    rowClass: "",
    action:
      "Invite an external partner to confirm whether the evidence supports the claim.",
  },
  {
    level: "Level 1",
    status: "Internal Assertion",
    risk: "High",
    riskClass: "border-orange-200 bg-orange-50 text-orange-800",
    rowClass: "",
    action:
      "Add source files, methodology notes, operational records, photos, reports, or supporting documentation.",
  },
  {
    level: "Level 0",
    status: "Unsupported Claim",
    risk: "Critical",
    riskClass: "border-red-200 bg-red-50 text-red-800",
    rowClass: "bg-red-50/50",
    action: "Do not publish. Create an Evidence Object and attach source documentation.",
    critical: true,
  },
];

export default function EvidenceLadderPage() {
  const [activeCard, setActiveCard] = useState(0);

  return (
    <MarketingLayout>
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
            Evidence Ladder
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
            A maturity model for ESG claim defensibility.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
            The Evidence Ladder helps organizations evaluate the strength of
            each ESG claim based on evidence quality, partner confirmation,
            chain of custody, framework mapping, and disclosure readiness.
          </p>
          <Button asChild className="mt-7 bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
            <Link href="/request-assessment">Request Assessment</Link>
          </Button>
        </div>
      </section>

      <EvidenceLadderSection />

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="How teams use the Evidence Ladder"
            title="From claim review to disclosure readiness."
            body="The Evidence Ladder gives teams a practical way to decide what should happen next with each ESG claim. Instead of treating every sustainability statement the same, teams can separate claims that are ready for disclosure from claims that still need evidence, confirmation, framework mapping, or risk review."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ladderCards.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onMouseEnter={() => setActiveCard(index)}
                onFocus={() => setActiveCard(index)}
                onClick={() => setActiveCard(index)}
                aria-pressed={activeCard === index}
                className={`rounded-2xl border p-5 text-left transition-all hover:-translate-y-1 hover:shadow-xl ${
                  activeCard === index
                    ? "border-[#0A1F44] bg-[#0A1F44]"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-extrabold ${
                    activeCard === index
                      ? "bg-white/10 text-[#D4980C]"
                      : "bg-[#D4980C]/15 text-[#0A1F44]"
                  }`}
                >
                  {index + 1}
                </span>
                <h3
                  className={`mt-4 font-extrabold ${
                    activeCard === index ? "text-[#D4980C]" : "text-[#0A1F44]"
                  }`}
                >
                  {item.title}
                </h3>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    activeCard === index ? "text-[#D4980C]" : "text-slate-600"
                  }`}
                >
                  {item.body}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-14">
            <SectionHeader
              eyebrow="Evidence Ladder Action Matrix"
              title="See the next best action for each claim level."
            />
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0A1F44] text-[#D4980C]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Level</th>
                    <th className="px-4 py-3 font-bold">Claim status</th>
                    <th className="px-4 py-3 font-bold">Disclosure risk</th>
                    <th className="px-4 py-3 font-bold">Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {actionMatrix.map((item) => (
                    <tr
                      key={item.level}
                      className={`border-t border-slate-200 ${item.rowClass}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-extrabold text-[#0A1F44]">
                        {item.level}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {item.status}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${item.riskClass}`}
                        >
                          {item.risk}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 leading-relaxed ${
                          item.critical ? "font-bold text-red-800" : "text-slate-600"
                        }`}
                      >
                        {item.action}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <AssessmentCta />
    </MarketingLayout>
  );
}
