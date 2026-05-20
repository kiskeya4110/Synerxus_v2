import { useState } from "react";
import { ArrowRight, BarChart3, ChevronDown, ClipboardCheck, FileText, FolderOpen, ListChecks, ShieldAlert, ShieldCheck, Users, XCircle, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AnimatedMetricValue } from "@/components/marketing/animated-metric-value";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import communityProgramImage from "@assets/Community Volunteers_1763707388972.png";

type TimelineItem = {
  day: string;
  text: string;
};

type Feature = {
  title: string;
  body: string;
  detail: string;
  metric: string;
};

type EvidenceCategory = {
  title: string;
  body: string;
  detail: string;
  tier: string;
  icon: LucideIcon;
};

const beforeTimeline: TimelineItem[] = [
  { day: "Day -30", text: "Assurance provider sends evidence request list" },
  { day: "Day -28", text: "ESG team begins searching for supporting documents" },
  { day: "Day -21", text: "Three claims have no source artifacts; team contacts partners for retroactive confirmation" },
  { day: "Day -14", text: "Two partners do not respond. Confirmation is reconstructed from email chains." },
  { day: "Day -7", text: "Evidence package assembled manually in a shared folder with inconsistent naming" },
  { day: "Day 0", text: "Assurance review begins. Auditor flags four claims as insufficiently supported." },
  { day: "Day +14", text: "Qualified opinion issued on two disclosure items." },
];

const afterTimeline: TimelineItem[] = [
  { day: "Day -30", text: "Evidence request received. Synerxus claim register already contains evidence status per claim." },
  { day: "Day -28", text: "ESG Manager opens assurance-preparation export. Evidence index, confirmation log, source artifact index, and exception summary are packaged." },
  { day: "Day -7", text: "Export sent to assurance provider. Gaps are documented with exception flags and limitation notes; not hidden." },
  { day: "Day 0", text: "Assurance review begins with structured evidence package. Auditor can trace each claim to its supporting record." },
];

const features: Feature[] = [
  {
    title: "Connect claims to evidence.",
    body: "Every disclosure claim has a structured record showing what supports it, who confirmed it, what source artifacts exist, and what the claim does not prove. Nothing is assembled retroactively.",
    detail: "ESG teams can move from a report sentence to the underlying claim record, source artifacts, confirmation status, and limitation notes without rebuilding context in a spreadsheet.",
    metric: "Claim-to-record traceability",
  },
  {
    title: "Manage evidence across partners.",
    body: "Corporate ESG reports typically draw from multiple NGO partners, community programs, and supplier submissions. Synerxus tracks confirmation status and source support per partner, not just per claim.",
    detail: "Partner records stay separated by source, reviewer, date, approval status, and exception flag so corporate reporting does not flatten weak and strong evidence into one total.",
    metric: "Partner confirmation coverage",
  },
  {
    title: "Export for assurance preparation.",
    body: "The assurance-preparation export packages evidence index, confirmation metadata, exception log, and limitation notes in a format structured for assurance provider review. Synerxus does not perform assurance; it prepares the evidence trail.",
    detail: "Exports are built around what reviewers ask for: claim index, supporting records, confirmation metadata, source artifact list, unresolved exceptions, and explicit boundaries.",
    metric: "Review package readiness",
  },
];

