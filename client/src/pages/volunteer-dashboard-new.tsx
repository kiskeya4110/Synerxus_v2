import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDecimal } from "@/lib/format-utils";
import { cn } from "@/lib/utils";

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

// Outcome options for impact logging
const OUTCOME_OPTIONS = [
  { value: "lives_impacted", label: "Lives Impacted", icon: "👥" },
  { value: "meals_served", label: "Meals Served", icon: "🍽️" },
  { value: "trees_planted", label: "Trees Planted", icon: "🌳" },
  { value: "students_taught", label: "Students Taught", icon: "📚" },
  { value: "homes_built", label: "Homes Built", icon: "🏠" },
  { value: "water_provided", label: "Liters of Water", icon: "💧" },
  { value: "medical_care", label: "Medical Consultations", icon: "🏥" },
  { value: "items_donated", label: "Items Donated", icon: "📦" },
  { value: "other", label: "Other", icon: "✨" },
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
    outcome: "",
    outcomeValue: "",
    description: "",
    sdgs: [] as number[],
  });

  const logMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          project_id: parseInt(data.projectId),
          hours: parseFloat(data.hours),
          outcome_type: data.outcome,
          outcome_value: data.outcomeValue ? parseInt(data.outcomeValue) : null,
          description: data.description,
          sdg_goals: data.sdgs,
          status: "pending",
        }),
      });
      if (!response.ok) throw new Error("Failed to log impact");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Impact Logged!", description: "Your contribution has been submitted for verification." });
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setFormData({ projectId: "", hours: "", outcome: "", outcomeValue: "", description: "", sdgs: [] });
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

      {/* Outcome Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Impact Outcome (Optional)</label>
        <div className="grid grid-cols-3 gap-2">
          {OUTCOME_OPTIONS.slice(0, 6).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, outcome: option.value }))}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                formData.outcome === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-white/5"
              )}
            >
              <span className="text-xl">{option.icon}</span>
              <span className="text-xs text-center">{option.label}</span>
            </button>
          ))}
        </div>

        {formData.outcome && (
          <Input
            type="number"
            placeholder="Enter quantity"
            value={formData.outcomeValue}
            onChange={(e) => setFormData(prev => ({ ...prev, outcomeValue: e.target.value }))}
            className="mt-2"
          />
        )}
      </div>

      {/* SDG Tags */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          SDG Goals (Select up to 3)
        </label>
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
        Log Impact
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
              Your Impact Score
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
        description="Log your first impact to get started"
        size="sm"
      />
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
        >
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{log.projectName}</p>
            <p className="text-xs text-muted-foreground">
              {log.hours}h logged on {new Date(log.createdAt).toLocaleDateString()}
            </p>
          </div>
          <StatusBadge status={log.status} size="sm" />
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
        description="Browse opportunities to find projects that match your interests"
        action={{ label: "Find Projects", onClick: () => {} }}
        size="sm"
      />
    );
  }

  return (
    <div className="space-y-4">
      {projects.slice(0, 4).map((project) => (
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();

  const userId = localStorage.getItem("currentUserId");
  const userType = localStorage.getItem("userType");

  const [showLogModal, setShowLogModal] = useState(false);
  const [mobileTab, setMobileTab] = useState<'wallet' | 'projects'>('wallet');

  // Redirect non-volunteers
  useEffect(() => {
    if (userType === "corporate-partner") {
      navigate("/csr-dashboard");
    } else if (userType === "organization") {
      navigate("/organization-dashboard");
    }
  }, [userType, navigate]);

  // Fetch user data
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) throw new Error("User not found");
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch dashboard data
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["/api/dashboard", userId],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to load dashboard");
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects", userId],
    queryFn: async () => {
      const response = await fetch(`/api/projects?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to load projects");
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch recent impact logs
  const { data: recentLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["/api/logs", userId],
    queryFn: async () => {
      const response = await fetch(`/api/logs?user_id=${userId}`);
      if (!response.ok) throw new Error("Failed to load logs");
      const logs = await response.json();
      return logs.slice(0, 5).map((log: any) => ({
        id: log.id,
        projectName: log.project_name || "Unknown Project",
        hours: log.hours,
        status: log.verification_status || log.status || "pending",
        createdAt: log.created_at,
        outcomeType: log.outcome_type,
        outcomeValue: log.outcome_value,
        sdgGoals: log.sdg_goals,
      }));
    },
    enabled: !!userId,
  });

  // Fetch matched projects using 4-factor matchmaking
  const { data: matchedProjects = [], isLoading: isLoadingMatches } = useQuery({
    queryKey: ["/api/matchmaker/volunteer", userId],
    queryFn: async () => {
      const response = await fetch(`/api/matchmaker/volunteer/${userId}?limit=4`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.matches || [];
    },
    enabled: !!userId && isMobile,
  });

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

  // Calculate stats
  const stats = useMemo(() => {
    const data = dashboardData || {};
    return {
      impactScore: data.totalAiu || data.impactScore || 0,
      hoursLogged: data.totalHours || 0,
      projectsActive: data.activeProjects || projects.filter((p: any) => p.status === "active").length || 0,
      currentStreak: data.currentStreak || 0,
      longestStreak: data.longestStreak || 0,
      pendingVerifications: recentLogs.filter((l: any) => l.status === "pending").length,
    };
  }, [dashboardData, projects, recentLogs]);

  // Loading state
  if (isLoadingUser && !demoUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading your dashboard..." />
      </div>
    );
  }

  // Auth check
  if (!userId || !activeUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ErrorState
          title="Not Authenticated"
          message="Please log in to view your dashboard."
          retry={() => navigate("/login")}
        />
      </div>
    );
  }

  // Mobile PWA View - Simple Impact Wallet per redesign spec
  if (isMobile) {
    // Calculate simple metrics for Impact Wallet
    const totalOutcomes = recentLogs.reduce((sum: number, log: any) => sum + (log.outcomeQuantity || 0), 0);
    const skillsUsed = dashboardData?.volunteerProfile?.skills?.length || 0;
    const sdgsContributed = new Set(projects.flatMap((p: any) => p.sdgGoals || [])).size;

    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header with Logo and Menu */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <span className="text-xs text-gray-500 font-medium">Impact Wallet</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 py-5 space-y-5">
          {/* Wallet Tab Content */}
          {mobileTab === 'wallet' && (
            <>
              {/* Core Metrics - 2x2 Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Total Hours */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-gray-500 uppercase">Hours</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.hoursLogged}</p>
                  <p className="text-xs text-gray-500 mt-1">verified hours</p>
                </div>

                {/* Total Outcomes */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-gray-500 uppercase">Outcomes</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{totalOutcomes}</p>
                  <p className="text-xs text-gray-500 mt-1">total outcomes</p>
                </div>

                {/* Skills Used */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-gray-500 uppercase">Skills</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{skillsUsed}</p>
                  <p className="text-xs text-gray-500 mt-1">skills applied</p>
                </div>

                {/* SDGs */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-medium text-gray-500 uppercase">SDGs</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{sdgsContributed}</p>
                  <p className="text-xs text-gray-500 mt-1">goals impacted</p>
                </div>
              </div>

              {/* Pending Verification Notice */}
              {stats.pendingVerifications > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">
                      {stats.pendingVerifications} log{stats.pendingVerifications > 1 ? 's' : ''} pending verification
                    </span>
                  </div>
                </div>
              )}

              {/* Recent Logs */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {recentLogs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.hours}h logged</p>
                        <p className="text-xs text-gray-500">{log.projectName || 'Project'}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        log.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                        log.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {log.status || 'pending'}
                      </span>
                    </div>
                  ))}
                  {recentLogs.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-gray-500">No activity yet</p>
                      <p className="text-xs text-gray-400 mt-1">Log your first impact to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Projects Tab Content - Top 4 Matched Projects */}
          {mobileTab === 'projects' && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Best Matches For You</h2>
                <span className="text-xs text-gray-500">4-Factor AI Match</span>
              </div>

              {isLoadingMatches ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : matchedProjects.length > 0 ? (
                <div className="space-y-3">
                  {matchedProjects.slice(0, 4).map((match: any, index: number) => (
                    <div
                      key={match.organization_id || index}
                      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                      onClick={() => navigate(`/opportunities/${match.organization_id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {match.organization_name || 'Organization'}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {match.cause_area || match.focus_area || 'Community Impact'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-full">
                          <TrendingUp className="h-3 w-3 text-indigo-600" />
                          <span className="text-xs font-semibold text-indigo-600">
                            {Math.round(match.match_score || match.score || 0)}%
                          </span>
                        </div>
                      </div>

                      {/* Match Factors */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {match.skills_match > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            Skills +{Math.round(match.skills_match)}
                          </span>
                        )}
                        {match.sdg_match > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            SDG +{Math.round(match.sdg_match)}
                          </span>
                        )}
                        {match.location_match > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                            Location +{Math.round(match.location_match)}
                          </span>
                        )}
                        {match.availability_match > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                            Availability +{Math.round(match.availability_match)}
                          </span>
                        )}
                      </div>

                      {/* SDG Tags */}
                      {match.sdg_goals && match.sdg_goals.length > 0 && (
                        <div className="flex gap-1 mt-3 pt-3 border-t border-gray-100">
                          {match.sdg_goals.slice(0, 4).map((sdg: number) => (
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
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
                  <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">No matches yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Complete your profile to get personalized project matches
                  </p>
                  <button
                    onClick={() => navigate('/volunteer-profile-settings')}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg"
                  >
                    Complete Profile
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {/* Bottom Navigation Tray - 5 tabs with Home in middle */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pt-2 z-40 shadow-lg" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          <div className="flex justify-around items-center max-w-md mx-auto">
            {/* Wallet */}
            <button
              onClick={() => setMobileTab('wallet')}
              className={`flex flex-col items-center py-2 px-3 rounded-xl transition-colors ${
                mobileTab === 'wallet' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <BarChart3 className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-semibold">Wallet</span>
            </button>

            {/* Projects (AI-matched top 4) */}
            <button
              onClick={() => setMobileTab('projects')}
              className={`flex flex-col items-center py-2 px-3 rounded-xl transition-colors ${
                mobileTab === 'projects' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <Target className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-semibold">Projects</span>
            </button>

            {/* Home - Primary Center Button */}
            <button
              onClick={() => setMobileTab('wallet')}
              className="flex flex-col items-center py-2 px-5 rounded-xl bg-indigo-600 text-white shadow-md -mt-3"
            >
              <Home className="w-6 h-6 mb-0.5" />
              <span className="text-[10px] font-semibold">Home</span>
            </button>

            {/* Log Impact */}
            <button
              onClick={() => setShowLogModal(true)}
              className="flex flex-col items-center py-2 px-3 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-semibold">Log</span>
            </button>

            {/* History */}
            <button
              onClick={() => navigate('/my-work')}
              className="flex flex-col items-center py-2 px-3 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <FileText className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-semibold">History</span>
            </button>
          </div>
        </nav>

        {/* Log Impact Modal */}
        <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Log Impact</DialogTitle>
              <DialogDescription>
                Record your hours and outcomes.
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
          description="Track your impact, log your hours, and make a difference."
          actions={
            <Button variant="accent" size="lg" onClick={() => setShowLogModal(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Log Impact
            </Button>
          }
        />

        {/* Quick Stats Row */}
        <Grid columns={4} gap="default">
          <MetricCard
            label="Impact Score"
            value={formatDecimal(stats.impactScore)}
            subtitle="points earned"
            accentColor="primary"
            icon={<Award className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            label="Hours Logged"
            value={stats.hoursLogged}
            subtitle="total hours"
            accentColor="accent"
            icon={<Clock className="h-5 w-5 text-accent" />}
          />
          <MetricCard
            label="Active Projects"
            value={stats.projectsActive}
            subtitle="contributing to"
            accentColor="success"
            icon={<Target className="h-5 w-5 text-success" />}
          />
          <MetricCard
            label="Pending Verification"
            value={stats.pendingVerifications}
            subtitle="awaiting review"
            accentColor="cyan"
            icon={<AlertCircle className="h-5 w-5 text-[#22D3EE]" />}
          />
        </Grid>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Impact Score & Streak */}
          <div className="space-y-6">
            <ImpactScoreCard
              score={stats.impactScore}
              trend={15}
              hoursLogged={stats.hoursLogged}
              projectsActive={stats.projectsActive}
            />
            <ImpactStreakCard
              currentStreak={stats.currentStreak}
              longestStreak={stats.longestStreak}
            />
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

        {/* SDG Impact Section */}
        <Section title="Your SDG Impact">
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

      {/* Log Impact Modal */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Your Impact</DialogTitle>
            <DialogDescription>
              Record your volunteer hours and the impact you made.
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
