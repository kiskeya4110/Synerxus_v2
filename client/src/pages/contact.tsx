import { FormEvent, useState } from "react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";

const organizationTypes = [
  "Company",
  "NGO",
  "Sustainability consultant",
  "Assurance / advisory firm",
  "Investor",
  "Public agency",
  "Supplier / implementation partner",
  "Other",
];

const primaryNeeds = [
  "ESG evidence organization",
  "Regulatory readiness assessment",
  "Partner confirmation",
  "Evidence Ladder scoring",
  "Framework mapping",
  "Supplier evidence",
  "Greenwashing risk reduction",
  "Infrastructure or community benefit reporting",
  "Other",
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    organizationType: "Company",
    primaryNeed: "Regulatory readiness assessment",
    frameworks: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
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
          name: form.name,
          company: form.company,
          email: form.email,
          role: form.role,
          organizationType: form.organizationType,
          primaryNeed: form.primaryNeed,
          frameworks: form.frameworks,
          plan: "Regulatory Readiness Assessment",
          message: form.message,
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
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
            Request Assessment
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
            Assess the defensibility of your ESG claims.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
            Tell us about the ESG claims, programs, partners, or reporting
            workflows you want to strengthen.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
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
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name" required value={form.name} onChange={(value) => update("name", value)} />
                <Field label="Work email" required type="email" value={form.email} onChange={(value) => update("email", value)} />
                <Field label="Company" required value={form.company} onChange={(value) => update("company", value)} />
                <Field label="Role" value={form.role} onChange={(value) => update("role", value)} />
              </div>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Organization type
                <select
                  value={form.organizationType}
                  onChange={(event) => update("organizationType", event.target.value)}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900"
                >
                  {organizationTypes.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Primary need
                <select
                  value={form.primaryNeed}
                  onChange={(event) => update("primaryNeed", event.target.value)}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900"
                >
                  {primaryNeeds.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <Field
                label="Reporting frameworks in scope"
                value={form.frameworks}
                onChange={(value) => update("frameworks", value)}
                placeholder="CSRD / ESRS, GRI, SASB / ISSB, SDGs..."
              />

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Message
                <textarea
                  value={form.message}
                  onChange={(event) => update("message", event.target.value)}
                  rows={5}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
                />
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
                Request Assessment
              </Button>
            </form>
          )}
        </div>
      </section>
    </MarketingLayout>
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
