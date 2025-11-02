import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { sdgGoals } from "@shared/sdg-goals";
import { ArrowRight, ArrowLeft, Check, Building, Globe, Users, Target, FileCheck } from "lucide-react";

const organizationProfileSchema = z.object({
  missionStatement: z.string().min(20, "Please provide a detailed mission statement"),
  focusAreas: z.array(z.string()).min(1, "Select at least one focus area"),
  organizationType: z.string().min(1, "Select organization type"),
  size: z.enum(["small", "medium", "large"]),
  yearFounded: z.coerce.number().min(1800).max(new Date().getFullYear()),
  taxId: z.string().optional(),
  registrationNumber: z.string().optional(),
  primarySdgs: z.array(z.number()).min(1, "Select at least one primary SDG"),
  geographicScope: z.enum(["local", "regional", "national", "international"]),
  targetBeneficiaries: z.string().min(10, "Describe who you serve"),
  volunteerNeeds: z.array(z.string()).min(1, "Specify volunteer needs"),
  onboardingCompleted: z.boolean().default(true)
});

type OrganizationProfileForm = z.infer<typeof organizationProfileSchema>;

const focusAreaOptions = [
  "Education", "Health & Wellness", "Environment", "Poverty Alleviation",
  "Clean Water & Sanitation", "Gender Equality", "Economic Development",
  "Climate Action", "Community Development", "Youth Empowerment",
  "Animal Welfare", "Arts & Culture", "Technology", "Human Rights", "Disaster Relief"
];

const volunteerNeedOptions = [
  "Project Management", "Marketing & Communications", "Fundraising",
  "Grant Writing", "Event Planning", "Teaching & Training",
  "Technical Skills (IT/Web)", "Healthcare Professionals", "Legal Advice",
  "Accounting & Finance", "Research & Analysis", "Manual Labor",
  "Administrative Support", "Translation Services", "Mentoring"
];

