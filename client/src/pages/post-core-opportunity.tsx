import { useState } from "react";
import { useLocation } from "wouter";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { sdgGoals } from "@shared/sdg-goals";
import { Briefcase, MapPin, Clock, Target, TrendingUp, X } from "lucide-react";

const skillOptions = [
  "Project Management", "Marketing", "Graphic Design", "Web Development", "Data Analysis",
  "Content Writing", "Social Media", "Fundraising", "Event Planning", "Teaching",
  "Healthcare", "Legal Advice", "Accounting", "Translation", "Photography",
  "Video Editing", "Public Speaking", "Grant Writing", "Research", "Mentoring"
];

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
  benefits: z.string().optional()
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
});

type OpportunityForm = z.infer<typeof opportunitySchema>;

export default function PostCoreOpportunity() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [customSkill, setCustomSkill] = useState("");
  const [customOptionalSkill, setCustomOptionalSkill] = useState("");

  const userId = localStorage.getItem('currentUserId');
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
      benefits: ""
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: OpportunityForm) => {
      return await apiRequest("POST", "/api/opportunities", {
        ...data,
        organizationId: currentUser?.organizationId,
        isRemote: data.engagementType === "remote",
        sdgGoals: [data.primarySdg],
        status: "open",
        isUrgent: false
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

  return (
    <div className="min-h-screen bg-[#faf9f7] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Post a Core Opportunity
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            For skilled, ongoing, or project-based volunteer roles. This detailed post will power the AI matching algorithm.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: The Basics */}
            <Card data-testid="card-basics">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Section 1: The Basics
                </CardTitle>
                <CardDescription>What is the role?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            {/* Section 2: The Logistics */}
            <Card data-testid="card-logistics">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Section 2: The Logistics
                </CardTitle>
                <CardDescription>Where and when is this opportunity?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            {/* Section 3: The Ideal Volunteer */}
            <Card data-testid="card-ideal-volunteer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Section 3: The Ideal Volunteer
                </CardTitle>
                <CardDescription>Who are you looking for? This is the most important section for AI matching.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                            className="cursor-pointer"
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
                            className="cursor-pointer"
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
                            className="cursor-pointer"
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
                            className="cursor-pointer"
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
            <Card data-testid="card-impact">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Section 4: The Purpose & Impact
                </CardTitle>
                <CardDescription>Why does this role matter? This powers SDG matching and Impact Dashboards.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
      </div>
    </div>
  );
}
