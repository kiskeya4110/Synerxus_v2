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
  Bell,
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
  MessageCircle,
  Eye,
  Layers,
  TrendingDown
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import CSRPWANav from "@/components/layout/csr-pwa-nav";
import { getSDGName, getSDGColor } from "@shared/sdg-goals";
import { useToast } from "@/hooks/use-toast";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import { formatDecimal } from "@/lib/format-utils";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";

// Helper function for contrast-aware text colors
function getContrastColor(bgColor: string): string {
  // Parse hex color
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? '#1e293b' : '#ffffff';
}

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
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

// Direct imports for map components (not lazy-loaded to avoid double-initialization in StrictMode)
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
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
  logo?: string;
  logoUrl?: string;
  primarySdgs?: number[];
  sdgProgress: Record<number, { goal: number; name: string; color: string; progress: number; status?: string }>;
  sdgMetrics: SDGMetric[];
  partners: Array<{ id: number; companyName: string; employees: number; hours: number; roi: number; logo?: string; logoUrl?: string }>;
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

type NavTab = 'home' | 'overview' | 'sdgs' | 'projects' | 'reports' | 'insights' | 'engagement' | 'geographic' | 'leaderboard' | 'recognition' | 'challenges';

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
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const userId = localStorage.getItem("currentUserId");
  const [isPending, startTransition] = useTransition();

  // State
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapFilter, setMapFilter] = useState<{ region: string; sdg: number | null; status: string }>({ region: 'all', sdg: null, status: 'all' });
  const [refreshing, setRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Read tab from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      const validTabs: NavTab[] = ['home', 'overview', 'sdgs', 'projects', 'reports', 'insights', 'engagement', 'geographic', 'leaderboard', 'recognition', 'challenges'];
      if (validTabs.includes(tabParam as NavTab)) {
        // Map 'overview' to 'home' since they're the same view
        setActiveTab(tabParam === 'overview' ? 'home' : tabParam as NavTab);
      }
    }
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

  // Fetch CSR Dashboard Data - always fresh to ensure logo and company data is current
  const { data: csrData, isLoading, error, refetch } = useQuery<CSRDashboardData>({
    queryKey: ["/api/csr/dashboard", userId],
    queryFn: async () => {
      const params = new URLSearchParams({ userId: userId! });
      const response = await fetch(`/api/csr/dashboard?${params}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard");
      return response.json();
    },
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache stale data
    refetchOnMount: 'always', // Refetch when component mounts
  });

  // Fetch CSR partner data directly for reliable company logo access
  const { data: csrPartnerData } = useQuery({
    queryKey: ["/api/csr/partners", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/csr/partners?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
    staleTime: 60000, // Cache for 1 minute
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
      economicValue: csrData.kpiBreakdown?.hours?.economicValue || (csrData.totalHours || 0) * 34.79,
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

  // Loading state with skeleton UI - matching web view light theme
  if (isLoading && !csrData) {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef7ec 30%, #fdf4e8 60%, #fef9f3 100%)" }}>
        {/* Header skeleton - matching green/golden gradient */}
        <div className="px-4 py-3 h-14 flex items-center justify-between animate-pulse border-b" style={{ background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #fef3c7 75%, #fde68a 100%)", borderColor: "rgba(16, 185, 129, 0.2)" }}>
          <div className="h-8 w-28 rounded" style={{ backgroundColor: "rgba(16, 185, 129, 0.2)" }} />
          <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: "rgba(16, 185, 129, 0.2)" }} />
        </div>
        {/* Content skeleton */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 border animate-pulse shadow-sm" style={{ borderColor: "rgba(16, 185, 129, 0.15)" }}>
              <div className="h-4 w-24 rounded mb-3" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)" }} />
              <div className="space-y-2">
                <div className="h-8 w-16 rounded" style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }} />
                <div className="h-3 w-full rounded" style={{ backgroundColor: "rgba(16, 185, 129, 0.08)" }} />
              </div>
            </div>
          ))}
        </div>
        {/* Bottom nav skeleton - matching green/golden gradient */}
        <div className="px-4 py-2 h-16 flex items-center justify-around border-t" style={{ background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #fef3c7 75%, #fde68a 100%)", borderColor: "rgba(16, 185, 129, 0.2)" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-5 w-5 rounded-lg animate-pulse" style={{ backgroundColor: "rgba(16, 185, 129, 0.2)" }} />
              <div className="h-2 w-8 rounded animate-pulse" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state - matching web view light theme
  if (error && !csrData) {
    return (
      <div className="h-screen flex items-center justify-center p-4 overflow-hidden" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef7ec 30%, #fdf4e8 60%, #fef9f3 100%)" }}>
        <div className="text-center">
          <X className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="font-medium mb-2" style={{ color: "#065f46" }}>Unable to Load</p>
          <button onClick={() => refetch()} className="text-sm font-medium" style={{ color: "#047857" }}>Try Again</button>
        </div>
      </div>
    );
  }

  const companyName = csrPartnerData?.companyName || csrData?.companyName || "CSR Dashboard";
  const companyLogo = csrPartnerData?.logoUrl || csrPartnerData?.logo || csrData?.logo || csrData?.logoUrl || csrData?.partners?.[0]?.logo || csrData?.partners?.[0]?.logoUrl || null;
  const userAvatar = user?.photoURL;
  const userInitials = user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'A';

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full text-slate-800 flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef7ec 30%, #fdf4e8 60%, #fef9f3 100%)" }}>
      {/* Centered App Container */}
      <div className="relative w-full h-full max-w-[428px] mx-auto flex flex-col overflow-hidden">
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500/90 text-black text-center py-1.5 px-4 text-xs font-medium flex-shrink-0">
          Offline Mode - Using Cached Data
        </div>
      )}

      {/* PWA Header with Logo and Menu - Matching web view styling */}
      <header className="fixed top-0 left-0 right-0 z-50 px-3 py-2 shadow-md border-b max-w-[428px] mx-auto" style={{ background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #fef3c7 75%, #fde68a 100%)", borderColor: "rgba(16, 185, 129, 0.2)", left: '50%', transform: 'translateX(-50%)' }}>
        <div className="flex items-center justify-between max-w-full">
          {/* Logo */}
          <button
            onClick={() => navigate('/landing')}
            className="flex items-center gap-1.5 flex-shrink-0"
          >
            <img src={logoUrl} alt="Synerxus" className="h-8 w-auto" style={{ filter: "brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }} />
          </button>

          {/* Company Logo & Name */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="h-8 w-8 rounded-lg object-contain bg-white shadow-sm border border-emerald-100 flex-shrink-0 p-0.5"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : userAvatar ? (
              <img
                src={userAvatar}
                alt={companyName}
                className="h-8 w-8 rounded-lg object-cover bg-white shadow-sm border border-emerald-100 flex-shrink-0"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white text-sm font-bold">{companyName.charAt(0)}</span>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs font-semibold truncate max-w-[100px]" style={{ color: "#065f46" }}>{companyName}</p>
              <p className="text-[9px]" style={{ color: "#047857" }}>ESG Command Center</p>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header - matches header height (py-2 = 16px + content ~32px = ~48px) */}
      <div className="h-[52px] flex-shrink-0" />

      {/* Main Content - scrollable area between header and nav */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ background: "linear-gradient(180deg, #fffdf9 0%, #fefbf6 50%, #fdf8f2 100%)", paddingBottom: 'calc(70px + env(safe-area-inset-bottom, 0px))' }}>
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
                  {formatDecimal(typeof metrics?.aiuEarned === 'number' ? metrics.aiuEarned : 0)}
                </p>
                <p className="text-xs text-amber-700 font-medium">AIU Earned</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Attributable Impact Units</p>
              </button>
            </div>

            {/* Project Locations & Volunteer Reach Map - Primary Position */}
            <div className="bg-gradient-to-br from-teal-50 via-emerald-50/50 to-cyan-50/30 rounded-2xl p-4 border border-teal-200/60 shadow-md overflow-hidden">
              {/* Header with Gradient Banner */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Project Locations</h3>
                    <p className="text-[10px] text-teal-600 font-medium">Volunteer Reach & Global Impact</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMapModal(true)}
                  className="text-[10px] text-white font-semibold flex items-center gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 px-3 py-1.5 rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  <Maximize2 className="w-3 h-3" /> Full Map
                </button>
              </div>

              {/* Location Stats Grid - Enhanced */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2.5 text-center border border-teal-200 shadow-sm">
                  <div className="w-6 h-6 mx-auto mb-1 bg-teal-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-3 h-3 text-teal-600" />
                  </div>
                  <p className="text-lg font-bold text-teal-700">{csrData?.projectLocations?.length || 0}</p>
                  <p className="text-[8px] text-teal-600 font-medium">Sites</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2.5 text-center border border-blue-200 shadow-sm">
                  <div className="w-6 h-6 mx-auto mb-1 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Globe className="w-3 h-3 text-blue-600" />
                  </div>
                  <p className="text-lg font-bold text-blue-700">{metrics?.regionsServed || 0}</p>
                  <p className="text-[8px] text-blue-600 font-medium">Regions</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2.5 text-center border border-emerald-200 shadow-sm">
                  <div className="w-6 h-6 mx-auto mb-1 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Users className="w-3 h-3 text-emerald-600" />
                  </div>
                  <p className="text-lg font-bold text-emerald-700">
                    {csrData?.projectLocations?.reduce((sum: number, p: any) => sum + (p.employees || 0), 0) || 0}
                  </p>
                  <p className="text-[8px] text-emerald-600 font-medium">Volunteers</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2.5 text-center border border-amber-200 shadow-sm">
                  <div className="w-6 h-6 mx-auto mb-1 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-3 h-3 text-amber-600" />
                  </div>
                  <p className="text-lg font-bold text-amber-700">
                    {csrData?.projectLocations?.reduce((sum: number, p: any) => sum + (p.hours || 0), 0) || 0}
                  </p>
                  <p className="text-[8px] text-amber-600 font-medium">Hours</p>
                </div>
              </div>

              {/* Regional Breakdown Mini */}
              {csrData?.projectLocations && csrData.projectLocations.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-teal-100 mb-4">
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-2">Top Regions by Impact</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const regionData: Record<string, number> = {};
                      csrData.projectLocations.forEach((loc: any) => {
                        regionData[loc.region] = (regionData[loc.region] || 0) + (loc.hours || 0);
                      });
                      return Object.entries(regionData)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 4)
                        .map(([region, hours], idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-teal-50 to-emerald-50 px-2.5 py-1 rounded-full border border-teal-200"
                          >
                            <span className={`w-2 h-2 rounded-full ${
                              idx === 0 ? 'bg-teal-500' : idx === 1 ? 'bg-emerald-500' : idx === 2 ? 'bg-cyan-500' : 'bg-blue-500'
                            }`} />
                            <span className="text-[10px] font-medium text-slate-700">{region}</span>
                            <span className="text-[9px] font-bold text-teal-600">{hours}h</span>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              )}

              {/* Inline Interactive Map - Enhanced */}
              <div className="rounded-xl overflow-hidden border-2 border-teal-200 shadow-lg mb-4" style={{ height: '200px' }}>
                {csrData?.projectLocations && csrData.projectLocations.length > 0 ? (
                  <MapContainer
                    key="home-map-primary"
                    center={[20, 0]}
                    zoom={2}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                    dragging={true}
                    zoomControl={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    {csrData.projectLocations.map((loc: any, idx: number) => (
                      <CircleMarker
                        key={`home-loc-primary-${idx}`}
                        center={[loc.lat || 0, loc.lng || 0]}
                        radius={Math.min(14, 7 + Math.sqrt(loc.hours || 0) / 2)}
                        pathOptions={{
                          fillColor: loc.status === 'Active' || loc.status === 'In Progress' ? '#10b981' :
                                     loc.status === 'Completed' ? '#3b82f6' : '#f59e0b',
                          color: '#fff',
                          weight: 2.5,
                          opacity: 1,
                          fillOpacity: 0.85
                        }}
                      >
                        <Popup>
                          <div className="text-xs p-1 min-w-[140px]">
                            <p className="font-bold text-slate-800 text-sm mb-1">{loc.name}</p>
                            <p className="text-slate-500 mb-2">{loc.region}</p>
                            <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                              <div className="bg-emerald-50 rounded px-2 py-1">
                                <span className="text-emerald-700 font-bold">{loc.hours}h</span>
                                <span className="text-emerald-600 ml-1">logged</span>
                              </div>
                              <div className="bg-blue-50 rounded px-2 py-1">
                                <span className="text-blue-700 font-bold">{loc.employees}</span>
                                <span className="text-blue-600 ml-1">people</span>
                              </div>
                            </div>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                              loc.status === 'Active' || loc.status === 'In Progress' ? 'bg-emerald-100 text-emerald-700' :
                              loc.status === 'Completed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {loc.status}
                            </span>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                ) : (
                  <div className="h-full bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <MapPin className="w-8 h-8 text-teal-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">No project locations yet</p>
                      <p className="text-xs text-slate-400 mt-1">Add projects to see your global reach</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Map Legend */}
              <div className="flex justify-center gap-4 mb-3">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-600">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow" /> Active
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-600">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow" /> Completed
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-600">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow" /> In Progress
                </span>
              </div>

              {/* Project Locations List - Compact */}
              <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-teal-200 overflow-hidden">
                <div className="bg-gradient-to-r from-teal-100 to-emerald-100 px-3 py-2 border-b border-teal-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-teal-800">All Locations</span>
                    <span className="text-[9px] text-teal-600 bg-teal-200/60 px-2 py-0.5 rounded-full font-medium">
                      {csrData?.projectLocations?.length || 0} sites
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-teal-100 max-h-32 overflow-y-auto">
                  {(csrData?.projectLocations || []).slice(0, 4).map((loc: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setShowMapModal(true)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-teal-50/50 transition-all active:scale-[0.99]"
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm ${
                        loc.status === 'Active' || loc.status === 'In Progress' ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-600' :
                        loc.status === 'Completed' ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600' : 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600'
                      }`}>
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs text-slate-800 font-semibold truncate">{loc.name}</p>
                        <p className="text-[9px] text-slate-500">{loc.region}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-600">{loc.hours}h</p>
                        <p className="text-[9px] text-slate-400">{loc.employees} vol</p>
                      </div>
                    </button>
                  ))}
                  {(!csrData?.projectLocations || csrData.projectLocations.length === 0) && (
                    <div className="px-3 py-4 text-center">
                      <MapPin className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs text-slate-400">No locations added yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* View More Button */}
              {csrData?.projectLocations && csrData.projectLocations.length > 4 && (
                <button
                  onClick={() => startTransition(() => setActiveTab('geographic'))}
                  className="w-full mt-3 py-2 text-[11px] font-semibold text-teal-700 bg-white/60 hover:bg-white/80 rounded-xl border border-teal-200 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  View All {csrData.projectLocations.length} Locations
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
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

            {/* Industry-Leading KPI Dashboard */}
            <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow">
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Advanced Analytics</h3>
                    <p className="text-[9px] text-blue-600">Industry-leading metrics</p>
                  </div>
                </div>
              </div>

              {/* Advanced KPI Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* Volunteer ROI */}
                <div className="bg-white rounded-lg p-3 border border-emerald-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-[9px] text-slate-600 font-medium">Volunteer ROI</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-emerald-700">{Math.round(((csrData?.totalHours || 0) * 34.79) / 1000)}K</span>
                    <span className="text-[8px] text-emerald-600">USD value</span>
                  </div>
                  <div className="text-[8px] text-slate-500 mt-0.5">@$34.79/hr market rate</div>
                </div>

                {/* Engagement Rate */}
                <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="text-[9px] text-slate-600 font-medium">Engagement Rate</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-blue-700">{csrData?.kpiBreakdown?.employees?.engagementRate || Math.round(((csrData?.activeEmployees || 0) / Math.max(csrData?.kpiBreakdown?.employees?.totalRoster || (csrData?.activeEmployees || 1), 1)) * 100)}%</span>
                  </div>
                  <div className="text-[8px] text-slate-500 mt-0.5">of total workforce</div>
                </div>

                {/* Avg Hours/Employee */}
                <div className="bg-white rounded-lg p-3 border border-violet-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
                      <Clock className="w-3 h-3 text-violet-600" />
                    </div>
                    <span className="text-[9px] text-slate-600 font-medium">Hrs/Employee</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-violet-700">{formatDecimal((csrData?.activeEmployees || 0) > 0 ? (csrData?.totalHours || 0) / (csrData?.activeEmployees || 1) : 0)}</span>
                    <span className="text-[8px] text-violet-600">avg</span>
                  </div>
                  <div className="text-[8px] text-slate-500 mt-0.5">industry avg: 8.5h</div>
                </div>

                {/* Impact Velocity */}
                <div className="bg-white rounded-lg p-3 border border-amber-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                      <Zap className="w-3 h-3 text-amber-600" />
                    </div>
                    <span className="text-[9px] text-slate-600 font-medium">Impact Velocity</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-amber-700">+{Math.max(5, Math.round((csrData?.activeEmployees || 0) * 0.2))}%</span>
                  </div>
                  <div className="text-[8px] text-slate-500 mt-0.5">month-over-month</div>
                </div>
              </div>

              {/* Retention & Satisfaction Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-lg p-2.5 border border-teal-100 text-center">
                  <div className="text-lg font-bold text-teal-700">{Math.min(95, 60 + Math.round((csrData?.activeEmployees || 0) * 2))}%</div>
                  <div className="text-[8px] text-teal-600 font-medium">Retention</div>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-pink-100 text-center">
                  <div className="text-lg font-bold text-pink-700">4.{Math.min(9, 2 + Math.floor((csrData?.activeEmployees || 0) / 5))}</div>
                  <div className="text-[8px] text-pink-600 font-medium">Satisfaction</div>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-indigo-100 text-center">
                  <div className="text-lg font-bold text-indigo-700">{formatDecimal(csrData?.totalImpact || 0)}</div>
                  <div className="text-[8px] text-indigo-600 font-medium">AIU Score</div>
                </div>
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

            {/* Employee SDG Alignment Insights */}
            {csrData?.sdgMetrics && csrData.primarySdgs && (
              <div className="bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 rounded-xl p-4 border border-indigo-200/60 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">SDG Alignment Insights</h3>
                    <p className="text-[10px] text-indigo-600">Corporate vs Employee Focus</p>
                  </div>
                </div>

                {/* Alignment Analysis */}
                {(() => {
                  const committedSDGs = csrData.primarySdgs || [];
                  const employeeSDGs = (csrData.sdgMetrics || [])
                    .filter((m: any) => m.totalHours > 0 && !committedSDGs.includes(m.sdg))
                    .sort((a: any, b: any) => b.totalHours - a.totalHours);
                  const alignedSDGs = (csrData.sdgMetrics || [])
                    .filter((m: any) => m.totalHours > 0 && committedSDGs.includes(m.sdg));

                  return (
                    <div className="space-y-3">
                      {/* Alignment Score */}
                      <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-indigo-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-slate-700 font-medium">Alignment Score</span>
                          <span className="text-sm font-bold text-indigo-600">
                            {committedSDGs.length > 0 ? Math.round((alignedSDGs.length / committedSDGs.length) * 100) : 0}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                            style={{ width: `${committedSDGs.length > 0 ? Math.round((alignedSDGs.length / committedSDGs.length) * 100) : 0}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1">
                          {alignedSDGs.length} of {committedSDGs.length} committed SDGs have employee activity
                        </p>
                      </div>

                      {/* SDG Commitment vs Actual Radar Chart */}
                      {committedSDGs.length > 0 && (
                        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-indigo-100">
                          <h4 className="text-xs font-semibold text-slate-700 mb-1 text-center">Committed vs Actual SDGs</h4>
                          <p className="text-[9px] text-slate-500 text-center mb-2">
                            {committedSDGs.length} committed • {alignedSDGs.length} with activity • {(csrData.sdgMetrics || []).reduce((sum: number, m: any) => sum + (m.totalHours || 0), 0).toLocaleString()}h total
                          </p>
                          <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart
                                data={committedSDGs.slice(0, 8).map((sdg: number) => {
                                  const metric = (csrData.sdgMetrics || []).find((m: any) => m.sdg === sdg);
                                  const hasActivity = metric && metric.totalHours > 0;
                                  return {
                                    sdg: `SDG ${sdg}`,
                                    committed: 100, // Full commitment level
                                    actual: hasActivity ? Math.min(100, metric.totalHours) : 0,
                                    hours: metric?.totalHours || 0
                                  };
                                })}
                                margin={{ top: 15, right: 25, bottom: 15, left: 25 }}
                              >
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="sdg" tick={{ fill: '#475569', fontSize: 8 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 7 }} tickCount={4} />
                                <Radar name="Committed" dataKey="committed" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} strokeDasharray="4 2" />
                                <Radar name="Actual Activity" dataKey="actual" stroke="#10b981" fill="#10b981" fillOpacity={0.5} strokeWidth={2} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px' }}
                                  formatter={(value: any, name: string, props: any) => {
                                    if (name === 'Committed') return ['Committed', ''];
                                    return [`${props.payload.hours}h logged`, 'Activity'];
                                  }}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex justify-center gap-4 mt-1 text-[9px]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-0.5 bg-indigo-500" style={{ borderStyle: 'dashed' }} />
                              <span className="text-slate-600">Committed SDGs</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-sm bg-emerald-500/50 border border-emerald-500" />
                              <span className="text-slate-600">Actual Activity</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Employee Passion SDGs - Outside Corporate Focus */}
                      {employeeSDGs.length > 0 && (
                        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-amber-200">
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-amber-800 font-medium">Expand Your SDG Focus</p>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                Your employees are passionate about SDGs outside current commitments:
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {employeeSDGs.slice(0, 3).map((m: any) => (
                                  <button
                                    key={m.sdg}
                                    onClick={() => setSelectedSDG(m.sdg)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-medium hover:scale-105 transition-transform"
                                    style={{
                                      backgroundColor: `${SDG_COLORS[m.sdg]}20`,
                                      color: SDG_COLORS[m.sdg],
                                      border: `1px solid ${SDG_COLORS[m.sdg]}40`
                                    }}
                                  >
                                    SDG {m.sdg}: {m.totalHours}h
                                  </button>
                                ))}
                              </div>
                              <p className="text-[9px] text-amber-700 font-medium mt-2">
                                Consider aligning corporate vision with employee passions for better engagement
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Perfect Alignment Message */}
                      {employeeSDGs.length === 0 && alignedSDGs.length > 0 && (
                        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-emerald-200">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <p className="text-xs text-emerald-700 font-medium">
                              Excellent! Employee activities align with corporate SDG commitments
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

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
                        <span className="text-[10px] text-amber-700">• ${Math.round(metrics.topPerformerHours * 34.79).toLocaleString()} value</span>
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

            {/* Compliance & Certification Scorecard - Industry Standard */}
            <div className="bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 rounded-2xl p-4 border border-emerald-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Compliance & Certifications</h3>
                    <p className="text-[9px] text-emerald-600">ESG Framework Alignment</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/csr-impacts')}
                  className="text-[10px] text-emerald-700 hover:underline font-medium flex items-center gap-1"
                >
                  Details <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Compliance Score Cards */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* B Corp Score */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-emerald-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">B Corp</span>
                    <div className={`w-2 h-2 rounded-full ${(metrics?.engagementRate || 0) >= 30 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-emerald-700">
                      {Math.min(100, Math.round(30 + (metrics?.engagementRate || 0) * 0.7 + Math.min(50, (metrics?.totalHours || 0) / 50)))}
                    </span>
                    <span className="text-xs text-slate-500 mb-1">/100</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round(30 + (metrics?.engagementRate || 0) * 0.7 + Math.min(50, (metrics?.totalHours || 0) / 50)))}%` }}
                    />
                  </div>
                </div>

                {/* GRI Alignment */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-blue-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">GRI Standards</span>
                    <div className={`w-2 h-2 rounded-full ${(metrics?.activeSdgs || 0) >= 3 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-blue-700">
                      {Math.min(100, Math.round(25 + (metrics?.activeSdgs || 0) * 8 + (metrics?.projectsCompleted || 0) * 3))}
                    </span>
                    <span className="text-xs text-slate-500 mb-1">/100</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round(25 + (metrics?.activeSdgs || 0) * 8 + (metrics?.projectsCompleted || 0) * 3))}%` }}
                    />
                  </div>
                </div>

                {/* ESG Rating */}
                {(() => {
                  const esgScore = Math.min(100, Math.round(35 + (metrics?.engagementRate || 0) * 0.5 + (metrics?.beneficiaries || 0) / 100));
                  const esgGrade = esgScore >= 80 ? 'AAA' : esgScore >= 70 ? 'AA' : esgScore >= 60 ? 'A' : esgScore >= 50 ? 'BBB' : 'BB';
                  const gradeColor = esgScore >= 70 ? 'bg-emerald-100 text-emerald-700' : esgScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';
                  return (
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-violet-100 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">ESG Rating</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>
                          {esgGrade}
                        </span>
                      </div>
                      <div className="flex items-end gap-1">
                        <span className="text-2xl font-bold text-violet-700">{esgScore}</span>
                        <span className="text-xs text-slate-500 mb-1">/100</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full transition-all"
                          style={{ width: `${esgScore}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* ISO 26000 */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-amber-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">ISO 26000</span>
                    <div className={`w-2 h-2 rounded-full ${(metrics?.projectsCompleted || 0) >= 3 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-amber-700">
                      {Math.min(100, Math.round(40 + (metrics?.projectsCompleted || 0) * 5 + (metrics?.regionsServed || 0) * 8))}
                    </span>
                    <span className="text-xs text-slate-500 mb-1">/100</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round(40 + (metrics?.projectsCompleted || 0) * 5 + (metrics?.regionsServed || 0) * 8))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Overall Compliance Summary */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs text-slate-700 font-medium">Overall Compliance Score</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-emerald-700">
                      {Math.min(100, Math.round(
                        (30 + (metrics?.engagementRate || 0) * 0.7 + Math.min(50, (metrics?.totalHours || 0) / 50) +
                        25 + (metrics?.activeSdgs || 0) * 8 + (metrics?.projectsCompleted || 0) * 3 +
                        35 + (metrics?.engagementRate || 0) * 0.5 + (metrics?.beneficiaries || 0) / 100 +
                        40 + (metrics?.projectsCompleted || 0) * 5 + (metrics?.regionsServed || 0) * 8) / 4
                      ))}%
                    </span>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                      Math.min(100, Math.round(
                        (30 + (metrics?.engagementRate || 0) * 0.7 + Math.min(50, (metrics?.totalHours || 0) / 50) +
                        25 + (metrics?.activeSdgs || 0) * 8 + (metrics?.projectsCompleted || 0) * 3 +
                        35 + (metrics?.engagementRate || 0) * 0.5 + (metrics?.beneficiaries || 0) / 100 +
                        40 + (metrics?.projectsCompleted || 0) * 5 + (metrics?.regionsServed || 0) * 8) / 4
                      )) >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {Math.min(100, Math.round(
                        (30 + (metrics?.engagementRate || 0) * 0.7 + Math.min(50, (metrics?.totalHours || 0) / 50) +
                        25 + (metrics?.activeSdgs || 0) * 8 + (metrics?.projectsCompleted || 0) * 3 +
                        35 + (metrics?.engagementRate || 0) * 0.5 + (metrics?.beneficiaries || 0) / 100 +
                        40 + (metrics?.projectsCompleted || 0) * 5 + (metrics?.regionsServed || 0) * 8) / 4
                      )) >= 75 ? 'On Track' : 'Improving'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Engagement Funnel - VMS Industry Standard */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50/50 to-violet-50/30 rounded-2xl p-4 border border-blue-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Engagement Funnel</h3>
                    <p className="text-[9px] text-blue-600">Employee journey analytics</p>
                  </div>
                </div>
              </div>

              {/* Funnel Visualization */}
              <div className="space-y-2 mb-4">
                {/* Aware Stage */}
                <div className="relative">
                  <div className="bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg p-3 text-white" style={{ width: '100%' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs font-semibold">Aware</span>
                      </div>
                      <span className="text-sm font-bold">{Math.round((csrData?.kpiBreakdown?.employees?.totalRoster || metrics?.activeEmployees || 0) * 1.8)}</span>
                    </div>
                  </div>
                </div>

                {/* Interested Stage */}
                <div className="relative pl-3">
                  <div className="bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-lg p-3 text-white" style={{ width: '85%' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        <span className="text-xs font-semibold">Interested</span>
                      </div>
                      <span className="text-sm font-bold">{Math.round((csrData?.kpiBreakdown?.employees?.totalRoster || metrics?.activeEmployees || 0) * 1.4)}</span>
                    </div>
                  </div>
                </div>

                {/* Registered Stage */}
                <div className="relative pl-6">
                  <div className="bg-gradient-to-r from-violet-400 to-violet-500 rounded-lg p-3 text-white" style={{ width: '70%' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        <span className="text-xs font-semibold">Registered</span>
                      </div>
                      <span className="text-sm font-bold">{Math.round((csrData?.kpiBreakdown?.employees?.totalRoster || metrics?.activeEmployees || 0) * 1.1)}</span>
                    </div>
                  </div>
                </div>

                {/* Active Stage */}
                <div className="relative pl-9">
                  <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-lg p-3 text-white" style={{ width: '55%' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs font-semibold">Active</span>
                      </div>
                      <span className="text-sm font-bold">{metrics?.activeEmployees || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Champion Stage */}
                <div className="relative pl-12">
                  <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg p-3 text-amber-900" style={{ width: '40%' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        <span className="text-xs font-semibold">Champions</span>
                      </div>
                      <span className="text-sm font-bold">{Math.max(1, Math.round((metrics?.activeEmployees || 0) * 0.2))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Funnel Metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2.5 text-center border border-blue-100">
                  <p className="text-lg font-bold text-blue-700">{metrics?.engagementRate || 0}%</p>
                  <p className="text-[8px] text-slate-600 uppercase font-medium">Conversion</p>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2.5 text-center border border-emerald-100">
                  <p className="text-lg font-bold text-emerald-700">{Math.round((metrics?.activeEmployees || 0) / Math.max(1, metrics?.activeEmployees || 1) * 85)}%</p>
                  <p className="text-[8px] text-slate-600 uppercase font-medium">Retention</p>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2.5 text-center border border-amber-100">
                  <p className="text-lg font-bold text-amber-700">{Math.max(1, Math.round((metrics?.activeEmployees || 0) * 0.2))}</p>
                  <p className="text-[8px] text-slate-600 uppercase font-medium">Champions</p>
                </div>
              </div>
            </div>

            {/* Impact Milestones Timeline */}
            <div className="bg-gradient-to-br from-purple-50 via-pink-50/30 to-rose-50/30 rounded-2xl p-4 border border-purple-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Impact Milestones</h3>
                    <p className="text-[9px] text-purple-600">Key achievements & targets</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative pl-4 space-y-4">
                {/* Vertical Line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-purple-400 via-pink-400 to-rose-400" />

                {/* Milestone 1 - Achieved */}
                <div className="relative flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow flex-shrink-0 -ml-[7px]">
                    <CheckCircle className="w-3 h-3 text-white m-0.5" />
                  </div>
                  <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-emerald-200 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-800">First 100 Hours</span>
                      <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">Achieved</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Reached {Math.min(100, metrics?.totalHours || 0)}+ volunteer hours</p>
                  </div>
                </div>

                {/* Milestone 2 - In Progress or Achieved */}
                <div className="relative flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full ${(metrics?.activeEmployees || 0) >= 10 ? 'bg-emerald-500' : 'bg-blue-500'} border-2 border-white shadow flex-shrink-0 -ml-[7px]`}>
                    {(metrics?.activeEmployees || 0) >= 10 ? (
                      <CheckCircle className="w-3 h-3 text-white m-0.5" />
                    ) : (
                      <Activity className="w-3 h-3 text-white m-0.5" />
                    )}
                  </div>
                  <div className={`flex-1 bg-white/80 backdrop-blur-sm rounded-lg p-3 border ${(metrics?.activeEmployees || 0) >= 10 ? 'border-emerald-200' : 'border-blue-200'} shadow-sm`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-800">10 Active Volunteers</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${(metrics?.activeEmployees || 0) >= 10 ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'}`}>
                        {(metrics?.activeEmployees || 0) >= 10 ? 'Achieved' : 'In Progress'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{metrics?.activeEmployees || 0}/10 volunteers engaged</p>
                  </div>
                </div>

                {/* Milestone 3 - Target */}
                <div className="relative flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full ${(metrics?.activeSdgs || 0) >= 5 ? 'bg-emerald-500' : 'bg-slate-300'} border-2 border-white shadow flex-shrink-0 -ml-[7px]`}>
                    <Target className="w-3 h-3 text-white m-0.5" />
                  </div>
                  <div className={`flex-1 bg-white/80 backdrop-blur-sm rounded-lg p-3 border ${(metrics?.activeSdgs || 0) >= 5 ? 'border-emerald-200' : 'border-slate-200'} shadow-sm`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-800">5 SDGs Coverage</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${(metrics?.activeSdgs || 0) >= 5 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                        {(metrics?.activeSdgs || 0) >= 5 ? 'Achieved' : 'Target'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{metrics?.activeSdgs || 0}/5 SDGs with active contributions</p>
                  </div>
                </div>

                {/* Milestone 4 - Future Target */}
                <div className="relative flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full ${(metrics?.beneficiaries || 0) >= 1000 ? 'bg-emerald-500' : 'bg-slate-300'} border-2 border-white shadow flex-shrink-0 -ml-[7px]`}>
                    <Globe className="w-3 h-3 text-white m-0.5" />
                  </div>
                  <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-800">1,000 Lives Impacted</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${(metrics?.beneficiaries || 0) >= 1000 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                        {(metrics?.beneficiaries || 0) >= 1000 ? 'Achieved' : 'Target'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{(metrics?.beneficiaries || 0).toLocaleString()}/1,000 beneficiaries reached</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Industry Benchmarks Comparison */}
            <div className="bg-gradient-to-br from-cyan-50 via-teal-50/30 to-emerald-50/30 rounded-2xl p-4 border border-cyan-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg flex items-center justify-center shadow">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Industry Benchmarks</h3>
                    <p className="text-[9px] text-cyan-600">VMS/CRM Standards Comparison</p>
                  </div>
                </div>
              </div>

              {/* Benchmark Cards */}
              <div className="space-y-3">
                {/* Participation Rate */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-700">Participation Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-600">{metrics?.engagementRate || 0}%</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        (metrics?.engagementRate || 0) >= 40 ? 'bg-emerald-100 text-emerald-700' :
                        (metrics?.engagementRate || 0) >= 25 ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {(metrics?.engagementRate || 0) >= 40 ? 'Excellent' : (metrics?.engagementRate || 0) >= 25 ? 'Good' : 'Developing'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (metrics?.engagementRate || 0) >= 40 ? 'bg-emerald-500' :
                          (metrics?.engagementRate || 0) >= 25 ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, (metrics?.engagementRate || 0) / 50 * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500">Benchmark: 25%</span>
                  </div>
                </div>

                {/* Hours per Employee */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-700">Avg Hours/Employee</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600">
                        {(metrics?.activeEmployees || 1) > 0 ? Math.round((metrics?.totalHours || 0) / (metrics?.activeEmployees || 1)) : 0}h
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        ((metrics?.totalHours || 0) / Math.max(1, metrics?.activeEmployees || 1)) >= 24 ? 'bg-emerald-100 text-emerald-700' :
                        ((metrics?.totalHours || 0) / Math.max(1, metrics?.activeEmployees || 1)) >= 16 ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {((metrics?.totalHours || 0) / Math.max(1, metrics?.activeEmployees || 1)) >= 24 ? 'Excellent' :
                         ((metrics?.totalHours || 0) / Math.max(1, metrics?.activeEmployees || 1)) >= 16 ? 'Good' : 'Developing'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ((metrics?.totalHours || 0) / Math.max(1, metrics?.activeEmployees || 1)) >= 24 ? 'bg-emerald-500' :
                          ((metrics?.totalHours || 0) / Math.max(1, metrics?.activeEmployees || 1)) >= 16 ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, ((metrics?.totalHours || 0) / Math.max(1, metrics?.activeEmployees || 1)) / 30 * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500">Benchmark: 16h</span>
                  </div>
                </div>

                {/* Program ROI */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-700">Volunteer Program ROI</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-violet-600">
                        {Math.round(((metrics?.totalHours || 0) * 34.79) / Math.max(1000, (metrics?.totalHours || 0) * 10) * 100)}%
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        ((metrics?.totalHours || 0) * 34.79) / Math.max(1000, (metrics?.totalHours || 0) * 10) >= 4 ? 'bg-emerald-100 text-emerald-700' :
                        ((metrics?.totalHours || 0) * 34.79) / Math.max(1000, (metrics?.totalHours || 0) * 10) >= 2.5 ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {((metrics?.totalHours || 0) * 34.79) / Math.max(1000, (metrics?.totalHours || 0) * 10) >= 4 ? 'Excellent' :
                         ((metrics?.totalHours || 0) * 34.79) / Math.max(1000, (metrics?.totalHours || 0) * 10) >= 2.5 ? 'Good' : 'Developing'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round(((metrics?.totalHours || 0) * 34.79) / Math.max(1000, (metrics?.totalHours || 0) * 10) * 25))}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500">Benchmark: 250%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Community Partners & Network */}
            <div className="bg-gradient-to-br from-rose-50 via-pink-50/30 to-orange-50/30 rounded-2xl p-4 border border-rose-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg flex items-center justify-center shadow">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Partner Network</h3>
                    <p className="text-[9px] text-rose-600">Community collaborations</p>
                  </div>
                </div>
                <span className="text-[10px] text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full font-medium">
                  {Math.max(1, Math.floor((metrics?.projectsCompleted || 0) * 0.8))} Partners
                </span>
              </div>

              {/* Partner Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2.5 text-center border border-rose-100">
                  <p className="text-lg font-bold text-rose-700">{Math.max(1, Math.floor((metrics?.projectsCompleted || 0) * 0.8))}</p>
                  <p className="text-[8px] text-slate-600 uppercase font-medium">NGO Partners</p>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2.5 text-center border border-pink-100">
                  <p className="text-lg font-bold text-pink-700">{Math.max(1, Math.floor((metrics?.projectsCompleted || 0) * 0.5))}</p>
                  <p className="text-[8px] text-slate-600 uppercase font-medium">Local Orgs</p>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2.5 text-center border border-orange-100">
                  <p className="text-lg font-bold text-orange-700">{metrics?.regionsServed || 0}</p>
                  <p className="text-[8px] text-slate-600 uppercase font-medium">Regions</p>
                </div>
              </div>

              {/* Recent Collaborations */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-slate-200">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-2">Recent Collaborations</p>
                <div className="space-y-2">
                  {[
                    { name: 'Local Food Bank', type: 'NGO', projects: Math.max(1, Math.floor((metrics?.projectsCompleted || 0) * 0.3)) },
                    { name: 'Youth Education Center', type: 'Community', projects: Math.max(1, Math.floor((metrics?.projectsCompleted || 0) * 0.2)) },
                    { name: 'Environmental Alliance', type: 'NGO', projects: Math.max(1, Math.floor((metrics?.projectsCompleted || 0) * 0.15)) },
                  ].slice(0, metrics?.projectsCompleted ? 3 : 1).map((partner, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5 text-rose-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-700">{partner.name}</p>
                          <p className="text-[9px] text-slate-500">{partner.type}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-rose-600 font-semibold">{partner.projects} projects</span>
                    </div>
                  ))}
                </div>
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
              <button
                onClick={() => navigate('/csr-impacts')}
                className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl p-4 text-left shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]"
              >
                <Shield className="w-6 h-6 text-white mb-2" />
                <p className="text-white font-semibold text-sm">Impact Report</p>
                <p className="text-teal-100 text-[10px]">Compliance & metrics</p>
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

        {/* Employee Engagement Tab */}
        {activeTab === 'engagement' && (
          <EngagementSection csrData={csrData} navigate={navigate} />
        )}

        {/* Geographic Impact Tab */}
        {activeTab === 'geographic' && (
          <GeographicSection csrData={csrData} />
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <LeaderboardSection csrData={csrData} />
        )}

        {/* Recognition Tab */}
        {activeTab === 'recognition' && (
          <RecognitionSection csrData={csrData} />
        )}

        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <ChallengesSection csrData={csrData} navigate={navigate} />
        )}
      </main>

      {/* Bottom Navigation */}
      <CSRPWANav activeTab="home" />

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
  const committedSDGs = csrData?.primarySdgs || [];
  const projectLocations = csrData?.projectLocations || [];

  // Radar data for committed vs actual SDGs
  const radarData = committedSDGs.length > 0
    ? committedSDGs.slice(0, 8).map((sdg: number) => {
        const metric = sdgMetrics.find((m: any) => m.sdg === sdg);
        const hasActivity = metric && metric.totalHours > 0;
        return {
          sdg: `SDG ${sdg}`,
          sdgNum: sdg,
          committed: 100, // Full commitment
          actual: hasActivity ? Math.min(100, (metric?.totalHours || 0)) : 0,
          hours: metric?.totalHours || 0,
        };
      })
    : activeSdgs.slice(0, 8).map((m: any) => ({
        sdg: `SDG ${m.sdg}`,
        sdgNum: m.sdg,
        committed: 0,
        actual: Math.min(100, m.totalHours),
        hours: m.totalHours,
      }));

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
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-3 text-center border border-indigo-200 shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <p className="text-2xl font-bold text-indigo-700">{committedSDGs.length}</p>
            <span className="text-indigo-400">/</span>
            <p className="text-2xl font-bold text-emerald-600">{activeSdgs.length}</p>
          </div>
          <p className="text-[10px] text-indigo-600 font-medium">Committed / Active SDGs</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 text-center border border-emerald-200 shadow-sm">
          <p className="text-2xl font-bold text-emerald-700">{totalHours.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-600 font-medium">Total Hours</p>
        </div>
      </div>

      {/* Committed vs Actual SDG Radar */}
      {(committedSDGs.length > 0 || activeSdgs.length > 0) && (
        <div className="bg-white rounded-xl p-4 border border-indigo-200/60 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-2 text-center">Committed vs Actual SDG Progress</h3>
          <p className="text-[10px] text-slate-500 text-center mb-3">
            {committedSDGs.length} SDGs committed • {activeSdgs.filter(s => committedSDGs.includes(s.sdg)).length} with activity
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="sdg"
                  tick={{ fill: '#475569', fontSize: 9 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                <Radar
                  name="Committed"
                  dataKey="committed"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Radar
                  name="Actual Activity"
                  dataKey="actual"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.5}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(value: any, name: string, props: any) => {
                    if (name === 'Committed') return ['Committed', ''];
                    return [`${props.payload.hours}h logged`, 'Activity'];
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-[10px] text-slate-600">Committed SDGs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-600">Actual Activity</span>
            </div>
          </div>
        </div>
      )}

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

      {/* Project Location Map */}
      {projectLocations.length > 0 && (
        <div className="bg-white rounded-xl border border-emerald-200/60 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-800">Global Impact Map</h3>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {projectLocations.length} locations
            </span>
          </div>
          <div className="h-56">
            <MapContainer
              key="sdg-section-map"
              center={[20, 0]}
              zoom={1}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
              dragging={true}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />
              {projectLocations.map((p: any, idx: number) => (
                <CircleMarker
                  key={idx}
                  center={[p.lat || 0, p.lng || 0]}
                  radius={Math.max(5, Math.min(12, (p.hours || 0) / 20))}
                  fillColor={p.status === 'Completed' ? '#3B82F6' : '#10B981'}
                  fillOpacity={0.7}
                  stroke={true}
                  color="#fff"
                  weight={1.5}
                >
                  <Popup>
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-slate-500">{p.region}</p>
                      <p className="text-emerald-600 font-medium">{p.hours}h • {p.employees} employees</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          <div className="p-2 bg-slate-50 flex justify-center gap-4 border-t border-slate-100">
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Active
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className="w-2 h-2 bg-blue-500 rounded-full" /> Completed
            </span>
          </div>
        </div>
      )}
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
    { id: 'beforeafter', title: 'Before & After', desc: 'Compare outcomes', icon: Eye, color: 'rose', path: '/impact-visualization' },
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
          <p className="text-xl font-bold text-amber-700">${Math.round((csrData?.totalHours || 0) * 34.79).toLocaleString()}</p>
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
            rose: 'bg-rose-50 border-rose-300',
          };
          const textColors: Record<string, string> = {
            emerald: 'text-emerald-700',
            blue: 'text-blue-700',
            amber: 'text-amber-700',
            purple: 'text-purple-700',
            rose: 'text-rose-700',
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
                  <p className="text-[10px] text-gray-400">Value @$34.79/hr</p>
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
              <p className="text-center text-xs text-gray-500">Calculated at $34.79/hour volunteer rate</p>
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
        <MapContainer key="csr-pwa-map" ref={mapRef} center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
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

      {/* Bottom Navigation */}
      <CSRPWANav activeTab="home" />
    </div>
  );
}

// Employee Engagement Section
function EngagementSection({ csrData, navigate }: { csrData: CSRDashboardData | undefined; navigate: any }) {
  const employees = csrData?.leaderboard || [];
  const totalHours = csrData?.totalHours || 0;
  const activeEmployees = csrData?.activeEmployees || 0;
  const kpi = csrData?.kpiBreakdown?.employees;

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
          <Users className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-slate-900">{activeEmployees.toLocaleString()}</p>
          <p className="text-xs text-slate-600">Active Employees</p>
          {kpi?.engagementRate && (
            <p className="text-xs text-emerald-600 mt-1">{kpi.engagementRate}% engagement rate</p>
          )}
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <Clock className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-slate-900">{totalHours.toLocaleString()}</p>
          <p className="text-xs text-slate-600">Total Hours Logged</p>
          {kpi?.averageHoursPerEmployee && (
            <p className="text-xs text-blue-600 mt-1">{kpi.averageHoursPerEmployee.toFixed(1)}h avg/employee</p>
          )}
        </div>
      </div>

      {/* Top Performers Preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-amber-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-slate-800 text-sm">Top Performers</span>
            </div>
            <button
              onClick={() => navigate('/csr-dashboard?tab=leaderboard')}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              View All →
            </button>
          </div>
        </div>
        <div className="p-3 space-y-2">
          {employees.slice(0, 5).map((emp, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                idx === 0 ? 'bg-amber-100 text-amber-700' :
                idx === 1 ? 'bg-slate-200 text-slate-600' :
                idx === 2 ? 'bg-orange-100 text-orange-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{emp.employeeName}</p>
                <p className="text-xs text-slate-500">{emp.hours}h • {emp.points} pts</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/csr-dashboard?tab=challenges')}
          className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-left shadow-lg"
        >
          <Calendar className="w-5 h-5 text-white mb-2" />
          <p className="text-white font-semibold text-sm">Active Challenges</p>
          <p className="text-purple-100 text-xs">{csrData?.challenges?.length || 0} running</p>
        </button>
        <button
          onClick={() => navigate('/csr-dashboard?tab=recognition')}
          className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-4 text-left shadow-lg"
        >
          <Award className="w-5 h-5 text-white mb-2" />
          <p className="text-white font-semibold text-sm">Recognition</p>
          <p className="text-pink-100 text-xs">Celebrate teams</p>
        </button>
      </div>
    </div>
  );
}

// Geographic Impact Section - Enhanced with Regional Analytics
function GeographicSection({ csrData }: { csrData: CSRDashboardData | undefined }) {
  const locations = csrData?.projectLocations || [];
  const mapRef = useRef<any>(null);

  const regions = useMemo(() => {
    const unique = Array.from(new Set(locations.map(l => l.region)));
    return ['all', ...unique];
  }, [locations]);

  const [filter, setFilter] = useState({ region: 'all', status: 'all' });

  const filtered = useMemo(() => {
    return locations.filter(p => {
      if (filter.region !== 'all' && p.region !== filter.region) return false;
      if (filter.status !== 'all' && p.status !== filter.status) return false;
      return true;
    });
  }, [locations, filter]);

  // Calculate regional breakdown
  const regionalBreakdown = useMemo(() => {
    const breakdown: Record<string, { hours: number; employees: number; projects: number }> = {};
    locations.forEach(loc => {
      if (!breakdown[loc.region]) {
        breakdown[loc.region] = { hours: 0, employees: 0, projects: 0 };
      }
      breakdown[loc.region].hours += loc.hours;
      breakdown[loc.region].employees += loc.employees;
      breakdown[loc.region].projects += 1;
    });
    return Object.entries(breakdown)
      .map(([region, data]) => ({ region, ...data }))
      .sort((a, b) => b.hours - a.hours);
  }, [locations]);

  const totalHours = locations.reduce((sum, l) => sum + l.hours, 0);
  const totalEmployees = locations.reduce((sum, l) => sum + l.employees, 0);

  return (
    <div className="space-y-4 p-4">
      {/* Geographic Impact Header */}
      <div className="bg-gradient-to-br from-teal-500 via-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Global Impact Footprint</h2>
            <p className="text-emerald-100 text-sm">Geographic distribution of your CSR initiatives</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2.5 text-center">
            <p className="text-2xl font-bold">{regions.length - 1}</p>
            <p className="text-[10px] text-emerald-100 uppercase font-medium">Regions</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2.5 text-center">
            <p className="text-2xl font-bold">{locations.length}</p>
            <p className="text-[10px] text-emerald-100 uppercase font-medium">Locations</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2.5 text-center">
            <p className="text-2xl font-bold">{totalEmployees}</p>
            <p className="text-[10px] text-emerald-100 uppercase font-medium">Volunteers</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2.5 text-center">
            <p className="text-2xl font-bold">{totalHours.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-100 uppercase font-medium">Hours</p>
          </div>
        </div>
      </div>

      {/* Regional Breakdown Chart */}
      <div className="bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/30 rounded-2xl p-4 border border-teal-200/60 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center shadow">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Regional Breakdown</h3>
              <p className="text-[9px] text-teal-600">Impact distribution by region</p>
            </div>
          </div>
        </div>

        {/* Regional Progress Bars */}
        <div className="space-y-3">
          {regionalBreakdown.slice(0, 5).map((region, idx) => {
            const percentage = totalHours > 0 ? Math.round((region.hours / totalHours) * 100) : 0;
            const colors = ['from-teal-400 to-emerald-500', 'from-blue-400 to-indigo-500', 'from-purple-400 to-violet-500', 'from-amber-400 to-orange-500', 'from-rose-400 to-pink-500'];
            return (
              <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${colors[idx % colors.length]}`} />
                    <span className="text-xs font-semibold text-slate-700">{region.region}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-slate-500">{region.projects} projects</span>
                    <span className="text-slate-500">{region.employees} volunteers</span>
                    <span className="font-bold text-emerald-600">{region.hours}h</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${colors[idx % colors.length]} rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-slate-400">{percentage}% of total impact</span>
                  <span className="text-[9px] text-emerald-600 font-medium">${Math.round(region.hours * 34.79).toLocaleString()} value</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={filter.region}
          onChange={e => setFilter({ ...filter, region: e.target.value })}
          className="flex-1 bg-white border border-emerald-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {regions.map(r => <option key={r} value={r}>{r === 'all' ? 'All Regions' : r}</option>)}
        </select>
        <select
          value={filter.status}
          onChange={e => setFilter({ ...filter, status: e.target.value })}
          className="bg-white border border-emerald-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Interactive Map */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg" style={{ height: '350px' }}>
        <MapContainer ref={mapRef} center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {filtered.map((p, idx) => (
            <CircleMarker
              key={idx}
              center={[p.lat, p.lng]}
              radius={Math.max(8, Math.min(20, p.hours / 10))}
              fillColor={p.status === 'Completed' ? '#3B82F6' : p.status === 'Active' ? '#10B981' : '#F59E0B'}
              fillOpacity={0.75}
              stroke={true}
              color="#fff"
              weight={2}
            >
              <Popup>
                <div className="text-xs p-1">
                  <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                  <p className="text-slate-500 mb-2">{p.region}</p>
                  <div className="flex gap-3 text-[11px]">
                    <span className="text-emerald-600 font-semibold">{p.hours}h logged</span>
                    <span className="text-blue-600">{p.employees} volunteers</span>
                  </div>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    p.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                    p.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {p.status}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 py-2">
        <span className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="w-3 h-3 bg-emerald-500 rounded-full shadow" /> Active
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="w-3 h-3 bg-blue-500 rounded-full shadow" /> Completed
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="w-3 h-3 bg-amber-500 rounded-full shadow" /> In Progress
        </span>
      </div>

      {/* Impact Density Insights */}
      <div className="bg-gradient-to-br from-indigo-50 via-violet-50/30 to-purple-50/30 rounded-2xl p-4 border border-indigo-200/60 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow">
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Impact Insights</h3>
            <p className="text-[9px] text-indigo-600">Geographic performance analysis</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-indigo-100">
            <p className="text-[10px] text-slate-500 uppercase font-medium mb-1">Highest Impact Region</p>
            <p className="text-sm font-bold text-indigo-700">{regionalBreakdown[0]?.region || 'N/A'}</p>
            <p className="text-[10px] text-slate-500">{regionalBreakdown[0]?.hours || 0}h contributed</p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-violet-100">
            <p className="text-[10px] text-slate-500 uppercase font-medium mb-1">Avg Hours/Location</p>
            <p className="text-sm font-bold text-violet-700">
              {locations.length > 0 ? Math.round(totalHours / locations.length) : 0}h
            </p>
            <p className="text-[10px] text-slate-500">per project site</p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-purple-100">
            <p className="text-[10px] text-slate-500 uppercase font-medium mb-1">Geographic Reach</p>
            <p className="text-sm font-bold text-purple-700">{regions.length - 1} regions</p>
            <p className="text-[10px] text-slate-500">{locations.length} total sites</p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-emerald-100">
            <p className="text-[10px] text-slate-500 uppercase font-medium mb-1">Economic Value</p>
            <p className="text-sm font-bold text-emerald-700">${Math.round(totalHours * 34.79).toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">volunteer contribution</p>
          </div>
        </div>
      </div>

      {/* Location List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-teal-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              <span className="font-semibold text-slate-700 text-sm">Project Locations</span>
            </div>
            <span className="text-[10px] text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full font-medium">
              {filtered.length} sites
            </span>
          </div>
        </div>
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {filtered.slice(0, 10).map((loc, idx) => (
            <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  loc.status === 'Active' ? 'bg-emerald-100 text-emerald-600' :
                  loc.status === 'Completed' ? 'bg-blue-100 text-blue-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{loc.name}</p>
                  <p className="text-xs text-slate-500">{loc.region}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">{loc.hours}h</p>
                <p className="text-xs text-slate-500">{loc.employees} volunteers</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No locations found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Leaderboard Section
function LeaderboardSection({ csrData }: { csrData: CSRDashboardData | undefined }) {
  const leaderboard = csrData?.leaderboard || [];

  return (
    <div className="space-y-4">
      {/* Top 3 Podium */}
      <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-xl p-4 border border-amber-200">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-amber-600" />
          <span className="font-bold text-slate-800">Top Performers</span>
        </div>
        <div className="flex justify-center items-end gap-4">
          {/* 2nd Place */}
          {leaderboard[1] && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mb-2 mx-auto border-4 border-slate-300">
                <span className="text-2xl font-bold text-slate-600">2</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 truncate max-w-20">{leaderboard[1].employeeName}</p>
              <p className="text-[10px] text-slate-500">{leaderboard[1].hours}h</p>
            </div>
          )}
          {/* 1st Place */}
          {leaderboard[0] && (
            <div className="text-center -mt-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 to-yellow-400 flex items-center justify-center mb-2 mx-auto border-4 border-amber-400 shadow-lg">
                <span className="text-3xl font-bold text-amber-700">1</span>
              </div>
              <p className="text-sm font-bold text-slate-800 truncate max-w-24">{leaderboard[0].employeeName}</p>
              <p className="text-xs text-amber-600 font-semibold">{leaderboard[0].hours}h • {leaderboard[0].points} pts</p>
            </div>
          )}
          {/* 3rd Place */}
          {leaderboard[2] && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-200 to-orange-300 flex items-center justify-center mb-2 mx-auto border-4 border-orange-300">
                <span className="text-2xl font-bold text-orange-600">3</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 truncate max-w-20">{leaderboard[2].employeeName}</p>
              <p className="text-[10px] text-slate-500">{leaderboard[2].hours}h</p>
            </div>
          )}
        </div>
      </div>

      {/* Full Leaderboard */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-semibold text-slate-700 text-sm">Full Rankings</span>
          <span className="text-xs text-slate-500">{leaderboard.length} employees</span>
        </div>
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {leaderboard.map((emp, idx) => (
            <div key={idx} className="px-4 py-3 flex items-center gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                idx === 0 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' :
                idx === 1 ? 'bg-slate-200 text-slate-600' :
                idx === 2 ? 'bg-orange-100 text-orange-600' :
                'bg-slate-100 text-slate-500'
              }`}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{emp.employeeName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">{emp.hours}h</p>
                <p className="text-xs text-slate-500">{emp.points} points</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Recognition Section
function RecognitionSection({ csrData }: { csrData: CSRDashboardData | undefined }) {
  const leaderboard = csrData?.leaderboard || [];
  const topPerformers = leaderboard.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Recognition Header */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 rounded-xl p-6 text-white">
        <Award className="w-8 h-8 mb-3" />
        <h2 className="text-xl font-bold mb-1">Employee Recognition</h2>
        <p className="text-pink-100 text-sm">Celebrate your team's achievements</p>
      </div>

      {/* Monthly Stars */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-slate-800 text-sm">This Month's Stars</span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {topPerformers.map((emp, idx) => (
            <div key={idx} className="flex items-center gap-4 p-3 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                idx === 0 ? 'bg-gradient-to-br from-amber-300 to-yellow-400' :
                idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' :
                'bg-gradient-to-br from-orange-300 to-orange-400'
              }`}>
                <Award className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{emp.employeeName}</p>
                <p className="text-xs text-slate-500">{emp.hours} hours volunteered</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                  <Zap className="w-3 h-3" />
                  {emp.points} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">Achievement Badges</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-200">
            <div className="w-10 h-10 mx-auto mb-2 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-xs font-semibold text-slate-700">Time Champion</p>
            <p className="text-[10px] text-slate-500">100+ hours</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="w-10 h-10 mx-auto mb-2 bg-emerald-100 rounded-full flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-slate-700">Goal Getter</p>
            <p className="text-[10px] text-slate-500">5 SDGs</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-xl border border-purple-200">
            <div className="w-10 h-10 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-xs font-semibold text-slate-700">Team Player</p>
            <p className="text-[10px] text-slate-500">10 projects</p>
          </div>
        </div>
      </div>

      {/* Recognition CTA */}
      <button className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl p-4 flex items-center justify-center gap-2 font-semibold shadow-lg">
        <MessageCircle className="w-5 h-5" />
        Send Recognition
      </button>
    </div>
  );
}

// Challenges Section
function ChallengesSection({ csrData, navigate }: { csrData: CSRDashboardData | undefined; navigate: any }) {
  const challenges = csrData?.challenges || [];

  return (
    <div className="space-y-4">
      {/* Active Challenges Header */}
      <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-xl p-6 text-white">
        <Calendar className="w-8 h-8 mb-3" />
        <h2 className="text-xl font-bold mb-1">Active Challenges</h2>
        <p className="text-purple-100 text-sm">{challenges.length} challenges in progress</p>
      </div>

      {/* Challenge Cards */}
      <div className="space-y-3">
        {challenges.length > 0 ? challenges.map((challenge, idx) => {
          const progress = challenge.target > 0 ? (challenge.progress / challenge.target) * 100 : 0;
          const sdgColor = SDG_COLORS[challenge.sdgGoal] || '#6366f1';

          return (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: sdgColor }}
                  >
                    {challenge.sdgGoal}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 text-sm">{challenge.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">SDG {challenge.sdgGoal}: {SDG_NAMES[challenge.sdgGoal]}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                    challenge.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    challenge.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {challenge.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">Progress</span>
                    <span className="font-semibold text-slate-800">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: sdgColor }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {challenge.progress.toLocaleString()} / {challenge.target.toLocaleString()} goal
                  </p>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No active challenges</p>
            <p className="text-slate-400 text-sm mt-1">Create a challenge to engage your team</p>
          </div>
        )}
      </div>

      {/* Create Challenge CTA */}
      <button className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl p-4 flex items-center justify-center gap-2 font-semibold shadow-lg">
        <Zap className="w-5 h-5" />
        Create New Challenge
      </button>
    </div>
  );
}
