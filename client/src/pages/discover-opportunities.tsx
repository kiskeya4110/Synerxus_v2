import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, Users, Calendar, Search, TrendingUp, Sparkles, Building2, CalendarDays, AlertCircle } from "lucide-react";
import { Opportunity } from "@shared/schema";
import ApplicationDialog from "@/components/opportunities/application-dialog";
import { sdgGoals } from "@shared/sdg-goals";

interface EnrichedOpportunity extends Opportunity {
  organizationName?: string;
  matchScore?: number;
  matchPercentage?: number;
  matchReasons?: string[];
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

export default function DiscoverOpportunities() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [selectedOpportunity, setSelectedOpportunity] = useState<EnrichedOpportunity | null>(null);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);

  // Get current user ID from localStorage
  const userId = localStorage.getItem('currentUserId');

  // Fetch opportunities with AI matches and organization data
  const { data: opportunities = [], isLoading } = useQuery<EnrichedOpportunity[]>({
    queryKey: userId ? [`/api/opportunities/discover?userId=${userId}`] : [],
    enabled: !!userId, // Only fetch if we have a userId
  });

  // Fetch opportunity status (saved, rejected, applied)
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

  // Extract unique categories and locations from actual opportunities data
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    opportunities.forEach(opp => {
      if (opp.category) {
        categories.add(opp.category);
      }
    });
    return Array.from(categories).sort();
  }, [opportunities]);

  const availableLocations = useMemo(() => {
    const locations = new Set<string>();
    opportunities.forEach(opp => {
      if (opp.location) {
        locations.add(opp.location);
      }
    });
    return Array.from(locations).sort();
  }, [opportunities]);

  // Filter opportunities based on search, filters, and status
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch = searchQuery
      ? opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    const matchesCategory = categoryFilter === "all" || opp.category === categoryFilter;
    const matchesLocation = locationFilter === "all" || 
      (locationFilter === "remote" ? opp.isRemote : opp.location?.includes(locationFilter));
    
    // Filter out rejected opportunities
    const isNotRejected = !opportunityStatus?.rejectedIds.includes(opp.id);

    return matchesSearch && matchesCategory && matchesLocation && isNotRejected;
  });

  const getMatchBadge = (score?: number) => {
    if (!score) return null;
    
    if (score >= 80) {
      return <Badge className="bg-green-500 text-white"><Sparkles className="w-3 h-3 mr-1" />Excellent Match</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-blue-500 text-white"><TrendingUp className="w-3 h-3 mr-1" />Good Match</Badge>;
    } else if (score >= 40) {
      return <Badge variant="outline">Fair Match</Badge>;
    }
    return null;
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

  const hasApplied = (opportunityId: number) => {
    return opportunityStatus?.appliedIds.includes(opportunityId) || false;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Discover Opportunities</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Discover Opportunities</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Find volunteer opportunities matched to your skills and interests
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-opportunities"
            />
          </div>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {availableCategories.length > 0 ? (
              availableCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>No categories available</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger data-testid="select-location-filter">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {opportunities.some(opp => opp.isRemote) && (
              <SelectItem value="remote">Remote Only</SelectItem>
            )}
            {availableLocations.length > 0 ? (
              availableLocations.map(location => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>No locations available</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* AI Recommendations Section */}
      {opportunities.some(opp => (opp.matchScore ?? 0) >= 70) && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-primary-500" />
            Recommended for You
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities
              .filter(opp => (opp.matchScore ?? 0) >= 70)
              .slice(0, 3)
              .map((opportunity) => (
                <Card
                  key={opportunity.id}
                  className="hover:shadow-lg transition-shadow border-2 border-primary-200 dark:border-primary-800"
                  data-testid={`card-recommended-${opportunity.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {getMatchBadge(opportunity.matchScore)}
                        {getOpportunityStatusBadge(opportunity.id)}
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {opportunity.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          Why this matches:
                        </p>
                        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                          {opportunity.matchReasons.slice(0, 2).map((reason, idx) => (
                            <li key={idx}>• {reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="space-y-2 text-sm mb-4">
                      {opportunity.location && (
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <MapPin className="w-4 h-4 mr-2" />
                          {opportunity.location}
                          {opportunity.isRemote && (
                            <Badge variant="outline" className="ml-2">Remote</Badge>
                          )}
                        </div>
                      )}
                      {opportunity.timeCommitment && (
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4 mr-2" />
                          {opportunity.timeCommitment}
                        </div>
                      )}
                    </div>
                    <Button 
                      className="w-full" 
                      data-testid={`button-apply-${opportunity.id}`}
                      onClick={() => {
                        if (!hasApplied(opportunity.id)) {
                          setSelectedOpportunity(opportunity);
                          setApplicationDialogOpen(true);
                        }
                      }}
                      disabled={hasApplied(opportunity.id)}
                      variant={hasApplied(opportunity.id) ? "secondary" : "default"}
                    >
                      {hasApplied(opportunity.id) ? "Already Applied" : "Apply Now"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* All Opportunities */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          All Opportunities ({filteredOpportunities.length})
        </h2>
        {filteredOpportunities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No opportunities found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your filters or search query
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOpportunities.map((opportunity) => (
              <Card
                key={opportunity.id}
                className="hover:shadow-lg transition-shadow"
                data-testid={`card-opportunity-${opportunity.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                        {opportunity.isUrgent && (
                          <Badge className="bg-red-500 text-white text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
                      </div>
                      {opportunity.organizationName && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <Building2 className="w-3.5 h-3.5 mr-1.5" />
                          <span className="font-medium">{opportunity.organizationName}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {getMatchBadge(opportunity.matchScore)}
                      {getOpportunityStatusBadge(opportunity.id)}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {opportunity.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Basic Info */}
                  <div className="space-y-1.5 text-sm">
                    {opportunity.location && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{opportunity.location}</span>
                        {opportunity.isRemote && (
                          <Badge variant="outline" className="ml-2 text-xs">Remote</Badge>
                        )}
                      </div>
                    )}
                    {opportunity.timeCommitment && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{opportunity.timeCommitment}</span>
                        {opportunity.commitmentType && <span className="ml-1">({opportunity.commitmentType})</span>}
                      </div>
                    )}
                    {opportunity.volunteersNeeded && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{opportunity.volunteersNeeded} volunteer{opportunity.volunteersNeeded > 1 ? 's' : ''} needed</span>
                      </div>
                    )}
                    {(opportunity.startDate || opportunity.endDate) && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <CalendarDays className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="text-xs">
                          {opportunity.startDate && new Date(opportunity.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {opportunity.startDate && opportunity.endDate && ' - '}
                          {opportunity.endDate && new Date(opportunity.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Category and Engagement Type */}
                  <div className="flex flex-wrap gap-1.5">
                    {opportunity.category && (
                      <Badge variant="secondary" className="text-xs">{opportunity.category}</Badge>
                    )}
                    {opportunity.engagementType && (
                      <Badge variant="outline" className="text-xs capitalize">{opportunity.engagementType}</Badge>
                    )}
                  </div>

                  {/* SDG Goals */}
                  {opportunity.sdgGoals && opportunity.sdgGoals.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">SDG Goals:</p>
                      <div className="flex flex-wrap gap-1">
                        {opportunity.sdgGoals.slice(0, 4).map((sdgId) => {
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
                        {opportunity.sdgGoals.length > 4 && (
                          <Badge variant="outline" className="text-xs px-2 py-0">
                            +{opportunity.sdgGoals.length - 4}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Required Skills */}
                  {opportunity.requiredSkills && opportunity.requiredSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Required Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {opportunity.requiredSkills.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs px-2 py-0">
                            {skill}
                          </Badge>
                        ))}
                        {opportunity.requiredSkills.length > 3 && (
                          <Badge variant="outline" className="text-xs px-2 py-0">
                            +{opportunity.requiredSkills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Requirements */}
                  {opportunity.requirements && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Responsibilities:</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{opportunity.requirements}</p>
                    </div>
                  )}

                  {/* Benefits */}
                  {opportunity.benefits && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">What You'll Gain:</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{opportunity.benefits}</p>
                    </div>
                  )}

                  {/* Match Reasons */}
                  {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Why this matches you:</p>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                        {opportunity.matchReasons.slice(0, 2).map((reason, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="mr-1.5">•</span>
                            <span className="line-clamp-1">{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2">
                    <Button 
                      className="w-full" 
                      data-testid={`button-view-${opportunity.id}`}
                      onClick={() => {
                        if (!hasApplied(opportunity.id)) {
                          setSelectedOpportunity(opportunity);
                          setApplicationDialogOpen(true);
                        }
                      }}
                      disabled={hasApplied(opportunity.id)}
                      variant={hasApplied(opportunity.id) ? "secondary" : "default"}
                    >
                      {hasApplied(opportunity.id) ? "Already Applied" : "Apply Now"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Application Dialog */}
      {selectedOpportunity && (
        <ApplicationDialog
          opportunity={selectedOpportunity}
          open={applicationDialogOpen}
          onOpenChange={setApplicationDialogOpen}
        />
      )}
    </div>
  );
}
