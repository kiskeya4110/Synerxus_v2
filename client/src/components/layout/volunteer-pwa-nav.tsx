import { useLocation } from "wouter";
import { Home, Briefcase, Lightbulb, BarChart3, User } from "lucide-react";

interface VolunteerPWANavProps {
  userId?: string;
  activeTab?: 'home' | 'projects' | 'insights' | 'impact' | 'profile';
}

export default function VolunteerPWANav({ userId, activeTab }: VolunteerPWANavProps) {
  const [location, navigate] = useLocation();

  // Determine active tab from current location if not provided
  const currentTab = activeTab || (() => {
    if (location === '/volunteer-dashboard' || location === '/dashboard') return 'home';
    if (location === '/my-work' || location.startsWith('/my-work')) return 'projects';
    if (location.includes('discover-opportunities')) return 'insights';
    if (location.includes('impact-report')) return 'impact';
    if (location.includes('profile-settings')) return 'profile';
    return 'home';
  })();

  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: Home,
      path: '/volunteer-dashboard'
    },
    {
      id: 'projects' as const,
      label: 'Projects',
      icon: Briefcase,
      path: '/my-work'
    },
    {
      id: 'insights' as const,
      label: 'Insights',
      icon: Lightbulb,
      path: '/discover-opportunities/pwa'
    },
    {
      id: 'impact' as const,
      label: 'Impact',
      icon: BarChart3,
      path: userId ? `/impact-report/${userId}` : '/impact-report'
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: User,
      path: '/volunteer-profile-settings'
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#16213e] border-t border-gray-700 px-2 py-2 max-w-[428px] mx-auto z-50">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
                isActive
                  ? 'text-emerald-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              data-testid={`nav-${item.id}`}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
