# Threat Model

## Project Overview

Synerxus is a multi-tenant impact reporting platform for volunteers, NGOs, and corporate partners. The production app is a React frontend backed by a Node/Express TypeScript API with a PostgreSQL database via Drizzle, Firebase authentication, WebSockets, file uploads, report generation, and NGO verification workflows.

Production scope for this scan is the Node/Express application under `server/`, the client under `client/`, and shared code under `shared/`. The separate `python_backend/` directory is treated as dev-only unless a production entry point or route is shown to call into it. Per platform assumptions, deployed traffic is TLS-protected and `NODE_ENV` is `production`.

## Assets

- **User accounts and sessions** — Firebase identities, bearer tokens, auth cookies, and linked Synerxus user records. If these are misused, attackers can impersonate volunteers, NGO staff, or corporate users.
- **Impact and verification data** — volunteer logs, outcome text, evidence URLs, verification status, audit trail records, report exports, and related ESG metrics. This is the core business data and includes sensitive operational details.
- **Personal data** — names, email addresses, organization membership, location data, volunteer profiles, external volunteer records, and invitation data. Exposure can harm users and partner organizations.
- **Organization and corporate tenant data** — projects, assignments, reports, team membership, CSR partner links, and invitations. Cross-tenant access is a major risk because different organizations should not see or change one another’s data.
- **Application secrets and service credentials** — database connection details, Firebase credentials, email/SMS provider credentials, and any AI/provider API keys.
- **Uploaded files** — evidence and profile images stored through the storage routes. These can expose private data if access control or path handling fails.

## Trust Boundaries

- **Browser/mobile client to API** — all request parameters, bodies, headers, and query strings are untrusted. The API must enforce authentication, authorization, and input validation server-side.
- **Authenticated user to tenant boundary** — volunteers, NGO staff, corporate partners, and admins have different permissions. Tenant separation must be enforced on every read and write.
- **API to database** — the API has broad access to application data. Injection or missing row-level scoping in handlers can expose or alter other tenants’ records.
- **API to external services** — Firebase, email, SMS, AI, and WebSocket token verification all cross service boundaries and must validate identities and inputs carefully.
- **Public to protected routes** — some routes are intentionally public, but impact logs, team management, reports, and tenant data are not. This boundary is central to the application’s security.
- **File upload and retrieval boundary** — user-controlled file names, paths, and stored evidence cross into server-side filesystem operations.

## Scan Anchors

- **Production entry points:** `server/index.ts`, `server/routes.ts`, modular routers in `server/routes/*.ts`, auth middleware in `server/middleware/auth.ts`.
- **Highest-risk areas:** multi-tenant route handlers, organization/team management, impact log/reporting routes, invitation and recruitment flows in `server/routes/misc.router.ts`, SMS webhook handling in `server/routes/sms.router.ts`, file upload/storage routes, and legacy handlers inside `server/routes.ts`.
- **Public surfaces:** landing/public stats, some gamification endpoints, storage fetch routes, recommendation and invitation-listing endpoints in `server/routes/misc.router.ts`, invitation-token flows, SMS webhooks, and any route mounted without `authMiddleware`.
- **Authenticated/admin surfaces:** most `/api/*` business routes; admin-only checks are implemented in code, not by mount path alone.
- **Usually dev-only unless proven otherwise:** `python_backend/`, mock/demo artifacts, generated docs, local scripts, and experimental files outside the Express app.

## Threat Categories

### Spoofing

The application relies on Firebase-verified identities and server-populated `req.user`. Protected routes must only trust identity data set by auth middleware, never `userId` values from query parameters, request bodies, or custom headers. WebSocket and token-based flows must validate tokens before granting access.

### Tampering

Users can create and modify logs, projects, assignments, invitations, reports, and profile data. The server must ignore client-controlled ownership fields unless it independently verifies the caller can act on that resource. Business actions such as verifying logs, assigning volunteers, inviting team members, or editing tenant settings must be enforced server-side.

### Information Disclosure

The system stores sensitive impact records, emails, membership details, invitation data, evidence URLs, and geolocation. Responses must be scoped to the authenticated tenant and role, and public endpoints must never expose internal records, invitation tokens, private reports, or cross-tenant analytics. Error responses and logs must not reveal secrets or excessive internals.

### Denial of Service

The API exposes report generation, AI-backed content generation, exports, uploads, and broad list endpoints. Expensive routes must remain authenticated, rate-limited, and bounded so attackers cannot burn provider quota or force large unscoped database reads. Upload size and request timeouts must stay enforced.

### Elevation of Privilege

This project’s main security risk is broken access control in a multi-tenant app. Authenticated users must not be able to read or modify another organization’s members, assignments, invitations, reports, logs, or corporate data. Admin capabilities must always require explicit admin checks, and file/report/token flows must not provide indirect privilege escalation paths.