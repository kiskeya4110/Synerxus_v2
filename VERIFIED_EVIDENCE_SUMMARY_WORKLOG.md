# Verified Evidence Summary Implementation Framework

## Goal

Build an auditor-ready, enterprise-grade `Verified Evidence Summary` preview/export experience and a matching `Evidence Readiness Assessment` setup form, while preserving the existing Express + Vite + React architecture.

## Report Framework

1. Cover / Report Identity
2. Executive Evidence Snapshot
3. Evidence Quality Scorecard
4. Verified Evidence Records
5. Partner-Reported Reach & Framework Alignment
6. SDG Mapping Context & Contribution Pathways
7. Methodology, Definitions, and Report Boundaries
8. Evidence Readiness Assessment / Setup Form

## Required Controls

- Verified totals include only records with completed verification status, timestamp, and authorized confirmation.
- Pending, incomplete, rejected, or missing-verification records are excluded from verified totals.
- Partner-Reported Reach is separated from verified totals.
- Derived / Mapped Alignment and Framework Alignment never imply compliance, certification, endorsement, or assurance.
- Sensitive technical metadata is redacted from management reports.
- Boundary statement appears on the cover and methodology/boundaries page.
- Setup form includes required boundary acknowledgement.

## Boundary Statement

Synerxus provides structured evidence records for reporting and assurance preparation. Synerxus does not provide formal assurance opinions, guarantee regulatory compliance, or establish causal attribution.

## Implementation Checkpoints

- [x] Locate existing report preview/export routes and rendering flow.
- [x] Update server-side report HTML/export to the 8-page report where PDF/HTML export already exists.
- [x] Update dashboard labels only where needed to match `Verified Evidence Summary`.
- [x] Update `/request-assessment` form into `Evidence Readiness Assessment`.
- [x] Verify prohibited terms and overclaims are not introduced.
- [x] Run targeted tests or build checks.

## Verification Completed

- `npm run check`
- `npx vitest run server/__tests__/verified-evidence-summary-report.test.ts server/__tests__/confidence-tier-classification.test.ts server/__tests__/incomplete-cannot-be-verified.test.ts`
- `npm run build`
