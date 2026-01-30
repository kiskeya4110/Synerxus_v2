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
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/ui/logo";

// Navigation items - MVP only
const getOrgNavItems = () => [
  { href: "/organization-dashboard", label: "Dashboard", icon: Home },
  { href: "/ngo-verification", label: "Verify", icon: Shield },
  { href: "/projects", label: "Projects", icon: FolderOpen },
];

// Dropdown menu items - MVP only
const MENU_ITEMS = [
  { href: "/help", label: "Help & Support", icon: HelpCircle },
];

export default function OrganizationNav() {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const userId = localStorage.getItem("currentUserId");

  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const url = userId ? `/api/users/me?userId=${userId}` : "/api/users/me";
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId,
  });

  // Fetch organization
  const { data: organization } = useQuery({
    queryKey: ["/api/organizations", currentUser?.organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/organizations?id=${currentUser?.organizationId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return Array.isArray(data) ? data[0] : data;
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

  // Use localStorage userType as fallback
  const storedUserType = localStorage.getItem("userType");
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white shadow-sm">
      <div className="container max-w-7xl mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Logo size="sm" variant="full" theme="light" />

            {/* Desktop Nav Items */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location === item.href ||
                  (item.href === "/organization-dashboard" &&
                    location.startsWith("/organization-dashboard")) ||
                  (item.href === "/ngo-verification" &&
                    location.includes("ngo-verification")) ||
                  (item.href === "/projects" && location.startsWith("/projects")) ||
                  (item.href === "/volunteers" && location.startsWith("/volunteers")) ||
                  (item.href.includes("impact-report") && location.includes("impact-report"));

                const isVerifyTab = item.label === "Verify";

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
                      {isVerifyTab && pendingCount > 0 && (
                        <Badge
                          variant="destructive"
                          size="sm"
                          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
                        >
                          {pendingCount}
                        </Badge>
                      )}
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Create Project Button */}
            <Button
              variant="accent"
              size="sm"
              className="hidden sm:flex"
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
                  {organization?.name || "Organization"}
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
                  <div className="absolute right-0 top-full mt-2 w-64 z-50 rounded-xl border border-stone-200 bg-white shadow-xl overflow-hidden">
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
                            <span>NGO Portal</span>
                          </div>
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
                    <div className="border-t border-stone-200 py-2">
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

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-stone-600 hover:text-stone-900 hover:bg-stone-100"
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
