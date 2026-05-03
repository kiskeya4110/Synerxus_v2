import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { sdgGoals } from "@shared/sdg-goals";
import { ArrowRight, ArrowLeft, Check, Building2 } from "lucide-react";
import { ProfilePictureUpload } from "@/components/profile-picture-upload";
import CSRMobileNav, { CSRMobileHeader } from "@/components/layout/csr-mobile-nav";
import { useIsMobile } from "@/hooks/use-mobile";

const corporatePartnerSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactEmail: z.string().email("Valid email required"),
  contactPhone: z.string().min(10, "Valid phone number required"),
  industryType: z.string().min(1, "Select an industry"),
  employeeCount: z.coerce.number().min(1, "Employee count required"),
  annualCSRBudget: z.coerce.number().min(0, "Budget is required"),
  primarySdgs: z.array(z.number()).min(1, "Select at least one SDG focus"),
  vtoTrackingEnabled: z.boolean().default(true),
  onboardingCompleted: z.boolean().default(true)
});

type CorporatePartnerForm = z.infer<typeof corporatePartnerSchema>;

const industryOptions = [
  "Technology",
  "Finance & Banking",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Telecommunications",
  "Energy & Utilities",
  "Transportation",
  "Media & Entertainment",
  "Education",
  "Professional Services",
  "Construction",
  "Infrastructure",
  "Real Estate",
  "Agriculture & Farming",
  "Mining & Resources",
  "Hospitality & Tourism",
  "Logistics & Supply Chain",
  "Automotive",
  "Aerospace & Defense",
  "Pharmaceuticals",
  "Consumer Goods",
  "Legal Services",
  "Consulting",
  "Insurance",
  "Food & Beverage",
  "Textiles & Apparel",
  "Environmental Services",
  "Non-Profit/NGO",
  "Government & Public Sector",
  "Other"
];

