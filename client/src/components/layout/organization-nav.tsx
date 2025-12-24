import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, BarChart3, Users, Briefcase, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

// Navigation items - organizationId will be added dynamically for impact report
const getOrgNavItems = (organizationId?: number) => [
  { href: "/organization-dashboard", label: "Home", icon: <Home className="w-4 h-4" /> },
  { href: "/overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
  { href: organizationId ? `/organization-impact-report/${organizationId}` : "/organization-impact-report", label: "Impacts", icon: <TrendingUp className="w-4 h-4" /> },
  { href: "/volunteers", label: "Volunteers", icon: <Users className="w-4 h-4" /> },
  { href: "/projects", label: "Projects", icon: <Briefcase className="w-4 h-4" /> },
];

export default function OrganizationNav() {
  const [location] = useLocation();
  const userId = localStorage.getItem('currentUserId');
  
  // Fetch current user to verify organization type
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const url = userId ? `/api/users/me?userId=${userId}` : '/api/users/me';
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId
  });

  // Use localStorage userType as fallback while query is loading (for refresh/login)
  const storedUserType = localStorage.getItem('userType');
  const effectiveUserType = currentUser?.userType || storedUserType;

  // Only show for organizations
  if (effectiveUserType !== 'organization') {
    return null;
  }

  // Get nav items with organizationId for impact report link
  // Convert null to undefined since getOrgNavItems expects number | undefined
  const navItems = getOrgNavItems(currentUser?.organizationId ?? undefined);

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1 sm:gap-2 h-16 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = location === item.href ||
                           (item.href === '/organization-dashboard' && location.startsWith('/organization-dashboard')) ||
                           (item.href === '/overview' && location.startsWith('/overview')) ||
                           (item.href.includes('/organization-impact-report') && location.includes('impact-report'));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-sm sm:text-base font-medium min-h-[44px]",
                  isActive
                    ? "bg-blue-900 text-white dark:bg-blue-800"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                data-testid={`org-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden text-xs">{item.label.charAt(0)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
