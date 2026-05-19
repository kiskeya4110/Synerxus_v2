import { Route, Router, Switch, Redirect } from "wouter";
import { useEffect, lazy, Suspense } from "react";

// ============================================================================
// SYNERXUS MVP - CLAIM-LEVEL EVIDENCE INFRASTRUCTURE
// ============================================================================
// Core Loop: VOLUNTEER MATCHED → LOGS IMPACT → NGO VERIFIES → CORPORATE SEES SDG DATA
// Every feature must answer YES to: "Does this strengthen claim-to-evidence traceability?"
// ============================================================================

// Core pages - lazy loaded
const Landing = lazy(() => import("@/pages/marketing-home"));
const Platform = lazy(() => import("@/pages/platform"));
const EvidenceLadder = lazy(() => import("@/pages/evidence-ladder"));
const UseCases = lazy(() => import("@/pages/use-cases"));
const ForEsgTeams = lazy(() => import("@/pages/for-esg-teams"));
const Integrations = lazy(() => import("@/pages/integrations"));
const UseCaseGrantFunder = lazy(() => import("@/pages/use-case-grant-funder"));
const Resources = lazy(() => import("@/pages/insights"));
const Assessment = lazy(() => import("@/pages/assessment"));
const Contact = lazy(() => import("@/pages/contact"));
const LoginDemo = lazy(() => import("@/pages/login")); // Legacy demo login for reference
const LoginAuth = lazy(() => import("@/pages/auth/login")); // Real Firebase auth login
const SignupLanding = lazy(() => import("@/pages/auth/signup-landing")); // Role selector for new users
const NotFound = lazy(() => import("@/pages/not-found"));

// Unified Dashboard - Single entry point for all roles
const UnifiedDashboard = lazy(() => import("@/pages/unified-dashboard"));

// Streamlined MVP Signup Forms (single page, collect 4-factor matching data)
const VolunteerIntakeSimple = lazy(() => import("@/pages/volunteer-intake-simple"));
const OrganizationIntakeSimple = lazy(() => import("@/pages/organization-intake-simple"));
const CorporateIntakeSimple = lazy(() => import("@/pages/corporate-intake-simple"));

// ============================================================================
// VOLUNTEER VIEW - Impact Wallet (Mobile-First)
// ============================================================================
const MyWork = lazy(() => import("@/pages/my-work"));
const LogActivity = lazy(() => import("@/pages/log-activity"));

// ============================================================================
// OPPORTUNITIES - Discover & detail views
// ============================================================================
const DiscoverOpportunitiesPWA = lazy(() => import("@/pages/discover-opportunities-pwa"));
const OpportunityDetail = lazy(() => import("@/pages/opportunity-detail"));
const OpportunityDetailPWA = lazy(() => import("@/pages/opportunity-detail-pwa"));
const Opportunities = lazy(() => import("@/pages/opportunities"));

// ============================================================================
// NGO VIEW - Project Pipeline + Verification Queue (Desktop/Tablet)
// ============================================================================
const LogVolunteerHours = lazy(() => import("@/pages/log-volunteer-hours"));
const PostCoreOpportunity = lazy(() => import("@/pages/post-core-opportunity"));
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const ProjectDetailPWA = lazy(() => import("@/pages/project-detail-pwa"));
const ProjectEdit = lazy(() => import("@/pages/project-edit"));

// ============================================================================
// CORPORATE VIEW - ESG Dashboard (Desktop)
// ============================================================================
const CSRReportsExports = lazy(() => import("@/pages/csr-reports-exports"));

// Profile Settings
const VolunteerProfileSettings = lazy(() => import("@/pages/volunteer-profile-settings"));
const OrganizationProfileSettings = lazy(() => import("@/pages/organization-profile-settings"));
const CorporatePartnerProfileSettings = lazy(() => import("@/pages/corporate-partner-profile-settings"));

// Admin pages
const AdminPilotDashboard = lazy(() => import("@/pages/admin-pilot-dashboard"));

// Public directory pages
const Organizations = lazy(() => import("@/pages/organizations"));
const OrganizationsPWA = lazy(() => import("@/pages/organizations-pwa"));

