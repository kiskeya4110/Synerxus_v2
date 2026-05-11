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
    status: "Disclosure-Ready Evidence Object",
    definition:
      "Source evidence, partner confirmation, framework mapping, chain of custody, version history, negative impact screening, and disclosure-readiness review are complete.",
    risk: "Lowest",
    riskClass: "border-green-200 bg-green-50 text-green-800",
    rowClass: "bg-green-50/40",
    action:
      "Use in management reports, investor updates, board materials, stakeholder disclosures, or assurance preparation with applicable boundary language.",
  },
  {
    level: "Level 4",
    status: "Framework-Mapped",
    definition:
      "Partner-confirmed evidence has been cross-walked to frameworks, SDGs, disclosure categories, scorecards, or stakeholder reporting needs. It shows alignment support, not final readiness.",
    risk: "Low",
    riskClass: "border-[#D4980C]/30 bg-[#D4980C]/10 text-[#7a5200]",
    rowClass: "bg-[#D4980C]/10 ring-1 ring-inset ring-[#D4980C]/35",
    action:
      "Before external use, complete chain-of-custody review, negative impact screening, version review, owner approval, and disclosure-readiness signoff.",
    note: "Level 4 is the bridge between partner confirmation and disclosure readiness.",
  },
  {
    level: "Level 3",
    status: "Partner-Confirmed",
    definition:
      "An authorized partner, NGO, supplier, implementation team, or reviewer has confirmed that the evidence supports the claim.",
    risk: "Lower",
    riskClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rowClass: "",
    action:
      "Map the Evidence Object to relevant frameworks, SDGs, scorecards, and reporting categories.",
  },
  {
    level: "Level 2",
    status: "Source Evidence Attached",
    definition:
      "The claim has source files, records, certificates, exports, photos, or project documentation attached, but no external confirmation yet.",
    risk: "Moderate",
    riskClass: "border-amber-200 bg-amber-50 text-amber-800",
    rowClass: "",
    action:
      "Invite an external partner to confirm whether the evidence supports the claim.",
  },
  {
    level: "Level 1",
    status: "Internal Assertion",
    definition:
      "The claim is documented internally but depends primarily on internal narrative, self-reported activity, or incomplete support.",
    risk: "High",
    riskClass: "border-orange-200 bg-orange-50 text-orange-800",
    rowClass: "",
    action:
      "Add source files, methodology notes, operational records, photos, reports, or supporting documentation.",
  },
  {
    level: "Level 0",
    status: "Unsupported Claim",
    definition:
      "A sustainability claim exists, but no source evidence has been attached or structured into an Evidence Object.",
    risk: "Critical",
    riskClass: "border-red-200 bg-red-50 text-red-800",
    rowClass: "bg-red-50/50",
    action: "Do not publish. Create an Evidence Object and attach source documentation.",
    critical: true,
  },
];

const ladderEvidenceImage = {
  src: "/optimized/hero-data-presentation.webp",
  alt: "Professional review workspace with evidence records and reporting dashboards",
  caption: "Evidence review context",
  overlays: [
    ["Claim status", "Source support tracked"],
    ["Review path", "Confirm, map, preserve"],
    ["Boundary", "Readiness score, not assurance"],
  ],
};

