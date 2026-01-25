import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { Eye, EyeOff, Loader2 } from "lucide-react";

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
  "Colombia", "Argentina", "Chile", "Peru", "Haiti", "Dominican Republic", "Jamaica",
  "Trinidad and Tobago", "Ghana", "Ethiopia", "Tanzania", "Uganda", "Rwanda", "Other"
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Sao_Paulo", label: "Brasilia Time (BRT)" },
  { value: "America/Port-au-Prince", label: "Haiti Time" },
  { value: "Europe/London", label: "GMT - London" },
  { value: "Europe/Paris", label: "CET - Paris/Berlin" },
  { value: "Africa/Cairo", label: "EET - Cairo" },
  { value: "Africa/Johannesburg", label: "SAST - South Africa" },
  { value: "Africa/Nairobi", label: "EAT - East Africa" },
  { value: "Africa/Lagos", label: "WAT - West Africa" },
  { value: "Asia/Dubai", label: "GST - Dubai/UAE" },
  { value: "Asia/Riyadh", label: "AST - Riyadh/Kuwait" },
  { value: "Asia/Kolkata", label: "IST - India" },
  { value: "Asia/Singapore", label: "SGT - Singapore" },
  { value: "Asia/Hong_Kong", label: "HKT - Hong Kong" },
  { value: "Asia/Tokyo", label: "JST - Tokyo" },
  { value: "Asia/Manila", label: "PHT - Philippines" },
  { value: "Australia/Sydney", label: "AET - Sydney" },
  { value: "Pacific/Auckland", label: "NZT - Auckland" },
];

const OUTCOME_TYPES = [
  { value: "water_filters_installed", label: "Water filters installed" },
  { value: "wells_constructed", label: "Wells constructed" },
  { value: "households_served", label: "Households served" },
  { value: "training_sessions", label: "Training sessions held" },
  { value: "trees_planted", label: "Trees planted" },
  { value: "students_tutored", label: "Students tutored" },
  { value: "meals_served", label: "Meals served" },
  { value: "medical_consultations", label: "Medical consultations" },
  { value: "homes_built", label: "Homes built/repaired" },
  { value: "animals_rescued", label: "Animals rescued" },
  { value: "items_donated", label: "Items donated/distributed" },
  { value: "community_events", label: "Community events organized" },
];

const AVAILABILITY_OPTIONS = [
  { value: "weekday_morning", label: "Weekday Mornings" },
  { value: "weekday_afternoon", label: "Weekday Afternoons" },
  { value: "weekday_evening", label: "Weekday Evenings" },
  { value: "weekend_morning", label: "Weekend Mornings" },
  { value: "weekend_afternoon", label: "Weekend Afternoons" },
  { value: "weekend_evening", label: "Weekend Evenings" },
];

// ============================================================================
// SCHEMA
// ============================================================================

