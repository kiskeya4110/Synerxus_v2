import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertMatchableOrganizationSchema, type MatchableOrganization } from "@shared/schema";
import { Loader2, Plus, X, Building2, MapPin, Target, Heart } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ProfilePictureUpload } from "@/components/profile-picture-upload";
import OnboardingTrigger from "@/components/onboarding/onboarding-trigger";

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
const formSchema = insertMatchableOrganizationSchema.extend({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Organization name is required"),
  mission: z.string().min(10, "Mission statement must be at least 10 characters"),
  location: z.string().min(1, "Location is required"),
  needs: z.array(z.string()).min(1, "At least one volunteer need is required"),
  sdgFocus: z.array(z.number()).min(1, "At least one SDG focus area is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function OrganizationProfileSettings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [needInput, setNeedInput] = useState("");
  
  // Fetch current user to get organization info
  const { data: currentUser, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/users/me"],
  });

  // Redirect non-organization users
  useEffect(() => {
    if (currentUser?.userType === "volunteer") {
      setLocation("/volunteer-profile-settings");
    } else if (currentUser?.userType === "corporate-partner") {
      setLocation("/corporate-partner-profile-settings");
    }
  }, [currentUser?.userType, setLocation]);

  // Fetch existing organization profile by filtering all organizations
  const { data: organizations, isLoading: loadingProfile } = useQuery<MatchableOrganization[]>({
    queryKey: ["/api/matchable-organizations"],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the data
  });

  const [logoUrl, setLogoUrl] = useState("");

  // Find the organization profile for current user (match by email)
  const existingProfile = organizations?.find(o => o.email === currentUser?.email);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      mission: "",
      location: "",
      needs: [],
      sdgFocus: [],
    },
  });

  // Reset form when profile data loads (critical: useForm needs form.reset() for async data)
  useEffect(() => {
    if (existingProfile) {
      console.log("[Organization Settings] Resetting form with profile data");
      form.reset({
        email: existingProfile.email || currentUser?.email || "",
        name: existingProfile.name || "",
        mission: existingProfile.mission || "",
        location: existingProfile.location || "",
        needs: existingProfile.needs || [],
        sdgFocus: existingProfile.sdgFocus || [],
      });
      if (existingProfile.logo) {
        setLogoUrl(existingProfile.logo);
      }
    } else if (!loadingProfile && currentUser?.email) {
      // New profile - initialize with user data
      form.reset({
        email: currentUser.email,
        name: currentUser.displayName || "",
        mission: "",
        location: "",
        needs: [],
        sdgFocus: [],
      });
    }
  }, [existingProfile, loadingProfile, currentUser, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Add timeout protection - 15 seconds max
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile creation timeout. Please try again.")), 15000)
      );
      
      try {
        const result = await Promise.race([
          apiRequest("POST", "/api/matchable-organizations", {
            ...data,
            logo: logoUrl,
          }),
          timeoutPromise
        ]) as any;
        return result;
      } catch (error) {
        console.error("Create mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matchable-organizations"] }).catch(() => {});
      toast({
        title: "Profile created!",
        description: "Your organization profile has been created successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Profile create error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!existingProfile?.id) throw new Error("No profile found to update");
      
      // Add timeout protection - 15 seconds max
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile update timeout. Please try again.")), 15000)
      );
      
      try {
        const result = await Promise.race([
          apiRequest("PATCH", `/api/matchable-organizations/${existingProfile.id}`, {
            ...data,
            logo: logoUrl,
          }),
          timeoutPromise
        ]) as any;
        return result;
      } catch (error) {
        console.error("Update mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matchable-organizations"] }).catch(() => {});
      toast({
        title: "Profile updated!",
        description: "Your organization profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Profile update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Show loading while user data is loading
  if (userLoading || loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const onSubmit = (data: FormData) => {
    if (!currentUser?.id) {
      toast({
        title: "Error",
        description: "User information not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }
    if (existingProfile) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addNeed = () => {
    if (needInput.trim()) {
      const currentNeeds = form.getValues("needs");
      if (!currentNeeds.includes(needInput.trim())) {
        form.setValue("needs", [...currentNeeds, needInput.trim()]);
        setNeedInput("");
      }
    }
  };

  const removeNeed = (need: string) => {
    const currentNeeds = form.getValues("needs");
    form.setValue("needs", currentNeeds.filter(n => n !== need));
  };

  const toggleSDG = (sdgValue: number) => {
    const currentSDGs = form.getValues("sdgFocus");
    if (currentSDGs.includes(sdgValue)) {
      form.setValue("sdgFocus", currentSDGs.filter(s => s !== sdgValue));
    } else {
      form.setValue("sdgFocus", [...currentSDGs, sdgValue]);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Organization Profile Settings</h1>
        <p className="text-muted-foreground">
          Create or update your organization profile to get matched with volunteers who have the skills and passion to help your mission.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {existingProfile ? "Update Your Profile" : "Create Your Profile"}
          </CardTitle>
          <CardDescription>
            This information will be used to match your organization with qualified volunteers
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
                        data-testid="input-org-email"
                      />
                    </FormControl>
                    <FormDescription>
                      This email is linked to your account
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Organization Logo */}
              {currentUser?.id && (
                <div className="mb-6">
                  <Label className="mb-3 block">Organization Logo</Label>
                  <ProfilePictureUpload
                    currentPhotoUrl={logoUrl}
                    onPhotoChange={setLogoUrl}
                    userId={currentUser.id.toString()}
                    userType="organization"
                    type="logo"
                    label="Organization Logo"
                  />
                </div>
              )}

              {/* Organization Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter organization name"
                        {...field}
                        data-testid="input-org-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mission Statement */}
              <FormField
                control={form.control}
                name="mission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Mission Statement
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your organization's mission and impact goals..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="input-org-mission"
                      />
                    </FormControl>
                    <FormDescription>
                      Share your organization's purpose and the impact you aim to create
                    </FormDescription>
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
                        placeholder="e.g., San Francisco, USA"
                        {...field}
                        data-testid="input-org-location"
                      />
                    </FormControl>
                    <FormDescription>
                      Your primary location helps match you with local volunteers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Volunteer Needs */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Volunteer Needs & Skills
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill or role you need (e.g., Graphic Design, Event Planning, Web Development)"
                    value={needInput}
                    onChange={(e) => setNeedInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addNeed();
                      }
                    }}
                    data-testid="input-add-need"
                  />
                  <Button
                    type="button"
                    onClick={addNeed}
                    variant="secondary"
                    data-testid="button-add-need"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  List the skills, roles, or expertise you're looking for in volunteers
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.watch("needs").map((need) => (
                    <Badge key={need} variant="secondary" className="gap-1" data-testid={`badge-need-${need}`}>
                      {need}
                      <button
                        type="button"
                        onClick={() => removeNeed(need)}
                        className="ml-1 hover:bg-secondary-foreground/10 rounded-full"
                        data-testid={`button-remove-need-${need}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {form.formState.errors.needs && (
                  <p className="text-sm text-destructive">{form.formState.errors.needs.message}</p>
                )}
              </div>

              {/* SDG Focus */}
              <div className="space-y-2">
                <Label>Sustainable Development Goals (SDGs) Focus</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Select the UN SDGs your organization focuses on
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {SDG_OPTIONS.map((sdg) => (
                    <Button
                      key={sdg.value}
                      type="button"
                      variant={form.watch("sdgFocus").includes(sdg.value) ? "default" : "outline"}
                      className="justify-start text-left h-auto py-2"
                      onClick={() => toggleSDG(sdg.value)}
                      data-testid={`button-sdg-${sdg.value}`}
                    >
                      {sdg.label}
                    </Button>
                  ))}
                </div>
                {form.formState.errors.sdgFocus && (
                  <p className="text-sm text-destructive">{form.formState.errors.sdgFocus.message}</p>
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
                <OnboardingTrigger variant="outline" showText={true} />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
