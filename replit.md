# Synerxus — Connect. Manage. Impact Globally.

## Live Deployment
- **Production (custom domain)**: https://synerxus.com
- **Replit deployment URL**: https://synerxus-esg.replit.app
- **Health check**: `GET /api/health` returns 200
- **CORS whitelist** (shared env `CORS_WHITELIST`): `https://synerxus.com`, `https://www.synerxus.com`, `https://synerxus-esg.replit.app`
- **Last published**: 2026-05-08

## Overview
Synerxus is an AI-powered impact data infrastructure platform (PWA) that connects volunteers, NGOs, and corporations for ESG/SDG reporting. The core MVP flow is: volunteers log verified outcomes → NGOs verify within 72h → corporates access audit-ready data for CSRD-compliant ESG reporting. The platform vision is "Intelligent connections for sustainable development worldwide," with an outcome-first approach replacing self-reported hours and estimates.

## User Preferences
- Preferred communication style: Simple, everyday language.
- No AIU (Attributable Impact Units) in pilot — use "Impact Score", "Verified Outcomes", or "Ground-Truth Outcomes" instead.
- CSRD/ESRS language: use "Impact Materiality Assessment" (not "Double Materiality Disclosure"), "disclosures" (not "requirements"), "Framework Guidance" (not "Global Framework Requirement"), "are globally recognized" (not "apply globally").

## Branding
- Logo file: `/synerxus-esg-logo.png`
- Wordmark: navy `#0A2463` "SYNER" + gold `#D4980C` "XUS" (no space between)
- Tagline: "Impacts. Verified." (period after Impacts, no comma)
- Footer/report tagline: "ISAE 3000 Revised · Audit-Supported"
- Primary nav blue: `#0A1F44`; accent gold: `#D4980C`

## System Architecture

### UI/UX Decisions
- Mobile-optimized, role-based dashboard with UN SDG-themed color schemes
- `shadcn/ui` components built on Radix UI; light theme with vibrant accents
- Three distinct dashboard experiences: Volunteer, Organization (dark green), Corporate/CSR
- Opportunity displays: 2-column layout for AI analysis + SDG alignment
- Mobile PWA detail views: hero images, match score badges, "Why this is a good match" sections, SDG circles, task counts, time commitments, teal-to-blue gradient headers
- Report print CSS: `@page { margin: 15mm 15mm 12mm }` on client-side generators; `break-inside: avoid` on `tr/td/th` only (NOT on `table {}`)

### Three User Roles
1. **Volunteer** — logs outcomes, applies to opportunities, tracks assignments
2. **Organization (NGO)** — verifies volunteer outcomes, manages projects and tasks, generates impact PDFs
3. **Corporate Partner (CSR)** — accesses verified ESG data, generates compliance reports, manages employee volunteers

### Technical Stack
- **Frontend**: React 18, TypeScript, Vite, Wouter, TanStack Query v5, Tailwind CSS, Recharts, Chart.js, React Hook Form, date-fns, DOMPurify, shadcn/ui
- **Backend**: Node.js, TypeScript, Express.js, WebSockets
- **Database**: Drizzle ORM with Replit-managed PostgreSQL (Helium). DATABASE_URL is platform-managed — do NOT set it as a manual secret; doing so overrides the platform value and was the root cause of the 2026-05-03 "data loss" incident (data was never lost — manual secret was pointing at empty Neon projects)
- **Auth**: Firebase Auth (Google OAuth + email/password)
- **PWA**: Web app manifest, service worker (network-first caching), IndexedDB for offline activity logging

### Key Technical Implementations
- **AI Matching Algorithm**: 4-factor weighted scoring — Skills 35%, Trust 30%, Availability 25%, Mission 10%; engagement boost + SDG primary priority multiplier
- **Multi-tenant security**: Data scoping enforced per organization/user
- **Verification audit trail**: `verification_audit_log` table — every approve/reject records IP, user agent, evidence snapshot (CSRD compliance)
- **Single-tap NGO verification**: Time-limited tokens (`verification_tokens` table) — one-click verify/reject via email link, no login required
- **Immutable audit trail**: All verification actions are append-only
- **Performance**: O(1) lookup maps replace O(n) array scans in dashboard aggregation
- **Account deletion**: Full cascade across all related tables
- **Email**: Mock SMTP transporter (configurable for SendGrid, Mailgun, nodemailer); weekly digest scheduler (disabled in dev)
- **Error tracking**: Sentry integration via `server/services/error-tracking.ts` — disabled when `SENTRY_DSN` is not set

### Plan Feature Gating (`shared/plan-features.ts`)
Single source of truth for subscription tier features. Five tiers:

