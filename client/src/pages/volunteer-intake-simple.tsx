import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Logo from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Check, Loader2, X, Building2, Search, Plus } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { getDashboardRoute } from "@/lib/auth-schemas";

type CSRPartnerListItem = {
  id: number;
  companyName: string;
  industryType: string | null;
  logoUrl: string | null;
};

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

  // Employer selection / proposal state
  const [selectedEmployerId, setSelectedEmployerId] = useState<number | null>(null);
  const [employerSearch, setEmployerSearch] = useState("");
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [proposedCompanyName, setProposedCompanyName] = useState("");
  const [proposedIndustry, setProposedIndustry] = useState("");

  // Public partners list — works without auth so users can pick employer pre-signup
  const { data: csrPartners = [] } = useQuery<CSRPartnerListItem[]>({
    queryKey: ["/api/csr/partners/public-list"],
    queryFn: async () => {
      const r = await fetch("/api/csr/partners/public-list");
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
  });

  const form = useForm<VolunteerFormData>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      inviteCode: "",
      skills: [],
      sdgInterests: [],
      termsAccepted: false,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const selectedSkills = watch("skills") || [];
  const selectedSdgs = watch("sdgInterests") || [];
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
      console.log("[Signup] Starting signup for:", data.email);

      // Step 1: Create Firebase account and sync with backend
      const firebaseUser = await signUp(data.email, data.password, "volunteer", data.name);
      console.log("[Signup] Firebase user created:", firebaseUser?.email || firebaseUser);

      if (!firebaseUser) {
        throw new Error("Failed to create account");
      }

      // Step 2: Save profile data to backend
      try {
        const idToken = await firebaseUser.getIdToken();
        const userId = localStorage.getItem("currentUserId");

        // Step 2a: If user proposed a new employer, create it now and use the
        // returned id as the employerId. If proposal fails, we still save the
        // profile without an employer link.
        let employerId: number | null = selectedEmployerId;
        if (!employerId && showProposeForm && proposedCompanyName.trim()) {
          try {
            const proposeRes = await fetch("/api/csr/partners/propose", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`,
                ...(userId && { "X-User-Id": userId }),
              },
              body: JSON.stringify({
                companyName: proposedCompanyName.trim(),
                industryType: proposedIndustry.trim() || null,
              }),
            });
            if (proposeRes.ok) {
              const proposed = await proposeRes.json();
              if (proposed?.id) employerId = Number(proposed.id);
            } else {
              console.warn("[Signup] Propose employer failed:", await proposeRes.text());
            }
          } catch (e) {
            console.warn("[Signup] Propose employer error:", e);
          }
        }

        const profileResponse = await fetch("/api/intake/volunteer-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
            ...(userId && { "X-User-Id": userId }),
          },
          body: JSON.stringify({
            volunteerName: data.name,
            skills: data.skills,
            preferredSdgs: data.sdgInterests,
            inviteCode: data.inviteCode || null,
            employerId: employerId ?? undefined,
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
      console.log("[Signup] SUCCESS - redirecting to dashboard");
      localStorage.setItem("profileComplete", "true");
      localStorage.removeItem("isNewSignup");

      toast({
        title: "Account Created Successfully!",
        description: "Welcome to Synerxus! Redirecting to your dashboard...",
      });

      // Use window.location for reliable redirect after auth state change
      setTimeout(() => {
        console.log("[Signup] Redirecting now to:", getDashboardRoute());
        window.location.href = getDashboardRoute();
      }, 500);
    },
    onError: (error: any) => {
      console.error("[Signup] ERROR:", error);
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

  const isLoading = submitMutation.isPending || isGoogleLoading;

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Logo size="md" className="mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Join Synerxus</h1>
          <p className="text-gray-500 mt-1">Start logging impact in ~90 seconds</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-5">

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

              {/* My Employer (Optional) */}
              <div className="lg:col-span-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  My Employer (Optional)
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  Link your volunteer hours to your employer's CSR programme so their team can track real-time impact. You can also propose a new employer if yours isn't listed.
                </p>

                {/* Search */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search companies…"
                    value={employerSearch}
                    onChange={(e) => setEmployerSearch(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                  />
                </div>

                {/* Company list */}
                <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmployerId(null);
                      setShowProposeForm(false);
                    }}
                    disabled={isLoading}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      selectedEmployerId === null && !showProposeForm
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-sm font-medium">Not linked to an employer</span>
                    {selectedEmployerId === null && !showProposeForm && (
                      <Check className="h-3.5 w-3.5 ml-auto" />
                    )}
                  </button>

                  {(csrPartners || [])
                    .filter((p) =>
                      !employerSearch.trim() ||
                      p.companyName.toLowerCase().includes(employerSearch.toLowerCase())
                    )
                    .map((partner) => (
                      <button
                        key={partner.id}
                        type="button"
                        onClick={() => {
                          setSelectedEmployerId(partner.id);
                          setShowProposeForm(false);
                        }}
                        disabled={isLoading}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          selectedEmployerId === partner.id
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {partner.logoUrl ? (
                          <img src={partner.logoUrl} alt="" className="h-6 w-6 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-6 w-6 rounded bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{partner.companyName}</span>
                          {partner.industryType && (
                            <span className="text-xs text-gray-400">{partner.industryType}</span>
                          )}
                        </div>
                        {selectedEmployerId === partner.id && (
                          <Check className="h-3.5 w-3.5 ml-auto flex-shrink-0" />
                        )}
                      </button>
                    ))}

                  {(csrPartners || []).length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No companies registered yet.</p>
                  )}
                </div>

                {/* Propose new employer toggle + inline form */}
                {!showProposeForm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProposeForm(true);
                      setSelectedEmployerId(null);
                    }}
                    disabled={isLoading}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Don't see your employer? Propose a new one
                  </button>
                ) : (
                  <div className="mt-2 p-3 rounded-lg border border-indigo-200 bg-indigo-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        Propose a new employer
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProposeForm(false);
                          setProposedCompanyName("");
                          setProposedIndustry("");
                        }}
                        disabled={isLoading}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Cancel propose new employer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Input
                      placeholder="Company name *"
                      value={proposedCompanyName}
                      onChange={(e) => setProposedCompanyName(e.target.value)}
                      disabled={isLoading}
                      maxLength={200}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Industry (optional, e.g. Technology, Finance)"
                      value={proposedIndustry}
                      onChange={(e) => setProposedIndustry(e.target.value)}
                      disabled={isLoading}
                      maxLength={100}
                      className="text-sm"
                    />
                    <p className="text-[11px] text-gray-500">
                      We'll save this employer to your profile after sign-up. Their CSR admin can later claim and verify it.
                    </p>
                  </div>
                )}

                {selectedEmployerId !== null && (
                  <p className="text-xs text-indigo-600 mt-1.5 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Linked — your verified impact will appear on their CSR dashboard.
                  </p>
                )}
              </div>

              {/* Skills */}
              <div className="lg:col-span-2">
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
              <div className="lg:col-span-2">
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

              {/* Terms */}
              <div className="flex items-start gap-2 lg:col-span-2">
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
              {errors.termsAccepted && <p className="text-sm text-red-500 lg:col-span-2">{errors.termsAccepted.message}</p>}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full lg:col-span-2"
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
              <div className="relative lg:col-span-2">
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
                className="w-full lg:col-span-2"
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

              <p className="text-center text-sm text-gray-500 lg:col-span-2">
                Already have an account? <a href="/login" className="text-indigo-600 font-medium">Log in</a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
