import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatDecimal } from "@/lib/format-utils";
import OrganizationHeader from "@/components/layout/organization-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import VolunteerNav from "@/components/layout/volunteer-nav";
import WebBottomNav from "@/components/layout/web-bottom-nav";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [, params] = useRoute("/projects/:id");
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const projectId = params?.id ? parseInt(params.id) : null;
  const userId = localStorage.getItem('currentUserId');

  // Redirect mobile users to PWA route
  useEffect(() => {
    if (isMobile && projectId) {
      navigate(`/projects/${projectId}/pwa`, { replace: true });
    }
  }, [isMobile, projectId, navigate]);

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
  const [activeKpiModal, setActiveKpiModal] = useState<'volunteers' | 'hours' | 'tasks' | 'aiu' | 'engagement' | 'team' | 'impact' | null>(null);

  // AIU Adjustment mode state
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

  // Verify AIU impact mutation
  const verifyAiuMutation = useMutation({
    mutationFn: async ({ status }: { status: 'verified' | 'rejected' }) => {
      return apiRequest("POST", `/api/projects/${projectId}/verify-aiu`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/aiu/project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: variables.status === 'verified' ? "AIU Verified" : "AIU Rejected",
        description: variables.status === 'verified'
          ? "The impact has been verified and AIU credits confirmed."
          : "The impact record has been rejected."
      });
      setActiveKpiModal(null);
      setIsAdjusting(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update verification status", variant: "destructive" });
    }
  });

  // Adjust and verify AIU mutation - updates metrics and verifies
  const adjustAndVerifyMutation = useMutation({
    mutationFn: async ({ livesImpacted, verificationNotes }: { livesImpacted: number; verificationNotes: string }) => {
      // Verify the AIU with adjusted values (backend will handle both update and verification)
      return apiRequest("POST", `/api/projects/${projectId}/verify-aiu`, {
        status: 'verified',
        adjustedLivesImpacted: livesImpacted,
        notes: verificationNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aiu/project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "AIU Adjusted & Verified",
        description: "The impact metrics have been adjusted and verified successfully."
      });
      setActiveKpiModal(null);
      setIsAdjusting(false);
      setAdjustmentValues({ livesImpacted: 0, verificationNotes: '' });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to adjust and verify impact", variant: "destructive" });
    }
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
  const livesImpacted = projectAIU?.livesImpacted ?? project.livesTouched ?? 0;

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

  const isVolunteer = currentUser?.userType === 'volunteer';

  return (
    <div className="fixed inset-0 bg-[#f8f9fa] dark:bg-slate-900 overflow-y-auto overflow-x-hidden">
      {/* Volunteer Desktop Navigation */}
      <VolunteerNav />

      <div className="min-h-full pb-36 md:pb-0">
      {isOrganization && <OrganizationHeader activeTab="projects" />}

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
            onClick={() => setActiveKpiModal('aiu')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatDecimal(aiuEarned)}</div>
                  <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80">AIUs Earned</div>
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

            {/* Team Members Card - Enhanced with AIU data and assignments */}
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
                                <span className="text-xs text-muted-foreground">{formatDecimal(vol.hours)}h • {formatDecimal(vol.aiu)} AIU</span>
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
                {/* AIU Display - Enhanced */}
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide font-semibold">AIUs Earned</div>
                  </div>
                  <div className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">{formatDecimal(aiuEarned)}</div>
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
                        value={project.livesTouched || 0}
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
                          <span className="font-semibold text-emerald-600">{formatDecimal(vol.aiu)} AIU</span>
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
              {canEditProject && (!projectAIU?.verificationStatus || projectAIU?.verificationStatus === 'pending') && (
                <Button
                  className="w-full justify-start gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md transition-all"
                  onClick={() => setActiveKpiModal('aiu')}
                  data-testid="button-verify-aiu"
                >
                  <Shield className="h-4 w-4" />
                  Verify Pending AIU
                </Button>
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
                {activeKpiModal === 'aiu' && 'AIU Impact Details'}
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
                    {projectAIU?.volunteers?.map((vol, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-blue-500 text-white">{vol.volunteerName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium">{vol.volunteerName}</div>
                          <div className="text-xs text-muted-foreground">{vol.role} • {vol.hours}h logged</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-600">{formatDecimal(vol.aiu)}</div>
                          <div className="text-xs text-muted-foreground">AIU</div>
                        </div>
                      </div>
                    )) || <p className="text-center text-muted-foreground py-4">No volunteer data available</p>}
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
                      <div className="text-xl font-bold">{project.projectTotalHours || 0}</div>
                      <div className="text-xs text-muted-foreground">Target Hours</div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
                      <div className="text-xl font-bold">{project.projectTotalHours ? Math.round((totalHours / project.projectTotalHours) * 100) : 0}%</div>
                      <div className="text-xs text-muted-foreground">Progress</div>
                    </div>
                  </div>
                  {projectAIU?.volunteers && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Hours by Volunteer</h4>
                      {projectAIU.volunteers.map((vol, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700 rounded">
                          <span>{vol.volunteerName}</span>
                          <span className="font-medium">{vol.hours}h</span>
                        </div>
                      ))}
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

              {/* AIU Modal with Verification */}
              {activeKpiModal === 'aiu' && (
                <>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center">
                    <div className="text-4xl font-bold text-emerald-600">{formatDecimal(aiuEarned)}</div>
                    <div className="text-sm text-emerald-600/80">Total AIUs Earned</div>
                    {projectAIU?.verificationStatus && (
                      <Badge className={`mt-2 ${projectAIU.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {projectAIU.verificationStatus === 'verified' ? 'Verified' : 'Pending Verification'}
                      </Badge>
                    )}
                  </div>

                  {/* AIU Explanation */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <strong>AIU (Attributable Impact Units)</strong> measure real-world social impact. Calculated from volunteer hours, SDG alignment, and verified beneficiary data.
                      </div>
                    </div>
                  </div>

                  {/* Per-volunteer AIU breakdown */}
                  {projectAIU?.volunteers && projectAIU.volunteers.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">AIU by Contributor</h4>
                      {projectAIU.volunteers.map((vol, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700 rounded">
                          <span>{vol.volunteerName}</span>
                          <span className="font-bold text-emerald-600">{formatDecimal(vol.aiu)} AIU</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Verification Actions for Org Admin */}
                  {canEditProject && (!projectAIU?.verificationStatus || projectAIU?.verificationStatus === 'pending') && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200">
                      <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Verify Impact
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                        As the organization admin, you can verify, adjust, or reject this impact data.
                      </p>

                      {/* Adjustment Form */}
                      {isAdjusting ? (
                        <div className="space-y-4 mb-4">
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Number of People Served / Lives Impacted
                            </label>
                            <input
                              type="number"
                              value={adjustmentValues.livesImpacted}
                              onChange={(e) => setAdjustmentValues(prev => ({ ...prev, livesImpacted: parseInt(e.target.value) || 0 }))}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-slate-700 dark:border-slate-600"
                              placeholder="Enter adjusted number"
                              min="0"
                            />
                            <p className="text-xs text-slate-500 mt-1">Current value: {livesImpacted}</p>
                          </div>
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Verification Notes (Optional)
                            </label>
                            <textarea
                              value={adjustmentValues.verificationNotes}
                              onChange={(e) => setAdjustmentValues(prev => ({ ...prev, verificationNotes: e.target.value }))}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-slate-700 dark:border-slate-600"
                              placeholder="Add notes about this adjustment..."
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => adjustAndVerifyMutation.mutate({
                                livesImpacted: adjustmentValues.livesImpacted,
                                verificationNotes: adjustmentValues.verificationNotes
                              })}
                              disabled={adjustAndVerifyMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {adjustAndVerifyMutation.isPending ? 'Saving...' : 'Save & Verify'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsAdjusting(false);
                                setAdjustmentValues({ livesImpacted: livesImpacted, verificationNotes: '' });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Current Values Display */}
                          <div className="p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg mb-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-400">Lives Impacted:</span>
                              <span className="font-medium">{livesImpacted}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-400">Total Hours:</span>
                              <span className="font-medium">{totalHours}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-400">AIU Calculated:</span>
                              <span className="font-medium text-emerald-600">{formatDecimal(aiuEarned)}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => verifyAiuMutation.mutate({ status: 'verified' })}
                              disabled={verifyAiuMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Verify
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 border-amber-400 text-amber-700 hover:bg-amber-50"
                              onClick={() => {
                                setIsAdjusting(true);
                                setAdjustmentValues({ livesImpacted: livesImpacted, verificationNotes: '' });
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Adjust
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => verifyAiuMutation.mutate({ status: 'rejected' })}
                              disabled={verifyAiuMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show verified status if already verified */}
                  {canEditProject && projectAIU?.verificationStatus === 'verified' && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-semibold">Impact Verified</span>
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        This project's impact has been verified by the organization.
                      </p>
                    </div>
                  )}
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
                    {projectAIU?.volunteers?.map((vol, idx) => {
                      const user = users.find(u => u.id === vol.volunteerId);
                      return (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={user?.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold">
                              {vol.volunteerName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-semibold">{vol.volunteerName}</div>
                            <div className="text-sm text-muted-foreground">{vol.role}</div>
                            <div className="flex gap-3 mt-1 text-xs">
                              <span className="text-green-600">{vol.hours}h logged</span>
                              <span className="text-emerald-600">{formatDecimal(vol.aiu)} AIU</span>
                            </div>
                          </div>
                        </div>
                      );
                    }) || Array.from(teamMemberIds).map(memberId => {
                      const user = users.find(u => u.id === memberId);
                      const assignment = activeAssignments.find(a => a.volunteerId === memberId);
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
                      <div className="text-3xl font-bold text-emerald-600">{formatDecimal(aiuEarned)}</div>
                      <div className="text-xs text-emerald-600/80">AIUs Earned</div>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-center">
                      <div className="text-3xl font-bold text-orange-600">{livesImpacted.toLocaleString()}</div>
                      <div className="text-xs text-orange-600/80">Lives Impacted</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{Math.round(totalHours)}</div>
                      <div className="text-xs text-blue-600/80">Total Hours</div>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">{totalImpact}</div>
                      <div className="text-xs text-purple-600/80">Impact Score</div>
                    </div>
                  </div>

                  {/* Impact Explanation */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">How Impact is Measured</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>AIUs:</strong> Calculated from hours, SDG alignment, and verified outcomes</li>
                      <li>• <strong>Lives Impacted:</strong> Direct beneficiaries reported and verified</li>
                      <li>• <strong>Impact Score:</strong> Aggregate of all project impact records</li>
                    </ul>
                  </div>

                  {/* SDG Alignment */}
                  {project.sdgGoals && project.sdgGoals.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">SDG Alignment</h4>
                      <div className="flex flex-wrap gap-2">
                        {project.sdgGoals.map(sdg => (
                          <div key={sdg} className="px-3 py-1.5 rounded-full text-white text-sm font-medium" style={{ backgroundColor: SDG_COLORS[sdg] }}>
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

      {/* Mobile Bottom Navigation */}
      {isOrganization && <MobileBottomNav />}
      {isVolunteer && isMobile && <WebBottomNav activeTab="projects" />}

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
