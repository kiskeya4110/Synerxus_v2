import { Link } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, Download, FileText, Paperclip, ShieldAlert, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedMetricValue } from "@/components/marketing/animated-metric-value";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const evidenceComponents = [
  {
    n: 1,
    title: "Grant Reports",
    body: "Funder-required completion reports connected to the underlying claim record.",
    icon: FileText,
  },
  {
    n: 2,
    title: "Source Artifacts",
    body: "Attendance logs, invoices, and completion records attached at time of delivery.",
    icon: Paperclip,
  },
  {
    n: 3,
    title: "Partner Confirmation",
    body: "Who confirmed the activity, their role, and the date of confirmation.",
    icon: UserCheck,
  },
  {
    n: 4,
    title: "Exception Log",
    body: "What could not be confirmed and why — visible before the report is submitted.",
    icon: ShieldAlert,
  },
  {
    n: 5,
    title: "Limitation Notes",
    body: "What the evidence does not prove — documented explicitly on every record.",
    icon: ShieldCheck,
  },
  {
    n: 6,
    title: "Assurance-Preparation Export",
    body: "A structured package for funders that require formal review of supporting evidence.",
    icon: Download,
  },
] as const;

const todayProblems = [
  "Activity completed, funder notified",
  "Completion report submitted internally",
  "No source artifacts attached to specific claims",
  "Funder asks for evidence, team reconstructs records after the fact",
  "No record of who confirmed what or when",
];

const synerxusProduces = [
  "Each funded activity connected to a claim record",
  "Source artifacts attached at time of delivery",
  "Partner confirmation recorded with name, role, and date",
  "Exception flags visible before the report is submitted",
  "Assurance-preparation export available if funder requires formal review",
];

export default function UseCaseGrantFunderPage() {
  return (
    <MarketingLayout>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-7 md:py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <Link
            href="/use-cases"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-[#0A1F44]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Use Cases
          </Link>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.55fr] lg:items-start lg:gap-10">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">
                Use Case 5
              </p>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight text-[#0A1F44] sm:text-4xl md:text-5xl">
                Grant / Funder Reporting
              </h1>
              <div className="mt-4 h-1 w-24 bg-[#c88914]" />
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700 sm:mt-6 sm:text-lg">
                Funders require evidence that grant-funded activities were delivered as reported. Synerxus structures each claim with source artifacts, partner confirmation, and exception logs — so completion statements are backed by reviewable documentation before the report is submitted.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row">
                <Button asChild className="w-full bg-[#c88914] text-white hover:bg-[#a9720f] sm:w-auto">
                  <Link href="/request-assessment">
                    Request Readiness Assessment <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full border-[#0A1F44] text-[#0A1F44] sm:w-auto">
                  <Link href="/use-cases">Back to Use Cases</Link>
                </Button>
              </div>
            </div>

            {/* ── Claim record card ──────────────────────────────────────── */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xl sm:p-5 sm:shadow-2xl">
              <div className="rounded-md border border-slate-200 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Claim</p>
                    <h2 className="mt-1 text-sm font-extrabold leading-snug text-[#0A1F44]">
                      Grant-funded workforce training activities were completed as reported during Q2 2026.
                    </h2>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    In review
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: "Claimed participants", value: "48" },
                    { label: "Confirmed participants", value: "41" },
                    { label: "Confidence", value: "High" },
                    { label: "Evidence packets", value: "6" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-md border border-slate-200 p-3">
                      <p className="text-[10px] font-bold text-slate-500">{label}</p>
                      <p className="mt-1 text-xl font-extrabold tabular-nums text-[#0A1F44]">
                        <AnimatedMetricValue value={value} />
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-md bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-extrabold text-[#0A1F44]">Evidence coverage</p>
                    <p className="text-xs font-bold tabular-nums text-emerald-700">
                      <AnimatedMetricValue value="85%" />
                    </p>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-3 w-[85%] rounded-full bg-emerald-600" />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-slate-500">
                    Supported 85% · Partial 10% · Unverified 5%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: The problem this solves ───────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-7 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-2xl font-extrabold text-[#0A1F44]">The problem this solves</h2>
          <div className="mt-5 grid gap-4 sm:mt-6 md:grid-cols-2 md:gap-6">
            {/* Left — today */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 sm:p-6">
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-red-700">
                What grant reporting looks like today
              </p>
              <ul className="mt-5 space-y-3">
                {todayProblems.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — Synerxus */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:p-6">
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-emerald-700">
                What Synerxus produces
              </p>
              <ul className="mt-5 space-y-3">
                {synerxusProduces.map((item) => (
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

      {/* ── Section 3: Evidence package components ───────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-7 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-2xl font-extrabold text-[#0A1F44]">Evidence package components</h2>
          <p className="mt-2 text-sm text-slate-500">
            Six components make up a complete grant evidence packet.
          </p>
          <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {evidenceComponents.map(({ n, title, body, icon: Icon }) => (
              <div
                key={title}
                className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:gap-4 sm:p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#0A1F44]/15 bg-[#f0f3f8]">
                  <Icon className="h-5 w-5 text-[#0A1F44]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#c88914]">
                    Component {n}
                  </p>
                  <h3 className="mt-0.5 text-sm font-extrabold text-[#0A1F44]">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Limitation / Caution ─────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-7 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex gap-3 rounded-lg border border-[#c88914]/50 bg-[#fff9eb] p-4 sm:gap-5 sm:p-6">
            <ShieldAlert className="h-10 w-10 shrink-0 text-[#c88914]" />
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">
                Limitation / Caution
              </p>
              <p className="mt-3 text-base leading-relaxed text-[#0A1F44]">
                Completion evidence documents that activities occurred and were confirmed. It does not establish causal attribution or long-term outcome unless a separate outcome evaluation is performed. Synerxus does not provide assurance opinions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Relevance to innovation ecosystems ────────────────── */}
      <section className="border-b border-slate-200 bg-white py-7 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.4fr_1fr] lg:items-start">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">
                Broader context
              </p>
              <h2 className="mt-3 text-2xl font-extrabold text-[#0A1F44]">
                Relevance to innovation ecosystems
              </h2>
            </div>
            <p className="text-base leading-relaxed text-slate-700">
              Urban innovation programs and city-level initiatives often require funders, corporate partners, and municipal governments to review evidence of what participating organizations delivered. Synerxus gives program teams a structured way to connect each innovator's activities to reviewable evidence — without adding reporting burden to the innovators themselves.
            </p>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="bg-[#061A36] py-7 text-white sm:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-5 md:grid-cols-[1fr_auto_auto] md:items-center">
            <div>
              <p className="text-sm font-extrabold uppercase text-[#ffcc33]">
                Ready to structure your grant evidence?
              </p>
              <h2 className="mt-3 text-2xl font-extrabold leading-tight text-white">
                Get a clear view of your evidence maturity before your next funder review.
              </h2>
            </div>
            <Button asChild variant="outline" className="w-full border-white/60 bg-white/10 text-white hover:bg-white hover:text-[#061A36] sm:w-auto">
              <Link href="/use-cases">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Use Cases
              </Link>
            </Button>
            <Button asChild className="w-full bg-[#c88914] text-white hover:bg-[#a9720f] sm:w-auto">
              <Link href="/request-assessment">
                Request Readiness Assessment <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