const evidenceCategories: EvidenceCategory[] = [
  {
    title: "Self-Reported Records",
    body: "Internal tracking data, spreadsheets, and program management records submitted by your own team. Useful as a starting point; not sufficient alone for assurance review.",
    detail: "Use these to start a claim register, but treat them as preliminary until source support or partner confirmation is attached.",
    tier: "Starting point",
    icon: FileText,
  },
  {
    title: "Partner-Confirmed Records",
    body: "Confirmation from the NGOs, community organizations, or suppliers who delivered the program. Stronger than self-reported but requires source artifact attachment to reach review-ready status.",
    detail: "Useful when a named external party confirms the record. Stronger still when confirmation is paired with primary source artifacts.",
    tier: "External confirmation",
    icon: Users,
  },
  {
    title: "Source-Supported Records",
    body: "Claims backed by primary source documents: attendance logs, invoices, partner reports, inspection records. The strongest evidence category for assurance preparation.",
    detail: "These records give reviewers inspectable material and reduce reliance on narrative summaries or reconstructed emails.",
    tier: "Reviewable support",
    icon: FolderOpen,
  },
  {
    title: "Partner-Reported Figures",
    body: "Reach and outcome figures reported by implementing partners. Useful for reporting context; not independently reviewed through a documented independent process unless explicitly noted.",
    detail: "Keep these separate from independently reviewed figures so reach and outcome language is not overstated.",
    tier: "Context only",
    icon: ClipboardCheck,
  },
  {
    title: "Mapped Records",
    body: "Claims mapped to GRI, ESRS, CSRD-related context, or SDGs. Mapping is a classification layer; it does not strengthen the evidence behind the claim.",
    detail: "Use mapping to organize reporting context, not to imply compliance, certification, causal attribution, or assurance.",
    tier: "Classification",
    icon: ShieldCheck,
  },
];

