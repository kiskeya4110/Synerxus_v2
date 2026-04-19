import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  Menu,
  X,
  Home,
  FolderOpen,
  BarChart3,
  FileText,
  Users,
  MessageCircle,
  Settings,
  HelpCircle,
  LogOut,
  RefreshCw,
  Building2,
  CheckCircle,
  Clock,
  Sparkles,
  Briefcase,
  Heart,
  ChevronRight,
  Target,
  Award,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Logo from "@/components/ui/logo";
import { useCurrentUserId } from "@/hooks/use-current-user-id";
import { useNotifications, type Notification as AppNotification } from "@/hooks/use-notifications";

interface CSRPWAHeaderProps {
  companyName?: string;
  companyLogo?: string;
  userAvatar?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  notificationCount?: number;
}

export default function CSRPWAHeader({
  companyName = "CSR Partner",
  companyLogo,
  userAvatar,
  onRefresh,
  refreshing = false,
  notificationCount = 0,
}: CSRPWAHeaderProps) {
  const [, navigate] = useLocation();
  const { signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userIdStr = useCurrentUserId();
  const userId = userIdStr ? parseInt(userIdStr) : null;

  const {
    notifications,
    unreadCount: fetchedUnreadCount,
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
  const clearAllNotificationsMutation = { mutate: () => clearAll(), isPending: clearAllPending };
  const deleteNotificationMutation = { mutate: deleteOne, isPending: deleteOnePending };
  const deleteAllNotificationsMutation = { mutate: () => deleteAll(), isPending: deleteAllPending };

  const unreadCount = notificationCount || fetchedUnreadCount;

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

  // Get navigation path for notification (MVP routes only)
  const getNotificationPath = (notification: AppNotification): string => {
    const { relatedEntityType, relatedEntityId } = notification;

    if (relatedEntityType === 'project' && relatedEntityId) {
      return `/projects/${relatedEntityId}`;
    }
    return '/corporate/dashboard/pwa';
  };

  // Handle notification click
  const handleNotificationClick = (notification: AppNotification) => {
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

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/corporate/dashboard/pwa", bgColor: "bg-emerald-100", textColor: "text-emerald-600" },
    { icon: FileText, label: "Reports", path: "/csr-reports-exports", bgColor: "bg-amber-100", textColor: "text-amber-600" },
    { icon: HelpCircle, label: "Help", path: "/help", bgColor: "bg-stone-100", textColor: "text-stone-600" },
  ];

  return (
    <>
      {/* Header */}
      <header
        className="sticky top-0 z-40 shadow-md border-b"
        style={{
          background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #fef3c7 75%, #fde68a 100%)",
          borderColor: "rgba(16, 185, 129, 0.2)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-3">
          {/* Logo — 40% */}
          <div className="flex-shrink-0" style={{ width: '40%' }}>
            <Logo size="xs" variant="full" theme="light" />
          </div>
          {/* Type label — 30% */}
          <div className="flex-shrink-0 flex justify-center" style={{ width: '30%' }}>
            <span className="text-[11px] font-semibold text-emerald-600/70 uppercase tracking-widest">ESG Console</span>
          </div>
          {/* Actions — 20% */}
          <div className="flex-shrink-0 flex justify-end items-center gap-1.5" style={{ width: '20%' }}>
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setShowMenu(true)}
              className="w-10 h-10 rounded-lg bg-white/80 backdrop-blur flex items-center justify-center shadow-sm border border-emerald-100 touch-manipulation cursor-pointer active:scale-95"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Open navigation menu"
              data-testid="button-csr-pwa-hamburger-menu"
            >
              <Menu className="w-5 h-5 text-emerald-600 pointer-events-none" />
            </button>
          </div>
        </div>
      </header>

      {/* Full Screen Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-[100] bg-black/50" onClick={() => setShowMenu(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl animate-in slide-in-from-right duration-300"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div
              className="p-4 border-b"
              style={{
                background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 50%, #fef3c7 100%)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {companyLogo ? (
                    <img src={companyLogo} alt={companyName} className="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-emerald-900 text-sm">{companyName}</p>
                    <p className="text-xs text-emerald-700">ESG Console</p>
                  </div>
                </div>
                <button onClick={() => setShowMenu(false)} className="p-2 hover:bg-white/50 rounded-lg">
                  <X className="w-5 h-5 text-emerald-700" />
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    setShowMenu(false);
                    navigate(item.path);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 ${item.textColor}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Logout Button */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
              <button
                onClick={() => {
                  setShowMenu(false);
                  signOut();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-600">Sign Out</span>
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
            <div
              className="px-4 py-4"
              style={{ background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 50%, #fef3c7 100%)" }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-emerald-800 font-semibold text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </h2>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center hover:bg-white/50 transition-colors"
                >
                  <X className="w-5 h-5 text-emerald-700" />
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
                      className="flex-1 py-2 px-3 bg-white/40 hover:bg-white/60 rounded-lg text-emerald-700 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
                notifications.slice(0, 10).map((notification: AppNotification) => {
                  const { icon: NotifIcon, bg } = getNotificationIcon(notification.type);
                  const isUnread = !notification.read;

                  return (
                    <div
                      key={notification.id}
                      className={`relative w-full rounded-xl p-3 border transition-colors ${
                        isUnread
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
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
                              <p className={`font-medium text-sm ${isUnread ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                                {notification.title}
                              </p>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-emerald-500 text-[10px] mt-1 flex items-center gap-1">
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
