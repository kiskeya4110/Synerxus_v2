# Synerxus - Connect. Collaborate. Impact Globally.

## Overview

Synerxus is an AI-powered volunteer impact tracking and matching platform designed to connect global volunteers with opportunities. It helps organizations measure, visualize, and communicate the outcomes of their volunteer initiatives, linking activities to humanitarian outcomes and Sustainable Development Goals (SDGs). The platform provides data-driven insights for impact assessment and storytelling, aiming for "Intelligent connections for sustainable development worldwide."

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Dashboard Design**: Role-based partitioning for volunteers and organizations, optimized color schemes for KPIs, and UN SDG colors for charts. Enhanced with dual-color progress bars (green for completed, amber for remaining) and interactive profile overview sections.
- **Mobile Optimization**: Comprehensive mobile app optimization with responsive layouts for all components, including dynamic sizing and grid adjustments.
- **Component Library**: Utilizes `shadcn/ui` components built on `Radix UI` primitives for accessibility.
- **Theme**: Lighter theme with a very light blue-gray background, bright blue primary color, white cards, and vibrant accent colors.
- **Branding**: Synerxus rebrand with an infinity loop logo, navy blue and orange-gold color scheme, and consistent typography.
- **UN SDG Graphics**: Integration of official UN SDG graphics, replacing custom icons, displayed in numerical order.
- **Interactive Elements**: Clickable profile sections that open detailed modals, hover states throughout the dashboard, and visual cues ("View all", "Read more") to indicate interactivity.
- **Navigation**: Logo in sidebar and header always navigates to landing page using SPA navigation (wouter Link component). Logout automatically redirects to landing page.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, Wouter for routing, TanStack Query for server state, Tailwind CSS, Chart.js, React Hook Form with Zod, date-fns.
- **Backend**: Node.js with TypeScript, Express.js for REST API, WebSocket for real-time updates, Drizzle ORM with Neon serverless PostgreSQL, esbuild.
- **Database Schema**: Relational design covering Users, Organizations, Projects, Tasks, Volunteer Activities, Impact Metrics, Project Impacts, Opportunities, Applications, Messages, and Matchmaking data, including AI tracking fields.
- **AI Matching Algorithm**: TypeScript implementation for weighted scoring of volunteer-opportunity matches (skills 35%, location 25%, interests 20%, SDG alignment 20%) with a default 40% match threshold. Includes string normalization and baseline score adjustments for missing data. Reuses the same algorithm for volunteer-organization matching and AI-powered task/project volunteer assignment.
- **AI-Powered Volunteer Assignment**: Intelligent volunteer recommendation system for task and project assignments with dedicated endpoints (`/api/tasks/:taskId/recommended-volunteers`, `/api/projects/:projectId/recommended-volunteers`). Features comprehensive organization scoping (includes volunteers via direct membership, project assignments, or opportunity applications), task-level matching customization with optional override fields (`requiredSkillsOverride`, `sdgGoalsOverride`, `isRemoteOverride`, `locationOverride`), proper inheritance from parent projects, bulk profile fetching to eliminate N+1 queries, and real-time AI ranking displayed in assignment dialogs with match scores and top matching reasons.
- **Multi-Tenant Security Architecture**: Server-side service layer (`server/dashboard-service.ts`) and API endpoints enforce strict data scoping by `organizationId` or `userId` at the database level. Authorization ensures role-based filtering, preventing cross-organization data leakage and ensuring volunteers only see relevant data.
- **Profile Management**: Email-based profile linking with cache invalidation strategies for data synchronization.
- **Organization-Volunteer Communication**: Full messaging system with REST endpoints, contact modals, and project assignment capabilities, restricted to assigned project volunteers.
- **Automatic Project Completion Tracking**: Backend recalculates and persists project completion percentages based on task status (0% = Planning, 1-99% = In Progress, 100% = Completed), preserving manual "On Hold" status, broadcasting updates via WebSocket.
- **Real-Time Volunteer List Updates**: Automatic cache invalidation system ensures volunteer lists, project rosters, and dashboard data refresh immediately when applications are accepted. Uses predicate-based query invalidation to handle both global and user-scoped TanStack Query keys, ensuring volunteers appear in all relevant sections without manual page refresh.
- **Task-Project Integration**: Dashboard tasks are enriched server-side with project metadata (projectId, projectName, projectStatus) using efficient Map-based lookups. Recent Tasks section displays full project names alongside task details for better tracking and context. Includes backwards-compatible fallbacks for legacy data.
- **Unified Profile Management**: Intake forms and Settings tab share the same data source (volunteer_profiles table), ensuring profile data entered once during onboarding appears immediately in Settings without re-entry. Fixed data flow ensures consistency between volunteer registration and profile management.
- **Performance Optimizations**: Component-level optimization with React.memo for ProjectListCard, useMemo for expensive calculations (typed Map for project metrics), and useCallback for event handlers to minimize re-renders on large datasets.
- **Shared Opportunity Enrichment Service**: Centralized service (`server/opportunity-enrichment-service.ts`) that enriches opportunities with organization data, SDG goals, and AI match scores for consistent data across dashboard and discover pages. Features bulk organization lookups via `storage.getOrganizationsByIds()` for O(1) access, optional match scoring, filtering by threshold, and automatic sorting by match score. Eliminates code duplication and provides single source of truth for enriched opportunity data.
- **Enhanced Discover Opportunities Display**: Comprehensive opportunity cards show organization name (with Building2 icon), match percentage (color-coded badges), urgent indicators (red badge with AlertCircle), SDG goals (colored badges with official UN colors), required skills (badge display), time commitments (Clock icon), engagement type badges (remote/in-person/hybrid), start/end dates (CalendarDays icon), responsibilities section, benefits section ("What You'll Gain"), and match reasons (bullet points). Dashboard "Opportunities" tab shows identical enriched data for consistent UX.
- **Project Assignment Workflow**: Complete assignment system allowing organizations to directly assign volunteers to projects from `/Applications` or `/Volunteers` pages via enhanced profile dialogs. Assignments start with "pending" status and volunteers receive notifications via dedicated `/Assignments` page. Backend implements duplicate assignment prevention using `DuplicateAssignmentError` to block multiple pending/active assignments for the same volunteer-project pair (declined/completed assignments allow re-assignment). Volunteer-facing `/Assignments` page features session-based authentication with no localStorage dependency, separate sections for Pending Invitations and Active Assignments, accept/decline functionality with `respondedAt` timestamp tracking, and comprehensive cache invalidation ensuring dashboard and project rosters update in real-time. Navigation integrated into volunteer sidebar as "My Assignments" with Briefcase icon.
- **Impact Over Time Chart**: Multi-line Chart.js visualization displaying Volunteer Hours, People Impacted, and Algorithm-Evaluated Impact Score across 7-month rolling window. Backend (`server/dashboard-service.ts`) calculates and returns `monthlyImpactTrend` with algorithm-evaluated scores. Implements `coerceNumber()` helper with `Number.isFinite()` guard to safely convert string/numeric values from API, preventing concatenation bugs and NaN propagation. Chart legend uses Chart.js default styling to display uniformly colored filled boxes for all datasets.
- **SDG Detail Modals**: Centralized SDG data management with comprehensive details and targets for all 17 UN Sustainable Development Goals in `shared/sdg-goals.ts`, serving as single source of truth. Reusable `SDGDetailDialog` component displays detailed SDG information including name, description, expanded details, and specific targets. Integrated into landing page SDG wheel and dashboard Profile Overview, providing consistent user experience when clicking SDG badges. Helper function `getSDGFullName()` formats SDG names consistently (e.g., "1. No Poverty").

