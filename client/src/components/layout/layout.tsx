import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "./header";
import Sidebar from "./sidebar";
import MobileNav from "./mobile-nav";
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
    if (!loading && !user && isProtectedRoute) {
      setLocation("/login");
    }
    if (!loading && user && location === "/") {
      setLocation("/dashboard");
    }
  }, [user, loading, location, setLocation, isProtectedRoute]);

  useEffect(() => {
    if (location === "/dashboard" && !loading && user && !isCompleted) {
      const hasSeenOnboarding = localStorage.getItem('onboarding_completed');
      if (!hasSeenOnboarding) {
        const timer = setTimeout(() => {
          startOnboarding();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [location, loading, user, isCompleted, startOnboarding]);

  if (location === "/" || location === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden bg-background">
          <div className="safe-area-x px-3 sm:px-4 md:px-6 pt-[72px] md:pt-20 pb-24">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
          <Footer />
        </main>
      </div>
      <MobileNav />
      <OnboardingGuide />
    </div>
  );
}
