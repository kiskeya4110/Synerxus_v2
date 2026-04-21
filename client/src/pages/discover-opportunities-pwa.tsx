import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Search, MapPin, Clock, Users, Sparkles, Target,
  ChevronDown, CheckCircle, Building2, Calendar, Filter,
  Home, Briefcase, Lightbulb, BarChart3, User, MessageCircle, MoreVertical, Settings, ClipboardList, LogOut
} from "lucide-react";
import PWAHeader from "@/components/pwa/pwa-header";
import VolunteerPWANav from "@/components/layout/volunteer-pwa-nav";
import OrganizationPWANav from "@/components/layout/organization-pwa-nav";
import OrganizationPWAHeader from "@/components/layout/organization-pwa-header";
import CSRPWANav from "@/components/layout/csr-pwa-nav";
import CSRPWAHeader from "@/components/layout/csr-pwa-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ApplicationDialog from "@/components/opportunities/application-dialog";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import { getSDGColor } from "@/lib/sdg-utils";

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

export default function DiscoverOpportunitiesPWA() {
  const [location, navigate] = useLocation();

  // Parse URL search parameters for pre-populated filters
  const urlParams = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return {
      skill: searchParams.get('skill') || '',
      sdg: searchParams.get('sdg') || '',
      search: searchParams.get('search') || searchParams.get('q') || '',
      category: searchParams.get('category') || 'all',
      location: searchParams.get('location') || 'all',
    };
  }, [location]);

  const [searchQuery, setSearchQuery] = useState(urlParams.search || urlParams.skill);
  const [categoryFilter, setCategoryFilter] = useState<string>(urlParams.category);
  const [locationFilter, setLocationFilter] = useState<string>(urlParams.location);
  const [skillFilter, setSkillFilter] = useState<string>(urlParams.skill);
  const [sdgFilter, setSdgFilter] = useState<string>(urlParams.sdg);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<EnrichedOpportunity | null>(null);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const userId = localStorage.getItem('currentUserId');
  const userType = localStorage.getItem('userType') || 'volunteer';

  // Render appropriate header based on user type
  const renderHeader = () => {
    switch (userType) {
      case 'organization':
        return <OrganizationPWAHeader />;
      case 'corporate-partner':
      case 'corporate_partner':
        return <CSRPWAHeader companyName="CSR Partner" />;
      default:
        return <PWAHeader />;
    }
  };

  // Render appropriate navigation based on user type
  const renderNav = () => {
    switch (userType) {
      case 'organization':
        return <OrganizationPWANav activeTab="projects" />;
      case 'corporate-partner':
      case 'corporate_partner':
        return <CSRPWANav activeTab="home" />;
      default:
        return <VolunteerPWANav userId={userId || undefined} activeTab="potentials" />;
    }
  };

  // Update filters when URL params change
  useEffect(() => {
    if (urlParams.skill) {
      setSearchQuery(urlParams.skill);
      setSkillFilter(urlParams.skill);
      setShowFilters(true);
    }
    if (urlParams.search) {
      setSearchQuery(urlParams.search);
    }
    if (urlParams.sdg) {
      setSdgFilter(urlParams.sdg);
      setShowFilters(true);
    }
  }, [urlParams.skill, urlParams.search, urlParams.sdg]);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch opportunities - using React Query's built-in retry and caching
  const { data: opportunities = [], isLoading, isError, refetch: refetchOpportunities } = useQuery<EnrichedOpportunity[]>({
    queryKey: [`/api/opportunities/discover`, userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/opportunities/discover?userId=${userId}&threshold=0`);
      if (!response.ok) {
        throw new Error(`Failed to fetch opportunities: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!userId,
    retry: 2, // Retry twice on failure
    retryDelay: 1000, // Wait 1 second between retries
    staleTime: 60000, // Cache for 60 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Fetch opportunity status
  const { data: opportunityStatus = { savedIds: [], rejectedIds: [], appliedIds: [] }, refetch: refetchStatus } = useQuery<OpportunityStatus>({
    queryKey: ["/api/opportunities/status", userId],
    queryFn: async () => {
      if (!userId) return { savedIds: [], rejectedIds: [], appliedIds: [] };
      const response = await fetch(`/api/opportunities/status?volunteerId=${userId}`);
      if (!response.ok) {
        return { savedIds: [], rejectedIds: [], appliedIds: [] };
      }
      return response.json();
    },
    enabled: !!userId,
    retry: 1,
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
  });

  // These useMemo hooks must be before any early returns to maintain consistent hook order
  const availableCategories = useMemo(() => {
    if (!Array.isArray(opportunities)) return [];
    return Array.from(new Set(opportunities.map(o => o?.category).filter(Boolean))).sort();
  }, [opportunities]);

  const availableLocations = useMemo(() => {
    if (!Array.isArray(opportunities)) return [];
    return Array.from(new Set(opportunities.map(o => o?.location).filter(Boolean))).sort();
  }, [opportunities]);

  // Redirect to login if not authenticated - must be after all hooks
  if (!userId) {
    return (
      <div className="h-screen bg-[#faf9f7] flex items-center justify-center overflow-hidden">
        <div className="text-slate-800 text-center p-6">
          <p className="mb-4">Please log in to discover opportunities</p>
          <Button onClick={() => navigate('/login')} className="bg-emerald-500 hover:bg-emerald-600">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const filteredOpportunities = (opportunities || []).filter((opp) => {
    // Guard against malformed opportunity objects
    if (!opp || typeof opp.id !== 'number') return false;

    const matchesSearch = searchQuery
      ? (opp.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opp.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opp.requiredSkills || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;

    const matchesCategory = categoryFilter === "all" || opp.category === categoryFilter;
    const matchesLocation = locationFilter === "all" ||
      (locationFilter === "remote" ? opp.isRemote : (opp.location || '').includes(locationFilter));

    // Skill filter - check if opportunity requires the specific skill
    const matchesSkill = !skillFilter ||
      (opp.requiredSkills || []).some(s => s.toLowerCase().includes(skillFilter.toLowerCase()));

    // SDG filter - check if opportunity targets the specific SDG
    const matchesSdg = !sdgFilter ||
      (opp.sdgGoals || []).includes(parseInt(sdgFilter));

    const isNotRejected = !opportunityStatus?.rejectedIds?.includes(opp.id);

    return matchesSearch && matchesCategory && matchesLocation && matchesSkill && matchesSdg && isNotRejected;
  });

  const topMatches = filteredOpportunities.filter(o => (o.matchScore ?? 0) >= 70).slice(0, 3);

  const hasApplied = (opportunityId: number) => {
    return opportunityStatus?.appliedIds?.includes(opportunityId) ?? false;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
        <div className="text-slate-800 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p>Loading opportunities...</p>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (isError) {
    return (
      <div className="h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
        <div className="text-slate-800 text-center p-6">
          <div className="w-16 h-16 mx-auto mb-4 text-amber-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-lg font-semibold mb-2">Unable to load opportunities</p>
          <p className="text-sm text-slate-500 mb-4">
            Please check your connection and try again.
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => {
                refetchOpportunities();
                refetchStatus();
              }}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              Try Again
            </Button>
            <Button onClick={() => navigate('/volunteer-dashboard')} variant="outline">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen pwa-gradient-bg flex flex-col w-full max-w-full overflow-hidden">
      {/* PWA Header - User Type Aware */}
      {renderHeader()}

      {/* Spacer for fixed header */}
      <div className="h-[calc(3.5rem+max(0.5rem,env(safe-area-inset-top)))]" />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 w-full max-w-full">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-800 px-4 pt-3 pb-4">
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            Discover Opportunities
          </h1>
          <p className="text-blue-100 text-sm mt-1">
            {filteredOpportunities.length} opportunities matched to you
          </p>

          {/* Active Filters Display */}
          {(skillFilter || sdgFilter) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {skillFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                  <span>Skill: {skillFilter}</span>
                  <button
                    onClick={() => { setSkillFilter(''); setSearchQuery(''); }}
                    className="w-4 h-4 bg-white/30 rounded-full flex items-center justify-center hover:bg-white/50"
                  >
                    ×
                  </button>
                </span>
              )}
              {sdgFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                  <span>SDG {sdgFilter}</span>
                  <button
                    onClick={() => setSdgFilter('')}
                    className="w-4 h-4 bg-white/30 rounded-full flex items-center justify-center hover:bg-white/50"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/70" />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/95 backdrop-blur-sm border-0 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-white/50 outline-none shadow-lg"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="mt-2 flex items-center gap-2 text-white/90 text-sm hover:text-white transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="space-y-3 p-3 -mt-2">
          {/* Filters */}
          {showFilters && (
            <div className="bg-white rounded-2xl p-3 border border-stone-200 shadow-sm space-y-2">
              <h3 className="text-stone-800 font-semibold text-sm">Filters</h3>

              {/* Category Filter */}
              <div>
                <label className="text-stone-600 text-xs mb-1 block">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="text-stone-600 text-xs mb-1 block">Location</label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
              <h2 className="text-stone-800 text-base font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Top Matches for You
              </h2>
              <div className="space-y-2">
                {topMatches.map((opp) => (
                  <div
                    key={opp.id}
                    className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-3 text-white shadow-lg cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => navigate(`/opportunities/${opp.id}/pwa`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full font-medium">
                            {opp.matchScore}% Match
                          </span>
                          {hasApplied(opp.id) && (
                            <span className="text-xs px-2.5 py-1 bg-emerald-500 rounded-full font-medium">Applied</span>
                          )}
                        </div>
                        <h3 className="font-semibold text-base mt-2">{opp.title}</h3>
                        {opp.organizationName && (
                          <p className="text-xs text-blue-100 mt-1 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {opp.organizationName}
                          </p>
                        )}
                      </div>
                    </div>

                    {opp.matchReasons && opp.matchReasons.length > 0 && (
                      <div className="my-2 text-xs bg-white/10 backdrop-blur-sm rounded-lg p-2">
                        <p className="font-semibold mb-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Why this matches:
                        </p>
                        <p className="text-blue-100">• {opp.matchReasons[0]}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs mb-2 text-blue-100">
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!hasApplied(opp.id)) {
                          setSelectedOpportunity(opp);
                          setApplicationDialogOpen(true);
                        }
                      }}
                      disabled={hasApplied(opp.id)}
                      className="w-full bg-white text-blue-700 hover:bg-blue-50 font-semibold rounded-xl"
                    >
                      {hasApplied(opp.id) ? "✓ Already Applied" : "Apply Now"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Opportunities */}
          <div>
            <h2 className="text-stone-800 text-base font-semibold mb-2">
              All Opportunities ({filteredOpportunities.length})
            </h2>

            {filteredOpportunities.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 text-center border border-stone-200 shadow-sm">
                <Search className="w-10 h-10 mx-auto text-stone-400 mb-2" />
                <p className="text-stone-800 font-medium">No opportunities found</p>
                <p className="text-stone-500 text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOpportunities.map((opp) => {
                  const matchScore = opp.matchScore ?? 0;
                  const matchGradient = matchScore >= 80 ? 'from-emerald-500 to-teal-500' :
                                    matchScore >= 60 ? 'from-blue-500 to-indigo-500' :
                                    matchScore >= 40 ? 'from-amber-500 to-orange-500' : 'from-slate-400 to-slate-500';

                  return (
                    <div
                      key={opp.id}
                      className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                      onClick={() => navigate(`/opportunities/${opp.id}/pwa`)}
                    >
                      {/* Match Score Header */}
                      <div className={`bg-gradient-to-r ${matchGradient} px-3 py-2 flex items-center justify-between`}>
                        <div className="flex items-center gap-3 text-white">
                          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <span className="text-base font-bold">{matchScore}%</span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold block">
                              {matchScore >= 80 ? 'Excellent Match' :
                               matchScore >= 60 ? 'Good Match' :
                               matchScore >= 40 ? 'Fair Match' : 'Explore'}
                            </span>
                            <span className="text-xs text-white/80">Compatibility Score</span>
                          </div>
                        </div>
                        {hasApplied(opp.id) && (
                          <Badge className="bg-white/20 text-white text-xs border-0 rounded-full px-3">
                            ✓ Applied
                          </Badge>
                        )}
                      </div>

                      <div className="p-3">
                        {/* Title & Organization */}
                        <h3 className="text-stone-800 font-semibold text-sm mb-0.5">
                          {opp.title}
                        </h3>
                        {opp.organizationName && (
                          <div className="flex items-center gap-1 text-stone-500 text-xs mb-1.5">
                            <Building2 className="w-3 h-3" />
                            <span>{opp.organizationName}</span>
                          </div>
                        )}

                        {/* Description */}
                        {opp.description && (
                          <p className="text-stone-600 text-sm line-clamp-2 mb-2">
                            {opp.description}
                          </p>
                        )}

                        {/* SDG Goals */}
                        {opp.sdgGoals && opp.sdgGoals.length > 0 && (
                          <div className="flex gap-1 mb-2">
                            {opp.sdgGoals.slice(0, 4).map((sdg) => (
                              <div
                                key={sdg}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                                style={{ backgroundColor: getSDGColor(sdg) }}
                              >
                                {sdg}
                              </div>
                            ))}
                            {opp.sdgGoals.length > 4 && (
                              <div className="w-7 h-7 rounded-lg bg-slate-600 flex items-center justify-center text-white text-[10px] shadow-sm">
                                +{opp.sdgGoals.length - 4}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Match Reasons */}
                        {opp.matchReasons && opp.matchReasons.length > 0 && (
                          <div className="bg-indigo-50 rounded-xl p-2 mb-2">
                            <p className="text-indigo-700 text-xs font-semibold mb-1 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Why this matches you
                            </p>
                            <p className="text-indigo-600 text-xs">• {opp.matchReasons[0]}</p>
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex flex-wrap gap-1.5 text-xs text-stone-600 mb-2">
                          {opp.location && (
                            <div className="flex items-center gap-1 bg-stone-100 px-2 py-1 rounded-lg">
                              <MapPin className="w-3 h-3" />
                              <span>{opp.location}</span>
                            </div>
                          )}
                          {opp.timeCommitment && (
                            <div className="flex items-center gap-1 bg-stone-100 px-2 py-1 rounded-lg">
                              <Clock className="w-3 h-3" />
                              <span>{opp.timeCommitment}</span>
                            </div>
                          )}
                          {opp.volunteersNeeded && (
                            <div className="flex items-center gap-1 bg-stone-100 px-2 py-1 rounded-lg">
                              <Users className="w-3 h-3" />
                              <span>{opp.volunteersNeeded} needed</span>
                            </div>
                          )}
                        </div>

                        {/* Skills */}
                        {opp.requiredSkills && opp.requiredSkills.length > 0 && (
                          <div className="mb-2">
                            <p className="text-stone-500 text-xs mb-1 font-medium">Required Skills:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {opp.requiredSkills.slice(0, 3).map((skill, idx) => (
                                <span key={idx} className="text-xs px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg font-medium">
                                  {skill}
                                </span>
                              ))}
                              {opp.requiredSkills.length > 3 && (
                                <span className="text-xs px-2.5 py-1 bg-stone-200 text-stone-600 rounded-lg">
                                  +{opp.requiredSkills.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/opportunities/${opp.id}/pwa`);
                            }}
                            variant="outline"
                            className="flex-1 rounded-xl border-stone-300 text-stone-700 hover:bg-stone-100"
                          >
                            View Details
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!hasApplied(opp.id)) {
                                setSelectedOpportunity(opp);
                                setApplicationDialogOpen(true);
                              }
                            }}
                            disabled={hasApplied(opp.id)}
                            className={`flex-1 rounded-xl ${hasApplied(opp.id) ? 'bg-slate-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'} text-white font-semibold`}
                          >
                            {hasApplied(opp.id) ? "✓ Applied" : "Apply Now"}
                          </Button>
                        </div>
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

      {/* Bottom Navigation - User Type Aware */}
      {renderNav()}
    </div>
  );
}
