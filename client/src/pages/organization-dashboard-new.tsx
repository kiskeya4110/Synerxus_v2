import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Clock,
  Target,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  ChevronRight,
  FolderOpen,
  TrendingUp,
  Shield,
  Building2,
  BarChart3,
  Eye,
  CheckCheck,
  Filter,
  Search,
  Calendar,
  Globe,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stat, StatGroup } from "@/components/ui/stat";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/empty-state";
import { Section, PageHeader, Grid, Stack, Divider } from "@/components/ui/section";
import Logo from "@/components/ui/logo";

// Layout Components
import OrganizationNav from "@/components/layout/organization-nav";
import Footer from "@/components/layout/footer";
import OrganizationPWAHeader from "@/components/layout/organization-pwa-header";
import OrganizationPWANav from "@/components/layout/organization-pwa-nav";

// Hooks & Utils
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDecimal } from "@/lib/format-utils";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================
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

interface Project {
  id: number;
  name: string;
  status: string;
  completionPercentage: number;
  activeVolunteers: number;
  totalHours: number;
  sdgGoals: number[];
}

interface Volunteer {
  id: number;
  name: string;
  avatar?: string;
  email: string;
  totalHours: number;
  projectsCount: number;
  lastActive: string;
  status: "active" | "inactive";
}

// ============================================================================
// Verification Queue Item Component
// ============================================================================
interface VerificationItemProps {
  item: PendingVerification;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isProcessing?: boolean;
}

