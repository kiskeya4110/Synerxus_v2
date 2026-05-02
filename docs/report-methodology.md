# Report Methodology

This document describes how a Synerxus *Verified Evidence Summary* report is
assembled, how figures are computed, and how confidence tiers and ESG
maturity are presented. Implementation lives in
`server/routes/logs.router.ts` (Reports A and B).

## Report Structure (9 sections)

Every Verified Evidence Summary follows the same 9-section taxonomy.
Section labels and ordering are exported from
`shared/constants.ts → REPORT_SECTION_LABELS / REPORT_SECTION_ORDER`.

1. **Executive Snapshot** — headline counts (Verified Evidence Records,
   hours, outputs, unique volunteers, verification rate).
2. **Evidence Confidence Tiers** — split of total classified records into
   Verified / Partner-Reported / Derived-Mapped, with percentage of total.
3. **Evidence Quality Scorecard** — completeness score across required
   fields (date, partner, geo, evidence URL).
4. **Framework Alignment for Reporting Support** — SDG, GRI, ESRS mapping,
   shown as derived alignment, not as compliance.
5. **Sample Verified Evidence Records** — up to N records that pass the
   full strict-verification gate. Records that fail the gate are excluded
   from this section, no matter their verification status.
6. **Negative Impact Screening Summary** — flagged-records review with
   reasons for exclusion or redaction.
7. **Contribution Pathway** — narrative connecting activities → outputs →
   stated outcomes. Always phrased as contribution, never as attribution.
8. **Methodology & Definitions** — links to this document and to the
   evidence model.
9. **Assurance Boundary Statement** — verbatim
   `SYNERXUS_BOUNDARY_STATEMENT`.

## Figure Computation Rules

- All headline counts and "Verified" tier metrics are computed **only** on
  records that pass `isFullyVerified()`.
- Partner-Reported Reach figures are computed on records with
  `verificationStatus === 'approved'` that fail the strict gate.
- Derived / Mapped figures are computed from confirmed inputs against
  framework taxonomies; they are **never** added to Verified Evidence Record
  counts.
- Verification rate = `verifiedRecords / totalSubmittedRecords` (excluding
  rejected and incomplete).
- Sample records in Section 5 are sorted by `verifiedAt` desc, then `date`
  desc.

## Level 1–5 ESG Maturity Model

The maturity scale describes a program's evidence posture, not a vendor or
auditor judgement. It is read off the data, not asserted.

| Level | Name                  | Posture                                                              |
|-------|-----------------------|----------------------------------------------------------------------|
| 1     | **Anecdotal**         | Self-reported activities only. No partner confirmation in the record set. |
| 2     | **Tracked**           | Activities are systematically logged with project and date, but most lack partner confirmation. |
| 3     | **Partner-Confirmed** | Majority of activities have partner confirmation. Strict-verification fields are inconsistently populated. |
| 4     | **Verification-Ready**| Majority of records pass the full strict-verification gate. Reports can show meaningful Verified Evidence Record counts. |
| 5     | **Assurance-Ready**   | Strict-verification rate is high enough that the record set is suitable for handing to an independent assurance provider for ISAE 3000 (or equivalent) review. |

Maturity language must always be paired with an explicit qualifier
(e.g. "Level 4 — Verification-Ready") and never with absolute compliance
language. Compliance determinations remain with independent assurance
providers and regulators.

## Public report redaction

Public-facing reports include a **Redaction Note** at the top of the
document. Redacted items include:

- Device identifiers
- SMS routing and phone workflows
- Raw telemetry signals
- Fraud-control logic
- Proprietary verification mechanics

The note text is fixed in the report template and is asserted by the
public-report redaction tests (`public-report-redaction.test.ts`).
