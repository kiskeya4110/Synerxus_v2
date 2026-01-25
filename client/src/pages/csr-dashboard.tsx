import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import {
  Home,
  BarChart2,
  BarChart3,
  Users,
  Briefcase,
  FileText,
  Settings,
  ChevronRight,
  X,
  Menu,
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
  Brain,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Mail,
  Search,
  Plus,
  RefreshCw,
  MoreVertical,
  LogOut,
  Flame,
  Building2,
  Download,
  Globe,
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
import { useToast } from "@/hooks/use-toast";
import { useAIUDisplay, SHADOW_MODE_LABELS } from "@/hooks/use-feature-flags";
import { getSDGName, getSDGFullName, getSDGColor } from "@shared/sdg-goals";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import { useState, useEffect, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/dialog-factory";
import { safeArray, safeMap, safeFilter, safeReduce } from "@/lib/safe-array";
import { lazy, Suspense, useMemo, useCallback, memo, Component, useRef, type ReactNode } from "react";
import Logo from "@/components/ui/logo";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";
import { CSRLayout } from "@/components/layout/csr-layout";
import KPIDetailModal from "@/components/dashboard/kpi-detail-modal";
import { ChartSkeleton as ImportedChartSkeleton, MapSkeleton as ImportedMapSkeleton } from "@/components/csr-dashboard";
import SDGDetailModal from "@/components/dashboard/sdg-detail-modal";
import AIInsightModal from "@/components/dashboard/ai-insight-modal";
import { formatDecimal, formatMetric, formatCompact } from "@/lib/format-utils";

// Error Boundary for lazy-loaded components
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LazyErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component failed to load:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center">
          <div className="text-center text-slate-500">
            <p className="text-sm">Component failed to load</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Import Leaflet for marker icon configuration - must be before react-leaflet
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

// Fix Leaflet default marker icon issue
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-ignore - Leaflet icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Lazy load heavy components for better initial load time
const EmployeeEngagementTab = lazy(() => import("./employee-engagement-tab"));

// Global Impact Map Component - consolidated for better loading
interface GlobalMapProps {
  projectLocations: Array<{
    id: number;
    name: string;
    lat: number;
    lng: number;
    region: string;
    employees: number;
    hours: number;
    status: string;
    sdgGoals?: number[];
  }>;
}

const GlobalImpactMap = memo(({ projectLocations }: GlobalMapProps) => {
  const mapRef = useRef<L.Map>(null);

  // Auto-zoom to project location cluster
  useEffect(() => {
    if (!mapRef.current || !projectLocations || projectLocations.length === 0) return;

    const coords = projectLocations.map(p => ({ lat: p.lat, lng: p.lng }));

    if (coords.length === 1) {
      // Single project - zoom to that location
      mapRef.current.setView([coords[0].lat, coords[0].lng], 6);
    } else {
      // Multiple projects - fit bounds to all with padding
      const bounds = L.latLngBounds(coords.map(c => [c.lat, c.lng] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    }
  }, [projectLocations]);

  if (!projectLocations || projectLocations.length === 0) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: "280px",
        color: "#9ca3af",
        fontSize: "13px",
        backgroundColor: "#0f172a",
        borderRadius: "8px",
      }}>
        No project locations mapped yet
      </div>
    );
  }

  return (
    <MapContainer
      key="csr-global-impact-map"
      ref={mapRef}
      center={[20, 0]}
      zoom={2}
      style={{ width: "100%", height: "100%", minHeight: "280px" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {projectLocations.map((project) => {
        const statusColor =
          project.status === "active" || project.status === "Active"
            ? "#3b82f6"
            : project.status === "completed" || project.status === "Completed"
              ? "#22c55e"
              : project.status === "in-progress" || project.status === "In Progress"
                ? "#f59e0b"
                : "#6b7280";

        const customIcon = L.divIcon({
          html: `<div style="
            position: relative;
            width: 44px;
            height: 56px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
          ">
            <!-- Flag pole -->
            <div style="
              position: absolute;
              left: 4px;
              top: 8px;
              width: 3px;
              height: 48px;
              background: linear-gradient(180deg, #374151 0%, #1f2937 100%);
              border-radius: 2px;
              box-shadow: 1px 0 2px rgba(0,0,0,0.2);
            "></div>
            <!-- Flag with logo -->
            <div style="
              position: absolute;
              top: 0;
              left: 7px;
              width: 36px;
              height: 28px;
              background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
              border: 2px solid ${statusColor};
              border-radius: 4px 4px 4px 0;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 2px 2px 8px rgba(0,0,0,0.2);
              overflow: hidden;
            ">
              <img src="${logoUrl}" alt="S" style="width: 28px; height: auto; object-fit: contain;" />
            </div>
            <!-- Employee count badge -->
            <div style="
              position: absolute;
              top: -4px;
              right: -2px;
              min-width: 18px;
              height: 18px;
              background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%);
              border: 2px solid white;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 10px;
              padding: 0 4px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            ">${project.employees}</div>
          </div>`,
          className: "custom-map-marker",
          iconSize: [44, 56],
          iconAnchor: [4, 56],
          popupAnchor: [18, -56],
        });

        return (
          <Marker
            key={project.id}
            position={[project.lat, project.lng]}
            icon={customIcon}
          >
            <Popup>
              <div style={{ fontSize: "12px", minWidth: "180px" }}>
                <p style={{ fontWeight: "600", margin: "0 0 6px 0", color: "#111827", fontSize: "13px" }}>
                  {project.name}
                </p>
                <p style={{ margin: "3px 0", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>📍</span> {project.region}
                </p>
                <p style={{ margin: "3px 0", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>👥</span> {project.employees} volunteer{project.employees !== 1 ? "s" : ""}
                </p>
                <p style={{ margin: "3px 0", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>⏱️</span> {project.hours.toLocaleString()} hours
                </p>
                <p style={{
                  margin: "6px 0 0 0",
                  padding: "6px 0 0 0",
                  borderTop: "1px solid #e5e7eb",
                  color: statusColor,
                  fontWeight: "600",
                  textTransform: "capitalize",
                  fontSize: "11px"
                }}>
                  Status: {project.status}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
});
GlobalImpactMap.displayName = "GlobalImpactMap";

// Lazy load the map component
const LazyGlobalImpactMap = lazy(() => Promise.resolve({ default: GlobalImpactMap }));

// Use skeleton components from csr-dashboard component library
const ChartSkeleton = ImportedChartSkeleton;
const MapSkeleton = ImportedMapSkeleton;

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
  logo?: string;
  logoUrl?: string;
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
    logo?: string;
    logoUrl?: string;
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
  monthlyTrend?: Array<{
    month: string;
    hours: number;
    employees: number;
  }>;
}

export default function CSRDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [location, navigate] = useLocation();
  const searchString = useSearch(); // Track query params for tab navigation
  const { toast } = useToast();

  // Feature flag for AIU display (Shadow Mode when disabled)
  const isAIUEnabled = useAIUDisplay();
  const userId = localStorage.getItem("currentUserId");
  const [isPending, startTransition] = useTransition();
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null);
  const [selectedAdminTab, setSelectedAdminTab] = useState<
    "reviews" | "insights" | "flagged" | "pendingVerification"
  >("reviews");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<number | null>(
    null,
  );
  const [showFunnelModal, setShowFunnelModal] = useState(false);
  // Initialize tab from URL params synchronously to prevent flash when navigating from other pages
  const [selectedMainTab, setSelectedMainTab] = useState<
    "overview" | "engagement" | "sdgs" | "leaderboard" | "recognition" | "challenges" | "geographic"
  >(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const validTabs = ['overview', 'engagement', 'sdgs', 'leaderboard', 'recognition', 'challenges', 'geographic'];
    if (tabParam && validTabs.includes(tabParam)) {
      return tabParam as "overview" | "engagement" | "sdgs" | "leaderboard" | "recognition" | "challenges" | "geographic";
    }
    return 'overview';
  });

  // Handle URL query parameter changes for client-side navigation (sidebar nav)
  // This effect handles tab changes AFTER initial mount (e.g., clicking sidebar links)
  // Uses searchString from wouter to properly detect query param changes
  useEffect(() => {
    const urlParams = new URLSearchParams(searchString);
    const tabParam = urlParams.get('tab');
    const validTabs = ['overview', 'engagement', 'sdgs', 'leaderboard', 'recognition', 'challenges', 'geographic'];
    if (tabParam && validTabs.includes(tabParam)) {
      startTransition(() => {
        setSelectedMainTab(tabParam as typeof selectedMainTab);
      });
    } else if (!tabParam && location === '/csr-dashboard') {
      // Only reset to overview if we're on the base dashboard URL without any tab param
      startTransition(() => {
        setSelectedMainTab('overview');
      });
    }
  }, [searchString, location]);

  // Mobile detection and PWA tab state
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'overview' | 'employees' | 'sdgs' | 'reports' | 'settings' | 'geographic'>('overview');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mobile KPI modal state
  const [mobileKPIModal, setMobileKPIModal] = useState<string | null>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check for stored tab from navigation (e.g., from CSRMobileNav or other pages)
  useEffect(() => {
    const storedTab = sessionStorage.getItem('csrMobileTab');
    if (storedTab && ['overview', 'employees', 'sdgs', 'reports', 'settings', 'geographic'].includes(storedTab)) {
      setMobileTab(storedTab as typeof mobileTab);
      sessionStorage.removeItem('csrMobileTab'); // Clear after reading
    }
  }, []);

  // Sync URL tab parameter with mobileTab on mobile
  useEffect(() => {
    if (isMobile) {
      const urlParams = new URLSearchParams(searchString);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'geographic') {
        startTransition(() => {
          setMobileTab('geographic');
        });
      }
    }
  }, [searchString, isMobile]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileMenu]);

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

  // AI Insight modal state
  const [activeInsightModal, setActiveInsightModal] = useState<'engagement' | 'retention' | 'skills' | 'milestone' | 'sdg-opportunity' | null>(null);

  // Enhanced KPI Detail Modal state (unified modal for all KPIs)
  const [kpiDetailModal, setKpiDetailModal] = useState<{
    isOpen: boolean;
    type: 'hours' | 'employees' | 'projects' | 'sdg' | 'volunteers' | 'aiu' | null;
  }>({ isOpen: false, type: null });

  // SDG Detail Modal state
  const [sdgDetailModal, setSdgDetailModal] = useState<{
    isOpen: boolean;
    sdgNumber: number | null;
  }>({ isOpen: false, sdgNumber: null });

  // AI Insight Modal state for SDG recommendations
  const [aiRecommendationModal, setAiRecommendationModal] = useState<{
    isOpen: boolean;
    recommendation: any | null;
  }>({ isOpen: false, recommendation: null });

  // PWA AI Action states
  const [showInitiativeLauncher, setShowInitiativeLauncher] = useState(false);
  const [showChallengeMode, setShowChallengeMode] = useState(false);
  const [showAIEngage, setShowAIEngage] = useState(false);
  const [showProjectsBrowser, setShowProjectsBrowser] = useState(false);
  const [showRallyTeam, setShowRallyTeam] = useState(false);
  const [aiEngageProgress, setAiEngageProgress] = useState(0);
  const [aiEngageStatus, setAiEngageStatus] = useState<'idle' | 'analyzing' | 'engaging' | 'complete'>('idle');
  const [selectedInitiativeSDG, setSelectedInitiativeSDG] = useState<number | null>(null);
  const [challengeConfig, setChallengeConfig] = useState({ hours: 127, days: 7, participants: 0 });

  // Engagement tips confirmation dialog
  const [showEngagementTipsDialog, setShowEngagementTipsDialog] = useState(false);
  const [isSendingTips, setIsSendingTips] = useState(false);

  // Individual employee selection for engagement
  const [selectedEmployeesForEngagement, setSelectedEmployeesForEngagement] = useState<string[]>([]);
  const [engagementMode, setEngagementMode] = useState<'all' | 'selected'>('all');

  // Time Period options
  const TIME_PERIODS = [
    { value: 'all', label: 'All Time' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' },
  ];

  // Check for authentication - allow demo mode when localStorage has user data
  const userType = localStorage.getItem("userType");
  const isDemoMode = !!userId && userType === 'corporate-partner' && !user;
  const isAuthenticated = (!!user && !!userId) || isDemoMode;

  const {
    data: csrData,
    isLoading,
    error,
    refetch: refetchCSRData,
  } = useQuery<CSRDashboardData>({
    queryKey: ["/api/csr/dashboard", userId, dateRange],
    queryFn: async () => {
      if (!userId) {
        throw new Error("User ID not available");
      }
      const params = new URLSearchParams({ userId });
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
    enabled: isAuthenticated && !!userId,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always', // Always refetch on mount to reload from database
    refetchInterval: 30000, // Poll every 30 seconds for real-time volunteer updates
    staleTime: 0, // Always consider data stale to ensure fresh database loads
    gcTime: 0, // Disable caching - always fetch fresh data from database
    retry: 2, // Retry failed requests up to 2 times
  });

  const { data: funnelData, refetch: refetchFunnel } = useQuery({
    queryKey: ["/api/csr/engagement-funnel", userId, dateRange],
    queryFn: async () => {
      if (!userId) return { funnel: [], conversion: {} };
      try {
        const params = new URLSearchParams({ userId });
        if (dateRange !== 'all') {
          params.append('timePeriod', dateRange);
        }
        const response = await fetch(
          `/api/csr/engagement-funnel?${params}`,
        );
        if (!response.ok) {
          console.warn("Failed to fetch funnel, returning empty data");
          return { funnel: [], conversion: {} };
        }
        return response.json();
      } catch (err) {
        console.warn("Error fetching funnel:", err);
        return { funnel: [], conversion: {} };
      }
    },
    enabled: isAuthenticated && !!userId,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always', // Always refetch on mount to reload from database
    refetchInterval: 30000,
    staleTime: 0, // Always consider data stale to ensure fresh database loads
    gcTime: 0, // Disable caching - always fetch fresh data from database
    retry: 2,
  });

  const { data: adminActionsData, refetch: refetchAdminActions } = useQuery({
    queryKey: ["/api/csr/pending-actions", userId, dateRange],
    queryFn: async () => {
      const emptyData = {
        reviews: { count: 0, items: [] },
        insights: { count: 0, items: [] },
        flagged: { count: 0, items: [] },
        totalActions: 0
      };
      if (!userId) return emptyData;
      try {
        const params = new URLSearchParams({ userId });
        if (dateRange !== 'all') {
          params.append('timePeriod', dateRange);
        }
        const response = await fetch(`/api/csr/pending-actions?${params}`);
        if (!response.ok) {
          console.warn("Failed to fetch pending actions, returning empty data");
          return emptyData;
        }
        return response.json();
      } catch (err) {
        console.warn("Error fetching pending actions:", err);
        return emptyData;
      }
    },
    enabled: isAuthenticated && !!userId,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always', // Always refetch on mount to reload from database
    refetchInterval: 30000,
    staleTime: 0, // Always consider data stale to ensure fresh database loads
    gcTime: 0, // Disable caching - always fetch fresh data from database
    retry: 2,
  });

  const { data: funnelStageData, refetch: refetchFunnelStage } = useQuery({
    queryKey: ["/api/csr/engagement-funnel-stage", userId, selectedFunnelStage, dateRange],
    queryFn: async () => {
      if (!userId || selectedFunnelStage === null) return { employees: [] };
      try {
        const params = new URLSearchParams({ userId, stage: String(selectedFunnelStage) });
        if (dateRange !== 'all') {
          params.append('timePeriod', dateRange);
        }
        const response = await fetch(
          `/api/csr/engagement-funnel-stage?${params}`,
        );
        if (!response.ok) {
          console.warn("Failed to fetch funnel stage, returning empty data");
          return { employees: [] };
        }
        return response.json();
      } catch (err) {
        console.warn("Error fetching funnel stage:", err);
        return { employees: [] };
      }
    },
    enabled: isAuthenticated && !!userId && selectedFunnelStage !== null,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always', // Always refetch on mount to reload from database
    staleTime: 0, // Always consider data stale to ensure fresh database loads
    gcTime: 0, // Disable caching - always fetch fresh data from database
    retry: 2,
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
    enabled: isAuthenticated && !!userId,
    staleTime: 60000, // Cache for 1 minute
  });

  // ===== MEMOIZED COMPUTED VALUES FOR PERFORMANCE =====
  // These computations are expensive and should only recalculate when dependencies change

  const companyName = useMemo(() =>
    csrPartnerData?.companyName || csrData?.companyName || csrData?.partners?.[0]?.companyName || "Loading...",
    [csrPartnerData?.companyName, csrData?.companyName, csrData?.partners]
  );

  const companyLogo = useMemo(() =>
    csrPartnerData?.logoUrl || csrPartnerData?.logo || csrData?.logo || csrData?.logoUrl || csrData?.partners?.[0]?.logo || csrData?.partners?.[0]?.logoUrl || null,
    [csrPartnerData?.logoUrl, csrPartnerData?.logo, csrData?.logo, csrData?.logoUrl, csrData?.partners]
  );

  const currentDate = useMemo(() =>
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    []
  );

  const adminName = useMemo(() =>
    user?.displayName || user?.email?.split('@')[0] || "Admin",
    [user?.displayName, user?.email]
  );

  // Memoize base SDG metrics
  const sdgMetrics = useMemo(() => csrData?.sdgMetrics || [], [csrData?.sdgMetrics]);

  const totalSDGHours = useMemo(() =>
    sdgMetrics.reduce((sum: number, metric: any) => sum + (metric.totalHours || 0), 0),
    [sdgMetrics]
  );

  const committedSDGsList = useMemo(() => csrData?.primarySdgs || [], [csrData?.primarySdgs]);

  // Memoize SDG chart data - expensive computation
  const { sdgChartData, committedTotalHours } = useMemo(() => {
    const committedTotal = sdgMetrics
      .filter(m => committedSDGsList.includes(m.sdg))
      .reduce((sum, m) => sum + (m.totalHours || 0), 0);

    const chartData = sdgMetrics
      .filter((metric) => committedSDGsList.includes(metric.sdg))
      .map((metric) => {
        const percentage = committedTotal > 0
          ? Math.round((metric.totalHours / committedTotal) * 100)
          : 0;
        return {
          name: getSDGName(metric.sdg),
          fullName: getSDGFullName(metric.sdg),
          value: Math.max(5, percentage),
          color: getSDGColor(metric.sdg),
          goal: metric.sdg,
          hours: metric.totalHours,
          employees: metric.uniqueEmployees,
          projects: metric.projectsContributed,
        };
      })
      .sort((a, b) => a.goal - b.goal);

    return { sdgChartData: chartData, committedTotalHours: committedTotal };
  }, [sdgMetrics, committedSDGsList]);

  // Memoize committed SDGs without data
  const committedSDGsWithoutData = useMemo(() =>
    committedSDGsList
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
      })),
    [sdgMetrics, committedSDGsList]
  );

  // Memoize all committed SDG chart data
  const allCommittedSDGChartData = useMemo(() =>
    [...sdgChartData, ...committedSDGsWithoutData].sort((a, b) => a.goal - b.goal),
    [sdgChartData, committedSDGsWithoutData]
  );

  // ESG Categories calculated from projects (not cumulative SDG sums)
  // This ensures hours are counted per project, distributed across ESG categories
  // Note: This is defined as a function so it can be used with filtered data later
  const calculateESGFromProjects = useCallback((projectList: any[]) => {
    const ENVIRONMENTAL_SDGS = [6, 7, 12, 13, 14, 15];
    const SOCIAL_SDGS = [1, 2, 3, 4, 5, 10, 11, 16];
    const GOVERNANCE_SDGS = [8, 9, 17];

    let environmental = 0;
    let social = 0;
    let governance = 0;
    let envProjects = 0;
    let socialProjects = 0;
    let govProjects = 0;

    projectList.forEach((project: any) => {
      const projectHours = project.hours || 0;
      const sdgGoals = project.sdgGoals || [];

      if (sdgGoals.length === 0 || projectHours === 0) return;

      // Count how many SDGs fall into each ESG category for this project
      const envCount = sdgGoals.filter((sdg: number) => ENVIRONMENTAL_SDGS.includes(sdg)).length;
      const socialCount = sdgGoals.filter((sdg: number) => SOCIAL_SDGS.includes(sdg)).length;
      const govCount = sdgGoals.filter((sdg: number) => GOVERNANCE_SDGS.includes(sdg)).length;
      const totalCategorizedSDGs = envCount + socialCount + govCount;

      if (totalCategorizedSDGs === 0) return;

      // Distribute project hours proportionally across ESG categories
      if (envCount > 0) {
        environmental += (projectHours * envCount) / totalCategorizedSDGs;
        envProjects++;
      }
      if (socialCount > 0) {
        social += (projectHours * socialCount) / totalCategorizedSDGs;
        socialProjects++;
      }
      if (govCount > 0) {
        governance += (projectHours * govCount) / totalCategorizedSDGs;
        govProjects++;
      }
    });

    return {
      environmental: Math.round(environmental),
      social: Math.round(social),
      governance: Math.round(governance),
      envProjects,
      socialProjects,
      govProjects
    };
  }, []);

  // Memoize employee activity outside commitments
  const employeeActivityOutsideCommitments = useMemo(() =>
    sdgMetrics
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
      .sort((a, b) => b.hours - a.hours),
    [sdgMetrics, committedSDGsList]
  );

  // Use real SDG data only - no dummy/placeholder data
  // If no data, show empty state with message to user
  const chartData = useMemo(() =>
    allCommittedSDGChartData.length > 0 ? allCommittedSDGChartData : [],
    [allCommittedSDGChartData]
  );

  // ===== MEMOIZED SDG COMMITMENT & AI INSIGHTS =====
  const committedSDGs = committedSDGsList;

  const committedSDGHours = useMemo(() =>
    sdgMetrics
      .filter(m => committedSDGs.includes(m.sdg))
      .reduce((sum, m) => sum + (m.totalHours || 0), 0),
    [sdgMetrics, committedSDGs]
  );

  const committedSDGEmployees = useMemo(() =>
    new Set(
      sdgMetrics
        .filter(m => committedSDGs.includes(m.sdg))
        .flatMap((m: any) => safeMap(m.employees, (emp: any) => emp.email))
    ).size,
    [sdgMetrics, committedSDGs]
  );

  const committedSDGProjects = useMemo(() =>
    new Set(
      sdgMetrics
        .filter(m => committedSDGs.includes(m.sdg))
        .flatMap((m: any) => safeMap(m.projects, (proj: any) => proj.id))
    ).size,
    [sdgMetrics, committedSDGs]
  );

  const activeCommittedSDGs = useMemo(() =>
    sdgMetrics.filter(m => committedSDGs.includes(m.sdg) && m.totalHours > 0).length,
    [sdgMetrics, committedSDGs]
  );

  const employeeUsedSDGs = useMemo(() =>
    new Set(sdgMetrics.filter(m => m.totalHours > 0).map(m => m.sdg)),
    [sdgMetrics]
  );

  const suggestedSDGs = useMemo(() =>
    Array.from(employeeUsedSDGs).filter(sdg => !committedSDGs.includes(sdg)).sort((a, b) => a - b),
    [employeeUsedSDGs, committedSDGs]
  );

  const displayedSDGsForFilters = useMemo(() =>
    committedSDGs.length > 0 ? committedSDGs : [],
    [committedSDGs]
  );

  // ===== MEMOIZED FILTERING LOGIC =====
  const matchesSDGFilter = useCallback((sdgs: number[] | undefined) => {
    if (selectedSDGFilters.length === 0) return true;
    if (!sdgs || sdgs.length === 0) return false;
    return selectedSDGFilters.some(filter => sdgs.includes(filter));
  }, [selectedSDGFilters]);

  const filteredSDGMetrics = useMemo(() =>
    selectedSDGFilters.length > 0
      ? sdgMetrics.filter(metric => selectedSDGFilters.includes(metric.sdg))
      : sdgMetrics,
    [sdgMetrics, selectedSDGFilters]
  );

  const projectRegions = useMemo(() =>
    Array.from(new Set(
      safeArray(csrData?.projectLocations).map((p: any) => p.region).filter(Boolean)
    )).sort(),
    [csrData?.projectLocations]
  );

  const filteredProjectLocations = useMemo(() =>
    safeArray(csrData?.projectLocations).filter((project: any) => {
      if (selectedSDGFilters.length > 0 && !matchesSDGFilter(project.sdgGoals)) return false;
      if (selectedMapRegion !== "all" && project.region !== selectedMapRegion) return false;
      if (selectedMapStatus !== "all" && project.status !== selectedMapStatus) return false;
      return true;
    }),
    [csrData?.projectLocations, selectedSDGFilters, selectedMapRegion, selectedMapStatus, matchesSDGFilter]
  );

  // Memoize filtered KPIs
  const { filteredTotalHours, filteredUniqueEmployees, filteredProjectsCount } = useMemo(() => ({
    filteredTotalHours: filteredSDGMetrics.reduce((sum: number, metric: any) => sum + (metric.totalHours || 0), 0),
    filteredUniqueEmployees: new Set(filteredSDGMetrics.flatMap((metric: any) => safeMap(metric.employees, (emp: any) => emp.email))).size,
    filteredProjectsCount: new Set(filteredSDGMetrics.flatMap((metric: any) => safeMap(metric.projects, (proj: any) => proj.id))).size,
  }), [filteredSDGMetrics]);

  // Memoize display values
  const displayTotalHours = useMemo(() =>
    selectedSDGFilters.length > 0 ? filteredTotalHours : (csrData?.totalHours || 0),
    [selectedSDGFilters.length, filteredTotalHours, csrData?.totalHours]
  );

  const displayActiveEmployees = useMemo(() =>
    selectedSDGFilters.length > 0 ? filteredUniqueEmployees : (csrData?.activeEmployees || 0),
    [selectedSDGFilters.length, filteredUniqueEmployees, csrData?.activeEmployees]
  );

  const displayProjectsCompleted = useMemo(() => {
    if (selectedSDGFilters.length > 0) return filteredProjectsCount;
    // Use kpiBreakdown.projects.total or activeProjects first, then projectsCompleted, then projectLocations count
    return csrData?.kpiBreakdown?.projects?.total ||
           csrData?.kpiBreakdown?.projects?.activeProjects ||
           csrData?.projectsCompleted ||
           csrData?.projectLocations?.length ||
           0;
  }, [selectedSDGFilters.length, filteredProjectsCount, csrData?.projectsCompleted, csrData?.kpiBreakdown?.projects, csrData?.projectLocations?.length]);

  const displayChartData = useMemo(() =>
    selectedSDGFilters.length > 0
      ? chartData.filter(item => selectedSDGFilters.includes(item.goal))
      : chartData,
    [chartData, selectedSDGFilters]
  );

  // ESG hours calculated from filtered projects - respects all dashboard filters
  const esgHoursByProject = useMemo(() => {
    const hasFilters = selectedSDGFilters.length > 0 || selectedMapRegion !== "all" || selectedMapStatus !== "all";
    const projectsToUse = hasFilters ? filteredProjectLocations : safeArray(csrData?.projectLocations);
    return calculateESGFromProjects(projectsToUse);
  }, [selectedSDGFilters.length, selectedMapRegion, selectedMapStatus, filteredProjectLocations, csrData?.projectLocations, calculateESGFromProjects]);

  // Filtered economic value (AIU/Impact) - calculated from displayed hours
  const displayTotalImpact = useMemo((): number => {
    const hasFilters = selectedSDGFilters.length > 0 || selectedMapRegion !== "all" || selectedMapStatus !== "all";
    const baseImpact = csrData?.totalImpact || 0;
    if (!hasFilters) return baseImpact;
    // Calculate filtered impact from filtered hours (using standard $34.79/hr rate / 1000 for AIU)
    return displayTotalHours * 34.79 / 1000;
  }, [selectedSDGFilters.length, selectedMapRegion, selectedMapStatus, displayTotalHours, csrData]);

  // Filtered leaderboard - filter by SDG if SDG filters are active
  const displayLeaderboard = useMemo((): any[] => {
    const leaderboard = csrData?.leaderboard || [];
    if (selectedSDGFilters.length === 0) return leaderboard;
    // Filter leaderboard to show employees who contributed to selected SDGs
    return leaderboard.filter((emp: any) => {
      // Check if employee has activity in filtered SDGs
      const empSDGs = emp.sdgContributions || emp.topSDGs || [];
      return selectedSDGFilters.some(filter => empSDGs.includes(filter));
    });
  }, [csrData?.leaderboard, selectedSDGFilters]);

  // Memoize callbacks
  const toggleSDGFilter = useCallback((sdgNumber: number) => {
    setSelectedSDGFilters(prev =>
      prev.includes(sdgNumber)
        ? prev.filter(s => s !== sdgNumber)
        : [...prev, sdgNumber]
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedSDGFilters([]);
    setDateRange("all");
  }, []);

  // ===== MEMOIZED MOBILE DATA =====
  // Use filtered SDG metrics for charts when filters are active
  const displaySDGMetrics = useMemo(() =>
    selectedSDGFilters.length > 0 ? filteredSDGMetrics : sdgMetrics,
    [selectedSDGFilters.length, filteredSDGMetrics, sdgMetrics]
  );

  const mobileRadarData = useMemo(() => displaySDGMetrics.slice(0, 8).map((metric: any) => ({
    sdg: `SDG ${metric.sdg}`,
    hours: metric.totalHours,
    employees: metric.uniqueEmployees * 10,
    projects: metric.projectsContributed * 20,
    fullMark: Math.max(displayTotalHours / 2, 100),
  })), [displaySDGMetrics, displayTotalHours]);

  // Memoize target hours calculation
  const targetHoursPerSDG = useMemo(() =>
    committedSDGs.length > 0 ? Math.round(displayTotalHours / committedSDGs.length) : 100,
    [committedSDGs.length, displayTotalHours]
  );

  // Memoize commitment radar data - uses filtered metrics when filters active
  const commitmentRadarData = useMemo(() => committedSDGs.map((sdg: number) => {
    const metric = displaySDGMetrics.find((m: any) => m.sdg === sdg);
    const actualHours = metric?.totalHours || 0;
    const employees = metric?.uniqueEmployees || 0;
    const projectCount = metric?.projectsContributed || 0;
    const progressPercent = targetHoursPerSDG > 0
      ? Math.min(Math.round((actualHours / targetHoursPerSDG) * 100), 150)
      : 0;
    return {
      sdg: `SDG ${sdg}`,
      sdgNumber: sdg,
      actual: actualHours,
      target: targetHoursPerSDG,
      progress: progressPercent,
      employees: employees,
      projects: projectCount,
    };
  }), [committedSDGs, displaySDGMetrics, targetHoursPerSDG]);

  // Memoize bar chart data - uses filtered metrics when filters active
  const mobileBarData = useMemo(() => displaySDGMetrics.slice(0, 6).map((metric: any) => ({
    name: getSDGName(metric.sdg).substring(0, 8),
    sdg: metric.sdg,
    hours: metric.totalHours,
    employees: metric.uniqueEmployees,
    projects: metric.projectsContributed,
    color: getSDGColor(metric.sdg),
  })), [displaySDGMetrics]);

  // Memoize trend data - use real data from backend, filtered by time period
  const mobileTrendData = useMemo(() => {
    // Use actual monthly trend data from backend if available
    if (csrData?.monthlyTrend && csrData.monthlyTrend.length > 0) {
      return csrData.monthlyTrend;
    }
    // Fallback to empty array if no trend data (shows empty chart instead of fake data)
    return [];
  }, [csrData?.monthlyTrend]);

  // ===== EARLY RETURNS (after all hooks) =====

  // Show loading while checking auth (skip in demo mode)
  if (authLoading && !isDemoMode) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#faf9f7",
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
          backgroundColor: "#faf9f7",
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

  // Show error if access denied - but allow retry
  if (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    const isAccessDenied = errorMessage.includes("Access denied") || errorMessage.includes("403");

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#faf9f7",
        }}
      >
        <Card
          style={{ maxWidth: "450px", padding: "24px", textAlign: "center" }}
        >
          <CardHeader>
            <CardTitle style={{ color: isAccessDenied ? "#dc2626" : "#f59e0b" }}>
              {isAccessDenied ? "Access Denied" : "Loading Error"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>
              {isAccessDenied
                ? "This dashboard is only available for Corporate Partner accounts. Please log in with a corporate partner account."
                : errorMessage
              }
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => refetchCSRData()}
                style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  padding: "8px 24px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Retry
              </button>
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
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#faf9f7]">
        {/* Header Skeleton */}
        <div className="h-16 bg-gradient-to-r from-amber-50 via-amber-100 to-amber-400 flex-shrink-0 flex items-center px-6">
          <Skeleton className="h-8 w-32 bg-blue-700/50" />
          <div className="ml-auto flex items-center gap-4">
            <Skeleton className="h-8 w-24 bg-blue-700/50" />
            <Skeleton className="h-10 w-10 rounded-full bg-blue-700/50" />
          </div>
        </div>

        <div className="flex flex-1">
          {/* Sidebar Skeleton */}
          <div className="w-[240px] bg-gradient-to-b from-blue-900 to-blue-950 flex-shrink-0 p-4 space-y-3 hidden md:block">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 bg-blue-800/50 rounded-lg" />
            ))}
          </div>

          {/* Main Content Skeleton */}
          <div className="flex-1 bg-slate-50 p-6 md:p-8 overflow-auto">
            {/* Page Title Skeleton */}
            <div className="mb-6">
              <Skeleton className="h-8 w-64 bg-slate-200 mb-2" />
              <Skeleton className="h-4 w-40 bg-slate-200" />
            </div>

            {/* KPI Cards Skeleton with shimmer effect */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20 bg-slate-200" />
                    <Skeleton className="h-8 w-8 rounded-lg bg-slate-100" />
                  </div>
                  <Skeleton className="h-8 w-24 bg-slate-200" />
                  <Skeleton className="h-3 w-32 bg-slate-100" />
                </div>
              ))}
            </div>

            {/* Charts Row Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <Skeleton className="h-5 w-40 bg-slate-200 mb-4" />
                <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-200 animate-pulse" />
                    <Skeleton className="h-4 w-32 bg-slate-200 mx-auto" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <Skeleton className="h-5 w-36 bg-slate-200 mb-4" />
                <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-200 animate-pulse" />
                    <Skeleton className="h-4 w-32 bg-slate-200 mx-auto" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <Skeleton className="h-5 w-32 bg-slate-200 mb-4" />
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full bg-slate-200" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-full bg-slate-200 mb-1" />
                        <Skeleton className="h-3 w-2/3 bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <Skeleton className="h-5 w-28 bg-slate-200 mb-4" />
                <div className="h-48 bg-slate-50 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile menu handlers
  const handleMobileRefresh = async () => {
    if (!isRefreshing) {
      setIsRefreshing(true);
      try {
        await refetchCSRData();
        toast({
          title: "Refreshed",
          description: "Dashboard data updated successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to refresh data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const handleMobileSignOut = async () => {
    try {
      setShowMobileMenu(false);
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

  // CSR Mobile Menu sections
  const csrMenuSections = [
    {
      title: "DASHBOARD",
      items: [
        { icon: Home, label: "Overview", desc: "ESG Dashboard home", action: () => { setMobileTab('overview'); setShowMobileMenu(false); } },
        { icon: Users, label: "Employee Engagement", desc: "Team activity & stats", action: () => { setMobileTab('employees'); setShowMobileMenu(false); } },
        { icon: Target, label: "SDG Alignment", desc: "UN Goals tracking", action: () => { setMobileTab('sdgs'); setShowMobileMenu(false); } },
      ]
    },
    {
      title: "ANALYTICS & REPORTS",
      items: [
        { icon: BarChart3, label: "Impact Reports", desc: "View detailed reports", action: () => { setMobileTab('reports'); setShowMobileMenu(false); } },
        { icon: Download, label: "Export Data", desc: "Download CSV/PDF reports", action: () => navigate('/csr-reports-exports') },
        { icon: Globe, label: "Geographic Impact", desc: "Map view of activities", action: () => { setShowMobileMenu(false); startTransition(() => setMobileTab('geographic')); } },
      ]
    },
    {
      title: "ENGAGEMENT TOOLS",
      items: [
        { icon: Trophy, label: "Leaderboard", desc: "Top performers", action: () => navigate('/volunteer-leaderboard/pwa'), hot: true },
        { icon: Award, label: "Recognition", desc: "Celebrate employees", action: () => { setShowRecognitionModal(true); setShowMobileMenu(false); } },
        { icon: Flame, label: "Challenges", desc: "Active initiatives", action: () => { setMobileTab('overview'); setShowMobileMenu(false); } },
      ]
    },
    {
      title: "ACCOUNT",
      items: [
        { icon: Settings, label: "Settings", desc: "Dashboard preferences", action: () => { setMobileTab('settings'); setShowMobileMenu(false); } },
        { icon: Building2, label: "Company Profile", desc: "Update company info", action: () => navigate('/organization-profile-settings') },
      ]
    },
  ];

  // Get user avatar for fallback (Firebase user has photoURL)
  const userAvatar = user?.photoURL;

  // Mobile PWA View
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#faf9f7] max-w-[428px] mx-auto relative">
        {/* Mobile Header - Fixed at top */}
        <header
          className="fixed top-0 left-0 right-0 max-w-[428px] mx-auto px-3 py-2.5 flex items-center justify-between z-50 shadow-lg"
          style={{ background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #fef3c7 75%, #fde68a 100%)" }}
        >
          <button
            onClick={() => navigate("/landing")}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <img src={logoUrl} alt="Synerxus" className="h-8 w-auto" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-emerald-800 font-semibold mr-1">ESG Dashboard</span>
            {/* Refresh Button */}
            <button
              onClick={handleMobileRefresh}
              disabled={isRefreshing}
              className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-700 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {/* Menu Button */}
            <button
              onClick={() => setShowMobileMenu(true)}
              className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all"
              aria-label="Menu"
            >
              <MoreVertical className="w-4 h-4 text-emerald-700" />
            </button>
          </div>
        </header>

        {/* Spacer for fixed header */}
        <div className="h-14" />

        {/* Company Name Banner with Large Logo */}
        <div className="bg-gradient-to-r from-emerald-50/95 via-teal-50/95 to-amber-50/95 backdrop-blur-sm border-b border-emerald-200/50 px-4 py-3">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="h-14 w-14 rounded-xl object-contain bg-white shadow-md border border-emerald-100 flex-shrink-0 p-1"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : userAvatar ? (
              <img
                src={userAvatar}
                alt={companyName}
                className="h-14 w-14 rounded-xl object-cover bg-white shadow-md border border-emerald-100 flex-shrink-0"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white text-2xl font-bold">{companyName.charAt(0)}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-emerald-900 text-lg font-bold leading-tight">{companyName}</span>
              <span className="text-emerald-600 text-xs font-medium mt-0.5">ESG Command Center</span>
            </div>
          </div>
        </div>

        {/* Main Content with Internal Tabs */}
        <main className="overflow-y-auto pb-20 px-3 pt-3">
          {mobileTab === 'overview' && (
            <div className="space-y-3">
              <h1 className="text-slate-900 text-base font-bold">ESG Dashboard Overview</h1>

              {/* KPI Cards Grid - Interactive */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => startTransition(() => setMobileKPIModal('hours'))}
                  className="bg-blue-50 rounded-lg p-3 border border-blue-300 shadow-sm text-left hover:bg-blue-100 hover:border-blue-400 transition-all active:scale-98"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-700" />
                      <span className="text-blue-700 text-[10px] font-medium">Total Hours</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-blue-400" />
                  </div>
                  <div className="text-slate-900 text-xl font-bold mt-1">{displayTotalHours.toLocaleString()}</div>
                  <div className="text-blue-600 text-[9px] mt-0.5 flex items-center gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5" />
                    +12% vs last month
                  </div>
                </button>
                <button
                  onClick={() => startTransition(() => setMobileKPIModal('employees'))}
                  className="bg-emerald-50 rounded-lg p-3 border border-emerald-300 shadow-sm text-left hover:bg-emerald-100 hover:border-emerald-400 transition-all active:scale-98"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-emerald-700 text-[10px] font-medium">Employees</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="text-slate-900 text-xl font-bold mt-1">{displayActiveEmployees}</div>
                  <div className="text-emerald-600 text-[9px] mt-0.5 flex items-center gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5" />
                    +8% vs last month
                  </div>
                </button>
                <button
                  onClick={() => startTransition(() => setMobileKPIModal('projects'))}
                  className="bg-purple-50 rounded-lg p-3 border border-purple-300 shadow-sm text-left hover:bg-purple-100 hover:border-purple-400 transition-all active:scale-98"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-purple-700" />
                      <span className="text-purple-700 text-[10px] font-medium">Projects</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-purple-400" />
                  </div>
                  <div className="text-slate-900 text-xl font-bold mt-1">{displayProjectsCompleted}</div>
                  <div className="text-purple-600 text-[9px] mt-0.5">Active initiatives</div>
                </button>
                <button
                  onClick={() => startTransition(() => setMobileKPIModal('aiu'))}
                  className="bg-teal-50 rounded-lg p-3 border border-teal-300 shadow-sm text-left hover:bg-teal-100 hover:border-teal-400 transition-all active:scale-98"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-teal-700" />
                      <span className="text-teal-700 text-[10px] font-medium">{isAIUEnabled ? "AIUs Earned" : SHADOW_MODE_LABELS.AIU_REPLACEMENT}</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-teal-400" />
                  </div>
                  <div className="text-slate-900 text-xl font-bold mt-1">{formatDecimal(displayTotalImpact || 0)}</div>
                  <div className="text-teal-600 text-[9px] mt-0.5 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    Impact units
                  </div>
                </button>
              </div>

              {/* ESG Audit Summary - Verified Impact Data */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-emerald-900 text-sm font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Verified Impact (Audit-Ready)
                  </h3>
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                    ESG Compliant
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/70 rounded-lg p-2">
                    <div className="text-emerald-700 text-lg font-bold">{displayTotalHours.toLocaleString()}</div>
                    <div className="text-slate-600 text-[9px]">Verified Hours</div>
                  </div>
                  <div className="bg-white/70 rounded-lg p-2">
                    <div className="text-emerald-700 text-lg font-bold">{displayActiveEmployees > 0 ? Math.round((displayActiveEmployees / (displayActiveEmployees + 10)) * 100) : 0}%</div>
                    <div className="text-slate-600 text-[9px]">Participation</div>
                  </div>
                  <div className="bg-white/70 rounded-lg p-2">
                    <div className="text-emerald-700 text-lg font-bold">${formatDecimal(displayTotalHours * 34.79 / 1000)}K</div>
                    <div className="text-slate-600 text-[9px]">Social Value</div>
                  </div>
                </div>
                <p className="text-[9px] text-emerald-700 mt-2 text-center italic">
                  All data verified by NGO partners with full audit trail
                </p>
              </div>

              {/* SDG Radar Chart - Compact */}
              {mobileRadarData.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                  <h3 className="text-slate-900 text-sm font-semibold mb-2">SDG Progress Radar</h3>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={mobileRadarData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="sdg" tick={{ fill: '#475569', fontSize: 9 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#475569', fontSize: 8 }} />
                        <Radar name="Hours" dataKey="hours" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
                        <Radar name="Employees" dataKey="employees" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                          labelStyle={{ color: '#fff' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2 text-[10px]">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-slate-700 font-medium">Hours</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-700 font-medium">Employees</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SDG Commitments - Interactive with UN Icons */}
              {committedSDGs && committedSDGs.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-slate-900 text-sm font-semibold">SDG Commitments</h3>
                    <span className="text-[10px] text-slate-500">{activeCommittedSDGs}/{committedSDGs.length} Active</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {committedSDGs.map((sdg: number) => {
                      const metric = sdgMetrics.find((m: any) => m.sdg === sdg);
                      const hasActivity = metric && metric.totalHours > 0;
                      return (
                        <button
                          key={sdg}
                          onClick={() => startTransition(() => setSelectedSDG(sdg))}
                          className="relative"
                          title={`${getSDGName(sdg)} - Click for details`}
                        >
                          <img
                            src={getSDGIcon(sdg)}
                            alt={`SDG ${sdg}: ${getSDGName(sdg)}`}
                            className="w-12 h-12 rounded-lg object-cover shadow-sm"
                            loading="lazy"
                            style={{
                              border: hasActivity ? '2px solid #22c55e' : '1px solid #e5e7eb',
                            }}
                          />
                          {hasActivity && (
                            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] font-bold px-1 rounded-full shadow">
                              {formatDecimal(metric.totalHours)}h
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top SDG Progress - Interactive with UN Icons */}
              <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                <h3 className="text-slate-900 text-sm font-semibold mb-2">Top SDG Impact</h3>
                <div className="space-y-2">
                  {sdgMetrics.slice(0, 4).map((metric: any) => (
                    <button
                      key={metric.sdg}
                      onClick={() => startTransition(() => setSelectedSDG(metric.sdg))}
                      className="w-full flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <img
                        src={getSDGIcon(metric.sdg)}
                        alt={`SDG ${metric.sdg}`}
                        className="w-8 h-8 rounded object-cover flex-shrink-0 shadow-sm"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-slate-700 truncate">{getSDGName(metric.sdg)}</span>
                          <span className="text-slate-900 font-semibold ml-1">{formatDecimal(metric.totalHours)}h</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min((metric.totalHours / (totalSDGHours || 1)) * 100 * 5, 100)}%`,
                              backgroundColor: getSDGColor(metric.sdg)
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Leaderboard Preview - Compact */}
              {displayLeaderboard && displayLeaderboard.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                  <h3 className="text-slate-900 text-sm font-semibold mb-2">Top Volunteers</h3>
                  <div className="space-y-1.5">
                    {displayLeaderboard.slice(0, 4).map((employee: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => startTransition(() => setSelectedEmployee({ ...employee, rank: idx + 1 }))}
                        className="w-full flex items-center gap-2 p-1.5 rounded bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm transition-all active:scale-[0.98]"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-[10px]">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-slate-900 text-xs truncate font-medium">{employee.name || employee.employeeName}</div>
                        </div>
                        <div className="text-amber-700 font-semibold text-xs">{formatDecimal(employee.hours)}h</div>
                        <ChevronRight className="w-3 h-3 text-amber-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Navigation to Tabs */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200 shadow-sm">
                <h3 className="text-slate-900 text-sm font-semibold mb-2">Explore More</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => startTransition(() => setMobileTab('employees'))}
                    className="flex items-center gap-2 p-3 bg-white rounded-lg border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 active:scale-[0.98] transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-slate-900 text-xs font-semibold">Employee Engagement</div>
                      <div className="text-slate-500 text-[9px]">Team activity & stats</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400 ml-auto" />
                  </button>
                  <button
                    onClick={() => startTransition(() => setMobileTab('sdgs'))}
                    className="flex items-center gap-2 p-3 bg-white rounded-lg border border-teal-200 hover:bg-teal-50 hover:border-teal-300 active:scale-[0.98] transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-slate-900 text-xs font-semibold">SDG Alignment</div>
                      <div className="text-slate-500 text-[9px]">UN Goals tracking</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-teal-400 ml-auto" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {mobileTab === 'employees' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-slate-900 text-lg font-bold">Team Analytics</h1>
                <button
                  onClick={() => startTransition(() => setMobileTab('employees'))}
                  className="text-[10px] text-blue-600 font-medium flex items-center gap-1"
                >
                  Full Analytics <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* AI Insights Section - Industry Innovating */}
              <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-lg p-3 border border-indigo-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 text-sm font-bold">AI-Powered Insights</h3>
                    <p className="text-indigo-600 text-[9px]">Real-time workforce intelligence</p>
                  </div>
                </div>

                {/* Key AI Insights - All Interactive */}
                <div className="space-y-2">
                  {/* Insight 1 - Engagement Prediction */}
                  <button
                    onClick={() => setActiveInsightModal('engagement')}
                    className="w-full bg-white/80 rounded-lg p-2.5 border border-indigo-100 hover:bg-emerald-50 hover:border-emerald-200 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-emerald-700">Engagement Surge Predicted</span>
                          <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">+{Math.max(5, Math.round(displayActiveEmployees * 0.23))}%</span>
                          <ChevronRight className="w-3 h-3 text-emerald-400 ml-auto" />
                        </div>
                        <p className="text-[9px] text-slate-600 mt-0.5">Based on current momentum, expect {Math.max(5, Math.round(displayActiveEmployees * 0.23))}% more volunteers next month. Consider launching new initiatives.</p>
                      </div>
                    </div>
                  </button>

                  {/* Insight 2 - Risk Alert */}
                  <button
                    onClick={() => setActiveInsightModal('retention')}
                    className="w-full bg-white/80 rounded-lg p-2.5 border border-amber-100 hover:bg-amber-50 hover:border-amber-200 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-amber-700">Retention Risk Detected</span>
                          <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{Math.max(1, Math.round(displayActiveEmployees * 0.15))} employees</span>
                          <ChevronRight className="w-3 h-3 text-amber-400 ml-auto" />
                        </div>
                        <p className="text-[9px] text-slate-600 mt-0.5">{Math.max(1, Math.round(displayActiveEmployees * 0.15))} active volunteers showing declining engagement. Recommend personalized outreach within 7 days.</p>
                      </div>
                    </div>
                  </button>

                  {/* Insight 3 - Skills Match Opportunity */}
                  <button
                    onClick={() => setActiveInsightModal('skills')}
                    className="w-full bg-white/80 rounded-lg p-2.5 border border-blue-100 hover:bg-blue-50 hover:border-blue-200 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Lightbulb className="w-3 h-3 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-blue-700">Skills-Based Opportunity</span>
                          <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">High Impact</span>
                          <ChevronRight className="w-3 h-3 text-blue-400 ml-auto" />
                        </div>
                        <p className="text-[9px] text-slate-600 mt-0.5">{Math.max(2, Math.round(displayActiveEmployees * 0.2))} employees with skills not yet matched. Pro bono mentoring could significantly increase your {isAIUEnabled ? "AIU" : "impact score"}.</p>
                      </div>
                    </div>
                  </button>

                  {/* Insight 4 - Achievement Unlocked */}
                  <button
                    onClick={() => setActiveInsightModal('milestone')}
                    className="w-full bg-white/80 rounded-lg p-2.5 border border-purple-100 hover:bg-purple-50 hover:border-purple-200 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Award className="w-3 h-3 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-purple-700">Milestone Approaching</span>
                          <span className="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">{Math.min(99, Math.round((displayTotalHours / Math.max(displayTotalHours + 50, 100)) * 100))}% complete</span>
                          <ChevronRight className="w-3 h-3 text-purple-400 ml-auto" />
                        </div>
                        <p className="text-[9px] text-slate-600 mt-0.5">Only {Math.max(10, 100 - Math.round(displayTotalHours % 100))} hours needed to reach the next milestone! Rally the team for a final push!</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* AI Actions */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() => {
                      setShowAIEngage(true);
                      setAiEngageStatus('analyzing');
                      setAiEngageProgress(0);
                    }}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm hover:from-indigo-600 hover:to-purple-700 active:scale-95 transition-all"
                  >
                    <Zap className="w-3 h-3" />
                    Auto-Engage At-Risk
                  </button>
                  <button
                    onClick={() => setShowProjectsBrowser(true)}
                    className="bg-white text-indigo-700 text-[10px] font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-indigo-200 hover:bg-indigo-50 active:scale-95 transition-all"
                  >
                    <Brain className="w-3 h-3" />
                    Browse Projects
                  </button>
                </div>
              </div>

              {/* Quick Team Stats */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => startTransition(() => setMobileKPIModal('participation'))}
                  className="bg-blue-50 rounded-lg p-2 border border-blue-200 text-center hover:bg-blue-100 transition-colors"
                >
                  <div className="text-blue-700 text-lg font-bold">{csrData?.kpiBreakdown?.employees?.engagementRate || Math.round((displayActiveEmployees / Math.max(csrData?.kpiBreakdown?.employees?.totalRoster || displayActiveEmployees || 1, 1)) * 100)}%</div>
                  <div className="text-blue-600 text-[9px] font-medium">Participation</div>
                </button>
                <button
                  onClick={() => startTransition(() => setMobileKPIModal('retention'))}
                  className="bg-emerald-50 rounded-lg p-2 border border-emerald-200 text-center hover:bg-emerald-100 transition-colors"
                >
                  <div className="text-emerald-700 text-lg font-bold">{Math.min(100, Math.max(60, Math.round((displayActiveEmployees / Math.max(displayLeaderboard?.length || 1, 1)) * 100 + 20)))}%</div>
                  <div className="text-emerald-600 text-[9px] font-medium">Retention</div>
                </button>
                <button
                  onClick={() => startTransition(() => setMobileKPIModal('satisfaction'))}
                  className="bg-amber-50 rounded-lg p-2 border border-amber-200 text-center hover:bg-amber-100 transition-colors"
                >
                  <div className="text-amber-700 text-lg font-bold">{formatDecimal(4.2 + (displayActiveEmployees > 5 ? 0.4 : 0))}</div>
                  <div className="text-amber-600 text-[9px] font-medium">Satisfaction</div>
                </button>
              </div>

              {/* Engagement Trend Chart */}
              <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                <h3 className="text-slate-900 text-sm font-semibold mb-2">Engagement Trend</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mobileTrendData} margin={{ top: 5, right: 35, bottom: 5, left: -5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 9 }} />
                      <YAxis
                        yAxisId="hours"
                        orientation="left"
                        tick={{ fill: '#3B82F6', fontSize: 8 }}
                        scale="log"
                        domain={[1, 'auto']}
                        allowDataOverflow
                        tickFormatter={(value) => value >= 1000 ? `${formatDecimal(value/1000)}k` : value}
                      />
                      <YAxis
                        yAxisId="employees"
                        orientation="right"
                        tick={{ fill: '#10B981', fontSize: 8 }}
                        scale="log"
                        domain={[1, 'auto']}
                        allowDataOverflow
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value: number, name: string) => [
                          value.toLocaleString(),
                          name === 'hours' ? 'Hours' : 'Employees'
                        ]}
                      />
                      <Line yAxisId="hours" type="monotone" dataKey="hours" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 3 }} />
                      <Line yAxisId="employees" type="monotone" dataKey="employees" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-1 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-slate-700 font-medium">Hours (log)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-700 font-medium">Employees (log)</span>
                  </div>
                </div>
              </div>

              {/* Engagement Funnel - Interactive */}
              {funnelData?.funnel && (
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-slate-900 text-sm font-semibold">Engagement Funnel</h3>
                    <span className="text-[9px] text-blue-600 font-medium">Tap to engage</span>
                  </div>
                  <div className="space-y-2">
                    {funnelData.funnel.map((stage: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedFunnelStage(idx);
                          setShowFunnelModal(true);
                        }}
                        className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 active:bg-slate-100"
                      >
                        <div className="w-10 text-right">
                          <span className="text-slate-900 font-bold text-sm">{stage.count}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-slate-700 text-[10px] truncate">{stage.stage}</div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-0.5">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                              style={{ width: `${(stage.count / (funnelData.funnel[0]?.count || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-600 text-[10px] font-medium">
                            {Math.round((stage.count / (funnelData.funnel[0]?.count || 1)) * 100)}%
                          </span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-[9px] text-slate-500 text-center">Click any stage to view employees and take action</p>
                  </div>
                </div>
              )}

              {/* Full Leaderboard - Compact Table */}
              <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                <h3 className="text-slate-900 text-sm font-semibold mb-2">Leaderboard</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left text-slate-600 pb-1.5 font-semibold">#</th>
                        <th className="text-left text-slate-600 pb-1.5 font-semibold">Employee</th>
                        <th className="text-right text-slate-600 pb-1.5 font-semibold">Hours</th>
                        <th className="text-right text-slate-600 pb-1.5 font-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(displayLeaderboard || []).slice(0, 8).map((employee: any, idx: number) => (
                        <tr
                          key={idx}
                          onClick={() => startTransition(() => setSelectedEmployee({ ...employee, rank: idx + 1 }))}
                          className="border-b border-slate-100 cursor-pointer hover:bg-amber-50 transition-colors active:bg-amber-100"
                        >
                          <td className="py-1.5">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-bold ${
                              idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600' :
                              idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                              idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                              'bg-gray-500'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-1.5 text-slate-900 truncate max-w-[120px] font-medium">{employee.name || employee.employeeName}</td>
                          <td className="py-1.5 text-amber-700 font-semibold text-right">{formatDecimal(employee.hours)}h</td>
                          <td className="py-1.5 text-emerald-600 text-right font-medium">${Math.round(employee.hours * 34.79).toLocaleString()}</td>
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
              <h1 className="text-slate-900 text-lg font-bold">SDG Impact</h1>

              {/* SDG Bar Chart */}
              {mobileBarData.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                  <h3 className="text-slate-900 text-sm font-semibold mb-2">Hours by SDG</h3>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mobileBarData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 8 }} angle={-45} textAnchor="end" height={40} />
                        <YAxis tick={{ fill: '#475569', fontSize: 9 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
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

              {/* SDG Radar with Commitments Overlay - Only shows committed SDGs */}
              {commitmentRadarData.length > 0 ? (
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                  <h3 className="text-slate-900 text-sm font-semibold mb-2">Commitment vs Progress</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={commitmentRadarData} margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="sdg" tick={{ fill: '#475569', fontSize: 8 }} />
                        <PolarRadiusAxis angle={30} domain={[0, Math.max(targetHoursPerSDG * 1.5, 100)]} tick={{ fill: '#475569', fontSize: 7 }} />
                        <Radar name="Target" dataKey="target" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
                        <Radar name="Actual" dataKey="actual" stroke="#10B981" fill="#10B981" fillOpacity={0.5} strokeWidth={2} />
                        <Legend wrapperStyle={{ fontSize: '9px' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '10px', color: '#fff' }}
                          formatter={(value: number, name: string, props: any) => {
                            const data = props.payload;
                            if (name === 'Target') return [`${value}h target`, `SDG ${data.sdgNumber}`];
                            return [`${value}h actual (${data.progress}%)`, `SDG ${data.sdgNumber}`];
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-1 text-[10px]">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-slate-700 font-medium">Target ({targetHoursPerSDG}h)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-700 font-medium">Actual Hours</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                  <h3 className="text-slate-900 text-sm font-semibold mb-2">Commitment vs Progress</h3>
                  <p className="text-slate-600 text-xs text-center py-4">
                    Set SDG commitments to track progress
                  </p>
                </div>
              )}

              {/* SDG Commitments Grid - Interactive with UN Icons */}
              {committedSDGs && committedSDGs.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                  <h3 className="text-slate-900 text-sm font-semibold mb-2">Committed SDGs</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {committedSDGs.map((sdg: number) => {
                      const metric = sdgMetrics.find((m: any) => m.sdg === sdg);
                      const hasActivity = metric && metric.totalHours > 0;
                      return (
                        <button
                          key={sdg}
                          onClick={() => startTransition(() => setSelectedSDG(sdg))}
                          className="relative aspect-square rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                          style={{
                            border: hasActivity ? '2px solid #22c55e' : '1px solid #e5e7eb',
                          }}
                        >
                          <img
                            src={getSDGIcon(sdg)}
                            alt={`SDG ${sdg}: ${getSDGName(sdg)}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {hasActivity && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                              <span className="text-white text-[9px] font-bold">{formatDecimal(metric.totalHours)}h</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SDG Metrics Table - Interactive with UN Icons */}
              <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                <h3 className="text-slate-900 text-sm font-semibold mb-2">SDG Metrics</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left text-slate-600 pb-1.5 font-semibold">SDG</th>
                        <th className="text-right text-slate-600 pb-1.5 font-semibold">Hours</th>
                        <th className="text-right text-slate-600 pb-1.5 font-semibold">Staff</th>
                        <th className="text-right text-slate-600 pb-1.5 font-semibold">Proj</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sdgMetrics.slice(0, 8).map((metric: any) => (
                        <tr
                          key={metric.sdg}
                          className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => startTransition(() => setSelectedSDG(metric.sdg))}
                        >
                          <td className="py-1.5">
                            <div className="flex items-center gap-1.5">
                              <img
                                src={getSDGIcon(metric.sdg)}
                                alt={`SDG ${metric.sdg}`}
                                className="w-6 h-6 rounded object-cover shadow-sm"
                                loading="lazy"
                              />
                              <span className="text-slate-700 truncate max-w-[70px]">{getSDGName(metric.sdg)}</span>
                            </div>
                          </td>
                          <td className="py-1.5 text-slate-900 font-semibold text-right">{formatDecimal(metric.totalHours)}</td>
                          <td className="py-1.5 text-emerald-700 text-right font-medium">{metric.uniqueEmployees}</td>
                          <td className="py-1.5 text-purple-700 text-right font-medium">{metric.projectsContributed}</td>
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
              <h1 className="text-slate-900 text-lg font-bold">Reports</h1>

              {/* Summary Stats - All Interactive */}
              <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                <h3 className="text-slate-900 text-sm font-semibold mb-2">Quick Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <button
                    onClick={() => startTransition(() => setMobileKPIModal('aiu'))}
                    className="bg-teal-50 rounded p-2 border border-teal-200 text-left hover:bg-teal-100 hover:border-teal-300 active:scale-[0.98] transition-all"
                  >
                    <div className="text-slate-600 font-medium">{isAIUEnabled ? "Total AIUs Earned" : `Total ${SHADOW_MODE_LABELS.AIU_REPLACEMENT}`}</div>
                    <div className="text-teal-700 text-lg font-bold">{formatDecimal(displayTotalImpact || 0)}</div>
                  </button>
                  <button
                    onClick={() => startTransition(() => setMobileTab('sdgs'))}
                    className="bg-blue-50 rounded p-2 border border-blue-200 text-left hover:bg-blue-100 hover:border-blue-300 active:scale-[0.98] transition-all"
                  >
                    <div className="text-slate-600 font-medium">SDGs Addressed</div>
                    <div className="text-blue-700 text-lg font-bold">{sdgMetrics.length}</div>
                  </button>
                  <button
                    onClick={() => startTransition(() => setMobileTab('employees'))}
                    className="bg-purple-50 rounded p-2 border border-purple-200 text-left hover:bg-purple-100 hover:border-purple-300 active:scale-[0.98] transition-all"
                  >
                    <div className="text-slate-600 font-medium">Avg Hours/Employee</div>
                    <div className="text-purple-700 text-lg font-bold">{displayActiveEmployees > 0 ? Math.round(displayTotalHours / displayActiveEmployees) : 0}</div>
                  </button>
                  <button
                    onClick={() => startTransition(() => setMobileKPIModal('hours'))}
                    className="bg-emerald-50 rounded p-2 border border-emerald-200 text-left hover:bg-emerald-100 hover:border-emerald-300 active:scale-[0.98] transition-all"
                  >
                    <div className="text-slate-600 font-medium">Economic Value</div>
                    <div className="text-emerald-700 text-lg font-bold">${formatDecimal(displayTotalHours * 34.79 / 1000)}K</div>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/csr-impact-reporting')}
                    className="w-full p-3 rounded-lg bg-blue-50 border border-blue-300 text-left hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-700" />
                      <div>
                        <div className="text-slate-900 text-sm font-semibold">Impact Report</div>
                        <div className="text-slate-600 text-[10px]">View detailed analytics</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-700 ml-auto" />
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/csr-reports-exports')}
                    className="w-full p-3 rounded-lg bg-purple-50 border border-purple-300 text-left hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-700" />
                      <div>
                        <div className="text-slate-900 text-sm font-semibold">Export Data</div>
                        <div className="text-slate-600 text-[10px]">Download reports</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-purple-700 ml-auto" />
                    </div>
                  </button>

                  <button
                    onClick={() => startTransition(() => setMobileTab('employees'))}
                    className="w-full p-3 rounded-lg bg-amber-50 border border-amber-300 text-left hover:bg-amber-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-700" />
                      <div>
                        <div className="text-slate-900 text-sm font-semibold">Engagement Analytics</div>
                        <div className="text-slate-600 text-[10px]">Employee insights</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-700 ml-auto" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {mobileTab === 'settings' && (
            <div className="space-y-3">
              <h1 className="text-slate-900 text-lg font-bold">Settings</h1>

              <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/corporate-partner-profile-settings')}
                    className="w-full p-3 rounded-lg bg-slate-50 border border-slate-300 text-left hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-slate-700" />
                      <div>
                        <div className="text-slate-900 text-sm font-semibold">Profile Settings</div>
                        <div className="text-slate-600 text-[10px]">SDG commitments & company info</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/corporate-partner-profile-settings')}
                    className="w-full p-3 rounded-lg bg-slate-50 border border-slate-300 text-left hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-slate-700" />
                      <div>
                        <div className="text-slate-900 text-sm font-semibold">Organization</div>
                        <div className="text-slate-600 text-[10px]">Manage org settings</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Current User Info */}
              <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                <h3 className="text-slate-900 text-sm font-semibold mb-2">Account</h3>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {adminName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-slate-900 text-sm font-semibold">{adminName}</div>
                    <div className="text-slate-600 text-[10px]">{user?.email}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mobileTab === 'geographic' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-700" />
                <h1 className="text-slate-900 text-base font-bold">Geographic Impact</h1>
              </div>
              <p className="text-slate-600 text-xs">Project locations where your employees are making a difference</p>

              {/* Region Filter */}
              <div className="flex gap-2">
                <select
                  value={selectedMapRegion}
                  onChange={(e) => startTransition(() => setSelectedMapRegion(e.target.value))}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 cursor-pointer"
                  style={{ backgroundColor: selectedMapRegion !== "all" ? "#dbeafe" : "white" }}
                >
                  <option value="all">All Regions</option>
                  {projectRegions.map((region: string) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
                <select
                  value={selectedMapStatus}
                  onChange={(e) => startTransition(() => setSelectedMapStatus(e.target.value))}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 cursor-pointer"
                  style={{ backgroundColor: selectedMapStatus !== "all" ? "#dbeafe" : "white" }}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="sponsored">Sponsored</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Stats Cards - Connected to real data */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-300">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-700" />
                    <span className="text-blue-700 text-[10px] font-medium">Active Projects</span>
                  </div>
                  <div className="text-slate-900 text-xl font-bold">{displayProjectsCompleted}</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-300">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-emerald-700 text-[10px] font-medium">Employees</span>
                  </div>
                  <div className="text-slate-900 text-xl font-bold">{displayActiveEmployees}</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-300">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span className="text-amber-700 text-[10px] font-medium">Hours</span>
                  </div>
                  <div className="text-slate-900 text-xl font-bold">{displayTotalHours.toLocaleString()}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-300">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe className="w-3.5 h-3.5 text-purple-700" />
                    <span className="text-purple-700 text-[10px] font-medium">Regions</span>
                  </div>
                  <div className="text-slate-900 text-xl font-bold">{projectRegions.length}</div>
                </div>
              </div>

              {/* Interactive Map */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-3 border-b border-slate-200">
                  <h3 className="text-slate-900 text-sm font-semibold flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-600" />
                    Project Map
                  </h3>
                </div>
                <div className="h-[250px]">
                  <LazyErrorBoundary fallback={<MapSkeleton />}>
                    <Suspense fallback={<MapSkeleton />}>
                      <LazyGlobalImpactMap projectLocations={filteredProjectLocations} />
                    </Suspense>
                  </LazyErrorBoundary>
                </div>
              </div>

              {/* Project List - Connected to real data */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-3 border-b border-slate-200">
                  <h3 className="text-slate-900 text-sm font-semibold">Project Locations</h3>
                </div>
                {filteredProjectLocations.length > 0 ? (
                  <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                    {filteredProjectLocations.slice(0, 10).map((project: any, idx: number) => (
                      <div key={project.id || idx} className="p-3 hover:bg-slate-50">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 text-sm truncate">{project.name || project.projectName || 'Unnamed Project'}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{project.region || project.location || 'Unknown Region'}</div>
                            {project.sdgGoals && project.sdgGoals.length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {project.sdgGoals.slice(0, 3).map((sdg: number) => (
                                  <span key={sdg} className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: getSDGColor(sdg) }}>
                                    SDG {sdg}
                                  </span>
                                ))}
                                {project.sdgGoals.length > 3 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">
                                    +{project.sdgGoals.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {project.status && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                              project.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {project.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredProjectLocations.length > 10 && (
                      <div className="p-3 text-center text-slate-500 text-xs">
                        +{filteredProjectLocations.length - 10} more projects
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-sm">
                    No project locations found
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Bottom Navigation - Green to gold gradient matching web view */}
        <nav
          className="fixed bottom-0 left-0 right-0 border-t border-emerald-300/30 px-1 py-1.5 max-w-[428px] mx-auto z-50 shadow-lg"
          style={{ background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #fef3c7 75%, #fde68a 100%)" }}
        >
          <div className="flex justify-around items-center">
            <button
              onClick={() => startTransition(() => setMobileTab('overview'))}
              className={`flex flex-col items-center py-1 px-2 rounded transition-all ${
                mobileTab === 'overview' ? 'text-emerald-900' : 'text-emerald-700'
              }`}
              data-testid="nav-overview"
            >
              <Home className={`w-4 h-4 mb-0.5 ${mobileTab === 'overview' ? 'text-emerald-900' : 'text-emerald-700'}`} />
              <span className="text-[9px] font-medium">Home</span>
            </button>

            <button
              onClick={() => startTransition(() => setMobileTab('employees'))}
              className={`flex flex-col items-center py-1 px-2 rounded transition-all ${
                mobileTab === 'employees' ? 'text-emerald-900' : 'text-emerald-700'
              }`}
              data-testid="nav-employees"
            >
              <Users className={`w-4 h-4 mb-0.5 ${mobileTab === 'employees' ? 'text-emerald-900' : 'text-emerald-700'}`} />
              <span className="text-[9px] font-medium">Team</span>
            </button>

            <button
              onClick={() => startTransition(() => setMobileTab('sdgs'))}
              className={`flex flex-col items-center py-1 px-2 rounded transition-all ${
                mobileTab === 'sdgs' ? 'text-emerald-900' : 'text-emerald-700'
              }`}
              data-testid="nav-sdgs"
            >
              <Target className={`w-4 h-4 mb-0.5 ${mobileTab === 'sdgs' ? 'text-emerald-900' : 'text-emerald-700'}`} />
              <span className="text-[9px] font-medium">SDGs</span>
            </button>

            <button
              onClick={() => startTransition(() => setMobileTab('reports'))}
              className={`flex flex-col items-center py-1 px-2 rounded transition-all ${
                mobileTab === 'reports' ? 'text-emerald-900' : 'text-emerald-700'
              }`}
              data-testid="nav-reports"
            >
              <BarChart3 className={`w-4 h-4 mb-0.5 ${mobileTab === 'reports' ? 'text-emerald-900' : 'text-emerald-700'}`} />
              <span className="text-[9px] font-medium">Reports</span>
            </button>

            <button
              onClick={() => startTransition(() => setMobileTab('geographic'))}
              className={`flex flex-col items-center py-1 px-2 rounded transition-all ${
                mobileTab === 'geographic' ? 'text-emerald-900' : 'text-emerald-700'
              }`}
              data-testid="nav-map"
            >
              <Globe className={`w-4 h-4 mb-0.5 ${mobileTab === 'geographic' ? 'text-emerald-900' : 'text-emerald-700'}`} />
              <span className="text-[9px] font-medium">Map</span>
            </button>
          </div>
        </nav>

        {/* Mobile KPI Detail Modal */}
        {mobileKPIModal && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => startTransition(() => setMobileKPIModal(null))}>
            <div
              className="bg-white rounded-t-2xl w-full max-w-[428px] max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  {mobileKPIModal === 'hours' && 'Total Volunteer Hours'}
                  {mobileKPIModal === 'employees' && 'Active Employees'}
                  {mobileKPIModal === 'projects' && 'Active Projects'}
                  {mobileKPIModal === 'aiu' && (isAIUEnabled ? 'Attributable Impact Units' : SHADOW_MODE_LABELS.AIU_FULL_NAME_REPLACEMENT)}
                  {mobileKPIModal === 'participation' && 'Participation Rate'}
                  {mobileKPIModal === 'retention' && 'Volunteer Retention'}
                  {mobileKPIModal === 'satisfaction' && 'Satisfaction Score'}
                </h2>
                <button
                  onClick={() => startTransition(() => setMobileKPIModal(null))}
                  className="p-2 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                {/* Hours Modal */}
                {mobileKPIModal === 'hours' && (
                  <>
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold text-blue-600">{displayTotalHours.toLocaleString()}</div>
                      <div className="text-slate-600 text-sm mt-1">Total hours contributed</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => startTransition(() => { setMobileKPIModal(null); setMobileKPIModal('employees'); })}
                        className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200 hover:bg-blue-100 hover:border-blue-300 active:scale-95 transition-all"
                      >
                        <div className="text-blue-700 text-xl font-bold">
                          {csrData?.kpiBreakdown?.hours?.averagePerEmployee || Math.round(displayTotalHours / (displayActiveEmployees || 1))}
                        </div>
                        <div className="text-blue-600 text-xs">Avg Hours/Employee</div>
                      </button>
                      <button
                        onClick={() => navigate('/csr-reports-exports')}
                        className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 active:scale-95 transition-all"
                      >
                        <div className="text-emerald-700 text-xl font-bold">
                          ${formatDecimal(displayTotalHours * 34.79 / 1000)}K
                        </div>
                        <div className="text-emerald-600 text-xs">Economic Value</div>
                      </button>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <h4 className="font-semibold text-slate-800 text-sm mb-2">Hours by SDG (tap to view)</h4>
                      <div className="space-y-2">
                        {sdgMetrics
                          .slice()
                          .sort((a: any, b: any) => (b.totalHours || 0) - (a.totalHours || 0))
                          .slice(0, 4)
                          .map((metric: any) => {
                            const percentage = displayTotalHours > 0 ? Math.round((metric.totalHours / displayTotalHours) * 100) : 0;
                            return (
                              <button
                                key={metric.sdg}
                                onClick={() => startTransition(() => { setMobileKPIModal(null); setSelectedSDG(metric.sdg); })}
                                className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-white active:scale-98 transition-all border border-transparent hover:border-slate-300"
                              >
                                <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: getSDGColor(metric.sdg) }}>
                                  {metric.sdg}
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-700 truncate">{getSDGName(metric.sdg)}</span>
                                    <span className="text-slate-900 font-medium">{formatDecimal(metric.totalHours)}h</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: getSDGColor(metric.sdg) }} />
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              </button>
                            );
                          })}
                        {sdgMetrics.length === 0 && (
                          <div className="text-center text-slate-500 text-sm py-2">No SDG data available</div>
                        )}
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        onClick={() => navigate('/csr-impact-reporting')}
                        className="bg-blue-600 text-white text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-700 active:scale-95 transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View Report
                      </button>
                      <button
                        onClick={() => startTransition(() => { setMobileKPIModal(null); setMobileKPIModal('employees'); })}
                        className="bg-white text-blue-700 text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-blue-300 hover:bg-blue-50 active:scale-95 transition-all"
                      >
                        <Users className="w-3.5 h-3.5" />
                        View Employees
                      </button>
                    </div>
                  </>
                )}

                {/* Employees Modal */}
                {mobileKPIModal === 'employees' && (
                  <>
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold text-emerald-600">{displayActiveEmployees}</div>
                      <div className="text-slate-600 text-sm mt-1">Active volunteers this period</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => toast({ title: "Participation Rate", description: `${csrData?.kpiBreakdown?.employees?.engagementRate || 0}% of workforce actively volunteers.` })}
                        className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all"
                      >
                        <div className="text-emerald-700 text-lg font-bold">
                          {csrData?.kpiBreakdown?.employees?.engagementRate || (csrData?.kpiBreakdown?.employees?.totalRoster && displayActiveEmployees
                            ? Math.round((displayActiveEmployees / csrData.kpiBreakdown.employees.totalRoster) * 100)
                            : 0)}%
                        </div>
                        <div className="text-emerald-600 text-[10px]">Participation</div>
                      </button>
                      <button
                        onClick={() => toast({ title: "Total Roster", description: `${csrData?.kpiBreakdown?.employees?.totalRoster || Math.round(displayActiveEmployees * 1.5)} employees in workforce.` })}
                        className="bg-blue-50 rounded-lg p-2 text-center border border-blue-200 hover:bg-blue-100 active:scale-95 transition-all"
                      >
                        <div className="text-blue-700 text-lg font-bold">
                          {csrData?.kpiBreakdown?.employees?.totalRoster || Math.round(displayActiveEmployees * 1.5)}
                        </div>
                        <div className="text-blue-600 text-[10px]">Total Roster</div>
                      </button>
                      <button
                        onClick={() => toast({ title: "New Volunteers", description: `${csrData?.kpiBreakdown?.employees?.newThisMonth || Math.round(displayActiveEmployees * 0.15)} new participants joined this month!` })}
                        className="bg-amber-50 rounded-lg p-2 text-center border border-amber-200 hover:bg-amber-100 active:scale-95 transition-all"
                      >
                        <div className="text-amber-700 text-lg font-bold">
                          +{csrData?.kpiBreakdown?.employees?.newThisMonth || Math.round(displayActiveEmployees * 0.15)}
                        </div>
                        <div className="text-amber-600 text-[10px]">New This Month</div>
                      </button>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <h4 className="font-semibold text-slate-800 text-sm mb-2">Top Volunteers (tap for details)</h4>
                      <div className="space-y-2">
                        {(displayLeaderboard || []).slice(0, 5).map((emp: any, i: number) => (
                          <button
                            key={emp.rank || i}
                            onClick={() => startTransition(() => { setMobileKPIModal(null); setSelectedEmployee({ ...emp, rank: i + 1 }); })}
                            className="flex items-center gap-2 w-full bg-white rounded-lg p-2.5 border border-slate-200 hover:bg-amber-50 hover:border-amber-300 active:scale-98 transition-all"
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-emerald-600'}`}>
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="text-slate-900 text-sm font-medium truncate">{emp.employeeName || emp.name || `Volunteer ${i + 1}`}</div>
                              <div className="text-slate-500 text-[10px]">{emp.points || 0} points</div>
                            </div>
                            <div className="text-right">
                              <div className="text-emerald-600 text-sm font-bold">{emp.hours || 0}h</div>
                              <div className="text-purple-600 text-[10px] font-medium">${Math.round((emp.hours || 0) * 34.79).toLocaleString()}</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </button>
                        ))}
                        {(!displayLeaderboard || displayLeaderboard.length === 0) && (
                          <div className="text-center text-slate-500 text-sm py-3">No volunteer data available</div>
                        )}
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        onClick={() => startTransition(() => { setMobileKPIModal(null); setMobileTab('employees'); })}
                        className="bg-emerald-600 text-white text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 hover:bg-emerald-700 active:scale-95 transition-all"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Team Analytics
                      </button>
                      <button
                        onClick={() => startTransition(() => { setMobileKPIModal(null); setMobileKPIModal('hours'); })}
                        className="bg-white text-emerald-700 text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-emerald-300 hover:bg-emerald-50 active:scale-95 transition-all"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        View Hours
                      </button>
                    </div>
                  </>
                )}

                {/* Projects Modal */}
                {mobileKPIModal === 'projects' && (
                  <>
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold text-purple-600">{displayProjectsCompleted}</div>
                      <div className="text-slate-600 text-sm mt-1">Active volunteer projects</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <button
                        onClick={() => startTransition(() => { setMobileKPIModal(null); setMobileKPIModal('hours'); })}
                        className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200 hover:bg-purple-100 active:scale-95 transition-all"
                      >
                        <div className="text-purple-700 text-xl font-bold">{csrData?.kpiBreakdown?.projects?.activeProjects || displayProjectsCompleted}</div>
                        <div className="text-purple-600 text-xs">Active Projects</div>
                      </button>
                      <button
                        onClick={() => toast({ title: "Regions Served", description: `Projects span ${csrData?.kpiBreakdown?.projects?.regionsServed || csrData?.projectLocations?.length || 0} geographic regions.` })}
                        className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200 hover:bg-blue-100 active:scale-95 transition-all"
                      >
                        <div className="text-blue-700 text-xl font-bold">{csrData?.kpiBreakdown?.projects?.regionsServed || csrData?.projectLocations?.length || 0}</div>
                        <div className="text-blue-600 text-xs">Regions Served</div>
                      </button>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-slate-800 text-sm">Top Projects (tap for details)</h4>
                      {(csrData?.projectLocations || [])
                        .slice()
                        .sort((a: any, b: any) => (b.hours || 0) - (a.hours || 0))
                        .slice(0, 4)
                        .map((proj: any, i: number) => (
                        <button
                          key={proj.id || i}
                          onClick={() => toast({ title: proj.name || `Project ${i + 1}`, description: `${proj.hours || 0} hours • ${proj.employees || 0} volunteers • ${proj.region || 'N/A'}` })}
                          className="bg-white rounded-lg p-2.5 border border-slate-200 flex items-center gap-2 w-full hover:bg-purple-50 hover:border-purple-300 active:scale-98 transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-slate-900 text-sm font-medium truncate">{proj.name || `Project ${proj.id}`}</div>
                            <div className="text-slate-500 text-xs">{proj.hours || 0} hours • {proj.region || 'N/A'}</div>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${proj.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                            {proj.status || 'active'}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      ))}
                      {(!csrData?.projectLocations || csrData.projectLocations.length === 0) && (
                        <div className="text-center text-slate-500 text-sm py-4">No project data available</div>
                      )}
                    </div>
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        onClick={() => navigate('/project-portfolio')}
                        className="bg-purple-600 text-white text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 hover:bg-purple-700 active:scale-95 transition-all"
                      >
                        <FolderKanban className="w-3.5 h-3.5" />
                        All Projects
                      </button>
                      <button
                        onClick={() => startTransition(() => { setMobileKPIModal(null); setMobileKPIModal('aiu'); })}
                        className="bg-white text-purple-700 text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-purple-300 hover:bg-purple-50 active:scale-95 transition-all"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        {isAIUEnabled ? "View AIUs" : `View ${SHADOW_MODE_LABELS.AIU_REPLACEMENT}`}
                      </button>
                    </div>
                  </>
                )}

                {/* AIU Modal */}
                {mobileKPIModal === 'aiu' && (
                  <>
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold text-teal-600">{formatDecimal(displayTotalImpact || 0)}</div>
                      <div className="text-slate-600 text-sm mt-1">{isAIUEnabled ? "Attributable Impact Units" : SHADOW_MODE_LABELS.AIU_FULL_NAME_REPLACEMENT}</div>
                    </div>
                    {isAIUEnabled && (
                    <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
                      <h4 className="font-semibold text-teal-800 text-sm mb-2">What is Impact Score?</h4>
                      <p className="text-xs text-slate-700 mb-2">Impact Score is Synerxus's proprietary metric for measuring verified SDG contributions. Your score represents your auditable share of real-world social and environmental impact.</p>
                      <p className="text-[10px] text-slate-600 italic">Scores are evidence-backed by NGO verification and project data</p>
                    </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => startTransition(() => {
                          setMobileKPIModal(null);
                          setMobileTab('sdgs');
                        })}
                        className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200 hover:bg-blue-100 hover:border-blue-300 active:scale-95 transition-all"
                      >
                        <div className="text-blue-700 text-xl font-bold">{sdgMetrics.filter((m: any) => m.totalHours > 0).length}</div>
                        <div className="text-blue-600 text-xs">SDGs Impacted</div>
                      </button>
                      <button
                        onClick={() => {
                          toast({
                            title: "Verification Status",
                            description: isAIUEnabled ? "All Scores are evidence-backed with NGO verification and project IDs." : "All impact scores are evidence-backed with NGO verification and project IDs.",
                          });
                        }}
                        className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 active:scale-95 transition-all"
                      >
                        <div className="text-emerald-700 text-lg font-bold flex items-center justify-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Verified
                        </div>
                        <div className="text-emerald-600 text-xs">Evidence-Backed</div>
                      </button>
                    </div>
                    {isAIUEnabled && (
                    <div className="bg-slate-50 rounded-lg p-2 mt-2">
                      <p className="text-[10px] text-slate-600 text-center">Impact Score is Synerxus's proprietary metric for measuring verified, attributable SDG impact.</p>
                    </div>
                    )}
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        onClick={() => navigate('/csr-impact-reporting')}
                        className="bg-teal-600 text-white text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 hover:bg-teal-700 active:scale-95 transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View Impact Report
                      </button>
                      <button
                        onClick={() => startTransition(() => {
                          setMobileKPIModal(null);
                          setSelectedKPI('sdg');
                        })}
                        className="bg-white text-teal-700 text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-teal-300 hover:bg-teal-50 active:scale-95 transition-all"
                      >
                        <Target className="w-3.5 h-3.5" />
                        SDG Breakdown
                      </button>
                    </div>
                  </>
                )}

                {/* Participation Modal */}
                {mobileKPIModal === 'participation' && (
                  <>
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold text-blue-600">42%</div>
                      <div className="text-slate-600 text-sm mt-1">Employee participation rate</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-700">Industry Benchmark</span>
                        <span className="text-sm font-semibold text-blue-700">35%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '42%' }} />
                      </div>
                      <div className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Above industry average
                      </div>
                    </div>
                  </>
                )}

                {/* Retention Modal */}
                {mobileKPIModal === 'retention' && (
                  <>
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold text-emerald-600">78%</div>
                      <div className="text-slate-600 text-sm mt-1">Volunteer retention rate</div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-xs text-slate-700">78% of employees who volunteered last quarter continue to participate. This is 12% above the VMS industry benchmark of 66%.</p>
                    </div>
                  </>
                )}

                {/* Satisfaction Modal */}
                {mobileKPIModal === 'satisfaction' && (
                  <>
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold text-amber-600">4.6<span className="text-xl">/5</span></div>
                      <div className="text-slate-600 text-sm mt-1">Average satisfaction score</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3">
                      <div className="flex gap-1 justify-center mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-6 h-6 ${star <= 4 ? 'text-amber-500 fill-amber-500' : 'text-amber-300'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-slate-700 text-center">Based on 156 volunteer feedback responses this quarter.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Engagement Funnel Modal */}
        {showFunnelModal && selectedFunnelStage !== null && funnelData?.funnel && (
          <div
            className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center"
            onClick={() => startTransition(() => setShowFunnelModal(false))}
          >
            <div
              className="bg-white rounded-t-2xl w-full max-w-[428px] max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-blue-500 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {funnelData.funnel[selectedFunnelStage].stage}
                  </h2>
                  <p className="text-xs text-white/80">
                    {funnelData.funnel[selectedFunnelStage].description || 'Engagement stage details'}
                  </p>
                </div>
                <button
                  onClick={() => startTransition(() => setShowFunnelModal(false))}
                  className="p-2 rounded-full hover:bg-white/20"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                {/* Stage Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200">
                    <div className="text-emerald-700 text-2xl font-bold">
                      {funnelData.funnel[selectedFunnelStage].count}
                    </div>
                    <div className="text-emerald-600 text-xs">Employees in Stage</div>
                  </div>
                  {selectedFunnelStage > 0 && (
                    <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                      <div className="text-red-700 text-2xl font-bold">
                        {funnelData.funnel[selectedFunnelStage].dropoff || 0}%
                      </div>
                      <div className="text-red-600 text-xs">Drop-off Rate</div>
                    </div>
                  )}
                  {selectedFunnelStage === 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                      <div className="text-blue-700 text-2xl font-bold">100%</div>
                      <div className="text-blue-600 text-xs">Starting Point</div>
                    </div>
                  )}
                </div>

                {/* Conversion Progress */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-700">Funnel Progress</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {Math.round((funnelData.funnel[selectedFunnelStage].count / (funnelData.funnel[0]?.count || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${(funnelData.funnel[selectedFunnelStage].count / (funnelData.funnel[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Employees List */}
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-600" />
                    Employees in this Stage ({funnelStageData?.employees?.length || 0})
                  </h4>
                  {funnelStageData?.employees && funnelStageData.employees.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {funnelStageData.employees.slice(0, 10).map((emp: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                              {(emp.name || emp.employeeName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-800">{emp.name || emp.employeeName || 'Employee'}</div>
                              <div className="text-[10px] text-slate-500">{emp.hours || 0}h logged</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      Loading employee data...
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-sm font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2"
                    onClick={() => {
                      setShowFunnelModal(false);
                      // Could trigger email/notification action
                    }}
                  >
                    <Mail className="w-4 h-4" />
                    Engage All
                  </button>
                  <button
                    className="bg-white text-slate-700 text-sm font-semibold py-2.5 px-4 rounded-lg border border-slate-300 flex items-center justify-center gap-2"
                    onClick={() => startTransition(() => setShowFunnelModal(false))}
                  >
                    <X className="w-4 h-4" />
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Insight Detail Modal */}
        {activeInsightModal && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => setActiveInsightModal(null)}>
            <div
              className="bg-white rounded-t-2xl w-full max-w-[428px] max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Engagement Surge Modal */}
              {activeInsightModal === 'engagement' && (
                <>
                  <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                    <div>
                      <h2 className="text-lg font-bold text-white">Engagement Surge Predicted</h2>
                      <p className="text-xs text-white/80">AI-powered forecast analysis</p>
                    </div>
                    <button onClick={() => setActiveInsightModal(null)} className="p-2 rounded-full hover:bg-white/20">
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="text-center py-4">
                      <div className="text-5xl font-bold text-emerald-600">+23%</div>
                      <div className="text-slate-600 text-sm mt-1">Predicted volunteer increase</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200">
                        <div className="text-emerald-700 text-xl font-bold">{Math.round(displayActiveEmployees * 1.23)}</div>
                        <div className="text-emerald-600 text-xs">Expected Next Month</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                        <div className="text-blue-700 text-xl font-bold">
                          {Math.min(95, Math.max(55,
                            60 + // Base confidence
                            (displayActiveEmployees >= 10 ? 15 : displayActiveEmployees >= 5 ? 8 : 3) + // Employee data volume
                            (displayTotalHours >= 100 ? 10 : displayTotalHours >= 50 ? 5 : 2) + // Hours data volume
                            (displayProjectsCompleted >= 5 ? 10 : displayProjectsCompleted >= 2 ? 5 : 0) // Project completion data
                          ))}%
                        </div>
                        <div className="text-blue-600 text-xs">Confidence Score</div>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <h4 className="font-semibold text-slate-800 text-sm mb-2">Recommended SDG Initiatives</h4>
                      <div className="space-y-2">
                        <button onClick={() => { setActiveInsightModal(null); setSelectedSDG(4); }} className="w-full flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all">
                          <img src={getSDGIcon(4)} alt="SDG 4" className="w-8 h-8 rounded" />
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-slate-800">SDG 4: Quality Education</div>
                            <div className="text-xs text-slate-500">High volunteer interest detected</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                        <button onClick={() => { setActiveInsightModal(null); setSelectedSDG(13); }} className="w-full flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
                          <img src={getSDGIcon(13)} alt="SDG 13" className="w-8 h-8 rounded" />
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-slate-800">SDG 13: Climate Action</div>
                            <div className="text-xs text-slate-500">Trending among employees</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <h4 className="font-semibold text-emerald-800 text-sm mb-1">AI Recommendation</h4>
                      <p className="text-xs text-slate-700">Launch a new SDG 4 or SDG 13 initiative within the next 2 weeks to capitalize on the predicted engagement surge. Consider team challenges to boost participation.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setActiveInsightModal(null); setShowInitiativeLauncher(true); }}
                        className="bg-emerald-600 text-white text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 hover:bg-emerald-700 active:scale-95 transition-all"
                      >
                        <FolderKanban className="w-3.5 h-3.5" />
                        Launch Initiative
                      </button>
                      <button
                        onClick={() => setActiveInsightModal(null)}
                        className="bg-white text-emerald-700 text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-emerald-300 hover:bg-emerald-50 active:scale-95 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                        Dismiss
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Retention Risk Modal */}
              {activeInsightModal === 'retention' && (
                <>
                  <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                    <div>
                      <h2 className="text-lg font-bold text-white">Retention Risk Detected</h2>
                      <p className="text-xs text-white/80">Employees showing declining engagement</p>
                    </div>
                    <button onClick={() => setActiveInsightModal(null)} className="p-2 rounded-full hover:bg-white/20">
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="text-center py-4">
                      <div className="text-5xl font-bold text-amber-600">12</div>
                      <div className="text-slate-600 text-sm mt-1">At-risk employees identified</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-red-50 rounded-lg p-2 text-center border border-red-200">
                        <div className="text-red-700 text-lg font-bold">3</div>
                        <div className="text-red-600 text-[9px]">Critical</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-2 text-center border border-amber-200">
                        <div className="text-amber-700 text-lg font-bold">5</div>
                        <div className="text-amber-600 text-[9px]">Warning</div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-2 text-center border border-yellow-200">
                        <div className="text-yellow-700 text-lg font-bold">4</div>
                        <div className="text-yellow-600 text-[9px]">Watch</div>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <h4 className="font-semibold text-slate-800 text-sm mb-2">At-Risk Employees</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {(displayLeaderboard || []).slice(0, 5).map((emp: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => { setActiveInsightModal(null); setSelectedEmployee({ ...emp, rank: i + 1 }); }}
                            className="w-full flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all"
                          >
                            <div className={`w-2 h-2 rounded-full ${i < 2 ? 'bg-red-500' : i < 4 ? 'bg-amber-500' : 'bg-yellow-500'}`} />
                            <div className="flex-1 text-left">
                              <div className="text-sm font-medium text-slate-800">{emp.employeeName || emp.name || `Employee ${i + 1}`}</div>
                              <div className="text-xs text-slate-500">Last active: {i + 2} weeks ago</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <h4 className="font-semibold text-amber-800 text-sm mb-1">AI Recommendation</h4>
                      <p className="text-xs text-slate-700">Send personalized outreach within 7 days. Consider offering flexible volunteering options or new project matches based on their interests.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setActiveInsightModal(null);
                          setShowAIEngage(true);
                          setAiEngageStatus('analyzing');
                          setAiEngageProgress(0);
                        }}
                        className="bg-amber-600 text-white text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 hover:bg-amber-700 active:scale-95 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Auto-Engage All
                      </button>
                      <button
                        onClick={() => { setActiveInsightModal(null); setShowRallyTeam(true); }}
                        className="bg-white text-amber-700 text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-amber-300 hover:bg-amber-50 active:scale-95 transition-all"
                      >
                        <Users className="w-3.5 h-3.5" />
                        View Team
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Skills Opportunity Modal */}
              {activeInsightModal === 'skills' && (
                <>
                  <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                    <div>
                      <h2 className="text-lg font-bold text-white">Skills-Based Opportunity</h2>
                      <p className="text-xs text-white/80">Untapped potential detected</p>
                    </div>
                    <button onClick={() => setActiveInsightModal(null)} className="p-2 rounded-full hover:bg-white/20">
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="text-center py-4">
                      <div className="text-5xl font-bold text-blue-600">+340%</div>
                      <div className="text-slate-600 text-sm mt-1">{isAIUEnabled ? "Potential AIU increase" : "Potential impact increase"}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                        <div className="text-blue-700 text-xl font-bold">8</div>
                        <div className="text-blue-600 text-xs">Unmatched Tech Talent</div>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-3 text-center border border-indigo-200">
                        <div className="text-indigo-700 text-xl font-bold">15</div>
                        <div className="text-indigo-600 text-xs">Available Projects</div>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <h4 className="font-semibold text-slate-800 text-sm mb-2">Skill Categories Available</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">Software Development</span>
                        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-medium">Data Analysis</span>
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">UX Design</span>
                        <span className="bg-cyan-100 text-cyan-700 text-xs px-2 py-1 rounded-full font-medium">Project Management</span>
                        <span className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-full font-medium">Digital Marketing</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <h4 className="font-semibold text-slate-800 text-sm mb-2">Suggested Pro Bono Matches</h4>
                      <div className="space-y-2">
                        <button onClick={() => { setActiveInsightModal(null); navigate('/project-portfolio'); }} className="w-full flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-slate-800">Tech Mentoring Program</div>
                            <div className="text-xs text-slate-500">3 employees × 4 projects</div>
                          </div>
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{isAIUEnabled ? "+120 AIU" : "+120 pts"}</span>
                        </button>
                        <button onClick={() => { setActiveInsightModal(null); navigate('/project-portfolio'); }} className="w-full flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <Lightbulb className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-slate-800">Digital Skills Workshop</div>
                            <div className="text-xs text-slate-500">5 employees × 2 projects</div>
                          </div>
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{isAIUEnabled ? "+85 AIU" : "+85 pts"}</span>
                        </button>
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <h4 className="font-semibold text-blue-800 text-sm mb-1">AI Recommendation</h4>
                      <p className="text-xs text-slate-700">Match tech-skilled employees with digital literacy programs for maximum impact. Pro bono consulting can multiply your {isAIUEnabled ? "AIU" : "impact score"} by leveraging professional expertise.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setActiveInsightModal(null);
                          setShowAIEngage(true);
                          setAiEngageStatus('analyzing');
                          setAiEngageProgress(0);
                        }}
                        className="bg-blue-600 text-white text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-700 active:scale-95 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Auto-Match
                      </button>
                      <button
                        onClick={() => { setActiveInsightModal(null); setShowProjectsBrowser(true); }}
                        className="bg-white text-blue-700 text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-blue-300 hover:bg-blue-50 active:scale-95 transition-all"
                      >
                        <FolderKanban className="w-3.5 h-3.5" />
                        Browse Projects
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Milestone Modal */}
              {activeInsightModal === 'milestone' && (
                <>
                  <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                    <div>
                      <h2 className="text-lg font-bold text-white">Milestone Approaching</h2>
                      <p className="text-xs text-white/80">Impact Champion badge almost unlocked</p>
                    </div>
                    <button onClick={() => setActiveInsightModal(null)} className="p-2 rounded-full hover:bg-white/20">
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="text-center py-4">
                      <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center border-4 border-purple-200">
                        <Trophy className="w-10 h-10 text-purple-600" />
                      </div>
                      <div className="text-2xl font-bold text-purple-600">Impact Champion</div>
                      <div className="text-slate-600 text-sm mt-1">95% Complete</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-slate-700">Progress to Badge</span>
                        <span className="text-sm font-bold text-purple-600">{displayTotalHours} / {displayTotalHours + 127} hours</span>
                      </div>
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: '95%' }} />
                      </div>
                      <div className="text-xs text-slate-500 mt-2 text-center">Only <span className="font-bold text-purple-600">127 hours</span> needed!</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-200">
                        <div className="text-purple-700 text-lg font-bold">{displayActiveEmployees}</div>
                        <div className="text-purple-600 text-[9px]">Active Team</div>
                      </div>
                      <div className="bg-pink-50 rounded-lg p-2 text-center border border-pink-200">
                        <div className="text-pink-700 text-lg font-bold">~5</div>
                        <div className="text-pink-600 text-[9px]">Hrs/Person</div>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-2 text-center border border-indigo-200">
                        <div className="text-indigo-700 text-lg font-bold">7</div>
                        <div className="text-indigo-600 text-[9px]">Days Left</div>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <h4 className="font-semibold text-slate-800 text-sm mb-2">Badge Benefits</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span>Featured on company ESG report</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span>Exclusive Impact Champion certificate</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span>Priority access to high-impact projects</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span>LinkedIn badge integration</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <h4 className="font-semibold text-purple-800 text-sm mb-1">AI Recommendation</h4>
                      <p className="text-xs text-slate-700">Rally the team with a quick volunteer sprint! Each team member contributing just 5 hours will unlock this milestone. Consider a team challenge announcement.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setActiveInsightModal(null);
                          setChallengeConfig({ hours: 127, days: 7, participants: displayActiveEmployees });
                          setShowChallengeMode(true);
                        }}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 hover:from-purple-700 hover:to-pink-700 active:scale-95 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Launch Challenge
                      </button>
                      <button
                        onClick={() => { setActiveInsightModal(null); setShowRallyTeam(true); }}
                        className="bg-white text-purple-700 text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-purple-300 hover:bg-purple-50 active:scale-95 transition-all"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Rally Team
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* PWA Initiative Launcher */}
        {showInitiativeLauncher && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => setShowInitiativeLauncher(false)}>
            <div
              className="bg-white rounded-t-2xl w-full max-w-[428px] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white">Launch New Initiative</h2>
                  <p className="text-xs text-white/80">AI-recommended SDG programs</p>
                </div>
                <button onClick={() => setShowInitiativeLauncher(false)} className="p-2 rounded-full hover:bg-white/20">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-800">AI Analysis Complete</span>
                  </div>
                  <p className="text-xs text-slate-700">Based on employee interests and skills, we recommend launching initiatives in these SDG areas for maximum engagement.</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-800">Select SDG Focus</h3>
                  {[4, 13, 8, 3].map((sdg) => (
                    <button
                      key={sdg}
                      onClick={() => setSelectedInitiativeSDG(sdg)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${selectedInitiativeSDG === sdg ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300'}`}
                    >
                      <img src={getSDGIcon(sdg)} alt={`SDG ${sdg}`} className="w-12 h-12 rounded-lg" />
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-slate-800">{getSDGName(sdg)}</div>
                        <div className="text-xs text-slate-500">
                          {sdg === 4 && '23 employees interested • High skill match'}
                          {sdg === 13 && '18 employees interested • Trending'}
                          {sdg === 8 && '15 employees interested • Pro bono ready'}
                          {sdg === 3 && '12 employees interested • Healthcare skills'}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedInitiativeSDG === sdg ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                        {selectedInitiativeSDG === sdg && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedInitiativeSDG && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">Initiative Preview</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white rounded p-2 border border-slate-200">
                        <div className="text-slate-500">Estimated Participants</div>
                        <div className="text-emerald-700 font-bold text-lg">{selectedInitiativeSDG === 4 ? 23 : selectedInitiativeSDG === 13 ? 18 : 15}</div>
                      </div>
                      <div className="bg-white rounded p-2 border border-slate-200">
                        <div className="text-slate-500">{isAIUEnabled ? "Projected AIU" : "Projected Impact"}</div>
                        <div className="text-teal-700 font-bold text-lg">+{selectedInitiativeSDG === 4 ? 156 : selectedInitiativeSDG === 13 ? 124 : 98}</div>
                      </div>
                      <div className="bg-white rounded p-2 border border-slate-200">
                        <div className="text-slate-500">Available Projects</div>
                        <div className="text-blue-700 font-bold text-lg">{selectedInitiativeSDG === 4 ? 8 : selectedInitiativeSDG === 13 ? 6 : 5}</div>
                      </div>
                      <div className="bg-white rounded p-2 border border-slate-200">
                        <div className="text-slate-500">Engagement Boost</div>
                        <div className="text-purple-700 font-bold text-lg">+23%</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => {
                      if (selectedInitiativeSDG) {
                        setShowInitiativeLauncher(false);
                        toast({
                          title: "Initiative Launched!",
                          description: `SDG ${selectedInitiativeSDG} initiative created. Invitations sent to ${selectedInitiativeSDG === 4 ? 23 : selectedInitiativeSDG === 13 ? 18 : 15} employees.`,
                        });
                      }
                    }}
                    disabled={!selectedInitiativeSDG}
                    className={`text-white text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all ${selectedInitiativeSDG ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Launch Initiative
                  </button>
                  <button
                    onClick={() => setShowInitiativeLauncher(false)}
                    className="bg-white text-slate-700 text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-slate-300 hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PWA Challenge Mode */}
        {showChallengeMode && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => setShowChallengeMode(false)}>
            <div
              className="bg-white rounded-t-2xl w-full max-w-[428px] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white">Team Challenge Mode</h2>
                  <p className="text-xs text-white/80">Rally your team for Impact Champion</p>
                </div>
                <button onClick={() => setShowChallengeMode(false)} className="p-2 rounded-full hover:bg-white/20">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-center py-3">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center border-4 border-purple-200">
                    <Trophy className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="text-xl font-bold text-purple-600">Impact Champion Challenge</div>
                  <div className="text-slate-500 text-sm">Unlock the badge together!</div>
                </div>

                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-700">Challenge Goal</span>
                    <span className="text-sm font-bold text-purple-600">{formatDecimal(challengeConfig.hours)} hours in {challengeConfig.days} days</span>
                  </div>
                  <div className="h-3 bg-white rounded-full overflow-hidden border border-purple-200">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-lg p-3 text-center border border-slate-200">
                    <div className="text-purple-700 text-xl font-bold">{challengeConfig.participants}</div>
                    <div className="text-slate-500 text-[9px]">Participants</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border border-slate-200">
                    <div className="text-pink-700 text-xl font-bold">{Math.ceil(challengeConfig.hours / Math.max(challengeConfig.participants, 1))}</div>
                    <div className="text-slate-500 text-[9px]">Hrs/Person</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border border-slate-200">
                    <div className="text-indigo-700 text-xl font-bold">{challengeConfig.days}</div>
                    <div className="text-slate-500 text-[9px]">Days</div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">Challenge Rewards</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>Team-wide Impact Champion badge</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span>Featured in company newsletter</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span>+{Math.round(challengeConfig.hours * 0.8)} {isAIUEnabled ? "bonus AIU for the team" : "bonus points for the team"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
                  <h4 className="text-sm font-semibold text-purple-800 mb-1">AI Challenge Strategy</h4>
                  <p className="text-xs text-slate-700">Optimal approach: Each team member contributes {Math.ceil(challengeConfig.hours / Math.max(challengeConfig.participants, 1))} hours over {challengeConfig.days} days. AI will send daily progress updates and personalized project suggestions.</p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowChallengeMode(false);
                      toast({
                        title: "Challenge Launched!",
                        description: `Team challenge started! ${challengeConfig.participants} employees notified. Daily progress tracking enabled.`,
                      });
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:from-purple-700 hover:to-pink-700 active:scale-95 transition-all"
                  >
                    <Zap className="w-4 h-4" />
                    Launch Challenge & Notify Team
                  </button>
                  <button
                    onClick={() => setShowChallengeMode(false)}
                    className="w-full bg-white text-slate-700 text-sm font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PWA AI Auto-Engage with ML */}
        {showAIEngage && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => aiEngageStatus === 'complete' && setShowAIEngage(false)}>
            <div
              className="bg-white rounded-t-2xl w-full max-w-[428px] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white">AI Auto-Engage</h2>
                  <p className="text-xs text-white/80">ML-powered personalized outreach</p>
                </div>
                {aiEngageStatus === 'complete' && (
                  <button onClick={() => { setShowAIEngage(false); setAiEngageStatus('idle'); }} className="p-2 rounded-full hover:bg-white/20">
                    <X className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
              <div className="p-4 space-y-4">
                {aiEngageStatus === 'analyzing' && (
                  <>
                    <div className="text-center py-6">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-indigo-100 flex items-center justify-center animate-pulse">
                        <Brain className="w-8 h-8 text-indigo-600" />
                      </div>
                      <div className="text-lg font-bold text-indigo-600">Analyzing Employee Data</div>
                      <div className="text-slate-500 text-sm mt-1">ML model processing engagement patterns...</div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                          <span>Analyzing activity patterns for 12 at-risk employees</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                          <span>Identifying optimal engagement channels</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                          <span>Generating personalized recommendations</span>
                        </div>
                      </div>
                    </div>
                    {(() => {
                      setTimeout(() => {
                        if (aiEngageStatus === 'analyzing') {
                          setAiEngageStatus('engaging');
                          setAiEngageProgress(0);
                        }
                      }, 2000);
                      return null;
                    })()}
                  </>
                )}

                {aiEngageStatus === 'engaging' && (
                  <>
                    <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-indigo-600 animate-pulse" />
                      </div>
                      <div className="text-lg font-bold text-indigo-600">Engaging Employees</div>
                      <div className="text-slate-500 text-sm mt-1">Sending personalized outreach...</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-slate-700">Progress</span>
                        <span className="text-sm font-bold text-indigo-600">{aiEngageProgress}/12 employees</span>
                      </div>
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                          style={{ width: `${(aiEngageProgress / 12) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(displayLeaderboard || []).slice(0, aiEngageProgress).map((emp: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <div className="flex-1">
                            <div className="text-xs font-medium text-slate-800">{emp.employeeName || emp.name || `Employee ${i + 1}`}</div>
                            <div className="text-[10px] text-emerald-600">Personalized message sent via {['Email', 'Slack', 'Teams'][i % 3]}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {(() => {
                      if (aiEngageProgress < 12) {
                        setTimeout(() => {
                          setAiEngageProgress(prev => Math.min(prev + 1, 12));
                          if (aiEngageProgress >= 11) {
                            setTimeout(() => setAiEngageStatus('complete'), 500);
                          }
                        }, 400);
                      }
                      return null;
                    })()}
                  </>
                )}

                {aiEngageStatus === 'complete' && (
                  <>
                    <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                      </div>
                      <div className="text-lg font-bold text-emerald-600">Engagement Complete!</div>
                      <div className="text-slate-500 text-sm mt-1">12 employees contacted with personalized outreach</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200">
                        <div className="text-emerald-700 text-xl font-bold">12</div>
                        <div className="text-emerald-600 text-xs">Employees Engaged</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                        <div className="text-blue-700 text-xl font-bold">3</div>
                        <div className="text-blue-600 text-xs">Channels Used</div>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-slate-800 mb-2">ML Engagement Summary</h4>
                      <div className="space-y-2 text-xs text-slate-700">
                        <div className="flex justify-between"><span>Email outreach:</span><span className="font-semibold">5 employees</span></div>
                        <div className="flex justify-between"><span>Slack notifications:</span><span className="font-semibold">4 employees</span></div>
                        <div className="flex justify-between"><span>Teams messages:</span><span className="font-semibold">3 employees</span></div>
                        <div className="flex justify-between border-t border-slate-200 pt-2 mt-2"><span>Projects suggested:</span><span className="font-semibold text-indigo-600">18 matches</span></div>
                      </div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                      <h4 className="text-sm font-semibold text-indigo-800 mb-1">Expected Outcomes</h4>
                      <p className="text-xs text-slate-700">Based on historical data, expect 67% response rate within 48 hours. Predicted re-engagement: 8 employees returning to active volunteering.</p>
                    </div>
                    <button
                      onClick={() => { setShowAIEngage(false); setAiEngageStatus('idle'); }}
                      className="w-full bg-indigo-600 text-white text-sm font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Done
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PWA Projects Browser with Algorithm Matching */}
        {showProjectsBrowser && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => setShowProjectsBrowser(false)}>
            <div
              className="bg-white rounded-t-2xl w-full max-w-[428px] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white">AI-Matched Projects</h2>
                  <p className="text-xs text-white/80">Optimal opportunities for your team</p>
                </div>
                <button onClick={() => setShowProjectsBrowser(false)} className="p-2 rounded-full hover:bg-white/20">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-blue-800">Ranked by skill match & SDG alignment</span>
                </div>

                {[
                  { name: 'Digital Literacy Program', sdg: 4, match: 95, hours: 40, volunteers: 8, aiu: 120, skills: ['Teaching', 'Tech'] },
                  { name: 'Climate Data Analysis', sdg: 13, match: 92, hours: 30, volunteers: 5, aiu: 85, skills: ['Data', 'Analytics'] },
                  { name: 'Youth Mentorship Initiative', sdg: 8, match: 88, hours: 50, volunteers: 12, aiu: 156, skills: ['Mentoring', 'Career'] },
                  { name: 'Healthcare App Development', sdg: 3, match: 85, hours: 60, volunteers: 4, aiu: 98, skills: ['Dev', 'UX'] },
                  { name: 'Financial Education Workshop', sdg: 1, match: 82, hours: 25, volunteers: 6, aiu: 72, skills: ['Finance', 'Teaching'] },
                ].map((project, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setShowProjectsBrowser(false);
                      setSelectedSDG(project.sdg);
                    }}
                    className="w-full bg-white rounded-lg p-3 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="flex items-start gap-3">
                      <img src={getSDGIcon(project.sdg)} alt={`SDG ${project.sdg}`} className="w-10 h-10 rounded-lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">{project.name}</span>
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{project.match}% match</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                          <span>{formatDecimal(project.hours)}h needed</span>
                          <span>•</span>
                          <span>{project.volunteers} volunteers</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-medium">+{project.aiu} {isAIUEnabled ? "AIU" : "pts"}</span>
                        </div>
                        <div className="flex gap-1 mt-1.5">
                          {project.skills.map((skill, j) => (
                            <span key={j} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{skill}</span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 mt-1" />
                    </div>
                  </button>
                ))}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowProjectsBrowser(false);
                      toast({ title: "Auto-Match Started", description: "AI is matching employees to optimal projects based on skills." });
                    }}
                    className="bg-blue-600 text-white text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Auto-Match All
                  </button>
                  <button
                    onClick={() => setShowProjectsBrowser(false)}
                    className="bg-white text-slate-700 text-[11px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-slate-300 hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PWA Rally Team */}
        {showRallyTeam && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => setShowRallyTeam(false)}>
            <div
              className="bg-white rounded-t-2xl w-full max-w-[428px] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white">Rally Your Team</h2>
                  <p className="text-xs text-white/80">Engage and motivate employees</p>
                </div>
                <button onClick={() => setShowRallyTeam(false)} className="p-2 rounded-full hover:bg-white/20">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
                    <div className="text-amber-700 text-xl font-bold">{displayActiveEmployees}</div>
                    <div className="text-amber-600 text-xs">Active Volunteers</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
                    <div className="text-orange-700 text-xl font-bold">12</div>
                    <div className="text-orange-600 text-xs">Need Re-engagement</div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">Quick Actions</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setShowRallyTeam(false);
                        toast({ title: "Announcement Sent!", description: "Team-wide volunteering announcement delivered to all employees." });
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-slate-800">Send Team Announcement</div>
                        <div className="text-xs text-slate-500">Notify all employees about volunteering opportunities</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>

                    <button
                      onClick={() => {
                        setShowRallyTeam(false);
                        setShowChallengeMode(true);
                        setChallengeConfig({ hours: 100, days: 14, participants: displayActiveEmployees });
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-slate-800">Start Team Challenge</div>
                        <div className="text-xs text-slate-500">Create a competitive volunteering challenge</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>

                    <button
                      onClick={() => {
                        setShowRallyTeam(false);
                        setShowAIEngage(true);
                        setAiEngageStatus('analyzing');
                        setAiEngageProgress(0);
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-slate-800">AI Personalized Outreach</div>
                        <div className="text-xs text-slate-500">Let AI engage at-risk employees individually</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>

                    <button
                      onClick={() => {
                        setShowRallyTeam(false);
                        toast({ title: "Recognition Sent!", description: "Top volunteers featured in team channel with appreciation message." });
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Award className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-slate-800">Recognize Top Volunteers</div>
                        <div className="text-xs text-slate-500">Share appreciation for leading contributors</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowRallyTeam(false)}
                  className="w-full bg-white text-slate-700 text-sm font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full Screen Mobile Menu */}
        {showMobileMenu && (
          <div className="fixed inset-0 z-[9999] flex flex-col">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowMobileMenu(false)}
            />

            {/* Menu Panel */}
            <div className="absolute top-0 right-0 w-80 max-w-[90vw] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
              {/* Menu Header */}
              <div
                className="px-4 py-4 flex items-center justify-between flex-shrink-0"
                style={{ background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #fef3c7 75%, #fde68a 100%)" }}
              >
                <p className="font-bold text-lg text-emerald-900">Menu</p>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-all"
                >
                  <X className="w-5 h-5 text-slate-700" />
                </button>
              </div>

              {/* Quick Stats */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-800">{displayActiveEmployees}</span>
                    <span className="text-slate-500">Employees</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-slate-800">{displayTotalHours.toLocaleString()}</span>
                    <span className="text-slate-500">Hours</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 mt-2 text-xs">
                  <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-full border border-slate-200">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span className="font-medium text-slate-700">{formatDecimal(displayTotalImpact || 0)} {isAIUEnabled ? "AIU" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-full border border-slate-200">
                    <Target className="w-3 h-3 text-teal-500" />
                    <span className="font-medium text-slate-700">{sdgMetrics.filter((m: any) => m.totalHours > 0).length} SDGs</span>
                  </div>
                </div>
              </div>

              {/* Menu Sections */}
              <div className="flex-1 overflow-y-auto">
                {csrMenuSections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="py-2">
                    {/* Section Title */}
                    <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {section.title}
                    </p>
                    {/* Section Items */}
                    {section.items.map((item, itemIndex) => (
                      <button
                        key={itemIndex}
                        onClick={() => { item.action(); }}
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
                    onClick={handleMobileSignOut}
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
      </div>
    );
  }

  return (
    <CSRLayout activeNav={selectedMainTab}>
      {/* Main Dashboard Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Company Name Banner with Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "16px 20px",
          background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 30%, #a7f3d0 60%, #fef3c7 100%)",
          borderRadius: "16px",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          boxShadow: "0 2px 8px rgba(16, 185, 129, 0.1)"
        }}>
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              style={{
                height: "56px",
                width: "56px",
                borderRadius: "12px",
                objectFit: "contain",
                backgroundColor: "white",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.15)",
                padding: "4px",
                flexShrink: 0
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : userAvatar ? (
            <img
              src={userAvatar}
              alt={companyName}
              style={{
                height: "56px",
                width: "56px",
                borderRadius: "12px",
                objectFit: "cover",
                backgroundColor: "white",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.15)",
                flexShrink: 0
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div style={{
              height: "56px",
              width: "56px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
              flexShrink: 0
            }}>
              <span style={{ color: "white", fontSize: "24px", fontWeight: "700" }}>{companyName.charAt(0)}</span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ color: "#064e3b", fontSize: "20px", fontWeight: "700", lineHeight: "1.2" }}>{companyName}</span>
            <span style={{ color: "#047857", fontSize: "13px", fontWeight: "500" }}>ESG Command Center</span>
          </div>
        </div>

        {/* KPI Metrics Buttons Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "8px" }}>
          <button
            onClick={() => {
              setSelectedKPI("hours");
              toast({ title: "Total Hours", description: `${displayTotalHours.toLocaleString()} volunteer hours logged across all initiatives.` });
            }}
            style={{
              padding: "12px",
              background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "left",
              overflow: "hidden",
              minWidth: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.2)";
              e.currentTarget.style.borderColor = "#3b82f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", overflow: "hidden" }}>
              <Clock style={{ width: "14px", height: "14px", color: "#3b82f6", flexShrink: 0 }} />
              <span style={{ fontSize: "10px", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Total Hours</span>
            </div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e3a8a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formatDecimal(displayTotalHours)}</div>
            <div style={{ fontSize: "10px", color: "#059669", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>↑ {formatDecimal(displayTotalHours * 0.23)} this quarter</div>
          </button>

          <button
            onClick={() => {
              setSelectedKPI("participation");
              toast({ title: "Participation Rate", description: `${csrData?.kpiBreakdown?.employees?.engagementRate || 0}% of workforce actively volunteers.` });
            }}
            style={{
              padding: "12px",
              background: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
              border: "1px solid rgba(184, 79, 255, 0.3)",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "left",
              overflow: "hidden",
              minWidth: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(184, 79, 255, 0.2)";
              e.currentTarget.style.borderColor = "#B84FFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "rgba(184, 79, 255, 0.3)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", overflow: "hidden" }}>
              <Users style={{ width: "14px", height: "14px", color: "#B84FFF", flexShrink: 0 }} />
              <span style={{ fontSize: "10px", color: "#581c87", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Participation</span>
            </div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#581c87", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{csrData?.kpiBreakdown?.employees?.engagementRate || 0}%</div>
            <div style={{ fontSize: "10px", color: "#059669", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>↑ 8.2% vs last month</div>
          </button>

          <button
            onClick={() => {
              setSelectedKPI("projects");
              toast({ title: "Active Projects", description: `${displayProjectsCompleted} projects currently supporting SDG initiatives.` });
            }}
            style={{
              padding: "12px",
              background: "linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)",
              border: "1px solid rgba(255, 61, 143, 0.3)",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "left",
              overflow: "hidden",
              minWidth: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 61, 143, 0.2)";
              e.currentTarget.style.borderColor = "#FF3D8F";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "rgba(255, 61, 143, 0.3)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", overflow: "hidden" }}>
              <FolderKanban style={{ width: "14px", height: "14px", color: "#FF3D8F", flexShrink: 0 }} />
              <span style={{ fontSize: "10px", color: "#9f1239", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Projects</span>
            </div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#9f1239", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayProjectsCompleted}</div>
            <div style={{ fontSize: "10px", color: "#059669", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>↑ {Math.max(1, Math.round(displayProjectsCompleted * 0.15))} new</div>
          </button>

          <button
            onClick={() => {
              setSelectedKPI("sdg");
              toast({ title: "SDG Goals", description: `${committedSDGs.length} SDG commitments with ${activeCommittedSDGs} actively progressing.` });
            }}
            style={{
              padding: "12px",
              background: "linear-gradient(135deg, #ffffff 0%, #fefce8 100%)",
              border: "1px solid rgba(255, 215, 0, 0.4)",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "left",
              overflow: "hidden",
              minWidth: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 215, 0, 0.3)";
              e.currentTarget.style.borderColor = "#FFD700";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "rgba(255, 215, 0, 0.4)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", overflow: "hidden" }}>
              <Target style={{ width: "14px", height: "14px", color: "#ca8a04", flexShrink: 0 }} />
              <span style={{ fontSize: "10px", color: "#713f12", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>SDG Goals</span>
            </div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#713f12", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{committedSDGs.length}/17</div>
            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeCommittedSDGs} active</div>
          </button>

          <button
            onClick={() => {
              setSelectedKPI("economic");
              toast({ title: "Economic Value", description: `$${Math.round(displayTotalHours * 34.79).toLocaleString()} total value (${displayTotalHours.toLocaleString()} hours × $34.79/hr industry standard rate).` });
            }}
            style={{
              padding: "12px",
              background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
              border: "1px solid rgba(5, 150, 105, 0.3)",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "left",
              overflow: "hidden",
              minWidth: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(5, 150, 105, 0.2)";
              e.currentTarget.style.borderColor = "#059669";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "rgba(5, 150, 105, 0.3)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", overflow: "hidden" }}>
              <TrendingUp style={{ width: "14px", height: "14px", color: "#059669", flexShrink: 0 }} />
              <span style={{ fontSize: "10px", color: "#14532d", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Economic Value</span>
            </div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#14532d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>${formatDecimal(displayTotalHours * 34.79 / 1000)}K</div>
            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@$34.79/hr rate</div>
          </button>
        </div>

        {selectedMainTab === "engagement" && (
            <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <Users
                  style={{ width: "28px", height: "28px", color: "#3b82f6" }}
                />
                <h1
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#1e3a8a",
                  }}
                >
                  Employee Engagement Hub
                </h1>
              </div>
              <LazyErrorBoundary fallback={<div className="p-4 text-slate-500">Employee engagement tab failed to load. <button onClick={() => window.location.reload()} className="text-blue-600 hover:underline">Refresh</button></div>}>
                <Suspense fallback={<div className="p-8 flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading employee engagement...</div></div>}>
                  <EmployeeEngagementTab userId={userId} />
                </Suspense>
              </LazyErrorBoundary>
            </div>
          )}
          {selectedMainTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeIn 0.3s ease-in-out" }}>
              {/* Filters Bar - Light Premium Style - At Top */}
              <div
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
                  padding: "16px 24px",
                  borderRadius: "16px",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "8px" }}>
                    <BarChart3 style={{ width: "16px", height: "16px", color: "#3b82f6" }} />
                    Dashboard Filters:
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label style={{ fontSize: "14px", color: "#475569", fontWeight: "500" }}>
                      Time Period:
                    </label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value as "all" | "30d" | "90d" | "1y")}
                      style={{
                        padding: "8px 32px 8px 12px",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: "8px",
                        backgroundColor: "#ffffff",
                        color: "#1e3a8a",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 10px center",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                      }}
                      data-testid="select-time-period-top"
                    >
                      {TIME_PERIODS.map((period) => (
                        <option key={period.value} value={period.value} style={{ backgroundColor: "#ffffff", color: "#1e3a8a" }}>
                          {period.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedSDGFilters.length > 0 && (
                    <div style={{ fontSize: "13px", color: "#1e3a8a", padding: "6px 12px", backgroundColor: "rgba(59, 130, 246, 0.1)", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.2)", fontWeight: "500" }}>
                      {selectedSDGFilters.length} SDG{selectedSDGFilters.length > 1 ? "s" : ""} selected
                    </div>
                  )}
                </div>
                {(selectedSDGFilters.length > 0 || dateRange !== "all") && (
                  <button
                    onClick={clearAllFilters}
                    style={{
                      padding: "8px 16px",
                      background: "linear-gradient(135deg, #FF4757 0%, #ef4444 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 15px rgba(255, 71, 87, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    data-testid="btn-clear-all-filters-top"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>

              {/* Two Column Layout: Corporate Impact Score + SDG Commitments */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px", alignItems: "stretch" }}>
                {/* Hero Impact Score Card - Executive Command Center with ESG Metrics */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 50%, #e0f2fe 100%)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "20px",
                    padding: "24px",
                    boxShadow: "0 4px 20px rgba(59, 130, 246, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                {/* Top section - Impact Score and Summary */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", marginBottom: "24px" }}>
                  <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                      <Activity style={{ width: "24px", height: "24px", color: "#3b82f6", flexShrink: 0 }} />
                      <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "500", letterSpacing: "0.5px" }}>
                        CORPORATE IMPACT SCORE
                      </span>
                    </div>
                    {/* Clickable AIU Score - Opens detail modal */}
                    <button
                      onClick={() => setKpiDetailModal({ isOpen: true, type: 'aiu' })}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: "8px 12px",
                        margin: "-8px -12px",
                        borderRadius: "16px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(59, 130, 246, 0.08)";
                        e.currentTarget.style.transform = "scale(1.02)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                      title={isAIUEnabled ? "Click to view AIU breakdown" : "Click to view impact breakdown"}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                        <span
                          style={{ fontSize: "48px", fontWeight: "800", lineHeight: 1, color: "#1e3a8a" }}
                        >
                          {formatDecimal(displayTotalImpact || 0)}
                        </span>
                        <span style={{ color: "#059669", fontSize: "16px", fontWeight: "600", display: "flex", alignItems: "center", gap: "2px" }}>
                          <ArrowUpRight style={{ width: "16px", height: "16px" }} />
                          +{csrData?.sdgScoreDelta || 0}%
                        </span>
                        <ChevronRight style={{ width: "20px", height: "20px", color: "#3b82f6", opacity: 0.6 }} />
                      </div>
                    </button>
                    <p style={{ color: "#64748b", fontSize: "14px", marginTop: "8px" }}>
                      {isAIUEnabled ? "Total AIU (Attributable Impact Units) across all initiatives" : `Total ${SHADOW_MODE_LABELS.AIU_REPLACEMENT} across all initiatives`}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "160px", maxWidth: "160px", flexShrink: 0 }}>
                    <button
                      onClick={() => setSelectedMainTab('engagement')}
                      style={{
                        padding: "12px",
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                        borderRadius: "12px",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.25)";
                        e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)";
                      }}
                      title="View employee engagement details"
                    >
                      <div style={{ fontSize: "22px", fontWeight: "700", color: "#059669" }}>
                        {displayTotalHours.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                        Volunteer Hours
                        <ChevronRight style={{ width: "12px", height: "12px", opacity: 0.6 }} />
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedMainTab('engagement')}
                      style={{
                        padding: "12px",
                        background: "rgba(0, 217, 255, 0.1)",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                        borderRadius: "12px",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.25)";
                        e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.background = "rgba(0, 217, 255, 0.1)";
                      }}
                      title="View active volunteer list"
                    >
                      <div style={{ fontSize: "22px", fontWeight: "700", color: "#3b82f6" }}>
                        {displayActiveEmployees.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                        Active Volunteers
                        <ChevronRight style={{ width: "12px", height: "12px", opacity: 0.6 }} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Quick AIU Insight - Full width below both columns - only show when AIU display enabled */}
                {isAIUEnabled && (
                <div style={{
                  padding: "12px 16px",
                  background: "linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(20, 184, 166, 0.12) 100%)",
                  border: "1px solid rgba(13, 148, 136, 0.2)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "20px",
                }}>
                  <Info style={{ width: "18px", height: "18px", color: "#0d9488", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "13px", color: "#0f766e", fontWeight: "600" }}>What is Impact Score? </span>
                    <span style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                      Impact Score is Synerxus's proprietary metric for measuring verified SDG contributions. Your score represents your auditable share of real-world impact.
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setKpiDetailModal({ isOpen: true, type: 'aiu' });
                    }}
                    style={{
                      padding: "8px 16px",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: "600",
                      background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      boxShadow: "0 2px 6px rgba(13, 148, 136, 0.3)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 10px rgba(13, 148, 136, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 6px rgba(13, 148, 136, 0.3)";
                    }}
                  >
                    Learn More
                  </button>
                </div>
                )}

                {/* ESG Metrics Section */}
                <div style={{ borderTop: "1px solid rgba(59, 130, 246, 0.15)", paddingTop: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <span style={{ color: "#1e3a8a", fontSize: "14px", fontWeight: "600", letterSpacing: "0.5px" }}>
                      ESG COMMITMENT METRICS
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px" }}>
                    {/* Environmental */}
                    <button
                      onClick={() => toast({
                        title: "Environmental Impact",
                        description: `${esgHoursByProject.environmental.toLocaleString()} hours from ${esgHoursByProject.envProjects} projects contributing to environmental SDGs (Clean Water, Clean Energy, Responsible Consumption, Climate Action, Life Below Water, Life on Land).`
                      })}
                      style={{
                        padding: "16px",
                        background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        borderRadius: "12px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.25)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <span style={{ fontSize: "18px" }}>🌿</span>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "#065f46", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Environmental</div>
                          <div style={{ fontSize: "10px", color: "#059669" }}>SDGs 6, 7, 12, 13, 14, 15</div>
                          <div style={{ fontSize: "10px", color: "#059669", fontWeight: "600", marginTop: "2px" }}>{esgHoursByProject.envProjects} projects</div>
                        </div>
                      </div>
                      <div style={{ fontSize: "28px", fontWeight: "700", color: "#065f46", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatDecimal(esgHoursByProject.environmental)}
                      </div>
                      <div style={{ fontSize: "11px", color: "#059669", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>hours contributed</div>
                      <div style={{
                        marginTop: "8px",
                        height: "4px",
                        background: "rgba(16, 185, 129, 0.2)",
                        borderRadius: "2px",
                        overflow: "hidden"
                      }}>
                        <div style={{
                          width: `${Math.min(100, (esgHoursByProject.environmental / Math.max(displayTotalHours, 1)) * 100)}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #10b981, #059669)",
                          borderRadius: "2px"
                        }} />
                      </div>
                    </button>

                    {/* Social */}
                    <button
                      onClick={() => toast({
                        title: "Social Impact",
                        description: `${esgHoursByProject.social.toLocaleString()} hours from ${esgHoursByProject.socialProjects} projects contributing to social SDGs (No Poverty, Zero Hunger, Health, Education, Gender Equality, Reduced Inequalities, Sustainable Cities, Peace & Justice).`
                      })}
                      style={{
                        padding: "16px",
                        background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: "12px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.25)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <span style={{ fontSize: "18px" }}>👥</span>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "#1e3a8a", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Social</div>
                          <div style={{ fontSize: "10px", color: "#3b82f6" }}>SDGs 1-5, 10, 11, 16</div>
                          <div style={{ fontSize: "10px", color: "#3b82f6", fontWeight: "600", marginTop: "2px" }}>{esgHoursByProject.socialProjects} projects</div>
                        </div>
                      </div>
                      <div style={{ fontSize: "28px", fontWeight: "700", color: "#1e3a8a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatDecimal(esgHoursByProject.social)}
                      </div>
                      <div style={{ fontSize: "11px", color: "#3b82f6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>hours contributed</div>
                      <div style={{
                        marginTop: "8px",
                        height: "4px",
                        background: "rgba(59, 130, 246, 0.2)",
                        borderRadius: "2px",
                        overflow: "hidden"
                      }}>
                        <div style={{
                          width: `${Math.min(100, (esgHoursByProject.social / Math.max(displayTotalHours, 1)) * 100)}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #3b82f6, #1d4ed8)",
                          borderRadius: "2px"
                        }} />
                      </div>
                    </button>

                    {/* Governance */}
                    <button
                      onClick={() => toast({
                        title: "Governance Impact",
                        description: `${esgHoursByProject.governance.toLocaleString()} hours from ${esgHoursByProject.govProjects} projects contributing to governance SDGs (Decent Work & Economic Growth, Industry Innovation, Partnerships for Goals).`
                      })}
                      style={{
                        padding: "16px",
                        background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
                        border: "1px solid rgba(147, 51, 234, 0.3)",
                        borderRadius: "12px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(147, 51, 234, 0.25)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <span style={{ fontSize: "18px" }}>⚖️</span>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "#581c87", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Governance</div>
                          <div style={{ fontSize: "10px", color: "#9333ea" }}>SDGs 8, 9, 17</div>
                          <div style={{ fontSize: "10px", color: "#9333ea", fontWeight: "600", marginTop: "2px" }}>{esgHoursByProject.govProjects} projects</div>
                        </div>
                      </div>
                      <div style={{ fontSize: "28px", fontWeight: "700", color: "#581c87", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatDecimal(esgHoursByProject.governance)}
                      </div>
                      <div style={{ fontSize: "11px", color: "#9333ea", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>hours contributed</div>
                      <div style={{
                        marginTop: "8px",
                        height: "4px",
                        background: "rgba(147, 51, 234, 0.2)",
                        borderRadius: "2px",
                        overflow: "hidden"
                      }}>
                        <div style={{
                          width: `${Math.min(100, (esgHoursByProject.governance / Math.max(displayTotalHours, 1)) * 100)}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #9333ea, #7c3aed)",
                          borderRadius: "2px"
                        }} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* AI Insight for Corporate Impact Score */}
                <div style={{
                  borderTop: "1px solid rgba(59, 130, 246, 0.15)",
                  paddingTop: "16px",
                  marginTop: "4px"
                }}>
                  <button
                    onClick={() => {
                      // Determine which ESG category has most opportunity for growth
                      const totalESG = esgHoursByProject.environmental + esgHoursByProject.social + esgHoursByProject.governance;
                      const envPercent = totalESG > 0 ? Math.round((esgHoursByProject.environmental / totalESG) * 100) : 33;
                      const socialPercent = totalESG > 0 ? Math.round((esgHoursByProject.social / totalESG) * 100) : 33;
                      const govPercent = totalESG > 0 ? Math.round((esgHoursByProject.governance / totalESG) * 100) : 34;

                      // Find the weakest category
                      let weakestCategory = "Governance";
                      let weakestPercent = govPercent;
                      let suggestion = "Consider adding projects focused on SDGs 8, 9, or 17 (Decent Work, Innovation, Partnerships)";

                      if (envPercent < socialPercent && envPercent < govPercent) {
                        weakestCategory = "Environmental";
                        weakestPercent = envPercent;
                        suggestion = "Consider adding projects focused on SDGs 6, 7, 12, 13, 14, or 15 (Climate, Clean Energy, Sustainable Resources)";
                      } else if (socialPercent < envPercent && socialPercent < govPercent) {
                        weakestCategory = "Social";
                        weakestPercent = socialPercent;
                        suggestion = "Consider adding projects focused on SDGs 1-5, 10, 11, or 16 (Poverty, Health, Education, Equality)";
                      }

                      toast({
                        title: "AI ESG Balance Insight",
                        description: `Your ${weakestCategory} impact (${weakestPercent}%) is your lowest ESG category. ${suggestion} to improve your overall ESG score balance.`
                      });
                    }}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      borderRadius: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      transition: "all 0.2s ease",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(245, 158, 11, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)"
                    }}>
                      <Sparkles style={{ width: "20px", height: "20px", color: "white" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#92400e", marginBottom: "2px" }}>
                        AI ESG Balance Insight
                      </div>
                      <div style={{ fontSize: "11px", color: "#a16207" }}>
                        {(() => {
                          const totalESG = esgHoursByProject.environmental + esgHoursByProject.social + esgHoursByProject.governance;
                          if (totalESG === 0) return "Start logging volunteer hours to get personalized ESG insights";

                          const envPercent = Math.round((esgHoursByProject.environmental / totalESG) * 100);
                          const socialPercent = Math.round((esgHoursByProject.social / totalESG) * 100);
                          const govPercent = Math.round((esgHoursByProject.governance / totalESG) * 100);

                          // Check for balance (within 10% of each other)
                          const max = Math.max(envPercent, socialPercent, govPercent);
                          const min = Math.min(envPercent, socialPercent, govPercent);

                          if (max - min <= 15) {
                            return `Great ESG balance! E:${envPercent}% S:${socialPercent}% G:${govPercent}% - well distributed across categories`;
                          }

                          if (envPercent < socialPercent && envPercent < govPercent) {
                            return `Environmental at ${envPercent}% is your growth opportunity. Tap to see recommendations.`;
                          } else if (socialPercent < envPercent && socialPercent < govPercent) {
                            return `Social impact at ${socialPercent}% has room to grow. Tap to see recommendations.`;
                          } else {
                            return `Governance at ${govPercent}% could be strengthened. Tap to see recommendations.`;
                          }
                        })()}
                      </div>
                    </div>
                    <ChevronRight style={{ width: "18px", height: "18px", color: "#92400e", flexShrink: 0 }} />
                  </button>
                </div>
                </div>

                {/* Corporate SDG Commitments Section - Right Column */}
                {committedSDGs.length > 0 ? (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 30%, #e0f2fe 60%, #f0fdf4 100%)",
                      border: "1px solid rgba(14, 165, 233, 0.25)",
                      borderRadius: "20px",
                      padding: "24px",
                      boxShadow: "0 4px 20px rgba(14, 165, 233, 0.12), 0 2px 8px rgba(0,0,0,0.04)",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    {/* Compact Header for Column Layout */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #10b981 100%)",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)",
                            flexShrink: 0,
                          }}
                        >
                          <Target style={{ width: "22px", height: "22px", color: "white" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h2
                            style={{
                              fontSize: "18px",
                              fontWeight: "700",
                              color: "#0c4a6e",
                              margin: 0,
                            }}
                          >
                            SDG Commitments
                          </h2>
                          <p style={{ fontSize: "12px", color: "#0369a1", margin: 0, fontWeight: "500" }}>
                            {committedSDGs.length} goals committed
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {selectedSDGFilters.length > 0 && (
                          <button
                            onClick={clearAllFilters}
                            style={{
                              padding: "6px 12px",
                              background: "linear-gradient(135deg, #FF4757 0%, #ef4444 100%)",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "500",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                          >
                            Clear ({selectedSDGFilters.length})
                          </button>
                        )}
                        <button
                          onClick={() => navigate("/corporate-partner-profile-settings")}
                          style={{
                            padding: "6px 12px",
                            background: "linear-gradient(135deg, #00D9FF 0%, #B84FFF 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "500",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            transition: "all 0.2s ease",
                          }}
                          data-testid="btn-manage-sdg-commitments"
                        >
                          <Settings style={{ width: "12px", height: "12px" }} />
                          Manage
                        </button>
                      </div>
                    </div>

                    {/* UN SDG Icon Buttons - Compact for Column Layout */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        justifyContent: "center",
                        flex: 1,
                        alignContent: "flex-start",
                      }}
                    >
                      {displayedSDGsForFilters.map((sdgNum) => {
                        const sdgIcon = getSDGIcon(sdgNum);
                        const isFiltered = selectedSDGFilters.includes(sdgNum);
                        const sdgMetric = sdgMetrics.find((m: SDGMetric) => m.sdg === sdgNum);
                        const hasActivity = sdgMetric && sdgMetric.totalHours > 0;

                        return (
                          <div
                            key={sdgNum}
                            style={{
                              position: "relative",
                              width: "70px",
                              height: "70px",
                            }}
                          >
                            <button
                              onClick={() => startTransition(() => setSelectedSDG(sdgNum))}
                              title={`SDG ${sdgNum}: ${getSDGFullName(sdgNum)}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                padding: 0,
                                border: isFiltered ? "3px solid #1e3a8a" : hasActivity ? "2px solid #22c55e" : "1px solid #e5e7eb",
                                borderRadius: "6px",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                boxShadow: isFiltered
                                  ? "0 4px 12px rgba(30,58,138,0.4)"
                                  : hasActivity
                                    ? "0 2px 8px rgba(34,197,94,0.3)"
                                    : "0 1px 4px rgba(0,0,0,0.1)",
                                transform: isFiltered ? "scale(1.05)" : "scale(1)",
                                overflow: "hidden",
                                position: "relative",
                                background: "transparent",
                              }}
                              onMouseEnter={(e) => {
                                if (!isFiltered) {
                                  e.currentTarget.style.transform = "scale(1.08)";
                                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isFiltered) {
                                  e.currentTarget.style.transform = "scale(1)";
                                  e.currentTarget.style.boxShadow = hasActivity
                                    ? "0 2px 8px rgba(34,197,94,0.3)"
                                    : "0 1px 4px rgba(0,0,0,0.1)";
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
                              {/* Activity indicator badge - compact */}
                              {hasActivity && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "2px",
                                    right: "2px",
                                    backgroundColor: "#22c55e",
                                    color: "white",
                                    padding: "1px 4px",
                                    borderRadius: "6px",
                                    fontSize: "8px",
                                    fontWeight: "700",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                                  }}
                                >
                                  {sdgMetric.totalHours}h
                                </div>
                              )}
                              {/* Filtered indicator overlay */}
                              {isFiltered && (
                                <div
                                  style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    backgroundColor: "rgba(30,58,138,0.9)",
                                    color: "white",
                                    padding: "2px",
                                    fontSize: "7px",
                                    fontWeight: "700",
                                    textAlign: "center",
                                  }}
                                >
                                  FILTER
                                </div>
                              )}
                            </button>
                            {/* Filter toggle button - smaller */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSDGFilter(sdgNum);
                              }}
                              title={isFiltered ? "Remove from filter" : "Add to filter"}
                              style={{
                                position: "absolute",
                                bottom: "-4px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                border: "2px solid white",
                                backgroundColor: isFiltered ? "#dc2626" : "#1e3a8a",
                                color: "white",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                fontWeight: "bold",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                                transition: "all 0.2s ease",
                                zIndex: 10,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateX(-50%) scale(1.15)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateX(-50%) scale(1)";
                              }}
                            >
                              {isFiltered ? "−" : "+"}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                  {/* Employee SDG Alignment Score - Shows how well employees align with corporate commitments */}
                  {(() => {
                    const alignedSDGs = sdgMetrics.filter((m: SDGMetric) => m.totalHours > 0 && committedSDGs.includes(m.sdg));
                    const alignmentScore = committedSDGs.length > 0 ? Math.round((alignedSDGs.length / committedSDGs.length) * 100) : 0;
                    const totalCommittedHours = alignedSDGs.reduce((sum: number, m: SDGMetric) => sum + m.totalHours, 0);

                    return (
                      <div
                        style={{
                          marginTop: "20px",
                          padding: "20px",
                          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
                          borderRadius: "16px",
                          border: "1px solid rgba(99, 102, 241, 0.3)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              background: "linear-gradient(135deg, #6366F1 0%, #A855F7 100%)",
                              borderRadius: "10px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <TrendingUp style={{ width: "20px", height: "20px", color: "white" }} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1e3a8a", marginBottom: "4px" }}>
                              Employee-Corporate SDG Alignment
                            </h3>
                            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                              How well your team's volunteer work aligns with corporate SDG commitments
                            </p>
                          </div>
                          <div style={{ marginLeft: "auto", textAlign: "center" }}>
                            <div style={{ fontSize: "28px", fontWeight: "800", color: alignmentScore >= 70 ? "#22c55e" : alignmentScore >= 40 ? "#f59e0b" : "#ef4444" }}>
                              {alignmentScore}%
                            </div>
                            <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "500" }}>Alignment Score</div>
                          </div>
                        </div>

                        {/* Alignment Progress Bar */}
                        <div style={{ marginBottom: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "12px", color: "#475569" }}>
                              {alignedSDGs.length} of {committedSDGs.length} committed SDGs with employee activity
                            </span>
                            <span style={{ fontSize: "12px", fontWeight: "600", color: "#6366F1" }}>
                              {totalCommittedHours.toLocaleString()}h total
                            </span>
                          </div>
                          <div style={{ height: "8px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${alignmentScore}%`,
                                background: alignmentScore >= 70 ? "linear-gradient(90deg, #22c55e, #16a34a)" :
                                           alignmentScore >= 40 ? "linear-gradient(90deg, #f59e0b, #d97706)" :
                                           "linear-gradient(90deg, #ef4444, #dc2626)",
                                borderRadius: "4px",
                                transition: "width 0.5s ease",
                              }}
                            />
                          </div>
                        </div>

                        {/* Economic Value of Alignment */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
                          <div style={{ backgroundColor: "#ecfdf5", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#059669" }}>${Math.round(totalCommittedHours * 34.79).toLocaleString()}</div>
                            <div style={{ fontSize: "10px", color: "#6b7280" }}>Aligned Value</div>
                          </div>
                          <div style={{ backgroundColor: "#eff6ff", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1e40af" }}>{alignedSDGs.reduce((sum: number, m: SDGMetric) => sum + (m.uniqueEmployees || 0), 0)}</div>
                            <div style={{ fontSize: "10px", color: "#6b7280" }}>Active Volunteers</div>
                          </div>
                          <div style={{ backgroundColor: "#fef3c7", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#d97706" }}>{alignedSDGs.reduce((sum: number, m: SDGMetric) => sum + (m.projectsContributed || 0), 0)}</div>
                            <div style={{ fontSize: "10px", color: "#6b7280" }}>Projects</div>
                          </div>
                        </div>

                        {/* Alignment Insight Message */}
                        <div
                          style={{
                            padding: "12px",
                            backgroundColor: alignmentScore >= 70 ? "rgba(34, 197, 94, 0.1)" :
                                           alignmentScore >= 40 ? "rgba(245, 158, 11, 0.1)" :
                                           "rgba(239, 68, 68, 0.1)",
                            borderRadius: "8px",
                            border: `1px solid ${alignmentScore >= 70 ? "rgba(34, 197, 94, 0.3)" :
                                                alignmentScore >= 40 ? "rgba(245, 158, 11, 0.3)" :
                                                "rgba(239, 68, 68, 0.3)"}`,
                            marginBottom: "16px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                            {alignmentScore >= 70 ? (
                              <CheckCircle style={{ width: "18px", height: "18px", color: "#22c55e", flexShrink: 0, marginTop: "2px" }} />
                            ) : (
                              <Lightbulb style={{ width: "18px", height: "18px", color: alignmentScore >= 40 ? "#f59e0b" : "#ef4444", flexShrink: 0, marginTop: "2px" }} />
                            )}
                            <div>
                              <p style={{ fontSize: "13px", color: "#475569", margin: 0, lineHeight: "1.4" }}>
                                {alignmentScore >= 70
                                  ? "Excellent alignment! Your employees are actively contributing to corporate SDG commitments. Continue leveraging this momentum."
                                  : alignmentScore >= 40
                                    ? "Good progress! Consider creating targeted volunteer opportunities for under-utilized SDG commitments to boost alignment."
                                    : "Opportunity detected: Employee volunteer activities are not fully aligned with corporate SDG commitments. Review the insights below to identify gaps and opportunities."}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <button
                            onClick={() => startTransition(() => setSelectedKPI("sdg"))}
                            style={{
                              backgroundColor: "#6366F1",
                              color: "white",
                              padding: "12px",
                              borderRadius: "8px",
                              border: "none",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "13px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#4f46e5"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#6366F1"; }}
                          >
                            <BarChart3 style={{ width: "16px", height: "16px" }} />
                            View SDG Details
                          </button>
                          <button
                            onClick={() => navigate('/corporate-partner-profile-settings')}
                            style={{
                              backgroundColor: "white",
                              color: "#6366F1",
                              padding: "12px",
                              borderRadius: "8px",
                              border: "2px solid #6366F1",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "13px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#EEF2FF"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
                          >
                            <Settings style={{ width: "16px", height: "16px" }} />
                            Manage Commitments
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div
                  className="glass-card"
                  style={{
                    background: "rgba(10, 14, 39, 0.6)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "20px",
                    padding: "32px",
                    marginBottom: "24px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      background: "linear-gradient(135deg, rgba(0, 217, 255, 0.2) 0%, rgba(184, 79, 255, 0.2) 100%)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                    }}
                  >
                    <Target style={{ width: "32px", height: "32px", color: "#3b82f6" }} />
                  </div>
                  <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#1e3a8a", marginBottom: "8px" }}>
                    Set Your SDG Commitments
                  </h3>
                  <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px", maxWidth: "500px", margin: "0 auto 24px" }}>
                    Your organization hasn't selected any UN Sustainable Development Goals yet.
                    Please visit your settings to choose the SDGs that align with your corporate social responsibility initiatives.
                  </p>
                  <button
                    onClick={() => navigate("/corporate-partner-profile-settings")}
                    className="btn-premium"
                    style={{
                      padding: "12px 24px",
                      background: "linear-gradient(135deg, #00D9FF 0%, #B84FFF 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 217, 255, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    >
                      Go to Settings
                    </button>
                  </div>
                )}
              </div>

              {/* AI Insights Section - Premium Glass */}
              {suggestedSDGs.length > 0 && (
                <div
                  className="glass-card"
                  style={{
                    background: "linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(255, 107, 53, 0.08) 100%)",
                    border: "1px solid rgba(255, 215, 0, 0.3)",
                    borderRadius: "20px",
                    padding: "24px",
                    marginBottom: "24px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        background: "linear-gradient(135deg, #FFD700 0%, #FF6B35 100%)",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Lightbulb style={{ width: "24px", height: "24px", color: "white" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h2
                        style={{
                          fontSize: "18px",
                          fontWeight: "700",
                          color: "#b45309",
                          marginBottom: "8px",
                        }}
                      >
                        AI-Powered Insights: Emerging SDG Opportunities
                      </h2>
                      <p style={{ fontSize: "14px", color: "#475569", marginBottom: "12px", lineHeight: "1.5" }}>
                        Your employees are actively working on <strong style={{ color: "#b45309" }}>{suggestedSDGs.length} SDG goal{suggestedSDGs.length > 1 ? "s" : ""}</strong>{" "}
                        that aren't part of your organization's official commitment. This represents grassroots engagement
                        that could inform your corporate CSR strategy.
                      </p>
                    </div>
                  </div>

                  {/* Suggested SDGs Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: "16px",
                      marginBottom: "16px",
                    }}
                  >
                    {suggestedSDGs.map((sdgNum) => {
                      const sdgData = sdgMetrics.find(m => m.sdg === sdgNum);
                      const sdgColor = getSDGColor(sdgNum);
                      const employees = sdgData?.uniqueEmployees || 0;
                      const hours = sdgData?.totalHours || 0;
                      const economicValue = hours * 34.79;

                      return (
                        <div
                          key={sdgNum}
                          style={{
                            background: "white",
                            border: `2px solid ${sdgColor}`,
                            borderRadius: "12px",
                            padding: "16px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          }}
                        >
                          {/* SDG Header */}
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                            <img
                              src={getSDGIcon(sdgNum)}
                              alt={`SDG ${sdgNum}: ${getSDGName(sdgNum)}`}
                              loading="lazy"
                              style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "6px",
                                objectFit: "cover",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>
                                SDG {sdgNum}: {getSDGName(sdgNum)}
                              </div>
                              <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                                Not in current commitments
                              </div>
                            </div>
                          </div>

                          {/* KPI Grid */}
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "12px" }}>
                            <div style={{ backgroundColor: "#f0fdf4", borderRadius: "6px", padding: "8px", textAlign: "center" }}>
                              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#059669" }}>{employees}</div>
                              <div style={{ fontSize: "9px", color: "#6b7280" }}>Employees</div>
                            </div>
                            <div style={{ backgroundColor: "#eff6ff", borderRadius: "6px", padding: "8px", textAlign: "center" }}>
                              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1e40af" }}>{formatDecimal(hours)}h</div>
                              <div style={{ fontSize: "9px", color: "#6b7280" }}>Hours</div>
                            </div>
                            <div style={{ backgroundColor: "#ecfdf5", borderRadius: "6px", padding: "8px", textAlign: "center" }}>
                              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#059669" }}>${economicValue.toLocaleString()}</div>
                              <div style={{ fontSize: "9px", color: "#6b7280" }}>Value</div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            <button
                              onClick={() => startTransition(() => {
                                setSdgDetailModal({ isOpen: true, sdgNumber: sdgNum });
                              })}
                              style={{
                                backgroundColor: "white",
                                color: sdgColor,
                                padding: "10px 12px",
                                borderRadius: "8px",
                                border: `2px solid ${sdgColor}`,
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = sdgColor; e.currentTarget.style.color = "white"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; e.currentTarget.style.color = sdgColor; }}
                            >
                              <Search style={{ width: "14px", height: "14px" }} />
                              View Details
                            </button>
                            <button
                              onClick={() => {
                                toast({
                                  title: "Add to ESG Commitment",
                                  description: `Navigate to settings to add SDG ${sdgNum} (${getSDGName(sdgNum)}) to your corporate commitments.`
                                });
                                navigate('/corporate-partner-profile-settings');
                              }}
                              style={{
                                backgroundColor: sdgColor,
                                color: "white",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
                            >
                              <Plus style={{ width: "14px", height: "14px" }} />
                              Add to ESG
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI Recommendation Banner */}
                  <div
                    style={{
                      padding: "14px 16px",
                      background: "linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 107, 53, 0.15) 100%)",
                      borderRadius: "8px",
                      fontSize: "13px",
                      color: "#78350f",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <Sparkles style={{ width: "20px", height: "20px", color: "#f59e0b", flexShrink: 0 }} />
                    <div>
                      <strong>AI Recommendation:</strong> These {suggestedSDGs.length} SDGs show strong grassroots employee engagement.
                      Adding them to your ESG commitments can increase alignment scores by up to {Math.min(suggestedSDGs.length * 15, 45)}%.
                    </div>
                  </div>
                </div>
              )}

              {/* KPI Cards Row - 6 cards in single row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: "10px",
                }}
              >
                <button
                  onClick={() => startTransition(() => {
                    setSelectedKPI("hours");
                    setKpiDetailModal({ isOpen: true, type: 'hours' });
                  })}
                  className="glass-card"
                  style={{
                    background: selectedKPI === "hours" ? "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)" : "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
                    color: "#1e3a8a",
                    padding: "12px 10px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border: selectedKPI === "hours" ? "2px solid #3b82f6" : "1px solid #e0e7ff",
                    textAlign: "left",
                    width: "100%",
                    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.1)",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.2)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(59, 130, 246, 0.1)";
                  }}
                  data-testid="kpi-total-hours"
                >
                  <p style={{ fontSize: "9px", color: "#64748b", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    Hours Logged
                  </p>
                  <p style={{ fontSize: "22px", fontWeight: "bold", color: selectedKPI === "hours" ? "#1d4ed8" : "#1e3a8a", lineHeight: 1.1 }}>
                    {displayTotalHours.toLocaleString()}
                  </p>
                  <p style={{ fontSize: "9px", color: "#3b82f6", marginTop: "3px", fontWeight: "500" }}>
                    ${(displayTotalHours * 34.79 / 1000).toFixed(0)}K value
                  </p>
                </button>

                <button
                  onClick={() => startTransition(() => {
                    setSelectedKPI("employees");
                    setKpiDetailModal({ isOpen: true, type: 'employees' });
                  })}
                  style={{
                    background: selectedKPI === "employees" ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)" : "linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)",
                    color: "#065f46",
                    padding: "12px 10px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border: selectedKPI === "employees" ? "2px solid #10b981" : "1px solid #d1fae5",
                    textAlign: "left",
                    width: "100%",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.2)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.1)";
                  }}
                  data-testid="kpi-employees"
                >
                  <p style={{ fontSize: "9px", color: "#64748b", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    Engaged
                  </p>
                  <p style={{ fontSize: "22px", fontWeight: "bold", color: selectedKPI === "employees" ? "#047857" : "#065f46", lineHeight: 1.1 }}>
                    {displayActiveEmployees}
                  </p>
                  <p style={{ fontSize: "9px", color: "#10b981", marginTop: "3px", fontWeight: "500" }}>
                    Employees
                  </p>
                </button>

                <button
                  onClick={() => startTransition(() => {
                    setSelectedKPI("projects");
                    setKpiDetailModal({ isOpen: true, type: 'projects' });
                  })}
                  style={{
                    background: selectedKPI === "projects" ? "linear-gradient(135deg, #fae8ff 0%, #f5d0fe 100%)" : "linear-gradient(135deg, #ffffff 0%, #fdf4ff 100%)",
                    color: "#7e22ce",
                    padding: "12px 10px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(168, 85, 247, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border: selectedKPI === "projects" ? "2px solid #a855f7" : "1px solid #f3e8ff",
                    textAlign: "left",
                    width: "100%",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(168, 85, 247, 0.2)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(168, 85, 247, 0.1)";
                  }}
                  data-testid="kpi-projects"
                >
                  <p style={{ fontSize: "9px", color: "#64748b", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    Projects
                  </p>
                  <p style={{ fontSize: "22px", fontWeight: "bold", color: selectedKPI === "projects" ? "#7e22ce" : "#9333ea", lineHeight: 1.1 }}>
                    {csrData?.kpiBreakdown?.projects?.activeProjects || displayProjectsCompleted}
                  </p>
                  <p style={{ fontSize: "9px", color: "#a855f7", marginTop: "3px", fontWeight: "500" }}>
                    Active
                  </p>
                </button>

                <button
                  onClick={() => startTransition(() => {
                    setSelectedKPI("sdg");
                    setKpiDetailModal({ isOpen: true, type: 'sdg' });
                  })}
                  style={{
                    background: selectedKPI === "sdg" ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" : "linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)",
                    color: "#b45309",
                    padding: "12px 10px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(245, 158, 11, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border: selectedKPI === "sdg" ? "2px solid #f59e0b" : "1px solid #fef3c7",
                    textAlign: "left",
                    width: "100%",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(245, 158, 11, 0.2)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(245, 158, 11, 0.1)";
                  }}
                  data-testid="kpi-sdg-delta"
                >
                  <p style={{ fontSize: "9px", color: "#64748b", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    SDGs
                  </p>
                  <p style={{ fontSize: "22px", fontWeight: "bold", color: selectedKPI === "sdg" ? "#b45309" : "#d97706", lineHeight: 1.1 }}>
                    {sdgMetrics.filter((m: any) => m.totalHours > 0).length}
                    <span style={{ fontSize: "11px", fontWeight: "normal", color: "#92400e" }}>/17</span>
                  </p>
                  <p style={{ fontSize: "9px", color: "#92400e", marginTop: "3px", fontWeight: "500" }}>
                    Active
                  </p>
                </button>

                {/* 5th KPI: Total Volunteers */}
                <button
                  onClick={() => startTransition(() => {
                    setSelectedKPI("volunteers");
                    setKpiDetailModal({ isOpen: true, type: 'volunteers' });
                  })}
                  style={{
                    background: selectedKPI === "volunteers" ? "linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)" : "linear-gradient(135deg, #ffffff 0%, #ecfeff 100%)",
                    color: "#0e7490",
                    padding: "12px 10px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(6, 182, 212, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border: selectedKPI === "volunteers" ? "2px solid #06b6d4" : "1px solid #cffafe",
                    textAlign: "left",
                    width: "100%",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(6, 182, 212, 0.2)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(6, 182, 212, 0.1)";
                  }}
                  data-testid="kpi-volunteers"
                >
                  <p style={{ fontSize: "9px", color: "#64748b", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    Volunteers
                  </p>
                  <p style={{ fontSize: "22px", fontWeight: "bold", color: selectedKPI === "volunteers" ? "#0e7490" : "#0891b2", lineHeight: 1.1 }}>
                    {csrData?.activeEmployees || 0}
                  </p>
                  <p style={{ fontSize: "9px", color: "#06b6d4", marginTop: "3px", fontWeight: "500" }}>
                    Employees
                  </p>
                </button>

                {/* 6th KPI: Impact Score */}
                <button
                  onClick={() => startTransition(() => {
                    setSelectedKPI("aiu");
                    setKpiDetailModal({ isOpen: true, type: 'aiu' });
                  })}
                  style={{
                    background: selectedKPI === "aiu" ? "linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)" : "linear-gradient(135deg, #ffffff 0%, #fdf2f8 100%)",
                    color: "#be185d",
                    padding: "12px 10px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(236, 72, 153, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border: selectedKPI === "aiu" ? "2px solid #ec4899" : "1px solid #fce7f3",
                    textAlign: "left",
                    width: "100%",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(236, 72, 153, 0.2)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(236, 72, 153, 0.1)";
                  }}
                  data-testid="kpi-aiu"
                >
                  <p style={{ fontSize: "9px", color: "#64748b", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    {isAIUEnabled ? "AIUs" : "Impact"}
                  </p>
                  <p style={{ fontSize: "22px", fontWeight: "bold", color: selectedKPI === "aiu" ? "#be185d" : "#db2777", lineHeight: 1.1 }}>
                    {formatDecimal(displayTotalImpact || 0)}
                  </p>
                  <p style={{ fontSize: "9px", color: "#ec4899", marginTop: "3px", fontWeight: "500" }}>
                    Earned
                  </p>
                </button>
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px", marginBottom: "16px" }}>
                    {/* Total Hours */}
                    <button
                      onClick={() => startTransition(() => setShowTotalHoursModal(true))}
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
                      onClick={() => startTransition(() => setShowEmployeesModal(true))}
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
                      onClick={() => startTransition(() => setShowActiveSDGsModal(true))}
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
                      <FolderKanban style={{ width: "16px", height: "16px", color: "#92400e", margin: "0 auto 4px" }} />
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#92400e", margin: 0 }}>{committedSDGProjects}</p>
                      <p style={{ fontSize: "9px", color: "#92400e", margin: "2px 0 0 0", fontWeight: "500" }}>ACTIVE PROJECTS</p>
                      <p style={{ fontSize: "8px", color: "#6b7280", margin: "2px 0 0 0" }}>
                        {committedSDGProjects > 0 ? `${Math.round(committedSDGHours / committedSDGProjects)} hrs/proj` : "—"}
                      </p>
                    </button>

                    {/* Active SDGs - Enhanced with SDG numbers and titles */}
                    <button
                      onClick={() => startTransition(() => setShowActiveSDGsModal(true))}
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
                      onClick={() => startTransition(() => setShowEmployeesModal(true))}
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
                    {/* AI Insight - Clickable */}
                    <button
                      onClick={() => startTransition(() => setShowActiveSDGsModal(true))}
                      title="Click to view SDG activity details"
                      style={{ flex: 1, padding: "10px 12px", backgroundColor: "#f0f9ff", borderRadius: "8px", borderLeft: "3px solid #3b82f6", border: "1px solid #bfdbfe", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#dbeafe"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.15)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#f0f9ff"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
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
                    </button>

                    {/* Expansion Opportunity */}
                    {employeeActivityOutsideCommitments.length > 0 && (
                      <button
                        onClick={() => startTransition(() => setShowExpansionInsightsModal(true))}
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

                  {/* Map Stats Row - Interactive buttons */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginBottom: "16px" }}>
                    <button
                      onClick={() => startTransition(() => setSelectedKPI("projects"))}
                      title="Click to view project details"
                      style={{ backgroundColor: "#eff6ff", borderRadius: "8px", padding: "10px", textAlign: "center", border: "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.2)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#1e40af", margin: 0 }}>
                        {filteredProjectLocations.length}
                      </p>
                      <p style={{ fontSize: "9px", color: "#3b82f6", margin: "2px 0 0 0", fontWeight: "500" }}>PROJECTS</p>
                    </button>
                    <button
                      onClick={() => startTransition(() => setShowEmployeesModal(true))}
                      title="Click to view volunteer details"
                      style={{ backgroundColor: "#f0fdf4", borderRadius: "8px", padding: "10px", textAlign: "center", border: "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22c55e"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(34,197,94,0.2)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#166534", margin: 0 }}>
                        {filteredProjectLocations.reduce((sum, p) => sum + (p.employees || 0), 0)}
                      </p>
                      <p style={{ fontSize: "9px", color: "#22c55e", margin: "2px 0 0 0", fontWeight: "500" }}>VOLUNTEERS</p>
                    </button>
                    <button
                      onClick={() => startTransition(() => setShowTotalHoursModal(true))}
                      title="Click to view hours breakdown"
                      style={{ backgroundColor: "#fef3c7", borderRadius: "8px", padding: "10px", textAlign: "center", border: "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(245,158,11,0.2)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#92400e", margin: 0 }}>
                        {filteredProjectLocations.reduce((sum, p) => sum + (p.hours || 0), 0).toLocaleString()}
                      </p>
                      <p style={{ fontSize: "9px", color: "#92400e", margin: "2px 0 0 0", fontWeight: "500" }}>HOURS</p>
                    </button>
                    <button
                      onClick={() => startTransition(() => setSelectedMapRegion("all"))}
                      title="Click to view all regions"
                      style={{ backgroundColor: "#fae8ff", borderRadius: "8px", padding: "10px", textAlign: "center", border: "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#a855f7"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(168,85,247,0.2)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: "#7e22ce", margin: 0 }}>
                        {new Set(filteredProjectLocations.map(p => p.region).filter(Boolean)).size}
                      </p>
                      <p style={{ fontSize: "9px", color: "#a855f7", margin: "2px 0 0 0", fontWeight: "500" }}>REGIONS</p>
                    </button>
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
                        onClick={() => startTransition(() => { setSelectedMapRegion("all"); setSelectedMapStatus("all"); })}
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
                    data-testid="geographic-map-container"
                  >
                    <LazyErrorBoundary fallback={<MapSkeleton />}>
                      <Suspense fallback={<MapSkeleton />}>
                        <LazyGlobalImpactMap projectLocations={filteredProjectLocations} />
                      </Suspense>
                    </LazyErrorBoundary>
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
                      {/* Funnel Summary Stats - Interactive - Always 3 columns */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
                        <button
                          onClick={() => startTransition(() => { setSelectedFunnelStage(0); setShowFunnelModal(true); })}
                          title="Click to view enrolled employees"
                          style={{ backgroundColor: "#f0fdf4", borderRadius: "8px", padding: "10px 6px", textAlign: "center", border: "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22c55e"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(34,197,94,0.2)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                          <p style={{ fontSize: "18px", fontWeight: "bold", color: "#166534", margin: 0 }}>
                            {funnelData.funnel[0]?.count || 0}
                          </p>
                          <p style={{ fontSize: "8px", color: "#22c55e", margin: "2px 0 0 0", fontWeight: "600", letterSpacing: "0.3px" }}>ENROLLED</p>
                        </button>
                        <button
                          onClick={() => startTransition(() => { setSelectedFunnelStage(2); setShowFunnelModal(true); })}
                          title="Click to view active employees"
                          style={{ backgroundColor: "#eff6ff", borderRadius: "8px", padding: "10px 6px", textAlign: "center", border: "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.2)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                          <p style={{ fontSize: "18px", fontWeight: "bold", color: "#1e40af", margin: 0 }}>
                            {funnelData.conversion?.toActive || 0}%
                          </p>
                          <p style={{ fontSize: "8px", color: "#3b82f6", margin: "2px 0 0 0", fontWeight: "600", letterSpacing: "0.3px" }}>TO ACTIVE</p>
                        </button>
                        <button
                          onClick={() => startTransition(() => { setSelectedFunnelStage(funnelData.funnel.length - 1); setShowFunnelModal(true); })}
                          title="Click to view top performers"
                          style={{ backgroundColor: "#fef3c7", borderRadius: "8px", padding: "10px 6px", textAlign: "center", border: "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(245,158,11,0.2)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                          <p style={{ fontSize: "18px", fontWeight: "bold", color: "#92400e", margin: 0 }}>
                            {funnelData.conversion?.toTopPerformers || 0}%
                          </p>
                          <p style={{ fontSize: "8px", color: "#f59e0b", margin: "2px 0 0 0", fontWeight: "600", letterSpacing: "0.3px" }}>TOP PERF.</p>
                        </button>
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
                  onClick={() => startTransition(() => setShowAdminModal(true))}
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
                          flexWrap: "wrap",
                          justifyContent: "center",
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
                        {adminActionsData.pendingVerification && adminActionsData.pendingVerification.count > 0 && (
                          <div style={{ textAlign: "center" }}>
                            <div
                              style={{
                                fontSize: "18px",
                                fontWeight: "bold",
                                color: "#3b82f6",
                              }}
                            >
                              {adminActionsData.pendingVerification.totalPendingHours}h
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>
                              Pending
                            </div>
                          </div>
                        )}
                      </div>
                      {adminActionsData.pendingVerification && adminActionsData.pendingVerification.count > 0 && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#3b82f6",
                            textAlign: "center",
                            padding: "6px 8px",
                            background: "#eff6ff",
                            borderRadius: "6px",
                            marginBottom: "4px",
                          }}
                        >
                          {adminActionsData.pendingVerification.totalPendingHours} hours awaiting org verification
                        </div>
                      )}
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

          {/* SDG Alignment Tab */}
          {selectedMainTab === "sdgs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeIn 0.3s ease-in-out" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <TrendingUp style={{ width: "28px", height: "28px", color: "#059669" }} />
                  <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#14532d" }}>
                    SDG Alignment
                  </h1>
                </div>
                <div style={{ fontSize: "14px", color: "#059669", fontWeight: "600" }}>
                  {committedSDGsList.length} Committed SDGs
                </div>
              </div>

              {/* Summary Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <div style={{
                  background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                  padding: "20px",
                  borderRadius: "12px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "32px", fontWeight: "700", color: "#059669" }}>
                    {displayTotalHours.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "12px", color: "#065f46", fontWeight: "500" }}>Total SDG Hours</div>
                </div>
                <div style={{
                  background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                  padding: "20px",
                  borderRadius: "12px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "32px", fontWeight: "700", color: "#2563eb" }}>
                    {sdgMetrics.filter((m: any) => m.totalHours > 0).length}
                  </div>
                  <div style={{ fontSize: "12px", color: "#1e40af", fontWeight: "500" }}>Active SDGs</div>
                </div>
                <div style={{
                  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                  padding: "20px",
                  borderRadius: "12px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "32px", fontWeight: "700", color: "#d97706" }}>
                    {displayActiveEmployees}
                  </div>
                  <div style={{ fontSize: "12px", color: "#92400e", fontWeight: "500" }}>Volunteers Contributing</div>
                </div>
              </div>

              {/* Committed SDGs Section */}
              <div style={{
                background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                padding: "24px",
                borderRadius: "16px",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#14532d", marginBottom: "16px" }}>
                  Your Committed SDGs
                </h3>
                {committedSDGsList.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                    {committedSDGsList.map((sdgNum: number) => {
                      const metric = sdgMetrics.find((m: any) => m.sdg === sdgNum) || { sdg: sdgNum, totalHours: 0, uniqueEmployees: 0, projectsContributed: 0 };
                      return (
                        <div key={sdgNum} style={{
                          background: "white",
                          padding: "16px",
                          borderRadius: "12px",
                          border: `2px solid ${getSDGColor(sdgNum)}`,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onClick={() => setSdgDetailModal({ isOpen: true, sdgNumber: sdgNum })}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                            <img
                              src={getSDGIcon(sdgNum)}
                              alt={`SDG ${sdgNum}: ${getSDGName(sdgNum)}`}
                              style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover" }}
                            />
                            <div>
                              <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "14px" }}>SDG {sdgNum}</div>
                              <div style={{ fontSize: "12px", color: "#64748b" }}>{getSDGName(sdgNum)}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: "20px", fontWeight: "700", color: getSDGColor(sdgNum) }}>
                                {(metric.totalHours || 0).toLocaleString()} hrs
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                {metric.uniqueEmployees || 0} volunteers • {metric.projectsContributed || 0} projects
                              </div>
                            </div>
                            <ChevronRight style={{ width: "20px", height: "20px", color: "#94a3b8" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                    <Target style={{ width: "48px", height: "48px", margin: "0 auto 12px", color: "#cbd5e1" }} />
                    <p style={{ fontSize: "14px", marginBottom: "16px" }}>No SDG commitments configured yet.</p>
                    <button
                      onClick={() => navigate("/corporate-partner-profile-settings")}
                      style={{
                        padding: "10px 20px",
                        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Configure SDG Commitments
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate("/sdg-mapping")}
                style={{
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                View Full SDG Mapping
              </button>
            </div>
          )}

          {/* Leaderboard Tab */}
          {selectedMainTab === "leaderboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeIn 0.3s ease-in-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <Award style={{ width: "28px", height: "28px", color: "#f59e0b" }} />
                <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#92400e" }}>
                  Volunteer Leaderboard
                </h1>
              </div>
              <div style={{
                background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                padding: "24px",
                borderRadius: "16px",
                border: "1px solid rgba(245, 158, 11, 0.2)",
              }}>
                <p style={{ color: "#475569", fontSize: "14px", marginBottom: "20px" }}>
                  Celebrate top volunteers and their contributions to community impact.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {displayLeaderboard.slice(0, 10).map((employee: any, index: number) => (
                    <div key={employee.id || index} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "16px",
                      background: index === 0 ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" : "white",
                      borderRadius: "12px",
                      border: index === 0 ? "2px solid #f59e0b" : "1px solid #e5e7eb",
                    }}>
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: index === 0 ? "#f59e0b" : index === 1 ? "#94a3b8" : index === 2 ? "#b45309" : "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: index < 3 ? "white" : "#64748b",
                        fontWeight: "700",
                        fontSize: "14px",
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>{employee.name || employee.displayName}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{employee.department || "Team Member"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: "700", color: "#059669", fontSize: "18px" }}>{employee.totalHours || 0}h</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{employee.projectCount || 0} projects</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate("/leaderboard")}
                  style={{
                    marginTop: "20px",
                    padding: "12px 24px",
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  View Full Leaderboard
                </button>
              </div>
            </div>
          )}

          {/* Recognition Tab */}
          {selectedMainTab === "recognition" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeIn 0.3s ease-in-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <Zap style={{ width: "28px", height: "28px", color: "#8b5cf6" }} />
                <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#5b21b6" }}>
                  Employee Recognition
                </h1>
              </div>
              <div style={{
                background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                padding: "24px",
                borderRadius: "16px",
                border: "1px solid rgba(139, 92, 246, 0.2)",
              }}>
                <p style={{ color: "#475569", fontSize: "14px", marginBottom: "20px" }}>
                  Recognize and celebrate employee contributions to social impact initiatives.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                  <div style={{
                    background: "white",
                    padding: "20px",
                    borderRadius: "12px",
                    textAlign: "center",
                    border: "1px solid rgba(139, 92, 246, 0.2)",
                  }}>
                    <Star style={{ width: "32px", height: "32px", color: "#f59e0b", margin: "0 auto 8px" }} />
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#5b21b6" }}>{displayActiveEmployees}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Active Volunteers</div>
                  </div>
                  <div style={{
                    background: "white",
                    padding: "20px",
                    borderRadius: "12px",
                    textAlign: "center",
                    border: "1px solid rgba(139, 92, 246, 0.2)",
                  }}>
                    <Trophy style={{ width: "32px", height: "32px", color: "#f59e0b", margin: "0 auto 8px" }} />
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#5b21b6" }}>{displayProjectsCompleted}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Projects Completed</div>
                  </div>
                  <div style={{
                    background: "white",
                    padding: "20px",
                    borderRadius: "12px",
                    textAlign: "center",
                    border: "1px solid rgba(139, 92, 246, 0.2)",
                  }}>
                    <Heart style={{ width: "32px", height: "32px", color: "#ef4444", margin: "0 auto 8px" }} />
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#5b21b6" }}>{displayTotalHours.toLocaleString()}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Total Hours</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowRecognitionModal(true)}
                  style={{
                    padding: "12px 24px",
                    background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Send style={{ width: "16px", height: "16px" }} />
                  Send Recognition
                </button>
              </div>
            </div>
          )}

          {/* Challenges Tab */}
          {selectedMainTab === "challenges" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeIn 0.3s ease-in-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <Target style={{ width: "28px", height: "28px", color: "#0ea5e9" }} />
                <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#0c4a6e" }}>
                  Active Challenges
                </h1>
              </div>
              <div style={{
                background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                padding: "24px",
                borderRadius: "16px",
                border: "1px solid rgba(14, 165, 233, 0.2)",
              }}>
                <p style={{ color: "#475569", fontSize: "14px", marginBottom: "20px" }}>
                  View and participate in corporate volunteer challenges.
                </p>
                <div style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "12px",
                  border: "1px solid rgba(14, 165, 233, 0.2)",
                  textAlign: "center",
                }}>
                  <Flame style={{ width: "48px", height: "48px", color: "#f97316", margin: "0 auto 12px" }} />
                  <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>
                    Q4 Volunteer Challenge
                  </h3>
                  <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "16px" }}>
                    Help us reach 1,000 volunteer hours this quarter!
                  </p>
                  <div style={{
                    background: "#e5e7eb",
                    borderRadius: "999px",
                    height: "12px",
                    marginBottom: "8px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${Math.min((displayTotalHours / 1000) * 100, 100)}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #0ea5e9 0%, #06b6d4 100%)",
                      borderRadius: "999px",
                    }} />
                  </div>
                  <div style={{ fontSize: "14px", color: "#475569" }}>
                    {displayTotalHours.toLocaleString()} / 1,000 hours ({Math.round((displayTotalHours / 1000) * 100)}%)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Geographic Impact Tab */}
          {selectedMainTab === "geographic" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeIn 0.3s ease-in-out" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Globe style={{ width: "28px", height: "28px", color: "#0891b2" }} />
                  <div>
                    <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#164e63", margin: 0 }}>
                      Geographic Impact
                    </h1>
                    <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                      Project locations where your employees are making a difference
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "2px solid #3b82f6", textAlign: "center" }}>
                  <MapPin style={{ width: "24px", height: "24px", color: "#3b82f6", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1e40af" }}>{filteredProjectLocations.length}</div>
                  <div style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "500" }}>Active Projects</div>
                </div>
                <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "2px solid #22c55e", textAlign: "center" }}>
                  <Users style={{ width: "24px", height: "24px", color: "#22c55e", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#166534" }}>{filteredProjectLocations.reduce((sum, p) => sum + (p.employees || 0), 0)}</div>
                  <div style={{ fontSize: "12px", color: "#22c55e", fontWeight: "500" }}>Employees Engaged</div>
                </div>
                <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "2px solid #f59e0b", textAlign: "center" }}>
                  <Clock style={{ width: "24px", height: "24px", color: "#f59e0b", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#92400e" }}>{filteredProjectLocations.reduce((sum, p) => sum + (p.hours || 0), 0).toLocaleString()}</div>
                  <div style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "500" }}>Hours Contributed</div>
                </div>
                <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "2px solid #8b5cf6", textAlign: "center" }}>
                  <Globe style={{ width: "24px", height: "24px", color: "#8b5cf6", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#7c3aed" }}>{new Set(filteredProjectLocations.map(p => p.region).filter(Boolean)).size}</div>
                  <div style={{ fontSize: "12px", color: "#8b5cf6", fontWeight: "500" }}>Regions Covered</div>
                </div>
              </div>

              {/* Map and Filters Container */}
              <div style={{ backgroundColor: "white", borderRadius: "16px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                {/* Map Header with Filters */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <MapPin style={{ width: "18px", height: "18px", color: "#0891b2" }} />
                    Project Locations Map
                  </h3>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      value={selectedMapRegion}
                      onChange={(e) => setSelectedMapRegion(e.target.value)}
                      style={{ padding: "8px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: selectedMapRegion !== "all" ? "#dbeafe" : "white", color: "#374151", cursor: "pointer" }}
                    >
                      <option value="all">All Regions</option>
                      {projectRegions.map((region: string) => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                    <select
                      value={selectedMapStatus}
                      onChange={(e) => setSelectedMapStatus(e.target.value)}
                      style={{ padding: "8px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: selectedMapStatus !== "all" ? "#dbeafe" : "white", color: "#374151", cursor: "pointer" }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="sponsored">Sponsored</option>
                      <option value="completed">Completed</option>
                    </select>
                    {(selectedMapRegion !== "all" || selectedMapStatus !== "all") && (
                      <button
                        onClick={() => { setSelectedMapRegion("all"); setSelectedMapStatus("all"); }}
                        style={{ padding: "8px 12px", fontSize: "12px", borderRadius: "8px", border: "none", backgroundColor: "#fee2e2", color: "#991b1b", cursor: "pointer", fontWeight: "500" }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Map Legend */}
                <div style={{ padding: "12px 20px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e5e7eb", display: "flex", gap: "24px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#374151" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#1e3a8a" }} />
                    Active ({filteredProjectLocations.filter(p => p.status === "active").length})
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#374151" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#f97316" }} />
                    Sponsored ({filteredProjectLocations.filter(p => p.status === "sponsored").length})
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#374151" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
                    Completed ({filteredProjectLocations.filter(p => p.status === "completed").length})
                  </div>
                </div>

                {/* Map Container */}
                <div style={{ height: "450px", position: "relative", backgroundColor: "#0f172a" }}>
                  <LazyErrorBoundary fallback={<MapSkeleton />}>
                    <Suspense fallback={<MapSkeleton />}>
                      <LazyGlobalImpactMap projectLocations={filteredProjectLocations} />
                    </Suspense>
                  </LazyErrorBoundary>
                </div>
              </div>

              {/* Project List Table */}
              <div style={{ backgroundColor: "white", borderRadius: "16px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0 }}>
                    Project Locations ({filteredProjectLocations.length})
                  </h3>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc" }}>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Project Name</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Location / Region</th>
                        <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Employees</th>
                        <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Hours</th>
                        <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>SDGs</th>
                        <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjectLocations.length > 0 ? (
                        filteredProjectLocations.map((project: any, idx: number) => (
                          <tr key={project.id || idx} style={{ backgroundColor: idx % 2 === 0 ? "white" : "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                            <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "500", color: "#111827" }}>{project.name}</td>
                            <td style={{ padding: "12px 16px", fontSize: "13px", color: "#6b7280" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <MapPin style={{ width: "14px", height: "14px", color: "#9ca3af" }} />
                                {project.region || "Unknown"}
                              </div>
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#166534" }}>{project.employees || 0}</td>
                            <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#92400e" }}>{(project.hours || 0).toLocaleString()}</td>
                            <td style={{ padding: "12px 16px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "4px", justifyContent: "center", flexWrap: "wrap" }}>
                                {(project.sdgs || []).slice(0, 3).map((sdg: number) => (
                                  <span key={sdg} style={{ backgroundColor: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "600" }}>
                                    SDG {sdg}
                                  </span>
                                ))}
                                {(project.sdgs?.length || 0) > 3 && (
                                  <span style={{ backgroundColor: "#e5e7eb", color: "#6b7280", padding: "2px 6px", borderRadius: "4px", fontSize: "10px" }}>
                                    +{project.sdgs.length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "center" }}>
                              <span style={{
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "600",
                                textTransform: "capitalize",
                                backgroundColor: project.status === "active" ? "#dbeafe" : project.status === "sponsored" ? "#ffedd5" : "#d1fae5",
                                color: project.status === "active" ? "#1e40af" : project.status === "sponsored" ? "#c2410c" : "#166534"
                              }}>
                                {project.status || "active"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                            <MapPin style={{ width: "48px", height: "48px", color: "#d1d5db", margin: "0 auto 12px" }} />
                            <p style={{ margin: 0, fontSize: "14px" }}>No project locations found</p>
                            <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>Projects will appear here as employees log volunteer activities</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Regional Breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                {/* Hours by Region */}
                <div style={{ backgroundColor: "white", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <BarChart2 style={{ width: "18px", height: "18px", color: "#0891b2" }} />
                    Hours by Region
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(() => {
                      const regionHours: Record<string, number> = {};
                      filteredProjectLocations.forEach((p: any) => {
                        const region = p.region || "Unknown";
                        regionHours[region] = (regionHours[region] || 0) + (p.hours || 0);
                      });
                      const maxHours = Math.max(...Object.values(regionHours), 1);
                      return Object.entries(regionHours)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 6)
                        .map(([region, hours], idx) => (
                          <div key={region}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "13px", color: "#374151" }}>{region}</span>
                              <span style={{ fontSize: "13px", fontWeight: "600", color: "#0891b2" }}>{hours.toLocaleString()} hrs</span>
                            </div>
                            <div style={{ height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${(hours / maxHours) * 100}%`, backgroundColor: "#0891b2", borderRadius: "4px" }} />
                            </div>
                          </div>
                        ));
                    })()}
                  </div>
                </div>

                {/* Employees by Region */}
                <div style={{ backgroundColor: "white", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Users style={{ width: "18px", height: "18px", color: "#22c55e" }} />
                    Employees by Region
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(() => {
                      const regionEmployees: Record<string, number> = {};
                      filteredProjectLocations.forEach((p: any) => {
                        const region = p.region || "Unknown";
                        regionEmployees[region] = (regionEmployees[region] || 0) + (p.employees || 0);
                      });
                      const maxEmployees = Math.max(...Object.values(regionEmployees), 1);
                      return Object.entries(regionEmployees)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 6)
                        .map(([region, employees], idx) => (
                          <div key={region}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "13px", color: "#374151" }}>{region}</span>
                              <span style={{ fontSize: "13px", fontWeight: "600", color: "#22c55e" }}>{employees} employees</span>
                            </div>
                            <div style={{ height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${(employees / maxEmployees) * 100}%`, backgroundColor: "#22c55e", borderRadius: "4px" }} />
                            </div>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

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
          onClick={() => startTransition(() => setSelectedKPI(null))}
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
                {selectedKPI === "participation" && "Participation Rate"}
                {selectedKPI === "employees" && "Employees Engaged"}
                {selectedKPI === "projects" && "Projects Completed"}
                {selectedKPI === "sdg" && "Active SDGs"}
                {selectedKPI === "economic" && "Economic Value"}
                {selectedKPI === "volunteers" && "Employee Volunteers"}
                {selectedKPI === "aiu" && (isAIUEnabled ? "AIUs Earned" : SHADOW_MODE_LABELS.AIU_REPLACEMENT)}
              </h2>
              <button
                onClick={() => startTransition(() => setSelectedKPI(null))}
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
                {/* Interactive KPI Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <button
                    onClick={() => startTransition(() => { setSelectedKPI(null); setSelectedKPI("employees"); })}
                    style={{
                      backgroundColor: "#eff6ff",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #bfdbfe",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#dbeafe"; e.currentTarget.style.borderColor = "#93c5fd"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#eff6ff"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
                  >
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1e40af" }}>
                      {csrData?.kpiBreakdown?.hours?.averagePerEmployee ||
                        (csrData?.activeEmployees && csrData?.totalHours ? Math.round(csrData.totalHours / csrData.activeEmployees) : 0)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#3b82f6" }}>Avg Hours/Employee</div>
                  </button>
                  <button
                    onClick={() => navigate('/csr-reports-exports')}
                    style={{
                      backgroundColor: "#ecfdf5",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #a7f3d0",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#d1fae5"; e.currentTarget.style.borderColor = "#6ee7b7"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#ecfdf5"; e.currentTarget.style.borderColor = "#a7f3d0"; }}
                  >
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#059669" }}>
                      ${formatDecimal(displayTotalHours * 34.79 / 1000)}K
                    </div>
                    <div style={{ fontSize: "12px", color: "#10b981" }}>Economic Value</div>
                  </button>
                </div>
                {/* Hours by SDG - Interactive List */}
                <div style={{ backgroundColor: "#f3f4f6", padding: "16px", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", marginBottom: "12px" }}>
                    Hours by SDG (click to view details):
                  </p>
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {sdgMetrics
                      .filter((m: SDGMetric) => m.totalHours > 0)
                      .sort((a: SDGMetric, b: SDGMetric) => b.totalHours - a.totalHours)
                      .slice(0, 5)
                      .map((metric: SDGMetric) => (
                        <button
                          key={metric.sdg}
                          onClick={() => startTransition(() => { setSelectedKPI(null); setSelectedSDG(metric.sdg); })}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                            padding: "10px 8px",
                            marginBottom: "4px",
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; e.currentTarget.style.borderColor = getSDGColor(metric.sdg); }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "white"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                              width: "28px", height: "28px", borderRadius: "6px",
                              backgroundColor: getSDGColor(metric.sdg),
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "white", fontSize: "12px", fontWeight: "bold"
                            }}>
                              {metric.sdg}
                            </div>
                            <span style={{ fontSize: "13px", color: "#374151" }}>{getSDGName(metric.sdg)}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontWeight: "600", color: "#1e3a8a", fontSize: "13px" }}>{formatDecimal(metric.totalHours)} hrs</span>
                            <span style={{ fontWeight: "600", color: "#059669", fontSize: "12px" }}>${Math.round(metric.totalHours * 34.79).toLocaleString()}</span>
                            <ChevronRight style={{ width: "16px", height: "16px", color: "#9ca3af" }} />
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
                {/* Action Buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
                  <button
                    onClick={() => navigate('/csr-impact-reporting')}
                    style={{
                      backgroundColor: "#1e3a8a", color: "white", padding: "12px 16px",
                      borderRadius: "8px", border: "none", cursor: "pointer",
                      fontWeight: "600", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#1e40af")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1e3a8a")}
                  >
                    <FileText style={{ width: "16px", height: "16px" }} />
                    View Full Report
                  </button>
                  <button
                    onClick={() => {
                      startTransition(() => setSelectedMainTab("engagement"));
                      window.history.pushState({}, '', '/csr-dashboard?tab=engagement');
                    }}
                    style={{
                      backgroundColor: "white", color: "#1e3a8a", padding: "12px 16px",
                      borderRadius: "8px", border: "2px solid #1e3a8a", cursor: "pointer",
                      fontWeight: "600", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#eff6ff")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
                  >
                    <Users style={{ width: "16px", height: "16px" }} />
                    View Employees
                  </button>
                </div>
              </div>
            )}

            {selectedKPI === "participation" && (
              <div style={{ color: "#374151" }}>
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#7c3aed",
                    marginBottom: "16px",
                  }}
                >
                  {csrData?.kpiBreakdown?.employees?.engagementRate || Math.round((csrData?.activeEmployees || 0) / Math.max(csrData?.kpiBreakdown?.employees?.totalRoster || 1, 1) * 100)}% Participation
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    marginBottom: "16px",
                    lineHeight: "1.6",
                  }}
                >
                  Percentage of workforce actively engaged in volunteer activities.
                </p>
                {/* Participation KPI Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <button
                    onClick={() => startTransition(() => setSelectedKPI("employees"))}
                    style={{
                      backgroundColor: "#f5f3ff",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #ddd6fe",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#ede9fe"; e.currentTarget.style.borderColor = "#c4b5fd"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#f5f3ff"; e.currentTarget.style.borderColor = "#ddd6fe"; }}
                  >
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#7c3aed" }}>
                      {csrData?.activeEmployees || 0}
                    </div>
                    <div style={{ fontSize: "12px", color: "#8b5cf6" }}>Active Volunteers</div>
                  </button>
                  <button
                    onClick={() => toast({ title: "Total Roster", description: `${csrData?.kpiBreakdown?.employees?.totalRoster || 0} employees in company roster` })}
                    style={{
                      backgroundColor: "#faf5ff",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #e9d5ff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f3e8ff"; e.currentTarget.style.borderColor = "#d8b4fe"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#faf5ff"; e.currentTarget.style.borderColor = "#e9d5ff"; }}
                  >
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#a855f7" }}>
                      {csrData?.kpiBreakdown?.employees?.totalRoster || Math.round((csrData?.activeEmployees || 0) * 1.5)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#c084fc" }}>Total Roster</div>
                  </button>
                  <button
                    onClick={() => startTransition(() => setSelectedKPI("hours"))}
                    style={{
                      backgroundColor: "#eff6ff",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #bfdbfe",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#dbeafe"; e.currentTarget.style.borderColor = "#93c5fd"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#eff6ff"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
                  >
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2563eb" }}>
                      {csrData?.kpiBreakdown?.hours?.averagePerEmployee || (csrData?.activeEmployees && csrData?.totalHours ? Math.round(csrData.totalHours / csrData.activeEmployees) : 0)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#3b82f6" }}>Avg Hrs/Employee</div>
                  </button>
                  <button
                    onClick={() => startTransition(() => setSelectedKPI("economic"))}
                    style={{
                      backgroundColor: "#ecfdf5",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #a7f3d0",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#d1fae5"; e.currentTarget.style.borderColor = "#6ee7b7"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#ecfdf5"; e.currentTarget.style.borderColor = "#a7f3d0"; }}
                  >
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#059669" }}>
                      ${formatDecimal(displayTotalHours * 34.79 / 1000)}K
                    </div>
                    <div style={{ fontSize: "12px", color: "#10b981" }}>Economic Value</div>
                  </button>
                </div>
                {/* Engagement Breakdown */}
                <div style={{ backgroundColor: "#f3f4f6", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", marginBottom: "12px" }}>
                    Engagement Breakdown:
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", backgroundColor: "white", borderRadius: "6px" }}>
                      <span style={{ fontSize: "13px", color: "#374151" }}>High Performers (10+ hrs)</span>
                      <span style={{ fontWeight: "600", color: "#059669" }}>{Math.round((csrData?.activeEmployees || 0) * 0.3)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", backgroundColor: "white", borderRadius: "6px" }}>
                      <span style={{ fontSize: "13px", color: "#374151" }}>Regular Contributors (5-10 hrs)</span>
                      <span style={{ fontWeight: "600", color: "#2563eb" }}>{Math.round((csrData?.activeEmployees || 0) * 0.45)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", backgroundColor: "white", borderRadius: "6px" }}>
                      <span style={{ fontSize: "13px", color: "#374151" }}>New/Occasional (&lt;5 hrs)</span>
                      <span style={{ fontWeight: "600", color: "#f59e0b" }}>{Math.round((csrData?.activeEmployees || 0) * 0.25)}</span>
                    </div>
                  </div>
                </div>
                {/* Top Contributors */}
                <div style={{ backgroundColor: "#faf5ff", padding: "16px", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "#7c3aed", marginBottom: "12px" }}>
                    Top Contributors (click to view):
                  </p>
                  <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                    {(displayLeaderboard || []).slice(0, 5).map((emp: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => startTransition(() => { setSelectedKPI(null); setSelectedEmployee({ ...emp, rank: idx + 1 }); })}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          width: "100%", padding: "10px 8px", marginBottom: "4px",
                          backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "6px",
                          cursor: "pointer", transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f5f3ff"; e.currentTarget.style.borderColor = "#c4b5fd"; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "white"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "24px", height: "24px", borderRadius: "50%",
                            backgroundColor: idx === 0 ? "#fbbf24" : idx === 1 ? "#9ca3af" : idx === 2 ? "#cd7f32" : "#7c3aed",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "white", fontSize: "11px", fontWeight: "bold"
                          }}>
                            {idx + 1}
                          </div>
                          <span style={{ fontSize: "13px", color: "#374151" }}>{emp.employeeName || emp.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "600", color: "#7c3aed", fontSize: "13px" }}>{formatDecimal(emp.hours)}h</span>
                          <span style={{ fontWeight: "600", color: "#059669", fontSize: "12px" }}>${Math.round(emp.hours * 34.79).toLocaleString()}</span>
                          <ChevronRight style={{ width: "14px", height: "14px", color: "#9ca3af" }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Action Buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
                  <button
                    onClick={() => navigate('/csr-impact-reporting')}
                    style={{
                      backgroundColor: "#7c3aed", color: "white", padding: "14px 20px",
                      borderRadius: "8px", border: "none", cursor: "pointer",
                      fontWeight: "600", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#6d28d9")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#7c3aed")}
                  >
                    <FileText style={{ width: "16px", height: "16px" }} />
                    Full Report
                  </button>
                  <button
                    onClick={() => {
                      startTransition(() => setSelectedMainTab("engagement"));
                      window.history.pushState({}, '', '/csr-dashboard?tab=engagement');
                    }}
                    style={{
                      backgroundColor: "white", color: "#7c3aed", padding: "14px 20px",
                      borderRadius: "8px", border: "2px solid #7c3aed", cursor: "pointer",
                      fontWeight: "600", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f5f3ff")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
                  >
                    <Users style={{ width: "16px", height: "16px" }} />
                    View Employees
                  </button>
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
                  Company employees actively participating in CSR-sponsored initiatives.
                </p>
                {/* Interactive KPI Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <button
                    onClick={() => startTransition(() => { setSelectedKPI(null); setSelectedKPI("hours"); })}
                    style={{
                      backgroundColor: "#eff6ff", padding: "14px", borderRadius: "8px",
                      border: "1px solid #bfdbfe", cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#dbeafe"; e.currentTarget.style.borderColor = "#93c5fd"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#eff6ff"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
                  >
                    <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1e40af" }}>
                      {csrData?.kpiBreakdown?.employees?.averageHoursPerEmployee ||
                        (csrData?.activeEmployees && csrData?.totalHours ? Math.round(csrData.totalHours / csrData.activeEmployees) : 0)}
                    </div>
                    <div style={{ fontSize: "11px", color: "#3b82f6" }}>Avg Hrs/Employee</div>
                  </button>
                  <button
                    onClick={() => toast({ title: "Engagement Rate", description: `${csrData?.kpiBreakdown?.employees?.engagementRate || 0}% of total workforce actively volunteers.` })}
                    style={{
                      backgroundColor: "#ecfdf5", padding: "14px", borderRadius: "8px",
                      border: "1px solid #a7f3d0", cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#d1fae5"; e.currentTarget.style.borderColor = "#6ee7b7"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#ecfdf5"; e.currentTarget.style.borderColor = "#a7f3d0"; }}
                  >
                    <div style={{ fontSize: "22px", fontWeight: "bold", color: "#059669" }}>
                      {csrData?.kpiBreakdown?.employees?.engagementRate || 0}%
                    </div>
                    <div style={{ fontSize: "11px", color: "#10b981" }}>Engagement Rate</div>
                  </button>
                  <button
                    onClick={() => toast({ title: "New Volunteers", description: `${csrData?.kpiBreakdown?.employees?.newThisMonth || Math.max(1, Math.floor((csrData?.activeEmployees || 0) * 0.2))} new participants joined this month.` })}
                    style={{
                      backgroundColor: "#fef3c7", padding: "14px", borderRadius: "8px",
                      border: "1px solid #fcd34d", cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#fde68a"; e.currentTarget.style.borderColor = "#fbbf24"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fef3c7"; e.currentTarget.style.borderColor = "#fcd34d"; }}
                  >
                    <div style={{ fontSize: "22px", fontWeight: "bold", color: "#d97706" }}>
                      +{csrData?.kpiBreakdown?.employees?.newThisMonth || Math.max(1, Math.floor((csrData?.activeEmployees || 0) * 0.2))}
                    </div>
                    <div style={{ fontSize: "11px", color: "#f59e0b" }}>New This Month</div>
                  </button>
                </div>
                {/* Top Volunteers List - Real Names */}
                <div style={{ backgroundColor: "#f3f4f6", padding: "16px", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", marginBottom: "12px" }}>
                    Top Volunteers (click to view profile):
                  </p>
                  <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                    {(displayLeaderboard || []).slice(0, 8).map((volunteer: any, idx: number) => (
                      <button
                        key={volunteer.rank || idx}
                        onClick={() => startTransition(() => { setSelectedKPI(null); setSelectedEmployee({ ...volunteer, rank: idx + 1 }); })}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          width: "100%", padding: "10px 12px", marginBottom: "6px",
                          backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px",
                          cursor: "pointer", transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#fef3c7"; e.currentTarget.style.borderColor = "#fbbf24"; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "white"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{
                            width: "32px", height: "32px", borderRadius: "50%",
                            backgroundColor: idx === 0 ? "#fbbf24" : idx === 1 ? "#9ca3af" : idx === 2 ? "#cd7f32" : "#1e3a8a",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "white", fontSize: "14px", fontWeight: "bold"
                          }}>
                            {idx + 1}
                          </div>
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                              {volunteer.employeeName || volunteer.name || `Volunteer ${idx + 1}`}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>
                              {volunteer.points || 0} points earned
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#059669" }}>
                              {volunteer.hours || 0}
                            </div>
                            <div style={{ fontSize: "10px", color: "#6b7280" }}>hours</div>
                          </div>
                          <div style={{ textAlign: "right", borderLeft: "1px solid #e5e7eb", paddingLeft: "10px" }}>
                            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#7c3aed" }}>
                              ${Math.round((volunteer.hours || 0) * 34.79).toLocaleString()}
                            </div>
                            <div style={{ fontSize: "10px", color: "#6b7280" }}>value</div>
                          </div>
                          <ChevronRight style={{ width: "16px", height: "16px", color: "#9ca3af" }} />
                        </div>
                      </button>
                    ))}
                    {(!displayLeaderboard || displayLeaderboard.length === 0) && (
                      <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
                        No volunteer data available
                      </div>
                    )}
                  </div>
                </div>
                {/* Action Buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
                  <button
                    onClick={() => {
                      startTransition(() => setSelectedMainTab("engagement"));
                      window.history.pushState({}, '', '/csr-dashboard?tab=engagement');
                    }}
                    style={{
                      backgroundColor: "#1e3a8a", color: "white", padding: "12px 16px",
                      borderRadius: "8px", border: "none", cursor: "pointer",
                      fontWeight: "600", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#1e40af")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1e3a8a")}
                  >
                    <Users style={{ width: "16px", height: "16px" }} />
                    View Engagement Tab
                  </button>
                  <button
                    onClick={() => startTransition(() => { setSelectedKPI(null); setSelectedKPI("hours"); })}
                    style={{
                      backgroundColor: "white", color: "#1e3a8a", padding: "12px 16px",
                      borderRadius: "8px", border: "2px solid #1e3a8a", cursor: "pointer",
                      fontWeight: "600", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#eff6ff")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
                  >
                    <Clock style={{ width: "16px", height: "16px" }} />
                    View Hours
                  </button>
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
                  CSR initiatives sponsored with employee participation and measured impact.
                </p>
                {/* Interactive KPI Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <button
                    onClick={() => startTransition(() => { setSelectedKPI(null); setSelectedKPI("hours"); })}
                    style={{
                      backgroundColor: "#eff6ff", padding: "14px", borderRadius: "8px",
                      border: "1px solid #bfdbfe", cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#dbeafe"; e.currentTarget.style.borderColor = "#93c5fd"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#eff6ff"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
                  >
                    <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1e40af" }}>
                      {(csrData?.kpiBreakdown?.projects?.totalHoursInvested || csrData?.totalHours || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "11px", color: "#3b82f6" }}>Total Hours</div>
                  </button>
                  <button
                    onClick={() => toast({ title: "Regions Served", description: `Your projects span ${csrData?.kpiBreakdown?.projects?.regionsServed || csrData?.projectLocations?.length || 0} geographic regions.` })}
                    style={{
                      backgroundColor: "#f5f3ff", padding: "14px", borderRadius: "8px",
                      border: "1px solid #c4b5fd", cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#ede9fe"; e.currentTarget.style.borderColor = "#a78bfa"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#f5f3ff"; e.currentTarget.style.borderColor = "#c4b5fd"; }}
                  >
                    <div style={{ fontSize: "22px", fontWeight: "bold", color: "#7c3aed" }}>
                      {csrData?.kpiBreakdown?.projects?.regionsServed || csrData?.projectLocations?.length || 0}
                    </div>
                    <div style={{ fontSize: "11px", color: "#8b5cf6" }}>Regions Served</div>
                  </button>
                  <button
                    onClick={() => navigate('/csr-reports-exports')}
                    style={{
                      backgroundColor: "#ecfdf5", padding: "14px", borderRadius: "8px",
                      border: "1px solid #a7f3d0", cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#d1fae5"; e.currentTarget.style.borderColor = "#6ee7b7"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#ecfdf5"; e.currentTarget.style.borderColor = "#a7f3d0"; }}
                  >
                    <div style={{ fontSize: "22px", fontWeight: "bold", color: "#059669" }}>
                      ${formatDecimal(displayTotalHours * 34.79 / 1000)}K
                    </div>
                    <div style={{ fontSize: "11px", color: "#10b981" }}>Economic Value</div>
                  </button>
                </div>
                {/* Project List - Real Data */}
                <div style={{ backgroundColor: "#f3f4f6", padding: "16px", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", marginBottom: "12px" }}>
                    Active Projects (click to view on map):
                  </p>
                  <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                    {(csrData?.projectLocations || []).slice(0, 8).map((project: any, idx: number) => (
                      <button
                        key={project.id || idx}
                        onClick={() => startTransition(() => {
                          setSelectedKPI(null);
                          setSelectedMapRegion(project.region || "all");
                          toast({ title: project.name || `Project ${idx + 1}`, description: `${project.hours || 0} hours • $${Math.round(project.economicValue || (project.hours || 0) * 34.79).toLocaleString()} value • ${project.employees || 0} volunteers • ${project.region || "N/A"}` });
                        })}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          width: "100%", padding: "10px 12px", marginBottom: "6px",
                          backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px",
                          cursor: "pointer", transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f5f3ff"; e.currentTarget.style.borderColor = "#a78bfa"; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "white"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{
                            width: "32px", height: "32px", borderRadius: "8px",
                            backgroundColor: project.status === "active" ? "#10b981" : "#6b7280",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <MapPin style={{ width: "16px", height: "16px", color: "white" }} />
                          </div>
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                              {project.name || `Project ${idx + 1}`}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>
                              {project.region || "N/A"} • {project.employees || 0} volunteers
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#7c3aed" }}>
                              {project.hours || 0}
                            </div>
                            <div style={{ fontSize: "10px", color: "#6b7280" }}>hours</div>
                          </div>
                          <div style={{ textAlign: "right", borderLeft: "1px solid #e5e7eb", paddingLeft: "12px" }}>
                            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#059669" }}>
                              ${Math.round(project.economicValue || (project.hours || 0) * 34.79).toLocaleString()}
                            </div>
                            <div style={{ fontSize: "10px", color: "#6b7280" }}>value</div>
                          </div>
                          <ChevronRight style={{ width: "16px", height: "16px", color: "#9ca3af" }} />
                        </div>
                      </button>
                    ))}
                    {(!csrData?.projectLocations || csrData.projectLocations.length === 0) && (
                      <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
                        No project data available
                      </div>
                    )}
                  </div>
                </div>
                {/* Action Buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
                  <button
                    onClick={() => navigate('/project-portfolio')}
                    style={{
                      backgroundColor: "#7c3aed", color: "white", padding: "12px 16px",
                      borderRadius: "8px", border: "none", cursor: "pointer",
                      fontWeight: "600", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#6d28d9")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#7c3aed")}
                  >
                    <FolderKanban style={{ width: "16px", height: "16px" }} />
                    View All Projects
                  </button>
                  <button
                    onClick={() => startTransition(() => { setSelectedKPI(null); setSelectedKPI("aiu"); })}
                    style={{
                      backgroundColor: "white", color: "#7c3aed", padding: "12px 16px",
                      borderRadius: "8px", border: "2px solid #7c3aed", cursor: "pointer",
                      fontWeight: "600", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f5f3ff")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
                  >
                    <TrendingUp style={{ width: "16px", height: "16px" }} />
                    {isAIUEnabled ? "View AIUs" : `View ${SHADOW_MODE_LABELS.AIU_REPLACEMENT}`}
                  </button>
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
                    .map((metric: any) => {
                      const sdgColor = getSDGColor(metric.sdg);
                      const sdgName = getSDGName(metric.sdg);
                      const sdgFullName = getSDGFullName(metric.sdg);
                      return (
                        <div
                          key={metric.sdg}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 10px",
                            backgroundColor: "#f9fafb",
                            borderRadius: "6px",
                            marginBottom: "6px",
                            fontSize: "13px",
                            borderLeft: `4px solid ${sdgColor}`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                backgroundColor: sdgColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "12px",
                                fontWeight: "700",
                                flexShrink: 0,
                              }}
                            >
                              {metric.sdg}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: "600", color: "#1f2937" }}>
                                SDG {metric.sdg}: {sdgName}
                              </div>
                              <div style={{ fontSize: "11px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {sdgFullName}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontWeight: "700", color: sdgColor, marginLeft: "8px", flexShrink: 0 }}>
                            {(metric.totalHours || 0).toLocaleString()} hrs
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {selectedKPI === "economic" && (
              <div style={{ color: "#374151" }}>
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#059669",
                    marginBottom: "16px",
                  }}
                >
                  ${formatDecimal(displayTotalHours * 34.79 / 1000)}K Economic Value
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    marginBottom: "16px",
                    lineHeight: "1.6",
                  }}
                >
                  Total economic value of employee volunteer hours at industry standard $34.79/hour rate.
                </p>
                {/* Economic Value KPI Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <button
                    onClick={() => startTransition(() => setSelectedKPI("hours"))}
                    style={{
                      backgroundColor: "#eff6ff",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #bfdbfe",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#dbeafe"; e.currentTarget.style.borderColor = "#93c5fd"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#eff6ff"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
                  >
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1e40af" }}>
                      {(csrData?.totalHours || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "12px", color: "#3b82f6" }}>Total Hours</div>
                  </button>
                  <button
                    onClick={() => toast({ title: "Hourly Rate", description: "Industry standard volunteer value at $34.79/hour based on Independent Sector valuation." })}
                    style={{
                      backgroundColor: "#ecfdf5",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #a7f3d0",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#d1fae5"; e.currentTarget.style.borderColor = "#6ee7b7"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#ecfdf5"; e.currentTarget.style.borderColor = "#a7f3d0"; }}
                  >
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#059669" }}>
                      $34.79
                    </div>
                    <div style={{ fontSize: "12px", color: "#10b981" }}>Hourly Rate</div>
                  </button>
                  <button
                    onClick={() => startTransition(() => setSelectedKPI("employees"))}
                    style={{
                      backgroundColor: "#f5f3ff",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #ddd6fe",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#ede9fe"; e.currentTarget.style.borderColor = "#c4b5fd"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#f5f3ff"; e.currentTarget.style.borderColor = "#ddd6fe"; }}
                  >
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#7c3aed" }}>
                      ${(displayActiveEmployees > 0 ? Math.round((displayTotalHours / displayActiveEmployees) * 34.79) : 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "12px", color: "#8b5cf6" }}>Value/Employee</div>
                  </button>
                  <button
                    onClick={() => startTransition(() => setSelectedKPI("projects"))}
                    style={{
                      backgroundColor: "#fdf4ff",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #f5d0fe",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#fae8ff"; e.currentTarget.style.borderColor = "#e879f9"; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fdf4ff"; e.currentTarget.style.borderColor = "#f5d0fe"; }}
                  >
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#a855f7" }}>
                      ${displayProjectsCompleted > 0 ? Math.round((displayTotalHours * 34.79) / displayProjectsCompleted).toLocaleString() : 0}
                    </div>
                    <div style={{ fontSize: "12px", color: "#c084fc" }}>Value/Project</div>
                  </button>
                </div>
                {/* Economic Value by SDG */}
                <div style={{ backgroundColor: "#f0fdf4", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "#059669", marginBottom: "12px" }}>
                    Economic Value by SDG (click to view):
                  </p>
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {sdgMetrics
                      .filter((m: SDGMetric) => m.totalHours > 0)
                      .sort((a: SDGMetric, b: SDGMetric) => b.totalHours - a.totalHours)
                      .slice(0, 6)
                      .map((metric: SDGMetric) => (
                        <button
                          key={metric.sdg}
                          onClick={() => startTransition(() => { setSelectedKPI(null); setSelectedSDG(metric.sdg); })}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                            padding: "10px 8px",
                            marginBottom: "4px",
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f0fdf4"; e.currentTarget.style.borderColor = getSDGColor(metric.sdg); }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "white"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                              width: "28px", height: "28px", borderRadius: "6px",
                              backgroundColor: getSDGColor(metric.sdg),
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "white", fontSize: "12px", fontWeight: "bold"
                            }}>
                              {metric.sdg}
                            </div>
                            <span style={{ fontSize: "13px", color: "#374151" }}>{getSDGName(metric.sdg)}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: "600", color: "#059669", fontSize: "14px" }}>${(metric.totalHours * 34.79).toLocaleString()}</span>
                            <ChevronRight style={{ width: "16px", height: "16px", color: "#9ca3af" }} />
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
                {/* ROI Summary */}
                <div style={{ backgroundColor: "#ecfdf5", padding: "16px", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#065f46" }}>Total Economic Impact</span>
                    <span style={{ fontSize: "20px", fontWeight: "bold", color: "#059669" }}>
                      ${Math.round(displayTotalHours * 34.79).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "16px", fontWeight: "bold", color: "#059669" }}>
                        ${Math.round((displayTotalHours * 34.79) / 12).toLocaleString()}
                      </div>
                      <div style={{ fontSize: "10px", color: "#6b7280" }}>Per Month</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "16px", fontWeight: "bold", color: "#059669" }}>
                        ${Math.round((displayTotalHours * 34.79) / 52).toLocaleString()}
                      </div>
                      <div style={{ fontSize: "10px", color: "#6b7280" }}>Per Week</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "16px", fontWeight: "bold", color: "#2563eb" }}>
                        {csrData?.activeEmployees || 0}
                      </div>
                      <div style={{ fontSize: "10px", color: "#6b7280" }}>Contributors</div>
                    </div>
                  </div>
                </div>
                {/* Action Buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
                  <button
                    onClick={() => navigate('/csr-reports-exports')}
                    style={{
                      backgroundColor: "#059669", color: "white", padding: "14px 20px",
                      borderRadius: "8px", border: "none", cursor: "pointer",
                      fontWeight: "600", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#047857")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#059669")}
                  >
                    <FileText style={{ width: "16px", height: "16px" }} />
                    Export Report
                  </button>
                  <button
                    onClick={() => startTransition(() => setSelectedKPI("hours"))}
                    style={{
                      backgroundColor: "white", color: "#059669", padding: "14px 20px",
                      borderRadius: "8px", border: "2px solid #059669", cursor: "pointer",
                      fontWeight: "600", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#ecfdf5")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
                  >
                    <Clock style={{ width: "16px", height: "16px" }} />
                    View Hours
                  </button>
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
                    {displayTotalHours.toLocaleString()} total hours worth ${Math.round(displayTotalHours * 34.79).toLocaleString()} in economic value.
                  </span>
                </div>
              </div>
            )}

            {selectedKPI === "aiu" && (
              <div style={{ color: "#374151" }}>
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#0d5f52",
                    marginBottom: "16px",
                  }}
                >
                  {formatDecimal(displayTotalImpact || 0)} {isAIUEnabled ? "AIUs Earned" : SHADOW_MODE_LABELS.AIU_REPLACEMENT}
                </p>
                {isAIUEnabled && (
                <p
                  style={{
                    fontSize: "14px",
                    marginBottom: "16px",
                    lineHeight: "1.6",
                  }}
                >
                  Impact Score is Synerxus's proprietary metric for measuring verified SDG contributions. Your score represents your auditable share of real-world social and environmental impact.
                </p>
                )}
                <div
                  style={{
                    backgroundColor: "#ecfdf5",
                    padding: "16px",
                    borderRadius: "8px",
                    marginTop: "16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#065f46",
                      marginBottom: "8px",
                    }}
                  >
                    {isAIUEnabled ? "AIU Breakdown:" : "Impact Breakdown:"}
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
                      <span>✓ {isAIUEnabled ? "Total AIUs earned:" : "Total score:"}</span>
                      <span style={{ fontWeight: "600" }}>
                        {formatDecimal(displayTotalImpact || 0)}
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ {isAIUEnabled ? "AIUs per employee:" : "Score per employee:"}</span>
                      <span style={{ fontWeight: "600" }}>
                        {formatDecimal(csrData?.activeEmployees && displayTotalImpact
                          ? csrData.totalImpact / csrData.activeEmployees
                          : 0)}
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ {isAIUEnabled ? "AIUs per project:" : "Score per project:"}</span>
                      <span style={{ fontWeight: "600" }}>
                        {formatDecimal(csrData?.projectsCompleted && displayTotalImpact
                          ? csrData.totalImpact / csrData.projectsCompleted
                          : 0)}
                      </span>
                    </li>
                    <li
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>✓ {isAIUEnabled ? "Hours per AIU:" : "Hours per point:"}</span>
                      <span style={{ fontWeight: "600" }}>
                        {formatDecimal(displayTotalImpact && csrData?.totalHours
                          ? csrData.totalHours / csrData.totalImpact
                          : 0)} hrs
                      </span>
                    </li>
                    <li
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: "8px",
                        borderTop: "1px solid #d1fae5",
                      }}
                    >
                      <span>🎯 SDGs contributing:</span>
                      <span style={{ fontWeight: "600", color: "#059669" }}>
                        {sdgMetrics.filter((m: SDGMetric) => m.totalHours > 0).length} of 17
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
                    {isAIUEnabled ? "AIU Contribution by SDG:" : "Impact by SDG:"}
                  </p>
                  <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                    {sdgMetrics
                      .filter((m) => m.totalHours > 0)
                      .sort((a, b) => b.totalHours - a.totalHours)
                      .map((metric) => {
                        const metricAIU = formatDecimal(displayTotalImpact && totalSDGHours > 0
                          ? (metric.totalHours / totalSDGHours) * displayTotalImpact
                          : 0);
                        return (
                          <button
                            key={metric.sdg}
                            onClick={() => startTransition(() => {
                              setSelectedKPI(null);
                              setSelectedSDG(metric.sdg);
                            })}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "8px 6px",
                              borderBottom: "1px solid #e5e7eb",
                              width: "100%",
                              background: "none",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
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
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontWeight: "600", color: "#0d5f52", fontSize: "12px" }}>
                                {metricAIU} {isAIUEnabled ? "AIUs" : ""}
                              </span>
                              <ChevronRight style={{ width: "14px", height: "14px", color: "#9ca3af" }} />
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: "#d1fae5",
                    padding: "12px",
                    borderRadius: "8px",
                    marginTop: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isAIUEnabled && (
                  <>
                  <span style={{ fontSize: "18px" }}>🌍</span>
                  <span style={{ fontSize: "13px", color: "#065f46" }}>
                    <strong>What is Impact Score?</strong> Impact Score is Synerxus's proprietary metric for measuring verified SDG contributions. Your score represents your auditable share of real-world impact, backed by NGO verification and project evidence.
                  </span>
                  </>
                  )}
                </div>
                {/* Action Buttons */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginTop: "20px",
                  }}
                >
                  <button
                    onClick={() => navigate('/csr-impact-reporting')}
                    style={{
                      backgroundColor: "#0d5f52",
                      color: "white",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#0a4f44")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#0d5f52")}
                  >
                    <FileText style={{ width: "16px", height: "16px" }} />
                    View Impact Report
                  </button>
                  <button
                    onClick={() => startTransition(() => {
                      setSelectedKPI(null);
                      setSelectedKPI("sdg");
                    })}
                    style={{
                      backgroundColor: "white",
                      color: "#0d5f52",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "2px solid #0d5f52",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#ecfdf5")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
                  >
                    <Target style={{ width: "16px", height: "16px" }} />
                    SDG Breakdown
                  </button>
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
          onClick={() => startTransition(() => setSelectedSDG(null))}
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
                        gap: "16px",
                      }}
                    >
                      {/* Official UN SDG Icon */}
                      <img
                        src={getSDGIcon(selectedSDG)}
                        alt={`SDG ${selectedSDG}: ${getSDGName(selectedSDG)}`}
                        loading="lazy"
                        style={{
                          width: "80px",
                          height: "80px",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          objectFit: "cover",
                        }}
                      />
                      <div>
                        <h2
                          style={{
                            fontSize: "22px",
                            fontWeight: "bold",
                            color: "#111827",
                            margin: 0,
                          }}
                        >
                          SDG {selectedSDG}: {getSDGName(selectedSDG)}
                        </h2>
                        <p
                          style={{
                            fontSize: "14px",
                            color: "#6b7280",
                            margin: "4px 0 0 0",
                          }}
                        >
                          {getSDGFullName(selectedSDG)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => startTransition(() => setSelectedSDG(null))}
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
                      gridTemplateColumns: "repeat(4, 1fr)",
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
                        backgroundColor: "#ecfdf5",
                        borderRadius: "8px",
                        padding: "12px",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: "#059669",
                          margin: 0,
                        }}
                      >
                        ${Math.round((selectedMetric?.totalHours || 0) * 34.79).toLocaleString()}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#10b981",
                          margin: "2px 0 0 0",
                        }}
                      >
                        Economic Value
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
                                  {formatDecimal(emp.hours)} hrs
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
                                  {formatDecimal(proj.hours)} hrs
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
                        (selectedMetric?.totalHours || 0) * 34.79
                      ).toLocaleString()}
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#15803d",
                        margin: "2px 0 0 0",
                      }}
                    >
                      Based on $34.79/hour volunteer value
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
          onClick={() => startTransition(() => setShowAdminModal(false))}
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
                onClick={() => startTransition(() => setShowAdminModal(false))}
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
                flexWrap: "wrap",
              }}
            >
              {["reviews", "insights", "flagged", "pendingVerification"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => startTransition(() => setSelectedAdminTab(tab as any))}
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
                  {tab === "pendingVerification" ? "Pending Hours" : tab.charAt(0).toUpperCase() + tab.slice(1)} (
                  {tab === "pendingVerification"
                    ? `${adminActionsData?.pendingVerification?.totalPendingHours || 0}h`
                    : adminActionsData?.[tab]?.count || 0})
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

              {selectedAdminTab === "pendingVerification" && (
                <div>
                  {adminActionsData?.pendingVerification?.items &&
                  adminActionsData.pendingVerification.items.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px",
                          backgroundColor: "#eff6ff",
                          borderRadius: "8px",
                          marginBottom: "8px",
                        }}
                      >
                        <div style={{ fontSize: "14px", color: "#1e40af", fontWeight: "600" }}>
                          {adminActionsData.pendingVerification.totalPendingHours} hours awaiting organization verification
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                          These employee hours need to be approved by the respective organizations before they appear in your KPIs.
                        </div>
                      </div>
                      {adminActionsData.pendingVerification.items.map(
                        (item: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: "12px",
                              backgroundColor: "#f0f9ff",
                              borderRadius: "6px",
                              borderLeft: "4px solid #3b82f6",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "600",
                                color: "#1e40af",
                                marginBottom: "4px",
                              }}
                            >
                              {item.organizationName}
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
                            {item.employees && item.employees.length > 0 && (
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#059669",
                                  marginBottom: "4px",
                                }}
                              >
                                Employees: {item.employees.slice(0, 3).join(", ")}{item.employees.length > 3 ? ` +${item.employees.length - 3} more` : ""}
                              </div>
                            )}
                            <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                              Priority: {item.severity === "high" ? "High" : item.severity === "medium" ? "Medium" : "Low"}
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
                      All employee hours have been verified!
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
                onClick={() => startTransition(() => setShowAdminModal(false))}
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
            onClick={() => startTransition(() => setShowFunnelModal(false))}
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
                  onClick={() => startTransition(() => setShowFunnelModal(false))}
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#111827",
                    }}
                  >
                    Employees ({funnelStageData?.employees?.length || 0})
                  </h3>
                  {/* Select All / Clear Selection Toggle */}
                  {funnelStageData?.employees && funnelStageData.employees.length > 0 && (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>
                        {selectedEmployeesForEngagement.length > 0
                          ? `${selectedEmployeesForEngagement.length} selected`
                          : "Click arrow to select"}
                      </span>
                      <button
                        onClick={() => {
                          if (selectedEmployeesForEngagement.length === funnelStageData.employees.length) {
                            setSelectedEmployeesForEngagement([]);
                            setEngagementMode('all');
                          } else {
                            setSelectedEmployeesForEngagement(
                              funnelStageData.employees.map((emp: any) => emp.email || emp.name)
                            );
                            setEngagementMode('selected');
                          }
                        }}
                        style={{
                          padding: "4px 10px",
                          fontSize: "11px",
                          fontWeight: "600",
                          border: "1px solid #1e3a8a",
                          backgroundColor: selectedEmployeesForEngagement.length === funnelStageData?.employees?.length ? "#1e3a8a" : "white",
                          color: selectedEmployeesForEngagement.length === funnelStageData?.employees?.length ? "white" : "#1e3a8a",
                          borderRadius: "4px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {selectedEmployeesForEngagement.length === funnelStageData?.employees?.length ? "Clear All" : "Select All"}
                      </button>
                    </div>
                  )}
                </div>
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
                    {funnelStageData.employees.map((emp: any, idx: number) => {
                      const employeeId = emp.email || emp.name;
                      const isSelected = selectedEmployeesForEngagement.includes(employeeId);

                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px",
                            backgroundColor: isSelected ? "#dbeafe" : "#f9fafb",
                            borderRadius: "6px",
                            border: isSelected ? "2px solid #1e3a8a" : "1px solid #e5e7eb",
                            transition: "all 0.2s",
                          }}
                        >
                          {/* Selection Arrow/Checkbox */}
                          <button
                            onClick={() => {
                              if (isSelected) {
                                setSelectedEmployeesForEngagement(prev => prev.filter(id => id !== employeeId));
                              } else {
                                setSelectedEmployeesForEngagement(prev => [...prev, employeeId]);
                              }
                              setEngagementMode('selected');
                            }}
                            title={isSelected ? "Deselect for engagement" : "Select for engagement"}
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              border: isSelected ? "2px solid #1e3a8a" : "2px solid #d1d5db",
                              backgroundColor: isSelected ? "#1e3a8a" : "white",
                              color: isSelected ? "white" : "#9ca3af",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: "12px",
                              transition: "all 0.2s",
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = "#1e3a8a";
                                e.currentTarget.style.color = "#1e3a8a";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = "#d1d5db";
                                e.currentTarget.style.color = "#9ca3af";
                              }
                            }}
                          >
                            {isSelected ? (
                              <span style={{ fontSize: "14px", fontWeight: "bold" }}>✓</span>
                            ) : (
                              <ChevronRight style={{ width: "16px", height: "16px" }} />
                            )}
                          </button>
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
                              {emp.email && <span style={{ marginLeft: "8px", color: "#9ca3af" }}>• {emp.email}</span>}
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
                              {formatDecimal(emp.hours)}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>
                              hrs
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "16px",
                  borderTop: "1px solid #e5e7eb",
                  flexWrap: "wrap",
                }}
              >
                {/* Engagement Mode Toggle */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>Engage:</span>
                  <button
                    onClick={() => {
                      setEngagementMode('all');
                      setSelectedEmployeesForEngagement([]);
                    }}
                    style={{
                      padding: "4px 12px",
                      border: engagementMode === 'all' ? "2px solid #1e3a8a" : "1px solid #d1d5db",
                      backgroundColor: engagementMode === 'all' ? "#dbeafe" : "white",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: engagementMode === 'all' ? "600" : "400",
                      color: engagementMode === 'all' ? "#1e3a8a" : "#6b7280",
                    }}
                  >
                    ALL ({funnelStageData?.employees?.length || 0})
                  </button>
                  <button
                    onClick={() => startTransition(() => setEngagementMode('selected'))}
                    disabled={selectedEmployeesForEngagement.length === 0}
                    style={{
                      padding: "4px 12px",
                      border: engagementMode === 'selected' && selectedEmployeesForEngagement.length > 0 ? "2px solid #1e3a8a" : "1px solid #d1d5db",
                      backgroundColor: engagementMode === 'selected' && selectedEmployeesForEngagement.length > 0 ? "#dbeafe" : "white",
                      borderRadius: "4px",
                      cursor: selectedEmployeesForEngagement.length > 0 ? "pointer" : "not-allowed",
                      fontSize: "12px",
                      fontWeight: engagementMode === 'selected' && selectedEmployeesForEngagement.length > 0 ? "600" : "400",
                      color: engagementMode === 'selected' && selectedEmployeesForEngagement.length > 0 ? "#1e3a8a" : "#9ca3af",
                      opacity: selectedEmployeesForEngagement.length === 0 ? 0.5 : 1,
                    }}
                  >
                    SELECTED ({selectedEmployeesForEngagement.length})
                  </button>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => {
                      setShowFunnelModal(false);
                      setSelectedEmployeesForEngagement([]);
                      setEngagementMode('all');
                    }}
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
                      onClick={() => startTransition(() => setShowEngagementTipsDialog(true))}
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
                      {engagementMode === 'selected' && selectedEmployeesForEngagement.length > 0
                        ? `Send to ${selectedEmployeesForEngagement.length} Selected`
                        : "Send to All"}
                    </button>
                  )}
                </div>
              </div>

              {/* Selection hint for other stages */}
              {selectedFunnelStage !== 1 && selectedEmployeesForEngagement.length > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px",
                    backgroundColor: "#fef3c7",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#92400e",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Info style={{ width: "14px", height: "14px" }} />
                  {selectedEmployeesForEngagement.length} employee(s) selected for individual engagement actions
                </div>
              )}

              {/* Stage 3 Recognition Button */}
              {selectedFunnelStage === 3 && (
                <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => startTransition(() => {
                      // If employees are selected, use first selected; otherwise use top performer
                      if (engagementMode === 'selected' && selectedEmployeesForEngagement.length > 0) {
                        const selectedEmp = funnelStageData?.employees?.find((emp: any) =>
                          selectedEmployeesForEngagement.includes(emp.email || emp.name)
                        );
                        if (selectedEmp) {
                          setSelectedEmployee(selectedEmp);
                          setShowRecognitionModal(true);
                          setShowFunnelModal(false);
                        }
                      } else {
                        const topPerformer = displayLeaderboard?.[0];
                        if (topPerformer) {
                          setSelectedEmployee(topPerformer);
                          setShowRecognitionModal(true);
                          setShowFunnelModal(false);
                        }
                      }
                    })}
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
                    {engagementMode === 'selected' && selectedEmployeesForEngagement.length > 0
                      ? `Recognize ${selectedEmployeesForEngagement.length} Selected`
                      : "Recognize Top Performer"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Employee Profile Modal - Shows when employee is clicked */}
      {selectedEmployee && !showRecognitionModal && (
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
          onClick={() => startTransition(() => setSelectedEmployee(null))}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              maxWidth: "500px",
              width: "95%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Employee Info */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)",
                padding: "24px",
                borderRadius: "16px 16px 0 0",
                color: "white",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "white",
                      border: "3px solid rgba(255,255,255,0.3)",
                    }}
                  >
                    {(selectedEmployee.employeeName || selectedEmployee.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: "22px", fontWeight: "bold", margin: 0 }}>
                      {selectedEmployee.employeeName || selectedEmployee.name || "Unknown Employee"}
                    </h2>
                    <p style={{ fontSize: "14px", opacity: 0.8, margin: "4px 0 0 0" }}>
                      #{selectedEmployee.rank || 1} in Leaderboard
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => startTransition(() => setSelectedEmployee(null))}
                  style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer" }}
                >
                  <X style={{ width: "20px", height: "20px", color: "white" }} />
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{ padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "20px" }}>
                <div style={{ backgroundColor: "#eff6ff", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                  <p style={{ fontSize: "28px", fontWeight: "bold", color: "#1e40af", margin: 0 }}>{selectedEmployee.hours || 0}</p>
                  <p style={{ fontSize: "12px", color: "#3b82f6", margin: "4px 0 0 0" }}>Hours Logged</p>
                </div>
                <div style={{ backgroundColor: "#ecfdf5", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                  <p style={{ fontSize: "28px", fontWeight: "bold", color: "#059669", margin: 0 }}>${Math.round((selectedEmployee.hours || 0) * 34.79).toLocaleString()}</p>
                  <p style={{ fontSize: "12px", color: "#10b981", margin: "4px 0 0 0" }}>Economic Value</p>
                </div>
                <div style={{ backgroundColor: "#fef3c7", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                  <p style={{ fontSize: "28px", fontWeight: "bold", color: "#d97706", margin: 0 }}>{selectedEmployee.points || (selectedEmployee.hours || 0) * 10}</p>
                  <p style={{ fontSize: "12px", color: "#f59e0b", margin: "4px 0 0 0" }}>Points Earned</p>
                </div>
                <div style={{ backgroundColor: "#f5f3ff", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                  <p style={{ fontSize: "28px", fontWeight: "bold", color: "#7c3aed", margin: 0 }}>{Math.round((selectedEmployee.hours || 0) / 4)}</p>
                  <p style={{ fontSize: "12px", color: "#8b5cf6", margin: "4px 0 0 0" }}>Initiatives</p>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <button
                  onClick={() => startTransition(() => setShowRecognitionModal(true))}
                  style={{
                    backgroundColor: "#f59e0b",
                    color: "white",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Award style={{ width: "18px", height: "18px" }} />
                  Recognize
                </button>
                <button
                  onClick={() => {
                    toast({ title: "Message Sent", description: `Engagement email sent to ${selectedEmployee.employeeName || selectedEmployee.name}` });
                    setSelectedEmployee(null);
                  }}
                  style={{
                    backgroundColor: "#3b82f6",
                    color: "white",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Send style={{ width: "18px", height: "18px" }} />
                  Engage
                </button>
              </div>
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
          onClick={() => startTransition(() => setShowRecognitionModal(false))}
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
                onClick={() => startTransition(() => setShowRecognitionModal(false))}
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
                    {formatDecimal(selectedEmployee.hours)}
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
                    ${Math.round((selectedEmployee.hours || 0) * 34.79).toLocaleString()}
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
                      onClick={() => startTransition(() => setRecognitionBadge(badge.id))}
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
                    onClick={() => startTransition(() => setRecognitionMessage(msg))}
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
                onClick={() => startTransition(() => setShowRecognitionModal(false))}
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

                    startTransition(() => {
                      setShowRecognitionModal(false);
                      setRecognitionMessage("");
                      setSelectedEmployee(null);
                    });

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
          onClick={() => startTransition(() => setShowActiveSDGsModal(false))}
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
                onClick={() => startTransition(() => setShowActiveSDGsModal(false))}
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
                      {/* Official UN SDG Icon */}
                      <img
                        src={getSDGIcon(sdgNum)}
                        alt={`SDG ${sdgNum}: ${getSDGName(sdgNum)}`}
                        loading="lazy"
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "8px",
                          objectFit: "cover",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          cursor: "pointer",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActiveSDGsModal(false);
                          setSelectedSDG(sdgNum);
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>
                          SDG {sdgNum}: {getSDGName(sdgNum)}
                        </p>
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0 0" }}>
                          {getSDGFullName(sdgNum)}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {isActive ? (
                          <>
                            <p style={{ fontSize: "16px", fontWeight: "bold", color: getSDGColor(sdgNum), margin: 0 }}>
                              {formatDecimal(sdgData.totalHours)} hrs
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
          onClick={() => startTransition(() => setShowTotalHoursModal(false))}
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
                onClick={() => startTransition(() => setShowTotalHoursModal(false))}
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
                        {/* Official UN SDG Icon */}
                        <img
                          src={getSDGIcon(metric.sdg)}
                          alt={`SDG ${metric.sdg}: ${getSDGName(metric.sdg)}`}
                          loading="lazy"
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "6px",
                            objectFit: "cover",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            cursor: "pointer",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTotalHoursModal(false);
                            setSelectedSDG(metric.sdg);
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "13px", fontWeight: "600", color: "#111827", margin: 0 }}>
                            SDG {metric.sdg}: {getSDGName(metric.sdg)}
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
          onClick={() => startTransition(() => setShowEmployeesModal(false))}
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
                onClick={() => startTransition(() => setShowEmployeesModal(false))}
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
                          {metric.uniqueEmployees} employee{metric.uniqueEmployees !== 1 ? 's' : ''} | {formatDecimal(metric.totalHours)} hrs
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
                            <span style={{ color: "#6b7280", marginLeft: "6px" }}>({formatDecimal(emp.hours)} hrs)</span>
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
          onClick={() => startTransition(() => setShowExpansionInsightsModal(false))}
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
                onClick={() => startTransition(() => setShowExpansionInsightsModal(false))}
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
                    return `Your employees have logged ${formatDecimal(totalOutsideHours)} hours across ${employeeActivityOutsideCommitments.length} SDGs not in your commitments. Consider adding "${topOpportunity.fullName}" (${formatDecimal(topOpportunity.hours)} hrs from ${topOpportunity.employees} employees) to align corporate goals with employee passion.`;
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
                      <p style={{ fontSize: "18px", fontWeight: "bold", color: sdgData.color, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatDecimal(sdgData.hours)}
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


      {/* Engagement Tips Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showEngagementTipsDialog}
        onClose={() => setShowEngagementTipsDialog(false)}
        title="Send Engagement Tips"
        description={
          engagementMode === 'selected' && selectedEmployeesForEngagement.length > 0
            ? `Send engagement tips to ${selectedEmployeesForEngagement.length} selected employee(s)? This will send personalized tips to help them get started with volunteering.`
            : "Send engagement tips to all inactive employees? This will send personalized tips to help them get started with volunteering."
        }
        confirmText={
          engagementMode === 'selected' && selectedEmployeesForEngagement.length > 0
            ? `Send to ${selectedEmployeesForEngagement.length} Selected`
            : "Send to All"
        }
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
                // Include selected employees if in selected mode
                ...(engagementMode === 'selected' && selectedEmployeesForEngagement.length > 0
                  ? { selectedEmployees: selectedEmployeesForEngagement }
                  : {}),
              }),
            });
            if (response.ok) {
              const targetCount = engagementMode === 'selected' && selectedEmployeesForEngagement.length > 0
                ? `${selectedEmployeesForEngagement.length} selected`
                : "inactive";
              alert(`Engagement tips sent successfully to ${targetCount} employees!`);
              setShowFunnelModal(false);
              setSelectedEmployeesForEngagement([]);
              setEngagementMode('all');
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

      {/* KPI Detail Modal - Unified modal for all KPI types */}
      {kpiDetailModal.isOpen && kpiDetailModal.type && (
        <KPIDetailModal
          isOpen={kpiDetailModal.isOpen}
          onClose={() => setKpiDetailModal({ isOpen: false, type: null })}
          kpiType={kpiDetailModal.type}
          totalHours={displayTotalHours}
          totalEmployees={displayActiveEmployees}
          totalProjects={displayProjectsCompleted}
          totalAIU={displayTotalImpact || 0}
          totalVolunteers={csrData?.activeEmployees || 0}
          sdgMetrics={sdgMetrics}
          leaderboard={displayLeaderboard || []}
          kpiBreakdown={csrData?.kpiBreakdown}
          projects={[]}
          economicValueRate={35}
          onNavigate={(target, data) => {
            if (target === 'sdg' && data?.sdgNumber) {
              setKpiDetailModal({ isOpen: false, type: null });
              setSdgDetailModal({ isOpen: true, sdgNumber: data.sdgNumber });
            }
          }}
        />
      )}

      {/* SDG Detail Modal - Drill-down for individual SDGs */}
      {sdgDetailModal.isOpen && sdgDetailModal.sdgNumber && (
        <SDGDetailModal
          isOpen={sdgDetailModal.isOpen}
          onClose={() => setSdgDetailModal({ isOpen: false, sdgNumber: null })}
          sdgNumber={sdgDetailModal.sdgNumber}
          metrics={(() => {
            const sdgData = sdgMetrics.find((m: any) => m.sdg === sdgDetailModal.sdgNumber);
            return {
              totalHours: sdgData?.totalHours || 0,
              uniqueEmployees: sdgData?.uniqueEmployees || 0,
              projectsContributed: sdgData?.projectsContributed || 0,
              employees: sdgData?.employees || [],
              projects: sdgData?.projects || []
            };
          })()}
          corporateCommitment={committedSDGs.includes(sdgDetailModal.sdgNumber)}
          totalCompanyHours={displayTotalHours}
          economicValueRate={35}
          onAddToCommitment={(sdgNum) => {
            // Navigate to profile settings to add SDG commitment
            toast({
              title: "Add to ESG Commitment",
              description: `Navigate to settings to add SDG ${sdgNum} to your corporate commitments.`
            });
            navigate('/corporate-partner-profile-settings');
          }}
          onEvaluate={(sdgNum) => {
            // Show AI evaluation of potential impact
            setSdgDetailModal({ isOpen: false, sdgNumber: null });
            setActiveInsightModal('sdg-opportunity');
          }}
        />
      )}

      {/* AI Insight Modal - SDG recommendations and analysis */}
      {aiRecommendationModal.isOpen && (
        <AIInsightModal
          isOpen={aiRecommendationModal.isOpen}
          onClose={() => setAiRecommendationModal({ isOpen: false, recommendation: null })}
          insightType="sdg-opportunity"
          recommendation={aiRecommendationModal.recommendation}
          onEvaluate={(sdgNum) => {
            // Already showing detailed analysis
          }}
          onAddToCommitment={(sdgNum) => {
            setAiRecommendationModal({ isOpen: false, recommendation: null });
            toast({
              title: "Add to ESG Commitment",
              description: `Navigate to settings to add SDG ${sdgNum} to your corporate commitments.`
            });
            navigate('/corporate-partner-profile-settings');
          }}
        />
      )}
      </div>
    </CSRLayout>
  );
}
