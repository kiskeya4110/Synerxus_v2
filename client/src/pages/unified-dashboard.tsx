import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

// Layout Components
import VolunteerNav from "@/components/layout/volunteer-nav";
import OrganizationNav from "@/components/layout/organization-nav";
import Footer from "@/components/layout/footer";

// Shared Dashboard Components
import DashboardHeader from "@/components/dashboard/shared/DashboardHeader";
import DashboardMobileNav from "@/components/dashboard/shared/DashboardMobileNav";

// Role-Specific View Components
import VolunteerView from "@/components/dashboard/views/VolunteerView";
import OrganizationView from "@/components/dashboard/views/OrganizationView";
import CorporateView from "@/components/dashboard/views/CorporateView";

// Hooks
import { useAuth } from "@/hooks/use-auth";
import { useViewportDetection } from "@/hooks/use-mobile";
import { LoadingState, ErrorState } from "@/components/ui/empty-state";
import { getAuthHeaders } from "@/lib/queryClient";

/**
 * UnifiedDashboard - Single entry point that renders role-appropriate content
 *
 * Role Detection:
 * - Reads userType from localStorage (set during signup/login)
 * - Conditionally renders VolunteerView, OrganizationView, or CorporateView
 *
 * Access Control:
 * - Volunteer: Log Impact (self), Project Matches, Hours Tracking
 * - Organization: Verification Queue, Project Management, Log Hours for Others
 * - Corporate: Verified Outcomes (read-only), ESG Reports
 */
