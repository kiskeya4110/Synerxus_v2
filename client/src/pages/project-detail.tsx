import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Calendar, Edit, MapPin, Target, Users, TrendingUp, CheckCircle2, Clock, Share2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { CompletionProgress } from "@/components/ui/completion-progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import OrganizationHeader from "@/components/layout/organization-header";
import Footer from "@/components/layout/footer";

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
  [key: string]: any;
}

interface Task {
  id: number;
  projectId: number;
  status: string;
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
  [key: string]: any;
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id ? parseInt(params.id) : null;
  const userId = localStorage.getItem('currentUserId');

  // ALL HOOKS MUST BE CALLED FIRST - before any conditional returns
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

  const { data: tasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: volunteerActivities = [], isLoading: loadingActivities } = useQuery<VolunteerActivity[]>({
    queryKey: ["/api/volunteer-activities"],
  });

  const { data: projectImpacts = [], isLoading: loadingImpacts } = useQuery<ProjectImpact[]>({
    queryKey: ["/api/project-impacts"],
  });

  const { data: users = [] } = useQuery<DBUser[]>({
    queryKey: ["/api/users"],
  });

  const { toast } = useToast();

  // Mutation to update lives touched
  const updateLivesTouchedMutation = useMutation({
    mutationFn: async (livesTouched: number) => {
      return apiRequest("PATCH", `/api/projects/${projectId}`, { livesTouched });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Lives touched updated", description: "The impact metric has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lives touched", variant: "destructive" });
    }
  });

  // Mutation to delete task
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

  // NOW we can do conditional early returns after all hooks
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
      <div className="w-full min-h-screen bg-white dark:bg-slate-900">
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <div className="px-4 py-3 flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-20 w-full" />
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

  // Safe to use after hooks
  const projectTasks = tasks.filter((t: any) => t.projectId === projectId);
  const projectActivities = volunteerActivities.filter((a: any) => a.projectId === projectId);
  const projectImpact = projectImpacts.filter((i: any) => i.projectId === projectId);

  const completedTasks = projectTasks.filter((t: any) => t.status === "Completed").length;
  const totalHours = projectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
  const uniqueVolunteers = new Set(projectActivities.map((a: any) => a.userId)).size;
  const totalImpact = projectImpact.reduce((sum: number, i: any) => sum + (i.value || 0), 0);

