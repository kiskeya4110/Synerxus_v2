import { Award, Star, Target, Users, Zap, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: typeof Award;
  earned: boolean;
  earnedDate?: string;
  progress?: {
    current: number;
    target: number;
  };
}

interface ContributionBadgesProps {
  totalHours: number;
  projectCount: number;
  sdgCount: number;
  hasFirstMatch: boolean;
  firstMatchDate?: string;
}

export default function ContributionBadges({
  totalHours,
  projectCount,
  sdgCount,
  hasFirstMatch,
  firstMatchDate,
}: ContributionBadgesProps) {
  const badges: BadgeData[] = [
    {
      id: "first-match",
      name: "First Match",
      description: "Matched with your first opportunity",
      icon: Star,
      earned: hasFirstMatch,
      earnedDate: firstMatchDate,
    },
    {
      id: "10-hours",
      name: "10 Hour Hero",
      description: "Contributed 10 hours of volunteer service",
      icon: Zap,
      earned: totalHours >= 10,
      progress: totalHours < 10 ? { current: totalHours, target: 10 } : undefined,
    },
    {
      id: "multi-sdg",
      name: "Multi-SDG Impact",
      description: "Contributed to 3 or more SDG goals",
      icon: Target,
      earned: sdgCount >= 3,
      progress: sdgCount < 3 ? { current: sdgCount, target: 3 } : undefined,
    },
    {
      id: "50-hours",
      name: "50 Hour Champion",
      description: "Dedicated 50 hours to volunteer work",
      icon: Award,
      earned: totalHours >= 50,
      progress: totalHours < 50 ? { current: totalHours, target: 50 } : undefined,
    },
    {
      id: "active-contributor",
      name: "Active Contributor",
      description: "Participated in 5 or more projects",
      icon: Users,
      earned: projectCount >= 5,
      progress: projectCount < 5 ? { current: projectCount, target: 5 } : undefined,
    },
    {
      id: "100-hours",
      name: "100 Hour Legend",
      description: "Reached 100 hours of volunteer service",
      icon: Trophy,
      earned: totalHours >= 100,
      progress: totalHours < 100 ? { current: totalHours, target: 100 } : undefined,
    },
  ];

  const earnedBadges = badges.filter((b) => b.earned);
  const unearnedBadges = badges.filter((b) => !b.earned);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Award className="h-5 w-5" />
          Contribution Badges
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
              Earned ({earnedBadges.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {earnedBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <TooltipProvider key={badge.id}>
                    <Tooltip>
                      <TooltipTrigger>
                        <div
                          className="flex flex-col items-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow"
                          data-testid={`badge-earned-${badge.id}`}
                        >
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-2">
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <p className="text-xs font-semibold text-center line-clamp-2">
                            {badge.name}
                          </p>
                          {badge.earnedDate && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {new Date(badge.earnedDate).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">{badge.name}</p>
                        <p className="text-sm">{badge.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        )}

        {/* In Progress Badges */}
        {unearnedBadges.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
              In Progress ({unearnedBadges.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {unearnedBadges.map((badge) => {
                const Icon = badge.icon;
                const progress = badge.progress
                  ? Math.round((badge.progress.current / badge.progress.target) * 100)
                  : 0;

                return (
                  <TooltipProvider key={badge.id}>
                    <Tooltip>
                      <TooltipTrigger>
                        <div
                          className="flex flex-col items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-80 transition-opacity"
                          data-testid={`badge-locked-${badge.id}`}
                        >
                          <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center mb-2 relative">
                            <Icon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                            {badge.progress && (
                              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                  {progress}%
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-center line-clamp-2 text-gray-600 dark:text-gray-400">
                            {badge.name}
                          </p>
                          {badge.progress && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {badge.progress.current}/{badge.progress.target}
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">{badge.name}</p>
                        <p className="text-sm">{badge.description}</p>
                        {badge.progress && (
                          <p className="text-xs mt-1">
                            Progress: {badge.progress.current} / {badge.progress.target}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
