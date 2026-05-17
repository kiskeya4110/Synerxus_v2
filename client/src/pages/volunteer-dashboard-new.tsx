import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Clock,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronRight,
  Award,
  Flame,
  Globe,
  Building2,
  FileText,
  BarChart3,
  Home,
  Menu,
  Search,
  User,
  X,
  LogOut,
  Briefcase,
  Settings,
  ShieldCheck,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, MetricCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, SDGBadge, StatusBadge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage, UserAvatar } from "@/components/ui/avatar";
import { Progress, CircularProgress, ProgressWithLabel } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Stat, StatGroup, CompactStat } from "@/components/ui/stat";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/empty-state";
import { Section, PageHeader, Grid, Stack, Divider } from "@/components/ui/section";
import Logo from "@/components/ui/logo";

// Layout Components
import VolunteerNav from "@/components/layout/volunteer-nav";
import Footer from "@/components/layout/footer";

// Hooks
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useViewportDetection } from "@/hooks/use-mobile";
import { useVolunteerPageData } from "@/hooks/use-volunteer-page-data";
import { formatDecimal } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/queryClient";

// SDG Data
const SDG_OPTIONS = [
  { value: 1, label: "No Poverty", color: "#E5243B" },
  { value: 2, label: "Zero Hunger", color: "#DDA63A" },
  { value: 3, label: "Good Health", color: "#4C9F38" },
  { value: 4, label: "Quality Education", color: "#C5192D" },
  { value: 5, label: "Gender Equality", color: "#FF3A21" },
  { value: 6, label: "Clean Water", color: "#26BDE2" },
  { value: 7, label: "Affordable Energy", color: "#FCC30B" },
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

// Hierarchical impact sectors with activities, metrics, and SDG auto-mapping
const IMPACT_SECTORS = [
  {
    value: "environment", label: "Environment", icon: "🌱",
    sdgs: [13, 15],
    activities: [
      { value: "tree_planting", label: "Tree Planting", metrics: [
        { value: "trees_planted", label: "Trees Planted", unit: "trees" },
        { value: "saplings_maintained", label: "Saplings Maintained", unit: "saplings" },
        { value: "acres_reforested", label: "Acres Reforested", unit: "acres" },
      ]},
      { value: "cleanups", label: "Cleanups", metrics: [
        { value: "waste_collected_kg", label: "Waste Collected", unit: "kg" },
        { value: "bags_filled", label: "Bags Filled", unit: "bags" },
        { value: "area_cleaned_m", label: "Area Cleaned", unit: "meters" },
      ]},
      { value: "conservation", label: "Conservation", metrics: [
        { value: "species_protected", label: "Species Protected", unit: "species" },
        { value: "hectares_monitored", label: "Hectares Monitored", unit: "hectares" },
      ]},
      { value: "water_sanitation", label: "Water & Sanitation", metrics: [
        { value: "water_provided", label: "Liters of Water Provided", unit: "liters" },
        { value: "water_filters_installed", label: "Water Filters Installed", unit: "filters" },
        { value: "wells_constructed", label: "Wells Constructed", unit: "wells" },
      ]},
    ],
  },
  {
    value: "education", label: "Education", icon: "📚",
    sdgs: [4],
    activities: [
      { value: "tutoring", label: "Tutoring", metrics: [
        { value: "students_tutored", label: "Students Tutored", unit: "students" },
        { value: "sessions_held", label: "Sessions Held", unit: "sessions" },
        { value: "subjects_covered", label: "Subjects Covered", unit: "subjects" },
      ]},
      { value: "workshops", label: "Workshops", metrics: [
        { value: "attendees", label: "Attendees", unit: "people" },
        { value: "workshops_delivered", label: "Workshops Delivered", unit: "workshops" },
      ]},
      { value: "mentoring", label: "Mentoring", metrics: [
        { value: "mentees_supported", label: "Mentees Supported", unit: "mentees" },
        { value: "mentoring_hours", label: "Mentoring Hours", unit: "hours" },
      ]},
    ],
  },
  {
    value: "health", label: "Health", icon: "🏥",
    sdgs: [3],
    activities: [
      { value: "medical_outreach", label: "Medical Outreach", metrics: [
        { value: "patients_seen", label: "Patients Seen", unit: "patients" },
        { value: "consultations", label: "Consultations Given", unit: "consultations" },
        { value: "screenings", label: "Screenings Conducted", unit: "screenings" },
      ]},
      { value: "nutrition", label: "Nutrition Programs", metrics: [
        { value: "meals_served", label: "Meals Served", unit: "meals" },
        { value: "food_kits_distributed", label: "Food Kits Distributed", unit: "kits" },
      ]},
      { value: "wellness", label: "Wellness & Fitness", metrics: [
        { value: "participants", label: "Participants", unit: "people" },
        { value: "wellness_sessions", label: "Sessions Led", unit: "sessions" },
      ]},
    ],
  },
  {
    value: "economic", label: "Economic", icon: "💼",
    sdgs: [1, 8],
    activities: [
      { value: "skills_training", label: "Skills Training", metrics: [
        { value: "trainees", label: "Trainees", unit: "people" },
        { value: "certifications_earned", label: "Certifications Earned", unit: "certs" },
      ]},
      { value: "microfinance", label: "Microfinance Support", metrics: [
        { value: "loans_facilitated", label: "Loans Facilitated", unit: "loans" },
        { value: "businesses_supported", label: "Businesses Supported", unit: "businesses" },
      ]},
      { value: "job_placement", label: "Job Placement", metrics: [
        { value: "placements_made", label: "Placements Made", unit: "placements" },
        { value: "resumes_reviewed", label: "Resumes Reviewed", unit: "resumes" },
      ]},
    ],
  },
  {
    value: "community", label: "Community", icon: "🏘️",
    sdgs: [11],
    activities: [
      { value: "housing", label: "Housing & Shelter", metrics: [
        { value: "homes_built", label: "Homes Built", unit: "homes" },
        { value: "repairs_completed", label: "Repairs Completed", unit: "repairs" },
      ]},
      { value: "event_organizing", label: "Event Organizing", metrics: [
        { value: "events_organized", label: "Events Organized", unit: "events" },
        { value: "attendees_reached", label: "Attendees Reached", unit: "people" },
      ]},
      { value: "donations", label: "Donation Drives", metrics: [
        { value: "items_donated", label: "Items Donated", unit: "items" },
        { value: "funds_raised", label: "Funds Raised", unit: "USD" },
      ]},
      { value: "general_outreach", label: "General Outreach", metrics: [
        { value: "lives_impacted", label: "Lives Impacted", unit: "lives" },
        { value: "households_served", label: "Households Served", unit: "households" },
        { value: "animals_rescued", label: "Animals Rescued", unit: "animals" },
      ]},
    ],
  },
  {
    value: "other", label: "Other", icon: "✨",
    sdgs: [],
    activities: [
      { value: "other_activity", label: "Other Activity", metrics: [
        { value: "other", label: "Other (Specify in Description)", unit: "count" },
      ]},
    ],
  },
];

// ============================================================================
// Impact Log Form Component
// ============================================================================
interface ImpactLogFormProps {
  userId: number;
  projects: any[];
  onSuccess?: () => void;
}

function ImpactLogForm({ userId, projects, onSuccess }: ImpactLogFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    projectId: "",
    hours: "",
    sector: "",
    activity: "",
    outcome: "",
    outcomeValue: "",
    description: "",
    sdgs: [] as number[],
  });
  const [showSdgOverride, setShowSdgOverride] = useState(false);

  const logMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const authHeaders = await getAuthHeaders();
      const response = await fetch("/api/logs", {
        method: "POST",
        credentials: "include",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: parseInt(data.projectId),
          hours: parseFloat(data.hours),
          outcomes: data.outcome,
          outcomeText: data.activity ? `${data.activity}: ${data.outcome}` : data.outcome,
          outcomeQuantity: data.outcomeValue ? parseInt(data.outcomeValue) : null,
          outcomeType: "individual",
          description: data.description,
          sdgTags: data.sdgs.length > 0 ? data.sdgs : null,
          date: new Date().toISOString(),
          verificationStatus: "pending",
        }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || "Failed to log impact");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Impact Logged!", description: "Your contribution has been submitted for verification." });
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      setFormData({ projectId: "", hours: "", sector: "", activity: "", outcome: "", outcomeValue: "", description: "", sdgs: [] });
      setShowSdgOverride(false);
      onSuccess?.();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log impact. Please try again.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.hours) {
      toast({ title: "Required Fields", description: "Please select a project and enter hours.", variant: "destructive" });
      return;
    }
    logMutation.mutate(formData);
  };

  const toggleSdg = (sdg: number) => {
    setFormData(prev => ({
      ...prev,
      sdgs: prev.sdgs.includes(sdg)
        ? prev.sdgs.filter(s => s !== sdg)
        : [...prev.sdgs, sdg].slice(0, 3), // Max 3 SDGs
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Project</label>
        <Select value={formData.projectId} onValueChange={(v) => setFormData(prev => ({ ...prev, projectId: v }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id.toString()}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hours Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Hours Contributed</label>
        <div className="relative">
          <Input
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            placeholder="0.0"
            value={formData.hours}
            onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
            className="text-2xl font-bold h-14 pl-4 pr-16"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
            hours
          </span>
        </div>
      </div>

      {/* Impact Sector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Impact Sector (Optional)</label>
        <div className="flex flex-wrap gap-2">
          {IMPACT_SECTORS.map((sector) => (
            <button
              key={sector.value}
              type="button"
              onClick={() => {
                const isDeselect = formData.sector === sector.value;
                setFormData(prev => ({
                  ...prev,
                  sector: isDeselect ? "" : sector.value,
                  activity: "",
                  outcome: "",
                  outcomeValue: "",
                  sdgs: isDeselect ? [] : sector.sdgs,
                }));
                if (isDeselect) setShowSdgOverride(false);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                formData.sector === sector.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-stone-50"
              )}
            >
              <span>{sector.icon}</span>
              <span>{sector.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity Dropdown — visible when sector is chosen */}
      {formData.sector && (() => {
        const selectedSector = IMPACT_SECTORS.find(s => s.value === formData.sector);
        if (!selectedSector) return null;
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Activity</label>
            <Select
              value={formData.activity}
              onValueChange={(v) => setFormData(prev => ({ ...prev, activity: v, outcome: "", outcomeValue: "" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an activity" />
              </SelectTrigger>
              <SelectContent>
                {selectedSector.activities.map((act) => (
                  <SelectItem key={act.value} value={act.value}>
                    {act.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })()}

      {/* Metric + Quantity — visible when activity is chosen */}
      {formData.sector && formData.activity && (() => {
        const selectedSector = IMPACT_SECTORS.find(s => s.value === formData.sector);
        const selectedActivity = selectedSector?.activities.find(a => a.value === formData.activity);
        if (!selectedActivity) return null;
        const selectedMetric = selectedActivity.metrics.find(m => m.value === formData.outcome);
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Metric &amp; Quantity</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={formData.outcome}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, outcome: v, outcomeValue: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedActivity.metrics.map((metric) => (
                      <SelectItem key={metric.value} value={metric.value}>
                        {metric.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.outcome && (
                <div className="relative w-32">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.outcomeValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, outcomeValue: e.target.value }))}
                    className="pr-12"
                  />
                  {selectedMetric && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {selectedMetric.unit}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* SDG Auto-Mapping + Override */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">SDG Goals</label>
          <button
            type="button"
            onClick={() => setShowSdgOverride(prev => !prev)}
            className="text-xs text-primary hover:underline"
          >
            {showSdgOverride ? "Use auto-mapped" : "Adjust SDGs"}
          </button>
        </div>

        {/* Auto-mapped badges */}
        {!showSdgOverride && (
          <div className="flex flex-wrap gap-2">
            {formData.sdgs.length > 0 ? formData.sdgs.map((sdgVal) => {
              const sdg = SDG_OPTIONS.find(s => s.value === sdgVal);
              return sdg ? (
                <span
                  key={sdg.value}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-sm"
                  style={{ backgroundColor: sdg.color }}
                >
                  SDG {sdg.value}: {sdg.label}
                </span>
              ) : null;
            }) : (
              <span className="text-xs text-muted-foreground">Select a sector to auto-map SDGs</span>
            )}
          </div>
        )}

        {/* Manual SDG picker */}
        {showSdgOverride && (
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap gap-2">
              {SDG_OPTIONS.map((sdg) => (
                <Tooltip key={sdg.value}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => toggleSdg(sdg.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        formData.sdgs.includes(sdg.value)
                          ? "text-white shadow-md"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}
                      style={formData.sdgs.includes(sdg.value) ? { backgroundColor: sdg.color } : {}}
                    >
                      SDG {sdg.value}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sdg.color }}
                      />
                      <span className="font-medium">SDG {sdg.value}: {sdg.label}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Description (Optional)</label>
        <Textarea
          placeholder="Briefly describe what you did..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          showCount
          maxLength={500}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="accent"
        size="lg"
        fullWidth
        loading={logMutation.isPending}
      >
        <Plus className="h-5 w-5 mr-2" />
        Submit Activity
      </Button>
    </form>
  );
}

// ============================================================================
// Impact Score Card Component
// ============================================================================
interface ImpactScoreCardProps {
  score: number;
  trend?: number;
  hoursLogged: number;
  projectsActive: number;
  onViewDetails?: () => void;
}

function ImpactScoreCard({ score, trend, hoursLogged, projectsActive, onViewDetails }: ImpactScoreCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Contribution Summary
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-foreground tabular-nums">
                {formatDecimal(score)}
              </span>
              <span className="text-lg text-muted-foreground">pts</span>
            </div>
            {trend !== undefined && trend > 0 && (
              <div className="flex items-center gap-1 mt-1 text-success text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>+{trend}% this month</span>
              </div>
            )}
          </div>
          <CircularProgress value={Math.min((score / 100) * 100, 100)} size={64} color="accent" showValue />
        </div>

        <Divider className="my-4" />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Hours Logged</span>
            </div>
            <p className="text-xl font-semibold text-foreground">{hoursLogged}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-xs">Active Projects</span>
            </div>
            <p className="text-xl font-semibold text-foreground">{projectsActive}</p>
          </div>
        </div>

        {onViewDetails && (
          <Button variant="ghost" className="w-full mt-4" onClick={onViewDetails}>
            View Score Breakdown
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Recent Impact Logs Component
// ============================================================================
interface ImpactLog {
  id: number;
  projectName: string;
  hours: number;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
  outcomeType?: string;
  outcomeValue?: number;
  sdgGoals?: number[];
}

interface RecentLogsProps {
  logs: ImpactLog[];
  isLoading?: boolean;
}

function RecentLogs({ logs, isLoading }: RecentLogsProps) {
  if (isLoading) {
    return <LoadingState message="Loading activity..." />;
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Submit your first activity to get started"
        size="sm"
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {logs.map((log) => (
        <div key={log.id} className="py-3 space-y-1.5">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{log.projectName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {log.hours != null && log.hours > 0 ? ` · ${log.hours}h` : ''}
              </p>
            </div>
            <StatusBadge status={log.status} size="sm" />
          </div>
          {(log.outcomeType || log.outcomeValue) && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 pl-13">
              <Target className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{log.outcomeType}{log.outcomeValue ? ` — ${log.outcomeValue}` : ''}</span>
            </div>
          )}
          {log.sdgGoals && log.sdgGoals.length > 0 && (
            <div className="flex gap-1 flex-wrap pl-13">
              {log.sdgGoals.map((sdg: number) => {
                const sdgInfo = SDG_OPTIONS.find(s => s.value === sdg);
                return sdgInfo ? (
                  <span key={sdg} className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: sdgInfo.color }}>
                    SDG {sdg}: {sdgInfo.label}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Active Projects Component
// ============================================================================
interface Project {
  id: number;
  name: string;
  organizationName: string;
  status: string;
  completionPercentage: number;
  hoursLogged: number;
  sdgGoals: number[];
}

interface ActiveProjectsProps {
  projects: Project[];
  isLoading?: boolean;
}

function ActiveProjects({ projects, isLoading }: ActiveProjectsProps) {
  if (isLoading) {
    return <LoadingState message="Loading projects..." />;
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No active projects"
        description="Join a project to start submitting verified activity records"
        action={{ label: "View Projects", onClick: () => {} }}
        size="sm"
      />
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <Card key={project.id} variant="default" interactive className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate">{project.name}</h4>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {project.organizationName}
              </p>
            </div>
            <Badge variant={project.status === "active" ? "success" : "secondary"} size="sm">
              {project.status}
            </Badge>
          </div>

          <ProgressWithLabel
            label="Progress"
            value={project.completionPercentage}
            size="sm"
            indicatorColor="primary"
          />

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex gap-1">
              {project.sdgGoals.slice(0, 3).map((sdg) => (
                <SDGBadge key={sdg} sdg={sdg as any} size="sm" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{project.hoursLogged}h logged</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Impact Streak Component
// ============================================================================
interface StreakProps {
  currentStreak: number;
  longestStreak: number;
  lastLogDate?: string;
}

function ImpactStreakCard({ currentStreak, longestStreak, lastLogDate }: StreakProps) {
  const isActiveToday = lastLogDate === new Date().toISOString().split('T')[0];

  return (
    <Card variant="metric" className="border-l-accent">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center",
            currentStreak > 0 ? "bg-accent/20" : "bg-secondary"
          )}>
            <Flame className={cn(
              "h-7 w-7",
              currentStreak > 0 ? "text-accent" : "text-muted-foreground"
            )} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Impact Streak
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{currentStreak}</span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Longest: {longestStreak} days
            </p>
          </div>
          {!isActiveToday && currentStreak > 0 && (
            <Badge variant="warning" size="sm">Log today!</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================
export default function VolunteerDashboardNew() {
  const { user, dbUser, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { isMobile, isLoading: isViewportLoading } = useViewportDetection();

  // Use dbUser from auth sync as authoritative source, fallback to localStorage
  const userId = dbUser?.id?.toString() || localStorage.getItem("currentUserId");
  const userType = dbUser?.userType || localStorage.getItem("userType");

  // Keep localStorage in sync when dbUser resolves (prevents stale userId on next load)
  useEffect(() => {
    if (dbUser?.id) {
      const storedId = localStorage.getItem("currentUserId");
      if (storedId !== String(dbUser.id)) {
        console.log("[VolunteerDashboard] Syncing localStorage userId:", storedId, "->", dbUser.id);
        localStorage.setItem("currentUserId", String(dbUser.id));
      }
    }
  }, [dbUser]);

  const [showLogModal, setShowLogModal] = useState(false);
  const [mobileTab, setMobileTab] = useState<'home' | 'wallet' | 'projects'>('home');
  const [menuOpen, setMenuOpen] = useState(false);

  // Redirect non-volunteers
  useEffect(() => {
    if (userType === "corporate-partner") {
      navigate("/csr-dashboard");
    } else if (userType === "organization") {
      navigate("/organization-dashboard");
    }
  }, [userType, navigate]);

  // All volunteer page data — errors are surfaced via toast below, not swallowed
  const {
    userData: currentUser,
    summaryData: dashboardData,
    projects,
    logs: recentLogs,
    assignments: assignedProjects,
    isLoading: isLoadingUser,
    isLoadingDashboard,
    isLoadingLogs,
    isLoadingAssigned,
    errors: dataErrors,
  } = useVolunteerPageData(userId, authLoading);

  // Surface data-fetch failures to the user instead of silently returning empty state
  useEffect(() => {
    if (dataErrors.user) toast({ title: "Could not load profile", description: "Check your connection and try again.", variant: "destructive" });
  }, [dataErrors.user]);
  useEffect(() => {
    if (dataErrors.summary) toast({ title: "Could not load dashboard data", description: "Some metrics may be unavailable.", variant: "destructive" });
  }, [dataErrors.summary]);
  useEffect(() => {
    if (dataErrors.logs) toast({ title: "Could not load activity logs", description: "Recent logs may be unavailable.", variant: "destructive" });
  }, [dataErrors.logs]);
  useEffect(() => {
    if (dataErrors.assignments) toast({ title: "Could not load assigned projects", description: "Project list may be unavailable.", variant: "destructive" });
  }, [dataErrors.assignments]);

  // Matched opportunities derived from dashboard summary
  const matchedProjects = (dashboardData?.matchedOpportunities || []).slice(0, 4);
  const isLoadingMatches = isLoadingDashboard;

  // Demo data fallback
  const demoUser = useMemo(() => {
    if (userId && userType === "volunteer" && !currentUser) {
      return {
        id: parseInt(userId),
        displayName: "Demo Volunteer",
        email: "demo@example.com",
        userType: "volunteer",
      };
    }
    return null;
  }, [userId, userType, currentUser]);

  const activeUser = currentUser || demoUser;

  // Calculate stats from server dashboard data
  const stats = useMemo(() => {
    const data = dashboardData || {};
    return {
      hoursLogged: data.totalHours || data.verifiedHours || 0,
      verifiedHours: data.verifiedHours || 0,
      verifiedActivities: data.verifiedCount || recentLogs.filter((l: any) => l.status === "verified" || l.status === "approved").length,
      projectsActive: data.activeProjects || projects.filter((p: any) => p.status === "active" || p.status === "in progress").length || 0,
      totalProjects: data.totalProjects || projects.length || 0,
      completedTasks: data.completedTasks || 0,
      totalTasks: data.totalTasks || 0,
      skillsCount: data.skillsCount || data.volunteerProfile?.skills?.length || 0,
      sdgsAddressed: data.sdgsAddressed || 0,
      peopleReached: data.totalPeopleImpacted || 0,
      pendingVerifications: recentLogs.filter((l: any) => l.status === "pending").length,
    };
  }, [dashboardData, projects, recentLogs]);

  // Loading state - wait for auth, viewport detection, and user data
  if (authLoading || (isLoadingUser && !demoUser) || isViewportLoading) {
    return (
      <div className="min-h-screen pwa-gradient-bg flex items-center justify-center">
        <LoadingState message="Loading your dashboard..." />
      </div>
    );
  }

  // Auth check
  if (!userId || !activeUser) {
    return (
      <div className="min-h-screen pwa-gradient-bg flex items-center justify-center">
        <ErrorState
          title="Not Authenticated"
          message="Please log in to view your dashboard."
          retry={() => navigate("/login")}
        />
      </div>
    );
  }

  // Mobile PWA View - Simple Impact Wallet per redesign spec
  if (isMobile === true) {
    // Calculate simple metrics for Impact Wallet - prefer server-computed values
    const totalOutcomes = recentLogs.reduce((sum: number, log: any) => sum + (log.outcomeValue || 0), 0);
    const skillsUsed = stats.skillsCount;
    const sdgsContributed = stats.sdgsAddressed || new Set(projects.flatMap((p: any) => p.sdgGoals || [])).size;

    return (
      <div className="fixed inset-0 h-[100dvh] pwa-gradient-bg flex flex-col overflow-hidden">
        {/* Header with Logo and Menu */}
        <header className="flex-shrink-0 bg-white/90 backdrop-blur-sm border-b border-stone-200 z-30">
          <div className="flex items-center justify-between px-5 py-3.5">
            {/* Logo — 40% */}
            <div className="flex-shrink-0" style={{ width: '40%' }}>
              <Logo size="xs" variant="full" theme="light" />
            </div>
            {/* Type label — 30% */}
            <div className="flex-shrink-0 flex justify-center" style={{ width: '30%' }}>
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest">Impact Wallet</span>
            </div>
            {/* Menu — 20% */}
            <div className="flex-shrink-0 flex justify-end" style={{ width: '20%' }}>
              <button
                onClick={() => setMenuOpen(true)}
                className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors touch-manipulation active:scale-95"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5 text-stone-600" />
              </button>
            </div>
          </div>
        </header>

        {/* Slide-out Menu */}
        {menuOpen && (
          <div className="fixed inset-0 z-[200] flex">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <div className="relative ml-auto w-[75%] max-w-[280px] h-full flex flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300" style={{ maxHeight: '100dvh' }}>
              {/* Header */}
              <div className="flex-shrink-0 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 px-4 py-3 pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.25rem))]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/60 text-xs font-medium">Menu</span>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-10 w-10 border-2 border-white/30 shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-base font-semibold">
                      {(activeUser?.displayName || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {activeUser?.displayName || activeUser?.username || 'Volunteer'}
                    </p>
                    <p className="text-white/60 text-xs truncate">
                      {activeUser?.email || ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="flex-1 min-h-0 overflow-y-auto py-1.5">
                {[
                  { icon: BarChart3, label: "Impact Wallet", action: () => { setMenuOpen(false); setMobileTab('wallet'); } },
                  { icon: Target, label: "My Projects", action: () => { setMenuOpen(false); setMobileTab('projects'); } },
                  { icon: Plus, label: "Log Activity", action: () => { setMenuOpen(false); setShowLogModal(true); } },
                  { icon: Briefcase, label: "My Work", action: () => { setMenuOpen(false); window.scrollTo(0, 0); navigate('/my-work'); } },
                  { icon: FileText, label: "Log Activity", action: () => { setMenuOpen(false); window.scrollTo(0, 0); navigate('/log-activity'); } },
                  { icon: Settings, label: "Profile Settings", action: () => { setMenuOpen(false); window.scrollTo(0, 0); navigate('/volunteer-profile-settings'); } },
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left text-stone-700 hover:bg-stone-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-stone-600" />
                    </div>
                    <span className="font-medium text-sm flex-1">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </button>
                ))}
              </div>

              {/* Admin Section */}
              {dbUser?.isAdmin && (
                <div className="flex-shrink-0 border-t border-stone-200 px-3 pt-2 pb-1">
                  <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider px-1 py-1.5">Admin</p>
                  <button
                    onClick={() => { setMenuOpen(false); window.scrollTo(0, 0); navigate('/admin/pilot-dashboard'); }}
                    className="w-full flex items-center gap-3 px-1 py-2.5 transition-colors text-left text-cyan-700 hover:bg-cyan-50 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-cyan-600" />
                    </div>
                    <span className="font-medium text-sm flex-1">Pilot Dashboard</span>
                    <ChevronRight className="w-4 h-4 text-cyan-400" />
                  </button>
                </div>
              )}

              {/* Logout */}
              <div className="flex-shrink-0 border-t border-stone-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
                    navigate('/');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-1 pb-20 space-y-2">
          {/* Home Tab Content */}
          {mobileTab === 'home' && (
            <>
              {/* Welcome Section */}
              <div className="text-center">
                <h1 className="text-base font-bold text-stone-800 leading-tight">
                  Welcome back{activeUser?.displayName ? `, ${activeUser.displayName.split(' ')[0]}` : ''}
                </h1>
                <p className="text-stone-600 text-xs">Your contribution record</p>
              </div>

              {/* Quick Stats Summary */}
              <div className="bg-gradient-to-br from-emerald-700 to-teal-800 rounded-2xl p-3 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-white font-semibold text-sm">Activity Summary</h2>
                  {stats.pendingVerifications > 0 && (
                    <span className="text-xs text-amber-200 bg-amber-500/30 px-2 py-0.5 rounded-full">
                      {stats.pendingVerifications} pending
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.verifiedHours || stats.hoursLogged}</p>
                    <p className="text-xs text-emerald-200">Confirmed Hrs</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalProjects}</p>
                    <p className="text-xs text-emerald-200">Projects</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.sdgsAddressed}</p>
                    <p className="text-xs text-emerald-200">SDGs</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h2 className="text-stone-800 font-semibold mb-2">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowLogModal(true)}
                    className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col items-center gap-1.5 hover:bg-stone-50 transition-colors shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-stone-800">Log Activity</span>
                    <span className="text-[10px] text-stone-500">Submit hours and output</span>
                  </button>
                  <button
                    onClick={() => navigate('/discover-opportunities')}
                    className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col items-center gap-1.5 hover:bg-stone-50 transition-colors shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Search className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-stone-800">Find Projects</span>
                    <span className="text-[10px] text-stone-500">Browse matched opportunities</span>
                  </button>
                  <button
                    onClick={() => setMobileTab('wallet')}
                    className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col items-center gap-1.5 hover:bg-stone-50 transition-colors shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium text-stone-800">Impact Wallet</span>
                    <span className="text-[10px] text-stone-500">View contribution history</span>
                  </button>
                  <button
                    onClick={() => navigate('/volunteer-profile-settings')}
                    className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col items-center gap-1.5 hover:bg-stone-50 transition-colors shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-stone-800">My Profile</span>
                    <span className="text-[10px] text-stone-500">Skills and availability</span>
                  </button>
                </div>
              </div>

              {/* Recent Activity Preview */}
              {recentLogs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-stone-800 font-semibold">Recent Activity</h2>
                    <button
                      onClick={() => navigate('/my-work')}
                      className="text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100 shadow-sm">
                    {recentLogs.slice(0, 5).map((log: any) => (
                      <div key={log.id} className="px-4 py-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-stone-800">{log.projectName || 'Project'}</p>
                            <p className="text-xs text-stone-500">
                              {log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                              {log.hours != null && log.hours > 0 ? ` · ${log.hours}h` : ''}
                            </p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                            log.status === 'verified' || log.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            log.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {log.status === 'approved' ? 'Verified' : log.status === 'rejected' ? 'Rejected' : 'Pending'}
                          </span>
                        </div>
                        {(log.outcomeType || log.outcomeValue) && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                            <Target className="h-3 w-3 flex-shrink-0" />
                            <span>{log.outcomeType}{log.outcomeValue ? ` — ${log.outcomeValue}` : ''}</span>
                          </div>
                        )}
                        {log.sdgGoals && log.sdgGoals.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {log.sdgGoals.map((sdg: number) => {
                              const sdgInfo = SDG_OPTIONS.find(s => s.value === sdg);
                              return sdgInfo ? (
                                <span key={sdg} className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ backgroundColor: sdgInfo.color }}>
                                  SDG {sdg}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Wallet Tab Content */}
          {mobileTab === 'wallet' && (
            <>
              {/* Core Metrics - 2x2 Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Total Hours */}
                <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-stone-500 uppercase">Hours</span>
                  </div>
                  <p className="text-2xl font-bold text-stone-800">{stats.hoursLogged}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{stats.verifiedHours} confirmed</p>
                </div>

                {/* People Reached */}
                <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-stone-500 uppercase">Reached</span>
                  </div>
                  <p className="text-2xl font-bold text-stone-800">{stats.peopleReached}</p>
                  <p className="text-xs text-stone-500 mt-0.5">partner-reported reach</p>
                </div>

                {/* SDGs Addressed */}
                <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-stone-500 uppercase">SDGs</span>
                  </div>
                  <p className="text-2xl font-bold text-stone-800">{stats.sdgsAddressed}</p>
                  <p className="text-xs text-stone-500 mt-0.5">goals addressed</p>
                </div>

                {/* Projects */}
                <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-medium text-stone-500 uppercase">Projects</span>
                  </div>
                  <p className="text-2xl font-bold text-stone-800">{stats.totalProjects}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{stats.projectsActive} active</p>
                </div>
              </div>

              {/* Pending Verification Notice */}
              {stats.pendingVerifications > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">
                      {stats.pendingVerifications} log{stats.pendingVerifications > 1 ? 's' : ''} pending verification
                    </span>
                  </div>
                </div>
              )}

              {/* Wallet Description */}
              <p className="text-[11px] text-stone-500 text-center px-2 leading-snug">
                Your Impact Wallet shows your verified volunteer activity, contribution history, and SDG reporting context. It does not establish causal impact.
              </p>

              {/* Recent Logs */}
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
                <div className="px-4 py-2 border-b border-stone-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-stone-800">Recent Activity</h2>
                  <button onClick={() => navigate('/my-work')} className="text-xs text-indigo-600 hover:text-indigo-700">View All →</button>
                </div>
                <div className="divide-y divide-stone-100">
                  {isLoadingLogs && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
                    </div>
                  )}
                  {!isLoadingLogs && recentLogs.map((log: any) => (
                    <div key={log.id} className="px-4 py-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-stone-800">{log.projectName || 'Project'}</p>
                          <p className="text-xs text-stone-500">
                            {log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            {log.hours != null && log.hours > 0 ? ` · ${log.hours}h` : ''}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                          log.status === 'verified' || log.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          log.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {log.status === 'approved' ? 'Verified' : log.status === 'rejected' ? 'Rejected' : 'Pending'}
                        </span>
                      </div>
                      {(log.outcomeType || log.outcomeValue) && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                          <Target className="h-3 w-3 flex-shrink-0" />
                          <span>{log.outcomeType}{log.outcomeValue ? ` — ${log.outcomeValue}` : ''}</span>
                        </div>
                      )}
                      {log.sdgGoals && log.sdgGoals.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {log.sdgGoals.map((sdg: number) => {
                            const sdgInfo = SDG_OPTIONS.find(s => s.value === sdg);
                            return sdgInfo ? (
                              <span key={sdg} className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ backgroundColor: sdgInfo.color }}>
                                SDG {sdg}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  {!isLoadingLogs && recentLogs.length === 0 && (
                    <button
                      onClick={() => setShowLogModal(true)}
                      className="w-full px-4 py-5 text-center hover:bg-stone-50 transition-colors"
                    >
                      <p className="text-sm text-stone-500">No activity yet</p>
                      <p className="text-xs text-indigo-600 mt-1">Tap to submit your first activity →</p>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Projects Tab Content */}
          {mobileTab === 'projects' && (
            <>
              {/* ── Section 1: My Assigned Projects ── */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-800">My Projects</h2>
                <span className="text-xs text-stone-500">{assignedProjects.length} assigned</span>
              </div>

              {isLoadingAssigned ? (
                <div className="flex items-center justify-center py-5">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-600"></div>
                </div>
              ) : assignedProjects.length > 0 ? (
                <div className="space-y-2">
                  {assignedProjects.map((assignment: any) => {
                    // Fallback: look up project from projects array if enrichment didn't provide it
                    const projectData = assignment.project || projects.find((p: any) => p.id === assignment.projectId);
                    const projectName = projectData?.name || 'Unknown Project';
                    const orgName = assignment.organization?.name || '';

                    const hoursLogged = (assignment.activities || []).reduce(
                      (sum: number, a: any) => sum + (a.hours || 0), 0
                    );
                    const teamSize = (assignment.teamMembers || []).length + 1;
                    const statusColors: Record<string, string> = {
                      active: 'bg-emerald-100 text-emerald-700',
                      pending: 'bg-amber-100 text-amber-700',
                      completed: 'bg-blue-100 text-blue-700',
                      'on-hold': 'bg-stone-100 text-stone-600',
                    };
                    const statusLabel = (assignment.status || 'pending').toLowerCase();
                    const badgeClass = statusColors[statusLabel] || 'bg-stone-100 text-stone-600';

                    return (
                      <div
                        key={assignment.id}
                        className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className="text-sm font-semibold text-stone-800 truncate">
                              {projectName}
                            </h3>
                            {orgName && (
                              <p className="text-xs text-stone-500 mt-0.5 truncate">{orgName}</p>
                            )}
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClass}`}>
                            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
                          </span>
                        </div>

                        {/* KPI row */}
                        <div className="flex gap-3 mt-2 pt-2 border-t border-stone-100">
                          <div className="text-center">
                            <p className="text-sm font-bold text-stone-800">{hoursLogged}</p>
                            <p className="text-[10px] text-stone-500">hrs logged</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-stone-800">{assignment.hoursCommitted || '—'}</p>
                            <p className="text-[10px] text-stone-500">hrs committed</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-stone-800">{teamSize}</p>
                            <p className="text-[10px] text-stone-500">team</p>
                          </div>
                          <div className="ml-auto">
                            <button
                              onClick={() => navigate(`/log-activity?projectId=${assignment.projectId}`)}
                              className="text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              Log Hours
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center">
                  <Target className="h-8 w-8 text-stone-300 mx-auto mb-1.5" />
                  <p className="text-sm font-medium text-stone-800">No projects yet</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Apply to opportunities below to get assigned to projects
                  </p>
                </div>
              )}

              {/* ── Section 2: Suggested For You (AI matches) ── */}
              <div className="flex items-center justify-between mt-1">
                <h2 className="text-lg font-semibold text-stone-800">Suggested For You</h2>
                <span className="text-xs text-stone-500">4-Factor AI Match</span>
              </div>

              {isLoadingMatches ? (
                <div className="flex items-center justify-center py-5">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600"></div>
                </div>
              ) : matchedProjects.length > 0 ? (
                <div className="space-y-2">
                  {matchedProjects.map((match: any, index: number) => (
                    <div
                      key={match.id || index}
                      className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm"
                      onClick={() => navigate(`/opportunities/${match.id}`)}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-stone-800">
                            {match.organizationName || 'Organization'}
                          </h3>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {match.title || 'Community Impact'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-indigo-100 px-2 py-1 rounded-full">
                          <TrendingUp className="h-3 w-3 text-indigo-600" />
                          <span className="text-xs font-semibold text-indigo-600">
                            {Math.round(match.matchScore || match.matchPercentage || 0)}%
                          </span>
                        </div>
                      </div>

                      {/* Match Factors */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(match.matchBreakdown?.skillMatch || 0) > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Skills +{Math.round(match.matchBreakdown.skillMatch)}
                          </span>
                        )}
                        {(match.matchBreakdown?.sdgMatch || 0) > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            SDG +{Math.round(match.matchBreakdown.sdgMatch)}
                          </span>
                        )}
                        {(match.matchBreakdown?.locationMatch || 0) > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Location +{Math.round(match.matchBreakdown.locationMatch)}
                          </span>
                        )}
                        {(match.matchBreakdown?.interestMatch || 0) > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            Interests +{Math.round(match.matchBreakdown.interestMatch)}
                          </span>
                        )}
                      </div>

                      {/* SDG Tags */}
                      {match.sdgGoals && match.sdgGoals.length > 0 && (
                        <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-stone-100">
                          {match.sdgGoals.slice(0, 4).map((sdg: number) => (
                            <span
                              key={sdg}
                              className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center text-white"
                              style={{ backgroundColor: SDG_OPTIONS.find(s => s.value === sdg)?.color || '#6B7280' }}
                            >
                              {sdg}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center">
                  <p className="text-xs text-stone-500">
                    Complete your profile to get personalised suggestions
                  </p>
                  <button
                    onClick={() => navigate('/volunteer-profile-settings')}
                    className="mt-2 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Complete Profile
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {/* Bottom Navigation Tray - 5 tabs with Home in middle */}
        <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-t border-emerald-200 px-1 pt-2 z-[160] shadow-lg pwa-bottom-nav" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          <div className="grid grid-cols-5 max-w-[428px] mx-auto">
            {/* Wallet */}
            <button
              onClick={() => setMobileTab('wallet')}
              className={`flex flex-col items-center justify-center py-2 px-1 w-full min-w-0 rounded-xl transition-colors ${
                mobileTab === 'wallet' ? 'text-emerald-700 bg-emerald-100' : 'text-stone-500 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <span data-pwa-nav-icon className="w-8 h-7 flex items-center justify-center"><BarChart3 className="w-5 h-5" /></span>
              <span className="text-[10px] font-semibold">Wallet</span>
            </button>

            {/* Projects (AI-matched top 4) */}
            <button
              onClick={() => setMobileTab('projects')}
              className={`flex flex-col items-center justify-center py-2 px-1 w-full min-w-0 rounded-xl transition-colors ${
                mobileTab === 'projects' ? 'text-emerald-700 bg-emerald-100' : 'text-stone-500 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <span data-pwa-nav-icon className="w-8 h-7 flex items-center justify-center"><Target className="w-5 h-5" /></span>
              <span className="text-[10px] font-semibold">Projects</span>
            </button>

            {/* Home - Primary Center Button */}
            <button
              onClick={() => setMobileTab('home')}
              className={`flex flex-col items-center justify-center py-2 px-1 w-full min-w-0 rounded-xl shadow-md -mt-3 transition-colors ${
                mobileTab === 'home' ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600 hover:bg-emerald-600 hover:text-white'
              }`}
            >
              <span data-pwa-nav-icon className="w-8 h-7 flex items-center justify-center"><Home className="w-6 h-6" /></span>
              <span className="text-[10px] font-semibold">Home</span>
            </button>

            {/* Log Activity */}
            <button
              onClick={() => setShowLogModal(true)}
              className="flex flex-col items-center justify-center py-2 px-1 w-full min-w-0 rounded-xl text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              aria-label="Log Activity"
            >
              <span data-pwa-nav-icon className="w-8 h-7 flex items-center justify-center"><Plus className="w-5 h-5" /></span>
              <span className="text-[10px] font-semibold">Log</span>
            </button>

            {/* History */}
            <button
              onClick={() => navigate('/my-work')}
              className="flex flex-col items-center justify-center py-2 px-1 w-full min-w-0 rounded-xl text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              <span data-pwa-nav-icon className="w-8 h-7 flex items-center justify-center"><FileText className="w-5 h-5" /></span>
              <span className="text-[10px] font-semibold">History</span>
            </button>
          </div>
        </nav>

        {/* Log Activity Modal */}
        <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
          <DialogContent className="max-w-lg top-[3%] translate-y-0 max-h-[calc(100dvh-6rem)]">
            <DialogHeader>
              <DialogTitle>Log Activity</DialogTitle>
              <DialogDescription>
                Record your hours and output details for partner verification.
              </DialogDescription>
            </DialogHeader>
            <ImpactLogForm
              userId={parseInt(userId)}
              projects={projects}
              onSuccess={() => setShowLogModal(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <VolunteerNav />

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Page Header */}
        <PageHeader
          title={`Welcome back, ${activeUser.displayName?.split(" ")[0] || "Volunteer"}`}
          description="Log activity, track verification status, and view your contribution record."
          actions={
            <Button variant="accent" size="lg" onClick={() => setShowLogModal(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Log Activity
            </Button>
          }
        />

        {/* Primary KPI Row */}
        <Grid columns={4} gap="default">
          <MetricCard
            label="Confirmed Hours"
            value={stats.verifiedHours || stats.hoursLogged}
            subtitle={stats.pendingVerifications > 0 ? `${stats.pendingVerifications} pending review` : "partner-confirmed"}
            accentColor="success"
            icon={<Clock className="h-5 w-5 text-success" />}
          />
          <MetricCard
            label="Verified Activities"
            value={stats.verifiedActivities}
            subtitle={stats.pendingVerifications > 0 ? `${stats.pendingVerifications} pending` : "evidence records"}
            accentColor="primary"
            icon={<CheckCircle2 className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            label="Projects Supported"
            value={stats.totalProjects}
            subtitle={`${stats.projectsActive} active`}
            accentColor="accent"
            icon={<Target className="h-5 w-5 text-accent" />}
          />
          <MetricCard
            label="SDGs Mapped"
            value={stats.sdgsAddressed}
            subtitle="reporting context"
            accentColor="cyan"
            icon={<Globe className="h-5 w-5 text-[#22D3EE]" />}
          />
        </Grid>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Impact Score & Streak */}
          <div className="space-y-6">
            <ImpactScoreCard
              score={stats.verifiedActivities}
              hoursLogged={stats.verifiedHours || stats.hoursLogged}
              projectsActive={stats.projectsActive}
            />
            <Card variant="metric" className="border-l-accent">
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Contribution Summary
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Confirmed Activities</span>
                    <span className="text-sm font-semibold text-emerald-700">{stats.verifiedActivities}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Review</span>
                    <span className={`text-sm font-semibold ${stats.pendingVerifications > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{stats.pendingVerifications}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">SDGs Mapped</span>
                    <span className="text-sm font-semibold">{stats.sdgsAddressed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">People Reached</span>
                    <span className="text-sm font-semibold text-muted-foreground">{stats.peopleReached} <span className="text-[10px] font-normal">(partner-reported)</span></span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-4 leading-snug border-t border-border pt-3">
                  Your wallet shows verified activity and reporting context. It does not establish causal impact.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <RecentLogs logs={recentLogs} isLoading={isLoadingLogs} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Projects Section */}
        <Section
          title="Your Projects"
          description="Projects you're actively contributing to"
          action={
            <Button variant="outline" size="sm">
              Browse Opportunities
            </Button>
          }
        >
          <Grid columns={2}>
            <ActiveProjects
              projects={projects.map((p: any) => ({
                id: p.id,
                name: p.name,
                organizationName: p.organizationName || "Organization",
                status: p.status || "active",
                completionPercentage: p.completionPercentage || 0,
                hoursLogged: p.hoursLogged || 0,
                sdgGoals: p.sdgGoals || [],
              }))}
              isLoading={isLoadingDashboard}
            />
          </Grid>
        </Section>

        {/* SDG Framework Context Section */}
        <Section title="SDG Framework Context" description="Reporting context — not certification or causal attribution.">
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3">
                {SDG_OPTIONS.slice(0, 8).map((sdg) => (
                  <div
                    key={sdg.value}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50"
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: sdg.color }}
                    />
                    <span className="text-sm font-medium">SDG {sdg.value}</span>
                    <span className="text-xs text-muted-foreground">{sdg.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Log Activity Modal */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
            <DialogDescription>
              Record your volunteer hours and output details for partner verification.
            </DialogDescription>
          </DialogHeader>
          <ImpactLogForm
            userId={parseInt(userId)}
            projects={projects}
            onSuccess={() => setShowLogModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
