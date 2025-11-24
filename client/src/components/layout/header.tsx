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
  LogOut
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

  // Fetch current user to determine user type
  const userId = localStorage.getItem('currentUserId');
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
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
    } catch (error) {
      console.error("Error signing out:", error);
    }
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
    <header className="bg-white dark:bg-gray-800 shadow-sm fixed top-0 left-0 right-0 z-20">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Mobile Menu Button */}
        <button 
          onClick={toggleSidebar} 
          className="text-gray-500 dark:text-gray-400 focus:outline-none lg:hidden"
          data-testid="button-hamburger-menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        {/* Logo for mobile view - always link to landing page */}
        <div className="flex items-center lg:hidden">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Logo size="sm" />
          </Link>
        </div>
        
        {/* Search Bar */}
        <div className="hidden md:flex flex-grow max-w-2xl mx-4">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
            <Input 
              type="text" 
              className="pl-10 pr-3 py-2 w-full" 
              placeholder="Search projects, tasks or volunteers..." 
            />
          </div>
        </div>
        
        {/* Right Nav Items */}
        <div className="flex items-center space-x-4">
          {/* Dark Mode Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-gray-500 dark:text-gray-400 focus:outline-none"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 focus:outline-none relative" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-3 -right-3 min-h-6 min-w-6 h-6 w-6 flex items-center justify-center p-0 text-[11px] font-bold leading-tight rounded-full">
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
                      src={currentUser?.userType === 'organization' ? organizationProfile?.logo : volunteerProfile?.profilePhotoUrl} 
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
