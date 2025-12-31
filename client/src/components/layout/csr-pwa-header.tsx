import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";

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

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/csr-dashboard/pwa", color: "emerald" },
    { icon: FolderOpen, label: "Projects", path: "/csr-projects", color: "blue" },
    { icon: BarChart3, label: "Impacts", path: "/csr-impacts", color: "purple" },
    { icon: FileText, label: "Reports", path: "/csr-reports", color: "amber" },
    { icon: Users, label: "Team", path: "/team-overview", color: "sky" },
    { icon: MessageCircle, label: "Messages", path: "/csr-messages/pwa", color: "pink" },
    { icon: Settings, label: "Settings", path: "/corporate-partner-profile-settings", color: "slate" },
    { icon: HelpCircle, label: "Help", path: "/help", color: "gray" },
  ];

  return (
    <>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-3 py-2 shadow-md border-b"
        style={{
          background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #fef3c7 75%, #fde68a 100%)",
          borderColor: "rgba(16, 185, 129, 0.2)",
        }}
      >
        <div className="flex items-center justify-between max-w-full">
          {/* Logo */}
          <button onClick={() => navigate("/landing")} className="flex items-center gap-1.5 flex-shrink-0">
            <img
              src={logoUrl}
              alt="Synerxus"
              className="h-8 w-auto"
              style={{ filter: "brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}
            />
          </button>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="w-8 h-8 rounded-lg bg-white/80 backdrop-blur flex items-center justify-center shadow-sm border border-emerald-100"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-600 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            )}

            {/* Notifications */}
            <button
              onClick={() => navigate("/notifications")}
              className="relative w-8 h-8 rounded-lg bg-white/80 backdrop-blur flex items-center justify-center shadow-sm border border-emerald-100 cursor-pointer"
            >
              <Bell className="w-4 h-4 text-emerald-600" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>

            {/* Company Logo & Menu */}
            <button
              onClick={() => setShowMenu(true)}
              className="flex items-center gap-2 flex-shrink-0"
            >
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="h-8 w-8 rounded-lg object-contain bg-white shadow-sm border border-emerald-100 flex-shrink-0 p-0.5"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              ) : userAvatar ? (
                <img
                  src={userAvatar}
                  alt={companyName}
                  className="h-8 w-8 rounded-lg object-cover bg-white shadow-sm border border-emerald-100 flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className="text-white text-sm font-bold">{companyName.charAt(0)}</span>
                </div>
              )}
              <Menu className="w-5 h-5 text-emerald-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Full Screen Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-[100] bg-black/50" onClick={() => setShowMenu(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl animate-in slide-in-from-right duration-300"
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
                    <p className="text-xs text-emerald-700">ESG Command Center</p>
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
                  <div className={`w-10 h-10 rounded-lg bg-${item.color}-100 flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 text-${item.color}-600`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Logout Button */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
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
    </>
  );
}
