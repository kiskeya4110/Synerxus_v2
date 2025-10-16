import { useState, useEffect } from "react";
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
  FolderKanban
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export default function Sidebar() {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Fetch current user to determine role
  // TODO: /api/users/me currently returns hardcoded user. Implement proper session management.
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me"],
    enabled: true
  });

  // Set initial state based on screen size
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && sidebarOpen) {
        const sidebar = document.getElementById("sidebar");
        if (sidebar && !sidebar.contains(event.target as Node)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, sidebarOpen]);

  // Update sidebarOpen state when mobile state changes
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const userType = currentUser?.userType || 'volunteer';

  // Volunteer-specific navigation
  const volunteerNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: <Home className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/discover-opportunities", label: "Find Opportunities", icon: <Search className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/my-tasks", label: "My Tasks", icon: <CheckSquare className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/impact-visualization", label: "My Impact", icon: <PieChart className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/calendar", label: "Calendar", icon: <Calendar className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/mobile-data-collection", label: "Log Activity", icon: <Smartphone className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> }
  ];

  // Organization-specific navigation
  const organizationNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: <Home className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/projects", label: "Projects & Tasks", icon: <FolderKanban className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/opportunities", label: "Post Opportunities", icon: <Briefcase className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/volunteers", label: "Volunteers", icon: <Users className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/impact-visualization", label: "Impact Reports", icon: <PieChart className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/sdg-mapping", label: "SDG Tracking", icon: <Globe className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/impact-storytelling", label: "Impact Stories", icon: <Sparkles className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/field-specific-metrics", label: "Metrics", icon: <BarChart className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> },
    { href: "/calendar", label: "Calendar", icon: <Calendar className="w-5 h-5 sm:w-4 sm:h-4 mr-3" /> }
  ];

  const navItems = userType === 'organization' ? organizationNavItems : volunteerNavItems;

  return (
    <>
      {/* Overlay when sidebar is open on mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside 
        id="sidebar"
        className={cn(
          "fixed lg:static inset-y-0 left-0 w-64 transition-transform duration-300 ease-in-out transform lg:translate-x-0 z-40 bg-white dark:bg-gray-800 shadow-md pt-16 overflow-y-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-4 py-6">
          <div className="flex items-center justify-center mb-8">
            <h1 className="text-xl font-bold text-primary dark:text-primary">aBridge</h1>
          </div>
          
          <nav>
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-3 min-h-[44px] text-sm font-medium rounded-lg transition-colors",
                    location === item.href 
                      ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400" 
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                  onClick={() => isMobile && setSidebarOpen(false)}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </aside>

      {/* Mobile menu button */}
      {isMobile && !sidebarOpen && (
        <button 
          className="fixed bottom-6 right-6 p-4 min-h-[56px] min-w-[56px] bg-primary text-white rounded-full shadow-lg z-50 lg:hidden flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95"
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
