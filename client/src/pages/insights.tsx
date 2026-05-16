import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, BookOpen, CheckCircle2, FileText, FolderOpen, GitBranch, Globe2, LockKeyhole, PackageCheck, ShieldCheck, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const NEWSLETTER_URL = "https://www.linkedin.com/newsletters/the-verifiable-7454325436261498880/";
const VERIFIABLE_HERO_IMAGE = "/optimized/the-verifiable-preview.png";

type ProcessStage = { title: string; body: string; detail: string; note: string; icon: typeof ShieldCheck };

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
    body: "What partner confirmation adds, and what it still does not prove.",
    icon: FileText,
    detail: "Use this theme to show who confirmed the claim, what they reviewed, and where confirmation stops so readers do not confuse confirmation with proof.",
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
    body: "How to use SDG mapping as context without treating it as impact proof.",
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
    issue: "#7",
    category: "Evidence Precision",
    title: `Why I'm Becoming More Careful With the Word "Impact"`,
    description: "The distinction between activity, output, outcome, and real impact — and why precision in claims matters.",
    href: "https://www.linkedin.com/pulse/why-im-becoming-more-careful-word-impact-alc%C3%A9nat-honorat-bdswf",
    date: "May 14, 2026",
    image: "https://media.licdn.com/dms/image/v2/D4D12AQG3E560CAjaDQ/article-cover_image-shrink_720_1280/B4DZ4fpD_IHgAQ-/0/1778647323448?e=2147483647&v=beta&t=F5sA9Jw5tUF8tU69ARIDqxmrd47SmqtMwa9kLLE1FZM",
  },
  {
    issue: "#6",
    category: "Frontline Evidence",
    title: "When Distance Creates Doubt: What I've Seen Up Close",
    description: "Why geographical distance shapes ESG reporting and what better evidence infrastructure looks like.",
    href: "https://www.linkedin.com/pulse/issue-6-when-distance-creates-doubt-what-ive-seen-up-honorat-1xsrc",
    date: "May 12, 2026",
    image: "https://media.licdn.com/dms/image/v2/D5612AQE1TbgyGf9TWw/article-cover_image-shrink_720_1280/B56Z4aJNMDHEAI-/0/1778555085646?e=2147483647&v=beta&t=0X3fyI5O5JQThjpeD_1bDUwA5FPyPGFgxZFIk-VwXNc",
  },
  {
    issue: "#5",
    category: "Environmental Equity",
    title: "Nature Claims Without Context: Who Pays the Price?",
    description: "How sustainability frameworks overlook frontline communities, and why equity must be part of verification.",
    href: "https://www.linkedin.com/pulse/nature-claims-without-context-who-pays-price-alc%C3%A9nat-honorat-ppurc",
    date: "May 7, 2026",
    image: "https://media.licdn.com/dms/image/v2/D5612AQFhRShJiHofbg/article-cover_image-shrink_720_1280/B56Z3_Ia_aH4AI-/0/1778101894290?e=2147483647&v=beta&t=9xQ54FY4SO13g6fBJsr6BVhsNUnF9TNU6IvClUFa0HM",
  },
  {
    issue: "#4",
    category: "Climate Compliance",
    title: "California's Climate Rules: Ambitious Deadlines, Missing Infrastructure",
    description: "The gap between regulatory mandates and most organizations' capacity to execute compliant reporting.",
    href: "https://www.linkedin.com/pulse/issue-4-californias-climate-rules-ambitious-deadlines-alc%C3%A9nat-honorat-slqfc",
    date: "May 5, 2026",
    image: "https://media.licdn.com/dms/image/v2/D5612AQE56oFYzFc-Mw/article-cover_image-shrink_720_1280/B56Z31XyzUGUAI-/0/1777938149815?e=2147483647&v=beta&t=0_4oFRK2mPIcYuip4L8Bee4Y2c9YKbgQeS0tHGsgx6g",
  },
  {
    issue: "#3",
    category: "ESG Trends",
    title: "Impact Is Becoming a Geopolitical Asset",
    description: "How verification has become a strategic necessity as impact data gains geopolitical weight.",
    href: "https://www.linkedin.com/pulse/impact-becoming-geopolitical-asset-alc%C3%A9nat-honorat-suv3c",
    date: "Apr 30, 2026",
    image: "https://media.licdn.com/dms/image/v2/D5612AQHUOzkfL_-T_Q/article-cover_image-shrink_720_1280/B56Z3fiMNmIIAI-/0/1777571781492?e=2147483647&v=beta&t=XWxzM1hNwY1Rt8b2BAK5yhxKV7j1_O_OCe5Byi2nyA0",
  },
  {
    issue: "#2",
    category: "Verification Lens",
    title: "Major Sustainability News This Week. Let's Apply the Verification Lens",
    description: "From pledges to proof — examining major sustainability announcements and the evidence behind them.",
    href: "https://www.linkedin.com/pulse/major-sustainability-news-week-lets-apply-lens-alc%C3%A9nat-honorat-cfoyc",
    date: "Apr 28, 2026",
    image: "https://media.licdn.com/dms/image/v2/D5612AQEH8z8igekoNg/article-cover_image-shrink_720_1280/B56Z3UoKSvKIAI-/0/1777388792485?e=2147483647&v=beta&t=seNK8Iyit1MpkIlh5dOT8IBipTm2tiIZzVlZ_Hl8sFI",
  },
  {
    issue: "#1",
    category: "Founder Story",
    title: "The Verifiable: A Founder Story",
    description: "The story behind Synerxus and why unverified impact claims prompted the creation of The Verifiable.",
    href: "https://www.linkedin.com/pulse/verifiable-founder-story-alc%C3%A9nat-honorat-o27kc",
    date: "Apr 27, 2026",
    image: "https://media.licdn.com/dms/image/v2/D5612AQGVgoTIP6s7Xw/article-cover_image-shrink_720_1280/B56Z3MxfEoJ4AI-/0/1777257022834?e=2147483647&v=beta&t=sMUS4c7qYujmgZYhWl7720CGe4-UYimQpADoVOzk-sE",
  },
];

