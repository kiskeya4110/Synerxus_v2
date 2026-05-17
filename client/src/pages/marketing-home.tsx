import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, CheckCircle2, ChevronDown, Cloud, FileText, FolderOpen, GitBranch, Globe2, Info, Landmark, Network, ShieldAlert, ShieldCheck, Target, User, UserCheck, Users, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

// ── Data ────────────────────────────────────────────────────────────────────

type CategoryData = { title: string; body: string; detail: string; icon: LucideIcon; strength: number; note?: string };

const evidenceCategories: CategoryData[] = [
  {
    title: "Self-Reported Records",
    body: "Internal records created and maintained by your organization.",
    icon: User,
    strength: 20,
    detail: "Internal records form the starting point on the Evidence Ladder — not the endpoint. Without external confirmation or attached source documents, these carry higher reporting risk. Synerxus helps you identify which self-reported records need additional support before they appear in reports.",
  },
  {
    title: "Partner-Confirmed Records",
    body: "Information confirmed by a trusted partner with direct knowledge.",
    icon: Users,
    strength: 60,
    detail: "Partner confirmation moves records toward a more defensible evidence tier. The confirming party's name, role, and authorization are documented alongside the confirmation — so reviewers know who confirmed what, not just that confirmation occurred.",
  },
  {
    title: "Source-Supported Records",
    body: "Backed by primary source documents and reviewable evidence.",
    icon: FileText,
    strength: 80,
    detail: "Source support — invoices, reports, photos, spreadsheets, or third-party records — is the key move from moderate to lower risk. It enables reviewers to verify the claim directly without relying on internal assertion alone.",
  },
  {
    title: "Partner-Reported Figures",
    body: "Figures reported by partners without treating them as independently confirmed.",
    icon: BarChart3,
    strength: 40,
    note: "Not independently confirmed",
    detail: "Partner-reported figures are tracked separately from confirmed evidence totals. This separation is critical when reporting to auditors, funders, or regulators — it shows exactly what was externally confirmed versus what was reported by the partner without independent verification.",
  },
  {
    title: "Mapped Records",
    body: "Claims mapped to SDGs, frameworks, or reporting categories with limitations.",
    icon: Network,
    strength: 50,
    note: "Context layer — not evidence strength",
    detail: "Mapping adds context and disclosure transparency, but does not constitute certification, impact attribution, or compliance determination. Synerxus documents the mapping rationale and explicit limitations for every mapped record — keeping alignment claims honest and defensible.",
  },
];

type FrameworkCard = {
  title: string;
  items: string[];
  description: string;
  boundary: string;
  detail: string;
  icon: LucideIcon;
};

const frameworkCards: FrameworkCard[] = [
  {
    title: "Reporting / Disclosure Context",
    items: ["CSRD", "ESRS", "GRI", "ISSB"],
    description: "Connect claims to evidence records, source support, confirmation status, and limitation notes for reporting preparation.",
    boundary: "Not a compliance determination.",
    detail: "Use this context when a claim needs to sit inside reporting packs, disclosure drafts, or internal review workflows with traceable support attached.",
    icon: Landmark,
  },
  {
    title: "Climate Disclosure Context",
    items: ["TCFD", "IFRS S2"],
    description: "Organize climate-related evidence context when it is relevant to a broader ESG, CSR, supplier, or program claim.",
    boundary: "Not carbon accounting, emissions reporting validation, or climate assurance.",
    detail: "Use this context when climate references are part of a broader claim record and need to be separated from the underlying evidence strength.",
    icon: Cloud,
  },
  {
    title: "Assurance-Preparation Context",
    items: ["ISAE 3000"],
    description: "Structure evidence packets, source references, confirmation metadata, exception notes, and limitations for review preparation.",
    boundary: "Not a formal assurance opinion.",
    detail: "Use this context when a packet needs a clean source trail, confirmation metadata, and exception notes before a reviewer opens it.",
    icon: ShieldCheck,
  },
  {
    title: "Mapping Context",
    items: ["UN SDGs", "Internal Categories"],
    description: "Classify records by goal, theme, or reporting category while keeping mapping separate from evidence strength.",
    boundary: "Not SDG impact certification or contribution attribution.",
    detail: "Use this context when you need to tag claims by goal or category without changing whether the record is self-reported, confirmed, or source-supported.",
    icon: Globe2,
  },
];

