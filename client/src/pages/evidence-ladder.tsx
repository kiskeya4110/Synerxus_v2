import { useState, type KeyboardEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, Clock3, FileText, Info, ShieldCheck, Users, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

type LevelData = {
  n: number;
  title: string;
  meaning: string;
  risk: string;
  riskClass: string;
  badgeColor: string;
  detail: string;
  notMeaning: string;
  nextAction: string;
};

const levels: LevelData[] = [
  {
    n: 5,
    title: "Review-Ready Evidence Packet",
    meaning: "Claim, evidence, confirmation, source support, mapping context, exceptions, and limitations are packaged for review.",
    risk: "LOWEST RISK",
    riskClass: "text-green-800",
    badgeColor: "#166534",
    detail: "A complete evidence packet includes: a clearly stated claim, attached source documents, a confirmed reviewer, mapped framework context, documented exceptions, and stated limitations. This is the highest defensibility tier — a reviewer can trace every statement end-to-end without additional requests.",
    notMeaning: "Does not mean formal assurance has been performed, compliance determined, or acceptance guaranteed.",
    nextAction: "Prepare the review package and keep exceptions, limitations, and source references visible for the reviewer.",
  },
  {
    n: 4,
    title: "Source-Supported AND Confirmed",
    meaning: "Record has both partner confirmation and attached source artifacts.",
    risk: "LOW RISK",
    riskClass: "text-green-700",
    badgeColor: "#15803d",
    detail: "The claim has attached source evidence AND has been confirmed by an authorized partner or reviewer. Both conditions must be met. A record with source documents but no confirmation, or confirmation without source support, does not reach this tier. This combination substantially reduces the primary evidence risks.",
    notMeaning: "Does not mean the claim is mapped or packaged for formal review.",
    nextAction: "Add packaging context: exception flags, limitation notes, mapping context, and a review package or assurance-preparation export where applicable.",
  },
  {
    n: 3,
    title: "Partner-Confirmed",
    meaning: "Authorized partner or reviewer confirmed the record.",
    risk: "LOWER RISK",
    riskClass: "text-green-600",
    badgeColor: "#16a34a",
    detail: "A named authorized party — a delivery partner, program owner, or external reviewer — has confirmed the activity or data. Partner confirmation adds external validation beyond internal assertion, reducing single-source risk.",
    notMeaning: "Does not mean the claim is source-supported or ready for review packaging.",
    nextAction: "Attach or reference source materials that support the confirmed record.",
  },
  {
    n: 2,
    title: "Source Evidence Attached",
    meaning: "Claim has attached or referenced source material.",
    risk: "MODERATE RISK",
    riskClass: "text-[#c88914]",
    badgeColor: "#c88914",
    detail: "Source documents — invoices, reports, photos, spreadsheets, or third-party records — are attached or referenced. This moves the claim beyond assertion by pointing to reviewable primary material, but without external confirmation it remains moderately exposed.",
    notMeaning: "Does not mean the claim has been externally confirmed or reviewed by a named third party.",
    nextAction: "Request confirmation from an authorized partner or reviewer with direct knowledge of the activity.",
  },
  {
    n: 1,
    title: "Internal Assertion",
    meaning: "Claim is internally stated but not externally confirmed.",
    risk: "HIGH RISK",
    riskClass: "text-orange-700",
    badgeColor: "#ea580c",
    detail: "The claim exists in internal records but has not been confirmed by an external party or supported by attached source documents. Risk is high because the claim relies entirely on internal statements with no external reference point.",
    notMeaning: "Does not mean the claim has external support; it cannot withstand review without additional evidence.",
    nextAction: "Attach the first source record or artifact so the claim can move beyond internal assertion.",
  },
  {
    n: 0,
    title: "Unsupported Claim",
    meaning: "Claim has no reviewable support attached.",
    risk: "HIGHEST RISK",
    riskClass: "text-red-600",
    badgeColor: "#dc2626",
    detail: "No source material, no confirmation, no stated limitations. This claim cannot be substantiated if reviewed or questioned. Every claim starts here; moving up the ladder begins with attaching the first piece of source evidence.",
    notMeaning: "Does not mean the underlying claim is false — only that no reviewable support has been attached yet.",
    nextAction: "Attach or reference the first piece of source evidence and state the claim boundary clearly.",
  },
];

type BenefitData = {
  title: string;
  body: string;
  icon: LucideIcon;
  detail: string;
  stat: string;
};

const benefits: BenefitData[] = [
  {
    title: "Stronger Defensibility",
    body: "Build evidence and context that can stand up to scrutiny.",
    icon: ShieldCheck,
    detail: "Every claim at Level 5 has an attached evidence packet reviewers can trace end-to-end: source documents, partner confirmation, mapping context, exceptions, and stated limitations. Defensibility means every statement can be explained without scrambling.",
    stat: "Level 5 = fully packaged, traceable evidence.",
  },
  {
    title: "Lower Risk Over Time",
    body: "Move up the ladder to reduce claim risk and increase confidence.",
    icon: BarChart3,
    detail: "Each rung represents a measurable reduction in reporting risk. Adding source support moves a claim from High to Moderate risk. Partner confirmation moves it to Lower. Combining both reaches Low risk. A complete packet reaches the lowest risk tier.",
    stat: "6 levels. Each step materially reduces exposure.",
  },
  {
    title: "Clearer Documentation",
    body: "Organized records speed up reviews.",
    icon: FileText,
    detail: "Structured evidence records reduce the time reviewers spend hunting for source material. Claims, evidence, and limitations are in one place, organized by maturity level and confirmation status — ready when needed.",
    stat: "Find supporting material without manual search.",
  },
  {
    title: "Stakeholder Alignment",
    body: "Create a common language for evidence maturity.",
    icon: Users,
    detail: "The ladder gives internal teams, partners, and auditors a shared framework for discussing evidence quality. 'We are at Level 2 on this claim' means the same thing to everyone in the process — reducing miscommunication about evidence status.",
    stat: "One framework. All stakeholders aligned.",
  },
  {
    title: "Review Readiness",
    body: "Be prepared when reviews, RFPs, or inquiries arrive.",
    icon: Clock3,
    detail: "When an auditor, funder, or regulator requests evidence, teams with Level 4–5 records can respond immediately. Review readiness is not about perfection — it is about having the evidence organized before it is needed.",
    stat: "Level 4–5 claims are ready to present without scrambling.",
  },
];

const LADDER_ROW_TINTS = ["#edfdf4", "#f2f9ea", "#fff8dc", "#fff2df", "#ffe8d9", "#ffe4e6"];

function LadderSketch({
  selectedLevel,
  onSelect,
}: {
  selectedLevel: number;
  onSelect: (level: number) => void;
}) {
  const rungs = [
    { level: 5, y: 86, left: 79, right: 190 },
    { level: 4, y: 182, left: 75, right: 195 },
    { level: 3, y: 278, left: 71, right: 200 },
    { level: 2, y: 374, left: 67, right: 205 },
    { level: 1, y: 470, left: 63, right: 209 },
    { level: 0, y: 566, left: 59, right: 214 },
  ];

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, level: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(level);
    }
  };

  return (
    <svg
      viewBox="0 0 280 640"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Wooden ladder illustration"
    >
      <defs>
        <linearGradient id="ladder-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#effcf4" />
          <stop offset="34%" stopColor="#fbfde9" />
          <stop offset="67%" stopColor="#fff6e7" />
          <stop offset="100%" stopColor="#ffe6e5" />
        </linearGradient>
        <linearGradient id="rail-fill-left" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5f6d79" />
          <stop offset="18%" stopColor="#7a8a96" />
          <stop offset="50%" stopColor="#9daab3" />
          <stop offset="82%" stopColor="#71808d" />
          <stop offset="100%" stopColor="#596773" />
        </linearGradient>
        <linearGradient id="rail-fill-right" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#677682" />
          <stop offset="18%" stopColor="#87959f" />
          <stop offset="50%" stopColor="#aab6bd" />
          <stop offset="82%" stopColor="#7c8b97" />
          <stop offset="100%" stopColor="#61707b" />
        </linearGradient>
        <linearGradient id="rung-fill" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b6328" />
          <stop offset="24%" stopColor="#ae8443" />
          <stop offset="52%" stopColor="#d2b06a" />
          <stop offset="78%" stopColor="#b58a48" />
          <stop offset="100%" stopColor="#805a22" />
        </linearGradient>
        <filter id="soft-drop" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.15" />
        </filter>
      </defs>

      <rect x="0" y="0" width="280" height="640" rx="20" fill="url(#ladder-bg)" opacity="0.96" />
      <rect x="24" y="34" width="232" height="570" rx="18" fill="#ffffff" opacity="0.12" />
      <path d="M 18 612 C 42 620 70 622 98 618" stroke="#0A1F44" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.08" />
      <path d="M 192 40 C 205 30 218 26 234 26" stroke="#0A1F44" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.08" />

      <g filter="url(#soft-drop)">
        <polygon
          points="64,604 88,604 133,34 110,34"
          fill="url(#rail-fill-left)"
          stroke="#47525d"
          strokeWidth="1.6"
        />
        <polygon
          points="70,604 77,604 122,34 115,34"
          fill="#d6dde2"
          opacity="0.38"
        />
        <polygon
          points="151,604 175,604 220,34 197,34"
          fill="url(#rail-fill-right)"
          stroke="#4e5964"
          strokeWidth="1.6"
        />
        <polygon
          points="156,604 163,604 208,34 201,34"
          fill="#dde4e8"
          opacity="0.34"
        />
      </g>

      <g opacity="0.16">
        <path d="M 71 561 L 79 561 L 122 93 L 114 93 Z" fill="none" stroke="#eef3f6" strokeWidth="1.5" />
        <path d="M 77 486 L 85 486 L 129 154 L 121 154 Z" fill="none" stroke="#44505a" strokeWidth="1.1" />
        <path d="M 154 561 L 162 561 L 205 93 L 197 93 Z" fill="none" stroke="#eef3f6" strokeWidth="1.5" />
        <path d="M 160 486 L 168 486 L 212 154 L 204 154 Z" fill="none" stroke="#44505a" strokeWidth="1.1" />
      </g>

      {rungs.map((rung, index) => {
        const selected = selectedLevel === rung.level;
        const markerFill = LADDER_ROW_TINTS[index];
        const labelX = rung.right + 18;
        const rungTop = rung.y - 8;
        const rungBottom = rung.y + 8;
        const rungLeftTop = rung.left;
        const rungLeftBottom = rung.left - 2;
        const rungRightTop = rung.right;
        const rungRightBottom = rung.right + 2;

        return (
          <g
            key={rung.level}
            filter="url(#soft-drop)"
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            onClick={() => onSelect(rung.level)}
            onKeyDown={(event) => handleKeyDown(event, rung.level)}
            style={{ cursor: "pointer" }}
          >
            <polygon
              points={`${rungLeftTop},${rungTop} ${rungRightTop},${rungTop - 1} ${rungRightBottom},${rungBottom} ${rungLeftBottom},${rungBottom + 1}`}
              fill="url(#rung-fill)"
              stroke={selected ? "#0A1F44" : "#7a5b2a"}
              strokeWidth={selected ? 2.2 : 1.2}
            />
            <path
              d={`M ${rungLeftTop + 10} ${rung.y - 4} C ${rungLeftTop + 30} ${rung.y - 6}, ${rungLeftTop + 54} ${rung.y - 6}, ${rungLeftTop + 74} ${rung.y - 4}`}
              stroke="#f7e4b7"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
              opacity="0.7"
            />
            <path
              d={`M ${rungLeftTop + 16} ${rung.y + 2} C ${rungLeftTop + 40} ${rung.y + 4}, ${rungLeftTop + 62} ${rung.y + 4}, ${rungLeftTop + 82} ${rung.y + 2}`}
              stroke="#6e4e20"
              strokeWidth="0.9"
              strokeLinecap="round"
              fill="none"
              opacity="0.34"
            />
            <rect
              x={labelX}
              y={rung.y - 18}
              width="34"
              height="28"
              rx="6"
              fill={markerFill}
              stroke={selected ? "#0A1F44" : "#90a4ae"}
              strokeOpacity="0.45"
            />
            <text
              x={labelX + 17}
              y={rung.y + 2}
              textAnchor="middle"
              fontSize="14"
              fontWeight="900"
              fill="#0A1F44"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {rung.level}
            </text>
            {selected && (
              <rect
                x={rung.left - 8}
                y={rung.y - 16}
                width={rung.right - rung.left + 24}
                height="36"
                rx="10"
                fill="none"
                stroke="#0A1F44"
                strokeWidth="1.4"
                strokeDasharray="5 4"
                opacity="0.55"
              />
            )}
          </g>
        );
      })}

      <path d="M 58 604 C 78 596 100 595 118 601" stroke="#0A1F44" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.07" />
      <path d="M 152 604 C 173 596 196 595 219 601" stroke="#0A1F44" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.07" />
    </svg>
  );
}

