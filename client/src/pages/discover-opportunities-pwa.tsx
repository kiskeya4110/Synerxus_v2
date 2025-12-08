import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Search, MapPin, Clock, Users, Sparkles, Target,
  ChevronDown, ArrowLeft, CheckCircle, Building2, Calendar, Filter
} from "lucide-react";
import VolunteerPWANav from "@/components/layout/volunteer-pwa-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ApplicationDialog from "@/components/opportunities/application-dialog";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import logoUrl from "@assets/Synerxus Modern Logo  NBG_1763706841211.png";

interface EnrichedOpportunity {
  id: number;
  title: string;
  description?: string;
  organizationName?: string;
  location?: string;
  isRemote?: boolean;
  timeCommitment?: string;
  category?: string;
  sdgGoals?: number[];
  requiredSkills?: string[];
  volunteersNeeded?: number;
  startDate?: string;
  endDate?: string;
  matchScore?: number;
  matchReasons?: string[];
  matchBreakdown?: {
    skillMatch: number;
    locationMatch: number;
    sdgMatch: number;
    interestMatch: number;
    availabilityMatch: number;
    experienceMatch: number;
  };
  isUrgent?: boolean;
  benefits?: string;
  requirements?: string;
}

interface OpportunityStatus {
  savedIds: number[];
  rejectedIds: number[];
  appliedIds: number[];
}

const SDG_COLORS: { [key: number]: string } = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D",
  5: "#FF3A21", 6: "#26BDE2", 7: "#FCC30B", 8: "#A21942",
  9: "#FD6925", 10: "#DD1367", 11: "#FD9D24", 12: "#BF8B2E",
  13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B", 16: "#00689D",
  17: "#19486A"
};

