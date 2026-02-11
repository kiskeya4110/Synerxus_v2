import { useState } from "react";
import { useLocation } from "wouter";
import {
  Home, Target, BarChart3, Plus, FileText, FolderOpen,
  Shield as ShieldCheck, MoreHorizontal, X, ClipboardList, Download
} from "lucide-react";

interface DashboardMobileNavProps {
  userType: string | null;
  activeTab?: string;
  onLogImpact?: () => void;
  onTabChange?: (tab: string) => void;
}

// Get nav items based on user type
function getNavItems(
  userType: string | null,
  navigate: (path: string) => void,
  onLogImpact?: () => void,
  onTabChange?: (tab: string) => void
) {
  if (userType === 'volunteer') {
    return [
      { id: 'wallet', label: 'Wallet', icon: BarChart3, action: () => onTabChange?.('wallet') },
      { id: 'projects', label: 'Projects', icon: Target, action: () => onTabChange?.('projects') },
      { id: 'home', label: 'Home', icon: Home, action: () => onTabChange?.('home'), isPrimary: true },
      { id: 'log', label: 'Log', icon: Plus, action: onLogImpact || (() => { window.location.href = '/volunteer/log'; }) },
      { id: 'history', label: 'History', icon: FileText, action: () => onTabChange?.('history') },
    ];
  }

  if (userType === 'organization') {
    return [
      { id: 'projects', label: 'Projects', icon: FolderOpen, action: () => navigate('/ngo/projects') },
      { id: 'log', label: 'Log', icon: ClipboardList, action: () => navigate('/ngo/log-hours') },
      { id: 'home', label: 'Home', icon: Home, action: () => onTabChange?.('home'), isPrimary: true },
      { id: 'verify', label: 'Verify', icon: ShieldCheck, action: () => onTabChange?.('verify') },
      { id: 'more', label: 'More', icon: MoreHorizontal, isMore: true },
    ];
  }

  if (userType === 'corporate-partner') {
    return [
      { id: 'home', label: 'Dashboard', icon: Home, action: () => navigate('/dashboard') },
      { id: 'reports', label: 'Reports', icon: Download, action: () => navigate('/corporate/reports') },
    ];
  }

  return [];
}

// Get "more" menu items based on user type
function getMoreMenuItems(userType: string | null, navigate: (path: string) => void) {
  if (userType === 'organization') {
    return [
      { icon: Plus, label: 'New Project', path: '/post-core-opportunity' },
    ];
  }
  return [];
}

export default function DashboardMobileNav({
  userType,
  activeTab = 'home',
  onLogImpact,
  onTabChange,
}: DashboardMobileNavProps) {
  const [location, navigate] = useLocation();
  const [showMore, setShowMore] = useState(false);

  const navItems = getNavItems(userType, navigate, onLogImpact, onTabChange);
  const moreMenuItems = getMoreMenuItems(userType, navigate);

  // Determine active tab from current location if not provided
  const currentTab = activeTab || (() => {
    if (location === '/dashboard') return 'home';
    if (location.includes('/projects')) return 'projects';
    if (location.includes('/verification')) return 'verify';
    if (location.includes('/reports')) return 'reports';
    if (location.includes('/history') || location.includes('/my-work')) return 'history';
    return 'home';
  })();

  // Volunteer navigation style with raised center button
  if (userType === 'volunteer') {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-t border-emerald-200 px-1 pt-2 z-[160] shadow-lg"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-5 items-end max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            const isPrimary = item.isPrimary;

            return (
              <button
                key={item.id}
                onClick={item.action}
                className={`flex flex-col items-center justify-end pb-1.5 pt-2 w-full rounded-xl transition-colors touch-manipulation ${
                  isPrimary
                    ? isActive
                      ? 'bg-emerald-600 text-white -mt-3 shadow-md'
                      : 'text-stone-500 -mt-3 hover:bg-emerald-600 hover:text-white'
                    : isActive
                      ? 'text-emerald-700 bg-emerald-100'
                      : 'text-stone-500 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <div className={`flex items-center justify-center ${isPrimary ? 'h-8 w-8' : 'h-7 w-7'}`}>
                  <item.icon className={isPrimary ? 'w-6 h-6' : 'w-5 h-5'} />
                </div>
                <span className="text-[10px] font-semibold leading-tight mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Organization navigation style
  if (userType === 'organization') {
    return (
      <>
        <nav
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-1 pt-2 z-[160] shadow-lg"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <div className="grid grid-cols-5 items-end max-w-md mx-auto">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              const isPrimary = (item as any).isPrimary;

              return (
                <button
                  key={item.id}
                  onClick={() => (item as any).isMore ? setShowMore(true) : item.action()}
                  className={`flex flex-col items-center justify-end pb-1.5 pt-2 w-full rounded-xl transition-colors touch-manipulation ${
                    isPrimary
                      ? isActive
                        ? 'bg-indigo-600 text-white -mt-3 shadow-md'
                        : 'text-stone-500 -mt-3 hover:bg-indigo-600 hover:text-white'
                      : isActive
                        ? 'text-indigo-700 bg-indigo-50'
                        : 'text-stone-500 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className={`flex items-center justify-center ${isPrimary ? 'h-8 w-8' : 'h-7 w-7'}`}>
                    <item.icon className={isPrimary ? 'w-6 h-6' : 'w-5 h-5'} />
                  </div>
                  <span className="text-[10px] font-semibold leading-tight mt-0.5">{item.label}</span>
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

  // Corporate navigation style (minimal)
  if (userType === 'corporate-partner') {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200"
        style={{
          background: '#FFFFFF',
          boxShadow: '0 -2px 16px rgba(0, 0, 0, 0.08)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex items-end justify-around py-2 px-1 max-w-[428px] mx-auto">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={item.action}
                className="flex flex-col items-center justify-end min-w-[56px] min-h-[48px] pb-1 pt-2 touch-manipulation cursor-pointer active:scale-95"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className={`flex items-center justify-center h-8 w-8 rounded-lg pointer-events-none ${isActive ? 'bg-slate-800' : ''}`}>
                  <item.icon className={`w-5 h-5 pointer-events-none ${isActive ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <span className={`text-[10px] font-medium leading-tight mt-0.5 pointer-events-none ${isActive ? 'text-slate-800 font-semibold' : 'text-slate-600'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Fallback - no nav
  return null;
}
