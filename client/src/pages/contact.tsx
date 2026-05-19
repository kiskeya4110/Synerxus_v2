import { type FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const BOUNDARY = "Synerxus supports evidence organization, reporting preparation, and assurance preparation. Synerxus does not provide formal assurance, legal advice, compliance guarantees, SDG impact certification, or causal attribution.";

const SITUATIONS = [
  "I am preparing our ESG or sustainability report and need to organize the evidence behind specific claims",
  "I have an assurance review coming up and need to get our evidence ready for the auditor",
  "My team receives evidence from NGO or community partners and needs to organize it",
  "I manage a grant or funder reporting requirement and need structured evidence records",
  "I need to map our activities to SDGs or reporting frameworks with appropriate limitations documented",
];

const ASSURANCE_DEADLINES = [
  "Yes, within 60 days",
  "Yes, within 6 months",
  "No specific deadline — planning ahead",
  "Not sure",
];

const EVIDENCE_EXISTS = [
  "Internal records",
  "Partner reports",
  "Source documents",
  "None yet",
];

const WHO_REVIEWS = [
  "Internal team",
  "Funder",
  "Auditor",
  "Board",
  "Regulator",
];

const TIMELINES = [
  "Urgent (under 30 days)",
  "1–3 months",
  "Planning ahead",
];

function PillGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
              on
                ? "border-[#c88914] bg-[#fff9eb] font-bold text-[#0A1F44] shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#0A1F44]/40 hover:text-[#0A1F44]"
            }`}
          >
            {on && <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5 text-[#c88914]" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function ContactPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Step 1 — 5 questions
  const [situation, setSituation] = useState("");
  const [evidenceExists, setEvidenceExists] = useState<string[]>([]);
  const [whoReviews, setWhoReviews] = useState("");
  const [timeline, setTimeline] = useState("");
  const [assuranceDeadline, setAssuranceDeadline] = useState("");

  // Step 2 — contact info
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [boundaryAccepted, setBoundaryAccepted] = useState(false);

  const toggleEvidence = (v: string) =>
    setEvidenceExists((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const canProceedStep1 = situation.trim() !== "";
  const canSubmit = name.trim() !== "" && organization.trim() !== "" && email.trim() !== "" && boundaryAccepted;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("loading");

    const lines = [
      `Situation: ${situation}`,
      `Evidence that exists: ${evidenceExists.join(", ") || "—"}`,
      `Who reviews: ${whoReviews || "—"}`,
      `Timeline: ${timeline || "—"}`,
      `Assurance deadline: ${assuranceDeadline || "—"}`,
      `Name: ${name}`,
      `Organization: ${organization}`,
      `Email: ${email}`,
      `Boundary acknowledgment: Accepted`,
    ];

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company: organization,
          email,
          plan: "Evidence Readiness Assessment",
          role: "Evidence Readiness Assessment",
          primaryNeed: situation,
          message: lines.join("\n"),
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <MarketingLayout>
        <section className="bg-white py-20">
          <div className="mx-auto max-w-xl px-4 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
            <h2 className="mt-6 text-2xl font-extrabold text-[#0A1F44]">Request received</h2>
            <p className="mt-3 text-slate-600">A Synerxus team member will follow up with next steps for your evidence readiness assessment.</p>
          </div>
        </section>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <section className="border-b border-slate-200 bg-white py-10 md:py-12">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <h1 className="font-serif text-4xl font-bold text-[#0A1F44] md:text-5xl">Evidence Readiness Assessment</h1>
          <p className="mt-5 max-w-2xl text-xl leading-relaxed text-[#0A1F44]">Tell us about your claim and evidence needs. We will help identify strengths, gaps, and next steps.</p>
        </div>
      </section>

      <section className="bg-white py-8 md:py-10">
        <div className="mx-auto max-w-3xl px-4 md:px-8">

          {/* Step progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[
                { label: "Your Situation", hint: "Claim & evidence" },
                { label: "Contact Info", hint: "Name & email" },
              ].map((s, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <div key={s.label} className="flex flex-1 flex-col items-center">
                    <button
                      type="button"
                      onClick={() => done && setCurrentStep(i)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-extrabold transition-colors ${
                        done
                          ? "cursor-pointer border-[#c88914] bg-[#c88914] text-white"
                          : active
                          ? "border-[#0A1F44] bg-[#0A1F44] text-white"
                          : "cursor-default border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </button>
                    <p className={`mt-1.5 text-center text-[11px] font-extrabold uppercase tracking-wide ${active ? "text-[#0A1F44]" : done ? "text-[#c88914]" : "text-slate-400"}`}>
                      {s.label}
                    </p>
                    <p className="hidden text-[10px] text-slate-400 sm:block">{s.hint}</p>
                  </div>
                );
              })}
            </div>
            <div className="relative mt-4 h-1.5 rounded-full bg-slate-100">
              <div
                className="absolute left-0 top-0 h-1.5 rounded-full bg-[#c88914] transition-all duration-500"
                style={{ width: `${currentStep * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white shadow-sm">

            {/* ── Step 1: Your Situation ──────────────────────────────── */}
            {currentStep === 0 && (
              <div className="p-6">
                <p className="text-xs font-extrabold uppercase tracking-widest text-[#c88914]">Step 1 of 2</p>
                <h2 className="mt-1 text-xl font-extrabold text-[#0A1F44]">Your Situation</h2>
                <p className="mt-1 text-sm text-slate-500">Five questions — takes about 90 seconds.</p>

                <div className="mt-6 space-y-6">
                  <div>
                    <label className="text-sm font-extrabold text-[#0A1F44]">
                      What best describes your situation? <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={situation}
                      onChange={(e) => setSituation(e.target.value)}
                      className="mt-2 h-auto w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium focus:border-[#0A1F44] focus:outline-none"
                    >
                      <option value="">Select…</option>
                      {SITUATIONS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <p className="text-sm font-extrabold text-[#0A1F44]">What evidence currently exists?</p>
                    <p className="mt-0.5 text-xs text-slate-500">Select all that apply.</p>
                    <PillGroup options={EVIDENCE_EXISTS} selected={evidenceExists} onToggle={toggleEvidence} />
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <label className="text-sm font-extrabold text-[#0A1F44]">Who reviews or requests this evidence?</label>
                    <select
                      value={whoReviews}
                      onChange={(e) => setWhoReviews(e.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium focus:border-[#0A1F44] focus:outline-none"
                    >
                      <option value="">Select a reviewer…</option>
                      {WHO_REVIEWS.map((wr) => (
                        <option key={wr}>{wr}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <label className="text-sm font-extrabold text-[#0A1F44]">What is your timeline?</label>
                    <select
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium focus:border-[#0A1F44] focus:outline-none"
                    >
                      <option value="">Select a timeline…</option>
                      {TIMELINES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <label className="text-sm font-extrabold text-[#0A1F44]">Do you have an upcoming assurance review or board reporting deadline?</label>
                    <select
                      value={assuranceDeadline}
                      onChange={(e) => setAssuranceDeadline(e.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium focus:border-[#0A1F44] focus:outline-none"
                    >
                      <option value="">Select…</option>
                      {ASSURANCE_DEADLINES.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Contact Info ────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="p-6">
                <p className="text-xs font-extrabold uppercase tracking-widest text-[#c88914]">Step 2 of 2</p>
                <h2 className="mt-1 text-xl font-extrabold text-[#0A1F44]">Contact Info</h2>
                <p className="mt-1 text-sm text-slate-500">Used only to respond to your request.</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-bold text-[#0A1F44]">
                    Name <span className="text-red-500">*</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium focus:border-[#0A1F44] focus:outline-none"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold text-[#0A1F44]">
                    Organization <span className="text-red-500">*</span>
                    <input
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      required
                      className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium focus:border-[#0A1F44] focus:outline-none"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold text-[#0A1F44] sm:col-span-2">
                    Work email <span className="text-red-500">*</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium focus:border-[#0A1F44] focus:outline-none"
                    />
                  </label>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-extrabold text-[#0A1F44]">Boundary Acknowledgment</h3>
                  <label className="mt-3 flex cursor-pointer gap-3 rounded-lg border border-[#c88914]/40 bg-[#fff9eb] p-4 text-sm leading-relaxed text-[#0A1F44]">
                    <input
                      type="checkbox"
                      checked={boundaryAccepted}
                      onChange={(e) => setBoundaryAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#c88914]"
                    />
                    <span>{BOUNDARY}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                className={`flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-[#0A1F44] ${currentStep === 0 ? "invisible" : ""}`}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>

              {currentStep === 0 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  disabled={!canProceedStep1}
                  className="bg-[#0A1F44] text-white hover:bg-[#102b5a] disabled:opacity-40"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex flex-col items-end gap-2">
                  {status === "error" && (
                    <p className="text-sm font-bold text-red-600">The request could not be sent. Please try again.</p>
                  )}
                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    loading={status === "loading"}
                    className="bg-[#c88914] text-white hover:bg-[#a9720f] disabled:opacity-40"
                  >
                    <ShieldCheck className="h-4 w-4" /> Request Evidence Readiness Assessment
                  </Button>
                  <p className="flex items-center gap-1.5 text-xs text-slate-400">
                    <LockKeyhole className="h-3 w-3" /> Secure — used only to respond to your request
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>
      </section>
    </MarketingLayout>
  );
}
