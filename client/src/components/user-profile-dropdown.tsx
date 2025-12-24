import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserProfileDropdownProps {
  className?: string;
}

export function UserProfileDropdown({ className = "" }: UserProfileDropdownProps) {
  const { user, signOut } = useAuth();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user info
  const userType = localStorage.getItem("userType");
  const displayName = user?.displayName || user?.email?.split('@')[0] || "User";
  const userEmail = user?.email || "";
  const userRole = userType === 'corporate-partner' ? 'CSR Admin'
                 : userType === 'organization' ? 'Organization Admin'
                 : 'Volunteer';

  // Get initials for avatar fallback
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setIsOpen(false);
    if (userType === 'corporate-partner') {
      navigate('/corporate-partner-profile-settings');
    } else if (userType === 'organization') {
      navigate('/organization-profile-settings');
    } else {
      navigate('/volunteer-profile-settings');
    }
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
    navigate('/landing');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-emerald-50"
        style={{
          cursor: 'pointer',
          outline: 'none',
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        }}
      >
        <Avatar className="h-8 w-8 border-2 border-emerald-200">
          <AvatarImage src={(user as any)?.avatar} />
          <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-semibold text-gray-800">
            {displayName}
          </span>
          <span className="text-xs text-gray-600">
            {userRole}
          </span>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl shadow-2xl overflow-hidden z-50"
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* User Info Section */}
          <div
            className="px-4 py-3 border-b border-gray-100"
            style={{
              background: 'linear-gradient(135deg, #2A4B7F 0%, #00C389 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-white">
                <AvatarImage src={(user as any)?.avatar} />
                <AvatarFallback className="bg-white text-blue-900 font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {displayName}
                </p>
                <p className="text-xs text-white/80 truncate">
                  {userEmail}
                </p>
                <p className="text-xs text-white/70 mt-0.5">
                  {userRole}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* My Profile */}
            <button
              onClick={handleProfileClick}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">My Profile</span>
            </button>

            {/* Account Settings */}
            <button
              onClick={handleProfileClick}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Account Settings</span>
            </button>

            {/* Divider */}
            <div className="my-2 border-t border-gray-100"></div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
