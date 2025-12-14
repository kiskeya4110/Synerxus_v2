import { useLocation } from "wouter";
import { Home, Briefcase, FolderKanban, BarChart3, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User as UserType } from "@shared/schema";

export default function VolunteerBottomNav() {
  const [location, setLocation] = useLocation();
  const userId = localStorage.getItem('currentUserId');

  // Fetch current user to verify volunteer type
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const url = userId ? `/api/users/me?userId=${userId}` : '/api/users/me';
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId
  });

  // Routes that have their own complete navigation - don't show VolunteerBottomNav here
  const standaloneRoutes = [
    '/volunteer-dashboard',
    '/csr-dashboard',
    '/csr-dashboard-pwa',
    '/organization-dashboard',
    '/discover-opportunities/pwa',
    '/discover-opportunities',
    '/projects/',  // PWA project detail pages
    '/opportunities/',  // PWA opportunity detail pages
    '/landing',
    '/login',
    '/'
  ];

  // Check for PWA routes (any route ending in /pwa) or standalone routes
  const isPwaRoute = location.endsWith('/pwa');
  const isStandaloneRoute = isPwaRoute || standaloneRoutes.some(route =>
    location === route || location.startsWith(route)
  );

  // Only show for volunteers on mobile, and not on standalone routes
  if (currentUser?.userType !== 'volunteer' || isStandaloneRoute) {
    return null;
  }

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Home', path: '/dashboard' },
    { id: 'applications', icon: Briefcase, label: 'Apps', path: '/my-work#applications' },
    { id: 'assignments', icon: FolderKanban, label: 'Insights', path: '/my-work#assignments' },
    { id: 'impacts', icon: BarChart3, label: 'Impact', path: '/my-work#impact' },
    { id: 'profile', icon: User, label: 'Profile', path: '/volunteer-profile-settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location === '/dashboard' || location === '/';
    }
    if (path === '/volunteer-profile-settings') {
      return location === '/volunteer-profile-settings' || location === '/profile';
    }
    if (path.startsWith('/my-work')) {
      const hash = path.split('#')[1];
      return location.startsWith('/my-work') && (!hash || window.location.hash.includes(hash));
    }
    return location === path;
  };

  const handleNavClick = (path: string) => {
    if (path.includes('#')) {
      const [route, hash] = path.split('#');
      setLocation(route);
      setTimeout(() => {
        window.location.hash = hash;
      }, 100);
    } else {
      setLocation(path);
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#16213e] border-t border-gray-700 px-2 py-2 max-w-[428px] mx-auto z-50">
      <div className="flex justify-around items-center">
        {navItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleNavClick(tab.path)}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
              isActive(tab.path)
                ? 'text-emerald-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            data-testid={`nav-${tab.id}`}
          >
            <tab.icon className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
