import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  MoreVertical, LogOut, RefreshCw,
  FolderOpen, Users, Target, BarChart3,
  MessageSquare, Home, Bell, Trophy, X,
  TrendingUp, Award, Lightbulb, Flame, Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";

interface OrganizationPWAHeaderProps {
  organizationName?: string;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  metrics?: {
    activeProjects?: number;
    activeVolunteers?: number;
    totalAiu?: number;
    totalHours?: number;
    sdgsAddressed?: number;
  };
}

export default function OrganizationPWAHeader({
  onRefresh,
  isRefreshing = false,
  metrics,
}: OrganizationPWAHeaderProps) {
  const [, navigate] = useLocation();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (showMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMenu]);

  const handleSignOut = async () => {
    try {
      setShowMenu(false);
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      navigate("/landing");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      await onRefresh();
    }
  };

  const menuSections = [
    {
      title: "MAIN",
      items: [
        { icon: MessageSquare, label: "Messages", desc: "Team communication", action: () => navigate('/organization-messages/pwa') },
      ]
    },
    {
      title: "ANALYTICS & REPORTS",
      items: [
        { icon: BarChart3, label: "Impact Report", desc: "Visualize your impact", action: () => navigate('/impact-visualization') },
        { icon: Target, label: "SDG Mapping", desc: "UN Goals alignment", action: () => navigate('/sdg-mapping') },
        { icon: Trophy, label: "Leaderboard", desc: "Top performers", action: () => navigate('/organization-leaderboard/pwa'), hot: true },
        { icon: TrendingUp, label: "Analytics", desc: "Performance metrics", action: () => navigate('/csr-reports-exports') },
      ]
    },
    {
      title: "TEAM & ENGAGEMENT",
      items: [
        { icon: Users, label: "Volunteers", desc: "Your team members", action: () => navigate('/volunteers') },
        { icon: Lightbulb, label: "Stories", desc: "Impact storytelling", action: () => navigate('/impact-storytelling') },
        { icon: Award, label: "Recognition", desc: "Celebrate achievements", action: () => navigate('/volunteer-recognition') },
      ]
    },
    {
      title: "ACCOUNT",
      items: [
        { icon: Settings, label: "Settings", desc: "Organization settings", action: () => navigate('/organization-profile-settings') },
      ]
    },
  ];

  return (
    <>
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between w-full"
        style={{
          background: 'linear-gradient(to right, #fffbeb 0%, #fef3c7 30%, #fcd34d 70%, #f59e0b 100%)',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.25)'
        }}
      >
        <img
          src={logoUrl}
          alt="Synerxus"
          className="h-10 object-contain cursor-pointer flex-shrink-0"
          onClick={() => navigate('/organization-dashboard/pwa')}
        />

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-slate-700 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Menu Button */}
          <button
            onClick={() => setShowMenu(true)}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all"
            aria-label="Menu"
          >
            <MoreVertical className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </header>

      {/* Full Screen Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-[9999] flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu Panel */}
          <div className="absolute top-0 right-0 w-80 max-w-[90vw] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Menu Header */}
            <div
              className="px-4 py-4 flex items-center justify-between flex-shrink-0"
              style={{ background: 'linear-gradient(to right, #fffbeb 0%, #fef3c7 50%, #f59e0b 100%)' }}
            >
              <p className="font-bold text-lg text-amber-900">Menu</p>
              <button
                onClick={() => setShowMenu(false)}
                className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-all"
              >
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            {/* Quick Stats */}
            {metrics && (
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-slate-800">{metrics.activeProjects || 0}</span>
                    <span className="text-slate-500">Projects</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-800">{metrics.activeVolunteers || 0}</span>
                    <span className="text-slate-500">Volunteers</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 mt-2 text-xs">
                  <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-full border border-slate-200">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span className="font-medium text-slate-700">{metrics.totalAiu?.toLocaleString() || 0} AIU</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-full border border-slate-200">
                    <span className="font-medium text-slate-700">{metrics.totalHours?.toLocaleString() || 0} Hrs</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-full border border-slate-200">
                    <Target className="w-3 h-3 text-teal-500" />
                    <span className="font-medium text-slate-700">{metrics.sdgsAddressed || 0} SDGs</span>
                  </div>
                </div>
              </div>
            )}

            {/* Menu Sections */}
            <div className="flex-1 overflow-y-auto">
              {menuSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="py-2">
                  {/* Section Title */}
                  <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {section.title}
                  </p>
                  {/* Section Items */}
                  {section.items.map((item, itemIndex) => (
                    <button
                      key={itemIndex}
                      onClick={() => { setShowMenu(false); item.action(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                          {(item as any).hot && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-orange-500 text-white rounded uppercase">
                              Hot
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ))}

              {/* Logout - Separate at bottom */}
              <div className="py-2 border-t border-slate-200 mt-2">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-red-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <LogOut className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-red-600">Logout</span>
                    <p className="text-xs text-red-400">Sign out safely</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
