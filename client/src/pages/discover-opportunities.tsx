import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getAuthHeaders } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Search, MapPin, Clock, Users, Building2, Filter, X, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import VolunteerNav from "@/components/layout/volunteer-nav";
import WebBottomNav from "@/components/layout/web-bottom-nav";
import Footer from "@/components/layout/footer";
import { useIsMobile } from "@/hooks/use-mobile";
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
  matchScore?: number;
  matchReasons?: string[];
  isUrgent?: boolean;
}

interface OpportunityStatus {
  savedIds: number[];
  rejectedIds: number[];
  appliedIds: number[];
}

export default function DiscoverOpportunities() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
  const [sdgFilter, setSdgFilter] = useState<string>(urlParams.sdg);
  const [showFilters, setShowFilters] = useState(false);
  const [applyingToId, setApplyingToId] = useState<number | null>(null);

  const userId = localStorage.getItem('currentUserId');
  const userType = localStorage.getItem('userType');
  const isVolunteer = userType === 'volunteer';

  useEffect(() => {
    if (urlParams.skill) setSearchQuery(urlParams.skill);
    if (urlParams.search) setSearchQuery(urlParams.search);
    if (urlParams.sdg) setSdgFilter(urlParams.sdg);
  }, [urlParams.skill, urlParams.search, urlParams.sdg]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { data: opportunities = [], isLoading, isError, refetch: refetchOpportunities } = useQuery<EnrichedOpportunity[]>({
    queryKey: [`/api/opportunities/discover`, userId],
    queryFn: async () => {
      if (!userId) return [];
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/opportunities/discover?userId=${userId}&threshold=0`, { headers });
      if (!response.ok) throw new Error(`Failed to fetch opportunities: ${response.status}`);
      return response.json();
    },
    enabled: !!userId,
    retry: 2,
    retryDelay: 1000,
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: opportunityStatus = { savedIds: [], rejectedIds: [], appliedIds: [] }, refetch: refetchStatus } = useQuery<OpportunityStatus>({
    queryKey: ["/api/opportunities/status", userId],
    queryFn: async () => {
      if (!userId) return { savedIds: [], rejectedIds: [], appliedIds: [] };
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/opportunities/status?volunteerId=${userId}`, { headers });
      if (!response.ok) return { savedIds: [], rejectedIds: [], appliedIds: [] };
      return response.json();
    },
    enabled: !!userId,
    retry: 1,
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
  });

  const availableCategories = useMemo(() => {
    if (!Array.isArray(opportunities)) return [];
    return Array.from(new Set(opportunities.map(o => o?.category).filter(Boolean))).sort() as string[];
  }, [opportunities]);

  const availableLocations = useMemo(() => {
    if (!Array.isArray(opportunities)) return [];
    return Array.from(new Set(opportunities.map(o => o?.location).filter(Boolean))).sort() as string[];
  }, [opportunities]);

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center p-6">
          <p className="mb-4 text-stone-600">Please log in to discover opportunities</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  const filteredOpportunities = (opportunities || []).filter((opp) => {
    if (!opp || typeof opp.id !== 'number') return false;
    const matchesSearch = !searchQuery ||
      (opp.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opp.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opp.requiredSkills || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || opp.category === categoryFilter;
    const matchesLocation = locationFilter === "all" ||
      (locationFilter === "remote" ? opp.isRemote : (opp.location || '').includes(locationFilter));
    const matchesSdg = !sdgFilter || (opp.sdgGoals || []).includes(parseInt(sdgFilter));
    const isNotRejected = !opportunityStatus?.rejectedIds?.includes(opp.id);
    return matchesSearch && matchesCategory && matchesLocation && matchesSdg && isNotRejected;
  });

  const hasApplied = (id: number) => opportunityStatus?.appliedIds?.includes(id) ?? false;

  const hasActiveFilters = categoryFilter !== 'all' || locationFilter !== 'all' || !!sdgFilter;

  const applyMutation = useMutation({
    mutationFn: async (opportunityId: number) => {
      const volunteerId = parseInt(userId || '0');
      if (!volunteerId) throw new Error('Please log in to apply');
      return apiRequest("POST", "/api/applications", {
        opportunityId,
        volunteerId,
        coverLetter: "I am interested in this volunteer opportunity and would like to contribute my skills."
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities/status"] });
      toast({ title: "Applied successfully!", description: "Your application has been submitted." });
      setApplyingToId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Application failed", description: error.message || "Please try again.", variant: "destructive" });
      setApplyingToId(null);
    }
  });

  const handleApply = (opportunityId: number) => {
    if (!userId) { navigate('/login'); return; }
    if (hasApplied(opportunityId)) return;
    setApplyingToId(opportunityId);
    applyMutation.mutate(opportunityId);
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col">
      {isVolunteer && <VolunteerNav />}

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-6 pb-24 space-y-4">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Opportunities</h1>
          <p className="text-sm text-stone-500 mt-0.5">Find volunteer opportunities that match your skills and interests</p>
        </div>

        {/* Search + Filter Row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors shadow-sm ${
              hasActiveFilters
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
            }`}
          >
            <Filter className="h-4 w-4" />
            {hasActiveFilters ? 'Filtered' : 'Filter'}
          </button>
        </div>

        {/* Active filter chips */}
        {(sdgFilter || categoryFilter !== 'all' || locationFilter !== 'all') && (
          <div className="flex flex-wrap gap-2">
            {categoryFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
                {categoryFilter}
                <button onClick={() => setCategoryFilter('all')}><X className="h-3 w-3 ml-0.5" /></button>
              </span>
            )}
            {locationFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
                {locationFilter === 'remote' ? 'Remote' : locationFilter}
                <button onClick={() => setLocationFilter('all')}><X className="h-3 w-3 ml-0.5" /></button>
              </span>
            )}
            {sdgFilter && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
                SDG {sdgFilter}
                <button onClick={() => setSdgFilter('')}><X className="h-3 w-3 ml-0.5" /></button>
              </span>
            )}
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1.5">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1.5">Location</label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="all">All Locations</option>
                  <option value="remote">Remote Only</option>
                  {availableLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => { setCategoryFilter('all'); setLocationFilter('all'); setSdgFilter(''); }}
                className="text-xs text-stone-500 hover:text-stone-700 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        <p className="text-xs text-stone-400">
          {isLoading ? 'Loading...' : `${filteredOpportunities.length} opportunit${filteredOpportunities.length === 1 ? 'y' : 'ies'} found`}
        </p>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-stone-200 p-5 animate-pulse">
                <div className="h-4 bg-stone-100 rounded w-2/3 mb-3" />
                <div className="h-3 bg-stone-100 rounded w-1/3 mb-4" />
                <div className="h-3 bg-stone-100 rounded w-full mb-2" />
                <div className="h-3 bg-stone-100 rounded w-4/5" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center shadow-sm">
            <p className="text-stone-600 font-medium mb-1">Unable to load opportunities</p>
            <p className="text-stone-400 text-sm mb-4">Please check your connection and try again.</p>
            <Button size="sm" onClick={() => { refetchOpportunities(); refetchStatus(); }}>Try Again</Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filteredOpportunities.length === 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-10 text-center shadow-sm">
            <Search className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-600 font-medium">No opportunities found</p>
            <p className="text-stone-400 text-sm mt-1">Try adjusting your search or filters</p>
            {(searchQuery || hasActiveFilters) && (
              <button
                className="mt-3 text-sm text-indigo-600 hover:underline"
                onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setLocationFilter('all'); setSdgFilter(''); }}
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Opportunity Cards */}
        {!isLoading && !isError && filteredOpportunities.length > 0 && (
          <div className="space-y-3">
            {filteredOpportunities.map((opp) => {
              const applied = hasApplied(opp.id);
              const applying = applyingToId === opp.id;
              return (
                <div
                  key={opp.id}
                  className="bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300 transition-all cursor-pointer"
                  onClick={() => navigate(`/opportunities/${opp.id}`)}
                >
                  <div className="p-5">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-stone-900 leading-snug">{opp.title}</h3>
                        {opp.organizationName && (
                          <div className="flex items-center gap-1.5 mt-1 text-stone-500 text-xs">
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            <span>{opp.organizationName}</span>
                          </div>
                        )}
                      </div>
                      {applied && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex-shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Applied
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {opp.description && (
                      <p className="text-sm text-stone-500 line-clamp-2 mb-3 leading-relaxed">{opp.description}</p>
                    )}

                    {/* SDG circles */}
                    {opp.sdgGoals && opp.sdgGoals.length > 0 && (
                      <div className="flex gap-1.5 mb-3">
                        {opp.sdgGoals.slice(0, 5).map((sdg) => (
                          <span
                            key={sdg}
                            className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center text-white"
                            style={{ backgroundColor: getSDGColor(sdg) }}
                          >
                            {sdg}
                          </span>
                        ))}
                        {opp.sdgGoals.length > 5 && (
                          <span className="w-6 h-6 rounded bg-stone-200 text-[10px] font-medium flex items-center justify-center text-stone-500">
                            +{opp.sdgGoals.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 mb-4">
                      {(opp.location || opp.isRemote) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {opp.isRemote ? 'Remote' : opp.location}
                        </span>
                      )}
                      {opp.timeCommitment && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {opp.timeCommitment}
                        </span>
                      )}
                      {opp.volunteersNeeded && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {opp.volunteersNeeded} needed
                        </span>
                      )}
                      {opp.category && (
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">{opp.category}</span>
                      )}
                    </div>

                    {/* Skills */}
                    {opp.requiredSkills && opp.requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {opp.requiredSkills.slice(0, 4).map((skill, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md">{skill}</span>
                        ))}
                        {opp.requiredSkills.length > 4 && (
                          <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-400 rounded-md">+{opp.requiredSkills.length - 4}</span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-stone-200 text-stone-600 hover:bg-stone-50"
                        onClick={(e) => { e.stopPropagation(); navigate(`/opportunities/${opp.id}`); }}
                      >
                        View Details
                      </Button>
                      {isVolunteer && (
                        <Button
                          size="sm"
                          disabled={applied || applying}
                          onClick={(e) => { e.stopPropagation(); handleApply(opp.id); }}
                          className={`rounded-lg font-medium ${applied ? 'bg-stone-100 text-stone-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                        >
                          {applied ? 'Applied' : applying ? 'Applying...' : 'Apply Now'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {isMobile && <WebBottomNav activeTab="discover" />}
      {!isMobile && <Footer />}
    </div>
  );
}
