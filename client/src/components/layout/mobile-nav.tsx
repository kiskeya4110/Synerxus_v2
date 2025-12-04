import { Home, Search, BarChart3, User, Briefcase, Users, Calendar, ClipboardList, Menu, X, FileText, MessageSquare, Settings } from "lucide-react";
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

  const isOrganization = currentUser?.userType === 'organization';

  const volunteerNavItems = [
    { href: "/dashboard", icon: Home, label: "Home", testId: "nav-dashboard" },
    { href: "/discover-opportunities", icon: Search, label: "Discover", testId: "nav-opportunities" },
    { href: "/my-work", icon: ClipboardList, label: "My Work", testId: "nav-my-work" },
    { href: "/profile", icon: User, label: "Profile", testId: "nav-profile" },
  ];

  const organizationNavItems = [
    { href: "/organization-dashboard", icon: Home, label: "Home", testId: "nav-dashboard" },
    { href: "/applications", icon: FileText, label: "Applications", testId: "nav-applications" },
    { href: "/my-work", icon: Briefcase, label: "Projects", testId: "nav-projects" },
    { href: "/volunteers", icon: Users, label: "Volunteers", testId: "nav-volunteers" },
    { href: "/organization-messages", icon: MessageSquare, label: "Messages", testId: "nav-messages" },
    { href: "/organization-profile-settings", icon: Settings, label: "Settings", testId: "nav-settings" },
  ];

  const navItems = isOrganization ? organizationNavItems : volunteerNavItems;

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
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400"
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
