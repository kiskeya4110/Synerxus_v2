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
    title: "Evidence Packet Detail View",
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
    title: "Partner Confirmation Workflow",
    eyebrow: "Control who can confirm",
    icon: UsersRound,
    body: "Routes focused confirmation requests to authorized partners or verifiers and preserves responses, comments, flags, and timestamps.",
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
    title: "Status Reconciliation",
    eyebrow: "Separate status buckets",
    icon: AlertTriangle,
    body: "Separates submitted, pending, verified, incomplete, rejected, partner-reported-only, and mapped-only records before totals are used.",
    fields: [
      "Submitted",
      "Pending verification",
      "Verified / partner-confirmed",
      "Incomplete",
      "Rejected",
      "Partner-reported only",
      "Derived / mapped only",
      "Verified-total inclusion",
    ],
  },
  {
    title: "Exception Log",
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
    title: "Confidence Tiers",
    eyebrow: "Show evidence strength",
    icon: ShieldCheck,
    body: "Labels records by evidence confidence so reviewers can distinguish self-reported, partner-confirmed, source-supported, and review-ready records.",
    fields: [
      "Tier 0: Self-reported",
      "Tier 1: Partner-confirmed",
      "Tier 2: Source-supported",
      "Tier 3: Review-ready",
      "Source artifact status",
      "Verifier relationship",
    ],
  },
  {
    title: "SDG / Framework Mapping",
    eyebrow: "Classify without overclaiming",
    icon: DatabaseZap,
    body: "Maps evidence records to SDGs, reporting frameworks, or internal categories as derived classification context with limitations.",
    fields: [
      "Primary SDG",
      "Relevant target",
      "Mapping rationale",
      "Formal framework",
      "Mapping confidence",
      "Boundary note",
    ],
  },
  {
    title: "Report Generator",
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
  {
    title: "Assurance-Preparation Export",
    eyebrow: "Export review packets",
    icon: Fingerprint,
    body: "Packages evidence records, source references, confirmation metadata, exceptions, and limitations for internal review or third-party assurance preparation.",
    fields: [
      "Claim-to-evidence export",
      "Evidence register appendix",
      "Source artifact index",
      "Verifier metadata status",
      "Exception log",
      "Boundary statement",
    ],
  },
];

