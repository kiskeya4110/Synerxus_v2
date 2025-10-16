import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Clock, Users, Calendar, Briefcase } from "lucide-react";
import { Opportunity } from "@shared/schema";

export default function Opportunities() {
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  // Fetch opportunities
  const { data: opportunities = [], isLoading } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "filled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
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
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Volunteer Opportunities</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and post volunteer opportunities
          </p>
        </div>
        <Button data-testid="button-create-opportunity">
          <Plus className="w-4 h-4 mr-2" />
          Post Opportunity
        </Button>
      </div>

      {opportunities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Opportunities Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start posting volunteer opportunities to connect with passionate volunteers worldwide
            </p>
            <Button data-testid="button-post-first-opportunity">
              <Plus className="w-4 h-4 mr-2" />
              Post Your First Opportunity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.map((opportunity) => (
            <Card
              key={opportunity.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedOpportunity(opportunity)}
              data-testid={`card-opportunity-${opportunity.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                  <Badge className={getStatusColor(opportunity.status)}>
                    {opportunity.status}
                  </Badge>
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
  );
}
