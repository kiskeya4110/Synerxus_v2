# Synerxus - Connect. Collaborate. Impact Globally.

## Overview

Synerxus is a comprehensive volunteer impact tracking and matching platform. It helps organizations measure, visualize, and communicate the outcomes of their volunteer initiatives. The platform uses AI to intelligently match global volunteers with opportunities, connecting activities to humanitarian outcomes and Sustainable Development Goals (SDGs). Synerxus provides data-driven insights for impact assessment and storytelling, aiming to offer "Intelligent connections for sustainable development worldwide."

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Dashboard Design**: Role-based partitioning for volunteers and organizations, optimized color schemes for KPIs, and UN SDG colors for charts.
- **Mobile Optimization**: Comprehensive mobile app optimization with responsive layouts.
- **Component Library**: Utilizes `shadcn/ui` components built on `Radix UI` primitives for accessibility.
- **Theme**: Lighter theme with a very light blue-gray background, bright blue primary color, white cards, and vibrant accent colors.
- **Branding**: Synerxus rebrand with an infinity loop logo, navy blue and orange-gold color scheme, and consistent typography.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, Wouter for routing, TanStack Query for server state, Tailwind CSS, Chart.js, React Hook Form with Zod, date-fns.
- **Backend**: Node.js with TypeScript, Express.js for REST API, WebSocket for real-time updates, Drizzle ORM with Neon serverless PostgreSQL, esbuild.
- **Database Schema**: Relational design covering Users, Organizations, Projects, Tasks, Volunteer Activities, Impact Metrics, Project Impacts, Opportunities, Applications, Messages, and Matchmaking data. Includes AI tracking fields for projects.
- **AI Matching Algorithm**: TypeScript implementation (`server/matching-algorithm.ts`) with weighted scoring of volunteer-opportunity matches (skills 35%, location 25%, interests 20%, SDG alignment 20%). Default 40% match threshold filters opportunities shown to volunteers. Tightened baseline scores (Nov 2025) to prevent clustering around 41% - baselines now 0 when data missing, with moderate scores (40-50) only when both parties lack data. String normalization with `.trim()` applied to all comparisons. Reuses same algorithm for volunteer-organization matching.
- **Multi-Tenant Security Architecture**: 
  - **Server-Side Service Layer** (`server/dashboard-service.ts`): `getProjectsForVolunteer()` filters opportunities by AI match threshold (40% default), `getDashboardDataForOrganization()` strictly scopes all data by organizationId, `getDashboardDataForVolunteer()` includes only assigned projects and AI-matched opportunities
  - **API Endpoints**: All endpoints (`/api/projects`, `/api/opportunities`, `/api/dashboard/summary`, `/api/volunteers/matches`) require userId query parameter for authentication context, enforce server-side filtering at database level before returning data
  - **Data Isolation**: Organizations only see their own projects, opportunities, and AI-matched volunteers (40% threshold) with zero cross-organization data leakage. Volunteers only see projects they're assigned to and AI-matched opportunities above threshold
  - **Authorization**: Backend validates user type and applies role-based filtering - organizations filtered by organizationId and see only AI-matched volunteers above threshold, volunteers filtered by projectAssignments and AI matching
  - **AI Volunteer Matching** (`/api/volunteers/matches`): Organizations see volunteers matched against their open opportunities using same weighted algorithm (skills 35%, location 25%, SDG 20%, interests 20%). Endpoint verifies authenticated user is an organization before returning matches. Match scores displayed in volunteer cards.
- **Profile Management**: Email-based profile linking with `useEffect` for form initialization. Cache invalidation strategy ensures profile data synchronization across Settings, Profile, and Dashboard views using user-scoped query keys.
- **Organization-Volunteer Communication**: Full messaging system with Messages table, 4 REST endpoints (create, list, conversation, mark-as-read), ContactVolunteerModal using shadcn Form + zodResolver validation, project assignment capabilities. Organizations can only contact volunteers assigned to their projects.

