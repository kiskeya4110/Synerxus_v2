import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileDown,
  FileText,
  GitBranch,
  Layers3,
  LockKeyhole,
  PlugZap,
  ShieldAlert,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

type Status = "AVAILABLE NOW" | "IN DEVELOPMENT" | "ON ROADMAP";

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

const statusSummary = [
  {
    label: "Available now",
    value: "Manual entry, image uploads, HTML evidence summaries",
  },
  {
    label: "In development",
    value: "Partner portal, PDF output, assurance-preparation export",
  },
  {
    label: "Roadmap",
    value: "API, spreadsheet import, native ESG platform integrations",
  },
];

const integrationPrinciples = [
  "Keep reporting tools in place",
  "Preserve source context and limitations",
  "Make claim evidence easier to review",
];

const inputMethods: Capability[] = [
  {
    title: "Manual Entry",
    status: "AVAILABLE NOW",
    icon: FileText,
    body: "Team members can create records directly in the Synerxus interface. No integration is required to start an evidence-readiness workflow.",
  },
  {
    title: "File Upload",
    status: "AVAILABLE NOW",
    icon: Upload,
    body: "The current shared upload service supports image artifacts: JPG, PNG, WebP, and GIF. Upload support for PDFs, spreadsheets, and Word documents as source artifacts is in development.",
  },
  {
    title: "Partner Submission Portal",
    status: "IN DEVELOPMENT",
    icon: GitBranch,
    body: "Partners and NGOs will be able to submit confirmation and source artifacts directly through a lightweight portal without requiring a full Synerxus account.",
  },
  {
    title: "API Connection",
    status: "ON ROADMAP",
    icon: Database,
    body: "A structured API will allow evidence records to be created and updated from external systems. Timeline to be confirmed.",
  },
  {
    title: "Spreadsheet Import",
    status: "ON ROADMAP",
    icon: FileDown,
    body: "Spreadsheet import will support structured activity and evidence records from CSV or similar formats. Field mapping and validation requirements are still being defined.",
  },
];

const outputMethods: Capability[] = [
  {
    title: "Evidence Summary PDF",
    status: "IN DEVELOPMENT",
    icon: FileText,
    body: "The current platform generates Evidence Summary reports as HTML/printable browser output. Direct PDF generation for claim-level evidence summaries is in development.",
  },
  {
    title: "Assurance-Preparation Export",
    status: "IN DEVELOPMENT",
    icon: FileDown,
    body: "The current evidence summary output includes evidence records, confirmation context, exceptions, and limitations. A packaged export specifically structured for assurance provider handoff is in development.",
  },
  {
    title: "Claim Register Export",
    status: "ON ROADMAP",
    icon: Database,
    body: "Full export of a claim register with evidence status per claim in CSV or another structured format is not currently available in the build reviewed for this page.",
  },
  {
    title: "Framework Mapping Export",
    status: "ON ROADMAP",
    icon: GitBranch,
    body: "Export of SDG, GRI, ESRS, and ISSB mapping context per claim, with limitation notes preserved, is on the roadmap.",
  },
];

const securityItems: Capability[] = [
  {
    title: "Data storage",
    status: "AVAILABLE NOW",
    icon: Database,
    body: "Application records are stored in PostgreSQL. Uploaded image artifacts are processed with Sharp and stored on the application server filesystem under the uploads directory in the current build.",
  },
  {
    title: "Access controls",
    status: "AVAILABLE NOW",
    icon: LockKeyhole,
    body: "The application uses authenticated routes, user roles, and organization-scoped checks on many operational endpoints. File upload and deletion routes require authentication and validate user or organization ownership.",
  },
  {
    title: "Data export and deletion",
    status: "AVAILABLE NOW",
    icon: FileDown,
    body: "Some report and activity exports are available today, including CSV and HTML/printable evidence summary outputs. User-account deletion exists; organization-wide deletion and a complete claim-and-evidence export policy should be confirmed during procurement review.",
  },
  {
    title: "SOC 2 certification",
    status: "ON ROADMAP",
    icon: ShieldAlert,
    body: "Synerxus does not currently claim SOC 2 certification.",
  },
  {
    title: "SSO / SAML",
    status: "ON ROADMAP",
    icon: LockKeyhole,
    body: "SSO and SAML are listed as planned capabilities and are not currently claimed as available.",
  },
  {
    title: "Data Processing Agreement",
    status: "IN DEVELOPMENT",
    icon: FileText,
    body: "Terms reference that enterprise customers may require a separate Data Processing Addendum. A standard procurement-ready DPA should be treated as in development unless confirmed during assessment intake.",
  },
];

function StatusBadge({ status }: { status: Status }) {
  const classes =
    status === "AVAILABLE NOW"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "IN DEVELOPMENT"
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
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#0A1F44] text-[#ffcc33]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-[#0A1F44]">{item.title}</h3>
            <StatusBadge status={item.status} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{item.body}</p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#c88914]">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-extrabold leading-tight text-[#0A1F44] sm:text-3xl">{title}</h2>
      <p className="mt-3 text-base leading-relaxed text-slate-700">{body}</p>
    </div>
  );
}