const dashboardElements = [
  {
    title: "Aggregate confirmed figures",
    icon: BarChart3,
    body: "Total confirmed volunteer hours, total confirmed people reached, total confirmed direct items — broken down by project metric type. Every figure reflects records approved by the organization only.",
    render: (
      <div className="grid gap-3">
        {[
          ["Confirmed volunteer hours", "1,248", "Workforce training"],
          ["Confirmed people reached", "3,420", "Community sessions"],
          ["Confirmed direct items", "18,600", "Supply distribution"],
        ].map(([label, value, type]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{type}</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="text-sm font-bold text-[#0A1F44]">{label}</p>
              <p className="text-2xl font-extrabold tabular-nums text-emerald-700">
                <AnimatedMetricValue value={value} />
              </p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Percentage breakdown",
    icon: ListChecks,
    body: "For each figure, the dashboard shows what percentage is organization-confirmed, what percentage is submitted but pending approval, and what percentage is flagged or declined. You see the full picture — not just the approved total.",
    render: (
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-[#0A1F44]">Community sessions delivered</p>
          <p className="text-xs font-bold text-slate-500">Record status</p>
        </div>
        <div className="mt-4 flex h-5 overflow-hidden rounded-full bg-slate-200">
          <div className="bg-emerald-600" style={{ width: "78%" }} />
          <div className="bg-[#c88914]" style={{ width: "14%" }} />
          <div className="bg-red-400" style={{ width: "8%" }} />
        </div>
        <div className="mt-4 grid gap-2 text-xs">
          {[
            ["Organization-confirmed", "78%", "bg-emerald-600"],
            ["Submitted, pending approval", "14%", "bg-[#c88914]"],
            ["Flagged or declined", "8%", "bg-red-400"],
          ].map(([label, value, color]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>
              <span className="font-extrabold tabular-nums text-[#0A1F44]">
                <AnimatedMetricValue value={value} />
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Record-level trace",
    icon: ClipboardCheck,
    body: "Click any aggregate figure to see the individual records approved by the organization behind it. Every record shows: volunteer, organization, opportunity, metric logged, amount, approver name, approval date, location confirmed.",
    render: (
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          Records approved by the organization behind this figure
        </div>
        {[
          ["M. Alvarez", "Workforce Pathways", "Training session", "4 sessions", "J. Reed", "Apr 12, 2026"],
          ["T. Chen", "Green Build Lab", "Panels installed", "18 panels", "N. Okafor", "Apr 18, 2026"],
          ["A. Brooks", "Community Skills Hub", "People reached", "86 people", "S. Martin", "Apr 21, 2026"],
        ].map(([volunteer, org, metric, amount, approver, date]) => (
          <div key={`${volunteer}-${metric}`} className="grid gap-1 border-b border-slate-100 px-3 py-2 text-xs last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <span className="font-extrabold tabular-nums text-[#0A1F44]">
                <AnimatedMetricValue value={amount} />
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">Location confirmed</span>
            </div>
            <p className="text-slate-600">{volunteer} · {org} · {metric}</p>
            <p className="text-slate-500">Approved by {approver} on {date}</p>
          </div>
        ))}
      </div>
    ),
  },
];

const corporationCannotDo = [
  "Define the project metrics (organizations define those)",
  "Approve volunteer submissions (organizations approve those)",
  "Edit or override confirmed records",
  "See other corporations' data",
  "See unapproved or declined submissions",
];

const startSteps = [
  {
    title: "Evidence Readiness Assessment",
    body: "We review your current disclosure claims, evidence sources, partner confirmation workflow, and reporting timeline. No software required at this stage.",
  },
  {
    title: "Claim Register Setup",
    body: "Your material disclosure claims are entered into Synerxus with evidence requirements, owners, and deadlines assigned per claim.",
  },
  {
    title: "Evidence Collection and Review",
    body: "Your team attaches source artifacts, records partner confirmations, flags exceptions, and prepares the assurance-preparation export.",
  },
];

function Timeline({ items, accent }: { items: TimelineItem[]; accent: "amber" | "emerald" }) {
  const colorClass = accent === "emerald" ? "bg-emerald-600" : "bg-[#c88914]";

  return (
    <div className="mt-5 space-y-4">
      {items.map((item) => (
        <div key={`${item.day}-${item.text}`} className="grid grid-cols-[84px_1fr] gap-4">
          <div className="pt-0.5 text-xs font-extrabold uppercase tracking-wide text-[#0A1F44]">{item.day}</div>
          <div className="relative border-l border-slate-200 pl-4 text-sm leading-relaxed text-slate-700">
            <span className={`absolute -left-1.5 top-1.5 h-3 w-3 rounded-full ${colorClass}`} />
            {item.text}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ForEsgTeamsPage() {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [activeDashboardElement, setActiveDashboardElement] = useState<number | null>(0);
  const [activeEvidenceCategory, setActiveEvidenceCategory] = useState<number | null>(null);
  const [activeStartStep, setActiveStartStep] = useState<number | null>(null);
  const dashIdx = activeDashboardElement ?? 0;
  const ActiveDashboardIcon = dashboardElements[dashIdx].icon;

  return (
    <MarketingLayout>
      <section className="border-b border-slate-200 bg-white py-7 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-8">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">
              For ESG Teams
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight text-[#0A1F44] sm:text-4xl md:text-5xl">
              Your employees' confirmed contribution records for community programs — traceable to every organization-approved record.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700 sm:mt-6 sm:text-lg">
              Synerxus gives ESG teams a dashboard of organization-approved activity records, with the traceability needed to support community investment and employee engagement reporting.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-lg">
            <img
              src={communityProgramImage}
              alt="Community program team reviewing field records"
              className="h-[220px] w-full object-cover sm:h-[340px] lg:h-[400px]"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-7 sm:py-10">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="rounded-lg border border-[#c88914]/60 bg-[#fff9eb] p-4 shadow-sm sm:p-6">
            <h2 className="text-xl font-extrabold leading-tight text-[#0A1F44] sm:text-2xl">
              How Synerxus is different from self-reported ESG data:
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#0A1F44] sm:space-y-4 sm:text-base">
              <p>
                Most corporate community investment claims are made at the top and supported retroactively. The numbers come from internal estimates or partner narrative reports assembled after the fact.
              </p>
              <p>
                In Synerxus, the number can only appear in your dashboard after it has been logged by your employee against a pre-defined project metric and confirmed by an authorized person at the organization.
              </p>
              <p className="font-extrabold">
                Your ESG claim comes from the top. The evidence came from the bottom. You cannot report a number that has not already been confirmed.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-7 sm:py-10">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 md:px-8 lg:grid-cols-2 lg:gap-6">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-xl font-extrabold leading-tight text-[#0A1F44] sm:text-2xl">The week before your assurance review.</h2>
            <Timeline items={beforeTimeline} accent="amber" />
          </div>
          <div className="rounded-lg border border-emerald-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-xl font-extrabold leading-tight text-[#0A1F44] sm:text-2xl">With Synerxus.</h2>
            <Timeline items={afterTimeline} accent="emerald" />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-7 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-2xl font-extrabold leading-tight text-[#0A1F44] sm:text-3xl">What Synerxus does for ESG teams</h2>
          <div className="mt-5 grid gap-4 sm:mt-6 md:grid-cols-3 md:gap-5">
            {features.map((feature, index) => {
              const isActive = activeFeature === index;
              return (
              <button
                key={feature.title}
                type="button"
                onClick={() => setActiveFeature((prev) => (prev === index ? null : index))}
                aria-pressed={isActive}
                className={`rounded-lg border p-4 text-left shadow-sm transition-all duration-200 sm:p-6 ${
                  isActive
                    ? "border-[#0A1F44] bg-white shadow-lg ring-2 ring-[#c88914]/30"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#0A1F44]/35 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-extrabold text-[#0A1F44]">{feature.title}</h3>
                  <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${isActive ? "rotate-180 text-[#c88914]" : ""}`} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{feature.body}</p>
                {isActive && (
                  <div className="mt-4 rounded-md border border-[#f0dba7] bg-[#fff8e8] p-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#7a520d]">{feature.metric}</p>
                    <p className="mt-2 text-xs leading-relaxed text-[#0A1F44]">{feature.detail}</p>
                  </div>
                )}
              </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-7 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-2xl font-extrabold leading-tight text-[#0A1F44] sm:text-3xl">What the corporate dashboard shows</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            Select a dashboard view to see the supporting records and evidence state behind the ESG figure.
          </p>
          <div className="mt-5 grid gap-4 sm:mt-6 lg:grid-cols-[320px_1fr] lg:gap-6">
            <div className="grid gap-2">
              {dashboardElements.map(({ title, icon: Icon }, index) => {
                const isActive = activeDashboardElement === index;
                return (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setActiveDashboardElement((prev) => (prev === index ? null : index))}
                    aria-pressed={isActive}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200 sm:p-4 ${
                      isActive
                        ? "border-[#0A1F44] bg-[#0A1F44] text-white shadow-lg"
                        : "border-slate-200 bg-white text-[#0A1F44] hover:border-[#c88914]/60 hover:shadow-md"
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${isActive ? "bg-white/15 text-[#ffcc33]" : "bg-slate-100 text-[#0A1F44]"}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-extrabold">{title}</span>
                  </button>
                );
              })}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              {activeDashboardElement !== null ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#0A1F44] text-[#ffcc33]">
                      <ActiveDashboardIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#c88914]">Active dashboard view</p>
                      <h3 className="text-xl font-extrabold text-[#0A1F44]">{dashboardElements[dashIdx].title}</h3>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">{dashboardElements[dashIdx].body}</p>
                  <div className="mt-5 rounded-lg bg-slate-50 p-3">{dashboardElements[dashIdx].render}</div>
                </>
              ) : (
                <p className="py-8 text-center text-sm text-slate-400">Select a view to see the supporting records.</p>
              )}
            </div>
          </div>
          <p className="mx-auto mt-5 max-w-3xl text-center text-sm font-semibold leading-relaxed text-slate-600">
            If your assurance provider asks "what supports this number?" — the answer is one click away.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-7 sm:py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <h2 className="text-2xl font-extrabold leading-tight text-[#0A1F44] sm:text-3xl">What your dashboard does not allow you to do:</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-700">
              The evidence in your dashboard was generated and confirmed independently of your organization. That independence is what makes it defensible.
            </p>
          </div>
          <div className="grid gap-3">
            {corporationCannotDo.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <p className="text-sm font-semibold leading-relaxed text-[#0A1F44]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-7 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-2xl font-extrabold leading-tight text-[#0A1F44] sm:text-3xl">Evidence categories for ESG disclosure</h2>
          <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
            {evidenceCategories.map(({ title, body, detail, tier, icon: Icon }, index) => {
              const isActive = activeEvidenceCategory === index;
              return (
              <button
                key={title}
                type="button"
                onClick={() => setActiveEvidenceCategory((prev) => (prev === index ? null : index))}
                aria-pressed={isActive}
                className={`rounded-lg border p-4 text-left shadow-sm transition-all duration-200 sm:p-5 ${
                  isActive
                    ? "border-[#0A1F44] bg-white shadow-lg ring-2 ring-[#c88914]/30"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#0A1F44]/35 hover:shadow-md"
                }`}
              >
                <Icon className="h-8 w-8 text-[#c88914]" />
                <h3 className="mt-4 text-base font-extrabold text-[#0A1F44]">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
                {isActive && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#c88914]">{tier}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-700">{detail}</p>
                  </div>
                )}
              </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-7 sm:py-10">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="rounded-lg border border-[#c88914]/60 bg-[#fff9eb] p-4 sm:p-6">
            <div className="flex gap-3 sm:gap-4">
              <ShieldAlert className="mt-1 h-8 w-8 shrink-0 text-[#c88914]" />
              <div>
                <h2 className="text-xl font-extrabold text-[#0A1F44]">Limitation statement</h2>
                <p className="mt-3 text-base leading-relaxed text-[#0A1F44]">
                  Organization-confirmed records document that activities occurred as described by volunteers and reviewed by authorized organization staff. They confirm outputs — what was done and delivered. They do not confirm downstream outcomes, establish causal attribution, or constitute formal assurance.
                </p>
                <p className="mt-3 text-base leading-relaxed text-[#0A1F44]">
                  For formal assurance conclusions, a qualified independent assurance provider reviews the evidence package. Synerxus structures that package — it does not replace the assurance engagement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-7 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-2xl font-extrabold leading-tight text-[#0A1F44] sm:text-3xl">How ESG teams get started</h2>
          <div className="mt-5 grid gap-4 sm:mt-6 md:grid-cols-3 md:gap-5">
            {startSteps.map((step, index) => (
              <button
                key={step.title}
                type="button"
                onClick={() => setActiveStartStep((prev) => (prev === index ? null : index))}
                aria-pressed={activeStartStep === index}
                className={`rounded-lg border p-4 text-left shadow-sm transition-all duration-200 sm:p-6 ${
                  activeStartStep === index
                    ? "border-[#0A1F44] bg-white shadow-lg ring-2 ring-[#c88914]/30"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#0A1F44]/35 hover:shadow-md"
                }`}
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold ${
                  activeStartStep === index ? "bg-[#c88914] text-white" : "bg-[#0A1F44] text-white"
                }`}>
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-extrabold text-[#0A1F44]">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{step.body}</p>
                {activeStartStep === index && (
                  <p className="mt-4 rounded-md border border-[#f0dba7] bg-[#fff8e8] px-3 py-2 text-xs font-semibold leading-relaxed text-[#5f3f09]">
                    Current step selected
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-7 sm:py-12">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <Button asChild size="lg" className="w-full bg-[#c88914] text-white hover:bg-[#a9720f] sm:w-auto">
            <Link href="/request-assessment">
              Request Evidence Readiness Assessment <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="mt-5 space-y-1 text-sm leading-relaxed text-slate-600">
            <p>No software deployment required to start.</p>
            <p>Assessment is conducted as a structured conversation, approximately 45 minutes.</p>
            <p className="font-semibold text-[#0A1F44]">
              We will not recommend Synerxus if your current workflow already produces reviewable evidence.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
