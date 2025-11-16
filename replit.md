# Synerxus - Connect. Collaborate. Impact Globally.

## Overview
Synerxus is an AI-powered platform designed to connect global volunteers with opportunities and enable organizations to track, measure, and visualize the impact of their volunteer initiatives. It links activities to humanitarian outcomes and Sustainable Development Goals (SDGs), providing data-driven insights for impact assessment and storytelling. The platform's core vision is "Intelligent connections for sustainable development worldwide."

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a role-based dashboard with optimized color schemes, including UN SDG colors for charts. It is mobile-optimized with responsive layouts and utilizes `shadcn/ui` components built on `Radix UI`. The theme is light, with a very light blue-gray background and vibrant accent colors, an infinity loop logo, navy blue and orange-gold scheme, and consistent typography. Official UN SDG graphics are integrated and displayed numerically. Interactive elements like clickable profile sections and hover states are prevalent, with clear navigation cues. Interactive KPI cards on organization dashboards open dialogs with clickable project items. Volunteer profile dialogs feature a modern gradient header, action buttons, skills section, and recent activity.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, Wouter for routing, TanStack Query, Tailwind CSS, Chart.js, React Hook Form, and date-fns. The backend uses Node.js with TypeScript, Express.js for REST APIs, WebSockets for real-time updates, and Drizzle ORM with Neon serverless PostgreSQL. The database schema is relational and comprehensive, including AI tracking fields. An AI matching algorithm, implemented in TypeScript, provides weighted scoring for volunteer-opportunity and volunteer-organization matches based on Skills, Location, SDG, and Interests, with robust data normalization. Multi-tenant security enforces strict data scoping by `organizationId` or `userId` at the database level. Volunteers have strict per-assignee scoping, seeing only data they directly contributed to (activities, assigned tasks, project impacts from accepted assignments). The application-to-assignment workflow automatically creates project assignments upon application acceptance. Applied opportunities are filtered from the "New Opportunities" list. Backend-computed metrics provide real KPI data for organization dashboards, including `projectHours`, `monthlyImpactData`, `impactGrowthSeries`, `impactBySDG`, `recentActivities`, and `totalPeopleImpacted`. Data consistency is maintained across all views, from opportunity details to hours breakdowns and time series utilities. Key features include email-based profile linking, a full messaging system, automatic project completion tracking, real-time volunteer list updates, and server-side enrichment of dashboard tasks. A comprehensive notification system creates real-time notifications for various event types.

### Feature Specifications
The platform includes a rebranded landing page with an interactive SDG wheel. The dashboard offers role-based views with real-time KPIs, interactive cards, Impact Over Time and SDG Distribution visualizations, and AI-matched opportunities. A "Volunteer Insights" dashboard section provides comprehensive volunteer data. SDG mapping visualizes project alignment. Other features include mobile data collection, a full-featured calendar, interactive impact visualization, AI-powered impact storytelling, and core management pages with full CRUD capabilities for Projects, Tasks, Volunteers, Organizations, Calendar, Opportunities, and Applications. A robust volunteer opportunities system supports posting, discovery, and application tracking. The system supports dual user types (Volunteer/Organization) with distinct flows. Project-task hierarchy is supported with AI-powered volunteer recommendations for task assignments. Comprehensive profile settings with photo upload are available. Multi-step intake forms are provided for onboarding and opportunity posting. Assignment tracking allows volunteers to view enriched assignment details including team members and recent activities. Organizations have a dedicated Volunteers tab displaying aggregated volunteer statistics from accepted project assignments.

### System Design Choices
Authentication is managed via Firebase Auth with Google OAuth. Client-server communication utilizes RESTful APIs, WebSockets for real-time updates, and React Query. Data processing involves client-side collection, Zod validation, Drizzle ORM for PostgreSQL, server-side aggregation, and client-side visualization. The frontend is deployed with Vite, the backend with Node.js and compiled TypeScript, and the production database uses Neon.

## External Dependencies

-   **Authentication & User Management**: Firebase Auth, Firebase Firestore, Firebase Storage
-   **Database & Infrastructure**: Neon Database, Drizzle Kit
-   **UI & Visualization**: Radix UI, Chart.js, Tailwind CSS
-   **Development & Build Tools**: TypeScript, Vite, ESBuild
-   **Matching Algorithm**: Python and TypeScript implementation