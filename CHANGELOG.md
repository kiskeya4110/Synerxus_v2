# Changelog

## 2026-05-03 — Production Release (Refactor Passes 1–7 + Verification Audit)

### Published
- Live at https://synerxus.com (custom domain) and https://synerxus-esg.replit.app
- Health check `GET /api/health` returns 200; 24 routers registered; 212/212 tests passing; tsc clean

### Hotfix (post-deploy)
- **CORS**: `https://synerxus.com` and `https://www.synerxus.com` were being blocked by the production CORS whitelist (only the `.replit.app` origin was allowed). Updated shared `CORS_WHITELIST` to include all three origins. Requires republish to take effect in production.
- **Security**: Removed `.claude/settings.local.json` which contained leaked Neon DB credentials in committed bash history. Added `.claude/`, `.cursor/`, `.vscode/settings.json` to `.gitignore`. **Action required**: rotate the Neon DB password for the `neondb_owner` role.

### Refactor Passes 1–7
1. Tier separation in `server/routes/logs.router.ts` (Verified / Partner-Reported / Derived-Mapped) with explicit `Redaction Note`
2. Canonical strict-verification gate `isFullyVerified()` in `shared/validation/index.ts` (`verificationStatus==='approved'` AND `verifiedAt` AND `verifiedBy` AND `date`)
3. Centralized approved/prohibited claim copy in `shared/content/approved-claims.ts` and `shared/content/prohibited-claims.ts` with negation-aware scanning (`isNegatedContext`, 120-char window)
4. Multi-tenant authorization scoping per organization/user across all routers
5. HTML sink hardening — all `dangerouslySetInnerHTML` and print-window writes routed through DOMPurify
6. Modal accessibility — `aria-modal`, ESC-close, focus management
7. Test infrastructure — vitest config with `server/__tests__/**/*.test.ts` + `client/src/__tests__/**/*.test.tsx`; aliases `@`, `@shared`, `@server`

### Verification Audit
- Confirmed no prohibited claims in user-facing surfaces
- Confirmed no sensitive metadata leaks in non-admin client code
- Two known low-priority audit findings deferred (M-1 messaging-page placeholder copy; L-1 raw label strings should use `PRODUCT_LABELS` constants)

### Security Scan
- Dependency audit: 0 vulnerabilities (info/low/moderate/high/critical all 0)
- SAST: 21 HIGH findings — all in `.claude/settings.local.json` (now removed); remaining MEDIUM/LOW findings are not user-facing
- HoundDog (privacy/dataflow): no critical/high privacy violations
