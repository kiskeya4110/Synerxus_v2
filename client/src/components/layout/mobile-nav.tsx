import { Home, Search, User, ClipboardList, Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function MobileNav() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const userId = localStorage.getItem('currentUserId');
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const response = await fetch(`/api/users/me?userId=${id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId
  });

  // Routes that have their own complete navigation - don't show MobileNav here
  const standaloneRoutes = [
    '/volunteer-dashboard',
    '/csr-dashboard',
    '/csr-dashboard-pwa',
    '/organization-dashboard',
    '/organization-dashboard-pwa',
    '/discover-opportunities/pwa',
    '/discover-opportunities',
    '/applications',
    '/volunteers',
    '/my-work',
    '/projects',
    '/opportunities',
    '/organization-messages',
    '/organization-messages-pwa',
    '/organization-profile-settings',
    '/organization-impact-report',
    '/organization-leaderboard',
    '/organization-team',
    '/sdg-mapping',
    '/impact-visualization',
    '/overview',
    '/landing',
    '/login',
    '/'
  ];

  // Check for PWA routes (any route ending in /pwa) or standalone routes
  const isPwaRoute = location.endsWith('/pwa');
  const isStandaloneRoute = isPwaRoute || standaloneRoutes.some(route =>
    location === route || location.startsWith(route + '/') || (route !== '/' && location.startsWith(route))
  );

  const isOrganization = currentUser?.userType === 'organization';

  // Never show MobileNav for organization users - they have their own navigation (OrganizationHeader, OrganizationPWAHeader, OrganizationPWANav)
  if (isOrganization) {
    return null;
  }

  // Don't render on standalone routes
  if (isStandaloneRoute) {
    return null;
  }

  // Don't render hamburger menu for logged-in volunteers - they use their own bottom navigation (VolunteerPWANav)
  if (currentUser) {
    return null;
  }

  // Fallback nav items for non-logged-in users (should rarely reach this point)
  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home", testId: "nav-dashboard" },
    { href: "/discover-opportunities", icon: Search, label: "Discover", testId: "nav-opportunities" },
    { href: "/my-work", icon: ClipboardList, label: "My Work", testId: "nav-my-work" },
    { href: "/volunteer-profile-settings", icon: User, label: "Profile", testId: "nav-profile" },
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-20 right-4 z-40 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        data-testid="mobile-menu-button"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Mobile Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-30 top-20"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <nav className="md:hidden fixed top-20 right-0 w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-40 max-h-[calc(100vh-80px)] overflow-y-auto">
            <div className="flex flex-col">
              {navItems.map(({ href, icon: Icon, label, testId }) => {
                const isActive = location === href || (href === "/dashboard" && location === "/");
                return (
                  <Link key={href} href={href}>
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-4",
                        isActive
                          ? "bg-[#D4980C]/50 text-[#7a5200] border-[#D4980C]"
                          : "text-gray-700 dark:text-gray-200 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      )}
                      onClick={() => setIsOpen(false)}
                      data-testid={testId}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{label}</span>
                    </button>
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      )}
    </>
  );
}