| Feature | Free | Pilot ($5K/90d) | Starter ($8K/yr) | Growth ($22K/yr) | Enterprise ($38K/yr) |
|---|---|---|---|---|---|
| maxNgoPartners | 1 | 5 | 10 | ∞ | ∞ |
| maxAdminSeats | 1 | 1 | 3 | 10 | ∞ |
| esgReportExport | ✗ | ✓ | ✓ | ✓ | ✓ |
| csvExport | ✗ | ✗ | ✓ | ✓ | ✓ |
| apiAccess | ✗ | ✗ | ✗ | ✓ | ✓ |
| whiteLabelReports | ✗ | ✗ | ✗ | ✓ | ✓ |
| advancedAnalytics | ✗ | ✗ | ✗ | ✓ | ✓ |
| customBranding | ✗ | ✗ | ✓ | ✓ | ✓ |
| csrdModule | ✗ | ✗ | ✗ | ✓ | ✓ |
| ssoAccess | ✗ | ✗ | ✗ | ✗ | ✓ |
| dedicatedCsm | ✗ | ✗ | ✗ | ✗ | ✓ |
| slaGuarantee | ✗ | ✗ | ✗ | ✗ | ✓ |
| multiRegion | ✗ | ✗ | ✗ | ✗ | ✓ |

`usePlanFeatures()` hook reads current user's plan via `GET /api/csr/partners` (returns the authenticated user's single partner object including `subscriptionTier`). Falls back to "free" if unavailable.

`<PlanGate feature="..." hasAccess={...}>` wraps features with a blur overlay + lock icon + "Upgrade →" link when access is denied.

**Currently gated in UI:**
- `esgReportExport`: checked inside `generateReport()` in `csr-reports-exports.tsx` (blocks PDF print for Free tier)
- `csvExport`: `<PlanGate>` wraps all Quick Data Export sections (org PWA, CSR mobile, CSR desktop)

### Report System

#### Verified Evidence Summary (VES) — Primary Report
- **Builder**: `server/domains/reporting/verified-evidence-summary-report.ts` — `buildVerifiedEvidenceSummaryReport()`
- **Route (org)**: `GET /api/reports/verified-evidence-summary` (auth required, org context) in `logs.router.ts`
- **Route (CSR)**: `GET /api/reports/verified-evidence-summary` with corporate context also handled in `logs.router.ts`
- **Format**: server-rendered HTML, `Content-Disposition: inline`, opened in new browser tab
- **Page structure**: Dynamic — cover + exec snapshot + quality scorecard + N evidence pages (15 rows/page) + partner reach + SDG contributions + methodology + assessment boundary. Minimum ~8 pages, expands automatically with data volume.
- **KPI computation**: `server/domains/reporting/report-metrics.service.ts` — `computeReportMetrics()` — single source of truth. Canonical rule: `verificationStatus === 'approved'` = Verified (matches dashboard counts). `isFullyVerified()` applies only to strict evidence chain checks for the quality scorecard.
- **Metrics exposed**: Verified Evidence Records, Verified Hours, Verification Rate, Average Verification Time, Incomplete Records, Rejected Records, Partner-Reported Reach, Projects/Programs Included, Record Verification Status (pipeline health bar: verified/pending/incomplete/rejected), Evidence Quality Scorecard, SDG Contribution Examples (top 3 SDGs with mini evidence tables)

#### Other Report Generators
1. **Corporate ESG Summary** (client-side) — `generatePDFContent()` in `csr-reports-exports.tsx`
2. **Organization Impact Report** (client-side) — `generateOrgPDFContent()` in `csr-reports-exports.tsx`
3. **NGO Impact Summary** (server-side) — `GET /api/reports/ngo-impact-summary` in `logs.router.ts`
4. **Corporate ESG Summary** (server-side) — `GET /api/reports/corporate-esg-summary` in `logs.router.ts`

All client-side generators use: navy `#0A2463` "SYNER" + gold `#D4980C` "XUS" footer branding, `@page { margin: 15mm 15mm 12mm }`, row-level table break rules only.

### CSV Exports (Quick Data Export section)
All four buttons generate actual `.csv` files from live `reportData`:
- **Employee/Volunteer Hours**: uses `generateCSVContent()` (engagement + impact + financial metrics)
- **SDG Metrics**: from `reportData.sdgMetrics` — columns: SDG Goal, SDG Name, Hours, Percentage
- **Project Data**: from `reportData.projectMetrics` — columns: Project Name, Hours, Employees, Status
- **Financial Data**: from `reportData.financialMetrics` — columns: Metric, Value (hour value, ROI, cost/beneficiary, program cost)
- **Impact Data** (org PWA only): from `reportData.impactMetrics` — direct/indirect beneficiaries, lives touched, impact/hour

Server-side CSV endpoint: `GET /api/csr/impact-reporting/export/csv` (enforces `requirePlanFeature("csvExport")`)

