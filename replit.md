# Synerxus - Connect. Manage. Impact Globally.

## Overview
Synerxus is an AI-powered platform designed to connect global volunteers with opportunities and empower organizations to track, measure, and visualize their impact. It links activities to humanitarian outcomes and Sustainable Development Goals (SDGs), providing data-driven insights for impact assessment, storytelling, and enhancing global collaboration. Its core purpose is "Intelligent connections for sustainable development worldwide," aiming to drive sustainable development through intelligent connections.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a mobile-optimized, role-based dashboard with UN SDG-themed color schemes, `shadcn/ui` components built on `Radix UI`, and a light theme with vibrant accents. It ensures consistent typography, an infinity loop logo, and interactive elements. Dashboards dynamically adjust for volunteer and organization views. Opportunity displays consistently use a 2-column layout for AI analysis and SDG alignment, with all section titles center-justified. A new dedicated organization dashboard uses a dark green theme for branding. Mobile PWA project and opportunity detail views (volprojpwa design) feature hero images, match score badges, two-column layouts with SDG circles and "Why this is a good match" sections, expected tasks, time commitment, and apply buttons with teal-to-blue gradient headers and emerald-to-blue action buttons.

### Technical Implementations
The frontend uses React 18, TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS, Chart.js, React Hook Form, and date-fns with PWA (Progressive Web App) support for mobile. The backend is Node.js with TypeScript, Express.js for REST APIs, WebSockets, and Drizzle ORM with Neon serverless PostgreSQL. The database schema includes AI tracking fields and skill proficiency. An AI matching algorithm uses weighted scoring for volunteer-opportunity and volunteer-organization matches based on Skills, Location, SDG, Interests, and Availability, with an engagement boost and SDG primary priority multiplier. Multi-tenant security enforces data scoping. Key features include email-based profile linking, a full messaging system with conversation threading, automatic project completion tracking, real-time volunteer list updates, a comprehensive notification system, an AI tips service, and personalized weekly email digests. A comprehensive user data validation system with audit logging ensures profile integrity.

### Feature Specifications
The platform includes a rebranded landing page with an interactive SDG wheel, a role-based dashboard with real-time KPIs and AI-matched opportunities, and a "Volunteer Insights" section. It supports mobile data collection with impact deduplication, a calendar, interactive impact visualization, AI-powered impact storytelling, and CRUD operations for various entities (Projects, Tasks, Volunteers, Organizations, Calendar, Opportunities, Applications). It supports dual user types with distinct flows, project-task hierarchy with AI-powered volunteer recommendations, comprehensive profile settings, multi-step intake forms, and assignment tracking. A unified "My Work" page consolidates Applications, Assignments, and Tasks. The system provides a live and interactive impact narrative on dashboards, comprehensive print CSS for generated reports, and enhanced PDF export functionality. An organization dashboard aggregates key metrics, SDG distribution, project locations, alerts, impact over time, and AI-generated insights. A "Volunteer Spotlight" feature showcases featured volunteers on the landing page. Mobile PWA detail pages for projects (`/projects/:id/pwa`) and opportunities (`/opportunities/:id/pwa`) provide optimized views with hero images, match score badges, two-column description layouts with SDG indicators, "Why this is a good match" sections, task counts, time commitments, locations, and CTA buttons.

### System Design Choices
Authentication is managed via Firebase Auth with Google OAuth. Client-server communication uses RESTful APIs, WebSockets, and React Query. Data processing involves client-side collection, Zod validation, Drizzle ORM for PostgreSQL, server-side aggregation, and client-side visualization. The frontend is deployed with Vite, the backend with Node.js and compiled TypeScript, and the production database uses Neon. PWA implementation includes a web app manifest, a service worker for offline support with network-first caching, and meta tags for iOS/Android mobile web app support, enabling installation on devices.

### Mobile PWA Dashboard (December 2025)
**Enhanced Volunteer Mobile Dashboard**: Complete redesign with dark theme matching the social platform aesthetic:
- **Real KPI Cards**: Total Hours Logged (blue), Projects Completed (green), Skills Applied (orange), Lives Impacted (pink) - all with real data from web view
- **Interactive Charts**: Impact Over Time (AreaChart with Recharts), SDG Distribution (PieChart)
- **SDG Contribution Cards**: Visual display of SDGs contributed with color-coded cards
- **Project Cards**: Status badges, completion progress bars, organization names, time commitment, all clickable to PWA detail view
- **Potential Tab** (formerly Unlock): AI-powered insights showing growth opportunities, recommended focus areas, and path to badges
- **Impacts Tab**: Global impact report with charts, SDG distribution, and full report navigation
- **Bottom Navigation**: Home, Projects, Potential, Impacts, Profile with active state indicators

