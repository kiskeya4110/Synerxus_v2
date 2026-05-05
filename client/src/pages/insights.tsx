import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, Clock3, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const VERIFIABLE_LINKEDIN_URL =
  "https://www.linkedin.com/newsletters/the-verifiable-7454325436261498880/";
const LINKEDIN_FOLLOW_URL =
  "https://www.linkedin.com/build-relation/newsletter-follow?entityUrn=7454325436261498880";

type BadgeType = "Guide" | "Explainer" | "Framework" | "Checklist" | "Template";

type ArticleBlock =
  | {
      kind: "paragraph";
      text: string;
    }
  | {
      kind: "quote";
      text: string;
    }
  | {
      kind: "example";
      text: string;
    }
  | {
      kind: "bullets";
      items: string[];
    }
  | {
      kind: "numbered";
      items: { title: string; body: string }[];
    };

interface FullArticleSection {
  title: string;
  blocks: ArticleBlock[];
}

const typeBadgeStyles: Record<BadgeType, string> = {
  Guide: "border-blue-200 bg-blue-50 text-blue-800",
  Explainer: "border-slate-200 bg-slate-100 text-slate-600",
  Framework: "border-violet-200 bg-violet-50 text-violet-800",
  Checklist: "border-amber-200 bg-amber-50 text-amber-800",
  Template: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

interface Article {
  type: BadgeType;
  readTime: string;
  title: string;
  description: string;
}

interface Series {
  title: string;
  description: string;
  articles: Article[];
}

interface FeaturedArticle {
  title: string;
  type: BadgeType;
  readTime: string;
  category: string;
  description: string;
  highlights: string[];
}

interface RecentIssue {
  issue: string;
  title: string;
  url: string;
}

function getIssueNumber(issue: string) {
  const match = issue.match(/\d+/);
  return match ? Number(match[0]) : -1;
}

const editorialSeries: Series[] = [
  {
    title: "Evidence Objects",
    description: "The structured records behind ESG claims.",
    articles: [
      {
        type: "Guide",
        readTime: "5 min read",
        title: "What is an ESG Evidence Object?",
        description:
          "A practical introduction to the structured record behind a sustainability claim — including source evidence, partner confirmation, chain-of-custody history, and disclosure-readiness status.",
      },
      {
        type: "Explainer",
        readTime: "4 min read",
        title: "Why every sustainability claim needs a source record",
        description:
          "How traceable source records reduce ambiguity in reporting and review.",
      },
      {
        type: "Framework",
        readTime: "6 min read",
        title: "Anatomy of a disclosure-ready Evidence Object",
        description:
          "The seven layers that make an Evidence Object reviewable and disclosure-ready.",
      },
    ],
  },
  {
    title: "The Evidence Ladder",
    description: "A maturity model for ESG claim defensibility.",
    articles: [
      {
        type: "Framework",
        readTime: "5 min read",
        title: "The Evidence Ladder: A maturity model for claim defensibility",
        description:
          "How to evaluate whether ESG claims are unsupported, internally asserted, partner-confirmed, or disclosure-ready.",
      },
      {
        type: "Guide",
        readTime: "4 min read",
        title: "How to score ESG claims before publication",
        description:
          "A practical method for assessing claim strength before claims appear in reports or investor materials.",
      },
      {
        type: "Explainer",
        readTime: "5 min read",
        title: "What makes a claim audit-ready?",
        description:
          "The evidence requirements, confirmation records, and custody history that support an audit-ready review.",
      },
    ],
  },
  {
    title: "Partner Confirmation",
    description:
      "How NGOs, suppliers, contractors, and implementation partners strengthen ESG claim credibility.",
    articles: [
      {
        type: "Guide",
        readTime: "5 min read",
        title: "How partner confirmation reduces greenwashing risk",
        description:
          "How focused external review can improve claim confidence before publication.",
      },
      {
        type: "Explainer",
        readTime: "4 min read",
        title: "Partner confirmation without reporting burden",
        description:
          "How to invite trusted partners to confirm claims without adding administrative complexity.",
      },
      {
        type: "Explainer",
        readTime: "4 min read",
        title: "Why NGOs can strengthen corporate ESG claims",
        description:
          "Why implementation partners are central to credible evidence workflows.",
      },
    ],
  },
  {
    title: "Chain of Custody",
    description:
      "Why timestamps, reviewer identity, version history, and confirmation records matter.",
    articles: [
      {
        type: "Guide",
        readTime: "5 min read",
        title: "Chain of custody in ESG reporting: why it matters",
        description:
          "Why timestamps, reviewer actions, and version history are central to defensibility.",
      },
      {
        type: "Explainer",
        readTime: "3 min read",
        title: "Why timestamps and reviewer identity matter",
        description:
          "How documented reviewer actions support traceability across reporting cycles.",
      },
      {
        type: "Explainer",
        readTime: "5 min read",
        title: "What audit-ready ESG evidence actually means",
        description:
          "A practical view of source files, confirmations, custody history, and disclosure status.",
      },
    ],
  },
  {
    title: "Frameworks & Disclosure",
    description: "How Evidence Objects support multiple ESG reporting pathways.",
    articles: [
      {
        type: "Explainer",
        readTime: "5 min read",
        title: "Why ESG reporting is shifting from disclosure to evidence",
        description:
          "Why teams need defensible records behind the language used in external reports.",
      },
      {
        type: "Guide",
        readTime: "4 min read",
        title: "Frameworks tell you what to disclose. Evidence proves what happened.",
        description:
          "The distinction between disclosure requirements and the underlying evidence records they depend on.",
      },
      {
        type: "Framework",
        readTime: "5 min read",
        title: "How one Evidence Object can support multiple reporting pathways",
        description:
          "How a single confirmed claim can support GRI, CSRD/ESRS, SDG, and internal scorecard needs simultaneously.",
      },
    ],
  },
];

const defaultRecentIssues: RecentIssue[] = [
  {
    issue: "Issue 01",
    title: "The Verifiable: Founder Story",
    url: "https://www.linkedin.com/pulse/verifiable-founder-story-alc%C3%A9nat-honorat-o27kc",
  },
  {
    issue: "Issue 02",
    title: "Major Sustainability News This Week: Let's Apply the Lens",
    url: "https://www.linkedin.com/pulse/major-sustainability-news-week-lets-apply-lens-alc%C3%A9nat-honorat-cfoyc",
  },
  {
    issue: "Issue 03",
    title: "Impact is Becoming a Geopolitical Asset",
    url: "https://www.linkedin.com/pulse/impact-becoming-geopolitical-asset-alc%C3%A9nat-honorat-suv3c",
  },
];

function isRecentIssue(value: unknown): value is RecentIssue {
  if (!value || typeof value !== "object") return false;
  const issue = value as Record<string, unknown>;
  return (
    typeof issue.issue === "string" &&
    typeof issue.title === "string" &&
    typeof issue.url === "string" &&
    issue.url.startsWith("https://")
  );
}

const practicalTools = [
  {
    type: "Checklist" as BadgeType,
    title: "ESG Claim Review Checklist",
    description:
      "A structured checklist for reviewing the defensibility of ESG claims before publication.",
  },
  {
    type: "Template" as BadgeType,
    title: "Evidence Object Template",
    description:
      "A structured template for creating Evidence Objects with all seven layers completed.",
  },
  {
    type: "Guide" as BadgeType,
    title: "Evidence Ladder Self-Assessment",
    description:
      "Score each of your highest-visibility ESG claims against the Evidence Ladder levels.",
  },
  {
    type: "Template" as BadgeType,
    title: "Partner Confirmation Request Template",
    description:
      "A focused review request template for NGOs, suppliers, contractors, and implementation partners.",
  },
];

const featuredArticles: FeaturedArticle[] = [
  {
    title: "What is an ESG Evidence Object?",
    type: "Guide",
    readTime: "7 min read",
    category: "Evidence Objects",
    description:
      "The structured record behind a sustainability claim — connecting source evidence, partner confirmation, chain-of-custody history, framework mapping, and disclosure-readiness status.",
    highlights: [
      "What makes a sustainability claim an Evidence Object",
      "The seven layers of a structured evidence record",
      "Why partner confirmation matters before disclosure",
      "How chain-of-custody history supports audit readiness",
    ],
  },
  {
    title: "Why every sustainability claim needs a source record",
    type: "Explainer",
    readTime: "4 min read",
    category: "Evidence Objects",
    description:
      "How traceable source records reduce ambiguity, support review, and help teams explain the record behind ESG claims.",
    highlights: [
      "Why summary-only reporting creates ambiguity",
      "What source records actually capture",
      "How partner confirmation strengthens reviewability",
      "Why traceable records reduce reporting friction",
    ],
  },
  {
    title: "Anatomy of a disclosure-ready Evidence Object",
    type: "Framework",
    readTime: "6 min read",
    category: "Evidence Objects",
    description:
      "The seven layers that make an Evidence Object specific, source-backed, partner-confirmed, mapped, and ready for review.",
    highlights: [
      "The claim and source details behind each record",
      "Partner confirmation and custody history",
      "Framework alignment and quality checks",
      "Disclosure status and review readiness",
    ],
  },
];

const evidenceObjectArticle: FullArticleSection[] = [
  {
    title: "What Is an ESG Evidence Object?",
    blocks: [
      {
        kind: "paragraph",
        text: "Many sustainability reports include statements about volunteer hours, community programs, supplier activity, environmental outcomes, or workforce initiatives. These statements may be true, but on their own, they are still just claims.",
      },
      {
        kind: "paragraph",
        text: "They do not show who confirmed the work, what documentation supports it, when it happened, or whether the information can be reviewed later. That gap is where ESG reporting often becomes fragile.",
      },
      {
        kind: "paragraph",
        text: "An ESG Evidence Object is a structured record that turns a sustainability claim into something more defensible. It connects the claim to the supporting details, documentation, partner confirmation, timestamps, and framework mapping needed to make the record credible.",
      },
      {
        kind: "quote",
        text: "If impact happened, it should be possible to confirm it, trace it, and explain how it supports a disclosure.",
      },
    ],
  },
  {
    title: "From Claim to Evidence",
    blocks: [
      {
        kind: "paragraph",
        text: "A claim says what happened. An Evidence Object shows how we know.",
      },
      {
        kind: "paragraph",
        text: "For example, a company might report that employees volunteered with a local nonprofit. That statement becomes much stronger when it is connected to:",
      },
      {
        kind: "bullets",
        items: [
          "What activity took place",
          "Who participated",
          "How many hours were completed",
          "Which organization confirmed the work",
          "When the confirmation occurred",
          "What documents or records support the claim",
          "Which ESG or sustainability frameworks the activity relates to",
          "Whether the record is ready for review or still needs validation",
        ],
      },
      {
        kind: "paragraph",
        text: "Without that structure, the company is telling a story. With it, the company is building evidence.",
      },
      {
        kind: "paragraph",
        text: "That distinction matters. ESG teams, finance teams, legal teams, and auditors increasingly need more than narrative descriptions. They need records that can be traced back to the people, documents, and confirmations behind the reported impact.",
      },
    ],
  },
  {
    title: "What an ESG Evidence Object Includes",
    blocks: [
      {
        kind: "paragraph",
        text: "A Synerxus Evidence Object brings the key parts of an ESG claim into one structured record.",
      },
      {
        kind: "numbered",
        items: [
          {
            title: "The Claim",
            body: "The basic statement of impact. Example: Employees provided financial planning support to a youth nonprofit. This is the starting point, but not enough on its own.",
          },
          {
            title: "Source Details",
            body: "The measurable information behind the claim: hours, participants, location, service type, beneficiary count, project category, or notes.",
          },
          {
            title: "Supporting Documentation",
            body: "Files, photos, forms, reports, attendance logs, or other materials that substantiate the claim. The goal is not more paperwork. It is attaching the right documentation to the right claim.",
          },
          {
            title: "Partner Confirmation",
            body: "Validation from the organization closest to the work: an NGO, school, supplier, contractor, or community partner. This moves the record beyond internal self-reporting.",
          },
          {
            title: "Time and Verification Details",
            body: "When the claim was submitted, when it was confirmed, who confirmed it, and how the confirmation was collected. This creates a clear evidence trail.",
          },
          {
            title: "Framework Mapping",
            body: "Connections to SDGs, ESRS, SASB, GRI, BRI, or internal ESG goals. This links operational activity to disclosure requirements.",
          },
          {
            title: "Review Status",
            body: "A structured workflow such as Draft to Submitted to Confirmed to Reviewed to Ready for reporting. Teams can instantly see what is complete and what still needs validation.",
          },
        ],
      },
    ],
  },
  {
    title: "Why Partner Confirmation Matters",
    blocks: [
      {
        kind: "paragraph",
        text: "One of the weakest points in ESG reporting is self-reported impact. A company may know that volunteers trained 50 farmers, but a reviewer may ask:",
      },
      {
        kind: "bullets",
        items: [
          "Who counted the participants",
          "Was the training completed",
          "Which partner was present",
          "Is there a record of the activity",
          "Can the partner confirm the outcome",
        ],
      },
      {
        kind: "paragraph",
        text: "Partner confirmation strengthens the record by involving the organization closest to the activity. It is not about distrust. It is about credibility.",
      },
      {
        kind: "paragraph",
        text: "For ESG teams, this creates a more defensible reporting process. For partners, it provides a simple, lightweight way to validate work without managing complex systems.",
      },
    ],
  },
  {
    title: "Why Audit Trails Matter",
    blocks: [
      {
        kind: "paragraph",
        text: "Auditors and reviewers do not only look at the final statement. They look at how the statement was created.",
      },
      {
        kind: "bullets",
        items: [
          "Who submitted the information",
          "When it was submitted",
          "What documentation supports it",
          "Whether it was reviewed or changed",
          "Who confirmed it",
          "Whether the confirmer is independent",
          "Whether any inconsistencies exist",
        ],
      },
      {
        kind: "paragraph",
        text: "An ESG Evidence Object is designed to make those questions easy to answer. Instead of searching across spreadsheets, emails, shared drives, PDFs, and partner messages, the relevant information is organized around the claim itself.",
      },
      {
        kind: "paragraph",
        text: "The record shows the activity, the supporting material, the confirmation, the review status, and the framework mapping all in one place. This structure reduces confusion and makes ESG reporting more consistent, especially as programs scale across teams, partners, and locations.",
      },
    ],
  },
  {
    title: "A Simple Example",
    blocks: [
      {
        kind: "example",
        text: "Traditional ESG entry: Employees volunteered with a local nonprofit to support youth financial literacy.",
      },
      {
        kind: "paragraph",
        text: "An ESG Evidence Object would show:",
      },
      {
        kind: "bullets",
        items: [
          "The activity name",
          "The nonprofit partner",
          "The participating employees or team",
          "The date and location",
          "The number of hours completed",
          "The type of support provided",
          "The attendance record or program documentation",
          "The partner confirmation",
          "The timestamp of confirmation",
          "The related ESG goal or reporting framework",
          "The review status",
        ],
      },
      {
        kind: "paragraph",
        text: "The final claim may still be simple, but behind it is a structured record that can be checked. That is the value of an Evidence Object.",
      },
    ],
  },
  {
    title: "The Bottom Line",
    blocks: [
      {
        kind: "paragraph",
        text: "An ESG Evidence Object is not just a data point. It is the record behind the claim.",
      },
      {
        kind: "paragraph",
        text: "It helps companies move from broad sustainability statements to structured, verifiable evidence. It connects what happened, who confirmed it, what supports it, and how it maps to the reporting frameworks that matter.",
      },
      {
        kind: "paragraph",
        text: "Synerxus exists to make that process simpler, so ESG teams spend less time chasing screenshots, emails, and spreadsheets, and more time building credible impact records that can be reviewed, confirmed, and defended.",
      },
      {
        kind: "quote",
        text: "In the next era of ESG reporting, the strongest claims will not be the loudest. They will be the ones with evidence behind them.",
      },
    ],
  },
];

const sourceRecordArticle: FullArticleSection[] = [
  {
    title: "Why Every Sustainability Claim Needs a Source Record",
    blocks: [
      {
        kind: "paragraph",
        text: "Most sustainability reports still rely on polished summary statements. They may describe volunteer hours, community benefits, climate initiatives, supplier activity, or workforce programs, but summaries are not evidence on their own.",
      },
      {
        kind: "paragraph",
        text: "They are well-intentioned, but unanchored. In a reporting environment shaped by CSRD, SEC climate disclosure pressure, and assurance review, unanchored claims create ambiguity and review risk.",
      },
      {
        kind: "paragraph",
        text: "What is missing is simple: a source record. A source record is the original, timestamped, partner-confirmed record that connects a sustainability claim to what actually happened.",
      },
    ],
  },
  {
    title: "The Problem With Summary-Only Reporting",
    blocks: [
      {
        kind: "paragraph",
        text: "When organizations report only headline numbers, three issues show up immediately.",
      },
      {
        kind: "numbered",
        items: [
          {
            title: "Ambiguity",
            body: "Technical support could mean training, troubleshooting, system design, implementation support, or something else entirely. Without a source record, reviewers cannot tell what the claim means.",
          },
          {
            title: "Unverifiability",
            body: "Reviewers cannot evaluate a large aggregate as a single block. They need to sample individual records and trace them back to who confirmed them, when they were confirmed, and what documentation supports them.",
          },
          {
            title: "Fragility",
            body: "If one high-visibility claim is challenged, the credibility of the broader report can weaken. Many ESG claims become fragile not because they are false, but because they lack traceable support.",
          },
        ],
      },
    ],
  },
  {
    title: "What a Source Record Actually Is",
    blocks: [
      {
        kind: "paragraph",
        text: "A source record is not a slide deck, a case study, or a summary spreadsheet. It is the claim-level record captured close to the moment of delivery.",
      },
      {
        kind: "bullets",
        items: [
          "What happened: the specific activity, output, or contribution being reported",
          "Who confirmed it: the partner, reviewer, or organization closest to the work",
          "When and how: the submission and confirmation timestamps and collection method",
          "Where: appropriate location context, handled according to privacy and reporting boundaries",
          "Framework alignment: the SDG, ESRS, SASB, GRI, BRI, or internal goal the activity may support",
        ],
      },
      {
        kind: "paragraph",
        text: "This is the source documentation a reviewer can inspect. Without it, a sustainability report is mostly narrative.",
      },
    ],
  },
  {
    title: "How Source Records Reduce Ambiguity",
    blocks: [
      {
        kind: "paragraph",
        text: "Source records turn vague aggregates into reviewable units. Instead of defending a single headline number, teams can provide a set of independently traceable records.",
      },
      {
        kind: "example",
        text: "A summary says: employees delivered 1,200 hours of technical support. A source record shows: which activity happened, who participated, which partner confirmed it, when it was confirmed, and which disclosure pathway it supports.",
      },
      {
        kind: "paragraph",
        text: "This is how organizations make review easier. Not by claiming perfect data, but by preserving traceable data.",
      },
    ],
  },
  {
    title: "The Cost of Missing Source Records",
    blocks: [
      {
        kind: "paragraph",
        text: "Organizations that rely on summaries instead of evidence can face more review friction, more follow-up questions, and greater exposure to greenwashing accusations when claims cannot be substantiated.",
      },
      {
        kind: "paragraph",
        text: "Most self-reported social impact claims struggle to meet assurance-review expectations because they lack third-party verification, tamper-evident audit trails, and timely confirmation. That is why CSRD-ready social-impact evidence depends on partner-verified outcomes that can be traced back to the source record.",
      },
      {
        kind: "bullets",
        items: [
          "More time spent reconstructing evidence across emails, PDFs, spreadsheets, and partner messages",
          "More uncertainty when reviewers ask how a number was calculated or confirmed",
          "More difficulty showing that a claim is supported by source documentation",
          "More risk that report language overstates what the underlying record can support",
        ],
      },
      {
        kind: "paragraph",
        text: "Organizations with source records are better positioned to respond to review, support sampling, and explain the evidence behind their sustainability claims.",
      },
    ],
  },
  {
    title: "Building Source Records That Work",
    blocks: [
      {
        kind: "paragraph",
        text: "Not all source records are equally useful. To support reporting and review, they should be structured around a few practical qualities.",
      },
      {
        kind: "bullets",
        items: [
          "Independent: confirmed by someone other than the original claimant where practical",
          "Timely: captured close enough to the activity that the details remain reliable",
          "Traceable: tied to timestamps, reviewer actions, supporting records, and custody history",
          "Structured: organized so teams can filter, sample, compare, and map records consistently",
        ],
      },
      {
        kind: "paragraph",
        text: "This is not bureaucracy. It is what turns a sustainability report from a collection of summaries into a body of evidence that can be reviewed.",
      },
    ],
  },
  {
    title: "The Bottom Line",
    blocks: [
      {
        kind: "paragraph",
        text: "Sustainability reporting is not only about counting outputs. It is about showing the record behind the claim.",
      },
      {
        kind: "paragraph",
        text: "Every claim needs an anchor: a timestamped, partner-confirmed source record that shows what happened and why the claim can be reviewed.",
      },
      {
        kind: "quote",
        text: "In the new era of ESG reporting, claims without source records are not just weaker. They are harder to defend.",
      },
    ],
  },
];

const anatomyEvidenceObjectArticle: FullArticleSection[] = [
  {
    title: "Anatomy of a Disclosure-Ready Evidence Object",
    blocks: [
      {
        kind: "paragraph",
        text: "Most ESG reports are built on claims. The lines may look polished, but summaries are not evidence by themselves.",
      },
      {
        kind: "paragraph",
        text: "Under CSRD, SEC climate disclosure pressure, and growing assurance scrutiny, unanchored claims are harder to review and defend.",
      },
      {
        kind: "paragraph",
        text: "A disclosure-ready Evidence Object is a structured, independently confirmed record that can support sampling, review, and stakeholder confidence.",
      },
      {
        kind: "paragraph",
        text: "At Synerxus, every Evidence Object is built around seven layers. They are not bureaucracy. They are the practical structure needed to make a claim easier to review, support, and defend.",
      },
    ],
  },
  {
    title: "Layer 1: The Claim - What Was Delivered",
    blocks: [
      {
        kind: "example",
        text: "Installed solar microgrids for 12 households in Lusaka.",
      },
      {
        kind: "paragraph",
        text: "This is where many reporting workflows stop. But a claim alone is just a statement. To be disclosure-ready, it needs to be specific, measurable, and tied to a real output or outcome rather than a vague intention.",
      },
      {
        kind: "bullets",
        items: [
          "Disclosure-ready: Trained 47 farmers in drought-resistant agriculture techniques.",
          "Not ready: Supported agricultural resilience.",
        ],
      },
    ],
  },
  {
    title: "Layer 2: Source Details - Who Did What, When",
    blocks: [
      {
        kind: "example",
        text: "Volunteer: Maria Santos, Civil Engineer. Hours: 16. Date: March 15, 2026. Skills applied: project management and technical training.",
      },
      {
        kind: "paragraph",
        text: "This layer answers the basic but essential questions: who was involved, and what did they actually do?",
      },
      {
        kind: "paragraph",
        text: "It moves beyond volunteer hours into skills deployed, time spent, and contextual detail captured close to the moment of delivery rather than reconstructed months later.",
      },
    ],
  },
  {
    title: "Layer 3: Partner Confirmation - Independent Validation",
    blocks: [
      {
        kind: "example",
        text: "Confirmed by: Elodie Bernard, Program Director, Lusaka Youth Initiative. Method: SMS tap. Timestamp: March 15, 2026, 14:32 UTC.",
      },
      {
        kind: "paragraph",
        text: "This is the layer that changes the strength of the record. Self-reported data is harder to rely on when the claimant and validator are the same.",
      },
      {
        kind: "paragraph",
        text: "A stronger record includes confirmation from the organization closest to the work. If no partner confirms it, the claim may still be useful internally, but it should not be presented as partner-confirmed evidence.",
      },
    ],
  },
  {
    title: "Layer 4: Audit Trail - Chain of Custody",
    blocks: [
      {
        kind: "paragraph",
        text: "Reviewers do not only want more documents. They want traceability.",
      },
      {
        kind: "bullets",
        items: [
          "When the confirmation occurred",
          "Where the activity happened at an appropriate privacy-safe level",
          "How it was confirmed, such as SMS, app workflow, email, or partner review",
          "Which submission or device context is retained internally according to privacy boundaries",
        ],
      },
      {
        kind: "paragraph",
        text: "The public report does not need to expose sensitive technical metadata. The important point is that the evidence chain is preserved internally and can support review without surfacing private or proprietary verification details.",
      },
    ],
  },
  {
    title: "Layer 5: Framework Alignment - Mapping to Standards",
    blocks: [
      {
        kind: "example",
        text: "SDG 7: Affordable and Clean Energy. ESRS S3.4: affected communities. GRI 413: local communities.",
      },
      {
        kind: "paragraph",
        text: "A disclosure-ready record does not sit in isolation. It connects to the frameworks that matter.",
      },
      {
        kind: "paragraph",
        text: "In Synerxus, outcomes can be mapped to CSRD/ESRS, GRI, SASB, TCFD, BRI, SDGs, and internal ESG goals based on the source record and partner-confirmed context. The goal is alignment by design rather than retroactive spreadsheet mapping.",
      },
    ],
  },
  {
    title: "Layer 6: Quality Checks - Built-In Integrity Controls",
    blocks: [
      {
        kind: "paragraph",
        text: "Before an outcome advances, the record should be checked for completeness, plausibility, consistency, and timeliness.",
      },
      {
        kind: "bullets",
        items: [
          "Plausibility: flags outliers that need review",
          "Consistency: checks whether the skills and activity match the reported output",
          "Timeliness: records whether confirmation happened close to delivery",
          "Completeness: confirms required fields are present before the record advances",
        ],
      },
      {
        kind: "paragraph",
        text: "If something fails, the record should be flagged for review rather than treated as disclosure-ready.",
      },
    ],
  },
  {
    title: "Layer 7: Disclosure Status - Ready for Review",
    blocks: [
      {
        kind: "example",
        text: "Status: partner-confirmed. Evidence-chain completeness: 100%. Assurance boundary indicator: internal Synerxus metric estimating how much of a disclosure area is supported by verified evidence.",
      },
      {
        kind: "paragraph",
        text: "Every Evidence Object should carry a clear status. Is it draft, submitted, partner-confirmed, reviewed, or ready for reporting?",
      },
      {
        kind: "paragraph",
        text: "This removes ambiguity for internal teams and external reviewers. Even strong source data can create review friction if its readiness is unclear.",
      },
    ],
  },
  {
    title: "Why All Seven Layers Matter",
    blocks: [
      {
        kind: "paragraph",
        text: "Assurance providers need to understand what was claimed, what source records support it, who confirmed it, and whether the evidence chain is complete enough to review.",
      },
      {
        kind: "paragraph",
        text: "When all seven layers are present, teams can reduce back-and-forth, support sampling, and explain why a claim belongs in a disclosure workflow.",
      },
    ],
  },
  {
    title: "The Bottom Line",
    blocks: [
      {
        kind: "paragraph",
        text: "An Evidence Object is not just a technical artifact. It is the structured record behind a sustainability claim.",
      },
      {
        kind: "paragraph",
        text: "It shows what happened, who confirmed it, what supports it, how it maps to relevant frameworks, and whether it is ready for review.",
      },
      {
        kind: "quote",
        text: "In the new era of ESG reporting, claims without structure are not just weaker. They are harder to use.",
      },
    ],
  },
];

function ArticleBlockView({ block }: { block: ArticleBlock }) {
  if (block.kind === "paragraph") {
    return <p className="text-base leading-8 text-slate-700">{block.text}</p>;
  }

  if (block.kind === "quote") {
    return (
      <blockquote className="border-l-4 border-[#D4980C] bg-[#0A1F44]/5 px-5 py-4 text-lg font-bold leading-8 text-[#0A1F44]">
        {block.text}
      </blockquote>
    );
  }

  if (block.kind === "example") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold leading-7 text-slate-700">
        {block.text}
      </div>
    );
  }

  if (block.kind === "bullets") {
    return (
      <ul className="grid gap-2">
        {block.items.map((item) => (
          <li key={item} className="flex gap-3 text-base leading-7 text-slate-700">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4980C]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="grid gap-4">
      {block.items.map((item, index) => (
        <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0A1F44] text-sm font-bold text-[#D4980C]">
              {index + 1}
            </span>
            <div>
              <h4 className="font-extrabold text-[#0A1F44]">{item.title}</h4>
              <p className="mt-1 text-sm leading-7 text-slate-600">{item.body}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ArticleCard({
  article,
  series,
  onOpenArticle,
}: {
  article: Article;
  series: string;
  onOpenArticle?: () => void;
}) {
  const badgeStyle =
    typeBadgeStyles[article.type] ?? "border-slate-200 bg-slate-100 text-slate-600";

  if (onOpenArticle) {
    return (
      <button
        type="button"
        className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-[#0A1F44]/25 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#D4980C] focus:ring-offset-2"
        onClick={onOpenArticle}
      >
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-[#0A1F44]/15 bg-[#0A1F44]/5 px-2.5 py-0.5 text-[11px] font-bold text-[#0A1F44]">
            {series}
          </span>
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badgeStyle}`}>
            {article.type}
          </span>
        </div>
        <h3 className="mt-4 flex-1 font-extrabold leading-snug text-[#0A1F44]">
          {article.title}
        </h3>
        <div className="mt-4 flex w-full items-center justify-between border-t border-slate-100 pt-3">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
            <Clock3 className="h-3 w-3" />
            {article.readTime}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-[#0A1F44]/50 transition-colors group-hover:text-[#0A1F44]">
            Read Article <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </button>
    );
  }

  return (
    <details className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all open:border-[#0A1F44]/25 open:shadow-lg">
      <summary className="flex cursor-pointer list-none flex-col gap-4 marker:hidden">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-[#0A1F44]/15 bg-[#0A1F44]/5 px-2.5 py-0.5 text-[11px] font-bold text-[#0A1F44]">
            {series}
          </span>
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badgeStyle}`}>
            {article.type}
          </span>
        </div>
        <h3 className="font-extrabold leading-snug text-[#0A1F44]">{article.title}</h3>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
            <Clock3 className="h-3 w-3" />
            {article.readTime}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-[#0A1F44]/50 transition-colors group-open:text-[#0A1F44]">
            <span className="group-open:hidden">Read Article</span>
            <span className="hidden group-open:inline">Collapse</span>
            <ArrowRight className="h-3 w-3 transition-transform group-open:rotate-90" />
          </span>
        </div>
      </summary>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-sm leading-relaxed text-slate-600">{article.description}</p>
      </div>
    </details>
  );
}

function LocalArticleReader({
  id,
  isOpen,
  onClose,
  title,
  subtitle,
  readTime,
  sections,
  className = "bg-white",
}: {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  readTime: string;
  sections: FullArticleSection[];
  className?: string;
}) {
  if (!isOpen) return null;

  return (
    <section id={id} className={`${className} py-14 md:py-20`}>
      <article className="mx-auto max-w-3xl px-4 md:px-8">
        <div className="mb-6 flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-slate-300 text-slate-700 hover:border-[#0A1F44] hover:text-[#0A1F44]"
            onClick={onClose}
          >
            Close Article
          </Button>
        </div>
        <header className="border-b border-slate-200 pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#0A1F44]/15 bg-[#0A1F44]/5 px-3 py-1 text-xs font-bold text-[#0A1F44]">
              Evidence Objects
            </span>
            <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
              <Clock3 className="h-3 w-3" />
              {readTime}
            </span>
          </div>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0A1F44] md:text-5xl">
            {title}
          </h2>
          <p className="mt-4 text-xl font-semibold leading-8 text-slate-600">{subtitle}</p>
        </header>

        <div className="mt-8 space-y-12">
          {sections.map((section) => (
            <section key={section.title} className="space-y-5">
              <h3 className="text-2xl font-extrabold text-[#0A1F44]">{section.title}</h3>
              <div className="space-y-5">
                {section.blocks.map((block, index) => (
                  <ArticleBlockView key={`${section.title}-${index}`} block={block} />
                ))}
              </div>
            </section>
          ))}
          <Button
            type="button"
            variant="outline"
            className="border-slate-300 text-slate-700 hover:border-[#0A1F44] hover:text-[#0A1F44]"
            onClick={onClose}
          >
            Collapse Article
          </Button>
        </div>
      </article>
    </section>
  );
}

export default function InsightsPage() {
  const [isFeaturedArticleOpen, setIsFeaturedArticleOpen] = useState(false);
  const [isSourceRecordArticleOpen, setIsSourceRecordArticleOpen] = useState(false);
  const [isAnatomyArticleOpen, setIsAnatomyArticleOpen] = useState(false);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [recentIssues, setRecentIssues] = useState<RecentIssue[]>(defaultRecentIssues);
  const [activeIssueIndex, setActiveIssueIndex] = useState(0);

  const activeFeaturedArticle = featuredArticles[activeFeaturedIndex];
  const sortedRecentIssues = [...recentIssues].sort(
    (a, b) => getIssueNumber(b.issue) - getIssueNumber(a.issue),
  );

  useEffect(() => {
    let isCurrent = true;

    fetch("/verifiable-issues.json", { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) throw new Error("Issue feed unavailable");
        return response.json();
      })
      .then((data: unknown) => {
        const issues = Array.isArray(data) ? data.filter(isRecentIssue) : [];
        if (isCurrent && issues.length > 0) {
          setRecentIssues(issues);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setRecentIssues(defaultRecentIssues);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (sortedRecentIssues.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveIssueIndex((current) => (current + 1) % sortedRecentIssues.length);
    }, 3500);

    return () => window.clearInterval(interval);
  }, [sortedRecentIssues.length]);

  useEffect(() => {
    if (activeIssueIndex >= sortedRecentIssues.length) {
      setActiveIssueIndex(0);
    }
  }, [activeIssueIndex, sortedRecentIssues.length]);

  function openFeaturedArticle() {
    setIsFeaturedArticleOpen(true);
    window.requestAnimationFrame(() => {
      document
        .getElementById("what-is-esg-evidence-object")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openLocalArticleByTitle(title: string) {
    if (title === "What is an ESG Evidence Object?") {
      openFeaturedArticle();
    } else if (title === "Why every sustainability claim needs a source record") {
      setIsSourceRecordArticleOpen(true);
      window.requestAnimationFrame(() => {
        document
          .getElementById("why-every-sustainability-claim-needs-source-record")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else if (title === "Anatomy of a disclosure-ready Evidence Object") {
      setIsAnatomyArticleOpen(true);
      window.requestAnimationFrame(() => {
        document
          .getElementById("anatomy-of-disclosure-ready-evidence-object")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function openEditorialArticle(article: Article) {
    openLocalArticleByTitle(article.title);
  }

  function showPreviousFeaturedArticle() {
    setActiveFeaturedIndex((current) =>
      current === 0 ? featuredArticles.length - 1 : current - 1,
    );
  }

  function showNextFeaturedArticle() {
    setActiveFeaturedIndex((current) =>
      current === featuredArticles.length - 1 ? 0 : current + 1,
    );
  }

  return (
    <MarketingLayout>
      {/* 1. Hero */}
      <section className="bg-[#061A36] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4980C]">
            A Synerxus Publication
          </p>
          <h1 className="mt-4 max-w-2xl text-5xl font-extrabold tracking-tight text-white md:text-7xl">
            The Verifiable
          </h1>
          <p className="mt-5 max-w-2xl text-xl font-semibold leading-relaxed text-[#D4980C]">
            A Synerxus publication on evidence-first ESG reporting, claim defensibility, and
            partner-confirmed impact.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            ESG reporting is moving from broad disclosure to defensible evidence. The Verifiable
            explores how organizations can turn sustainability claims into structured Evidence
            Objects with source records, partner confirmation, chain-of-custody history, and
            framework mapping.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-[#D4980C] text-[#0A1F44] hover:bg-[#B07F0A]">
              <a href={VERIFIABLE_LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
                Read the Latest
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[#D4980C]/60 text-[#D4980C] hover:border-[#D4980C] hover:bg-[#D4980C]/10"
            >
              <a href={LINKEDIN_FOLLOW_URL} target="_blank" rel="noopener noreferrer">
                <Linkedin className="mr-2 h-4 w-4" />
                Follow on LinkedIn
              </a>
            </Button>
          </div>
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
                  Recent Issues
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-white">
                  Latest from The Verifiable
                </h2>
              </div>
              <a
                href={VERIFIABLE_LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#D4980C] transition-colors hover:text-[#FFD95A]"
              >
                View newsletter
              </a>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {sortedRecentIssues.map((item, index) => {
                const active = index === activeIssueIndex;
                return (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex min-h-[132px] flex-col rounded-2xl border p-4 transition-all ${
                      active
                        ? "border-[#D4980C] bg-[#0A1F44] shadow-lg shadow-black/20"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                        active
                          ? "border-[#D4980C]/30 bg-[#D4980C]/15 text-[#D4980C]"
                          : "border-white/10 bg-white/5 text-white/70"
                      }`}>
                        {item.issue}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                        active ? "text-white/60" : "text-white/35"
                      }`}>
                        {index === activeIssueIndex ? "Now" : "Next"}
                      </span>
                    </div>
                    <h3 className={`mt-3 flex-1 text-sm font-extrabold leading-snug ${
                      active ? "text-white" : "text-white/85"
                    }`}>
                      {item.title}
                    </h3>
                    <div className={`mt-4 flex items-center gap-1.5 text-xs font-bold ${
                      active ? "text-[#D4980C]" : "text-white/55"
                    }`}>
                      <Linkedin className="h-3.5 w-3.5" />
                      Open on LinkedIn
                      <ArrowRight className="ml-auto h-3.5 w-3.5" />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Issue */}
      <section id="featured" className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
                Featured Issues
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-[#0A1F44]">
                Read the local evidence-first articles.
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-slate-300 text-[#0A1F44] hover:border-[#0A1F44]"
                onClick={showPreviousFeaturedArticle}
                aria-label="Previous featured article"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-slate-300 text-[#0A1F44] hover:border-[#0A1F44]"
                onClick={showNextFeaturedArticle}
                aria-label="Next featured article"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/10 lg:grid lg:grid-cols-[1fr_400px]">
            <div className="bg-[#0A1F44] p-8 md:p-12">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-blue-400/30 bg-blue-400/15 px-3 py-1 text-xs font-bold text-blue-300">
                  {activeFeaturedArticle.category}
                </span>
                <span className="rounded-full border border-[#D4980C]/30 bg-[#D4980C]/15 px-3 py-1 text-xs font-bold text-[#D4980C]">
                  {activeFeaturedArticle.type}
                </span>
                <span className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                  <Clock3 className="h-3 w-3" />
                  {activeFeaturedArticle.readTime}
                </span>
              </div>
              <h2 className="mt-6 text-3xl font-extrabold leading-tight text-white md:text-4xl">
                {activeFeaturedArticle.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-300">
                {activeFeaturedArticle.description}
              </p>
              <div className="mt-8 flex gap-2">
                {featuredArticles.map((article, index) => (
                  <button
                    key={article.title}
                    type="button"
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeFeaturedIndex
                        ? "w-9 bg-[#D4980C]"
                        : "w-2.5 bg-white/30 hover:bg-white/50"
                    }`}
                    onClick={() => setActiveFeaturedIndex(index)}
                    aria-label={`Show featured article ${index + 1}`}
                    aria-current={index === activeFeaturedIndex ? "true" : undefined}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between bg-slate-50 p-8 md:p-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
                  In this article
                </p>
                <ul className="mt-4 space-y-3">
                  {activeFeaturedArticle.highlights.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#D4980C]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8 flex flex-col gap-3">
                <Button
                  type="button"
                  className="bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a]"
                  onClick={() => openLocalArticleByTitle(activeFeaturedArticle.title)}
                >
                  Read Issue
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:border-[#0A1F44] hover:text-[#0A1F44]"
                  onClick={showNextFeaturedArticle}
                >
                  Next Article
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LocalArticleReader
        id="what-is-esg-evidence-object"
        isOpen={isFeaturedArticleOpen}
        onClose={() => setIsFeaturedArticleOpen(false)}
        title="What Is an ESG Evidence Object?"
        subtitle="The record behind a sustainability claim."
        readTime="7 min read"
        sections={evidenceObjectArticle}
      />

      <LocalArticleReader
        id="why-every-sustainability-claim-needs-source-record"
        isOpen={isSourceRecordArticleOpen}
        onClose={() => setIsSourceRecordArticleOpen(false)}
        title="Why Every Sustainability Claim Needs a Source Record"
        subtitle="How traceable source records reduce ambiguity in reporting and review."
        readTime="4 min read"
        sections={sourceRecordArticle}
        className="bg-slate-50"
      />

      <LocalArticleReader
        id="anatomy-of-disclosure-ready-evidence-object"
        isOpen={isAnatomyArticleOpen}
        onClose={() => setIsAnatomyArticleOpen(false)}
        title="Anatomy of a Disclosure-Ready Evidence Object"
        subtitle="The seven layers that make an Evidence Object reviewable and disclosure-ready."
        readTime="6 min read"
        sections={anatomyEvidenceObjectArticle}
      />

      {/* 3. Recent Issues */}
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-8 flex flex-col gap-1 border-l-4 border-[#D4980C] pl-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
              Archive
            </p>
            <h2 className="text-2xl font-extrabold text-[#0A1F44]">
              Previous Verifiable issues
            </h2>
            <p className="text-sm text-slate-500">
              Read the most recent issues on LinkedIn.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentIssues.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[#0A1F44]/25 hover:shadow-lg sm:p-6"
              >
                <span className="w-fit rounded-full border border-[#D4980C]/30 bg-[#D4980C]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#D4980C]">
                  {item.issue}
                </span>
                <h3 className="mt-4 flex-1 font-extrabold leading-snug text-[#0A1F44]">
                  {item.title}
                </h3>
                <div className="mt-5 flex items-center gap-1.5 border-t border-slate-100 pt-4 text-xs font-bold text-[#0A1F44]/50 transition-colors group-hover:text-[#0A1F44]">
                  <Linkedin className="h-3.5 w-3.5" />
                  Read on LinkedIn
                  <ArrowRight className="ml-auto h-3.5 w-3.5" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Editorial Series */}
      {editorialSeries.map((series, seriesIndex) => (
        <section
          key={series.title}
          className={`py-12 md:py-16 ${seriesIndex % 2 === 0 ? "bg-slate-50" : "bg-white"}`}
        >
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="mb-7 border-l-4 border-[#D4980C] pl-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
                Editorial Series
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-[#0A1F44]">{series.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{series.description}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {series.articles.map((article) => (
                <ArticleCard
                  key={article.title}
                  article={article}
                  series={series.title}
                  onOpenArticle={
                    article.title === "What is an ESG Evidence Object?" ||
                    article.title === "Why every sustainability claim needs a source record" ||
                    article.title === "Anatomy of a disclosure-ready Evidence Object"
                      ? () => openEditorialArticle(article)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* 8. Practical Tools */}
      <section className="bg-[#0A1F44] py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4980C]">
            Practical Tools
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-extrabold text-white md:text-4xl">
            Templates and checklists for reviewing, strengthening, and confirming ESG claims.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {practicalTools.map((tool) => {
              const badgeStyle =
                typeBadgeStyles[tool.type] ?? "border-slate-200 bg-slate-100 text-slate-600";
              return (
                <div
                  key={tool.title}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-5"
                >
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badgeStyle}`}
                    >
                      {tool.type}
                    </span>
                    <span className="rounded-full border border-slate-500/40 bg-slate-500/20 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">
                      Coming Soon
                    </span>
                  </div>
                  <h3 className="mt-4 flex-1 font-extrabold text-white">{tool.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{tool.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. LinkedIn Newsletter CTA */}
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
              <div className="grid md:grid-cols-[1fr_280px]">
                {/* Content */}
              <div className="flex flex-col justify-between p-6 md:p-12">
                <div>
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-5 w-5 text-[#0A1F44]" />
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4980C]">
                      LinkedIn Newsletter
                    </p>
                  </div>
                  <h2 className="mt-3 text-2xl font-extrabold text-[#0A1F44] md:text-4xl">
                    Follow The Verifiable on LinkedIn
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 md:text-base">
                    Get practical field notes on evidence-first ESG reporting, claim defensibility,
                    Evidence Objects, partner confirmation, and audit-ready sustainability evidence.
                  </p>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="mt-8 w-full justify-center bg-[#0A1F44] text-[#D4980C] hover:bg-[#102b5a] sm:w-fit sm:justify-start"
                >
                  <a href={LINKEDIN_FOLLOW_URL} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="mr-2 h-4 w-4" />
                    Follow on LinkedIn
                  </a>
                </Button>
              </div>
              {/* Newsletter preview image */}
              <div className="hidden md:block">
                <img
                  src="/verifiable-preview.svg"
                  alt="The Verifiable newsletter preview"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Final Request Assessment CTA */}
      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-xl md:p-12">
            <h2 className="max-w-3xl text-3xl font-extrabold text-[#0A1F44] md:text-5xl">
              Assess the defensibility of your ESG claims.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              Start with a focused review of your highest-risk or highest-visibility sustainability
              claims and identify which ones need stronger evidence, partner confirmation, or
              disclosure-readiness review.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-7 bg-[#D4980C] text-[#0A1F44] hover:bg-[#B07F0A]"
            >
              <Link href="/request-assessment">Request Assessment</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