### Feature Specifications
- **Landing Page**: Rebranded, public-facing page showcasing features and calls to action, including an interactive SDG wheel.
- **Dashboard**: Role-based views (Volunteer/Organization) with real-time KPIs, interactive cards, Impact Over Time and full pie-chart SDG Distribution visualization, Quick Actions, Recent Activity, and Upcoming Events. Project cards display dual-color progress bars (green gradient for completed work, amber gradient for remaining work) with percentage breakdowns. Profile Overview features fully interactive, clickable sections that open detailed modals for skills, interests, organization needs, goals, and SDG commitments. Volunteers see AI-matched opportunities. Impact Score calculated from volunteer hours, completed tasks, SDG coverage, and match acceptance. All KPIs are server-side calculated and organization-scoped.
- **Volunteer Insights Dashboard Section**: Comprehensive volunteer data display on landing tab featuring three independent cards: (1) Volunteer Profile Card showing profile completeness progress bar, location, skills, interests, languages, SDG focus areas with UN colors and descriptive names (e.g., "1. No Poverty"), motivations in italic quotes, weekly availability supporting 0-hour values, work style preferences, and completion CTAs; (2) Application Stats Card displaying color-coded application counts (blue total, amber pending, green accepted, red rejected) with empty state "Discover Opportunities" CTA; (3) Hours Breakdown Card presenting top 5 projects with visual progress bars, hours and activity counts per project, project links, sorted by contribution descending, with encouraging empty state. All cards render independently with graceful null handling, responsive 3-column grid layout (stacks on mobile), proper data-testid attributes, and contextual CTAs to complete profile or discover opportunities.
- **SDG Mapping**: Visual tracking of project alignment with UN SDGs using an interactive radar chart with logarithmic scale, comparing organization's SDG focus areas against actual project distribution. Includes project statistics dashboard and interactive project cards with completion progress and SDG badges.
- **Mobile Data Collection**: Tabbed interface for activity logging and impact data recording with form validation.
- **Calendar**: Full-featured calendar with event management, creation, and assignment capabilities.
- **Impact Visualization**: Interactive dashboard with Before/After comparison, aggregated metrics, Chart.js visualizations, and an organization-scoped project selector for impact stories.
- **Impact Storytelling**: AI-powered narrative generation and social media sharing features.
- **Core Management Pages**: Dedicated, organization-scoped interfaces for Projects, Tasks, Volunteers, Organizations, Calendar, Opportunities, and Applications, with full CRUD capabilities. Opportunities can be linked to specific projects.
- **Volunteer Opportunities System**: Full-featured posting and discovery with AI recommendations, application tracking, and an enhanced project intake form for comprehensive data collection.
- **System Partitioning**: Dual user types (Volunteer/Organization) with distinct flows and role-based navigation.
- **Project-Task Hierarchy**: Project-based workflow with `projectAssignments` and task assignments.
- **Profile Settings**: Comprehensive matching profile management for volunteers and organizations, including photo upload and full editing.
- **Intake Forms System**: Multi-step onboarding forms for volunteers and organizations, and detailed forms for Core and Urgent Opportunity Posting.
- **Authentication & Login Flow**: Firebase-based authentication (email/password, Google OAuth) with intelligent redirect based on profile completion status (directs new users to intake forms, existing users to dashboard), user type selection, session persistence, password visibility toggles with keyboard accessibility, and comprehensive error handling. Logout automatically redirects to landing page and clears user session. Backend `/api/users/firebase-sync` endpoint handles both registration (requires userType) and login (returns existing user) seamlessly.

### System Design Choices
- **Authentication**: Firebase Auth with Google OAuth.
- **Client-Server Communication**: RESTful APIs, WebSocket for real-time updates, React Query.
- **Data Processing**: Client-side collection, Zod validation, Drizzle ORM for PostgreSQL, server-side aggregation, client-side visualization.
- **Deployment**: Vite for frontend, Node.js with compiled TypeScript for backend, Neon for production database.

## External Dependencies

- **Authentication & User Management**: Firebase Auth, Firebase Firestore, Firebase Storage
- **Database & Infrastructure**: Neon Database, Drizzle Kit
- **UI & Visualization**: Radix UI, Chart.js, Tailwind CSS
- **Development & Build Tools**: TypeScript, Vite, ESBuild
- **Matching Algorithm**: Python and TypeScript implementation