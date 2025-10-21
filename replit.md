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
- **Frontend**: React 18 with TypeScript, Vite, Wouter for routing, TanStack Query for server state, Tailwind CSS, Chart.js, React Hook Form with Zod.
- **Backend**: Node.js with TypeScript, Express.js for REST API, WebSocket for real-time updates, Drizzle ORM with Neon serverless PostgreSQL, esbuild for production bundling.
- **Database Schema**: Relational design covering Users, Organizations, Projects, Tasks, Volunteer Activities, Impact Metrics, Project Impacts, Opportunities, Applications, and Matchmaking data. Volunteer and MatchableOrganization tables include unique email fields for user account linking.
- **AI Matching Algorithm**: Python-based system with Node.js integration for weighted scoring of volunteer-organization matches based on skills (35%), location (25%), interests (20%), and SDG alignment (20%). Configurable match threshold (default 40.0) with automatic match record creation.
- **Profile Management**: Email-based profile linking with useEffect pattern for proper form initialization, handling race conditions between user authentication and form rendering.

### Feature Specifications
- **Landing Page**: Publicly accessible, showcasing features and calls to action.
- **Dashboard**: Role-based views (Volunteer and Organization) displaying KPIs, interactive charts, and project progress.
- **SDG Mapping**: Visual representation and tracking of project alignment with UN SDGs.
- **Mobile Data Collection**: Tabbed interface for activity logging and impact recording, with offline capabilities.
- **Impact Visualization**: Tools for before/after comparisons, interactive charts, and customizable metric dashboards.
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