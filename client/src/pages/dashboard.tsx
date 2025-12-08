import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import VolunteerDashboard from "./volunteer-dashboard";
import OrganizationDashboard from "./organization-dashboard";
import CSRDashboard from "./csr-dashboard";

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
    return <VolunteerDashboard />;
  } else if (userType === 'organization') {
    return <OrganizationDashboard />;
  } else if (userType === 'corporate-partner') {
    return <CSRDashboard />;
  }

  return null;
}
