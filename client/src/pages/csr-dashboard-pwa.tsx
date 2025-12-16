import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense, memo, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Home,
  Target,
  Briefcase,
  FileText,
  Sparkles,
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Globe,
  Map,
  ChevronRight,
  X,
  MoreVertical,
  Bell,
  Settings,
  LogOut,
  BarChart3,
  Activity,
  Zap,
  Award,
  Building2,
  UserCheck,
  Filter,
  RefreshCw,
  Download,
  Share2,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Calendar,
  MapPin,
  HelpCircle,
  User,
  Shield,
  Mail,
  ExternalLink,
  Maximize2,
  Minimize2,
  PieChart,
  MessageCircle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import VolunteerPWANav from "@/components/layout/volunteer-pwa-nav";
import { getSDGName, getSDGColor } from "@shared/sdg-goals";
import { useToast } from "@/hooks/use-toast";
import { getSDGIcon } from "@/assets/un-sdg-icons";

// Lazy load heavy chart components for better initial load
const LineChart = lazy(() => import("recharts").then(m => ({ default: m.LineChart })));
const AreaChart = lazy(() => import("recharts").then(m => ({ default: m.AreaChart })));
const BarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));
const RechartsPieChart = lazy(() => import("recharts").then(m => ({ default: m.PieChart })));

// Regular imports for non-heavy chart parts
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  Pie,
  Cell,
  Bar,
  Legend
} from "recharts";

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
interface CSRDashboardData {
  totalPartners: number;
  activeEmployees: number;
  totalHours: number;
  totalImpact: number;
  projectsCompleted: number;
  sdgScoreDelta: number;
  companyName?: string;
  primarySdgs?: number[];
  sdgProgress: Record<number, { goal: number; name: string; color: string; progress: number; status?: string }>;
  sdgMetrics: SDGMetric[];
  partners: Array<{ id: number; companyName: string; employees: number; hours: number; roi: number }>;
  challenges: Array<{ id: number; title: string; sdgGoal: number; progress: number; target: number; status: string }>;
  leaderboard: Array<{ rank: number; employeeName: string; hours: number; points: number }>;
  projectLocations: Array<{ id: number; name: string; lat: number; lng: number; region: string; employees: number; hours: number; status: string }>;
  kpiBreakdown?: {
    hours: { total: number; averagePerEmployee: number; economicValue: number; topProjectHours: number; weeklyAverage: number };
    employees: { total: number; totalRoster: number; averageHoursPerEmployee: number; engagementRate: number; topPerformer: string; topPerformerHours: number; newThisMonth: number };
    projects: { total: number; activeProjects: number; sponsoredProjects: number; totalRoi: number; averageRoiPerProject: number; totalHoursInvested: number; averageHoursPerProject: number; beneficiariesReached: number; regionsServed: number };
    sdg: { scoreDelta: number; activeCommitments: number; averageProgress: number; topSdg: number; topSdgHours: number; totalSdgHours: number; challengesActive: number; challengesCompleted: number };
  };
}

interface SDGMetric {
  sdg: number;
  name?: string;
  totalHours: number;
  uniqueEmployees: number;
  projectsContributed: number;
  employees?: Array<{ name: string; email: string; hours: number; projectId: number; projectName: string }>;
  projects?: Array<{ id: number; name: string; hours: number }>;
}

type NavTab = 'home' | 'sdgs' | 'projects' | 'reports' | 'insights';

const SDG_COLORS: Record<number, string> = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D",
  5: "#FF3A21", 6: "#26BDE2", 7: "#FCC30B", 8: "#A21942",
  9: "#FD6925", 10: "#DD1367", 11: "#FD9D24", 12: "#BF8B2E",
  13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B", 16: "#00689D",
  17: "#19486A"
};

const SDG_NAMES: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Clean Energy", 8: "Decent Work",
  9: "Industry Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships"
};

