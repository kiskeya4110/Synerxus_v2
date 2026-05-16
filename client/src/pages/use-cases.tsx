import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, Building2, CheckCircle2, FileText, Handshake, Landmark, ShieldAlert, ShieldCheck, Target, Truck, Users, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

type UseCase = {
  title: string;
  icon: LucideIcon;
  color: string;
  claim: string;
  evidence: string[];
  limitation: string;
  detail: string;
  whoUses: string;
  featured?: boolean;
  detailHref?: string;
};

const useCases: UseCase[] = [
  {
    title: "Corporate ESG / CSR Reporting",
    icon: Building2,
    color: "#0A1F44",
    claim: "Our community investment programs supported workforce development across 12 partner organizations in 2025, as reported under GRI 413.",
    evidence: [
      "Partner confirmation from 12 organizations",
      "Source artifacts per partner (reports, logs, attendance records)",
      "Mapping to GRI 413 disclosure requirements",
      "Exception log showing 2 partners with incomplete confirmation",
      "Limitation notes: confirmed activities do not prove long-term employment outcomes",
    ],
    limitation: "Community investment claims reflect partner-confirmed activity and source-supported records. They do not prove outcome or causal attribution. Assurance conclusions require an independent assurance provider.",
    detail: "Corporate ESG reporting requires structured evidence behind each claim. Synerxus connects community investment claims to partner confirmations, source artifacts, and GRI mapping context — ensuring each reported statement is backed by reviewable evidence rather than internal assertion alone. Exception flags and limitation notes are documented explicitly so assurance reviewers understand what the claim does and does not prove.",
    whoUses: "ESG Managers and CSR Directors preparing disclosure reports, board summaries, or assurance-preparation packages under GRI, ESRS, CSRD, or internal reporting standards.",
  },
  {
    title: "Corporate Volunteering",
    icon: Users,
    color: "#1f7ae0",
    claim: "Employees contributed volunteer hours to community programs.",
    evidence: ["Volunteer logs", "Partner confirmation", "Event records", "Source documentation"],
    limitation: "Hours do not prove community outcome or causal attribution.",
    detail: "Volunteer hour reporting often relies on internal logs. Synerxus structures these records with partner confirmation, event documentation, and source artifacts — moving claims from internal assertion toward a more defensible evidence position. Attribution limitations are stated clearly: hours recorded do not establish community outcome without additional outcome evaluation data.",
    whoUses: "Corporate CSR or HR teams tracking volunteer program impact for reporting.",
  },
  {
    title: "Partner-Delivered Outputs",
    icon: Handshake,
    color: "#0f9f96",
    claim: "Our partner delivered training sessions during the reporting period.",
    evidence: ["Training logs", "Partner confirmation", "Attendance records", "Source artifacts"],
    limitation: "Training completion does not prove behavior change or long-term outcome.",
    detail: "When a partner delivers your program activities, evidence quality depends on their record-keeping and your confirmation process. Synerxus captures training logs, partner confirmations, attendance records, and source artifacts — and documents what the partner-delivered claim does not prove on its own. Partner-reported figures remain separate from independently confirmed totals.",
    whoUses: "Program managers and NGOs documenting partner-delivered activities for funders or corporate clients.",
  },
  {
    title: "Supplier / Value Chain Evidence",
    icon: Truck,
    color: "#7551b5",
    claim: "Supplier sustainability activities were reviewed during the reporting period.",
    evidence: ["Supplier submissions", "Inspection records", "Certificates", "Source documents"],
    limitation: "Supplier-submitted evidence is self-reported unless independently reviewed. Synerxus organizes and tracks it — it does not verify supplier claims independently.",
    detail: "Supply chain sustainability claims carry significant risk when based solely on supplier-submitted evidence. Synerxus tracks the confirmation status and source-support tier of each supplier record, flagging what has been independently reviewed versus what remains at partner-reported status — a critical distinction before assurance or compliance reliance.",
    whoUses: "Procurement and ESG teams managing supplier sustainability evidence.",
  },
  {
    title: "Grant / Funder Reporting",
    icon: Landmark,
    color: "#c88914",
    claim: "Grant-funded activities were completed as reported.",
    evidence: ["Grant reports", "Source artifacts", "Partner confirmation", "Exception log"],
    limitation: "Completion evidence does not establish causal attribution unless outcome evaluation is performed.",
    detail: "Funders require evidence that grant-funded activities were delivered as reported. Synerxus structures grant evidence records with source artifacts, partner confirmations, and exception logs — so completion claims are backed by reviewable documentation rather than narrative reports alone. Causal attribution limitations are stated explicitly in every output.",
    whoUses: "NGOs and nonprofits reporting to grant funders with evidence requirements.",
    featured: true,
    detailHref: "/use-cases/grant-funder-reporting",
  },
  {
    title: "SDG-Aligned Activity Mapping",
    icon: Target,
    color: "#3b8c28",
    claim: "Activities were mapped to SDG-aligned reporting context.",
    evidence: ["Activity record", "Mapping rationale", "Supporting evidence tier", "Limitation notes"],
    limitation: "SDG mapping does not certify SDG impact, prove contribution, or determine compliance.",
    detail: "SDG mapping requires clear documentation of what activities relate to which goals — and what the mapping does not certify. Synerxus records the mapping rationale, evidence tier, and explicit limitations for each mapped activity, ensuring SDG alignment claims are transparent and defensible rather than aspirational. Mapping is kept separate from confirmed impact claims.",
    whoUses: "Teams mapping activities to SDG reporting context for funder, board, or disclosure purposes.",
  },
  {
    title: "ESG Assurance Preparation",
    icon: ShieldCheck,
    color: "#1b5e82",
    claim: "All material ESG claims in our 2025 sustainability report are supported by reviewable evidence.",
    evidence: [
      "Full claim register with evidence status per claim",
      "Source artifact index",
      "Partner confirmation summary",
      "Exception log with resolution status",
      "Assurance-preparation export package",
    ],
    limitation: "Synerxus organizes and structures evidence for review. It does not perform assurance engagements, provide assurance opinions, or determine regulatory compliance. A qualified assurance provider is required for formal assurance conclusions.",
    detail: "ESG assurance reviews require teams to present reviewable evidence behind each material claim. Synerxus structures that evidence — a full claim register, source artifact index, partner confirmation summary, exception log, and assurance-preparation export — so teams can respond to auditor requests without manual assembly under deadline pressure. What Synerxus prepares is not an assurance opinion; that determination belongs to a qualified assurance provider.",
    whoUses: "ESG Managers preparing for limited or reasonable assurance reviews, working with Big Four or specialist assurance providers.",
  },
];

