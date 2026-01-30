import { useState } from "react";
import { useLocation } from "wouter";
import { Home, FolderOpen, MoreHorizontal, X, ClipboardList, Plus, Shield as ShieldCheck } from "lucide-react";

interface OrganizationPWANavProps {
  activeTab?: 'home' | 'projects' | 'verify' | 'more' | 'dashboard';
  userId?: string;
}

export default function OrganizationPWANav({ activeTab, userId: propUserId }: OrganizationPWANavProps) {
  const [location, navigate] = useLocation();
  const [showMore, setShowMore] = useState(false);

  // Map desktop tab names to PWA tab names
  const mapTabToPwaTab = (tab: string | undefined): string => {
    if (!tab) return 'home';
    if (tab === 'dashboard') return 'home';
    if (tab === 'verify') return 'verify';
    if (tab === 'projects') return 'projects';
    return tab;
  };

  // Determine active tab from current location if not provided
  const currentTab = mapTabToPwaTab(activeTab) || (() => {
    if (location === '/organization-dashboard' || location === '/organization-dashboard/pwa') return 'home';
    if (location.includes('/projects') || location === '/my-work') return 'projects';
    if (location.includes('/ngo-verification') || location.includes('/ngo/verification')) return 'verify';
    return 'home';
  })();

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home, path: '/organization-dashboard/pwa' },
    { id: 'projects' as const, label: 'Projects', icon: FolderOpen, path: '/projects' },
    { id: 'verify' as const, label: 'Verify', icon: ShieldCheck, path: '/ngo-verification' },
    { id: 'more' as const, label: 'More', icon: MoreHorizontal, action: () => setShowMore(true) },
  ];

  const moreMenuItems = [
    { icon: Plus, label: 'New Project', path: '/post-core-opportunity' },
    { icon: ClipboardList, label: 'Log Hours', path: '/log-volunteer-hours' },
  ];

  return (
    <>
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200"
      style={{
        background: '#FFFFFF',
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
              className="flex flex-col items-center gap-0.5 min-w-[52px] min-h-[48px] py-2 touch-manipulation cursor-pointer active:scale-95"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              data-testid={`nav-org-${item.id}`}
            >
              <div className={`p-2 rounded-lg pointer-events-none ${isActive ? 'bg-indigo-600' : ''}`}>
                <item.icon className={`w-5 h-5 pointer-events-none ${isActive ? 'text-white' : 'text-stone-600'}`} />
              </div>
              <span className={`text-[10px] font-medium pointer-events-none ${isActive ? 'text-indigo-600 font-semibold' : 'text-stone-600'}`}>
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
            {moreMenuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  setShowMore(false);
                  navigate(item.path);
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