  const completionPercentage = project.completionPercentage ?? 
    (projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Planning":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
      case "In Progress":
      case "Active":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400";
      case "Completed":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400";
      case "On Hold":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  const isOrganization = currentUser?.userType === 'organization';
    mutationFn: async (livesTouched: number) => {
      return apiRequest("PATCH", `/api/projects/${projectId}`, { livesTouched });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Lives touched updated", description: "The impact metric has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lives touched", variant: "destructive" });
    }
  });

  const updateLivesTouched = (value: number) => {
    updateLivesTouchedMutation.mutate(value);
  };

  // Mutation to delete task
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

  const handleDeleteTask = (taskId: number) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleEditTask = (taskId: number) => {
    if (isOrganization) {
      // Placeholder for edit modal - can be expanded later
      toast({ title: "Task edit", description: "Task editing feature coming soon" });
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 md:pb-0">
      {/* Organization Header */}
      {isOrganization && <OrganizationHeader activeTab="projects" />}

      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-blue-600 text-white px-4 py-3 flex items-center justify-between md:hidden">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700 -ml-2" data-testid="button-back-to-projects">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-base font-semibold" data-testid="text-project-title">Project Detail</h1>
        <div className="w-10" />
      </div>

      {/* Offline Badge for mobile */}
      <div className="md:hidden px-4 pt-3 pb-0">
        <Badge className="bg-amber-500 text-white w-full justify-center">
          <AlertCircle className="h-3 w-3 mr-1" />
          Offline Mode: Data may be outdated
        </Badge>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="sm" data-testid="button-back-to-projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-project-title">{project.name}</h1>
            <p className="text-muted-foreground mt-1">Project Details & Progress</p>
          </div>
        </div>
        {canEditProject && (
          <Link href={`/projects/${projectId}/edit`}>
            <Button className="gap-2" data-testid="button-edit-project-detail">
              <Edit className="h-4 w-4" />
              Edit Project
            </Button>
          </Link>
        )}
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden p-4 space-y-4">
        {/* Hero Card with Image */}
        <Card className="overflow-hidden">
          <div className="aspect-video bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Target className="h-12 w-12 text-white opacity-50" />
          </div>
          
          {/* Status & Match Badge */}
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <StatusBadge status={project.status} />
              {project.aiTrackingEnabled && (
                <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  AI Tracking
                </Badge>
              )}
            </div>

            {/* Title */}
            <div>
              <h2 className="text-xl font-bold">{project.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
            </div>

            {/* Key Info */}
            <div className="space-y-2 py-3 border-t border-b border-slate-200 dark:border-slate-700">
              {project.ongoingHoursPerWeek && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{project.ongoingHoursPerWeek} hours/week (Flexible)</span>
                </div>
              )}
              {project.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{project.location}</span>
                </div>
              )}
            </div>

            {/* SDG Goals - Compact */}
            {project.sdgGoals && project.sdgGoals.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">SDG Goals</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[...project.sdgGoals].slice(0, 4).map((sdg: number) => (
                    <div
                      key={sdg}
                      className="px-2 py-1 rounded text-white text-xs font-medium"
                      style={{ backgroundColor: SDG_COLORS[sdg] }}
                    >
                      #{sdg}
                    </div>
                  ))}
                  {project.sdgGoals.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{project.sdgGoals.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="pt-3 space-y-2">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-12 text-base" data-testid="button-apply-project">
                Apply for Project
              </Button>
              <Button variant="outline" className="w-full h-10">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Preview */}
        {projectTasks.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Expected Tasks ({projectTasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projectTasks.slice(0, 3).map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between p-2 text-sm border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <span className="truncate flex-1">{task.title}</span>
                    <StatusBadge status={task.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{uniqueVolunteers}</div>
              <div className="text-xs text-muted-foreground mt-1">Volunteers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalHours}</div>
              <div className="text-xs text-muted-foreground mt-1">Hours</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Desktop Full Layout */}
      <div className="hidden md:block container mx-auto p-6 space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="impact">Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={project.status} />
                      {project.aiTrackingEnabled && (
                        <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          AI Tracking
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-base text-muted-foreground">{project.description}</p>

                    <div className="grid grid-cols-2 gap-4">
                      {project.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{project.location}</span>
                        </div>
                      )}
                      {project.startDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(project.startDate), "MMM d, yyyy")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:w-64 space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Completion</span>
                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{completionPercentage}%</span>
                      </div>
                      <CompletionProgress value={completionPercentage} className="h-3" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center pt-3 border-t">
                      <div>
                        <div className="text-2xl font-bold text-primary">{completedTasks}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{projectTasks.length}</div>
                        <div className="text-xs text-muted-foreground">Total Tasks</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{uniqueVolunteers}</div>
                      <div className="text-sm text-muted-foreground">Volunteers</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30">
                      <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{totalHours}</div>
                      <div className="text-sm text-muted-foreground">Total Hours</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                      <CheckCircle2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{completedTasks}</div>
                      <div className="text-sm text-muted-foreground">Tasks Done</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/30">
                      <Target className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{totalImpact}</div>
                      <div className="text-sm text-muted-foreground">Impact Score</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {project.sdgGoals && project.sdgGoals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    All Sustainable Development Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {[...project.sdgGoals].sort((a, b) => a - b).map((sdg: number) => (
                      <div
                        key={sdg}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium"
                        style={{ backgroundColor: SDG_COLORS[sdg] }}
                      >
                        <span className="font-bold">#{sdg}</span>
                        <span className="text-sm">{SDG_NAMES[sdg]}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="programs" className="mt-6 space-y-6">
            {/* Lives Touched Section (for organizations) */}
            {isOrganization && (
              <Card>
                <CardHeader>
                  <CardTitle>Lives Touched</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">Total lives impacted by this project</p>
                      <input
                        type="number"
                        value={project?.livesTouched || 0}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 0;
                          updateLivesTouched(newValue);
                        }}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="Enter number of lives touched"
                        data-testid="input-lives-touched"
                      />
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      {project?.livesTouched || 0}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Project Tasks</CardTitle>
                {isOrganization && (
                  <Button size="sm" className="gap-2" data-testid="button-add-task">
                    <Plus className="h-4 w-4" />
                    Add Task
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {projectTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No tasks yet</p>
                ) : (
                  <div className="space-y-3">
                    {projectTasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        data-testid={`task-item-${task.id}`}
                        onClick={() => isOrganization && handleEditTask(task.id)}
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            {task.estimatedHours && <span>Est. {task.estimatedHours}h • </span>}
                            Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isOrganization && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                              data-testid={`button-delete-task-${task.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                          <StatusBadge status={task.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Members ({uniqueVolunteers})</CardTitle>
              </CardHeader>
              <CardContent>
                {uniqueVolunteers === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No volunteers yet</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from(new Set(projectActivities.map((a: any) => a.userId))).map((userId: any) => {
                      const user = users.find((u: any) => u.id === userId);
                      const userActivities = projectActivities.filter((a: any) => a.userId === userId);
                      const userHours = userActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
                      
                      return (
                        <div key={userId} className="flex items-center gap-3 p-4 border rounded-lg">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={user?.avatar} />
                            <AvatarFallback>{user?.displayName?.[0] || "V"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user?.displayName || `Volunteer #${userId}`}</p>
                            <p className="text-sm text-muted-foreground">{userHours} hours logged</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financials" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    <p className="text-3xl font-bold">{totalHours}</p>
                  </div>
                  <div className="space-y-2 p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Active Volunteers</p>
                    <p className="text-3xl font-bold">{uniqueVolunteers}</p>
                  </div>
                  <div className="space-y-2 p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Tasks Completed</p>
                    <p className="text-3xl font-bold">{completedTasks}/{projectTasks.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="impact" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Impact Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Total Impact Score: <span className="text-2xl font-bold text-primary">{totalImpact}</span></p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
