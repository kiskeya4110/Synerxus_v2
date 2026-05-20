import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
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

// ── Types ────────────────────────────────────────────────────────────────────

type Status = "AVAILABLE NOW" | "IN DEVELOPMENT" | "ON ROADMAP";
type StatusFilter = Status | "ALL";
type CapabilityTab = "in" | "out";
type StatusTone = "emerald" | "amber" | "slate";

type Capability = {
  title: string;
  status: Status;
  body: string;
  icon: LucideIcon;
};

type FlowBox = {
  title: string;
  items: string[];
  detail: string;
};

// ── Data ────────────────────────────────────────────────────────────────────

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
    detail:
      "Raw evidence material lives here before it has been organized, confirmed, or traced to a claim. Synerxus does not replace these sources — it receives them.",
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
    detail:
      "Synerxus structures your raw records into traceable claim-level evidence packets with confirmation status, source support, exception notes, and limitation flags — without forcing you to replace anything upstream.",
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
    detail:
      "Evidence-backed summaries and exports support ESG reports, board materials, funder updates, and assurance provider handoffs. Your reporting tool stays in place.",
  },
];

const statusSummary: {
  label: string;
  icon: LucideIcon;
  tone: StatusTone;
  summary: string;
  meaning: string;
  value: string;
}[] = [
  {
    label: "Available Now",
    icon: CheckCircle2,
    tone: "emerald",
    summary: "Ready to use",
    meaning: "Capabilities active in the current platform.",
    value: "Manual entry, image uploads, HTML evidence summaries",
  },
  {
    label: "In Development",
    icon: PlugZap,
    tone: "amber",
    summary: "Being built",
    meaning: "Near-term workflows under active product development.",
    value: "Partner portal, PDF output, assurance-preparation export",
  },
  {
    label: "Roadmap",
    icon: GitBranch,
    tone: "slate",
    summary: "Planned next",
    meaning: "Planned integrations and automation not claimed as live yet.",
    value: "API, spreadsheet import, native ESG platform integrations",
  },
];

const statusToneClasses = {
  emerald: {
    card: "border-emerald-200 bg-emerald-50/60",
    icon: "bg-emerald-700 text-white",
    label: "text-emerald-800",
    chip: "border-emerald-200 bg-white text-emerald-800",
  },
  amber: {
    card: "border-amber-200 bg-amber-50/70",
    icon: "bg-[#c88914] text-white",
    label: "text-[#8a5a08]",
    chip: "border-amber-200 bg-white text-[#8a5a08]",
  },
  slate: {
    card: "border-slate-200 bg-slate-50",
    icon: "bg-[#0A1F44] text-[#ffcc33]",
    label: "text-[#0A1F44]",
    chip: "border-slate-200 bg-white text-slate-700",
  },
};

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusOrder(s: Status): number {
  return s === "AVAILABLE NOW" ? 0 : s === "IN DEVELOPMENT" ? 1 : 2;
}

function filterCapabilities(items: Capability[], filter: StatusFilter): Capability[] {
  if (filter === "ALL") return items;
  return items.filter((c) => c.status === filter);
}

function countByStatus(items: Capability[]): Record<StatusFilter, number> {
  return {
    ALL: items.length,
    "AVAILABLE NOW": items.filter((c) => c.status === "AVAILABLE NOW").length,
    "IN DEVELOPMENT": items.filter((c) => c.status === "IN DEVELOPMENT").length,
    "ON ROADMAP": items.filter((c) => c.status === "ON ROADMAP").length,
  };
}

