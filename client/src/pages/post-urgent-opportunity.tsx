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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { sdgGoals } from "@shared/sdg-goals";
import { AlertCircle, Calendar, MapPin, Users, X, ArrowLeft } from "lucide-react";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import OrganizationNav from "@/components/layout/organization-nav";

const skillOptions = [
  "No Specific Skills Required", "Physical Labor", "Event Support", "Customer Service",
  "Food Handling", "First Aid", "Transportation", "Crowd Management"
];

const urgentOpportunitySchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please provide a description of what's happening"),
  location: z.string().min(5, "Location is required for in-person events"),
  eventDate: z.coerce.date(),
  eventStartTime: z.string().min(1, "Start time is required"),
  eventEndTime: z.string().min(1, "End time is required"),
  volunteersNeeded: z.coerce.number().min(1, "Specify number of volunteers needed"),
  primarySdg: z.coerce.number().min(1).max(17, "Select primary SDG"),
  requiresSkills: z.boolean().default(false),
  requiredSkills: z.array(z.string()).optional()
});

type UrgentOpportunityForm = z.infer<typeof urgentOpportunitySchema>;

export default function PostUrgentOpportunity() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [customSkill, setCustomSkill] = useState("");

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

  const form = useForm<UrgentOpportunityForm>({
    resolver: zodResolver(urgentOpportunitySchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      eventDate: new Date(),
      eventStartTime: "",
      eventEndTime: "",
      volunteersNeeded: 10,
      primarySdg: 1,
      requiresSkills: false,
      requiredSkills: []
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: UrgentOpportunityForm) => {
      return await apiRequest("POST", "/api/opportunities", {
        title: data.title,
        description: data.description,
        location: data.location,
        engagementType: "in-person",
        commitmentType: "event",
        eventDate: data.eventDate instanceof Date ? data.eventDate.toISOString() : data.eventDate,
        eventStartTime: data.eventStartTime,
        eventEndTime: data.eventEndTime,
        volunteersNeeded: data.volunteersNeeded,
        primarySdg: data.primarySdg,
        sdgGoals: [data.primarySdg],
        requiredSkills: data.requiresSkills && data.requiredSkills ? data.requiredSkills : [],
        organizationId: currentUser?.organizationId,
        isRemote: false,
        status: "open",
        isUrgent: true,
        impactMetricName: "Total Volunteers",
        impactMetricUnit: "volunteers"
      });
    },
    onSuccess: () => {
      const userId = localStorage.getItem('currentUserId');
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Urgent need posted!",
        description: "Your urgent opportunity has been successfully created and prioritized."
      });
      navigate("/opportunities");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post urgent need",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: UrgentOpportunityForm) => {
    submitMutation.mutate(data);
  };

  const toggleSkill = (skill: string) => {
    const current = form.getValues("requiredSkills") || [];
    if (current.includes(skill)) {
      form.setValue("requiredSkills", current.filter(s => s !== skill));
    } else {
      form.setValue("requiredSkills", [...current, skill]);
    }
  };

  const addCustomSkill = () => {
    if (customSkill.trim()) {
      const current = form.getValues("requiredSkills") || [];
      if (!current.includes(customSkill.trim())) {
        form.setValue("requiredSkills", [...current, customSkill.trim()]);
      }
      setCustomSkill("");
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
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className={`text-orange-500 ${isMobile ? "w-6 h-6" : "w-8 h-8"}`} />
          <h1 className={`font-bold text-white ${isMobile ? "text-xl" : "text-3xl"}`}>
            Post an Urgent Need or Event
          </h1>
        </div>
        <p className={`text-slate-300 ${isMobile ? "text-sm" : ""}`}>
          Use this form for time-sensitive events like fundraisers, community drives, or disaster response where you need volunteers now.
          This will prioritize matching by location and availability.
        </p>
      </div>

      <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card data-testid="card-urgent-details" className="bg-white shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900">Event Details</CardTitle>
                <CardDescription className="text-slate-600">Quick and simple - we'll get you volunteers fast!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-800">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormDescription>e.g., "Urgent: Community Clean-Up Day" or "Volunteers Needed for Food Drive"</FormDescription>
                      <FormControl>
                        <Input data-testid="input-title" placeholder="Enter event title" {...field} />
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
                      <FormLabel>What's Happening?</FormLabel>
                      <FormDescription>A brief description of the event and what volunteers will be doing</FormDescription>
                      <FormControl>
                        <Textarea
                          data-testid="textarea-description"
                          placeholder="Describe the event and volunteer activities..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card data-testid="card-when-where" className="bg-white shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  When & Where
                </CardTitle>
                <CardDescription className="text-slate-600">Date, time, and location details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-800">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Must be In-Person)</FormLabel>
                      <FormDescription>Full address, City, Country</FormDescription>
                      <FormControl>
                        <Input data-testid="input-location" placeholder="e.g., 123 Main St, San Francisco, CA, United States" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Date</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-event-date"
                          type="date"
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="eventStartTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input data-testid="input-start-time" type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="eventEndTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input data-testid="input-end-time" type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="volunteersNeeded"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Volunteers Needed</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-volunteers-needed">
                            <SelectValue placeholder="Select number" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card data-testid="card-purpose-skills" className="bg-white shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Users className="w-5 h-5 text-blue-600" />
                  Purpose & Skills
                </CardTitle>
                <CardDescription className="text-slate-600">SDG alignment and volunteer requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-800">
                <FormField
                  control={form.control}
                  name="primarySdg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary SDG Alignment</FormLabel>
                      <FormDescription>
                        Even for events, this helps volunteers find you. e.g., "SDG 2: Zero Hunger" for a food drive
                      </FormDescription>
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

                <FormField
                  control={form.control}
                  name="requiresSkills"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          data-testid="checkbox-requires-skills"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          This event requires specific skills
                        </FormLabel>
                        <FormDescription>
                          By default, no specific skills are required. Check this if you need volunteers with certain abilities.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch("requiresSkills") && (
                  <FormField
                    control={form.control}
                    name="requiredSkills"
                    render={() => (
                      <FormItem>
                        <FormLabel>Skills Required</FormLabel>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {skillOptions.map((skill) => (
                            <Badge
                              key={skill}
                              data-testid={`badge-skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                              variant={form.watch("requiredSkills")?.includes(skill) ? "default" : "outline"}
                              className={`cursor-pointer ${form.watch("requiredSkills")?.includes(skill) ? "bg-orange-500 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
                              onClick={() => toggleSkill(skill)}
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Input
                            data-testid="input-custom-skill"
                            placeholder="Add custom skill"
                            value={customSkill}
                            onChange={(e) => setCustomSkill(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
                          />
                          <Button data-testid="button-add-skill" type="button" onClick={addCustomSkill} variant="outline">
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {form.watch("requiredSkills")?.map((skill) => (
                            <Badge
                              key={skill}
                              variant="default"
                              className="cursor-pointer bg-orange-500 text-white hover:bg-orange-600"
                              onClick={() => toggleSkill(skill)}
                            >
                              {skill} <X className="w-3 h-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> This event will not use a custom impact metric. Impact will be automatically tracked as
                    <strong> Total Volunteers</strong> and <strong>Total Hours</strong> contributed to your selected SDG.
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
                className="bg-orange-500 hover:bg-orange-600"
              >
                {submitMutation.isPending ? "Posting..." : "Post Urgent Need"}
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
    <div className="min-h-screen pwa-gradient-bg">
      {isOrganizationForLayout && <OrganizationNav />}
      <div className="max-w-3xl mx-auto py-8 px-4 light">
        {formContent}
      </div>
    </div>
  );
}
