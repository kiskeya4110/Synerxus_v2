import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertVolunteerSchema, type Volunteer } from "@shared/schema";
import {
  Loader2,
  Plus,
  X,
  User,
  MapPin,
  Target,
  Heart,
  Clock,
  Calendar,
  Save,
  Check,
  Cloud,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfilePictureUpload } from "@/components/profile-picture-upload";
import { DataDiscrepancyAlert } from "@/components/ui/data-discrepancy-alert";

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

// Days of the week
const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

// Time slots
const TIME_SLOTS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

// Availability schema
const availabilitySlotSchema = z.object({
  day: z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});

// Skill proficiency schema (0-100 scale)
const skillProficiencySchema = z.object({
  name: z.string().min(1, "Skill name is required"),
  proficiency: z.number().min(0).max(100, "Proficiency must be 0-100"),
});

// Form schema
const formSchema = insertVolunteerSchema.extend({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required"),
  skills: z.array(skillProficiencySchema).min(1, "At least one skill is required"),
  interests: z.array(z.string()).min(1, "At least one interest is required"),
  location: z.string().min(1, "Location is required"),
  sdgGoals: z.array(z.number()).min(1, "At least one SDG goal is required"),
  weeklyHours: z.number().min(1, "At least 1 hour is required"),
  // Enhanced availability schema
  availability: z
    .array(availabilitySlotSchema)
    .min(1, "At least one availability slot is required"),
  timezone: z.string().min(1, "Timezone is required"),
  preferredCommitment: z.enum([
    "one-time",
    "short-term",
    "long-term",
    "flexible",
  ]),
});

type FormData = z.infer<typeof formSchema>;
type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;
type SkillProficiency = z.infer<typeof skillProficiencySchema>;

