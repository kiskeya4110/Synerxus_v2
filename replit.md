# Synerxus - Connect. Manage. Impact Globally.

## Overview
Synerxus is an AI-powered platform that connects global volunteers with opportunities and helps organizations track, measure, and visualize their impact. It links activities to humanitarian outcomes and Sustainable Development Goals (SDGs), providing data-driven insights for impact assessment, storytelling, and enhancing global collaboration. Its core purpose is "Intelligent connections for sustainable development worldwide."

## Recent Changes (December 1, 2025)
- **Combined Projects + My Work Navigation**: Consolidated "Projects" and "My Work" tabs into a single "Projects" tab in the organization navigation bar to free up space
  - Organization users now see: Dashboard, Projects, SDGs, Volunteers, Reports, +Create (6 tabs instead of 7)
  - The "Projects" tab (/my-work) now contains 3 sub-tabs: Projects, Tasks, Impact
  - Projects sub-tab shows project list with search, create project dialog, and expandable ProjectListCards
  - Page title changes to "Projects" for organization users, "My Work" for volunteers
  - Footer conditionally rendered only for organization users (volunteers get footer from Layout)
- **Complete Organization Dashboard Redesign**: Built a new dedicated organization dashboard with comprehensive features:
  - **API Endpoint**: New `/api/organization/dashboard` aggregates key metrics, SDG distribution, project locations, alerts, impact over time, and AI-generated insights with project and time period filtering
  - **Dark Green Theme**: Navigation ribbon uses #166534 (forest green) for organization branding
  - **Responsive Navigation**: Desktop tabs collapse into hamburger menu on mobile
  - **Key Metrics Cards**: Active Projects, Total Volunteer Hours, SDGs Addressed, Lives Touched
  - **SDG Impact Distribution**: Bar chart showing volunteer hours contribution by SDG
  - **Project Locations Map**: Interactive Leaflet map with project markers
  - **Alerts & Tasks Panel**: Shows overdue tasks and pending items requiring attention
  - **Impact Over Time**: Area chart tracking hours and people impacted over 12 months
  - **AI Insights Panel**: Auto-generated insights on engagement, task completion, and SDG focus
  - **Below-the-Fold Content**: Active projects list, quick actions, and primary SDG summary
  - **+Create Modal**: Quick access to create projects, opportunities, and tasks
  - **Full Filter Support**: Project and time period filters (7d, 30d, 90d, 1y, all time)
  - Complete data-testid coverage for e2e testing

## Recent Changes (November 27, 2025)
- **Optimized Matching Algorithm**: Upgraded the AI matching algorithm with refined weights and new features:
  - **New Weights**: Skills 35%, SDG 20%, Availability 20%, Interests 10% (re-enabled), Location 10%, Experience 5%
  - **SDG Primary Priority Boost**: 1.2x multiplier when volunteer's primary SDG matches opportunity
  - **4-Tier Availability Scoring**: ≤50% (perfect), 50-80% (great), 80-100% (fits), >100% (over-committed)
  - **Engagement Boost**: 0-10 bonus points for active, reliable volunteers:
    - Recent activity (0-5 pts): 7 days=5, 30 days=3, 90 days=1
    - Completion rate (0-3 pts): ≥80%=3, ≥50%=1
    - Profile completeness (0-2 pts): ≥90%=2, ≥70%=1
  - Python matchmaker synchronized with TypeScript weights
  - Formula: `FinalScore = min(BaseWeightedScore + EngagementBoost, 100)`

## Recent Changes (November 26, 2025)
- **User Data Validation System**: Implemented comprehensive data validation with audit logging for user profile integrity:
  - Added `userDataAuditLogs` table to track all user data changes (action, table, before/after data, discrepancies)
  - Created validation API endpoints with proper authorization (users can only access their own data):
    - `GET /api/user-validation/:userId` - Validate user data consistency and detect name mismatches
    - `POST /api/user-validation/:userId/sync-name` - Sync display name across all profiles
    - `GET /api/user-validation/:userId/audit-logs` - View user's data change history
    - `GET /api/user-validation/discrepancies/unresolved` - Get user's unresolved data issues
    - `POST /api/user-validation/discrepancies/:id/resolve` - Resolve a data discrepancy
  - Added `DataDiscrepancyAlert` UI component that displays at top of volunteer intake form
  - Name mismatch detection between user.displayName and volunteerProfile.volunteerName
  - Authorization checks ensure users can only view/modify their own validation data

## Recent Changes (November 25, 2025)
- **Data Persistence Fix (Volunteers & Organizations)**: Fixed both volunteer and organization intake/settings forms to properly hydrate persisted data. Forms now use `form.reset()` in useEffect to populate fields when async profile data loads. This ensures saved data displays correctly.
  - Volunteer Intake: Fixed to access `{ user, volunteerProfile }` API response structure
  - Organization Intake: Fixed to reset all form fields when profile loads
  - Organization Settings: Fixed `values` option issue by using `form.reset()` instead
- **Auto-calculate Weekly Availability**: Backend automatically calculates `weeklyAvailability` from availability time slots when not explicitly provided, preventing NULL values. Existing profiles with NULL values were retroactively fixed.
- **Skill Parsing Helper**: Added `parseSkillsFromDb()` function to convert database format ("Skill Name (75%)") to form format `{ name, proficiency }`.
- **Volunteer Spotlight Feature**: Implemented `/api/volunteer-spotlight` endpoint that rotates featured volunteers on the landing page. Algorithm:
  - Selects from volunteers with completed onboarding profiles
  - Uses week-based rotation algorithm for consistent weekly selection
  - Shows volunteer story from profile motivations, weekly impact metrics (hours contributed + activities), or availability if new
  - Falls back to volunteer profile photo, then user avatar if available

