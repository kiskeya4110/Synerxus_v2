import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, FileCheck2, GitBranch, Layers3, Paperclip, ShieldCheck, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { EvidenceAlignmentBanner, SectionHeader } from "@/components/marketing/marketing-sections";
import { evidenceLadderLevels, insights, primaryUseCases } from "@/components/marketing/marketing-data";
import { SDG_GOALS } from "@shared/sdg-goals";

const evidencePreviewTabs = [
  {
    id: "claim",
    label: "Claim",
    step: 1,
    title: "Claim scope",
    body: "Define the exact sustainability claim, reporting period, location, owner, and ESG category before evidence is attached.",
    headerStatus: "Claim scoped",
    headerStatusStyle: "border-blue-200 bg-blue-50 text-blue-700",
    fields: [
      { label: "Claim ID", value: "EO-2047", type: "text" },
      { label: "ESG Category", value: "Social / Workforce", type: "text" },
      { label: "Reporting Period", value: "Q2 2026", type: "text" },
      { label: "Location", value: "Sacramento County, CA", type: "text" },
      { label: "Evidence Owner", value: "ESG program team", type: "text" },
      { label: "Claim", value: "240 residents completed solar workforce training", type: "text" },
    ],
  },
  {
    id: "evidence",
    label: "Evidence",
    step: 2,
    title: "Source documentation",
    body: "Attach the records that support the claim before it moves into partner review.",
    headerStatus: "5 files attached",
    headerStatusStyle: "border-blue-200 bg-blue-50 text-blue-700",
    fields: [
      { label: "Attendance logs", value: "Attached", type: "file" },
      { label: "Completion certificates", value: "Attached", type: "file" },
      { label: "Partner report", value: "Attached", type: "file" },
      { label: "Site photos", value: "Attached", type: "file" },
      { label: "Training roster", value: "Attached", type: "file" },
    ],
  },
  {
    id: "confirmation",
    label: "Confirmation",
    step: 3,
    title: "Partner-confirmed outcome",
    body: "Invite a partner, supplier, or implementation team to confirm, comment, or flag the claim.",
    headerStatus: "Partner-confirmed",
    headerStatusStyle: "border-emerald-200 bg-emerald-50 text-emerald-700",
    fields: [
      { label: "Reviewer", value: "Local workforce partner", type: "text" },
      { label: "Confirmation date", value: "May 2026", type: "text" },
      { label: "Confirmation status", value: "Partner-confirmed", type: "status" },
      { label: "Reviewer notes", value: "Outcome supported by attached records", type: "text" },
    ],
  },
  {
    id: "reporting",
    label: "Preserve",
    step: 4,
    title: "Preserved review record",
    body: "Map the Evidence Object to frameworks and preserve a reviewable record for reporting support and internal review.",
    headerStatus: "Review-ready",
    headerStatusStyle: "border-emerald-200 bg-emerald-50 text-emerald-700",
    fields: [
      { label: "Evidence Ladder", value: "Level 4 — Framework-Mapped", type: "text" },
      { label: "Chain of custody", value: "Active", type: "text" },
      { label: "GRI", value: "Social impact indicators", type: "framework" },
      { label: "Report inclusion status", value: "Review-ready", type: "status" },
      { label: "SDG 7", value: "Mapped", type: "framework" },
      { label: "SDG 8", value: "Mapped", type: "framework" },
    ],
  },
];

const heroSlides = [
  {
    desktopSrc: "/optimized/hero-evidence-1-1920.webp",
    mobileSrc: "/optimized/hero-evidence-1-960.webp",
    alt: "Enterprise ESG infrastructure and evidence review workspace",
  },
  {
    desktopSrc: "/optimized/hero-evidence-2-1920.webp",
    mobileSrc: "/optimized/hero-evidence-2-960.webp",
    alt: "Sustainability operations and structured evidence documentation",
  },
  {
    desktopSrc: "/optimized/hero-evidence-3-1920.webp",
    mobileSrc: "/optimized/hero-evidence-3-960.webp",
    alt: "Partner confirmation and ESG evidence mapping environment",
  },
  {
    desktopSrc: "/optimized/hero-evidence-4-1920.webp",
    mobileSrc: "/optimized/hero-evidence-4-960.webp",
    alt: "Reviewable ESG evidence record and reporting infrastructure",
  },
];

const heroStatusChips = [
  { label: "Partner-Confirmed", slideIndex: 2 },
  { label: "Evidence Ladder: Level 4", slideIndex: 1 },
  { label: "Chain of Custody Active", slideIndex: 0 },
  { label: "Mapped With Limits", slideIndex: 3 },
];

const evidenceProgressSteps = [
  "Claim scoped",
  "Evidence attached",
  "Partner-confirmed",
  "Preserved",
];

const evidenceCategoryCards = [
  {
    title: "Self-reported",
    body: "Submitted activity or output data that has not yet been confirmed.",
    treatment: "Kept out of verified totals",
  },
  {
    title: "Partner-confirmed",
    body: "Records confirmed by an authorized partner or verifier through the configured workflow.",
    treatment: "Can support verified workflow totals",
  },
  {
    title: "Source-supported",
    body: "Partner-confirmed records with attached or referenced source artifacts.",
    treatment: "Tracked separately from confirmation",
  },
  {
    title: "Partner-reported",
    body: "Reach, beneficiary, community, or participation figures reported by partners.",
    treatment: "Reported separately",
  },
  {
    title: "Mapped",
    body: "SDG, framework, or reporting-category alignment generated as classification context.",
    treatment: "Thematic alignment only",
  },
];

