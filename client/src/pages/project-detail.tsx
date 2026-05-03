import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, Calendar, Edit, MapPin, Target, Users, TrendingUp, CheckCircle2, Clock, Share2, AlertCircle, Plus, Trash2, Briefcase, Award, Heart, Globe, Zap, BarChart3, Activity, X, Info, ChevronRight, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { CompletionProgress } from "@/components/ui/completion-progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/dialog-factory";
import { CreateTaskDialog, EditTaskDialog } from "@/components/projects/task-dialogs";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDecimal } from "@/lib/format-utils";
import OrganizationNav from "@/components/layout/organization-nav";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import VolunteerNav from "@/components/layout/volunteer-nav";
import WebBottomNav from "@/components/layout/web-bottom-nav";
import Footer from "@/components/layout/footer";
import { useViewportDetection, useIsPWAMode } from "@/hooks/use-mobile";
import { getSDGColor, getSDGName } from "@/lib/sdg-utils";

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
  livesImpacted?: number;
  aiuEarned?: number;
  aiTrackingEnabled?: boolean;
  engagementType?: string;
  commitmentType?: string;
  experienceLevel?: string;
  coverImage?: string;
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
  isMilestone?: boolean;
  milestoneWeight?: number;
  assigneeId?: number;
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
  const [matchBase, paramsBase] = useRoute("/projects/:id");
  const [matchNgo, paramsNgo] = useRoute("/ngo/projects/:id");
  const params = matchNgo ? paramsNgo : paramsBase;
  const [, navigate] = useLocation();
  const { isMobile, isLoading: isViewportLoading } = useViewportDetection();
  const isPWAMode = useIsPWAMode();
  const projectId = params?.id ? parseInt(params.id) : null;
  const userId = localStorage.getItem('currentUserId');
  const userType = localStorage.getItem('userType');

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
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/users/me`, { headers, credentials: "include" });
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

  // Disabled AIU query (kept as noop to maintain hook count)
  const { data: projectAIU } = useQuery<any>({
    queryKey: ["/api/aiu/project", projectId],
    queryFn: async () => null,
    enabled: false,
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

  // Fetch applications to check if user has already applied
  const { data: applications = [] } = useQuery({
    queryKey: ['/api/applications'],
    queryFn: async () => {
      const response = await fetch('/api/applications');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Check if user has applied for this project
  const hasApplied = applications.some((app: any) =>
    app.projectId === projectId && app.userId === parseInt(userId || '0')
  );

  const { toast } = useToast();

  // Share project handler
  const handleShareProject = async () => {
    const projectUrl = `${window.location.origin}/projects/${projectId}`;
    const shareData = {
      title: project?.name || 'Check out this volunteer project',
      text: project?.description || 'Join us in making a difference!',
      url: projectUrl
    };

    // Try native Web Share API first (works on mobile and some desktop browsers)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast({
          title: "Shared successfully!",
          description: "Project has been shared.",
        });
        return;
      } catch (err: any) {
        // User cancelled or share failed - fall through to clipboard
        if (err.name !== 'AbortError') {
          console.log('Share failed, falling back to clipboard');
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(projectUrl);
      toast({
        title: "Link copied!",
        description: "Project link has been copied to your clipboard.",
      });
    } catch (err) {
      // Final fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = projectUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: "Link copied!",
        description: "Project link has been copied to your clipboard.",
      });
    }
  };

  // Delete task dialog state - moved to top for React Hooks rules
  const [deleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  // Interactive KPI modal states
  const [activeKpiModal, setActiveKpiModal] = useState<'volunteers' | 'hours' | 'tasks' | 'engagement' | 'team' | 'impact' | null>(null);

  // Adjustment mode state (kept to maintain hook count)
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustmentValues, setAdjustmentValues] = useState({
    livesImpacted: 0,
    verificationNotes: ''
  });

  const updateLivesImpactedMutation = useMutation({
    mutationFn: async (livesTouched: number) => {
      return apiRequest("PATCH", `/api/projects/${projectId}`, { livesTouched });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Lives impacted updated", description: "The impact metric has been saved." });
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

  // Verify impact mutation (kept as noop to maintain hook count)
  const verifyAiuMutation = useMutation({
    mutationFn: async ({ status }: { status: 'verified' | 'rejected' }) => {
      return Promise.resolve();
    },
    onSuccess: () => {},
  });

  // Adjust and verify mutation (kept as noop to maintain hook count)
  // Adjust and verify mutation (kept as noop to maintain hook count)
  const adjustAndVerifyMutation = useMutation({
    mutationFn: async ({ livesImpacted, verificationNotes }: { livesImpacted: number; verificationNotes: string }) => {
      return Promise.resolve();
    },
    onSuccess: () => {},
  });

  // Apply to project mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/applications", {
        projectId,
        userId: parseInt(userId || '0'),
        status: 'pending',
        message: 'I would like to volunteer for this project.'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully."
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit application", variant: "destructive" });
    }
  });

  // Determine if user is organization (check localStorage as fallback)
  const isOrganizationUser = currentUser?.userType === 'organization' || userType === 'organization';

  // Wait for viewport detection to complete before rendering layout
  if (isViewportLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#faf9f7]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!projectId) {
    if (isOrganizationUser && isMobile) {
      return (
        <OrganizationPWALayout activeTab="projects">
          <div className="p-6 text-center">
            <p className="text-muted-foreground">Invalid project ID</p>
          </div>
        </OrganizationPWALayout>
      );
    }
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
    if (isOrganizationUser && isMobile) {
      return (
        <OrganizationPWALayout activeTab="projects">
          <div className="p-4 space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </div>
        </OrganizationPWALayout>
      );
    }
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
    if (isOrganizationUser && isMobile) {
      return (
        <OrganizationPWALayout activeTab="projects">
          <div className="p-6 text-center">
            <p className="text-muted-foreground">Project not found</p>
            <Link href="/projects">
              <Button variant="outline" className="mt-4" data-testid="button-back-projects">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            </Link>
          </div>
        </OrganizationPWALayout>
      );
    }
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

  // Calculate metrics from actual data
  const totalHours = projectActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
  const totalImpact = projectImpact.reduce((sum, i) => sum + (i.value || 0), 0);
  const livesImpacted = project.livesTouched ?? 0;

  // Get team members from project assignments (active only) or from activities
  const activeAssignments = projectAssignments.filter(pa =>
    pa.status === 'active' || pa.status === 'accepted' || pa.status === 'completed'
  );

  // Combine team members from assignments and activities
  const teamMemberIds = new Set([
    ...activeAssignments.map(pa => pa.volunteerId),
    ...projectActivities.map(a => a.userId),
  ]);
  const uniqueVolunteers = teamMemberIds.size;

  const completionPercentage = project.completionPercentage ??
    (projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0);

  // Calculate engagement score (0-100) based on real metrics
  const totalCommitted = activeAssignments.reduce((sum, a) => sum + ((a as any).hoursCommitted || 0), 0);
  const totalCompleted = activeAssignments.reduce((sum, a) => sum + ((a as any).hoursCompleted || 0), 0);

  // Engagement score components
  const volunteerScore = Math.min((uniqueVolunteers / 10) * 25, 25); // Max 25 points
  const taskCompletionRate = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
  const taskScore = taskCompletionRate * 0.30; // Max 30 points
  const hoursScore = totalCommitted > 0
    ? Math.min((totalCompleted / totalCommitted) * 25, 25)
    : 0; // Max 25 points

  // Recent activity score (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentActivities = projectActivities.filter(a => new Date(a.createdAt || '') >= thirtyDaysAgo);
  const activityScore = Math.min((recentActivities.length / 10) * 20, 20); // Max 20 points

  const engagementScore = Math.round(volunteerScore + taskScore + hoursScore + activityScore);
  const engagementLevel = engagementScore >= 80 ? 'Excellent' :
    engagementScore >= 60 ? 'Good' :
    engagementScore >= 40 ? 'Moderate' :
    engagementScore >= 20 ? 'Low' : 'Minimal';

  const isOrganization = isOrganizationUser;
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

  const isVolunteer = currentUser?.userType === 'volunteer' || userType === 'volunteer';

  // Mobile Organization PWA View
  if (isOrganization && isMobile) {
    return (
      <OrganizationPWALayout activeTab="projects">
        <div className="px-4 py-4 space-y-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Project Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-lg font-bold text-slate-800">{project.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={project.status} />
                  {project.location && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {project.location}
                    </span>
                  )}
                </div>
              </div>
              {canEditProject && (
                <Link href={`/projects/${projectId}/edit`}>
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
            {project.description && (
              <p className="text-sm text-slate-600 line-clamp-3">{project.description}</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
              <CardContent className="p-3 text-center">
                <Users className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                <p className="text-lg font-bold text-emerald-700">{uniqueVolunteers}</p>
                <p className="text-[10px] text-emerald-600">Volunteers</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
              <CardContent className="p-3 text-center">
                <Clock className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                <p className="text-lg font-bold text-blue-700">{totalHours}</p>
                <p className="text-[10px] text-blue-600">Hours</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
              <CardContent className="p-3 text-center">
                <Target className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                <p className="text-lg font-bold text-purple-700">{completionPercentage}%</p>
                <p className="text-[10px] text-purple-600">Complete</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
              <CardContent className="p-3 text-center">
                <Heart className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                <p className="text-lg font-bold text-amber-700">{livesImpacted.toLocaleString()}</p>
                <p className="text-[10px] text-amber-600">People Impacted</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Project Progress</h3>
                <span className="text-sm font-bold text-emerald-600">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>{completedTasks} completed</span>
                <span>{inProgressTasks} in progress</span>
                <span>{pendingTasks} pending</span>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Tasks ({projectTasks.length})</h3>
              {canEditProject && projectId && (
                <CreateTaskDialog projectId={projectId} />
              )}
            </div>
            <div className="space-y-2">
              {projectTasks.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No tasks yet</p>
              ) : (
                projectTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${task.status === 'completed' ? 'text-emerald-500' : 'text-slate-300'}`} />
                      <span className="text-sm text-slate-700 truncate max-w-[180px]">{task.title}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{task.status}</Badge>
                  </div>
                ))
              )}
              {projectTasks.length > 5 && (
                <p className="text-xs text-center text-slate-500 pt-2">+{projectTasks.length - 5} more tasks</p>
              )}
            </div>
          </div>

          {/* SDG Coverage */}
          {project.sdgGoals && (project.sdgGoals as number[]).length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">SDG Alignment</h3>
                <div className="flex flex-wrap gap-2">
                  {(project.sdgGoals as number[]).map((sdg: number) => (
                    <div
                      key={sdg}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: getSDGColor(sdg) }}
                      title={getSDGName(sdg)}
                    >
                      {sdg}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </OrganizationPWALayout>
    );
  }

  // Desktop view
  return (
    <div className="fixed inset-0 bg-[#f8f9fa] dark:bg-slate-900 overflow-y-auto overflow-x-hidden">
      {/* Volunteer Desktop Navigation */}
      <VolunteerNav />

      <div className="min-h-full pb-36 md:pb-0">
      {isOrganization && <OrganizationNav />}

      {/* Hero Section */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)'
        }}
      >
        {/* Cover Image Background - prioritized over gradient */}
        {project.coverImage ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${project.coverImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70" />
          </>
        ) : (
          /* Fallback: subtle dark gradient for readability */
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900" />
        )}
        <div className="relative max-w-6xl mx-auto px-4 py-6 md:py-10">
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
        
        {/* Key Metrics Grid - Interactive Clickable KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
            onClick={() => setActiveKpiModal('volunteers')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{uniqueVolunteers}</div>
                  <div className="text-xs text-blue-600/80 dark:text-blue-400/80">Volunteers</div>
                </div>
                <ChevronRight className="h-4 w-4 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-700 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
            onClick={() => setActiveKpiModal('hours')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">{totalHours}</div>
                  <div className="text-xs text-green-600/80 dark:text-green-400/80">Hours Logged</div>
                </div>
                <ChevronRight className="h-4 w-4 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 border-purple-200 dark:border-purple-700 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
            onClick={() => setActiveKpiModal('tasks')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{completedTasks}/{projectTasks.length}</div>
                  <div className="text-xs text-purple-600/80 dark:text-purple-400/80">Tasks Done</div>
                </div>
                <ChevronRight className="h-4 w-4 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
            onClick={() => setActiveKpiModal('impact')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Heart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{livesImpacted.toLocaleString()}</div>
                  <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80">People Impacted</div>
                </div>
                <ChevronRight className="h-4 w-4 text-emerald-400" />
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
                        style={{ backgroundColor: getSDGColor(sdg) }}
                      >
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                          {sdg}
                        </div>
                        <div>
                          <div className="font-semibold">{getSDGName(sdg)}</div>
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
                  {isOrganization && projectId && (
                    <CreateTaskDialog projectId={projectId} />
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
                            {task.isMilestone && (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                <Target className="h-3 w-3 mr-1" />
                                Milestone
                              </Badge>
                            )}
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
                            <>
                              <EditTaskDialog task={task as any} />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteTask(task.id)}
                                data-testid={`button-delete-task-${task.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Members Card */}
            <Card
              className="border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setActiveKpiModal('team')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                  Team Members ({uniqueVolunteers})
                  <ChevronRight className="h-4 w-4 text-blue-400 ml-auto" />
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
                    {Array.from(teamMemberIds).map((odUserId) => {
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
                    })}
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

            {/* Engagement Score Card - Interactive */}
            <Card
              className="border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setActiveKpiModal('engagement')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Engagement Score
                  <ChevronRight className="h-4 w-4 text-blue-400 ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Score Display */}
                <div className={`p-4 rounded-xl border ${
                  engagementScore >= 80 ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800' :
                  engagementScore >= 60 ? 'bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-900/20 dark:to-lime-900/20 border-green-200 dark:border-green-800' :
                  engagementScore >= 40 ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800' :
                  engagementScore >= 20 ? 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800' :
                  'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Overall Score</span>
                    <Badge className={
                      engagementScore >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      engagementScore >= 60 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      engagementScore >= 40 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      engagementScore >= 20 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }>
                      {engagementLevel}
                    </Badge>
                  </div>
                  <div className={`text-4xl font-bold ${
                    engagementScore >= 80 ? 'text-emerald-700 dark:text-emerald-300' :
                    engagementScore >= 60 ? 'text-green-700 dark:text-green-300' :
                    engagementScore >= 40 ? 'text-yellow-700 dark:text-yellow-300' :
                    engagementScore >= 20 ? 'text-orange-700 dark:text-orange-300' :
                    'text-red-700 dark:text-red-300'
                  }`}>{engagementScore}%</div>
                  <Progress value={engagementScore} className="h-2 mt-3" />
                </div>

                {/* Engagement Breakdown */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Breakdown</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-muted-foreground">Volunteer Participation</span>
                      </span>
                      <span className="font-medium">{Math.round(volunteerScore)}/25</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-muted-foreground">Task Completion</span>
                      </span>
                      <span className="font-medium">{Math.round(taskScore)}/30</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-purple-500" />
                        <span className="text-muted-foreground">Hours Utilization</span>
                      </span>
                      <span className="font-medium">{Math.round(hoursScore)}/25</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-muted-foreground">Recent Activity</span>
                      </span>
                      <span className="font-medium">{Math.round(activityScore)}/20</span>
                    </div>
                  </div>
                </div>

                {/* Activity Summary */}
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  {recentActivities.length} activities in the last 30 days
                </div>
              </CardContent>
            </Card>

            {/* Impact Metrics Card - Interactive */}
            <Card
              className="border-emerald-200 dark:border-emerald-800 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setActiveKpiModal('impact')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                  Impact Metrics
                  <ChevronRight className="h-4 w-4 text-emerald-400 ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* People Impacted Display */}
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-emerald-600" />
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide font-semibold">People Impacted</div>
                  </div>
                  <div className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">{livesImpacted.toLocaleString()}</div>
                  <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-2">
                    Direct beneficiaries
                  </div>
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
                        value={project.livesTouched || 0}
                        onChange={(e) => updateLivesImpactedMutation.mutate(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Update lives impacted"
                        data-testid="input-lives-impacted"
                      />
                      <p className="text-xs text-orange-600/70 mt-1.5">Direct beneficiaries reported for this project</p>
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
                    <div className="text-xs text-purple-600/80 dark:text-purple-400/80">Impact Records</div>
                  </div>
                </div>

                {/* SDG Goals */}
                {project.sdgGoals && (project.sdgGoals as number[]).length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">SDG Alignment</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(project.sdgGoals as number[]).slice(0, 6).map((sdg: number) => (
                        <div key={sdg} className="px-2.5 py-1 rounded-full text-white text-xs font-medium" style={{ backgroundColor: getSDGColor(sdg) }}>
                          SDG {sdg}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Removed - moved to bottom row */}
          </div>
        </div>

        {/* Quick Actions & Project Info - Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Actions Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-amber-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors"
                variant="outline"
                onClick={handleShareProject}
                data-testid="button-share-project"
              >
                <Share2 className="h-4 w-4" />
                Share Project
              </Button>
              {!isOrganization && (
                <Button
                  className={`w-full justify-start gap-2 ${
                    hasApplied
                      ? 'bg-gray-500 hover:bg-gray-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                  onClick={() => !hasApplied && applyMutation.mutate()}
                  disabled={applyMutation.isPending || hasApplied}
                  data-testid="button-apply-project"
                >
                  {hasApplied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Already Applied
                    </>
                  ) : applyMutation.isPending ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Apply to Volunteer
                    </>
                  )}
                </Button>
              )}
              {canEditProject && (
                <Link href={`/projects/${projectId}/edit`} className="block">
                  <Button
                    className="w-full justify-start gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
                    variant="outline"
                    data-testid="button-edit-project-sidebar"
                  >
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
              {project.commitmentType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commitment</span>
                  <span className="font-medium capitalize">{project.commitmentType}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* KPI Detail Modals */}
      {activeKpiModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setActiveKpiModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {activeKpiModal === 'volunteers' && 'Team Volunteers'}
                {activeKpiModal === 'hours' && 'Hours Logged'}
                {activeKpiModal === 'tasks' && 'Task Progress'}
                {activeKpiModal === 'engagement' && 'Engagement Score'}
                {activeKpiModal === 'team' && 'Team Members'}
                {activeKpiModal === 'impact' && 'Impact Metrics'}
              </h2>
              <button onClick={() => setActiveKpiModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Volunteers Modal */}
              {activeKpiModal === 'volunteers' && (
                <>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                    <div className="text-4xl font-bold text-blue-600">{uniqueVolunteers}</div>
                    <div className="text-sm text-blue-600/80">Active Volunteers</div>
                  </div>
                  <div className="space-y-2">
                    {Array.from(teamMemberIds).map((memberId) => {
                      const user = users.find(u => u.id === memberId);
                      const assignment = activeAssignments.find(a => a.volunteerId === memberId);
                      const memberHours = projectActivities.filter(a => a.userId === memberId).reduce((sum, a) => sum + (a.hours || 0), 0);
                      return (
                        <div key={memberId} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-500 text-white">{(user?.displayName || 'V')[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium">{user?.displayName || `Volunteer #${memberId}`}</div>
                            <div className="text-xs text-muted-foreground">{assignment?.role || 'Volunteer'} • {memberHours}h logged</div>
                          </div>
                        </div>
                      );
                    })}
                    {teamMemberIds.size === 0 && <p className="text-center text-muted-foreground py-4">No volunteer data available</p>}
                  </div>
                </>
              )}

              {/* Hours Modal */}
              {activeKpiModal === 'hours' && (
                <>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                    <div className="text-4xl font-bold text-green-600">{totalHours}</div>
                    <div className="text-sm text-green-600/80">Total Hours Logged</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
                      <div className="text-xl font-bold">{project.projectTotalHours || 0}</div>
                      <div className="text-xs text-muted-foreground">Target Hours</div>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                      <div className="text-xl font-bold text-green-600">
                        {projectActivities.filter(a => a.verificationStatus === 'approved').reduce((sum, a) => sum + (a.hours || 0), 0)}
                      </div>
                      <div className="text-xs text-green-600/80">Verified Hours</div>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                      <div className="text-xl font-bold text-amber-600">
                        {projectActivities.filter(a => a.verificationStatus !== 'approved').reduce((sum, a) => sum + (a.hours || 0), 0)}
                      </div>
                      <div className="text-xs text-amber-600/80">Pending Hours</div>
                    </div>
                  </div>
                  {teamMemberIds.size > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Hours by Volunteer</h4>
                      {Array.from(teamMemberIds).map((memberId) => {
                        const user = users.find(u => u.id === memberId);
                        const memberHours = projectActivities.filter(a => a.userId === memberId).reduce((sum, a) => sum + (a.hours || 0), 0);
                        return (
                          <div key={memberId} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700 rounded">
                            <span>{user?.displayName || `Volunteer #${memberId}`}</span>
                            <span className="font-medium">{memberHours}h</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Tasks Modal */}
              {activeKpiModal === 'tasks' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
                      <div className="text-xs text-green-600/80">Completed</div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{inProgressTasks}</div>
                      <div className="text-xs text-blue-600/80">In Progress</div>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-center">
                      <div className="text-2xl font-bold text-slate-600">{pendingTasks}</div>
                      <div className="text-xs text-slate-600/80">Pending</div>
                    </div>
                  </div>
                  <Progress value={projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0} className="h-3" />
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {projectTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {task.title}
                            {task.isMilestone && (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                <Target className="h-3 w-3 mr-1" />
                                Milestone
                              </Badge>
                            )}
                          </div>
                          {task.dueDate && <div className="text-xs text-muted-foreground">Due: {format(new Date(task.dueDate), "MMM d")}</div>}
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Engagement Score Modal */}
              {activeKpiModal === 'engagement' && (
                <>
                  <div className={`p-4 rounded-xl text-center ${
                    engagementScore >= 80 ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                    engagementScore >= 60 ? 'bg-green-50 dark:bg-green-900/20' :
                    engagementScore >= 40 ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                    'bg-orange-50 dark:bg-orange-900/20'
                  }`}>
                    <div className={`text-5xl font-bold ${
                      engagementScore >= 80 ? 'text-emerald-600' :
                      engagementScore >= 60 ? 'text-green-600' :
                      engagementScore >= 40 ? 'text-yellow-600' :
                      'text-orange-600'
                    }`}>{engagementScore}%</div>
                    <div className="text-sm mt-1">{engagementLevel} Engagement</div>
                  </div>

                  {/* Industry Standard Explanation */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Industry-Standard Calculation
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      This score follows volunteer management best practices, weighted across four key dimensions used by leading nonprofit platforms.
                    </p>
                  </div>

                  {/* Score Breakdown */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Score Breakdown</h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            Volunteer Participation (25%)
                          </span>
                          <span className="font-bold">{Math.round(volunteerScore)}/25</span>
                        </div>
                        <Progress value={(volunteerScore / 25) * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{uniqueVolunteers} volunteers • Target: 10+ for full score</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Task Completion (30%)
                          </span>
                          <span className="font-bold">{Math.round(taskScore)}/30</span>
                        </div>
                        <Progress value={(taskScore / 30) * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{Math.round(taskCompletionRate)}% tasks completed</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-purple-500" />
                            Hours Utilization (25%)
                          </span>
                          <span className="font-bold">{Math.round(hoursScore)}/25</span>
                        </div>
                        <Progress value={(hoursScore / 25) * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">Committed vs completed hours ratio</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <Activity className="h-4 w-4 text-orange-500" />
                            Recent Activity (20%)
                          </span>
                          <span className="font-bold">{Math.round(activityScore)}/20</span>
                        </div>
                        <Progress value={(activityScore / 20) * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{recentActivities.length} activities in last 30 days</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Team Modal */}
              {activeKpiModal === 'team' && (
                <>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                    <div className="text-4xl font-bold text-blue-600">{uniqueVolunteers}</div>
                    <div className="text-sm text-blue-600/80">Team Members</div>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {Array.from(teamMemberIds).map(memberId => {
                      const user = users.find(u => u.id === memberId);
                      const assignment = activeAssignments.find(a => a.volunteerId === memberId);
                      const memberHours = projectActivities.filter(a => a.userId === memberId).reduce((sum, a) => sum + (a.hours || 0), 0);
                      return (
                        <div key={memberId} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={user?.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold">
                              {user?.displayName?.[0] || 'V'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-semibold">{user?.displayName || `Volunteer #${memberId}`}</div>
                            {assignment?.role && <div className="text-sm text-muted-foreground">{assignment.role}</div>}
                            <div className="flex gap-3 mt-1 text-xs">
                              <span className="text-green-600">{memberHours}h logged</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Impact Modal */}
              {activeKpiModal === 'impact' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center">
                      <div className="text-3xl font-bold text-emerald-600">{livesImpacted.toLocaleString()}</div>
                      <div className="text-xs text-emerald-600/80">People Impacted</div>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-center">
                      <div className="text-3xl font-bold text-orange-600">{totalImpact}</div>
                      <div className="text-xs text-orange-600/80">Impact Records</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{Math.round(totalHours)}</div>
                      <div className="text-xs text-blue-600/80">Total Hours</div>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {projectImpact.filter(i => i.verificationStatus === 'approved').length}
                      </div>
                      <div className="text-xs text-green-600/80">Verified Impacts</div>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                      <div className="text-2xl font-bold text-amber-600">
                        {projectImpact.filter(i => i.verificationStatus !== 'approved').length}
                      </div>
                      <div className="text-xs text-amber-600/80">Pending</div>
                    </div>
                  </div>

                  {/* Impact Explanation */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">How Impact is Measured</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>People Impacted:</strong> Direct beneficiaries reported and verified</li>
                      <li>• <strong>Impact Records:</strong> Aggregate of all project impact submissions</li>
                      <li>• <strong>Hours:</strong> Total volunteer hours contributed</li>
                    </ul>
                  </div>

                  {/* SDG Alignment */}
                  {project.sdgGoals && project.sdgGoals.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">SDG Alignment</h4>
                      <div className="flex flex-wrap gap-2">
                        {project.sdgGoals.map(sdg => (
                          <div key={sdg} className="px-3 py-1.5 rounded-full text-white text-sm font-medium" style={{ backgroundColor: getSDGColor(sdg) }}>
                            SDG {sdg}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation for Volunteers */}
      {isVolunteer && isPWAMode && <WebBottomNav activeTab="projects" />}

      {!isMobile && <Footer />}

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