export default function DiscoverOpportunitiesPWA() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<EnrichedOpportunity | null>(null);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);

  const userId = localStorage.getItem('currentUserId');

  // Fetch opportunities
  const { data: opportunities = [], isLoading } = useQuery<EnrichedOpportunity[]>({
    queryKey: [`/api/opportunities/discover`, userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const response = await fetch(`/api/opportunities/discover?userId=${userId}&threshold=0`);
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        console.error("Error fetching opportunities:", error);
        return [];
      }
    },
    enabled: !!userId,
  });

  // Fetch opportunity status
  const { data: opportunityStatus = { savedIds: [], rejectedIds: [], appliedIds: [] } } = useQuery<OpportunityStatus>({
    queryKey: ["/api/opportunities/status", userId],
    queryFn: async () => {
      if (!userId) return { savedIds: [], rejectedIds: [], appliedIds: [] };
      try {
        const response = await fetch(`/api/opportunities/status?volunteerId=${userId}`);
        if (!response.ok) return { savedIds: [], rejectedIds: [], appliedIds: [] };
        return response.json();
      } catch (error) {
        return { savedIds: [], rejectedIds: [], appliedIds: [] };
      }
    },
    enabled: !!userId,
  });

  const availableCategories = useMemo(() => {
    return Array.from(new Set(opportunities.map(o => o.category).filter(Boolean))).sort();
  }, [opportunities]);

  const availableLocations = useMemo(() => {
    return Array.from(new Set(opportunities.map(o => o.location).filter(Boolean))).sort();
  }, [opportunities]);

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch = searchQuery
      ? opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesCategory = categoryFilter === "all" || opp.category === categoryFilter;
    const matchesLocation = locationFilter === "all" ||
      (locationFilter === "remote" ? opp.isRemote : opp.location?.includes(locationFilter));

    const isNotRejected = !opportunityStatus?.rejectedIds.includes(opp.id);

    return matchesSearch && matchesCategory && matchesLocation && isNotRejected;
  });

  const topMatches = filteredOpportunities.filter(o => (o.matchScore ?? 0) >= 70).slice(0, 3);

  const hasApplied = (opportunityId: number) => {
    return opportunityStatus?.appliedIds.includes(opportunityId) || false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <div className="text-slate-800 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p>Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col max-w-[428px] mx-auto">
      {/* Top App Bar */}
      <header className="bg-[#16213e] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <button
          onClick={() => navigate('/volunteer-dashboard')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-semibold text-base">Back</span>
        </button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 hover:bg-white/10 rounded-full"
        >
          <Filter className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="space-y-4 p-4">
          {/* Header */}
          <div>
            <h1 className="text-slate-800 text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-500" />
              Discover Opportunities
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {filteredOpportunities.length} opportunities matched to you
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-amber-200/60 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-sm"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm space-y-3">
              <h3 className="text-slate-800 font-semibold text-sm">Filters</h3>

              {/* Category Filter */}
              <div>
                <label className="text-slate-500 text-xs mb-1 block">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200/60 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="text-slate-500 text-xs mb-1 block">Location</label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200/60 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="all">All Locations</option>
                  <option value="remote">Remote Only</option>
                  {availableLocations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Top Matches */}
          {topMatches.length > 0 && (
            <div>
              <h2 className="text-slate-800 text-lg font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                Top Matches for You
              </h2>
              <div className="space-y-3">
                {topMatches.map((opp) => (
                  <div
                    key={opp.id}
                    className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl p-4 text-white"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 bg-white/20 rounded">
                            {opp.matchScore}% Match
                          </span>
                          {hasApplied(opp.id) && (
                            <span className="text-xs px-2 py-0.5 bg-green-500 rounded">Applied</span>
                          )}
                        </div>
                        <h3 className="font-semibold text-base">{opp.title}</h3>
                        {opp.organizationName && (
                          <p className="text-xs opacity-90 mt-1">{opp.organizationName}</p>
                        )}
                      </div>
                    </div>

                    {opp.matchReasons && opp.matchReasons.length > 0 && (
                      <div className="my-3 text-xs opacity-90">
                        <p className="font-semibold mb-1">Why this matches:</p>
                        <p>• {opp.matchReasons[0]}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs mb-3">
                      {opp.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{opp.location}</span>
                        </div>
                      )}
                      {opp.timeCommitment && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{opp.timeCommitment}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => {
                        if (!hasApplied(opp.id)) {
                          setSelectedOpportunity(opp);
                          setApplicationDialogOpen(true);
                        }
                      }}
                      disabled={hasApplied(opp.id)}
                      className="w-full bg-white text-emerald-700 hover:bg-gray-100 font-semibold"
                    >
                      {hasApplied(opp.id) ? "Already Applied" : "Apply Now"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Opportunities */}
          <div>
            <h2 className="text-slate-800 text-lg font-semibold mb-3">
              All Opportunities ({filteredOpportunities.length})
            </h2>

            {filteredOpportunities.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-amber-200/60 shadow-sm">
                <Search className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600">No opportunities found</p>
                <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOpportunities.map((opp) => {
                  const matchScore = opp.matchScore ?? 0;
                  const matchColor = matchScore >= 80 ? 'bg-emerald-500' :
                                    matchScore >= 60 ? 'bg-blue-500' :
                                    matchScore >= 40 ? 'bg-amber-500' : 'bg-gray-500';

                  return (
                    <div
                      key={opp.id}
                      className="bg-white rounded-xl border border-amber-200/60 overflow-hidden hover:border-amber-300 shadow-sm transition-all"
                    >
                      {/* Match Score Header */}
                      <div className={`${matchColor} px-4 py-2 flex items-center justify-between`}>
                        <div className="flex items-center gap-2 text-white">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <span className="text-sm font-bold">{matchScore}%</span>
                          </div>
                          <span className="text-xs font-medium">
                            {matchScore >= 80 ? 'Excellent Match' :
                             matchScore >= 60 ? 'Good Match' :
                             matchScore >= 40 ? 'Fair Match' : 'Low Match'}
                          </span>
                        </div>
                        {hasApplied(opp.id) && (
                          <Badge className="bg-white/20 text-white text-xs border-0">
                            Applied
                          </Badge>
                        )}
                      </div>

                      <div className="p-4">
                        {/* Title & Organization */}
                        <h3 className="text-slate-800 font-semibold text-base mb-1">
                          {opp.title}
                        </h3>
                        {opp.organizationName && (
                          <div className="flex items-center gap-1 text-slate-500 text-xs mb-2">
                            <Building2 className="w-3 h-3" />
                            <span>{opp.organizationName}</span>
                          </div>
                        )}

                        {/* Description */}
                        {opp.description && (
                          <p className="text-slate-600 text-sm line-clamp-2 mb-3">
                            {opp.description}
                          </p>
                        )}

                        {/* SDG Goals */}
                        {opp.sdgGoals && opp.sdgGoals.length > 0 && (
                          <div className="flex gap-1 mb-3">
                            {opp.sdgGoals.slice(0, 4).map((sdg) => (
                              <div
                                key={sdg}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                style={{ backgroundColor: SDG_COLORS[sdg] || '#6B7280' }}
                              >
                                {sdg}
                              </div>
                            ))}
                            {opp.sdgGoals.length > 4 && (
                              <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-[10px]">
                                +{opp.sdgGoals.length - 4}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Match Reasons */}
                        {opp.matchReasons && opp.matchReasons.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                            <p className="text-blue-600 text-xs font-semibold mb-1 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Why this matches you
                            </p>
                            <p className="text-blue-500 text-xs">• {opp.matchReasons[0]}</p>
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
                          {opp.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{opp.location}</span>
                            </div>
                          )}
                          {opp.timeCommitment && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{opp.timeCommitment}</span>
                            </div>
                          )}
                          {opp.volunteersNeeded && (
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{opp.volunteersNeeded} needed</span>
                            </div>
                          )}
                        </div>

                        {/* Skills */}
                        {opp.requiredSkills && opp.requiredSkills.length > 0 && (
                          <div className="mb-3">
                            <p className="text-slate-500 text-xs mb-1">Required Skills:</p>
                            <div className="flex flex-wrap gap-1">
                              {opp.requiredSkills.slice(0, 3).map((skill, idx) => (
                                <span key={idx} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                                  {skill}
                                </span>
                              ))}
                              {opp.requiredSkills.length > 3 && (
                                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                                  +{opp.requiredSkills.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Apply Button */}
                        <Button
                          onClick={() => {
                            if (!hasApplied(opp.id)) {
                              setSelectedOpportunity(opp);
                              setApplicationDialogOpen(true);
                            }
                          }}
                          disabled={hasApplied(opp.id)}
                          className={`w-full ${hasApplied(opp.id) ? 'bg-gray-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'} text-white font-semibold`}
                        >
                          {hasApplied(opp.id) ? "Already Applied" : "Apply Now"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Application Dialog */}
      {selectedOpportunity && (
        <ApplicationDialog
          opportunity={selectedOpportunity as any}
          open={applicationDialogOpen}
          onOpenChange={setApplicationDialogOpen}
        />
      )}

      {/* Bottom Navigation */}
      <VolunteerPWANav userId={userId || undefined} activeTab="insights" />
    </div>
  );
}
