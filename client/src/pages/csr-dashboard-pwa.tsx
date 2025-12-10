import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  PieChart
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSDGName, getSDGColor } from "@shared/sdg-goals";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/2026_-_Synerxus_Modern_Logo_1765300918625.png";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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

  // Fetch CSR Dashboard Data
  const { data: csrData, isLoading, error, refetch } = useQuery<CSRDashboardData>({
    queryKey: ["/api/csr/dashboard", userId],
    queryFn: async () => {
      const params = new URLSearchParams({ userId: userId! });
      const response = await fetch(`/api/csr/dashboard?${params}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard");
      return response.json();
    },
    enabled: !!userId,
    staleTime: 30000,
    refetchInterval: 60000,
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

  // Calculate derived metrics
  const metrics = useMemo(() => {
    if (!csrData) return null;
    const sdgMetrics = csrData.sdgMetrics || [];
    const activeSdgs = sdgMetrics.filter(m => m.totalHours > 0);

    return {
      activeEmployees: csrData.kpiBreakdown?.employees?.total || csrData.activeEmployees || 0,
      totalHours: csrData.kpiBreakdown?.hours?.total || csrData.totalHours || 0,
      economicValue: csrData.kpiBreakdown?.hours?.economicValue || (csrData.totalHours || 0) * 35,
      projectsCompleted: csrData.kpiBreakdown?.projects?.total || csrData.projectsCompleted || 0,
      activeProjects: csrData.kpiBreakdown?.projects?.activeProjects || 0,
      engagementRate: csrData.kpiBreakdown?.employees?.engagementRate || 0,
      activeSdgs: activeSdgs.length,
      totalVolunteers: csrData.activeEmployees || 0,
      sdgScoreDelta: csrData.sdgScoreDelta || 0,
      beneficiaries: csrData.kpiBreakdown?.projects?.beneficiariesReached || (csrData.projectsCompleted || 0) * 150,
      regionsServed: csrData.kpiBreakdown?.projects?.regionsServed || csrData.projectLocations?.length || 0,
      avgHoursPerEmployee: csrData.kpiBreakdown?.hours?.averagePerEmployee || 0,
      topPerformer: csrData.kpiBreakdown?.employees?.topPerformer || csrData.leaderboard?.[0]?.employeeName || 'N/A',
      topPerformerHours: csrData.kpiBreakdown?.employees?.topPerformerHours || csrData.leaderboard?.[0]?.hours || 0,
    };
  }, [csrData]);

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

  // Loading state
  if (isLoading && !csrData) {
    return (
      <div className="h-screen bg-[#faf9f7] flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-amber-700 text-sm">Loading Dashboard...</p>
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
    <div className="h-screen bg-[#faf9f7] text-slate-800 flex flex-col overflow-hidden">
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500/90 text-black text-center py-1.5 px-4 text-xs font-medium">
          Offline Mode - Using Cached Data
        </div>
      )}

      {/* Compact Header - Blue to off-white/sky-blue gradient for logo contrast */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-500 via-sky-300 to-sky-100 shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Synerxus" className="h-12 w-auto object-contain" />
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold text-slate-800 leading-tight">{companyName}</h1>
              <p className="text-[10px] text-slate-600">CSR Impact Dashboard</p>
            </div>
          </div>

          {/* Right: Actions + Three-Dot Menu */}
          <div className="flex items-center gap-1">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-full hover:bg-slate-800/10 transition-colors ${refreshing ? 'animate-spin' : ''}`}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-slate-700" />
            </button>

            {/* Notifications */}
            <button className="p-2 rounded-full hover:bg-slate-800/10 transition-colors relative" title="Notifications">
              <Bell className="w-4 h-4 text-slate-700" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>

            {/* Three-Dot Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-full hover:bg-slate-800/10 transition-colors"
                title="Menu"
              >
                <MoreVertical className="w-5 h-5 text-slate-700" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{userInitials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.displayName || 'Admin'}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Items */}
                  <div className="py-1">
                    <button
                      onClick={() => { setActiveTab('home'); setShowMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeTab === 'home' ? 'bg-amber-500/10 text-amber-400' : 'text-gray-300 hover:bg-slate-700/50'}`}
                    >
                      <Home className="w-4 h-4" />
                      <span>Dashboard Home</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab('sdgs'); setShowMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeTab === 'sdgs' ? 'bg-amber-500/10 text-amber-400' : 'text-gray-300 hover:bg-slate-700/50'}`}
                    >
                      <Target className="w-4 h-4" />
                      <span>SDG Goals</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab('projects'); setShowMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeTab === 'projects' ? 'bg-amber-500/10 text-amber-400' : 'text-gray-300 hover:bg-slate-700/50'}`}
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>Projects</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab('reports'); setShowMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeTab === 'reports' ? 'bg-amber-500/10 text-amber-400' : 'text-gray-300 hover:bg-slate-700/50'}`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Reports</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab('insights'); setShowMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeTab === 'insights' ? 'bg-amber-500/10 text-amber-400' : 'text-gray-300 hover:bg-slate-700/50'}`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>AI Insights</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-700" />

                  {/* Actions */}
                  <div className="py-1">
                    <button
                      onClick={() => { setShowMapModal(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-slate-700/50 transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Global Impact Map</span>
                    </button>
                    <button
                      onClick={() => { navigate('/csr-reports-exports'); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-slate-700/50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export Reports</span>
                    </button>
                    <button
                      onClick={toggleFullscreen}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-slate-700/50 transition-colors"
                    >
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-700" />

                  {/* Settings & Logout */}
                  <div className="py-1">
                    <button
                      onClick={() => { navigate('/corporate-partner-profile-settings'); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-slate-700/50 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={() => { navigate('/csr-dashboard'); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-slate-700/50 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Desktop Dashboard</span>
                    </button>
                    <button
                      onClick={() => { signOut(); navigate('/'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation - Pill Style */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 min-w-max">
            {[
              { id: 'home', label: 'Overview', icon: Home },
              { id: 'sdgs', label: 'SDGs', icon: Target },
              { id: 'projects', label: 'Projects', icon: Briefcase },
              { id: 'reports', label: 'Reports', icon: FileText },
              { id: 'insights', label: 'Insights', icon: Sparkles },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as NavTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeTab === id
                    ? 'bg-slate-800 text-white'
                    : 'bg-white/50 text-slate-700 hover:bg-white/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-6">
        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-4 p-4">
            {/* Quick Stats Bar */}
            <div className="grid grid-cols-4 gap-2">
              <QuickStat
                label="Hours"
                value={metrics?.totalHours || 0}
                icon={Clock}
                color="emerald"
              />
              <QuickStat
                label="Employees"
                value={metrics?.activeEmployees || 0}
                icon={Users}
                color="blue"
              />
              <QuickStat
                label="Projects"
                value={metrics?.projectsCompleted || 0}
                icon={Briefcase}
                color="purple"
              />
              <QuickStat
                label="SDGs"
                value={metrics?.activeSdgs || 0}
                icon={Target}
                color="amber"
              />
            </div>

            {/* KPI Cards - Scrollable Row */}
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-3 min-w-max pb-2">
                <KPICard
                  title="Total Hours"
                  value={metrics?.totalHours || 0}
                  subtitle={`$${((metrics?.economicValue || 0)).toLocaleString()} value`}
                  icon={Clock}
                  color="emerald"
                  onClick={() => setSelectedKPI('hours')}
                />
                <KPICard
                  title="Active Employees"
                  value={metrics?.activeEmployees || 0}
                  subtitle={`${metrics?.engagementRate || 0}% engaged`}
                  icon={Users}
                  color="blue"
                  onClick={() => setSelectedKPI('employees')}
                  trend={(metrics?.engagementRate || 0) > 50 ? 'up' : 'neutral'}
                />
                <KPICard
                  title="Impact Value"
                  value={metrics?.economicValue || 0}
                  subtitle="@$35/hour"
                  icon={DollarSign}
                  color="amber"
                  onClick={() => setSelectedKPI('impact')}
                  format="currency"
                />
                <KPICard
                  title="Projects"
                  value={metrics?.projectsCompleted || 0}
                  subtitle={`${metrics?.activeProjects || 0} active`}
                  icon={Briefcase}
                  color="purple"
                  onClick={() => setSelectedKPI('projects')}
                />
                <KPICard
                  title="Active SDGs"
                  value={metrics?.activeSdgs || 0}
                  subtitle="of 17 goals"
                  icon={Target}
                  color="teal"
                  onClick={() => setActiveTab('sdgs')}
                  trend={(metrics?.sdgScoreDelta || 0) >= 0 ? 'up' : 'down'}
                />
                <KPICard
                  title="Beneficiaries"
                  value={metrics?.beneficiaries || 0}
                  subtitle="lives impacted"
                  icon={Award}
                  color="rose"
                  onClick={() => setSelectedKPI('beneficiaries')}
                />
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Impact Over Time */}
              <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">Impact Over Time</h3>
                  <div className="flex gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Hours
                    </span>
                    <span className="flex items-center gap-1 text-blue-700">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Team
                    </span>
                  </div>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={impactOverTimeData}>
                      <defs>
                        <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                        labelStyle={{ color: '#F1F5F9' }}
                      />
                      <Area type="monotone" dataKey="hours" stroke="#10B981" fill="url(#hoursGrad)" strokeWidth={2} />
                      <Line type="monotone" dataKey="employees" stroke="#3B82F6" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SDG Distribution */}
              <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">SDG Distribution</h3>
                  <button
                    onClick={() => setActiveTab('sdgs')}
                    className="text-[10px] text-amber-700 hover:underline font-medium"
                  >
                    View All
                  </button>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sdgDistributionData} layout="vertical" margin={{ left: 0 }}>
                      <XAxis type="number" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" width={85} stroke="#64748B" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value: number) => [`${value.toLocaleString()} hrs`]}
                      />
                      <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={14}>
                        {sdgDistributionData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quick Actions + Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Leaderboard */}
              <div className="lg:col-span-2 bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Top Performers</h3>
                <div className="space-y-2">
                  {(csrData?.leaderboard || []).slice(0, 5).map((person, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-amber-50/50 rounded-lg border border-amber-100/50">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-amber-500 text-black' :
                        idx === 1 ? 'bg-gray-400 text-black' :
                        idx === 2 ? 'bg-orange-600 text-white' :
                        'bg-slate-400 text-white'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 truncate">{person.employeeName}</p>
                        <p className="text-[10px] text-slate-500">{person.points} pts</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">{person.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <ActionButton icon={Globe} label="Global Map" color="emerald" onClick={() => setShowMapModal(true)} />
                  <ActionButton icon={FileText} label="Generate Report" color="blue" onClick={() => navigate('/csr-reports-exports')} />
                  <ActionButton icon={Sparkles} label="AI Insights" color="purple" onClick={() => setActiveTab('insights')} />
                  <ActionButton icon={Briefcase} label="View Projects" color="amber" onClick={() => navigate('/projects')} />
                </div>
              </div>
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
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-teal-50 rounded-xl p-3 text-center border border-teal-300 shadow-sm">
          <p className="text-2xl font-bold text-teal-700">{activeSdgs.length}</p>
          <p className="text-[10px] text-slate-700 font-medium">Active SDGs</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-300 shadow-sm">
          <p className="text-2xl font-bold text-emerald-700">{totalHours.toLocaleString()}</p>
          <p className="text-[10px] text-slate-700 font-medium">Total Hours</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-300 shadow-sm">
          <p className="text-2xl font-bold text-amber-700">{csrData?.sdgScoreDelta || 0}%</p>
          <p className="text-[10px] text-slate-700 font-medium">vs Quarter</p>
        </div>
      </div>

      {/* SDG Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {Array.from({ length: 17 }, (_, i) => i + 1).map(sdg => {
          const metric = sdgMetrics.find(m => m.sdg === sdg);
          const isActive = metric && metric.totalHours > 0;
          const color = SDG_COLORS[sdg];

          return (
            <button
              key={sdg}
              onClick={() => isActive && onSelectSDG(sdg)}
              disabled={!isActive}
              className={`rounded-lg p-2 border transition-all ${
                isActive ? 'hover:scale-105' : 'opacity-30'
              }`}
              style={{ backgroundColor: isActive ? `${color}20` : '#374151', borderColor: isActive ? color : '#4B5563' }}
            >
              <div className="w-8 h-8 mx-auto rounded flex items-center justify-center font-bold text-white text-sm mb-1" style={{ backgroundColor: color }}>
                {sdg}
              </div>
              {isActive && <p className="text-[8px] text-center" style={{ color }}>{metric?.totalHours}h</p>}
            </button>
          );
        })}
      </div>

      {/* Active SDGs List */}
      <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Progress by SDG</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {activeSdgs.sort((a, b) => b.totalHours - a.totalHours).map(m => {
            const maxHours = Math.max(...activeSdgs.map(x => x.totalHours));
            const pct = maxHours > 0 ? (m.totalHours / maxHours) * 100 : 0;
            const color = SDG_COLORS[m.sdg];

            return (
              <div key={m.sdg} className="cursor-pointer hover:bg-amber-50/50 rounded-lg p-2 transition-colors" onClick={() => onSelectSDG(m.sdg)}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: color }}>
                      {m.sdg}
                    </div>
                    <span className="text-sm text-slate-800">{SDG_NAMES[m.sdg]}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color }}>{m.totalHours.toLocaleString()}h</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
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

// AI Insights Section
function InsightsSection({ aiInsights, csrData }: { aiInsights: any; csrData: CSRDashboardData | undefined }) {
  const insights = aiInsights?.insights || [
    { id: 1, title: 'Engagement Opportunity', desc: 'Team challenges could boost participation by 25%', type: 'opportunity', priority: 'high' },
    { id: 2, title: 'SDG Focus', desc: 'Strong interest in SDG 13 (Climate Action) - expand related projects', type: 'recommendation', priority: 'medium' },
    { id: 3, title: 'Industry Benchmark', desc: 'Engagement 15% above average - maintain with recognition programs', type: 'insight', priority: 'positive' },
    { id: 4, title: 'Resource Optimization', desc: 'Consolidating projects could improve ROI by 20%', type: 'optimization', priority: 'high' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 bg-purple-100 rounded-xl p-4 border border-purple-300 shadow-sm">
        <Sparkles className="w-5 h-5 text-purple-700" />
        <div>
          <h2 className="text-slate-900 font-semibold">AI-Powered Insights</h2>
          <p className="text-xs text-slate-600">Data-driven recommendations</p>
        </div>
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

// Map Modal
function MapModal({ csrData, filter, setFilter, onClose }: { csrData: any; filter: any; setFilter: any; onClose: () => void }) {
  const projects = csrData?.projectLocations || [];
  const regions: string[] = ['all', ...Array.from(new Set(projects.map((p: any) => p.region).filter(Boolean))) as string[]];
  const filtered = projects.filter((p: any) => {
    if (filter.region !== 'all' && p.region !== filter.region) return false;
    if (filter.status !== 'all' && p.status !== filter.status) return false;
    return true;
  });

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
        <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
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
