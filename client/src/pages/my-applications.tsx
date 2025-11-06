import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Clock, Briefcase, MapPin, Calendar, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface Application {
  id: number;
  opportunityId: number;
  status: string;
  coverLetter: string;
  matchScore: number;
  appliedAt: string;
  reviewedAt?: string;
  notes?: string;
  opportunity?: any;
}

export default function MyApplicationsPage() {
  const userId = localStorage.getItem('currentUserId');

  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications/volunteer", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");
      const response = await fetch(`/api/applications?volunteerId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch applications");
      const apps = await response.json();
      
      // Enrich with opportunity data
      const enrichedApps = await Promise.all(
        apps.map(async (app: Application) => {
          try {
            const oppRes = await fetch(`/api/opportunities/${app.opportunityId}`);
            return {
              ...app,
              opportunity: oppRes.ok ? await oppRes.json() : null
            };
          } catch (err) {
            return app;
          }
        })
      );
      
      return enrichedApps;
    },
    enabled: !!userId
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400", label: "Under Review", icon: Clock },
      accepted: { color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400", label: "Accepted", icon: CheckCircle2 },
      rejected: { color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400", label: "Not Selected", icon: XCircle },
      withdrawn: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400", label: "Withdrawn", icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">My Applications</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const pendingApps = applications.filter(app => app.status === "pending");
  const acceptedApps = applications.filter(app => app.status === "accepted");
  const otherApps = applications.filter(app => app.status !== "pending" && app.status !== "accepted");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Applications</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track the status of your volunteer applications
        </p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No applications yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Start by discovering opportunities that match your skills
            </p>
            <Link href="/opportunities">
              <Button>
                Discover Opportunities
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Accepted Applications */}
          {acceptedApps.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Accepted ({acceptedApps.length})
              </h2>
              <div className="space-y-4">
                {acceptedApps.map((app) => (
                  <Card key={app.id} className="border-l-4 border-l-green-500" data-testid={`accepted-application-${app.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{app.opportunity?.title || "Unknown Opportunity"}</CardTitle>
                          {app.opportunity?.organization && (
                            <p className="text-sm text-muted-foreground mt-1">{app.opportunity.organization}</p>
                          )}
                        </div>
                        {getStatusBadge(app.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {app.opportunity?.location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{app.opportunity.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {app.notes && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                            Message from Organization:
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">{app.notes}</p>
                        </div>
                      )}

                      <Link href={`/opportunities/${app.opportunityId}`}>
                        <Button variant="outline" className="w-full">
                          View Opportunity Details
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Pending Applications */}
          {pendingApps.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                Under Review ({pendingApps.length})
              </h2>
              <div className="space-y-4">
                {pendingApps.map((app) => (
                  <Card key={app.id} className="border-l-4 border-l-yellow-500" data-testid={`pending-application-${app.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{app.opportunity?.title || "Unknown Opportunity"}</CardTitle>
                          {app.opportunity?.organization && (
                            <p className="text-sm text-muted-foreground mt-1">{app.opportunity.organization}</p>
                          )}
                        </div>
                        {getStatusBadge(app.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {app.opportunity?.location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{app.opportunity.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Your application is being reviewed. You'll be notified once a decision is made.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Other Applications (Rejected, Withdrawn) */}
          {otherApps.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Past Applications ({otherApps.length})</h2>
              <div className="space-y-4">
                {otherApps.map((app) => (
                  <Card key={app.id} className="opacity-75" data-testid={`past-application-${app.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{app.opportunity?.title || "Unknown Opportunity"}</CardTitle>
                          {app.opportunity?.organization && (
                            <p className="text-sm text-muted-foreground mt-1">{app.opportunity.organization}</p>
                          )}
                        </div>
                        {getStatusBadge(app.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Applied {new Date(app.appliedAt).toLocaleDateString()}
                        {app.reviewedAt && ` • Reviewed ${new Date(app.reviewedAt).toLocaleDateString()}`}
                      </div>

                      {app.notes && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-muted-foreground">{app.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
