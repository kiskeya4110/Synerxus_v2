import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { AssessmentCta, BoundaryNotice, SectionHeader } from "@/components/marketing/marketing-sections";

const principles = [
  {
    title: "Claims need proof",
    body: "A sustainability statement without traceable source evidence is a liability, not an asset. Every claim should be backed by a reviewable record before it is published.",
  },
  {
    title: "Partners deserve recognition",
    body: "The NGOs, suppliers, and community organizations that deliver ESG outcomes should have a structured way to confirm them — not be buried in corporate reporting systems.",
  },
  {
    title: "Custody matters",
    body: "Who submitted, reviewed, confirmed, and changed an ESG record matters as much as what the record says. Audit-ready evidence preserves that history.",
  },
  {
    title: "Frameworks are the destination, not the evidence",
    body: "ESG frameworks define what organizations may need to disclose. They do not produce the underlying evidence. That is what Synerxus is built for.",
  },
];

const problemStatements = [
  "Companies publish sustainability claims without structured evidence behind them.",
  "Source records are scattered across spreadsheets, emails, photos, and partner reports.",
  "Partners who deliver ESG outcomes have no structured way to confirm them.",
  "Teams collecting evidence for one framework repeat the same work for every other framework.",
  "There is no standard unit for what makes an ESG claim reviewable or defensible.",
];

export default function AboutPage() {
  return (
    <MarketingLayout>
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
            About
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
            Building the evidence infrastructure for credible ESG impact.
          </h1>
          <div className="mt-6 max-w-3xl space-y-4 text-lg leading-relaxed text-slate-600">
            <p>
              Synerxus was created to close the trust gap between sustainability
              activity and ESG disclosure. As scrutiny increases, organizations need
              more than internal claims and scattered documentation — they need a
              transparent, structured way to prove what happened.
            </p>
            <p>
              Evidence Objects, the Evidence Ladder, partner confirmation, and
              chain-of-custody management give ESG teams the infrastructure to
              organize proof, involve trusted partners, and prepare claims for
              reporting, review, and assurance workflows.
            </p>
          </div>
          <Button asChild className="mt-7 bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
            <Link href="/request-assessment">Request Assessment</Link>
          </Button>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
                Mission
              </p>
              <h2 className="mt-3 text-2xl font-extrabold text-[#0A1F44]">
                Make ESG claims credible, traceable, and defensible.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Every sustainability claim should be backed by a structured evidence
                record that can be reviewed, confirmed, and preserved — not just asserted.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
                Vision
              </p>
              <h2 className="mt-3 text-2xl font-extrabold text-[#0A1F44]">
                Every sustainability claim traceable to structured evidence.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                A future where organizations, partners, investors, and regulators can
                trace ESG outcomes to the source records and confirmation workflows
                that support them.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="The problem we're solving"
            title="ESG claims are often published without structured proof."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {problemStatements.map((item, index) => (
              <div
                key={item}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0A1F44] text-xs font-extrabold text-[#D4980C]">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Our principles"
            title="How we think about ESG evidence."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {principles.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
              >
                <h3 className="font-extrabold text-[#0A1F44]">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="What Synerxus is not"
            title="Assurance boundary."
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <BoundaryNotice />
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Synerxus helps organizations build the structured evidence records that
              support assurance and advisory work. It is not a substitute for independent
              auditors, legal counsel, or regulatory compliance review.
            </p>
          </div>
        </div>
      </section>

      <AssessmentCta />
    </MarketingLayout>
  );
}
