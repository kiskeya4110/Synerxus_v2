import { type FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const boundary = "Synerxus provides structured evidence records for reporting, internal review, and assurance preparation. Synerxus does not provide formal assurance opinions, guarantee regulatory compliance, certify SDG impact, independently verify all partner-reported reach figures, or establish causal attribution.";

const sections = [
  ["Organization Profile", ["Organization name", "Primary contact name", "Work email", "Organization type", "Country / region of primary operation", "Organization size"]],
  ["Claim / Reporting Need", ["Example claim or reporting statement"]],
  ["Program Type", ["Corporate volunteering", "Community investment", "Partner-delivered outputs", "Supplier / value-chain activity", "Grant-funded activity", "SDG-aligned activity", "Other"]],
  ["Evidence Problem", ["Fragmented evidence", "Inconsistent data quality", "Partner-reported figures need confirmation", "Missing source documentation", "Unclear limitations", "Other"]],
  ["Current Evidence Sources", ["Partner reports", "Spreadsheets", "Surveys / assessments", "Administrative data", "Monitoring data", "Shared drives", "Other"]],
  ["Confirmation Workflow", ["Internal program owner", "NGO or delivery partner", "Supplier", "Funder or grant manager", "No formal confirmation workflow yet", "Other"]],
  ["Mapping / Reporting Context", ["Internal ESG / CSR reporting", "GRI", "ESRS / CSRD", "ISSB", "TCFD", "IFRS S2", "UN SDGs", "Assurance preparation", "Other"]],
  ["Evidence Scope", ["One claim", "One program", "Multiple programs", "Multiple partners", "Multiple countries or locations", "Historical reporting period"]],
  ["Report Output Needed", ["Evidence readiness assessment", "Sample evidence summary", "Claim-to-evidence register", "Source artifact index", "Exception summary", "Assurance-preparation export"]],
  ["Timing", ["Immediate", "Within 30 days", "Within 90 days", "This reporting cycle", "Planning for future reporting"]],
];

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    const data = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("Primary contact name") || data.get("Organization name") || "Assessment request",
          company: data.get("Organization name") || "",
          email: data.get("Work email") || "",
          role: "Evidence Readiness Assessment",
          primaryNeed: "Evidence Readiness Assessment",
          message: Array.from(data.entries()).map(([key, value]) => `${key}: ${value}`).join("\n"),
        }),
      });
      if (!res.ok) throw new Error("Failed to send request");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <MarketingLayout>
      <section className="border-b border-slate-200 bg-white py-10 md:py-12">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:px-8 lg:grid-cols-[1fr_260px] lg:items-center">
          <div>
            <h1 className="font-serif text-4xl font-bold text-[#0A1F44] md:text-5xl">Evidence Readiness Assessment</h1>
            <p className="mt-5 max-w-2xl text-xl leading-relaxed text-[#0A1F44]">Tell us about your claim and evidence needs. We will help identify strengths, gaps, and next steps.</p>
          </div>
          <img src="/synerxus-esg-logo.png" alt="Synerxus" className="hidden h-40 w-auto justify-self-end lg:block" />
        </div>
      </section>

      <section className="bg-white py-8 md:py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          {status === "success" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-emerald-950"><h2 className="text-xl font-extrabold">Request received</h2><p className="mt-2">A Synerxus team member will follow up.</p></div>
          ) : (
            <form onSubmit={submit} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
              {sections.map(([title, fields], index) => (
                <section key={title as string} className="grid gap-4 border-b border-slate-200 p-4 md:grid-cols-[42px_1fr]">
                  <span className="flex h-8 w-8 items-center justify-center rounded bg-[#061A36] text-sm font-extrabold text-white">{index + 1}</span>
                  <div>
                    <h2 className="text-base font-extrabold text-[#0A1F44]">{title as string}</h2>
                    {title === "Claim / Reporting Need" ? <textarea name="Example claim or reporting statement" required placeholder="Example: Our partners delivered solar maintenance training to community members during Q2." className="mt-3 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm" /> : null}
                    {title !== "Claim / Reporting Need" ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        {(fields as string[]).map((field, fieldIndex) => fieldIndex < 3 && index === 0 ? (
                          <label key={field} className="grid gap-1 text-xs font-bold text-[#0A1F44]">{field}<input required={field.includes("name") || field.includes("email")} name={field} type={field.includes("email") ? "email" : "text"} className="h-9 rounded border border-slate-300 px-3 text-sm font-medium" /></label>
                        ) : index === 0 ? (
                          <label key={field} className="grid gap-1 text-xs font-bold text-[#0A1F44]">{field}<select name={field} className="h-9 rounded border border-slate-300 px-3 text-sm font-medium"><option /> <option>Company</option><option>NGO / nonprofit</option><option>Foundation / funder</option><option>Supplier</option><option>Other</option></select></label>
                        ) : (
                          <label key={field} className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" name={title as string} value={field} className="h-4 w-4" />{field}</label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              ))}

              <section className="grid gap-4 border-b border-slate-200 p-4 md:grid-cols-[42px_1fr]">
                <span className="flex h-8 w-8 items-center justify-center rounded bg-[#061A36] text-sm font-extrabold text-white">11</span>
                <div><h2 className="text-base font-extrabold text-[#0A1F44]">Boundary Acknowledgment</h2><label className="mt-3 flex gap-3 rounded-md border border-[#c88914]/40 bg-[#fff9eb] p-4 text-sm leading-relaxed text-[#0A1F44]"><input required type="checkbox" name="Boundary acknowledgment" value="Accepted" className="mt-1 h-4 w-4" /><span>I acknowledge and agree to the boundary statement: {boundary}</span></label></div>
              </section>

              {status === "error" ? <p className="mx-4 mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">The request could not be sent. Please try again.</p> : null}
              <div className="p-5 text-center"><Button type="submit" loading={status === "loading"} className="bg-[#061A36] px-10 text-white hover:bg-[#102b5a]">Request Evidence Readiness Assessment</Button><p className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" />Your information is secure and only used to respond to your assessment request.</p></div>
            </form>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}
