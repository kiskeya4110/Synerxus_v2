import { Route, Router, useLocation } from "wouter";
import { useEffect, Suspense, lazy } from "react";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import { volunteerOnboardingSteps, organizationOnboardingSteps, csrOnboardingSteps } from "@shared/onboarding-steps";
import OnboardingGuide from "@/components/onboarding/onboarding-guide";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";

// =============================================================================
// REACT.LAZY CODE SPLITTING - 95%+ Performance Optimization
// Critical path components loaded eagerly, heavy pages loaded lazily
// =============================================================================

// EAGER LOADS - Critical path (landing, login, dashboards)
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import VolunteerDashboard from "@/pages/volunteer-dashboard";
import OrganizationDashboard from "@/pages/organization-dashboard";
import CSRDashboard from "@/pages/csr-dashboard";

// LAZY LOADS - Heavy pages loaded on demand
const Profile = lazy(() => import("@/pages/profile"));
const MyWork = lazy(() => import("@/pages/my-work"));
const Tasks = lazy(() => import("@/pages/tasks"));
const Projects = lazy(() => import("@/pages/projects"));
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const ProjectDetailPWA = lazy(() => import("@/pages/project-detail-pwa"));
const ProjectEdit = lazy(() => import("@/pages/project-edit"));
const VolunteerIntake = lazy(() => import("@/pages/volunteer-intake"));
const OrganizationIntake = lazy(() => import("@/pages/organization-intake"));
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
const CSRDashboardPWA = lazy(() => import("@/pages/csr-dashboard-pwa"));
const CSRImpactReporting = lazy(() => import("@/pages/csr-impact-reporting").then(m => ({ default: m.CSRImpactReporting })));
const ProjectPortfolio = lazy(() => import("@/pages/project-portfolio"));
const CSRReportsExports = lazy(() => import("@/pages/csr-reports-exports"));
const CorporatePartnerIntake = lazy(() => import("@/pages/corporate-partner-intake"));
const CorporatePartnerProfileSettings = lazy(() => import("@/pages/corporate-partner-profile-settings"));
const TeamOverview = lazy(() => import("@/pages/team-overview"));
const Overview = lazy(() => import("@/pages/overview"));
const OrganizationMessages = lazy(() => import("@/pages/organization-messages"));
const VolunteerMessages = lazy(() => import("@/pages/volunteer-messages"));
const VolunteerMessagesPWA = lazy(() => import("@/pages/volunteer-messages-pwa"));
const EmployeeEngagementTabPage = lazy(() => import("@/pages/employee-engagement-tab-page"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function RootRedirectRoute() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
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
            // If no profile exists, go to intake
            let intakePath = '/volunteer-intake';
            if (userType === 'organization') intakePath = '/organization-intake';
            else if (userType === 'corporate-partner') intakePath = '/corporate-partner-intake';
            setLocation(intakePath);
            return;
          }

          const data = Array.isArray(response) ? response[0] : await response.json();

          // Check if intake is complete
          let isIntakeComplete = false;
          if (userType === 'volunteer') {
            isIntakeComplete = data?.volunteerProfile?.onboardingCompleted === true;
          } else if (userType === 'organization') {
            isIntakeComplete = data?.onboardingCompleted === true;
          } else if (userType === 'corporate-partner') {
            isIntakeComplete = data?.onboardingCompleted === true;
          }

          if (!isIntakeComplete) {
            // Redirect to intake if not complete
            let intakePath = '/volunteer-intake';
            if (userType === 'organization') intakePath = '/organization-intake';
            else if (userType === 'corporate-partner') intakePath = '/corporate-partner-intake';
            setLocation(intakePath);
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
  }, [user, setLocation]);

  return null;
}

