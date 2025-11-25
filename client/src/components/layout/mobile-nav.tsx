import { Home, Search, BarChart3, User, Briefcase, Users, Calendar, ClipboardList } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export default function MobileNav() {
  const [location] = useLocation();

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
    { href: "/dashboard", icon: Home, label: "Home", testId: "nav-dashboard" },
    { href: "/projects", icon: Briefcase, label: "Projects", testId: "nav-projects" },
    { href: "/volunteers", icon: Users, label: "Volunteers", testId: "nav-volunteers" },
    { href: "/profile", icon: User, label: "Profile", testId: "nav-profile" },
  ];

  const navItems = isOrganization ? organizationNavItems : volunteerNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 md:hidden z-50 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-center h-16 px-2 max-w-lg mx-auto">
        {navItems.map(({ href, icon: Icon, label, testId }) => {
          const isActive = location === href || (href === "/dashboard" && location === "/");
          return (
            <Link key={href} href={href}>
              <button
                className={cn(
                  "relative flex flex-col items-center justify-center min-w-[64px] h-14 gap-0.5 transition-all duration-200 rounded-xl active:scale-95",
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 active:text-gray-700 dark:active:text-gray-300"
                )}
                data-testid={testId}
                title={label}
              >
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive && "scale-110"
                )} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn(
                  "text-[10px] font-medium transition-all duration-200",
                  isActive && "font-semibold"
                )}>{label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
