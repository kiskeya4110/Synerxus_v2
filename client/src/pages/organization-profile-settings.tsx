import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef, Component } from "react";
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
import OrganizationHeader from "@/components/layout/organization-header";

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

// Error boundary to catch and prevent cascade failures
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class OrganizationProfileErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Organization profile error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <OrganizationHeader activeTab="settings" />
          <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <Building2 className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">Something Went Wrong</h2>
            <p className="text-muted-foreground">We encountered an error loading your profile.</p>
            <Button onClick={() => this.setState({ hasError: false })}>Try Again</Button>
          </div>
        </>
      );
    }
    return this.props.children;
  }
}

export default function OrganizationProfileSettings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [needInput, setNeedInput] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  
  // Guard against repeated operations
  const redirectAttemptedRef = useRef(false);
  const formResetAttemptedRef = useRef(false);

  // Get userId from localStorage for proper data scoping
  const userId = localStorage.getItem("currentUserId");

  // Fetch current user to get organization info
  const { data: currentUser, isLoading: userLoading, error: userError } = useQuery<any>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!userId,
    staleTime: 0,
  });

  // Fetch existing organization profile by filtering all organizations
  const { data: organizations, isLoading: loadingProfile, error: profileError } = useQuery<MatchableOrganization[]>({
    queryKey: ["/api/matchable-organizations"],
    queryFn: async () => {
      const response = await fetch("/api/matchable-organizations");
      if (!response.ok) throw new Error("Failed to fetch organizations");
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Also fetch organization profile data directly for current user
  const { data: orgProfileData } = useQuery<any>({
    queryKey: ["/api/profile/organization", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/profile/organization?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
    staleTime: 0,
  });

  // Find the organization profile for current user (match by email or userId)
  const existingProfile = organizations?.find(o =>
    o.email === currentUser?.email ||
    (orgProfileData?.organizationName && o.name === orgProfileData.organizationName)
  );

  // Redirect non-organization users (with guard to prevent infinite loops)
  useEffect(() => {
    if (redirectAttemptedRef.current) return; // Already attempted, don't repeat
    
    if (currentUser?.userType === "volunteer") {
      redirectAttemptedRef.current = true;
      setLocation("/volunteer-profile-settings");
    } else if (currentUser?.userType === "corporate-partner") {
      redirectAttemptedRef.current = true;
      setLocation("/corporate-partner-profile-settings");
    }
  }, [currentUser?.userType, setLocation]);

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
  // Guard against repeated resets to prevent infinite loops
  useEffect(() => {
    if (userLoading || loadingProfile) return;
    if (formResetAttemptedRef.current) return; // Prevent repeated form resets

    try {
      const hasMatchableProfile = existingProfile && Object.keys(existingProfile).length > 0;
      // Extract nested data from the profile response: { user, organization, organizationProfile, matchableOrganization }
      const intakeProfile = orgProfileData?.organizationProfile;
      const orgData = orgProfileData?.organization;
      const matchableOrg = orgProfileData?.matchableOrganization;
      const hasOrgProfile = intakeProfile || orgData || matchableOrg;

      if (hasMatchableProfile) {
        // Existing matchable organization profile - populate form with all data
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
      } else if (hasOrgProfile) {
        // Fallback to organization profile data if no matchable org found
        // Map field names from intake form (organizationName, missionStatement, organizationLocation, volunteerNeeds, primarySdgs)
        // to profile settings form (name, mission, location, needs, sdgFocus)
        // Priority: matchableOrg > intakeProfile > orgData
        form.reset({
          email: currentUser?.email || "",
          name: matchableOrg?.name || intakeProfile?.organizationName || orgData?.name || currentUser?.displayName || "",
          mission: matchableOrg?.mission || intakeProfile?.missionStatement || orgData?.goals || "",
          location: matchableOrg?.location || intakeProfile?.organizationLocation || orgData?.address || "",
          needs: matchableOrg?.needs || intakeProfile?.volunteerNeeds || orgData?.needs || [],
          sdgFocus: matchableOrg?.sdgFocus || intakeProfile?.primarySdgs || orgData?.primarySdgs || [],
        });
        const logoToUse = matchableOrg?.logo || intakeProfile?.logo || orgData?.logo;
        if (logoToUse) {
          setLogoUrl(logoToUse);
        }
      } else if (currentUser?.email) {
        // New profile - initialize with user data only
        form.reset({
          email: currentUser.email,
          name: currentUser.displayName || "",
          mission: "",
          location: "",
          needs: [],
          sdgFocus: [],
        });
      }
      
      formResetAttemptedRef.current = true;
    } catch (error) {
      console.error("Form reset error:", error);
      // Continue gracefully if form reset fails
    }
  }, [existingProfile, orgProfileData, loadingProfile, currentUser, userLoading, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Add timeout protection - 15 seconds max
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile creation timeout. Please try again.")), 15000)
      );

      try {
        // First create the matchable organization
        const result = await Promise.race([
          apiRequest("POST", "/api/matchable-organizations", {
            ...data,
            logo: logoUrl,
          }),
          timeoutPromise
        ]) as any;

        // Also update the user profile tables (users, organizations) to save logo
        if (currentUser?.id) {
          await apiRequest("PATCH", `/api/profile/organization?userId=${currentUser.id}`, {
            profilePhotoUrl: logoUrl,
            name: data.name,
            mission: data.mission,
            needs: data.needs,
            sdgFocus: data.sdgFocus,
            location: data.location,
          });
        }

        return result;
      } catch (error) {
        console.error("Create mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matchable-organizations"] }).catch((err) => {
        // Log cache invalidation errors for monitoring but don't block user flow
        if (process.env.NODE_ENV === 'development') console.warn('Cache invalidation failed:', err);
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] }).catch(() => {});
      toast({
        title: "Profile created!",
        description: "Your organization profile has been created successfully.",
      });
    },
    onError: (error: Error) => {
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
        // Update matchable organization
        const result = await Promise.race([
          apiRequest("PATCH", `/api/matchable-organizations/${existingProfile.id}`, {
            ...data,
            logo: logoUrl,
          }),
          timeoutPromise
        ]) as any;

        // Also update the user profile tables (users, organizations) to save logo
        if (currentUser?.id) {
          await apiRequest("PATCH", `/api/profile/organization?userId=${currentUser.id}`, {
            profilePhotoUrl: logoUrl,
            name: data.name,
            mission: data.mission,
            needs: data.needs,
            sdgFocus: data.sdgFocus,
            location: data.location,
          });
        }

        return result;
      } catch (error) {
        console.error("Update mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matchable-organizations"] }).catch((err) => {
        if (process.env.NODE_ENV === 'development') console.warn('Cache invalidation failed:', err);
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] }).catch(() => {});
      toast({
        title: "Profile updated!",
        description: "Your organization profile has been updated successfully.",
      });

      // Redirect to organization dashboard after successful save
      setTimeout(() => setLocation("/organization-dashboard"), 500);
    },
    onError: (error: Error) => {
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
      <>
        <OrganizationHeader activeTab="settings" />
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading organization profile...</p>
        </div>
      </>
    );
  }

  // Handle case when no userId is found
  if (!userId) {
    return (
      <>
        <OrganizationHeader activeTab="settings" />
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Session Expired</h2>
          <p className="text-muted-foreground">Please log in to access your organization profile.</p>
          <Button onClick={() => setLocation("/login")}>Go to Login</Button>
        </div>
      </>
    );
  }

  // Handle errors
  if (userError || profileError) {
    return (
      <>
        <OrganizationHeader activeTab="settings" />
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <Building2 className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Unable to Load Profile</h2>
          <p className="text-muted-foreground">There was an error loading your profile data.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </>
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
    <OrganizationProfileErrorBoundary>
      <>
        <OrganizationHeader activeTab="settings" />
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
      </>
    </OrganizationProfileErrorBoundary>
  );
}
