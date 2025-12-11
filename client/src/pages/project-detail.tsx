import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Calendar, Edit, MapPin, Target, Users, TrendingUp, CheckCircle2, Clock, Share2, AlertCircle, Plus, Trash2, Briefcase, Award, Heart, Globe, Zap, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { CompletionProgress } from "@/components/ui/completion-progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/dialog-factory";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import OrganizationHeader from "@/components/layout/organization-header";
import Footer from "@/components/layout/footer";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";

const SDG_COLORS: { [key: number]: string } = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D",
  5: "#FF3A21", 6: "#26BDE2", 7: "#FCC30B", 8: "#A21942",
  9: "#FD6925", 10: "#DD1367", 11: "#FD9D24", 12: "#BF8B2E",
  13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B", 16: "#00689D",
  17: "#19486A"
};

const SDG_NAMES: { [key: number]: string } = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Clean Energy", 8: "Decent Work",
  9: "Industry Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace and Justice", 17: "Partnerships"
};

interface Project {
  id: number;
  name: string;
  description?: string;
  organizationId?: number;
  status: string;
  completionPercentage?: number;
  location?: string;
  startDate?: string;
  endDate?: string;
  sdgGoals?: number[];
  primarySdg?: number;
  requiredSkills?: string[];
  optionalSkills?: string[];
  ongoingHoursPerWeek?: number;
  projectTotalHours?: number;
  totalHoursLogged?: number;
  livesImpacted?: number; // Volunteer-entered value (feeds into AIU calculation)
  aiuEarned?: number; // Calculated AIU value
  aiTrackingEnabled?: boolean;
  engagementType?: string;
  commitmentType?: string;
  experienceLevel?: string;
  goals?: any;
  [key: string]: any;
}

interface Task {
  id: number;
  projectId: number;
  status: string;
  title?: string;
  description?: string;
  estimatedHours?: number;
  dueDate?: string;
  [key: string]: any;
}

interface VolunteerActivity {
  id: number;
  projectId: number;
  userId: number;
  hours: number;
  [key: string]: any;
}

interface ProjectImpact {
  id: number;
  projectId: number;
  value: number;
  [key: string]: any;
}

