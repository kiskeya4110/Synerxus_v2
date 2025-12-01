import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  FolderOpen, Users, Plus, 
  Target, BarChart3, FileText, Bell, Settings, CheckSquare
} from "lucide-react";
import logoUrl from "@assets/Synerxus Modern Logo  NBG_1763706841211.png";
const NAV_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/organization-dashboard' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, path: '/projects' },
  { id: 'my-work', label: 'My Work', icon: CheckSquare, path: '/my-work' },
  { id: 'sdgs', label: 'SDGs', icon: Target, path: '/sdg-mapping' },
  { id: 'volunteers', label: 'Volunteers', icon: Users, path: '/volunteers' },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/impact-visualization' },
  { id: 'create', label: 'Create', icon: Plus, path: null },
];

interface OrganizationHeaderProps {
  activeTab?: string;
  onCreateClick?: () => void;
}

export default function OrganizationHeader({ activeTab = 'dashboard', onCreateClick }: OrganizationHeaderProps) {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  const handleTabClick = (tab: typeof NAV_TABS[0]) => {
    if (tab.id === 'create') {
      onCreateClick?.();
    } else if (tab.path) {
      navigate(tab.path);
    }
  };

  const handleLogoClick = () => {
    navigate('/landing');
  };

  const currentTab = NAV_TABS.find(tab => tab.path === location)?.id || activeTab;

  return (
    <div style={{ backgroundColor: '#166534', padding: '0', position: 'sticky', top: 0, zIndex: 50 }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Left: Logo + Brand Name + Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Logo and Brand */}
          <button
            onClick={handleLogoClick}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '16px', borderRight: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title="Go to landing page"
          >
            <img 
              src={logoUrl} 
              alt="Synerxus Logo" 
              style={{ height: '32px', width: 'auto' }}
            />
            <span style={{ color: 'white', fontWeight: '700', fontSize: '16px', letterSpacing: '0.5px' }}>SYNERXUS</span>
          </button>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              data-testid={`nav-tab-${tab.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: currentTab === tab.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (currentTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
          </div>
        </div>

        {/* Right: Notifications, Settings, Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Notifications Button */}
          <button
            onClick={() => navigate('/notifications')}
            data-testid="notifications-button"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Bell size={18} />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => navigate('/organization-profile-settings')}
            data-testid="settings-button"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Settings size={18} />
          </button>

          {/* Profile Button */}
          <button
            onClick={() => navigate('/organization-profile-settings')}
            data-testid="profile-button"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              overflow: 'hidden',
            }}
          >
            {(user as any)?.avatar ? (
              <img src={(user as any).avatar} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <Users size={18} />
            )}
          </button>

        </div>
      </nav>


    </div>
  );
}