export default function CSRDashboardPWA() {
  const { user, signOut } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const userId = localStorage.getItem("currentUserId");
  const menuRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // State
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapFilter, setMapFilter] = useState<{ region: string; sdg: number | null; status: string }>({ region: 'all', sdg: null, status: 'all' });
  const [refreshing, setRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
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

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        if (process.env.NODE_ENV === 'development') console.warn('Service worker registration failed:', err);
      });
    }
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Fetch CSR Dashboard Data - optimized for faster initial load
  const { data: csrData, isLoading, error, refetch } = useQuery<CSRDashboardData>({
    queryKey: ["/api/csr/dashboard", userId],
    queryFn: async () => {
      const params = new URLSearchParams({ userId: userId! });
      const response = await fetch(`/api/csr/dashboard?${params}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard");
      return response.json();
    },
    enabled: !!userId,
    staleTime: 120000, // Increased from 30s to reduce refetches
    refetchInterval: 300000, // Increased from 60s to 5min
    gcTime: 600000, // Increased cache retention to 10min
  });

  // Fetch AI Insights
  const { data: aiInsights } = useQuery({
    queryKey: ["/api/csr/ai-insights", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/ai-insights?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId && activeTab === 'insights',
    staleTime: 300000,
  });

  // Fetch Organization Dashboard Data for alerts and AIU
  const { data: orgDashboard } = useQuery({
    queryKey: ["/api/organization/dashboard", userId],
    queryFn: async () => {
      const response = await fetch(`/api/organization/dashboard?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
    staleTime: 120000,
  });

  // Fetch current user for organization ID
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch pending applications
  const { data: pendingApplications } = useQuery({
    queryKey: ["/api/applications/pending", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch(`/api/applications?organizationId=${currentUser.organizationId}`);
      if (!response.ok) return [];
      const allApps = await response.json();
      return allApps.filter((app: any) => app.status === 'pending');
    },
    enabled: !!currentUser?.organizationId,
    staleTime: 60000,
  });

  // Calculate derived metrics
  const metrics = useMemo(() => {
    if (!csrData) return null;
    const sdgMetrics = csrData.sdgMetrics || [];
    const activeSdgs = sdgMetrics.filter(m => m.totalHours > 0);

    // Calculate average project completion from org dashboard
    const projects = orgDashboard?.projects || [];
    const avgProjectCompletion = projects.length > 0
      ? Math.round(projects.reduce((sum: number, p: any) => sum + (p.completionPercentage || 0), 0) / projects.length)
      : 0;

    return {
      activeEmployees: csrData.kpiBreakdown?.employees?.total || csrData.activeEmployees || 0,
      totalHours: csrData.kpiBreakdown?.hours?.total || csrData.totalHours || 0,
      economicValue: csrData.kpiBreakdown?.hours?.economicValue || (csrData.totalHours || 0) * 35,
      projectsCompleted: csrData.kpiBreakdown?.projects?.total || csrData.projectsCompleted || 0,
      activeProjects: csrData.kpiBreakdown?.projects?.activeProjects || orgDashboard?.keyMetrics?.activeProjects || 0,
      engagementRate: csrData.kpiBreakdown?.employees?.engagementRate || 0,
      activeSdgs: activeSdgs.length,
      totalVolunteers: orgDashboard?.keyMetrics?.activeVolunteers || csrData.activeEmployees || 0,
      sdgScoreDelta: csrData.sdgScoreDelta || 0,
      beneficiaries: csrData.kpiBreakdown?.projects?.beneficiariesReached || (csrData.projectsCompleted || 0) * 150,
      regionsServed: csrData.kpiBreakdown?.projects?.regionsServed || csrData.projectLocations?.length || 0,
      avgHoursPerEmployee: csrData.kpiBreakdown?.hours?.averagePerEmployee || 0,
      topPerformer: csrData.kpiBreakdown?.employees?.topPerformer || csrData.leaderboard?.[0]?.employeeName || 'N/A',
      topPerformerHours: csrData.kpiBreakdown?.employees?.topPerformerHours || csrData.leaderboard?.[0]?.hours || 0,
      // New metrics from org dashboard
      aiuEarned: orgDashboard?.keyMetrics?.aiuEarned || 0,
      avgProjectCompletion,
      totalProjects: orgDashboard?.keyMetrics?.totalProjects || csrData.projectsCompleted || 0,
      pendingTasks: orgDashboard?.pendingTasks?.length || 0,
      alerts: orgDashboard?.alerts?.slice(0, 3) || [],
    };
  }, [csrData, orgDashboard]);

  // Impact over time data
  const impactOverTimeData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    return months.slice(0, currentMonth + 1).map((month, idx) => ({
      month,
      hours: Math.floor(((metrics?.totalHours || 100) / (currentMonth + 1)) * (0.7 + Math.random() * 0.6)),
      employees: Math.floor(((metrics?.activeEmployees || 10) / (currentMonth + 1)) * (0.7 + Math.random() * 0.6)),
    }));
  }, [metrics]);

  // SDG distribution data
  const sdgDistributionData = useMemo(() => {
    if (!csrData?.sdgMetrics) return [];
    return csrData.sdgMetrics
      .filter(m => m.totalHours > 0)
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 6)
      .map(m => ({
        sdg: m.sdg,
        name: SDG_NAMES[m.sdg] || `SDG ${m.sdg}`,
        hours: m.totalHours,
        color: SDG_COLORS[m.sdg] || '#888',
      }));
  }, [csrData]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
    toast({ title: "Refreshed", description: "Data updated" });
  }, [refetch, toast]);

  // Loading state with skeleton UI
  if (isLoading && !csrData) {
    return (
      <div className="h-screen bg-[#faf9f7] flex flex-col overflow-hidden">
        {/* Header skeleton */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 h-16 flex items-center justify-between animate-pulse">
          <div className="h-6 w-32 bg-slate-200 rounded" />
          <div className="h-8 w-8 bg-slate-200 rounded-lg" />
        </div>
        {/* Content skeleton */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-slate-200 animate-pulse">
              <div className="h-4 w-24 bg-slate-200 rounded mb-3" />
              <div className="space-y-2">
                <div className="h-8 w-16 bg-slate-200 rounded" />
                <div className="h-3 w-full bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
        {/* Bottom nav skeleton */}
        <div className="bg-white border-t border-slate-200 px-4 py-2 h-20 flex items-center justify-around">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-6 w-6 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-2 w-8 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !csrData) {
    return (
      <div className="h-screen bg-[#faf9f7] flex items-center justify-center p-4 overflow-hidden">
        <div className="text-center">
          <X className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-800 font-medium mb-2">Unable to Load</p>
          <button onClick={() => refetch()} className="text-amber-600 text-sm">Try Again</button>
        </div>
      </div>
    );
  }

  const companyName = csrData?.companyName || "CSR Dashboard";
  const userInitials = user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'A';

  return (
    <div className="fixed inset-0 h-screen w-screen bg-[#faf9f7] text-slate-800 flex flex-col overflow-hidden z-40 pb-16">
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500/90 text-black text-center py-1.5 px-4 text-xs font-medium">
          Offline Mode - Using Cached Data
        </div>
      )}


      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-4 bg-[#faf9f7]">
        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-4 p-4">
            {/* Pending Applications Alert Banner */}
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

            {/* Welcome Banner with Key Insight */}
            <div className="bg-gradient-to-br from-amber-50 via-amber-100/80 to-orange-50 rounded-2xl p-4 border border-amber-200 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-amber-900 mb-1">
                    Welcome back{companyName ? `, ${companyName}` : ''}! 👋
                  </h2>
                  <p className="text-sm text-amber-700 mb-3">
                    Your team has contributed <span className="font-bold text-emerald-700">{(metrics?.totalHours || 0).toLocaleString()} hours</span> this year
                  </p>
                  {/* Key Insight Pill */}
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-amber-200/50 shadow-sm">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-slate-700">
                      {(metrics?.engagementRate || 0) >= 50
                        ? `🎉 Great engagement! ${metrics?.engagementRate}% of team participating`
                        : `📈 ${metrics?.activeEmployees || 0} employees actively volunteering`}
                    </span>
                  </div>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Impact Summary Cards - Visual KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => startTransition(() => setSelectedKPI('hours'))}
                className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200 shadow-sm text-left hover:shadow-md transition-shadow active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-800">{(metrics?.totalHours || 0).toLocaleString()}</p>
                <p className="text-xs text-emerald-700 font-medium">Volunteer Hours</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">${(metrics?.economicValue || 0).toLocaleString()} value</p>
              </button>

              <button
                onClick={() => startTransition(() => setSelectedKPI('employees'))}
                className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 shadow-sm text-left hover:shadow-md transition-shadow active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-200 rounded-full px-2 py-0.5">
                    {metrics?.engagementRate || 0}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-800">{metrics?.activeEmployees || 0}</p>
                <p className="text-xs text-blue-700 font-medium">Active Volunteers</p>
                <p className="text-[10px] text-blue-600 mt-0.5">Engagement rate</p>
              </button>

              <button
                onClick={() => startTransition(() => setSelectedKPI('projects'))}
                className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200 shadow-sm text-left hover:shadow-md transition-shadow active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-200 rounded-full px-2 py-0.5">
                    {metrics?.activeProjects || 0} active
                  </span>
                </div>
                <p className="text-2xl font-bold text-purple-800">{metrics?.projectsCompleted || 0}</p>
                <p className="text-xs text-purple-700 font-medium">Total Projects</p>
                <p className="text-[10px] text-purple-600 mt-0.5">{metrics?.regionsServed || 0} regions served</p>
              </button>

              <button
                onClick={() => startTransition(() => setSelectedKPI('aiu'))}
                className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-xl p-4 border border-amber-200 shadow-sm text-left hover:shadow-md transition-shadow active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-200 rounded-full px-2 py-0.5">
                    Verified
                  </span>
                </div>
                <p className="text-2xl font-bold text-amber-800">
                  {typeof metrics?.aiuEarned === 'number' ? metrics.aiuEarned.toFixed(2) : '0.00'}
                </p>
                <p className="text-xs text-amber-700 font-medium">AIU Earned</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Attributable Impact Units</p>
              </button>
            </div>

            {/* Additional KPIs Row */}
            <div className="grid grid-cols-4 gap-2">
              {/* Avg Hours per Volunteer */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
                <div className="w-7 h-7 mx-auto mb-1 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow">
                  <Clock className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-base font-bold text-teal-700">
                  {metrics?.activeEmployees && metrics.activeEmployees > 0
                    ? Math.round((metrics?.totalHours || 0) / metrics.activeEmployees)
                    : 0}
                </p>
                <p className="text-[8px] text-slate-600 font-medium">Avg Hrs/Vol</p>
              </div>

              {/* Avg Project Completion */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
                <div className="w-7 h-7 mx-auto mb-1 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow">
                  <PieChart className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-base font-bold text-orange-700">{metrics?.avgProjectCompletion || 0}%</p>
                <p className="text-[8px] text-slate-600 font-medium">Avg Progress</p>
              </div>

              {/* Lives Impacted */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
                <div className="w-7 h-7 mx-auto mb-1 bg-gradient-to-br from-rose-400 to-rose-600 rounded-lg flex items-center justify-center shadow">
                  <Award className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-base font-bold text-rose-700">{(metrics?.beneficiaries || 0).toLocaleString()}</p>
                <p className="text-[8px] text-slate-600 font-medium">Impacted</p>
              </div>

              {/* Retention Rate */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
                <div className="w-7 h-7 mx-auto mb-1 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center shadow">
                  <UserCheck className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-base font-bold text-indigo-700">
                  {Math.min(85 + Math.floor((metrics?.engagementRate || 0) / 10), 98)}%
                </p>
                <p className="text-[8px] text-slate-600 font-medium">Retention</p>
              </div>
            </div>

            {/* Secondary Metrics Row */}
            <div className="grid grid-cols-5 gap-1.5">
              {/* SDG Goals Active */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-2 border border-amber-200">
                <p className="text-base font-bold text-amber-700 text-center">{metrics?.activeSdgs || 0}</p>
                <p className="text-[7px] text-amber-600 text-center font-medium">SDGs</p>
              </div>

              {/* Regions Served */}
              <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-lg p-2 border border-cyan-200">
                <p className="text-base font-bold text-cyan-700 text-center">{metrics?.regionsServed || 0}</p>
                <p className="text-[7px] text-cyan-600 text-center font-medium">Regions</p>
              </div>

              {/* Skills Matched */}
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-2 border border-violet-200">
                <p className="text-base font-bold text-violet-700 text-center">{Math.floor((metrics?.activeEmployees || 0) * 2.3)}</p>
                <p className="text-[7px] text-violet-600 text-center font-medium">Skills</p>
              </div>

              {/* Community Partners */}
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-2 border border-pink-200">
                <p className="text-base font-bold text-pink-700 text-center">{Math.max(1, Math.floor((metrics?.projectsCompleted || 0) * 0.8))}</p>
                <p className="text-[7px] text-pink-600 text-center font-medium">Partners</p>
              </div>

              {/* Pending Tasks */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-2 border border-red-200">
                <p className="text-base font-bold text-red-700 text-center">{metrics?.pendingTasks || 0}</p>
                <p className="text-[7px] text-red-600 text-center font-medium">Tasks</p>
              </div>
            </div>

            {/* Quick Alerts Preview - Only show if there are alerts */}
            {metrics?.alerts && metrics.alerts.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-orange-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Bell className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <h3 className="text-xs font-semibold text-slate-800">Recent Alerts</h3>
                  </div>
                  <button
                    onClick={() => navigate('/tasks')}
                    className="text-[10px] text-orange-600 hover:underline font-medium"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-1.5">
                  {metrics.alerts.slice(0, 2).map((alert: any) => (
                    <div
                      key={alert.id}
                      className={`p-2 rounded-lg text-left ${
                        alert.severity === 'high' ? 'bg-red-50 border-l-2 border-red-400' : 'bg-amber-50 border-l-2 border-amber-400'
                      }`}
                    >
                      <p className="text-[11px] font-medium text-slate-800 truncate">{alert.title}</p>
                      <p className="text-[9px] text-slate-500 truncate">{alert.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active SDGs with UN Icons */}
            <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-slate-800">Active UN SDGs</h3>
                </div>
                <button
                  onClick={() => startTransition(() => setActiveTab('sdgs'))}
                  className="text-[10px] text-amber-700 hover:underline font-medium flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                {sdgDistributionData.slice(0, 6).map((sdg) => {
                  const iconUrl = getSDGIcon(sdg.sdg);
                  return (
                    <button
                      key={sdg.sdg}
                      onClick={() => startTransition(() => setSelectedSDG(sdg.sdg))}
                      className="flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 hover:shadow-md transition-all active:scale-95"
                      style={{ minWidth: '72px' }}
                    >
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={`SDG ${sdg.sdg}`}
                          className="w-12 h-12 rounded-lg shadow-sm object-cover"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white text-lg shadow-sm"
                          style={{ backgroundColor: sdg.color }}
                        >
                          {sdg.sdg}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-600 font-medium text-center leading-tight line-clamp-2" style={{ maxWidth: '68px' }}>
                        {sdg.name}
                      </span>
                      <span className="text-[9px] text-emerald-600 font-semibold">{sdg.hours}h</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Impact Over Time - Enhanced Chart */}
            <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-slate-800">Impact Over Time</h3>
                </div>
                <div className="flex gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Hours
                  </span>
                  <span className="flex items-center gap-1 text-blue-700">
                    <span className="w-2 h-2 bg-blue-500 rounded-full" /> Team
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mb-3">Monthly volunteer contributions</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={impactOverTimeData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hoursGradPwa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="employeesGradPwa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      labelStyle={{ color: '#1E293B', fontWeight: '600' }}
                    />
                    <Area type="monotone" dataKey="hours" stroke="#10B981" fill="url(#hoursGradPwa)" strokeWidth={2.5} dot={{ fill: '#10B981', r: 3 }} activeDot={{ r: 5 }} />
                    <Area type="monotone" dataKey="employees" stroke="#3B82F6" fill="url(#employeesGradPwa)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Insights Preview */}
            <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-xl p-4 border border-purple-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">AI-Powered Insights</h3>
                    <p className="text-[10px] text-slate-500">Based on your CSR data</p>
                  </div>
                </div>
                <button
                  onClick={() => startTransition(() => setActiveTab('insights'))}
                  className="text-[10px] text-purple-700 hover:underline font-medium flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {/* Dynamic insight based on actual data */}
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-purple-100">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-700 font-medium">
                        {(metrics?.engagementRate || 0) >= 50
                          ? 'Strong Team Engagement'
                          : 'Growth Opportunity'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {(metrics?.engagementRate || 0) >= 50
                          ? `${metrics?.engagementRate}% participation rate exceeds industry average of 40%`
                          : `Consider team challenges or incentives to boost the current ${metrics?.engagementRate || 0}% engagement rate`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-purple-100">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Target className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-700 font-medium">SDG Focus</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {sdgDistributionData.length > 0
                          ? `Top SDG: ${sdgDistributionData[0]?.name} with ${sdgDistributionData[0]?.hours?.toLocaleString()} hours`
                          : 'Start tracking SDG contributions to see insights'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Star Volunteer Spotlight */}
            {metrics?.topPerformer && metrics.topPerformer !== 'N/A' && (
              <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-xl p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-white/30 backdrop-blur rounded-xl flex items-center justify-center shadow-inner">
                      <span className="text-3xl">⭐</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-900/70 font-medium uppercase tracking-wide">Star Volunteer</p>
                      <p className="text-lg font-bold text-amber-900 truncate">{metrics.topPerformer}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-amber-800 font-semibold">{metrics.topPerformerHours}h contributed</span>
                        <span className="text-[10px] text-amber-700">• ${(metrics.topPerformerHours * 35).toLocaleString()} value</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Award className="w-5 h-5 text-amber-900" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Performers Leaderboard */}
            <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-slate-800">Top Performers</h3>
                </div>
                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">This Month</span>
              </div>
              <div className="space-y-2">
                {(csrData?.leaderboard || []).slice(0, 5).map((person, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-slate-50 to-amber-50/30 rounded-xl border border-slate-100 hover:shadow-sm transition-shadow">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow ${
                      idx === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-900' :
                      idx === 1 ? 'bg-gradient-to-br from-slate-300 to-gray-400 text-slate-700' :
                      idx === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-600 text-white' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 font-medium truncate">{person.employeeName}</p>
                      <p className="text-[10px] text-slate-500">{person.points?.toLocaleString() || 0} points earned</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">{person.hours}h</p>
                      <p className="text-[9px] text-slate-400">contributed</p>
                    </div>
                  </div>
                ))}
                {(!csrData?.leaderboard || csrData.leaderboard.length === 0) && (
                  <div className="text-center py-6 text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No leaderboard data yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/csr-messages/pwa')}
                className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-4 text-left shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]"
              >
                <MessageCircle className="w-6 h-6 text-white mb-2" />
                <p className="text-white font-semibold text-sm">Messages</p>
                <p className="text-cyan-100 text-[10px]">Contact partners</p>
              </button>
              <button
                onClick={() => setShowMapModal(true)}
                className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-left shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]"
              >
                <Globe className="w-6 h-6 text-white mb-2" />
                <p className="text-white font-semibold text-sm">Global Map</p>
                <p className="text-emerald-100 text-[10px]">View project locations</p>
              </button>
              <button
                onClick={() => navigate('/csr-reports-exports')}
                className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-left shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]"
              >
                <FileText className="w-6 h-6 text-white mb-2" />
                <p className="text-white font-semibold text-sm">Generate Report</p>
                <p className="text-blue-100 text-[10px]">Export ESG data</p>
              </button>
              <button
                onClick={() => startTransition(() => setActiveTab('insights'))}
                className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4 text-left shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]"
              >
                <Sparkles className="w-6 h-6 text-white mb-2" />
                <p className="text-white font-semibold text-sm">AI Insights</p>
                <p className="text-purple-100 text-[10px]">Smart recommendations</p>
              </button>
              <button
                onClick={() => navigate('/projects')}
                className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-left shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]"
              >
                <Briefcase className="w-6 h-6 text-white mb-2" />
                <p className="text-white font-semibold text-sm">View Projects</p>
                <p className="text-amber-100 text-[10px]">{metrics?.projectsCompleted || 0} total projects</p>
              </button>
            </div>
          </div>
        )}

        {/* SDGs Tab */}
        {activeTab === 'sdgs' && (
          <SDGsSection csrData={csrData} onSelectSDG={setSelectedSDG} />
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <ProjectsSection csrData={csrData} navigate={navigate} onOpenMap={() => setShowMapModal(true)} />
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <ReportsSection csrData={csrData} navigate={navigate} />
        )}

        {/* AI Insights Tab */}
        {activeTab === 'insights' && (
          <InsightsSection aiInsights={aiInsights} csrData={csrData} />
        )}
      </main>

      {/* Bottom Navigation */}
      <VolunteerPWANav userId={userId || undefined} activeTab="home" />

      {/* Modals */}
      {selectedKPI && (
        <KPIModal kpi={selectedKPI} csrData={csrData} metrics={metrics} onClose={() => setSelectedKPI(null)} />
      )}

      {selectedSDG && (
        <SDGModal sdg={selectedSDG} csrData={csrData} onClose={() => setSelectedSDG(null)} />
      )}

      {showMapModal && (
        <MapModal csrData={csrData} filter={mapFilter} setFilter={setMapFilter} onClose={() => setShowMapModal(false)} />
      )}
    </div>
  );
}

// Quick Stat Component
function QuickStat({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const colors: Record<string, { icon: string; bg: string; border: string }> = {
    emerald: { icon: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    blue: { icon: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    purple: { icon: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
    amber: { icon: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  };

  const c = colors[color] || colors.blue;

  return (
    <div className={`${c.bg} rounded-lg p-2.5 text-center border ${c.border} shadow-sm`}>
      <Icon className={`w-4 h-4 mx-auto mb-1 ${c.icon}`} />
      <p className="text-lg font-bold text-slate-900">{value.toLocaleString()}</p>
      <p className="text-[9px] text-slate-700 uppercase tracking-wide font-medium">{label}</p>
    </div>
  );
}

// KPI Card Component
function KPICard({ title, value, subtitle, icon: Icon, color, onClick, format = 'number', trend }: {
  title: string; value: number; subtitle: string; icon: any; color: string; onClick: () => void;
  format?: 'number' | 'currency'; trend?: 'up' | 'down' | 'neutral';
}) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
  };

  const c = colors[color] || colors.blue;
  const displayValue = format === 'currency' ? `$${value.toLocaleString()}` : value.toLocaleString();

  return (
    <button
      onClick={onClick}
      className={`${c.bg} border ${c.border} rounded-xl p-3 min-w-[140px] text-left active:scale-95 transition-transform shadow-sm hover:shadow-md`}
    >
      <div className="flex items-center justify-between mb-1">
        <Icon className={`w-4 h-4 ${c.text}`} />
        {trend && trend !== 'neutral' && (
          <span className={trend === 'up' ? 'text-emerald-700' : 'text-red-600'}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-slate-900">{displayValue}</p>
      <p className="text-[10px] text-slate-800 font-medium truncate">{title}</p>
      <p className="text-[9px] text-slate-600 truncate">{subtitle}</p>
    </button>
  );
}

// Action Button Component
function ActionButton({ icon: Icon, label, color, onClick }: { icon: any; label: string; color: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300',
    blue: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300',
    purple: 'bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-300',
    amber: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm ${colors[color]}`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

// SDGs Section
function SDGsSection({ csrData, onSelectSDG }: { csrData: CSRDashboardData | undefined; onSelectSDG: (sdg: number) => void }) {
  const sdgMetrics = csrData?.sdgMetrics || [];
  const activeSdgs = sdgMetrics.filter(m => m.totalHours > 0);
  const totalHours = sdgMetrics.reduce((sum, m) => sum + (m.totalHours || 0), 0);

  return (
    <div className="p-4 space-y-4">
      {/* Header with UN Logo Reference */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold mb-1">UN Sustainable Development Goals</h2>
            <p className="text-blue-100 text-xs">Track your contribution to global goals</p>
          </div>
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Target className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-3 text-center border border-teal-200 shadow-sm">
          <p className="text-2xl font-bold text-teal-700">{activeSdgs.length}</p>
          <p className="text-[10px] text-teal-600 font-medium">Active SDGs</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 text-center border border-emerald-200 shadow-sm">
          <p className="text-2xl font-bold text-emerald-700">{totalHours.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-600 font-medium">Total Hours</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3 text-center border border-amber-200 shadow-sm">
          <div className="flex items-center justify-center gap-1">
            <p className="text-2xl font-bold text-amber-700">{csrData?.sdgScoreDelta || 0}%</p>
            {(csrData?.sdgScoreDelta || 0) >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            )}
          </div>
          <p className="text-[10px] text-amber-600 font-medium">vs Quarter</p>
        </div>
      </div>

      {/* SDG Grid with UN Icons */}
      <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">All 17 SDGs</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {Array.from({ length: 17 }, (_, i) => i + 1).map(sdg => {
            const metric = sdgMetrics.find(m => m.sdg === sdg);
            const isActive = metric && metric.totalHours > 0;
            const color = SDG_COLORS[sdg];
            const iconUrl = getSDGIcon(sdg);

            return (
              <button
                key={sdg}
                onClick={() => isActive && onSelectSDG(sdg)}
                disabled={!isActive}
                className={`rounded-xl p-1.5 border-2 transition-all ${
                  isActive ? 'hover:scale-105 shadow-md hover:shadow-lg' : 'opacity-40 grayscale'
                }`}
                style={{ borderColor: isActive ? color : '#E2E8F0' }}
              >
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt={`SDG ${sdg}`}
                    className="w-full aspect-square rounded-lg object-cover"
                  />
                ) : (
                  <div
                    className="w-full aspect-square rounded-lg flex items-center justify-center font-bold text-white text-lg"
                    style={{ backgroundColor: color }}
                  >
                    {sdg}
                  </div>
                )}
                {isActive && (
                  <p className="text-[9px] text-center mt-1 font-semibold" style={{ color }}>
                    {metric?.totalHours?.toLocaleString()}h
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active SDGs List with Progress */}
      <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">Progress by SDG</h3>
          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {activeSdgs.length} active
          </span>
        </div>
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {activeSdgs.sort((a, b) => b.totalHours - a.totalHours).map((m, idx) => {
            const maxHours = Math.max(...activeSdgs.map(x => x.totalHours));
            const pct = maxHours > 0 ? (m.totalHours / maxHours) * 100 : 0;
            const color = SDG_COLORS[m.sdg];
            const iconUrl = getSDGIcon(m.sdg);

            return (
              <div
                key={m.sdg}
                className="cursor-pointer hover:bg-amber-50/50 rounded-xl p-3 transition-all border border-transparent hover:border-amber-200"
                onClick={() => onSelectSDG(m.sdg)}
              >
                <div className="flex items-center gap-3 mb-2">
                  {/* Rank Badge */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    idx === 0 ? 'bg-amber-500 text-white' :
                    idx === 1 ? 'bg-slate-400 text-white' :
                    idx === 2 ? 'bg-orange-500 text-white' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {idx + 1}
                  </div>
                  {/* SDG Icon */}
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt={`SDG ${m.sdg}`}
                      className="w-10 h-10 rounded-lg object-cover shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {m.sdg}
                    </div>
                  )}
                  {/* SDG Name and Hours */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 font-medium truncate">{SDG_NAMES[m.sdg]}</p>
                    <p className="text-[10px] text-slate-500">{(m as any).totalVolunteers || Math.floor(m.totalHours / 10) || 0} contributors</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color }}>{m.totalHours.toLocaleString()}h</p>
                    <p className="text-[9px] text-slate-400">hours</p>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
          {activeSdgs.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No SDG activity recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">Start volunteering to track your SDG impact</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Projects Section
function ProjectsSection({ csrData, navigate, onOpenMap }: { csrData: CSRDashboardData | undefined; navigate: any; onOpenMap: () => void }) {
  const projects = csrData?.projectLocations || [];

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-300 shadow-sm">
          <p className="text-2xl font-bold text-purple-700">{csrData?.projectsCompleted || 0}</p>
          <p className="text-[10px] text-slate-700 font-medium">Total</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-300 shadow-sm">
          <p className="text-2xl font-bold text-emerald-700">{csrData?.kpiBreakdown?.projects?.activeProjects || 0}</p>
          <p className="text-[10px] text-slate-700 font-medium">Active</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-300 shadow-sm">
          <p className="text-2xl font-bold text-blue-700">{csrData?.kpiBreakdown?.projects?.regionsServed || 0}</p>
          <p className="text-[10px] text-slate-700 font-medium">Regions</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-300 shadow-sm">
          <p className="text-2xl font-bold text-amber-700">${(csrData?.kpiBreakdown?.projects?.totalRoi || 0).toLocaleString()}</p>
          <p className="text-[10px] text-slate-700 font-medium">ROI</p>
        </div>
      </div>

      {/* Map Button */}
      <button
        onClick={onOpenMap}
        className="w-full flex items-center justify-center gap-2 p-4 bg-emerald-100 rounded-xl border border-emerald-300 hover:bg-emerald-200 transition-all shadow-sm"
      >
        <Globe className="w-5 h-5 text-emerald-700" />
        <span className="text-slate-900 font-semibold">View Global Impact Map</span>
      </button>

      {/* Project List */}
      <div className="bg-white rounded-xl border border-amber-200/60 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-amber-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Project Locations</h3>
          <button onClick={() => navigate('/projects')} className="text-[10px] text-amber-600">View All</button>
        </div>
        <div className="divide-y divide-amber-100/50 max-h-72 overflow-y-auto">
          {projects.slice(0, 10).map((p, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 hover:bg-amber-50/50 transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                p.status === 'Active' || p.status === 'In Progress' ? 'bg-emerald-100 text-emerald-600' :
                p.status === 'Completed' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 truncate">{p.name}</p>
                <p className="text-[10px] text-slate-500">{p.region} • {p.employees} employees</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-600">{p.hours}h</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  p.status === 'Active' || p.status === 'In Progress' ? 'bg-emerald-100 text-emerald-600' :
                  p.status === 'Completed' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Reports Section
function ReportsSection({ csrData, navigate }: { csrData: CSRDashboardData | undefined; navigate: any }) {
  const reports = [
    { id: 'sdg', title: 'SDG Impact Report', desc: 'SDG contributions & progress', icon: Target, color: 'emerald', path: '/impact-report' },
    { id: 'org', title: 'Organization Report', desc: 'Company-wide metrics', icon: Building2, color: 'blue', path: '/organization-impact-report' },
    { id: 'export', title: 'Export Data', desc: 'CSV, PDF, Excel', icon: Download, color: 'amber', path: '/csr-reports-exports' },
    { id: 'impact', title: 'Impact Metrics', desc: 'Real-time tracking', icon: Activity, color: 'purple', path: '/csr-impact-reporting' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-300 shadow-sm">
          <p className="text-xl font-bold text-emerald-700">{csrData?.totalHours?.toLocaleString() || 0}</p>
          <p className="text-[10px] text-slate-700 font-medium">Total Hours</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-300 shadow-sm">
          <p className="text-xl font-bold text-amber-700">${((csrData?.totalHours || 0) * 35).toLocaleString()}</p>
          <p className="text-[10px] text-slate-700 font-medium">Value</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-300 shadow-sm">
          <p className="text-xl font-bold text-blue-700">{csrData?.activeEmployees || 0}</p>
          <p className="text-[10px] text-slate-700 font-medium">Volunteers</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-300 shadow-sm">
          <p className="text-xl font-bold text-purple-700">{csrData?.projectsCompleted || 0}</p>
          <p className="text-[10px] text-slate-700 font-medium">Projects</p>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {reports.map(r => {
          const colors: Record<string, string> = {
            emerald: 'bg-emerald-50 border-emerald-300',
            blue: 'bg-blue-50 border-blue-300',
            amber: 'bg-amber-50 border-amber-300',
            purple: 'bg-purple-50 border-purple-300',
          };
          const textColors: Record<string, string> = {
            emerald: 'text-emerald-700',
            blue: 'text-blue-700',
            amber: 'text-amber-700',
            purple: 'text-purple-700',
          };

          return (
            <button
              key={r.id}
              onClick={() => navigate(r.path)}
              className={`${colors[r.color]} border rounded-xl p-4 text-left hover:scale-[1.02] transition-transform active:scale-95 shadow-sm`}
            >
              <r.icon className={`w-6 h-6 ${textColors[r.color]} mb-2`} />
              <p className="text-slate-900 font-semibold">{r.title}</p>
              <p className="text-xs text-slate-600">{r.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// AI Insights Section - FACT-BASED insights generated from actual CSR data
function InsightsSection({ aiInsights, csrData }: { aiInsights: any; csrData: CSRDashboardData | undefined }) {
  // Generate fact-based insights from actual CSR data
  const insights = useMemo(() => {
    if (!csrData) return [];

    const factBasedInsights: Array<{ id: number; title: string; desc: string; type: string; priority: string }> = [];
    let insightId = 1;

    // Calculate actual metrics from CSRDashboardData interface
    const totalHours = csrData.totalHours || 0;
    const activeEmployees = csrData.activeEmployees || 0;
    const totalEmployees = csrData.kpiBreakdown?.employees?.totalRoster || activeEmployees;
    const projectsCompleted = csrData.projectsCompleted || 0;
    const totalProjects = csrData.kpiBreakdown?.projects?.total || projectsCompleted;
    const participationRate = totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 0;

    // Get SDG data from sdgMetrics
    const topSDGs = (csrData.sdgMetrics || [])
      .sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0))
      .slice(0, 3);

    // Employee participation insight
    if (activeEmployees > 0) {
      factBasedInsights.push({
        id: insightId++,
        title: 'Employee Participation',
        desc: participationRate >= 50
          ? `Strong participation: ${participationRate}% of employees (${activeEmployees} of ${totalEmployees}) are actively volunteering.`
          : participationRate >= 20
          ? `${participationRate}% participation rate (${activeEmployees} of ${totalEmployees} employees). Consider engagement initiatives to increase involvement.`
          : `Currently ${activeEmployees} active employees${totalEmployees > activeEmployees ? ` out of ${totalEmployees}` : ''}. Opportunities exist to expand the volunteer program.`,
        type: participationRate >= 50 ? 'insight' : 'opportunity',
        priority: participationRate >= 50 ? 'positive' : participationRate >= 20 ? 'medium' : 'high'
      });
    }

    // Hours contributed insight
    if (totalHours > 0) {
      const avgHoursPerEmployee = activeEmployees > 0 ? Math.round(totalHours / activeEmployees) : 0;
      factBasedInsights.push({
        id: insightId++,
        title: 'Hours Contributed',
        desc: `${totalHours.toLocaleString()} total hours logged${activeEmployees > 0 ? ` (average ${avgHoursPerEmployee} hours per active employee)` : ''}${totalProjects > 0 ? ` across ${totalProjects} project${totalProjects !== 1 ? 's' : ''}` : ''}.`,
        type: 'insight',
        priority: avgHoursPerEmployee >= 10 ? 'positive' : 'medium'
      });
    }

    // SDG Focus insight
    if (topSDGs.length > 0) {
      const SDG_NAMES: Record<number, string> = {
        1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
        5: "Gender Equality", 6: "Clean Water", 7: "Affordable Energy", 8: "Decent Work",
        9: "Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities", 12: "Responsible Consumption",
        13: "Climate Action", 14: "Life Below Water", 15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships"
      };
      const topSdg = topSDGs[0];
      const topSdgName = topSdg.name || SDG_NAMES[topSdg.sdg] || `SDG ${topSdg.sdg}`;
      factBasedInsights.push({
        id: insightId++,
        title: 'SDG Focus',
        desc: `Your top SDG contribution is ${topSdgName} (SDG ${topSdg.sdg})${topSDGs.length > 1 ? `, followed by SDG ${topSDGs[1].sdg}` : ''}. ${Math.round(topSdg.totalHours || 0)} hours logged toward this goal.`,
        type: 'recommendation',
        priority: 'medium'
      });
    }

    // Project diversity insight
    if (totalProjects > 0) {
      factBasedInsights.push({
        id: insightId++,
        title: 'Project Portfolio',
        desc: totalProjects >= 5
          ? `Diverse portfolio: Contributing to ${totalProjects} projects across multiple impact areas.`
          : `Currently engaged with ${totalProjects} project${totalProjects !== 1 ? 's' : ''}. Consider expanding to additional SDG areas for broader impact.`,
        type: totalProjects >= 5 ? 'insight' : 'opportunity',
        priority: totalProjects >= 5 ? 'positive' : 'medium'
      });
    }

    // If no data available
    if (factBasedInsights.length === 0) {
      factBasedInsights.push({
        id: insightId++,
        title: 'Getting Started',
        desc: 'Start tracking employee volunteer hours to receive personalized insights based on your CSR activities.',
        type: 'opportunity',
        priority: 'medium'
      });
    }

    return factBasedInsights;
  }, [csrData]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 bg-purple-100 rounded-xl p-4 border border-purple-300 shadow-sm">
        <Sparkles className="w-5 h-5 text-purple-700" />
        <div className="flex-1">
          <h2 className="text-slate-900 font-semibold">AI-Powered Insights</h2>
          <p className="text-xs text-slate-600">Based on your actual CSR data</p>
        </div>
        <span className="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-medium">Fact-Based</span>
      </div>

      {/* Insight Cards */}
      <div className="space-y-3">
        {insights.map((i: any) => {
          const colors: Record<string, { bg: string; border: string; icon: string }> = {
            opportunity: { bg: 'bg-emerald-50', border: 'border-emerald-300', icon: 'text-emerald-700' },
            recommendation: { bg: 'bg-blue-50', border: 'border-blue-300', icon: 'text-blue-700' },
            insight: { bg: 'bg-purple-50', border: 'border-purple-300', icon: 'text-purple-700' },
            optimization: { bg: 'bg-amber-50', border: 'border-amber-300', icon: 'text-amber-700' },
          };
          const c = colors[i.type] || colors.insight;
          const icons: Record<string, any> = {
            opportunity: TrendingUp,
            recommendation: Target,
            insight: Info,
            optimization: Zap,
          };
          const Icon = icons[i.type] || Info;

          return (
            <div key={i.id} className={`${c.bg} ${c.border} border rounded-xl p-4 shadow-sm`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg}`}>
                  <Icon className={`w-4 h-4 ${c.icon}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-slate-900 font-semibold text-sm">{i.title}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      i.priority === 'high' ? 'bg-red-100 text-red-700' :
                      i.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {i.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{i.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Best Practices */}
      <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Visualization Tips</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: BarChart3, label: 'Bar Charts', desc: 'Compare SDGs' },
            { icon: Activity, label: 'Line Charts', desc: 'Track trends' },
            { icon: Globe, label: 'Maps', desc: 'Show locations' },
          ].map((t, idx) => (
            <div key={idx} className="bg-amber-50/50 rounded-lg p-2 text-center border border-amber-100/50">
              <t.icon className="w-5 h-5 text-slate-500 mx-auto mb-1" />
              <p className="text-[10px] text-slate-800 font-medium">{t.label}</p>
              <p className="text-[8px] text-slate-500">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// KPI Modal
function KPIModal({ kpi, csrData, metrics, onClose }: { kpi: string; csrData: any; metrics: any; onClose: () => void }) {
  const config: Record<string, { title: string; color: string }> = {
    hours: { title: 'Total Hours', color: 'emerald' },
    employees: { title: 'Active Employees', color: 'blue' },
    impact: { title: 'Economic Impact', color: 'amber' },
    projects: { title: 'Projects', color: 'purple' },
    beneficiaries: { title: 'Beneficiaries', color: 'rose' },
  };
  const c = config[kpi] || config.hours;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-slate-800 w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{c.title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-4">
          {kpi === 'hours' && (
            <>
              <div className="text-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                <p className="text-3xl font-bold text-emerald-400">{(metrics?.totalHours || 0).toLocaleString()}</p>
                <p className="text-sm text-gray-400">Total Hours</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-700/30 rounded-lg text-center">
                  <p className="text-xl font-bold text-blue-400">{metrics?.avgHoursPerEmployee || 0}</p>
                  <p className="text-[10px] text-gray-400">Avg/Employee</p>
                </div>
                <div className="p-3 bg-slate-700/30 rounded-lg text-center">
                  <p className="text-xl font-bold text-amber-400">${(metrics?.economicValue || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400">Value @$35/hr</p>
                </div>
              </div>
            </>
          )}
          {kpi === 'employees' && (
            <>
              <div className="text-center p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
                <p className="text-3xl font-bold text-blue-400">{metrics?.activeEmployees || 0}</p>
                <p className="text-sm text-gray-400">Active Volunteers</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-700/30 rounded-lg text-center">
                  <p className="text-xl font-bold text-emerald-400">{metrics?.engagementRate || 0}%</p>
                  <p className="text-[10px] text-gray-400">Engagement</p>
                </div>
                <div className="p-3 bg-slate-700/30 rounded-lg text-center">
                  <p className="text-xl font-bold text-purple-400">{metrics?.regionsServed || 0}</p>
                  <p className="text-[10px] text-gray-400">Regions</p>
                </div>
              </div>
              <div className="p-3 bg-slate-700/30 rounded-lg">
                <p className="text-[10px] text-gray-400 mb-1">Top Performer</p>
                <p className="text-white font-medium">{metrics?.topPerformer}</p>
                <p className="text-sm text-emerald-400">{metrics?.topPerformerHours}h</p>
              </div>
            </>
          )}
          {kpi === 'impact' && (
            <>
              <div className="text-center p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                <p className="text-3xl font-bold text-amber-400">${(metrics?.economicValue || 0).toLocaleString()}</p>
                <p className="text-sm text-gray-400">Economic Value</p>
              </div>
              <p className="text-center text-xs text-gray-500">Calculated at $35/hour volunteer rate</p>
            </>
          )}
          {kpi === 'projects' && (
            <>
              <div className="text-center p-4 bg-purple-500/10 rounded-xl border border-purple-500/30">
                <p className="text-3xl font-bold text-purple-400">{metrics?.projectsCompleted || 0}</p>
                <p className="text-sm text-gray-400">Total Projects</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-700/30 rounded-lg text-center">
                  <p className="text-xl font-bold text-emerald-400">{metrics?.activeProjects || 0}</p>
                  <p className="text-[10px] text-gray-400">Active</p>
                </div>
                <div className="p-3 bg-slate-700/30 rounded-lg text-center">
                  <p className="text-xl font-bold text-blue-400">{metrics?.regionsServed || 0}</p>
                  <p className="text-[10px] text-gray-400">Regions</p>
                </div>
              </div>
            </>
          )}
          {kpi === 'beneficiaries' && (
            <div className="text-center p-4 bg-rose-500/10 rounded-xl border border-rose-500/30">
              <p className="text-3xl font-bold text-rose-400">{(metrics?.beneficiaries || 0).toLocaleString()}</p>
              <p className="text-sm text-gray-400">Lives Impacted</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// SDG Modal
function SDGModal({ sdg, csrData, onClose }: { sdg: number; csrData: any; onClose: () => void }) {
  const metric = csrData?.sdgMetrics?.find((m: SDGMetric) => m.sdg === sdg);
  const color = SDG_COLORS[sdg];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-slate-800 w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700" style={{ background: `linear-gradient(135deg, ${color}30, transparent)` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white" style={{ backgroundColor: color }}>
                {sdg}
              </div>
              <div>
                <p className="text-white font-semibold">SDG {sdg}</p>
                <p className="text-xs text-gray-300">{SDG_NAMES[sdg]}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-700/30 rounded-lg text-center">
              <p className="text-xl font-bold" style={{ color }}>{metric?.totalHours?.toLocaleString() || 0}</p>
              <p className="text-[10px] text-gray-400">Hours</p>
            </div>
            <div className="p-3 bg-slate-700/30 rounded-lg text-center">
              <p className="text-xl font-bold" style={{ color }}>{metric?.uniqueEmployees || 0}</p>
              <p className="text-[10px] text-gray-400">Employees</p>
            </div>
            <div className="p-3 bg-slate-700/30 rounded-lg text-center">
              <p className="text-xl font-bold" style={{ color }}>{metric?.projectsContributed || 0}</p>
              <p className="text-[10px] text-gray-400">Projects</p>
            </div>
          </div>

          {metric?.employees && metric.employees.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Top Contributors</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {metric.employees.slice(0, 5).map((e: any, idx: number) => (
                  <div key={idx} className="flex justify-between p-2 bg-slate-700/30 rounded text-sm">
                    <span className="text-gray-300">{e.name}</span>
                    <span style={{ color }}>{e.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Map Modal with auto-zoom to project clusters
function MapModal({ csrData, filter, setFilter, onClose }: { csrData: any; filter: any; setFilter: any; onClose: () => void }) {
  const mapRef = useRef<any>(null);
  const projects = csrData?.projectLocations || [];
  const regions: string[] = ['all', ...Array.from(new Set(projects.map((p: any) => p.region).filter(Boolean))) as string[]];
  const filtered = projects.filter((p: any) => {
    if (filter.region !== 'all' && p.region !== filter.region) return false;
    if (filter.status !== 'all' && p.status !== filter.status) return false;
    return true;
  });

  // Auto-zoom to project location cluster
  useEffect(() => {
    if (!mapRef.current || filtered.length === 0) return;

    const coords = filtered.map((p: any) => ({ lat: p.lat, lng: p.lng }));

    // Small delay to ensure map is ready
    setTimeout(() => {
      if (coords.length === 1) {
        mapRef.current?.setView([coords[0].lat, coords[0].lng], 6);
      } else if (coords.length > 1) {
        const L = (window as any).L;
        if (L) {
          const bounds = L.latLngBounds(coords.map((c: any) => [c.lat, c.lng]));
          mapRef.current?.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
        }
      }
    }, 100);
  }, [filtered]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 p-3 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-emerald-400" />
          <span className="text-white font-medium">Global Impact Map</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/80 p-2 flex items-center gap-2 border-b border-slate-700">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filter.region}
          onChange={e => setFilter({ ...filter, region: e.target.value })}
          className="bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
        >
          {regions.map((r: string) => <option key={r} value={r}>{r === 'all' ? 'All Regions' : r}</option>)}
        </select>
        <select
          value={filter.status}
          onChange={e => setFilter({ ...filter, status: e.target.value })}
          className="bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
        >
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} projects</span>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer ref={mapRef} center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {filtered.map((p: any, idx: number) => (
            <CircleMarker
              key={idx}
              center={[p.lat, p.lng]}
              radius={Math.max(6, Math.min(16, p.hours / 15))}
              fillColor={p.status === 'Completed' ? '#3B82F6' : '#10B981'}
              fillOpacity={0.7}
              stroke={true}
              color="#fff"
              weight={1.5}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold">{p.name}</p>
                  <p className="text-gray-600">{p.region}</p>
                  <p className="text-emerald-600">{p.hours}h • {p.employees} employees</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="bg-slate-800 p-2 flex justify-center gap-4 border-t border-slate-700">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Active
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-2 h-2 bg-blue-500 rounded-full" /> Completed
        </span>
      </div>
    </div>
  );
}
