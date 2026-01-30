import { ReactNode, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import {
  Home,
  BarChart3,
  Users,
  Briefcase,
  FileText,
  Settings,
  TrendingUp,
  Bell,
  Building2,
  UserCheck,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  Zap,
  Calendar,
  Award,
  Menu,
  Trash2,
} from "lucide-react";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";

// Notification types
interface Notification {
  id: string;
  type: "success" | "warning" | "info" | "achievement";
  title: string;
  message: string;
  time: string;
  read: boolean;
  link: string;
  actionLabel?: string;
}

// Helper function to format relative time
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

interface CSRLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  activeNav?: "dashboard" | "overview" | "engagement" | "sdgs" | "leaderboard" | "recognition" | "challenges" | "geographic" | "impact" | "portfolio" | "reports" | "settings";
  hideHeader?: boolean;
}

// Sidebar navigation items organized by sections
const navSections = [
  {
    title: "DASHBOARD",
    items: [
      { id: "overview", label: "Overview", icon: Home, href: "/csr-dashboard?tab=overview", description: "ESG Console home" },
      { id: "engagement", label: "Employee Engagement", icon: UserCheck, href: "/csr-dashboard?tab=engagement", description: "Team activity & stats" },
      { id: "sdg", label: "SDG Alignment", icon: TrendingUp, href: "/csr-dashboard?tab=sdgs", description: "UN Goals tracking" },
    ]
  },
  {
    title: "ANALYTICS & REPORTS",
    items: [
      { id: "impact", label: "Impact Reports", icon: BarChart3, href: "/csr-impact-reporting", description: "View detailed reports" },
      { id: "exports", label: "Export Data", icon: FileText, href: "/csr-reports-exports", description: "Download CSV/PDF reports" },
      { id: "geographic", label: "Geographic Impact", icon: Building2, href: "/csr-dashboard?tab=geographic", description: "Map view of activities" },
    ]
  },
  {
    title: "ENGAGEMENT TOOLS",
    items: [
      { id: "leaderboard", label: "Leaderboard", icon: Award, href: "/csr-dashboard?tab=leaderboard", description: "Top performers", hot: true },
      { id: "recognition", label: "Recognition", icon: Zap, href: "/csr-dashboard?tab=recognition", description: "Celebrate employees" },
      { id: "challenges", label: "Challenges", icon: Calendar, href: "/csr-dashboard?tab=challenges", description: "Active initiatives" },
    ]
  },
  {
    title: "ACCOUNT",
    items: [
      { id: "settings", label: "Settings", icon: Settings, href: "/corporate-partner-profile-settings", description: "Dashboard preferences" },
      { id: "profile", label: "Company Profile", icon: Briefcase, href: "/corporate-partner-profile-settings?section=company", description: "Update company info" },
    ]
  }
];

// Flat list for backward compatibility
const navItems = navSections.flatMap(section => section.items);

// Main header navigation - 4 tabs only
const headerNavItems = [
  { label: "Home", href: "/landing" },
  { label: "Dashboard", href: "/csr-dashboard" },
  { label: "Organizations", href: "/organizations" },
  { label: "Help", href: "/help" },
];

