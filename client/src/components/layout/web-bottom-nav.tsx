import { useLocation } from "wouter";
import { Home, Briefcase, Sparkles, BarChart3, User } from "lucide-react";

interface WebBottomNavProps {
  activeTab?: 'home' | 'projects' | 'discover' | 'impacts' | 'profile';
}

export default function WebBottomNav({ activeTab = 'home' }: WebBottomNavProps) {
  const [, navigate] = useLocation();

  const navItems = [
    {
      id: 'home',
      icon: Home,
      label: 'Home',
      path: '/volunteer-dashboard',
      gradient: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'projects',
      icon: Briefcase,
      label: 'Projects',
      path: '/volunteer-dashboard?tab=projects',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      id: 'discover',
      icon: Sparkles,
      label: 'Discover',
      path: '/discover-opportunities',
      gradient: 'from-emerald-500 to-teal-500'
    },
    {
      id: 'impacts',
      icon: BarChart3,
      label: 'Impact',
      path: '/volunteer-dashboard?tab=impacts',
      gradient: 'from-amber-500 to-orange-500'
    },
    {
      id: 'profile',
      icon: User,
      label: 'Profile',
      path: '/volunteer-dashboard?tab=profile',
      gradient: 'from-cyan-500 to-blue-500'
    },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-stone-200 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      {/* Safe area padding for notched devices */}
      <div className="px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 min-w-[60px] ${
                  isActive
                    ? 'scale-105'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                data-testid={`nav-${item.id}`}
              >
                {/* Active Indicator Background */}
                {isActive && (
                  <div className="absolute inset-0 bg-[#ffcc33]/50 rounded-xl" />
                )}

                {/* Icon with active gradient */}
                <div className="relative mb-0.5">
                  <item.icon className={`w-5 h-5 ${
                    isActive
                      ? 'text-[#ffcc33]'
                      : ''
                  }`} />
                </div>

                {/* Label */}
                <span className={`text-[10px] font-medium ${
                  isActive
                    ? 'text-[#ffcc33]'
                    : ''
                }`}>
                  {item.label}
                </span>

                {/* Active Dot Indicator */}
                {isActive && (
                  <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#ffcc33]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
