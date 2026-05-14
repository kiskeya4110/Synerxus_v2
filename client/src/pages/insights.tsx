import { Link } from "wouter";
import { ArrowRight, BarChart3, BookOpen, FileText, Globe2, Handshake, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const pillars = [
  ["Claim Defensibility", "Design claims that can be reasonably substantiated.", ShieldCheck],
  ["Partner Confirmation", "Understand the limits of partner-confirmed evidence.", Users],
  ["Source Support", "Build clear links to original evidence.", FileText],
  ["SDG Mapping Boundaries", "Use mapping appropriately and transparently.", Globe2],
  ["Assurance Preparation", "Strengthen readiness for independent review.", BarChart3],
];

const articles = [
  ["Claim Defensibility", "Before We Call It Impact: The evidence discipline behind every claim", "Why strong claims begin before reporting and the questions every team should ask early."],
  ["SDG Mapping", "What SDG mapping can and cannot do", "How to use SDG mapping responsibly, avoid common missteps, and communicate with clarity."],
  ["Partner Evidence", "Partner-confirmed is not independent assurance", "Understanding the difference and why it matters for credibility and materiality."],
  ["Evidence Practice", "The Evidence Ladder: a practical guide", "A step-by-step framework to strengthen evidence from early capture to review readiness."],
  ["Reporting Quality", "Why claims need limitations before they appear in reports", "How to set boundaries, disclose appropriately, and protect credibility."],
];

export default function ResourcesPage() {
  return (
    <MarketingLayout>
      <section className="bg-white py-10 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm text-slate-500">Home &gt; Resources &gt; The Verifiable</p>
            <h1 className="mt-16 font-serif text-6xl font-bold leading-tight text-[#0A1F44]">The Verifiable</h1>
            <div className="mt-5 h-1 w-20 bg-[#c88914]" />
            <h2 className="mt-7 max-w-2xl font-serif text-4xl leading-tight text-[#0A1F44]">Explore the evidence behind ESG and social-impact claims.</h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-700">A newsletter about claim defensibility, partner confirmation, source support, SDG mapping boundaries, assurance preparation, and the discipline required before claims appear in reports.</p>
          </div>
          <div className="relative hidden lg:block">
            <div className="rotate-[-7deg] rounded-lg border border-slate-200 bg-[#f7f3eb] p-12 shadow-2xl">
              <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full border border-dashed border-[#0A1F44]/30">
                <img src="/synerxus-esg-logo.png" alt="Synerxus" className="h-24 w-auto" />
              </div>
              <div className="mt-8 grid grid-cols-3 gap-6 text-center text-xs font-extrabold text-[#0A1F44]"><span>Sources</span><span>Evidence</span><span>Impact</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-8 rounded-lg bg-[#f8f6f2] p-8 md:grid-cols-[0.42fr_0.58fr]">
            <div>
              <h2 className="font-serif text-3xl text-[#0A1F44]">Evidence first. Always.</h2>
              <div className="mt-3 h-0.5 w-14 bg-[#c88914]" />
              <p className="mt-5 text-sm leading-relaxed text-slate-700">The Verifiable explores the practices and principles behind credible ESG and social-impact claims. From claim defensibility and partner confirmation to source support, SDG mapping boundaries, and assurance preparation, our content helps you build rigor into every step.</p>
              <p className="mt-5 font-extrabold text-[#0A1F44]">We do not certify or verify claims.</p>
              <p className="mt-1 text-sm text-slate-700">We help you prepare the evidence that makes them credible.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-5">
              {pillars.map(([title, body, Icon]) => <div key={title as string} className="border-slate-300 text-center md:border-l md:px-4"><Icon className="mx-auto h-10 w-10 text-[#c88914]" /><h3 className="mt-3 font-serif text-lg leading-tight text-[#0A1F44]">{title as string}</h3><p className="mt-3 text-xs leading-relaxed text-slate-600">{body as string}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex items-end justify-between"><div><h2 className="font-serif text-3xl text-[#0A1F44]">Featured Articles</h2><div className="mt-3 h-0.5 w-14 bg-[#c88914]" /></div><Link href="/resources" className="hidden items-center gap-2 text-sm font-bold text-[#c88914] md:flex">View all resources <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="mt-6 grid gap-5 md:grid-cols-5">
            {articles.map(([category, title, description], index) => (
              <article key={title} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-md">
                <div className="h-32 bg-gradient-to-br from-slate-200 to-slate-400" />
                <div className="p-4"><p className="text-xs font-extrabold uppercase tracking-wide text-[#c88914]">{category}</p><h3 className="mt-3 font-serif text-xl leading-tight text-[#0A1F44]">{title}</h3><p className="mt-3 text-sm leading-relaxed text-slate-700">{description}</p><a className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#c88914]">Read more <ArrowRight className="h-4 w-4" /></a></div>
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
            <Button asChild className="bg-[#061A36] text-white hover:bg-[#102b5a]"><Link href="/resources">View all resources <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
