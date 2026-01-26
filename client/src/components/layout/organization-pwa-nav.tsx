import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Home, FolderOpen, Users, Target, MoreHorizontal, X, Shield, MessageCircle, Settings, BarChart3, ClipboardList, Plus, AlertCircle, TrendingUp, Globe } from "lucide-react";

interface OrganizationPWANavProps {
  activeTab?: 'home' | 'projects' | 'potential' | 'volunteers' | 'team' | 'sdgs' | 'messages' | 'leaderboard' | 'more' | 'impact' | 'verify' | 'dashboard';
  userId?: string;
}

export default function OrganizationPWANav({ activeTab, userId: propUserId }: OrganizationPWANavProps) {
  const [location, navigate] = useLocation();
  const [showMore, setShowMore] = useState(false);

  const userId = propUserId || localStorage.getItem('currentUserId');

  // Fetch current user to check admin status
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const url = userId ? `/api/users/me?userId=${userId}` : '/api/users/me';
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId
  });

  // Map desktop tab names to PWA tab names
  const mapTabToPwaTab = (tab: string | undefined): string => {
    if (!tab) return 'home';
    // Map desktop header tabs to PWA nav tabs
    if (tab === 'team' || tab === 'volunteers') return 'volunteers';
    if (tab === 'impact') return 'home'; // Impact is in More menu
    if (tab === 'verify') return 'home'; // Verify is in More menu
    if (tab === 'dashboard') return 'home';
    return tab;
  };

  // Determine active tab from current location if not provided
  const currentTab = mapTabToPwaTab(activeTab) || (() => {
    if (location === '/organization-dashboard' || location === '/organization-dashboard/pwa') return 'home';
    if (location.includes('/projects') || location === '/my-work') return 'projects';
    if (location === '/overview') return 'potential';
    if (location.includes('/volunteers')) return 'volunteers';
    if (location.includes('/sdg')) return 'sdgs';
    if (location.includes('/messages')) return 'messages';
    if (location.includes('/leaderboard')) return 'leaderboard';
    return 'home';
  })();

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home, path: '/organization-dashboard/pwa' },
    { id: 'projects' as const, label: 'Projects', icon: FolderOpen, path: '/projects' },
    { id: 'volunteers' as const, label: 'Volunteers', icon: Users, path: '/volunteers' },
    { id: 'sdgs' as const, label: 'SDGs', icon: Target, path: '/sdg-mapping' },
    { id: 'more' as const, label: 'More', icon: MoreHorizontal, action: () => setShowMore(true) },
  ];

  const moreMenuItems = [
    // Quick Actions
    { icon: Plus, label: 'New Project', path: '/post-core-opportunity' },
    { icon: AlertCircle, label: 'Urgent Need', path: '/post-urgent-opportunity' },
    { icon: TrendingUp, label: 'Overview', path: '/overview' },
    // Core Features
    { icon: ClipboardList, label: 'Log Hours', path: '/log-volunteer-hours' },
    { icon: BarChart3, label: 'Impact Reports', path: '/organization-impact-report' },
    { icon: MessageCircle, label: 'Messages', path: '/organization-messages/pwa' },
    // Settings & Admin
    { icon: Globe, label: 'Public Profile', path: '/organization-profile' },
    { icon: Settings, label: 'Settings', path: '/organization-profile-settings' },
    // Admin dashboard - only shown for admin users (uses PWA version on mobile)
    ...(currentUser?.isAdmin ? [{ icon: Shield, label: 'Admin', path: '/admin/dashboard/pwa', isAdmin: true }] : []),
  ];

  return (
    <>
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-700"
      style={{
        background: '#0F172A',
        boxShadow: '0 -2px 16px rgba(0, 0, 0, 0.3)',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex items-center justify-around py-2 px-1 max-w-[428px] mx-auto">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => item.action ? item.action() : navigate(item.path!)}
              className="flex flex-col items-center gap-0.5 min-w-[52px] min-h-[48px] py-2 touch-manipulation cursor-pointer active:scale-95"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              data-testid={`nav-org-${item.id}`}
            >
              <div className={`p-2 rounded-lg pointer-events-none ${isActive ? 'bg-indigo-600' : ''}`}>
                <item.icon className={`w-5 h-5 pointer-events-none ${isActive ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <span className={`text-[10px] font-medium pointer-events-none ${isActive ? 'text-white font-semibold' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>

    {/* More Menu Modal */}
    {showMore && (
      <div className="fixed inset-0 z-[100] flex items-end justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowMore(false)}
        />

        {/* Menu Panel */}
        <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 pb-[env(safe-area-inset-bottom)]">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-slate-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800">More Options</h3>
            <button
              onClick={() => setShowMore(false)}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors touch-manipulation cursor-pointer active:scale-95"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <X className="w-4 h-4 text-slate-600 pointer-events-none" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="grid grid-cols-3 gap-2 p-4">
            {moreMenuItems.map((item, index) => {
              const isAdmin = (item as any).isAdmin;

              return (
                <button
                  key={index}
                  onClick={() => {
                    setShowMore(false);
                    navigate(item.path);
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors touch-manipulation cursor-pointer active:scale-95 ${
                    isAdmin
                      ? 'bg-purple-50 hover:bg-purple-100 ring-1 ring-purple-200'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center pointer-events-none ${
                    isAdmin ? 'bg-purple-100' : 'bg-white'
                  }`}>
                    <item.icon className={`w-6 h-6 pointer-events-none ${isAdmin ? 'text-purple-600' : 'text-slate-600'}`} />
                  </div>
                  <span className={`text-xs font-medium text-center pointer-events-none ${isAdmin ? 'text-purple-700' : 'text-slate-700'}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
