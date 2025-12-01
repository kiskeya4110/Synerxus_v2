import { useLocation } from "wouter";
import { Home, FolderOpen, Plus, Users, Target } from "lucide-react";

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, path: '/organization-dashboard' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, path: '/my-work' },
  { id: 'create', label: 'Create', icon: Plus, path: null, isCenter: true },
  { id: 'volunteers', label: 'Volunteers', icon: Users, path: '/volunteers' },
  { id: 'sdgs', label: 'SDGs', icon: Target, path: '/sdg-mapping' },
];

interface MobileBottomNavProps {
  onCreateClick?: () => void;
}

export default function MobileBottomNav({ onCreateClick }: MobileBottomNavProps) {
  const [location, navigate] = useLocation();

  const handleNavClick = (item: typeof NAV_ITEMS[0]) => {
    if (item.id === 'create') {
      onCreateClick?.();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (!item.path) return false;
    if (item.path === '/organization-dashboard') {
      return location === '/organization-dashboard' || location === '/';
    }
    return location.startsWith(item.path);
  };

  return (
    <>
      <div className="h-20 md:hidden" />
      <nav
        className="fixed bottom-0 left-0 right-0 h-20 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,0px)] z-[1000] md:hidden"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          boxShadow: '0 -4px 20px rgba(102, 126, 234, 0.3)',
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
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                  transform: 'translateY(-10px)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                <Plus size={28} style={{ color: '#764ba2' }} />
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
                gap: '6px',
                padding: '10px 14px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                transition: 'all 0.3s ease',
                minWidth: '70px',
                borderRadius: '14px',
                transform: active ? 'scale(1.08)' : 'scale(1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = active ? 'scale(1.08)' : 'scale(1)';
              }}
            >
              <div
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  backgroundColor: active ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: active ? '0 4px 12px rgba(255, 255, 255, 0.3)' : 'none',
                }}
              >
                <item.icon size={28} strokeWidth={2.2} style={{ color: '#ffffff' }} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: active ? '700' : '600', letterSpacing: '0.3px' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
