# Synerxus - Connect. Collaborate. Impact Globally.

## Overview

Synerxus is a comprehensive volunteer impact tracking and matching platform. It helps organizations measure, visualize, and communicate the outcomes of their volunteer initiatives. The platform uses AI to intelligently match global volunteers with opportunities, connecting activities to humanitarian outcomes and Sustainable Development Goals (SDGs). Synerxus provides data-driven insights for impact assessment and storytelling, aiming to offer "Intelligent connections for sustainable development worldwide."

## Recent Changes

### November 3, 2025 - Database Migration & Bug Fixes

- **PostgreSQL Database Migration**: Migrated from in-memory storage to persistent PostgreSQL database:
  - Created database connection in server/db.ts using Neon serverless
  - Converted all MemStorage methods to DatabaseStorage using Drizzle ORM
  - Implemented CRUD operations for all entities (users, organizations, projects, tasks, etc.)
  - Successfully synced schema to database with `npm run db:push`
  - All data now persists across server restarts
- **React Hooks Bug Fix**: Fixed "Rendered more hooks than during the previous render" error in dashboard:
  - Moved all useQuery and useMemo hooks to top of component before early returns
  - Removed duplicate hooks that were causing inconsistent rendering
  - Added `enabled` option to conditionally run queries based on user state
  - Dashboard now loads successfully for all user types
- **Display Name Enhancement**: Added user identification to profile dropdown menu:
  - Shows display name (or email prefix if no display name) at top of dropdown
  - Shows email address in muted text below name
  - Increased dropdown width from w-48 to w-56 for better readability
  - Added proper test IDs for automated testing
- **Profile Picture Upload System**: Implemented complete profile picture upload functionality:
  - Created ProfilePictureUpload component with Firebase Storage integration
  - Validates image files and size limits (max 5MB)
  - Integrated into both volunteer and organization intake forms (Step 1)
  - Backend saves profile photo URLs to users.avatar field
  - Component properly loads and displays existing profile pictures
  - Users can upload, change, and remove profile pictures
  - All profile pictures persist to PostgreSQL database
- **Session Error Handling**: Enhanced error handling for expired sessions:
  - Detects 404 errors (user not found) and prompts users to log in again
  - Clears localStorage and shows "Session Expired" toast message
  - Auto-redirects to login page after 2 seconds
  - Works correctly in both organization and volunteer intake forms

### November 3, 2025 - SDG Selection & Matching Algorithm Integration
- **SDG Selection Fix - Complete Rewrite**: Fixed infinite re-render loop in organization intake form:
  - Removed Radix Checkbox component entirely, replaced with custom div-based checkbox indicator
  - Implemented React state management (`useState<number[]>`) for selected SDGs
  - Eliminated all `form.watch()` calls that were causing subscription loops
  - Added useEffect to sync state with form when profile loads
  - Custom checkbox shows purple background with check icon when selected, gray border when not
- **Form Submission Fix**: Fixed `apiRequest` call signature from object format to positional parameters `(method, url, data)` in both organization and volunteer intake forms
- **Organization & Volunteer Name Capture**: Added name fields to both intake forms:
  - Organization intake Step 1 now has "Organization Name" field (required, min 2 chars)
  - Organization intake Step 1 now has "Organization Location" field (required, min 3 chars)
  - Volunteer intake Step 1 now has "Your Name" field (required, min 2 chars)
  - Names and location are now captured and saved to database
  - Communities served field exists as "Target Beneficiaries" in Step 4
- **Organization Creation During Intake**: Updated organization intake backend to create organization record on-the-fly for new users:
  - If user.organizationId exists, uses existing organization
  - If user.organizationId is null, creates new organization with name from form
  - Updates user.organizationId to link to the created organization
  - Eliminates 404 "Organization not found" error for new users
- **Volunteer Name Flow**: Updated volunteer intake backend to save volunteer name:
  - Updates user.displayName from req.body.volunteerName
  - Uses fresh volunteerName value directly for matchable volunteer entity (not stale user object)
