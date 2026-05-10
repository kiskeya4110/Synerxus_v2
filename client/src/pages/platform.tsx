import { useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  DatabaseZap,
  FileCheck2,
  Fingerprint,
  FolderSearch,
  ListChecks,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { AssessmentCta, BoundaryNotice } from "@/components/marketing/marketing-sections";

const moduleCards = [
  {
    title: "Claim Register",
    eyebrow: "Define what will be reported",
    icon: ListChecks,
    body: "A central workspace for the exact social-impact or ESG claim, owner, program, reporting period, evidence requirement, and review status.",
    fields: [
      "Claim ID",
      "Claim owner",
      "Program",
      "Reporting period",
      "Claim type",
      "Evidence requirement",
      "Framework mapping",
      "Review status",
    ],
  },
  {
    title: "Evidence Packet Builder",
    eyebrow: "Connect records to claims",
    icon: FileCheck2,
    body: "Transforms partner records, activity metadata, and source artifacts into structured evidence packets tied to a specific claim.",
    fields: [
      "Evidence ID",
      "Linked claim",
      "Partner / verifier",
      "Activity date",
      "Verification date",
      "Source artifact",
      "Location / site",
      "Confidence tier",
      "Exception status",
      "Hash / integrity reference",
    ],
  },
  {
    title: "Verifier Registry",
    eyebrow: "Control who can confirm",
    icon: UsersRound,
    body: "Maintains the authority basis for people and organizations allowed to confirm activity records or source-supported claims.",
    fields: [
      "Verifier role",
      "Organization",
      "Authority basis",
      "Verification method",
      "Conflict-of-interest flag",
      "Confirmation history",
    ],
  },
  {
    title: "Source Artifact Index",
    eyebrow: "Organize supporting documents",
    icon: FolderSearch,
    body: "Indexes the documents and source files that reporting, legal, and assurance-preparation teams need to review.",
    fields: [
      "Attendance logs",
      "Inspection forms",
      "Photos",
      "Partner reports",
      "Surveys",
      "CRM exports",
      "Signed handovers",
      "Water quality tests",
      "Training records",
    ],
  },
  {
    title: "Evidence Quality & Exceptions",
    eyebrow: "Separate clean records from risk",
    icon: AlertTriangle,
    body: "Surfaces complete, pending, incomplete, rejected, late, duplicate, and partner-reported-only records before claims move into reporting materials.",
    fields: [
      "Complete",
      "Pending",
      "Incomplete",
      "Rejected",
      "Late",
      "Duplicate",
      "Partner-reported only",
      "Needs source support",
    ],
  },
  {
    title: "Reporting Pack Generator",
    eyebrow: "Package review outputs",
    icon: ClipboardCheck,
    body: "Generates summaries and exports that help internal teams prepare reporting files without overstating what the evidence can support.",
    fields: [
      "Management summary",
      "Evidence summary",
      "Assurance-preparation pack",
      "Claim-to-evidence export",
      "Framework mapping register",
      "Exception log",
    ],
  },
];

const evidenceFlow = [
  "Claim registered",
  "Evidence requirement set",
  "Partner confirmation requested",
  "Source artifact attached",
  "Quality status assigned",
  "Review pack generated",
];

const confidenceTiers = [
  { tier: "0", label: "Self-Reported", note: "Submitted but not confirmed" },
  { tier: "1", label: "Partner-Confirmed", note: "Confirmed by an authorized partner or verifier" },
  { tier: "2", label: "Source-Supported", note: "Confirmation includes retained source artifacts" },
  { tier: "3", label: "Review-Ready", note: "Prepared for internal, legal, or advisor review" },
];

const recordRows = [
  ["Claim ID", "CLM-2026-041"],
  ["Program", "Solar Village Initiative"],
  ["Reporting period", "Q2 2026"],
  ["Claim type", "Output / activity"],
  ["Evidence requirement", "Partner confirmation + training record"],
  ["Review status", "Ready for reporting review"],
];

const reviewOutputs = [
  { title: "Claim-to-evidence traceability", icon: Fingerprint },
  { title: "Tamper-evident integrity reference", icon: DatabaseZap },
  { title: "Partner-confirmed evidence status", icon: ShieldCheck },
  { title: "Exception log for unresolved issues", icon: AlertTriangle },
];

const sdgEvidenceCategories = [
  "Partner-confirmed activity and output records",
  "Partner-reported reach and community figures",
  "Derived SDG and framework mappings",
];

const sdgMappingPanel = [
  ["Primary SDG", "SDG 7: Affordable and Clean Energy"],
  ["Relevant SDG target", "7.b: Expand infrastructure and upgrade technology"],
  ["Mapping rationale", "Training activity supports clean-energy maintenance capacity"],
  ["Evidence basis", "Partner confirmation + training log + maintenance checklist"],
  ["Mapping confidence", "Medium"],
  ["Evidence tier supporting the activity", "Tier 2: Source-supported"],
  ["Boundary note", "Thematic alignment only / no causal attribution"],
];

export default function PlatformPage() {
  const [activeModule, setActiveModule] = useState(0);
  const ActiveIcon = moduleCards[activeModule].icon;

  return (
    <MarketingLayout>
      <section className="bg-transparent">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-7 md:px-8 md:py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              Platform
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
              The evidence layer behind defensible social-impact claims.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
              Synerxus turns fragmented program records into structured,
              partner-confirmed evidence packets your reporting, legal, and assurance
              teams can actually review.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-[#0A1F44] text-[#FFD95A] hover:bg-[#102b5a]">
                <Link href="/request-assessment">Request Evidence Assessment</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#0A1F44]/20 text-[#0A1F44] hover:bg-white">
                <a href="#platform-modules">Explore Modules</a>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
                    Evidence Packet
                  </p>
                  <h2 className="mt-1 text-lg font-extrabold text-[#0A1F44]">
                    EVR-2026-0001
                  </h2>
                </div>
                <span className="rounded-full border border-[#D4980C]/30 bg-[#D4980C]/10 px-3 py-1 text-xs font-bold text-[#8A5A00]">
                  Source-Supported
                </span>
              </div>

              <div className="mt-5 grid gap-2">
                {recordRows.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[130px_1fr] gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                    <span className="font-bold text-slate-400">{label}</span>
                    <span className="font-semibold text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {confidenceTiers.map((tier) => (
                <div key={tier.tier} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0A1F44] text-xs font-extrabold text-[#FFD95A]">
                      {tier.tier}
                    </span>
                    <p className="text-sm font-extrabold text-[#0A1F44]">{tier.label}</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{tier.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <BoundaryNotice />
        </div>
      </section>

      <section id="platform-modules" className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-5 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              Platform Modules
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              Each module keeps the claim connected to its evidence trail.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              The platform is designed around claim-level evidence, partner confirmation,
              source artifacts, exception handling, and reporting support.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {moduleCards.map((module, index) => {
                const Icon = module.icon;
                const selected = activeModule === index;
                return (
                  <button
                    key={module.title}
                    type="button"
                    onClick={() => setActiveModule(index)}
                    onMouseEnter={() => setActiveModule(index)}
                    onFocus={() => setActiveModule(index)}
                    aria-pressed={selected}
                    className={`flex gap-3 rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      selected
                        ? "border-[#0A1F44] bg-[#0A1F44] text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      selected ? "bg-white/10 text-[#FFD95A]" : "bg-[#D4980C]/15 text-[#0A1F44]"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className={`block text-sm font-extrabold ${selected ? "text-white" : "text-[#0A1F44]"}`}>
                        {module.title}
                      </span>
                      <span className={`mt-1 block text-xs font-semibold uppercase tracking-[0.12em] ${
                        selected ? "text-[#FFD95A]" : "text-[#8A5A00]"
                      }`}>
                        {module.eyebrow}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
                    Active Module
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold text-[#0A1F44]">
                    {moduleCards[activeModule].title}
                  </h3>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A1F44] text-[#FFD95A]">
                  <ActiveIcon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
                {moduleCards[activeModule].body}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {moduleCards[activeModule].fields.map((field) => (
                  <div key={field} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0A1F44]" />
                    <span className="text-sm font-semibold text-slate-700">{field}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-5 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              Claim To Evidence Workflow
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              How a claim becomes a reviewable evidence packet.
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-6">
            {evidenceFlow.map((step, index) => (
              <div key={step} className="relative rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A1F44] text-xs font-extrabold text-[#FFD95A]">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm font-extrabold leading-snug text-[#0A1F44]">{step}</p>
                {index < evidenceFlow.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-7 hidden h-5 w-5 text-[#D4980C] md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>



      <section className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              SDG-Aligned, Evidence-Backed Reporting
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              Keep SDG storytelling connected to evidence boundaries.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Many corporate social-impact, city, NGO, and development programs organize their
              work around the UN Sustainable Development Goals.
            </p>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Synerxus helps teams connect SDG-aligned activities to structured evidence records,
              while keeping three categories clearly separate.
            </p>
            <div className="mt-5 grid gap-3">
              {sdgEvidenceCategories.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A1F44] text-xs font-extrabold text-[#FFD95A]">
                    {index + 1}
                  </span>
                  <p className="text-sm font-extrabold leading-relaxed text-[#0A1F44]">{item}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              This prevents SDG storytelling from becoming unsupported impact claims.
            </p>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-950">
              Synerxus does not certify SDG impact or establish causal contribution. It provides
              the evidence structure needed to make SDG-aligned reporting more traceable,
              reviewable, and defensible.
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
                  SDG Mapping Panel
                </p>
                <h3 className="mt-2 text-2xl font-extrabold text-[#0A1F44]">
                  Solar Village Initiative
                </h3>
              </div>
              <span className="rounded-full border border-[#D4980C]/30 bg-[#D4980C]/10 px-3 py-1 text-xs font-bold text-[#8A5A00]">
                Mapping confidence: Medium
              </span>
            </div>
            <div className="mt-5 grid gap-2">
              {sdgMappingPanel.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-[#0A1F44] py-7 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD95A]">
              Review Outputs
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
              Built for reporting support, internal review, and assurance preparation.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-white/75">
              Synerxus helps teams separate confirmed records, source-supported records,
              exceptions, mapped data, and evidence limitations before claims are reused in
              reports, board materials, or advisor reviews.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {reviewOutputs.map(({ title, icon: Icon }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <Icon className="h-5 w-5 text-[#FFD95A]" />
                <p className="mt-3 text-sm font-extrabold text-white">{title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AssessmentCta />
    </MarketingLayout>
  );
}
