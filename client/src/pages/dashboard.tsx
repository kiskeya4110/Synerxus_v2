import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, lazy, Suspense } from "react";

// Lazy load dashboard components to reduce main bundle size
const VolunteerDashboard = lazy(() => import("./volunteer-dashboard"));
const OrganizationDashboard = lazy(() => import("./organization-dashboard"));
const CSRDashboard = lazy(() => import("./csr-dashboard"));

// Loading fallback for dashboards
const DashboardLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

export default function Dashboard() {
  // All hooks must be called unconditionally at the top
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [userType, setUserType] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Read userType in useEffect to avoid hydration issues and ensure hooks run first
  useEffect(() => {
    const storedUserType = localStorage.getItem('userType');
    setUserType(storedUserType);
    setIsInitialized(true);

    // Redirect if no user type
    if (!storedUserType) {
      navigate('/landing');
    }
  }, [navigate]);

  // Wait for initialization before rendering
  if (!isInitialized) {
    return null;
  }

  // Route to appropriate dashboard based on user type
  if (userType === 'volunteer') {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <VolunteerDashboard />
      </Suspense>
    );
  } else if (userType === 'organization') {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <OrganizationDashboard />
      </Suspense>
    );
  } else if (userType === 'corporate-partner') {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <CSRDashboard />
      </Suspense>
    );
  }

  return null;
}
