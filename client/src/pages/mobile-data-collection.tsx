import { useState, useEffect } from "react";
import { formatDecimal } from "@/lib/format-utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Send, Activity, TrendingUp, Zap, BarChart3 } from "lucide-react";

// Form schemas
const activityFormSchema = z.object({
  projectId: z.string().min(1, "Please select a project"),
  taskId: z.string().optional(),
  hours: z.coerce.number().min(0.1, "Please enter hours spent"),
  date: z.string().min(1, "Please enter a date"),
  description: z.string().min(5, "Please enter a description"),
  skillsApplied: z.string().min(1, "Please enter skills applied"),
  outcomes: z.string().optional(),
});

const impactFormSchema = z.object({
  projectId: z.string().min(1, "Please select a project"),
  metricId: z.string().min(1, "Please select a metric"),
  value: z.coerce.number().min(0.1, "Please enter a value"),
  date: z.string().min(1, "Please enter a date"),
  notes: z.string().min(5, "Please enter notes"),
  outcomeType: z.string().default("individual"), // individual, shared, system
  role: z.string().default("support"), // lead, support, observer
  evidenceUrls: z.string().optional(), // Comma-separated URLs
});

type ActivityFormData = z.infer<typeof activityFormSchema>;
type ImpactFormData = z.infer<typeof impactFormSchema>;

