# Report Methodology

This document describes how a Synerxus *Verified Evidence Summary* report is
assembled, how figures are computed, and how ESG maturity is presented.

Implementation lives in:
- `server/domains/reporting/verified-evidence-summary-report.ts` — HTML builder
- `server/domains/reporting/report-metrics.service.ts` — canonical KPI computation
- `server/routes/logs.router.ts` — `GET /api/reports/verified-evidence-summary` route

## Report Structure (Dynamic Pages)

The Verified Evidence Summary uses a dynamic page layout. The number of pages
expands automatically based on data volume. Pages always appear in this order:

1. **Cover Page** — organization name, report ID, period, generated date, scope summary
2. **Executive Evidence Snapshot** — 6 headline metrics (see Figure Computation Rules below)
3. **Claim-to-Evidence Traceability** — sample claim register linking claims to evidence records, source support, mapping, and limitations
4. **Evidence Quality and Confidence Scores** — completeness checks across workflow, source-support, location, mapping, and exception indicators
5. **Exceptions and Exclusions** — pending, incomplete, rejected, unsupported, missing-location, and partner-reported figures
6. **Partner-Reported Reach & Framework Alignment** — beneficiary reach kept separate from verified records; formal frameworks shown only if selected
7. **SDG-Aligned Activity Mapping** — top SDG thematic mappings with sample evidence rows and mapping pathway
8. **Evidence Strength and Limitations** — supported and unsupported report uses
9. **Methodology & Definitions** — computation rules, terminology, redaction policy
10. **Evidence Register Appendix** — one or more pages; evidence records table (15 rows per page), chunked automatically
11. **Evidence Readiness Assessment** — workflow setup form and boundary acknowledgement

Minimum output is 8 pages (with 0–15 evidence records). Each additional 15
records adds one page. Total pages are computed at render time and shown in the
footer as `{page} of {total}`.

## Figure Computation Rules

All KPI figures are computed by `computeReportMetrics()` in
`server/domains/reporting/report-metrics.service.ts`.

**Canonical verified definition**: A record is "Verified" when
`verificationStatus === 'approved'`. This matches the organization dashboard's
`verifiedCount` definition so that both views always show the same numbers for
the same organization and period.

- **Verified Evidence Records**: count of records where `verificationStatus === 'approved'`
- **Verified Hours**: sum of `hours` across all approved records
- **Verification Rate**: `approvedCount / totalSubmittedRecords` × 100
- **Eligible Completion Rate**: `approvedCount / (approved + pending + incomplete + rejected)` × 100, shown separately where useful
- **Average Verification Time**: mean of `(verifiedAt − createdAt)` in hours across approved records that have both timestamps; shown as "N/A" if none
- **Partner-Reported Reach**: sum of `beneficiaryCount` across all approved records
- **Incomplete / Rejected counts**: direct counts by status

**Strict evidence chain** (`isFullyVerified()` from `shared/validation/index.ts`):
Used only for the Evidence Quality and Confidence Scores page and confidence breakdown — not for
headline Verified Evidence Record counts. A record passes `isFullyVerified()`
when it has `verifiedAt`, `verifiedBy`, and `date` all set.

**Partner-Reported vs Strictly Verified** (confidence breakdown only):
- Strictly Verified = approved AND passes `isFullyVerified()`
- Partner-Reported = approved AND fails `isFullyVerified()` (missing one or more chain fields)
- Derived/Mapped = pending (submitted but not yet confirmed)

## Record Verification Status (Pipeline Health)

The "Record Verification Status" section shows the health of the evidence
pipeline — not confidence tiers. It answers: of all submitted records in this
report period, how many became verified, how many are still pending, how many
are incomplete, and how many were rejected?

Four-segment bar and table with counts and percentages:
- **Verified** (navy): `verificationStatus === 'approved'`
- **Pending Verification** (gold): `verificationStatus === 'pending'`
- **Incomplete** (orange): `verificationStatus === 'incomplete'`
- **Rejected** (red): `verificationStatus === 'rejected'`

## Evidence Quality and Confidence Scores

Weighted reporting-readiness score (0–100) across these checks:

| Field | Weight |
|---|---|
| Output Description Completeness | 15% |
| Partner Confirmation Completeness | 20% |
| Verification Timestamp Completeness | 15% |
| Activity Date Completeness | 10% |
| Source Attachment Availability | 10% |
| Location Context Availability | 10% |
| SDG Mapping Availability | 5% |
| Formal Framework Mapping Availability | 5% |
| Exception Visibility | 5% |
| Sensitive Metadata Handling | 5% |

Each field score = weight × (passing records / total verified records).

The Review Readiness Score measures reporting-readiness of the evidence
package. It does not represent assurance readiness, regulatory compliance, or
causal impact evidence quality.

## Level 1–5 ESG Maturity Model

The maturity scale describes a program's evidence posture, not a vendor or
auditor judgement. It is read off the data, not asserted.

| Level | Name                  | Posture                                                              |
|-------|-----------------------|----------------------------------------------------------------------|
| 1     | **Anecdotal**         | Self-reported activities only. No partner confirmation in the record set. |
| 2     | **Tracked**           | Activities are systematically logged with project and date, but most lack partner confirmation. |
| 3     | **Partner-Confirmed** | Majority of activities have partner confirmation. Strict-verification fields are inconsistently populated. |
| 4     | **Verification-Ready**| Majority of records pass the full strict-verification gate. Reports can show meaningful Verified Evidence Record counts. |
| 5     | **Assurance Preparation Package Complete** | Strict-verification fields, source support, exception visibility, and metadata status are complete enough to support preparation for independent assurance review. |

Maturity language must always be paired with an explicit qualifier
(e.g. "Level 4 — Verification-Ready") and never with absolute compliance
language. Compliance determinations remain with independent assurance
providers and regulators. Only an independent assurance provider can determine
assurance scope, sufficiency, and conclusions.

## Public Report Redaction

Public-facing reports exclude:

- Device identifiers
- SMS routing and phone workflows
- Raw telemetry signals
- Fraud-control logic
- Proprietary verification mechanics
- Precise geolocation

The redaction note text is fixed in the report template and asserted by
`server/__tests__/verified-evidence-summary-report.test.ts`.
