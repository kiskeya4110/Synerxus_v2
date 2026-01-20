import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  PROFILE_QUERY_CONFIG,
  cacheVolunteerProfile,
  getCachedVolunteerProfile,
  cacheUserProfile,
  getCachedUserProfile
} from "@/lib/profile-cache";
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
  LogOut,
  Building2,
  Cloud,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import OnboardingTrigger from "@/components/onboarding/onboarding-trigger";
import VolunteerNav from "@/components/layout/volunteer-nav";
import WebBottomNav from "@/components/layout/web-bottom-nav";
import PWAHeader from "@/components/pwa/pwa-header";
import VolunteerPWANav from "@/components/layout/volunteer-pwa-nav";
import { useIsMobile } from "@/hooks/use-mobile";
import { PrivacyConsentDialog } from "@/components/privacy-consent-dialog";
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
  // Americas
  { value: "America/New_York", label: "Eastern Time (ET) - New York" },
  { value: "America/Chicago", label: "Central Time (CT) - Chicago" },
  { value: "America/Denver", label: "Mountain Time (MT) - Denver" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT) - Los Angeles" },
  { value: "America/Sao_Paulo", label: "Brasilia Time (BRT) - São Paulo" },
  // Europe
  { value: "Europe/London", label: "Greenwich Mean Time (GMT) - London" },
  { value: "Europe/Paris", label: "Central European Time (CET) - Paris" },
  { value: "Europe/Berlin", label: "Central European Time (CET) - Berlin" },
  { value: "Europe/Istanbul", label: "Turkey Time (TRT) - Istanbul" },
  { value: "Europe/Moscow", label: "Moscow Time (MSK) - Moscow" },
  // Middle East / Gulf Region
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST) - Dubai, UAE" },
  { value: "Asia/Riyadh", label: "Arabia Standard Time (AST) - Riyadh, Saudi Arabia" },
  { value: "Asia/Qatar", label: "Arabia Standard Time (AST) - Doha, Qatar" },
  { value: "Asia/Kuwait", label: "Arabia Standard Time (AST) - Kuwait" },
  { value: "Asia/Bahrain", label: "Arabia Standard Time (AST) - Bahrain" },
  { value: "Asia/Muscat", label: "Gulf Standard Time (GST) - Muscat, Oman" },
  { value: "Asia/Tehran", label: "Iran Standard Time (IRST) - Tehran" },
  { value: "Asia/Baghdad", label: "Arabia Standard Time (AST) - Baghdad, Iraq" },
  { value: "Asia/Jerusalem", label: "Israel Standard Time (IST) - Jerusalem" },
  { value: "Asia/Beirut", label: "Eastern European Time (EET) - Beirut, Lebanon" },
  { value: "Asia/Amman", label: "Eastern European Time (EET) - Amman, Jordan" },
  // Africa
  { value: "Africa/Cairo", label: "Eastern European Time (EET) - Cairo, Egypt" },
  { value: "Africa/Johannesburg", label: "South Africa Standard Time (SAST)" },
  // South Asia
  { value: "Asia/Karachi", label: "Pakistan Standard Time (PKT) - Karachi" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST) - Mumbai, Delhi" },
  { value: "Asia/Dhaka", label: "Bangladesh Standard Time (BST) - Dhaka" },
  // East Asia
  { value: "Asia/Singapore", label: "Singapore Time (SGT) - Singapore" },
  { value: "Asia/Hong_Kong", label: "Hong Kong Time (HKT) - Hong Kong" },
  { value: "Asia/Shanghai", label: "China Standard Time (CST) - Shanghai, Beijing" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST) - Tokyo" },
  { value: "Asia/Seoul", label: "Korea Standard Time (KST) - Seoul" },
  // Oceania
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET) - Sydney" },
  { value: "Australia/Perth", label: "Australian Western Time (AWT) - Perth" },
  { value: "Pacific/Auckland", label: "New Zealand Time (NZT) - Auckland" },
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
    // Experience level for matching
    experienceLevel: z.enum(["entry-level", "intermediate", "expert"]).optional(),
    // Employer linking
    employerId: z.string().optional(),
    departmentName: z.string().optional(),
    jobTitleAtCompany: z.string().optional(),
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
    // Personal statement for volunteer ID card
    personalStatement: z.string().max(200, "Personal statement must be 200 characters or less").optional(),
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
type SkillProficiency = z.infer<typeof skillProficiencySchema>;

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
              type="email"
              placeholder="your.email@example.com"
              data-testid="input-volunteer-email"
            />
          </FormControl>
          <FormDescription>
            You can change your email address here
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
      name="personalStatement"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Personal Statement
          </FormLabel>
          <FormControl>
            <Textarea
              placeholder="Share your mission and what drives you to volunteer..."
              className="min-h-[80px] resize-none"
              maxLength={200}
              {...field}
              data-testid="input-volunteer-personal-statement"
            />
          </FormControl>
          <FormDescription>
            A short mission statement that will appear on your volunteer ID card (max 200 characters)
          </FormDescription>
          <div className="text-xs text-muted-foreground text-right">
            {(field.value?.length || 0)}/200
          </div>
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

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              value={field.value || ""}
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

      <FormField
        control={form.control}
        name="experienceLevel"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Skill Proficiency Level
            </FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger data-testid="select-experience-level">
                  <SelectValue placeholder="Select proficiency level" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="entry-level">Entry-level (Learning)</SelectItem>
                <SelectItem value="intermediate">Intermediate (Practiced)</SelectItem>
                <SelectItem value="expert">Expert (Mastered)</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Your typical skill proficiency level for matching with opportunities
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
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
            <Select onValueChange={field.onChange} value={field.value || ""}>
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
            <Select onValueChange={field.onChange} value={field.value || ""}>
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
            <Select onValueChange={field.onChange} value={field.value || ""}>
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
              onFocus={(e) => e.target.select()}
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
  const [, setLocation] = useLocation();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const userType = localStorage.getItem('userType');
  const isVolunteerMobile = isMobile && userType === 'volunteer';
  const [skillInput, setSkillInput] = useState("");
  const [skillProficiency, setSkillProficiency] = useState(50);
  const [interestInput, setInterestInput] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const hasInitializedRef = useRef(false); // Track if form has been initialized

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>("");
  const isInitialLoadRef = useRef(true);

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    setLocation('/');
  };

  // Data fetching - Use caching with background refetch for instant loading
  const userId = localStorage.getItem("currentUserId");
  const { data: currentUser, isLoading: userLoading } = useQuery<{
    id: number;
    email: string;
    displayName?: string;
    userType?: string;
    dataConsent?: boolean;
    dataConsentDate?: string;
  }>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      // Cache user data for instant loading on next visit
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

  // Redirect non-volunteer users to their appropriate settings page
  useEffect(() => {
    if (currentUser?.userType === "organization") {
      setLocation("/organization-profile-settings");
    } else if (currentUser?.userType === "corporate-partner") {
      setLocation("/corporate-partner-profile-settings");
    }
  }, [currentUser?.userType, setLocation]);

  // Redirect to login if not authenticated (after loading is complete)
  useEffect(() => {
    if (!userLoading && !userId) {
      toast({
        title: "Session Expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      });
      setLocation('/login');
    }
  }, [userLoading, userId, setLocation, toast]);

  // Fetch volunteer profile using intake API which includes all availability fields
  // Use userId from localStorage directly to avoid dependency on currentUser loading first
  const profileQuery = useQuery<any>({
    queryKey: ["/api/intake/volunteer-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(
        `/api/intake/volunteer-profile?userId=${userId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch profile");
      const data = await response.json();
      // API returns { user, volunteerProfile }, extract the volunteerProfile
      const profile = data.volunteerProfile || data;
      // Cache profile data for instant loading on next visit
      if (profile) {
        cacheVolunteerProfile(userId, profile);
      }
      return profile;
    },
    enabled: !!userId,
    initialData: () => getCachedVolunteerProfile(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true,
  });
  const { data: existingProfile, isLoading: loadingProfile } = profileQuery;

  // Fetch list of CSR partners for employer selection
  const { data: csrPartners = [] } = useQuery<any[]>({
    queryKey: ["/api/csr/partners/list"],
    queryFn: async () => {
      const response = await fetch("/api/csr/partners/list");
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Form setup - use defaultValues only, let effects populate from profile
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      professionalTitle: "",
      yearsOfExperience: "",
      linkedinProfile: "",
      languages: [],
      experienceLevel: undefined,
      employerId: "",
      departmentName: "",
      jobTitleAtCompany: "",
      skills: [],
      interests: [],
      location: "",
      sdgGoals: [],
      weeklyHours: 1,
      availability: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferredCommitment: "flexible",
      preferredWorkStyle: "remote",
      personalStatement: "",
      matchingPriorities: {
        skillsMatch: 3,
        causeAlignment: 3,
        timeFlexibility: 3,
        geographicPreference: 3,
        impactPotential: 3,
      },
    },
  });

  // Track if form has been populated to prevent multiple resets
  const formPopulatedRef = useRef(false);
  const lastProfileIdRef = useRef<number | null>(null);

  // Load profile data into form whenever profile data changes or user ID changes
  useEffect(() => {
    // Wait for both user and profile to be loaded
    if (userLoading || loadingProfile) return;
    if (!currentUser?.id) return;

    // Handle both data formats:
    // - Full response from React Query cache: { user, volunteerProfile }
    // - Extracted profile from our queryFn: { id, userId, volunteerName, ... }
    const profileData = existingProfile?.volunteerProfile || existingProfile;

    // Determine if we have existing profile data
    // Must have an id/userId to be considered valid profile data (not just a wrapper object)
    const profileId = profileData?.id || profileData?.userId;
    const hasProfileData = profileData && profileId && Object.keys(profileData).length > 0;

    // Only populate form if we have new profile data we haven't processed yet
    if (hasProfileData && profileId !== lastProfileIdRef.current) {
      lastProfileIdRef.current = profileId;
      formPopulatedRef.current = true;
      // Existing profile - reset form with all profile data
      const resetData = {
        email: currentUser?.email || "",
        name: profileData.volunteerName || currentUser?.displayName || "",
        professionalTitle: profileData.professionalTitle || "",
        yearsOfExperience: profileData.yearsOfExperience || "",
        linkedinProfile: profileData.linkedinProfile || "",
        languages: profileData.languages || [],
        experienceLevel: profileData.experienceLevel as "entry-level" | "intermediate" | "expert" | undefined,
        employerId: profileData.employerId || "",
        departmentName: profileData.departmentName || "",
        jobTitleAtCompany: profileData.jobTitleAtCompany || "",
        skills: parseSkillsFromDb(profileData.skills, profileData.skillRatings as Record<string, number>),
        interests: profileData.interests || [],
        location: profileData.location || "",
        sdgGoals: profileData.preferredSdgs || [],
        weeklyHours: profileData.weeklyAvailability || 1,
        availability: profileData.availability || [],
        timezone:
          profileData.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        preferredCommitment:
          profileData.preferredCommitment || "flexible",
        preferredWorkStyle: profileData.preferredWorkStyle || "remote",
        personalStatement: profileData.personalStatement || "",
        matchingPriorities: profileData.matchingPriorities || {
          skillsMatch: 3,
          causeAlignment: 3,
          timeFlexibility: 3,
          geographicPreference: 3,
          impactPotential: 3,
        },
      };
      form.reset(resetData);
    } else if (!hasProfileData && currentUser?.email && !formPopulatedRef.current) {
      // New profile - initialize with user data only (only if we haven't populated before)
      formPopulatedRef.current = true;
      form.reset({
        email: currentUser?.email || "",
        name: currentUser?.displayName || "",
        professionalTitle: "",
        yearsOfExperience: "",
        linkedinProfile: "",
        languages: [],
        experienceLevel: undefined,
        skills: [],
        interests: [],
        location: "",
        sdgGoals: [],
        weeklyHours: 1,
        availability: [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        preferredCommitment: "flexible",
        preferredWorkStyle: "remote",
        personalStatement: "",
        matchingPriorities: {
          skillsMatch: 3,
          causeAlignment: 3,
          timeFlexibility: 3,
          geographicPreference: 3,
          impactPotential: 3,
        },
      });
    }
  }, [currentUser?.id, currentUser?.email, currentUser?.displayName, existingProfile, loadingProfile, userLoading, form]);

  // Load existing photo URL
  useEffect(() => {
    // Handle both data formats (full response or extracted profile)
    const profile = existingProfile?.volunteerProfile || existingProfile;
    if (profile?.profilePhotoUrl) {
      setProfilePhotoUrl(profile.profilePhotoUrl);
    }
  }, [existingProfile]);

  // Mutations
  const mutationConfig = {
    onSuccess: async (result: any) => {
      const id = currentUser?.id;

      // IMMEDIATELY populate form with saved data to prevent blank form
      const profileData = result.volunteerProfile || result;

      // Directly set form values with saved data - this prevents the form from going blank
      form.reset({
        email: currentUser?.email || "",
        name: profileData.volunteerName || currentUser?.displayName || "",
        professionalTitle: profileData.professionalTitle || "",
        yearsOfExperience: profileData.yearsOfExperience || "",
        linkedinProfile: profileData.linkedinProfile || "",
        languages: profileData.languages || [],
        skills: parseSkillsFromDb(profileData.skills, profileData.skillRatings as Record<string, number>),
        interests: profileData.interests || [],
        location: profileData.location || "",
        sdgGoals: profileData.preferredSdgs || [],
        weeklyHours: profileData.weeklyAvailability || 1,
        availability: profileData.availability || [],
        timezone:
          profileData.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        preferredCommitment: profileData.preferredCommitment || "flexible",
        preferredWorkStyle: profileData.preferredWorkStyle || "remote",
        personalStatement: profileData.personalStatement || "",
        matchingPriorities: profileData.matchingPriorities || {
          skillsMatch: 3,
          causeAlignment: 3,
          timeFlexibility: 3,
          geographicPreference: 3,
          impactPotential: 3,
        },
      });

      // Invalidate related queries in background (non-blocking)
      // These will update the server state but won't interfere with the form
      const logCacheError = (err: unknown) => {
        if (process.env.NODE_ENV === 'development') console.warn('Cache invalidation failed:', err);
      };
      queryClient
        .invalidateQueries({ queryKey: ["/api/intake/volunteer-profile", id] })
        .catch(logCacheError);
      queryClient
        .invalidateQueries({ queryKey: ["/api/volunteers"] })
        .catch(logCacheError);
      queryClient
        .invalidateQueries({ queryKey: ["/api/users/me"] })
        .catch(logCacheError);
      queryClient
        .invalidateQueries({ queryKey: ["/api/dashboard/summary"] })
        .catch(logCacheError);
      queryClient
        .invalidateQueries({ queryKey: ["/api/opportunities/matches"] })
        .catch(logCacheError);

      toast({
        title: `Profile ${existingProfile ? "updated" : "created"}!`,
        description: `Your volunteer profile has been ${existingProfile ? "updated" : "created"} successfully.`,
      });

      // Mark profile as complete - prevents redirect back to settings on future logins
      localStorage.setItem('profileComplete', 'true');
      localStorage.removeItem('isNewSignup');

      // Redirect to volunteer dashboard after successful save
      setTimeout(() => {
        const navigate = (window as any).__wouter_setLocation || (() => window.location.href = '/volunteer-dashboard');
        if (typeof navigate === 'function') {
          navigate('/volunteer-dashboard');
        }
      }, 500);
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

      // Transform form data to match volunteer profile API
      const skillsArray = data.skills.map((s: { name: string; proficiency: number }) => s.name);
      const skillRatingsObj: Record<string, number> = {};
      data.skills.forEach((s: { name: string; proficiency: number }) => {
        skillRatingsObj[s.name] = s.proficiency;
      });

      const profileData = {
        email: data.email,
        volunteerName: data.name,
        skills: skillsArray,
        skillRatings: skillRatingsObj,
        interests: data.interests,
        location: data.location,
        yearsOfExperience: data.yearsOfExperience,
        professionalTitle: data.professionalTitle,
        linkedinProfile: data.linkedinProfile,
        languages: data.languages,
        employerId: data.employerId ? parseInt(data.employerId) : null,
        departmentName: data.departmentName,
        jobTitleAtCompany: data.jobTitleAtCompany,
        preferredSdgs: data.sdgGoals,
        weeklyAvailability: data.weeklyHours,
        availability: data.availability,
        timezone: data.timezone,
        preferredCommitment: data.preferredCommitment,
        preferredWorkStyle: data.preferredWorkStyle,
        personalStatement: data.personalStatement,
        matchingPriorities: data.matchingPriorities,
        experienceLevel: data.experienceLevel,
        profilePhotoUrl: profilePhotoUrl,
        onboardingCompleted: true, // Mark profile as complete when saved
      };

      // Add timeout protection - 15 seconds max
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Profile save timeout. Please try again.")),
          15000,
        ),
      );

      const url = `/api/intake/volunteer-profile?userId=${targetUserId}`;
      const result = (await Promise.race([
        apiRequest("POST", url, profileData),
        timeoutPromise,
      ])) as any;

      return result;
    },
    ...mutationConfig,
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
      // Update localStorage
      localStorage.setItem('userType', data.userType);
      // Clear profileComplete flag - user needs to complete new profile type
      localStorage.removeItem('profileComplete');
      localStorage.setItem('isNewSignup', 'true');

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });

      toast({
        title: "Account Type Updated",
        description: `Your account type has been changed to ${data.userType}. Redirecting...`,
      });

      // Redirect to appropriate settings page
      setTimeout(() => {
        if (data.userType === 'organization') {
          setLocation('/organization-profile-settings');
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

  // Auto-save mutation (silent, no redirect, no toast)
  // Note: profilePhotoUrl is passed as part of the input to avoid stale closure issues
  const autoSaveMutation = useMutation({
    mutationFn: async ({ data, photoUrl }: { data: FormData; photoUrl: string }) => {
      if (!currentUser?.id) throw new Error("User not authenticated");

      const skillsArray = data.skills.map((s: { name: string; proficiency: number }) => s.name);
      const skillRatingsObj: Record<string, number> = {};
      data.skills.forEach((s: { name: string; proficiency: number }) => {
        skillRatingsObj[s.name] = s.proficiency;
      });

      const profileData = {
        email: data.email,
        volunteerName: data.name,
        skills: skillsArray,
        skillRatings: skillRatingsObj,
        interests: data.interests,
        location: data.location,
        yearsOfExperience: data.yearsOfExperience,
        professionalTitle: data.professionalTitle,
        linkedinProfile: data.linkedinProfile,
        languages: data.languages,
        employerId: data.employerId ? parseInt(data.employerId) : null,
        departmentName: data.departmentName,
        jobTitleAtCompany: data.jobTitleAtCompany,
        preferredSdgs: data.sdgGoals,
        weeklyAvailability: data.weeklyHours,
        availability: data.availability,
        timezone: data.timezone,
        preferredCommitment: data.preferredCommitment,
        preferredWorkStyle: data.preferredWorkStyle,
        personalStatement: data.personalStatement,
        matchingPriorities: data.matchingPriorities,
        experienceLevel: data.experienceLevel,
        profilePhotoUrl: photoUrl, // Use passed photoUrl to avoid stale closure
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

    // Check if data actually changed (include profilePhotoUrl in the check)
    const dataWithPhoto = { ...data, profilePhotoUrl };
    const dataString = JSON.stringify(dataWithPhoto);
    if (dataString === lastSavedDataRef.current) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set saving status immediately for feedback
    setAutoSaveStatus('saving');

    // Capture current profilePhotoUrl to avoid stale closure in timeout
    const currentPhotoUrl = profilePhotoUrl;

    // Debounce the actual save by 2 seconds
    autoSaveTimeoutRef.current = setTimeout(() => {
      lastSavedDataRef.current = dataString;
      // Pass both form data and photoUrl to avoid stale closure issues
      autoSaveMutation.mutate({ data, photoUrl: currentPhotoUrl });
    }, 2000);
  }, [currentUser?.id, autoSaveMutation, profilePhotoUrl]);

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

  // Watch form changes and trigger auto-save
  const formValues = form.watch();
  useEffect(() => {
    // Skip during initial load or while loading profile
    if (loadingProfile || isInitialLoadRef.current) return;

    // Validate form has minimum required data before auto-saving
    if (formValues.name && formValues.name.length > 0) {
      performAutoSave(formValues as FormData);
    }
  }, [formValues, loadingProfile, performAutoSave, profilePhotoUrl]); // Also trigger when profilePhotoUrl changes

  // Immediate save when profile photo changes (bypass debounce for better UX)
  const previousPhotoRef = useRef<string | null>(null);
  useEffect(() => {
    // Skip during initial load
    if (loadingProfile || isInitialLoadRef.current) return;

    // Only trigger if photo actually changed (not initial load)
    if (previousPhotoRef.current !== null && previousPhotoRef.current !== profilePhotoUrl) {
      const formValues = form.getValues();
      if (formValues.name && formValues.name.length > 0) {
        // Clear any pending debounced save
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        // Immediately save with the new photo URL
        setAutoSaveStatus('saving');
        const dataWithPhoto = { ...formValues, profilePhotoUrl };
        lastSavedDataRef.current = JSON.stringify(dataWithPhoto);
        autoSaveMutation.mutate({ data: formValues as FormData, photoUrl: profilePhotoUrl });
      }
    }
    previousPhotoRef.current = profilePhotoUrl;
  }, [profilePhotoUrl, loadingProfile, form, autoSaveMutation]);

  // Mark initial load as complete after profile loads
  useEffect(() => {
    if (!loadingProfile && existingProfile !== undefined) {
      // Small delay to ensure form reset has completed
      setTimeout(() => {
        isInitialLoadRef.current = false;
        // Set initial data reference
        lastSavedDataRef.current = JSON.stringify(form.getValues());
      }, 500);
    }
  }, [loadingProfile, existingProfile, form]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const onSubmit = async (data: FormData) => {
    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    // Validate weeklyHours is set
    if (!data.weeklyHours || data.weeklyHours <= 0) {
      toast({
        title: "Invalid Weekly Hours",
        description: "Weekly Hours Available must be greater than 0",
        variant: "destructive",
      });
      return;
    }

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  const isSubmitting = profileMutation.isPending;

  return (
    <div className={`min-h-screen pb-24 ${isVolunteerMobile ? 'bg-[#f8f7f4] pt-14' : 'bg-[#f8f9fa]'}`}>
      {/* Privacy Consent Dialog */}
      <PrivacyConsentDialog
        open={showConsentDialog}
        onConsentGiven={handleConsentGiven}
        onDeclined={handleConsentDeclined}
        userId={currentUser?.id}
      />

      {/* PWA Header for mobile volunteer users - consistent with dashboard */}
      {isVolunteerMobile && <PWAHeader />}

      {/* Volunteer Desktop Navigation */}
      {!isVolunteerMobile && <VolunteerNav />}

      <div className={isVolunteerMobile ? 'px-4 py-4 max-w-4xl mx-auto' : ''} style={!isVolunteerMobile ? { maxWidth: '1280px', margin: '0 auto', padding: '24px' } : undefined}>
        {/* Page Header - Mobile optimized */}
        <div className={`${isVolunteerMobile ? 'mb-4' : 'mb-8'}`}>
          <div className={`flex items-center justify-between ${isVolunteerMobile ? '' : 'flex-col text-center'}`}>
            <h1 className={`font-bold mb-2 ${isVolunteerMobile ? 'text-xl text-slate-800' : 'text-3xl'}`}>
              {isVolunteerMobile ? 'Profile Settings' : 'Volunteer Profile Settings'}
            </h1>
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
          {!isVolunteerMobile && (
            <p className="text-muted-foreground">
              Create or update your volunteer profile to get matched with
              organizations that align with your skills, interests, and goals.
              <span className="block mt-1 text-sm text-blue-600 dark:text-blue-400">
                Your changes are automatically saved as you type.
              </span>
            </p>
          )}
        </div>

      <Card className={isVolunteerMobile ? 'border-0 shadow-sm rounded-2xl' : ''}>
        <CardHeader className={isVolunteerMobile ? 'pb-3' : 'text-center'}>
          <CardTitle className={`flex items-center gap-2 ${isVolunteerMobile ? 'text-base' : 'justify-center'}`}>
            <User className="h-5 w-5" />
            {existingProfile ? "Update Your Profile" : "Create Your Profile"}
          </CardTitle>
          {!isVolunteerMobile && (
            <CardDescription>
              This information will be used to match you with organizations and
              opportunities
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <PersonalInfoSection
                form={form}
                onPhotoChange={setProfilePhotoUrl}
                currentPhotoUrl={profilePhotoUrl}
                userId={currentUser?.id ? String(currentUser.id) : ""}
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
              
              {/* Employer Linking - Optional for employees of CSR partners */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Corporate Employer Link (Optional)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  If you work for a company with a CSR program, link your account to track your impact through their initiatives.
                </p>
                
                <FormField
                  control={form.control}
                  name="employerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company/Employer</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-employer">
                            <SelectValue placeholder="Select your employer company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {csrPartners.map((partner: any) => (
                            <SelectItem key={partner.id} value={partner.id.toString()}>
                              {partner.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select your employer to link your volunteer hours to their CSR program
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {form.watch("employerId") && (
                  <>
                    <FormField
                      control={form.control}
                      name="departmentName"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Department (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., Engineering, HR, Marketing"
                              data-testid="input-department"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="jobTitleAtCompany"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Job Title (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., Senior Software Engineer"
                              data-testid="input-job-title"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>

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
                <OnboardingTrigger variant="outline" showText={true} />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Account Type Section */}
      <Card className={`mt-6 border-blue-200 dark:border-blue-800 ${isVolunteerMobile ? 'border-0 shadow-sm rounded-2xl' : ''}`}>
        <CardHeader className={isVolunteerMobile ? 'pb-2' : ''}>
          <CardTitle className={`flex items-center gap-2 text-blue-600 dark:text-blue-400 ${isVolunteerMobile ? 'text-base' : ''}`}>
            <Sliders className="h-5 w-5" />
            Account Type
          </CardTitle>
          {!isVolunteerMobile && (
            <CardDescription>
              Change your account type if you registered incorrectly
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className={`flex flex-col gap-4 ${isVolunteerMobile ? 'p-3' : 'p-4'} bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800`}>
            <div>
              <h4 className={`font-medium text-gray-900 dark:text-white ${isVolunteerMobile ? 'text-sm' : ''}`}>
                Current Type: <span className="text-blue-600 dark:text-blue-400 capitalize">{currentUser?.userType || 'volunteer'}</span>
              </h4>
              <p className={`text-gray-600 dark:text-gray-400 ${isVolunteerMobile ? 'text-xs' : 'text-sm'} mt-1`}>
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

      {/* Account Actions Section */}
      <Card className={`mt-6 border-red-200 dark:border-red-800 ${isVolunteerMobile ? 'border-0 shadow-sm rounded-2xl' : ''}`}>
        <CardHeader className={isVolunteerMobile ? 'pb-2' : ''}>
          <CardTitle className={`flex items-center gap-2 text-red-600 dark:text-red-400 ${isVolunteerMobile ? 'text-base' : ''}`}>
            <LogOut className="h-5 w-5" />
            Account Actions
          </CardTitle>
          {!isVolunteerMobile && (
            <CardDescription>
              Sign out of your volunteer account
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isVolunteerMobile ? 'p-3' : 'p-4'} bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800`}>
            <div>
              <h4 className={`font-medium text-gray-900 dark:text-white ${isVolunteerMobile ? 'text-sm' : ''}`}>Sign Out</h4>
              <p className={`text-gray-600 dark:text-gray-400 ${isVolunteerMobile ? 'text-xs' : 'text-sm'}`}>
                End your current session
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleLogout}
              className={`w-full sm:w-auto flex items-center gap-2 ${isVolunteerMobile ? 'text-sm py-2' : ''}`}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      </div>

      {/* Bottom Navigation */}
      {isVolunteerMobile ? (
        <VolunteerPWANav userId={userId || undefined} activeTab="more" />
      ) : (
        <WebBottomNav activeTab="profile" />
      )}
    </div>
  );
}
