import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  FileBarChart2,
  Settings,
  HelpCircle,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User as UserType } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUserId } from "@/hooks/use-current-user-id";
import { useUserType } from "@/hooks/use-user-type";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/components/ui/logo";
import { getAuthHeaders } from "@/lib/queryClient";

// Nav items — ESG Reports is now a tab on the dashboard, not a separate page
const CSR_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
];

const MENU_ITEMS = [
  { href: "/corporate-partner-profile-settings", label: "Profile Settings", icon: Settings },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
];

export default function CorporateNav() {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const userId = useCurrentUserId();
  const storedUserType = useUserType();

  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/users/me`, { headers, credentials: "include" });
      return response.ok ? response.json() : null;
    },
    enabled: !!userId,
  });

  const effectiveUserType = currentUser?.userType || storedUserType;

  const isPwaRoute = location.endsWith("/pwa");
  const standaloneRoutes = ["/landing", "/login", "/"];
  const isStandaloneRoute = standaloneRoutes.some(
    (route) => location === route || location.startsWith(route + "/")
  );

  if (effectiveUserType !== "corporate-partner" || isPwaRoute || isStandaloneRoute) {
    return null;
  }

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate("/");
  };

  const userInitial = (currentUser?.displayName || currentUser?.username || "C")
    .charAt(0)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-7xl mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo + Nav Items */}
          <div className="flex items-center gap-8 flex-shrink-0">
            <Logo size="sm" variant="full" />

            <div className="hidden lg:flex items-center gap-1">
              {CSR_NAV_ITEMS.map((item) => {
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
                          ? "bg-[#ffcc33] text-white shadow-md"
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

          <div className="flex-1" />

          {/* User Menu */}
          <div className="relative flex-shrink-0">
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
                {currentUser?.displayName || "Corporate Partner"}
              </span>
              {menuOpen ? (
                <X className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Menu className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                  {/* User Info */}
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
                          {currentUser?.displayName || "Corporate Partner"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {currentUser?.email || ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Nav Items (shown on smaller screens) */}
                  <div className="py-2 border-b border-border lg:hidden">
                    {CSR_NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.href;
                      return (
                        <Link key={item.href} href={item.href}>
                          <button
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                              isActive
                                ? "bg-[#FFFBF0] text-[#ffcc33] border-l-2 border-[#ffcc33]"
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

                  {/* Menu Items */}
                  <div className="py-2">
                    {MENU_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.href} href={item.href}>
                          <button
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                              "text-foreground hover:bg-stone-100"
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
        </nav>
      </div>
    </header>
  );
}
