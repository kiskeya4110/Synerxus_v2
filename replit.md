# aBridge - Bridging Global Volunteers with Meaningful Impact

## Overview

aBridge is a comprehensive volunteer impact tracking and matching platform designed to help organizations measure, visualize, and communicate the outcomes of their volunteer initiatives. It utilizes AI to intelligently match global volunteers with meaningful opportunities, connecting volunteer activities to broader humanitarian outcomes and Sustainable Development Goals (SDGs). The platform provides data-driven insights for impact assessment and storytelling, aiming to offer "Intelligent connections for sustainable development worldwide."

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Dashboard Design**: Role-based partitioning for volunteers and organizations with optimized color schemes for KPIs and official UN SDG colors for charts.
- **Mobile Optimization**: Comprehensive mobile app optimization with responsive layouts, appropriate touch target sizes, and responsive typography.
- **Component Library**: Utilizes `shadcn/ui` components built on `Radix UI` primitives for accessibility and consistent design.
- **Theme**: Lighter theme with a very light blue-gray background, bright blue primary color, white cards, and vibrant accent and chart colors for accessibility and modern aesthetics.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, Wouter for routing, TanStack Query for server state, Tailwind CSS, Chart.js with react-chartjs-2, React Hook Form with Zod, date-fns for datetime handling.
- **Backend**: Node.js with TypeScript, Express.js for REST API, WebSocket for real-time updates, Drizzle ORM with Neon serverless PostgreSQL, esbuild for production bundling.
- **Database Schema**: Relational design covering Users, Organizations, Projects, Tasks, Volunteer Activities, Impact Metrics, Project Impacts, Opportunities, Applications, and Matchmaking data. Volunteer and MatchableOrganization tables include unique email fields for user account linking.
- **AI Matching Algorithm**: Python-based system with Node.js integration for weighted scoring of volunteer-organization matches based on skills (35%), location (25%), interests (20%), and SDG alignment (20%). Configurable match threshold (default 40.0) with automatic match record creation.
- **Profile Management**: Email-based profile linking with useEffect pattern for proper form initialization, handling race conditions between user authentication and form rendering.

### Feature Specifications
- **Landing Page**: Publicly accessible, showcasing features and calls to action. Authenticated users are automatically redirected to their dashboard.
- **Seed Data**: Comprehensive dummy data script (dummy/seed-data.ts) with:
  - 6 test users (3 volunteers, 3 organizations) with Firebase-compatible authentication
  - 3 organizations with varied missions and SDG focuses
  - 4 projects across different domains (health, education, environment)
  - 21 volunteer activities distributed across projects
  - 21 project impacts with realistic values
  - 5 calendar events spanning different event types
  - Proper transactional handling and foreign key ordering
  - Realistic data for testing all features
- **Dashboard**: Fully database-integrated role-based views (Volunteer and Organization) with:
  - Real-time KPIs pulling from volunteer activities, projects, tasks, and impact metrics
  - **Fully interactive KPI cards for both user types** with click-through detail dialogs:
    - Volunteers: Hours Logged, Tasks Completed, Projects Joined, People Impacted
    - Organizations: Active Volunteers, Total Projects, Total Hours, SDGs Addressed
  - All KPI detail dialogs show comprehensive data breakdowns and project associations
  - Project filter dropdown that updates all KPIs, charts, projects list, tasks, and activities
  - Impact Over Time chart displaying volunteer hours and people impacted from actual database records
  - SDG Contributions chart showing top 5 SDGs from project data with official UN colors
  - Role-specific Quick Actions (different actions for volunteers vs organizations)
  - Recent activity feed with real volunteer activity data
  - Upcoming events from calendar database
- **SDG Mapping**: Visual representation and tracking of project alignment with UN SDGs.
- **Mobile Data Collection**: Fully functional tabbed interface with real database integration:
  - Activity logging with project/task selection, hours tracking, skills, and descriptions
  - Impact data recording with metric selection, values, and notes
  - Recent entries history showing last 10 logged activities
  - Form validation with Zod schemas
  - Success/error toast notifications
  - Data persists to volunteer_activities and project_impacts tables
- **Calendar**: Full-featured calendar with working event management:
  - Monthly calendar grid view with current day highlighting
  - **Clickable day slots** - Click any day to add events with pre-filled dates and default times (9 AM - 5 PM local time)
  - Proper timezone handling using date-fns for local datetime formatting
  - Add Event dialog with form validation (title, description, type, project, date/time, location)
  - Dialog title shows selected date for clarity
  - Event type color coding (volunteer shifts, meetings, deadlines, training)
  - Click events to view details
  - Events stored in calendar_events table
  - Month navigation controls
- **Impact Visualization**: Comprehensive interactive impact dashboard with:
  - Before/After comparison viewer with real project data and images
  - **Clickable Aggregated Impact Metrics** with detail dialogs showing breakdowns for:
    - Total People Impacted (with project and metric breakdowns)
    - Communities Served (with location and project details)
    - Volunteer Hours (with activity timeline)
    - SDGs Addressed (with project associations)
  - **Real-time Chart.js visualizations** pulling from actual API data:
    - Impact Growth Over Time (Line chart showing people impacted by month)
    - Volunteer Hours by Month (Bar chart)
    - Impact by SDG (Radar chart showing impact scores)
  - Project Outcomes cards displaying SDG badges and key metrics
  - Three-tab interface (Before & After, Outcomes, Time Series)
- **Impact Storytelling**: AI-powered narrative generation and social media sharing.
- **Field-Specific Metrics**: Customizable KPIs for various domains.
- **Core Management Pages**: Dedicated interfaces for Projects, Tasks, Volunteers, Organizations, Calendar, Opportunities, and Applications, all with interconnected data.
- **Volunteer Opportunities System**: Full-featured opportunity posting and discovery with AI-powered recommendations, search/filter, and application tracking.
- **System Partitioning**: Dual user types (Volunteer and Organization) with distinct signup/login flows, database fields, and role-based navigation menus.
- **Project-Task Hierarchy**: Restructured application with a project-based workflow, including `projectAssignments` and task assignments to volunteers.
- **Profile Settings**: Comprehensive matching profile management for both volunteers and organizations with email-based user linking, form validation, and seamless create/update workflows.

### System Design Choices
- **Authentication**: Firebase Auth with Google OAuth.
- **Client-Server Communication**: RESTful APIs with JSON, WebSocket for real-time updates, and React Query for state management.
- **Data Processing**: Client-side data collection, Zod for validation, Drizzle ORM for PostgreSQL storage, server-side aggregation, and client-side visualization.
- **Deployment**: Vite for frontend, Node.js with compiled TypeScript for backend, Neon for production database.

## External Dependencies

- **Authentication & User Management**: Firebase Auth, Firebase Firestore, Firebase Storage
- **Database & Infrastructure**: Neon Database, Drizzle Kit
- **UI & Visualization**: Radix UI, Chart.js, Tailwind CSS
- **Development & Build Tools**: TypeScript, Vite, ESBuild
- **Matching Algorithm**: Python 3 runtime