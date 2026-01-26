import { useState } from "react";
import { useLocation } from "wouter";
import { formatDecimal } from "@/lib/format-utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { sdgGoals } from "@shared/sdg-goals";
import { ROLE_WEIGHTS, ROLE_CATEGORIES, getRoleDisplayName } from "@shared/aiu-calculations";
import { Briefcase, MapPin, Clock, Target, TrendingUp, X, Users, Plus, Trash2, Info, ArrowLeft, AlertTriangle, Flag } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import OrganizationNav from "@/components/layout/organization-nav";

const skillOptions = [
  "Project Management", "Marketing", "Graphic Design", "Web Development", "Data Analysis",
  "Content Writing", "Social Media", "Fundraising", "Event Planning", "Teaching",
  "Healthcare", "Legal Advice", "Accounting", "Translation", "Photography",
  "Video Editing", "Public Speaking", "Grant Writing", "Research", "Mentoring"
];

// Volunteer role schema for AIU calculation
const volunteerRoleSchema = z.object({
  role: z.string().min(1, "Role name is required"),
  contributionPercent: z.coerce.number().min(1).max(100, "Contribution must be 1-100%"),
  count: z.coerce.number().min(1, "At least 1 volunteer needed"),
  description: z.string().optional()
});

// Milestone schema for ongoing projects
const milestoneSchema = z.object({
  name: z.string().min(1, "Milestone name is required"),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  completed: z.boolean().default(false)
});

const opportunitySchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please provide a detailed description"),
  engagementType: z.enum(["remote", "in-person", "hybrid"]),
  location: z.string().optional(),
  commitmentType: z.enum(["ongoing", "project-based", "event"]),
  ongoingHoursPerWeek: z.coerce.number().optional(),
  projectTotalHours: z.coerce.number().optional(),
  requiredSkills: z.array(z.string()).min(1, "Add at least one required skill"),
  optionalSkills: z.array(z.string()).optional(),
  primarySdg: z.coerce.number().min(1).max(17, "Select primary SDG"),
  impactMetricName: z.string().min(1, "Define impact metric name"),
  impactMetricUnit: z.string().min(1, "Define impact metric unit"),
  volunteersNeeded: z.coerce.number().min(1).optional(),
  requirements: z.string().optional(),
  benefits: z.string().optional(),
  // Urgent opportunity flag
  isUrgent: z.boolean().default(false),
  // Total volunteer contribution: percentage of project impact attributed to volunteers (vs paid staff)
  totalVolunteerContribution: z.coerce.number().min(1).max(100).default(100),
  // AIU Formula: Volunteer Roles with contribution percentages (how the volunteer share is divided)
  volunteerRoles: z.array(volunteerRoleSchema).min(1, "Define at least one volunteer role"),
  // Milestones for ongoing projects
  milestones: z.array(milestoneSchema).optional()
}).refine(data => {
  if (data.commitmentType === "ongoing" && !data.ongoingHoursPerWeek) {
    return false;
  }
  if (data.commitmentType === "project-based" && !data.projectTotalHours) {
    return false;
  }
  if ((data.engagementType === "in-person" || data.engagementType === "hybrid") && !data.location) {
    return false;
  }
  return true;
}, {
  message: "Please fill in required fields based on your selections"
}).refine(data => {
  // Validate that volunteer role contribution percentages sum to 100%
  const totalContribution = data.volunteerRoles.reduce((sum, role) => sum + role.contributionPercent, 0);
  return totalContribution === 100;
}, {
  message: "Volunteer role contribution percentages must sum to exactly 100%",
  path: ["volunteerRoles"]
});

type OpportunityForm = z.infer<typeof opportunitySchema>;

