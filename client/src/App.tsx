import { Route, Router, useLocation } from "wouter";
import { useEffect } from "react";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import { volunteerOnboardingSteps, organizationOnboardingSteps } from "@shared/onboarding-steps";
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
import ProjectEdit from "@/pages/project-edit";
import VolunteerIntake from "@/pages/volunteer-intake";
import OrganizationIntake from "@/pages/organization-intake";
import OrganizationProfileSettings from "@/pages/organization-profile-settings";
import VolunteerProfileSettings from "@/pages/volunteer-profile-settings";
import Opportunities from "@/pages/opportunities";
import OpportunityDetail from "@/pages/opportunity-detail";
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
import Leaderboard from "@/pages/leaderboard";
import OrganizationLeaderboard from "@/pages/organization-leaderboard";
import DiscoverOpportunities from "@/pages/discover-opportunities";
import SDGMapping from "@/pages/sdg-mapping";
import CSRDashboard from "@/pages/csr-dashboard";
import CorporatePartnerIntake from "@/pages/corporate-partner-intake";
import CorporatePartnerProfileSettings from "@/pages/corporate-partner-profile-settings";
import NotFound from "@/pages/not-found";

function RootRedirectRoute() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      // Check if user has completed intake
      const checkIntakeAndRedirect = async () => {
        const userId = localStorage.getItem('currentUserId');
        const userType = localStorage.getItem('userType');
        
        try {
          if (!userId || !userType) {
            setLocation('/landing');
            return;
          }

          // Fetch intake completion status
          const endpoint = userType === 'volunteer' 
            ? `/api/intake/volunteer-profile?userId=${userId}`
            : `/api/organizations?managerId=${userId}`;
          
          const response = await fetch(endpoint);
          
          if (!response.ok) {
            // If no profile exists, go to intake
            const intakePath = userType === 'volunteer' ? '/volunteer-intake' : '/organization-intake';
            setLocation(intakePath);
            return;
          }

          const data = await response.json();
          
          // Check if intake is complete
          const profile = userType === 'volunteer' ? data.volunteerProfile : data;
          const isIntakeComplete = profile?.onboardingCompleted === true;
          
          if (!isIntakeComplete) {
            // Redirect to intake if not complete
            let intakePath = '/dashboard';
            if (userType === 'volunteer') intakePath = '/volunteer-intake';
            else if (userType === 'organization') intakePath = '/organization-intake';
            else if (userType === 'corporate-partner') intakePath = '/corporate-partner-intake';
            setLocation(intakePath);
          } else {
            // Intake complete, go to appropriate dashboard based on user type
            if (userType === 'corporate-partner') {
              setLocation('/csr-dashboard');
            } else {
              setLocation('/dashboard');
            }
          }
        } catch (error) {
          console.error('Error checking intake status:', error);
          const defaultDashboard = userType === 'corporate-partner' ? '/csr-dashboard' : '/dashboard';
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
  const steps = userType === 'organization' ? organizationOnboardingSteps : volunteerOnboardingSteps;

  return (
    <SidebarProvider>
      <OnboardingProvider steps={steps}>
        <Router>
          <Route path="/" component={RootRedirectRoute} />
          <Route path="/login" component={Login} />
          <Route path="/landing" component={Landing} />
          <Route path="/csr-dashboard" component={CSRDashboard} />
          <Route component={LayoutRoute} />
        </Router>
      </OnboardingProvider>
    </SidebarProvider>
  );
}

function LayoutRoute() {
  return (
    <Layout>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/volunteer-profile-settings" component={VolunteerProfileSettings} />
      <Route path="/organization-profile-settings" component={OrganizationProfileSettings} />
      <Route path="/corporate-partner-profile-settings" component={CorporatePartnerProfileSettings} />
      <Route path="/my-work" component={MyWork} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id/edit" component={ProjectEdit} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/volunteer-intake" component={VolunteerIntake} />
      <Route path="/organization-intake" component={OrganizationIntake} />
      <Route path="/corporate-partner-intake" component={CorporatePartnerIntake} />
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/discover-opportunities" component={DiscoverOpportunities} />
      <Route path="/opportunities/:id" component={OpportunityDetail} />
      <Route path="/applications" component={Applications} />
      <Route path="/my-applications" component={MyApplications} />
      <Route path="/organizations" component={Organizations} />
      <Route path="/volunteers" component={Volunteers} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/impact-report/:volunteerId?" component={ImpactReport} />
      <Route path="/organization-impact-report/:organizationId?" component={OrganizationImpactReport} />
      <Route path="/mobile-data-collection" component={MobileDataCollection} />
      <Route path="/impact-visualization" component={ImpactVisualization} />
      <Route path="/impact-storytelling" component={ImpactStorytellingPage} />
      <Route path="/assignments" component={Assignments} />
      <Route path="/matched-volunteers" component={MatchedVolunteers} />
      <Route path="/email-digests" component={EmailDigests} />
      <Route path="/achievements" component={Achievements} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/organization-leaderboard" component={OrganizationLeaderboard} />
      <Route path="/sdg-mapping" component={SDGMapping} />
    </Layout>
  );
}
