import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Eye, EyeOff, Loader2, Copy, Check } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { getDashboardRoute } from "@/lib/auth-schemas";

// ============================================================================
// CONSTANTS
// ============================================================================

// Free email domains to block for corporate signups
const FREE_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "mail.com", "protonmail.com", "zoho.com", "yandex.com",
  "live.com", "msn.com", "me.com", "inbox.com", "gmx.com"
];

// Generate invite code from company name
function generateInviteCode(companyName: string): string {
  const base = companyName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  const year = new Date().getFullYear();
  return `${base}-${year}`;
}

// ============================================================================
// SCHEMA - MVP fields only
// ============================================================================

const corporateSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string()
    .email("Valid work email required")
    .refine(email => {
      const domain = email.split("@")[1]?.toLowerCase();
      return !FREE_EMAIL_DOMAINS.includes(domain);
    }, "Please use your corporate email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number"),
  employeeCount: z.coerce.number().min(1, "Number of employees is required"),
  ngoPartnerId: z.string().optional(),
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms"),
});

type CorporateFormData = z.infer<typeof corporateSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function CorporateIntakeSimple() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const selectedPlan = new URLSearchParams(searchString).get("plan") ?? "pilot";
  const { toast } = useToast();
  const { signUp, signInWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<CorporateFormData>({
    resolver: zodResolver(corporateSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      email: "",
      password: "",
      employeeCount: 20,
      ngoPartnerId: "",
      termsAccepted: false,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const companyName = watch("companyName");

  // Generate invite code when company name changes
  useEffect(() => {
    if (companyName && companyName.length >= 2) {
      setInviteCode(generateInviteCode(companyName));
    } else {
      setInviteCode("");
    }
  }, [companyName]);

  // Fetch available NGO partners
  const { data: ngoPartners = [] } = useQuery({
    queryKey: ["/api/organizations/available"],
    queryFn: async () => {
      const response = await fetch("/api/organizations?status=active");
      if (!response.ok) return [];
      const json = await response.json();
      return Array.isArray(json) ? json : (json.data ?? []);
    },
  });

  // Handle Google sign-up
  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle("corporate-partner");
      if (result) {
        localStorage.setItem("profileComplete", "true");
        toast({
          title: "Welcome to Synerxus!",
          description: "Your corporate account has been created.",
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
    mutationFn: async (data: CorporateFormData) => {
      // Step 1: Create Firebase account and sync with backend
      const firebaseUser = await signUp(data.email, data.password, "corporate-partner", data.companyName);
      if (!firebaseUser) {
        throw new Error("Failed to create account");
      }

      // Step 2: Create CSR Partner profile
      try {
        const userId = localStorage.getItem("currentUserId");
        const idToken = await firebaseUser.getIdToken();

        const profileResponse = await fetch("/api/csr/partners", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
            ...(userId && { "X-User-Id": userId }),
          },
          body: JSON.stringify({
            userId: userId ? parseInt(userId) : null,
            companyName: data.companyName,
            contactEmail: data.email,
            employeeCount: data.employeeCount,
            ngoPartnerId: data.ngoPartnerId ? parseInt(data.ngoPartnerId) : null,
            inviteCode: inviteCode,
            subscriptionTier: selectedPlan,
            pilotStart: new Date().toISOString(),
            pilotEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        });

        if (!profileResponse.ok) {
          console.error("Failed to save CSR partner profile:", await profileResponse.text());
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
        description: "Welcome to Synerxus! Your 90-day pilot has started. Redirecting...",
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

  const onSubmit = (data: CorporateFormData) => {
    submitMutation.mutate(data);
  };

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isLoading = submitMutation.isPending || isGoogleLoading;

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Logo size="md" className="mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Create Your Corporate Account</h1>
          <p className="text-gray-500 mt-1">See verified impact in ~2 minutes</p>
        </div>

        {/* Plan context banner */}
        {selectedPlan && selectedPlan !== "pilot" ? (
          <div className="mb-5 flex items-center gap-3 bg-[#0A1F44] rounded-2xl px-5 py-3.5">
            <span className="text-[#D4980C] text-lg">✦</span>
            <div>
              <p className="text-white text-xs font-semibold capitalize">
                {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan selected
              </p>
              <p className="text-blue-200 text-[11px] mt-0.5">
                Your plan features will be activated once your account is confirmed.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-5 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3.5">
            <span className="text-emerald-600 text-lg">●</span>
            <p className="text-emerald-800 text-xs font-semibold">
              Starting with a free 90-day Pilot — no credit card required
            </p>
          </div>
        )}

        <Card className="shadow-lg">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Company Name */}
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="Samsung Electronics"
                  {...register("companyName")}
                  className="mt-1"
                  disabled={isLoading}
                />
                {errors.companyName && <p className="text-sm text-red-500 mt-1">{errors.companyName.message}</p>}
              </div>

              {/* Contact Name */}
              <div>
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  placeholder="Jennifer Park"
                  {...register("contactName")}
                  className="mt-1"
                  disabled={isLoading}
                />
                {errors.contactName && <p className="text-sm text-red-500 mt-1">{errors.contactName.message}</p>}
              </div>

              {/* Work Email */}
              <div>
                <Label htmlFor="email">Work Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jennifer.park@samsung.com"
                  {...register("email")}
                  className="mt-1"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">Corporate domain only (no Gmail, Yahoo, etc.)</p>
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

              {/* Divider */}
              <div className="border-t border-gray-200 pt-4 lg:col-span-2">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Pilot Setup</p>
              </div>

              {/* Employees in Pilot */}
              <div>
                <Label htmlFor="employeeCount">Employees in Pilot *</Label>
                <Input
                  id="employeeCount"
                  type="number"
                  placeholder="20"
                  min={1}
                  {...register("employeeCount")}
                  className="mt-1"
                  disabled={isLoading}
                />
                {errors.employeeCount && <p className="text-sm text-red-500 mt-1">{errors.employeeCount.message}</p>}
              </div>

              {/* NGO Partner */}
              <div className="lg:col-span-2">
                <Label>NGO Partner <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Select onValueChange={(v) => setValue("ngoPartnerId", v)} disabled={isLoading}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select NGO partner later or choose one now" />
                  </SelectTrigger>
                  <SelectContent>
                    {ngoPartners.map((ngo: any) => (
                      <SelectItem key={ngo.id} value={ngo.id.toString()}>
                        {ngo.name || ngo.organizationName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  You can link NGO partners now or add them later from your corporate dashboard. {ngoPartners.length} available.
                </p>
              </div>

              {/* Invite Code (Auto-generated, Display Only) */}
              {inviteCode && (
                <div className="lg:col-span-2">
                  <Label>Your Invite Code</Label>
                  <p className="text-xs text-gray-500 mb-1">Share this with employees to join</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={inviteCode}
                      readOnly
                      className="font-mono font-bold text-indigo-600 bg-indigo-50"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyInviteCode}
                      disabled={isLoading}
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Terms */}
              <div className="flex items-start gap-2 lg:col-span-2">
                <Checkbox
                  id="terms"
                  checked={watch("termsAccepted")}
                  onCheckedChange={(checked) => setValue("termsAccepted", checked === true)}
                  disabled={isLoading}
                />
                <Label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  I agree to the <a href="/terms" className="text-indigo-600 underline">Corporate Terms of Service</a>
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
                    Starting Pilot...
                  </>
                ) : (
                  "Start Free 90-Day Pilot"
                )}
              </Button>

              <p className="text-center text-xs text-gray-500 lg:col-span-2">
                No credit card required. See verified impact in minutes.
              </p>

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
