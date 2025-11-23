# Synerxus - Connect. Collaborate. Impact Globally.

## Overview
Synerxus is an AI-powered platform connecting global volunteers with opportunities and enabling organizations to track, measure, and visualize their impact, linking activities to humanitarian outcomes and Sustainable Development Goals (SDGs). Its core vision is "Intelligent connections for sustainable development worldwide," providing data-driven insights for impact assessment and storytelling.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a mobile-optimized, role-based dashboard with UN SDG-themed color schemes, `shadcn/ui` components built on `Radix UI`, and a light theme with vibrant accents. It includes consistent typography, an infinity loop logo, and interactive elements like clickable profile sections and hover states. Dashboards dynamically differentiate volunteer-specific from organization-wide views. Opportunity displays consistently use a 2-column layout for AI analysis and SDG alignment. All section titles are center-justified throughout the application.

### Technical Implementations
The frontend uses React 18, TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS, Chart.js, React Hook Form, and date-fns. The backend is Node.js with TypeScript, Express.js for REST APIs, WebSockets, and Drizzle ORM with Neon serverless PostgreSQL. The database schema includes AI tracking fields and skill proficiency. An AI matching algorithm provides weighted scoring for volunteer-opportunity and volunteer-organization matches based on Skills (with proficiency weighting), Location, SDG, Interests, and Availability. Multi-tenant security enforces data scoping by `organizationId` or `userId`. Key features include email-based profile linking, a full messaging system, automatic project completion tracking, real-time volunteer list updates, and a comprehensive notification system. An AI tips service generates personalized recommendations.

### Feature Specifications
The platform includes a rebranded landing page with an interactive SDG wheel, a role-based dashboard with real-time KPIs and AI-matched opportunities, and a "Volunteer Insights" section. Features also encompass mobile data collection with impact deduplication, a calendar, interactive impact visualization, AI-powered impact storytelling, and CRUD capabilities for Projects, Tasks, Volunteers, Organizations, Calendar, Opportunities, and Applications. It supports dual user types (Volunteer/Organization) with distinct flows, project-task hierarchy with AI-powered volunteer recommendations, comprehensive profile settings, multi-step intake forms, and assignment tracking. A unified "My Work" page consolidates Applications, Assignments, and Tasks.

**NEW - Personalized Email Digests**: Weekly impact summaries sent to volunteers and organizations with:
- Volunteer digests: Hours contributed, tasks completed, measured impacts, impact score, weekly streak tracking, SDG alignment
- Organization digests: Active volunteers, total hours, verified impacts, AI-generated insights
- Role-based attribution: Lead (100%), Support (50%), Observer (0%)
- Deduplication awareness: Only counts verified, non-duplicated impacts
- Manual preview: "Send Now" buttons to test digests anytime
- Scheduled delivery: Automatic weekly sends (Sundays at 9 AM)

### System Design Choices
Authentication is managed via Firebase Auth with Google OAuth. Client-server communication uses RESTful APIs, WebSockets, and React Query. Data processing involves client-side collection, Zod validation, Drizzle ORM for PostgreSQL, server-side aggregation, and client-side visualization. The frontend is deployed with Vite, the backend with Node.js and compiled TypeScript, and the production database uses Neon.

## Recent Changes (Nov 23, 2025)

### Radar Chart Label Duplication Fix
- **Removed custom multiline label plugin**: Was causing duplicate labels by rendering custom labels on top of Chart.js default labels
- **Optimized label configuration**: Replaced with native Chart.js pointLabels configuration
  - Font size: 11px, bold weight for better readability
  - Padding: 8px for optimal spacing
  - Color: #1f2937 for consistency
  - Single-line labels for clarity (removed newline characters)
- **Fixed both radar chart instances**: Updated single-view radar chart to use same optimized radarChartOptions
- **Result**: Clean, non-duplicated labels with improved UX

### Fixed Impact Report 404 Error on Load
- **Root cause**: volunteerId was not being properly extracted from URL when navigating without a userId parameter
- **Solution**: Enhanced impact report to fetch current logged-in user first, then use that as fallback if no volunteerId is provided
- **Added proper user resolution**: loggedInUser query now provides fallback value for volunteerId when not specified in URL

### Dashboard PDF Export & Mobile Optimization
- **Fixed React Hooks Order Error**: Moved `useToast()` call to top-level hooks section to comply with React Hooks rules (eliminated "Rendered more hooks than during previous render" error)
- **Added Dashboard PDF Download**: Implemented PDF export functionality on Dashboard with responsive button:
  - Full text "Download PDF" on desktop
  - Abbreviated "PDF" on mobile
  - Uses html2pdf library for clean PDF generation with proper margins and scaling
