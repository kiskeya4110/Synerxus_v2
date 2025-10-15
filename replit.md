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