import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Home,
  Target,
  Briefcase,
  Users,
  Clock,
  TrendingUp,
  MapPin,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
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
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileBarChart,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSDGName, getSDGColor } from "@shared/sdg-goals";
import { useToast } from "@/hooks/use-toast";
import { formatDecimal } from "@/lib/format-utils";
import { useViewportDetection } from "@/hooks/use-mobile";
import OrganizationPWAHeader from "@/components/layout/organization-pwa-header";
import PWAPageGuard, { PWALoadingSkeleton } from "@/components/layout/pwa-page-guard";

// Lazy load chart components
const AreaChart = lazy(() => import("recharts").then(m => ({ default: m.AreaChart })));
const BarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));
const LineChart = lazy(() => import("recharts").then(m => ({ default: m.LineChart })));
import { Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, Pie, PieChart } from "recharts";

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
  sdgDistribution: Array<{ goal: number; hours: number; dedicatedHours: number; projects: number; volunteers: number }>;
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

interface OrganizationVolunteer {
  id: number;
  displayName: string;
  email: string;
  avatar: string | null;
  skills: string[];
  hours: number;
  tasksCompleted: number;
  projectCount: number;
  projects: Array<{ id: number; name: string }>;
}

// Geocoding function
function getCoordinatesFromLocation(location: string): { lat: number; lng: number } | null {
  const locationCoords: Record<string, { lat: number; lng: number }> = {
    'zambia': { lat: -13.1939, lng: 27.8493 },
    'kenya': { lat: 0.0236, lng: 37.9062 },
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
  const { isMobile, isLoading: isViewportLoading } = useViewportDetection();
  const userId = localStorage.getItem("currentUserId");
  const userType = localStorage.getItem("userType");

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [refreshing, setRefreshing] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  // Unique key for map instances to prevent "already initialized" error during HMR
  const [mapKey] = useState(() => `map-${Date.now()}`);
  const [showAiuModal, setShowAiuModal] = useState(false);
  const [showImpactRoiModal, setShowImpactRoiModal] = useState(false);
  const [showLivesPerHourModal, setShowLivesPerHourModal] = useState(false);
  const [showAiuDetailsModal, setShowAiuDetailsModal] = useState(false);
  const [showActiveProjectsModal, setShowActiveProjectsModal] = useState(false);
  const [showVolunteerHoursModal, setShowVolunteerHoursModal] = useState(false);
  const [showSdgCoverageModal, setShowSdgCoverageModal] = useState(false);
  const [selectedSdgGoal, setSelectedSdgGoal] = useState<number | null>(null);
  const [sdgViewMode, setSdgViewMode] = useState<'chart' | 'cards'>('cards');
  const [showAllSdgs, setShowAllSdgs] = useState(false);
  const [showVolunteerProfileModal, setShowVolunteerProfileModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<OrganizationVolunteer | null>(null);
  const aiuModalRef = useRef<HTMLDivElement>(null);
  const sdgModalRef = useRef<HTMLDivElement>(null);

  // Redirect to desktop view when not on mobile (after viewport detection completes)
  useEffect(() => {
    if (!isViewportLoading && !isMobile) {
      navigate("/organization-dashboard");
    }
  }, [isViewportLoading, isMobile, navigate]);

  // Redirect non-organization users
  useEffect(() => {
    if (userType && userType !== "organization") {
      navigate("/volunteer-dashboard");
    }
  }, [userType, navigate]);

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  // Fetch pending applications with volunteer and opportunity data
  const { data: pendingApplications } = useQuery({
    queryKey: ['/api/applications', currentUser?.organizationId, 'pending', 'enriched'],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch(`/api/applications?organizationId=${currentUser.organizationId}`);
      if (!response.ok) return [];
      const allApps = await response.json();
      const pendingApps = allApps.filter((app: any) => app.status === 'pending');

      // Enrich with volunteer and opportunity data
      const enrichedApps = await Promise.all(
        pendingApps.map(async (app: any) => {
          try {
            const [volRes, oppRes] = await Promise.all([
              fetch(`/api/users/${app.volunteerId}`),
              fetch(`/api/opportunities/${app.opportunityId}`)
            ]);
            return {
              ...app,
              volunteer: volRes.ok ? await volRes.json() : null,
              opportunity: oppRes.ok ? await oppRes.json() : null
            };
          } catch (err) {
            return app;
          }
        })
      );
      return enrichedApps;
    },
    enabled: !!currentUser?.organizationId,
    staleTime: 30000,
  });

  // Fetch pending approvals (hours + impacts needing verification)
  const { data: pendingApprovals } = useQuery<{
    pendingActivities: any[];
    pendingImpacts: any[];
    totalPending: number;
  }>({
    queryKey: ['/api/pending-approvals', userId],
    queryFn: async () => {
      if (!userId) return { pendingActivities: [], pendingImpacts: [], totalPending: 0 };
      const response = await fetch(`/api/pending-approvals?userId=${userId}`);
      if (!response.ok) return { pendingActivities: [], pendingImpacts: [], totalPending: 0 };
      return response.json();
    },
    enabled: !!userId,
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

  // Fetch organization volunteers
  const { data: organizationVolunteers = [], isLoading: volunteersLoading } = useQuery<OrganizationVolunteer[]>({
    queryKey: ['/api/organizations/volunteers', userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/organizations/${userId}/volunteers?userId=${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  // Fetch volunteer activities for selected volunteer
  const { data: volunteerActivities = [] } = useQuery({
    queryKey: ['/api/volunteer-activities', selectedVolunteer?.id],
    queryFn: async () => {
      if (!selectedVolunteer?.id) return [];
      const response = await fetch(`/api/volunteer-activities?userId=${selectedVolunteer.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedVolunteer?.id,
  });

  // Fetch volunteer AIU data
  const { data: volunteerAiuData } = useQuery({
    queryKey: ['/api/aiu/volunteer', selectedVolunteer?.id],
    queryFn: async () => {
      if (!selectedVolunteer?.id) return null;
      const response = await fetch(`/api/aiu/volunteer/${selectedVolunteer.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!selectedVolunteer?.id,
  });

  // Application review mutation (approve/reject)
  const reviewApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, status, notes }: { applicationId: number; status: 'accepted' | 'rejected'; notes?: string }) => {
      return await apiRequest("POST", `/api/applications/${applicationId}/review`, {
        status,
        notes: notes || '',
        reviewerId: parseInt(userId || '0')
      });
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organization/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations/volunteers'] });
      toast({
        title: "Application Updated",
        description: "The application status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update application",
        variant: "destructive",
      });
    }
  });

  // Derived metrics with real data from API
  const metrics = useMemo(() => {
    // Use actual dashboard data when available
    if (dashboardData?.keyMetrics) {
      const km = dashboardData.keyMetrics;
      return {
        activeProjects: km.activeProjects || 0,
        completedProjects: km.completedProjects || 0,
        totalProjects: km.totalProjects || 0,
        totalHours: km.totalHours || 0,
        sdgsAddressed: km.sdgsAddressed || 0,
        aiuEarned: km.aiuEarned || 0,
        activeVolunteers: km.activeVolunteers || 0,
        livesTouched: km.livesTouched || 0,
        peopleImpacted: km.peopleImpacted || 0,
      };
    }
    // Return zeros when no data - the UI will handle empty states
    return {
      activeProjects: 0, completedProjects: 0, totalProjects: 0, totalHours: 0, sdgsAddressed: 0, aiuEarned: 0, activeVolunteers: 0, livesTouched: 0, peopleImpacted: 0
    };
  }, [dashboardData]);

  // Calculate total AIU with robust fallback
  // Priority: 1. Server aiuEarned (from aiu-service), 2. Sum from projects, 3. Lives-based calculation
  // Organization AIU = SUM of all volunteer AIUs on all projects (org AIU >= any volunteer's AIU)
  const totalAiu = useMemo(() => {
    // First try server-provided AIU (calculated by aiu-service which aggregates all volunteer AIUs)
    if (metrics.aiuEarned && metrics.aiuEarned > 0) return metrics.aiuEarned;

    // Second: sum from projects (each project AIU = sum of volunteer AIUs for that project)
    if (dashboardData?.projects && dashboardData.projects.length > 0) {
      const projectSum = dashboardData.projects.reduce((sum, p) => sum + (p.aiuEarned || 0), 0);
      if (projectSum > 0) return projectSum;
    }

    // Fallback: calculate from lives impacted with higher attribution than volunteers
    // Organizations get 50% attribution (vs 20% for individual volunteers)
    // This ensures org AIU is always >= volunteer AIU for same impact
    const livesImpacted = metrics.livesTouched || metrics.peopleImpacted || 0;
    if (livesImpacted > 0) {
      const attributionFactor = 0.5; // Organizations get 50% attribution (higher than volunteers)
      const sdgMultiplier = Math.min(1 + (metrics.sdgsAddressed * 0.1), 2.0); // Up to 2x for SDG coverage
      const volumeBonus = metrics.totalHours > 0 ? Math.min(1 + (metrics.totalHours / 200), 3.0) : 1.0;
      const baseAiu = livesImpacted * attributionFactor * sdgMultiplier * volumeBonus;
      return Math.round(baseAiu * 100) / 100;
    }

    // Last resort: hours-based (1 AIU per 5 hours with SDG bonus)
    if (metrics.totalHours > 0) {
      const sdgMultiplier = Math.min(1 + (metrics.sdgsAddressed * 0.1), 2.0);
      return Math.round((metrics.totalHours / 5) * sdgMultiplier * 100) / 100;
    }

    return 0;
  }, [metrics.aiuEarned, metrics.totalHours, metrics.sdgsAddressed, metrics.livesTouched, metrics.peopleImpacted, dashboardData?.projects]);

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

  // Enhanced menu structure with categories
  const menuSections = [
    {
      title: "Main",
      items: [
        { icon: Home, label: "Dashboard", desc: "Overview & KPIs", action: () => navigate('/organization-dashboard'), color: "emerald" },
        { icon: FolderOpen, label: "Projects", desc: "Manage initiatives", action: () => navigate('/projects'), badge: metrics.activeProjects, color: "blue" },
        { icon: Bell, label: "Applications", desc: "Review volunteers", action: () => navigate('/applications'), badge: pendingApplications?.length || 0, color: "amber" },
        { icon: MessageCircle, label: "Messages", desc: "Team communication", action: () => navigate('/organization-messages/pwa'), color: "violet" },
      ]
    },
    {
      title: "Analytics & Reports",
      items: [
        { icon: BarChart3, label: "Impact Report", desc: "SDG Impact Report", action: () => navigate('/impact-report'), color: "purple" },
        { icon: Eye, label: "Before & After", desc: "Compare outcomes", action: () => navigate('/impact-visualization'), color: "rose" },
        { icon: Target, label: "SDG Mapping", desc: "UN Goals alignment", action: () => navigate('/sdg-mapping'), color: "teal" },
        { icon: Trophy, label: "Leaderboard", desc: "Top performers", action: () => navigate('/volunteer-leaderboard/pwa'), color: "amber", hot: true },
      ]
    },
    {
      title: "Team & Engagement",
      items: [
        { icon: Users, label: "Volunteers", desc: "Your team members", action: () => navigate('/volunteers'), badge: metrics.activeVolunteers, color: "sky" },
        { icon: Lightbulb, label: "Stories", desc: "Impact storytelling", action: () => navigate('/impact-storytelling'), color: "orange", isNew: true },
        { icon: Award, label: "Recognition", desc: "Celebrate achievements", action: () => navigate('/volunteer-leaderboard/pwa'), color: "rose" },
      ]
    },
    {
      title: "Settings",
      items: [
        { icon: User, label: "Profile", desc: "Organization details", action: () => navigate('/organization-profile-settings'), color: "slate" },
        { icon: Settings, label: "Settings", desc: "Preferences & config", action: () => navigate('/organization-profile-settings'), color: "gray" },
        { icon: LogOut, label: "Logout", desc: "Sign out safely", action: handleLogout, danger: true, color: "red" },
      ]
    }
  ];

  // Flatten for backward compatibility if needed
  const menuItems = menuSections.flatMap(section => section.items);

  // Show loading skeleton while viewport is being detected or redirecting to desktop
  if (isViewportLoading || !isMobile) {
    return <PWALoadingSkeleton />;
  }

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full bg-[#faf9f7] text-slate-800 flex flex-col overflow-x-hidden overflow-y-auto">
      {/* Centered App Container */}
      <div className="relative w-full h-full max-w-[428px] mx-auto flex flex-col">
        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-amber-500/90 text-black text-center py-1.5 px-4 text-xs font-medium flex-shrink-0">
            Offline Mode - Using Cached Data
          </div>
        )}

        {/* Shared Header with Refresh Button */}
        <OrganizationPWAHeader
          onRefresh={handleRefresh}
          isRefreshing={refreshing}
          metrics={{
            activeProjects: metrics.activeProjects,
            activeVolunteers: metrics.activeVolunteers,
            totalAiu: totalAiu,
            totalHours: metrics.totalHours,
            sdgsAddressed: metrics.sdgsAddressed,
          }}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20">
        <div className="p-4 space-y-4">
          {/* SDG Impact Report Quick Access */}
          <button
            onClick={() => navigate('/impact-report')}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-3 shadow-lg flex items-center justify-between hover:shadow-xl transition-shadow active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                <FileBarChart className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">SDG Impact Report</p>
                <p className="text-purple-100 text-[10px]">View your UN SDG contributions & metrics</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Pending Applications with Quick Approve/Reject */}
          {pendingApplications && pendingApplications.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-emerald-100">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {pendingApplications.length} Pending Application{pendingApplications.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-emerald-100 text-[10px]">Quick approve or reject</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/applications')}
                  className="text-white/80 text-xs hover:text-white flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {pendingApplications.slice(0, 5).map((app: any) => (
                  <div key={app.id} className="p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {app.volunteer?.displayName || app.volunteer?.email || 'Volunteer'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {app.opportunity?.title || 'Opportunity'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reviewApplicationMutation.mutate({ applicationId: app.id, status: 'accepted' });
                        }}
                        disabled={reviewApplicationMutation.isPending}
                        className="w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 active:scale-95"
                        title="Approve"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reviewApplicationMutation.mutate({ applicationId: app.id, status: 'rejected' });
                        }}
                        disabled={reviewApplicationMutation.isPending}
                        className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 active:scale-95"
                        title="Reject"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {pendingApplications.length > 5 && (
                <button
                  onClick={() => navigate('/applications')}
                  className="w-full p-2 bg-slate-50 text-emerald-600 text-xs font-medium hover:bg-slate-100 transition-colors"
                >
                  View {pendingApplications.length - 5} more applications →
                </button>
              )}
            </div>
          )}

          {/* Pending Approvals Alert - Hours & Impacts needing verification */}
          {pendingApprovals && pendingApprovals.totalPending > 0 && (
            <button
              onClick={() => navigate('/volunteers')}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-3 shadow-lg flex items-center justify-between hover:shadow-xl transition-shadow active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">
                    {pendingApprovals.totalPending} Pending Verification{pendingApprovals.totalPending > 1 ? 's' : ''}
                  </p>
                  <p className="text-amber-100 text-[10px]">
                    {pendingApprovals.pendingActivities.length > 0 && `${pendingApprovals.pendingActivities.length} hours`}
                    {pendingApprovals.pendingActivities.length > 0 && pendingApprovals.pendingImpacts.length > 0 && ' & '}
                    {pendingApprovals.pendingImpacts.length > 0 && `${pendingApprovals.pendingImpacts.length} impacts`}
                    {' awaiting review'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Welcome Banner - Enhanced */}
          <div className="bg-gradient-to-br from-amber-100 via-blue-50 to-blue-200 rounded-2xl p-4 text-slate-800 shadow-xl relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-blue-400/30" />
              <div className="absolute -left-5 -bottom-5 w-24 h-24 rounded-full bg-blue-300/20" />
            </div>
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-blue-800 text-[11px] font-medium uppercase tracking-wide mb-1">Dashboard Overview</p>
                  <h2 className="text-xl font-bold text-slate-800">
                    {organization?.name || 'Organization'}
                  </h2>
                </div>
                <div className="w-12 h-12 bg-white/40 backdrop-blur rounded-xl flex items-center justify-center overflow-hidden relative">
                  {/* Always show fallback icon */}
                  <Briefcase className="w-6 h-6 text-blue-800 absolute" />
                  {/* Logo overlays fallback when loaded successfully */}
                  {organization?.logo && (
                    <img
                      src={organization.logo}
                      alt={organization.name || 'Organization'}
                      className="w-10 h-10 object-contain absolute"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <button
                  onClick={() => setShowVolunteerHoursModal(true)}
                  className="bg-white/40 backdrop-blur rounded-xl p-2.5 text-center hover:bg-white/60 active:scale-[0.97] transition-all"
                >
                  <p className="text-xl font-bold text-slate-800">{metrics.totalHours.toLocaleString()}</p>
                  <p className="text-[9px] text-blue-800 font-medium">Hours</p>
                </button>
                <button
                  onClick={() => navigate('/projects')}
                  className="bg-white/40 backdrop-blur rounded-xl p-2.5 text-center hover:bg-white/60 active:scale-[0.97] transition-all"
                >
                  <p className="text-xl font-bold text-slate-800">{metrics.activeProjects}</p>
                  <p className="text-[9px] text-blue-800 font-medium">Projects</p>
                </button>
                <button
                  onClick={() => setShowLivesPerHourModal(true)}
                  className="bg-white/40 backdrop-blur rounded-xl p-2.5 text-center hover:bg-white/60 active:scale-[0.97] transition-all"
                >
                  <p className="text-xl font-bold text-slate-800">{totalPeopleImpacted.toLocaleString()}</p>
                  <p className="text-[9px] text-blue-800 font-medium">Lives</p>
                </button>
              </div>
            </div>
          </div>

          {/* Industry KPIs - Primary Metrics Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Economic Value Card - Shows SROI and economic value of work completed */}
            <button
              onClick={() => setShowImpactRoiModal(true)}
              className="bg-gradient-to-br from-emerald-200 to-teal-300 rounded-xl p-3 text-slate-800 shadow-lg text-left hover:shadow-xl transition-all active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-700" />
                <span className="text-[9px] bg-emerald-600/20 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium">
                  SROI
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-800">${metrics.totalHours > 0 ? formatDecimal(metrics.totalHours * 34.79 / 1000) : 0}K</p>
              <p className="text-[10px] text-slate-600">Economic Value</p>
              <div className="mt-2 pt-2 border-t border-emerald-400/30 text-[9px] text-slate-600">
                {totalPeopleImpacted > 0 ? formatDecimal((totalPeopleImpacted * 50) / Math.max(metrics.totalHours * 34.79, 1)) : '0.0'}:1 social return
              </div>
            </button>

            {/* Volunteer Efficiency Card */}
            <button
              onClick={() => navigate('/volunteers')}
              className="bg-gradient-to-br from-blue-200 to-indigo-300 rounded-xl p-3 text-slate-800 shadow-lg text-left hover:shadow-xl transition-all active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-blue-700" />
                <span className="text-[9px] bg-blue-600/20 text-blue-800 px-1.5 py-0.5 rounded-full font-medium">
                  {metrics.activeVolunteers > 0 ? Math.round(metrics.totalHours / metrics.activeVolunteers) : 0}h avg
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{metrics.activeVolunteers}</p>
              <p className="text-[10px] text-slate-600">Active Volunteers</p>
              <div className="mt-2 pt-2 border-t border-blue-400/30 text-[9px] text-slate-600">
                {metrics.totalHours.toLocaleString()} total hours
              </div>
            </button>
          </div>

          {/* Secondary KPIs - Interactive Cards */}
          <div className="grid grid-cols-4 gap-2">
            {/* Impact ROI - Lives impacted per hour volunteered */}
            <button
              onClick={() => setShowLivesPerHourModal(true)}
              className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm text-left hover:border-rose-300 transition-all active:scale-[0.98]"
            >
              <Heart className="w-4 h-4 text-rose-500 mb-1" />
              <p className="text-lg font-bold text-slate-800">
                {metrics.totalHours > 0 ? formatDecimal(totalPeopleImpacted / metrics.totalHours) : 0}
              </p>
              <p className="text-[9px] text-slate-500">Impact ROI</p>
            </button>

            {/* AIU Score - Opens AIU Details modal */}
            <button
              onClick={() => setShowAiuDetailsModal(true)}
              className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm text-left hover:border-teal-300 transition-all active:scale-[0.98]"
            >
              <Award className="w-4 h-4 text-teal-500 mb-1" />
              <p className="text-lg font-bold text-slate-800">{formatDecimal(totalAiu)}</p>
              <p className="text-[9px] text-slate-500">AIU Score</p>
            </button>

            {/* SDG Coverage - Opens Impact Report */}
            <button
              onClick={() => navigate('/impact-report')}
              className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm text-left hover:border-amber-300 transition-all active:scale-[0.98]"
            >
              <Target className="w-4 h-4 text-amber-500 mb-1" />
              <p className="text-lg font-bold text-slate-800">{Math.round((metrics.sdgsAddressed / 17) * 100)}%</p>
              <p className="text-[9px] text-slate-500">SDG Coverage</p>
            </button>

            {/* Total Hours - Opens Volunteer Hours modal */}
            <button
              onClick={() => setShowVolunteerHoursModal(true)}
              className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm text-left hover:border-blue-300 transition-all active:scale-[0.98]"
            >
              <Clock className="w-4 h-4 text-blue-500 mb-1" />
              <p className="text-lg font-bold text-slate-800">{metrics.totalHours.toLocaleString()}</p>
              <p className="text-[9px] text-slate-500">Total Hours</p>
            </button>
          </div>

          {/* Cumulative Impact Over Time - Interactive Chart */}
          {dashboardData?.impactOverTime && dashboardData.impactOverTime.length > 0 && (
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-4 border border-slate-200 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-sm">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  Impact Over Time
                </h3>
                <button
                  onClick={() => navigate('/impact-report')}
                  className="text-[11px] text-indigo-600 font-semibold hover:text-indigo-700"
                >
                  View Details →
                </button>
              </div>

              {/* Summary Stats Row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-2.5 text-center border border-blue-100">
                  <p className="text-lg font-bold text-blue-700">
                    {dashboardData.impactOverTime.reduce((sum, m) => sum + (m.hours || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-[9px] text-blue-600 font-medium">Total Hours</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-2.5 text-center border border-emerald-100">
                  <p className="text-lg font-bold text-emerald-700">
                    {totalPeopleImpacted.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-emerald-600 font-medium">Lives Impacted</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-2.5 text-center border border-purple-100">
                  <p className="text-lg font-bold text-purple-700">
                    {dashboardData.impactOverTime.reduce((sum, m) => sum + (m.volunteers || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-[9px] text-purple-600 font-medium">Volunteers</p>
                </div>
              </div>

              {/* Chart */}
              <div className="h-40 bg-gradient-to-br from-slate-50 to-white rounded-xl p-2 border border-slate-100">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData.impactOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPeople" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 9, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '11px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorHours)"
                      name="Hours"
                    />
                    <Area
                      type="monotone"
                      dataKey="peopleImpacted"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPeople)"
                      name="People Impacted"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-[10px] text-slate-600 font-medium">Hours</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-slate-600 font-medium">People Impacted</span>
                </div>
              </div>
            </div>
          )}

          {/* Team Performance Card - Fully Interactive */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-sm">
                  <Users className="w-3.5 h-3.5 text-white" />
                </div>
                Team Performance
              </h3>
              <button
                onClick={() => navigate('/volunteers')}
                className="text-[11px] text-blue-600 font-semibold hover:text-blue-700"
              >
                View Team →
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {/* Active Volunteers - Clickable */}
              <button
                onClick={() => navigate('/volunteers')}
                className="p-2.5 bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl text-left hover:shadow-md transition-all active:scale-[0.98] border border-sky-100"
              >
                <Users className="w-4 h-4 text-sky-600 mb-1" />
                <p className="text-lg font-bold text-sky-700">{metrics.activeVolunteers || 0}</p>
                <p className="text-[9px] text-sky-600">Volunteers</p>
              </button>
              {/* Avg Hours/Volunteer - Clickable */}
              <button
                onClick={() => navigate('/projects')}
                className="p-2.5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl text-left hover:shadow-md transition-all active:scale-[0.98] border border-emerald-100"
              >
                <Clock className="w-4 h-4 text-emerald-600 mb-1" />
                <p className="text-lg font-bold text-emerald-700">
                  {metrics.activeVolunteers > 0 ? Math.round(metrics.totalHours / metrics.activeVolunteers) : 0}
                </p>
                <p className="text-[9px] text-emerald-600">Avg Hrs</p>
              </button>
              {/* Lives Impacted - Clickable */}
              <button
                onClick={() => navigate('/impact-report')}
                className="p-2.5 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl text-left hover:shadow-md transition-all active:scale-[0.98] border border-rose-100"
              >
                <Heart className="w-4 h-4 text-rose-600 mb-1" />
                <p className="text-lg font-bold text-rose-700">
                  {(metrics.livesTouched || metrics.peopleImpacted || totalPeopleImpacted || 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-rose-600">Impacted</p>
              </button>
              {/* Completion Rate - Clickable */}
              <button
                onClick={() => navigate('/projects')}
                className="p-2.5 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl text-left hover:shadow-md transition-all active:scale-[0.98] border border-violet-100"
              >
                <CheckCircle className="w-4 h-4 text-violet-600 mb-1" />
                <p className="text-lg font-bold text-violet-700">
                  {metrics.totalProjects > 0 ? Math.round((metrics.completedProjects / metrics.totalProjects) * 100) : 0}%
                </p>
                <p className="text-[9px] text-violet-600">Complete</p>
              </button>
            </div>
          </div>

          {/* SDG Impact Distribution */}
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

              {/* Summary Stats Row - Interactive */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  onClick={() => navigate('/sdg-mapping')}
                  className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-sm text-left hover:border-teal-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[10px] text-slate-500 font-medium">Total SDGs</p>
                    <ChevronRight className="w-3 h-3 text-teal-400" />
                  </div>
                  <p className="text-lg font-bold text-teal-600">{dashboardData.sdgDistribution.length}</p>
                </button>
                <button
                  onClick={() => navigate('/impact-report')}
                  className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-sm text-left hover:border-emerald-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[10px] text-slate-500 font-medium">Volunteer Hours</p>
                    <ChevronRight className="w-3 h-3 text-emerald-400" />
                  </div>
                  <p className="text-lg font-bold text-emerald-600">
                    {metrics.totalHours.toLocaleString()}
                  </p>
                </button>
                <button
                  onClick={() => navigate('/projects')}
                  className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-sm text-left hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[10px] text-slate-500 font-medium">Projects</p>
                    <ChevronRight className="w-3 h-3 text-blue-400" />
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    {dashboardData.sdgDistribution.reduce((sum, s) => sum + (s.projects || 0), 0)}
                  </p>
                </button>
              </div>

              {/* Cards View - SDGs (expandable) */}
              {sdgViewMode === 'cards' && (
                <div className="space-y-2">
                  {(showAllSdgs ? dashboardData.sdgDistribution : dashboardData.sdgDistribution.slice(0, 4)).map((sdg, index) => {
                    // Use actual volunteer hours as denominator to show what % of total effort touched this SDG
                    const actualTotalHours = metrics.totalHours || 1;
                    const percentage = actualTotalHours > 0 ? Math.round((sdg.hours / actualTotalHours) * 100) : 0;
                    const isTopSDG = index === 0;

                    return (
                      <button
                        key={sdg.goal}
                        onClick={() => navigate('/impact-report')}
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
                          <div className="flex flex-col gap-0.5 mt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-emerald-600 font-medium" title="Hours from projects involving this SDG">
                                <Clock className="w-3 h-3 inline mr-0.5" />
                                {sdg.hours?.toLocaleString() || 0}h contributing
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500" title="Hours proportionally dedicated to this SDG">
                                {Math.round(sdg.dedicatedHours || 0)}h dedicated
                              </span>
                              <span className="text-[10px] text-slate-400">•</span>
                              <span className="text-[10px] text-slate-500">
                                <FolderOpen className="w-3 h-3 inline mr-0.5" />
                                {sdg.projects || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Circle */}
                        <div className="flex flex-col items-center">
                          <div className="relative w-10 h-10">
                            <svg className="w-10 h-10 transform -rotate-90">
                              <circle cx="20" cy="20" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                              <circle
                                cx="20" cy="20" r="16" fill="none"
                                stroke={getSDGColor(sdg.goal)}
                                strokeWidth="3" strokeLinecap="round"
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

                  {dashboardData.sdgDistribution.length > 4 && (
                    <button
                      onClick={() => setShowAllSdgs(!showAllSdgs)}
                      className="w-full py-2.5 text-center text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      {showAllSdgs ? (
                        <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                      ) : (
                        <>View All {dashboardData.sdgDistribution.length} SDGs <ChevronDown className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Chart View */}
              {sdgViewMode === 'chart' && (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.sdgDistribution.slice(0, 8)}
                        cx="50%" cy="50%"
                        innerRadius={35} outerRadius={55}
                        paddingAngle={2} dataKey="hours" nameKey="goal"
                        onClick={() => navigate('/impact-report')}
                      >
                        {dashboardData.sdgDistribution.slice(0, 8).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getSDGColor(entry.goal)} stroke="white" strokeWidth={2} style={{ cursor: 'pointer' }} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-2">
                                <p className="text-xs font-semibold" style={{ color: getSDGColor(data.goal) }}>
                                  SDG {data.goal}: {getSDGName(data.goal)}
                                </p>
                                <p className="text-[10px] text-slate-600">{data.hours?.toLocaleString() || 0}h • {data.projects || 0} projects</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Impact Visualization Button */}
          <button
            onClick={() => navigate('/impact-report')}
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
                    key={`${mapKey}-mini`}
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

          {/* Active Projects with Completion Progress */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Active Projects
              </h3>
              <button onClick={() => navigate('/projects')} className="text-xs text-emerald-600 font-medium">
                View All →
              </button>
            </div>
            <div className="space-y-2">
              {dashboardData?.projects?.slice(0, 5).map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}/pwa`)}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-800 truncate pr-2">{project.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                        project.status?.toLowerCase() === 'active' || project.status?.toLowerCase() === 'in progress'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
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
                      <span className="text-xs font-semibold text-slate-600 w-9 text-right">
                        {project.completionPercentage || 0}%
                      </span>
                    </div>
                  </div>
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

          {/* Your Team - Volunteer List Section */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">Your Team</h3>
                    <p className="text-[10px] text-slate-500">Tap a volunteer to view profile</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                    {organizationVolunteers.length}
                  </span>
                  <button onClick={() => navigate('/volunteers')} className="text-xs text-purple-600 font-semibold hover:text-purple-700">
                    View All →
                  </button>
                </div>
              </div>
            </div>

            {volunteersLoading ? (
              <div className="p-4 text-center">
                <div className="animate-pulse flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded-lg" />
                  ))}
                </div>
              </div>
            ) : organizationVolunteers.length === 0 ? (
              <div className="p-6 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No volunteers yet</p>
                <p className="text-slate-400 text-xs mt-1">Volunteers will appear here when they join your projects</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {organizationVolunteers.slice(0, 5).map((volunteer) => (
                  <button
                    key={volunteer.id}
                    onClick={() => {
                      setSelectedVolunteer(volunteer);
                      setShowVolunteerProfileModal(true);
                    }}
                    className="w-full p-3 flex items-center gap-3 hover:bg-purple-50 active:bg-purple-100 active:scale-[0.98] transition-all duration-150 text-left group"
                  >
                    {/* Avatar with online indicator */}
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white shadow-md group-hover:shadow-lg group-hover:ring-purple-200 transition-all relative overflow-hidden">
                        {/* Always show initials as fallback */}
                        <span className="absolute inset-0 flex items-center justify-center">
                          {volunteer.displayName?.charAt(0)?.toUpperCase() || 'V'}
                        </span>
                        {/* Image overlays initials when loaded successfully */}
                        {volunteer.avatar && (
                          <img
                            src={volunteer.avatar}
                            alt={volunteer.displayName}
                            className="absolute inset-0 w-full h-full rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      {/* Active indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                    </div>

                    {/* Volunteer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-purple-700 transition-colors">{volunteer.displayName || 'Volunteer'}</p>
                        {volunteer.hours >= 50 && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full">TOP</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-emerald-500" />
                          {volunteer.hours}h
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-full">
                          <Briefcase className="w-3 h-3 text-blue-500" />
                          {volunteer.projectCount}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3 text-purple-500" />
                          {volunteer.tasksCompleted}
                        </span>
                      </div>
                    </div>

                    {/* Tap indicator */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[9px] text-purple-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">View</span>
                      <ChevronRight className="w-5 h-5 text-purple-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}

                {organizationVolunteers.length > 5 && (
                  <button
                    onClick={() => navigate('/volunteers')}
                    className="w-full p-3 text-center text-purple-600 text-sm font-medium hover:bg-purple-50 transition-colors"
                  >
                    View all {organizationVolunteers.length} volunteers →
                  </button>
                )}
              </div>
            )}
          </div>

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

        {/* Bottom Navigation Tray - Off-white to Light Yellow Gradient */}
        <nav
          className="sticky bottom-0 z-50 pb-[env(safe-area-inset-bottom)] w-full flex-shrink-0"
          style={{
            background: 'linear-gradient(90deg, #FAF9F7 0%, #FEF9E7 50%, #FFF8DC 100%)',
            boxShadow: '0 -2px 16px rgba(0, 0, 0, 0.08)',
          }}
        >
          <div className="flex items-center justify-around py-2 px-1">
            {/* Home - Active */}
            <button
              onClick={() => navigate('/organization-dashboard/pwa')}
              className="flex flex-col items-center gap-0.5 min-w-[48px] py-1.5"
            >
              <div className="p-1.5 rounded-lg bg-emerald-100">
                <Home className="w-[18px] h-[18px] text-emerald-600" />
              </div>
              <span className="text-[9px] font-semibold text-slate-800">Home</span>
            </button>

            {/* Projects */}
            <button
              onClick={() => navigate('/projects')}
              className="flex flex-col items-center gap-0.5 min-w-[48px] py-1.5"
            >
              <div className="p-1.5 rounded-lg">
                <FolderOpen className="w-[18px] h-[18px] text-slate-500" />
              </div>
              <span className="text-[9px] font-medium text-slate-500">Projects</span>
            </button>

            {/* Potential - Center Green Button */}
            <button
              onClick={() => navigate('/overview')}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl -translate-y-2"
              style={{
                background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
                boxShadow: '0 2px 12px rgba(22, 101, 52, 0.5)',
                minWidth: '60px',
              }}
            >
              <Lightbulb className="w-5 h-5 text-white" />
              <span className="text-[8px] font-semibold text-white tracking-wide">Potential</span>
            </button>

            {/* Volunteers */}
            <button
              onClick={() => navigate('/volunteers')}
              className="flex flex-col items-center gap-0.5 min-w-[48px] py-1.5"
            >
              <div className="p-1.5 rounded-lg">
                <Users className="w-[18px] h-[18px] text-slate-500" />
              </div>
              <span className="text-[9px] font-medium text-slate-500">Volunteers</span>
            </button>

            {/* SDGs */}
            <button
              onClick={() => navigate('/sdg-mapping')}
              className="flex flex-col items-center gap-0.5 min-w-[48px] py-1.5"
            >
              <div className="p-1.5 rounded-lg">
                <Target className="w-[18px] h-[18px] text-slate-500" />
              </div>
              <span className="text-[9px] font-medium text-slate-500">SDGs</span>
            </button>
          </div>
        </nav>
      </div>

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
                    key={`${mapKey}-modal`}
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
                // Use actual volunteer hours as denominator to show what % of total effort touched this SDG
                const actualTotalHours = metrics.totalHours || 1;
                const percentage = actualTotalHours > 0 ? Math.round(((sdgData?.hours || 0) / actualTotalHours) * 100) : 0;

                return (
                  <div className="space-y-4">
                    {/* Stats Grid - Interactive */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() => {
                          setSelectedSdgGoal(null);
                          navigate('/impact-report');
                        }}
                        className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all active:scale-[0.98]"
                      >
                        <Clock className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                        <p className="text-lg font-bold text-emerald-700">
                          {sdgData?.hours?.toLocaleString() || 0}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-medium">Contributing Hours</p>
                        <p className="text-[8px] text-slate-400 mt-0.5">from projects involving this SDG</p>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSdgGoal(null);
                          navigate('/impact-report');
                        }}
                        className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
                      >
                        <Clock className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                        <p className="text-lg font-bold text-blue-700">
                          {Math.round(sdgData?.dedicatedHours || 0)}
                        </p>
                        <p className="text-[10px] text-blue-600 font-medium">Dedicated Hours</p>
                        <p className="text-[8px] text-slate-400 mt-0.5">proportionally allocated</p>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedSdgGoal(null);
                          navigate('/projects');
                        }}
                        className="bg-slate-50 rounded-xl p-3 text-center hover:bg-slate-100 hover:shadow-sm transition-all active:scale-[0.98]"
                      >
                        <FolderOpen className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                        <p className="text-lg font-bold text-slate-800">
                          {sdgData?.projects || 0}
                        </p>
                        <p className="text-[10px] text-slate-500">Projects</p>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSdgGoal(null);
                          navigate('/organization-team');
                        }}
                        className="bg-slate-50 rounded-xl p-3 text-center hover:bg-slate-100 hover:shadow-sm transition-all active:scale-[0.98]"
                      >
                        <Users className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                        <p className="text-lg font-bold text-slate-800">
                          {sdgData?.volunteers || 0}
                        </p>
                        <p className="text-[10px] text-slate-500">Volunteers</p>
                      </button>
                    </div>

                    {/* Contribution Progress */}
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-slate-700">Focus Share (Dedicated)</p>
                        <p className="text-sm font-bold" style={{ color: getSDGColor(selectedSdgGoal) }}>
                          {actualTotalHours > 0 ? Math.round(((sdgData?.dedicatedHours || 0) / actualTotalHours) * 100) : 0}%
                        </p>
                      </div>
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${actualTotalHours > 0 ? Math.round(((sdgData?.dedicatedHours || 0) / actualTotalHours) * 100) : 0}%`,
                            backgroundColor: getSDGColor(selectedSdgGoal)
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">
                        {Math.round(sdgData?.dedicatedHours || 0)} dedicated hours of {actualTotalHours.toLocaleString()} total volunteer hours
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
                                  navigate(`/projects/${project.id}/pwa`);
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
                          navigate('/impact-report');
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

      {/* Impact ROI Details Modal - Economic Value Focus */}
      {showImpactRoiModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-[428px] max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
              </div>
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white/80 text-[10px] font-medium uppercase tracking-wide">
                      Economic Value Generated
                    </p>
                    <h3 className="font-bold text-xl leading-tight mt-0.5">
                      ${metrics.totalHours > 0 ? Math.round(metrics.totalHours * 34.79).toLocaleString() : 0}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowImpactRoiModal(false)}
                  className="w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {/* Key ROI Metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-100 text-center">
                  <p className="text-xl font-bold text-emerald-700">
                    {totalPeopleImpacted > 0 ? formatDecimal((totalPeopleImpacted * 50) / Math.max(metrics.totalHours * 34.79, 1)) : '0.0'}:1
                  </p>
                  <p className="text-[9px] text-emerald-600 font-medium">SROI Ratio</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100 text-center">
                  <p className="text-xl font-bold text-blue-700">
                    ${totalPeopleImpacted > 0 ? Math.round((metrics.totalHours * 34.79) / totalPeopleImpacted) : 0}
                  </p>
                  <p className="text-[9px] text-blue-600 font-medium">Cost/Beneficiary</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-3 border border-purple-100 text-center">
                  <p className="text-xl font-bold text-purple-700">
                    {metrics.totalProjects > 0 ? Math.round((metrics.completedProjects / metrics.totalProjects) * 100) : 0}%
                  </p>
                  <p className="text-[9px] text-purple-600 font-medium">Success Rate</p>
                </div>
              </div>

              {/* Main Economic Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                  <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
                  <p className="text-2xl font-bold text-emerald-700">${metrics.totalHours > 0 ? formatDecimal(metrics.totalHours * 34.79 / 1000) : 0}K</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Total Economic Value</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                  <Heart className="w-5 h-5 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-700">{totalPeopleImpacted.toLocaleString()}</p>
                  <p className="text-[10px] text-blue-600 font-medium">Lives Impacted</p>
                </div>
              </div>

              {/* Economic Value Breakdown */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-600" />
                  Economic Value Breakdown
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Value per Volunteer Hour</span>
                    <span className="text-sm font-bold text-emerald-600">$34.79</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                  <p className="text-[10px] text-slate-500">Based on Independent Sector 2025 valuation</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Value per Volunteer</span>
                    <span className="text-sm font-bold text-purple-600">
                      ${metrics.activeVolunteers > 0 ? Math.round((metrics.totalHours * 34.79) / metrics.activeVolunteers).toLocaleString() : 0}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${Math.min(((metrics.totalHours * 34.79) / Math.max(metrics.activeVolunteers, 1)) / 5000 * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Average economic contribution per volunteer</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Value per Project</span>
                    <span className="text-sm font-bold text-teal-600">
                      ${metrics.activeProjects > 0 ? Math.round((metrics.totalHours * 34.79) / metrics.activeProjects).toLocaleString() : 0}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${Math.min(((metrics.totalHours * 34.79) / Math.max(metrics.activeProjects, 1)) / 10000 * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Average value generated per project</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Impact per Dollar</span>
                    <span className="text-sm font-bold text-rose-600">
                      {metrics.totalHours > 0 ? formatDecimal(totalPeopleImpacted / (metrics.totalHours * 34.79) * 100) : 0}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${Math.min((totalPeopleImpacted / Math.max(metrics.totalHours * 34.79, 1)) * 1000, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Beneficiaries reached per $100 value</p>
                </div>
              </div>

              {/* ROI Summary Card */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                <h4 className="text-xs font-semibold text-amber-800 mb-3 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Return on Investment Summary
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setShowVolunteerHoursModal(true)}
                    className="bg-white/60 rounded-lg p-2 text-center hover:bg-white/80 transition-all active:scale-[0.98]"
                  >
                    <p className="text-base font-bold text-amber-700">{metrics.totalHours.toLocaleString()}h</p>
                    <p className="text-[8px] text-amber-600">Hours Invested</p>
                  </button>
                  <button
                    onClick={() => navigate('/volunteers')}
                    className="bg-white/60 rounded-lg p-2 text-center hover:bg-white/80 transition-all active:scale-[0.98]"
                  >
                    <p className="text-base font-bold text-orange-700">
                      {metrics.activeVolunteers > 0 ? Math.round(metrics.totalHours / metrics.activeVolunteers) : 0}h
                    </p>
                    <p className="text-[8px] text-orange-600">Avg/Volunteer</p>
                  </button>
                  <button
                    onClick={() => setShowLivesPerHourModal(true)}
                    className="bg-white/60 rounded-lg p-2 text-center hover:bg-white/80 transition-all active:scale-[0.98]"
                  >
                    <p className="text-base font-bold text-emerald-700">
                      {totalPeopleImpacted > 0 ? formatDecimal(metrics.totalHours / totalPeopleImpacted) : 0}h
                    </p>
                    <p className="text-[8px] text-emerald-600">Hrs/Beneficiary</p>
                  </button>
                  <button
                    onClick={() => setShowActiveProjectsModal(true)}
                    className="bg-white/60 rounded-lg p-2 text-center hover:bg-white/80 transition-all active:scale-[0.98]"
                  >
                    <p className="text-base font-bold text-teal-700">
                      {metrics.activeProjects > 0 ? Math.round(metrics.totalHours / metrics.activeProjects) : 0}h
                    </p>
                    <p className="text-[8px] text-teal-600">Hrs/Project</p>
                  </button>
                </div>
              </div>

              {/* What is SROI */}
              <div className="bg-slate-100 rounded-xl p-3">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">What is SROI?</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>Social Return on Investment (SROI)</strong> measures the value created for every dollar invested. A ratio of 3:1 means $3 of social value is created for every $1 invested. Your SROI factors in volunteer hours, beneficiary reach, and project outcomes.
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  setShowImpactRoiModal(false);
                  navigate('/impact-report');
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium text-sm hover:from-emerald-600 hover:to-teal-700 transition-all"
              >
                View Detailed Impact Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AIU Details Modal */}
      {showAiuDetailsModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-[428px] max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-4 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
              </div>
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white/80 text-[10px] font-medium uppercase tracking-wide">
                      Attributable Impact Units
                    </p>
                    <h3 className="font-bold text-xl leading-tight mt-0.5">
                      {formatDecimal(totalAiu)} AIU
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowAiuDetailsModal(false)}
                  className="w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {/* AIU Summary Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-3 border border-teal-100 text-center">
                  <p className="text-xl font-bold text-teal-700">{formatDecimal(totalAiu)}</p>
                  <p className="text-[10px] text-teal-600 font-medium">Total AIU</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100 text-center">
                  <p className="text-xl font-bold text-blue-700">
                    {metrics.activeProjects > 0 ? formatDecimal(totalAiu / metrics.activeProjects) : '0.00'}
                  </p>
                  <p className="text-[10px] text-blue-600 font-medium">AIU/Project</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-3 border border-purple-100 text-center">
                  <p className="text-xl font-bold text-purple-700">
                    {metrics.activeVolunteers > 0 ? formatDecimal(totalAiu / metrics.activeVolunteers) : '0.00'}
                  </p>
                  <p className="text-[10px] text-purple-600 font-medium">AIU/Volunteer</p>
                </div>
              </div>

              {/* AIU Components Breakdown */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-teal-600" />
                  AIU Calculation Components
                </h4>

                {/* Hours Component (35%) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-slate-600">Volunteer Hours (35%)</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{metrics.totalHours.toLocaleString()}h</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((metrics.totalHours / 1000) * 35, 35)}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500">Contributes {formatDecimal(totalAiu * 0.35)} AIU</p>
                </div>

                {/* SDG Alignment (25%) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-slate-600">SDG Alignment (25%)</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{metrics.sdgsAddressed}/17 SDGs</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(metrics.sdgsAddressed / 17) * 25}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500">Contributes {formatDecimal(totalAiu * 0.25)} AIU</p>
                </div>

                {/* Lives Impacted (25%) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500" />
                      <span className="text-xs text-slate-600">Lives Impacted (25%)</span>
                    </div>
                    <span className="text-sm font-bold text-rose-600">{totalPeopleImpacted.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min((totalPeopleImpacted / 1000) * 25, 25)}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500">Contributes {formatDecimal(totalAiu * 0.25)} AIU</p>
                </div>

                {/* Verification (15%) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-slate-600">Verified Outcomes (15%)</span>
                    </div>
                    <span className="text-sm font-bold text-purple-600">{metrics.completedProjects || 0} verified</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(((metrics.completedProjects || 0) / Math.max(metrics.totalProjects, 1)) * 15, 15)}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500">Contributes {formatDecimal(totalAiu * 0.15)} AIU</p>
                </div>
              </div>

              {/* AIU Performance Insights */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                <h4 className="text-xs font-semibold text-amber-800 mb-3 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Performance Insights
                </h4>
                <div className="space-y-2">
                  {/* Efficiency Rating */}
                  <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      (totalAiu / Math.max(metrics.totalHours, 1)) >= 0.02 ? 'bg-emerald-100' : 'bg-amber-100'
                    }`}>
                      <TrendingUp className={`w-4 h-4 ${
                        (totalAiu / Math.max(metrics.totalHours, 1)) >= 0.02 ? 'text-emerald-600' : 'text-amber-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-medium text-slate-700">Impact Efficiency</p>
                      <p className="text-[10px] text-slate-500">
                        {metrics.totalHours > 0
                          ? `${formatDecimal((totalAiu / metrics.totalHours) * 100)} AIU per 100 hours`
                          : 'Log hours to track efficiency'}
                      </p>
                    </div>
                  </div>

                  {/* SDG Multiplier */}
                  <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                      <Target className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-medium text-slate-700">SDG Multiplier Active</p>
                      <p className="text-[10px] text-slate-500">
                        {formatDecimal(Math.min(1 + (metrics.sdgsAddressed * 0.1), 2.0))}x bonus from {metrics.sdgsAddressed} SDGs
                      </p>
                    </div>
                  </div>

                  {/* Improvement Tip */}
                  <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-medium text-slate-700">Boost Your AIU</p>
                      <p className="text-[10px] text-slate-500">
                        {metrics.sdgsAddressed < 5
                          ? 'Align more projects with SDGs for bonus multiplier'
                          : metrics.completedProjects < metrics.activeProjects
                            ? 'Complete active projects to increase verified outcomes'
                            : 'Great work! Maintain momentum with new projects'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AIU by SDG */}
              {dashboardData?.sdgDistribution && dashboardData.sdgDistribution.length > 0 && (
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
                  <h4 className="text-xs font-semibold text-teal-800 mb-3 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />
                    AIU Distribution by SDG
                  </h4>
                  <div className="space-y-2">
                    {dashboardData.sdgDistribution.slice(0, 4).map((sdg) => {
                      const sdgAiu = (sdg.hours || 0) * 0.02; // AIU per hour contribution
                      return (
                        <div key={sdg.goal} className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: getSDGColor(sdg.goal) }}
                          >
                            {sdg.goal}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-600 truncate">{getSDGName(sdg.goal)}</span>
                              <span className="text-xs font-bold text-teal-600">{formatDecimal(sdgAiu)}</span>
                            </div>
                            <div className="h-1.5 bg-white rounded-full overflow-hidden mt-0.5">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min((sdgAiu / Math.max(totalAiu, 0.01)) * 100, 100)}%`,
                                  backgroundColor: getSDGColor(sdg.goal)
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* What is AIU */}
              <div className="bg-slate-100 rounded-xl p-3">
                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  What is AIU?
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>Attributable Impact Units (AIU)</strong> measure your organization's real contribution to social impact. Unlike simple "hours logged", AIUs calculate your proportional share of project outcomes based on:
                </p>
                <ul className="text-[10px] text-slate-500 mt-2 space-y-1 ml-3 list-disc">
                  <li>Volunteer effort and engagement (35%)</li>
                  <li>Alignment with UN SDGs (25%)</li>
                  <li>Number of beneficiaries reached (25%)</li>
                  <li>Verified and completed outcomes (15%)</li>
                </ul>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  setShowAiuDetailsModal(false);
                  navigate('/impact-report');
                }}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-medium text-sm hover:from-teal-600 hover:to-cyan-700 transition-all"
              >
                View Full Impact Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Projects Modal */}
      {showActiveProjectsModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-[428px] max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
              </div>
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white/80 text-[10px] font-medium uppercase tracking-wide">
                      Project Overview
                    </p>
                    <h3 className="font-bold text-xl leading-tight mt-0.5">
                      {metrics.activeProjects} Active Projects
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowActiveProjectsModal(false)}
                  className="w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {/* Project Status Overview */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-100 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{metrics.activeProjects}</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Active</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100 text-center">
                  <p className="text-2xl font-bold text-blue-700">{metrics.completedProjects}</p>
                  <p className="text-[10px] text-blue-600 font-medium">Completed</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-3 border border-purple-100 text-center">
                  <p className="text-2xl font-bold text-purple-700">{metrics.totalProjects}</p>
                  <p className="text-[10px] text-purple-600 font-medium">Total</p>
                </div>
              </div>

              {/* Success Rate */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Project Success Rate
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Completion Rate</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {metrics.totalProjects > 0 ? Math.round((metrics.completedProjects / metrics.totalProjects) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${metrics.totalProjects > 0 ? (metrics.completedProjects / metrics.totalProjects) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Average Completion</span>
                    <span className="text-sm font-bold text-blue-600">{avgProjectCompletion}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${avgProjectCompletion}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Recent Projects */}
              {dashboardData?.projects && dashboardData.projects.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5" />
                    Recent Projects
                  </h4>
                  <div className="space-y-2">
                    {dashboardData.projects.slice(0, 4).map((project) => (
                      <div key={project.id} className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[180px]">{project.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            project.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {project.status}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${project.completionPercentage || 0}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">{project.completionPercentage || 0}% complete</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => {
                  setShowActiveProjectsModal(false);
                  navigate('/projects');
                }}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-purple-600 hover:to-indigo-700 transition-all"
              >
                View All Projects
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Volunteer Hours Modal */}
      {showVolunteerHoursModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-[428px] max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
              </div>
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white/80 text-[10px] font-medium uppercase tracking-wide">
                      Total Volunteer Hours
                    </p>
                    <h3 className="font-bold text-xl leading-tight mt-0.5">
                      {metrics.totalHours.toLocaleString()} Hours
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowVolunteerHoursModal(false)}
                  className="w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {/* Hours Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                  <Clock className="w-5 h-5 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-700">{metrics.totalHours.toLocaleString()}</p>
                  <p className="text-[10px] text-blue-600 font-medium">Total Hours Logged</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                  <Users className="w-5 h-5 text-emerald-600 mb-2" />
                  <p className="text-2xl font-bold text-emerald-700">
                    {metrics.activeVolunteers > 0 ? Math.round(metrics.totalHours / metrics.activeVolunteers) : 0}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-medium">Avg Hours/Volunteer</p>
                </div>
              </div>

              {/* Hours Efficiency */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Hours Efficiency Metrics
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Hours per Project</span>
                    <span className="text-sm font-bold text-blue-600">
                      {metrics.activeProjects > 0 ? Math.round(metrics.totalHours / metrics.activeProjects) : 0}h
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min((metrics.totalHours / Math.max(metrics.activeProjects, 1)) / 100 * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Lives Impacted per Hour</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {metrics.totalHours > 0 ? formatDecimal(totalPeopleImpacted / metrics.totalHours) : 0}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min((totalPeopleImpacted / Math.max(metrics.totalHours, 1)) / 5 * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Industry average: 2.5 lives/hour</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">AIU per 100 Hours</span>
                    <span className="text-sm font-bold text-teal-600">
                      {metrics.totalHours > 0 ? formatDecimal((totalAiu / metrics.totalHours) * 100) : 0}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${Math.min(((totalAiu / Math.max(metrics.totalHours, 1)) * 100) / 5 * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Time Distribution */}
              {dashboardData?.impactOverTime && dashboardData.impactOverTime.length > 0 && (
                <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-100">
                  <h4 className="text-xs font-semibold text-sky-800 mb-3 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Recent Hours Trend
                  </h4>
                  <div className="space-y-2">
                    {dashboardData.impactOverTime.slice(-4).map((period, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600 w-12">{period.month}</span>
                        <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full"
                            style={{
                              width: `${Math.min((period.hours / Math.max(...dashboardData.impactOverTime.map(p => p.hours), 1)) * 100, 100)}%`
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-sky-700 w-10 text-right">{period.hours}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => {
                  setShowVolunteerHoursModal(false);
                  navigate('/volunteers');
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-medium text-sm hover:from-blue-600 hover:to-cyan-700 transition-all"
              >
                View Volunteer Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SDG Coverage Modal with AI Suggestions */}
      {showSdgCoverageModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-[428px] max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
              </div>
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white/80 text-[10px] font-medium uppercase tracking-wide">
                      UN Sustainable Development Goals
                    </p>
                    <h3 className="font-bold text-xl leading-tight mt-0.5">
                      {metrics.sdgsAddressed}/17 SDGs ({Math.round((metrics.sdgsAddressed / 17) * 100)}%)
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowSdgCoverageModal(false)}
                  className="w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {/* SDG Coverage Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-100 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{metrics.sdgsAddressed}</p>
                  <p className="text-[10px] text-emerald-600 font-medium">SDGs Addressed</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100 text-center">
                  <p className="text-2xl font-bold text-amber-700">{17 - metrics.sdgsAddressed}</p>
                  <p className="text-[10px] text-amber-600 font-medium">SDGs Remaining</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100 text-center">
                  <p className="text-2xl font-bold text-blue-700">{Math.round((metrics.sdgsAddressed / 17) * 100)}%</p>
                  <p className="text-[10px] text-blue-600 font-medium">Coverage</p>
                </div>
              </div>

              {/* Active SDGs */}
              {dashboardData?.sdgDistribution && dashboardData.sdgDistribution.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Active SDG Contributions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {dashboardData.sdgDistribution.map((sdg) => (
                      <div
                        key={sdg.goal}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-full text-white text-[10px] font-medium"
                        style={{ backgroundColor: getSDGColor(sdg.goal) }}
                      >
                        <span className="font-bold">SDG {sdg.goal}</span>
                        <span className="opacity-80">• {sdg.hours}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Suggestions Section */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                <h4 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-purple-600" />
                  AI-Powered SDG Recommendations
                </h4>
                <div className="space-y-3">
                  {/* Recommendation 1 */}
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 bg-[#E5243B]">
                        1
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-700">Expand No Poverty Initiatives</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Your current projects show strong potential for SDG 1. Consider adding economic empowerment components to existing programs.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation 2 */}
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 bg-[#4C9F38]">
                        3
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-700">Health & Well-being Integration</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Based on your volunteer skills, adding health awareness components could increase your SDG coverage by 15%.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation 3 */}
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 bg-[#C5192D]">
                        4
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-700">Quality Education Opportunity</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {metrics.activeVolunteers > 5
                            ? `With ${metrics.activeVolunteers} active volunteers, consider launching mentorship programs for SDG 4 alignment.`
                            : 'Partner with local schools to create educational workshops for broader SDG 4 impact.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Impact Multiplier Tip */}
                  <div className="bg-purple-100 rounded-lg p-3 mt-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <p className="text-[10px] text-purple-700 font-medium">
                        Impact Tip: Projects addressing 3+ SDGs earn up to 2x AIU multiplier bonus!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  setShowSdgCoverageModal(false);
                  navigate('/sdg-mapping');
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium text-sm hover:from-amber-600 hover:to-orange-700 transition-all"
              >
                View Full SDG Mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impact ROI Modal - Lives Impacted Per Hour */}
      {showLivesPerHourModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-[428px] max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-4 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
              </div>
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white/80 text-[10px] font-medium uppercase tracking-wide">
                      Impact ROI
                    </p>
                    <h3 className="font-bold text-xl leading-tight mt-0.5">
                      {metrics.totalHours > 0 ? formatDecimal(totalPeopleImpacted / metrics.totalHours) : 0} Lives/Hour
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowLivesPerHourModal(false)}
                  className="w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {/* ROI Calculation Breakdown */}
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-100">
                <h4 className="text-sm font-semibold text-rose-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  ROI Calculation
                </h4>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-rose-600">{totalPeopleImpacted.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Lives Impacted</div>
                  </div>
                  <div className="text-2xl text-slate-400">÷</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{metrics.totalHours.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Hours Volunteered</div>
                  </div>
                  <div className="text-2xl text-slate-400">=</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">
                      {metrics.totalHours > 0 ? formatDecimal(totalPeopleImpacted / metrics.totalHours) : 0}
                    </div>
                    <div className="text-xs text-slate-500">Impact ROI</div>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-100">
                  <Heart className="w-5 h-5 text-rose-600 mb-2" />
                  <p className="text-2xl font-bold text-rose-700">{totalPeopleImpacted.toLocaleString()}</p>
                  <p className="text-[10px] text-rose-600 font-medium">Total Lives Impacted</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                  <Clock className="w-5 h-5 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-700">{metrics.totalHours.toLocaleString()}</p>
                  <p className="text-[10px] text-blue-600 font-medium">Total Hours Invested</p>
                </div>
              </div>

              {/* Performance Benchmarks */}
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-700 text-sm mb-3">Performance Context</h4>
                <p className="text-sm text-slate-600 mb-3">
                  Your organization impacts <span className="font-bold text-rose-600">
                    {metrics.totalHours > 0 ? formatDecimal(totalPeopleImpacted / metrics.totalHours) : 0} lives
                  </span> for every hour volunteered.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      metrics.totalHours > 0 && (totalPeopleImpacted / metrics.totalHours) >= 3 ? 'bg-emerald-500' : 'bg-slate-300'
                    }`} />
                    <span className="text-xs text-slate-600">Excellent: 3+ lives/hour</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      metrics.totalHours > 0 && (totalPeopleImpacted / metrics.totalHours) >= 1.5 && (totalPeopleImpacted / metrics.totalHours) < 3 ? 'bg-amber-500' : 'bg-slate-300'
                    }`} />
                    <span className="text-xs text-slate-600">Good: 1.5-3 lives/hour</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      metrics.totalHours > 0 && (totalPeopleImpacted / metrics.totalHours) < 1.5 ? 'bg-blue-500' : 'bg-slate-300'
                    }`} />
                    <span className="text-xs text-slate-600">Building: &lt;1.5 lives/hour</span>
                  </div>
                </div>
              </div>

              {/* Breakdown by Project */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-rose-600" />
                  Impact Efficiency Metrics
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Lives per Volunteer</span>
                    <span className="text-sm font-bold text-purple-600">
                      {metrics.activeVolunteers > 0 ? Math.round(totalPeopleImpacted / metrics.activeVolunteers) : 0}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${Math.min((totalPeopleImpacted / Math.max(metrics.activeVolunteers, 1)) / 100 * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Lives per Project</span>
                    <span className="text-sm font-bold text-teal-600">
                      {metrics.activeProjects > 0 ? Math.round(totalPeopleImpacted / metrics.activeProjects) : 0}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${Math.min((totalPeopleImpacted / Math.max(metrics.activeProjects, 1)) / 500 * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Hours per Life Impacted</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {totalPeopleImpacted > 0 ? formatDecimal(metrics.totalHours / totalPeopleImpacted) : 0}h
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min((metrics.totalHours / Math.max(totalPeopleImpacted, 1)) / 2 * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Lower is more efficient</p>
                </div>
              </div>

              {/* Tips Section */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                <h4 className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Tips to Improve Impact ROI
                </h4>
                <ul className="text-[11px] text-slate-600 space-y-1">
                  <li>• Focus on high-reach projects (education, health campaigns)</li>
                  <li>• Train volunteers for efficient task completion</li>
                  <li>• Partner with established community organizations</li>
                  <li>• Track and report beneficiary impact accurately</li>
                </ul>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  setShowLivesPerHourModal(false);
                  navigate('/impact-report');
                }}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-medium text-sm hover:from-rose-600 hover:to-pink-700 transition-all"
              >
                View Full Impact Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Volunteer Profile Modal */}
      {showVolunteerProfileModal && selectedVolunteer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowVolunteerProfileModal(false)}>
          <div
            className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 p-4 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">Volunteer Profile</h3>
                <button
                  onClick={() => setShowVolunteerProfileModal(false)}
                  className="text-white/80 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Volunteer Header Card */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-xl flex-shrink-0 relative overflow-hidden">
                  {/* Always show initials as fallback */}
                  <span className="absolute inset-0 flex items-center justify-center">
                    {selectedVolunteer.displayName?.charAt(0)?.toUpperCase() || 'V'}
                  </span>
                  {/* Image overlays initials when loaded successfully */}
                  {selectedVolunteer.avatar && (
                    <img
                      src={selectedVolunteer.avatar}
                      alt={selectedVolunteer.displayName}
                      className="absolute inset-0 w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold text-lg truncate">{selectedVolunteer.displayName || 'Volunteer'}</h4>
                  <p className="text-purple-100 text-sm truncate">{selectedVolunteer.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-purple-200 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedVolunteer.hours}h total
                    </span>
                    <span className="text-purple-200 text-xs flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {selectedVolunteer.projectCount} projects
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Key Metrics Grid - Interactive */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setShowVolunteerProfileModal(false);
                    navigate(`/impact-report/${selectedVolunteer.id}`);
                  }}
                  className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 text-center border border-emerald-100 hover:shadow-md hover:border-emerald-300 transition-all active:scale-[0.98]"
                >
                  <Clock className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-emerald-700">{selectedVolunteer.hours}</p>
                  <p className="text-[10px] text-emerald-600">Hours</p>
                  <p className="text-[8px] text-emerald-500 mt-0.5">Tap for details →</p>
                </button>
                <button
                  onClick={() => {
                    setShowVolunteerProfileModal(false);
                    navigate('/tasks');
                  }}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 text-center border border-blue-100 hover:shadow-md hover:border-blue-300 transition-all active:scale-[0.98]"
                >
                  <CheckCircle className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-blue-700">{selectedVolunteer.tasksCompleted}</p>
                  <p className="text-[10px] text-blue-600">Tasks Done</p>
                  <p className="text-[8px] text-blue-500 mt-0.5">View tasks →</p>
                </button>
                <button
                  onClick={() => {
                    setShowVolunteerProfileModal(false);
                    navigate(`/impact-report/${selectedVolunteer.id}`);
                  }}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 text-center border border-purple-100 hover:shadow-md hover:border-purple-300 transition-all active:scale-[0.98]"
                >
                  <Award className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-purple-700">{formatDecimal(volunteerAiuData?.totalAiu || selectedVolunteer.hours * 0.1)}</p>
                  <p className="text-[10px] text-purple-600">AIU Earned</p>
                  <p className="text-[8px] text-purple-500 mt-0.5">Impact report →</p>
                </button>
              </div>

              {/* Economic Value */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  Economic Contribution
                </h4>
                <p className="text-2xl font-bold text-amber-700">${Math.round(selectedVolunteer.hours * 34.79).toLocaleString()}</p>
                <p className="text-[10px] text-amber-600 mt-1">Based on {selectedVolunteer.hours} hours × $34.79/hr (Independent Sector 2025)</p>
              </div>

              {/* Skills */}
              {selectedVolunteer.skills && selectedVolunteer.skills.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVolunteer.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-slate-700 rounded-full text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {selectedVolunteer.projects && selectedVolunteer.projects.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
                    <Briefcase className="w-4 h-4 text-emerald-500" />
                    Assigned Projects ({selectedVolunteer.projects.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedVolunteer.projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          setShowVolunteerProfileModal(false);
                          navigate(`/projects/${project.id}/pwa`);
                        }}
                        className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-left"
                      >
                        <span className="text-sm text-slate-700 font-medium truncate">{project.name}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity History */}
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Recent Activity
                </h4>
                {volunteerActivities.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No activity records yet</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {volunteerActivities.slice(0, 10).map((activity: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 font-medium truncate">{activity.description || 'Activity logged'}</p>
                          <p className="text-[10px] text-slate-500">
                            {activity.activityDate ? new Date(activity.activityDate).toLocaleDateString() : 'Date unknown'}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600 flex-shrink-0">{activity.hours || 0}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Performance Summary - Interactive */}
              <button
                onClick={() => {
                  setShowVolunteerProfileModal(false);
                  navigate(`/impact-report/${selectedVolunteer.id}`);
                }}
                className="w-full text-left bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-4 border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all active:scale-[0.99]"
              >
                <h4 className="text-sm font-semibold text-slate-800 flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    Performance Summary
                  </span>
                  <span className="text-[9px] text-indigo-500 font-medium">View Full Report →</span>
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Hours Contributed</span>
                      <span className="font-medium text-slate-800">{selectedVolunteer.hours}h</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                        style={{ width: `${Math.min((selectedVolunteer.hours / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Task Completion Rate</span>
                      <span className="font-medium text-slate-800">
                        {selectedVolunteer.tasksCompleted > 0 ? '100%' : '0%'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                        style={{ width: selectedVolunteer.tasksCompleted > 0 ? '100%' : '0%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Project Engagement</span>
                      <span className="font-medium text-slate-800">{selectedVolunteer.projectCount} projects</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"
                        style={{ width: `${Math.min((selectedVolunteer.projectCount / 5) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowVolunteerProfileModal(false);
                    navigate('/organization-messages/pwa');
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Send Message
                </button>
                <button
                  onClick={() => {
                    setShowVolunteerProfileModal(false);
                    // Navigate to volunteers page - the volunteer profile modal can be viewed there
                    navigate('/volunteers');
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium text-sm hover:from-purple-600 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  All Volunteers
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
