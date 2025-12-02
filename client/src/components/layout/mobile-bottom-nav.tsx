import { useLocation } from "wouter";
import { Home, FolderOpen, LayoutGrid, Users, Target } from "lucide-react";

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, path: '/organization-dashboard' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, path: '/my-work' },
  { id: 'overview', label: 'Overview', icon: LayoutGrid, path: '/overview', isCenter: true },
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
      <div className="h-14 md:hidden" />
      <nav
        className="fixed bottom-0 left-0 right-0 h-14 flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom,0px)] z-[1000] md:hidden"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          boxShadow: '0 -2px 12px rgba(102, 126, 234, 0.25)',
        }}
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
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: active 
                    ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)'
                    : 'rgba(255, 255, 255, 0.25)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: active ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
                  transform: 'translateY(-6px)',
                  transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
                }}
              >
                <item.icon size={18} style={{ color: active ? '#764ba2' : '#ffffff' }} />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              data-testid={`nav-${item.id}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '4px 6px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                transition: 'all 0.2s ease',
                minWidth: '48px',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  backgroundColor: active ? 'rgba(255, 255, 255, 0.35)' : 'transparent',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <item.icon size={18} strokeWidth={2} style={{ color: '#ffffff' }} />
              </div>
              <span style={{ fontSize: '9px', fontWeight: active ? '600' : '500', letterSpacing: '0.2px' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