export function CSRLayout({ children, title, subtitle, activeNav = "dashboard", hideHeader = false }: CSRLayoutProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [deletedNotificationIds, setDeletedNotificationIds] = useState<Set<string>>(new Set());
  const notificationRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Click outside to close notifications and mobile menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setReadNotificationIds(prev => {
      const newSet = new Set(Array.from(prev));
      newSet.add(id);
      return newSet;
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotificationIds(prev => {
      const newSet = new Set(Array.from(prev));
      allIds.forEach(id => newSet.add(id));
      return newSet;
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Delete a single notification
  const deleteNotification = (id: string) => {
    setDeletedNotificationIds(prev => {
      const newSet = new Set(Array.from(prev));
      newSet.add(id);
      return newSet;
    });
    setNotifications(prev => prev.filter(n => n.id !== id));
    // Also call API to persist deletion
    if (userId) {
      fetch(`/api/notifications/${id}`, { method: 'DELETE' }).catch(console.error);
    }
  };

  // Delete all notifications
  const deleteAllNotifications = () => {
    const allIds = notifications.map(n => n.id);
    setDeletedNotificationIds(prev => {
      const newSet = new Set(Array.from(prev));
      allIds.forEach(id => newSet.add(id));
      return newSet;
    });
    setNotifications([]);
    // Also call API to persist deletion
    if (userId) {
      fetch(`/api/notifications/delete-all?userId=${userId}`, { method: 'DELETE' }).catch(console.error);
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success": return <CheckCircle2 size={16} className="text-emerald-500" />;
      case "warning": return <AlertCircle size={16} className="text-amber-500" />;
      case "info": return <Info size={16} className="text-blue-500" />;
      case "achievement": return <Award size={16} className="text-purple-500" />;
    }
  };

  const getNotificationBg = (type: Notification["type"], read: boolean) => {
    if (read) return "bg-slate-50";
    switch (type) {
      case "success": return "bg-emerald-50";
      case "warning": return "bg-amber-50";
      case "info": return "bg-blue-50";
      case "achievement": return "bg-purple-50";
    }
  };

  // Fetch CSR partner data to get company name
  const userId = localStorage.getItem("currentUserId");

  const { data: csrPartner } = useQuery({
    queryKey: ["/api/csr/partners", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/csr/partners?userId=${userId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!userId,
  });

  const companyName = csrPartner?.companyName || (user as any)?.companyName || (user as any)?.displayName || "Corporate Partner";
  const companyLogo = csrPartner?.logoUrl || (user as any)?.profilePhotoUrl || (user as any)?.avatar || null;

  // Fetch real notifications from database
  const { data: notificationsData } = useQuery({
    queryKey: ["/api/csr/notifications", userId],
    queryFn: async () => {
      if (!userId) return { notifications: [] };
      try {
        const res = await fetch(`/api/csr/notifications?userId=${userId}`);
        if (!res.ok) return { notifications: [] };
        return res.json();
      } catch {
        return { notifications: [] };
      }
    },
    enabled: !!userId,
    staleTime: 30000, // Refresh every 30 seconds
    refetchInterval: 60000, // Auto-refetch every minute
  });

  // Transform database notifications to UI format
  useEffect(() => {
    if (notificationsData?.notifications && Array.isArray(notificationsData.notifications)) {
      const transformed: Notification[] = notificationsData.notifications.map((n: any) => ({
        id: String(n.id),
        type: n.type === 'milestone' ? 'achievement' :
              n.type === 'project_complete' ? 'success' :
              n.type === 'warning' ? 'warning' : 'info',
        title: n.title,
        message: n.message,
        time: n.createdAt ? getRelativeTime(new Date(n.createdAt)) : 'Recently',
        read: readNotificationIds.has(String(n.id)) || n.isRead,
        link: n.link || '/csr-dashboard',
        actionLabel: n.actionLabel || 'View Details',
      }));
      setNotifications(transformed);
    } else {
      // If no real notifications, show empty state
      setNotifications([]);
    }
  }, [notificationsData, readNotificationIds]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #fffbf5 0%, #fef7ec 30%, #fdf4e8 60%, #fef9f3 100%)",
        overflowX: "hidden",
        overflowY: "auto",
        zIndex: 100,
      }}
    >
      {/* CSS animations for smooth tab transitions */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Top Site Header Bar - Light Green with Golden Gradient */}
      {!hideHeader && (
      <header
        style={{
          background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #fef3c7 75%, #fde68a 100%)",
          padding: "10px 4%",
          position: "sticky",
          top: 0,
          zIndex: 70,
          boxShadow: "0 2px 20px rgba(16, 185, 129, 0.15)",
          borderBottom: "1px solid rgba(16, 185, 129, 0.2)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Left: Site Logo */}
        <button
          onClick={() => navigate("/landing")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <img src={logoUrl} alt="Synerxus" style={{ height: "40px", width: "auto", filter: "brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }} />
        </button>

        {/* Center: Site Navigation - 4 Main Tabs */}
        <nav className="hidden md:flex" style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "nowrap" }}>
          {headerNavItems.map((item) => {
            const isActive = location === item.href ||
              location.startsWith(item.href + "/") ||
              location.startsWith(item.href + "?") ||
              (item.href === "/landing" && location === "/") ||
              (item.href === "/csr-dashboard" && location.startsWith("/csr-"));
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.href)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  background: isActive ? "rgba(16, 185, 129, 0.25)" : "transparent",
                  border: isActive ? "2px solid rgba(16, 185, 129, 0.5)" : "2px solid transparent",
                  color: isActive ? "#047857" : "#065f46",
                  fontSize: "14px",
                  fontWeight: isActive ? "700" : "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  boxShadow: isActive ? "0 2px 4px rgba(16, 185, 129, 0.15)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)";
                    e.currentTarget.style.color = "#047857";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#065f46";
                  }
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Notification Bell, Profile, Hamburger Menu */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Corporate Logo - clickable, routes to Dashboard */}
          <button
            onClick={() => navigate("/csr-dashboard")}
            className="hidden md:flex"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "10px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.8";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "scale(1)";
            }}
            title={companyName}
          >
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  objectFit: "cover",
                  border: "2px solid rgba(16, 185, 129, 0.3)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)",
                }}
              >
                <Building2 size={18} color="white" />
              </div>
            )}
          </button>

          {/* Notifications */}
          <div ref={notificationRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: showNotifications ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.8)",
                border: showNotifications ? "1px solid rgba(16, 185, 129, 0.5)" : "1px solid rgba(16, 185, 129, 0.3)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#065f46",
                position: "relative",
                boxShadow: showNotifications ? "0 2px 8px rgba(16, 185, 129, 0.2)" : "0 2px 6px rgba(0,0,0,0.08)",
                transition: "all 0.2s ease",
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute",
                  top: "4px",
                  right: "4px",
                  minWidth: "16px",
                  height: "16px",
                  borderRadius: "8px",
                  background: "#ef4444",
                  border: "2px solid white",
                  fontSize: "10px",
                  fontWeight: "700",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "520px",
                  minWidth: "500px",
                  maxHeight: "80vh",
                  background: "white",
                  borderRadius: "16px",
                  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.15)",
                  display: "flex",
                  flexDirection: "column",
                  zIndex: 100,
                }}
              >
                {/* Header - Fixed */}
                <div style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #fef3c7 100%)",
                  flexShrink: 0,
                  borderRadius: "16px 16px 0 0",
                }}>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#065f46", margin: 0 }}>
                      Notifications
                    </h3>
                    <p style={{ fontSize: "13px", color: "#059669", margin: "4px 0 0 0", fontWeight: "500" }}>
                      {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : "All caught up!"}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        style={{
                          fontSize: "12px",
                          color: "#059669",
                          background: "rgba(16, 185, 129, 0.1)",
                          border: "none",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={deleteAllNotifications}
                        style={{
                          fontSize: "12px",
                          color: "#dc2626",
                          background: "rgba(220, 38, 38, 0.1)",
                          border: "none",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title="Delete all notifications"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        background: "rgba(0, 0, 0, 0.05)",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Notification List - Scrollable */}
                <div style={{
                  flex: 1,
                  overflowY: "auto",
                  overflowX: "hidden",
                }}>
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "18px 24px",
                          background: notification.read ? "#fafafa" : getNotificationBg(notification.type, notification.read),
                          borderBottom: "1px solid #e5e7eb",
                          transition: "background 0.2s ease",
                        }}
                      >
                        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                          <div style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "12px",
                            background: notification.read ? "#f1f5f9" : "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: notification.read ? "none" : "0 2px 8px rgba(0,0,0,0.08)",
                            border: notification.read ? "1px solid #e5e7eb" : "1px solid rgba(16, 185, 129, 0.2)",
                          }}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                              <span style={{
                                fontSize: "15px",
                                fontWeight: notification.read ? "500" : "600",
                                color: notification.read ? "#64748b" : "#0f172a",
                              }}>
                                {notification.title}
                              </span>
                              {!notification.read && (
                                <span style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                  boxShadow: "0 0 6px rgba(16, 185, 129, 0.5)",
                                  flexShrink: 0,
                                }} />
                              )}
                            </div>
                            <p style={{
                              fontSize: "14px",
                              color: notification.read ? "#94a3b8" : "#475569",
                              margin: "0 0 10px 0",
                              lineHeight: "1.5",
                              wordBreak: "break-word",
                            }}>
                              {notification.message}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                              <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>
                                {notification.time}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                    setShowNotifications(false);
                                    navigate(notification.link);
                                  }}
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    color: "#059669",
                                    background: "rgba(16, 185, 129, 0.1)",
                                    border: "1px solid rgba(16, 185, 129, 0.2)",
                                    padding: "8px 14px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    position: "relative",
                                    zIndex: 5,
                                    pointerEvents: "auto",
                                    whiteSpace: "nowrap",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(16, 185, 129, 0.25)";
                                    e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.5)";
                                    e.currentTarget.style.color = "#047857";
                                    e.currentTarget.style.transform = "translateX(2px)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)";
                                    e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.2)";
                                    e.currentTarget.style.color = "#059669";
                                    e.currentTarget.style.transform = "translateX(0)";
                                  }}
                                  onMouseDown={(e) => {
                                    e.currentTarget.style.transform = "scale(0.98)";
                                  }}
                                  onMouseUp={(e) => {
                                    e.currentTarget.style.transform = "translateX(2px)";
                                  }}
                                >
                                  {notification.actionLabel || "View Details"}
                                  <span style={{ fontSize: "14px", transition: "transform 0.2s ease" }}>→</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "6px",
                                    background: "rgba(220, 38, 38, 0.05)",
                                    border: "1px solid rgba(220, 38, 38, 0.15)",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#dc2626",
                                    transition: "all 0.2s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)";
                                    e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.3)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(220, 38, 38, 0.05)";
                                    e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.15)";
                                  }}
                                  title="Delete notification"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "48px 24px", textAlign: "center" }}>
                      <Bell size={40} style={{ color: "#cbd5e1", marginBottom: "16px" }} />
                      <p style={{ fontSize: "16px", color: "#64748b", margin: 0, fontWeight: "500" }}>No notifications yet</p>
                      <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 0 0" }}>We'll notify you when something important happens</p>
                    </div>
                  )}
                </div>

                {/* Footer - Fixed */}
                <div style={{
                  padding: "16px 24px",
                  borderTop: "1px solid #e5e7eb",
                  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                  flexShrink: 0,
                  borderRadius: "0 0 16px 16px",
                  position: "relative",
                  zIndex: 10,
                }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowNotifications(false);
                      navigate("/csr-dashboard?tab=engagement");
                    }}
                    style={{
                      width: "100%",
                      padding: "14px 20px",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                      transition: "all 0.2s ease",
                      position: "relative",
                      zIndex: 11,
                      pointerEvents: "auto",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.4)";
                      e.currentTarget.style.background = "linear-gradient(135deg, #059669 0%, #047857 100%)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
                      e.currentTarget.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = "translateY(1px)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.3)";
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.4)";
                    }}
                  >
                    <Zap size={16} />
                    View Employee Engagement
                  </button>
                </div>
              </div>
            )}
          </div>
          <UserProfileDropdown />
        </div>
        </div>
      </header>
      )}

      {/* Mobile Menu Overlay */}
      {!hideHeader && showMobileMenu && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.4)",
            zIndex: 80,
            transition: "opacity 0.3s ease",
          }}
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Mobile Slide-out Menu */}
      {!hideHeader && (
      <div
        ref={mobileMenuRef}
        className="lg:hidden"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "280px",
          height: "100dvh",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          boxShadow: showMobileMenu ? "4px 0 20px rgba(0, 0, 0, 0.15)" : "none",
          transform: showMobileMenu ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          zIndex: 90,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Mobile Menu Header */}
        <div style={{
          padding: "20px",
          borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
          background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #fef3c7 100%)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    objectFit: "cover",
                    border: "2px solid rgba(16, 185, 129, 0.3)",
                  }}
                />
              ) : (
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Building2 size={20} color="white" />
                </div>
              )}
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#065f46" }}>{companyName}</div>
                <div style={{ fontSize: "11px", color: "#059669" }}>ESG Console</div>
              </div>
            </div>
            <button
              onClick={() => setShowMobileMenu(false)}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(0, 0, 0, 0.05)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Menu Navigation - Sectioned */}
        <nav style={{ padding: "12px", flex: 1, overflowY: "auto" }}>
          {navSections.map((section, sectionIndex) => (
            <div key={section.title} style={{ marginBottom: sectionIndex < navSections.length - 1 ? "16px" : "0" }}>
              {/* Section Title */}
              <div style={{ padding: "6px 12px 4px", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  {section.title}
                </span>
              </div>
              {/* Section Items */}
              {section.items.map((item: any) => {
                const Icon = item.icon;
                // Precise active check - only highlight exact matches
                const itemPath = item.href.split("?")[0];
                const itemTab = item.href.includes("tab=") ? new URLSearchParams(item.href.split("?")[1]).get("tab") : null;
                const locationTab = location.includes("tab=") ? new URLSearchParams(location.split("?")[1]).get("tab") : null;

                // Check if this item is active
                let isActive = false;
                if (itemTab) {
                  // For tabs within csr-dashboard, match by tab parameter
                  isActive = locationTab === itemTab || activeNav === itemTab;
                } else if (item.id === "overview") {
                  // Overview is active when no tab param and activeNav is overview or dashboard
                  isActive = (!locationTab && (activeNav === "overview" || activeNav === "dashboard")) ||
                             (location === "/csr-dashboard" && !locationTab);
                } else if (itemPath !== "/csr-dashboard") {
                  // For other pages (settings, reports, etc.), match by path
                  isActive = location.startsWith(itemPath);
                }
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(item.href);
                      setShowMobileMenu(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: isActive
                        ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                        : "transparent",
                      color: isActive ? "white" : "#475569",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: isActive ? "600" : "500",
                      fontSize: "13px",
                      textAlign: "left",
                      width: "100%",
                      transition: "all 0.2s ease",
                      boxShadow: isActive ? "0 2px 8px rgba(16, 185, 129, 0.3)" : "none",
                      pointerEvents: "auto",
                      position: "relative",
                      zIndex: 5,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)";
                        e.currentTarget.style.color = "#059669";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#475569";
                      }
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = "scale(0.98)";
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <Icon size={18} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.hot && (
                      <span style={{
                        fontSize: "9px",
                        fontWeight: "700",
                        color: "#dc2626",
                        background: "rgba(220, 38, 38, 0.1)",
                        padding: "2px 5px",
                        borderRadius: "4px",
                        border: "1px solid rgba(220, 38, 38, 0.2)",
                      }}>
                        HOT
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Main Navigation in Mobile */}
          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(0, 0, 0, 0.06)" }}>
            <div style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Main Navigation
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {headerNavItems.map((item) => {
                const isActive = location === item.href ||
                  location.startsWith(item.href + "/") ||
                  location.startsWith(item.href + "?") ||
                  (item.href === "/landing" && location === "/") ||
                  (item.href === "/csr-dashboard" && location.startsWith("/csr-"));
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      navigate(item.href);
                      setShowMobileMenu(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      background: isActive ? "rgba(16, 185, 129, 0.15)" : "transparent",
                      color: isActive ? "#047857" : "#475569",
                      border: isActive ? "1px solid rgba(16, 185, 129, 0.3)" : "none",
                      cursor: "pointer",
                      fontWeight: isActive ? "600" : "500",
                      fontSize: "14px",
                      textAlign: "left",
                      width: "100%",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Mobile Menu Footer Help */}
        <div style={{
          padding: "16px",
          borderTop: "1px solid rgba(0, 0, 0, 0.06)",
          background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#92400e", marginBottom: "4px" }}>
            Need Help?
          </div>
          <div style={{ fontSize: "12px", color: "#a16207", marginBottom: "12px" }}>
            Access guides and support resources
          </div>
          <button
            onClick={() => {
              window.open("/help", "_blank");
              setShowMobileMenu(false);
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              background: "white",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              color: "#92400e",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            View Resources
          </button>
        </div>
      </div>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: hideHeader ? "0" : "0 4%" }}>
        {/* Left Sidebar - Desktop Only (hidden when hideHeader is true) */}
        {!hideHeader && (
        <aside
          className="hidden lg:flex"
          style={{
            width: "200px",
            minWidth: "200px",
            flexDirection: "column",
            background: "linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 50%, #fef9f3 100%)",
            borderRight: "1px solid rgba(16, 185, 129, 0.1)",
            padding: "16px 10px",
            overflowY: "auto",
          }}
        >
          {/* Sectioned Navigation */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, overflowY: "auto" }}>
            {navSections.map((section, sectionIndex) => (
              <div key={section.title} style={{ marginBottom: sectionIndex < navSections.length - 1 ? "12px" : "0" }}>
                {/* Section Title */}
                <div style={{ padding: "8px 16px 6px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                    {section.title}
                  </span>
                </div>
                {/* Section Items */}
                {section.items.map((item: any) => {
                  const Icon = item.icon;
                  // Precise active check - only highlight exact matches
                  const itemPath = item.href.split("?")[0];
                  const itemTab = item.href.includes("tab=") ? new URLSearchParams(item.href.split("?")[1]).get("tab") : null;
                  const locationTab = location.includes("tab=") ? new URLSearchParams(location.split("?")[1]).get("tab") : null;

                  // Check if this item is active
                  let isActive = false;
                  if (itemTab) {
                    // For tabs within csr-dashboard, match by tab parameter
                    isActive = locationTab === itemTab || activeNav === itemTab;
                  } else if (item.id === "overview") {
                    // Overview is active when no tab param and activeNav is overview or dashboard
                    isActive = (!locationTab && (activeNav === "overview" || activeNav === "dashboard")) ||
                               (location === "/csr-dashboard" && !locationTab);
                  } else if (itemPath !== "/csr-dashboard") {
                    // For other pages (settings, reports, etc.), match by path
                    isActive = location.startsWith(itemPath);
                  }
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(item.href);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: isActive
                          ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                          : "transparent",
                        color: isActive ? "white" : "#475569",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: isActive ? "600" : "500",
                        fontSize: "13px",
                        textAlign: "left",
                        width: "100%",
                        transition: "all 0.2s ease",
                        boxShadow: isActive ? "0 2px 8px rgba(16, 185, 129, 0.3)" : "none",
                        pointerEvents: "auto",
                        position: "relative",
                        zIndex: 5,
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "rgba(16, 185, 129, 0.08)";
                          e.currentTarget.style.color = "#059669";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#475569";
                        }
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = "scale(0.98)";
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                      title={item.description}
                    >
                      <Icon size={18} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.hot && (
                        <span style={{
                          fontSize: "9px",
                          fontWeight: "700",
                          color: "#dc2626",
                          background: "rgba(220, 38, 38, 0.1)",
                          padding: "2px 5px",
                          borderRadius: "4px",
                          border: "1px solid rgba(220, 38, 38, 0.2)",
                        }}>
                          HOT
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Bottom Help Section */}
          <div
            style={{
              marginTop: "auto",
              padding: "16px",
              background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
              borderRadius: "14px",
              border: "1px solid rgba(245, 158, 11, 0.2)",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#92400e", marginBottom: "4px" }}>
              Need Help?
            </div>
            <div style={{ fontSize: "12px", color: "#a16207", marginBottom: "12px" }}>
              Access guides and support resources
            </div>
            <button
              onClick={() => window.open("/help", "_blank")}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "white",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#92400e",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              View Resources
            </button>
          </div>
        </aside>
        )}

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            padding: hideHeader ? "0" : "24px 24px 60px 24px",
            overflowY: "auto",
            overflowX: "hidden",
            background: hideHeader ? "transparent" : "linear-gradient(180deg, #fffdf9 0%, #fefbf6 50%, #fdf8f2 100%)",
          }}
        >
          {/* Content Container - full width */}
          <div style={{ width: "100%", maxWidth: hideHeader ? "100%" : "1600px" }}>
            {/* Page Header */}
            {(title || subtitle) && (
              <div style={{ marginBottom: "28px" }}>
                {title && (
                  <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p style={{ fontSize: "14px", color: "#64748b" }}>{subtitle}</p>
                )}
              </div>
            )}

            {children}
          </div>

          {/* Footer - Inside main content so it scrolls with content */}
          {!hideHeader && (
          <footer
            style={{
              background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%)",
              padding: "20px 4%",
              marginTop: "40px",
              borderTop: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
        <div>
          {/* Main Footer Content */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "32px", marginBottom: "24px" }}>
            {/* Brand Section */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <img src={logoUrl} alt="Synerxus" style={{ height: "32px", width: "auto" }} />
              </div>
              <p style={{ fontSize: "12px", color: "#1e293b", lineHeight: "1.5", marginBottom: "12px", fontWeight: "600" }}>
                Connect. Manage. Impact Globally.
              </p>
              <p style={{ fontSize: "11px", color: "#334155" }}>
                Empowering corporate social responsibility through technology and meaningful partnerships.
              </p>
            </div>

            {/* Platform Links */}
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Platform
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button onClick={() => navigate("/csr-dashboard")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                  Dashboard
                </button>
                <button onClick={() => navigate("/csr-impact-reporting")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                  Impact Reports
                </button>
                <button onClick={() => navigate("/project-portfolio")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                  Projects
                </button>
                <button onClick={() => navigate("/csr-reports-exports")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                  Reports & Exports
                </button>
              </div>
            </div>

            {/* Resources Links */}
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Resources
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button onClick={() => navigate("/help")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                  Help Center
                </button>
                <button onClick={() => navigate("/sdg-mapping")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                  SDG Mapping
                </button>
                <button onClick={() => window.open("https://sdgs.un.org/goals", "_blank")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                  UN SDG Goals
                </button>
                <button onClick={() => navigate("/organizations")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                  Partner Organizations
                </button>
              </div>
            </div>

            {/* Social & Contact */}
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Connect
              </h4>
              <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <a href="https://linkedin.com/company/synerxus" target="_blank" rel="noopener noreferrer" style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1e293b", textDecoration: "none", transition: "all 0.2s" }}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                <a href="https://x.com/synerxus" target="_blank" rel="noopener noreferrer" style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1e293b", textDecoration: "none", transition: "all 0.2s" }}>
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://facebook.com/synerxus" target="_blank" rel="noopener noreferrer" style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1e293b", textDecoration: "none", transition: "all 0.2s" }}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              </div>
              <p style={{ fontSize: "11px", color: "#334155" }}>
                contact@synerxus.com
              </p>
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={{ borderTop: "1px solid rgba(15, 23, 42, 0.15)", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontSize: "11px", color: "#1e293b", fontWeight: "500" }}>
              © {new Date().getFullYear()} Synerxus. All rights reserved.
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button onClick={() => navigate("/privacy")} style={{ background: "none", border: "none", color: "#334155", fontSize: "11px", cursor: "pointer" }}>
                Privacy Policy
              </button>
              <button onClick={() => navigate("/terms")} style={{ background: "none", border: "none", color: "#334155", fontSize: "11px", cursor: "pointer" }}>
                Terms of Service
              </button>
              <button onClick={() => navigate("/cookies")} style={{ background: "none", border: "none", color: "#334155", fontSize: "11px", cursor: "pointer" }}>
                Cookie Policy
              </button>
            </div>
          </div>
        </div>
          </footer>
          )}
        </main>
      </div>
    </div>
  );
}
