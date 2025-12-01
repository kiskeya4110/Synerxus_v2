import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { 
  FolderOpen, Users, Menu, X, Plus, 
  Target, BarChart3, FileText
} from "lucide-react";
import synerxusLogo from "@assets/image_1764559495133.png";

const NAV_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/organization-dashboard' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, path: '/projects' },
  { id: 'sdgs', label: 'SDGs', icon: Target, path: '/sdg-mapping' },
  { id: 'volunteers', label: 'Volunteers', icon: Users, path: '/volunteers' },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/impact-visualization' },
  { id: 'create', label: '+Create', icon: Plus, path: null },
];

interface OrganizationHeaderProps {
  activeTab?: string;
  onCreateClick?: () => void;
}

export default function OrganizationHeader({ activeTab = 'dashboard', onCreateClick }: OrganizationHeaderProps) {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTabClick = (tab: typeof NAV_TABS[0]) => {
    setMobileMenuOpen(false);
    if (tab.id === 'create') {
      onCreateClick?.();
    } else if (tab.path) {
      navigate(tab.path);
    }
  };

  const currentTab = NAV_TABS.find(tab => tab.path === location)?.id || activeTab;

  return (
    <div style={{ backgroundColor: '#166534', padding: '0', position: 'sticky', top: 0, zIndex: 50 }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Left: Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={synerxusLogo} 
            alt="SYNERXUS - Connect. Manage. Impact Globally." 
            style={{ height: '40px', objectFit: 'contain', cursor: 'pointer' }}
            onClick={() => navigate('/organization-dashboard')}
            data-testid="logo-image"
          />
        </div>

        {/* Center: Desktop Tabs */}
        <div style={{ display: 'flex', gap: '8px' }} className="desktop-nav">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              data-testid={`nav-tab-${tab.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: currentTab === tab.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Profile & Mobile Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/settings')}
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
            }}
          >
            {(user as any)?.avatar ? (
              <img src={(user as any).avatar} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <Users size={18} />
            )}
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            data-testid="mobile-menu-toggle"
            style={{
              display: 'none',
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-menu" style={{ backgroundColor: '#14532d', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)' }} data-testid="mobile-menu">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              data-testid={`mobile-nav-${tab.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-menu {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
