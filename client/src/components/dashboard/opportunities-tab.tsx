import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Users, Target, ExternalLink, Bookmark, BookmarkCheck, X, FileText, Building2, Clock, AlertCircle, Sparkles, CalendarDays } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ApplicationDialog from "@/components/opportunities/application-dialog";
import { sdgGoals } from "@shared/sdg-goals";
import type { Opportunity } from "@shared/schema";

interface OpportunityMatch extends Opportunity {
  organizationName?: string;
  matchPercentage: number;
  matchReasons: string[];
  matchBreakdown?: {
    skillMatch: number;
    locationMatch: number;
    sdgMatch: number;
    interestMatch: number;
  };
}

interface OpportunityStatus {
  savedIds: number[];
  rejectedIds: number[];
  appliedIds: number[];
}

interface OpportunitiesTabProps {
  userId: string | null;
}

export default function OpportunitiesTab({ userId }: OpportunitiesTabProps) {
  const { toast } = useToast();
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityMatch | null>(null);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);

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

  const { data: opportunityStatus } = useQuery<OpportunityStatus>({
    queryKey: ["/api/opportunities/status", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");
      const response = await fetch(`/api/opportunities/status?volunteerId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch opportunity status");
      return response.json();
    },
    enabled: !!userId,
  });

  const saveOpportunityMutation = useMutation({
    mutationFn: async (opportunityId: number) => {
      return await apiRequest("POST", "/api/saved-opportunities", {
        volunteerId: Number(userId),
        opportunityId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities/status", userId] });
      toast({
        title: "Opportunity saved!",
        description: "You can find it in your saved opportunities.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save",
        description: "Could not save this opportunity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const unsaveOpportunityMutation = useMutation({
    mutationFn: async (opportunityId: number) => {
      return await apiRequest("DELETE", `/api/saved-opportunities?volunteerId=${userId}&opportunityId=${opportunityId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities/status", userId] });
      toast({
        title: "Opportunity unsaved",
        description: "Removed from your saved opportunities.",
      });
    },
  });

  const rejectOpportunityMutation = useMutation({
    mutationFn: async (opportunityId: number) => {
      return await apiRequest("POST", "/api/rejected-opportunities", {
        volunteerId: Number(userId),
        opportunityId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities/status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities/matches", userId] });
      toast({
        title: "Opportunity hidden",
        description: "This opportunity won't be shown in your matches anymore.",
      });
    },
  });

  const handleSaveToggle = (opportunityId: number) => {
    const isSaved = opportunityStatus?.savedIds.includes(opportunityId);
    if (isSaved) {
      unsaveOpportunityMutation.mutate(opportunityId);
    } else {
      saveOpportunityMutation.mutate(opportunityId);
    }
  };

  const handleReject = (opportunityId: number) => {
    rejectOpportunityMutation.mutate(opportunityId);
  };

  const handleApplyClick = (opportunity: OpportunityMatch) => {
    setSelectedOpportunity(opportunity);
    setShowApplicationDialog(true);
  };

  const getOpportunityStatusBadge = (opportunityId: number) => {
    if (opportunityStatus?.appliedIds.includes(opportunityId)) {
      return <Badge variant="default" className="bg-green-600 text-white">Applied</Badge>;
    }
    if (opportunityStatus?.savedIds.includes(opportunityId)) {
      return <Badge variant="secondary">Saved</Badge>;
    }
    return null;
  };

  const filteredOpportunities = opportunities.filter(
    opp => !opportunityStatus?.rejectedIds.includes(opp.id) && !opportunityStatus?.appliedIds.includes(opp.id)
  );

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

  if (filteredOpportunities.length === 0) {
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

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
    if (percentage >= 60) return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20";
    if (percentage >= 40) return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
    return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20";
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {filteredOpportunities.length} Matching Opportunities
          </h3>
          <Link href="/opportunities">
            <Button variant="outline" size="sm" className="text-xs h-7">
              View All <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>

        {filteredOpportunities.map((opp) => {
          const isSaved = opportunityStatus?.savedIds.includes(opp.id);
          const isApplied = opportunityStatus?.appliedIds.includes(opp.id);

          return (
            <Card key={opp.id} className="hover:shadow-md transition-shadow" data-testid={`opportunity-card-${opp.id}`}>
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <CardTitle className="text-sm leading-tight">{opp.title}</CardTitle>
                      {opp.isUrgent && (
                        <Badge className="bg-red-500 text-white text-xs px-2 py-0">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                      {getOpportunityStatusBadge(opp.id)}
                    </div>
                    {opp.organizationName && (
                      <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mb-2">
                        <Building2 className="h-3 w-3 mr-1" />
                        <span className="font-medium">{opp.organizationName}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={`${getMatchColor(opp.matchPercentage)} text-xs px-2 py-0`} data-testid={`match-badge-${opp.id}`}>
                        <Sparkles className="h-3 w-3 mr-1" />
                        {opp.matchPercentage}% Match
                      </Badge>
                      {opp.category && (
                        <Badge variant="outline" className="text-xs px-2 py-0">{opp.category}</Badge>
                      )}
                      {opp.engagementType && (
                        <Badge variant="secondary" className="text-xs px-2 py-0 capitalize">{opp.engagementType}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant={isSaved ? "default" : "outline"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleSaveToggle(opp.id)}
                      disabled={isApplied}
                      data-testid={`save-opportunity-${opp.id}`}
                    >
                      {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleReject(opp.id)}
                      disabled={isApplied}
                      data-testid={`reject-opportunity-${opp.id}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                {/* Description */}
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {opp.description}
                </p>

                {/* Basic Info */}
                <div className="space-y-1.5">
                  <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                    <MapPin className="h-3 w-3 mr-1.5 flex-shrink-0" />
                    <span className="truncate">{opp.location || "Location not specified"}</span>
                  </div>
                  {opp.timeCommitment && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Clock className="h-3 w-3 mr-1.5 flex-shrink-0" />
                      <span>{opp.timeCommitment}</span>
                      {opp.commitmentType && <span className="ml-1">({opp.commitmentType})</span>}
                    </div>
                  )}
                  {opp.volunteersNeeded && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Users className="h-3 w-3 mr-1.5 flex-shrink-0" />
                      <span>{opp.volunteersNeeded} volunteer{opp.volunteersNeeded > 1 ? 's' : ''} needed</span>
                    </div>
                  )}
                  {(opp.startDate || opp.endDate) && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <CalendarDays className="h-3 w-3 mr-1.5 flex-shrink-0" />
                      <span>
                        {opp.startDate && new Date(opp.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {opp.startDate && opp.endDate && ' - '}
                        {opp.endDate && new Date(opp.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* SDG Goals */}
                {opp.sdgGoals && opp.sdgGoals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">SDG Goals:</p>
                    <div className="flex flex-wrap gap-1">
                      {opp.sdgGoals.slice(0, 5).map((sdgId) => {
                        const sdg = sdgGoals[sdgId];
                        return sdg ? (
                          <Badge 
                            key={sdgId} 
                            style={{ backgroundColor: sdg.color, color: '#fff' }}
                            className="text-xs px-2 py-0"
                          >
                            SDG {sdgId}
                          </Badge>
                        ) : null;
                      })}
                      {opp.sdgGoals.length > 5 && (
                        <Badge variant="outline" className="text-xs px-2 py-0">
                          +{opp.sdgGoals.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Required Skills */}
                {opp.requiredSkills && opp.requiredSkills.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Required Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {opp.requiredSkills.slice(0, 4).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs px-2 py-0 truncate">
                          {skill}
                        </Badge>
                      ))}
                      {opp.requiredSkills.length > 4 && (
                        <Badge variant="outline" className="text-xs px-2 py-0">
                          +{opp.requiredSkills.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Requirements/Responsibilities */}
                {opp.requirements && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Responsibilities:</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{opp.requirements}</p>
                  </div>
                )}

                {/* Benefits */}
                {opp.benefits && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">What You'll Gain:</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{opp.benefits}</p>
                  </div>
                )}

                {/* Match Reasons */}
                {opp.matchReasons && opp.matchReasons.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Why this matches you:</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                      {opp.matchReasons.slice(0, 3).map((reason, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="mr-1.5">•</span>
                          <span className="line-clamp-1">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link href={`/opportunities/${opp.id}`}>
                    <Button size="sm" variant="outline" className="w-full text-xs h-7" data-testid={`view-opportunity-${opp.id}`}>
                      <FileText className="mr-1 h-3 w-3" />
                      View Details
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    className="w-full text-xs h-7" 
                    onClick={() => handleApplyClick(opp)}
                    disabled={isApplied}
                    data-testid={`apply-opportunity-${opp.id}`}
                  >
                    {isApplied ? "Applied" : "Apply Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedOpportunity && (
        <ApplicationDialog
          opportunity={selectedOpportunity}
          open={showApplicationDialog}
          onOpenChange={setShowApplicationDialog}
        />
      )}
    </>
  );
}
