import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const contactEmail = "hello@synerxus.com";

type TermsSection = {
  title: string;
  paragraphs?: string[];
  leadList?: string;
  list?: string[];
};

const sections: TermsSection[] = [
  {
    title: "1. About Synerxus",
    paragraphs: [
      "Synerxus provides verified evidence infrastructure for ESG, CSR, corporate volunteering, community investment, social value, and partner-delivered impact programs.",
      "The Services help organizations capture activity data, link activity to outputs, enable authorized partner confirmation, create structured evidence records, support framework alignment, and generate management reports for reporting and assurance preparation.",
      "Synerxus is not a volunteer marketplace alone, ESG reporting certifier, accounting firm, law firm, registered assurance provider, or regulatory compliance body.",
    ],
  },
  {
    title: "2. Important Assurance and Compliance Boundary",
    paragraphs: [
      "Synerxus provides structured, partner-confirmed evidence records that support ESG, CSR, corporate volunteering, community investment, and social value reporting workflows.",
      "Reports generated through Synerxus are management reporting outputs unless separately reviewed by a qualified independent assurance provider.",
      "ISAE 3000 is an assurance standard for engagements other than audits or reviews of historical financial information; Synerxus may support preparation of structured evidence for such processes, but Synerxus does not perform ISAE 3000 assurance engagements.",
    ],
    leadList: "Synerxus does not:",
    list: [
      "replace independent assurance providers;",
      "provide formal assurance opinions;",
      "provide audit opinions;",
      "provide legal, accounting, investment, or regulatory advice;",
      "guarantee regulatory compliance;",
      "certify compliance with CSRD, ESRS, GRI, SASB, ISSB, TCFD, ISAE 3000, UN SDGs, or any other framework;",
      "establish causal attribution or prove long-term impact.",
    ],
  },
  {
    title: "3. Eligibility and User Roles",
    paragraphs: [
      "The Services may be used by individuals and organizations, including corporate customers, ESG and CSR teams, NGO partners, implementation partners, volunteers, authorized verifiers, reviewers, and administrators.",
      "You may use the Services only if you are legally able to enter into a binding agreement and are authorized to act on behalf of the organization you represent.",
      "You are responsible for ensuring that each user has appropriate authority for their assigned role.",
    ],
    leadList: "User roles may include:",
    list: ["Corporate Administrator;", "ESG / CSR User;", "Organization or NGO Partner;", "Authorized Verifier;", "Volunteer;", "Auditor / Reviewer;", "Synerxus Administrator."],
  },
  {
    title: "4. Account Responsibilities",
    paragraphs: ["You may not share login credentials or use another person's account without authorization."],
    leadList: "You are responsible for:",
    list: [
      "maintaining the confidentiality of your login credentials;",
      "all activity under your account;",
      "providing accurate and complete account information;",
      "promptly updating inaccurate information;",
      "ensuring only authorized users access your organization's workspace;",
      "notifying Synerxus of suspected unauthorized access.",
    ],
  },
  {
    title: "5. Acceptable Use",
    leadList: "You agree not to:",
    list: [
      "submit false, misleading, fraudulent, or deceptive information;",
      "confirm outputs you are not authorized or reasonably able to confirm;",
      "misrepresent your role, authority, affiliation, or identity;",
      "use the Services for unlawful, harmful, abusive, or discriminatory purposes;",
      "harass, threaten, or harm other users;",
      "upload malicious code, malware, or harmful files;",
      "interfere with platform security or availability;",
      "attempt unauthorized access to accounts, systems, data, or reports;",
      "scrape, reverse engineer, or misuse the Services;",
      "use Synerxus outputs in a false, misleading, or unsubstantiated ESG, sustainability, social impact, or environmental claim.",
    ],
  },
  {
    title: "6. Evidence Records and Verification Boundaries",
    paragraphs: [
      "Synerxus uses the following evidence framework:",
      "Synerxus verifies platform records and partner confirmations according to configured workflows. Synerxus does not independently verify all downstream outcomes, beneficiary-level exposure, long-term impact, environmental effects, or causal attribution unless expressly agreed in a separate written agreement.",
    ],
    list: [
      "Activity: Work performed, including volunteer time, funded activity, or program activity.",
      "Output: What was delivered or completed.",
      "Partner Confirmation: Confirmation by an authorized partner or verifier.",
      "Verified Evidence Record: A structured record created after required confirmation steps are completed.",
      "Partner-Reported Reach: Beneficiary, community, or program reach data reported by a partner according to its methodology.",
      "Derived / Mapped Alignment: Framework or SDG alignment generated from classification, methodology, or reporting rules.",
      "Contribution Evidence: Evidence connecting activity to partner-confirmed outputs.",
      "Causal Proof: Formal evidence of causation, typically requiring rigorous evaluation methods outside the standard Synerxus workflow.",
    ],
  },
  {
    title: "7. Customer and User Data",
    paragraphs: [
      '"Customer Data" includes information, files, evidence records, activity records, partner confirmations, volunteer information, reports, uploaded materials, and other content submitted to or generated through the Services.',
      "You retain ownership of Customer Data. You grant Synerxus a limited license to host, process, transmit, display, analyze, and use Customer Data as necessary to provide, secure, maintain, improve, and support the Services.",
    ],
    leadList: "You represent and warrant that:",
    list: [
      "you have the rights and permissions needed to submit Customer Data;",
      "Customer Data is accurate to the best of your knowledge;",
      "submission and use of Customer Data does not violate law, contract, privacy rights, confidentiality obligations, or third-party rights;",
      "you have obtained required consents from volunteers, staff, partners, beneficiaries, or other individuals where applicable.",
    ],
  },
  {
    title: "8. Volunteer Participation",
    leadList: "If you participate as a volunteer, you agree that:",
    list: [
      "you will submit accurate activity and time information;",
      "your submitted activity may be reviewed or confirmed by participating organizations or authorized partners;",
      "your activity data may be used in aggregated, redacted, or reportable evidence records;",
      "participation through Synerxus does not create an employment, contractor, agency, partnership, fiduciary, or compensation relationship with Synerxus or any participating organization unless separately agreed in writing.",
    ],
  },
  {
    title: "9. Partner and Verifier Responsibilities",
    paragraphs: [
      "Organizations, NGO partners, implementation partners, and authorized verifiers are responsible for confirming only those activities or outputs they are authorized and reasonably able to validate.",
      "Synerxus may suspend or revoke verifier access if confirmations appear inaccurate, unauthorized, abusive, or inconsistent with these Terms.",
    ],
    leadList: "Authorized verifiers agree to:",
    list: [
      "provide truthful confirmations;",
      "disclose known limitations;",
      "avoid confirming unobserved, unsupported, or speculative outputs;",
      "correct errors promptly;",
      "maintain appropriate records supporting confirmations;",
      "comply with applicable partner verification procedures.",
    ],
  },
  {
    title: "10. Reports and Framework Alignment",
    paragraphs: [
      "Synerxus may generate reports, summaries, dashboards, evidence records, framework mappings, or other outputs.",
      "Framework alignment does not constitute certification, endorsement, formal assurance, legal advice, accounting advice, regulatory approval, or compliance determination.",
      "Customers are solely responsible for reviewing all reports before using them in sustainability reports, investor materials, regulatory filings, public marketing, websites, press releases, or other external communications.",
    ],
    leadList: "Unless expressly stated otherwise, these outputs are provided for:",
    list: ["internal management reporting;", "ESG / CSR reporting support;", "corporate volunteering reporting support;", "community investment reporting support;", "assurance preparation;", "evidence organization."],
  },
  {
    title: "11. ESG, Environmental, Sustainability, and Impact Claims",
    paragraphs: [
      "You are solely responsible for any ESG, environmental, sustainability, social impact, volunteer, community investment, public-benefit, or similar claim you make using or referencing the Services.",
      "You may not use Synerxus reports, badges, dashboards, evidence records, screenshots, exports, or platform outputs in a way that is false, misleading, deceptive, unsubstantiated, or inconsistent with stated limitations.",
      "The FTC Green Guides are intended to help marketers avoid environmental claims that mislead consumers, and FTC guidance cautions against broad, unqualified environmental benefit claims that are difficult or impossible to substantiate.",
    ],
    leadList: "Accordingly, you agree not to represent that Synerxus:",
    list: [
      "provides causal impact evidence;",
      "proves causality;",
      "guarantees ESG performance;",
      "determines regulatory compliance;",
      "certifies framework alignment;",
      "provides formal assurance;",
      "has approved your public claims;",
      "has independently verified beneficiary reach unless expressly stated.",
    ],
  },
  {
    title: "12. Privacy",
    paragraphs: [
      "Use of the Services is subject to the Synerxus Privacy Policy, which describes how Synerxus collects, uses, discloses, retains, and protects personal information.",
      "If you collect or submit personal information through the Services, you are responsible for providing required notices, obtaining required consents, and complying with applicable privacy laws.",
      "California privacy law gives California consumers rights regarding personal information collected by businesses, including rights related to access, deletion, correction, and control over certain uses of personal information.",
      "Enterprise customers may be required to enter into a separate Data Processing Addendum.",
    ],
  },
  {
    title: "13. Security and Sensitive Metadata",
    paragraphs: [
      "Synerxus uses commercially reasonable administrative, technical, and organizational safeguards designed to protect the Services.",
      "Synerxus may retain technical metadata, audit events, timestamps, role information, system identifiers, access logs, verification status data, and related records to operate, secure, audit, and improve the Services.",
      "Public or management-facing reports may redact personal identifiers, precise geolocation, sensitive technical metadata, and other confidential information. Detailed supporting records may be made available to authorized reviewers subject to privacy, confidentiality, contractual restrictions, and customer approval.",
      "Unless expressly documented and technically supported, Synerxus does not represent that all records are immutable. Where applicable, Synerxus may describe records as system-retained or tamper-evident.",
    ],
  },
  {
    title: "14. AI-Assisted and Automated Features",
    paragraphs: [
      "The Services may include automated or AI-assisted features for classification, matching, summarization, framework alignment, report drafting, quality review, or recommendations.",
      "AI-assisted outputs are provided to support human review and decision-making. You are responsible for reviewing such outputs before relying on them or using them externally.",
      "Synerxus does not guarantee that automated classifications, mappings, summaries, recommendations, or generated text will be complete, accurate, legally sufficient, or appropriate for any specific reporting requirement.",
    ],
  },
  {
    title: "15. Intellectual Property",
    paragraphs: [
      "Synerxus and its licensors own all rights, title, and interest in the Services, including software, designs, workflows, interfaces, report templates, methodologies, documentation, logos, trademarks, algorithms, data models, and platform technology.",
      "Except for rights expressly granted in these Terms, no rights are transferred to you.",
      "You may not copy, modify, reverse engineer, decompile, disassemble, reproduce, resell, sublicense, or create derivative works from the Services except as permitted by law or written agreement.",
    ],
  },
  {
    title: "16. Customer Reports and Output Use",
    paragraphs: [
      "Subject to these Terms and applicable order forms, customers may use Synerxus-generated reports for internal business purposes and authorized reporting workflows.",
      "External use of reports, excerpts, screenshots, badges, evidence records, or claims derived from Synerxus must preserve applicable limitations, disclaimers, confidence tiers, and reporting boundaries.",
      "Synerxus may require correction, removal, or clarification of any public use of Synerxus outputs that Synerxus reasonably believes is misleading, inaccurate, overclaiming, or inconsistent with these Terms.",
    ],
  },
  {
    title: "17. Confidentiality",
    paragraphs: [
      "Nonpublic information disclosed through the Services may be confidential, including customer data, partner data, platform methods, pilot results, pricing, reports, verification workflows, business plans, and technical information.",
      "You agree to protect confidential information using reasonable care and not disclose it except as authorized or required by law.",
    ],
  },
  {
    title: "18. Publicity and Logo Use",
    paragraphs: [
      "You may not use Synerxus names, logos, trademarks, badges, report labels, or brand assets except as permitted by Synerxus brand guidelines or written approval.",
      "Synerxus will not use a customer's name or logo in public marketing without permission, unless otherwise agreed in an order form or written agreement.",
      "You may not imply that Synerxus, any standards organization, framework owner, regulator, auditor, or third party endorses, certifies, approves, or guarantees your claims unless you have written authorization.",
    ],
  },
  {
    title: "19. Fees and Payment",
    paragraphs: [
      "Some Services may be free, pilot-based, subscription-based, or usage-based.",
      "If you purchase paid Services, fees, billing terms, renewal terms, taxes, usage limits, cancellation rights, and payment obligations will be set forth in an order form, subscription agreement, or checkout process.",
      "Failure to pay amounts due may result in suspension or termination of access.",
    ],
  },
  {
    title: "20. Third-Party Services and Links",
    paragraphs: [
      "The Services may integrate with or link to third-party services, including identity providers, cloud storage, analytics tools, communication tools, or customer systems.",
      "Synerxus is not responsible for third-party services, content, security, availability, or practices. Your use of third-party services may be governed by separate terms and privacy policies.",
    ],
  },
  {
    title: "21. Suspension and Termination",
    paragraphs: [
      "Upon termination, access to the Services may end, but certain provisions will survive, including confidentiality, intellectual property, payment obligations, disclaimers, limitations of liability, indemnification, and report-use restrictions.",
    ],
    leadList: "Synerxus may suspend or terminate access if:",
    list: ["you violate these Terms;", "you fail to pay fees;", "your use creates security, legal, operational, or reputational risk;", "you misuse reports or platform outputs;", "you submit or confirm false or misleading information;", "you attempt unauthorized access;", "required by law or contractual obligation."],
  },
  {
    title: "22. Disclaimers",
    paragraphs: ['The Services are provided "as is" and "as available" to the maximum extent permitted by law.'],
    leadList: "Synerxus does not warrant that:",
    list: [
      "the Services will be uninterrupted, error-free, or secure;",
      "all submitted data will be accurate or complete;",
      "any report will satisfy a particular auditor, regulator, investor, customer, standard setter, or disclosure requirement;",
      "framework mappings will be legally sufficient;",
      "use of the Services will prevent greenwashing, litigation, regulatory review, reputational harm, or assurance findings.",
    ],
  },
  {
    title: "23. Limitation of Liability",
    paragraphs: [
      "To the maximum extent permitted by law, Synerxus will not be liable for indirect, incidental, special, consequential, exemplary, punitive, or lost-profit damages, including loss of data, goodwill, business opportunity, or anticipated savings.",
      "To the maximum extent permitted by law, Synerxus' total liability arising out of or related to the Services will not exceed the amounts paid by you to Synerxus for the Services giving rise to the claim during the twelve months before the event giving rise to liability, or one hundred dollars ($100) if no fees were paid.",
      "Some jurisdictions do not allow certain limitations, so some limitations may not apply.",
    ],
  },
  {
    title: "24. Indemnification",
    leadList: "You agree to defend, indemnify, and hold harmless Synerxus and its officers, directors, employees, contractors, agents, affiliates, and licensors from claims, damages, liabilities, losses, costs, and expenses arising from:",
    list: ["your use of the Services;", "Customer Data;", "your public ESG, sustainability, environmental, social impact, volunteer, or community investment claims;", "misuse of reports or evidence records;", "violation of these Terms;", "violation of law;", "infringement or misappropriation of third-party rights;", "unauthorized collection, submission, or disclosure of personal information;", "false, misleading, or unauthorized confirmations."],
  },
  {
    title: "25. Changes to the Services or Terms",
    paragraphs: [
      "Synerxus may modify the Services or these Terms from time to time.",
      "If changes are material, Synerxus will make reasonable efforts to provide notice. Continued use of the Services after changes become effective constitutes acceptance of the updated Terms.",
    ],
  },
  {
    title: "26. Governing Law and Dispute Resolution",
    paragraphs: [
      "These Terms are governed by the laws of the State of California, without regard to conflict-of-law principles.",
      "Any disputes arising from or relating to these Terms or the Services will be resolved in the state or federal courts located in California, unless a separate written agreement requires arbitration or another dispute-resolution process.",
    ],
  },
];

export default function Terms() {
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: May 4, 2026</p>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              These Terms of Service ("Terms") govern your access to and use of Synerxus websites, dashboards, reports,
              verification workflows, evidence records, APIs, and related services (collectively, the "Services").
            </p>
            <p>By accessing or using the Services, you agree to these Terms. If you do not agree, do not use the Services.</p>

            {sections.map((section) => (
              <section key={section.title} className="mb-8">
                <h2 className="mb-3 text-xl font-semibold">{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.leadList && <p>{section.leadList}</p>}
                {section.list && (
                  <ul className="mt-2 list-disc space-y-1 pl-6">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section className="mb-6">
              <h2 className="mb-3 text-xl font-semibold">27. Contact</h2>
              <p>If you have questions about these Terms, contact:</p>
              <p>
                Synerxus
                <br />
                Email:{" "}
                <a href={`mailto:${contactEmail}`} className="text-primary-600 hover:underline">
                  {contactEmail}
                </a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </MarketingLayout>
  );
}
