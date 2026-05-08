# Synerxus Architecture

Status: current-state documentation
Stack: Express + Vite + React + TypeScript

## Purpose

This document describes the architecture that exists in the repository today. It should not describe a future target state as if it already exists.

The root `ARCHITECTURE.md` remains a broader guide. This file is the maintainability-oriented source for backend, shared, reporting, evidence, verification, and documentation boundaries.

## Current Stack

- Frontend: Vite, React, TypeScript, Wouter, TanStack React Query.
- Backend: Express, TypeScript, Drizzle ORM.
- Shared model layer: `shared/schema.ts`, `shared/constants.ts`, `shared/validation/index.ts`, and `shared/content/*`.
- Tests: Vitest.

## Top-Level Ownership

- `client/`: React application and browser-only rendering behavior.
- `server/`: Express routes, middleware, storage access, backend services, and backend domain modules.
- `shared/`: schema, constants, validation helpers, governed terminology, and cross-runtime utilities.
- `docs/`: current product, evidence, reporting, governance, and security documentation.

## Backend Route Shape

Backend routes are partially modularized.

Primary route files:

- `server/routes.ts`: legacy route mount and remaining legacy route logic. This file is still large and should be treated as a cleanup target, not a thin mount-only file.
- `server/routes/logs.router.ts`: activity logs, verification flows, export/report routes, and Verified Evidence Summary report generation.
- `server/routes/csr.router.ts`: CSR dashboard, reporting, export, and corporate ESG aggregation routes.
- `server/routes/misc.router.ts`: currently overloaded. It includes unrelated public stats, preference, SDG, proxy, matching, notification, and image behavior.
- `server/routes/*.router.ts`: feature-specific routers for admin, activities, applications, dashboards, gamification, organizations, projects, users, volunteers, and related surfaces.

Rule for new backend work:

- Keep new route handlers thin where practical.
- Put reusable business rules in `server/domains/*`, `server/services/*`, or `shared/*`.
- Do not add unrelated endpoints to `misc.router.ts`.
- Preserve existing endpoint paths unless a migration is explicitly planned.

## Backend Domain Modules

Current backend domain folders:

- `server/domains/evidence`: backend-facing evidence exports and shared evidence constants.
- `server/domains/verification`: backend-facing verification exports and shared validation helpers.
- `server/domains/reporting`: reporting constants, report redaction policy, and report HTML escaping.
- `server/domains/compliance`: compliance-oriented exports.

Important reporting modules:

- `server/domains/reporting/verified-evidence-summary-report.ts`: Verified Evidence Summary HTML builder (`buildVerifiedEvidenceSummaryReport`). Produces a dynamic multi-page HTML report (8+ pages) from pre-computed metrics. Page count expands automatically — 15 evidence rows per page.
- `server/domains/reporting/report-metrics.service.ts`: canonical KPI computation (`computeReportMetrics`). Single source of truth for verified counts, hours, verification rate, quality score, and readiness status. Rule: `verificationStatus === 'approved'` = Verified — matches dashboard. `isFullyVerified()` applies only to strict evidence chain checks (quality scorecard).
- `server/domains/reporting/report-redaction-policy.ts`: centralized public-report redaction note and redacted topic list.
- `server/domains/reporting/report-html-escape.ts`: HTML escaping helper for generated backend report HTML.
- `server/domains/reporting/index.ts`: reporting-domain export surface.

Domain folders should not become artificial wrappers. If a domain export is reused in multiple routes or tests, it belongs there. If it is used in only one route and has no business meaning, keep it local until there is a real extraction reason.

## Shared Governance Sources

Canonical shared files:

- `shared/validation/index.ts`: strict evidence verification and confidence-tier classification.
- `shared/constants.ts`: evidence status values, confidence tiers, report section labels, and shared app constants.
- `shared/content/boundary-statements.ts`: Synerxus boundary statements.
- `shared/content/prohibited-claims.ts`: prohibited claim registry and scanner helper.
- `shared/content/approved-claims.ts`: approved product and reporting terminology.
- `shared/content/report-language.ts`: report language that distinguishes Synerxus evidence support from independent assurance.
- `shared/content/framework-language.ts`: framework-specific disclosure support language.

Rules:

- Evidence status rules should come from `shared/validation/index.ts`.
- Confidence-tier labels should come from `shared/constants.ts`.
- Boundary statements should come from `shared/content/boundary-statements.ts`.
- Public report redaction language should come from `server/domains/reporting/report-redaction-policy.ts`.
- Generated report HTML should use `server/domains/reporting/report-html-escape.ts` for untrusted values.

## Reporting Safety Boundaries

Generated reports must avoid exposing:

- device identifiers
- SMS routing and phone workflows
- raw telemetry signals
- fraud control logic
- proprietary verification mechanics
- precise geolocation unless explicitly approved for an internal view

Public-facing report text must not claim that Synerxus replaces independent assurance providers, provides legal/accounting advice, guarantees compliance, proves causal impact, or issues assurance conclusions.

## Test Coverage Anchors

Key maintainability and safety tests:

- `server/__tests__/verified-evidence-summary-report.test.ts`: VES report structure, metric isolation, logo rendering, project count accuracy, redaction assertions.
- `server/__tests__/evidence-status.test.ts`
- `server/__tests__/confidence-tier-classification.test.ts`
- `server/__tests__/incomplete-cannot-be-verified.test.ts`
- `server/__tests__/public-report-redaction.test.ts`
- `server/__tests__/prohibited-copy-scan.test.ts`
- `server/__tests__/report-terminology-centralization.test.ts`
- `server/__tests__/report-html-escape.test.ts`

When changing reporting, verification, copy governance, or redaction behavior, run the relevant focused tests before broader checks.

## Known Maintainability Debt

The following are known debt areas and should be improved incrementally:

- `server/routes.ts` is still too large to treat as a thin route mount file.
- `server/routes/logs.router.ts` still contains large report templates and route handlers.
- `server/routes/csr.router.ts` still contains large aggregation/export handlers.
- `server/routes/misc.router.ts` should be split into clearer route modules.
- `server/storage.ts` remains a broad data-access layer.
- `shared/schema.ts` is large and should be navigated carefully.

Do not fix these by broad rewrites. Prefer small, tested extractions that preserve existing behavior.

## No-Frontend Backend Cleanup Track

The current maintainability remediation track intentionally avoids editing `client/`.

Allowed during this track:

- backend route cleanup
- backend domain extractions
- shared validation/content/constants cleanup
- server/shared tests
- documentation alignment

Not allowed during this track:

- frontend component refactors
- frontend route changes
- frontend API request normalization
- frontend CSS/layout changes
- `vite.config.ts` edits
