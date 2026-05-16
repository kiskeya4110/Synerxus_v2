import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Home, FileText } from "lucide-react";

interface CSRPWANavProps {
  activeTab?: 'home' | 'reports';
  userId?: string;
}

export default function CSRPWANav({ activeTab, userId: propUserId }: CSRPWANavProps) {
  const [location, navigate] = useLocation();
  const [isMobile, setIsMobile] = useState(false);

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
    if (location === '/dashboard' || location === '/csr-dashboard' || location === '/csr-dashboard/pwa' || location.includes('/corporate/dashboard')) return 'home';
    if (location.includes('/reports') || location === '/csr-reports-exports') return 'reports';
    return 'home';
  })();

  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: Home,
      path: '/dashboard'
    },
    {
      id: 'reports' as const,
      label: 'Reports',
      icon: FileText,
      path: '/csr-reports-exports'
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] pwa-bottom-nav z-40 border-t border-[#ffcc33]/20 shadow-lg bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50"
    >
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center py-1.5 px-2.5 rounded-lg transition-all touch-manipulation cursor-pointer active:scale-95 min-w-0 min-h-[42px] ${
                isActive
                  ? 'bg-[#ffcc33]/50 text-[#ffcc33] font-semibold'
                  : 'bg-transparent text-stone-600 font-medium'
              }`}
              data-testid={`nav-csr-${item.id}`}
            >
              <span data-pwa-nav-icon className="w-7 h-7 flex items-center justify-center">
                <item.icon className="w-4 h-4 pointer-events-none" />
              </span>
              <span className="text-[9px] pointer-events-none leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
