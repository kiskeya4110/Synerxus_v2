import { Link } from "wouter";
import { ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, FilePlus2, FileText, GitBranch, Info, Link2, LockKeyhole, Paperclip, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const evidenceCategories = [
  ["Self-Reported Records", "Internal records created and maintained by your organization."],
  ["Partner-Confirmed Records", "Information confirmed by a trusted partner with direct knowledge."],
  ["Source-Supported Records", "Backed by primary source documents and reviewable evidence."],
  ["Partner-Reported Figures", "Figures reported by partners without treating them as independently confirmed."],
  ["Mapped Records", "Claims mapped to SDGs, frameworks, or reporting categories with limitations."],
];

const frameworkGroups = [
  ["Reporting / Disclosure Context", ["CSRD", "ESRS", "GRI", "ISSB"]],
  ["Climate Disclosure Context", ["TCFD", "IFRS S2"]],
  ["Assurance-Preparation Context", ["ISAE 3000"]],
  ["Mapping Context", ["UN SDGs"]],
];

const workflow = [
  ["Create Claim", "Define clear, measurable claims with responsible owners.", FilePlus2],
  ["Attach Evidence", "Attach source documents, data, and supporting context.", Paperclip],
  ["Confirm", "Confirm who reviewed the claim and the source-support status.", UserCheck],
  ["Map", "Map claims to frameworks, standards, or disclosure context.", GitBranch],
  ["Preserve", "Preserve a reviewable claim-to-evidence trail over time.", LockKeyhole],
];

export default function MarketingHome() {
  return (
    <MarketingLayout>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-14">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">
              ESG Evidence Infrastructure
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.04] tracking-tight text-[#0A1F44] md:text-5xl">
              Claim-level evidence for defensible ESG and social-impact reporting.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#0A1F44]/80">
              Turn each claim into a structured evidence record that shows what
              supports it, who confirmed it, what source evidence exists, what
              remains unverified, and what the claim does not prove.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-[#c88914] text-white hover:bg-[#a9720f]">
                <Link href="/request-assessment">Request Evidence Readiness Assessment</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#0A1F44] text-[#0A1F44]">
                <Link href="/platform">View Sample Evidence Summary</Link>
              </Button>
            </div>
            <div className="mt-8 flex gap-4 rounded-md border border-[#c88914]/30 bg-[#fff9eb] p-4 text-sm leading-relaxed text-[#0A1F44]">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#c88914]" />
              <p>
                Synerxus supports evidence organization, reporting preparation,
                and assurance preparation; it does not provide formal assurance,
                legal advice, compliance guarantees, SDG impact certification, or
                causal attribution.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="rounded-lg bg-[#061A36] p-3">
                <div className="rounded-md bg-white p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-extrabold text-[#0A1F44]">Claim Record</h2>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      Confirmed
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.42fr]">
                    <div className="rounded-lg border border-slate-200 p-4">
                      {[
                        ["Claim", "We reduced Scope 1 and 2 GHG emissions by 20% in FY2023."],
                        ["Status", "Confirmed"],
                        ["Confirmed By", "Operations Director"],
                        ["Evidence Category", "Source-Supported Record"],
                        ["What This Claim Does Not Prove", "Overall climate impact or future performance."],
                      ].map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[140px_1fr] gap-3 border-b border-slate-100 py-2 last:border-b-0">
                          <p className="text-[11px] font-bold text-slate-500">{label}</p>
                          <p className="text-xs font-semibold text-[#0A1F44]">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3">
                      <div className="rounded-lg border border-slate-200 p-4">
                        <p className="text-xs font-extrabold text-[#0A1F44]">Evidence Ladder</p>
                        {["Self-Reported", "Partner-Confirmed", "Source-Supported", "Partner-Reported", "Mapped"].map((item, index) => (
                          <div key={item} className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                            <span className={`h-2.5 w-2.5 rounded-full ${index === 2 ? "bg-[#0A1F44]" : "border border-slate-400 bg-white"}`} />
                            {item}
                          </div>
                        ))}
                      </div>
                      <div className="rounded-lg border border-slate-200 p-4">
                        <p className="text-xs font-extrabold text-[#0A1F44]">Evidence Coverage</p>
                        <div className="mt-3 h-3 rounded-full bg-slate-100">
                          <div className="h-3 w-3/4 rounded-full bg-emerald-600" />
                        </div>
                        <p className="mt-2 text-[11px] font-semibold text-slate-500">Supported 76% · Partial 16% · Unverified 8%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {["Evidence Packet Review-Ready", "Electricity Invoice", "Utility Statement", "GHG Emissions"].map((item, index) => (
                  <div key={item} className="rounded-md border border-slate-200 bg-white p-3 text-center shadow-sm">
                    {index === 0 ? <ShieldCheck className="mx-auto h-7 w-7 text-[#c88914]" /> : <FileText className="mx-auto h-7 w-7 text-[#0A1F44]" />}
                    <p className="mt-2 text-[11px] font-extrabold leading-tight text-[#0A1F44]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-center text-2xl font-extrabold text-[#0A1F44]">How Synerxus Works</h2>
          <div className="mt-7 grid gap-5 lg:grid-cols-5">
            {workflow.map(([title, body, Icon], index) => (
              <div key={title as string} className="relative flex gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-[#0A1F44]/20 bg-white">
                  <Icon className="h-7 w-7 text-[#0A1F44]" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#c88914]">{index + 1}</p>
                  <h3 className="text-sm font-extrabold text-[#0A1F44]">{title as string}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{body as string}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-center text-2xl font-extrabold text-[#0A1F44]">Evidence Categories</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {evidenceCategories.map(([title, body], index) => {
              const CategoryIcon = [UserCheck, UserCheck, FileText, BarChart3, Link2][index];
              return (
                <div key={title} className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <CategoryIcon className="mx-auto h-10 w-10 text-[#0A1F44]" />
                  <h3 className="mt-4 text-sm font-extrabold text-[#0A1F44]">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-center text-2xl font-extrabold text-[#0A1F44]">
            Evidence organization across reporting, mapping, and assurance-preparation contexts
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-4">
            {frameworkGroups.map(([group, items]) => (
              <div key={group as string} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-center text-sm font-extrabold text-[#0A1F44]">{group as string}</h3>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(items as string[]).map((item) => (
                    <div key={item} className="rounded-md border border-slate-200 bg-white p-4 text-center">
                      <ClipboardCheck className="mx-auto h-7 w-7 text-[#0A1F44]" />
                      <p className="mt-2 text-sm font-extrabold text-[#0A1F44]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-[#0A1F44]">
            Alignment supports reporting context only and does not constitute certification, formal assurance,
            endorsement, legal advice, or compliance determination.
          </p>
        </div>
      </section>

      <section className="bg-white pb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-6 rounded-xl bg-[#061A36] p-8 text-white md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl font-extrabold">Find out how defensible your claims are.</h2>
              <p className="mt-2 max-w-2xl text-white/80">
                Get a clear view of your evidence maturity, gaps, and next steps to strengthen reporting and assurance preparation.
              </p>
            </div>
            <Button asChild className="bg-[#c88914] text-white hover:bg-[#a9720f]">
              <Link href="/request-assessment">
                Request Evidence Readiness Assessment <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
