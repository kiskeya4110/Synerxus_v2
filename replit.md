# Synerxus - Connect. Collaborate. Impact Globally.

## Overview

Synerxus is a comprehensive volunteer impact tracking and matching platform. It helps organizations measure, visualize, and communicate the outcomes of their volunteer initiatives. The platform uses AI to intelligently match global volunteers with opportunities, connecting activities to humanitarian outcomes and Sustainable Development Goals (SDGs). Synerxus provides data-driven insights for impact assessment and storytelling, aiming to offer "Intelligent connections for sustainable development worldwide."

## Recent Changes

### November 3, 2025 - UserType Handling & Navigation Fixes
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