## Recent Changes (November 24, 2025)
- **Volunteer Spotlight Feature**: Added new section on landing page showcasing a featured volunteer each week with their story and impact metrics. Algorithm rotates featured volunteers based on weekly activity. Fetches from `/api/volunteer-spotlight` endpoint.
- **SDG Toggle Fix**: Fixed undefined error in volunteer-intake.tsx when toggling SDG commitments. Added default empty array fallback for sdgGoals field.
- **Banner Animation Refinement**: Fixed scrolling facts banner to use exactly 2 copies of GLOBAL_FACTS array and adjusted animation to 20s duration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a mobile-optimized, role-based dashboard with UN SDG-themed color schemes, `shadcn/ui` components built on `Radix UI`, and a light theme with vibrant accents. It ensures consistent typography, an infinity loop logo, and interactive elements. Dashboards dynamically adjust for volunteer and organization views. Opportunity displays consistently use a 2-column layout for AI analysis and SDG alignment, with all section titles center-justified.

### Technical Implementations
The frontend uses React 18, TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS, Chart.js, React Hook Form, and date-fns with **PWA (Progressive Web App) support for mobile**. The backend is Node.js with TypeScript, Express.js for REST APIs, WebSockets, and Drizzle ORM with Neon serverless PostgreSQL. The database schema includes AI tracking fields and skill proficiency. An AI matching algorithm uses weighted scoring for volunteer-opportunity and volunteer-organization matches based on Skills, Location, SDG, Interests, and Availability. Multi-tenant security enforces data scoping. Key features include email-based profile linking, a full messaging system, automatic project completion tracking, real-time volunteer list updates, a comprehensive notification system, and an AI tips service for personalized recommendations. The system also generates personalized weekly email digests for volunteers and organizations, detailing contributions, impact scores, and AI-generated insights, with role-based attribution and impact deduplication awareness. PWA features enable mobile installation, offline-first capabilities, and service worker caching for enhanced mobile experience.

### Feature Specifications
The platform includes a rebranded landing page with an interactive SDG wheel, a role-based dashboard with real-time KPIs and AI-matched opportunities, and a "Volunteer Insights" section. It supports mobile data collection with impact deduplication, a calendar, interactive impact visualization, AI-powered impact storytelling, and CRUD operations for various entities (Projects, Tasks, Volunteers, Organizations, Calendar, Opportunities, Applications). It supports dual user types with distinct flows, project-task hierarchy with AI-powered volunteer recommendations, comprehensive profile settings, multi-step intake forms, and assignment tracking. A unified "My Work" page consolidates Applications, Assignments, and Tasks. The system provides a live and interactive impact narrative on dashboards, comprehensive print CSS for preventing page breaks in generated reports, and enhanced PDF export functionality for dashboards and reports.

### System Design Choices
Authentication is managed via Firebase Auth with Google OAuth. Client-server communication uses RESTful APIs, WebSockets, and React Query. Data processing involves client-side collection, Zod validation, Drizzle ORM for PostgreSQL, server-side aggregation, and client-side visualization. The frontend is deployed with Vite, the backend with Node.js and compiled TypeScript, and the production database uses Neon. PWA implementation includes:
- **Web App Manifest** (`manifest.json`): Defines app metadata, icons, theme colors, and display modes
- **Service Worker** (`service-worker.js`): Provides offline support with network-first caching strategy
- **Meta Tags**: iOS app capability tags, Android mobile web app support, theme color configuration
- **Installation**: App is installable on iOS (Home Screen) and Android devices (app drawer)

## Recent Changes (November 30, 2025) - Employee Engagement Planning
- **Comprehensive CSR Impact Reporting System**: Deployed complete 8-tab Impact Reporting dashboard with industry-standard metrics (Salesforce, HubSpot, VolunteerHub benchmarks):
  - Executive Summary, Time-Series, Impact Deep Dive, Projects, Strategic Insights, SDG Alignment, Benchmarking, Compliance tabs
  - Enhanced compliance scoring (B-Corp, GRI, ISO 26000, SASB frameworks)
  - PDF/CSV export functionality
  - Dark navy theme matching CSR Dashboard for consistent UX
- **Employee Engagement Tab Planning**: Created detailed implementation roadmap based on industry research:
  - Salesforce 1-1-1 model (56 VTO hours, 1.4M+ tracked, 50% lower turnover)
  - HubSpot volunteer lifecycle tracking (Interest → Discovery → Placement → Engagement)
  - VolunteerHub/Galaxy Digital standards (hour tracking, reporting, mobile apps)
  - 2025 benchmarks: 25-60% participation, 25-75 hours/employee, 200-400% ROI
  - Phase-based implementation (Weeks 1-8): Foundation → AI Matching → Recognition → CSR Admin
  - Database schema, API endpoints, frontend components specified
  - Integration with existing Synerxus platform (volunteer profiles, impact reporting, funnel analytics)

## External Dependencies

-   **Authentication & User Management**: Firebase Auth, Firebase Firestore, Firebase Storage
-   **Database & Infrastructure**: Neon Database, Drizzle Kit
-   **UI & Visualization**: Radix UI, Chart.js, Tailwind CSS
-   **Development & Build Tools**: TypeScript, Vite, ESBuild
-   **Matching Algorithm**: Python and TypeScript implementation
-   **Email Service**: Mock transporter (configurable for SendGrid, Mailgun, nodemailer in production)
-   **Location Services**: Google Maps API (for geolocation-based opportunity matching)
-   **Integration Platforms**: Zapier (CRM connectors - Salesforce, HubSpot)