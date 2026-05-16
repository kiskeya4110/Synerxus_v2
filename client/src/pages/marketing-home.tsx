import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, CheckCircle2, ChevronDown, Cloud, FilePlus2, FileText, GitBranch, Globe2, Info, Landmark, LockKeyhole, Network, Paperclip, ShieldAlert, ShieldCheck, Target, User, UserCheck, Users, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

// ── Data ────────────────────────────────────────────────────────────────────

type CategoryData = { title: string; body: string; detail: string; icon: LucideIcon; strength: number; note?: string };

const evidenceCategories: CategoryData[] = [
  {
    title: "Self-Reported Records",
    body: "Internal records created and maintained by your organization.",
    icon: User,
    strength: 20,
    detail: "Internal records form the starting point on the Evidence Ladder — not the endpoint. Without external confirmation or attached source documents, these carry higher reporting risk. Synerxus helps you identify which self-reported records need additional support before they appear in reports.",
  },
  {
    title: "Partner-Confirmed Records",
    body: "Information confirmed by a trusted partner with direct knowledge.",
    icon: Users,
    strength: 60,
    detail: "Partner confirmation moves records toward a more defensible evidence tier. The confirming party's name, role, and authorization are documented alongside the confirmation — so reviewers know who confirmed what, not just that confirmation occurred.",
  },
  {
    title: "Source-Supported Records",
    body: "Backed by primary source documents and reviewable evidence.",
    icon: FileText,
    strength: 80,
    detail: "Source support — invoices, reports, photos, spreadsheets, or third-party records — is the key move from moderate to lower risk. It enables reviewers to verify the claim directly without relying on internal assertion alone.",
  },
  {
    title: "Partner-Reported Figures",
    body: "Figures reported by partners without treating them as independently confirmed.",
    icon: BarChart3,
    strength: 40,
    note: "Not independently confirmed",
    detail: "Partner-reported figures are tracked separately from confirmed evidence totals. This separation is critical when reporting to auditors, funders, or regulators — it shows exactly what was externally confirmed versus what was reported by the partner without independent verification.",
  },
  {
    title: "Mapped Records",
    body: "Claims mapped to SDGs, frameworks, or reporting categories with limitations.",
    icon: Network,
    strength: 50,
    note: "Context layer — not evidence strength",
    detail: "Mapping adds context and disclosure transparency, but does not constitute certification, impact attribution, or compliance determination. Synerxus documents the mapping rationale and explicit limitations for every mapped record — keeping alignment claims honest and defensible.",
  },
];

type FrameworkCard = {
  title: string;
  items: string[];
  description: string;
  boundary: string;
  detail: string;
  icon: LucideIcon;
};

const frameworkCards: FrameworkCard[] = [
  {
    title: "Reporting / Disclosure Context",
    items: ["CSRD", "ESRS", "GRI", "ISSB"],
    description: "Connect claims to evidence records, source support, confirmation status, and limitation notes for reporting preparation.",
    boundary: "Not a compliance determination.",
    detail: "Use this context when a claim needs to sit inside reporting packs, disclosure drafts, or internal review workflows with traceable support attached.",
    icon: Landmark,
  },
  {
    title: "Climate Disclosure Context",
    items: ["TCFD", "IFRS S2"],
    description: "Organize climate-related evidence context when it is relevant to a broader ESG, CSR, supplier, or program claim.",
    boundary: "Not carbon accounting, emissions reporting validation, or climate assurance.",
    detail: "Use this context when climate references are part of a broader claim record and need to be separated from the underlying evidence strength.",
    icon: Cloud,
  },
  {
    title: "Assurance-Preparation Context",
    items: ["ISAE 3000"],
    description: "Structure evidence packets, source references, confirmation metadata, exception notes, and limitations for review preparation.",
    boundary: "Not a formal assurance opinion.",
    detail: "Use this context when a packet needs a clean source trail, confirmation metadata, and exception notes before a reviewer opens it.",
    icon: ShieldCheck,
  },
  {
    title: "Mapping Context",
    items: ["UN SDGs", "Internal Categories"],
    description: "Classify records by goal, theme, or reporting category while keeping mapping separate from evidence strength.",
    boundary: "Not SDG impact certification or contribution attribution.",
    detail: "Use this context when you need to tag claims by goal or category without changing whether the record is self-reported, confirmed, or source-supported.",
    icon: Globe2,
  },
];

