import { useLocation } from "wouter";
import { Home, FolderOpen, Users, Target, Lightbulb } from "lucide-react";

interface OrganizationPWANavProps {
  activeTab?: 'home' | 'projects' | 'potential' | 'volunteers' | 'sdgs' | 'messages' | 'leaderboard';
}

export default function OrganizationPWANav({ activeTab }: OrganizationPWANavProps) {
  const [location, navigate] = useLocation();

  // Determine active tab from current location if not provided
  const currentTab = activeTab || (() => {
    if (location === '/organization-dashboard' || location === '/organization-dashboard/pwa') return 'home';
    if (location.includes('/projects') || location === '/my-work') return 'projects';
    if (location === '/overview') return 'potential';
    if (location.includes('/volunteers')) return 'volunteers';
    if (location.includes('/sdg')) return 'sdgs';
    if (location.includes('/messages')) return 'messages';
    if (location.includes('/leaderboard')) return 'leaderboard';
    return 'home';
  })();

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home, path: '/organization-dashboard/pwa' },
    { id: 'projects' as const, label: 'Projects', icon: FolderOpen, path: '/projects' },
    { id: 'potential' as const, label: 'Potential', icon: Lightbulb, path: '/overview', isCenter: true },
    { id: 'volunteers' as const, label: 'Volunteers', icon: Users, path: '/volunteers' },
    { id: 'sdgs' as const, label: 'SDGs', icon: Target, path: '/sdg-mapping' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]"
      style={{
        background: 'linear-gradient(90deg, #FAF9F7 0%, #FEF9E7 50%, #FFF8DC 100%)',
        boxShadow: '0 -2px 16px rgba(0, 0, 0, 0.08)',
      }}
    >
      <div className="flex items-center justify-around py-2 px-1 max-w-[428px] mx-auto">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl -translate-y-2"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, #14532d 0%, #166534 100%)'
                    : 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
                  boxShadow: '0 2px 12px rgba(22, 101, 52, 0.5)',
                  minWidth: '60px',
                }}
                data-testid={`nav-org-${item.id}`}
              >
                <item.icon className="w-5 h-5 text-white" />
                <span className="text-[8px] font-semibold text-white tracking-wide">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-0.5 min-w-[48px] py-1.5"
              data-testid={`nav-org-${item.id}`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? 'bg-emerald-100' : ''}`}>
                <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
              </div>
              <span className={`text-[9px] font-medium ${isActive ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
