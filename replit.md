# ImpactTrack - Volunteer Impact Tracking Platform

## Overview

ImpactTrack is a comprehensive volunteer impact tracking platform designed to help organizations measure, visualize, and communicate the outcomes of their volunteer initiatives. The platform connects volunteer activities to broader humanitarian outcomes and Sustainable Development Goals (SDGs), providing data-driven insights for impact assessment and storytelling.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Charts**: Chart.js for data visualization
- **Form Management**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Real-time**: WebSocket server for live updates
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon serverless PostgreSQL
- **Session Management**: PostgreSQL session store
- **Build Process**: esbuild for production bundling

### Database Schema Design
The system uses a relational database structure with the following core entities:
- **Users**: Volunteer profiles with skills, availability, and credentials
- **Organizations**: Non-profit organizations managing projects
- **Projects**: Individual initiatives linked to SDG goals
- **Tasks**: Granular work items within projects
- **Volunteer Activities**: Time tracking and contribution logging
- **Impact Metrics**: Quantifiable outcome measurements
- **Project Impacts**: Linking projects to measurable results

## Routing Structure

### Public Routes (No Authentication Required)
- **`/`** - Landing page showcasing platform features and capabilities
- **`/login`** - User authentication (sign in/register)
- **`/sdg-mapping`** - SDG mapping interface (accessible as demo)
- **`/impact-visualization`** - Impact visualization tools (accessible as demo)
- **`/mobile-data-collection`** - Mobile data collection forms (accessible as demo)
- **`/impact-storytelling`** - AI storytelling features (accessible as demo)
- **`/field-specific-metrics`** - Field metrics tracking (accessible as demo)

### Protected Routes (Authentication Required)
- **`/dashboard`** - Main dashboard (redirects to `/login` if not authenticated)

## Key Components

### Landing Page
- Hero section with platform value proposition
- Feature showcase with 6 interactive cards
- Benefits section highlighting key capabilities
- Call-to-action buttons for signup and demo exploration
- Fully accessible without authentication

### Dashboard System
- Real-time statistics and KPI tracking
- Interactive charts for volunteer hours and impact metrics
- Project progress monitoring with visual indicators
- Task management interface
- Activity feed for recent updates
- Quick action shortcuts for common operations

### SDG Mapping Interface
- Visual representation of UN Sustainable Development Goals
- Project-to-SDG alignment tracking
- Progress monitoring against SDG targets
- Impact visualization by SDG category

### Mobile Data Collection
- Tabbed interface for "Log Activity" and "Record Impact"
- Offline-capable data entry forms
- Activity logging with location tracking
- Impact metric recording
- Photo and media upload capabilities
- Synchronization when connectivity is restored
- Online/offline mode toggle for field work

### Impact Visualization
- Before/after comparison tools with image sliders
- Interactive charts and graphs
- Customizable metric dashboards
- Export capabilities for reports

### Impact Storytelling
- AI-powered narrative generation from raw data
- Audience-specific content adaptation
- Template-based story creation
- Social media sharing capabilities

### Field-Specific Metrics
- Customizable metric categories by domain
- Healthcare, education, environment, and community-specific KPIs
- Flexible metric definition and tracking
- Domain expertise integration

## Data Flow

### Client-Server Communication
1. **Authentication**: Firebase Auth integration for user management
2. **API Layer**: RESTful endpoints with JSON payload exchange
3. **Real-time Updates**: WebSocket connections for live data synchronization
4. **State Management**: React Query handles caching, synchronization, and optimistic updates

### Data Processing Pipeline
1. **Data Collection**: Mobile and web forms capture volunteer activities
2. **Validation**: Zod schemas ensure data integrity at both client and server
3. **Storage**: Drizzle ORM manages PostgreSQL operations with type safety
4. **Aggregation**: Server-side processing calculates impact metrics
5. **Visualization**: Client-side charting libraries render processed data

## External Dependencies

### Authentication & User Management
- **Firebase Auth**: User authentication with Google OAuth integration
- **Firebase Firestore**: Additional user data storage
- **Firebase Storage**: File and media uploads

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle Kit**: Database migration and schema management

### UI & Visualization
- **Radix UI**: Accessible component primitives
- **Chart.js**: Interactive data visualization
- **Tailwind CSS**: Utility-first styling framework

### Development & Build Tools
- **TypeScript**: Type safety across the entire stack
- **Vite**: Fast development server and build tool
- **ESBuild**: Production bundling for server code

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with HMR for frontend
- **Backend**: tsx for TypeScript execution in development
- **Database**: Local or cloud PostgreSQL instance
- **Environment Variables**: Separate configurations for development/production

### Production Deployment
- **Frontend**: Static build deployed via Vite build process
- **Backend**: Node.js server with compiled TypeScript
- **Database**: Neon serverless PostgreSQL in production
- **Static Assets**: Served directly by Express in production

### Build Process
1. **Frontend Build**: `vite build` generates optimized static assets
2. **Backend Build**: `esbuild` compiles TypeScript server code
3. **Database Migration**: `drizzle-kit push` applies schema changes
4. **Production Start**: Compiled server serves both API and static files

## Changelog

### October 14, 2025
- **Mobile Optimization**: Comprehensive mobile app optimization completed and verified
  - **Touch Targets**: All interactive elements (buttons, tabs, toggles) have minimum 44px height via `min-h-[44px]` class applied directly to components
  - **Responsive Layouts**: 
    - Mobile (<768px): Flex column layouts for vertical stacking
    - Medium (768px+): Grid 2-column layouts where appropriate
    - Large (1024px+): Grid 3-column layouts for desktop
  - **Typography**: Responsive text sizing with `text-xs sm:text-sm` patterns throughout
  - **Card Heights**: Outcome and metric cards have `min-h-[200px]` for adequate touch area
  - **Component Fixes**: 
    - Fixed Tabs structure in field-specific-metrics (TabsContent now properly within Tabs wrapper)
    - Changed outcome cards from grid to flex-col on mobile for guaranteed vertical stacking
    - Applied min-h-[44px] directly to all TabsTrigger components for consistent touch targets
  - **Testing**: Verified on 375x667 viewport (iPhone SE) with playwright tests - all touch targets confirmed ≥44px

### October 12, 2025
- **Added Landing Page**: Created new public landing page at `/` with feature showcase
- **Updated Routing**: Moved dashboard from `/` to `/dashboard` (now requires authentication)
- **Public Demo Access**: Made all feature pages accessible without login for demo purposes
- **Fixed Mobile Data Collection**: Resolved React Tabs component structure issue where TabsContent was used outside Tabs wrapper
- **Updated Navigation**: Modified sidebar navigation and login redirects to use new `/dashboard` route

### July 02, 2025
- Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.