type WorkflowStep = { title: string; body: string; icon: LucideIcon; detail: string };

const workflow: WorkflowStep[] = [
  {
    title: "Create Claim",
    body: "Define clear, measurable claims with responsible owners.",
    icon: FilePlus2,
    detail: "A well-defined claim has a specific scope, a named reporting period, and a responsible party who can confirm it. Vague or aspirational claims create downstream evidence problems — a precisely scoped claim can be substantiated before it appears in any report.",
  },
  {
    title: "Attach Evidence",
    body: "Attach source documents, data, and supporting context.",
    icon: Paperclip,
    detail: "Attach source documents, data files, partner reports, and supporting context to each claim. The nature and completeness of attached evidence determines where the claim sits on the Evidence Ladder — from internal assertion to fully source-supported.",
  },
  {
    title: "Confirm",
    body: "Confirm who reviewed the claim and the source-support status.",
    icon: UserCheck,
    detail: "Record who reviewed and confirmed the claim and its supporting evidence. Confirmation status is tracked separately from self-reported records. The confirming party's name, role, and authorization are part of the evidence record — not just a checkbox.",
  },
  {
    title: "Map",
    body: "Map claims to frameworks, standards, or disclosure context.",
    icon: GitBranch,
    detail: "Map claims to reporting frameworks — GRI, CSRD, ISSB, TCFD, or UN SDGs — with documented mapping rationale and limitations. Derived mappings are kept separate from confirmed evidence totals so alignment claims remain accurate and defensible.",
  },
  {
    title: "Defend",
    body: "Package a reviewable evidence trail that holds up when stakeholders ask questions.",
    icon: LockKeyhole,
    detail: "Preserve a structured claim-to-evidence trail that persists across reporting periods. When an auditor, funder, or regulator requests evidence, teams with preserved records can respond immediately — without manual assembly under deadline pressure.",
  },
];

type FlowStep = { title: string; body: string; icon: LucideIcon; detail: string };

const evidenceFlow: FlowStep[] = [
  {
    title: "Claim",
    body: "Define the reporting statement clearly",
    icon: Target,
    detail: "A well-defined claim has a specific scope, a named reporting period, and a responsible party who can confirm it. Vague or unmeasurable claims create downstream evidence problems. Synerxus helps you define claims that can be substantiated before they appear in reports.",
  },
  {
    title: "Evidence",
    body: "Collect relevant source support",
    icon: FileText,
    detail: "Collect activity logs, partner reports, invoices, surveys, and monitoring data that support the claim. Document what evidence exists and what is missing. The presence or absence of source evidence determines where the claim sits on the Evidence Ladder.",
  },
  {
    title: "Confirmation",
    body: "Record who confirmed the activity",
    icon: CheckCircle2,
    detail: "Record who reviewed and confirmed the activity — an internal program owner, delivery partner, or external reviewer. Confirmation status directly affects the evidence tier and defensibility of the claim. Unconfirmed records are flagged separately from confirmed ones.",
  },
  {
    title: "Source Support",
    body: "Reference documents and records",
    icon: FileText,
    detail: "Reference primary source documents that substantiate the claim: invoices, reports, photos, spreadsheets, or third-party records. Source support moves a claim from internal assertion toward reviewable evidence that an auditor or funder can inspect directly.",
  },
  {
    title: "Limitation",
    body: "State what the claim does not prove",
    icon: ShieldAlert,
    detail: "Every claim has a boundary. State explicitly what the claim does not prove — causal attribution, long-term outcomes, regulatory compliance, or impact beyond the reported activity scope. Documented limitations protect against over-statement and are required for review-ready evidence packets.",
  },
  {
    title: "Output",
    body: "Produce a reviewable evidence summary",
    icon: BarChart3,
    detail: "Produce a structured evidence summary that includes the claim, supporting evidence, confirmation status, mapping context, exceptions, and limitations. This output is ready for internal review, reporting submissions, or assurance preparation — without requiring manual assembly when a deadline arrives.",
  },
];

