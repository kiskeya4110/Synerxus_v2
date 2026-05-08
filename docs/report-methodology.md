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
3. **Evidence Quality Scorecard** — completeness checks across 7 required fields with weighted quality score
4. **Verified Evidence Records** — one or more pages; evidence records table (15 rows per page), chunked automatically
5. **Partner-Reported Reach** — beneficiary reach from all approved records, community and program counts
6. **SDG Contribution Examples** — top 3 SDGs with activity counts, hours, sample evidence rows, contribution pathway
7. **Methodology & Definitions** — computation rules, terminology, redaction policy
8. **Evidence Readiness Assessment** — ESG maturity level, readiness status, acknowledgement statement

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
- **Verification Rate**: `approvedCount / (approved + pending + incomplete + rejected)` × 100
- **Average Verification Time**: mean of `(verifiedAt − createdAt)` in hours across approved records that have both timestamps; shown as "N/A" if none
- **Partner-Reported Reach**: sum of `beneficiaryCount` across all approved records
- **Incomplete / Rejected counts**: direct counts by status

**Strict evidence chain** (`isFullyVerified()` from `shared/validation/index.ts`):
Used only for the Evidence Quality Scorecard and confidence breakdown — not for
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

## Evidence Quality Scorecard

Weighted completeness score (0–100) across these checks:

| Field | Weight |
|---|---|
| Output Description Completeness | 15% |
| Partner Confirmation Completeness | 20% |
| Verification Timestamp Completeness | 15% |
| Activity Date Completeness | 10% |
| Source Attachment Availability | 10% |
| Location Context Availability | 10% |
| Framework Mapping Availability | 10% |
| Incomplete records excluded (structural) | 5% |
| Metadata redacted from public output | 5% |

Each field score = weight × (passing records / total verified records).

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