// Legal pages
const Terms = lazy(() => import("@/pages/terms"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Help = lazy(() => import("@/pages/help"));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen pwa-gradient-bg">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
  </div>
);

// ============================================================================
// Main App Component - Light Theme
// ============================================================================
export default function App() {
  // Ensure light mode is applied for proper contrast on light backgrounds
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <Router>
        <Switch>
          {/* Public landing root */}
          <Route path="/" component={Landing} />

          {/* Auth */}
          <Route path="/login" component={LoginAuth} />
          <Route path="/signup" component={SignupLanding} />
          <Route path="/login-demo" component={LoginDemo} />
          <Route path="/landing" component={Landing} />
          <Route path="/platform" component={Platform} />
          <Route path="/evidence-ladder" component={EvidenceLadder} />
          <Route path="/for-esg-teams" component={ForEsgTeams} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/use-cases" component={UseCases} />
          <Route path="/use-cases/grant-funder-reporting" component={UseCaseGrantFunder} />
          <Route path="/resources" component={Resources} />
          <Route path="/assessment" component={Assessment} />
          <Route path="/request-assessment" component={Assessment} />
          <Route path="/contact">{() => <Redirect to="/assessment" />}</Route>
          <Route path="/evidence-objects">{() => <Redirect to="/landing" />}</Route>
          <Route path="/solutions" component={UseCases} />
          <Route path="/how-it-works">{() => <Redirect to="/landing" />}</Route>
          <Route path="/frameworks">{() => <Redirect to="/landing" />}</Route>
          <Route path="/for-partners">{() => <Redirect to="/landing" />}</Route>
          <Route path="/about">{() => <Redirect to="/landing" />}</Route>
          <Route path="/insights">{() => <Redirect to="/resources" />}</Route>

          {/* ================================================================ */}
          {/* SIGNUP - Single page forms with 4-factor matching data */}
          {/* ================================================================ */}
          <Route path="/signup/volunteer" component={VolunteerIntakeSimple} />
          <Route path="/signup/organization" component={OrganizationIntakeSimple} />
          <Route path="/signup/corporate" component={CorporateIntakeSimple} />
          <Route path="/join" component={SignupLanding} />

          {/* ================================================================ */}
          {/* UNIFIED DASHBOARD - Single entry point for all roles */}
          {/* Role detection happens inside, renders appropriate view */}
          {/* ================================================================ */}
          <Route path="/dashboard" component={UnifiedDashboard} />

          {/* ================================================================ */}
          {/* VOLUNTEER ROUTES - Impact Wallet View */}
          {/* ================================================================ */}
          {/* Legacy route - redirects to unified dashboard */}
          <Route path="/volunteer/dashboard">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/volunteer/log" component={LogActivity} />
          <Route path="/volunteer/log/:projectId" component={LogActivity} />
          <Route path="/volunteer/history" component={MyWork} />
          <Route path="/volunteer/settings" component={VolunteerProfileSettings} />
          {/* Legacy routes - redirect to unified dashboard */}
          <Route path="/volunteer-dashboard">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/my-work">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/log-activity" component={LogActivity} />
          <Route path="/volunteer-profile-settings" component={VolunteerProfileSettings} />

          {/* ================================================================ */}
          {/* OPPORTUNITIES - Discover & detail views (volunteer + general) */}
          {/* ================================================================ */}
          <Route path="/discover-opportunities">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/discover-opportunities/pwa" component={DiscoverOpportunitiesPWA} />
          <Route path="/opportunities" component={Opportunities} />
          <Route path="/opportunities/:id/pwa" component={OpportunityDetailPWA} />
          <Route path="/opportunities/:id" component={OpportunityDetail} />
          <Route path="/organizations" component={Organizations} />
          <Route path="/organizations/pwa" component={OrganizationsPWA} />

          {/* ================================================================ */}
          {/* NGO ROUTES - Project Pipeline + Verification Queue */}
          {/* ================================================================ */}
          {/* Legacy routes - redirect to unified dashboard */}
          <Route path="/ngo/dashboard">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/ngo/dashboard/pwa">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/ngo/verification">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/ngo/projects">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/ngo/log-hours" component={LogVolunteerHours} />
          <Route path="/ngo/settings" component={OrganizationProfileSettings} />
          {/* Legacy routes - redirect to unified dashboard */}
          <Route path="/organization-dashboard">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/organization-dashboard/pwa">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/ngo-verification">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/volunteers">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/projects">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/projects/:id/edit" component={ProjectEdit} />
          <Route path="/ngo/projects/:id/edit" component={ProjectEdit} />
          <Route path="/projects/:id/pwa" component={ProjectDetailPWA} />
          <Route path="/projects/:id" component={ProjectDetail} />
          <Route path="/ngo/projects/:id" component={ProjectDetail} />
          <Route path="/log-volunteer-hours" component={LogVolunteerHours} />
          <Route path="/post-core-opportunity" component={PostCoreOpportunity} />
          <Route path="/post-urgent-opportunity">{() => <Redirect to="/post-core-opportunity" />}</Route>
          <Route path="/organization-profile-settings" component={OrganizationProfileSettings} />

          {/* ================================================================ */}
          {/* CORPORATE ROUTES - ESG Dashboard View */}
          {/* ================================================================ */}
          {/* Legacy routes - redirect to unified dashboard */}
          <Route path="/corporate/dashboard">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/corporate/dashboard/pwa">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/corporate/reports" component={CSRReportsExports} />
          <Route path="/corporate/settings" component={CorporatePartnerProfileSettings} />
          {/* Legacy routes - redirect to unified dashboard */}
          <Route path="/csr-dashboard">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/csr-dashboard-pwa">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/csr-dashboard/pwa">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/csr-reports-exports">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/corporate-partner-profile-settings" component={CorporatePartnerProfileSettings} />

          {/* ================================================================ */}
          {/* ADMIN ROUTES */}
          {/* ================================================================ */}
          <Route path="/admin/pilot-dashboard" component={AdminPilotDashboard} />

          {/* ================================================================ */}
          {/* UTILITY ROUTES */}
          {/* ================================================================ */}
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/help" component={Help} />

          {/* 404 */}
          <Route component={NotFound} />
        </Switch>
      </Router>
    </Suspense>
  );
}
