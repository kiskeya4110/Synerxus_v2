import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Home,
  BarChart3,
  Users,
  Briefcase,
  FileText,
  Settings,
  ChevronRight,
  X,
  MapPin,
  Star,
  Award,
  Trophy,
  Medal,
  Gift,
  Heart,
  Sparkles,
  Send,
  Target,
  Clock,
  FolderKanban,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { getSDGName, getSDGFullName, getSDGColor } from "@shared/sdg-goals";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import { useState, useEffect } from "react";
import { ConfirmDialog } from "@/components/ui/dialog-factory";
import { safeArray, safeMap, safeFilter, safeReduce } from "@/lib/safe-array";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import EmployeeEngagementTab from "./employee-engagement-tab";
import Footer from "@/components/layout/footer";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import Logo from "@/components/ui/logo";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import logoUrl from "@assets/Synerxus Modern Logo  NBG_1763706841211.png";

interface SDGEmployee {
  name: string;
  email: string;
  hours: number;
  projectId: number;
  projectName: string;
}

interface SDGProject {
  id: number;
  name: string;
  hours: number;
}

interface SDGMetric {
  sdg: number;
  totalHours: number;
  uniqueEmployees: number;
  projectsContributed: number;
  employees?: SDGEmployee[];
  projects?: SDGProject[];
}

interface CSRDashboardData {
  totalPartners: number;
  activeEmployees: number;
  totalHours: number;
  totalImpact: number;
  projectsCompleted: number;
  sdgScoreDelta: number;
  companyName?: string;
  primarySdgs?: number[]; // Organization's committed SDG goals
  sdgProgress: Record<
    number,
    {
      goal: number;
      name: string;
      color: string;
      progress: number;
      status?: string;
    }
  >;
  sdgMetrics: SDGMetric[];
  partners: Array<{
    id: number;
    companyName: string;
    employees: number;
    hours: number;
    roi: number;
  }>;
  challenges: Array<{
    id: number;
    title: string;
    sdgGoal: number;
    progress: number;
    target: number;
    status: string;
  }>;
  leaderboard: Array<{
    rank: number;
    employeeName: string;
    hours: number;
    points: number;
  }>;
  pendingActions: Array<{ type: string; orgName: string; description: string }>;
  projectLocations: Array<{
    id: number;
    name: string;
    lat: number;
    lng: number;
    region: string;
    employees: number;
    hours: number;
    status: string;
  }>;
  kpiBreakdown?: {
    hours: {
      total: number;
      averagePerEmployee: number;
      economicValue: number;
      topProjectHours: number;
      weeklyAverage: number;
    };
    employees: {
      total: number;
      totalRoster: number;
      averageHoursPerEmployee: number;
      engagementRate: number;
      topPerformer: string;
      topPerformerHours: number;
      newThisMonth: number;
    };
    projects: {
      total: number;
      activeProjects: number;
      sponsoredProjects: number;
      totalRoi: number;
      averageRoiPerProject: number;
      totalHoursInvested: number;
      averageHoursPerProject: number;
      beneficiariesReached: number;
      regionsServed: number;
    };
    sdg: {
      scoreDelta: number;
      activeCommitments: number;
      averageProgress: number;
      topSdg: number;
      topSdgHours: number;
      totalSdgHours: number;
      challengesActive: number;
      challengesCompleted: number;
    };
  };
}

