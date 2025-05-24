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
  BarChart
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Sidebar() {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

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

  const navItems = [
    { href: "/", label: "Dashboard", icon: <Home className="w-5 h-5 mr-3" /> },
    { href: "/projects", label: "Projects", icon: <LayoutList className="w-5 h-5 mr-3" /> },
    { href: "/tasks", label: "Tasks", icon: <CheckSquare className="w-5 h-5 mr-3" /> },
    { href: "/volunteers", label: "Volunteers", icon: <Users className="w-5 h-5 mr-3" /> },
    { href: "/organizations", label: "Organizations", icon: <Building2 className="w-5 h-5 mr-3" /> },
    { href: "/impact-visualization", label: "Impact Visualization", icon: <PieChart className="w-5 h-5 mr-3" /> },
    { href: "/sdg-mapping", label: "SDG Mapping", icon: <Globe className="w-5 h-5 mr-3" /> },
    { href: "/mobile-data-collection", label: "Mobile Collection", icon: <Smartphone className="w-5 h-5 mr-3" /> },
    { href: "/impact-storytelling", label: "Impact Storytelling", icon: <Sparkles className="w-5 h-5 mr-3" /> },
    { href: "/field-specific-metrics", label: "Field Metrics", icon: <BarChart className="w-5 h-5 mr-3" /> },
    { href: "/calendar", label: "Calendar", icon: <Calendar className="w-5 h-5 mr-3" /> }
  ];

  const projects = [
    { name: "Clean Water Initiative", color: "bg-green-500" },
    { name: "Education Access Program", color: "bg-blue-500" },
    { name: "Medical Outreach", color: "bg-purple-500" }
  ];

  return (
    <>
      <aside 
        id="sidebar"
        className={cn(
          "fixed lg:static inset-y-0 left-0 w-64 transition-transform duration-300 ease-in-out transform lg:translate-x-0 z-10 bg-white dark:bg-gray-800 shadow-md pt-16 overflow-y-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-4 py-6">
          <div className="flex items-center justify-center mb-8">
            <h1 className="text-xl font-bold text-primary dark:text-primary">ImpactTrack</h1>
          </div>
          
          <nav>
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg",
                    location === item.href 
                      ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400" 
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
            
            <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h2 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Your Projects
              </h2>
              <div className="space-y-1">
                {projects.map((project) => (
                  <Link 
                    key={project.name}
                    href="#" 
                    className="flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className={`w-2 h-2 ${project.color} rounded-full mr-3`}></span>
                    <span>{project.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      </aside>
      
      {/* Overlay when sidebar is open on mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-10 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      {isMobile && !sidebarOpen && (
        <button 
          className="fixed bottom-4 right-4 p-3 bg-primary text-white rounded-full shadow-lg z-10 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <LayoutList className="w-6 h-6" />
        </button>
      )}
    </>
  );
}
