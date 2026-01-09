import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Home, FolderOpen, Users, Target, MoreHorizontal, X, Shield, MessageCircle, Settings, BarChart3 } from "lucide-react";

interface OrganizationPWANavProps {
  activeTab?: 'home' | 'projects' | 'potential' | 'volunteers' | 'sdgs' | 'messages' | 'leaderboard' | 'more';
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

  // Determine active tab from current location if not provided
  const currentTab = activeTab || (() => {
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
    { icon: BarChart3, label: 'Impact Reports', path: '/organization-impact-report' },
    { icon: MessageCircle, label: 'Messages', path: '/organization-messages/pwa' },
    { icon: Settings, label: 'Settings', path: '/organization-profile-settings' },
    // Admin dashboard - only shown for admin users (uses PWA version on mobile)
    ...(currentUser?.isAdmin ? [{ icon: Shield, label: 'Admin Dashboard', path: '/admin/dashboard/pwa', isAdmin: true }] : []),
  ];

  return (
    <>
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'linear-gradient(90deg, #FAF9F7 0%, #FEF9E7 50%, #FFF8DC 100%)',
        boxShadow: '0 -2px 16px rgba(0, 0, 0, 0.08)',
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
              className="flex flex-col items-center gap-0.5 min-w-[48px] py-1.5"
              data-testid={`nav-org-${item.id}`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? 'bg-emerald-100' : ''}`}>
                <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
              </div>
              <span className={`text-[9px] font-medium ${isActive ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
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
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="grid grid-cols-3 gap-2 p-4">
            {moreMenuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  setShowMore(false);
                  navigate(item.path);
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${
                  (item as any).isAdmin
                    ? 'bg-purple-50 hover:bg-purple-100 ring-1 ring-purple-200'
                    : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center ${
                  (item as any).isAdmin ? 'bg-purple-100' : 'bg-white'
                }`}>
                  <item.icon className={`w-6 h-6 ${(item as any).isAdmin ? 'text-purple-600' : 'text-slate-600'}`} />
                </div>
                <span className={`text-xs font-medium text-center ${(item as any).isAdmin ? 'text-purple-700' : 'text-slate-700'}`}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
