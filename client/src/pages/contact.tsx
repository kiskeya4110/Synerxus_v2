import { type FormEvent, type ReactNode, useState } from "react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";

const BOUNDARY_STATEMENT =
  "Synerxus provides structured evidence records for reporting, internal review, and assurance preparation. Synerxus does not provide formal assurance opinions, guarantee regulatory compliance, certify SDG impact, independently verify all partner-reported reach figures, or establish causal attribution.";

const useCases = [
  ["Corporate Volunteering", "Connect volunteer activity records to partner confirmation and reviewable evidence."],
  ["Community Investment", "Organize community-program activity, partner outputs, and source documentation for reporting support."],
  ["NGO / Partner Confirmation", "Confirm partner activity and output records and identify what source support exists."],
  ["Assurance Preparation", "Organize evidence records, source references, exceptions, and limitations for internal review or assurance preparation."],
  ["SDG / Framework Mapping", "Map activity records to SDGs, frameworks, or internal categories without treating mapping as proof of impact."],
] as const;

const checkboxes = {
  claimNeed: [
    "Volunteer hours",
    "Community investment activity",
    "Partner-delivered outputs",
    "Beneficiary / reach figures",
    "Training or capacity-building activity",
    "Infrastructure / installation completion",
    "Grant-funded activity",
    "SDG-aligned activity",
    "Internal ESG / CSR reporting",
    "Other",
  ],
  programType: [
    "Employee Volunteering",
    "Community Investment",
    "Grantmaking",
    "Capacity Building",
    "NGO Partnership",
    "Supplier / Community Program",
    "City or Coalition Program",
    "Other",
  ],
  evidenceProblem: [
    "Data is scattered across systems",
    "Hard to confirm partner activity and outputs",
    "Missing source documentation",
    "Partner-reported figures are mixed with confirmed records",
    "SDG / framework mapping lacks evidence support",
    "Inconsistent reporting across partners or programs",
    "Time-consuming to prepare reports",
    "Other",
  ],
  evidenceSources: [
    "Spreadsheets",
    "Surveys / forms",
    "Partner reports",
    "CRM / PM tools",
    "Photos / documents",
    "Attendance logs",
    "Inspection records",
    "Training logs",
    "Financial systems",
    "Other",
  ],
  confirmationWorkflow: [
    "Corporate team",
    "NGO / implementation partner",
    "Program manager",
    "Volunteer / employee",
    "Third-party evaluator",
    "No formal confirmation process",
    "Not sure",
    "Other",
  ],
  reportingContext: [
    "Internal ESG / CSR reporting",
    "Board or executive reporting",
    "Grant / funder reporting",
    "Public sustainability report",
    "Assurance preparation",
    "Legal / compliance review",
    "Other",
  ],
  mappingInterests: [
    "UN SDGs",
    "GRI 413",
    "ESRS S3",
    "SASB / ISSB",
    "Internal reporting categories",
    "Other",
  ],
  verificationScope: ["Projects", "Partners / NGOs", "Volunteers", "Countries / locations"],
  reportOutput: [
    "Evidence Summary",
    "Board Summary",
    "Assurance Preparation Package",
    "Claim-to-Evidence Export",
    "Source Artifact Index",
    "Exception Summary",
  ],
  timingDrivers: [
    "Reporting deadline",
    "Board meeting",
    "Assurance preparation",
    "Grant / funder deadline",
    "Program launch",
    "Internal review",
    "Other",
  ],
} as const;

const singleChoiceOptions = {
  confirmationNeed: [
    "Partner confirmation",
    "Internal review",
    "Independent review",
    "Source-document review",
    "Not sure",
  ],
  approximateRecords: [
    "Fewer than 50",
    "50-250",
    "250-1,000",
    "1,000+",
    "Not sure",
  ],
  approximatePartners: [
    "1",
    "2-5",
    "6-20",
    "20+",
    "Not sure",
  ],
} as const;

