import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  FolderOpen, Users, Plus, MessageSquare,
  Target, BarChart3, FileText, Bell, Settings, CheckSquare, LogOut, User
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";
const NAV_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/organization-dashboard' },
  { id: 'applications', label: 'Applications', icon: FileText, path: '/applications' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, path: '/my-work' },
  { id: 'sdgs', label: 'SDGs', icon: Target, path: '/sdg-mapping' },
  { id: 'volunteers', label: 'Volunteers', icon: Users, path: '/volunteers' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/organization-messages' },
  { id: 'create', label: 'Create', icon: Plus, path: null },
];

interface OrganizationHeaderProps {
  activeTab?: string;
  onCreateClick?: () => void;
}

export default function OrganizationHeader({ activeTab = 'dashboard', onCreateClick }: OrganizationHeaderProps) {
  const { user, signOut } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      setIsProfileOpen(false);
      navigate('/landing');
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const currentTab = NAV_TABS.find(tab => tab.path === location)?.id || activeTab;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 35%, #0369a1 70%, #075985 100%)',
      padding: '0',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 4px 20px rgba(14, 165, 233, 0.35)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
    }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Left: Logo + Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingRight: '16px',
              borderRight: '1px solid rgba(255,255,255,0.4)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
            title="Go to landing page"
          >
            <img
              src={logoUrl}
              alt="Synerxus Logo"
              style={{ height: '36px', width: 'auto', filter: 'brightness(1.1) drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
            />
          </button>

          {/* Navigation Tabs - Hidden on Mobile */}
          <div style={{ alignItems: 'center', gap: '4px' }} className="hidden md:flex md:gap-1">
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
                backgroundColor: currentTab === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                border: currentTab === tab.id ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: currentTab === tab.id ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                boxShadow: currentTab === tab.id ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (currentTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <tab.icon size={16} style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }} />
              {tab.label}
            </button>
          ))}
          </div>
        </div>

        {/* Right: Notifications, Settings, Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Notifications Button - redirects to dashboard */}
          <button
            onClick={() => navigate('/organization-dashboard')}
            data-testid="notifications-button"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.35)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.28)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Bell size={18} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => navigate('/organization-profile-settings')}
            data-testid="settings-button"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.35)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.28)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Settings size={18} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
          </button>

          {/* Profile Dropdown Menu */}
          <DropdownMenu open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="profile-button"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  border: '2px solid rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.35)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {(user as any)?.avatar ? (
                  <img src={(user as any).avatar} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <Users size={18} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none" data-testid="text-user-display-name">
                  {user?.displayName || user?.email?.split('@')[0]}
                </p>
                <p className="text-xs leading-none text-muted-foreground" data-testid="text-user-email">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/profile')} data-testid="menu-profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/organization-profile-settings')} data-testid="menu-settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut} data-testid="menu-logout">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </nav>

    </div>
  );
}
