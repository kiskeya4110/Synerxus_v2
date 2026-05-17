import { useState, useMemo, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Clock,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronRight,
  Award,
  Globe,
  BarChart3,
  Search,
  User,
  FolderOpen,
  Briefcase,
  Home,
  Sparkles,
  ClipboardList,
  MapPin,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, MetricCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, SDGBadge, StatusBadge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { PageHeader, Grid } from "@/components/ui/section";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/queryClient";
import { getSDGColor, getSDGName, isValidSDG } from "@/lib/sdg-utils";

// ── Tab configuration ────────────────────────────────────────────────────────
// To add a new desktop tab: append one entry here and add a TabsContent block.
type VolunteerTab = 'home' | 'my-work' | 'opportunities';

const VOLUNTEER_TABS: { id: VolunteerTab; label: string; icon: React.ElementType }[] = [
  { id: 'home',          label: 'Home',          icon: Home },
  { id: 'my-work',       label: 'My Work',       icon: ClipboardList },
  { id: 'opportunities', label: 'Opportunities', icon: Sparkles },
];


// Main VolunteerView Component
interface VolunteerViewProps {
  userId: string;
  isMobile: boolean;
  activeUser: any;
  mobileTab: 'home' | 'wallet' | 'projects' | 'history';
  setMobileTab: (tab: 'home' | 'wallet' | 'projects' | 'history') => void;
}

const VolunteerView = memo(function VolunteerView({
  userId,
  isMobile,
  activeUser,
  mobileTab,
  setMobileTab,
}: VolunteerViewProps) {
  const [, navigate] = useLocation();

  // Desktop tab — drives which panel is visible on lg+ screens.
  // Mobile continues to use mobileTab (passed from parent) unchanged.
  const [desktopTab, setDesktopTab] = useState<VolunteerTab>('home');

  // State for expandable sections on dashboard
  const [expandedSection, setExpandedSection] = useState<'wallet' | 'projects' | 'activity' | null>(null);

  // KPI preview modal state (desktop)
  const [kpiModal, setKpiModal] = useState<null | 'sdgs' | 'hours' | 'impact' | 'projects'>(null);

  // History tab state
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [visibleCount, setVisibleCount] = useState(20);

  // Selected log for detail expansion
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  const toggleLogDetail = (logId: number) => {
    setSelectedLogId(prev => prev === logId ? null : logId);
  };

  const toggleSection = (section: 'wallet' | 'projects' | 'activity') => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const handleHistoryFilterChange = (filter: 'all' | 'pending' | 'verified' | 'rejected') => {
    setHistoryFilter(filter);
    setVisibleCount(20);
  };

  // Fetch dashboard data
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["/api/dashboard/summary", userId],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/dashboard/summary?userId=${userId}`, {
          headers,
          credentials: "include",
        });
        if (!response.ok) return null;
        return response.json();
      } catch (error) {
        console.warn("Failed to fetch dashboard:", error);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects", userId],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/projects?userId=${userId}`, { headers, credentials: "include" });
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        console.warn("Failed to fetch projects:", error);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  // Fetch top matched opportunities for the Opportunities tab (lazy — only active when tab is open)
  const { data: opportunitiesData = [], isLoading: isLoadingOpportunities } = useQuery({
    queryKey: ["/api/opportunities/discover", userId],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/opportunities/discover?userId=${userId}&threshold=0`, { headers, credentials: "include" });
        if (!response.ok) return [];
        return response.json();
      } catch {
        return [];
      }
    },
    enabled: !!userId && desktopTab === 'opportunities',
    staleTime: 5 * 60_000,
  });

  // Derive all logs from dashboard data (activities are included in the dashboard response)
  // This avoids a separate /api/logs call that requires auth headers
  const allLogs = useMemo(() => {
    const activities = dashboardData?.activities || [];
    if (!Array.isArray(activities)) return [];
    // Build a project lookup map from dashboard projects
    const projectMap = new Map<number, any>();
    (dashboardData?.projects || []).forEach((p: any) => {
      projectMap.set(p.id, p);
    });
    // Enrich each activity with project data
    return activities.map((activity: any) => {
      const project = activity.project || (activity.projectId ? projectMap.get(activity.projectId) : null);
      return {
        ...activity,
        project: project ? {
          id: project.id,
          name: project.name,
          sdgGoals: project.sdgGoals,
        } : null,
      };
    });
  }, [dashboardData]);

  const isLoadingLogs = isLoadingDashboard;

  // Derive recent logs for home/wallet display
  const recentLogs = useMemo(() => {
    return [...allLogs]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((log: any) => ({
        id: log.id,
        projectName: log.project?.name || "Unknown Project",
        hours: log.hours,
        status: log.verificationStatus || "pending",
        createdAt: log.createdAt,
        outcomeType: log.outcomeType || log.outcomes,
        outcomeValue: log.outcomeQuantity,
        sdgGoals: log.sdgTags || log.project?.sdgGoals || [],
      }));
  }, [allLogs]);

  // Use project-level AI matches already computed in the dashboard data
  // These come from getProjectsForVolunteer (4-factor scoring: Skills, SDG, Location, Availability)
  const matchedProjects = useMemo(() => {
    return dashboardData?.matchedOpportunities || [];
  }, [dashboardData]);
  const isLoadingMatches = isLoadingDashboard;

  // Calculate stats from server dashboard data
  const stats = useMemo(() => {
    const data = dashboardData || {};
    return {
      hoursLogged: data.hoursLogged || data.totalHours || data.verifiedHours || 0,
      verifiedHours: data.verifiedHours || 0,
      outcomesVerified: data.verifiedCount ?? allLogs.filter((l: any) => l.verificationStatus === 'approved').length,
      projectsActive: data.activeProjects || 0,
      totalProjects: data.totalProjects || projects.length || 0,
      totalPeopleImpacted: data.totalPeopleImpacted || 0,
      skillsCount: data.skillsCount || data.volunteerProfile?.skills?.length || 0,
      sdgsAddressed: data.sdgsAddressed || 0,
      completedTasks: data.completedTasks || 0,
      totalTasks: data.totalTasks || 0,
      pendingVerifications: allLogs.filter((l: any) => l.verificationStatus === "pending").length,
    };
  }, [dashboardData, allLogs, projects]);

  // Calculate metrics from server data with log-based fallback
  const totalOutcomes = allLogs
    .filter((l: any) => l.verificationStatus === 'approved')
    .reduce((sum: number, log: any) => sum + (log.outcomeQuantity || 0), 0);

  // Skills - prefer server-computed count
  const skillsUsed = stats.skillsCount;

  // SDGs - prefer server-computed count, fallback to logs
  const sdgsContributed = useMemo(() => {
    if (stats.sdgsAddressed > 0) return stats.sdgsAddressed;
    const sdgsFromLogs = allLogs.flatMap((l: any) => l.sdgTags || l.project?.sdgGoals || []);
    return new Set(sdgsFromLogs).size;
  }, [allLogs, stats.sdgsAddressed]);

  // Unique SDG numbers the volunteer has worked on (for SDG modal)
  const sdgList = useMemo(() => {
    const nums = allLogs.flatMap((l: any) => l.sdgTags || l.project?.sdgGoals || []);
    return Array.from(new Set(nums)).filter((n: any) => isValidSDG(n)).sort((a: any, b: any) => a - b) as number[];
  }, [allLogs]);

  // Hours by project (for Hours modal)
  const hoursByProject = useMemo(() => {
    const map = new Map<string, { name: string; hours: number; verified: number }>();
    allLogs.forEach((l: any) => {
      const name = l.project?.name || 'Unknown Project';
      const existing = map.get(name) || { name, hours: 0, verified: 0 };
      existing.hours += l.hours || 0;
      if (l.verificationStatus === 'approved') existing.verified += l.hours || 0;
      map.set(name, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
  }, [allLogs]);

  // Assigned projects from dashboard data (enriched with org names, hours, AIU)
  const assignedProjects = useMemo(() => {
    return dashboardData?.projects || [];
  }, [dashboardData]);

  // Filtered logs for History tab
  const filteredHistoryLogs = useMemo(() => {
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'verified': 'approved',
      'rejected': 'rejected',
    };
    let logs = historyFilter === 'all'
      ? [...allLogs]
      : allLogs.filter((l: any) => l.verificationStatus === statusMap[historyFilter]);
    // Sort newest first by activity date
    return logs.sort((a: any, b: any) =>
      new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
    );
  }, [allLogs, historyFilter]);

  // Mobile PWA View
  if (isMobile) {
    return (
      <>
        <main className="px-4 py-5 space-y-5">
          {/* Home Tab Content */}
          {mobileTab === 'home' && (
            <>
              {/* Welcome Section */}
              <div className="text-center py-4">
                <h1 className="text-2xl font-bold text-stone-800 mb-1">
                  Welcome back{activeUser?.displayName ? `, ${activeUser.displayName.split(' ')[0]}` : ''}!
                </h1>
                <p className="text-stone-600 text-sm">Your impact journey continues</p>
              </div>

              {/* Quick Stats Summary - Clickable to go to wallet */}
              <button
                onClick={() => setMobileTab('wallet')}
                className="w-full bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 shadow-lg text-left hover:from-indigo-700 hover:to-indigo-900 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold">Impact Summary</h2>
                  <span className="text-xs text-indigo-200 bg-indigo-500/30 px-2 py-1 rounded-full flex items-center gap-1">
                    This Month
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-white">{stats.hoursLogged}</p>
                    <p className="text-xs text-indigo-200">Hours</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{stats.totalProjects}</p>
                    <p className="text-xs text-indigo-200">Projects</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{stats.totalPeopleImpacted}</p>
                    <p className="text-xs text-indigo-200">People Reached</p>
                  </div>
                </div>
              </button>

              {/* Interactive Quick Actions with Expandable Content */}
              <div className="space-y-3">
                <h2 className="text-stone-800 font-semibold">Quick Actions</h2>

                {/* Log Activity - Opens log page */}
                <button
                  onClick={() => navigate('/log-activity')}
                  className="w-full bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors shadow-sm"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-semibold text-stone-800 block">Log Activity</span>
                    <span className="text-xs text-stone-500">Submit hours and output details</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-400" />
                </button>

                {/* View Wallet - Expandable */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleSection('wallet')}
                    className="w-full p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-sm font-semibold text-stone-800 block">Impact Wallet</span>
                      <span className="text-xs text-stone-500">{stats.hoursLogged}h logged • {sdgsContributed} SDGs</span>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-stone-400 transition-transform ${expandedSection === 'wallet' ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedSection === 'wallet' && (
                    <div className="px-4 pb-4 pt-2 border-t border-stone-100 bg-stone-50">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border border-stone-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-stone-500">Hours</span>
                          </div>
                          <p className="text-2xl font-bold text-stone-800">{stats.hoursLogged}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-stone-200">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs text-stone-500">People</span>
                          </div>
                          <p className="text-2xl font-bold text-stone-800">{stats.totalPeopleImpacted}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-stone-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="h-4 w-4 text-amber-600" />
                            <span className="text-xs text-stone-500">SDGs</span>
                          </div>
                          <p className="text-2xl font-bold text-stone-800">{sdgsContributed}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-stone-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className="h-4 w-4 text-indigo-600" />
                            <span className="text-xs text-stone-500">Projects</span>
                          </div>
                          <p className="text-2xl font-bold text-stone-800">{stats.totalProjects}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setMobileTab('wallet')}
                        className="w-full mt-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        View All Metrics →
                      </button>
                    </div>
                  )}
                </div>

                {/* Find Projects - Expandable */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleSection('projects')}
                    className="w-full p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Search className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-sm font-semibold text-stone-800 block">Find Projects</span>
                      <span className="text-xs text-stone-500">{matchedProjects.length} AI-matched opportunities</span>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-stone-400 transition-transform ${expandedSection === 'projects' ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedSection === 'projects' && (
                    <div className="px-4 pb-4 pt-2 border-t border-stone-100 bg-stone-50">
                      {matchedProjects.length > 0 ? (
                        <div className="space-y-2">
                          {matchedProjects.map((match: any, index: number) => {
                            const target = match.projectId
                              ? `/projects/${match.projectId}`
                              : match.id
                                ? `/opportunities/${match.id}`
                                : '/discover-opportunities/pwa';
                            return (
                            <button
                              key={match.id || match.projectId || match.organization_id || index}
                              onClick={() => navigate(target)}
                              className="w-full bg-white rounded-lg p-3 border border-stone-200 flex items-center justify-between text-left hover:border-indigo-300 hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-stone-800 truncate">
                                  {match.title || match.name || match.organizationName || match.organization_name || 'Opportunity'}
                                </p>
                                <p className="text-xs text-stone-500">
                                  {match.organizationName || match.organization_name || match.cause_area || 'Community Impact'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 bg-indigo-100 px-2 py-1 rounded-full ml-2">
                                <TrendingUp className="h-3 w-3 text-indigo-600" />
                                <span className="text-xs font-semibold text-indigo-600">
                                  {Math.round(match.match_score || match.score || 0)}%
                                </span>
                              </div>
                            </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-stone-500 text-center py-2">No matches yet</p>
                      )}
                      <button
                        onClick={() => navigate('/discover-opportunities/pwa')}
                        className="w-full mt-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Browse All Opportunities →
                      </button>
                    </div>
                  )}
                </div>

                {/* Recent Activity - Expandable */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleSection('activity')}
                    className="w-full p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-sm font-semibold text-stone-800 block">Recent Activity</span>
                      <span className="text-xs text-stone-500">{recentLogs.length} recent logs • {stats.pendingVerifications} pending</span>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-stone-400 transition-transform ${expandedSection === 'activity' ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedSection === 'activity' && (
                    <div className="px-4 pb-4 pt-2 border-t border-stone-100 bg-stone-50">
                      {recentLogs.length > 0 ? (
                        <div className="space-y-2">
                          {recentLogs.slice(0, 5).map((log: any) => (
                            <button
                              key={log.id}
                              onClick={() => toggleLogDetail(log.id)}
                              className="w-full bg-white rounded-lg p-3 border border-stone-200 text-left hover:border-indigo-300 hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-stone-800">{log.hours}h logged</p>
                                  <p className="text-xs text-stone-500">{log.projectName || 'Project'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                    log.status === 'verified' || log.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                    log.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {log.status === 'approved' ? 'Verified' : log.status || 'pending'}
                                  </span>
                                  <ChevronRight className={`h-4 w-4 text-stone-400 transition-transform ${selectedLogId === log.id ? 'rotate-90' : ''}`} />
                                </div>
                              </div>
                              {selectedLogId === log.id && (
                                <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
                                  <div className="flex items-center gap-2 text-xs text-stone-600">
                                    <Clock className="h-3 w-3" />
                                    <span>Logged on {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  </div>
                                  {(log.outcomeType || log.outcomeValue) && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <Target className="h-3 w-3 text-emerald-600" />
                                      <span className="text-emerald-700 font-medium">
                                        {log.outcomeType}{log.outcomeValue ? ` — Qty: ${log.outcomeValue}` : ''}
                                      </span>
                                    </div>
                                  )}
                                  {log.sdgGoals && log.sdgGoals.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {log.sdgGoals.map((sdg: number) => {
                                        return isValidSDG(sdg) ? (
                                          <span
                                            key={sdg}
                                            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                                            style={{ backgroundColor: getSDGColor(sdg) }}
                                          >
                                            SDG {sdg}
                                          </span>
                                        ) : null;
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-stone-500 text-center py-2">No activity yet</p>
                      )}
                      <button
                        onClick={() => setMobileTab('history')}
                        className="w-full mt-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        View Full History →
                      </button>
                    </div>
                  )}
                </div>

                {/* My Profile - Direct Link */}
                <button
                  onClick={() => navigate('/volunteer/settings')}
                  className="w-full bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors shadow-sm"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-semibold text-stone-800 block">My Profile</span>
                    <span className="text-xs text-stone-500">Update your skills and preferences</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-400" />
                </button>
              </div>

            </>
          )}

          {/* Wallet Tab Content */}
          {mobileTab === 'wallet' && (
            <>
              {/* Core Metrics - Interactive */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/volunteer/history')}
                  className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm text-left hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-stone-500 uppercase">Hours</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-800">{stats.hoursLogged}</p>
                  <p className="text-xs text-stone-500 mt-1">{stats.verifiedHours} confirmed →</p>
                </button>

                <button
                  onClick={() => navigate('/volunteer/history')}
                  className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm text-left hover:border-emerald-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-stone-500 uppercase">People</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-800">{stats.totalPeopleImpacted}</p>
                  <p className="text-xs text-stone-500 mt-1">people impacted →</p>
                </button>

                <button
                  onClick={() => navigate('/volunteer/settings')}
                  className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm text-left hover:border-amber-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-stone-500 uppercase">SDGs</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-800">{sdgsContributed}</p>
                  <p className="text-xs text-stone-500 mt-1">{stats.skillsCount} skills applied →</p>
                </button>

                <button
                  onClick={() => setMobileTab('projects')}
                  className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm text-left hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-medium text-stone-500 uppercase">Projects</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-800">{stats.totalProjects}</p>
                  <p className="text-xs text-stone-500 mt-1">{stats.projectsActive} active →</p>
                </button>
              </div>

              {/* Pending Verification Notice - Interactive */}
              {stats.pendingVerifications > 0 && (
                <button
                  onClick={() => navigate('/volunteer/history')}
                  className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 hover:border-amber-300 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700">
                        {stats.pendingVerifications} log{stats.pendingVerifications > 1 ? 's' : ''} pending verification
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-amber-600" />
                  </div>
                </button>
              )}

              {/* Recent Logs - Interactive */}
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
                <button
                  onClick={() => navigate('/volunteer/history')}
                  className="w-full px-4 py-3 border-b border-stone-100 flex items-center justify-between hover:bg-stone-50 transition-colors"
                >
                  <h2 className="text-sm font-semibold text-stone-800">Recent Activity</h2>
                  <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                    View All <ChevronRight className="h-3 w-3" />
                  </span>
                </button>
                <div className="divide-y divide-stone-100">
                  {recentLogs.slice(0, 5).map((log: any) => (
                    <button
                      key={log.id}
                      onClick={() => toggleLogDetail(log.id)}
                      className="w-full px-4 py-3 hover:bg-stone-50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-stone-800">{log.hours}h logged</p>
                          <p className="text-xs text-stone-500">{log.projectName || 'Project'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            log.status === 'verified' || log.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            log.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {log.status === 'approved' ? 'Verified' : log.status || 'pending'}
                          </span>
                          <ChevronRight className={`h-4 w-4 text-stone-400 transition-transform ${selectedLogId === log.id ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                      {selectedLogId === log.id && (
                        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-stone-600">
                            <Clock className="h-3 w-3" />
                            <span>Logged on {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          {(log.outcomeType || log.outcomeValue) && (
                            <div className="flex items-center gap-2 text-xs">
                              <Target className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-700 font-medium">
                                {log.outcomeType}{log.outcomeValue ? ` — Qty: ${log.outcomeValue}` : ''}
                              </span>
                            </div>
                          )}
                          {log.sdgGoals && log.sdgGoals.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {log.sdgGoals.map((sdg: number) => {
                                return isValidSDG(sdg) ? (
                                  <span
                                    key={sdg}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                                    style={{ backgroundColor: getSDGColor(sdg) }}
                                  >
                                    SDG {sdg}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                  {recentLogs.length === 0 && (
                    <button
                      onClick={() => navigate('/log-activity')}
                      className="w-full px-4 py-8 text-center hover:bg-stone-50 transition-colors"
                    >
                      <p className="text-sm text-stone-500">No activity yet</p>
                      <p className="text-xs text-indigo-600 mt-1">Tap to log your first impact →</p>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Projects Tab Content */}
          {mobileTab === 'projects' && (
            <>
              {/* My Projects Section */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-emerald-600" />
                  My Projects
                </h2>
                <span className="text-xs text-stone-500">{assignedProjects.length} assigned</span>
              </div>

              {isLoadingDashboard ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                </div>
              ) : assignedProjects.length > 0 ? (
                <div className="space-y-3">
                  {assignedProjects.map((project: any) => {
                    const isAppliedOnly = project.sourceType === 'applied';
                    const appStatus = project.applicationStatus?.toLowerCase();
                    // Determine badge: for applied projects show application status; for assigned show project status
                    const statusLabel = isAppliedOnly
                      ? (appStatus === 'accepted' ? 'Accepted' : 'Applied')
                      : (project.status || 'Active');
                    const statusColor = isAppliedOnly
                      ? (appStatus === 'accepted'
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-amber-100 text-amber-700')
                      : project.status?.toLowerCase() === 'in progress' || project.status?.toLowerCase() === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : project.status?.toLowerCase() === 'completed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-stone-100 text-stone-600';
                    const sdgs: number[] = project.sdgGoals || [];
                    return (
                      <div
                        key={project.id}
                        className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-stone-800 truncate">{project.name}</h3>
                            <p className="text-xs text-stone-500 mt-0.5">{project.organizationName || 'Organization'}</p>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor} flex-shrink-0 ml-2`}>
                            {statusLabel}
                          </span>
                        </div>
                        {isAppliedOnly && (
                          <p className="text-[10px] text-amber-600 mb-2">
                            Application submitted — awaiting review
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-stone-500 mt-2">
                          {(project.hoursContributed > 0 || project.totalHoursLogged > 0) && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {project.hoursContributed || project.totalHoursLogged}h logged
                            </span>
                          )}
                          {project.tasksCompleted > 0 && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> {project.tasksCompleted} tasks
                            </span>
                          )}
                        </div>
                        {sdgs.length > 0 && (
                          <div className="flex gap-1 mt-2 pt-2 border-t border-stone-100">
                            {sdgs.slice(0, 5).map((sdg: number) => (
                              <span
                                key={sdg}
                                className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center text-white"
                                style={{ backgroundColor: getSDGColor(sdg) }}
                              >
                                {sdg}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 text-center">
                  <FolderOpen className="h-10 w-10 text-stone-300 mx-auto mb-2" />
                  <p className="text-sm text-stone-500">No projects assigned yet</p>
                  <p className="text-xs text-stone-400 mt-1">Select a confirmed project to log measurable impact</p>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-stone-200 my-1" />

              {/* Matched Opportunities Section */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
                  <Search className="h-5 w-5 text-indigo-600" />
                  Recommended For You
                </h2>
                <span className="text-xs text-stone-500">4-Factor AI Match</span>
              </div>

              {isLoadingMatches ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : matchedProjects.length > 0 ? (
                <div className="space-y-3">
                  {matchedProjects.map((match: any, index: number) => {
                    const breakdown = match.matchBreakdown || {};
                    const skillMatch = Math.round(breakdown.skillMatch || 0);
                    const sdgMatch = Math.round(breakdown.sdgMatch || 0);
                    const locationMatch = Math.round(breakdown.locationMatch || 0);
                    const availMatch = Math.round(breakdown.availabilityMatch || 0);
                    const score = Math.round(match.matchScore || match.matchPercentage || 0);
                    const sdgList: number[] = match.sdgGoals || match.sdg_goals || [];
                    const navTarget = match.projectId
                      ? `/projects/${match.projectId}`
                      : `/opportunities/${match.id}`;
                    return (
                    <button
                      key={match.id || index}
                      className="w-full bg-white rounded-xl p-4 border border-stone-200 shadow-sm text-left hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                      onClick={() => navigate(navTarget)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-stone-800 truncate">
                            {match.title || match.name || 'Opportunity'}
                          </h3>
                          <p className="text-xs text-stone-500 mt-0.5 truncate">
                            {match.organizationName || match.organization_name || 'Organization'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-indigo-100 px-2 py-1 rounded-full flex-shrink-0 ml-2">
                          <TrendingUp className="h-3 w-3 text-indigo-600" />
                          <span className="text-xs font-semibold text-indigo-600">
                            {score}%
                          </span>
                        </div>
                      </div>

                      {/* Match Factors */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {skillMatch > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Skills +{skillMatch}
                          </span>
                        )}
                        {sdgMatch > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            SDG +{sdgMatch}
                          </span>
                        )}
                        {locationMatch > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Location +{locationMatch}
                          </span>
                        )}
                        {availMatch > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            Availability +{availMatch}
                          </span>
                        )}
                      </div>

                      {/* SDG Tags */}
                      {sdgList.length > 0 && (
                        <div className="flex gap-1 mt-3 pt-3 border-t border-stone-100">
                          {sdgList.slice(0, 4).map((sdg: number) => (
                            <span
                              key={sdg}
                              className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center text-white"
                              style={{ backgroundColor: getSDGColor(sdg) }}
                            >
                              {sdg}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                    );
                  })}

                  <button
                    onClick={() => navigate('/discover-opportunities/pwa')}
                    className="w-full py-3 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-white rounded-xl border border-stone-200 shadow-sm"
                  >
                    Browse All Opportunities
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8 text-center">
                  <Target className="h-12 w-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-stone-800">No matches yet</p>
                  <p className="text-xs text-stone-500 mt-1">
                    Complete your profile to get personalized project matches
                  </p>
                  <button
                    onClick={() => navigate('/volunteer/settings')}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Complete Profile
                  </button>
                </div>
              )}
            </>
          )}

          {/* History Tab Content */}
          {mobileTab === 'history' && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-800">Impact History</h2>
                <button
                  onClick={() => navigate('/log-activity')}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Log Activity
                </button>
              </div>

              {/* KPI Summary Banner */}
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-4 shadow-lg">
                <p className="text-xs text-emerald-200 font-medium mb-3 uppercase tracking-wider">Cumulative Impact KPIs</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.hoursLogged}</p>
                    <p className="text-[10px] text-emerald-200">Hours Logged</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalPeopleImpacted}</p>
                    <p className="text-[10px] text-emerald-200">People Reached</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.outcomesVerified}</p>
                    <p className="text-[10px] text-emerald-200">Verified</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center mt-3 pt-3 border-t border-emerald-500/30">
                  <div>
                    <p className="text-lg font-bold text-white">{sdgsContributed}</p>
                    <p className="text-[10px] text-emerald-200">SDGs</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{stats.skillsCount}</p>
                    <p className="text-[10px] text-emerald-200">Skills Used</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{stats.totalProjects}</p>
                    <p className="text-[10px] text-emerald-200">Projects</p>
                  </div>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex gap-2">
                {(['all', 'pending', 'verified', 'rejected'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handleHistoryFilterChange(filter)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      historyFilter === filter
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-stone-600 border border-stone-200'
                    }`}
                  >
                    {filter === 'all' ? `All (${allLogs.length})` : `${filter.charAt(0).toUpperCase() + filter.slice(1)} (${
                      filter === 'pending' ? allLogs.filter((l: any) => l.verificationStatus === 'pending').length
                        : filter === 'verified' ? allLogs.filter((l: any) => l.verificationStatus === 'approved').length
                          : allLogs.filter((l: any) => l.verificationStatus === 'rejected').length
                    })`}
                  </button>
                ))}
              </div>

              {/* Log Cards */}
              {isLoadingLogs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                </div>
              ) : filteredHistoryLogs.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8 text-center">
                  <Clock className="h-12 w-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-stone-800">
                    {historyFilter === 'all'
                      ? 'No activity logged yet.'
                      : `No ${historyFilter} logs found.`}
                  </p>
                  {historyFilter === 'all' && (
                    <>
                      <p className="text-xs text-stone-500 mt-1">
                        Submit your first activity to start your contribution record.
                      </p>
                      <button
                        onClick={() => navigate('/log-activity')}
                        className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        Log Activity
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistoryLogs.slice(0, visibleCount).map((log: any) => {
                    const logDate = new Date(log.date || log.createdAt);
                    const status = log.verificationStatus || 'pending';
                    const sdgTags: number[] = log.sdgTags || log.project?.sdgGoals || [];
                    const isExpanded = selectedLogId === log.id;

                    return (
                      <button
                        key={log.id}
                        onClick={() => toggleLogDetail(log.id)}
                        className={`w-full bg-white rounded-xl border shadow-sm p-4 space-y-2 text-left transition-all active:scale-[0.99] cursor-pointer ${
                          isExpanded ? 'border-indigo-300 shadow-md' : 'border-stone-200 hover:border-indigo-200 hover:shadow-md'
                        }`}
                      >
                        {/* Row 1: Date, Hours, Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-sm text-stone-600">
                            <span className="font-medium text-stone-800">
                              {logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            {log.hours != null && (
                              <>
                                <span className="text-stone-300">|</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {log.hours} hrs
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : status === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}>
                              {status === 'approved' ? 'Verified' : status === 'rejected' ? 'Rejected' : 'Pending'}
                            </span>
                            <ChevronRight className={`h-4 w-4 text-stone-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </div>

                        {/* Row 2: Project/NGO name */}
                        <p className="text-xs text-stone-500">
                          {log.project?.name || 'Unknown Project'}
                        </p>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-2 pt-3 border-t border-stone-100 space-y-2">
                            {/* KPI Metrics - Outcome type + quantity */}
                            {(log.outcomes || log.outcomeQuantity) && (
                              <div className="bg-stone-50 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <Target className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                  <span className="text-sm font-medium text-stone-800">
                                    {log.outcomes || 'Outcome'}
                                  </span>
                                  {log.outcomeQuantity && (
                                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                      Qty: {log.outcomeQuantity}
                                    </span>
                                  )}
                                </div>
                                {log.peopleImpacted > 0 && (
                                  <p className="text-xs text-stone-500 mt-1 ml-5">
                                    {log.peopleImpacted} people impacted
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Full date/time */}
                            <div className="flex items-center gap-2 text-xs text-stone-600">
                              <Clock className="h-3 w-3" />
                              <span>{logDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>

                            {/* SDG Tags - show all */}
                            {sdgTags.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {sdgTags.map((sdg: number) => {
                                  return isValidSDG(sdg) ? (
                                    <span
                                      key={sdg}
                                      className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                      style={{ backgroundColor: getSDGColor(sdg) }}
                                    >
                                      SDG {sdg}: {getSDGName(sdg)}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            )}

                            {/* Rejection reason (only for rejected) */}
                            {status === 'rejected' && log.rejectedReason && (
                              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                                Reason: &ldquo;{log.rejectedReason}&rdquo;
                              </p>
                            )}

                            {/* Description if available */}
                            {log.description && (
                              <p className="text-xs text-stone-600 bg-stone-50 rounded-lg px-3 py-2">
                                {log.description}
                              </p>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Load More */}
                  {filteredHistoryLogs.length > visibleCount && (
                    <button
                      onClick={() => setVisibleCount(prev => prev + 20)}
                      className="w-full py-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-white rounded-xl border border-stone-200 shadow-sm"
                    >
                      Load More ({filteredHistoryLogs.length - visibleCount} remaining)
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </main>

      </>
    );
  }

  // Desktop View
  return (
    <main className="container max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* ── Desktop Tab Bar ───────────────────────────────────────────────── */}
      <div className="border-b border-border -mb-2">
        <nav className="flex gap-1">
          {VOLUNTEER_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setDesktopTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                desktopTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Home Tab ─────────────────────────────────────────────────────── */}
      {desktopTab === 'home' && (
        <>
          {/* Page Header */}
          <PageHeader
            title={`Welcome back, ${activeUser?.displayName?.split(" ")[0] || "Volunteer"}`}
            description="Log activity, track verification status, and view your contribution record."
            actions={
              <Button variant="accent" size="lg" onClick={() => navigate('/log-activity')}>
                <Plus className="h-5 w-5 mr-2" />
                Log Activity
              </Button>
            }
          />

          {/* Quick Stats Row - Interactive Cards */}
          <Grid columns={4} gap="default">
            <div onClick={() => setKpiModal('sdgs')} className="cursor-pointer hover:scale-[1.02] transition-transform">
              <MetricCard
                label="SDGs Addressed"
                value={sdgsContributed}
                subtitle={`${stats.skillsCount} skills applied`}
                accentColor="primary"
                icon={<Globe className="h-5 w-5 text-primary" />}
              />
            </div>
            <div onClick={() => setKpiModal('hours')} className="cursor-pointer hover:scale-[1.02] transition-transform">
              <MetricCard
                label="Hours Logged"
                value={stats.hoursLogged}
                subtitle={`${stats.verifiedHours} verified`}
                accentColor="accent"
                icon={<Clock className="h-5 w-5 text-accent" />}
              />
            </div>
            <div onClick={() => setKpiModal('impact')} className="cursor-pointer hover:scale-[1.02] transition-transform">
              <MetricCard
                label="People Reached"
                value={stats.totalPeopleImpacted}
                subtitle={`${stats.outcomesVerified} confirmed activities`}
                accentColor="success"
                icon={<Target className="h-5 w-5 text-success" />}
              />
            </div>
            <div onClick={() => setKpiModal('projects')} className="cursor-pointer hover:scale-[1.02] transition-transform">
              <MetricCard
                label="Active Projects"
                value={stats.projectsActive}
                subtitle={`${stats.sdgsAddressed} SDGs addressed`}
                accentColor="cyan"
                icon={<Globe className="h-5 w-5 text-[#22D3EE]" />}
              />
            </div>
          </Grid>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Impact Summary */}
            <div className="space-y-6">
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setDesktopTab('my-work')}>
                <CardContent className="p-6">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Contribution Summary
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDesktopTab('my-work'); }}
                      className="space-y-1 text-left hover:bg-secondary/50 p-2 rounded-lg transition-colors -m-2"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">Hours Logged</span>
                      </div>
                      <p className="text-xl font-semibold text-foreground">{stats.hoursLogged}</p>
                      <p className="text-xs text-muted-foreground">{stats.verifiedHours} confirmed</p>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDesktopTab('opportunities'); }}
                      className="space-y-1 text-left hover:bg-secondary/50 p-2 rounded-lg transition-colors -m-2"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Target className="h-4 w-4" />
                        <span className="text-xs">People Reached</span>
                      </div>
                      <p className="text-xl font-semibold text-foreground">{stats.totalPeopleImpacted}</p>
                      <p className="text-xs text-muted-foreground">{stats.outcomesVerified} confirmed activities</p>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDesktopTab('my-work'); }}
                      className="space-y-1 text-left hover:bg-secondary/50 p-2 rounded-lg transition-colors -m-2"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <span className="text-xs">SDGs Addressed</span>
                      </div>
                      <p className="text-xl font-semibold text-foreground">{sdgsContributed}</p>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/volunteer/settings'); }}
                      className="space-y-1 text-left hover:bg-secondary/50 p-2 rounded-lg transition-colors -m-2"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Award className="h-4 w-4" />
                        <span className="text-xs">Skills Applied</span>
                      </div>
                      <p className="text-xl font-semibold text-foreground">{stats.skillsCount}</p>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center Column - Recent Activity */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setDesktopTab('my-work')}>
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoadingLogs ? (
                    <LoadingState message="Loading activity..." />
                  ) : recentLogs.length === 0 ? (
                    <EmptyState
                      title="No activity yet"
                      description="Log your first impact to get started"
                      size="sm"
                    />
                  ) : (
                    <div className="space-y-3">
                      {recentLogs.map((log: any) => (
                        <button
                          key={log.id}
                          onClick={() => toggleLogDetail(log.id)}
                          className={`w-full flex flex-col p-4 rounded-lg transition-all text-left cursor-pointer ${
                            selectedLogId === log.id ? 'bg-secondary shadow-md ring-1 ring-primary/20' : 'bg-secondary/50 hover:bg-secondary hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center gap-4 w-full">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-primary" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{log.projectName}</p>
                              <p className="text-xs text-muted-foreground">
                                {log.hours}h logged on {new Date(log.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <StatusBadge status={log.status} size="sm" />
                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedLogId === log.id ? 'rotate-90' : ''}`} />
                          </div>
                          {selectedLogId === log.id && (
                            <div className="mt-3 pt-3 border-t border-border space-y-2 pl-14">
                              {(log.outcomeType || log.outcomeValue) && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Target className="h-3.5 w-3.5 text-emerald-600" />
                                  <span className="text-foreground font-medium">
                                    {log.outcomeType}{log.outcomeValue ? ` — Qty: ${log.outcomeValue}` : ''}
                                  </span>
                                </div>
                              )}
                              {log.sdgGoals && log.sdgGoals.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {log.sdgGoals.map((sdg: number) => {
                                    return isValidSDG(sdg) ? (
                                      <span
                                        key={sdg}
                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                        style={{ backgroundColor: getSDGColor(sdg) }}
                                      >
                                        SDG {sdg}: {getSDGName(sdg)}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* ── My Work Tab ──────────────────────────────────────────────────── */}
      {desktopTab === 'my-work' && (
        <>
          {/* My Work Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setDesktopTab('home')}>
                <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
                Home
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Impact History</h1>
                <p className="text-sm text-muted-foreground">Track your KPIs and submitted impact logs</p>
              </div>
            </div>
            <Button variant="accent" onClick={() => navigate('/log-activity')}>
              <Plus className="h-4 w-4 mr-2" />
              Log Activity
            </Button>
          </div>

          {/* KPI Summary Cards */}
          <Grid columns={3} gap="default">
            <MetricCard
              label="Hours Logged"
              value={stats.hoursLogged}
              subtitle={`${stats.verifiedHours} confirmed`}
              accentColor="accent"
              icon={<Clock className="h-5 w-5 text-accent" />}
            />
            <MetricCard
              label="People Reached"
              value={stats.totalPeopleImpacted}
              subtitle={`${stats.outcomesVerified} confirmed activities`}
              accentColor="success"
              icon={<Target className="h-5 w-5 text-success" />}
            />
            <MetricCard
              label="SDGs Addressed"
              value={sdgsContributed}
              subtitle={`${stats.skillsCount} skills applied`}
              accentColor="primary"
              icon={<Globe className="h-5 w-5 text-primary" />}
            />
          </Grid>

          {/* Filter Pills */}
          <div className="flex gap-2">
            {(['all', 'pending', 'verified', 'rejected'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => handleHistoryFilterChange(filter)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  historyFilter === filter
                    ? 'bg-emerald-600 text-white'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                {filter === 'all' ? `All (${allLogs.length})` : `${filter.charAt(0).toUpperCase() + filter.slice(1)}`}
                {filter !== 'all' && (
                  <span className="ml-1.5 opacity-70">
                    ({filter === 'pending'
                      ? allLogs.filter((l: any) => l.verificationStatus === 'pending').length
                      : filter === 'verified'
                        ? allLogs.filter((l: any) => l.verificationStatus === 'approved').length
                        : allLogs.filter((l: any) => l.verificationStatus === 'rejected').length
                    })
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Log Cards */}
          <Card>
            <CardContent className="p-0">
              {isLoadingLogs ? (
                <div className="p-8">
                  <LoadingState message="Loading history..." />
                </div>
              ) : filteredHistoryLogs.length === 0 ? (
                <div className="p-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-base font-medium text-foreground">
                    {historyFilter === 'all'
                      ? 'No activity logged yet.'
                      : `No ${historyFilter} logs found.`}
                  </p>
                  {historyFilter === 'all' && (
                    <>
                      <p className="text-sm text-muted-foreground mt-1">
                        Submit your first activity to start your contribution record.
                      </p>
                      <Button
                        variant="accent"
                        className="mt-4"
                        onClick={() => navigate('/log-activity')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Log Activity
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredHistoryLogs.slice(0, visibleCount).map((log: any) => {
                    const logDate = new Date(log.date || log.createdAt);
                    const status = log.verificationStatus || 'pending';
                    const sdgTags: number[] = log.sdgTags || log.project?.sdgGoals || [];
                    const isExpanded = selectedLogId === log.id;

                    return (
                      <button
                        key={log.id}
                        onClick={() => toggleLogDetail(log.id)}
                        className={`w-full text-left px-6 py-4 transition-all cursor-pointer ${
                          isExpanded ? 'bg-secondary/50 shadow-inner' : 'hover:bg-secondary/30'
                        }`}
                      >
                        <div className="flex items-start gap-6">
                          {/* Date */}
                          <div className="w-16 flex-shrink-0 text-center pt-1">
                            <p className="text-sm font-semibold text-foreground">
                              {logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>

                          {/* Hours */}
                          <div className="w-16 flex-shrink-0 text-center pt-1">
                            <p className="text-sm font-medium text-muted-foreground">
                              {log.hours != null ? `${log.hours} hrs` : '\u2014'}
                            </p>
                          </div>

                          {/* Outcome KPIs + Project */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {log.project?.name || 'Unknown Project'}
                            </p>
                            {(log.outcomes || log.outcomeQuantity) && (
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Target className="h-3 w-3 text-emerald-600" />
                                  {log.outcomes || 'Outcome'}
                                </span>
                                {log.outcomeQuantity && (
                                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    Qty: {log.outcomeQuantity}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Status Badge + Chevron */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                              status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : status === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}>
                              {status === 'approved' ? 'Verified' : status === 'rejected' ? 'Rejected' : 'Pending'}
                            </span>
                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </div>

                        {/* Expanded Detail Panel */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-border ml-[8.5rem] space-y-3">
                            {/* Full date */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{logDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>

                            {/* Outcome detail */}
                            {(log.outcomes || log.outcomeQuantity) && (
                              <div className="bg-secondary/50 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <Target className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                  <span className="text-sm font-medium text-foreground">
                                    {log.outcomes || 'Outcome'}
                                  </span>
                                  {log.outcomeQuantity && (
                                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                      Qty: {log.outcomeQuantity}
                                    </span>
                                  )}
                                </div>
                                {log.peopleImpacted > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1 ml-5">
                                    {log.peopleImpacted} people impacted
                                  </p>
                                )}
                              </div>
                            )}

                            {/* SDG tags with labels */}
                            {sdgTags.length > 0 && (
                              <div className="flex gap-1.5 flex-wrap">
                                {sdgTags.map((sdg: number) => {
                                  return isValidSDG(sdg) ? (
                                    <span
                                      key={sdg}
                                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                                      style={{ backgroundColor: getSDGColor(sdg) }}
                                    >
                                      SDG {sdg}: {getSDGName(sdg)}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            )}

                            {/* Rejection reason */}
                            {status === 'rejected' && log.rejectedReason && (
                              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                                Reason: &ldquo;{log.rejectedReason}&rdquo;
                              </p>
                            )}

                            {/* Description */}
                            {log.description && (
                              <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2">
                                {log.description}
                              </p>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Load More */}
              {filteredHistoryLogs.length > visibleCount && (
                <div className="border-t border-border p-4 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => setVisibleCount(prev => prev + 20)}
                  >
                    Load More ({filteredHistoryLogs.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Opportunities Tab ────────────────────────────────────────────── */}
      {desktopTab === 'opportunities' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Top Matched Opportunities</h1>
              <p className="text-sm text-muted-foreground">Ranked by your skills, availability and mission alignment</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setDesktopTab('home')}>
              <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
              Home
            </Button>
          </div>

          {isLoadingOpportunities ? (
            <LoadingState message="Finding your best matches…" />
          ) : opportunitiesData.length === 0 ? (
            <EmptyState
              title="No matches yet"
              description="Complete your profile and skills to unlock personalised recommendations."
              action={{ label: "Update Profile", onClick: () => navigate('/volunteer/settings') }}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {opportunitiesData.slice(0, 6).map((opp: any) => (
                <Card key={opp.id} className="flex flex-col hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug line-clamp-2">{opp.title || opp.name}</CardTitle>
                      {opp.matchScore != null && (
                        <Badge className="flex-shrink-0 bg-emerald-100 text-emerald-700 border-0">
                          {Math.round(opp.matchScore)}% match
                        </Badge>
                      )}
                    </div>
                    {opp.organizationName && (
                      <p className="text-xs text-muted-foreground font-medium">{opp.organizationName}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    {opp.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{opp.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {(opp.sdgGoals || []).slice(0, 3).map((sdg: number) => (
                        isValidSDG(sdg) && (
                          <span
                            key={sdg}
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: getSDGColor(sdg) }}
                          >
                            SDG {sdg}
                          </span>
                        )
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {opp.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {opp.location}
                        </span>
                      )}
                      {opp.timeCommitment && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {opp.timeCommitment}
                        </span>
                      )}
                    </div>
                    {opp.whyMatch && (
                      <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                        <p className="text-xs text-emerald-700 font-medium mb-0.5">Why this is a good match</p>
                        <p className="text-xs text-emerald-600 line-clamp-2">{opp.whyMatch}</p>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="w-full mt-auto bg-gradient-to-r from-teal-500 to-blue-500 text-white border-0 hover:opacity-90"
                      onClick={() => navigate(`/opportunities/${opp.id}`)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* KPI Preview Modals */}

      {/* SDGs Addressed Modal */}
      <Dialog open={kpiModal === 'sdgs'} onOpenChange={() => setKpiModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              SDGs You've Contributed To
            </DialogTitle>
          </DialogHeader>
          {sdgList.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{sdgList.length} Sustainable Development Goals addressed across your activities</p>
              <div className="grid grid-cols-2 gap-2">
                {sdgList.map((sdg) => (
                  <div key={sdg} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/20">
                    <span
                      className="w-8 h-8 rounded text-xs font-bold flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: getSDGColor(sdg) }}
                    >
                      {sdg}
                    </span>
                    <span className="text-xs font-medium text-foreground leading-tight">{getSDGName(sdg)}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => { setKpiModal(null); navigate('/volunteer/settings'); }}>
                Update My SDG Commitments
              </Button>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Globe className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No SDG data yet — log your first activity to see your contributions.</p>
              <Button size="sm" className="mt-3" onClick={() => { setKpiModal(null); navigate('/log-activity'); }}>Log Activity</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hours Logged Modal */}
      <Dialog open={kpiModal === 'hours'} onOpenChange={() => setKpiModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              Hours Breakdown
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{stats.hoursLogged}</p>
                <p className="text-xs text-blue-600 mt-0.5">Total Logged</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{stats.verifiedHours}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Verified</p>
              </div>
            </div>
            {hoursByProject.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">By Project</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {hoursByProject.map((proj) => (
                    <div key={proj.name} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                      <span className="text-sm font-medium text-foreground truncate flex-1 mr-2">{proj.name}</span>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-bold text-stone-800">{proj.hours}h</span>
                        {proj.verified > 0 && (
                          <span className="text-xs text-emerald-600 ml-1">({proj.verified}h ✓)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={() => { setKpiModal(null); setDesktopTab('my-work'); }}>
              View Full History
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* People Reached Modal */}
      <Dialog open={kpiModal === 'impact'} onOpenChange={() => setKpiModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-success" />
              People Reached
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{stats.totalPeopleImpacted}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Partner-Reported Reach</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{stats.outcomesVerified}</p>
                <p className="text-xs text-blue-600 mt-0.5">Confirmed Activities</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">Partner-reported reach is not independently verified. It reflects figures reported by the partner organization and is provided as reporting context only.</p>
            {allLogs.filter((l: any) => l.verificationStatus === 'approved' && (l.outcomeQuantity || 0) > 0).length > 0 ? (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Confirmed Activities</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allLogs
                    .filter((l: any) => l.verificationStatus === 'approved')
                    .slice(0, 6)
                    .map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-xs font-medium text-stone-800 truncate">{log.project?.name || 'Unknown Project'}</p>
                          {log.outcomes && <p className="text-[11px] text-stone-500 truncate">{log.outcomes}</p>}
                        </div>
                        {(log.outcomeQuantity || 0) > 0 && (
                          <span className="text-xs font-bold text-emerald-700 flex-shrink-0">{log.outcomeQuantity} people</span>
                        )}
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">Log confirmed activities to see your impact on people.</p>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={() => { setKpiModal(null); setDesktopTab('my-work'); }}>
              View All Activity
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Projects Modal */}
      <Dialog open={kpiModal === 'projects'} onOpenChange={() => setKpiModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-cyan-500" />
              Your Projects
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cyan-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-cyan-700">{stats.projectsActive}</p>
                <p className="text-xs text-cyan-600 mt-0.5">Active</p>
              </div>
              <div className="bg-stone-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-stone-700">{stats.totalProjects}</p>
                <p className="text-xs text-stone-500 mt-0.5">Total</p>
              </div>
            </div>
            {assignedProjects.length > 0 ? (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {assignedProjects.map((project: any) => {
                  const isActive = !project.status || project.status.toLowerCase() === 'active' || project.status.toLowerCase() === 'in progress';
                  const sdgs: number[] = project.sdgGoals || [];
                  return (
                    <div key={project.id} className="p-3 rounded-lg border border-border bg-secondary/20 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground leading-tight">{project.name}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                          {project.status || 'Active'}
                        </span>
                      </div>
                      {project.organizationName && (
                        <p className="text-xs text-muted-foreground">{project.organizationName}</p>
                      )}
                      {sdgs.length > 0 && (
                        <div className="flex gap-1">
                          {sdgs.slice(0, 5).map((sdg) => (
                            <span key={sdg} className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: getSDGColor(sdg) }}>
                              {sdg}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No projects yet. Explore opportunities to get started.</p>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={() => { setKpiModal(null); setDesktopTab('opportunities'); }}>
              Browse Opportunities
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </main>
  );
});

export default VolunteerView;
