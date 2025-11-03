import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import FieldSpecificMetrics from "@/pages/field-specific-metrics";
import Opportunities from "@/pages/opportunities";
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
import Layout from "@/components/layout/layout";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SidebarProvider } from "@/contexts/sidebar-context";

function Router() {
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
      <Route path="/field-specific-metrics" component={FieldSpecificMetrics} />
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/discover-opportunities" component={DiscoverOpportunities} />
      <Route path="/post-core-opportunity" component={PostCoreOpportunity} />
      <Route path="/post-urgent-opportunity" component={PostUrgentOpportunity} />
      <Route path="/my-tasks" component={MyTasks} />
      <Route path="/profile" component={Profile} />
      <Route path="/volunteer-profile" component={VolunteerProfile} />
      <Route path="/organization-profile" component={OrganizationProfile} />
      <Route path="/volunteer-intake" component={VolunteerIntake} />
      <Route path="/organization-intake" component={OrganizationIntake} />
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
