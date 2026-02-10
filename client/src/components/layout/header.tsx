import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useTheme } from "./theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bell,
  Search,
  Menu,
  User,
  Settings,
  LogOut,
  Home,
  CheckCircle,
  Award,
  Sparkles,
  Briefcase,
  Users,
  FolderOpen,
  Heart,
  Target,
  Trash2,
  RefreshCw,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSidebarContext } from "@/contexts/sidebar-context";
import { useCurrentUserId } from "@/hooks/use-current-user-id";
import Logo from "@/components/ui/logo";
import { queryClient } from "@/lib/queryClient";

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'application_approved':
    case 'application_submitted':
    case 'new_application':
      return { icon: CheckCircle, bg: 'bg-blue-100', fg: 'text-blue-600' };
    case 'badge_earned':
    case 'milestone':
      return { icon: Award, bg: 'bg-amber-100', fg: 'text-amber-600' };
    case 'opportunity_match':
    case 'sdg_match':
      return { icon: Sparkles, bg: 'bg-emerald-100', fg: 'text-emerald-600' };
    case 'task_assigned':
    case 'project_update':
      return { icon: Briefcase, bg: 'bg-purple-100', fg: 'text-purple-600' };
    case 'message':
    case 'new_message':
      return { icon: Bell, bg: 'bg-indigo-100', fg: 'text-indigo-600' };
    case 'volunteer_joined':
      return { icon: Users, bg: 'bg-teal-100', fg: 'text-teal-600' };
    case 'project_completed':
      return { icon: FolderOpen, bg: 'bg-green-100', fg: 'text-green-600' };
    case 'impact_update':
      return { icon: Heart, bg: 'bg-rose-100', fg: 'text-rose-600' };
    case 'sdg_contribution':
      return { icon: Target, bg: 'bg-orange-100', fg: 'text-orange-600' };
    default:
      return { icon: Bell, bg: 'bg-blue-100', fg: 'text-blue-600' };
  }
}

