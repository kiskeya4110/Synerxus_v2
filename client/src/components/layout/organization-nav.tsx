import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  FolderOpen,
  Shield,
  Plus,
  Menu,
  X,
  LogOut,
  HelpCircle,
  Building2,
  FileBarChart2,
  Settings,
  Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserType } from "@/hooks/use-user-type";
import { getAuthHeaders } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/ui/logo";

// Navigation items — Verify / Projects / Reports are now tabs on the dashboard.
// To add a new top-level nav item, append an entry here.
const getOrgNavItems = () => [
  { href: "/dashboard", label: "Dashboard", icon: Home, tabEvent: undefined as string | undefined },
];

// Dropdown menu items - MVP only
const MENU_ITEMS = [
  { href: "/organization-profile-settings", label: "Profile Settings", icon: Settings },
  { href: "/log-volunteer-hours", label: "Log Volunteer Hours", icon: Clock },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
];

export default function OrganizationNav() {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut, dbUser } = useAuth();
  // Use the authenticated dbUser as the authoritative current user — avoids stale localStorage
  const currentUser = dbUser as any;

  // Fetch organization
  const { data: organization } = useQuery({
    queryKey: ["/api/organizations", currentUser?.organizationId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/organizations/${currentUser?.organizationId}`, { headers, credentials: "include" });
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  // Fetch pending count
  const { data: pendingData } = useQuery({
    queryKey: ["/api/pending-approvals", currentUser?.organizationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/pending-approvals?organizationId=${currentUser?.organizationId}`
      );
      if (!response.ok) return { pendingActivities: [], pendingImpacts: [] };
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  const pendingCount =
    (pendingData?.pendingActivities?.length || 0) + (pendingData?.pendingImpacts?.length || 0);

  // Handle logout
  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate("/");
  };

  const storedUserType = useUserType();
  const effectiveUserType = currentUser?.userType || storedUserType;

  // Don't show on PWA routes or landing/login routes
  const isPwaRoute = location.endsWith("/pwa");
  const standaloneRoutes = ["/landing", "/login", "/"];
  const isStandaloneRoute = standaloneRoutes.some(
    (route) => location === route || location.startsWith(route + "/")
  );

  if (effectiveUserType !== "organization" || isPwaRoute || isStandaloneRoute) {
    return null;
  }

  const navItems = getOrgNavItems();
  const orgInitial = (organization?.name || "O").charAt(0).toUpperCase();
  const orgMonogram = organization?.name
    ? organization.name.split(" ").filter((w: string) => w.length > 0).map((w: string) => w[0].toUpperCase()).join("")
    : "ORG";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white shadow-sm">
      <div className="container max-w-7xl mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo — standalone on the left */}
          <Logo size="sm" variant="full" theme="light" />

          {/* Nav items + actions — all on the right */}
          <div className="flex items-center gap-3">
            {/* Desktop Nav Items */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.startsWith("/dashboard") || location === "/";

                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative",
                        isActive
                          ? "bg-indigo-600 text-white shadow-md"
                          : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {pendingCount > 0 && (
                        <Badge
                          variant="destructive"
                          size="sm"
                          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
                        >
                          {pendingCount > 9 ? '9+' : pendingCount}
                        </Badge>
                      )}
                    </button>
                  </Link>
                );
              })}
            </div>

            {/* Create Project Button */}
            <Button
              variant="accent"
              size="sm"
              className="hidden md:flex"
              onClick={() => navigate("/post-core-opportunity")}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Project
            </Button>

            {/* Org Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all",
                  "hover:bg-stone-100",
                  menuOpen && "bg-stone-100"
                )}
              >
                <Avatar size="sm" ring={menuOpen ? "primary" : "none"}>
                  <AvatarImage src={organization?.logo || undefined} alt={organization?.name} />
                  <AvatarFallback className="bg-emerald-500 text-white text-sm font-semibold">
                    {orgInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium text-stone-900 max-w-[120px] truncate">
                  {orgMonogram}
                </span>
                {menuOpen ? (
                  <X className="h-4 w-4 text-stone-500" />
                ) : (
                  <Menu className="h-4 w-4 text-stone-500" />
                )}
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />

                  {/* Menu Panel */}
                  <div className="absolute right-0 top-full mt-2 w-64 z-[60] rounded-xl border border-stone-200 bg-white shadow-xl overflow-hidden">
                    {/* Org Info Header */}
                    <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
                      <div className="flex items-center gap-3">
                        <Avatar size="default">
                          <AvatarImage src={organization?.logo || undefined} />
                          <AvatarFallback className="bg-emerald-500 text-white font-semibold">
                            {orgInitial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-stone-900 truncate">
                            {organization?.name || "Organization"}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-stone-500">
                            <Building2 className="h-3 w-3" />
                            <span>Verify Hub</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nav Items (mobile only — hidden on lg+ where top bar shows them) */}
                    <div className="py-2 border-b border-stone-100 lg:hidden">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.startsWith("/dashboard");
                        return (
                          <Link key={item.href} href={item.href}>
                            <button
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                                isActive
                                  ? "bg-indigo-50 text-indigo-600"
                                  : "text-stone-700 hover:bg-stone-50"
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
                        const isActive = location === item.href;
                        return (
                          <Link key={item.href} href={item.href}>
                            <button
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                                isActive
                                  ? "bg-indigo-50 text-indigo-600"
                                  : "text-stone-700 hover:bg-stone-50"
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
                    <div className="border-t border-stone-200 py-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="text-sm font-medium">Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </nav>
      </div>
    </header>
  );
}
