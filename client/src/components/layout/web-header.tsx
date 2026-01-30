import { useState } from "react";
import { useLocation } from "wouter";
import {
  Menu, X, Home, Search, Bell, Settings, LogOut,
  User, MessageCircle, ClipboardList, Briefcase,
  BarChart3, Sparkles, ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/components/ui/logo";
import type { User as UserType } from "@shared/schema";

interface WebHeaderProps {
  showSearch?: boolean;
  transparent?: boolean;
  activeTab?: string;
}

export default function WebHeader({ showSearch = false, transparent = false, activeTab }: WebHeaderProps) {
  const [, navigate] = useLocation();
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const userId = localStorage.getItem('currentUserId');

  // Fetch current user
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const url = userId ? `/api/users/me?userId=${userId}` : '/api/users/me';
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId
  });

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const userInitial = (currentUser?.displayName || currentUser?.username || 'U').charAt(0).toUpperCase();

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/volunteer-dashboard", active: activeTab === 'dashboard' },
    { icon: Briefcase, label: "My Projects", path: "/volunteer-dashboard?tab=projects", active: activeTab === 'projects' },
    { icon: Sparkles, label: "Discover", path: "/discover-opportunities", active: activeTab === 'discover' },
    { icon: ClipboardList, label: "Log Activity", path: "/log-activity", highlight: true },
    { icon: BarChart3, label: "My Impact", path: "/volunteer-dashboard?tab=impacts", active: activeTab === 'impacts' },
    { icon: MessageCircle, label: "Messages", path: "/volunteer-messages/pwa" },
    { icon: User, label: "Profile & Settings", path: "/volunteer-profile-settings", active: activeTab === 'profile' },
  ];

  return (
    <>
      {/* Main Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 ${
        transparent
          ? 'bg-transparent'
          : 'bg-white border-b border-stone-200'
      }`}>
        {/* Safe area padding for notched devices */}
        <div className="pt-[max(0.5rem,env(safe-area-inset-top))]" />

        <div className="px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Logo size="sm" variant="full" theme="light" />

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search Button (optional) */}
            {showSearch && (
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-all"
              >
                <Search className="w-5 h-5 text-stone-600" />
              </button>
            )}

            {/* Notifications */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-all"
            >
              <Bell className="w-5 h-5 text-stone-600" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                3
              </span>
            </button>

            {/* Profile/Menu Button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 transition-all"
            >
              <Avatar className="h-8 w-8 border-2 border-stone-200">
                <AvatarImage src={currentUser?.avatar || undefined} alt={currentUser?.displayName || 'User'} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-semibold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <Menu className="w-5 h-5 text-stone-600" />
            </button>
          </div>
        </div>

        {/* Search Expandable Bar */}
        {searchOpen && (
          <div className="px-4 pb-3 animate-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search opportunities, projects..."
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Slide-out Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="relative ml-auto w-[85%] max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Menu Header */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-6 pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.5rem))]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/60 text-sm font-medium">Menu</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 border-2 border-white/30 shadow-lg">
                  <AvatarImage src={currentUser?.avatar || undefined} alt={currentUser?.displayName || 'User'} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xl font-semibold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-lg truncate">
                    {currentUser?.displayName || currentUser?.username || 'Volunteer'}
                  </p>
                  <p className="text-white/60 text-sm truncate">
                    {currentUser?.email || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-3">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(item.path);
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 transition-colors text-left ${
                    item.highlight
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                      : item.active
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    item.highlight
                      ? 'bg-emerald-100 dark:bg-emerald-900/40'
                      : item.active
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <item.icon className={`w-5 h-5 ${
                      item.highlight
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : item.active
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400'
                    }`} />
                  </div>
                  <span className="font-medium flex-1">{item.label}</span>
                  <ChevronRight className={`w-5 h-5 ${
                    item.highlight || item.active
                      ? 'opacity-60'
                      : 'text-slate-400 dark:text-slate-500'
                  }`} />
                </button>
              ))}
            </div>

            {/* Logout Button */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed header */}
      <div className="h-[calc(3.5rem+max(0.5rem,env(safe-area-inset-top)))]" />
    </>
  );
}
