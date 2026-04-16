# Synerxus Architecture Guide

## Overview

Synerxus is a CSR (Corporate Social Responsibility) impact-data platform connecting corporate volunteers, NGO organizations, and CSR program managers. It tracks, verifies, and reports on volunteer hours, SDG alignment, and employee engagement outcomes.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + TypeScript | Component-based UI, strong typing |
| Routing | Wouter | Lightweight (~2KB vs React Router's ~50KB), sufficient for SPA navigation |
| Server State | TanStack React Query | Automatic caching, background refetch, deduplication — eliminates manual loading state management |
| Client State | React Context (AuthProvider) | Auth/session is app-wide, shared via context; no need for Redux overhead |
| Backend | Express.js + TypeScript | Familiar REST API, easy middleware composition |
| ORM | Drizzle ORM | Type-safe SQL queries, migrations, no runtime overhead of Prisma |
| Database | PostgreSQL (Neon) | Relational data with JSON columns for flexible SDG/impact metadata |
| Auth | Firebase Auth + JWT | Firebase handles OAuth/email auth; JWT middleware secures all API routes |
| File Storage | Multer + Sharp | Image upload with client-side optimization before storage |
| Real-time | WebSocket (ws) | Live dashboard updates in production; Vite HMR in dev |

---

## Directory Structure

```
/
├── client/                     # React frontend
│   └── src/
│       ├── pages/              # Route-level page components (one per URL)
│       ├── components/
│       │   ├── ui/             # Reusable primitives (Button, Card, Logo, etc.)
│       │   ├── layout/         # Page shells (CSRLayout, VolunteerNav, Footer)
│       │   ├── dashboard/      # Dashboard-specific view components
│       │   └── sdg/            # SDG-specific UI components
│       ├── hooks/              # Custom React hooks (data fetching, auth, utilities)
│       ├── lib/                # Pure utilities (queryClient, format-utils, sdg-utils)
│       ├── types/              # Shared TypeScript interfaces/types
│       └── contexts/           # React context providers
│
├── server/                     # Express backend
│   ├── routes.ts               # Main entry: WebSocket setup + router mounts
│   ├── routes/                 # Feature-specific Express routers
│   │   ├── utils.ts            # Shared helpers (auth, validation, error handling)
│   │   ├── csr.router.ts       # CSR partner + employee engagement routes
│   │   ├── admin.router.ts     # Admin management routes
│   │   ├── logs.router.ts      # Unified impact log API
│   │   ├── activities.router.ts# Volunteer activities + project impacts
│   │   ├── gamification.router.ts # Leaderboard, badges, spotlight, banner stats
│   │   └── ...                 # Other feature routers
│   ├── services/               # Business logic layer (email, image, dashboard)
│   ├── storage.ts              # Data access layer (abstracts DB queries)
│   ├── db.ts                   # Drizzle DB connection
│   └── auth.ts                 # JWT verification middleware
│
├── shared/                     # Shared between client and server
│   └── schema.ts               # Drizzle table schemas + Zod validation types
│
└── ARCHITECTURE.md             # This file
```

---

## Module Boundaries (Feature Domains)

The app has 4 primary feature domains. Each has its own routers, pages, and components:

| Domain | Pages | Router(s) | Who uses it |
|--------|-------|-----------|-------------|
| **Volunteer** | `volunteer-dashboard-new`, `log-activity`, `discover-opportunities` | `volunteers`, `logs`, `activities`, `gamification` | Individual volunteers |
| **Organization (NGO)** | `organization-dashboard-*`, `organization-profile` | `organizations`, `projects`, `applications` | NGO staff |
| **CSR Corporate** | `csr-dashboard-pwa`, `csr-reports-exports` | `csr`, `employee-engagement` | Corporate HR/CSR managers |
| **Admin** | `admin-*` | `admin`, `users` | Platform administrators |

**Rule:** Features within one domain should not import directly from another domain's components. Shared UI goes in `components/ui/`, shared data types go in `shared/schema.ts`.

---

## Core Data Flows

### Flow 1: Volunteer Submits an Activity Log

```
1. UI: volunteer-dashboard-new.tsx
   └─ ImpactLogForm component
      └─ useMutation → POST /api/logs

2. Server: server/routes/logs.router.ts
   └─ POST /api/logs handler
      ├─ detectDuplicateImpact() check (routes.ts helper)
      ├─ storage.createVolunteerActivity() → PostgreSQL
      ├─ updateAIUAfterActivityLog() → project impact metrics
      └─ broadcastUpdate("activity:new", data) → WebSocket

3. Client cache invalidation:
   └─ onSuccess: queryClient.invalidateQueries(["/api/logs", userId])
      └─ useQuery refetches → dashboard updates automatically

Files touched: volunteer-dashboard-new.tsx → queryClient.ts → logs.router.ts → storage.ts → db.ts
```

### Flow 2: CSR Partner Generates an ESG Report (PDF)

```
1. UI: csr-reports-exports.tsx
   └─ User clicks "Generate PDF"
      └─ generateReport(template, "PDF")
         ├─ reads: reportData (from useQuery /api/csr/impact-reporting)
         ├─ calls: generatePDFContent() or generateOrgPDFContent()
         │         (lib/csr-report-generators.ts)
         └─ opens: window.open() → printWindow.print()

2. Data source: server/routes/csr.router.ts
   └─ GET /api/csr/impact-reporting
      ├─ Aggregates: volunteer hours, SDG metrics, employee participation
      └─ Returns: structured JSON for PDF template

Files touched: csr-reports-exports.tsx → lib/csr-report-generators.ts → window.print()
Note: PDF generation is entirely client-side (HTML → browser print dialog)
```

---

## State Management Strategy

Three tiers of state, each handled differently:

```
┌─────────────────────────────────────────────────────┐
│  SERVER STATE (React Query)                         │
│  - Fetched from API, cached, auto-refreshed         │
│  - Examples: user data, projects, logs, CSR reports │
│  - Never duplicated in useState or Context          │
│  - Access via: useQuery / useMutation               │
├─────────────────────────────────────────────────────┤
│  AUTH STATE (AuthContext / use-auth.tsx)            │
│  - Firebase user, dbUser, userType, loading state   │
│  - Shared app-wide via React Context                │
│  - Access via: const { user, dbUser } = useAuth()   │
├─────────────────────────────────────────────────────┤
│  UI STATE (local useState)                          │
│  - Modal open/close, active tab, filter panel open  │
│  - Stays local to the component that owns it        │
│  - Never lifted unless 2+ siblings need it          │
└─────────────────────────────────────────────────────┘
```

---

## API Layer Pattern

**Rule:** All API calls go through `client/src/lib/queryClient.ts`. Never use raw `fetch()` directly in components.

```typescript
// ✅ Correct — uses authenticatedFetch with auth headers
const { data } = useQuery({
  queryKey: ["/api/users/me"],
  queryFn: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/users/me", { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
});

// ❌ Wrong — raw fetch, no auth headers, no error surfacing
const data = await fetch("/api/users/me").then(r => r.json());
```

For complex data fetching shared across multiple components, use a custom hook in `client/src/hooks/`:
- `use-auth.tsx` — authentication state
- `use-dashboard-data.ts` — volunteer dashboard queries (batched + cached)
- `use-volunteer-dashboard.ts` — volunteer page data + error handling
- `use-plan-features.ts` — feature gate checking

---

## Error Handling Contract

**Server (Express routes):**
- Always log with context: `console.error("[RouterName] description:", err)`
- Always return an HTTP status: `res.status(4xx/5xx).json({ message: "..." })`
- Never swallow errors silently or return demo data as a real response

**Client (React components):**
- Always destructure `isError` from `useQuery` / `useMutation`
- Surface errors to users via `toast({ title: "...", variant: "destructive" })`
- Never use `catch(e) { return null }` or `catch(e) { return [] }` — this hides bugs
- Pattern:
  ```typescript
  const { data, isError } = useQuery({ ... }); // throw in queryFn, don't catch
  useEffect(() => {
    if (isError) toast({ title: "Failed to load data", variant: "destructive" });
  }, [isError]);
  ```

---

## Key Architecture Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Routing | Wouter | 2KB bundle, adequate SPA routing without React Router complexity |
| Server state | React Query | Built-in cache, background refetch, dedup — removes 80% of manual loading state code |
| Global state | Context only | No Redux/Zustand — auth + toast are the only truly global state; React Query handles the rest |
| ORM | Drizzle | Type-safe SQL with zero runtime overhead; Prisma was too heavy for the current scale |
| PDF generation | Client-side HTML print | No server PDF library needed; browser print dialog handles formatting |
| Auth strategy | Firebase + JWT | Firebase handles social OAuth + email flows; JWT middleware secures API routes consistently |
| Modular routing | Feature routers in `/routes/` | Each domain owns its routes; `routes.ts` is only the mount point + WebSocket setup |
| Image optimization | Sharp on upload | Process images once on upload rather than on every request |
