import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Home,
  Shield,
  FolderOpen,
  Users,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Plus,
  RefreshCw,
  Bell,
  Settings,
  TrendingUp,
  Target,
  Eye,
  Filter,
  CheckCheck,
  AlertCircle,
  Calendar,
  Globe,
  Sparkles,
  Menu,
  X,
  LogOut,
} from "lucide-react";

// UI Components
import { Card, CardContent, MetricCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, SDGBadge, StatusBadge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import Logo from "@/components/ui/logo";

// Hooks & Utils
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

import { getSDGColor, getSDGName } from "@shared/sdg-goals";

// Abbreviate a long org name to initials (e.g. "Green Future Alliance" → "GFA")
function abbreviateOrgName(name: string): string {
  if (!name) return "";
  if (name.length <= 12) return name;
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return name.slice(0, 10) + "…";
  return words.map((w) => w[0].toUpperCase()).join("");
}

// ============================================================================
// Types
// ============================================================================
type MobileTab = "home" | "verify" | "projects" | "team" | "more";

interface PendingVerification {
  id: number;
  volunteerName: string;
  volunteerAvatar?: string;
  projectName: string;
  hours: number;
  description?: string;
  outcomeType?: string;
  outcomeValue?: number;
  sdgGoals?: number[];
  submittedAt: string;
  status: "pending" | "verified" | "rejected";
}

interface OrganizationMobileViewProps {
  userId: string;
  organizationId?: number;
}

// ============================================================================
// Mobile Header Component
// ============================================================================
function MobileHeader({
  title,
  pendingCount,
  onMenuClick,
  onNotificationClick
}: {
  title: string;
  pendingCount: number;
  onMenuClick: () => void;
  onNotificationClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="xs" variant="icon" />
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNotificationClick}
            className="relative p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-white">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// Bottom Navigation Component
// ============================================================================
function BottomNav({
  activeTab,
  onTabChange,
  pendingCount
}: {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  pendingCount: number;
}) {
  const tabs = [
    { id: "home" as const, icon: Home, label: "Home" },
    { id: "verify" as const, icon: Shield, label: "Verify", badge: pendingCount },
    { id: "projects" as const, icon: FolderOpen, label: "Projects" },
    { id: "team" as const, icon: Users, label: "Team" },
    { id: "more" as const, icon: Menu, label: "Options" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[64px] relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold flex items-center justify-center text-white">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ============================================================================
// Quick Stats Row Component
// ============================================================================
function QuickStats({
  totalHours,
  activeVolunteers,
  activeProjects,
  pendingCount
}: {
  totalHours: number;
  activeVolunteers: number;
  activeProjects: number;
  pendingCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      <Card variant="glass" className="p-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{totalHours.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Verified Hours</p>
          </div>
        </div>
      </Card>
      <Card variant="glass" className="p-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-success/10">
            <Users className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{activeVolunteers}</p>
            <p className="text-[10px] text-muted-foreground">Volunteers</p>
          </div>
        </div>
      </Card>
      <Card variant="glass" className="p-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <FolderOpen className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{activeProjects}</p>
            <p className="text-[10px] text-muted-foreground">Active Projects</p>
          </div>
        </div>
      </Card>
      <Card variant="glass" className="p-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Shield className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// Verification Card Component (Mobile Optimized)
// ============================================================================
function VerificationCard({
  item,
  onApprove,
  onReject,
  isProcessing
}: {
  item: PendingVerification;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isProcessing?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant="glass" className="overflow-hidden">
      <CardContent className="p-0">
        {/* Main Info - Always Visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 text-left"
        >
          <div className="flex items-start gap-3">
            <Avatar size="sm">
              <AvatarImage src={item.volunteerAvatar} alt={item.volunteerName} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {item.volunteerName.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {item.volunteerName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {item.projectName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" size="sm">
                  <Clock className="h-3 w-3 mr-1" />
                  {item.hours}h
                </Badge>
                {item.sdgGoals && item.sdgGoals.length > 0 && (
                  <div className="flex gap-0.5">
                    {item.sdgGoals.slice(0, 2).map(sdg => (
                      <div
                        key={sdg}
                        className="w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center text-white"
                        style={{ backgroundColor: getSDGColor(sdg) }}
                      >
                        {sdg}
                      </div>
                    ))}
                    {item.sdgGoals.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{item.sdgGoals.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              expanded && "rotate-90"
            )} />
          </div>
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            {item.description && (
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            )}
            {item.outcomeType && (
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-accent" />
                <span className="text-foreground capitalize">{item.outcomeType}</span>
                {item.outcomeValue && (
                  <Badge variant="success" size="sm">{item.outcomeValue}</Badge>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(item.submittedAt).toLocaleDateString()}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => onReject(item.id)}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                variant="success"
                size="sm"
                className="flex-1"
                onClick={() => onApprove(item.id)}
                disabled={isProcessing}
                loading={isProcessing}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Project Card Component (Mobile Optimized)
// ============================================================================
function ProjectCard({
  project,
  onClick
}: {
  project: any;
  onClick: () => void;
}) {
  const statusColors = {
    active: "bg-success/10 text-success",
    completed: "bg-primary/10 text-primary",
    paused: "bg-accent/10 text-accent",
    draft: "bg-muted text-muted-foreground",
  };

  return (
    <Card
      variant="glass"
      interactive
      className="overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {project.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                size="sm"
                className={statusColors[project.status as keyof typeof statusColors] || statusColors.draft}
              >
                {project.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {project.activeVolunteers || 0} volunteers
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>

        {/* Progress Bar */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground font-medium">
              {project.completionPercentage || 0}%
            </span>
          </div>
          <Progress
            value={project.completionPercentage || 0}
            indicatorColor="primary"
            className="h-1.5"
          />
        </div>

        {/* SDG Tags */}
        {project.sdgGoals && project.sdgGoals.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {project.sdgGoals.slice(0, 4).map((sdg: number) => (
              <div
                key={sdg}
                className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center text-white"
                style={{ backgroundColor: getSDGColor(sdg) }}
              >
                {sdg}
              </div>
            ))}
            {project.sdgGoals.length > 4 && (
              <span className="text-xs text-muted-foreground self-center">
                +{project.sdgGoals.length - 4}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Team Member Card Component (Mobile Optimized)
// ============================================================================
function TeamMemberCard({
  member,
  onClick
}: {
  member: any;
  onClick: () => void;
}) {
  return (
    <Card
      variant="glass"
      interactive
      className="overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar size="default">
            <AvatarImage src={member.avatar} alt={member.name || member.displayName} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {(member.name || member.displayName || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {member.name || member.displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {member.email}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{member.totalHours || 0}h</p>
            <p className="text-[10px] text-muted-foreground">logged</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FolderOpen className="h-3 w-3" />
            <span>{member.projectsCount || 0} projects</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className={cn(
              "w-2 h-2 rounded-full",
              member.status === "active" ? "bg-success" : "bg-muted-foreground"
            )} />
            <span className="text-muted-foreground capitalize">{member.status || "active"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Slide-out Menu Component
// ============================================================================
function SlideOutMenu({
  isOpen,
  onClose,
  organization,
  onNavigate,
  onLogout
}: {
  isOpen: boolean;
  onClose: () => void;
  organization: any;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}) {
  if (!isOpen) return null;

  const menuItems = [
    { icon: BarChart3, label: "Evidence Summary", path: "/organization-impact-report" },
    { icon: Settings, label: "Settings", path: "/organization-profile-settings" },
    { icon: Plus, label: "New Project", path: "/post-core-opportunity" },
    { icon: Globe, label: "Overview", path: "/overview" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-72 bg-background z-50 shadow-xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="p-4 border-b border-border bg-secondary/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Organization Info */}
          <div className="flex items-center gap-3">
            <Avatar size="default">
              <AvatarImage src={organization?.logo} alt={organization?.name} />
              <AvatarFallback className="bg-success text-white font-semibold">
                {(organization?.name || "O").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {organization?.name || "Organization"}
              </p>
              <p className="text-xs text-muted-foreground">Verify Hub</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  onNavigate(item.path);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-foreground hover:bg-white/5 transition-colors"
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border safe-area-pb">
          <Button
            variant="outline"
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================
export default function OrganizationMobileView({ userId, organizationId }: OrganizationMobileViewProps) {
  const [, navigate] = useLocation();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch organization data
  const { data: organization } = useQuery({
    queryKey: ["/api/organizations", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await fetch(`/api/organizations/${organizationId}`);
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!organizationId,
  });

  // Fetch dashboard metrics
  const { data: dashboardData, refetch: refetchDashboard } = useQuery({
    queryKey: ["/api/organization", userId, organizationId],
    queryFn: async () => {
      if (!userId) return null;
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/organization?refresh=true`, {
        headers,
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch pending verifications
  const { data: pendingData, refetch: refetchPending } = useQuery({
    queryKey: ["/api/pending-approvals", organizationId],
    queryFn: async () => {
      if (!organizationId) return { pendingActivities: [], pendingImpacts: [] };
      const response = await fetch(`/api/pending-approvals?organizationId=${organizationId}`);
      if (!response.ok) return { pendingActivities: [], pendingImpacts: [] };
      return response.json();
    },
    enabled: !!organizationId,
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ["/api/projects", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await fetch(`/api/projects?organizationId=${organizationId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!organizationId,
  });

  // Fetch team/volunteers (auth required)
  const { data: volunteers } = useQuery({
    queryKey: ["/api/volunteers", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await fetch(`/api/volunteers?organizationId=${organizationId}`, {
        headers: await getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!organizationId,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/volunteer-activities/${id}/verify`, {
        status: "verified",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Approved", description: "Activity verified successfully" });
      refetchPending();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/volunteer-activities/${id}/verify`, {
        status: "rejected",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Rejected", description: "Activity rejected" });
      refetchPending();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
    },
  });

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchDashboard(),
      refetchPending(),
    ]);
    setIsRefreshing(false);
    toast({ title: "Refreshed", description: "Data updated" });
  }, [refetchDashboard, refetchPending, toast]);

  // Combine pending items
  const allPending = useMemo(() => {
    const activities = pendingData?.pendingActivities || [];
    const impacts = pendingData?.pendingImpacts || [];
    return [...activities, ...impacts].map((item: any) => ({
      id: item.id,
      volunteerName: item.volunteerName || item.volunteer?.displayName || "Unknown",
      volunteerAvatar: item.volunteerAvatar || item.volunteer?.avatar,
      projectName: item.projectName || item.project?.name || "Unknown Project",
      hours: item.hours || 0,
      description: item.description || item.notes,
      outcomeType: item.outcomeType,
      outcomeValue: item.outcomeValue,
      sdgGoals: item.sdgGoals || item.project?.sdgGoals || [],
      submittedAt: item.createdAt || item.submittedAt || new Date().toISOString(),
      status: item.status || "pending",
    }));
  }, [pendingData]);

  const pendingCount = allPending.length || dashboardData?.keyMetrics?.pendingCount || 0;
  const metrics = dashboardData?.keyMetrics || {};

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const orgShortName = organization?.displayName
    ? abbreviateOrgName(organization.displayName)
    : organization?.name
    ? abbreviateOrgName(organization.name)
    : "Verify Hub";

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader
        title={orgShortName}
        pendingCount={pendingCount}
        onMenuClick={() => setMenuOpen(true)}
        onNotificationClick={() => setActiveTab("verify")}
      />

      {/* Main Content Area */}
      <main className="px-4 py-4 space-y-4">
        {/* Home Tab */}
        {activeTab === "home" && (
          <>
            {/* Quick Stats */}
            <QuickStats
              totalHours={metrics.totalHours || 0}
              activeVolunteers={metrics.activeVolunteers || 0}
              activeProjects={metrics.activeProjects || 0}
              pendingCount={pendingCount}
            />

            {/* Quick Actions */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              <Button
                variant="accent"
                size="sm"
                className="flex-shrink-0"
                onClick={() => navigate("/ngo/log-hours")}
              >
                <Clock className="h-4 w-4 mr-1" />
                Log Hours
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={() => navigate("/post-core-opportunity")}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Project
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={() => setActiveTab("verify")}
              >
                <Shield className="h-4 w-4 mr-1" />
                Verify ({pendingCount})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={() => navigate("/organization-impact-report")}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Report
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>

            {/* Pending Verifications Preview */}
            {pendingCount > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground">Pending Verification</h2>
                  <button
                    onClick={() => setActiveTab("verify")}
                    className="text-xs text-primary font-medium"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {allPending.slice(0, 2).map((item) => (
                    <VerificationCard
                      key={item.id}
                      item={item}
                      onApprove={(id) => approveMutation.mutate(id)}
                      onReject={(id) => rejectMutation.mutate(id)}
                      isProcessing={approveMutation.isPending || rejectMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Active Projects Preview */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Active Projects</h2>
                <button
                  onClick={() => setActiveTab("projects")}
                  className="text-xs text-primary font-medium"
                >
                  View All
                </button>
              </div>
              {projects && projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.slice(0, 3).map((project: any) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <Card variant="glass" className="p-6">
                  <EmptyState
                    icon={<FolderOpen className="h-8 w-8 text-muted-foreground" />}
                    title="No projects yet"
                    description="Create your first project to get started"
                    action={{ label: "New Project", onClick: () => navigate("/post-core-opportunity") }}
                    size="sm"
                  />
                </Card>
              )}
            </section>
          </>
        )}

        {/* Verify Tab */}
        {activeTab === "verify" && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Verification Queue
              </h2>
              {pendingCount > 0 && (
                <Badge variant="destructive">{pendingCount} pending</Badge>
              )}
            </div>

            {allPending.length > 0 ? (
              <div className="space-y-3">
                {allPending.map((item) => (
                  <VerificationCard
                    key={item.id}
                    item={item}
                    onApprove={(id) => approveMutation.mutate(id)}
                    onReject={(id) => rejectMutation.mutate(id)}
                    isProcessing={approveMutation.isPending || rejectMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <Card variant="glass" className="p-8">
                <EmptyState
                  icon={<CheckCircle2 className="h-10 w-10 text-success" />}
                  title="All caught up!"
                  description="No pending verifications at the moment"
                  size="sm"
                />
              </Card>
            )}
          </section>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Projects</h2>
              <Button
                variant="accent"
                size="sm"
                onClick={() => navigate("/post-core-opportunity")}
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>

            {projects && projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((project: any) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  />
                ))}
              </div>
            ) : (
              <Card variant="glass" className="p-8">
                <EmptyState
                  icon={<FolderOpen className="h-10 w-10 text-muted-foreground" />}
                  title="No projects yet"
                  description="Create your first project to start making an impact"
                  action={{ label: "Create Project", onClick: () => navigate("/post-core-opportunity") }}
                />
              </Card>
            )}
          </section>
        )}

        {/* Team Tab */}
        {activeTab === "team" && (
          <section className="space-y-3">
            {/* Log Hours — always visible at top of Team tab */}
            <Card variant="glass" className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Log Volunteer Hours & Impact</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Record verified outcomes for your team</p>
                </div>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => navigate("/ngo/log-hours")}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Log Hours
                </Button>
              </div>
            </Card>

            {/* Volunteer list */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Volunteers</h2>
              <Badge variant="secondary">
                {volunteers?.length || 0} members
              </Badge>
            </div>

            {volunteers && volunteers.length > 0 ? (
              <div className="space-y-3">
                {volunteers.map((member: any) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    onClick={() => {}}
                  />
                ))}
              </div>
            ) : (
              <Card variant="glass" className="p-8">
                <EmptyState
                  icon={<Users className="h-10 w-10 text-muted-foreground" />}
                  title="No team members"
                  description="Volunteers will appear here when they join your projects"
                />
              </Card>
            )}
          </section>
        )}

        {/* More Tab */}
        {activeTab === "more" && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">More Options</h2>

            <div className="space-y-2">
              {[
                { icon: BarChart3, label: "Evidence Summary", path: "/organization-impact-report", color: "text-primary" },
                { icon: TrendingUp, label: "Analytics", path: "/overview", color: "text-success" },
                { icon: Plus, label: "Create Project", path: "/post-core-opportunity", color: "text-accent" },
                { icon: Settings, label: "Settings", path: "/organization-profile-settings", color: "text-muted-foreground" },
                { icon: Globe, label: "Help & Support", path: "/help", color: "text-muted-foreground" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.path}
                    variant="glass"
                    interactive
                    className="p-4"
                    onClick={() => navigate(item.path)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary">
                        <Icon className={cn("h-5 w-5", item.color)} />
                      </div>
                      <span className="text-sm font-medium text-foreground flex-1">
                        {item.label}
                      </span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="pt-4">
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/30"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={pendingCount}
      />

      {/* Slide-out Menu */}
      <SlideOutMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        organization={organization}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
    </div>
  );
}