- **Optimized Impact Report Layout for Mobile/Desktop**:
  - Header section: Changed to flex-col on mobile, flex-row on desktop for better space utilization
  - Tab navigation: Changed to 2-column grid on mobile, 4-column on desktop
  - Card padding: Responsive p-4 md:p-6 lg:p-8 for better mobile readability
  - Button labels: Responsive text that shows full labels on desktop, abbreviated on mobile
  - Typography: Responsive text sizing (text-2xl md:text-3xl lg:text-4xl) for proper scaling
  - Spacing: Adjusted gaps and margins to be tighter on mobile (gap-2 md:gap-3 lg:gap-4)

### PDF Export & Organization Impact Report Enhancements
- **Enhanced KPI Buttons**: Added detailed sub-metrics to Team Members, Total Hours Logged, Projects Managed, and Avg Hours per Volunteer buttons matching Impact Leader format
  - Team Members: Shows volunteer/manager breakdown, avg hours per volunteer
  - Total Hours: Shows activity count, avg hours per activity, peak period
  - Projects: Shows active/completed breakdown, average completion percentage
  - Avg Hours: Shows total volunteers, total hours, top volunteer hours
- **Organization Logo & Mission Statement**: Added organization logo display and mission statement to impact report header for better identification
- **Print-Friendly CSS**: Implemented comprehensive print styles preventing page breaks within KPI grids and chart sections for clean PDF export:
  - Added `page-break-inside: avoid` to all KPI and chart containers
  - Ensured grid layouts maintain their structure in PDFs
  - Prevented orphaned charts from splitting across pages
- **Fixed CSS Syntax Errors**: Corrected print media query CSS by properly encapsulating all properties within selector blocks
- **Improved 404 Error Page**: Enhanced NotFound component with better responsive styling, dark mode support, and appropriate mobile/desktop sizing

## Recent Changes (Nov 22, 2025)

### Impact Score Calculation Bug Fixes
- **Fixed monthly impact trend calculation**: Changed from using `i.createdAt` to `i.date` for filtering impacts by month (line 986 in dashboard-service.ts) - this aligned monthly score calculations with the monthlyImpactData calculations
- **Result**: September's monthly impact score now correctly shows 51 (previously 21), properly reflecting 580 people impacted across the month
- **Added debug logging**: Console logging for people impacted calculations to track metric identification and monthly score breakdowns

### Volunteer Profile Settings Form Fix
- **Fixed form becoming blank after save**: Issue was incomplete form.reset() calls missing required schema fields (professionalTitle, linkedinProfile, languages, matchingPriorities)
- **Applied fix to three locations**: Form defaultValues, initial load effect, and mutation onSuccess handler in volunteer-profile-settings.tsx
- **Result**: Form now persists all fields correctly after save and across sessions

### Impact Deduplication System
- Added deduplication fields to projectImpacts table: `outcomeType` (individual/shared/system), `role` (lead/support/observer), `verificationStatus` (pending/approved/rejected), `evidenceUrls` (array), `dedupGroupId`, `isDuplicated`
- Implemented backend deduplication logic: `detectDuplicateImpact()` checks for duplicates within ±6 hour window for same project and outcome type
- Applied role-based attribution weighting: 100% for Lead, 50% for Support, 0% for Observer
- Updated Mobile Data Collection form to capture outcome type, role, and evidence URLs

### Center-Justified Section Titles
- All section titles across Mobile Data Collection, Impact Reports, Organization Reports, and Profile Settings are now center-justified using `text-center` and `justify-center` classes

### Personalized Email Digests Feature
- Enhanced email-digest-service.ts with comprehensive impact summary generation
- Added `getWeeklyDigestData()` function to calculate personalized metrics including weekly streak tracking
- Extended email templates with:
  - Individual volunteer digest showing hours, tasks, impact metrics with role-based attribution, impact score, SDG alignment, weekly streak badge
  - Organization digest showing active volunteers, total hours, impacts recorded, AI-generated weekly insights
- Implemented new frontend page `/email-digests` with tabbed interface for volunteers and organization managers
- Added sidebar navigation link "Email Digests" with Mail icon for both volunteer and organization roles
- Backend endpoints: 
  - `POST /api/email-digest/send` - Send test digest to current user
  - `POST /api/email-digest/send-all` - Admin action to send all volunteer digests
  - `POST /api/email-digest/organization/:organizationId` - Send organization summary
- Frontend features: Manual "Send Now" buttons, feature descriptions, digest timing info, test IDs for all interactive elements

## External Dependencies

-   **Authentication & User Management**: Firebase Auth, Firebase Firestore, Firebase Storage
-   **Database & Infrastructure**: Neon Database, Drizzle Kit
-   **UI & Visualization**: Radix UI, Chart.js, Tailwind CSS
-   **Development & Build Tools**: TypeScript, Vite, ESBuild
-   **Matching Algorithm**: Python and TypeScript implementation
-   **Email Service**: Mock transporter (configurable for SendGrid, Mailgun, nodemailer in production)
