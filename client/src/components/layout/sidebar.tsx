import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  Smartphone,
  Briefcase,
  Search,
  FolderKanban,
  UserCircle,
  FileText,
  ShieldCheck
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import Logo from "@/components/ui/logo";
import type { User } from "@shared/schema";
import { useSidebarContext } from "@/contexts/sidebar-context";
import { useCurrentUserId } from "@/hooks/use-current-user-id";

export default function Sidebar() {
  const [location] = useLocation();
  const { sidebarOpen, setSidebarOpen } = useSidebarContext();
  const isMobile = useIsMobile();
  const userId = useCurrentUserId();

  // Fetch current user via the default authenticated query function
  const { data: currentUser, isError: isUserError, refetch: refetchUser } = useQuery<User>({
    queryKey: ["/api/users/me"],
    enabled: !!userId,
  });

  // Close sidebar when clicking outside (on all screen sizes now)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarOpen) {
        const sidebar = document.getElementById("sidebar");
        const hamburger = document.querySelector('[data-testid="button-hamburger-menu"]');
        if (sidebar && hamburger && !sidebar.contains(event.target as Node) && !hamburger.contains(event.target as Node)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarOpen, setSidebarOpen]);

  // Show error state with retry if user fetch fails
  if (isUserError) {
    return (
      <aside
        id="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 w-64 transition-transform duration-300 ease-in-out transform z-40 bg-white shadow-md pt-16 overflow-y-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Failed to load navigation</p>
          <button
            onClick={() => refetchUser()}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </aside>
    );
  }

  // Show minimal shell if userType is not set
  if (!currentUser?.userType) {
    return (
      <aside 
        id="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 w-64 transition-transform duration-300 ease-in-out transform z-40 bg-white shadow-md pt-16 overflow-y-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-4 py-6">
          <Link href="/">
            <div className="flex items-center justify-center mb-8 cursor-pointer hover:opacity-80 transition-opacity">
              <Logo size="sm" />
            </div>
          </Link>
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              Complete your profile to access all features
            </p>
            <div className="space-y-2">
              <Link href="/volunteer-intake" className="block w-full px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
                Volunteer Profile
              </Link>
              <Link href="/organization-intake" className="block w-full px-4 py-2 text-sm bg-secondary text-white rounded-lg hover:bg-secondary/90">
                Organization Profile
              </Link>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const userType = currentUser.userType;

  // Volunteer-specific navigation — MVP core only
  const volunteerNavSections = [
    {
      label: null,
      items: [
        { href: "/discover-opportunities", label: "Find Opportunities", icon: <Search className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
        { href: "/log-activity", label: "Log Activity", icon: <Smartphone className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
        { href: "/my-work", label: "My Work", icon: <Briefcase className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
        { href: "/volunteer-profile-settings", label: "Profile & Settings", icon: <UserCircle className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
      ],
    },
  ];

  // Organization-specific navigation — MVP core only
  const organizationNavSections = [
    {
      label: null,
      items: [
        { href: "/dashboard", label: "Dashboard", icon: <Home className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
        { href: "/ngo-verification", label: "Verify Outcomes", icon: <FolderKanban className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
        { href: "/projects", label: "Projects", icon: <Briefcase className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
        { href: "/log-volunteer-hours", label: "Log Volunteer Hours", icon: <FileText className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
        { href: "/organization-profile-settings", label: "Profile & Settings", icon: <UserCircle className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
      ],
    },
  ];

  const navSections = userType === 'organization' ? organizationNavSections : volunteerNavSections;

  return (
    <>
      {/* Overlay when sidebar is open - now on all screen sizes since autohide is default */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside 
        id="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 w-64 transition-transform duration-300 ease-in-out transform z-40 bg-white shadow-md pt-16 overflow-y-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="px-4 py-4">
            {navSections.map((section, sectionIndex) => (
              <div key={section.label || 'top'} className={sectionIndex > 0 ? "mt-4 pt-3 border-t border-stone-100" : ""}>
                {section.label && (
                  <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    {section.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-3 min-h-[44px] text-sm font-medium rounded-lg transition-colors",
                        (location === item.href || (item.href === '/my-work' && (location === '/my-applications' || location === '/assignments' || location === '/my-tasks')))
                          ? "bg-primary-50 text-primary-700"
                          : "text-stone-700 hover:bg-stone-100"
                      )}
                      onClick={() => setSidebarOpen(false)}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {currentUser?.isAdmin && (
              <div className="mt-4 pt-3 border-t border-stone-100">
                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  Admin
                </p>
                <div className="space-y-0.5">
                  <Link
                    href="/admin/pilot-dashboard"
                    className={cn(
                      "flex items-center px-3 py-3 min-h-[44px] text-sm font-medium rounded-lg transition-colors",
                      location === "/admin/pilot-dashboard"
                        ? "bg-primary-50 text-primary-700"
                        : "text-stone-700 hover:bg-stone-100"
                    )}
                    onClick={() => setSidebarOpen(false)}
                    data-testid="nav-admin-pilot-dashboard"
                  >
                    <ShieldCheck className="w-5 h-5 sm:w-4 sm:h-4 mr-3" />
                    <span className="truncate">Pilot Dashboard</span>
                  </Link>
                </div>
              </div>
            )}
        </nav>
      </aside>

    </>
  );
}
