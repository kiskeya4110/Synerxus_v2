# Synerxus - Connect. Collaborate. Impact Globally.

## Overview
Synerxus is an AI-powered platform designed to connect global volunteers with opportunities and empower organizations to track, measure, and visualize their impact. It links activities to humanitarian outcomes and Sustainable Development Goals (SDGs), aiming for "Intelligent connections for sustainable development worldwide." The platform provides data-driven insights for impact assessment, storytelling, and enhancing global collaboration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a mobile-optimized, role-based dashboard utilizing UN SDG-themed color schemes, `shadcn/ui` components built on `Radix UI`, and a light theme with vibrant accents. It maintains consistent typography, an infinity loop logo, and interactive elements. Dashboards dynamically differentiate between volunteer and organization views. Opportunity displays consistently use a 2-column layout for AI analysis and SDG alignment. All section titles are center-justified.

### Technical Implementations
The frontend uses React 18, TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS, Chart.js, React Hook Form, and date-fns. The backend is Node.js with TypeScript, Express.js for REST APIs, WebSockets, and Drizzle ORM with Neon serverless PostgreSQL. The database schema includes AI tracking fields and skill proficiency. An AI matching algorithm uses weighted scoring for volunteer-opportunity and volunteer-organization matches based on Skills, Location, SDG, Interests, and Availability. Multi-tenant security enforces data scoping. Key features include email-based profile linking, a full messaging system, automatic project completion tracking, real-time volunteer list updates, and a comprehensive notification system. An AI tips service generates personalized recommendations. The system includes personalized weekly email digests for volunteers and organizations, detailing contributions, impact scores, and AI-generated insights, with role-based attribution and impact deduplication awareness.

### Feature Specifications
The platform includes a rebranded landing page with an interactive SDG wheel, a role-based dashboard with real-time KPIs and AI-matched opportunities, and a "Volunteer Insights" section. Features encompass mobile data collection with impact deduplication, a calendar, interactive impact visualization, AI-powered impact storytelling, and CRUD capabilities for various entities (Projects, Tasks, Volunteers, Organizations, Calendar, Opportunities, Applications). It supports dual user types with distinct flows, project-task hierarchy with AI-powered volunteer recommendations, comprehensive profile settings, multi-step intake forms, and assignment tracking. A unified "My Work" page consolidates Applications, Assignments, and Tasks. The system also provides a live and interactive impact narrative on dashboards, comprehensive print CSS for preventing page breaks in generated reports, and enhanced PDF export functionality for dashboards and reports.

### System Design Choices
Authentication is managed via Firebase Auth with Google OAuth. Client-server communication uses RESTful APIs, WebSockets, and React Query. Data processing involves client-side collection, Zod validation, Drizzle ORM for PostgreSQL, server-side aggregation, and client-side visualization. The frontend is deployed with Vite, the backend with Node.js and compiled TypeScript, and the production database uses Neon.

## External Dependencies

-   **Authentication & User Management**: Firebase Auth, Firebase Firestore, Firebase Storage
-   **Database & Infrastructure**: Neon Database, Drizzle Kit
-   **UI & Visualization**: Radix UI, Chart.js, Tailwind CSS
-   **Development & Build Tools**: TypeScript, Vite, ESBuild
-   **Matching Algorithm**: Python and TypeScript implementation
-   **Email Service**: Mock transporter (configurable for SendGrid, Mailgun, nodemailer in production)

## Recent Changes (Nov 23-24, 2025)

### KPI Tracking Fixes for Volunteer Impact Report (Critical)
- **Problem**: KPI calculations used arbitrary targets (10 tasks, 3 projects, 5 skills) that didn't align with individual volunteer situations
  - Example: 80% skills development showed "At Risk" even though 80% is excellent performance
  - Tasks showing 10% achieved = "Behind" when volunteer may have only 1 assigned task
- **Solution**: Redesigned KPI metrics to be relative to each volunteer's actual situation
  - **Task Completion**: Calculated as (completed/total) percentage, not vs arbitrary target
    - Status: 80%+ = Excellent, 60%+ = Good, 40%+ = Fair, <40% = Low
  - **Project Engagement**: Calculated as (active/total) percentage, same thresholds
  - **Skills & Expertise**: Actual count with reasonable expectations (5+ = Excellent, 3+ = Good, 2+ = Fair, <2 = Low)
  - **Hours Commitment**: Monthly average vs 20h/month target (20+ = Exceeding, 15+ = On Track, 10+ = Moderate, <10 = Low)
- **Table Redesign**: Changed from "Target vs Actuals" to "Performance Metrics" with clearer details column
- **Impact**: KPI statuses now accurately reflect volunteer performance and provide meaningful feedback

