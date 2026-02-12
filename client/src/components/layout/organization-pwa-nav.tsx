import { useLocation } from "wouter";
import { Home, FolderOpen, ClipboardList, Shield as ShieldCheck, Settings } from "lucide-react";

interface OrganizationPWANavProps {
  activeTab?: 'home' | 'projects' | 'verify' | 'more' | 'settings' | 'dashboard';
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
    if (location.includes('/settings') || location.includes('/ngo/settings')) return 'settings';
    if (location === '/dashboard' || location.includes('/organization-dashboard')) return 'home';
    return 'home';
  };

  const currentTab = getActiveTab();

  const navItems = [
    { id: 'projects' as const, label: 'Projects', icon: FolderOpen, path: '/ngo/projects' },
    { id: 'log' as const, label: 'Log', icon: ClipboardList, path: '/ngo/log-hours' },
    { id: 'home' as const, label: 'Home', icon: Home, path: '/dashboard', isPrimary: true },
    { id: 'verify' as const, label: 'Verify', icon: ShieldCheck, path: '/ngo-verification' },
    { id: 'settings' as const, label: 'Options', icon: Settings, path: '/ngo/settings' },
  ];

  return (
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
              onClick={() => navigate(item.path)}
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
              data-testid={`nav-org-${item.id}`}
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
