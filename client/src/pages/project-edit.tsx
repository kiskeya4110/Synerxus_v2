import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Save, TrendingUp, Calendar, MapPin, Target, Users, Clock, Briefcase, BarChart3, Heart, Plus, Trash2, UserCheck } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import OrganizationHeader from "@/components/layout/organization-header";

// SDG options
const SDG_OPTIONS = [
  { value: 1, label: "1. No Poverty" },
  { value: 2, label: "2. Zero Hunger" },
  { value: 3, label: "3. Good Health and Well-being" },
  { value: 4, label: "4. Quality Education" },
  { value: 5, label: "5. Gender Equality" },
  { value: 6, label: "6. Clean Water and Sanitation" },
  { value: 7, label: "7. Affordable and Clean Energy" },
  { value: 8, label: "8. Decent Work and Economic Growth" },
  { value: 9, label: "9. Industry, Innovation and Infrastructure" },
  { value: 10, label: "10. Reduced Inequalities" },
  { value: 11, label: "11. Sustainable Cities and Communities" },
  { value: 12, label: "12. Responsible Consumption and Production" },
  { value: 13, label: "13. Climate Action" },
  { value: 14, label: "14. Life Below Water" },
  { value: 15, label: "15. Life on Land" },
  { value: 16, label: "16. Peace, Justice and Strong Institutions" },
  { value: 17, label: "17. Partnerships for the Goals" },
];

// Common skills options
const SKILL_OPTIONS = [
  "Project Management", "Communication", "Leadership", "Teaching", "Mentoring",
  "Web Development", "Mobile Development", "Data Analysis", "Marketing", "Social Media",
  "Graphic Design", "Video Production", "Writing", "Research", "Grant Writing",
  "Healthcare", "Legal", "Finance", "Accounting", "HR",
  "Event Planning", "Logistics", "Customer Service", "Sales", "Fundraising",
  "Translation", "Photography", "Public Speaking", "Counseling", "Tutoring"
];

// Volunteer role schema for AIU contribution tracking
const volunteerRoleSchema = z.object({
  role: z.string().min(1, "Role is required"),
  contributionPercent: z.number().min(1).max(100),
  count: z.number().min(1),
  description: z.string().optional(),
});

const projectEditSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  completionPercentage: z.number().min(0).max(100),
  aiTrackingEnabled: z.boolean(),
  // SDG fields
  sdgGoals: z.array(z.number()).optional(),
  primarySdg: z.number().optional().nullable(),
  // Skills fields
  requiredSkills: z.array(z.string()).optional(),
  optionalSkills: z.array(z.string()).optional(),
  experienceLevel: z.string().optional(),
  // Engagement fields
  engagementType: z.string().optional(),
  commitmentType: z.string().optional(),
  ongoingHoursPerWeek: z.number().optional().nullable(),
  projectTotalHours: z.number().optional().nullable(),
  // Impact fields
  impactMetricName: z.string().optional(),
  impactMetricUnit: z.string().optional(),
  livesTouched: z.number().optional(),
  // Cover image
  coverImage: z.string().optional(),
  // Volunteer role management with AIU contribution percentages
  volunteersNeeded: z.number().min(1).optional(),
  totalVolunteerContribution: z.number().min(1).max(100).optional(), // % of project impact for volunteers
  volunteerRoles: z.array(volunteerRoleSchema).optional(),
});

type ProjectEditForm = z.infer<typeof projectEditSchema>;

