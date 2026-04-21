import { useLocation } from "wouter";
import { Home, Briefcase, FolderKanban, BarChart3, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User as UserType } from "@shared/schema";
import { useCurrentUserId } from "@/hooks/use-current-user-id";

export default function VolunteerBottomNav() {
  const [location, setLocation] = useLocation();
  const userId = useCurrentUserId();

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
    window.scrollTo(0, 0);
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
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-100 border-t border-slate-200 px-1 pt-2 max-w-[428px] mx-auto z-50 shadow-lg"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="grid grid-cols-5">
        {navItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleNavClick(tab.path)}
            className={`flex flex-col items-center justify-center py-1 w-full rounded-lg transition-all ${
              isActive(tab.path)
                ? 'text-sky-700 bg-sky-200'
                : 'text-slate-500 bg-sky-50 hover:text-sky-600 hover:bg-sky-100'
            }`}
            data-testid={`nav-${tab.id}`}
          >
            <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center mb-0.5">
              <tab.icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