// ── Components ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const classes =
    status === "AVAILABLE NOW"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "IN DEVELOPMENT"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${classes}`}>
      {status}
    </span>
  );
}

function StatusFilterBar({
  activeFilter,
  onFilterChange,
  counts,
}: {
  activeFilter: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}) {
  const options: { label: string; value: StatusFilter; dot: string }[] = [
    { label: "All", value: "ALL", dot: "bg-slate-400" },
    { label: "Available now", value: "AVAILABLE NOW", dot: "bg-emerald-500" },
    { label: "In development", value: "IN DEVELOPMENT", dot: "bg-amber-400" },
    { label: "On roadmap", value: "ON ROADMAP", dot: "bg-slate-300" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {options.map(({ label, value, dot }) => {
        const isActive = activeFilter === value;
        const count = counts[value];
        return (
          <button
            key={value}
            type="button"
            onClick={() => onFilterChange(value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1F44] ${
              isActive
                ? "border-[#0A1F44] bg-[#0A1F44] text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#0A1F44]/40 hover:text-[#0A1F44]"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white/60" : dot}`} />
            {label}
            {count > 0 && (
              <span className={`rounded-full px-1.5 text-[10px] font-extrabold ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ExpandableCard({
  item,
  isExpanded,
  onToggle,
  variant = "navy",
}: {
  item: Capability;
  isExpanded: boolean;
  onToggle: () => void;
  variant?: "navy" | "emerald";
}) {
  const Icon = item.icon;
  const iconClass = variant === "emerald"
    ? isExpanded ? "bg-emerald-600 text-white" : "bg-emerald-700 text-white"
    : isExpanded ? "bg-[#c88914] text-white" : "bg-[#0A1F44] text-[#ffcc33]";
  const borderActive = variant === "emerald" ? "border-emerald-700 shadow-md" : "border-[#0A1F44] shadow-md";
  return (
    <div
      data-expandable-card="true"
      className={`rounded-lg border bg-white transition-all duration-200 ${
        isExpanded ? borderActive : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A1F44]"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-200 ${iconClass}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-[#0A1F44]">{item.title}</p>
          <div className="mt-1">
            <StatusBadge status={item.status} />
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isExpanded
              ? variant === "emerald"
                ? "rotate-180 text-emerald-700"
                : "rotate-180 text-[#0A1F44]"
              : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="border-t border-slate-100 pt-3">
            <p className="text-sm leading-relaxed text-slate-700">{item.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function FlowDiagram() {
  const [activeBox, setActiveBox] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeBox === null) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setActiveBox(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeBox]);

  const boxActiveStyles = [
    { button: "border-[#0A1F44] bg-[#0A1F44]", check: "text-[#ffcc33]" },
    { button: "border-[#c88914] bg-[#c88914]", check: "text-white" },
    { button: "border-emerald-700 bg-emerald-700", check: "text-white" },
  ];

  return (
    <div ref={containerRef} className="mt-5 sm:mt-6">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
        {flowBoxes.map((box, index) => {
          const isActive = activeBox === index;
          return (
            <div key={box.title} className="contents">
              <button
                type="button"
                onClick={() => setActiveBox((prev) => (prev === index ? null : index))}
                aria-expanded={isActive}
                className={`w-full rounded-lg border p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1F44] sm:p-5 ${
                  isActive
                    ? boxActiveStyles[index].button + " shadow-lg"
                    : "border-slate-200 bg-white hover:border-[#0A1F44]/40 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-sm font-extrabold sm:text-base ${isActive ? "text-white" : "text-[#0A1F44]"}`}>
                    {box.title}
                  </h3>
                  <ChevronDown
                    className={`mt-0.5 h-4 w-4 shrink-0 transition-transform duration-200 ${isActive ? "rotate-180 text-white/60" : "text-slate-400"}`}
                  />
                </div>
                <ul className="mt-3 space-y-1.5">
                  {box.items.map((item) => (
                    <li key={item} className={`flex gap-2 text-xs sm:text-sm ${isActive ? "text-white/90" : "text-slate-700"}`}>
                      <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isActive ? boxActiveStyles[index].check : "text-[#c88914]"}`} />
                      {item}
                    </li>
                  ))}
                </ul>
                {isActive && (
                  <p className="mt-3 border-t border-white/20 pt-3 text-xs leading-relaxed text-white/75">
                    {box.detail}
                  </p>
                )}
              </button>
              {index < flowBoxes.length - 1 && (
                <div className="flex items-center justify-center text-[#c88914]">
                  <ArrowRight className="hidden h-6 w-6 lg:block" />
                  <div className="h-6 w-px bg-[#c88914]/40 lg:hidden" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mx-auto mt-5 max-w-4xl text-center text-sm font-semibold leading-relaxed text-slate-600">
        Synerxus does not replace your reporting tool or your assurance provider. It fills the gap between raw data and a reviewable evidence package.
      </p>
    </div>
  );
}

function PipelinePreview() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xl sm:rounded-xl sm:p-5">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0A1F44] text-[#ffcc33]">
          <Layers3 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Integration posture</p>
          <p className="text-base font-extrabold text-[#0A1F44]">Evidence layer, not system replacement</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {[
          ["Input", "Records, source files, confirmations", "bg-[#0A1F44] text-[#ffcc33]"],
          ["Structure", "Claims, evidence packets, exceptions", "bg-amber-100 text-amber-800"],
          ["Output", "Reviewable summaries and exports", "bg-emerald-100 text-emerald-800"],
        ].map(([label, value, labelClass], index) => (
          <div key={label} className="grid gap-2 sm:grid-cols-[80px_1fr] sm:items-center sm:gap-3">
            <span className={`rounded-md px-3 py-1.5 text-xs font-extrabold ${labelClass}`}>{label}</span>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-sm font-semibold text-slate-700">{value}</span>
              {index < 2 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#c88914]" />}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold leading-relaxed text-[#0A1F44]">
        Native reporting-platform integrations are not claimed as available in the current build.
      </div>
    </div>
  );
}

function CapabilitySection({
  expandedCards,
  onToggle,
}: {
  expandedCards: Set<string>;
  onToggle: (title: string) => void;
}) {
  const [tab, setTab] = useState<CapabilityTab>("in");
  const [filter, setFilter] = useState<StatusFilter>("ALL");

  const allItems = [...inputMethods, ...outputMethods];
  const allCounts = countByStatus(allItems);
  const visibleIn = filterCapabilities(inputMethods, filter);
  const visibleOut = filterCapabilities(outputMethods, filter);

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4">
        <StatusFilterBar activeFilter={filter} onFilterChange={setFilter} counts={allCounts} />
      </div>

      {/* Mobile tab switcher */}
      <div className="mb-4 flex rounded-lg border border-slate-200 bg-slate-100 p-1 lg:hidden">
        {(["in", "out"] as CapabilityTab[]).map((t) => {
          const label = t === "in" ? "Evidence In" : "Evidence Out";
          const count = t === "in" ? filterCapabilities(inputMethods, filter).length : filterCapabilities(outputMethods, filter).length;
          const isActive = tab === t;
          const activeText = t === "in" ? "text-[#0A1F44]" : "text-emerald-700";
          const activePill = t === "in" ? "bg-[#0A1F44] text-white" : "bg-emerald-700 text-white";
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md py-2 text-sm font-bold transition-all duration-150 ${
                isActive ? `bg-white shadow-sm ${activeText}` : "text-slate-500 hover:text-[#0A1F44]"
              }`}
            >
              {label}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${isActive ? activePill : "bg-slate-200 text-slate-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile: single active tab */}
      <div className="grid gap-2.5 lg:hidden">
        {(tab === "in" ? visibleIn : visibleOut).map((item) => (
          <ExpandableCard
            key={item.title}
            item={item}
            isExpanded={expandedCards.has(item.title)}
            onToggle={() => onToggle(item.title)}
            variant={tab === "in" ? "navy" : "emerald"}
          />
        ))}
        {(tab === "in" ? visibleIn : visibleOut).length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">No items match this filter.</p>
        )}
      </div>

      {/* Desktop: side-by-side columns */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
        {[
          { label: "Evidence in", icon: Upload, items: visibleIn, variant: "navy" as const },
          { label: "Evidence out", icon: FileDown, items: visibleOut, variant: "emerald" as const },
        ].map(({ label, icon: Icon, items, variant }) => (
          <div key={label}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-md ${variant === "emerald" ? "bg-emerald-700 text-white" : "bg-[#0A1F44] text-[#ffcc33]"}`}>
                <Icon className="h-4 w-4" />
              </span>
              <h3 className={`text-base font-extrabold ${variant === "emerald" ? "text-emerald-800" : "text-[#0A1F44]"}`}>{label}</h3>
            </div>
            <div className="grid gap-2.5">
              {items.map((item) => (
                <ExpandableCard
                  key={item.title}
                  item={item}
                  isExpanded={expandedCards.has(item.title)}
                  onToggle={() => onToggle(item.title)}
                  variant={variant}
                />
              ))}
              {items.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">No items match this filter.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NativeIntegrationCards() {
  const [expanded, setExpanded] = useState<"current" | "roadmap" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded === null) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setExpanded(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  const cards = [
    {
      id: "current" as const,
      badge: "AVAILABLE NOW" as Status,
      icon: PlugZap,
      title: "Current state",
      body: "Synerxus currently operates as a standalone evidence workspace. Evidence summaries and exports can be referenced in reporting tools your team uses, including office documents, shared workspaces, or custom platforms, through file export and manual reference.",
    },
    {
      id: "roadmap" as const,
      badge: "ON ROADMAP" as Status,
      icon: GitBranch,
      title: "What we are building toward",
      body: "Native integrations with ESG reporting platforms are on our development roadmap. If you have a specific integration requirement, tell us in the assessment intake; we use those requests to prioritize integration development.",
    },
  ];

  return (
    <div ref={containerRef} className="mt-5 grid gap-3 sm:mt-6 md:grid-cols-2">
      {cards.map((card) => {
        const Icon = card.icon;
        const isExpanded = expanded === card.id;
        return (
          <div
            key={card.id}
            className={`rounded-lg border bg-white transition-all duration-200 ${
              isExpanded ? "border-[#0A1F44] shadow-md" : "border-slate-200 shadow-sm"
            }`}
          >
            <button
              type="button"
              onClick={() => setExpanded((prev) => (prev === card.id ? null : card.id))}
              aria-expanded={isExpanded}
              className="flex w-full items-start gap-3 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A1F44] sm:p-5"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${isExpanded ? "bg-[#c88914] text-white" : "bg-[#0A1F44] text-[#ffcc33]"}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <StatusBadge status={card.badge} />
                <h3 className="mt-1.5 text-base font-extrabold text-[#0A1F44]">{card.title}</h3>
              </div>
              <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180 text-[#0A1F44]" : ""}`} />
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-sm leading-relaxed text-slate-700">{card.body}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SecuritySection({
  expandedCards,
  onToggle,
}: {
  expandedCards: Set<string>;
  onToggle: (title: string) => void;
}) {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const counts = countByStatus(securityItems);
  const visible = filterCapabilities(securityItems, filter).slice().sort((a, b) => statusOrder(a.status) - statusOrder(b.status));

  return (
    <div>
      <div className="mb-4">
        <StatusFilterBar activeFilter={filter} onFilterChange={setFilter} counts={counts} />
      </div>
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <ExpandableCard
            key={item.title}
            item={item}
            isExpanded={expandedCards.has(item.title)}
            onToggle={() => onToggle(item.title)}
          />
        ))}
        {visible.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-slate-400">No items match this filter.</p>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (expandedCards.size === 0) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest("[data-expandable-card]")) {
        setExpandedCards(new Set());
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expandedCards.size]);

  function toggleCard(title: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  }

  return (
    <MarketingLayout>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-6 sm:py-10 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#c88914]">
              Integrations and data flow
            </p>
            <h1 className="mt-3 max-w-3xl text-2xl font-extrabold leading-tight text-[#0A1F44] sm:text-3xl md:text-4xl">
              Connect evidence work to the systems your team already uses.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-base">
              Synerxus sits between raw activity records and external ESG reporting workflows. It helps teams organize claim-level evidence before information moves into reports, board materials, funder updates, or assurance review.
            </p>
            <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-3">
              {statusSummary.map((item) => {
                const Icon = item.icon;
                const tone = statusToneClasses[item.tone];
                return (
                  <div key={item.label} className={`rounded-lg border p-3.5 shadow-sm ${tone.card}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone.icon}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className={`text-[10px] font-extrabold uppercase tracking-wide ${tone.label}`}>{item.label}</p>
                        <p className="text-sm font-extrabold leading-tight text-[#0A1F44]">{item.summary}</p>
                      </div>
                    </div>
                    <p className="mt-3 min-h-[2.5rem] text-xs font-semibold leading-relaxed text-slate-700">{item.meaning}</p>
                    <div className={`mt-3 rounded-md border px-2.5 py-2 text-[11px] font-bold leading-snug ${tone.chip}`}>
                      {item.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <PipelinePreview />
        </div>
      </section>

      {/* ── Operating model ───────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-slate-50 py-6 sm:py-10 md:py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#c88914]">Operating model</p>
          <h2 className="mt-2 text-xl font-extrabold leading-tight text-[#0A1F44] sm:text-2xl">Where Synerxus sits</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            The platform is designed to improve traceability around evidence, confirmation, exceptions, and limitations without forcing a full replacement of reporting or document workflows.
          </p>
          <p className="mt-2 text-xs text-slate-400">Tap any stage to learn more.</p>
          <FlowDiagram />
        </div>
      </section>

      {/* ── Inputs and outputs ────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-6 sm:py-10 md:py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#c88914]">Inputs and outputs</p>
          <h2 className="mt-2 text-xl font-extrabold leading-tight text-[#0A1F44] sm:text-2xl">How evidence moves through Synerxus</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            Current capabilities support direct evidence work today, while higher-volume import and export workflows are being built deliberately around traceability and validation.
          </p>
          <div className="mt-5 sm:mt-6">
            <CapabilitySection expandedCards={expandedCards} onToggle={toggleCard} />
          </div>
        </div>
      </section>

      {/* ── Native integrations ───────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-slate-50 py-6 sm:py-10 md:py-12">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#c88914]">Native integrations</p>
          <h2 className="mt-2 text-xl font-extrabold leading-tight text-[#0A1F44] sm:text-2xl">Does Synerxus connect to your reporting tool?</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            The honest answer depends on what you mean by connect. Synerxus can support reporting workflows today through exported evidence outputs and manual references; native platform-to-platform integrations are roadmap work.
          </p>
          <NativeIntegrationCards />
          <p className="mt-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-600">
            No specific reporting platform is named here as integrated because the current build reviewed for this page does not include a native technical integration with an external ESG reporting platform.
          </p>
        </div>
      </section>

      {/* ── Security ──────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-6 sm:py-10 md:py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#c88914]">Security and procurement</p>
          <h2 className="mt-2 text-xl font-extrabold leading-tight text-[#0A1F44] sm:text-2xl">Your data in Synerxus</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            This page states the current build plainly so IT, legal, and procurement teams can evaluate fit early.
          </p>
          <div className="mt-5 sm:mt-6">
            <SecuritySection expandedCards={expandedCards} onToggle={toggleCard} />
          </div>
        </div>
      </section>

      {/* ── Fit check ─────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-slate-50 py-6 sm:py-10 md:py-12">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#c88914]">Fit check</p>
            <h2 className="mt-2 text-xl font-extrabold text-[#0A1F44]">What to confirm during assessment</h2>
          </div>
          <div className="rounded-lg border border-[#c88914]/60 bg-[#fff9eb] p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {integrationPrinciples.map((item) => (
                <div key={item} className="flex gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#c88914]" />
                  <p className="text-sm font-bold leading-snug text-[#0A1F44]">{item}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#0A1F44]">
              Some capabilities on this page are available now. Some are in development. Some are on the roadmap. If your organization requires a specific source system, export format, security control, or procurement document, include it in the assessment intake so fit can be confirmed before implementation planning.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-white py-6 sm:py-10">
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
