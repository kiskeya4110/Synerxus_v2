import { useState, startTransition, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Users, Building2, Clock,
  RefreshCw, LogOut,
  ArrowUpRight, ArrowDownRight, BarChart3, ChevronRight,
  Home, Settings,
  Menu, X, Target, Globe, TrendingUp,
  Leaf, Heart, Scale, Award, Sparkles, Download,
  FileText, FolderOpen, Zap
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Logo from "@/components/ui/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { getSDGName, getSDGColor } from "@shared/sdg-goals";

// Types
interface CSRDashboardData {
  totalHours: number;
  activeEmployees: number;
  projectsCompleted: number;
  sdgScoreDelta: number;
  sdgMetrics: Array<{
    sdg: number;
    totalHours: number;
    uniqueEmployees: number;
    projectsContributed: number;
  }>;
  primarySdgs: number[];
  leaderboard: Array<{
    employeeName: string;
    hours: number;
    points: number;
    rank: number;
    avatar?: string;
  }>;
  partners: Array<{
    id: number;
    companyName: string;
    logoUrl?: string;
    employees: number;
    hours: number;
    roi: number;
  }>;
}

interface CSRPartner {
  id: number;
  companyName: string;
  logoUrl?: string;
  contactEmail: string;
  employeeCount?: number;
  primarySdgs?: number[];
}

interface CSRChallenge {
  id: number;
  title: string;
  description?: string;
  sdgGoal: number;
  targetHours?: number;
  currentHours?: number;
  targetParticipants?: number;
  currentParticipants?: number;
  startDate: string;
  endDate: string;
  status: string;
}

// Trend Indicator Component
function TrendIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-[10px] text-slate-500">No change</span>;
  const isPositive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

// ESG Category mapping
const ENVIRONMENTAL_SDGS = [6, 7, 12, 13, 14, 15];
const SOCIAL_SDGS = [1, 2, 3, 4, 5, 10, 11, 16];
const GOVERNANCE_SDGS = [8, 9, 17];

export default function CSRDashboardPWA() {
  const [, navigate] = useLocation();
  const { user: firebaseUser, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'projects' | 'impact' | 'reports'>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const queryClient = useQueryClient();

  const userId = localStorage.getItem('currentUserId');

  // Mark component as ready after mount
  useEffect(() => {
    setIsReady(true);
  }, []);

  // Fetch current user from database
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const url = userId ? `/api/users/me?userId=${userId}` : '/api/users/me';
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId || !!firebaseUser,
    retry: false
  });

  // Fetch CSR Partner data
  const { data: csrPartner } = useQuery<CSRPartner | null>({
    queryKey: ["/api/csr/partners", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/csr/partners?userId=${userId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!userId,
    retry: false
  });

  // Fetch CSR Dashboard data
  const { data: csrData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery<CSRDashboardData | null>({
    queryKey: ["/api/csr/dashboard", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/csr/dashboard?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: "always",
    retry: false
  });

  // Fetch active challenges
  const { data: challenges = [] } = useQuery<CSRChallenge[]>({
    queryKey: ["/api/csr/challenges", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/csr/challenges?userId=${userId}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!userId,
    retry: false
  });

  // Calculate ESG breakdown
  const esgBreakdown = useMemo(() => {
    const sdgMetrics = csrData?.sdgMetrics || [];
    let environmental = 0;
    let social = 0;
    let governance = 0;
    let envProjects = 0;
    let socialProjects = 0;
    let govProjects = 0;

    sdgMetrics.forEach((metric) => {
      const hours = metric.totalHours || 0;
      const projects = metric.projectsContributed || 0;

      if (ENVIRONMENTAL_SDGS.includes(metric.sdg)) {
        environmental += hours;
        envProjects += projects;
      }
      if (SOCIAL_SDGS.includes(metric.sdg)) {
        social += hours;
        socialProjects += projects;
      }
      if (GOVERNANCE_SDGS.includes(metric.sdg)) {
        governance += hours;
        govProjects += projects;
      }
    });

    const total = environmental + social + governance;
    return {
      environmental: { hours: environmental, projects: envProjects, percentage: total > 0 ? Math.round((environmental / total) * 100) : 33 },
      social: { hours: social, projects: socialProjects, percentage: total > 0 ? Math.round((social / total) * 100) : 34 },
      governance: { hours: governance, projects: govProjects, percentage: total > 0 ? Math.round((governance / total) * 100) : 33 },
      total,
    };
  }, [csrData?.sdgMetrics]);

  // Calculate SDG chart data
  const sdgChartData = useMemo(() => {
    const sdgMetrics = csrData?.sdgMetrics || [];
    const primarySdgs = csrData?.primarySdgs || [];

    return sdgMetrics
      .filter((m) => primarySdgs.includes(m.sdg) || m.totalHours > 0)
      .map((metric) => ({
        sdg: metric.sdg,
        name: getSDGName(metric.sdg),
        hours: metric.totalHours || 0,
        employees: metric.uniqueEmployees || 0,
        projects: metric.projectsContributed || 0,
        color: getSDGColor(metric.sdg),
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8);
  }, [csrData?.sdgMetrics, csrData?.primarySdgs]);

  // Show loading only during initial load
  if (!isReady || (userLoading && !currentUser)) {
    return (
      <div className="fixed inset-0 bg-stone-100 flex items-center justify-center p-4 max-w-[428px] mx-auto">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-spin" />
          <p className="text-stone-600 text-sm">Loading ESG Dashboard...</p>
        </div>
      </div>
    );
  }

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchDashboard(),
        queryClient.invalidateQueries({ queryKey: ["/api/csr/partners"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/csr/challenges"] }),
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    }
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const companyName = csrPartner?.companyName || currentUser?.displayName || "Corporate Partner";
  const companyLogo = csrPartner?.logoUrl || null;
  const companyInitial = companyName.charAt(0).toUpperCase();
  const totalHours = csrData?.totalHours || 0;
  const activeEmployees = csrData?.activeEmployees || 0;
  const projectsCompleted = csrData?.projectsCompleted || 0;
  const sdgScoreDelta = csrData?.sdgScoreDelta || 0;
  const leaderboard = csrData?.leaderboard || [];
  const partners = csrData?.partners || [];

  // Menu items for CSR
  const menuItems = [
    { icon: Home, label: "Dashboard", action: () => { setMenuOpen(false); setActiveTab('overview'); } },
    { icon: Users, label: "Team", action: () => { setMenuOpen(false); setActiveTab('team'); } },
    { icon: FolderOpen, label: "Projects", action: () => { setMenuOpen(false); setActiveTab('projects'); } },
    { icon: BarChart3, label: "Impact", action: () => { setMenuOpen(false); setActiveTab('impact'); } },
    { icon: FileText, label: "Reports", action: () => { setMenuOpen(false); setActiveTab('reports'); } },
    { icon: Settings, label: "Settings", path: "/corporate-partner-profile-settings" },
  ];

  // Tab items for bottom nav
  const tabItems = [
    { id: 'overview', icon: Home, label: 'Overview' },
    { id: 'team', icon: Users, label: 'Team' },
    { id: 'projects', icon: FolderOpen, label: 'Projects' },
    { id: 'impact', icon: BarChart3, label: 'Impact' },
    { id: 'reports', icon: FileText, label: 'Reports' },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-stone-100 max-w-[428px] mx-auto">
      {/* Header - Green to Amber gradient matching CSR theme */}
      <header className="flex-shrink-0" style={{ background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #fef3c7 75%, #fde68a 100%)" }}>
        {/* Safe area padding for notched devices */}
        <div className="pt-[max(0.5rem,env(safe-area-inset-top))]" />

        <div className="px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Logo size="sm" variant="full" theme="light" />

          {/* CSR Badge */}
          <div className="flex items-center gap-1 px-2 py-1 bg-white/40 backdrop-blur-sm rounded-full">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span className="text-emerald-800 text-xs font-semibold">ESG</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center hover:bg-white/70 transition-all shadow-sm disabled:opacity-50 touch-manipulation cursor-pointer active:scale-95"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 text-emerald-700 pointer-events-none ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Profile/Menu Button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all shadow-sm touch-manipulation cursor-pointer active:scale-95"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Avatar className="h-8 w-8 border-2 border-white/60 shadow-sm pointer-events-none">
                <AvatarImage src={companyLogo || undefined} alt={companyName} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-semibold">
                  {companyInitial}
                </AvatarFallback>
              </Avatar>
              <Menu className="w-5 h-5 text-emerald-700 pointer-events-none" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="relative ml-auto w-[75%] max-w-[280px] h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Menu Header */}
            <div style={{ background: "linear-gradient(100deg, #ecfdf5 0%, #d1fae5 50%, #fef3c7 100%)" }} className="px-4 py-3 pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.25rem))]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-700/70 text-xs font-medium flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> ESG Command Center
                </span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center hover:bg-white/50 transition-colors"
                >
                  <X className="w-4 h-4 text-emerald-700" />
                </button>
              </div>

              {/* Company Info */}
              <div className="flex items-center gap-2.5">
                <Avatar className="h-10 w-10 border-2 border-white/30 shadow-lg">
                  <AvatarImage src={companyLogo || undefined} alt={companyName} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-base font-semibold">
                    {companyInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-900 font-semibold text-sm truncate">
                    {companyName}
                  </p>
                  <p className="text-emerald-700/60 text-xs truncate">
                    {csrPartner?.contactEmail || currentUser?.email || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-1.5">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.path) {
                      setMenuOpen(false);
                      navigate(item.path);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left text-slate-700 hover:bg-slate-50"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100">
                    <item.icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="font-medium text-sm flex-1">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>

            {/* Logout Button */}
            <div className="border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 px-3 pt-3">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* Welcome Message */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg">
              <h2 className="text-lg font-bold mb-1">ESG Command Center</h2>
              <p className="text-emerald-100 text-sm">Track your corporate social impact and employee engagement.</p>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-slate-600 text-xs font-medium">Total Hours</span>
                </div>
                <div className="text-slate-900 text-2xl font-bold">{totalHours.toLocaleString()}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIndicator value={12} />
                  <span className="text-slate-500 text-[10px]">vs last month</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-slate-600 text-xs font-medium">Active Team</span>
                </div>
                <div className="text-slate-900 text-2xl font-bold">{activeEmployees}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIndicator value={8} />
                  <span className="text-slate-500 text-[10px]">vs last month</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Target className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-slate-600 text-xs font-medium">Projects</span>
                </div>
                <div className="text-slate-900 text-2xl font-bold">{projectsCompleted}</div>
                <div className="text-slate-500 text-[10px] mt-1">Completed initiatives</div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-slate-600 text-xs font-medium">SDG Impact</span>
                </div>
                <div className="text-slate-900 text-2xl font-bold">+{sdgScoreDelta}</div>
                <div className="text-emerald-600 text-[10px] mt-1 font-medium">Points this period</div>
              </div>
            </div>

            {/* ESG Breakdown */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
              <h3 className="text-slate-900 text-sm font-semibold mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                ESG Impact Breakdown
              </h3>
              <div className="space-y-3">
                {/* Environmental */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Leaf className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Environmental</p>
                      <p className="text-xs text-slate-500">{esgBreakdown.environmental.projects} projects</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{esgBreakdown.environmental.hours}h</p>
                    <p className="text-xs text-emerald-600 font-medium">{esgBreakdown.environmental.percentage}%</p>
                  </div>
                </div>
                <Progress value={esgBreakdown.environmental.percentage} className="h-1.5" />

                {/* Social */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                      <Heart className="w-4 h-4 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Social</p>
                      <p className="text-xs text-slate-500">{esgBreakdown.social.projects} projects</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{esgBreakdown.social.hours}h</p>
                    <p className="text-xs text-rose-600 font-medium">{esgBreakdown.social.percentage}%</p>
                  </div>
                </div>
                <Progress value={esgBreakdown.social.percentage} className="h-1.5" />

                {/* Governance */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Scale className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Governance</p>
                      <p className="text-xs text-slate-500">{esgBreakdown.governance.projects} projects</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{esgBreakdown.governance.hours}h</p>
                    <p className="text-xs text-blue-600 font-medium">{esgBreakdown.governance.percentage}%</p>
                  </div>
                </div>
                <Progress value={esgBreakdown.governance.percentage} className="h-1.5" />
              </div>
            </div>

            {/* Active Challenges */}
            {challenges.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                <h3 className="text-slate-900 text-sm font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Active Challenges
                </h3>
                <div className="space-y-2">
                  {challenges.slice(0, 3).map((challenge) => (
                    <div key={challenge.id} className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-900">{challenge.title}</span>
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                          SDG {challenge.sdgGoal}
                        </span>
                      </div>
                      {challenge.targetHours && (
                        <div className="space-y-1">
                          <Progress value={((challenge.currentHours || 0) / challenge.targetHours) * 100} className="h-1.5" />
                          <p className="text-xs text-slate-500">
                            {challenge.currentHours || 0} / {challenge.targetHours} hours
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Volunteers */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-slate-900 text-sm font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Top Volunteers
                </h3>
                <button
                  onClick={() => startTransition(() => setActiveTab('team'))}
                  className="text-xs text-emerald-600 font-medium"
                >
                  View All
                </button>
              </div>
              <div className="space-y-2">
                {leaderboard.length > 0 ? (
                  leaderboard.slice(0, 5).map((employee, index) => (
                    <div key={employee.employeeName || index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-slate-200 text-slate-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {index + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={employee.avatar} alt={employee.employeeName} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                          {employee.employeeName?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{employee.employeeName}</p>
                        <p className="text-xs text-slate-500">{employee.hours}h logged</p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-600">
                        <Sparkles className="h-3 w-3" />
                        <span className="text-sm font-semibold">{employee.points}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No volunteer data yet</p>
                    <p className="text-xs text-slate-400 mt-1">Employee activities will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-slate-900 text-lg font-bold">Team Leaderboard</h2>
              <span className="text-slate-500 text-sm">{activeEmployees} active</span>
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
                <div className="text-slate-900 text-xl font-bold">{totalHours}</div>
                <div className="text-slate-500 text-xs">Total Hours</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
                <div className="text-slate-900 text-xl font-bold">{activeEmployees}</div>
                <div className="text-slate-500 text-xs">Volunteers</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
                <div className="text-slate-900 text-xl font-bold">{projectsCompleted}</div>
                <div className="text-slate-500 text-xs">Projects</div>
              </div>
            </div>

            {/* Full Leaderboard */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
              {leaderboard.length > 0 ? (
                leaderboard.map((employee, index) => (
                  <div key={employee.employeeName || index} className="flex items-center gap-3 p-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-amber-100 text-amber-700' :
                      index === 1 ? 'bg-slate-200 text-slate-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {index + 1}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={employee.avatar} alt={employee.employeeName} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                        {employee.employeeName?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{employee.employeeName}</p>
                      <p className="text-xs text-slate-500">{employee.hours} hours logged</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-600">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-base font-bold">{employee.points}</span>
                      </div>
                      <p className="text-xs text-slate-500">points</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No team members yet</p>
                  <p className="text-slate-400 text-xs mt-1">Volunteer hours will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-slate-900 text-lg font-bold">Project Portfolio</h2>
              <span className="text-slate-500 text-sm">{projectsCompleted} completed</span>
            </div>

            {/* Partner NGOs */}
            <h3 className="text-slate-700 text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Partner Organizations
            </h3>
            <div className="space-y-2">
              {partners.length > 0 ? (
                partners.map((partner) => (
                  <div key={partner.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={partner.logoUrl} alt={partner.companyName} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700">
                          {partner.companyName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{partner.companyName}</p>
                        <p className="text-xs text-slate-500">NGO Partner</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-slate-900">{partner.employees}</p>
                        <p className="text-[10px] text-slate-500">Volunteers</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-slate-900">{partner.hours.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500">Hours</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-emerald-600">{partner.roi}x</p>
                        <p className="text-[10px] text-slate-500">ROI</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No partner organizations yet</p>
                  <button
                    onClick={() => navigate('/organizations')}
                    className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg"
                  >
                    Browse Organizations
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Impact Tab */}
        {activeTab === 'impact' && (
          <div className="space-y-3">
            <h2 className="text-slate-900 text-lg font-bold">Impact Metrics</h2>

            {/* SDG Alignment */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <h3 className="text-slate-900 text-sm font-semibold mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                SDG Alignment
              </h3>
              {sdgChartData.length > 0 ? (
                <div className="space-y-3">
                  {sdgChartData.map((sdg) => (
                    <div key={sdg.sdg} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: sdg.color }}
                      >
                        {sdg.sdg}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{sdg.name}</p>
                        <p className="text-xs text-slate-500">{sdg.hours.toLocaleString()} hours</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {esgBreakdown.total > 0 ? Math.round((sdg.hours / esgBreakdown.total) * 100) : 0}%
                        </p>
                        <p className="text-xs text-slate-500">{sdg.employees} people</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Globe className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No SDG data yet</p>
                  <p className="text-xs text-slate-400 mt-1">Track volunteer activities to see SDG alignment</p>
                </div>
              )}
            </div>

            {/* Impact Summary Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
                <Clock className="w-6 h-6 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{totalHours.toLocaleString()}</p>
                <p className="text-emerald-100 text-sm">Total Hours</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
                <Users className="w-6 h-6 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{activeEmployees}</p>
                <p className="text-blue-100 text-sm">Active Volunteers</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 text-white">
                <Target className="w-6 h-6 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{projectsCompleted}</p>
                <p className="text-purple-100 text-sm">Projects Completed</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
                <TrendingUp className="w-6 h-6 mb-2 opacity-80" />
                <p className="text-2xl font-bold">+{sdgScoreDelta}</p>
                <p className="text-amber-100 text-sm">SDG Points</p>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-3">
            <h2 className="text-slate-900 text-lg font-bold">Reports & Exports</h2>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/csr-reports-exports')}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-left hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <Download className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">Export Data</p>
                <p className="text-xs text-slate-500 mt-1">Download CSV/PDF</p>
              </button>

              <button
                onClick={() => navigate('/impact-report')}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-left hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">Impact Report</p>
                <p className="text-xs text-slate-500 mt-1">View detailed metrics</p>
              </button>

              <button
                onClick={() => navigate('/sdg-mapping')}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-left hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                  <Globe className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">SDG Mapping</p>
                <p className="text-xs text-slate-500 mt-1">View goal alignment</p>
              </button>

              <button
                onClick={() => navigate('/corporate-partner-profile-settings')}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-left hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
                  <Settings className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">Settings</p>
                <p className="text-xs text-slate-500 mt-1">Company profile</p>
              </button>
            </div>

            {/* Report Status */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <h3 className="text-slate-900 text-sm font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                Recent Reports
              </h3>
              <div className="text-center py-6">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No reports generated yet</p>
                <button
                  onClick={() => navigate('/csr-reports-exports')}
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg"
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-slate-200 px-2 py-2 max-w-[428px] mx-auto z-40 bg-white"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-around items-center">
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => startTransition(() => setActiveTab(tab.id as typeof activeTab))}
                className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all touch-manipulation cursor-pointer active:scale-95 ${
                  isActive ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <tab.icon className={`w-5 h-5 mb-0.5 pointer-events-none ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span className="text-[10px] font-medium pointer-events-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
