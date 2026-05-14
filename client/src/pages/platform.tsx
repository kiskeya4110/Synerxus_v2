import { Link } from "wouter";
import { BarChart3, CheckCircle2, ClipboardCheck, Download, FileText, FolderOpen, ListChecks, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const areas = [
  {
    title: "Claim-to-Evidence Workspace",
    icon: FolderOpen,
    copy: "Define the claim, attach activity records, connect source artifacts, and preserve the evidence trail behind every reportable statement.",
    bullets: ["Claim register", "Evidence packets", "Source artifacts", "Record metadata"],
    panel: "evidence",
  },
  {
    title: "Confirmation and Evidence Quality",
    icon: Users,
    copy: "Track partner confirmation, confirmation status, confidence tier, source-support status, exception flags, and status reconciliation without treating every record as equal.",
    bullets: ["Partner confirmation", "Status reconciliation", "Exception log", "Confidence tiers"],
    panel: "quality",
  },
  {
    title: "Mapping and Reporting Support",
    icon: BarChart3,
    copy: "Map records to SDGs, frameworks, or internal categories while keeping partner-reported figures and derived mappings separate from confirmed evidence totals.",
    bullets: ["SDG mapping", "Framework mapping", "Report summaries", "Assurance-preparation export"],
    panel: "mapping",
  },
];

function PreviewPanel({ type }: { type: string }) {
  if (type === "quality") {
    return (
      <div className="grid gap-3 lg:grid-cols-[1fr_160px]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-extrabold text-[#0A1F44]">Confirmation & Quality</p>
          {["AR-2024-0198", "MR-2024-7721", "INV-88455.pdf", "CALC-v2.xlsx"].map((row, index) => (
            <div key={row} className="mt-3 grid grid-cols-4 gap-2 text-[11px] text-slate-600">
              <span>{row}</span><span>{index === 2 ? "Pending" : "Confirmed"}</span><span>{index === 1 ? "Medium" : "High"}</span><span className="font-bold text-emerald-700">Aligned</span>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-extrabold text-[#0A1F44]">Exceptions</p>
          <p className="mt-4 text-4xl font-extrabold text-[#0A1F44]">3</p>
          <p className="mt-2 text-xs text-slate-500">Visible before report output.</p>
        </div>
      </div>
    );
  }

  if (type === "mapping") {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-extrabold text-[#0A1F44]">Mapping overview</p>
          {[["7", "Affordable and Clean Energy"], ["13", "Climate Action"], ["12", "Responsible Consumption"]].map(([n, label]) => (
            <div key={n} className="mt-3 flex items-center gap-3 text-xs font-semibold text-slate-700"><span className="flex h-8 w-8 items-center justify-center rounded bg-[#c88914] font-extrabold text-white">{n}</span>{label}</div>
          ))}
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-extrabold text-[#0A1F44]">Report summary</p>
          <div className="mt-4 h-28 rounded-full border-[18px] border-[#c88914] border-r-[#0A1F44] border-t-emerald-600" />
          <p className="mt-3 text-xs text-slate-600">Partner-reported figures remain separate from confirmed evidence totals.</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 lg:col-span-2">
          <p className="flex items-center gap-2 text-sm font-extrabold text-[#0A1F44]"><Download className="h-4 w-4" /> Export assurance-preparation package</p>
          <p className="mt-1 text-xs text-slate-600">Includes evidence index, mappings, exceptions, and limitations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[190px_1fr_150px]">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <p className="text-xs font-extrabold text-[#0A1F44]">Evidence packet</p>
        {["Activity record", "Meter reading", "Invoice", "Calculation sheet", "Photo evidence"].map((item) => (
          <div key={item} className="mt-2 flex items-center justify-between rounded bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-[#0A1F44]"><span>{item}</span><CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /></div>
        ))}
      </div>
      <div className="flex items-center justify-center rounded-md border border-slate-200 bg-white p-4">
        <FileText className="h-24 w-24 text-slate-300" />
      </div>
      <div className="grid gap-2">
        {["Source document", "Spreadsheet", "Image", "Other file"].map((item) => <div key={item} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-[#0A1F44]">{item}</div>)}
      </div>
    </div>
  );
}

export default function PlatformPage() {
  return (
    <MarketingLayout>
      <section className="border-b border-slate-200 bg-white py-10 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">Platform</p>
            <h1 className="mt-4 max-w-xl font-serif text-5xl font-bold leading-tight text-[#0A1F44] md:text-6xl">The Synerxus Platform</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#0A1F44]">
              Synerxus helps teams connect claims to evidence, confirmation, mapping context, status, exceptions, and limitations so every reported number is explainable and reviewable.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="rounded-md border border-slate-200 p-5">
              <div className="flex items-start justify-between"><div><p className="text-xs font-bold text-slate-500">Claim</p><h2 className="mt-1 text-lg font-extrabold text-[#0A1F44]">Total emissions reduced (tCO2e)</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">In review</span></div>
              <div className="mt-5 grid grid-cols-4 gap-3">{[["Reported", "12,450"], ["Confirmed", "10,890"], ["Confidence", "High"], ["Evidence packets", "8"]].map(([label, value]) => <div key={label} className="rounded-md border border-slate-200 p-3"><p className="text-[10px] font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold text-[#0A1F44]">{value}</p></div>)}</div>
              <div className="mt-5 rounded-md bg-slate-50 p-4"><p className="text-xs font-extrabold text-[#0A1F44]">Evidence quality overview</p><div className="mt-3 h-3 rounded-full bg-gradient-to-r from-emerald-600 via-[#c88914] to-red-600" /></div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-9">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 md:px-8">
          {areas.map((area, index) => {
            const Icon = area.icon;
            return (
              <article key={area.title} className="grid gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.48fr_0.52fr] lg:items-center">
                <div className="grid gap-4 sm:grid-cols-[80px_1fr]">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#061A36] text-3xl font-extrabold text-white">{index + 1}</span>
                  <div>
                    <div className="flex items-center gap-4"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"><Icon className="h-9 w-9 text-[#0A1F44]" /></span><h2 className="text-2xl font-extrabold text-[#0A1F44]">{area.title}</h2></div>
                    <p className="mt-4 text-base leading-relaxed text-slate-700">{area.copy}</p>
                    <div className="mt-5 grid gap-2 sm:grid-cols-2">{area.bullets.map((bullet) => <p key={bullet} className="flex items-center gap-2 text-sm font-semibold text-[#0A1F44]"><CheckCircle2 className="h-4 w-4 text-[#c88914]" />{bullet}</p>)}</div>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-4"><PreviewPanel type={area.panel} /></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white pb-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex gap-5 rounded-lg border border-[#c88914]/60 bg-[#fff9eb] p-6">
            <ShieldCheck className="h-12 w-12 shrink-0 text-[#c88914]" />
            <div><h2 className="text-xl font-extrabold text-[#0A1F44]">Platform Boundaries</h2><p className="mt-2 text-base leading-relaxed text-[#0A1F44]">Synerxus supports evidence organization, reporting preparation, and assurance preparation. Synerxus does not provide formal assurance, legal advice, compliance guarantees, SDG impact certification, or causal attribution.</p></div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
