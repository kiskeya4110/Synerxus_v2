# Public Page Performance Budget

This budget applies to Synerxus public marketing pages: landing, platform, use cases, evidence ladder, resources, request assessment, and redirected public pages.

## Image Rules

- Hero images should generally stay under 250 KB for desktop variants and under 100 KB for mobile variants.
- Prefer WebP for photographic or generated hero imagery.
- Use PNG only when transparency or crisp UI mockup detail is required.
- New public images must be stored under `client/public/optimized/` unless they are explicitly framework logo assets with documented permission.
- Framework logos, if ever approved, belong under `client/public/framework-logos/` and must be documented in `docs/logo-permissions.md`.

## Loading Rules

- First-viewport hero imagery may load eagerly.
- Images below the first viewport should use lazy loading.
- Keep meaningful `alt` text for content images. Use empty alt text only for decorative images.
- Avoid embedding large image sheets when individual responsive images are sufficient.

## Page Rules

- Public marketing pages should render without authenticated API calls.
- Primary content must be visible without waiting for client-side data.
- Avoid adding animation that changes layout dimensions or causes text overlap on mobile.
- Run `npm run check`, the public marketing smoke test, and `npm run build` after UI changes.

## Current Smoke Coverage

`client/src/__tests__/public-marketing-pages.test.tsx` server-renders key public pages to catch broken imports, missing exported components, and major markup regressions. Full browser screenshot tests should be added if Playwright becomes a direct project dependency.