### Removed KPI Tracking from Organization Impact Report
- **Issue**: Organization report was incorrectly using volunteer-specific KPI metrics with inconsistent weights
- **Solution**: Removed entire KPI Tracking section from organization impact report (Operations tab)
- **Rationale**: Organizations have different metrics (team size, hours, projects, beneficiaries) - volunteer KPIs don't apply
- **Impact**: Organization reports now focus on appropriate organizational metrics only

### Single-Page Global Impact Report Optimization (Layout)
- **Split Header Layout**: Organization name and mission on left (2/3 width), key info box on right (1/3 width)
  - Compact header reduces vertical space while maintaining professionalism
  - Key metrics box shows: Active Members, Total Hours, Impact Score
- **Optimized Page Layout**: Overview and Programs sections combined to fit on single page (Page 1)
  - Overview: Compact 2x2 KPI grid + Streamlined impact leader card + Single quarterly growth chart
  - Programs: Top 3 programs with completion/impact progress bars
- **Smart Page Breaks**: Operations (Page 2), Financial (Page 3), Impact (Page 4)
  - Uses `print:page-break-before` to force breaks at section boundaries
  - `print:page-break-inside-avoid` prevents charts/cards from splitting across pages
- **Typography Optimization**: Reduced font sizes and padding for PDF/print output efficiency
- **Impact**: Reports now fit on standard page widths and maintain good readability when printed/exported to PDF

## Recent Changes (Nov 23, 2025)

### Volunteers Tab 404 Error - FIXED
- **Issue**: Organization users clicking "Volunteers" tab received 404 error
- **Root Cause**: Endpoint `/api/organizations/:id/volunteers` checked for `user.organizationId`, but organization users don't have this field since they ARE the organization
- **Solution**: Updated endpoint to use authenticated user's own ID as organizationId when no organizationId field exists for organization users
- **Impact**: Organization managers can now view their list of accepted volunteers with complete activity stats, project assignments, and skills

### Programs Tab: Real Projects with Actual Status & Completion (Critical)
- **Replaced Hardcoded Data with Live Projects**: The Programs tab now displays actual organization projects instead of mock data
  - Shows real project names, statuses (Active, In Progress, Completed), and completion percentages
  - Completion percentages tied directly to project `completionPercentage` field - consistent with dashboard display
  - Each project card displays: Project Name, Status badge, Completion %, Impact Score, and Beneficiaries
  - If no projects exist, shows friendly "No active projects found" message
  - Programs filtered to show only active/in-progress/completed projects (max 4 displayed)
- **Impact Score Calculation**: Combines project completion (60%) + volunteer engagement (40%)
  - Beneficiaries calculated from actual impact metrics or extrapolated from volunteer hours
  - All metrics now pull from real organization data, eliminating inconsistency with dashboard metrics

### Organization Impact Score Calculation Fix (Critical)
- **65% Weighting Applied**: Fixed organization impact score to correctly weight hours and people impacted as primary drivers (65% combined)
  - **Previous formula**: Hours 40%, Tasks 30%, SDG 20%, Match 10% (missing people impacted entirely!)
  - **New formula**: Hours 35% + People 30% + Tasks 20% + SDG 10% + Match 5% = 100%
  - **People Impacted NOW Included**: Organizations now calculate `totalPeopleImpacted` using `calculatePeopleImpacted()` helper from impacts table
  - **Both Summary & Monthly Calculations**: Updated both the main impact score calculation and `calculateOrganizationImpactScore()` function for monthly trends
  - **Consistent Across All Metrics**: Both volunteers and organizations now use the same 65% hours+people weighting formula
  - **Impact**: Organization dashboards show accurate impact scores reflecting people impacted as a major component

### Organization Dashboard Global Impact Report Navigation
- **New "Global Report" Button**: Added dedicated button in Row 2, Col 2 of dashboard controls for organization users
  - Button only appears for organization managers, not volunteers
  - Clicking navigates directly to `/organization-impact-report` page
  - Uses FileText icon with responsive text ("Global Report" desktop, "Report" mobile)
  - Data-testid: `button-view-global-report`
  - Implementation: Wouter's `useLocation` hook for smooth client-side navigation

### Dashboard Impact Narrative Live & Interactive Update
- **Live Time-Filter Responsive**: The "Your Impact Over Time" narrative updates instantly when time filter changes (This Month, This Quarter, This Year, All Time)
- **Accurate Data Counting**: Fixed narrative calculation to properly aggregate hours and people impacted from filtered monthly data
- **Role-Based Narratives**: 
  - Volunteers: Focuses on personal engagement, commitment level, and individual impact metrics
  - Organizations: Focuses on volunteer base momentum, recruitment insights, and collective impact
- **Better Trend Detection**: Uses midpoint split for more accurate increasing/decreasing/stable patterns
- **Enhanced Messaging**: Emoji indicators and contextual insights (e.g., "📈 Your engagement is accelerating!")
- **Dependency Fix**: Added `timeFilter` and `dashboardType` to useMemo dependencies for reactivity