interface DBUser {
  id: number;
  userType?: string;
  organizationId?: number;
  displayName?: string;
  avatar?: string;
  [key: string]: any;
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, navigate] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : null;
  const userId = localStorage.getItem('currentUserId');
  
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/projects");
    }
  };

  const { data: currentUser } = useQuery<DBUser>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!userId
  });

  const { data: project, isLoading: loadingProject } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project");
      return response.json();
    },
    enabled: !!projectId,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: volunteerActivities = [] } = useQuery<VolunteerActivity[]>({
    queryKey: ["/api/volunteer-activities"],
  });

  const { data: projectImpacts = [] } = useQuery<ProjectImpact[]>({
    queryKey: ["/api/project-impacts"],
  });

  const { data: users = [] } = useQuery<DBUser[]>({
    queryKey: ["/api/users"],
  });

  // Fetch project AIU data for accurate metrics
  interface ProjectAIUSummary {
    projectId: number;
    projectName: string;
    totalAiu: number;
    totalAiuUnique: number;
    totalAiuSessions: number;
    sdgIndicator: string;
    livesImpacted: number;
    totalHours: number;
    verificationStatus: string;
    volunteers: Array<{
      volunteerId: number;
      volunteerName: string;
      hours: number;
      aiu: number;
      role: string;
    }>;
  }

  const { data: projectAIU } = useQuery<ProjectAIUSummary>({
    queryKey: ["/api/aiu/project", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/aiu/project/${projectId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!projectId,
  });

  // Fetch project assignments for accurate team members list
  interface ProjectAssignment {
    id: number;
    projectId: number;
    volunteerId: number;
    role: string;
    status: string;
    hoursLogged?: number;
  }

  const { data: projectAssignments = [] } = useQuery<ProjectAssignment[]>({
    queryKey: ["/api/project-assignments", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/project-assignments?projectId=${projectId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!projectId,
  });

  const { toast } = useToast();

  // Delete task dialog state - moved to top for React Hooks rules
  const [deleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  const updateLivesImpactedMutation = useMutation({
    mutationFn: async (livesImpacted: number) => {
      return apiRequest("PATCH", `/api/projects/${projectId}`, { livesImpacted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Lives impacted updated", description: "The impact metric has been saved and will contribute to AIU calculations." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lives impacted", variant: "destructive" });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest("DELETE", `/api/tasks/${taskId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted", description: "The task has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    }
  });

  if (!projectId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Invalid project ID</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingProject) {
    return (
      <div className="w-full min-h-screen bg-[#faf9f7]">
        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="px-4 py-3 flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Project not found</p>
            <Link href="/projects">
              <Button variant="outline" className="mt-4" data-testid="button-back-projects">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const projectActivities = volunteerActivities.filter((a) => a.projectId === projectId);
  const projectImpact = projectImpacts.filter((i) => i.projectId === projectId);

  const completedTasks = projectTasks.filter((t) => t.status?.toLowerCase() === "completed").length;
  const inProgressTasks = projectTasks.filter((t) => t.status?.toLowerCase() === "in progress").length;
  const pendingTasks = projectTasks.filter((t) => t.status?.toLowerCase() === "pending" || t.status?.toLowerCase() === "todo").length;

  // Use AIU endpoint data for accurate metrics, fallback to calculated values
  const totalHours = projectAIU?.totalHours ?? projectActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
  const totalImpact = projectImpact.reduce((sum, i) => sum + (i.value || 0), 0);
  const aiuEarned = projectAIU?.totalAiu ?? project.aiuEarned ?? 0;
  const livesImpacted = projectAIU?.livesImpacted ?? project.livesImpacted ?? 0;

  // Get team members from project assignments (active only) or from activities
  const activeAssignments = projectAssignments.filter(pa =>
    pa.status === 'active' || pa.status === 'accepted' || pa.status === 'completed'
  );

  // Combine team members from assignments and project AIU volunteers data
  const teamMemberIds = new Set([
    ...activeAssignments.map(pa => pa.volunteerId),
    ...projectActivities.map(a => a.userId),
    ...(projectAIU?.volunteers?.map(v => v.volunteerId) || [])
  ]);
  const uniqueVolunteers = teamMemberIds.size;

  const completionPercentage = project.completionPercentage ?? 
    (projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0);

  const isOrganization = currentUser?.userType === 'organization';
  const canEditProject = currentUser?.userType === 'organization' && 
                        project?.organizationId === currentUser?.organizationId;

  const handleDeleteTask = (taskId: number) => {
    setTaskToDelete(taskId);
    setDeleteTaskDialogOpen(true);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete);
    }
    setDeleteTaskDialogOpen(false);
    setTaskToDelete(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 overflow-y-auto overflow-x-hidden">
      <div className="min-h-full pb-24 md:pb-0">
      {isOrganization && <OrganizationHeader activeTab="projects" />}

      {/* Hero Section */}
      <div 
        className="relative w-full"
        style={{
          background: project.primarySdg 
            ? `linear-gradient(135deg, ${SDG_COLORS[project.primarySdg]}dd 0%, ${SDG_COLORS[project.primarySdg]}99 50%, #1a0a2e 100%)`
            : 'linear-gradient(135deg, #1a0a2e 0%, #3d1a5c 50%, #5c2d6e 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
          {/* Back Button */}
          <Link href="/my-work">
            <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10 mb-4" data-testid="button-back-to-projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              {/* Status & Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <StatusBadge status={project.status} />
                {project.aiTrackingEnabled && (
                  <Badge className="bg-purple-500/20 text-purple-100 border-purple-400/30">
                    <Zap className="h-3 w-3 mr-1" />
                    AI Tracking
                  </Badge>
                )}
                {project.engagementType && (
                  <Badge className="bg-white/20 text-white border-white/30">
                    {project.engagementType}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-2" data-testid="text-project-title">
                {project.name}
              </h1>

              {/* Location & Dates */}
              <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                {project.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{project.location}</span>
                  </div>
                )}
                {project.startDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(project.startDate), "MMM d, yyyy")}</span>
                    {project.endDate && <span> - {format(new Date(project.endDate), "MMM d, yyyy")}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Edit Button */}
            {canEditProject && (
              <Link href={`/projects/${projectId}/edit`}>
                <Button className="bg-white text-slate-900 hover:bg-white/90 gap-2" data-testid="button-edit-project-detail">
                  <Edit className="h-4 w-4" />
                  Edit Project
                </Button>
              </Link>
            )}
          </div>

          {/* Progress Bar in Hero */}
          <div className="mt-6 bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-sm font-medium">Project Completion</span>
              <span className="text-white text-2xl font-bold">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-3 bg-white/20" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto w-full px-4 py-6 space-y-6">
        
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{uniqueVolunteers}</div>
                  <div className="text-xs text-blue-600/80 dark:text-blue-400/80">Volunteers</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">{totalHours}</div>
                  <div className="text-xs text-green-600/80 dark:text-green-400/80">Hours Logged</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{completedTasks}/{projectTasks.length}</div>
                  <div className="text-xs text-purple-600/80 dark:text-purple-400/80">Tasks Done</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{aiuEarned.toFixed(1)}</div>
                  <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80">AIUs Earned</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Description Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Briefcase className="h-5 w-5 text-slate-500" />
                  About This Project
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {project.description || "No description provided for this project."}
                </p>
                
                {/* Project Details Grid */}
                <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
                  {project.ongoingHoursPerWeek && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Time Commitment</div>
                      <div className="font-medium">{project.ongoingHoursPerWeek} hrs/week</div>
                    </div>
                  )}
                  {project.commitmentType && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Commitment Type</div>
                      <div className="font-medium capitalize">{project.commitmentType}</div>
                    </div>
                  )}
                  {project.experienceLevel && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Experience Level</div>
                      <div className="font-medium capitalize">{project.experienceLevel}</div>
                    </div>
                  )}
                  {project.projectTotalHours && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Project Hours</div>
                      <div className="font-medium">{project.projectTotalHours} hrs</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SDG Goals Card */}
            {project.sdgGoals && project.sdgGoals.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-slate-500" />
                    Sustainable Development Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[...project.sdgGoals].sort((a, b) => a - b).map((sdg: number) => (
                      <div
                        key={sdg}
                        className="flex items-center gap-3 p-3 rounded-lg text-white"
                        style={{ backgroundColor: SDG_COLORS[sdg] }}
                      >
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                          {sdg}
                        </div>
                        <div>
                          <div className="font-semibold">{SDG_NAMES[sdg]}</div>
                          {project.primarySdg === sdg && (
                            <div className="text-xs opacity-80">Primary Goal</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tasks Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="h-5 w-5 text-slate-500" />
                    Project Tasks
                  </CardTitle>
                  {isOrganization && (
                    <Button size="sm" className="gap-1" data-testid="button-add-task">
                      <Plus className="h-4 w-4" />
                      Add Task
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Task Summary */}
                <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{completedTasks}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center border-x">
                    <div className="text-xl font-bold text-blue-600">{inProgressTasks}</div>
                    <div className="text-xs text-muted-foreground">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-slate-500">{pendingTasks}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </div>

                {projectTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No tasks created yet</p>
                    {isOrganization && <p className="text-sm mt-1">Click "Add Task" to create one</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projectTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        data-testid={`task-item-${task.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{task.title}</h4>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                            {task.estimatedHours && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {task.estimatedHours}h
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(task.dueDate), "MMM d")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <StatusBadge status={task.status} />
                          {isOrganization && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTask(task.id)}
                              data-testid={`button-delete-task-${task.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Members Card - Enhanced with AIU data and assignments */}
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                  Team Members ({uniqueVolunteers})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {uniqueVolunteers === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No volunteers assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Show volunteers from AIU data first (has most complete info) */}
                    {projectAIU?.volunteers && projectAIU.volunteers.length > 0 ? (
                      projectAIU.volunteers.map((vol, idx) => {
                        const user = users.find((u) => u.id === vol.volunteerId);
                        const assignment = activeAssignments.find(a => a.volunteerId === vol.volunteerId);
                        return (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            <Avatar className="h-11 w-11 ring-2 ring-blue-200 dark:ring-blue-700">
                              <AvatarImage src={user?.avatar} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold">
                                {vol.volunteerName?.[0] || "V"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">{vol.volunteerName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {(assignment?.role || vol.role) && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                    {assignment?.role || vol.role}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">{vol.hours.toFixed(1)}h • {vol.aiu.toFixed(1)} AIU</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      /* Fallback to activity-based volunteers */
                      Array.from(teamMemberIds).map((odUserId) => {
                        const user = users.find((u) => u.id === odUserId);
                        const userActivities = projectActivities.filter((a) => a.userId === odUserId);
                        const userHours = userActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
                        const assignment = activeAssignments.find(a => a.volunteerId === odUserId);

                        return (
                          <div key={odUserId} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            <Avatar className="h-11 w-11 ring-2 ring-blue-200 dark:ring-blue-700">
                              <AvatarImage src={user?.avatar} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold">
                                {user?.displayName?.[0] || "V"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">{user?.displayName || `Volunteer #${odUserId}`}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {assignment?.role && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                    {assignment.role}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">{userHours} hours logged</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            
            {/* Skills Required Card */}
            {(project.requiredSkills?.length || project.optionalSkills?.length) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Award className="h-5 w-5 text-slate-500" />
                    Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.requiredSkills && project.requiredSkills.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Required</div>
                      <div className="flex flex-wrap gap-2">
                        {project.requiredSkills.map((skill, idx) => (
                          <Badge key={idx} className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.optionalSkills && project.optionalSkills.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Optional</div>
                      <div className="flex flex-wrap gap-2">
                        {project.optionalSkills.map((skill, idx) => (
                          <Badge key={idx} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Impact Metrics Card */}
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                  Impact Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AIU Display - Enhanced */}
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide font-semibold">AIUs Earned</div>
                  </div>
                  <div className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">{aiuEarned.toFixed(1)}</div>
                  <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-2">
                    {projectAIU?.sdgIndicator ? `${projectAIU.sdgIndicator} aligned` : 'Attributable Impact Units'}
                  </div>
                  {projectAIU?.verificationStatus && (
                    <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      projectAIU.verificationStatus === 'verified'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      <CheckCircle2 className="h-3 w-3" />
                      {projectAIU.verificationStatus === 'verified' ? 'Verified Impact' : 'Pending Verification'}
                    </div>
                  )}
                </div>

                {/* Lives Impacted - Enhanced */}
                <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-orange-600" />
                    <div className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wide font-semibold">Lives Impacted</div>
                  </div>
                  <div className="text-4xl font-bold text-orange-700 dark:text-orange-300">{livesImpacted.toLocaleString()}</div>
                  {isOrganization && (
                    <div className="mt-3">
                      <input
                        type="number"
                        value={project.livesImpacted || 0}
                        onChange={(e) => updateLivesImpactedMutation.mutate(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Update lives impacted"
                        data-testid="input-lives-impacted"
                      />
                      <p className="text-xs text-orange-600/70 mt-1.5">This value feeds into AIU calculations</p>
                    </div>
                  )}
                </div>

                {/* Additional Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-center">
                    <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{Math.round(totalHours)}</div>
                    <div className="text-xs text-blue-600/80 dark:text-blue-400/80">Total Hours</div>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 text-center">
                    <Zap className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totalImpact}</div>
                    <div className="text-xs text-purple-600/80 dark:text-purple-400/80">Impact Score</div>
                  </div>
                </div>

                {/* Volunteer Breakdown from AIU data */}
                {projectAIU?.volunteers && projectAIU.volunteers.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Top Contributors</div>
                    <div className="space-y-2">
                      {projectAIU.volunteers.slice(0, 3).map((vol, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700 dark:text-gray-300">{vol.volunteerName}</span>
                          <span className="font-semibold text-emerald-600">{vol.aiu.toFixed(1)} AIU</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start gap-2" variant="outline" data-testid="button-share-project">
                  <Share2 className="h-4 w-4" />
                  Share Project
                </Button>
                {!isOrganization && (
                  <Button className="w-full justify-start gap-2 bg-green-600 hover:bg-green-700 text-white" data-testid="button-apply-project">
                    <Plus className="h-4 w-4" />
                    Apply to Volunteer
                  </Button>
                )}
                {canEditProject && (
                  <Link href={`/projects/${projectId}/edit`} className="block">
                    <Button className="w-full justify-start gap-2" variant="outline" data-testid="button-edit-project-sidebar">
                      <Edit className="h-4 w-4" />
                      Edit Project
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Project Info Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5 text-slate-500" />
                  Project Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={project.status} />
                </div>
                {project.startDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="font-medium">{format(new Date(project.startDate), "MMM d, yyyy")}</span>
                  </div>
                )}
                {project.endDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End Date</span>
                    <span className="font-medium">{format(new Date(project.endDate), "MMM d, yyyy")}</span>
                  </div>
                )}
                {project.location && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{project.location}</span>
                  </div>
                )}
                {project.engagementType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Engagement</span>
                    <span className="font-medium capitalize">{project.engagementType}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Delete Task Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteTaskDialogOpen}
        onClose={() => {
          setDeleteTaskDialogOpen(false);
          setTaskToDelete(null);
        }}
        itemType="task"
        onConfirm={confirmDeleteTask}
        isLoading={deleteTaskMutation.isPending}
      />
      </div>
    </div>
  );
}
