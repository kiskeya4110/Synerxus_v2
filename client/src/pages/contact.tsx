import { type FormEvent, type ReactNode, useState } from "react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";

const BOUNDARY_STATEMENT =
  "Synerxus provides structured evidence records for reporting and assurance preparation. Synerxus does not provide formal assurance opinions, guarantee regulatory compliance, or establish causal attribution.";

const useCases = [
  ["Corporate Volunteering", "Track employee volunteering hours and evidence records."],
  ["Community Investment", "Capture and report on community programs and outputs."],
  ["NGO / Partner Verification", "Verify partner capacity, activities, and output data."],
  ["Assurance Preparation", "Organize evidence for third-party assurance and audit preparation."],
  ["SDG / Framework Mapping", "Map outputs to global goals and reporting frameworks."],
] as const;

const checkboxes = {
  programType: ["Employee Volunteering", "Community Investment", "Grantmaking", "Capacity Building", "Other"],
  evidenceProblem: [
    "Data is scattered across systems",
    "Hard to verify partner impact",
    "Lack of audit-ready documentation",
    "Inconsistent reporting",
    "Time-consuming to prepare reports",
    "Other",
  ],
  evidenceSources: ["Spreadsheets", "Surveys / Forms", "Partner Reports", "CRM / PM Tools", "Financial Systems", "Photos / Documents", "Other"],
  frameworks: ["CSRD / ESRS", "GRI 413", "ISAE 3000", "UN SDGs", "SASB / ISSB", "Internal Reporting", "Other"],
  verificationScope: ["Projects", "Partners / NGOs", "Volunteers", "Countries / Locations"],
  reportOutput: ["Verified Evidence Summary", "Board Summary", "Assurance Preparation Package"],
} as const;

export default function ContactPage() {
  const [form, setForm] = useState({
    organizationName: "",
    website: "",
    sector: "",
    region: "",
    contactName: "",
    workEmail: "",
    timing: "",
    comments: "",
    acknowledgement: false,
  });
  const [selected, setSelected] = useState<Record<keyof typeof checkboxes, string[]>>({
    programType: [],
    evidenceProblem: [],
    evidenceSources: [],
    frameworks: [],
    verificationScope: [],
    reportOutput: [],
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggle = (group: keyof typeof checkboxes, value: string) => {
    setSelected((current) => {
      const values = current[group];
      return {
        ...current,
        [group]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
      };
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.contactName,
          company: form.organizationName,
          email: form.workEmail,
          role: form.sector,
          organizationType: form.sector,
          primaryNeed: "Evidence Readiness Assessment",
          frameworks: selected.frameworks.join(", "),
          evidenceMaturity: selected.evidenceSources.join(", "),
          claimVolume: selected.reportOutput.join(", "),
          timeline: form.timing,
          plan: "Evidence Readiness Assessment",
          message: [
            `Website: ${form.website}`,
            `Region: ${form.region}`,
            `Program Type: ${selected.programType.join(", ")}`,
            `Evidence Problem: ${selected.evidenceProblem.join(", ")}`,
            `Current Evidence Sources: ${selected.evidenceSources.join(", ")}`,
            `Verification Scope: ${selected.verificationScope.join(", ")}`,
            `Report Output Needed: ${selected.reportOutput.join(", ")}`,
            `Comments: ${form.comments}`,
            `Boundary acknowledgement: ${form.acknowledgement ? "Accepted" : "Not accepted"}`,
          ].join("\n"),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send request");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to send request");
    }
  };

  return (
    <MarketingLayout>
      <section className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
            Evidence Readiness Assessment
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
            Evidence Readiness Assessment
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
            Use Cases &amp; Setup Form
          </p>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-[0.9fr_1.1fr] md:px-8">
          <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-extrabold text-[#0A1F44]">
              Configure Your Evidence Workflow
            </h2>
            <div className="mt-5 grid gap-3">
              {useCases.map(([title, description]) => (
                <div key={title} className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-extrabold text-[#0A1F44]">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              This assessment helps us recommend the right configuration, data model, and evidence workflows for your organization.
            </p>
          </aside>

          <div>
          {status === "success" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <h2 className="text-xl font-extrabold text-emerald-950">
                Request received
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-emerald-900">
                Thank you. Your assessment request has been received. A Synerxus
                team member will follow up.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <FormSection title="Organization Profile">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Organization Name" required value={form.organizationName} onChange={(value) => update("organizationName", value)} />
                <Field label="Website" value={form.website} onChange={(value) => update("website", value)} />
                <Field label="Sector" value={form.sector} onChange={(value) => update("sector", value)} />
                <Field label="Region" value={form.region} onChange={(value) => update("region", value)} />
                <Field label="Contact Name" required value={form.contactName} onChange={(value) => update("contactName", value)} />
                <Field label="Work Email" required type="email" value={form.workEmail} onChange={(value) => update("workEmail", value)} />
              </div>
              </FormSection>

              <CheckboxGroup title="Program Type" group="programType" values={selected.programType} onToggle={toggle} />
              <CheckboxGroup title="Evidence Problem" group="evidenceProblem" values={selected.evidenceProblem} onToggle={toggle} />
              <CheckboxGroup title="Current Evidence Sources" group="evidenceSources" values={selected.evidenceSources} onToggle={toggle} />
              <CheckboxGroup title="Frameworks of Interest" group="frameworks" values={selected.frameworks} onToggle={toggle} />
              <CheckboxGroup title="Verification Scope" group="verificationScope" values={selected.verificationScope} onToggle={toggle} />
              <CheckboxGroup title="Report Output Needed" group="reportOutput" values={selected.reportOutput} onToggle={toggle} />

              <FormSection title="Timing">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="When do you need this solution?" value={form.timing} onChange={(value) => update("timing", value)} />
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    Comments
                    <textarea
                      value={form.comments}
                      onChange={(event) => update("comments", event.target.value)}
                      rows={4}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
                    />
                  </label>
                </div>
              </FormSection>

              <label className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-950">
                <input
                  required
                  type="checkbox"
                  checked={form.acknowledgement}
                  onChange={(event) => update("acknowledgement", event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>I acknowledge and agree to the boundary statement: {BOUNDARY_STATEMENT}</span>
              </label>

              {status === "error" && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                loading={status === "loading"}
                className="bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]"
              >
                Request Evidence Assessment
              </Button>
            </form>
          )}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-sm font-extrabold text-[#0A1F44]">{title}</h2>
      {children}
    </section>
  );
}

function CheckboxGroup({
  title,
  group,
  values,
  onToggle,
}: {
  title: string;
  group: keyof typeof checkboxes;
  values: string[];
  onToggle: (group: keyof typeof checkboxes, value: string) => void;
}) {
  return (
    <FormSection title={title}>
      <div className="grid gap-2 md:grid-cols-2">
        {checkboxes[group].map((item) => (
          <label key={item} className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={values.includes(item)}
              onChange={() => onToggle(group, item)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {item}
          </label>
        ))}
      </div>
    </FormSection>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900"
      />
    </label>
  );
}
