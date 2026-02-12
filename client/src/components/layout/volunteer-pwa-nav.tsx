import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Home, Briefcase, Sparkles, ClipboardList, MoreHorizontal, X, BarChart3 } from "lucide-react";

interface VolunteerPWANavProps {
  userId?: string;
  activeTab?: 'home' | 'projects' | 'potentials' | 'log' | 'more';
}

export default function VolunteerPWANav({ userId: propUserId, activeTab }: VolunteerPWANavProps) {
  const [location, navigate] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [showMore, setShowMore] = useState(false);

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
    if (location === '/volunteer-dashboard' || location === '/dashboard') return 'home';
    if (location.includes('/projects')) return 'projects';
    if (location.includes('discover-opportunities') || location.includes('opportunities')) return 'potentials';
    if (location.includes('log-activity') || location.includes('tab=log-activity')) return 'log';
    return 'home';
  })();

  // All navigation goes back to volunteer-dashboard with tab parameter
  // This maintains consistent framing with PWA header and bottom tray
  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: Home,
      path: '/volunteer-dashboard?tab=dashboard'
    },
    {
      id: 'projects' as const,
      label: 'Projects',
      icon: Briefcase,
      path: '/volunteer-dashboard?tab=projects'
    },
    {
      id: 'potentials' as const,
      label: 'Potentials',
      icon: Sparkles,
      path: '/volunteer-dashboard?tab=potential'
    },
    {
      id: 'log' as const,
      label: 'Log',
      icon: ClipboardList,
      path: '/volunteer-dashboard?tab=log-activity'
    },
    {
      id: 'more' as const,
      label: 'Options',
      icon: MoreHorizontal,
      action: () => setShowMore(true)
    },
  ];

  const moreMenuItems = [
    { icon: BarChart3, label: 'My Impact', path: '/volunteer-dashboard?tab=impacts' },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-t border-emerald-200 px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-40 shadow-lg">
        <div className="grid grid-cols-5 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else if (item.path) {
                    // For volunteer-dashboard with query params, use direct navigation
                    if (item.path.startsWith('/volunteer-dashboard?')) {
                      window.history.pushState({}, '', item.path);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    } else {
                      navigate(item.path);
                    }
                  }
                }}
                className={`flex flex-col items-center justify-center py-1.5 mx-auto w-full rounded-xl transition-all touch-manipulation cursor-pointer active:scale-95 ${
                  isActive
                    ? 'text-white bg-emerald-600'
                    : 'text-stone-600 hover:text-emerald-700 hover:bg-emerald-100'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                data-testid={`nav-${item.id}`}
              >
                <item.icon className={`w-5 h-5 mb-0.5 pointer-events-none ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[9px] font-medium pointer-events-none">{item.label}</span>
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
              {moreMenuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setShowMore(false);
                    // For volunteer-dashboard with query params, use direct navigation
                    if (item.path.startsWith('/volunteer-dashboard?')) {
                      window.history.pushState({}, '', item.path);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors touch-manipulation cursor-pointer active:scale-95 bg-slate-50 hover:bg-slate-100"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="w-12 h-12 rounded-xl shadow-sm flex items-center justify-center pointer-events-none bg-white">
                    <item.icon className="w-6 h-6 pointer-events-none text-slate-600" />
                  </div>
                  <span className="text-xs font-medium text-center pointer-events-none text-slate-700">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
