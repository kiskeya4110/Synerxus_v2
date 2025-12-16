import { Route, Router, useLocation } from "wouter";
import { useEffect } from "react";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import { volunteerOnboardingSteps, organizationOnboardingSteps, csrOnboardingSteps } from "@shared/onboarding-steps";
import OnboardingGuide from "@/components/onboarding/onboarding-guide";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import MyWork from "@/pages/my-work";
import Tasks from "@/pages/tasks";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import ProjectDetailPWA from "@/pages/project-detail-pwa";
import ProjectEdit from "@/pages/project-edit";
import VolunteerIntake from "@/pages/volunteer-intake";
import OrganizationIntake from "@/pages/organization-intake";
import OrganizationProfileSettings from "@/pages/organization-profile-settings";
import VolunteerProfileSettings from "@/pages/volunteer-profile-settings";
import Opportunities from "@/pages/opportunities";
import OpportunityDetail from "@/pages/opportunity-detail";
import OpportunityDetailPWA from "@/pages/opportunity-detail-pwa";
import Applications from "@/pages/applications";
import MyApplications from "@/pages/my-applications";
import Organizations from "@/pages/organizations";
import Volunteers from "@/pages/volunteers";
import Calendar from "@/pages/calendar";
import ImpactReport from "@/pages/impact-report";
import OrganizationImpactReport from "@/pages/organization-impact-report";
import MobileDataCollection from "@/pages/mobile-data-collection";
import ImpactVisualization from "@/pages/impact-visualization";
import ImpactStorytellingPage from "@/pages/impact-storytelling";
import Assignments from "@/pages/assignments";
import MatchedVolunteers from "@/pages/matched-volunteers";
import EmailDigests from "@/pages/email-digests";
import Achievements from "@/pages/achievements";
import LogActivity from "@/pages/log-activity";
import Leaderboard from "@/pages/leaderboard";
import OrganizationLeaderboard from "@/pages/organization-leaderboard";
import DiscoverOpportunities from "@/pages/discover-opportunities";
import DiscoverOpportunitiesPWA from "@/pages/discover-opportunities-pwa";
import SDGMapping from "@/pages/sdg-mapping";
import CSRDashboard from "@/pages/csr-dashboard";
import CSRDashboardPWA from "@/pages/csr-dashboard-pwa";
import VolunteerDashboard from "@/pages/volunteer-dashboard";
import OrganizationDashboard from "@/pages/organization-dashboard";
import { CSRImpactReporting } from "@/pages/csr-impact-reporting";
import ProjectPortfolio from "@/pages/project-portfolio";
import CSRReportsExports from "@/pages/csr-reports-exports";
import CorporatePartnerIntake from "@/pages/corporate-partner-intake";
import CorporatePartnerProfileSettings from "@/pages/corporate-partner-profile-settings";
import TeamOverview from "@/pages/team-overview";
import Overview from "@/pages/overview";
import OrganizationMessages from "@/pages/organization-messages";
import OrganizationMessagesPWA from "@/pages/organization-messages-pwa";
import OrganizationDashboardPWA from "@/pages/organization-dashboard-pwa";
import VolunteerMessages from "@/pages/volunteer-messages";
import VolunteerMessagesPWA from "@/pages/volunteer-messages-pwa";
import CSRMessagesPWA from "@/pages/csr-messages-pwa";
import VolunteerLeaderboardPWA from "@/pages/volunteer-leaderboard-pwa";
import EmployeeEngagementTabPage from "@/pages/employee-engagement-tab-page";
import NotFound from "@/pages/not-found";
import Stories from "@/pages/stories";
import CreateStory from "@/pages/create-story";
import StoryDetail from "@/pages/story-detail";

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
        <Router>
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
        </Router>
      </OnboardingProvider>
    </SidebarProvider>
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
      {/* Intake Forms */}
      <Route path="/volunteer-intake" component={VolunteerIntake} />
      <Route path="/organization-intake" component={OrganizationIntake} />
      <Route path="/corporate-partner-intake" component={CorporatePartnerIntake} />
      {/* Opportunities */}
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/discover-opportunities" component={DiscoverOpportunities} />
      <Route path="/opportunities/:id" component={OpportunityDetail} />
      {/* Applications */}
      <Route path="/applications" component={Applications} />
      <Route path="/my-applications" component={MyApplications} />
      <Route path="/organizations" component={Organizations} />
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
