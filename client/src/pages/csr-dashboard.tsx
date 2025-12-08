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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { getSDGName, getSDGFullName, getSDGColor } from "@shared/sdg-goals";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import { useState } from "react";
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

  // Build SDG chart data from real metrics - only include SDGs with actual hours
  // Sort numerically by SDG goal number (1-17)
  const sdgChartData = sdgMetrics
    .filter((metric) => metric.totalHours > 0) // Only show SDGs with real hours
    .map((metric) => {
      const percentage =
        totalSDGHours > 0
          ? Math.round((metric.totalHours / totalSDGHours) * 100)
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

  // Only show chart data if there's real employee engagement, otherwise show placeholder
  const chartData = sdgChartData.length > 0 ? sdgChartData : defaultSdgData;

  // ===== SDG COMMITMENT & AI INSIGHTS =====
  // Get organization's committed SDGs
  const committedSDGs = csrData?.primarySdgs || [];

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
                  {selectedSDGFilters.length > 0 && (
                    <p style={{ fontSize: "11px", color: "#93c5fd", marginTop: "4px" }}>
                      Filtered from {(csrData?.totalHours || 0).toLocaleString()} total
                    </p>
                  )}
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
                  {selectedSDGFilters.length > 0 && (
                    <p style={{ fontSize: "11px", color: "#93c5fd", marginTop: "4px" }}>
                      Filtered from {csrData?.activeEmployees || 0} total
                    </p>
                  )}
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
                    Projects Completed
                  </p>
                  <p style={{ fontSize: "30px", fontWeight: "bold" }}>
                    {displayProjectsCompleted}
                  </p>
                  {selectedSDGFilters.length > 0 && (
                    <p style={{ fontSize: "11px", color: "#93c5fd", marginTop: "4px" }}>
                      Filtered from {csrData?.projectsCompleted || 0} total
                    </p>
                  )}
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
                    SDG Score Delta
                  </p>
                  <p style={{ fontSize: "28px", fontWeight: "bold" }}>
                    {(csrData?.sdgScoreDelta || 0) >= 0 ? "+" : ""}
                    {csrData?.sdgScoreDelta || 0}%{" "}
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "normal",
                        color: "#d1d5db",
                      }}
                    >
                      Q3
                    </span>
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
                    Total Volunteers
                  </p>
                  <p style={{ fontSize: "28px", fontWeight: "bold" }}>
                    {(csrData as any)?.totalVolunteers || sdgMetrics.reduce((sum, m) => sum + (m.uniqueEmployees || 0), 0) || 0}
                  </p>
                  <p style={{ fontSize: "10px", color: "#93c5fd", marginTop: "4px" }}>
                    Active across all projects
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
                {/* Row 1, Col 1: SDG Alignment Dashboard - Enhanced View */}
                <div
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    minHeight: "420px",
                  }}
                  data-testid="chart-sdg-alignment"
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#111827",
                        margin: 0,
                      }}
                    >
                      SDG Alignment Dashboard
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        fontSize: "11px",
                        color: "#6b7280",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        ⏱️ Hours Logged
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        👥 Volunteers
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        📁 Projects
                      </span>
                    </div>
                  </div>

                  {/* Summary Stats Row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "12px",
                      marginBottom: "16px",
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
                          fontSize: "20px",
                          fontWeight: "bold",
                          color: "#166534",
                          margin: 0,
                        }}
                      >
                        {sdgMetrics.length || 0}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#15803d",
                          margin: "2px 0 0 0",
                        }}
                      >
                        Active SDGs
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
                          fontSize: "20px",
                          fontWeight: "bold",
                          color: "#1e40af",
                          margin: 0,
                        }}
                      >
                        {totalSDGHours.toLocaleString()}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#1d4ed8",
                          margin: "2px 0 0 0",
                        }}
                      >
                        Total Hours
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
                          fontSize: "20px",
                          fontWeight: "bold",
                          color: "#92400e",
                          margin: 0,
                        }}
                      >
                        {new Set(
                          sdgMetrics
                            .filter((m: any) => m.totalHours > 0)
                            .flatMap((m: any) =>
                              safeMap(m.employees, (emp: any) => emp.email)
                            )
                        ).size}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#b45309",
                          margin: "2px 0 0 0",
                        }}
                      >
                        Volunteers
                      </p>
                    </div>
                  </div>

                  {/* SDG Progress Bars - Scrollable List */}
                  <div
                    style={{ flex: 1, overflowY: "auto", marginBottom: "12px" }}
                  >
                    {displayChartData.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        {displayChartData.map((sdg, idx) => (
                          <div
                            key={sdg.goal}
                            style={{
                              padding: "10px 12px",
                              backgroundColor:
                                selectedSDG === sdg.goal ? "#f8fafc" : "white",
                              borderRadius: "8px",
                              border:
                                selectedSDG === sdg.goal
                                  ? `2px solid ${sdg.color}`
                                  : "1px solid #e5e7eb",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onClick={() =>
                              setSelectedSDG(
                                selectedSDG === sdg.goal ? null : sdg.goal,
                              )
                            }
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "6px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "6px",
                                    backgroundColor: sdg.color,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {sdg.goal}
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
                                    {sdg.name}
                                  </p>
                                  <p
                                    style={{
                                      fontSize: "11px",
                                      color: "#6b7280",
                                      margin: 0,
                                    }}
                                  >
                                    {sdg.fullName}
                                  </p>
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <p
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: "bold",
                                    color: sdg.color,
                                    margin: 0,
                                  }}
                                >
                                  {sdg.value}%
                                </p>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div
                              style={{
                                height: "6px",
                                backgroundColor: "#e5e7eb",
                                borderRadius: "3px",
                                overflow: "hidden",
                                marginBottom: "6px",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${Math.min(100, sdg.value)}%`,
                                  backgroundColor: sdg.color,
                                  borderRadius: "3px",
                                  transition: "width 0.3s",
                                }}
                              ></div>
                            </div>

                            {/* Stats Row */}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "11px",
                                color: "#6b7280",
                              }}
                            >
                              <span>
                                ⏱️ {(sdg.hours || 0).toLocaleString()} hrs
                              </span>
                              <span>👥 {sdg.employees || 0} volunteers</span>
                              <span>📁 {sdg.projects || 0} projects</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          color: "#9ca3af",
                        }}
                      >
                        <p>No SDG data available yet</p>
                      </div>
                    )}
                  </div>

                  {/* AI Insights Section */}
                  <div
                    style={{
                      padding: "10px",
                      backgroundColor: "#f0f9ff",
                      borderRadius: "6px",
                      borderLeft: "4px solid #3b82f6",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#1e40af",
                        marginBottom: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      ✨ AI Insight
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#334155",
                        lineHeight: "1.4",
                        margin: 0,
                      }}
                    >
                      {(() => {
                        const activeSDGs = sdgMetrics.filter((m: any) => m.totalHours > 0);
                        const totalHours = activeSDGs.reduce(
                          (sum: number, m: any) => sum + (m.totalHours || 0),
                          0,
                        );
                        // Get unique volunteers across all SDGs (not summing duplicates)
                        const uniqueVolunteers = new Set(
                          activeSDGs.flatMap((m: any) =>
                            safeMap(m.employees, (emp: any) => emp.email)
                          )
                        ).size;
                        const topSDG = activeSDGs.sort((a: any, b: any) => b.totalHours - a.totalHours)[0];
                        const committedCount = committedSDGs.length;
                        const activeCount = activeSDGs.length;

                        if (totalHours === 0 && committedCount === 0) {
                          return "Set SDG commitments in Settings and start tracking contributions to unlock AI-powered insights.";
                        }

                        if (totalHours === 0 && committedCount > 0) {
                          return `You've committed to ${committedCount} SDG${committedCount > 1 ? 's' : ''}. Start logging volunteer hours to see your impact alignment!`;
                        }

                        if (topSDG && uniqueVolunteers > 0) {
                          const alignmentStatus = committedSDGs.includes(topSDG.sdg)
                            ? "✓ On track"
                            : "⚠️ Not in commitments";
                          return `${alignmentStatus}: Top focus is ${getSDGName(topSDG.sdg)} with ${topSDG.totalHours} hrs from ${uniqueVolunteers} volunteer${uniqueVolunteers > 1 ? 's' : ''} across ${activeCount} SDG${activeCount > 1 ? 's' : ''}.`;
                        }
                        return `${uniqueVolunteers} volunteer${uniqueVolunteers > 1 ? 's' : ''} contributing ${totalHours} hours across ${activeCount} SDG${activeCount > 1 ? 's' : ''}.`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Row 1, Col 2: Geographic Impact by Region - Interactive Map */}
                <div
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  data-testid="chart-geographic-impact"
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#111827",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        margin: 0,
                      }}
                    >
                      <MapPin style={{ width: "16px", height: "16px" }} />
                      Geographic Impact by Region
                    </h3>
                    {/* Map Filters */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <select
                        value={selectedMapRegion}
                        onChange={(e) => setSelectedMapRegion(e.target.value)}
                        style={{
                          padding: "4px 8px",
                          fontSize: "11px",
                          borderRadius: "4px",
                          border: "1px solid #d1d5db",
                          backgroundColor: selectedMapRegion !== "all" ? "#dbeafe" : "white",
                          color: "#374151",
                          cursor: "pointer",
                        }}
                        data-testid="map-region-filter"
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
                          padding: "4px 8px",
                          fontSize: "11px",
                          borderRadius: "4px",
                          border: "1px solid #d1d5db",
                          backgroundColor: selectedMapStatus !== "all" ? "#dbeafe" : "white",
                          color: "#374151",
                          cursor: "pointer",
                        }}
                        data-testid="map-status-filter"
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="sponsored">Sponsored</option>
                        <option value="completed">Completed</option>
                      </select>
                      {(selectedMapRegion !== "all" || selectedMapStatus !== "all") && (
                        <button
                          onClick={() => {
                            setSelectedMapRegion("all");
                            setSelectedMapStatus("all");
                          }}
                          style={{
                            padding: "4px 8px",
                            fontSize: "10px",
                            borderRadius: "4px",
                            border: "none",
                            backgroundColor: "#fee2e2",
                            color: "#991b1b",
                            cursor: "pointer",
                          }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Map Legend */}
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      marginBottom: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#6b7280" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#1e3a8a" }} />
                      <span>Active</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#6b7280" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#f97316" }} />
                      <span>Sponsored</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#6b7280" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
                      <span>Completed</span>
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: "10px", color: "#6b7280" }}>
                      {filteredProjectLocations.length} project{filteredProjectLocations.length !== 1 ? "s" : ""} shown
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
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "12px",
                      marginTop: "12px",
                      fontSize: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: "#1e3a8a",
                        }}
                      ></div>
                      <span style={{ color: "#4b5563" }}>
                        Active Projects ({filteredProjectLocations.filter(p => p.status === "active").length})
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: "#22c55e",
                        }}
                      ></div>
                      <span style={{ color: "#4b5563" }}>
                        Completed ({filteredProjectLocations.filter(p => p.status === "completed").length})
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: "#f97316",
                        }}
                      ></div>
                      <span style={{ color: "#4b5563" }}>
                        Sponsored ({filteredProjectLocations.filter(p => p.status === "sponsored").length})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 2, Col 1: Employee Engagement Funnel */}
                <div
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    padding: "16px",
                  }}
                  data-testid="chart-employee-funnel"
                >
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#111827",
                      marginBottom: "12px",
                    }}
                  >
                    Employee Engagement Funnel
                  </h3>
                  {funnelData?.funnel ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {funnelData.funnel.map((stage: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedFunnelStage(idx);
                            setShowFunnelModal(true);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            backgroundColor:
                              selectedFunnelStage === idx
                                ? "#eff6ff"
                                : "transparent",
                            border:
                              selectedFunnelStage === idx
                                ? "1px solid #3b82f6"
                                : "1px solid transparent",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f0f9ff";
                            e.currentTarget.style.border = "1px solid #3b82f6";
                          }}
                          onMouseLeave={(e) => {
                            if (selectedFunnelStage !== idx) {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                              e.currentTarget.style.border =
                                "1px solid transparent";
                            }
                          }}
                        >
                          {idx > 0 && (
                            <ChevronRight
                              style={{
                                width: "14px",
                                height: "14px",
                                color: "#9ca3af",
                              }}
                            />
                          )}
                          <span
                            style={{
                              fontWeight: idx === 0 ? "600" : "500",
                              color: idx === 0 ? "#1e3a8a" : "#374151",
                              flex: 1,
                            }}
                          >
                            {stage.stage}
                          </span>
                          <span style={{ fontWeight: "600", color: "#059669" }}>
                            ({stage.count})
                          </span>
                          {idx > 0 && (
                            <span
                              style={{ fontSize: "11px", color: "#6b7280" }}
                            >
                              -{stage.dropoff}%
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#3b82f6",
                              fontWeight: "500",
                            }}
                          >
                            →
                          </span>
                        </div>
                      ))}
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "8px 0",
                          borderTop: "1px solid #e5e7eb",
                          fontSize: "12px",
                          color: "#6b7280",
                        }}
                      >
                        Conversion to Active: {funnelData.conversion.toActive}%
                        • Top Performers:{" "}
                        {funnelData.conversion.toTopPerformers}%
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "#9ca3af", fontSize: "13px" }}>
                      Loading funnel data...
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
                {selectedKPI === "sdg" && "SDG Score Performance"}
                {selectedKPI === "volunteers" && "Total Volunteers"}
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
                    (csrData as any)?.kpiBreakdown?.hours?.total || 0
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
                        {(csrData as any)?.kpiBreakdown?.hours
                          ?.averagePerEmployee || 0}{" "}
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
                        {(csrData as any)?.kpiBreakdown?.hours?.weeklyAverage ||
                          0}{" "}
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
                        {(csrData as any)?.kpiBreakdown?.hours
                          ?.topProjectHours || 0}{" "}
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
                          (csrData as any)?.kpiBreakdown?.hours
                            ?.economicValue || 0
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
                  {(csrData as any)?.kpiBreakdown?.employees?.total || 0}{" "}
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
                        {(csrData as any)?.kpiBreakdown?.employees
                          ?.averageHoursPerEmployee || 0}{" "}
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
                        {(csrData as any)?.kpiBreakdown?.employees
                          ?.engagementRate || 0}
                        % of workforce
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
                        {(csrData as any)?.kpiBreakdown?.employees
                          ?.newThisMonth || 0}
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
                        {(csrData as any)?.kpiBreakdown?.employees
                          ?.topPerformer || "N/A"}{" "}
                        (
                        {(csrData as any)?.kpiBreakdown?.employees
                          ?.topPerformerHours || 0}{" "}
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
                  {(csrData as any)?.kpiBreakdown?.projects?.total || 0}{" "}
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
                        {(csrData as any)?.kpiBreakdown?.projects
                          ?.activeProjects || 0}
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
                          (csrData as any)?.kpiBreakdown?.projects
                            ?.totalHoursInvested || 0
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
                          (csrData as any)?.kpiBreakdown?.projects
                            ?.averageHoursPerProject || 0
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
                        {(csrData as any)?.kpiBreakdown?.projects
                          ?.regionsServed || 0}{" "}
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
                          (csrData as any)?.kpiBreakdown?.projects?.totalRoi ||
                          0
                        ).toFixed(1)}
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
                          (csrData as any)?.kpiBreakdown?.projects
                            ?.beneficiariesReached || 0
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
                  +{(csrData as any)?.kpiBreakdown?.sdg?.scoreDelta || 0}% SDG
                  Performance
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    marginBottom: "16px",
                    lineHeight: "1.6",
                  }}
                >
                  Progress across Sustainable Development Goals aligned with
                  your CSR strategy.
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
                    SDG Progress Metrics:
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
                      <span>✓ Active SDG commitments:</span>
                      <span style={{ fontWeight: "600" }}>
                        {(csrData as any)?.kpiBreakdown?.sdg
                          ?.activeCommitments || 0}
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Average progress:</span>
                      <span style={{ fontWeight: "600" }}>
                        {(csrData as any)?.kpiBreakdown?.sdg?.averageProgress ||
                          0}
                        %
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Total SDG hours:</span>
                      <span style={{ fontWeight: "600" }}>
                        {(
                          (csrData as any)?.kpiBreakdown?.sdg?.totalSdgHours ||
                          0
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
                      <span>✓ Active challenges:</span>
                      <span style={{ fontWeight: "600" }}>
                        {(csrData as any)?.kpiBreakdown?.sdg
                          ?.challengesActive || 0}
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ Completed challenges:</span>
                      <span style={{ fontWeight: "600" }}>
                        {(csrData as any)?.kpiBreakdown?.sdg
                          ?.challengesCompleted || 0}
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
                        🎯 Top SDG (Goal{" "}
                        {(csrData as any)?.kpiBreakdown?.sdg?.topSdg || 0}):
                      </span>
                      <span style={{ fontWeight: "600", color: "#059669" }}>
                        {(
                          (csrData as any)?.kpiBreakdown?.sdg?.topSdgHours || 0
                        ).toLocaleString()}{" "}
                        hrs
                      </span>
                    </li>
                  </ul>
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
                  {(csrData as any)?.totalVolunteers || sdgMetrics.reduce((sum, m) => sum + (m.uniqueEmployees || 0), 0) || 0} volunteers
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    marginBottom: "16px",
                    lineHeight: "1.6",
                  }}
                >
                  Total unique volunteers actively contributing to your CSR initiatives across all projects and SDG goals.
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
                    Volunteer Distribution by SDG:
                  </p>
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
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
                            padding: "8px 0",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "4px",
                                backgroundColor: getSDGColor(metric.sdg),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "11px",
                                fontWeight: "bold",
                              }}
                            >
                              {metric.sdg}
                            </div>
                            <span style={{ fontSize: "13px" }}>{getSDGName(metric.sdg)}</span>
                          </div>
                          <span style={{ fontWeight: "600", color: "#1e3a8a" }}>
                            {metric.uniqueEmployees} volunteers
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
                  <span style={{ fontSize: "18px" }}>📊</span>
                  <span style={{ fontSize: "13px", color: "#1e40af" }}>
                    <strong>Impact:</strong> Each volunteer contributes an average of{" "}
                    {csrData?.activeEmployees && csrData?.totalHours
                      ? Math.round(csrData.totalHours / csrData.activeEmployees)
                      : 0}{" "}
                    hours to your CSR goals.
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
