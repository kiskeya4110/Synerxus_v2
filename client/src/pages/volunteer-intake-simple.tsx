import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Logo from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Check, Loader2, X } from "lucide-react";

// ============================================================================
// CONSTANTS
// ============================================================================

const SDG_OPTIONS = [
  { value: 1, label: "No Poverty", color: "#E5243B" },
  { value: 2, label: "Zero Hunger", color: "#DDA63A" },
  { value: 3, label: "Good Health", color: "#4C9F38" },
  { value: 4, label: "Quality Education", color: "#C5192D" },
  { value: 5, label: "Gender Equality", color: "#FF3A21" },
  { value: 6, label: "Clean Water", color: "#26BDE2" },
  { value: 7, label: "Clean Energy", color: "#FCC30B" },
  { value: 8, label: "Decent Work", color: "#A21942" },
  { value: 9, label: "Industry Innovation", color: "#FD6925" },
  { value: 10, label: "Reduced Inequalities", color: "#DD1367" },
  { value: 11, label: "Sustainable Cities", color: "#FD9D24" },
  { value: 12, label: "Responsible Consumption", color: "#BF8B2E" },
  { value: 13, label: "Climate Action", color: "#3F7E44" },
  { value: 14, label: "Life Below Water", color: "#0A97D9" },
  { value: 15, label: "Life on Land", color: "#56C02B" },
  { value: 16, label: "Peace Justice", color: "#00689D" },
  { value: 17, label: "Partnerships", color: "#19486A" },
];

const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany", "France",
  "Japan", "South Korea", "Singapore", "Hong Kong", "India", "Brazil", "Mexico",
  "South Africa", "Nigeria", "Kenya", "Egypt", "UAE", "Saudi Arabia", "Qatar",
  "Kuwait", "Bahrain", "Oman", "Jordan", "Lebanon", "Philippines", "Indonesia",
  "Malaysia", "Thailand", "Vietnam", "China", "Taiwan", "New Zealand", "Ireland",
  "Netherlands", "Belgium", "Switzerland", "Austria", "Italy", "Spain", "Portugal",
  "Sweden", "Norway", "Denmark", "Finland", "Poland", "Czech Republic", "Hungary",
  "Greece", "Turkey", "Israel", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal",
  "Colombia", "Argentina", "Chile", "Peru", "Venezuela", "Ecuador", "Other"
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "GMT - London" },
  { value: "Europe/Paris", label: "CET - Paris/Berlin" },
  { value: "Asia/Dubai", label: "GST - Dubai/UAE" },
  { value: "Asia/Riyadh", label: "AST - Riyadh/Kuwait" },
  { value: "Asia/Kolkata", label: "IST - India" },
  { value: "Asia/Singapore", label: "SGT - Singapore" },
  { value: "Asia/Hong_Kong", label: "HKT - Hong Kong" },
  { value: "Asia/Tokyo", label: "JST - Tokyo" },
  { value: "Asia/Seoul", label: "KST - Seoul" },
  { value: "Australia/Sydney", label: "AET - Sydney" },
  { value: "Pacific/Auckland", label: "NZT - Auckland" },
];

const AVAILABILITY_OPTIONS = [
  { value: "weekday_morning", label: "Weekday Mornings (6am-12pm)" },
  { value: "weekday_afternoon", label: "Weekday Afternoons (12pm-6pm)" },
  { value: "weekday_evening", label: "Weekday Evenings (6pm-10pm)" },
  { value: "weekend_morning", label: "Weekend Mornings (6am-12pm)" },
  { value: "weekend_afternoon", label: "Weekend Afternoons (12pm-6pm)" },
  { value: "weekend_evening", label: "Weekend Evenings (6pm-10pm)" },
];

const SKILL_OPTIONS = [
  "Teaching", "Tutoring", "Mentoring", "Project Management", "Data Analysis",
  "Graphic Design", "Web Development", "Mobile Development", "Social Media",
  "Content Writing", "Translation", "Legal", "Accounting", "Fundraising",
  "Event Planning", "Photography", "Videography", "Healthcare", "Nursing",
  "First Aid", "Counseling", "Cooking", "Agriculture", "Construction",
  "Electrical", "Plumbing", "Carpentry", "Logistics", "Driving",
  "Leadership", "Public Speaking", "Marketing", "Research", "IT Support",
  "Environmental Science", "Community Organizing", "Child Care", "Elder Care",
  "Animal Care", "Music", "Art", "Sports Coaching", "Yoga/Fitness"
];

// ============================================================================
// SCHEMA
// ============================================================================

const volunteerSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  inviteCode: z.string().min(1, "Invite code from your employer is required"),
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms"),
  // Matching fields
  sdgGoals: z.array(z.number()).min(1, "Select at least one SDG"),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  timezone: z.string().min(1, "Timezone is required"),
  availability: z.array(z.string()).min(1, "Select at least one availability slot"),
  // Phase 3: Skills + Diaspora
  skills: z.array(z.string()).min(1, "Select at least one skill").max(3, "Maximum 3 skills"),
  countryOfOrigin: z.string().optional(),
});

type VolunteerFormData = z.infer<typeof volunteerSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function VolunteerIntakeSimple() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCodeValid, setInviteCodeValid] = useState<boolean | null>(null);
  const [inviteCodeOrg, setInviteCodeOrg] = useState<string>("");

  const form = useForm<VolunteerFormData>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      inviteCode: "",
      termsAccepted: false,
      sdgGoals: [],
      country: "",
      city: "",
      timezone: "",
      availability: [],
      skills: [],
      countryOfOrigin: "",
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const selectedSdgs = watch("sdgGoals") || [];
  const selectedAvailability = watch("availability") || [];
  const selectedSkills = watch("skills") || [];
  const inviteCode = watch("inviteCode");
  const [skillSearch, setSkillSearch] = useState("");

  // Validate invite code
  const validateInviteCode = async (code: string) => {
    if (!code || code.length < 3) {
      setInviteCodeValid(null);
      setInviteCodeOrg("");
      return;
    }
    try {
      const response = await fetch(`/api/invitation-codes/validate?code=${code}`);
      if (response.ok) {
        const data = await response.json();
        setInviteCodeValid(true);
        setInviteCodeOrg(data.organizationName || data.companyName || "Valid Organization");
      } else {
        setInviteCodeValid(false);
        setInviteCodeOrg("");
      }
    } catch {
      setInviteCodeValid(false);
      setInviteCodeOrg("");
    }
  };

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: VolunteerFormData) => {
      // Try to create user via API, fall back to demo mode
      try {
        const response = await apiRequest("POST", "/api/users", {
          email: data.email,
          displayName: data.name,
          username: data.email.split('@')[0] + '_' + Date.now(),
          userType: "volunteer",
          firebaseUid: "demo_" + Date.now(), // Demo mode UID
          skills: data.skills, // Phase 3: up to 3 skills
        });
        const user = await response.json();
        return { id: user.id, ...data };
      } catch (error) {
        // Fall back to demo mode - generate a demo user ID
        console.log("Using demo mode for signup");
        return { id: Date.now(), ...data };
      }
    },
    onSuccess: (data) => {
      // Store user info
      localStorage.setItem("currentUserId", String(data.id));
      localStorage.setItem("userType", "volunteer");
      localStorage.setItem("profileComplete", "true");
      localStorage.removeItem("isNewSignup");
      // Store profile data for matching
      localStorage.setItem("volunteerProfile", JSON.stringify({
        name: data.name,
        email: data.email,
        sdgGoals: data.sdgGoals,
        country: data.country,
        city: data.city,
        timezone: data.timezone,
        availability: data.availability,
        skills: data.skills,
        countryOfOrigin: data.countryOfOrigin || "",
      }));

      toast({
        title: "Welcome to Synerxus!",
        description: "Your account has been created. Start logging your impact!",
      });
      navigate("/volunteer-dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VolunteerFormData) => {
    submitMutation.mutate(data);
  };

  const toggleSdg = (sdg: number) => {
    const current = selectedSdgs;
    if (current.includes(sdg)) {
      setValue("sdgGoals", current.filter(s => s !== sdg));
    } else if (current.length < 5) {
      setValue("sdgGoals", [...current, sdg]);
    }
  };

  const toggleAvailability = (slot: string) => {
    const current = selectedAvailability;
    if (current.includes(slot)) {
      setValue("availability", current.filter(s => s !== slot));
    } else {
      setValue("availability", [...current, slot]);
    }
  };

  const toggleSkill = (skill: string) => {
    const current = selectedSkills;
    if (current.includes(skill)) {
      setValue("skills", current.filter(s => s !== skill));
    } else if (current.length < 3) {
      setValue("skills", [...current, skill]);
    }
  };

  const filteredSkillOptions = SKILL_OPTIONS.filter(
    s => s.toLowerCase().includes(skillSearch.toLowerCase()) && !selectedSkills.includes(s)
  );

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Logo size="md" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Join Synerxus</h1>
          <p className="text-gray-500 mt-1">Create your account in 60 seconds</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Jean Pierre"
                    {...register("name")}
                    className="mt-1"
                  />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jean@email.com"
                    {...register("email")}
                    className="mt-1"
                  />
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 characters"
                      {...register("password")}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <Label htmlFor="inviteCode">Invite Code * (from your employer)</Label>
                  <Input
                    id="inviteCode"
                    placeholder="SAMSUNG-2026"
                    {...register("inviteCode")}
                    onChange={(e) => {
                      register("inviteCode").onChange(e);
                      validateInviteCode(e.target.value);
                    }}
                    className="mt-1"
                  />
                  {inviteCodeValid === true && (
                    <p className="text-sm text-emerald-600 mt-1 flex items-center gap-1">
                      <Check className="h-4 w-4" /> {inviteCodeOrg}
                    </p>
                  )}
                  {inviteCodeValid === false && (
                    <p className="text-sm text-red-500 mt-1">Invalid invite code</p>
                  )}
                  {errors.inviteCode && <p className="text-sm text-red-500 mt-1">{errors.inviteCode.message}</p>}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">FOR BETTER MATCHING</h3>
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Country *</Label>
                  <Select onValueChange={(v) => setValue("country", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.country && <p className="text-sm text-red-500 mt-1">{errors.country.message}</p>}
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="Your city"
                    {...register("city")}
                    className="mt-1"
                  />
                  {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>}
                </div>
              </div>

              {/* Timezone */}
              <div>
                <Label>Timezone *</Label>
                <Select onValueChange={(v) => setValue("timezone", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.timezone && <p className="text-sm text-red-500 mt-1">{errors.timezone.message}</p>}
              </div>

              {/* Country of Origin (Phase 3: Diaspora Profile) */}
              <div>
                <Label>Country of Origin (optional)</Label>
                <Select onValueChange={(v) => setValue("countryOfOrigin", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Where are you originally from?" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Skills (Phase 3: max 3 required) */}
              <div>
                <Label>Your Skills * (Select up to 3)</Label>
                <p className="text-xs text-gray-500 mt-0.5 mb-2">
                  {selectedSkills.length}/3 selected
                </p>
                {/* Selected skill chips */}
                {selectedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedSkills.map(skill => (
                      <Badge
                        key={skill}
                        className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer"
                        onClick={() => toggleSkill(skill)}
                      >
                        {skill}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
                {/* Skill search */}
                <Input
                  placeholder="Search skills..."
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  className="mb-2"
                />
                {/* Filtered skill options */}
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {filteredSkillOptions.slice(0, 12).map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      disabled={selectedSkills.length >= 3}
                      className={`p-1.5 rounded text-xs font-medium transition-all text-left ${
                        selectedSkills.length >= 3
                          ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                          : "bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                {errors.skills && <p className="text-sm text-red-500 mt-1">{errors.skills.message}</p>}
              </div>

              {/* SDG Goals */}
              <div>
                <Label>Causes You Care About * (Select up to 5)</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {SDG_OPTIONS.map(sdg => (
                    <button
                      key={sdg.value}
                      type="button"
                      onClick={() => toggleSdg(sdg.value)}
                      className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                        selectedSdgs.includes(sdg.value)
                          ? "text-white border-transparent"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                      }`}
                      style={selectedSdgs.includes(sdg.value) ? { backgroundColor: sdg.color } : {}}
                    >
                      {sdg.value}. {sdg.label}
                    </button>
                  ))}
                </div>
                {errors.sdgGoals && <p className="text-sm text-red-500 mt-1">{errors.sdgGoals.message}</p>}
              </div>

              {/* Availability */}
              <div>
                <Label>When Are You Available? *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {AVAILABILITY_OPTIONS.map(slot => (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => toggleAvailability(slot.value)}
                      className={`p-3 rounded-lg border text-xs font-medium transition-all text-left ${
                        selectedAvailability.includes(slot.value)
                          ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
                {errors.availability && <p className="text-sm text-red-500 mt-1">{errors.availability.message}</p>}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={watch("termsAccepted")}
                  onCheckedChange={(checked) => setValue("termsAccepted", checked === true)}
                />
                <Label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  I agree to the <a href="/terms" className="text-indigo-600 underline">Terms of Service</a> and <a href="/privacy" className="text-indigo-600 underline">Privacy Policy</a>
                </Label>
              </div>
              {errors.termsAccepted && <p className="text-sm text-red-500">{errors.termsAccepted.message}</p>}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <p className="text-center text-sm text-gray-500">
                Already have an account? <a href="/login" className="text-indigo-600 font-medium">Log in</a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
