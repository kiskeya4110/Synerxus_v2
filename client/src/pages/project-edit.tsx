import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Save, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

const projectEditSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  location: z.string().optional(),
  completionPercentage: z.number().min(0).max(100),
  aiTrackingEnabled: z.boolean(),
});

type ProjectEditForm = z.infer<typeof projectEditSchema>;

export default function ProjectEdit() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/projects/:id/edit");
  const projectId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();

  const { data: project, isLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const form = useForm<ProjectEditForm>({
    resolver: zodResolver(projectEditSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "Planning",
      location: "",
      completionPercentage: 0,
      aiTrackingEnabled: false,
    },
  });

  // Update form when project data loads
  if (project && !form.formState.isDirty) {
    const projectTasks = tasks.filter((t: any) => t.projectId === projectId);
    const completedTasks = projectTasks.filter((t: any) => t.status === "Completed").length;
    const calculatedPercentage = projectTasks.length > 0 
      ? Math.round((completedTasks / projectTasks.length) * 100) 
      : 0;

    form.reset({
      name: project.name || "",
      description: project.description || "",
      status: project.status || "Planning",
      location: project.location || "",
      completionPercentage: project.completionPercentage ?? calculatedPercentage,
      aiTrackingEnabled: project.aiTrackingEnabled || false,
    });
  }

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectEditForm) => {
      return apiRequest(`/api/projects/${projectId}`, "PATCH", {
        ...data,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      navigate(`/projects/${projectId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectEditForm) => {
    updateMutation.mutate(data);
  };

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Project not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const aiTrackingEnabled = form.watch("aiTrackingEnabled");

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/projects/${projectId}`)}
          data-testid="button-back-to-detail"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Edit Project</h1>
          <p className="text-muted-foreground mt-1">{project.name}</p>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Update project information and completion tracking preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter project name" data-testid="input-project-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe your project..."
                        rows={4}
                        data-testid="input-project-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Planning">Planning</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="On Hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Project location" data-testid="input-project-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* AI Tracking Section */}
              <Card className="border-dashed">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5" />
                        AI-Powered Completion Tracking
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Enable intelligent progress monitoring based on tasks, activities, and milestones
                      </CardDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="aiTrackingEnabled"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-ai-tracking"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="completionPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Completion Percentage: {field.value}%
                        </FormLabel>
                        <FormControl>
                          <div className="pt-2">
                            <Slider
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              max={100}
                              step={5}
                              className="w-full"
                              disabled={aiTrackingEnabled}
                              data-testid="slider-completion"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          {aiTrackingEnabled
                            ? "AI automatically calculates completion based on task progress, volunteer activities, and milestones"
                            : "Manually set the project completion percentage"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {aiTrackingEnabled && (
                    <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-4 border border-purple-200 dark:border-purple-800">
                      <h4 className="font-medium text-sm mb-2 text-purple-900 dark:text-purple-100">
                        AI Tracking Features
                      </h4>
                      <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                        <li>• Analyzes completed vs. total tasks</li>
                        <li>• Weighs volunteer hours and contributions</li>
                        <li>• Tracks milestone completion</li>
                        <li>• Considers project timeline and deadlines</li>
                        <li>• Updates automatically as activities are logged</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/projects/${projectId}`)}
                  disabled={updateMutation.isPending}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="gap-2"
                  data-testid="button-save-project"
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