export default function UnifiedDashboard() {
  const { user, dbUser, loading: authLoading, signOut } = useAuth();
  const [, navigate] = useLocation();
  const { isMobile, isLoading: isViewportLoading } = useViewportDetection();

  // Use dbUser from auth sync as authoritative source
  // Only fall back to localStorage when auth is fully resolved and no Firebase user exists (legacy mode)
  // This prevents stale localStorage userId from being used before Firebase auth resolves
  const userId = dbUser?.id?.toString() || (
    !authLoading && !user ? localStorage.getItem("currentUserId") : null
  );
  const userType = (dbUser as any)?.userType || localStorage.getItem("userType");

  // Volunteer-specific state
  const [mobileTab, setMobileTab] = useState<'home' | 'wallet' | 'projects' | 'history'>('home');

  // Organization-specific state
  const [orgTab, setOrgTab] = useState<'home' | 'verify' | 'volunteers' | 'hours'>('home');

  // Corporate-specific state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Listen for tab navigation events from notification bell
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail;
      if (userType === 'organization' && tab === 'verify') {
        setOrgTab('verify');
      }
    };
    window.addEventListener('navigate-tab', handler);
    return () => window.removeEventListener('navigate-tab', handler);
  }, [userType]);

  // Fetch current user data - wait for auth to resolve to use correct userId
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/users/me`, { headers, credentials: "include" });
        if (!response.ok) return null;
        return response.json();
      } catch (error) {
        console.warn("Failed to fetch user:", error);
        return null;
      }
    },
    enabled: !!userId && !authLoading,
  });

  // Fetch organization data (for organization users)
  const { data: organization } = useQuery({
    queryKey: ["/api/organizations", currentUser?.organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/organizations?id=${currentUser.organizationId}`);
      if (!response.ok) throw new Error("Organization not found");
      const data = await response.json();
      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!currentUser?.organizationId && userType === 'organization',
  });

  // Demo user fallback for each role
  const demoUser = useMemo(() => {
    if (!userId) return null;

    if (userType === "volunteer" && !currentUser) {
      return {
        id: parseInt(userId),
        displayName: "Demo Volunteer",
        email: "demo@example.com",
        userType: "volunteer",
      };
    }

    if (userType === "organization" && !currentUser) {
      return {
        id: parseInt(userId),
        displayName: "Demo Organization",
        email: "demo-org@example.com",
        userType: "organization",
        organizationId: 1,
      };
    }

    if (userType === "corporate-partner" && !currentUser) {
      return {
        id: parseInt(userId),
        displayName: "Demo Corporate",
        email: "demo-corp@example.com",
        userType: "corporate-partner",
      };
    }

    return null;
  }, [userId, userType, currentUser]);

  const activeUser = currentUser || demoUser;

  // Loading state - wait for auth, viewport detection, user data, and Firebase sync
  if (authLoading || isViewportLoading || (user && !dbUser) || (isLoadingUser && !demoUser)) {
    return (
      <div className="min-h-screen pwa-gradient-bg flex items-center justify-center">
        <LoadingState message="Loading your dashboard..." />
      </div>
    );
  }

  // Auth check
  if (!userId || !activeUser) {
    return (
      <div className="min-h-screen pwa-gradient-bg flex items-center justify-center">
        <ErrorState
          title="Not Authenticated"
          message="Please log in to view your dashboard."
          retry={() => navigate("/login")}
        />
      </div>
    );
  }

  // Mobile PWA View - Role-specific with shared header and nav
  if (isMobile === true) {
    return (
      <div className="min-h-screen pwa-gradient-bg pb-20">
        {/* Shared Header - adapts based on userType */}
        <DashboardHeader
          userType={userType}
          displayName={activeUser?.displayName}
          organizationName={organization?.name}
          onRefresh={userType === 'corporate-partner' ? async () => {
            setIsRefreshing(true);
            // Trigger refetch in CorporateView
            setTimeout(() => setIsRefreshing(false), 1000);
          } : undefined}
          isRefreshing={isRefreshing}
        />

        {/* Spacer for sticky header */}
        <div className="flex-shrink-0" style={{ height: 'calc(env(safe-area-inset-top, 0px) + 64px)' }} />

        {/* Role-specific content - only one renders */}
        {userType === 'volunteer' && (
          <VolunteerView
            userId={userId}
            isMobile={true}
            activeUser={activeUser}
            mobileTab={mobileTab}
            setMobileTab={setMobileTab}
          />
        )}

        {userType === 'organization' && (
          <OrganizationView
            userId={userId}
            isMobile={true}
            activeUser={activeUser}
            organization={organization}
            orgTab={orgTab}
            setOrgTab={(tab: string) => setOrgTab(tab as 'home' | 'verify' | 'volunteers' | 'hours')}
          />
        )}

        {userType === 'corporate-partner' && (
          <CorporateView
            userId={userId}
            isMobile={true}
            activeUser={activeUser}
            isRefreshing={isRefreshing}
          />
        )}

        {/* Shared Bottom Nav - adapts based on userType */}
        <DashboardMobileNav
          userType={userType}
          activeTab={userType === 'volunteer' ? mobileTab : userType === 'organization' ? (orgTab === 'volunteers' || orgTab === 'hours' ? 'home' : orgTab) : 'home'}
          onLogImpact={userType === 'volunteer' ? () => navigate('/log-activity') : undefined}
          onTabChange={
            userType === 'volunteer'
              ? (tab: string) => setMobileTab(tab as 'home' | 'wallet' | 'projects' | 'history')
              : userType === 'organization'
                ? (tab: string) => setOrgTab(tab as 'home' | 'verify' | 'volunteers' | 'hours')
                : undefined
          }
        />
      </div>
    );
  }

  // Desktop View - Role-specific with appropriate navigation
  return (
    <div className="min-h-screen bg-background">
      {/* Role-specific navigation */}
      {userType === 'volunteer' && <VolunteerNav />}
      {userType === 'organization' && <OrganizationNav />}
      {userType === 'corporate-partner' && <VolunteerNav />} {/* Corporate uses simpler nav */}

      {/* Role-specific content - only one renders */}
      {userType === 'volunteer' && (
        <VolunteerView
          userId={userId}
          isMobile={false}
          activeUser={activeUser}
          mobileTab={mobileTab}
          setMobileTab={setMobileTab}
        />
      )}

      {userType === 'organization' && (
        <OrganizationView
          userId={userId}
          isMobile={false}
          activeUser={activeUser}
          organization={organization}
          orgTab={orgTab}
          setOrgTab={(tab: string) => setOrgTab(tab as 'home' | 'verify' | 'volunteers' | 'hours')}
        />
      )}

      {userType === 'corporate-partner' && (
        <CorporateView
          userId={userId}
          isMobile={false}
          activeUser={activeUser}
          isRefreshing={isRefreshing}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
