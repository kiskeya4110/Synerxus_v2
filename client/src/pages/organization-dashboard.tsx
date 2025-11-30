import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import VolunteerDashboard from "./volunteer-dashboard";

export default function OrganizationDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const userType = localStorage.getItem('userType');

  // Redirect non-organization users
  if (userType !== 'organization') {
    if (userType === 'volunteer') {
      navigate('/volunteer-dashboard');
    } else if (userType === 'corporate-partner') {
      navigate('/csr-dashboard');
    } else {
      navigate('/dashboard');
    }
    return null;
  }

  // For organizations, use the volunteer dashboard component as the base
  // (both have similar structure with projects and impact tracking)
  return <VolunteerDashboard />;
}
