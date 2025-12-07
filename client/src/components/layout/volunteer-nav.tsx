import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, Search, Briefcase, User, Settings, Menu, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User as UserType } from "@shared/schema";
import { useState } from "react";

const VOLUNTEER_NAV_ITEMS = [
  { href: "/", label: "Home", icon: <Home className="w-4 h-4" /> },
  { href: "/dashboard", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
  { href: "/discover-opportunities", label: "Discover", icon: <Search className="w-4 h-4" /> },
  { href: "/my-work", label: "My Work", icon: <Briefcase className="w-4 h-4" /> },
];

const MENU_ITEMS = [
  { href: "/profile", label: "Profile", icon: <User className="w-4 h-4" /> },
  { href: "/volunteer-profile-settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

export default function VolunteerNav() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const userId = localStorage.getItem('currentUserId');

  // Fetch current user to verify volunteer type
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const url = userId ? `/api/users/me?userId=${userId}` : '/api/users/me';
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId
  });

  // Only show for volunteers
  if (currentUser?.userType !== 'volunteer') {
    return null;
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Nav Items */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {VOLUNTEER_NAV_ITEMS.map((item) => {
              const isActive = location === item.href ||
                             (item.href === '/dashboard' && location.startsWith('/dashboard'));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-sm sm:text-base font-medium min-h-[44px]",
                    isActive
                      ? "bg-blue-600 text-white dark:bg-blue-700"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                  data-testid={`volunteer-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden text-xs">{item.label.charAt(0)}</span>
                </Link>
              );
            })}
          </div>

          {/* Hamburger Menu for Profile & Settings */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMenuOpen(false)}
                />

                {/* Menu Panel */}
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-40">
                  {MENU_ITEMS.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors first:rounded-t-lg last:rounded-b-lg",
                            isActive
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                              : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          )}
                          onClick={() => setMenuOpen(false)}
                        >
                          {item.icon}
                          <span className="font-medium">{item.label}</span>
                        </button>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
