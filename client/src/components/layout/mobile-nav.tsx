import { Home, Search, BarChart3, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard", testId: "nav-dashboard" },
    { href: "/discover-opportunities", icon: Search, label: "Opportunities", testId: "nav-opportunities" },
    { href: "/impact-report", icon: BarChart3, label: "Impact", testId: "nav-impact" },
    { href: "/profile", icon: User, label: "Profile", testId: "nav-profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center h-16 md:hidden z-10 w-full">
      {navItems.map(({ href, icon: Icon, label, testId }) => {
        const isActive = location === href || (href === "/dashboard" && location === "/");
        return (
          <Link key={href} href={href}>
            <button
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 text-xs font-medium transition-colors",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              )}
              data-testid={testId}
              title={label}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{label}</span>
            </button>
          </Link>
        );
      })}
    </nav>
  );
}
