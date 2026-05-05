import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import {
  AssessmentCta,
  EvidenceObjectExplorer,
} from "@/components/marketing/marketing-sections";

const capabilities = [
  {
    title: "Evidence Objects",
    body: "Structured claim records that connect the claim, source evidence, owner, reviewer, risk screening, framework mapping, and disclosure-readiness status.",
  },
  {
    title: "Chain of custody",
    body: "Timestamped review history showing who submitted evidence, who reviewed it, who confirmed it, what changed, and which version was used.",
  },
  {
    title: "Partner confirmation",
    body: "Focused confirmation workflows for NGOs, suppliers, contractors, implementation partners, community organizations, and field teams.",
  },
  {
    title: "Framework cross-walking",
    body: "One Evidence Object can support multiple reporting pathways across ESG frameworks, SDGs, investor materials, and internal scorecards.",
  },
  {
    title: "Negative impact screening",
    body: "Governance checks for unresolved concerns, conflicting documentation, stakeholder objections, adverse impacts, or overclaimed outcomes.",
  },
  {
    title: "Reporting outputs",
    body: "Structured summaries for ESG reports, investor updates, board materials, stakeholder disclosures, and assurance preparation.",
  },
];

const evidenceObjectLayers = [
  {
    title: "Claim layer",
    body: "Defines the exact claim, scope, owner, reporting period, ESG category, and location.",
  },
  {
    title: "Evidence layer",
    body: "Connects the claim to source files, records, certificates, exports, photos, and partner reports.",
  },
  {
    title: "Confirmation layer",
    body: "Captures partner reviewer identity, confirmation status, notes, clarification requests, and flags.",
  },
  {
    title: "Chain-of-custody layer",
    body: "Preserves who submitted, reviewed, confirmed, changed, and used each version of the record.",
  },
  {
    title: "Negative impact screening layer",
    body: "Checks unresolved concerns, stakeholder objections, conflicting documentation, and overclaimed outcomes.",
  },
  {
    title: "Framework mapping layer",
    body: "Cross-walks a confirmed Evidence Object to reporting frameworks, SDGs, scorecards, and stakeholder needs.",
  },
  {
    title: "Disclosure-readiness layer",
    body: "Shows whether the Evidence Object is ready for disclosure review and what next action is required.",
  },
];

const partnerWorkflow = [
  {
    title: "Receive request",
    body: "Partner receives a focused review request tied to one Evidence Object.",
    status: "Request delivered",
    action: "Open claim review",
  },
  {
    title: "Review claim",
    body: "Partner sees the exact claim, reporting period, location, and claimed outcome.",
    status: "Scope visible",
    action: "Review claim scope",
  },
  {
    title: "Inspect evidence",
    body: "Partner reviews attached logs, certificates, reports, photos, and project records.",
    status: "5 files attached",
    action: "Inspect evidence package",
  },
  {
    title: "Confirm, comment, or flag",
    body: "Partner confirms accuracy, requests clarification, adds context, or flags an issue.",
    status: "Action required",
    action: "Confirm | Clarify | Flag",
  },
  {
    title: "Preserve response",
    body: "Partner response becomes part of the Evidence Object chain of custody.",
    status: "Custody updated",
    action: "Preserve confirmation",
  },
];

const platformGapCards = [
  {
    number: "01",
    title: "Fragmented evidence",
    body: "Source records are scattered across tools, teams, partners, and inboxes.",
    response: {
      subtitle: "Synerxus packages the source record around the exact claim being reviewed, so teams know what evidence supports what statement.",
      features: ["Source record", "File attachments", "Document links", "Team ownership", "Submission date", "Storage audit trail"],
      record: {
        claim: "Water access program delivery",
        status: "Source-attached",
        statusColor: "#93C5FD",
        framework: "SDG 6 / GRI 303",
        reportUse: "Internal review",
      },
    },
  },
  {
    number: "02",
    title: "Weak confirmation",
    body: "Partner activity is rarely connected to the exact claim being reported.",
    response: {
      subtitle: "Focused review requests let partners confirm, clarify, or flag claims without being pulled into a full reporting platform.",
      features: ["Partner invitation", "Claim summary", "Confirmation response", "Clarification thread", "Flag record", "Review timestamp"],
      record: {
        claim: "Supplier training delivery",
        status: "Partner-confirmed",
        statusColor: "#FCD34D",
        framework: "GRI 414 / ESRS S1",
        reportUse: "Assurance preparation support",
      },
    },
  },
  {
    number: "03",
    title: "Disclosure risk",
    body: "Claims without reviewable evidence create reputational and regulatory exposure.",
    response: {
      subtitle: "Evidence Ladder status shows whether a claim is source-backed, partner-confirmed, framework-mapped, or ready for review.",
      features: ["Evidence Ladder status", "Source record", "Partner confirmation", "Framework alignment", "Disclosure readiness", "Review history"],
      record: {
        claim: "Community program output",
        status: "Partner-confirmed",
        statusColor: "#FCD34D",
        framework: "SDG 6 / GRI 413 / ESRS S3",
        reportUse: "Assurance preparation support",
      },
    },
  },
];

