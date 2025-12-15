import { useState } from "react";
import { useLocation } from "wouter";
import { MoreVertical, Home, Settings, MessageCircle, LogOut, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";

interface PWAHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function PWAHeader({ showBackButton = false, onBack }: PWAHeaderProps) {
  const [, navigate] = useLocation();
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    { icon: Home, label: "Home", action: () => navigate('/volunteer-dashboard') },
    { icon: MessageCircle, label: "Messages", action: () => navigate('/volunteer-messages/pwa') },
    { icon: Settings, label: "Settings", action: () => navigate('/volunteer-profile-settings') },
    { icon: LogOut, label: "Logout", action: handleLogout, danger: true },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-gradient-to-r from-blue-400 via-cyan-300 to-amber-300 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img 
            src={logoUrl} 
            alt="Synerxus" 
            className="h-10 object-contain cursor-pointer"
            onClick={() => navigate('/volunteer-dashboard')}
          />
        </div>
        
        <button
          onClick={() => setMenuOpen(true)}
          className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all"
          data-testid="button-pwa-menu"
        >
          <MoreVertical className="w-5 h-5 text-slate-700" />
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-end">
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative mt-16 mr-4 bg-white rounded-xl shadow-2xl overflow-hidden min-w-[200px] animate-in slide-in-from-top-2 duration-200">
            <div className="p-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setMenuOpen(false);
                    item.action();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    item.danger 
                      ? 'text-red-600 hover:bg-red-50' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  data-testid={`menu-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
