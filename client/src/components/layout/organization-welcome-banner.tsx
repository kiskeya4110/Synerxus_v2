import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useCurrentUserId } from "@/hooks/use-current-user-id";

interface OrganizationWelcomeBannerProps {
  className?: string;
  pageTitle?: string;
}

export default function OrganizationWelcomeBanner({ className = "", pageTitle = "Verify Hub" }: OrganizationWelcomeBannerProps) {
  const userId = useCurrentUserId();

  // Fetch organization data
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  const { data: organization } = useQuery<any>({
    queryKey: ["/api/organizations", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(`/api/organizations/${currentUser.organizationId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
    staleTime: 60000,
  });

  // Fetch organization profile for logo
  const { data: organizationProfile } = useQuery<any>({
    queryKey: ["/api/organization-profiles/user", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/organization-profiles/user/${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  const organizationName = organization?.name || organizationProfile?.organizationName || currentUser?.displayName || "Organization";
  const logoUrl = organizationProfile?.logoUrl || organization?.logoUrl || currentUser?.avatar;

  // Don't render on mobile devices
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    return null;
  }

  return (
    <div className={`hidden md:block ${className}`} style={{ padding: '16px 24px 0 24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 25%, #bbf7d0 50%, #f0fdf4 75%, #fafafa 100%)',
        padding: '20px 28px',
        borderRadius: '16px',
        border: '1px solid rgba(34, 197, 94, 0.2)',
        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}>
        {/* Organization Logo */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '12px',
          backgroundColor: logoUrl ? 'transparent' : 'rgba(22, 101, 52, 0.1)',
          border: '2px solid rgba(22, 101, 52, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={organizationName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Building2 size={28} style={{ color: '#166534' }} />
          )}
        </div>

        {/* Welcome Text */}
        <div>
          <p style={{ fontSize: '14px', fontWeight: '500', color: '#166534', margin: 0, letterSpacing: '0.5px' }}>
            Welcome Back,
          </p>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#14532d', margin: '2px 0 0 0' }}>
            {organizationName}
          </h1>
          <p style={{ fontSize: '13px', fontWeight: '500', color: '#15803d', margin: '2px 0 0 0', opacity: 0.85 }}>
            {pageTitle}
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
