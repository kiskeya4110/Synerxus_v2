import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import VolunteerDashboard from "./volunteer-dashboard";
import OrganizationDashboard from "./organization-dashboard";
import CSRDashboard from "./csr-dashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const userType = localStorage.getItem('userType');

  // Route to appropriate dashboard based on user type
  if (userType === 'volunteer') {
    return <VolunteerDashboard />;
  } else if (userType === 'organization') {
    return <OrganizationDashboard />;
  } else if (userType === 'corporate-partner') {
    return <CSRDashboard />;
  }

  // Fallback redirect if no user type
  navigate('/landing');
  return null;
}
