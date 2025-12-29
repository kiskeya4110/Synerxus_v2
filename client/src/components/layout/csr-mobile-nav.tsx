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
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-amber-100 via-amber-200 to-amber-400 border-t border-amber-300/30 px-1 py-1.5 max-w-[428px] mx-auto z-50 shadow-lg">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`flex flex-col items-center py-1 px-2 rounded transition-all ${
                isActive ? 'text-amber-900' : 'text-amber-700'
              }`}
              data-testid={`csr-nav-${item.id}`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-amber-900' : 'text-amber-700'}`} />
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
    <header className="bg-gradient-to-r from-amber-50 via-amber-100 to-amber-400 text-amber-900 px-3 py-2 flex items-center justify-between sticky top-0 z-50 shadow-lg">
      <div className="flex items-center gap-2">
        {showBackButton && (
          <button
            onClick={onBack || (() => navigate('/csr-dashboard'))}
            className="p-1 hover:bg-amber-600/10 rounded"
          >
            <svg className="w-5 h-5 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <span className="font-semibold text-sm truncate max-w-[180px] text-amber-900">{title}</span>
      </div>
      {companyName && (
        <div className="text-[10px] text-amber-700 truncate max-w-[100px]">{companyName}</div>
      )}
    </header>
  );
}
