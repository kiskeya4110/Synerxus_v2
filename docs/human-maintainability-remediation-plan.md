# Synerxus Human Maintainability Remediation Plan

Status: in progress
Scope: backend, shared modules, tests, and documentation only
Frontend constraint: do not edit files under `client/`

## Purpose

This plan captures the maintainability cleanup path from the Human Maintainability Audit so work can resume safely after an interruption.

The goal is not to redesign the app, migrate frameworks, or restructure everything at once. The goal is to make the highest-risk Synerxus evidence, reporting, copy governance, and route code easier for a competent engineer to understand and safely modify.

## Operating Rules

- Preserve the current Express + Vite + React architecture.
- Do not edit `vite.config.ts`.
- Do not edit frontend files under `client/`.
- Do not introduce new dependencies unless a specific safety or maintainability need justifies it.
- Prefer small extractions over broad rewrites.
- Keep route behavior stable while moving logic behind clear domain functions.
- Preserve current public language unless replacing duplicated text with canonical shared content.
- Run relevant tests after each phase.

## Current Maintainability Risks

1. Report generation is concentrated in large route handlers.
   - `server/routes/logs.router.ts`
   - `server/routes/csr.router.ts`

2. Verification and confidence-tier logic has canonical shared helpers, but report routes still contain local logic.
   - Canonical source: `shared/validation/index.ts`
   - Canonical constants: `shared/constants.ts`

3. Several route files are overloaded.
   - `server/routes.ts`
   - `server/routes/misc.router.ts`
   - `server/routes/logs.router.ts`
   - `server/routes/csr.router.ts`

4. Copy governance exists but enforcement does not scan enough of the codebase.
   - Canonical content: `shared/content/*`
   - Current tests do not fully cover route templates and generated report HTML.

5. Documentation partially describes the intended architecture rather than the actual implementation.
   - `docs/architecture.md` is missing.
   - Root `ARCHITECTURE.md` exists but should be reconciled with actual route/module ownership.

## Phase 1: Stabilize Rules Without Moving Routes

Status: completed

Objective: remove duplicated safety logic from the highest-risk route code before larger extraction.

Files likely to edit:
- `server/routes/logs.router.ts`
- `server/routes/csr.router.ts`
- `shared/validation/index.ts`
- `shared/constants.ts`
- `server/__tests__/*`

Tasks:
- Replace local `isFullyVerified` and confidence-tier checks in report routes with imports from `shared/validation/index.ts`.
- Confirm all report confidence labels come from `shared/constants.ts`.
- Add or update tests proving incomplete records are not treated as verified.
- Add or update tests proving report confidence-tier separation still works.

Do not:
- Move report templates yet.
- Change frontend report previews.
- Rename public-facing labels without confirming canonical copy.

Verification:
- Run evidence status tests.
- Run confidence-tier tests.
- Run incomplete-record tests.

Completion notes:
- `server/routes/logs.router.ts` now imports the strict verification predicate from `shared/validation/index.ts`.
- The report redaction test now verifies the route depends on the shared predicate instead of defining a local predicate.
- Targeted backend tests passed:
  - `server/__tests__/evidence-status.test.ts`
  - `server/__tests__/confidence-tier-classification.test.ts`
  - `server/__tests__/incomplete-cannot-be-verified.test.ts`
  - `server/__tests__/public-report-redaction.test.ts`

## Phase 2: Strengthen Copy Governance Enforcement

Status: completed

Objective: make prohibited and approved language checks cover the actual risky surfaces.

Files likely to edit:
- `server/__tests__/prohibited-copy-scan.test.ts`
- `shared/content/prohibited-claims.ts`
- `shared/content/approved-claims.ts`
- `shared/content/report-language.ts`
- `docs/copy-governance.md`

Tasks:
- Expand prohibited-copy scan coverage to include:
  - `server/routes/logs.router.ts`
  - `server/routes/csr.router.ts`
  - `server/routes.ts`
  - `server/services/*`
  - `shared/*`
- Keep tests aware of permitted negated usage, such as language explaining what Synerxus does not claim.
- Add an allowlist only for explicit educational, boundary, or prohibited-claims documentation contexts.
- Confirm approved terms remain canonical:
  - Verified Evidence Summary
  - Partner-Confirmed Output
  - Partner-Reported Reach
  - Framework Alignment
  - Reporting and Assurance Support
  - Contribution Evidence

Do not:
- Scan `client/` during this no-frontend phase unless the user explicitly expands scope.
- Rewrite marketing copy in frontend files.

Verification:
- Run prohibited-copy tests.
- Confirm tests fail on newly introduced risky public claims.

Completion notes:
- `server/__tests__/prohibited-copy-scan.test.ts` now scans backend and shared TypeScript sources, excluding backend tests and the prohibited-claims definition file.
- The scan includes additional risky phrase families from the audit, including overbroad verified-impact, causal-proof, and beneficiary-verification wording.
- Backend/shared wording was normalized away from risky claim language without editing frontend files.
- Targeted prohibited-copy test passed.

