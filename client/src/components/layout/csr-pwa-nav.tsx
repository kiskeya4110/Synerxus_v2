import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Home, FolderOpen, BarChart3, FileText, User } from "lucide-react";

interface CSRPWANavProps {
  activeTab?: 'home' | 'projects' | 'impacts' | 'reports' | 'profile';
}

export default function CSRPWANav({ activeTab }: CSRPWANavProps) {
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
    if (location === '/csr-dashboard' || location === '/csr-dashboard/pwa') return 'home';
    if (location.includes('/projects') || location === '/csr-projects') return 'projects';
    if (location.includes('/impacts') || location === '/csr-impacts') return 'impacts';
    if (location.includes('/reports') || location === '/csr-reports') return 'reports';
    if (location.includes('/profile') || location === '/corporate-partner-profile-settings') return 'profile';
    return 'home';
  })();

  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: Home,
      path: '/csr-dashboard/pwa'
    },
    {
      id: 'projects' as const,
      label: 'Projects',
      icon: FolderOpen,
      path: '/csr-projects'
    },
    {
      id: 'impacts' as const,
      label: 'Impacts',
      icon: BarChart3,
      path: '/csr-impacts'
    },
    {
      id: 'reports' as const,
      label: 'Reports',
      icon: FileText,
      path: '/csr-reports'
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: User,
      path: '/corporate-partner-profile-settings'
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 px-1 py-2 max-w-[428px] mx-auto z-50 border-t shadow-lg"
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
              className="flex flex-col items-center py-1 px-1.5 rounded-lg transition-all"
              style={{
                color: isActive ? '#047857' : '#065f46',
                background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                fontWeight: isActive ? 600 : 500
              }}
              data-testid={`nav-csr-${item.id}`}
            >
              <item.icon className="w-5 h-5 mb-0.5" />
              <span className="text-[9px]" style={{ fontWeight: 'inherit' }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
