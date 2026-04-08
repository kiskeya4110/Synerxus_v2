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
  Lock,
  AlertTriangle,
  CheckCircle,
  Users,
  Building2,
  Globe,
  HardHat,
  ArrowRight,
  Loader2,
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
import esgVerificationProcessImg from "@assets/Copilot_20260407_120309_1775588622996.png";
import heroSlide1 from "@assets/How_ESG_Talent_Retention_1775528985996.png";
import heroSlide2 from "@assets/Corporate_data_presentation_1775529421335.png";
import heroSlide3 from "@assets/Corporate_sustainabi_1775529421337.png";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";
import { SDG_GOALS } from "@shared/sdg-goals";

const HERO_SLIDES = [
  heroSlide1,
  "/hero-volunteer-hand.png",
  "/hero-aid-relief.png",
  heroSlide2,
  "/hero-village-build.png",
  "/hero-coaching.png",
  heroSlide3,
  "/hero-community.png",
  "/hero-construction.png",
  "/hero-construction-tutorial.png",
  "/hero-planters.png",
];

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
    label: "Volunteer Logs Activity",
    sub: "Outcomes & hours recorded · in-field volunteer work",
    color: "#1D4ED8",
    x: 11,
    y: 55,
    detail:
      "Volunteers record outcomes, hours, skills applied, and beneficiary counts in real time via mobile — timestamped and linked to a specific project the moment it happens.",
    mobileImage: undefined,
  },
  {
    label: "NGO Verification Request",
    sub: "SMS / App notification sent · review link provided",
    color: "#D4980C",
    x: 29,
    y: 55,
    detail:
      "The assigned NGO partner receives an instant verification request by SMS or in-app notification. A review link is provided — no platform login required to confirm.",
    mobileImage: undefined,
  },
  {
    label: "One-Tap Verification",
    sub: "NGO confirms results · verified instantly",
    color: "#059669",
    x: 50,
    y: 55,
    detail:
      "The NGO verifier confirms both the outcome and hours in under 15 seconds via a single tap — no paperwork, no back-and-forth. Verification is captured the moment it happens.",
    mobileImage: undefined,
  },
  {
    label: "Immutable Audit Trail",
    sub: "Secure records captured · timestamp & geolocation",
    color: "#0A1F44",
    x: 71,
    y: 55,
    detail:
      "Every verified event is sealed into an immutable audit record — verifier identity, device ID, GPS coordinates, timestamp, and SDG mapping captured automatically for CSRD compliance.",
    mobileImage: undefined,
  },
  {
    label: "Impact Report Delivered",
    sub: "PDF sent via SMS & email · audit-ready report",
    color: "#7C3AED",
    x: 89,
    y: 55,
    detail:
      "Corporate ESG teams receive a branded, audit-ready PDF impact report — every outcome traceable to a direct NGO confirmation, ready for CSRD and GRI disclosure.",
    mobileImage: undefined,
  },
];

