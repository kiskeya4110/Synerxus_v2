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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Logo from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Check, Loader2, X } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { getDashboardRoute } from "@/lib/auth-schemas";

// ============================================================================
// CONSTANTS - Simplified for MVP
// ============================================================================

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

const DIASPORA_OPTIONS = [
  "Haiti",
  "Zambia",
  "Philippines",
  "Zimbabwe",
  "Mexico",
  "Other",
  "None",
];

// ============================================================================
// SCHEMA - MVP fields only
// ============================================================================

const volunteerSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number"),
  inviteCode: z.string().optional(),
  skills: z.array(z.string()).min(1, "Select at least one skill").max(3, "Maximum 3 skills"),
  sdgInterests: z.array(z.number()).min(1, "Select at least one SDG").max(3, "Maximum 3 SDGs"),
  diaspora: z.array(z.string()).optional(),
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms"),
});

type VolunteerFormData = z.infer<typeof volunteerSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function VolunteerIntakeSimple() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { signUp, signInWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCodeValid, setInviteCodeValid] = useState<boolean | null>(null);
  const [inviteCodeOrg, setInviteCodeOrg] = useState<string>("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<VolunteerFormData>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      inviteCode: "",
      skills: [],
      sdgInterests: [],
      diaspora: [],
      termsAccepted: false,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const selectedSkills = watch("skills") || [];
  const selectedSdgs = watch("sdgInterests") || [];
  const selectedDiaspora = watch("diaspora") || [];
  const inviteCode = watch("inviteCode");

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

  // Handle Google sign-up
  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle("volunteer");
      if (result) {
        localStorage.setItem("profileComplete", "true");
        toast({
          title: "Welcome to Synerxus!",
          description: "Your account has been created with Google.",
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
    mutationFn: async (data: VolunteerFormData) => {
      // Step 1: Create Firebase account and sync with backend
      const firebaseUser = await signUp(data.email, data.password, "volunteer", data.name);
      if (!firebaseUser) {
        throw new Error("Failed to create account");
      }

      // Step 2: Save profile data to backend
      const idToken = await firebaseUser.getIdToken();
      const profileResponse = await fetch("/api/intake/volunteer-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          volunteerName: data.name,
          skills: data.skills,
          preferredSdgs: data.sdgInterests,
          diasporaConnections: data.diaspora || [],
          inviteCode: data.inviteCode || null,
          onboardingCompleted: true,
        }),
      });

      if (!profileResponse.ok) {
        console.error("Failed to save profile:", await profileResponse.text());
        // Don't throw - account is created, profile can be completed later
      }

      return { firebaseUser, ...data };
    },
    onSuccess: () => {
      localStorage.setItem("profileComplete", "true");
      localStorage.removeItem("isNewSignup");

      toast({
        title: "Welcome to Synerxus!",
        description: "Start logging your impact!",
      });
      navigate(getDashboardRoute());
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

  const onSubmit = (data: VolunteerFormData) => {
    submitMutation.mutate(data);
  };

  const toggleSkill = (skill: string) => {
    const current = selectedSkills;
    if (current.includes(skill)) {
      setValue("skills", current.filter(s => s !== skill));
    } else if (current.length < 3) {
      setValue("skills", [...current, skill]);
    }
  };

  const toggleSdg = (sdg: number) => {
    const current = selectedSdgs;
    if (current.includes(sdg)) {
      setValue("sdgInterests", current.filter(s => s !== sdg));
    } else if (current.length < 3) {
      setValue("sdgInterests", [...current, sdg]);
    }
  };

  const toggleDiaspora = (country: string) => {
    const current = selectedDiaspora;
    if (country === "None") {
      setValue("diaspora", current.includes("None") ? [] : ["None"]);
      return;
    }
    // Remove "None" if selecting another option
    const withoutNone = current.filter(c => c !== "None");
    if (current.includes(country)) {
      setValue("diaspora", withoutNone.filter(c => c !== country));
    } else {
      setValue("diaspora", [...withoutNone, country]);
    }
  };

  const isLoading = submitMutation.isPending || isGoogleLoading;

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Logo size="md" className="mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Join Synerxus</h1>
          <p className="text-gray-500 mt-1">Start logging impact in ~90 seconds</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Full Name */}
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Jean Pierre"
                  {...register("name")}
                  className="mt-1"
                  disabled={isLoading}
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean@company.com"
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

              {/* Invite Code (Optional) */}
              <div>
                <Label htmlFor="inviteCode">Employer Invite Code (Optional)</Label>
                <Input
                  id="inviteCode"
                  placeholder="COMPANY-2026"
                  {...register("inviteCode")}
                  onChange={(e) => {
                    register("inviteCode").onChange(e);
                    validateInviteCode(e.target.value);
                  }}
                  className="mt-1"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">If your employer gave you a code, enter it here</p>
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

              {/* Skills */}
              <div>
                <Label>Skills * (Select 1-3)</Label>
                <p className="text-xs text-gray-500 mb-2">{selectedSkills.length}/3 selected</p>
                <div className="flex flex-wrap gap-2">
                  {SKILL_OPTIONS.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      disabled={isLoading || (selectedSkills.length >= 3 && !selectedSkills.includes(skill))}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedSkills.includes(skill)
                          ? "bg-indigo-600 text-white"
                          : selectedSkills.length >= 3
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                      }`}
                    >
                      {selectedSkills.includes(skill) && <Check className="h-3 w-3 inline mr-1" />}
                      {skill}
                    </button>
                  ))}
                </div>
                {errors.skills && <p className="text-sm text-red-500 mt-1">{errors.skills.message}</p>}
              </div>

              {/* SDG Interests */}
              <div>
                <Label>SDG Interests * (Select 1-3)</Label>
                <p className="text-xs text-gray-500 mb-2">{selectedSdgs.length}/3 selected</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
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
                {errors.sdgInterests && <p className="text-sm text-red-500 mt-1">{errors.sdgInterests.message}</p>}
              </div>

              {/* Diaspora Connection (Optional) */}
              <div>
                <Label>Diaspora Connection (Optional)</Label>
                <p className="text-xs text-gray-500 mb-2">Select countries you have cultural ties to</p>
                <div className="flex flex-wrap gap-2">
                  {DIASPORA_OPTIONS.map(country => (
                    <button
                      key={country}
                      type="button"
                      onClick={() => toggleDiaspora(country)}
                      disabled={isLoading}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedDiaspora.includes(country)
                          ? "bg-teal-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-teal-50 hover:text-teal-700"
                      }`}
                    >
                      {selectedDiaspora.includes(country) && <Check className="h-3 w-3 inline mr-1" />}
                      {country}
                    </button>
                  ))}
                </div>
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
                  I agree to the <a href="/terms" className="text-indigo-600 underline">Terms of Service</a> and <a href="/privacy" className="text-indigo-600 underline">Privacy Policy</a>
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
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
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
