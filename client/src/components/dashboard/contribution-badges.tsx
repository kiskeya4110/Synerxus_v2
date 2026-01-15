import { useState } from "react";
import { Award, Lock, Trophy, Calendar, Target, TrendingUp, Star, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const [selectedBadge, setSelectedBadge] = useState<UserBadgeWithProgress | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const getTierLabel = (tier: string | null) => {
    const labels: Record<string, { label: string; color: string }> = {
      bronze: { label: "Bronze", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
      silver: { label: "Silver", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
      gold: { label: "Gold", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
      platinum: { label: "Platinum", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    };
    return labels[tier || "bronze"] || labels.bronze;
  };

  const getThresholdTypeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      hours: "Volunteer Hours",
      tasks: "Tasks Completed",
      impacts: "People Impacted",
      projects: "Projects Joined",
      streak: "Weekly Streak",
    };
    return labels[type || "hours"] || type || "Activity";
  };

  const handleBadgeClick = (badgeWithProgress: UserBadgeWithProgress) => {
    setSelectedBadge(badgeWithProgress);
    setIsDialogOpen(true);
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
    <>
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
                {earnedBadges.map((badgeWithProgress) => (
                  <TooltipProvider key={badgeWithProgress.badge.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => handleBadgeClick(badgeWithProgress)}
                          className="flex flex-col items-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-all cursor-pointer hover:scale-105"
                          data-testid={`badge-earned-${badgeWithProgress.badge.id}`}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && handleBadgeClick(badgeWithProgress)}
                        >
                          <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${getTierColor(badgeWithProgress.badge.tier)} flex items-center justify-center mb-2 shadow-lg`}>
                            <span className="text-2xl">{badgeWithProgress.badge.icon || "🏅"}</span>
                          </div>
                          <p className="text-xs font-semibold text-center line-clamp-2">
                            {badgeWithProgress.badge.name}
                          </p>
                          {badgeWithProgress.earnedAt && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {new Date(badgeWithProgress.earnedAt).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">Click for details</p>
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
                {unearnedBadges.map((badgeWithProgress) => (
                  <TooltipProvider key={badgeWithProgress.badge.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => handleBadgeClick(badgeWithProgress)}
                          className="flex flex-col items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-all cursor-pointer hover:scale-105"
                          data-testid={`badge-locked-${badgeWithProgress.badge.id}`}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && handleBadgeClick(badgeWithProgress)}
                        >
                          <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2 relative">
                            <span className="text-2xl grayscale opacity-50">{badgeWithProgress.badge.icon || "🏅"}</span>
                            {badgeWithProgress.progressPercentage > 0 && (
                              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400">
                                  {badgeWithProgress.progressPercentage}%
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-center line-clamp-2 text-gray-600 dark:text-gray-400">
                            {badgeWithProgress.badge.name}
                          </p>
                          {badgeWithProgress.progressPercentage > 0 && (
                            <div className="w-full mt-2">
                              <Progress value={badgeWithProgress.progressPercentage} className="h-1" />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">Click for details</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Badge Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedBadge && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className={`h-16 w-16 rounded-full ${selectedBadge.earned ? `bg-gradient-to-br ${getTierColor(selectedBadge.badge.tier)} shadow-lg` : 'bg-gray-200 dark:bg-gray-700'} flex items-center justify-center`}>
                    <span className={`text-3xl ${!selectedBadge.earned ? 'grayscale opacity-50' : ''}`}>
                      {selectedBadge.badge.icon || "🏅"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl flex items-center gap-2">
                      {selectedBadge.badge.name}
                      {selectedBadge.earned && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getTierLabel(selectedBadge.badge.tier).color}>
                        <Star className="h-3 w-3 mr-1" />
                        {getTierLabel(selectedBadge.badge.tier).label}
                      </Badge>
                      {selectedBadge.earned ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Earned
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Description */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Description</h4>
                  <DialogDescription className="text-base text-foreground">
                    {selectedBadge.badge.description}
                  </DialogDescription>
                </div>

                {/* How to Earn */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    How to Earn
                  </h4>
                  <p className="text-sm">{selectedBadge.badge.condition}</p>
                  {selectedBadge.badge.thresholdType && selectedBadge.badge.thresholdValue && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Requirement:</span> {selectedBadge.badge.thresholdValue} {getThresholdTypeLabel(selectedBadge.badge.thresholdType)}
                    </div>
                  )}
                </div>

                {/* Progress or Earned Date */}
                {selectedBadge.earned ? (
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-green-800 dark:text-green-300">Earned on</p>
                      <p className="text-lg font-bold text-green-600">
                        {selectedBadge.earnedAt ? new Date(selectedBadge.earnedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Unknown date'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Your Progress
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        {selectedBadge.progressPercentage}%
                      </span>
                    </div>
                    <Progress value={selectedBadge.progressPercentage} className="h-2" />
                    {selectedBadge.progressPercentage > 0 && selectedBadge.progressPercentage < 100 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        Keep going! You're {100 - selectedBadge.progressPercentage}% away from earning this badge.
                      </p>
                    )}
                    {selectedBadge.progressPercentage === 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        Start contributing to make progress on this badge!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