export default function OrganizationIntake() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [customFocusArea, setCustomFocusArea] = useState("");
  const [customVolunteerNeed, setCustomVolunteerNeed] = useState("");

  const { data: existingProfile } = useQuery({
    queryKey: ["/api/intake/organization-profile", user?.organizationId],
    enabled: !!user?.organizationId
  });

  const form = useForm<OrganizationProfileForm>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues: {
      missionStatement: existingProfile?.missionStatement || "",
      focusAreas: existingProfile?.focusAreas || [],
      organizationType: existingProfile?.organizationType || "",
      size: existingProfile?.size || "small",
      yearFounded: existingProfile?.yearFounded || new Date().getFullYear(),
      taxId: existingProfile?.taxId || "",
      registrationNumber: existingProfile?.registrationNumber || "",
      primarySdgs: existingProfile?.primarySdgs || [],
      geographicScope: existingProfile?.geographicScope || "local",
      targetBeneficiaries: existingProfile?.targetBeneficiaries || "",
      volunteerNeeds: existingProfile?.volunteerNeeds || [],
      onboardingCompleted: true
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: OrganizationProfileForm) => {
      return await apiRequest({
        url: `/api/intake/organization-profile?organizationId=${user?.organizationId}`,
        method: "POST",
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intake/organization-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: "Profile completed!",
        description: "Your organization profile has been successfully created."
      });
      navigate("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: OrganizationProfileForm) => {
    submitMutation.mutate(data);
  };

  const toggleFocusArea = (area: string) => {
    const current = form.getValues("focusAreas") || [];
    if (current.includes(area)) {
      form.setValue("focusAreas", current.filter(a => a !== area));
    } else {
      form.setValue("focusAreas", [...current, area]);
    }
  };

  const addCustomFocusArea = () => {
    if (customFocusArea.trim()) {
      const current = form.getValues("focusAreas") || [];
      if (!current.includes(customFocusArea.trim())) {
        form.setValue("focusAreas", [...current, customFocusArea.trim()]);
      }
      setCustomFocusArea("");
    }
  };

  const toggleVolunteerNeed = (need: string) => {
    const current = form.getValues("volunteerNeeds") || [];
    if (current.includes(need)) {
      form.setValue("volunteerNeeds", current.filter(n => n !== need));
    } else {
      form.setValue("volunteerNeeds", [...current, need]);
    }
  };

  const addCustomVolunteerNeed = () => {
    if (customVolunteerNeed.trim()) {
      const current = form.getValues("volunteerNeeds") || [];
      if (!current.includes(customVolunteerNeed.trim())) {
        form.setValue("volunteerNeeds", [...current, customVolunteerNeed.trim()]);
      }
      setCustomVolunteerNeed("");
    }
  };

  const toggleSDG = (sdgNumber: number) => {
    const current = form.getValues("primarySdgs") || [];
    if (current.includes(sdgNumber)) {
      form.setValue("primarySdgs", current.filter(s => s !== sdgNumber));
    } else {
      form.setValue("primarySdgs", [...current, sdgNumber]);
    }
  };

  const totalSteps = 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Synerxus!</h1>
          <p className="text-gray-600 dark:text-gray-300">Let's set up your organization profile</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  s < step ? "bg-green-500 text-white" : s === step ? "bg-purple-500 text-white" : "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}>
                  {s < step ? <Check className="w-6 h-6" /> : s}
                </div>
                {s < totalSteps && (
                  <div className={`flex-1 h-1 mx-2 ${s < step ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <Card data-testid="card-step-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-6 h-6" />
                    Organization Details
                  </CardTitle>
                  <CardDescription>Tell us about your organization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="missionStatement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mission Statement</FormLabel>
                        <FormDescription>What is your organization's mission?</FormDescription>
                        <FormControl>
                          <Textarea
                            data-testid="textarea-mission"
                            placeholder="Our mission is to..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="organizationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-org-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="nonprofit">Nonprofit</SelectItem>
                              <SelectItem value="ngo">NGO</SelectItem>
                              <SelectItem value="social-enterprise">Social Enterprise</SelectItem>
                              <SelectItem value="community-org">Community Organization</SelectItem>
                              <SelectItem value="charity">Charity</SelectItem>
                              <SelectItem value="foundation">Foundation</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Size</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-org-size">
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="small">Small (1-10 people)</SelectItem>
                              <SelectItem value="medium">Medium (11-50 people)</SelectItem>
                              <SelectItem value="large">Large (50+ people)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="yearFounded"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year Founded</FormLabel>
                          <FormControl>
                            <Input data-testid="input-year-founded" type="number" min="1800" max={new Date().getFullYear()} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="geographicScope"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Geographic Scope</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-geographic-scope">
                                <SelectValue placeholder="Select scope" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="local">Local</SelectItem>
                              <SelectItem value="regional">Regional</SelectItem>
                              <SelectItem value="national">National</SelectItem>
                              <SelectItem value="international">International</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card data-testid="card-step-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="w-6 h-6" />
                    Verification & Legal
                  </CardTitle>
                  <CardDescription>Help us verify your organization (optional but recommended)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID / EIN (Optional)</FormLabel>
                        <FormDescription>For verification purposes</FormDescription>
                        <FormControl>
                          <Input data-testid="input-tax-id" placeholder="XX-XXXXXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="registrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number (Optional)</FormLabel>
                        <FormDescription>Official registration or charity number</FormDescription>
                        <FormControl>
                          <Input data-testid="input-registration-number" placeholder="Registration number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="focusAreas"
                    render={() => (
                      <FormItem>
                        <FormLabel>Focus Areas</FormLabel>
                        <FormDescription>What areas does your organization work in?</FormDescription>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {focusAreaOptions.map((area) => (
                            <Badge
                              key={area}
                              data-testid={`badge-focus-${area.toLowerCase().replace(/\s+/g, '-')}`}
                              variant={form.watch("focusAreas")?.includes(area) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => toggleFocusArea(area)}
                            >
                              {area}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Input
                            data-testid="input-custom-focus-area"
                            placeholder="Add custom focus area"
                            value={customFocusArea}
                            onChange={(e) => setCustomFocusArea(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomFocusArea())}
                          />
                          <Button data-testid="button-add-focus-area" type="button" onClick={addCustomFocusArea} variant="outline">
                            Add
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card data-testid="card-step-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-6 h-6" />
                    SDG Alignment
                  </CardTitle>
                  <CardDescription>Which UN Sustainable Development Goals align with your work?</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="primarySdgs"
                    render={() => (
                      <FormItem>
                        <FormLabel>Primary SDG Focus</FormLabel>
                        <FormDescription>Select the goals your organization primarily contributes to</FormDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                          {Object.values(sdgGoals).map((sdg) => (
                            <div
                              key={sdg.id}
                              data-testid={`card-sdg-${sdg.id}`}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                form.watch("primarySdgs")?.includes(sdg.id)
                                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                              }`}
                              onClick={() => toggleSDG(sdg.id)}
                            >
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  checked={form.watch("primarySdgs")?.includes(sdg.id)}
                                  className="mt-1"
                                />
                                <div>
                                  <p className="font-semibold text-sm">SDG {sdg.id}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{sdg.name}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card data-testid="card-step-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    Target Beneficiaries & Volunteer Needs
                  </CardTitle>
                  <CardDescription>Who you serve and what help you need</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="targetBeneficiaries"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Beneficiaries</FormLabel>
                        <FormDescription>Who does your organization serve?</FormDescription>
                        <FormControl>
                          <Textarea
                            data-testid="textarea-beneficiaries"
                            placeholder="We serve..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="volunteerNeeds"
                    render={() => (
                      <FormItem>
                        <FormLabel>Volunteer Needs</FormLabel>
                        <FormDescription>What types of volunteers are you looking for?</FormDescription>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {volunteerNeedOptions.map((need) => (
                            <Badge
                              key={need}
                              data-testid={`badge-need-${need.toLowerCase().replace(/\s+/g, '-')}`}
                              variant={form.watch("volunteerNeeds")?.includes(need) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => toggleVolunteerNeed(need)}
                            >
                              {need}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Input
                            data-testid="input-custom-volunteer-need"
                            placeholder="Add custom volunteer need"
                            value={customVolunteerNeed}
                            onChange={(e) => setCustomVolunteerNeed(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomVolunteerNeed())}
                          />
                          <Button data-testid="button-add-volunteer-need" type="button" onClick={addCustomVolunteerNeed} variant="outline">
                            Add
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between gap-4">
              <Button
                data-testid="button-previous"
                type="button"
                variant="outline"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {step < totalSteps ? (
                <Button
                  data-testid="button-next"
                  type="button"
                  onClick={() => setStep(Math.min(totalSteps, step + 1))}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  data-testid="button-submit"
                  type="submit"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? "Submitting..." : "Complete Profile"}
                  <Check className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
