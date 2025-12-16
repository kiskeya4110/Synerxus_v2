import { useLocation } from "wouter";
import { Home, FolderOpen, MessageCircle, Trophy, User } from "lucide-react";

interface OrganizationPWANavProps {
  activeTab?: 'home' | 'projects' | 'messages' | 'leaderboard' | 'profile';
}

export default function OrganizationPWANav({ activeTab }: OrganizationPWANavProps) {
  const [location, navigate] = useLocation();

  // Determine active tab from current location if not provided
  const currentTab = activeTab || (() => {
    if (location === '/organization-dashboard' || location === '/organization-dashboard/pwa') return 'home';
    if (location.includes('/projects') || location === '/organization-projects') return 'projects';
    if (location.includes('/messages') || location === '/organization-messages/pwa') return 'messages';
    if (location.includes('/leaderboard') || location === '/volunteer-leaderboard/pwa') return 'leaderboard';
    if (location.includes('/profile') || location === '/organization-profile-settings') return 'profile';
    return 'home';
  })();

  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: Home,
      path: '/organization-dashboard/pwa'
    },
    {
      id: 'projects' as const,
      label: 'Projects',
      icon: FolderOpen,
      path: '/organization-projects'
    },
    {
      id: 'messages' as const,
      label: 'Messages',
      icon: MessageCircle,
      path: '/organization-messages/pwa'
    },
    {
      id: 'leaderboard' as const,
      label: 'Leaderboard',
      icon: Trophy,
      path: '/volunteer-leaderboard/pwa'
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: User,
      path: '/organization-profile-settings'
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#16213e] border-t border-gray-700 px-1 py-2 max-w-[428px] mx-auto z-50">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center py-1 px-1.5 rounded-lg transition-all ${
                isActive
                  ? 'text-emerald-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              data-testid={`nav-org-${item.id}`}
            >
              <item.icon className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
