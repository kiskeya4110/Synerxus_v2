import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, Briefcase, User, Settings, Menu, X, LogOut, Bell, Sparkles, BarChart3, ClipboardList, Trophy, MessageCircle, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User as UserType } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoImage from "@assets/Synerxus_Logo_1765433966690.png";

// Desktop nav items with full labels for better readability
const VOLUNTEER_NAV_ITEMS = [
  { href: "/volunteer-dashboard", label: "Dashboard", icon: <Home className="w-4 h-4" />, description: "Dashboard & Metrics" },
  { href: "/projects", label: "My Projects", icon: <Briefcase className="w-4 h-4" />, description: "Your Projects" },
  { href: "/my-work", label: "My Work", icon: <ClipboardList className="w-4 h-4" />, description: "Tasks & Assignments" },
  { href: "/discover-opportunities", label: "Discover", icon: <Sparkles className="w-4 h-4" />, description: "Discover Opportunities" },
  { href: "/impact-visualization", label: "My Impact", icon: <BarChart3 className="w-4 h-4" />, description: "View Your Impact" },
];

// Dropdown menu items matching PWA mobile view
const MENU_ITEMS = [
  { href: "/volunteer-dashboard", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
  { href: "/projects", label: "My Projects", icon: <Briefcase className="w-4 h-4" /> },
  { href: "/discover-opportunities", label: "Discover", icon: <Sparkles className="w-4 h-4" /> },
  { href: "/log-activity", label: "Log Activity", icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/impact-report", label: "SDG Impact Report", icon: <BarChart3 className="w-4 h-4" /> },
  { href: "/leaderboard", label: "Leaderboard", icon: <Trophy className="w-4 h-4" /> },
  { href: "/volunteer-messages", label: "Messages", icon: <MessageCircle className="w-4 h-4" /> },
  { href: "/stories", label: "Stories", icon: <BookOpen className="w-4 h-4" /> },
  { href: "/volunteer-profile-settings", label: "Profile & Settings", icon: <User className="w-4 h-4" /> },
];

export default function VolunteerNav() {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { signOut } = useAuth();
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

  // Handle logout
  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

  // Don't show on PWA routes or landing/login routes
  const isPwaRoute = location.endsWith('/pwa');
  const standaloneRoutes = [
    '/landing',
    '/login',
    '/'
  ];
  const isStandaloneRoute = standaloneRoutes.some(route =>
    location === route || location.startsWith(route + '/')
  );

  // Use localStorage userType as fallback while query is loading (for refresh/login)
  const storedUserType = localStorage.getItem('userType');
  const effectiveUserType = currentUser?.userType || storedUserType;

  // Only show for volunteers on desktop (hide on mobile for PWA)
  if (effectiveUserType !== 'volunteer' || isPwaRoute || isStandaloneRoute) {
    return null;
  }

  const userInitial = (currentUser?.displayName || currentUser?.username || 'V').charAt(0).toUpperCase();

  // Navigate to volunteer dashboard when logo is clicked (dashboard home button)
  const handleLogoClick = () => {
    navigate('/volunteer-dashboard');
  };

  return (
    <nav className="hidden md:block sticky top-0 z-[9999] border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand - Never shrink, always visible */}
          <div className="flex items-center gap-4 lg:gap-6 flex-shrink-0">
            <button
              onClick={handleLogoClick}
              className="flex items-center hover:opacity-90 transition-opacity cursor-pointer flex-shrink-0"
              title="Go to Dashboard"
            >
              {!imageError ? (
                <img
                  src={logoImage}
                  alt="Synerxus Logo"
                  className="h-10 lg:h-12 w-auto object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
              )}
            </button>

            {/* Hamburger Menu for Nav Items - Shows on md-lg screens when nav items are hidden */}
            <div className="lg:hidden relative">
              <button
                onClick={() => setNavMenuOpen(!navMenuOpen)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                aria-label="Navigation menu"
                data-testid="nav-hamburger-menu"
              >
                {navMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Nav Dropdown Menu */}
              {navMenuOpen && (
                <>
                  {/* Backdrop - outside stacking context */}
                  <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-[1px]"
                    style={{ zIndex: 9998 }}
                    onClick={() => setNavMenuOpen(false)}
                    aria-hidden="true"
                  />

                  {/* Menu Panel - positioned fixed to avoid sticky issues */}
                  <div
                    className="fixed left-4 top-16 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden"
                    style={{ zIndex: 10000 }}
                  >
                    <div className="py-1">
                      {VOLUNTEER_NAV_ITEMS.map((item) => {
                        const isActive = location === item.href ||
                          (item.href === '/volunteer-dashboard' && (location === '/dashboard' || location.startsWith('/volunteer-dashboard'))) ||
                          (item.href === '/projects' && location.startsWith('/projects')) ||
                          (item.href === '/my-work' && location.startsWith('/my-work')) ||
                          (item.href === '/discover-opportunities' && location.includes('discover-opportunities')) ||
                          (item.href === '/impact-visualization' && location.includes('impact-visualization'));

                        return (
                          <Link key={item.href} href={item.href}>
                            <button
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                                isActive
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                              )}
                              onClick={() => setNavMenuOpen(false)}
                            >
                              {item.icon}
                              <span className="font-medium">{item.label}</span>
                            </button>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Nav Items - Hidden on smaller screens, collapse before logo */}
            <div className="hidden lg:flex items-center gap-1 overflow-x-auto border-l border-gray-200 dark:border-gray-700 pl-4 lg:pl-6">
              {VOLUNTEER_NAV_ITEMS.map((item) => {
                const isActive = location === item.href ||
                               (item.href === '/volunteer-dashboard' && (location === '/dashboard' || location.startsWith('/volunteer-dashboard'))) ||
                               (item.href === '/projects' && location.startsWith('/projects')) ||
                               (item.href === '/my-work' && location.startsWith('/my-work')) ||
                               (item.href === '/discover-opportunities' && location.includes('discover-opportunities')) ||
                               (item.href === '/impact-visualization' && location.includes('impact-visualization'));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap text-sm font-medium min-h-[40px]",
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/30"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                    )}
                    data-testid={`volunteer-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    title={item.description}
                  >
                    {item.icon}
                    <span className="hidden xl:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Section: Notifications + User Profile Menu */}
          <div className="flex items-center gap-3">
            {/* Notifications Bell */}
            <Link href="/notifications">
              <button
                className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
              </button>
            </Link>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer active:scale-95"
                aria-label="User menu"
                aria-expanded={menuOpen}
                aria-haspopup="true"
                data-testid="volunteer-nav-profile-menu"
                type="button"
              >
                <Avatar className="h-8 w-8 border-2 border-blue-500">
                  <AvatarImage src={currentUser?.avatar || undefined} alt={currentUser?.displayName || 'User'} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-semibold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline text-sm font-medium max-w-[120px] truncate">
                  {currentUser?.displayName || currentUser?.username || 'Volunteer'}
                </span>
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <>
                  {/* Backdrop - outside stacking context */}
                  <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-[1px]"
                    style={{ zIndex: 9998 }}
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />

                  {/* Menu Panel - positioned fixed to avoid sticky issues */}
                  <div
                    className="fixed right-4 top-16 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
                    style={{ zIndex: 10000 }}
                  >
                    {/* User Info Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-blue-500">
                          <AvatarImage src={currentUser?.avatar || undefined} alt={currentUser?.displayName || 'User'} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                            {userInitial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {currentUser?.displayName || currentUser?.username || 'Volunteer'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {currentUser?.email || 'volunteer@example.com'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1 overflow-y-auto flex-1">
                      {MENU_ITEMS.map((item) => {
                        const isActive = location === item.href;
                        return (
                          <Link key={item.href} href={item.href}>
                            <button
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
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

                    {/* Logout Button */}
                    <div className="border-t border-gray-200 dark:border-gray-600 py-1 flex-shrink-0">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