export default function PostCoreOpportunity() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [customSkill, setCustomSkill] = useState("");
  const [customOptionalSkill, setCustomOptionalSkill] = useState("");

  const userId = localStorage.getItem('currentUserId');
  const userType = localStorage.getItem('userType');
  // Use localStorage as fallback for PWA layout detection during initial load
  const isOrganizationForLayout = userType === 'organization';

  const { data: currentUser } = useQuery({ 
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID found");
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) throw new Error("User not found");
      return response.json();
    },
    enabled: !!userId
  });

  const form = useForm<OpportunityForm>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      title: "",
      description: "",
      engagementType: "remote",
      location: "",
      commitmentType: "ongoing",
      ongoingHoursPerWeek: 10,
      projectTotalHours: undefined,
      requiredSkills: [],
      optionalSkills: [],
      primarySdg: 1,
      impactMetricName: "",
      impactMetricUnit: "",
      volunteersNeeded: 1,
      requirements: "",
      benefits: "",
      isUrgent: false,
      totalVolunteerContribution: 30, // Default 30% volunteer share, 70% organization staff
      volunteerRoles: [
        { role: "lead", contributionPercent: 40, count: 1, description: "Project coordinator/lead" },
        { role: "support", contributionPercent: 60, count: 2, description: "General support volunteers" }
      ],
      milestones: []
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: OpportunityForm) => {
      // Calculate total volunteers needed from role counts
      const totalVolunteersNeeded = data.volunteerRoles?.reduce((sum, role) => sum + role.count, 0) || data.volunteersNeeded || 1;

      return await apiRequest("POST", "/api/opportunities", {
        ...data,
        organizationId: currentUser?.organizationId,
        isRemote: data.engagementType === "remote",
        sdgGoals: [data.primarySdg],
        volunteersNeeded: totalVolunteersNeeded,
        status: "open",
        isUrgent: data.isUrgent || false,
        milestones: data.milestones || []
      });
    },
    onSuccess: () => {
      const userId = localStorage.getItem('currentUserId');
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Opportunity posted!",
        description: "Your core opportunity has been successfully created."
      });
      navigate("/opportunities");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post opportunity",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: OpportunityForm) => {
    submitMutation.mutate(data);
  };

  const toggleSkill = (skill: string, type: "required" | "optional") => {
    const field = type === "required" ? "requiredSkills" : "optionalSkills";
    const current = form.getValues(field) || [];
    if (current.includes(skill)) {
      form.setValue(field, current.filter(s => s !== skill));
    } else {
      form.setValue(field, [...current, skill]);
    }
  };

  const addCustomSkill = (type: "required" | "optional") => {
    const skillValue = type === "required" ? customSkill : customOptionalSkill;
    const setSkillValue = type === "required" ? setCustomSkill : setCustomOptionalSkill;
    const field = type === "required" ? "requiredSkills" : "optionalSkills";

    if (skillValue.trim()) {
      const current = form.getValues(field) || [];
      if (!current.includes(skillValue.trim())) {
        form.setValue(field, [...current, skillValue.trim()]);
      }
      setSkillValue("");
    }
  };

  // Mobile PWA wrapper for organization users
  const formContent = (
    <>
      <div className={isMobile && isOrganizationForLayout ? "mb-4" : "mb-8"}>
        {isMobile && isOrganizationForLayout && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
            className="mb-3 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
            className="mb-3 -ml-2 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Projects
          </Button>
        )}
        <h1 className={`font-bold text-white mb-2 ${isMobile ? "text-xl" : "text-3xl"}`}>
          Post a Core Opportunity
        </h1>
        <p className={`text-slate-300 ${isMobile ? "text-sm" : ""}`}>
          For skilled, ongoing, or project-based volunteer roles. This detailed post will power the AI matching algorithm.
        </p>
      </div>

      <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: The Basics */}
            <Card data-testid="card-basics" className="bg-white shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Section 1: The Basics
                </CardTitle>
                <CardDescription className="text-slate-600">What is the role?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-800">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opportunity Title</FormLabel>
                      <FormDescription>e.g., "Volunteer Grant Writer for Education Program"</FormDescription>
                      <FormControl>
                        <Input data-testid="input-title" placeholder="Enter a clear, descriptive title" {...field} />
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
                      <FormLabel>Description of the Role</FormLabel>
                      <FormDescription>Be specific. What will the volunteer do? What are the key responsibilities?</FormDescription>
                      <FormControl>
                        <Textarea
                          data-testid="textarea-description"
                          placeholder="Provide 2-3 paragraphs describing the role..."
                          className="min-h-[150px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Urgent Opportunity Toggle */}
                <FormField
                  control={form.control}
                  name="isUrgent"
                  render={({ field }) => (
                    <FormItem>
                      <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        field.value
                          ? 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800'
                          : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${field.value ? 'bg-red-100 dark:bg-red-900' : 'bg-gray-200 dark:bg-gray-700'}`}>
                            <AlertTriangle className={`h-5 w-5 ${field.value ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`} />
                          </div>
                          <div>
                            <FormLabel className="text-base font-semibold cursor-pointer">
                              Mark as Urgent Opportunity
                            </FormLabel>
                            <FormDescription className="text-sm">
                              Urgent opportunities are highlighted and prioritized in volunteer searches
                            </FormDescription>
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-urgent"
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 2: The Logistics */}
            <Card data-testid="card-logistics" className="bg-white shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Section 2: The Logistics
                </CardTitle>
                <CardDescription className="text-slate-600">Where and when is this opportunity?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-800">
                <FormField
                  control={form.control}
                  name="engagementType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Engagement Type</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="remote" id="remote" data-testid="radio-remote" />
                            <Label htmlFor="remote" className="cursor-pointer">Remote / Virtual (Global or region-specific)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="in-person" id="in-person" data-testid="radio-in-person" />
                            <Label htmlFor="in-person" className="cursor-pointer">In-Person (At a specific location)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="hybrid" id="hybrid" data-testid="radio-hybrid" />
                            <Label htmlFor="hybrid" className="cursor-pointer">Hybrid (A mix of both)</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(form.watch("engagementType") === "in-person" || form.watch("engagementType") === "hybrid") && (
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormDescription>City and Country</FormDescription>
                        <FormControl>
                          <Input data-testid="input-location" placeholder="e.g., New York, United States" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="commitmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Time Commitment</FormLabel>
                      <FormDescription>This is critical for matching with volunteer availability</FormDescription>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ongoing" id="ongoing" data-testid="radio-ongoing" />
                            <Label htmlFor="ongoing" className="cursor-pointer">Ongoing: Approx. hours per week</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="project-based" id="project-based" data-testid="radio-project-based" />
                            <Label htmlFor="project-based" className="cursor-pointer">Project-Based: Approx. total hours</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("commitmentType") === "ongoing" && (
                  <FormField
                    control={form.control}
                    name="ongoingHoursPerWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours per Week</FormLabel>
                        <FormControl>
                          <Input data-testid="input-hours-per-week" type="number" min="1" placeholder="e.g., 10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("commitmentType") === "project-based" && (
                  <FormField
                    control={form.control}
                    name="projectTotalHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Project Hours</FormLabel>
                        <FormControl>
                          <Input data-testid="input-total-hours" type="number" min="1" placeholder="e.g., 40" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Milestones Section for Ongoing Projects */}
                {form.watch("commitmentType") === "ongoing" && (
                  <FormField
                    control={form.control}
                    name="milestones"
                    render={({ field }) => (
                      <FormItem>
                        <div className="border-t pt-4 mt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Flag className="w-5 h-5 text-indigo-600" />
                            <FormLabel className="text-base font-semibold">Project Milestones</FormLabel>
                          </div>
                          <FormDescription className="mb-4">
                            Define key milestones for this ongoing opportunity. Volunteers can track progress against these goals.
                          </FormDescription>

                          <div className="space-y-3">
                            {field.value?.map((milestone, index) => (
                              <div key={index} className="flex items-start gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                <div className="flex-1 space-y-2">
                                  <Input
                                    placeholder="Milestone name (e.g., 'Phase 1 Complete')"
                                    value={milestone.name}
                                    onChange={(e) => {
                                      const updated = [...(field.value || [])];
                                      updated[index] = { ...updated[index], name: e.target.value };
                                      field.onChange(updated);
                                    }}
                                    className="bg-white dark:bg-gray-900"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      placeholder="Description (optional)"
                                      value={milestone.description || ""}
                                      onChange={(e) => {
                                        const updated = [...(field.value || [])];
                                        updated[index] = { ...updated[index], description: e.target.value };
                                        field.onChange(updated);
                                      }}
                                      className="bg-white dark:bg-gray-900"
                                    />
                                    <Input
                                      type="date"
                                      placeholder="Target date"
                                      value={milestone.targetDate || ""}
                                      onChange={(e) => {
                                        const updated = [...(field.value || [])];
                                        updated[index] = { ...updated[index], targetDate: e.target.value };
                                        field.onChange(updated);
                                      }}
                                      className="bg-white dark:bg-gray-900"
                                    />
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updated = (field.value || []).filter((_, i) => i !== index);
                                    field.onChange(updated);
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                field.onChange([
                                  ...(field.value || []),
                                  { name: "", description: "", targetDate: "", completed: false }
                                ]);
                              }}
                              className="w-full border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Milestone
                            </Button>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Section 3: The Ideal Volunteer */}
            <Card data-testid="card-ideal-volunteer" className="bg-white shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Target className="w-5 h-5 text-blue-600" />
                  Section 3: The Ideal Volunteer
                </CardTitle>
                <CardDescription className="text-slate-600">Who are you looking for? This is the most important section for AI matching.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-800">
                <FormField
                  control={form.control}
                  name="requiredSkills"
                  render={() => (
                    <FormItem>
                      <FormLabel>Required Skills</FormLabel>
                      <FormDescription>Add the skills your ideal volunteer has. Critical for matching!</FormDescription>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {skillOptions.map((skill) => (
                          <Badge
                            key={skill}
                            data-testid={`badge-required-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                            variant={form.watch("requiredSkills")?.includes(skill) ? "default" : "outline"}
                            className={`cursor-pointer ${form.watch("requiredSkills")?.includes(skill) ? "bg-indigo-600 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
                            onClick={() => toggleSkill(skill, "required")}
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input
                          data-testid="input-custom-required-skill"
                          placeholder="Add custom skill"
                          value={customSkill}
                          onChange={(e) => setCustomSkill(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill("required"))}
                        />
                        <Button data-testid="button-add-required-skill" type="button" onClick={() => addCustomSkill("required")} variant="outline">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {form.watch("requiredSkills")?.map((skill) => (
                          <Badge
                            key={skill}
                            variant="default"
                            className="cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700"
                            onClick={() => toggleSkill(skill, "required")}
                          >
                            {skill} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="optionalSkills"
                  render={() => (
                    <FormItem>
                      <FormLabel>Nice to Have Skills (Optional)</FormLabel>
                      <FormDescription>Skills that are a bonus but not required</FormDescription>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {skillOptions.map((skill) => (
                          <Badge
                            key={skill}
                            data-testid={`badge-optional-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                            variant={form.watch("optionalSkills")?.includes(skill) ? "secondary" : "outline"}
                            className={`cursor-pointer ${form.watch("optionalSkills")?.includes(skill) ? "bg-slate-200 text-slate-800" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
                            onClick={() => toggleSkill(skill, "optional")}
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input
                          data-testid="input-custom-optional-skill"
                          placeholder="Add optional skill"
                          value={customOptionalSkill}
                          onChange={(e) => setCustomOptionalSkill(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill("optional"))}
                        />
                        <Button data-testid="button-add-optional-skill" type="button" onClick={() => addCustomSkill("optional")} variant="outline">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {form.watch("optionalSkills")?.map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="cursor-pointer bg-slate-200 text-slate-800 hover:bg-slate-300"
                            onClick={() => toggleSkill(skill, "optional")}
                          >
                            {skill} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 4: Purpose & Impact */}
            <Card data-testid="card-impact" className="bg-white shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Section 4: The Purpose & Impact
                </CardTitle>
                <CardDescription className="text-slate-600">Why does this role matter? This powers SDG matching and Impact Dashboards.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-800">
                <FormField
                  control={form.control}
                  name="primarySdg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary SDG Alignment</FormLabel>
                      <FormDescription>Select the one main UN Sustainable Development Goal this role supports</FormDescription>
                      <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-primary-sdg">
                            <SelectValue placeholder="Select primary SDG" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          {Object.values(sdgGoals).map((sdg) => (
                            <SelectItem key={sdg.id} value={String(sdg.id)}>
                              SDG {sdg.id}: {sdg.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm mb-2">Define Your Impact Metric</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    This is the key metric this role will contribute to. It will appear on your Impact Dashboard.
                    This turns volunteer hours into measurable outcomes.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="impactMetricName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Metric Name</FormLabel>
                          <FormDescription>e.g., "Students Tutored", "Families Fed", "Trees Planted"</FormDescription>
                          <FormControl>
                            <Input data-testid="input-metric-name" placeholder="Impact metric name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="impactMetricUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit of Measurement</FormLabel>
                          <FormDescription>e.g., "students", "families", "trees"</FormDescription>
                          <FormControl>
                            <Input data-testid="input-metric-unit" placeholder="Unit" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="volunteersNeeded"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Volunteers Needed</FormLabel>
                      <FormControl>
                        <Input data-testid="input-volunteers-needed" type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 5: Volunteer Role Weight Configuration (AIU Formula) */}
            <Card data-testid="card-role-weights" className="bg-white shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Users className="w-5 h-5 text-blue-600" />
                  Section 5: Volunteer Role Configuration
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="text-sm">
                          <strong>AIU Formula:</strong> Total Volunteer Contribution determines what percentage of the project's impact goes to volunteers.
                          <br /><br />
                          <code>Volunteer AIU = Total Impact × Volunteer % × (role share)</code>
                          <br /><br />
                          Organization staff receive the remaining percentage.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Set the total volunteer contribution percentage and define how it's distributed among roles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-800">
                {/* Total Volunteer Contribution Field */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <FormField
                    control={form.control}
                    name="totalVolunteerContribution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-blue-900">
                          Total Volunteer Contribution (% of Project Impact)
                        </FormLabel>
                        <FormDescription className="text-blue-700">
                          What percentage of the project's total impact is attributed to volunteers?
                          The remaining {100 - (field.value || 0)}% goes to your organization's paid staff.
                        </FormDescription>
                        <div className="flex items-center gap-4 mt-2">
                          <FormControl>
                            <Input
                              data-testid="input-total-volunteer-contribution"
                              type="number"
                              min="1"
                              max="100"
                              className="w-24 text-lg font-bold"
                              {...field}
                            />
                          </FormControl>
                          <span className="text-lg font-bold text-blue-800">%</span>
                          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                              style={{ width: `${field.value || 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-xs mt-2">
                          <span className="text-blue-600">Volunteer Share: {field.value || 0}%</span>
                          <span className="text-gray-500">Organization Staff: {100 - (field.value || 0)}%</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm mb-2">Role Distribution (within Volunteer Share)</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Define how the {form.watch("totalVolunteerContribution") || 0}% volunteer share is distributed among different roles.
                    These percentages must sum to 100%.
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="volunteerRoles"
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-4">
                        {/* Role Weight Header */}
                        <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 pb-2 border-b">
                          <div className="col-span-3">Role Type</div>
                          <div className="col-span-2">Weight %</div>
                          <div className="col-span-2"># Needed</div>
                          <div className="col-span-4">Description</div>
                          <div className="col-span-1"></div>
                        </div>

                        {/* Role Rows */}
                        {field.value?.map((role, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-start">
                            <div className="col-span-3">
                              <Select
                                value={role.role}
                                onValueChange={(value) => {
                                  const updated = [...field.value];
                                  updated[index] = { ...updated[index], role: value };
                                  field.onChange(updated);
                                }}
                              >
                                <SelectTrigger data-testid={`select-role-${index}`}>
                                  <SelectValue placeholder="Select role">
                                    {role.role && `${getRoleDisplayName(role.role)} (${ROLE_WEIGHTS[role.role]}x)`}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {Object.entries(ROLE_CATEGORIES).map(([categoryKey, category]) => (
                                    <div key={categoryKey}>
                                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                                        {category.label}
                                      </div>
                                      {category.roles.map((roleKey) => (
                                        <SelectItem key={roleKey} value={roleKey} className="pl-4">
                                          {getRoleDisplayName(roleKey)} ({ROLE_WEIGHTS[roleKey]}x)
                                        </SelectItem>
                                      ))}
                                    </div>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <div className="relative">
                                <Input
                                  data-testid={`input-contribution-${index}`}
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={role.contributionPercent}
                                  onChange={(e) => {
                                    const updated = [...field.value];
                                    updated[index] = { ...updated[index], contributionPercent: Number(e.target.value) };
                                    field.onChange(updated);
                                  }}
                                  className="pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <Input
                                data-testid={`input-count-${index}`}
                                type="number"
                                min="1"
                                value={role.count}
                                onChange={(e) => {
                                  const updated = [...field.value];
                                  updated[index] = { ...updated[index], count: Number(e.target.value) };
                                  field.onChange(updated);
                                }}
                              />
                            </div>
                            <div className="col-span-4">
                              <Input
                                data-testid={`input-description-${index}`}
                                placeholder="Role description"
                                value={role.description || ""}
                                onChange={(e) => {
                                  const updated = [...field.value];
                                  updated[index] = { ...updated[index], description: e.target.value };
                                  field.onChange(updated);
                                }}
                              />
                            </div>
                            <div className="col-span-1 flex justify-center">
                              {field.value.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updated = field.value.filter((_, i) => i !== index);
                                    field.onChange(updated);
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Add Role Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            field.onChange([
                              ...field.value,
                              { role: "support", contributionPercent: 0, count: 1, description: "" }
                            ]);
                          }}
                          className="mt-2"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Role
                        </Button>

                        {/* Total Contribution Display */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Role Distribution Total:</span>
                            <span className={`text-lg font-bold ${
                              field.value?.reduce((sum, r) => sum + r.contributionPercent, 0) === 100
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {field.value?.reduce((sum, r) => sum + r.contributionPercent, 0) || 0}%
                              {field.value?.reduce((sum, r) => sum + r.contributionPercent, 0) === 100
                                ? ' ✓'
                                : ' (must equal 100%)'}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            Total Volunteers: {field.value?.reduce((sum, r) => sum + r.count, 0) || 0}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs text-gray-600">
                              <strong>Effective Project Impact Breakdown:</strong>
                            </div>
                            <div className="mt-1 space-y-1">
                              {field.value?.map((role, idx) => {
                                const totalVolunteer = form.watch("totalVolunteerContribution") || 0;
                                const effectivePercent = formatDecimal(totalVolunteer * role.contributionPercent / 100);
                                return (
                                  <div key={idx} className="flex justify-between text-xs">
                                    <span className="text-gray-600">{role.role} ({role.count} volunteer{role.count > 1 ? 's' : ''}):</span>
                                    <span className="font-medium text-blue-600">{effectivePercent}% of project</span>
                                  </div>
                                );
                              })}
                              <div className="flex justify-between text-xs pt-1 border-t border-gray-200 mt-1">
                                <span className="text-gray-600">Organization Staff:</span>
                                <span className="font-medium text-gray-700">{100 - (form.watch("totalVolunteerContribution") || 0)}% of project</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* AIU Formula Explanation */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Role Weight Methodology (Industry-Aligned)</h4>
                  <p className="text-xs text-blue-700 mb-3">
                    Role weights are based on <strong>Taproot Foundation Pro Bono Valuation 2024</strong>, <strong>Independent Sector</strong>, and <strong>SROI methodology</strong>:
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-700">
                    <div className="font-semibold text-blue-800 col-span-2 mt-1">Executive & Strategic</div>
                    <div>• Executive/C-Suite (4.0x)</div>
                    <div>• Strategic Advisor (3.5x)</div>

                    <div className="font-semibold text-blue-800 col-span-2 mt-2">Pro Bono Professional</div>
                    <div>• Legal/Medical (3.0x)</div>
                    <div>• Finance/Tech (2.5x)</div>
                    <div>• Marketing (2.0x)</div>

                    <div className="font-semibold text-blue-800 col-span-2 mt-2">Project Leadership</div>
                    <div>• Project Lead (1.8x)</div>
                    <div>• Team Lead/Captain (1.5x)</div>

                    <div className="font-semibold text-blue-800 col-span-2 mt-2">Skilled & General</div>
                    <div>• Mentor/Specialist (1.3-1.4x)</div>
                    <div>• Support/Volunteer (1.0x)</div>

                    <div className="font-semibold text-blue-800 col-span-2 mt-2">Administrative & Learning</div>
                    <div>• Admin/Logistics (0.7-0.8x)</div>
                    <div>• Trainee/Observer (0.3-0.5x)</div>
                  </div>
                  <p className="text-xs text-blue-600 mt-3 italic">
                    Sources: Taproot Foundation ($220/hr pro bono), Independent Sector ($34.79/hr baseline), BLS wage methodology
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                data-testid="button-cancel"
                type="button"
                variant="outline"
                onClick={() => navigate("/opportunities")}
              >
                Cancel
              </Button>
              <Button
                data-testid="button-submit"
                type="submit"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Posting..." : "Post Opportunity"}
              </Button>
            </div>
          </form>
        </Form>
    </>
  );

  // Mobile PWA View for Organizations
  if (isMobile && isOrganizationForLayout) {
    return (
      <OrganizationPWALayout activeTab="projects">
        <div className="p-4">
          {formContent}
        </div>
      </OrganizationPWALayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {isOrganizationForLayout && <OrganizationNav />}
      <div className="max-w-4xl mx-auto py-8 px-4 light">
        {formContent}
      </div>
    </div>
  );
}
