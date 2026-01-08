import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  MoreVertical, LogOut, RefreshCw,
  FolderOpen, Users, Target, BarChart3,
  MessageSquare, Home, Bell, Trophy, X,
  TrendingUp, Award, Lightbulb, Flame, Settings,
  CheckCircle, Clock, Sparkles, Briefcase, Heart, ChevronRight, Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";
import type { Notification, User as UserType } from "@shared/schema";

interface OrganizationPWAHeaderProps {
  organizationName?: string;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  metrics?: {
    activeProjects?: number;
    activeVolunteers?: number;
    totalAiu?: number;
    totalHours?: number;
    sdgsAddressed?: number;
  };
}

export default function OrganizationPWAHeader({
  onRefresh,
  isRefreshing = false,
  metrics,
}: OrganizationPWAHeaderProps) {
  const [, navigate] = useLocation();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const queryClient = useQueryClient();
  const userId = localStorage.getItem('currentUserId');

  // Fetch current user to check admin status
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

  // Clear all notifications mutation
  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/notifications/clear-all?userId=${userId}`, { method: 'POST' });
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
      case 'new_application':
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
        return { icon: MessageSquare, color: 'indigo', bg: 'bg-indigo-500' };
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

  // Get navigation path for notification (organization-specific routes)
  const getNotificationPath = (notification: Notification): string => {
    const { type, relatedEntityType, relatedEntityId } = notification;

    switch (type) {
      case 'new_application':
      case 'application_submitted':
        return '/applications';
      case 'volunteer_joined':
        if (relatedEntityType === 'project' && relatedEntityId) {
          return `/projects/${relatedEntityId}`;
        }
        return '/volunteers';
      case 'project_update':
      case 'project_completed':
        if (relatedEntityId) {
          return `/projects/${relatedEntityId}`;
        }
        return '/organization-dashboard/pwa';
      case 'message':
        return '/organization-messages/pwa';
      case 'impact_update':
      case 'sdg_contribution':
        return '/impact-visualization';
      default:
        if (relatedEntityType === 'project' && relatedEntityId) {
          return `/projects/${relatedEntityId}`;
        }
        return '/organization-dashboard/pwa';
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
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

  // Prevent body scroll when menu or notifications panel is open
  useEffect(() => {
    if (showMenu || notificationsOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMenu, notificationsOpen]);

  const handleSignOut = async () => {
    try {
      setShowMenu(false);
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      navigate("/landing");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      await onRefresh();
    }
  };

  const menuSections = [
    {
      title: "MAIN",
      items: [
        { icon: MessageSquare, label: "Messages", desc: "Team communication", action: () => navigate('/organization-messages/pwa') },
      ]
    },
    {
      title: "ANALYTICS & REPORTS",
      items: [
        { icon: BarChart3, label: "Impact Report", desc: "Visualize your impact", action: () => navigate('/impact-visualization') },
        { icon: Target, label: "SDG Mapping", desc: "UN Goals alignment", action: () => navigate('/sdg-mapping') },
        { icon: Trophy, label: "Leaderboard", desc: "Top performers", action: () => navigate('/volunteer-leaderboard/pwa'), hot: true },
        { icon: TrendingUp, label: "Analytics", desc: "Performance metrics", action: () => navigate('/csr-reports-exports') },
      ]
    },
    {
      title: "TEAM & ENGAGEMENT",
      items: [
        { icon: Users, label: "Volunteers", desc: "Your team members", action: () => navigate('/volunteers') },
        { icon: Lightbulb, label: "Stories", desc: "Impact storytelling", action: () => navigate('/impact-storytelling') },
        { icon: Award, label: "Recognition", desc: "Celebrate achievements", action: () => navigate('/volunteer-leaderboard/pwa') },
      ]
    },
    {
      title: "ACCOUNT",
      items: [
        { icon: Settings, label: "Profile & Settings", desc: "Update organization profile", action: () => navigate('/organization-profile-settings') },
      ]
    },
    // Admin section - only shown for admin users
    ...(currentUser?.isAdmin ? [{
      title: "ADMIN",
      items: [
        { icon: Shield, label: "Admin Dashboard", desc: "Platform management", action: () => navigate('/admin/dashboard/pwa'), isAdmin: true },
      ]
    }] : []),
  ];

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 px-4 pb-3 flex items-center justify-between w-full max-w-[428px] mx-auto"
        style={{
          background: 'linear-gradient(to right, #fef9c3 0%, #fef3c7 25%, #dbeafe 50%, #bfdbfe 75%, #93c5fd 100%)',
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.25)',
          left: '50%',
          transform: 'translateX(-50%)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)'
        }}
      >
        <img
          src={logoUrl}
          alt="Synerxus"
          className="h-10 w-auto object-contain cursor-pointer flex-shrink-0"
          style={{ objectFit: 'contain', objectPosition: 'left center', maxWidth: '160px' }}
          onClick={() => navigate('/landing')}
        />

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-slate-700 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Notifications Button */}
          <button
            onClick={() => setNotificationsOpen(true)}
            className="relative w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Menu Button */}
          <button
            onClick={() => setShowMenu(true)}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all"
            aria-label="Menu"
          >
            <MoreVertical className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </header>

      {/* Full Screen Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-[9999] flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu Panel - with safe area padding */}
          <div className="absolute top-0 right-0 w-80 max-w-[90vw] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {/* Menu Header */}
            <div
              className="px-4 py-4 flex items-center justify-between flex-shrink-0"
              style={{ background: 'linear-gradient(to right, #fef9c3 0%, #dbeafe 50%, #93c5fd 100%)' }}
            >
              <p className="font-bold text-lg text-blue-900">Menu</p>
              <button
                onClick={() => setShowMenu(false)}
                className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-all"
              >
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            {/* Quick Stats */}
            {metrics && (
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-slate-800">{metrics.activeProjects || 0}</span>
                    <span className="text-slate-500">Projects</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-800">{metrics.activeVolunteers || 0}</span>
                    <span className="text-slate-500">Volunteers</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 mt-2 text-xs">
                  <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-full border border-slate-200">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span className="font-medium text-slate-700">{metrics.totalAiu?.toLocaleString() || 0} AIU</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-full border border-slate-200">
                    <span className="font-medium text-slate-700">{metrics.totalHours?.toLocaleString() || 0} Hrs</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-full border border-slate-200">
                    <Target className="w-3 h-3 text-teal-500" />
                    <span className="font-medium text-slate-700">{metrics.sdgsAddressed || 0} SDGs</span>
                  </div>
                </div>
              </div>
            )}

            {/* Menu Sections */}
            <div className="flex-1 overflow-y-auto">
              {menuSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="py-2">
                  {/* Section Title */}
                  <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {section.title}
                  </p>
                  {/* Section Items */}
                  {section.items.map((item, itemIndex) => {
                    const isAdminItem = (item as any).isAdmin;
                    return (
                      <button
                        key={itemIndex}
                        onClick={() => { setShowMenu(false); item.action(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isAdminItem
                            ? 'hover:bg-purple-50 active:bg-purple-100'
                            : 'hover:bg-slate-50 active:bg-slate-100'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isAdminItem ? 'bg-purple-100' : 'bg-slate-100'
                        }`}>
                          <item.icon className={`w-5 h-5 ${isAdminItem ? 'text-purple-600' : 'text-slate-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${isAdminItem ? 'text-purple-700' : 'text-slate-800'}`}>{item.label}</span>
                            {(item as any).hot && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-orange-500 text-white rounded uppercase">
                                Hot
                              </span>
                            )}
                          </div>
                          <p className={`text-xs truncate ${isAdminItem ? 'text-purple-500' : 'text-slate-500'}`}>{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Logout - Separate at bottom */}
              <div className="py-2 border-t border-slate-200 mt-2">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-red-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <LogOut className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-red-600">Logout</span>
                    <p className="text-xs text-red-400">Sign out safely</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 1rem) 1rem calc(env(safe-area-inset-bottom, 0px) + 1rem) 1rem' }}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setNotificationsOpen(false)}
          />

          {/* Notifications Panel */}
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div
              className="px-4 py-4"
              style={{ background: 'linear-gradient(to right, #fef9c3 0%, #dbeafe 50%, #93c5fd 100%)' }}
            >
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
              {/* Clear All Button */}
              {unreadCount > 0 && (
                <button
                  onClick={() => clearAllNotificationsMutation.mutate()}
                  disabled={clearAllNotificationsMutation.isPending}
                  className="mt-3 w-full py-2 px-3 bg-white/40 hover:bg-white/60 rounded-lg text-slate-700 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {clearAllNotificationsMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Clear All ({unreadCount})
                    </>
                  )}
                </button>
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
                  const { icon: NotifIcon, bg } = getNotificationIcon(notification.type);
                  const isUnread = !notification.read;

                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left rounded-xl p-3 border transition-colors ${
                        isUnread
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
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
                          <p className="text-blue-500 text-[10px] mt-1 flex items-center gap-1">
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
