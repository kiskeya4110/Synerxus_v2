import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import {
  Menu,
  X,
  ShieldCheck,
  FileCheck,
  BarChart2,
  Clock,
  ListChecks,
  LineChart,
  Handshake,
  Check,
  Layers,
  Monitor,
  Headset,
  Lock,
  AlertTriangle,
  CheckCircle,
  Users,
  Building2,
  Globe,
  HardHat,
  ArrowRight,
  Loader2,
  LogOut,
  LogIn,
  UserPlus,
} from "lucide-react";
import Footer from "@/components/layout/footer";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  type RefObject,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";
import { SDG_GOALS } from "@shared/sdg-goals";
import { useAuth } from "@/hooks/use-auth";

const HERO_SLIDES = [
  "/optimized/hero-esg-retention.webp",
  "/optimized/hero-volunteer-hand.webp",
  "/optimized/hero-aid-relief.webp",
  "/optimized/hero-data-presentation.webp",
  "/optimized/hero-village-build.webp",
  "/optimized/hero-coaching.webp",
  "/optimized/hero-sustainability.webp",
  "/optimized/hero-community.webp",
  "/optimized/hero-construction.webp",
  "/optimized/hero-construction-tutorial.webp",
  "/optimized/hero-planters.webp",
];

function shouldRenderHeroSlide(activeIndex: number, slideIndex: number) {
  const distance = Math.abs(activeIndex - slideIndex);
  const wrapDistance = HERO_SLIDES.length - distance;
  return Math.min(distance, wrapDistance) <= 1;
}

const PIPELINE_STEPS: {
  label: string;
  sub: string;
  color: string;
  x: number;
  y: number;
  detail: string;
  mobileImage?: string;
}[] = [
  {
    label: "Activity Captured",
    sub: "Program activity and volunteer time recorded",
    color: "#1D4ED8",
    x: 11,
    y: 55,
    detail:
      "ESG program activity is captured with supporting context such as volunteer time, program boundary, and delivery context.",
    mobileImage: undefined,
  },
  {
    label: "Output Documented",
    sub: "Delivered outputs are structured for review",
    color: "#D4980C",
    x: 29,
    y: 55,
    detail:
      "The delivered output is documented in operational language, such as kits distributed, filters installed, workshops delivered, or households reached.",
    mobileImage: undefined,
  },
  {
    label: "Partner Confirmation",
    sub: "Authorized partner confirms the output",
    color: "#059669",
    x: 50,
    y: 55,
    detail:
      "An authorized partner confirms the output through a lightweight verification workflow, creating independence from the original submitter.",
    mobileImage: undefined,
  },
  {
    label: "Evidence Record Created",
    sub: "Structured record for reporting workflows",
    color: "#0A1F44",
    x: 71,
    y: 55,
    detail:
      "The confirmed output becomes a structured evidence record with output, activity context, authorized verifier, timestamp, region, and framework alignment support.",
    mobileImage: undefined,
  },
  {
    label: "Reporting Support",
    sub: "Evidence prepared for assurance review",
    color: "#7C3AED",
    x: 89,
    y: 55,
    detail:
      "ESG teams receive audit-ready evidence that supports reporting and assurance preparation without replacing independent assurance providers.",
    mobileImage: undefined,
  },
];

const CUSTODY_STEPS: {
  Icon: React.ComponentType<{ className?: string }>;
  num: string;
  label: string;
  sub: string;
  color: string;
  bg: string;
  detail: string;
}[] = [
  {
    Icon: FileCheck,
    num: "01",
    label: "Deliverable Completed",
    sub: "Outcome, hours, and project context are recorded as structured evidence inputs.",
    color: "#0D9488",
    bg: "#F0FDFA",
    detail:
      "A completed activity is converted into a clear outcome record that can be reviewed by an authorized partner and used in audit-ready evidence workflows.",
  },
  {
    Icon: ShieldCheck,
    num: "02",
    label: "Partner Confirms",
    sub: "An authorized verifier confirms whether the output can be trusted.",
    color: "#EA580C",
    bg: "#FFF7ED",
    detail:
      "The partner confirmation creates independence between the person submitting activity and the organization validating the result.",
  },
  {
    Icon: Lock,
    num: "03",
    label: "Evidence Object Created",
    sub: "Record structured with outcome, verifier, timestamp, region, and framework alignment.",
    color: "#DB2777",
    bg: "#FDF2F8",
    detail:
      "The confirmed outcome becomes an Evidence Object that can support audit sampling, reporting workflows, and third-party assurance preparation.",
  },
  {
    Icon: BarChart2,
    num: "04",
    label: "Audit-Ready Evidence",
    sub: "Evidence packs support ESG reporting and assurance preparation.",
    color: "#2563EB",
    bg: "#EFF6FF",
    detail:
      "Verified outcomes are organized against relevant ESG frameworks. Synerxus supports audit preparation; formal assurance and compliance conclusions remain with independent providers.",
  },
];