export default function ResourcesPage() {
  const [activeStage, setActiveStage] = useState<number | null>(null);

  return (
    <MarketingLayout>
      <section className="bg-white py-10 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm text-slate-500"><Link href="/" className="hover:text-[#0A1F44] transition-colors">Home</Link> &gt; Resources &gt; The Verifiable</p>
            <h1 className="mt-16 font-serif text-4xl font-bold leading-tight text-[#0A1F44] sm:text-5xl md:text-6xl">The Verifiable</h1>
            <div className="mt-5 h-1 w-20 bg-[#c88914]" />
            <h2 className="mt-7 max-w-2xl font-serif text-2xl leading-tight text-[#0A1F44] sm:text-3xl md:text-4xl">Explore the evidence behind ESG and social-impact claims.</h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-700">
              A newsletter about claim defensibility, partner confirmation, source support, SDG mapping boundaries, assurance preparation, and the discipline required before claims appear in reports.
            </p>
            <div className="mt-8 overflow-hidden rounded-2xl shadow-2xl lg:hidden">
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

      <section className="bg-white pb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="rounded-lg bg-[#f8f6f2] p-8">
            <div className="grid gap-6 md:grid-cols-[0.44fr_0.56fr] md:items-start">
              <div>
                <h2 className="font-serif text-3xl text-[#0A1F44]">Evidence first. Always.</h2>
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
                <p className="mt-5 text-sm leading-relaxed text-slate-700">
                  Editorial boundary: The Verifiable does not certify impact, verify claims, provide formal assurance, determine compliance, or prove causal attribution.
                </p>
                <p className="mt-5 text-sm leading-relaxed text-slate-700">
                  It helps readers think more clearly about the evidence that makes ESG and social-impact claims credible.
                </p>
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
                      className={`flex items-start gap-4 rounded-lg border p-4 text-left transition-all duration-200 ${
                        isActive
                          ? "border-[#061A36] bg-[#061A36] shadow-md"
                          : "border-slate-200 bg-white hover:border-[#0A1F44]/30 hover:shadow-sm"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isActive ? "bg-white/15" : "bg-slate-100"
                      }`}>
                        <Icon className={`h-5 w-5 transition-colors ${isActive ? "text-[#f2cf7f]" : "text-[#0A1F44]"}`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[11px] font-extrabold uppercase tracking-wide ${isActive ? "text-[#f2cf7f]" : "text-slate-400"}`}>
                            Stage {i + 1}
                          </p>
                        </div>
                        <p className={`text-sm font-extrabold ${isActive ? "text-white" : "text-[#0A1F44]"}`}>{stage.title}</p>
                        <p className={`mt-0.5 text-xs leading-relaxed ${isActive ? "text-white/90" : "text-slate-500"}`}>{stage.body}</p>
                        {isActive && (
                          <div className="mt-3 border-t border-white/20 pt-3 text-xs leading-relaxed text-white/95">
                            <p>{stage.detail}</p>
                            <p className="mt-3 rounded-md bg-white/12 px-3 py-2 text-[11px] leading-relaxed text-white/90">{stage.note}</p>
                          </div>
                        )}
                      </div>
                      <XCircle className={`mt-0.5 h-4 w-4 shrink-0 transition-opacity ${isActive ? "text-white/65 opacity-100" : "opacity-0"}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-serif text-3xl text-[#0A1F44]">Featured Articles</h2>
              <div className="mt-3 h-0.5 w-14 bg-[#c88914]" />
            </div>
            <a href={NEWSLETTER_URL} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-2 text-sm font-bold text-[#c88914] transition-colors hover:text-[#a9720f] md:flex">
              View all on LinkedIn <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {articles.map((article) => (
              <article key={article.title} className="group overflow-hidden rounded-md border border-slate-200 bg-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <a href={article.href} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={article.image} alt={article.title} className="h-40 w-full object-cover transition-opacity group-hover:opacity-90" />
                  <div className="p-4">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-[#c88914]">{article.issue} · {article.category}</p>
                    <h3 className="mt-3 font-serif text-base leading-tight text-[#0A1F44]">{article.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">{article.description}</p>
                    <p className="mt-4 text-[11px] text-slate-400">{article.date}</p>
                    <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#c88914] transition-colors group-hover:text-[#a9720f]">Read on LinkedIn <ArrowRight className="h-4 w-4" /></p>
                  </div>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white pb-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-6 rounded-lg bg-[#f8f6f2] p-8 md:grid-cols-[auto_1fr_auto] md:items-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#061A36] text-[#c88914]"><BookOpen className="h-10 w-10" /></span>
            <div><h2 className="font-serif text-3xl text-[#0A1F44]">Explore articles, guides, and insights.</h2><p className="mt-2 text-slate-700">Practical perspectives to help you build evidence-led, credible ESG and social-impact claims.</p></div>
            <Button asChild className="bg-[#061A36] text-white hover:bg-[#102b5a]">
              <a href={NEWSLETTER_URL} target="_blank" rel="noopener noreferrer">
                View all on LinkedIn <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
