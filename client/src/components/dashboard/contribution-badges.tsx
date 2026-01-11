import { Award, Lock, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";

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

interface ContributionBadgesProps {
  userId?: number | string | null;
}

export default function ContributionBadges({ userId }: ContributionBadgesProps) {
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
    staleTime: 30000, // Cache for 30 seconds
  });

  const earnedBadges = badgesWithProgress.filter(b => b.earned);
  const unearnedBadges = badgesWithProgress.filter(b => !b.earned);

  const getTierColor = (tier: string | null) => {
    const colors: Record<string, string> = {
      bronze: "from-amber-400 to-amber-600",
      silver: "from-gray-300 to-gray-500",
      gold: "from-yellow-400 to-yellow-600",
      platinum: "from-blue-400 to-blue-600",
    };
    return colors[tier || "bronze"] || colors.bronze;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Award className="h-5 w-5" />
            Contribution Badges
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (badgesWithProgress.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Award className="h-5 w-5" />
            Contribution Badges
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-6 text-gray-500">
            <Award className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start volunteering to earn badges!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Award className="h-5 w-5" />
          Contribution Badges
          <Badge variant="secondary" className="ml-auto">
            {earnedBadges.length}/{badgesWithProgress.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Earned ({earnedBadges.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {earnedBadges.map(({ badge, earnedAt }) => (
                <TooltipProvider key={badge.id}>
                  <Tooltip>
                    <TooltipTrigger>
                      <div
                        className="flex flex-col items-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow"
                        data-testid={`badge-earned-${badge.id}`}
                      >
                        <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${getTierColor(badge.tier)} flex items-center justify-center mb-2`}>
                          <span className="text-2xl">{badge.icon || "🏅"}</span>
                        </div>
                        <p className="text-xs font-semibold text-center line-clamp-2">
                          {badge.name}
                        </p>
                        {earnedAt && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {new Date(earnedAt).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{badge.name}</p>
                      <p className="text-sm">{badge.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{badge.condition}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}

        {/* In Progress Badges */}
        {unearnedBadges.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              In Progress ({unearnedBadges.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {unearnedBadges.map(({ badge, progressPercentage }) => (
                <TooltipProvider key={badge.id}>
                  <Tooltip>
                    <TooltipTrigger>
                      <div
                        className="flex flex-col items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                        data-testid={`badge-locked-${badge.id}`}
                      >
                        <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2 relative">
                          <span className="text-2xl grayscale opacity-50">{badge.icon || "🏅"}</span>
                          {progressPercentage > 0 && (
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400">
                                {progressPercentage}%
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-center line-clamp-2 text-gray-600 dark:text-gray-400">
                          {badge.name}
                        </p>
                        {progressPercentage > 0 && (
                          <div className="w-full mt-2">
                            <Progress value={progressPercentage} className="h-1" />
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{badge.name}</p>
                      <p className="text-sm">{badge.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{badge.condition}</p>
                      {progressPercentage > 0 && (
                        <p className="text-xs mt-1 font-medium">Progress: {progressPercentage}%</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
