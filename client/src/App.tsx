import { Route, Router, Switch, useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { useAuth } from "@/hooks/use-auth";

// ============================================================================
// SYNERXUS MVP - VERIFIED IMPACT DATA PIPELINE
// ============================================================================
// Core Loop: VOLUNTEER MATCHED → LOGS IMPACT → NGO VERIFIES → CORPORATE SEES SDG DATA
// Every feature must answer YES to: "Does this generate a Verified Impact Log?"
// ============================================================================

// Core pages - lazy loaded
const Landing = lazy(() => import("@/pages/landing"));
const Login = lazy(() => import("@/pages/login"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Streamlined MVP Signup Forms (single page, collect 4-factor matching data)
const VolunteerIntakeSimple = lazy(() => import("@/pages/volunteer-intake-simple"));
const OrganizationIntakeSimple = lazy(() => import("@/pages/organization-intake-simple"));
const CorporateIntakeSimple = lazy(() => import("@/pages/corporate-intake-simple"));

// ============================================================================
// VOLUNTEER VIEW - Impact Wallet (Mobile-First)
// ============================================================================
const VolunteerDashboard = lazy(() => import("@/pages/volunteer-dashboard-new"));
// /volunteer/projects → AI-matched recommendations (MAX 3 projects shown, no browsing)
// /volunteer/log/:projectId → Log form: hours +/- buttons, outcome selector, photo upload
// /volunteer/history → List of submitted logs with status badges
const MyWork = lazy(() => import("@/pages/my-work"));
const LogActivity = lazy(() => import("@/pages/log-activity"));

// ============================================================================
// NGO VIEW - Project Pipeline + Verification Queue (Desktop/Tablet)
// ============================================================================
const OrganizationDashboard = lazy(() => import("@/pages/organization-dashboard-new"));
const OrganizationDashboardPWA = lazy(() => import("@/pages/organization-dashboard-pwa-new"));
const NgoVerification = lazy(() => import("@/pages/ngo-verification"));
const LogVolunteerHours = lazy(() => import("@/pages/log-volunteer-hours"));
const OrganizationMessages = lazy(() => import("@/pages/organization-messages"));
const Volunteers = lazy(() => import("@/pages/volunteers"));
const SDGMapping = lazy(() => import("@/pages/sdg-mapping"));
const Overview = lazy(() => import("@/pages/overview"));
const OrganizationImpactReport = lazy(() => import("@/pages/organization-impact-report"));
const OrganizationProfile = lazy(() => import("@/pages/organization-profile"));
const OrganizationProfileSettings = lazy(() => import("@/pages/organization-profile-settings"));
const PostCoreOpportunity = lazy(() => import("@/pages/post-core-opportunity"));
const PostUrgentOpportunity = lazy(() => import("@/pages/post-urgent-opportunity"));
// NGO project management (simplified)
const NgoProjects = lazy(() => import("@/pages/projects"));
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const Profile = lazy(() => import("@/pages/profile"));
const ImpactReport = lazy(() => import("@/pages/impact-report"));

// ============================================================================
// CORPORATE VIEW - ESG Dashboard (Desktop)
// ============================================================================
const CSRDashboard = lazy(() => import("@/pages/csr-dashboard-new"));
const CSRDashboardPWA = lazy(() => import("@/pages/csr-dashboard-pwa"));
const CSRReportsExports = lazy(() => import("@/pages/csr-reports-exports"));
const TeamOverview = lazy(() => import("@/pages/team-overview"));

// ============================================================================
// ADMIN - Founder Metrics Only
// ============================================================================
const AdminMetrics = lazy(() => import("@/pages/admin-dashboard"));

// Legal pages
const Terms = lazy(() => import("@/pages/terms"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Help = lazy(() => import("@/pages/help"));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#0F172A]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
  </div>
);

// ============================================================================
// Root Redirect - Route users to correct dashboard based on role
// ============================================================================
function RootRedirectRoute() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const currentUserId = localStorage.getItem('currentUserId');

  useEffect(() => {
    if (loading) return;

    const isAuthenticated = user || currentUserId;

    if (isAuthenticated) {
      const userId = localStorage.getItem('currentUserId');
      const userType = localStorage.getItem('userType');
      const profileComplete = localStorage.getItem('profileComplete') === 'true';

      if (!userId) {
        setLocation('/landing');
        return;
      }

      // Route to correct dashboard based on user type
      if (profileComplete) {
        if (userType === 'corporate-partner') {
          setLocation('/corporate/dashboard');
        } else if (userType === 'organization') {
          setLocation('/ngo/dashboard');
        } else {
          setLocation('/volunteer/dashboard');
        }
        return;
      }

      // New user - route to signup
      if (userType === 'corporate-partner') {
        setLocation('/signup/corporate');
      } else if (userType === 'organization') {
        setLocation('/signup/organization');
      } else {
        setLocation('/signup/volunteer');
      }
    } else {
      setLocation('/landing');
    }
  }, [user, loading, setLocation, currentUserId]);

  return null;
}

// ============================================================================
// Main App Component - Dark Theme Only
// ============================================================================
export default function App() {
  // Ensure dark mode is always applied (no theme toggle in MVP)
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <Router>
        <Switch>
          {/* Root redirect */}
          <Route path="/" component={RootRedirectRoute} />

          {/* Auth */}
          <Route path="/login" component={Login} />
          <Route path="/landing" component={Landing} />

          {/* ================================================================ */}
          {/* SIGNUP - Single page forms with 4-factor matching data */}
          {/* ================================================================ */}
          <Route path="/signup/volunteer" component={VolunteerIntakeSimple} />
          <Route path="/signup/organization" component={OrganizationIntakeSimple} />
          <Route path="/signup/corporate" component={CorporateIntakeSimple} />
          <Route path="/join" component={VolunteerIntakeSimple} />

          {/* ================================================================ */}
          {/* VOLUNTEER ROUTES - Impact Wallet View */}
          {/* ================================================================ */}
          <Route path="/volunteer/dashboard" component={VolunteerDashboard} />
          <Route path="/volunteer/log" component={LogActivity} />
          <Route path="/volunteer/log/:projectId" component={LogActivity} />
          <Route path="/volunteer/history" component={MyWork} />
          {/* Legacy routes - redirect to new structure */}
          <Route path="/volunteer-dashboard" component={VolunteerDashboard} />
          <Route path="/my-work" component={MyWork} />
          <Route path="/log-activity" component={LogActivity} />

          {/* ================================================================ */}
          {/* NGO ROUTES - Project Pipeline + Verification Queue */}
          {/* ================================================================ */}
          <Route path="/ngo/dashboard" component={OrganizationDashboard} />
          <Route path="/ngo/dashboard/pwa" component={OrganizationDashboardPWA} />
          <Route path="/ngo/verification" component={NgoVerification} />
          <Route path="/ngo/projects" component={NgoProjects} />
          <Route path="/ngo/log-hours" component={LogVolunteerHours} />
          {/* Legacy routes - redirect to new structure */}
          <Route path="/organization-dashboard" component={OrganizationDashboard} />
          <Route path="/organization-dashboard/pwa" component={OrganizationDashboardPWA} />
          <Route path="/ngo-verification" component={NgoVerification} />
          <Route path="/projects" component={NgoProjects} />
          <Route path="/projects/:id" component={ProjectDetail} />
          <Route path="/ngo/projects/:id" component={ProjectDetail} />
          <Route path="/log-volunteer-hours" component={LogVolunteerHours} />
          <Route path="/organization-messages/pwa" component={OrganizationMessages} />
          <Route path="/organization-messages" component={OrganizationMessages} />
          <Route path="/volunteers" component={Volunteers} />
          <Route path="/sdg-mapping" component={SDGMapping} />
          <Route path="/overview" component={Overview} />
          <Route path="/organization-impact-report" component={OrganizationImpactReport} />
          <Route path="/organization-profile" component={OrganizationProfile} />
          <Route path="/organization-profile-settings" component={OrganizationProfileSettings} />
          <Route path="/post-core-opportunity" component={PostCoreOpportunity} />
          <Route path="/post-urgent-opportunity" component={PostUrgentOpportunity} />
          <Route path="/profile" component={Profile} />
          <Route path="/impact-report" component={ImpactReport} />

          {/* ================================================================ */}
          {/* CORPORATE ROUTES - ESG Dashboard View */}
          {/* ================================================================ */}
          <Route path="/corporate/dashboard" component={CSRDashboard} />
          <Route path="/corporate/dashboard/pwa" component={CSRDashboardPWA} />
          <Route path="/corporate/employees" component={TeamOverview} />
          <Route path="/corporate/reports" component={CSRReportsExports} />
          {/* Legacy routes - redirect to new structure */}
          <Route path="/csr-dashboard" component={CSRDashboard} />
          <Route path="/csr-dashboard-pwa" component={CSRDashboardPWA} />
          <Route path="/team-overview" component={TeamOverview} />
          <Route path="/csr-reports-exports" component={CSRReportsExports} />

          {/* ================================================================ */}
          {/* ADMIN - Founder Metrics Only */}
          {/* ================================================================ */}
          <Route path="/admin/metrics" component={AdminMetrics} />
          <Route path="/admin/dashboard" component={AdminMetrics} />

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
