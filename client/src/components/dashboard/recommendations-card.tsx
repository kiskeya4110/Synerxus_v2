import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Target, Clock, Users, MapPin } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface Recommendation {
  opportunity: {
    id: number;
    title: string;
    description: string;
    organizationId: number;
    location: string;
    engagementType: string;
    ongoingHoursPerWeek: number;
    sdgGoals: number[];
    matchScore: number;
    matchReasons: string[];
  };
  engagementReason: string;
}

export function RecommendationsCard({ userId }: { userId: number }) {
  const { data: recommendations, isLoading } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations/opportunities", userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/recommendations/opportunities?userId=${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            Personalized for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Personalized for You
          </CardTitle>
          <CardDescription>
            Complete your profile and engage with opportunities to get personalized recommendations
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-600" />
          Personalized for You
        </CardTitle>
        <CardDescription>
          Based on your past engagement and skills
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.slice(0, 3).map((rec) => (
          <div
            key={rec.opportunity.id}
            className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-amber-100 dark:border-amber-800 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">
                  {rec.opportunity.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {rec.engagementReason}
                </p>
              </div>
              <Badge className="bg-amber-600 text-white flex-shrink-0">
                {Math.round(rec.opportunity.matchScore)}%
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 text-xs mb-2">
              {rec.opportunity.engagementType && (
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Users className="h-3 w-3" />
                  {rec.opportunity.engagementType}
                </div>
              )}
              {rec.opportunity.ongoingHoursPerWeek && (
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Clock className="h-3 w-3" />
                  {rec.opportunity.ongoingHoursPerWeek}h/week
                </div>
              )}
              {rec.opportunity.location && (
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 line-clamp-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {rec.opportunity.location}
                </div>
              )}
            </div>

            <Link href={`/opportunities/${rec.opportunity.id}`}>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-7 border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                View Opportunity
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        ))}

        {recommendations.length > 3 && (
          <Link href="/discover-opportunities">
            <Button variant="ghost" size="sm" className="w-full text-xs text-amber-700 dark:text-amber-400">
              View all recommendations →
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
