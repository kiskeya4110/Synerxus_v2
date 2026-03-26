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
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import {
  PROFILE_QUERY_CONFIG,
  cacheOrganizationProfile,
  getCachedOrganizationProfile,
  cacheUserProfile,
  getCachedUserProfile
} from "@/lib/profile-cache";
import { insertMatchableOrganizationSchema, type MatchableOrganization } from "@shared/schema";
import { Loader2, Plus, X, Building2, MapPin, Target, Heart, User, Briefcase, Sliders, LogOut, Key, Copy, Trash2, Check, Mail } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ProfilePictureUpload } from "@/components/profile-picture-upload";
import OnboardingTrigger from "@/components/onboarding/onboarding-trigger";
import OrganizationPWAHeader from "@/components/layout/organization-pwa-header";
import OrganizationPWANav from "@/components/layout/organization-pwa-nav";
import { useIsMobile } from "@/hooks/use-mobile";
import { PrivacyConsentDialog } from "@/components/privacy-consent-dialog";

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
  location: z.string().optional(),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
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
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <Building2 className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold text-slate-900">Something Went Wrong</h2>
            <p className="text-slate-600">We encountered an error loading your profile.</p>
            <Button onClick={() => this.setState({ hasError: false })}>Try Again</Button>
          </div>
      );
    }
    return this.props.children;
  }
}

// Invitation code type
interface InvitationCode {
  id: number;
  code: string;
  email: string | null;
  userType: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

export default function OrganizationProfileSettings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [needInput, setNeedInput] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const isMobile = useIsMobile();

  // Invitation code states
  const [newCodeEmail, setNewCodeEmail] = useState("");
  const [newCodeNotes, setNewCodeNotes] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Guard against repeated operations
  const redirectAttemptedRef = useRef(false);
  const formResetAttemptedRef = useRef(false);

  // Get userId from localStorage for proper data scoping
  const userId = localStorage.getItem("currentUserId");
  const storedUserType = localStorage.getItem("userType");