const evidenceFlow = [
  {
    title: "Claim registered",
    status: "CLM-2026-041",
    detail: "The reportable claim is captured with entity, program, period, owner, and evidence requirement before any output totals are used.",
    reportFields: [
      ["Claim statement", "Partner-confirmed activity related to clean-energy training"],
      ["Program", "Solar Village Initiative"],
      ["Evidence requirement", "Partner confirmation + source artifact reference"],
    ],
  },
  {
    title: "Evidence requirement set",
    status: "Requirement defined",
    detail: "Synerxus records what must support the claim so reviewers can see whether the evidence basis is sufficient.",
    reportFields: [
      ["Required evidence", "Training record, partner confirmation, maintenance checklist"],
      ["Minimum tier", "Tier 1: Partner-confirmed"],
      ["Preferred tier", "Tier 2: Source-supported"],
    ],
  },
  {
    title: "Partner confirmation requested",
    status: "Confirmation sent",
    detail: "The partner or designated verifier receives a focused request to confirm, clarify, or flag the record.",
    reportFields: [
      ["Verifier role", "Authorized partner verifier"],
      ["Relationship", "Implementation partner"],
      ["Response options", "Confirm, comment, request clarification, flag issue"],
    ],
  },
  {
    title: "Source artifact attached",
    status: "Artifact indexed",
    detail: "Documents, photos, forms, logs, or exports are attached or referenced so source support is tracked separately from confirmation.",
    reportFields: [
      ["Artifact type", "Training log"],
      ["Source reference", "SRC-2026-118"],
      ["Source support", "Shown separately from partner confirmation"],
    ],
  },
  {
    title: "Quality status assigned",
    status: "Tier 2",
    detail: "The evidence packet receives confidence, exception, and completeness status before it is used in a report output.",
    reportFields: [
      ["Evidence confidence", "Source-supported"],
      ["Exception status", "No open exception"],
      ["Boundary note", "No causal SDG attribution"],
    ],
  },
  {
    title: "Review pack generated",
    status: "Report-ready",
    detail: "The report preserves the claim, supporting records, source status, SDG mapping context, and limitations for review.",
    reportFields: [
      ["Output", "Claim-to-evidence report"],
      ["Included records", "EVR-0001, EVR-0002, EVR-0012"],
      ["Use", "Reporting support and assurance preparation"],
    ],
  },
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
  {
    title: "What can be counted as partner-confirmed evidence",
    note: "Review which activity records completed the configured confirmation workflow and can be included in partner-confirmed evidence totals.",
    badge: "Partner-confirmed",
    panel: [
      ["User needs to know", "Which records were confirmed, who confirmed them, when they were confirmed, and whether they meet the rules for inclusion."],
      ["Visible evidence", "Record ID, activity description, activity date, hours, verification status, verifier role, confirmation method, confirmation date."],
      ["Not shown as", "Independent assurance, certified impact, causal contribution, or regulatory compliance."],
      ["Inclusion rule", "Only records with completed confirmation status are included. Pending, incomplete, rejected, partner-reported-only, and mapped-only records are excluded."],
    ],
  },
  {
    title: "What must stay separate from confirmed evidence totals",
    note: "Keep reach, beneficiary, community, and participation figures separate when they are partner-reported but not independently checked by Synerxus.",
    badge: "Reported separately",
    panel: [
      ["User needs to know", "Which figures came from partners, which activity records they relate to, and whether they were independently checked."],
      ["Visible evidence", "Reported reach, reporting partner, related activity record, source status, reporting date, and limitation note."],
      ["Not included in", "Partner-confirmed evidence totals, source-supported totals, or independently verified impact totals."],
      ["Treatment", "Partner-reported figures may provide context, but they must remain separate from confirmed activity records unless a separate verification process is completed."],
    ],
  },
  {
    title: "What the SDG or framework tag actually means",
    note: "Inspect why a record was mapped to an SDG, framework, or internal reporting category, and confirm the evidence basis, confidence level, and limitation before the tag is used.",
    badge: "Mapping confidence: Medium",
    panel: [
      ["User needs to know", "Whether the tag is thematic context, formal framework mapping, or both."],
      ["Visible evidence", "Mapped goal or framework, related target or disclosure, mapping rationale, evidence basis, confidence level, and supporting evidence tier."],
      ["Not evidence of", "Causal contribution, compliance, certification, formal assurance, or long-term outcome."],
    ],
    mappingDetails: [
      ["Mapped theme", "SDG 7: Affordable and Clean Energy"],
      ["Related target", "SDG Target 7.b: Expand infrastructure and upgrade technology for sustainable energy services."],
      ["Why this tag appears", "The activity record describes solar maintenance training and support activities related to clean-energy access."],
      ["Evidence used", "Partner confirmation, training log, maintenance checklist."],
      ["Record strength", "Tier 2: Source-supported"],
      ["Reviewer check", "Confirm that the activity description, source artifacts, verifier role, and mapping rationale support the selected tag."],
      ["Limitation", "This mapping supports SDG-aligned reporting context only. It does not prove energy access outcomes, emissions reduction, SDG contribution, or long-term impact."],
    ],
  },
];