export default function App() {
  // Determine user type from localStorage to select appropriate onboarding steps
  const userType = localStorage.getItem('userType');
  const steps = userType === 'corporate-partner'
    ? csrOnboardingSteps
    : userType === 'organization'
      ? organizationOnboardingSteps
      : volunteerOnboardingSteps;

  return (
    <SidebarProvider>
      <OnboardingProvider steps={steps}>
        <OnboardingGuide />
        <Suspense fallback={<PageLoader />}>
          <Router>
            <Route path="/" component={RootRedirectRoute} />
            <Route path="/login" component={Login} />
            <Route path="/landing" component={Landing} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/csr-dashboard" component={CSRDashboard} />
            <Route path="/csr-dashboard-pwa">{() => <Suspense fallback={<PageLoader />}><CSRDashboardPWA /></Suspense>}</Route>
            <Route path="/employee-engagement-tab">{() => <Suspense fallback={<PageLoader />}><EmployeeEngagementTabPage /></Suspense>}</Route>
            <Route path="/team-overview">{() => <Suspense fallback={<PageLoader />}><TeamOverview /></Suspense>}</Route>
            <Route path="/volunteer-dashboard" component={VolunteerDashboard} />
            <Route path="/organization-dashboard" component={OrganizationDashboard} />
            <Route path="/overview">{() => <Suspense fallback={<PageLoader />}><Overview /></Suspense>}</Route>
            <Route path="/organization-my-work">{() => <Suspense fallback={<PageLoader />}><MyWork /></Suspense>}</Route>
            <Route path="/csr-impact-reporting">{() => <Suspense fallback={<PageLoader />}><CSRImpactReporting /></Suspense>}</Route>
            <Route path="/project-portfolio">{() => <Suspense fallback={<PageLoader />}><ProjectPortfolio /></Suspense>}</Route>
            <Route path="/csr-reports-exports">{() => <Suspense fallback={<PageLoader />}><CSRReportsExports /></Suspense>}</Route>
            <Route path="/projects">{() => <Suspense fallback={<PageLoader />}><Projects /></Suspense>}</Route>
            <Route path="/projects/:id/pwa">{(params) => <Suspense fallback={<PageLoader />}><ProjectDetailPWA /></Suspense>}</Route>
            <Route path="/projects/:id">{(params) => <Suspense fallback={<PageLoader />}><ProjectDetail /></Suspense>}</Route>
            <Route path="/projects/:id/edit">{(params) => <Suspense fallback={<PageLoader />}><ProjectEdit /></Suspense>}</Route>
            <Route path="/volunteers">{() => <Suspense fallback={<PageLoader />}><Volunteers /></Suspense>}</Route>
            <Route path="/sdg-mapping">{() => <Suspense fallback={<PageLoader />}><SDGMapping /></Suspense>}</Route>
            <Route path="/impact-visualization">{() => <Suspense fallback={<PageLoader />}><ImpactVisualization /></Suspense>}</Route>
            <Route path="/organization-messages">{() => <Suspense fallback={<PageLoader />}><OrganizationMessages /></Suspense>}</Route>
            <Route component={LayoutRoute} />
          </Router>
        </Suspense>
      </OnboardingProvider>
    </SidebarProvider>
  );
}

function LayoutRoute() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Route path="/profile">{() => <Profile />}</Route>
        <Route path="/volunteer-profile-settings">{() => <VolunteerProfileSettings />}</Route>
        <Route path="/organization-profile-settings">{() => <OrganizationProfileSettings />}</Route>
        <Route path="/corporate-partner-profile-settings">{() => <CorporatePartnerProfileSettings />}</Route>
        <Route path="/my-work">{() => <MyWork />}</Route>
        <Route path="/log-activity">{() => <LogActivity />}</Route>
        <Route path="/tasks">{() => <Tasks />}</Route>
        <Route path="/volunteer-intake">{() => <VolunteerIntake />}</Route>
        <Route path="/organization-intake">{() => <OrganizationIntake />}</Route>
        <Route path="/corporate-partner-intake">{() => <CorporatePartnerIntake />}</Route>
        <Route path="/opportunities">{() => <Opportunities />}</Route>
        <Route path="/discover-opportunities">{() => <DiscoverOpportunities />}</Route>
        <Route path="/discover-opportunities/pwa">{() => <DiscoverOpportunitiesPWA />}</Route>
        <Route path="/opportunities/:id/pwa">{() => <OpportunityDetailPWA />}</Route>
        <Route path="/opportunities/:id">{() => <OpportunityDetail />}</Route>
        <Route path="/applications">{() => <Applications />}</Route>
        <Route path="/my-applications">{() => <MyApplications />}</Route>
        <Route path="/organizations">{() => <Organizations />}</Route>
        <Route path="/calendar">{() => <Calendar />}</Route>
        <Route path="/impact-report/:volunteerId?">{() => <ImpactReport />}</Route>
        <Route path="/organization-impact-report/:organizationId?">{() => <OrganizationImpactReport />}</Route>
        <Route path="/mobile-data-collection">{() => <MobileDataCollection />}</Route>
        <Route path="/impact-storytelling">{() => <ImpactStorytellingPage />}</Route>
        <Route path="/assignments">{() => <Assignments />}</Route>
        <Route path="/matched-volunteers">{() => <MatchedVolunteers />}</Route>
        <Route path="/email-digests">{() => <EmailDigests />}</Route>
        <Route path="/achievements">{() => <Achievements />}</Route>
        <Route path="/leaderboard">{() => <Leaderboard />}</Route>
        <Route path="/organization-leaderboard">{() => <OrganizationLeaderboard />}</Route>
        <Route path="/volunteer-messages">{() => <VolunteerMessages />}</Route>
        <Route path="/volunteer-messages/pwa">{() => <VolunteerMessagesPWA />}</Route>
      </Suspense>
    </Layout>
  );
}
