import { useLocation } from "wouter";
import {
  Home,
  BarChart3,
  Users,
  FileText,
  Settings,
  Target,
} from "lucide-react";

interface CSRMobileNavProps {
  activeTab?: 'overview' | 'employees' | 'sdgs' | 'reports' | 'settings';
}

export default function CSRMobileNav({ activeTab = 'overview' }: CSRMobileNavProps) {
  const [, navigate] = useLocation();

  const navItems = [
    { id: 'overview', label: 'Home', icon: Home, path: '/csr-dashboard?tab=overview' },
    { id: 'employees', label: 'Team', icon: Users, path: '/csr-dashboard?tab=engagement' },
    { id: 'sdgs', label: 'SDGs', icon: Target, path: '/csr-dashboard?tab=sdgs' },
    { id: 'reports', label: 'Reports', icon: BarChart3, path: '/csr-reports-exports' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/corporate-partner-profile-settings' },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    // Navigate directly to the full path with query params for immediate tab loading
    navigate(item.path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-t border-[#D4980C]/20 px-1 pt-1.5 pwa-bottom-nav z-50 shadow-lg"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="grid grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`flex flex-col items-center justify-center py-1 px-1 w-full min-w-0 rounded transition-all ${
                isActive ? 'text-[#7a5200] bg-[#D4980C]/50' : 'text-stone-500 hover:text-[#7a5200]'
              }`}
              data-testid={`csr-nav-${item.id}`}
            >
              <span data-pwa-nav-icon className="w-7 h-6 flex items-center justify-center">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#7a5200]' : 'text-stone-500'}`} />
              </span>
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Mobile header component for CSR pages
interface CSRMobileHeaderProps {
  title: string;
  companyName?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function CSRMobileHeader({ title, companyName, showBackButton, onBack }: CSRMobileHeaderProps) {
  const [, navigate] = useLocation();

  return (
    <header
      className="bg-gradient-to-r from-purple-50 via-violet-50 to-purple-100 text-purple-900 px-3 pb-2 flex items-center justify-between sticky top-0 z-50 shadow-lg pwa-compact-x"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {showBackButton && (
          <button
            onClick={onBack || (() => navigate('/csr-dashboard'))}
            className="p-1 hover:bg-purple-600/10 rounded"
          >
            <svg className="w-5 h-5 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <span className="font-semibold text-sm truncate max-w-[min(180px,55vw)] text-purple-900">{title}</span>
      </div>
      {companyName && (
        <div className="text-[10px] text-purple-700 truncate max-w-[28vw]">{companyName}</div>
      )}
    </header>
  );
}
