import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertVolunteerSchema, type Volunteer } from "@shared/schema";
import { Loader2, Plus, X, User, MapPin, Target, Heart } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// SDG options (1-17)
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

// Form schema
const formSchema = insertVolunteerSchema.extend({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required"),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  interests: z.array(z.string()).min(1, "At least one interest is required"),
  location: z.string().min(1, "Location is required"),
  sdgGoals: z.array(z.number()).min(1, "At least one SDG goal is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function VolunteerProfileSettings() {
  const { toast } = useToast();
  const [skillInput, setSkillInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  
  // Fetch current user to get email
  const userId = localStorage.getItem('currentUserId');
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me"],
  });

  // Fetch existing volunteer profile by filtering all volunteers
  const { data: volunteers, isLoading: loadingProfile } = useQuery<Volunteer[]>({
    queryKey: ["/api/volunteers"],
  });

  // Find the volunteer profile for current user (match by email)
  const existingProfile = volunteers?.find(v => v.email === currentUser?.email);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      skills: [],
      interests: [],
      location: "",
      sdgGoals: [],
    },
    values: existingProfile ? {
      email: existingProfile.email,
      name: existingProfile.name,
      skills: existingProfile.skills,
      interests: existingProfile.interests,
      location: existingProfile.location,
      sdgGoals: existingProfile.sdgGoals,
    } : undefined,
  });

  // Update form when currentUser loads (for new profile creation)
  useEffect(() => {
    if (currentUser?.email && !existingProfile) {
      form.setValue("email", currentUser.email);
      if (currentUser.displayName) {
        form.setValue("name", currentUser.displayName);
      }
    }
  }, [currentUser, existingProfile, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/volunteers", data);
    },
    onSuccess: () => {
      // Invalidate all relevant queries to sync data across Settings and Profile
      const id = localStorage.getItem('currentUserId');
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/volunteer", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/volunteer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Profile created!",
        description: "Your volunteer profile has been created successfully. This data helps with AI matching and feeds into SDG analytics.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!existingProfile?.id) throw new Error("No profile found to update");
      return apiRequest("PATCH", `/api/volunteers/${existingProfile.id}`, data);
    },
    onSuccess: () => {
      // Invalidate all relevant queries to sync data across Settings and Profile
      const id = localStorage.getItem('currentUserId');
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/volunteer", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/volunteer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Profile updated!",
        description: "Your volunteer profile has been updated successfully. This data helps with AI matching and feeds into SDG analytics.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (existingProfile) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addSkill = () => {
    if (skillInput.trim()) {
      const currentSkills = form.getValues("skills");
      if (!currentSkills.includes(skillInput.trim())) {
        form.setValue("skills", [...currentSkills, skillInput.trim()]);
        setSkillInput("");
      }
    }
  };

  const removeSkill = (skill: string) => {
    const currentSkills = form.getValues("skills");
    form.setValue("skills", currentSkills.filter(s => s !== skill));
  };

  const addInterest = () => {
    if (interestInput.trim()) {
      const currentInterests = form.getValues("interests");
      if (!currentInterests.includes(interestInput.trim())) {
        form.setValue("interests", [...currentInterests, interestInput.trim()]);
        setInterestInput("");
      }
    }
  };

  const removeInterest = (interest: string) => {
    const currentInterests = form.getValues("interests");
    form.setValue("interests", currentInterests.filter(i => i !== interest));
  };

  const toggleSDG = (sdgValue: number) => {
    const currentSDGs = form.getValues("sdgGoals");
    if (currentSDGs.includes(sdgValue)) {
      form.setValue("sdgGoals", currentSDGs.filter(s => s !== sdgValue));
    } else {
      form.setValue("sdgGoals", [...currentSDGs, sdgValue]);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Volunteer Profile Settings</h1>
        <p className="text-muted-foreground">
          Create or update your volunteer profile to get matched with organizations that align with your skills, interests, and goals.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {existingProfile ? "Update Your Profile" : "Create Your Profile"}
          </CardTitle>
          <CardDescription>
            This information will be used to match you with organizations and opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email - Read-only, linked to user account */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        readOnly
                        disabled
                        className="bg-muted"
                        data-testid="input-volunteer-email"
                      />
                    </FormControl>
                    <FormDescription>
                      This email is linked to your account
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
                        {...field}
                        data-testid="input-volunteer-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., New York, USA"
                        {...field}
                        data-testid="input-volunteer-location"
                      />
                    </FormControl>
                    <FormDescription>
                      Your location helps match you with local or remote opportunities
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Skills */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Skills
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill (e.g., Python, Teaching, Marketing)"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    data-testid="input-add-skill"
                  />
                  <Button
                    type="button"
                    onClick={addSkill}
                    variant="secondary"
                    data-testid="button-add-skill"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.watch("skills").map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1" data-testid={`badge-skill-${skill}`}>
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 hover:bg-secondary-foreground/10 rounded-full"
                        data-testid={`button-remove-skill-${skill}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {form.formState.errors.skills && (
                  <p className="text-sm text-destructive">{form.formState.errors.skills.message}</p>
                )}
              </div>

              {/* Interests */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Interests & Causes
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an interest (e.g., Education, Healthcare, Environment)"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addInterest();
                      }
                    }}
                    data-testid="input-add-interest"
                  />
                  <Button
                    type="button"
                    onClick={addInterest}
                    variant="secondary"
                    data-testid="button-add-interest"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.watch("interests").map((interest) => (
                    <Badge key={interest} variant="secondary" className="gap-1" data-testid={`badge-interest-${interest}`}>
                      {interest}
                      <button
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="ml-1 hover:bg-secondary-foreground/10 rounded-full"
                        data-testid={`button-remove-interest-${interest}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {form.formState.errors.interests && (
                  <p className="text-sm text-destructive">{form.formState.errors.interests.message}</p>
                )}
              </div>

              {/* SDG Goals */}
              <div className="space-y-2">
                <Label>Sustainable Development Goals (SDGs)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Select the UN SDGs you're passionate about
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {SDG_OPTIONS.map((sdg) => (
                    <Button
                      key={sdg.value}
                      type="button"
                      variant={form.watch("sdgGoals").includes(sdg.value) ? "default" : "outline"}
                      className="justify-start text-left h-auto py-2"
                      onClick={() => toggleSDG(sdg.value)}
                      data-testid={`button-sdg-${sdg.value}`}
                    >
                      {sdg.label}
                    </Button>
                  ))}
                </div>
                {form.formState.errors.sdgGoals && (
                  <p className="text-sm text-destructive">{form.formState.errors.sdgGoals.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {existingProfile ? "Update Profile" : "Create Profile"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
