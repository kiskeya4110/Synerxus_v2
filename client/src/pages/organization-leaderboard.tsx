import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Clock, TrendingUp, Target, Award, Zap, Flame, Medal, ChevronRight, BarChart3, ArrowLeft } from "lucide-react";
import OrganizationHeader from "@/components/layout/organization-header";
import OrganizationWelcomeBanner from "@/components/layout/organization-welcome-banner";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  userId: number;
  displayName: string;
  totalHours: number;
  tasksCompleted: number;
  projectsCompleted: number;
  impactsLogged: number;
  weeklyStreak: number;
  maxStreak: number;
  totalPoints: number;
  badgesEarned: number;
}

type LeaderboardType = "hours" | "impacts" | "tasks" | "points" | "streak";

export default function OrganizationLeaderboard() {
  const userId = localStorage.getItem('currentUserId');
  const userType = localStorage.getItem('userType');
  const [, navigate] = useLocation();
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>("hours");
  const isMobile = useIsMobile();

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch organization
  const { data: organization } = useQuery({
    queryKey: ["/api/organizations", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(`/api/organizations/${currentUser.organizationId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  // Fetch organization leaderboard
  const { data: leaderboardData = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/organization-leaderboard", leaderboardType, currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch(
        `/api/organization-leaderboard?organizationId=${currentUser.organizationId}&type=${leaderboardType}&limit=50`
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  // Auto-import: Fetch volunteer summaries from dashboard for fallback/additional data
  const { data: dashboardData } = useQuery<any>({
    queryKey: ["/api/organization/dashboard", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/organization/dashboard?userId=${userId}`);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId && leaderboardData.length === 0,
  });

  // Merge leaderboard data with volunteer summaries from dashboard (auto-import)
  const mergedLeaderboardData: LeaderboardEntry[] = useMemo(() => {
    if (leaderboardData.length > 0) return leaderboardData;

    // Auto-import volunteers from dashboard if no leaderboard data
    if (dashboardData?.volunteerSummaries && dashboardData.volunteerSummaries.length > 0) {
      const mapped = dashboardData.volunteerSummaries.map((v: any): LeaderboardEntry => ({
        userId: v.id,
        displayName: v.name || `Volunteer ${v.id}`,
        totalHours: v.hours || 0,
        tasksCompleted: v.projects || 0,
        projectsCompleted: v.projects || 0,
        impactsLogged: 0,
        weeklyStreak: 1,
        maxStreak: 52,
        totalPoints: Math.round((v.hours || 0) * 10),
        badgesEarned: 0,
      }));
      // Sort by selected leaderboard type so top performers are first
      return mapped.sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
        if (leaderboardType === "hours") return b.totalHours - a.totalHours;
        if (leaderboardType === "impacts") return b.impactsLogged - a.impactsLogged;
        if (leaderboardType === "tasks") return b.tasksCompleted - a.tasksCompleted;
        if (leaderboardType === "points") return b.totalPoints - a.totalPoints;
        return b.weeklyStreak - a.weeklyStreak;
      });
    }
    return [];
  }, [leaderboardData, dashboardData, leaderboardType]);

  // Calculate aggregate stats using merged data
  const stats = useMemo(() => {
    if (!mergedLeaderboardData.length) return null;
    return {
      totalVolunteers: mergedLeaderboardData.length,
      totalHours: mergedLeaderboardData.reduce((sum, v) => sum + (v.totalHours || 0), 0),
      totalImpacts: mergedLeaderboardData.reduce((sum, v) => sum + (v.impactsLogged || 0), 0),
      totalTasks: mergedLeaderboardData.reduce((sum, v) => sum + (v.tasksCompleted || 0), 0),
      totalPoints: mergedLeaderboardData.reduce((sum, v) => sum + (v.totalPoints || 0), 0),
      avgHours: mergedLeaderboardData.length > 0
        ? Math.round(mergedLeaderboardData.reduce((sum, v) => sum + (v.totalHours || 0), 0) / mergedLeaderboardData.length)
        : 0,
      topPerformer: mergedLeaderboardData[0],
    };
  }, [mergedLeaderboardData]);

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <Medal className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const getLeaderboardLabel = (type: LeaderboardType) => {
    const labels: Record<LeaderboardType, string> = {
      hours: "Total Hours",
      impacts: "Impacts Logged",
      tasks: "Tasks Completed",
      points: "Points Earned",
      streak: "Weekly Streak",
    };
    return labels[type];
  };

  const getLeaderboardIcon = (type: LeaderboardType) => {
    const icons: Record<LeaderboardType, any> = {
      hours: Clock,
      impacts: Target,
      tasks: Award,
      points: Zap,
      streak: Flame,
    };
    return icons[type];
  };

  const getLeaderboardValue = (entry: LeaderboardEntry, type: LeaderboardType) => {
    switch (type) {
      case "hours": return `${entry.totalHours}h`;
      case "impacts": return entry.impactsLogged.toString();
      case "tasks": return entry.tasksCompleted.toString();
      case "points": return entry.totalPoints.toLocaleString();
      case "streak": return `${entry.weeklyStreak}w`;
      default: return entry.totalHours.toString();
    }
  };

  const leaderboardCategories: { type: LeaderboardType; label: string; icon: any; color: string }[] = [
    { type: "hours", label: "Hours", icon: Clock, color: "bg-blue-500" },
    { type: "impacts", label: "Impacts", icon: Target, color: "bg-emerald-500" },
    { type: "tasks", label: "Tasks", icon: Award, color: "bg-purple-500" },
    { type: "points", label: "Points", icon: Zap, color: "bg-amber-500" },
    { type: "streak", label: "Streak", icon: Flame, color: "bg-orange-500" },
  ];

  // Use localStorage as fallback for PWA layout detection during initial load
  const isOrganizationForLayout = currentUser?.userType === 'organization' || userType === 'organization';

  // Mobile PWA View for Organizations
  if (isMobile && isOrganizationForLayout) {
    return (
      <OrganizationPWALayout activeTab="leaderboard">
        <div className="p-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/volunteers')}
            className="mb-3 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-xl p-4 text-white mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Volunteer Leaderboard</h1>
                <p className="text-orange-100 text-xs">{organization?.name || "Your Organization"}</p>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
                  <p className="text-sm font-bold">{stats.totalVolunteers}</p>
                  <p className="text-[8px] text-white/70">Volunteers</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
                  <p className="text-sm font-bold">{stats.totalHours}</p>
                  <p className="text-[8px] text-white/70">Hours</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
                  <p className="text-sm font-bold">{stats.totalImpacts}</p>
                  <p className="text-[8px] text-white/70">Impacts</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
                  <p className="text-sm font-bold">{stats.totalPoints.toLocaleString()}</p>
                  <p className="text-[8px] text-white/70">Points</p>
                </div>
              </div>
            )}
          </div>

          {/* Category Selector */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-slate-700 mb-2">Rank By Category</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {leaderboardCategories.map((cat) => (
                <button
                  key={cat.type}
                  onClick={() => setLeaderboardType(cat.type)}
                  className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 rounded-lg font-medium text-[9px] whitespace-nowrap transition-all ${
                    leaderboardType === cat.type
                      ? `${cat.color} text-white shadow-md`
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Top 3 Podium */}
          {mergedLeaderboardData.length >= 3 && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200 mb-4">
              <h3 className="text-xs font-semibold text-amber-800 mb-3 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                Top 3 - {getLeaderboardLabel(leaderboardType)}
              </h3>
              <div className="flex items-end justify-center gap-2">
                {/* 2nd Place */}
                <div className="flex flex-col items-center w-20">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold text-sm shadow-md mb-1">
                    {mergedLeaderboardData[1]?.displayName?.charAt(0)?.toUpperCase() || "2"}
                  </div>
                  <p className="text-[10px] font-medium text-slate-700 truncate w-full text-center">{mergedLeaderboardData[1]?.displayName}</p>
                  <p className="text-[9px] text-slate-500">{getLeaderboardValue(mergedLeaderboardData[1], leaderboardType)}</p>
                </div>
                {/* 1st Place */}
                <div className="flex flex-col items-center w-24">
                  <Medal className="w-5 h-5 text-yellow-500 mb-1" />
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-lg mb-1">
                    {mergedLeaderboardData[0]?.displayName?.charAt(0)?.toUpperCase() || "1"}
                  </div>
                  <p className="text-xs font-medium text-slate-800 truncate w-full text-center">{mergedLeaderboardData[0]?.displayName}</p>
                  <p className="text-[10px] text-amber-600 font-semibold">{getLeaderboardValue(mergedLeaderboardData[0], leaderboardType)}</p>
                </div>
                {/* 3rd Place */}
                <div className="flex flex-col items-center w-20">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white font-bold text-sm shadow-md mb-1">
                    {mergedLeaderboardData[2]?.displayName?.charAt(0)?.toUpperCase() || "3"}
                  </div>
                  <p className="text-[10px] font-medium text-slate-700 truncate w-full text-center">{mergedLeaderboardData[2]?.displayName}</p>
                  <p className="text-[9px] text-slate-500">{getLeaderboardValue(mergedLeaderboardData[2], leaderboardType)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Full Rankings */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                Full Rankings
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
                </div>
              ) : mergedLeaderboardData.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <Trophy className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p>No leaderboard data yet</p>
                  <p className="text-xs mt-1">Volunteers will appear here when they log activities</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {mergedLeaderboardData.map((volunteer, index) => {
                    const rank = index + 1;
                    const medal = getMedalIcon(rank);
                    const isTopThree = rank <= 3;
                    const Icon = getLeaderboardIcon(leaderboardType);

                    return (
                      <div
                        key={volunteer.userId}
                        className={`flex items-center gap-3 px-3 py-2.5 ${
                          isTopThree ? "bg-gradient-to-r from-amber-50/50 to-transparent" : ""
                        }`}
                      >
                        <div className="w-6 flex items-center justify-center flex-shrink-0">
                          {medal || <span className="text-xs font-bold text-slate-400">#{rank}</span>}
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${
                          isTopThree
                            ? "bg-gradient-to-br from-amber-500 to-orange-500"
                            : "bg-gradient-to-br from-slate-400 to-slate-500"
                        }`}>
                          {volunteer.displayName?.charAt(0)?.toUpperCase() || "V"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{volunteer.displayName || "Volunteer"}</p>
                          <div className="flex items-center gap-2 text-[9px] text-slate-500">
                            <span>{volunteer.totalHours}h</span>
                            <span>•</span>
                            <span>{volunteer.tasksCompleted} tasks</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <Icon className={`w-3 h-3 ${isTopThree ? "text-amber-500" : "text-slate-400"}`} />
                            <span className={`text-sm font-bold ${isTopThree ? "text-amber-600" : "text-slate-600"}`}>
                              {getLeaderboardValue(volunteer, leaderboardType)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </OrganizationPWALayout>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ paddingBottom: '140px' }}>
      {/* Header */}
      <OrganizationHeader activeTab="volunteers" />
      <OrganizationWelcomeBanner pageTitle="Volunteer Leaderboard" />

      {/* Mobile Header Banner */}
      <div className="md:hidden bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-4 py-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Trophy className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Volunteer Leaderboard</h1>
            <p className="text-orange-100 text-sm">{organization?.name || "Your Organization"}</p>
          </div>
        </div>

        {/* Mobile Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-lg font-bold">{stats.totalVolunteers}</p>
              <p className="text-[9px] text-white/70">Volunteers</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-lg font-bold">{stats.totalHours}</p>
              <p className="text-[9px] text-white/70">Hours</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-lg font-bold">{stats.totalImpacts}</p>
              <p className="text-[9px] text-white/70">Impacts</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-lg font-bold">{stats.totalPoints.toLocaleString()}</p>
              <p className="text-[9px] text-white/70">Points</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-8 w-8 text-yellow-600" />
              <h1 className="text-3xl font-bold text-slate-900">Volunteer Leaderboard</h1>
            </div>
            <p className="text-slate-600">
              Track your team's top contributors and celebrate impact at {organization?.name || "your organization"}
            </p>
          </div>
          <button
            onClick={() => navigate('/volunteers')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Manage Volunteers
          </button>
        </div>

        {/* Desktop Stats Cards */}
        {stats && (
          <div className="hidden md:grid grid-cols-5 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Active Volunteers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-900">{stats.totalVolunteers}</p>
                <p className="text-xs text-blue-600 mt-1">on your team</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-emerald-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Total Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-900">{stats.totalHours.toLocaleString()}</p>
                <p className="text-xs text-emerald-600 mt-1">contributed</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-purple-700 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Impacts Logged
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-900">{stats.totalImpacts}</p>
                <p className="text-xs text-purple-600 mt-1">recorded</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Tasks Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-900">{stats.totalTasks}</p>
                <p className="text-xs text-amber-600 mt-1">by team</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-orange-700 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Total Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-900">{stats.totalPoints.toLocaleString()}</p>
                <p className="text-xs text-orange-600 mt-1">earned</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Category Selector - Fits in frame */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2 md:text-base">Rank By Category</h3>
          <div className="grid grid-cols-5 gap-1.5 md:flex md:gap-2 md:overflow-x-auto md:pb-2">
            {leaderboardCategories.map((cat) => (
              <button
                key={cat.type}
                onClick={() => setLeaderboardType(cat.type)}
                className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl font-medium text-[10px] md:text-sm whitespace-nowrap transition-all ${
                  leaderboardType === cat.type
                    ? `${cat.color} text-white shadow-lg`
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
                data-testid={`org-tab-${cat.type}`}
              >
                <cat.icon className="w-4 h-4" />
                <span className="hidden md:inline">{cat.label}</span>
                <span className="md:hidden text-[9px]">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Top 3 Podium - Mobile */}
        {mergedLeaderboardData.length >= 3 && (
          <div className="md:hidden bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200 mb-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Top 3 - {getLeaderboardLabel(leaderboardType)}
            </h3>
            <div className="flex items-end justify-center gap-3">
              {/* 2nd Place */}
              <div className="flex flex-col items-center w-24">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold text-lg shadow-md mb-1">
                  {mergedLeaderboardData[1]?.displayName?.charAt(0) || "2"}
                </div>
                <Medal className="w-5 h-5 text-slate-400 -mt-2 relative z-10" />
                <p className="text-[10px] font-medium text-slate-700 truncate w-full text-center mt-1">
                  {mergedLeaderboardData[1]?.displayName || "2nd"}
                </p>
                <p className="text-xs font-bold text-slate-600">
                  {getLeaderboardValue(mergedLeaderboardData[1], leaderboardType)}
                </p>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center w-28 -mb-2">
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-1 ring-4 ring-yellow-200">
                  {mergedLeaderboardData[0]?.displayName?.charAt(0) || "1"}
                </div>
                <Medal className="w-6 h-6 text-yellow-500 -mt-3 relative z-10" />
                <p className="text-xs font-semibold text-slate-800 truncate w-full text-center mt-1">
                  {mergedLeaderboardData[0]?.displayName || "1st"}
                </p>
                <p className="text-sm font-bold text-amber-600">
                  {getLeaderboardValue(mergedLeaderboardData[0], leaderboardType)}
                </p>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center w-24">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white font-bold text-lg shadow-md mb-1">
                  {mergedLeaderboardData[2]?.displayName?.charAt(0) || "3"}
                </div>
                <Medal className="w-5 h-5 text-amber-600 -mt-2 relative z-10" />
                <p className="text-[10px] font-medium text-slate-700 truncate w-full text-center mt-1">
                  {mergedLeaderboardData[2]?.displayName || "3rd"}
                </p>
                <p className="text-xs font-bold text-slate-600">
                  {getLeaderboardValue(mergedLeaderboardData[2], leaderboardType)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rankings Card */}
        <Card className="shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  {getLeaderboardLabel(leaderboardType)} Rankings
                </CardTitle>
                <CardDescription>
                  Your organization's top volunteers
                </CardDescription>
              </div>
              {stats && (
                <div className="hidden md:block text-right">
                  <p className="text-2xl font-bold text-emerald-600">
                    {leaderboardType === "hours" && stats.totalHours.toLocaleString()}
                    {leaderboardType === "impacts" && stats.totalImpacts}
                    {leaderboardType === "tasks" && stats.totalTasks}
                    {leaderboardType === "points" && stats.totalPoints.toLocaleString()}
                    {leaderboardType === "streak" && `${Math.max(...mergedLeaderboardData.map(v => v.weeklyStreak))}w`}
                  </p>
                  <p className="text-xs text-slate-500">Total {getLeaderboardLabel(leaderboardType)}</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-slate-500">Loading leaderboard...</p>
              </div>
            ) : mergedLeaderboardData.length === 0 ? (
              <div className="p-8 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">No volunteer data available yet</p>
                <p className="text-slate-400 text-sm mt-1">Start logging activities to see rankings</p>
                <button
                  onClick={() => navigate('/volunteers')}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  Add Volunteers
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {mergedLeaderboardData.map((volunteer, index) => {
                  const rank = index + 1;
                  const medal = getMedalIcon(rank);
                  const isTopThree = rank <= 3;
                  const Icon = getLeaderboardIcon(leaderboardType);

                  return (
                    <div
                      key={volunteer.userId}
                      className={`flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors ${
                        isTopThree ? "bg-gradient-to-r from-amber-50/50 to-transparent" : ""
                      }`}
                      data-testid={`org-leaderboard-entry-${index}`}
                    >
                      {/* Rank */}
                      <div className="w-10 flex items-center justify-center flex-shrink-0">
                        {medal || (
                          <span className="text-lg font-bold text-slate-400">#{rank}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 ${
                          isTopThree
                            ? "bg-gradient-to-br from-amber-500 to-orange-500"
                            : "bg-gradient-to-br from-slate-400 to-slate-500"
                        }`}
                      >
                        {volunteer.displayName?.charAt(0)?.toUpperCase() || "V"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {volunteer.displayName || "Volunteer"}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {volunteer.totalHours}h
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {volunteer.impactsLogged}
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {volunteer.tasksCompleted}
                          </span>
                          {volunteer.weeklyStreak > 0 && (
                            <span className="flex items-center gap-1 text-orange-600">
                              <Flame className="w-3 h-3" />
                              {volunteer.weeklyStreak}w
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Value */}
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isTopThree ? "text-amber-500" : "text-slate-400"}`} />
                          <span
                            className={`text-xl font-bold ${
                              isTopThree ? "text-amber-600" : "text-slate-600"
                            }`}
                          >
                            {getLeaderboardValue(volunteer, leaderboardType)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                          {getLeaderboardLabel(leaderboardType)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Point System Explanation - Matches algorithm in gamification.router.ts */}
        <div className="mt-6 bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl p-4 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            How Points Are Calculated
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Points = (Hours × 10) + (Impacts × 50) + (Tasks × 5)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-slate-600">Hours</span>
              </div>
              <p className="text-sm font-bold text-blue-600">10 pts/hour</p>
              <p className="text-[10px] text-slate-400 mt-1">From volunteer activities</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-slate-600">Impacts</span>
              </div>
              <p className="text-sm font-bold text-emerald-600">50 pts/impact</p>
              <p className="text-[10px] text-slate-400 mt-1">Logged impact metrics</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-medium text-slate-600">Tasks</span>
              </div>
              <p className="text-sm font-bold text-purple-600">5 pts/task</p>
              <p className="text-[10px] text-slate-400 mt-1">Project assignments</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-slate-600">Streaks</span>
              </div>
              <p className="text-sm font-bold text-orange-600">Weekly</p>
              <p className="text-[10px] text-slate-400 mt-1">Active weeks count</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Only for organizations */}
      {currentUser?.userType === 'organization' && <MobileBottomNav />}
    </div>
  );
}
