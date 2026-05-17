import { ArrowRight, CheckCircle2, Database, FileDown, FileText, GitBranch, LockKeyhole, ShieldAlert, Upload, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

type Status = "Available now" | "In development" | "On roadmap";

type Capability = {
  title: string;
  status: Status;
  body: string;
  icon: LucideIcon;
};

type FlowBox = {
  title: string;
  items: string[];
};

const flowBoxes: FlowBox[] = [
  {
    title: "Your existing data sources",
    items: [
      "Partner reports",
      "Spreadsheets",
      "Source documents",
      "Internal tracking systems",
      "Supplier submissions",
      "NGO data",
    ],
  },
  {
    title: "Synerxus evidence layer",
    items: [
      "Claim register",
      "Evidence packets",
      "Confirmation log",
      "Exception tracking",
      "Assurance-preparation export",
    ],
  },
  {
    title: "Your reporting and assurance workflow",
    items: [
      "ESG reporting tools",
      "Assurance provider review",
      "Board summaries",
      "Funder reports",
      "Disclosure packages",
    ],
  },
];

const inputMethods: Capability[] = [
  {
    title: "Manual entry",
    status: "Available now",
    icon: FileText,
    body: "Team members can create records directly in the Synerxus interface. No integration is required to start an evidence-readiness workflow.",
  },
  {
    title: "File upload",
    status: "Available now",
    icon: Upload,
    body: "The current shared upload service supports image artifacts: JPG, PNG, WebP, and GIF. Upload support for PDFs, spreadsheets, and Word documents as source artifacts is in development.",
  },
  {
    title: "Partner submission portal",
    status: "In development",
    icon: GitBranch,
    body: "Partners and NGOs will be able to submit confirmation and source artifacts directly through a lightweight portal without requiring a full Synerxus account.",
  },
  {
    title: "API connection",
    status: "On roadmap",
    icon: Database,
    body: "A structured API will allow evidence records to be created and updated from external systems. Timeline: to be confirmed.",
  },
  {
    title: "Spreadsheet import",
    status: "On roadmap",
    icon: FileDown,
    body: "Bulk import of claim records from structured CSV or Excel templates is not currently available in the build reviewed for this page.",
  },
];

const outputMethods: Capability[] = [
  {
    title: "Evidence Summary PDF",
    status: "In development",
    icon: FileText,
    body: "The current platform generates Verified Evidence Summary reports as HTML/printable browser output. Direct PDF generation for claim-level evidence summaries is in development.",
  },
  {
    title: "Assurance-Preparation Export",
    status: "In development",
    icon: FileDown,
    body: "The current evidence summary output includes evidence records, confirmation context, exceptions, and limitations. A packaged export specifically structured for assurance provider handoff is in development.",
  },
  {
    title: "Claim Register Export",
    status: "On roadmap",
    icon: Database,
    body: "Full export of a claim register with evidence status per claim in CSV or another structured format is not currently available in the build reviewed for this page.",
  },
  {
    title: "Framework Mapping Export",
    status: "On roadmap",
    icon: GitBranch,
    body: "Export of SDG, GRI, ESRS, and ISSB mapping context per claim, with limitation notes preserved, is on the roadmap.",
  },
];

const securityItems: Capability[] = [
  {
    title: "Data storage",
    status: "Available now",
    icon: Database,
    body: "Application records are stored in PostgreSQL. Uploaded image artifacts are processed with Sharp and stored on the application server filesystem under the uploads directory in the current build.",
  },
  {
    title: "Access controls",
    status: "Available now",
    icon: LockKeyhole,
    body: "The application uses authenticated routes, user roles, and organization-scoped checks on many operational endpoints. File upload and deletion routes require authentication and validate user or organization ownership.",
  },
  {
    title: "Data export and deletion",
    status: "Available now",
    icon: FileDown,
    body: "Some report and activity exports are available today, including CSV and HTML/printable evidence summary outputs. User-account deletion exists; organization-wide deletion and a complete claim-and-evidence export policy should be confirmed during procurement review.",
  },
  {
    title: "SOC 2 certification",
    status: "On roadmap",
    icon: ShieldAlert,
    body: "Synerxus does not currently claim SOC 2 certification.",
  },
  {
    title: "SSO / SAML",
    status: "On roadmap",
    icon: LockKeyhole,
    body: "SSO and SAML are listed as planned capabilities and are not currently claimed as available.",
  },
  {
    title: "Data Processing Agreement",
    status: "In development",
    icon: FileText,
    body: "Terms reference that enterprise customers may require a separate Data Processing Addendum. A standard procurement-ready DPA should be treated as in development unless confirmed during assessment intake.",
  },
];

function StatusBadge({ status }: { status: Status }) {
  const classes =
    status === "Available now"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "In development"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${classes}`}>
      {status}
    </span>
  );
}

function CapabilityCard({ item }: { item: Capability }) {
  const Icon = item.icon;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#0A1F44] text-[#ffcc33]">
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="text-base font-extrabold text-[#0A1F44]">{item.title}</h3>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-700">{item.body}</p>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <MarketingLayout>
      <section className="border-b border-slate-200 bg-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">
            Integrations and Data
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight text-[#0A1F44] md:text-6xl">
            How Synerxus fits into your existing workflow.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-700">
            Synerxus is evidence infrastructure. It works alongside your reporting tools, not instead of them.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-3xl font-extrabold text-[#0A1F44]">Where Synerxus sits</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
            {flowBoxes.map((box, index) => (
              <div key={box.title} className="contents">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-extrabold text-[#0A1F44]">{box.title}</h3>
                  <ul className="mt-4 space-y-2">
                    {box.items.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#c88914]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                {index < flowBoxes.length - 1 && (
                  <div className="flex items-center justify-center text-[#c88914]">
                    <ArrowRight className="hidden h-7 w-7 lg:block" />
                    <div className="h-8 w-px bg-[#c88914]/40 lg:hidden" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-4xl text-center text-sm font-semibold leading-relaxed text-slate-600">
            Synerxus does not replace your reporting tool or your assurance provider. It fills the gap between raw data and a reviewable evidence package.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-3xl font-extrabold text-[#0A1F44]">How evidence gets into Synerxus.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {inputMethods.map((item) => (
              <CapabilityCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-3xl font-extrabold text-[#0A1F44]">How evidence leaves Synerxus.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {outputMethods.map((item) => (
              <CapabilityCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="text-3xl font-extrabold text-[#0A1F44]">Does Synerxus connect to your reporting tool?</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <StatusBadge status="Available now" />
              <h3 className="mt-4 text-xl font-extrabold text-[#0A1F44]">Current state.</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Synerxus currently operates as a standalone evidence workspace. Evidence summaries and exports can be referenced in reporting tools your team uses, including office documents, shared workspaces, or custom platforms, through file export and manual reference.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <StatusBadge status="On roadmap" />
              <h3 className="mt-4 text-xl font-extrabold text-[#0A1F44]">What we are building toward.</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Native integrations with ESG reporting platforms are on our development roadmap. If you have a specific integration requirement, tell us in the assessment intake; we use those requests to prioritize integration development.
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
            No specific reporting platform is named here as integrated because the current build reviewed for this page does not include a native technical integration with an external ESG reporting platform.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-3xl font-extrabold text-[#0A1F44]">Your data in Synerxus.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {securityItems.map((item) => (
              <CapabilityCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="rounded-lg border border-[#c88914]/60 bg-[#fff9eb] p-6">
            <h2 className="text-xl font-extrabold text-[#0A1F44]">Synerxus is early-stage infrastructure.</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#0A1F44]">
              <p>Some capabilities on this page are available now. Some are in development. Some are on the roadmap.</p>
              <p>
                We have listed the status of each honestly because an ESG Manager's IT and legal teams will ask these questions, and discovering gaps after a procurement decision creates more problems than stating them upfront.
              </p>
              <p>
                If your organization has requirements we have not addressed here, tell us in the assessment intake. We would rather disqualify a bad fit early than oversell current capabilities.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <Button asChild size="lg" className="bg-[#c88914] text-white hover:bg-[#a9720f]">
            <Link href="/request-assessment">
              Request Evidence Readiness Assessment <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
