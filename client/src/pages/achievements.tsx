import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Lock, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BadgeData {
  id: number;
  name: string;
  description: string;
  icon: string | null;
  tier: string | null;
  condition: string;
  thresholdType: string | null;
  thresholdValue: number | null;
}

interface UserBadgeWithProgress {
  badge: BadgeData;
  earned: boolean;
  earnedAt: string | null;
  progressPercentage: number;
}

export default function Achievements() {
  const { user } = useAuth();
  const userId = localStorage.getItem('currentUserId');

  // Fetch user's badges with progress from API
  const { data: badgesWithProgress = [], isLoading } = useQuery<UserBadgeWithProgress[]>({
    queryKey: ["/api/user-badges", userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/user-badges?userId=${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
  });

  const earnedBadges = badgesWithProgress.filter(b => b.earned);
  const totalBadges = badgesWithProgress.length;

  const getTierColor = (tier: string | null) => {
    const colors: Record<string, string> = {
      bronze: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
      silver: "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100",
      gold: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100",
      platinum: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
    };
    return colors[tier || "bronze"] || colors.bronze;
  };

  const getTierBorderColor = (tier: string | null) => {
    const colors: Record<string, string> = {
      bronze: "border-amber-400",
      silver: "border-gray-400",
      gold: "border-yellow-400",
      platinum: "border-blue-400",
    };
    return colors[tier || "bronze"] || colors.bronze;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Award className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Your Achievements</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Earn badges as you hit milestones and make a real impact
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Badges Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{earnedBadges.length}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              out of {totalBadges} possible
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                style={{ width: `${totalBadges > 0 ? (earnedBadges.length / totalBadges) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {totalBadges > 0 ? Math.round((earnedBadges.length / totalBadges) * 100) : 0}% complete
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earned Badges Section */}
      {earnedBadges.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <CardTitle>Earned Badges</CardTitle>
            </div>
            <CardDescription>
              Congratulations on your achievements!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {earnedBadges.map(({ badge, earnedAt }) => (
                <div
                  key={badge.id}
                  className={`p-4 rounded-lg border-2 transition-all ${getTierColor(badge.tier)} ${getTierBorderColor(badge.tier)}`}
                  data-testid={`badge-${badge.id}`}
                >
                  <div className="text-4xl mb-2">{badge.icon || "🏅"}</div>
                  <h4 className="font-semibold text-sm mb-1">{badge.name}</h4>
                  <p className="text-xs mb-2 opacity-80">{badge.description}</p>
                  <Badge className="bg-green-600 text-white text-xs">Earned</Badge>
                  {earnedAt && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Earned {new Date(earnedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle>All Badges</CardTitle>
          <CardDescription>
            Work towards earning all badges and climbing the leaderboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {badgesWithProgress.map(({ badge, earned, progressPercentage }) => (
              <div
                key={badge.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  earned
                    ? `${getTierColor(badge.tier)} ${getTierBorderColor(badge.tier)}`
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                }`}
                data-testid={`badge-${badge.id}`}
              >
                <div className={`text-4xl mb-2 ${!earned ? "grayscale opacity-50" : ""}`}>
                  {badge.icon || "🏅"}
                </div>
                <h4 className="font-semibold text-sm mb-1">{badge.name}</h4>
                <p className="text-xs mb-2 opacity-80">{badge.description}</p>

                {earned ? (
                  <Badge className="bg-green-600 text-white text-xs">Earned</Badge>
                ) : (
                  <div className="space-y-2">
                    <Badge
                      variant="outline"
                      className="text-xs flex items-center gap-1 w-fit"
                    >
                      <Lock className="h-3 w-3" />
                      In Progress
                    </Badge>
                    {progressPercentage > 0 && (
                      <div className="space-y-1">
                        <Progress value={progressPercentage} className="h-1.5" />
                        <p className="text-xs text-gray-500">{progressPercentage}% complete</p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {badge.condition}
                </p>
              </div>
            ))}
          </div>

          {badgesWithProgress.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No badges available yet. Start volunteering to earn badges!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
