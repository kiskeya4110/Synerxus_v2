import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  FolderOpen, Users, Plus, MessageSquare,
  Target, BarChart3, FileText, Bell, Settings, LogOut, User
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";

// Helper function for relative time
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
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
  const userId = localStorage.getItem('currentUserId');

  // Fetch notifications for organization user
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const response = await fetch(`/api/notifications?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const handleNotificationClick = async (notification: any) => {
    try {
      // Mark notification as read on backend
      const response = await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Invalidate cache to refresh notification list
      await queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });

      // Navigate based on notification type
      const notificationType = notification.type || '';
      if (notificationType.includes('application') || notificationType === 'new_application') {
        navigate('/applications');
      } else if (notificationType.includes('project') || notificationType.includes('assignment')) {
        navigate('/my-work');
      } else if (notificationType.includes('message')) {
        navigate('/organization-messages');
      } else if (notificationType.includes('volunteer')) {
        navigate('/volunteers');
      } else {
        // Default to dashboard for general notifications
        navigate('/organization-dashboard');
      }
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

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
      background: 'linear-gradient(to right, #fffbeb 0%, #fef3c7 30%, #fcd34d 70%, #f59e0b 100%)',
      padding: '0',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 4px 20px rgba(245, 158, 11, 0.25)',
      borderBottom: '1px solid rgba(245, 158, 11, 0.2)'
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
              borderRight: '1px solid rgba(180, 83, 9, 0.3)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
            title="Go to landing page"
          >
            <img
              src={logoUrl}
              alt="Synerxus Logo"
              style={{ height: '36px', width: 'auto', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
            />
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
                backgroundColor: currentTab === tab.id ? 'rgba(180, 83, 9, 0.15)' : 'rgba(255,255,255,0.5)',
                border: currentTab === tab.id ? '1px solid rgba(180, 83, 9, 0.4)' : '1px solid rgba(180, 83, 9, 0.2)',
                borderRadius: '8px',
                color: currentTab === tab.id ? '#92400e' : '#78350f',
                fontSize: '14px',
                fontWeight: currentTab === tab.id ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                textShadow: 'none',
                boxShadow: currentTab === tab.id ? '0 2px 8px rgba(180, 83, 9, 0.15)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (currentTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(180, 83, 9, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(180, 83, 9, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)';
                  e.currentTarget.style.borderColor = 'rgba(180, 83, 9, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <tab.icon size={16} style={{ color: currentTab === tab.id ? '#92400e' : '#78350f' }} />
              {tab.label}
            </button>
          ))}
          </div>
        </div>

        {/* Right: Notifications, Settings, Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="notifications-button"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(180, 83, 9, 0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#78350f',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(180, 83, 9, 0.1)',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(180, 83, 9, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(180, 83, 9, 0.4)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.6)';
                  e.currentTarget.style.borderColor = 'rgba(180, 83, 9, 0.3)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Bell size={18} style={{ color: '#78350f' }} />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 min-h-5 min-w-5 h-5 w-5 flex items-center justify-center px-0 text-xs font-bold leading-none rounded-full"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between p-3 border-b">
                <h3 className="font-semibold">Notifications</h3>
                <p className="text-xs text-gray-500">{unreadCount} unread</p>
              </div>
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No notifications yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    You'll receive notifications about applications and project updates
                  </p>
                </div>
              ) : (
                <>
                  {notifications.slice(0, 10).map((notification: any) => {
                    const timeAgo = notification.createdAt ?
                      getRelativeTime(new Date(notification.createdAt)) : '';

                    return (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`cursor-pointer p-3 flex flex-col items-start gap-1 ${!notification.read ? 'bg-blue-50' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between w-full">
                          <span className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                            {notification.title}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">{timeAgo}</span>
                        </div>
                        <span className="text-xs text-gray-600 line-clamp-2">
                          {notification.message}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer justify-center text-sm text-primary"
                    onClick={() => navigate('/applications')}
                  >
                    View all applications
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings Button */}
          <button
            onClick={() => navigate('/organization-profile-settings')}
            data-testid="settings-button"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(180, 83, 9, 0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#78350f',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(180, 83, 9, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(180, 83, 9, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(180, 83, 9, 0.4)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.6)';
              e.currentTarget.style.borderColor = 'rgba(180, 83, 9, 0.3)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Settings size={18} style={{ color: '#78350f' }} />
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
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  border: '2px solid rgba(180, 83, 9, 0.4)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#78350f',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 10px rgba(180, 83, 9, 0.15)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(180, 83, 9, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(180, 83, 9, 0.5)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.borderColor = 'rgba(180, 83, 9, 0.4)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {(user as any)?.avatar ? (
                  <img src={(user as any).avatar} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <Users size={18} style={{ color: '#78350f' }} />
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
