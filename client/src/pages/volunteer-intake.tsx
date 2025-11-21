import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
import { Slider } from "@/components/ui/slider";
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
  Briefcase,
  Globe,
  Award,
  Sliders,
  AlertCircle,
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
import { useFormField } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// Form schema with new professional fields
const formSchema = insertVolunteerSchema.extend({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required"),
  // New professional fields
  professionalTitle: z.string().optional(),
  yearsOfExperience: z.string().min(1, "Years of experience is required"),
  linkedinProfile: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  languages: z.array(z.string()).optional(),
  // Existing fields
  skills: z.array(skillProficiencySchema).min(1, "At least one skill is required"),
  interests: z.array(z.string()).optional(),
  location: z.string().optional(),
  sdgGoals: z.array(z.number()).default([]),
  weeklyHours: z.number().min(1, "At least 1 hour is required"),
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
  preferredWorkStyle: z.enum(["remote", "in-person", "hybrid"]).optional(),
  // New matching priorities
  matchingPriorities: z.object({
    skillsMatch: z.number().min(1).max(5).default(3),
    causeAlignment: z.number().min(1).max(5).default(3),
    timeFlexibility: z.number().min(1).max(5).default(3),
    geographicPreference: z.number().min(1).max(5).default(3),
    impactPotential: z.number().min(1).max(5).default(3),
  }).optional(),
});

type FormData = z.infer<typeof formSchema>;
type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;
type SkillProficiency = z.infer<typeof skillProficiencySchema>;

// Helper function to parse skills from storage format to form format
const parseSkills = (skillsArray: any[]): SkillProficiency[] => {
  if (!Array.isArray(skillsArray)) return [];
  return skillsArray
    .map((skill) => {
      if (typeof skill === 'string') {
        // Parse "Skill Name (85%)" format
        const match = skill.match(/^(.+?)\s*\((\d+)%\)$/);
        if (match) {
          return { name: match[1], proficiency: parseInt(match[2]) };
        }
        // Fallback: treat whole string as skill name with 50% proficiency
        return { name: skill, proficiency: 50 };
      }
      // Already an object
      return skill;
    })
    .filter((skill) => skill && skill.name);
};

