import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  Briefcase,
  User,
  Menu,
  X,
  LogOut,
  Bell,
  Sparkles,
  BarChart3,
  ClipboardList,
  Plus,
  Settings,
  HelpCircle,
  Shield,
  CheckCircle,
  Award,
  FolderOpen,
  Users,
  Heart,
  Target,
  Trash2,
  Clock,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User as UserType } from "@shared/schema";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { useCurrentUserId } from "@/hooks/use-current-user-id";
import { useUserType } from "@/hooks/use-user-type";
import { useNotifications, type Notification as AppNotification } from "@/hooks/use-notifications";

// Desktop nav items — minimal chrome, tabs live on the dashboard
const VOLUNTEER_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
];

// Dropdown menu items
const MENU_ITEMS = [
  { href: "/volunteer-profile-settings", label: "Profile Settings", icon: Settings },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
];

// Get notification icon based on type
function getNotificationIcon(type: string) {
  switch (type) {
    case 'application_approved':
    case 'application_submitted':
    case 'new_application':
      return { icon: CheckCircle, bg: 'bg-blue-500' };
    case 'badge_earned':
    case 'milestone':
      return { icon: Award, bg: 'bg-amber-500' };
    case 'opportunity_match':
    case 'sdg_match':
      return { icon: Sparkles, bg: 'bg-emerald-500' };
    case 'task_assigned':
    case 'project_update':
      return { icon: Briefcase, bg: 'bg-purple-500' };
    case 'message':
    case 'new_message':
      return { icon: Bell, bg: 'bg-indigo-500' };
    case 'volunteer_joined':
      return { icon: Users, bg: 'bg-teal-500' };
    case 'project_completed':
      return { icon: FolderOpen, bg: 'bg-green-500' };
    case 'impact_update':
      return { icon: Heart, bg: 'bg-rose-500' };
    case 'sdg_contribution':
      return { icon: Target, bg: 'bg-orange-500' };
    default:
      return { icon: Bell, bg: 'bg-slate-500' };
  }
}

// Format time ago
function formatTimeAgo(date: Date | string) {
  const now = new Date();
  const notifDate = new Date(date);
  const diffMs = now.getTime() - notifDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return notifDate.toLocaleDateString();
}