export default function ProjectEdit() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/projects/:id/edit");
  const projectId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [newSkill, setNewSkill] = useState("");
  const [newOptionalSkill, setNewOptionalSkill] = useState("");

  const { data: project, isLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project");
      return response.json();
    },
    enabled: !!projectId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const response = await fetch("/api/users/me");
      if (!response.ok) return null;
      return response.json();
    },
  });

  const isOrganization = currentUser?.userType === 'organization';

  const form = useForm<ProjectEditForm>({
    resolver: zodResolver(projectEditSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "Planning",
      location: "",
      startDate: "",
      endDate: "",
      completionPercentage: 0,
      aiTrackingEnabled: false,
      sdgGoals: [],
      primarySdg: null,
      requiredSkills: [],
      optionalSkills: [],
      experienceLevel: "",
      engagementType: "",
      commitmentType: "",
      ongoingHoursPerWeek: null,
      projectTotalHours: null,
      impactMetricName: "",
      impactMetricUnit: "",
      livesTouched: 0,
      coverImage: "",
      volunteersNeeded: 1,
      totalVolunteerContribution: 30, // Default 30% volunteer share
      volunteerRoles: [
        { role: "lead", contributionPercent: 40, count: 1, description: "Project coordinator/lead" },
        { role: "support", contributionPercent: 60, count: 2, description: "General support volunteers" }
      ],
    },
  });

  // Use field array for managing volunteer roles dynamically
  const { fields: roleFields, append: appendRole, remove: removeRole } = useFieldArray({
    control: form.control,
    name: "volunteerRoles",
  });

  // Update form when project data loads
  useEffect(() => {
    if (project && Array.isArray(tasks)) {
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
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
        completionPercentage: project.completionPercentage ?? calculatedPercentage,
        aiTrackingEnabled: project.aiTrackingEnabled || false,
        sdgGoals: project.sdgGoals || [],
        primarySdg: project.primarySdg || null,
        requiredSkills: project.requiredSkills || [],
        optionalSkills: project.optionalSkills || [],
        experienceLevel: project.experienceLevel || "",
        engagementType: project.engagementType || "",
        commitmentType: project.commitmentType || "",
        ongoingHoursPerWeek: project.ongoingHoursPerWeek || null,
        projectTotalHours: project.projectTotalHours || null,
        impactMetricName: project.impactMetricName || "",
        impactMetricUnit: project.impactMetricUnit || "",
        livesTouched: project.livesTouched || 0,
        coverImage: project.coverImage || "",
        volunteersNeeded: project.volunteersNeeded || 1,
        totalVolunteerContribution: project.totalVolunteerContribution || 30,
        volunteerRoles: project.volunteerRoles || [
          { role: "lead", contributionPercent: 40, count: 1, description: "Project coordinator/lead" },
          { role: "support", contributionPercent: 60, count: 2, description: "General support volunteers" }
        ],
      });
    }
  }, [project, tasks, projectId, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectEditForm) => {
      // Calculate total volunteers needed from role counts
      const totalVolunteersNeeded = data.volunteerRoles?.reduce((sum, role) => sum + role.count, 0) || data.volunteersNeeded || 1;

      const payload = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        volunteersNeeded: totalVolunteersNeeded,
        updatedAt: new Date(),
      };
      const response = await apiRequest("PATCH", `/api/projects/${projectId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (
            key.startsWith('/api/projects') ||
            key.startsWith('/api/dashboard/summary')
          );
        }
      });
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

  // Helper functions for skills
  const addRequiredSkill = (skill: string) => {
    const current = form.getValues("requiredSkills") || [];
    if (skill && !current.includes(skill)) {
      form.setValue("requiredSkills", [...current, skill]);
    }
    setNewSkill("");
  };

  const removeRequiredSkill = (skill: string) => {
    const current = form.getValues("requiredSkills") || [];
    form.setValue("requiredSkills", current.filter(s => s !== skill));
  };

  const addOptionalSkill = (skill: string) => {
    const current = form.getValues("optionalSkills") || [];
    if (skill && !current.includes(skill)) {
      form.setValue("optionalSkills", [...current, skill]);
    }
    setNewOptionalSkill("");
  };

  const removeOptionalSkill = (skill: string) => {
    const current = form.getValues("optionalSkills") || [];
    form.setValue("optionalSkills", current.filter(s => s !== skill));
  };

  // Helper function for SDGs
  const toggleSdg = (sdgValue: number) => {
    const current = form.getValues("sdgGoals") || [];
    if (current.includes(sdgValue)) {
      form.setValue("sdgGoals", current.filter(s => s !== sdgValue));
      // Clear primary SDG if it was removed
      if (form.getValues("primarySdg") === sdgValue) {
        form.setValue("primarySdg", null);
      }
    } else {
      form.setValue("sdgGoals", [...current, sdgValue]);
    }
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
      <>
        {isOrganization && <OrganizationHeader activeTab="projects" />}
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        {isOrganization && <OrganizationHeader activeTab="projects" />}
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Project not found</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const aiTrackingEnabled = form.watch("aiTrackingEnabled");
  const commitmentType = form.watch("commitmentType");
  const selectedSdgs = form.watch("sdgGoals") || [];

  return (
    <>
      {isOrganization && <OrganizationHeader activeTab="projects" />}

      <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-4xl">
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Core project details and description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                          placeholder="Describe your project, its goals, and what volunteers will do..."
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
                          <Input {...field} placeholder="City, State or Remote" data-testid="input-project-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="coverImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Image URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://example.com/image.jpg" data-testid="input-cover-image" />
                      </FormControl>
                      <FormDescription>
                        URL of the project cover image
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline & Schedule
                </CardTitle>
                <CardDescription>
                  Project dates and time commitment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="engagementType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Engagement Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-engagement-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="remote">Remote</SelectItem>
                            <SelectItem value="in-person">In-Person</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="commitmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commitment Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-commitment-type">
                              <SelectValue placeholder="Select commitment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="project-based">Project-Based</SelectItem>
                            <SelectItem value="event">One-Time Event</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {commitmentType === "ongoing" && (
                  <FormField
                    control={form.control}
                    name="ongoingHoursPerWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours Per Week</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="e.g., 5"
                            data-testid="input-hours-per-week"
                          />
                        </FormControl>
                        <FormDescription>Expected weekly time commitment</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {commitmentType === "project-based" && (
                  <FormField
                    control={form.control}
                    name="projectTotalHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Project Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="e.g., 40"
                            data-testid="input-total-hours"
                          />
                        </FormControl>
                        <FormDescription>Estimated total hours for the project</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Skills Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Skills & Requirements
                </CardTitle>
                <CardDescription>
                  Define the skills needed for volunteer matching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="experienceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-experience-level">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="entry-level">Entry Level (No experience required)</SelectItem>
                          <SelectItem value="intermediate">Intermediate (Some experience)</SelectItem>
                          <SelectItem value="expert">Expert (Significant experience)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Required Skills */}
                <div className="space-y-3">
                  <FormLabel>Required Skills</FormLabel>
                  <div className="flex gap-2">
                    <Select value={newSkill} onValueChange={(val) => { addRequiredSkill(val); }}>
                      <SelectTrigger className="flex-1" data-testid="select-add-skill">
                        <SelectValue placeholder="Select or type a skill" />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILL_OPTIONS.filter(s => !(form.getValues("requiredSkills") || []).includes(s)).map(skill => (
                          <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Or type custom skill"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addRequiredSkill(newSkill);
                        }
                      }}
                      className="flex-1"
                    />
                    <Button type="button" onClick={() => addRequiredSkill(newSkill)} variant="secondary">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(form.watch("requiredSkills") || []).map((skill) => (
                      <Badge key={skill} variant="default" className="gap-1">
                        {skill}
                        <button type="button" onClick={() => removeRequiredSkill(skill)} className="ml-1 hover:bg-white/20 rounded-full">
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormDescription>Skills that are essential for this project (used for volunteer matching)</FormDescription>
                </div>

                {/* Optional Skills */}
                <div className="space-y-3">
                  <FormLabel>Optional Skills (Nice to Have)</FormLabel>
                  <div className="flex gap-2">
                    <Select value={newOptionalSkill} onValueChange={(val) => { addOptionalSkill(val); }}>
                      <SelectTrigger className="flex-1" data-testid="select-add-optional-skill">
                        <SelectValue placeholder="Select or type a skill" />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILL_OPTIONS.filter(s => !(form.getValues("optionalSkills") || []).includes(s)).map(skill => (
                          <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Or type custom skill"
                      value={newOptionalSkill}
                      onChange={(e) => setNewOptionalSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOptionalSkill(newOptionalSkill);
                        }
                      }}
                      className="flex-1"
                    />
                    <Button type="button" onClick={() => addOptionalSkill(newOptionalSkill)} variant="secondary">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(form.watch("optionalSkills") || []).map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1">
                        {skill}
                        <button type="button" onClick={() => removeOptionalSkill(skill)} className="ml-1 hover:bg-gray-300 rounded-full">
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormDescription>Additional skills that would be beneficial</FormDescription>
                </div>
              </CardContent>
            </Card>

            {/* SDG Alignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  SDG Alignment
                </CardTitle>
                <CardDescription>
                  Select the UN Sustainable Development Goals this project addresses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <FormLabel>SDG Goals</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {SDG_OPTIONS.map((sdg) => (
                      <Button
                        key={sdg.value}
                        type="button"
                        variant={selectedSdgs.includes(sdg.value) ? "default" : "outline"}
                        className="justify-start h-auto py-2 px-3"
                        onClick={() => toggleSdg(sdg.value)}
                        data-testid={`sdg-${sdg.value}`}
                      >
                        {sdg.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedSdgs.length > 0 && (
                  <FormField
                    control={form.control}
                    name="primarySdg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary SDG</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(parseInt(val))}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-primary-sdg">
                              <SelectValue placeholder="Select primary SDG" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SDG_OPTIONS.filter(s => selectedSdgs.includes(s.value)).map(sdg => (
                              <SelectItem key={sdg.value} value={sdg.value.toString()}>{sdg.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>The main SDG this project focuses on (used for matching priority)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Impact Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Impact Metrics
                </CardTitle>
                <CardDescription>
                  Define how you'll measure this project's impact
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="impactMetricName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impact Metric Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Students Tutored" data-testid="input-metric-name" />
                        </FormControl>
                        <FormDescription>What are you measuring?</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="impactMetricUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impact Metric Unit</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., students" data-testid="input-metric-unit" />
                        </FormControl>
                        <FormDescription>Unit of measurement</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="livesTouched"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Lives Touched
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="0"
                          data-testid="input-lives-touched"
                        />
                      </FormControl>
                      <FormDescription>Total number of people impacted by this project</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Volunteer Roles & AIU Contribution Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserCheck className="h-5 w-5" />
                  Volunteer Roles & AIU Contributions
                </CardTitle>
                <CardDescription>
                  Set the total volunteer contribution and define how it's distributed among roles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Total Volunteer Contribution Field */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <FormField
                    control={form.control}
                    name="totalVolunteerContribution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-blue-900 dark:text-blue-100">
                          Total Volunteer Contribution (% of Project Impact)
                        </FormLabel>
                        <FormDescription className="text-blue-700 dark:text-blue-300">
                          What percentage of the project's total impact is attributed to volunteers?
                          The remaining {100 - (field.value || 0)}% goes to your organization's paid staff.
                        </FormDescription>
                        <div className="flex items-center gap-4 mt-2">
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              className="w-24 text-lg font-bold"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <span className="text-lg font-bold text-blue-800 dark:text-blue-200">%</span>
                          <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                              style={{ width: `${field.value || 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-xs mt-2">
                          <span className="text-blue-600 dark:text-blue-400">Volunteer Share: {field.value || 0}%</span>
                          <span className="text-gray-500 dark:text-gray-400">Organization Staff: {100 - (field.value || 0)}%</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Role Distribution Header */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm mb-2">Role Distribution (within Volunteer Share)</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Define how the {form.watch("totalVolunteerContribution") || 0}% volunteer share is distributed among different roles.
                    These percentages must sum to 100%.
                  </p>
                </div>

                {/* Summary Display */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Volunteers Needed:</span>
                    <span className="text-lg font-bold text-primary">
                      {roleFields.reduce((sum, _, idx) => {
                        const count = form.watch(`volunteerRoles.${idx}.count`) || 0;
                        return sum + count;
                      }, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-medium">Role Distribution Total:</span>
                    <span className={`text-lg font-bold ${
                      roleFields.reduce((sum, _, idx) => {
                        return sum + (form.watch(`volunteerRoles.${idx}.contributionPercent`) || 0);
                      }, 0) === 100 ? 'text-green-600' : 'text-orange-500'
                    }`}>
                      {roleFields.reduce((sum, _, idx) => {
                        return sum + (form.watch(`volunteerRoles.${idx}.contributionPercent`) || 0);
                      }, 0)}%
                    </span>
                  </div>
                  {roleFields.reduce((sum, _, idx) => sum + (form.watch(`volunteerRoles.${idx}.contributionPercent`) || 0), 0) !== 100 && (
                    <p className="text-xs text-orange-500 mt-1">Role percentages should total 100% of the volunteer share</p>
                  )}

                  {/* Effective Impact Breakdown */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-muted-foreground">
                      <strong>Effective Project Impact Breakdown:</strong>
                    </div>
                    <div className="mt-1 space-y-1">
                      {roleFields.map((_, idx) => {
                        const role = form.watch(`volunteerRoles.${idx}`);
                        const totalVolunteer = form.watch("totalVolunteerContribution") || 0;
                        const effectivePercent = (totalVolunteer * (role?.contributionPercent || 0) / 100).toFixed(1);
                        return (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{role?.role} ({role?.count || 0} volunteer{(role?.count || 0) > 1 ? 's' : ''}):</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">{effectivePercent}% of project</span>
                          </div>
                        );
                      })}
                      <div className="flex justify-between text-xs pt-1 border-t border-gray-200 dark:border-gray-700 mt-1">
                        <span className="text-muted-foreground">Organization Staff:</span>
                        <span className="font-medium">{100 - (form.watch("totalVolunteerContribution") || 0)}% of project</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role List */}
                <div className="space-y-4">
                  {roleFields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg bg-white dark:bg-slate-900 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Role {index + 1}</span>
                        {roleFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRole(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`volunteerRoles.${index}.role`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role Name</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="lead">Project Lead</SelectItem>
                                  <SelectItem value="support">Support Volunteer</SelectItem>
                                  <SelectItem value="mentor">Mentor</SelectItem>
                                  <SelectItem value="specialist">Specialist</SelectItem>
                                  <SelectItem value="pro_bono_legal">Pro Bono Legal</SelectItem>
                                  <SelectItem value="pro_bono_medical">Pro Bono Medical</SelectItem>
                                  <SelectItem value="pro_bono_tech">Pro Bono Tech</SelectItem>
                                  <SelectItem value="admin">Administrative</SelectItem>
                                  <SelectItem value="trainee">Trainee</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`volunteerRoles.${index}.count`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Number of Volunteers</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`volunteerRoles.${index}.contributionPercent`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>AIU Contribution %</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={100}
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormDescription>This role's share of project AIU</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`volunteerRoles.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Role responsibilities" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendRole({ role: "support", contributionPercent: 10, count: 1, description: "" })}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Role
                </Button>
              </CardContent>
            </Card>

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
            <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-background py-4">
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
      </div>
    </>
  );
}
