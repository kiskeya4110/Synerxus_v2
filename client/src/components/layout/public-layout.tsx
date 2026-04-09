import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { Bell, Menu, X } from "lucide-react";
import { useState } from "react";
import Logo from "@/components/ui/logo";

interface PublicLayoutProps {
  children: ReactNode;
  activeTab?: "home" | "projects" | "organizations" | "help";
  showFooter?: boolean;
}

export function PublicLayout({ children, activeTab, showFooter = true }: PublicLayoutProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userId = localStorage.getItem("currentUserId");
  const userType = localStorage.getItem("userType");

  // Determine dashboard path based on user type
  const getDashboardPath = () => {
    if (userType === 'corporate-partner' || userType === 'corporate_partner' || userType === 'csr') return '/csr-dashboard';
    if (userType === 'organization') return '/organization-dashboard';
    if (userType === 'volunteer') return '/volunteer-dashboard';
    return '/landing';
  };

  // Top-level site navigation menus
  const topMenuItems = [
    { id: "home", label: "Home", href: "/landing" },
    { id: "projects", label: "Projects", href: "/projects" },
    { id: "organizations", label: "Organizations", href: "/organizations" },
    { id: "help", label: "Help", href: "/help" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #fffbf5 0%, #fef7ec 30%, #fdf4e8 60%, #fef9f3 100%)",
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #fef3c7 75%, #fde68a 100%)",
          padding: "12px 5%",
          position: "sticky",
          top: 0,
          zIndex: 70,
          boxShadow: "0 2px 20px rgba(16, 185, 129, 0.15)",
          borderBottom: "1px solid rgba(16, 185, 129, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: "1400px", margin: "0 auto" }}>
          {/* Left: Site Logo */}
          <Logo size="sm" />

          {/* Right: Navigation + User Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Site Navigation - Hidden on mobile */}
            <nav className="hidden md:flex" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {topMenuItems.map((item) => {
                const isActive = activeTab === item.id || location === item.href || location.startsWith(item.href + "/");
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.href)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: isActive ? "rgba(16, 185, 129, 0.25)" : "transparent",
                      border: isActive ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid transparent",
                      color: isActive ? "#047857" : "#065f46",
                      fontSize: "14px",
                      fontWeight: isActive ? "700" : "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
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
            {/* Dashboard Link - Only show if logged in */}
            {userId && (
              <button
                onClick={() => navigate(getDashboardPath())}
                className="hidden sm:flex"
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                }}
              >
                My Dashboard
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.8)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#065f46",
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Notifications - Only show if logged in */}
            {userId && (
              <button
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.8)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#065f46",
                  position: "relative",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                }}
              >
                <Bell size={18} />
                <span style={{
                  position: "absolute",
                  top: "6px",
                  right: "6px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#f59e0b",
                  border: "2px solid white",
                }} />
              </button>
            )}

            {/* User Profile or Login Button */}
            {userId ? (
              <UserProfileDropdown />
            ) : (
              <button
                onClick={() => navigate("/")}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  background: "white",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#065f46",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div
            className="md:hidden"
            style={{
              marginTop: "12px",
              padding: "12px",
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            {topMenuItems.map((item) => {
              const isActive = activeTab === item.id || location === item.href;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    navigate(item.href);
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    background: isActive ? "rgba(16, 185, 129, 0.15)" : "transparent",
                    border: "none",
                    color: isActive ? "#047857" : "#065f46",
                    fontSize: "15px",
                    fontWeight: isActive ? "700" : "600",
                    cursor: "pointer",
                    textAlign: "left",
                    marginBottom: "4px",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
            {userId && (
              <button
                onClick={() => {
                  navigate(getDashboardPath());
                  setMobileMenuOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  color: "white",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textAlign: "center",
                  marginTop: "8px",
                }}
              >
                My Dashboard
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

      {/* Footer */}
      {showFooter && (
        <footer
          style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%)",
            padding: "24px 5%",
            borderTop: "1px solid rgba(16, 185, 129, 0.2)",
          }}
        >
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            {/* Main Footer Content */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "32px", marginBottom: "24px" }}>
              {/* Brand Section */}
              <div>
                <div style={{ marginBottom: "12px" }}>
                  <Logo size="xs" clickable={false} />
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
                  <button onClick={() => navigate("/landing")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                    Home
                  </button>
                  <button onClick={() => navigate("/projects")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                    Projects
                  </button>
                  <button onClick={() => navigate("/organizations")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                    Organizations
                  </button>
                  <button onClick={() => navigate("/help")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                    Help Center
                  </button>
                </div>
              </div>

              {/* Resources Links */}
              <div>
                <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Resources
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button onClick={() => navigate("/sdg-mapping")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                    SDG Mapping
                  </button>
                  <button onClick={() => window.open("https://sdgs.un.org/goals", "_blank")} style={{ background: "none", border: "none", color: "#1e293b", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                    UN SDG Goals
                  </button>
                </div>
              </div>

              {/* Social & Contact */}
              <div>
                <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Connect
                </h4>
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <a href="https://linkedin.com/company/synerxus" target="_blank" rel="noopener noreferrer" style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1e293b", textDecoration: "none" }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  </a>
                  <a href="https://x.com/synerxus" target="_blank" rel="noopener noreferrer" style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1e293b", textDecoration: "none" }}>
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
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
                © {new Date().getFullYear()} <span style={{ color: '#0A2463', fontWeight: 700 }}>SYNERXUS</span>. All rights reserved.
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <button onClick={() => navigate("/privacy")} style={{ background: "none", border: "none", color: "#334155", fontSize: "11px", cursor: "pointer" }}>
                  Privacy Policy
                </button>
                <button onClick={() => navigate("/terms")} style={{ background: "none", border: "none", color: "#334155", fontSize: "11px", cursor: "pointer" }}>
                  Terms of Service
                </button>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