function ProcessStepIcon({
  index,
  color,
  compact = false,
}: {
  index: number;
  color: string;
  compact?: boolean;
}) {
  const sizeClass = compact ? "h-12 w-12" : "h-16 w-16";
  const iconClass = compact ? "h-5 w-5" : "h-7 w-7";

  if (index === 0) {
    return (
      <span
        className={`${sizeClass} relative flex shrink-0 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100`}
      >
        <ListChecks className={`${iconClass} text-blue-700`} />
        <Clock className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white p-0.5 text-blue-600 shadow-sm" />
      </span>
    );
  }

  if (index === 1) {
    return (
      <span
        className={`${sizeClass} relative flex shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100`}
      >
        <ListChecks className={`${iconClass} text-[#D4980C]`} />
        <LineChart className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white p-0.5 text-[#D4980C] shadow-sm" />
      </span>
    );
  }

  if (index === 2) {
    return (
      <span
        className={`${sizeClass} relative flex shrink-0 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100`}
      >
        <Handshake className={`${iconClass} text-emerald-700`} />
        <Check className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-600 p-0.5 text-white shadow-sm" />
        <Check className="absolute -bottom-1 -left-1 h-4 w-4 rounded-full bg-emerald-500 p-0.5 text-white shadow-sm" />
      </span>
    );
  }

  if (index === 3) {
    return (
      <span
        className={`${sizeClass} relative flex shrink-0 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200`}
      >
        <Layers className="absolute left-3 top-3 h-7 w-7 text-slate-300" />
        <span className="relative flex h-10 w-9 items-center justify-center rounded-md bg-white shadow-sm border border-slate-200">
          <ListChecks className="h-5 w-5 text-slate-700" />
          <Check className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-blue-600 p-0.5 text-white shadow-sm" />
        </span>
      </span>
    );
  }

  return (
    <span
      className={`${sizeClass} relative flex shrink-0 items-center justify-center rounded-2xl bg-purple-50 border border-purple-100`}
    >
      <Monitor className={`${iconClass} text-purple-700`} />
      <Headset className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white p-0.5 text-purple-600 shadow-sm" />
    </span>
  );
}

function HowItWorksSection({
  activeStep,
  setActiveStep,
  sectionRef,
}: {
  activeStep: number | null;
  setActiveStep: (s: number | null) => void;
  sectionRef: RefObject<HTMLElement>;
}) {
  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="bg-slate-50 py-8 md:py-10"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-10">
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1 rounded-full bg-[#0A1F44]/10 text-[#0A1F44] text-xs font-bold uppercase tracking-wider mb-3">
            How It Works
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0A1F44]">
            Activity to Verified Evidence Record
          </h2>
          <a
            href="/Synerxus-Verification-Methodology-v1.1.pdf"
            target="_blank"
            rel="noopener noreferrer"
            download="Synerxus-Verification-Methodology-v1.1.pdf"
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-[#0A1F44]/70 hover:text-[#0A1F44] border border-[#0A1F44]/20 hover:border-[#0A1F44]/50 rounded-full px-4 py-1.5 transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="flex-shrink-0"
            >
              <path
                d="M6 1v7M3 5.5l3 3 3-3M1.5 10.5h9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Download Verification Methodology
          </a>
        </div>

        {/* ── Mobile: winding roadmap (hidden on md+) ── */}
        <div className="md:hidden">
          {PIPELINE_STEPS.map((step, i) => {
            const isOpen = activeStep === i;
            const onLeft = i % 2 === 0;

            return (
              <div key={`mobile-${i}`}>
                {/* Step card — alternates left / right */}
                <div
                  className={`flex ${onLeft ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className="w-[82%] rounded-2xl border bg-white shadow-md overflow-hidden"
                    style={{ borderColor: isOpen ? step.color : "#e2e8f0" }}
                  >
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left focus:outline-none"
                      onClick={() => setActiveStep(isOpen ? null : i)}
                      aria-expanded={isOpen}
                    >
                      <ProcessStepIcon index={i} color={step.color} compact />
                      <span className="flex-1 min-w-0">
                        <span className="block font-extrabold text-[#0A1F44] text-sm leading-snug">
                          {step.label}
                        </span>
                        <span className="block text-[11px] text-slate-400 leading-snug mt-0.5">
                          {step.sub}
                        </span>
                      </span>
                      <span
                        className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M4 6l4 4 4-4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4">
                        <div
                          className="h-0.5 rounded-full mb-3 opacity-50"
                          style={{ backgroundColor: step.color }}
                        />
                        <p className="text-slate-500 text-sm leading-relaxed">
                          {step.detail}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Winding connector to the next step */}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="h-10 relative">
                    <svg
                      viewBox="0 0 100 40"
                      className="absolute inset-0 w-full h-full"
                      fill="none"
                      preserveAspectRatio="none"
                    >
                      {onLeft ? (
                        /* Left card → sweep right toward next card */
                        <path
                          d="M 70 0 C 70 20, 30 20, 30 40"
                          stroke={step.color}
                          strokeWidth="1.5"
                          strokeOpacity="0.45"
                          strokeDasharray="4 3"
                        />
                      ) : (
                        /* Right card → sweep left toward next card */
                        <path
                          d="M 30 0 C 30 20, 70 20, 70 40"
                          stroke={step.color}
                          strokeWidth="1.5"
                          strokeOpacity="0.45"
                          strokeDasharray="4 3"
                        />
                      )}
                      {/* Arrowhead at the end */}
                      {onLeft ? (
                        <path
                          d="M 26 36 L 30 40 L 34 36"
                          stroke={step.color}
                          strokeWidth="1.5"
                          strokeOpacity="0.55"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : (
                        <path
                          d="M 66 36 L 70 40 L 74 36"
                          stroke={step.color}
                          strokeWidth="1.5"
                          strokeOpacity="0.55"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Desktop: evidence workflow (hidden below md) ── */}
        <div className="hidden md:block">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-5">
            <div className="grid grid-cols-5 gap-3">
              {PIPELINE_STEPS.map((step, i) => {
                const isActive = activeStep === i;
                return (
                  <button
                    key={`${step.label}-${i}`}
                    type="button"
                    onMouseEnter={() => setActiveStep(i)}
                    onMouseLeave={() => setActiveStep(null)}
                    onClick={() => setActiveStep(isActive ? null : i)}
                    className={`relative text-left rounded-xl border p-4 min-h-[150px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1F44]/30 ${
                      isActive
                        ? "bg-blue-50 shadow-md"
                        : "bg-slate-50 hover:bg-white hover:shadow-sm"
                    }`}
                    style={{
                      borderColor: isActive ? step.color : "#e2e8f0",
                    }}
                  >
                    <div className="mb-4">
                      <ProcessStepIcon index={i} color={step.color} />
                    </div>
                    <span className="block text-sm font-extrabold text-[#0A1F44] leading-tight">
                      {step.label}
                    </span>
                    <span className="block mt-2 text-xs text-slate-500 leading-relaxed">
                      {step.sub}
                    </span>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <ArrowRight className="absolute -right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div
            className={`mt-4 rounded-2xl border bg-white px-6 py-5 flex items-start gap-4 shadow-md transition-all duration-300 ${
              activeStep !== null
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 pointer-events-none"
            }`}
            style={{
              borderColor:
                activeStep !== null
                  ? PIPELINE_STEPS[activeStep].color
                  : "#e2e8f0",
            }}
          >
            {activeStep !== null && (
              <>
                <div
                  className="w-2 self-stretch rounded-full flex-shrink-0"
                  style={{ backgroundColor: PIPELINE_STEPS[activeStep].color }}
                />
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{ color: PIPELINE_STEPS[activeStep].color }}
                  >
                    Step {activeStep + 1} of {PIPELINE_STEPS.length}
                  </p>
                  <h3 className="font-extrabold text-[#0A1F44] text-base mb-1">
                    {PIPELINE_STEPS[activeStep].label}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {PIPELINE_STEPS[activeStep].detail}
                  </p>
                </div>
              </>
            )}
            {activeStep === null && (
              <p className="text-slate-400 text-sm italic">
                Hover or tap a step in the diagram above to learn more.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const WATERMARK_BG = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='280'%3E%3Ctext x='50%25' y='50%25' font-size='72' font-weight='900' font-family='Arial,sans-serif' fill='%23000000' fill-opacity='0.055' text-anchor='middle' dominant-baseline='middle' transform='rotate(-35 210 140)'%3ESAMPLE%3C/text%3E%3C/svg%3E")`,
  backgroundRepeat: "repeat",
  backgroundSize: "420px 280px",
};

const SAMPLE_SDGS = [
  {
    num: 1,
    name: "No Poverty",
    hours: 520,
    outcomes: 45,
    beneficiaries: 12_400,
    color: "#E5243B",
  },
  {
    num: 3,
    name: "Good Health",
    hours: 390,
    outcomes: 38,
    beneficiaries: 8_200,
    color: "#4C9F38",
  },
  {
    num: 4,
    name: "Quality Education",
    hours: 410,
    outcomes: 31,
    beneficiaries: 6_800,
    color: "#C5192D",
  },
  {
    num: 8,
    name: "Decent Work",
    hours: 280,
    outcomes: 20,
    beneficiaries: 4_310,
    color: "#A21942",
  },
  {
    num: 13,
    name: "Climate Action",
    hours: 358,
    outcomes: 27,
    beneficiaries: 7_580,
    color: "#3F7E44",
  },
];

const SAMPLE_NGOS = [
  {
    name: "Green Future Alliance",
    outcomes: 56,
    hours: 680,
    beneficiaries: 18_200,
    verification: "In-Person + App",
    sdgs: [13, 3],
  },
  {
    name: "Solar Village Initiative",
    outcomes: 48,
    hours: 520,
    beneficiaries: 14_900,
    verification: "App Confirmed",
    sdgs: [7, 1],
  },
  {
    name: "Urban Green Corridors",
    outcomes: 30,
    hours: 478,
    beneficiaries: 6_190,
    verification: "In-Person",
    sdgs: [11, 13],
  },
];

const SAMPLE_EVIDENCE = [
  {
    id: "EO-2026-0041",
    date: "12 Mar 2026",
    ngo: "Green Future Alliance",
    outcome: "Watershed planting — 340 trees",
    hours: 16,
    sdg: 13,
    verifier: "Amara Diallo",
    method: "GPS + Photo",
  },
  {
    id: "EO-2026-0038",
    date: "08 Mar 2026",
    ngo: "Solar Village Initiative",
    outcome: "Solar panel installation — 22 homes",
    hours: 24,
    sdg: 7,
    verifier: "Kwame Osei",
    method: "App Tap",
  },
  {
    id: "EO-2026-0031",
    date: "01 Mar 2026",
    ngo: "Green Future Alliance",
    outcome: "Health screening — 85 beneficiaries",
    hours: 8,
    sdg: 3,
    verifier: "Amara Diallo",
    method: "App Tap",
  },
  {
    id: "EO-2026-0027",
    date: "24 Feb 2026",
    ngo: "Urban Green Corridors",
    outcome: "Job-readiness workshop — 42 trainees",
    hours: 12,
    sdg: 8,
    verifier: "Sofia Monteiro",
    method: "In-Person",
  },
];

function buildSampleReportHtml(): string {
  const WM = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='280'%3E%3Ctext x='50%25' y='50%25' font-size='72' font-weight='900' font-family='Arial,sans-serif' fill='%23000000' fill-opacity='0.055' text-anchor='middle' dominant-baseline='middle' transform='rotate(-35 210 140)'%3ESAMPLE%3C/text%3E%3C/svg%3E")`;

  const sdgColors: Record<number, string> = {
    1: "#E5243B",
    2: "#DDA63A",
    3: "#4C9F38",
    4: "#C5192D",
    5: "#FF3A21",
    6: "#26BDE2",
    7: "#FCC30B",
    8: "#A21942",
    9: "#FD6925",
    10: "#DD1367",
    11: "#FD9D24",
    12: "#BF8B2E",
    13: "#3F7E44",
    14: "#0A97D9",
    15: "#56C02B",
    16: "#00689D",
    17: "#19486A",
  };
  const sdgNames: Record<number, string> = {
    1: "No Poverty",
    3: "Good Health & Well-being",
    4: "Quality Education",
    7: "Affordable & Clean Energy",
    8: "Decent Work & Economic Growth",
    11: "Sustainable Cities & Communities",
    13: "Climate Action",
  };

  const sdgs = [
    { n: 13, outcomes: 45, hours: 680, benef: 18200 },
    { n: 1, outcomes: 38, hours: 490, benef: 12400 },
    { n: 3, outcomes: 31, hours: 390, benef: 8200 },
    { n: 7, outcomes: 27, hours: 358, benef: 7580 },
    { n: 4, outcomes: 20, hours: 280, benef: 4310 },
    { n: 8, outcomes: 15, hours: 195, benef: 2800 },
    { n: 11, outcomes: 10, hours: 165, benef: 1980 },
  ];
  const totalOutcomes = sdgs.reduce((s, d) => s + d.outcomes, 0); // 186 verified activities logged
  const sdgBarMax = Math.max(...sdgs.map((d) => d.outcomes));

  const sdgRows = sdgs
    .map((d) => {
      const pct =
        totalOutcomes > 0 ? Math.round((d.outcomes / totalOutcomes) * 100) : 0;
      const barW = Math.round((d.outcomes / sdgBarMax) * 100);
      return `<tr style="border-bottom:0.5px solid #e5e7eb;">
      <td style="padding:6px 8px;"><span style="background:${sdgColors[d.n]};color:#fff;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;">SDG ${d.n}</span></td>
      <td style="padding:6px 8px;font-size:11px;font-weight:500;color:#111827;">${sdgNames[d.n] || `SDG ${d.n}`}</td>
      <td style="padding:6px 8px;font-size:11px;text-align:center;font-weight:700;color:#0A2463;">${d.outcomes}</td>
      <td style="padding:6px 8px;font-size:11px;text-align:center;color:#374151;">${d.hours}h</td>
      <td style="padding:6px 8px;font-size:11px;text-align:center;color:#374151;">${d.benef.toLocaleString()}</td>
    </tr>`;
    })
    .join("");

  const sdgBarRows = sdgs
    .map((d, i) => {
      const pct =
        totalOutcomes > 0 ? Math.round((d.outcomes / totalOutcomes) * 100) : 0;
      const barW = Math.round((d.outcomes / sdgBarMax) * 100);
      return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:${i < sdgs.length - 1 ? "8px" : "0"};">
      <div style="width:110px;flex-shrink:0;font-size:9.5px;font-weight:600;"><span style="color:#0A2463;">SDG ${d.n}</span> <span style="color:#6B7280;font-weight:400;">${sdgNames[d.n] || ""}</span></div>
      <div style="flex:1;background:#E5E7EB;height:14px;border-radius:2px;overflow:hidden;"><div style="width:${barW}%;height:100%;background:#0A2463;border-radius:2px;"></div></div>
      <div style="width:130px;flex-shrink:0;font-size:9.5px;color:#374151;font-weight:500;">${pct}% <span style="color:#6B7280;font-weight:400;">(${d.outcomes} outcomes)</span></div>
    </div>`;
    })
    .join("");

  const ngoRows = [
    {
      name: "Green Future Alliance",
      loc: "Sub-Saharan Africa",
      outcomes: 56,
      benef: 18200,
      sdgs: [13, 3],
    },
    {
      name: "Solar Village Initiative",
      loc: "East Africa",
      outcomes: 48,
      benef: 14900,
      sdgs: [7, 1],
    },
    {
      name: "Urban Green Corridors",
      loc: "Europe",
      outcomes: 30,
      benef: 6190,
      sdgs: [11, 13],
    },
  ]
    .map(
      (n) => `<tr style="border-bottom:0.5px solid #e5e7eb;">
    <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#111827;">${n.name}</td>
    <td style="padding:6px 8px;font-size:11px;color:#374151;">${n.loc}</td>
    <td style="padding:6px 8px;font-size:11px;color:#374151;">${n.outcomes}</td>
    <td style="padding:6px 8px;font-size:11px;color:#374151;">${n.benef.toLocaleString()}</td>
    <td style="padding:6px 8px;font-size:11px;">${n.sdgs.map((g) => `<span style="background:${sdgColors[g]};color:#fff;padding:1px 5px;border-radius:3px;font-size:9px;margin-right:2px;">SDG ${g}</span>`).join("")}</td>
    <td style="padding:6px 8px;font-size:11px;"><span style="color:#059669;">&#10003; Complete</span></td>
  </tr>`,
    )
    .join("");

  const empRows = [
    {
      name: "Sarah M.",
      dept: "Sustainability",
      outcomes: 28,
      hours: 420,
      ngo: "Green Future Alliance",
      skills: "Environmental, Leadership",
    },
    {
      name: "James K.",
      dept: "Operations",
      outcomes: 22,
      hours: 352,
      ngo: "Solar Village Initiative",
      skills: "Project Management, Technical",
    },
    {
      name: "Ana P.",
      dept: "Human Resources",
      outcomes: 19,
      hours: 298,
      ngo: "Urban Green Corridors",
      skills: "Community Engagement, Training",
    },
    {
      name: "David L.",
      dept: "Finance",
      outcomes: 15,
      hours: 240,
      ngo: "Green Future Alliance",
      skills: "Financial Planning, Coaching",
    },
    {
      name: "Maria R.",
      dept: "Engineering",
      outcomes: 12,
      hours: 210,
      ngo: "Solar Village Initiative",
      skills: "Technical, Engineering",
    },
  ]
    .map(
      (
        v,
        i,
      ) => `<tr style="border-bottom:0.5px solid #e5e7eb;${i % 2 === 1 ? "background:#f9fafb;" : ""}">
    <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#111827;">${v.name}</td>
    <td style="padding:6px 8px;font-size:11px;color:#374151;">${v.dept}</td>
    <td style="padding:6px 8px;font-size:11px;text-align:center;font-weight:700;color:#0A2463;">${v.outcomes}</td>
    <td style="padding:6px 8px;font-size:11px;text-align:center;color:#374151;">${v.hours}h</td>
    <td style="padding:6px 8px;font-size:11px;color:#374151;">${v.ngo}</td>
    <td style="padding:6px 8px;font-size:11px;color:#374151;">${v.skills}</td>
  </tr>`,
    )
    .join("");

  const auditRows = [
    {
      date: "2026-03-28",
      emp: "Sarah M.",
      ngo: "Green Future Alliance",
      outcome: "Watershed planting — 340 trees restored",
      hours: 16,
      geo: true,
      method: "App",
    },
    {
      date: "2026-03-25",
      emp: "James K.",
      ngo: "Solar Village Initiative",
      outcome: "Solar panel installation — 22 homes energised",
      hours: 24,
      geo: true,
      method: "App",
    },
    {
      date: "2026-03-22",
      emp: "Ana P.",
      ngo: "Urban Green Corridors",
      outcome: "Job-readiness workshop — 42 trainees completed",
      hours: 8,
      geo: false,
      method: "App",
    },
    {
      date: "2026-03-18",
      emp: "David L.",
      ngo: "Green Future Alliance",
      outcome: "Health screening — 85 community beneficiaries",
      hours: 12,
      geo: true,
      method: "App",
    },
    {
      date: "2026-03-15",
      emp: "Maria R.",
      ngo: "Solar Village Initiative",
      outcome: "Clean-water filter installation — 14 households",
      hours: 10,
      geo: true,
      method: "App",
    },
    {
      date: "2026-03-10",
      emp: "Sarah M.",
      ngo: "Green Future Alliance",
      outcome: "Environmental education — 60 school students",
      hours: 6,
      geo: false,
      method: "App",
    },
    {
      date: "2026-03-07",
      emp: "James K.",
      ngo: "Urban Green Corridors",
      outcome: "Urban garden setup — 3 community plots",
      hours: 14,
      geo: true,
      method: "App",
    },
    {
      date: "2026-03-03",
      emp: "Ana P.",
      ngo: "Solar Village Initiative",
      outcome: "Financial literacy training — 35 participants",
      hours: 8,
      geo: false,
      method: "App",
    },
    {
      date: "2026-02-27",
      emp: "David L.",
      ngo: "Green Future Alliance",
      outcome: "Tree nursery — 500 seedlings prepared",
      hours: 20,
      geo: true,
      method: "App",
    },
    {
      date: "2026-02-22",
      emp: "Maria R.",
      ngo: "Urban Green Corridors",
      outcome: "Skills mentoring — 18 youth participants",
      hours: 9,
      geo: false,
      method: "App",
    },
  ]
    .map(
      (a) => `<tr style="border-bottom:0.5px solid #e5e7eb;">
    <td style="padding:5px 8px;font-size:10px;color:#374151;">${a.date}</td>
    <td style="padding:5px 8px;font-size:10px;font-weight:500;color:#111827;">${a.emp}</td>
    <td style="padding:5px 8px;font-size:10px;color:#374151;">${a.ngo}</td>
    <td style="padding:5px 8px;font-size:10px;color:#374151;">${a.outcome}</td>
    <td style="padding:5px 8px;font-size:10px;text-align:center;color:#374151;">${a.hours}h</td>
    <td style="padding:5px 8px;font-size:10px;"><span style="color:#059669;">&#10003; ${a.method}</span></td>
    <td style="padding:5px 8px;font-size:10px;color:#374151;">${a.geo ? "&#x1F4CD; Located" : "—"}</td>
  </tr>`,
    )
    .join("");

  const geoRows = [
    { loc: "Sub-Saharan Africa", count: 68 },
    { loc: "East Africa", count: 56 },
    { loc: "Europe", count: 41 },
    { loc: "North America", count: 25 },
    { loc: "South-East Asia", count: 10 },
  ];
  const geoMax = geoRows[0].count;
  const geoBarRows = geoRows
    .map(
      (g, i) =>
        `<div style="display:flex;align-items:center;gap:10px;margin-bottom:${i < geoRows.length - 1 ? "8px" : "0"};">
      <div style="width:130px;flex-shrink:0;font-size:9.5px;color:#374151;font-weight:600;">${g.loc}</div>
      <div style="flex:1;background:#E5E7EB;height:14px;border-radius:2px;overflow:hidden;"><div style="width:${Math.round((g.count / geoMax) * 100)}%;height:100%;background:${i === 0 ? "#0A2463" : "#374151"};border-radius:2px;opacity:${(1 - i * 0.12).toFixed(2)};"></div></div>
      <div style="width:100px;flex-shrink:0;font-size:9.5px;color:#374151;font-weight:500;">${g.count} verifications</div>
    </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>SAMPLE — Synerxus Corporate ESG Impact Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{--navy:#0A2463;--teal:#00A896;--gold:#F08A5D;--teal-lt:#E0F4F2;--navy-lt:#EEF2FF;--bd:#e5e7eb;--bg-s:#f9fafb;--txt:#111827;--txt-s:#6b7280;--r:8px;}
  body{font-family:'Inter',sans-serif;color:var(--txt);background:#fff;font-size:11px;line-height:1.5;position:relative;}
  body::after{content:'';position:fixed;inset:0;z-index:9999;pointer-events:none;
    background-image:${WM};background-repeat:repeat;background-size:420px 280px;}
  .page{max-width:900px;margin:0 auto;padding:24px;}
  h1{font-size:20px;font-weight:800;}
  h2{font-size:13px;font-weight:700;color:#fff;}
  h3{font-size:12px;font-weight:700;color:var(--navy);margin-bottom:8px;break-after:avoid;page-break-after:avoid;}
  h3+*{break-before:avoid;page-break-before:avoid;}
  table{width:100%;border-collapse:collapse;break-inside:avoid;page-break-inside:avoid;}
  thead{display:table-header-group;}
  tr{break-inside:avoid;page-break-inside:avoid;}
  td{break-inside:avoid;page-break-inside:avoid;}
  th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#fff;padding:7px 8px;break-inside:avoid;page-break-inside:avoid;}
  .section{margin-bottom:20px;border:0.5px solid var(--bd);border-radius:var(--r);overflow:hidden;break-inside:avoid;page-break-inside:avoid;}
  .section-header{background:var(--navy);padding:10px 14px;break-after:avoid;page-break-after:avoid;}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;break-inside:avoid;}
  .kpi{background:#fff;border:0.5px solid var(--bd);border-radius:var(--r);padding:12px 14px;break-inside:avoid;}
  .kpi-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--txt-s);margin-bottom:4px;}
  .kpi-value{font-size:22px;font-weight:800;color:var(--navy);line-height:1.1;}
  .kpi-sub{font-size:9px;color:var(--txt-s);margin-top:2px;}
  .badge-ok{color:#059669;font-weight:600;}
  .badge-warn{color:#d97706;font-weight:600;}
  .note{background:var(--teal-lt);border-left:3px solid var(--teal);padding:8px 12px;font-size:10px;color:#065f46;margin:10px 0;border-radius:0 var(--r) var(--r) 0;break-inside:avoid;}
  .warn-note{background:#fffbeb;border-left:3px solid var(--gold);padding:8px 12px;font-size:10px;color:#92400e;margin:10px 0;border-radius:0 var(--r) var(--r) 0;break-inside:avoid;}
  @page{size:A4 portrait;margin:11mm 22mm;}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .page{padding:0;}
    .kpi-grid,.section{break-inside:avoid;page-break-inside:avoid;}
    .section-header{break-after:avoid;page-break-after:avoid;}
    h3{break-after:avoid;page-break-after:avoid;}
    h3+*{break-before:avoid;page-break-before:avoid;}
    table{break-inside:avoid;page-break-inside:avoid;}
    thead{display:table-header-group;}
    tr{break-inside:avoid;page-break-inside:avoid;}
    td,th{break-inside:avoid;page-break-inside:avoid;}
  }
</style>
</head>
<body>
<div class="page">

<!-- HEADER -->
<div style="background:var(--navy);border-radius:var(--r);padding:16px 20px;margin-bottom:20px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px;">
        <span style="color:#fff;">SYNERXUS</span> · <span style="color:#D4980C;">Impact,</span> <span style="color:#fff;">Verified.</span>
      </div>
      <h1 style="color:#fff;font-size:18px;">Corporate ESG Impact Report</h1>
      <div style="color:#93c5fd;font-size:10px;margin-top:2px;">UN SDG-Aligned · Partner-Confirmed Outputs · Supports Audit Procedures</div>
    </div>
    <div style="text-align:right;color:#cbd5e1;font-size:10px;">
      <div style="color:#fff;font-weight:700;font-size:13px;margin-bottom:3px;">Report ID: ESG-2026-0407-ACME</div>
      <div>Generated: April 7, 2026</div>
      <div style="margin-top:2px;">Corporation: <strong style="color:#fff;">Acme Corporation</strong></div>
      <div>Reporting Period: <strong style="color:#fff;">Q1 2026 (Jan – Mar 2026)</strong></div>
    </div>
  </div>
</div>

<!-- SAMPLE NOTICE -->
<div style="background:#fef3c7;border:1.5px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-bottom:20px;break-inside:avoid;">
  <div style="font-size:10px;font-weight:700;color:#92400e;letter-spacing:.5px;margin-bottom:4px;">&#9888; SAMPLE REPORT — ILLUSTRATIVE DATA ONLY</div>
  <div style="font-size:10px;color:#78350f;line-height:1.6;">This is a <strong>sample report</strong> using fictitious data to demonstrate the Synerxus verification architecture. It mirrors the structure that can be delivered to corporate ESG teams. All names, figures, and organisations are illustrative. This report is classified as <strong>Management Reporting (Verified)</strong> — NOT a formal assurance opinion. Synerxus creates structured evidence that supports assurance preparation; it does not replace auditor judgment per ISAE 3000.</div>
</div>

<!-- SECTION 1: EXECUTIVE SNAPSHOT -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 1: Executive Snapshot</h3>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Authorized Partners</div><div class="kpi-value">3</div><div class="kpi-sub">organisations</div></div>
    <div class="kpi"><div class="kpi-label">Participants Linked</div><div class="kpi-value">47</div><div class="kpi-sub">of 120 linked</div></div>
    <div class="kpi"><div class="kpi-label">Partner-Confirmed Outputs</div><div class="kpi-value">134</div><div class="kpi-sub">186 total units</div></div>
    <div class="kpi"><div class="kpi-label">Supporting Hours</div><div class="kpi-value">1,678</div><div class="kpi-sub">linked to confirmed outputs</div></div>
    <div class="kpi"><div class="kpi-label">Partner-Reported Reach</div><div class="kpi-value">39,290</div><div class="kpi-sub">partner-tracked</div><div style="font-size:8px;color:#9ca3af;margin-top:3px;line-height:1.3;">&#8224; Partner estimates. Sample 15–30% for assurance review.</div></div>
    <div class="kpi"><div class="kpi-label">Verification Rate</div><div class="kpi-value">85%</div><div class="kpi-sub">avg 16h turnaround</div></div>
    <div class="kpi"><div class="kpi-label">Avg Hours / Employee</div><div class="kpi-value">35.7h</div><div class="kpi-sub">linked to confirmed outputs</div></div>
    <div class="kpi"><div class="kpi-label">SDGs Addressed</div><div class="kpi-value">7</div><div class="kpi-sub">goals impacted</div></div>
  </div>

  <!-- Verification density strip -->
  <div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;">
      <div style="padding:16px 20px;border-right:1px solid #E5E7EB;background:#F9FAFB;">
        <div style="font-size:22px;font-weight:700;color:#0A2463;line-height:1.1;">134 Verified</div>
        <div style="font-size:11px;color:#374151;margin-top:4px;font-weight:600;">Outcomes &#x2713;</div>
        <div style="font-size:10px;color:#6B7280;margin-top:6px;">85% Verification Rate</div>
      </div>
      <div style="padding:16px 20px;border-right:1px solid #E5E7EB;background:#F9FAFB;">
        <div style="font-size:22px;font-weight:700;color:#0A2463;line-height:1.1;">1,678 Verified</div>
        <div style="font-size:11px;color:#374151;margin-top:4px;font-weight:600;">Hours &#x23F1;</div>
        <div style="font-size:10px;color:#6B7280;margin-top:6px;">16h Avg SLA</div>
      </div>
      <div style="padding:16px 20px;background:#F9FAFB;">
        <div style="font-size:22px;font-weight:700;color:#0A2463;line-height:1.1;">39,290 Verified</div>
        <div style="font-size:11px;color:#374151;margin-top:4px;font-weight:600;">Beneficiaries</div>
        <div style="font-size:10px;color:#6B7280;margin-top:6px;">Partner-tracked</div>
      </div>
    </div>
    <div style="padding:6px 20px;background:#0A2463;font-size:9px;color:#E5E7EB;letter-spacing:.03em;">Management Reporting Verified — GRI · SASB · ESRS · ISAE 3000 Preparation</div>
  </div>

  <!-- Global sustainability assurance boundary indicator -->
  <div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">
    <div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:.05em;text-transform:uppercase;">Global Sustainability Assurance Boundary Indicator — ISAE 3000 Revised</div>
    <div style="padding:14px 16px;background:#F9FAFB;">
      <div style="background:#E5E7EB;height:18px;border-radius:3px;overflow:hidden;border:1px solid #D1D5DB;margin-bottom:8px;">
        <div style="width:65%;height:100%;background:#0A2463;display:flex;align-items:center;padding-left:8px;"><span style="font-size:9px;color:#F9FAFB;font-weight:700;">65%</span></div>
      </div>
      <div style="font-size:10.5px;color:#374151;font-weight:600;margin-bottom:4px;">WEF SCM · GRI · SASB · ESRS Support <span style="color:#0891B2;">(Management Reporting Verified)</span></div>
      <div style="font-size:9px;color:#6B7280;font-style:italic;padding-top:6px;border-top:1px solid #E5E7EB;margin-top:6px;">* Independent auditor procedures per ISAE 3000 required for formal assurance. Synerxus supports evidence preparation — it does not replace auditor judgment or opinion.</div>
    </div>
  </div>

  <!-- Framework disclosure support -->
  <div class="section">
    <div class="section-header"><h2>Framework Alignment Support (GRI · SASB · ESRS)</h2></div>
    <table>
      <thead><tr style="background:#f1f5f9;"><th style="color:var(--navy);">Disclosure Requirement</th><th style="color:var(--navy);">Status</th><th style="color:var(--navy);">Evidence</th></tr></thead>
      <tbody>
        <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:6px 8px;font-size:11px;font-weight:600;">Workforce development requirements (GRI 403, SASB SO-ES-110.C)</td><td style="padding:6px 8px;" class="badge-ok">&#10003; 47 employees deployed verified skills</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 3 + Outcome Log</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);background:#f9fafb;"><td style="padding:6px 8px;font-size:11px;font-weight:600;">Community engagement evidence (GRI 413, ESRS S3 where material)</td><td style="padding:6px 8px;" class="badge-ok">&#10003; 3 partners, 134 verified records</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 2 + Outcome Log</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:6px 8px;font-size:11px;font-weight:600;">Impact disclosure requirements (GRI 301, SASB SO-ES-110.B)</td><td style="padding:6px 8px;" class="badge-ok">&#10003; 39,290 partner-reported reach</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 2 + Beneficiary Counts</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);background:#f9fafb;"><td style="padding:6px 8px;font-size:11px;font-weight:600;">Impact disclosure requirements — Negative impacts</td><td style="padding:6px 8px;" class="badge-ok">&#10003; None disclosed this period</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 6</td></tr>
        <tr><td style="padding:6px 8px;font-size:11px;font-weight:600;">Monitoring processes requirements (GRI 103, SASB SO-ES-110.D)</td><td style="padding:6px 8px;" class="badge-ok">&#10003; 85% verification rate, 16h avg SLA</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Verification Trail (Section 5)</td></tr>
      </tbody>
    </table>
  </div>
  <div class="note">&#128161; <strong>Key Differentiator:</strong> Unlike self-reported hours-only systems, Synerxus delivers <strong>partner-confirmed outputs and supporting hours</strong> as structured, audit-ready evidence that can support GRI, SASB, ESRS and UN SDG reporting preparation where applicable.</div>
</div>

<!-- VERIFICATION BOUNDARY MATRIX -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Verification Boundary — Scope Definition</h3>
  <div style="font-family:Inter,sans-serif;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">
    <div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:.05em;text-transform:uppercase;">Verification Boundary — Included vs. Excluded</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;">
      <div style="border-right:1px solid #E5E7EB;">
        <div style="padding:8px 16px;font-size:10px;font-weight:700;color:#0891B2;background:#F0FDFF;border-bottom:1px solid #E5E7EB;">Included (Verified)</div>
        ${["Partner-confirmed outputs", "Defined review window", "Supported beneficiary counts", "Structured evidence records"].map((item, i, arr) => `<div style="padding:7px 16px;font-size:10.5px;color:#374151;${i < arr.length - 1 ? "border-bottom:1px solid #F3F4F6;" : ""}display:flex;align-items:center;gap:8px;"><span style="color:#0891B2;font-weight:700;">&#x2713;</span> ${item}</div>`).join("")}
      </div>
      <div>
        <div style="padding:8px 16px;font-size:10px;font-weight:700;color:#374151;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Excluded (Not Verified)</div>
        ${["Self-reported hours", "Outcomes >72h post-completion", "Projected/estimated numbers", "Financial SROI valuation"].map((item, i, arr) => `<div style="padding:7px 16px;font-size:10.5px;color:#6B7280;${i < arr.length - 1 ? "border-bottom:1px solid #F3F4F6;" : ""}display:flex;align-items:center;gap:8px;"><span style="color:#9CA3AF;font-weight:700;">&#x2717;</span> ${item}</div>`).join("")}
      </div>
    </div>
  </div>
</div>

<!-- SECTION 2: PARTNER CONFIRMATION -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 2: Partner-Confirmed Outputs</h3>
  <div class="section">
    <div class="section-header"><h2>Authorized Partners — Verified Evidence</h2></div>
    <table>
      <thead><tr><th>Authorized Partner</th><th>Location</th><th>Verified Records</th><th>Beneficiaries</th><th>SDG Alignment</th><th>Audit Status</th></tr></thead>
      <tbody>${ngoRows}</tbody>
    </table>
  </div>
  <div class="note">&#128161; <strong>Framework Relevance:</strong> GRI 413 relates to local communities, and ESRS S3 relates to affected communities when those communities are material. This section organizes partner-confirmed output evidence that can support community-facing reporting workflows.</div>
</div>

<!-- SECTION 3: ACTIVITY CONTEXT -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 3: Activity Context</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
    <div class="section">
      <div class="section-header"><h2>Participation Metrics</h2></div>
      <table><tbody>
        <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:7px 10px;font-size:11px;font-weight:600;">Participants Linked</td><td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700;color:var(--navy);">47</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);"><span class="badge-ok">&#10003; Verified roster</span></td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);background:#f9fafb;"><td style="padding:7px 10px;font-size:11px;font-weight:600;">Total Supporting Hours</td><td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700;color:var(--navy);">1,678h</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);"><span class="badge-ok">&#10003; linked to confirmed outputs</span></td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:7px 10px;font-size:11px;font-weight:600;">Avg Hours per Employee</td><td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700;color:var(--navy);">35.7h</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);">vs. 8h industry avg</td></tr>
        <tr><td style="padding:7px 10px;font-size:11px;font-weight:600;">Beneficiaries per Outcome</td><td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700;color:var(--navy);">293</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);"><span class="badge-ok">&#10003; Platform-tracked</span></td></tr>
      </tbody></table>
    </div>
    <div class="section">
      <div class="section-header"><h2>Industry Benchmarks</h2></div>
      <table><tbody>
        <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:7px 10px;font-size:11px;">Verification Rate</td><td style="padding:7px 10px;font-size:11px;font-weight:700;color:var(--navy);">85%</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);">vs. N/A (competitors)</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);background:#f9fafb;"><td style="padding:7px 10px;font-size:11px;">Verification SLA</td><td style="padding:7px 10px;font-size:11px;font-weight:700;color:var(--navy);">16h avg</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);">target: ≤72h</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:7px 10px;font-size:11px;">SDGs Addressed</td><td style="padding:7px 10px;font-size:11px;font-weight:700;color:var(--navy);">7 goals</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);">vs. 2.3 avg (Fortune 500)</td></tr>
        <tr><td style="padding:7px 10px;font-size:11px;">Authorized Partners</td><td style="padding:7px 10px;font-size:11px;font-weight:700;color:var(--navy);">3</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);">linked programs</td></tr>
      </tbody></table>
    </div>
  </div>
  <div class="section">
    <div class="section-header"><h2>Top Contributors (Verified Records)</h2></div>
    <table>
      <thead><tr><th>Contributor</th><th>Dept.</th><th style="text-align:center;">Verified Records</th><th style="text-align:center;">Hours</th><th>Partners</th><th>Skills Deployed</th></tr></thead>
      <tbody>${empRows}</tbody>
    </table>
  </div>
  <!-- Geographic heatmap -->
  <div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">
    <div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:.05em;text-transform:uppercase;">Global Verification Density — Q1 2026</div>
    <div style="padding:12px 16px;background:#F9FAFB;">${geoBarRows}</div>
    <div style="padding:7px 16px;border-top:1px solid #E5E7EB;background:#F9FAFB;display:flex;gap:24px;font-size:9px;color:#374151;">
      <span>Verification Rate: <strong style="color:#0A2463;">85%</strong></span>
      <span>Avg. SLA: <strong style="color:#0A2463;">16h</strong></span>
      <span style="color:#6B7280;">Partner-confirmed</span>
    </div>
  </div>
  <div class="note">&#128161; <strong>Framework Relevance:</strong> Workforce and community program evidence can support relevant disclosure preparation where applicable. This section links employee activity to partner-confirmed outputs without claiming causal attribution.</div>
</div>

<!-- SECTION 4: SDG ALIGNMENT -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 4: SDG Alignment &amp; Impact Attribution</h3>
  <div class="section">
    <div class="section-header"><h2>UN Sustainable Development Goals Contribution</h2></div>
    <table>
      <thead><tr><th>SDG</th><th>Goal</th><th style="text-align:center;">Outcomes</th><th style="text-align:center;">Hours</th><th style="text-align:center;">Beneficiaries</th></tr></thead>
      <tbody>${sdgRows}</tbody>
    </table>
  </div>
  <div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">
    <div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:.05em;text-transform:uppercase;">SDG Alignment — Verified Outcome Distribution</div>
    <div style="padding:12px 16px;background:#F9FAFB;">${sdgBarRows}</div>
    <div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">All percentages refer to verified outcomes only. SDG alignment confirmed by authorized partners.</div>
  </div>
</div>

<!-- SECTION 5: AUDIT TRAIL -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 5: Verified Evidence Records (Audit Trail)</h3>
  <div class="section">
    <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;"><h2>Structured Records for Auditor Sampling (showing 10 of 134)</h2></div>
    <table>
      <thead><tr><th>Date</th><th>Contributor</th><th>Partner</th><th>Output Confirmed</th><th style="text-align:center;">Hours</th><th>Method</th><th>Region</th></tr></thead>
      <tbody>${auditRows}</tbody>
    </table>
  </div>
  <!-- Verification timeline -->
  <div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">
    <div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:.05em;text-transform:uppercase;">Q1 2026 Verification Timeline — SLA Compliance</div>
    <div style="padding:14px 16px;background:#F9FAFB;">
      <div style="font-size:9px;color:#6B7280;margin-bottom:6px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;">90-Day Reporting Window</div>
      <div style="background:#E5E7EB;height:20px;border-radius:3px;overflow:hidden;border:1px solid #D1D5DB;margin-bottom:6px;"><div style="width:85%;height:100%;background:#0A2463;"></div></div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;align-items:center;gap:8px;"><div style="width:12px;height:8px;background:#0A2463;border-radius:1px;flex-shrink:0;"></div><span style="font-size:9.5px;color:#374151;font-weight:600;">85% verified within 72h SLA</span></div>
        <div style="display:flex;align-items:center;gap:8px;"><div style="width:12px;height:8px;background:#0891B2;border-radius:1px;flex-shrink:0;"></div><span style="font-size:9.5px;color:#374151;font-weight:600;">Structured evidence records maintained</span></div>
      </div>
    </div>
    <div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">Timestamps verified against stated SLA. 72h SLA matches boundary definition for defensibility.</div>
  </div>
  <!-- Evidence Object Architecture -->
  <div style="font-family:Inter,sans-serif;margin-bottom:14px;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">
    <div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:.05em;text-transform:uppercase;">Evidence Object: Structured Verification Unit</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;">
      <div style="border-right:1px solid #E5E7EB;">
        <div style="padding:8px 14px;font-size:10px;font-weight:700;color:#0A2463;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Outcome Data</div>
        ${["Deliverable", "Beneficiaries", "Hours", "Skills Applied"].map((item, i, arr) => `<div style="padding:5px 14px;font-size:10px;color:#374151;${i < arr.length - 1 ? "border-bottom:1px solid #F3F4F6;" : ""}">&#x2022; ${item}</div>`).join("")}
      </div>
      <div style="border-right:1px solid #E5E7EB;">
        <div style="padding:8px 14px;font-size:10px;font-weight:700;color:#0A2463;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Audit Trail</div>
        ${["Timestamp", "Authorized verifier", "Region", "Evidence reference"].map((item, i, arr) => `<div style="padding:5px 14px;font-size:10px;color:#374151;${i < arr.length - 1 ? "border-bottom:1px solid #F3F4F6;" : ""}">&#x2022; ${item}</div>`).join("")}
      </div>
      <div>
        <div style="padding:8px 14px;font-size:10px;font-weight:700;color:#0A2463;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Regulatory Metadata</div>
        ${["SDG Primary/Secondary", "WEF Pillar · GRI Disclosure", "Project ID", "Corporate Program"].map((item, i, arr) => `<div style="padding:5px 14px;font-size:10px;color:#374151;${i < arr.length - 1 ? "border-bottom:1px solid #F3F4F6;" : ""}">&#x2022; ${item}</div>`).join("")}
      </div>
    </div>
    <div style="padding:10px 16px;background:#F0FDFF;border-top:1px solid #E5E7EB;display:flex;align-items:center;gap:12px;">
      <span style="color:#0891B2;font-size:14px;">&#x2193;</span>
      <span style="font-size:10px;color:#0891B2;font-weight:700;">Partner confirmation &#x2713;</span>
      <span style="font-size:10px;color:#6B7280;">&#x2192;</span>
      <span style="font-size:10px;color:#374151;font-weight:600;">Structured Evidence Record</span>
    </div>
  </div>
  <div style="background:#f0f9ff;border:0.5px solid #bae6fd;border-radius:var(--r);padding:8px 12px;font-size:10px;color:#0369a1;margin-top:8px;">
    &#128269; <strong>Auditor Use Case:</strong> Randomly sample outcomes for direct partner confirmation. Each record includes authorized verifier context, timestamp, and program reference information.
  </div>
</div>

<!-- SECTION 6: DOUBLE MATERIALITY -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 6: Impact Materiality Disclosure (WEF Prosperity · GRI 413-2)</h3>
  <!-- Screening matrix -->
  <div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">
    <div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:.05em;text-transform:uppercase;">Negative Impact Screening — Status Matrix</div>
    <div style="display:grid;grid-template-columns:2fr 80px 100px 1fr;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">
      ${["Screening Dimension", "Status", "Outcomes Affected", "Verification Method"].map((h, i) => `<div style="padding:6px 12px;font-size:9px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.04em;${i < 3 ? "border-right:1px solid #E5E7EB;" : ""}">${h}</div>`).join("")}
    </div>
    ${[
      { dim: "Community Harm", method: "Authorized Partner" },
      { dim: "Environmental Effects", method: "Community Liaison" },
      { dim: "Resource Displacement", method: "Project Coordinator" },
      { dim: "Beneficiary Concerns", method: "Structured Survey" },
    ]
      .map(
        (
          row,
          i,
          arr,
        ) => `<div style="display:grid;grid-template-columns:2fr 80px 100px 1fr;${i < arr.length - 1 ? "border-bottom:1px solid #F3F4F6;" : ""}">
      <div style="padding:7px 12px;font-size:10px;color:#374151;border-right:1px solid #E5E7EB;">${row.dim}</div>
      <div style="padding:7px 12px;font-size:10px;color:#0891B2;font-weight:700;border-right:1px solid #E5E7EB;display:flex;align-items:center;gap:4px;">&#x2713; Pass</div>
      <div style="padding:7px 12px;font-size:10px;font-weight:700;color:#374151;border-right:1px solid #E5E7EB;text-align:center;">0</div>
      <div style="padding:7px 12px;font-size:10px;color:#6B7280;">${row.method}</div>
    </div>`,
      )
      .join("")}
  </div>
  <!-- Contribution chain -->
  <div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">
    <div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:.05em;text-transform:uppercase;">Contribution Chain — Verification Node</div>
    <div style="padding:16px;background:#F9FAFB;display:flex;align-items:center;flex-wrap:wrap;">
      ${[
        { label: "Program Activity", verified: false, sla: "" },
        {
          label: "Partner Confirmation &#x2713;",
          verified: true,
          sla: "16h Avg SLA",
        },
        { label: "Verified Outcome", verified: false, sla: "" },
        { label: "Beneficiaries", verified: false, sla: "" },
        { label: "SDG Advanced", verified: false, sla: "" },
      ]
        .map(
          (node, i, arr) => `<div style="display:flex;align-items:center;">
        <div style="padding:8px 12px;border:${node.verified ? "1.5px solid #0891B2" : "1px solid #E5E7EB"};border-radius:3px;background:${node.verified ? "#F0FDFF" : "#FFFFFF"};text-align:center;min-width:90px;">
          <div style="font-size:9.5px;font-weight:${node.verified ? "700" : "500"};color:${node.verified ? "#0891B2" : "#374151"};line-height:1.3;">${node.label}</div>
          ${node.sla ? `<div style="font-size:8.5px;color:#0A2463;font-weight:600;margin-top:3px;">${node.sla}</div>` : ""}
        </div>
        ${i < arr.length - 1 ? '<div style="padding:0 6px;color:#9CA3AF;font-size:14px;font-weight:300;">&#x2192;</div>' : ""}
      </div>`,
        )
        .join("")}
    </div>
    <div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">Independent partner confirmation is the trust mechanism — not self-reported activity alone.</div>
  </div>
  <!-- Assurance boundary diagram -->
  <div style="font-family:Inter,sans-serif;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;margin-top:16px;">
    <div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:.05em;text-transform:uppercase;">Assurance Boundary: Global Verification Scope</div>
    <div style="padding:12px 16px;background:#F9FAFB;border-bottom:1px solid #E5E7EB;font-size:10px;color:#374151;line-height:1.6;">This report provides verified evidence records that can support relevant sustainability reporting workflows (UN SDGs, GRI, SASB and ESRS). It supports assurance preparation but does not replace independent assurance per ISAE 3000.</div>
    <div style="padding:16px;background:#F9FAFB;">
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:100%;padding:10px 16px;border:1.5px solid #374151;border-radius:4px;background:#F9FAFB;text-align:center;">
          <div style="font-size:10px;font-weight:700;color:#374151;">Independent Assurance — ISAE 3000 REQUIRED</div>
          <div style="font-size:9px;color:#9CA3AF;margin-top:2px;">(Auditor Judgment)</div>
        </div>
        <div style="color:#9CA3AF;font-size:14px;line-height:1;margin:4px 0;">&#x2193;</div>
        <div style="width:88%;padding:10px 16px;border:1.5px solid #0891B2;border-radius:4px;background:#F0FDFF;text-align:center;">
          <div style="font-size:10px;font-weight:700;color:#0A2463;">Synerxus: Management Reporting Verified &#x2713;</div>
          <div style="font-size:9px;color:#0891B2;margin-top:2px;">(Partner Confirmation)</div>
        </div>
        <div style="color:#9CA3AF;font-size:14px;line-height:1;margin:4px 0;">&#x2193;</div>
        <div style="width:76%;padding:10px 16px;border:1.5px solid #0A2463;border-radius:4px;background:#EFF6FF;text-align:center;">
          <div style="font-size:10px;font-weight:700;color:#0A2463;">Self-Reported &#x2192; Verified &#x2192; Audit-Ready</div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #E5E7EB;">
      <div style="padding:12px 14px;border-right:1px solid #E5E7EB;background:#f0fdf4;">
        <div style="font-size:10px;font-weight:700;color:#065f46;margin-bottom:8px;">&#x2705; What Synerxus Provides</div>
        <ul style="margin:0;padding:0;list-style:none;">
          <li style="font-size:9.5px;color:#374151;margin-bottom:5px;padding-left:12px;position:relative;"><span style="position:absolute;left:0;color:#059669;">&#x2022;</span>Partner-confirmed outputs with structured evidence records</li>
          <li style="font-size:9.5px;color:#374151;margin-bottom:5px;padding-left:12px;position:relative;"><span style="position:absolute;left:0;color:#059669;">&#x2022;</span>Structured evidence records for GRI 413 and ESRS S3 support where applicable</li>
          <li style="font-size:9.5px;color:#374151;margin-bottom:5px;padding-left:12px;position:relative;"><span style="position:absolute;left:0;color:#059669;">&#x2022;</span>Evidence that can support materiality review workflows</li>
          <li style="font-size:9.5px;color:#374151;padding-left:12px;position:relative;"><span style="position:absolute;left:0;color:#059669;">&#x2022;</span>Framework alignment support (SDGs, GRI, SASB, ESRS)</li>
        </ul>
      </div>
      <div style="padding:12px 14px;background:#fef2f2;">
        <div style="font-size:10px;font-weight:700;color:#991b1b;margin-bottom:8px;">&#x274C; What Requires External Action</div>
        <ul style="margin:0;padding:0;list-style:none;">
          <li style="font-size:9.5px;color:#374151;margin-bottom:5px;padding-left:12px;position:relative;"><span style="position:absolute;left:0;color:#dc2626;">&#x2022;</span>Formal assurance opinion (independent auditor required)</li>
          <li style="font-size:9.5px;color:#374151;margin-bottom:5px;padding-left:12px;position:relative;"><span style="position:absolute;left:0;color:#dc2626;">&#x2022;</span>Causal attribution (requires RCTs)</li>
          <li style="font-size:9.5px;color:#374151;margin-bottom:5px;padding-left:12px;position:relative;"><span style="position:absolute;left:0;color:#dc2626;">&#x2022;</span>Financial valuation (SROI not calculated)</li>
          <li style="font-size:9.5px;color:#374151;padding-left:12px;position:relative;"><span style="position:absolute;left:0;color:#dc2626;">&#x2022;</span>Regulatory compliance conclusions (auditor judgment required)</li>
        </ul>
      </div>
    </div>
    <div style="padding:8px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#6b7280;font-style:italic;background:#fffbeb;">For formal regulatory filing (CSRD, SEC, etc.), third-party auditor review per ISAE 3000 remains required. Synerxus provides the evidence — auditors provide the opinion.</div>
  </div>
</div>

<!-- FOOTER -->
<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;font-size:9px;color:#9ca3af;">
  <div>&#169; 2026 Synerxus · SAMPLE REPORT — Data is illustrative only · Report ID: ESG-2026-0407-ACME</div>
  <div style="font-weight:700;color:#0A2463;">SYNERXUS</div>
</div>

</div>
</body>
</html>`;
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  pilot: "Verified Impact Pilot",
  starter: "Verified Impact Pilot",
  growth: "Verified Impact Pilot",
  enterprise: "Verified Impact Pilot",
  demo: "Book a Demo",
};

function PricingContactModal({
  plan,
  onClose,
}: {
  plan: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          company: form.company,
          email: form.email,
          plan: PLAN_DISPLAY_NAMES[plan] ?? plan,
          message: form.message,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send enquiry");
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err.message ||
          "Something went wrong. Please email hello@synerxus.com directly.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-contact-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </div>
            <h3
              id="pricing-contact-title"
              className="text-lg font-extrabold text-[#0A1F44] mb-2"
            >
              Request received!
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-5">
              We'll be in touch within one business day to discuss your{" "}
              <strong>
                {PLAN_DISPLAY_NAMES[plan]?.split(" — ")[0] ?? plan}
              </strong>{" "}
              plan.
            </p>
            <Button
              className="bg-[#0A1F44] hover:bg-[#0d2a5e] text-white font-semibold rounded-xl px-6"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#D4980C]/15 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-[#D4980C]" />
              </div>
              <div>
                <h3
                  id="pricing-contact-title"
                  className="text-base font-extrabold text-[#0A1F44] leading-tight"
                >
                  Get in touch
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {PLAN_DISPLAY_NAMES[plan] ?? plan}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Full name <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/20 focus:border-[#0A1F44]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Company <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    value={form.company}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, company: e.target.value }))
                    }
                    placeholder="Acme Corp"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/20 focus:border-[#0A1F44]/40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Work email <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="jane@company.com"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/20 focus:border-[#0A1F44]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Notes{" "}
                  <span className="text-slate-300 font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
                  placeholder="Tell us about your program size, geographies, or specific requirements..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/20 focus:border-[#0A1F44]/40 resize-none"
                />
              </div>
              {error && (
                <p className="text-xs text-red-500 text-center">{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0A1F44] hover:bg-[#0d2a5e] text-white font-bold rounded-xl py-2.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                    Sending…
                  </>
                ) : (
                  "Send Enquiry"
                )}
              </Button>
              <p className="text-center text-[11px] text-slate-400">
                We typically respond within one business day.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function LoopingCounter({
  target,
  suffix = "",
  delay = 0,
}: {
  target: number | null;
  suffix?: string;
  delay?: number;
}) {
  const [count, setCount] = useState(0);
  const animRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (target === null || target === 0) return;

    const DURATION = 2200;
    const HOLD = 1400;
    let startTime: number | null = null;

    const magnitude = Math.pow(
      10,
      Math.max(0, Math.floor(Math.log10(target)) - 1),
    );

    const step = (ts: number) => {
      if (startTime === null) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round((eased * target) / magnitude) * magnitude);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        timerRef.current = setTimeout(() => {
          startTime = null;
          setCount(0);
          animRef.current = requestAnimationFrame(step);
        }, HOLD);
      }
    };

    timerRef.current = setTimeout(() => {
      animRef.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [target, delay]);

  if (target === null) return <span>—</span>;
  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

function SampleReportModal({ onClose }: { onClose: () => void }) {
  const html = useMemo(() => buildSampleReportHtml(), []);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const printReport = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) return;
    w.focus();
    setTimeout(() => {
      w.print();
      URL.revokeObjectURL(url);
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sample-report-title"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Logo size="sm" clickable={false} />
          <span className="text-sm font-bold text-[#0A1F44] hidden sm:block">
            <span id="sample-report-title">Sample ESG Evidence Pack</span>
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-[#D4980C]/10 text-[#D4980C] rounded-full border border-[#D4980C]/20 uppercase tracking-wider">
            Sample
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={printReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A1F44] text-white text-xs font-semibold hover:bg-[#0d2a5e] transition-colors"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print / Save PDF
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-lg font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Report in isolated iframe */}
      <iframe
        ref={iframeRef}
        srcDoc={html}
        title="Sample Synerxus ESG Impact Report"
        className="flex-1 w-full border-0"
        sandbox="allow-popups"
      />
    </div>
  );
}

const EVIDENCE_FIELDS = [
  {
    id: "outcome",
    label: "Outcome",
    cardLabel: "Outcome",
    cardValue: "3 water filters installed",
    meaning: "The confirmed result in plain operational language.",
    auditValue:
      "It gives audit and reporting teams a concrete result to review instead of a broad ESG claim.",
    reliability:
      "The result is independently confirmed and presented as structured evidence.",
  },
  {
    id: "hours",
    label: "Hours",
    cardLabel: "Hours",
    cardValue: "6.5 hours",
    meaning: "Supporting context for the effort associated with the confirmed result.",
    auditValue:
      "It helps teams understand the contribution behind the outcome without making hours the primary evidence.",
    reliability:
      "The hours sit beside the independently confirmed outcome as supporting context.",
  },
  {
    id: "verifier",
    label: "Verifier",
    cardLabel: "Verifier",
    cardValue: "Authorized partner verifier",
    meaning: "The authorized third party associated with the confirmation.",
    auditValue:
      "It signals that the record is not based only on the original activity submitter.",
    reliability:
      "Independent confirmation increases trust in the evidence record.",
  },
  {
    id: "geo",
    label: "Location",
    cardLabel: "Location",
    cardValue: "Region (captured)",
    meaning: "The general region associated with the verified result.",
    auditValue:
      "It helps audit and reporting teams connect evidence to the relevant program boundary.",
    reliability:
      "Location context makes the record more traceable for review.",
  },
  {
    id: "framework",
    label: "Framework Alignment",
    cardLabel: "Frameworks",
    cardValue: "SDG · GRI · ESRS",
    meaning: "The sustainability frameworks this outcome can support.",
    auditValue:
      "It gives assurance and reporting teams a structured starting point for evidence review.",
    reliability:
      "Framework alignment is shown as support for the confirmed record, not as a compliance guarantee.",
  },
];

const EVIDENCE_FRAMEWORKS = [
  {
    id: "sdg",
    label: "SDG",
    detail:
      "This record can support ESG reporting and assurance preparation for relevant outcome areas.",
  },
  {
    id: "gri",
    label: "GRI",
    detail:
      "This record can support reporting and audit preparation for local stakeholder impact evidence.",
  },
  {
    id: "esrs",
    label: "ESRS",
    detail:
      "This record can support affected-community evidence review within reporting workflows.",
  },
  {
    id: "isae",
    label: "ISAE 3000",
    detail:
      "This record can support assurance preparation by giving auditors structured evidence to review.",
  },
];

function EvidenceObjectSection() {
  const [activeField, setActiveField] = useState(EVIDENCE_FIELDS[0]);
  const [activeFramework, setActiveFramework] = useState(EVIDENCE_FRAMEWORKS[0]);
  const [feedback, setFeedback] = useState("Outcome selected");

  const selectField = (field: (typeof EVIDENCE_FIELDS)[number]) => {
    setActiveField(field);
    setFeedback(`${field.label} selected`);
  };

  const selectFramework = (framework: (typeof EVIDENCE_FRAMEWORKS)[number]) => {
    setActiveFramework(framework);
    setFeedback(`${framework.label} framework support shown`);
  };

  const cardRows = [
    EVIDENCE_FIELDS[0],
    EVIDENCE_FIELDS[1],
    EVIDENCE_FIELDS[2],
    EVIDENCE_FIELDS[3],
    EVIDENCE_FIELDS[4],
  ];

  return (
    <section
      id="verification-stack"
      className="py-12 md:py-16 bg-slate-950 text-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
        <div className="max-w-3xl mb-8 md:mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-200 border border-blue-400/20 text-xs font-bold uppercase tracking-wider mb-4">
            <ShieldCheck className="h-3.5 w-3.5" />
            Evidence Object
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
            The missing evidence layer auditors actually need.
          </h2>
          <p className="text-slate-300 text-sm md:text-base mt-4 leading-relaxed">
            Synerxus converts field activity into verified, traceable,
            audit-ready evidence objects with independent confirmation attached.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6 lg:gap-8 items-start">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 sm:p-4 md:p-5 shadow-2xl overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-200">
                    Field Explorer
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Click a field to see why it matters.
                  </p>
                </div>
                <span className="w-fit max-w-full text-[11px] text-green-200 bg-green-500/10 border border-green-400/20 rounded-full px-2.5 py-1 truncate">
                  {feedback}
                </span>
              </div>

              <div className="-mx-3.5 sm:mx-0 overflow-x-auto sm:overflow-visible px-3.5 sm:px-0 pb-1 sm:pb-0">
                <div className="flex sm:grid sm:grid-cols-2 gap-2.5 min-w-0">
                {EVIDENCE_FIELDS.map((field) => {
                  const isActive = activeField.id === field.id;
                  return (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => selectField(field)}
                      aria-pressed={isActive}
                      className={`group shrink-0 sm:shrink text-left rounded-xl border px-3.5 py-3 transition-all duration-200 min-w-[132px] sm:min-w-0 ${
                        isActive
                          ? "border-blue-400 bg-blue-500/15 shadow-[0_0_0_1px_rgba(96,165,250,0.25)]"
                          : "border-white/10 bg-white/[0.03] hover:border-blue-300/60 hover:bg-blue-500/10"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-white">
                          {field.label}
                        </span>
                        <ArrowRight
                          className={`h-3.5 w-3.5 transition-transform ${
                            isActive
                              ? "text-blue-300 translate-x-0.5"
                              : "text-slate-500 group-hover:text-blue-300 group-hover:translate-x-0.5"
                          }`}
                        />
                      </span>
                    </button>
                  );
                })}
                </div>
              </div>

              <div
                key={activeField.id}
                className="mt-4 rounded-xl border border-blue-400/20 bg-blue-950/35 p-3.5 sm:p-4 transition-all duration-300"
              >
                <h3 className="text-base font-bold text-white mb-3">
                  {activeField.label}
                </h3>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p className="text-slate-300">
                    <span className="font-semibold text-blue-200">
                      What it means:
                    </span>{" "}
                    {activeField.meaning}
                  </p>
                  <p className="text-slate-300">
                    <span className="font-semibold text-green-200">
                      Audit value:
                    </span>{" "}
                    {activeField.auditValue}
                  </p>
                  <p className="text-slate-300">
                    <span className="font-semibold text-purple-200">
                      Why it builds trust:
                    </span>{" "}
                    {activeField.reliability}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-3.5 sm:p-4 md:p-5 overflow-hidden">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-200 mb-3">
                Framework Mapping Layer
              </p>
              <div className="-mx-3.5 sm:mx-0 overflow-x-auto sm:overflow-visible px-3.5 sm:px-0 pb-1 sm:pb-0 mb-4">
                <div className="flex sm:flex-wrap gap-2">
                {EVIDENCE_FRAMEWORKS.map((framework) => {
                  const isActive = activeFramework.id === framework.id;
                  return (
                    <button
                      key={framework.id}
                      type="button"
                      onClick={() => selectFramework(framework)}
                      aria-pressed={isActive}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                        isActive
                          ? "border-purple-300 bg-purple-300 text-slate-950"
                          : "border-purple-300/30 bg-purple-300/10 text-purple-100 hover:bg-purple-300/20"
                      }`}
                    >
                      {framework.label}
                    </button>
                  );
                })}
                </div>
              </div>
              <div
                key={activeFramework.id}
                className="rounded-xl bg-slate-950/45 border border-purple-300/20 p-3"
              >
                <p className="text-sm text-slate-200 leading-relaxed">
                  {activeFramework.detail}
                </p>
                <p className="text-[11px] text-purple-200 mt-2">
                  Supports audit preparation, not a compliance guarantee.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white to-slate-100 text-slate-950 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Evidence Object · Sample
                  </p>
                  <h3 className="text-xl font-extrabold text-slate-950 mt-1">
                    Audit-Ready Evidence Record
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-700 border border-green-200 px-3 py-1 text-xs font-extrabold">
                  <CheckCircle className="h-3.5 w-3.5" />
                  VERIFIED
                </span>
              </div>

              <div className="p-5 space-y-3">
                {cardRows.map((row) => {
                  const isActive = activeField.id === row.id;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        const field = EVIDENCE_FIELDS.find(
                          (item) => item.id === row.id,
                        );
                        if (field) selectField(field);
                        else setFeedback("Evidence field highlighted");
                      }}
                      className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                        isActive
                          ? "border-blue-400 bg-blue-50 shadow-[0_0_0_2px_rgba(59,130,246,0.12)]"
                          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                      }`}
                    >
                      <span className="flex items-start justify-between gap-4">
                        <span>
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            {row.cardLabel}
                          </span>
                          <span className="block text-sm font-bold text-slate-900 mt-1">
                            {row.cardValue}
                          </span>
                        </span>
                        <span
                          className={`mt-1 h-2.5 w-2.5 rounded-full ${
                            isActive ? "bg-blue-500" : "bg-slate-300"
                          }`}
                        />
                      </span>
                    </button>
                  );
                })}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Timestamp
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      Timestamp captured
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Evidence summary
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      Confirmed output · supporting context
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 mb-2">
                    Framework support
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EVIDENCE_FRAMEWORKS.map((framework) => (
                      <button
                        key={framework.id}
                        type="button"
                        onClick={() => selectFramework(framework)}
                        className="rounded-full bg-white border border-purple-200 text-purple-800 text-xs font-bold px-2.5 py-1 hover:bg-purple-100 transition-colors"
                      >
                        {framework.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-green-400/20 bg-slate-900 p-5 shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-green-300 mb-2">
                Audit Context
              </p>
              <p className="text-lg font-bold text-white leading-snug">
                This record is independently confirmed and structured for audit
                and reporting workflows.
              </p>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                The evidence object gives reviewers a traceable, audit-ready
                source record while showing only outputs and trust signals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function JoinNetworkModal({
  onClose,
  onSelectRole,
}: {
  onClose: () => void;
  onSelectRole: (route: string) => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-network-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#D4980C] mb-1">
              Verification Network
            </p>
            <h2
              id="join-network-title"
              className="text-2xl font-extrabold text-[#0A1F44]"
            >
              Join the Verification Network
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close join network modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <button
            type="button"
            onClick={() => onSelectRole("/signup/organization")}
            className="w-full text-left rounded-xl border border-slate-200 p-5 hover:border-[#0A1F44] hover:bg-blue-50/60 transition-colors"
          >
            <div className="flex items-start gap-4">
              <span className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-base font-bold text-[#0A1F44]">
                  Join as Verification Partner
                </span>
                <span className="block text-sm text-slate-600 mt-1">
                  Confirm outputs and create structured evidence records for reporting workflows.
                </span>
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectRole("/signup/corporate")}
            className="w-full text-left rounded-xl border border-slate-200 p-5 hover:border-[#0A1F44] hover:bg-blue-50/60 transition-colors"
          >
            <div className="flex items-start gap-4">
              <span className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-base font-bold text-[#0A1F44]">
                  Join as ESG Team
                </span>
                <span className="block text-sm text-slate-600 mt-1">
                  Link activity data, partner-confirmed outputs, and framework support in one evidence workflow.
                </span>
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [, navigate] = useLocation();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSampleReport, setShowSampleReport] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const [activeGapLayer, setActiveGapLayer] = useState<string | null>(null);
  const [showProcessBrief, setShowProcessBrief] = useState(false);
  const [showAllFaq, setShowAllFaq] = useState(false);
  const [activeSdg, setActiveSdg] = useState<number | null>(null);
  const [howItWorksStep, setHowItWorksStep] = useState<number | null>(null);
  const [pricingPlan, setPricingPlan] = useState<string | null>(null);
  const [showJoinNetwork, setShowJoinNetwork] = useState(false);
  const [custodyActive, setCustodyActive] = useState<number | null>(null);
  const howItWorksRef = useRef<HTMLElement>(null);
  const heroTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heroTouchStartX = useRef<number | null>(null);

  // Auto-advance hero slides; resets when user manually picks a slide
  const startHeroTimer = () => {
    if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    heroTimerRef.current = setInterval(
      () => setHeroSlide((s) => (s + 1) % HERO_SLIDES.length),
      4000,
    );
  };

  useEffect(() => {
    startHeroTimer();
    return () => {
      if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    };
  }, []);

  const goToSlide = (i: number) => {
    setHeroSlide(i);
    startHeroTimer();
  };

  const storedUserId =
    typeof window !== "undefined"
      ? localStorage.getItem("currentUserId")
      : null;

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/users/me", storedUserId],
    queryFn: async () => {
      if (!storedUserId) return null;
      const response = await fetch(`/api/users/me?userId=${storedUserId}`);
      return response.ok ? response.json() : null;
    },
    enabled: !!storedUserId,
  });

  const { data: publicStats } = useQuery<{
    totalVerifiedOutcomes: number;
    totalVerifiedHours: number;
    totalBeneficiaries: number;
    verificationRate: number;
    uniqueSdgsTracked: number;
    totalVolunteers: number;
    activeNGOs: number;
  }>({
    queryKey: ["/api/public-stats"],
    queryFn: () => fetch("/api/public-stats").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const isLoggedIn = !!storedUserId && !!currentUser?.id;

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
  };

  const openJoinNetwork = () => {
    setMobileMenuOpen(false);
    setShowJoinNetwork(true);
  };

  const selectNetworkRole = (route: string) => {
    setShowJoinNetwork(false);
    navigate(route);
  };

  const focusLandingTop = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    setMobileMenuOpen(false);

    const scrollToTop = () => {
      window.history.replaceState(null, "", "/landing");
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.getElementById("landing-top")?.focus({ preventScroll: true });
    };

    if (window.location.pathname !== "/landing") {
      navigate("/landing");
      window.setTimeout(scrollToTop, 0);
      return;
    }

    scrollToTop();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden w-full">
      {showSampleReport && (
        <SampleReportModal onClose={() => setShowSampleReport(false)} />
      )}
      {pricingPlan && (
        <PricingContactModal
          plan={pricingPlan}
          onClose={() => setPricingPlan(null)}
        />
      )}
      {showJoinNetwork && (
        <JoinNetworkModal
          onClose={() => setShowJoinNetwork(false)}
          onSelectRole={selectNetworkRole}
        />
      )}
      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200 shadow-sm safe-area-top">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-3 flex justify-between items-center">
          <button
            type="button"
            onClick={focusLandingTop}
            className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 text-left"
            aria-label="Go to top of landing page"
          >
            <Logo size="sm" showMotto={true} />
          </button>

          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "How It Works", anchor: "how-it-works" },
              { label: "Evidence", anchor: "verification-stack" },
              { label: "Solutions", anchor: "for-teams" },
              { label: "Compliance", anchor: "pricing" },
              { label: "Resources", anchor: "faq" },
            ].map(({ label, anchor }) => (
              <a
                key={anchor}
                href={`#${anchor}`}
                className="px-3 py-1.5 text-sm text-slate-700 font-medium hover:bg-blue-50 hover:text-[#0A1F44] rounded-lg transition-colors"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <Button
                    size="sm"
                    className="whitespace-nowrap bg-[#0A1F44] hover:bg-[#0d2a5e] text-white font-semibold text-sm px-4 rounded-xl"
                    data-testid="button-my-dashboard"
                  >
                    My Dashboard
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSignOut}
                  className="whitespace-nowrap border-slate-300 text-slate-700 font-semibold text-sm px-3 rounded-xl hover:bg-slate-100"
                  data-testid="button-logout-nav"
                >
                  <LogOut className="h-4 w-4 mr-1.5" />
                  Log Out
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/login")}
                className="whitespace-nowrap border-slate-300 text-slate-700 font-semibold text-sm px-4 rounded-xl hover:bg-slate-100"
                data-testid="button-login-nav"
              >
                <LogIn className="h-4 w-4 mr-1.5" />
                Login
              </Button>
            )}
          </div>

          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 transition-colors text-slate-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="md:hidden absolute left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-lg">
              <div className="px-4 py-3 space-y-1 border-b border-slate-100">
                {[
                  { label: "How It Works", anchor: "how-it-works" },
                  { label: "Evidence", anchor: "verification-stack" },
                  { label: "Solutions", anchor: "for-teams" },
                  { label: "Compliance", anchor: "pricing" },
                  { label: "Resources", anchor: "faq" },
                ].map(({ label, anchor }) => (
                  <a
                    key={anchor}
                    href={`#${anchor}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-[#0A1F44] transition-colors"
                  >
                    {label}
                  </a>
                ))}
              </div>
              <div className="px-4 py-3 space-y-2">
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("/dashboard");
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#0A1F44] text-white font-semibold text-sm text-center"
                      data-testid="button-my-dashboard"
                    >
                      My Dashboard
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm text-center flex items-center justify-center gap-2"
                      data-testid="button-logout-nav"
                    >
                      <LogOut className="h-4 w-4" />
                      Log Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/login");
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm text-center flex items-center justify-center gap-2"
                    data-testid="button-login-nav"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </nav>

      <main
        className="flex-1 overflow-x-hidden w-full"
        style={{ paddingTop: "calc(57px + env(safe-area-inset-top, 0px))" }}
      >
        {/* ── Section 1: Hero ── */}
        <section
          id="landing-top"
          className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/60 to-blue-100/80 py-10 md:py-16"
          data-testid="section-hero"
          tabIndex={-1}
        >
          {/* Decorative SVG wave top-right */}
          <svg
            className="absolute top-0 right-0 w-64 md:w-96 opacity-30 pointer-events-none"
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <ellipse cx="300" cy="80" rx="260" ry="160" fill="#BFDBFE" />
          </svg>
          {/* Decorative SVG arc bottom-left */}
          <svg
            className="absolute bottom-0 left-0 w-48 md:w-72 opacity-20 pointer-events-none"
            viewBox="0 0 300 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <ellipse cx="0" cy="200" rx="200" ry="130" fill="#93C5FD" />
          </svg>

          <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-2 gap-12 md:items-stretch">
            {/* Left column */}
            <div className="flex flex-col order-2 md:order-1">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight text-[#0A1F44] mb-5"
                data-testid="text-hero-title"
              >
                Turn ESG Activity Into Audit-Ready Evidence
              </h1>

              <p
                className="text-base md:text-lg text-slate-600 mb-8 leading-relaxed"
                data-testid="text-hero-description"
              >
                Synerxus turns ESG activity — including volunteer time,
                partner-delivered outputs, and social value programs — into
                independently confirmed, audit-ready evidence.
              </p>

              <div className="flex flex-wrap gap-2 sm:gap-3 mb-10">
                {isLoggedIn ? (
                  <Link href="/dashboard">
                    <Button
                      size="lg"
                      className="bg-[#0A1F44] hover:bg-[#0d2a5e] text-white font-bold px-8 rounded-xl shadow-lg"
                      data-testid="button-my-dashboard-hero"
                    >
                      My Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button
                      size="lg"
                      onClick={() => setPricingPlan("demo")}
                      className="bg-[#0A1F44] hover:bg-[#0d2a5e] text-white font-bold px-4 sm:px-8 rounded-xl shadow-lg text-sm sm:text-base"
                      data-testid="button-book-demo-hero"
                    >
                      Book Demo
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setShowSampleReport(true)}
                      className="border-[#0A1F44] text-[#0A1F44] hover:bg-[#0A1F44] hover:text-white font-bold px-4 sm:px-8 rounded-xl shadow-sm text-sm sm:text-base"
                      data-testid="button-view-sample-evidence-hero"
                    >
                      View Sample Evidence
                    </Button>
                    <Button
                      size="lg"
                      onClick={openJoinNetwork}
                      className="bg-[#D4980C] hover:bg-[#B07F0A] text-[#0A1F44] font-bold px-4 sm:px-6 rounded-xl shadow-lg text-sm sm:text-base border border-[#D4980C]/40"
                      data-testid="button-join-network-hero"
                    >
                      Join Network
                    </Button>
                  </>
                )}
              </div>

              {/* Free tier note */}
              {!isLoggedIn && (
                <p className="text-xs text-slate-500 -mt-7 mb-5 flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  NGOs &amp; Volunteers always join free
                </p>
              )}

              {/* Trust badge strip */}
              <div className="grid grid-cols-2 gap-2 mt-1 justify-items-start">
                {[
                  "Partner-Confirmed Outputs",
                  "Tamper-Evident Audit Trail",
                  "Global Framework Support",
                  "SDG-Aligned Impact",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-[#0A1F44]/15 text-[10px] sm:text-xs font-semibold text-[#0A1F44] shadow-sm w-fit"
                  >
                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Right column — image slideshow */}
            <div className="relative order-1 md:order-2 flex justify-center md:flex-col">
              <div className="relative w-full max-w-lg md:max-w-none md:flex-1 md:flex md:flex-col">
                {/* Slide images — crossfade stack */}
                <div
                  className="relative rounded-2xl overflow-hidden md:flex-1"
                  style={{
                    minHeight: "220px",
                    boxShadow:
                      "0 25px 50px -12px rgb(0 0 0 / 0.25), inset 0 0 110px 45px rgba(255, 255, 255, 0.78)",
                  }}
                  onTouchStart={(e) => {
                    heroTouchStartX.current = e.touches[0].clientX;
                  }}
                  onTouchEnd={(e) => {
                    if (heroTouchStartX.current === null) return;
                    const delta =
                      e.changedTouches[0].clientX - heroTouchStartX.current;
                    heroTouchStartX.current = null;
                    if (Math.abs(delta) < 40) return;
                    goToSlide(
                      delta < 0
                        ? (heroSlide + 1) % HERO_SLIDES.length
                        : (heroSlide - 1 + HERO_SLIDES.length) %
                            HERO_SLIDES.length,
                    );
                  }}
                >
                  {HERO_SLIDES.map((src, i) =>
                    shouldRenderHeroSlide(heroSlide, i) ? (
                      <img
                        key={i}
                        src={src}
                        alt={`ESG impact slide ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                        style={{ opacity: heroSlide === i ? 1 : 0 }}
                        loading={i === 0 ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={i === 0 ? "high" : "auto"}
                      />
                    ) : null,
                  )}
                </div>

                {/* Dot navigation */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 pointer-events-none">
                  {HERO_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToSlide(i)}
                      aria-label={`Slide ${i + 1}`}
                      className="pointer-events-auto rounded-full border-2 border-white shadow transition-all duration-300"
                      style={{
                        width: heroSlide === i ? "24px" : "8px",
                        height: "8px",
                        backgroundColor:
                          heroSlide === i ? "#ffffff" : "rgba(255,255,255,0.5)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Partner Strip ── */}
        <div className="bg-slate-50 border-y border-slate-100 py-4 px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap text-center sm:text-left">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 flex-shrink-0">
              Verified with
            </span>
            {/* Partner 1 */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-[#0A1F44] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-extrabold tracking-tight">
                  LF
                </span>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#0A1F44] leading-tight">
                  Limitless Foundation
                </p>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Zambia · Youth &amp; Field Impact
                </p>
              </div>
              <span className="flex-shrink-0 ml-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <circle cx="4" cy="4" r="3" fill="#059669" />
                </svg>
                Active partner
              </span>
            </div>
            {/* Partner 2 */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-extrabold tracking-tight">
                  GH
                </span>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#0A1F44] leading-tight">
                  GreenHope Alliance
                </p>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Kenya · Environment &amp; Education
                </p>
              </div>
              <span className="flex-shrink-0 ml-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <circle cx="4" cy="4" r="3" fill="#D4980C" />
                </svg>
                Onboarding
              </span>
            </div>
            {/* Partner 3 */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-[#059669] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-extrabold tracking-tight">
                  RI
                </span>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#0A1F44] leading-tight">
                  Rise Impact Network
                </p>
                <p className="text-[10px] text-slate-400 leading-tight">
                  South Africa · Skills &amp; Livelihoods
                </p>
              </div>
              <span className="flex-shrink-0 ml-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <circle cx="4" cy="4" r="3" fill="#D4980C" />
                </svg>
                Onboarding
              </span>
            </div>
          </div>
        </div>

        {!isLoggedIn && (
          <section className="bg-white border-b border-slate-100 py-8 md:py-10">
            <div className="max-w-6xl mx-auto px-6 md:px-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#D4980C] mb-2">
                    Verification Network
                  </p>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-[#0A1F44]">
                    Participate in the Verification Network
                  </h2>
                  <p className="text-sm md:text-base text-slate-600 mt-2 max-w-2xl">
                    ESG teams capture activity and output data. Authorized
                    partners confirm what was delivered so Synerxus can create
                    structured, audit-ready evidence records.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:min-w-[520px]">
                  <button
                    type="button"
                    onClick={() => selectNetworkRole("/signup/organization")}
                    className="text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-[#0A1F44] p-5 transition-colors"
                    data-testid="button-split-join-ngo-partner"
                  >
                    <span className="flex items-center gap-3 text-[#0A1F44] font-bold">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      For Partners
                    </span>
                    <span className="block mt-2 text-sm text-slate-600">
                      Join as Verification Partner
                    </span>
                    <span className="block mt-1 text-xs text-slate-500 leading-relaxed">
                      Confirm outputs through lightweight workflows and
                      generate funder-ready reports.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectNetworkRole("/signup/corporate")}
                    className="text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-[#0A1F44] p-5 transition-colors"
                    data-testid="button-split-join-volunteer"
                  >
                    <span className="flex items-center gap-3 text-[#0A1F44] font-bold">
                      <UserPlus className="h-5 w-5 text-blue-600" />
                      For ESG Teams
                    </span>
                    <span className="block mt-2 text-sm text-slate-600">
                      Book a Demo
                    </span>
                    <span className="block mt-1 text-xs text-slate-500 leading-relaxed">
                      Connect activity data, partner-confirmed outputs, and
                      framework alignment support.
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Section 2: Problem ── */}
        <section
          id="problem"
          className="relative py-10 md:py-16 bg-white overflow-visible"
        >
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A1F44] mb-4">
                ESG Claims Are Only as Strong as the Evidence Behind Them
              </h2>
              <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto">
                ESG, CSR, corporate volunteering, and social value programs
                often rely on self-reported activity data. Hours,
                participation, and internal summaries are useful, but they are
                not enough when stakeholders ask what actually happened.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Building2 className="h-7 w-7 text-[#0A1F44]" />,
                  segment: "ESG Teams",
                  pain: "Need evidence that can withstand assurance, investor scrutiny, and regulatory review.",
                  quote: '"Reporting claims need reviewable evidence."',
                },
                {
                  icon: <Users className="h-7 w-7 text-[#0A1F44]" />,
                  segment: "Corporate Volunteering",
                  pain: "Volunteer hours are useful, but time alone does not confirm outcomes delivered.",
                  quote: '"Time is context, not the endpoint."',
                },
                {
                  icon: <Globe className="h-7 w-7 text-[#0A1F44]" />,
                  segment: "Partners & Cities",
                  pain: "Outputs are often real, but evidence is fragmented across spreadsheets, photos, emails, and reports.",
                  quote: '"Evidence is scattered across systems."',
                },
              ].map((card) => (
                <div
                  key={card.segment}
                  className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-bold text-[#0A1F44] mb-2">
                    {card.segment}
                  </h3>
                  <p className="text-slate-600 text-sm mb-3">{card.pain}</p>
                  <p className="text-slate-400 text-sm italic">{card.quote}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-2xl sm:text-3.5xl font-extrabold text-[#0A1F44] mt-10 tracking-tight">
              Synerxus{" "}
              <span className="relative inline-block">
                <span className="relative z-10">
                  Creates The Verified Evidence Layer.
                </span>
                <span className="absolute inset-x-0 bottom-1 h-[6px] bg-[#D4980C]/30 rounded-full -z-0" />
              </span>
            </p>
          </div>
        </section>

        {/* ── How It Works ── */}
        <HowItWorksSection
          activeStep={howItWorksStep}
          setActiveStep={setHowItWorksStep}
          sectionRef={howItWorksRef}
        />

        {/* ── Missing Infrastructure Stack ── */}
        {(() => {
          const GAP_LAYERS = [
            {
              id: "Level 5",
              label: "Causal Proof / RCT",
              sub: "Did the intervention cause the change?",
              dim: true,
              synerxus: false,
              status: "Outside normal Synerxus scope",
              statusBg: "bg-slate-100",
              statusText: "text-slate-500",
              badgeBg: "bg-slate-100",
              badgeText: "text-slate-400",
              cardActive: "border-blue-400 bg-blue-50 shadow-md",
              cardIdle: "border-slate-200 bg-slate-50/60 opacity-55",
              tools: ["Randomized evaluations", "Longitudinal studies", "Control group trials"],
              detail:
                "Level 5 causal proof establishes stronger attribution, often through randomized controlled trials. It is rigorous, but typically too slow and expensive for recurring ESG operations.",
            },
            {
              id: "Level 4",
              label: "Verified Evidence",
              sub: "Was the activity or output independently confirmed?",
              dim: false,
              synerxus: true,
              status: "Synerxus core product",
              statusBg: "bg-[#D4980C]/15",
              statusText: "text-[#D4980C]",
              badgeBg: "bg-[#D4980C]",
              badgeText: "text-white",
              cardActive:
                "border-[#D4980C]/70 bg-[#FFFBF0] shadow-[0_0_24px_rgba(212,152,12,0.18)]",
              cardIdle: "border-[#D4980C]/40 bg-[#FFFDF5]/80",
              tools: [],
              detail:
                "Synerxus delivers Level 4: verified evidence at operational scale. Partner-confirmed outputs are converted into structured evidence records that support reporting and assurance preparation without implying certification or causal proof.",
            },
            {
              id: "Level 3",
              label: "Outcome Support / Estimation",
              sub: "What likely changed?",
              dim: false,
              synerxus: false,
              status: "Supported where methodology exists",
              statusBg: "bg-[#D4980C]/10",
              statusText: "text-[#D4980C]",
              badgeBg: "bg-slate-100",
              badgeText: "text-slate-400",
              cardActive: "border-blue-400 bg-blue-50 shadow-md",
              cardIdle: "border-slate-200 bg-white",
              tools: ["Partner methodologies", "Beneficiary estimates", "Outcome models"],
              detail:
                "Outcome support estimates what likely changed, such as households reached or beneficiaries served. Synerxus can support this level when a credible partner methodology exists, but does not present estimates as causal proof.",
            },
            {
              id: "Level 2",
              label: "Output Tracking",
              sub: "What was delivered?",
              dim: false,
              synerxus: false,
              status: "Captured and structured",
              statusBg: "bg-blue-100",
              statusText: "text-blue-700",
              badgeBg: "bg-slate-100",
              badgeText: "text-slate-400",
              cardActive: "border-blue-400 bg-blue-50 shadow-md",
              cardIdle: "border-slate-200 bg-white",
              tools: ["Kits distributed", "Filters installed", "Workshops delivered"],
              detail:
                "Output tracking records what was delivered by a program or partner. Synerxus structures this information and links it to confirmation when it becomes verified evidence.",
            },
            {
              id: "Level 1",
              label: "Activity Reporting",
              sub: "Did people participate?",
              dim: false,
              synerxus: false,
              status: "Captured as input",
              statusBg: "bg-violet-100",
              statusText: "text-violet-700",
              badgeBg: "bg-slate-100",
              badgeText: "text-slate-400",
              cardActive: "border-blue-400 bg-blue-50 shadow-md",
              cardIdle: "border-slate-200 bg-white",
              tools: ["Volunteer hours", "Attendance", "Participation logs"],
              detail:
                "Activity reporting captures participation, including volunteer time and attendance. Synerxus treats this as useful input, not the endpoint of the evidence chain.",
            },
          ];
          const activeLayer = activeGapLayer
            ? (GAP_LAYERS.find((l) => l.id === activeGapLayer) ?? null)
            : null;
          // Desktop always shows a panel — fall back to Level 4 when nothing selected
          const desktopPanel = activeLayer ?? GAP_LAYERS[1];

          // Shared card content renderer
          const renderPanelContent = (
            layer: (typeof GAP_LAYERS)[0],
            showClose: boolean,
          ) => (
            <>
              {/* Coloured top bar */}
              <div
                className={`h-1 w-full ${layer.synerxus ? "bg-gradient-to-r from-[#D4980C]/60 via-[#D4980C] to-[#D4980C]/60" : "bg-gradient-to-r from-[#0A1F44]/20 via-[#0A1F44]/60 to-[#0A1F44]/20"}`}
              />
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`shrink-0 rounded-xl px-3 py-2 text-center min-w-[60px] ${layer.badgeBg} ${layer.badgeText}`}
                    >
                      <div className="text-[8px] font-bold uppercase tracking-wider leading-none opacity-70">
                        {layer.id.split(" ")[0]}
                      </div>
                      <div className="text-base font-extrabold leading-tight">
                        {layer.id.split(" ")[1]}
                      </div>
                    </div>
                    <div>
                      <div
                        className={`font-extrabold text-base leading-tight ${layer.synerxus ? "text-[#D4980C]" : "text-[#0A1F44]"}`}
                      >
                        {layer.label}
                      </div>
                      <span
                        className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${layer.statusBg} ${layer.statusText}`}
                      >
                        {layer.status}
                      </span>
                    </div>
                  </div>
                  {showClose && (
                    <button
                      onClick={() => setActiveGapLayer(null)}
                      className="shrink-0 mt-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p
                  className={`text-sm leading-relaxed mb-4 ${layer.synerxus ? "text-[#7a5200]" : "text-slate-600"}`}
                >
                  {layer.detail}
                </p>
                {layer.tools.length > 0 ? (
                  <div className="mb-5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-semibold">
                      Examples at this level
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {layer.tools.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-5 px-3 py-2.5 rounded-xl bg-[#FFFBF0] border border-[#D4980C]/30">
                    <p className="text-xs text-[#7a5200] font-medium">
                      Synerxus owns this Level 4 evidence layer.
                    </p>
                  </div>
                )}
                {layer.synerxus ? (
                  <a href="mailto:hello@synerxus.com?subject=Book a Verification Demo">
                    <Button
                      size="sm"
                      className="w-full bg-[#D4980C] hover:bg-[#B07F0A] text-white font-semibold rounded-xl"
                    >
                      Book a Verification Demo
                    </Button>
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      setActiveGapLayer(null);
                      setShowProcessBrief(true);
                    }}
                    className="w-full text-xs text-emerald-600 font-semibold hover:text-emerald-700 flex items-center justify-center gap-1.5 pt-1 transition-colors"
                  >
                    See how Synerxus fills the gap
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </>
          );

          return (
            <>
              <section className="py-10 md:py-14 bg-gradient-to-br from-white via-blue-50/40 to-slate-50">
                <div className="max-w-6xl mx-auto px-6 md:px-10">
                  {/* Section header */}
                  <div className="text-center mb-7">
                    <span className="inline-block px-4 py-1 rounded-full bg-[#0A1F44]/10 text-[#0A1F44] text-xs font-bold uppercase tracking-wider mb-3">
                      Evidence Ladder
                    </span>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A1F44]">
                      The Synerxus Evidence Ladder
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base mt-3 max-w-xl mx-auto">
                      Activity moves through output and outcome support before
                      it becomes verified evidence. Causal proof is a higher
                      bar outside normal operating scope.
                      <span className="block mt-1 text-slate-400 text-xs">
                        Click any layer to explore.
                      </span>
                    </p>
                  </div>

                  {/* Desktop: two-column layout */}
                  <div className="hidden lg:flex flex-row gap-12 items-start">
                    {/* Layer stack */}
                    <div className="flex-1 max-w-xl">
                      <div className="flex flex-col gap-1.5">
                        {GAP_LAYERS.map((layer, idx, arr) => {
                          const isActive = activeGapLayer === layer.id;
                          return (
                            <div key={layer.id} className="relative">
                              <button
                                onClick={() => setActiveGapLayer(layer.id)}
                                className={`w-full text-left flex items-center gap-4 px-5 py-3.5 rounded-2xl border transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1F44]/30 ${
                                  isActive
                                    ? layer.cardActive
                                    : layer.cardIdle +
                                      " hover:border-slate-300 hover:opacity-100"
                                } ${layer.dim && !isActive ? "opacity-55" : ""}`}
                              >
                                <div
                                  className={`shrink-0 rounded-xl px-3 py-2 text-center min-w-[68px] ${layer.badgeBg} ${layer.badgeText}`}
                                >
                                  <div className="text-[8px] font-bold uppercase tracking-wider leading-none opacity-70">
                                    {layer.id.split(" ")[0]}
                                  </div>
                                  <div className="text-lg font-extrabold leading-tight">
                                    {layer.id.split(" ")[1]}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={`font-bold text-sm leading-tight ${layer.synerxus ? "text-[#B07F0A]" : isActive ? "text-blue-800" : "text-[#0A1F44]"}`}
                                  >
                                    {layer.label}
                                  </div>
                                  <div className={`text-[11px] mt-0.5 leading-snug font-medium ${isActive && !layer.synerxus ? "text-blue-600" : isActive && layer.synerxus ? "text-[#92680A]" : "text-slate-400"}`}>
                                    {layer.sub}
                                  </div>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                  {layer.synerxus ? (
                                    <Logo size="xs" clickable={false} />
                                  ) : (
                                    <span
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive ? "bg-blue-100 text-blue-700" : `${layer.statusBg} ${layer.statusText}`}`}
                                    >
                                      {layer.status}
                                    </span>
                                  )}
                                  <svg
                                    className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${isActive ? "rotate-180 text-slate-500" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </div>
                              </button>
                              {idx < arr.length - 1 && (
                                <div className="flex justify-start pl-[38px] my-0.5">
                                  <div className="w-px h-2 bg-slate-200" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex items-center gap-2 pl-1">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                          Foundation
                        </span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                    </div>

                    {/* Sticky detail panel */}
                    <div className="w-80 xl:w-[340px] flex-shrink-0 sticky top-24">
                      <div
                        key={desktopPanel.id}
                        className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                          desktopPanel.synerxus
                            ? "border-emerald-300 bg-white shadow-[0_0_32px_rgba(5,150,105,0.10)]"
                            : "border-slate-200 bg-white shadow-lg"
                        }`}
                      >
                        {renderPanelContent(desktopPanel, false)}
                      </div>
                    </div>
                  </div>

                  {/* Mobile: single-column layer stack */}
                  <div className="lg:hidden max-w-xl mx-auto">
                    <div className="flex flex-col gap-1.5">
                      {GAP_LAYERS.map((layer, idx, arr) => {
                        const isActive = activeGapLayer === layer.id;
                        return (
                          <div key={layer.id} className="relative">
                            <button
                              onClick={() =>
                                setActiveGapLayer(isActive ? null : layer.id)
                              }
                              className={`w-full text-left flex items-center gap-4 px-5 py-3.5 rounded-2xl border transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1F44]/30 ${
                                isActive
                                  ? layer.cardActive
                                  : layer.cardIdle +
                                    " hover:border-slate-300 hover:opacity-100"
                              } ${layer.dim && !isActive ? "opacity-55" : ""}`}
                            >
                              <div
                                className={`shrink-0 rounded-xl px-3 py-2 text-center min-w-[68px] ${layer.badgeBg} ${layer.badgeText}`}
                              >
                                <div className="text-[8px] font-bold uppercase tracking-wider leading-none opacity-70">
                                  {layer.id.split(" ")[0]}
                                </div>
                                <div className="text-lg font-extrabold leading-tight">
                                  {layer.id.split(" ")[1]}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`font-bold text-sm leading-tight ${layer.synerxus ? "text-[#B07F0A]" : isActive ? "text-blue-800" : "text-[#0A1F44]"}`}
                                >
                                  {layer.label}
                                </div>
                                <div className={`text-[11px] mt-0.5 leading-snug font-medium ${isActive && !layer.synerxus ? "text-blue-600" : isActive && layer.synerxus ? "text-[#92680A]" : "text-slate-400"}`}>
                                  {layer.sub}
                                </div>
                              </div>
                              <div className="shrink-0">
                                {layer.synerxus ? (
                                  <Logo size="xs" clickable={false} />
                                ) : (
                                  <span
                                    className={`hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive ? "bg-blue-100 text-blue-700" : `${layer.statusBg} ${layer.statusText}`}`}
                                  >
                                    {layer.status}
                                  </span>
                                )}
                              </div>
                            </button>
                            {idx < arr.length - 1 && (
                              <div className="flex justify-start pl-[38px] my-0.5">
                                <div className="w-px h-2 bg-slate-200" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center gap-2 pl-1">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                        Foundation
                      </span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Mobile-only floating card overlay */}
              {activeLayer && (
                <div className="lg:hidden">
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                    onClick={() => setActiveGapLayer(null)}
                  />
                  {/* Floating card */}
                  <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm pointer-events-none">
                    <div
                      key={activeGapLayer}
                      className={`pointer-events-auto rounded-2xl border overflow-hidden shadow-2xl ${
                        activeLayer.synerxus
                          ? "border-emerald-300 bg-white shadow-[0_8px_40px_rgba(5,150,105,0.22)]"
                          : "border-slate-200 bg-white shadow-[0_8px_40px_rgba(10,31,68,0.18)]"
                      }`}
                    >
                      {renderPanelContent(activeLayer, true)}
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* ── Section 3: Solution ── */}
        <section className="py-10 md:py-16 bg-blue-50">
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A1F44] mb-4">
                Verify Activity and Outputs
              </h2>
              <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto">
                Four capabilities that turn ESG activity into stronger,
                audit-ready evidence.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                {
                  icon: <Clock className="h-6 w-6 text-blue-600" />,
                  title: "Partner-Confirmed Outputs",
                  desc: "Authorized partners confirm outputs through a lightweight verification workflow.",
                  bg: "bg-blue-100",
                },
                {
                  icon: <Lock className="h-6 w-6 text-[#0A1F44]" />,
                  title: "Tamper-Evident Audit Trails",
                  desc: "Structured Evidence Objects provide defensible sampling for regulators and auditors.",
                  bg: "bg-slate-100",
                },
                {
                  icon: <BarChart2 className="h-6 w-6 text-emerald-600" />,
                  title: "Framework Alignment Support",
                  desc: "Structured evidence can support relevant GRI, SASB, ESRS, ISAE 3000, and SDG reporting workflows.",
                  bg: "bg-emerald-100",
                },
                {
                  icon: <AlertTriangle className="h-6 w-6 text-[#D4980C]" />,
                  title: "Assurance Boundary Discipline",
                  desc: "Synerxus supports reporting and assurance preparation without replacing auditors or claiming causal attribution.",
                  bg: "bg-[#D4980C]/10",
                },
              ].map((feat) => (
                <div
                  key={feat.title}
                  className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow flex gap-4"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${feat.bg} flex items-center justify-center flex-shrink-0`}
                  >
                    {feat.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0A1F44] mb-1">
                      {feat.title}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 4: Workflow ── */}
        <section className="py-10 md:py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6 md:px-10">
            <div className="text-center mb-10 md:mb-14">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A1F44] mb-4">
                A Complete Chain of Custody
              </h2>
              <p className="text-slate-500 text-base md:text-lg">
                Four steps from delivery to disclosure — with verification at
                every stage.
              </p>
            </div>

            {/* Mobile: vertical timeline */}
            <div className="md:hidden flex flex-col">
              {CUSTODY_STEPS.map((step, i) => {
                const { Icon } = step;
                const isActive = custodyActive === i;
                return (
                  <div key={step.num} className="flex gap-4">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                        style={{ backgroundColor: step.color }}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      {i < CUSTODY_STEPS.length - 1 && (
                        <div
                          className="w-0.5 flex-1 my-1 rounded-full opacity-25"
                          style={{
                            backgroundColor: step.color,
                            minHeight: "28px",
                          }}
                        />
                      )}
                    </div>
                    <div
                      className={
                        i < CUSTODY_STEPS.length - 1 ? "pb-6 flex-1" : "flex-1"
                      }
                    >
                      <button
                        onClick={() => setCustodyActive(isActive ? null : i)}
                        className="w-full text-left"
                      >
                        <span
                          className="text-[10px] font-bold tracking-widest uppercase"
                          style={{ color: step.color }}
                        >
                          {step.num}
                        </span>
                        <h3 className="font-extrabold text-[#0A1F44] text-sm leading-snug mt-0.5 mb-1">
                          {step.label}
                        </h3>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          {step.sub}
                        </p>
                      </button>
                      {isActive && (
                        <p
                          className="mt-2 text-xs leading-relaxed rounded-xl px-3 py-2 border"
                          style={{
                            color: step.color,
                            backgroundColor: step.bg,
                            borderColor: step.color + "33",
                          }}
                        >
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: circular flow diagram */}
            <div className="hidden md:block">
              {/* Grid with SVG overlay */}
              <div className="relative">
                {/* SVG curved arrows — sits between grid and cards */}
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 1 }}
                  aria-hidden="true"
                >
                  {/* 01(TL)→02(BL): curved down-left */}
                  <path
                    d="M 28 36 Q 14 50 28 64"
                    fill="none"
                    stroke="#0D9488"
                    strokeWidth="0.8"
                    strokeDasharray="2.5 1.5"
                    opacity="0.6"
                    markerEnd="url(#arrow-teal)"
                  />
                  {/* 02(BL)→03(BR): curved across bottom */}
                  <path
                    d="M 36 72 Q 50 84 64 72"
                    fill="none"
                    stroke="#EA580C"
                    strokeWidth="0.8"
                    strokeDasharray="2.5 1.5"
                    opacity="0.6"
                    markerEnd="url(#arrow-orange)"
                  />
                  {/* 03(BR)→04(TR): curved up-right */}
                  <path
                    d="M 72 64 Q 86 50 72 36"
                    fill="none"
                    stroke="#DB2777"
                    strokeWidth="0.8"
                    strokeDasharray="2.5 1.5"
                    opacity="0.6"
                    markerEnd="url(#arrow-pink)"
                  />
                  {/* 04(TR)→01(TL): curved across top */}
                  <path
                    d="M 64 28 Q 50 16 36 28"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="0.8"
                    strokeDasharray="2.5 1.5"
                    opacity="0.6"
                    markerEnd="url(#arrow-blue)"
                  />
                  <defs>
                    <marker
                      id="arrow-teal"
                      markerWidth="4"
                      markerHeight="4"
                      refX="3"
                      refY="2"
                      orient="auto"
                    >
                      <path d="M0,0 L0,4 L4,2 z" fill="#0D9488" opacity="0.7" />
                    </marker>
                    <marker
                      id="arrow-orange"
                      markerWidth="4"
                      markerHeight="4"
                      refX="3"
                      refY="2"
                      orient="auto"
                    >
                      <path d="M0,0 L0,4 L4,2 z" fill="#EA580C" opacity="0.7" />
                    </marker>
                    <marker
                      id="arrow-pink"
                      markerWidth="4"
                      markerHeight="4"
                      refX="3"
                      refY="2"
                      orient="auto"
                    >
                      <path d="M0,0 L0,4 L4,2 z" fill="#DB2777" opacity="0.7" />
                    </marker>
                    <marker
                      id="arrow-blue"
                      markerWidth="4"
                      markerHeight="4"
                      refX="3"
                      refY="2"
                      orient="auto"
                    >
                      <path d="M0,0 L0,4 L4,2 z" fill="#2563EB" opacity="0.7" />
                    </marker>
                  </defs>
                </svg>

                {/* Central badge */}
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white border-2 border-slate-200 shadow-lg flex items-center justify-center"
                  style={{ zIndex: 2 }}
                >
                  <ShieldCheck className="h-7 w-7 text-[#0A1F44]" />
                </div>

                {/* 2×2 grid — order: TL, TR, BL, BR */}
                <div
                  className="grid grid-cols-2 gap-10"
                  style={{ zIndex: 3, position: "relative" }}
                >
                  {[
                    CUSTODY_STEPS[0],
                    CUSTODY_STEPS[3],
                    CUSTODY_STEPS[1],
                    CUSTODY_STEPS[2],
                  ].map((step, gridIdx) => {
                    const originalIdx = [0, 3, 1, 2][gridIdx];
                    const { Icon } = step;
                    const isActive = custodyActive === originalIdx;
                    return (
                      <button
                        key={step.num}
                        onClick={() =>
                          setCustodyActive(isActive ? null : originalIdx)
                        }
                        className="text-left rounded-2xl border p-6 transition-all duration-200 focus:outline-none group"
                        style={{
                          backgroundColor: isActive ? step.bg : "#F8FAFC",
                          borderColor: isActive ? step.color : "#E2E8F0",
                          borderWidth: isActive ? "2px" : "1px",
                          boxShadow: isActive
                            ? `0 0 0 3px ${step.color}22, 0 8px 24px ${step.color}18`
                            : "0 1px 4px rgba(0,0,0,0.06)",
                          transform: isActive ? "scale(1.02)" : "scale(1)",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.boxShadow =
                              `0 4px 20px ${step.color}28`;
                            (e.currentTarget as HTMLElement).style.borderColor =
                              step.color + "66";
                            (e.currentTarget as HTMLElement).style.transform =
                              "scale(1.015)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.boxShadow =
                              "0 1px 4px rgba(0,0,0,0.06)";
                            (e.currentTarget as HTMLElement).style.borderColor =
                              "#E2E8F0";
                            (e.currentTarget as HTMLElement).style.transform =
                              "scale(1)";
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
                            style={{ backgroundColor: step.color }}
                          >
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span
                            className="text-[11px] font-black tracking-widest uppercase"
                            style={{ color: step.color }}
                          >
                            {step.num}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-[#0A1F44] text-base leading-snug mb-2">
                          {step.label}
                        </h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                          {step.sub}
                        </p>
                        {isActive && (
                          <p
                            className="mt-4 text-sm leading-relaxed rounded-xl px-3 py-3 border"
                            style={{
                              color: step.color,
                              backgroundColor: step.bg,
                              borderColor: step.color + "33",
                            }}
                          >
                            {step.detail}
                          </p>
                        )}
                        {!isActive && (
                          <p
                            className="mt-3 text-xs font-medium"
                            style={{ color: step.color + "99" }}
                          >
                            Click to learn more →
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 5: Audience ── */}
        <section id="for-teams" className="py-10 md:py-16 bg-blue-50">
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A1F44] mb-4">
                Built for Every Organization
                <br />
                That Needs Stronger Evidence
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: <BarChart2 className="h-6 w-6 text-blue-700" />,
                  audience: "ESG Teams",
                  benefit:
                    "Structured evidence records that support reporting and assurance preparation across relevant frameworks.",
                  bg: "bg-blue-100",
                },
                {
                  icon: <Users className="h-6 w-6 text-[#0A1F44]" />,
                  audience: "Corporate Volunteering",
                  benefit:
                    "Move beyond hours logged by linking volunteer time to partner-confirmed outputs.",
                  bg: "bg-slate-100",
                },
                {
                  icon: <ShieldCheck className="h-6 w-6 text-emerald-700" />,
                  audience: "Implementing Partners",
                  benefit:
                    "Confirm delivered outputs and turn fragmented documentation into structured evidence.",
                  bg: "bg-emerald-100",
                },
                {
                  icon: <Globe className="h-6 w-6 text-sky-700" />,
                  audience: "Cities & Multilaterals",
                  benefit:
                    "Comparable, verified data across pilots, programs, and geographies.",
                  bg: "bg-sky-100",
                },
                {
                  icon: <HardHat className="h-6 w-6 text-[#D4980C]" />,
                  audience: "Engineering & Infrastructure Firms",
                  benefit:
                    "Verify local hiring commitments and community impact against project targets.",
                  bg: "bg-[#D4980C]/10",
                },
                {
                  icon: <Building2 className="h-6 w-6 text-violet-700" />,
                  audience: "Impact Investors",
                  benefit:
                    "Portfolio-wide evidence records that show whether supported programs delivered reported outputs.",
                  bg: "bg-violet-100",
                },
              ].map((card) => (
                <div
                  key={card.audience}
                  className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div
                    className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center mb-3`}
                  >
                    {card.icon}
                  </div>
                  <h3 className="font-bold text-[#0A1F44] mb-2">
                    {card.audience}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {card.benefit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 6: Evidence Object ── */}
        <EvidenceObjectSection />

        {/* ── Section 7: Impact Metrics ── */}
        <section
          id="impact-metrics"
          className="py-10 md:py-14 bg-[#0A1F44] border-t border-blue-800"
        >
          <div className="max-w-6xl mx-auto px-6 md:px-10 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-8">
              Verified Impact. Measurable Evidence.
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mb-10">
              {(
                [
                  {
                    target: publicStats?.totalVerifiedOutcomes ?? null,
                    suffix: "",
                    label: "Verified Records",
                  },
                  {
                    target: publicStats?.totalVerifiedHours ?? null,
                    suffix: "",
                    label: "Supporting Hours",
                  },
                  {
                    target:
                      (publicStats?.totalBeneficiaries ?? 0) > 0
                        ? publicStats!.totalBeneficiaries
                        : null,
                    suffix: "",
                    label: "Partner-Reported Reach",
                  },
                  {
                    target: publicStats?.verificationRate ?? null,
                    suffix: "%",
                    label: "Verification Rate",
                  },
                  {
                    target: publicStats?.activeNGOs ?? null,
                    suffix: "",
                    label: "Active Partners",
                  },
                  {
                    target: publicStats
                      ? publicStats.uniqueSdgsTracked > 0
                        ? publicStats.uniqueSdgsTracked
                        : 17
                      : null,
                    suffix: "",
                    label: "UN SDGs Tracked",
                  },
                ] as { target: number | null; suffix: string; label: string }[]
              ).map((stat, i) => (
                <div key={stat.label} className="flex flex-col items-center">
                  <span className="text-3xl md:text-4xl font-extrabold text-[#D4980C] mb-1">
                    <LoopingCounter
                      target={stat.target}
                      suffix={stat.suffix}
                      delay={i * 200}
                    />
                  </span>
                  <span className="text-blue-200 text-xs md:text-sm font-medium leading-snug">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => setShowSampleReport(true)}
              className="border-[#D4980C] text-[#D4980C] hover:bg-[#D4980C] hover:text-[#0A1F44] font-semibold rounded-xl px-6 cursor-pointer"
            >
              See a Sample Verified Impact Report
            </Button>
          </div>
        </section>

        {/* ── SDG Mapping Section ── */}
        <section className="py-10 md:py-12 bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-6 md:px-10">
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-1 rounded-full bg-[#0A1F44]/10 text-[#0A1F44] text-xs font-bold uppercase tracking-wider mb-3">
                UN Sustainable Development Goals
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0A1F44] mb-3">
                Every Verified Outcome, Mapped to the UN SDGs
              </h2>
              <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto">
                Synerxus tags each partner-confirmed output to relevant SDGs,
                creating a traceable chain from ground-level delivery to ESG
                reporting workflows.
              </p>
              <p className="text-slate-400 text-xs mt-2">
                Click any goal to learn more.
              </p>
            </div>

            {/* SDG icons — desktop: two centered rows (9+8), mobile/tablet: 4-col grid */}
            {(() => {
              const renderIcon = (n: number) => {
                const goal = SDG_GOALS[n];
                const icon = UN_SDG_ICONS[n];
                const isActive = activeSdg === n;
                return (
                  <button
                    key={n}
                    onClick={() => setActiveSdg(isActive ? null : n)}
                    className={`relative rounded-xl overflow-hidden focus:outline-none transition-all duration-150 flex-shrink-0 ${
                      isActive
                        ? "scale-105 shadow-xl"
                        : "hover:scale-105 hover:shadow-md opacity-90 hover:opacity-100"
                    }`}
                    style={
                      isActive
                        ? {
                            outline: `3px solid ${goal.color}`,
                            outlineOffset: "3px",
                          }
                        : {}
                    }
                    aria-label={`SDG ${n}: ${goal.name}`}
                  >
                    <img
                      src={icon}
                      alt={`SDG ${n}: ${goal.name}`}
                      className="w-full h-auto block"
                      loading="lazy"
                    />
                    {isActive && (
                      <div
                        className="absolute inset-x-0 bottom-0 h-1"
                        style={{ backgroundColor: goal.color }}
                      />
                    )}
                  </button>
                );
              };
              return (
                <>
                  {/* Desktop: two centered rows */}
                  <div className="hidden lg:flex flex-col items-center gap-3 mb-6">
                    <div className="flex gap-3">
                      {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                        <div key={n} className="w-20">
                          {renderIcon(n)}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      {Array.from({ length: 8 }, (_, i) => i + 10).map((n) => (
                        <div key={n} className="w-20">
                          {renderIcon(n)}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Mobile / tablet: 4-col then 6-col grid */}
                  <div className="lg:hidden grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3 mb-6">
                    {Array.from({ length: 17 }, (_, i) => i + 1).map(
                      renderIcon,
                    )}
                  </div>
                </>
              );
            })()}

            {/* Info panel — desktop: inline; mobile: floating overlay */}
            {activeSdg !== null &&
              (() => {
                const goal = SDG_GOALS[activeSdg];
                const panelContent = (
                  <div className="flex items-start gap-4">
                    <img
                      src={UN_SDG_ICONS[activeSdg]}
                      alt={`SDG ${activeSdg}`}
                      className="w-16 h-16 rounded-xl flex-shrink-0 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: goal.color }}
                        >
                          SDG {activeSdg}
                        </span>
                        <h3 className="font-extrabold text-[#0A1F44] text-base">
                          {goal.name}
                        </h3>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed mb-3">
                        {goal.details}
                      </p>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Key Targets
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {goal.targets.map((t) => (
                            <li
                              key={t}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-white border font-medium text-slate-600"
                              style={{ borderColor: goal.color + "55" }}
                            >
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveSdg(null)}
                      className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
                return (
                  <>
                    {/* Desktop: inline panel */}
                    <div
                      className="hidden lg:block rounded-2xl border p-5 mb-6 transition-all duration-200"
                      style={{
                        borderColor: goal.color + "55",
                        backgroundColor: goal.color + "0D",
                      }}
                    >
                      {panelContent}
                    </div>

                    {/* Mobile: floating overlay */}
                    <div className="lg:hidden">
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                        onClick={() => setActiveSdg(null)}
                      />
                      {/* Floating card */}
                      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm">
                        <div
                          className="rounded-2xl border bg-white shadow-2xl overflow-hidden"
                          style={{ borderColor: goal.color + "55" }}
                        >
                          {/* Coloured top bar */}
                          <div
                            className="h-1 w-full"
                            style={{ backgroundColor: goal.color }}
                          />
                          <div className="p-5">{panelContent}</div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

            <p className="text-center text-xs text-slate-400">
              Every Synerxus-verified record carries an SDG tag and structured
              framework context for GRI, SASB, and ESRS support where
              applicable.
            </p>
          </div>
        </section>

        {/* ── Section 8: Case Studies ── */}
        <section className="py-10 md:py-16 bg-blue-50">
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A1F44] mb-4">
                Verified Impact in Action
              </h2>
              <p className="text-slate-500 text-base md:text-lg max-w-xl mx-auto">
                Real programs. Real verification. Real evidence for ESG
                reporting.
              </p>
              <span className="inline-block mt-3 text-xs text-slate-400 border border-slate-200 rounded-full px-3 py-0.5">
                Sample data — illustrative of platform capabilities
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Green Future Alliance",
                  tag: "Environmental",
                  desc: "Watershed restoration verified across 7 active projects, with structured evidence delivered to corporate ESG teams.",
                  tagColor: "bg-emerald-100 text-emerald-800",
                  sdgs: [
                    { n: 6, color: "#26BDE2", name: "Clean Water" },
                    { n: 15, color: "#56C02B", name: "Life on Land" },
                  ],
                },
                {
                  title: "Solar Village Initiative",
                  tag: "Energy Access",
                  desc: "Energy access outcomes confirmed with full audit trails, mapped to SDG 7, WEF Planet pillar and GRI 302 — audit-ready globally.",
                  tagColor: "bg-[#D4980C]/10 text-[#D4980C]",
                  sdgs: [
                    { n: 7, color: "#FCC30B", name: "Clean Energy" },
                    { n: 1, color: "#E5243B", name: "No Poverty" },
                  ],
                },
                {
                  title: "Urban Green Corridors",
                  tag: "City-Level",
                  desc: "City-level environmental outcomes verified in real time across 3 municipalities — enabling comparable, cross-pilot ESG reporting.",
                  tagColor: "bg-blue-100 text-blue-800",
                  sdgs: [
                    { n: 11, color: "#FD9D24", name: "Sustainable Cities" },
                    { n: 13, color: "#3F7E44", name: "Climate Action" },
                  ],
                },
              ].map((study) => (
                <div
                  key={study.title}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-lg transition-shadow"
                >
                  <div className="h-3 bg-[#0A1F44]" />
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${study.tagColor}`}
                      >
                        {study.tag}
                      </span>
                      <div className="flex gap-1">
                        {study.sdgs.map((sdg) => (
                          <span
                            key={sdg.n}
                            title={`SDG ${sdg.n}: ${sdg.name}`}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-[10px] shadow-sm"
                            style={{ backgroundColor: sdg.color }}
                          >
                            {sdg.n}
                          </span>
                        ))}
                      </div>
                    </div>
                    <h3 className="font-bold text-[#0A1F44] text-lg mb-2">
                      {study.title}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      {study.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing Section ── */}
        <section
          id="pricing"
          className="py-10 md:py-16 bg-slate-50 border-t border-slate-100"
          aria-labelledby="pricing-title"
        >
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            {/* Header */}
            <div className="text-center mb-10">
              <h2
                id="pricing-title"
                className="text-2xl sm:text-3xl font-extrabold text-[#0A1F44] mb-3"
              >
                Verify Impact with Synerxus
              </h2>
              <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                Join our verified impact pilot and experience a verification
                layer for ESG, CSR, corporate volunteering, and social value
                programs.
              </p>
            </div>

            <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 leading-relaxed">
              <strong>Boundary statement:</strong> Synerxus provides
              structured, independently confirmed evidence that supports
              reporting and assurance preparation. Synerxus does not replace
              independent assurance providers, provide formal assurance
              opinions, guarantee regulatory compliance, or establish causal
              attribution.
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left column — Value proposition */}
              <div className="space-y-8">
                {/* The Verification Gap */}
                <div>
                  <h3 className="text-sm font-extrabold text-[#0A1F44] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    The Verification Gap
                  </h3>
                  <ul className="space-y-3">
                    {[
                      "Many ESG and CSR claims still rely on self-reported activity data",
                      'When auditors ask "How do you know this outcome actually occurred?", organizations have no defensible answer',
                      "CSRD and related sustainability reporting requirements are increasing pressure on companies to produce stronger, assurance-ready evidence",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-sm text-slate-600 leading-relaxed">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What You Get */}
                <div>
                  <h3 className="text-sm font-extrabold text-[#0A1F44] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#0A1F44] flex-shrink-0" />
                    What You Get
                  </h3>
                  <ul className="space-y-2.5">
                    {[
                      "Partner-confirmed output evidence",
                      "Volunteer time linked to verified outputs",
                      "Structured evidence records",
                      "Framework alignment support",
                      "Reporting and assurance preparation support",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-600 leading-relaxed">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pilot Benefits */}
                <div>
                  <h3 className="text-sm font-extrabold text-[#0A1F44] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#0A8C6A] flex-shrink-0" />
                    Pilot Benefits
                  </h3>
                  <ul className="space-y-2.5">
                    {[
                      "Full implementation support from our team",
                      "Dedicated onboarding for authorized partners",
                      "Priority access to new features and capabilities",
                      "Evidence preparation support for relevant reporting workflows",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-[#0A8C6A] flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-600 leading-relaxed">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right column — Pilot invitation */}
              <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col gap-6 shadow-sm">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#0A1F44] mb-3 leading-snug">
                    Join Our Verified Impact Pilot
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Be among the first to deploy partner-confirmed outputs with full
                    implementation support. We'll work with you to validate your
                    verification workflow and prepare evidence for reporting and
                    assurance review.
                  </p>
                </div>

                {/* Trust signals */}
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-5 py-4 space-y-2.5">
                  {[
                    {
                      icon: <Clock className="h-4 w-4 text-[#0A8C6A]" />,
                      text: "Operating targets configured during onboarding",
                    },
                    {
                      icon: <ShieldCheck className="h-4 w-4 text-[#0A8C6A]" />,
                      text: "CSRD · ESRS · GRI · SASB support where applicable",
                    },
                    {
                      icon: <FileCheck className="h-4 w-4 text-[#0A8C6A]" />,
                      text: "Tamper-evident audit trail from day one",
                    },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-3">
                      <span className="flex-shrink-0">{icon}</span>
                      <span className="text-xs text-slate-600">{text}</span>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-3 pt-1">
                  <Button
                    onClick={() => setPricingPlan("pilot")}
                    className="w-full bg-[#0A8C6A] hover:bg-[#087a5c] text-white font-bold rounded-xl text-sm py-3 shadow"
                  >
                    Apply for Pilot
                  </Button>
                  <a
                    href="/Synerxus-Verification-Methodology-v1.1.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0A1F44] text-xs font-medium underline underline-offset-2 hover:text-[#0A8C6A] transition-colors text-center"
                  >
                    View our verification methodology
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 9: Final CTA ── */}
        <section className="bg-[#0A1F44] relative overflow-hidden">
          {/* Background image — right half, fades into navy on the left */}
          <div className="hidden md:block absolute inset-y-0 right-0 w-1/2 pointer-events-none">
            <img
              src="/optimized/hero-sustainability.webp"
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A1F44] via-[#0A1F44]/50 to-transparent" />
          </div>

          {/* Foreground content — always in front, never obstructed */}
          <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-14 py-12 md:py-20">
            <div className="max-w-xl">
              <span className="inline-block px-3 py-1 rounded-full bg-[#D4980C]/20 text-[#D4980C] text-xs font-bold uppercase tracking-wider mb-5">
                Get Started
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-5 leading-tight">
                Ready to Move Beyond{" "}
                <span className="whitespace-nowrap">Self-Reported Impact?</span>
              </h2>
              <p className="text-blue-200 text-base md:text-lg mb-10 leading-relaxed">
                Join the organizations building audit-ready ESG evidence — not
                just impact narratives.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => setPricingPlan("demo")}
                  className="bg-[#D4980C] hover:bg-[#B07F0A] text-[#0A1F44] font-bold px-8 rounded-xl shadow-lg"
                >
                  Book Demo
                </Button>
                <Button
                  size="lg"
                  onClick={openJoinNetwork}
                  className="bg-[#D4980C] hover:bg-[#B07F0A] text-[#0A1F44] font-bold px-8 rounded-xl shadow-lg border border-[#D4980C]/40"
                >
                  Join Network
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section
          id="faq"
          className="py-10 md:py-16 bg-white border-t border-slate-100"
        >
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="text-center mb-10">
              <span className="inline-block px-4 py-1 rounded-full bg-[#0A1F44]/10 text-[#0A1F44] text-xs font-bold uppercase tracking-wider mb-3">
                FAQ
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0A1F44]">
                Common Questions
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-10">
              {[
                {
                  q: "Does Synerxus replace our existing activity systems?",
                  a: "No. Synerxus is the independent verification layer between existing activity systems and ESG reporting workflows. It adds partner-confirmed outputs and structured, audit-ready evidence on top of records you already manage.",
                },
                {
                  q: "Who independently confirms the outcomes?",
                  a: "Authorized partners confirm whether an output is suitable for verified evidence use. Synerxus records the confirmed result as structured evidence without replacing the independent judgment of auditors or assurance providers.",
                },
                {
                  q: "Which reporting frameworks does Synerxus support?",
                  a: "Synerxus evidence can support reporting and assurance preparation across relevant frameworks, including GRI Standards, SASB, CSRD/ESRS, ISAE 3000 preparation workflows, and UN SDGs. Framework references indicate alignment support, not certification or a compliance guarantee. TCFD is relevant only where the program has climate-related community or workforce evidence.",
                },
                {
                  q: "What does an evidence object contain?",
                  a: "Each Evidence Object presents the verified outcome, hours as supporting context, authorized verifier, timestamp, general region, and framework alignment. It is designed to be traceable for review without exposing proprietary verification mechanics.",
                },
                {
                  q: "How long does verification typically take?",
                  a: "Verification timing depends on partner response and program context. Enterprise deployments can set operating targets for response windows during onboarding.",
                },
                {
                  q: "Can we use Synerxus across multiple partners and geographies?",
                  a: "Yes. Synerxus is built for multi-program, multi-geography deployment. Each authorized partner is onboarded once and can confirm outputs across the corporate programs they are linked to. Reports aggregate verified data across partners, SDGs, and geographies in one dashboard.",
                },
                {
                  q: "How does Synerxus integrate with our existing systems?",
                  a: "Synerxus is designed as an additive verification layer. It can support API or CSV-based workflows that append verified outcome evidence to existing activity records. Integration scope, security review, and data handling requirements are confirmed during enterprise onboarding.",
                },
                {
                  q: "What is WEF SCM?",
                  a: "WEF SCM stands for the World Economic Forum Stakeholder Capitalism Metrics, a sustainability measurement framework developed with major accounting firms. Synerxus can organize verified evidence against WEF SCM themes where applicable, while final reporting and assurance conclusions remain the responsibility of the customer and its advisors.",
                },
                {
                  q: "Does Synerxus support EU sustainability reporting (CSRD/ESRS)?",
                  a: "Synerxus evidence can support CSRD/ESRS reporting preparation where verified outcomes are relevant to required disclosures. It does not determine materiality, issue assurance opinions, or guarantee regulatory compliance.",
                },
                {
                  q: "What is GRI?",
                  a: "GRI stands for the Global Reporting Initiative, a widely used sustainability reporting framework. Synerxus verified outcomes can support GRI-aligned disclosure preparation when the underlying activity is relevant to the selected GRI topic.",
                },
                {
                  q: "What is SASB?",
                  a: "SASB refers to industry-specific sustainability disclosure topics used by investors and reporting teams. Synerxus can help organize verified outcome evidence against relevant SASB themes where applicable.",
                },
                {
                  q: "What is TCFD?",
                  a: "TCFD stands for the Task Force on Climate-related Financial Disclosures, a framework developed by the Financial Stability Board to guide companies in reporting on climate-related risks and opportunities. TCFD covers Governance, Strategy, Risk Management, and Metrics & Targets. While Synerxus is primarily focused on social impact (the 'S' in ESG), our evidence objects map to TCFD where climate-related community and workforce outcomes are involved, and our governance documentation supports TCFD's governance pillar reporting.",
                },
                {
                  q: "What are the UN SDGs?",
                  a: "The UN Sustainable Development Goals are 17 global goals adopted by UN member states. Synerxus can show SDG alignment for verified outcomes where there is a reasonable relationship between the activity and the goal.",
                },
                {
                  q: "What is ISAE 3000?",
                  a: "ISAE 3000 is a standard used by external auditors for assurance over non-financial information. Synerxus provides independently confirmed, timestamped, structured evidence that can support ISAE 3000 assurance preparation. Formal assurance still requires an independent assurance provider.",
                },
                {
                  q: "What happens if a partner rejects a verification request?",
                  a: "If a verifier flags an output as inaccurate or unverifiable, it is marked as rejected and excluded from verified evidence packs. Rejected records are logged separately for transparency. The submitting program manager is notified and can resubmit with additional evidence.",
                },
                {
                  q: "Who verifies the outcomes — do verifiers work for Synerxus?",
                  a: "No. Verifiers are independent of Synerxus and independent of the person submitting the outcome. They may be NGO staff, city teams, implementing partners, approved program operators, beneficiaries, or employer representatives who are directly involved in the activity. Synerxus facilitates the request and records the result; we do not influence or participate in the verification decision.",
                },
                {
                  q: "Does Synerxus provide formal ESG assurance?",
                  a: "No. Synerxus provides structured, audit-ready evidence and supports assurance preparation. It does not replace independent assurance providers or guarantee regulatory compliance.",
                },
              ]
                .slice(0, showAllFaq ? undefined : 6)
                .map(({ q, a }, i) => (
                  <details
                    key={i}
                    className="group py-5 border-b border-slate-100"
                  >
                    <summary className="flex items-start justify-between gap-4 cursor-pointer list-none">
                      <span className="font-semibold text-[#0A1F44] text-sm md:text-base leading-snug">
                        {q}
                      </span>
                      <span className="flex-shrink-0 mt-0.5 text-slate-400 group-open:rotate-180 transition-transform duration-200">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                        >
                          <path
                            d="M4.5 6.75L9 11.25L13.5 6.75"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </summary>
                    <p className="mt-3 text-slate-500 text-sm leading-relaxed">
                      {a}
                    </p>
                  </details>
                ))}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => setShowAllFaq(!showAllFaq)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-[#0A1F44]/20 text-[#0A1F44] text-sm font-semibold hover:bg-[#0A1F44]/5 transition-colors"
              >
                {showAllFaq ? (
                  <>
                    Show Less
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4 10L8 6L12 10"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                ) : (
                  <>
                    See More Questions
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <Footer />
      </main>

      {/* Process Brief Modal */}
      {showProcessBrief && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setShowProcessBrief(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowProcessBrief(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0A1F44]">
                  How Synerxus Works
                </h3>
                <p className="text-xs text-slate-500">
                  A brief overview of our verification process
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0A1F44] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0A1F44]">
                    Real-Time Data Collection
                  </p>
                  <p className="text-xs text-slate-500">
                    Impact data is captured at the point of service — not
                    reconstructed after the fact. Each outcome is tagged to its
                    relevant UN SDG (e.g. tutoring sessions → SDG 4: Quality
                    Education).
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0A1F44] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0A1F44]">
                    Partner-Confirmed Outputs
                  </p>
                  <p className="text-xs text-slate-500">
                    Outputs are independently confirmed by authorized partners
                    through a lightweight verification workflow. Partners can
                    confirm or refine the SDG tag before the record is locked.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0A1F44] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0A1F44]">
                    UN SDG-Tagged Audit Trail
                  </p>
                  <p className="text-xs text-slate-500">
                    Verified data is locked and timestamped with its SDG
                    mapping, producing audit-ready evidence that can support
                    relevant SDG, GRI, SASB, and ESRS workflows.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => navigate("/signup/corporate")}
              className="w-full bg-[#D4980C] hover:bg-[#B07F0A] text-white font-semibold rounded-xl"
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
