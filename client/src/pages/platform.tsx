import { useState, useRef } from "react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, CheckCircle2, Download, FileText, FolderOpen, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

type Area = {
  title: string;
  icon: LucideIcon;
  copy: string;
  bullets: string[];
  bulletDetails: Record<string, string>;
  panel: string;
  contextLink?: { label: string; href: string };
};

const areas: Area[] = [
  {
    title: "Claim-to-Evidence Workspace",
    icon: FolderOpen,
    copy: "Define the claim, attach activity records, connect source artifacts, and preserve the evidence trail behind every reportable statement.",
    bullets: ["Claim register", "Evidence packets", "Source artifacts", "Record metadata"],
    bulletDetails: {},
    panel: "evidence",
    contextLink: { label: "Corporate ESG / CSR Reporting", href: "/use-cases" },
  },
  {
    title: "Confirmation and Evidence Quality",
    icon: Users,
    copy: "Track partner confirmation, confirmation status, confidence tier, source-support status, exception flags, and evidence gap tracking without treating every record as equal.",
    bullets: ["Partner confirmation", "Evidence gap tracking", "Exception log", "Confidence tiers"],
    bulletDetails: {
      "Confidence tiers": "High: partner-confirmed with source support. Medium: confirmed without full source support. Low: pending or unconfirmed.",
    },
    panel: "quality",
    contextLink: { label: "Grant / Funder Reporting", href: "/use-cases/grant-funder-reporting" },
  },
  {
    title: "Mapping and Reporting Support",
    icon: BarChart3,
    copy: "Map records to SDGs, frameworks, or internal categories while keeping partner-reported figures and derived mappings separate from confirmed evidence totals.",
    bullets: ["SDG mapping", "Framework mapping", "Report summaries", "Assurance-preparation export"],
    bulletDetails: {},
    panel: "mapping",
    contextLink: { label: "SDG-Aligned Activity Mapping", href: "/use-cases" },
  },
];

const qualityRows = [
  { id: "Partner A confirmation", status: "Confirmed", confidence: "High" },
  { id: "Partner B confirmation", status: "Confirmed", confidence: "Medium" },
  { id: "Partner C confirmation", status: "Pending", confidence: "High" },
  { id: "Partner D submission", status: "Confirmed", confidence: "High" },
] as const;

