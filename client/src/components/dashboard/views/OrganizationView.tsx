import { useState, useMemo, memo, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
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
  ChevronLeft,
  FolderOpen,
  TrendingUp,
  Shield,
  Globe,
  BarChart3,
  Search,
  CheckCheck,
  FileText,
  Download,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, MetricCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, SDGBadge, StatusBadge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress, ProgressWithLabel } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stat } from "@/components/ui/stat";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { Section, PageHeader, Grid } from "@/components/ui/section";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { formatDecimal } from "@/lib/format-utils";
import { getSDGColor, SDG_GOALS } from "@shared/sdg-goals";

// Report Visual Components
import VerificationDensityStrip from "@/components/impact/report-visuals/VerificationDensityStrip";
import BoundaryIntegrityMatrix from "@/components/impact/report-visuals/BoundaryIntegrityMatrix";
import EvidenceObjectArchitecture from "@/components/impact/report-visuals/EvidenceObjectArchitecture";
import SDGHorizontalBar from "@/components/impact/report-visuals/SDGHorizontalBar";
import CSRDBoundaryIndicator from "@/components/impact/report-visuals/CSRDBoundaryIndicator";
import ContributionChain from "@/components/impact/report-visuals/ContributionChain";
import ScreeningStatusMatrix from "@/components/impact/report-visuals/ScreeningStatusMatrix";
import GeographicHeatmap from "@/components/impact/report-visuals/GeographicHeatmap";
import VerificationTimeline from "@/components/impact/report-visuals/VerificationTimeline";
import AssuranceBoundaryDiagram from "@/components/impact/report-visuals/AssuranceBoundaryDiagram";
import InnovationScoringRadar from "@/components/impact/report-visuals/InnovationScoringRadar";

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
  itemType: "activity" | "impact";
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

// Verification Item Component - one-click verify
interface VerificationItemProps {
  item: PendingVerification;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isProcessing?: boolean;
}

