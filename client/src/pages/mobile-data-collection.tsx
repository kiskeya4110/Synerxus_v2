import { useState, useEffect } from "react";
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
import { Check, Clock, Send } from "lucide-react";

// Form schemas
const activityFormSchema = z.object({
  projectId: z.string().min(1, "Please select a project"),
  taskId: z.string().optional(),
  hours: z.string().min(1, "Please enter hours spent").transform(Number),
  date: z.string().min(1, "Please enter a date"),
  description: z.string().min(5, "Please enter a description"),
  skillsApplied: z.string().min(1, "Please enter skills applied"),
  outcomes: z.string().optional(),
});

const impactFormSchema = z.object({
  projectId: z.string().min(1, "Please select a project"),
  metricId: z.string().min(1, "Please select a metric"),
  value: z.string().min(1, "Please enter a value").transform(Number),
  date: z.string().min(1, "Please enter a date"),
  notes: z.string().min(5, "Please enter notes"),
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

  // Fetch organization-scoped projects from API
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const response = await fetch(`/api/projects?userId=${id}`);
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
    enabled: !!currentUser && !!userId
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
      hours: "",
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
      value: "",
      date: new Date().toISOString().split('T')[0],
      notes: "",
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
        projectId: parseInt(data.projectId),
        metricId: parseInt(data.metricId),
        value: data.value,
        date: new Date(data.date).toISOString(),
        notes: data.notes,
      };
      return apiRequest("POST", "/api/project-impacts", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-impacts"] });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Mobile Data Collection
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Log volunteer activities and track impact metrics in the field
        </p>
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
            <CardHeader>
              <CardTitle>Log Volunteer Activity</CardTitle>
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
                            {projects.map((project: any) => (
                              <SelectItem key={project.id} value={project.id.toString()}>
                                {project.name}
                              </SelectItem>
                            ))}
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
            <CardHeader>
              <CardTitle>Record Impact Data</CardTitle>
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
                            {projects.map((project: any) => (
                              <SelectItem key={project.id} value={project.id.toString()}>
                                {project.name}
                              </SelectItem>
                            ))}
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
            <CardHeader>
              <CardTitle>Recent Activity Logs</CardTitle>
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
