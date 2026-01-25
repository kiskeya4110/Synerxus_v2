import { useState, useEffect } from "react";
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
import { Eye, EyeOff, Loader2, Copy, Check } from "lucide-react";

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
  "Colombia", "Argentina", "Chile", "Peru", "Other"
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Sao_Paulo", label: "Brasilia Time (BRT)" },
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
  { value: "weekday_business", label: "Weekday Business Hours (9am-5pm)" },
  { value: "weekday_extended", label: "Weekday Extended (6am-9pm)" },
  { value: "weekend", label: "Weekends" },
  { value: "flexible", label: "Flexible / Any time" },
];

// ============================================================================
// SCHEMA
// ============================================================================

const corporateSchema = z.object({
  // Company Info
  companyName: z.string().min(2, "Company name is required"),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  // Contact Info
  contactName: z.string().min(2, "Your name is required"),
  email: z.string().email("Valid work email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Pilot Setup
  employeeCount: z.coerce.number().min(1, "Number of employees is required"),
  ngoPartnerId: z.string().min(1, "Select an NGO partner"),
  // Terms
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms"),
  // Matching fields
  sdgGoals: z.array(z.number()).min(1, "Select at least one SDG priority"),
  timezone: z.string().min(1, "Timezone is required"),
  availability: z.array(z.string()).min(1, "Select employee availability"),
});

type CorporateFormData = z.infer<typeof corporateSchema>;

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
// COMPONENT
// ============================================================================

export default function CorporateIntakeSimple() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);

  const form = useForm<CorporateFormData>({
    resolver: zodResolver(corporateSchema),
    defaultValues: {
      companyName: "",
      country: "",
      city: "",
      contactName: "",
      email: "",
      password: "",
      employeeCount: 20,
      ngoPartnerId: "",
      termsAccepted: false,
      sdgGoals: [],
      timezone: "",
      availability: [],
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const selectedSdgs = watch("sdgGoals") || [];
  const selectedAvailability = watch("availability") || [];
  const companyName = watch("companyName");

  // Generate invite code when company name changes
  useEffect(() => {
    if (companyName && companyName.length >= 2) {
      setInviteCode(generateInviteCode(companyName));
    }
  }, [companyName]);

  // Fetch available NGO partners
  const { data: ngoPartners = [] } = useQuery({
    queryKey: ["/api/organizations/available"],
    queryFn: async () => {
      const response = await fetch("/api/organizations?status=active");
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: CorporateFormData) => {
      // Try to create user via API, fall back to demo mode
      try {
        const response = await apiRequest("POST", "/api/users", {
          email: data.email,
          displayName: data.companyName,
          username: data.email.split('@')[0] + '_' + Date.now(),
          userType: "corporate-partner",
          firebaseUid: "demo_" + Date.now(),
        });
        const user = await response.json();
        return { id: user.id, ...data };
      } catch (error) {
        console.log("Using demo mode for signup");
        return { id: Date.now(), ...data };
      }
    },
    onSuccess: (data) => {
      localStorage.setItem("currentUserId", String(data.id));
      localStorage.setItem("userType", "corporate-partner");
      localStorage.setItem("profileComplete", "true");
      localStorage.removeItem("isNewSignup");
      // Store corporate profile data
      localStorage.setItem("corporateProfile", JSON.stringify({
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        country: data.country,
        city: data.city,
        employeeCount: data.employeeCount,
        ngoPartnerId: data.ngoPartnerId,
        inviteCode: inviteCode,
        sdgGoals: data.sdgGoals,
        timezone: data.timezone,
        availability: data.availability,
        pilotStart: new Date().toISOString(),
        pilotEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      toast({
        title: "Welcome to Synerxus!",
        description: "Your 90-day pilot has started. Share the invite code with employees!",
      });
      navigate("/csr-dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CorporateFormData) => {
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

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Logo size="md" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Start Your Free Pilot</h1>
          <p className="text-gray-500 mt-1">Set up in under 3 minutes</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* Company Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="Samsung Electronics"
                    {...register("companyName")}
                    className="mt-1"
                  />
                  {errors.companyName && <p className="text-sm text-red-500 mt-1">{errors.companyName.message}</p>}
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
                      placeholder="Seoul"
                      {...register("city")}
                      className="mt-1"
                    />
                    {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>}
                  </div>
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
                    placeholder="Jennifer Park"
                    {...register("contactName")}
                    className="mt-1"
                  />
                  {errors.contactName && <p className="text-sm text-red-500 mt-1">{errors.contactName.message}</p>}
                </div>

                <div>
                  <Label htmlFor="email">Work Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jennifer.park@samsung.com"
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
                <h3 className="text-sm font-semibold text-gray-700 mb-4">PILOT SETUP</h3>
              </div>

              {/* Pilot Setup */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="employeeCount">How many employees in pilot? *</Label>
                  <Input
                    id="employeeCount"
                    type="number"
                    placeholder="20"
                    {...register("employeeCount")}
                    className="mt-1"
                  />
                  {errors.employeeCount && <p className="text-sm text-red-500 mt-1">{errors.employeeCount.message}</p>}
                </div>

                <div>
                  <Label>Which NGO partner? *</Label>
                  <Select onValueChange={(v) => setValue("ngoPartnerId", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select NGO partner" />
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
                    {ngoPartners.length} NGO partners available
                  </p>
                  {errors.ngoPartnerId && <p className="text-sm text-red-500 mt-1">{errors.ngoPartnerId.message}</p>}
                </div>

                {/* Invite Code Display */}
                {inviteCode && (
                  <div>
                    <Label>Your Invite Code (share with employees)</Label>
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
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">FOR VOLUNTEER MATCHING</h3>
              </div>

              {/* Timezone */}
              <div>
                <Label>Company Timezone *</Label>
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

              {/* SDG Goals */}
              <div>
                <Label>CSR Focus Areas (Select up to 5)</Label>
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
                <Label>Employee Volunteering Availability *</Label>
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
                  I agree to the <a href="/terms" className="text-indigo-600 underline">Corporate Terms of Service</a>
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
                    Starting Pilot...
                  </>
                ) : (
                  "Start Free 90-Day Pilot"
                )}
              </Button>

              <p className="text-center text-xs text-gray-500">
                No credit card required. See verified impact in minutes.
              </p>

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
