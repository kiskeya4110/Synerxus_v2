import { useState, useMemo } from "react";
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
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, MetricCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, SDGBadge, StatusBadge } from "@/components/ui/badge";
import { CircularProgress, ProgressWithLabel } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { Section, PageHeader, Grid, Divider } from "@/components/ui/section";
import { formatDecimal } from "@/lib/format-utils";
import { cn } from "@/lib/utils";

// SDG Data
const SDG_OPTIONS = [
  { value: 1, label: "No Poverty", color: "#E5243B" },
  { value: 2, label: "Zero Hunger", color: "#DDA63A" },
  { value: 3, label: "Good Health", color: "#4C9F38" },
  { value: 4, label: "Quality Education", color: "#C5192D" },
  { value: 5, label: "Gender Equality", color: "#FF3A21" },
  { value: 6, label: "Clean Water", color: "#26BDE2" },
  { value: 7, label: "Affordable Energy", color: "#FCC30B" },
  { value: 8, label: "Decent Work", color: "#A21942" },
  { value: 9, label: "Industry Innovation", color: "#FD6925" },
  { value: 10, label: "Reduced Inequalities", color: "#DD1367" },
  { value: 11, label: "Sustainable Cities", color: "#FD9D24" },
  { value: 12, label: "Responsible Consumption", color: "#BF8B2E" },
  { value: 13, label: "Climate Action", color: "#3F7E44" },
  { value: 14, label: "Life Below Water", color: "#0A97D9" },
  { value: 15, label: "Life on Land", color: "#56C02B" },
  { value: 16, label: "Peace Justice", color: "#00689D" },
  { value: 17, label: "Partnerships", color: "#19486A" },
];


// Main VolunteerView Component
interface VolunteerViewProps {
  userId: string;
  isMobile: boolean;
  activeUser: any;
  mobileTab: 'home' | 'wallet' | 'projects' | 'history';
  setMobileTab: (tab: 'home' | 'wallet' | 'projects' | 'history') => void;
}