### Feature Specifications
- **Landing Page**: Rebranded, publicly accessible, showcasing features and calls to action, including an interactive SDG wheel.
- **Dashboard**: Fully database-integrated, role-based views (Volunteer/Organization) with real-time KPIs, interactive KPI cards, Impact Over Time chart, SDG Contributions chart, Quick Actions, Recent Activity, and Upcoming Events. Volunteers have a "Find Opportunities" tab showing AI-matched opportunities with percentage scores (skills 35%, location 25%, SDG 20%, interests 20%). Impact Score (0-100) calculated from volunteer hours (40%), completed tasks (30%), SDG coverage (20%), and match acceptance (10%). **Dashboard uses scoped `/api/dashboard/summary` endpoint** which returns `summary` object containing accurate KPIs (Active Projects, Active Volunteers, Total Hours, SDGs Addressed) calculated server-side from organization-scoped data. **SDG chart displays only organization's selected `primarySdgs`** from their profile Settings, fetched via `organizationPrimarySdgs` field in dashboard summary. Frontend accesses KPIs via `dashboardData.summary.*` path (fixed Nov 2025). Eliminates cross-tenant data leakage.
- **SDG Mapping**: Visual representation and tracking of project alignment with UN SDGs, with multi-tenant security. Features interactive **spider web (radar) chart** comparing organization's selected SDG focus areas from Settings (blue baseline) vs actual project distribution (orange-gold normalized data), showing alignment between stated priorities and execution. **Interactive Connected Projects** - clicking any SDG goal displays related projects with clickable cards that navigate to project detail pages.
- **Mobile Data Collection**: Tabbed interface for activity logging and impact data recording with form validation.
- **Calendar**: Full-featured calendar with event management, clickable day slots for event creation, and project/user assignment capabilities.
- **Impact Visualization**: Interactive impact dashboard with Before/After comparison, clickable aggregated impact metrics, and real-time Chart.js visualizations, including comprehensive empty states.
- **Impact Storytelling**: AI-powered narrative generation and social media sharing.
- **Field-Specific Metrics**: Customizable KPIs for various domains.
- **Core Management Pages**: Dedicated interfaces for Projects, Tasks, Volunteers, Organizations, Calendar, Opportunities, and Applications. **Projects page now organization-scoped** - fetches only the logged-in organization's projects using `userId` parameter. Full CRUD capabilities with CreateProjectDialog (comprehensive intake form), EditProjectDialog, and DeleteProjectDialog.
- **Project Detail & Management**: Comprehensive viewing and editing with AI-powered or manual completion tracking, statistics display, and tabbed interface.
- **Volunteer Opportunities System**: Full-featured posting and discovery with AI recommendations and application tracking. Includes an enhanced project intake form for comprehensive data collection for AI matching.
- **System Partitioning**: Dual user types (Volunteer/Organization) with distinct flows and role-based navigation.
- **Project-Task Hierarchy**: Project-based workflow with `projectAssignments` and task assignments.
- **Profile Settings**: Comprehensive matching profile management for volunteers and organizations, including photo upload, email-based linking, and full profile editing.
- **Intake Forms System**: Multi-step onboarding forms for volunteers (location, skills, availability, SDGs, contact) and organizations (type, mission, SDGs, verification, volunteer needs). Also includes detailed forms for Core and Urgent Opportunity Posting.
- **Authentication & Login Flow**: Firebase-based authentication (email/password, Google OAuth) with automatic dashboard redirect, user type selection, session persistence, password management, and account deletion.

### System Design Choices
- **Authentication**: Firebase Auth with Google OAuth, automatic dashboard redirect.
- **Client-Server Communication**: RESTful APIs, WebSocket for real-time updates, React Query.
- **Data Processing**: Client-side collection, Zod validation, Drizzle ORM for PostgreSQL, server-side aggregation, client-side visualization.
- **Deployment**: Vite for frontend, Node.js with compiled TypeScript for backend, Neon for production database.

## External Dependencies

- **Authentication & User Management**: Firebase Auth, Firebase Firestore, Firebase Storage
- **Database & Infrastructure**: Neon Database, Drizzle Kit
- **UI & Visualization**: Radix UI, Chart.js, Tailwind CSS
- **Development & Build Tools**: TypeScript, Vite, ESBuild
- **Matching Algorithm**: Python and TypeScript implementation with weighted scoring (Skills, Location, SDG, Interests).