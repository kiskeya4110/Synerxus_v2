import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  MapPin, Clock, Users, Calendar, Search, TrendingUp, Sparkles, Building2, CalendarDays, 
  AlertCircle, Target, Lightbulb, ChevronDown, CheckCircle
} from "lucide-react";
import { Opportunity } from "@shared/schema";
import ApplicationDialog from "@/components/opportunities/application-dialog";
import { sdgGoals } from "@shared/sdg-goals";
import { Link } from "wouter";

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
    availabilityMatch: number;
    experienceMatch: number;
    engagementBoost: number;
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
    queryKey: [`/api/opportunities/discover`, userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const response = await fetch(`/api/opportunities/discover?userId=${userId}&threshold=0`);
        if (!response.ok) {
          console.warn("Failed to fetch opportunities, showing empty list");
          return [];
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching opportunities:", error);
        return [];
      }
    },
    enabled: !!userId,
  });

  // Fetch opportunity status (saved, rejected, applied)
  const { data: opportunityStatus = { savedIds: [], rejectedIds: [], appliedIds: [] } } = useQuery<OpportunityStatus>({
    queryKey: ["/api/opportunities/status", userId],
    queryFn: async () => {
      if (!userId) return { savedIds: [], rejectedIds: [], appliedIds: [] };
      try {
        const response = await fetch(`/api/opportunities/status?volunteerId=${userId}`);
        if (!response.ok) {
          console.warn("Failed to fetch opportunity status, continuing without status badges");
          return { savedIds: [], rejectedIds: [], appliedIds: [] };
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching opportunity status:", error);
        return { savedIds: [], rejectedIds: [], appliedIds: [] };
      }
    },
    enabled: !!userId,
    retry: 1,
  });

  // Extract unique categories and locations from actual opportunities data
  const availableCategories = useMemo(() => {
    if (!Array.isArray(opportunities)) return [];
    const categories = new Set<string>();
    opportunities.forEach(opp => {
      if (opp?.category) {
        categories.add(opp.category);
      }
    });
    return Array.from(categories).sort();
  }, [opportunities]);

  const availableLocations = useMemo(() => {
    if (!Array.isArray(opportunities)) return [];
    const locations = new Set<string>();
    opportunities.forEach(opp => {
      if (opp?.location) {
        locations.add(opp.location);
      }
    });
    return Array.from(locations).sort();
  }, [opportunities]);

  // Filter opportunities based on search, filters, and status
  const filteredOpportunities = (opportunities || []).filter((opp) => {
    // Guard against malformed opportunity objects
    if (!opp || typeof opp.id !== 'number') return false;

    const matchesSearch = searchQuery
      ? (opp.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opp.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesCategory = categoryFilter === "all" || opp.category === categoryFilter;
    const matchesLocation = locationFilter === "all" ||
      (locationFilter === "remote" ? opp.isRemote : (opp.location || '').includes(locationFilter));

    // Filter out rejected opportunities - use optional chaining with nullish coalescing
    const isNotRejected = !(opportunityStatus?.rejectedIds?.includes(opp.id) ?? false);

    return matchesSearch && matchesCategory && matchesLocation && isNotRejected;
  });

  const getMatchBadge = (score?: number) => {
    if (!score && score !== 0) return null;
    
    if (score >= 80) {
      return <Badge className="bg-green-500 text-white"><Sparkles className="w-3 h-3 mr-1" />Excellent Match</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-blue-500 text-white"><TrendingUp className="w-3 h-3 mr-1" />Good Match</Badge>;
    } else if (score >= 40) {
      return <Badge variant="outline">Fair Match</Badge>;
    }
    return <Badge variant="outline" className="text-gray-500">Low Match</Badge>;
  };

  // Get match score color based on percentage
  const getMatchScoreColor = (score?: number) => {
    if (!score && score !== 0) return "text-gray-400";
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-500 dark:text-gray-400";
  };

  // Get progress bar color
  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-gray-400";
  };

  const getOpportunityStatusBadge = (opportunityId: number) => {
    if (opportunityStatus?.appliedIds?.includes(opportunityId)) {
      return <Badge variant="default" className="bg-green-600 text-white">Applied</Badge>;
    }
    if (opportunityStatus?.savedIds?.includes(opportunityId)) {
      return <Badge variant="secondary">Saved</Badge>;
    }
    return null;
  };

  const hasApplied = (opportunityId: number) => {
    return opportunityStatus?.appliedIds?.includes(opportunityId) ?? false;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Discover Opportunities</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOpportunities.map((opportunity) => (
              <Card
                key={opportunity.id}
                className="hover:shadow-lg transition-shadow overflow-hidden"
                data-testid={`card-opportunity-${opportunity.id}`}
              >
                {/* Prominent Match Score Header */}
                <div className={`px-4 py-3 ${
                  (opportunity.matchScore ?? 0) >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                  (opportunity.matchScore ?? 0) >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                  (opportunity.matchScore ?? 0) >= 40 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                  'bg-gradient-to-r from-gray-400 to-gray-500'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <span className="text-lg font-bold">{opportunity.matchScore ?? 0}%</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">AI Match Score</p>
                        <p className="text-xs opacity-90">
                          {(opportunity.matchScore ?? 0) >= 80 ? 'Excellent fit for you' :
                           (opportunity.matchScore ?? 0) >= 60 ? 'Great opportunity' :
                           (opportunity.matchScore ?? 0) >= 40 ? 'Worth exploring' :
                           'Review details'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {getOpportunityStatusBadge(opportunity.id)}
                      {opportunity.isUrgent && (
                        <Badge className="bg-red-600 text-white text-xs border-0">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Link href={`/opportunities/${opportunity.id}`}>
                        <CardTitle className="text-lg hover:text-primary cursor-pointer transition-colors">
                          {opportunity.title}
                        </CardTitle>
                      </Link>
                      {opportunity.organizationName && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <Building2 className="w-3.5 h-3.5 mr-1.5" />
                          <span className="font-medium">{opportunity.organizationName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2 mt-2">
                    {opportunity.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
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

                  {/* 2-Column Layout: AI Analysis & Details */}
                  <div className="grid md:grid-cols-2 gap-3">
                    {/* Column 1: AI Analysis, Requirements, Benefits */}
                    <div className="space-y-3">
                      {/* Match Reasons - Why this matches you */}
                      {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950 rounded-md">
                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            Why this matches you
                          </p>
                          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-0.5">
                            {opportunity.matchReasons.slice(0, 3).map((reason, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="mr-1.5">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
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
                    </div>

                    {/* Column 2: SDG Goals & Skills */}
                    <div className="space-y-3">
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
                            {opportunity.requiredSkills.slice(0, 4).map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs px-2 py-0 truncate">
                                {skill}
                              </Badge>
                            ))}
                            {opportunity.requiredSkills.length > 4 && (
                              <Badge variant="outline" className="text-xs px-2 py-0">
                                +{opportunity.requiredSkills.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Target Impact Metric */}
                      {opportunity.impactMetricName && (
                        <div className="p-2.5 bg-purple-50 dark:bg-purple-950 rounded-md">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300" />
                            <p className="text-xs font-semibold text-purple-900 dark:text-purple-100">
                              Target Impact
                            </p>
                          </div>
                          <p className="text-xs text-purple-800 dark:text-purple-200">
                            {opportunity.impactMetricName}
                            {opportunity.impactMetricUnit && ` (${opportunity.impactMetricUnit})`}
                          </p>
                        </div>
                      )}
                    </div>
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

                  {/* AI Match Analysis - Always Visible */}
                  {opportunity.matchBreakdown && (
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">AI Match Analysis</span>
                        {(opportunity.matchBreakdown.engagementBoost ?? 0) > 0 && (
                          <Badge variant="outline" className="ml-auto text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                            +{Math.round(opportunity.matchBreakdown.engagementBoost ?? 0)} Engagement Boost
                          </Badge>
                        )}
                      </div>
                      
                      {/* KPI Grid - 2 columns */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Skills - 35% weight */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Target className="w-3 h-3" />Skills
                            </span>
                            <span className={`font-bold ${getMatchScoreColor(opportunity.matchBreakdown.skillMatch ?? 0)}`}>
                              {Math.round(opportunity.matchBreakdown.skillMatch ?? 0)}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getProgressColor(opportunity.matchBreakdown.skillMatch ?? 0)} transition-all duration-500`}
                              style={{ width: `${opportunity.matchBreakdown.skillMatch ?? 0}%` }}
                            />
                          </div>
                        </div>

                        {/* SDG - 20% weight */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              🎯 SDG
                            </span>
                            <span className={`font-bold ${getMatchScoreColor(opportunity.matchBreakdown.sdgMatch ?? 0)}`}>
                              {Math.round(opportunity.matchBreakdown.sdgMatch ?? 0)}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getProgressColor(opportunity.matchBreakdown.sdgMatch ?? 0)} transition-all duration-500`}
                              style={{ width: `${opportunity.matchBreakdown.sdgMatch ?? 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Availability - 20% weight */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />Time Fit
                            </span>
                            <span className={`font-bold ${getMatchScoreColor(opportunity.matchBreakdown.availabilityMatch ?? 0)}`}>
                              {Math.round(opportunity.matchBreakdown.availabilityMatch ?? 0)}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getProgressColor(opportunity.matchBreakdown.availabilityMatch ?? 0)} transition-all duration-500`}
                              style={{ width: `${opportunity.matchBreakdown.availabilityMatch ?? 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Location - 10% weight */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />Location
                            </span>
                            <span className={`font-bold ${getMatchScoreColor(opportunity.matchBreakdown.locationMatch ?? 0)}`}>
                              {Math.round(opportunity.matchBreakdown.locationMatch ?? 0)}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getProgressColor(opportunity.matchBreakdown.locationMatch ?? 0)} transition-all duration-500`}
                              style={{ width: `${opportunity.matchBreakdown.locationMatch ?? 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Interests - 10% weight */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Lightbulb className="w-3 h-3" />Interests
                            </span>
                            <span className={`font-bold ${getMatchScoreColor(opportunity.matchBreakdown.interestMatch ?? 0)}`}>
                              {Math.round(opportunity.matchBreakdown.interestMatch ?? 0)}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getProgressColor(opportunity.matchBreakdown.interestMatch ?? 0)} transition-all duration-500`}
                              style={{ width: `${opportunity.matchBreakdown.interestMatch ?? 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Experience - 5% weight */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />Experience
                            </span>
                            <span className={`font-bold ${getMatchScoreColor(opportunity.matchBreakdown.experienceMatch ?? 0)}`}>
                              {Math.round(opportunity.matchBreakdown.experienceMatch ?? 0)}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getProgressColor(opportunity.matchBreakdown.experienceMatch ?? 0)} transition-all duration-500`}
                              style={{ width: `${opportunity.matchBreakdown.experienceMatch ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Match Reasons */}
                      {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            Why this matches you
                          </p>
                          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                            {opportunity.matchReasons.slice(0, 3).map((reason, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="mr-1.5 text-green-500">✓</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
