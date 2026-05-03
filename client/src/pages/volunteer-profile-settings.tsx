import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, getAuthHeaders } from "@/lib/queryClient";
import { Loader2, Check, LogOut, User, Plus, X, Clock, Heart, Building2, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VolunteerNav from "@/components/layout/volunteer-nav";
import WebBottomNav from "@/components/layout/web-bottom-nav";
import PWAHeader from "@/components/pwa/pwa-header";
import VolunteerPWANav from "@/components/layout/volunteer-pwa-nav";
import { useIsMobile, useIsPWAMode } from "@/hooks/use-mobile";
import Footer from "@/components/layout/footer";

// ============================================================================
// CONSTANTS - Match intake form exactly
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
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
];

type AvailabilitySlot = {
  day: string;
  startTime: string;
  endTime: string;
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function VolunteerProfileSettings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const isPWAMode = useIsPWAMode();
  const userType = localStorage.getItem("userType");
  const userId = localStorage.getItem("currentUserId");
  // Framing follows the actual app version (web vs installed PWA), not viewport width.
  const isVolunteerMobile = isPWAMode && userType === "volunteer";

  // Form state
  const [name, setName] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedSdgs, setSelectedSdgs] = useState<number[]>([]);
  const [selectedDiaspora, setSelectedDiaspora] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(5);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedEmployerId, setSelectedEmployerId] = useState<number | null>(null);
  const [employerSearch, setEmployerSearch] = useState("");

  // Fetch existing profile
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["/api/intake/volunteer-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/intake/volunteer-profile?userId=${userId}`,
        { headers, credentials: "include" }
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.volunteerProfile || data;
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Fetch CSR partners list for employer selection
  const { data: csrPartners = [] } = useQuery<{ id: number; companyName: string; logoUrl: string | null; industryType: string | null }[]>({
    queryKey: ["/api/csr/partners/list"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/csr/partners/list", { headers, credentials: "include" });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!userId,
  });

  // Populate form when profile loads
  useEffect(() => {
    if (profileData && !isInitialized) {
      setName(profileData.volunteerName || "");
      setSelectedSkills(Array.isArray(profileData.skills) ? profileData.skills : []);
      setSelectedSdgs(Array.isArray(profileData.preferredSdgs) ? profileData.preferredSdgs : []);
      setSelectedDiaspora(Array.isArray(profileData.diasporaConnections) ? profileData.diasporaConnections : []);
      setInterests(Array.isArray(profileData.interests) ? profileData.interests : []);
      setWeeklyHours(profileData.weeklyAvailability || 5);
      setAvailability(Array.isArray(profileData.availability) ? profileData.availability : []);
      setSelectedEmployerId(profileData.employerId ? Number(profileData.employerId) : null);
      setIsInitialized(true);
    }
  }, [profileData, isInitialized]);

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Toggle skill selection
  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else if (selectedSkills.length < 3) {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Toggle SDG selection
  const toggleSdg = (sdg: number) => {
    if (selectedSdgs.includes(sdg)) {
      setSelectedSdgs(selectedSdgs.filter((s) => s !== sdg));
    } else if (selectedSdgs.length < 3) {
      setSelectedSdgs([...selectedSdgs, sdg]);
    }
  };

  // Toggle diaspora selection
  const toggleDiaspora = (country: string) => {
    if (country === "None") {
      setSelectedDiaspora(selectedDiaspora.includes("None") ? [] : ["None"]);
      return;
    }
    const withoutNone = selectedDiaspora.filter((c) => c !== "None");
    if (selectedDiaspora.includes(country)) {
      setSelectedDiaspora(withoutNone.filter((c) => c !== country));
    } else {
      setSelectedDiaspora([...withoutNone, country]);
    }
  };

  // Add interest
  const addInterest = () => {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput("");
    }
  };

  // Remove interest
  const removeInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  // Add availability slot
  const addAvailabilitySlot = () => {
    setAvailability([
      ...availability,
      { day: "monday", startTime: "09:00", endTime: "17:00" },
    ]);
  };

  // Update availability slot
  const updateAvailabilitySlot = (
    index: number,
    field: keyof AvailabilitySlot,
    value: string
  ) => {
    const updated = [...availability];
    updated[index] = { ...updated[index], [field]: value };
    setAvailability(updated);
  };

  // Remove availability slot
  const removeAvailabilitySlot = (index: number) => {
    setAvailability(availability.filter((_, i) => i !== index));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const headers = await getAuthHeaders();

      const response = await fetch(
        `/api/intake/volunteer-profile?userId=${userId}`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            volunteerName: name,
            skills: selectedSkills,
            preferredSdgs: selectedSdgs,
            diasporaConnections: selectedDiaspora,
            interests: interests,
            weeklyAvailability: weeklyHours,
            availability: availability,
            onboardingCompleted: true,
            employerId: selectedEmployerId ?? undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/intake/volunteer-profile", userId],
      });
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved.",
      });
      // Navigate to dashboard after saving
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }
    if (selectedSkills.length === 0) {
      toast({
        title: "Skills Required",
        description: "Please select at least one skill.",
        variant: "destructive",
      });
      return;
    }
    if (selectedSdgs.length === 0) {
      toast({
        title: "SDG Required",
        description: "Please select at least one SDG interest.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate();
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!userId) {
      navigate("/login");
    }
  }, [userId, navigate]);

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isLoading = saveMutation.isPending;

  return (
    <div
      className={`min-h-screen pb-24 ${
        isVolunteerMobile ? "bg-[#f8f7f4] pt-14" : "bg-[#f8f9fa]"
      }`}
    >
      {/* PWA Header for mobile volunteer users */}
      {isVolunteerMobile && <PWAHeader />}

      {/* Desktop Navigation */}
      {!isVolunteerMobile && <VolunteerNav />}

      <div
        className={
          isVolunteerMobile
            ? "px-4 py-4 max-w-lg mx-auto"
            : "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        }
      >
        {/* Header */}
        <div className={`mb-6 ${isVolunteerMobile ? "" : "text-center"}`}>
          <h1
            className={`font-bold ${
              isVolunteerMobile ? "text-xl text-slate-800" : "text-2xl"
            }`}
          >
            Profile Settings
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Update your volunteer profile information
          </p>
        </div>

        <Card className={isVolunteerMobile ? "shadow-sm rounded-2xl" : ""}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            {/* Skills */}
            <div>
              <Label>Skills * (Select 1-3)</Label>
              <p className="text-xs text-gray-500 mb-2">
                {selectedSkills.length}/3 selected
              </p>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    disabled={
                      isLoading ||
                      (selectedSkills.length >= 3 &&
                        !selectedSkills.includes(skill))
                    }
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedSkills.includes(skill)
                        ? "bg-indigo-600 text-white"
                        : selectedSkills.length >= 3
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                  >
                    {selectedSkills.includes(skill) && (
                      <Check className="h-3 w-3 inline mr-1" />
                    )}
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* SDG Interests */}
            <div>
              <Label>SDG Interests * (Select 1-3)</Label>
              <p className="text-xs text-gray-500 mb-2">
                {selectedSdgs.length}/3 selected
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {SDG_OPTIONS.map((sdg) => (
                  <button
                    key={sdg.value}
                    type="button"
                    onClick={() => toggleSdg(sdg.value)}
                    disabled={
                      isLoading ||
                      (selectedSdgs.length >= 3 &&
                        !selectedSdgs.includes(sdg.value))
                    }
                    className={`p-2 rounded-lg border text-xs font-medium text-left transition-all ${
                      selectedSdgs.includes(sdg.value)
                        ? "text-white border-transparent"
                        : selectedSdgs.length >= 3
                        ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                    }`}
                    style={
                      selectedSdgs.includes(sdg.value)
                        ? { backgroundColor: sdg.color }
                        : {}
                    }
                  >
                    {sdg.value}. {sdg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Diaspora Connection */}
            <div>
              <Label>Diaspora Connection (Optional)</Label>
              <p className="text-xs text-gray-500 mb-2">
                Select countries you have cultural ties to
              </p>
              <div className="flex flex-wrap gap-2">
                {DIASPORA_OPTIONS.map((country) => (
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
                    {selectedDiaspora.includes(country) && (
                      <Check className="h-3 w-3 inline mr-1" />
                    )}
                    {country}
                  </button>
                ))}
              </div>
            </div>

            {/* Corporate Employer */}
            <div>
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                My Employer (Optional)
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                Link your volunteer hours to your employer's CSR programme so their team can track real-time impact.
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
                {/* "None" option */}
                <button
                  type="button"
                  onClick={() => setSelectedEmployerId(null)}
                  disabled={isLoading}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    selectedEmployerId === null
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-sm font-medium">Not linked to an employer</span>
                  {selectedEmployerId === null && <Check className="h-3.5 w-3.5 ml-auto" />}
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
                      onClick={() => setSelectedEmployerId(partner.id)}
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
                      {selectedEmployerId === partner.id && <Check className="h-3.5 w-3.5 ml-auto flex-shrink-0" />}
                    </button>
                  ))}
                {(csrPartners || []).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No companies registered yet.</p>
                )}
              </div>
              {selectedEmployerId && (
                <p className="text-xs text-indigo-600 mt-1.5 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Linked — your verified impact will appear on their CSR dashboard.
                </p>
              )}
            </div>

            {/* Interests & Causes */}
            <div>
              <Label className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Interests & Causes (Optional)
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add an interest (e.g., Education, Healthcare)"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addInterest();
                    }
                  }}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  onClick={addInterest}
                  variant="secondary"
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="gap-1">
                      {interest}
                      <button
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="ml-1 hover:bg-secondary-foreground/10 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Weekly Hours */}
            <div>
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Weekly Hours Available
              </Label>
              <Input
                type="number"
                min="1"
                max="40"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(parseInt(e.target.value) || 1)}
                className="mt-1 w-32"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Hours you can volunteer per week
              </p>
            </div>

            {/* Availability Schedule */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Availability Schedule (Optional)
                </Label>
                <Button
                  type="button"
                  onClick={addAvailabilitySlot}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Slot
                </Button>
              </div>

              {availability.length === 0 ? (
                <div className="text-center py-4 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-gray-500">
                    No availability slots. Click "Add Slot" to specify when
                    you're available.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availability.map((slot, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50"
                    >
                      <Select
                        value={slot.day}
                        onValueChange={(value) =>
                          updateAvailabilitySlot(index, "day", value)
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-[130px]">
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
                          updateAvailabilitySlot(index, "startTime", value)
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-[100px]">
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

                      <span className="text-gray-500">to</span>

                      <Select
                        value={slot.endTime}
                        onValueChange={(value) =>
                          updateAvailabilitySlot(index, "endTime", value)
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-[100px]">
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
                        onClick={() => removeAvailabilitySlot(index)}
                        className="text-red-500 hover:text-red-700"
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Logout Section */}
        <Card
          className={`mt-6 border-red-200 ${
            isVolunteerMobile ? "shadow-sm rounded-2xl" : ""
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Sign Out</h4>
                <p className="text-sm text-gray-500">End your current session</p>
              </div>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation — only the PWA installed app gets a fixed bottom nav.
          Web view uses the top VolunteerNav + Footer instead. */}
      {isVolunteerMobile && (
        <VolunteerPWANav userId={userId || undefined} activeTab="more" />
      )}

      {!isVolunteerMobile && <Footer />}
    </div>
  );
}
