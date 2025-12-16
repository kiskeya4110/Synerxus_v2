import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Home,
  Target,
  Briefcase,
  Users,
  Clock,
  TrendingUp,
  MapPin,
  ChevronRight,
  X,
  MoreVertical,
  Bell,
  Settings,
  LogOut,
  FolderOpen,
  MessageCircle,
  Plus,
  RefreshCw,
  User,
  BarChart3,
  Award,
  Heart,
  Zap,
  CheckCircle,
  Lightbulb,
  FileText,
  Activity,
  Globe,
  Layers,
  TrendingDown,
  ArrowUpRight,
  Eye,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSDGName, getSDGColor } from "@shared/sdg-goals";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";

// Lazy load chart components
const AreaChart = lazy(() => import("recharts").then(m => ({ default: m.AreaChart })));
const BarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));
const LineChart = lazy(() => import("recharts").then(m => ({ default: m.LineChart })));
import { Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, Pie, PieChart } from "recharts";

// Lazy load map components
const MapContainer = lazy(() => import("react-leaflet").then(m => ({ default: m.MapContainer })));
const TileLayer = lazy(() => import("react-leaflet").then(m => ({ default: m.TileLayer })));
const CircleMarker = lazy(() => import("react-leaflet").then(m => ({ default: m.CircleMarker })));
const Popup = lazy(() => import("react-leaflet").then(m => ({ default: m.Popup })));
import "leaflet/dist/leaflet.css";

// Loading fallback for charts
const ChartSkeleton = memo(({ height = "h-40" }: { height?: string }) => (
  <div className={`${height} bg-slate-100 animate-pulse rounded-lg flex items-center justify-center`}>
    <div className="text-slate-400 text-xs">Loading chart...</div>
  </div>
));
ChartSkeleton.displayName = "ChartSkeleton";

// Loading fallback for map
const MapSkeleton = memo(() => (
  <div className="h-48 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">
    <MapPin className="w-6 h-6 text-slate-400 animate-bounce" />
  </div>
));
MapSkeleton.displayName = "MapSkeleton";

// Types
interface DashboardData {
  keyMetrics: {
    activeProjects: number;
    completedProjects: number;
    totalProjects: number;
    totalHours: number;
    sdgsAddressed: number;
    aiuEarned: number;
    activeVolunteers: number;
    livesTouched?: number;
    peopleImpacted?: number;
  };
  sdgDistribution: Array<{ goal: number; hours: number; projects: number; volunteers: number }>;
  projectLocations: Array<{ id: number; name: string; location: string; status: string; sdgGoals: number[] }>;
  impactOverTime: Array<{ month: string; hours: number; peopleImpacted: number; volunteers: number }>;
  projects: Array<{ id: number; name: string; status: string; completionPercentage: number; sdgGoals: number[]; aiuEarned?: number }>;
  pendingTasks: Array<{ id: number; title: string; status: string }>;
  alerts: Array<{ id: string; type: string; title: string; message: string; severity: string }>;
  aiInsights?: Array<{ id: string; title: string; message: string; sentiment: 'positive' | 'warning' | 'neutral' }>;
}

interface ProjectLocation {
  id: number;
  name: string;
  location: string;
  status: string;
  sdgGoals: number[];
}

// Geocoding function
function getCoordinatesFromLocation(location: string): { lat: number; lng: number } | null {
  const locationCoords: Record<string, { lat: number; lng: number }> = {
    'zambia': { lat: -13.1939, lng: 27.8493 },
    'kenya': { lat: -0.0236, lng: 37.9062 },
    'nigeria': { lat: 9.0765, lng: 7.3986 },
    'south africa': { lat: -30.5595, lng: 22.9375 },
    'uganda': { lat: 1.3733, lng: 32.2903 },
    'tanzania': { lat: -6.3690, lng: 34.8888 },
    'ethiopia': { lat: 9.1450, lng: 40.4897 },
    'ghana': { lat: 7.3697, lng: -5.6789 },
    'united kingdom': { lat: 55.3781, lng: -3.4360 },
    'france': { lat: 46.2276, lng: 2.2137 },
    'germany': { lat: 51.1657, lng: 10.4515 },
    'india': { lat: 20.5937, lng: 78.9629 },
    'philippines': { lat: 12.8797, lng: 121.7740 },
    'indonesia': { lat: -0.7893, lng: 113.9213 },
    'bangladesh': { lat: 23.6850, lng: 90.3563 },
    'united states': { lat: 37.0902, lng: -95.7129 },
    'brazil': { lat: -14.2350, lng: -51.9253 },
    'australia': { lat: -25.2744, lng: 133.7751 },
    'nairobi': { lat: -1.2921, lng: 36.8219 },
    'lagos': { lat: 6.5244, lng: 3.3792 },
    'cape town': { lat: -33.9249, lng: 18.4241 },
    'johannesburg': { lat: -26.2023, lng: 28.0436 },
    'lusaka': { lat: -15.3875, lng: 28.2833 },
    'london': { lat: 51.5074, lng: -0.1278 },
    'new york': { lat: 40.7128, lng: -74.006 },
  };

  if (!location) return null;
  const normalizedLocation = location.toLowerCase().trim();

  for (const [key, coords] of Object.entries(locationCoords)) {
    if (normalizedLocation.includes(key)) {
      return coords;
    }
  }
  return null;
}

