import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Clock, Calendar as CalendarIcon, Save, ArrowLeft, CheckCircle, MoreVertical, Settings, MessageCircle, Award, Bell, HelpCircle, LogOut, Compass, Home, User as UserIcon, TrendingUp, Users, Briefcase, Lightbulb, BarChart3, ClipboardList, Target, Circle, Play, ChevronDown, ChevronUp, X } from "lucide-react";
import { format } from "date-fns";
import type { User } from "@shared/schema";
import logoUrl from "@assets/Synerxus Modern Logo  NBG_1763706841211.png";

export default function LogActivity() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"activity" | "impact">("activity");

  // Activity form state
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [hours, setHours] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [activityType, setActivityType] = useState<string>("volunteering");
  const [showTasksSection, setShowTasksSection] = useState<boolean>(true);

  // Impact form state
  const [impactProjectId, setImpactProjectId] = useState<string>("");
  const [impactTaskId, setImpactTaskId] = useState<string>("");
  const [impactDate, setImpactDate] = useState<Date>(new Date());
  const [peopleReached, setPeopleReached] = useState<string>("");
  const [impactDescription, setImpactDescription] = useState<string>("");
  const [impactCategory, setImpactCategory] = useState<string>("direct");
  const [showImpactTasksSection, setShowImpactTasksSection] = useState<boolean>(true);

  // Task comment modal state
  const [selectedTaskForComment, setSelectedTaskForComment] = useState<any>(null);
  const [taskComment, setTaskComment] = useState<string>("");

  // Fetch current user
  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me", storedUserId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    },
  });

  // Fetch volunteer's project assignments (includes enriched project data)
  const { data: projectAssignmentsRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/project-assignments", { volunteerId: currentUser?.id }],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/project-assignments?volunteerId=${currentUser.id}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!currentUser?.id
  });
  // Ensure projectAssignments is always an array
  const projectAssignments = Array.isArray(projectAssignmentsRaw) ? projectAssignmentsRaw : [];

  // Fetch all projects for this user
  const { data: allProjects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", { userId: currentUser?.id }],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/projects?userId=${currentUser.id}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!currentUser?.id,
  });

  // Fetch impact metrics to get the default "Lives Impacted" metric ID
  const { data: impactMetrics = [] } = useQuery<any[]>({
    queryKey: ["/api/impact-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/impact-metrics");
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Find the "Lives Impacted" metric ID
  const livesImpactedMetricId = impactMetrics.find(
    (m: any) => m.name === "Lives Impacted" || m.category === "general"
  )?.id || 1;

  // Fetch all tasks
  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const response = await fetch("/api/tasks");
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Get tasks for selected project (activity form)
  const projectTasks = selectedProjectId
    ? allTasks.filter((task: any) => task.projectId === parseInt(selectedProjectId))
    : [];

  // Get tasks for impact project
  const impactProjectTasks = impactProjectId
    ? allTasks.filter((task: any) => task.projectId === parseInt(impactProjectId))
    : [];

  // Get available projects - show all projects, prioritizing assigned ones
  // Get assigned project IDs for reference
  const assignedProjectIds = new Set(
    projectAssignments
      .filter((assignment: any) => assignment.projectId && assignment.status !== 'removed')
      .map((assignment: any) => assignment.projectId)
  );

  // Use all projects as primary source, but include enriched data from assignments where available
  const availableProjects = Array.isArray(allProjects)
    ? allProjects.map((project: any) => {
        // Check if we have enriched data from assignments
        const assignmentWithData = projectAssignments.find(
          (assignment: any) => assignment.projectId === project.id && assignment.project
        );
        return assignmentWithData?.project || project;
      })
    : [];

  // Log activity mutation
  const logActivityMutation = useMutation({
    mutationFn: async (activityData: any) => {
      const response = await fetch("/api/volunteer-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityData),
      });
      if (!response.ok) throw new Error("Failed to log activity");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/volunteer-activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });

      toast({
        title: "Activity Logged",
        description: "Your volunteer hours have been recorded successfully.",
      });

      // Reset form
      setSelectedProjectId("");
      setSelectedTaskId("");
      setHours("");
      setDescription("");
      setActivityType("volunteering");
      setDate(new Date());
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to log activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Record impact mutation - uses /api/project-impacts endpoint
  const recordImpactMutation = useMutation({
    mutationFn: async (impactData: any) => {
      const response = await fetch("/api/project-impacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(impactData),
      });
      if (!response.ok) throw new Error("Failed to record impact");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-impacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });

      toast({
        title: "Impact Recorded",
        description: "Your impact has been recorded successfully.",
      });

      // Reset form
      setImpactProjectId("");
      setImpactTaskId("");
      setPeopleReached("");
      setImpactDescription("");
      setImpactCategory("direct");
      setImpactDate(new Date());
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record impact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProjectId || !hours || !date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const activityData = {
      userId: currentUser?.id,
      projectId: parseInt(selectedProjectId),
      taskId: selectedTaskId ? parseInt(selectedTaskId) : null,
      date: format(date, "yyyy-MM-dd"),
      hours: parseFloat(hours),
      description: description || null,
      activityType,
    };

    logActivityMutation.mutate(activityData);
  };

  const handleImpactSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!impactProjectId || !peopleReached || !impactDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Format data for /api/project-impacts endpoint
    // Uses value field (lives impacted) and includes userId for tracking
    const impactData = {
      projectId: parseInt(impactProjectId),
      taskId: impactTaskId ? parseInt(impactTaskId) : null,
      userId: currentUser?.id,
      metricId: livesImpactedMetricId, // Use dynamically fetched "Lives Impacted" metric ID
      value: parseInt(peopleReached), // Lives impacted / people reached
      date: new Date(impactDate).toISOString(),
      notes: impactDescription || null,
      outcomeType: impactCategory === 'direct' ? 'individual' : impactCategory === 'community' ? 'shared' : 'individual',
      role: 'lead', // Volunteer logging their own impact
    };

    recordImpactMutation.mutate(impactData);
  };

  const isVolunteer = currentUser?.userType === 'volunteer';

  return (
    <div className={`min-h-screen ${isMobile && isVolunteer ? 'bg-[#FDF8F3] max-w-[428px] mx-auto pb-24' : 'bg-background'}`}>
      {/* PWA Header for Volunteers on Mobile */}
      {isMobile && isVolunteer && (
        <header className="bg-[#2a4068] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src={logoUrl} alt="Synerxus Logo" className="h-12 w-auto object-contain" />
          </button>
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-white/10 rounded-full"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Floating Menu */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute top-12 right-0 bg-[#16213e] border border-gray-700 rounded-lg shadow-xl w-56 z-50">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setLocation('/volunteer-dashboard');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <Home className="w-4 h-4" />
                      <span>Dashboard</span>
                    </button>
                    <button
                      onClick={() => {
                        setLocation('/my-work');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <Clock className="w-4 h-4" />
                      <span>My Work</span>
                    </button>
                    <button
                      onClick={() => {
                        setLocation('/discover-opportunities');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <Compass className="w-4 h-4" />
                      <span>Discover Opportunities</span>
                    </button>
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                      onClick={() => {
                        setLocation('/volunteer-profile-settings');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Profile Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        setLocation('/volunteer-messages/pwa');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Messages</span>
                    </button>
                    <button
                      onClick={() => {
                        setLocation('/achievements');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <Award className="w-4 h-4" />
                      <span>Achievements</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <Bell className="w-4 h-4" />
                      <span>Notifications</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>Help & Support</span>
                    </button>
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                      onClick={() => {
                        localStorage.clear();
                        setLocation('/login');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>
      )}

      {/* Back Button for Non-PWA */}
      {(!isMobile || !isVolunteer) && (
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/my-work')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Work
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className={`${isMobile && isVolunteer ? 'px-4 py-6' : 'max-w-2xl mx-auto px-4 py-6'}`}>
        <Card className={isMobile && isVolunteer ? 'bg-white border-amber-200/60 shadow-sm' : ''}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isMobile && isVolunteer ? 'text-slate-800' : ''}`}>
              <Clock className="w-6 h-6 text-emerald-600" />
              Log Activity & Record Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "activity" | "impact")} className="w-full">
              <TabsList className={`grid w-full grid-cols-2 ${isMobile && isVolunteer ? 'bg-slate-100' : ''}`}>
                <TabsTrigger value="activity" className={isMobile && isVolunteer ? 'data-[state=active]:bg-emerald-500 data-[state=active]:text-white' : ''}>
                  <Clock className="w-4 h-4 mr-2" />
                  Log Activity
                </TabsTrigger>
                <TabsTrigger value="impact" className={isMobile && isVolunteer ? 'data-[state=active]:bg-emerald-500 data-[state=active]:text-white' : ''}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Record Impact
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="mt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Selection */}
              <div className="space-y-2">
                <Label htmlFor="project" className={isMobile && isVolunteer ? 'text-slate-700' : ''}>
                  Project <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="project" className={isMobile && isVolunteer ? 'bg-slate-50 border-slate-200 text-slate-800' : ''}>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent className={isMobile && isVolunteer ? 'bg-white border-slate-200 text-slate-800' : ''}>
                    {availableProjects.length === 0 ? (
                      <SelectItem value="none" disabled>Loading projects...</SelectItem>
                    ) : (
                      availableProjects.map((project: any) => {
                        const isAssigned = assignedProjectIds.has(project.id);
                        const label = `${project.name}${isAssigned ? ' (Assigned)' : ''}`;
                        return (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {label}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Tasks Section - Collapsible list of project tasks */}
              {selectedProjectId && projectTasks.length > 0 && (
                <div className={`space-y-2 rounded-lg border ${isMobile && isVolunteer ? 'border-amber-200/60 bg-amber-50/50' : 'border-slate-200 bg-slate-50'}`}>
                  <button
                    type="button"
                    onClick={() => setShowTasksSection(!showTasksSection)}
                    className={`w-full flex items-center justify-between p-3 ${isMobile && isVolunteer ? 'text-slate-800' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium text-sm">Project Tasks ({projectTasks.length})</span>
                    </div>
                    {showTasksSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showTasksSection && (
                    <div className="px-3 pb-3 space-y-2">
                      {projectTasks.map((task: any) => {
                        const isSelected = selectedTaskId === task.id.toString();
                        const statusColor = task.status?.toLowerCase() === 'completed' ? 'bg-emerald-500' :
                                           task.status?.toLowerCase() === 'in progress' ? 'bg-blue-500' : 'bg-gray-400';
                        const StatusIcon = task.status?.toLowerCase() === 'completed' ? CheckCircle :
                                          task.status?.toLowerCase() === 'in progress' ? Play : Circle;

                        return (
                          <div
                            key={task.id}
                            className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50'
                                : isMobile && isVolunteer
                                  ? 'border-slate-200 bg-white hover:border-emerald-300'
                                  : 'border-slate-200 bg-white hover:border-emerald-300'
                            }`}
                            onClick={() => setSelectedTaskId(isSelected ? "" : task.id.toString())}
                          >
                            <div className={`w-5 h-5 rounded-full ${statusColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <StatusIcon className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm truncate ${isMobile && isVolunteer ? 'text-slate-800' : ''}`}>{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                {task.priority && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                    task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {task.priority}
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="text-[10px] text-emerald-600 font-medium">✓ Selected</span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTaskForComment(task);
                                setTaskComment(description || "");
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                              title="Add comment for this task"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Date Selection */}
              <div className="space-y-2">
                <Label htmlFor="date" className={isMobile && isVolunteer ? 'text-slate-700' : ''}>
                  Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        isMobile && isVolunteer ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100' : ''
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => newDate && setDate(newDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Hours Input */}
              <div className="space-y-2">
                <Label htmlFor="hours" className={isMobile && isVolunteer ? 'text-slate-700' : ''}>
                  Hours <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g., 2.5"
                  className={isMobile && isVolunteer ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400' : ''}
                />
              </div>

              {/* Activity Type */}
              <div className="space-y-2">
                <Label htmlFor="activityType" className={isMobile && isVolunteer ? 'text-slate-700' : ''}>
                  Activity Type
                </Label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger id="activityType" className={isMobile && isVolunteer ? 'bg-slate-50 border-slate-200 text-slate-800' : ''}>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent className={isMobile && isVolunteer ? 'bg-white border-slate-200 text-slate-800' : ''}>
                    <SelectItem value="volunteering">Volunteering</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className={isMobile && isVolunteer ? 'text-slate-700' : ''}>
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you did..."
                  rows={4}
                  className={isMobile && isVolunteer ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400' : ''}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={logActivityMutation.isPending || !selectedProjectId || !hours}
                  className={`flex-1 ${
                    isMobile && isVolunteer
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : ''
                  }`}
                >
                  {logActivityMutation.isPending ? (
                    <>Logging...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Log Activity
                    </>
                  )}
                </Button>
                {(!isMobile || !isVolunteer) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/my-work')}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>

          <TabsContent value="impact" className="mt-6">
            <form onSubmit={handleImpactSubmit} className="space-y-6">
              {/* Project Selection */}
              <div className="space-y-2">
                <Label htmlFor="impact-project" className={isMobile && isVolunteer ? 'text-slate-700' : ''}>
                  Project <span className="text-red-500">*</span>
                </Label>
                <Select value={impactProjectId} onValueChange={setImpactProjectId}>
                  <SelectTrigger id="impact-project" className={isMobile && isVolunteer ? 'bg-slate-50 border-slate-200 text-slate-800' : ''}>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent className={isMobile && isVolunteer ? 'bg-white border-slate-200 text-slate-800' : ''}>
                    {availableProjects.length === 0 ? (
                      <SelectItem value="none" disabled>Loading projects...</SelectItem>
                    ) : (
                      availableProjects.map((project: any) => {
                        const isAssigned = assignedProjectIds.has(project.id);
                        const label = `${project.name}${isAssigned ? ' (Assigned)' : ''}`;
                        return (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {label}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Tasks Section for Impact - Collapsible list of project tasks */}
              {impactProjectId && impactProjectTasks.length > 0 && (
                <div className={`space-y-2 rounded-lg border ${isMobile && isVolunteer ? 'border-amber-200/60 bg-amber-50/50' : 'border-slate-200 bg-slate-50'}`}>
                  <button
                    type="button"
                    onClick={() => setShowImpactTasksSection(!showImpactTasksSection)}
                    className={`w-full flex items-center justify-between p-3 ${isMobile && isVolunteer ? 'text-slate-800' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium text-sm">Project Tasks ({impactProjectTasks.length})</span>
                    </div>
                    {showImpactTasksSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showImpactTasksSection && (
                    <div className="px-3 pb-3 space-y-2">
                      {impactProjectTasks.map((task: any) => {
                        const isSelected = impactTaskId === task.id.toString();
                        const statusColor = task.status?.toLowerCase() === 'completed' ? 'bg-emerald-500' :
                                           task.status?.toLowerCase() === 'in progress' ? 'bg-blue-500' : 'bg-gray-400';
                        const StatusIcon = task.status?.toLowerCase() === 'completed' ? CheckCircle :
                                          task.status?.toLowerCase() === 'in progress' ? Play : Circle;

                        return (
                          <div
                            key={task.id}
                            className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50'
                                : isMobile && isVolunteer
                                  ? 'border-slate-200 bg-white hover:border-emerald-300'
                                  : 'border-slate-200 bg-white hover:border-emerald-300'
                            }`}
                            onClick={() => setImpactTaskId(isSelected ? "" : task.id.toString())}
                          >
                            <div className={`w-5 h-5 rounded-full ${statusColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <StatusIcon className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm truncate ${isMobile && isVolunteer ? 'text-slate-800' : ''}`}>{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                {task.priority && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                    task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {task.priority}
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="text-[10px] text-emerald-600 font-medium">✓ Selected</span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTaskForComment(task);
                                setTaskComment(impactDescription || "");
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                              title="Add comment for this task"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Date Selection */}
              <div className="space-y-2">
                <Label htmlFor="impact-date" className={isMobile && isVolunteer ? 'text-slate-700' : ''}>
                  Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        isMobile && isVolunteer ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100' : ''
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {impactDate ? format(impactDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={impactDate}
                      onSelect={(newDate) => newDate && setImpactDate(newDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Lives Impacted */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="peopleReached" className={isMobile && isVolunteer ? 'text-slate-700' : ''}>
                    Lives Impacted <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative group">
                    <HelpCircle className={`w-4 h-4 cursor-help ${isMobile && isVolunteer ? 'text-slate-500' : 'text-gray-500'}`} />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg z-50">
                      This number feeds into Attributable Impact Units (AIUs) calculation. AIU Unique counts each beneficiary once per reporting window and maps to SDG indicators.
                    </div>
                  </div>
                </div>
                <Input
                  id="peopleReached"
                  type="number"
                  min="1"
                  value={peopleReached}
                  onChange={(e) => setPeopleReached(e.target.value)}
                  placeholder="e.g., 50 people directly served"
                  className={isMobile && isVolunteer ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400' : ''}
                />
                <p className={`text-xs ${isMobile && isVolunteer ? 'text-slate-500' : 'text-gray-500'}`}>
                  Enter the number of unique individuals you directly served or helped during this activity.
                </p>
              </div>

              {/* Impact Category */}
              <div className="space-y-2">
                <Label htmlFor="impactCategory" className={isMobile && isVolunteer ? 'text-slate-700' : ''}>
                  Impact Category
                </Label>
                <Select value={impactCategory} onValueChange={setImpactCategory}>
                  <SelectTrigger id="impactCategory" className={isMobile && isVolunteer ? 'bg-slate-50 border-slate-200 text-slate-800' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className={isMobile && isVolunteer ? 'bg-white border-slate-200 text-slate-800' : ''}>
                    <SelectItem value="direct">Direct Impact</SelectItem>
                    <SelectItem value="indirect">Indirect Impact</SelectItem>
                    <SelectItem value="community">Community Impact</SelectItem>
                    <SelectItem value="environmental">Environmental Impact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="impactDescription" className={isMobile && isVolunteer ? 'text-slate-700' : ''}>
                  Impact Description (Optional)
                </Label>
                <Textarea
                  id="impactDescription"
                  value={impactDescription}
                  onChange={(e) => setImpactDescription(e.target.value)}
                  placeholder="Describe the impact made..."
                  rows={4}
                  className={isMobile && isVolunteer ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400' : ''}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={recordImpactMutation.isPending || !impactProjectId || !peopleReached}
                  className={`flex-1 ${
                    isMobile && isVolunteer
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : ''
                  }`}
                >
                  {recordImpactMutation.isPending ? (
                    <>Recording...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Record Impact
                    </>
                  )}
                </Button>
                {(!isMobile || !isVolunteer) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/my-work')}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>
        </Tabs>
          </CardContent>
        </Card>

        {/* Success Messages for PWA */}
        {logActivityMutation.isSuccess && isMobile && isVolunteer && activeTab === "activity" && (
          <Card className="mt-4 bg-emerald-500/20 border-emerald-500">
            <CardContent className="pt-6 flex items-center gap-3 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span>Activity logged successfully!</span>
            </CardContent>
          </Card>
        )}
        {recordImpactMutation.isSuccess && isMobile && isVolunteer && activeTab === "impact" && (
          <Card className="mt-4 bg-emerald-500/20 border-emerald-500">
            <CardContent className="pt-6 flex items-center gap-3 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span>Impact recorded successfully!</span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Navigation for PWA - Matching Dashboard Frame */}
      {isMobile && isVolunteer && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#16213e] border-t border-gray-700 px-2 py-2 max-w-[428px] mx-auto z-50" style={{ touchAction: 'manipulation' }}>
          <div className="flex justify-around items-center">
            <button
              type="button"
              onClick={() => setLocation('/volunteer-dashboard')}
              className="flex flex-col items-center py-1 px-3 rounded-lg transition-all text-gray-400 hover:text-gray-200"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <Home className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Home</span>
            </button>
            <button
              type="button"
              onClick={() => setLocation('/projects')}
              className="flex flex-col items-center py-1 px-3 rounded-lg transition-all text-gray-400 hover:text-gray-200"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <Briefcase className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Projects</span>
            </button>
            <button
              type="button"
              onClick={() => setLocation('/volunteer-dashboard')}
              className="flex flex-col items-center py-1 px-3 rounded-lg transition-all text-gray-400 hover:text-gray-200"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <Lightbulb className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Insights</span>
            </button>
            <button
              type="button"
              onClick={() => setLocation(`/impact-report/${currentUser?.id || ''}`)}
              className="flex flex-col items-center py-1 px-3 rounded-lg transition-all text-gray-400 hover:text-gray-200"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <BarChart3 className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Impact</span>
            </button>
            <button
              type="button"
              onClick={() => setLocation('/volunteer-profile-settings')}
              className="flex flex-col items-center py-1 px-3 rounded-lg transition-all text-gray-400 hover:text-gray-200"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <UserIcon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Profile</span>
            </button>
          </div>
        </nav>
      )}

      {/* Task Comment Modal */}
      <Dialog open={!!selectedTaskForComment} onOpenChange={() => setSelectedTaskForComment(null)}>
        <DialogContent className={`max-w-md ${isMobile && isVolunteer ? 'bg-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-500" />
              Add Comment for Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTaskForComment && (
              <div className={`p-3 rounded-lg ${isMobile && isVolunteer ? 'bg-amber-50 border border-amber-200/60' : 'bg-slate-50'}`}>
                <p className={`font-medium text-sm ${isMobile && isVolunteer ? 'text-slate-800' : ''}`}>
                  {selectedTaskForComment.title}
                </p>
                {selectedTaskForComment.description && (
                  <p className="text-xs text-slate-500 mt-1">{selectedTaskForComment.description}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="task-comment" className={isMobile && isVolunteer ? 'text-slate-700' : ''}>
                Comment / Notes
              </Label>
              <Textarea
                id="task-comment"
                value={taskComment}
                onChange={(e) => setTaskComment(e.target.value)}
                placeholder="Describe what you accomplished on this task..."
                rows={4}
                className={isMobile && isVolunteer ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400' : ''}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (activeTab === 'activity') {
                    setDescription(taskComment);
                    setSelectedTaskId(selectedTaskForComment?.id?.toString() || "");
                  } else {
                    setImpactDescription(taskComment);
                    setImpactTaskId(selectedTaskForComment?.id?.toString() || "");
                  }
                  setSelectedTaskForComment(null);
                  setTaskComment("");
                }}
                className={`flex-1 ${isMobile && isVolunteer ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply Comment
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTaskForComment(null);
                  setTaskComment("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
