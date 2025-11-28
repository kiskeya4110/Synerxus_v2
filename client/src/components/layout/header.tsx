import { useLocation, Link } from "wouter";
import { useTheme } from "./theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, 
  Search, 
  Moon, 
  Sun, 
  Menu,
  User,
  Settings,
  LogOut,
  Home
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
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

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { toggleSidebar } = useSidebarContext();
  const userId = useCurrentUserId();

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
      const response = await fetch('/api/profile/organization');
      if (!response.ok) return null;
      return response.json();
    },
    enabled: currentUser?.userType === 'organization'
  });

  // Fetch volunteer profile if user is volunteer
  const { data: volunteerProfile } = useQuery({
    queryKey: ["/api/intake/volunteer-profile", currentUser?.id],
    queryFn: async () => {
      const response = await fetch('/api/intake/volunteer-profile');
      if (!response.ok) return null;
      return response.json();
    },
    enabled: currentUser?.userType === 'volunteer'
  });

  // Fetch real notifications from API
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const response = await fetch(`/api/notifications?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 60000 // Refetch every minute
  });

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
      setLocation('/dashboard');
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

  const handleNotificationClick = async (notification: any) => {
    try {
      // Mark notification as read on backend
      const response = await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.statusText}`);
      }
      
      // Invalidate cache to refresh notification list
      await queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
      
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
        // Default to dashboard for general notifications
        setLocation('/dashboard');
      }
    } catch (error) {
      console.error("Error handling notification click:", error instanceof Error ? error.message : String(error));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to open notification",
        variant: "destructive"
      });
    }
  };

  return (
    <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 fixed top-0 left-0 right-0 z-40 w-full safe-area-top shadow-sm">
      <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-4 gap-2 md:gap-4 min-w-0 max-w-7xl mx-auto">
        {/* Hamburger Menu - Toggle Sidebar (hidden on mobile) */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar}
          className="text-gray-500 dark:text-gray-400 focus:outline-none flex-shrink-0 hidden md:flex"
          data-testid="button-hamburger-menu"
          title="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo - Synerxus on left side of search bar */}
        <button 
          onClick={handleLogoClick}
          className="hover:opacity-80 transition-opacity flex-shrink-0 min-w-0 focus:outline-none hidden sm:block"
          data-testid="button-logo-header"
          title={user ? "Go to dashboard" : "Go to home"}
        >
          <Logo size="sm" showMotto={true} showIcon={true} />
        </button>

        {/* Logo mobile version - icon only */}
        <button 
          onClick={handleLogoClick}
          className="hover:opacity-80 transition-opacity flex-shrink-0 min-w-0 focus:outline-none sm:hidden"
          data-testid="button-logo-header-mobile"
          title={user ? "Go to dashboard" : "Go to home"}
        >
          <Logo size="sm" showMotto={false} showIcon={true} />
        </button>
        
        {/* Home Button - Show only when not logged in */}
        {!user && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleHomeClick}
            className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 hidden sm:flex gap-1"
            data-testid="button-home-header"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Button>
        )}
        
        {/* Search Bar */}
        <div className="hidden sm:flex flex-grow max-w-2xl mx-2">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
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
          
          {/* Dark Mode Toggle - hidden on mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-gray-500 dark:text-gray-400 focus:outline-none hidden md:flex"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          
          {/* Notifications - hidden on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 focus:outline-none relative hidden md:flex" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 min-h-7 min-w-7 h-7 w-7 flex items-center justify-center px-1 text-xs font-bold leading-none rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-80 max-h-96 overflow-y-auto">
              <div className="px-4 py-2 border-b">
                <h3 className="font-semibold">Notifications</h3>
                <p className="text-xs text-gray-500">{unreadCount} unread</p>
              </div>
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    You'll receive notifications about SDG-matched partners and project updates
                  </p>
                </div>
              ) : (
                <>
                  {notifications.map((notification: any) => {
                    const timeAgo = notification.createdAt ? 
                      getRelativeTime(new Date(notification.createdAt)) : '';
                    
                    return (
                      <DropdownMenuItem 
                        key={notification.id} 
                        className="cursor-pointer p-4 flex flex-col items-start gap-1"
                        onClick={() => handleNotificationClick(notification)}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium text-sm">{notification.title}</span>
                          {!notification.read && (
                            <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{notification.message}</p>
                        <span className="text-xs text-gray-500">{timeAgo}</span>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer justify-center text-sm text-primary">
                    View all notifications
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center focus:outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={currentUser?.userType === 'organization' ? (organizationProfile?.organization?.logo || organizationProfile?.logo) : (volunteerProfile?.user?.avatar || volunteerProfile?.avatar)} 
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
                <DropdownMenuItem className="cursor-pointer" onClick={handleProfileClick} data-testid="menu-settings">
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