function VerificationItem({ item, onApprove, onReject, isProcessing }: VerificationItemProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-all">
      {/* Volunteer Avatar */}
      <UserAvatar
        src={item.volunteerAvatar}
        name={item.volunteerName}
        size="default"
      />

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h4 className="font-semibold text-foreground">{item.volunteerName}</h4>
            <p className="text-sm text-muted-foreground">{item.projectName}</p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(item.submittedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Hours & Outcome */}
        <div className="flex items-center gap-3 mt-2">
          <Badge variant="outline-primary" size="sm">
            <Clock className="h-3 w-3 mr-1" />
            {item.hours}h
          </Badge>
          {item.outcomeType && item.outcomeValue && (
            <Badge variant="secondary" size="sm">
              {item.outcomeValue} {item.outcomeType.replace(/_/g, " ")}
            </Badge>
          )}
        </div>

        {/* SDG Tags */}
        {item.sdgGoals && item.sdgGoals.length > 0 && (
          <div className="flex gap-1 mt-2">
            {item.sdgGoals.slice(0, 3).map((sdg) => (
              <SDGBadge key={sdg} sdg={sdg as any} size="sm" />
            ))}
          </div>
        )}

        {/* Description */}
        {item.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="success"
          onClick={() => onApprove(item.id)}
          disabled={isProcessing}
          className="w-24"
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Verify
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onReject(item.id)}
          disabled={isProcessing}
          className="w-24"
        >
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Verification Queue Component
// ============================================================================
interface VerificationQueueProps {
  items: PendingVerification[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onApproveAll: () => void;
  processingIds: Set<number>;
  isApprovingAll?: boolean;
  isLoading?: boolean;
}

function VerificationQueue({
  items,
  onApprove,
  onReject,
  onApproveAll,
  processingIds,
  isApprovingAll,
  isLoading,
}: VerificationQueueProps) {
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.volunteerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.projectName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [items, searchQuery]);

  if (isLoading) {
    return <LoadingState message="Loading verification queue..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search volunteer or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {items.length > 0 && (
          <Button
            variant="accent"
            onClick={onApproveAll}
            disabled={isApprovingAll}
            loading={isApprovingAll}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Approve All ({items.length})
          </Button>
        )}
      </div>

      {/* Queue List */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6 text-success" />}
          title="All caught up!"
          description="No pending verifications at the moment."
          size="sm"
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <VerificationItem
              key={item.id}
              item={item}
              onApprove={onApprove}
              onReject={onReject}
              isProcessing={processingIds.has(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Project Card Component
// ============================================================================
interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const statusColors = {
    active: "success",
    completed: "info",
    draft: "secondary",
    paused: "warning",
  } as const;

  return (
    <Card variant="default" interactive onClick={onClick} className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">{project.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={statusColors[project.status as keyof typeof statusColors] || "secondary"}
              size="sm"
            >
              {project.status}
            </Badge>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>

      <ProgressWithLabel
        label="Completion"
        value={project.completionPercentage}
        size="sm"
        indicatorColor="primary"
      />

      <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-border">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">{project.activeVolunteers}</p>
          <p className="text-xs text-muted-foreground">Volunteers</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">{project.totalHours}h</p>
          <p className="text-xs text-muted-foreground">Hours</p>
        </div>
      </div>

      {project.sdgGoals.length > 0 && (
        <div className="flex gap-1 mt-3 pt-3 border-t border-border">
          {project.sdgGoals.slice(0, 4).map((sdg) => (
            <SDGBadge key={sdg} sdg={sdg as any} size="sm" />
          ))}
          {project.sdgGoals.length > 4 && (
            <Badge variant="secondary" size="sm">+{project.sdgGoals.length - 4}</Badge>
          )}
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// Volunteer Roster Component
// ============================================================================
interface VolunteerRosterProps {
  volunteers: Volunteer[];
  isLoading?: boolean;
  onViewVolunteer?: (id: number) => void;
}

function VolunteerRoster({ volunteers, isLoading, onViewVolunteer }: VolunteerRosterProps) {
  if (isLoading) {
    return <LoadingState message="Loading volunteers..." size="sm" />;
  }

  if (volunteers.length === 0) {
    return (
      <EmptyState
        title="No volunteers yet"
        description="Volunteers will appear here when they join your projects."
        size="sm"
      />
    );
  }

  return (
    <div className="space-y-2">
      {volunteers.slice(0, 5).map((volunteer) => (
        <div
          key={volunteer.id}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          onClick={() => onViewVolunteer?.(volunteer.id)}
        >
          <UserAvatar src={volunteer.avatar} name={volunteer.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{volunteer.name}</p>
            <p className="text-xs text-muted-foreground">
              {volunteer.totalHours}h across {volunteer.projectsCount} projects
            </p>
          </div>
          <Badge
            variant={volunteer.status === "active" ? "success" : "secondary"}
            size="sm"
          >
            {volunteer.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// SDG Impact Summary Component
// ============================================================================
interface SDGImpactProps {
  sdgData: Array<{ goal: number; hours: number; projects: number }>;
}

function SDGImpactSummary({ sdgData }: SDGImpactProps) {
  const sortedData = useMemo(() => {
    return [...sdgData].sort((a, b) => b.hours - a.hours).slice(0, 6);
  }, [sdgData]);

  const totalHours = useMemo(() => {
    return sdgData.reduce((sum, item) => sum + item.hours, 0);
  }, [sdgData]);

  if (sortedData.length === 0) {
    return (
      <EmptyState
        title="No SDG data"
        description="SDG impact will appear when projects log activities."
        size="sm"
      />
    );
  }

  return (
    <div className="space-y-4">
      {sortedData.map((item) => {
        const percentage = totalHours > 0 ? (item.hours / totalHours) * 100 : 0;
        return (
          <div key={item.goal} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SDGBadge sdg={item.goal as any} size="sm" />
                <span className="text-sm text-muted-foreground">
                  {item.projects} project{item.projects !== 1 ? "s" : ""}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground">{item.hours}h</span>
            </div>
            <Progress value={percentage} size="xs" indicatorColor="primary" />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================
export default function OrganizationDashboardNew() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();

  const userId = localStorage.getItem("currentUserId");
  const userType = localStorage.getItem("userType");

  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Redirect non-organizations
  useEffect(() => {
    if (userType === "corporate-partner") {
      navigate("/csr-dashboard");
    } else if (userType === "volunteer") {
      navigate("/volunteer-dashboard");
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

  // Fetch organization data
  const { data: organization } = useQuery({
    queryKey: ["/api/organizations", currentUser?.organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/organizations?id=${currentUser.organizationId}`);
      if (!response.ok) throw new Error("Organization not found");
      const data = await response.json();
      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!currentUser?.organizationId,
  });

  // Fetch dashboard stats
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["/api/organization-dashboard", currentUser?.organizationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/organization-dashboard?organizationId=${currentUser.organizationId}`
      );
      if (!response.ok) throw new Error("Failed to load dashboard");
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  // Fetch pending verifications
  const { data: pendingData, isLoading: isLoadingPending, refetch: refetchPending } = useQuery({
    queryKey: ["/api/pending-approvals", currentUser?.organizationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/pending-approvals?organizationId=${currentUser.organizationId}`
      );
      if (!response.ok) throw new Error("Failed to load pending approvals");
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects", currentUser?.organizationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects?organizationId=${currentUser.organizationId}`
      );
      if (!response.ok) throw new Error("Failed to load projects");
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  // Fetch volunteers
  const { data: volunteers = [], isLoading: isLoadingVolunteers } = useQuery({
    queryKey: ["/api/volunteers", currentUser?.organizationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/volunteers?organizationId=${currentUser.organizationId}`
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  // Demo user fallback
  const demoUser = useMemo(() => {
    if (userId && userType === "organization" && !currentUser) {
      return {
        id: parseInt(userId),
        displayName: "Demo Organization",
        email: "demo-org@example.com",
        userType: "organization",
        organizationId: 1,
      };
    }
    return null;
  }, [userId, userType, currentUser]);

  const activeUser = currentUser || demoUser;

  // Process pending items into verification format
  const pendingVerifications: PendingVerification[] = useMemo(() => {
    if (!pendingData) return [];

    const activities = pendingData.pendingActivities || [];
    const impacts = pendingData.pendingImpacts || [];

    return [
      ...activities.map((a: any) => ({
        id: a.id,
        volunteerName: a.volunteerName || "Unknown Volunteer",
        volunteerAvatar: a.volunteerAvatar,
        projectName: a.projectName || "Unknown Project",
        hours: a.hours || 0,
        description: a.description,
        outcomeType: a.outcomeType,
        outcomeValue: a.outcomeValue,
        sdgGoals: a.sdgGoals || [],
        submittedAt: a.createdAt || new Date().toISOString(),
        status: "pending" as const,
      })),
      ...impacts.map((i: any) => ({
        id: i.id,
        volunteerName: i.volunteerName || "Impact Record",
        projectName: i.projectName || "Unknown Project",
        hours: 0,
        description: `${i.metricName}: ${i.value}`,
        sdgGoals: i.sdgGoals || [],
        submittedAt: i.createdAt || new Date().toISOString(),
        status: "pending" as const,
      })),
    ];
  }, [pendingData]);

  // Calculate stats
  const stats = useMemo(() => {
    const data = dashboardData?.keyMetrics || {};
    return {
      activeProjects: data.activeProjects || projects.filter((p: any) => p.status === "active").length,
      totalVolunteers: data.activeVolunteers || volunteers.length,
      totalHours: data.totalHours || 0,
      pendingVerifications: pendingVerifications.length,
      impactScore: data.aiuEarned || 0,
      sdgsAddressed: data.sdgsAddressed || 0,
    };
  }, [dashboardData, projects, volunteers, pendingVerifications]);

  // Approval handlers
  const handleApprove = async (id: number) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await apiRequest("POST", `/api/volunteer-activities/${id}/approve`, { reviewerId: userId });
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/organization-dashboard"] });
      toast({ title: "Verified!", description: "Hours have been verified successfully." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to verify hours.", variant: "destructive" });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleReject = async (id: number) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await apiRequest("POST", `/api/volunteer-activities/${id}/reject`, { reviewerId: userId });
      refetchPending();
      toast({ title: "Rejected", description: "The submission has been rejected." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to reject.", variant: "destructive" });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleApproveAll = async () => {
    if (pendingVerifications.length === 0) return;

    setIsApprovingAll(true);
    const ids = pendingVerifications.map((p) => p.id);
    ids.forEach((id) => setProcessingIds((prev) => new Set(prev).add(id)));

    try {
      await Promise.all(
        ids.map((id) =>
          apiRequest("POST", `/api/volunteer-activities/${id}/approve`, { reviewerId: userId })
        )
      );
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/organization-dashboard"] });
      toast({
        title: "All Verified!",
        description: `${ids.length} submission${ids.length !== 1 ? "s" : ""} verified.`,
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to verify some items.", variant: "destructive" });
    } finally {
      setProcessingIds(new Set());
      setIsApprovingAll(false);
    }
  };

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

  // Mobile View - Simple NGO Dashboard per redesign spec
  if (isMobile) {
    return (
      <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full bg-stone-100 text-stone-900 flex flex-col overflow-hidden">
        {/* Centered App Container */}
        <div className="relative w-full h-full max-w-[428px] mx-auto flex flex-col overflow-hidden">
          {/* Shared PWA Header with working hamburger menu */}
          <OrganizationPWAHeader
            organizationName="NGO Portal"
            metrics={{
              activeProjects: stats.activeProjects,
              activeVolunteers: stats.totalVolunteers,
              totalHours: stats.totalHours,
            }}
          />

          {/* Spacer for sticky header */}
          <div className="flex-shrink-0" style={{ height: 'calc(env(safe-area-inset-top, 0px) + 64px)' }} />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto px-4 py-5 space-y-5" style={{ paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}>
          {/* Core Metrics - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Pending Verification */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-medium text-gray-500 uppercase">Pending</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingVerifications}</p>
              <p className="text-xs text-gray-500 mt-1">to verify</p>
            </div>

            {/* Total Hours */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-gray-500 uppercase">Hours</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalHours}</p>
              <p className="text-xs text-gray-500 mt-1">total logged</p>
            </div>

            {/* Active Projects */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-medium text-gray-500 uppercase">Projects</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.activeProjects}</p>
              <p className="text-xs text-gray-500 mt-1">active</p>
            </div>

            {/* Total Volunteers */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-gray-500 uppercase">Volunteers</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalVolunteers}</p>
              <p className="text-xs text-gray-500 mt-1">contributing</p>
            </div>
          </div>

          {/* Verification Queue Preview */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-600" />
                Pending Verification
              </h2>
              {pendingVerifications.length > 0 && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  {pendingVerifications.length} pending
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {pendingVerifications.slice(0, 3).map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                        {item.volunteerName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.volunteerName}</p>
                        <p className="text-xs text-gray-500">{item.hours}h • {item.projectName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={processingIds.has(item.id)}
                      className="flex-1 py-2 px-3 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      ✓ Verify
                    </button>
                    <button
                      onClick={() => handleReject(item.id)}
                      disabled={processingIds.has(item.id)}
                      className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
              {pendingVerifications.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">All caught up!</p>
                  <p className="text-xs text-gray-500 mt-1">No pending verifications</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Projects */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-indigo-600" />
                Active Projects
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {projects.slice(0, 3).map((project: any) => (
                <div key={project.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{project.name}</p>
                    <p className="text-xs text-gray-500">{project.volunteerCount || 0} volunteers</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    project.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {project.status || 'active'}
                  </span>
                </div>
              ))}
              {projects.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-500">No projects yet</p>
                </div>
              )}
            </div>
          </div>
        </main>

          {/* Bottom Navigation - Shared Component */}
          <OrganizationPWANav activeTab="home" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pwa-gradient-bg">
      {/* Navigation */}
      <OrganizationNav />

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Page Header */}
        <PageHeader
          title={organization?.name || "Organization Dashboard"}
          description="Verify volunteer hours, manage projects, and track your impact."
          actions={
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/volunteers")}>
                <Users className="h-4 w-4 mr-2" />
                Manage Team
              </Button>
              <Button variant="accent" onClick={() => navigate("/post-core-opportunity")}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>
          }
        />

        {/* Quick Stats */}
        <Grid columns={4} gap="default">
          <MetricCard
            label="Active Projects"
            value={stats.activeProjects}
            accentColor="primary"
            icon={<FolderOpen className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            label="Total Volunteers"
            value={stats.totalVolunteers}
            accentColor="success"
            icon={<Users className="h-5 w-5 text-success" />}
          />
          <MetricCard
            label="Hours Logged"
            value={stats.totalHours}
            accentColor="accent"
            icon={<Clock className="h-5 w-5 text-accent" />}
          />
          <MetricCard
            label="Pending Verification"
            value={stats.pendingVerifications}
            accentColor="cyan"
            icon={<AlertCircle className="h-5 w-5 text-[#22D3EE]" />}
          />
        </Grid>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="overview" className="flex-1">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="verify" className="flex-1 relative">
              <Shield className="h-4 w-4 mr-2" />
              Verify
              {stats.pendingVerifications > 0 && (
                <Badge variant="destructive" size="sm" className="ml-2">
                  {stats.pendingVerifications}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex-1">
              <FolderOpen className="h-4 w-4 mr-2" />
              Projects
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Impact Score Card */}
              <Card variant="glass" className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Organization Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <Stat
                      label="Impact Score"
                      value={formatDecimal(stats.impactScore)}
                      suffix="pts"
                      size="lg"
                    />
                    <Stat
                      label="Total Hours"
                      value={stats.totalHours}
                      suffix="hrs"
                      size="lg"
                    />
                    <Stat
                      label="SDGs Addressed"
                      value={stats.sdgsAddressed}
                      description="UN Goals"
                      size="lg"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* SDG Impact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-success" />
                    SDG Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SDGImpactSummary sdgData={dashboardData?.sdgDistribution || []} />
                </CardContent>
              </Card>
            </div>

            {/* Volunteer Roster & Pending */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Active Volunteers
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/volunteers")}>
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <VolunteerRoster
                    volunteers={volunteers.map((v: any) => ({
                      id: v.id,
                      name: v.displayName || v.name || "Volunteer",
                      avatar: v.avatar,
                      email: v.email || "",
                      totalHours: v.totalHours || 0,
                      projectsCount: v.projectsCount || 1,
                      lastActive: v.lastActive || new Date().toISOString(),
                      status: "active" as const,
                    }))}
                    isLoading={isLoadingVolunteers}
                  />
                </CardContent>
              </Card>

              {/* Quick Verification Preview */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-accent" />
                    Pending Verification
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("verify")}>
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {pendingVerifications.length === 0 ? (
                    <EmptyState
                      icon={<CheckCircle2 className="h-5 w-5 text-success" />}
                      title="All verified"
                      description="No pending items to review."
                      size="sm"
                    />
                  ) : (
                    <div className="space-y-3">
                      {pendingVerifications.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
                        >
                          <UserAvatar src={item.volunteerAvatar} name={item.volunteerName} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.volunteerName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.hours}h - {item.projectName}
                            </p>
                          </div>
                          <Badge variant="pending" size="sm">Pending</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Verify Tab */}
          <TabsContent value="verify" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Verification Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VerificationQueue
                  items={pendingVerifications}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onApproveAll={handleApproveAll}
                  processingIds={processingIds}
                  isApprovingAll={isApprovingAll}
                  isLoading={isLoadingPending}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-6">
            <Section
              title="Your Projects"
              action={
                <Button variant="accent" onClick={() => navigate("/post-core-opportunity")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              }
            >
              {projects.length === 0 ? (
                <EmptyState
                  title="No projects yet"
                  description="Create your first project to start tracking volunteer impact."
                  action={{
                    label: "Create Project",
                    onClick: () => navigate("/post-core-opportunity"),
                  }}
                />
              ) : (
                <Grid columns={3}>
                  {projects.map((project: any) => (
                    <ProjectCard
                      key={project.id}
                      project={{
                        id: project.id,
                        name: project.name,
                        status: project.status || "active",
                        completionPercentage: project.completionPercentage || 0,
                        activeVolunteers: project.volunteerCount || 0,
                        totalHours: project.totalHours || 0,
                        sdgGoals: project.sdgGoals || [],
                      }}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    />
                  ))}
                </Grid>
              )}
            </Section>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
