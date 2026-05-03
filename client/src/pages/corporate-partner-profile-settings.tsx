import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import {
  PROFILE_QUERY_CONFIG,
  cacheCorporatePartnerProfile,
  getCachedCorporatePartnerProfile,
  cacheUserProfile,
  getCachedUserProfile
} from "@/lib/profile-cache";
import { sdgGoals, getSDGColor } from "@shared/sdg-goals";
import { Building2, Check, ChevronRight, Save, Bell, Target, Settings as SettingsIcon, Users, Calendar, Globe, FileText, Shield, Mail, Clock, Zap, Award, Search, Plus, ExternalLink } from "lucide-react";
import { ProfilePictureUpload } from "@/components/profile-picture-upload";
import { Label } from "@/components/ui/label";
import CSRMobileNav, { CSRMobileHeader } from "@/components/layout/csr-mobile-nav";
import { CSRLayout } from "@/components/layout/csr-layout";
import OnboardingTrigger from "@/components/onboarding/onboarding-trigger";

const corporatePartnerSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactEmail: z.string().email("Valid email required"),
  contactPhone: z.string().min(1, "Phone number required"),
  industryType: z.string().min(1, "Select an industry"),
  employeeCount: z.coerce.number().min(1, "Employee count required"),
  annualCSRBudget: z.coerce.number().min(0, "Budget is required"),
  primarySdgs: z.array(z.number()).optional(),
  vtoTrackingEnabled: z.boolean().default(true),
});

type CorporatePartnerForm = z.infer<typeof corporatePartnerSchema>;

type NgoPartnerSuggestion = {
  source: "synerxus" | "propublica" | "wikidata";
  sourceId: string;
  name: string;
  description?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  registrationNumber?: string | null;
  profileUrl?: string | null;
};

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