const evidenceGapCards = [
  {
    num: "01",
    title: "Fragmented evidence",
    body: "Source records are scattered across tools, teams, partners, and inboxes.",
    response: {
      subtitle: "Synerxus packages the source record around the exact claim being reviewed, so teams know what evidence supports what statement.",
      checklist: ["Source record", "File attachments", "Document links", "Team ownership", "Submission date", "Storage audit trail"],
      badge: "Evidence packaged per claim",
      card: {
        claim: "Water access program delivery",
        status: "Source-attached",
        statusColor: "#0A1F44",
        framework: "SDG 6 / GRI 303",
        reportUse: "Internal review",
      },
    },
  },
  {
    num: "02",
    title: "Weak confirmation",
    body: "Partner activity is rarely connected to the exact claim being reported.",
    response: {
      subtitle: "Focused review requests let partners confirm, clarify, or flag claims without being pulled into a full reporting platform.",
      checklist: ["Partner invitation", "Claim summary", "Confirmation response", "Clarification thread", "Flag record", "Review timestamp"],
      badge: "Partner confirmation tracked",
      card: {
        claim: "Supplier training delivery",
        status: "Partner-confirmed",
        statusColor: "#D4980C",
        framework: "GRI 414 / ESRS S1",
        reportUse: "Assurance preparation support",
      },
    },
  },
  {
    num: "03",
    title: "Disclosure risk",
    body: "Claims without reviewable evidence create reputational and regulatory exposure.",
    response: {
      subtitle: "Evidence Ladder status shows whether a claim is source-backed, partner-confirmed, framework-mapped, or ready for review.",
      checklist: ["Evidence Ladder status", "Source record", "Partner confirmation", "Framework alignment", "Review readiness", "Review history"],
      badge: "Structured for reporting and assurance support",
      card: {
        claim: "Community program output",
        status: "Partner-confirmed",
        statusColor: "#D4980C",
        framework: "SDG 6 / GRI 413 / ESRS S3",
        reportUse: "Assurance preparation support",
      },
    },
  },
];

const howSteps = [
  {
    title: "Create the claim",
    body: "Define the claim text, reporting entity, program, reporting period, claim type, owner, and evidence requirement.",
    Icon: FileCheck2,
  },
  {
    title: "Attach source evidence",
    body: "Attach source artifacts such as logs, forms, photos, partner reports, CRM exports, certificates, and supporting documents.",
    Icon: Paperclip,
  },
  {
    title: "Invite partner confirmation",
    body: "Ask the authorized partner or verifier to confirm, comment on, or flag the activity and output record.",
    Icon: UserCheck,
  },
  {
    title: "Map to frameworks",
    body: "Apply SDG and framework mappings as a derived classification layer with rationale, evidence basis, and confidence.",
    Icon: GitBranch,
  },
  {
    title: "Preserve reviewable record",
    body: "Preserve the claim-linked evidence packet with confidence tier, exception status, source references, boundary notes, and review history.",
    Icon: ShieldCheck,
  },
];

const valueCards = [
  {
    title: "Defensible claims",
    body: "Move from unsupported ESG language to evidence-backed claim records.",
    detail: "Each claim carries source documentation, owner context, review status, and disclosure-readiness signals.",
    structured: ["Source documentation", "Owner context", "Review status", "Report-use boundaries"],
  },
  {
    title: "Partner-confirmed outcomes",
    body: "Give trusted partners a focused way to confirm or flag the claim.",
    detail: "The confirmation is preserved with reviewer identity, response status, notes, and timestamps.",
    structured: ["Reviewer identity", "Response status", "Notes", "Timestamps"],
  },
  {
    title: "Chain-of-custody records",
    body: "Preserve who submitted, reviewed, confirmed, and changed the record.",
    detail: "Teams can trace which version was used in reporting and what changed before disclosure review.",
    structured: ["Submission history", "Reviewer actions", "Version tracking", "Disclosure version log"],
  },
  {
    title: "Framework-ready evidence",
    body: "Use one Evidence Object across multiple reporting pathways.",
    detail: "A claim-linked evidence packet can support GRI, CSRD/ESRS, SDG, investor, board, and internal scorecard review when mappings are clearly labeled.",
    structured: ["GRI alignment", "CSRD/ESRS mapping", "SDG crosswalk", "Investor summary support"],
  },
];

const useCaseDetail = [
  {
    claimType: "Annual ESG statement",
    evidenceSources: ["Audit reports", "Utility data", "Governance records"],
    framework: "GRI / ESRS / TCFD",
    status: "Review-ready",
  },
  {
    claimType: "Sustainability marketing statement",
    evidenceSources: ["Product certifications", "Partner attestations", "Lab results"],
    framework: "GRI 308 / ISO 14064",
    status: "Source-attached",
  },
  {
    claimType: "Supplier sustainability review",
    evidenceSources: ["Vendor self-assessments", "Field inspection records", "Certifications"],
    framework: "GRI 308 / ESRS S2",
    status: "Partner-confirmed",
  },
  {
    claimType: "Community benefit output",
    evidenceSources: ["Program delivery records", "Partner confirmation", "Outcome documentation"],
    framework: "SDG 11 / GRI 413 / ESRS S3",
    status: "Partner-confirmed",
  },
];

