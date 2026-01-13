import { ReactNode, useState, useCallback } from "react";
import { useLocation } from "wouter";
import OrganizationPWAHeader from "./organization-pwa-header";
import OrganizationPWANav from "./organization-pwa-nav";

/**
 * OrganizationPWALayout - Standard layout wrapper for organization PWA pages.
 *
 * WHEN TO USE THIS LAYOUT:
 * - For standard organization PWA pages that need the consistent header and navigation
 * - Examples: projects.tsx, volunteers.tsx, sdg-mapping.tsx, overview.tsx
 *
 * WHEN NOT TO USE (use OrganizationPWAHeader + OrganizationPWANav directly):
 * - For complex pages that need custom scroll behavior (e.g., chat/messages pages)
 * - When the page needs to manage its own container structure
 * - Example: organization-messages-pwa.tsx uses components directly for chat functionality
 *
 * To prevent inconsistent PWA layouts:
 * - Always check userType === 'organization' and isMobile before rendering this layout
 * - Ensure the navigation activeTab matches the current page
 */
interface OrganizationPWALayoutProps {
  children: ReactNode;
  activeTab?: 'home' | 'projects' | 'potential' | 'volunteers' | 'sdgs' | 'messages' | 'leaderboard';
  organizationName?: string;
  organizationLogo?: string;
  onRefresh?: () => Promise<void>;
  metrics?: {
    activeProjects?: number;
    activeVolunteers?: number;
    totalAiu?: number;
    totalHours?: number;
    sdgsAddressed?: number;
  };
  hideNav?: boolean;
}

export default function OrganizationPWALayout({
  children,
  activeTab,
  organizationName,
  organizationLogo,
  onRefresh,
  metrics,
  hideNav = false,
}: OrganizationPWALayoutProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  }, [onRefresh]);

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full bg-[#faf9f7] text-slate-800 flex flex-col overflow-hidden">
      {/* Centered App Container */}
      <div className="relative w-full h-full max-w-[428px] mx-auto flex flex-col overflow-hidden">
        {/* Shared Header */}
        <OrganizationPWAHeader
          organizationName={organizationName}
          organizationLogo={organizationLogo}
          onRefresh={onRefresh ? handleRefresh : undefined}
          isRefreshing={isRefreshing}
          metrics={metrics}
        />

        {/* Spacer for sticky header - matches header height (pb-3 = 12px + h-10 logo = 40px + safe-area + pt = 12px) */}
        <div className="flex-shrink-0" style={{ height: 'calc(env(safe-area-inset-top, 0px) + 64px)' }} />

        {/* Main Content - scrollable area between header and nav */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{
            paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {children}
        </main>

        {/* Bottom Navigation */}
        {!hideNav && <OrganizationPWANav activeTab={activeTab} />}
      </div>
    </div>
  );
}