export default function CorporatePartnerProfileSettings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedSdgs, setSelectedSdgs] = useState<number[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [ngoSearch, setNgoSearch] = useState("");
  const [newNgoName, setNewNgoName] = useState("");
  const [newNgoWebsite, setNewNgoWebsite] = useState("");
  const [newNgoEmail, setNewNgoEmail] = useState("");
  const [newNgoCountry, setNewNgoCountry] = useState("");

  const userId = localStorage.getItem('currentUserId');
  const storedUserType = localStorage.getItem('userType');

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const { data: currentUser } = useQuery<{ id: number; displayName?: string; userType?: string }>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) throw new Error("No user ID found");
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/users/me`, { headers, credentials: "include" });
      if (!response.ok) {
        // Demo mode: return fallback user data when API fails
        console.log("[CSRProfileSettings] Using demo mode - API user fetch failed");
        return {
          id: parseInt(id) || 1,
          displayName: 'Demo Corporate Partner',
          userType: storedUserType || 'corporate-partner',
        };
      }
      const data = await response.json();
      // Cache user data for instant loading
      cacheUserProfile(id, data);
      return data;
    },
    enabled: !!userId,
    initialData: () => getCachedUserProfile(userId),
    ...PROFILE_QUERY_CONFIG,
  });

  // Redirect non-corporate users
  useEffect(() => {
    if (currentUser && currentUser.userType !== "corporate-partner") {
      if (currentUser.userType === "volunteer") {
        navigate("/volunteer-profile-settings");
      } else if (currentUser.userType === "organization") {
        navigate("/organization-profile-settings");
      } else {
        navigate("/dashboard");
      }
    }
  }, [currentUser?.userType, navigate]);

  // Fetch CSR partner profile - use caching for instant loading
  const { data: partnerProfile, isLoading } = useQuery({
    queryKey: ['/api/csr/partners', userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/csr/partners?userId=${userId}`, { headers, credentials: "include" });
        const data = await response.json();
        // Cache profile for instant loading
        if (data) {
          cacheCorporatePartnerProfile(userId, data);
        }
        return data || null;
      } catch (err) {
        console.error("[Corporate Settings] Error fetching profile:", err);
        return null;
      }
    },
    enabled: !!userId,
    initialData: () => getCachedCorporatePartnerProfile(userId),
    ...PROFILE_QUERY_CONFIG,
  });

  const { data: ngoSuggestionData, isFetching: isFetchingNgoSuggestions } = useQuery<{
    suggestions: NgoPartnerSuggestion[];
    sources: string[];
    failedSources?: string[];
  }>({
    queryKey: ["/api/csr/ngo-partners/suggestions", ngoSearch],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ q: ngoSearch });
      const response = await fetch(`/api/csr/ngo-partners/suggestions?${params.toString()}`, {
        headers,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to search NGO partner suggestions");
      return response.json();
    },
    enabled: ngoSearch.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const addNgoPartnerMutation = useMutation({
    mutationFn: async (payload: Partial<NgoPartnerSuggestion> & { name: string }) => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/csr/ngo-partners/custom", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to add NGO partner");
      }
      return response.json();
    },
    onSuccess: () => {
      setNewNgoName("");
      setNewNgoWebsite("");
      setNewNgoEmail("");
      setNewNgoCountry("");
      queryClient.invalidateQueries({ queryKey: ["/api/csr/ngo-partners/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "NGO partner added",
        description: "The partner is saved as a pending NGO record and can be used for future verification workflows.",
      });
    },
    onError: (error) => {
      toast({
        title: "Could not add NGO partner",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const addSuggestionAsNgoPartner = (suggestion: NgoPartnerSuggestion) => {
    addNgoPartnerMutation.mutate({
      ...suggestion,
      website: suggestion.website || suggestion.profileUrl || undefined,
      description: suggestion.description || `Imported from ${suggestion.source}`,
    });
  };

  const addManualNgoPartner = () => {
    const name = newNgoName.trim();
    if (!name) {
      toast({
        title: "NGO name required",
        description: "Enter the NGO partner name before adding it.",
        variant: "destructive",
      });
      return;
    }

    addNgoPartnerMutation.mutate({
      source: "synerxus",
      sourceId: `manual-${Date.now()}`,
      name,
      website: newNgoWebsite.trim() || undefined,
      contactEmail: newNgoEmail.trim() || undefined,
      country: newNgoCountry.trim() || undefined,
      description: "Added manually by corporate partner.",
    });
  };

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
    }
  });

  // Populate form when profile loads
  useEffect(() => {
    if (partnerProfile) {
      form.reset({
        companyName: partnerProfile.companyName || "",
        contactEmail: partnerProfile.contactEmail || "",
        contactPhone: partnerProfile.contactPhone || "",
        industryType: partnerProfile.industryType || "",
        employeeCount: partnerProfile.employeeCount || 0,
        annualCSRBudget: partnerProfile.annualCSRBudget || 0,
        primarySdgs: partnerProfile.primarySdgs || [],
        vtoTrackingEnabled: partnerProfile.vtoTrackingEnabled ?? true,
      });
      setSelectedSdgs(partnerProfile.primarySdgs || []);
      // Support both logo and logoUrl field names (logoUrl is the database field)
      if (partnerProfile.logoUrl || partnerProfile.logo) {
        setLogoUrl(partnerProfile.logoUrl || partnerProfile.logo);
      }
    }
  }, [partnerProfile, form]);

  const updatePartnerMutation = useMutation({
    mutationFn: async (data: CorporatePartnerForm) => {
      const sdgsToSave = selectedSdgs.length > 0 ? selectedSdgs : (partnerProfile?.primarySdgs || []);
      const payload = {
        ...data,
        primarySdgs: sdgsToSave,
        logoUrl: logoUrl, // Use logoUrl to match database field name
        onboardingCompleted: true // Mark profile as complete when saved
      };

      const authHeaders = await getAuthHeaders();
      // If profile exists, update it; otherwise create new one
      if (partnerProfile?.id) {
        const response = await fetch(`/api/csr/partners/${partnerProfile.id}`, {
          method: 'PATCH',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Failed to update CSR partner profile: ${response.status} ${errText}`);
        }
        return response.json();
      } else {
        const response = await fetch('/api/csr/partners', {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId: currentUser?.id,
            ...payload
          })
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Failed to create CSR partner profile: ${response.status} ${errText}`);
        }
        return response.json();
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/csr/partners'] });
      queryClient.invalidateQueries({ queryKey: ['/api/csr/dashboard'] });
      toast({
        title: "Success!",
        description: "Your corporate partner profile has been saved."
      });

      // Mark profile as complete - prevents redirect back to settings on future logins
      localStorage.setItem('profileComplete', 'true');
      localStorage.removeItem('isNewSignup');

      // New profiles go to intake form, existing profiles go to dashboard
      setTimeout(() => {
        if (partnerProfile?.id) {
          navigate("/csr-dashboard");
        } else {
          navigate("/corporate-partner-intake");
        }
      }, 500);
    },
    onError: (error) => {
      console.error("[Corporate Settings] Save error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  async function onSubmit(data: CorporatePartnerForm) {
    try {
      const sdgsToSave = selectedSdgs.length > 0 ? selectedSdgs : (partnerProfile?.primarySdgs || []);
      
      // Require at least one SDG
      if (sdgsToSave.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one SDG focus area",
          variant: "destructive"
        });
        return;
      }
      
      updatePartnerMutation.mutate(data);
    } catch (err) {
      console.error("[Corporate Settings] Submit error:", err);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive"
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading your profile...</div>
      </div>
    );
  }

  // Mobile PWA View
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex flex-col max-w-[428px] mx-auto">
        <CSRMobileHeader title="Profile Settings" showBackButton onBack={() => navigate('/csr-dashboard')} />

        <main className="flex-1 overflow-y-auto pb-20 px-3 pt-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              {/* Company Info Section */}
              <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                <h3 className="text-white text-sm font-semibold mb-3">Company Information</h3>

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300 text-xs">Company Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Corporation"
                            {...field}
                            className="bg-white/10 border-gray-600 text-white text-sm h-9"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="industryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300 text-xs">Industry</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="bg-white/10 border-gray-600 text-white text-sm h-9">
                              <SelectValue placeholder="Select industry" />
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
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="employeeCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300 text-xs">Employees</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="500"
                              {...field}
                              className="bg-white/10 border-gray-600 text-white text-sm h-9"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="annualCSRBudget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300 text-xs">CSR Budget ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50000"
                              {...field}
                              className="bg-white/10 border-gray-600 text-white text-sm h-9"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info Section */}
              <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                <h3 className="text-white text-sm font-semibold mb-3">Contact Information</h3>

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300 text-xs">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="csr@company.com"
                            {...field}
                            className="bg-white/10 border-gray-600 text-white text-sm h-9"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300 text-xs">Phone</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            {...field}
                            className="bg-white/10 border-gray-600 text-white text-sm h-9"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* SDG Focus Areas */}
              <div className="bg-[#16213e] rounded-lg p-3 border border-gray-700">
                <h3 className="text-white text-sm font-semibold mb-2">SDG Focus Areas</h3>
                <p className="text-gray-400 text-[10px] mb-3">Select the UN SDGs your company prioritizes</p>

                <div className="grid grid-cols-5 gap-1.5">
                  {Object.values(sdgGoals).map((sdg) => {
                    const isSelected = selectedSdgs.includes(sdg.id);
                    return (
                      <button
                        key={sdg.id}
                        type="button"
                        onClick={() => {
                          setSelectedSdgs(prev =>
                            isSelected
                              ? prev.filter(id => id !== sdg.id)
                              : [...prev, sdg.id]
                          );
                        }}
                        className={`aspect-square rounded flex flex-col items-center justify-center text-white p-1 transition-all ${
                          isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-[#16213e]' : 'opacity-50'
                        }`}
                        style={{ backgroundColor: getSDGColor(sdg.id) }}
                      >
                        <span className="font-bold text-sm">{sdg.id}</span>
                        {isSelected && <Check className="w-3 h-3 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>

                {selectedSdgs.length > 0 && (
                  <div className="mt-2 text-emerald-400 text-[10px]">
                    {selectedSdgs.length} SDG{selectedSdgs.length > 1 ? 's' : ''} selected
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={updatePartnerMutation.isPending}
                className="w-full p-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updatePartnerMutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          </Form>
        </main>

        <CSRMobileNav activeTab="settings" />
      </div>
    );
  }

  return (
    <CSRLayout activeNav="settings" title="Corporate Partner Settings" subtitle="Update your company profile and CSR program details">
      <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="bg-blue-600 dark:bg-blue-900 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Corporate Partner Settings
              </CardTitle>
              <CardDescription className="text-blue-100">
                Update your company profile and CSR program details
              </CardDescription>
            </CardHeader>
          
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Company Information</h3>

                  {currentUser?.id && (
                    <div className="mb-6">
                      <Label className="mb-3 block">Company Logo</Label>
                      <ProfilePictureUpload
                        currentPhotoUrl={logoUrl}
                        onPhotoChange={setLogoUrl}
                        userId={currentUser.id.toString()}
                        userType="corporate-partner"
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
                        <FormLabel>Industry *</FormLabel>
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
                        <FormDescription>This field is required for industry reporting</FormDescription>
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

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-6">Contact & Program Settings</h3>

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
                        <FormItem className="mt-6">
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
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-6">
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

                    <div className="mt-6">
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
                  </div>

                  {/* NGO Partner Management */}
                  <div className="border-t pt-6 mt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold">NGO Partners</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Add your own NGO partners or search public nonprofit databases for suggested matches.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="ngoPartnerSearch" className="text-sm font-medium">Search NGO databases</Label>
                        <div className="relative mt-1.5">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="ngoPartnerSearch"
                            value={ngoSearch}
                            onChange={(event) => setNgoSearch(event.target.value)}
                            placeholder="Search by NGO name, EIN, city, or cause"
                            className="pl-9"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Suggestions combine existing Synerxus NGOs with ProPublica Nonprofit Explorer and Wikidata results.
                        </p>
                      </div>

                      {ngoSearch.trim().length >= 2 && (
                        <div className="rounded-lg border divide-y overflow-hidden">
                          {isFetchingNgoSuggestions ? (
                            <div className="px-4 py-3 text-sm text-gray-500">Searching NGO partner databases...</div>
                          ) : (ngoSuggestionData?.suggestions?.length || 0) > 0 ? (
                            ngoSuggestionData!.suggestions.map((suggestion) => (
                              <div key={`${suggestion.source}-${suggestion.sourceId}`} className="px-4 py-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium text-sm text-gray-900">{suggestion.name}</p>
                                    <Badge variant="outline" className="capitalize">{suggestion.source}</Badge>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {[suggestion.city, suggestion.state, suggestion.country].filter(Boolean).join(", ") || suggestion.description || "Online database result"}
                                  </p>
                                  {suggestion.registrationNumber && (
                                    <p className="text-xs text-gray-400 mt-1">Registration: {suggestion.registrationNumber}</p>
                                  )}
                                  {suggestion.profileUrl && (
                                    <a
                                      href={suggestion.profileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                                    >
                                      View source <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addSuggestionAsNgoPartner(suggestion)}
                                  disabled={addNgoPartnerMutation.isPending}
                                  className="shrink-0"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add
                                </Button>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500">No suggestions found. Add the NGO manually below.</div>
                          )}
                        </div>
                      )}

                      <div className="rounded-lg border p-4">
                        <h4 className="text-sm font-semibold mb-3">Add NGO manually</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="newNgoName" className="text-xs">NGO Name</Label>
                            <Input
                              id="newNgoName"
                              value={newNgoName}
                              onChange={(event) => setNewNgoName(event.target.value)}
                              placeholder="Green Future Alliance"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="newNgoWebsite" className="text-xs">Website</Label>
                            <Input
                              id="newNgoWebsite"
                              value={newNgoWebsite}
                              onChange={(event) => setNewNgoWebsite(event.target.value)}
                              placeholder="https://example.org"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="newNgoEmail" className="text-xs">Contact Email</Label>
                            <Input
                              id="newNgoEmail"
                              value={newNgoEmail}
                              onChange={(event) => setNewNgoEmail(event.target.value)}
                              placeholder="programs@example.org"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="newNgoCountry" className="text-xs">Country</Label>
                            <Input
                              id="newNgoCountry"
                              value={newNgoCountry}
                              onChange={(event) => setNewNgoCountry(event.target.value)}
                              placeholder="United States"
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4"
                          onClick={addManualNgoPartner}
                          disabled={addNgoPartnerMutation.isPending}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {addNgoPartnerMutation.isPending ? "Adding..." : "Add NGO Partner"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Program Goals Section */}
                  <div className="border-t pt-6 mt-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Target className="w-5 h-5 text-amber-500" />
                      <h3 className="text-lg font-semibold">Program Goals & Targets</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="targetParticipation" className="text-sm font-medium">Target Participation Rate (%)</Label>
                        <Input id="targetParticipation" type="number" defaultValue={40} placeholder="40" className="mt-1.5" />
                        <p className="text-xs text-gray-500 mt-1">Industry benchmark: 30-45%</p>
                      </div>
                      <div>
                        <Label htmlFor="targetHours" className="text-sm font-medium">Target Annual Hours</Label>
                        <Input id="targetHours" type="number" defaultValue={5000} placeholder="5000" className="mt-1.5" />
                        <p className="text-xs text-gray-500 mt-1">Based on employee count</p>
                      </div>
                      <div>
                        <Label htmlFor="vtoHoursPerEmployee" className="text-sm font-medium">VTO Hours per Employee</Label>
                        <Input id="vtoHoursPerEmployee" type="number" defaultValue={16} placeholder="16" className="mt-1.5" />
                        <p className="text-xs text-gray-500 mt-1">Typical: 8-24 hours/year</p>
                      </div>
                      <div>
                        <Label htmlFor="targetBeneficiaries" className="text-sm font-medium">Target Beneficiaries</Label>
                        <Input id="targetBeneficiaries" type="number" defaultValue={2000} placeholder="2000" className="mt-1.5" />
                        <p className="text-xs text-gray-500 mt-1">Direct impact goal</p>
                      </div>
                    </div>
                  </div>

                  {/* Notifications Section */}
                  <div className="border-t pt-6 mt-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Bell className="w-5 h-5 text-blue-500" />
                      <h3 className="text-lg font-semibold">Notification Preferences</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-sm">Weekly Digest Report</span>
                          </div>
                          <p className="text-xs text-gray-500">Receive weekly summary of volunteer activities</p>
                        </div>
                        <Checkbox defaultChecked />
                      </div>

                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-sm">New Project Alerts</span>
                          </div>
                          <p className="text-xs text-gray-500">Get notified when new volunteer opportunities match your SDGs</p>
                        </div>
                        <Checkbox defaultChecked />
                      </div>

                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-sm">Milestone Notifications</span>
                          </div>
                          <p className="text-xs text-gray-500">Celebrate when employees reach volunteer milestones</p>
                        </div>
                        <Checkbox defaultChecked />
                      </div>

                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-sm">Quarterly Reports</span>
                          </div>
                          <p className="text-xs text-gray-500">Auto-generate quarterly impact reports</p>
                        </div>
                        <Checkbox defaultChecked />
                      </div>
                    </div>
                  </div>

                  {/* Compliance & Reporting Section */}
                  <div className="border-t pt-6 mt-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Shield className="w-5 h-5 text-purple-500" />
                      <h3 className="text-lg font-semibold">Compliance & Reporting Standards</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-sm">GRI Standards Reporting</span>
                          </div>
                          <p className="text-xs text-gray-500">Enable Global Reporting Initiative aligned metrics</p>
                        </div>
                        <Checkbox defaultChecked />
                      </div>

                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-sm">B-Corp Metrics Tracking</span>
                          </div>
                          <p className="text-xs text-gray-500">Track metrics aligned with B-Corp certification</p>
                        </div>
                        <Checkbox />
                      </div>

                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <SettingsIcon className="w-4 h-4 text-orange-600" />
                            <span className="font-medium text-sm">UN SDG Progress Tracking</span>
                          </div>
                          <p className="text-xs text-gray-500">Map activities to UN Sustainable Development Goals</p>
                        </div>
                        <Checkbox defaultChecked />
                      </div>
                    </div>
                  </div>

                  {/* Employee Access Settings */}
                  <div className="border-t pt-6 mt-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Users className="w-5 h-5 text-teal-500" />
                      <h3 className="text-lg font-semibold">Employee Access & Permissions</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <span className="font-medium text-sm">Allow Self-Registration</span>
                          <p className="text-xs text-gray-500">Employees can register using company email domain</p>
                        </div>
                        <Checkbox defaultChecked />
                      </div>

                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <span className="font-medium text-sm">Require Manager Approval</span>
                          <p className="text-xs text-gray-500">VTO hours require manager sign-off</p>
                        </div>
                        <Checkbox />
                      </div>

                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <span className="font-medium text-sm">Enable Skills-Based Matching</span>
                          <p className="text-xs text-gray-500">Match employees to projects based on their skills</p>
                        </div>
                        <Checkbox defaultChecked />
                      </div>

                      <div>
                        <Label htmlFor="emailDomain" className="text-sm font-medium">Allowed Email Domains</Label>
                        <Input id="emailDomain" placeholder="@company.com, @subsidiary.com" className="mt-1.5" />
                        <p className="text-xs text-gray-500 mt-1">Comma-separated list of allowed email domains</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    type="submit"
                    className="ml-auto"
                    disabled={updatePartnerMutation.isPending}
                    data-testid="button-save-corporate-profile"
                  >
                    {updatePartnerMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <OnboardingTrigger variant="outline" showText={true} />
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </CSRLayout>
  );
}
