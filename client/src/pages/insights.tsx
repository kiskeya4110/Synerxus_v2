import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, CheckCircle2, ChevronDown, FileText, FolderOpen, GitBranch, PackageCheck, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const NEWSLETTER_URL = "https://www.linkedin.com/build-relation/newsletter-follow?entityUrn=7454325436261498880";
const VERIFIABLE_HERO_IMAGE = "/optimized/the-verifiable-preview.png";

type ProcessStage = { title: string; body: string; detail: string; note: string; icon: typeof ShieldCheck };
type InfoArticle = { title: string; summary: string; sections: string[] };

const processStages: ProcessStage[] = [
  {
    title: "Claim Defensibility",
    body: "How to make claims specific, bounded, and easier to support.",
    icon: FolderOpen,
    detail: "Use this theme to tighten the claim itself before evidence collection begins: define scope, period, ownership, and limits so the record is easier to support later.",
    note: "It starts with the language of the claim, not the volume of the claim.",
  },
  {
    title: "Partner Confirmation",
    body: "What partner confirmation adds — and what it still does not prove.",
    icon: FileText,
    detail: "Use this theme to show who confirmed the claim, what they reviewed, and where confirmation stops so readers do not confuse confirmation with evidence strength.",
    note: "Confirmation adds accountability, not automatic substantiation.",
  },
  {
    title: "Source Support",
    body: "Why claims need records, documents, artifacts, and traceable evidence.",
    icon: CheckCircle2,
    detail: "Use this theme to link claims back to records a reviewer can inspect directly, whether those records are logs, documents, spreadsheets, or other source artifacts.",
    note: "Source support is what makes the claim inspectable.",
  },
  {
    title: "SDG Mapping Boundaries",
    body: "How to use SDG mapping as context without treating it as evidence strength.",
    icon: GitBranch,
    detail: "Use this theme to keep SDG labels separate from evidence strength, so mapping adds context without inflating what the claim establishes.",
    note: "Mapping helps readers orient the claim, but it does not upgrade evidence strength by itself.",
  },
  {
    title: "Assurance Preparation",
    body: "How evidence can be organized for review without implying formal assurance.",
    icon: PackageCheck,
    detail: "Use this theme to package evidence, exceptions, and limitations in a way that supports review without suggesting formal assurance has already been given.",
    note: "The goal is readiness for review, not a promise of assurance.",
  },
];

