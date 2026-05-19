import { type FormEvent, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const BOUNDARY =
  "Synerxus supports evidence organization, reporting preparation, and assurance preparation. Synerxus does not provide formal assurance, legal advice, compliance guarantees, or SDG impact certification; does not independently review all partner-reported reach figures; and does not establish causal attribution.";

type FormState = {
  organizationName: string;
  website: string;
  organizationType: string;
  countryRegion: string;
  organizationSize: string;
  primaryContactName: string;
  workEmail: string;
  claimStatement: string;
  claimTypes: string[];
  programTypes: string[];
  evidenceProblems: string[];
  currentSources: string[];
  confirmationWho: string[];
  confirmationHow: string;
  reportingContexts: string[];
  mappingInterests: string[];
  evidenceScope: string[];
  reportOutputs: string[];
  solutionTiming: string;
  deadline: string;
  comments: string;
  boundaryAccepted: boolean;
};

const initialForm: FormState = {
  organizationName: "",
  website: "",
  organizationType: "",
  countryRegion: "",
  organizationSize: "",
  primaryContactName: "",
  workEmail: "",
  claimStatement: "",
  claimTypes: [],
  programTypes: [],
  evidenceProblems: [],
  currentSources: [],
  confirmationWho: [],
  confirmationHow: "",
  reportingContexts: [],
  mappingInterests: [],
  evidenceScope: [],
  reportOutputs: [],
  solutionTiming: "",
  deadline: "",
  comments: "",
  boundaryAccepted: false,
};

const claimTypes = [
  "Volunteer hours",
  "Community investment activity",
  "Partner-delivered outputs",
  "Beneficiary / reach figures",
  "Training or capacity-building activity",
  "Infrastructure / installation completion",
  "Supplier / value-chain evidence",
  "Grant-funded activity",
  "SDG-aligned activity",
  "Internal ESG / CSR reporting",
  "Other",
];

const programTypes = [
  "Employee Volunteering",
  "Community Investment",
  "Grantmaking",
  "Capacity Building",
  "Supplier / Value Chain",
  "NGO / Partner Program",
  "Infrastructure / Installation",
  "Environmental / Climate",
  "Workforce Development",
  "Other",
];

const evidenceProblems = [
  "Data is scattered across systems",
  "Hard to confirm partner activity and output records",
  "Lack of reviewable source documentation",
  "Partner-reported figures are mixed with confirmed records",
  "SDG / framework mapping lacks evidence support",
  "Inconsistent reporting across partners or programs",
  "Time-consuming to prepare reports",
  "Unsure what claims are defensible",
  "Other",
];

const currentSources = [
  "Spreadsheets",
  "Surveys / Forms",
  "Partner Reports",
  "CRM / PM Tools",
  "Financial Systems",
  "Photos / Documents",
  "Emails",
  "Dashboards",
  "Shared Drives",
  "Internal Tracking Systems",
  "Other",
];

const confirmationWho = [
  "Corporate team",
  "NGO / implementation partner",
  "Program manager",
  "Volunteer / employee",
  "Supplier",
  "Third-party evaluator",
  "No formal confirmation process",
  "Not sure",
  "Other",
];

const confirmationHow = [
  "Email",
  "Spreadsheet sign-off",
  "Form submission",
  "App workflow",
  "Manual report",
  "Meeting notes",
  "Not documented",
  "Other",
];

const reportingContexts = [
  "Internal ESG / CSR reporting",
  "Board or executive reporting",
  "Grant / funder reporting",
  "Public sustainability report",
  "Assurance preparation",
  "Legal / compliance review",
  "Supplier / procurement review",
  "Other",
];

const mappingInterests = ["UN SDGs", "GRI 413", "ESRS S3", "SASB / ISSB", "Internal reporting categories", "Other"];

const evidenceScope = [
  "Projects",
  "Programs",
  "Partners / NGOs",
  "Volunteers",
  "Suppliers",
  "Countries / Locations",
  "Beneficiaries / Reach",
  "Source Documents",
  "Review History",
  "Exception Logs",
  "Other",
];

const reportOutputs = [
  "Evidence Summary",
  "Claim-to-Evidence Report",
  "Exception Summary",
  "Board Summary",
  "Assurance Preparation Package",
  "Source Artifact Index",
  "Claim Register Export",
  "Other",
];

const sections = [
  "Organization Profile",
  "Claim / Reporting Need",
  "Program Type",
  "Evidence Problem",
  "Current Evidence Sources",
  "Confirmation Workflow",
  "Mapping / Reporting Context",
  "Evidence Scope",
  "Report Output Needed",
  "Timing",
  "Boundary Acknowledgment",
];

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function CheckGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const checked = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c88914] focus-visible:ring-offset-2 ${
              checked
                ? "border-[#c88914] bg-[#fff8e8] font-semibold text-[#0A1F44]"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#0A1F44]/35"
            }`}
          >
            {checked && <CheckCircle2 className="mr-2 inline h-4 w-4 text-[#c88914]" />}
            {option}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-[#0A1F44]">
      <span>
        {children} {required && <span className="text-red-500">*</span>}
      </span>
    </label>
  );
}

export default function AssessmentPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [openSection, setOpenSection] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const sectionComplete = useMemo(
    () => [
      form.organizationName.trim() && form.primaryContactName.trim() && isEmail(form.workEmail),
      form.claimStatement.trim() || form.claimTypes.length > 0,
      form.programTypes.length > 0,
      form.evidenceProblems.length > 0,
      form.currentSources.length > 0,
      form.confirmationWho.length > 0 || form.confirmationHow,
      form.reportingContexts.length > 0 || form.mappingInterests.length > 0,
      form.evidenceScope.length > 0,
      form.reportOutputs.length > 0,
      form.solutionTiming || form.deadline || form.comments,
      form.boundaryAccepted,
    ],
    [form],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.organizationName.trim()) next.organizationName = "Organization name is required.";
    if (!form.primaryContactName.trim()) next.primaryContactName = "Primary contact name is required.";
    if (!form.workEmail.trim()) next.workEmail = "Work email is required.";
    else if (!isEmail(form.workEmail)) next.workEmail = "Enter a valid work email.";
    if (!form.boundaryAccepted) next.boundaryAccepted = "Boundary acknowledgment is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setOpenSection(next.boundaryAccepted ? 10 : 0);
      return false;
    }
    return true;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setStatus("loading");

    const message = Object.entries(form)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value || "—"}`)
      .join("\n");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.primaryContactName,
          company: form.organizationName,
          email: form.workEmail,
          plan: "Evidence Readiness Assessment",
          role: "Evidence Readiness Assessment",
          primaryNeed: form.claimStatement || form.evidenceProblems.join(", "),
          message,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <MarketingLayout>
        <section className="bg-white py-12 sm:py-20">
          <div className="mx-auto max-w-xl px-4 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
            <h1 className="mt-6 text-3xl font-extrabold text-[#0A1F44]">Assessment request received.</h1>
            <p className="mt-3 text-slate-600">We will review your claim and evidence needs and follow up with next steps.</p>
          </div>
        </section>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <section className="border-b border-slate-200 bg-white py-7 md:py-12">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <h1 className="font-serif text-3xl font-bold leading-tight text-[#0A1F44] sm:text-4xl md:text-5xl">Evidence Readiness Assessment</h1>
          <p className="mt-3 text-lg font-semibold text-[#0A1F44] sm:mt-4 sm:text-xl">Tell us about your claim and evidence needs.</p>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-700">
            We will help identify evidence strengths, source-support gaps, confirmation status, reporting limitations, and next steps.
          </p>
          <p className="mt-4 rounded-lg border border-[#c88914]/30 bg-[#fff9eb] px-4 py-3 text-sm leading-relaxed text-[#0A1F44]">
            Synerxus supports evidence organization, reporting preparation, and assurance preparation. Synerxus does not provide formal assurance, legal advice, compliance guarantees, SDG impact certification, or causal attribution.
          </p>
        </div>
      </section>

      <section className="bg-white py-6 md:py-10">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <form onSubmit={submit} className="space-y-3">
            {sections.map((section, index) => {
              const isOpen = openSection === index;
              const complete = Boolean(sectionComplete[index]);
              return (
                <div key={section} className="rounded-lg border border-slate-200 bg-white shadow-sm sm:rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOpenSection(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c88914] focus-visible:ring-offset-2 sm:rounded-xl sm:px-5 sm:py-4"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-[#0A1F44]">{section}</p>
                      <p className={`mt-0.5 text-xs font-semibold ${complete ? "text-emerald-700" : "text-slate-400"}`}>
                        {complete ? "Complete" : "Not complete"}
                      </p>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
                      {index === 0 && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <FieldLabel required>Organization Name</FieldLabel>
                            <input value={form.organizationName} onChange={(e) => set("organizationName", e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[#0A1F44] focus:outline-none" />
                            {errors.organizationName && <p className="mt-1 text-xs font-semibold text-red-600">{errors.organizationName}</p>}
                          </div>
                          <div><FieldLabel>Website</FieldLabel><input value={form.website} onChange={(e) => set("website", e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[#0A1F44] focus:outline-none" /></div>
                          <div><FieldLabel>Organization Type</FieldLabel><input value={form.organizationType} onChange={(e) => set("organizationType", e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[#0A1F44] focus:outline-none" /></div>
                          <div><FieldLabel>Country / Region</FieldLabel><input value={form.countryRegion} onChange={(e) => set("countryRegion", e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[#0A1F44] focus:outline-none" /></div>
                          <div><FieldLabel>Organization Size</FieldLabel><input value={form.organizationSize} onChange={(e) => set("organizationSize", e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[#0A1F44] focus:outline-none" /></div>
                          <div>
                            <FieldLabel required>Primary Contact Name</FieldLabel>
                            <input value={form.primaryContactName} onChange={(e) => set("primaryContactName", e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[#0A1F44] focus:outline-none" />
                            {errors.primaryContactName && <p className="mt-1 text-xs font-semibold text-red-600">{errors.primaryContactName}</p>}
                          </div>
                          <div className="sm:col-span-2">
                            <FieldLabel required>Work Email</FieldLabel>
                            <input value={form.workEmail} onChange={(e) => set("workEmail", e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[#0A1F44] focus:outline-none" />
                            {errors.workEmail && <p className="mt-1 text-xs font-semibold text-red-600">{errors.workEmail}</p>}
                          </div>
                        </div>
                      )}

                      {index === 1 && (
                        <div>
                          <label className="text-sm font-extrabold text-[#0A1F44]">Please enter the claim or reporting statement you need evidence to support.</label>
                          <textarea
                            value={form.claimStatement}
                            onChange={(e) => set("claimStatement", e.target.value)}
                            placeholder="Example: “Our partners delivered solar maintenance training to community members during Q2.”"
                            className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0A1F44] focus:outline-none"
                          />
                          <p className="mt-5 text-sm font-extrabold text-[#0A1F44]">Claim type</p>
                          <CheckGroup options={claimTypes} selected={form.claimTypes} onToggle={(v) => set("claimTypes", toggle(form.claimTypes, v))} />
                        </div>
                      )}

                      {index === 2 && <CheckGroup options={programTypes} selected={form.programTypes} onToggle={(v) => set("programTypes", toggle(form.programTypes, v))} />}
                      {index === 3 && (
                        <div>
                          <p className="text-sm font-extrabold text-[#0A1F44]">What is your biggest evidence challenge right now?</p>
                          <CheckGroup options={evidenceProblems} selected={form.evidenceProblems} onToggle={(v) => set("evidenceProblems", toggle(form.evidenceProblems, v))} />
                        </div>
                      )}
                      {index === 4 && <CheckGroup options={currentSources} selected={form.currentSources} onToggle={(v) => set("currentSources", toggle(form.currentSources, v))} />}
                      {index === 5 && (
                        <div className="grid gap-5">
                          <div>
                            <p className="text-sm font-extrabold text-[#0A1F44]">Who confirms or reviews your evidence today?</p>
                            <CheckGroup options={confirmationWho} selected={form.confirmationWho} onToggle={(v) => set("confirmationWho", toggle(form.confirmationWho, v))} />
                          </div>
                          <div>
                            <label className="text-sm font-extrabold text-[#0A1F44]">How is confirmation documented?</label>
                            <select value={form.confirmationHow} onChange={(e) => set("confirmationHow", e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[#0A1F44] focus:outline-none">
                              <option value="">Select...</option>
                              {confirmationHow.map((option) => <option key={option}>{option}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                      {index === 6 && (
                        <div className="grid gap-6">
                          <div>
                            <p className="text-sm font-extrabold text-[#0A1F44]">Reporting Context</p>
                            <CheckGroup options={reportingContexts} selected={form.reportingContexts} onToggle={(v) => set("reportingContexts", toggle(form.reportingContexts, v))} />
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-[#0A1F44]">Mapping Interests</p>
                            <CheckGroup options={mappingInterests} selected={form.mappingInterests} onToggle={(v) => set("mappingInterests", toggle(form.mappingInterests, v))} />
                          </div>
                        </div>
                      )}
                      {index === 7 && <CheckGroup options={evidenceScope} selected={form.evidenceScope} onToggle={(v) => set("evidenceScope", toggle(form.evidenceScope, v))} />}
                      {index === 8 && <CheckGroup options={reportOutputs} selected={form.reportOutputs} onToggle={(v) => set("reportOutputs", toggle(form.reportOutputs, v))} />}
                      {index === 9 && (
                        <div className="grid gap-4">
                          <div><FieldLabel>When do you need this solution?</FieldLabel><input value={form.solutionTiming} onChange={(e) => set("solutionTiming", e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[#0A1F44] focus:outline-none" /></div>
                          <div><FieldLabel>Is there a specific deadline?</FieldLabel><input value={form.deadline} onChange={(e) => set("deadline", e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[#0A1F44] focus:outline-none" /></div>
                          <div><FieldLabel>Comments</FieldLabel><textarea value={form.comments} onChange={(e) => set("comments", e.target.value)} className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0A1F44] focus:outline-none" /></div>
                        </div>
                      )}
                      {index === 10 && (
                        <div>
                          <label className="flex cursor-pointer gap-3 rounded-lg border border-[#c88914]/40 bg-[#fff9eb] p-4 text-sm leading-relaxed text-[#0A1F44]">
                            <input type="checkbox" checked={form.boundaryAccepted} onChange={(e) => set("boundaryAccepted", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#c88914]" />
                            <span>I acknowledge and agree to the boundary statement: {BOUNDARY}</span>
                          </label>
                          {errors.boundaryAccepted && <p className="mt-2 text-xs font-semibold text-red-600">{errors.boundaryAccepted}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {status === "error" && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">The request could not be sent. Please try again.</p>}

            <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:rounded-xl sm:p-5">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <LockKeyhole className="h-3 w-3" /> Required fields and boundary acknowledgment must be complete before submission.
              </p>
              <Button type="submit" loading={status === "loading"} className="w-full bg-[#c88914] text-white hover:bg-[#a9720f] sm:w-auto">
                <ShieldCheck className="h-4 w-4" /> Request Evidence Readiness Assessment
              </Button>
            </div>
          </form>
        </div>
      </section>
    </MarketingLayout>
  );
}
