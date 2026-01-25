import { useEffect } from "react";
import { useLocation } from "wouter";

// PWA route now redirects to main dashboard which handles mobile detection
export default function OrganizationDashboardPWANew() {
  const [, navigate] = useLocation();
  const userType = localStorage.getItem("userType");

  useEffect(() => {
    // Redirect to appropriate dashboard based on user type
    if (userType === "corporate-partner") {
      navigate("/csr-dashboard");
    } else if (userType === "volunteer") {
      navigate("/volunteer-dashboard");
    } else {
      // Organization users go to main dashboard which has simple mobile view
      navigate("/organization-dashboard");
    }
  }, [userType, navigate]);

  return null;
}
