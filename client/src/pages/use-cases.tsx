import { Link } from "wouter";
import { ArrowRight, BarChart3, Building2, CheckCircle2, FileText, Handshake, ShieldAlert, Target, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const useCases = [
  {
    title: "Corporate ESG / CSR Reporting",
    icon: Building2,
    color: "#0A1F44",
    claim: "Our community investment program supported local workforce development.",
    evidence: ["Activity logs", "Partner reports", "Source documents", "Attendance records"],
    limitation: "Does not prove long-term employment outcomes unless follow-up outcome data exists.",
  },
  {
    title: "Corporate Volunteering",
    icon: Users,
    color: "#1f7ae0",
    claim: "Employees contributed volunteer hours to community programs.",
    evidence: ["Volunteer logs", "Partner confirmation", "Event records", "Source documentation"],
    limitation: "Hours do not prove community outcome or causal impact.",
  },
  {
    title: "Partner-Delivered Outputs",
    icon: Handshake,
    color: "#0f9f96",
    claim: "Our partner delivered training sessions during the reporting period.",
    evidence: ["Training logs", "Partner confirmation", "Attendance records", "Source artifacts"],
    limitation: "Training completion does not prove behavior change or long-term outcome.",
  },
  {
    title: "Supplier / Value Chain Evidence",
    icon: Truck,
    color: "#7551b5",
    claim: "Supplier sustainability activities were reviewed during the reporting period.",
    evidence: ["Supplier submissions", "Inspection records", "Certificates", "Source documents"],
    limitation: "Submitted evidence may require independent review before assurance or compliance reliance.",
  },
  {
    title: "Grant / Funder Reporting",
    icon: Building2,
    color: "#c88914",
    claim: "Grant-funded activities were completed as reported.",
    evidence: ["Grant reports", "Source artifacts", "Partner confirmation", "Exception log"],
    limitation: "Completion evidence does not prove causal impact unless outcome evaluation is performed.",
  },
  {
    title: "SDG-Aligned Activity Mapping",
    icon: Target,
    color: "#3b8c28",
    claim: "Activities were mapped to SDG-aligned reporting context.",
    evidence: ["Activity record", "Mapping rationale", "Supporting evidence tier", "Limitation notes"],
    limitation: "SDG mapping does not certify SDG impact, prove contribution, or determine compliance.",
  },
];

const flow = [
  ["Claim", "Define the reporting statement clearly.", Target],
  ["Evidence", "Collect relevant source support.", FileText],
  ["Confirmation", "Record who confirmed the activity.", CheckCircle2],
  ["Source Support", "Reference documents and records.", FileText],
  ["Limitation", "State what the claim does not prove.", ShieldAlert],
  ["Output", "Produce a reviewable evidence summary.", BarChart3],
];

export default function UseCasesPage() {
  return (
    <MarketingLayout>
      <section className="bg-white py-10 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-8 lg:grid-cols-[1fr_0.7fr] lg:items-center">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">Use Cases</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-[#0A1F44] md:text-5xl">
              Built for claims that need defensible evidence.
            </h1>
            <div className="mt-4 h-1 w-24 bg-[#c88914]" />
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
              Different programs. Different stakeholders. Same evidence backbone. Synerxus provides a consistent structure: claim to evidence to confirmation to source support to mapping context to limitation to output.
            </p>
          </div>
          <div className="hidden justify-center lg:flex">
            <img src="/synerxus-esg-logo.png" alt="Synerxus" className="h-52 w-auto drop-shadow-xl" />
          </div>
        </div>
      </section>

      <section className="bg-white pb-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-2 md:px-8 lg:grid-cols-3">
          {useCases.map((item, index) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-md border border-slate-200 bg-white p-6 shadow-md">
                <div className="h-1 -translate-y-6 rounded-t-md" style={{ backgroundColor: item.color }} />
                <div className="flex items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: item.color }}>
                    <Icon className="h-7 w-7" />
                  </span>
                  <h2 className="text-xl font-extrabold leading-tight text-[#0A1F44]">{index + 1}. {item.title}</h2>
                </div>
                <p className="mt-5 text-sm font-bold uppercase tracking-wide text-[#0A1F44]">Claim</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">"{item.claim}"</p>
                <p className="mt-5 border-t border-slate-200 pt-4 text-sm font-bold uppercase tracking-wide text-[#0A1F44]">Evidence Package Preview</p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {item.evidence.map((evidence) => <li key={evidence}>• {evidence}</li>)}
                </ul>
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-[#0A1F44]"><ShieldAlert className="h-4 w-4" /> Limitation / Caution</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.limitation}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white pb-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-center text-sm font-extrabold uppercase tracking-[0.18em] text-[#0A1F44]">One consistent evidence flow for every use case</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-6">
              {flow.map(([title, body, Icon], index) => (
                <div key={title as string} className="text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white">
                    <Icon className="h-8 w-8 text-[#0A1F44]" />
                  </span>
                  <p className="mt-3 text-sm font-extrabold uppercase text-[#0A1F44]">{title as string}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{body as string}</p>
                  {index < flow.length - 1 ? <ArrowRight className="mx-auto mt-3 hidden h-5 w-5 text-[#c88914] md:block" /> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#061A36] py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-[1fr_auto_auto] md:items-center md:px-8">
          <div>
            <p className="text-sm font-extrabold uppercase text-[#ffcc33]">Ready to strengthen your evidence?</p>
            <h2 className="mt-3 text-3xl font-extrabold">Explore use cases or get a tailored evidence readiness assessment.</h2>
          </div>
          <Button asChild variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white hover:text-[#061A36]"><Link href="/platform">Explore all use cases</Link></Button>
          <Button asChild className="bg-[#c88914] text-white hover:bg-[#a9720f]"><Link href="/request-assessment">Request an assessment</Link></Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
