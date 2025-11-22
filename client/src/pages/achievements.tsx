import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Lock } from "lucide-react";

const BADGE_DEFINITIONS = [
  {
    id: 1,
    name: "First Step",
    description: "Completed your first volunteer activity",
    icon: "👣",
    tier: "bronze",
    condition: "Log 1 volunteer activity",
  },
  {
    id: 2,
    name: "Consistent Contributor",
    description: "Maintained a 4-week activity streak",
    icon: "🔥",
    tier: "silver",
    condition: "4 consecutive weeks of activity",
  },
  {
    id: 3,
    name: "Century Club",
    description: "Contributed 100+ volunteer hours",
    icon: "💯",
    tier: "gold",
    condition: "Log 100 hours of service",
  },
  {
    id: 4,
    name: "Impact Champion",
    description: "Recorded 50+ verified impact metrics",
    icon: "⭐",
    tier: "platinum",
    condition: "Log 50 impact metrics",
  },
  {
    id: 5,
    name: "Project Completer",
    description: "Completed 10 projects",
    icon: "🏆",
    tier: "gold",
    condition: "Finish 10 projects",
  },
];

export default function Achievements() {
  const { user } = useAuth();
  const userId = localStorage.getItem('currentUserId');

  // Fetch user's badges
  const { data: userBadges = [] } = useQuery({
    queryKey: ["/api/user-badges", userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/user-badges?userId=${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
  });

  const earnedBadgeIds = new Set(userBadges.map((b: any) => b.badgeId));

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
      silver: "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100",
      gold: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100",
      platinum: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
    };
    return colors[tier] || colors.bronze;
  };

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
            <div className="text-3xl font-bold text-purple-600">{userBadges.length}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              out of {BADGE_DEFINITIONS.length} possible
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
                style={{ width: `${(userBadges.length / BADGE_DEFINITIONS.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {Math.round((userBadges.length / BADGE_DEFINITIONS.length) * 100)}% complete
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Badges</CardTitle>
          <CardDescription>
            Work towards earning all badges and climbing the leaderboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {BADGE_DEFINITIONS.map((badge) => {
              const isEarned = earnedBadgeIds.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isEarned
                      ? `${getTierColor(badge.tier)} border-current`
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60"
                  }`}
                  data-testid={`badge-${badge.id}`}
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <h4 className="font-semibold text-sm mb-1">{badge.name}</h4>
                  <p className="text-xs mb-2 opacity-80">{badge.description}</p>
                  <div className="flex items-center gap-2">
                    {isEarned ? (
                      <Badge className="bg-green-600 text-white text-xs">Earned</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs flex items-center gap-1"
                      >
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {badge.condition}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
