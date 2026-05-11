import { useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  GitBranch,
  Layers3,
  ListChecks,
  Network,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import {
  ASSURANCE_BOUNDARY,
  evidenceLadderLevels,
  frameworks,
  insights,
  primaryUseCases,
} from "./marketing-data";

export function SectionHeader({
  eyebrow,
  title,
  body,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  dark?: boolean;
}) {
  return (
    <div className="mb-4 max-w-3xl">
      {eyebrow && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
          {eyebrow}
        </p>
      )}
      <h2 className={`text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl ${dark ? "text-[#D4980C]" : "text-[#0A1F44]"}`}>
        {title}
      </h2>
      {body && (
        <p className={`mt-2 text-sm leading-relaxed sm:text-base ${dark ? "text-[#D4980C]" : "text-slate-600"}`}>
          {body}
        </p>
      )}
    </div>
  );
}

export function BoundaryNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
      <strong>Boundary statement:</strong> {ASSURANCE_BOUNDARY}
      <span className="mt-2 block">
        Synerxus is an evidence infrastructure layer that helps reporting teams organize, confirm, classify, and package evidence behind claims. It is not an ESG reporting platform, assurance provider, SDG certifier, impact evaluator, volunteer marketplace, or compliance engine.
      </span>
    </div>
  );
}