const articles = [
  {
    issue: 9,
    category: "ECOLOGICAL HARM",
    title: "When Environmental Harm Becomes Social Harm",
    description: "How the 1987 Khian Sea toxic waste dumping in Haiti shows what happens when environmental claims and governance documentation fail — and why environmental claims carry a higher evidence burden than most.",
    href: "https://www.linkedin.com/pulse/issue-9-when-environmental-harm-becomes-social-disaster-honorat-bpq2c",
    headerGradient: "from-red-900 to-red-700",
    headerImage: "/optimized/verifiable-issue-9.webp",
  },
  {
    issue: 8,
    category: "COMMUNITY EVIDENCE",
    title: "When ESG Evidence Misses the Communities Closest to the Work",
    description: "How ESG claims often miss frontline communities — and why keeping partner records, field notes, and community documentation connected to sustainability claims matters.",
    href: "https://www.linkedin.com/pulse/issue-8-when-esg-evidence-misses-communities-closest-honorat-zwekc",
    headerGradient: "from-emerald-800 to-emerald-600",
    headerImage: "/optimized/verifiable-issue-8.webp",
  },
  {
    issue: 7,
    category: "IMPACT LANGUAGE",
    title: "Why I'm Becoming More Careful With the Word Impact",
    description: "A closer look at when impact language clarifies the claim, and when it starts to overstate what the evidence can support.",
    href: "https://www.linkedin.com/pulse/why-im-becoming-more-careful-word-impact-alc%C3%A9nat-honorat-bdswf",
    headerGradient: "from-orange-700 to-orange-500",
    headerImage: "/optimized/verifiable-issue-7.webp",
  },
  {
    issue: 6,
    category: "PROXIMITY AND TRUST",
    title: "When Distance Creates Doubt: What I've Seen Up Close",
    description: "Why distance between reporters, partners, and affected communities changes the evidence burden behind sustainability claims.",
    href: "https://www.linkedin.com/pulse/issue-6-when-distance-creates-doubt-what-ive-seen-up-honorat-1xsrc",
    headerGradient: "from-amber-700 to-amber-500",
    headerImage: "/optimized/verifiable-issue-6.webp",
  },
  {
    issue: 5,
    category: "NATURE CLAIMS",
    title: "Nature Claims Without Context; Who Pays the Price?",
    description: "How nature-positive language can lose credibility when claims are separated from local context, costs, and accountability.",
    href: "https://www.linkedin.com/pulse/nature-claims-without-context-who-pays-price-alc%C3%A9nat-honorat-ppurc",
    headerGradient: "from-green-800 to-green-600",
    headerImage: "/optimized/verifiable-issue-5.webp",
  },
  {
    issue: 4,
    category: "CLIMATE DISCLOSURE",
    title: "California's Climate Rules: Ambitious Deadlines, Missing Infrastructure",
    description: "A verification lens on climate disclosure timelines, reporting capacity, and the infrastructure needed to make rules workable.",
    href: "https://www.linkedin.com/pulse/issue-4-californias-climate-rules-ambitious-deadlines-alc%C3%A9nat-honorat-slqfc",
    headerGradient: "from-teal-800 to-teal-600",
    headerImage: "/optimized/verifiable-issue-4.webp",
  },
  {
    issue: 3,
    category: "GEOPOLITICS",
    title: "Impact Is Becoming a Geopolitical Asset",
    description: "Why impact evidence is becoming strategically valuable as governments, companies, and funders compete over credibility.",
    href: "https://www.linkedin.com/pulse/impact-becoming-geopolitical-asset-alc%C3%A9nat-honorat-suv3c",
    headerGradient: "from-indigo-800 to-indigo-600",
    headerImage: "/optimized/verifiable-issue-3.webp",
  },
  {
    issue: 2,
    category: "VERIFICATION LENS",
    title: "Major Sustainability News This Week. Let's Apply the Verification Lens",
    description: "A practical reading of sustainability headlines through claim boundaries, source support, and evidence quality.",
    href: "https://www.linkedin.com/pulse/major-sustainability-news-week-lets-apply-lens-alc%C3%A9nat-honorat-cfoyc",
    headerGradient: "from-slate-700 to-slate-500",
    headerImage: "/optimized/verifiable-issue-2.webp",
  },
  {
    issue: 1,
    category: "FOUNDER STORY",
    title: "The Verifiable: A Founder Story",
    description: "The origin of The Verifiable and why claim defensibility, evidence discipline, and reporting boundaries matter.",
    href: "https://www.linkedin.com/pulse/verifiable-founder-story-alc%C3%A9nat-honorat-o27kc",
    headerGradient: "from-[#0A1F44] to-[#1a3a6e]",
    headerImage: "/optimized/verifiable-issue-1.webp",
  },
];

const infoArticles: InfoArticle[] = [
  {
    title: "What SDG Mapping Can and Cannot Do",
    summary: "SDG mapping can provide useful context, but it should not be treated as proof that an outcome happened or that a claim is strong.",
    sections: [
      "SDG mapping is a classification layer. It can help readers understand which global goal or target a claim relates to, but it does not verify the activity, confirm the result, or establish causality.",
      "A stronger use of SDG mapping keeps the mapping separate from evidence strength. The evidence record should still show what happened, who reported it, who confirmed it, what source artifacts exist, and what limitations remain.",
      "The risk is overstatement. A weak claim does not become more defensible because it carries an SDG label. Mapping helps organize context; evidence supports the claim.",
    ],
  },
  {
    title: "Partner-Confirmed Is Not Independent Assurance",
    summary: "Partner confirmation adds accountability and review context, but it should not be confused with formal assurance.",
    sections: [
      "Partner confirmation means an authorized partner reviewed or confirmed a relevant record, activity, or data point. That can be valuable because it reduces the distance between the reporter and the underlying activity.",
      "Independent assurance is different. It involves a separate assurance provider applying defined procedures and issuing a conclusion under an applicable standard or engagement scope.",
      "The cleanest language is precise: partner-confirmed evidence can support review readiness, but it does not by itself create an assurance opinion, compliance guarantee, or proof of impact.",
    ],
  },
  {
    title: "The Evidence Ladder: A Practical Guide",
    summary: "The Evidence Ladder helps teams understand how claims become more reviewable as evidence quality improves.",
    sections: [
      "At the bottom of the ladder are unsupported claims: statements with no attached record, source artifact, confirmation, or limitation note. These claims may be true, but they are hard to review.",
      "The middle of the ladder adds structure: internal records, source artifacts, partner confirmation, and mapped context. Each layer makes the claim easier to inspect and less dependent on trust alone.",
      "At the top are review-ready evidence packets. These connect the claim to source support, confirmation status, exceptions, boundaries, and reporting context without implying that formal assurance has already occurred.",
    ],
  },
  {
    title: "Why Claims Need Limitations",
    summary: "Limitations protect credibility by making clear what a claim does and does not establish.",
    sections: [
      "A limitation is not a weakness by default. It is a boundary statement that prevents readers from assuming more than the evidence supports.",
      "Good limitations clarify scope, time period, source constraints, confirmation status, data gaps, and whether the claim is descriptive, mapped, estimated, or independently assured.",
      "Without limitations, even well-intended claims can become inflated. A clear limitation helps a claim remain useful, reviewable, and proportionate to the evidence behind it.",
    ],
  },
];

