import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Clock, Calendar as CalendarIcon, Save, ArrowLeft, Plus, Minus, Camera, CheckCircle } from "lucide-react";
import { format, isBefore, isAfter, startOfDay } from "date-fns";
import type { User } from "@shared/schema";
import VolunteerNav from "@/components/layout/volunteer-nav";
import OfflineBanner from "@/components/layout/offline-banner";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { saveActivityOffline } from "@/lib/offline-storage";

// Hour Stepper Component - allows 0.5 hour increments
function HourStepper({
  value,
  onChange,
  min = 0.5,
  max = 24,
  step = 0.5
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const decrement = () => {
    if (value > min) {
      onChange(Math.max(min, value - step));
    }
  };

  const increment = () => {
    if (value < max) {
      onChange(Math.min(max, value + step));
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={decrement}
        disabled={value <= min}
        className="h-12 w-12 rounded-full border-2 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 disabled:opacity-50"
      >
        <Minus className="h-6 w-6 text-emerald-600" />
      </Button>
      <div className="text-center min-w-[100px]">
        <span className="text-4xl font-bold text-emerald-700">{value}</span>
        <span className="text-xl text-emerald-600 ml-1">hours</span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={increment}
        disabled={value >= max}
        className="h-12 w-12 rounded-full border-2 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 disabled:opacity-50"
      >
        <Plus className="h-6 w-6 text-emerald-600" />
      </Button>
    </div>
  );
}

export default function LogActivity() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
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

  // Form state - simplified for <60 second completion
  const [selectedProjectId, setSelectedProjectId] = useState<string>(preselectedProjectId || "");
  const [date, setDate] = useState<Date>(new Date());
  const [hours, setHours] = useState<number>(1);
  const [description, setDescription] = useState<string>("");
  const [outcomeType, setOutcomeType] = useState<string>("");
  const [outcomeQuantity, setOutcomeQuantity] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current user
  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me", storedUserId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    },
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

  // Get outcome templates from selected project
  const outcomeTemplates = useMemo(() => {
    if (!selectedProject?.outcomeTemplates) return [];
    return Array.isArray(selectedProject.outcomeTemplates)
      ? selectedProject.outcomeTemplates
      : [];
  }, [selectedProject]);

  // Date restrictions
  const dateRestrictions = useMemo(() => {
    const today = startOfDay(new Date());

    if (!selectedProject) {
      return {
        toDate: today,
        disabled: (date: Date) => isAfter(startOfDay(date), today)
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
      disabled: (date: Date) => {
        const checkDate = startOfDay(date);
        if (projectStartDate && isBefore(checkDate, projectStartDate)) return true;
        if (isAfter(checkDate, maxDate)) return true;
        return false;
      }
    };
  }, [selectedProject]);

  // Log activity mutation - uses new unified /api/logs endpoint
  const logActivityMutation = useMutation({
    mutationFn: async (activityData: any) => {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityData),
      });
      if (!response.ok) {
        // Fallback to old endpoint if new one doesn't exist
        const fallbackResponse = await fetch("/api/volunteer-activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activityData),
        });
        if (!fallbackResponse.ok) throw new Error("Failed to log activity");
        return fallbackResponse.json();
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/volunteer-activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });

      toast({
        title: "Impact Log Submitted",
        description: "Your hours have been submitted for verification.",
      });

      // Reset form
      setSelectedProjectId("");
      setHours(1);
      setDescription("");
      setOutcomeType("");
      setOutcomeQuantity("");
      setPhotoUrl("");
      setDate(new Date());
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

    if (!selectedProjectId || hours <= 0) {
      toast({
        title: "Missing Information",
        description: "Please select a project and enter hours.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const activityData = {
      userId: currentUser?.id,
      projectId: parseInt(selectedProjectId),
      date: format(date, "yyyy-MM-dd"),
      hours: hours,
      description: description || null,
      outcomeQuantity: outcomeQuantity ? parseInt(outcomeQuantity) : null,
      outcomes: outcomeType || null,
      evidenceUrls: photoUrl ? [photoUrl] : [],
      verificationStatus: 'pending'
    };

    // If offline, save locally
    if (!isOnline || isWeakConnection) {
      try {
        await saveActivityOffline({
          userId: currentUser?.id || 0,
          projectId: parseInt(selectedProjectId),
          hours: hours,
          date: format(date, "yyyy-MM-dd"),
          description: description || '',
          skillsApplied: [],
        });

        await updatePendingCount();

        toast({
          title: isWeakConnection ? "Saved (Low Bandwidth Mode)" : "Saved Offline",
          description: "Your log will sync when you're back online.",
        });

        // Reset form
        setSelectedProjectId("");
        setHours(1);
        setDescription("");
        setOutcomeType("");
        setOutcomeQuantity("");
        setPhotoUrl("");
        setDate(new Date());
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

  return (
    <div className={`min-h-screen ${isMobile && isVolunteer ? 'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 pb-24' : 'bg-[#f8f9fa]'}`}>
      {/* Offline Banner */}
      <OfflineBanner
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        lastSyncAt={lastSyncAt}
        onSyncNow={() => syncAll()}
      />

      {/* Volunteer Navigation */}
      {isVolunteer && <VolunteerNav />}

      {/* Back Button */}
      {(!isMobile || !isVolunteer) && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 0 24px' }}>
          <Button
            variant="ghost"
            onClick={() => setLocation('/volunteer-dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      )}

      {/* Main Content - Simplified Form */}
      <div className={isMobile && isVolunteer ? 'px-4 py-6' : ''} style={!(isMobile && isVolunteer) ? { maxWidth: '600px', margin: '0 auto', padding: '0 24px 24px 24px' } : undefined}>
        <Card className={isMobile && isVolunteer ? 'bg-white border-emerald-200/60 shadow-lg' : ''}>
          <CardHeader className="pb-4">
            <CardTitle className={`flex items-center gap-2 text-xl ${isMobile && isVolunteer ? 'text-slate-800' : ''}`}>
              <Clock className="w-6 h-6 text-emerald-600" />
              Log Your Impact
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Quick form - complete in under 60 seconds
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Selection */}
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

              {/* Date Selection */}
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

              {/* Hours - Stepper Component */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">
                  Hours <span className="text-red-500">*</span>
                </Label>
                <HourStepper value={hours} onChange={setHours} />
              </div>

              {/* Outcome Type - from project templates */}
              {outcomeTemplates.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="outcomeType" className="text-slate-700 font-medium">
                    Outcome Type
                  </Label>
                  <Select value={outcomeType} onValueChange={setOutcomeType}>
                    <SelectTrigger id="outcomeType" className="h-12 bg-slate-50 border-slate-200">
                      <SelectValue placeholder="What did you accomplish?" />
                    </SelectTrigger>
                    <SelectContent>
                      {outcomeTemplates.map((template: any, index: number) => (
                        <SelectItem key={index} value={template.name}>
                          {template.name} ({template.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Outcome Quantity - only show if outcome type selected */}
              {outcomeType && (
                <div className="space-y-2">
                  <Label htmlFor="outcomeQuantity" className="text-slate-700 font-medium">
                    Quantity
                  </Label>
                  <Input
                    id="outcomeQuantity"
                    type="number"
                    min="0"
                    value={outcomeQuantity}
                    onChange={(e) => setOutcomeQuantity(e.target.value)}
                    placeholder="How many?"
                    className="h-12 bg-slate-50 border-slate-200"
                  />
                </div>
              )}

              {/* Description - optional */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-700 font-medium">
                  Notes (optional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what you did..."
                  rows={2}
                  className="bg-slate-50 border-slate-200 resize-none"
                />
              </div>

              {/* Photo Upload - optional */}
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
                disabled={isSubmitting || !selectedProjectId || hours <= 0}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Submit for Verification
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-slate-500">
                Your log will be sent to the NGO for verification
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
