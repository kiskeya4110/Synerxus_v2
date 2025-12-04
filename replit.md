# Synerxus - Connect. Manage. Impact Globally.

## Overview
Synerxus is an AI-powered platform designed to connect global volunteers with opportunities and empower organizations to track, measure, and visualize their impact. It links activities to humanitarian outcomes and Sustainable Development Goals (SDGs), providing data-driven insights for impact assessment, storytelling, and enhancing global collaboration. Its core purpose is "Intelligent connections for sustainable development worldwide," aiming to drive sustainable development through intelligent connections.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a mobile-optimized, role-based dashboard with UN SDG-themed color schemes, `shadcn/ui` components built on `Radix UI`, and a light theme with vibrant accents. It ensures consistent typography, an infinity loop logo, and interactive elements. Dashboards dynamically adjust for volunteer and organization views. Opportunity displays consistently use a 2-column layout for AI analysis and SDG alignment, with all section titles center-justified. A new dedicated organization dashboard uses a dark green theme for branding.

### Technical Implementations
The frontend uses React 18, TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS, Chart.js, React Hook Form, and date-fns with PWA (Progressive Web App) support for mobile. The backend is Node.js with TypeScript, Express.js for REST APIs, WebSockets, and Drizzle ORM with Neon serverless PostgreSQL. The database schema includes AI tracking fields and skill proficiency. An AI matching algorithm uses weighted scoring for volunteer-opportunity and volunteer-organization matches based on Skills, Location, SDG, Interests, and Availability, with an engagement boost and SDG primary priority multiplier. Multi-tenant security enforces data scoping. Key features include email-based profile linking, a full messaging system with conversation threading, automatic project completion tracking, real-time volunteer list updates, a comprehensive notification system, an AI tips service, and personalized weekly email digests. A comprehensive user data validation system with audit logging ensures profile integrity.

### Feature Specifications
The platform includes a rebranded landing page with an interactive SDG wheel, a role-based dashboard with real-time KPIs and AI-matched opportunities, and a "Volunteer Insights" section. It supports mobile data collection with impact deduplication, a calendar, interactive impact visualization, AI-powered impact storytelling, and CRUD operations for various entities (Projects, Tasks, Volunteers, Organizations, Calendar, Opportunities, Applications). It supports dual user types with distinct flows, project-task hierarchy with AI-powered volunteer recommendations, comprehensive profile settings, multi-step intake forms, and assignment tracking. A unified "My Work" page consolidates Applications, Assignments, and Tasks. The system provides a live and interactive impact narrative on dashboards, comprehensive print CSS for generated reports, and enhanced PDF export functionality. An organization dashboard aggregates key metrics, SDG distribution, project locations, alerts, impact over time, and AI-generated insights. A "Volunteer Spotlight" feature showcases featured volunteers on the landing page.

### System Design Choices
Authentication is managed via Firebase Auth with Google OAuth. Client-server communication uses RESTful APIs, WebSockets, and React Query. Data processing involves client-side collection, Zod validation, Drizzle ORM for PostgreSQL, server-side aggregation, and client-side visualization. The frontend is deployed with Vite, the backend with Node.js and compiled TypeScript, and the production database uses Neon. PWA implementation includes a web app manifest, a service worker for offline support with network-first caching, and meta tags for iOS/Android mobile web app support, enabling installation on devices.

## External Dependencies

-   **Authentication & User Management**: Firebase Auth, Firebase Firestore, Firebase Storage
-   **Database & Infrastructure**: Neon Database, Drizzle Kit
-   **UI & Visualization**: Radix UI, Chart.js, Tailwind CSS
-   **Development & Build Tools**: TypeScript, Vite, ESBuild
-   **Matching Algorithm**: Python and TypeScript implementation
-   **Email Service**: Mock transporter (configurable for SendGrid, Mailgun, nodemailer in production)
-   **Location Services**: Google Maps API (for geolocation-based opportunity matching)
-   **Integration Platforms**: Zapier (CRM connectors - Salesforce, HubSpot)