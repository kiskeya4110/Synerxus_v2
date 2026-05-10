import { Link } from "wouter";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  DatabaseZap,
  FileSearch,
  Handshake,
  Scale,
  ShieldCheck,
  TimerReset,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { BoundaryNotice } from "@/components/marketing/marketing-sections";

const proofTests = [
  {
    title: "Buyer Pain Test",
    body: "Corporate teams must admit the evidence problem is real, recurring, and painful.",
    icon: UsersRound,
  },
  {
    title: "Evidence Quality Test",
    body: "Evidence packets must be more useful than spreadsheets, emails, PDFs, and partner reports.",
    icon: FileSearch,
  },
  {
    title: "Partner Confirmation Test",
    body: "NGOs, partners, or field verifiers must confirm records with acceptable accuracy and low friction.",
    icon: Handshake,
  },
  {
    title: "Review Usefulness Test",
    body: "ESG controls, legal, internal audit, or assurance-adjacent reviewers must find the output useful.",
    icon: ShieldCheck,
  },
  {
    title: "Willingness-To-Pay Test",
    body: "At least one real buyer must be willing to pay for a pilot, assessment, or implementation.",
    icon: Scale,
  },
];

const phases = [
  {
    phase: "Days 1-15",
    title: "Reposition and rebuild the demo",
    objective: "Strip out overclaiming and make claim-level evidence the center of the product story.",
    pass: "A skeptical reader understands in under 60 seconds that Synerxus organizes and confirms evidence behind claims. It does not prove impact.",
  },
  {
    phase: "Days 15-35",
    title: "Build the minimum credible evidence system",
    objective: "Support a complete trace from claim register to evidence packet, verifier, source artifact, tier, and report output.",
    pass: "A user can trace public or internal claim to claim register to evidence packet to verifier to source artifact to confidence tier to report output.",
  },
  {
    phase: "Days 35-75",
    title: "Run a real pilot",
    objective: "Use actual records across at least two programs, two to five partners, and a 30-day reporting period.",
    pass: "Synerxus produces a usable evidence package from real activity data and real partner confirmations.",
  },
  {
    phase: "Days 75-85",
    title: "External review test",
    objective: "Ask serious reviewers to attack the report and identify missing evidence, unclear fields, and overstated claims.",
    pass: "At least one reviewer says the output would reduce work or improve defensibility enough to consider piloting or buying it.",
  },
  {
    phase: "Days 85-90",
    title: "Commercial validation",
    objective: "Force a market decision through paid pilot, signed scope, procurement path, or accountable real-data sponsor.",
    pass: "Synerxus secures one concrete continuation signal from a qualified buyer or sponsor.",
  },
];

const requiredChain = [
  "Claim Register",
  "Evidence Packet",
  "Verifier Registry",
  "Source Artifact Index",
  "Evidence Confidence Tiers",
  "Exception Log",
  "Reporting Pack",
];

const pilotTargets = [
  ["Corporate or organizational sponsor", "1"],
  ["Programs / projects", "2"],
  ["Partners / verifiers", "2-5"],
  ["Submitted records", "50-150"],
  ["Partner-confirmed records", "40+"],
  ["Source-supported records", "25+"],
  ["Reporting period", "30+ days"],
  ["Evidence types", "3+"],
  ["Qualified reviewer", "1+"],
];

const scorecard = [
  ["Buyer pain validated", "20"],
  ["Product evidence chain works", "20"],
  ["Partner confirmation works", "15"],
  ["Source artifact support works", "15"],
  ["Reviewer usefulness validated", "15"],
  ["Commercial commitment secured", "15"],
];

const killCriteria = [
  "No one will provide real data.",
  "No buyer owns the pain or budget.",
  "The pitch only works when exaggerated.",
  "Partners will not confirm records.",
  "Reviewers do not find the output useful.",
  "The product blends self-reported, partner-confirmed, source-supported, and mapped data.",
  "Qualified conversations produce compliments but no pilot, budget, or real-data trial.",
];