function PipelinePreview() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xl sm:p-5 sm:rounded-xl">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0A1F44] text-[#ffcc33]">
          <Layers3 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Integration posture</p>
          <p className="text-lg font-extrabold text-[#0A1F44]">Evidence layer, not system replacement</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 overflow-hidden">
        {[
          ["Input", "Records, source files, confirmations"],
          ["Structure", "Claims, evidence packets, exceptions"],
          ["Output", "Reviewable summaries and exports"],
        ].map(([label, value], index) => (
          <div key={label} className="grid gap-2 sm:grid-cols-[88px_1fr] sm:items-center sm:gap-3">
            <span className="rounded-md bg-slate-100 px-3 py-2 text-xs font-extrabold text-[#0A1F44]">{label}</span>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-sm font-semibold text-slate-700">{value}</span>
              {index < 2 && <ArrowRight className="h-4 w-4 shrink-0 text-[#c88914]" />}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-relaxed text-[#0A1F44]">
        Native reporting-platform integrations are not claimed as available in the current build.
      </div>
    </div>
  );
}

function CapabilityGroup({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items: Capability[];
  icon: LucideIcon;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0A1F44] text-[#ffcc33]">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="text-xl font-extrabold text-[#0A1F44]">{title}</h3>
      </div>
      <div className="grid gap-4">
        {items.map((item) => (
          <CapabilityCard key={item.title} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <MarketingLayout>
      <section className="border-b border-slate-200 bg-white py-7 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-8">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#c88914]">
              Integrations and data flow
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight text-[#0A1F44] sm:text-4xl md:text-5xl">
              Connect evidence work to the systems your team already uses.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700 sm:mt-5 sm:text-lg">
              Synerxus sits between raw activity records and external ESG reporting workflows. It helps teams organize claim-level evidence before information moves into reports, board materials, funder updates, or assurance review.
            </p>
            <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-3">
              {statusSummary.map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#c88914]">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold leading-snug text-[#0A1F44]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <PipelinePreview />
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-7 md:py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Operating model"
            title="Where Synerxus sits"
            body="The platform is designed to improve traceability around evidence, confirmation, exceptions, and limitations without forcing a full replacement of reporting or document workflows."
          />
          <div className="mt-5 grid gap-4 sm:mt-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
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

      <section className="border-b border-slate-200 bg-white py-7 md:py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Inputs and outputs"
            title="How evidence moves through Synerxus"
            body="Current capabilities support direct evidence work today, while higher-volume import and export workflows are being built deliberately around traceability and validation."
          />
          <div className="mt-5 grid gap-6 sm:mt-8 lg:grid-cols-2 lg:gap-8">
            <CapabilityGroup title="Evidence in" icon={Upload} items={inputMethods} />
            <CapabilityGroup title="Evidence out" icon={FileDown} items={outputMethods} />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-7 md:py-12">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Native integrations"
            title="Does Synerxus connect to your reporting tool?"
            body="The honest answer depends on what you mean by connect. Synerxus can support reporting workflows today through exported evidence outputs and manual references; native platform-to-platform integrations are roadmap work."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <StatusBadge status="AVAILABLE NOW" />
              <h3 className="mt-4 flex items-center gap-2 text-xl font-extrabold text-[#0A1F44]">
                <PlugZap className="h-5 w-5 text-[#c88914]" />
                Current state
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Synerxus currently operates as a standalone evidence workspace. Evidence summaries and exports can be referenced in reporting tools your team uses, including office documents, shared workspaces, or custom platforms, through file export and manual reference.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <StatusBadge status="ON ROADMAP" />
              <h3 className="mt-4 flex items-center gap-2 text-xl font-extrabold text-[#0A1F44]">
                <GitBranch className="h-5 w-5 text-[#c88914]" />
                What we are building toward
              </h3>
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

      <section className="border-b border-slate-200 bg-white py-7 md:py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Security and procurement"
            title="Your data in Synerxus"
            body="This page states the current build plainly so IT, legal, and procurement teams can evaluate fit early."
          />
          <div className="mt-5 grid gap-3 sm:mt-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-4">
            {securityItems.map((item) => (
              <CapabilityCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-7 md:py-12">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#c88914]">Fit check</p>
            <h2 className="mt-3 text-2xl font-extrabold text-[#0A1F44]">What to confirm during assessment</h2>
          </div>
          <div className="rounded-lg border border-[#c88914]/60 bg-[#fff9eb] p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {integrationPrinciples.map((item) => (
                <div key={item} className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#c88914]" />
                  <p className="text-sm font-bold leading-snug text-[#0A1F44]">{item}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-[#0A1F44]">
              Some capabilities on this page are available now. Some are in development. Some are on the roadmap. If your organization requires a specific source system, export format, security control, or procurement document, include it in the assessment intake so fit can be confirmed before implementation planning.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-7 sm:py-12">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <Button asChild size="lg" className="w-full bg-[#c88914] text-white hover:bg-[#a9720f] sm:w-auto">
            <Link href="/assessment">
              Request Evidence Readiness Assessment <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
