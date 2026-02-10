import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Globe,
  BarChart3,
  Search,
  CheckCheck,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, MetricCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, SDGBadge, StatusBadge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress, ProgressWithLabel } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Stat } from "@/components/ui/stat";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { Section, PageHeader, Grid } from "@/components/ui/section";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDecimal } from "@/lib/format-utils";
import { getSDGColor } from "@shared/sdg-goals";

// Types
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

// Verification Item Component
interface VerificationItemProps {
  item: PendingVerification;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isProcessing?: boolean;
}

function VerificationItem({ item, onApprove, onReject, isProcessing }: VerificationItemProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-all">
      <UserAvatar
        src={item.volunteerAvatar}
        name={item.volunteerName}
        size="default"
      />

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

        {item.sdgGoals && item.sdgGoals.length > 0 && (
          <div className="flex gap-1 mt-2">
            {item.sdgGoals.slice(0, 3).map((sdg) => (
              <SDGBadge key={sdg} sdg={sdg as any} size="sm" />
            ))}
          </div>
        )}

        {item.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>

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

// Verification Queue Component
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

// Project Card Component
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

// Volunteer Roster Component
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

// SDG Impact Summary Component
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

// Main OrganizationView Component
interface OrganizationViewProps {
  userId: string;
  isMobile: boolean;
  activeUser: any;
  organization: any;
  orgTab?: string;
  setOrgTab?: (tab: string) => void;
}

export default function OrganizationView({
  userId,
  isMobile,
  activeUser,
  organization,
  orgTab,
  setOrgTab,
}: OrganizationViewProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // History/Verification tab state
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [visibleCount, setVisibleCount] = useState(20);
  const [rejectState, setRejectState] = useState<{ logId: number; reason: string } | null>(null);

  // Fetch dashboard stats
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["/api/organization-dashboard", activeUser?.organizationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/organization-dashboard?organizationId=${activeUser.organizationId}`
      );
      if (!response.ok) throw new Error("Failed to load dashboard");
      return response.json();
    },
    enabled: !!activeUser?.organizationId,
  });

  // Fetch pending verifications
  const { data: pendingData, isLoading: isLoadingPending, refetch: refetchPending } = useQuery({
    queryKey: ["/api/pending-approvals", activeUser?.organizationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/pending-approvals?organizationId=${activeUser.organizationId}`
      );
      if (!response.ok) throw new Error("Failed to load pending approvals");
      return response.json();
    },
    enabled: !!activeUser?.organizationId,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects", activeUser?.organizationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects?organizationId=${activeUser.organizationId}`
      );
      if (!response.ok) throw new Error("Failed to load projects");
      return response.json();
    },
    enabled: !!activeUser?.organizationId,
  });

  // Fetch volunteers
  const { data: volunteers = [], isLoading: isLoadingVolunteers } = useQuery({
    queryKey: ["/api/volunteers", activeUser?.organizationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/volunteers?organizationId=${activeUser.organizationId}`
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!activeUser?.organizationId,
  });

  // Process pending items
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

  // Calculate stats - only from actual API data, no fake fallbacks
  const stats = useMemo(() => {
    const data = dashboardData?.keyMetrics || {};
    return {
      activeProjects: data.activeProjects || 0, // Only API data
      totalVolunteers: data.activeVolunteers || 0, // Only API data
      totalHours: data.totalHours || 0,
      pendingVerifications: pendingVerifications.length,
      impactScore: data.aiuEarned || 0,
      sdgsAddressed: data.sdgsAddressed || 0,
    };
  }, [dashboardData, pendingVerifications]);

  // Fetch ALL logs for history/verification view
  const { data: allOrgLogs = [], isLoading: isLoadingAllLogs } = useQuery({
    queryKey: ["/api/logs/org-all", activeUser?.organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/logs?ngo_id=${activeUser.organizationId}`);
      if (!response.ok) return [];
      const logs = await response.json();
      return Array.isArray(logs) ? logs : [];
    },
    enabled: !!activeUser?.organizationId,
  });

  // Filtered + sorted logs for history view
  const filteredHistoryLogs = useMemo(() => {
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'verified': 'approved',
      'rejected': 'rejected',
    };
    const logs = historyFilter === 'all'
      ? [...allOrgLogs]
      : allOrgLogs.filter((l: any) => l.verificationStatus === statusMap[historyFilter]);
    return logs.sort((a: any, b: any) =>
      new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
    );
  }, [allOrgLogs, historyFilter]);

  const handleHistoryFilterChange = (filter: 'all' | 'pending' | 'verified' | 'rejected') => {
    setHistoryFilter(filter);
    setVisibleCount(20);
  };

  // Approval handlers (use new /api/logs endpoints)
  const handleApprove = async (id: number) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      const response = await fetch(`/api/logs/${id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        await apiRequest("POST", `/api/volunteer-activities/${id}/approve`, { reviewerId: userId });
      }
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organization-dashboard"] });
      toast({ title: "Verified!", description: "Impact log verified successfully." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to verify.", variant: "destructive" });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleReject = async (id: number) => {
    // Open reject modal instead of rejecting immediately
    setRejectState({ logId: id, reason: "" });
  };

  const handleRejectSubmit = async () => {
    if (!rejectState || !rejectState.reason.trim()) {
      toast({ title: "Required", description: "Please provide a reason for rejection.", variant: "destructive" });
      return;
    }
    setProcessingIds((prev) => new Set(prev).add(rejectState.logId));
    try {
      const response = await fetch(`/api/logs/${rejectState.logId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectState.reason.trim() }),
      });
      if (!response.ok) throw new Error("Failed to reject");
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      toast({ title: "Rejected", description: "Impact log rejected with feedback." });
      setRejectState(null);
    } catch (err) {
      toast({ title: "Error", description: "Failed to reject.", variant: "destructive" });
    } finally {
      if (rejectState) {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(rejectState.logId);
          return next;
        });
      }
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
          fetch(`/api/logs/${id}/verify`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          })
        )
      );
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
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

  // Shared history log card renderer for both mobile and desktop
  const renderHistoryLogCard = (log: any, compact: boolean) => {
    const logDate = new Date(log.date || log.createdAt);
    const status = log.verificationStatus || 'pending';
    const sdgTags: number[] = log.sdgTags || log.project?.sdgGoals || [];
    const firstSdg = sdgTags.length > 0 ? sdgTags[0] : null;

    return (
      <div
        key={log.id}
        className={compact
          ? "bg-white rounded-xl border border-stone-200 shadow-sm p-4 space-y-2"
          : "flex items-center gap-6 px-6 py-4 hover:bg-secondary/30 transition-colors"
        }
      >
        {compact ? (
          <>
            {/* Mobile card layout */}
            {/* Row 1: Volunteer + Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                  {(log.volunteer?.displayName || 'V').charAt(0)}
                </div>
                <span className="text-sm font-medium text-stone-800 truncate">
                  {log.volunteer?.displayName || 'Volunteer'}
                </span>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                status === 'approved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : status === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
              }`}>
                {status === 'approved' ? '✓ Verified' : status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
              </span>
            </div>

            {/* Row 2: Date + Hours */}
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <span>{logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              {log.hours != null && (
                <>
                  <span className="text-stone-300">|</span>
                  <span>{log.hours} hrs</span>
                </>
              )}
            </div>

            {/* Row 3: Outcome + SDG */}
            <div className="flex items-center gap-2 flex-wrap">
              {(log.outcomes || log.outcomeQuantity) && (
                <span className="text-sm text-stone-700">
                  {log.outcomes || 'Outcome'}{log.outcomeQuantity ? ` (${log.outcomeQuantity})` : ''}
                </span>
              )}
              {firstSdg && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: getSDGColor(firstSdg) }}
                >
                  SDG {firstSdg}
                </span>
              )}
            </div>

            {/* Row 4: Project name */}
            <p className="text-xs text-stone-500">{log.project?.name || 'Unknown Project'}</p>

            {/* Rejection reason */}
            {status === 'rejected' && log.rejectedReason && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                Reason: "{log.rejectedReason}"
              </p>
            )}

            {/* Action buttons for pending */}
            {status === 'pending' && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleApprove(log.id)}
                  disabled={processingIds.has(log.id)}
                  className="flex-1 py-2 px-3 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {processingIds.has(log.id) ? '...' : '✓ Verify'}
                </button>
                <button
                  onClick={() => handleReject(log.id)}
                  disabled={processingIds.has(log.id)}
                  className="flex-1 py-2 px-3 bg-stone-100 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-200 disabled:opacity-50 transition-colors"
                >
                  ✗ Reject
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Desktop row layout */}
            {/* Volunteer avatar + name */}
            <div className="w-36 flex-shrink-0 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                {(log.volunteer?.displayName || 'V').charAt(0)}
              </div>
              <span className="text-sm font-medium text-foreground truncate">
                {log.volunteer?.displayName || 'Volunteer'}
              </span>
            </div>

            {/* Date */}
            <div className="w-16 flex-shrink-0 text-center">
              <p className="text-sm font-semibold text-foreground">
                {logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>

            {/* Hours */}
            <div className="w-16 flex-shrink-0 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {log.hours != null ? `${log.hours} hrs` : '—'}
              </p>
            </div>

            {/* Outcome + Project */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {(log.outcomes || log.outcomeQuantity) && (
                  <span className="text-sm font-medium text-foreground">
                    {log.outcomes || 'Outcome'}{log.outcomeQuantity ? ` (${log.outcomeQuantity})` : ''}
                  </span>
                )}
                {firstSdg && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: getSDGColor(firstSdg) }}
                  >
                    SDG {firstSdg}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {log.project?.name || 'Unknown Project'}
              </p>
              {status === 'rejected' && log.rejectedReason && (
                <p className="text-xs text-red-600 mt-1">
                  Reason: &ldquo;{log.rejectedReason}&rdquo;
                </p>
              )}
            </div>

            {/* Status + Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {status === 'pending' ? (
                <>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleApprove(log.id)}
                    disabled={processingIds.has(log.id)}
                    className="h-8"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(log.id)}
                    disabled={processingIds.has(log.id)}
                    className="h-8"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </>
              ) : (
                <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                  status === 'approved'
                    ? 'bg-emerald-100 text-emerald-700'
                    : status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                }`}>
                  {status === 'approved' ? '✓ Verified' : status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // Shared reject modal
  const rejectModal = (
    <Dialog open={rejectState !== null} onOpenChange={(open) => !open && setRejectState(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Reject Impact Log
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Textarea
            value={rejectState?.reason || ''}
            onChange={(e) => setRejectState(prev => prev ? { ...prev, reason: e.target.value } : null)}
            placeholder="Please explain why this log is being rejected..."
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">This feedback will be sent to the volunteer.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setRejectState(null)}>Cancel</Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleRejectSubmit}
            disabled={!rejectState?.reason.trim() || processingIds.has(rejectState?.logId || 0)}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject Log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Shared history content for both mobile and desktop
  const renderHistoryContent = (compact: boolean) => (
    <>
      {/* Filter Pills */}
      <div className="flex gap-2">
        {(['all', 'pending', 'verified', 'rejected'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => handleHistoryFilterChange(filter)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              historyFilter === filter
                ? 'bg-indigo-600 text-white'
                : compact
                  ? 'bg-white text-stone-600 border border-stone-200'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            {filter !== 'all' && (
              <span className="ml-1.5 opacity-70">
                ({filter === 'pending'
                  ? allOrgLogs.filter((l: any) => l.verificationStatus === 'pending').length
                  : filter === 'verified'
                    ? allOrgLogs.filter((l: any) => l.verificationStatus === 'approved').length
                    : allOrgLogs.filter((l: any) => l.verificationStatus === 'rejected').length
                })
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Log list */}
      {isLoadingAllLogs ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : filteredHistoryLogs.length === 0 ? (
        <div className={compact
          ? "bg-white rounded-xl border border-stone-200 shadow-sm p-8 text-center"
          : "p-12 text-center"
        }>
          <Shield className="h-12 w-12 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            {historyFilter === 'all'
              ? 'No impact logs submitted yet.'
              : `No ${historyFilter} logs found.`}
          </p>
        </div>
      ) : (
        <>
          {compact ? (
            <div className="space-y-3">
              {filteredHistoryLogs.slice(0, visibleCount).map((log: any) => renderHistoryLogCard(log, true))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {filteredHistoryLogs.slice(0, visibleCount).map((log: any) => renderHistoryLogCard(log, false))}
                </div>
              </CardContent>
            </Card>
          )}

          {filteredHistoryLogs.length > visibleCount && (
            <button
              onClick={() => setVisibleCount(prev => prev + 20)}
              className={compact
                ? "w-full py-3 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-white rounded-xl border border-stone-200 shadow-sm"
                : "w-full py-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              }
            >
              Load More ({filteredHistoryLogs.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </>
  );

  // Mobile PWA View
  if (isMobile) {
    return (
      <>
        <main className="px-4 py-5 space-y-5" style={{ paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}>
          {/* Mobile Home Tab */}
          {orgTab !== 'verify' && (
            <>
              {/* Core Metrics - 2x2 Grid */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setOrgTab?.('verify')}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-left hover:border-amber-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-gray-500 uppercase">Pending</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.pendingVerifications}</p>
                  <p className="text-xs text-gray-500 mt-1">to verify</p>
                </button>

                <button
                  onClick={() => navigate('/ngo/log-hours')}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-left hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-gray-500 uppercase">Hours</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalHours}</p>
                  <p className="text-xs text-gray-500 mt-1">total logged</p>
                </button>

                <button
                  onClick={() => navigate('/ngo/projects')}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-left hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-medium text-gray-500 uppercase">Projects</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeProjects}</p>
                  <p className="text-xs text-gray-500 mt-1">active</p>
                </button>

                <button
                  onClick={() => navigate('/ngo/projects')}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-left hover:border-emerald-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-gray-500 uppercase">Volunteers</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalVolunteers}</p>
                  <p className="text-xs text-gray-500 mt-1">contributing</p>
                </button>
              </div>

              {/* Verification Queue Preview */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <button
                  onClick={() => setOrgTab?.('verify')}
                  className="w-full px-4 py-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-600" />
                    Pending Verification
                  </h2>
                  <div className="flex items-center gap-2">
                    {stats.pendingVerifications > 0 && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        {stats.pendingVerifications} pending
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
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
                            <p className="text-xs text-gray-500">{item.hours}h - {item.projectName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={processingIds.has(item.id)}
                          className="flex-1 py-2 px-3 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={processingIds.has(item.id)}
                          className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                          Reject
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
                <button
                  onClick={() => navigate('/ngo/projects')}
                  className="w-full px-4 py-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-indigo-600" />
                    Active Projects
                  </h2>
                  <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                    View All <ChevronRight className="h-3 w-3" />
                  </div>
                </button>
                <div className="divide-y divide-gray-100">
                  {projects.slice(0, 3).map((project: any) => (
                    <button
                      key={project.id}
                      onClick={() => navigate(`/ngo/projects/${project.id}`)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500">{project.volunteerCount || 0} volunteers</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          project.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {project.status || 'active'}
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                  {projects.length === 0 && (
                    <button
                      onClick={() => navigate('/post-core-opportunity')}
                      className="w-full px-4 py-8 text-center hover:bg-gray-50 transition-colors"
                    >
                      <p className="text-sm text-gray-500">No projects yet</p>
                      <p className="text-xs text-indigo-600 mt-1">Tap to create your first project →</p>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Mobile Verify/History Tab */}
          {orgTab === 'verify' && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-800">Verification History</h2>
              </div>
              {renderHistoryContent(true)}
            </>
          )}
        </main>

        {/* Reject Modal */}
        {rejectModal}
      </>
    );
  }

  // Desktop View
  return (
    <main className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <PageHeader
        title={organization?.name || "Verify Hub"}
        description="Verify volunteer hours, manage projects, and track your impact."
        actions={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/ngo/log-hours")}>
              <Clock className="h-4 w-4 mr-2" />
              Log Hours
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

        {/* Verify Tab — History view with inline actions */}
        <TabsContent value="verify" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Verification History
            </h2>
          </div>
          {renderHistoryContent(false)}
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
                    onClick={() => navigate(`/ngo/projects/${project.id}`)}
                  />
                ))}
              </Grid>
            )}
          </Section>
        </TabsContent>
      </Tabs>

      {/* Reject Modal */}
      {rejectModal}
    </main>
  );
}
