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
      <div className="h-16 md:hidden" />
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom,0px)] z-50 md:hidden"
        style={{
          background: 'linear-gradient(90deg, #FAF9F7 0%, #FEF9E7 50%, #FFF8DC 100%)',
          boxShadow: '0 -2px 16px rgba(0, 0, 0, 0.08)',
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
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: active
                    ? 'linear-gradient(135deg, #14532d 0%, #166534 100%)'
                    : 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(22, 101, 52, 0.5)',
                  transform: 'translateY(-8px)',
                  transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
                  minWidth: '60px',
                  minHeight: '48px',
                }}
              >
                <item.icon size={20} style={{ color: '#ffffff' }} />
                <span style={{ fontSize: '10px', fontWeight: '600', color: '#ffffff', letterSpacing: '0.3px' }}>
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
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '6px 8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: active ? '#1e293b' : '#64748b',
                transition: 'all 0.2s ease',
                minWidth: '52px',
                minHeight: '48px',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  backgroundColor: active ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <item.icon size={20} strokeWidth={2} style={{ color: active ? '#059669' : '#64748b' }} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: active ? '600' : '500', letterSpacing: '0.2px' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
