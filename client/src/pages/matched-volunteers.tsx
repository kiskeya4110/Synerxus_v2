import { useState } from "react";
import { Star, MapPin, Award, Clock, CheckCircle, Send, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface MatchedVolunteer {
  id: number;
  name: string;
  avatar?: string;
  location: string;
  skills: string[];
  rating: number;
  matchScore: number;
  availability: number;
  sdgAlignment: string[];
}

export default function MatchedVolunteers() {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const userId = localStorage.getItem('currentUserId');
  
  // Fetch organization's projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", userId],
    queryFn: async () => {
      const response = await fetch(`/api/projects?userId=${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId
  });

  // Fetch all volunteers
  const { data: volunteers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) return [];
      const users = await response.json();
      return users.filter((u: any) => u.userType === 'volunteer').slice(0, 10);
    }
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async ({ volunteerId, projectId }: { volunteerId: number; projectId: number }) => {
      return await apiRequest("POST", `/api/project-assignments/invite`, {
        volunteerId,
        projectId,
        hoursCommitted: 10
      });
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent!",
        description: "The volunteer will see this in their pending invitations."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Try again later",
        variant: "destructive"
      });
    }
  });

  if (!projects.length) {
    return (
      <Alert variant="default">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Projects Yet</AlertTitle>
        <AlertDescription>
          Create a project first before inviting volunteers.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Invite Volunteers</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Send invitations to volunteers to join your projects
        </p>
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {projects.map((project) => (
              <Button
                key={project.id}
                onClick={() => setSelectedProjectId(project.id.toString())}
                variant={selectedProjectId === project.id.toString() ? "default" : "outline"}
                className="justify-start text-left"
              >
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-xs text-gray-500">{project.description?.substring(0, 50)}...</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Matched Volunteers List */}
      <div className="space-y-4">
        <h3 className="font-semibold">Available Volunteers</h3>
        
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : volunteers.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No volunteers found</AlertTitle>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {volunteers.map((volunteer) => (
              <Card key={volunteer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar>
                        <AvatarImage src={volunteer.avatar} />
                        <AvatarFallback>
                          {volunteer.displayName?.[0] || 'V'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-semibold">{volunteer.displayName || 'Volunteer'}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            Location
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            4.5/5
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">Skills</Badge>
                          <Badge variant="outline" className="text-xs">Remote</Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        if (!selectedProjectId) {
                          toast({
                            title: "Select a project",
                            description: "Please choose a project first",
                            variant: "destructive"
                          });
                          return;
                        }
                        inviteMutation.mutate({
                          volunteerId: volunteer.id,
                          projectId: parseInt(selectedProjectId)
                        });
                      }}
                      disabled={!selectedProjectId || inviteMutation.isPending}
                      size="sm"
                    >
                      {inviteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Invite
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
