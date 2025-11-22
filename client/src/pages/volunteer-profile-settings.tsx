import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { ProfilePictureUpload } from "@/components/profile-picture-upload";
import { VolunteerSkillSection } from "@/components/forms/volunteer-skill-section";
import { VolunteerSDGSection } from "@/components/forms/volunteer-sdg-section";
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
  Laptop,
  Users,
  AlertCircle,
  Briefcase,
  Globe,
  Award,
  Sliders,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Constants
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

const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

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

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

// Schemas
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

const skillProficiencySchema = z.object({
  name: z.string().min(1, "Skill name is required"),
  proficiency: z.number().min(0).max(100, "Proficiency must be 0-100"),
});

const formSchema = insertVolunteerSchema
  .extend({
    email: z.string().email("Valid email is required"),
    name: z.string().min(1, "Name is required"),
    // New professional fields
    professionalTitle: z.string().optional(),
    yearsOfExperience: z.string().optional(),
    linkedinProfile: z
      .string()
      .url("Please enter a valid URL")
      .optional()
      .or(z.literal("")),
    languages: z.array(z.string()).optional(),
    // Existing fields
    skills: z
      .array(skillProficiencySchema)
      .min(1, "At least one skill is required"),
    interests: z.array(z.string()).optional(),
    location: z.string().optional(),
    sdgGoals: z.array(z.number()).optional(),
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
    matchingPriorities: z
      .object({
        skillsMatch: z.number().min(1).max(5).default(3),
        causeAlignment: z.number().min(1).max(5).default(3),
        timeFlexibility: z.number().min(1).max(5).default(3),
        geographicPreference: z.number().min(1).max(5).default(3),
        impactPotential: z.number().min(1).max(5).default(3),
      })
      .optional(),
  })
  .refine((data) => {
    // Calculate total hours from availability slots
    const totalHours = data.availability.reduce((sum, slot) => {
      const start = parseInt(slot.startTime.split(":")[0]);
      const end = parseInt(slot.endTime.split(":")[0]);
      return sum + (end - start);
    }, 0);

    // Availability should be the LESSER of weekly hours or total slot hours
    data.weeklyHours = Math.min(data.weeklyHours, totalHours);

    return true;
  });

type FormData = z.infer<typeof formSchema>;
type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;

// Custom hooks for form operations
const useFormOperations = (form: any) => {
  const addItem = useCallback(
    (field: string, input: string, setInput: (value: string) => void) => {
      if (input.trim()) {
        const currentItems = form.getValues(field);
        if (!currentItems.includes(input.trim())) {
          form.setValue(field, [...currentItems, input.trim()]);
          setInput("");
        }
      }
    },
    [form],
  );

  const removeItem = useCallback(
    (field: string, item: string) => {
      const currentItems = form.getValues(field);
      form.setValue(
        field,
        currentItems.filter((i: string) => i !== item),
      );
    },
    [form],
  );

  return { addItem, removeItem };
};

const useAvailabilityManagement = (form: any) => {
  const updateWeeklyHoursBasedOnSlots = useCallback(
    (availability: any[]) => {
      // Calculate total hours from slots
      const totalSlotHours = availability.reduce((sum, slot) => {
        const start = parseInt(slot.startTime?.split(":")[0] || 0);
        const end = parseInt(slot.endTime?.split(":")[0] || 0);
        return sum + (end - start);
      }, 0);

      // Get current weekly hours input
      const currentWeeklyHours = form.getValues("weeklyHours");

      // Set to lesser of the two values
      const availabilityHours = Math.min(currentWeeklyHours, totalSlotHours);
      form.setValue("weeklyHours", availabilityHours);
      console.log(
        `[Availability Management] Updated weekly hours to min(${currentWeeklyHours}, ${totalSlotHours}) = ${availabilityHours}`,
      );
    },
    [form],
  );

  const addAvailabilitySlot = useCallback(() => {
    const currentAvailability = form.getValues("availability");
    const newAvailability = [
      ...currentAvailability,
      { day: "monday", startTime: "09:00", endTime: "17:00" },
    ];
    form.setValue("availability", newAvailability);
    updateWeeklyHoursBasedOnSlots(newAvailability);
  }, [form, updateWeeklyHoursBasedOnSlots]);

  const updateAvailabilitySlot = useCallback(
    (index: number, field: keyof AvailabilitySlot, value: string) => {
      const currentAvailability = form.getValues("availability");
      const updatedAvailability = [...currentAvailability];
      updatedAvailability[index] = {
        ...updatedAvailability[index],
        [field]: value,
      };
      form.setValue("availability", updatedAvailability);

      // Real-time update: set weekly hours to lesser of input vs slot hours
      updateWeeklyHoursBasedOnSlots(updatedAvailability);
    },
    [form, updateWeeklyHoursBasedOnSlots],
  );

  const removeAvailabilitySlot = useCallback(
    (index: number) => {
      const currentAvailability = form.getValues("availability");
      const updatedAvailability = currentAvailability.filter(
        (_: any, i: number) => i !== index,
      );
      form.setValue("availability", updatedAvailability);

      // Real-time update: recalculate weekly hours after removing slot
      updateWeeklyHoursBasedOnSlots(updatedAvailability);
    },
    [form, updateWeeklyHoursBasedOnSlots],
  );

  return {
    addAvailabilitySlot,
    updateAvailabilitySlot,
    removeAvailabilitySlot,
  };
};