type FilterGroup = { label: string; cardIndexes: number[] };

const filterGroups: FilterGroup[] = [
  { label: "Corporate ESG / CSR teams", cardIndexes: [0, 1, 3, 6] },
  { label: "NGO and funder reporting", cardIndexes: [2, 4] },
  { label: "Framework and mapping context", cardIndexes: [5] },
];

type FlowStep = {
  title: string;
  body: string;
  icon: LucideIcon;
  detail: string;
  platformHref: string;
};

const flow: FlowStep[] = [
  {
    title: "Claim",
    body: "Define the reporting statement clearly.",
    icon: Target,
    detail: "A well-defined claim has a specific scope, a named reporting period, and a responsible party who can confirm it. Vague or unmeasurable claims create downstream evidence problems. Synerxus helps you define claims that can be substantiated before they appear in reports.",
    platformHref: "/platform",
  },
  {
    title: "Evidence",
    body: "Collect relevant source support.",
    icon: FileText,
    detail: "Collect activity logs, partner reports, invoices, surveys, and monitoring data that support the claim. Document what evidence exists and what is missing. The presence or absence of source evidence determines where the claim sits on the Evidence Ladder.",
    platformHref: "/platform",
  },
  {
    title: "Confirmation",
    body: "Record who confirmed the activity.",
    icon: CheckCircle2,
    detail: "Record who reviewed and confirmed the activity — an internal program owner, delivery partner, or external reviewer. Confirmation status directly affects the evidence tier and defensibility of the claim. Unconfirmed records are flagged separately from confirmed ones.",
    platformHref: "/platform",
  },
  {
    title: "Source Support",
    body: "Reference documents and records.",
    icon: FileText,
    detail: "Reference primary source documents that substantiate the claim: invoices, reports, photos, spreadsheets, or third-party records. Source support moves a claim from internal assertion toward reviewable evidence that an auditor or funder can inspect directly.",
    platformHref: "/platform",
  },
  {
    title: "Limitation",
    body: "State what the claim does not prove.",
    icon: ShieldAlert,
    detail: "Every claim has a boundary. State explicitly what the claim does not prove — causal attribution, long-term outcomes, regulatory compliance, or impact beyond the reported activity scope. Documented limitations protect against over-statement and are required for review-ready evidence packets.",
    platformHref: "/platform",
  },
  {
    title: "Output",
    body: "Produce a reviewable evidence summary.",
    icon: BarChart3,
    detail: "Produce a structured evidence summary that includes the claim, supporting evidence, confirmation status, mapping context, exceptions, and limitations. This output is ready for internal review, reporting submissions, or assurance preparation — without requiring manual assembly when a deadline arrives.",
    platformHref: "/platform",
  },
];

