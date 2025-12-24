import { ReactNode, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
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

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "achievement",
    title: "Milestone Reached!",
    message: "Your team has logged 1,000 volunteer hours this quarter. View your team's progress and celebrate this achievement.",
    time: "2 hours ago",
    read: false,
    link: "/csr-impact-reporting",
    actionLabel: "View Impact Report",
  },
  {
    id: "2",
    type: "success",
    title: "New Project Match",
    message: "3 employees matched with 'Community Garden Initiative'. Review and approve their assignments.",
    time: "5 hours ago",
    read: false,
    link: "/project-portfolio",
    actionLabel: "View Projects",
  },
  {
    id: "3",
    type: "info",
    title: "Monthly Report Ready",
    message: "Your December ESG impact report is ready for review. Download and share with stakeholders.",
    time: "1 day ago",
    read: true,
    link: "/csr-reports-exports",
    actionLabel: "View Reports",
  },
  {
    id: "4",
    type: "warning",
    title: "Engagement Alert",
    message: "5 volunteers haven't logged hours in 2 weeks. Consider sending reminders or checking in with them.",
    time: "2 days ago",
    read: true,
    link: "/csr-dashboard?tab=engagement",
    actionLabel: "View Engagement",
  },
  {
    id: "5",
    type: "info",
    title: "New SDG Goal Added",
    message: "SDG 13 (Climate Action) has been added to your company's ESG commitments. View your SDG mapping.",
    time: "3 days ago",
    read: true,
    link: "/sdg-mapping",
    actionLabel: "View SDG Mapping",
  },
  {
    id: "6",
    type: "success",
    title: "Partner Organization Joined",
    message: "Green Earth Foundation has joined as a partner organization. Explore their projects.",
    time: "4 days ago",
    read: true,
    link: "/organizations",
    actionLabel: "View Organizations",
  },
];

interface CSRLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  activeNav?: "dashboard" | "impact" | "engagement" | "portfolio" | "reports" | "settings";
}

const navItems = [
  { id: "dashboard", label: "Command Center", icon: Home, href: "/csr-dashboard?tab=overview" },
  { id: "engagement", label: "Employee Engagement", icon: UserCheck, href: "/csr-dashboard?tab=engagement" },
  { id: "impact", label: "Impact Analytics", icon: TrendingUp, href: "/csr-impact-reporting" },
  { id: "portfolio", label: "Project Portfolio", icon: Briefcase, href: "/project-portfolio" },
  { id: "reports", label: "Reports & Exports", icon: FileText, href: "/csr-reports-exports" },
  { id: "settings", label: "Settings", icon: Settings, href: "/corporate-partner-profile-settings" },
];