export default function PlatformPage() {
  const [activeModule, setActiveModule] = useState(0);
  const [activeEvidenceStep, setActiveEvidenceStep] = useState(0);
  const [activeSdgCategory, setActiveSdgCategory] = useState(0);
  const ActiveIcon = moduleCards[activeModule].icon;
  const activeEvidence = evidenceFlow[activeEvidenceStep];
  const activeSdg = sdgEvidenceCategories[activeSdgCategory];

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
              Claim-To-Evidence Report
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              How a claim becomes a reviewable evidence packet.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Select a workflow stage to see how the report preserves the claim, evidence basis,
              confirmation status, and limitations.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {evidenceFlow.map((step, index) => (
              <button
                key={step.title}
                type="button"
                onClick={() => setActiveEvidenceStep(index)}
                onMouseEnter={() => setActiveEvidenceStep(index)}
                onFocus={() => setActiveEvidenceStep(index)}
                aria-pressed={activeEvidenceStep === index}
                className={`relative rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  activeEvidenceStep === index
                    ? "border-[#0A1F44] bg-[#0A1F44] text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A1F44] text-xs font-extrabold text-[#FFD95A]">
                  {index + 1}
                </span>
                <p className={`mt-3 text-sm font-extrabold leading-snug ${
                  activeEvidenceStep === index ? "text-white" : "text-[#0A1F44]"
                }`}>
                  {step.title}
                </p>
                <p className={`mt-2 text-xs font-semibold ${
                  activeEvidenceStep === index ? "text-[#FFD95A]" : "text-[#8A5A00]"
                }`}>
                  {step.status}
                </p>
              </button>
            ))}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
                    Active Report Stage
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold text-[#0A1F44]">
                    {activeEvidence.title}
                  </h3>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A1F44] text-[#FFD95A]">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                {activeEvidence.detail}
              </p>
              <div className="mt-5 grid gap-2">
                {activeEvidence.reportFields.map(([label, value]) => (
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
        </div>
      </section>



      <section className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              SDG and Framework Mapping
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1F44]">
              Show what the mapping means before it appears in a report.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              An SDG or framework tag should never stand alone. Reporting teams need
              to see which activity record was mapped, what evidence supports the
              mapping, what confidence level applies, and what the mapping does not
              prove.
            </p>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Synerxus separates partner-confirmed activity, partner-reported reach,
              source-supported evidence, and derived SDG or framework mapping so
              each layer can be reviewed before it is reused in a report.
            </p>
            <div className="mt-5 grid gap-3">
              {sdgEvidenceCategories.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActiveSdgCategory(index)}
                  onMouseEnter={() => setActiveSdgCategory(index)}
                  onFocus={() => setActiveSdgCategory(index)}
                  aria-pressed={activeSdgCategory === index}
                  className={`flex gap-3 rounded-xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    activeSdgCategory === index
                      ? "border-[#0A1F44] bg-[#0A1F44]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                    activeSdgCategory === index
                      ? "bg-white/10 text-[#FFD95A]"
                      : "bg-[#0A1F44] text-[#FFD95A]"
                  }`}>
                    {index + 1}
                  </span>
                  <span>
                    <span className={`block text-sm font-extrabold leading-relaxed ${
                      activeSdgCategory === index ? "text-white" : "text-[#0A1F44]"
                    }`}>
                      {item.title}
                    </span>
                    <span className={`mt-1 block text-xs leading-relaxed ${
                      activeSdgCategory === index ? "text-slate-200" : "text-slate-500"
                    }`}>
                      {item.note}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              The goal is simple: before a claim leaves the platform, users should
              be able to see the mapped record, the supporting evidence, the
              confidence level, and the limitation attached to that mapping.
            </p>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-950">
              SDG and framework mapping is a classification layer. It supports
              thematic reporting context; it does not certify SDG impact,
              determine compliance, provide formal assurance, or prove causal
              contribution.
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
                  Mapping Review Panel
                </p>
                <h3 className="mt-2 text-2xl font-extrabold text-[#0A1F44]">
                  Solar Village Initiative
                </h3>
              </div>
              <span className="rounded-full border border-[#D4980C]/30 bg-[#D4980C]/10 px-3 py-1 text-xs font-bold text-[#8A5A00]">
                {activeSdg.badge}
              </span>
            </div>
            <div className="mt-5 rounded-xl border border-[#D4980C]/30 bg-[#D4980C]/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
                Selected View
              </p>
              <h4 className="mt-2 text-lg font-extrabold text-[#0A1F44]">{activeSdg.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{activeSdg.note}</p>
              <div className="mt-3 grid gap-2">
                {activeSdg.panel.map(([label, value]) => (
                  <div key={label} className="grid gap-1 rounded-lg bg-white px-3 py-2 text-sm">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</span>
                    <span className="font-semibold leading-relaxed text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            {activeSdg.mappingDetails ? (
              <div className="mt-5 grid gap-2">
                {activeSdg.mappingDetails.map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            ) : null}
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
