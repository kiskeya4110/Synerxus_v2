import { useState, type KeyboardEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, Building2, CheckCircle2, FileText, Handshake, Landmark, ShieldAlert, Target, Truck, Users, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

type UseCase = {
  title: string;
  icon: LucideIcon;
  color: string;
  claim: string;
  evidence: string[];
  limitation: string;
  confirmationWorkflow: string;
  sourceSupport: string[];
  mappingContext: string;
  recommendedOutput: string;
  featured?: boolean;
};

const useCases: UseCase[] = [
  {
    title: "Corporate ESG / CSR Reporting",
    icon: Building2,
    color: "#0A1F44",
    claim: "Our community investment program supported local workforce development activities during the reporting period.",
    evidence: ["Activity records", "Source documents", "Partner confirmation", "Limitation notes"],
    limitation: "Reporting support does not determine regulatory compliance or provide formal assurance.",
    confirmationWorkflow: "Program owner or partner reviewer confirms the activity record, reviewer role, date, and scope reviewed.",
    sourceSupport: ["Attendance records", "Program files", "Partner reports", "Activity logs"],
    mappingContext: "May support GRI, ESRS, CSR, board, or internal reporting categories as context only.",
    recommendedOutput: "Evidence Summary with claim, records, confirmation status, source support, and limitations.",
  },
  {
    title: "Corporate Volunteering",
    icon: Users,
    color: "#1f7ae0",
    claim: "Employees participated in volunteer activities across partner programs.",
    evidence: ["Volunteer logs", "Partner confirmation", "Attendance records", "Source support"],
    limitation: "Volunteer hours do not prove community outcomes without additional outcome evidence.",
    confirmationWorkflow: "Partner or program administrator confirms participation records and event attendance where applicable.",
    sourceSupport: ["Volunteer logs", "Attendance rosters", "Event records", "Partner notes"],
    mappingContext: "Can be mapped to employee engagement, community investment, or SDG-aligned context without changing evidence strength.",
    recommendedOutput: "Volunteer evidence summary showing participation records, confirmation status, and limitations.",
  },
  {
    title: "Partner-Delivered Outputs",
    icon: Handshake,
    color: "#0f9f96",
    claim: "Implementation partners delivered training, services, or program activities during the reporting period.",
    evidence: ["Partner reports", "Confirmation records", "Attendance logs", "Source artifacts"],
    limitation: "Delivered outputs do not prove long-term outcomes or causal attribution.",
    confirmationWorkflow: "Implementation partner confirms what was delivered, when, by whom, and which source records support the entry.",
    sourceSupport: ["Partner reports", "Attendance logs", "Service records", "Delivery documentation"],
    mappingContext: "Can be mapped to program, funder, SDG, or internal reporting categories as context.",
    recommendedOutput: "Partner-delivered output summary with source artifacts and stated boundaries.",
  },
  {
    title: "Supplier / Value Chain Evidence",
    icon: Truck,
    color: "#7551b5",
    claim: "Supplier sustainability records were collected and reviewed during the reporting period.",
    evidence: ["Supplier submissions", "Certificates", "Inspection records", "Corrective action records"],
    limitation: "Supplier-reported data may require independent review before compliance reliance.",
    confirmationWorkflow: "Internal reviewer logs whether supplier records were received, checked, pending clarification, or flagged.",
    sourceSupport: ["Supplier files", "Certificates", "Inspection records", "Corrective action logs"],
    mappingContext: "Can be mapped to supplier, value-chain, procurement, or disclosure categories with limitation notes.",
    recommendedOutput: "Supplier evidence packet showing source status, review status, exceptions, and limitations.",
  },
  {
    title: "Grant / Funder Reporting",
    icon: Landmark,
    color: "#c88914",
    claim: "Grant-funded activities were completed as reported.",
    evidence: ["Grant reports", "Activity records", "Disbursement documentation", "Source artifacts"],
    limitation: "Completion evidence does not establish causal attribution unless outcome evaluation is performed.",
    confirmationWorkflow: "Grant owner or delivery partner confirms completion status, source records, and unresolved exceptions.",
    sourceSupport: ["Grant reports", "Activity records", "Disbursement records", "Source artifacts"],
    mappingContext: "Can be mapped to funder reporting categories and grant outcome frameworks with boundaries preserved.",
    recommendedOutput: "Funder-ready Evidence Summary showing completion evidence, source support, and limitations.",
    featured: true,
  },
  {
    title: "SDG-Aligned Activity Mapping",
    icon: Target,
    color: "#3b8c28",
    claim: "Activities were mapped to SDG-aligned reporting context.",
    evidence: ["Activity record", "Mapping rationale", "Evidence tier", "Limitation note"],
    limitation: "SDG mapping does not certify SDG impact, establish contribution, or determine compliance.",
    confirmationWorkflow: "Reviewer documents who mapped the activity, what rationale was used, and whether source evidence supports the underlying activity record.",
    sourceSupport: ["Activity record", "Mapping rationale", "Evidence tier", "Limitation note"],
    mappingContext: "SDGs, internal categories, or reporting themes are used as context, not evidence strength.",
    recommendedOutput: "Mapping context summary with rationale, evidence tier, and limitation note.",
  },
];

type FilterGroup = {
  label: string;
  cardIndexes: number[];
  summary: string;
  focus: string;
  outcome: string;
};

const filterGroups: FilterGroup[] = [
  {
    label: "Corporate ESG / CSR teams",
    cardIndexes: [0, 1, 3],
    summary: "Build defensible evidence packages behind corporate ESG / CSR reporting, community investment, volunteering, and supplier records.",
    focus: "Claim registers, partner confirmation, source artifacts, exception logs, and reviewable summaries.",
    outcome: "A clearer evidence trail before claims reach leadership, reports, or assurance review.",
  },
  {
    label: "NGO and funder reporting",
    cardIndexes: [2, 4],
    summary: "Document partner-delivered activities and grant-funded outputs with source support and explicit reporting boundaries.",
    focus: "Delivery records, attendance logs, partner confirmations, grant reports, and funder-ready summaries.",
    outcome: "Less manual assembly when funders ask what happened, who confirmed it, and what evidence exists.",
  },
  {
    label: "Framework and mapping context",
    cardIndexes: [5],
    summary: "Map activity records to SDG or framework context without overstating alignment as evidence of outcomes.",
    focus: "Mapping rationale, evidence tier, limitation notes, and stakeholder reporting context.",
    outcome: "A cleaner distinction between useful reporting context and claims that require stronger evidence.",
  },
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
    body: "Attach relevant activity records, documents, or artifacts.",
    icon: FileText,
    detail: "Attach relevant activity records, documents, or artifacts.",
    platformHref: "/platform",
  },
  {
    title: "Confirmation",
    body: "Capture who confirmed or reviewed the record.",
    icon: CheckCircle2,
    detail: "Capture who confirmed or reviewed the record.",
    platformHref: "/platform",
  },
  {
    title: "Source Support",
    body: "Preserve source files, logs, and references.",
    icon: FileText,
    detail: "Preserve source files, logs, and references.",
    platformHref: "/platform",
  },
  {
    title: "Limitation",
    body: "State what remains unconfirmed or outside the claim.",
    icon: ShieldAlert,
    detail: "State what remains unconfirmed or outside the claim.",
    platformHref: "/platform",
  },
  {
    title: "Evidence Summary",
    body: "Produce a reviewable evidence summary.",
    icon: BarChart3,
    detail: "Generate a reviewable summary for reporting preparation.",
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

  const handleCaseKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCaseSelect(index);
    }
  };

  return (
    <MarketingLayout>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <section className="bg-white py-7 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[1fr_0.7fr] lg:items-start lg:gap-10">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">Solutions</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight text-[#0A1F44] sm:text-4xl md:text-5xl">
              Built for claims that need defensible evidence.
            </h1>
            <p className="mt-3 max-w-2xl text-lg font-semibold leading-tight text-[#0A1F44] sm:mt-4 sm:text-2xl">
              Different programs. Different stakeholders. One evidence structure.
            </p>
            <div className="mt-4 h-1 w-24 bg-[#c88914]" />
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700 sm:mt-6 sm:text-lg">
              Synerxus helps teams connect claims to evidence, confirmation, source support, mapping context, limitations, and reviewable summaries across ESG, CSR, and social-impact workflows.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row">
              <Button asChild className="w-full bg-[#c88914] text-white hover:bg-[#a9720f] sm:w-auto">
                <Link href="/assessment">
                  Request Evidence Readiness Assessment <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-[#0A1F44] text-[#0A1F44] sm:w-auto">
                <Link href="/platform">See the Platform</Link>
              </Button>
            </div>
          </div>

          {/* ── Find your use case ───────────────────────────────────────── */}
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#c88914]">
              Find your use case
            </p>
            <p className="mt-1 text-xs text-slate-500">Select an audience to reveal the relevant solution path.</p>
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
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              {selectedFilter === null ? (
                <>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Solution brief</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    Choose an audience above to see which cards matter most and what evidence workflow they support.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#c88914]">
                    {filterGroups[selectedFilter].label}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{filterGroups[selectedFilter].summary}</p>
                  <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Focus</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{filterGroups[selectedFilter].focus}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Outcome</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{filterGroups[selectedFilter].outcome}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* ── Cards ────────────────────────────────────────────────────────── */}
      <section className="bg-white pb-4">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="mb-4 text-center text-sm text-slate-400">Click any card to learn more.</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {useCases.map((item, index) => {
              const Icon = item.icon;
              const isSelected = selectedCase === index;
              const isFilteredOut = selectedFilter !== null && !filterGroups[selectedFilter].cardIndexes.includes(index);
              const isDimmed = isFilteredOut || (selectedCase !== null && !isSelected && !isFilteredOut && selectedFilter === null);
              return (
                <article
                  key={item.title}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-expanded={isSelected}
                  aria-label={`${isSelected ? "Collapse" : "Expand"} ${item.title} use case`}
                  onClick={() => handleCaseSelect(index)}
                  onKeyDown={(event) => handleCaseKeyDown(event, index)}
                  className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-white p-4 text-left shadow-md outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#c88914] focus-visible:ring-offset-2 sm:p-5 ${
                    isSelected
                      ? "min-h-[520px] border-[#0A1F44] shadow-xl ring-2 ring-[#c88914]/30 md:min-h-[640px]"
                      : isDimmed
                      ? "min-h-[300px] border-slate-200 bg-slate-50 opacity-70 hover:opacity-95 md:h-[360px]"
                      : "min-h-[300px] border-slate-200 hover:-translate-y-0.5 hover:border-[#0A1F44]/35 hover:shadow-xl md:h-[360px]"
                  }`}
                >
                  {/* Featured badge */}
                  {item.featured && (
                    <span className="absolute right-4 top-4 rounded-full bg-[#c88914] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Most requested
                    </span>
                  )}

                  <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: item.color }} />
                  <div className="flex items-start gap-4">
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-transform duration-200 ${
                        isSelected ? "scale-105" : "group-hover:scale-105"
                      }`}
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <h2 className={`text-base font-extrabold leading-tight text-[#0A1F44] sm:text-lg ${item.featured ? "pr-20 sm:pr-24" : ""}`}>
                      {index + 1}. {item.title}
                    </h2>
                  </div>

                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#0A1F44]">Claim</p>
                  <p className={`mt-2 text-sm leading-relaxed text-slate-700 ${isSelected ? "" : "line-clamp-3"}`}>
                    "{item.claim}"
                  </p>

                  {isSelected ? (
                    <>
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
                    </>
                  ) : (
                    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Evidence Package
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#0A1F44]">
                        {item.evidence.length} evidence elements
                      </p>
                    </div>
                  )}

                  {isSelected && (
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
                  )}

                  {isSelected && (
                    <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 text-sm">
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Confirmation workflow</p>
                        <p className="mt-1 leading-relaxed text-slate-700">{item.confirmationWorkflow}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Source-support examples</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.sourceSupport.map((source) => (
                            <span key={source} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-[#0A1F44]">
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Mapping context</p>
                        <p className="mt-1 leading-relaxed text-slate-700">{item.mappingContext}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">What the claim does not prove</p>
                        <p className="mt-1 leading-relaxed text-slate-700">{item.limitation}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Recommended output</p>
                        <p className="mt-1 leading-relaxed text-slate-700">{item.recommendedOutput}</p>
                      </div>
                      <Link
                        href="/assessment"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#c88914] transition-colors hover:text-[#a9720f]"
                      >
                        Request Evidence Readiness Assessment <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}

                  <div className="mt-auto border-t border-slate-100 pt-3">
                    <span className={`inline-flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-bold transition-colors ${
                      isSelected
                        ? "border-[#0A1F44]/20 bg-slate-100 text-[#0A1F44]"
                        : "border-[#c88914]/35 bg-[#fff8e8] text-[#7a520d] group-hover:border-[#c88914] group-hover:bg-[#ffefd0] group-hover:text-[#0A1F44]"
                    }`}>
                      {isSelected ? "Collapse details" : "Expand details"}
                      <ArrowRight className={`h-4 w-4 transition-transform duration-200 ${isSelected ? "rotate-90" : ""}`} />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Evidence Flow Diagram ────────────────────────────────────────── */}
      <section className="bg-white pb-8 pt-6 sm:pb-12 sm:pt-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-center text-sm font-extrabold uppercase tracking-[0.18em] text-[#0A1F44]">
              One evidence structure across use cases.
            </h2>
            <p className="mt-1 text-center text-xs text-slate-400">Click any step to learn more.</p>

            <div className="mt-5 grid gap-5 sm:mt-6 sm:grid-cols-2 md:grid-cols-6">
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
      <section className="bg-[#061A36] py-7 text-white sm:py-10">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 md:grid-cols-[1fr_auto_auto] md:items-center md:px-8">
          <div>
            <p className="text-sm font-extrabold uppercase text-[#ffcc33]">Ready to strengthen your evidence?</p>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
              Start with a focused review of your claims, evidence gaps, source support, confirmation status, and limitations.
            </h2>
          </div>
          <Button asChild className="w-full border-2 border-white/60 bg-white/10 text-white hover:bg-white hover:text-[#061A36] sm:w-auto">
            <Link href="/platform">
              See the Platform <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild className="w-full bg-[#c88914] text-white hover:bg-[#a9720f] sm:w-auto">
            <Link href="/assessment">
              Request Evidence Readiness Assessment <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
