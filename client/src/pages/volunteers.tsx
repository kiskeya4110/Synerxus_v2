import { useState, useMemo } from "react";
import { Plus, Search, Filter, Mail, Phone, Award, Target, User, MapPin, CheckCircle2, Clock, Briefcase, Calendar, FolderKanban } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ContactVolunteerModal from "@/components/dashboard/contact-volunteer-modal";

export default function Volunteers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [skillFilter, setSkillFilter] = useState("all");
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<any>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const { toast } = useToast();

  // Get current user to check if organization
  const userId = localStorage.getItem('currentUserId');
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const response = await fetch(`/api/users/me?userId=${id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId
  });

  // For organizations, show accepted volunteers. For admin/other users, show all volunteers
  const isOrganization = currentUser?.userType === 'organization';
  
  const { data: volunteers = [], isLoading } = useQuery<any[]>({ 
    queryKey: isOrganization ? ["/api/organizations", userId, "volunteers"] : ["/api/users"],
    queryFn: async () => {
      if (isOrganization && userId) {
        const response = await fetch(`/api/organizations/${userId}/volunteers`, {
          headers: {
            'x-user-id': userId
          }
        });
        if (!response.ok) return [];
        return response.json();
      } else {
        const response = await fetch('/api/users');
        if (!response.ok) return [];
        const allUsers = await response.json();
        return allUsers.filter((user: any) => user.userType === 'volunteer');
      }
    },
    enabled: !!currentUser
  });

  const { data: volunteerActivities = [] } = useQuery<any[]>({ 
    queryKey: ["/api/volunteer-activities"] 
  });

  // Fetch organization's projects for assignment
  const { data: orgProjects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", userId],
    queryFn: async () => {
      const response = await fetch(`/api/projects?userId=${userId}`, {
        credentials: "include"
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId && isOrganization
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
      // Invalidate project assignments, volunteer profile, and volunteers list
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/volunteer", variables.volunteerId] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/volunteers');
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

  const openProfileDialog = (volunteerId: number) => {
    setSelectedVolunteerId(volunteerId);
    setProfileDialogOpen(true);
  };

  const closeProfileDialog = () => {
    setProfileDialogOpen(false);
    setSelectedVolunteerId(null);
    setSelectedProjectId("");
  };

  const volunteersWithStats = useMemo(() => {
    // For organizations, the stats are already included from the backend
    if (isOrganization) {
      return volunteers;
    }
    
    // For admin/other users, calculate stats from activities
    return volunteers.map((volunteer: any) => {
      const activities = volunteerActivities.filter((a: any) => a.userId === volunteer.id);
      const totalHours = activities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
      
      return {
        ...volunteer,
        hours: totalHours,
        tasksCompleted: activities.length,
        skills: volunteer.skills || [],
      };
    });
  }, [volunteers, volunteerActivities, isOrganization]);

  const filteredVolunteers = volunteersWithStats.filter((volunteer: any) => {
    const matchesSearch = volunteer.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         volunteer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkill = skillFilter === "all" || (volunteer.skills && volunteer.skills.includes(skillFilter));
    return matchesSearch && matchesSkill;
  });

  const allSkills = Array.from(new Set(volunteersWithStats.flatMap((v: any) => v.skills || [])));

  // Memoize selected volunteer to avoid repeated .find() calls
  const selectedVolunteerData = useMemo(() => {
    if (!selectedVolunteerId) return null;
    return volunteersWithStats.find((v: any) => v.id === selectedVolunteerId) || null;
  }, [selectedVolunteerId, volunteersWithStats]);

  return (
    <>
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Volunteers</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Manage volunteer profiles and track their contributions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{isLoading ? "..." : volunteersWithStats.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Volunteers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{isLoading ? "..." : volunteersWithStats.reduce((sum: number, v: any) => sum + (v.hours || 0), 0)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Hours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{isLoading ? "..." : volunteersWithStats.reduce((sum: number, v: any) => sum + (v.tasksCompleted || 0), 0)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tasks Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search volunteers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 min-h-[44px]"
            data-testid="input-search-volunteers"
          />
        </div>
        
        <Select value={skillFilter} onValueChange={setSkillFilter}>
          <SelectTrigger className="w-full sm:w-[200px] min-h-[44px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by skill" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skills</SelectItem>
            {allSkills.map(skill => (
              <SelectItem key={skill} value={skill}>{skill}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button className="min-h-[44px]" data-testid="button-add-volunteer">
          <Plus className="h-5 w-5 mr-2" />
          Add Volunteer
        </Button>
      </div>

      {/* Volunteers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredVolunteers.map((volunteer: any) => (
          <Card key={volunteer.id} className="hover:shadow-lg transition-shadow relative">
            <CardHeader className="pb-3">
              {isOrganization && volunteer.projectCount > 0 && (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="gap-1">
                    <Briefcase className="h-3 w-3" />
                    {volunteer.projectCount} Project{volunteer.projectCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-white">
                    {volunteer.displayName?.split(' ').map((n: string) => n[0]).join('') || volunteer.email?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{volunteer.displayName || 'Unnamed Volunteer'}</CardTitle>
                  <CardDescription className="text-xs truncate">{volunteer.email || 'No email'}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {volunteer.skills && volunteer.skills.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {volunteer.skills.map((skill: string) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{volunteer.hours || 0}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Hours</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{volunteer.tasksCompleted || 0}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Tasks</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 min-h-[44px]"
                    onClick={() => openProfileDialog(volunteer.id)}
                    data-testid={`button-view-profile-${volunteer.id}`}
                  >
                    <User className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 min-h-[44px]"
                    onClick={() => {
                      setSelectedVolunteer(volunteer);
                      setShowContactModal(true);
                    }}
                    data-testid={`button-contact-${volunteer.id}`}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVolunteers.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No volunteers found</p>
        </Card>
      )}

      {/* Contact Volunteer Modal */}
      {currentUser && isOrganization && (
        <ContactVolunteerModal
          open={showContactModal}
          onOpenChange={setShowContactModal}
          organizationUserId={currentUser.id}
        />
      )}

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={closeProfileDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Volunteer Profile</DialogTitle>
            <DialogDescription>
              Detailed information and qualifications
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
                {isOrganization && selectedVolunteerData?.projectCount && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-lg px-3 py-1">
                    <Briefcase className="w-4 h-4 mr-1" />
                    {selectedVolunteerData.projectCount} Active Project{selectedVolunteerData.projectCount !== 1 ? 's' : ''}
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

              {/* SDG Commitments */}
              {volunteerProfile.volunteerProfile?.preferredSdgs && volunteerProfile.volunteerProfile.preferredSdgs.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">UN SDG Commitments</h4>
                  <div className="flex flex-wrap gap-2">
                    {volunteerProfile.volunteerProfile.preferredSdgs.map((sdg: number, index: number) => (
                      <Badge key={index} className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        SDG {sdg}
                      </Badge>
                    ))}
                  </div>
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

              {/* Assigned Projects Section */}
              {isOrganization && selectedVolunteerData?.projects && 
               selectedVolunteerData.projects.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Assigned Projects ({selectedVolunteerData.projects.length})
                  </h4>
                  <div className="grid gap-3">
                    {selectedVolunteerData.projects.map((project: any) => (
                      <Card key={project.id} className="bg-gray-50 dark:bg-gray-800">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <FolderKanban className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{project.name}</p>
                                <p className="text-xs text-muted-foreground">Active assignment</p>
                              </div>
                            </div>
                            <Link href={`/projects/${project.id}`}>
                              <Button variant="ghost" size="sm">
                                View Project
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Project Assignment Section */}
              {isOrganization && orgProjects.length > 0 && (
                <div className="border-t pt-4">
                  <Label className="text-base font-semibold mb-3 block">Assign to Project</Label>
                  <div className="flex gap-2">
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className="flex-1" data-testid="select-assign-project-volunteers">
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
                      data-testid="button-assign-project-volunteers"
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
            <Button variant="outline" onClick={closeProfileDialog} data-testid="button-close-volunteer-profile">
              Close
            </Button>
            {isOrganization && volunteerProfile && (
              <Button
                onClick={() => {
                  closeProfileDialog();
                  if (selectedVolunteerData) {
                    setSelectedVolunteer(selectedVolunteerData);
                    setShowContactModal(true);
                  }
                }}
                className="bg-primary hover:bg-primary/90"
                data-testid="button-contact-from-profile"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Volunteer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
