import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Users, Target, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface OpportunityMatch {
  id: number;
  title: string;
  description: string;
  location: string;
  isRemote: boolean;
  requiredSkills: string[];
  sdgGoals: number[];
  category: string;
  volunteersNeeded: number;
  commitmentType: string;
  startDate: string;
  endDate: string;
  matchPercentage: number;
  matchReasons: string[];
  status: string;
}

interface OpportunitiesTabProps {
  userId: string | null;
}

export default function OpportunitiesTab({ userId }: OpportunitiesTabProps) {
  const { data: opportunities = [], isLoading, error } = useQuery<OpportunityMatch[]>({
    queryKey: ["/api/opportunities/matches", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");
      const response = await fetch(`/api/opportunities/matches?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch matched opportunities");
      return response.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-500 dark:text-red-400 mb-2">Failed to load opportunities</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (opportunities.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">No matching opportunities found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Update your profile with skills and interests to see matched opportunities
            </p>
            <Link href="/settings">
              <Button className="mt-4" variant="outline">
                Update Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get match percentage color
  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
    if (percentage >= 60) return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20";
    if (percentage >= 40) return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
    return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          {opportunities.length} Matching Opportunities
        </h3>
        <Link href="/opportunities">
          <Button variant="outline" size="sm" className="text-xs h-7">
            View All <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </div>

      {opportunities.map((opp) => (
        <Card key={opp.id} className="hover:shadow-md transition-shadow" data-testid={`opportunity-card-${opp.id}`}>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-sm mb-2 leading-tight">{opp.title}</CardTitle>
                <div className="grid grid-cols-2 gap-1.5">
                  <Badge className={`${getMatchColor(opp.matchPercentage)} text-xs px-2 py-0 justify-center`} data-testid={`match-badge-${opp.id}`}>
                    {opp.matchPercentage}% Match
                  </Badge>
                  {opp.category && (
                    <Badge variant="outline" className="text-xs px-2 py-0 justify-center">{opp.category}</Badge>
                  )}
                  {opp.isRemote && (
                    <Badge variant="secondary" className="text-xs px-2 py-0 justify-center">Remote</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {opp.description}
            </p>

            <div className="space-y-1.5 mb-3">
              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <MapPin className="h-3 w-3 mr-1.5 flex-shrink-0" />
                <span className="truncate">{opp.location || "Location not specified"}</span>
              </div>
              {opp.volunteersNeeded && (
                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                  <Users className="h-3 w-3 mr-1.5 flex-shrink-0" />
                  <span>{opp.volunteersNeeded} volunteers needed</span>
                </div>
              )}
              {opp.commitmentType && (
                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                  <Calendar className="h-3 w-3 mr-1.5 flex-shrink-0" />
                  <span className="capitalize">{opp.commitmentType}</span>
                </div>
              )}
            </div>

            {opp.requiredSkills && opp.requiredSkills.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Required Skills:</p>
                <div className="grid grid-cols-2 gap-1">
                  {opp.requiredSkills.slice(0, 4).map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs px-2 py-0 justify-center truncate">
                      {skill}
                    </Badge>
                  ))}
                  {opp.requiredSkills.length > 4 && (
                    <Badge variant="outline" className="text-xs px-2 py-0 justify-center">
                      +{opp.requiredSkills.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {opp.matchReasons && opp.matchReasons.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Why this matches:</p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                  {opp.matchReasons.slice(0, 2).map((reason, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="mr-1.5">•</span>
                      <span className="line-clamp-1">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Link href={`/opportunities/${opp.id}`}>
                <Button size="sm" className="w-full text-xs h-7" data-testid={`view-opportunity-${opp.id}`}>
                  View
                </Button>
              </Link>
              <Link href={`/opportunities/${opp.id}`}>
                <Button size="sm" variant="outline" className="w-full text-xs h-7" data-testid={`apply-opportunity-${opp.id}`}>
                  Apply
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
