import { useState } from "react";
import { Link } from "wouter";
import { Check, X, Building2, Calendar, Clock, AlertCircle, Users, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export default function Assignments() {
  const { toast } = useToast();

  // Get current user from server session (no localStorage dependency)
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      // Try with userId from localStorage first, then fall back to session-only
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) return null;
      return response.json();
    },
    retry: false
  });

  // Fetch volunteer's enriched project assignments with team members and activities
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/project-assignments/details", currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/project-assignments/details?volunteerId=${currentUser?.id}`, {
        credentials: "include"
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser?.id
  });

  // Fetch projects to get details
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/projects?userId=${currentUser.id}`, {
        credentials: "include"
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser?.id
  });

  // Fetch organizations to get details
  const { data: organizations = [] } = useQuery<any[]>({
    queryKey: ["/api/organizations"],
  });

  // Respond to assignment mutation (accept or decline)
  const respondMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: number; status: "active" | "declined" }) => {
      return await apiRequest("PATCH", `/api/project-assignments/${assignmentId}`, {
        status,
        respondedAt: new Date().toISOString()
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.status === "active" ? "Assignment Accepted" : "Assignment Declined",
        description: variables.status === "active" 
          ? "You've been added to the project team!"
          : "The assignment has been declined",
      });
      // Invalidate assignments and related queries
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (
            key.startsWith('/api/dashboard') ||
            key.startsWith('/api/projects')
          );
        }
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to respond to assignment",
        variant: "destructive",
      });
    }
  });

  // Filter pending assignments
  const pendingAssignments = assignments.filter((a: any) => a.status === "pending");
  const activeAssignments = assignments.filter((a: any) => a.status === "active");
  const declinedAssignments = assignments.filter((a: any) => a.status === "declined");

  // Enrich assignments with project and organization details
  const enrichedPendingAssignments = pendingAssignments.map((assignment: any) => {
    const project = projects.find((p: any) => p.id === assignment.projectId);
    const organization = project ? organizations.find((o: any) => o.id === project.organizationId) : null;
    return { ...assignment, project, organization };
  });

  const enrichedActiveAssignments = activeAssignments.map((assignment: any) => {
    const project = projects.find((p: any) => p.id === assignment.projectId);
    const organization = project ? organizations.find((o: any) => o.id === project.organizationId) : null;
    return { ...assignment, project, organization };
  });

  const isLoading = userLoading || assignmentsLoading;

  // Handle unauthenticated users - only check after query completes
  if (!userLoading && !currentUser) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please log in to view your project assignments.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Assignments</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your project assignments and invitations
        </p>
      </div>

      {/* Pending Invitations */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Pending Invitations ({pendingAssignments.length})
        </h2>

        {pendingAssignments.length === 0 ? (
          <Alert>
            <AlertTitle>No pending invitations</AlertTitle>
            <AlertDescription>
              You don't have any pending project assignments at the moment.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {enrichedPendingAssignments.map((assignment: any) => (
              <Card key={assignment.id} className="border-amber-200 dark:border-amber-900">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg cursor-pointer hover:text-primary transition-colors">
                        <Link href={`/projects/${assignment.projectId}`} className="hover:underline" data-testid={`link-project-${assignment.projectId}`}>
                          {assignment.project?.name || "Unknown Project"}
                        </Link>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Building2 className="w-3 h-3" />
                        {assignment.organization?.name || "Unknown Organization"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assignment.project?.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {assignment.project.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {assignment.role && (
                      <Badge variant="secondary">
                        {assignment.role}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Invited {new Date(assignment.assignedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => respondMutation.mutate({ assignmentId: assignment.id, status: "active" })}
                      disabled={respondMutation.isPending}
                      data-testid={`button-accept-assignment-${assignment.id}`}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => respondMutation.mutate({ assignmentId: assignment.id, status: "declined" })}
                      disabled={respondMutation.isPending}
                      data-testid={`button-decline-assignment-${assignment.id}`}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Active Assignments */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-500" />
          Active Assignments ({activeAssignments.length})
        </h2>

        {activeAssignments.length === 0 ? (
          <Alert>
            <AlertTitle>No active assignments</AlertTitle>
            <AlertDescription>
              You don't have any active project assignments yet. Accept an invitation above to get started!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrichedActiveAssignments.map((assignment: any) => (
              <Card key={assignment.id} className="border-green-200 dark:border-green-900" data-testid={`card-active-assignment-${assignment.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base cursor-pointer hover:text-primary transition-colors">
                        <Link href={`/projects/${assignment.projectId}`} className="hover:underline" data-testid={`link-project-${assignment.projectId}`}>
                          {assignment.project?.name || "Unknown Project"}
                        </Link>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                        <Building2 className="w-3 h-3" />
                        {assignment.organization?.name || "Unknown Organization"}
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assignment.role && (
                    <Badge variant="secondary" className="text-xs">
                      {assignment.role}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Joined {assignment.respondedAt ? new Date(assignment.respondedAt).toLocaleDateString() : "recently"}
                  </div>
                  {assignment.hoursCommitted && (
                    <p className="text-xs text-muted-foreground">
                      Committed: {assignment.hoursCommitted} hrs
                    </p>
                  )}

                  {/* Team Members */}
                  {assignment.teamMembers && assignment.teamMembers.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1 mb-1">
                        <Users className="w-3 h-3 text-primary" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Team Members ({assignment.teamMembers.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {assignment.teamMembers.slice(0, 3).map((member: any) => (
                          <Badge key={member.id} variant="outline" className="text-xs">
                            {member.displayName || member.username}
                          </Badge>
                        ))}
                        {assignment.teamMembers.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{assignment.teamMembers.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Activities */}
                  {assignment.activities && assignment.activities.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1 mb-1">
                        <Activity className="w-3 h-3 text-green-600" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Recent Activities ({assignment.activities.length})</span>
                      </div>
                      <div className="space-y-1">
                        {assignment.activities.slice(0, 2).map((activity: any) => (
                          <div key={activity.id} className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-1.5 rounded">
                            <div className="font-medium truncate">{activity.description}</div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-500">
                              <span>{activity.hours} hrs</span>
                              <span>•</span>
                              <span>{new Date(activity.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
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
