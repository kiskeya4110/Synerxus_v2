import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Home, Briefcase, Sparkles, MoreHorizontal, X, BarChart3, MessageCircle, BookOpen, ClipboardList, User, Settings, Award } from "lucide-react";

interface VolunteerPWANavProps {
  userId?: string;
  activeTab?: 'home' | 'projects' | 'potentials' | 'impacts' | 'more';
}

export default function VolunteerPWANav({ userId, activeTab }: VolunteerPWANavProps) {
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
    if (location.includes('impact-report') || location.includes('impacts')) return 'impacts';
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
      id: 'impacts' as const,
      label: 'Impacts',
      icon: BarChart3,
      path: '/volunteer-dashboard?tab=impacts'
    },
    {
      id: 'more' as const,
      label: 'More',
      icon: MoreHorizontal,
      action: () => setShowMore(true)
    },
  ];

  const moreMenuItems = [
    { icon: ClipboardList, label: 'Log Activity', path: '/volunteer-dashboard?tab=log-activity' },
    { icon: MessageCircle, label: 'Messages', path: '/volunteer-messages/pwa' },
    { icon: BookOpen, label: 'Stories', path: '/stories' },
    { icon: Award, label: 'Achievements', path: '/achievements' },
    { icon: User, label: 'Profile', path: '/volunteer-dashboard?tab=profile' },
    { icon: Settings, label: 'Settings', path: '/volunteer-profile-settings' },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#f8f7f4] border-t border-slate-200 px-2 py-2 z-50 shadow-lg">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => item.action ? item.action() : navigate(item.path!)}
                className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <item.icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[9px] font-medium">{item.label}</span>
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
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-slate-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 text-center">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
