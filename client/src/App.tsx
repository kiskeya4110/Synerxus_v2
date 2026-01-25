import { Route, Router, Switch, useLocation } from "wouter";
import { useEffect, lazy, Suspense, useMemo } from "react";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import { ABTestingProvider, useABTesting } from "@/contexts/ab-testing-context";
import { getOnboardingSteps } from "@shared/onboarding-steps";
import OnboardingGuide from "@/components/onboarding/onboarding-guide";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";
import { useBadgeCelebration } from "@/hooks/use-badge-celebration";

// Core pages - lazy loaded for smaller initial bundle
const Landing = lazy(() => import("@/pages/landing"));
const Login = lazy(() => import("@/pages/login"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const VolunteerDashboard = lazy(() => import("@/pages/volunteer-dashboard-new"));
const OrganizationDashboard = lazy(() => import("@/pages/organization-dashboard-new"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Lazy-loaded pages - loaded on demand to reduce initial bundle size
const Profile = lazy(() => import("@/pages/profile"));
const MyWork = lazy(() => import("@/pages/my-work"));
const MyTasks = lazy(() => import("@/pages/my-tasks"));
const Tasks = lazy(() => import("@/pages/tasks"));
const Projects = lazy(() => import("@/pages/projects"));
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const ProjectDetailPWA = lazy(() => import("@/pages/project-detail-pwa"));
const ProjectEdit = lazy(() => import("@/pages/project-edit"));
// Intake forms now redirect to consolidated settings pages
// const VolunteerIntake = lazy(() => import("@/pages/volunteer-intake"));
// const OrganizationIntake = lazy(() => import("@/pages/organization-intake"));
const OrganizationProfileSettings = lazy(() => import("@/pages/organization-profile-settings"));
const VolunteerProfileSettings = lazy(() => import("@/pages/volunteer-profile-settings"));
const Opportunities = lazy(() => import("@/pages/opportunities"));
const OpportunityDetail = lazy(() => import("@/pages/opportunity-detail"));
const OpportunityDetailPWA = lazy(() => import("@/pages/opportunity-detail-pwa"));
const Applications = lazy(() => import("@/pages/applications"));
const MyApplications = lazy(() => import("@/pages/my-applications"));
const Organizations = lazy(() => import("@/pages/organizations"));
const OrganizationsPWA = lazy(() => import("@/pages/organizations-pwa"));
const Volunteers = lazy(() => import("@/pages/volunteers"));
const Calendar = lazy(() => import("@/pages/calendar"));
const ImpactReport = lazy(() => import("@/pages/impact-report"));
const OrganizationImpactReport = lazy(() => import("@/pages/organization-impact-report"));
const MobileDataCollection = lazy(() => import("@/pages/mobile-data-collection"));
const ImpactVisualization = lazy(() => import("@/pages/impact-visualization"));
const Assignments = lazy(() => import("@/pages/assignments"));
const MatchedVolunteers = lazy(() => import("@/pages/matched-volunteers"));
const EmailDigests = lazy(() => import("@/pages/email-digests"));
const LogActivity = lazy(() => import("@/pages/log-activity"));
const DiscoverOpportunities = lazy(() => import("@/pages/discover-opportunities"));
const DiscoverOpportunitiesPWA = lazy(() => import("@/pages/discover-opportunities-pwa"));
const SDGMapping = lazy(() => import("@/pages/sdg-mapping"));
const CSRDashboard = lazy(() => import("@/pages/csr-dashboard-new"));
const CSRDashboardPWA = lazy(() => import("@/pages/csr-dashboard-pwa"));
const CSRImpactReporting = lazy(() => import("@/pages/csr-impact-reporting").then(m => ({ default: m.CSRImpactReporting })));
const ProjectPortfolio = lazy(() => import("@/pages/project-portfolio"));
const CSRReportsExports = lazy(() => import("@/pages/csr-reports-exports"));
// const CorporatePartnerIntake = lazy(() => import("@/pages/corporate-partner-intake"));
const CorporatePartnerProfileSettings = lazy(() => import("@/pages/corporate-partner-profile-settings"));
const TeamOverview = lazy(() => import("@/pages/team-overview"));
const Overview = lazy(() => import("@/pages/overview"));
const OrganizationDashboardPWA = lazy(() => import("@/pages/organization-dashboard-pwa-new"));
const OrganizationTeam = lazy(() => import("@/pages/organization-team"));
const NgoVerification = lazy(() => import("@/pages/ngo-verification"));
const LogVolunteerHours = lazy(() => import("@/pages/log-volunteer-hours"));
const EmployeeEngagementTabPage = lazy(() => import("@/pages/employee-engagement-tab-page"));
const Help = lazy(() => import("@/pages/help"));
const Terms = lazy(() => import("@/pages/terms"));
const Privacy = lazy(() => import("@/pages/privacy"));
const InvitationCodes = lazy(() => import("@/pages/invitation-codes"));
const AdminOrganizationApproval = lazy(() => import("@/pages/admin-organization-approval"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const AdminDashboardPWA = lazy(() => import("@/pages/admin-dashboard-pwa"));
const PostCoreOpportunity = lazy(() => import("@/pages/post-core-opportunity"));
const PostUrgentOpportunity = lazy(() => import("@/pages/post-urgent-opportunity"));
const JoinTeam = lazy(() => import("@/pages/join-team"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

function RootRedirectRoute() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const currentUserId = localStorage.getItem('currentUserId');

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // Check both Firebase user AND localStorage userId for auth state
    const isAuthenticated = user || currentUserId;

    if (isAuthenticated) {
      const userId = localStorage.getItem('currentUserId');
      const userType = localStorage.getItem('userType');
      const isNewSignup = localStorage.getItem('isNewSignup') === 'true';
      const profileComplete = localStorage.getItem('profileComplete') === 'true';

      if (!userId) {
        setLocation('/landing');
        return;
      }

      // FAST PATH: If profile is marked complete and NOT a new signup, go directly to dashboard
      // This avoids unnecessary API calls for returning users
      if (profileComplete && !isNewSignup) {
        if (userType === 'corporate-partner') {
          setLocation('/csr-dashboard');
        } else if (userType === 'organization') {
          setLocation('/organization-dashboard');
        } else {
          setLocation('/volunteer-dashboard');
        }
        return;
      }

      // SIGNUP PATH: If this is a new signup, redirect to profile settings
      if (isNewSignup) {
        let settingsPath = '/volunteer-profile-settings';
        if (userType === 'organization') settingsPath = '/organization-profile-settings';
        else if (userType === 'corporate-partner') settingsPath = '/corporate-partner-profile-settings';
        setLocation(settingsPath);
        return;
      }

      // FALLBACK: For users without flags set (legacy or edge cases), check API
      // This ensures backwards compatibility
      const checkIntakeAndRedirect = async () => {
        try {
          if (!userType) {
            setLocation('/landing');
            return;
          }

          // Fetch intake completion status based on user type
          let endpoint = '';
          if (userType === 'volunteer') {
            endpoint = `/api/intake/volunteer-profile?userId=${userId}`;
          } else if (userType === 'organization') {
            endpoint = `/api/organizations?managerId=${userId}`;
          } else if (userType === 'corporate-partner') {
            endpoint = `/api/corporate-partners?userId=${userId}`;
          }

          const response = await fetch(endpoint);

          if (!response.ok) {
            // If no profile exists, go to settings page (new user without flags)
            let settingsPath = '/volunteer-profile-settings';
            if (userType === 'organization') settingsPath = '/organization-profile-settings';
            else if (userType === 'corporate-partner') settingsPath = '/corporate-partner-profile-settings';
            setLocation(settingsPath);
            return;
          }

          // Ensure response is JSON before parsing
          const contentType = response.headers.get('content-type');
          if (!contentType?.includes('application/json')) {
            throw new Error('Non-JSON response from server');
          }

          const jsonData = await response.json();
          const data = Array.isArray(jsonData) ? jsonData[0] : jsonData;

          // Check if user is established (has any profile data or activity)
          // Be PERMISSIVE here - only redirect to settings if user is clearly brand new
          let isEstablishedUser = false;
          if (userType === 'volunteer') {
            const volunteerProfile = data?.volunteerProfile;
            // User is established if they have:
            // - Completed onboarding, OR
            // - Have a name set, OR
            // - Have logged any activities (hours > 0), OR
            // - Have a profile ID (profile exists in DB)
            isEstablishedUser = volunteerProfile?.onboardingCompleted === true ||
              !!(volunteerProfile?.volunteer_name || volunteerProfile?.volunteerName) ||
              (volunteerProfile?.totalHours && volunteerProfile.totalHours > 0) ||
              !!volunteerProfile?.id ||
              !!data?.id; // User record exists
          } else if (userType === 'organization') {
            // Organization is established if it has an ID and name
            isEstablishedUser = !!data?.id && !!data?.name;
          } else if (userType === 'corporate-partner') {
            // Corporate partner is established if onboarding complete OR has company name OR has ID
            isEstablishedUser = data?.onboardingCompleted === true || !!data?.companyName || !!data?.id;
          }

          // Set profileComplete flag for future visits
          if (isEstablishedUser) {
            localStorage.setItem('profileComplete', 'true');
            localStorage.removeItem('isNewSignup');
          }

          // Only redirect to settings if user is NOT established
          // This prevents established users from being forced to settings on every login
          if (!isEstablishedUser) {
            let settingsPath = '/volunteer-profile-settings';
            if (userType === 'organization') settingsPath = '/organization-profile-settings';
            else if (userType === 'corporate-partner') settingsPath = '/corporate-partner-profile-settings';
            setLocation(settingsPath);
          } else {
            if (userType === 'corporate-partner') {
              setLocation('/csr-dashboard');
            } else if (userType === 'organization') {
              setLocation('/organization-dashboard');
            } else {
              setLocation('/volunteer-dashboard');
            }
          }
        } catch (error) {
          console.error('Error checking intake status:', error);
          // Fallback to dashboard - assume profile is complete for better UX
          localStorage.setItem('profileComplete', 'true');
          const defaultDashboard = userType === 'corporate-partner' ? '/csr-dashboard' : userType === 'organization' ? '/organization-dashboard' : '/volunteer-dashboard';
          setLocation(defaultDashboard);
        }
      };

      checkIntakeAndRedirect();
    } else {
      setLocation('/landing');
    }
  }, [user, loading, setLocation, currentUserId]);

  return null;
}

// Inner app component that uses A/B testing context
function AppWithOnboarding() {
  const abTesting = useABTesting();

  // Get the onboarding variant to determine step count
  const onboardingVariant = abTesting.getVariant('onboarding-flow');
  const stepCount = onboardingVariant?.config?.stepCount || 'full';

  // Determine user type from localStorage
  const userType = localStorage.getItem('userType') as 'volunteer' | 'organization' | 'corporate-partner' || 'volunteer';

  // Badge celebration - shows toast when user earns a new badge
  const currentUserId = localStorage.getItem('currentUserId');
  useBadgeCelebration(currentUserId ? parseInt(currentUserId, 10) : null);

  // Get onboarding steps based on user type and A/B variant
  const steps = useMemo(() => {
    return getOnboardingSteps(userType, stepCount as 'full' | 'minimal');
  }, [userType, stepCount]);

  return (
    <OnboardingProvider steps={steps}>
      <OnboardingGuide />
      <Suspense fallback={<PageLoader />}>
      <Router>
        <Switch>
          <Route path="/" component={RootRedirectRoute} />
          <Route path="/login" component={Login} />
          <Route path="/landing" component={Landing} />
          {/* CSR/Corporate Partner routes - standalone layout */}
          <Route path="/csr-dashboard" component={CSRDashboard} />
          <Route path="/csr-dashboard-pwa" component={CSRDashboardPWA} />
          <Route path="/employee-engagement-tab" component={EmployeeEngagementTabPage} />
          <Route path="/team-overview" component={TeamOverview} />
          <Route path="/csr-impact-reporting" component={CSRImpactReporting} />
          <Route path="/project-portfolio" component={ProjectPortfolio} />
          <Route path="/csr-reports-exports" component={CSRReportsExports} />
          {/* Organization routes - standalone layout */}
          <Route path="/organization-dashboard" component={OrganizationDashboard} />
          <Route path="/organization-my-work" component={MyWork} />
          <Route path="/organization-team" component={OrganizationTeam} />
          <Route path="/ngo-verification" component={NgoVerification} />
          <Route path="/log-volunteer-hours" component={LogVolunteerHours} />
          <Route path="/overview" component={Overview} />
          <Route path="/volunteers" component={Volunteers} />
          <Route path="/invitation-codes" component={InvitationCodes} />
          <Route path="/admin/organization-approval" component={AdminOrganizationApproval} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/dashboard/pwa" component={AdminDashboardPWA} />
          <Route path="/post-core-opportunity" component={PostCoreOpportunity} />
          <Route path="/post-urgent-opportunity" component={PostUrgentOpportunity} />
          {/* Standalone utility routes */}
          <Route path="/join-team" component={JoinTeam} />
          <Route path="/sdg-mapping" component={SDGMapping} />
          <Route path="/impact-visualization">{() => <ImpactVisualization />}</Route>
          {/* Volunteer Routes - standalone (own layout with PWAHeader/VolunteerNav) */}
          <Route path="/volunteer-dashboard" component={VolunteerDashboard} />
          <Route path="/volunteer-profile-settings" component={VolunteerProfileSettings} />
          <Route path="/volunteer-intake" component={VolunteerProfileSettings} />
          {/* PWA Routes - standalone (no Layout wrapper) */}
          <Route path="/projects/:id/pwa" component={ProjectDetailPWA} />
          <Route path="/discover-opportunities/pwa" component={DiscoverOpportunitiesPWA} />
          <Route path="/opportunities/:id/pwa" component={OpportunityDetailPWA} />
          <Route path="/organization-dashboard/pwa" component={OrganizationDashboardPWA} />
          {/* All other routes go through Layout (includes VolunteerNav and Footer) */}
          <Route component={LayoutRoute} />
        </Switch>
        </Router>
        </Suspense>
    </OnboardingProvider>
  );
}

export default function App() {
  return (
    <ABTestingProvider>
      <AppWithOnboarding />
    </ABTestingProvider>
  );
}

function LayoutRoute() {
  return (
    <Layout>
      {/* Dashboards - volunteers get nav/footer via Layout */}
      <Route path="/dashboard" component={Dashboard} />
      {/* Projects */}
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id/edit" component={ProjectEdit} />
      <Route path="/projects/:id" component={ProjectDetail} />
      {/* Profile & Settings - volunteer settings moved to standalone routes */}
      <Route path="/profile" component={Profile} />
      <Route path="/organization-profile-settings" component={OrganizationProfileSettings} />
      <Route path="/corporate-partner-profile-settings" component={CorporatePartnerProfileSettings} />
      {/* Work & Tasks */}
      <Route path="/my-work" component={MyWork} />
      <Route path="/my-tasks" component={MyTasks} />
      <Route path="/log-activity" component={LogActivity} />
      <Route path="/tasks" component={Tasks} />
      {/* Intake Forms - Redirect to consolidated settings pages (volunteer moved to standalone) */}
      <Route path="/organization-intake" component={OrganizationProfileSettings} />
      <Route path="/corporate-partner-intake" component={CorporatePartnerProfileSettings} />
      {/* Opportunities */}
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/discover-opportunities" component={DiscoverOpportunities} />
      <Route path="/opportunities/:id" component={OpportunityDetail} />
      {/* Applications */}
      <Route path="/applications" component={Applications} />
      <Route path="/my-applications" component={MyApplications} />
      <Route path="/organizations" component={Organizations} />
      <Route path="/organizations/pwa" component={OrganizationsPWA} />
      <Route path="/help" component={Help} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      {/* Calendar & Impact */}
      <Route path="/calendar" component={Calendar} />
      <Route path="/impact-report/:volunteerId?" component={ImpactReport} />
      <Route path="/organization-impact-report/:organizationId?" component={OrganizationImpactReport} />
      <Route path="/mobile-data-collection" component={MobileDataCollection} />
      {/* Assignments & Matching */}
      <Route path="/assignments" component={Assignments} />
      <Route path="/matched-volunteers" component={MatchedVolunteers} />
      {/* Notifications */}
      <Route path="/email-digests" component={EmailDigests} />
    </Layout>
  );
}
