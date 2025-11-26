import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Home, 
  CheckSquare, 
  Users, 
  Building2, 
  PieChart, 
  Globe, 
  Calendar,
  LayoutList,
  Smartphone,
  Sparkles,
  BarChart,
  Briefcase,
  Search,
  FolderKanban,
  UserCircle,
  Settings,
  FileText,
  Mail,
  Award,
  Trophy
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

  // Fetch current user to determine role
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const url = userId ? `/api/users/me?userId=${userId}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    },
    enabled: !!userId
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

  // Show minimal shell if userType is not set
  if (!currentUser?.userType) {
    return (
      <aside 
        id="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 w-64 transition-transform duration-300 ease-in-out transform z-40 bg-white dark:bg-gray-800 shadow-md pt-16 overflow-y-auto",
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
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
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

  // Volunteer-specific navigation
  const volunteerNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: <Home className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/profile", label: "Profile", icon: <UserCircle className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/volunteer-profile-settings", label: "Settings", icon: <Settings className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/discover-opportunities", label: "Find Opportunities", icon: <Search className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/my-work", label: "My Work", icon: <Briefcase className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/calendar", label: "Calendar", icon: <Calendar className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/mobile-data-collection", label: "Log Activity", icon: <Smartphone className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/achievements", label: "Achievements", icon: <Award className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/leaderboard", label: "Leaderboard", icon: <Trophy className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/email-digests", label: "Email Digests", icon: <Mail className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> }
  ];

  // Organization-specific navigation
  const organizationNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: <Home className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/my-work", label: "My Work", icon: <Briefcase className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/profile", label: "Profile", icon: <UserCircle className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/organization-profile-settings", label: "Settings", icon: <Settings className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/projects", label: "Projects & Tasks", icon: <FolderKanban className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/volunteers", label: "Volunteers", icon: <Users className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/applications", label: "Applications", icon: <FileText className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/impact-visualization", label: "Impact Visualization", icon: <PieChart className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/sdg-mapping", label: "SDG Tracking", icon: <Globe className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/field-specific-metrics", label: "Metrics", icon: <BarChart className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/calendar", label: "Calendar", icon: <Calendar className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/organization-leaderboard", label: "Leaderboard", icon: <Trophy className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/email-digests", label: "Email Digests", icon: <Mail className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> }
  ];

  const navItems = userType === 'organization' ? organizationNavItems : volunteerNavItems;

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
          "fixed inset-y-0 left-0 w-64 transition-transform duration-300 ease-in-out transform z-40 bg-white dark:bg-gray-800 shadow-md pt-16 overflow-y-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="px-4 py-6">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-3 min-h-[44px] text-sm font-medium rounded-lg transition-colors",
                    (location === item.href || (item.href === '/my-work' && (location === '/my-applications' || location === '/assignments' || location === '/my-tasks')))
                      ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400" 
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                  onClick={() => setSidebarOpen(false)}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
        </nav>
      </aside>

      {/* Mobile menu button */}
      {isMobile && !sidebarOpen && (
        <button 
          className="fixed md:bottom-6 bottom-20 right-6 p-4 min-h-[56px] min-w-[56px] bg-primary text-white rounded-full shadow-lg z-50 lg:hidden flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          data-testid="mobile-menu-button"
        >
          <LayoutList className="w-7 h-7" />
        </button>
      )}
    </>
  );
}