export default function EvidenceLadderPage() {
  const [activeCard, setActiveCard] = useState(0);

  return (
    <MarketingLayout>
      <section className="py-7 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              Evidence Ladder
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
              A maturity model for ESG claim defensibility.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              The Evidence Ladder helps organizations evaluate the strength of
              each ESG claim based on evidence quality, partner confirmation,
              chain of custody, framework mapping, and disclosure readiness.
            </p>
            <Button asChild className="mt-7 bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
              <Link href="/request-assessment">Request Assessment</Link>
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-[#0A1F44]/20 p-6 shadow-xl">
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-[#0A1F44]/10 blur-3xl" />

            <div className="relative flex justify-center">
              <div className="flex items-center justify-center rounded-2xl bg-[#0A1F44]/8 p-4 ring-1 ring-[#0A1F44]/10">
                <img src="/synerxus-esg-logo.png" alt="Synerxus" className="h-16 w-auto" />
              </div>
            </div>

            <p className="relative mb-4 mt-5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#0A1F44]/60">
              Evidence Ladder · 6 Levels
            </p>

            <div className="relative flex items-end justify-between gap-2" style={{ height: "112px" }}>
              {[
                { n: 0, color: "#dc2626", h: 19 },
                { n: 1, color: "#ea580c", h: 38 },
                { n: 2, color: "#d97706", h: 56 },
                { n: 3, color: "#059669", h: 75 },
                { n: 4, color: "#D4980C", h: 94 },
                { n: 5, color: "#16a34a", h: 112 },
              ].map(({ n, color, h }) => (
                <div key={n} className="flex flex-1 flex-col items-center">
                  <div
                    style={{
                      height: `${h}px`,
                      backgroundColor: color,
                      borderRadius: "4px 4px 2px 2px",
                      opacity: 0.82,
                      width: "100%",
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="relative mt-2 flex justify-between">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex-1 text-center">
                  <span className="text-xs font-extrabold text-[#0A1F44]/60">{n}</span>
                </div>
              ))}
            </div>

            <div className="relative mt-0.5 grid grid-cols-6 text-center">
              {["Unsupported", "Asserted", "Source", "Confirmed", "Mapped", "Ready"].map((label) => (
                <p key={label} className="text-[8px] font-semibold leading-tight text-[#0A1F44]/35">
                  {label}
                </p>
              ))}
            </div>

            <div className="relative mt-4 rounded-xl bg-[#0A1F44]/5 p-3 ring-1 ring-[#0A1F44]/10">
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#dc2626] via-[#d97706] to-[#16a34a]" />
              <div className="mt-2 flex justify-between">
                <span className="text-[10px] font-bold text-red-600">Critical</span>
                <span className="text-[10px] font-bold text-green-700">Disclosure-Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-7 md:pb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <figure className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
            <img
              src={ladderEvidenceImage.src}
              alt={ladderEvidenceImage.alt}
              className="h-72 w-full object-cover md:h-80 lg:h-[360px]"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#061A36]/78 via-[#061A36]/10 to-transparent" aria-hidden="true" />
            <figcaption className="absolute left-4 top-4 rounded-full border border-white/20 bg-white/90 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0A1F44] md:left-6 md:top-6">
              {ladderEvidenceImage.caption}
            </figcaption>
            <div className="absolute inset-x-4 bottom-4 grid gap-2 sm:grid-cols-3 md:inset-x-6 md:bottom-6">
              {ladderEvidenceImage.overlays.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/20 bg-white/90 px-3 py-2 backdrop-blur">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-0.5 text-[11px] font-extrabold leading-tight text-[#0A1F44]">{value}</p>
                </div>
              ))}
            </div>
          </figure>
        </div>
      </section>

      <EvidenceLadderSection />

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="How teams use the Evidence Ladder"
            title="From claim review to disclosure readiness."
            body="The Evidence Ladder gives teams a practical way to decide what should happen next with each ESG claim. Instead of treating every sustainability statement the same, teams can separate claims that are ready for disclosure from claims that still need evidence, confirmation, framework mapping, or risk review."
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {ladderCards.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onMouseEnter={() => setActiveCard(index)}
                onFocus={() => setActiveCard(index)}
                onClick={() => setActiveCard(index)}
                aria-pressed={activeCard === index}
                className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-1 hover:shadow-xl sm:p-5 ${
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
              title="See what each claim level means and what must happen next."
              body="Level 4 is intentionally distinct from Level 5: a Level 4 claim is partner-confirmed and framework-mapped, but it still needs custody, screening, version, owner, and disclosure-readiness review before external use."
            />
            <div className="grid gap-3 md:hidden">
              {actionMatrix.map((item) => (
                <div
                  key={item.level}
                  className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${item.rowClass}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-extrabold text-[#0A1F44]">{item.level}</p>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${item.riskClass}`}>
                      {item.risk}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{item.status}</p>
                  {item.note && <p className="mt-1 text-xs font-bold text-[#7a5200]">{item.note}</p>}
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.definition}</p>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next action</p>
                    <p className={`mt-1 text-sm leading-relaxed ${item.critical ? "font-bold text-red-800" : "text-slate-600"}`}>
                      {item.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 shadow-sm md:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-[#0A1F44] text-[#D4980C]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Level</th>
                    <th className="px-4 py-3 font-bold">Claim status</th>
                    <th className="px-4 py-3 font-bold">Definition</th>
                    <th className="px-4 py-3 font-bold">Disclosure risk</th>
                    <th className="px-4 py-3 font-bold">Required next action</th>
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
                        <div>{item.status}</div>
                        {item.note && (
                          <div className="mt-1 text-xs font-bold text-[#7a5200]">
                            {item.note}
                          </div>
                        )}
                      </td>
                      <td className="max-w-md px-4 py-3 leading-relaxed text-slate-600">
                        {item.definition}
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
            <div className="mt-5 rounded-2xl border border-[#D4980C]/30 bg-[#D4980C]/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7a5200]">
                Level 4 clarity
              </p>
              <h3 className="mt-2 text-lg font-extrabold text-[#0A1F44]">
                Level 4 means framework-mapped, not disclosure-ready.
              </h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/70 bg-white/70 p-4">
                  <p className="text-sm font-bold text-[#0A1F44]">Level 4 includes</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                    <li>Source evidence attached</li>
                    <li>Authorized partner confirmation completed</li>
                    <li>Framework, SDG, disclosure, or scorecard mapping completed</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/70 p-4">
                  <p className="text-sm font-bold text-[#0A1F44]">Before Level 5</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                    <li>Chain-of-custody and version history reviewed</li>
                    <li>Negative impact screening completed</li>
                    <li>Disclosure owner signs off on readiness and boundary language</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AssessmentCta />
    </MarketingLayout>
  );
}