function strengthFillClass(strength: number): string {
  if (strength <= 20) return "bg-slate-400";
  if (strength <= 40) return "bg-amber-400";
  if (strength <= 50) return "bg-amber-500";
  if (strength <= 60) return "bg-[#c88914]";
  return "bg-emerald-600";
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function MarketingHome() {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [activeFrameworkCard, setActiveFrameworkCard] = useState<number | null>(null);
  const [activeFlowStep, setActiveFlowStep] = useState<number | null>(null);

  return (
    <MarketingLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-14">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">
              Evidence behind the claim.
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.04] tracking-tight text-[#0A1F44] md:text-5xl">
              Claim-level evidence for defensible ESG and social-impact reporting.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#0A1F44]/80">
              Turn each claim into a structured evidence record that shows what supports it, who confirmed it, what source evidence exists, what remains unverified, and what the claim does not prove.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-[#c88914] text-white hover:bg-[#a9720f]">
                <Link href="/request-assessment">Request Readiness Assessment</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#0A1F44] text-[#0A1F44]">
                <Link href="/platform">View Sample Evidence Summary</Link>
              </Button>
            </div>
            <div className="mt-8 flex gap-4 rounded-md border border-[#c88914]/30 bg-[#fff9eb] p-4 text-sm leading-relaxed text-[#0A1F44]">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#c88914]" />
              <p>
                Synerxus supports evidence organization, reporting preparation, and assurance preparation; it does not provide formal assurance, legal advice, regulatory compliance determinations, SDG impact certification, or causal attribution.
              </p>
            </div>
          </div>

          {/* ── Claim record mini-preview ───────────────────────────────── */}
          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-100 bg-[#061A36] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">Sample Claim Record</p>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500">Claim</p>
                    <h3 className="mt-1 text-sm font-extrabold leading-snug text-[#0A1F44]">
                      240 residents completed solar workforce training during Q2 2026.
                    </h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">In review</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: "Claimed residents", value: "240" },
                    { label: "Confirmed residents", value: "240" },
                    { label: "Evidence coverage", value: "76%" },
                    { label: "Evidence packets", value: "8" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-md border border-slate-200 p-3">
                      <p className="text-[10px] font-bold text-slate-500">{label}</p>
                      <p className="mt-1 text-xl font-extrabold tabular-nums text-[#0A1F44]">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-md bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-extrabold text-[#0A1F44]">Evidence coverage</p>
                    <p className="text-xs font-bold tabular-nums text-emerald-700">76%</p>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-3 w-[76%] rounded-full bg-emerald-600" />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-slate-500">
                    Supported 76% · Partial 16% · Unverified 8%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ESG Manager Framing ─────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-center text-2xl font-extrabold text-[#0A1F44]">
            Built for the moment your assurance provider asks: what supports this claim?
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base leading-relaxed text-slate-700">
            ESG Managers spend weeks before assurance reviews reconstructing the evidence behind disclosure claims. Synerxus connects each claim to its evidence, confirmation, and source support before the review starts — so the answer is ready when it is asked.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-red-700">Before Synerxus</p>
              <ul className="mt-5 space-y-3">
                {[
                  "ESG claims assembled from spreadsheets and email chains",
                  "Partner reports stored as unconnected PDFs",
                  "Assurance provider asks for evidence, team scrambles to reconstruct",
                  "Some claims cannot be supported after the fact",
                  "Disclosure is filed with known evidence gaps",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-emerald-700">With Synerxus</p>
              <ul className="mt-5 space-y-3">
                {[
                  "Each disclosure claim connected to its evidence record",
                  "Partner confirmation captured with name, role, and date",
                  "Source artifacts attached to specific claims, not filed separately",
                  "Exception flags visible before the report is submitted",
                  "Assurance-preparation export ready when the review starts",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── How Synerxus Works ───────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-center text-2xl font-extrabold text-[#0A1F44]">How Synerxus Works</h2>
          <p className="mt-1 text-center text-sm text-slate-400">Click any step to learn more.</p>
          <div className="mt-7 grid gap-5 lg:grid-cols-5">
            {workflow.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeWorkflowStep === index;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActiveWorkflowStep((prev) => (prev === index ? null : index))}
                  className={`group relative flex gap-3 rounded-lg border p-3 text-left transition-all duration-200 ${
                    isActive
                      ? "border-[#0A1F44] bg-[#0A1F44] shadow-md"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    isActive
                      ? "border-white/20 bg-white/15"
                      : "border-[#0A1F44]/20 bg-white group-hover:border-[#c88914]/60 group-hover:bg-[#fff9eb]"
                  }`}>
                    <Icon className={`h-7 w-7 transition-colors ${isActive ? "text-[#c88914]" : "text-[#0A1F44] group-hover:text-[#c88914]"}`} />
                  </div>
                  <div>
                    <p className={`text-xs font-extrabold ${isActive ? "text-[#c88914]" : "text-[#c88914]"}`}>{index + 1}</p>
                    <h3 className={`text-sm font-extrabold ${isActive ? "text-white" : "text-[#0A1F44]"}`}>{item.title}</h3>
                    <p className={`mt-1 text-xs leading-relaxed ${isActive ? "text-white/70" : "text-slate-600"}`}>{item.body}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {activeWorkflowStep !== null && (
            <div className="mt-5 rounded-lg border border-[#0A1F44]/20 bg-[#f8fafc] p-5">
              <div className="flex items-start gap-4">
                {(() => { const I = workflow[activeWorkflowStep].icon; return <I className="h-7 w-7 shrink-0 text-[#0A1F44]" />; })()}
                <div className="flex-1">
                  <h3 className="font-extrabold text-[#0A1F44]">{workflow[activeWorkflowStep].title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{workflow[activeWorkflowStep].detail}</p>
                </div>
                <button type="button" onClick={() => setActiveWorkflowStep(null)} className="shrink-0 text-slate-400 hover:text-slate-600">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Evidence Categories ──────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-center text-2xl font-extrabold text-[#0A1F44]">
            Most ESG reporting treats all evidence as equal. Synerxus does not.
          </h2>
          <p className="mt-1 text-center text-sm text-slate-400">Click any category to learn more.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {evidenceCategories.map((cat, index) => {
              const CategoryIcon = cat.icon;
              const isSelected = selectedCategory === index;
              const isDimmed = selectedCategory !== null && !isSelected;
              return (
                <button
                  key={cat.title}
                  type="button"
                  onClick={() => setSelectedCategory((prev) => (prev === index ? null : index))}
                  className={`rounded-md border bg-white p-6 text-center shadow-sm transition-all duration-200 ${
                    isSelected
                      ? "border-[#0A1F44] shadow-md ring-2 ring-[#0A1F44]/20"
                      : isDimmed
                      ? "border-slate-200 opacity-50 hover:opacity-80"
                      : "border-slate-200 hover:border-[#0A1F44]/30 hover:shadow-md"
                  }`}
                >
                  <CategoryIcon className={`mx-auto h-10 w-10 transition-colors ${isSelected ? "text-[#c88914]" : "text-[#0A1F44]"}`} />
                  <h3 className="mt-4 text-sm font-extrabold text-[#0A1F44]">{cat.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{cat.body}</p>

                  {/* Strength indicator */}
                  <div className="mt-4 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Evidence strength</p>
                      <p className="text-[10px] font-bold text-slate-500">{cat.strength}%</p>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-1.5 rounded-full ${strengthFillClass(cat.strength)}`}
                        style={{ width: `${cat.strength}%` }}
                      />
                    </div>
                    {cat.note && (
                      <p className="mt-1 text-[10px] italic text-slate-500">{cat.note}</p>
                    )}
                  </div>

                  {isSelected && (
                    <div className="mt-4 border-t border-slate-200 pt-4 text-left">
                      <p className="text-xs leading-relaxed text-slate-700">{cat.detail}</p>
                      <Link
                        href="/evidence-ladder"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#c88914] transition-colors hover:text-[#a9720f]"
                      >
                        View Evidence Ladder <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  <p className={`mt-4 text-xs font-bold text-[#c88914] transition-opacity ${isSelected ? "opacity-0 h-0" : "opacity-0 group-hover:opacity-100"}`}>
                    {isSelected ? "" : "See detail →"}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Not sure which use case applies to you?{" "}
            <Link href="/use-cases" className="font-semibold text-[#c88914] transition-colors hover:text-[#a9720f]">
              See all use cases →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Frameworks ───────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-center text-2xl font-extrabold text-[#0A1F44]">
            Organize evidence across reporting, mapping, and review contexts.
          </h2>
          <p className="mx-auto mt-2 max-w-4xl text-center text-sm leading-relaxed text-slate-600">
            Synerxus helps teams connect claim-level evidence to the reporting, disclosure, SDG mapping, and assurance-preparation contexts they use — while keeping confirmation status, source support, assumptions, and limitations visible.
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-4">
            {frameworkCards.map((card, index) => {
              const CardIcon = card.icon;
              const isActive = activeFrameworkCard === index;
              return (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => setActiveFrameworkCard((prev) => (prev === index ? null : index))}
                  aria-expanded={isActive}
                  className={`rounded-md border bg-slate-50 p-4 text-left transition-all duration-200 ${
                    isActive
                      ? "border-[#0A1F44] shadow-md ring-2 ring-[#0A1F44]/10"
                      : "border-slate-200 hover:border-[#0A1F44]/30 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white">
                      <CardIcon className="h-5 w-5 text-[#0A1F44]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-extrabold text-[#0A1F44]">{card.title}</h3>
                      <p className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-slate-500">{card.items.join(" · ")}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isActive ? "rotate-180 text-[#0A1F44]" : ""}`} />
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">{card.description}</p>
                  <p className="mt-4 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-500">{card.boundary}</p>
                  {isActive && (
                    <div className="mt-4 rounded-md border border-[#0A1F44]/10 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0A1F44]/60">Synerxus use</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{card.detail}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-[#0A1F44]">
            Framework and SDG alignment supports reporting context only. It does not constitute certification, formal assurance, endorsement, legal advice, regulatory compliance determination, SDG impact certification, or causal attribution.
          </p>
        </div>
      </section>

      {/* ── Evidence Flow Diagram ────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-center text-sm font-extrabold uppercase tracking-[0.18em] text-[#0A1F44]">
              One consistent evidence flow for every claim
            </h2>
            <p className="mt-1 text-center text-xs text-slate-400">Click any step to learn more.</p>

            <div className="mt-6 grid gap-5 md:grid-cols-6">
              {evidenceFlow.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeFlowStep === index;
                return (
                  <div key={step.title} className="relative text-center">
                    <button
                      type="button"
                      onClick={() => setActiveFlowStep((prev) => (prev === index ? null : index))}
                      className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-200 ${
                        isActive
                          ? "border-[#0A1F44] bg-[#0A1F44] shadow-md"
                          : "border-slate-200 bg-white hover:border-[#c88914]/60 hover:shadow-md"
                      }`}
                    >
                      <Icon className={`h-8 w-8 transition-colors ${isActive ? "text-[#c88914]" : "text-[#0A1F44]"}`} />
                    </button>
                    {index < evidenceFlow.length - 1 && (
                      <ArrowRight className="absolute right-[-18px] top-6 hidden h-6 w-6 text-[#c88914] md:block" />
                    )}
                    <Link
                      href="/platform"
                      className={`mt-3 block text-sm font-extrabold uppercase transition-colors hover:text-[#c88914] ${isActive ? "text-[#c88914]" : "text-[#0A1F44]"}`}
                    >
                      {step.title}
                    </Link>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.body}</p>
                  </div>
                );
              })}
            </div>

            {activeFlowStep !== null && (
              <div className="mt-6 rounded-lg border border-[#0A1F44]/20 bg-[#f8fafc] p-5">
                <div className="flex items-start gap-4">
                  {(() => { const I = evidenceFlow[activeFlowStep].icon; return <I className="h-7 w-7 shrink-0 text-[#0A1F44]" />; })()}
                  <div className="flex-1">
                    <h3 className="font-extrabold text-[#0A1F44]">{evidenceFlow[activeFlowStep].title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{evidenceFlow[activeFlowStep].detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveFlowStep(null)}
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
      <section className="bg-white pb-10 pt-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-6 rounded-xl bg-[#061A36] p-8 text-white md:grid-cols-[auto_1fr_auto] md:items-center">
            <ShieldCheck className="hidden h-16 w-16 shrink-0 text-[#c88914] md:block" />
            <div>
              <h2 className="text-3xl font-extrabold text-white">Find out how defensible your claims are.</h2>
              <p className="mt-2 max-w-2xl text-white/80">
                Get a clear view of your evidence maturity, source-support gaps, confirmation status, and reporting limitations before claims appear in reports or review workflows.
              </p>
              <Link
                href="/platform"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 transition-colors hover:text-white"
              >
                See how it works <ArrowRight className="h-3.5 w-3.5" /> Platform
              </Link>
            </div>
            <Button asChild size="lg" className="bg-[#c88914] text-white hover:bg-[#a9720f] active:bg-[#8a5f0a]">
              <Link href="/request-assessment">
                Request Readiness Assessment <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