export function CSRLayout({ children, title, subtitle, activeNav = "dashboard" }: CSRLayoutProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const notificationRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Top-level site navigation menus
  const topMenuItems = [
    { label: "Home", href: "/landing" },
    { label: "Projects", href: "/projects" },
    { label: "Organizations", href: "/organizations" },
    { label: "Help", href: "/help" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #fffbf5 0%, #fef7ec 30%, #fdf4e8 60%, #fef9f3 100%)",
        overflowX: "hidden",
      }}
    >
      {/* Top Site Header Bar - Light Green with Golden Gradient */}
      <header
        style={{
          background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #fef3c7 75%, #fde68a 100%)",
          padding: "10px 4%",
          position: "sticky",
          top: 0,
          zIndex: 70,
          boxShadow: "0 2px 20px rgba(16, 185, 129, 0.15)",
          borderBottom: "1px solid rgba(16, 185, 129, 0.2)",
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

        {/* Center: Site Navigation - Hidden on smaller screens, collapses responsively */}
        <nav className="hidden lg:flex" style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "nowrap" }}>
          {topMenuItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/") || (item.href === "/landing" && location === "/");
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.href)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: isActive ? "rgba(16, 185, 129, 0.25)" : "transparent",
                  border: isActive ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid transparent",
                  color: isActive ? "#047857" : "#065f46",
                  fontSize: "13px",
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

        {/* Right: Hamburger Menu (mobile), Corporate Logo, Company Name, KPI Menu, Notifications */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Hamburger Menu Button - Visible only when sidebar is hidden (< lg screens) */}
          <button
            className="hidden max-lg:flex items-center justify-center"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: showMobileMenu ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.8)",
              border: showMobileMenu ? "1px solid rgba(16, 185, 129, 0.5)" : "1px solid rgba(16, 185, 129, 0.3)",
              cursor: "pointer",
              color: "#065f46",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              transition: "all 0.2s ease",
            }}
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Corporate Company Badge */}
          <div className="hidden md:flex" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  objectFit: "cover",
                  border: "2px solid rgba(16, 185, 129, 0.3)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)",
                }}
              >
                <Building2 size={16} color="white" />
              </div>
            )}
            <span className="hidden lg:block" style={{ fontSize: "14px", fontWeight: "600", color: "#065f46", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {companyName}
            </span>
          </div>

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
                              <button
                                onClick={() => {
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
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "rgba(16, 185, 129, 0.2)";
                                  e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.4)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)";
                                  e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.2)";
                                }}
                              >
                                {notification.actionLabel || "View Details"}
                                <span style={{ fontSize: "14px" }}>→</span>
                              </button>
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
                }}>
                  <button
                    onClick={() => {
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
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
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

      {/* Secondary Header - Dynamic Company Context Bar */}
      <div
        style={{
          background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 25%, #dbeafe 50%, #ede9fe 75%, #fce7f3 100%)",
          borderBottom: "1px solid rgba(59, 130, 246, 0.15)",
          padding: "16px 4%",
          boxShadow: "0 2px 12px rgba(59, 130, 246, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        {/* Left: Company Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Company Logo */}
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  objectFit: "cover",
                  border: "3px solid rgba(59, 130, 246, 0.25)",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.15)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                }}
              >
                <Building2 size={24} color="white" />
              </div>
            )}
            <div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e40af", letterSpacing: "-0.02em" }}>
                {companyName}
              </div>
              <div style={{ fontSize: "13px", color: "#6366f1", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  boxShadow: "0 0 8px rgba(16, 185, 129, 0.5)",
                  animation: "pulse 2s infinite"
                }} />
                Corporate ESG & Impact Hub
              </div>
            </div>
        </div>

        {/* Center: Quick Stats */}
        <div className="hidden md:flex" style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ textAlign: "center", padding: "8px 16px", background: "rgba(255, 255, 255, 0.7)", borderRadius: "10px", border: "1px solid rgba(59, 130, 246, 0.15)" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#1e40af" }}>Live</div>
            <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>Dashboard</div>
          </div>
          <div style={{ textAlign: "center", padding: "8px 16px", background: "rgba(255, 255, 255, 0.7)", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#059669" }}>Active</div>
            <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tracking</div>
          </div>
        </div>

        {/* Right: Date & Status */}
        <div className="hidden sm:flex" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            padding: "10px 16px",
            background: "rgba(255, 255, 255, 0.8)",
            borderRadius: "10px",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
          }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{currentDate}</div>
          </div>
        </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
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
                <div style={{ fontSize: "11px", color: "#059669" }}>ESG Dashboard</div>
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

        {/* Mobile Menu Navigation */}
        <nav style={{ padding: "16px", flex: 1 }}>
          <div style={{ marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Dashboard Navigation
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.href);
                    setShowMobileMenu(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    background: isActive
                      ? "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)"
                      : "transparent",
                    color: isActive ? "white" : "#475569",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: isActive ? "600" : "500",
                    fontSize: "14px",
                    textAlign: "left",
                    width: "100%",
                    transition: "all 0.2s ease",
                    boxShadow: isActive ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "none",
                  }}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Top Menu Items in Mobile */}
          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(0, 0, 0, 0.06)" }}>
            <div style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Quick Links
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {topMenuItems.map((item) => (
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
                    background: "transparent",
                    color: "#475569",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "13px",
                    textAlign: "left",
                    width: "100%",
                    transition: "all 0.2s ease",
                  }}
                >
                  {item.label}
                </button>
              ))}
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

      <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: "0 4%" }}>
        {/* Left Sidebar - Desktop Only */}
        <aside
          className="hidden lg:flex"
          style={{
            width: "200px",
            minWidth: "200px",
            flexDirection: "column",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            borderRight: "1px solid rgba(0, 0, 0, 0.06)",
            padding: "16px 10px",
            overflowY: "auto",
          }}
        >
          {/* Navigation Section Title */}
          <div style={{ marginBottom: "12px", paddingLeft: "16px" }}>
            <span style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Dashboard Navigation
            </span>
          </div>

          {/* Navigation */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.href)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: isActive
                      ? "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)"
                      : "transparent",
                    color: isActive ? "white" : "#475569",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: isActive ? "600" : "500",
                    fontSize: "14px",
                    textAlign: "left",
                    width: "100%",
                    transition: "all 0.2s ease",
                    boxShadow: isActive ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(59, 130, 246, 0.08)";
                      e.currentTarget.style.color = "#3b82f6";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#475569";
                    }
                  }}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
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

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            padding: "24px 24px 60px 24px",
            overflowY: "auto",
            overflowX: "hidden",
            background: "linear-gradient(180deg, #fffdf9 0%, #fefbf6 50%, #fdf8f2 100%)",
          }}
        >
          {/* Content Container - full width */}
          <div style={{ width: "100%", maxWidth: "1600px" }}>
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

          {/* Footer Spacer */}
          <div style={{ height: "40px" }} />
        </main>
      </div>

      {/* Footer - Light themed with full content */}
      <footer
        style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%)",
          padding: "20px 4%",
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
    </div>
  );
}
