import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, CheckCircle2, Download, FileText, FolderOpen, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { ClaimRecordCard } from "@/components/marketing/claim-record-card";

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
    copy: "Track partner confirmation, confidence tier, source-support status, exception flags, and evidence gaps without treating every record as equal.",
    bullets: ["Partner confirmation", "Exception log", "Evidence gap tracking", "Confidence tiers"],
    bulletDetails: {
      "Confidence tiers": "Confidence tiers reflect evidence completeness, source support, and confirmation status. They are not assurance opinions.",
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
  { id: "Partner A confirmation", status: "Confirmed", confidence: "High", alignment: "Aligned" },
  { id: "Partner B confirmation", status: "Confirmed", confidence: "Medium", alignment: "Aligned" },
  { id: "Partner C confirmation", status: "Pending", confidence: "Low", alignment: "Review needed" },
  { id: "Partner D submission", status: "Confirmed", confidence: "High", alignment: "Aligned" },
] as const;

function PreviewPanel({ type }: { type: string }) {
  if (type === "quality") {
    return (
      <div className="grid gap-3 lg:grid-cols-[1fr_160px]">
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-extrabold text-[#0A1F44]">Partner confirmation table</p>
          <div className="min-w-[520px]">
            <div className="mt-3 grid grid-cols-4 gap-2 border-b border-slate-100 pb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
              <span>Record</span>
              <span>Status</span>
              <span>Confidence</span>
              <span>Alignment</span>
            </div>
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
                  <span className={`font-bold ${isPending ? "text-amber-600" : "text-emerald-700"}`}>
                    {row.alignment}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 rounded-md bg-[#fff9eb] px-3 py-2 text-[11px] leading-relaxed text-[#0A1F44]">
            Confidence tiers reflect evidence completeness, source support, and confirmation status. They are not assurance opinions.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-extrabold text-[#0A1F44]">Exceptions</p>
          <p className="mt-4 text-4xl font-extrabold text-[#0A1F44]">3</p>
          <p className="mt-2 text-xs text-slate-500">Visible before report output.</p>
          <p className="mt-2 text-xs text-slate-500">
            Exceptions are visible before report output. They are included in the record with flags — they are not removed or hidden.
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
            ["GRI 413", "Local communities"],
            ["SDG 8", "Decent work and economic growth"],
            ["Internal", "Workforce development"],
          ].map(([n, label]) => (
            <div key={n} className="mt-3 flex items-center gap-3 text-xs font-semibold text-slate-700">
              <span className="flex h-8 w-8 items-center justify-center rounded bg-[#c88914] font-extrabold text-white">
                {n}
              </span>
              {label}
            </div>
          ))}
          <p className="mt-3 border-t border-slate-100 pt-2 text-[10px] italic text-slate-400">
            SDG mapping is a classification layer. It does not certify SDG contribution or establish impact.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-extrabold text-[#0A1F44]">Report summary</p>
          <div className="mt-4 h-28 rounded-full border-[18px] border-[#c88914] border-r-slate-200 border-t-emerald-600" />
          <div className="mt-3 space-y-1.5">
            {[
              { label: "Confirmed evidence total", color: "bg-emerald-600", pct: "76%" },
              { label: "Partner-reported", color: "bg-[#c88914]", pct: "14%" },
              { label: "Unsupported or incomplete", color: "bg-slate-300", pct: "10%" },
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
          <Button asChild className="w-full bg-[#0A1F44] text-white hover:bg-[#102b5a] sm:w-auto">
            <Link href="/assessment">
              <Download className="mr-2 h-4 w-4" /> Prepare review package
            </Link>
          </Button>
          <p className="mt-2 text-xs text-slate-600">
            Includes evidence index, mappings, exceptions, and limitations. Where applicable, exports support assurance-preparation workflows but do not represent formal assurance.
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

  const area = areas[activeArea];
  const Icon = area.icon;

  return (
    <MarketingLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-7 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">Platform</p>
            <h1 className="mt-3 max-w-xl font-serif text-3xl font-bold leading-tight text-[#0A1F44] sm:text-5xl md:text-6xl">
              The Synerxus Platform
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#0A1F44] sm:mt-6 sm:text-lg">
              Synerxus helps teams connect reportable claims and records to evidence, confirmation, mapping context, status, exceptions, and limitations so each supported statement is easier to explain and review.
            </p>
          </div>

          <div className="shadow-lg sm:shadow-2xl">
            <ClaimRecordCard
              claim="Our employee volunteer program supported community workforce development activities across 8 partner organizations in 2025."
              status="In Review"
              metrics={[
                { label: "Claimed participants", value: "312" },
                { label: "Confirmed participants", value: "287" },
                { label: "Confidence", value: "High" },
                { label: "Evidence packets", value: "8" },
              ]}
              evidenceCoverage={76}
              supportSummary="Source-supported 76% · Partial 14% · Incomplete 10%"
              animateMetrics
            />
            <p className="mt-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-600">
              Confidence reflects evidence completeness, confirmation status, and source-support coverage. It is not an assurance opinion.
            </p>
          </div>
        </div>
      </section>

      {/* ── Steps ────────────────────────────────────────────────────────── */}
      <section id="platform-steps" className="bg-white py-6 sm:py-9">
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
                  aria-pressed={isActive}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c88914] focus-visible:ring-offset-2 sm:rounded-xl sm:p-4 ${
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

          <article className="grid gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:grid-cols-[0.48fr_0.52fr] lg:items-center">
            <div className="grid gap-4 sm:grid-cols-[80px_1fr]">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#061A36] text-3xl font-extrabold text-white">
                {activeArea + 1}
              </span>
              <div>
                <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <Icon className="h-9 w-9 text-[#0A1F44]" />
                  </span>
                  <h2 className="text-xl font-extrabold leading-tight text-[#0A1F44] sm:text-2xl">{area.title}</h2>
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
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                  <Link
                    href="/assessment"
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
            <div className="rounded-lg bg-slate-50 p-3 sm:p-4">
              <PreviewPanel type={area.panel} />
            </div>
          </article>
        </div>
      </section>

      {/* ── Platform Boundaries ──────────────────────────────────────────── */}
      <section className="bg-white pb-6 sm:pb-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex gap-3 rounded-lg border border-[#c88914]/60 bg-[#fff9eb] p-4 sm:gap-5 sm:p-6">
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
      <section className="bg-[#061A36] py-7 text-white sm:py-10">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-8">
          <Button asChild size="lg" className="w-full bg-[#c88914] text-white hover:bg-[#a9720f] active:bg-[#8a5f0a] sm:w-auto">
            <Link href="/assessment">
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
