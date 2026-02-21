# Synerxus - Connect. Manage. Impact Globally.

## Overview
Synerxus is an AI-powered platform that connects global volunteers with opportunities and empowers organizations to track, measure, and visualize their impact. It links activities to humanitarian outcomes and Sustainable Development Goals (SDGs), providing data-driven insights for impact assessment, storytelling, and enhanced global collaboration. The platform's vision is "Intelligent connections for sustainable development worldwide," aiming to drive sustainable development through intelligent connections and an outcome-first approach for CSRD-compliant corporate ESG reporting.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a mobile-optimized, role-based dashboard utilizing UN SDG-themed color schemes, `shadcn/ui` components built on `Radix UI`, and a light theme with vibrant accents. Consistent typography, an infinity loop logo, and interactive elements are employed. Dashboards dynamically adjust for volunteer and organization views. Opportunity displays consistently use a 2-column layout for AI analysis and SDG alignment. A dedicated organization dashboard uses a dark green theme. Mobile PWA project and opportunity detail views feature hero images, match score badges, two-column layouts with SDG circles, "Why this is a good match" sections, expected tasks, time commitment, and apply buttons with teal-to-blue gradient headers and emerald-to-blue action buttons.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS, Chart.js, React Hook Form, and date-fns, supporting PWA for mobile. The backend uses Node.js with TypeScript, Express.js for REST APIs, WebSockets, and Drizzle ORM with Neon serverless PostgreSQL. The database schema includes AI tracking fields and skill proficiency. An AI matching algorithm uses a 4-factor weighted scoring system (Skills 35%, Trust 30%, Availability 25%, Mission 10%) for volunteer-opportunity and volunteer-organization matches, incorporating an engagement boost and SDG primary priority multiplier. Multi-tenant security enforces data scoping. Key features include email-based profile linking, a full messaging system, automatic project completion tracking, real-time volunteer list updates, a comprehensive notification system, an AI tips service, personalized weekly email digests, and a comprehensive user data validation system with audit logging. Offline mode for activity logging is supported via IndexedDB and service workers for mobile PWA.

### Feature Specifications
The platform includes a rebranded landing page with an interactive SDG wheel, a role-based dashboard with real-time KPIs and AI-matched opportunities, and a "Volunteer Insights" section. It supports mobile data collection with impact deduplication, a calendar, interactive impact visualization, AI-powered impact storytelling, and CRUD operations for Projects, Tasks, Volunteers, Organizations, Calendar, Opportunities, and Applications. It supports dual user types with distinct flows, project-task hierarchy with AI-powered volunteer recommendations, comprehensive profile settings, multi-step intake forms, and assignment tracking. A unified "My Work" page consolidates Applications, Assignments, and Tasks. The system provides a live and interactive impact narrative on dashboards, comprehensive print CSS for generated reports, and enhanced PDF export functionality. An organization dashboard aggregates key metrics, SDG distribution, project locations, alerts, impact over time, and AI-generated insights. A "Volunteer Spotlight" feature showcases featured volunteers on the landing page. Project and opportunity detail pages for PWA provide optimized views with hero images, match score badges, two-column description layouts with SDG indicators, "Why this is a good match" sections, task counts, time commitments, locations, and CTA buttons. The platform prioritizes verified outcomes over hours tracking, with activity logging focused on outcomes, not hours. Note: AIU (Attributable Impact Units) tracking is reserved for the full platform and is NOT included in this pilot.

### System Design Choices
Authentication is managed via Firebase Auth with Google OAuth. Client-server communication uses RESTful APIs, WebSockets, and React Query. Data processing involves client-side collection, Zod validation, Drizzle ORM for PostgreSQL, server-side aggregation, and client-side visualization. The frontend is deployed with Vite, the backend with Node.js and compiled TypeScript, and the production database uses Neon. PWA implementation includes a web app manifest, a service worker for offline support with network-first caching, and meta tags for iOS/Android mobile web app support. Performance optimizations include O(1) lookup maps to replace O(n) array lookups for data aggregation, reducing algorithm complexity and improving dashboard load times.

## External Dependencies

-   **Authentication & User Management**: Firebase Auth, Firebase Firestore, Firebase Storage
-   **Database & Infrastructure**: Neon Database, Drizzle Kit
-   **UI & Visualization**: Radix UI, Chart.js, Tailwind CSS
-   **Development & Build Tools**: TypeScript, Vite, ESBuild
-   **Matching Algorithm**: Python and TypeScript implementation
-   **Email Service**: Mock transporter (configurable for SendGrid, Mailgun, nodemailer)
-   **Location Services**: Google Maps API (for geolocation-based opportunity matching)
-   **Integration Platforms**: Zapier (CRM connectors - Salesforce, HubSpot)
-   **SMS Verification**: Twilio (for SMS verification fallback)