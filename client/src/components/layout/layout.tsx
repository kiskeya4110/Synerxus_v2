import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "./header";
import Sidebar from "./sidebar";
import Footer from "./footer";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Public routes that don't require authentication
  const publicRoutes = [
    "/", 
    "/login", 
    "/sdg-mapping", 
    "/impact-visualization", 
    "/mobile-data-collection", 
    "/impact-storytelling", 
    "/field-specific-metrics"
  ];
  
  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard"];
  
  const isPublicRoute = publicRoutes.includes(location);
  const isProtectedRoute = protectedRoutes.some(route => location.startsWith(route));
  
  // Redirect to login if user is not authenticated and trying to access protected route
  // Redirect to dashboard after successful login
  useEffect(() => {
    if (!loading && !user && isProtectedRoute) {
      setLocation("/login");
    }
    // Redirect authenticated users from landing to dashboard
    if (!loading && user && location === "/") {
      setLocation("/dashboard");
    }
  }, [user, loading, location, setLocation, isProtectedRoute]);

  // Pages without layout (landing and login)
  if (location === "/" || location === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
          <div className="max-w-full">
            {children}
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
