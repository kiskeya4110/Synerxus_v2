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
import { useAuth } from "@/hooks/use-auth";
import Logo from "@/components/ui/logo";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { getDashboardRoute } from "@/lib/auth-schemas";

// ============================================================================
// CONSTANTS - Simplified for MVP
// ============================================================================

const COUNTRIES = [
  "Haiti", "Zambia", "Philippines", "Zimbabwe", "Mexico",
  "Kenya", "Uganda", "Tanzania", "Ethiopia", "Nigeria",
  "Ghana", "South Africa", "India", "Bangladesh", "Nepal",
  "Cambodia", "Vietnam", "Indonesia", "Peru", "Colombia",
  "Guatemala", "Honduras", "Nicaragua", "Dominican Republic",
  "Jamaica", "Other"
];

const SDG_OPTIONS = [
  { value: 1, label: "No Poverty", color: "#E5243B" },
  { value: 2, label: "Zero Hunger", color: "#DDA63A" },
  { value: 3, label: "Good Health & Well-being", color: "#4C9F38" },
  { value: 4, label: "Quality Education", color: "#C5192D" },
  { value: 5, label: "Gender Equality", color: "#FF3A21" },
  { value: 6, label: "Clean Water & Sanitation", color: "#26BDE2" },
  { value: 7, label: "Affordable & Clean Energy", color: "#FCC30B" },
  { value: 8, label: "Decent Work & Economic Growth", color: "#A21942" },
  { value: 9, label: "Industry, Innovation & Infrastructure", color: "#FD6925" },
  { value: 10, label: "Reduced Inequalities", color: "#DD1367" },
  { value: 11, label: "Sustainable Cities & Communities", color: "#FD9D24" },
  { value: 12, label: "Responsible Consumption & Production", color: "#BF8B2E" },
  { value: 13, label: "Climate Action", color: "#3F7E44" },
  { value: 14, label: "Life Below Water", color: "#0A97D9" },
  { value: 15, label: "Life on Land", color: "#56C02B" },
  { value: 16, label: "Peace, Justice & Strong Institutions", color: "#00689D" },
  { value: 17, label: "Partnerships for the Goals", color: "#19486A" },
];

const SKILL_OPTIONS = [
  "Engineering",
  "Medical/Healthcare",
  "Education/Training",
  "Finance/Accounting",
  "Water/Sanitation",
  "Agriculture",
  "Legal",
  "IT/Technology",
  "Marketing/Comms",
  "Project Management",
];

const OUTCOME_TYPES = [
  { value: "water_filters", label: "Water filters installed" },
  { value: "wells", label: "Wells constructed" },
  { value: "households", label: "Households served" },
  { value: "training", label: "Training sessions held" },
  { value: "trees", label: "Trees planted" },
  { value: "students", label: "Students tutored" },
  { value: "medical", label: "Medical consultations" },
  { value: "solar", label: "Solar lamps distributed" },
  { value: "custom", label: "Custom (define later)" },
];

// ============================================================================
// SCHEMA - MVP fields only
// ============================================================================

const ngoSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required"),
  country: z.string().min(1, "Country of operation is required"),
  sdgFocus: z.array(z.number()).min(1, "Select at least one SDG").max(3, "Maximum 3 SDGs"),
  skillsNeeded: z.array(z.string()).min(1, "Select at least one skill needed"),
  outcomeTypes: z.array(z.string()).min(1, "Select at least one outcome type"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number"),
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms"),
});