function EvidenceLadderVisual() {
  const [selectedLevel, setSelectedLevel] = useState(0);

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      {/* Sticky ladder image + explanatory note */}
      <div className="lg:sticky lg:top-6">
        <div
          className="relative mx-auto h-[360px] w-full max-w-[340px] overflow-hidden rounded-2xl border border-slate-200 shadow-xl sm:h-[420px] md:h-[460px] lg:h-[640px] lg:max-w-none"
          style={{
            backgroundImage: "linear-gradient(to bottom, #ecfdf5 0%, #f9fde9 20%, #fff8dc 46%, #fff2df 72%, #ffe4e6 100%)",
          }}
        >
          <div className="absolute left-4 top-4 text-left text-[10px] font-extrabold uppercase leading-tight text-[#0A1F44] opacity-80 sm:left-5 sm:top-5 sm:text-xs">
            Higher maturity
            <br />
            Lower risk
          </div>
          <div className="absolute bottom-4 left-4 text-left text-[10px] font-extrabold uppercase leading-tight text-[#0A1F44] opacity-80 sm:bottom-5 sm:left-5 sm:text-xs">
            Lower maturity
            <br />
            Higher risk
          </div>
          <LadderSketch selectedLevel={selectedLevel} onSelect={setSelectedLevel} />
        </div>
        <p className="mx-auto mt-3 max-w-[340px] text-center text-[11px] leading-snug text-slate-500 lg:max-w-none">
          Records do not need to climb every rung in sequence — but Level 5 requires all previous layers to be present.
        </p>
      </div>

      <div className="min-w-0 space-y-3 sm:space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0A1F44] opacity-60 sm:text-[11px] sm:tracking-[0.18em]">
              Select a rung or card
            </p>
            <span className="text-[11px] text-slate-600 sm:text-[12px]">The active level expands in place.</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-800 sm:px-3 sm:text-[11px]">
              5 = review-ready
            </span>
            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-800 sm:px-3 sm:text-[11px]">
              0 = unsupported
            </span>
          </div>
        </div>

        {levels.map((lvl, index) => {
          const selected = selectedLevel === lvl.n;
          return (
            <div key={lvl.title}>
              <button
                type="button"
                onClick={() => setSelectedLevel(lvl.n)}
                aria-pressed={selected}
                aria-expanded={selected}
                className={`w-full rounded-2xl border p-3 text-left shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c88914] focus-visible:ring-offset-2 sm:p-4 ${
                  selected ? "border-[#0A1F44] bg-white shadow-lg ring-2 ring-[#0A1F44]/20" : "border-slate-200 bg-white hover:border-[#0A1F44]/25 hover:shadow-md"
                }`}
                style={{
                  backgroundColor: selected ? LADDER_ROW_TINTS[index] : "#ffffff",
                  borderColor: selected ? "#0A1F44" : lvl.badgeColor + "45",
                  boxShadow: selected ? "0 18px 40px rgba(10,31,68,0.12)" : undefined,
                  borderLeftWidth: selected ? 6 : 1,
                  borderLeftColor: selected ? lvl.badgeColor : lvl.badgeColor + "45",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 bg-white text-lg font-extrabold text-[#0A1F44] sm:h-11 sm:w-11 sm:text-xl"
                      style={{ borderColor: lvl.badgeColor + "66" }}
                    >
                      {lvl.n}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-extrabold text-[#0A1F44] sm:text-sm">{lvl.title}</h3>
                      <p className="mt-1 text-[11px] leading-snug text-slate-700 sm:text-[12px]">{lvl.meaning}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${lvl.riskClass} bg-slate-50 sm:px-3 sm:text-[11px]`}>
                      {lvl.risk}
                    </span>
                    {lvl.n === 4 && (
                      <span className="rounded-full bg-[#c88914] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white sm:px-2.5 sm:text-[10px] sm:tracking-[0.16em]">
                        Synerxus standard
                      </span>
                    )}
                    {selected && (
                      <span className="rounded-full bg-[#0A1F44] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white sm:px-2.5 sm:text-[10px] sm:tracking-[0.16em]">
                        Expanded
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    maxHeight: selected ? 360 : 0,
                    opacity: selected ? 1 : 0,
                    marginTop: selected ? 12 : 0,
                  }}
                >
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-3 sm:p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[11px]">
                      What this level means
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-700 sm:text-sm">{lvl.detail}</p>
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[11px]">
                        What this level does not mean
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-slate-600 sm:text-sm">{lvl.notMeaning}</p>
                    </div>
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[11px]">
                        Next action
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-slate-600 sm:text-sm">{lvl.nextAction}</p>
                    </div>
                  </div>
                </div>
              </button>
              {lvl.n === 4 && (
                <p className="mt-2 rounded-lg border border-[#c88914]/30 bg-[#fff9eb] px-4 py-3 text-[12px] leading-relaxed text-[#0A1F44] sm:text-sm">
                  Synerxus structures evidence to reach Level 4 by default — partner confirmation with name, role, and date, plus source artifacts attached to the specific claim. Level 5 adds packaging: exceptions, limitations, and a review package or assurance-preparation export where applicable.
                </p>
              )}
              {lvl.n === 5 && (
                <p className="mt-2 text-center text-sm text-slate-500">
                  <Link
                    href="/platform"
                    className="font-semibold text-[#c88914] transition-colors hover:text-[#a9720f]"
                  >
                    See how Synerxus builds Level 4 records for higher-level evaluation <ArrowRight className="inline h-3.5 w-3.5" />
                  </Link>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EvidenceLadderPage() {
  return (
    <MarketingLayout>
      <section className="bg-white py-10 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-8 lg:grid-cols-[1fr_0.48fr] lg:items-start">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight text-[#0A1F44] sm:text-5xl md:text-5xl">The Evidence Ladder</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600 sm:mt-5 sm:text-xl md:text-2xl">A maturity model for claim defensibility. Move from unsupported to review-ready.</p>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#0A1F44] sm:mt-6 sm:text-lg">The Evidence Ladder helps you strengthen claims over time by building better evidence, context, and confirmations so you are ready when it matters.</p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-7">
              <Button asChild className="w-fit bg-[#c88914] text-white hover:bg-[#a9720f]">
                <Link href="/assessment">Request Assessment</Link>
              </Button>
              <Link
                href="/platform"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A1F44] transition-colors hover:text-[#c88914]"
              >
                See how the platform builds evidence <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#061A36] text-white"><Info className="h-5 w-5" /></span><div><h2 className="font-extrabold text-[#0A1F44]">What this page shows</h2><p className="mt-2 text-sm leading-relaxed text-slate-700">A maturity model for claim-defensibility. It illustrates how evidence, context, and confirmations reduce risk as you move up the ladder.</p></div></div>
            <div className="my-6 border-t border-slate-200" />
            <div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c88914] text-white"><XCircle className="h-5 w-5" /></span><div><h2 className="font-extrabold text-[#0A1F44]">What this page does not show</h2><p className="mt-2 text-sm leading-relaxed text-slate-700">It does not represent formal assurance, regulatory compliance, causal attribution, or a guarantee of acceptance.</p></div></div>
          </aside>
        </div>
      </section>

      <section className="bg-white pb-10">
        <EvidenceLadderVisual />
      </section>

      <section className="bg-white pb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid rounded-lg border border-slate-200 bg-white shadow-sm md:grid-cols-5">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="border-b border-slate-200 p-6 text-center md:border-b-0 md:border-r md:last:border-r-0">
                  <Icon className="mx-auto h-10 w-10 text-[#0A1F44]" />
                  <h3 className="mt-3 text-sm font-extrabold text-[#0A1F44]">{b.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{b.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white pb-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-4 rounded-lg bg-[#f8efe0] p-5 sm:grid-cols-[auto_1fr] sm:p-8">
            <ShieldCheck className="h-12 w-12 shrink-0 text-[#0A1F44] sm:h-16 sm:w-16" />
            <div><h2 className="text-lg font-extrabold text-[#0A1F44] sm:text-xl">The Evidence Ladder shows claim-defensibility maturity.</h2><p className="mt-2 text-base leading-relaxed text-[#0A1F44] sm:text-lg">Synerxus supports evidence organization, reporting preparation, and assurance preparation. Synerxus does not provide formal assurance, legal advice, compliance guarantees, SDG impact certification, or causal attribution.</p></div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