export default function ResourcesPage() {
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [activeInfoArticle, setActiveInfoArticle] = useState<number | null>(0);

  return (
    <MarketingLayout>
      <section className="bg-white py-7 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-10">
          <div>
            <p className="text-sm text-slate-500"><Link href="/" className="hover:text-[#0A1F44] transition-colors">Home</Link> &gt; Resources &gt; The Verifiable</p>
            <h1 className="mt-8 font-serif text-3xl font-bold leading-tight text-[#0A1F44] sm:mt-16 sm:text-5xl md:text-6xl">The Verifiable</h1>
            <div className="mt-5 h-1 w-20 bg-[#c88914]" />
            <h2 className="mt-5 max-w-2xl font-serif text-2xl leading-tight text-[#0A1F44] sm:mt-7 sm:text-3xl md:text-4xl">Explore the evidence behind ESG and social-impact claims.</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-700 sm:mt-6 sm:text-lg">
              A newsletter about claim defensibility, partner confirmation, source support, SDG mapping boundaries, assurance preparation, and the discipline required before claims appear in reports.
            </p>
            <div className="mt-6 overflow-hidden rounded-lg shadow-xl sm:mt-8 sm:rounded-2xl sm:shadow-2xl lg:hidden">
              <img
                src={VERIFIABLE_HERO_IMAGE}
                alt="Hand-drawn evidence-thinking diagram on a notebook"
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
          <div className="relative hidden lg:flex lg:items-start lg:justify-end">
            <img
              src={VERIFIABLE_HERO_IMAGE}
              alt="Hand-drawn evidence-thinking diagram on a notebook"
              className="w-full max-w-lg rounded-2xl object-cover shadow-2xl"
            />
            <div className="sr-only">
              <p>Hand-drawn evidence-thinking diagram on a notebook</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-7 sm:pb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="rounded-lg bg-[#f8f6f2] p-4 sm:p-8">
            <div className="grid gap-6 md:grid-cols-[0.44fr_0.56fr] md:items-start">
              <div>
                <h2 className="font-serif text-2xl text-[#0A1F44] sm:text-3xl">Evidence first. Always.</h2>
                <div className="mt-3 h-0.5 w-14 bg-[#c88914]" />
                <p className="mt-5 text-sm leading-relaxed text-slate-700">
                  Credible ESG and social-impact reporting starts before the report is written. It starts with the claim: what is being said, what evidence supports it, who confirmed it, what source records exist, and what the claim does not prove.
                </p>
                <p className="mt-5 text-sm leading-relaxed text-slate-700">
                  The Verifiable explores that discipline. Each issue examines how organizations can make claims more precise, more reviewable, and less vulnerable to overstatement.
                </p>
                <p className="mt-5 text-sm leading-relaxed text-slate-700">
                  This is not about making every claim bigger. It is about making every claim clearer.
                </p>
                <div className="mt-6 rounded-lg border border-[#f0dba7] bg-[#fff8e8] p-4">
                  <p className="text-sm font-extrabold text-[#0A1F44]">Editorial boundary</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#0A1F44]">
                    The Verifiable does not certify impact, verify claims, provide formal assurance, determine compliance, or prove causal attribution.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#0A1F44]">
                    It helps readers think more clearly about the evidence that makes ESG and social-impact claims credible.
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="rounded-md border border-slate-200 bg-white p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">The newsletter focuses on five recurring evidence themes:</p>
                </div>
                {processStages.map((stage, i) => {
                  const Icon = stage.icon;
                  const isActive = activeStage === i;
                  return (
                    <button
                      key={stage.title}
                      type="button"
                      onClick={() => setActiveStage((prev) => (prev === i ? null : i))}
                      className={`relative flex items-start gap-4 overflow-hidden rounded-lg border p-4 text-left transition-all duration-200 ${
                        isActive
                          ? "border-[#0A1F44] bg-white shadow-[0_18px_40px_rgba(10,31,68,0.18)] ring-2 ring-[#c88914]/35"
                          : "border-slate-200 bg-white hover:border-[#0A1F44]/35 hover:shadow-sm"
                      }`}
                    >
                      {isActive && <span className="absolute inset-y-0 left-0 w-1.5 bg-[#c88914]" aria-hidden="true" />}
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isActive ? "bg-[#0A1F44]" : "bg-slate-100"
                      }`}>
                        <Icon className={`h-5 w-5 transition-colors ${isActive ? "text-[#f2cf7f]" : "text-[#0A1F44]"}`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[11px] font-extrabold uppercase tracking-wide ${isActive ? "text-[#a66c0d]" : "text-slate-400"}`}>
                            Stage {i + 1}
                          </p>
                        </div>
                        <p className={`text-sm font-extrabold ${isActive ? "text-[#0A1F44]" : "text-[#0A1F44]"}`}>{stage.title}</p>
                        <p className={`mt-0.5 text-xs leading-relaxed ${isActive ? "text-slate-700" : "text-slate-500"}`}>{stage.body}</p>
                        {isActive && (
                          <div className="mt-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-700">
                            <p>{stage.detail}</p>
                            <p className="mt-3 rounded-md border border-[#f0dba7] bg-[#fff8e8] px-3 py-2 text-[11px] leading-relaxed text-[#5f3f09]">{stage.note}</p>
                          </div>
                        )}
                      </div>
                      <XCircle className={`mt-0.5 h-4 w-4 shrink-0 transition-opacity ${isActive ? "text-slate-400 opacity-100" : "opacity-0"}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-7 sm:pb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-serif text-2xl text-[#0A1F44] sm:text-3xl">LinkedIn Newsletter Issues</h2>
              <div className="mt-3 h-0.5 w-14 bg-[#c88914]" />
            </div>
            <a href={NEWSLETTER_URL} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-2 text-sm font-bold text-[#c88914] transition-colors hover:text-[#a9720f] md:flex">
              Read The Verifiable on LinkedIn <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-5 grid gap-4 sm:mt-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {articles.map((article) => (
              <article key={article.title} className="group flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-md transition-all hover:-translate-y-0.5 hover:border-[#0A1F44]/25 hover:shadow-lg">
                <a href={article.href} target="_blank" rel="noopener noreferrer" className="flex h-full flex-col">
                  <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${article.headerGradient}`}>
                    {article.headerImage && (
                      <>
                        <img
                          src={article.headerImage}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-35 blur-md"
                        />
                        <img
                          src={article.headerImage}
                          alt={`Issue #${article.issue} header image`}
                          className="relative z-10 h-full w-full object-contain"
                        />
                      </>
                    )}
                    <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 bg-gradient-to-b from-black/45 to-transparent p-2.5 sm:p-3">
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0A1F44] shadow-sm">
                        {article.category}
                      </span>
                      <span className="rounded-full bg-[#0A1F44]/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                        #{article.issue}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <h3 className="font-serif text-base leading-tight text-[#0A1F44] sm:text-lg">{`Issue #${article.issue}: ${article.title}`}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">{article.description}</p>
                    <p className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-[#c88914] transition-colors group-hover:text-[#a9720f]">
                      Read on LinkedIn <ArrowRight className="h-4 w-4" />
                    </p>
                  </div>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white pb-7 sm:pb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#c88914]">On-site explainers</p>
            <h2 className="mt-3 font-serif text-2xl text-[#0A1F44] sm:text-3xl">Information articles</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              These short explainers stay on the Synerxus site and expand in place so readers can understand the evidence concepts behind the newsletter.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {infoArticles.map((article, index) => {
              const isOpen = activeInfoArticle === index;
              return (
                <article key={article.title} className="rounded-md border border-slate-200 bg-white shadow-md">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setActiveInfoArticle((current) => (current === index ? null : index))}
                    className="flex w-full items-start justify-between gap-4 p-4 text-left sm:p-5"
                  >
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wide text-[#c88914]">Information article</p>
                      <h3 className="mt-3 font-serif text-xl leading-tight text-[#0A1F44]">{article.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-slate-700">{article.summary}</p>
                    </div>
                    <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-[#c88914] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-200 px-5 pb-5 pt-4">
                      <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                        {article.sections.map((section) => (
                          <p key={section}>{section}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white pb-8 sm:pb-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-5 rounded-lg bg-[#f8f6f2] p-4 sm:p-8 md:grid-cols-[auto_1fr_auto] md:items-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#061A36] text-[#c88914]"><BookOpen className="h-10 w-10" /></span>
            <div><h2 className="font-serif text-2xl text-[#0A1F44] sm:text-3xl">Explore articles, guides, and insights.</h2><p className="mt-2 text-slate-700">Practical perspectives for making ESG and social-impact claims clearer, bounded, and more reviewable.</p></div>
            <Button asChild className="w-full bg-[#061A36] text-white hover:bg-[#102b5a] sm:w-auto">
              <a href={NEWSLETTER_URL} target="_blank" rel="noopener noreferrer">
                Read The Verifiable on LinkedIn <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
