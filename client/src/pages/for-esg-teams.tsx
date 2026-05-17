import { ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, FileText, FolderOpen, ListChecks, ShieldAlert, ShieldCheck, Users, XCircle, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

type TimelineItem = {
  day: string;
  text: string;
};

type Feature = {
  title: string;
  body: string;
};

type EvidenceCategory = {
  title: string;
  body: string;
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
  },
  {
    title: "Manage evidence across partners.",
    body: "Corporate ESG reports typically draw from multiple NGO partners, community programs, and supplier submissions. Synerxus tracks confirmation status and source support per partner, not just per claim.",
  },
  {
    title: "Export for assurance preparation.",
    body: "The assurance-preparation export packages evidence index, confirmation metadata, exception log, and limitation notes in a format structured for assurance provider review. Synerxus does not perform assurance; it prepares the evidence trail.",
  },
];

const evidenceCategories: EvidenceCategory[] = [
  {
    title: "Self-Reported Records",
    body: "Internal tracking data, spreadsheets, and program management records submitted by your own team. Useful as a starting point; not sufficient alone for assurance review.",
    icon: FileText,
  },
  {
    title: "Partner-Confirmed Records",
    body: "Confirmation from the NGOs, community organizations, or suppliers who delivered the program. Stronger than self-reported but requires source artifact attachment to reach review-ready status.",
    icon: Users,
  },
  {
    title: "Source-Supported Records",
    body: "Claims backed by primary source documents: attendance logs, invoices, partner reports, inspection records. The strongest evidence category for assurance preparation.",
    icon: FolderOpen,
  },
  {
    title: "Partner-Reported Figures",
    body: "Reach and outcome figures reported by implementing partners. Useful for reporting context; not independently verified by Synerxus unless explicitly noted.",
    icon: ClipboardCheck,
  },
  {
    title: "Mapped Records",
    body: "Claims mapped to GRI, ESRS, CSRD-related context, or SDGs. Mapping is a classification layer; it does not strengthen the evidence behind the claim.",
    icon: ShieldCheck,
  },
];

const dashboardElements = [
  {
    title: "Aggregate confirmed figures",
    icon: BarChart3,
    body: "Total confirmed volunteer hours, total confirmed people reached, total confirmed direct items — broken down by project metric type. Every figure reflects approved records only.",
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
              <p className="text-2xl font-extrabold tabular-nums text-emerald-700">{value}</p>
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
              <span className="font-extrabold text-[#0A1F44]">{value}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Record-level trace",
    icon: ClipboardCheck,
    body: "Click any aggregate figure to see the individual approved records behind it. Every record shows: volunteer, organization, opportunity, metric logged, amount, approver name, approval date, location confirmed.",
    render: (
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          Approved records behind this figure
        </div>
        {[
          ["M. Alvarez", "Workforce Pathways", "Training session", "4 sessions", "J. Reed", "Apr 12, 2026"],
          ["T. Chen", "Green Build Lab", "Panels installed", "18 panels", "N. Okafor", "Apr 18, 2026"],
          ["A. Brooks", "Community Skills Hub", "People reached", "86 people", "S. Martin", "Apr 21, 2026"],
        ].map(([volunteer, org, metric, amount, approver, date]) => (
          <div key={`${volunteer}-${metric}`} className="grid gap-1 border-b border-slate-100 px-3 py-2 text-xs last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <span className="font-extrabold text-[#0A1F44]">{amount}</span>
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
  return (
    <MarketingLayout>
      <section className="border-b border-slate-200 bg-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">
            For ESG Teams
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight text-[#0A1F44] md:text-6xl">
            Your employees' confirmed contributions to community programs — traceable to every approved record.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-700">
            Synerxus gives ESG teams a dashboard of organization-approved activity records, with the traceability needed to support community investment and employee engagement reporting.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="rounded-lg border border-[#c88914]/60 bg-[#fff9eb] p-6 shadow-sm">
            <h2 className="text-2xl font-extrabold text-[#0A1F44]">
              How Synerxus is different from self-reported ESG data:
            </h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-[#0A1F44]">
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

      <section className="border-b border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-extrabold text-[#0A1F44]">The week before your assurance review.</h2>
            <Timeline items={beforeTimeline} accent="amber" />
          </div>
          <div className="rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-extrabold text-[#0A1F44]">With Synerxus.</h2>
            <Timeline items={afterTimeline} accent="emerald" />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-3xl font-extrabold text-[#0A1F44]">What Synerxus does for ESG teams</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-extrabold text-[#0A1F44]">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-3xl font-extrabold text-[#0A1F44]">What the corporate dashboard shows</h2>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {dashboardElements.map(({ title, body, icon: Icon, render }) => (
              <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#0A1F44] text-[#ffcc33]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-extrabold text-[#0A1F44]">{title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{body}</p>
                <div className="mt-5 rounded-lg bg-slate-50 p-3">{render}</div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-5 max-w-3xl text-center text-sm font-semibold leading-relaxed text-slate-600">
            If your assurance provider asks "what supports this number?" — the answer is one click away.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-extrabold text-[#0A1F44]">What your dashboard does not allow you to do:</h2>
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

      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-3xl font-extrabold text-[#0A1F44]">Evidence categories for ESG disclosure</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {evidenceCategories.map(({ title, body, icon: Icon }) => (
              <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <Icon className="h-8 w-8 text-[#c88914]" />
                <h3 className="mt-4 text-base font-extrabold text-[#0A1F44]">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="rounded-lg border border-[#c88914]/60 bg-[#fff9eb] p-6">
            <div className="flex gap-4">
              <ShieldAlert className="mt-1 h-8 w-8 shrink-0 text-[#c88914]" />
              <div>
                <h2 className="text-xl font-extrabold text-[#0A1F44]">Limitation statement</h2>
                <p className="mt-3 text-base leading-relaxed text-[#0A1F44]">
                  Organization-confirmed records document that activities occurred as described by volunteers and verified by authorized organization staff. They confirm outputs — what was done and delivered. They do not confirm downstream outcomes, prove causal impact, or constitute formal assurance.
                </p>
                <p className="mt-3 text-base leading-relaxed text-[#0A1F44]">
                  For formal assurance conclusions, a qualified independent assurance provider reviews the evidence package. Synerxus structures that package — it does not replace the assurance engagement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-3xl font-extrabold text-[#0A1F44]">How ESG teams get started</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {startSteps.map((step, index) => (
              <div key={step.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0A1F44] text-sm font-extrabold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-extrabold text-[#0A1F44]">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <Button asChild size="lg" className="bg-[#c88914] text-white hover:bg-[#a9720f]">
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