export default function PlatformPage() {
  const [activeObjectLayer, setActiveObjectLayer] = useState(0);
  const [activePartnerStep, setActivePartnerStep] = useState(0);
  const [activeGap, setActiveGap] = useState(0);

  return (
    <MarketingLayout>
      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD95A]">
              Platform
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
              ESG evidence infrastructure for defensible disclosures.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
              Synerxus helps organizations turn sustainability claims into structured,
              partner-confirmed Evidence Objects for reporting and assurance preparation.
            </p>
            <Button asChild className="mt-7 bg-[#0A1F44] text-[#FFD95A] hover:bg-[#102b5a]">
              <Link href="/request-assessment">Request Assessment</Link>
            </Button>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {[
                ["Claim", "Capture the sustainability statement"],
                ["Evidence", "Attach source records and confirmation"],
                ["Review", "Package it for disclosure support"],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#FFD95A] sm:text-xs sm:tracking-[0.18em]">
                    {title}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-700 sm:text-sm sm:leading-6">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD95A]">
              What is an Evidence Object?
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              A structured record behind each ESG claim.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Each layer is selectable. Use hover, focus, or tap to see how the record supports
              defensible disclosure review.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
              {evidenceObjectLayers.map((layer, index) => (
                <button
                  key={layer.title}
                  type="button"
                  onMouseEnter={() => setActiveObjectLayer(index)}
                  onFocus={() => setActiveObjectLayer(index)}
                  onClick={() => setActiveObjectLayer(index)}
                  aria-pressed={activeObjectLayer === index}
                  className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-1 hover:shadow-xl sm:p-5 ${
                    activeObjectLayer === index
                      ? "border-[#0A1F44] bg-slate-50 shadow-md"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD95A]">
                    Layer {index + 1}
                  </p>
                  <h2 className="mt-3 text-sm font-extrabold leading-snug text-[#0A1F44] sm:text-base">{layer.title}</h2>
                </button>
              ))}
            </div>
            <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD95A]">
                Layer definition
              </p>
              <h3 className="mt-2 text-xl font-extrabold text-[#0A1F44] sm:text-2xl">
                {evidenceObjectLayers[activeObjectLayer].title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                {evidenceObjectLayers[activeObjectLayer].body}
              </p>
            </aside>
          </div>
        </div>
      </section>

      <EvidenceObjectExplorer />

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD95A]">
                Why it matters
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
                Evidence Objects make review easier because they carry the record with the claim.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                Instead of another row of cards, this section keeps the reading flow continuous and
                lets the product language do the work.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                {
                  icon: CheckCircle2,
                  title: "Reviewable by advisors",
                  body: "Advisors get one structured record instead of scattered files and narrative fragments.",
                },
                {
                  icon: ShieldCheck,
                  title: "Cleaner partner trust",
                  body: "Partners confirm the exact claim and evidence package, reducing ambiguous impact statements.",
                },
                {
                  icon: Sparkles,
                  title: "Less duplicate evidence collection",
                  body: "One confirmed Evidence Object can support multiple internal and external reporting pathways.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:gap-4 sm:p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A1F44] text-white sm:h-11 sm:w-11">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0A1F44] sm:text-base">{title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-8 max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD95A]">
                Product capabilities
              </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              One platform, multiple controls.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <h3 className="text-sm font-extrabold text-[#0A1F44] sm:text-base">{item.title}</h3>
                <p className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[0.9fr_1.1fr] md:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD95A]">
              Partner Confirmation
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              Partner confirmation without reporting burden.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600">
              Each step updates the review request so partners understand exactly what action is
              being taken.
            </p>
            <div className="grid gap-3">
              {partnerWorkflow.map((step, index) => (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setActivePartnerStep(index)}
                  onMouseEnter={() => setActivePartnerStep(index)}
                  onFocus={() => setActivePartnerStep(index)}
                  aria-pressed={activePartnerStep === index}
                  className={`flex gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    activePartnerStep === index
                      ? "border-[#0A1F44] bg-[#0A1F44] text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${
                    activePartnerStep === index ? "bg-white/10 text-white" : "bg-[#D4980C]/15 text-[#0A1F44]"
                  }`}>
                    {index + 1}
                  </span>
                  <span>
                    <span className={`block font-extrabold ${activePartnerStep === index ? "text-white" : "text-[#0A1F44]"}`}>
                      {step.title}
                    </span>
                    <span className={`mt-1 block text-sm ${activePartnerStep === index ? "text-white/80" : "text-slate-600"}`}>
                      {step.body}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD95A]">
              Review Request · Step {activePartnerStep + 1}
            </p>
            <h3 className="mt-3 text-2xl font-extrabold text-[#0A1F44]">
              {partnerWorkflow[activePartnerStep].title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {partnerWorkflow[activePartnerStep].body}
            </p>
            <div className="mt-5 grid gap-3">
              {[
                ["Claim", "240 residents completed solar workforce training"],
                ["Evidence", "5 files attached"],
                ["Status", partnerWorkflow[activePartnerStep].status],
                ["Action", partnerWorkflow[activePartnerStep].action],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD95A]">
              Framework Cross-Walking
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              Frameworks tell you what to disclose. Synerxus helps show what happened.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              The section below turns a repetitive framework grid into a clearer evidence-flow
              narrative: what breaks down, and how Synerxus organizes the response.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD95A]">
                The evidence gap
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-col">
                {platformGapCards.map((item, index) => (
                  <button
                    key={item.number}
                    type="button"
                    onClick={() => setActiveGap(index)}
                    onMouseEnter={() => setActiveGap(index)}
                    onFocus={() => setActiveGap(index)}
                    aria-pressed={activeGap === index}
                    className={`flex min-w-0 items-start gap-3 rounded-xl border px-3 py-3.5 text-left transition-all sm:px-4 ${
                      activeGap === index
                        ? "border-[#0A1F44] bg-[#0A1F44]"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                      activeGap === index ? "bg-[#D4980C]/20 text-[#D4980C]" : "bg-slate-200 text-slate-500"
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className={`text-xs font-bold leading-tight transition-colors sm:text-sm ${
                        activeGap === index ? "text-[#D4980C]" : "text-[#0A1F44]"
                      }`}>
                        {item.title}
                      </p>
                      <p className={`mt-0.5 text-[11px] leading-relaxed transition-colors sm:text-xs ${
                        activeGap === index ? "text-[#D4980C]/70" : "text-slate-500"
                      }`}>
                        {item.body}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-[#0A1F44] p-4 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD95A]">
                    Synerxus response
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">
                    {platformGapCards[activeGap].response.subtitle}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/90">
                  Structured for reporting
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {platformGapCards[activeGap].response.features.map((item) => (
                  <div
                    key={item}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
                  >
                    <p className="text-xs font-semibold leading-snug text-white sm:text-sm">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFD95A]">
                  Evidence record
                </p>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/65">Claim supported</span>
                    <span className="text-right font-semibold text-white">{platformGapCards[activeGap].response.record.claim}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/65">Evidence status</span>
                    <span className="text-right font-semibold" style={{ color: platformGapCards[activeGap].response.record.statusColor }}>
                      {platformGapCards[activeGap].response.record.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/65">Framework alignment</span>
                    <span className="text-right font-semibold text-white">{platformGapCards[activeGap].response.record.framework}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/65">Report use</span>
                    <span className="text-right font-semibold text-white/80">{platformGapCards[activeGap].response.record.reportUse}</span>
                  </div>
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
