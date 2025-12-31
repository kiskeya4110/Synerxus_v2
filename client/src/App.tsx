import { Route, Router, Switch, useLocation } from "wouter";
import { useEffect, lazy, Suspense, useMemo } from "react";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import { ABTestingProvider, useABTesting } from "@/contexts/ab-testing-context";
import { getOnboardingSteps } from "@shared/onboarding-steps";
import OnboardingGuide from "@/components/onboarding/onboarding-guide";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";

// Core pages - loaded immediately for fast initial render
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import VolunteerDashboard from "@/pages/volunteer-dashboard";
import OrganizationDashboard from "@/pages/organization-dashboard";
import NotFound from "@/pages/not-found";

// Lazy-loaded pages - loaded on demand to reduce initial bundle size
const Profile = lazy(() => import("@/pages/profile"));
const MyWork = lazy(() => import("@/pages/my-work"));
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
const Volunteers = lazy(() => import("@/pages/volunteers"));
const Calendar = lazy(() => import("@/pages/calendar"));
const ImpactReport = lazy(() => import("@/pages/impact-report"));
const OrganizationImpactReport = lazy(() => import("@/pages/organization-impact-report"));
const MobileDataCollection = lazy(() => import("@/pages/mobile-data-collection"));
const ImpactVisualization = lazy(() => import("@/pages/impact-visualization"));
const ImpactStorytellingPage = lazy(() => import("@/pages/impact-storytelling"));
const Assignments = lazy(() => import("@/pages/assignments"));
const MatchedVolunteers = lazy(() => import("@/pages/matched-volunteers"));
const EmailDigests = lazy(() => import("@/pages/email-digests"));
const Achievements = lazy(() => import("@/pages/achievements"));
const LogActivity = lazy(() => import("@/pages/log-activity"));
const Leaderboard = lazy(() => import("@/pages/leaderboard"));
const OrganizationLeaderboard = lazy(() => import("@/pages/organization-leaderboard"));
const DiscoverOpportunities = lazy(() => import("@/pages/discover-opportunities"));
const DiscoverOpportunitiesPWA = lazy(() => import("@/pages/discover-opportunities-pwa"));
const SDGMapping = lazy(() => import("@/pages/sdg-mapping"));
const CSRDashboard = lazy(() => import("@/pages/csr-dashboard"));
const CSRDashboardPWA = lazy(() => import("@/pages/csr-dashboard-pwa"));
const CSRImpactReporting = lazy(() => import("@/pages/csr-impact-reporting").then(m => ({ default: m.CSRImpactReporting })));
const ProjectPortfolio = lazy(() => import("@/pages/project-portfolio"));
const CSRReportsExports = lazy(() => import("@/pages/csr-reports-exports"));
// const CorporatePartnerIntake = lazy(() => import("@/pages/corporate-partner-intake"));
const CorporatePartnerProfileSettings = lazy(() => import("@/pages/corporate-partner-profile-settings"));
const TeamOverview = lazy(() => import("@/pages/team-overview"));
const Overview = lazy(() => import("@/pages/overview"));
const OrganizationMessages = lazy(() => import("@/pages/organization-messages"));
const OrganizationMessagesPWA = lazy(() => import("@/pages/organization-messages-pwa"));
const OrganizationDashboardPWA = lazy(() => import("@/pages/organization-dashboard-pwa"));
const OrganizationTeam = lazy(() => import("@/pages/organization-team"));
const VolunteerMessages = lazy(() => import("@/pages/volunteer-messages"));
const VolunteerMessagesPWA = lazy(() => import("@/pages/volunteer-messages-pwa"));
const CSRMessagesPWA = lazy(() => import("@/pages/csr-messages-pwa"));
const VolunteerLeaderboardPWA = lazy(() => import("@/pages/volunteer-leaderboard-pwa"));
const EmployeeEngagementTabPage = lazy(() => import("@/pages/employee-engagement-tab-page"));
const Stories = lazy(() => import("@/pages/stories"));
const CreateStory = lazy(() => import("@/pages/create-story"));
const StoryDetail = lazy(() => import("@/pages/story-detail"));
const Help = lazy(() => import("@/pages/help"));
const Terms = lazy(() => import("@/pages/terms"));
const Privacy = lazy(() => import("@/pages/privacy"));

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
      // Check if user has completed intake
      const checkIntakeAndRedirect = async () => {
        const userId = localStorage.getItem('currentUserId');
        let userType = localStorage.getItem('userType');
        
        try {
          if (!userId) {
            setLocation('/landing');
            return;
          }

          // Fetch user from /api/users to get the latest userType from database
          const userResponse = await fetch(`/api/users?id=${userId}`);
          if (userResponse.ok) {
            const users = await userResponse.json();
            const currentUser = users.find((u: any) => u.id === parseInt(userId!));
            if (currentUser?.userType) {
              userType = currentUser.userType as string;
              // Update localStorage with fresh data from database
              localStorage.setItem('userType', userType);
            }
          }

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
            // If no profile exists, go to settings page (consolidated form)
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
          // For organization endpoint, response is an array of organizations
          const data = Array.isArray(jsonData) ? jsonData[0] : jsonData;

          // Check if intake is complete
          let isIntakeComplete = false;
          if (userType === 'volunteer') {
            isIntakeComplete = data?.volunteerProfile?.onboardingCompleted === true;
          } else if (userType === 'organization') {
            // For organizations, check if organization exists with a name
            // If organization record exists, they've completed basic setup - go to dashboard
            isIntakeComplete = !!data?.id && !!data?.name;
          } else if (userType === 'corporate-partner') {
            isIntakeComplete = data?.onboardingCompleted === true;
          }
          
          if (!isIntakeComplete) {
            // Redirect to settings page if profile not complete (consolidated form)
            let settingsPath = '/volunteer-profile-settings';
            if (userType === 'organization') settingsPath = '/organization-profile-settings';
            else if (userType === 'corporate-partner') settingsPath = '/corporate-partner-profile-settings';
            setLocation(settingsPath);
          } else {
            // Intake complete, go to appropriate dashboard based on user type
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
          // Fallback to appropriate dashboard based on current userType
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
  const { getVariant } = useABTesting();

  // Get the onboarding variant to determine step count
  const onboardingVariant = getVariant('onboarding-flow');
  const stepCount = onboardingVariant?.config?.stepCount || 'full';

  // Determine user type from localStorage
  const userType = localStorage.getItem('userType') as 'volunteer' | 'organization' | 'corporate-partner' || 'volunteer';

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
          <Route path="/organization-messages" component={OrganizationMessages} />
          <Route path="/organization-team" component={OrganizationTeam} />
          <Route path="/overview" component={Overview} />
          <Route path="/volunteers" component={Volunteers} />
          {/* Standalone utility routes */}
          <Route path="/sdg-mapping" component={SDGMapping} />
          <Route path="/impact-visualization">{() => <ImpactVisualization />}</Route>
          {/* PWA Routes - standalone (no Layout wrapper) */}
          <Route path="/volunteer-dashboard" component={VolunteerDashboard} />
          <Route path="/projects/:id/pwa" component={ProjectDetailPWA} />
          <Route path="/discover-opportunities/pwa" component={DiscoverOpportunitiesPWA} />
          <Route path="/opportunities/:id/pwa" component={OpportunityDetailPWA} />
          <Route path="/volunteer-messages/pwa" component={VolunteerMessagesPWA} />
          <Route path="/organization-messages/pwa" component={OrganizationMessagesPWA} />
          <Route path="/organization-dashboard/pwa" component={OrganizationDashboardPWA} />
          <Route path="/volunteer-leaderboard/pwa" component={VolunteerLeaderboardPWA} />
          <Route path="/csr-messages/pwa" component={CSRMessagesPWA} />
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
      {/* Profile & Settings */}
      <Route path="/profile" component={Profile} />
      <Route path="/volunteer-profile-settings" component={VolunteerProfileSettings} />
      <Route path="/organization-profile-settings" component={OrganizationProfileSettings} />
      <Route path="/corporate-partner-profile-settings" component={CorporatePartnerProfileSettings} />
      {/* Work & Tasks */}
      <Route path="/my-work" component={MyWork} />
      <Route path="/log-activity" component={LogActivity} />
      <Route path="/tasks" component={Tasks} />
      {/* Intake Forms - Redirect to consolidated settings pages */}
      <Route path="/volunteer-intake" component={VolunteerProfileSettings} />
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
      <Route path="/help" component={Help} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      {/* Calendar & Impact */}
      <Route path="/calendar" component={Calendar} />
      <Route path="/impact-report/:volunteerId?" component={ImpactReport} />
      <Route path="/organization-impact-report/:organizationId?" component={OrganizationImpactReport} />
      <Route path="/mobile-data-collection" component={MobileDataCollection} />
      <Route path="/impact-storytelling" component={ImpactStorytellingPage} />
      {/* Assignments & Matching */}
      <Route path="/assignments" component={Assignments} />
      <Route path="/matched-volunteers" component={MatchedVolunteers} />
      {/* Notifications & Achievements */}
      <Route path="/email-digests" component={EmailDigests} />
      <Route path="/achievements" component={Achievements} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/organization-leaderboard" component={OrganizationLeaderboard} />
      {/* Messages */}
      <Route path="/volunteer-messages" component={VolunteerMessages} />
      {/* Stories */}
      <Route path="/stories" component={Stories} />
      <Route path="/create-story" component={CreateStory} />
      <Route path="/stories/:id" component={StoryDetail} />
    </Layout>
  );
}
