import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertVolunteerSchema, type Volunteer } from "@shared/schema";
import { ProfilePictureUpload } from "@/components/profile-picture-upload";
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

const formSchema = insertVolunteerSchema.extend({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required"),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  interests: z.array(z.string()).min(1, "At least one interest is required"),
  location: z.string().min(1, "Location is required"),
  sdgGoals: z.array(z.number()).min(1, "At least one SDG goal is required"),
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
  preferredWorkStyle: z.enum(["remote", "in-person", "hybrid"]),
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
  const addAvailabilitySlot = useCallback(() => {
    const currentAvailability = form.getValues("availability");
    form.setValue("availability", [
      ...currentAvailability,
      { day: "monday", startTime: "09:00", endTime: "17:00" },
    ]);
  }, [form]);

  const updateAvailabilitySlot = useCallback(
    (index: number, field: keyof AvailabilitySlot, value: string) => {
      const currentAvailability = form.getValues("availability");
      const updatedAvailability = [...currentAvailability];
      updatedAvailability[index] = {
        ...updatedAvailability[index],
        [field]: value,
      };
      form.setValue("availability", updatedAvailability);
    },
    [form],
  );

  const removeAvailabilitySlot = useCallback(
    (index: number) => {
      const currentAvailability = form.getValues("availability");
      form.setValue(
        "availability",
        currentAvailability.filter((_: any, i: number) => i !== index),
      );
    },
    [form],
  );

  return {
    addAvailabilitySlot,
    updateAvailabilitySlot,
    removeAvailabilitySlot,
  };
};

// Reusable form sections
const PersonalInfoSection = ({ onPhotoChange, currentPhotoUrl, userId }: any) => (
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
    <FormField
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

    <FormField
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
  formOps,
  skillInput,
  setSkillInput,
  interestInput,
  setInterestInput,
}: any) => (
  <>
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
          onKeyDown={(e) =>
            e.key === "Enter" &&
            (e.preventDefault(),
            formOps.addItem("skills", skillInput, setSkillInput))
          }
          data-testid="input-add-skill"
        />
        <Button
          type="button"
          onClick={() => formOps.addItem("skills", skillInput, setSkillInput)}
          variant="secondary"
          data-testid="button-add-skill"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {form.watch("skills").map((skill: string) => (
          <Badge
            key={skill}
            variant="secondary"
            className="gap-1"
            data-testid={`badge-skill-${skill}`}
          >
            {skill}
            <button
              type="button"
              onClick={() => formOps.removeItem("skills", skill)}
              className="ml-1 hover:bg-secondary-foreground/10 rounded-full"
              data-testid={`button-remove-skill-${skill}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {form.formState.errors.skills && (
        <p className="text-sm text-destructive">
          {form.formState.errors.skills.message}
        </p>
      )}
    </div>

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
          onKeyDown={(e) =>
            e.key === "Enter" &&
            (e.preventDefault(),
            formOps.addItem("interests", interestInput, setInterestInput))
          }
          data-testid="input-add-interest"
        />
        <Button
          type="button"
          onClick={() =>
            formOps.addItem("interests", interestInput, setInterestInput)
          }
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
              onClick={() => formOps.removeItem("interests", interest)}
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
              form.watch("sdgGoals").includes(sdg.value) ? "default" : "outline"
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
  );
};

export default function VolunteerProfileSettings() {
  const { toast } = useToast();
  const [skillInput, setSkillInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  // Data fetching
  const userId = localStorage.getItem("currentUserId");
  const { data: currentUser } = useQuery<{ id: number; email: string; displayName?: string }>({ 
    queryKey: ["/api/users/me"] 
  });
  
  // Fetch volunteer profile using intake API which includes all availability fields
  const { data: existingProfile, isLoading: loadingProfile } = useQuery<any>({
    queryKey: ["/api/intake/volunteer-profile", currentUser?.id],
    enabled: !!currentUser?.id,
  });

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      skills: [],
      interests: [],
      location: "",
      sdgGoals: [],
      weeklyHours: 1,
      availability: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferredCommitment: "flexible",
      preferredWorkStyle: "remote",
    },
    values: existingProfile
      ? {
          email: currentUser?.email || "",
          name: existingProfile.volunteerName || currentUser?.displayName || "",
          skills: existingProfile.skills || [],
          interests: existingProfile.interests || [],
          location: existingProfile.location || "",
          sdgGoals: existingProfile.sdgGoals || [],
          weeklyHours: existingProfile.weeklyAvailability || 1,
          availability: existingProfile.availability || [],
          timezone:
            existingProfile.timezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferredCommitment:
            existingProfile.preferredCommitment || "flexible",
          preferredWorkStyle: existingProfile.preferredWorkStyle || "remote",
        }
      : undefined,
  });

  // Effects
  useEffect(() => {
    if (currentUser?.email && !existingProfile) {
      form.setValue("email", currentUser.email);
      if (currentUser.displayName) {
        form.setValue("name", currentUser.displayName);
      }
    }
  }, [currentUser, existingProfile, form]);

  // Mutations
  const mutationConfig = {
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
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  };

  const profileMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!currentUser?.id) throw new Error("User not authenticated");
      
      // Transform form data to match volunteer profile API
      const profileData = {
        volunteerName: data.name,
        skills: data.skills,
        interests: data.interests,
        location: data.location,
        sdgGoals: data.sdgGoals,
        weeklyAvailability: data.weeklyHours, // Map weeklyHours to weeklyAvailability
        availability: data.availability,
        timezone: data.timezone,
        preferredCommitment: data.preferredCommitment,
        preferredWorkStyle: data.preferredWorkStyle,
      };
      
      return apiRequest("POST", `/api/intake/volunteer-profile?userId=${currentUser.id}`, profileData);
    },
    ...mutationConfig,
  });

  // Operations
  const formOps = useFormOperations(form);
  const availabilityOps = useAvailabilityManagement(form);

  const onSubmit = (data: FormData) => {
    profileMutation.mutate(data);
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSubmitting = profileMutation.isPending;

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
              <PersonalInfoSection />
              <AvailabilitySection
                form={form}
                availabilityOps={availabilityOps}
              />
              <SkillsInterestsSection
                form={form}
                formOps={formOps}
                skillInput={skillInput}
                setSkillInput={setSkillInput}
                interestInput={interestInput}
                setInterestInput={setInterestInput}
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
