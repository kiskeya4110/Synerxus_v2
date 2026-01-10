import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Home, FolderOpen, BarChart3, MoreHorizontal, User, X, Shield, FileText, MessageCircle, Settings } from "lucide-react";

interface CSRPWANavProps {
  activeTab?: 'home' | 'projects' | 'impacts' | 'reports' | 'profile' | 'more';
  userId?: string;
}

export default function CSRPWANav({ activeTab, userId: propUserId }: CSRPWANavProps) {
  const [location, navigate] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) return null;

  // Determine active tab from current location if not provided
  const currentTab = activeTab || (() => {
    if (location === '/csr-dashboard' || location === '/csr-dashboard/pwa') return 'home';
    if (location.includes('/projects') || location === '/csr-projects') return 'projects';
    if (location.includes('/impacts') || location === '/csr-impacts') return 'impacts';
    if (location.includes('/reports') || location === '/csr-reports') return 'reports';
    if (location.includes('/profile') || location === '/corporate-partner-profile-settings') return 'profile';
    return 'home';
  })();

  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: Home,
      path: '/csr-dashboard/pwa'
    },
    {
      id: 'projects' as const,
      label: 'Projects',
      icon: FolderOpen,
      path: '/csr-projects'
    },
    {
      id: 'impacts' as const,
      label: 'Impacts',
      icon: BarChart3,
      path: '/csr-impacts'
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: User,
      path: '/corporate-partner-profile-settings'
    },
    {
      id: 'more' as const,
      label: 'More',
      icon: MoreHorizontal,
      action: () => setShowMore(true)
    },
  ];

  const moreMenuItems = [
    { icon: FileText, label: 'Reports', path: '/csr-reports' },
    { icon: MessageCircle, label: 'Messages', path: '/csr-messages/pwa' },
    { icon: Settings, label: 'Settings', path: '/corporate-partner-profile-settings' },
    // Admin dashboard - only shown for admin users (uses PWA version on mobile)
    ...(currentUser?.isAdmin ? [{ icon: Shield, label: 'Admin Dashboard', path: '/admin/dashboard/pwa', isAdmin: true }] : []),
  ];

  return (
    <>
    <nav
      className="fixed bottom-0 left-0 right-0 px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] max-w-[428px] mx-auto z-40 border-t shadow-lg"
      style={{
        background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #fef3c7 75%, #fde68a 100%)",
        borderColor: "rgba(16, 185, 129, 0.2)"
      }}
    >
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => item.action ? item.action() : navigate(item.path!)}
              className="flex flex-col items-center py-1.5 px-2 rounded-lg transition-all touch-manipulation cursor-pointer active:scale-95"
              style={{
                color: isActive ? '#047857' : '#065f46',
                background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                WebkitTapHighlightColor: 'transparent',
                minWidth: '56px'
              }}
              data-testid={`nav-csr-${item.id}`}
            >
              <item.icon className="w-5 h-5 mb-0.5 pointer-events-none" />
              <span className="text-[9px] pointer-events-none" style={{ fontWeight: 'inherit' }}>{item.label}</span>
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