### Key API Routes
- `GET /api/csr/partners` — returns current user's single CSR partner object (used by `usePlanFeatures`)
- `GET /api/csr/partners/list` — returns all partners (used by volunteers for employer selection)
- `GET /api/csr/impact-reporting` — full reporting data (engagementMetrics, impactMetrics, financialMetrics, sdgMetrics, projectMetrics)
- `GET /api/csr/impact-reporting/export/csv` — server-side CSV export (plan-gated)
- `GET /api/reports/verified-evidence-summary` — Verified Evidence Summary HTML report (logs.router.ts)
- `GET /api/reports/ngo-impact-summary` — NGO branded PDF report (logs.router.ts)
- `GET /api/reports/corporate-esg-summary` — Corporate ESG HTML report (logs.router.ts)
- `POST /api/users/firebase-sync` — syncs Firebase user to Postgres on login
- `GET /api/users/me` — authenticated current user
- `GET /api/public-stats` — must be registered BEFORE `app.use(router)` mounts in routes.ts

### Router Registration Order (Critical)
In `server/routes.ts`: `app.get("/api/public-stats", ...)` MUST be registered before all `app.use(router)` mounts, otherwise it is shadowed by catch-all routers.

### Feature Specifications
- **Landing page**: Interactive SDG wheel, pricing cards (Pilot/Starter/Growth/Enterprise), "Volunteer Spotlight", FAQ (6 shown by default, `showAllFaq` state at ~line 1582), `PricingContactModal` opens on plan CTA click
- **Unified Dashboard**: Role-aware; shows Volunteer, Organization, or Corporate view
- **My Work page**: Consolidates Applications, Assignments, and Tasks
- **Notifications**: Real-time via WebSocket + polling
- **Calendar**: Event management with project/task linking
- **Impact Visualization**: SDG breakdown charts, geographic heatmap, verification density strip
- **AI Insights Modal**: Organization-level AI-generated program insights
- **Volunteer Performance Modal**: Per-volunteer metrics for org admins
- **Onboarding Guide**: Step-by-step flow for new users by role
- **Offline Mode**: IndexedDB + service worker; activity log syncs on reconnect

### Test Accounts
- **Al Honorat** (volunteer): `alhonorat@gmail.com`, Firebase userId=55
- **Green Future Alliance** (NGO org): `contact@gfa.org`, Firebase userId=54, orgId=11
- **Build Smart** (corporate): `csr@buildsmart.com`, CSR partner ID=4

### Test Data Scripts
- **Seed**: `ALLOW_TEST_SEED=true npx tsx scripts/seed-gfa-buildsmart-test-data.ts`
  - Creates 30 test volunteers, 180 activities (135 approved / 22 pending / 14 incomplete / 9 rejected)
  - Batch marker: `volunteer_activities.device_id = 'gfa-buildsmart-jan-may-2026-test-seed'`
  - GFA org ID = 11, BuildSmart CSR partner ID = 4, GFA verifier user ID = 52
  - Projects: Solar Installation (21), Hackathon (22), Clean Wells (23)
- **Cleanup**: `ALLOW_TEST_SEED=true npx tsx scripts/cleanup-gfa-buildsmart-test-data.ts`
  - Removes all records by batch marker and email pattern `%+gfa-test@buildsmart.example`

## File Map (Key Files)
| File | Purpose |
|---|---|
| `client/src/pages/landing.tsx` | Public landing page, pricing section, FAQ |
| `client/src/pages/csr-reports-exports.tsx` | Client-side report generators + CSV export UI |
| `client/src/pages/unified-dashboard.tsx` | Role-based dashboard entry point |
| `client/src/components/plan-gate.tsx` | `<PlanGate>` upgrade overlay component |
| `client/src/hooks/use-plan-features.ts` | `usePlanFeatures()` hook — reads subscription tier |
| `shared/plan-features.ts` | Tier definitions + `getPlanFeatures()` |
| `shared/schema.ts` | Drizzle schema — all tables and insert types |
| `shared/constants.ts` | Evidence status values, confidence tiers, report section labels |
| `shared/validation/index.ts` | `isFullyVerified()` — strict evidence chain check |
| `server/routes/csr.router.ts` | All `/api/csr/*` endpoints |
| `server/routes/logs.router.ts` | Activity logs, verification flows, all report routes |
| `server/routes.ts` | Central router mount — public-stats route order matters |
| `server/domains/reporting/verified-evidence-summary-report.ts` | VES report HTML builder (`buildVerifiedEvidenceSummaryReport`) |
| `server/domains/reporting/report-metrics.service.ts` | `computeReportMetrics()` — canonical KPI computation |
| `scripts/seed-gfa-buildsmart-test-data.ts` | Seeds GFA+BuildSmart test volunteers and activities |
| `scripts/cleanup-gfa-buildsmart-test-data.ts` | Removes all seeded test data by batch marker |
| `client/index.html` | PWA meta tags, manifest link |

## External Dependencies
- **Auth**: Firebase Auth, Firebase Firestore, Firebase Storage
- **Database**: Neon (serverless PostgreSQL), Drizzle ORM, Drizzle Kit
- **UI**: Radix UI, shadcn/ui, Recharts, Chart.js, Tailwind CSS, lucide-react
- **Build**: TypeScript, Vite, ESBuild
- **Email**: Mock SMTP (configurable: SendGrid, Mailgun, nodemailer)
- **Error tracking**: Sentry (`@sentry/node`) — requires `SENTRY_DSN` env var to activate
