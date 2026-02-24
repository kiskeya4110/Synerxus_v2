import { useState } from "react";
import { useLocation } from "wouter";
import {
  Menu, X, Home, LogOut, Settings,
  ClipboardList, Bell, User, Briefcase, BarChart3,
  Sparkles, ChevronRight, CheckCircle, Clock, Award, BookOpen,
  Target, Heart, FileText, Users, FolderOpen, RefreshCw, Shield, Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/components/ui/logo";
import { getAuthHeaders } from "@/lib/queryClient";
import type { User as UserType, Notification, VolunteerProfile } from "@shared/schema";

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
  const [refreshing, setRefreshing] = useState(false);
  const userId = localStorage.getItem('currentUserId');

  const queryClient = useQueryClient();

  // Get userType from localStorage as immediate fallback
  const storedUserType = localStorage.getItem('userType');
  const isVolunteer = storedUserType === 'volunteer';

  // Fetch current user
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/users/me', { headers, credentials: 'include' });
      return response.ok ? response.json() : null;
    },
    enabled: !!userId
  });

  // Fetch volunteer profile for profile photo (more up-to-date than user.avatar)
  // Use localStorage userType as fallback so we don't wait for currentUser to load
  const { data: volunteerProfileData } = useQuery<{ user: any; volunteerProfile: VolunteerProfile | null }>({
    queryKey: ["/api/intake/volunteer-profile", userId],
    queryFn: async () => {
      const response = await fetch(`/api/intake/volunteer-profile?userId=${userId}`);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId && (isVolunteer || currentUser?.userType === 'volunteer'),
    staleTime: 30000,
  });

  // Get the best available profile photo URL (volunteer profile photo takes priority)
  const profilePhotoUrl = volunteerProfileData?.volunteerProfile?.profilePhotoUrl || currentUser?.avatar || undefined;

  // Fetch notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/notifications`, { headers, credentials: "include" });
      return response.ok ? response.json() : [];
    },
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data after invalidation
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 60000, // Refetch every minute as backup
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Mark notification as read mutation with optimistic update
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onMutate: async (notificationId: number) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/notifications", userId] });
      // Snapshot previous value
      const previousNotifications = queryClient.getQueryData<Notification[]>(["/api/notifications", userId]);
      // Optimistically update
      queryClient.setQueryData<Notification[]>(["/api/notifications", userId], (old) =>
        old?.map(n => n.id === notificationId ? { ...n, read: true } : n) ?? []
      );
      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(["/api/notifications", userId], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    }
  });

  // Clear all notifications mutation (mark all as read) with optimistic update
  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/notifications/clear-all?userId=${userId}`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to clear notifications');
      return response.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/notifications", userId] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(["/api/notifications", userId]);
      queryClient.setQueryData<Notification[]>(["/api/notifications", userId], (old) =>
        old?.map(n => ({ ...n, read: true })) ?? []
      );
      return { previousNotifications };
    },
    onError: (err, vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["/api/notifications", userId], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    }
  });

  // Delete notification mutation (soft delete) with optimistic update
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete notification');
      return response.json();
    },
    onMutate: async (notificationId: number) => {
      await queryClient.cancelQueries({ queryKey: ["/api/notifications", userId] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(["/api/notifications", userId]);
      // Optimistically remove from list
      queryClient.setQueryData<Notification[]>(["/api/notifications", userId], (old) =>
        old?.filter(n => n.id !== notificationId) ?? []
      );
      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["/api/notifications", userId], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    }
  });

  // Delete all notifications mutation with optimistic update
  const deleteAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/notifications/delete-all?userId=${userId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete all notifications');
      return response.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/notifications", userId] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(["/api/notifications", userId]);
      // Optimistically clear all
      queryClient.setQueryData<Notification[]>(["/api/notifications", userId], []);
      return { previousNotifications };
    },
    onError: (err, vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["/api/notifications", userId], context.previousNotifications);
      }
    },
    onSettled: () => {
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
        return { icon: Bell, color: 'indigo', bg: 'bg-indigo-500' };
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

  // Handle refresh - invalidate all queries to get fresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Invalidate all relevant queries to force fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/users/me"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/intake/volunteer-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/volunteer/dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/volunteer/impact"] }),
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    }
    setTimeout(() => setRefreshing(false), 500);
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

  // Determine active menu item from current URL
  const currentPath = window.location.pathname + window.location.search;
  const getIsActive = (path: string) => {
    if (path === '/volunteer-dashboard?tab=dashboard') {
      return currentPath === '/volunteer-dashboard?tab=dashboard' || currentPath === '/volunteer-dashboard';
    }
    return currentPath.includes(path);
  };

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/volunteer-dashboard?tab=dashboard" },
    { icon: Briefcase, label: "My Projects", path: "/volunteer-dashboard?tab=projects" },
    { icon: Sparkles, label: "Discover", path: "/volunteer-dashboard?tab=potential" },
    { icon: ClipboardList, label: "Log Activity", action: handleLogActivity, isLogActivity: true },
    { icon: BarChart3, label: "My Impact", path: "/volunteer-dashboard?tab=impacts" },
    { icon: BookOpen, label: "Stories", path: "/volunteer-dashboard?tab=stories" },
    { icon: User, label: "Profile", path: "/volunteer-dashboard?tab=profile" },
    { icon: Settings, label: "Settings", path: "/volunteer-profile-settings" },
    // Admin dashboard - only shown for admin users (uses PWA version on mobile)
    ...(currentUser?.isAdmin ? [{ icon: Shield, label: "Pilot Dashboard", path: "/admin/pilot-dashboard", isAdmin: true }] : []),
  ];

  return (
    <>
      {/* Main Header - Light off-white theme */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-stone-200">
        {/* Safe area padding for notched devices */}
        <div className="pt-[max(0.5rem,env(safe-area-inset-top))]" />

        <div className="flex items-center justify-between px-5 py-3.5">
          {/* Logo — 40% */}
          <div className="flex-shrink-0" style={{ width: '40%' }}>
            <Logo size="xs" variant="full" theme="light" />
          </div>
          {/* Type label — 30% */}
          <div className="flex-shrink-0 flex justify-center" style={{ width: '30%' }}>
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest">Impact Wallet</span>
          </div>
          {/* Actions — 20% */}
          <div className="flex-shrink-0 flex justify-end items-center gap-1" style={{ width: '20%' }}>
            {/* Notifications */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-all touch-manipulation cursor-pointer active:scale-95"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Bell className="w-4 h-4 text-stone-500 pointer-events-none" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center pointer-events-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-all touch-manipulation cursor-pointer active:scale-95"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              data-testid="button-pwa-hamburger-menu"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4 text-stone-600 pointer-events-none" />
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

          {/* Menu Panel - Compact design */}
          <div className="relative ml-auto w-[75%] max-w-[280px] h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Menu Header - Compact brand gradient */}
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-4 py-3 pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.25rem))]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-xs font-medium">Menu</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* User Info - Compact */}
              <div className="flex items-center gap-2.5">
                <Avatar className="h-10 w-10 border-2 border-white/30 shadow-lg">
                  <AvatarImage src={profilePhotoUrl} alt={currentUser?.displayName || 'User'} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-base font-semibold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    {currentUser?.displayName || currentUser?.username || 'Volunteer'}
                  </p>
                  <p className="text-white/60 text-xs truncate">
                    {currentUser?.email || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items - Compact */}
            <div className="flex-1 overflow-y-auto py-1.5">
              {menuItems.map((item, index) => {
                const isAdminItem = (item as any).isAdmin;
                const isLogActivity = (item as any).isLogActivity;
                // Check if this menu item is active (highlight the current page)
                const isActive = item.path ? getIsActive(item.path) : (isLogActivity && currentPath.includes('log-activity'));
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (item.action) {
                        item.action();
                      } else if (item.path) {
                        setMenuOpen(false);
                        // For volunteer-dashboard with query params, use direct navigation
                        // to ensure the tab change is properly detected
                        if (item.path.startsWith('/volunteer-dashboard?')) {
                          window.history.pushState({}, '', item.path);
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        } else {
                          navigate(item.path);
                        }
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                      isAdminItem
                        ? 'bg-purple-50 text-purple-600'
                        : isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    data-testid={`menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isAdminItem
                        ? 'bg-purple-100'
                        : isActive
                        ? 'bg-blue-100'
                        : 'bg-slate-100'
                    }`}>
                      <item.icon className={`w-4 h-4 ${
                        isAdminItem
                          ? 'text-purple-600'
                          : isActive
                          ? 'text-blue-600'
                          : 'text-slate-600'
                      }`} />
                    </div>
                    <span className="font-medium text-sm flex-1">{item.label}</span>
                    <ChevronRight className={`w-4 h-4 ${
                      isAdminItem
                        ? 'text-purple-400'
                        : isActive
                        ? 'text-blue-400'
                        : 'text-slate-400'
                    }`} />
                  </button>
                );
              })}
            </div>

            {/* Logout Button - Compact */}
            <div className="border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
                data-testid="menu-logout"
              >
                <LogOut className="w-4 h-4" />
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
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-stone-50 border-b border-stone-200 px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-stone-800 font-semibold text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </h2>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center hover:bg-stone-300 transition-colors"
                >
                  <X className="w-5 h-5 text-stone-600" />
                </button>
              </div>
              {/* Action Buttons */}
              {notifications.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {/* Mark All Read Button */}
                  {unreadCount > 0 && (
                    <button
                      onClick={() => clearAllNotificationsMutation.mutate()}
                      disabled={clearAllNotificationsMutation.isPending}
                      className="flex-1 py-2 px-3 bg-white/40 hover:bg-white/60 rounded-lg text-slate-700 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {clearAllNotificationsMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Marking...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Mark Read ({unreadCount})
                        </>
                      )}
                    </button>
                  )}
                  {/* Delete All Button */}
                  <button
                    onClick={() => deleteAllNotificationsMutation.mutate()}
                    disabled={deleteAllNotificationsMutation.isPending}
                    className="py-2 px-3 bg-red-100/60 hover:bg-red-100 rounded-lg text-red-700 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {deleteAllNotificationsMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
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
                    <div
                      key={notification.id}
                      className={`relative w-full rounded-xl p-3 border transition-colors ${
                        isUnread
                          ? 'bg-blue-50 border-blue-100'
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
                            <p className="text-blue-500 text-[10px] mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                        </div>
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotificationMutation.mutate(notification.id);
                        }}
                        disabled={deleteNotificationMutation.isPending}
                        className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-3">
              {notifications.length > 10 ? (
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate('/notifications');
                  }}
                  className="w-full py-2.5 text-center text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <span>View All {notifications.length} Notifications</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="w-full py-2.5 text-center text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-xl transition-colors"
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