type FlowStep = { title: string; body: string; icon: LucideIcon; detail: string };
type HeroEvidenceTabId = "attendance" | "confirmation" | "documents" | "completion" | "mapping";

type HeroEvidenceTab = {
  id: HeroEvidenceTabId;
  title: string;
  meta: string;
  icon: LucideIcon;
};

const evidenceFlow: FlowStep[] = [
  {
    title: "Project Metrics Defined",
    body: "Organizations pre-identify what gets tracked",
    icon: Target,
    detail: "Organizations pre-identify what gets tracked — trees planted, panels installed, sessions delivered. The schema is fixed before any volunteer logs anything.",
  },
  {
    title: "Volunteer Logs Numbers",
    body: "Skilled volunteers enter quantities against fixed metrics",
    icon: BarChart3,
    detail: "Skilled volunteers enter quantities against pre-defined metrics. No free text. No interpretation. Just numbers against a fixed schema.",
  },
  {
    title: "Authorized Approval",
    body: "A named authorized person confirms the record",
    icon: UserCheck,
    detail: "A named authorized person at the organization confirms the volunteer was present, the numbers are accurate, and the activity happened as described.",
  },
  {
    title: "Evidence Record Created",
    body: "Approved records enter the evidence layer",
    icon: FileText,
    detail: "Approved records enter the evidence layer. Unapproved submissions are excluded. Every record carries who approved it, when, and where.",
  },
  {
    title: "Corporate Dashboard Updated",
    body: "Corporations see aggregate confirmed figures",
    icon: BarChart3,
    detail: "The corporation sees aggregate confirmed figures filtered by employee and organization — with percentage breakdowns showing what proportion is organization-confirmed.",
  },
];

const heroEvidenceTabs: HeroEvidenceTab[] = [
  {
    id: "attendance",
    title: "Attendance Log",
    meta: "CSV · 2 linked",
    icon: FileText,
  },
  {
    id: "confirmation",
    title: "Partner Confirmation",
    meta: "PDF · Confirmed",
    icon: Users,
  },
  {
    id: "documents",
    title: "Source Documents",
    meta: "PDF · 3 linked",
    icon: FolderOpen,
  },
  {
    id: "completion",
    title: "Training Completion Record",
    meta: "CSV · 1 linked",
    icon: CheckCircle2,
  },
  {
    id: "mapping",
    title: "Mapping Context",
    meta: "GRI 413 / SDG 8",
    icon: GitBranch,
  },
];

function strengthFillClass(strength: number): string {
  if (strength <= 20) return "bg-slate-400";
  if (strength <= 40) return "bg-amber-400";
  if (strength <= 50) return "bg-amber-500";
  if (strength <= 60) return "bg-[#c88914]";
  return "bg-emerald-600";
}