export default function VolunteerIntake() {
  const { toast } = useToast();
  const [skillInput, setSkillInput] = useState("");
  const [skillProficiency, setSkillProficiency] = useState(50); // Default 50%
  const [interestInput, setInterestInput] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>("");
  const isInitialLoadRef = useRef(true);

  // Fetch current user to get email
  const userId = localStorage.getItem("currentUserId");
  const { data: currentUser } = useQuery<{ id: number; email: string; displayName?: string }>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch existing volunteer profile using intake API which includes all availability fields
  const { data: profileResponse, isLoading: loadingProfile } = useQuery<{ user: any; volunteerProfile: any }>({
    queryKey: ["/api/intake/volunteer-profile", currentUser?.id],
    enabled: !!currentUser?.id,
  });
  
  // Extract the volunteer profile from the response (API returns { user, volunteerProfile })
  const existingProfile = profileResponse?.volunteerProfile;
  const profileUser = profileResponse?.user;

  // Parse skills from database format - handles both old and new formats
  // Old format: "Skill Name (75%)" embedded in skills array
  // New format: skills array of strings + skillRatings object {skillName: proficiency}
  const parseSkillsFromDb = (skills: any, skillRatings?: Record<string, number>): SkillProficiency[] => {
    if (!skills || !Array.isArray(skills)) return [];
    return skills.map((skill: string) => {
      // Handle old format like "Teaching (89%)"
      const match = skill.match(/^(.+?)\s*\((\d+)%\)$/);
      if (match) {
        return { name: match[1].trim(), proficiency: parseInt(match[2], 10) };
      }
      // Handle new format: look up proficiency from skillRatings object
      const proficiency = skillRatings?.[skill] ?? 50; // Default 50% if not found
      return { name: skill, proficiency };
    });
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: currentUser?.email || "",
      name: currentUser?.displayName || "",
      skills: [],
      interests: [],
      location: "",
      sdgGoals: [],
      weeklyHours: 1,
      availability: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferredCommitment: "flexible",
    },
  });

  // Reset form when profile data loads - keeps database data visible and prevents duplication on re-entry
  useEffect(() => {
    if (!loadingProfile && profileResponse) {
      const profile = profileResponse.volunteerProfile;
      const user = profileResponse.user;
      
      if (profile) {
        form.reset({
          email: user?.email || currentUser?.email || "",
          name: profile.volunteerName || user?.displayName || "",
          skills: parseSkillsFromDb(profile.skills, profile.skillRatings as Record<string, number>),
          interests: profile.interests || [],
          location: profile.location || "",
          sdgGoals: profile.preferredSdgs || [],
          weeklyHours: profile.weeklyAvailability || 1,
          availability: profile.availability || [],
          timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferredCommitment: profile.preferredCommitment || "flexible",
        });
        if (profile.profilePhotoUrl) {
          setProfilePhotoUrl(profile.profilePhotoUrl);
        }
      } else if (currentUser?.email) {
        // New profile - initialize with user data
        form.reset({
          email: currentUser.email,
          name: currentUser.displayName || "",
          skills: [],
          interests: [],
          location: "",
          sdgGoals: [],
          weeklyHours: 1,
          availability: [],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferredCommitment: "flexible",
        });
      }
    }
  }, [loadingProfile, profileResponse, currentUser]);

  // Profile mutation (create or update)
  const profileMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!currentUser?.id) throw new Error("User not authenticated");
      
      // Transform form data to match volunteer profile API
      // Convert skills array of {name, proficiency} objects to:
      // - skills: array of strings (skill names only) for database storage
      // - skillRatings: object {skillName: proficiency} for matching algorithm
      const skillsArray = data.skills.map((s: { name: string; proficiency: number }) => s.name);
      const skillRatingsObj: Record<string, number> = {};
      data.skills.forEach((s: { name: string; proficiency: number }) => {
        skillRatingsObj[s.name] = s.proficiency;
      });

      const profileData = {
        volunteerName: data.name,
        skills: skillsArray, // Array of skill names (strings)
        skillRatings: skillRatingsObj, // Object {skillName: proficiency} for matching
        interests: data.interests,
        location: data.location,
        preferredSdgs: data.sdgGoals, // Map sdgGoals to preferredSdgs for backend
        weeklyAvailability: data.weeklyHours, // Map weeklyHours to weeklyAvailability
        availability: data.availability,
        timezone: data.timezone,
        preferredCommitment: data.preferredCommitment,
        preferredWorkStyle: "remote", // Default to remote
        profilePhotoUrl, // Include profile photo URL
        onboardingCompleted: true, // Always mark as completed when form is submitted
      };
      
      return apiRequest("POST", `/api/intake/volunteer-profile?userId=${currentUser.id}`, profileData);
    },
    onSuccess: () => {
      const id = currentUser?.id;
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/intake/volunteer-profile", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/volunteer", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/volunteer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities/matches"] });
      toast({
        title: `Profile ${existingProfile ? "updated" : "created"}!`,
        description: `Your volunteer profile has been ${existingProfile ? "updated" : "created"} successfully.`,
      });
      // Always redirect to dashboard after form submission
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-save mutation (silent, no redirect)
  const autoSaveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!currentUser?.id) throw new Error("User not authenticated");

      const skillsArray = data.skills.map((s: { name: string; proficiency: number }) => s.name);
      const skillRatingsObj: Record<string, number> = {};
      data.skills.forEach((s: { name: string; proficiency: number }) => {
        skillRatingsObj[s.name] = s.proficiency;
      });

      const profileData = {
        volunteerName: data.name,
        skills: skillsArray,
        skillRatings: skillRatingsObj,
        interests: data.interests,
        location: data.location,
        preferredSdgs: data.sdgGoals,
        weeklyAvailability: data.weeklyHours,
        availability: data.availability,
        timezone: data.timezone,
        preferredCommitment: data.preferredCommitment,
        preferredWorkStyle: "remote",
        profilePhotoUrl,
        onboardingCompleted: false, // Don't mark as completed for auto-save
      };

      return apiRequest("POST", `/api/intake/volunteer-profile?userId=${currentUser.id}`, profileData);
    },
    onSuccess: () => {
      setAutoSaveStatus('saved');
      // Reset to idle after 3 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
      // Silently invalidate queries without showing toast
      const id = currentUser?.id;
      queryClient.invalidateQueries({ queryKey: ["/api/intake/volunteer-profile", id] });
    },
    onError: () => {
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    },
  });

  // Auto-save function with debounce
  const performAutoSave = useCallback((data: FormData) => {
    // Don't auto-save if no user or during initial load
    if (!currentUser?.id || isInitialLoadRef.current) return;

    // Check if data actually changed
    const dataString = JSON.stringify(data);
    if (dataString === lastSavedDataRef.current) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set saving status immediately for feedback
    setAutoSaveStatus('saving');

    // Debounce the actual save by 2 seconds
    autoSaveTimeoutRef.current = setTimeout(() => {
      lastSavedDataRef.current = dataString;
      autoSaveMutation.mutate(data);
    }, 2000);
  }, [currentUser?.id, autoSaveMutation]);

  // Watch form changes and trigger auto-save
  const formValues = form.watch();
  useEffect(() => {
    // Skip during initial load
    if (loadingProfile || isInitialLoadRef.current) return;

    // Validate form has minimum required data before auto-saving
    if (formValues.name && formValues.name.length > 0) {
      performAutoSave(formValues as FormData);
    }
  }, [formValues, loadingProfile, performAutoSave]);

  // Mark initial load as complete after profile loads
  useEffect(() => {
    if (!loadingProfile && profileResponse !== undefined) {
      // Small delay to ensure form reset has completed
      setTimeout(() => {
        isInitialLoadRef.current = false;
        // Set initial data reference
        lastSavedDataRef.current = JSON.stringify(form.getValues());
      }, 500);
    }
  }, [loadingProfile, profileResponse, form]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const onSubmit = (data: FormData) => {
    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    profileMutation.mutate(data);
  };

  const addSkill = () => {
    if (skillInput.trim()) {
      const currentSkills = form.getValues("skills");
      if (!currentSkills.find((s) => s.name === skillInput.trim())) {
        form.setValue("skills", [...currentSkills, { name: skillInput.trim(), proficiency: skillProficiency }]);
        setSkillInput("");
        setSkillProficiency(50); // Reset to default
      }
    }
  };

  const removeSkill = (skillName: string) => {
    const currentSkills = form.getValues("skills");
    form.setValue(
      "skills",
      currentSkills.filter((s) => s.name !== skillName),
    );
  };

  const updateSkillProficiency = (skillName: string, proficiency: number) => {
    const currentSkills = form.getValues("skills");
    form.setValue(
      "skills",
      currentSkills.map((s) =>
        s.name === skillName ? { ...s, proficiency } : s
      )
    );
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
    form.setValue(
      "interests",
      currentInterests.filter((i) => i !== interest),
    );
  };

  const toggleSDG = (sdgValue: number) => {
    const currentSDGs = form.getValues("sdgGoals") || [];
    if (currentSDGs.includes(sdgValue)) {
      form.setValue(
        "sdgGoals",
        currentSDGs.filter((s) => s !== sdgValue),
      );
    } else {
      form.setValue("sdgGoals", [...currentSDGs, sdgValue]);
    }
  };

  // Availability management
  const addAvailabilitySlot = () => {
    const currentAvailability = form.getValues("availability");
    form.setValue("availability", [
      ...currentAvailability,
      { day: "monday", startTime: "09:00", endTime: "17:00" },
    ]);
  };

  const updateAvailabilitySlot = (
    index: number,
    field: keyof AvailabilitySlot,
    value: string,
  ) => {
    const currentAvailability = form.getValues("availability");
    const updatedAvailability = [...currentAvailability];
    updatedAvailability[index] = {
      ...updatedAvailability[index],
      [field]: value,
    };
    form.setValue("availability", updatedAvailability);
  };

  const removeAvailabilitySlot = (index: number) => {
    const currentAvailability = form.getValues("availability");
    form.setValue(
      "availability",
      currentAvailability.filter((_, i) => i !== index),
    );
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If profile is already completed, show message and redirect option
  if (existingProfile?.onboardingCompleted) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">Profile Already Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Your volunteer profile has already been set up. You can now access all features or return to the dashboard.
            </p>
            <Link href="/dashboard">
              <Button className="bg-primary">
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold mb-2">Volunteer Profile Settings</h1>
          {/* Auto-save status indicator */}
          <div className="flex items-center gap-2 text-sm">
            {autoSaveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Cloud className="h-4 w-4 animate-pulse" />
                Saving...
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                Saved
              </span>
            )}
            {autoSaveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <X className="h-4 w-4" />
                Save failed
              </span>
            )}
          </div>
        </div>
        <p className="text-muted-foreground">
          Create or update your volunteer profile to get matched with
          organizations that align with your skills, interests, and goals.
          <span className="block mt-1 text-sm text-blue-600 dark:text-blue-400">
            Your changes are automatically saved as you type.
          </span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {existingProfile ? "Update Your Profile" : "Create Your Profile"}
          </CardTitle>
          <CardDescription>
            This information will be used to match you with organizations and
            opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Data Discrepancy Alert - shows if user data has issues */}
              {currentUser?.id && (
                <DataDiscrepancyAlert 
                  userId={currentUser.id} 
                  onResolved={() => form.reset()}
                />
              )}
              
              {/* Profile Photo */}
              {currentUser?.id && (
                <div className="mb-6">
                  <ProfilePictureUpload
                    currentPhotoUrl={profilePhotoUrl}
                    onPhotoChange={setProfilePhotoUrl}
                    userId={currentUser.id.toString()}
                    userType="volunteer"
                  />
                </div>
              )}

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
                      Your location helps match you with local or remote
                      opportunities
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Timezone */}
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="America/New_York">
                          Eastern Time (ET)
                        </SelectItem>
                        <SelectItem value="America/Chicago">
                          Central Time (CT)
                        </SelectItem>
                        <SelectItem value="America/Denver">
                          Mountain Time (MT)
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time (PT)
                        </SelectItem>
                        <SelectItem value="Europe/London">
                          Greenwich Mean Time (GMT)
                        </SelectItem>
                        <SelectItem value="Europe/Paris">
                          Central European Time (CET)
                        </SelectItem>
                        <SelectItem value="Asia/Kolkata">
                          India Standard Time (IST)
                        </SelectItem>
                        <SelectItem value="Asia/Tokyo">
                          Japan Standard Time (JST)
                        </SelectItem>
                        <SelectItem value="Australia/Sydney">
                          Australian Eastern Time (AET)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Your local timezone for scheduling purposes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preferred Commitment */}
              <FormField
                control={form.control}
                name="preferredCommitment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Commitment Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select commitment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="one-time">One-time event</SelectItem>
                        <SelectItem value="short-term">
                          Short-term (1-3 months)
                        </SelectItem>
                        <SelectItem value="long-term">
                          Long-term (3+ months)
                        </SelectItem>
                        <SelectItem value="flexible">
                          Flexible / Open to all
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      What type of volunteering commitment are you looking for?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Weekly Hours */}
              <FormField
                control={form.control}
                name="weeklyHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weekly Hours Available</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="e.g., 5"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? "" : parseInt(value) || "");
                        }}
                        data-testid="input-volunteer-weekly-hours"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the total number of hours you can volunteer each
                      week
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Availability Schedule */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Availability Schedule
                  </Label>
                  <Button
                    type="button"
                    onClick={addAvailabilitySlot}
                    variant="outline"
                    size="sm"
                    data-testid="button-add-availability"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Time Slot
                  </Button>
                </div>

                <div className="space-y-3">
                  {(form.watch("availability") || []).map((slot, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <Select
                        value={slot.day}
                        onValueChange={(value) =>
                          updateAvailabilitySlot(index, "day", value)
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((day) => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={slot.startTime}
                        onValueChange={(value) =>
                          updateAvailabilitySlot(index, "startTime", value)
                        }
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="text-muted-foreground">to</span>

                      <Select
                        value={slot.endTime}
                        onValueChange={(value) =>
                          updateAvailabilitySlot(index, "endTime", value)
                        }
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAvailabilitySlot(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {(form.watch("availability") || []).length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg">
                    <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No availability slots added yet. Click "Add Time Slot" to
                      specify when you're available.
                    </p>
                  </div>
                )}

                {form.formState.errors.availability && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.availability.message}
                  </p>
                )}
              </div>

              {/* Skills with Proficiency */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Skills & Proficiency
                </Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill (e.g., Python, Teaching, Marketing)"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      data-testid="input-add-skill"
                    />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={skillProficiency}
                      onChange={(e) => setSkillProficiency(parseInt(e.target.value))}
                      className="w-24"
                      data-testid="slider-skill-proficiency"
                    />
                    <span className="text-sm font-semibold min-w-[40px]">{skillProficiency}%</span>
                    <Button
                      type="button"
                      onClick={addSkill}
                      variant="secondary"
                      data-testid="button-add-skill"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {form.watch("skills").map((skill) => (
                    <div
                      key={skill.name}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
                      data-testid={`skill-item-${skill.name}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{skill.name}</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={skill.proficiency}
                            onChange={(e) =>
                              updateSkillProficiency(skill.name, parseInt(e.target.value))
                            }
                            className="flex-1"
                            data-testid={`slider-proficiency-${skill.name}`}
                          />
                          <span className="text-sm font-semibold min-w-[40px]">
                            {skill.proficiency}%
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSkill(skill.name)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-remove-skill-${skill.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {form.watch("skills").length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg">
                    <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No skills added yet. Add your skills and rate your proficiency level to help
                      organizations find the right match.
                    </p>
                  </div>
                )}

                {form.formState.errors.skills && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.skills.message}
                  </p>
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
                      if (e.key === "Enter") {
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
                  {(form.watch("interests") || []).map((interest) => (
                    <Badge
                      key={interest}
                      variant="secondary"
                      className="gap-1"
                      data-testid={`badge-interest-${interest}`}
                    >
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
                  <p className="text-sm text-destructive">
                    {form.formState.errors.interests.message}
                  </p>
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
                      variant={
                        (form.watch("sdgGoals") || []).includes(sdg.value)
                          ? "default"
                          : "outline"
                      }
                      className="justify-start text-left h-auto py-2"
                      onClick={() => toggleSDG(sdg.value)}
                      data-testid={`button-sdg-${sdg.value}`}
                    >
                      {sdg.label}
                    </Button>
                  ))}
                </div>
                {form.formState.errors.sdgGoals && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.sdgGoals.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={profileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {profileMutation.isPending && (
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
