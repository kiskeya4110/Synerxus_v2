# Synerxus - Connect. Collaborate. Impact Globally.

## Overview
Synerxus is an AI-powered platform connecting global volunteers with opportunities and enabling organizations to track, measure, and visualize their impact, linking activities to humanitarian outcomes and Sustainable Development Goals (SDGs). Its core vision is "Intelligent connections for sustainable development worldwide," providing data-driven insights for impact assessment and storytelling.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a mobile-optimized, role-based dashboard with UN SDG-themed color schemes, `shadcn/ui` components built on `Radix UI`, and a light theme with vibrant accents. It includes consistent typography, an infinity loop logo, and interactive elements like clickable profile sections and hover states. Dashboards dynamically differentiate volunteer-specific from organization-wide views. Opportunity displays consistently use a 2-column layout for AI analysis and SDG alignment.

### Technical Implementations
The frontend uses React 18, TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS, Chart.js, React Hook Form, and date-fns. The backend is Node.js with TypeScript, Express.js for REST APIs, WebSockets, and Drizzle ORM with Neon serverless PostgreSQL. The database schema includes AI tracking fields and skill proficiency. An AI matching algorithm provides weighted scoring for volunteer-opportunity and volunteer-organization matches based on Skills (with proficiency weighting), Location, SDG, Interests, and Availability. Multi-tenant security enforces data scoping by `organizationId` or `userId`. Key features include email-based profile linking, a full messaging system, automatic project completion tracking, real-time volunteer list updates, and a comprehensive notification system. An AI tips service generates personalized recommendations.

### Feature Specifications
The platform includes a rebranded landing page with an interactive SDG wheel, a role-based dashboard with real-time KPIs and AI-matched opportunities, and a "Volunteer Insights" section. Features also encompass mobile data collection, a calendar, interactive impact visualization, AI-powered impact storytelling, and CRUD capabilities for Projects, Tasks, Volunteers, Organizations, Calendar, Opportunities, and Applications. It supports dual user types (Volunteer/Organization) with distinct flows, project-task hierarchy with AI-powered volunteer recommendations, comprehensive profile settings, multi-step intake forms, and assignment tracking. A unified "My Work" page consolidates Applications, Assignments, and Tasks.

### System Design Choices
Authentication is managed via Firebase Auth with Google OAuth. Client-server communication uses RESTful APIs, WebSockets, and React Query. Data processing involves client-side collection, Zod validation, Drizzle ORM for PostgreSQL, server-side aggregation, and client-side visualization. The frontend is deployed with Vite, the backend with Node.js and compiled TypeScript, and the production database uses Neon.

## External Dependencies

-   **Authentication & User Management**: Firebase Auth, Firebase Firestore, Firebase Storage
-   **Database & Infrastructure**: Neon Database, Drizzle Kit
-   **UI & Visualization**: Radix UI, Chart.js, Tailwind CSS
-   **Development & Build Tools**: TypeScript, Vite, ESBuild
-   **Matching Algorithm**: Python and TypeScript implementation