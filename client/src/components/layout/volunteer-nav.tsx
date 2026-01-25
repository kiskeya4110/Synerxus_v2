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
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User as UserType } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";

// Desktop nav items
const VOLUNTEER_NAV_ITEMS = [
  { href: "/volunteer-dashboard", label: "Dashboard", icon: Home },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/discover-opportunities", label: "Discover", icon: Sparkles },
  { href: "/my-work", label: "My Work", icon: ClipboardList },
  { href: "/impact-visualization", label: "Impact", icon: BarChart3 },
];

// Dropdown menu items
const MENU_ITEMS = [
  { href: "/volunteer-profile-settings", label: "Profile & Settings", icon: User },
  { href: "/log-activity", label: "Log Activity", icon: ClipboardList },
  { href: "/impact-report", label: "Impact Report", icon: BarChart3 },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
];

export default function VolunteerNav() {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const userId = localStorage.getItem("currentUserId");

  // Fetch current user
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const url = userId ? `/api/users/me?userId=${userId}` : "/api/users/me";
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId,
  });

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

  const storedUserType = localStorage.getItem("userType");
  const effectiveUserType = currentUser?.userType || storedUserType;

  if (effectiveUserType !== "volunteer" || isPwaRoute || isStandaloneRoute) {
    return null;
  }

  const userInitial = (currentUser?.displayName || currentUser?.username || "V")
    .charAt(0)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-7xl mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Logo size="sm" variant="full" />

            {/* Desktop Nav Items */}
            <div className="hidden lg:flex items-center gap-1">
              {VOLUNTEER_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location === item.href ||
                  (item.href === "/volunteer-dashboard" &&
                    location.startsWith("/volunteer-dashboard")) ||
                  (item.href === "/projects" && location.startsWith("/projects")) ||
                  (item.href === "/my-work" && location.startsWith("/my-work")) ||
                  (item.href === "/discover-opportunities" &&
                    location.includes("discover-opportunities")) ||
                  (item.href === "/impact-visualization" &&
                    location.includes("impact-visualization"));

                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
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

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Quick Log Button */}
            <Button
              variant="accent"
              size="sm"
              className="hidden sm:flex"
              onClick={() => navigate("/log-activity")}
            >
              <Plus className="h-4 w-4 mr-1" />
              Log Impact
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-slate-900">
                3
              </span>
            </Button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all",
                  "hover:bg-white/5",
                  menuOpen && "bg-white/10"
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
                  <div className="absolute right-0 top-full mt-2 w-64 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
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
                                  : "text-foreground hover:bg-white/5"
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
                    {(currentUser as any)?.isAdmin && (
                      <div className="border-t border-border py-2">
                        <div className="px-4 py-1">
                          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                            Admin
                          </span>
                        </div>
                        <Link href="/admin/dashboard">
                          <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => setMenuOpen(false)}
                          >
                            <Shield className="h-4 w-4" />
                            <span className="text-sm font-medium">Admin Dashboard</span>
                          </button>
                        </Link>
                      </div>
                    )}

                    {/* Logout */}
                    <div className="border-t border-border py-2">
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

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