const ngoSchema = z.object({
  // Organization Info
  organizationName: z.string().min(2, "Organization name is required"),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  sdgFocus: z.number().min(1, "Primary SDG focus is required"),
  // Contact Info
  contactName: z.string().min(2, "Your name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Outcomes tracked
  outcomeTypes: z.array(z.string()).min(1, "Select at least one outcome type"),
  // Terms
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms"),
  // Matching fields
  sdgGoals: z.array(z.number()).min(1, "Select at least one SDG"),
  timezone: z.string().min(1, "Timezone is required"),
  availability: z.array(z.string()).min(1, "Select when volunteers can work"),
});

type NgoFormData = z.infer<typeof ngoSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function OrganizationIntakeSimple() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<NgoFormData>({
    resolver: zodResolver(ngoSchema),
    defaultValues: {
      organizationName: "",
      country: "",
      city: "",
      sdgFocus: 0,
      contactName: "",
      email: "",
      password: "",
      outcomeTypes: [],
      termsAccepted: false,
      sdgGoals: [],
      timezone: "",
      availability: [],
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const selectedSdgs = watch("sdgGoals") || [];
  const selectedOutcomes = watch("outcomeTypes") || [];
  const selectedAvailability = watch("availability") || [];

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: NgoFormData) => {
      const response = await apiRequest("POST", "/api/auth/register", {
        ...data,
        userType: "organization",
        name: data.organizationName,
      });
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("currentUserId", data.userId || data.id);
      localStorage.setItem("userType", "organization");
      localStorage.setItem("profileComplete", "true");
      localStorage.removeItem("isNewSignup");

      toast({
        title: "Welcome to Synerxus!",
        description: "Your organization has been registered. Start verifying impact!",
      });
      navigate("/organization-dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NgoFormData) => {
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

  const toggleOutcome = (outcome: string) => {
    const current = selectedOutcomes;
    if (current.includes(outcome)) {
      setValue("outcomeTypes", current.filter(o => o !== outcome));
    } else {
      setValue("outcomeTypes", [...current, outcome]);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Logo size="md" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Register Your Organization</h1>
          <p className="text-gray-500 mt-1">Set up in under 2 minutes</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* Organization Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="organizationName">Organization Name *</Label>
                  <Input
                    id="organizationName"
                    placeholder="Clean Water Haiti"
                    {...register("organizationName")}
                    className="mt-1"
                  />
                  {errors.organizationName && <p className="text-sm text-red-500 mt-1">{errors.organizationName.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Country *</Label>
                    <Select onValueChange={(v) => setValue("country", v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select" />
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
                      placeholder="Port-au-Prince"
                      {...register("city")}
                      className="mt-1"
                    />
                    {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>}
                  </div>
                </div>

                <div>
                  <Label>Primary SDG Focus *</Label>
                  <Select onValueChange={(v) => setValue("sdgFocus", parseInt(v))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select primary focus area" />
                    </SelectTrigger>
                    <SelectContent>
                      {SDG_OPTIONS.map(sdg => (
                        <SelectItem key={sdg.value} value={sdg.value.toString()}>
                          SDG {sdg.value} - {sdg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.sdgFocus && <p className="text-sm text-red-500 mt-1">{errors.sdgFocus.message}</p>}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">YOUR CONTACT INFO</h3>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contactName">Your Name *</Label>
                  <Input
                    id="contactName"
                    placeholder="Marie Dubois"
                    {...register("contactName")}
                    className="mt-1"
                  />
                  {errors.contactName && <p className="text-sm text-red-500 mt-1">{errors.contactName.message}</p>}
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="marie@cleanwaterhaiti.org"
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
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">OUTCOMES YOU TRACK</h3>
                <p className="text-xs text-gray-500 mb-3">What volunteers help with (select all that apply)</p>
              </div>

              {/* Outcome Types */}
              <div className="grid grid-cols-2 gap-2">
                {OUTCOME_TYPES.map(outcome => (
                  <button
                    key={outcome.value}
                    type="button"
                    onClick={() => toggleOutcome(outcome.value)}
                    className={`p-2 rounded-lg border text-xs font-medium text-left transition-all ${
                      selectedOutcomes.includes(outcome.value)
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {selectedOutcomes.includes(outcome.value) ? "✓ " : ""}{outcome.label}
                  </button>
                ))}
              </div>
              {errors.outcomeTypes && <p className="text-sm text-red-500 mt-1">{errors.outcomeTypes.message}</p>}

              {/* Divider */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">FOR VOLUNTEER MATCHING</h3>
              </div>

              {/* Timezone */}
              <div>
                <Label>Timezone *</Label>
                <Select onValueChange={(v) => setValue("timezone", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.timezone && <p className="text-sm text-red-500 mt-1">{errors.timezone.message}</p>}
              </div>

              {/* All SDG Goals */}
              <div>
                <Label>All SDG Areas You Address (Select up to 5)</Label>
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
                <Label>When Can Volunteers Work? *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {AVAILABILITY_OPTIONS.map(slot => (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => toggleAvailability(slot.value)}
                      className={`p-3 rounded-lg border text-xs font-medium text-left transition-all ${
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
                  I agree to the <a href="/terms" className="text-indigo-600 underline">NGO Partner Terms</a>
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
                    Registering...
                  </>
                ) : (
                  "Register Organization"
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