function HeroTabDetail({ activeTab }: { activeTab: HeroEvidenceTabId }) {
  if (activeTab === "attendance") {
    return (
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Attendance table preview</p>
        <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
          <div className="grid grid-cols-[1fr_1fr_1.25fr_0.9fr] bg-slate-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            <span>Name</span>
            <span>Date</span>
            <span>Session</span>
            <span>Status</span>
          </div>
          {[
            ["M. Alvarez", "May 2", "Solar Skills Lab", "Completed"],
            ["T. Chen", "May 9", "Job Readiness", "Attended"],
            ["A. Brooks", "May 16", "Tool Safety", "Completed"],
          ].map(([name, date, session, status]) => (
            <div key={`${name}-${date}`} className="grid grid-cols-[1fr_1fr_1.25fr_0.9fr] border-t border-slate-100 px-3 py-2 text-[11px] text-slate-700">
              <span className="font-semibold text-[#0A1F44]">{name}</span>
              <span>{date}</span>
              <span>{session}</span>
              <span className="font-bold text-emerald-700">{status}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === "confirmation") {
    return (
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Partner confirmation</p>
        <div className="mt-3 grid gap-2 text-xs">
          {[
            ["Confirmed by", "Bright Futures Nonprofit"],
            ["Date", "May 15, 2026"],
            ["Status", "Confirmed"],
            ["Reviewer", "Dana Reed, Program Director"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
              <span className="font-bold text-slate-500">{label}</span>
              <span className="font-extrabold text-[#0A1F44]">{value}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-900">
          Confirmation statement: attendance and completion records match the program records reviewed by the organization.
        </p>
      </div>
    );
  }

  if (activeTab === "documents") {
    return (
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">4 linked documents</p>
        <div className="mt-3 grid gap-2">
          {[
            "Training_Attendance_Q2_2026.pdf",
            "Curriculum_Overview_2026.pdf",
            "Partner_Report_Q2_2026.pdf",
            "Participant_Summary_Q2_2026.pdf",
          ].map((file) => (
            <div key={file} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0A1F44]">
              <FileText className="h-4 w-4 shrink-0 text-[#c88914]" />
              <span className="truncate">{file}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === "completion") {
    return (
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Training completion record</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {[
            ["Completed trainees", "240"],
            ["Program", "Workforce Development Program"],
            ["Period", "Q2 2026"],
            ["Record owner", "Bright Futures Nonprofit"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-200 bg-white p-3">
              <p className="font-bold text-slate-500">{label}</p>
              <p className="mt-1 font-extrabold text-[#0A1F44]">{value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Mapping context</p>
      <div className="mt-3 grid gap-2 text-xs">
        {[
          ["Framework mapping", "GRI 413-1"],
          ["SDG mapping", "SDG 8"],
          ["Rationale", "Workforce development and community participation"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white px-3 py-2">
            <p className="font-bold text-slate-500">{label}</p>
            <p className="mt-1 font-extrabold text-[#0A1F44]">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-md bg-[#fff9eb] px-3 py-2 text-xs leading-relaxed text-[#0A1F44]">
        Note: mapping supports reporting context only.
      </p>
    </div>
  );
}

function HeroEvidenceVisual() {
  const [activeTab, setActiveTab] = useState<HeroEvidenceTabId>("attendance");
  const activeTabConfig = heroEvidenceTabs.find((tab) => tab.id === activeTab) ?? heroEvidenceTabs[0];
  const ActiveTabIcon = activeTabConfig.icon;
  const screenContent: Record<
    HeroEvidenceTabId,
    {
      status: string;
      claim: string;
      chips: string[];
      leftTitle: string;
      leftBody: string;
      centerTitle: string;
      centerBody: string;
      rightTitle: string;
      rightBody: string;
      workflow: string[];
    }
  > = {
    attendance: {
      status: "Log reviewed",
      claim: "Attendance evidence matched to Q2 workforce sessions",
      chips: ["240 rows", "2 files", "3 sessions"],
      leftTitle: "Roster",
      leftBody: "Names and sessions linked.",
      centerTitle: "Attendance Log",
      centerBody: "CSV records matched to the claim.",
      rightTitle: "Status",
      rightBody: "Completed and attended rows separated.",
      workflow: ["Import", "Attendance", "Matched"],
    },
    confirmation: {
      status: "Confirmed",
      claim: "Partner confirmation attached to the disclosure claim",
      chips: ["Bright Futures", "May 15", "Named reviewer"],
      leftTitle: "Partner",
      leftBody: "Organization record selected.",
      centerTitle: "Confirmation",
      centerBody: "Reviewer, role, and date captured.",
      rightTitle: "Approval",
      rightBody: "Confirmation tied to source support.",
      workflow: ["Partner", "Confirm", "Record"],
    },
    documents: {
      status: "4 linked records",
      claim: "Source artifacts attached to the claim package",
      chips: ["PDF index", "4 files", "Source support"],
      leftTitle: "Files",
      leftBody: "Artifacts indexed by claim.",
      centerTitle: "Documents",
      centerBody: "Primary files available for review.",
      rightTitle: "Trace",
      rightBody: "Each file links back to evidence.",
      workflow: ["Collect", "Documents", "Index"],
    },
    completion: {
      status: "Record aligned",
      claim: "Training completion record supports participant count",
      chips: ["240 completed", "Q2 2026", "Owner set"],
      leftTitle: "Program",
      leftBody: "Workforce development period set.",
      centerTitle: "Completion",
      centerBody: "Completion count checked against records.",
      rightTitle: "Owner",
      rightBody: "Submitting organization retained.",
      workflow: ["Program", "Completion", "Support"],
    },
    mapping: {
      status: "Context only",
      claim: "Disclosure context mapped without changing evidence strength",
      chips: ["GRI 413-1", "SDG 8", "No certification"],
      leftTitle: "Framework",
      leftBody: "Reporting category selected.",
      centerTitle: "Mapping",
      centerBody: "Context layer kept separate.",
      rightTitle: "Limit",
      rightBody: "Mapping does not verify outcomes.",
      workflow: ["Claim", "Mapping", "Limit"],
    },
  };
  const activeScreen = screenContent[activeTab];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="bg-[#061A36] px-5 py-4 text-sm font-extrabold uppercase tracking-[0.12em] text-white">
        CORPORATE ESG REPORTING WORKFLOW
      </div>

      <div className="relative overflow-hidden bg-[#f5f7fb] px-5 pb-5 pt-7">
        <div className="relative mx-auto max-w-[610px]">
          <div className="mx-auto w-[88%] rounded-t-[1.4rem] border-[10px] border-[#07101f] bg-[#07101f] shadow-2xl">
            <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-white">
              <div className="absolute inset-y-0 left-0 w-11 bg-[#09213f]" />
              <div className="absolute left-3.5 top-4 grid h-4 w-4 grid-cols-2 gap-0.5">
                <span className="rounded-sm bg-[#c88914]" />
                <span className="rounded-sm bg-[#c88914]" />
                <span className="rounded-sm bg-[#c88914]" />
                <span className="rounded-sm bg-[#c88914]" />
              </div>
              {[ShieldCheck, FileText, GitBranch, Users].map((Icon, index) => (
                <div key={index} className="absolute left-3.5 grid h-4 w-4 place-items-center rounded bg-white/10" style={{ top: `${54 + index * 34}px` }}>
                  <Icon className="h-2.5 w-2.5 text-white/75" />
                </div>
              ))}

              <div className="absolute left-16 right-6 top-5 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-extrabold text-[#0A1F44]">ESG Evidence Workspace</p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">{activeTabConfig.title}</p>
                </div>
                <div className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-extrabold text-emerald-700">{activeScreen.status}</div>
              </div>

              <div className="absolute left-16 right-6 top-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-extrabold leading-snug text-[#0A1F44]">{activeScreen.claim}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {activeScreen.chips.map((label) => (
                    <div key={label} className="rounded bg-white px-2 py-1 text-[8px] font-bold text-slate-600 shadow-sm">
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute left-[116px] right-[86px] top-[178px] h-px bg-[#c88914]/45" />
              <div className="absolute left-[116px] top-[178px] h-12 w-px bg-[#c88914]/30" />
              <div className="absolute right-[86px] top-[178px] h-12 w-px bg-[#c88914]/30" />

              <div className="absolute left-16 top-[158px] w-28 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-[#fff9eb]">
                    <FileText className="h-3.5 w-3.5 text-[#c88914]" />
                  </div>
                  <p className="text-[9px] font-extrabold text-[#0A1F44]">{activeScreen.leftTitle}</p>
                </div>
                <p className="text-[8px] font-semibold leading-snug text-slate-500">{activeScreen.leftBody}</p>
              </div>

              <div className="absolute left-1/2 top-[146px] w-36 -translate-x-1/2 rounded-lg border-2 border-[#c88914] bg-[#fff9eb] p-3 shadow-lg">
                <div className="mb-2 flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-white">
                    <ActiveTabIcon className="h-3.5 w-3.5 text-[#0A1F44]" />
                  </div>
                  <p className="truncate text-[9px] font-extrabold text-[#0A1F44]">{activeScreen.centerTitle}</p>
                </div>
                <p className="text-[8px] font-semibold leading-snug text-slate-600">{activeScreen.centerBody}</p>
              </div>

              <div className="absolute right-8 top-[158px] w-28 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                  </div>
                  <p className="text-[9px] font-extrabold text-[#0A1F44]">{activeScreen.rightTitle}</p>
                </div>
                <p className="text-[8px] font-semibold leading-snug text-slate-500">{activeScreen.rightBody}</p>
              </div>

              <div className="absolute bottom-6 left-16 right-6 grid grid-cols-3 gap-3">
                {activeScreen.workflow.map((label, index) => (
                  <div key={label} className={`rounded-md border px-3 py-2 shadow-sm ${index === 1 ? "border-[#c88914]/50 bg-[#fff9eb]" : "border-slate-200 bg-slate-50"}`}>
                    <p className="truncate text-[9px] font-extrabold uppercase tracking-wide text-[#0A1F44]">{label}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto h-7 w-[95%] rounded-b-[2rem] bg-gradient-to-b from-slate-600 to-slate-900 shadow-2xl">
            <div className="mx-auto h-1.5 w-32 rounded-b-full bg-slate-400/60" />
          </div>
          <div className="mx-auto h-2 w-[78%] rounded-full bg-black/15 blur-sm" />
        </div>

        <div role="tablist" aria-label="Linked ESG evidence records" className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {heroEvidenceTabs.map(({ id, title, meta, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Show ${title} evidence detail`}
                onClick={() => setActiveTab(id)}
                className={`group rounded-lg border p-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c88914] focus-visible:ring-offset-2 ${
                  isActive
                    ? "border-[#c88914] bg-white shadow-lg"
                    : "border-slate-200 bg-white/90 hover:-translate-y-0.5 hover:border-[#0A1F44]/30 hover:shadow-md"
                }`}
              >
                <Icon className={`mx-auto h-8 w-8 ${isActive ? "text-[#0A1F44]" : "text-slate-500 group-hover:text-[#0A1F44]"}`} />
                <p className="mt-2 text-center text-[11px] font-extrabold leading-tight text-[#0A1F44]">{title}</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">{meta}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 px-3 py-1 text-xs font-semibold text-[#0A1F44]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          Traceable to approved records. Built for evidence review.
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function MarketingHome() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [activeFrameworkCard, setActiveFrameworkCard] = useState<number | null>(null);
  const [activeFlowStep, setActiveFlowStep] = useState<number | null>(null);

  return (
    <MarketingLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-14">
          <div>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.04] tracking-tight text-[#0A1F44] md:text-5xl">
              ESG evidence your team can trace, review, and report.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#0A1F44]/80">
              Synerxus helps ESG teams organize approved activity records, confirmation status, and evidence summaries before they appear in disclosure workflows.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-[#c88914] text-white hover:bg-[#a9720f]">
                <Link href="/request-assessment">Request Readiness Assessment</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#0A1F44] text-[#0A1F44]">
                <Link href="/for-esg-teams">For ESG Teams</Link>
              </Button>
            </div>
            <div className="mt-8 flex gap-4 rounded-md border border-[#c88914]/30 bg-[#fff9eb] p-4 text-sm leading-relaxed text-[#0A1F44]">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#c88914]" />
              <p>
                ESG dashboard figures reflect organization-approved activity records. They are not downstream impact claims or formal assurance conclusions.
              </p>
            </div>
          </div>

          <HeroEvidenceVisual />
        </div>
      </section>

      {/* ── Entry Points ────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-8">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 md:grid-cols-2 md:px-8">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-extrabold text-[#0A1F44]">For Organizations</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Define your project metrics. Post opportunities. Approve contributions. Generate verified evidence summaries for funders and corporate partners.
            </p>
            <Link href="/use-cases" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#c88914] hover:text-[#a9720f]">
              For organizations <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-extrabold text-[#0A1F44]">For Corporations</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              See your employees' confirmed contributions — filtered by person and organization, traceable to every approved record.
            </p>
            <Link href="/for-esg-teams" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#c88914] hover:text-[#a9720f]">
              For ESG teams <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Evidence Categories ──────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-center text-2xl font-extrabold text-[#0A1F44]">
            Most ESG reporting treats all evidence as equal. Synerxus does not.
          </h2>
          <p className="mt-1 text-center text-sm text-slate-400">Click any category to learn more.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {evidenceCategories.map((cat, index) => {
              const CategoryIcon = cat.icon;
              const isSelected = selectedCategory === index;
              const isDimmed = selectedCategory !== null && !isSelected;
              return (
                <button
                  key={cat.title}
                  type="button"
                  onClick={() => setSelectedCategory((prev) => (prev === index ? null : index))}
                  className={`rounded-md border bg-white p-6 text-center shadow-sm transition-all duration-200 ${
                    isSelected
                      ? "border-[#0A1F44] shadow-md ring-2 ring-[#0A1F44]/20"
                      : isDimmed
                      ? "border-slate-200 opacity-50 hover:opacity-80"
                      : "border-slate-200 hover:border-[#0A1F44]/30 hover:shadow-md"
                  }`}
                >
                  <CategoryIcon className={`mx-auto h-10 w-10 transition-colors ${isSelected ? "text-[#c88914]" : "text-[#0A1F44]"}`} />
                  <h3 className="mt-4 text-sm font-extrabold text-[#0A1F44]">{cat.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{cat.body}</p>

                  {/* Strength indicator */}
                  <div className="mt-4 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Evidence strength</p>
                      <p className="text-[10px] font-bold text-slate-500">{cat.strength}%</p>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-1.5 rounded-full ${strengthFillClass(cat.strength)}`}
                        style={{ width: `${cat.strength}%` }}
                      />
                    </div>
                    {cat.note && (
                      <p className="mt-1 text-[10px] italic text-slate-500">{cat.note}</p>
                    )}
                  </div>

                  {isSelected && (
                    <div className="mt-4 border-t border-slate-200 pt-4 text-left">
                      <p className="text-xs leading-relaxed text-slate-700">{cat.detail}</p>
                      <Link
                        href="/evidence-ladder"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#c88914] transition-colors hover:text-[#a9720f]"
                      >
                        View Evidence Ladder <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  <p className={`mt-4 text-xs font-bold text-[#c88914] transition-opacity ${isSelected ? "opacity-0 h-0" : "opacity-0 group-hover:opacity-100"}`}>
                    {isSelected ? "" : "See detail →"}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Not sure which use case applies to you?{" "}
            <Link href="/use-cases" className="font-semibold text-[#c88914] transition-colors hover:text-[#a9720f]">
              See all use cases →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Frameworks ───────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-center text-2xl font-extrabold text-[#0A1F44]">
            Organize evidence across reporting, mapping, and review contexts.
          </h2>
          <p className="mx-auto mt-2 max-w-4xl text-center text-sm leading-relaxed text-slate-600">
            Synerxus helps teams connect claim-level evidence to the reporting, disclosure, SDG mapping, and assurance-preparation contexts they use — while keeping confirmation status, source support, assumptions, and limitations visible.
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-4">
            {frameworkCards.map((card, index) => {
              const CardIcon = card.icon;
              const isActive = activeFrameworkCard === index;
              return (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => setActiveFrameworkCard((prev) => (prev === index ? null : index))}
                  aria-expanded={isActive}
                  className={`rounded-md border bg-slate-50 p-4 text-left transition-all duration-200 ${
                    isActive
                      ? "border-[#0A1F44] shadow-md ring-2 ring-[#0A1F44]/10"
                      : "border-slate-200 hover:border-[#0A1F44]/30 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white">
                      <CardIcon className="h-5 w-5 text-[#0A1F44]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-extrabold text-[#0A1F44]">{card.title}</h3>
                      <p className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-slate-500">{card.items.join(" · ")}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isActive ? "rotate-180 text-[#0A1F44]" : ""}`} />
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">{card.description}</p>
                  <p className="mt-4 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-500">{card.boundary}</p>
                  {isActive && (
                    <div className="mt-4 rounded-md border border-[#0A1F44]/10 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0A1F44]/60">Synerxus use</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{card.detail}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-[#0A1F44]">
            Framework and SDG alignment supports reporting context only. It does not constitute certification, formal assurance, endorsement, legal advice, regulatory compliance determination, SDG impact certification, or causal attribution.
          </p>
        </div>
      </section>

      {/* ── Evidence Flow Diagram ────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-center text-sm font-extrabold uppercase tracking-[0.18em] text-[#0A1F44]">
              Bottom-up evidence flow
            </h2>
            <p className="mt-1 text-center text-xs text-slate-400">Click any step to learn more.</p>

            <div className="mt-6 grid gap-5 md:grid-cols-5">
              {evidenceFlow.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeFlowStep === index;
                return (
                  <div key={step.title} className="relative text-center">
                    <button
                      type="button"
                      onClick={() => setActiveFlowStep((prev) => (prev === index ? null : index))}
                      className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-200 ${
                        isActive
                          ? "border-[#0A1F44] bg-[#0A1F44] shadow-md"
                          : "border-slate-200 bg-white hover:border-[#c88914]/60 hover:shadow-md"
                      }`}
                    >
                      <Icon className={`h-8 w-8 transition-colors ${isActive ? "text-[#c88914]" : "text-[#0A1F44]"}`} />
                    </button>
                    {index < evidenceFlow.length - 1 && (
                      <ArrowRight className="absolute right-[-18px] top-6 hidden h-6 w-6 text-[#c88914] md:block" />
                    )}
                    <Link
                      href="/platform"
                      className={`mt-3 block text-sm font-extrabold uppercase transition-colors hover:text-[#c88914] ${isActive ? "text-[#c88914]" : "text-[#0A1F44]"}`}
                    >
                      {step.title}
                    </Link>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.body}</p>
                  </div>
                );
              })}
            </div>

            {activeFlowStep !== null && (
              <div className="mt-6 rounded-lg border border-[#0A1F44]/20 bg-[#f8fafc] p-5">
                <div className="flex items-start gap-4">
                  {(() => { const I = evidenceFlow[activeFlowStep].icon; return <I className="h-7 w-7 shrink-0 text-[#0A1F44]" />; })()}
                  <div className="flex-1">
                    <h3 className="font-extrabold text-[#0A1F44]">{evidenceFlow[activeFlowStep].title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{evidenceFlow[activeFlowStep].detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveFlowStep(null)}
                    className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-700"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="bg-white pb-10 pt-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-6 rounded-xl bg-[#061A36] p-8 text-white md:grid-cols-[auto_1fr_auto] md:items-center">
            <ShieldCheck className="hidden h-16 w-16 shrink-0 text-[#c88914] md:block" />
            <div>
              <h2 className="text-3xl font-extrabold text-white">Find out how defensible your claims are.</h2>
              <p className="mt-2 max-w-2xl text-white/80">
                Get a clear view of your evidence maturity, source-support gaps, confirmation status, and reporting limitations before claims appear in reports or review workflows.
              </p>
              <Link
                href="/platform"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 transition-colors hover:text-white"
              >
                See how it works <ArrowRight className="h-3.5 w-3.5" /> Platform
              </Link>
            </div>
            <Button asChild size="lg" className="bg-[#c88914] text-white hover:bg-[#a9720f] active:bg-[#8a5f0a]">
              <Link href="/request-assessment">
                Request Readiness Assessment <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
