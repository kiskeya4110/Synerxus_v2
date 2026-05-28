import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getAuthHeaders } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile, useIsPWAMode } from "@/hooks/use-mobile";
import { Target, Clock, Calendar as CalendarIcon, Save, ArrowLeft, Camera, CheckCircle, MapPin, Users } from "lucide-react";
import { format, isBefore, isAfter, startOfDay } from "date-fns";
import type { User } from "@shared/schema";
import VolunteerNav from "@/components/layout/volunteer-nav";
import DashboardMobileNav from "@/components/dashboard/shared/DashboardMobileNav";
import OfflineBanner from "@/components/layout/offline-banner";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { saveActivityOffline } from "@/lib/offline-storage";

// Outcome template type from project.outcomeTemplates
interface OutcomeTemplate {
  name: string;
  unit: string;
  sdg: number;
  icon: string;
  sortOrder: number;
}

// KPI Tile Component
function KpiTile({
  template,
  selected,
  quantity,
  onSelect,
  onQuantityChange,
}: {
  template: OutcomeTemplate;
  selected: boolean;
  quantity: string;
  onSelect: () => void;
  onQuantityChange: (val: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all ${
        selected
          ? "border-emerald-500 bg-emerald-50 shadow-md"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <span className="text-2xl mb-1">{template.icon}</span>
      <span className={`text-sm font-medium leading-tight ${selected ? "text-emerald-800" : "text-slate-700"}`}>
        {template.name}
      </span>
      <span className="text-xs text-slate-400 mt-0.5">{template.unit}</span>

      {selected && (
        <div className="mt-3 w-full" onClick={(e) => e.stopPropagation()}>
          <Input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            placeholder="Qty"
            className="h-9 text-center text-lg font-semibold bg-white border-emerald-300 focus:border-emerald-500"
            autoFocus
          />
        </div>
      )}
    </button>
  );
}

export default function LogActivity() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const isPWAMode = useIsPWAMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse URL parameters for pre-selection
  const preselectedProjectId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('projectId') : null;

  // Offline sync state
  const storedUserIdForSync = typeof window !== 'undefined' ? parseInt(localStorage.getItem('currentUserId') || '0') : 0;
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncAt,
    syncAll,
    updatePendingCount,
    getCachedProjects,
    isWeakConnection
  } = useOfflineSync(storedUserIdForSync || undefined);

  // Cached offline data
  const [cachedProjects, setCachedProjects] = useState<any[]>([]);

  // Load cached data when offline
  useEffect(() => {
    const loadCachedData = async () => {
      if (!isOnline || isWeakConnection) {
        try {
          const projects = await getCachedProjects();
          if (projects) setCachedProjects(projects);
        } catch (err) {
          console.error('[LogActivity] Failed to load cached data:', err);
        }
      }
    };
    loadCachedData();
  }, [isOnline, isWeakConnection, getCachedProjects]);

  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(preselectedProjectId || "");
  const [selectedKpi, setSelectedKpi] = useState<string>("");
  const [kpiQuantity, setKpiQuantity] = useState<string>("");
  const [hoursWorked, setHoursWorked] = useState<string>("");
  const [beneficiaryCount, setBeneficiaryCount] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contributionType, setContributionType] = useState<"individual" | "collective">("individual");

  // Geolocation capture on mount
  const [geolocation, setGeolocation] = useState<{ lat: number; lng: number; accuracy: number; timestamp: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'pending' | 'granted' | 'denied' | 'unavailable'>('pending');
  const geoAttempted = useRef(false);

  useEffect(() => {
    if (geoAttempted.current) return;
    geoAttempted.current = true;

    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeolocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setGeoStatus('granted');
      },
      () => {
        setGeoStatus('denied');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // Fetch current user via the default authenticated query function
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me"],
  });

  // Fetch all projects for this user
  const { data: allProjects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", { userId: currentUser?.id }],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/projects?userId=${currentUser.id}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!currentUser?.id && isOnline && !isWeakConnection,
  });

  // Available projects - use cached when offline
  const availableProjects = useMemo(() => {
    if ((!isOnline || isWeakConnection) && cachedProjects.length > 0) {
      return cachedProjects;
    }
    return Array.isArray(allProjects) ? allProjects : [];
  }, [isOnline, isWeakConnection, cachedProjects, allProjects]);

  // Get the selected project
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return availableProjects.find((p: any) => p.id === parseInt(selectedProjectId));
  }, [selectedProjectId, availableProjects]);

  // Parse outcome templates from the selected project, with fallback to impactMetricName
  const outcomeTemplates: OutcomeTemplate[] = useMemo(() => {
    if (selectedProject?.outcomeTemplates) {
      const templates = selectedProject.outcomeTemplates;
      if (Array.isArray(templates) && templates.length > 0) {
        return [...templates].sort((a: OutcomeTemplate, b: OutcomeTemplate) => a.sortOrder - b.sortOrder);
      }
    }
    // Fallback: build from impactMetricName/Unit for projects created before outcomeTemplates
    if (selectedProject?.impactMetricName) {
      return [{
        name: selectedProject.impactMetricName,
        unit: selectedProject.impactMetricUnit || "units",
        sdg: selectedProject.primarySdg || 0,
        icon: "\u{1F4CA}",
        sortOrder: 0,
      }];
    }
    return [];
  }, [selectedProject]);

  // Get the selected template for SDG tagging
  const selectedTemplate = useMemo(() => {
    if (!selectedKpi) return null;
    return outcomeTemplates.find((t) => t.name === selectedKpi) || null;
  }, [selectedKpi, outcomeTemplates]);

  // Date restrictions
  const dateRestrictions = useMemo(() => {
    const today = startOfDay(new Date());

    if (!selectedProject) {
      return {
        toDate: today,
        disabled: (d: Date) => isAfter(startOfDay(d), today)
      };
    }

    const projectStartDate = selectedProject.startDate
      ? startOfDay(new Date(selectedProject.startDate))
      : undefined;
    const projectEndDate = selectedProject.endDate
      ? startOfDay(new Date(selectedProject.endDate))
      : undefined;

    const maxDate = projectEndDate && isBefore(projectEndDate, today)
      ? projectEndDate
      : today;

    return {
      fromDate: projectStartDate,
      toDate: maxDate,
      disabled: (d: Date) => {
        const checkDate = startOfDay(d);
        if (projectStartDate && isBefore(checkDate, projectStartDate)) return true;
        if (isAfter(checkDate, maxDate)) return true;
        return false;
      }
    };
  }, [selectedProject]);

  // Reset KPI selection when project changes
  useEffect(() => {
    setSelectedKpi("");
    setKpiQuantity("");
    setHoursWorked("");
    setContributionType("individual");
  }, [selectedProjectId]);

  // Auto-select project if only one available
  useEffect(() => {
    if (availableProjects.length === 1 && !selectedProjectId) {
      setSelectedProjectId(availableProjects[0].id.toString());
    }
  }, [availableProjects, selectedProjectId]);

  // Log activity mutation
  const logActivityMutation = useMutation({
    mutationFn: async (activityData: any) => {
      const authHeaders = await getAuthHeaders();
      const response = await fetch("/api/logs", {
        method: "POST",
        credentials: "include",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(activityData),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `Failed to log activity (${response.status})`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/volunteer-activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });

      toast({
        title: "Outcome Logged",
        description: "Your activity has been submitted for partner confirmation.",
      });

      // Reset form
      setSelectedProjectId("");
      setSelectedKpi("");
      setKpiQuantity("");
      setHoursWorked("");
      setBeneficiaryCount("");
      setPhotoUrl("");
      setDate(new Date());
      setContributionType("individual");
      setIsSubmitting(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit log. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProjectId) {
      toast({ title: "Missing Information", description: "Please select a project.", variant: "destructive" });
      return;
    }

    if (!selectedKpi) {
      toast({ title: "Missing Information", description: "Please select a KPI tile.", variant: "destructive" });
      return;
    }

    if (!kpiQuantity || parseFloat(kpiQuantity) <= 0) {
      toast({ title: "Missing Information", description: "Please enter a quantity for the selected KPI.", variant: "destructive" });
      return;
    }

    if (!hoursWorked || parseFloat(hoursWorked) <= 0) {
      toast({ title: "Missing Information", description: "Please enter the number of hours you worked.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    // Build SDG tags from the selected template + project SDGs
    const sdgTags: number[] = [];
    if (selectedTemplate?.sdg) sdgTags.push(selectedTemplate.sdg);
    if (selectedProject?.sdgGoals) {
      for (const sdg of selectedProject.sdgGoals) {
        if (!sdgTags.includes(sdg)) sdgTags.push(sdg);
      }
    }

    const activityData: any = {
      userId: currentUser?.id,
      projectId: parseInt(selectedProjectId),
      date: format(date, "yyyy-MM-dd"),
      hours: parseFloat(hoursWorked),
      outcomes: selectedKpi,
      outcomeText: selectedKpi,
      outcomeQuantity: parseFloat(kpiQuantity),
      outcomeType: contributionType === "collective" ? "shared" : "individual",
      beneficiaryCount: beneficiaryCount && parseFloat(beneficiaryCount) > 0 ? Math.round(parseFloat(beneficiaryCount)) : null,
      sdgTags: sdgTags.length > 0 ? sdgTags : null,
      geolocation: geolocation || null,
      evidenceUrls: photoUrl ? [photoUrl] : [],
      verificationStatus: 'pending'
    };

    // If offline, save locally
    if (!isOnline || isWeakConnection) {
      try {
        await saveActivityOffline({
          userId: currentUser?.id || 0,
          projectId: parseInt(selectedProjectId),
          hours: parseFloat(hoursWorked) || 0,
          date: format(date, "yyyy-MM-dd"),
          description: selectedKpi || '',
          skillsApplied: [],
        });

        await updatePendingCount();

        toast({
          title: isWeakConnection ? "Saved (Low Bandwidth Mode)" : "Saved Offline",
          description: "Your log will sync when you're back online.",
        });

        // Reset form
        setSelectedProjectId("");
        setSelectedKpi("");
        setKpiQuantity("");
        setHoursWorked("");
        setBeneficiaryCount("");
        setPhotoUrl("");
        setDate(new Date());
        setContributionType("individual");
        setIsSubmitting(false);
      } catch (err) {
        console.error('[LogActivity] Failed to save offline:', err);
        toast({
          title: "Error",
          description: "Failed to save offline. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
      }
      return;
    }

    logActivityMutation.mutate(activityData);
  };

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setPhotoUrl(data.url || data.path);
        toast({
          title: "Photo Uploaded",
          description: "Your photo evidence has been attached.",
        });
      }
    } catch (err) {
      console.error('[LogActivity] Photo upload failed:', err);
      toast({
        title: "Upload Failed",
        description: "Could not upload photo. You can submit without it.",
        variant: "destructive",
      });
    }
  };

  const isVolunteer = currentUser?.userType === 'volunteer';
  const canSubmit = !!selectedProjectId && !!selectedKpi && !!kpiQuantity && parseFloat(kpiQuantity) > 0 && !!hoursWorked && parseFloat(hoursWorked) > 0;

  return (
    <div className={`min-h-screen ${isPWAMode && isVolunteer ? 'bg-gradient-to-b from-slate-50 to-slate-100 pb-24' : 'bg-stone-50'}`}>
      <OfflineBanner
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        lastSyncAt={lastSyncAt}
        onSyncNow={() => syncAll()}
      />

      {isVolunteer && <VolunteerNav />}

      {(!isPWAMode || !isVolunteer) && (
        <div className="max-w-[1280px] mx-auto px-6 pt-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      )}

      <div className={isPWAMode && isVolunteer ? 'px-4 py-6' : ''} style={!(isPWAMode && isVolunteer) ? { maxWidth: '600px', margin: '0 auto', padding: '0 24px 24px 24px' } : undefined}>
        <Card className={isPWAMode && isVolunteer ? 'bg-white border-emerald-200/60 shadow-lg' : ''}>
          <CardHeader className="pb-4">
            <CardTitle className={`flex items-center gap-2 text-xl ${isPWAMode && isVolunteer ? 'text-slate-800' : ''}`}>
              <Target className="w-6 h-6 text-emerald-600" />
              Log Outcome
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Record what you delivered and select the impact KPI
            </p>
            {geoStatus === 'granted' && (
              <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                <MapPin className="w-3 h-3" />
                Location captured
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Project Selection */}
              <div className="space-y-2">
                <Label htmlFor="project" className="text-slate-700 font-medium">
                  Project <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="project" className="h-12 bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects.length === 0 ? (
                      <SelectItem value="none" disabled>Loading projects...</SelectItem>
                    ) : (
                      availableProjects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. KPI Tiles from outcomeTemplates */}
              {selectedProjectId && (
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">
                    Impact KPI <span className="text-red-500">*</span>
                  </Label>
                  {outcomeTemplates.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {outcomeTemplates.map((template) => (
                        <KpiTile
                          key={template.name}
                          template={template}
                          selected={selectedKpi === template.name}
                          quantity={selectedKpi === template.name ? kpiQuantity : ""}
                          onSelect={() => {
                            if (selectedKpi === template.name) {
                              setSelectedKpi("");
                              setKpiQuantity("");
                            } else {
                              setSelectedKpi(template.name);
                              setKpiQuantity("");
                            }
                          }}
                          onQuantityChange={setKpiQuantity}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <p className="text-sm text-slate-500">No KPIs set up for this project yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* 2b. Contribution Type */}
              {selectedProjectId && (
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">
                    Contribution Type <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setContributionType("individual")}
                      className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all ${
                        contributionType === "individual"
                          ? "border-emerald-500 bg-emerald-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <span className="text-2xl mb-1">🙋</span>
                      <span className={`text-sm font-medium ${contributionType === "individual" ? "text-emerald-800" : "text-slate-700"}`}>
                        Individual
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5">Your own contribution</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setContributionType("collective")}
                      className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all ${
                        contributionType === "collective"
                          ? "border-emerald-500 bg-emerald-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <span className="text-2xl mb-1">👥</span>
                      <span className={`text-sm font-medium ${contributionType === "collective" ? "text-emerald-800" : "text-slate-700"}`}>
                        Collective
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5">Team contribution</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Hours Worked */}
              <div className="space-y-2">
                <Label htmlFor="hours" className="text-slate-700 font-medium flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Hours Worked <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  placeholder="e.g. 2.5"
                  className="h-12 bg-slate-50 border-slate-200 text-slate-800"
                />
                <p className="text-xs text-slate-400">How many hours did you spend on this activity?</p>
              </div>

              {/* 3b. Partner-Reported Reach (optional) */}
              <div className="space-y-2">
                <Label htmlFor="beneficiaries" className="text-slate-700 font-medium flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-500" />
                  Partner-Reported Reach <span className="text-slate-400 text-xs font-normal">(optional)</span>
                </Label>
                <Input
                  id="beneficiaries"
                  type="number"
                  min="1"
                  step="1"
                  value={beneficiaryCount}
                  onChange={(e) => setBeneficiaryCount(e.target.value)}
                  placeholder="e.g. 30"
                  className="h-12 bg-slate-50 border-slate-200 text-slate-800"
                />
                <p className="text-xs text-slate-400">How many people were directly reached by this activity? Used for SDG reporting context.</p>
              </div>

              {/* 4. Date Selection */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start text-left font-normal bg-slate-50 border-slate-200"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => {
                        if (newDate) {
                          setDate(newDate);
                          setCalendarOpen(false);
                        }
                      }}
                      disabled={dateRestrictions.disabled}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* 5. Photo Upload - optional */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">
                  Photo Evidence (optional)
                </Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors">
                    <Camera className="w-5 h-5 text-slate-600" />
                    <span className="text-sm text-slate-600">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {photoUrl && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <CheckCircle className="w-4 h-4" />
                      Photo attached
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                disabled={isSubmitting || !canSubmit}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Submit for Partner Review
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-slate-500">
                Your activity record will be sent to the NGO for partner review
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Bottom Navigation — always shown for volunteers */}
      {isVolunteer && (
        <DashboardMobileNav
          userType="volunteer"
          activeTab="log"
          onLogImpact={() => {/* already on log page */}}
          onTabChange={(tab: string) => {
            if (tab === 'home') setLocation('/volunteer-dashboard');
            else if (tab === 'wallet') setLocation('/volunteer-dashboard');
            else if (tab === 'projects') setLocation('/volunteer-dashboard');
            else if (tab === 'history') setLocation('/my-work');
          }}
        />
      )}

    </div>
  );
}