export default function CSRDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const userId = localStorage.getItem("currentUserId");
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null);
  const [selectedAdminTab, setSelectedAdminTab] = useState<
    "reviews" | "insights" | "flagged"
  >("reviews");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<number | null>(
    null,
  );
  const [showFunnelModal, setShowFunnelModal] = useState(false);
  const [selectedMainTab, setSelectedMainTab] = useState<
    "overview" | "engagement"
  >("overview");

  // Mobile detection and PWA tab state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<'overview' | 'employees' | 'sdgs' | 'reports' | 'settings'>('overview');

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Recognition feature state
  const [showRecognitionModal, setShowRecognitionModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [recognitionMessage, setRecognitionMessage] = useState("");
  const [recognitionBadge, setRecognitionBadge] = useState<string>("star");
  const [isSubmittingRecognition, setIsSubmittingRecognition] = useState(false);

  // SDG Filters - support multiple selection
  const [selectedSDGFilters, setSelectedSDGFilters] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState<"all" | "30d" | "90d" | "1y">("all");

  // Map filters for geographic view
  const [selectedMapRegion, setSelectedMapRegion] = useState<string>("all");
  const [selectedMapStatus, setSelectedMapStatus] = useState<string>("all");

  // SDG Alignment drill-down modals
  const [showActiveSDGsModal, setShowActiveSDGsModal] = useState(false);
  const [showTotalHoursModal, setShowTotalHoursModal] = useState(false);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [showExpansionInsightsModal, setShowExpansionInsightsModal] = useState(false);

  // Engagement tips confirmation dialog
  const [showEngagementTipsDialog, setShowEngagementTipsDialog] = useState(false);
  const [isSendingTips, setIsSendingTips] = useState(false);

  // Time Period options
  const TIME_PERIODS = [
    { value: 'all', label: 'All Time' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' },
  ];

  // Check for authentication
  const isAuthenticated = !!user && !!userId;

  const {
    data: csrData,
    isLoading,
    error,
  } = useQuery<CSRDashboardData>({
    queryKey: ["/api/csr/dashboard", userId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ userId: userId! });
      if (dateRange !== 'all') {
        params.append('timePeriod', dateRange);
      }
      const response = await fetch(`/api/csr/dashboard?${params}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Access denied - you don't have permission to view this dashboard",
          );
        }
        throw new Error("Failed to fetch CSR dashboard");
      }
      return response.json();
    },
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Poll every 30 seconds for real-time updates
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  const { data: funnelData } = useQuery({
    queryKey: ["/api/csr/engagement-funnel", userId],
    queryFn: async () => {
      const response = await fetch(
        `/api/csr/engagement-funnel?userId=${userId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch funnel");
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 10000,
  });

  const { data: adminActionsData } = useQuery({
    queryKey: ["/api/csr/pending-actions", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/pending-actions?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch actions");
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 10000,
  });

  const { data: funnelStageData } = useQuery({
    queryKey: ["/api/csr/engagement-funnel-stage", userId, selectedFunnelStage],
    queryFn: async () => {
      const response = await fetch(
        `/api/csr/engagement-funnel-stage?userId=${userId}&stage=${selectedFunnelStage}`,
      );
      if (!response.ok) throw new Error("Failed to fetch stage");
      return response.json();
    },
    enabled: isAuthenticated && selectedFunnelStage !== null,
  });

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Skeleton className="h-8 w-48 mb-4" />
          <p style={{ color: "#6b7280" }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <Card
          style={{ maxWidth: "400px", padding: "24px", textAlign: "center" }}
        >
          <CardHeader>
            <CardTitle style={{ color: "#1e3a8a" }}>Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>
              Please sign in to access the CSR Dashboard.
            </p>
            <button
              onClick={() => navigate("/login")}
              style={{
                backgroundColor: "#1e3a8a",
                color: "white",
                padding: "8px 24px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
              data-testid="btn-login-redirect"
            >
              Sign In
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if access denied
  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <Card
          style={{ maxWidth: "400px", padding: "24px", textAlign: "center" }}
        >
          <CardHeader>
            <CardTitle style={{ color: "#dc2626" }}>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                backgroundColor: "#1e3a8a",
                color: "white",
                padding: "8px 24px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
              data-testid="btn-dashboard-redirect"
            >
              Go to Dashboard
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{ height: "64px", backgroundColor: "#1e3a8a", flexShrink: 0 }}
        />
        <div
          style={{ display: "flex", flex: 1 }}
        >
          <div
            style={{ width: "20%", backgroundColor: "#1e3a8a", flexShrink: 0 }}
          />
          <div
            style={{
              width: "80%",
              backgroundColor: "#f9fafb",
              padding: "32px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 bg-slate-200" />
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "24px",
              }}
            >
              <Skeleton className="h-96 bg-slate-200" />
              <Skeleton className="h-96 bg-slate-200" />
              <Skeleton className="h-48 bg-slate-200" />
              <Skeleton className="h-48 bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const companyName = csrData?.companyName || csrData?.partners?.[0]?.companyName || "Loading...";
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const adminName = user?.displayName || user?.email?.split('@')[0] || "Admin";

  // Calculate SDG percentages based on real employee contribution data
  const sdgMetrics = csrData?.sdgMetrics || [];
  const totalSDGHours = sdgMetrics.reduce(
    (sum: number, metric: any) => sum + (metric.totalHours || 0),
    0,
  );

  // Get organization's committed SDGs first (needed for filtering)
  const committedSDGsList = csrData?.primarySdgs || [];

  // Build SDG chart data from real metrics - ONLY show SDGs in corporate commitments
  // Sort numerically by SDG goal number (1-17)
  const sdgChartData = sdgMetrics
    .filter((metric) => committedSDGsList.includes(metric.sdg)) // Only show committed SDGs
    .map((metric) => {
      // Calculate percentage based only on committed SDGs total hours
      const committedTotalHours = sdgMetrics
        .filter(m => committedSDGsList.includes(m.sdg))
        .reduce((sum, m) => sum + (m.totalHours || 0), 0);
      const percentage =
        committedTotalHours > 0
          ? Math.round((metric.totalHours / committedTotalHours) * 100)
          : 0;
      return {
        name: getSDGName(metric.sdg),
        fullName: getSDGFullName(metric.sdg),
        value: Math.max(5, percentage), // Min 5% for visibility in pie chart
        color: getSDGColor(metric.sdg),
        goal: metric.sdg,
        hours: metric.totalHours,
        employees: metric.uniqueEmployees,
        projects: metric.projectsContributed,
      };
    })
    .sort((a, b) => a.goal - b.goal);

  // Also build chart data for committed SDGs that have no hours yet (to show as 0%)
  const committedSDGsWithoutData = committedSDGsList
    .filter((sdg: number) => !sdgMetrics.some(m => m.sdg === sdg && m.totalHours > 0))
    .map((sdg: number) => ({
      name: getSDGName(sdg),
      fullName: getSDGFullName(sdg),
      value: 0,
      color: getSDGColor(sdg),
      goal: sdg,
      hours: 0,
      employees: 0,
      projects: 0,
    }));

  // Combine and sort all committed SDGs
  const allCommittedSDGChartData = [...sdgChartData, ...committedSDGsWithoutData]
    .sort((a, b) => a.goal - b.goal);

  // Get SDGs where employees are working but NOT in corporate commitments (for AI expansion insights)
  const employeeActivityOutsideCommitments = sdgMetrics
    .filter((metric) => !committedSDGsList.includes(metric.sdg) && metric.totalHours > 0)
    .map((metric) => ({
      sdg: metric.sdg,
      name: getSDGName(metric.sdg),
      fullName: getSDGFullName(metric.sdg),
      color: getSDGColor(metric.sdg),
      hours: metric.totalHours,
      employees: metric.uniqueEmployees,
      projects: metric.projectsContributed,
    }))
    .sort((a, b) => b.hours - a.hours); // Sort by most hours

  // Default SDG data if none exists - sorted numerically by goal number
  const defaultSdgData = [
    {
      name: getSDGName(1),
      fullName: getSDGFullName(1),
      value: 18,
      color: getSDGColor(1),
      goal: 1,
      hours: 0,
      employees: 0,
      projects: 0,
    },
    {
      name: getSDGName(3),
      fullName: getSDGFullName(3),
      value: 18,
      color: getSDGColor(3),
      goal: 3,
      hours: 0,
      employees: 0,
      projects: 0,
    },
    {
      name: getSDGName(4),
      fullName: getSDGFullName(4),
      value: 19,
      color: getSDGColor(4),
      goal: 4,
      hours: 0,
      employees: 0,
      projects: 0,
    },
    {
      name: getSDGName(5),
      fullName: getSDGFullName(5),
      value: 22,
      color: getSDGColor(5),
      goal: 5,
      hours: 0,
      employees: 0,
      projects: 0,
    },
    {
      name: getSDGName(10),
      fullName: getSDGFullName(10),
      value: 22,
      color: getSDGColor(10),
      goal: 10,
      hours: 0,
      employees: 0,
      projects: 0,
    },
    {
      name: getSDGName(13),
      fullName: getSDGFullName(13),
      value: 29,
      color: getSDGColor(13),
      goal: 13,
      hours: 0,
      employees: 0,
      projects: 0,
    },
    {
      name: getSDGName(15),
      fullName: getSDGFullName(15),
      value: 18,
      color: getSDGColor(15),
      goal: 15,
      hours: 0,
      employees: 0,
      projects: 0,
    },
  ];

  // Only show chart data for committed SDGs, with placeholder if no commitments set
  const chartData = allCommittedSDGChartData.length > 0 ? allCommittedSDGChartData : defaultSdgData;

  // ===== SDG COMMITMENT & AI INSIGHTS =====
  // Use committedSDGsList defined earlier
  const committedSDGs = committedSDGsList;

  // Calculate totals for ONLY committed SDGs
  const committedSDGHours = sdgMetrics
    .filter(m => committedSDGs.includes(m.sdg))
    .reduce((sum, m) => sum + (m.totalHours || 0), 0);

  const committedSDGEmployees = new Set(
    sdgMetrics
      .filter(m => committedSDGs.includes(m.sdg))
      .flatMap((m: any) => safeMap(m.employees, (emp: any) => emp.email))
  ).size;

  const committedSDGProjects = new Set(
    sdgMetrics
      .filter(m => committedSDGs.includes(m.sdg))
      .flatMap((m: any) => safeMap(m.projects, (proj: any) => proj.id))
  ).size;

  // Count active SDGs (committed SDGs with hours logged)
  const activeCommittedSDGs = sdgMetrics
    .filter(m => committedSDGs.includes(m.sdg) && m.totalHours > 0)
    .length;

  // Get SDGs that employees are actually working on
  const employeeUsedSDGs = new Set(
    sdgMetrics.filter(m => m.totalHours > 0).map(m => m.sdg)
  );

  // Find SDGs employees are using but not in corporate commitment (AI Insights)
  const suggestedSDGs = Array.from(employeeUsedSDGs).filter(
    sdg => !committedSDGs.includes(sdg)
  ).sort((a, b) => a - b);

  // Determine which SDGs to show in filter chips - only show committed SDGs from settings
  const displayedSDGsForFilters = committedSDGs.length > 0
    ? committedSDGs
    : []; // Show nothing if no committed SDGs

  // ===== FILTERING LOGIC =====
  // Filter function to check if data matches selected SDG filters
  const matchesSDGFilter = (sdgs: number[] | undefined) => {
    if (selectedSDGFilters.length === 0) return true;
    if (!sdgs || sdgs.length === 0) return false;
    // Return true if ANY of the selected filters match the data's SDGs
    return selectedSDGFilters.some(filter => sdgs.includes(filter));
  };

  // Apply SDG filters to all data
  const filteredSDGMetrics = selectedSDGFilters.length > 0
    ? sdgMetrics.filter(metric => selectedSDGFilters.includes(metric.sdg))
    : sdgMetrics;

  // Get unique regions from project locations for filter dropdown
  const projectRegions = Array.from(new Set(
    safeArray(csrData?.projectLocations).map((p: any) => p.region).filter(Boolean)
  )).sort();

  // Apply all filters to project locations (SDG + region + status)
  const filteredProjectLocations = safeArray(csrData?.projectLocations).filter((project: any) => {
    // SDG filter
    if (selectedSDGFilters.length > 0 && !matchesSDGFilter(project.sdgGoals)) {
      return false;
    }
    // Region filter
    if (selectedMapRegion !== "all" && project.region !== selectedMapRegion) {
      return false;
    }
    // Status filter
    if (selectedMapStatus !== "all" && project.status !== selectedMapStatus) {
      return false;
    }
    return true;
  });

  // Recalculate KPIs based on filtered data
  const filteredTotalHours = filteredSDGMetrics.reduce(
    (sum: number, metric: any) => sum + (metric.totalHours || 0),
    0,
  );

  const filteredUniqueEmployees = new Set(
    filteredSDGMetrics.flatMap((metric: any) =>
      safeMap(metric.employees, (emp: any) => emp.email)
    )
  ).size;

  const filteredProjectsCount = new Set(
    filteredSDGMetrics.flatMap((metric: any) =>
      safeMap(metric.projects, (proj: any) => proj.id)
    )
  ).size;

  // Use filtered data if filters are active, otherwise use original data
  const displayTotalHours = selectedSDGFilters.length > 0
    ? filteredTotalHours
    : (csrData?.totalHours || 0);

  const displayActiveEmployees = selectedSDGFilters.length > 0
    ? filteredUniqueEmployees
    : (csrData?.activeEmployees || 0);

  const displayProjectsCompleted = selectedSDGFilters.length > 0
    ? filteredProjectsCount
    : (csrData?.projectsCompleted || 0);

  // Filter chart data
  const displayChartData = selectedSDGFilters.length > 0
    ? chartData.filter(item => selectedSDGFilters.includes(item.goal))
    : chartData;

  // Toggle SDG filter
  const toggleSDGFilter = (sdgNumber: number) => {
    setSelectedSDGFilters(prev =>
      prev.includes(sdgNumber)
        ? prev.filter(s => s !== sdgNumber)
        : [...prev, sdgNumber]
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedSDGFilters([]);
    setDateRange("all");
  };

  // Mobile PWA View - Prepare radar chart data for SDG progress
  const mobileRadarData = sdgMetrics.slice(0, 8).map((metric: any) => ({
    sdg: `SDG ${metric.sdg}`,
    hours: metric.totalHours,
    employees: metric.uniqueEmployees * 10, // Scale for visibility
    projects: metric.projectsContributed * 20, // Scale for visibility
    fullMark: Math.max(totalSDGHours / 2, 100),
  }));

  // Prepare bar chart data for top SDGs
  const mobileBarData = sdgMetrics.slice(0, 6).map((metric: any) => ({
    name: getSDGName(metric.sdg).substring(0, 8),
    sdg: metric.sdg,
    hours: metric.totalHours,
    employees: metric.uniqueEmployees,
    projects: metric.projectsContributed,
    color: getSDGColor(metric.sdg),
  }));

  // Prepare trend data for line chart (simulated monthly progression)
  const mobileTrendData = [
    { month: 'Jan', hours: Math.round(displayTotalHours * 0.1), employees: Math.round(displayActiveEmployees * 0.3) },
    { month: 'Feb', hours: Math.round(displayTotalHours * 0.2), employees: Math.round(displayActiveEmployees * 0.4) },
    { month: 'Mar', hours: Math.round(displayTotalHours * 0.35), employees: Math.round(displayActiveEmployees * 0.5) },
    { month: 'Apr', hours: Math.round(displayTotalHours * 0.5), employees: Math.round(displayActiveEmployees * 0.6) },
    { month: 'May', hours: Math.round(displayTotalHours * 0.7), employees: Math.round(displayActiveEmployees * 0.8) },
    { month: 'Jun', hours: displayTotalHours, employees: displayActiveEmployees },
  ];

  // Mobile PWA View
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col max-w-[428px] mx-auto">
        {/* Mobile Header - Compact */}
        <header className="bg-gradient-to-r from-[#1a0a2e] via-[#3d1a5c] to-[#d35400] text-white px-3 py-2 flex items-center justify-between sticky top-0 z-50 shadow-lg">
          <button
            onClick={() => navigate("/landing")}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <img src={logoUrl} alt="Synerxus Logo" className="h-6 w-auto" />
            <span className="font-bold text-xs">
              <span className="text-white">SYNER</span>
              <span className="text-amber-400">XUS</span>
            </span>
          </button>
          <div className="text-[10px] text-white/80 truncate max-w-[120px]">{companyName}</div>
        </header>

        {/* Main Content with Internal Tabs */}
        <main className="flex-1 overflow-y-auto pb-20 px-3 pt-3">
          {mobileTab === 'overview' && (
            <div className="space-y-3">
              <h1 className="text-white text-lg font-bold">CSR Dashboard</h1>

              {/* KPI Cards Grid - Compact */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-br from-blue-600/30 to-blue-800/30 rounded-lg p-3 border border-blue-500/30">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-300" />
                    <span className="text-blue-300 text-[10px]">Total Hours</span>
                  </div>
                  <div className="text-white text-xl font-bold mt-1">{displayTotalHours.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-800/30 rounded-lg p-3 border border-emerald-500/30">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-emerald-300 text-[10px]">Employees</span>
                  </div>
                  <div className="text-white text-xl font-bold mt-1">{displayActiveEmployees}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-600/30 to-purple-800/30 rounded-lg p-3 border border-purple-500/30">
                  <div className="flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-purple-300" />
                    <span className="text-purple-300 text-[10px]">Projects</span>
                  </div>
                  <div className="text-white text-xl font-bold mt-1">{displayProjectsCompleted}</div>
                </div>
                <div className="bg-gradient-to-br from-teal-600/30 to-teal-800/30 rounded-lg p-3 border border-teal-500/30">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-teal-300" />
                    <span className="text-teal-300 text-[10px]">AIUs Earned</span>
                  </div>
                  <div className="text-white text-xl font-bold mt-1">{(csrData?.totalImpact || 0).toFixed(1)}</div>
                </div>
              </div>

              {/* SDG Radar Chart - Compact */}
              {mobileRadarData.length > 0 && (
                <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                  <h3 className="text-white text-sm font-semibold mb-2">SDG Progress Radar</h3>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={mobileRadarData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis dataKey="sdg" tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#9CA3AF', fontSize: 8 }} />
                        <Radar name="Hours" dataKey="hours" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
                        <Radar name="Employees" dataKey="employees" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #374151', borderRadius: '8px', fontSize: '11px' }}
                          labelStyle={{ color: '#fff' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2 text-[10px]">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-gray-400">Hours</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-gray-400">Employees</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SDG Commitments - Compact */}
              {committedSDGs && committedSDGs.length > 0 && (
                <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                  <h3 className="text-white text-sm font-semibold mb-2">SDG Commitments</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {committedSDGs.map((sdg: number) => (
                      <div
                        key={sdg}
                        className="w-8 h-8 rounded flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: getSDGColor(sdg) }}
                        title={getSDGName(sdg)}
                      >
                        {sdg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top SDG Progress - Compact */}
              <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                <h3 className="text-white text-sm font-semibold mb-2">Top SDG Impact</h3>
                <div className="space-y-2">
                  {sdgMetrics.slice(0, 4).map((metric: any) => (
                    <div key={metric.sdg} className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: getSDGColor(metric.sdg) }}
                      >
                        {metric.sdg}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-gray-300 truncate">{getSDGName(metric.sdg)}</span>
                          <span className="text-white font-medium ml-1">{metric.totalHours}h</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min((metric.totalHours / (totalSDGHours || 1)) * 100 * 5, 100)}%`,
                              backgroundColor: getSDGColor(metric.sdg)
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaderboard Preview - Compact */}
              {csrData?.leaderboard && csrData.leaderboard.length > 0 && (
                <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                  <h3 className="text-white text-sm font-semibold mb-2">Top Volunteers</h3>
                  <div className="space-y-1.5">
                    {csrData.leaderboard.slice(0, 4).map((employee: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-white/5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-[10px]">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-xs truncate">{employee.name || employee.employeeName}</div>
                        </div>
                        <div className="text-amber-400 font-semibold text-xs">{employee.hours}h</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mobileTab === 'employees' && (
            <div className="space-y-3">
              <h1 className="text-white text-lg font-bold">Employees</h1>

              {/* Engagement Trend Chart */}
              <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                <h3 className="text-white text-sm font-semibold mb-2">Engagement Trend</h3>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mobileTrendData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #374151', borderRadius: '8px', fontSize: '10px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Line type="monotone" dataKey="hours" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 3 }} />
                      <Line type="monotone" dataKey="employees" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-1 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-gray-400">Hours</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-gray-400">Employees</span>
                  </div>
                </div>
              </div>

              {/* Engagement Funnel - Compact */}
              {funnelData?.funnel && (
                <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                  <h3 className="text-white text-sm font-semibold mb-2">Engagement Funnel</h3>
                  <div className="space-y-2">
                    {funnelData.funnel.map((stage: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-10 text-right">
                          <span className="text-white font-bold text-sm">{stage.count}</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-gray-300 text-[10px] truncate">{stage.stage}</div>
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-0.5">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                              style={{ width: `${(stage.count / (funnelData.funnel[0]?.count || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-gray-400 text-[10px] w-10 text-right">
                          {Math.round((stage.count / (funnelData.funnel[0]?.count || 1)) * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Leaderboard - Compact Table */}
              <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                <h3 className="text-white text-sm font-semibold mb-2">Leaderboard</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 pb-1.5 font-medium">#</th>
                        <th className="text-left text-gray-400 pb-1.5 font-medium">Employee</th>
                        <th className="text-right text-gray-400 pb-1.5 font-medium">Hours</th>
                        <th className="text-right text-gray-400 pb-1.5 font-medium">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(csrData?.leaderboard || []).slice(0, 8).map((employee: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-700/50">
                          <td className="py-1.5">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-bold ${
                              idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600' :
                              idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                              idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                              'bg-gray-600'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-1.5 text-white truncate max-w-[120px]">{employee.name || employee.employeeName}</td>
                          <td className="py-1.5 text-amber-400 font-medium text-right">{employee.hours}h</td>
                          <td className="py-1.5 text-blue-400 text-right">{employee.points || employee.hours * 10}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {mobileTab === 'sdgs' && (
            <div className="space-y-3">
              <h1 className="text-white text-lg font-bold">SDG Impact</h1>

              {/* SDG Bar Chart */}
              {mobileBarData.length > 0 && (
                <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                  <h3 className="text-white text-sm font-semibold mb-2">Hours by SDG</h3>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mobileBarData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 8 }} angle={-45} textAnchor="end" height={40} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #374151', borderRadius: '8px', fontSize: '10px' }}
                          labelStyle={{ color: '#fff' }}
                          formatter={(value: number, name: string) => [`${value}h`, 'Hours']}
                        />
                        <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                          {mobileBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* SDG Radar with Commitments Overlay */}
              <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                <h3 className="text-white text-sm font-semibold mb-2">Commitment vs Progress</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={mobileRadarData} margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="sdg" tick={{ fill: '#9CA3AF', fontSize: 8 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#9CA3AF', fontSize: 7 }} />
                      <Radar name="Actual Hours" dataKey="hours" stroke="#10B981" fill="#10B981" fillOpacity={0.5} />
                      <Radar name="Projects" dataKey="projects" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #374151', borderRadius: '8px', fontSize: '10px' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-1 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-gray-400">Hours</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-gray-400">Projects</span>
                  </div>
                </div>
              </div>

              {/* SDG Commitments Grid */}
              {committedSDGs && committedSDGs.length > 0 && (
                <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                  <h3 className="text-white text-sm font-semibold mb-2">Committed SDGs</h3>
                  <div className="grid grid-cols-5 gap-1.5">
                    {committedSDGs.map((sdg: number) => {
                      const metric = sdgMetrics.find((m: any) => m.sdg === sdg);
                      return (
                        <div
                          key={sdg}
                          className="aspect-square rounded flex flex-col items-center justify-center text-white p-1"
                          style={{ backgroundColor: getSDGColor(sdg) }}
                        >
                          <span className="font-bold text-sm">{sdg}</span>
                          <span className="text-[7px] opacity-80">{metric?.totalHours || 0}h</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SDG Metrics Table */}
              <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                <h3 className="text-white text-sm font-semibold mb-2">SDG Metrics</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 pb-1.5 font-medium">SDG</th>
                        <th className="text-right text-gray-400 pb-1.5 font-medium">Hours</th>
                        <th className="text-right text-gray-400 pb-1.5 font-medium">Staff</th>
                        <th className="text-right text-gray-400 pb-1.5 font-medium">Proj</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sdgMetrics.slice(0, 8).map((metric: any) => (
                        <tr key={metric.sdg} className="border-b border-gray-700/50">
                          <td className="py-1.5">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold"
                                style={{ backgroundColor: getSDGColor(metric.sdg) }}
                              >
                                {metric.sdg}
                              </div>
                              <span className="text-gray-300 truncate max-w-[80px]">{getSDGName(metric.sdg)}</span>
                            </div>
                          </td>
                          <td className="py-1.5 text-white font-medium text-right">{metric.totalHours}</td>
                          <td className="py-1.5 text-emerald-400 text-right">{metric.uniqueEmployees}</td>
                          <td className="py-1.5 text-purple-400 text-right">{metric.projectsContributed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {mobileTab === 'reports' && (
            <div className="space-y-3">
              <h1 className="text-white text-lg font-bold">Reports</h1>

              {/* Summary Stats */}
              <div className="bg-gradient-to-br from-emerald-600/30 to-blue-600/30 rounded-lg p-3 border border-emerald-500/30">
                <h3 className="text-white text-sm font-semibold mb-2">Quick Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-white/10 rounded p-2">
                    <div className="text-gray-400">Total AIUs Earned</div>
                    <div className="text-teal-400 text-lg font-bold">{(csrData?.totalImpact || 0).toFixed(1)}</div>
                  </div>
                  <div className="bg-white/10 rounded p-2">
                    <div className="text-gray-400">SDGs Addressed</div>
                    <div className="text-white text-lg font-bold">{sdgMetrics.length}</div>
                  </div>
                  <div className="bg-white/10 rounded p-2">
                    <div className="text-gray-400">Avg Hours/Employee</div>
                    <div className="text-white text-lg font-bold">{displayActiveEmployees > 0 ? Math.round(displayTotalHours / displayActiveEmployees) : 0}</div>
                  </div>
                  <div className="bg-white/10 rounded p-2">
                    <div className="text-gray-400">Economic Value</div>
                    <div className="text-emerald-400 text-lg font-bold">${((csrData?.totalHours || displayTotalHours || 0) * 35 / 1000).toFixed(0)}K</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/csr-impact-reporting')}
                    className="w-full p-3 rounded-lg bg-gradient-to-r from-blue-600/30 to-blue-800/30 border border-blue-500/30 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Impact Report</div>
                        <div className="text-blue-300/70 text-[10px]">View detailed analytics</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-400 ml-auto" />
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/csr-reports-exports')}
                    className="w-full p-3 rounded-lg bg-gradient-to-r from-purple-600/30 to-purple-800/30 border border-purple-500/30 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Export Data</div>
                        <div className="text-purple-300/70 text-[10px]">Download reports</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-purple-400 ml-auto" />
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/employee-engagement-tab')}
                    className="w-full p-3 rounded-lg bg-gradient-to-r from-amber-600/30 to-amber-800/30 border border-amber-500/30 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Engagement Analytics</div>
                        <div className="text-amber-300/70 text-[10px]">Employee insights</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-400 ml-auto" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {mobileTab === 'settings' && (
            <div className="space-y-3">
              <h1 className="text-white text-lg font-bold">Settings</h1>

              <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/corporate-partner-profile-settings')}
                    className="w-full p-3 rounded-lg bg-white/5 border border-gray-600 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Profile Settings</div>
                        <div className="text-gray-400 text-[10px]">SDG commitments & company info</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/corporate-partner-profile-settings')}
                    className="w-full p-3 rounded-lg bg-white/5 border border-gray-600 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Organization</div>
                        <div className="text-gray-400 text-[10px]">Manage org settings</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Current User Info */}
              <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                <h3 className="text-white text-sm font-semibold mb-2">Account</h3>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {adminName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">{adminName}</div>
                    <div className="text-gray-400 text-[10px]">{user?.email}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Navigation - Compact */}
        <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-[#1a0a2e] via-[#3d1a5c] to-[#d35400] border-t border-white/10 px-1 py-1.5 max-w-[428px] mx-auto z-50">
          <div className="flex justify-around items-center">
            <button
              onClick={() => setMobileTab('overview')}
              className={`flex flex-col items-center py-1 px-2 rounded transition-all ${
                mobileTab === 'overview' ? 'text-white' : 'text-white/60'
              }`}
              data-testid="nav-overview"
            >
              <Home className={`w-4 h-4 mb-0.5 ${mobileTab === 'overview' ? 'text-amber-400' : ''}`} />
              <span className="text-[9px] font-medium">Home</span>
            </button>

            <button
              onClick={() => setMobileTab('employees')}
              className={`flex flex-col items-center py-1 px-2 rounded transition-all ${
                mobileTab === 'employees' ? 'text-white' : 'text-white/60'
              }`}
              data-testid="nav-employees"
            >
              <Users className={`w-4 h-4 mb-0.5 ${mobileTab === 'employees' ? 'text-amber-400' : ''}`} />
              <span className="text-[9px] font-medium">Team</span>
            </button>

            <button
              onClick={() => setMobileTab('sdgs')}
              className={`flex flex-col items-center py-1 px-2 rounded transition-all ${
                mobileTab === 'sdgs' ? 'text-white' : 'text-white/60'
              }`}
              data-testid="nav-sdgs"
            >
              <Target className={`w-4 h-4 mb-0.5 ${mobileTab === 'sdgs' ? 'text-amber-400' : ''}`} />
              <span className="text-[9px] font-medium">SDGs</span>
            </button>

            <button
              onClick={() => setMobileTab('reports')}
              className={`flex flex-col items-center py-1 px-2 rounded transition-all ${
                mobileTab === 'reports' ? 'text-white' : 'text-white/60'
              }`}
              data-testid="nav-reports"
            >
              <BarChart3 className={`w-4 h-4 mb-0.5 ${mobileTab === 'reports' ? 'text-amber-400' : ''}`} />
              <span className="text-[9px] font-medium">Reports</span>
            </button>

            <button
              onClick={() => setMobileTab('settings')}
              className={`flex flex-col items-center py-1 px-2 rounded transition-all ${
                mobileTab === 'settings' ? 'text-white' : 'text-white/60'
              }`}
              data-testid="nav-settings"
            >
              <Settings className={`w-4 h-4 mb-0.5 ${mobileTab === 'settings' ? 'text-amber-400' : ''}`} />
              <span className="text-[9px] font-medium">Settings</span>
            </button>
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#ffffff",
        overflow: "hidden",
      }}
    >
      {/* Top Header Bar - Gradient Theme matching Organization Dashboard */}
      <header
        style={{
          background: "linear-gradient(135deg, #1a0a2e 0%, #3d1a5c 50%, #5c2d6e 75%, #d35400 100%)",
          color: "white",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          height: "64px",
          boxShadow: "0 2px 16px rgba(26, 10, 46, 0.4)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Left: Synerxus Logo - Clickable to Landing Page */}
        <button
          onClick={() => navigate("/landing")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            paddingRight: "16px",
            borderRight: "1px solid rgba(255,255,255,0.2)",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          title="Go to landing page"
        >
          <img
            src={logoUrl}
            alt="Synerxus Logo"
            style={{ height: "32px", width: "auto" }}
          />
          <div
            style={{
              display: "flex",
              gap: "0",
              fontWeight: "700",
              fontSize: "16px",
              letterSpacing: "0.5px",
            }}
          >
            <span style={{ color: "#ffffff" }}>SYNER</span>
            <span style={{ color: "#FFB84D" }}>XUS</span>
          </div>
        </button>

        {/* Center: CSR Dashboard Title with Company Name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <span
            style={{ fontSize: "16px", fontWeight: "600", color: "#ffffff" }}
          >
            CSR Dashboard
          </span>
          <span style={{ fontSize: "16px", color: "#ffffff" }}>•</span>
          <Briefcase
            style={{ width: "18px", height: "18px", color: "#ffffff" }}
          />
          <span
            style={{ fontSize: "16px", fontWeight: "500", color: "#ffffff" }}
          >
            {companyName}
          </span>
        </div>

        {/* Right: Date and User Profile Dropdown */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            minWidth: "fit-content",
          }}
        >
          <span style={{ fontSize: "14px", color: "#ffffff", opacity: 0.9 }}>
            {currentDate}
          </span>
          <UserProfileDropdown />
        </div>
      </header>

      <div
        style={{ display: "flex", flex: 1, overflow: "hidden" }}
      >
        {/* Left Sidebar - 1/5 width (20%), Dark Navy */}
        <aside
          style={{
            width: "20%",
            background: "var(--glass-bg-dark)",
            backdropFilter: "var(--glass-blur)",
            color: "white",
            padding: "24px",
            flexShrink: 0,
            overflowY: "auto",
            borderRight: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <button
              onClick={() => navigate("/csr-dashboard")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "#1f2937",
                color: "#f97316",
                border: "1px solid #374151",
                fontWeight: "500",
                cursor: "pointer",
                textAlign: "left",
              }}
              data-testid="nav-dashboard"
            >
              <Home style={{ width: "20px", height: "20px" }} />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => navigate("/csr-impact-reporting")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                color: "#d1d5db",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1f2937";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#d1d5db";
              }}
              data-testid="nav-impact-report"
            >
              <BarChart3 style={{ width: "20px", height: "20px" }} />
              <span>Impact Reporting</span>
            </button>
            <button
              onClick={() => setSelectedMainTab("engagement")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor:
                  selectedMainTab === "engagement" ? "#1f2937" : "transparent",
                color: selectedMainTab === "engagement" ? "#f97316" : "#d1d5db",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontWeight: selectedMainTab === "engagement" ? "600" : "500",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (selectedMainTab !== "engagement") {
                  e.currentTarget.style.backgroundColor = "#1f2937";
                  e.currentTarget.style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedMainTab !== "engagement") {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#d1d5db";
                }
              }}
              data-testid="nav-engagement"
            >
              <Users style={{ width: "20px", height: "20px" }} />
              <span>Employee Engagement</span>
            </button>
            <button
              onClick={() => navigate("/project-portfolio")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                color: "#d1d5db",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1f2937";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#d1d5db";
              }}
              data-testid="nav-project-portfolio"
            >
              <Briefcase style={{ width: "20px", height: "20px" }} />
              <span>Project Portfolio</span>
            </button>
            <button
              onClick={() => navigate("/csr-reports-exports")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                color: "#d1d5db",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1f2937";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#d1d5db";
              }}
              data-testid="nav-reports"
            >
              <FileText style={{ width: "20px", height: "20px" }} />
              <span>Reports & Exports</span>
            </button>
            <button
              onClick={() => navigate("/corporate-partner-profile-settings")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                color: "#d1d5db",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1f2937";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#d1d5db";
              }}
              data-testid="nav-settings"
            >
              <Settings style={{ width: "20px", height: "20px" }} />
              <span>Settings</span>
            </button>
          </nav>
        </aside>

        {/* Main Content - 4/5 width (80%) */}
        <main
          style={{
            width: "80%",
            padding: "24px",
            backgroundColor: "#f9fafb",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            overflowY: "auto",
            overflowX: "hidden",
            paddingBottom: "48px",
            flex: 1,
          }}
        >
          {selectedMainTab === "engagement" && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <Users
                  style={{ width: "28px", height: "28px", color: "#1e3a8a" }}
                />
                <h1
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#111827",
                  }}
                >
                  Employee Engagement Hub
                </h1>
              </div>
              <EmployeeEngagementTab userId={userId} />
            </>
          )}
          {selectedMainTab === "overview" && (
            <div>
              {/* Corporate SDG Commitments Section - Top Priority Display */}
              {committedSDGs.length > 0 ? (
                <div
                  style={{
                    backgroundColor: "white",
                    border: "2px solid #1e3a8a",
                    borderRadius: "12px",
                    padding: "24px",
                    marginBottom: "24px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            backgroundColor: "#1e3a8a",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "20px",
                          }}
                        >
                          🎯
                        </div>
                        <div>
                          <h2
                            style={{
                              fontSize: "20px",
                              fontWeight: "700",
                              color: "#111827",
                              margin: 0,
                            }}
                          >
                            {csrData?.companyName || "Your Organization"}'s SDG Commitments
                          </h2>
                          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                            {selectedSDGFilters.length === 0
                              ? `Tracking progress across ${committedSDGs.length} committed Sustainable Development Goal${committedSDGs.length > 1 ? "s" : ""}`
                              : `Filtering by ${selectedSDGFilters.length} SDG${selectedSDGFilters.length > 1 ? "s" : ""} · Click any card to filter dashboard`
                            }
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {selectedSDGFilters.length > 0 && (
                          <button
                            onClick={clearAllFilters}
                            style={{
                              padding: "8px 16px",
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: "500",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#dc2626";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#ef4444";
                            }}
                          >
                            Clear Filters ({selectedSDGFilters.length})
                          </button>
                        )}
                        <button
                          onClick={() => navigate("/corporate-partner-profile-settings")}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "#1e3a8a",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "500",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#1e40af";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#1e3a8a";
                          }}
                          data-testid="btn-manage-sdg-commitments"
                        >
                          <Settings style={{ width: "14px", height: "14px" }} />
                          Manage Commitments
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* UN SDG Icon Buttons - Only Committed SDGs */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "12px",
                      justifyContent: "center",
                    }}
                  >
                    {displayedSDGsForFilters.map((sdgNum) => {
                      const sdgIcon = getSDGIcon(sdgNum);
                      const isSelected = selectedSDGFilters.includes(sdgNum);

                      return (
                        <button
                          key={sdgNum}
                          onClick={() => toggleSDGFilter(sdgNum)}
                          style={{
                            width: "120px",
                            height: "120px",
                            padding: 0,
                            border: isSelected ? "4px solid #111827" : "2px solid transparent",
                            borderRadius: "8px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: isSelected
                              ? "0 6px 16px rgba(0,0,0,0.3)"
                              : "0 2px 8px rgba(0,0,0,0.1)",
                            transform: isSelected ? "scale(1.05)" : "scale(1)",
                            overflow: "hidden",
                            position: "relative",
                            background: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.transform = "scale(1.05)";
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                            }
                          }}
                        >
                          <img
                            src={sdgIcon}
                            alt={`SDG ${sdgNum}: ${getSDGName(sdgNum)}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                          {isSelected && (
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(0,0,0,0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <div
                                style={{
                                  backgroundColor: "#111827",
                                  color: "white",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                }}
                              >
                                ✓ ACTIVE
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: "white",
                    border: "2px solid #1e3a8a",
                    borderRadius: "12px",
                    padding: "32px",
                    marginBottom: "24px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      backgroundColor: "#dbeafe",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "32px",
                      margin: "0 auto 16px",
                    }}
                  >
                    🎯
                  </div>
                  <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
                    Set Your SDG Commitments
                  </h3>
                  <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px", maxWidth: "500px", margin: "0 auto 24px" }}>
                    Your organization hasn't selected any UN Sustainable Development Goals yet.
                    Please visit your settings to choose the SDGs that align with your corporate social responsibility initiatives.
                  </p>
                  <button
                    onClick={() => navigate("/corporate-partner-profile-settings")}
                    style={{
                      padding: "12px 24px",
                      backgroundColor: "#1e3a8a",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#1e40af";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#1e3a8a";
                    }}
                  >
                    Go to Settings
                  </button>
                </div>
              )}

              {/* AI Insights Section - Standalone */}
              {suggestedSDGs.length > 0 && (
                <div
                  style={{
                    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                    border: "2px solid #f59e0b",
                    borderRadius: "12px",
                    padding: "24px",
                    marginBottom: "24px",
                    boxShadow: "0 4px 6px rgba(245,158,11,0.2)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
                    <div
                      style={{
                        fontSize: "32px",
                        lineHeight: "1",
                      }}
                    >
                      💡
                    </div>
                    <div style={{ flex: 1 }}>
                      <h2
                        style={{
                          fontSize: "18px",
                          fontWeight: "700",
                          color: "#92400e",
                          marginBottom: "8px",
                        }}
                      >
                        AI-Powered Insights: Emerging SDG Opportunities
                      </h2>
                      <p style={{ fontSize: "14px", color: "#78350f", marginBottom: "12px", lineHeight: "1.5" }}>
                        Your employees are actively working on <strong>{suggestedSDGs.length} SDG goal{suggestedSDGs.length > 1 ? "s" : ""}</strong>{" "}
                        that aren't part of your organization's official commitment. This represents grassroots engagement
                        that could inform your corporate CSR strategy.
                      </p>
                    </div>
                  </div>

                  {/* Suggested SDGs Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    {suggestedSDGs.map((sdgNum) => {
                      const sdgData = sdgMetrics.find(m => m.sdg === sdgNum);
                      const sdgColor = getSDGColor(sdgNum);
                      const employees = sdgData?.uniqueEmployees || 0;
                      const hours = sdgData?.totalHours || 0;

                      return (
                        <div
                          key={sdgNum}
                          onClick={() => {
                            setSelectedSDGFilters([sdgNum]);
                          }}
                          style={{
                            background: "white",
                            border: `2px solid ${sdgColor}`,
                            borderRadius: "8px",
                            padding: "14px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.03)";
                            e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                backgroundColor: sdgColor,
                                borderRadius: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "13px",
                                fontWeight: "bold",
                                color: "white",
                              }}
                            >
                              {sdgNum}
                            </div>
                            <div style={{ fontSize: "12px", fontWeight: "600", color: "#111827", flex: 1 }}>
                              {getSDGName(sdgNum)}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                            <div>
                              <div style={{ color: "#6b7280", fontSize: "10px" }}>Employees</div>
                              <div style={{ color: sdgColor, fontWeight: "700" }}>{employees}</div>
                            </div>
                            <div>
                              <div style={{ color: "#6b7280", fontSize: "10px" }}>Hours</div>
                              <div style={{ color: sdgColor, fontWeight: "700" }}>{hours}h</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "rgba(255,255,255,0.6)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#78350f",
                      fontStyle: "italic",
                      textAlign: "center",
                    }}
                  >
                    💡 <strong>Recommendation:</strong> Click on any SDG above to see detailed employee engagement
                    and consider adding it to your organization's primary commitments in your profile settings.
                  </div>
                </div>
              )}

              {/* Filters Bar - Positioned after SDG Commitments for data filtering */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "16px 24px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#1e3a8a" }}>
                    📊 Dashboard Filters:
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label style={{ fontSize: "14px", color: "#374151", fontWeight: "500" }}>
                      Time Period:
                    </label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value as "all" | "30d" | "90d" | "1y")}
                      style={{
                        padding: "8px 32px 8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        backgroundColor: "white",
                        fontSize: "14px",
                        cursor: "pointer",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 10px center",
                      }}
                      data-testid="select-time-period"
                    >
                      {TIME_PERIODS.map((period) => (
                        <option key={period.value} value={period.value}>
                          {period.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedSDGFilters.length > 0 && (
                    <div style={{ fontSize: "13px", color: "#6b7280", padding: "6px 12px", backgroundColor: "#dbeafe", borderRadius: "6px" }}>
                      {selectedSDGFilters.length} SDG{selectedSDGFilters.length > 1 ? "s" : ""} selected
                    </div>
                  )}
                </div>
                {(selectedSDGFilters.length > 0 || dateRange !== "all") && (
                  <button
                    onClick={clearAllFilters}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#dc2626";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#ef4444";
                    }}
                    data-testid="btn-clear-all-filters"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>

              {/* KPI Cards Row - 5 cards in dark navy with verified real-time metrics */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "12px",
                }}
              >
                <div
                  onClick={() => setSelectedKPI("hours")}
                  style={{
                    backgroundColor: "#1e3a8a",
                    color: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border:
                      selectedKPI === "hours" ? "2px solid #f97316" : "none",
                  }}
                  onMouseOver={(e) => (
                    (e.currentTarget.style.transform = "translateY(-4px)"),
                    (e.currentTarget.style.boxShadow =
                      "0 8px 12px -1px rgba(0, 0, 0, 0.2)")
                  )}
                  onMouseOut={(e) => (
                    (e.currentTarget.style.transform = "translateY(0)"),
                    (e.currentTarget.style.boxShadow =
                      "0 4px 6px -1px rgba(0, 0, 0, 0.1)")
                  )}
                  data-testid="kpi-total-hours"
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#d1d5db",
                      marginBottom: "8px",
                      fontWeight: "500",
                    }}
                  >
                    Total Hours Logged
                  </p>
                  <p style={{ fontSize: "30px", fontWeight: "bold" }}>
                    {displayTotalHours.toLocaleString()}
                  </p>
                  <p style={{ fontSize: "10px", color: "#93c5fd", marginTop: "4px" }}>
                    {selectedSDGFilters.length > 0
                      ? `Filtered from ${(csrData?.totalHours || 0).toLocaleString()} total`
                      : `$${(csrData?.kpiBreakdown?.hours?.economicValue || displayTotalHours * 35).toLocaleString()} value`
                    }
                  </p>
                </div>

                <div
                  onClick={() => setSelectedKPI("employees")}
                  style={{
                    backgroundColor: "#1e3a8a",
                    color: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border:
                      selectedKPI === "employees"
                        ? "2px solid #f97316"
                        : "none",
                  }}
                  onMouseOver={(e) => (
                    (e.currentTarget.style.transform = "translateY(-4px)"),
                    (e.currentTarget.style.boxShadow =
                      "0 8px 12px -1px rgba(0, 0, 0, 0.2)")
                  )}
                  onMouseOut={(e) => (
                    (e.currentTarget.style.transform = "translateY(0)"),
                    (e.currentTarget.style.boxShadow =
                      "0 4px 6px -1px rgba(0, 0, 0, 0.1)")
                  )}
                  data-testid="kpi-employees"
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#d1d5db",
                      marginBottom: "8px",
                      fontWeight: "500",
                    }}
                  >
                    Employees Engaged
                  </p>
                  <p style={{ fontSize: "30px", fontWeight: "bold" }}>
                    {displayActiveEmployees}
                  </p>
                  <p style={{ fontSize: "10px", color: "#93c5fd", marginTop: "4px" }}>
                    {selectedSDGFilters.length > 0
                      ? `Filtered from ${csrData?.activeEmployees || 0} total`
                      : `Avg ${csrData?.kpiBreakdown?.employees?.averageHoursPerEmployee || 0} hrs/employee`
                    }
                  </p>
                </div>

                <div
                  onClick={() => setSelectedKPI("projects")}
                  style={{
                    backgroundColor: "#1e3a8a",
                    color: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border:
                      selectedKPI === "projects" ? "2px solid #f97316" : "none",
                  }}
                  onMouseOver={(e) => (
                    (e.currentTarget.style.transform = "translateY(-4px)"),
                    (e.currentTarget.style.boxShadow =
                      "0 8px 12px -1px rgba(0, 0, 0, 0.2)")
                  )}
                  onMouseOut={(e) => (
                    (e.currentTarget.style.transform = "translateY(0)"),
                    (e.currentTarget.style.boxShadow =
                      "0 4px 6px -1px rgba(0, 0, 0, 0.1)")
                  )}
                  data-testid="kpi-projects"
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#d1d5db",
                      marginBottom: "8px",
                      fontWeight: "500",
                    }}
                  >
                    Active Projects
                  </p>
                  <p style={{ fontSize: "30px", fontWeight: "bold" }}>
                    {csrData?.kpiBreakdown?.projects?.activeProjects || displayProjectsCompleted}
                  </p>
                  <p style={{ fontSize: "10px", color: "#93c5fd", marginTop: "4px" }}>
                    {selectedSDGFilters.length > 0
                      ? `Filtered from ${csrData?.projectsCompleted || 0} total`
                      : `${csrData?.kpiBreakdown?.projects?.regionsServed || 0} regions served`
                    }
                  </p>
                </div>

                <div
                  onClick={() => setSelectedKPI("sdg")}
                  style={{
                    backgroundColor: "#1e3a8a",
                    color: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border:
                      selectedKPI === "sdg" ? "2px solid #f97316" : "none",
                  }}
                  onMouseOver={(e) => (
                    (e.currentTarget.style.transform = "translateY(-4px)"),
                    (e.currentTarget.style.boxShadow =
                      "0 8px 12px -1px rgba(0, 0, 0, 0.2)")
                  )}
                  onMouseOut={(e) => (
                    (e.currentTarget.style.transform = "translateY(0)"),
                    (e.currentTarget.style.boxShadow =
                      "0 4px 6px -1px rgba(0, 0, 0, 0.1)")
                  )}
                  data-testid="kpi-sdg-delta"
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#d1d5db",
                      marginBottom: "8px",
                      fontWeight: "500",
                    }}
                  >
                    Active SDGs
                  </p>
                  <p style={{ fontSize: "28px", fontWeight: "bold" }}>
                    {sdgMetrics.filter((m: any) => m.totalHours > 0).length}
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "normal",
                        color: "#d1d5db",
                        marginLeft: "4px",
                      }}
                    >
                      of 17
                    </span>
                  </p>
                  <p style={{ fontSize: "10px", color: "#93c5fd", marginTop: "4px" }}>
                    {(csrData?.sdgScoreDelta || 0) >= 0 ? "+" : ""}{csrData?.sdgScoreDelta || 0}% vs last quarter
                  </p>
                </div>

                {/* 5th KPI: Total Volunteers */}
                <div
                  onClick={() => setSelectedKPI("volunteers")}
                  style={{
                    backgroundColor: "#1e3a8a",
                    color: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border:
                      selectedKPI === "volunteers" ? "2px solid #f97316" : "none",
                  }}
                  onMouseOver={(e) => (
                    (e.currentTarget.style.transform = "translateY(-4px)"),
                    (e.currentTarget.style.boxShadow =
                      "0 8px 12px -1px rgba(0, 0, 0, 0.2)")
                  )}
                  onMouseOut={(e) => (
                    (e.currentTarget.style.transform = "translateY(0)"),
                    (e.currentTarget.style.boxShadow =
                      "0 4px 6px -1px rgba(0, 0, 0, 0.1)")
                  )}
                  data-testid="kpi-volunteers"
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#d1d5db",
                      marginBottom: "8px",
                      fontWeight: "500",
                    }}
                  >
                    Employee Volunteers
                  </p>
                  <p style={{ fontSize: "28px", fontWeight: "bold" }}>
                    {csrData?.activeEmployees || 0}
                  </p>
                  <p style={{ fontSize: "10px", color: "#93c5fd", marginTop: "4px" }}>
                    {csrData?.kpiBreakdown?.employees?.engagementRate || 0}% engagement rate
                  </p>
                </div>

                {/* 6th KPI: AIUs Earned */}
                <div
                  onClick={() => setSelectedKPI("aiu")}
                  style={{
                    backgroundColor: "#0d5f52",
                    color: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border:
                      selectedKPI === "aiu" ? "2px solid #f97316" : "none",
                  }}
                  onMouseOver={(e) => (
                    (e.currentTarget.style.transform = "translateY(-4px)"),
                    (e.currentTarget.style.boxShadow =
                      "0 8px 12px -1px rgba(0, 0, 0, 0.2)")
                  )}
                  onMouseOut={(e) => (
                    (e.currentTarget.style.transform = "translateY(0)"),
                    (e.currentTarget.style.boxShadow =
                      "0 4px 6px -1px rgba(0, 0, 0, 0.1)")
                  )}
                  data-testid="kpi-aiu"
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#a7f3d0",
                      marginBottom: "8px",
                      fontWeight: "500",
                    }}
                  >
                    AIUs Earned
                  </p>
                  <p style={{ fontSize: "28px", fontWeight: "bold" }}>
                    {(csrData?.totalImpact || 0).toFixed(1)}
                  </p>
                  <p style={{ fontSize: "10px", color: "#6ee7b7", marginTop: "4px" }}>
                    Attributable Impact Units
                  </p>
                </div>
              </div>

              {/* Analytics Grid - 2x2 layout (responsive) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                  gap: "24px",
                  marginTop: "24px",
                }}
              >
                {/* Row 1, Col 1: SDG Alignment Dashboard - Radar Chart View */}
                <div
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    minHeight: "520px",
                  }}
                  data-testid="chart-sdg-alignment"
                >
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0 }}>
                        SDG Alignment Radar
                      </h3>
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0 0" }}>
                        Corporate commitments vs. employee activity
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#6b7280" }}>
                        <div style={{ width: "12px", height: "12px", backgroundColor: "#3b82f6", borderRadius: "2px", opacity: 0.3 }} />
                        Commitment
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#6b7280" }}>
                        <div style={{ width: "12px", height: "12px", backgroundColor: "#10b981", borderRadius: "2px" }} />
                        Active
                      </div>
                    </div>
                  </div>

                  {/* KPI Buttons Row - 5 metrics */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginBottom: "16px" }}>
                    {/* Total Hours */}
                    <button
                      onClick={() => setShowTotalHoursModal(true)}
                      style={{
                        backgroundColor: "#eff6ff",
                        borderRadius: "10px",
                        padding: "12px 8px",
                        textAlign: "center",
                        border: "2px solid transparent",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      <Clock style={{ width: "16px", height: "16px", color: "#3b82f6", margin: "0 auto 4px" }} />
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#1e40af", margin: 0 }}>{committedSDGHours.toLocaleString()}</p>
                      <p style={{ fontSize: "9px", color: "#3b82f6", margin: "2px 0 0 0", fontWeight: "500" }}>TOTAL HOURS</p>
                      <p style={{ fontSize: "8px", color: "#6b7280", margin: "2px 0 0 0" }}>
                        {committedSDGHours > 0 ? `${Math.round(committedSDGHours / Math.max(1, committedSDGEmployees))} avg/emp` : "—"}
                      </p>
                    </button>

                    {/* Employees Engaged */}
                    <button
                      onClick={() => setShowEmployeesModal(true)}
                      style={{
                        backgroundColor: "#f0fdf4",
                        borderRadius: "10px",
                        padding: "12px 8px",
                        textAlign: "center",
                        border: "2px solid transparent",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22c55e"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      <Users style={{ width: "16px", height: "16px", color: "#22c55e", margin: "0 auto 4px" }} />
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#166534", margin: 0 }}>{committedSDGEmployees}</p>
                      <p style={{ fontSize: "9px", color: "#22c55e", margin: "2px 0 0 0", fontWeight: "500" }}>ENGAGED</p>
                      <p style={{ fontSize: "8px", color: "#6b7280", margin: "2px 0 0 0" }}>
                        {csrData?.activeEmployees ? `${Math.round((committedSDGEmployees / csrData.activeEmployees) * 100)}% of total` : "—"}
                      </p>
                    </button>

                    {/* Active Projects */}
                    <button
                      onClick={() => setShowActiveSDGsModal(true)}
                      style={{
                        backgroundColor: "#fef3c7",
                        borderRadius: "10px",
                        padding: "12px 8px",
                        textAlign: "center",
                        border: "2px solid transparent",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      <FolderKanban style={{ width: "16px", height: "16px", color: "#f59e0b", margin: "0 auto 4px" }} />
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#92400e", margin: 0 }}>{committedSDGProjects}</p>
                      <p style={{ fontSize: "9px", color: "#f59e0b", margin: "2px 0 0 0", fontWeight: "500" }}>ACTIVE PROJECTS</p>
                      <p style={{ fontSize: "8px", color: "#6b7280", margin: "2px 0 0 0" }}>
                        {committedSDGProjects > 0 ? `${Math.round(committedSDGHours / committedSDGProjects)} hrs/proj` : "—"}
                      </p>
                    </button>

                    {/* Active SDGs - Enhanced with SDG numbers and titles */}
                    <button
                      onClick={() => setShowActiveSDGsModal(true)}
                      style={{
                        backgroundColor: "#fae8ff",
                        borderRadius: "10px",
                        padding: "12px 8px",
                        textAlign: "center",
                        border: "2px solid transparent",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        minHeight: "120px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-start",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#a855f7"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      <Target style={{ width: "16px", height: "16px", color: "#a855f7", marginBottom: "4px" }} />
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#7e22ce", margin: 0 }}>{activeCommittedSDGs}/{committedSDGs.length}</p>
                      <p style={{ fontSize: "9px", color: "#a855f7", margin: "2px 0 4px 0", fontWeight: "500" }}>ACTIVE SDGs</p>
                      {/* SDG chips showing numbers and short names */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", justifyContent: "center", maxWidth: "100%" }}>
                        {committedSDGs.slice(0, 4).map((sdgNum: number) => {
                          const sdgData = sdgMetrics.find((m: any) => m.sdg === sdgNum);
                          const isActive = sdgData && sdgData.totalHours > 0;
                          return (
                            <div
                              key={sdgNum}
                              style={{
                                fontSize: "7px",
                                fontWeight: "600",
                                padding: "2px 4px",
                                borderRadius: "4px",
                                backgroundColor: isActive ? getSDGColor(sdgNum) : "#e5e7eb",
                                color: isActive ? "white" : "#9ca3af",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "60px",
                              }}
                              title={`SDG ${sdgNum}: ${getSDGName(sdgNum)}`}
                            >
                              {sdgNum}. {getSDGName(sdgNum).split(" ")[0]}
                            </div>
                          );
                        })}
                        {committedSDGs.length > 4 && (
                          <div style={{ fontSize: "7px", color: "#6b7280", padding: "2px 4px" }}>
                            +{committedSDGs.length - 4}
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Volunteers */}
                    <button
                      onClick={() => setShowEmployeesModal(true)}
                      style={{
                        backgroundColor: "#fef2f2",
                        borderRadius: "10px",
                        padding: "12px 8px",
                        textAlign: "center",
                        border: "2px solid transparent",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      <Heart style={{ width: "16px", height: "16px", color: "#ef4444", margin: "0 auto 4px" }} />
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#dc2626", margin: 0 }}>
                        {new Set(sdgMetrics.flatMap((m: any) => safeMap(m.employees, (emp: any) => emp.email))).size}
                      </p>
                      <p style={{ fontSize: "9px", color: "#ef4444", margin: "2px 0 0 0", fontWeight: "500" }}>VOLUNTEERS</p>
                      <p style={{ fontSize: "8px", color: "#6b7280", margin: "2px 0 0 0" }}>
                        all SDGs
                      </p>
                    </button>
                  </div>

                  {/* Radar Chart */}
                  <div style={{ flex: 1, minHeight: "280px" }}>
                    {committedSDGs.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          data={committedSDGs.map((sdgNum: number) => {
                            const metric = sdgMetrics.find(m => m.sdg === sdgNum);
                            const maxHours = Math.max(...sdgMetrics.filter(m => committedSDGs.includes(m.sdg)).map(m => m.totalHours || 0), 1);
                            return {
                              sdg: `SDG ${sdgNum}`,
                              fullName: getSDGName(sdgNum),
                              commitment: 100, // Full commitment shown as baseline
                              activity: metric ? Math.round((metric.totalHours / maxHours) * 100) : 0,
                              hours: metric?.totalHours || 0,
                              employees: metric?.uniqueEmployees || 0,
                              projects: metric?.projectsContributed || 0,
                            };
                          })}
                          margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                        >
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis
                            dataKey="sdg"
                            tick={{ fontSize: 10, fill: "#374151" }}
                            tickLine={false}
                          />
                          <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tick={{ fontSize: 9, fill: "#9ca3af" }}
                            tickCount={5}
                          />
                          <Radar
                            name="Commitment"
                            dataKey="commitment"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.15}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                          />
                          <Radar
                            name="Activity"
                            dataKey="activity"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.4}
                            strokeWidth={2}
                          />
                          <Tooltip
                            content={({ payload, label }) => {
                              if (payload && payload.length > 0) {
                                const data = payload[0].payload;
                                return (
                                  <div style={{
                                    backgroundColor: "white",
                                    padding: "12px",
                                    borderRadius: "8px",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                    border: "1px solid #e5e7eb",
                                  }}>
                                    <p style={{ fontWeight: "bold", color: "#111827", margin: "0 0 8px 0", fontSize: "13px" }}>{data.fullName}</p>
                                    <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0" }}>Hours: <span style={{ fontWeight: "600", color: "#111827" }}>{data.hours.toLocaleString()}</span></p>
                                    <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0" }}>Employees: <span style={{ fontWeight: "600", color: "#111827" }}>{data.employees}</span></p>
                                    <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0" }}>Projects: <span style={{ fontWeight: "600", color: "#111827" }}>{data.projects}</span></p>
                                    <p style={{ fontSize: "12px", color: data.activity > 0 ? "#10b981" : "#ef4444", margin: "8px 0 0 0", fontWeight: "600" }}>
                                      {data.activity > 0 ? `${data.activity}% active` : "No activity yet"}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af" }}>
                        <div style={{ textAlign: "center" }}>
                          <Target style={{ width: "40px", height: "40px", margin: "0 auto 12px", opacity: 0.5 }} />
                          <p style={{ fontSize: "14px", fontWeight: "500" }}>No SDG commitments set</p>
                          <p style={{ fontSize: "12px" }}>Go to Settings to add your corporate SDG commitments</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Insights + Expansion Banner */}
                  <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                    {/* AI Insight */}
                    <div style={{ flex: 1, padding: "10px 12px", backgroundColor: "#f0f9ff", borderRadius: "8px", borderLeft: "3px solid #3b82f6" }}>
                      <p style={{ fontSize: "10px", fontWeight: "600", color: "#1e40af", marginBottom: "4px" }}>✨ AI INSIGHT</p>
                      <p style={{ fontSize: "11px", color: "#334155", lineHeight: "1.4", margin: 0 }}>
                        {(() => {
                          const activeCommitted = sdgMetrics.filter((m: any) => committedSDGs.includes(m.sdg) && m.totalHours > 0);
                          const topCommitted = activeCommitted.sort((a: any, b: any) => b.totalHours - a.totalHours)[0];
                          if (committedSDGs.length === 0) return "Set SDG commitments to unlock insights.";
                          if (committedSDGHours === 0) return `${committedSDGs.length} SDGs committed. Waiting for employee activity.`;
                          if (topCommitted) return `Top: ${getSDGName(topCommitted.sdg)} (${topCommitted.totalHours} hrs). ${activeCommittedSDGs}/${committedSDGs.length} SDGs active.`;
                          return `${committedSDGEmployees} employees, ${committedSDGHours} hours.`;
                        })()}
                      </p>
                    </div>

                    {/* Expansion Opportunity */}
                    {employeeActivityOutsideCommitments.length > 0 && (
                      <button
                        onClick={() => setShowExpansionInsightsModal(true)}
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          backgroundColor: "#fef3c7",
                          borderRadius: "8px",
                          borderLeft: "3px solid #f59e0b",
                          border: "1px solid #fcd34d",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fde68a"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fef3c7"; }}
                      >
                        <p style={{ fontSize: "10px", fontWeight: "600", color: "#92400e", marginBottom: "4px" }}>💡 EXPAND</p>
                        <p style={{ fontSize: "11px", color: "#78350f", lineHeight: "1.4", margin: 0 }}>
                          {employeeActivityOutsideCommitments.length} SDGs outside commitments. Top: {employeeActivityOutsideCommitments[0]?.name}
                        </p>
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 1, Col 2: Geographic Impact by Region - Enhanced Map */}
                <div
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "520px",
                  }}
                  data-testid="chart-geographic-impact"
                >
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                        <MapPin style={{ width: "18px", height: "18px", color: "#3b82f6" }} />
                        Global Project Impact
                      </h3>
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0 0" }}>
                        Active projects and volunteer locations worldwide
                      </p>
                    </div>
                  </div>

                  {/* Map Stats Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ backgroundColor: "#eff6ff", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#1e40af", margin: 0 }}>
                        {filteredProjectLocations.length}
                      </p>
                      <p style={{ fontSize: "9px", color: "#3b82f6", margin: "2px 0 0 0", fontWeight: "500" }}>PROJECTS</p>
                    </div>
                    <div style={{ backgroundColor: "#f0fdf4", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#166534", margin: 0 }}>
                        {filteredProjectLocations.reduce((sum, p) => sum + (p.employees || 0), 0)}
                      </p>
                      <p style={{ fontSize: "9px", color: "#22c55e", margin: "2px 0 0 0", fontWeight: "500" }}>VOLUNTEERS</p>
                    </div>
                    <div style={{ backgroundColor: "#fef3c7", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#92400e", margin: 0 }}>
                        {filteredProjectLocations.reduce((sum, p) => sum + (p.hours || 0), 0).toLocaleString()}
                      </p>
                      <p style={{ fontSize: "9px", color: "#f59e0b", margin: "2px 0 0 0", fontWeight: "500" }}>HOURS</p>
                    </div>
                    <div style={{ backgroundColor: "#fae8ff", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#7e22ce", margin: 0 }}>
                        {new Set(filteredProjectLocations.map(p => p.region).filter(Boolean)).size}
                      </p>
                      <p style={{ fontSize: "9px", color: "#a855f7", margin: "2px 0 0 0", fontWeight: "500" }}>REGIONS</p>
                    </div>
                  </div>

                  {/* Filters Row */}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
                    <select
                      value={selectedMapRegion}
                      onChange={(e) => setSelectedMapRegion(e.target.value)}
                      style={{
                        padding: "6px 12px",
                        fontSize: "11px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        backgroundColor: selectedMapRegion !== "all" ? "#dbeafe" : "white",
                        color: "#374151",
                        cursor: "pointer",
                      }}
                    >
                      <option value="all">All Regions</option>
                      {projectRegions.map((region: string) => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                    <select
                      value={selectedMapStatus}
                      onChange={(e) => setSelectedMapStatus(e.target.value)}
                      style={{
                        padding: "6px 12px",
                        fontSize: "11px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        backgroundColor: selectedMapStatus !== "all" ? "#dbeafe" : "white",
                        color: "#374151",
                        cursor: "pointer",
                      }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="sponsored">Sponsored</option>
                      <option value="completed">Completed</option>
                    </select>
                    {(selectedMapRegion !== "all" || selectedMapStatus !== "all") && (
                      <button
                        onClick={() => { setSelectedMapRegion("all"); setSelectedMapStatus("all"); }}
                        style={{
                          padding: "6px 12px",
                          fontSize: "10px",
                          borderRadius: "6px",
                          border: "none",
                          backgroundColor: "#fee2e2",
                          color: "#991b1b",
                          cursor: "pointer",
                        }}
                      >
                        Clear Filters
                      </button>
                    )}
                    <div style={{ marginLeft: "auto", display: "flex", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#6b7280" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#1e3a8a" }} />
                        Active ({filteredProjectLocations.filter(p => p.status === "active").length})
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#6b7280" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f97316" }} />
                        Sponsored ({filteredProjectLocations.filter(p => p.status === "sponsored").length})
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#6b7280" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
                        Completed ({filteredProjectLocations.filter(p => p.status === "completed").length})
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderRadius: "8px",
                      overflow: "hidden",
                      position: "relative",
                      backgroundColor: "#0f172a",
                      minHeight: "280px",
                    }}
                  >
                    {filteredProjectLocations.length > 0 ? (
                      <MapContainer
                        center={[20, 0]}
                        zoom={2}
                        style={{ width: "100%", height: "100%" }}
                        data-testid="geographic-map"
                      >
                        <TileLayer
                          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                          attribution="&copy; OpenStreetMap contributors, &copy; CartoDB"
                        />
                        {filteredProjectLocations.map((project) => {
                          const statusColor =
                            project.status === "active"
                              ? "#1e3a8a"
                              : project.status === "completed"
                                ? "#22c55e"
                                : "#f97316";

                          // Create custom icon for each marker
                          const customIcon = L.divIcon({
                            html: `<div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background-color: ${statusColor}; color: white; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                          ${project.employees}
                        </div>`,
                            className: "custom-marker",
                            iconSize: [40, 40],
                            iconAnchor: [20, 20],
                            popupAnchor: [0, -20],
                          });

                          return (
                            <Marker
                              key={project.id}
                              position={[project.lat, project.lng]}
                              icon={customIcon}
                              data-testid={`map-marker-${project.id}`}
                            >
                              <Popup>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    minWidth: "200px",
                                  }}
                                >
                                  <p
                                    style={{
                                      fontWeight: "600",
                                      margin: "0 0 4px 0",
                                      color: "#111827",
                                    }}
                                  >
                                    {project.name}
                                  </p>
                                  <p
                                    style={{
                                      margin: "2px 0",
                                      color: "#6b7280",
                                    }}
                                  >
                                    📍 {project.region}
                                  </p>
                                  <p
                                    style={{
                                      margin: "2px 0",
                                      color: "#6b7280",
                                    }}
                                  >
                                    👥 {project.employees} employee
                                    {project.employees !== 1 ? "s" : ""}
                                  </p>
                                  <p
                                    style={{
                                      margin: "2px 0",
                                      color: "#6b7280",
                                    }}
                                  >
                                    ⏱️ {project.hours.toLocaleString()} hours
                                  </p>
                                  <p
                                    style={{
                                      margin: "4px 0 0 0",
                                      padding: "4px 0 0 0",
                                      borderTop: "1px solid #e5e7eb",
                                      color: "#1e3a8a",
                                      fontWeight: "600",
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    Status: {project.status}
                                  </p>
                                </div>
                              </Popup>
                            </Marker>
                          );
                        })}
                      </MapContainer>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          color: "#9ca3af",
                          fontSize: "13px",
                        }}
                      >
                        No project locations mapped yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2, Col 1: Employee Engagement Funnel - Enhanced Visual */}
                <div
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    padding: "20px",
                  }}
                  data-testid="chart-employee-funnel"
                >
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                        <Activity style={{ width: "18px", height: "18px", color: "#8b5cf6" }} />
                        Employee Engagement Funnel
                      </h3>
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0 0" }}>
                        Track employee journey from signup to top performer
                      </p>
                    </div>
                  </div>

                  {funnelData?.funnel ? (
                    <div>
                      {/* Funnel Summary Stats */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
                        <div style={{ backgroundColor: "#f0fdf4", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                          <p style={{ fontSize: "20px", fontWeight: "bold", color: "#166534", margin: 0 }}>
                            {funnelData.funnel[0]?.count || 0}
                          </p>
                          <p style={{ fontSize: "9px", color: "#22c55e", margin: "2px 0 0 0", fontWeight: "500" }}>TOTAL ENROLLED</p>
                        </div>
                        <div style={{ backgroundColor: "#eff6ff", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                          <p style={{ fontSize: "20px", fontWeight: "bold", color: "#1e40af", margin: 0 }}>
                            {funnelData.conversion?.toActive || 0}%
                          </p>
                          <p style={{ fontSize: "9px", color: "#3b82f6", margin: "2px 0 0 0", fontWeight: "500" }}>TO ACTIVE</p>
                        </div>
                        <div style={{ backgroundColor: "#fef3c7", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                          <p style={{ fontSize: "20px", fontWeight: "bold", color: "#92400e", margin: 0 }}>
                            {funnelData.conversion?.toTopPerformers || 0}%
                          </p>
                          <p style={{ fontSize: "9px", color: "#f59e0b", margin: "2px 0 0 0", fontWeight: "500" }}>TOP PERFORMERS</p>
                        </div>
                      </div>

                      {/* Visual Funnel - Enhanced Crisp Design */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "8px 0" }}>
                        {funnelData.funnel.map((stage: any, idx: number) => {
                          const maxCount = funnelData.funnel[0]?.count || 1;
                          const widthPercent = Math.max(25, (stage.count / maxCount) * 100);
                          const funnelColors = [
                            { bg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", solid: "#3b82f6", shadow: "rgba(59, 130, 246, 0.4)" },
                            { bg: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", solid: "#8b5cf6", shadow: "rgba(139, 92, 246, 0.4)" },
                            { bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)", solid: "#10b981", shadow: "rgba(16, 185, 129, 0.4)" },
                            { bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", solid: "#f59e0b", shadow: "rgba(245, 158, 11, 0.4)" },
                            { bg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", solid: "#ef4444", shadow: "rgba(239, 68, 68, 0.4)" },
                          ];
                          const color = funnelColors[idx % funnelColors.length];

                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setSelectedFunnelStage(idx);
                                setShowFunnelModal(true);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                cursor: "pointer",
                                padding: "2px 0",
                              }}
                            >
                              {/* Funnel Bar - Crisp with gradient and shadow */}
                              <div
                                style={{
                                  width: `${widthPercent}%`,
                                  minWidth: "120px",
                                  background: color.bg,
                                  borderRadius: idx === 0 ? "10px 10px 6px 6px" : idx === funnelData.funnel.length - 1 ? "6px 6px 10px 10px" : "6px",
                                  padding: "12px 16px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  transition: "all 0.25s ease-out",
                                  marginLeft: `${(100 - widthPercent) / 2}%`,
                                  boxShadow: `0 2px 8px ${color.shadow}, inset 0 1px 0 rgba(255,255,255,0.15)`,
                                  border: "1px solid rgba(255,255,255,0.1)",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = "scale(1.03) translateY(-1px)";
                                  e.currentTarget.style.boxShadow = `0 6px 20px ${color.shadow}, inset 0 1px 0 rgba(255,255,255,0.2)`;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "scale(1) translateY(0)";
                                  e.currentTarget.style.boxShadow = `0 2px 8px ${color.shadow}, inset 0 1px 0 rgba(255,255,255,0.15)`;
                                }}
                              >
                                <span style={{
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "white",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                                  letterSpacing: "0.02em"
                                }}>
                                  {stage.stage}
                                </span>
                                <span style={{
                                  fontSize: "15px",
                                  fontWeight: "700",
                                  color: "white",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                                  backgroundColor: "rgba(255,255,255,0.2)",
                                  padding: "2px 10px",
                                  borderRadius: "12px",
                                  minWidth: "32px",
                                  textAlign: "center"
                                }}>
                                  {stage.count}
                                </span>
                              </div>

                              {/* Drop-off indicator - Enhanced */}
                              {idx > 0 && (
                                <div style={{ minWidth: "65px", textAlign: "right" }}>
                                  <span style={{
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    color: stage.dropoff > 30 ? "#dc2626" : stage.dropoff > 15 ? "#d97706" : "#059669",
                                    backgroundColor: stage.dropoff > 30 ? "#fef2f2" : stage.dropoff > 15 ? "#fffbeb" : "#ecfdf5",
                                    padding: "4px 10px",
                                    borderRadius: "12px",
                                    border: `1px solid ${stage.dropoff > 30 ? "#fecaca" : stage.dropoff > 15 ? "#fde68a" : "#a7f3d0"}`,
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                                  }}>
                                    -{stage.dropoff}%
                                  </span>
                                </div>
                              )}
                              {idx === 0 && <div style={{ minWidth: "65px" }} />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Action Insights */}
                      <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #8b5cf6" }}>
                        <p style={{ fontSize: "10px", fontWeight: "600", color: "#6d28d9", marginBottom: "4px" }}>ENGAGEMENT INSIGHT</p>
                        <p style={{ fontSize: "11px", color: "#334155", margin: 0, lineHeight: "1.4" }}>
                          {(() => {
                            const highestDropoff = funnelData.funnel
                              .filter((s: any) => s.dropoff)
                              .sort((a: any, b: any) => b.dropoff - a.dropoff)[0];
                            if (highestDropoff && highestDropoff.dropoff > 20) {
                              return `Highest drop-off at "${highestDropoff.stage}" stage (${highestDropoff.dropoff}%). Consider targeted engagement campaigns.`;
                            }
                            return `Healthy funnel conversion! ${funnelData.conversion?.toTopPerformers || 0}% reach top performer status.`;
                          })()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#9ca3af" }}>
                      <div style={{ textAlign: "center" }}>
                        <Activity style={{ width: "40px", height: "40px", margin: "0 auto 12px", opacity: 0.5 }} />
                        <p style={{ fontSize: "13px" }}>Loading funnel data...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 2, Col 2: Pending Admin Actions */}
                <div
                  onClick={() => setShowAdminModal(true)}
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    padding: "16px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0,0,0,0.15)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.boxShadow =
                      "0 1px 3px rgba(0,0,0,0.1)")
                  }
                  data-testid="chart-pending-actions"
                >
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#111827",
                      marginBottom: "12px",
                    }}
                  >
                    Pending Admin Actions
                  </h3>
                  {adminActionsData ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "16px",
                          marginBottom: "8px",
                        }}
                      >
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "18px",
                              fontWeight: "bold",
                              color: "#dc2626",
                            }}
                          >
                            {adminActionsData.reviews.count}
                          </div>
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            Reviews
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "18px",
                              fontWeight: "bold",
                              color: "#f59e0b",
                            }}
                          >
                            {adminActionsData.insights.count}
                          </div>
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            Insights
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "18px",
                              fontWeight: "bold",
                              color: "#f97316",
                            }}
                          >
                            {adminActionsData.flagged.count}
                          </div>
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            Flagged
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          textAlign: "center",
                          padding: "8px 0",
                          borderTop: "1px solid #e5e7eb",
                        }}
                      >
                        {adminActionsData.totalActions} total actions • Click to
                        review
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "#9ca3af", fontSize: "13px" }}>
                      Loading actions...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Footer inside main content for scrolling */}
          <div style={{ marginTop: "48px" }}>
            <Footer />
          </div>
        </main>
      </div>

      {/* KPI Detail Modal */}
      {selectedKPI && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setSelectedKPI(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "32px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#111827",
                }}
              >
                {selectedKPI === "hours" && "Total Hours Logged"}
                {selectedKPI === "employees" && "Employees Engaged"}
                {selectedKPI === "projects" && "Projects Completed"}
                {selectedKPI === "sdg" && "Active SDGs"}
                {selectedKPI === "volunteers" && "Employee Volunteers"}
              </h2>
              <button
                onClick={() => setSelectedKPI(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X
                  style={{ width: "24px", height: "24px", color: "#6b7280" }}
                />
              </button>
            </div>

            {selectedKPI === "hours" && (
              <div style={{ color: "#374151" }}>
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#1e3a8a",
                    marginBottom: "16px",
                  }}
                >
                  {(
                    csrData?.kpiBreakdown?.hours?.total || csrData?.totalHours || 0
                  ).toLocaleString()}{" "}
                  hours
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    marginBottom: "16px",
                    lineHeight: "1.6",
                  }}
                >
                  Total employee hours contributed to CSR-sponsored initiatives.
                </p>
                <div
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: "16px",
                    borderRadius: "8px",
                    marginTop: "16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "8px",
                    }}
                  >
                    Employee Hours Summary:
                  </p>
                  <ul
                    style={{
                      fontSize: "14px",
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Average per employee:</span>
                      <span style={{ fontWeight: "600" }}>
                        {csrData?.kpiBreakdown?.hours?.averagePerEmployee ||
                          (csrData?.activeEmployees && csrData?.totalHours ? Math.round(csrData.totalHours / csrData.activeEmployees) : 0)}{" "}
                        hrs
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Weekly average:</span>
                      <span style={{ fontWeight: "600" }}>
                        {csrData?.kpiBreakdown?.hours?.weeklyAverage ||
                          Math.round((csrData?.totalHours || 0) / 12)}{" "}
                        hrs/week
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Top project hours:</span>
                      <span style={{ fontWeight: "600" }}>
                        {csrData?.kpiBreakdown?.hours?.topProjectHours ||
                          Math.round((csrData?.totalHours || 0) * 0.3)}{" "}
                        hrs
                      </span>
                    </li>
                    <li
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: "8px",
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      <span>💰 Economic value (@$35/hr):</span>
                      <span style={{ fontWeight: "600", color: "#059669" }}>
                        $
                        {(
                          csrData?.kpiBreakdown?.hours?.economicValue ||
                          (csrData?.totalHours || 0) * 35
                        ).toLocaleString()}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {selectedKPI === "employees" && (
              <div style={{ color: "#374151" }}>
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#1e3a8a",
                    marginBottom: "16px",
                  }}
                >
                  {csrData?.kpiBreakdown?.employees?.total || csrData?.activeEmployees || 0}{" "}
                  employees engaged
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    marginBottom: "16px",
                    lineHeight: "1.6",
                  }}
                >
                  Company employees actively participating in CSR-sponsored
                  initiatives.
                </p>
                <div
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: "16px",
                    borderRadius: "8px",
                    marginTop: "16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "8px",
                    }}
                  >
                    Employee Engagement Metrics:
                  </p>
                  <ul
                    style={{
                      fontSize: "14px",
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Average hours per employee:</span>
                      <span style={{ fontWeight: "600" }}>
                        {csrData?.kpiBreakdown?.employees?.averageHoursPerEmployee ||
                          (csrData?.activeEmployees && csrData?.totalHours ? Math.round(csrData.totalHours / csrData.activeEmployees) : 0)}{" "}
                        hrs
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Engagement rate:</span>
                      <span style={{ fontWeight: "600" }}>
                        {csrData?.kpiBreakdown?.employees?.engagementRate || 0}% of workforce
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ New participants this month:</span>
                      <span style={{ fontWeight: "600" }}>
                        {csrData?.kpiBreakdown?.employees?.newThisMonth ||
                          Math.max(1, Math.floor((csrData?.activeEmployees || 0) * 0.2))}
                      </span>
                    </li>
                    <li
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: "8px",
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      <span>🏆 Top performer:</span>
                      <span style={{ fontWeight: "600", color: "#059669" }}>
                        {csrData?.kpiBreakdown?.employees?.topPerformer ||
                          (csrData?.leaderboard?.[0]?.employeeName || "N/A")}{" "}
                        (
                        {csrData?.kpiBreakdown?.employees?.topPerformerHours ||
                          (csrData?.leaderboard?.[0]?.hours || 0)}{" "}
                        hrs)
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {selectedKPI === "projects" && (
              <div style={{ color: "#374151" }}>
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#1e3a8a",
                    marginBottom: "16px",
                  }}
                >
                  {csrData?.kpiBreakdown?.projects?.total || csrData?.projectsCompleted || 0}{" "}
                  sponsored projects
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    marginBottom: "16px",
                    lineHeight: "1.6",
                  }}
                >
                  CSR initiatives sponsored with employee participation and
                  measured impact.
                </p>
                <div
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: "16px",
                    borderRadius: "8px",
                    marginTop: "16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "8px",
                    }}
                  >
                    Employee Project Impact:
                  </p>
                  <ul
                    style={{
                      fontSize: "14px",
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Active with employee hours:</span>
                      <span style={{ fontWeight: "600" }}>
                        {csrData?.kpiBreakdown?.projects?.activeProjects ||
                          csrData?.projectsCompleted || 0}
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Total employee hours:</span>
                      <span style={{ fontWeight: "600" }}>
                        {(
                          csrData?.kpiBreakdown?.projects?.totalHoursInvested ||
                          csrData?.totalHours || 0
                        ).toLocaleString()}{" "}
                        hrs
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Average hours per project:</span>
                      <span style={{ fontWeight: "600" }}>
                        {(
                          csrData?.kpiBreakdown?.projects?.averageHoursPerProject ||
                          (csrData?.projectsCompleted && csrData?.totalHours ? Math.round(csrData.totalHours / csrData.projectsCompleted) : 0)
                        ).toLocaleString()}{" "}
                        hrs
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Geographic regions:</span>
                      <span style={{ fontWeight: "600" }}>
                        {csrData?.kpiBreakdown?.projects?.regionsServed ||
                          (csrData?.projectLocations?.length || 0)}{" "}
                        regions
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Total ROI:</span>
                      <span style={{ fontWeight: "600" }}>
                        {(
                          csrData?.kpiBreakdown?.projects?.totalRoi ||
                          csrData?.totalImpact || 0
                        ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>💰 Economic Value:</span>
                      <span style={{ fontWeight: "600", color: "#059669" }}>
                        ${((csrData?.totalHours || displayTotalHours || 0) * 35).toLocaleString()}
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>📊 Value per Project:</span>
                      <span style={{ fontWeight: "600", color: "#3b82f6" }}>
                        ${(csrData?.kpiBreakdown?.projects?.activeProjects || displayProjectsCompleted) > 0
                          ? Math.round(((csrData?.totalHours || displayTotalHours || 0) * 35) / (csrData?.kpiBreakdown?.projects?.activeProjects || displayProjectsCompleted)).toLocaleString()
                          : "0"}
                      </span>
                    </li>
                    <li
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: "8px",
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      <span>👥 Beneficiaries reached:</span>
                      <span style={{ fontWeight: "600", color: "#059669" }}>
                        {(
                          csrData?.kpiBreakdown?.projects?.beneficiariesReached ||
                          (csrData?.projectsCompleted || 0) * 150
                        ).toLocaleString()}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {selectedKPI === "sdg" && (
              <div style={{ color: "#374151" }}>
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#1e3a8a",
                    marginBottom: "16px",
                  }}
                >
                  {sdgMetrics.filter((m: any) => m.totalHours > 0).length} of 17 SDGs Active
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    marginBottom: "16px",
                    lineHeight: "1.6",
                  }}
                >
                  SDGs with employee volunteer hours logged through CSR-sponsored initiatives.
                </p>
                <div
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: "16px",
                    borderRadius: "8px",
                    marginTop: "16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "8px",
                    }}
                  >
                    Employee SDG Engagement:
                  </p>
                  <ul
                    style={{
                      fontSize: "14px",
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Active SDGs with hours:</span>
                      <span style={{ fontWeight: "600" }}>
                        {sdgMetrics.filter((m: any) => m.totalHours > 0).length} of 17
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Total SDG hours logged:</span>
                      <span style={{ fontWeight: "600" }}>
                        {sdgMetrics.reduce((sum: number, m: any) => sum + (m.totalHours || 0), 0).toLocaleString()} hrs
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Employees contributing:</span>
                      <span style={{ fontWeight: "600" }}>
                        {sdgMetrics.reduce((sum: number, m: any) => sum + (m.uniqueEmployees || 0), 0)}
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Performance vs last quarter:</span>
                      <span style={{ fontWeight: "600" }}>
                        {(csrData?.sdgScoreDelta || 0) >= 0 ? "+" : ""}{csrData?.sdgScoreDelta || 0}%
                      </span>
                    </li>
                    <li
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: "8px",
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      <span>
                        🎯 Top SDG by hours:
                      </span>
                      <span style={{ fontWeight: "600", color: "#059669" }}>
                        {(() => {
                          const topSDG = sdgMetrics.reduce((max: any, m: any) =>
                            (m.totalHours || 0) > (max.totalHours || 0) ? m : max, sdgMetrics[0] || {});
                          return topSDG ? `Goal ${topSDG.sdg} (${(topSDG.totalHours || 0).toLocaleString()} hrs)` : 'N/A';
                        })()}
                      </span>
                    </li>
                  </ul>
                </div>
                <div
                  style={{
                    marginTop: "16px",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "8px",
                    }}
                  >
                    Active SDGs Breakdown:
                  </p>
                  {sdgMetrics
                    .filter((m: any) => m.totalHours > 0)
                    .sort((a: any, b: any) => (b.totalHours || 0) - (a.totalHours || 0))
                    .map((metric: any) => (
                      <div
                        key={metric.sdg}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "6px 8px",
                          backgroundColor: "#f9fafb",
                          borderRadius: "4px",
                          marginBottom: "4px",
                          fontSize: "13px",
                        }}
                      >
                        <span>SDG {metric.sdg}: {metric.name}</span>
                        <span style={{ fontWeight: "600" }}>{(metric.totalHours || 0).toLocaleString()} hrs</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {selectedKPI === "volunteers" && (
              <div style={{ color: "#374151" }}>
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#1e3a8a",
                    marginBottom: "16px",
                  }}
                >
                  {csrData?.activeEmployees || 0} Employee Volunteers
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    marginBottom: "16px",
                    lineHeight: "1.6",
                  }}
                >
                  Employees actively participating in CSR-sponsored volunteer initiatives.
                </p>
                <div
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: "16px",
                    borderRadius: "8px",
                    marginTop: "16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "8px",
                    }}
                  >
                    Employee Engagement Metrics:
                  </p>
                  <ul
                    style={{
                      fontSize: "14px",
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Active employee volunteers:</span>
                      <span style={{ fontWeight: "600" }}>
                        {csrData?.activeEmployees || 0}
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Engagement rate:</span>
                      <span style={{ fontWeight: "600" }}>
                        {csrData?.kpiBreakdown?.employees?.engagementRate || 0}%
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Average hours contributed:</span>
                      <span style={{ fontWeight: "600" }}>
                        {csrData?.kpiBreakdown?.employees?.averageHoursPerEmployee || 0} hrs
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ New this month:</span>
                      <span style={{ fontWeight: "600" }}>
                        {csrData?.kpiBreakdown?.employees?.newThisMonth || 0}
                      </span>
                    </li>
                  </ul>
                </div>
                <div
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: "16px",
                    borderRadius: "8px",
                    marginTop: "16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "8px",
                    }}
                  >
                    Employee Distribution by SDG:
                  </p>
                  <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                    {sdgMetrics
                      .filter((m) => m.uniqueEmployees > 0)
                      .sort((a, b) => b.uniqueEmployees - a.uniqueEmployees)
                      .map((metric) => (
                        <div
                          key={metric.sdg}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "6px 0",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "4px",
                                backgroundColor: getSDGColor(metric.sdg),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "10px",
                                fontWeight: "bold",
                              }}
                            >
                              {metric.sdg}
                            </div>
                            <span style={{ fontSize: "12px" }}>{getSDGName(metric.sdg)}</span>
                          </div>
                          <span style={{ fontWeight: "600", color: "#1e3a8a", fontSize: "12px" }}>
                            {metric.uniqueEmployees} employees
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: "#dbeafe",
                    padding: "12px",
                    borderRadius: "8px",
                    marginTop: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>💼</span>
                  <span style={{ fontSize: "13px", color: "#1e40af" }}>
                    <strong>Impact:</strong> Employee volunteers have contributed{" "}
                    {(csrData?.totalHours || 0).toLocaleString()} total hours worth ${((csrData?.totalHours || 0) * 35).toLocaleString()} in economic value.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SDG Detail Modal - Detailed Version */}
      {selectedSDG && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectedSDG(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const selectedMetric = filteredSDGMetrics.find(
                (m: SDGMetric) => m.sdg === selectedSDG,
              );
              const sdgColor = getSDGColor(selectedSDG);

              return (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "10px",
                          backgroundColor: sdgColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "20px",
                          fontWeight: "bold",
                        }}
                      >
                        {selectedSDG}
                      </div>
                      <div>
                        <h2
                          style={{
                            fontSize: "20px",
                            fontWeight: "bold",
                            color: "#111827",
                            margin: 0,
                          }}
                        >
                          {getSDGName(selectedSDG)}
                        </h2>
                        <p
                          style={{
                            fontSize: "14px",
                            color: "#6b7280",
                            margin: "2px 0 0 0",
                          }}
                        >
                          {getSDGFullName(selectedSDG)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedSDG(null)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      <X
                        style={{
                          width: "24px",
                          height: "24px",
                          color: "#6b7280",
                        }}
                      />
                    </button>
                  </div>

                  {/* Summary Stats */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "12px",
                      marginBottom: "20px",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#f0fdf4",
                        borderRadius: "8px",
                        padding: "12px",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: "#166534",
                          margin: 0,
                        }}
                      >
                        {selectedMetric?.totalHours || 0}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#15803d",
                          margin: "2px 0 0 0",
                        }}
                      >
                        Total Hours
                      </p>
                    </div>
                    <div
                      style={{
                        backgroundColor: "#eff6ff",
                        borderRadius: "8px",
                        padding: "12px",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: "#1e40af",
                          margin: 0,
                        }}
                      >
                        {selectedMetric?.uniqueEmployees || 0}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#1d4ed8",
                          margin: "2px 0 0 0",
                        }}
                      >
                        Volunteers
                      </p>
                    </div>
                    <div
                      style={{
                        backgroundColor: "#fef3c7",
                        borderRadius: "8px",
                        padding: "12px",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: "#92400e",
                          margin: 0,
                        }}
                      >
                        {selectedMetric?.projectsContributed || 0}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#b45309",
                          margin: "2px 0 0 0",
                        }}
                      >
                        Projects
                      </p>
                    </div>
                  </div>

                  {/* Employees Section */}
                  <div style={{ marginBottom: "20px" }}>
                    <h3
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#111827",
                        marginBottom: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Users style={{ width: "16px", height: "16px" }} />
                      Contributing Employees
                    </h3>
                    <div
                      style={{
                        backgroundColor: "#f9fafb",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                    >
                      {selectedMetric?.employees &&
                      selectedMetric.employees.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            maxHeight: "300px",
                            overflowY: "auto",
                            paddingRight: "4px",
                          }}
                        >
                          {selectedMetric.employees.map((emp, idx) => (
                            <div
                              key={emp.email}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 12px",
                                backgroundColor: "white",
                                borderRadius: "6px",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    backgroundColor: sdgColor,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {idx + 1}
                                </div>
                                <div>
                                  <p
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: "600",
                                      color: "#111827",
                                      margin: 0,
                                    }}
                                  >
                                    {emp.name}
                                  </p>
                                  <p
                                    style={{
                                      fontSize: "11px",
                                      color: "#6b7280",
                                      margin: 0,
                                    }}
                                  >
                                    {emp.projectName}
                                  </p>
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <p
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: "bold",
                                    color: sdgColor,
                                    margin: 0,
                                  }}
                                >
                                  {emp.hours} hrs
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            textAlign: "center",
                            margin: 0,
                          }}
                        >
                          No employee data available
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Projects Section */}
                  <div>
                    <h3
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#111827",
                        marginBottom: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Briefcase style={{ width: "16px", height: "16px" }} />
                      Contributing Projects
                    </h3>
                    <div
                      style={{
                        backgroundColor: "#f9fafb",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                    >
                      {selectedMetric?.projects &&
                      selectedMetric.projects.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            maxHeight: "250px",
                            overflowY: "auto",
                            paddingRight: "4px",
                          }}
                        >
                          {selectedMetric.projects.map((proj) => (
                            <div
                              key={proj.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 12px",
                                backgroundColor: "white",
                                borderRadius: "6px",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "6px",
                                    backgroundColor: "#f3f4f6",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Briefcase
                                    style={{
                                      width: "16px",
                                      height: "16px",
                                      color: "#6b7280",
                                    }}
                                  />
                                </div>
                                <p
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    color: "#111827",
                                    margin: 0,
                                  }}
                                >
                                  {proj.name}
                                </p>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <p
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: "bold",
                                    color: "#1e3a8a",
                                    margin: 0,
                                  }}
                                >
                                  {proj.hours} hrs
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            textAlign: "center",
                            margin: 0,
                          }}
                        >
                          No project data available
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Economic Impact */}
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "12px",
                      backgroundColor: "#f0fdf4",
                      borderRadius: "8px",
                      borderLeft: `4px solid ${sdgColor}`,
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#166534",
                        margin: "0 0 4px 0",
                      }}
                    >
                      💰 Economic Impact
                    </p>
                    <p
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: "#166534",
                        margin: 0,
                      }}
                    >
                      $
                      {(
                        (selectedMetric?.totalHours || 0) * 35
                      ).toLocaleString()}
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#15803d",
                        margin: "2px 0 0 0",
                      }}
                    >
                      Based on $35/hour volunteer value
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Admin Actions Modal - Detailed Version */}
      {showAdminModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setShowAdminModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
              maxWidth: "700px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "32px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#111827",
                }}
              >
                Admin Actions
              </h2>
              <button
                onClick={() => setShowAdminModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X
                  style={{ width: "24px", height: "24px", color: "#6b7280" }}
                />
              </button>
            </div>

            {/* Tab Navigation */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                marginBottom: "20px",
                borderBottom: "1px solid #e5e7eb",
                paddingBottom: "12px",
              }}
            >
              {["reviews", "insights", "flagged"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedAdminTab(tab as any)}
                  style={{
                    padding: "8px 12px",
                    border: "none",
                    backgroundColor: "transparent",
                    color: selectedAdminTab === tab ? "#1e3a8a" : "#6b7280",
                    fontWeight: selectedAdminTab === tab ? "600" : "500",
                    borderBottom:
                      selectedAdminTab === tab ? "2px solid #1e3a8a" : "none",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} (
                  {adminActionsData?.[tab]?.count || 0})
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ color: "#374151", maxHeight: "400px", overflowY: "auto", paddingRight: "8px" }}>
              {selectedAdminTab === "reviews" && (
                <div>
                  {adminActionsData?.reviews?.items &&
                  adminActionsData.reviews.items.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {adminActionsData.reviews.items.map(
                        (item: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: "12px",
                              backgroundColor: "#fef2f2",
                              borderRadius: "6px",
                              borderLeft: "4px solid #dc2626",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "600",
                                color: "#dc2626",
                                marginBottom: "4px",
                              }}
                            >
                              {item.title}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#6b7280",
                                marginBottom: "4px",
                              }}
                            >
                              {item.description}
                            </div>
                            <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                              Severity: {item.severity}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "24px",
                        color: "#9ca3af",
                        fontSize: "14px",
                      }}
                    >
                      No reviews needed ✓
                    </div>
                  )}
                </div>
              )}

              {selectedAdminTab === "insights" && (
                <div>
                  {adminActionsData?.insights?.items &&
                  adminActionsData.insights.items.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {adminActionsData.insights.items.map(
                        (item: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: "12px",
                              backgroundColor: "#fffbeb",
                              borderRadius: "6px",
                              borderLeft: "4px solid #f59e0b",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "600",
                                color: "#f59e0b",
                                marginBottom: "4px",
                              }}
                            >
                              {item.title}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#6b7280",
                                marginBottom: "4px",
                              }}
                            >
                              {item.description}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#059669",
                                marginBottom: "4px",
                              }}
                            >
                              💡 {item.recommendation}
                            </div>
                            <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                              Severity: {item.severity}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "24px",
                        color: "#9ca3af",
                        fontSize: "14px",
                      }}
                    >
                      No insights available
                    </div>
                  )}
                </div>
              )}

              {selectedAdminTab === "flagged" && (
                <div>
                  {adminActionsData?.flagged?.items &&
                  adminActionsData.flagged.items.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {adminActionsData.flagged.items.map(
                        (item: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: "12px",
                              backgroundColor: "#fff7ed",
                              borderRadius: "6px",
                              borderLeft: "4px solid #f97316",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "600",
                                color: "#f97316",
                                marginBottom: "4px",
                              }}
                            >
                              {item.title}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#6b7280",
                                marginBottom: "4px",
                              }}
                            >
                              {item.description}
                            </div>
                            <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                              Severity: {item.severity}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "24px",
                        color: "#9ca3af",
                        fontSize: "14px",
                      }}
                    >
                      No flagged items
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: "20px",
                padding: "16px 0",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowAdminModal(false)}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "white",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                Close
              </button>
              <button
                style={{
                  padding: "8px 16px",
                  border: "none",
                  backgroundColor: "#1e3a8a",
                  color: "white",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Review All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Funnel Stage Modal - Detailed Version */}
      {showFunnelModal &&
        selectedFunnelStage !== null &&
        funnelData?.funnel && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
            onClick={() => setShowFunnelModal(false)}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
                maxWidth: "600px",
                width: "90%",
                maxHeight: "80vh",
                overflowY: "auto",
                padding: "32px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    {funnelData.funnel[selectedFunnelStage].stage}
                  </h2>
                  <p style={{ fontSize: "13px", color: "#6b7280" }}>
                    {funnelData.funnel[selectedFunnelStage].description}
                  </p>
                </div>
                <button
                  onClick={() => setShowFunnelModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <X
                    style={{ width: "24px", height: "24px", color: "#6b7280" }}
                  />
                </button>
              </div>

              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    Total in Stage
                  </div>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#1e3a8a",
                    }}
                  >
                    {funnelData.funnel[selectedFunnelStage].count}
                  </div>
                </div>
                {selectedFunnelStage > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginBottom: "4px",
                      }}
                    >
                      Drop-off
                    </div>
                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#dc2626",
                      }}
                    >
                      {funnelData.funnel[selectedFunnelStage].dropoff}%
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#111827",
                    marginBottom: "12px",
                  }}
                >
                  Employees ({funnelStageData?.employees?.length || 0})
                </h3>
                {funnelStageData?.employees &&
                funnelStageData.employees.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      maxHeight: "350px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}
                  >
                    {funnelStageData.employees.map((emp: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          backgroundColor: "#f9fafb",
                          borderRadius: "6px",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: "500",
                              color: "#111827",
                              marginBottom: "4px",
                            }}
                          >
                            {idx + 1}. {emp.name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            {emp.status === "linked"
                              ? "🔗 Linked"
                              : emp.status === "started"
                                ? "🚀 Started"
                                : emp.status === "active"
                                  ? "⭐ Active"
                                  : "🏆 Top Performer"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: "bold",
                              color: "#059669",
                            }}
                          >
                            {emp.hours}
                          </div>
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            hrs
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px",
                      color: "#9ca3af",
                      fontSize: "14px",
                    }}
                  >
                    Loading employee data...
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                  paddingTop: "16px",
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <button
                  onClick={() => setShowFunnelModal(false)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #e5e7eb",
                    backgroundColor: "white",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                  }}
                >
                  Close
                </button>
                {selectedFunnelStage === 1 && (
                  <button
                    onClick={() => setShowEngagementTipsDialog(true)}
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      backgroundColor: "#1e3a8a",
                      color: "white",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Send style={{ width: "16px", height: "16px" }} />
                    Send Engagement Tips
                  </button>
                )}
                {selectedFunnelStage === 3 && (
                  <button
                    onClick={() => {
                      // Get top performers from leaderboard
                      const topPerformer = csrData?.leaderboard?.[0];
                      if (topPerformer) {
                        setSelectedEmployee(topPerformer);
                        setShowRecognitionModal(true);
                        setShowFunnelModal(false);
                      }
                    }}
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      backgroundColor: "#059669",
                      color: "white",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Award style={{ width: "16px", height: "16px" }} />
                    Recognize Performance
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Recognition Modal */}
      {showRecognitionModal && selectedEmployee && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
          onClick={() => setShowRecognitionModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              maxWidth: "550px",
              width: "95%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "32px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Trophy style={{ width: "24px", height: "24px", color: "white" }} />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "22px",
                      fontWeight: "bold",
                      color: "#111827",
                      margin: 0,
                    }}
                  >
                    Recognize Top Performer
                  </h2>
                  <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0 0" }}>
                    Reward exceptional employee contributions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRecognitionModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              >
                <X style={{ width: "24px", height: "24px", color: "#6b7280" }} />
              </button>
            </div>

            {/* Employee Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "24px",
                color: "white",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    fontWeight: "bold",
                    border: "3px solid rgba(255,255,255,0.4)",
                  }}
                >
                  {selectedEmployee.employeeName?.charAt(0) || "?"}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>
                    {selectedEmployee.employeeName}
                  </h3>
                  <p style={{ fontSize: "14px", opacity: 0.9, margin: "4px 0 0 0" }}>
                    #{selectedEmployee.rank || 1} Top Performer
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "28px", fontWeight: "bold" }}>
                    {selectedEmployee.hours}
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.8 }}>hours contributed</div>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                    {selectedEmployee.points || selectedEmployee.hours * 10}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.8 }}>Points Earned</div>
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                    {Math.round((selectedEmployee.hours || 0) / 4)}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.8 }}>Avg Hrs/Week</div>
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                    ${(selectedEmployee.hours || 0) * 35}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.8 }}>Value Generated</div>
                </div>
              </div>
            </div>

            {/* Badge Selection */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  display: "block",
                  marginBottom: "12px",
                }}
              >
                Select Recognition Badge
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                {[
                  { id: "star", icon: Star, label: "Star Performer", color: "#f59e0b" },
                  { id: "trophy", icon: Trophy, label: "Champion", color: "#f97316" },
                  { id: "medal", icon: Medal, label: "Outstanding", color: "#3b82f6" },
                  { id: "heart", icon: Heart, label: "Heart of Gold", color: "#ec4899" },
                ].map((badge) => {
                  const IconComponent = badge.icon;
                  return (
                    <button
                      key={badge.id}
                      onClick={() => setRecognitionBadge(badge.id)}
                      style={{
                        padding: "16px 12px",
                        border: recognitionBadge === badge.id ? `2px solid ${badge.color}` : "2px solid #e5e7eb",
                        borderRadius: "12px",
                        backgroundColor: recognitionBadge === badge.id ? `${badge.color}10` : "white",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s",
                      }}
                    >
                      <IconComponent
                        style={{
                          width: "28px",
                          height: "28px",
                          color: recognitionBadge === badge.id ? badge.color : "#9ca3af",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "500",
                          color: recognitionBadge === badge.id ? badge.color : "#6b7280",
                        }}
                      >
                        {badge.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recognition Message */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Recognition Message
              </label>
              <textarea
                value={recognitionMessage}
                onChange={(e) => setRecognitionMessage(e.target.value)}
                placeholder="Write a personalized message recognizing their contributions..."
                style={{
                  width: "100%",
                  padding: "14px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "14px",
                  minHeight: "100px",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Quick Messages */}
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
                Quick messages:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {[
                  "Exceptional dedication to our community goals!",
                  "Your contributions make a real difference.",
                  "Thank you for going above and beyond!",
                  "A true CSR champion!",
                ].map((msg) => (
                  <button
                    key={msg}
                    onClick={() => setRecognitionMessage(msg)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#f3f4f6",
                      border: "1px solid #e5e7eb",
                      borderRadius: "20px",
                      fontSize: "12px",
                      color: "#374151",
                      cursor: "pointer",
                    }}
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>

            {/* Reward Options */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  display: "block",
                  marginBottom: "12px",
                }}
              >
                Additional Rewards (Optional)
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                <div
                  style={{
                    padding: "14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                    backgroundColor: "#fef3c7",
                  }}
                >
                  <Gift style={{ width: "20px", height: "20px", color: "#f59e0b" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#111827" }}>
                      Bonus PTO Day
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      Award extra time off
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: "14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                    backgroundColor: "#dbeafe",
                  }}
                >
                  <Sparkles style={{ width: "20px", height: "20px", color: "#3b82f6" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#111827" }}>
                      Company Newsletter
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      Feature in spotlight
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowRecognitionModal(false)}
                style={{
                  padding: "12px 24px",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsSubmittingRecognition(true);
                  try {
                    const response = await fetch('/api/csr/recognize-employee', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        employeeId: selectedEmployee.userId || selectedEmployee.rank, // fallback if no userId
                        badge: recognitionBadge,
                        message: recognitionMessage,
                        recognizedBy: userId,
                        rewards: []
                      }),
                    });

                    if (!response.ok) {
                      throw new Error('Failed to send recognition');
                    }

                    const result = await response.json();

                    setShowRecognitionModal(false);
                    setRecognitionMessage("");
                    setSelectedEmployee(null);

                    // Show success notification
                    alert(`Recognition sent to ${selectedEmployee.employeeName}!`);
                  } catch (err) {
                    console.error("Failed to send recognition:", err);
                    alert("Failed to send recognition. Please try again.");
                  } finally {
                    setIsSubmittingRecognition(false);
                  }
                }}
                disabled={isSubmittingRecognition || !recognitionMessage}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  backgroundColor: isSubmittingRecognition || !recognitionMessage ? "#9ca3af" : "#059669",
                  color: "white",
                  borderRadius: "8px",
                  cursor: isSubmittingRecognition || !recognitionMessage ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {isSubmittingRecognition ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Send style={{ width: "16px", height: "16px" }} />
                    Send Recognition
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active SDGs Modal - Drill-down for committed SDGs */}
      {showActiveSDGsModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
          onClick={() => setShowActiveSDGsModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              maxWidth: "600px",
              width: "95%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#166534", margin: 0 }}>
                SDG Commitment Status ({activeCommittedSDGs}/{committedSDGs.length} Active)
              </h2>
              <button
                onClick={() => setShowActiveSDGsModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "8px" }}
              >
                <X style={{ width: "20px", height: "20px", color: "#6b7280" }} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {committedSDGs.map((sdgNum: number) => {
                const sdgData = sdgMetrics.find(m => m.sdg === sdgNum);
                const isActive = sdgData && sdgData.totalHours > 0;
                return (
                  <div
                    key={sdgNum}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: isActive ? `2px solid ${getSDGColor(sdgNum)}` : "1px solid #e5e7eb",
                      backgroundColor: isActive ? `${getSDGColor(sdgNum)}10` : "#f9fafb",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "8px",
                          backgroundColor: getSDGColor(sdgNum),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: "bold",
                          fontSize: "14px",
                        }}
                      >
                        {sdgNum}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>
                          {getSDGName(sdgNum)}
                        </p>
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0 0" }}>
                          {getSDGFullName(sdgNum)}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {isActive ? (
                          <>
                            <p style={{ fontSize: "16px", fontWeight: "bold", color: getSDGColor(sdgNum), margin: 0 }}>
                              {sdgData.totalHours} hrs
                            </p>
                            <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
                              {sdgData.uniqueEmployees} employees
                            </p>
                          </>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>
                            No activity yet
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {committedSDGs.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                  <p>No SDG commitments set. Go to Settings to add your corporate SDG commitments.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Total Hours Modal - Drill-down for hours per SDG */}
      {showTotalHoursModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
          onClick={() => setShowTotalHoursModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              maxWidth: "600px",
              width: "95%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1e40af", margin: 0 }}>
                Hours by Committed SDG ({committedSDGHours.toLocaleString()} Total)
              </h2>
              <button
                onClick={() => setShowTotalHoursModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "8px" }}
              >
                <X style={{ width: "20px", height: "20px", color: "#6b7280" }} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {sdgMetrics
                .filter(m => committedSDGs.includes(m.sdg) && m.totalHours > 0)
                .sort((a: any, b: any) => b.totalHours - a.totalHours)
                .map((metric: any) => {
                  const percentage = committedSDGHours > 0 ? Math.round((metric.totalHours / committedSDGHours) * 100) : 0;
                  return (
                    <div key={metric.sdg} style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            backgroundColor: getSDGColor(metric.sdg),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "12px",
                            fontWeight: "bold",
                          }}
                        >
                          {metric.sdg}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "13px", fontWeight: "600", color: "#111827", margin: 0 }}>
                            {getSDGName(metric.sdg)}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "16px", fontWeight: "bold", color: "#1e40af" }}>
                            {metric.totalHours.toLocaleString()} hrs
                          </span>
                          <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "8px" }}>
                            ({percentage}%)
                          </span>
                        </div>
                      </div>
                      <div style={{ height: "6px", backgroundColor: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${percentage}%`,
                            backgroundColor: getSDGColor(metric.sdg),
                            borderRadius: "3px",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              {committedSDGHours === 0 && (
                <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                  <p>No hours logged yet for committed SDGs. Encourage employees to log their volunteer activities!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employees Modal - Drill-down for employees per SDG */}
      {showEmployeesModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
          onClick={() => setShowEmployeesModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              maxWidth: "700px",
              width: "95%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#92400e", margin: 0 }}>
                Employees Contributing ({committedSDGEmployees} Active)
              </h2>
              <button
                onClick={() => setShowEmployeesModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "8px" }}
              >
                <X style={{ width: "20px", height: "20px", color: "#6b7280" }} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {sdgMetrics
                .filter(m => committedSDGs.includes(m.sdg) && m.totalHours > 0)
                .sort((a: any, b: any) => b.uniqueEmployees - a.uniqueEmployees)
                .map((metric: any) => (
                  <div key={metric.sdg} style={{ padding: "16px", backgroundColor: "#f9fafb", borderRadius: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          backgroundColor: getSDGColor(metric.sdg),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "13px",
                          fontWeight: "bold",
                        }}
                      >
                        {metric.sdg}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>
                          {getSDGName(metric.sdg)}
                        </p>
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                          {metric.uniqueEmployees} employee{metric.uniqueEmployees !== 1 ? 's' : ''} | {metric.totalHours} hrs
                        </p>
                      </div>
                    </div>
                    {metric.employees && metric.employees.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {metric.employees.slice(0, 5).map((emp: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "white",
                              borderRadius: "6px",
                              border: "1px solid #e5e7eb",
                              fontSize: "12px",
                            }}
                          >
                            <span style={{ color: "#111827" }}>{emp.name || emp.email?.split('@')[0] || 'Employee'}</span>
                            <span style={{ color: "#6b7280", marginLeft: "6px" }}>({emp.hours} hrs)</span>
                          </div>
                        ))}
                        {metric.employees.length > 5 && (
                          <div
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#e5e7eb",
                              borderRadius: "6px",
                              fontSize: "12px",
                              color: "#6b7280",
                            }}
                          >
                            +{metric.employees.length - 5} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              {committedSDGEmployees === 0 && (
                <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                  <p>No employees have logged hours for committed SDGs yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expansion Insights Modal - AI recommendations for SDG expansion */}
      {showExpansionInsightsModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
          onClick={() => setShowExpansionInsightsModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              maxWidth: "700px",
              width: "95%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#92400e", margin: 0 }}>
                  SDG Expansion Opportunities
                </h2>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0 0" }}>
                  Employee activity outside your current commitments
                </p>
              </div>
              <button
                onClick={() => setShowExpansionInsightsModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "8px" }}
              >
                <X style={{ width: "20px", height: "20px", color: "#6b7280" }} />
              </button>
            </div>

            {/* AI Recommendation Banner */}
            <div
              style={{
                padding: "16px",
                backgroundColor: "#f0f9ff",
                borderRadius: "12px",
                borderLeft: "4px solid #3b82f6",
                marginBottom: "20px",
              }}
            >
              <p style={{ fontSize: "12px", fontWeight: "600", color: "#1e40af", marginBottom: "6px" }}>
                AI Recommendation
              </p>
              <p style={{ fontSize: "13px", color: "#334155", lineHeight: "1.5", margin: 0 }}>
                {(() => {
                  const topOpportunity = employeeActivityOutsideCommitments[0];
                  const totalOutsideHours = employeeActivityOutsideCommitments.reduce((sum, item) => sum + item.hours, 0);
                  const totalOutsideEmployees = new Set(
                    sdgMetrics
                      .filter(m => !committedSDGs.includes(m.sdg) && m.totalHours > 0)
                      .flatMap((m: any) => safeMap(m.employees, (emp: any) => emp.email))
                  ).size;

                  if (topOpportunity) {
                    return `Your employees have logged ${totalOutsideHours} hours across ${employeeActivityOutsideCommitments.length} SDGs not in your commitments. Consider adding "${topOpportunity.fullName}" (${topOpportunity.hours} hrs from ${topOpportunity.employees} employees) to align corporate goals with employee passion.`;
                  }
                  return "No expansion opportunities detected at this time.";
                })()}
              </p>
            </div>

            {/* SDG Opportunities List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {employeeActivityOutsideCommitments.map((sdgData, idx) => (
                <div
                  key={sdgData.sdg}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    border: idx === 0 ? `2px solid ${sdgData.color}` : "1px solid #e5e7eb",
                    backgroundColor: idx === 0 ? `${sdgData.color}08` : "white",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "10px",
                        backgroundColor: sdgData.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "16px",
                      }}
                    >
                      {sdgData.sdg}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: 0 }}>
                        {sdgData.name}
                      </p>
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0 0" }}>
                        {sdgData.fullName}
                      </p>
                    </div>
                    {idx === 0 && (
                      <div
                        style={{
                          padding: "4px 10px",
                          backgroundColor: "#fef3c7",
                          borderRadius: "20px",
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#92400e",
                        }}
                      >
                        Top Pick
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "12px",
                      marginTop: "12px",
                      paddingTop: "12px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: sdgData.color, margin: 0 }}>
                        {sdgData.hours}
                      </p>
                      <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>Hours Logged</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: sdgData.color, margin: 0 }}>
                        {sdgData.employees}
                      </p>
                      <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>Employees</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: sdgData.color, margin: 0 }}>
                        {sdgData.projects}
                      </p>
                      <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>Projects</p>
                    </div>
                  </div>
                </div>
              ))}
              {employeeActivityOutsideCommitments.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                  <p>All employee activity is aligned with your current SDG commitments.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Engagement Tips Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showEngagementTipsDialog}
        onClose={() => setShowEngagementTipsDialog(false)}
        title="Send Engagement Tips"
        description="Send engagement tips to all inactive employees? This will send personalized tips to help them get started with volunteering."
        confirmText="Send Tips"
        cancelText="Cancel"
        onConfirm={async () => {
          setIsSendingTips(true);
          try {
            const response = await fetch("/api/employee-engagement/send-tips", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                stage: "inactive",
              }),
            });
            if (response.ok) {
              alert("Engagement tips sent successfully to inactive employees!");
              setShowFunnelModal(false);
            } else {
              alert("Failed to send engagement tips. Please try again.");
            }
          } catch (error) {
            alert("Error sending engagement tips. Please try again.");
          } finally {
            setIsSendingTips(false);
          }
        }}
        isLoading={isSendingTips}
      />
    </div>
  );
}
