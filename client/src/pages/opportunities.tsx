import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users, Calendar, Briefcase, Plus, AlertCircle } from "lucide-react";
import { EditOpportunityDialog, DeleteOpportunityDialog } from "@/components/opportunities/opportunity-dialogs";
import OrganizationHeader from "@/components/layout/organization-header";
import type { Opportunity, User } from "@shared/schema";

export default function Opportunities() {
  const [, navigate] = useLocation();
  const userId = localStorage.getItem('currentUserId');
  const userType = localStorage.getItem('userType');
  const isOrganizationUser = userType === 'organization';

  // Organizations cannot see opportunities page
  if (isOrganizationUser) {
    navigate('/organization-dashboard');
    return null;
  }

  // Fetch current user to get organization ID
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID");
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!userId
  });

  // Fetch opportunities with userId parameter
  const { data: opportunities = [], isLoading } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID");
      const response = await fetch(`/api/opportunities?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch opportunities");
      return response.json();
    },
    enabled: !!userId
  });

  if (isLoading) {
    return (
      <div className={isOrganizationUser ? "min-h-screen pb-24" : ""}>
        {isOrganizationUser && <OrganizationHeader activeTab="volunteers" />}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Volunteer Opportunities</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isOrganizationUser ? "min-h-screen pb-24" : ""}>
      {isOrganizationUser && <OrganizationHeader activeTab="volunteers" />}
      <div className={isOrganizationUser ? "p-6" : "p-6"}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Volunteer Opportunities</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and post volunteer opportunities
            </p>
          </div>
          {currentUser?.organizationId && (
          <div className="flex gap-2">
            <Button
              data-testid="button-post-core"
              onClick={() => navigate("/post-core-opportunity")}
              variant="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              Post Core Opportunity
            </Button>
            <Button
              data-testid="button-post-urgent"
              onClick={() => navigate("/post-urgent-opportunity")}
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Post Urgent Need
            </Button>
          </div>
        )}
      </div>

      {opportunities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Opportunities Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start posting volunteer opportunities to connect with passionate volunteers worldwide
            </p>
            {currentUser?.organizationId && (
              <div className="flex gap-2 justify-center">
                <Button
                  data-testid="button-post-core-empty"
                  onClick={() => navigate("/post-core-opportunity")}
                  variant="default"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Post Core Opportunity
                </Button>
                <Button
                  data-testid="button-post-urgent-empty"
                  onClick={() => navigate("/post-urgent-opportunity")}
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Post Urgent Need
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.map((opportunity) => (
            <Card
              key={opportunity.id}
              className="hover:shadow-lg transition-shadow"
              data-testid={`card-opportunity-${opportunity.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={opportunity.status} />
                    <EditOpportunityDialog opportunity={opportunity} />
                    <DeleteOpportunityDialog opportunity={opportunity} />
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {opportunity.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
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
                  {opportunity.volunteersNeeded && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4 mr-2" />
                      {opportunity.volunteersNeeded} volunteer{opportunity.volunteersNeeded > 1 ? 's' : ''} needed
                    </div>
                  )}
                  {opportunity.startDate && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      Starts {new Date(opportunity.startDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {opportunity.requiredSkills && opportunity.requiredSkills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {opportunity.requiredSkills.slice(0, 3).map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {opportunity.requiredSkills.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{opportunity.requiredSkills.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
