import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Zap } from "lucide-react";
import PWAHeader from "@/components/pwa/pwa-header";
import VolunteerPWANav from "@/components/layout/volunteer-pwa-nav";
import VolunteerNav from "@/components/layout/volunteer-nav";
import Footer from "@/components/layout/footer";

export default function Leaderboard() {
  const { user } = useAuth();
  const userId = localStorage.getItem('currentUserId');
  const userType = localStorage.getItem('userType');
  const isMobile = useIsMobile();
  const isVolunteerMobile = isMobile && userType === 'volunteer';
  const [leaderboardType, setLeaderboardType] = useState("points");

  // Fetch current user's stats
  const { data: currentUserStats } = useQuery({
    queryKey: ["/api/leaderboard-stats", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/leaderboard-stats?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch global leaderboard
  const { data: leaderboardData = [] } = useQuery({
    queryKey: ["/api/leaderboard", leaderboardType],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard?type=${leaderboardType}&limit=20`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  const getLeaderboardLabel = (type: string) => {
    const labels: Record<string, string> = {
      points: "Gamification Points",
      hours: "Volunteer Hours",
      impacts: "Impact Metrics Logged",
      badges: "Badges Earned",
      streak: "Current Streak",
    };
    return labels[type] || "Rankings";
  };

  const currentUserRank = leaderboardData.findIndex(
    (v: any) => v.userId === parseInt(userId || "0")
  ) + 1 || null;

  // PWA wrapper for mobile volunteer users
  const content = (
    <div className={isVolunteerMobile ? 'pt-20 pb-24 px-4' : ''} style={!isVolunteerMobile ? { maxWidth: '1280px', margin: '0 auto', padding: '24px' } : undefined}>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className={`${isVolunteerMobile ? 'h-6 w-6' : 'h-8 w-8'} text-yellow-600`} />
          <h1 className={`${isVolunteerMobile ? 'text-xl' : 'text-3xl'} font-bold`}>Global Leaderboard</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Compete with volunteers worldwide and track your progress
        </p>
      </div>

      {/* Your Stats Card */}
      {currentUserStats && (
        <Card className="mb-8 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 dark:from-purple-950 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Your Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Points</div>
                <div className="text-2xl font-bold text-purple-600">{currentUserStats?.totalPoints || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Hours</div>
                <div className="text-2xl font-bold text-blue-600">{currentUserStats?.totalHours || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Impacts</div>
                <div className="text-2xl font-bold text-green-600">{currentUserStats?.impactsLogged || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Badges</div>
                <div className="text-2xl font-bold text-yellow-600">{currentUserStats?.badgesEarned || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Your Rank</div>
                <div className="text-2xl font-bold text-orange-600">
                  {currentUserRank ? `#${currentUserRank}` : "Unranked"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Type Selector */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Metric</CardTitle>
          <CardDescription>
            Choose which metric to rank by
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["points", "hours", "impacts", "badges", "streak"].map((type) => (
              <button
                key={type}
                onClick={() => setLeaderboardType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  leaderboardType === type
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                data-testid={`leaderboard-tab-${type}`}
              >
                {getLeaderboardLabel(type)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rankings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Volunteers - {getLeaderboardLabel(leaderboardType)}
          </CardTitle>
          <CardDescription>
            Recognized contributors in the Synerxus community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboardData.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No data available yet
              </p>
            ) : (
              leaderboardData.map((volunteer: any, index: number) => {
                const medal = getMedalIcon(index + 1);
                const isCurrentUser = volunteer.userId === parseInt(userId || "0");
                return (
                  <div
                    key={volunteer.userId}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                      isCurrentUser
                        ? "bg-purple-50 dark:bg-purple-950 border-purple-300 dark:border-purple-700 ring-2 ring-purple-400"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                    data-testid={`leaderboard-entry-${index}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 text-center">
                        {medal ? (
                          <span className="text-3xl">{medal}</span>
                        ) : (
                          <span className="text-xl font-bold text-gray-400">
                            #{index + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold flex items-center gap-2">
                          {volunteer.displayName || "Volunteer"}
                          {isCurrentUser && <span className="text-purple-600 font-bold">(You)</span>}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex gap-3 mt-1 flex-wrap">
                          <span>🏆 {volunteer.badgesEarned} badges</span>
                          <span>·</span>
                          <span>🔥 {volunteer.weeklyStreak} streak</span>
                          <span>·</span>
                          <span>✓ {volunteer.tasksCompleted} tasks</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {leaderboardType === "points" && volunteer.totalPoints}
                        {leaderboardType === "hours" && `${volunteer.totalHours}h`}
                        {leaderboardType === "impacts" && volunteer.impactsLogged}
                        {leaderboardType === "badges" && volunteer.badgesEarned}
                        {leaderboardType === "streak" && volunteer.weeklyStreak}
                      </div>
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

  // Return with PWA framing for mobile volunteer users
  if (isVolunteerMobile) {
    return (
      <div className="min-h-screen bg-[#faf9f7]">
        <PWAHeader />
        {content}
        <VolunteerPWANav userId={userId || undefined} activeTab="home" />
      </div>
    );
  }

  // Return with VolunteerNav for desktop volunteers
  if (userType === 'volunteer') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
        <VolunteerNav />
        {content}
        {/* Footer - Hidden on mobile */}
        {!isMobile && <Footer />}
      </div>
    );
  }

  return content;
}
