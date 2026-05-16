import { useLocation } from "wouter";
import { Home, FolderOpen, Users, Target, Lightbulb } from "lucide-react";

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, path: '/organization-dashboard' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, path: '/projects' },
  { id: 'overview', label: 'Potential', icon: Lightbulb, path: '/overview', isCenter: true },
  { id: 'volunteers', label: 'Volunteers', icon: Users, path: '/volunteers' },
  { id: 'sdgs', label: 'SDGs', icon: Target, path: '/sdg-mapping' },
];

interface MobileBottomNavProps {
  onCreateClick?: () => void;
}

export default function MobileBottomNav({ onCreateClick }: MobileBottomNavProps) {
  const [location, navigate] = useLocation();

  const handleNavClick = (item: typeof NAV_ITEMS[0]) => {
    if (item.path) {
      navigate(item.path);
    }
  };

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (!item.path) return false;
    if (item.path === '/organization-dashboard') {
      return location === '/organization-dashboard' || location === '/';
    }
    if (item.path === '/overview') {
      return location === '/overview';
    }
    return location.startsWith(item.path);
  };

  return (
    <>
      <div className="h-[60px] md:hidden" />
      <nav
        className="fixed bottom-0 left-0 right-0 h-[60px] grid grid-cols-5 items-center px-1 pb-[env(safe-area-inset-bottom,0px)] z-40 md:hidden bg-slate-100 border-t border-slate-200 shadow-[0_-2px_16px_rgba(0,0,0,0.08)]"
        data-testid="mobile-bottom-nav"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                data-testid={`nav-${item.id}`}
                className={`flex flex-col items-center justify-self-center gap-0.5 px-3 py-2 rounded-xl border-none cursor-pointer -translate-y-2 transition-all duration-200 min-w-[56px] min-h-[44px] shadow-lg ${
                  active
                    ? 'bg-sky-300 text-sky-900 shadow-sky-300/40'
                    : 'bg-sky-200 text-sky-800 shadow-sky-200/30 hover:shadow-sky-300/50'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-stone-50 flex items-center justify-center">
                  <item.icon size={17} />
                </div>
                <span className="text-[9px] font-semibold tracking-wide leading-none">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              data-testid={`nav-${item.id}`}
              className={`flex flex-col items-center justify-self-center gap-0.5 px-2 py-1.5 border-none cursor-pointer transition-all duration-200 min-w-[50px] min-h-[44px] rounded-lg ${
                active ? 'text-sky-700 bg-sky-200' : 'text-slate-500 bg-sky-50'
              }`}
            >
              <div className={`p-1 rounded-lg flex items-center justify-center transition-all duration-200 bg-stone-50`}>
                <item.icon size={17} strokeWidth={2} className={active ? 'text-sky-700' : 'text-slate-500'} />
              </div>
              <span className={`text-[9px] tracking-wide leading-none ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
