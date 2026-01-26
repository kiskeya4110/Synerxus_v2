import { useEffect } from "react";
import { useLocation } from "wouter";

// PWA route now redirects to main CSR dashboard which handles mobile detection
export default function CSRDashboardPWA() {
  const [, navigate] = useLocation();
  const userType = localStorage.getItem("userType");

  useEffect(() => {
    // Redirect to appropriate dashboard based on user type
    if (userType === "volunteer") {
      navigate("/volunteer-dashboard");
    } else if (userType === "organization") {
      navigate("/organization-dashboard");
    } else {
      // Corporate partners go to main CSR dashboard which has MVP mobile view
      navigate("/csr-dashboard");
    }
  }, [userType, navigate]);

  return null;
}
