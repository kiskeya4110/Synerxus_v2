import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { AssessmentCta, SectionHeader } from "@/components/marketing/marketing-sections";

const partnerWorkflow = [
  {
    title: "Receive review request",
    body: "Partner receives a focused request tied to one Evidence Object — not a full reporting platform or bulk data submission.",
    status: "Request received",
    action: "Open claim review",
  },
  {
    title: "Review the claim",
    body: "Partner sees the exact ESG claim, reporting period, location, stated outcome, and claiming organization.",
    status: "Claim reviewed",
    action: "Review claim scope",
  },
  {
    title: "Inspect supporting evidence",
    body: "Partner reviews the attached logs, certificates, reports, photos, and project documentation.",
    status: "5 files reviewed",
    action: "Inspect evidence package",
  },
  {
    title: "Confirm, comment, or flag",
    body: "Partner confirms accuracy, requests clarification, adds context, or flags a concern — all tied to the specific claim.",
    status: "Response recorded",
    action: "Confirm · Clarify · Flag",
  },
  {
    title: "Confirmation preserved",
    body: "The partner response — reviewer identity, status, notes, and timestamp — becomes part of the Evidence Object's chain of custody.",
    status: "Custody updated",
    action: "Record preserved",
  },
];

const partnerTypes = [
  {
    title: "NGOs",
    body: "Confirm community outcomes, program delivery, and beneficiary impact for corporate partners.",
  },
  {
    title: "Suppliers",
    body: "Confirm supply chain ESG outcomes, environmental data, and labor practice records.",
  },
  {
    title: "Implementation Partners",
    body: "Confirm field activity, infrastructure outcomes, and project delivery records.",
  },
  {
    title: "Verification Partners",
    body: "Review and confirm claim accuracy before evidence records are used in disclosure.",
  },
  {
    title: "Community Organizations",
    body: "Confirm local impact, workforce benefit, and community engagement outcomes.",
  },
  {
    title: "Field Teams",
    body: "Provide on-the-ground confirmation of outcomes reported by program or project owners.",
  },
];

const partnerValue = [
  "Clear review scope — one claim, one evidence package",
  "No requirement to join a full corporate reporting system",
  "Structured response options — confirm, clarify, or flag",
  "Your confirmation is preserved with your organization's name and timestamp",
  "Reduces back-and-forth with requesting organizations",
  "Strengthens shared impact reporting for funders and stakeholders",
];

export default function ForPartnersPage() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <MarketingLayout>
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
            For Partners
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
            A simpler way for partners to confirm impact.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
            Synerxus gives NGOs, suppliers, implementation partners, and community
            organizations a structured way to review and confirm ESG outcomes — without
            being buried in corporate reporting systems.
          </p>
          <Button asChild className="mt-7 bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
            <Link href="/request-assessment">Join the Partner Network</Link>
          </Button>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start md:px-8">
          <div>
            <SectionHeader
              eyebrow="Partner confirmation workflow"
              title="Five steps. Focused review. Preserved record."
              body="Partners follow a clear workflow — no onboarding into complex platforms required."
            />
            <div className="grid gap-3">
              {partnerWorkflow.map((step, index) => {
                const active = activeStep === index;
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    onMouseEnter={() => setActiveStep(index)}
                    onFocus={() => setActiveStep(index)}
                    aria-pressed={active}
                    className={`flex gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      active
                        ? "border-[#0A1F44] bg-[#0A1F44]"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${
                        active
                          ? "bg-white/10 text-[#D4980C]"
                          : "bg-[#D4980C]/15 text-[#0A1F44]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p
                        className={`font-extrabold ${
                          active ? "text-[#D4980C]" : "text-[#0A1F44]"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p
                        className={`mt-1 text-sm ${
                          active ? "text-[#D4980C]" : "text-slate-600"
                        }`}
                      >
                        {step.body}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-[#D4980C] shadow-2xl">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#D4980C]">
                Review Request · Step {activeStep + 1}
              </p>
              <h3 className="mt-3 text-xl font-extrabold">
                240 residents completed solar workforce training
              </h3>
              <div className="mt-5 grid gap-3">
                {[
                  ["Claim", "240 residents — solar workforce training"],
                  ["Evidence", "5 files attached"],
                  ["Status", partnerWorkflow[activeStep].status],
                  ["Action", partnerWorkflow[activeStep].action],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {["Confirm", "Request Clarification", "Flag Issue"].map((item, i) => (
                  <button
                    key={item}
                    type="button"
                    className={`rounded-lg px-3 py-2 text-xs font-bold ${
                      i === 0
                        ? "bg-emerald-400 text-emerald-950"
                        : "border border-[#D4980C]/25 bg-[#D4980C]/10 text-[#D4980C]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Clear review scope",
                "No platform onboarding",
                "Structured confirmation record",
                "Preserved with your identity",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-[#D4980C]/20 bg-[#D4980C]/10 p-3 text-sm font-semibold text-[#D4980C]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Partner types"
            title="Built for the organizations that deliver ESG outcomes."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partnerTypes.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="font-extrabold text-[#0A1F44]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Partner value"
            title="Why confirmation works better with Synerxus."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {partnerValue.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
          <Button asChild className="mt-8 bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
            <Link href="/request-assessment">Join the Partner Network</Link>
          </Button>
        </div>
      </section>

      <AssessmentCta />
    </MarketingLayout>
  );
}
