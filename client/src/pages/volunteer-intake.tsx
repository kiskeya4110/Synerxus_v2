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
import { ArrowRight, ArrowLeft, Check, UserCircle, Globe, Heart, Clock, MessageSquare, Phone } from "lucide-react";

const skillOptions = [
  "Project Management", "Marketing", "Graphic Design", "Web Development", "Data Analysis",
  "Content Writing", "Social Media", "Fundraising", "Event Planning", "Teaching",
  "Healthcare", "Legal Advice", "Accounting", "Translation", "Photography",
  "Video Editing", "Public Speaking", "Grant Writing", "Research", "Mentoring"
];

const interestOptions = [
  "Education", "Environment", "Health", "Poverty", "Clean Water",
  "Gender Equality", "Climate Action", "Community Development", "Youth Empowerment",
  "Animal Welfare", "Arts & Culture", "Technology", "Human Rights", "Disaster Relief"
];

const volunteerProfileSchema = z.object({
  volunteerName: z.string().min(2, "Your name is required"),
  location: z.string().optional(),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  languages: z.array(z.string()).min(1, "Select at least one language"),
  skills: z.array(z.string()).min(1, "Add at least one skill"),
  interests: z.array(z.string()).min(1, "Select at least one interest"),
  preferredCauses: z.array(z.string()).optional(),
  weeklyAvailability: z.coerce.number().min(1, "Please specify hours per week").max(168),
  preferredWorkStyle: z.enum(["remote", "in-person", "hybrid"]),
  preferredSdgs: z.array(z.number()).min(1, "Select at least one SDG goal"),
  motivations: z.string().min(10, "Please share why you want to volunteer"),
  phoneNumber: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional()
  }).optional(),
  onboardingCompleted: z.boolean().default(true)
});

type VolunteerProfileForm = z.infer<typeof volunteerProfileSchema>;

