import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { formatDecimal } from "@/lib/format-utils";
import { ArrowLeft, Clock, MapPin, Target, Briefcase, Award, Home, Sparkles, BarChart3, User, MessageCircle, CheckCircle, Circle, Play, Plus, X, Users, TrendingUp } from "lucide-react";
import VolunteerPWANav from "@/components/layout/volunteer-pwa-nav";
import OrganizationPWANav from "@/components/layout/organization-pwa-nav";
import CSRPWANav from "@/components/layout/csr-pwa-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SDG_GOALS } from "@shared/sdg-goals";
import ProjectChat from "@/components/project/project-chat";
import MatchAnalysisModal from "@/components/volunteer/match-analysis-modal";
import { format } from "date-fns";

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

export default function ProjectDetailPWA() {
  const [, params] = useRoute("/projects/:id/pwa");
  const [, navigate] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : null;
  const [showMatchAnalysis, setShowMatchAnalysis] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskHours, setTaskHours] = useState("");
  const [taskImpact, setTaskImpact] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const { toast } = useToast();

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const userId = localStorage.getItem('currentUserId');
  const userType = localStorage.getItem('userType') || 'volunteer';

  const handleBack = () => {
    // Use history back if available, otherwise navigate to appropriate dashboard
    if (window.history.length > 2) {
      window.history.back();
    } else {
      const dashboardPath = userType === 'organization'
        ? '/organization-dashboard/pwa'
        : userType === 'corporate-partner' || userType === 'corporate_partner'
        ? '/csr-dashboard-pwa'
        : '/volunteer-dashboard';
      navigate(dashboardPath);
    }
  };

  const { data: project, isLoading } = useQuery<any>({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project");
      return response.json();
    },
    enabled: !!projectId,
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
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

  // Fetch impact metrics to get the default metric ID
  const { data: impactMetrics = [] } = useQuery<any[]>({
    queryKey: ["/api/impact-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/impact-metrics");
      if (!response.ok) return [];
      return response.json();
    },
  });

  const livesImpactedMetricId = impactMetrics.find(
    (m: any) => m.name === "Lives Impacted" || m.category === "general"
  )?.id || 1;

  // Fetch volunteer's AIU summary to get accurate project AIU
  const { data: aiuSummary } = useQuery<{
    totalAiu: number;
    projects: Array<{ projectId: number; aiu: number; hours: number; role: string }>;
  }>({
    queryKey: ["/api/aiu/volunteer", userId],
    queryFn: async () => {
      const response = await fetch(`/api/aiu/volunteer/${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
  });

  // Get project-specific AIU from volunteer's AIU summary (single source of truth)
  const projectAiu = aiuSummary?.projects?.find(p => p.projectId === projectId)?.aiu || 0;
  const projectHoursFromAiu = aiuSummary?.projects?.find(p => p.projectId === projectId)?.hours || 0;

  const applyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/applications", {
        projectId,
        message: "Interested in this project"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({ title: "Applied successfully", description: "Your application has been submitted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to apply", variant: "destructive" });
    }
  });

  // Log activity for a task
  const logActivityMutation = useMutation({
    mutationFn: async (data: { taskId: number; hours: number; notes: string }) => {
      const response = await fetch("/api/volunteer-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parseInt(userId || '0'),
          projectId,
          taskId: data.taskId,
          hours: data.hours,
          date: new Date().toISOString(),
          description: data.notes || `Worked on task: ${selectedTask?.title}`,
          activityType: "task_work",
        }),
      });
      if (!response.ok) throw new Error("Failed to log activity");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/volunteer-activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({ title: "Hours Logged", description: `${taskHours} hours logged for this task.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log hours", variant: "destructive" });
    }
  });

  // Log impact for a task
  const logImpactMutation = useMutation({
    mutationFn: async (data: { taskId: number; value: number; notes: string }) => {
      const response = await fetch("/api/project-impacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          userId: parseInt(userId || '0'),
          taskId: data.taskId,
          metricId: livesImpactedMetricId,
          value: data.value,
          date: new Date().toISOString(),
          notes: data.notes || `Impact from task: ${selectedTask?.title}`,
          outcomeType: "individual",
          role: "lead",
        }),
      });
      if (!response.ok) throw new Error("Failed to log impact");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-impacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({ title: "Impact Logged", description: `${taskImpact} people impacted recorded.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log impact", variant: "destructive" });
    }
  });

  // Handle task submission
  const handleTaskSubmit = () => {
    if (!selectedTask) return;

    const hours = parseFloat(taskHours);
    const impact = parseInt(taskImpact);

    if (hours > 0) {
      logActivityMutation.mutate({
        taskId: selectedTask.id,
        hours,
        notes: taskNotes,
      });
    }

    if (impact > 0) {
      logImpactMutation.mutate({
        taskId: selectedTask.id,
        value: impact,
        notes: taskNotes,
      });
    }

    // Reset and close
    setTaskHours("");
    setTaskImpact("");
    setTaskNotes("");
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  // Open task modal
  const openTaskModal = (task: any) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-sky-50 to-slate-100">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-sky-50 to-slate-100 flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
        <Link href="/projects">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const projectTasks = tasks.filter((t: any) => t.projectId === projectId);
  const primarySdg = project.primarySdg || project.sdgGoals?.[0];
  const sdgGoal = primarySdg ? SDG_GOALS[primarySdg] : null;

  // Simple consistent header for project detail - matches organization dashboard PWA style
  const renderHeader = () => {
    // Use organization-style amber gradient for org users, slate for others
    const isOrg = userType === 'organization';
    const headerBg = isOrg
      ? 'linear-gradient(to right, #fffbeb 0%, #fef3c7 30%, #fcd34d 70%, #f59e0b 100%)'
      : 'linear-gradient(to right, #1e293b, #0f172a)';
    const textColor = isOrg ? 'text-slate-800' : 'text-white';
    const subTextColor = isOrg ? 'text-slate-600' : 'text-white/60';
    const buttonBg = isOrg ? 'bg-white/80 hover:bg-white' : 'bg-white/10 hover:bg-white/20';
    const iconColor = isOrg ? 'text-slate-700' : 'text-white';

    return (
      <header className="fixed top-0 left-0 right-0 z-50 shadow-lg" style={{ background: headerBg }}>
        <div className="pt-[max(0.5rem,env(safe-area-inset-top))]" />
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleBack}
            className={`w-10 h-10 rounded-full ${buttonBg} flex items-center justify-center transition-all`}
          >
            <ArrowLeft className={`w-5 h-5 ${iconColor}`} />
          </button>
          <div className="flex-1 min-w-0">
            <p className={`${textColor} font-semibold truncate`}>{project?.name || 'Project'}</p>
            <p className={`${subTextColor} text-xs truncate`}>{project?.organizationName || 'View Details'}</p>
          </div>
        </div>
      </header>
    );
  };

  // Render appropriate navigation based on user type
  const renderNav = () => {
    switch (userType) {
      case 'organization':
        return <OrganizationPWANav activeTab="projects" />;
      case 'corporate-partner':
      case 'corporate_partner':
        return <CSRPWANav activeTab="projects" />;
      default:
        return <VolunteerPWANav userId={userId || undefined} activeTab="projects" />;
    }
  };

  return (
    <div className="w-full min-h-screen h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col max-w-full overflow-hidden">
      {/* PWA Header - User Type Aware */}
      {renderHeader()}

      {/* Spacer for fixed header */}
      <div className="h-[calc(3.5rem+max(0.5rem,env(safe-area-inset-top)))]" />

      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto pb-20 w-full max-w-full">
        {/* Hero Image Section */}
      <div className="relative w-full h-64 flex items-center justify-center overflow-hidden">
        {project.coverImage ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${project.coverImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/40" />
          </>
        ) : (
          <>
            {/* Dark gradient fallback for readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800" />
            <Briefcase className="h-20 w-20 text-white/30 relative z-10" />
          </>
        )}
      </div>

      {/* Match Score Badge */}
      {project.matchScore && (
        <div className="px-4 -mt-8 relative z-10 mb-4">
          <div className="bg-white rounded-lg shadow-md px-4 py-3 inline-flex items-center gap-2 border border-emerald-100">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
              {Math.round(project.matchScore)}%
            </div>
            <div className="text-sm">
              <p className="font-semibold text-slate-900">{project.requiredSkills?.[0] || "Project"} Role</p>
              <p className="text-xs text-slate-600">{project.experienceLevel ? `${project.experienceLevel} level` : 'High Affinity'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <div className="px-4 pb-4">
        <Card className="overflow-hidden">
          <CardContent className="p-6 space-y-4">
            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{project.name}</h2>
              <p className="text-sm text-slate-600">{project.description}</p>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left: Description with SDG */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 text-sm">Description</h3>
                {sdgGoal && (
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                      style={{ backgroundColor: SDG_COLORS[primarySdg!] }}
                    >
                      SDG {primarySdg}
                    </div>
                    <p className="text-xs font-semibold text-center text-slate-700">{SDG_NAMES[primarySdg!]}</p>
                    <p className="text-xs text-slate-600 text-center">Indicator {primarySdg}.1.1</p>
                  </div>
                )}
              </div>

              {/* Right: Why Good Match */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 space-y-2 border border-emerald-100">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-semibold text-slate-900 text-sm">Why this is a good match</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-700">
                  {project.requiredSkills && project.requiredSkills.length > 0 && (
                    <p>
                      Your profile skills in <span className="font-semibold text-emerald-700">{project.requiredSkills[0]}</span> align with the core needs.
                    </p>
                  )}
                  {project.sdgGoals && project.sdgGoals.length > 0 && (
                    <p>
                      You have expressed interest in <span className="font-semibold text-emerald-700">"{SDG_NAMES[project.sdgGoals[0]] || "Impact"}"</span> and similar projects.
                    </p>
                  )}
                  <button
                    onClick={() => setShowMatchAnalysis(true)}
                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium text-xs mt-2 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    View AI Analysis →
                  </button>
                </div>
              </div>
            </div>

            {/* Expected Tasks */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-900 mb-3">Expected Tasks</h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Time Commitment */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Time Commitment & Location</p>
                  <div className="space-y-1 text-xs text-slate-600">
                    {project.ongoingHoursPerWeek && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{project.ongoingHoursPerWeek} hrs/week (flexible)</span>
                      </div>
                    )}
                    {project.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>On-site, {project.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tasks Count */}
                <div className="bg-slate-50 rounded p-2 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{projectTasks.length}</p>
                    <p className="text-xs text-slate-600">tasks to complete</p>
                  </div>
                </div>
              </div>

              {/* AIU Metrics - Using volunteer's AIU summary as single source of truth */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Your AIUs Earned</p>
                      <p className="text-xs text-slate-500">Attributable Impact Units</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">{formatDecimal(projectAiu)}</p>
                    <p className="text-[10px] text-slate-500">{projectHoursFromAiu > 0 ? `${projectHoursFromAiu} hrs logged` : 'Start contributing!'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Task List - Clickable */}
            {projectTasks.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  Project Tasks
                </h3>
                <div className="space-y-2">
                  {projectTasks.map((task: any) => {
                    const statusColor = task.status?.toLowerCase() === 'completed' ? 'bg-emerald-500' :
                                       task.status?.toLowerCase() === 'in progress' ? 'bg-blue-500' : 'bg-gray-400';
                    const statusIcon = task.status?.toLowerCase() === 'completed' ? CheckCircle :
                                      task.status?.toLowerCase() === 'in progress' ? Play : Circle;
                    const StatusIcon = statusIcon;

                    return (
                      <button
                        key={task.id}
                        onClick={() => openTaskModal(task)}
                        className="w-full text-left bg-white border border-slate-200 rounded-lg p-3 hover:border-emerald-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full ${statusColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <StatusIcon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm truncate">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                              {task.priority && (
                                <span className={`px-1.5 py-0.5 rounded ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {task.priority}
                                </span>
                              )}
                              {task.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(task.dueDate), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-emerald-500">
                            <Plus className="w-5 h-5" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Apply Button */}
            <Button
              onClick={() => !hasApplied && applyMutation.mutate()}
              disabled={applyMutation.isPending || hasApplied}
              className={`w-full ${
                hasApplied
                  ? 'bg-gray-600 hover:bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-400 to-blue-500 hover:from-emerald-500 hover:to-blue-600'
              } text-white font-semibold py-3 rounded-lg`}
              data-testid="button-apply-project"
            >
              {hasApplied ? "Already Applied" : applyMutation.isPending ? "Applying..." : "Apply for Project"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Project Chat */}
      {project && project.organizationId && (
        <ProjectChat
          projectId={projectId!}
          projectName={project.name}
          organizationId={project.organizationId}
          organizationName={project.organizationName}
        />
      )}

      {/* AI Match Analysis Modal */}
      <MatchAnalysisModal
        isOpen={showMatchAnalysis}
        onClose={() => setShowMatchAnalysis(false)}
        projectId={projectId!}
        projectName={project.name}
      />

      {/* Task Log Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h2 className="text-slate-800 text-lg font-semibold">Log Time & Impact</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedTask.title}</p>
              </div>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                  setTaskHours("");
                  setTaskImpact("");
                  setTaskNotes("");
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Task Info */}
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium text-slate-800 text-sm">Task Details</span>
                </div>
                {selectedTask.description && (
                  <p className="text-xs text-slate-600">{selectedTask.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  {selectedTask.status && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      selectedTask.status?.toLowerCase() === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      selectedTask.status?.toLowerCase() === 'in progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedTask.status}
                    </span>
                  )}
                  {selectedTask.priority && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      selectedTask.priority === 'high' ? 'bg-red-100 text-red-700' :
                      selectedTask.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedTask.priority} priority
                    </span>
                  )}
                </div>
              </div>

              {/* Hours Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Hours Worked
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="Enter hours (e.g., 2.5)"
                  value={taskHours}
                  onChange={(e) => setTaskHours(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Impact Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  People Impacted
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Number of people reached"
                  value={taskImpact}
                  onChange={(e) => setTaskImpact(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Notes Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <MessageCircle className="w-4 h-4 text-purple-500" />
                  Notes (Optional)
                </label>
                <Textarea
                  placeholder="Describe what you accomplished..."
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  rows={3}
                  className="w-full resize-none"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleTaskSubmit}
                disabled={(!taskHours || parseFloat(taskHours) <= 0) && (!taskImpact || parseInt(taskImpact) <= 0)}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Log Activity
              </Button>

              <p className="text-[10px] text-slate-400 text-center">
                Your contribution will be tracked and reflected in your impact metrics
              </p>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Bottom Navigation - User Type Aware */}
      {renderNav()}
    </div>
  );
}