export default function ValidationFrameworkPage() {
  return (
    <MarketingLayout>
      <section className="bg-transparent py-7 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              Continuation Test
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
              Synerxus continues only if the evidence workflow proves itself.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
              The test is whether Synerxus can turn messy corporate social-impact activity into
              claim-level, partner-confirmed, source-supported evidence that ESG and CSR teams
              would actually use and pay for.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-[#0A1F44] text-[#FFD95A] hover:bg-[#102b5a]">
                <Link href="/request-assessment">Request Evidence Assessment</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#0A1F44]/20 text-[#0A1F44] hover:bg-white">
                <a href="#scorecard">View Scorecard</a>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              Core thesis
            </p>
            <p className="mt-3 text-2xl font-extrabold leading-tight text-[#0A1F44]">
              Companies making ESG, CSR, community-investment, or social-impact claims lack
              defensible, organized, claim-level evidence.
            </p>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold leading-relaxed text-slate-700">
                Synerxus must solve that by collecting, structuring, confirming, tiering, and
                packaging evidence before reporting or assurance review.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <BoundaryNotice />
        </div>
      </section>

      <section className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-5 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              Five Tests
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              Praise is not enough. The workflow has to survive use.
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {proofTests.map(({ title, body, icon: Icon }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <Icon className="h-5 w-5 text-[#8A5A00]" />
                <h3 className="mt-3 text-sm font-extrabold text-[#0A1F44]">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-5 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              90-Day Framework
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              A staged test from repositioning to commercial commitment.
            </h2>
          </div>
          <div className="grid gap-3">
            {phases.map((phase) => (
              <div key={phase.phase} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[130px_1fr_1fr] md:items-start">
                <div className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#0A1F44] px-3 py-2 text-xs font-extrabold text-[#FFD95A]">
                  <TimerReset className="h-4 w-4" />
                  {phase.phase}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0A1F44]">{phase.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{phase.objective}</p>
                </div>
                <div className="rounded-lg border border-[#D4980C]/25 bg-white p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A5A00]">Pass condition</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{phase.pass}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0A1F44] py-7 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD95A]">
              Minimum Credible System
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
              The evidence chain must be traceable end to end.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/75">
              Without this chain, Synerxus is only collecting activity records. The product must
              show how each claim moves through confirmation, source support, tiering, exceptions,
              and reporting output.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {requiredChain.map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-extrabold text-[#FFD95A]">
                  {index + 1}
                </span>
                <p className="text-sm font-extrabold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              Pilot Targets
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              Sample records do not decide whether the business continues.
            </h2>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              {pilotTargets.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[1fr_110px] border-b border-slate-200 last:border-b-0">
                  <p className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">{label}</p>
                  <p className="bg-white px-4 py-3 text-right text-sm font-extrabold text-[#0A1F44]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="scorecard">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              Final Scorecard
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              Continue only if the score supports continued investment.
            </h2>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              {scorecard.map(([label, points]) => (
                <div key={label} className="grid grid-cols-[1fr_90px] border-b border-slate-200 last:border-b-0">
                  <p className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">{label}</p>
                  <p className="bg-white px-4 py-3 text-right text-sm font-extrabold text-[#0A1F44]">{points}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                ["80-100", "Continue and invest"],
                ["65-79", "Continue narrowly"],
                ["50-64", "Pause major investment"],
                ["Below 50", "Pull back"],
              ].map(([score, decision]) => (
                <div key={score} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-extrabold text-[#0A1F44]">{score}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">{decision}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-5 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              Kill Criteria
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              The concept should shrink or stop if these signals appear.
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {killCriteria.map((item) => (
              <div key={item} className="flex gap-3 rounded-xl border border-red-100 bg-white p-4 shadow-sm">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <p className="text-sm font-semibold leading-relaxed text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="rounded-2xl border border-[#D4980C]/25 bg-[#D4980C]/10 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[#0A1F44]" />
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
                    Success Definition
                  </p>
                </div>
                <p className="mt-3 text-lg font-extrabold leading-relaxed text-[#0A1F44]">
                  Synerxus passes only if a real-data pilot converts submitted activity records into
                  claim-linked evidence packets, separates evidence types, produces exceptions and
                  artifacts, and earns continuation from a serious ESG, CSR, or internal review stakeholder.
                </p>
              </div>
              <Button asChild className="shrink-0 bg-[#0A1F44] text-[#FFD95A] hover:bg-[#102b5a]">
                <Link href="/request-assessment">Start Evidence Assessment</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
