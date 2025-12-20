import { ReactNode, useState, useCallback } from "react";
import { useLocation } from "wouter";
import OrganizationPWAHeader from "./organization-pwa-header";
import OrganizationPWANav from "./organization-pwa-nav";

interface OrganizationPWALayoutProps {
  children: ReactNode;
  activeTab?: 'home' | 'projects' | 'potential' | 'volunteers' | 'sdgs' | 'messages' | 'leaderboard';
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
    <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full bg-[#faf9f7] text-slate-800 flex flex-col overflow-x-hidden overflow-y-auto z-40">
      {/* Centered App Container */}
      <div className="relative w-full h-full max-w-[428px] mx-auto flex flex-col">
        {/* Shared Header */}
        <OrganizationPWAHeader
          onRefresh={onRefresh ? handleRefresh : undefined}
          isRefreshing={isRefreshing}
          metrics={metrics}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>

        {/* Bottom Navigation */}
        {!hideNav && <OrganizationPWANav activeTab={activeTab} />}
      </div>
    </div>
  );
}
