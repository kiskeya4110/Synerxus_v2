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
  FileText,
} from "lucide-react";
import DOMPurify from "dompurify";
import { getSDGColor, getSDGName } from "@/lib/sdg-utils";

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
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";
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
      {volunteers.map((volunteer) => (
        <div
          key={volunteer.id}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
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
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "overview";
  });

  // Report filter state
  const [reportProjectFilter, setReportProjectFilter] = useState("all");
  const [reportTimePeriod, setReportTimePeriod] = useState("30d");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportHtml, setReportHtml] = useState<string | null>(null);

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
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/users/me`, { headers, credentials: "include" });
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
    queryKey: ["/api/organization/dashboard", userId, currentUser?.organizationId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/organization/dashboard`, {
        headers, credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to load dashboard");
      return response.json();
    },
    enabled: !!userId && !!currentUser?.organizationId,
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

  // Fetch report data (only when Reports tab is active)
  const { data: reportData, isLoading: isLoadingReport, refetch: refetchReport } = useQuery({
    queryKey: ["/api/organization/report", userId, reportProjectFilter, reportTimePeriod, reportStartDate, reportEndDate],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (reportProjectFilter && reportProjectFilter !== 'all') params.set('projectId', reportProjectFilter);
      if (reportStartDate && reportEndDate) {
        params.set('startDate', reportStartDate);
        params.set('endDate', reportEndDate);
      } else {
        params.set('timePeriod', reportTimePeriod);
      }
      const response = await fetch(`/api/organization/report?${params.toString()}`, {
        headers, credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to load report");
      return response.json();
    },
    enabled: activeTab === 'reports' && !!userId,
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
      pendingVerifications: pendingVerifications.length || data.pendingCount || 0,
      impactScore: data.aiuEarned || 0,
      sdgsAddressed: data.sdgsAddressed || 0,
    };
  }, [dashboardData, projects, volunteers, pendingVerifications]);

  // Helper: redact volunteer name to initials for external report privacy
  const redactName = (name: string): string => {
    if (!name || name === "Unknown") return "Volunteer";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + ".";
    return parts.map(p => p.charAt(0).toUpperCase() + ".").join("");
  };

  // Generate Synerxus-branded org PDF report (fully formatted, volunteer names redacted for external sharing)
  const generateSynerxusReport = () => {
    const orgName = (organization as any)?.name || currentUser?.displayName || "Organization";
    const currentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const summary = (reportData as any)?.summary || {};
    const sdgDist: any[] = (reportData as any)?.sdgDistribution || [];
    const reportProjects: any[] = (reportData as any)?.projects || [];
    const reportVolunteers: any[] = (reportData as any)?.volunteers || [];
    const activityLog: any[] = (reportData as any)?.activityLog || [];
    const filters = (reportData as any)?.filters || {};
    const totalHours = summary.totalHours || 0;

    // Build filter label for header
    const periodLabels: Record<string, string> = { "7d": "Last 7 Days", "30d": "Last 30 Days", "90d": "Last 90 Days", "1y": "Last Year", "all": "All Time" };
    let periodLabel = "All Time";
    if (filters.startDate && filters.endDate) {
      periodLabel = `${new Date(filters.startDate).toLocaleDateString()} – ${new Date(filters.endDate).toLocaleDateString()}`;
    } else if (filters.timePeriod && periodLabels[filters.timePeriod]) {
      periodLabel = periodLabels[filters.timePeriod];
    }
    const selectedProject = reportProjectFilter !== 'all'
      ? (projects as any[]).find((p: any) => String(p.id) === reportProjectFilter)?.name || "Selected Project"
      : "All Projects";

    const htmlContent = `<!DOCTYPE html><html><head><title>${orgName} – Synerxus Impact Report</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;padding:40px;color:#333;background:#fff}
      .report-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:3px solid #f59e0b}
      .header-left{flex:2}.header-right{flex:1;background:linear-gradient(135deg,#fff7ed,#ffedd5);padding:16px;border-radius:12px;border:2px solid #f59e0b;margin-left:24px}
      .logo{display:flex;align-items:center;gap:16px;margin-bottom:16px}
      .syner{font-size:28px;font-weight:800;color:#1e3a5f;letter-spacing:-1px}
      .xus{font-size:28px;font-weight:800;color:#f59e0b;letter-spacing:-1px}
      .divider{width:2px;height:32px;background:#d1d5db;margin:0 8px}
      .org-name{font-size:18px;font-weight:600;color:#374151}
      .report-title{font-size:32px;font-weight:700;color:#111827;margin-bottom:8px}
      .badge{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:.5px;margin-right:8px}
      .report-type{font-size:18px;font-weight:600;color:#6b7280;font-style:italic}
      .meta{font-size:13px;color:#6b7280;margin-top:8px}
      .filter-pill{display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:12px;padding:3px 10px;font-size:12px;color:#374151;margin-right:6px;margin-top:6px}
      .score-label{font-size:11px;color:#d97706;text-transform:uppercase;font-weight:700;margin-bottom:8px}
      .score-value{font-size:36px;font-weight:800;color:#92400e}
      .score-sub{font-size:12px;color:#6b7280;margin-top:4px}
      h2{font-size:20px;font-weight:700;color:#92400e;margin:32px 0 16px;padding-bottom:8px;border-bottom:2px solid #f59e0b}
      .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:24px 0}
      .metric{background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center}
      .metric.o{border-left:4px solid #f59e0b}.metric.g{border-left:4px solid #10b981}.metric.b{border-left:4px solid #3b82f6}.metric.p{border-left:4px solid #8b5cf6}.metric.r{border-left:4px solid #ef4444}
      .mv{font-size:28px;font-weight:800;color:#92400e}.ml{font-size:12px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.3px}
      table{width:100%;border-collapse:collapse;margin:16px 0;border-radius:8px;overflow:hidden}
      th{background:linear-gradient(135deg,#92400e,#b45309);color:#fff;padding:12px 14px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px}
      td{padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px}
      tr:nth-child(even) td{background:#fafafa}
      .status-pill{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;text-transform:capitalize}
      .status-active{background:#dcfce7;color:#166534}.status-completed{background:#dbeafe;color:#1e40af}.status-planning{background:#fef9c3;color:#854d0e}
      .sdg-dot{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;color:#fff;font-weight:700;font-size:11px;margin-right:8px;vertical-align:middle}
      .bar{width:100%;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden}
      .bar-fill{height:100%;background:linear-gradient(90deg,#f59e0b,#d97706);border-radius:4px}
      .redacted{background:#1f2937;color:#1f2937;border-radius:3px;padding:0 2px;font-size:12px;letter-spacing:2px;user-select:none}
      .privacy-note{background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 16px;font-size:12px;color:#92400e;margin:16px 0}
      .footer{margin-top:48px;padding-top:24px;border-top:2px solid #e5e7eb;text-align:center}
      .f-syner{font-size:20px;font-weight:800;color:#1e3a5f}.f-xus{font-size:20px;font-weight:800;color:#f59e0b}
      .f-tag{font-size:12px;color:#6b7280;font-style:italic;margin:8px 0}
      .f-conf{font-size:11px;color:#9ca3af;padding:8px 16px;background:#f9fafb;border-radius:6px;display:inline-block}
      .f-copy{font-size:11px;color:#9ca3af;margin-top:12px}
      @media print{body{padding:20px}h2{page-break-before:auto}table{page-break-inside:avoid}}
    </style></head><body>
      <div class="report-header">
        <div class="header-left">
          <div class="logo"><span class="syner">SYNER</span><span class="xus">XUS</span><div class="divider"></div><span class="org-name">${orgName}</span></div>
          <div class="report-title">${orgName}</div>
          <div style="margin-bottom:8px"><span class="badge">&#10003; Verified</span><span class="report-type">Impact Report</span></div>
          <div class="meta">Generated: ${currentDate} &nbsp;|&nbsp; <span style="color:#f59e0b;font-weight:600">&#10003; Blockchain Verified</span></div>
          <div style="margin-top:8px">
            <span class="filter-pill">Period: ${periodLabel}</span>
            <span class="filter-pill">Scope: ${selectedProject}</span>
          </div>
        </div>
        <div class="header-right">
          <div class="score-label">SDGs Addressed</div>
          <div class="score-value">${summary.sdgsAddressed || 0}</div>
          <div class="score-sub">UN Global Goals</div>
          <div style="margin-top:12px;font-size:12px;color:#6b7280">${summary.aiuEarned || 0} AIU Earned</div>
        </div>
      </div>

      <h2>Key Performance Metrics</h2>
      <div class="metrics">
        <div class="metric o"><div class="mv">${totalHours.toLocaleString()}</div><div class="ml">Total Vol. Hours</div></div>
        <div class="metric g"><div class="mv">${(summary.verifiedHours || 0).toLocaleString()}</div><div class="ml">Verified Hours</div></div>
        <div class="metric b"><div class="mv">${(summary.totalVolunteers || 0).toLocaleString()}</div><div class="ml">Volunteers</div></div>
        <div class="metric p"><div class="mv">${(summary.peopleImpacted || 0).toLocaleString()}</div><div class="ml">People Impacted</div></div>
        <div class="metric r"><div class="mv">${summary.totalProjects || 0}</div><div class="ml">Total Projects</div></div>
        <div class="metric o"><div class="mv">${summary.activeProjects || 0}</div><div class="ml">Active Projects</div></div>
        <div class="metric g"><div class="mv">${summary.completedProjects || 0}</div><div class="ml">Completed Projects</div></div>
        <div class="metric b"><div class="mv">${summary.aiuEarned || 0}</div><div class="ml">AIU Earned</div></div>
      </div>

      <h2>Project Breakdown</h2>
      <table><thead><tr>
        <th style="width:28%">Project Name</th>
        <th style="width:12%">Status</th>
        <th style="width:12%">Total Hours</th>
        <th style="width:12%">Verified Hrs</th>
        <th style="width:12%">Volunteers</th>
        <th style="width:12%">People Impacted</th>
        <th style="width:12%">Completion</th>
      </tr></thead>
      <tbody>${reportProjects.length > 0 ? reportProjects.map((p: any) => {
        const statusClass = p.status === 'completed' ? 'status-completed' : p.status === 'active' ? 'status-active' : 'status-planning';
        return `<tr>
          <td><strong>${p.name}</strong>${p.location ? `<br><span style="font-size:11px;color:#6b7280">${p.location}</span>` : ''}</td>
          <td><span class="status-pill ${statusClass}">${p.status}</span></td>
          <td>${(p.totalHours || 0).toLocaleString()} h</td>
          <td style="color:#166534">${(p.verifiedHours || 0).toLocaleString()} h</td>
          <td>${p.volunteerCount || 0}</td>
          <td>${(p.peopleImpacted || 0).toLocaleString()}</td>
          <td>${p.completionPercentage || 0}%</td>
        </tr>`;
      }).join("") : `<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:20px">No project data for selected period</td></tr>`}</tbody>
      </table>

      <h2>SDG Alignment &amp; Impact</h2>
      <table><thead><tr><th style="width:40%">SDG Goal</th><th style="width:20%">Hours Contributed</th><th style="width:20%">Progress</th><th style="width:10%">Projects</th><th style="width:10%">% of Total</th></tr></thead>
      <tbody>${sdgDist.length > 0 ? sdgDist.slice(0, 10).map((s: any) => {
        const pct = totalHours > 0 ? Math.round((s.hours / totalHours) * 100) : 0;
        return `<tr><td><span class="sdg-dot" style="background:${getSDGColor(s.sdg)}">${s.sdg}</span>${getSDGName(s.sdg)}</td><td>${(s.hours || 0).toLocaleString()} hrs</td><td><div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div></td><td>${s.projects || 0}</td><td><strong>${pct}%</strong></td></tr>`;
      }).join("") : `<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:20px">No SDG data for selected period</td></tr>`}</tbody></table>

      <h2>Volunteer Contributions</h2>
      <div class="privacy-note">&#128274; Volunteer identities are redacted in this report to protect personal privacy. Initials are shown in place of full names.</div>
      <table><thead><tr>
        <th style="width:25%">Volunteer</th>
        <th style="width:20%">Total Hours</th>
        <th style="width:20%">Verified Hours</th>
        <th style="width:20%">Activities</th>
        <th style="width:15%">Verification Rate</th>
      </tr></thead>
      <tbody>${reportVolunteers.length > 0 ? reportVolunteers.slice(0, 20).map((v: any, i: number) => {
        const rate = v.hours > 0 ? Math.round((v.verifiedHours / v.hours) * 100) : 0;
        return `<tr>
          <td><span class="redacted">${redactName(v.displayName)}</span></td>
          <td>${(v.hours || 0).toLocaleString()} h</td>
          <td style="color:#166534">${(v.verifiedHours || 0).toLocaleString()} h</td>
          <td>${v.activitiesCount || 0}</td>
          <td>${rate}%</td>
        </tr>`;
      }).join("") : `<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:20px">No volunteer data for selected period</td></tr>`}</tbody>
      </table>

      ${activityLog.length > 0 ? `
      <h2>Recent Activity Log</h2>
      <table><thead><tr>
        <th style="width:20%">Date</th>
        <th style="width:35%">Project</th>
        <th style="width:15%">Hours</th>
        <th style="width:15%">Status</th>
        <th style="width:15%">Description</th>
      </tr></thead>
      <tbody>${activityLog.slice(0, 30).map((a: any) => {
        const statusClass = a.verificationStatus === 'approved' || a.verificationStatus === 'verified' ? 'status-active' : a.verificationStatus === 'rejected' ? 'status-planning' : '';
        const dateStr = a.date ? new Date(a.date).toLocaleDateString() : '—';
        return `<tr>
          <td>${dateStr}</td>
          <td>${a.projectName || '—'}</td>
          <td>${(a.hours || 0).toLocaleString()} h</td>
          <td><span class="status-pill ${statusClass}">${a.verificationStatus || 'pending'}</span></td>
          <td style="font-size:11px;color:#6b7280">${(a.description || '').slice(0, 60)}${(a.description || '').length > 60 ? '…' : ''}</td>
        </tr>`;
      }).join("")}</tbody></table>` : ''}

      <div class="footer">
        <div style="display:flex;justify-content:center;gap:2px;margin-bottom:8px"><span class="f-syner">SYNER</span><span class="f-xus">XUS</span></div>
        <div class="f-tag">Connect. Manage. Impact Globally.</div>
        <div style="font-size:13px;color:#374151;margin-bottom:8px">Generated on ${currentDate} &middot; ${orgName} Impact Report &middot; Period: ${periodLabel}</div>
        <div class="f-conf">CONFIDENTIAL &mdash; This report is intended for authorized recipients only. Volunteer data has been redacted.</div>
        <div class="f-copy">&copy; ${new Date().getFullYear()} Synerxus. All rights reserved. | support@synerxus.com</div>
      </div>
    </body></html>`;
    // Sanitize while explicitly preserving <style> blocks (stripped by DOMPurify default)
    const sanitized = DOMPurify.sanitize(htmlContent, {
      WHOLE_DOCUMENT: true,
      ADD_TAGS: ["style"],
      FORCE_BODY: false,
    });
    setReportHtml(sanitized || htmlContent);
  };

  // Approval handlers
  const handleApprove = async (id: number) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await apiRequest("POST", `/api/volunteer-activities/${id}/approve`, { reviewerId: userId });
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/organization/dashboard"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/organization/dashboard"] });
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

  // Mobile View - Simple NGO Dashboard per redesign spec
  // Skip simplified mobile view when on reports tab so the full reports UI renders
  if (isMobile && activeTab !== 'reports') {
    return (
      <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full bg-stone-100 text-stone-900 flex flex-col overflow-hidden">
        {/* Centered App Container */}
        <div className="relative w-full h-full max-w-[428px] mx-auto flex flex-col overflow-hidden">
          {/* Shared PWA Header with working hamburger menu */}
          <OrganizationPWAHeader
            organizationName={organization?.name || "Verify Hub"}
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
              {pendingVerifications.map((item) => (
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
                  {item.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                  )}
                  {item.sdgGoals && item.sdgGoals.length > 0 && (
                    <div className="flex gap-1 mb-2">
                      {item.sdgGoals.map((sdg) => (
                        <span key={sdg} className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white bg-emerald-600">
                          SDG {sdg}
                        </span>
                      ))}
                    </div>
                  )}
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
              {projects.map((project: any) => (
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
      <main className={`container max-w-7xl mx-auto px-4 py-8 space-y-8 ${isMobile ? 'pb-24' : ''}`}>
        {/* Page Header */}
        <PageHeader
          title={organization?.name || "Verify Hub"}
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
          <TabsList className="w-full max-w-2xl">
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
            <TabsTrigger value="reports" className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              Reports
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
                      label="People Impacted"
                      value={dashboardData?.keyMetrics?.peopleImpacted || 0}
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
                      {pendingVerifications.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                          onClick={() => setActiveTab("verify")}
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
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
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

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-6 space-y-6">
            {/* Filter Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Generate Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Project</label>
                    <Select value={reportProjectFilter} onValueChange={setReportProjectFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {(projects as any[]).map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Time Period</label>
                    <Select value={reportTimePeriod} onValueChange={(v) => { setReportTimePeriod(v); setReportStartDate(""); setReportEndDate(""); }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                        <SelectItem value="1y">Last year</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="custom">Custom range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {reportTimePeriod === "custom" && (
                    <>
                      <div className="flex-1 min-w-[140px]">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">From</label>
                        <Input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} />
                      </div>
                      <div className="flex-1 min-w-[140px]">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
                        <Input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} />
                      </div>
                    </>
                  )}
                  <Button onClick={() => refetchReport()} disabled={isLoadingReport} variant="default">
                    {isLoadingReport ? "Loading..." : "Run Report"}
                  </Button>
                  {reportData && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const rows = [
                          ["Project", "Status", "Total Hours", "Verified Hours", "Volunteers", "People Impacted", "Completion %"],
                          ...(reportData.projects || []).map((p: any) => [
                            p.name, p.status, p.totalHours, p.verifiedHours, p.volunteerCount, p.peopleImpacted, p.completionPercentage
                          ]),
                        ];
                        const csv = rows.map(r => r.join(",")).join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `report-${new Date().toISOString().split("T")[0]}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Export CSV
                    </Button>
                  )}
                  <Button
                    variant="default"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={generateSynerxusReport}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Synerxus Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary Metrics */}
            {reportData && (
              <>
                <Grid columns={4}>
                  <MetricCard label="Total Hours" value={reportData.summary?.totalHours || 0} />
                  <MetricCard label="Verified Hours" value={reportData.summary?.verifiedHours || 0} />
                  <MetricCard label="Volunteers" value={reportData.summary?.totalVolunteers || 0} />
                  <MetricCard label="People Impacted" value={reportData.summary?.peopleImpacted || 0} />
                  <MetricCard label="Projects" value={reportData.summary?.totalProjects || 0} />
                  <MetricCard label="Active Projects" value={reportData.summary?.activeProjects || 0} />
                  <MetricCard label="SDGs Addressed" value={reportData.summary?.sdgsAddressed || 0} />
                  <MetricCard label="AIU Earned" value={reportData.summary?.aiuEarned || 0} />
                </Grid>

                {/* Project Breakdown */}
                {(reportData.projects || []).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Project</th>
                              <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Status</th>
                              <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Hours</th>
                              <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Verified</th>
                              <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Volunteers</th>
                              <th className="text-right py-2 font-medium text-muted-foreground">People Impacted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(reportData.projects as any[]).map((p: any) => (
                              <tr key={p.id} className="border-b last:border-0 hover:bg-secondary/20">
                                <td className="py-2.5 pr-4 font-medium">{p.name}</td>
                                <td className="py-2.5 pr-4 text-right">
                                  <Badge variant={p.status === 'completed' ? 'success' : 'secondary'} size="sm">
                                    {p.status}
                                  </Badge>
                                </td>
                                <td className="py-2.5 pr-4 text-right">{p.totalHours}h</td>
                                <td className="py-2.5 pr-4 text-right text-green-600">{p.verifiedHours}h</td>
                                <td className="py-2.5 pr-4 text-right">{p.volunteerCount}</td>
                                <td className="py-2.5 text-right">{p.peopleImpacted}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Volunteer Contributions */}
                {(reportData.volunteers || []).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Volunteer Contributions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(reportData.volunteers as any[]).slice(0, 10).map((v: any) => (
                          <div key={v.id} className="flex items-center gap-3">
                            <UserAvatar src={v.avatar} name={v.displayName} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{v.displayName}</p>
                              <p className="text-xs text-muted-foreground">{v.activitiesCount} activities</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{v.hours}h</p>
                              <p className="text-xs text-green-600">{v.verifiedHours}h verified</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* SDG Distribution */}
                {(reportData.sdgDistribution || []).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>SDG Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(reportData.sdgDistribution as any[]).map((s: any) => (
                          <div key={s.sdg} className="flex items-center gap-3">
                            <SDGBadge sdg={s.sdg} size="sm" />
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-muted-foreground">SDG {s.sdg}</span>
                                <span className="font-medium">{s.hours}h · {s.projects} project{s.projects !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min((s.hours / (reportData.summary?.totalHours || 1)) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <p className="text-xs text-muted-foreground text-right">
                  Report generated at {new Date(reportData.generatedAt).toLocaleString()}
                </p>
              </>
            )}

            {!reportData && !isLoadingReport && (
              <EmptyState
                title="No report generated yet"
                description="Select your filters above and click Run Report to generate a report."
                size="sm"
              />
            )}

            {isLoadingReport && (
              <LoadingState message="Generating report..." />
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      {!isMobile && <Footer />}

      {/* PWA Bottom Nav on mobile (shown when reports tab bypasses the mobile early return) */}
      {isMobile && <OrganizationPWANav activeTab="reports" />}

      {/* Inline Report Viewer Modal */}
      {reportHtml && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-stone-200 bg-stone-50 flex-shrink-0">
            <span className="text-sm font-semibold text-stone-800">Impact Report Preview</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => {
                  const frame = document.getElementById("report-iframe") as HTMLIFrameElement;
                  frame?.contentWindow?.print();
                }}
              >
                <FileText className="h-4 w-4 mr-1" />
                Print / Save as PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReportHtml(null)}>
                Close
              </Button>
            </div>
          </div>
          {/* Report iframe */}
          <iframe
            id="report-iframe"
            srcDoc={reportHtml ?? undefined}
            sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
            className="flex-1 w-full border-0"
            title="Impact Report"
          />
        </div>
      )}
    </div>
  );
}
