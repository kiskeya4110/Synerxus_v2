import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Trophy,
  TrendingUp,
  Clock,
  Target,
  Award,
  Zap,
  Medal,
  Flame,
  Star,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useViewportDetection } from "@/hooks/use-mobile";
import OrganizationPWANav from "@/components/layout/organization-pwa-nav";
import OrganizationPWAHeader from "@/components/layout/organization-pwa-header";
import { PWALoadingSkeleton } from "@/components/layout/pwa-page-guard";

type LeaderboardType = "points" | "hours" | "impacts" | "tasks" | "streak";

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

export default function VolunteerLeaderboardPWA() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isMobile, isLoading: isViewportLoading } = useViewportDetection();
  const queryClient = useQueryClient();
  const userId = localStorage.getItem("currentUserId");
  const userType = localStorage.getItem("userType");

  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>("points");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redirect to desktop view when not on mobile (after viewport detection completes)
  useEffect(() => {
    if (!isViewportLoading && !isMobile) {
      navigate("/organization-leaderboard");
    }
  }, [isViewportLoading, isMobile, navigate]);

  // Redirect non-organization users
  useEffect(() => {
    if (userType && userType !== "organization") {
      navigate("/volunteer-dashboard");
    }
  }, [userType, navigate]);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
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
  const { data: leaderboardData = [], isLoading, refetch: refetchLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/organization-leaderboard", currentUser?.organizationId, leaderboardType],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch(
        `/api/organization-leaderboard?organizationId=${currentUser.organizationId}&type=${leaderboardType}&limit=50`
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
    staleTime: 30000,
  });

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchLeaderboard();
      toast({ title: "Refreshed", description: "Leaderboard updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to refresh", variant: "destructive" });
    }
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refetchLeaderboard, toast]);

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <Medal className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const getLeaderboardLabel = (type: LeaderboardType) => {
    const labels: Record<LeaderboardType, string> = {
      points: "Points",
      hours: "Hours",
      impacts: "Impacts",
      tasks: "Tasks",
      streak: "Streak",
    };
    return labels[type];
  };

  const getLeaderboardValue = (entry: LeaderboardEntry, type: LeaderboardType) => {
    switch (type) {
      case "points":
        return entry.totalPoints.toLocaleString();
      case "hours":
        return `${entry.totalHours}h`;
      case "impacts":
        return entry.impactsLogged.toString();
      case "tasks":
        return entry.tasksCompleted.toString();
      case "streak":
        return `${entry.weeklyStreak}w`;
      default:
        return entry.totalPoints.toLocaleString();
    }
  };

  // Show loading skeleton while viewport is being detected or redirecting to desktop
  if (isViewportLoading || !isMobile) {
    return <PWALoadingSkeleton />;
  }

  // Loading state for data
  if (isLoading && leaderboardData.length === 0) {
    return <PWALoadingSkeleton />;
  }

  // Calculate totals
  const totalVolunteers = leaderboardData.length;
  const totalHours = leaderboardData.reduce((sum, v) => sum + v.totalHours, 0);
  const totalPoints = leaderboardData.reduce((sum, v) => sum + v.totalPoints, 0);

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full bg-[#faf9f7] text-slate-800 flex flex-col overflow-hidden z-40">
      {/* Centered App Container */}
      <div className="relative w-full h-full max-w-[428px] mx-auto flex flex-col">
        {/* Shared Header with Refresh Button */}
        <OrganizationPWAHeader
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20">
          <div className="p-4 space-y-4">
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-purple-200 via-indigo-200 to-blue-200 rounded-2xl p-4 text-slate-800 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/40 backdrop-blur rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Volunteer Leaderboard</h1>
                <p className="text-slate-600 text-xs">{organization?.name || "Organization"}</p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-white/40 backdrop-blur rounded-xl p-2 text-center">
                <p className="text-xl font-bold text-slate-800">{totalVolunteers}</p>
                <p className="text-[10px] text-purple-700">Volunteers</p>
              </div>
              <div className="bg-white/40 backdrop-blur rounded-xl p-2 text-center">
                <p className="text-xl font-bold text-slate-800">{totalHours.toLocaleString()}</p>
                <p className="text-[10px] text-purple-700">Total Hours</p>
              </div>
              <div className="bg-white/40 backdrop-blur rounded-xl p-2 text-center">
                <p className="text-xl font-bold text-slate-800">{totalPoints.toLocaleString()}</p>
                <p className="text-[10px] text-purple-700">Total Points</p>
              </div>
            </div>
          </div>

          {/* Metric Selector */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-2">
              Rank By
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(["points", "hours", "impacts", "tasks", "streak"] as LeaderboardType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setLeaderboardType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    leaderboardType === type
                      ? "bg-gradient-to-r from-purple-300 to-indigo-300 text-purple-800 shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {type === "points" && <Zap className="w-3 h-3 inline mr-1" />}
                  {type === "hours" && <Clock className="w-3 h-3 inline mr-1" />}
                  {type === "impacts" && <Target className="w-3 h-3 inline mr-1" />}
                  {type === "tasks" && <Award className="w-3 h-3 inline mr-1" />}
                  {type === "streak" && <Flame className="w-3 h-3 inline mr-1" />}
                  {getLeaderboardLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {/* Top 3 Podium */}
          {leaderboardData.length >= 3 && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200 shadow-sm">
              <h3 className="text-xs font-semibold text-amber-800 mb-3 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500" />
                Top Performers
              </h3>
              <div className="flex items-end justify-center gap-2">
                {/* 2nd Place */}
                <div className="flex flex-col items-center w-24">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold text-lg shadow-md mb-1">
                    {leaderboardData[1]?.displayName?.charAt(0) || "2"}
                  </div>
                  <Medal className="w-5 h-5 text-slate-400 -mt-2 relative z-10" />
                  <p className="text-[10px] font-medium text-slate-700 truncate w-full text-center mt-1">
                    {leaderboardData[1]?.displayName || "2nd"}
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    {getLeaderboardValue(leaderboardData[1], leaderboardType)}
                  </p>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center w-28 -mb-2">
                  <div className="w-18 h-18 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-1 w-[72px] h-[72px] ring-4 ring-yellow-200">
                    {leaderboardData[0]?.displayName?.charAt(0) || "1"}
                  </div>
                  <Medal className="w-6 h-6 text-yellow-500 -mt-3 relative z-10" />
                  <p className="text-xs font-semibold text-slate-800 truncate w-full text-center mt-1">
                    {leaderboardData[0]?.displayName || "1st"}
                  </p>
                  <p className="text-sm font-bold text-amber-600">
                    {getLeaderboardValue(leaderboardData[0], leaderboardType)}
                  </p>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center w-24">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white font-bold text-lg shadow-md mb-1">
                    {leaderboardData[2]?.displayName?.charAt(0) || "3"}
                  </div>
                  <Medal className="w-5 h-5 text-amber-600 -mt-2 relative z-10" />
                  <p className="text-[10px] font-medium text-slate-700 truncate w-full text-center mt-1">
                    {leaderboardData[2]?.displayName || "3rd"}
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    {getLeaderboardValue(leaderboardData[2], leaderboardType)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rankings List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Full Rankings
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {leaderboardData.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No volunteers yet</p>
                  <p className="text-xs text-slate-400">Invite volunteers to start tracking</p>
                </div>
              ) : (
                leaderboardData.map((entry, index) => {
                  const rank = index + 1;
                  const medal = getMedalIcon(rank);
                  const isTopThree = rank <= 3;

                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        isTopThree ? "bg-gradient-to-r from-amber-50/50 to-transparent" : ""
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-8 flex items-center justify-center flex-shrink-0">
                        {medal || (
                          <span className="text-sm font-bold text-slate-400">#{rank}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                          isTopThree
                            ? "bg-gradient-to-br from-purple-300 to-indigo-300 text-purple-800"
                            : "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-700"
                        }`}
                      >
                        {entry.displayName?.charAt(0)?.toUpperCase() || "V"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {entry.displayName || "Volunteer"}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>{entry.totalHours}h</span>
                          <span>•</span>
                          <span>{entry.tasksCompleted} tasks</span>
                          <span>•</span>
                          <span>{entry.impactsLogged} impacts</span>
                        </div>
                      </div>

                      {/* Value */}
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`text-lg font-bold ${
                            isTopThree ? "text-purple-600" : "text-slate-600"
                          }`}
                        >
                          {getLeaderboardValue(entry, leaderboardType)}
                        </p>
                        <p className="text-[9px] text-slate-400 uppercase">
                          {getLeaderboardLabel(leaderboardType)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* How Points are Calculated */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <h3 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-purple-500" />
              How Points are Calculated
            </h3>
            <div className="space-y-2 text-[11px] text-slate-600">
              <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                <span className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Volunteer Hours
                </span>
                <span className="font-semibold text-blue-600">10 pts/hour</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                <span className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  Impacts Logged
                </span>
                <span className="font-semibold text-emerald-600">50 pts/impact</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                <span className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  Tasks Completed
                </span>
                <span className="font-semibold text-amber-600">Tracked</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                <span className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  Weekly Streak
                </span>
                <span className="font-semibold text-orange-600">Consistency bonus</span>
              </div>
            </div>
          </div>
          </div>
        </main>

        {/* Bottom Navigation */}
        <OrganizationPWANav activeTab="leaderboard" />
      </div>
    </div>
  );
}