// SDG Colors
const SDG_COLORS: Record<number, string> = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D",
  5: "#FF3A21", 6: "#26BDE2", 7: "#FCC30B", 8: "#A21942",
  9: "#FD6925", 10: "#DD1367", 11: "#FD9D24", 12: "#BF8B2E",
  13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B", 16: "#00689D",
  17: "#19486A"
};

export default function OrganizationDashboardPWA() {
  const { signOut } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const userId = localStorage.getItem("currentUserId");
  const userType = localStorage.getItem("userType");
  const menuRef = useRef<HTMLDivElement>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [refreshing, setRefreshing] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showAiuModal, setShowAiuModal] = useState(false);
  const [selectedSdgGoal, setSelectedSdgGoal] = useState<number | null>(null);
  const [sdgViewMode, setSdgViewMode] = useState<'chart' | 'cards'>('cards');
  const aiuModalRef = useRef<HTMLDivElement>(null);
  const sdgModalRef = useRef<HTMLDivElement>(null);

  // Redirect non-organization users
  useEffect(() => {
    if (userType && userType !== "organization") {
      navigate("/volunteer-dashboard");
    }
  }, [userType, navigate]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (aiuModalRef.current && !aiuModalRef.current.contains(event.target as Node)) {
        setShowAiuModal(false);
      }
      if (sdgModalRef.current && !sdgModalRef.current.contains(event.target as Node)) {
        setSelectedSdgGoal(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast({ title: "Back Online", description: "Connection restored" });
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast({ title: "Offline Mode", description: "Using cached data", variant: "destructive" });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Fetch dashboard data
  const { data: dashboardData, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['/api/organization/dashboard', userId],
    queryFn: async () => {
      const params = new URLSearchParams({ userId: userId || '' });
      const response = await fetch(`/api/organization/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      return response.json();
    },
    enabled: !!userId,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/users/me', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch organization
  const { data: organization } = useQuery({
    queryKey: ['/api/organizations', currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(`/api/organizations/${currentUser.organizationId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  // Fetch pending applications
  const { data: pendingApplications } = useQuery({
    queryKey: ['/api/applications', currentUser?.organizationId, 'pending'],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch(`/api/applications?organizationId=${currentUser.organizationId}`);
      if (!response.ok) return [];
      const allApps = await response.json();
      return allApps.filter((app: any) => app.status === 'pending');
    },
    enabled: !!currentUser?.organizationId,
    staleTime: 30000,
  });

  // Fetch organization profile for SDG goals
  const { data: organizationProfile } = useQuery({
    queryKey: ['/api/intake/organization-profile', currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(`/api/intake/organization-profile?organizationId=${currentUser.organizationId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  // Derived metrics
  const metrics = useMemo(() => {
    if (!dashboardData?.keyMetrics) return {
      activeProjects: 0, completedProjects: 0, totalHours: 0, sdgsAddressed: 0, aiuEarned: 0, activeVolunteers: 0, livesTouched: 0, peopleImpacted: 0
    };
    return dashboardData.keyMetrics;
  }, [dashboardData]);

  // Calculate total AIU with robust fallback
  // Priority: 1. Server aiuEarned, 2. Hours-based calculation, 3. Sum from projects
  const totalAiu = useMemo(() => {
    // First try server-provided AIU
    if (metrics.aiuEarned && metrics.aiuEarned > 0) return metrics.aiuEarned;

    // Fallback: calculate from hours with SDG bonus (1 AIU per 50 hours, up to 2x SDG multiplier)
    if (metrics.totalHours > 0) {
      const sdgMultiplier = Math.min(1 + (metrics.sdgsAddressed * 0.1), 2.0);
      return Math.round((metrics.totalHours / 50) * sdgMultiplier * 100) / 100;
    }

    // Last resort: sum from projects
    if (dashboardData?.projects && dashboardData.projects.length > 0) {
      const projectSum = dashboardData.projects.reduce((sum, p) => sum + (p.aiuEarned || 0), 0);
      if (projectSum > 0) return projectSum;
    }

    return 0;
  }, [metrics.aiuEarned, metrics.totalHours, metrics.sdgsAddressed, dashboardData?.projects]);

  // Calculate total people impacted from impact over time
  const totalPeopleImpacted = useMemo(() => {
    if (metrics.peopleImpacted && metrics.peopleImpacted > 0) return metrics.peopleImpacted;
    if (metrics.livesTouched && metrics.livesTouched > 0) return metrics.livesTouched;
    if (!dashboardData?.impactOverTime) return 0;
    return dashboardData.impactOverTime.reduce((sum, m) => sum + (m.peopleImpacted || 0), 0);
  }, [metrics.peopleImpacted, metrics.livesTouched, dashboardData?.impactOverTime]);

  // Calculate average project completion
  const avgProjectCompletion = useMemo(() => {
    if (!dashboardData?.projects || dashboardData.projects.length === 0) return 0;
    const total = dashboardData.projects.reduce((sum, p) => sum + (p.completionPercentage || 0), 0);
    return Math.round(total / dashboardData.projects.length);
  }, [dashboardData?.projects]);

  // Handle refresh with cache bypass and project recalculation
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // First, trigger project completion recalculation to ensure fresh data
      await fetch('/api/projects/recalculate-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }).catch(() => {}); // Don't fail if this endpoint isn't available

      // Force refetch with cache bypass
      const params = new URLSearchParams({ userId: userId || '', refresh: 'true' });
      const freshData = await fetch(`/api/organization/dashboard?${params}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (freshData.ok) {
        await refetch(); // This will update React Query cache with fresh data
      }
      toast({ title: "Refreshed", description: "Dashboard data updated with latest calculations" });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({ title: "Error", description: "Failed to refresh data", variant: "destructive" });
    }
    setTimeout(() => setRefreshing(false), 500);
  }, [refetch, toast, userId]);

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Loading state
  if (isLoading && !dashboardData) {
    return (
      <div className="h-screen bg-[#faf9f7] flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-4 py-3 h-16 flex items-center justify-between animate-pulse">
          <div className="h-6 w-32 bg-slate-200 rounded" />
          <div className="h-8 w-8 bg-slate-200 rounded-lg" />
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-slate-200 animate-pulse">
              <div className="h-4 w-24 bg-slate-200 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: "Dashboard", action: () => navigate('/organization-dashboard') },
    { icon: MessageCircle, label: "Messages", action: () => navigate('/organization-messages/pwa') },
    { icon: Bell, label: "Applications", action: () => navigate('/applications') },
    { icon: FolderOpen, label: "Projects", action: () => navigate('/projects') },
    { icon: Settings, label: "Settings", action: () => navigate('/organization-profile-settings') },
    { icon: LogOut, label: "Logout", action: handleLogout, danger: true },
  ];

  return (
    <div className="fixed inset-0 h-screen w-screen bg-[#faf9f7] text-slate-800 flex flex-col overflow-hidden z-40 max-w-[428px] mx-auto">
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500/90 text-black text-center py-1.5 px-4 text-xs font-medium">
          Offline Mode - Using Cached Data
        </div>
      )}

      {/* Header - Fixed with safe-area-inset support */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between max-w-[428px] mx-auto">
        <div className="flex items-center gap-2">
          <img
            src={logoUrl}
            alt="Synerxus"
            className="h-10 object-contain cursor-pointer"
            onClick={() => navigate('/organization-dashboard')}
          />
        </div>
        <div className="flex items-center gap-2">
          {/* AIU Earned Button - Opens popup with explanation */}
          <div className="relative" ref={aiuModalRef}>
            <button
              onClick={() => setShowAiuModal(!showAiuModal)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-all"
            >
              <Award className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-bold text-teal-700">{totalAiu.toFixed(1)}</span>
              <span className="text-[10px] text-teal-600 font-medium">AIU</span>
            </button>

            {/* AIU Explanation Popup */}
            {showAiuModal && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200 border border-teal-100">
                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-4 text-white">
                  <div className="flex items-center gap-2">
                    <Award className="w-6 h-6" />
                    <div>
                      <h3 className="font-bold text-lg">{totalAiu.toFixed(1)} AIU</h3>
                      <p className="text-xs text-teal-100">Attributable Impact Units</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Completed Projects */}
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">Completed Projects</span>
                    </div>
                    <span className="text-xl font-bold text-emerald-600">{metrics.completedProjects || 0}</span>
                  </div>

                  {/* How AIU is Calculated */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">How AIU is Calculated</h4>
                    <div className="text-sm text-slate-600 space-y-2">
                      <p className="leading-relaxed">
                        <strong>AIU (Attributable Impact Units)</strong> measure your organization's real-world social impact through volunteer activities.
                      </p>
                      <ul className="space-y-1.5 text-xs">
                        <li className="flex items-start gap-2">
                          <span className="text-teal-500 mt-0.5">•</span>
                          <span><strong>Hours Contributed:</strong> Volunteer time invested in projects</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-teal-500 mt-0.5">•</span>
                          <span><strong>SDG Alignment:</strong> Impact across Sustainable Development Goals</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-teal-500 mt-0.5">•</span>
                          <span><strong>Lives Touched:</strong> Direct beneficiaries of your projects</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-teal-500 mt-0.5">•</span>
                          <span><strong>Verification:</strong> Validated impact records receive higher weight</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* View Full Report Button */}
                  <button
                    onClick={() => {
                      setShowAiuModal(false);
                      navigate('/impact-visualization');
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium text-sm hover:from-teal-600 hover:to-emerald-600 transition-all"
                  >
                    View Full Impact Report
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all"
          >
            <RefreshCw className={`w-5 h-5 text-slate-700 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all"
            >
              <MoreVertical className="w-5 h-5 text-slate-700" />
            </button>
            {showMenu && (
              <div className="absolute right-4 top-14 bg-white rounded-xl shadow-2xl overflow-hidden min-w-[200px] z-50 animate-in slide-in-from-top-2 duration-200">
                <div className="p-2">
                  {menuItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => { setShowMenu(false); item.action(); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                        item.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16 flex-shrink-0" />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="p-4 space-y-4">
          {/* Pending Applications Alert */}
          {pendingApplications && pendingApplications.length > 0 && (
            <button
              onClick={() => navigate('/applications')}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-3 shadow-lg flex items-center justify-between hover:shadow-xl transition-shadow active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">
                    {pendingApplications.length} New Application{pendingApplications.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-emerald-100 text-[10px]">Volunteers waiting for approval</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Welcome Banner */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl p-4 border border-emerald-200 shadow-sm">
            <h2 className="text-lg font-bold text-emerald-900 mb-1">
              Welcome, {organization?.name || 'Organization'}! 👋
            </h2>
            <p className="text-sm text-emerald-700">
              Your team has contributed <span className="font-bold">{metrics.totalHours.toLocaleString()} hours</span> across <span className="font-bold">{metrics.activeProjects}</span> projects
            </p>
          </div>

          {/* Key Metrics Grid - Compact 3x2 Layout */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 border border-emerald-200 shadow-sm">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow mb-1.5">
                <FolderOpen className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-bold text-emerald-800">{metrics.activeProjects}</p>
              <p className="text-[10px] text-emerald-700 font-medium">Projects</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200 shadow-sm">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow mb-1.5">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-bold text-blue-800">{metrics.totalHours.toLocaleString()}</p>
              <p className="text-[10px] text-blue-700 font-medium">Hours</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border border-purple-200 shadow-sm">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center shadow mb-1.5">
                <Target className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-bold text-purple-800">{metrics.sdgsAddressed}</p>
              <p className="text-[10px] text-purple-700 font-medium">SDGs</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3 border border-amber-200 shadow-sm">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow mb-1.5">
                <Users className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-bold text-amber-800">{metrics.activeVolunteers}</p>
              <p className="text-[10px] text-amber-700 font-medium">Volunteers</p>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-3 border border-teal-200 shadow-sm">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shadow mb-1.5">
                <Award className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-bold text-teal-800">{totalAiu.toFixed(1)}</p>
              <p className="text-[10px] text-teal-700 font-medium">AIUs</p>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-3 border border-rose-200 shadow-sm">
              <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center shadow mb-1.5">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-bold text-rose-800">{totalPeopleImpacted.toLocaleString()}</p>
              <p className="text-[10px] text-rose-700 font-medium">Impacted</p>
            </div>
          </div>

          {/* SDG Distribution Preview */}
          {dashboardData?.sdgDistribution && dashboardData.sdgDistribution.length > 0 && (
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  SDG Focus Areas
                </h3>
                <button onClick={() => navigate('/sdg-mapping')} className="text-[10px] text-emerald-600 font-medium">
                  View All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dashboardData.sdgDistribution.slice(0, 6).map((sdg) => (
                  <div
                    key={sdg.goal}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-white text-[10px] font-medium"
                    style={{ backgroundColor: getSDGColor(sdg.goal) }}
                  >
                    <span>{sdg.goal}</span>
                    <span className="opacity-80">({sdg.projects})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impact Visualization Button */}
          <button
            onClick={() => navigate('/impact-visualization')}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-4 shadow-lg flex items-center justify-between hover:shadow-xl transition-shadow active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Impact Visualization</p>
                <p className="text-purple-100 text-[10px]">View detailed impact analytics</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* AI Insights Section */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              AI Insights & Suggestions
            </h3>
            <div className="space-y-2">
              {dashboardData?.aiInsights?.slice(0, 3).map((insight) => (
                <div
                  key={insight.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    insight.sentiment === 'positive'
                      ? 'bg-emerald-50 border-emerald-500'
                      : insight.sentiment === 'warning'
                      ? 'bg-amber-50 border-amber-500'
                      : 'bg-slate-50 border-slate-400'
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-800 mb-1">{insight.title}</p>
                  <p className="text-[11px] text-slate-600">{insight.message}</p>
                </div>
              ))}
              {(!dashboardData?.aiInsights || dashboardData.aiInsights.length === 0) && (
                <div className="text-center py-4 text-slate-400">
                  <Lightbulb className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No insights available yet</p>
                  <p className="text-[10px] mt-1">Insights will appear as your projects progress</p>
                </div>
              )}
            </div>
          </div>

          {/* Project Locations Map */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Project Locations
              </h3>
              <button
                onClick={() => setShowMapModal(true)}
                className="text-xs text-emerald-600 font-medium"
              >
                Expand
              </button>
            </div>
            <div className="h-40 rounded-lg overflow-hidden">
              <Suspense fallback={<MapSkeleton />}>
                {dashboardData?.projectLocations && dashboardData.projectLocations.length > 0 ? (
                  <MapContainer
                    center={[0, 20]}
                    zoom={1}
                    style={{ width: '100%', height: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution="&copy; CartoDB"
                    />
                    {dashboardData.projectLocations.map((project) => {
                      const coords = getCoordinatesFromLocation(project.location);
                      if (!coords) return null;
                      const color = project.sdgGoals?.[0] ? SDG_COLORS[project.sdgGoals[0]] : '#10b981';
                      return (
                        <CircleMarker
                          key={project.id}
                          center={[coords.lat, coords.lng]}
                          radius={8}
                          fillColor={color}
                          fillOpacity={0.8}
                          color="#fff"
                          weight={2}
                        >
                          <Popup>
                            <strong>{project.name}</strong>
                            <br />
                            {project.location}
                            <br />
                            Status: {project.status}
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                  </MapContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-100 text-slate-500 text-sm">
                    No project locations available
                  </div>
                )}
              </Suspense>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              {dashboardData?.projectLocations?.length || 0} locations across projects
            </p>
          </div>

          {/* SDG Impact Distribution - Enhanced Section */}
          {dashboardData?.sdgDistribution && dashboardData.sdgDistribution.length > 0 && (
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 border border-slate-200 shadow-lg">
              {/* Header with toggle */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  SDG Impact Distribution
                </h3>
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setSdgViewMode('cards')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                      sdgViewMode === 'cards'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setSdgViewMode('chart')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                      sdgViewMode === 'chart'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <BarChart3 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Summary Stats Row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-500 font-medium">Total SDGs</p>
                  <p className="text-lg font-bold text-teal-600">{dashboardData.sdgDistribution.length}</p>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-500 font-medium">Total Hours</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {dashboardData.sdgDistribution.reduce((sum, s) => sum + (s.hours || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-500 font-medium">Projects</p>
                  <p className="text-lg font-bold text-blue-600">
                    {dashboardData.sdgDistribution.reduce((sum, s) => sum + (s.projects || 0), 0)}
                  </p>
                </div>
              </div>

              {/* Cards View */}
              {sdgViewMode === 'cards' && (
                <div className="space-y-2">
                  {dashboardData.sdgDistribution.slice(0, 6).map((sdg, index) => {
                    const totalHours = dashboardData.sdgDistribution.reduce((sum, s) => sum + (s.hours || 0), 0);
                    const percentage = totalHours > 0 ? Math.round((sdg.hours / totalHours) * 100) : 0;
                    const isTopSDG = index === 0;

                    return (
                      <button
                        key={sdg.goal}
                        onClick={() => setSelectedSdgGoal(sdg.goal)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] ${
                          isTopSDG
                            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 shadow-md'
                            : 'bg-white border border-slate-100 hover:border-slate-200 shadow-sm'
                        }`}
                      >
                        {/* SDG Number Badge */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
                          style={{ backgroundColor: getSDGColor(sdg.goal) }}
                        >
                          {sdg.goal}
                        </div>

                        {/* SDG Info */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {getSDGName(sdg.goal)}
                            </p>
                            {isTopSDG && (
                              <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-bold rounded-full">
                                TOP
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-slate-500">
                              <Clock className="w-3 h-3 inline mr-0.5" />
                              {sdg.hours?.toLocaleString() || 0}h
                            </span>
                            <span className="text-[10px] text-slate-500">
                              <FolderOpen className="w-3 h-3 inline mr-0.5" />
                              {sdg.projects || 0}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              <Users className="w-3 h-3 inline mr-0.5" />
                              {sdg.volunteers || 0}
                            </span>
                          </div>
                        </div>

                        {/* Progress Circle */}
                        <div className="flex flex-col items-center">
                          <div className="relative w-10 h-10">
                            <svg className="w-10 h-10 transform -rotate-90">
                              <circle
                                cx="20"
                                cy="20"
                                r="16"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="3"
                              />
                              <circle
                                cx="20"
                                cy="20"
                                r="16"
                                fill="none"
                                stroke={getSDGColor(sdg.goal)}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={`${percentage * 1.005} 100`}
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-700">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {dashboardData.sdgDistribution.length > 6 && (
                    <button
                      onClick={() => navigate('/sdg-mapping')}
                      className="w-full py-2.5 text-center text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded-xl transition-colors"
                    >
                      View All {dashboardData.sdgDistribution.length} SDGs →
                    </button>
                  )}
                </div>
              )}

              {/* Chart View */}
              {sdgViewMode === 'chart' && (
                <div className="space-y-4">
                  {/* Pie Chart */}
                  <div className="h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboardData.sdgDistribution.slice(0, 8)}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="hours"
                          nameKey="goal"
                          onClick={(data) => setSelectedSdgGoal(data.goal)}
                        >
                          {dashboardData.sdgDistribution.slice(0, 8).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={getSDGColor(entry.goal)}
                              stroke="white"
                              strokeWidth={2}
                              style={{ cursor: 'pointer' }}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-2.5">
                                  <p className="text-xs font-semibold" style={{ color: getSDGColor(data.goal) }}>
                                    SDG {data.goal}: {getSDGName(data.goal)}
                                  </p>
                                  <p className="text-[10px] text-slate-600 mt-1">
                                    {data.hours?.toLocaleString() || 0} hours • {data.projects || 0} projects
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-800">
                          {dashboardData.sdgDistribution.reduce((sum, s) => sum + (s.hours || 0), 0).toLocaleString()}
                        </p>
                        <p className="text-[9px] text-slate-500 font-medium">Total Hours</p>
                      </div>
                    </div>
                  </div>

                  {/* SDG Legend Grid */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {dashboardData.sdgDistribution.slice(0, 8).map((sdg) => (
                      <button
                        key={sdg.goal}
                        onClick={() => setSelectedSdgGoal(sdg.goal)}
                        className="flex flex-col items-center p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: getSDGColor(sdg.goal) }}
                        >
                          {sdg.goal}
                        </div>
                        <span className="text-[8px] text-slate-500 mt-0.5 truncate w-full text-center">
                          {sdg.hours?.toLocaleString() || 0}h
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Project Completion Overview */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Project Completion Overview
            </h3>
            <div className="space-y-3">
              {dashboardData?.projects?.slice(0, 5).map((project) => (
                <div key={project.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{project.name}</p>
                    <div className="mt-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${project.completionPercentage || 0}%`,
                          backgroundColor: project.completionPercentage >= 75 ? '#10b981' :
                                          project.completionPercentage >= 50 ? '#f59e0b' :
                                          project.completionPercentage >= 25 ? '#3b82f6' : '#94a3b8'
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 w-10 text-right">
                    {project.completionPercentage || 0}%
                  </span>
                </div>
              ))}
              {(!dashboardData?.projects || dashboardData.projects.length === 0) && (
                <div className="text-center py-4 text-slate-500 text-sm">
                  No projects to display
                </div>
              )}
            </div>
          </div>

          {/* Active Projects */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Active Projects</h3>
              <button onClick={() => navigate('/projects')} className="text-xs text-emerald-600 font-medium">
                View All →
              </button>
            </div>
            <div className="space-y-2">
              {dashboardData?.projects?.slice(0, 4).map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{project.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${project.completionPercentage || 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">{project.completionPercentage || 0}%</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${
                    project.status?.toLowerCase() === 'active' || project.status?.toLowerCase() === 'in progress'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {project.status}
                  </span>
                </button>
              ))}
              {(!dashboardData?.projects || dashboardData.projects.length === 0) && (
                <div className="text-center py-6 text-slate-500">
                  <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No projects yet</p>
                  <button
                    onClick={() => navigate('/projects?create=true')}
                    className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1 mx-auto"
                  >
                    <Plus className="w-3 h-3" />
                    Create Project
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Volunteer Leaderboard Card */}
          <button
            onClick={() => navigate('/volunteer-leaderboard/pwa')}
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-xl p-4 shadow-lg flex items-center justify-between hover:shadow-xl transition-shadow active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Volunteer Leaderboard</p>
                <p className="text-orange-100 text-[10px]">See top performers & rankings</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => navigate('/projects?create=true')}
              className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-[10px] text-slate-600 font-medium">New Project</span>
            </button>
            <button
              onClick={() => navigate('/organization-messages/pwa')}
              className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-[10px] text-slate-600 font-medium">Messages</span>
            </button>
            <button
              onClick={() => navigate('/volunteers')}
              className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-[10px] text-slate-600 font-medium">Volunteers</span>
            </button>
            <button
              onClick={() => navigate('/volunteer-leaderboard/pwa')}
              className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-[10px] text-slate-600 font-medium">Leaderboard</span>
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] max-w-[428px] mx-auto shadow-lg">
        <div className="flex items-center justify-around py-2 px-1">
          <button
            onClick={() => navigate('/organization-dashboard/pwa')}
            className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 text-emerald-600"
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button
            onClick={() => navigate('/projects')}
            className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <FolderOpen className="w-5 h-5" />
            <span className="text-[10px] font-medium">Projects</span>
          </button>
          <button
            onClick={() => navigate('/overview')}
            className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <Eye className="w-5 h-5" />
            <span className="text-[10px] font-medium">Overview</span>
          </button>
          <button
            onClick={() => navigate('/volunteers')}
            className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium">Volunteers</span>
          </button>
          <button
            onClick={() => navigate('/sdg-mapping')}
            className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <Target className="w-5 h-5" />
            <span className="text-[10px] font-medium">SDGs</span>
          </button>
        </div>
      </nav>

      {/* Expanded Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[400px] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Project Locations</h3>
              <button onClick={() => setShowMapModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-80">
              <Suspense fallback={<MapSkeleton />}>
                {dashboardData?.projectLocations && dashboardData.projectLocations.length > 0 ? (
                  <MapContainer
                    center={[0, 20]}
                    zoom={2}
                    style={{ width: '100%', height: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution="&copy; CartoDB"
                    />
                    {dashboardData.projectLocations.map((project) => {
                      const coords = getCoordinatesFromLocation(project.location);
                      if (!coords) return null;
                      const color = project.sdgGoals?.[0] ? SDG_COLORS[project.sdgGoals[0]] : '#10b981';
                      return (
                        <CircleMarker
                          key={project.id}
                          center={[coords.lat, coords.lng]}
                          radius={10}
                          fillColor={color}
                          fillOpacity={0.8}
                          color="#fff"
                          weight={2}
                        >
                          <Popup>
                            <strong>{project.name}</strong>
                            <br />
                            {project.location}
                            <br />
                            Status: {project.status}
                            {project.sdgGoals?.length > 0 && (
                              <>
                                <br />
                                SDGs: {project.sdgGoals.map(g => getSDGName(g)).join(', ')}
                              </>
                            )}
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                  </MapContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-100 text-slate-500">
                    No project locations available
                  </div>
                )}
              </Suspense>
            </div>
            <div className="p-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-2">
                {dashboardData?.projectLocations?.slice(0, 5).map((project) => (
                  <span key={project.id} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                    {project.location}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SDG Detail Modal */}
      {selectedSdgGoal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div
            ref={sdgModalRef}
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-[428px] max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
          >
            {/* Modal Header */}
            <div
              className="p-4 text-white relative overflow-hidden"
              style={{ backgroundColor: getSDGColor(selectedSdgGoal) }}
            >
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
                <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
              </div>
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-bold">{selectedSdgGoal}</span>
                  </div>
                  <div>
                    <p className="text-white/80 text-[10px] font-medium uppercase tracking-wide">
                      Sustainable Development Goal
                    </p>
                    <h3 className="font-bold text-lg leading-tight mt-0.5">
                      {getSDGName(selectedSdgGoal)}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSdgGoal(null)}
                  className="w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {(() => {
                const sdgData = dashboardData?.sdgDistribution?.find(s => s.goal === selectedSdgGoal);
                const totalHours = dashboardData?.sdgDistribution?.reduce((sum, s) => sum + (s.hours || 0), 0) || 0;
                const percentage = totalHours > 0 ? Math.round(((sdgData?.hours || 0) / totalHours) * 100) : 0;

                return (
                  <div className="space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <Clock className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                        <p className="text-lg font-bold text-slate-800">
                          {sdgData?.hours?.toLocaleString() || 0}
                        </p>
                        <p className="text-[10px] text-slate-500">Hours</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <FolderOpen className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                        <p className="text-lg font-bold text-slate-800">
                          {sdgData?.projects || 0}
                        </p>
                        <p className="text-[10px] text-slate-500">Projects</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <Users className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                        <p className="text-lg font-bold text-slate-800">
                          {sdgData?.volunteers || 0}
                        </p>
                        <p className="text-[10px] text-slate-500">Volunteers</p>
                      </div>
                    </div>

                    {/* Contribution Progress */}
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-slate-700">Contribution Share</p>
                        <p className="text-sm font-bold" style={{ color: getSDGColor(selectedSdgGoal) }}>
                          {percentage}%
                        </p>
                      </div>
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: getSDGColor(selectedSdgGoal)
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">
                        {sdgData?.hours?.toLocaleString() || 0} of {totalHours.toLocaleString()} total hours across all SDGs
                      </p>
                    </div>

                    {/* Related Projects */}
                    {dashboardData?.projects && dashboardData.projects.filter(p => p.sdgGoals?.includes(selectedSdgGoal)).length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5" />
                          Related Projects
                        </h4>
                        <div className="space-y-2">
                          {dashboardData.projects
                            .filter(p => p.sdgGoals?.includes(selectedSdgGoal))
                            .slice(0, 3)
                            .map((project) => (
                              <button
                                key={project.id}
                                onClick={() => {
                                  setSelectedSdgGoal(null);
                                  navigate(`/projects/${project.id}`);
                                }}
                                className="w-full flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors text-left"
                              >
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                  style={{ backgroundColor: getSDGColor(selectedSdgGoal) }}
                                >
                                  <FolderOpen className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-800 truncate">
                                    {project.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-500">
                                      {project.completionPercentage || 0}% complete
                                    </span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                      project.status?.toLowerCase() === 'active'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {project.status}
                                    </span>
                                  </div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-slate-400" />
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setSelectedSdgGoal(null);
                          navigate('/sdg-mapping');
                        }}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                      >
                        View All SDGs
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSdgGoal(null);
                          navigate('/impact-visualization');
                        }}
                        className="flex-1 py-3 text-white rounded-xl text-sm font-medium transition-colors"
                        style={{ backgroundColor: getSDGColor(selectedSdgGoal) }}
                      >
                        View Impact
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
