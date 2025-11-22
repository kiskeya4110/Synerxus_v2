import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Projects from "@/pages/projects";
import Tasks from "@/pages/tasks";
import Volunteers from "@/pages/volunteers";
import Organizations from "@/pages/organizations";
import Calendar from "@/pages/calendar";
import SDGMapping from "@/pages/sdg-mapping";
import ImpactVisualization from "@/pages/impact-visualization";
import MobileDataCollection from "@/pages/mobile-data-collection";
import ImpactStorytelling from "@/pages/impact-storytelling";
import ImpactReportGenerator from "@/pages/impact-report-generator";
import FieldSpecificMetrics from "@/pages/field-specific-metrics";
import Opportunities from "@/pages/opportunities";
import OpportunityDetail from "@/pages/opportunity-detail";
import CountryOpportunities from "@/pages/country-opportunities";
import DiscoverOpportunities from "@/pages/discover-opportunities";
import MyTasks from "@/pages/my-tasks";
import Profile from "@/pages/profile";
import VolunteerProfile from "@/pages/volunteer-profile";
import OrganizationProfile from "@/pages/organization-profile";
import ProjectDetail from "@/pages/project-detail";
import ProjectEdit from "@/pages/project-edit";
import VolunteerIntake from "@/pages/volunteer-intake";
import OrganizationIntake from "@/pages/organization-intake";
import PostCoreOpportunity from "@/pages/post-core-opportunity";
import PostUrgentOpportunity from "@/pages/post-urgent-opportunity";
import Applications from "@/pages/applications";
import MyApplications from "@/pages/my-applications";
import Assignments from "@/pages/assignments";
import MyWork from "@/pages/my-work";
import ImpactReport from "@/pages/impact-report";
import OrganizationImpactReport from "@/pages/organization-impact-report";
import MatchedVolunteers from "@/pages/matched-volunteers";
import Layout from "@/components/layout/layout";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SidebarProvider } from "@/contexts/sidebar-context";

const LAST_ROUTE_KEY = "synerxus_last_route";

function Router() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    localStorage.setItem(LAST_ROUTE_KEY, location);
  }, [location]);

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/projects/:id/edit" component={ProjectEdit} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/projects" component={Projects} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/volunteers" component={Volunteers} />
      <Route path="/organizations" component={Organizations} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/sdg-mapping" component={SDGMapping} />
      <Route path="/impact-visualization" component={ImpactVisualization} />
      <Route path="/mobile-data-collection" component={MobileDataCollection} />
      <Route path="/impact-storytelling" component={ImpactStorytelling} />
      <Route path="/impact-report-generator" component={ImpactReportGenerator} />
      <Route path="/field-specific-metrics" component={FieldSpecificMetrics} />
      <Route path="/opportunities/:id" component={OpportunityDetail} />
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/country/:country" component={CountryOpportunities} />
      <Route path="/discover-opportunities" component={DiscoverOpportunities} />
      <Route path="/post-core-opportunity" component={PostCoreOpportunity} />
      <Route path="/post-urgent-opportunity" component={PostUrgentOpportunity} />
      <Route path="/applications" component={Applications} />
      <Route path="/my-applications" component={MyApplications} />
      <Route path="/assignments" component={Assignments} />
      <Route path="/matched-volunteers" component={MatchedVolunteers} />
      <Route path="/my-tasks" component={MyTasks} />
      <Route path="/my-work" component={MyWork} />
      <Route path="/impact-report/:volunteerId" component={ImpactReport} />
      <Route path="/impact-report" component={ImpactReport} />
      <Route path="/organization-impact-report/:organizationId" component={OrganizationImpactReport} />
      <Route path="/organization-impact-report" component={OrganizationImpactReport} />
      <Route path="/profile" component={Profile} />
      <Route path="/volunteer-profile" component={VolunteerProfile} />
      <Route path="/organization-profile" component={OrganizationProfile} />
      <Route path="/volunteer-intake" component={VolunteerIntake} />
      <Route path="/organization-intake" component={OrganizationIntake} />
      <Route path="/volunteer-profile-settings" component={VolunteerIntake} />
      <Route path="/organization-profile-settings" component={OrganizationIntake} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <SidebarProvider>
            <TooltipProvider>
              <Toaster />
              <Layout>
                <Router />
              </Layout>
            </TooltipProvider>
          </SidebarProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