## Phase 3: Extract Report Domain Logic Behind Existing Routes

Status: started

Objective: make report routes thinner without changing URLs or response formats.

Files likely to create:
- `server/domains/reporting/verified-evidence-summary.ts`
- `server/domains/reporting/corporate-esg-summary.ts`
- `server/domains/reporting/report-redaction-policy.ts`
- `server/domains/reporting/report-html-escape.ts`
- `server/domains/reporting/report-section-order.ts`

Files likely to edit:
- `server/routes/logs.router.ts`
- `server/routes/csr.router.ts`
- `server/__tests__/public-report-redaction.test.ts`

Tasks:
- Extract pure report assembly functions from route handlers.
- Extract redaction-sensitive field policy into one dedicated module.
- Keep route handlers responsible for request parsing, auth checks, calling domain functions, and sending responses.
- Keep generated HTML output stable unless tests demonstrate a safety issue.
- Add direct unit tests for report assembly and redaction policy where practical.

Do not:
- Replace report rendering with a new template engine.
- Change report endpoint paths.
- Change frontend consumers.

Verification:
- Run report redaction tests.
- Run confidence-tier tests.
- Run server type/check command if available.

Progress notes:
- Added `server/domains/reporting/report-redaction-policy.ts`.
- `server/routes/logs.router.ts` now renders the centralized public-report redaction note instead of duplicating the full text inline.
- `server/__tests__/public-report-redaction.test.ts` now verifies the route uses the centralized note and the policy enumerates required redacted topics.
- `server/routes/logs.router.ts` now uses shared confidence-tier and report-section labels for evidence confidence report tables.
- Added `server/__tests__/report-terminology-centralization.test.ts` to guard backend report terminology centralization.
- Added `server/domains/reporting/report-html-escape.ts` and direct tests for report HTML escaping.
- Report redaction, terminology, HTML escaping, and prohibited-copy tests passed after these extractions.

## Phase 4: Split Overloaded Backend Route Buckets

Objective: improve route discoverability without changing API behavior.

Files likely to create:
- `server/routes/public-stats.router.ts`
- `server/routes/opportunity-preferences.router.ts`
- `server/routes/sdg.router.ts`
- `server/routes/ai-proxy.router.ts`

Files likely to edit:
- `server/routes/misc.router.ts`
- `server/routes.ts`

Tasks:
- Move unrelated route groups out of `misc.router.ts`.
- Keep imports and route mounts explicit.
- Preserve existing endpoint paths.
- Add brief route-module comments only where ownership is not obvious.

Do not:
- Rename endpoints.
- Change auth behavior.
- Fold route logic into frontend-facing assumptions.

Verification:
- Run backend route tests if present.
- Run type/check command.
- Manually inspect route mounts.

## Phase 5: Documentation Reconciliation

Status: started

Objective: make docs match the actual Express + Vite + React codebase.

Files likely to create or edit:
- `docs/architecture.md`
- `ARCHITECTURE.md`
- `docs/evidence-model.md`
- `docs/report-methodology.md`
- `docs/copy-governance.md`
- `docs/security-boundaries.md`
- `docs/verification-boundary.md`

Tasks:
- Add `docs/architecture.md` or clearly redirect to root `ARCHITECTURE.md`.
- Document actual route ownership and domain module boundaries.
- Update reporting docs after any report extraction.
- Confirm verification docs point to `shared/validation/index.ts`.
- Confirm copy governance docs reflect actual scan coverage.

Do not:
- Describe future desired structure as if it already exists.
- Mention frontend changes during this backend/shared/docs-only plan.

Verification:
- Cross-check documented files and routes exist.
- Search for stale Next.js or non-Express architecture references.

Progress notes:
- Added `docs/architecture.md` as current-state architecture documentation for the Express + Vite + React repo.
- The new doc explicitly calls out legacy route debt, current backend domain modules, shared governance sources, report safety boundaries, and the no-frontend cleanup constraint.

## Delayed Refactors

These should not be done during the first cleanup pass:

- Full rewrite of `server/routes.ts`.
- Full rewrite of `server/storage.ts`.
- New report rendering framework.
- New validation library.
- Frontend dashboard component decomposition.
- Frontend API request normalization.
- Frontend accessibility refactors.

## Resume Checklist

When resuming this work:

1. Check git status and identify unrelated user changes.
2. Re-read this plan.
3. Start with the first incomplete phase.
4. Keep frontend files untouched.
5. Make one small backend/shared/docs change at a time.
6. Run the narrowest relevant tests.
7. Update this file's status notes if the plan changes.

## Completion Criteria

This remediation track is complete when:

- Report verification rules are imported from shared validation.
- Report confidence labels are centralized.
- Prohibited-copy scans cover backend/shared report-generation surfaces.
- Redaction policy is testable outside a route handler.
- The largest report routes are thinner and delegate business logic to domain modules.
- Backend route ownership is easier to discover.
- Documentation reflects the actual repo structure.
- No frontend files were edited during this no-frontend phase.