const FRAMEWORK_LOGOS = [
  {
    abbr: "CSRD",
    sub: "EU Directive",
    icon: (
      <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
        <circle cx="18" cy="18" r="18" fill="#003399" />
        {/* 8 gold dots in a ring — simplified EU stars */}
        {[0,1,2,3,4,5,6,7].map((i) => {
          const a = (i * 45 - 90) * (Math.PI / 180);
          return <circle key={i} cx={+(18 + 10 * Math.cos(a)).toFixed(2)} cy={+(18 + 10 * Math.sin(a)).toFixed(2)} r="2" fill="#FFD700" />;
        })}
      </svg>
    ),
  },
  {
    abbr: "ESRS",
    sub: "EU Standards",
    icon: (
      <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
        <circle cx="18" cy="18" r="18" fill="#003399" />
        {[0,1,2,3,4,5,6,7].map((i) => {
          const a = (i * 45 - 90) * (Math.PI / 180);
          return <circle key={i} cx={+(18 + 10 * Math.cos(a)).toFixed(2)} cy={+(18 + 10 * Math.sin(a)).toFixed(2)} r="2" fill="#FFD700" />;
        })}
        <text x="18" y="22" fontSize="8" fontWeight="800" fill="#FFD700" textAnchor="middle" fontFamily="system-ui,sans-serif">E</text>
      </svg>
    ),
  },
  {
    abbr: "GRI 413",
    sub: "Global Reporting Initiative",
    icon: (
      <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
        <circle cx="18" cy="18" r="18" fill="#ffffff" />
        {/* GRI-style concentric arcs */}
        <path d="M18 4 A14 14 0 0 1 32 18" stroke="#F36F21" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M18 8 A10 10 0 0 1 28 18" stroke="#009A44" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M18 12 A6 6 0 0 1 24 18" stroke="#F36F21" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="18" cy="18" r="3" fill="#003366" />
      </svg>
    ),
  },
  {
    abbr: "SASB",
    sub: "SASB Standards",
    icon: (
      <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
        <rect width="36" height="36" rx="6" fill="#005780" />
        {/* Diamond shape */}
        <path d="M18 8 L28 18 L18 28 L8 18 Z" fill="none" stroke="#7DD4F0" strokeWidth="2" />
        <text x="18" y="22" fontSize="9" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="system-ui,sans-serif">S</text>
      </svg>
    ),
  },
  {
    abbr: "ISSB",
    sub: "IFRS Foundation",
    icon: (
      <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
        <rect width="36" height="36" rx="6" fill="#003466" />
        {/* IFRS-style blue accent bar */}
        <rect x="0" y="28" width="36" height="8" rx="0" fill="#41B6E6" />
        <rect x="0" y="32" width="36" height="4" rx="0" fill="#41B6E6" />
        <text x="18" y="22" fontSize="10" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="system-ui,sans-serif">ISSB</text>
      </svg>
    ),
  },
  {
    abbr: "TCFD",
    sub: "Climate Disclosures",
    icon: (
      <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
        <rect width="36" height="36" rx="6" fill="#00687D" />
        {/* Wave path representing climate */}
        <path d="M4 22 Q9 16 14 22 Q19 28 24 22 Q29 16 32 22" stroke="#7DD4F0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <text x="18" y="16" fontSize="9" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="system-ui,sans-serif">TCFD</text>
      </svg>
    ),
  },
  {
    abbr: "ISAE 3000",
    sub: "Assurance Engagements",
    icon: (
      <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
        <rect width="36" height="36" rx="6" fill="#1B3A6B" />
        {/* Shield outline */}
        <path d="M18 6 L28 10 L28 20 Q28 28 18 32 Q8 28 8 20 L8 10 Z" fill="none" stroke="#7BA4DB" strokeWidth="1.8" />
        {/* Checkmark */}
        <path d="M13 18 L16.5 22 L23 14" stroke="#7BA4DB" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    abbr: "UN SDGs",
    sub: "Sustainable Dev. Goals",
    icon: (
      <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
        <circle cx="18" cy="18" r="18" fill="#009EDB" />
        {/* Simplified SDG wheel — 6 colored segments */}
        {[
          "#E5243B","#DDA63A","#4C9F38","#C5192D","#FF3A21","#26BDE2",
        ].map((c, i) => {
          const startAngle = (i * 60 - 90) * (Math.PI / 180);
          const endAngle   = ((i + 1) * 60 - 90) * (Math.PI / 180);
          const x1 = +(18 + 14 * Math.cos(startAngle)).toFixed(2);
          const y1 = +(18 + 14 * Math.sin(startAngle)).toFixed(2);
          const x2 = +(18 + 14 * Math.cos(endAngle)).toFixed(2);
          const y2 = +(18 + 14 * Math.sin(endAngle)).toFixed(2);
          return <path key={i} d={`M18 18 L${x1} ${y1} A14 14 0 0 1 ${x2} ${y2} Z`} fill={c} />;
        })}
        <circle cx="18" cy="18" r="7" fill="#009EDB" />
        <text x="18" y="21" fontSize="6" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="system-ui,sans-serif">SDGs</text>
      </svg>
    ),
  },
];

export function EvidenceAlignmentBanner() {
  return (
    <section
      aria-labelledby="evidence-alignment-heading"
      className="border-y border-slate-100 bg-white py-7"
    >
      <div className="mb-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
          Evidence Alignment Support
        </p>
        <h2
          id="evidence-alignment-heading"
          className="mt-2 text-xl font-extrabold tracking-tight text-[#0A1F44] md:text-2xl"
        >
          Evidence alignment support for major ESG and assurance frameworks
        </h2>
      </div>

      {/* Scrolling marquee — 3 copies for seamless -33.33% loop */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white to-transparent" />
        <ul
          aria-label="Supported evidence alignment frameworks"
          className="flex animate-scroll items-center gap-5"
          style={{ width: "max-content" }}
        >
          {[0, 1, 2].flatMap((copy) =>
            FRAMEWORK_LOGOS.map((fw) => (
              <li
                key={`${copy}-${fw.abbr}`}
                aria-label={`${fw.abbr} — ${fw.sub}`}
                className="flex h-14 shrink-0 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 shadow-sm sm:h-16 sm:gap-3 sm:rounded-xl sm:px-4"
              >
                {fw.icon}
                <div>
                  <p className="text-sm font-extrabold leading-none text-[#0A1F44]">{fw.abbr}</p>
                  <p className="mt-1 text-[10px] leading-none text-slate-400">{fw.sub}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <p className="mx-auto mt-5 max-w-3xl px-4 text-center text-[11px] font-medium leading-relaxed text-slate-400">
        Framework alignment does not constitute certification, formal assurance, endorsement, or regulatory compliance determination.
      </p>
    </section>
  );
}

const evidenceLayers = [
  {
    id: "claim",
    label: "Claim Layer",
    icon: FileCheck2,
    summary:
      "Defines the exact sustainability claim, scope, location, category, and reporting window.",
    fields: [
      ["Claim ID", "EO-2047"],
      ["Claim", "240 residents completed solar workforce training"],
      ["ESG Category", "Social impact / workforce development"],
      ["Reporting Period", "Q2 2026"],
      ["Location", "Sacramento County, California"],
    ],
    focus: ["Claim ID", "Claim", "ESG Category", "Reporting Period", "Location"],
    status: "Claim scoped",
  },
  {
    id: "evidence",
    label: "Evidence Layer",
    icon: ClipboardCheck,
    summary:
      "Attaches the source documentation that supports the stated outcome.",
    fields: [
      ["Attendance logs", "Attached"],
      ["Completion certificates", "Attached"],
      ["Partner report", "Attached"],
      ["Site photos", "Attached"],
      ["Training roster", "Attached"],
    ],
    focus: ["Attendance logs", "Completion certificates", "Partner report", "Site photos", "Training roster"],
    status: "5 files attached",
  },
  {
    id: "confirmation",
    label: "Confirmation Layer",
    icon: CheckCircle,
    summary:
      "Records the external reviewer, partner response, confirmation status, and review notes.",
    fields: [
      ["Reviewer", "Local workforce development partner"],
      ["Confirmation Status", "Partner-confirmed"],
      ["Confirmation Date", "May 2026"],
      ["Reviewer Notes", "Outcome supported by attached records"],
    ],
    focus: ["Reviewer", "Confirmation Status", "Confirmation Date", "Reviewer Notes"],
    status: "Partner-confirmed",
  },
  {
    id: "custody",
    label: "Chain-of-Custody Layer",
    icon: GitBranch,
    summary:
      "Preserves who submitted, reviewed, confirmed, changed, and used the record.",
    fields: [
      ["Submitted by", "ESG program owner"],
      ["Reviewed by", "Internal ESG lead"],
      ["Confirmed by", "Partner organization"],
      ["Version history", "Active"],
      ["Timestamped record", "Preserved"],
    ],
    focus: ["Submitted by", "Reviewed by", "Confirmed by", "Version history", "Timestamped record"],
    status: "Custody active",
  },
  {
    id: "screening",
    label: "Negative Impact Screening Layer",
    icon: SearchCheck,
    summary:
      "Checks for unresolved concerns, conflicting documentation, objections, and overclaimed outcomes.",
    fields: [
      ["Partner concerns", "None unresolved"],
      ["Conflicting documents", "None identified"],
      ["Community objections", "None attached"],
      ["Claim scope", "Supported by evidence"],
    ],
    focus: ["Partner concerns", "Conflicting documents", "Community objections", "Claim scope"],
    status: "No issues flagged",
  },
  {
    id: "framework",
    label: "Framework Mapping Layer",
    icon: Layers3,
    summary:
      "Cross-walks the confirmed claim to frameworks, SDGs, and internal reporting categories.",
    fields: [
      ["GRI", "Social impact indicators"],
      ["SDG 7", "Mapped"],
      ["SDG 8", "Mapped"],
      ["Internal scorecard", "Workforce development"],
    ],
    focus: ["GRI", "SDG 7", "SDG 8", "Internal scorecard"],
    status: "Framework-mapped",
  },
  {
    id: "readiness",
    label: "Report Review Layer",
    icon: ShieldCheck,
    summary:
      "Shows whether the claim is structurally reviewable and what remains before reporting or assurance-preparation review.",
    fields: [
      ["Evidence Ladder Level", "4"],
      ["Report Review Status", "Structurally reviewable"],
      ["Recommended Next Step", "Complete management review"],
    ],
    focus: ["Evidence Ladder Level", "Report Review Status", "Recommended Next Step"],
    status: "Review-ready",
  },
];

const ladderStyles = [
  "border-red-200 bg-red-50 text-red-800",
  "border-orange-200 bg-orange-50 text-orange-800",
  "border-amber-200 bg-amber-50 text-amber-800",
  "border-emerald-200 bg-emerald-50 text-emerald-800",
  "border-[#D4980C]/30 bg-[#D4980C]/10 text-[#7a5200]",
  "border-green-200 bg-green-50 text-green-800",
];

export function EvidenceObjectMockup({ compact = false }: { compact?: boolean }) {
  const rows = [
    ["Claim ID", "EO-2047"],
    ["Claim", "240 residents completed solar workforce training"],
    ["Evidence Status", "Partner-confirmed"],
    ["Evidence Ladder Level", "4 / Framework-Mapped"],
    ["Reviewer", "Workforce implementation partner"],
    ["Chain of Custody", "Active"],
    ["Report Review Status", "Structurally reviewable"],
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Sample Evidence Object
          </p>
          <p className="text-sm font-bold text-[#0A1F44]">EO-2047</p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          Review-ready
        </span>
      </div>
      <div className={`grid gap-0 ${compact ? "" : "md:grid-cols-2"}`}>
        {rows.map(([label, value]) => (
          <div key={label} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {label}
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug text-slate-800">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EvidenceObjectExplorer() {
  const [activeLayerId, setActiveLayerId] = useState(evidenceLayers[0].id);
  const activeLayer =
    evidenceLayers.find((layer) => layer.id === activeLayerId) ?? evidenceLayers[0];
  const ActiveIcon = activeLayer.icon;

  return (
    <section id="evidence-object-explorer" className="relative overflow-hidden bg-white py-7 md:py-10">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-50 to-white" />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeader
          eyebrow="Evidence Object Explorer"
          title="Every ESG claim needs an Evidence Object."
          body="An Evidence Object is the structured record behind a sustainability claim. It connects the claim to source evidence, partner confirmation, chain-of-custody history, negative impact screening, framework mapping, and report review status."
        />

        <div className="relative grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:rounded-2xl">
            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-col">
              {evidenceLayers.map((layer) => {
                const Icon = layer.icon;
                const active = layer.id === activeLayer.id;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setActiveLayerId(layer.id)}
                    aria-pressed={active}
                    className={`group flex min-w-0 w-full items-center gap-2 rounded-lg border px-2 py-2.5 text-left text-xs font-bold transition-all duration-300 sm:rounded-xl sm:px-3 sm:py-3 sm:text-sm ${
                      active
                        ? "border-[#0A1F44] bg-[#0A1F44] text-[#D4980C] shadow-lg shadow-slate-900/15"
                        : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-[#D4980C]/50 hover:shadow-md"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        active ? "bg-white/15 text-[#D4980C]" : "bg-slate-100 text-[#0A1F44]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <span className="min-w-0 leading-tight">{layer.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 md:rounded-3xl md:p-6 md:shadow-2xl">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-[#D4980C]/10 blur-2xl" />
            <div className="relative flex flex-col items-start gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Evidence Object
                </p>
                <h3 className="mt-1 text-lg font-extrabold text-[#0A1F44] sm:text-xl">
                  EO-2047 · Workforce Training Claim
                </h3>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                {activeLayer.status}
              </span>
            </div>

            <div className="relative mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0A1F44] text-[#D4980C] sm:h-12 sm:w-12 sm:rounded-xl">
                    <ActiveIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Selected layer
                    </p>
                    <h3 className="text-lg font-extrabold text-[#0A1F44] sm:text-xl">
                      {activeLayer.label}
                    </h3>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  {activeLayer.summary}
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2 sm:gap-3">
                  {activeLayer.fields.map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-[#D4980C]/35 bg-[#D4980C]/10 px-3 py-3 sm:rounded-xl"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-snug text-slate-800 sm:text-sm">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0A1F44]">
                  <Clock3 className="h-4 w-4 text-[#8A5A00]" />
                  Chain-of-custody activity
                </div>
                <div className="mt-4 grid gap-3">
                  {["Submitted", "Reviewed", "Confirmed", "Mapped"].map((item, index) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0A1F44] text-xs font-extrabold text-[#D4980C]">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#0A1F44]">{item}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Timestamped</p>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
          <p className="text-sm font-semibold leading-relaxed text-slate-700">
            Synerxus produces the structured evidence records ESG teams,
            reporting teams, reviewers, and assurance providers need to review but cannot reliably generate
            from scattered files, screenshots, and spreadsheets.
          </p>
        </div>
      </div>
    </section>
  );
}

export function EvidenceLadderSection() {
  const [activeLevelKey, setActiveLevelKey] = useState("Level 4");
  const descendingLevels = evidenceLadderLevels.slice().reverse();
  const active =
    evidenceLadderLevels.find((level) => level.level === activeLevelKey) ??
    evidenceLadderLevels[4];

  return (
    <section className="overflow-hidden bg-slate-50 py-7 md:py-10">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeader
          eyebrow="Evidence Ladder"
          title="The Evidence Ladder shows how defensible each ESG claim is."
          body="The Evidence Ladder helps teams understand whether a claim is unsupported, internally asserted, source-backed, partner-confirmed, framework-mapped, or ready for disclosure review."
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
          <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:rounded-3xl md:p-6">
            <div className="absolute bottom-8 left-10 top-8 hidden w-px bg-gradient-to-b from-red-300 via-[#D4980C] to-emerald-400 md:block" />
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              {descendingLevels.map((item) => {
                const levelNumber = item.level.replace("Level ", "");
                const activeLevel = activeLevelKey === item.level;
                const styleIndex = Number(levelNumber);
                return (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setActiveLevelKey(item.level)}
                    aria-pressed={activeLevel}
                    className={`relative grid gap-2 rounded-xl border p-3 text-left transition-all duration-300 sm:gap-3 sm:rounded-2xl sm:p-4 md:grid-cols-[64px_1fr_auto] md:items-center ${
                      activeLevel
                        ? "scale-[1.01] border-[#0A1F44] bg-[#0A1F44] text-[#D4980C] shadow-xl"
                        : "border-slate-200 bg-slate-50 hover:-translate-y-0.5 hover:border-[#D4980C]/50 hover:bg-white hover:shadow-md"
                    }`}
                  >
                    <span
                      className={`z-10 flex h-12 w-12 items-center justify-center rounded-xl border text-sm font-extrabold ${
                        activeLevel
                          ? "border-white/20 bg-white/10 text-[#D4980C]"
                          : ladderStyles[styleIndex] ?? ladderStyles[0]
                      }`}
                    >
                      {levelNumber}
                    </span>
                    <span>
                      <span className="block text-xs font-bold uppercase tracking-wider opacity-70">
                        {item.level}
                      </span>
                      <span className={`mt-1 block text-base font-extrabold sm:text-lg ${activeLevel ? "text-[#D4980C]" : "text-[#0A1F44]"}`}>
                        {item.title}
                      </span>
                    </span>
                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${
                        activeLevel
                          ? "border-[#D4980C]/30 bg-[#D4980C]/10 text-[#D4980C]"
                          : ladderStyles[styleIndex] ?? ladderStyles[0]
                      }`}
                    >
                      {item.risk}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10 md:rounded-3xl lg:sticky lg:top-24 lg:p-6 lg:shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
              Active level
            </p>
            <h3 className="mt-2 text-xl font-extrabold text-[#0A1F44] sm:text-2xl">
              {active.level} - {active.title}
            </h3>
            {active.level === "Level 4" && (
              <div className="mt-4 rounded-2xl border border-[#D4980C]/25 bg-[#D4980C]/10 p-3">
                <Logo size="xs" clickable={false} />
              </div>
            )}
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Review Risk
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">
                {active.risk}
              </p>
            </div>
            <div className="mt-4 grid gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Meaning
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {active.meaning}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Recommended Action
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {active.action}
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-[#0A1F44] p-4 text-white">
              <p className="text-sm font-bold text-white">Where do your claims sit on the Evidence Ladder?</p>
              <Button asChild className="mt-4 bg-white text-[#D4980C] hover:bg-slate-100 hover:text-[#B07F0A]">
                <Link href="/request-assessment">Assess Claim Defensibility</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AssessmentCta() {
  return (
    <section className="bg-slate-50 py-7 md:py-10">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-[1fr_auto] md:items-center md:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6 md:rounded-3xl md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A5A00]">
            Evidence Assessment
          </p>
          <h2 className="mt-3 text-2xl font-extrabold text-[#0A1F44] sm:text-3xl md:text-4xl">
            Assess the defensibility of your ESG claims.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
            Start with a focused assessment of your highest-risk or
            highest-visibility ESG claims. Synerxus helps identify which claims
            are unsupported, which need partner confirmation, and which can
            become reviewable evidence packets for reporting preparation.
          </p>
          <ul className="mt-5 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            {[
              "Review of selected ESG claims",
              "Evidence Ladder scoring",
              "Evidence Object setup",
              "Evidence gap analysis",
              "Partner confirmation readiness",
              "Framework mapping review",
              "Negative impact screening review",
              "Review-readiness summary",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#8A5A00]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
          <Button asChild size="lg" className="bg-[#D4980C] text-[#0A1F44] hover:bg-[#B07F0A]">
            <Link href="/request-assessment">Request Assessment</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-[#0A1F44] text-[#0A1F44] hover:bg-[#0A1F44] hover:text-[#D4980C]">
            <Link href="/platform">View Sample Evidence Object</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function HomeSections() {
  const [activeCustodyStep, setActiveCustodyStep] = useState(2);
  const [activeScreening, setActiveScreening] = useState(0);
  const [activeGap, setActiveGap] = useState(0);
  const [activePartnerStep, setActivePartnerStep] = useState(0);
  const [activeFramework, setActiveFramework] = useState("GRI");
  const [activeFitColumn, setActiveFitColumn] = useState(1);
  const [activeUseCase, setActiveUseCase] = useState(0);

  const evidenceGap = [
    ["Unsupported Claims", "Many ESG statements are published without a clear evidence record behind them."],
    ["Fragmented Documentation", "Photos, certificates, reports, attestations, partner letters, and metrics often live in disconnected systems."],
    ["Weak Chain of Custody", "Teams may not know who submitted evidence, who reviewed it, what changed, or which version was used in reporting."],
    ["Greenwashing Exposure", "Claims without traceable proof can create reputational, investor, regulatory, and legal risk."],
    ["Framework Complexity", "One claim may need to support multiple reporting pathways across GRI, CSRD/ESRS, SASB/ISSB, SDGs, and internal scorecards."],
  ];

  const chainSteps = [
    ["Submit", "Evidence owner creates or updates the claim record and attaches source documentation.", "Captured"],
    ["Review", "Internal reviewers assess completeness, risk, and report-use boundaries.", "In review"],
    ["Confirm", "External partners, NGOs, suppliers, or implementation teams confirm, comment, or flag the claim.", "Partner-confirmed"],
    ["Screen", "Reviewers check unresolved concerns, conflicting documents, and possible overclaiming.", "No issues flagged"],
    ["Map", "The confirmed claim is mapped to frameworks, SDGs, and internal reporting categories.", "Framework-mapped"],
    ["Preserve", "The Evidence Object retains timestamped activity, version history, reviewer actions, and reporting status.", "Preserved"],
  ];

  const screeningStatuses = [
    "No issues flagged",
    "Clarification requested",
    "Partial support only",
    "Conflicting evidence identified",
    "Negative impact review required",
    "Not ready for reporting use",
  ];

  return (
    <>
      <EvidenceObjectExplorer />
      <EvidenceLadderSection />

      <section className="overflow-hidden bg-white py-7 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center md:px-8">
          <div>
            <SectionHeader
              title="Frameworks tell you what to disclose. Synerxus helps prove what happened."
              body="ESG teams are under pressure to support sustainability statements across annual reports, investor materials, procurement responses, websites, and regulatory disclosures. But the evidence behind those claims is often fragmented across spreadsheets, emails, screenshots, field photos, partner reports, and shared drives."
            />
            <div className="rounded-2xl border border-[#0A1F44]/10 bg-slate-50 p-5">
              <p className="text-sm font-semibold leading-relaxed text-slate-700">
                Synerxus closes the evidence gap by converting ESG claims into
                structured, reviewable Evidence Objects.
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#D4980C]/15 blur-3xl" />
            <div className="relative grid gap-4 sm:grid-cols-2">
              {evidenceGap.map(([title, body], index) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => setActiveGap(index)}
                  aria-pressed={activeGap === index}
                  className={`rounded-2xl border p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    activeGap === index
                      ? "border-[#0A1F44] bg-[#0A1F44] text-[#D4980C]"
                      : "border-slate-200 bg-white"
                  } ${index === 4 ? "sm:col-span-2" : ""
                  }`}
                >
                  <AlertTriangle className="h-5 w-5 text-[#8A5A00]" />
                  <h3 className={`mt-3 font-bold ${activeGap === index ? "text-[#D4980C]" : "text-[#0A1F44]"}`}>{title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed ${activeGap === index ? "text-[#D4980C]" : "text-slate-600"}`}>{body}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Chain of Custody"
            title="Preserve the chain of custody behind every ESG claim."
            body="Synerxus records who submitted evidence, who reviewed it, who confirmed it, what changed, when it changed, and which version was used for disclosure."
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:rounded-3xl md:p-6">
            <div className="grid gap-3 lg:grid-cols-6">
              {chainSteps.map(([title, body, status], index) => {
                const active = activeCustodyStep === index;
                return (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setActiveCustodyStep(index)}
                    aria-pressed={active}
                    className={`relative rounded-2xl border p-4 text-left transition-all duration-300 ${
                      active
                        ? "border-[#0A1F44] bg-[#0A1F44] text-[#D4980C] shadow-xl"
                        : "border-slate-200 bg-slate-50 hover:-translate-y-0.5 hover:border-[#D4980C]/50 hover:bg-white hover:shadow-md"
                    }`}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${active ? "bg-white/10 text-[#D4980C]" : "bg-white text-[#0A1F44]"}`}>
                      {index + 1}
                    </span>
                    <h3 className={`mt-4 text-lg font-extrabold ${active ? "text-[#D4980C]" : "text-[#0A1F44]"}`}>{title}</h3>
                    <p className={`mt-2 text-sm leading-relaxed ${active ? "text-[#D4980C]" : "text-slate-600"}`}>{body}</p>
                    <span className={`mt-4 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${active ? "border-[#D4980C]/30 bg-[#D4980C]/10 text-[#D4980C]" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                      {status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              "Tamper-evident audit trails",
              "Reviewer identity and timestamp records",
              "Version-controlled evidence history",
              "Claim-level disclosure status",
              "Assurance boundary discipline",
            ].map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-transform hover:-translate-y-0.5">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-2 md:px-8">
          <div>
            <SectionHeader
              eyebrow="Partner Confirmation"
              title="Partner confirmation without reporting burden."
              body="Many ESG outcomes happen through NGOs, suppliers, contractors, community organizations, and implementation partners. Synerxus gives those partners a focused way to review the claim, inspect evidence, add context, flag concerns, or confirm the outcome."
            />
            <div className="grid gap-3">
              {[
                "Receive request",
                "Review claim",
                "Inspect evidence",
                "Confirm, comment, or flag",
                "Confirmation becomes part of the Evidence Object",
              ].map((item, index) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setActivePartnerStep(index)}
                  aria-pressed={activePartnerStep === index}
                  className={`group flex gap-3 rounded-xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#D4980C]/50 hover:shadow-md ${
                    activePartnerStep === index
                      ? "border-[#0A1F44] bg-[#0A1F44] text-[#D4980C]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A1F44] text-sm font-bold text-[#D4980C] transition-colors group-hover:bg-[#D4980C] group-hover:text-[#0A1F44]">
                    {index + 1}
                  </span>
                  <p className={`self-center text-sm font-semibold ${activePartnerStep === index ? "text-[#D4980C]" : "text-slate-700"}`}>{item}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-[#D4980C] shadow-xl md:rounded-3xl md:shadow-2xl">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#D4980C]">
                Review Request · Step {activePartnerStep + 1}
              </p>
              <h3 className="mt-3 text-xl font-extrabold">
                240 residents completed solar workforce training
              </h3>
              <div className="mt-5 grid gap-3">
                {[
                  ["Evidence", "5 files attached"],
                  ["Reviewer", "Local workforce partner"],
                  ["Due", "May 2026"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {["Confirm", "Request Clarification", "Flag Issue"].map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition-transform hover:-translate-y-0.5 ${
                      index === 0
                        ? "bg-emerald-400 text-emerald-950"
                        : "border border-[#D4980C]/25 bg-[#D4980C]/10 text-[#D4980C]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {["Clear review scope", "Less back-and-forth", "Structured confirmation record", "Better corporate-partner trust"].map((item) => (
                <div key={item} className="rounded-lg border border-[#D4980C]/20 bg-[#D4980C]/10 p-3 text-sm font-semibold text-[#8A5A00]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Framework Cross-Walking"
            title="One Evidence Object. Multiple reporting pathways."
            body="A single partner-confirmed Evidence Object can support multiple reporting needs, helping teams reduce duplicate evidence collection and strengthen consistency across ESG reporting."
          />
          <div className="grid gap-6 lg:grid-cols-[1fr_260px_1fr] lg:items-center">
            <div className="grid gap-3 sm:grid-cols-2">
              {frameworks.slice(0, 4).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setActiveFramework(item)}
                  aria-pressed={activeFramework === item}
                  className={`rounded-2xl border p-4 text-left text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    activeFramework === item
                      ? "border-[#0A1F44] bg-[#0A1F44] text-[#D4980C]"
                      : "border-slate-200 bg-white text-[#0A1F44]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
              <div className="rounded-2xl border border-[#D4980C]/30 bg-white p-5 text-center shadow-xl md:rounded-3xl md:shadow-2xl">
              <Sparkles className="mx-auto h-7 w-7 text-[#8A5A00]" />
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Evidence Object
              </p>
              <h3 className="mt-2 text-lg font-extrabold text-[#0A1F44]">EO-2047</h3>
              <p className="mt-2 text-sm text-slate-600">Active pathway: <span className="font-bold text-[#0A1F44]">{activeFramework}</span></p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {frameworks.slice(4, 8).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setActiveFramework(item)}
                  aria-pressed={activeFramework === item}
                  className={`rounded-2xl border p-4 text-left text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    activeFramework === item
                      ? "border-[#0A1F44] bg-[#0A1F44] text-[#D4980C]"
                      : "border-slate-200 bg-white text-[#0A1F44]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-slate-600">
            Frameworks define what organizations may need to disclose. Synerxus
            helps structure the evidence behind those disclosures.
          </p>
          <div className="mt-5">
            <BoundaryNotice />
          </div>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Negative Impact Screening"
            title="Prevent selective ESG claims from moving into reports without evidence limits."
            body="Credible ESG evidence should not only confirm positive outcomes. It should also identify unresolved concerns, adverse impacts, conflicting documentation, or stakeholder disputes."
          />
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-xl md:rounded-3xl">
              <h3 className="font-extrabold text-[#0A1F44]">Screening prompts</h3>
              <div className="mt-4 grid gap-3">
                {[
                  "Are there unresolved partner concerns?",
                  "Are there stakeholder objections?",
                  "Are there conflicting documents?",
                  "Are there adverse environmental, labor, or social impacts?",
                  "Is the claim overstated relative to the evidence?",
                  "Does the evidence support the full claim or only part of it?",
                ].map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setActiveScreening(index)}
                    aria-pressed={activeScreening === index}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold transition-all ${
                      activeScreening === index
                        ? "border-[#0A1F44] bg-white shadow-md"
                        : "border-transparent bg-white hover:border-[#D4980C]/50"
                    }`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${activeScreening === index ? "border-[#D4980C] bg-[#D4980C] text-[#0A1F44]" : "border-slate-300 text-slate-500"}`}>
                      {index + 1}
                    </span>
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl md:rounded-3xl">
              <h3 className="font-extrabold text-[#0A1F44]">Outcome statuses</h3>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-950 p-4 text-[#D4980C]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Active screening question
                </p>
                <p className="mt-2 text-lg font-extrabold">
                  {[
                    "Are there unresolved partner concerns?",
                    "Are there stakeholder objections?",
                    "Are there conflicting documents?",
                    "Are there adverse environmental, labor, or social impacts?",
                    "Is the claim overstated relative to the evidence?",
                    "Does the evidence support the full claim or only part of it?",
                  ][activeScreening]}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#8A5A00]">
                  Governance check recorded before the Evidence Object advances
                  to reporting-readiness review.
                </p>
              </div>
              <div className="mt-4 grid gap-3">
                {screeningStatuses.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-3 text-sm font-semibold text-slate-700">
                    <ListChecks className="h-4 w-4 text-[#8A5A00]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-14 text-[#D4980C] md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Where Synerxus Fits"
            title="The missing evidence layer between activity and disclosure."
            body="Synerxus sits between ESG activity systems and final reporting platforms, turning raw program activity into defensible evidence records."
            dark
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Activity Systems", "Program data, supplier updates, field activity, volunteer records, grant reports, project files.", FileCheck2],
              ["Synerxus Evidence Layer", "Evidence Objects, partner confirmation, Evidence Ladder scoring, chain of custody, negative impact screening, framework cross-walking.", Layers3],
              ["Disclosure and Review", "ESG reports, investor updates, board materials, regulatory disclosures, stakeholder pages, assurance preparation.", ShieldCheck],
            ].map(([title, body, Icon], index) => {
              const TypedIcon = Icon as typeof FileCheck2;
              const dominant = title === "Synerxus Evidence Layer";
              return (
                <button
                  key={title as string}
                  type="button"
                  onClick={() => setActiveFitColumn(index)}
                  aria-pressed={activeFitColumn === index}
                  className={`rounded-2xl border p-5 text-left transition-transform hover:-translate-y-1 ${
                    activeFitColumn === index || dominant
                      ? "border-[#D4980C]/50 bg-[#D4980C]/10 shadow-2xl"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <TypedIcon className="h-6 w-6 text-[#D4980C]" />
                  <h3 className="mt-4 text-lg font-extrabold">{title as string}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#D4980C]">{body as string}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader title="Built for ESG claims that need proof." />
          <div className="grid gap-4 md:grid-cols-3">
            {primaryUseCases.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setActiveUseCase(index)}
                aria-pressed={activeUseCase === index}
                className={`group rounded-2xl border p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#D4980C]/50 hover:shadow-xl ${
                  activeUseCase === index
                    ? "border-[#0A1F44] bg-[#0A1F44]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <h3 className={`font-extrabold ${activeUseCase === index ? "text-[#D4980C]" : "text-[#0A1F44]"}`}>{item.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${activeUseCase === index ? "text-[#D4980C]" : "text-slate-600"}`}>{item.body}</p>
                <span className={`mt-4 inline-flex items-center gap-1 text-sm font-bold transition-opacity ${activeUseCase === index ? "text-[#D4980C] opacity-100" : "text-[#0A1F44] opacity-0 group-hover:opacity-100"}`}>
                  Evidence workflow <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Verification Partner Network"
            title="Verification Partner Network"
            body="Synerxus can involve NGOs, suppliers, implementation partners, community organizations, and field teams in structured confirmation workflows."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {["NGOs", "Suppliers", "Implementation / Verification Partners"].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-white p-5">
                <Network className="h-6 w-6 text-[#8A5A00]" />
                <h3 className="mt-4 font-extrabold text-[#0A1F44]">{item}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Structured confirmation workflows with clear review scope and
                  claim-level evidence.
                </p>
              </div>
            ))}
          </div>
          <Button asChild className="mt-6 bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
            <Link href="/platform">For Partners: Learn How Confirmation Works</Link>
          </Button>
        </div>
      </section>

      <AssessmentCta />

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader title="Insights on evidence-first ESG reporting" />
          <div className="grid gap-4 md:grid-cols-4">
            {insights.map((item) => (
              <Link
                key={item.title}
                href="/resources"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="font-extrabold leading-snug text-[#0A1F44]">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#0A1F44]">
                  Read more <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