export default function Header() {
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { toggleSidebar } = useSidebarContext();
  const userId = useCurrentUserId();
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  // Fetch current user to determine user type
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const url = userId ? `/api/users/me?userId=${userId}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    },
    enabled: !!userId
  });

  // Fetch organization profile if user is organization
  const { data: organizationProfile } = useQuery({
    queryKey: ["/api/profile/organization", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const response = await fetch(`/api/profile/organization?userId=${currentUser.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser?.id && currentUser?.userType === 'organization'
  });

  // Fetch volunteer profile if user is volunteer
  const { data: volunteerProfile } = useQuery({
    queryKey: ["/api/intake/volunteer-profile", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const response = await fetch(`/api/intake/volunteer-profile?userId=${currentUser.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser?.id && currentUser?.userType === 'volunteer'
  });

  // Fetch real notifications from API
  const { data: notifications = [], refetch: refetchNotifications } = useQuery<any[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const response = await fetch(`/api/notifications?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data after invalidation
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 60000, // Refetch every minute as backup
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
  });

  // Mark all notifications as read
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const response = await fetch(`/api/notifications/clear-all?userId=${id}`, { method: 'POST' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
  });

  // Delete single notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
  });

  // Delete all notifications
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const response = await fetch(`/api/notifications/delete-all?userId=${id}`, { method: 'DELETE' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
  });

  // Hide header for organization users and PWA routes (which have their own headers)
  const isPwaRoute = location.endsWith('/pwa');

  if (currentUser?.userType === 'organization' || isPwaRoute) {
    return null;
  }

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      // Redirect to landing page after logout
      setLocation('/landing');
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogoClick = () => {
    if (user) {
      // Navigate to correct dashboard based on userType
      const userType = localStorage.getItem('userType') || currentUser?.userType;
      if (userType === 'corporate-partner') {
        setLocation('/csr-dashboard');
      } else if (userType === 'organization') {
        setLocation('/organization-dashboard');
      } else {
        setLocation('/volunteer-dashboard');
      }
    } else {
      setLocation('/landing');
    }
  };

  const handleHomeClick = () => {
    setLocation('/landing');
  };

  const handleProfileClick = () => {
    setLocation('/profile');
  };

  const handleSettingsClick = () => {
    if (currentUser?.userType === 'organization') {
      setLocation('/organization-profile-settings');
    } else if (currentUser?.userType === 'corporate-partner') {
      setLocation('/corporate-partner-profile-settings');
    } else {
      setLocation('/volunteer-profile-settings');
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    setNotificationPanelOpen(false);

    // Navigate based on notification type
    const notificationType = notification.type || '';

    if (notificationType.includes('application')) {
      setLocation('/my-work#applications');
    } else if (notificationType.includes('assignment')) {
      setLocation('/my-work#assignments');
    } else if (notificationType.includes('project')) {
      setLocation('/projects');
    } else if (notificationType.includes('volunteer')) {
      setLocation('/volunteers');
    } else if (notificationType.includes('opportunity')) {
      setLocation('/discover-opportunities');
    } else {
      setLocation('/dashboard');
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-xl border-b border-stone-200/50 fixed top-0 left-0 right-0 z-40 w-full safe-area-top shadow-sm">
      <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-4 gap-2 md:gap-4 min-w-0 max-w-7xl mx-auto">
        {/* Hamburger Menu - Toggle Sidebar (always visible) */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar}
          className="text-stone-500 focus:outline-none flex-shrink-0 flex"
          data-testid="button-hamburger-menu"
          title="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo - Synerxus on left side of search bar - Always visible with priority */}
        <button
          onClick={handleLogoClick}
          className="hover:opacity-80 transition-opacity flex-shrink-0 focus:outline-none hidden md:block"
          data-testid="button-logo-header"
          title={user ? "Go to dashboard" : "Go to home"}
        >
          <Logo size="sm" showMotto={true} showIcon={true} clickable={false} />
        </button>

        {/* Logo tablet version - smaller motto */}
        <button
          onClick={handleLogoClick}
          className="hover:opacity-80 transition-opacity flex-shrink-0 focus:outline-none hidden sm:block md:hidden"
          data-testid="button-logo-header-tablet"
          title={user ? "Go to dashboard" : "Go to home"}
        >
          <Logo size="sm" showMotto={false} showIcon={true} clickable={false} />
        </button>

        {/* Logo mobile version - icon only */}
        <button
          onClick={handleLogoClick}
          className="hover:opacity-80 transition-opacity flex-shrink-0 focus:outline-none sm:hidden"
          data-testid="button-logo-header-mobile"
          title={user ? "Go to dashboard" : "Go to home"}
        >
          <Logo size="sm" showMotto={false} showIcon={true} clickable={false} />
        </button>
        
        {/* Home Button - Show only when not logged in */}
        {!user && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleHomeClick}
            className="text-stone-600 hover:bg-stone-100 flex-shrink-0 hidden sm:flex gap-1"
            data-testid="button-home-header"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Button>
        )}
        
        {/* Spacer - fills gap between logo and right icons on screens without search bar */}
        <div className="flex-grow lg:hidden" />

        {/* Search Bar - Hidden on smaller screens to prioritize logo */}
        <div className="hidden lg:flex flex-grow max-w-2xl mx-2">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-stone-400" />
            </div>
            <Input
              type="text"
              className="pl-10 pr-3 py-2 w-full text-sm"
              placeholder="Search projects, tasks or volunteers..."
            />
          </div>
        </div>
        
        {/* Right Nav Items */}
        <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
          
          {/* Notifications Popover - Interactive Panel */}
          <Popover open={notificationPanelOpen} onOpenChange={setNotificationPanelOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-stone-500 focus:outline-none relative hidden md:flex"
                data-testid="button-notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 min-h-5 min-w-5 h-5 w-5 flex items-center justify-center px-0 text-xs font-bold leading-none rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0" sideOffset={8}>
              <div className="flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h3 className="font-semibold">Notifications</h3>
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} unread
                  </Badge>
                </div>

                {/* Bulk Actions */}
                {notifications.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 border-b bg-stone-50">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => clearAllMutation.mutate()}
                        disabled={clearAllMutation.isPending}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-white rounded-md transition-colors disabled:opacity-50"
                      >
                        {clearAllMutation.isPending ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        Mark All Read
                      </button>
                    )}
                    <button
                      onClick={() => deleteAllMutation.mutate()}
                      disabled={deleteAllMutation.isPending}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 ml-auto"
                    >
                      {deleteAllMutation.isPending ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Clear All
                    </button>
                  </div>
                )}

                <ScrollArea className="max-h-[350px]">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="h-12 w-12 mx-auto text-stone-300 mb-2" />
                      <p className="text-sm text-muted-foreground">No notifications yet</p>
                      <p className="text-xs text-stone-400 mt-1">
                        You'll receive notifications about SDG-matched partners and project updates
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.slice(0, 10).map((notification: any) => {
                        const timeAgo = notification.createdAt ?
                          getRelativeTime(new Date(notification.createdAt)) : '';
                        const { icon: NotifIcon, bg, fg } = getNotificationIcon(notification.type);
                        const isUnread = !notification.read;

                        return (
                          <div
                            key={notification.id}
                            className={`relative p-3 cursor-pointer hover:bg-stone-50 transition-colors ${isUnread ? 'bg-blue-50/50' : ''}`}
                            data-testid={`notification-${notification.id}`}
                          >
                            <button
                              onClick={() => handleNotificationClick(notification)}
                              className="w-full text-left"
                            >
                              <div className="flex items-start gap-3 pr-14">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
                                  <NotifIcon className={`h-4 w-4 ${fg}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                                      {notification.title}
                                    </span>
                                    {isUnread && (
                                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {notification.message}
                                  </p>
                                  <span className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {timeAgo}
                                  </span>
                                </div>
                              </div>
                            </button>
                            {/* Per-notification actions */}
                            <div className="absolute top-2.5 right-2 flex items-center gap-0.5">
                              {isUnread && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsReadMutation.mutate(notification.id);
                                  }}
                                  disabled={markAsReadMutation.isPending}
                                  className="p-1 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                                  title="Mark as read"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotificationMutation.mutate(notification.id);
                                }}
                                disabled={deleteNotificationMutation.isPending}
                                className="p-1 rounded text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="Delete notification"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {notifications.length > 0 && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-blue-600"
                      onClick={() => {
                        setNotificationPanelOpen(false);
                        setLocation('/dashboard');
                      }}
                    >
                      View all notifications
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          
          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center focus:outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={currentUser?.userType === 'organization' ? (organizationProfile?.organization?.logo || organizationProfile?.logo) : (volunteerProfile?.volunteerProfile?.profilePhotoUrl || volunteerProfile?.user?.avatar || currentUser?.avatar)}
                      alt="User avatar"
                    />
                    <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="ml-2 text-sm font-medium hidden md:block">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none" data-testid="text-user-display-name">
                    {user.displayName || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground" data-testid="text-user-email">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={handleProfileClick} data-testid="menu-profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={handleSettingsClick} data-testid="menu-settings">
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
          )}
        </div>
      </div>
    </header>
  );
}
