import { useState } from "react";
import { useLocation } from "wouter";
import {
  Menu, X, Home, Settings, MessageCircle, LogOut,
  ClipboardList, Bell, User, Briefcase, BarChart3,
  Sparkles, ChevronRight, CheckCircle, Clock, Award, BookOpen, ChevronDown, Trophy,
  Target, Heart, FileText, Users, FolderOpen
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";
import type { User as UserType, Notification } from "@shared/schema";

interface PWAHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
  onLogActivity?: () => void;
}

export default function PWAHeader({ showBackButton = false, onBack, onLogActivity }: PWAHeaderProps) {
  const [, navigate] = useLocation();
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userId = localStorage.getItem('currentUserId');

  const queryClient = useQueryClient();

  // Fetch current user
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const url = userId ? `/api/users/me?userId=${userId}` : '/api/users/me';
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      const response = await fetch(`/api/notifications?userId=${userId}`);
      return response.ok ? response.json() : [];
    },
    enabled: !!userId,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    }
  });

  // Get unread notifications count
  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'application_approved':
      case 'application_submitted':
        return { icon: CheckCircle, color: 'blue', bg: 'bg-blue-500' };
      case 'badge_earned':
      case 'milestone':
        return { icon: Award, color: 'amber', bg: 'bg-amber-500' };
      case 'opportunity_match':
      case 'sdg_match':
        return { icon: Sparkles, color: 'emerald', bg: 'bg-emerald-500' };
      case 'task_assigned':
      case 'project_update':
        return { icon: Briefcase, color: 'purple', bg: 'bg-purple-500' };
      case 'message':
        return { icon: MessageCircle, color: 'indigo', bg: 'bg-indigo-500' };
      case 'volunteer_joined':
        return { icon: Users, color: 'teal', bg: 'bg-teal-500' };
      case 'project_completed':
        return { icon: FolderOpen, color: 'green', bg: 'bg-green-500' };
      case 'impact_update':
        return { icon: Heart, color: 'rose', bg: 'bg-rose-500' };
      case 'sdg_contribution':
        return { icon: Target, color: 'orange', bg: 'bg-orange-500' };
      default:
        return { icon: Bell, color: 'slate', bg: 'bg-slate-500' };
    }
  };

  // Get navigation path for notification
  const getNotificationPath = (notification: Notification): string => {
    const { type, relatedEntityType, relatedEntityId } = notification;

    // Route based on type first
    switch (type) {
      case 'application_approved':
      case 'application_submitted':
        if (relatedEntityType === 'project' && relatedEntityId) {
          return `/projects/${relatedEntityId}`;
        }
        return '/volunteer-dashboard?tab=projects';

      case 'badge_earned':
      case 'milestone':
        return '/volunteer-dashboard?tab=impacts';

      case 'opportunity_match':
      case 'sdg_match':
        if (relatedEntityType === 'opportunity' && relatedEntityId) {
          return `/opportunities/${relatedEntityId}`;
        }
        return '/discover-opportunities/pwa';

      case 'task_assigned':
        if (relatedEntityType === 'project' && relatedEntityId) {
          return `/projects/${relatedEntityId}`;
        }
        return '/volunteer-dashboard?tab=projects';

      case 'project_update':
      case 'project_completed':
        if (relatedEntityId) {
          return `/projects/${relatedEntityId}`;
        }
        return '/volunteer-dashboard?tab=projects';

      case 'message':
        return '/volunteer-messages/pwa';

      case 'volunteer_joined':
        if (relatedEntityType === 'project' && relatedEntityId) {
          return `/projects/${relatedEntityId}`;
        }
        return '/volunteers';

      case 'impact_update':
      case 'sdg_contribution':
        return '/volunteer-dashboard?tab=impacts';

      default:
        // Fallback based on relatedEntityType
        if (relatedEntityType === 'project' && relatedEntityId) {
          return `/projects/${relatedEntityId}`;
        }
        if (relatedEntityType === 'opportunity' && relatedEntityId) {
          return `/opportunities/${relatedEntityId}`;
        }
        if (relatedEntityType === 'user' && relatedEntityId) {
          return `/profile/${relatedEntityId}`;
        }
        return '/volunteer-dashboard';
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    setNotificationsOpen(false);
    navigate(getNotificationPath(notification));
  };

  // Format time ago
  const formatTimeAgo = (date: Date | string) => {
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
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const handleLogActivity = () => {
    setMenuOpen(false);
    if (onLogActivity) {
      onLogActivity();
    } else {
      navigate('/volunteer-dashboard?tab=log-activity');
    }
  };

  const userInitial = (currentUser?.displayName || currentUser?.username || 'U').charAt(0).toUpperCase();

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/volunteer-dashboard" },
    { icon: Briefcase, label: "My Projects", path: "/volunteer-dashboard?tab=projects" },
    { icon: Sparkles, label: "Discover", path: "/discover-opportunities/pwa" },
    { icon: ClipboardList, label: "Log Activity", action: handleLogActivity, highlight: true },
    { icon: BarChart3, label: "My Impact", path: "/impact-report" },
    { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
    { icon: MessageCircle, label: "Messages", path: "/volunteer-messages/pwa" },
    { icon: BookOpen, label: "Stories", path: "/stories" },
    { icon: User, label: "Profile", path: "/volunteer-dashboard?tab=profile" },
    { icon: Settings, label: "Settings", path: "/volunteer-profile-settings" },
  ];

  return (
    <>
      {/* Main Header - Sky blue to light gold gradient */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-sky-400 via-sky-300 to-amber-200">
        {/* Safe area padding for notched devices */}
        <div className="pt-[max(0.5rem,env(safe-area-inset-top))]" />

        <div className="px-4 py-3 flex items-center justify-between">
          {/* Logo - Site approved logo */}
          <button
            onClick={() => navigate('/volunteer-dashboard')}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <img
              src={logoUrl}
              alt="Synerxus"
              className="h-10 w-auto object-contain"
            />
          </button>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center hover:bg-white/70 transition-all shadow-sm"
            >
              <Bell className="w-5 h-5 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Profile/Menu Button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all shadow-sm"
              data-testid="button-pwa-menu"
            >
              <Avatar className="h-8 w-8 border-2 border-white/60 shadow-sm">
                <AvatarImage src={currentUser?.avatar || undefined} alt={currentUser?.displayName || 'User'} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-semibold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="relative ml-auto w-[85%] max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Menu Header - Brand gradient */}
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-5 py-6 pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.5rem))]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/60 text-sm font-medium">Menu</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 border-2 border-white/30 shadow-lg">
                  <AvatarImage src={currentUser?.avatar || undefined} alt={currentUser?.displayName || 'User'} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xl font-semibold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-lg truncate">
                    {currentUser?.displayName || currentUser?.username || 'Volunteer'}
                  </p>
                  <p className="text-white/60 text-sm truncate">
                    {currentUser?.email || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-3">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.path) {
                      setMenuOpen(false);
                      navigate(item.path);
                    }
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 transition-colors text-left ${
                    item.highlight
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  data-testid={`menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    item.highlight
                      ? 'bg-emerald-100 dark:bg-emerald-900/40'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <item.icon className={`w-5 h-5 ${
                      item.highlight
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`} />
                  </div>
                  <span className="font-medium flex-1">{item.label}</span>
                  <ChevronRight className={`w-5 h-5 ${
                    item.highlight
                      ? 'text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`} />
                </button>
              ))}
            </div>

            {/* Logout Button */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                data-testid="menu-logout"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setNotificationsOpen(false)}
          />

          {/* Notifications Panel */}
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-400 via-sky-300 to-amber-200 px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-slate-800 font-semibold text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </h2>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center hover:bg-white/50 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-700" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No notifications yet</p>
                  <p className="text-slate-400 text-xs mt-1">You'll see updates here when there's activity</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notification: Notification) => {
                  const { icon: NotifIcon, color, bg } = getNotificationIcon(notification.type);
                  const isUnread = !notification.read;

                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left rounded-xl p-3 border transition-colors ${
                        isUnread
                          ? `bg-${color}-50 dark:bg-${color}-900/20 border-${color}-100 dark:border-${color}-800 hover:bg-${color}-100 dark:hover:bg-${color}-900/30`
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                      style={{
                        backgroundColor: isUnread ? `var(--${color}-50, #f0fdf4)` : undefined,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                          <NotifIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium text-sm ${isUnread ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                              {notification.title}
                            </p>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className={`text-${color}-500 text-[10px] mt-1 flex items-center gap-1`}>
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-3">
              {notifications.length > 10 ? (
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate('/notifications');
                  }}
                  className="w-full py-2.5 text-center text-slate-600 dark:text-slate-400 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <span>View All {notifications.length} Notifications</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="w-full py-2.5 text-center text-slate-600 dark:text-slate-400 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
