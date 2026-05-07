import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import {
  AssessmentCta,
  EvidenceObjectExplorer,
  EvidenceObjectMockup,
  SectionHeader,
} from "@/components/marketing/marketing-sections";

const anatomy = [
  "Claim layer",
  "Evidence layer",
  "Confirmation layer",
  "Chain-of-custody layer",
  "Negative impact screening layer",
  "Framework mapping layer",
  "Disclosure-readiness layer",
];

export default function EvidenceObjectsPage() {
  return (
    <MarketingLayout>
      <section className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-[1fr_0.85fr] md:items-center md:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
              Evidence Objects
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
              The structured record behind every ESG claim.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Evidence Objects connect sustainability claims to source evidence,
              partner confirmation, chain-of-custody history, negative impact
              screening, framework mapping, and disclosure-readiness status.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild className="bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
                <Link href="/contact">Request Assessment</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#0A1F44] text-[#0A1F44]">
                <Link href="#example">View Sample Evidence Object</Link>
              </Button>
            </div>
          </div>
          <EvidenceObjectMockup compact />
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            title="What is an Evidence Object?"
            body="An Evidence Object is a structured ESG evidence record that captures what is being claimed, what evidence supports it, who confirmed it, what risks were screened, how it maps to frameworks, and whether it is ready for disclosure review."
          />
          <div className="grid gap-4 md:grid-cols-7">
            {anatomy.map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-[#0A1F44]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div id="example">
        <EvidenceObjectExplorer />
      </div>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader title="Why Evidence Objects matter" />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "They move ESG claims out of scattered files and into reviewable records.",
              "They preserve source evidence, confirmation, risk screening, and status together.",
              "They give ESG teams, advisors, and auditors a claim-level evidence unit to inspect.",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 p-5 text-sm leading-relaxed text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <AssessmentCta />
    </MarketingLayout>
  );
}