function VerificationItem({ item, onApprove, onReject, isProcessing }: VerificationItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-all">
      <UserAvatar
        src={item.volunteerAvatar}
        name={item.volunteerName}
        size="sm"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground truncate">{item.volunteerName}</h4>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {new Date(item.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground truncate">{item.projectName}</span>
          {item.hours > 0 && (
            <Badge variant="outline-primary" size="sm" className="text-[10px] px-1.5 py-0">
              {item.hours}h
            </Badge>
          )}
          {item.outcomeType && item.outcomeValue && (
            <Badge variant="secondary" size="sm" className="text-[10px] px-1.5 py-0">
              {item.outcomeValue} {item.outcomeType.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onReject(item.id)}
          disabled={isProcessing}
          className="h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50"
        >
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Deny
        </Button>
        <Button
          size="sm"
          variant="success"
          onClick={() => onApprove(item.id)}
          disabled={isProcessing}
          className="h-8 px-2.5"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Accept
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
          <p className="text-xs text-muted-foreground">Verified Outcomes</p>
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
              {volunteer.totalHours}h across {volunteer.projectsCount} project{volunteer.projectsCount !== 1 ? 's' : ''}
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
    return [...sdgData].sort((a, b) => b.hours - a.hours);
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {sortedData.map((item) => {
        const percentage = totalHours > 0 ? (item.hours / totalHours) * 100 : 0;
        const sdgGoal = SDG_GOALS[item.goal];
        const sdgName = sdgGoal?.name ?? `SDG ${item.goal}`;
        return (
          <div key={item.goal} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <SDGBadge sdg={item.goal as any} size="sm" className="shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{sdgName}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.projects} project{item.projects !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <span className="text-xs font-medium text-foreground shrink-0">{item.hours}h</span>
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

const OrganizationView = memo(function OrganizationView({
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
  const [activeTab, setActiveTab] = useState(() => orgTab === 'reports' ? 'reports' : 'overview');

  // Invalidate verification queue on real-time WebSocket events
  const handleWsMessage = useCallback((msg: { type: string; data: any }) => {
    const isActivityOrImpactEvent =
      msg.type === 'log_created' ||
      msg.type === 'volunteer_activity_created' ||
      msg.type === 'project_impact_created' ||
      msg.type === 'activity_approved' ||
      msg.type === 'activity_rejected' ||
      msg.type === 'impact_approved' ||
      msg.type === 'impact_rejected' ||
      (msg.type === 'notification' && msg.data?.type === 'pending_approval');
    if (isActivityOrImpactEvent) {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs/org-all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organization/dashboard"] });
    }
  }, [queryClient]);
  useWebSocket({ onMessage: handleWsMessage });

  // History/Verification tab state
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [visibleCount, setVisibleCount] = useState(20);
  // Selected log for detail expansion
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  // Mobile reports state
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportContent, setReportContent] = useState<{ rawHtml: string; styles: string; body: string } | null>(null);
  const [reportTimePeriod, setReportTimePeriod] = useState("all");

  const toggleLogDetail = (logId: number) => {
    setSelectedLogId(prev => prev === logId ? null : logId);
  };

  const closeReport = () => {
    setReportContent(null);
  };

  const generateMobileReport = async () => {
    setReportGenerating(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (reportTimePeriod !== 'all') params.set('timePeriod', reportTimePeriod);
      const url = `/api/reports/ngo-impact-summary${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, { headers, credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
      const rawHtml = await response.text();
      // Parse out styles and body so we can render inline without an iframe
      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(rawHtml, 'text/html');
      const styles = Array.from(parsedDoc.querySelectorAll('style')).map(s => s.textContent || '').join('\n');
      const body = parsedDoc.body.innerHTML;
      setReportContent({ rawHtml, styles, body });
    } catch (err) {
      console.error("Report generation failed:", err);
      toast({ title: "Report failed", description: "Could not generate the report. Please try again.", variant: "destructive" });
    } finally {
      setReportGenerating(false);
    }
  };

  const printReport = () => {
    if (!reportContent) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(DOMPurify.sanitize(reportContent.rawHtml, { FORCE_BODY: true, ADD_TAGS: ['style', 'link', 'meta'], ADD_ATTR: ['style', 'class', 'id', 'href', 'rel', 'charset', 'content', 'name'] }));
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const downloadReport = () => {
    if (!reportContent) return;
    const blob = new Blob([reportContent.rawHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `impact-report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Sync desktop activeTab when orgTab changes (e.g. from nav link)
  useEffect(() => {
    if (orgTab === 'reports') setActiveTab('reports');
    else if (orgTab === 'projects') setActiveTab('projects');
    else closeReport();
  }, [orgTab]);

  // Fetch dashboard stats
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["/api/organization/dashboard", userId, activeUser?.organizationId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/organization/dashboard?userId=${userId}`,
        { headers, credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to load dashboard");
      return response.json();
    },
    enabled: !!userId && !!activeUser?.organizationId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  // Fetch pending verifications
  const { data: pendingData, isLoading: isLoadingPending, refetch: refetchPending } = useQuery({
    queryKey: ["/api/pending-approvals", activeUser?.organizationId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/pending-approvals?organizationId=${activeUser.organizationId}`,
        { headers, credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to load pending approvals");
      return response.json();
    },
    enabled: !!activeUser?.organizationId,
    staleTime: 15_000,
    gcTime: 2 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60_000,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects", activeUser?.organizationId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/projects?organizationId=${activeUser.organizationId}`,
        { headers, credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to load projects");
      return response.json();
    },
    enabled: !!activeUser?.organizationId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  // Fetch volunteers
  const { data: volunteers = [], isLoading: isLoadingVolunteers } = useQuery({
    queryKey: ["/api/volunteers", activeUser?.organizationId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/volunteers?organizationId=${activeUser.organizationId}`,
        { headers, credentials: "include" }
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!activeUser?.organizationId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
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
        itemType: "activity" as const,
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
        itemType: "impact" as const,
      })),
    ];
  }, [pendingData]);

  // Calculate stats - only from actual API data, no fake fallbacks
  const stats = useMemo(() => {
    const data = dashboardData?.keyMetrics || {};
    return {
      activeProjects: data.activeProjects || 0,
      totalVolunteers: data.activeVolunteers || 0,
      totalHours: data.totalHours || 0,
      verifiedCount: data.verifiedCount || 0,
      pendingVerifications: pendingVerifications.length,
      impactScore: data.aiuEarned || 0,
      sdgsAddressed: data.sdgsAddressed || 0,
    };
  }, [dashboardData, pendingVerifications]);

  // Fetch ALL logs for history/verification view
  const { data: allOrgLogs = [], isLoading: isLoadingAllLogs } = useQuery({
    queryKey: ["/api/logs/org-all", activeUser?.organizationId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/logs?ngo_id=${activeUser.organizationId}`, {
        headers, credentials: "include"
      });
      if (!response.ok) return [];
      const logs = await response.json();
      return Array.isArray(logs) ? logs : [];
    },
    enabled: !!activeUser?.organizationId,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60_000,
  });

  // Computed stats for report preview visuals — mirrors server-side filter logic exactly
  const reportPreviewStats = useMemo(() => {
    // Apply same time-period filter the server uses
    let logsInPeriod = allOrgLogs as any[];
    if (reportTimePeriod && reportTimePeriod !== 'all') {
      const nowMs = Date.now();
      const msMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
      const days = msMap[reportTimePeriod];
      if (days) {
        const since = nowMs - days * 24 * 60 * 60 * 1000;
        logsInPeriod = logsInPeriod.filter((l: any) => {
          const d = l.date || l.createdAt;
          return d && new Date(d).getTime() >= since;
        });
      }
    }

    const verified = logsInPeriod.filter((l: any) => l.verificationStatus === 'approved');
    const total = logsInPeriod.length;
    const verificationRate = total > 0 ? Math.round((verified.length / total) * 100) : 0;
    const totalHoursVerified = Math.round(verified.reduce((s: number, l: any) => s + (l.hours || 0), 0));
    const verifyTimes = verified
      .filter((l: any) => l.verifiedAt && l.createdAt)
      .map((l: any) => (new Date(l.verifiedAt).getTime() - new Date(l.createdAt).getTime()) / 3600000)
      .filter((h: number) => h >= 0);
    const avgSLA = verifyTimes.length > 0
      ? Math.round(verifyTimes.reduce((s: number, t: number) => s + t, 0) / verifyTimes.length)
      : 16;
    // Mirror server: editedOutcomeQuantity wins over outcomeQuantity
    const totalOutcomes = verified.reduce((s: number, l: any) => s + (l.editedOutcomeQuantity || l.outcomeQuantity || 0), 0);
    const totalBeneficiaries = verified.reduce((s: number, l: any) => s + (l.beneficiaryCount || 0), 0);
    const effectiveBeneficiaries = totalBeneficiaries > 0 ? totalBeneficiaries : totalOutcomes;

    // SDG map — mirrors server: use sdgTags if present, else fall back to project sdgGoals
    // Enriched logs from /api/logs already embed log.project.sdgGoals — use that directly
    const sdgMap: Record<number, number> = {};
    for (const log of verified) {
      const tags: number[] = log.sdgTags || [];
      if (tags.length > 0) {
        for (const s of tags) { sdgMap[s] = (sdgMap[s] || 0) + 1; }
      } else {
        // log.project.sdgGoals is embedded by the enrichment in the logs endpoint
        for (const s of (log.project?.sdgGoals || [])) { sdgMap[s] = (sdgMap[s] || 0) + 1; }
      }
    }
    const totalSdgOutcomes = Object.values(sdgMap).reduce((s, c) => s + c, 0);
    const sdgEntries = Object.entries(sdgMap)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 6)
      .map(([sdg, count]) => {
        const num = parseInt(sdg);
        const goal = SDG_GOALS[num];
        return {
          sdg: 'SDG ' + num,
          label: goal?.name || 'SDG ' + num,
          percentage: totalSdgOutcomes > 0 ? Math.round(((count as number) / totalSdgOutcomes) * 100) : 0,
          outcomes: count as number,
        };
      });
    return { verificationRate, totalHoursVerified, avgSLA, effectiveBeneficiaries, verifiedCount: verified.length, sdgEntries };
  }, [allOrgLogs, reportTimePeriod]);

  // Pre-compute filter counts once (avoids repeated .filter() inside render)
  const logFilterCounts = useMemo(() => ({
    all: allOrgLogs.length,
    pending: allOrgLogs.filter((l: any) => l.verificationStatus === 'pending').length,
    verified: allOrgLogs.filter((l: any) => l.verificationStatus === 'approved').length,
    rejected: allOrgLogs.filter((l: any) => l.verificationStatus === 'rejected').length,
  }), [allOrgLogs]);

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

  // Approval handlers - route to correct endpoint based on item type
  const handleApprove = async (id: number) => {
    const item = pendingVerifications.find(v => v.id === id);
    const isImpact = item?.itemType === "impact";
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      const authHeaders = await getAuthHeaders();
      if (isImpact) {
        // Impact items use the project-impacts approve endpoint
        const response = await fetch(`/api/project-impacts/${id}/approve`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        });
        if (!response.ok) throw new Error("Failed to approve impact");
      } else {
        // Activity items use the logs verify endpoint
        const response = await fetch(`/api/logs/${id}/verify`, {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        });
        if (!response.ok) {
          await apiRequest("POST", `/api/volunteer-activities/${id}/approve`, { reviewerId: userId });
        }
      }
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs/org-all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organization/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Verified!", description: isImpact ? "Impact approved successfully." : "Activity verified successfully." });
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
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/logs/${id}/reject`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: "Rejected by reviewer" }),
      });
      if (!response.ok) throw new Error("Failed to reject");
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs/org-all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organization/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Rejected", description: "Impact log has been rejected." });
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
    pendingVerifications.forEach((p) => setProcessingIds((prev) => new Set(prev).add(p.id)));

    try {
      const authHeaders = await getAuthHeaders();
      await Promise.all(
        pendingVerifications.map((item) => {
          if (item.itemType === "impact") {
            return fetch(`/api/project-impacts/${item.id}/approve`, {
              method: "POST",
              headers: { ...authHeaders, "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({}),
            });
          }
          return fetch(`/api/logs/${item.id}/verify`, {
            method: "PATCH",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({}),
          });
        })
      );
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs/org-all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organization/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "All Verified!",
        description: `${pendingVerifications.length} submission${pendingVerifications.length !== 1 ? "s" : ""} verified.`,
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to verify some items.", variant: "destructive" });
    } finally {
      setProcessingIds(new Set());
      setIsApprovingAll(false);
    }
  };

  // Shared history log card renderer for both mobile and desktop - compact layout with expand/collapse
  const renderHistoryLogCard = (log: any, compact: boolean) => {
    const logDate = new Date(log.date || log.createdAt);
    const status = log.verificationStatus || 'pending';
    const sdgTags: number[] = log.sdgTags || log.project?.sdgGoals || [];
    const firstSdg = sdgTags.length > 0 ? sdgTags[0] : null;
    const isExpanded = selectedLogId === log.id;

    return (
      <button
        key={log.id}
        onClick={() => toggleLogDetail(log.id)}
        className={compact
          ? `w-full bg-white rounded-lg border shadow-sm px-3 py-2.5 text-left transition-all active:scale-[0.99] cursor-pointer ${isExpanded ? 'border-indigo-300 shadow-md' : 'border-stone-200 hover:border-indigo-200 hover:shadow-md'}`
          : `w-full text-left px-4 py-2.5 transition-all cursor-pointer ${isExpanded ? 'bg-secondary/50' : 'hover:bg-secondary/30'}`
        }
      >
        {compact ? (
          <>
            {/* Mobile compact: single row with verify button */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0">
                {(log.volunteer?.displayName || 'V').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-stone-800 truncate">
                    {log.volunteer?.displayName || 'Volunteer'}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-stone-500">
                  <span className="truncate">{log.project?.name || 'Unknown Project'}</span>
                  {log.hours != null && <span className="font-medium">{log.hours}h</span>}
                  {firstSdg && (
                    <span
                      className="px-1.5 py-0 rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: getSDGColor(firstSdg) }}
                    >
                      SDG {firstSdg}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {status === 'pending' ? (
                  <>
                    <span
                      onClick={(e) => { e.stopPropagation(); handleReject(log.id); }}
                      className="px-2 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                    >
                      {processingIds.has(log.id) ? '...' : '✗ Deny'}
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); handleApprove(log.id); }}
                      className="px-2 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      {processingIds.has(log.id) ? '...' : '✓ Accept'}
                    </span>
                  </>
                ) : (
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                    status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {status === 'approved' ? '✓ Verified' : '✗ Rejected'}
                  </span>
                )}
                <ChevronRight className={`h-3.5 w-3.5 text-stone-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
            </div>
            {/* Expanded detail */}
            {isExpanded && (
              <div className="mt-2 pt-2 border-t border-stone-100 space-y-2 ml-8">
                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <Clock className="h-3 w-3" />
                  <span>{logDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {(log.outcomes || log.outcomeQuantity) && (
                  <div className="flex items-center gap-2 text-xs">
                    <Target className="h-3 w-3 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">
                      {log.outcomes || 'Outcome'}{log.outcomeQuantity ? ` — Qty: ${log.outcomeQuantity}` : ''}
                    </span>
                  </div>
                )}
                {sdgTags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {sdgTags.map((sdg: number) => (
                      <span
                        key={sdg}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                        style={{ backgroundColor: getSDGColor(sdg) }}
                      >
                        SDG {sdg}
                      </span>
                    ))}
                  </div>
                )}
                {log.description && (
                  <p className="text-xs text-stone-600 bg-stone-50 rounded px-2 py-1.5">{log.description}</p>
                )}
                {status === 'rejected' && log.rejectedReason && (
                  <p className="text-[11px] text-red-600 bg-red-50 rounded px-2 py-1.5">
                    Reason: &ldquo;{log.rejectedReason}&rdquo;
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Desktop compact row */}
            <div className="flex items-center gap-4">
              <div className="w-32 flex-shrink-0 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0">
                  {(log.volunteer?.displayName || 'V').charAt(0)}
                </div>
                <span className="text-sm font-medium text-foreground truncate">
                  {log.volunteer?.displayName || 'Volunteer'}
                </span>
              </div>

              <div className="w-14 flex-shrink-0 text-center">
                <p className="text-xs text-muted-foreground">
                  {logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>

              <div className="w-12 flex-shrink-0 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  {log.hours != null ? `${log.hours}h` : '—'}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {(log.outcomes || log.outcomeQuantity) && (
                    <span className="text-xs font-medium text-foreground">
                      {log.outcomes || 'Outcome'}{log.outcomeQuantity ? ` (${log.outcomeQuantity})` : ''}
                    </span>
                  )}
                  {firstSdg && (
                    <span
                      className="px-1.5 py-0 rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: getSDGColor(firstSdg) }}
                    >
                      SDG {firstSdg}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground truncate">
                    {log.project?.name || 'Unknown Project'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {status === 'pending' ? (
                  <>
                    <span
                      onClick={(e) => { e.stopPropagation(); handleReject(log.id); }}
                      className="px-2.5 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                    >
                      {processingIds.has(log.id) ? '...' : '✗ Deny'}
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); handleApprove(log.id); }}
                      className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      {processingIds.has(log.id) ? '...' : '✓ Accept'}
                    </span>
                  </>
                ) : (
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                    status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {status === 'approved' ? '✓ Verified' : '✗ Rejected'}
                  </span>
                )}
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {/* Expanded detail panel */}
            {isExpanded && (
              <div className="mt-2 pt-2 border-t border-border space-y-2 ml-[10rem]">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{logDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {(log.outcomes || log.outcomeQuantity) && (
                  <div className="bg-secondary/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-foreground">
                        {log.outcomes || 'Outcome'}
                      </span>
                      {log.outcomeQuantity && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Qty: {log.outcomeQuantity}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {sdgTags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {sdgTags.map((sdg: number) => (
                      <span
                        key={sdg}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: getSDGColor(sdg) }}
                      >
                        SDG {sdg}
                      </span>
                    ))}
                  </div>
                )}
                {log.description && (
                  <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2">{log.description}</p>
                )}
                {status === 'rejected' && log.rejectedReason && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    Reason: &ldquo;{log.rejectedReason}&rdquo;
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </button>
    );
  };

  // Shared history content for both mobile and desktop
  const renderHistoryContent = (compact: boolean) => (
    <>
      {/* Filter Pills - compact */}
      <div className="flex gap-1.5">
        {(['all', 'pending', 'verified', 'rejected'] as const).map((filter) => {
          const count = logFilterCounts[filter];
          return (
            <button
              key={filter}
              onClick={() => handleHistoryFilterChange(filter)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                historyFilter === filter
                  ? 'bg-indigo-600 text-white'
                  : compact
                    ? 'bg-white text-stone-600 border border-stone-200'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              <span className="ml-1 opacity-70">{count}</span>
            </button>
          );
        })}
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
            <div className="space-y-1.5">
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
          {orgTab === 'home' && (
            <>
              {/* Log Hours — primary action, always visible */}
              <button
                onClick={() => navigate('/ngo/log-hours')}
                className="w-full bg-[#D4980C]/10 border border-[#D4980C]/30 text-stone-800 rounded-xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#D4980C]/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-[#7a5200]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold leading-tight text-stone-800">Log Volunteer Hours & Impact</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Record verified outcomes for your team</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#7a5200]/60 flex-shrink-0" />
              </button>

              {/* Core Metrics - 2x2 Grid */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setOrgTab?.('projects')}
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
                  onClick={() => setOrgTab?.('volunteers')}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-left hover:border-emerald-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-gray-500 uppercase">Volunteers</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalVolunteers}</p>
                  <p className="text-xs text-gray-500 mt-1">contributing</p>
                </button>

                <button
                  onClick={() => setOrgTab?.('hours')}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-left hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-gray-500 uppercase">Hours</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalHours}</p>
                  <p className="text-xs text-gray-500 mt-1">logged</p>
                </button>

                <button
                  onClick={() => { setHistoryFilter('verified'); setOrgTab?.('verify'); }}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-left hover:border-amber-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-gray-500 uppercase">Verified</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.verifiedCount || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">outcomes</p>
                </button>
              </div>

              {/* Verification Queue Preview */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <button
                  onClick={() => { setHistoryFilter('pending'); setOrgTab?.('verify'); }}
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
                  {pendingVerifications.map((item) => (
                    <div key={item.id} className="px-4 py-2.5 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600 flex-shrink-0">
                        {item.volunteerName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.volunteerName}</p>
                        <p className="text-xs text-gray-500">{item.hours}h - {item.projectName}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={processingIds.has(item.id)}
                          className="px-2.5 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 border border-red-200"
                        >
                          {processingIds.has(item.id) ? '...' : '✗ Deny'}
                        </button>
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={processingIds.has(item.id)}
                          className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {processingIds.has(item.id) ? '...' : '✓ Accept'}
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
                  onClick={() => setOrgTab?.('projects')}
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
                  {projects.map((project: any) => (
                    <button
                      key={project.id}
                      onClick={() => navigate(`/ngo/projects/${project.id}`)}
                      className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              project.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {project.status || 'active'}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {project.volunteerCount || 0}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {project.totalHours || 0}h
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
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

          {/* Mobile Projects Tab */}
          {orgTab === 'projects' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setOrgTab?.('home')}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-stone-800">Projects</h2>
                <button
                  onClick={() => navigate('/post-core-opportunity')}
                  className="ml-auto px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> New
                </button>
              </div>

              <div className="space-y-3">
                {projects.length > 0 ? (
                  projects.map((project: any) => (
                    <button
                      key={project.id}
                      onClick={() => navigate(`/ngo/projects/${project.id}`)}
                      className="w-full bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-left hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{project.name}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              project.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {project.status || 'active'}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {project.volunteerCount || 0}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {project.totalHours || 0}h
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                      </div>
                    </button>
                  ))
                ) : (
                  <button
                    onClick={() => navigate('/post-core-opportunity')}
                    className="w-full bg-white rounded-xl border border-dashed border-indigo-300 p-8 text-center hover:border-indigo-400 transition-colors"
                  >
                    <FolderOpen className="h-10 w-10 text-indigo-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">No projects yet</p>
                    <p className="text-xs text-indigo-600 mt-1">Tap to create your first project →</p>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Mobile Verify/History Tab */}
          {orgTab === 'verify' && (
            <>
              {/* Pending Verification Queue */}
              {pendingVerifications.length > 0 && (
                <div className="bg-white rounded-xl border border-amber-200 shadow-sm">
                  <div className="px-4 py-3 border-b border-amber-100 flex items-center justify-between bg-amber-50 rounded-t-xl">
                    <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-600" />
                      Awaiting Your Review
                    </h2>
                    <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                      {pendingVerifications.length} pending
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {pendingVerifications.map((item) => (
                      <div key={item.id} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                            {item.volunteerName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.volunteerName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-500">{item.projectName}</span>
                              {item.hours > 0 && (
                                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0 rounded">
                                  {item.hours}h
                                </span>
                              )}
                              {item.description && (
                                <span className="text-xs text-gray-400 truncate max-w-[120px]">{item.description}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 ml-10">
                          <button
                            onClick={() => handleReject(item.id)}
                            disabled={processingIds.has(item.id)}
                            className="flex-1 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 border border-red-200 flex items-center justify-center gap-1"
                          >
                            <XCircle className="h-3 w-3" />
                            {processingIds.has(item.id) ? '...' : 'Deny'}
                          </button>
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={processingIds.has(item.id)}
                            className="flex-1 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {processingIds.has(item.id) ? '...' : 'Accept'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification History */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-800">Verification History</h2>
              </div>
              {renderHistoryContent(true)}
            </>
          )}

          {/* Mobile Volunteers View */}
          {orgTab === 'volunteers' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setOrgTab?.('home')}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-stone-800">Volunteers</h2>
              </div>

              {/* Log Hours — always visible at top of volunteers tab */}
              <button
                onClick={() => navigate('/ngo/log-hours')}
                className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 text-white rounded-xl p-4 flex items-center justify-between shadow-md active:scale-[0.98] transition-all mb-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold leading-tight">Log Volunteer Hours & Impact</p>
                    <p className="text-[11px] text-white/80 mt-0.5">Record verified outcomes for your team</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-white/70 flex-shrink-0" />
              </button>

              {/* Summary stat */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalVolunteers}</p>
                    <p className="text-xs text-gray-500">Total Volunteers</p>
                  </div>
                </div>
              </div>

              {/* Volunteer list */}
              <div className="space-y-3">
                {dashboardData?.volunteerSummaries && dashboardData.volunteerSummaries.length > 0 ? (
                  dashboardData.volunteerSummaries.map((vol: any) => (
                    <div key={vol.id || vol.volunteerId} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                          {(vol.name || vol.displayName || 'V').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{vol.name || vol.displayName || 'Volunteer'}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {vol.totalHours || vol.hours || 0}h logged
                            </span>
                            <span className="flex items-center gap-1">
                              <FolderOpen className="h-3 w-3" />
                              {vol.projectsCount || vol.projects || 1} project{(vol.projectsCount || vol.projects || 1) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {vol.lastActive && (
                            <p className="text-xs text-gray-400 mt-1">
                              Last active: {new Date(vol.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : volunteers.length > 0 ? (
                  volunteers.map((vol: any) => (
                    <div key={vol.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                          {(vol.displayName || vol.name || 'V').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{vol.displayName || vol.name || 'Volunteer'}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {vol.totalHours || 0}h logged
                            </span>
                            <span className="flex items-center gap-1">
                              <FolderOpen className="h-3 w-3" />
                              {vol.projectsCount || 1} project{(vol.projectsCount || 1) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
                    <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">No volunteers yet</p>
                    <p className="text-xs text-gray-500 mt-1">Volunteers will appear here when they join your projects.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Mobile Hours Breakdown View */}
          {orgTab === 'hours' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setOrgTab?.('home')}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-stone-800">Hours Breakdown</h2>
              </div>

              {/* Total hours summary */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalHours}</p>
                    <p className="text-xs text-gray-500">Total Hours Logged</p>
                  </div>
                </div>
              </div>

              {/* By Project */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-indigo-600" />
                    By Project
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {(projects.length > 0 ? projects : dashboardData?.projects || []).length > 0 ? (
                    (projects.length > 0 ? projects : dashboardData?.projects || []).map((proj: any) => (
                      <div key={proj.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{proj.name}</p>
                          <p className="text-xs text-gray-500">{proj.volunteerCount || 0} volunteers</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-blue-600">{proj.totalHours || 0}h</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">No project data</div>
                  )}
                </div>
              </div>

              {/* By Volunteer */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    By Volunteer
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {(dashboardData?.volunteerSummaries || volunteers).length > 0 ? (
                    (dashboardData?.volunteerSummaries || volunteers).map((vol: any) => (
                      <div key={vol.id || vol.volunteerId} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                            {(vol.name || vol.displayName || 'V').charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">{vol.name || vol.displayName || 'Volunteer'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-blue-600">{vol.totalHours || vol.hours || 0}h</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">No volunteer data</div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Mobile Reports Tab */}
          {orgTab === 'reports' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setOrgTab?.('home')}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-stone-800">Impact Reports</h2>
              </div>

              {/* Full-screen in-app report viewer — styles + body extracted via DOMParser, no iframe needed */}
              {reportContent && (
                <div id="synerxus-report-overlay" className="fixed inset-0 z-[300] bg-white flex flex-col">
                  {/* Inject report styles */}
                  <style dangerouslySetInnerHTML={{ __html: reportContent.styles + `
                    @media print {
                      body > *:not(#synerxus-report-overlay) { display: none !important; }
                      #synerxus-report-overlay { position: static !important; height: auto !important; overflow: visible !important; z-index: auto !important; }
                      #synerxus-report-overlay .report-header-bar { display: none !important; }
                    }
                  `}} />
                  {/* Header bar */}
                  <div className="report-header-bar flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shadow-sm flex-shrink-0 print:hidden">
                    <button
                      onClick={closeReport}
                      className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Close
                    </button>
                    <span className="text-sm font-semibold text-gray-900">Impact Report</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={downloadReport}
                        className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-2 py-1"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                      <button
                        onClick={printReport}
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-300 rounded-lg px-2 py-1"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Print / PDF
                      </button>
                    </div>
                  </div>
                  {/* Report body rendered inline */}
                  <div
                    className="flex-1 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reportContent.body, { ADD_ATTR: ['style', 'class', 'id'], FORCE_BODY: true }) }}
                  />
                </div>
              )}

              {/* Status card */}
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm mb-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-7 w-7 text-indigo-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">NGO Impact Summary</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Verified hours · SDG alignment · Global sustainability framework metrics
                </p>
                <div className="flex items-center gap-2 justify-center mb-4">
                  <label className="text-xs font-medium text-gray-500">Time Period</label>
                  <Select value={reportTimePeriod} onValueChange={(v) => { setReportTimePeriod(v); setReportContent(null); }}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="1y">Last year</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {reportGenerating ? (
                  <div className="flex items-center justify-center gap-2 text-indigo-600">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Generating report…</span>
                  </div>
                ) : (
                  <button
                    onClick={generateMobileReport}
                    className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Generate Report
                  </button>
                )}
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Hours Logged</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalHours}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Verified</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.verifiedCount || 0}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Volunteers</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalVolunteers}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
                </div>
              </div>
            </>
          )}
        </main>

      </>
    );
  }

  // Desktop View
  return (
    <main className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <PageHeader
        title={organization?.name || "Verify Hub"}
        description="Verify volunteer outcomes, manage projects, and track your impact."
        actions={
          <Button variant="outline" onClick={() => navigate("/ngo/log-hours")}>
            <Clock className="h-4 w-4 mr-2" />
            Log Outcomes
          </Button>
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
          label="Total Hours"
          value={stats.totalHours}
          accentColor="accent"
          icon={<Clock className="h-5 w-5 text-accent" />}
        />
        <MetricCard
          label="Outcomes Verified"
          value={stats.verifiedCount || 0}
          accentColor="cyan"
          icon={<CheckCircle2 className="h-5 w-5 text-[#22D3EE]" />}
        />
      </Grid>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={(tab) => { if (tab !== 'reports') closeReport(); setActiveTab(tab); }}>
        <TabsList className="w-full">
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
          <TabsTrigger value="volunteers" className="flex-1">
            <Users className="h-4 w-4 mr-2" />
            Volunteers
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-1">
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Organization Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-5">
                  <Stat
                    label="Total Hours"
                    value={stats.totalHours}
                    size="lg"
                  />
                  <Stat
                    label="Outcomes Verified"
                    value={stats.verifiedCount || 0}
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

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-success" />
                  SDG Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SDGImpactSummary
                  sdgData={
                    reportPreviewStats.sdgEntries.length > 0
                      ? reportPreviewStats.sdgEntries.map(e => ({
                          goal: parseInt(e.sdg.replace('SDG ', '')),
                          hours: e.outcomes,
                          projects: 1,
                        }))
                      : (dashboardData?.sdgDistribution || [])
                  }
                />
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
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("volunteers")}>
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
                    totalHours: v.totalHours ?? 0,
                    projectsCount: v.projectsCount ?? 0,
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
                  <div className="space-y-2">
                    {pendingVerifications.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30"
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
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(item.id)}
                            disabled={processingIds.has(item.id)}
                            className="h-7 text-xs px-2.5 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Deny
                          </Button>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleApprove(item.id)}
                            disabled={processingIds.has(item.id)}
                            className="h-7 text-xs px-2.5"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Verify Tab — Pending queue + History view with inline actions */}
        <TabsContent value="verify" className="mt-6 space-y-6">
          {/* Pending Verification Queue */}
          {pendingVerifications.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="flex flex-row items-center justify-between bg-amber-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <Shield className="h-5 w-5 text-amber-600" />
                  Awaiting Your Review
                  <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full ml-2">
                    {pendingVerifications.length}
                  </span>
                </CardTitle>
                {pendingVerifications.length > 1 && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleApproveAll}
                    disabled={isApprovingAll}
                    loading={isApprovingAll}
                  >
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Accept All
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {pendingVerifications.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <UserAvatar src={item.volunteerAvatar} name={item.volunteerName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{item.volunteerName}</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{item.projectName}</span>
                          {item.hours > 0 && (
                            <Badge variant="outline-primary" size="sm" className="text-[10px] px-1.5 py-0">
                              {item.hours}h
                            </Badge>
                          )}
                          {item.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(item.id)}
                          disabled={processingIds.has(item.id)}
                          className="h-7 text-xs px-2.5 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Deny
                        </Button>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleApprove(item.id)}
                          disabled={processingIds.has(item.id)}
                          className="h-7 text-xs px-2.5"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Verification History */}
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

        {/* Volunteers Tab */}
        <TabsContent value="volunteers" className="mt-6">
          <Section title={`Volunteers (${volunteers.length})`}>
            {isLoadingVolunteers ? (
              <LoadingState message="Loading volunteers..." />
            ) : volunteers.length === 0 ? (
              <EmptyState
                title="No volunteers yet"
                description="Volunteers will appear here once they join your projects."
              />
            ) : (
              <div className="space-y-3">
                {volunteers.map((vol: any) => (
                  <div
                    key={vol.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                      {(vol.displayName || vol.name || 'V').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {vol.displayName || vol.name || 'Volunteer'}
                      </p>
                      {vol.email && (
                        <p className="text-xs text-muted-foreground truncate">{vol.email}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {vol.totalHours ?? 0}h logged
                        </span>
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {vol.projectsCount ?? 0} project{(vol.projectsCount ?? 0) !== 1 ? 's' : ''}
                        </span>
                        {vol.lastActive && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Last active {new Date(vol.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="success" size="sm">Active</Badge>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-6">
          {/* Full-screen report viewer overlay */}
          {reportContent && (
            <div id="synerxus-report-overlay" className="fixed inset-0 z-[300] bg-white flex flex-col">
              <style dangerouslySetInnerHTML={{ __html: reportContent.styles + `
                @media print {
                  body > *:not(#synerxus-report-overlay) { display: none !important; }
                  #synerxus-report-overlay { position: static !important; height: auto !important; overflow: visible !important; z-index: auto !important; }
                  #synerxus-report-overlay .report-header-bar { display: none !important; }
                }
              `}} />
              <div className="report-header-bar flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shadow-sm flex-shrink-0 print:hidden">
                <button
                  onClick={closeReport}
                  className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Close
                </button>
                <span className="text-sm font-semibold text-gray-900">Impact Report</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadReport}
                    className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-2 py-1"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                  <button
                    onClick={printReport}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-300 rounded-lg px-2 py-1"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Print / PDF
                  </button>
                </div>
              </div>
              <div
                className="flex-1 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reportContent.body, {
                  ADD_ATTR: [
                    'style', 'class', 'id',
                    // SVG presentation attributes stripped by default
                    'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linejoin',
                    'font-size', 'font-family', 'font-weight', 'text-anchor',
                    'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points',
                    'transform', 'opacity',
                  ],
                  ADD_TAGS: ['svg', 'polygon', 'polyline', 'line', 'circle', 'text', 'path', 'rect', 'g'],
                  FORCE_BODY: true,
                }) }}
              />
            </div>
          )}

          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">NGO Impact Summary</h3>
              <p className="text-sm text-gray-500 mb-4">
                Global sustainability framework-aligned report with verified hours, SDG alignment, audit trail, and diaspora volunteer impact.
              </p>
              <div className="flex items-center gap-3 justify-center mb-6">
                <label className="text-xs font-medium text-muted-foreground">Time Period</label>
                <Select value={reportTimePeriod} onValueChange={(v) => { setReportTimePeriod(v); setReportContent(null); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {reportGenerating ? (
                <div className="flex items-center justify-center gap-2 text-indigo-600">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Generating report…</span>
                </div>
              ) : (
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={generateMobileReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              )}
            </CardContent>
          </Card>

          {/* ── Report Visuals Preview ── */}
          <div className="mt-8 space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <span style={{ width: 3, height: 16, background: '#0891B2', borderRadius: 2, display: 'inline-block' }} />
              <span className="text-sm font-semibold text-foreground">Report Preview — Live Data</span>
              <span className="text-xs text-muted-foreground ml-1">
                ({reportTimePeriod === 'all' ? 'all time' : reportTimePeriod === '1y' ? 'last 12 months' : `last ${reportTimePeriod}`} — matches selected period)
              </span>
            </div>

            {/* Section 1: Executive Summary */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-4">Section 1 — Executive Summary</div>
            <VerificationDensityStrip
              verifiedOutcomes={reportPreviewStats.verifiedCount}
              verificationRate={reportPreviewStats.verificationRate}
              verifiedHours={reportPreviewStats.totalHoursVerified}
              avgSLA={reportPreviewStats.avgSLA}
              verifiedBeneficiaries={reportPreviewStats.effectiveBeneficiaries}
            />

            {/* Section 2: Verification Boundary */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-4">Section 2 — Verification Boundary</div>
            <BoundaryIntegrityMatrix />

            {/* Section 3: Verification Methodology */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-4">Section 3 — Verification Methodology</div>
            <EvidenceObjectArchitecture />

            {/* Section 4: SDG Alignment */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-4">Section 4 — SDG Alignment</div>
            <SDGHorizontalBar
              entries={reportPreviewStats.sdgEntries.length > 0 ? reportPreviewStats.sdgEntries : undefined}
            />

            {/* Section 5: Global Framework Mapping */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-4">Section 5 — Global Framework Mapping</div>
            <CSRDBoundaryIndicator />

            {/* Section 6: Contribution Pathways */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-4">Section 6 — Contribution Pathways</div>
            <ContributionChain avgSLA={reportPreviewStats.avgSLA} />

            {/* Section 7: Negative Impact Screening */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-4">Section 7 — Negative Impact Screening</div>
            <ScreeningStatusMatrix />

            {/* Section 8: Engagement Metrics */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-4">Section 8 — Engagement Metrics</div>
            <GeographicHeatmap
              verificationRate={reportPreviewStats.verificationRate}
              avgSLA={reportPreviewStats.avgSLA}
            />

            {/* Section 9: Audit Trail */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-4">Section 9 — Audit Trail</div>
            <VerificationTimeline
              slaComplianceRate={reportPreviewStats.verificationRate}
            />

            {/* Section 10: Innovation Scoring (Verified Innovation Scaling Index) */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-4">Section 10 — Verified Innovation Scaling Index</div>
            <InnovationScoringRadar />

            {/* Section 11: Limitations & Assurance */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-4">Section 11 — Limitations &amp; Assurance</div>
            <AssuranceBoundaryDiagram />
          </div>
        </TabsContent>
      </Tabs>

    </main>
  );
});

export default OrganizationView;
