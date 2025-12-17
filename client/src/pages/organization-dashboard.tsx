import React, { lazy, Suspense, Component, type ReactNode, memo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  FolderOpen, Clock, Target, Users, Plus,
  ChevronDown, ChevronRight, AlertTriangle, CheckSquare, TrendingUp,
  Lightbulb, MapPin, UserPlus, BarChart3, X, MoreVertical,
  Bell, Settings, User, LogOut, FileText, Award, Zap,
  Activity, Shield, ShieldCheck, Eye, ThumbsUp, Info,
  Sparkles, CircleDot
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

// Error Boundary for lazy-loaded components
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class LazyErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
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

// Direct import of map components to prevent re-initialization issues
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

// Map skeleton for loading state
const MapSkeleton = () => (
  <div className="h-64 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">
    <div className="text-slate-400 text-sm">Loading map...</div>
  </div>
);
import { getSDGName, SDG_GOALS, getSDGColor } from "@shared/sdg-goals";
import OrganizationHeader from "@/components/layout/organization-header";
import MobileMetricsGrid from "@/components/layout/mobile-metrics-grid";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import OfflineBanner from "@/components/layout/offline-banner";
import Footer from "@/components/layout/footer";
import sdg1 from "@assets/E_SDG_PRINT-01_1762550174893.jpg";
import sdg2 from "@assets/E_SDG_PRINT-02_1762550174896.jpg";
import sdg3 from "@assets/E_SDG_PRINT-03_1762550174898.jpg";
import sdg4 from "@assets/E_SDG_PRINT-04_1762550174899.jpg";
import sdg5 from "@assets/E_SDG_PRINT-05_1762550174900.jpg";
import sdg6 from "@assets/E_SDG_PRINT-06_1762550174902.jpg";
import sdg7 from "@assets/E_SDG_PRINT-07_1762550174903.jpg";
import sdg8 from "@assets/E_SDG_PRINT-08_1762550174904.jpg";
import sdg9 from "@assets/E_SDG_PRINT-09_1762550174905.jpg";
import sdg10 from "@assets/E_SDG_PRINT-10_1762550174906.jpg";
import sdg11 from "@assets/E_SDG_PRINT-11_1762550174908.jpg";
import sdg12 from "@assets/E_SDG_PRINT-12_1762550174909.jpg";
import sdg13 from "@assets/E_SDG_PRINT-13_1762550174910.jpg";
import sdg14 from "@assets/E_SDG_PRINT-14_1762550174911.jpg";
import sdg15 from "@assets/E_SDG_PRINT-15_1762550174912.jpg";
import sdg16 from "@assets/E_SDG_PRINT-16_1762550174914.jpg";
import sdg17 from "@assets/E_SDG_PRINT-17_1762550174915.jpg";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const SDG_ICONS: Record<number, string> = {
  1: sdg1, 2: sdg2, 3: sdg3, 4: sdg4, 5: sdg5,
  6: sdg6, 7: sdg7, 8: sdg8, 9: sdg9, 10: sdg10,
  11: sdg11, 12: sdg12, 13: sdg13, 14: sdg14, 15: sdg15,
  16: sdg16, 17: sdg17,
};

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface DashboardData {
  keyMetrics: {
    activeProjects: number;
    totalProjects: number;
    totalHours: number;
    sdgsAddressed: number;
    aiuEarned: number; // Replaced livesTouched with AIU
    activeVolunteers: number;
  };
  sdgDistribution: Array<{ goal: number; hours: number; projects: number; volunteers: number }>;
  projectLocations: Array<{ id: number; name: string; location: string; status: string; sdgGoals: number[] }>;
  alerts: Array<{ id: string; type: string; title: string; message: string; severity: string }>;
  impactOverTime: Array<{ month: string; hours: number; peopleImpacted: number; volunteers: number }>;
  aiInsights: Array<{ id: string; type: string; title: string; message: string; sentiment: string }>;
  projects: Array<{ id: number; name: string; status: string; completionPercentage: number; sdgGoals: number[] }>;
  volunteerSummaries: Array<{ id: number; name: string; avatar?: string; hours: number; projects: number }>;
  pendingTasks: Array<{ id: number; title: string; status: string; projectId?: number }>;
  quickActions: Array<{ id: string; label: string; icon: string }>;
  filters: {
    projectId: string;
    timePeriod: string;
    availableProjects: Array<{ id: number; name: string }>;
  };
}

const TIME_PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '1y', label: 'Last Year' },
];

