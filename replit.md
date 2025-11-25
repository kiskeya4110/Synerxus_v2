# Synerxus - Connect. Manage. Impact Globally.

## Overview
Synerxus is an AI-powered platform that connects global volunteers with opportunities and helps organizations track, measure, and visualize their impact. It links activities to humanitarian outcomes and Sustainable Development Goals (SDGs), providing data-driven insights for impact assessment, storytelling, and enhancing global collaboration. Its core purpose is "Intelligent connections for sustainable development worldwide."

## Recent Changes (November 25, 2025)
- **Data Persistence Fix (Volunteers & Organizations)**: Fixed both volunteer and organization intake/settings forms to properly hydrate persisted data. Forms now use `form.reset()` in useEffect to populate fields when async profile data loads. This ensures saved data displays correctly.
  - Volunteer Intake: Fixed to access `{ user, volunteerProfile }` API response structure
  - Organization Intake: Fixed to reset all form fields when profile loads
  - Organization Settings: Fixed `values` option issue by using `form.reset()` instead
- **Auto-calculate Weekly Availability**: Backend automatically calculates `weeklyAvailability` from availability time slots when not explicitly provided, preventing NULL values. Existing profiles with NULL values were retroactively fixed.
- **Skill Parsing Helper**: Added `parseSkillsFromDb()` function to convert database format ("Skill Name (75%)") to form format `{ name, proficiency }`.

## Recent Changes (November 24, 2025)
- **Volunteer Spotlight Feature**: Added new section on landing page showcasing a featured volunteer each week with their story and impact metrics. Algorithm rotates featured volunteers based on weekly activity. Fetches from `/api/volunteer-spotlight` endpoint.
- **SDG Toggle Fix**: Fixed undefined error in volunteer-intake.tsx when toggling SDG commitments. Added default empty array fallback for sdgGoals field.
- **Banner Animation Refinement**: Fixed scrolling facts banner to use exactly 2 copies of GLOBAL_FACTS array and adjusted animation to 20s duration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a mobile-optimized, role-based dashboard with UN SDG-themed color schemes, `shadcn/ui` components built on `Radix UI`, and a light theme with vibrant accents. It ensures consistent typography, an infinity loop logo, and interactive elements. Dashboards dynamically adjust for volunteer and organization views. Opportunity displays consistently use a 2-column layout for AI analysis and SDG alignment, with all section titles center-justified.

### Technical Implementations
The frontend uses React 18, TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS, Chart.js, React Hook Form, and date-fns with **PWA (Progressive Web App) support for mobile**. The backend is Node.js with TypeScript, Express.js for REST APIs, WebSockets, and Drizzle ORM with Neon serverless PostgreSQL. The database schema includes AI tracking fields and skill proficiency. An AI matching algorithm uses weighted scoring for volunteer-opportunity and volunteer-organization matches based on Skills, Location, SDG, Interests, and Availability. Multi-tenant security enforces data scoping. Key features include email-based profile linking, a full messaging system, automatic project completion tracking, real-time volunteer list updates, a comprehensive notification system, and an AI tips service for personalized recommendations. The system also generates personalized weekly email digests for volunteers and organizations, detailing contributions, impact scores, and AI-generated insights, with role-based attribution and impact deduplication awareness. PWA features enable mobile installation, offline-first capabilities, and service worker caching for enhanced mobile experience.

### Feature Specifications
The platform includes a rebranded landing page with an interactive SDG wheel, a role-based dashboard with real-time KPIs and AI-matched opportunities, and a "Volunteer Insights" section. It supports mobile data collection with impact deduplication, a calendar, interactive impact visualization, AI-powered impact storytelling, and CRUD operations for various entities (Projects, Tasks, Volunteers, Organizations, Calendar, Opportunities, Applications). It supports dual user types with distinct flows, project-task hierarchy with AI-powered volunteer recommendations, comprehensive profile settings, multi-step intake forms, and assignment tracking. A unified "My Work" page consolidates Applications, Assignments, and Tasks. The system provides a live and interactive impact narrative on dashboards, comprehensive print CSS for preventing page breaks in generated reports, and enhanced PDF export functionality for dashboards and reports.

### System Design Choices
Authentication is managed via Firebase Auth with Google OAuth. Client-server communication uses RESTful APIs, WebSockets, and React Query. Data processing involves client-side collection, Zod validation, Drizzle ORM for PostgreSQL, server-side aggregation, and client-side visualization. The frontend is deployed with Vite, the backend with Node.js and compiled TypeScript, and the production database uses Neon. PWA implementation includes:
- **Web App Manifest** (`manifest.json`): Defines app metadata, icons, theme colors, and display modes
- **Service Worker** (`service-worker.js`): Provides offline support with network-first caching strategy
- **Meta Tags**: iOS app capability tags, Android mobile web app support, theme color configuration
- **Installation**: App is installable on iOS (Home Screen) and Android devices (app drawer)

## External Dependencies

-   **Authentication & User Management**: Firebase Auth, Firebase Firestore, Firebase Storage
-   **Database & Infrastructure**: Neon Database, Drizzle Kit
-   **UI & Visualization**: Radix UI, Chart.js, Tailwind CSS
-   **Development & Build Tools**: TypeScript, Vite, ESBuild
-   **Matching Algorithm**: Python and TypeScript implementation
-   **Email Service**: Mock transporter (configurable for SendGrid, Mailgun, nodemailer in production)