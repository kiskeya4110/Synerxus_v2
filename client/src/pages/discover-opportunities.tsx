import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, Users, Calendar, Search, TrendingUp, Sparkles } from "lucide-react";
import { Opportunity } from "@shared/schema";
import ApplicationDialog from "@/components/opportunities/application-dialog";

export default function DiscoverOpportunities() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [selectedOpportunity, setSelectedOpportunity] = useState<(Opportunity & { matchScore?: number; matchReasons?: string[] }) | null>(null);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);

  // Fetch opportunities with AI matches
  const { data: opportunities = [], isLoading } = useQuery<Array<Opportunity & { matchScore?: number; matchReasons?: string[] }>>({
    queryKey: ["/api/opportunities/discover"],
  });

  // Filter opportunities based on search and filters
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch = searchQuery
      ? opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    const matchesCategory = categoryFilter === "all" || opp.category === categoryFilter;
    const matchesLocation = locationFilter === "all" || 
      (locationFilter === "remote" ? opp.isRemote : opp.location?.includes(locationFilter));

    return matchesSearch && matchesCategory && matchesLocation;
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
            <SelectItem value="healthcare">Healthcare</SelectItem>
            <SelectItem value="education">Education</SelectItem>
            <SelectItem value="environment">Environment</SelectItem>
            <SelectItem value="community">Community</SelectItem>
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger data-testid="select-location-filter">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="remote">Remote Only</SelectItem>
            <SelectItem value="Kenya">Kenya</SelectItem>
            <SelectItem value="Uganda">Uganda</SelectItem>
            <SelectItem value="Tanzania">Tanzania</SelectItem>
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
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                      {getMatchBadge(opportunity.matchScore)}
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
                        setSelectedOpportunity(opportunity);
                        setApplicationDialogOpen(true);
                      }}
                    >
                      Apply Now
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
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                    {getMatchBadge(opportunity.matchScore)}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {opportunity.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                    {opportunity.category && (
                      <Badge variant="secondary">{opportunity.category}</Badge>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    data-testid={`button-view-${opportunity.id}`}
                    onClick={() => {
                      setSelectedOpportunity(opportunity);
                      setApplicationDialogOpen(true);
                    }}
                  >
                    View Details
                  </Button>
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
