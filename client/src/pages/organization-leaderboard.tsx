import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Clock, TrendingUp } from "lucide-react";

export default function OrganizationLeaderboard() {
  const { user } = useAuth();
  const userId = localStorage.getItem('currentUserId');
  const [leaderboardType, setLeaderboardType] = useState("hours");

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

  // Fetch organization leaderboard
  const { data: leaderboardData = [] } = useQuery({
    queryKey: ["/api/organization-leaderboard", leaderboardType, currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch(
        `/api/organization-leaderboard?organizationId=${currentUser.organizationId}&type=${leaderboardType}`
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  const getLeaderboardLabel = (type: string) => {
    const labels: Record<string, string> = {
      hours: "Total Hours Contributed",
      impacts: "Impacts Recorded",
      tasks: "Tasks Completed",
      points: "Gamification Points",
    };
    return labels[type] || "Rankings";
  };

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 md:px-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-8 w-8 text-yellow-600" />
          <h1 className="text-3xl font-bold">Volunteer Leaderboard</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Track your team's top contributors and celebrate impact
        </p>
      </div>

      {/* Organization Stats Overview */}
      {leaderboardData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Active Volunteers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{leaderboardData.length}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">on your team</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {leaderboardData.reduce((sum: number, v: any) => sum + (v.totalHours || 0), 0)}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">logged by team</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Impacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {leaderboardData.reduce((sum: number, v: any) => sum + (v.impactsLogged || 0), 0)}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">recorded & verified</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Total Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {leaderboardData.reduce((sum: number, v: any) => sum + (v.badgesEarned || 0), 0)}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">earned by team</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard Type Selector */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Leaderboard Category</CardTitle>
          <CardDescription>
            Choose a metric to rank your volunteers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["hours", "impacts", "tasks", "points"].map((type) => (
              <button
                key={type}
                onClick={() => setLeaderboardType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  leaderboardType === type
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                data-testid={`org-tab-${type}`}
              >
                {getLeaderboardLabel(type)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Volunteer Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>{getLeaderboardLabel(leaderboardType)}</CardTitle>
          <CardDescription>
            Your organization's top volunteers this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaderboardData.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No volunteer data available yet
              </p>
            ) : (
              leaderboardData.map((volunteer: any, index: number) => {
                const medal = getMedalIcon(index + 1);
                return (
                  <div
                    key={volunteer.userId}
                    className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    data-testid={`org-leaderboard-entry-${index}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 text-center">
                        {medal ? (
                          <span className="text-2xl">{medal}</span>
                        ) : (
                          <span className="text-xl font-bold text-gray-400">
                            #{index + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{volunteer.displayName || "Volunteer"}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex gap-3 mt-1">
                          <span>{volunteer.badgesEarned} 🏆</span>
                          <span>·</span>
                          <span>{volunteer.impactsLogged} 📊</span>
                          <span>·</span>
                          <span>{volunteer.tasksCompleted} ✓</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {leaderboardType === "hours" && `${volunteer.totalHours}h`}
                        {leaderboardType === "impacts" && volunteer.impactsLogged}
                        {leaderboardType === "tasks" && volunteer.tasksCompleted}
                        {leaderboardType === "points" && volunteer.totalPoints}
                      </div>
                      {volunteer.weeklyStreak > 0 && (
                        <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          🔥 {volunteer.weeklyStreak} weeks
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
