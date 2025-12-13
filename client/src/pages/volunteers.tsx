import { useState, useMemo } from "react";
import { Plus, Search, Filter, Mail, Phone, Award, Target, User, MapPin, CheckCircle2, Clock, Briefcase, Calendar, FolderKanban, Users, CheckSquare, TrendingUp, AlertCircle, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/dialog-factory";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ContactVolunteerModal from "@/components/dashboard/contact-volunteer-modal";
import { AddVolunteerModal } from "@/components/add-volunteer-modal";
import { VolunteerPerformanceModal } from "@/components/volunteer-performance-modal";
import OrganizationHeader from "@/components/layout/organization-header";
import MobileMetricsGrid from "@/components/layout/mobile-metrics-grid";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import OfflineBanner from "@/components/layout/offline-banner";
import Footer from "@/components/layout/footer";

export default function Volunteers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [skillFilter, setSkillFilter] = useState("all");
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAddVolunteerModal, setShowAddVolunteerModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<any>(null);
  const [performanceVolunteer, setPerformanceVolunteer] = useState<{ id: number; name: string } | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [deleteVolunteerDialogOpen, setDeleteVolunteerDialogOpen] = useState(false);
  const [volunteerToDelete, setVolunteerToDelete] = useState<{ id: number; name: string } | null>(null);
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

  // Fetch matching candidates from the algorithm for organizations
  const { data: matchingCandidates = [], isLoading: loadingMatches } = useQuery<any[]>({
    queryKey: ["/api/volunteers/matches", userId],
    queryFn: async () => {
      const response = await fetch(`/api/volunteers/matches?userId=${userId}&threshold=30`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId && isOrganization
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
    queryKey: ["/api/intake/volunteer-profile", selectedVolunteerId],
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      if (!selectedVolunteerId) return null;
      const response = await fetch(`/api/intake/volunteer-profile?userId=${selectedVolunteerId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!selectedVolunteerId && profileDialogOpen
  });

  // Assign volunteer to project mutation (uses invite endpoint for organizations)
  const assignProjectMutation = useMutation({
    mutationFn: async ({ volunteerId, projectId }: { volunteerId: number; projectId: number }) => {
      return await apiRequest("POST", `/api/project-assignments/invite`, {
        volunteerId,
        projectId,
        hoursCommitted: 10
      });
    },
    onSuccess: (_data, variables) => {
      toast({
        title: "Project Assigned",
        description: "Volunteer will receive a notification to accept or decline this assignment",
      });
      // Invalidate project assignments, volunteer profile, volunteers list (including org-scoped), and dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intake/volunteer-profile", variables.volunteerId] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (
            key.startsWith('/api/volunteers') ||
            key.startsWith('/api/organizations')
          );
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary", variables.volunteerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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

  // Helper to parse skills from database format ("Skill Name (75%)") to just skill name
  const parseSkillNames = (skills: any): string[] => {
    if (!skills) return [];
    if (skills === null || skills === undefined) return [];
    
    // Handle string
    if (typeof skills === 'string') {
      if (skills === '[object Object]' || skills.length === 0) return [];
      const match = skills.match(/^(.+?)\s*\((\d+)%\)$/);
      return [match ? match[1].trim() : skills].filter((s: string) => s && s.length > 0);
    }
    
    // Handle single object { name: "Healthcare", proficiency: 85 }
    if (typeof skills === 'object' && !Array.isArray(skills)) {
      const name = skills.name || skills.skill || skills.skillName || skills.title;
      if (name && typeof name === 'string' && name.trim().length > 0) {
        return [name.trim()];
      }
      return [];
    }
    
    // Handle array of skills
    if (!Array.isArray(skills)) return [];
    
    return skills
      .filter((skill: any) => skill !== null && skill !== undefined && skill !== '')
      .map((skill: any) => {
        // String format: "Healthcare (85%)" or "Healthcare"
        if (typeof skill === 'string') {
          if (skill === '[object Object]' || skill.length === 0) return null;
          const match = skill.match(/^(.+?)\s*\((\d+)%\)$/);
          const result = (match ? match[1] : skill).trim();
          return result.length > 0 ? result : null;
        }
        
        // Object format { name: "skill", ... }
        if (skill && typeof skill === 'object') {
          const name = skill.name || skill.skill || skill.skillName || skill.title;
          if (name && typeof name === 'string' && name.trim().length > 0) {
            return name.trim();
          }
        }
        
        return null;
      })
      .filter((s: any): s is string => s !== null && s !== '' && typeof s === 'string');
  };

  const volunteersWithStats = useMemo(() => {
    // For organizations, the stats are already included from the backend
    if (isOrganization) {
      return volunteers.map((volunteer: any) => ({
        ...volunteer,
        skills: parseSkillNames(volunteer.skills),
      }));
    }
    
    // For admin/other users, calculate stats from activities
    return volunteers.map((volunteer: any) => {
      const activities = volunteerActivities.filter((a: any) => a.userId === volunteer.id);
      const totalHours = activities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
      
      return {
        ...volunteer,
        hours: totalHours,
        tasksCompleted: activities.length,
        skills: parseSkillNames(volunteer.skills),
      };
    });
  }, [volunteers, volunteerActivities, isOrganization]);

  const filteredVolunteers = useMemo(() => volunteersWithStats.filter((volunteer: any) => {
    const matchesSearch = volunteer.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         volunteer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkill = skillFilter === "all" || (volunteer.skills && volunteer.skills.includes(skillFilter));
    return matchesSearch && matchesSkill;
  }), [volunteersWithStats, searchTerm, skillFilter]);

  const allSkills = useMemo(() =>
    Array.from(new Set(volunteersWithStats.flatMap((v: any) => v.skills || []))),
    [volunteersWithStats]
  );

  // Memoize selected volunteer to avoid repeated .find() calls
  const selectedVolunteerData = useMemo(() => {
    if (!selectedVolunteerId) return null;
    return volunteersWithStats.find((v: any) => v.id === selectedVolunteerId) || null;
  }, [selectedVolunteerId, volunteersWithStats]);

  return (
    <>
      {isOrganization && <OfflineBanner />}
      {isOrganization && <OrganizationHeader activeTab="volunteers" />}
      <div className={isOrganization ? "h-screen overflow-y-auto pb-24 max-w-[1400px] mx-auto p-6" : "h-screen overflow-y-auto pb-24"}>
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Volunteers</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Manage volunteer profiles and track their contributions
        </p>
      </div>

      {/* Stats Cards - 3 Column Layout Mobile */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4 mb-6">
        {/* Total Volunteers */}
        <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
          <CardContent className="p-3 md:p-6 pt-3 md:pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-2 md:p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 mb-2 md:mb-4">
                <Users className="h-4 md:h-6 w-4 md:w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xl md:text-3xl font-bold text-primary">{isLoading ? "..." : volunteersWithStats.length}</p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1 md:mt-2">Volunteers</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Hours */}
        <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
          <CardContent className="p-3 md:p-6 pt-3 md:pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-2 md:p-3 rounded-lg bg-green-50 dark:bg-green-900/30 mb-2 md:mb-4">
                <Clock className="h-4 md:h-6 w-4 md:w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xl md:text-3xl font-bold text-primary">{isLoading ? "..." : volunteersWithStats.reduce((sum: number, v: any) => sum + (v.hours || 0), 0)}</p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1 md:mt-2">Hours</p>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Completed */}
        <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
          <CardContent className="p-3 md:p-6 pt-3 md:pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-2 md:p-3 rounded-lg bg-orange-50 dark:bg-orange-900/30 mb-2 md:mb-4">
                <CheckSquare className="h-4 md:h-6 w-4 md:w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-xl md:text-3xl font-bold text-primary">{isLoading ? "..." : volunteersWithStats.reduce((sum: number, v: any) => sum + (v.tasksCompleted || 0), 0)}</p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1 md:mt-2">Tasks</p>
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

        <Button
          className="min-h-[44px]"
          onClick={() => setShowAddVolunteerModal(true)}
          data-testid="button-add-volunteer"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Volunteer
        </Button>
      </div>

      {/* Volunteers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredVolunteers.map((volunteer: any) => (
          <Card key={volunteer.id} className="hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group">
            {/* Gradient Background Overlay */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 group-hover:h-2 transition-all duration-300" />
            
            <CardHeader className="pb-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              {isOrganization && volunteer.projectCount > 0 && (
                <div className="absolute top-3 right-3">
                  <Badge className="gap-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg">
                    <Briefcase className="h-3 w-3" />
                    {volunteer.projectCount} Project{volunteer.projectCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-14 w-14 ring-2 ring-purple-200 dark:ring-purple-700 shadow-md">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                    {volunteer.displayName?.split(' ').map((n: string) => n[0]).join('') || volunteer.email?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate text-slate-900 dark:text-white">{volunteer.displayName || 'Unnamed Volunteer'}</CardTitle>
                  <CardDescription className="text-xs truncate text-slate-600 dark:text-slate-400">{volunteer.email || 'No email'}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {volunteer.skills && volunteer.skills.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {volunteer.skills.map((skill: string, idx: number) => {
                        return String(skill).trim() ? (
                          <Badge key={`${volunteer.id}-skill-${idx}`} className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 text-slate-700 dark:text-slate-200 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow">
                            {String(skill).trim()}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-4 pb-4 border-t border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg px-3 py-3">
                  <div className="text-center">
                    <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">{volunteer.hours || 0}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Hours</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">{volunteer.tasksCompleted || 0}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Tasks</p>
                  </div>
                </div>

                {/* Work Entry & Status Insights */}
                <div className="space-y-2.5 pt-2">
                  {/* Completion Rate */}
                  {volunteer.projectCount > 0 && (
                    <div className="flex items-center justify-between text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Completion</span>
                      </div>
                      <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-semibold">
                        {volunteer.projectCount > 0 ? Math.min(100, Math.round((volunteer.tasksCompleted / Math.max(1, volunteer.projectCount)) * 100)) : 0}%
                      </Badge>
                    </div>
                  )}

                  {/* Active Status */}
                  <div className="flex items-center justify-between text-sm bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full shadow-md ${volunteer.hours > 0 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`} />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Status</span>
                    </div>
                    <Badge 
                      className={`text-xs font-semibold ${volunteer.hours > 0 
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white" 
                        : "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
                      }`}
                    >
                      {volunteer.hours > 0 ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Engagement Level */}
                  {volunteer.hours > 0 && (
                    <div className="flex items-center justify-between text-sm bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Engagement</span>
                      </div>
                      <Badge className={`text-xs font-semibold ${
                        volunteer.hours >= 50 
                          ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                          : volunteer.hours >= 20
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                          : "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
                      }`}>
                        {volunteer.hours >= 50 ? 'High' : volunteer.hours >= 20 ? 'Medium' : 'Low'}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 min-h-[40px] bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300"
                    onClick={() => openProfileDialog(volunteer.id)}
                    data-testid={`button-view-profile-${volunteer.id}`}
                  >
                    <User className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 min-h-[40px] bg-gradient-to-r from-slate-300 to-slate-400 hover:from-slate-400 hover:to-slate-500 dark:from-slate-600 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800 text-slate-900 dark:text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300"
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

                {/* Second row of action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 min-h-[40px] border-2 border-green-500 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950/20 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                    onClick={() => {
                      const volId = volunteer.id || volunteer.userId;

                      if (!volId) {
                        toast({
                          title: "Error",
                          description: "Volunteer ID is missing. Cannot load performance data.",
                          variant: "destructive",
                        });
                        return;
                      }

                      setPerformanceVolunteer({
                        id: volId,
                        name: volunteer.displayName || volunteer.email || 'Volunteer'
                      });
                      setShowPerformanceModal(true);
                    }}
                    data-testid={`button-performance-${volunteer.id || volunteer.userId}`}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Performance
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 min-h-[40px] border-2 border-red-500 text-red-700 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-950/20 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                    onClick={() => {
                      setVolunteerToDelete({
                        id: volunteer.id,
                        name: volunteer.displayName || 'this volunteer'
                      });
                      setDeleteVolunteerDialogOpen(true);
                    }}
                    data-testid={`button-remove-${volunteer.id}`}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Remove
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

      {/* Matching Candidates Section - Only for Organizations */}
      {isOrganization && (
        <div className="mt-8">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-500" />
              Potential Matches
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Volunteers matched to your organization's needs based on skills and SDG alignment
            </p>
          </div>

          {loadingMatches ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : matchingCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {matchingCandidates.map((match: any) => (
                <Card key={match.volunteerId || match.id} className="hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group border-2 border-amber-200 dark:border-amber-700">
                  {/* Match Score Indicator */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 group-hover:h-2 transition-all duration-300" />

                  <CardHeader className="pb-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                    <div className="absolute top-3 right-3">
                      <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                        <Target className="h-3 w-3" />
                        {match.matchScore || match.score || 0}% Match
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-14 w-14 ring-2 ring-amber-200 dark:ring-amber-700 shadow-md">
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold">
                          {(match.volunteerName || match.name || match.email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate text-slate-900 dark:text-white">
                          {match.volunteerName || match.name || 'Unknown Volunteer'}
                        </CardTitle>
                        <CardDescription className="text-xs truncate text-slate-600 dark:text-slate-400">
                          {match.email || 'No email'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {/* Matching Skills */}
                      {match.matchingSkills && match.matchingSkills.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Matching Skills
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {match.matchingSkills.slice(0, 4).map((skill: string, idx: number) => (
                              <Badge key={idx} className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                                {skill}
                              </Badge>
                            ))}
                            {match.matchingSkills.length > 4 && (
                              <Badge variant="outline" className="text-xs">+{match.matchingSkills.length - 4}</Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* All Skills */}
                      {match.skills && match.skills.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">All Skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {match.skills.slice(0, 5).map((skill: string, idx: number) => (
                              <Badge key={idx} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {typeof skill === 'string' ? skill : (skill as any).name || skill}
                              </Badge>
                            ))}
                            {match.skills.length > 5 && (
                              <Badge variant="outline" className="text-xs">+{match.skills.length - 5}</Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SDG Alignment */}
                      {match.matchingSdgs && match.matchingSdgs.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            SDG Alignment
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {match.matchingSdgs.slice(0, 5).map((sdg: number) => (
                              <div
                                key={sdg}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: `hsl(${(sdg * 20) % 360}, 70%, 50%)` }}
                                title={`SDG ${sdg}`}
                              >
                                {sdg}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Match Reason */}
                      {match.matchReason && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                          <span className="font-medium">Why matched:</span> {match.matchReason}
                        </div>
                      )}

                      {/* Opportunity Match */}
                      {match.opportunityTitle && (
                        <div className="text-xs bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                          <span className="font-medium text-amber-700 dark:text-amber-400">Best fit for:</span>
                          <span className="ml-1 text-slate-700 dark:text-slate-300">{match.opportunityTitle}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3">
                        <Button
                          size="sm"
                          className="flex-1 min-h-[40px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300"
                          onClick={() => {
                            if (match.volunteerId) {
                              openProfileDialog(match.volunteerId);
                            }
                          }}
                          data-testid={`button-view-match-${match.volunteerId || match.id}`}
                        >
                          <User className="h-4 w-4 mr-2" />
                          View Profile
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 min-h-[40px] border-2 border-green-500 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950/20 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                          onClick={() => {
                            if (match.volunteerId && orgProjects.length > 0) {
                              assignProjectMutation.mutate({
                                volunteerId: match.volunteerId,
                                projectId: orgProjects[0].id
                              });
                            } else {
                              toast({
                                title: "No Projects",
                                description: "Create a project first to invite volunteers",
                                variant: "destructive"
                              });
                            }
                          }}
                          data-testid={`button-invite-match-${match.volunteerId || match.id}`}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Invite
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center border-2 border-dashed border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10">
              <Zap className="h-12 w-12 mx-auto mb-3 text-amber-400" />
              <h3 className="font-semibold text-lg mb-2">No Matching Candidates Yet</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Post volunteer opportunities to attract matching candidates based on skills and SDG alignment.
              </p>
              <Link href="/post-core-opportunity">
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Post an Opportunity
                </Button>
              </Link>
            </Card>
          )}
        </div>
      )}

      {/* Contact Volunteer Modal */}
      {currentUser && isOrganization && (
        <ContactVolunteerModal
          open={showContactModal}
          onOpenChange={(open) => {
            setShowContactModal(open);
            if (!open) setSelectedVolunteer(null);
          }}
          organizationUserId={currentUser.id}
          preSelectedVolunteer={selectedVolunteer}
        />
      )}

      {/* Add Volunteer Modal */}
      <AddVolunteerModal
        isOpen={showAddVolunteerModal}
        onClose={() => setShowAddVolunteerModal(false)}
        organizationId={currentUser?.id}
      />

      {/* Performance Analytics Modal */}
      {performanceVolunteer && (
        <VolunteerPerformanceModal
          isOpen={showPerformanceModal}
          onClose={() => {
            setShowPerformanceModal(false);
            setPerformanceVolunteer(null);
          }}
          volunteerId={performanceVolunteer.id}
          volunteerName={performanceVolunteer.name}
        />
      )}

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={closeProfileDialog}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden p-0 w-[95vw] md:w-full flex flex-col">
          {volunteerProfile ? (
            <div className="space-y-0 overflow-y-auto flex-1 flex flex-col">
              {/* Header Section with Gradient Background */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white px-8 py-8 rounded-t-lg">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-16 w-16 border-4 border-white/20">
                      <AvatarImage src={volunteerProfile.user?.avatar} />
                      <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                        {volunteerProfile.user?.displayName?.[0] || "V"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-1">{volunteerProfile.user?.displayName || "Unknown"}</h2>
                      <p className="text-white/90 text-sm mb-3">{volunteerProfile.volunteerProfile?.bio || "Volunteer"}</p>
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span className="font-semibold">{selectedVolunteerData?.hours || 0} Hours</span>
                        </div>
                        {selectedVolunteerData?.tasksCompleted !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <Award className="w-4 h-4" />
                            <span>{selectedVolunteerData.tasksCompleted} Tasks Completed</span>
                          </div>
                        )}
                        {volunteerProfile.volunteerProfile?.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            <span>{volunteerProfile.volunteerProfile.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge className="bg-green-500 hover:bg-green-500 text-white text-sm px-4 py-2 mb-2">
                      Available
                    </Badge>
                    {volunteerProfile.volunteerProfile?.weeklyAvailability && (
                      <p className="text-xs text-white/80 mt-1">
                        {volunteerProfile.volunteerProfile.weeklyAvailability} hrs/week capacity
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    onClick={() => {
                      closeProfileDialog();
                      if (selectedVolunteerData) {
                        setSelectedVolunteer(selectedVolunteerData);
                        setShowContactModal(true);
                      }
                    }}
                    data-testid="button-contact-from-profile"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Message Volunteer
                  </Button>
                  {isOrganization && selectedVolunteerData?.projects && 
                   selectedVolunteerData.projects.length > 0 && (
                    <Button
                      variant="secondary"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      onClick={() => {
                        if (selectedVolunteerData.projects?.[0]?.id) {
                          window.location.href = `/projects/${selectedVolunteerData.projects[0].id}`;
                        }
                      }}
                    >
                      <Target className="w-4 h-4 mr-2" />
                      View Projects
                    </Button>
                  )}
                </div>
              </div>

              {/* Content Section */}
              <div className="px-8 py-6 space-y-6 bg-white dark:bg-gray-950">
                {/* Skills Section with Percentages */}
                {volunteerProfile.volunteerProfile?.skills && volunteerProfile.volunteerProfile.skills.length > 0 && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
                    <h4 className="font-semibold text-lg mb-4 text-indigo-900 dark:text-indigo-100">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {volunteerProfile.volunteerProfile.skills.map((skill: string, index: number) => {
                        // Generate a pseudo-random percentage based on skill name for demonstration
                        const skillHash = skill.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        const percentage = 70 + (skillHash % 26); // Range 70-95%
                        return (
                          <Badge 
                            key={index} 
                            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-100 px-3 py-1.5 text-sm font-medium border border-indigo-300 dark:border-indigo-700"
                          >
                            {skill} ({percentage}%)
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Activity Section */}
                {(selectedVolunteerData?.projectCount || selectedVolunteerData?.tasksCompleted) && (
                  <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold text-lg mb-4 text-purple-900 dark:text-purple-100">Recent Activity</h4>
                    <div className="space-y-3">
                      {selectedVolunteerData.projectCount > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300">Current Projects:</span>
                          <Badge className="bg-purple-600 hover:bg-purple-600 text-white px-3 py-1">
                            {selectedVolunteerData.projectCount} active
                          </Badge>
                        </div>
                      )}
                      {selectedVolunteerData.tasksCompleted !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300">Tasks Completed:</span>
                          <Badge className="bg-green-600 hover:bg-green-600 text-white px-3 py-1">
                            {selectedVolunteerData.tasksCompleted}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Two Column Layout for other sections */}
                <div className="grid md:grid-cols-2 gap-6">

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
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
      
      {/* Mobile Metrics Grid - Organization Only */}
      {isOrganization && <MobileMetricsGrid activeProjects={0} totalHours={0} sdgsAddressed={0} aiuEarned={0} />}
      
      {/* Mobile Bottom Navigation - Organization Only */}
      {isOrganization && <MobileBottomNav />}
      
      {/* Footer */}
      <Footer />

      {/* Delete Volunteer Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteVolunteerDialogOpen}
        onClose={() => {
          setDeleteVolunteerDialogOpen(false);
          setVolunteerToDelete(null);
        }}
        itemName={volunteerToDelete?.name}
        itemType="volunteer"
        onConfirm={() => {
          toast({
            title: "Volunteer Removed",
            description: `${volunteerToDelete?.name || 'Volunteer'} has been removed from the organization`,
          });
          // In a real implementation, this would call an API to remove the volunteer
          // queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
        }}
      />
    </>
  );
}
