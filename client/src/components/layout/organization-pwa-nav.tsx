import { useLocation } from "wouter";
import { Home, FolderOpen, ClipboardList, Shield as ShieldCheck, BarChart3 } from "lucide-react";

interface OrganizationPWANavProps {
  activeTab?: 'home' | 'projects' | 'verify' | 'more' | 'settings' | 'dashboard' | 'reports' | 'log';
  userId?: string;
}

export default function OrganizationPWANav({ activeTab, userId: propUserId }: OrganizationPWANavProps) {
  const [location, navigate] = useLocation();

  // Determine active tab from explicit prop or current location
  const getActiveTab = (): string => {
    // Map explicit activeTab prop to nav item ids
    if (activeTab) {
      if (activeTab === 'dashboard') return 'home';
      if (activeTab === 'more') return 'settings';
      return activeTab;
    }
    // Fall back to location-based detection
    if (location.includes('/log-hours') || location.includes('/log-activity')) return 'log';
    if (location.includes('/projects') || location === '/my-work') return 'projects';
    if (location.includes('/ngo-verification') || location.includes('/ngo/verification')) return 'verify';
    if (location.includes('/csr-reports-exports')) return 'reports';
    if (location === '/dashboard' || location.includes('/organization-dashboard')) return 'home';
    return 'home';
  };

  const currentTab = getActiveTab();

  const navItems = [
    { id: 'projects' as const, label: 'Projects', icon: FolderOpen, path: '/ngo/projects' },
    { id: 'verify' as const, label: 'Verify', icon: ShieldCheck, path: '/ngo-verification' },
    { id: 'home' as const, label: 'Home', icon: Home, path: '/dashboard', isPrimary: true },
    { id: 'reports' as const, label: 'Reports', icon: BarChart3, path: '/dashboard?tab=reports' },
    { id: 'log' as const, label: 'Log', icon: ClipboardList, path: '/ngo/log-hours' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-slate-100 border-t border-slate-200 px-1 pt-1.5 z-[160] shadow-lg pwa-bottom-nav"
      style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-5 items-end max-w-[428px] mx-auto">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const isPrimary = (item as any).isPrimary;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-end pb-1 pt-1.5 px-1 w-full min-w-0 rounded-xl transition-colors touch-manipulation ${
                isPrimary
                  ? isActive
                    ? 'bg-sky-300 text-sky-900 -mt-2.5 shadow-md'
                    : 'text-slate-500 -mt-2.5 bg-sky-50 hover:bg-sky-200 hover:text-sky-700'
                  : isActive
                    ? 'text-sky-700 bg-sky-200'
                    : 'text-slate-500 bg-sky-50 hover:text-sky-600 hover:bg-sky-100'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              data-testid={`nav-org-${item.id}`}
            >
              <div data-pwa-nav-icon className={`flex items-center justify-center rounded-lg bg-stone-50 ${isPrimary ? 'h-7 w-7' : 'h-7 w-7'}`}>
                <item.icon className={isPrimary ? 'w-4 h-4' : 'w-4 h-4'} />
              </div>
              <span className="text-[9px] font-semibold leading-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
