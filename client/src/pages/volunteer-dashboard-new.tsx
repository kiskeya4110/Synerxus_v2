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
        <div className="flex flex-wrap gap-2">
          {SDG_OPTIONS.map((sdg) => (
            <button
              key={sdg.value}
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
          ))}
        </div>
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

  // Mobile PWA View - Clean cards like desktop with bottom navigation
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Welcome, {activeUser.displayName?.split(" ")[0] || "Volunteer"}
              </h1>
              <p className="text-sm text-gray-500">Track your impact</p>
            </div>
            <Button variant="accent" size="sm" onClick={() => setShowLogModal(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Log
            </Button>
          </div>
        </header>

        {/* Mobile Content */}
        <main className="px-4 py-4 space-y-4">
          {/* Stats Grid - 2x2 on mobile */}
          <div className="grid grid-cols-2 gap-3">
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
              label="Pending"
              value={stats.pendingVerifications}
              subtitle="awaiting review"
              accentColor="cyan"
              icon={<AlertCircle className="h-5 w-5 text-[#22D3EE]" />}
            />
          </div>

          {/* Impact Score Card */}
          <ImpactScoreCard
            score={stats.impactScore}
            trend={15}
            hoursLogged={stats.hoursLogged}
            projectsActive={stats.projectsActive}
          />

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentLogs logs={recentLogs} isLoading={isLoadingLogs} />
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-success" />
                Your Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </main>

        {/* Bottom Navigation Tray */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pt-2 z-40 shadow-lg" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          <div className="flex justify-around items-center max-w-md mx-auto">
            <button className="flex flex-col items-center py-1.5 px-3 rounded-xl text-indigo-600 bg-indigo-100">
              <Home className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-semibold">Home</span>
            </button>
            <button
              onClick={() => navigate('/discover-opportunities')}
              className="flex flex-col items-center py-1.5 px-3 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
            >
              <Target className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-semibold">Discover</span>
            </button>
            <button
              onClick={() => navigate('/log-activity')}
              className="flex flex-col items-center py-1.5 px-3 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-semibold">Log</span>
            </button>
            <button
              onClick={() => navigate('/my-work')}
              className="flex flex-col items-center py-1.5 px-3 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
            >
              <FileText className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-semibold">Activity</span>
            </button>
            <button
              onClick={() => navigate('/volunteer-profile-settings')}
              className="flex flex-col items-center py-1.5 px-3 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
            >
              <Building2 className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-semibold">Profile</span>
            </button>
          </div>
        </nav>

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