export default function MobileDataCollection() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("activity");

  // Fetch current user from database
  const userId = localStorage.getItem('currentUserId');
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) throw new Error("No user ID found");
      const response = await fetch(`/api/users/me?userId=${id}`);
      if (!response.ok) throw new Error("User not found");
      return response.json();
    },
    enabled: !!userId
  });

  // Fetch projects volunteer is assigned to or user's organization projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", currentUser?.id, currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      
      try {
        // Fetch all projects with userId for authentication
        const response = await fetch(`/api/projects?userId=${currentUser.id}`);
        if (!response.ok) return [];
        const allProjects = await response.json();
        
        // Filter based on user type
        if (currentUser?.userType === 'organization' && currentUser?.organizationId) {
          // Organization managers see all their organization's projects
          return allProjects.filter((p: any) => p.organizationId === currentUser.organizationId);
        } else {
          // Volunteers see only projects they're assigned to
          const assignmentsRes = await fetch(`/api/project-assignments?volunteerId=${currentUser.id}`);
          if (!assignmentsRes.ok) return [];
          const assignments = await assignmentsRes.json();
          const assignedProjectIds = new Set(assignments.map((a: any) => a.projectId));
          return allProjects.filter((p: any) => assignedProjectIds.has(p.id));
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
      }
    },
    enabled: !!currentUser?.id
  });

  // Fetch organization-scoped tasks from API
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const response = await fetch(`/api/tasks?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser && !!userId
  });

  // Fetch impact metrics from API
  const { data: impactMetrics = [] } = useQuery<any[]>({
    queryKey: ["/api/impact-metrics"],
  });

  // Fetch recent volunteer activities
  const { data: recentActivities = [] } = useQuery<any[]>({
    queryKey: ["/api/volunteer-activities", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const response = await fetch(`/api/volunteer-activities?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId
  });

  // Activity form
  const activityForm = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      projectId: "",
      taskId: "",
      hours: 0,
      date: new Date().toISOString().split('T')[0],
      description: "",
      skillsApplied: "",
      outcomes: "",
    },
  });

  // Impact form
  const impactForm = useForm<ImpactFormData>({
    resolver: zodResolver(impactFormSchema),
    defaultValues: {
      projectId: "",
      metricId: "",
      value: 0,
      date: new Date().toISOString().split('T')[0],
      notes: "",
      outcomeType: "individual",
      role: "support",
      evidenceUrls: "",
    },
  });

  // Activity submission mutation
  const activityMutation = useMutation({
    mutationFn: async (data: ActivityFormData) => {
      const payload = {
        userId: currentUser?.id,
        projectId: parseInt(data.projectId),
        taskId: data.taskId ? parseInt(data.taskId) : null,
        hours: data.hours,
        date: new Date(data.date).toISOString(),
        description: data.description,
        skillsApplied: data.skillsApplied.split(',').map(s => s.trim()),
        outcomes: data.outcomes || null,
      };
      return apiRequest("POST", "/api/volunteer-activities", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/volunteer-activities", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", userId] });
      activityForm.reset();
      toast({
        title: "Activity logged!",
        description: "Your volunteer activity has been recorded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log activity",
        variant: "destructive",
      });
    },
  });

  // Impact submission mutation
  const impactMutation = useMutation({
    mutationFn: async (data: ImpactFormData) => {
      const payload = {
        userId: currentUser?.id,
        projectId: parseInt(data.projectId),
        metricId: parseInt(data.metricId),
        value: data.value,
        date: new Date(data.date).toISOString(),
        notes: data.notes,
        outcomeType: data.outcomeType || "individual",
        role: data.role || "support",
        evidenceUrls: data.evidenceUrls ? data.evidenceUrls.split(',').map(url => url.trim()).filter(url => url) : [],
        verificationStatus: "pending",
      };
      return apiRequest("POST", "/api/project-impacts", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-impacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", userId] });
      impactForm.reset();
      toast({
        title: "Impact recorded!",
        description: "Your impact data has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record impact",
        variant: "destructive",
      });
    },
  });

  const onActivitySubmit = (data: ActivityFormData) => {
    activityMutation.mutate(data);
  };

  const onImpactSubmit = (data: ImpactFormData) => {
    impactMutation.mutate(data);
  };

  // Filter tasks by selected project and reset task selection when project changes
  const selectedProjectId = activityForm.watch("projectId");
  const filteredTasks = selectedProjectId 
    ? tasks.filter((task: any) => task.projectId === parseInt(selectedProjectId))
    : [];
  
  // Reset taskId when project changes
  useEffect(() => {
    activityForm.setValue("taskId", "");
  }, [selectedProjectId, activityForm]);

  // Calculate stats for overview
  const totalActivities = recentActivities.length;
  const totalHours = recentActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
  const activeProjects = new Set(recentActivities.map(a => a.projectId)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Mobile Data Collection
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Log volunteer activities and track impact metrics in the field
        </p>
      </div>

      {/* Overview Buttons - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab("activity")}
          className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
            activeTab === "activity"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
              : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
          }`}
          data-testid="overview-log-activity"
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Log Activity</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalActivities}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">logged</p>
        </button>

        <button
          onClick={() => setActiveTab("impact")}
          className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
            activeTab === "impact"
              ? "border-green-500 bg-green-50 dark:bg-green-950"
              : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
          }`}
          data-testid="overview-record-impact"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Record Impact</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeProjects}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">projects</p>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
            activeTab === "history"
              ? "border-purple-500 bg-purple-50 dark:bg-purple-950"
              : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600"
          }`}
          data-testid="overview-recent-entries"
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Recent Entries</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDecimal(totalHours)}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">total hours</p>
        </button>

        <button
          onClick={() => setActiveTab("activity")}
          className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 transition-all cursor-pointer hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-md"
          data-testid="overview-add-entry"
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Add Entry</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">+</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">quick log</p>
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Log Activity</TabsTrigger>
          <TabsTrigger value="impact">Record Impact</TabsTrigger>
          <TabsTrigger value="history">Recent Entries</TabsTrigger>
        </TabsList>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-center">Log Volunteer Activity</CardTitle>
              <CardDescription>
                Record your volunteer hours and activities in the field
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...activityForm}>
                <form onSubmit={activityForm.handleSubmit(onActivitySubmit)} className="space-y-6">
                  <FormField
                    control={activityForm.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-project">
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects.length > 0 ? (
                              projects.map((project: any) => (
                                <SelectItem key={project.id} value={project.id.toString()}>
                                  {project.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No projects available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={activityForm.control}
                    name="taskId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task (Optional)</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!selectedProjectId}
                        >
                          <FormControl>
                            <SelectTrigger disabled={!selectedProjectId}>
                              <SelectValue placeholder={selectedProjectId ? "Select a task (optional)" : "Select a project first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredTasks.length > 0 ? (
                              filteredTasks.map((task: any) => (
                                <SelectItem key={task.id} value={task.id.toString()}>
                                  {task.title}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>No tasks available for this project</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {selectedProjectId ? "Select a task from the chosen project, or leave empty to log general activity" : "Please select a project to see available tasks"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={activityForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-activity-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={activityForm.control}
                      name="hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hours Spent</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.5" placeholder="4" data-testid="input-activity-hours" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={activityForm.control}
                    name="skillsApplied"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skills Applied</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g., Teaching, Engineering, Project Management" 
                            data-testid="input-skills-applied"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={activityForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Describe what you did during this activity" 
                            rows={4}
                            data-testid="textarea-activity-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={activityForm.control}
                    name="outcomes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Outcomes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="What was achieved or learned?" 
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={activityMutation.isPending}
                    data-testid="button-submit-activity"
                  >
                    {activityMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Log Activity
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impact Recording Tab */}
        <TabsContent value="impact" className="mt-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-center">Record Impact Data</CardTitle>
              <CardDescription>
                Track measurable outcomes and impact metrics from your projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...impactForm}>
                <form onSubmit={impactForm.handleSubmit(onImpactSubmit)} className="space-y-6">
                  <FormField
                    control={impactForm.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-impact-project">
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects.length > 0 ? (
                              projects.map((project: any) => (
                                <SelectItem key={project.id} value={project.id.toString()}>
                                  {project.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No projects available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={impactForm.control}
                    name="metricId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impact Metric</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-metric">
                              <SelectValue placeholder="Select a metric" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {impactMetrics.map((metric: any) => (
                              <SelectItem key={metric.id} value={metric.id.toString()}>
                                {metric.name} {metric.unit && `(${metric.unit})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={impactForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-impact-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={impactForm.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="100" data-testid="input-impact-value" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={impactForm.control}
                    name="outcomeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Outcome Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-outcome-type">
                              <SelectValue placeholder="Select outcome type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="individual">Individual (Personal achievement)</SelectItem>
                            <SelectItem value="shared">Shared (Team outcome)</SelectItem>
                            <SelectItem value="system">System (Org-level metric)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>How is this impact classified?</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={impactForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lead">Lead (100% credit)</SelectItem>
                            <SelectItem value="support">Support (50% credit)</SelectItem>
                            <SelectItem value="observer">Observer (Participation only)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>How much did you contribute?</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={impactForm.control}
                    name="evidenceUrls"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Evidence URLs (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            placeholder="https://example.com/photo1, https://example.com/photo2" 
                            data-testid="input-evidence-urls"
                          />
                        </FormControl>
                        <FormDescription>Comma-separated URLs for photo/geo evidence</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={impactForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Describe the impact measured and any relevant context" 
                            rows={4}
                            data-testid="textarea-impact-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={impactMutation.isPending}
                    data-testid="button-submit-impact"
                  >
                    {impactMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Record Impact
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Entries Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-center">Recent Activity Logs</CardTitle>
              <CardDescription>
                Your most recent volunteer activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No activities logged yet
                  </p>
                ) : (
                  recentActivities.slice(0, 10).map((activity: any) => {
                    const project = projects.find((p: any) => p.id === activity.projectId);
                    return (
                      <div key={activity.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{project?.name || "Unknown Project"}</h4>
                              <Badge variant="secondary">{activity.hours}h</Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {activity.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              <span>
                                {new Date(activity.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              {activity.skillsApplied && activity.skillsApplied.length > 0 && (
                                <span className="flex items-center gap-1">
                                  Skills: {activity.skillsApplied.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
