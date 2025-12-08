# Synerxus Platform - Codebase Analysis & Architecture Documentation

## Overview

Synerxus is a comprehensive volunteer management and CSR (Corporate Social Responsibility) platform built with a modern React/Node.js stack. This document provides a complete analysis of the codebase structure, component architecture, and optimization recommendations.

---

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** + shadcn/ui components
- **TanStack Query** (React Query) for data fetching
- **Recharts** for data visualization
- **Wouter** for routing

### Backend
- **Node.js** with Express
- **Drizzle ORM** with PostgreSQL
- **Multer** for file uploads
- **JWT-based authentication**

---

## Project Structure

```
/home/runner/workspace/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components (109 files)
│   │   ├── pages/          # Page components (63 files)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and helpers
│   │   └── types/          # TypeScript type definitions
│   └── index.html
├── server/                 # Backend Express application
│   ├── routes/             # API route handlers (20 files)
│   ├── services/           # Business logic services
│   └── index.ts            # Server entry point
├── shared/                 # Shared types and constants
│   ├── schema.ts           # Drizzle ORM schema
│   └── constants.ts        # Configuration constants
└── db/                     # Database migrations
```

---

## Component Architecture

### Core Layout Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Header` | `components/layout/header.tsx` | Main navigation header |
| `Footer` | `components/layout/footer.tsx` | Site footer |
| `Sidebar` | `components/layout/sidebar.tsx` | Dashboard sidebar navigation |
| `MobileBottomNav` | `components/layout/mobile-bottom-nav.tsx` | Mobile navigation bar |
| `CSRMobileNav` | `components/layout/csr-mobile-nav.tsx` | CSR dashboard mobile navigation |
| `VolunteerPWANav` | `components/layout/volunteer-pwa-nav.tsx` | Volunteer PWA navigation |

### Page Components by User Type

#### Volunteer Pages
- `volunteer-dashboard.tsx` - Main volunteer dashboard
- `volunteer-profile-settings.tsx` - Profile management
- `discover-opportunities.tsx` - Browse volunteer opportunities
- `my-applications.tsx` - Track applications
- `my-work.tsx` - Active projects and tasks

#### Organization Pages
- `organization-dashboard.tsx` - Organization management dashboard
- `organization-profile-settings.tsx` - Organization profile
- `project-management.tsx` - Create and manage projects
- `sdg-mapping.tsx` - SDG alignment tools
- `impact-report-generator.tsx` - Generate impact reports

#### Corporate Partner (CSR) Pages
- `csr-dashboard.tsx` - CSR metrics and analytics
- `csr-dashboard-pwa.tsx` - PWA-optimized CSR view
- `csr-impact-reporting.tsx` - Compliance reporting
- `csr-reports-exports.tsx` - Export reports
- `corporate-partner-profile-settings.tsx` - Partner profile

### UI Component Library (shadcn/ui)

Located in `client/src/components/ui/`:
- Button, Input, Select, Textarea
- Card, Dialog, Sheet, Drawer
- Table, Tabs, Accordion
- Badge, Avatar, Tooltip
- Calendar, Date Picker
- Chart components (via Recharts)

---

## Database Schema (44 Tables)

### Core Tables
```
users                    - User accounts and authentication
volunteers              - Volunteer profiles
matchable_organizations - Organization profiles
projects                - Volunteer projects
tasks                   - Project tasks
```

### Matching & Applications
```
applications            - Volunteer applications
project_assignments     - Volunteer-project assignments
opportunity_views       - Analytics for opportunity engagement
```

### Impact & Metrics
```
impact_logs             - Impact tracking
sdg_mapping             - UN SDG alignments
volunteer_hours         - Hours logged
```

### Corporate Partnership
```
corporate_partners      - Corporate partner accounts
employee_profiles       - Corporate employee volunteers
csr_metrics             - CSR performance data
```

### Gamification
```
badges                  - Achievement badges
user_badges             - User badge assignments
streaks                 - Volunteer activity streaks
leaderboard_cache       - Cached leaderboard data
```

---

## Image Management System

### Architecture

```
Client (ProfilePictureUpload)
    ↓
ImageCropper (crop/rotate/zoom)
    ↓
uploadProfilePhoto() → /api/upload
    ↓
Server (storage.router.ts)
    ↓
validateImage() → processImage()
    ↓
Local Storage (/uploads/)
```

### Configuration (shared/constants.ts)

```typescript
IMAGE_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024,  // 5MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  DIMENSIONS: {
    AVATAR: { WIDTH: 256, HEIGHT: 256 },
    LOGO: { WIDTH: 512, HEIGHT: 512 },
    COVER: { WIDTH: 1200, HEIGHT: 630 }
  }
}
```