const resourceTopics = [
  "Evidence fundamentals",
  "Claim defensibility",
  "Partner evidence",
  "Risk & disclosure",
];

const sdgEvidenceExamples: Record<number, string> = {
  1: "Income support, essential services, and community resilience records.",
  2: "Food distribution, nutrition programs, community gardens, and pantry outputs.",
  3: "Health screenings, wellness programs, care access, and public health outputs.",
  4: "Tutoring, mentoring, training, literacy, STEM, and skills-learning outputs.",
  5: "Women and girls empowerment, protection, access, and participation outputs.",
  6: "Clean water, sanitation, hygiene, wells, filters, and water-quality outputs.",
  7: "Solar access, clean-energy installation, efficiency, and off-grid power outputs.",
  8: "Workforce training, job readiness, entrepreneurship, and livelihood outputs.",
  9: "Infrastructure, digital access, engineering, research, and innovation outputs.",
  10: "Inclusion, accessibility, refugee support, equity, and reduced-barrier outputs.",
  11: "Housing, public spaces, local resilience, transport, and community outputs.",
  12: "Waste reduction, recycling, responsible sourcing, and circularity outputs.",
  13: "Climate adaptation, resilience, education, restoration, and emissions-related outputs.",
  14: "Marine protection, coastal cleanup, fishery, and waterway restoration outputs.",
  15: "Tree planting, biodiversity, habitat, reforestation, and land restoration outputs.",
  16: "Rights access, transparency, safety, civic participation, and governance outputs.",
  17: "Cross-sector partnerships, implementation support, and shared measurement outputs.",
};

const sdgIconPaths: Record<number, string> = {
  1: "/sdg-icons/E_SDG_PRINT-01_1762550174893.jpg",
  2: "/sdg-icons/E_SDG_PRINT-02_1762550174896.jpg",
  3: "/sdg-icons/E_SDG_PRINT-03_1762550174898.jpg",
  4: "/sdg-icons/E_SDG_PRINT-04_1762550174899.jpg",
  5: "/sdg-icons/E_SDG_PRINT-05_1762550174900.jpg",
  6: "/sdg-icons/E_SDG_PRINT-06_1762550174902.jpg",
  7: "/sdg-icons/E_SDG_PRINT-07_1762550174903.jpg",
  8: "/sdg-icons/E_SDG_PRINT-08_1762550174904.jpg",
  9: "/sdg-icons/E_SDG_PRINT-09_1762550174905.jpg",
  10: "/sdg-icons/E_SDG_PRINT-10_1762550174906.jpg",
  11: "/sdg-icons/E_SDG_PRINT-11_1762550174908.jpg",
  12: "/sdg-icons/E_SDG_PRINT-12_1762550174909.jpg",
  13: "/sdg-icons/E_SDG_PRINT-13_1762550174910.jpg",
  14: "/sdg-icons/E_SDG_PRINT-14_1762550174911.jpg",
  15: "/sdg-icons/E_SDG_PRINT-15_1762550174912.jpg",
  16: "/sdg-icons/E_SDG_PRINT-16_1762550174914.jpg",
  17: "/sdg-icons/E_SDG_PRINT-17_1762550174915.jpg",
};

