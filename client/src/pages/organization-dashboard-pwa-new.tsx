import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import OrganizationMobileView from "@/components/organization/organization-mobile-view";
import { LoadingState } from "@/components/ui/empty-state";

export default function OrganizationDashboardPWANew() {
  const [, navigate] = useLocation();
  const userId = localStorage.getItem("currentUserId");
  const userType = localStorage.getItem("userType");

  // Redirect non-organization users
  useEffect(() => {
    if (userType && userType !== "organization") {
      if (userType === "corporate-partner") {
        navigate("/csr-dashboard-pwa");
      } else {
        navigate("/volunteer-dashboard");
      }
    }
  }, [userType, navigate]);

  // Fetch user to get organization ID
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading..." />
      </div>
    );
  }

  // Auth check
  if (!userId) {
    navigate("/login");
    return null;
  }

  return (
    <OrganizationMobileView
      userId={userId}
      organizationId={currentUser?.organizationId}
    />
  );
}
