import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "./header";
import Sidebar from "./sidebar";
import MobileNav from "./mobile-nav";
import VolunteerNav from "./volunteer-nav";
import VolunteerBottomNav from "./volunteer-bottom-nav";
import Footer from "./footer";
import OnboardingGuide from "@/components/onboarding/onboarding-guide";
import { useAuth } from "@/hooks/use-auth";
import { useOnboarding } from "@/hooks/use-onboarding";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const { startOnboarding, isCompleted } = useOnboarding();
  const currentUserId = localStorage.getItem('currentUserId');

  // Check both Firebase user AND localStorage userId for auth state
  const isAuthenticated = user || currentUserId;

  const publicRoutes = [
    "/",
    "/login",
    "/sdg-mapping",
    "/impact-visualization",
    "/mobile-data-collection",
    "/impact-storytelling",
    "/field-specific-metrics"
  ];

  const protectedRoutes = ["/dashboard"];

  const isPublicRoute = publicRoutes.includes(location);
  const isProtectedRoute = protectedRoutes.some(route => location.startsWith(route));

  useEffect(() => {
    if (!loading && !isAuthenticated && isProtectedRoute) {
      setLocation("/login");
    }
    if (!loading && isAuthenticated && location === "/") {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, loading, location, setLocation, isProtectedRoute]);

  useEffect(() => {
    if (location === "/dashboard" && !loading && isAuthenticated && !isCompleted) {
      const hasSeenOnboarding = localStorage.getItem('onboarding_completed');
      if (!hasSeenOnboarding) {
        const timer = setTimeout(() => {
          startOnboarding();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [location, loading, isAuthenticated, isCompleted, startOnboarding]);

  // Routes that are completely standalone (public/login pages, or pages that handle their own layout entirely)
  const fullyStandaloneRoutes = [
    "/", "/login", "/landing",
    // CSR/Corporate Partner routes
    "/csr-dashboard", "/csr-dashboard-pwa", "/team-overview",
    "/csr-impact-reporting", "/project-portfolio", "/csr-reports-exports",
    "/corporate-partner-profile-settings", "/corporate-partner-intake",
    // Organization routes
    "/organization-dashboard", "/overview", "/organization-my-work",
    "/organization-messages", "/organization-profile-settings", "/organization-intake",
    "/organization-impact-report", "/organization-leaderboard",
    "/volunteers", "/applications",
    "/employee-engagement-tab",
    // Volunteer routes - all have their own VolunteerNav
    "/volunteer-dashboard", "/volunteer-profile-settings", "/volunteer-intake", "/volunteer-messages",
    "/my-work", "/log-activity", "/tasks", "/assignments",
    "/leaderboard", "/profile", "/impact-report", "/stories",
    "/calendar", "/achievements", "/my-applications",
    // Shared pages with own navigation
    "/sdg-mapping", "/impact-visualization",
    "/discover-opportunities", "/matched-volunteers",
    // Project and opportunity detail pages
    "/projects", "/opportunities",
    // Public pages with own layout
    "/organizations", "/help",
    // PWA routes
    "/pwa"
  ];

  // Check if route matches standalone patterns (including PWA pages like /opportunities/123/pwa)
  const isPwaRoute = location.endsWith('/pwa');
  const isFullyStandalone = isPwaRoute || fullyStandaloneRoutes.some(route =>
    location === route ||
    location.startsWith(route + "/") ||
    (route !== "/" && location.startsWith(route))
  );

  if (isFullyStandalone) {
    // Render just the children - these routes have their own complete layout
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background overflow-x-hidden w-full max-w-full">
      <Header />
      <VolunteerNav />
      <div className="flex flex-1 overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col bg-background overflow-x-hidden">
          <div className="flex-1 safe-area-x px-3 sm:px-4 md:px-6 pt-4 md:pt-6 pb-8 overflow-x-hidden">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
          <div className="hidden md:block">
            <Footer />
          </div>
        </main>
      </div>
      <MobileNav />
      <VolunteerBottomNav />
      <OnboardingGuide />
    </div>
  );
}