const CUSTODY_STEPS: {
  Icon: React.ComponentType<{ className?: string }>;
  num: string;
  label: string;
  sub: string;
  color: string;
}[] = [
  {
    Icon: FileCheck,
    num: "01",
    label: "Deliverable Completed",
    sub: "Volunteer logs outcomes, hours & beneficiaries in real time via mobile — timestamped at the moment it happens.",
    color: "#0A1F44",
  },
  {
    Icon: ShieldCheck,
    num: "02",
    label: "NGO Verifies",
    sub: "Partner NGO confirms results with a single tap — no login required, under 15 seconds.",
    color: "#1D4ED8",
  },
  {
    Icon: Lock,
    num: "03",
    label: "Evidence Object Created",
    sub: "Record sealed with GPS coordinates, device ID, verifier identity & SDG mapping — tamper-proof.",
    color: "#059669",
  },
  {
    Icon: BarChart2,
    num: "04",
    label: "ESG / SDG Reporting",
    sub: "Audit-ready PDF delivered to corporate ESG teams — every claim traceable to an NGO confirmation.",
    color: "#7C3AED",
  },
];

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
            From Ground-Level Activity to Boardroom ESG Report
          </h2>
          <a
            href="/Synerxus-Verification-Methodology-v1.pdf"
            target="_blank"
            rel="noopener noreferrer"
            download="Synerxus-Verification-Methodology-v1.pdf"
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
                      <span
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-extrabold shadow"
                        style={{ backgroundColor: step.color }}
                      >
                        {i + 1}
                      </span>
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

        {/* ── Desktop: image + hotspots (hidden below md) ── */}
        <div className="hidden md:block">
          {/* Image with absolutely-positioned hotspots */}
          <div
            className="shadow-xl border border-slate-200 bg-white relative rounded-2xl"
            style={{ overflow: "visible" }}
          >
            {/* overflow:hidden wrapper crops the whitespace; the outer div stays overflow:visible for tooltips */}
            <div className="overflow-hidden rounded-2xl">
              <img
                src={esgVerificationProcessImg}
                alt="ESG Impact Verification Process — 5 Steps"
                className="w-full block"
                loading="eager"
                style={{
                  display: "block",
                  marginTop: "-8%",
                  marginBottom: "-8%",
                }}
              />
            </div>

            {/* Unlabelled hotspots at each step's diagram position */}
            {PIPELINE_STEPS.map((step, i) => (
              <button
                key={`${step.label}-${i}`}
                onMouseEnter={() => setActiveStep(i)}
                onMouseLeave={() => setActiveStep(null)}
                onClick={() => setActiveStep(activeStep === i ? null : i)}
                aria-label={step.label}
                className="absolute group focus:outline-none"
                style={{
                  left: `${step.x}%`,
                  top: `${step.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Outer pulse ring */}
                <span
                  className="absolute rounded-full animate-ping"
                  style={{
                    inset: "-6px",
                    backgroundColor: step.color,
                    opacity: 0.3,
                    animationDuration: `${1.8 + i * 0.15}s`,
                  }}
                />
                {/* Inner dot — no label */}
                <span
                  className={`relative block rounded-full border-2 border-white shadow-md transition-all duration-200 ${
                    activeStep === i ? "scale-150" : "group-hover:scale-125"
                  }`}
                  style={{
                    width: "14px",
                    height: "14px",
                    backgroundColor: activeStep === i ? step.color : step.color,
                    opacity: activeStep === i ? 1 : 0.85,
                  }}
                />

                {/* Tooltip — appears above dot; flips right-aligned near right edge */}
                <span
                  className={`absolute bottom-full mb-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-2xl pointer-events-none text-left transition-all duration-150 ${
                    activeStep === i
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0"
                  } ${step.x > 65 ? "right-0" : "left-0"}`}
                  style={{ minWidth: "170px", zIndex: 10 }}
                >
                  <span
                    className="block w-full h-0.5 rounded-full mb-2 opacity-60"
                    style={{ backgroundColor: step.color }}
                  />
                  <span className="block text-xs font-bold text-[#0A1F44] leading-snug">
                    {step.label}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-1 leading-snug">
                    {step.sub}
                  </span>
                </span>
              </button>
            ))}
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
      outcome: "Job-readiness workshop — 42 trainees certified",
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
  table{width:100%;border-collapse:collapse;}
  th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#fff;padding:7px 8px;}
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
        <span style="color:#fff;">SYNER</span><span style="color:#D4980C;">XUS</span> · <span style="color:#D4980C;">Impact,</span> <span style="color:#fff;">Verified.</span>
      </div>
      <h1 style="color:#fff;font-size:18px;">Corporate ESG Impact Report</h1>
      <div style="color:#93c5fd;font-size:10px;margin-top:2px;">UN SDG-Aligned · NGO-Confirmed Outcomes · SUPPORTS Audit Procedures</div>
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
  <div style="font-size:10px;color:#78350f;line-height:1.6;">This is a <strong>sample report</strong> using fictitious data to demonstrate the Synerxus verification architecture. It mirrors the exact structure delivered to corporate ESG teams. All names, figures, and organisations are illustrative. This report is classified as <strong>Management Reporting (Verified)</strong> — NOT a formal assurance opinion. Synerxus is designed to reduce auditor evidence-gathering by 60–70%; it does not replace auditor judgment per ISAE 3000.</div>
</div>

<!-- SECTION 1: EXECUTIVE SNAPSHOT -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 1: Executive Snapshot</h3>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">NGO Partners</div><div class="kpi-value">3</div><div class="kpi-sub">organisations</div></div>
    <div class="kpi"><div class="kpi-label">Employees Volunteering</div><div class="kpi-value">47</div><div class="kpi-sub">of 120 linked</div></div>
    <div class="kpi"><div class="kpi-label">NGO-Confirmed Outcomes</div><div class="kpi-value">134</div><div class="kpi-sub">186 total units</div></div>
    <div class="kpi"><div class="kpi-label">Verified Hours</div><div class="kpi-value">1,678</div><div class="kpi-sub">NGO-verified (not self-reported)</div></div>
    <div class="kpi"><div class="kpi-label">Beneficiaries Reached</div><div class="kpi-value">39,290</div><div class="kpi-sub">NGO-tracked</div><div style="font-size:8px;color:#9ca3af;margin-top:3px;line-height:1.3;">&#8224; NGO partner estimates. Sample 15–30% per ISAE 3000.</div></div>
    <div class="kpi"><div class="kpi-label">Verification Rate</div><div class="kpi-value">85%</div><div class="kpi-sub">avg 16h turnaround</div></div>
    <div class="kpi"><div class="kpi-label">Avg Hours / Employee</div><div class="kpi-value">35.7h</div><div class="kpi-sub">NGO-verified</div></div>
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
        <div style="font-size:10px;color:#6B7280;margin-top:6px;">NGO-Tracked</div>
      </div>
    </div>
    <div style="padding:6px 20px;background:#0A2463;font-size:9px;color:#E5E7EB;letter-spacing:.03em;">Management Reporting Verified — Supports CSRD Assurance (ISAE 3000)</div>
  </div>

  <!-- CSRD boundary indicator -->
  <div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">
    <div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:.05em;text-transform:uppercase;">CSRD Assurance Boundary Indicator</div>
    <div style="padding:14px 16px;background:#F9FAFB;">
      <div style="background:#E5E7EB;height:18px;border-radius:3px;overflow:hidden;border:1px solid #D1D5DB;margin-bottom:8px;">
        <div style="width:65%;height:100%;background:#0A2463;display:flex;align-items:center;padding-left:8px;"><span style="font-size:9px;color:#F9FAFB;font-weight:700;">65%</span></div>
      </div>
      <div style="font-size:10.5px;color:#374151;font-weight:600;margin-bottom:4px;">Supports CSRD Assurance <span style="color:#0891B2;">(Management Reporting Verified)</span></div>
      <div style="font-size:9px;color:#6B7280;font-style:italic;padding-top:6px;border-top:1px solid #E5E7EB;margin-top:6px;">* Independent auditor procedures per ISAE 3000 required for formal assurance. Synerxus reduces evidence-gathering burden — it does not replace auditor judgment or opinion.</div>
    </div>
  </div>

  <!-- ESRS disclosure support -->
  <div class="section">
    <div class="section-header"><h2>ESRS Disclosure Support Status</h2></div>
    <table>
      <thead><tr style="background:#f1f5f9;"><th style="color:var(--navy);">ESRS Requirement</th><th style="color:var(--navy);">Status</th><th style="color:var(--navy);">Evidence</th></tr></thead>
      <tbody>
        <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS S1.4 — Workforce skills</td><td style="padding:6px 8px;" class="badge-ok">&#10003; 47 employees deployed verified skills</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 3 + Outcome Log</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);background:#f9fafb;"><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS S3.3 — Community engagement</td><td style="padding:6px 8px;" class="badge-ok">&#10003; 3 NGO partners, 134 verified outcomes</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 2 + Outcome Log</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS S3.4 — Actual community impacts</td><td style="padding:6px 8px;" class="badge-ok">&#10003; 39,290 beneficiaries reached</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 2 + Beneficiary Counts</td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);background:#f9fafb;"><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS S3.4 — Negative impacts (double materiality)</td><td style="padding:6px 8px;" class="badge-ok">&#10003; None disclosed this period</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Section 6</td></tr>
        <tr><td style="padding:6px 8px;font-size:11px;font-weight:600;">ESRS G1.3 — Monitoring processes</td><td style="padding:6px 8px;" class="badge-ok">&#10003; 85% verification rate, 16h avg SLA</td><td style="padding:6px 8px;font-size:10px;color:var(--txt-s);">Verification Trail (Section 5)</td></tr>
      </tbody>
    </table>
  </div>
  <div class="note">&#128161; <strong>Key Differentiator:</strong> Unlike Benevity/YourCause (self-reported hours only), Synerxus delivers <strong>NGO-verified outcomes AND hours</strong> with immutable audit trails — designed to support CSRD disclosure requirements for third-party verified social impact data (ESRS S3).</div>
</div>

<!-- VERIFICATION BOUNDARY MATRIX -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Verification Boundary — Scope Definition</h3>
  <div style="font-family:Inter,sans-serif;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">
    <div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:.05em;text-transform:uppercase;">Verification Boundary — Included vs. Excluded</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;">
      <div style="border-right:1px solid #E5E7EB;">
        <div style="padding:8px 16px;font-size:10px;font-weight:700;color:#0891B2;background:#F0FDFF;border-bottom:1px solid #E5E7EB;">Included (Verified)</div>
        ${["NGO-confirmed outcomes", "72h verification window", "Validated beneficiary counts", "Immutable audit trails"].map((item, i, arr) => `<div style="padding:7px 16px;font-size:10.5px;color:#374151;${i < arr.length - 1 ? "border-bottom:1px solid #F3F4F6;" : ""}display:flex;align-items:center;gap:8px;"><span style="color:#0891B2;font-weight:700;">&#x2713;</span> ${item}</div>`).join("")}
      </div>
      <div>
        <div style="padding:8px 16px;font-size:10px;font-weight:700;color:#374151;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Excluded (Not Verified)</div>
        ${["Self-reported hours", "Outcomes >72h post-completion", "Projected/estimated numbers", "Financial SROI valuation"].map((item, i, arr) => `<div style="padding:7px 16px;font-size:10.5px;color:#6B7280;${i < arr.length - 1 ? "border-bottom:1px solid #F3F4F6;" : ""}display:flex;align-items:center;gap:8px;"><span style="color:#9CA3AF;font-weight:700;">&#x2717;</span> ${item}</div>`).join("")}
      </div>
    </div>
  </div>
</div>

<!-- SECTION 2: NGO PARTNERSHIPS -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 2: NGO Partnership Impact</h3>
  <div class="section">
    <div class="section-header"><h2>Sponsored NGO Partners — Verified Impact</h2></div>
    <table>
      <thead><tr><th>NGO Partner</th><th>Location</th><th>Verified Outcomes</th><th>Beneficiaries</th><th>SDG Alignment</th><th>Audit Status</th></tr></thead>
      <tbody>${ngoRows}</tbody>
    </table>
  </div>
  <div class="note">&#128161; <strong>CSRD Relevance:</strong> ESRS S3.3 requires disclosure of "operations with significant community impact." This section proves direct engagement with affected communities through NGO-verified outcomes — replacing self-reported claims.</div>
</div>

<!-- SECTION 3: EMPLOYEE VOLUNTEERING -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 3: Employee Volunteering (ESRS S1.4)</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
    <div class="section">
      <div class="section-header"><h2>Participation Metrics</h2></div>
      <table><tbody>
        <tr style="border-bottom:0.5px solid var(--bd);"><td style="padding:7px 10px;font-size:11px;font-weight:600;">Employees Volunteering</td><td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700;color:var(--navy);">47</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);"><span class="badge-ok">&#10003; Verified roster</span></td></tr>
        <tr style="border-bottom:0.5px solid var(--bd);background:#f9fafb;"><td style="padding:7px 10px;font-size:11px;font-weight:600;">Total Verified Hours</td><td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700;color:var(--navy);">1,678h</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);"><span class="badge-ok">&#10003; NGO-verified</span></td></tr>
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
        <tr><td style="padding:7px 10px;font-size:11px;">NGO Partners</td><td style="padding:7px 10px;font-size:11px;font-weight:700;color:var(--navy);">3</td><td style="padding:7px 10px;font-size:10px;color:var(--txt-s);">vs. 8 avg (Benevity)</td></tr>
      </tbody></table>
    </div>
  </div>
  <div class="section">
    <div class="section-header"><h2>Top Employee Contributors (Verified Outcomes)</h2></div>
    <table>
      <thead><tr><th>Employee</th><th>Dept.</th><th style="text-align:center;">Verified Outcomes</th><th style="text-align:center;">Hours</th><th>NGO Partners</th><th>Skills Deployed</th></tr></thead>
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
      <span style="color:#6B7280;">SMS-Based (No App Required)</span>
    </div>
  </div>
  <div class="note">&#128161; <strong>CSRD Relevance:</strong> ESRS S1.4 requires disclosure of "workforce skills development." This section proves employees gained cross-cultural project management experience through NGO-verified outcomes — not self-assessed surveys.</div>
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
    <div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">All percentages refer to verified outcomes only. SDG alignment confirmed by NGO program directors.</div>
  </div>
</div>

<!-- SECTION 5: AUDIT TRAIL -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 5: Verified Outcomes Log (Audit Trail)</h3>
  <div class="section">
    <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;"><h2>Immutable Records for Auditor Sampling (showing 10 of 134)</h2></div>
    <table>
      <thead><tr><th>Date</th><th>Employee</th><th>NGO Partner</th><th>Outcome Verified</th><th style="text-align:center;">Hours</th><th>Method</th><th>Geolocation</th></tr></thead>
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
        <div style="display:flex;align-items:center;gap:8px;"><div style="width:12px;height:8px;background:#0891B2;border-radius:1px;flex-shrink:0;"></div><span style="font-size:9.5px;color:#374151;font-weight:600;">100% immutable audit trails maintained</span></div>
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
        ${["Timestamp", "Verifier ID", "Geolocation", "Device Hash"].map((item, i, arr) => `<div style="padding:5px 14px;font-size:10px;color:#374151;${i < arr.length - 1 ? "border-bottom:1px solid #F3F4F6;" : ""}">&#x2022; ${item}</div>`).join("")}
      </div>
      <div>
        <div style="padding:8px 14px;font-size:10px;font-weight:700;color:#0A2463;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">Regulatory Metadata</div>
        ${["SDG Primary/Secondary", "ESRS Mapping (S3/S4)", "Project ID", "Corporate Program"].map((item, i, arr) => `<div style="padding:5px 14px;font-size:10px;color:#374151;${i < arr.length - 1 ? "border-bottom:1px solid #F3F4F6;" : ""}">&#x2022; ${item}</div>`).join("")}
      </div>
    </div>
    <div style="padding:10px 16px;background:#F0FDFF;border-top:1px solid #E5E7EB;display:flex;align-items:center;gap:12px;">
      <span style="color:#0891B2;font-size:14px;">&#x2193;</span>
      <span style="font-size:10px;color:#0891B2;font-weight:700;">NGO Verification &#x2713; within 72h</span>
      <span style="font-size:10px;color:#6B7280;">&#x2192;</span>
      <span style="font-size:10px;color:#374151;font-weight:600;">Immutable Record Locked</span>
    </div>
  </div>
  <div style="background:#f0f9ff;border:0.5px solid #bae6fd;border-radius:var(--r);padding:8px 12px;font-size:10px;color:#0369a1;margin-top:8px;">
    &#128269; <strong>Auditor Use Case:</strong> Randomly sample 15–30% of outcomes for direct NGO confirmation. Each record includes verifier identity, timestamp, and contact information for the NGO programme director.
  </div>
</div>

<!-- SECTION 6: DOUBLE MATERIALITY -->
<div style="margin-bottom:20px;">
  <h3 style="color:var(--navy);font-size:13px;font-weight:700;border-bottom:2px solid var(--teal);padding-bottom:4px;margin-bottom:12px;">&#9635; Section 6: Double Materiality Disclosure (ESRS S3.4)</h3>
  <!-- Screening matrix -->
  <div style="font-family:Inter,sans-serif;margin:16px 0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;">
    <div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:.05em;text-transform:uppercase;">Negative Impact Screening — Status Matrix</div>
    <div style="display:grid;grid-template-columns:2fr 80px 100px 1fr;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">
      ${["Screening Dimension", "Status", "Outcomes Affected", "Verification Method"].map((h, i) => `<div style="padding:6px 12px;font-size:9px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.04em;${i < 3 ? "border-right:1px solid #E5E7EB;" : ""}">${h}</div>`).join("")}
    </div>
    ${[
      { dim: "Community Harm", method: "NGO Program Director" },
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
        { label: "Volunteer Activity", verified: false, sla: "" },
        {
          label: "NGO Verification &#x2713;",
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
    <div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">Independent NGO verification is the trust mechanism — not self-reported activity.</div>
  </div>
  <!-- Assurance boundary diagram -->
  <div style="font-family:Inter,sans-serif;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;margin-top:16px;">
    <div style="background:#0A2463;padding:8px 16px;font-size:10px;font-weight:700;color:#F9FAFB;letter-spacing:.05em;text-transform:uppercase;">Assurance Boundary — Limitations &amp; Scope</div>
    <div style="padding:16px;background:#F9FAFB;">
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:100%;padding:10px 16px;border:1.5px solid #374151;border-radius:4px;background:#F9FAFB;text-align:center;">
          <div style="font-size:10px;font-weight:700;color:#374151;">Independent Assurance — ISAE 3000 REQUIRED</div>
          <div style="font-size:9px;color:#9CA3AF;margin-top:2px;">(Auditor Judgment)</div>
        </div>
        <div style="color:#9CA3AF;font-size:14px;line-height:1;margin:4px 0;">&#x2193;</div>
        <div style="width:88%;padding:10px 16px;border:1.5px solid #0891B2;border-radius:4px;background:#F0FDFF;text-align:center;">
          <div style="font-size:10px;font-weight:700;color:#0A2463;">Synerxus: Management Reporting Verified &#x2713;</div>
          <div style="font-size:9px;color:#0891B2;margin-top:2px;">(NGO Verification)</div>
        </div>
        <div style="color:#9CA3AF;font-size:14px;line-height:1;margin:4px 0;">&#x2193;</div>
        <div style="width:76%;padding:10px 16px;border:1.5px solid #0A2463;border-radius:4px;background:#EFF6FF;text-align:center;">
          <div style="font-size:10px;font-weight:700;color:#0A2463;">Self-Reported &#x2192; Verified &#x2192; Audit-Ready</div>
        </div>
      </div>
    </div>
    <div style="padding:5px 16px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF;">Synerxus provides verification infrastructure — not assurance opinion. Independent auditor required for ISAE 3000 / CSRD formal assurance.</div>
  </div>
</div>

<!-- FOOTER -->
<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;font-size:9px;color:#9ca3af;">
  <div>&#169; 2026 Synerxus · SAMPLE REPORT — Data is illustrative only · Report ID: ESG-2026-0407-ACME</div>
  <div style="font-weight:700;color:#0A2463;">SYNER<span style="color:#D4980C;">XUS</span></div>
</div>

</div>
</body>
</html>`;
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  pilot: "Pilot — $5,000 / 90 days",
  starter: "Starter — From $8,000/yr",
  growth: "Growth — From $22,000/yr",
  enterprise: "Enterprise — From $38,000/yr",
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
      setError(err.message || "Something went wrong. Please email hello@synerxus.com directly.");
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
            <h3 className="text-lg font-extrabold text-[#0A1F44] mb-2">
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
                <h3 className="text-base font-extrabold text-[#0A1F44] leading-tight">
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
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin inline" />Sending…</>
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

  const printReport = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  };

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Logo size="sm" clickable={false} />
          <span className="text-sm font-bold text-[#0A1F44] hidden sm:block">
            Corporate ESG Impact Report
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
        sandbox="allow-same-origin allow-popups"
      />
    </div>
  );
}

export default function Landing() {
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSampleReport, setShowSampleReport] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const [activeGapLayer, setActiveGapLayer] = useState<string | null>(null);
  const [showProcessBrief, setShowProcessBrief] = useState(false);
  const [activeSdg, setActiveSdg] = useState<number | null>(null);
  const [howItWorksStep, setHowItWorksStep] = useState<number | null>(null);
  const [pricingPlan, setPricingPlan] = useState<string | null>(null);
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
      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200 shadow-sm safe-area-top">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-3 flex justify-between items-center">
          <Link href="/landing">
            <div className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
              <Logo size="sm" showMotto={true} />
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "How It Works", anchor: "how-it-works" },
              { label: "For Teams", anchor: "for-teams" },
              { label: "See Impact", anchor: "verification-stack" },
              { label: "Pricing", anchor: "pricing" },
              { label: "FAQ", anchor: "faq" },
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
              <Link href="/dashboard">
                <Button
                  size="sm"
                  className="whitespace-nowrap bg-[#0A1F44] hover:bg-[#0d2a5e] text-white font-semibold text-sm px-4 rounded-xl"
                  data-testid="button-my-dashboard"
                >
                  My Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    size="sm"
                    variant="outline"
                    className="whitespace-nowrap border-[#0A1F44] text-[#0A1F44] font-semibold text-sm px-4 rounded-xl hover:bg-[#0A1F44] hover:text-white"
                    data-testid="button-login-nav"
                  >
                    Log In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    size="sm"
                    className="whitespace-nowrap bg-[#0A1F44] hover:bg-[#0d2a5e] text-white font-semibold text-sm px-4 rounded-xl"
                    data-testid="button-sign-up-nav"
                  >
                    Sign Up
                  </Button>
                </Link>
              </>
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
                  { label: "For Teams", anchor: "for-teams" },
                  { label: "See Impact", anchor: "verification-stack" },
                  { label: "Pricing", anchor: "pricing" },
                  { label: "FAQ", anchor: "faq" },
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
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("/login");
                      }}
                      className="w-full py-2.5 px-4 rounded-xl border border-[#0A1F44] text-[#0A1F44] font-semibold text-sm text-center"
                      data-testid="button-login-nav"
                    >
                      Log In
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("/signup");
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#0A1F44] text-white font-semibold text-sm text-center"
                      data-testid="button-sign-up-nav"
                    >
                      Sign Up
                    </button>
                  </>
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
          className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/60 to-blue-100/80 py-10 md:py-16"
          data-testid="section-hero"
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
                The Verification Layer
                <span className="text-[#0A1F44]"> for </span>
                <span className="text-[#D4980C]">
                  CSR, ESG, and Global Community Impact.
                </span>
              </h1>

              <p
                className="text-base md:text-lg text-slate-600 mb-8 leading-relaxed"
                data-testid="text-hero-description"
              >
                Real-time, NGO-verified outcomes with immutable audit trails —
                built for enterprise ESG, CSRD and ESRS reporting under the UN
                SDGs.
              </p>

              <div className="flex flex-row gap-2 sm:gap-3 mb-10">
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
                    <Link href="/signup">
                      <Button
                        size="lg"
                        className="bg-[#0A1F44] hover:bg-[#0d2a5e] text-white font-bold px-4 sm:px-8 rounded-xl shadow-lg text-sm sm:text-base"
                        data-testid="button-join-hero"
                      >
                        Book a Demo
                      </Button>
                    </Link>
                    <Button
                      size="lg"
                      onClick={() => setShowSampleReport(true)}
                      className="bg-[#D4980C] hover:bg-[#B07F0A] text-white font-bold px-4 sm:px-8 rounded-xl shadow-lg border-0 text-sm sm:text-base"
                      data-testid="button-sign-in-hero"
                    >
                      See a Sample Report
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
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  "All 17 UN SDGs",
                  "CSRD-Ready",
                  "Audit-Defensible",
                  "NGO-Verified",
                  "ESRS S3/S4 Mapped",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-[#0A1F44]/15 text-[10px] sm:text-xs font-semibold text-[#0A1F44] shadow-sm"
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
                  {HERO_SLIDES.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`ESG impact slide ${i + 1}`}
                      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                      style={{ opacity: heroSlide === i ? 1 : 0 }}
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  ))}
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

        {/* ── NGO Partner Strip ── */}
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
                  Zambia · Community &amp; Youth Impact
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

        {/* ── Section 2: Problem ── */}
        <section id="problem" className="py-10 md:py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A1F44] mb-4">
                The World Runs on Unverified Impact Claims
              </h2>
              <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto">
                Three broken systems. One verification gap. Synerxus closes it.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Building2 className="h-7 w-7 text-[#0A1F44]" />,
                  segment: "ESG Teams",
                  pain: "70% of disclosures rely on self-reported data.",
                  quote: '"CSRD requires evidence, not narratives."',
                },
                {
                  icon: <Users className="h-7 w-7 text-[#0A1F44]" />,
                  segment: "Corporate Volunteering",
                  pain: "Hours logged ≠ outcomes delivered.",
                  quote: '"No independent confirmation."',
                },
                {
                  icon: <Globe className="h-7 w-7 text-[#0A1F44]" />,
                  segment: "NGOs & Cities",
                  pain: "Fragmented proof and manual reporting.",
                  quote: '"Impact is real, but unverifiable."',
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

            <p className="text-center text-[#0A1F44] font-bold text-lg mt-10">
              Synerxus closes the verification gap.
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
              label: "Audit / Assurance",
              sub: "Too slow, cost-prohibitive",
              dim: true,
              synerxus: false,
              status: "Out of reach",
              statusBg: "bg-slate-100",
              statusText: "text-slate-500",
              badgeBg: "bg-slate-100",
              badgeText: "text-slate-400",
              cardActive: "border-slate-300 bg-slate-50 shadow-sm",
              cardIdle: "border-slate-200 bg-slate-50/60 opacity-55",
              tools: ["Big 4 Auditors", "ISAE 3000 firms", "PwC ESG Assurance"],
              detail:
                "Independent assurance exists but costs $100k+ per engagement and takes months to complete — far too slow and expensive for program-level verification.",
            },
            {
              id: "Level 4",
              label: "Verification",
              sub: "The missing layer — Synerxus fills this",
              dim: false,
              synerxus: true,
              status: "✦ Synerxus fills this",
              statusBg: "bg-[#D4980C]/15",
              statusText: "text-[#D4980C]",
              badgeBg: "bg-[#D4980C]",
              badgeText: "text-white",
              cardActive:
                "border-[#D4980C]/70 bg-[#FFFBF0] shadow-[0_0_24px_rgba(212,152,12,0.18)]",
              cardIdle: "border-[#D4980C]/40 bg-[#FFFDF5]/80",
              tools: [],
              detail:
                "No platform provided real-time, NGO-confirmed outcome verification tied to an immutable audit trail — until now. Every verified outcome is automatically tagged to the relevant UN SDG (1–17) and mapped to ESRS S3/S4, turning ESG claims into CSRD-ready evidence.",
            },
            {
              id: "Level 3",
              label: "Trackers",
              sub: "Log hours only — no outcome proof",
              dim: false,
              synerxus: false,
              status: "Saturated",
              statusBg: "bg-[#D4980C]/10",
              statusText: "text-[#D4980C]",
              badgeBg: "bg-slate-100",
              badgeText: "text-slate-400",
              cardActive: "border-[#0A1F44]/30 bg-white shadow-md",
              cardIdle: "border-slate-200 bg-white",
              tools: ["Benevity", "Goodera", "YourCause"],
              detail:
                "Track volunteer hours and log activities effectively — but cannot prove that the promised outcomes were actually delivered to beneficiaries.",
            },
            {
              id: "Level 2",
              label: "Aggregators",
              sub: "Display data — no independent confirmation",
              dim: false,
              synerxus: false,
              status: "Saturated",
              statusBg: "bg-blue-100",
              statusText: "text-blue-700",
              badgeBg: "bg-slate-100",
              badgeText: "text-slate-400",
              cardActive: "border-[#0A1F44]/30 bg-white shadow-md",
              cardIdle: "border-slate-200 bg-white",
              tools: ["Sopact", "IRIS+", "WEF UpLink"],
              detail:
                "Aggregate and visualise impact data beautifully — but the underlying inputs remain self-reported and unverified, limiting defensibility.",
            },
            {
              id: "Level 1",
              label: "Reporting Frameworks",
              sub: "Define what to report — accept self-declared numbers",
              dim: false,
              synerxus: false,
              status: "Saturated",
              statusBg: "bg-violet-100",
              statusText: "text-violet-700",
              badgeBg: "bg-slate-100",
              badgeText: "text-slate-400",
              cardActive: "border-[#0A1F44]/30 bg-white shadow-md",
              cardIdle: "border-slate-200 bg-white",
              tools: ["CSRD", "GRI Standards", "ESRS S3/S4"],
              detail:
                "Define what to report and in what format — but accept self-declared numbers. They create demand for verified data; Synerxus provides the supply.",
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
                      Existing tools at this level
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
                      No platform existed here before Synerxus — this is the
                      white space.
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
                      The Gap
                    </span>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A1F44]">
                      The Missing Infrastructure
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base mt-3 max-w-xl mx-auto">
                      Every layer of the impact stack exists — except the one
                      that makes it credible.
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
                                    className={`font-bold text-sm leading-tight ${layer.synerxus ? "text-[#D4980C]" : "text-[#0A1F44]"}`}
                                  >
                                    {layer.label}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                    {layer.sub}
                                  </div>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                  {layer.synerxus ? (
                                    <Logo size="xs" clickable={false} />
                                  ) : (
                                    <span
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${layer.statusBg} ${layer.statusText}`}
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
                                  className={`font-bold text-sm leading-tight ${layer.synerxus ? "text-[#D4980C]" : "text-[#0A1F44]"}`}
                                >
                                  {layer.label}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                  {layer.sub}
                                </div>
                              </div>
                              <div className="shrink-0">
                                {layer.synerxus ? (
                                  <Logo size="xs" clickable={false} />
                                ) : (
                                  <span
                                    className={`hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${layer.statusBg} ${layer.statusText}`}
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
                Verify What Actually Happened
              </h2>
              <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto">
                Four capabilities that turn impact claims into defensible
                evidence.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                {
                  icon: <Clock className="h-6 w-6 text-blue-600" />,
                  title: "Real-Time Outcome Verification",
                  desc: "NGO staff confirm deliverables within 72 hours — no lag, no backlogs.",
                  bg: "bg-blue-100",
                },
                {
                  icon: <Lock className="h-6 w-6 text-[#0A1F44]" />,
                  title: "Immutable Audit Trails",
                  desc: "Structured Evidence Objects provide defensible sampling for regulators and auditors.",
                  bg: "bg-slate-100",
                },
                {
                  icon: <BarChart2 className="h-6 w-6 text-emerald-600" />,
                  title: "SDG + ESG Alignment",
                  desc: "Automatic mapping to ESRS S3/S4 — reports that compliance officers trust.",
                  bg: "bg-emerald-100",
                },
                {
                  icon: <AlertTriangle className="h-6 w-6 text-[#D4980C]" />,
                  title: "Negative Impact Screening",
                  desc: "Mandatory at verification — prevents greenwashing before it enters your reports.",
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
        <section className="py-10 md:py-16 bg-white">
          <div className="max-w-5xl mx-auto px-6 md:px-10">
            <div className="text-center mb-10">
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
                return (
                  <div key={step.num} className="flex gap-4">
                    {/* Left column: icon + connecting line */}
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
                    {/* Right column: content */}
                    <div
                      className={
                        i < CUSTODY_STEPS.length - 1 ? "pb-6 flex-1" : "flex-1"
                      }
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
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: horizontal cards with gradient connectors */}
            <div className="hidden md:flex flex-row items-stretch gap-0">
              {CUSTODY_STEPS.map((step, i) => {
                const { Icon } = step;
                return (
                  <div
                    key={step.num}
                    className="flex flex-row items-center flex-1"
                  >
                    {/* Card */}
                    <div
                      className="flex-1 flex flex-col items-center text-center bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:shadow-lg transition-shadow duration-200 h-full"
                      style={{ borderTop: `3px solid ${step.color}` }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-md mb-3 mt-1"
                        style={{ backgroundColor: step.color }}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <span
                        className="text-[10px] font-bold tracking-widest uppercase mb-1"
                        style={{ color: step.color }}
                      >
                        {step.num}
                      </span>
                      <span className="text-sm font-extrabold text-[#0A1F44] leading-tight mb-2">
                        {step.label}
                      </span>
                      <span className="text-xs text-slate-500 leading-relaxed">
                        {step.sub}
                      </span>
                    </div>
                    {/* Gradient connector */}
                    {i < CUSTODY_STEPS.length - 1 && (
                      <div className="flex-shrink-0 w-8 flex flex-col items-center justify-center self-center mt-[-8px]">
                        <div
                          className="h-0.5 w-full rounded-full"
                          style={{
                            background: `linear-gradient(to right, ${step.color}, ${CUSTODY_STEPS[i + 1].color})`,
                            opacity: 0.5,
                          }}
                        />
                        <ArrowRight
                          className="h-3 w-3 -mt-0.5 -mr-1 self-end"
                          style={{
                            color: CUSTODY_STEPS[i + 1].color,
                            opacity: 0.6,
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
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
                That Needs Verified Impact
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: <BarChart2 className="h-6 w-6 text-blue-700" />,
                  audience: "ESG Teams",
                  benefit:
                    "CSRD-ready evidence for S3/S4 disclosures — audit-defensible from day one.",
                  bg: "bg-blue-100",
                },
                {
                  icon: <Users className="h-6 w-6 text-[#0A1F44]" />,
                  audience: "Corporate Volunteering",
                  benefit:
                    "Move beyond hours logged — verify outcomes and show true employee impact.",
                  bg: "bg-slate-100",
                },
                {
                  icon: <ShieldCheck className="h-6 w-6 text-emerald-700" />,
                  audience: "NGOs",
                  benefit:
                    "Show funders verified, timestamped impact — effortlessly and credibly.",
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
                    "Portfolio-wide verification of social outcomes — from commitment to delivery.",
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

        {/* ── Section 6: Verification Stack ── */}
        <section
          id="verification-stack"
          className="py-10 md:py-14 bg-[#0A1F44]"
        >
          <div className="max-w-5xl mx-auto px-6 md:px-10 text-center">
            <span className="inline-block px-4 py-1 rounded-full bg-[#D4980C]/20 text-[#D4980C] text-xs font-bold uppercase tracking-wider mb-5">
              Accurate Global Impact Stack Workflow
            </span>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-6">
              Synerxus is the independent verification layer
              <br className="hidden md:block" /> between input trackers and
              impact aggregators
            </h2>

            <p className="text-blue-300 text-sm md:text-base max-w-2xl mx-auto mb-10 leading-relaxed">
              We complement existing systems by transforming self-reported
              activity data into audit-supportive evidence through NGO-confirmed
              outcomes with immutable audit trails.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-0">
              {[
                {
                  label: "Trackers",
                  sub: "Log inputs & volunteer hours",
                  bg: "bg-blue-800",
                  textColor: "text-white",
                  subColor: "text-blue-300",
                },
                {
                  label: "Synerxus",
                  sub: "Verifies delivery with NGO-confirmed outcomes",
                  bg: "bg-[#D4980C]",
                  textColor: "text-[#0A1F44]",
                  subColor: "text-[#0A1F44]/70",
                },
                {
                  label: "Aggregators",
                  sub: "Display outcomes & reporting",
                  bg: "bg-blue-800",
                  textColor: "text-white",
                  subColor: "text-blue-300",
                },
                {
                  label: "Evaluators",
                  sub: "Prove causality & long-term impact",
                  bg: "bg-blue-800",
                  textColor: "text-white",
                  subColor: "text-blue-300",
                },
              ].map((node, i, arr) => (
                <div
                  key={node.label}
                  className="flex flex-col md:flex-row items-center"
                >
                  <div
                    className={`${node.bg} rounded-xl px-5 py-4 w-48 text-center shadow-lg`}
                  >
                    <p className={`font-bold text-sm ${node.textColor} mb-1`}>
                      {node.label}
                    </p>
                    <p className={`text-xs ${node.subColor} leading-snug`}>
                      {node.sub}
                    </p>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-[#D4980C] my-2 md:my-0 md:mx-2 rotate-90 md:rotate-0 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

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
                    label: "Verified Outcomes",
                  },
                  {
                    target: publicStats?.totalVerifiedHours ?? null,
                    suffix: "",
                    label: "Verified Hours",
                  },
                  {
                    target:
                      (publicStats?.totalBeneficiaries ?? 0) > 0
                        ? publicStats!.totalBeneficiaries
                        : null,
                    suffix: "",
                    label: "Beneficiaries Reached",
                  },
                  {
                    target: publicStats?.verificationRate ?? null,
                    suffix: "%",
                    label: "Verification Rate",
                  },
                  {
                    target: publicStats?.activeNGOs ?? null,
                    suffix: "",
                    label: "Active NGOs",
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
                Synerxus automatically tags each NGO-verified outcome to the
                relevant SDG — creating a traceable chain from ground-level
                delivery to CSRD disclosure across all 17 goals.
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
              Every Synerxus-verified outcome carries an immutable SDG tag —
              audit-ready for ESRS S3/S4 and GRI disclosure.
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
                  desc: "Watershed restoration verified across 7 active projects — immutable audit trails delivered to corporate ESG teams within 48 hours.",
                  tagColor: "bg-emerald-100 text-emerald-800",
                  sdgs: [
                    { n: 6, color: "#26BDE2", name: "Clean Water" },
                    { n: 15, color: "#56C02B", name: "Life on Land" },
                  ],
                },
                {
                  title: "Solar Village Initiative",
                  tag: "Energy Access",
                  desc: "Energy access outcomes confirmed with full audit trails, mapped to SDG 7 and ESRS E1 — ready for CSRD disclosure.",
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

        {/* ── FAQ ── */}
        <section
          id="faq"
          className="py-10 md:py-16 bg-white border-t border-slate-100"
        >
          <div className="max-w-3xl mx-auto px-6 md:px-10">
            <div className="text-center mb-10">
              <span className="inline-block px-4 py-1 rounded-full bg-[#0A1F44]/10 text-[#0A1F44] text-xs font-bold uppercase tracking-wider mb-3">
                FAQ
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0A1F44]">
                Common Questions
              </h2>
            </div>
            <div className="flex flex-col divide-y divide-slate-100">
              {[
                {
                  q: "Does Synerxus replace our existing volunteer tracking platform?",
                  a: "No. Synerxus is the independent verification layer that sits between your activity tracker (e.g. Benevity, Goodera) and your ESG aggregator or reporting framework. We add NGO-confirmed outcomes and immutable audit trails on top of what you already have.",
                },
                {
                  q: "How does NGO verification actually work?",
                  a: "After a volunteer logs an activity, the assigned NGO partner receives an instant SMS or in-app verification request. They confirm or flag the outcome with a single tap — no login required — in under 15 seconds. The result is sealed into a tamper-proof evidence record.",
                },
                {
                  q: "Is this compliant with CSRD and ESRS S3/S4?",
                  a: "Synerxus is specifically designed to produce evidence that supports CSRD disclosure obligations under ESRS S3 (Affected Communities) and S4 (Consumers and End-users). Every verified outcome is automatically tagged to the relevant ESRS standard and UN SDG, creating a traceable chain of evidence for third-party assurance.",
                },
                {
                  q: "What does an immutable audit trail actually contain?",
                  a: "Each Evidence Object captures: verifier identity, device ID, GPS coordinates, timestamp, outcome description, hours, beneficiary count, and SDG mapping — all sealed at the moment of verification. Records cannot be retroactively edited.",
                },
                {
                  q: "How long does verification typically take?",
                  a: "Our average verification turnaround is 16 hours, with a target SLA of 72 hours. NGOs are notified instantly and can verify from any mobile device without creating an account.",
                },
                {
                  q: "Can we use Synerxus across multiple NGO partners and geographies?",
                  a: "Yes. Synerxus is built for multi-program, multi-geography deployment. Each NGO partner is onboarded once and can verify outcomes across all corporate programs they are linked to. Reports aggregate verified data across all partners, SDGs, and geographies in one dashboard.",
                },
                {
                  q: "How does Synerxus integrate with our existing systems?",
                  a: "Synerxus is designed as an additive verification layer — it does not replace your existing platforms. It connects to your current volunteer management tools (e.g. Benevity, Goodera, SAP Concur) via API or CSV export, appending NGO-verified outcome data to your existing activity records. For ESG aggregators and CSRD reporting frameworks, Synerxus exports audit-ready data in GRI, ESRS, and ISO 26000 formats. Enterprise integrations are handled by our onboarding team during setup — no developer resources required on your side.",
                },
              ].map(({ q, a }, i) => (
                <details key={i} className="group py-5">
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
          </div>
        </section>

        {/* ── Pricing Section ── */}
        <section
          id="pricing"
          className="py-10 md:py-16 bg-slate-50 border-t border-slate-100"
        >
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            {/* Header */}
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-1 rounded-full bg-[#0A1F44]/10 text-[#0A1F44] text-xs font-bold uppercase tracking-wider mb-3">
                Pricing
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0A1F44] mb-3">
                Verified outcomes, audit-ready evidence, and exclusive NGO
                access
              </h2>
              <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto">
                Built on the world's only free verification network.
              </p>
            </div>

            {/* Free NGO callout — top of pricing */}
            <div className="mb-8 rounded-2xl bg-[#0A1F44] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#D4980C] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-snug">
                  NGO verification is always free — no hidden costs for your
                  partner organizations.
                </p>
                <p className="text-blue-200 text-xs mt-1 leading-relaxed">
                  When you pay for Synerxus, you're not buying verification —
                  you're buying exclusive access to high-impact NGO partners who
                  verify outcomes as a fundraising asset, not as a favour.
                </p>
              </div>
            </div>

            {/* Pricing cards — 4 tiers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
              {/* Pilot */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
                <div className="mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Pilot
                  </span>
                  <div className="mt-1.5 text-2xl font-extrabold text-[#0A1F44]">
                    $5,000
                  </div>
                  <div className="text-xs text-slate-400 font-medium mb-2">
                    90 days · validation sprint
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Teams validating fit before rollout.
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Evidence Infrastructure
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      "1 program",
                      "50 verified outcomes",
                      "NGO verification workflow",
                      "SDG-tagged audit trail",
                    ].map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-xs text-slate-600"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mb-5 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4980C] mb-2">
                    Free for NGO Partners
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Auto-generated "Verified Impact Summary" PDFs they can send
                    to <em>any</em> funder — at no cost.
                  </p>
                </div>
                <div className="mb-4 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] text-emerald-700 font-semibold leading-snug">
                    → $5K credited toward annual plan if converted within 30
                    days
                  </p>
                </div>
                <Button
                  onClick={() => setPricingPlan("pilot")}
                  variant="outline"
                  className="w-full border-[#0A1F44] text-[#0A1F44] hover:bg-[#0A1F44] hover:text-white font-semibold rounded-xl text-sm"
                >
                  Start a Pilot
                </Button>
              </div>

              {/* Starter */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
                <div className="mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Starter
                  </span>
                  <div className="mt-1.5 text-2xl font-extrabold text-[#0A1F44]">
                    From $8,000
                    <span className="text-base font-semibold text-slate-400">
                      /yr
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium mb-2">
                    60% less than one audit exception
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Small ESG teams proving impact.
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Evidence Infrastructure
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      "Free verification for up to 3 NGO partners",
                      "50 verified outcomes/month",
                      "Immutable audit trail",
                      "PDF evidence exports",
                    ].map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-xs text-slate-600"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mb-5 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4980C] mb-2">
                    Free for NGO Partners
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    1-tap verification (&lt;15 seconds) becomes their
                    fundraising asset — no app, no login.
                  </p>
                </div>
                <div className="mb-4 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] text-slate-500 leading-snug">
                    +$12/outcome overage · +$5K NGO incentive guarantee
                  </p>
                </div>
                <Button
                  onClick={() => setPricingPlan("starter")}
                  variant="outline"
                  className="w-full border-[#0A1F44] text-[#0A1F44] hover:bg-[#0A1F44] hover:text-white font-semibold rounded-xl text-sm"
                >
                  Request Pricing
                </Button>
              </div>

              {/* Growth */}
              <div className="bg-[#0A1F44] rounded-2xl border border-[#0A1F44] p-6 flex flex-col relative shadow-xl">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4980C] text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap">
                  Most Popular
                </span>
                <div className="mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                    Growth
                  </span>
                  <div className="mt-1.5 text-2xl font-extrabold text-white">
                    From $22,000
                    <span className="text-base font-semibold text-blue-300">
                      /yr
                    </span>
                  </div>
                  <div className="text-xs text-blue-300 font-medium mb-2">
                    Multi-program scale
                  </div>
                  <p className="text-blue-200 text-xs leading-relaxed">
                    Multi-program teams scaling globally.
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-2">
                    Evidence Infrastructure
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      "Unlimited NGO partners (all free)",
                      "250 verified outcomes/month",
                      "CSRD/ESRS export templates",
                      "API + Slack integration",
                    ].map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-xs text-blue-100"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-[#D4980C] flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mb-5 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4980C] mb-2">
                    Free for NGO Partners
                  </p>
                  <p className="text-xs text-blue-200 leading-relaxed">
                    "Verified by Synerxus" badge increases their credibility
                    with funders — automatically.
                  </p>
                </div>
                <div className="mb-4 px-3 py-2 rounded-xl bg-white/10 border border-white/10">
                  <p className="text-[10px] text-blue-200 leading-snug">
                    +$15/outcome overage · +$7.5K Auditor Export Package (Q4
                    pre-audit)
                  </p>
                </div>
                <Button
                  onClick={() => setPricingPlan("growth")}
                  className="w-full bg-[#D4980C] hover:bg-[#B07F0A] text-white font-bold rounded-xl shadow text-sm"
                >
                  Request Pricing
                </Button>
              </div>

              {/* Enterprise */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
                <div className="mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Enterprise
                  </span>
                  <div className="mt-1.5 text-2xl font-extrabold text-[#0A1F44]">
                    From $38,000
                    <span className="text-base font-semibold text-slate-400">
                      /yr
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium mb-2">
                    Global compliance teams
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Compliance teams managing global risk.
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Evidence Infrastructure
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      "Unlimited programs & NGOs (all free)",
                      "Multi-region reporting (EU/US/APAC)",
                      "SSO/SAML + SOC 2",
                      "SLA-backed 72h verification",
                    ].map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-xs text-slate-600"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mb-5 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4980C] mb-2">
                    Free for NGO Partners
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Priority verification support so their reporting needs are
                    always met — zero cost to them.
                  </p>
                </div>
                <div className="mb-4 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] text-slate-500 leading-snug">
                    +$8/outcome overage · +$10K/region · +$12K Pre-Audit Package
                    · Custom integrations
                  </p>
                </div>
                <Button
                  onClick={() => setPricingPlan("enterprise")}
                  variant="outline"
                  className="w-full border-[#0A1F44] text-[#0A1F44] hover:bg-[#0A1F44] hover:text-white font-semibold rounded-xl text-sm"
                >
                  Talk to Sales
                </Button>
              </div>
            </div>

            {/* What happens next */}
            <div className="rounded-2xl bg-[#0A1F44] px-6 py-6 md:px-8 md:py-7">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-5">
                What happens next
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    step: "1",
                    title: "Send your enquiry",
                    desc: "Fill in the form — takes 60 seconds. We'll receive it instantly.",
                  },
                  {
                    step: "2",
                    title: "30-min discovery call",
                    desc: "We'll map your ESG reporting goals and confirm the right plan for your team.",
                  },
                  {
                    step: "3",
                    title: "Start your Pilot",
                    desc: "Go live in days. First verified impact report delivered within 90 days.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#D4980C] flex items-center justify-center">
                      <span className="text-[11px] font-extrabold text-white">{item.step}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{item.title}</p>
                      <p className="text-xs text-blue-200 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why NGOs Love Synerxus */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 md:p-8">
              <div className="mb-5">
                <h3 className="text-base font-extrabold text-[#0A1F44] mb-1">
                  Why NGOs verify outcomes for free — and why that matters to
                  you
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  This isn't charity. It's how we build the supply-side network
                  that makes your impact data defensible.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                  {
                    icon: <FileCheck className="h-4 w-4 text-[#D4980C]" />,
                    title: "Funding tool",
                    desc: 'Auto-generated "Verified Impact Summary" PDFs they can send to any funder.',
                  },
                  {
                    icon: <Clock className="h-4 w-4 text-[#D4980C]" />,
                    title: "1-tap verification",
                    desc: "Takes <15 seconds — no app, no login, no training required.",
                  },
                  {
                    icon: <ShieldCheck className="h-4 w-4 text-[#D4980C]" />,
                    title: "Credibility boost",
                    desc: '"Verified by Synerxus" badge increases NGO credibility with funders.',
                  },
                  {
                    icon: <CheckCircle className="h-4 w-4 text-[#D4980C]" />,
                    title: "Zero cost",
                    desc: "No fees, no contracts, no hidden costs — ever.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#D4980C]/10 flex items-center justify-center mt-0.5">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0A1F44]">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-500 max-w-xl">
                  Competitors like Benevity and YourCause track self-reported
                  hours but don't verify outcomes at the source. Synerxus makes
                  verification free for NGOs—creating a network effect that
                  makes your ESG data permanently more defensible than any tool
                  that doesn't prioritize verification at the source.
                </p>
                <Button
                  onClick={() => setPricingPlan("pilot")}
                  size="sm"
                  className="flex-shrink-0 bg-[#0A1F44] hover:bg-[#0d2a5e] text-white font-semibold rounded-xl whitespace-nowrap"
                >
                  Book a Demo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 9: Final CTA ── */}
        <section className="bg-[#0A1F44] relative overflow-hidden">
          {/* Background image — right half, fades into navy on the left */}
          <div className="hidden md:block absolute inset-y-0 right-0 w-1/2 pointer-events-none">
            <img
              src={heroSlide3}
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
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="bg-[#D4980C] hover:bg-[#B07F0A] text-[#0A1F44] font-bold px-8 rounded-xl shadow-lg"
                  >
                    Start Free Trial
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setPricingPlan("pilot")}
                  className="border-2 border-white text-white font-bold px-8 rounded-xl hover:bg-white hover:text-[#0A1F44] transition-colors"
                >
                  Book a Demo
                </Button>
              </div>
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
                    NGO-Confirmed Outcomes
                  </p>
                  <p className="text-xs text-slate-500">
                    Every outcome is verified by the receiving NGO partner
                    within a 72-hour window. NGO staff can confirm or refine the
                    SDG tag before the record is locked.
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
                    mapping, producing audit-ready evidence aligned to all 17 UN
                    SDGs and ESRS S3/S4 for CSRD disclosure.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setPricingPlan("pilot")}
              className="w-full bg-[#D4980C] hover:bg-[#B07F0A] text-white font-semibold rounded-xl"
            >
              Book a Demo with Synerxus
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