export default function UseCasesPage() {
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<number | null>(null);

  const handleCaseSelect = (index: number) => {
    setSelectedCase((prev) => (prev === index ? null : index));
  };

  const handleFilterSelect = (index: number) => {
    setSelectedFilter((prev) => (prev === index ? null : index));
    setSelectedCase(null);
  };

  return (
    <MarketingLayout>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <section className="bg-white py-10 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-8 lg:grid-cols-[1fr_0.7fr] lg:items-start">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">Use Cases</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-[#0A1F44] md:text-5xl">
              Built for claims that need defensible evidence.
            </h1>
            <div className="mt-4 h-1 w-24 bg-[#c88914]" />
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
              Different programs. Different stakeholders. Same evidence backbone. Synerxus provides a consistent structure: claim to evidence to confirmation to source support to mapping context to limitation to output.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-[#c88914] text-white hover:bg-[#a9720f]">
                <Link href="/request-assessment">
                  Request Readiness Assessment <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-[#0A1F44] text-[#0A1F44]">
                <Link href="/platform">See the Platform</Link>
              </Button>
            </div>
          </div>

          {/* ── Find your use case ───────────────────────────────────────── */}
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#c88914]">
              Find your use case
            </p>
            <p className="mt-1 text-xs text-slate-500">Select an audience to highlight relevant cards.</p>
            <div className="mt-4 space-y-2">
              {filterGroups.map((group, i) => {
                const isActive = selectedFilter === i;
                const cardNums = group.cardIndexes.map((n) => n + 1).join(", ");
                return (
                  <button
                    key={group.label}
                    type="button"
                    onClick={() => handleFilterSelect(i)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition-all duration-150 ${
                      isActive
                        ? "border-[#0A1F44] bg-[#0A1F44] text-white"
                        : "border-slate-200 bg-slate-50 text-[#0A1F44] hover:border-[#0A1F44]/40 hover:bg-white"
                    }`}
                  >
                    <span className="font-semibold">{group.label}</span>
                    <span className={`shrink-0 text-[11px] font-bold ${isActive ? "text-[#c88914]" : "text-slate-400"}`}>
                      Cards {cardNums}
                    </span>
                  </button>
                );
              })}
              {selectedFilter !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter(null)}
                  className="mt-1 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700"
                >
                  ← Show all cards
                </button>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* ── Cards ────────────────────────────────────────────────────────── */}
      <section className="bg-white pb-4">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="mb-4 text-center text-sm text-slate-400">Click any card to learn more.</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {useCases.map((item, index) => {
              const Icon = item.icon;
              const isSelected = selectedCase === index;
              const isFilteredOut = selectedFilter !== null && !filterGroups[selectedFilter].cardIndexes.includes(index);
              const isDimmed = isFilteredOut || (selectedCase !== null && !isSelected && !isFilteredOut && selectedFilter === null);
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => handleCaseSelect(index)}
                  className={`relative rounded-md border bg-white p-6 text-left shadow-md transition-all duration-200 ${
                    isSelected
                      ? "border-[#0A1F44] shadow-xl ring-2 ring-[#0A1F44]/20"
                      : isDimmed
                      ? "border-slate-200 opacity-50 hover:opacity-80"
                      : "border-slate-200 hover:-translate-y-0.5 hover:shadow-xl"
                  }`}
                >
                  {/* Featured badge */}
                  {item.featured && (
                    <span className="absolute right-4 top-4 rounded-full bg-[#c88914] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Most requested
                    </span>
                  )}

                  <div className="h-1 -translate-y-6 rounded-t-md" style={{ backgroundColor: item.color }} />
                  <div className="flex items-start gap-4">
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon className="h-7 w-7" />
                    </span>
                    <h2 className={`text-xl font-extrabold leading-tight text-[#0A1F44] ${item.featured ? "pr-24" : ""}`}>
                      {index + 1}. {item.title}
                    </h2>
                  </div>

                  <p className="mt-5 text-sm font-bold uppercase tracking-wide text-[#0A1F44]">Claim</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">"{item.claim}"</p>

                  <p className="mt-5 border-t border-slate-200 pt-4 text-sm font-bold uppercase tracking-wide text-[#0A1F44]">
                    Evidence Package Preview
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                    {item.evidence.map((e) => (
                      <li key={e} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        {e}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-[#0A1F44]">
                      <ShieldAlert className="h-4 w-4" /> Limitation / Caution
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.limitation}</p>
                    <Link
                      href="/evidence-ladder"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0A1F44] transition-colors hover:text-[#c88914]"
                    >
                      Where does this claim sit on the Evidence Ladder? <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* Who uses this — always visible */}
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Who uses this</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{item.whoUses}</p>
                  </div>

                  {isSelected && (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <p className="text-sm leading-relaxed text-slate-700">{item.detail}</p>
                      <Link
                        href="/request-assessment"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#c88914] transition-colors hover:text-[#a9720f]"
                      >
                        Request an assessment <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    {item.detailHref ? (
                      <Link
                        href={item.detailHref}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-[#c88914] transition-colors hover:text-[#a9720f]"
                      >
                        See detail <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#c88914]">
                        {isSelected ? "Hide detail" : "See detail"}
                        <ArrowRight className={`h-4 w-4 transition-transform duration-200 ${isSelected ? "rotate-90" : ""}`} />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Evidence Flow Diagram ────────────────────────────────────────── */}
      <section className="bg-white pb-12 pt-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-center text-sm font-extrabold uppercase tracking-[0.18em] text-[#0A1F44]">
              One consistent evidence flow for every use case
            </h2>
            <p className="mt-1 text-center text-xs text-slate-400">Click any step to learn more.</p>

            <div className="mt-6 grid gap-5 md:grid-cols-6">
              {flow.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === index;
                return (
                  <div key={step.title} className="relative text-center">
                    <button
                      type="button"
                      onClick={() => setActiveStep((prev) => (prev === index ? null : index))}
                      className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-200 ${
                        isActive
                          ? "border-[#0A1F44] bg-[#0A1F44] shadow-md"
                          : "border-slate-200 bg-white hover:border-[#c88914]/60 hover:shadow-md"
                      }`}
                    >
                      <Icon className={`h-8 w-8 transition-colors ${isActive ? "text-[#c88914]" : "text-[#0A1F44]"}`} />
                    </button>
                    {index < flow.length - 1 && (
                      <ArrowRight className="absolute right-[-18px] top-6 hidden h-6 w-6 text-[#c88914] md:block" />
                    )}
                    <Link
                      href={step.platformHref}
                      onClick={(e) => e.stopPropagation()}
                      className={`mt-3 block text-sm font-extrabold uppercase transition-colors hover:text-[#c88914] ${isActive ? "text-[#c88914]" : "text-[#0A1F44]"}`}
                    >
                      {step.title}
                    </Link>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.body}</p>
                  </div>
                );
              })}
            </div>

            {activeStep !== null && (
              <div className="mt-6 rounded-lg border border-[#0A1F44]/20 bg-[#f8fafc] p-5">
                <div className="flex items-start gap-4">
                  {(() => { const I = flow[activeStep].icon; return <I className="h-7 w-7 shrink-0 text-[#0A1F44]" />; })()}
                  <div className="flex-1">
                    <h3 className="font-extrabold text-[#0A1F44]">{flow[activeStep].title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{flow[activeStep].detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStep(null)}
                    className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-700"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="bg-[#061A36] py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-[1fr_auto_auto] md:items-center md:px-8">
          <div>
            <p className="text-sm font-extrabold uppercase text-[#ffcc33]">Ready to strengthen your evidence?</p>
            <h2 className="mt-3 text-3xl font-extrabold text-white">
              Explore use cases or get a tailored evidence readiness assessment.
            </h2>
          </div>
          <Button asChild className="border-2 border-white/60 bg-white/10 text-white hover:bg-white hover:text-[#061A36]">
            <Link href="/platform">
              See the Platform <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild className="bg-[#c88914] text-white hover:bg-[#a9720f]">
            <Link href="/request-assessment">
              Request Readiness Assessment <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