export default function VolunteerView({
  userId,
  isMobile,
  activeUser,
  mobileTab,
  setMobileTab,
}: VolunteerViewProps) {
  const [, navigate] = useLocation();

  // State for expandable sections on dashboard
  const [expandedSection, setExpandedSection] = useState<'wallet' | 'projects' | 'activity' | null>(null);

  // History tab state
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [visibleCount, setVisibleCount] = useState(20);

  const toggleSection = (section: 'wallet' | 'projects' | 'activity') => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const handleHistoryFilterChange = (filter: 'all' | 'pending' | 'verified' | 'rejected') => {
    setHistoryFilter(filter);
    setVisibleCount(20);
  };

  // Fetch dashboard data
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["/api/dashboard", userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/dashboard?userId=${userId}`);
        if (!response.ok) return null;
        return response.json();
      } catch (error) {
        console.warn("Failed to fetch dashboard:", error);
        return null;
      }
    },
    enabled: !!userId,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects", userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/projects?userId=${userId}`);
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        console.warn("Failed to fetch projects:", error);
        return [];
      }
    },
    enabled: !!userId,
  });

  // Fetch all impact logs (used for history tab + recent display)
  const { data: allLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["/api/logs", userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/logs?user_id=${userId}`);
        if (!response.ok) return [];
        const logs = await response.json();
        return Array.isArray(logs) ? logs : [];
      } catch (error) {
        console.warn("Failed to fetch logs:", error);
        return [];
      }
    },
    enabled: !!userId,
  });

  // Derive recent logs for home/wallet display
  const recentLogs = allLogs.slice(0, 5).map((log: any) => ({
    id: log.id,
    projectName: log.project?.name || "Unknown Project",
    hours: log.hours,
    status: log.verificationStatus || "pending",
    createdAt: log.createdAt,
    outcomeType: log.outcomes,
    outcomeValue: log.outcomeQuantity,
    sdgGoals: log.sdgTags || log.project?.sdgGoals || [],
  }));

  // Fetch matched projects
  const { data: matchedProjects = [], isLoading: isLoadingMatches } = useQuery({
    queryKey: ["/api/matchmaker/volunteer", userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/matchmaker/volunteer/${userId}?limit=4`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.matches || [];
      } catch (error) {
        console.warn("Failed to fetch matched projects:", error);
        return [];
      }
    },
    enabled: !!userId,
    retry: 1,
  });

  // Calculate stats - only from actual data, no fallbacks that could show fake numbers
  const stats = useMemo(() => {
    const data = dashboardData || {};
    // Only count hours from verified logs
    const verifiedHours = allLogs
      .filter((l: any) => l.verificationStatus === 'approved')
      .reduce((sum: number, l: any) => sum + (l.hours || 0), 0);

    return {
      impactScore: data.totalAiu || data.impactScore || 0,
      hoursLogged: data.totalHours || verifiedHours || 0,
      projectsActive: data.activeProjects || 0,
      currentStreak: data.currentStreak || 0,
      longestStreak: data.longestStreak || 0,
      pendingVerifications: allLogs.filter((l: any) => l.verificationStatus === "pending").length,
    };
  }, [dashboardData, allLogs]);

  // Calculate metrics - only from actual logged data
  const totalOutcomes = allLogs
    .filter((l: any) => l.verificationStatus === 'approved')
    .reduce((sum: number, log: any) => sum + (log.outcomeQuantity || 0), 0);

  // Skills used - count only if user has logged activities with skills
  const skillsUsed = allLogs.length > 0
    ? (dashboardData?.volunteerProfile?.skills?.length || 0)
    : 0;

  // SDGs - only count from actual logged activities, not from all projects
  const sdgsContributed = useMemo(() => {
    const sdgsFromLogs = allLogs.flatMap((l: any) => l.sdgTags || l.project?.sdgGoals || []);
    return new Set(sdgsFromLogs).size;
  }, [allLogs]);

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
                    <p className="text-3xl font-bold text-white">{stats.projectsActive}</p>
                    <p className="text-xs text-indigo-200">Projects</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{sdgsContributed}</p>
                    <p className="text-xs text-indigo-200">SDGs</p>
                  </div>
                </div>
              </button>

              {/* Interactive Quick Actions with Expandable Content */}
              <div className="space-y-3">
                <h2 className="text-stone-800 font-semibold">Quick Actions</h2>

                {/* Log Impact - Opens Modal */}
                <button
                  onClick={() => navigate('/log-activity')}
                  className="w-full bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors shadow-sm"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-semibold text-stone-800 block">Log Impact</span>
                    <span className="text-xs text-stone-500">Record your volunteer hours and outcomes</span>
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
                      <span className="text-xs text-stone-500">{stats.hoursLogged} hours • {sdgsContributed} SDGs</span>
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
                            <Globe className="h-4 w-4 text-indigo-600" />
                            <span className="text-xs text-stone-500">SDGs</span>
                          </div>
                          <p className="text-2xl font-bold text-stone-800">{sdgsContributed}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-stone-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs text-stone-500">Projects</span>
                          </div>
                          <p className="text-2xl font-bold text-stone-800">{stats.projectsActive}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-stone-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="h-4 w-4 text-amber-600" />
                            <span className="text-xs text-stone-500">Skills</span>
                          </div>
                          <p className="text-2xl font-bold text-stone-800">{skillsUsed}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setMobileTab('wallet')}
                        className="w-full mt-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        View Full Wallet →
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
                          {matchedProjects.slice(0, 3).map((match: any, index: number) => (
                            <div
                              key={match.organization_id || index}
                              className="bg-white rounded-lg p-3 border border-stone-200 flex items-center justify-between"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-stone-800 truncate">
                                  {match.organization_name || 'Organization'}
                                </p>
                                <p className="text-xs text-stone-500">
                                  {match.cause_area || 'Community Impact'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 bg-indigo-100 px-2 py-1 rounded-full ml-2">
                                <TrendingUp className="h-3 w-3 text-indigo-600" />
                                <span className="text-xs font-semibold text-indigo-600">
                                  {Math.round(match.match_score || match.score || 0)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-stone-500 text-center py-2">No matches yet</p>
                      )}
                      <button
                        onClick={() => navigate('/discover-opportunities')}
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
                          {recentLogs.slice(0, 3).map((log: any) => (
                            <div key={log.id} className="bg-white rounded-lg p-3 border border-stone-200 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-stone-800">{log.hours}h logged</p>
                                <p className="text-xs text-stone-500">{log.projectName || 'Project'}</p>
                              </div>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                log.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                                log.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {log.status || 'pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-stone-500 text-center py-2">No activity yet</p>
                      )}
                      <button
                        onClick={() => navigate('/volunteer/history')}
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
                  <p className="text-xs text-stone-500 mt-1">verified hours →</p>
                </button>

                <button
                  onClick={() => navigate('/volunteer/history')}
                  className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm text-left hover:border-emerald-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-stone-500 uppercase">Outcomes</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-800">{totalOutcomes}</p>
                  <p className="text-xs text-stone-500 mt-1">total outcomes →</p>
                </button>

                <button
                  onClick={() => navigate('/volunteer/settings')}
                  className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm text-left hover:border-amber-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-stone-500 uppercase">Skills</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-800">{skillsUsed}</p>
                  <p className="text-xs text-stone-500 mt-1">skills applied →</p>
                </button>

                <button
                  onClick={() => setMobileTab('projects')}
                  className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm text-left hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-medium text-stone-500 uppercase">SDGs</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-800">{sdgsContributed}</p>
                  <p className="text-xs text-stone-500 mt-1">goals impacted →</p>
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
                      onClick={() => navigate('/volunteer/history')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-800">{log.hours}h logged</p>
                        <p className="text-xs text-stone-500">{log.projectName || 'Project'}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        log.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                        log.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {log.status || 'pending'}
                      </span>
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-800">Best Matches For You</h2>
                <span className="text-xs text-stone-500">4-Factor AI Match</span>
              </div>

              {isLoadingMatches ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : matchedProjects.length > 0 ? (
                <div className="space-y-3">
                  {matchedProjects.slice(0, 4).map((match: any, index: number) => (
                    <button
                      key={match.organization_id || index}
                      className="w-full bg-white rounded-xl p-4 border border-stone-200 shadow-sm text-left hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                      onClick={() => navigate(`/opportunities/${match.organization_id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-stone-800">
                            {match.organization_name || 'Organization'}
                          </h3>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {match.cause_area || match.focus_area || 'Community Impact'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-indigo-100 px-2 py-1 rounded-full">
                          <TrendingUp className="h-3 w-3 text-indigo-600" />
                          <span className="text-xs font-semibold text-indigo-600">
                            {Math.round(match.match_score || match.score || 0)}%
                          </span>
                        </div>
                      </div>

                      {/* Match Factors */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {match.skills_match > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Skills +{Math.round(match.skills_match)}
                          </span>
                        )}
                        {match.sdg_match > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            SDG +{Math.round(match.sdg_match)}
                          </span>
                        )}
                        {match.location_match > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Location +{Math.round(match.location_match)}
                          </span>
                        )}
                        {match.availability_match > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            Availability +{Math.round(match.availability_match)}
                          </span>
                        )}
                      </div>

                      {/* SDG Tags */}
                      {match.sdg_goals && match.sdg_goals.length > 0 && (
                        <div className="flex gap-1 mt-3 pt-3 border-t border-stone-100">
                          {match.sdg_goals.slice(0, 4).map((sdg: number) => (
                            <span
                              key={sdg}
                              className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center text-white"
                              style={{ backgroundColor: SDG_OPTIONS.find(s => s.value === sdg)?.color || '#6B7280' }}
                            >
                              {sdg}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
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
                <h2 className="text-lg font-semibold text-stone-800">History</h2>
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
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
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
                      ? 'No impact logged yet.'
                      : `No ${historyFilter} logs found.`}
                  </p>
                  {historyFilter === 'all' && (
                    <>
                      <p className="text-xs text-stone-500 mt-1">
                        Start by logging your first outcome!
                      </p>
                      <button
                        onClick={() => navigate('/log-activity')}
                        className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        Log Impact
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
                    const firstSdg = sdgTags.length > 0 ? SDG_OPTIONS.find(s => s.value === sdgTags[0]) : null;

                    return (
                      <div
                        key={log.id}
                        className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 space-y-2"
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
                                <span>{log.hours} hrs</span>
                              </>
                            )}
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}>
                            {status === 'approved' ? '✓ Verified' : status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                          </span>
                        </div>

                        {/* Row 2: Outcome type + quantity, SDG tag */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {(log.outcomes || log.outcomeQuantity) && (
                            <span className="text-sm text-stone-700">
                              {log.outcomes || 'Outcome'}{log.outcomeQuantity ? ` (${log.outcomeQuantity})` : ''}
                            </span>
                          )}
                          {firstSdg && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                              style={{ backgroundColor: firstSdg.color }}
                            >
                              SDG {firstSdg.value}
                            </span>
                          )}
                        </div>

                        {/* Row 3: Project/NGO name */}
                        <p className="text-xs text-stone-500">
                          {log.project?.name || 'Unknown Project'}
                        </p>

                        {/* Rejection reason (only for rejected) */}
                        {status === 'rejected' && log.rejectedReason && (
                          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                            Reason: "{log.rejectedReason}"
                          </p>
                        )}
                      </div>
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
      {/* Desktop: Dashboard Home View */}
      {mobileTab !== 'history' && (
        <>
          {/* Page Header */}
          <PageHeader
            title={`Welcome back, ${activeUser?.displayName?.split(" ")[0] || "Volunteer"}`}
            description="Track your impact, log your hours, and make a difference."
            actions={
              <Button variant="accent" size="lg" onClick={() => navigate('/log-activity')}>
                <Plus className="h-5 w-5 mr-2" />
                Log Impact
              </Button>
            }
          />

          {/* Quick Stats Row - Interactive Cards */}
          <Grid columns={4} gap="default">
            <div onClick={() => setMobileTab('history')} className="cursor-pointer hover:scale-[1.02] transition-transform">
              <MetricCard
                label="Impact Score"
                value={formatDecimal(stats.impactScore)}
                subtitle="points earned"
                accentColor="primary"
                icon={<Award className="h-5 w-5 text-primary" />}
              />
            </div>
            <div onClick={() => setMobileTab('history')} className="cursor-pointer hover:scale-[1.02] transition-transform">
              <MetricCard
                label="Hours Logged"
                value={stats.hoursLogged}
                subtitle="total hours"
                accentColor="accent"
                icon={<Clock className="h-5 w-5 text-accent" />}
              />
            </div>
            <div onClick={() => navigate('/discover-opportunities')} className="cursor-pointer hover:scale-[1.02] transition-transform">
              <MetricCard
                label="Active Projects"
                value={stats.projectsActive}
                subtitle="contributing to"
                accentColor="success"
                icon={<Target className="h-5 w-5 text-success" />}
              />
            </div>
            <div onClick={() => setMobileTab('history')} className="cursor-pointer hover:scale-[1.02] transition-transform">
              <MetricCard
                label="Pending Verification"
                value={stats.pendingVerifications}
                subtitle="awaiting review"
                accentColor="cyan"
                icon={<AlertCircle className="h-5 w-5 text-[#22D3EE]" />}
              />
            </div>
          </Grid>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Impact Score */}
            <div className="space-y-6">
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setMobileTab('history')}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Your Impact Score
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-foreground tabular-nums">
                          {formatDecimal(stats.impactScore)}
                        </span>
                        <span className="text-lg text-muted-foreground">pts</span>
                      </div>
                    </div>
                    <CircularProgress value={Math.min((stats.impactScore / 100) * 100, 100)} size={64} color="accent" showValue />
                  </div>

                  <Divider className="my-4" />

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMobileTab('history'); }}
                      className="space-y-1 text-left hover:bg-secondary/50 p-2 rounded-lg transition-colors -m-2"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">Hours Logged</span>
                      </div>
                      <p className="text-xl font-semibold text-foreground">{stats.hoursLogged}</p>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/discover-opportunities'); }}
                      className="space-y-1 text-left hover:bg-secondary/50 p-2 rounded-lg transition-colors -m-2"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Target className="h-4 w-4" />
                        <span className="text-xs">Active Projects</span>
                      </div>
                      <p className="text-xl font-semibold text-foreground">{stats.projectsActive}</p>
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
                  <Button variant="ghost" size="sm" onClick={() => setMobileTab('history')}>
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
                          onClick={() => setMobileTab('history')}
                          className="w-full flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary hover:shadow-md transition-all text-left cursor-pointer"
                        >
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
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
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

      {/* Desktop: History View */}
      {mobileTab === 'history' && (
        <>
          {/* History Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setMobileTab('home')}>
                <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">History</h1>
                <p className="text-sm text-muted-foreground">Your submitted impact logs</p>
              </div>
            </div>
            <Button variant="accent" onClick={() => navigate('/log-activity')}>
              <Plus className="h-4 w-4 mr-2" />
              Log Impact
            </Button>
          </div>

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
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
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
                      ? 'No impact logged yet.'
                      : `No ${historyFilter} logs found.`}
                  </p>
                  {historyFilter === 'all' && (
                    <>
                      <p className="text-sm text-muted-foreground mt-1">
                        Start by logging your first outcome!
                      </p>
                      <Button
                        variant="accent"
                        className="mt-4"
                        onClick={() => navigate('/log-activity')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Log Impact
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
                    const firstSdg = sdgTags.length > 0 ? SDG_OPTIONS.find(s => s.value === sdgTags[0]) : null;

                    return (
                      <div
                        key={log.id}
                        className="flex items-center gap-6 px-6 py-4 hover:bg-secondary/30 transition-colors"
                      >
                        {/* Date */}
                        <div className="w-16 flex-shrink-0 text-center">
                          <p className="text-sm font-semibold text-foreground">
                            {logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>

                        {/* Hours */}
                        <div className="w-16 flex-shrink-0 text-center">
                          <p className="text-sm font-medium text-muted-foreground">
                            {log.hours != null ? `${log.hours} hrs` : '—'}
                          </p>
                        </div>

                        {/* Outcome + Project */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(log.outcomes || log.outcomeQuantity) && (
                              <span className="text-sm font-medium text-foreground">
                                {log.outcomes || 'Outcome'}{log.outcomeQuantity ? ` (${log.outcomeQuantity})` : ''}
                              </span>
                            )}
                            {firstSdg && (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                style={{ backgroundColor: firstSdg.color }}
                              >
                                SDG {firstSdg.value}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {log.project?.name || 'Unknown Project'}
                          </p>
                          {status === 'rejected' && log.rejectedReason && (
                            <p className="text-xs text-red-600 mt-1">
                              Reason: &ldquo;{log.rejectedReason}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full ${
                          status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}>
                          {status === 'approved' ? '✓ Verified' : status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                        </span>
                      </div>
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

    </main>
  );
}
