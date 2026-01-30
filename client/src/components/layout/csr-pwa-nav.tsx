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
    if (location === '/csr-dashboard' || location === '/csr-dashboard/pwa' || location.includes('/corporate/dashboard')) return 'home';
    if (location.includes('/reports') || location === '/csr-reports-exports') return 'reports';
    return 'home';
  })();

  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: Home,
      path: '/corporate/dashboard/pwa'
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
              onClick={() => navigate(item.path)}
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
  );
}
