import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, UserPlus, Upload, X, Image, UserCheck, Info, Target, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { uploadFile, deleteFile, extractStoragePath, uploadProjectCover } from "@/lib/upload";
import { ProjectCoverUpload } from "@/components/project-cover-upload";
import type { Project } from "@shared/schema";
import { formatDecimal } from "@/lib/format-utils";
import { FormDescription } from "@/components/ui/form";

// Predefined KPI/Metric presets organized by category
const KPI_PRESETS = [
  {
    category: "Education",
    metrics: [
      { name: "Students Tutored", unit: "students" },
      { name: "Literacy Rate Improvement", unit: "percentage" },
      { name: "Training Sessions Delivered", unit: "sessions" },
      { name: "Scholarships Awarded", unit: "scholarships" },
    ]
  },
  {
    category: "Environment",
    metrics: [
      { name: "Trees Planted", unit: "trees" },
      { name: "Waste Collected", unit: "kg" },
      { name: "Carbon Offset", unit: "tonnes CO2" },
      { name: "Water Bodies Cleaned", unit: "sites" },
    ]
  },
  {
    category: "Health",
    metrics: [
      { name: "Patients Served", unit: "patients" },
      { name: "Health Screenings Conducted", unit: "screenings" },
      { name: "Meals Distributed", unit: "meals" },
      { name: "First Aid Kits Delivered", unit: "kits" },
    ]
  },
  {
    category: "Community",
    metrics: [
      { name: "Families Supported", unit: "families" },
      { name: "Homes Built or Repaired", unit: "homes" },
      { name: "Community Events Organized", unit: "events" },
      { name: "People Reached", unit: "people" },
    ]
  },
  {
    category: "Economic",
    metrics: [
      { name: "Jobs Created", unit: "jobs" },
      { name: "Businesses Mentored", unit: "businesses" },
      { name: "Microloans Facilitated", unit: "loans" },
      { name: "Skills Certifications Issued", unit: "certifications" },
    ]
  },
];

// KPI emoji map for auto-generating outcomeTemplates
const KPI_EMOJI_MAP: Record<string, string> = {
  "Trees Planted": "\u{1F333}",
  "Waste Collected": "\u{267B}\uFE0F",
  "Carbon Offset": "\u{1F30D}",
  "Water Bodies Cleaned": "\u{1F4A7}",
  "Students Tutored": "\u{1F393}",
  "Literacy Rate Improvement": "\u{1F4DA}",
  "Training Sessions Delivered": "\u{1F3EB}",
  "Scholarships Awarded": "\u{1F3C6}",
  "Patients Served": "\u{1FA7A}",
  "Health Screenings Conducted": "\u{2695}\uFE0F",
  "Meals Distributed": "\u{1F372}",
  "First Aid Kits Delivered": "\u{1F6E1}\uFE0F",
  "Families Supported": "\u{1F46A}",
  "Homes Built or Repaired": "\u{1F3E0}",
  "Community Events Organized": "\u{1F389}",
  "People Reached": "\u{1F465}",
  "Jobs Created": "\u{1F4BC}",
  "Businesses Mentored": "\u{1F4C8}",
  "Microloans Facilitated": "\u{1F4B0}",
  "Skills Certifications Issued": "\u{1F4DD}",
};

function buildOutcomeTemplates(impactMetricName?: string, impactMetricUnit?: string, primarySdg?: number, sdgGoals?: number[]) {
  if (!impactMetricName) return undefined;
  const sdg = primarySdg || (sdgGoals && sdgGoals.length > 0 ? sdgGoals[0] : 0);
  const icon = KPI_EMOJI_MAP[impactMetricName] || "\u{1F4CA}";
  return [{
    name: impactMetricName,
    unit: impactMetricUnit || "units",
    sdg: sdg || 0,
    icon,
    sortOrder: 0,
  }];
}

// Volunteer role schema for AIU contribution tracking
const volunteerRoleSchema = z.object({
  role: z.string().min(1, "Role is required"),
  contributionPercent: z.number().min(1).max(100),
  count: z.number().min(1),
  description: z.string().optional(),
});

const projectFormSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.enum(["planning", "active", "completed", "on-hold"]).default("planning"),
  location: z.string().min(1, "Location is required for volunteer matching"),
  sdgs: z.string().optional(),
  primarySdg: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  // Skills and experience
  requiredSkills: z.string().optional(),
  optionalSkills: z.string().optional(),
  experienceLevel: z.enum(["entry-level", "intermediate", "expert"]).optional(),
  // Engagement type
  engagementType: z.enum(["remote", "in-person", "hybrid"]).optional(),
  // Time commitment
  commitmentType: z.enum(["ongoing", "project-based", "event"]).optional(),
  ongoingHoursPerWeek: z.string().optional(),
  projectTotalHours: z.string().optional(),
  // Impact metrics
  impactMetricName: z.string().optional(),
  impactMetricUnit: z.string().optional(),
  // Completion tracking
  completionPercentage: z.string().optional(),
  totalHoursLogged: z.string().optional(),
  // Legacy fields
  volunteersNeeded: z.string().optional(),
  impactGoals: z.string().optional(),
  // Total volunteer contribution percentage for AIU calculation
  // This is the percentage of the project's total impact attributed to volunteers
  // The remaining percentage goes to the organization's paid staff
  totalVolunteerContribution: z.number().min(1).max(100).default(30),
  // Volunteer roles with AIU contribution percentages
  volunteerRoles: z.array(volunteerRoleSchema).optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface CreateProjectDialogProps {
  organizationId: number;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateProjectDialog({ organizationId, defaultOpen = false, onOpenChange }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Update internal open state when defaultOpen prop changes
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  // Handle external open state changes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploadingImage(true);
      const result = await uploadProjectCover(file, organizationId.toString());
      setCoverImageUrl(result.url);
      toast({
        title: "Image uploaded",
        description: "Cover image has been uploaded successfully."
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (coverImageUrl) {
      const path = extractStoragePath(coverImageUrl);
      if (path) {
        try {
          await deleteFile(path);
        } catch {
          // non-critical
        }
      }
      setCoverImageUrl("");
    }
  };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "planning",
      location: "",
      sdgs: "",
      primarySdg: "",
      startDate: "",
      endDate: "",
      requiredSkills: "",
      optionalSkills: "",
      experienceLevel: undefined,
      engagementType: undefined,
      commitmentType: undefined,
      ongoingHoursPerWeek: "",
      projectTotalHours: "",
      impactMetricName: "",
      impactMetricUnit: "",
      completionPercentage: "",
      totalHoursLogged: "",
      volunteersNeeded: "",
      impactGoals: "",
      totalVolunteerContribution: 30, // Default 30% of project impact attributed to volunteers
      volunteerRoles: [
        { role: "lead", contributionPercent: 40, count: 1, description: "Project coordinator/lead" },
        { role: "support", contributionPercent: 60, count: 2, description: "General support volunteers" }
      ],
    }
  });

  // Use field array for managing volunteer roles dynamically
  const { fields: roleFields, append: appendRole, remove: removeRole } = useFieldArray({
    control: form.control,
    name: "volunteerRoles",
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      const sdgArray = data.sdgs
        ? data.sdgs.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 17)
        : [];

      const requiredSkillsArray = data.requiredSkills
        ? data.requiredSkills.split(",").map(s => s.trim()).filter(s => s.length > 0)
        : [];

      const optionalSkillsArray = data.optionalSkills
        ? data.optionalSkills.split(",").map(s => s.trim()).filter(s => s.length > 0)
        : [];

      // Calculate total volunteers needed from role counts
      const totalVolunteersNeeded = data.volunteerRoles?.reduce((sum, role) => sum + role.count, 0)
        || (data.volunteersNeeded ? parseInt(data.volunteersNeeded) : 1);

      const payload: any = {
        name: data.name,
        description: data.description,
        status: data.status,
        location: data.location,
        organizationId,
        sdgGoals: sdgArray,
        requiredSkills: requiredSkillsArray,
        optionalSkills: optionalSkillsArray,
        coverImage: coverImageUrl || null, // Add cover image for marketing purposes
        // Volunteer participation percentage for AIU calculation
        // This determines what portion of the project's impact is attributed to volunteers
        totalVolunteerContribution: data.totalVolunteerContribution || 30,
        // Volunteer roles with AIU contribution percentages
        volunteerRoles: data.volunteerRoles || [],
        volunteersNeeded: totalVolunteersNeeded,
      };

      if (data.startDate) payload.startDate = new Date(data.startDate).toISOString();
      if (data.endDate) payload.endDate = new Date(data.endDate).toISOString();

      if (data.primarySdg) payload.primarySdg = parseInt(data.primarySdg);
      if (data.experienceLevel) payload.experienceLevel = data.experienceLevel;
      if (data.engagementType) payload.engagementType = data.engagementType;
      if (data.commitmentType) payload.commitmentType = data.commitmentType;
      if (data.ongoingHoursPerWeek) payload.ongoingHoursPerWeek = parseInt(data.ongoingHoursPerWeek);
      if (data.projectTotalHours) payload.projectTotalHours = parseInt(data.projectTotalHours);
      if (data.impactMetricName) payload.impactMetricName = data.impactMetricName;
      if (data.impactMetricUnit) payload.impactMetricUnit = data.impactMetricUnit;
      // Auto-generate outcomeTemplates so KPI tiles appear in activity logging
      const outcomeTemplates = buildOutcomeTemplates(
        data.impactMetricName, data.impactMetricUnit,
        data.primarySdg ? parseInt(data.primarySdg) : undefined, sdgArray
      );
      if (outcomeTemplates) payload.outcomeTemplates = outcomeTemplates;
      if (data.completionPercentage) payload.completionPercentage = parseInt(data.completionPercentage);
      if (data.totalHoursLogged) payload.totalHoursLogged = parseInt(data.totalHoursLogged);

      // Store legacy data in goals field as JSON
      if (data.impactGoals) {
        payload.goals = {
          impactGoals: data.impactGoals || null,
        };
      }

      const response = await apiRequest("POST", "/api/projects", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project created successfully"
      });
      handleOpenChange(false);
      form.reset();
      setCoverImageUrl(""); // Reset cover image
    },
    onError: (error: any) => {
      console.error("Project creation failed:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create project",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ProjectFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-project">
          <Plus className="h-4 w-4 mr-2" />
          Create Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Add a new project to track volunteer activities and impact. Provide detailed information for better volunteer matching.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: The Basics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Section 1: The Basics</h3>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Volunteer Grant Writer for Education Program" {...field} data-testid="input-project-name" />
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
                    <FormLabel>Description of the Project</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Be specific. What will volunteers do? What are the key responsibilities? What makes this project impactful?"
                        className="min-h-[100px]"
                        {...field}
                        data-testid="input-project-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cover Image Section */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Project Cover Image
                </Label>
                <ProjectCoverUpload
                  currentCoverUrl={coverImageUrl}
                  onCoverChange={setCoverImageUrl}
                  projectId={organizationId.toString()}
                  enableCrop={true}
                />
              </div>
            </div>

            {/* Section 2: The Ideal Volunteer */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Section 2: The Ideal Volunteer</h3>
              <FormField
                control={form.control}
                name="requiredSkills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Skills</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Marketing, React.js, First Aid, Spanish (comma-separated)"
                        {...field}
                        data-testid="input-project-required-skills"
                      />
                    </FormControl>
                    <p className="text-sm text-blue-600 font-medium">✓ Most important for AI matching (35% weight)</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="optionalSkills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Optional Skills (Nice to Have)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Photography, Event Planning (comma-separated)"
                        {...field}
                        data-testid="input-project-optional-skills"
                      />
                    </FormControl>
                    <p className="text-sm text-gray-500">Skills that are a bonus but not required</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="experienceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience Level Required</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-experience-level">
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="entry-level">Entry-Level (General tasks, no specific experience needed)</SelectItem>
                        <SelectItem value="intermediate">Intermediate (Some experience preferred)</SelectItem>
                        <SelectItem value="expert">Expert / Specialist (Requires a high-level professional)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 3: The Logistics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Section 3: The Logistics</h3>
              <FormField
                control={form.control}
                name="engagementType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engagement Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-engagement-type">
                          <SelectValue placeholder="Select engagement type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="remote">Remote / Virtual (Global or region-specific)</SelectItem>
                        <SelectItem value="in-person">In-Person (At a specific location)</SelectItem>
                        <SelectItem value="hybrid">Hybrid (A mix of both)</SelectItem>
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
                      <Input placeholder="City, Country (e.g., Nairobi, Kenya)" {...field} data-testid="input-project-location" />
                    </FormControl>
                    <p className="text-sm text-blue-600 font-medium">✓ Critical for matching local volunteers (25% weight)</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-project-start-date" />
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
                        <Input type="date" {...field} data-testid="input-project-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="commitmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Commitment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-commitment-type">
                          <SelectValue placeholder="Select commitment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ongoing">Ongoing (Regular weekly/monthly hours)</SelectItem>
                        <SelectItem value="project-based">Project-Based (Total hours for completion)</SelectItem>
                        <SelectItem value="event">Event (Specific date and time)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ongoingHoursPerWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ongoing Hours per Week</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 5"
                          {...field}
                          data-testid="input-ongoing-hours"
                        />
                      </FormControl>
                      <p className="text-sm text-gray-500">For ongoing commitments</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="projectTotalHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Hours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 40"
                          {...field}
                          data-testid="input-total-hours"
                        />
                      </FormControl>
                      <p className="text-sm text-gray-500">For project-based work</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
            </div>

            {/* Section: Volunteer Roles & AIU Contributions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Volunteer Roles & AIU Contributions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Define volunteer roles and their contribution percentages for AIU (Attributed Impact Unit) calculations.
              </p>

              {/* Total Volunteer Participation Percentage - Critical for AIU */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <FormField
                  control={form.control}
                  name="totalVolunteerContribution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Total Volunteer Participation (% of Project Impact)
                      </FormLabel>
                      <FormDescription className="text-blue-700 dark:text-blue-300">
                        What percentage of the project's total impact is attributed to volunteers?
                        The remaining {100 - (field.value || 0)}% goes to your organization's paid staff.
                      </FormDescription>
                      <div className="flex items-center gap-4 mt-3">
                        <FormControl>
                          <Slider
                            min={1}
                            max={100}
                            step={5}
                            value={[field.value || 30]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                        </FormControl>
                        <div className="w-20 text-center">
                          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {field.value || 30}%
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 mt-1">
                        <span>1% (Minimal volunteer role)</span>
                        <span>100% (Fully volunteer-driven)</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="mt-3 p-2 bg-white dark:bg-slate-800 rounded border border-blue-100 dark:border-blue-700">
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <strong>Why this matters for AIU:</strong> This percentage determines how much of the project's measurable impact
                    (lives touched, outcomes achieved) is credited to volunteer contributions vs. your organization's internal resources.
                  </p>
                </div>
              </div>

              {/* Total Volunteers Display */}
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
                  <span className="text-sm font-medium">Total Contribution:</span>
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
                  <p className="text-xs text-orange-500 mt-1">Contribution percentages should total 100%</p>
                )}
              </div>

              {/* Role List */}
              <div className="space-y-3">
                {roleFields.map((field, index) => (
                  <div key={field.id} className="p-3 border rounded-lg bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Role {index + 1}</span>
                      {roleFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRole(index)}
                          className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={`volunteerRoles.${index}.role`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Role Name</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="h-9">
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
                            <FormLabel className="text-xs"># Volunteers</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                className="h-9"
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
                            <FormLabel className="text-xs">AIU Contribution %</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                className="h-9"
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
                        name={`volunteerRoles.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Description</FormLabel>
                            <FormControl>
                              <Input className="h-9" {...field} placeholder="Role responsibilities" />
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
                size="sm"
                onClick={() => appendRole({ role: "support", contributionPercent: 10, count: 1, description: "" })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Role
              </Button>

              {/* Effective Project Impact Breakdown Summary */}
              <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                  <strong>Effective Project Impact Breakdown:</strong>
                </div>
                <div className="space-y-1">
                  {roleFields.map((_, idx) => {
                    const role = form.watch(`volunteerRoles.${idx}`);
                    const totalVolunteer = form.watch("totalVolunteerContribution") || 30;
                    const effectivePercent = formatDecimal(totalVolunteer * (role?.contributionPercent || 0) / 100);
                    return (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">{role?.role || 'Role'} ({role?.count || 0} volunteer{(role?.count || 0) > 1 ? 's' : ''}):</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{effectivePercent}% of project impact</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-xs pt-1 border-t border-emerald-200 dark:border-emerald-700 mt-1">
                    <span className="text-gray-600 dark:text-gray-400">Organization Staff:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">{100 - (form.watch("totalVolunteerContribution") || 30)}% of project impact</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: The Purpose & Impact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Section 4: The Purpose & Impact</h3>
              <FormField
                control={form.control}
                name="primarySdg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary SDG Alignment</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="17"
                        placeholder="Select the one main UN SDG (1-17)"
                        {...field}
                        data-testid="input-primary-sdg"
                      />
                    </FormControl>
                    <p className="text-sm text-blue-600 font-medium">✓ Matches volunteer passions (20% weight)</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sdgs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional SDG Alignments</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 1, 3, 6 (comma-separated, 1-17)"
                        {...field}
                        data-testid="input-project-sdgs"
                      />
                    </FormControl>
                    <p className="text-sm text-gray-500">Optional: Other SDGs this project supports</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-950 rounded">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Define Your Impact KPI (Critical for Dashboard)
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Select a predefined KPI or create a custom one. Volunteers will report against this metric.
                </p>

                {/* KPI Preset Selection */}
                <div className="mb-4">
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Quick Select a KPI</Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2 bg-white dark:bg-slate-900">
                    {KPI_PRESETS.map((category) => (
                      <div key={category.category}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {category.category}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {category.metrics.map((metric) => {
                            const isSelected = form.watch("impactMetricName") === metric.name;
                            return (
                              <button
                                key={metric.name}
                                type="button"
                                onClick={() => {
                                  form.setValue("impactMetricName", metric.name);
                                  form.setValue("impactMetricUnit", metric.unit);
                                }}
                                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                  isSelected
                                    ? 'bg-blue-100 border-blue-400 text-blue-700 font-medium'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300'
                                }`}
                              >
                                {metric.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom KPI fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="impactMetricName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KPI / Metric Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Students Tutored"
                            {...field}
                            data-testid="input-metric-name"
                          />
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
                        <FormControl>
                          <Input
                            placeholder="e.g., students, trees, families"
                            {...field}
                            data-testid="input-metric-unit"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {form.watch("impactMetricName") && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Selected KPI: <strong>{form.watch("impactMetricName")}</strong> (measured in {form.watch("impactMetricUnit") || "units"})
                    </p>
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="impactGoals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impact Goals (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the expected impact and outcomes..."
                        className="min-h-[80px]"
                        {...field}
                        data-testid="input-project-impact-goals"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 5: Completion Tracking */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Section 5: Completion Tracking</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Track progress when the project is completed or ongoing
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalHoursLogged"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours Logged</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 120"
                          {...field}
                          data-testid="input-hours-logged"
                        />
                      </FormControl>
                      <p className="text-sm text-gray-500">Actual volunteer hours completed</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="completionPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Completion Percentage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="e.g., 75"
                          {...field}
                          data-testid="input-completion-percentage"
                        />
                      </FormControl>
                      <p className="text-sm text-gray-500">Project completion (0-100%)</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-submit-project"
              >
                {createMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface EditProjectDialogProps {
  project: Project;
}

export function EditProjectDialog({ project }: EditProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState(project.coverImage || "");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploadingImage(true);
      const orgId = project.organizationId?.toString();
      if (!orgId) {
        throw new Error("Organization ID is missing for this project");
      }
      const result = await uploadProjectCover(file, orgId);
      setCoverImageUrl(result.url);
      toast({
        title: "Image uploaded",
        description: "Cover image has been uploaded successfully."
      });
    } catch (error: any) {
      console.error("[EditProject] Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (coverImageUrl) {
      const path = extractStoragePath(coverImageUrl);
      if (path) {
        try {
          await deleteFile(path);
        } catch {
          // non-critical
        }
      }
      setCoverImageUrl("");
    }
  };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project.name,
      description: project.description || "",
      status: (project.status as any) || "planning",
      sdgs: project.sdgGoals?.join(", ") || "",
      location: project.location || "",
      primarySdg: project.primarySdg?.toString() || "",
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
      requiredSkills: project.requiredSkills?.join(", ") || "",
      optionalSkills: project.optionalSkills?.join(", ") || "",
      experienceLevel: (project.experienceLevel as any) || undefined,
      engagementType: (project.engagementType as any) || undefined,
      commitmentType: (project.commitmentType as any) || undefined,
      ongoingHoursPerWeek: project.ongoingHoursPerWeek?.toString() || "",
      projectTotalHours: project.projectTotalHours?.toString() || "",
      impactMetricName: project.impactMetricName || "",
      impactMetricUnit: project.impactMetricUnit || "",
      completionPercentage: project.completionPercentage?.toString() || "",
      totalHoursLogged: project.totalHoursLogged?.toString() || "",
      totalVolunteerContribution: project.totalVolunteerContribution || 30,
      volunteerRoles: (project.volunteerRoles as any[]) || [
        { role: "lead", contributionPercent: 40, count: 1, description: "Project coordinator/lead" },
        { role: "support", contributionPercent: 60, count: 2, description: "General support volunteers" }
      ],
    }
  });

  const editMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      const sdgArray = data.sdgs
        ? data.sdgs.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 17)
        : [];

      // Calculate total volunteers needed from role counts
      const totalVolunteersNeeded = data.volunteerRoles?.reduce((sum, role) => sum + role.count, 0)
        || (data.volunteersNeeded ? parseInt(data.volunteersNeeded) : 1);

      // Auto-generate outcomeTemplates so KPI tiles appear in activity logging
      const outcomeTemplates = buildOutcomeTemplates(
        data.impactMetricName, data.impactMetricUnit,
        data.primarySdg ? parseInt(data.primarySdg) : undefined, sdgArray
      );

      const payload: any = {
        ...data,
        sdgGoals: sdgArray,
        coverImage: coverImageUrl || null,
        volunteersNeeded: totalVolunteersNeeded,
        ...(outcomeTemplates ? { outcomeTemplates } : {}),
      };

      if (data.startDate) payload.startDate = new Date(data.startDate).toISOString();
      if (data.endDate) payload.endDate = new Date(data.endDate).toISOString();
      if (data.primarySdg) payload.primarySdg = parseInt(data.primarySdg);
      if (data.ongoingHoursPerWeek) payload.ongoingHoursPerWeek = parseInt(data.ongoingHoursPerWeek);
      if (data.projectTotalHours) payload.projectTotalHours = parseInt(data.projectTotalHours);
      if (data.completionPercentage) payload.completionPercentage = parseInt(data.completionPercentage);
      if (data.totalHoursLogged) payload.totalHoursLogged = parseInt(data.totalHoursLogged);

      const response = await apiRequest("PATCH", `/api/projects/${project.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project updated successfully"
      });
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ProjectFormValues) => {
    editMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`button-edit-project-${project.id}`}>
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project details and status
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-edit-project-name" />
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
                    <Textarea className="min-h-[100px]" {...field} data-testid="input-edit-project-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-project-status">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
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
                  <FormLabel>Location (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-edit-project-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sdgs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UN SDGs (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 1, 3, 6" {...field} data-testid="input-edit-project-sdgs" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* KPI / Impact Metrics */}
            <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-950 rounded">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                Impact KPI / Metrics
              </p>

              {/* KPI Preset Selection */}
              <div className="mb-3">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Quick Select a KPI</Label>
                <div className="space-y-2 max-h-[180px] overflow-y-auto border rounded-lg p-2 bg-white dark:bg-slate-900">
                  {KPI_PRESETS.map((category) => (
                    <div key={category.category}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {category.category}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {category.metrics.map((metric) => {
                          const isSelected = form.watch("impactMetricName") === metric.name;
                          return (
                            <button
                              key={metric.name}
                              type="button"
                              onClick={() => {
                                form.setValue("impactMetricName", metric.name);
                                form.setValue("impactMetricUnit", metric.unit);
                              }}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                isSelected
                                  ? 'bg-blue-100 border-blue-400 text-blue-700 font-medium'
                                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300'
                              }`}
                            >
                              {metric.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="impactMetricName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">KPI / Metric Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Students Tutored" {...field} className="h-9" />
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
                      <FormLabel className="text-xs">Unit of Measurement</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., students" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {form.watch("impactMetricName") && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Selected KPI: <strong>{form.watch("impactMetricName")}</strong> (measured in {form.watch("impactMetricUnit") || "units"})
                  </p>
                </div>
              )}
            </div>

            {/* Cover Image Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Project Cover Image
              </Label>
              <ProjectCoverUpload
                currentCoverUrl={coverImageUrl}
                onCoverChange={setCoverImageUrl}
                projectId={project.id.toString()}
                enableCrop={true}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editMutation.isPending} data-testid="button-update-project">
                {editMutation.isPending ? "Updating..." : "Update Project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteProjectDialogProps {
  project: Project;
}

export function DeleteProjectDialog({ project }: DeleteProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/projects/${project.id}`);
      return response.json();
    },
    onSuccess: () => {
      // Use predicate-based invalidation to match all related queries
      queryClient.invalidateQueries({ predicate: (query) =>
        String(query.queryKey[0]).includes('/api/projects') ||
        String(query.queryKey[0]).includes('/api/tasks') ||
        String(query.queryKey[0]).includes('/api/project-assignments') ||
        String(query.queryKey[0]).includes('/api/dashboard') ||
        String(query.queryKey[0]).includes('/api/opportunities') ||
        String(query.queryKey[0]).includes('/api/stories')
      });
      toast({
        title: "Success",
        description: "Project deleted successfully"
      });
      setOpen(false);
    },
    onError: (error: any) => {
      console.error("[DeleteProject] Error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete project",
        variant: "destructive"
      });
    }
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          data-testid={`button-delete-project-${project.id}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{project.name}"? This will also delete all associated tasks and assignments. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            data-testid="button-confirm-delete-project"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
