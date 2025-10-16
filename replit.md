# aBridge - Bridging Global Volunteers with Meaningful Impact

## Overview

aBridge is a comprehensive volunteer impact tracking and matching platform by aBridge Global. Its purpose is to help organizations measure, visualize, and communicate the outcomes of their volunteer initiatives worldwide. The platform uses AI to intelligently match global volunteers with meaningful opportunities, connecting volunteer activities to broader humanitarian outcomes and Sustainable Development Goals (SDGs), and providing data-driven insights for impact assessment and storytelling. The vision is to offer "Intelligent connections for sustainable development worldwide."

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Dashboard Design**: Role-based partitioning for volunteers and organizations with optimized color schemes for KPIs (e.g., blue for hours, green for impact) and official UN SDG colors for charts.
- **Mobile Optimization**: Comprehensive mobile app optimization with responsive layouts, appropriate touch target sizes (minimum 44px), and responsive typography.
- **Component Library**: Utilizes `shadcn/ui` components built on `Radix UI` primitives for accessibility and consistent design.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite for builds, Wouter for routing, TanStack Query for server state, Tailwind CSS for styling, Chart.js for data visualization, React Hook Form with Zod for form management.
- **Backend**: Node.js with TypeScript, Express.js for REST API, WebSocket for real-time updates, Drizzle ORM with Neon serverless PostgreSQL, esbuild for production bundling.
- **Database Schema**: Relational design covering Users, Organizations, Projects, Tasks, Volunteer Activities, Impact Metrics, and Project Impacts.

### Feature Specifications
- **Landing Page**: Publicly accessible, showcasing features, benefits, and calls to action.
- **Dashboard**: Role-based views (Volunteer and Organization) displaying key performance indicators, interactive charts, project progress, and quick action shortcuts.
- **SDG Mapping**: Visual representation and tracking of project alignment with UN SDGs.
- **Mobile Data Collection**: Tabbed interface for activity logging and impact recording, with offline capabilities and media upload.
- **Impact Visualization**: Tools for before/after comparisons, interactive charts, and customizable metric dashboards.
- **Impact Storytelling**: AI-powered narrative generation and social media sharing.
- **Field-Specific Metrics**: Customizable KPIs for various domains (healthcare, education, environment).
- **Core Management Pages**: Dedicated interfaces for Projects, Tasks, Volunteers, Organizations, and Calendar, all with interconnected data and navigation.

### System Design Choices
- **Authentication**: Firebase Auth with Google OAuth.
- **Client-Server Communication**: RESTful APIs with JSON, WebSocket for real-time, React Query for state management.
- **Data Processing**: Client-side data collection, Zod for validation, Drizzle ORM for PostgreSQL storage, server-side aggregation, and client-side visualization.
- **Deployment**: Vite for frontend, Node.js with compiled TypeScript for backend, Neon for production database.

## External Dependencies

- **Authentication & User Management**: Firebase Auth, Firebase Firestore, Firebase Storage
- **Database & Infrastructure**: Neon Database, Drizzle Kit
- **UI & Visualization**: Radix UI, Chart.js, Tailwind CSS
- **Development & Build Tools**: TypeScript, Vite, ESBuild

## Changelog

### October 16, 2025 (Latest)
- **System Partitioning for Dual User Types**: Complete partition for volunteer and organization accounts
  - **Dual Signup/Login Flow**: Users select account type (Volunteer vs Organization) during registration
  - **Database Schema**: Added `userType` field to users table to distinguish account types
  - **Organization Signup**: Additional field for organization name during registration process
  - **Account Type Selection UI**: Clear, user-friendly buttons to choose between volunteer and organization signup
- **Volunteer Opportunities System**: Full-featured opportunity posting and discovery platform
  - **Opportunities Table**: New database table storing volunteer position details (title, description, skills, location, time commitment, etc.)
  - **Applications Table**: Tracks volunteer applications with status tracking (pending, accepted, rejected, withdrawn)
  - **Volunteer Profiles**: Extended profile table with location, languages, interests, experience, preferred causes
  - **Organization Profiles**: Extended profile table with mission, focus areas, verification status