export default function ContactPage() {
  const [form, setForm] = useState({
    organizationName: "",
    website: "",
    sector: "",
    region: "",
    contactName: "",
    workEmail: "",
    claimStatement: "",
    confirmationNeed: "",
    approximateRecords: "",
    approximatePartners: "",
    targetDate: "",
    comments: "",
    acknowledgement: false,
  });
  const [selected, setSelected] = useState<Record<keyof typeof checkboxes, string[]>>({
    claimNeed: [],
    programType: [],
    evidenceProblem: [],
    evidenceSources: [],
    confirmationWorkflow: [],
    reportingContext: [],
    mappingInterests: [],
    verificationScope: [],
    reportOutput: [],
    timingDrivers: [],
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
          frameworks: selected.mappingInterests.join(", "),
          evidenceMaturity: selected.evidenceSources.join(", "),
          claimVolume: selected.reportOutput.join(", "),
          timeline: [selected.timingDrivers.join(", "), form.targetDate].filter(Boolean).join(" | "),
          plan: "Evidence Readiness Assessment",
          message: [
            `Website: ${form.website}`,
            `Region: ${form.region}`,
            `Claim / Reporting Need: ${selected.claimNeed.join(", ")}`,
            `Example Claim or Reporting Statement: ${form.claimStatement}`,
            `Program Type: ${selected.programType.join(", ")}`,
            `Evidence Problem: ${selected.evidenceProblem.join(", ")}`,
            `Current Evidence Sources: ${selected.evidenceSources.join(", ")}`,
            `Confirmation Workflow: ${selected.confirmationWorkflow.join(", ")}`,
            `Confirmation / Review Needed: ${form.confirmationNeed}`,
            `Reporting Context: ${selected.reportingContext.join(", ")}`,
            `Mapping Interests: ${selected.mappingInterests.join(", ")}`,
            `Evidence Scope: ${selected.verificationScope.join(", ")}`,
            `Approximate Activity or Evidence Records: ${form.approximateRecords}`,
            `Approximate Partners or Locations: ${form.approximatePartners}`,
            `Report Output Needed: ${selected.reportOutput.join(", ")}`,
            `Timing Driver: ${selected.timingDrivers.join(", ")}`,
            `Target Date: ${form.targetDate}`,
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
            EVIDENCE READINESS ASSESSMENT
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
            Evidence Readiness Assessment
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-relaxed text-slate-700">
            Use Cases &amp; Setup Form
          </p>
          <p className="mt-3 max-w-4xl text-base leading-relaxed text-slate-600">
            This assessment helps Synerxus understand what claims you need to
            support, where the evidence currently lives, who can confirm it,
            what remains unverified, and what type of report or review package
            you need.
          </p>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-[0.9fr_1.1fr] md:px-8">
          <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-extrabold text-[#0A1F44]">
              Describe Your Evidence Needs
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
              This assessment helps Synerxus identify your claim types,
              evidence gaps, confirmation needs, source documentation, reporting
              context, and review boundaries.
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

              <CheckboxGroup
                title="Claim / Reporting Need"
                helperText="What type of claim or reporting statement are you trying to support with evidence?"
                group="claimNeed"
                values={selected.claimNeed}
                onToggle={toggle}
              >
                <Field
                  label="Example claim or reporting statement"
                  value={form.claimStatement}
                  placeholder={"Example: \"Our partners delivered solar maintenance training to community members during Q2.\""}
                  onChange={(value) => update("claimStatement", value)}
                />
              </CheckboxGroup>

              <CheckboxGroup title="Program Type" group="programType" values={selected.programType} onToggle={toggle} />
              <CheckboxGroup title="Evidence Problem" group="evidenceProblem" values={selected.evidenceProblem} onToggle={toggle} />
              <CheckboxGroup
                title="Current Evidence Sources"
                helperText="Select where supporting records, partner submissions, or source artifacts currently live."
                group="evidenceSources"
                values={selected.evidenceSources}
                onToggle={toggle}
              />
              <CheckboxGroup
                title="Confirmation Workflow"
                helperText="Who currently confirms or reviews activity and output records?"
                group="confirmationWorkflow"
                values={selected.confirmationWorkflow}
                onToggle={toggle}
              >
                <ChoiceGroup
                  title="What type of confirmation or review do you need?"
                  name="confirmationNeed"
                  options={singleChoiceOptions.confirmationNeed}
                  value={form.confirmationNeed}
                  onChange={(value) => update("confirmationNeed", value)}
                />
              </CheckboxGroup>
              <FormSection
                title="Mapping / Reporting Context"
                helperText="SDG and framework mapping supports reporting context. It does not certify impact, prove causal contribution, or determine compliance."
              >
                <CheckboxOptions
                  title="Reporting Context"
                  group="reportingContext"
                  values={selected.reportingContext}
                  onToggle={toggle}
                />
                <CheckboxOptions
                  title="Mapping Interests"
                  group="mappingInterests"
                  values={selected.mappingInterests}
                  onToggle={toggle}
                />
              </FormSection>
              <CheckboxGroup title="Evidence Scope" group="verificationScope" values={selected.verificationScope} onToggle={toggle}>
                <div className="grid gap-4 md:grid-cols-2">
                  <ChoiceGroup
                    title="Approximate number of activity or evidence records"
                    name="approximateRecords"
                    options={singleChoiceOptions.approximateRecords}
                    value={form.approximateRecords}
                    onChange={(value) => update("approximateRecords", value)}
                  />
                  <ChoiceGroup
                    title="Approximate number of partners or locations"
                    name="approximatePartners"
                    options={singleChoiceOptions.approximatePartners}
                    value={form.approximatePartners}
                    onChange={(value) => update("approximatePartners", value)}
                  />
                </div>
              </CheckboxGroup>
              <CheckboxGroup
                title="Report Output Needed"
                helperText="Select the outputs you need for reporting, internal review, or assurance preparation."
                group="reportOutput"
                values={selected.reportOutput}
                onToggle={toggle}
              />

              <FormSection title="Timing">
                <CheckboxOptions
                  title="What is driving the timing?"
                  group="timingDrivers"
                  values={selected.timingDrivers}
                  onToggle={toggle}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Target date" type="date" value={form.targetDate} onChange={(value) => update("targetDate", value)} />
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
                Request Evidence Readiness Assessment
              </Button>
            </form>
          )}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

function FormSection({
  title,
  helperText,
  children,
}: {
  title: string;
  helperText?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <h2 className="text-sm font-extrabold text-[#0A1F44]">{title}</h2>
        {helperText ? (
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{helperText}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function CheckboxOptions({
  title,
  group,
  values,
  onToggle,
}: {
  title?: string;
  group: keyof typeof checkboxes;
  values: string[];
  onToggle: (group: keyof typeof checkboxes, value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {title ? (
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          {title}
        </h3>
      ) : null}
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
    </div>
  );
}

function CheckboxGroup({
  title,
  helperText,
  group,
  values,
  onToggle,
  children,
}: {
  title: string;
  helperText?: string;
  group: keyof typeof checkboxes;
  values: string[];
  onToggle: (group: keyof typeof checkboxes, value: string) => void;
  children?: ReactNode;
}) {
  return (
    <FormSection title={title} helperText={helperText}>
      <CheckboxOptions group={group} values={values} onToggle={onToggle} />
      {children ? <div className="mt-2 grid gap-3">{children}</div> : null}
    </FormSection>
  );
}

function ChoiceGroup({
  title,
  name,
  options,
  value,
  onChange,
}: {
  title: string;
  name: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <legend className="px-1 text-sm font-bold text-slate-700">{title}</legend>
      <div className="grid gap-2">
        {options.map((item) => (
          <label key={item} className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="radio"
              name={name}
              checked={value === item}
              onChange={() => onChange(item)}
              className="h-4 w-4 border-slate-300"
            />
            {item}
          </label>
        ))}
      </div>
    </fieldset>
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