export default function VolunteerNav() {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { signOut } = useAuth();
  const userIdStr = useCurrentUserId();
  const userId = userIdStr ? parseInt(userIdStr) : null;

  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/me"],
    enabled: !!userId,
  });

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAsReadPending,
    clearAll,
    clearAllPending,
    deleteOne,
    deleteOnePending,
    deleteAll,
    deleteAllPending,
  } = useNotifications(userId);

  const markAsReadMutation = { mutate: markAsRead, isPending: markAsReadPending };
  const clearAllMutation = { mutate: () => clearAll(), isPending: clearAllPending };
  const deleteNotificationMutation = { mutate: deleteOne, isPending: deleteOnePending };
  const deleteAllMutation = { mutate: () => deleteAll(), isPending: deleteAllPending };

  // Prevent body scroll when notifications panel is open
  useEffect(() => {
    if (notificationsOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [notificationsOpen]);



  // Handle notification click — mark as read and close panel
  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    setNotificationsOpen(false);
    navigate('/dashboard');
  };

  // Handle logout
  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate("/");
  };

  // Don't show on PWA routes or landing/login routes
  const isPwaRoute = location.endsWith("/pwa");
  const standaloneRoutes = ["/landing", "/login", "/"];
  const isStandaloneRoute = standaloneRoutes.some(
    (route) => location === route || location.startsWith(route + "/")
  );

  const storedUserType = useUserType();
  const effectiveUserType = currentUser?.userType || storedUserType;

  if (effectiveUserType !== "volunteer" || isPwaRoute || isStandaloneRoute) {
    return null;
  }

  const userInitial = (currentUser?.displayName || currentUser?.username || "V")
    .charAt(0)
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8 flex-shrink-0">
              <Logo size="sm" variant="full" />

              {/* Desktop Nav Items */}
              <div className="hidden lg:flex items-center gap-1">
                {VOLUNTEER_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location === item.href ||
                    (item.href === "/dashboard" && location.startsWith("/dashboard"));

                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right Section */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Quick Log Button */}
              <Button
                variant="accent"
                size="sm"
                className="hidden md:flex"
                onClick={() => navigate("/log-activity")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Log Impact
              </Button>

              {/* Notifications Bell */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setNotificationsOpen(true)}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>

              {/* User Menu — single dropdown trigger for all screen sizes */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all",
                    "hover:bg-stone-100",
                    menuOpen && "bg-stone-100"
                  )}
                >
                  <Avatar size="sm" ring={menuOpen ? "primary" : "none"}>
                    <AvatarImage
                      src={currentUser?.avatar || undefined}
                      alt={currentUser?.displayName || "User"}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm font-medium text-foreground max-w-[120px] truncate">
                    {currentUser?.displayName || "Volunteer"}
                  </span>
                  {menuOpen ? (
                    <X className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Menu className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                    />

                    {/* Menu Panel */}
                    <div className="absolute right-0 top-full mt-2 w-64 z-[60] rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                      {/* User Info Header */}
                      <div className="px-4 py-3 bg-secondary/50 border-b border-border">
                        <div className="flex items-center gap-3">
                          <Avatar size="default">
                            <AvatarImage
                              src={currentUser?.avatar || undefined}
                              alt={currentUser?.displayName || "User"}
                            />
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                              {userInitial}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {currentUser?.displayName || "Volunteer"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {currentUser?.email || "volunteer@example.com"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        {MENU_ITEMS.map((item) => {
                          const Icon = item.icon;
                          const isActive = location === item.href;
                          return (
                            <Link key={item.href} href={item.href}>
                              <button
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                                  isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-foreground hover:bg-stone-100"
                                )}
                                onClick={() => setMenuOpen(false)}
                              >
                                <Icon className="h-4 w-4" />
                                <span className="text-sm font-medium">{item.label}</span>
                              </button>
                            </Link>
                          );
                        })}
                      </div>

                      {/* Admin Section */}
                      {currentUser?.isAdmin && (
                        <div className="border-t border-border py-2">
                          <p className="px-4 pt-1 pb-0.5 text-[10px] font-bold text-cyan-500 uppercase tracking-wider">Admin</p>
                          <Link href="/admin/pilot-dashboard">
                            <button
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-cyan-700 hover:bg-cyan-50 transition-colors"
                              onClick={() => setMenuOpen(false)}
                            >
                              <Shield className="h-4 w-4 text-cyan-600" />
                              <span className="text-sm font-medium">Pilot Dashboard</span>
                            </button>
                          </Link>
                        </div>
                      )}

                      {/* Logout */}
                      <div className="border-t border-border py-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span className="text-sm font-medium">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Notifications Panel - Full screen overlay */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-20">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setNotificationsOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-4 py-4 bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-slate-800 font-semibold text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center hover:bg-white/90 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-700" />
                </button>
              </div>

              {/* Bulk Actions */}
              {notifications.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => clearAllMutation.mutate()}
                      disabled={clearAllMutation.isPending}
                      className="flex-1 py-2 px-3 bg-white/50 hover:bg-white/80 rounded-lg text-slate-700 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {clearAllMutation.isPending ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Marking...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Mark All Read
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => deleteAllMutation.mutate()}
                    disabled={deleteAllMutation.isPending}
                    className="py-2 px-3 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {deleteAllMutation.isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear All
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[55vh] p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-10">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm font-medium">No notifications yet</p>
                  <p className="text-slate-400 text-xs mt-1">You'll see updates here when there's activity</p>
                </div>
              ) : (
                notifications.map((notification: AppNotification) => {
                  const { icon: NotifIcon, bg } = getNotificationIcon(notification.type);
                  const isUnread = !notification.read;

                  return (
                    <div
                      key={notification.id}
                      className={`relative rounded-xl p-3 border transition-all ${
                        isUnread
                          ? 'bg-blue-50/70 border-blue-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-3 pr-8">
                          <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                            <NotifIcon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium text-sm ${isUnread ? 'text-slate-800' : 'text-slate-600'}`}>
                                {notification.title}
                              </p>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-slate-400 text-[10px] mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Per-notification actions */}
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {isUnread && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification.id);
                            }}
                            disabled={markAsReadMutation.isPending}
                            className="p-1.5 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-3">
              <button
                onClick={() => setNotificationsOpen(false)}
                className="w-full py-2.5 text-center text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