function PreviewPanel({ type }: { type: string }) {
  if (type === "quality") {
    return (
      <div className="grid gap-3 lg:grid-cols-[1fr_160px]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-extrabold text-[#0A1F44]">Confirmation & Quality</p>
          {qualityRows.map((row) => {
            const isPending = row.status === "Pending";
            return (
              <div
                key={row.id}
                className={`mt-2 grid grid-cols-4 gap-2 rounded px-2 py-1.5 text-[11px] ${
                  isPending ? "bg-slate-100 text-slate-400" : "text-slate-600"
                }`}
              >
                <span className="truncate">{row.id}</span>
                <span className={isPending ? "font-semibold text-amber-500" : "font-semibold text-emerald-700"}>
                  {row.status}
                </span>
                <span>{row.confidence}</span>
                <span className={`font-bold ${isPending ? "text-slate-400" : "text-emerald-700"}`}>
                  {isPending ? "—" : "Aligned"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-extrabold text-[#0A1F44]">Exceptions</p>
          <p className="mt-4 text-4xl font-extrabold text-[#0A1F44]">3</p>
          <p className="mt-2 text-xs text-slate-500">Visible before report output.</p>
          <p className="mt-2 text-xs text-slate-500">
            Exceptions are included in the output with flags — they are not removed or hidden.
          </p>
        </div>
      </div>
    );
  }

  if (type === "mapping") {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-extrabold text-[#0A1F44]">Mapping overview</p>
          {[
            ["7", "Affordable and Clean Energy"],
            ["13", "Climate Action"],
            ["12", "Responsible Consumption"],
          ].map(([n, label]) => (
            <div key={n} className="mt-3 flex items-center gap-3 text-xs font-semibold text-slate-700">
              <span className="flex h-8 w-8 items-center justify-center rounded bg-[#c88914] font-extrabold text-white">
                {n}
              </span>
              {label}
            </div>
          ))}
          <p className="mt-3 border-t border-slate-100 pt-2 text-[10px] italic text-slate-400">
            SDG mapping is a classification layer. It does not certify SDG contribution or prove impact.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-extrabold text-[#0A1F44]">Report summary</p>
          <div className="mt-4 h-28 rounded-full border-[18px] border-[#c88914] border-r-slate-200 border-t-emerald-600" />
          <div className="mt-3 space-y-1.5">
            {[
              { label: "Confirmed evidence", color: "bg-emerald-600", pct: "76%" },
              { label: "Partner-reported", color: "bg-[#c88914]", pct: "14%" },
              { label: "Unverified", color: "bg-slate-300", pct: "10%" },
            ].map(({ label, color, pct }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  <span className="text-slate-600">{label}</span>
                </div>
                <span className="font-bold text-slate-700">{pct}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 lg:col-span-2">
          <Button asChild className="bg-[#0A1F44] text-white hover:bg-[#102b5a]">
            <Link href="/request-assessment">
              <Download className="mr-2 h-4 w-4" /> Export assurance-preparation package
            </Link>
          </Button>
          <p className="mt-2 text-xs text-slate-600">
            Includes evidence index, mappings, exceptions, and limitations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[190px_1fr_150px]">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <p className="text-xs font-extrabold text-[#0A1F44]">Evidence packet</p>
        {["Activity record", "Meter reading", "Invoice", "Calculation sheet", "Photo evidence"].map((item) => (
          <div
            key={item}
            className="mt-2 flex items-center justify-between rounded bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-[#0A1F44]"
          >
            <span>{item}</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center rounded-md border border-slate-200 bg-white p-4">
        <FileText className="h-24 w-24 text-slate-300" />
      </div>
      <div className="grid gap-2">
        {["Source document", "Spreadsheet", "Image", "Other file"].map((item) => (
          <div key={item} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-[#0A1F44]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlatformPage() {
  const [activeArea, setActiveArea] = useState(0);
  const stepsRef = useRef<HTMLElement>(null);

  function navigateToStep(index: number) {
    setActiveArea(index);
    stepsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const area = areas[activeArea];
  const Icon = area.icon;

  return (
    <MarketingLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-10 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">Platform</p>
            <h1 className="mt-4 max-w-xl font-serif text-5xl font-bold leading-tight text-[#0A1F44] md:text-6xl">
              The Synerxus Platform
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#0A1F44]">
              Synerxus helps teams connect claims to evidence, confirmation, mapping context, status, exceptions, and limitations so every reported number is explainable and reviewable.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="rounded-md border border-slate-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500">Claim</p>
                  <h2 className="mt-1 text-lg font-extrabold text-[#0A1F44]">
                    Our employee volunteer program contributed to community workforce development programs across 8 partner organizations in 2025.
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  In review
                </span>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-3">
                {[
                  { label: "Claimed participants", value: "312" },
                  { label: "Confirmed participants", value: "287" },
                  { label: "Confidence", value: "High" },
                  { label: "Evidence packets", value: "8" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-md border border-slate-200 p-3">
                    <p className="text-[10px] font-bold text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-extrabold tabular-nums text-[#0A1F44]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-md bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-[#0A1F44]">Evidence coverage</p>
                  <p className="text-xs font-bold tabular-nums text-emerald-700">76%</p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-3 w-[76%] rounded-full bg-emerald-600" />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-500">
                  Supported 76% · Partial 14% · Unverified 10%
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Jump-link nav ────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 md:px-8">
          {areas.map((a, i) => (
            <button
              key={a.title}
              type="button"
              onClick={() => navigateToStep(i)}
              className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeArea === i
                  ? "border-[#c88914] text-[#0A1F44]"
                  : "border-transparent text-slate-500 hover:text-[#0A1F44]"
              }`}
            >
              <span className="font-extrabold text-[#c88914]">Step {i + 1}: </span>
              {a.title}
            </button>
          ))}
        </div>
      </div>

      {/* ── Steps ────────────────────────────────────────────────────────── */}
      <section ref={stepsRef} id="platform-steps" className="bg-white py-9">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {areas.map((a, i) => {
              const AIcon = a.icon;
              const isActive = i === activeArea;
              return (
                <button
                  key={a.title}
                  type="button"
                  onClick={() => setActiveArea(i)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                    isActive
                      ? "border-[#0A1F44] bg-[#0A1F44] shadow-md"
                      : "border-slate-200 bg-white hover:border-[#0A1F44]/40 hover:shadow-sm"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                      isActive ? "bg-white/20" : "bg-slate-100"
                    }`}
                  >
                    <AIcon
                      className={`h-5 w-5 transition-colors ${isActive ? "text-white" : "text-[#0A1F44]"}`}
                    />
                  </span>
                  <div>
                    <p
                      className={`text-[11px] font-extrabold uppercase tracking-wide transition-colors ${
                        isActive ? "text-[#c88914]" : "text-slate-400"
                      }`}
                    >
                      Step {i + 1}
                    </p>
                    <p
                      className={`text-sm font-extrabold leading-tight transition-colors ${
                        isActive ? "text-white" : "text-[#0A1F44]"
                      }`}
                    >
                      {a.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <article className="grid gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.48fr_0.52fr] lg:items-center">
            <div className="grid gap-4 sm:grid-cols-[80px_1fr]">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#061A36] text-3xl font-extrabold text-white">
                {activeArea + 1}
              </span>
              <div>
                <div className="flex items-center gap-4">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <Icon className="h-9 w-9 text-[#0A1F44]" />
                  </span>
                  <h2 className="text-2xl font-extrabold text-[#0A1F44]">{area.title}</h2>
                </div>
                <p className="mt-4 text-base leading-relaxed text-slate-700">{area.copy}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {area.bullets.map((bullet) => (
                    <div key={bullet}>
                      <p className="flex items-center gap-2 text-sm font-semibold text-[#0A1F44]">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#c88914]" />
                        {bullet}
                      </p>
                      {bullet in area.bulletDetails && (
                        <p className="mt-1 pl-6 text-xs leading-relaxed text-slate-500">
                          {area.bulletDetails[bullet]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-4">
                  <Link
                    href="/request-assessment"
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#c88914] transition-colors hover:text-[#a9720f]"
                  >
                    Get started <ArrowRight className="h-4 w-4" />
                  </Link>
                  {area.contextLink && (
                    <Link
                      href={area.contextLink.href}
                      className="inline-flex items-center gap-2 text-sm font-bold text-[#0A1F44] transition-colors hover:text-[#c88914]"
                    >
                      See this in context → {area.contextLink.label}
                    </Link>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <PreviewPanel type={area.panel} />
            </div>
          </article>
        </div>
      </section>

      {/* ── Platform Boundaries ──────────────────────────────────────────── */}
      <section className="bg-white pb-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex gap-5 rounded-lg border border-[#c88914]/60 bg-[#fff9eb] p-6">
            <ShieldCheck className="h-12 w-12 shrink-0 text-[#c88914]" />
            <div>
              <h2 className="text-xl font-extrabold text-[#0A1F44]">Platform Boundaries</h2>
              <p className="mt-2 text-base leading-relaxed text-[#0A1F44]">
                Synerxus supports evidence organization, reporting preparation, and assurance preparation. Synerxus does not provide formal assurance, legal advice, compliance guarantees, SDG impact certification, or causal attribution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="bg-[#061A36] py-10 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-8">
          <Button asChild size="lg" className="bg-[#c88914] text-white hover:bg-[#a9720f] active:bg-[#8a5f0a]">
            <Link href="/request-assessment">
              Request Readiness Assessment <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="mt-4">
            <Link
              href="/evidence-ladder"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 transition-colors hover:text-white"
            >
              See the Evidence Ladder <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