  // Fetch current user to get organization info - use caching for instant loading
  const { data: currentUser, isLoading: userLoading, error: userError } = useQuery<any>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/users/me`, { headers, credentials: "include" });
      if (!response.ok) return null;
      const data = await response.json();
      // Cache user data for instant loading
      cacheUserProfile(userId, data);
      return data;
    },
    enabled: !!userId,
    initialData: () => getCachedUserProfile(userId),
    ...PROFILE_QUERY_CONFIG,
  });

  // Privacy consent state
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  // Check if consent is needed
  useEffect(() => {
    if (currentUser && !currentUser.dataConsent && !consentGiven) {
      setShowConsentDialog(true);
    }
  }, [currentUser, consentGiven]);

  const handleConsentGiven = () => {
    setConsentGiven(true);
    setShowConsentDialog(false);
  };

  const handleConsentDeclined = () => {
    // Redirect to homepage if consent is declined
    toast({
      title: "Consent Required",
      description: "You must agree to the data usage policy to continue.",
      variant: "destructive",
    });
    setLocation('/');
  };

  // Fetch existing organization profile by filtering all organizations - use caching
  const { data: organizations, isLoading: loadingProfile, error: profileError } = useQuery<MatchableOrganization[]>({
    queryKey: ["/api/matchable-organizations"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/matchable-organizations", { headers, credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch organizations");
      return response.json();
    },
    ...PROFILE_QUERY_CONFIG,
  });

  // Also fetch organization profile data directly for current user - use caching
  const { data: orgProfileData, isLoading: loadingOrgProfile } = useQuery<any>({
    queryKey: ["/api/profile/organization", userId],
    queryFn: async () => {
      if (!userId) return null;
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/profile/organization?userId=${userId}`, { headers, credentials: "include" });
      if (!response.ok) return null;
      const data = await response.json();
      // Cache organization profile for instant loading
      cacheOrganizationProfile(userId, data);
      return data;
    },
    enabled: !!userId,
    initialData: () => getCachedOrganizationProfile(userId),
    ...PROFILE_QUERY_CONFIG,
  });

  // Fetch invitation code settings
  const { data: inviteSettings } = useQuery<{ inviteOnlyMode: boolean } | null>({
    queryKey: ["/api/invitation-codes/settings"],
    queryFn: async () => {
      const response = await fetch("/api/invitation-codes/settings");
      if (!response.ok) return null;
      return response.json();
    },
    enabled: currentUser?.userType === 'organization',
  });

  // Fetch invitation codes
  const { data: invitationCodes, refetch: refetchCodes } = useQuery<InvitationCode[]>({
    queryKey: ["/api/invitation-codes", userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/invitation-codes?userId=${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId && currentUser?.userType === 'organization',
  });

  // Toggle invite-only mode mutation
  const toggleInviteModeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest("PUT", "/api/invitation-codes/settings", {
        userId: parseInt(userId || '0'),
        inviteOnlyMode: enabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitation-codes/settings"] });
      toast({
        title: "Settings Updated",
        description: `Invite-only mode ${inviteSettings?.inviteOnlyMode ? 'disabled' : 'enabled'}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Create invitation code mutation
  const createCodeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/invitation-codes", {
        userId: parseInt(userId || '0'),
        email: newCodeEmail || undefined,
        notes: newCodeNotes || undefined,
        maxUses: 1,
      });
    },
    onSuccess: () => {
      refetchCodes();
      setNewCodeEmail("");
      setNewCodeNotes("");
      toast({
        title: "Invitation Code Created",
        description: "New invitation code has been generated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invitation code",
        variant: "destructive",
      });
    },
  });

  // Delete invitation code mutation
  const deleteCodeMutation = useMutation({
    mutationFn: async (codeId: number) => {
      return await apiRequest("DELETE", `/api/invitation-codes/${codeId}?userId=${userId}`);
    },
    onSuccess: () => {
      refetchCodes();
      toast({
        title: "Code Deactivated",
        description: "Invitation code has been deactivated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate code",
        variant: "destructive",
      });
    },
  });

  // Copy code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

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
      city: "",
      country: "",
      needs: [],
      sdgFocus: [],
    },
  });

  // Reset form when profile data loads (critical: useForm needs form.reset() for async data)
  // Guard against repeated resets to prevent infinite loops
  useEffect(() => {
    if (userLoading || loadingProfile || loadingOrgProfile) return;
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
        // Note: city/country come from organizations table (orgData), not matchable_organizations
        form.reset({
          email: existingProfile.email || currentUser?.email || "",
          name: existingProfile.name || "",
          mission: existingProfile.mission || "",
          location: existingProfile.location || "",
          city: existingProfile.city || existingProfile.city || orgData?.city || "",
          country: existingProfile.country || existingProfile.country || orgData?.country || "",
          needs: existingProfile.needs || [],
          sdgFocus: existingProfile.sdgFocus || [],
        });
        // Look for logo in multiple sources (matchable profile may have empty logo)
        const logoToUse = existingProfile.logo ||
          matchableOrg?.logo ||
          intakeProfile?.logoUrl ||
          intakeProfile?.logo ||
          orgData?.logo ||
          "";
        if (logoToUse) {
          console.log("[OrgSettings] Setting logo from sources:", logoToUse);
          setLogoUrl(logoToUse);
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
          city: matchableOrg?.city || intakeProfile?.city || orgData?.city || "",
          country: matchableOrg?.country || intakeProfile?.country || orgData?.country || "",
          needs: matchableOrg?.needs || intakeProfile?.volunteerNeeds || orgData?.needs || [],
          sdgFocus: matchableOrg?.sdgFocus || intakeProfile?.primarySdgs || orgData?.primarySdgs || [],
        });
        // Look for logo in multiple sources with comprehensive fallback
        const logoToUse = matchableOrg?.logo ||
          intakeProfile?.logoUrl ||
          intakeProfile?.logo ||
          orgData?.logo ||
          "";
        if (logoToUse) {
          console.log("[OrgSettings] Setting logo from org profile:", logoToUse);
          setLogoUrl(logoToUse);
        }
      } else if (currentUser?.email) {
        // New profile - initialize with user data only
        form.reset({
          email: currentUser.email,
          name: currentUser.displayName || "",
          mission: "",
          location: "",
          city: "",
          country: "",
          needs: [],
          sdgFocus: [],
        });
      }
      
      formResetAttemptedRef.current = true;
    } catch (error) {
      console.error("Form reset error:", error);
      // Continue gracefully if form reset fails
    }
  }, [existingProfile, orgProfileData, loadingProfile, loadingOrgProfile, currentUser, userLoading, form]);

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

        // Also update the user profile tables (users, organizations) to save logo and location
        if (currentUser?.id) {
          await apiRequest("PATCH", `/api/profile/organization?userId=${currentUser.id}`, {
            profilePhotoUrl: logoUrl,
            name: data.name,
            mission: data.mission,
            needs: data.needs,
            sdgFocus: data.sdgFocus,
            location: data.location,
            city: data.city,
            country: data.country,
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

      // Mark profile as complete - prevents redirect back to settings on future logins
      localStorage.setItem('profileComplete', 'true');
      localStorage.removeItem('isNewSignup');

      // New profiles go to intake form to complete setup
      setTimeout(() => setLocation("/organization-intake"), 500);
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

        // Also update the user profile tables (users, organizations) to save logo and location
        if (currentUser?.id) {
          await apiRequest("PATCH", `/api/profile/organization?userId=${currentUser.id}`, {
            profilePhotoUrl: logoUrl,
            name: data.name,
            mission: data.mission,
            needs: data.needs,
            sdgFocus: data.sdgFocus,
            location: data.location,
            city: data.city,
            country: data.country,
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

      // Mark profile as complete - prevents redirect back to settings on future logins
      localStorage.setItem('profileComplete', 'true');
      localStorage.removeItem('isNewSignup');

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

  // Mutation to update user type
  const userTypeMutation = useMutation({
    mutationFn: async (newUserType: string) => {
      if (!currentUser?.id) throw new Error("User not authenticated");

      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType: newUserType }),
      });

      if (!response.ok) throw new Error("Failed to update user type");
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('userType', data.userType);
      // Clear profileComplete flag - user needs to complete new profile type
      localStorage.removeItem('profileComplete');
      localStorage.setItem('isNewSignup', 'true');
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });

      toast({
        title: "Account Type Updated",
        description: `Your account type has been changed to ${data.userType}. Redirecting...`,
      });

      setTimeout(() => {
        if (data.userType === 'volunteer') {
          setLocation('/volunteer-profile-settings');
        } else if (data.userType === 'corporate-partner') {
          setLocation('/corporate-partner-profile-settings');
        } else {
          window.location.reload();
        }
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account type",
        variant: "destructive",
      });
    },
  });

  // Show loading while user data is loading
  if (userLoading || loadingProfile) {
    if (isMobile) {
      return (
        <div className="min-h-screen bg-[#faf9f7] pb-20">
          <OrganizationPWAHeader />
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-stone-500">Loading organization profile...</p>
          </div>
          <OrganizationPWANav activeTab="settings" />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-stone-500">Loading organization profile...</p>
      </div>
    );
  }

  // Handle case when no userId is found
  if (!userId) {
    if (isMobile) {
      return (
        <div className="min-h-screen bg-[#faf9f7] pb-20">
          <OrganizationPWAHeader />
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Building2 className="h-12 w-12 text-stone-400" />
            <h2 className="text-xl font-semibold text-stone-900">Session Expired</h2>
            <p className="text-stone-600">Please log in to access your organization profile.</p>
            <Button onClick={() => setLocation("/login")}>Go to Login</Button>
          </div>
          <OrganizationPWANav activeTab="settings" />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Building2 className="h-12 w-12 text-stone-400" />
        <h2 className="text-xl font-semibold text-stone-900">Session Expired</h2>
        <p className="text-stone-600">Please log in to access your organization profile.</p>
        <Button onClick={() => setLocation("/login")}>Go to Login</Button>
      </div>
    );
  }

  // Handle errors
  if (userError || profileError) {
    if (isMobile) {
      return (
        <div className="min-h-screen bg-[#faf9f7] pb-20">
          <OrganizationPWAHeader />
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Building2 className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-stone-900">Unable to Load Profile</h2>
            <p className="text-stone-600">There was an error loading your profile data.</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
          <OrganizationPWANav activeTab="settings" />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Building2 className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-stone-900">Unable to Load Profile</h2>
        <p className="text-stone-600">There was an error loading your profile data.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
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
    <OrganizationProfileErrorBoundary>
      {/* Privacy Consent Dialog */}
      <PrivacyConsentDialog
        open={showConsentDialog}
        onConsentGiven={handleConsentGiven}
        onDeclined={handleConsentDeclined}
        userId={currentUser?.id}
      />

      <div className={`min-h-screen ${isMobile ? 'bg-[#faf9f7] pb-20' : 'bg-[#f9fafb]'}`}>
        {/* Header - Mobile PWA only; desktop uses organization-nav */}
        {isMobile && <OrganizationPWAHeader />}

        {/* Content container matching header width */}
        <div style={!isMobile ? { maxWidth: '1400px', margin: '0 auto', padding: '0 24px' } : undefined}>
          <div className={`${isMobile ? 'px-4 py-4 mx-auto' : 'py-8'} max-w-4xl ${!isMobile ? 'mx-auto' : ''}`}>
          <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-slate-900">Organization Profile Settings</h1>
          <p className="text-slate-600">
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

                  {/* Location - City and Country */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </Label>
                    <p className="text-sm text-muted-foreground -mt-2">
                      Your primary location helps match you with local volunteers
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., San Francisco"
                                {...field}
                                data-testid="input-org-city"
                              />
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
                              <Input
                                placeholder="e.g., United States"
                                {...field}
                                data-testid="input-org-country"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
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

          {/* Account Type Section */}
          <Card className="mt-6 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Sliders className="h-5 w-5" />
                Account Type
              </CardTitle>
              <CardDescription>
                Change your account type if you registered incorrectly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Current Type: <span className="text-blue-600 dark:text-blue-400 capitalize">{currentUser?.userType || 'organization'}</span>
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    Select a different account type if needed
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant={currentUser?.userType === 'volunteer' ? 'default' : 'outline'}
                    onClick={() => userTypeMutation.mutate('volunteer')}
                    disabled={currentUser?.userType === 'volunteer' || userTypeMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Volunteer
                  </Button>
                  <Button
                    variant={currentUser?.userType === 'organization' ? 'default' : 'outline'}
                    onClick={() => userTypeMutation.mutate('organization')}
                    disabled={currentUser?.userType === 'organization' || userTypeMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Building2 className="h-4 w-4" />
                    Organization
                  </Button>
                  <Button
                    variant={currentUser?.userType === 'corporate-partner' ? 'default' : 'outline'}
                    onClick={() => userTypeMutation.mutate('corporate-partner')}
                    disabled={currentUser?.userType === 'corporate-partner' || userTypeMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Briefcase className="h-4 w-4" />
                    Corporate Partner
                  </Button>
                </div>
                {userTypeMutation.isPending && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Updating account type...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invitation Codes Section */}
          <Card className="mt-6 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Key className="h-5 w-5" />
                Invitation Codes
              </CardTitle>
              <CardDescription>
                Control platform access with invitation codes. When enabled, new users must have a valid code to register.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Invite-only mode toggle */}
              <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Invite-Only Mode</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    When enabled, new users require an invitation code to register
                  </p>
                </div>
                <Switch
                  checked={inviteSettings?.inviteOnlyMode ?? false}
                  onCheckedChange={(checked) => toggleInviteModeMutation.mutate(checked)}
                  disabled={toggleInviteModeMutation.isPending}
                />
              </div>

              {/* Create new invitation code */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Create New Invitation Code</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="code-email" className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4" />
                      Email (Optional)
                    </Label>
                    <Input
                      id="code-email"
                      type="email"
                      placeholder="Restrict code to specific email"
                      value={newCodeEmail}
                      onChange={(e) => setNewCodeEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="code-notes" className="mb-2 block">Notes (Optional)</Label>
                    <Input
                      id="code-notes"
                      placeholder="e.g., For new team member"
                      value={newCodeNotes}
                      onChange={(e) => setNewCodeNotes(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => createCodeMutation.mutate()}
                  disabled={createCodeMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {createCodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Generate Invitation Code
                </Button>
              </div>

              {/* List of existing codes */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Active Invitation Codes</h4>
                {invitationCodes && invitationCodes.length > 0 ? (
                  <div className="space-y-3">
                    {invitationCodes.filter(c => c.isActive).map((code) => (
                      <div
                        key={code.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-lg font-mono font-bold text-amber-700 dark:text-amber-400">
                              {code.code}
                            </code>
                            <Badge variant={code.usedCount >= code.maxUses ? "secondary" : "outline"}>
                              {code.usedCount}/{code.maxUses} uses
                            </Badge>
                          </div>
                          {code.email && (
                            <p className="text-sm text-gray-500 mt-1">
                              Restricted to: {code.email}
                            </p>
                          )}
                          {code.notes && (
                            <p className="text-sm text-gray-400 mt-1">
                              {code.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(code.code)}
                            className="flex items-center gap-1"
                          >
                            {copiedCode === code.code ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCodeMutation.mutate(code.id)}
                            disabled={deleteCodeMutation.isPending}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No active invitation codes. Generate one above to share with new users.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Bottom Navigation for mobile */}
        {isMobile && <OrganizationPWANav activeTab="settings" />}
      </div>
    </OrganizationProfileErrorBoundary>
  );
}