### Key Files
- `client/src/components/profile-picture-upload.tsx` - Upload component
- `client/src/components/ui/image-cropper.tsx` - Image cropping modal
- `client/src/lib/upload.ts` - Upload utilities
- `server/services/image-service.ts` - Server-side processing
- `server/routes/storage.router.ts` - Upload/serve endpoints

---

## API Routes Structure

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/google` - Google OAuth

### Users
- `GET /api/users/me` - Current user profile
- `PATCH /api/users/:id` - Update user
- `GET /api/users/:id/stats` - User statistics

### Organizations
- `GET /api/matchable-organizations` - List organizations
- `POST /api/matchable-organizations` - Create organization
- `PATCH /api/matchable-organizations/:id` - Update organization

### Projects & Tasks
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id/tasks` - Project tasks
- `POST /api/tasks` - Create task

### Dashboard & Analytics
- `GET /api/dashboard/summary` - Dashboard metrics
- `GET /api/dashboard/csr` - CSR dashboard data
- `GET /api/dashboard/sdg-metrics` - SDG performance data

### Storage
- `POST /api/upload` - Upload file
- `DELETE /api/upload` - Delete file
- `GET /api/storage/:path` - Retrieve file

---

## Refactoring Summary

### Code Quality Improvements Made

1. **Empty Catch Handlers Fixed** (8 instances)
   - `organization-profile-settings.tsx` (2 instances)
   - `volunteer-profile-settings.tsx` (5 instances)
   - `csr-dashboard-pwa.tsx` (1 instance)

   Changed from:
   ```typescript
   .catch(() => {})
   ```
   To:
   ```typescript
   .catch((err) => {
     if (process.env.NODE_ENV === 'development') console.warn('...', err);
   })
   ```

2. **TypeScript Errors Fixed** (12 errors)
   - Added 'aiu' to modal type unions in `organization-dashboard.tsx`
   - Fixed MetricCard value type to accept `string | number`
   - Replaced deprecated `livesTouched` prop with `aiuEarned`
   - Removed dead code (`updateLivesTouched` function)

3. **Consistent Naming**
   - Updated all `MobileMetricsGrid` usages to use `aiuEarned` instead of `livesTouched`

---

## PWA Mobile Navigation Architecture

### CSR Dashboard Pages Navigation
All CSR pages share consistent mobile navigation via `CSRMobileNav`:

```typescript
// Navigation items
const navItems = [
  { id: 'overview', path: '/csr-dashboard' },
  { id: 'employees', path: '/csr-dashboard?tab=employees' },
  { id: 'sdgs', path: '/csr-dashboard?tab=sdgs' },
  { id: 'reports', path: '/csr-reports-exports' },
  { id: 'settings', path: '/corporate-partner-profile-settings' },
];
```

### Mobile Detection Pattern
```typescript
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const checkMobile = () => setIsMobile(window.innerWidth < 768);
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);
```

---

## Performance Recommendations

### Build Optimization
The build output shows large chunks that could benefit from code splitting:

1. **Main bundle**: 3.2MB (806KB gzipped)
   - Recommend splitting by route
   - Lazy load dashboard components

2. **Large images**: 6-8MB PNGs
   - Convert to WebP format
   - Implement responsive images with srcset
   - Consider CDN hosting

### Code Splitting Example
```typescript
// Before
import CSRDashboard from './pages/csr-dashboard';

// After
const CSRDashboard = lazy(() => import('./pages/csr-dashboard'));
```

### Query Optimization
- Implement query deduplication
- Add proper staleTime to reduce refetches
- Use placeholder data for instant loading

---

## Logging Infrastructure

### Client-side Logger (`lib/logger.ts`)
```typescript
// Development-only logging
const config = {
  enabled: import.meta.env.DEV,
  minLevel: 'debug',
  prefix: '[Synerxus]',
};

// Usage
import { debug, info, warn, error } from '@/lib/logger';
debug('Component mounted');
error('API call failed', err);
```

### Server-side Logger (`server/logger.ts`)
- Winston-based logging
- File and console transports
- Request logging middleware

---

## Security Considerations

### Implemented
- Path traversal protection in storage routes
- File type validation
- File size limits
- CORS configuration
- JWT authentication

### Recommendations
- Add rate limiting
- Implement CSRF protection
- Add input sanitization
- Enable Content Security Policy

---

## File Counts Summary

| Category | Count |
|----------|-------|
| React Components | 109 |
| Page Components | 63 |
| API Route Files | 20 |
| Database Tables | 44 |
| Custom Hooks | 8 |
| Utility Files | 15 |

---

*Generated: December 2024*
*Platform: Synerxus Volunteer Management System*