// Reusable form sections
const PersonalInfoSection = ({
  form,
  onPhotoChange,
  currentPhotoUrl,
  userId,
}: any) => (
  <>
    <div className="mb-6">
      <ProfilePictureUpload
        currentPhotoUrl={currentPhotoUrl}
        onPhotoChange={onPhotoChange}
        userId={userId}
        userType="volunteer"
      />
    </div>

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

    <FormField
      control={form.control}
      name="yearsOfExperience"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Years of Experience
          </FormLabel>
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value || ""}
          >
            <FormControl>
              <SelectTrigger data-testid="select-years-of-experience">
                <SelectValue placeholder="Select your experience level" />
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
          <FormDescription>
            Select your total years of professional experience
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
);

const AvailabilitySection = ({
  form,
  availabilityOps,
}: {
  form: any;
  availabilityOps: any;
}) => (
  <>
    <div className="border-t pt-6">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5" />
        Availability & Work Preferences
      </h3>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <FormField
        control={form.control}
        name="timezone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Timezone</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Your local timezone for scheduling purposes
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="preferredCommitment"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Preferred Commitment Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <SelectItem value="long-term">Long-term (3+ months)</SelectItem>
                <SelectItem value="flexible">Flexible / Open to all</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              What type of volunteering commitment are you looking for?
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="preferredWorkStyle"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Laptop className="h-4 w-4" />
              Preferred Work Style
            </FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select work style" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="in-person">In-person</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              What kind of working style do you prefer?
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

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
              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
              data-testid="input-volunteer-weekly-hours"
            />
          </FormControl>
          <FormDescription>
            Enter the total number of hours you can volunteer each week
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />

    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Availability Schedule
        </Label>
        <Button
          type="button"
          onClick={availabilityOps.addAvailabilitySlot}
          variant="outline"
          size="sm"
          data-testid="button-add-availability"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Time Slot
        </Button>
      </div>

      <div className="space-y-3">
        {form
          .watch("availability")
          .map((slot: AvailabilitySlot, index: number) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              <Select
                value={slot.day}
                onValueChange={(value) =>
                  availabilityOps.updateAvailabilitySlot(index, "day", value)
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
                  availabilityOps.updateAvailabilitySlot(
                    index,
                    "startTime",
                    value,
                  )
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
                  availabilityOps.updateAvailabilitySlot(
                    index,
                    "endTime",
                    value,
                  )
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
                onClick={() => availabilityOps.removeAvailabilitySlot(index)}
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
            No availability slots added yet. Click "Add Time Slot" to specify
            when you're available.
          </p>
        </div>
      )}

      {form.formState.errors.availability && (
        <p className="text-sm text-destructive">
          {form.formState.errors.availability.message}
        </p>
      )}
    </div>
  </>
);

const SkillsInterestsSection = ({
  form,
  skillInput,
  setSkillInput,
  skillProficiency,
  setSkillProficiency,
  updateSkillProficiency,
  removeSkill,
  addSkill,
  interestInput,
  setInterestInput,
  addInterest,
  removeInterest,
}: any) => (
  <>
    <VolunteerSkillSection
      skills={form.watch("skills")}
      skillInput={skillInput}
      setSkillInput={setSkillInput}
      skillProficiency={skillProficiency}
      setSkillProficiency={setSkillProficiency}
      onAddSkill={addSkill}
      onRemoveSkill={removeSkill}
      onUpdateSkillProficiency={updateSkillProficiency}
      formErrors={form.formState.errors}
    />

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
        {form.watch("interests").map((interest: string) => (
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
  </>
);

const SDGGoalsSection = ({ form }: { form: any }) => {
  const toggleSDG = useCallback(
    (sdgValue: number) => {
      const currentSDGs = form.getValues("sdgGoals");
      if (currentSDGs.includes(sdgValue)) {
        form.setValue(
          "sdgGoals",
          currentSDGs.filter((s: number) => s !== sdgValue),
        );
      } else {
        form.setValue("sdgGoals", [...currentSDGs, sdgValue]);
      }
    },
    [form],
  );

  return (
    <VolunteerSDGSection
      selectedSDGs={form.watch("sdgGoals")}
      onToggleSDG={toggleSDG}
      formErrors={form.formState.errors}
    />
  );
};

export default function VolunteerProfileSettings() {
  const { toast } = useToast();
  const [skillInput, setSkillInput] = useState("");
  const [skillProficiency, setSkillProficiency] = useState(50);
  const [interestInput, setInterestInput] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const hasInitializedRef = useRef(false); // Track if form has been initialized

  // Data fetching - ALWAYS use fresh user data, no caching
  const userId = localStorage.getItem("currentUserId");
  const { data: currentUser, isLoading: userLoading } = useQuery<{
    id: number;
    email: string;
    displayName?: string;
  }>({
    queryKey: ["/api/users/me"],
    staleTime: 0, // Always fetch fresh - never cache user data
  });

  // Fetch volunteer profile using intake API which includes all availability fields
  const profileQuery = useQuery<any>({
    queryKey: ["/api/intake/volunteer-profile", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const response = await fetch(
        `/api/intake/volunteer-profile?userId=${currentUser.id}`,
      );
      if (!response.ok) throw new Error("Failed to fetch profile");
      const data = await response.json();
      // API returns { user, volunteerProfile }, extract the volunteerProfile
      return data.volunteerProfile || data;
    },
    enabled: !!currentUser?.id,
  });
  const { data: existingProfile, isLoading: loadingProfile } = profileQuery;

  // Form setup - use defaultValues only, let effects populate from profile
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      skills: [],
      interests: [],
      location: "",
      yearsOfExperience: "",
      sdgGoals: [],
      weeklyHours: 1,
      availability: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferredCommitment: "flexible",
      preferredWorkStyle: "remote",
    },
  });

  // Load profile data into form ONLY on initial mount (use ref to track this)
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    if (!initialLoadDoneRef.current && currentUser?.id) {
      // First time loading for this user
      initialLoadDoneRef.current = true;

      if (existingProfile) {
        console.log(
          `[Profile Load Effect] Initial loading of profile for user ${currentUser?.id}:`,
          existingProfile,
        );
        form.reset({
          email: currentUser?.email || "",
          name: existingProfile.volunteerName || currentUser?.displayName || "",
          skills: existingProfile.skills || [],
          interests: existingProfile.interests || [],
          location: existingProfile.location || "",
          yearsOfExperience: existingProfile.yearsOfExperience || "",
          sdgGoals: existingProfile.preferredSdgs || [],
          weeklyHours: existingProfile.weeklyAvailability || 1,
          availability: existingProfile.availability || [],
          timezone:
            existingProfile.timezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferredCommitment:
            existingProfile.preferredCommitment || "flexible",
          preferredWorkStyle: existingProfile.preferredWorkStyle || "remote",
        });
      } else {
        // New profile
        console.log(
          `[Profile Load Effect] Initializing new profile for user ${currentUser?.id}`,
        );
        form.setValue("email", currentUser.email);
        if (currentUser.displayName) {
          form.setValue("name", currentUser.displayName);
        }
      }
    }
  }, [currentUser?.id]);

  // Load existing photo URL
  useEffect(() => {
    if (existingProfile?.profilePhotoUrl) {
      setProfilePhotoUrl(existingProfile.profilePhotoUrl);
    }
  }, [existingProfile]);

  // Mutations
  const mutationConfig = {
    onSuccess: async (result: any) => {
      const id = currentUser?.id;
      console.log(`[Settings Mutation] Success - mutation returned:`, result);

      // IMMEDIATELY populate form with saved data to prevent blank form
      const profileData = result.volunteerProfile || result;
      console.log(
        `[Settings Mutation] Immediately updating form with saved profile data:`,
        profileData,
      );

      // Directly set form values with saved data - this prevents the form from going blank
      form.reset({
        email: currentUser?.email || "",
        name: profileData.volunteerName || currentUser?.displayName || "",
        skills: profileData.skills || [],
        interests: profileData.interests || [],
        location: profileData.location || "",
        yearsOfExperience: profileData.yearsOfExperience || "",
        sdgGoals: profileData.preferredSdgs || [],
        weeklyHours: profileData.weeklyAvailability || 1,
        availability: profileData.availability || [],
        timezone:
          profileData.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        preferredCommitment: profileData.preferredCommitment || "flexible",
        preferredWorkStyle: profileData.preferredWorkStyle || "remote",
      });

      // Invalidate related queries in background (non-blocking)
      // These will update the server state but won't interfere with the form
      queryClient
        .invalidateQueries({ queryKey: ["/api/intake/volunteer-profile", id] })
        .catch(() => {});
      queryClient
        .invalidateQueries({ queryKey: ["/api/volunteers"] })
        .catch(() => {});
      queryClient
        .invalidateQueries({ queryKey: ["/api/users/me"] })
        .catch(() => {});
      queryClient
        .invalidateQueries({ queryKey: ["/api/dashboard/summary"] })
        .catch(() => {});
      queryClient
        .invalidateQueries({ queryKey: ["/api/opportunities/matches"] })
        .catch(() => {});

      toast({
        title: `Profile ${existingProfile ? "updated" : "created"}!`,
        description: `Your volunteer profile has been ${existingProfile ? "updated" : "created"} successfully.`,
      });
    },
    onError: (error: Error) => {
      console.error("Profile save error:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    },
  };

  const profileMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!currentUser?.id) throw new Error("User not authenticated");

      const targetUserId = currentUser.id;
      console.log(
        `[Settings Mutation CRITICAL] SAVING FOR USER ID: ${targetUserId}, EMAIL: ${currentUser.email}`,
      );

      // Transform form data to match volunteer profile API
      const profileData = {
        volunteerName: data.name,
        skills: data.skills,
        interests: data.interests,
        location: data.location,
        yearsOfExperience: data.yearsOfExperience,
        sdgGoals: data.sdgGoals,
        weeklyAvailability: data.weeklyHours, // Map weeklyHours to weeklyAvailability
        availability: data.availability,
        timezone: data.timezone,
        preferredCommitment: data.preferredCommitment,
        preferredWorkStyle: data.preferredWorkStyle,
        profilePhotoUrl: profilePhotoUrl,
      };

      console.log(
        `[Settings Mutation] Submitting weeklyAvailability: ${profileData.weeklyAvailability} for user ${targetUserId}`,
      );

      // Add timeout protection - 15 seconds max
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Profile save timeout. Please try again.")),
          15000,
        ),
      );

      try {
        const url = `/api/intake/volunteer-profile?userId=${targetUserId}`;
        console.log(`[Settings Mutation CRITICAL] API URL: ${url}`);

        const result = (await Promise.race([
          apiRequest("POST", url, profileData),
          timeoutPromise,
        ])) as any;

        console.log(
          `[Settings Mutation CRITICAL] Backend response received for user ${targetUserId}`,
          result,
        );
        return result;
      } catch (error) {
        console.error("Profile mutation error:", error);
        throw error;
      }
    },
    ...mutationConfig,
  });

  // Skill operations
  const addSkill = useCallback(() => {
    if (skillInput.trim()) {
      const currentSkills = form.getValues("skills");
      if (!currentSkills.find((s: any) => s.name === skillInput.trim())) {
        form.setValue("skills", [
          ...currentSkills,
          { name: skillInput.trim(), proficiency: skillProficiency },
        ]);
        setSkillInput("");
        setSkillProficiency(50);
      }
    }
  }, [skillInput, skillProficiency, form]);

  const removeSkill = useCallback(
    (skillName: string) => {
      const currentSkills = form.getValues("skills");
      form.setValue(
        "skills",
        currentSkills.filter((s: any) => s.name !== skillName),
      );
    },
    [form],
  );

  const updateSkillProficiency = useCallback(
    (skillName: string, proficiency: number) => {
      const currentSkills = form.getValues("skills");
      form.setValue(
        "skills",
        currentSkills.map((s: any) =>
          s.name === skillName ? { ...s, proficiency } : s,
        ),
      );
    },
    [form],
  );

  // Interest operations
  const addInterest = useCallback(() => {
    if (interestInput.trim()) {
      const currentInterests = form.getValues("interests") || [];
      if (!currentInterests.includes(interestInput.trim())) {
        form.setValue("interests", [...currentInterests, interestInput.trim()]);
        setInterestInput("");
      }
    }
  }, [interestInput, form]);

  const removeInterest = useCallback(
    (interest: string) => {
      const currentInterests = form.getValues("interests") || [];
      form.setValue(
        "interests",
        currentInterests.filter((i: string) => i !== interest),
      );
    },
    [form],
  );

  // Operations
  const availabilityOps = useAvailabilityManagement(form);

  const onSubmit = async (data: FormData) => {
    console.log(
      `[Settings Form Submit CRITICAL] currentUser?.id = ${currentUser?.id}`,
    );
    console.log(
      `[Settings Form Submit CRITICAL] currentUser?.email = ${currentUser?.email}`,
    );
    console.log(
      `[Settings Form Submit CRITICAL] currentUser object:`,
      currentUser,
    );
    console.log(
      `[Settings Form Submit] User clicked save - weeklyHours value: ${data.weeklyHours}`,
    );
    console.log(`[Settings Form Submit] Full form data:`, data);

    // Validate weeklyHours is set
    if (!data.weeklyHours || data.weeklyHours <= 0) {
      console.error(
        `[Settings Form Submit] Invalid weeklyHours: ${data.weeklyHours}`,
      );
      toast({
        title: "Invalid Weekly Hours",
        description: "Weekly Hours Available must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    console.log(
      `[Settings Form Submit] Submitting mutation with weeklyHours: ${data.weeklyHours}`,
    );
    profileMutation.mutate(data);
  };

  if (loadingProfile || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Safety check: ensure currentUser is available before rendering form
  if (!currentUser?.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">
          Error: User not authenticated. Please log in again.
        </p>
      </div>
    );
  }

  const isSubmitting = profileMutation.isPending;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Volunteer Profile Settings</h1>
        <p className="text-muted-foreground">
          Create or update your volunteer profile to get matched with
          organizations that align with your skills, interests, and goals.
        </p>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center gap-2 justify-center">
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
              <PersonalInfoSection
                form={form}
                onPhotoChange={setProfilePhotoUrl}
                currentPhotoUrl={profilePhotoUrl}
                userId={currentUser?.id || ""}
              />
              <AvailabilitySection
                form={form}
                availabilityOps={availabilityOps}
              />
              <SkillsInterestsSection
                form={form}
                skillInput={skillInput}
                setSkillInput={setSkillInput}
                skillProficiency={skillProficiency}
                setSkillProficiency={setSkillProficiency}
                updateSkillProficiency={updateSkillProficiency}
                removeSkill={removeSkill}
                addSkill={addSkill}
                interestInput={interestInput}
                setInterestInput={setInterestInput}
                addInterest={addInterest}
                removeInterest={removeInterest}
              />
              <SDGGoalsSection form={form} />

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="button-save-profile"
                  className="text-sm md:text-base"
                  size="sm"
                >
                  {isSubmitting && (
                    <Loader2 className="mr-1 md:mr-2 h-3 md:h-4 w-3 md:w-4 animate-spin" />
                  )}
                  <span className="text-xs md:text-sm">
                    {existingProfile ? "Update" : "Create"}
                  </span>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
