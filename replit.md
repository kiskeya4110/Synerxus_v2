# Synerxus - Connect. Collaborate. Impact Globally.

## Overview

Synerxus is a comprehensive volunteer impact tracking and matching platform. It helps organizations measure, visualize, and communicate the outcomes of their volunteer initiatives. The platform uses AI to intelligently match global volunteers with opportunities, connecting activities to humanitarian outcomes and Sustainable Development Goals (SDGs). Synerxus provides data-driven insights for impact assessment and storytelling, aiming to offer "Intelligent connections for sustainable development worldwide."

## Recent Changes

### November 4, 2025 - Comprehensive Project Intake Form Enhancement

- **Project Form Expansion**: Completely redesigned project intake form to match "Core Opportunity Form" specifications:
  - **Section 1 - The Basics**: Project title, description, and status tracking
  - **Section 2 - The Ideal Volunteer**: 
    - Required Skills field (35% weight in AI matching - most important)
    - Optional Skills field (nice-to-have skills for refined matching)
    - Experience Level dropdown (entry-level, intermediate, expert/specialist)
  - **Section 3 - The Logistics**:
    - Engagement Type selector (remote, in-person, hybrid)
    - Location field (25% weight in AI matching - critical for local volunteers)
    - Start Date and End Date for project timeline
    - Time Commitment Type (ongoing, project-based, event)
    - Ongoing Hours per Week (for regular commitments)
    - Project Total Hours (for project-based work)
    - Number of Volunteers Needed
  - **Section 4 - The Purpose & Impact**:
    - Primary SDG Alignment (main UN SDG goal, 20% weight in matching)
    - Additional SDG Alignments (optional secondary SDGs)
    - Impact Metric Name (e.g., "Students Tutored", "Trees Planted")
    - Impact Metric Unit (e.g., "students", "trees", "families")
    - Impact Goals description (expected outcomes)
  - **Section 5 - Completion Tracking**:
    - Total Hours Logged (actual volunteer hours completed)
    - Completion Percentage (0-100% project completion)
- **Database Schema Updates**: Added 11 new fields to projects table:
  - `requiredSkills` (text array) - Required skills for AI matching
  - `optionalSkills` (text array) - Nice-to-have skills
  - `experienceLevel` (text) - entry-level, intermediate, or expert
  - `engagementType` (text) - remote, in-person, or hybrid
  - `commitmentType` (text) - ongoing, project-based, or event
  - `ongoingHoursPerWeek` (integer) - For ongoing commitments
  - `projectTotalHours` (integer) - For project-based work
  - `totalHoursLogged` (integer) - Actual hours completed
  - `primarySdg` (integer) - Main SDG goal (1-17)
  - `impactMetricName` (text) - Primary impact metric name
  - `impactMetricUnit` (text) - Unit of measurement
- **Form Organization**: Five organized sections with clear headings and helpful descriptions
- **AI Matching Integration**: All fields clearly labeled with their weight in the matching algorithm (Skills 35%, Location 25%, SDG 20%)
- **Visual Enhancements**: Blue highlighted indicators for critical matching fields, helpful placeholder text, and contextual guidance

### November 4, 2025 - SDG Mapping Multi-Tenant Security Fix

- **Critical Data Leakage Fix**: Fixed cross-organization data exposure on SDG Mapping dashboard:
  - Removed all hardcoded mock data (sdgData array, connectedProjects array)
  - Implemented proper organization-scoped filtering for all data queries
  - Added loading gate that waits for user identity before rendering any data
  - Projects filtered by user's organizationId to ensure tenant isolation
  - Impact metrics aggregated only from organization's own project impacts
  - Created Set-based filtering to prevent cross-organization impact data leakage
  - Returns empty arrays when user or organization ID not available (defensive programming)
  - Fixed initial render vulnerability where unfiltered data briefly appeared
  - All SDG statistics now calculated from real database data, scoped by organization
  - Security verified: No cross-organization data visible at any point in render lifecycle

### November 3, 2025 - Calendar-Project Linking & Comprehensive Project Intake Form

- **Calendar Event Enhancements**: Enhanced calendar events with project and user assignment capabilities:
  - Added `attendees` field to calendar event schema for assigning users/volunteers to events
  - Calendar event form now includes project selection dropdown
  - Attendees field accepts comma-separated user IDs for multi-user assignment
  - Event details dialog displays linked project name and assigned users with their IDs
  - Fixed form.reset() bug that retained stale attendee IDs when creating new events
  - Form now properly clears all fields including attendees between event creations
- **Comprehensive Project Intake Form**: Enhanced project creation with full AI matching data collection:
  - Added `location` field (required, 25% weight in AI matching algorithm)
  - Added `startDate` and `endDate` fields for project timeline tracking
  - Added `skillsNeeded` field (35% weight in AI matching algorithm)
  - Added `volunteersNeeded` field for capacity planning
  - Added `impactGoals` field for expected outcomes description
  - Enhanced `sdgs` field with matching weight explanation (20% in AI algorithm)
  - Made dialog scrollable (max-h-90vh) for better UX with many fields
  - All fields display their relevance to AI matching algorithm with percentage weights
  - Project data properly stored in database for AI matching optimization

### November 3, 2025 - Bug Fixes for Impact Visualization, Logo, and Dashboard

- **Impact Visualization Fix**: Fixed the Impact Visualization page that was not working:
  - Added missing BarChart icon import from lucide-react
  - Page now correctly displays empty state when no data exists
  - When data is present, displays full tabbed analytics (Before & After, Outcomes, Time Series)
  - Works correctly for both volunteer and organization user types
- **Logo Display Fix**: Fixed fractured logo appearance on dashboards:
  - Added flex-shrink-0 class to prevent logo from shrinking
  - Added whitespace-nowrap to keep text aligned
  - Added error handling for logo loading failures
  - Logo now displays consistently across all screen sizes
- **Dashboard KPI Cleanup**: Removed misleading percentage trends from Volunteer Dashboard:
  - Removed hardcoded trends (+12%, +8%, +25%, etc.) from KPI cards
  - KPI cards now show only real data values without fake trend indicators
  - Will add real trend calculations when historical data is available
- **Location Persistence Verification**: Confirmed location saving works correctly:
  - Location saved to volunteers/matchable_organizations tables (required for AI matching)
  - Settings pages load location from matching tables
  - Profile page displays location from matching tables
  - All location data persists correctly across database and UI

### November 3, 2025 - Navigation Streamlining & Empty State Improvements

- **Navigation Cleanup**: Streamlined organization navigation to reduce redundancy:
  - Removed "Post Opportunities" from sidebar menu (was redundant)
  - Relocated Post Opportunities section from dashboard to Projects & Tasks page
  - Section now appears under search bar, visible only to organization users
  - Maintains same two-card design (Core Opportunity and Urgent Need/Event)
  - Improves discoverability by placing opportunity posting next to projects list
- **Impact Visualization Empty State**: Added comprehensive empty state to Impact Visualization page:
  - Displays helpful card when no projects, activities, or impacts exist
  - Provides clear explanation of why visualizations are empty
  - Includes action buttons to "Create Project" and "Log Activity"
  - Shows once user has data, hiding empty state and displaying tabbed analytics
  - Improves UX by guiding users to take necessary actions

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