### Bug Fixes & Protections (December 17, 2025)

**Comprehensive Port Conflict Prevention Framework**:
- **Created server/port-management.ts**: Multi-layered defense system against port 5000 crashes:
  - **Layer 1: Pre-startup Cleanup**:
    - Detects and removes stale lock files from dead processes
    - Uses `fuser -k` to clean up stale sockets after confirming process is dead
    - Handles malformed/corrupt lock files gracefully
    - NEVER kills running server instances - aborts if another instance is healthy
  - **Layer 2: Exclusive Lock Acquisition**:
    - Uses `O_CREAT | O_EXCL` flags for atomic, race-free lock creation
    - Only one process can acquire the lock at a time
    - Lock file: `/tmp/synerxus-server.lock` with PID:timestamp format
  - **Layer 3: Aggressive Retry Strategy**:
    - `bindPortWithRetry()`: 10 retry attempts with exponential backoff + jitter
    - Base delay: 500ms, grows exponentially up to 10-second cap
    - Random jitter (0-200ms) prevents thundering herd on restarts
  - **Layer 4: OS-Level Socket Options**:
    - `reusePort: true` and `reuseAddr: true` for faster port release
    - Prevents TIME_WAIT socket states from blocking port binding
  - **Layer 5: Comprehensive Graceful Shutdown**:
    - Handles SIGTERM, SIGINT, SIGHUP, uncaughtException, unhandledRejection
    - 15-second hard timeout prevents hung shutdowns
    - Automatic lock file cleanup on all exit paths
  - **Monitoring Functions**: `getServerState()` for health checks
  - **Result**: Zero port conflict crashes since implementation

- **server/index.ts Integration**:
  - `initializePortManagement(5000)` called at startup
  - Framework logs PID and lock acquisition for debugging
  - Clean separation of concerns with minimal integration code

**Duplicate Page Header in Volunteer Dashboard Fixed**:
- **client/src/pages/volunteer-dashboard.tsx**: Removed unconditional `<VolunteerNav />` from line 1158
  - VolunteerNav component has built-in mobile viewport detection (≤768px)
  - Rendering it unconditionally in standalone dashboard caused duplication on desktop
  - Now only mobile viewport shows navigation as intended

### Previous Bug Fixes (December 13, 2025)
**React Hooks Rule Violations Fixed**:
- **volunteer-nav.tsx**: Moved `useState(false)` hook to top of component (line 30) before early return statement on line 53-54. React requires all hooks to be called unconditionally in the same order on every render.
- **volunteer-intake.tsx**: Added fallback arrays for `form.watch("availability")` at lines 698 and 772 to handle undefined values during form initialization with `|| []` operator.

**JSX Syntax Error Fixed**:
- **organization-profile-settings.tsx**: Fixed unterminated JSX contents by correcting div closure structure (line 603) - was closing div outside fragment instead of inside.

### Performance Optimizations (December 2025)
**CSR Dashboard Optimization**: Implemented O(1) lookup maps to replace O(n) array.find() calls throughout data aggregation:
- **projectsMap** and **profilesMap**: Eliminated repeated project and profile lookups in SDG metrics and geographic map calculations
- **budgetsMap**: Replaced budget lookups for project status determination
- **activitiesByProject**: Pre-computed activity grouping by project to avoid repeated filtering
- **employeeDetailsBySDGAndUser** and **projectDetailsBySDGAndProject**: Replaced nested .find() calls with map-based lookups for employee and project detail tracking
- **Result**: Reduced algorithm complexity from O(n²) to O(n), eliminating cascading nested loops

**Geographic Impact Map Update**: Enhanced to display ALL employee volunteer project locations (not just sponsored projects), dynamically updated as new volunteer activities are logged, with smart status indicators (active/sponsored/completed).

## External Dependencies

-   **Authentication & User Management**: Firebase Auth, Firebase Firestore, Firebase Storage
-   **Database & Infrastructure**: Neon Database, Drizzle Kit
-   **UI & Visualization**: Radix UI, Chart.js, Tailwind CSS
-   **Development & Build Tools**: TypeScript, Vite, ESBuild
-   **Matching Algorithm**: Python and TypeScript implementation
-   **Email Service**: Mock transporter (configurable for SendGrid, Mailgun, nodemailer in production)
-   **Location Services**: Google Maps API (for geolocation-based opportunity matching)
-   **Integration Platforms**: Zapier (CRM connectors - Salesforce, HubSpot)