export default function OrganizationDashboard() {
  const [, navigate] = useLocation();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const userType = localStorage.getItem('userType');
  const userId = localStorage.getItem('currentUserId');

  const [projectFilter, setProjectFilter] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [sdgFilter, setSdgFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeModal, setActiveModal] = useState<'projects' | 'hours' | 'sdgs' | 'lives' | 'aiu' | 'volunteers' | 'tasks' | 'engagement' | 'team' | 'impact' | 'verification' | null>(null);
  const [hoveredSDG, setHoveredSDG] = useState<number | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showVolunteerManagement, setShowVolunteerManagement] = useState(false);
  const [showEngagementDetails, setShowEngagementDetails] = useState(false);

  // Check if user is an organization user (used for query enabled flags)
  const isOrganizationUser = userType === 'organization';

  const { data: dashboardData, isLoading, isFetching, refetch: refetchDashboard } = useQuery<DashboardData>({
    queryKey: ['/api/organization/dashboard', userId, projectFilter, timePeriod, sdgFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ userId: userId || '' });
      if (projectFilter !== 'all') params.append('projectId', projectFilter);
      if (timePeriod !== 'all') params.append('timePeriod', timePeriod);
      if (sdgFilter) params.append('sdgGoal', sdgFilter);
      const response = await fetch(`/api/organization/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    },
    enabled: !!userId && isOrganizationUser,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Poll every 30 seconds for real-time volunteer updates
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  const { data: currentUser } = useQuery({
    queryKey: ['/api/users/me', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId && isOrganizationUser,
  });

  const { data: organizationProfile } = useQuery({
    queryKey: ['/api/intake/organization-profile', currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(`/api/intake/organization-profile?organizationId=${currentUser.organizationId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser?.organizationId && isOrganizationUser,
  });

  const { data: organization } = useQuery({
    queryKey: ['/api/organizations', currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(`/api/organizations/${currentUser.organizationId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser?.organizationId && isOrganizationUser,
  });

  // Fetch pending applications for the organization
  const { data: pendingApplications, refetch: refetchApplications } = useQuery({
    queryKey: ['/api/applications', currentUser?.organizationId, 'pending'],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch(`/api/applications?organizationId=${currentUser.organizationId}`);
      if (!response.ok) return [];
      const allApplications = await response.json();
      return allApplications.filter((app: any) => app.status === 'pending');
    },
    enabled: !!currentUser?.organizationId && isOrganizationUser,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Poll every 30 seconds for new volunteer applications
    staleTime: 10000,
  });

  // Fetch tasks for the organization - filtered by selected project
  const { data: tasksData } = useQuery({
    queryKey: ['/api/tasks', currentUser?.organizationId, projectFilter],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const params = new URLSearchParams({ organizationId: String(currentUser.organizationId) });
      if (projectFilter && projectFilter !== 'all') {
        params.append('projectId', projectFilter);
      }
      const response = await fetch(`/api/tasks?${params}`);
      if (!response.ok) return [];
      const tasks = await response.json();
      // Filter by project if specified
      if (projectFilter && projectFilter !== 'all') {
        return tasks.filter((t: any) => String(t.projectId) === projectFilter);
      }
      return tasks;
    },
    enabled: !!currentUser?.organizationId && isOrganizationUser,
  });

  // Fetch pending AIU verifications - filtered by selected project
  const { data: pendingVerifications, refetch: refetchVerifications } = useQuery({
    queryKey: ['/api/project-impacts/pending', currentUser?.organizationId, projectFilter],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      // Get all project impacts for organization projects that need verification
      const response = await fetch(`/api/activities/project-impacts?organizationId=${currentUser.organizationId}`);
      if (!response.ok) return [];
      const allImpacts = await response.json();
      let filteredImpacts = allImpacts.filter((impact: any) =>
        impact.verificationStatus === 'pending' || impact.verificationStatus === 'self_reported'
      );
      // Filter by project if specified
      if (projectFilter && projectFilter !== 'all') {
        filteredImpacts = filteredImpacts.filter((i: any) => String(i.projectId) === projectFilter);
      }
      return filteredImpacts;
    },
    enabled: !!currentUser?.organizationId && isOrganizationUser,
  });

  // Fetch accurate AIU data from dedicated AIU endpoint (single source of truth)
  interface OrganizationAIUSummary {
    organizationId: number;
    organizationName: string;
    totalAiu: number;
    aiuUnique: number;
    aiuSessions: number;
    projectCount: number;
    volunteerCount: number;
    totalHours: number;
    livesImpacted: number;
    sdgsCovered: number[];
    verificationRate: number;
    projects: Array<{
      projectId: number;
      projectName: string;
      aiu: number;
      sdgIndicator: string;
      verificationStatus: string;
    }>;
  }

  const { data: organizationAIU } = useQuery<OrganizationAIUSummary | null>({
    queryKey: ['/api/aiu/organization', currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(`/api/aiu/organization/${currentUser.organizationId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser?.organizationId && isOrganizationUser,
  });

  // Memoized computed values - MUST be before any early returns
  const rawMetrics = useMemo(() =>
    dashboardData?.keyMetrics || { activeProjects: 0, totalHours: 0, sdgsAddressed: 0, aiuEarned: 0, activeVolunteers: 0, totalProjects: 0 },
    [dashboardData?.keyMetrics]
  );

  // Calculate AIU with fallback: prioritize dedicated AIU endpoint data
  // 1 AIU = 50 hours of volunteer work × SDG multiplier (up to 2x)
  const calculatedAiu = useMemo(() => {
    // Priority 1: Use dedicated AIU endpoint data (most accurate)
    if (organizationAIU?.totalAiu && organizationAIU.totalAiu > 0) {
      return organizationAIU.totalAiu;
    }
    // Priority 2: Use dashboard keyMetrics if available
    if (rawMetrics.aiuEarned && rawMetrics.aiuEarned > 0) {
      return rawMetrics.aiuEarned;
    }
    // Fallback: calculate from hours with SDG bonus
    if (rawMetrics.totalHours > 0) {
      const sdgMultiplier = Math.min(1 + (rawMetrics.sdgsAddressed * 0.1), 2.0);
      return Math.round((rawMetrics.totalHours / 50) * sdgMultiplier * 100) / 100;
    }
    // Also try summing from projects
    if (dashboardData?.projects && dashboardData.projects.length > 0) {
      const projectSum = dashboardData.projects.reduce((sum: number, p: any) => sum + (p.aiuEarned || 0), 0);
      if (projectSum > 0) return projectSum;
    }
    return 0;
  }, [organizationAIU?.totalAiu, rawMetrics.aiuEarned, rawMetrics.totalHours, rawMetrics.sdgsAddressed, dashboardData?.projects]);

  // Enhanced metrics with calculated AIU
  const metrics = useMemo(() => ({
    ...rawMetrics,
    aiuEarned: calculatedAiu
  }), [rawMetrics, calculatedAiu]);

  const sdgTotalHours = useMemo(() =>
    dashboardData?.sdgDistribution?.reduce((sum: number, item: any) => sum + item.hours, 0) || 0,
    [dashboardData?.sdgDistribution]
  );

  const avgProjectCompletion = useMemo(() =>
    dashboardData?.projects?.length
      ? Math.round(dashboardData.projects.reduce((sum: number, p: any) => sum + (p.completionPercentage || 0), 0) / dashboardData.projects.length)
      : 0,
    [dashboardData?.projects]
  );

  const sdgChartData = useMemo(() =>
    dashboardData?.sdgDistribution?.map(item => ({
      name: getSDGName(item.goal),
      hours: item.hours,
      goal: item.goal,
    })) || [],
    [dashboardData?.sdgDistribution]
  );

  // Task metrics
  const taskMetrics = useMemo(() => {
    const tasks = tasksData || dashboardData?.pendingTasks || [];
    const completed = tasks.filter((t: any) => t.status?.toLowerCase() === 'completed' || t.status?.toLowerCase() === 'done').length;
    const inProgress = tasks.filter((t: any) => t.status?.toLowerCase() === 'in progress' || t.status?.toLowerCase() === 'in_progress').length;
    const total = tasks.length;
    return { completed, inProgress, total, pending: total - completed - inProgress };
  }, [tasksData, dashboardData?.pendingTasks]);

  // Industry-Standard Engagement Score Calculation
  // Based on volunteer engagement frameworks (VolunteerHub, Galaxy Digital, Points of Light)
  // Weighted scoring: Activity (30%), Retention (25%), Impact (25%), Growth (20%)
  const engagementScore = useMemo(() => {
    const volunteers = dashboardData?.volunteerSummaries || [];
    const totalVolunteers = volunteers.length;

    // Calculate truly active volunteers (activity within last 30 days) from real data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeVolunteers = volunteers.filter((v: any) => {
      if (!v.lastActive) return false;
      return new Date(v.lastActive) >= thirtyDaysAgo;
    }).length;

    // 1. Activity Score (30% weight) - Based on hours logged relative to capacity
    // Industry benchmark: 4-8 hours per volunteer per month is "engaged"
    // Uses real totalHours from volunteer activities in database
    const avgHoursPerVolunteer = totalVolunteers > 0 ? metrics.totalHours / totalVolunteers : 0;
    const targetHoursPerVolunteer = 20; // Target 20 hours total
    const activityScore = Math.min(100, (avgHoursPerVolunteer / targetHoursPerVolunteer) * 100);

    // 2. Retention Score (25% weight) - Active (last 30 days) vs total volunteers
    // Industry benchmark: 60-70% retention is good
    // Uses real lastActive dates from volunteer activity records
    const retentionRate = totalVolunteers > 0 ? (activeVolunteers / totalVolunteers) * 100 : 0;
    const retentionScore = Math.min(100, (retentionRate / 70) * 100); // Normalize to 70% benchmark

    // 3. Impact Score (25% weight) - Based on project completion and SDG alignment
    // Uses real project completion percentages and SDG goals from database
    const completionScore = avgProjectCompletion || 0;
    const sdgCoverageScore = Math.min(100, (metrics.sdgsAddressed / 5) * 100); // 5 SDGs is excellent
    const impactScore = (completionScore + sdgCoverageScore) / 2;

    // 4. Growth Score (20% weight) - Based on task completion rate
    // Uses real task status from database (completed vs total tasks)
    const taskCompletionRate = taskMetrics.total > 0 ? (taskMetrics.completed / taskMetrics.total) * 100 : 0;
    const growthScore = Math.min(100, taskCompletionRate);

    // Weighted total
    const totalScore = Math.round(
      (activityScore * 0.30) +
      (retentionScore * 0.25) +
      (impactScore * 0.25) +
      (growthScore * 0.20)
    );

    // Determine level
    let level: 'excellent' | 'good' | 'moderate' | 'needs_attention' | 'critical';
    if (totalScore >= 80) level = 'excellent';
    else if (totalScore >= 60) level = 'good';
    else if (totalScore >= 40) level = 'moderate';
    else if (totalScore >= 20) level = 'needs_attention';
    else level = 'critical';

    return {
      total: totalScore,
      level,
      breakdown: {
        activity: Math.round(activityScore),
        retention: Math.round(retentionScore),
        impact: Math.round(impactScore),
        growth: Math.round(growthScore),
      },
      details: {
        avgHoursPerVolunteer: Math.round(avgHoursPerVolunteer * 10) / 10,
        retentionRate: Math.round(retentionRate),
        completionRate: avgProjectCompletion,
        taskCompletionRate: Math.round(taskCompletionRate),
        activeVolunteers,
        totalVolunteers,
      }
    };
  }, [dashboardData?.volunteerSummaries, metrics, avgProjectCompletion, taskMetrics]);

  // Memoized callbacks - MUST be before any early returns
  const handleQuickActionMemo = useCallback((actionId: string) => {
    if (actionId === 'create-project') {
      navigate('/projects?create=true');
    } else if (actionId === 'invite-volunteer') {
      navigate('/volunteers?invite=true');
    } else if (actionId === 'create-task') {
      navigate('/tasks?create=true');
    } else if (actionId === 'view-reports') {
      navigate('/impact-visualization');
    }
  }, [navigate]);

  // Redirect non-organization users using useEffect to avoid hook order issues
  useEffect(() => {
    if (!isOrganizationUser) {
      if (userType === 'volunteer') {
        navigate('/volunteer-dashboard');
      } else if (userType === 'corporate-partner') {
        navigate('/csr-dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isOrganizationUser, userType, navigate]);

  // Show nothing while redirecting non-organization users
  if (!isOrganizationUser) {
    return null;
  }

  if (isLoading) {
    return (
      <div style={{ height: '100vh', backgroundColor: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #166534', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280' }}>Loading dashboard...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto', backgroundColor: '#f9fafb', paddingBottom: '180px' }} data-testid="organization-dashboard">
      {/* Offline Banner */}
      <OfflineBanner />
      
      {/* Reusable Organization Header Component */}
      <OrganizationHeader activeTab="dashboard" onCreateClick={() => setShowCreateModal(true)} />

      {/* Welcome Banner - Desktop Only */}
      <div className="hidden md:block" style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>
            Welcome Back, {organization?.name || organizationProfile?.organizationName || 'Organization'}
          </h1>
          <button
            onClick={() => navigate('/overview')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#166534',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            data-testid="button-overview"
          >
            <Lightbulb size={18} />
            Unlock Your Team's Potential
          </button>
        </div>
      </div>

      {/* Mobile Dashboard Header with Three-Dot Menu */}
      <div className="md:hidden" style={{ padding: '16px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: 0, marginBottom: '4px' }}>
            Organization Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Welcome to {organization?.name || organizationProfile?.organizationName || 'Synerxus'}
          </p>
        </div>
        {/* Three-Dot Menu Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            data-testid="mobile-menu-trigger"
            style={{
              padding: '8px',
              backgroundColor: showMobileMenu ? '#f3f4f6' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MoreVertical size={20} color="#374151" />
          </button>

          {/* Mobile Dropdown Menu */}
          {showMobileMenu && (
            <>
              {/* Backdrop */}
              <div
                onClick={() => setShowMobileMenu(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 40,
                }}
              />
              {/* Menu */}
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  border: '1px solid #e5e7eb',
                  minWidth: '200px',
                  zIndex: 50,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => { setShowMobileMenu(false); }}
                  data-testid="mobile-menu-notifications"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#374151',
                    textAlign: 'left',
                  }}
                >
                  <Bell size={18} color="#6b7280" />
                  Notifications
                </button>
                <button
                  onClick={() => { navigate('/applications'); setShowMobileMenu(false); }}
                  data-testid="mobile-menu-applications"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#374151',
                    textAlign: 'left',
                  }}
                >
                  <FileText size={18} color="#6b7280" />
                  Applications
                </button>
                <button
                  onClick={() => { navigate('/organization-profile-settings'); setShowMobileMenu(false); }}
                  data-testid="mobile-menu-settings"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#374151',
                    textAlign: 'left',
                  }}
                >
                  <Settings size={18} color="#6b7280" />
                  Settings
                </button>
                <button
                  onClick={() => { navigate('/profile'); setShowMobileMenu(false); }}
                  data-testid="mobile-menu-profile"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#374151',
                    textAlign: 'left',
                  }}
                >
                  <User size={18} color="#6b7280" />
                  Profile
                </button>
                <button
                  onClick={async () => {
                    try {
                      await signOut();
                      toast({
                        title: "Signed out successfully",
                        description: "You have been signed out of your account.",
                      });
                      setShowMobileMenu(false);
                      navigate('/landing');
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to sign out. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  data-testid="mobile-menu-logout"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#dc2626',
                    textAlign: 'left',
                  }}
                >
                  <LogOut size={18} color="#dc2626" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Metrics Grid - 2x2 at top */}
      {metrics && <MobileMetricsGrid 
        activeProjects={metrics.activeProjects} 
        totalHours={metrics.totalHours} 
        sdgsAddressed={metrics.sdgsAddressed} 
        aiuEarned={metrics.aiuEarned}
        onActiveProjectsClick={() => setActiveModal('projects')}
        onTotalHoursClick={() => setActiveModal('hours')}
        onSdgsClick={() => setActiveModal('sdgs')}
        onAiuClick={() => setActiveModal('aiu')}
      />}

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 24px' }} className="md:p-6">
        {/* Filters Section - Desktop Only */}
        <div className="hidden md:flex" style={{ flexWrap: 'wrap', gap: '16px', marginBottom: '24px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>Project:</label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                data-testid="filter-project"
                style={{
                  padding: '8px 32px 8px 12px',
                  border: projectFilter !== 'all' ? '2px solid #166534' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: projectFilter !== 'all' ? '#f0fdf4' : 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                  fontWeight: projectFilter !== 'all' ? '600' : '400',
                  transition: 'all 0.2s',
                }}
              >
                <option value="all">All Projects</option>
                {dashboardData?.filters?.availableProjects?.map((p) => (
                  <option key={p.id} value={p.id.toString()}>{p.name}</option>
                ))}
              </select>
              {/* Loading indicator when data is refreshing */}
              {isFetching && !isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#dbeafe', borderRadius: '6px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid #3b82f6',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: '500' }}>Updating...</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>Time Period:</label>
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                data-testid="filter-time-period"
                style={{
                  padding: '8px 32px 8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                }}
              >
                {TIME_PERIODS.map((period) => (
                  <option key={period.value} value={period.value}>{period.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>SDG:</label>
              <select
                value={sdgFilter}
                onChange={(e) => setSdgFilter(e.target.value)}
                data-testid="filter-sdg"
                style={{
                  padding: '8px 32px 8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                }}
              >
                <option value="">All SDGs</option>
                {/* Show only organization's selected/committed SDGs */}
                {(organizationProfile?.sdgGoals || dashboardData?.sdgDistribution?.map((s: any) => s.goal) || []).map((sdg: number) => (
                  <option key={sdg} value={sdg.toString()}>SDG {sdg}: {getSDGName(sdg)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right side buttons */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setShowVolunteerManagement(!showVolunteerManagement)}
              style={{
                padding: '10px 16px',
                backgroundColor: showVolunteerManagement ? '#166534' : '#f0fdf4',
                color: showVolunteerManagement ? 'white' : '#166534',
                border: '1px solid #166534',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              data-testid="button-volunteer-management"
            >
              <Users size={16} />
              Volunteer Management
            </button>
            <button
              onClick={() => navigate('/impact-visualization')}
              style={{
                padding: '10px 16px',
                backgroundColor: '#166534',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              data-testid="button-impact-report"
            >
              <FileText size={16} />
              Impact Visualization
            </button>
          </div>
        </div>

        {/* Mobile Impact Metrics Card */}
        <div className="md:hidden" style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Award size={16} style={{ color: '#7c3aed' }} />
              Impact Metrics
            </h3>
            <button
              onClick={() => navigate('/impact-visualization')}
              style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Details →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <div style={{ padding: '12px', backgroundColor: '#faf5ff', borderRadius: '10px' }}>
              <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 4px 0' }}>SDGs Addressed</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#7c3aed', margin: 0 }}>{metrics.sdgsAddressed}</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '10px' }}>
              <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 4px 0' }}>Avg Completion</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#166534', margin: 0 }}>{avgProjectCompletion}%</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}>
              <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 4px 0' }}>Active Projects</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#1e40af', margin: 0 }}>{metrics.activeProjects}</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}>
              <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 4px 0' }}>Total AIUs</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#d97706', margin: 0 }}>{typeof metrics.aiuEarned === 'number' ? metrics.aiuEarned.toFixed(1) : metrics.aiuEarned}</p>
            </div>
          </div>
        </div>

        {/* Mobile Impact Visualization Button */}
        <button
          className="md:hidden"
          onClick={() => navigate('/impact-visualization')}
          style={{
            width: '100%',
            background: 'linear-gradient(to right, #8b5cf6, #6366f1)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} style={{ color: 'white' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ color: 'white', fontWeight: '600', fontSize: '14px', margin: 0 }}>Impact Visualization</p>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', margin: 0 }}>View detailed impact analytics</p>
            </div>
          </div>
          <ChevronRight size={20} style={{ color: 'white' }} />
        </button>

        {/* Mobile AI Insights Section */}
        <div className="md:hidden" style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Lightbulb size={16} style={{ color: '#f59e0b' }} />
            AI Insights & Suggestions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dashboardData?.aiInsights?.slice(0, 3).map((insight: any) => (
              <div
                key={insight.id}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: insight.sentiment === 'positive' ? '#f0fdf4' : insight.sentiment === 'warning' ? '#fffbeb' : '#f9fafb',
                  borderLeft: `4px solid ${insight.sentiment === 'positive' ? '#166534' : insight.sentiment === 'warning' ? '#f59e0b' : '#6b7280'}`,
                }}
              >
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>{insight.title}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{insight.message}</p>
              </div>
            ))}
            {(!dashboardData?.aiInsights || dashboardData.aiInsights.length === 0) && (
              <div style={{ textAlign: 'center', padding: '16px', color: '#9ca3af' }}>
                <Lightbulb size={20} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <p style={{ fontSize: '12px', margin: 0 }}>No insights available yet</p>
                <p style={{ fontSize: '10px', marginTop: '4px' }}>Insights will appear as your projects progress</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile SDG Distribution Doughnut Chart */}
        <div className="md:hidden" style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '12px', textAlign: 'center' }}>SDG Impact Distribution</h3>
          <div style={{ height: '280px', position: 'relative' }}>
            {dashboardData?.sdgDistribution && dashboardData.sdgDistribution.length > 0 ? (
              <>
                {/* Center Label - SDG Coverage */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -60%)',
                  textAlign: 'center',
                  zIndex: 0,
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#166534', lineHeight: 1 }}>
                    {dashboardData.sdgDistribution?.length || 0}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500', marginTop: '2px' }}>
                    Active SDGs
                  </div>
                  <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '1px' }}>
                    of 17 goals
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.sdgDistribution}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      fill="#8884d8"
                      dataKey="hours"
                      stroke="white"
                      strokeWidth={2}
                    >
                      {dashboardData.sdgDistribution.map((entry: any) => (
                        <Cell key={`cell-${entry.goal}`} fill={getSDGColor(entry.goal)} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const sdgInfo = SDG_GOALS[data.goal];
                          const total = dashboardData.sdgDistribution.reduce((sum: number, item: any) => sum + item.hours, 0);
                          const percent = ((data.hours / total) * 100).toFixed(1);
                          return (
                            <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', border: `2px solid ${getSDGColor(data.goal)}` }}>
                              <p style={{ fontWeight: '700', marginBottom: '6px', fontSize: '13px', color: getSDGColor(data.goal) }}>{sdgInfo?.name || `SDG ${data.goal}`}</p>
                              <p style={{ fontSize: '12px', color: '#374151', margin: '2px 0' }}><strong>{data.hours}</strong> hours ({percent}%)</p>
                              <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0' }}>{data.projects} projects • {data.volunteers || 0} volunteers</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom"
                      wrapperStyle={{ fontSize: '9px', paddingTop: '4px' }}
                      formatter={(value, entry: any) => {
                        const sdg = entry.payload;
                        const total = dashboardData.sdgDistribution.reduce((sum: number, item: any) => sum + item.hours, 0);
                        const percent = total > 0 ? Math.round((sdg.hours / total) * 100) : 0;
                        return <span style={{ color: '#374151', fontSize: '9px', fontWeight: '500' }}>SDG {sdg.goal} ({percent}%)</span>;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                No SDG data available
              </div>
            )}
          </div>
        </div>

        {/* Mobile Quick Actions */}
        <div className="md:hidden" style={{ backgroundColor: 'white', borderRadius: '16px', padding: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', position: 'relative', zIndex: 10 }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '8px', paddingLeft: '4px' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            <button
              onClick={() => navigate('/my-work?create=true')}
              onTouchEnd={(e) => { e.preventDefault(); navigate('/my-work?create=true'); }}
              style={{
                padding: '12px 4px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                color: '#374151',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'rgba(102, 126, 234, 0.3)',
                minHeight: '60px',
              }}
              data-testid="quick-action-create-project"
            >
              <Plus size={16} style={{ color: '#667eea' }} />
              New Project
            </button>
            <button
              onClick={() => navigate('/volunteers?invite=true')}
              onTouchEnd={(e) => { e.preventDefault(); navigate('/volunteers?invite=true'); }}
              style={{
                padding: '12px 4px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                color: '#374151',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'rgba(118, 75, 162, 0.3)',
                minHeight: '60px',
              }}
              data-testid="quick-action-invite-volunteer"
            >
              <UserPlus size={16} style={{ color: '#764ba2' }} />
              Invite Vol
            </button>
            <button
              onClick={() => navigate('/tasks?create=true')}
              onTouchEnd={(e) => { e.preventDefault(); navigate('/tasks?create=true'); }}
              style={{
                padding: '12px 4px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                color: '#374151',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'rgba(240, 147, 251, 0.3)',
                minHeight: '60px',
              }}
              data-testid="quick-action-create-task"
            >
              <CheckSquare size={16} style={{ color: '#f093fb' }} />
              Create Task
            </button>
            <button
              onClick={() => navigate('/impact-visualization')}
              onTouchEnd={(e) => { e.preventDefault(); navigate('/impact-visualization'); }}
              style={{
                padding: '12px 4px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                color: '#374151',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'rgba(16, 185, 129, 0.3)',
                minHeight: '60px',
              }}
              data-testid="quick-action-view-reports"
            >
              <BarChart3 size={16} style={{ color: '#10b981' }} />
              View Reports
            </button>
          </div>
        </div>

        {/* Selected Project Banner - Shows when a specific project is selected */}
        {projectFilter !== 'all' && (
          <div className="hidden md:flex" style={{
            marginBottom: '16px',
            padding: '12px 20px',
            backgroundColor: '#f0fdf4',
            border: '2px solid #166534',
            borderRadius: '10px',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FolderOpen size={20} style={{ color: '#166534' }} />
              <div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Viewing data for:</p>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#166534', margin: 0 }}>
                  {dashboardData?.filters?.availableProjects?.find(p => p.id.toString() === projectFilter)?.name || 'Selected Project'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isFetching && (
                <span style={{ fontSize: '12px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    border: '2px solid #3b82f6',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Refreshing...
                </span>
              )}
              <button
                onClick={() => navigate(`/projects/${projectFilter}`)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#166534',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                View Project Details →
              </button>
              <button
                onClick={() => setProjectFilter('all')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Clear Filter
              </button>
            </div>
          </div>
        )}

        {/* Desktop Key Metrics Section - Primary KPIs */}
        <div className="hidden md:grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <MetricCard
            icon={<Users size={24} />}
            label="Volunteers"
            value={metrics.activeVolunteers || dashboardData?.volunteerSummaries?.length || 0}
            color="#166534"
            testId="metric-volunteers"
            onClick={() => setActiveModal('team')}
            tooltip="Active volunteers contributing to your organization's projects"
          />
          <MetricCard
            icon={<Clock size={24} />}
            label="Hours Logged"
            value={metrics.totalHours}
            color="#1e40af"
            testId="metric-total-hours"
            onClick={() => setActiveModal('hours')}
            tooltip="Total volunteer hours logged across all projects"
          />
          <MetricCard
            icon={<CheckSquare size={24} />}
            label="Tasks Done"
            value={taskMetrics.completed}
            color="#7c3aed"
            testId="metric-tasks"
            onClick={() => setActiveModal('tasks')}
            tooltip={`${taskMetrics.completed} completed, ${taskMetrics.inProgress} in progress, ${taskMetrics.pending} pending`}
          />
          <MetricCard
            icon={<Zap size={24} />}
            label="AIUs Earned"
            value={typeof metrics.aiuEarned === 'number' ? metrics.aiuEarned.toFixed(1) : metrics.aiuEarned}
            color="#10b981"
            testId="metric-aiu"
            onClick={() => setActiveModal('aiu')}
            tooltip="Attributable Impact Units measure verified social impact"
          />
          <MetricCard
            icon={<Activity size={24} />}
            label="Engagement"
            value={`${engagementScore.total}%`}
            color={engagementScore.level === 'excellent' ? '#059669' : engagementScore.level === 'good' ? '#0369a1' : engagementScore.level === 'moderate' ? '#d97706' : '#dc2626'}
            testId="metric-engagement"
            onClick={() => setActiveModal('engagement')}
            tooltip={`Engagement level: ${engagementScore.level.replace('_', ' ')}`}
          />
        </div>

        {/* Secondary Row: Team Members, Impact Metrics, Pending Verifications */}
        <div className="hidden md:grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {/* Team Members Card - Interactive */}
          <button
            onClick={() => setActiveModal('team')}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '2px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#166534'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            data-testid="card-team-members"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Users size={18} style={{ color: '#166534' }} />
                Team Members
              </h3>
              <span style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>View All →</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '-8px', marginBottom: '12px' }}>
              {(dashboardData?.volunteerSummaries || []).slice(0, 5).map((vol: any, i: number) => (
                <div
                  key={vol.id}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: ['#166534', '#1e40af', '#7c3aed', '#d97706', '#dc2626'][i % 5],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: '2px solid white',
                    marginLeft: i > 0 ? '-8px' : 0,
                    zIndex: 5 - i,
                  }}
                  title={vol.name}
                >
                  {vol.name?.charAt(0).toUpperCase()}
                </div>
              ))}
              {(dashboardData?.volunteerSummaries?.length || 0) > 5 && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: '11px',
                  fontWeight: '600',
                  border: '2px solid white',
                  marginLeft: '-8px',
                }}>
                  +{(dashboardData?.volunteerSummaries?.length || 0) - 5}
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
                <p style={{ fontSize: '18px', fontWeight: '700', color: '#166534', margin: 0 }}>{metrics.activeVolunteers || 0}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Active</p>
              </div>
              <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
                <p style={{ fontSize: '18px', fontWeight: '700', color: '#1e40af', margin: 0 }}>{dashboardData?.volunteerSummaries?.length || 0}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Total</p>
              </div>
              <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                <p style={{ fontSize: '18px', fontWeight: '700', color: '#d97706', margin: 0 }}>{pendingApplications?.length || 0}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Pending</p>
              </div>
            </div>
          </button>

          {/* Impact Metrics Card - Interactive */}
          <button
            onClick={() => setActiveModal('impact')}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '2px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            data-testid="card-impact-metrics"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Award size={18} style={{ color: '#7c3aed' }} />
                Impact Metrics
              </h3>
              <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600' }}>Details →</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: '#faf5ff', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0' }}>SDGs Addressed</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed', margin: 0 }}>{metrics.sdgsAddressed}</p>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0' }}>Avg Completion</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#166534', margin: 0 }}>{avgProjectCompletion}%</p>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0' }}>Active Projects</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#1e40af', margin: 0 }}>{metrics.activeProjects}</p>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0' }}>Total AIUs</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#d97706', margin: 0 }}>{typeof metrics.aiuEarned === 'number' ? metrics.aiuEarned.toFixed(1) : metrics.aiuEarned}</p>
              </div>
            </div>
          </button>

          {/* Pending AIU Verification Card - Interactive */}
          <button
            onClick={() => setActiveModal('verification')}
            style={{
              backgroundColor: (pendingVerifications?.length || 0) > 0 ? '#fef3c7' : 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: (pendingVerifications?.length || 0) > 0 ? '2px solid #f59e0b' : '2px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            data-testid="card-pending-verification"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <ShieldCheck size={18} style={{ color: '#f59e0b' }} />
                Pending Verification
              </h3>
              {(pendingVerifications?.length || 0) > 0 && (
                <span style={{ backgroundColor: '#dc2626', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                  {pendingVerifications?.length || 0}
                </span>
              )}
            </div>
            {(pendingVerifications?.length || 0) > 0 ? (
              <>
                <p style={{ fontSize: '13px', color: '#92400e', marginBottom: '12px' }}>
                  {pendingVerifications?.length} impact record{(pendingVerifications?.length || 0) !== 1 ? 's' : ''} awaiting your review
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ padding: '6px 12px', backgroundColor: '#166534', color: 'white', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                    Review & Verify →
                  </span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <ShieldCheck size={32} style={{ color: '#10b981', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>All caught up! No pending verifications.</p>
              </div>
            )}
          </button>
        </div>

        {/* Volunteer Management Panel - Collapsible - Desktop Only */}
        {showVolunteerManagement && (
          <div className="hidden md:block" style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '2px solid #166534' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} />
                Volunteer Management Metrics
              </h3>
              <button onClick={() => setShowVolunteerManagement(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
              <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#166534', margin: 0 }}>{metrics.activeVolunteers || 0}</p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>Active Volunteers</p>
              </div>
              <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#1e40af', margin: 0 }}>
                  {dashboardData?.volunteerSummaries?.length || 0}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>Total Volunteers</p>
              </div>
              <div style={{ backgroundColor: '#fef3c7', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#d97706', margin: 0 }}>
                  {Math.round((dashboardData?.volunteerSummaries?.length || 0) / Math.max(1, metrics.activeProjects))}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>Avg per Project</p>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#059669', margin: 0 }}>
                  {pendingApplications?.length || 0}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>Pending Applications</p>
              </div>
              <div style={{ backgroundColor: '#faf5ff', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#7c3aed', margin: 0 }}>
                  {metrics.totalHours > 0 && dashboardData?.volunteerSummaries?.length
                    ? Math.round(metrics.totalHours / dashboardData.volunteerSummaries.length)
                    : 0}h
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>Avg Hours/Vol</p>
              </div>
            </div>
            {/* Top Contributors */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>Top Contributors</h4>
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
                {(dashboardData?.volunteerSummaries || []).slice(0, 5).map((vol: any) => (
                  <div key={vol.id} style={{ flex: '0 0 auto', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', minWidth: '140px', textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#16653420', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '16px', fontWeight: '600', color: '#166534' }}>
                      {vol.name?.charAt(0).toUpperCase()}
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>{vol.name}</p>
                    <p style={{ fontSize: '20px', fontWeight: '700', color: '#166534', margin: '4px 0 0 0' }}>{vol.hours}h</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Analytics Section - Desktop Only */}
        {/* Row 1: SDG Chart (2/3) | Active Projects (1/3) */}
        <div className="hidden md:grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* SDG Impact Distribution Chart - 2/3 Width */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>SDG Impact Distribution</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500', backgroundColor: '#f3f4f6', padding: '6px 12px', borderRadius: '20px' }}>
                  {dashboardData?.sdgDistribution?.reduce((sum: number, item: any) => sum + item.hours, 0) || 0} total hours
                </span>
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: '600', backgroundColor: '#f0fdf4', padding: '6px 12px', borderRadius: '20px' }}>
                  {organizationProfile?.sdgGoals?.length || dashboardData?.sdgDistribution?.length || 0} of {organizationProfile?.sdgGoals?.length || 17} SDGs committed
                </span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Pie Chart */}
              <div style={{ height: '350px', position: 'relative' }}>
                {dashboardData?.sdgDistribution && dashboardData.sdgDistribution.length > 0 ? (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: '45%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      zIndex: 0,
                      pointerEvents: 'none'
                    }}>
                      <div style={{ fontSize: '42px', fontWeight: '700', color: '#166534', lineHeight: 1 }}>
                        {dashboardData.sdgDistribution?.length || 0}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', marginTop: '4px' }}>
                        Active SDGs
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboardData.sdgDistribution.map(item => ({
                            ...item,
                            name: `SDG ${item.goal}`,
                            fullName: getSDGName(item.goal),
                            color: SDG_GOALS[item.goal]?.color || '#166534'
                          }))}
                          cx="50%"
                          cy="45%"
                          innerRadius={70}
                          outerRadius={120}
                          paddingAngle={2}
                          dataKey="hours"
                          nameKey="name"
                          stroke="white"
                          strokeWidth={2}
                        >
                          {dashboardData.sdgDistribution.map((entry) => (
                            <Cell
                              key={`cell-${entry.goal}`}
                              fill={SDG_GOALS[entry.goal]?.color || '#166534'}
                              stroke={hoveredSDG === entry.goal ? '#111827' : 'white'}
                              strokeWidth={hoveredSDG === entry.goal ? 4 : 3}
                              style={{ 
                                cursor: 'pointer',
                                filter: hoveredSDG === entry.goal ? 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'brightness(1)',
                                transition: 'all 0.2s ease-in-out'
                              }}
                              onMouseEnter={() => setHoveredSDG(entry.goal)}
                              onMouseLeave={() => setHoveredSDG(null)}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const sdgInfo = SDG_GOALS[data.goal];
                              const total = dashboardData.sdgDistribution.reduce((sum: number, item: any) => sum + item.hours, 0);
                              const percent = ((data.hours / total) * 100).toFixed(1);
                              return (
                                <div style={{ 
                                  backgroundColor: 'white', 
                                  padding: '16px', 
                                  borderRadius: '12px', 
                                  boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                                  border: `3px solid ${sdgInfo?.color || '#166534'}`,
                                  maxWidth: '340px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ 
                                      width: '40px', 
                                      height: '40px', 
                                      borderRadius: '10px', 
                                      backgroundColor: sdgInfo?.color || '#166534',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontSize: '16px',
                                      fontWeight: 'bold',
                                      flexShrink: 0
                                    }}>
                                      {data.goal}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <p style={{ fontWeight: '700', fontSize: '16px', color: '#111827', margin: '0 0 4px 0' }}>
                                        {sdgInfo?.name || `SDG ${data.goal}`}
                                      </p>
                                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0', lineHeight: '1.4' }}>
                                        {sdgInfo?.description}
                                      </p>
                                    </div>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', paddingTop: '12px', borderTop: `2px solid ${sdgInfo?.color || '#166534'}22` }}>
                                    <div style={{ textAlign: 'center' }}>
                                      <p style={{ fontSize: '20px', fontWeight: 'bold', color: sdgInfo?.color || '#166534', margin: '0' }}>{data.hours}</p>
                                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0', fontWeight: '500' }}>Hours</p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                      <p style={{ fontSize: '20px', fontWeight: 'bold', color: sdgInfo?.color || '#166534', margin: '0' }}>{data.projects}</p>
                                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0', fontWeight: '500' }}>Projects</p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                      <p style={{ fontSize: '20px', fontWeight: 'bold', color: sdgInfo?.color || '#166534', margin: '0' }}>{data.volunteers || 0}</p>
                                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0', fontWeight: '500' }}>Volunteers</p>
                                    </div>
                                  </div>
                                  <div style={{ marginTop: '10px', textAlign: 'center', padding: '8px', backgroundColor: `${sdgInfo?.color || '#166534'}11`, borderRadius: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: sdgInfo?.color || '#166534' }}>{percent}% of total impact</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          layout="horizontal"
                          verticalAlign="bottom"
                          height={50}
                          wrapperStyle={{ paddingTop: '16px', overflow: 'visible' }}
                          formatter={(value, entry: any) => {
                            const sdg = entry.payload;
                            const sdgInfo = SDG_GOALS[sdg.goal];
                            const total = dashboardData.sdgDistribution.reduce((sum: number, item: any) => sum + item.hours, 0);
                            const percent = total > 0 ? Math.round((sdg.hours / total) * 100) : 0;
                            return (
                              <span 
                                style={{ 
                                  color: hoveredSDG === sdg.goal ? '#111827' : '#4b5563',
                                  fontSize: '12px',
                                  fontWeight: hoveredSDG === sdg.goal ? '700' : '500',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  transition: 'all 0.2s ease',
                                  marginRight: '4px',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: hoveredSDG === sdg.goal ? `${sdgInfo?.color || '#166534'}15` : 'transparent',
                                  border: hoveredSDG === sdg.goal ? `1px solid ${sdgInfo?.color || '#166534'}40` : '1px solid transparent'
                                }}
                                onMouseEnter={() => setHoveredSDG(sdg.goal)}
                                onMouseLeave={() => setHoveredSDG(null)}
                                title={sdgInfo?.description}
                              >
                                SDG {sdg.goal} • {percent}%
                              </span>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                    No SDG data available
                  </div>
                )}
              </div>
              {/* SDG Alignment Percentages */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '350px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>SDG Alignment</h4>
                {dashboardData?.sdgDistribution?.map((sdg: any) => {
                  const total = sdgTotalHours || 1;
                  const percent = Math.round((sdg.hours / total) * 100);
                  return (
                    <div key={sdg.goal} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: SDG_GOALS[sdg.goal]?.color || '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
                        {sdg.goal}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#374151', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getSDGName(sdg.goal)}</p>
                        <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', backgroundColor: SDG_GOALS[sdg.goal]?.color || '#166534', width: `${percent}%`, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: SDG_GOALS[sdg.goal]?.color || '#166534', minWidth: '40px', textAlign: 'right' }}>{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Projects List - 1/3 Width */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>Active Projects</h3>
              <button
                onClick={() => navigate('/projects')}
                style={{ fontSize: '12px', color: '#166534', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
              >
                View All →
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '450px', overflowY: 'auto' }}>
              {dashboardData?.projects?.slice(0, 6).map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  style={{
                    padding: '14px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; e.currentTarget.style.borderColor = '#166534'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{project.name}</p>
                    <span style={{
                      fontSize: '10px', padding: '3px 8px', borderRadius: '12px',
                      backgroundColor: project.status?.toLowerCase() === 'active' || project.status?.toLowerCase() === 'in progress' ? '#dcfce7' : '#fef3c7',
                      color: project.status?.toLowerCase() === 'active' || project.status?.toLowerCase() === 'in progress' ? '#166534' : '#d97706'
                    }}>{project.status}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 2px 0' }}>Completion</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', backgroundColor: '#166534', width: `${project.completionPercentage || 0}%` }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#166534' }}>{project.completionPercentage || 0}%</span>
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 2px 0' }}>Volunteers</p>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: 0 }}>
                        {(project as any).volunteerCount || (project as any).volunteers?.length || 0}
                      </p>
                    </div>
                  </div>
                  {project.sdgGoals?.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {project.sdgGoals.slice(0, 3).map((g: number) => (
                        <span key={g} style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: SDG_GOALS[g]?.color || '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px', fontWeight: '700' }}>{g}</span>
                      ))}
                      {project.sdgGoals.length > 3 && <span style={{ fontSize: '10px', color: '#6b7280' }}>+{project.sdgGoals.length - 3}</span>}
                    </div>
                  )}
                </button>
              ))}
              {(!dashboardData?.projects || dashboardData.projects.length === 0) && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                  <FolderOpen size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p style={{ fontSize: '13px', marginBottom: '12px' }}>No projects yet</p>
                  <button onClick={() => navigate('/projects?create=true')} style={{ padding: '8px 16px', backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Create Project</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Insights & Alerts Section - Full Width - Desktop Only */}
        <div className="hidden md:grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* AI Insights */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={18} style={{ color: '#f59e0b' }} />
              AI Insights & Suggestions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dashboardData?.aiInsights?.slice(0, 4).map((insight) => (
                <div
                  key={insight.id}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: insight.sentiment === 'positive' ? '#f0fdf4' : insight.sentiment === 'warning' ? '#fffbeb' : '#f9fafb',
                    borderLeft: `4px solid ${insight.sentiment === 'positive' ? '#166534' : insight.sentiment === 'warning' ? '#f59e0b' : '#6b7280'}`,
                  }}
                >
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>{insight.title}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{insight.message}</p>
                </div>
              ))}
              {(!dashboardData?.aiInsights || dashboardData.aiInsights.length === 0) && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                  <Lightbulb size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p style={{ fontSize: '13px' }}>No insights available</p>
                </div>
              )}
              {/* Enhanced Engagement Score - Industry Standard Calculation */}
              <button
                onClick={() => setActiveModal('engagement')}
                style={{
                  marginTop: '8px',
                  padding: '14px',
                  backgroundColor: engagementScore.level === 'excellent' ? '#f0fdf4' : engagementScore.level === 'good' ? '#f0f9ff' : engagementScore.level === 'moderate' ? '#fef3c7' : '#fef2f2',
                  borderRadius: '10px',
                  border: `1px solid ${engagementScore.level === 'excellent' ? '#bbf7d0' : engagementScore.level === 'good' ? '#bae6fd' : engagementScore.level === 'moderate' ? '#fde68a' : '#fecaca'}`,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                data-testid="engagement-score-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <p style={{ fontSize: '12px', color: engagementScore.level === 'excellent' ? '#059669' : engagementScore.level === 'good' ? '#0369a1' : engagementScore.level === 'moderate' ? '#d97706' : '#dc2626', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} />
                    Engagement Score
                  </p>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: engagementScore.level === 'excellent' ? '#059669' : engagementScore.level === 'good' ? '#0369a1' : engagementScore.level === 'moderate' ? '#d97706' : '#dc2626',
                    color: 'white',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {engagementScore.level.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: engagementScore.level === 'excellent' ? '#059669' : engagementScore.level === 'good' ? '#0369a1' : engagementScore.level === 'moderate' ? '#d97706' : '#dc2626' }}>{engagementScore.total}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '8px', backgroundColor: engagementScore.level === 'excellent' ? '#bbf7d0' : engagementScore.level === 'good' ? '#e0f2fe' : engagementScore.level === 'moderate' ? '#fef3c7' : '#fecaca', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', backgroundColor: engagementScore.level === 'excellent' ? '#059669' : engagementScore.level === 'good' ? '#0369a1' : engagementScore.level === 'moderate' ? '#d97706' : '#dc2626', width: `${engagementScore.total}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                </div>
                {/* Mini breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                  {[
                    { label: 'Activity', value: engagementScore.breakdown.activity },
                    { label: 'Retention', value: engagementScore.breakdown.retention },
                    { label: 'Impact', value: engagementScore.breakdown.impact },
                    { label: 'Growth', value: engagementScore.breakdown.growth },
                  ].map((item) => (
                    <div key={item.label} style={{ textAlign: 'center' }}>
                      <div style={{
                        height: '4px',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        marginBottom: '2px'
                      }}>
                        <div style={{ height: '100%', backgroundColor: item.value >= 70 ? '#059669' : item.value >= 40 ? '#0369a1' : '#d97706', width: `${item.value}%` }} />
                      </div>
                      <span style={{ fontSize: '9px', color: '#6b7280' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '10px', color: '#6b7280', margin: '8px 0 0 0', textAlign: 'right' }}>Click for details →</p>
              </button>
            </div>
          </div>

          {/* Alerts & Tasks */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                Alerts & Tasks
              </h3>
              <button onClick={() => navigate('/tasks')} style={{ fontSize: '12px', color: '#166534', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>View All →</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dashboardData?.alerts?.slice(0, 3).map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => navigate(alert.type.includes('task') ? '/tasks' : '/projects')}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: alert.severity === 'high' ? '#fef2f2' : '#fffbeb',
                    borderLeft: `4px solid ${alert.severity === 'high' ? '#dc2626' : '#f59e0b'}`,
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>{alert.title}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{alert.message}</p>
                </button>
              ))}
              {(!dashboardData?.alerts || dashboardData.alerts.length === 0) && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                  <CheckSquare size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p style={{ fontSize: '13px' }}>All caught up!</p>
                </div>
              )}
            </div>
            {/* Pending Applications */}
            {pendingApplications && pendingApplications.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #059669' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#059669', margin: 0 }}>New Applications ({pendingApplications.length})</p>
                  <button onClick={() => navigate('/applications')} style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Review →</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map & Impact Over Time - Desktop Only */}
        <div className="hidden md:grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* Project Locations Map */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} style={{ color: '#166534' }} />
              Project Locations
            </h3>
            <div style={{ height: '300px', borderRadius: '10px', overflow: 'hidden' }}>
              <ProjectMapComponent projectLocations={dashboardData?.projectLocations || []} />
            </div>
          </div>

          {/* Impact Over Time */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: organizationProfile?.sdgGoals?.[0] ? getSDGColor(organizationProfile.sdgGoals[0]) : '#166534' }} />
              Impact Over Time
            </h3>
            <div style={{ height: '300px' }}>
              {dashboardData?.impactOverTime && dashboardData.impactOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData.impactOverTime}>
                    <defs>
                      <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={organizationProfile?.sdgGoals?.[0] ? getSDGColor(organizationProfile.sdgGoals[0]) : '#166534'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={organizationProfile?.sdgGoals?.[0] ? getSDGColor(organizationProfile.sdgGoals[0]) : '#166534'} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="peopleGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={organizationProfile?.sdgGoals?.[1] ? getSDGColor(organizationProfile.sdgGoals[1]) : '#1e40af'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={organizationProfile?.sdgGoals?.[1] ? getSDGColor(organizationProfile.sdgGoals[1]) : '#1e40af'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v) => v.split('-')[1]} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="hours" stroke={organizationProfile?.sdgGoals?.[0] ? getSDGColor(organizationProfile.sdgGoals[0]) : '#166534'} fill="url(#hoursGradient)" strokeWidth={2} name="Hours" />
                    <Area type="monotone" dataKey="peopleImpacted" stroke={organizationProfile?.sdgGoals?.[1] ? getSDGColor(organizationProfile.sdgGoals[1]) : '#1e40af'} fill="url(#peopleGradient)" strokeWidth={2} name="People Impacted" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                  No impact data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & Project Info - Bottom Row - Desktop Only */}
        <div className="hidden md:grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* Quick Actions Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: '#f59e0b' }} />
              Quick Actions
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <button
                onClick={() => navigate('/projects?create=true')}
                style={{
                  padding: '16px',
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #bbf7d0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dcfce7'; e.currentTarget.style.borderColor = '#166534'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; e.currentTarget.style.borderColor = '#bbf7d0'; }}
                data-testid="quick-action-new-project"
              >
                <FolderOpen size={20} style={{ color: '#166534' }} />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#166534', margin: 0 }}>New Project</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Start a new initiative</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/volunteers?invite=true')}
                style={{
                  padding: '16px',
                  backgroundColor: '#eff6ff',
                  border: '2px solid #bfdbfe',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; e.currentTarget.style.borderColor = '#1e40af'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                data-testid="quick-action-invite-volunteer"
              >
                <UserPlus size={20} style={{ color: '#1e40af' }} />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af', margin: 0 }}>Invite Volunteer</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Grow your team</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/tasks?create=true')}
                style={{
                  padding: '16px',
                  backgroundColor: '#faf5ff',
                  border: '2px solid #e9d5ff',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3e8ff'; e.currentTarget.style.borderColor = '#7c3aed'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#faf5ff'; e.currentTarget.style.borderColor = '#e9d5ff'; }}
                data-testid="quick-action-create-task"
              >
                <CheckSquare size={20} style={{ color: '#7c3aed' }} />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed', margin: 0 }}>Create Task</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Assign work</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/impact-visualization')}
                style={{
                  padding: '16px',
                  backgroundColor: '#fef3c7',
                  border: '2px solid #fde68a',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fde68a'; e.currentTarget.style.borderColor = '#d97706'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef3c7'; e.currentTarget.style.borderColor = '#fde68a'; }}
                data-testid="quick-action-view-reports"
              >
                <BarChart3 size={20} style={{ color: '#d97706' }} />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#d97706', margin: 0 }}>View Reports</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Analyze impact</p>
                </div>
              </button>
            </div>
          </div>

          {/* Project Info Summary Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={18} style={{ color: '#0369a1' }} />
                Organization Summary
              </h3>
              <button
                onClick={() => navigate('/organization-profile')}
                style={{ fontSize: '12px', color: '#0369a1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
              >
                Edit Profile →
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Organization</p>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>{organization?.name || organizationProfile?.organizationName || 'Your Organization'}</p>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Projects</p>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>{metrics.totalProjects || dashboardData?.projects?.length || 0}</p>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SDGs Committed</p>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {(organizationProfile?.sdgGoals || []).slice(0, 5).map((sdg: number) => (
                    <span key={sdg} style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: SDG_GOALS[sdg]?.color || '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: '700' }}>{sdg}</span>
                  ))}
                  {(organizationProfile?.sdgGoals?.length || 0) > 5 && (
                    <span style={{ fontSize: '11px', color: '#6b7280', alignSelf: 'center' }}>+{(organizationProfile?.sdgGoals?.length || 0) - 5}</span>
                  )}
                  {(!organizationProfile?.sdgGoals || organizationProfile.sdgGoals.length === 0) && (
                    <span style={{ fontSize: '13px', color: '#9ca3af' }}>Not set</span>
                  )}
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Impact Score</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#166534', margin: 0 }}>{typeof metrics.aiuEarned === 'number' ? metrics.aiuEarned.toFixed(1) : metrics.aiuEarned}</p>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>AIUs</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Create New</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => { setShowCreateModal(false); navigate('/projects?create=true'); }}
                data-testid="modal-create-project"
                style={{ padding: '12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }}
              >
                <FolderOpen size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                New Project
              </button>
              <button
                onClick={() => { setShowCreateModal(false); navigate('/opportunities?create=true'); }}
                data-testid="modal-create-opportunity"
                style={{ padding: '12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }}
              >
                <Target size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                New Opportunity
              </button>
              <button
                onClick={() => { setShowCreateModal(false); navigate('/tasks?create=true'); }}
                data-testid="modal-create-task"
                style={{ padding: '12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }}
              >
                <CheckSquare size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                New Task
              </button>
            </div>
            <button
              onClick={() => setShowCreateModal(false)}
              data-testid="modal-cancel"
              style={{ marginTop: '16px', width: '100%', padding: '12px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {activeModal === 'projects' && (
        <MetricsModal
          title="Active Projects"
          onClose={() => setActiveModal(null)}
          type="projects"
          data={dashboardData?.projects || []}
          color="#166534"
        />
      )}
      
      {activeModal === 'hours' && (
        <MetricsModal
          title="Total Volunteer Hours"
          onClose={() => setActiveModal(null)}
          type="hours"
          data={dashboardData?.impactOverTime || []}
          totalHours={metrics.totalHours}
          volunteers={dashboardData?.volunteerSummaries || []}
          color="#1e40af"
        />
      )}
      
      {activeModal === 'sdgs' && (
        <MetricsModal
          title="SDGs Addressed"
          onClose={() => setActiveModal(null)}
          type="sdgs"
          data={dashboardData?.sdgDistribution || []}
          color="#7c3aed"
        />
      )}
      
      {activeModal === 'aiu' && (
        <MetricsModal
          title="Attributable Impact Units (AIUs)"
          onClose={() => setActiveModal(null)}
          type="aiu"
          data={dashboardData?.projects?.slice(0, 10) || []}
          totalAiu={metrics.aiuEarned}
          organizationAIU={organizationAIU}
          color="#10b981"
        />
      )}

      {/* Tasks Modal */}
      {activeModal === 'tasks' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>Tasks Overview</h2>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '32px', fontWeight: '700', color: '#166534', margin: 0 }}>{taskMetrics.completed}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>Completed</p>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '32px', fontWeight: '700', color: '#1e40af', margin: 0 }}>{taskMetrics.inProgress}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>In Progress</p>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '32px', fontWeight: '700', color: '#d97706', margin: 0 }}>{taskMetrics.pending}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>Pending</p>
                </div>
              </div>
              <button
                onClick={() => { setActiveModal(null); navigate('/tasks'); }}
                style={{ width: '100%', padding: '12px', backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                Manage Tasks →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Score Modal */}
      {activeModal === 'engagement' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} />
                Engagement Score Details
              </h2>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {/* Main Score */}
              <div style={{ textAlign: 'center', marginBottom: '24px', padding: '24px', backgroundColor: engagementScore.level === 'excellent' ? '#f0fdf4' : engagementScore.level === 'good' ? '#f0f9ff' : engagementScore.level === 'moderate' ? '#fef3c7' : '#fef2f2', borderRadius: '12px' }}>
                <p style={{ fontSize: '64px', fontWeight: '700', color: engagementScore.level === 'excellent' ? '#059669' : engagementScore.level === 'good' ? '#0369a1' : engagementScore.level === 'moderate' ? '#d97706' : '#dc2626', margin: 0 }}>{engagementScore.total}</p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280', margin: '8px 0 0 0', textTransform: 'capitalize' }}>{engagementScore.level.replace('_', ' ')} Engagement</p>
              </div>

              {/* Breakdown */}
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Score Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Activity Score', value: engagementScore.breakdown.activity, weight: '30%', description: `${engagementScore.details.avgHoursPerVolunteer} avg hours per volunteer (target: 20 hrs)`, color: '#059669' },
                  { label: 'Retention Score', value: engagementScore.breakdown.retention, weight: '25%', description: `${engagementScore.details.activeVolunteers}/${engagementScore.details.totalVolunteers} volunteers active in last 30 days (${engagementScore.details.retentionRate}%)`, color: '#0369a1' },
                  { label: 'Impact Score', value: engagementScore.breakdown.impact, weight: '25%', description: `${engagementScore.details.completionRate}% avg project completion + SDG alignment`, color: '#7c3aed' },
                  { label: 'Growth Score', value: engagementScore.breakdown.growth, weight: '20%', description: `${engagementScore.details.taskCompletionRate}% task completion rate`, color: '#d97706' },
                ].map((item) => (
                  <div key={item.label} style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{item.label}</span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Weight: {item.weight}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', backgroundColor: item.color, width: `${item.value}%` }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: item.color, minWidth: '40px' }}>{item.value}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>{item.description}</p>
                  </div>
                ))}
              </div>

              {/* Industry Benchmarks Explanation */}
              <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', margin: '0 0 8px 0' }}>Industry-Standard Calculation</p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>
                  This engagement score follows volunteer management best practices from leading platforms.
                  <strong> Activity</strong> measures volunteer participation, <strong>Retention</strong> tracks active vs total volunteers,
                  <strong> Impact</strong> combines project completion and SDG alignment, and <strong>Growth</strong> reflects task completion rates.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Members Modal */}
      {activeModal === 'team' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>Team Members</h2>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '24px', fontWeight: '700', color: '#166534', margin: 0 }}>{metrics.activeVolunteers || 0}</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Active</p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '24px', fontWeight: '700', color: '#1e40af', margin: 0 }}>{dashboardData?.volunteerSummaries?.length || 0}</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Total</p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '24px', fontWeight: '700', color: '#d97706', margin: 0 }}>{pendingApplications?.length || 0}</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Pending</p>
                </div>
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Top Contributors</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {(dashboardData?.volunteerSummaries || []).map((vol: any) => (
                  <div key={vol.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600' }}>
                        {vol.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{vol.name}</p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{vol.projects || 0} projects</p>
                      </div>
                    </div>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: '#166534' }}>{vol.hours}h</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setActiveModal(null); navigate('/volunteers'); }}
                style={{ width: '100%', marginTop: '16px', padding: '12px', backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                Manage Team →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impact Metrics Modal */}
      {activeModal === 'impact' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>Impact Metrics</h2>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '20px', backgroundColor: '#faf5ff', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '36px', fontWeight: '700', color: '#7c3aed', margin: 0 }}>{metrics.sdgsAddressed}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>SDGs Addressed</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '36px', fontWeight: '700', color: '#166534', margin: 0 }}>{avgProjectCompletion}%</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>Avg Completion</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#eff6ff', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '36px', fontWeight: '700', color: '#1e40af', margin: 0 }}>{metrics.activeProjects}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>Active Projects</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#fef3c7', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '36px', fontWeight: '700', color: '#d97706', margin: 0 }}>{typeof metrics.aiuEarned === 'number' ? metrics.aiuEarned.toFixed(1) : metrics.aiuEarned}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>Total AIUs</p>
                </div>
              </div>
              <button
                onClick={() => { setActiveModal(null); navigate('/impact-visualization'); }}
                style={{ width: '100%', padding: '12px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                View Full Impact Report →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Verification Modal */}
      {activeModal === 'verification' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} style={{ color: '#f59e0b' }} />
                Pending AIU Verification
              </h2>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {(pendingVerifications?.length || 0) === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <ShieldCheck size={48} style={{ color: '#10b981', margin: '0 auto 16px' }} />
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>All Caught Up!</p>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>No pending impact records to verify.</p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                    Review and verify impact records submitted by volunteers. Verified records receive full AIU credit.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                    {(pendingVerifications || []).map((impact: any) => (
                      <div key={impact.id} style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{impact.metricName || 'Impact Record'}</p>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                              Submitted by: {impact.userName || 'Volunteer'} • {new Date(impact.date).toLocaleDateString()}
                            </p>
                          </div>
                          <span style={{ fontSize: '18px', fontWeight: '700', color: '#d97706' }}>{impact.value}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/activities/project-impacts/${impact.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ verificationStatus: 'verified', userId: userId })
                                });
                                refetchVerifications();
                                refetchDashboard();
                                toast({ title: 'Impact verified', description: 'The impact record has been verified.' });
                              } catch (err) {
                                toast({ title: 'Error', description: 'Failed to verify impact', variant: 'destructive' });
                              }
                            }}
                            style={{ flex: 1, padding: '8px 12px', backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <ThumbsUp size={14} />
                            Verify
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/activities/project-impacts/${impact.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ verificationStatus: 'rejected', userId: userId })
                                });
                                refetchVerifications();
                                toast({ title: 'Impact rejected', description: 'The impact record has been rejected.' });
                              } catch (err) {
                                toast({ title: 'Error', description: 'Failed to reject impact', variant: 'destructive' });
                              }
                            }}
                            style={{ flex: 1, padding: '8px 12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => navigate(`/projects/${impact.projectId}`)}
                            style={{ padding: '8px 12px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Eye size={14} />
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 1024px) {
          .middle-section, .bottom-section, .below-fold {
            grid-template-columns: 1fr !important;
          }
        }
        .metric-card-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
        .metric-card-btn:focus {
          outline: 2px solid #166534;
          outline-offset: 2px;
        }
        .alert-btn:hover {
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .task-btn:hover {
          background-color: #f9fafb !important;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .modal-content {
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>


      {/* Footer - Hidden on mobile */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onCreateClick={() => setShowCreateModal(true)} />
    </div>
  );
}

function MetricCard({ icon, label, value, color, testId, onClick, tooltip }: { icon: React.ReactNode; label: string; value: number | string; color: string; testId: string; onClick?: () => void; tooltip?: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onClick}
        onTouchEnd={(e) => { if (onClick) { e.preventDefault(); onClick(); } }}
        onMouseEnter={() => { setIsHovered(true); if (tooltip) setShowTooltip(true); }}
        onMouseLeave={() => { setIsHovered(false); setShowTooltip(false); }}
        aria-label={`${label}: ${displayValue}`}
        className="metric-card-btn"
        style={{
          backgroundColor: isHovered ? `${color}05` : 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: isHovered ? `0 8px 16px rgba(0,0,0,0.12)` : '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          border: `2px solid ${color}${isHovered ? '40' : '20'}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          width: '100%',
          height: '140px',
          textAlign: 'center',
          minHeight: 'auto',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          touchAction: 'manipulation',
        }}
        data-testid={testId}
      >
        <div style={{ padding: '8px', backgroundColor: `${color}10`, borderRadius: '8px', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color, margin: 0 }}>{displayValue}</p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: '1.2' }}>{label}</p>
        </div>
      </button>
      {tooltip && showTooltip && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          backgroundColor: '#1f2937',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '12px',
          lineHeight: '1.5',
          maxWidth: '280px',
          width: 'max-content',
          zIndex: 50,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
        }}>
          {tooltip}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #1f2937',
          }} />
        </div>
      )}
    </div>
  );
}

function MobileMetricCard({ icon, label, value, color, testId, onClick }: { icon: React.ReactNode; label: string; value: number; color: string; testId: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onTouchEnd={(e) => { if (onClick) { e.preventDefault(); onClick(); } }}
      aria-label={`${label}: ${value.toLocaleString()}`}
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        touchAction: 'manipulation',
      }}
      data-testid={testId}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '12px', 
          background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: color 
        }}>
          {icon}
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', margin: 0, lineHeight: '1.1' }}>{value.toLocaleString()}</p>
        </div>
      </div>
      <div style={{ 
        width: '60px', 
        height: '40px', 
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: '2px',
        padding: '4px'
      }}>
        {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8].map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h * 100}%`,
              backgroundColor: color,
              opacity: 0.3 + (i * 0.1),
              borderRadius: '2px',
            }}
          />
        ))}
      </div>
    </button>
  );
}

function QuickActionButton({ icon, label, onClick, testId }: { icon: React.ReactNode; label: string; onClick: () => void; testId: string }) {
  return (
    <button
      onClick={onClick}
      onTouchEnd={(e) => { e.preventDefault(); onClick(); }}
      data-testid={testId}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        fontSize: '14px',
        color: '#374151',
        transition: 'background-color 0.2s',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'rgba(22, 101, 52, 0.2)',
      }}
    >
      <span style={{ color: '#166534' }}>{icon}</span>
      {label}
    </button>
  );
}

interface MetricsModalProps {
  title: string;
  onClose: () => void;
  type: 'projects' | 'hours' | 'sdgs' | 'lives' | 'aiu';
  data?: any[];
  totalHours?: number;
  totalAiu?: number;
  organizationAIU?: {
    projects: Array<{
      projectId: number;
      projectName: string;
      aiu: number;
      sdgIndicator: string;
      verificationStatus: string;
    }>;
  } | null;
  volunteers?: any[];
  color: string;
}

function MetricsModal({ title, onClose, type, data = [], totalHours, totalAiu, organizationAIU, volunteers = [], color }: MetricsModalProps) {
  const [, navigate] = useLocation();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {type === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No projects yet</p>
              ) : (
                data.map((project: any) => (
                  <button 
                    key={project.id} 
                    onClick={() => {
                      navigate(`/projects/${project.id}`);
                      onClose();
                    }}
                    style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: `2px solid ${color}20`, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${color}10`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{project.name}</h4>
                      <span style={{ padding: '4px 12px', backgroundColor: color, color: 'white', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                        {project.status}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        <p style={{ fontWeight: '500', marginBottom: '4px' }}>Completion</p>
                        <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', backgroundColor: color, width: `${project.completionPercentage || 0}%` }} />
                        </div>
                        <p style={{ marginTop: '4px', fontSize: '11px' }}>{project.completionPercentage || 0}%</p>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        <p style={{ fontWeight: '500', marginBottom: '4px' }}>SDGs</p>
                        <p>{project.sdgGoals?.length || 0} goals</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {type === 'hours' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: color + '10', borderRadius: '8px', border: `2px solid ${color}` }}>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Hours</p>
                <p style={{ fontSize: '32px', fontWeight: '700', color: color }}>{totalHours?.toLocaleString() || 0}</p>
              </div>

              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Top Contributors</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {volunteers.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '13px' }}>No volunteer data</p>
                  ) : (
                    volunteers.slice(0, 5).map((vol: any) => (
                      <button 
                        key={vol.id} 
                        onClick={() => {
                          navigate('/volunteers');
                          onClose();
                        }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${color}10`}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color }}>
                            {vol.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: '12px', fontWeight: '600', color: '#111827' }}>{vol.name}</p>
                            <p style={{ fontSize: '11px', color: '#6b7280' }}>{vol.projects} projects</p>
                          </div>
                        </div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color }}>{vol.hours}h</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {type === 'sdgs' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
              {data.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px', gridColumn: '1/-1' }}>No SDG data</p>
              ) : (
                data.map((sdg: any) => {
                  const sdgColor = SDG_GOALS[sdg.goal]?.color || color;
                  const sdgIcon = SDG_ICONS[sdg.goal];
                  return (
                    <button 
                      key={sdg.goal} 
                      onClick={() => {
                        navigate('/sdg-mapping');
                        onClose();
                      }}
                      style={{ 
                        padding: '16px', 
                        backgroundColor: 'white', 
                        borderRadius: '12px', 
                        border: `2px solid ${sdgColor}`, 
                        cursor: 'pointer', 
                        transition: 'all 0.2s',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${sdgColor}08`;
                        e.currentTarget.style.boxShadow = `0 8px 16px ${sdgColor}20`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '8px', 
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <img 
                          src={sdgIcon} 
                          alt={`SDG ${sdg.goal}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ width: '100%' }}>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>{getSDGName(sdg.goal)}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', color: sdgColor, margin: '0' }}>{sdg.hours}</p>
                            <p style={{ fontSize: '10px', margin: '2px 0 0 0' }}>Hours</p>
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', color: sdgColor, margin: '0' }}>{sdg.projects}</p>
                            <p style={{ fontSize: '10px', margin: '2px 0 0 0' }}>Projects</p>
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', color: sdgColor, margin: '0' }}>{sdg.volunteers || 0}</p>
                            <p style={{ fontSize: '10px', margin: '2px 0 0 0' }}>Volunteers</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {type === 'lives' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No projects</p>
              ) : (
                data.map((project: any) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      navigate(`/projects/${project.id}`);
                      onClose();
                    }}
                    style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: `2px solid ${color}20`, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${color}10`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{project.name}</h4>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>Status: {project.status}</p>
                      </div>
                      <span style={{ padding: '4px 12px', backgroundColor: '#10b981', color: 'white', borderRadius: '12px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                        {(project.aiuEarned || 0).toFixed(1)} AIUs
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', color }}>{project.completionPercentage || 0}%</p>
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Complete</p>
                      </div>
                      <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', color }}>{project.totalHours || 0}h</p>
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Hours</p>
                      </div>
                      <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', color }}>{project.sdgGoals?.length || 0}</p>
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>SDGs</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {type === 'aiu' && (() => {
            // Use accurate AIU data from dedicated endpoint if available
            const aiuProjects = organizationAIU?.projects || [];

            // Create a map of accurate AIU values by project ID
            const aiuByProjectId = new Map<number, number>();
            aiuProjects.forEach(p => aiuByProjectId.set(p.projectId, p.aiu));

            // Check if we have accurate AIU data
            const hasAccurateAiu = aiuProjects.length > 0;

            // Fallback: Check if projects have their own AIU values or if we need to distribute
            const sumOfProjectAiu = hasAccurateAiu
              ? aiuProjects.reduce((sum, p) => sum + (p.aiu || 0), 0)
              : data.reduce((sum: number, p: any) => sum + (p.aiuEarned || 0), 0);
            const projectTotalHours = data.reduce((sum: number, p: any) => sum + (p.totalHours || 0), 0);

            // Only distribute proportionally if we don't have accurate AIU and all projects have 0 AIU
            const needsDistribution = !hasAccurateAiu && sumOfProjectAiu === 0 && totalAiu && totalAiu > 0 && projectTotalHours > 0;

            // Calculate AIU for each project - prioritize accurate AIU endpoint data
            const getProjectAiu = (project: any) => {
              // Priority 1: Use accurate AIU from dedicated endpoint
              if (hasAccurateAiu && aiuByProjectId.has(project.id)) {
                return aiuByProjectId.get(project.id) || 0;
              }
              // Priority 2: Use project's own aiuEarned if not distributing
              if (!needsDistribution) {
                return project.aiuEarned || 0;
              }
              // Fallback: Distribute total AIU proportionally based on hours
              const projectHours = project.totalHours || 0;
              return (projectHours / projectTotalHours) * (totalAiu || 0);
            };

            // Use the header's total AIU value for display (same as button)
            // This ensures consistency between button and modal header
            const displayedTotal = totalAiu || 0;

            return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* AIU Summary Card */}
              <div style={{ padding: '20px', backgroundColor: '#10b98110', borderRadius: '12px', border: '2px solid #10b981' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total AIUs Earned</p>
                    <p style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', margin: 0 }}>
                      {displayedTotal.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Completed Projects</p>
                    <p style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', margin: 0 }}>
                      {data.filter((p: any) => p.status?.toLowerCase() === 'completed').length}
                    </p>
                  </div>
                </div>
              </div>

              {/* AIU Explanation - Conceptual, no formula */}
              <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', fontSize: '13px', color: '#166534', border: '1px solid #bbf7d0' }}>
                <p style={{ fontWeight: '600', marginBottom: '8px', color: '#166534' }}>How AIUs are Calculated:</p>
                <p style={{ margin: '0 0 8px 0', lineHeight: '1.5' }}>
                  <strong>AIU (Attributable Impact Units)</strong> measure your organization's real-world social impact through volunteer activities.
                </p>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#15803d' }}>
                  <li style={{ marginBottom: '4px' }}><strong>Hours Contributed:</strong> Volunteer time invested in projects</li>
                  <li style={{ marginBottom: '4px' }}><strong>SDG Alignment:</strong> Impact across Sustainable Development Goals</li>
                  <li style={{ marginBottom: '4px' }}><strong>Lives Touched:</strong> Direct beneficiaries of your projects</li>
                  <li><strong>Verification:</strong> Validated impact records receive higher weight</li>
                </ul>
              </div>

              {/* Project AIU Breakdown */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>AIU by Project</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No project data</p>
                  ) : (
                    data.slice(0, 10).map((project: any) => {
                      const projectAiu = getProjectAiu(project);
                      const aiuPercentage = displayedTotal > 0 ? (projectAiu / displayedTotal) * 100 : 0;
                      return (
                      <button
                        key={project.id}
                        onClick={() => {
                          navigate(`/projects/${project.id}`);
                          onClose();
                        }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '8px',
                          border: '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          width: '100%',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#10b98110';
                          e.currentTarget.style.borderColor = '#10b98140';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.borderColor = 'transparent';
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{project.status}</span>
                            {project.sdgGoals?.length > 0 && (
                              <>
                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>•</span>
                                <span style={{ fontSize: '12px', color: '#10b981' }}>
                                  SDG {project.sdgGoals.slice(0, 3).join(', ')}{project.sdgGoals.length > 3 ? '...' : ''}
                                </span>
                              </>
                            )}
                            {project.totalHours > 0 && (
                              <>
                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>•</span>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>{project.totalHours}h</span>
                              </>
                            )}
                          </div>
                          {/* Progress bar showing project's share of total AIU */}
                          {aiuPercentage > 0 && (
                            <div style={{ marginTop: '8px', height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', backgroundColor: '#10b981', width: `${Math.min(aiuPercentage, 100)}%`, transition: 'width 0.3s' }} />
                            </div>
                          )}
                        </div>
                        <div style={{ marginLeft: '16px', textAlign: 'right' }}>
                          <p style={{ fontSize: '20px', fontWeight: '700', color: '#10b981', margin: 0 }}>
                            {projectAiu.toFixed(1)}
                          </p>
                          <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>AIUs</p>
                          {aiuPercentage > 0 && (
                            <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>{aiuPercentage.toFixed(0)}%</p>
                          )}
                        </div>
                      </button>
                    );})
                  )}
                </div>
              </div>
            </div>
          );})()}
        </div>
      </div>
    </div>
  );
}

interface ProjectLocation {
  id: number;
  name: string;
  location: string;
  status: string;
  sdgGoals: number[];
}

const ProjectMapComponent = memo(function ProjectMapComponent({ projectLocations }: { projectLocations: ProjectLocation[] }) {
  const mapRef = useRef<L.Map>(null);

  useEffect(() => {
    if (!mapRef.current || !projectLocations || projectLocations.length === 0) return;

    const coords = projectLocations
      .map(project => getCoordinatesFromLocation(project.location))
      .filter((coord): coord is { lat: number; lng: number } => coord !== null);

    if (coords.length === 0) return;

    if (coords.length === 1) {
      // Single project - zoom to that location
      mapRef.current.setView([coords[0].lat, coords[0].lng], 10);
    } else {
      // Multiple projects - fit bounds to all
      const bounds = L.latLngBounds(coords.map(c => [c.lat, c.lng] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [projectLocations]);

  return (
    <MapContainer
      key="project-map"
      ref={mapRef}
      center={[20, 0]}
      zoom={2}
      style={{ width: '100%', height: '100%' }}
      data-testid="project-map"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap contributors, &copy; CartoDB"
      />
      {projectLocations?.map((project) => {
        const coords = getCoordinatesFromLocation(project.location);
        if (!coords) return null;
        return (
          <Marker key={project.id} position={[coords.lat, coords.lng]}>
            <Popup>
              <strong>{project.name}</strong>
              <br />
              Status: {project.status}
              <br />
              SDGs: {project.sdgGoals.join(', ') || 'None'}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
});

function getCoordinatesFromLocation(location: string): { lat: number; lng: number } | null {
  const locationCoords: Record<string, { lat: number; lng: number }> = {
    // African Countries (centers)
    'zambia': { lat: -13.1939, lng: 27.8493 },
    'kenya': { lat: -0.0236, lng: 37.9062 },
    'nigeria': { lat: 9.0765, lng: 7.3986 },
    'south africa': { lat: -30.5595, lng: 22.9375 },
    'democratic republic of congo': { lat: -4.0383, lng: 21.7587 },
    'uganda': { lat: 1.3733, lng: 32.2903 },
    'tanzania': { lat: -6.3690, lng: 34.8888 },
    'ethiopia': { lat: 9.1450, lng: 40.4897 },
    'ghana': { lat: 7.3697, lng: -5.6789 },
    'cameroon': { lat: 3.8480, lng: 11.5021 },
    'egypt': { lat: 26.8206, lng: 30.8025 },
    'morocco': { lat: 31.7917, lng: -7.0926 },
    'algeria': { lat: 28.0339, lng: 1.6596 },
    'rwanda': { lat: -1.9536, lng: 29.8739 },
    'malawi': { lat: -13.2543, lng: 34.3015 },
    'mozambique': { lat: -18.6657, lng: 35.5296 },
    'zimbabwe': { lat: -19.0154, lng: 29.1549 },
    'botswana': { lat: -22.3285, lng: 24.6849 },
    'lesotho': { lat: -29.6100, lng: 28.2336 },
    'guinea': { lat: 9.9456, lng: -9.6966 },
    'sierra leone': { lat: 8.4606, lng: -11.7799 },
    'liberia': { lat: 6.4281, lng: -9.4295 },
    'ivory coast': { lat: 7.5400, lng: -5.5471 },
    'senegal': { lat: 14.4974, lng: -14.4524 },
    
    // European Countries
    'united kingdom': { lat: 55.3781, lng: -3.4360 },
    'france': { lat: 46.2276, lng: 2.2137 },
    'germany': { lat: 51.1657, lng: 10.4515 },
    'spain': { lat: 40.4637, lng: -3.7492 },
    'italy': { lat: 41.8719, lng: 12.5674 },
    'netherlands': { lat: 52.1326, lng: 5.2913 },
    'belgium': { lat: 50.5039, lng: 4.4699 },
    'austria': { lat: 47.5162, lng: 14.5501 },
    'czech republic': { lat: 49.8175, lng: 15.4730 },
    'poland': { lat: 51.9194, lng: 19.1451 },
    'greece': { lat: 39.0742, lng: 21.8243 },
    'portugal': { lat: 39.3999, lng: -8.2245 },
    'switzerland': { lat: 46.8182, lng: 8.2275 },
    'sweden': { lat: 60.1282, lng: 18.6435 },
    'norway': { lat: 60.4720, lng: 8.4689 },
    
    // Asian Countries
    'india': { lat: 20.5937, lng: 78.9629 },
    'japan': { lat: 36.2048, lng: 138.2529 },
    'china': { lat: 35.8617, lng: 104.1954 },
    'thailand': { lat: 15.8700, lng: 100.9925 },
    'vietnam': { lat: 14.0583, lng: 108.2772 },
    'philippines': { lat: 12.8797, lng: 121.7740 },
    'indonesia': { lat: -0.7893, lng: 113.9213 },
    'malaysia': { lat: 4.2105, lng: 101.6964 },
    'singapore': { lat: 1.3521, lng: 103.8198 },
    'pakistan': { lat: 30.3753, lng: 69.3451 },
    'bangladesh': { lat: 23.6850, lng: 90.3563 },
    'south korea': { lat: 35.9078, lng: 127.7669 },
    'myanmar': { lat: 21.9162, lng: 95.9560 },
    'cambodia': { lat: 12.5657, lng: 104.9910 },
    'laos': { lat: 19.8523, lng: 102.4955 },
    'sri lanka': { lat: 7.8731, lng: 80.7718 },
    
    // Americas - Countries
    'united states': { lat: 37.0902, lng: -95.7129 },
    'canada': { lat: 56.1304, lng: -106.3468 },
    'mexico': { lat: 23.6345, lng: -102.5528 },
    'brazil': { lat: -14.2350, lng: -51.9253 },
    'argentina': { lat: -38.4161, lng: -63.6167 },
    'chile': { lat: -35.6751, lng: -71.5430 },
    'colombia': { lat: 4.5709, lng: -74.2973 },
    'peru': { lat: -9.1900, lng: -75.0152 },
    'venezuela': { lat: 6.4238, lng: -66.5897 },
    'ecuador': { lat: -1.8312, lng: -78.1834 },
    'bolivia': { lat: -16.2902, lng: -63.5887 },
    'paraguay': { lat: -23.4425, lng: -58.4438 },
    'uruguay': { lat: -32.5228, lng: -55.7658 },
    'costa rica': { lat: 9.7489, lng: -83.7534 },
    'panama': { lat: 8.7832, lng: -80.7744 },
    
    // Oceania Countries
    'australia': { lat: -25.2744, lng: 133.7751 },
    'new zealand': { lat: -40.9006, lng: 174.8860 },
    'fiji': { lat: -17.7134, lng: 178.0650 },
    'samoa': { lat: -13.7590, lng: -172.1046 },
    
    // US Cities
    'new york': { lat: 40.7128, lng: -74.006 },
    'los angeles': { lat: 34.0522, lng: -118.2437 },
    'chicago': { lat: 41.8781, lng: -87.6298 },
    'houston': { lat: 29.7604, lng: -95.3698 },
    'phoenix': { lat: 33.4484, lng: -112.074 },
    'san francisco': { lat: 37.7749, lng: -122.4194 },
    'seattle': { lat: 47.6062, lng: -122.3321 },
    'boston': { lat: 42.3601, lng: -71.0589 },
    'atlanta': { lat: 33.749, lng: -84.388 },
    'miami': { lat: 25.7617, lng: -80.1918 },
    'denver': { lat: 39.7392, lng: -104.9903 },
    'austin': { lat: 30.2672, lng: -97.7431 },
    'portland': { lat: 45.5152, lng: -122.6784 },
    'dallas': { lat: 32.7767, lng: -96.797 },
    
    // African Cities
    'nairobi': { lat: -1.2921, lng: 36.8219 },
    'lagos': { lat: 6.5244, lng: 3.3792 },
    'cape town': { lat: -33.9249, lng: 18.4241 },
    'johannesburg': { lat: -26.2023, lng: 28.0436 },
    'cairo': { lat: 30.0444, lng: 31.2357 },
    'kinshasa': { lat: -4.3276, lng: 15.3136 },
    'accra': { lat: 5.6037, lng: -0.187 },
    'lusaka': { lat: -15.3875, lng: 28.2833 },
    'ndola': { lat: -12.9587, lng: 28.6366 }, // Zambia
    'kitwe': { lat: -12.8024, lng: 28.2132 }, // Zambia
    'harare': { lat: -17.8252, lng: 31.0335 },
    'bulawayo': { lat: -20.1325, lng: 28.5848 }, // Zimbabwe
    'bulowaya': { lat: -20.1325, lng: 28.5848 }, // Common misspelling
    'dar es salaam': { lat: -6.8000, lng: 39.2833 },
    'kampala': { lat: 0.3476, lng: 32.5825 }, // Uganda
    'addis ababa': { lat: 9.0054, lng: 38.7636 }, // Ethiopia
    
    // European Cities
    'london': { lat: 51.5074, lng: -0.1278 },
    'paris': { lat: 48.8566, lng: 2.3522 },
    'berlin': { lat: 52.52, lng: 13.405 },
    'madrid': { lat: 40.4168, lng: -3.7038 },
    'rome': { lat: 41.9028, lng: 12.4964 },
    'amsterdam': { lat: 52.3676, lng: 4.9041 },
    'brussels': { lat: 50.8503, lng: 4.3517 },
    'vienna': { lat: 48.2082, lng: 16.3738 },
    'prague': { lat: 50.0755, lng: 14.4378 },
    'warsaw': { lat: 52.2297, lng: 21.0122 },
    
    // Asian Cities
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'mumbai': { lat: 19.076, lng: 72.8777 },
    'delhi': { lat: 28.7041, lng: 77.1025 },
    'bangkok': { lat: 13.7563, lng: 100.5018 },
    'shanghai': { lat: 31.2304, lng: 121.4737 },
    'beijing': { lat: 39.9042, lng: 116.4074 },
    'seoul': { lat: 37.5665, lng: 126.978 },
    'manila': { lat: 14.5995, lng: 120.9842 },
    'manilla': { lat: 14.5995, lng: 120.9842 }, // Common misspelling
    'tacloban': { lat: 11.2543, lng: 124.9602 }, // Philippines
    'cebu': { lat: 10.3157, lng: 123.8854 }, // Philippines
    'davao': { lat: 7.1907, lng: 125.4553 }, // Philippines
    'jakarta': { lat: -6.2088, lng: 106.8456 },
    'karachi': { lat: 24.8607, lng: 67.0011 },
    'hongkong': { lat: 22.3193, lng: 114.1694 },
    'hong kong': { lat: 22.3193, lng: 114.1694 },
    
    // Central America & Caribbean Cities
    'port-au-prince': { lat: 18.5944, lng: -72.3074 }, // Haiti
    'gonaives': { lat: 19.4530, lng: -72.6868 }, // Haiti
    'cap-haitien': { lat: 19.7578, lng: -72.2040 }, // Haiti
    'santo domingo': { lat: 18.4861, lng: -69.9312 }, // Dominican Republic
    'kingston': { lat: 17.9714, lng: -76.7936 }, // Jamaica
    'havana': { lat: 23.1136, lng: -82.3666 }, // Cuba
    'san juan': { lat: 18.4655, lng: -66.1057 }, // Puerto Rico
    'guatemala city': { lat: 14.6349, lng: -90.5069 }, // Guatemala
    'tegucigalpa': { lat: 14.0723, lng: -87.1921 }, // Honduras
    'managua': { lat: 12.1364, lng: -86.2514 }, // Nicaragua
    'san salvador': { lat: 13.6929, lng: -89.2182 }, // El Salvador
    
    // South American Cities
    'sao paulo': { lat: -23.5505, lng: -46.6333 },
    'buenos aires': { lat: -34.6037, lng: -58.3816 },
    'lima': { lat: -12.0464, lng: -77.0428 },
    'bogota': { lat: 4.7110, lng: -74.0721 },
    'santiago': { lat: -33.4489, lng: -70.6693 },
    'mexico city': { lat: 19.4326, lng: -99.1332 },
    'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
    'caracas': { lat: 10.4806, lng: -66.9036 },
    'medellin': { lat: 6.2442, lng: -75.5812 },
    'quito': { lat: -0.1807, lng: -78.4678 },
    
    // Oceania Cities
    'sydney': { lat: -33.8688, lng: 151.2093 },
    'melbourne': { lat: -37.8136, lng: 144.9631 },
    'auckland': { lat: -37.0742, lng: 174.885 },
    
    // Special cases (remote/online)
    'remote': { lat: 20, lng: 0 },
    'online': { lat: 20, lng: 0 },
    'virtual': { lat: 20, lng: 0 },
    'global': { lat: 20, lng: 0 },
  };

  const locationLower = location.toLowerCase().trim();
  
  // Exact matches first (highest priority)
  if (locationCoords[locationLower]) {
    return locationCoords[locationLower];
  }
  
  // Check for countries (longer strings first to match full country names)
  const countryPatterns = [
    'united states', 'united kingdom', 'south africa', 'south korea', 'sri lanka',
    'democratic republic of congo', 'ivory coast', 'sierra leone', 'new zealand'
  ];
  
  for (const country of countryPatterns) {
    if (locationLower.includes(country) && locationCoords[country]) {
      return locationCoords[country];
    }
  }
  
  // Partial matches (checks if location contains any key) - skip regional matches
  for (const [key, coords] of Object.entries(locationCoords)) {
    if (locationLower.includes(key) && !['africa', 'europe', 'asia', 'south america', 'caribbean'].includes(key)) {
      return coords;
    }
  }
  
  // Fallback to center of the world for unknown locations
  return { lat: 20, lng: 0 };
}
