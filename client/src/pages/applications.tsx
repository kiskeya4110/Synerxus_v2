import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Clock, User, Briefcase, MapPin, Mail, Star, Target, Calendar } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Application {
  id: number;
  opportunityId: number;
  volunteerId: number;
  status: string;
  coverLetter: string;
  matchScore: number;
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: number;
  notes?: string;
  opportunity?: any;
  volunteer?: any;
}

export default function ApplicationsPage() {
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"accepted" | "rejected" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<number | null>(null);
  const [profileApplication, setProfileApplication] = useState<Application | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const { toast } = useToast();

  // Get current user ID
  const userId = localStorage.getItem('currentUserId');

  // Fetch current user data to get organizationId
  const { data: currentUser } = useQuery<{ organizationId?: number }>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!userId
  });

  const organizationId = currentUser?.organizationId;

  // Fetch applications for this organization only
  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications", organizationId],
    queryFn: async () => {
      // Fetch applications scoped to this organization's opportunities
      const url = organizationId 
        ? `/api/applications?organizationId=${organizationId}`
        : "/api/applications";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch applications");
      const apps = await response.json();
      
      // Enrich with opportunity and volunteer data
      const enrichedApps = await Promise.all(
        apps.map(async (app: Application) => {
          try {
            const [oppRes, volRes] = await Promise.all([
              fetch(`/api/opportunities/${app.opportunityId}`),
              fetch(`/api/users/${app.volunteerId}`)
            ]);
            
            return {
              ...app,
              opportunity: oppRes.ok ? await oppRes.json() : null,
              volunteer: volRes.ok ? await volRes.json() : null
            };
          } catch (err) {
            return app;
          }
        })
      );
      
      return enrichedApps;
    },
    enabled: !!userId && !!organizationId
  });

  // Fetch organization's projects for assignment
  const { data: orgProjects = [] } = useQuery({
    queryKey: ["/api/projects", userId],
    enabled: !!organizationId && !!userId
  });

  // Fetch volunteer profile when selected
  const { data: volunteerProfile } = useQuery({
    queryKey: ["/api/profile/volunteer", selectedVolunteerId],
    queryFn: async () => {
      if (!selectedVolunteerId) return null;
      const response = await fetch(`/api/profile/volunteer?userId=${selectedVolunteerId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!selectedVolunteerId && profileDialogOpen
  });

  // Assign volunteer to project mutation
  const assignProjectMutation = useMutation({
    mutationFn: async ({ volunteerId, projectId }: { volunteerId: number; projectId: number }) => {
      return await apiRequest("POST", `/api/project-assignments`, {
        volunteerId,
        projectId,
        status: "pending", // Volunteer must accept/decline
        role: "Volunteer"
      });
    },
    onSuccess: (_data, variables) => {
      toast({
        title: "Project Assigned",
        description: "Volunteer will receive a notification to accept or decline this assignment",
      });
      // Invalidate project assignments, volunteer profile, and volunteers/applications lists
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/volunteer", variables.volunteerId] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (
            key.startsWith('/api/volunteers') ||
            key.startsWith('/api/applications')
          );
        }
      });
      setSelectedProjectId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign volunteer to project",
        variant: "destructive",
      });
    }
  });

  // Review mutation (accept/reject)
  const reviewMutation = useMutation({
    mutationFn: async ({ applicationId, status, notes }: { applicationId: number; status: string; notes: string }) => {
      return await apiRequest("POST", `/api/applications/${applicationId}/review`, {
        status,
        notes,
        reviewerId: parseInt(userId || "0")
      });
    },
    onSuccess: () => {
      toast({
        title: "Application Reviewed",
        description: `Application ${reviewAction === "accepted" ? "accepted" : "rejected"} successfully`,
      });
      // Invalidate all relevant queries to update volunteer lists and dashboard
      // Use predicate to match all queries starting with these paths (handles user-scoped keys)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (
            key.startsWith('/api/applications') ||
            key.startsWith('/api/volunteers') ||
            key.startsWith('/api/projects') ||
            key.startsWith('/api/dashboard/summary')
          );
        }
      });
      setReviewDialogOpen(false);
      setSelectedApplication(null);
      setReviewNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Review Failed",
        description: error.message || "Failed to review application",
        variant: "destructive",
      });
    }
  });

  const handleReview = () => {
    if (!selectedApplication || !reviewAction) return;
    reviewMutation.mutate({
      applicationId: selectedApplication.id,
      status: reviewAction,
      notes: reviewNotes
    });
  };

  const openReviewDialog = (app: Application, action: "accepted" | "rejected") => {
    setSelectedApplication(app);
    setReviewAction(action);
    setReviewDialogOpen(true);
  };

  const openProfileDialog = (volunteerId: number, application?: Application) => {
    setSelectedVolunteerId(volunteerId);
    setProfileApplication(application || null);
    setProfileDialogOpen(true);
  };

  const closeProfileDialog = () => {
    setProfileDialogOpen(false);
    setSelectedVolunteerId(null);
    setProfileApplication(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400", label: "Pending", icon: Clock },
      accepted: { color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400", label: "Accepted", icon: CheckCircle2 },
      rejected: { color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400", label: "Rejected", icon: XCircle },
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

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const pendingApplications = applications.filter(app => app.status === "pending");
  const reviewedApplications = applications.filter(app => app.status !== "pending");

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Applications</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Applications</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review and manage volunteer applications
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingApplications.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed" data-testid="tab-reviewed">
            Reviewed ({reviewedApplications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingApplications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No pending applications</p>
              </CardContent>
            </Card>
          ) : (
            pendingApplications.map((app) => (
              <Card key={app.id} className="hover:shadow-md transition-shadow" data-testid={`application-card-${app.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={app.volunteer?.avatar} />
                        <AvatarFallback>{app.volunteer?.displayName?.[0] || "V"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{app.volunteer?.displayName || "Unknown Volunteer"}</CardTitle>
                        <p className="text-sm text-muted-foreground">{app.volunteer?.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(app.status)}
                      {app.matchScore && (
                        <div className="flex items-center gap-1">
                          <Star className={`w-4 h-4 ${getMatchScoreColor(app.matchScore)}`} />
                          <span className={`text-sm font-medium ${getMatchScoreColor(app.matchScore)}`}>
                            {app.matchScore}% Match
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Briefcase className="w-4 h-4" />
                      <span>{app.opportunity?.title || "Unknown Opportunity"}</span>
                    </div>
                    {app.opportunity?.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{app.opportunity.location}</span>
                      </div>
                    )}
                  </div>

                  {app.coverLetter && (
                    <div>
                      <p className="text-sm font-medium mb-1">Cover Letter:</p>
                      <p className="text-sm text-muted-foreground line-clamp-3">{app.coverLetter}</p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Applied {new Date(app.appliedAt).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openProfileDialog(app.volunteerId, app)}
                      data-testid={`button-view-profile-${app.id}`}
                    >
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => openReviewDialog(app, "accepted")}
                      data-testid={`button-accept-${app.id}`}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => openReviewDialog(app, "rejected")}
                      data-testid={`button-reject-${app.id}`}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4">
          {reviewedApplications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No reviewed applications</p>
              </CardContent>
            </Card>
          ) : (
            reviewedApplications.map((app) => (
              <Card key={app.id} data-testid={`reviewed-application-card-${app.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={app.volunteer?.avatar} />
                        <AvatarFallback>{app.volunteer?.displayName?.[0] || "V"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{app.volunteer?.displayName || "Unknown Volunteer"}</CardTitle>
                        <p className="text-sm text-muted-foreground">{app.volunteer?.email}</p>
                      </div>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Briefcase className="w-4 h-4" />
                      <span>{app.opportunity?.title || "Unknown Opportunity"}</span>
                    </div>
                  </div>

                  {app.notes && (
                    <div>
                      <p className="text-sm font-medium mb-1">Review Notes:</p>
                      <p className="text-sm text-muted-foreground">{app.notes}</p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Reviewed {app.reviewedAt ? new Date(app.reviewedAt).toLocaleDateString() : "N/A"}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "accepted" ? "Accept" : "Reject"} Application
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "accepted"
                ? "This volunteer will be assigned to the project automatically."
                : "Please provide a reason for rejection (optional)."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedApplication && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-medium">{selectedApplication.volunteer?.displayName}</p>
                <p className="text-sm text-muted-foreground">{selectedApplication.opportunity?.title}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">
                Notes {reviewAction === "rejected" ? "(Optional)" : ""}
              </label>
              <Textarea
                placeholder={reviewAction === "accepted" ? "Add any notes about this volunteer..." : "Explain why this application is being rejected..."}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                data-testid="textarea-review-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={reviewMutation.isPending}
              className={reviewAction === "accepted" ? "" : "bg-red-600 hover:bg-red-700"}
              data-testid="button-confirm-review"
            >
              {reviewMutation.isPending ? "Processing..." : reviewAction === "accepted" ? "Accept & Assign" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={closeProfileDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Volunteer Profile</DialogTitle>
            <DialogDescription>
              Detailed information about the volunteer applicant
            </DialogDescription>
          </DialogHeader>

          {volunteerProfile ? (
            <div className="space-y-6">
              {/* Basic Info with Match Score */}
              <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={volunteerProfile.user?.avatar} />
                    <AvatarFallback className="bg-primary text-white text-xl">
                      {volunteerProfile.user?.displayName?.[0] || "V"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{volunteerProfile.user?.displayName || "Unknown"}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {volunteerProfile.user?.email}
                    </div>
                    {volunteerProfile.volunteerProfile?.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4" />
                        {volunteerProfile.volunteerProfile.location}
                      </div>
                    )}
                  </div>
                </div>
                {profileApplication?.matchScore && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-lg px-3 py-1">
                    <Target className="w-4 h-4 mr-1" />
                    {profileApplication.matchScore}% Match
                  </Badge>
                )}
              </div>

              {/* Skills */}
              {volunteerProfile.volunteerProfile?.skills && volunteerProfile.volunteerProfile.skills.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {volunteerProfile.volunteerProfile.skills.map((skill: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests */}
              {volunteerProfile.volunteerProfile?.interests && volunteerProfile.volunteerProfile.interests.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {volunteerProfile.volunteerProfile.interests.map((interest: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* SDG Goals */}
              {volunteerProfile.volunteerProfile?.sdgGoals && volunteerProfile.volunteerProfile.sdgGoals.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">UN SDG Commitments</h4>
                  <div className="flex flex-wrap gap-2">
                    {volunteerProfile.volunteerProfile.sdgGoals.map((sdg: number, index: number) => (
                      <Badge key={index} className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        SDG {sdg}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* About/Bio */}
              {volunteerProfile.volunteerProfile?.about && (
                <div>
                  <h4 className="font-medium mb-2">About</h4>
                  <p className="text-sm text-muted-foreground">
                    {volunteerProfile.volunteerProfile.about}
                  </p>
                </div>
              )}

              {/* Availability */}
              <div className="grid grid-cols-2 gap-4">
                {volunteerProfile.volunteerProfile?.weeklyAvailability !== undefined && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Weekly Availability
                    </h4>
                    <p className="text-2xl font-bold text-primary">
                      {volunteerProfile.volunteerProfile.weeklyAvailability} hrs/week
                    </p>
                  </div>
                )}
                {volunteerProfile.volunteerProfile?.workStyle && (
                  <div>
                    <h4 className="font-medium mb-2">Work Style</h4>
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {volunteerProfile.volunteerProfile.workStyle}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Languages */}
              {volunteerProfile.volunteerProfile?.languages && volunteerProfile.volunteerProfile.languages.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    {volunteerProfile.volunteerProfile.languages.map((lang: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Motivations */}
              {volunteerProfile.volunteerProfile?.motivations && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-medium mb-2">Why They Volunteer</h4>
                  <p className="text-sm italic text-muted-foreground">
                    "{volunteerProfile.volunteerProfile.motivations}"
                  </p>
                </div>
              )}

              {/* Project Assignment Section */}
              {orgProjects.length > 0 && (
                <div className="border-t pt-4">
                  <Label className="text-base font-semibold mb-3 block">Assign to Project</Label>
                  <div className="flex gap-2">
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className="flex-1" data-testid="select-assign-project">
                        <SelectValue placeholder="Select a project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {orgProjects.map((project: any) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => {
                        if (selectedProjectId && selectedVolunteerId) {
                          assignProjectMutation.mutate({
                            volunteerId: selectedVolunteerId,
                            projectId: parseInt(selectedProjectId)
                          });
                        }
                      }}
                      disabled={!selectedProjectId || assignProjectMutation.isPending}
                      data-testid="button-assign-project"
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      {assignProjectMutation.isPending ? "Assigning..." : "Assign"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    The volunteer will receive a notification to accept or reject this assignment
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeProfileDialog} data-testid="button-close-profile">
              Close
            </Button>
            {profileApplication && profileApplication.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    closeProfileDialog();
                    openReviewDialog(profileApplication, "rejected");
                  }}
                  className="bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400"
                  data-testid="button-reject-from-profile"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    closeProfileDialog();
                    openReviewDialog(profileApplication, "accepted");
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-approve-from-profile"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
