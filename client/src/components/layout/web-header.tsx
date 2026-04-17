import { useState } from "react";
import { useLocation } from "wouter";
import {
  Menu, X, Home, LogOut, Settings,
  ClipboardList, Briefcase,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUserId } from "@/hooks/use-current-user-id";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/components/ui/logo";
import type { User as UserType } from "@shared/schema";

interface WebHeaderProps {
  transparent?: boolean;
  activeTab?: string;
}

export default function WebHeader({ transparent = false, activeTab }: WebHeaderProps) {
  const [, navigate] = useLocation();
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const userId = useCurrentUserId();

  // Fetch current user
  const { data: currentUser, isError: isUserError, refetch: refetchUser } = useQuery<UserType>({
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
    { icon: Briefcase, label: "My Work", path: "/my-work", active: activeTab === 'projects' },
    { icon: ClipboardList, label: "Log Activity", path: "/log-activity", highlight: true },
    { icon: Settings, label: "Profile Settings", path: "/volunteer-profile-settings" },
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
            {/* Retry indicator if user fetch failed */}
            {isUserError && (
              <button
                onClick={() => refetchUser()}
                className="text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
              >
                Retry
              </button>
            )}

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
          <div className="relative ml-auto w-[85%] max-w-sm h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
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
                      ? 'bg-emerald-50 text-emerald-600'
                      : item.active
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    item.highlight
                      ? 'bg-emerald-100'
                      : item.active
                        ? 'bg-blue-100'
                        : 'bg-stone-100'
                  }`}>
                    <item.icon className={`w-5 h-5 ${
                      item.highlight
                        ? 'text-emerald-600'
                        : item.active
                          ? 'text-blue-600'
                          : 'text-stone-600'
                    }`} />
                  </div>
                  <span className="font-medium flex-1">{item.label}</span>
                  <ChevronRight className={`w-5 h-5 ${
                    item.highlight || item.active
                      ? 'opacity-60'
                      : 'text-stone-400'
                  }`} />
                </button>
              ))}
            </div>

            {/* Logout Button */}
            <div className="border-t border-stone-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
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