export default function VolunteerIntake() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [customSkill, setCustomSkill] = useState("");
  const [customLanguage, setCustomLanguage] = useState("");
  const [customInterest, setCustomInterest] = useState("");

  const { data: existingProfile } = useQuery({
    queryKey: ["/api/intake/volunteer-profile", user?.id],
    enabled: !!user?.id
  });

  const form = useForm<VolunteerProfileForm>({
    resolver: zodResolver(volunteerProfileSchema),
    defaultValues: {
      volunteerName: "",
      city: existingProfile?.city || "",
      country: existingProfile?.country || "",
      languages: existingProfile?.languages || [],
      skills: [],
      interests: existingProfile?.interests || [],
      preferredCauses: existingProfile?.preferredCauses || [],
      weeklyAvailability: existingProfile?.weeklyAvailability || 5,
      preferredWorkStyle: existingProfile?.preferredWorkStyle || "remote",
      preferredSdgs: existingProfile?.preferredSdgs || [],
      motivations: existingProfile?.motivations || "",
      phoneNumber: existingProfile?.phoneNumber || "",
      emergencyContact: existingProfile?.emergencyContact || {
        name: "",
        phone: "",
        relationship: ""
      },
      onboardingCompleted: true
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: VolunteerProfileForm) => {
      // Backend will automatically update userType when creating profile
      return await apiRequest(
        "POST",
        `/api/intake/volunteer-profile?userId=${user?.id}`,
        {
          ...data,
          location: `${data.city}, ${data.country}`
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intake/volunteer-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: "Profile completed!",
        description: "Your volunteer profile has been successfully created."
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

  const onSubmit = (data: VolunteerProfileForm) => {
    submitMutation.mutate(data);
  };

  const toggleInterest = (interest: string) => {
    const current = form.getValues("interests") || [];
    if (current.includes(interest)) {
      form.setValue("interests", current.filter(i => i !== interest));
    } else {
      form.setValue("interests", [...current, interest]);
    }
  };

  const addCustomInterest = () => {
    if (customInterest.trim()) {
      const current = form.getValues("interests") || [];
      if (!current.includes(customInterest.trim())) {
        form.setValue("interests", [...current, customInterest.trim()]);
      }
      setCustomInterest("");
    }
  };

  const toggleLanguage = (lang: string) => {
    const current = form.getValues("languages") || [];
    if (current.includes(lang)) {
      form.setValue("languages", current.filter(l => l !== lang));
    } else {
      form.setValue("languages", [...current, lang]);
    }
  };

  const addCustomLanguage = () => {
    if (customLanguage.trim()) {
      const current = form.getValues("languages") || [];
      if (!current.includes(customLanguage.trim())) {
        form.setValue("languages", [...current, customLanguage.trim()]);
      }
      setCustomLanguage("");
    }
  };

  const toggleSDG = (sdgNumber: number) => {
    const current = form.getValues("preferredSdgs") || [];
    if (current.includes(sdgNumber)) {
      form.setValue("preferredSdgs", current.filter(s => s !== sdgNumber));
    } else {
      form.setValue("preferredSdgs", [...current, sdgNumber]);
    }
  };

  const totalSteps = 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Synerxus!</h1>
          <p className="text-gray-600 dark:text-gray-300">Let's set up your volunteer profile</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  s < step ? "bg-green-500 text-white" : s === step ? "bg-blue-500 text-white" : "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
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
                    <UserCircle className="w-6 h-6" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>Tell us where you're from and what languages you speak</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="volunteerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name</FormLabel>
                        <FormDescription>What should we call you?</FormDescription>
                        <FormControl>
                          <Input
                            data-testid="input-volunteer-name"
                            placeholder="e.g., Sarah Johnson"
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
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input data-testid="input-city" placeholder="e.g., San Francisco" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input data-testid="input-country" placeholder="e.g., United States" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="languages"
                    render={() => (
                      <FormItem>
                        <FormLabel>Languages You Speak</FormLabel>
                        <FormDescription>Select all that apply</FormDescription>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {["English", "Spanish", "French", "Mandarin", "Arabic", "Portuguese", "Hindi"].map((lang) => (
                            <Badge
                              key={lang}
                              data-testid={`badge-language-${lang.toLowerCase()}`}
                              variant={form.watch("languages")?.includes(lang) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => toggleLanguage(lang)}
                            >
                              {lang}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Input
                            data-testid="input-custom-language"
                            placeholder="Add other language"
                            value={customLanguage}
                            onChange={(e) => setCustomLanguage(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomLanguage())}
                          />
                          <Button data-testid="button-add-language" type="button" onClick={addCustomLanguage} variant="outline">
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {form.watch("languages")?.filter(lang => !["English", "Spanish", "French", "Mandarin", "Arabic", "Portuguese", "Hindi"].includes(lang)).map((lang) => (
                            <Badge
                              key={lang}
                              variant="default"
                              className="cursor-pointer"
                              onClick={() => toggleLanguage(lang)}
                            >
                              {lang} ×
                            </Badge>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input data-testid="input-phone" placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card data-testid="card-step-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-6 h-6" />
                    Skills & Interests
                  </CardTitle>
                  <CardDescription>What skills and interests do you have?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="skills"
                    render={() => (
                      <FormItem>
                        <FormLabel>Your Skills</FormLabel>
                        <FormDescription>Select skills you possess</FormDescription>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {skillOptions.map((skill) => (
                            <Badge
                              key={skill}
                              data-testid={`badge-skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                              variant={form.watch("skills")?.includes(skill) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                const current = form.getValues("skills") || [];
                                if (current.includes(skill)) {
                                  form.setValue("skills", current.filter(s => s !== skill));
                                } else {
                                  form.setValue("skills", [...current, skill]);
                                }
                              }}
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
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (customSkill.trim()) {
                                  const current = form.getValues("skills") || [];
                                  if (!current.includes(customSkill.trim())) {
                                    form.setValue("skills", [...current, customSkill.trim()]);
                                  }
                                  setCustomSkill("");
                                }
                              }
                            }}
                          />
                          <Button 
                            data-testid="button-add-skill" 
                            type="button" 
                            onClick={() => {
                              if (customSkill.trim()) {
                                const current = form.getValues("skills") || [];
                                if (!current.includes(customSkill.trim())) {
                                  form.setValue("skills", [...current, customSkill.trim()]);
                                }
                                setCustomSkill("");
                              }
                            }} 
                            variant="outline"
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {form.watch("skills")?.filter(skill => !skillOptions.includes(skill)).map((skill) => (
                            <Badge
                              key={skill}
                              variant="default"
                              className="cursor-pointer"
                              onClick={() => {
                                const current = form.getValues("skills") || [];
                                form.setValue("skills", current.filter(s => s !== skill));
                              }}
                            >
                              {skill} ×
                            </Badge>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interests"
                    render={() => (
                      <FormItem>
                        <FormLabel>Areas of Interest</FormLabel>
                        <FormDescription>Select all that interest you</FormDescription>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {interestOptions.map((interest) => (
                            <Badge
                              key={interest}
                              data-testid={`badge-interest-${interest.toLowerCase().replace(/\s+/g, '-')}`}
                              variant={form.watch("interests")?.includes(interest) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => toggleInterest(interest)}
                            >
                              {interest}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Input
                            data-testid="input-custom-interest"
                            placeholder="Add custom interest"
                            value={customInterest}
                            onChange={(e) => setCustomInterest(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomInterest())}
                          />
                          <Button data-testid="button-add-interest" type="button" onClick={addCustomInterest} variant="outline">
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {form.watch("interests")?.filter(int => !interestOptions.includes(int)).map((interest) => (
                            <Badge
                              key={interest}
                              variant="default"
                              className="cursor-pointer"
                              onClick={() => toggleInterest(interest)}
                            >
                              {interest} ×
                            </Badge>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="motivations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Why do you want to volunteer?</FormLabel>
                        <FormDescription>Share your story and motivations</FormDescription>
                        <FormControl>
                          <Textarea
                            data-testid="textarea-motivations"
                            placeholder="I want to volunteer because..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
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
                    SDG Goals
                  </CardTitle>
                  <CardDescription>Which UN Sustainable Development Goals do you care about?</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="preferredSdgs"
                    render={() => (
                      <FormItem>
                        <FormLabel>Select Your Preferred SDGs</FormLabel>
                        <FormDescription>Choose the goals you want to contribute to</FormDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                          {Object.values(sdgGoals).map((sdg) => (
                            <div
                              key={sdg.id}
                              data-testid={`card-sdg-${sdg.id}`}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                form.watch("preferredSdgs")?.includes(sdg.id)
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                              }`}
                              onClick={() => toggleSDG(sdg.id)}
                            >
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  checked={form.watch("preferredSdgs")?.includes(sdg.id)}
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
                    <Clock className="w-6 h-6" />
                    Availability
                  </CardTitle>
                  <CardDescription>When and how would you like to volunteer?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="weeklyAvailability"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weekly Availability (hours)</FormLabel>
                        <FormDescription>How many hours per week can you volunteer?</FormDescription>
                        <FormControl>
                          <Input data-testid="input-weekly-hours" type="number" min="1" max="168" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferredWorkStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Work Style</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-work-style">
                              <SelectValue placeholder="Select your preference" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="remote">Remote / Virtual</SelectItem>
                            <SelectItem value="in-person">In-Person</SelectItem>
                            <SelectItem value="hybrid">Hybrid (Both)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {step === 5 && (
              <Card data-testid="card-step-5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-6 h-6" />
                    Emergency Contact (Optional)
                  </CardTitle>
                  <CardDescription>For in-person volunteering activities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="emergencyContact.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input data-testid="input-emergency-name" placeholder="Emergency contact name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContact.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input data-testid="input-emergency-phone" placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContact.relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <FormControl>
                          <Input data-testid="input-emergency-relationship" placeholder="e.g., Spouse, Parent, Friend" {...field} />
                        </FormControl>
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