type NgoFormData = z.infer<typeof ngoSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function OrganizationIntakeSimple() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { signUp, signInWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<NgoFormData>({
    resolver: zodResolver(ngoSchema),
    defaultValues: {
      organizationName: "",
      country: "",
      sdgFocus: [],
      skillsNeeded: [],
      outcomeTypes: [],
      contactName: "",
      email: "",
      password: "",
      termsAccepted: false,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const selectedSdgs = watch("sdgFocus") || [];
  const selectedSkills = watch("skillsNeeded") || [];
  const selectedOutcomes = watch("outcomeTypes") || [];

  // Handle Google sign-up
  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle("organization");
      if (result) {
        localStorage.setItem("profileComplete", "true");
        toast({
          title: "Welcome to Synerxus!",
          description: "Your organization has been registered.",
        });
        navigate(getDashboardRoute());
      }
    } catch (error) {
      // Error handling is done in useAuth hook
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: NgoFormData) => {
      // Step 1: Create Firebase account and sync with backend
      const firebaseUser = await signUp(data.email, data.password, "organization", data.organizationName);
      if (!firebaseUser) {
        throw new Error("Failed to create account");
      }

      // Step 2: Save organization profile to backend
      try {
        const idToken = await firebaseUser.getIdToken();
        const userId = localStorage.getItem("currentUserId");

        const profileResponse = await fetch("/api/intake/organization-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
            ...(userId && { "X-User-Id": userId }),
          },
          body: JSON.stringify({
            organizationName: data.organizationName,
            organizationLocation: data.country,
            primarySdgs: data.sdgFocus,
            volunteerNeeds: data.skillsNeeded,
            outcomeTypes: data.outcomeTypes,
            contactName: data.contactName,
            onboardingCompleted: true,
          }),
        });

        if (!profileResponse.ok) {
          console.error("Failed to save profile:", await profileResponse.text());
          // Don't throw - account is created, profile can be completed later
        }
      } catch (profileError) {
        console.error("Profile save error:", profileError);
        // Don't throw - account is created, profile can be completed later
      }

      return { firebaseUser, ...data };
    },
    onSuccess: () => {
      localStorage.setItem("profileComplete", "true");
      localStorage.removeItem("isNewSignup");

      toast({
        title: "Account Created Successfully!",
        description: "Welcome to Synerxus! Redirecting to your dashboard...",
      });

      // Use window.location for reliable redirect after auth state change
      setTimeout(() => {
        window.location.href = getDashboardRoute();
      }, 500);
    },
    onError: (error: any) => {
      if (!error?.code?.startsWith("auth/")) {
        toast({
          title: "Registration Failed",
          description: error.message || "Please check your information and try again.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: NgoFormData) => {
    submitMutation.mutate(data);
  };

  const toggleSdg = (sdg: number) => {
    const current = selectedSdgs;
    if (current.includes(sdg)) {
      setValue("sdgFocus", current.filter(s => s !== sdg));
    } else if (current.length < 3) {
      setValue("sdgFocus", [...current, sdg]);
    }
  };

  const toggleSkill = (skill: string) => {
    const current = selectedSkills;
    if (current.includes(skill)) {
      setValue("skillsNeeded", current.filter(s => s !== skill));
    } else {
      setValue("skillsNeeded", [...current, skill]);
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

  const isLoading = submitMutation.isPending || isGoogleLoading;

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Logo size="md" className="mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Register Your Organization</h1>
          <p className="text-gray-500 mt-1">Start verifying impact in ~2 minutes</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Organization Name */}
              <div>
                <Label htmlFor="organizationName">Organization Name *</Label>
                <Input
                  id="organizationName"
                  placeholder="Clean Water Haiti"
                  {...register("organizationName")}
                  className="mt-1"
                  disabled={isLoading}
                />
                {errors.organizationName && <p className="text-sm text-red-500 mt-1">{errors.organizationName.message}</p>}
              </div>

              {/* Country of Operation */}
              <div>
                <Label>Country of Operation *</Label>
                <Select onValueChange={(v) => setValue("country", v)} disabled={isLoading}>
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

              {/* SDG Focus Areas */}
              <div>
                <Label>SDG Focus Areas * (Select 1-3)</Label>
                <p className="text-xs text-gray-500 mb-2">{selectedSdgs.length}/3 selected</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                  {SDG_OPTIONS.map(sdg => (
                    <button
                      key={sdg.value}
                      type="button"
                      onClick={() => toggleSdg(sdg.value)}
                      disabled={isLoading || (selectedSdgs.length >= 3 && !selectedSdgs.includes(sdg.value))}
                      className={`p-2 rounded-lg border text-xs font-medium text-left transition-all ${
                        selectedSdgs.includes(sdg.value)
                          ? "text-white border-transparent"
                          : selectedSdgs.length >= 3
                            ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                      }`}
                      style={selectedSdgs.includes(sdg.value) ? { backgroundColor: sdg.color } : {}}
                    >
                      {sdg.value}. {sdg.label}
                    </button>
                  ))}
                </div>
                {errors.sdgFocus && <p className="text-sm text-red-500 mt-1">{errors.sdgFocus.message}</p>}
              </div>

              {/* Skills Needed */}
              <div>
                <Label>Skills Needed *</Label>
                <p className="text-xs text-gray-500 mb-2">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {SKILL_OPTIONS.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      disabled={isLoading}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedSkills.includes(skill)
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                      }`}
                    >
                      {selectedSkills.includes(skill) && <Check className="h-3 w-3 inline mr-1" />}
                      {skill}
                    </button>
                  ))}
                </div>
                {errors.skillsNeeded && <p className="text-sm text-red-500 mt-1">{errors.skillsNeeded.message}</p>}
              </div>

              {/* Outcome Types */}
              <div>
                <Label>Outcome Types You Track *</Label>
                <p className="text-xs text-gray-500 mb-2">What volunteers help with</p>
                <div className="grid grid-cols-2 gap-2">
                  {OUTCOME_TYPES.map(outcome => (
                    <button
                      key={outcome.value}
                      type="button"
                      onClick={() => toggleOutcome(outcome.value)}
                      disabled={isLoading}
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
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Your Contact Info</p>
              </div>

              {/* Contact Name */}
              <div>
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  placeholder="Marie Dubois"
                  {...register("contactName")}
                  className="mt-1"
                  disabled={isLoading}
                />
                {errors.contactName && <p className="text-sm text-red-500 mt-1">{errors.contactName.message}</p>}
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="marie@cleanwaterhaiti.org"
                  {...register("email")}
                  className="mt-1"
                  disabled={isLoading}
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    {...register("password")}
                    className="pr-10"
                    disabled={isLoading}
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

              {/* Terms */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={watch("termsAccepted")}
                  onCheckedChange={(checked) => setValue("termsAccepted", checked === true)}
                  disabled={isLoading}
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
                disabled={isLoading}
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

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>

              {/* Google Sign Up */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FcGoogle className="h-5 w-5 mr-2" />
                )}
                Sign up with Google
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