function SDGSelection({ selectedSdgs, onToggle, error }: { 
  selectedSdgs: number[], 
  onToggle: (id: number) => void,
  error?: string
}) {
  return (
    <div className="space-y-2">
      <FormLabel>CSR Focus Areas (SDGs)</FormLabel>
      <FormDescription>Select the UN Sustainable Development Goals your company prioritizes</FormDescription>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {Object.values(sdgGoals).map((sdg) => {
          const isSelected = selectedSdgs.includes(sdg.id);
          return (
            <div
              key={sdg.id}
              data-testid={`card-sdg-${sdg.id}`}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
              onClick={() => onToggle(sdg.id)}
            >
              <div className="flex items-start gap-2">
                <div className={`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center ${
                  isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className="font-semibold text-sm">SDG {sdg.id}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{sdg.name}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}

export default function CorporatePartnerIntake() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const [selectedSdgs, setSelectedSdgs] = useState<number[]>([]);
  const [logoUrl, setLogoUrl] = useState("");

  const userId = localStorage.getItem('currentUserId');
  const { data: currentUser } = useQuery<{ id: number; displayName?: string }>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) throw new Error("No user ID found");
      const response = await fetch(`/api/users/me?userId=${id}`);
      if (!response.ok) throw new Error("User not found");
      return response.json();
    },
    enabled: !!userId
  });

  // Fetch existing CSR partner profile
  const { data: existingProfile } = useQuery<CorporatePartnerForm & { id?: number; logo?: string } | null>({
    queryKey: ['/api/csr/partners', userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/csr/partners?userId=${userId}`, { headers, credentials: "include" });
        if (!response.ok) return null;
        const data = await response.json();
        return data || null;
      } catch {
        return null;
      }
    },
    enabled: !!userId
  });

  const form = useForm<CorporatePartnerForm>({
    resolver: zodResolver(corporatePartnerSchema),
    defaultValues: {
      companyName: "",
      contactEmail: "",
      contactPhone: "",
      industryType: "",
      employeeCount: 0,
      annualCSRBudget: 0,
      primarySdgs: [],
      vtoTrackingEnabled: true,
      onboardingCompleted: true
    }
  });

  // Populate form with existing profile data
  useEffect(() => {
    if (existingProfile) {
      form.reset({
        companyName: existingProfile.companyName || "",
        contactEmail: existingProfile.contactEmail || "",
        contactPhone: existingProfile.contactPhone || "",
        industryType: existingProfile.industryType || "",
        employeeCount: existingProfile.employeeCount || 0,
        annualCSRBudget: existingProfile.annualCSRBudget || 0,
        primarySdgs: existingProfile.primarySdgs || [],
        vtoTrackingEnabled: existingProfile.vtoTrackingEnabled ?? true,
        onboardingCompleted: true
      });
      setSelectedSdgs(existingProfile.primarySdgs || []);
      if (existingProfile.logo) {
        setLogoUrl(existingProfile.logo);
      }
    }
  }, [existingProfile, form]);

  const createPartnerMutation = useMutation({
    mutationFn: async (data: CorporatePartnerForm) => {
      const userId = localStorage.getItem('currentUserId');
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/csr/partners', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId ? parseInt(userId) : undefined,
          ...data,
          primarySdgs: selectedSdgs,
          logo: logoUrl
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to create CSR partner profile: ${response.status} ${errText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/csr/partners'] });
      toast({
        title: "Success!",
        description: "Your corporate partner profile has been created. Welcome to Synerxus!"
      });
      navigate('/csr-dashboard');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  async function onSubmit(data: CorporatePartnerForm) {
    createPartnerMutation.mutate({ ...data, primarySdgs: selectedSdgs });
  }

  // If profile is already completed, show message and redirect option
  if (existingProfile?.onboardingCompleted) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">Profile Already Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Your corporate partner profile has already been set up. You can now access all features or return to the dashboard.
            </p>
            <Button onClick={() => navigate("/csr-dashboard")} className="bg-primary">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] dark:from-blue-900/20 dark:to-gray-900">
      {/* CSR Header */}
      <CSRMobileHeader title="Corporate Partner Onboarding" showBackButton onBack={() => navigate('/csr-dashboard')} />

      <div className="py-8 px-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="bg-blue-600 dark:bg-blue-900 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Corporate Partner Onboarding
              </CardTitle>
              <CardDescription className="text-blue-100">
                Complete your company profile to launch employee volunteer programs
              </CardDescription>
            </CardHeader>
          
          <CardContent className="pt-6">
            {/* Step Indicator */}
            <div className="mb-8 flex items-center justify-between">
              {[1, 2].map((num) => (
                <div key={num} className="flex items-center">
                  <div className={`flex items-center justify-center h-10 w-10 rounded-full border-2 font-bold transition-all ${
                    num <= step 
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 text-gray-300"
                  }`}>
                    {num}
                  </div>
                  {num < 2 && (
                    <div className={`flex-1 h-1 mx-3 transition-all ${
                      num < step ? "bg-blue-600" : "bg-gray-300"
                    }`} />
                  )}
                </div>
              ))}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Step 1: Company Info */}
                {step === 1 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Company Information</h3>

                    {currentUser?.id && (
                      <div className="mb-6">
                        <ProfilePictureUpload
                          currentPhotoUrl={logoUrl}
                          onPhotoChange={setLogoUrl}
                          userId={currentUser.id.toString()}
                          userType="organization"
                          type="logo"
                          label="Company Logo"
                        />
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Corporation" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="industryType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {industryOptions.map((industry) => (
                                <SelectItem key={industry} value={industry}>
                                  {industry}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="employeeCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Employees</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="500" {...field} />
                          </FormControl>
                          <FormDescription>Total employees in your company</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="annualCSRBudget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual CSR Budget (USD)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="100000" {...field} />
                          </FormControl>
                          <FormDescription>Total CSR/volunteer program budget</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 2: Contact & SDGs */}
                {step === 2 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Contact Details & Impact Goals</h3>
                    
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="csr@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 000-0000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vtoTrackingEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Enable VTO Tracking</FormLabel>
                            <FormDescription>
                              Track Volunteer Time Off (VTO) for employees
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <SDGSelection
                      selectedSdgs={selectedSdgs}
                      onToggle={(id) => {
                        setSelectedSdgs(prev =>
                          prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
                        );
                      }}
                      error={selectedSdgs.length === 0 ? "Select at least one SDG" : undefined}
                    />
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-6">
                  {step === 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                  )}
                  
                  {step === 1 && (
                    <Button
                      type="button"
                      onClick={() => setStep(2)}
                      className="ml-auto gap-2"
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}

                  {step === 2 && (
                    <Button
                      type="submit"
                      className="ml-auto"
                      disabled={createPartnerMutation.isPending || selectedSdgs.length === 0}
                    >
                      {createPartnerMutation.isPending ? "Creating Profile..." : "Launch Partner Program"}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <CSRMobileNav activeTab="settings" />
    </div>
  );
}