- **Name Propagation to Matching Algorithm**: Organization and volunteer names now flow correctly to matchable entities:
  - Organization: form → backend → organizations.name → matchable_organizations.name
  - Volunteer: form → backend → users.displayName → volunteers.name
- **Matching Algorithm Integration**: Intake endpoints now create/update matchable entities for the matching algorithm:
  - Volunteer intake creates/updates `volunteers` table with `sdgGoals` from `volunteer_profiles.preferredSdgs`
  - Organization intake creates/updates `matchable_organizations` table with `sdgFocus` from `organization_profiles.primarySdgs`
- **Storage Layer Enhancement**: Modified `createVolunteer` and `createMatchableOrganization` to respect caller-provided deterministic IDs (e.g., `vol_${email}`, `org_${contactEmail}`) instead of always generating UUIDs.
- **Data Synchronization**: SDG selections from intake forms now properly flow to matching algorithm, enabling the 20% SDG alignment component of match scores.
- **UserType Management**: Moved userType updates to server-side within intake endpoints. Updates occur AFTER successful profile creation to ensure data consistency.
- **Intake Flow Security**: Added strict validation - userType only set when currently null (prevents role flipping). Changes applied atomically with profile creation.
- **Sidebar UX**: Shows minimal navigation shell with intake form links for users without userType set, instead of disappearing.
- **Dashboard Messaging**: Provides clear "Account Setup Required" message with action buttons for users without userType.
- **Hamburger Menu**: Created shared SidebarContext for synchronized state between Header and Sidebar components. Menu now properly toggles sidebar on mobile devices.
- **Logo Navigation**: All logos (header, sidebar, login page) now link to landing page using anchor tags with hover effects.
- **Sign-Out Flow**: Updated to automatically redirect to landing page after successful sign-out.
- **Seed Data Removal**: Completely removed initializeSeedData() method and all test data including "Clean Water Initiative" project, test users, and sample tasks. System now starts with clean state.
- **Mock Data Cleanup**: Removed "Clean Water Initiative" references from header notifications.

**Known Architectural Limitation**: Backend endpoints accept user/organization IDs from request parameters without session-based validation. This is a pre-existing pattern affecting many endpoints across the codebase. Full remediation would require implementing authentication middleware to bind requests to Firebase auth tokens system-wide.

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
- **Database Schema**: Relational design covering Users, Organizations, Projects, Tasks, Volunteer Activities, Impact Metrics, Project Impacts, Opportunities, Applications, and Matchmaking data. Includes AI tracking fields for projects.
- **AI Matching Algorithm**: Python-based system with Node.js integration for weighted scoring of volunteer-organization matches (skills 35%, location 25%, interests 20%, SDG alignment 20%). Configurable match threshold.
- **Profile Management**: Email-based profile linking with `useEffect` for form initialization.

### Feature Specifications
- **Landing Page**: Rebranded, publicly accessible, showcasing features and calls to action.
- **Dashboard**: Fully database-integrated, role-based views (Volunteer/Organization) with real-time KPIs, interactive KPI cards, Impact Over Time chart, SDG Contributions chart, Quick Actions, Recent Activity, and Upcoming Events.
- **SDG Mapping**: Visual representation and tracking of project alignment with UN SDGs.
- **Mobile Data Collection**: Tabbed interface for activity logging and impact data recording with form validation.
- **Calendar**: Full-featured calendar with event management, clickable day slots for event creation, and timezone handling.
- **Impact Visualization**: Interactive impact dashboard with Before/After comparison, clickable aggregated impact metrics, and real-time Chart.js visualizations.
- **Impact Storytelling**: AI-powered narrative generation and social media sharing.
- **Field-Specific Metrics**: Customizable KPIs for various domains.
- **Core Management Pages**: Dedicated interfaces for Projects, Tasks, Volunteers, Organizations, Calendar, Opportunities, and Applications.
- **Project Detail & Management**: Comprehensive viewing and editing with AI-powered or manual completion tracking, statistics display, and tabbed interface.
- **Volunteer Opportunities System**: Full-featured posting and discovery with AI recommendations and application tracking.
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