function SDGMappingPreview() {
  const [activeSdg, setActiveSdg] = useState(13);
  const activeGoal = SDG_GOALS[activeSdg];

  return (
    <section id="sdg-mapping" className="border-y border-slate-100 bg-white py-5 md:py-7">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
            SDG Mapping Example
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#0A1F44] md:text-4xl">
            Connect partner-confirmed outputs to SDG-aligned reporting context.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Synerxus maps verified evidence records to relevant UN Sustainable
            Development Goals, while keeping the claim attached to the
            underlying output, verifier context, location, and reporting export.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Output", "What was delivered"],
              ["SDG Context", "Which goal it supports"],
              ["Evidence Record", "Who confirmed it and what supports the claim"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-extrabold text-[#0A1F44]">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9 lg:grid-cols-9 lg:gap-2">
            {Array.from({ length: 17 }, (_, index) => index + 1).map((n) => {
              const goal = SDG_GOALS[n];
              const isActive = activeSdg === n;

              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setActiveSdg(n)}
                  aria-pressed={isActive}
                  aria-label={`Show details for SDG ${n}: ${goal.name}`}
                  className={`relative aspect-square overflow-hidden rounded-md border bg-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1F44]/40 lg:rounded-lg ${
                    isActive
                      ? "scale-[1.08] shadow-md"
                      : "opacity-85 hover:scale-[1.05] hover:opacity-100 hover:shadow-sm"
                  }`}
                  style={{
                    borderColor: isActive ? goal.color : "#e2e8f0",
                    boxShadow: isActive ? `0 0 0 2px ${goal.color}33` : undefined,
                  }}
                >
                  <img
                    src={sdgIconPaths[n]}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>

          <div
            className="mt-5 rounded-2xl border p-5"
            style={{
              borderColor: `${activeGoal.color}55`,
              backgroundColor: `${activeGoal.color}0D`,
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-extrabold text-white"
                    style={{ backgroundColor: activeGoal.color }}
                  >
                    SDG {activeSdg}
                  </span>
                  <h3 className="text-lg font-extrabold text-[#0A1F44]">{activeGoal.name}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  Used as framework context for verified outputs related to{" "}
                  {sdgEvidenceExamples[activeSdg].toLowerCase()}
                </p>
                <p className="mt-3 text-sm font-semibold text-[#0A1F44]">
                  Boundary note:{" "}
                  <span className="font-medium text-slate-600">
                    SDG mapping does not constitute UN endorsement,
                    certification, compliance determination, or causal impact
                    proof.
                  </span>
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {activeGoal.targets.slice(0, 3).map((target) => (
                    <span
                      key={target}
                      className="rounded-full border bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
                      style={{ borderColor: `${activeGoal.color}55` }}
                    >
                      {target}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            SDGs are one mapping example. Synerxus also supports evidence
            organization for GRI, SASB, ESRS, ISSB, CSRD, and assurance
            preparation workflows where applicable.
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Sustainable Development Goals (SDGs) are a registered trademark of the United Nations.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function MarketingHome() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches || heroPaused) return;

    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [heroPaused]);

  useEffect(() => {
    const nextSlide = heroSlides[(activeSlide + 1) % heroSlides.length];
    const image = new Image();
    image.src = window.matchMedia("(min-width: 768px)").matches
      ? nextSlide.desktopSrc
      : nextSlide.mobileSrc;
  }, [activeSlide]);

  const [activeEvidenceTab, setActiveEvidenceTab] = useState(evidencePreviewTabs[0]);
  const [activeLevelKey, setActiveLevelKey] = useState("");
  const [activeGap, setActiveGap] = useState(0);
  const [activeHowStep, setActiveHowStep] = useState(0);
  const [activeValue, setActiveValue] = useState(0);
  const [activeUseCase, setActiveUseCase] = useState(0);
  const [activeResource, setActiveResource] = useState(0);
  const ladderPreviewLevels = evidenceLadderLevels.slice().reverse();
  const ladderLevel = evidenceLadderLevels.find((level) => level.level === activeLevelKey) ?? null;
  const useCasePreview = [primaryUseCases[0], primaryUseCases[1], primaryUseCases[2], primaryUseCases[4]];
  const resourcePreview = insights.slice(0, 4);

  useEffect(() => {
    if (window.location.hash !== "#hero") return;

    const hero = document.getElementById("hero");
    if (!hero) return;

    window.requestAnimationFrame(() => {
      hero.scrollIntoView({ behavior: "smooth", block: "start" });
      hero.focus({ preventScroll: true });
    });
  }, []);

  return (
    <MarketingLayout>
      <section id="hero" tabIndex={-1} className="relative overflow-hidden bg-white">
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-4 md:px-8 lg:min-h-[560px] lg:grid-cols-[minmax(420px,0.52fr)_minmax(0,0.48fr)] lg:items-stretch lg:gap-0 lg:py-7 xl:min-h-[600px]">
          <div
            className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 shadow-2xl shadow-slate-900/15 lg:aspect-auto lg:h-full lg:rounded-r-none"
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
          >
            {heroSlides.map((slide, i) => {
              const isActive = i === activeSlide;

              return (
                <picture
                  key={slide.desktopSrc}
                  className={`absolute inset-0 block transition-opacity [transition-duration:1600ms] ease-out ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden={!isActive}
                >
                  <source media="(min-width: 768px)" srcSet={slide.desktopSrc} />
                  <source media="(max-width: 767px)" srcSet={slide.mobileSrc} />
                  <img
                    src={slide.mobileSrc}
                    alt={isActive ? slide.alt : ""}
                    className={`h-full w-full object-cover object-center motion-reduce:animate-none ${
                      isActive ? "animate-[heroSlowZoom_6500ms_ease-out_forwards]" : "scale-100"
                    }`}
                    width="960"
                    height="720"
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                </picture>
              );
            })}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#061A36]/20 via-transparent to-[#D4980C]/10" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-40 bg-gradient-to-r from-transparent via-white/25 to-white lg:block" aria-hidden="true" />

            <div className="absolute inset-x-4 bottom-12 z-20 flex justify-center md:bottom-14">
              <div className="flex max-w-[92%] flex-wrap justify-center gap-2">
                {heroStatusChips.map((chip) => {
                  const isActive = activeSlide === chip.slideIndex;

                  return (
                    <button
                      key={chip.label}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveSlide(chip.slideIndex)}
                      onFocus={() => setHeroPaused(true)}
                      onBlur={() => setHeroPaused(false)}
                      onMouseEnter={() => setHeroPaused(true)}
                      onMouseLeave={() => setHeroPaused(false)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4980C]/60 sm:text-xs ${
                        isActive
                          ? "border-[#0A1F44] bg-[#0A1F44] text-[#D4980C]"
                          : "border-slate-200 bg-white/85 text-[#0A1F44] hover:border-[#D4980C]/70 hover:bg-[#FFFBF0]"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="absolute bottom-6 left-5 flex gap-1 md:left-10">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-1.5 rounded-full bg-[#D4980C] transition-all [transition-duration:2500ms] ease-in-out ${
                    i === activeSlide ? "w-6 opacity-100" : "w-2 opacity-30"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="relative flex min-w-0 items-center overflow-hidden rounded-2xl bg-white lg:rounded-l-none lg:pl-12">
            {heroSlides.map((slide, i) => {
              const isActive = i === activeSlide;

              return (
                <picture
                  key={`${slide.desktopSrc}-text-fade`}
                  className={`pointer-events-none absolute inset-0 hidden transition-opacity [transition-duration:1600ms] ease-out lg:block ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden="true"
                >
                  <source media="(min-width: 768px)" srcSet={slide.desktopSrc} />
                  <img
                    src={slide.desktopSrc}
                    alt=""
                    className={`h-full w-full object-cover object-center opacity-[0.16] motion-reduce:animate-none ${
                      isActive ? "animate-[heroSlowZoom_6500ms_ease-out_forwards]" : "scale-100"
                    }`}
                    width="1920"
                    height="1080"
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                </picture>
              );
            })}
            <div
              className="pointer-events-none absolute inset-0 hidden lg:block"
              style={{
                background:
                  "linear-gradient(to right, rgba(255,255,255,0.74) 0%, rgba(255,255,255,0.92) 30%, rgba(255,255,255,0.985) 62%, #ffffff 100%)",
              }}
              aria-hidden="true"
            />
            <div className="relative max-w-2xl animate-[fadeIn_700ms_ease-out] py-8 lg:py-12">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
                SYNERXUS · ESG EVIDENCE INFRASTRUCTURE
              </p>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
                Claim-level evidence for{" "}
                <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#D4980C" }}>
                  defensible
                </span>{" "}
                ESG and social-impact reporting.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                Synerxus turns each claim into a structured evidence record:
                what evidence supports it, who confirmed it, what remains
                unverified, and what the claim does not prove.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
                  <Link href="/request-assessment">Request Assessment</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-[#0A1F44] text-[#0A1F44] hover:bg-[#0A1F44] hover:text-[#D4980C]">
                  <Link href="/platform">
                    View Sample Evidence Object <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="mt-5 text-sm font-semibold text-[#0A1F44]">
                No ESG or social-impact claim should be reported without knowing the evidence behind it.
              </p>
              <div className="mt-4 rounded-lg bg-slate-50/80 px-3 py-2 text-xs leading-relaxed text-slate-500">
                <strong className="font-semibold text-slate-600">
                  Assurance boundary:
                </strong>{" "}
                Synerxus supports assurance preparation and ESG evidence
                organization. It does not replace independent assurance
                providers, legal counsel, accounting advisors, or guarantee
                regulatory compliance.
              </div>
            </div>
          </div>
        </div>
      </section>

      <EvidenceAlignmentBanner />

      <section id="platform" className="bg-white py-6 md:py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Evidence Object Preview"
            title="Synerxus creates structured Evidence Objects."
            body="A concise claim record that connects the sustainability claim to source evidence, partner confirmation, chain of custody, and reporting context."
          />
          <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start">
            {/* Left — step nav + context */}
            <div>
              <div className="grid grid-cols-4 gap-1.5 lg:flex lg:flex-col lg:overflow-visible">
                {evidencePreviewTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveEvidenceTab(tab)}
                    aria-pressed={activeEvidenceTab.id === tab.id}
                    className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-center transition-all lg:flex-row lg:items-center lg:gap-3 lg:px-4 lg:text-left ${
                      activeEvidenceTab.id === tab.id
                        ? "border-[#0A1F44] bg-[#0A1F44]"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold transition-colors ${
                      activeEvidenceTab.id === tab.id ? "bg-[#D4980C] text-[#0A1F44]" : "bg-slate-200 text-slate-500"
                    }`}>
                      {tab.step}
                    </span>
                    <span className={`text-[9px] font-bold leading-tight tracking-tight transition-colors sm:text-[10px] lg:text-sm ${
                      activeEvidenceTab.id === tab.id ? "text-[#D4980C]" : "text-[#0A1F44]"
                    }`}>
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-4 hidden rounded-xl border border-slate-100 bg-slate-50 p-4 lg:block">
                <p className="text-sm font-bold text-[#0A1F44]">{activeEvidenceTab.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{activeEvidenceTab.body}</p>
              </div>
              <Button asChild className="mt-4 hidden w-full bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a] lg:flex">
                <Link href="/platform">Explore Platform</Link>
              </Button>
            </div>

            {/* Right — Evidence Object card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Evidence Object</p>
                  <p className="mt-0.5 text-lg font-extrabold text-[#0A1F44]">EO-2047</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${activeEvidenceTab.headerStatusStyle}`}>
                  {activeEvidenceTab.headerStatus}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {activeEvidenceTab.fields.map((field) => {
                  if (field.type === "file") {
                    return (
                      <div key={field.label} className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                        <FileCheck2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{field.label}</p>
                          <p className="text-xs font-semibold text-emerald-700">{field.value}</p>
                        </div>
                      </div>
                    );
                  }
                  if (field.type === "status") {
                    return (
                      <div key={field.label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{field.label}</p>
                        <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="min-w-0 break-words">{field.value}</span>
                        </span>
                      </div>
                    );
                  }
                  if (field.type === "framework") {
                    return (
                      <div key={field.label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{field.label}</p>
                        <span className="mt-1 inline-block max-w-full rounded-full bg-[#0A1F44] px-2.5 py-0.5 text-xs font-bold text-[#D4980C]">
                          {field.value}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={field.label} className="rounded-lg border border-[#D4980C]/30 bg-[#D4980C]/10 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{field.label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800">{field.value}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                <div className="flex gap-1.5">
                  {evidenceProgressSteps.map((step, i) => {
                    const stepNum = i + 1;
                    const isDone = stepNum < activeEvidenceTab.step;
                    const isCurrent = stepNum === activeEvidenceTab.step;
                    return (
                      <span
                        key={step}
                        title={step}
                        className={`h-1.5 rounded-full transition-all ${
                          isCurrent ? "w-6 bg-[#D4980C]" : isDone ? "w-4 bg-[#0A1F44]/40" : "w-4 bg-slate-200"
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-xs text-slate-500">
                  Step {activeEvidenceTab.step} of {evidenceProgressSteps.length}: {evidenceProgressSteps[activeEvidenceTab.step - 1]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="evidence-ladder" className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Evidence Ladder Preview"
            title="The Evidence Ladder shows claim defensibility."
            body="Tap any level to see what it means and what action to take."
          />
          <div className="relative">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
              {ladderPreviewLevels.map((level) => (
                <button
                  key={level.level}
                  type="button"
                  onClick={() => setActiveLevelKey((prev) => (prev === level.level ? "" : level.level))}
                  aria-pressed={activeLevelKey === level.level}
                  className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    activeLevelKey === level.level
                      ? "border-[#0A1F44] bg-[#0A1F44] shadow-xl"
                      : "border-slate-200 bg-white text-slate-700 hover:border-[#D4980C]/50"
                  }`}
                >
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${activeLevelKey === level.level ? "text-[#D4980C]/70" : "text-slate-400"}`}>{level.level}</p>
                  <h3 className={`mt-1 font-extrabold ${activeLevelKey === level.level ? "text-[#D4980C]" : "text-[#0A1F44]"}`}>{level.title}</h3>
                  <span className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${activeLevelKey === level.level ? "border-[#D4980C]/30 bg-[#D4980C]/15 text-[#D4980C]" : "border-slate-200 text-slate-500"}`}>{level.risk}</span>
                </button>
              ))}
            </div>

            {ladderLevel && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 rounded-3xl bg-slate-900/55 backdrop-blur-sm"
                  onClick={() => setActiveLevelKey("")}
                  aria-hidden="true"
                />
                <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#D4980C]">{ladderLevel.level}</p>
                      <h3 className="mt-1 text-xl font-extrabold text-[#0A1F44]">{ladderLevel.title}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveLevelKey("")}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="mt-3 inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">{ladderLevel.risk} risk</span>
                  {ladderLevel.level === "Level 4" && (
                    <div className="mt-4 rounded-xl border border-[#D4980C]/25 bg-[#D4980C]/10 p-3">
                      <Logo size="xs" clickable={false} />
                    </div>
                  )}
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">{ladderLevel.meaning}</p>
                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recommended action</p>
                    <p className="mt-1.5 text-sm font-semibold text-slate-700">{ladderLevel.action}</p>
                  </div>
                  <Button asChild className="mt-5 w-full bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
                    <Link href="/evidence-ladder">Explore Evidence Ladder</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white py-6 md:py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="mb-8 text-center text-base font-semibold text-slate-500">
            ESG and social-impact claims are hard to defend when evidence, confirmation, reach, and mapping are blurred.
          </p>
          <div className="grid gap-6 md:grid-cols-2 md:items-start">
            {/* Left column — Evidence Gap */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4980C]">The Evidence Gap</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-col">
                {evidenceGapCards.map((item, index) => (
                  <button
                    key={item.num}
                    type="button"
                    onClick={() => setActiveGap(index)}
                    onMouseEnter={() => setActiveGap(index)}
                    onFocus={() => setActiveGap(index)}
                    aria-pressed={activeGap === index}
                    className={`flex min-w-0 items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all sm:px-4 ${
                      activeGap === index
                        ? "border-[#0A1F44] bg-[#0A1F44]"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                      activeGap === index ? "bg-[#D4980C]/20 text-[#D4980C]" : "bg-slate-200 text-slate-500"
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className={`text-xs font-bold leading-tight transition-colors sm:text-sm ${
                        activeGap === index ? "text-[#D4980C]" : "text-[#0A1F44]"
                      }`}>
                        {item.title}
                      </p>
                      <p className={`mt-0.5 text-[11px] leading-relaxed transition-colors sm:text-xs ${
                        activeGap === index ? "text-[#D4980C]/70" : "text-slate-500"
                      }`}>
                        {item.body}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right column — Synerxus Response */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4980C]">Synerxus Response</p>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D4980C]/30 bg-[#D4980C]/10 px-2.5 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D4980C]" />
                  <span className="min-w-0 text-[11px] font-semibold text-[#0A1F44]">{evidenceGapCards[activeGap].response.badge}</span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {evidenceGapCards[activeGap].response.subtitle}
              </p>
              <ul className="mt-4 flex flex-col gap-1.5">
                {evidenceGapCards[activeGap].response.checklist.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#0A1F44]">
                      <svg width="7" height="5" viewBox="0 0 8 6" fill="none" aria-hidden="true">
                        <path d="M1 3l2 2 4-4" stroke="#D4980C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-slate-200 pt-4 flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Evidence record</p>
                <div className="grid grid-cols-2 items-start gap-2">
                  <span className="text-xs text-slate-500">Claim supported</span>
                  <span className="text-right text-xs font-semibold leading-snug text-[#0A1F44]">{evidenceGapCards[activeGap].response.card.claim}</span>
                </div>
                <div className="grid grid-cols-2 items-start gap-2">
                  <span className="text-xs text-slate-500">Evidence status</span>
                  <span className="text-right text-xs font-semibold leading-snug" style={{ color: evidenceGapCards[activeGap].response.card.statusColor }}>
                    {evidenceGapCards[activeGap].response.card.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 items-start gap-2">
                  <span className="text-xs text-slate-500">Framework alignment</span>
                  <span className="text-right text-xs font-semibold leading-snug text-[#0A1F44]">{evidenceGapCards[activeGap].response.card.framework}</span>
                </div>
                <div className="grid grid-cols-2 items-start gap-2">
                  <span className="text-xs text-slate-500">Report use</span>
                  <span className="text-right text-xs font-semibold leading-snug text-slate-600">{evidenceGapCards[activeGap].response.card.reportUse}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="How Synerxus Works"
            title="Create claim. Attach evidence. Confirm. Map. Preserve."
            body="Select any step to see how the evidence workflow keeps the claim connected to support, confirmation, classification, and limitations."
          />
          <div className="relative">
            <div className="absolute left-[5%] right-[5%] top-5 hidden h-px bg-slate-200 md:block" />
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 md:gap-4">
              {howSteps.map((step, index) => (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setActiveHowStep(index)}
                  aria-pressed={activeHowStep === index}
                  className="flex min-w-0 flex-col items-center gap-2 text-center"
                >
                  <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold transition-all sm:h-10 sm:w-10 sm:text-sm ${
                    activeHowStep === index
                      ? "bg-[#0A1F44] text-[#D4980C] shadow-lg"
                      : "border-2 border-slate-200 bg-white text-slate-400 hover:border-[#D4980C]/50 hover:text-[#0A1F44]"
                  }`}>
                    {index + 1}
                  </span>
                  <span className={`text-[10px] font-bold leading-tight sm:text-xs ${
                    activeHowStep === index ? "text-[#0A1F44]" : "text-slate-500"
                  }`}>
                    {step.title}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-6 rounded-3xl bg-[#0A1F44] p-5 md:p-8">
              <div key={activeHowStep} className="flex animate-in fade-in items-center justify-between gap-6 duration-300">
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#D4980C]">
                    Step {activeHowStep + 1} of {howSteps.length}
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold text-white">{howSteps[activeHowStep].title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-slate-300">
                    {howSteps[activeHowStep].body}
                  </p>
                </div>
                <div className="hidden shrink-0 items-center justify-center md:flex">
                  {(() => {
                    const Icon = howSteps[activeHowStep].Icon;
                    return <Icon className="h-[4.9rem] w-[4.9rem] text-[#D4980C]" strokeWidth={1.5} />;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow="Evidence Categories"
            title="Separate evidence records from reach figures and mappings."
            body="Synerxus keeps each evidence category visible so reporting teams do not treat self-reported activity, partner-reported reach, source artifacts, and SDG mapping as the same thing."
          />
          <div className="grid gap-3 md:grid-cols-5">
            {evidenceCategoryCards.map((category) => (
              <div key={category.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-extrabold text-[#0A1F44]">{category.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{category.body}</p>
                <p className="mt-4 rounded-lg bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A5A00]">
                  {category.treatment}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="mb-10 text-center text-base font-semibold text-slate-500">Why it matters</p>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Left column — value items */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4980C]">The case for evidence</p>
              <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:gap-3">
                {valueCards.map((item, index) => {
                  const icons = [ShieldCheck, CheckCircle2, GitBranch, Layers3];
                  const Icon = icons[index] ?? FileCheck2;
                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => setActiveValue(index)}
                      onMouseEnter={() => setActiveValue(index)}
                      onFocus={() => setActiveValue(index)}
                      aria-pressed={activeValue === index}
                      className={`flex min-w-0 gap-3 rounded-2xl border p-3 text-left transition-all sm:gap-4 sm:p-4 ${
                        activeValue === index
                          ? "border-[#0A1F44] bg-[#0A1F44]"
                          : "border-transparent bg-slate-50 hover:border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className={`mt-0.5 shrink-0 transition-colors ${
                        activeValue === index ? "text-[#D4980C]" : "text-[#D4980C]"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className={`text-sm font-extrabold transition-colors sm:text-base ${
                          activeValue === index ? "text-[#D4980C]" : "text-[#0A1F44]"
                        }`}>
                          {item.title}
                        </h3>
                        <p className={`mt-1 text-xs leading-relaxed transition-colors sm:text-sm ${
                          activeValue === index ? "text-[#D4980C]/70" : "text-slate-600"
                        }`}>
                          {item.body}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right column — detail panel */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4980C]">Value highlight</p>
              <h3 className="mt-3 text-lg font-extrabold text-[#0A1F44] sm:text-xl">
                {valueCards[activeValue].title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {valueCards[activeValue].detail}
              </p>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">What's structured</p>
                <ul className="mt-3 grid grid-cols-2 gap-2">
                  {valueCards[activeValue].structured.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-xs text-slate-700 sm:text-sm">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0A1F44]">
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden="true">
                          <path d="M1 3l2 2 4-4" stroke="#D4980C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="use-cases" className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#D4980C]">Use cases</p>
          <p className="mb-8 text-center text-2xl font-extrabold text-[#0A1F44] md:text-3xl">Built for ESG claims that need proof.</p>

          {/* Tab strip */}
          <div className="flex flex-wrap justify-center gap-2">
            {useCasePreview.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setActiveUseCase(index)}
                onMouseEnter={() => setActiveUseCase(index)}
                onFocus={() => setActiveUseCase(index)}
                aria-pressed={activeUseCase === index}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  activeUseCase === index
                    ? "border-[#0A1F44] bg-[#0A1F44] text-[#D4980C]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-[#0A1F44]"
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>

          {/* Content panel */}
          <div className="mt-6 grid gap-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:grid-cols-2">
            {/* Left — use case description */}
            <div className="flex flex-col justify-between p-5 md:p-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4980C]">Use case</p>
                <h3 className="mt-3 text-xl font-extrabold text-[#0A1F44]">
                  {useCasePreview[activeUseCase].title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {useCasePreview[activeUseCase].body}
                </p>
              </div>
              <Button asChild className="mt-8 w-fit bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
                <Link href="/use-cases">Explore Use Cases</Link>
              </Button>
            </div>

            {/* Right — evidence preview */}
            <div className="border-t border-slate-100 bg-slate-50 p-5 md:border-l md:border-t-0 md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Evidence package</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start justify-between gap-2 sm:col-span-2">
                  <span className="text-xs text-slate-500">Claim type</span>
                  <span className="text-right text-xs font-semibold leading-snug text-[#0A1F44]">
                    {useCaseDetail[activeUseCase].claimType}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-3 sm:col-span-2">
                  <span className="text-xs text-slate-500">Evidence sources</span>
                  <ul className="mt-2 grid grid-cols-2 gap-1.5">
                    {useCaseDetail[activeUseCase].evidenceSources.map((src) => (
                      <li key={src} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-[#D4980C]" />
                        {src}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-3">
                  <span className="text-xs text-slate-500">Framework alignment</span>
                  <span className="text-right text-xs font-semibold leading-snug text-[#0A1F44]">
                    {useCaseDetail[activeUseCase].framework}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-3">
                  <span className="text-xs text-slate-500">Evidence status</span>
                  <span className="text-right text-xs font-semibold leading-snug text-[#D4980C]">
                    {useCaseDetail[activeUseCase].status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="resources" className="bg-white py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="mb-10 text-center text-base font-semibold text-slate-500">
            Resources for evidence-first ESG reporting
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Left column — resource list */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4980C]">Reading list</p>
              <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:gap-3">
                {resourcePreview.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setActiveResource(index)}
                    onMouseEnter={() => setActiveResource(index)}
                    onFocus={() => setActiveResource(index)}
                    aria-pressed={activeResource === index}
                    className={`flex min-w-0 gap-3 rounded-2xl border p-3 text-left transition-all sm:gap-4 sm:p-4 ${
                      activeResource === index
                        ? "border-[#0A1F44] bg-[#0A1F44]"
                        : "border-transparent bg-slate-50 hover:border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className={`mt-0.5 shrink-0 text-xl font-extrabold leading-none transition-colors sm:text-2xl ${
                      activeResource === index ? "text-[#D4980C]/40" : "text-slate-200"
                    }`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        activeResource === index ? "text-[#D4980C]/60" : "text-[#D4980C]"
                      }`}>
                        {resourceTopics[index]}
                      </p>
                      <h3 className={`mt-0.5 text-xs font-extrabold leading-snug transition-colors sm:text-sm ${
                        activeResource === index ? "text-[#D4980C]" : "text-[#0A1F44]"
                      }`}>
                        {item.title}
                      </h3>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right column — featured article panel */}
            <div className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4980C]">
                {resourceTopics[activeResource]}
              </p>
              <h3 className="mt-3 text-lg font-extrabold leading-snug text-[#0A1F44] sm:text-xl">
                {resourcePreview[activeResource].title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {resourcePreview[activeResource].body}
              </p>
              <div className="mt-auto pt-8">
                <div className="mb-5 flex gap-1.5">
                  {resourcePreview.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveResource(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeResource
                          ? "w-6 bg-[#0A1F44]"
                          : "w-1.5 bg-slate-300 hover:bg-slate-400"
                      }`}
                    />
                  ))}
                </div>
                <Button asChild className="w-fit bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]">
                  <Link href="/resources">View all resources</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SDGMappingPreview />

      <section id="request-assessment" className="bg-slate-50 py-7 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="rounded-3xl bg-[#0A1F44] p-7 md:p-12">
            <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-bold uppercase tracking-wider text-[#D4980C]">Free assessment</p>
                <h2 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
                  Assess the defensibility of your ESG claims.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-300">
                  Start with a focused review of your highest-risk or highest-visibility sustainability claims.
                </p>
                <Button asChild size="lg" className="mt-7 bg-[#D4980C] text-[#0A1F44] hover:bg-[#B07F0A]">
                  <Link href="/request-assessment">Request Assessment</Link>
                </Button>
                <p className="mt-3 text-xs text-slate-400">No commitment required.</p>
              </div>
              <div className="shrink-0 rounded-2xl bg-white/5 p-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#D4980C]">What we review</p>
                <ul className="space-y-3">
                  {[
                    "Claim-by-claim risk exposure",
                    "Evidence gaps and documentation coverage",
                    "Framework alignment (GRI, CSRD, SDGs)",
                    "Review readiness by claim type",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-200">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#D4980C]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