export default function VolunteerProfileSettings() {
  const { toast } = useToast();
  const [skillInput, setSkillInput] = useState("");
  const [skillProficiency, setSkillProficiency] = useState(50); // Default 50%
  const [interestInput, setInterestInput] = useState("");

  // Fetch current user to get email
  const userId = localStorage.getItem("currentUserId");
  const { data: currentUser } = useQuery<{ id: number; email: string; displayName?: string }>({
    queryKey: ["/api/users/me"],
  });

  // Fetch existing volunteer profile using intake API which includes all availability fields
  const { data: existingProfile, isLoading: loadingProfile } = useQuery<any>({
    queryKey: ["/api/intake/volunteer-profile", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const response = await fetch(`/api/intake/volunteer-profile?userId=${currentUser.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: currentUser?.email || "",
      name: currentUser?.displayName || "",
      professionalTitle: existingProfile?.professionalTitle || "",
      yearsOfExperience: existingProfile?.yearsOfExperience || "",
      linkedinProfile: existingProfile?.linkedinProfile || "",
      languages: existingProfile?.languages || [],
      skills: parseSkills(existingProfile?.skills),
      interests: existingProfile?.interests || [],
      location: existingProfile?.location || "",
      sdgGoals: existingProfile?.preferredSdgs || [],
      weeklyHours: existingProfile?.weeklyAvailability || 1,
      availability: existingProfile?.availability || [],
      timezone:
        existingProfile?.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferredCommitment:
        existingProfile?.preferredCommitment || "flexible",
      preferredWorkStyle: existingProfile?.preferredWorkStyle || undefined,
      matchingPriorities: existingProfile?.matchingPriorities || {
        skillsMatch: 3,
        causeAlignment: 3,
        timeFlexibility: 3,
        geographicPreference: 3,
        impactPotential: 3,
      },
    },
  });

  // Reset form when profile data loads
  useEffect(() => {
    if (existingProfile || currentUser) {
      form.reset({
        email: currentUser?.email || "",
        name: currentUser?.displayName || "",
        professionalTitle: existingProfile?.professionalTitle || "",
        yearsOfExperience: existingProfile?.yearsOfExperience || "",
        linkedinProfile: existingProfile?.linkedinProfile || "",
        languages: existingProfile?.languages || [],
        skills: parseSkills(existingProfile?.skills),
        interests: existingProfile?.interests || [],
        location: existingProfile?.location || "",
        sdgGoals: existingProfile?.preferredSdgs || [],
        weeklyHours: existingProfile?.weeklyAvailability || 1,
        availability: existingProfile?.availability || [],
        timezone:
          existingProfile?.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        preferredCommitment:
          existingProfile?.preferredCommitment || "flexible",
        preferredWorkStyle: existingProfile?.preferredWorkStyle || undefined,
        matchingPriorities: existingProfile?.matchingPriorities || {
          skillsMatch: 3,
          causeAlignment: 3,
          timeFlexibility: 3,
          geographicPreference: 3,
          impactPotential: 3,
        },
      });
    }
  }, [currentUser?.email, currentUser?.displayName, existingProfile, form]);

  // Profile mutation (create or update)
  const profileMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!currentUser?.id) throw new Error("User not authenticated");
      
      // Transform form data to match volunteer profile API
      const profileData = {
        volunteerName: data.name,
        professionalTitle: data.professionalTitle || null,
        yearsOfExperience: data.yearsOfExperience || null,
        linkedinProfile: data.linkedinProfile || null,
        languages: data.languages || [],
        skills: data.skills.map((s) => `${s.name} (${s.proficiency}%)`), // Convert to display format for storage
        interests: data.interests || [],
        location: data.location,
        preferredSdgs: data.sdgGoals || [], // Map sdgGoals to preferredSdgs for backend compatibility
        weeklyAvailability: data.weeklyHours, // Map weeklyHours to weeklyAvailability
        availability: data.availability,
        timezone: data.timezone,
        preferredCommitment: data.preferredCommitment,
        preferredWorkStyle: data.preferredWorkStyle || null,
        matchingPriorities: data.matchingPriorities || {
          skillsMatch: 3,
          causeAlignment: 3,
          timeFlexibility: 3,
          geographicPreference: 3,
          impactPotential: 3,
        },
        skillRatings: Object.fromEntries(data.skills.map((s) => [s.name, s.proficiency])), // Proficiency ratings in JSON format
        onboardingCompleted: !existingProfile, // Mark as completed on first submission only
      };
      
      console.log('[Intake Mutation] Sending profileData to backend:', JSON.stringify({
        userId: currentUser.id,
        availability: profileData.availability,
        weeklyAvailability: profileData.weeklyAvailability,
        yearsOfExperience: profileData.yearsOfExperience,
      }, null, 2));
      
      const response = await apiRequest("POST", `/api/intake/volunteer-profile?userId=${currentUser.id}`, profileData);
      console.log('[Intake Mutation] Backend response:', JSON.stringify(response, null, 2));
      return response;
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
      // Redirect to dashboard if first time completing onboarding
      if (!existingProfile) {
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      }
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
    console.log('[Intake Form Submit] Form data:', JSON.stringify({
      name: data.name,
      location: data.location,
      availability: data.availability,
      skills: data.skills,
      yearsOfExperience: data.yearsOfExperience,
      weeklyHours: data.weeklyHours,
      timezone: data.timezone,
    }, null, 2));
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
      const currentInterests = form.getValues("interests") || [];
      if (!currentInterests.includes(interestInput.trim())) {
        form.setValue("interests", [...currentInterests, interestInput.trim()]);
        setInterestInput("");
      }
    }
  };

  const removeInterest = (interest: string) => {
    const currentInterests = form.getValues("interests") || [];
    form.setValue(
      "interests",
      currentInterests.filter((i) => i !== interest),
    );
  };

  const toggleSDG = (sdgValue: number) => {
    const currentSDGs = form.getValues("sdgGoals") || [];
    const newSDGs = currentSDGs.includes(sdgValue)
      ? currentSDGs.filter((s) => s !== sdgValue)
      : [...currentSDGs, sdgValue];
    form.setValue("sdgGoals", newSDGs);
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Volunteer Profile Settings</h1>
        <p className="text-muted-foreground">
          Create or update your volunteer profile to get matched with
          organizations that align with your skills, interests, and goals.
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

              {/* Professional Title */}
              <FormField
                control={form.control}
                name="professionalTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Professional Title (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Data Scientist, Marketing Manager"
                        {...field}
                        data-testid="input-professional-title"
                      />
                    </FormControl>
                    <FormDescription>
                      Your current or most recent job title
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Years of Experience */}
              <FormField
                control={form.control}
                name="yearsOfExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Years of Experience *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-years-experience">
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0-1">0-1 years</SelectItem>
                        <SelectItem value="1-2">1-2 years</SelectItem>
                        <SelectItem value="3-5">3-5 years</SelectItem>
                        <SelectItem value="5-10">5-10 years</SelectItem>
                        <SelectItem value="10+">10+ years</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* LinkedIn Profile */}
              <FormField
                control={form.control}
                name="linkedinProfile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      LinkedIn Profile (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://linkedin.com/in/yourprofile"
                        {...field}
                        data-testid="input-linkedin-profile"
                      />
                    </FormControl>
                    <FormDescription>
                      Your LinkedIn profile URL
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
                      defaultValue={field.value}
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
                      defaultValue={field.value}
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
                  {form.watch("availability").map((slot, index) => (
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

                {form.watch("availability").length === 0 && (
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
                  {form.watch("skills").length > 0 && (
                    <div className="text-xs text-muted-foreground font-semibold px-1 mb-2">
                      {form.watch("skills").length} skill{form.watch("skills").length !== 1 ? 's' : ''} added
                    </div>
                  )}
                  {form.watch("skills").map((skill) => (
                    <div
                      key={skill.name}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
                      data-testid={`skill-item-${skill.name}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{skill.name}</p>
                          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                            {skill.proficiency}% proficiency
                          </span>
                        </div>
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

              {/* Preferred Work Style */}
              <FormField
                control={form.control}
                name="preferredWorkStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Work Style (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-work-style">
                          <SelectValue placeholder="Select work preference" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="remote">Remote Only</SelectItem>
                        <SelectItem value="in-person">In-person Only</SelectItem>
                        <SelectItem value="hybrid">Hybrid (Both)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How you prefer to volunteer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Matching Priorities */}
              <div className="space-y-4 border-t pt-6 mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sliders className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Matching Priorities</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Rate the importance of each factor when matching you with opportunities (1 = Not Important, 5 = Very Important)
                </p>

                {/* Skills Match Priority */}
                <FormField
                  control={form.control}
                  name="matchingPriorities.skillsMatch"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-2">
                        <FormLabel>Skills Match</FormLabel>
                        <span className="text-sm text-muted-foreground">{field.value || 3}/5</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[field.value || 3]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          data-testid="slider-skills-match"
                        />
                      </FormControl>
                      <FormDescription>
                        How important is matching your skills?
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* Cause Alignment Priority */}
                <FormField
                  control={form.control}
                  name="matchingPriorities.causeAlignment"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-2">
                        <FormLabel>Cause Alignment</FormLabel>
                        <span className="text-sm text-muted-foreground">{field.value || 3}/5</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[field.value || 3]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          data-testid="slider-cause-alignment"
                        />
                      </FormControl>
                      <FormDescription>
                        How important is alignment with your causes?
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* Time Flexibility Priority */}
                <FormField
                  control={form.control}
                  name="matchingPriorities.timeFlexibility"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-2">
                        <FormLabel>Time Flexibility</FormLabel>
                        <span className="text-sm text-muted-foreground">{field.value || 3}/5</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[field.value || 3]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          data-testid="slider-time-flexibility"
                        />
                      </FormControl>
                      <FormDescription>
                        How important is scheduling flexibility?
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* Geographic Preference Priority */}
                <FormField
                  control={form.control}
                  name="matchingPriorities.geographicPreference"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-2">
                        <FormLabel>Geographic Preference</FormLabel>
                        <span className="text-sm text-muted-foreground">{field.value || 3}/5</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[field.value || 3]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          data-testid="slider-geographic-preference"
                        />
                      </FormControl>
                      <FormDescription>
                        How important is location match?
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* Impact Potential Priority */}
                <FormField
                  control={form.control}
                  name="matchingPriorities.impactPotential"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-2">
                        <FormLabel>Impact Potential</FormLabel>
                        <span className="text-sm text-muted-foreground">{field.value || 3}/5</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[field.value || 3]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          data-testid="slider-impact-potential"
                        />
                      </FormControl>
                      <FormDescription>
                        How important is making a big impact?
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={profileMutation.isPending}
                  className="w-full"
                  data-testid="button-save-profile"
                >
                  {profileMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {existingProfile ? "Save Profile" : "Create Profile"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Security & Account Settings */}
      {existingProfile && (
        <>
          {/* Change Password */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Security
              </CardTitle>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" data-testid="button-change-password">
                Change Password
              </Button>
              <p className="text-sm text-muted-foreground">
                Update your password regularly to keep your account secure. You'll be signed out after changing your password.
              </p>
            </CardContent>
          </Card>

          {/* Session Settings */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Session Settings
              </CardTitle>
              <CardDescription>
                Manage your active sessions and login devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Current Session</p>
                  <p className="text-xs text-muted-foreground">This browser</p>
                </div>
                <Badge>Active</Badge>
              </div>
              <Button variant="outline" className="w-full" data-testid="button-signout-all">
                Sign Out All Devices
              </Button>
              <p className="text-sm text-muted-foreground">
                Sign out of Synerxus on all devices. You'll need to sign in again on each device.
              </p>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="mt-4 border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that affect your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="destructive" 
                className="w-full" 
                data-testid="button-delete-account"
              >
                Delete Account
              </Button>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
