import { Link } from "wouter";
import { BarChart3, CheckCircle2, Clock3, FileCheck2, FileText, Info, ShieldCheck, Target, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const levels = [
  [5, "Review-Ready Evidence Packet", "Claim, evidence, confirmation, source support, mapping, exceptions, and limitations are packaged for review.", "Lowest risk", "text-green-700"],
  [4, "Mapped With Context", "Claim is mapped to SDG, framework, or internal category with documented limitations.", "Lower risk", "text-green-700"],
  [3, "Partner-Confirmed", "Authorized partner or reviewer confirmed the record.", "Lower risk", "text-green-700"],
  [2, "Source Evidence Attached", "Claim has attached or referenced source material.", "Moderate risk", "text-[#c88914]"],
  [1, "Internal Assertion", "Claim is internally stated but not externally confirmed.", "High risk", "text-orange-700"],
  [0, "Unsupported Claim", "Claim has no reviewable support attached.", "Highest risk", "text-red-700"],
];

const benefits = [
  ["Stronger Defensibility", "Build evidence and context that can stand up to scrutiny.", ShieldCheck],
  ["Lower Risk Over Time", "Move up the ladder to reduce claim risk and increase confidence.", BarChart3],
  ["Clearer Documentation", "Organized records speed up reviews.", FileText],
  ["Stakeholder Alignment", "Create a common language for evidence maturity.", Users],
  ["Review Readiness", "Be prepared when reviews, RFPs, or inquiries arrive.", Clock3],
];

export default function EvidenceLadderPage() {
  return (
    <MarketingLayout>
      <section className="bg-white py-10 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-8 lg:grid-cols-[1fr_0.48fr] lg:items-start">
          <div>
            <h1 className="text-5xl font-extrabold leading-tight text-[#0A1F44] md:text-6xl">The Evidence Ladder</h1>
            <p className="mt-5 max-w-2xl text-2xl leading-relaxed text-slate-600">A maturity model for claim defensibility. Move from unsupported to review-ready.</p>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#0A1F44]">The Evidence Ladder helps you strengthen claims over time by building better evidence, context, and confirmations so you are ready when it matters.</p>
            <Button asChild className="mt-7 bg-[#c88914] text-white hover:bg-[#a9720f]"><Link href="/request-assessment">Request Assessment</Link></Button>
          </div>
          <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#061A36] text-white"><Info className="h-5 w-5" /></span><div><h2 className="font-extrabold text-[#0A1F44]">What this page shows</h2><p className="mt-2 text-sm leading-relaxed text-slate-700">A maturity model for claim-defensibility. It illustrates how evidence, context, and confirmations reduce risk as you move up the ladder.</p></div></div>
            <div className="my-6 border-t border-slate-200" />
            <div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c88914] text-white"><XCircle className="h-5 w-5" /></span><div><h2 className="font-extrabold text-[#0A1F44]">What this page does not show</h2><p className="mt-2 text-sm leading-relaxed text-slate-700">It does not represent formal assurance, regulatory compliance, proven impact, or a guarantee of acceptance.</p></div></div>
          </aside>
        </div>
      </section>

      <section className="bg-white pb-10">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:px-8 lg:grid-cols-[0.33fr_0.67fr] lg:items-center">
          <div className="relative hidden min-h-[560px] lg:block">
            <div className="absolute left-6 top-0 text-center text-sm font-extrabold uppercase text-[#c88914]">Higher maturity<br />Lower risk</div>
            <div className="absolute bottom-0 left-7 text-center text-sm font-extrabold uppercase text-[#c88914]">Lower maturity<br />Higher risk</div>
            <div className="absolute left-24 top-16 h-[460px] w-48 rounded-b-lg border-x-[18px] border-b-[18px] border-[#0A1F44]" />
            {[5,4,3,2,1,0].map((n, index) => <div key={n} className="absolute left-[138px] flex h-12 w-12 items-center justify-center rounded-full bg-[#0A1F44] text-2xl font-extrabold text-white" style={{ top: 95 + index * 68 }}>{n}</div>)}
          </div>
          <div className="grid gap-3">
            {levels.map(([n, title, meaning, risk, riskClass]) => (
              <article key={title as string} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[80px_64px_1fr_150px] sm:items-center">
                <div className="rounded-md bg-[#061A36] px-3 py-2 text-center text-white"><p className="text-xs font-bold uppercase">Level</p><p className="text-4xl font-extrabold">{n as number}</p></div>
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100"><FileCheck2 className="h-7 w-7 text-[#0A1F44]" /></span>
                <div><h2 className="text-lg font-extrabold text-[#0A1F44]">{title as string}</h2><p className="mt-1 text-sm leading-relaxed text-slate-700">{meaning as string}</p></div>
                <p className={`text-sm font-extrabold uppercase ${riskClass as string}`}>● {risk as string}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white pb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid rounded-lg border border-slate-200 bg-white shadow-sm md:grid-cols-5">
            {benefits.map(([title, body, Icon]) => (
              <div key={title as string} className="border-b border-slate-200 p-6 text-center md:border-b-0 md:border-r md:last:border-r-0">
                <Icon className="mx-auto h-10 w-10 text-[#0A1F44]" />
                <h3 className="mt-3 text-sm font-extrabold text-[#0A1F44]">{title as string}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{body as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white pb-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex gap-5 rounded-lg bg-[#f8efe0] p-8">
            <ShieldCheck className="h-16 w-16 shrink-0 text-[#0A1F44]" />
            <div><h2 className="text-xl font-extrabold text-[#0A1F44]">The Evidence Ladder shows claim-defensibility maturity.</h2><p className="mt-2 text-lg text-[#0A1F44]">It does not represent formal assurance, regulatory compliance, or proven impact.</p></div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