- **AI Matching Algorithm**: Intelligent volunteer-opportunity matching system
  - **Multi-Factor Scoring**: Calculates match scores (0-100) based on:
    - Skills Match (35% weight): Compares volunteer skills with required skills
    - Location Match (25% weight): Considers geographic proximity and remote options
    - Availability Match (20% weight): Matches time commitment with volunteer availability
    - Interest Match (15% weight): Aligns volunteer interests with opportunity category
    - Experience Match (5% weight): Considers relevant experience
  - **Match Reasons**: Provides specific reasons for match score (e.g., "3 matching skills", "Same location")
  - **Top Recommendations**: Automatically surfaces best-fit opportunities for volunteers
  - **Bidirectional Matching**: Works both ways - volunteers find opportunities AND organizations find volunteers
- **Volunteer Application System**: Complete application workflow
  - **Application Dialog**: Modal for submitting applications with cover letter
  - **Match Score Display**: Shows AI-calculated match score and reasons during application
  - **Application Tracking**: Tracks application status from submission to review
  - **Cover Letter Requirement**: Ensures volunteers explain their interest and qualifications
- **New Pages & Navigation**:
  - **Discover Opportunities Page** (`/discover-opportunities`): Volunteers browse and apply to positions
    - AI-powered recommendations section for top matches (70%+ match score)
    - Search and filter by category, location, remote options
    - Visual match badges (Excellent/Good/Fair) with match reasons
    - One-click application with pre-filled match data
  - **Opportunities Management Page** (`/opportunities`): Organizations post and manage volunteer positions
    - Post new opportunities with full details
    - View all posted opportunities with status indicators
    - Track applicants and manage applications
  - **Updated Sidebar**: Added "Find Opportunities" and "Post Opportunities" navigation items
- **Lighter Theme Implementation**: Refreshed UI with brighter, more accessible colors
  - **Background**: Changed to very light blue-gray (#F7F9FC) for reduced eye strain
  - **Primary Color**: Bright blue (#2E7FEB) for better visibility and modern feel
  - **Cards**: Pure white (#FFFFFF) cards for clean separation
  - **Accent Colors**: Teal (#14B8A6) and cyan (#4FC3F7) for visual interest
  - **Success/Destructive**: Softer green and red colors for better accessibility
  - **Border/Input**: Lighter borders and input backgrounds for cleaner appearance
  - **Chart Colors**: More vibrant colors for better data visualization
- **Data Flow Optimization**:
  - Seamless connection between volunteers and organizations through opportunities
  - Applications link volunteers to specific opportunities
  - Match scores calculated server-side using AI algorithm
  - Real-time application status updates
  - Efficient database queries with proper indexing on foreign keys
- **Project-Task Hierarchy Architecture** (Latest Update): Restructured application with project-based workflow
  - **Project Assignments Table**: New `projectAssignments` table linking volunteers to projects with tracking metrics
    - Fields: role, status (active/completed/on-hold), hoursCommitted, hoursCompleted, assignmentDate
    - Enables tracking volunteer contributions at project level with hours and role information
  - **Task Hierarchy**: Tasks now belong to projects (projectId foreign key) with assignee tracking
    - Tasks can be assigned to specific volunteers (assigneeId)
    - Status tracking: todo/pending, in progress, completed
    - Enables granular task management within projects
  - **Role-Based Navigation**: Completely different navigation menus for volunteers vs organizations
    - **Volunteer Menu**: Dashboard, Find Opportunities, My Tasks, My Impact, Calendar, Log Activity
    - **Organization Menu**: Dashboard, Projects & Tasks, Post Opportunities, Volunteers, Impact Reports, SDG Tracking, Impact Stories, Metrics, Calendar
    - Navigation dynamically changes based on userType field
  - **New Pages**:
    - **Projects Page** (`/projects`): Organization view showing all projects with collapsible task lists, assignment metrics (volunteers, hours, progress), and task management capabilities
    - **My Tasks Page** (`/my-tasks`): Volunteer view with tabs for tasks (todo/in progress/completed) and projects, showing assignment details and progress tracking
  - **Mobile Menu Fixes**: Fixed z-index layering (overlay z-30, sidebar z-40, button z-50) and added touch feedback for better mobile UX
  - **Data Architecture**: Projects → Tasks → Volunteers flow with projectAssignments bridging volunteers to projects and tasks to individual assignments