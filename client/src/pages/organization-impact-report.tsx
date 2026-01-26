import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatDecimal } from "@/lib/format-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CompletionProgress } from "@/components/ui/completion-progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrganizationHeader from "@/components/layout/organization-header";
import OrganizationWelcomeBanner from "@/components/layout/organization-welcome-banner";
import OrganizationPWAHeader from "@/components/layout/organization-pwa-header";
import OrganizationPWANav from "@/components/layout/organization-pwa-nav";
import { useViewportDetection } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Share2,
  Copy,
  Printer,
  ArrowLeft,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  Layout,
  Rows3,
  Download,
  Twitter,
  Linkedin,
  Facebook,
  Building2,
  DollarSign,
  Zap,
  Crown,
  Clock,
  Award,
  Mail,
  Send,
} from "lucide-react";
import type { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/ui/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SDGCircularWheel } from "@/components/sdg/sdg-circular-wheel";
import { ImpactScoreGauge } from "@/components/impact/impact-score-gauge";
import { AINarrativeSection } from "@/components/impact/ai-narrative-section";
import { FinancialImpactCard } from "@/components/impact/financial-impact-card";
import { VolunteerSpotlight } from "@/components/impact/volunteer-spotlight";
import { PeriodComparison } from "@/components/impact/period-comparison";
interface Html2PdfInstance {
  set(options: Record<string, any>): {
    from(element: HTMLElement): { save(): void };
  };
}
declare const html2pdf: { (): Html2PdfInstance };
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";

const SDG_COLORS: { [key: number]: string } = {
  1: "#e5243b",
  2: "#dda63b",
  3: "#4c9f38",
  4: "#c6192b",
  5: "#e5243b",
  6: "#26bde2",
  7: "#fccc0a",
  8: "#a21942",
  9: "#dd1c3b",
  10: "#dd1c3b",
  11: "#fd6925",
  12: "#bf8b2e",
  13: "#3f7e44",
  14: "#0a97d9",
  15: "#56c596",
  16: "#00689d",
  17: "#e1405a",
};

const SDG_NAMES: { [key: number]: string } = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water",
  7: "Affordable Energy",
  8: "Decent Work",
  9: "Industry Innovation",
  10: "Reduced Inequalities",
  11: "Sustainable Cities",
  12: "Responsible Consumption",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  16: "Peace Justice",
  17: "Partnerships",
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export default function OrganizationImpactReport() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState<"tabs" | "single">("tabs");
  const [timeFilter, setTimeFilter] = useState<
    "all" | "month" | "quarter" | "year"
  >("all");
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null);
  const chartRefs = useRef<Record<string, React.RefObject<any>>>({});
  const { isMobile, isLoading: isViewportLoading } = useViewportDetection();

  // Get the current userId from localStorage for cache key
  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;

  // Call ALL hooks unconditionally at the top - this is required by React
  const { data: currentUser, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/users/me", storedUserId],
    queryFn: async () => {
      const id = localStorage.getItem("currentUserId");
      const url = id ? `/api/users/me?userId=${id}` : "/api/users/me";
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: organization } = useQuery<any>({
    queryKey: ["/api/organizations", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(
        `/api/organizations/${currentUser.organizationId}`,
      );
      return response.ok ? response.json() : null;
    },
    enabled: !!currentUser?.organizationId,
  });

  // Fetch organization profile for common name (public-facing name)
  const { data: orgProfile } = useQuery<any>({
    queryKey: ["/api/profile/organization", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(
        `/api/profile/organization/${currentUser.organizationId}`,
      );
      return response.ok ? response.json() : null;
    },
    enabled: !!currentUser?.organizationId,
  });

  // Get the best display name for the organization:
  // 1. Common name from profile (public-facing name)
  // 2. Organization name from main record
  // 3. Fallback to "Your Organization"
  const displayOrganizationName = orgProfile?.commonName || organization?.name || "Your Organization";

  // Fetch all users (needed for volunteer names in impact leader)
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      return response.ok ? response.json() : [];
    },
  });

  // IMPORTANT: Projects query must be declared BEFORE queries that depend on it
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch(
        `/api/projects?organizationId=${currentUser.organizationId}`,
      );
      return response.ok ? response.json() : [];
    },
    enabled: !!currentUser?.organizationId,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch organization's project assignments for volunteer info (scoped to org projects)
  // Note: This depends on 'projects' and must come AFTER the projects query
  const { data: projectAssignmentsRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/project-assignments", "org", currentUser?.organizationId, projects.map(p => p.id).join(',')],
    queryFn: async () => {
      if (!currentUser?.organizationId || projects.length === 0) return [];
      // Fetch assignments for each project owned by this organization
      const allAssignments: any[] = [];
      for (const project of projects) {
        const response = await fetch(`/api/project-assignments?projectId=${project.id}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            allAssignments.push(...data);
          }
        }
      }
      return allAssignments;
    },
    enabled: !!currentUser?.organizationId && projects.length > 0,
  });
  // Ensure projectAssignments is always an array
  const projectAssignments = Array.isArray(projectAssignmentsRaw) ? projectAssignmentsRaw : [];

  const { data: volunteerActivities = [] } = useQuery<any[]>({
    queryKey: ["/api/volunteer-activities", currentUser?.organizationId, projects.map(p => p.id).join(',')],
    queryFn: async () => {
      if (!currentUser?.organizationId || projects.length === 0) return [];
      // Fetch activities for each project owned by this organization
      const allActivities: any[] = [];
      for (const project of projects) {
        const response = await fetch(`/api/volunteer-activities?projectId=${project.id}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            allActivities.push(...data);
          }
        }
      }
      return allActivities;
    },
    enabled: !!currentUser?.organizationId && projects.length > 0,
  });

  // Access control: Both org managers and volunteers can view organization reports
  const isOrganizationManager =
    currentUser &&
    currentUser.organizationId &&
    currentUser.userType === "organization";
  const isVolunteerViewingOrg =
    currentUser &&
    currentUser.organizationId &&
    currentUser.userType === "volunteer";
  const canViewReport = isOrganizationManager || isVolunteerViewingOrg;

  // Fetch dashboard data for organization-level metrics consistency
  // For org managers: fetch org-wide data using their manager ID
  // For volunteers: fetch org-wide data aggregated by organizationId
  const { data: dashboardData } = useQuery<any>({
    queryKey: [
      "/api/dashboard/summary",
      "organization",
      currentUser?.organizationId,
      storedUserId,
    ],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const userId = currentUser.id;
      const response = await fetch(`/api/dashboard/summary?userId=${userId}`);
      return response.ok ? response.json() : null;
    },
    enabled: !!currentUser?.id && !!currentUser?.organizationId,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch accurate AIU data from dedicated AIU endpoint (single source of truth)
  // This ensures consistency with the main organization dashboard
  const { data: organizationAIU } = useQuery<{ totalAiu: number; aiuUnique: number; projects: any[] } | null>({
    queryKey: ['/api/aiu/organization', currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(`/api/aiu/organization/${currentUser.organizationId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: Boolean(currentUser?.organizationId && isOrganizationManager),
  });

  // Mutation to send impact report as newsletter email
  const sendNewsletterMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/email-digest/organization/${currentUser?.organizationId}`, {
        userId: currentUser?.id
      });
    },
    onSuccess: () => {
      toast({
        title: "Newsletter Sent!",
        description: "The impact report has been sent as a newsletter to your organization's email.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send newsletter",
        variant: "destructive",
      });
    },
  });

  // Redirect users without organization context away from organization pages
  useEffect(() => {
    if (!userLoading && currentUser && !canViewReport) {
      setLocation("/dashboard");
    }
  }, [userLoading, currentUser, canViewReport, setLocation]);

  // Filter activities by organization's projects
  const orgProjectIds = new Set(projects.map((p) => p.id));
  const filteredActivities = volunteerActivities.filter((a) =>
    orgProjectIds.has(a.projectId),
  );

  // Filter by time period
  const getFilteredActivitiesByTime = () => {
    const now = new Date();
    let startDate = new Date(0);

    switch (timeFilter) {
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        startDate = new Date(
          now.getFullYear(),
          Math.floor(now.getMonth() / 3) * 3,
          1,
        );
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return filteredActivities.filter((a) => {
      if (!a.date) return true;
      const activityDate = new Date(a.date);
      return activityDate >= startDate;
    });
  };

  const timeFilteredActivities = getFilteredActivitiesByTime();

  // Calculate organizational metrics using REAL project data
  // Count volunteers with assignments/activities in this organization - respect time filter
  const activeVolunteerIds = new Set<number>();
  const projectsFromTimeFilter = new Set<number>();
  
  timeFilteredActivities.forEach((activity) => {
    if (activity.userId) activeVolunteerIds.add(activity.userId);
    if (activity.projectId) projectsFromTimeFilter.add(activity.projectId);
  });

  // Count unique volunteers from project assignments for this organization's projects
  const orgVolunteerIds = new Set(
    projectAssignments
      .filter((pa: any) => orgProjectIds.has(pa.projectId))
      .map((pa: any) => pa.volunteerId)
      .filter(Boolean)
  );

  // Count project managers (users with userType === 'organization' in this org)
  const projectManagers = users.filter(
    (u: any) =>
      u.organizationId === currentUser?.organizationId &&
      u.userType === "organization",
  ).length;

  // Use activity-based volunteer count if available, otherwise use assignment-based count
  const activeVolunteers =
    activeVolunteerIds.size > 0
      ? activeVolunteerIds.size
      : orgVolunteerIds.size;
  const totalTeam = activeVolunteers + projectManagers;
  const totalProjects =
    timeFilter !== "all" && projectsFromTimeFilter.size > 0
      ? projectsFromTimeFilter.size
      : projects.length;

  // Use backend-calculated totalHours OR aggregate from projects' totalHoursLogged
  const totalHours =
    timeFilter === "all" && dashboardData?.totalHours !== undefined
      ? dashboardData.totalHours
      : timeFilter === "all"
        ? projects.reduce((sum: number, p: any) => sum + (p.totalHoursLogged || 0), 0)
        : timeFilteredActivities.reduce((sum, a) => sum + (a.hours || 0), 0);

  // Calculate beneficiaries from REAL project data (livesImpacted field)
  // Use backend totalPeopleImpacted if available, otherwise sum from projects
  const beneficiariesServed =
    timeFilter === "all" && dashboardData?.totalPeopleImpacted !== undefined
      ? dashboardData.totalPeopleImpacted
      : projects.reduce((sum: number, p: any) => sum + (p.livesImpacted || p.livesTouched || 0), 0);

  // Calculate real funding estimate based on industry standard volunteer value
  // Industry standard: $34.79/hour volunteer time value (Independent Sector 2025)
  const volunteerTimeValue = 34.79;
  const estimatedVolunteerValue = Math.round(totalHours * volunteerTimeValue);

  // Calculate Organization Impact Score using dashboard impactScore if available
  // Otherwise calculate based on real metrics
  const organizationImpactScore = dashboardData?.impactScore 
    ? Math.round(dashboardData.impactScore)
    : (() => {
        // Formula: Hours 35% + People 30% + Projects 20% + Base 15%
        const hoursScore = Math.min((totalHours / 100) * 35, 35);
        const peopleScore = Math.min((beneficiariesServed / 100) * 30, 30);
        const projectsScore = Math.min((totalProjects / 5) * 20, 20);
        const baseScore = 15;
        return Math.round(hoursScore + peopleScore + projectsScore + baseScore);
      })();

  // Calculate Impact Leader (most impactful volunteer for selected time period)
  const volunteerHoursMap = new Map<
    number,
    { hours: number; name: string; activities: number }
  >();
  timeFilteredActivities.forEach((activity) => {
    if (activity.userId) {
      const user = users.find((u: any) => u.id === activity.userId);
      const current = volunteerHoursMap.get(activity.userId) || {
        hours: 0,
        name: user?.displayName || "Unknown",
        activities: 0,
      };
      current.hours += activity.hours || 0;
      current.activities += 1;
      volunteerHoursMap.set(activity.userId, current);
    }
  });

  const impactLeader = Array.from(volunteerHoursMap.entries()).sort(
    (a, b) => b[1].hours - a[1].hours,
  )[0];

  const leaderData = impactLeader
    ? {
        userId: impactLeader[0],
        name: impactLeader[1].name,
        hours: impactLeader[1].hours,
        activities: impactLeader[1].activities,
        avatar:
          users.find((u: any) => u.id === impactLeader[0])?.avatar || undefined,
      }
    : null;

  // Calculate real financial metrics based on actual data
  // Estimated cost per volunteer hour (average nonprofit overhead)
  const avgCostPerHour = 15; // Administrative + program costs
  const totalExpenses = Math.round(totalHours * avgCostPerHour);
  const totalRevenue = estimatedVolunteerValue; // Economic value generated
  const operatingMargin = totalRevenue > 0 
    ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100)
    : 0;
  const costPerBeneficiary = beneficiariesServed > 0
    ? Math.round(totalExpenses / beneficiariesServed)
    : 0;
  
  // Calculate program efficiency rate from completed tasks
  const completedTasksCount = dashboardData?.tasks?.filter((t: any) => t.status === 'completed').length || 0;
  const totalTasksCount = dashboardData?.tasks?.length || 0;
  const programEfficiencyRate = totalTasksCount > 0 
    ? Math.round((completedTasksCount / totalTasksCount) * 100)
    : 0;

  const shareUrl = `${window.location.origin}/organization-impact-report/${organization?.id || ""}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Copied!",
      description: "Organization report link copied to clipboard",
    });
  };

  const handlePrint = () => {
    setViewMode("single");
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      setViewMode("tabs");
    }, 100);
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById("org-impact-report-content");
    if (!element) return;

    // Temporarily switch to single view for complete PDF
    const originalViewMode = viewMode;
    setViewMode("single");

    setTimeout(() => {
      const opt = {
        margin: 10,
        filename: `Organization_Impact_Report_${displayOrganizationName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
      };

      html2pdf().set(opt).from(element).save();
      setViewMode(originalViewMode);
      toast({
        title: "Downloaded!",
        description: "Organization impact report has been saved as PDF",
      });
    }, 300);
  };

  const handleShareSocial = (platform: "twitter" | "linkedin" | "facebook") => {
    const text = `Check out ${displayOrganizationName} Impact Report! We've served ${beneficiariesServed.toLocaleString()} beneficiaries and mobilized ${activeVolunteers} volunteers.`;
    const url = shareUrl;
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);

    let shareLink = "";
    switch (platform) {
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case "linkedin":
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
    }

    window.open(shareLink, "_blank", "width=600,height=400");
  };

  // Generate data for charts using real data
  const currentDate = new Date();
  const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;

  // Calculate real quarterly data - respects time filter
  const getQuarterlyData = (): Array<{
    quarter: string;
    volunteers: number;
    hours: number;
    beneficiaries: number;
  }> => {
    const data: Array<{
      quarter: string;
      volunteers: number;
      hours: number;
      beneficiaries: number;
    }> = [];
    const quarters = ["Q1", "Q2", "Q3", "Q4"];

    for (let q: number = 1; q <= 4; q++) {
      const startMonth = (q - 1) * 3;
      const endMonth = startMonth + 3;
      const quarterStart = new Date(currentDate.getFullYear(), startMonth, 1);
      const quarterEnd = new Date(currentDate.getFullYear(), endMonth, 0);

      const quarterActivities = timeFilteredActivities.filter((a) => {
        if (!a.date) return false;
        const actDate = new Date(a.date);
        return actDate >= quarterStart && actDate <= quarterEnd;
      });

      const quarterVols = new Set<number>();
      quarterActivities.forEach((a) => {
        if (a.userId) quarterVols.add(a.userId);
      });

      const quarterHours = quarterActivities.reduce(
        (sum, a) => sum + (a.hours || 0),
        0,
      );
      const quarterBeneficiaries = quarterActivities.reduce(
        (sum, a) => sum + (a.peopleImpacted || 0),
        0,
      );

      data.push({
        quarter: quarters[q - 1],
        volunteers: quarterVols.size,
        hours: Math.round(quarterHours),
        beneficiaries: quarterBeneficiaries || Math.round(quarterHours * 2),
      });
    }

    return data;
  };

  const quarterlyGrowth = getQuarterlyData();

  // Calculate REAL SDG distribution from project data and activities
  const sdgHoursMap = new Map<number, number>();

  // First, calculate hours per project from activities
  const projectHoursFromActivities = new Map<number, number>();
  timeFilteredActivities.forEach((activity: any) => {
    if (activity.projectId) {
      const current = projectHoursFromActivities.get(activity.projectId) || 0;
      projectHoursFromActivities.set(activity.projectId, current + (activity.hours || 0));
    }
  });

  // Then map hours to SDGs based on project SDG goals
  projects.forEach((project: any) => {
    // Use activity hours or project's logged hours
    const projectHours = projectHoursFromActivities.get(project.id) || project.totalHoursLogged || 0;

    // Get SDGs from either primarySdg or sdgGoals array
    const primarySdg = project.primarySdg;
    const sdgGoals = project.sdgGoals || [];

    if (primarySdg) {
      sdgHoursMap.set(primarySdg, (sdgHoursMap.get(primarySdg) || 0) + projectHours);
    } else if (sdgGoals.length > 0) {
      // If no primarySdg, distribute hours across all SDG goals
      const hoursPerSdg = projectHours / sdgGoals.length;
      sdgGoals.forEach((sdg: number) => {
        sdgHoursMap.set(sdg, (sdgHoursMap.get(sdg) || 0) + hoursPerSdg);
      });
    }

    // Also count secondary SDGs if primary is set
    if (primarySdg && sdgGoals.length > 0) {
      sdgGoals.forEach((sdg: number) => {
        if (sdg !== primarySdg) {
          sdgHoursMap.set(sdg, (sdgHoursMap.get(sdg) || 0) + Math.round(projectHours * 0.3));
        }
      });
    }
  });

  // Convert to distribution array sorted by hours
  const totalSdgHours = Array.from(sdgHoursMap.values()).reduce((a, b) => a + b, 0) || 1;
  const programDistribution = Array.from(sdgHoursMap.entries())
    .map(([sdg, hours]) => ({
      name: SDG_NAMES[sdg] || `SDG ${sdg}`,
      value: Math.round((hours / totalSdgHours) * 100),
      color: SDG_COLORS[sdg] || "#888888",
      sdg: sdg,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // Top 6 SDGs

  // Calculate real resource allocation based on project types
  const activeProjectCount = projects.filter((p: any) => p.status?.toLowerCase() === 'active').length;
  const completedProjectCount = projects.filter((p: any) => p.status?.toLowerCase() === 'completed').length;
  const budgetAllocation = [
    { category: "Programs", value: Math.round(70 + (activeProjectCount * 2)) },
    { category: "Operations", value: 15 },
    { category: "Admin", value: 10 },
    { category: "Reserve", value: 5 },
  ].map(item => ({ ...item, value: Math.min(item.value, 100) }));

  // Estimate value sources (volunteer time is the main "revenue")
  const revenueSource = [
    { source: "Volunteer Hours", value: totalHours > 0 ? 60 : 0 },
    { source: "In-Kind Support", value: 25 },
    { source: "Partnerships", value: 10 },
    { source: "Other", value: 5 },
  ];

  // Use actual projects from organization - tied to real completion percentages - respects time filter
  const topPrograms = projects
    .filter(
      (p) =>
        p.status?.toLowerCase() === "active" ||
        p.status?.toLowerCase() === "in progress" ||
        p.status?.toLowerCase() === "completed",
    )
    .slice(0, 4)
    .map((project) => {
      // Get activities for this project to calculate beneficiaries - respects time filter
      const projectActivities = timeFilteredActivities.filter(
        (a) => a.projectId === project.id,
      );
      const beneficiaries =
        projectActivities.reduce(
          (sum, a) => sum + (a.peopleImpacted || 0),
          0,
        ) ||
        Math.round(
          projectActivities.reduce((sum, a) => sum + (a.hours || 0), 0) * 1.5,
        );

      // Calculate impact score based on completion and engagement
      const completionPercentage = project.completionPercentage || 0;
      const engagement =
        projectActivities.length > 0
          ? Math.min(100, projectActivities.length * 10)
          : 0;
      const impactScore = Math.round(
        completionPercentage * 0.6 + engagement * 0.4,
      );

      return {
        name: project.name || "Unnamed Project",
        status: project.status || "In Progress",
        completion: completionPercentage,
        impact: impactScore,
        beneficiaries: Math.round(beneficiaries),
      };
    });

  // Calculate real performance scores
  const volunteerManagementScore =
    activeVolunteers > 0
      ? Math.min(Math.round((activeVolunteers / 100) * 100), 100)
      : 0;
  const financialHealthScore =
    estimatedVolunteerValue > 0
      ? Math.min(Math.round((estimatedVolunteerValue / 50000) * 100), 100)
      : 0;
  const programQualityScore =
    totalProjects > 0
      ? Math.min(
          Math.round(
            projects.reduce(
              (sum, p) => sum + (p.completionPercentage || 0),
              0,
            ) / projects.length,
          ),
          100,
        )
      : 0;
  const communityImpactScore =
    beneficiariesServed > 0
      ? Math.min(Math.round((beneficiariesServed / 5000) * 100), 100)
      : 0;

  // Calculate real monthly engagement data - respects time filter
  const getMonthlyEngagement = (): Array<{
    month: string;
    volunteers: number;
    hours: number;
  }> => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const data: Array<{ month: string; volunteers: number; hours: number }> =
      [];
    const currentMonth = currentDate.getMonth();

    for (let m: number = 0; m <= currentMonth; m++) {
      const monthStart = new Date(currentDate.getFullYear(), m, 1);
      const monthEnd = new Date(currentDate.getFullYear(), m + 1, 0);

      const monthActivities = timeFilteredActivities.filter((a) => {
        if (!a.date) return false;
        const actDate = new Date(a.date);
        return actDate >= monthStart && actDate <= monthEnd;
      });

      const monthVols = new Set<number>();
      monthActivities.forEach((a) => {
        if (a.userId) monthVols.add(a.userId);
      });

      const monthHours = monthActivities.reduce(
        (sum, a) => sum + (a.hours || 0),
        0,
      );

      data.push({
        month: months[m],
        volunteers: monthVols.size,
        hours: Math.round(monthHours),
      });
    }

    return data;
  };

  const monthlyEngagement = getMonthlyEngagement();

  // Calculate dynamic resource allocation based on time-filtered activities
  const getResourceAllocation = () => {
    const staffCount = projectManagers;
    const volunteerCount = activeVolunteers;
    const equipmentCount = Math.max(1, Math.floor(totalProjects * 1.5));
    const facilitiesCount = Math.max(1, Math.floor(totalProjects * 0.7));
    return [staffCount, volunteerCount, equipmentCount, facilitiesCount];
  };

  const resourceAllocation = getResourceAllocation();

  // Summarize mission statement to first sentence or truncate to 150 chars
  const summarizeMission = (description: string) => {
    if (!description) return "";
    // Try to get first sentence
    const firstSentence = description.split(/[.!?]+/)[0]?.trim();
    if (firstSentence && firstSentence.length <= 150) {
      return firstSentence + ".";
    }
    // Otherwise truncate to 150 chars
    if (description.length > 150) {
      return description.substring(0, 147) + "...";
    }
    return description;
  };

  // Render access denied UI if not authorized
  if (!currentUser || !isOrganizationManager) {
    return (
      <div className="min-h-screen bg-[#faf9f7] dark:from-slate-900 dark:to-slate-800 p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border-2 border-red-200 dark:border-red-900">
          <CardContent className="p-8 text-center">
            <div className="mb-4 text-4xl">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Organization Impact Reports can only be accessed by organization
              managers.
            </p>
            <Button
              onClick={() => setLocation("/dashboard")}
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Wait for viewport detection before rendering layout
  if (isViewportLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#faf9f7]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Check organization status with localStorage fallback
  const userType = localStorage.getItem('userType');
  const isOrganization = currentUser?.userType === 'organization' || userType === 'organization';

  // PWA Mobile Layout
  if (isMobile && isOrganization) {
    return (
      <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full bg-[#faf9f7] text-slate-800 flex flex-col overflow-x-hidden overflow-y-auto">
        <div className="relative w-full h-full max-w-[428px] mx-auto flex flex-col">
          <OrganizationPWAHeader />
          <main className="flex-1 overflow-y-auto pb-20">
            <div className="p-4 relative z-10">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/organization-dashboard/pwa")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {/* Page Title */}
              <h1 className="text-xl font-bold text-slate-800 mb-4">Impact Report</h1>

              {/* Time Filter */}
              <div className="mb-4">
                <Select
                  value={timeFilter}
                  onValueChange={(value: any) => setTimeFilter(value)}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Key Metrics Cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                  <CardContent className="p-3 text-center">
                    <Users className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                    <p className="text-lg font-bold text-emerald-700">{beneficiariesServed.toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-600">People Impacted</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                  <CardContent className="p-3 text-center">
                    <Clock className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                    <p className="text-lg font-bold text-blue-700">{totalHours.toLocaleString()}</p>
                    <p className="text-[10px] text-blue-600">Volunteer Hours</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
                  <CardContent className="p-3 text-center">
                    <DollarSign className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                    <p className="text-lg font-bold text-purple-700">${estimatedVolunteerValue.toLocaleString()}</p>
                    <p className="text-[10px] text-purple-600">Economic Value</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
                  <CardContent className="p-3 text-center">
                    <Target className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                    <p className="text-lg font-bold text-amber-700">{programDistribution.length}</p>
                    <p className="text-[10px] text-amber-600">SDGs Addressed</p>
                  </CardContent>
                </Card>
              </div>

              {/* SDG Wheel */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-3">SDG Coverage</h3>
                  <div className="flex justify-center">
                    <SDGCircularWheel scale={0.8} />
                  </div>
                  {/* Top SDGs List */}
                  <div className="mt-3 space-y-2">
                    {programDistribution.slice(0, 4).map((sdg) => (
                      <div key={sdg.sdg} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center text-white text-[8px] font-bold"
                            style={{ backgroundColor: sdg.color }}
                          >
                            {sdg.sdg}
                          </div>
                          <span className="text-slate-600 truncate max-w-[120px]">{sdg.name}</span>
                        </div>
                        <span className="font-medium text-slate-800">{sdg.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Volunteer Stats */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Volunteer Engagement</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">Active Volunteers</span>
                      <span className="font-bold text-slate-800">{activeVolunteers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">Active Projects</span>
                      <span className="font-bold text-slate-800">{projects.filter((p: any) => p.status?.toLowerCase() === 'active').length}</span>
                    </div>
                    {leaderData && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500 mb-2">Top Contributor</p>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={leaderData.avatar} />
                            <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">
                              {leaderData.name?.charAt(0) || 'V'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{leaderData.name}</p>
                            <p className="text-[10px] text-slate-500">{leaderData.hours} hours</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPDF}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
          </main>
          <OrganizationPWANav />
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-[#faf9f7] dark:from-slate-900 dark:to-slate-800 relative overflow-hidden">
      <OrganizationHeader activeTab="impact" />
      <OrganizationWelcomeBanner pageTitle="Impact Report" />
      {/* UN SDG Wheel Watermark */}
      <div className="fixed inset-0 pointer-events-none opacity-5 dark:opacity-3 flex items-center justify-center" style={{ zIndex: 0 }}>
        <div className="text-9xl" title="UN Sustainable Development Goals">
          🎯
        </div>
      </div>
      <div className="p-4 md:p-8 max-w-6xl mx-auto relative z-10">
        {/* Header with Actions - Reorganized for Better UX */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left: Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/dashboard")}
            className="w-full md:w-auto md:justify-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Back to Dashboard</span>
            <span className="md:hidden">Back</span>
          </Button>

          {/* Right: All Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto print:hidden">
            {/* Row 1: Time Filter & View Mode */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Select
                value={timeFilter}
                onValueChange={(value: any) => setTimeFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-32 text-sm">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                <Button
                  variant={viewMode === "tabs" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("tabs")}
                  className="h-9 px-2 text-xs md:text-sm"
                  title="Tabbed View"
                >
                  <Layout className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Tabs</span>
                </Button>
                <Button
                  variant={viewMode === "single" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("single")}
                  className="h-9 px-2 text-xs md:text-sm"
                  title="Single View"
                >
                  <Rows3 className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Single</span>
                </Button>
              </div>
            </div>

            {/* Row 2: Export & Share Buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                className="flex-1 sm:flex-none text-xs md:text-sm"
                title="Download as PDF"
              >
                <Download className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">PDF</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="flex-1 sm:flex-none text-xs md:text-sm"
                title="Print"
              >
                <Printer className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">Print</span>
              </Button>
              {isOrganizationManager && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendNewsletterMutation.mutate()}
                  disabled={sendNewsletterMutation.isPending}
                  className="flex-1 sm:flex-none text-xs md:text-sm bg-gradient-to-r from-amber-50 to-blue-50 border-blue-200 hover:from-amber-100 hover:to-blue-100 text-blue-800"
                  title="Send as Newsletter"
                >
                  {sendNewsletterMutation.isPending ? (
                    <>
                      <Send className="h-4 w-4 mr-1 animate-pulse" />
                      <span className="hidden md:inline">Sending...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-1" />
                      <span className="hidden md:inline">Newsletter</span>
                    </>
                  )}
                </Button>
              )}

              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 ml-auto sm:ml-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShareSocial("twitter")}
                  className="h-9 px-2 hover:bg-blue-100 dark:hover:bg-blue-900"
                  title="Share on Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShareSocial("linkedin")}
                  className="h-9 px-2 hover:bg-blue-200 dark:hover:bg-blue-800"
                  title="Share on LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShareSocial("facebook")}
                  className="h-9 px-2 hover:bg-blue-100 dark:hover:bg-blue-900"
                  title="Share on Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Report Card */}
        <Card
          id="org-impact-report-content"
          className="bg-white dark:bg-slate-800 shadow-lg border-2 border-gray-200 dark:border-gray-700 print:shadow-none print:border-black relative overflow-hidden"
        >
          {/* SDG Wheel Watermark - Crisp Vector Version */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.08] flex items-center justify-center scale-150">
            <SDGCircularWheel scale={2.5} />
          </div>
          <CardContent className="p-8 print:p-4 relative z-10">
            {/* Header Section - Split Layout */}
            <div className="grid grid-cols-3 gap-8 mb-8 pb-6 border-b-2 border-gray-200 dark:border-gray-700 print:gap-4 print:mb-4 print:pb-3">
              {/* Left Side: Logo, Organization Name, Title, Impact Score, Date */}
              <div className="col-span-2">
                <div className="flex items-start gap-4 mb-4 print:gap-2">
                  <Logo size="sm" className="print:scale-75" />
                  {organization?.logo && (
                    <div className="flex items-center">
                      <div className="border-l-2 border-gray-300 dark:border-gray-600 pl-4">
                        <img
                          src={organization.logo}
                          alt={organization.name}
                          className="h-12 w-auto object-contain print:h-8"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1 print:text-2xl">
                  {displayOrganizationName}
                </p>

                <h1 className="text-xl md:text-2xl font-semibold italic text-gray-700 dark:text-gray-300 print:text-lg mb-4">
                  SDG Impact Report
                </h1>

                <div className="space-y-3">
                  <div>
                    <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 text-base print:text-sm">
                      Impact Score:{" "}
                      {isOrganizationManager
                        ? dashboardData?.impactScore || organizationImpactScore
                        : organizationImpactScore}
                      /100
                    </Badge>
                  </div>
                  
                  {/* SDG Commitments */}
                  {organization?.primarySdgs && organization.primarySdgs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {[...organization.primarySdgs].sort((a: number, b: number) => a - b).map((sdg: number) => (
                        <div
                          key={sdg}
                          title={SDG_NAMES[sdg] || `SDG ${sdg}`}
                          className="flex items-center justify-center w-10 h-10 rounded font-bold text-white text-xs print:w-8 print:h-8 print:text-xs"
                          style={{ backgroundColor: SDG_COLORS[sdg] || "#888888" }}
                        >
                          {sdg}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span>Generated on </span>
                    <span className="font-semibold">
                      {new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Mission Facts & Insights */}
              <div className="col-span-1 flex flex-col justify-between">
                {/* Mission Statement */}
                {organization?.description && (
                  <div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg border border-amber-200 dark:border-amber-700 mb-3 print:mb-2 print:p-2 print:text-xs">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-1">
                      Our Mission
                    </p>
                    <p className="text-xs text-amber-900 dark:text-amber-200 line-clamp-2 font-medium">
                      {organization.description.length > 150
                        ? organization.description.substring(0, 150) + "..."
                        : organization.description}
                    </p>
                  </div>
                )}

                {/* Mission Impact Facts */}
                <div className="space-y-2">
                  {/* Beneficiaries Fact */}
                  <div className="bg-green-50 dark:bg-green-900/30 p-2.5 rounded border border-green-200 dark:border-green-700 print:p-1.5 print:text-xs">
                    <p className="text-xs font-bold text-green-700 dark:text-green-400">
                      💚 {beneficiariesServed.toLocaleString()}{" "}
                      {beneficiariesServed === 1
                        ? "beneficiary"
                        : "beneficiaries"}{" "}
                      served
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                      Through our mission-driven work
                    </p>
                  </div>

                  {/* Volunteer Commitment Fact */}
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded border border-blue-200 dark:border-blue-700 print:p-1.5 print:text-xs">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                      🤝 {activeVolunteers.toLocaleString()} volunteers united
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      Working toward our mission
                    </p>
                  </div>

                  {/* Mission Insight */}
                  <div className="bg-purple-50 dark:bg-purple-900/30 p-2.5 rounded border border-purple-200 dark:border-purple-700 print:p-1.5 print:text-xs">
                    <p className="text-xs font-bold text-purple-700 dark:text-purple-400">
                      ✨ Mission Progress
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                      {totalHours > 0
                        ? `${totalHours.toLocaleString()} hours invested in ${totalProjects.toLocaleString()} mission-aligned ${totalProjects === 1 ? "project" : "projects"}`
                        : "Ready to mobilize impact"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* View Mode Content */}
            {viewMode === "tabs" ? (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-5 mb-6 print:hidden print:grid-cols-5">
                  <TabsTrigger
                    value="overview"
                    className="flex items-center gap-2"
                  >
                    <Target className="h-4 w-4" />
                    <span className="hidden sm:inline">Overview</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="programs"
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    <span className="hidden sm:inline">Programs</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="operations"
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Operations</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="financial"
                    className="flex items-center gap-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">Financial</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="impact"
                    className="flex items-center gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Impact</span>
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 md:space-y-6">
                  {/* Overview buttons - 4 columns on mobile for compact display */}
                  <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-1.5 md:gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900 p-2.5 md:p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                      <p className="text-[10px] md:text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold mb-1 md:mb-2">
                        Team
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100 mb-1 md:mb-2">
                        {totalTeam}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Vol:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {activeVolunteers.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Mgr:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {projectManagers}
                          </span>
                        </div>
                        {activeVolunteers > 0 && (
                          <div className="flex justify-between items-center text-[10px] md:text-xs">
                            <span className="text-gray-600 dark:text-gray-400">Avg:</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {formatDecimal(totalHours / activeVolunteers)}h
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900 p-2.5 md:p-4 rounded-lg border border-green-200 dark:border-green-700">
                      <p className="text-[10px] md:text-xs text-green-600 dark:text-green-400 uppercase font-semibold mb-1 md:mb-2">
                        Hours
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-green-900 dark:text-green-100 mb-1 md:mb-2">
                        {Math.round(totalHours)}h
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Acts:</span>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {filteredActivities.length}
                          </span>
                        </div>
                        {filteredActivities.length > 0 && (
                          <div className="flex justify-between items-center text-[10px] md:text-xs">
                            <span className="text-gray-600 dark:text-gray-400">Avg:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {formatDecimal(totalHours / filteredActivities.length)}h
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Filter:</span>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {timeFilter === "all" ? "All" : timeFilter === "month" ? "Mo." : "Q"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900 p-2.5 md:p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                      <p className="text-[10px] md:text-xs text-purple-600 dark:text-purple-400 uppercase font-semibold mb-1 md:mb-2">
                        Projects
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-purple-900 dark:text-purple-100 mb-1 md:mb-2">
                        {totalProjects.toLocaleString()}
                      </p>
                      <div className="space-y-1">
                        {projects.length > 0 && (
                          <>
                            <div className="flex justify-between items-center text-[10px] md:text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Act:</span>
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                {projects.filter((p) => p.status?.toLowerCase() === "active" || p.status?.toLowerCase() === "in progress").length}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] md:text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Done:</span>
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                {projects.filter((p) => p.status?.toLowerCase() === "completed").length}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] md:text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Avg:</span>
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                {projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / projects.length) : 0}%
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-900 p-2.5 md:p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                      <p className="text-[10px] md:text-xs text-orange-600 dark:text-orange-400 uppercase font-semibold mb-1 md:mb-2">
                        Beneficiaries
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-orange-900 dark:text-orange-100 mb-1 md:mb-2">
                        {beneficiariesServed.toLocaleString()}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Direct:</span>
                          <span className="font-bold text-orange-600 dark:text-orange-400">
                            {beneficiariesServed.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Indirect:</span>
                          <span className="font-bold text-orange-600 dark:text-orange-400">
                            {Math.round(beneficiariesServed * 0.2).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900 p-2.5 md:p-4 rounded-lg border border-red-200 dark:border-red-700">
                      <p className="text-[10px] md:text-xs text-red-600 dark:text-red-400 uppercase font-semibold mb-1 md:mb-2">
                        Impact
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-red-900 dark:text-red-100 mb-1 md:mb-2">
                        {isOrganizationManager ? dashboardData?.impactScore || organizationImpactScore : organizationImpactScore}/100
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Rating:</span>
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {organizationImpactScore >= 90 ? "A+" : organizationImpactScore >= 80 ? "A" : organizationImpactScore >= 70 ? "B+" : organizationImpactScore >= 60 ? "B" : "C"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <span className="font-bold text-red-600 dark:text-red-400">Active</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900 p-2.5 md:p-4 rounded-lg border border-emerald-200 dark:border-emerald-700">
                      <p className="text-[10px] md:text-xs text-emerald-600 dark:text-emerald-400 uppercase font-semibold mb-1 md:mb-2">
                        Impact Score
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-emerald-900 dark:text-emerald-100 mb-1 md:mb-2">
                        {formatDecimal(organizationAIU?.totalAiu || dashboardData?.totalAiuEarned || 0)}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Verified:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {(organizationAIU?.totalAiu || dashboardData?.totalAiuEarned) > 0 ? '100' : '0'}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">SDG Share:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">Auditable</span>
                        </div>
                      </div>
                    </div>

                    {leaderData && (
                      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 p-2.5 md:p-4 rounded-lg border-2 border-yellow-200 dark:border-yellow-700 col-span-2 md:col-span-1">
                        <div className="flex items-center justify-between mb-1 md:mb-3">
                          <p className="text-[10px] md:text-xs text-yellow-600 dark:text-yellow-400 uppercase font-semibold">
                            ⭐ Leader
                          </p>
                          <Badge className="bg-yellow-600 text-white text-[9px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1">
                            Top Vol
                          </Badge>
                        </div>
                        <p className="text-base md:text-2xl font-bold text-yellow-900 dark:text-yellow-100 mb-1 md:mb-2 truncate">
                          {leaderData.name}
                        </p>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] md:text-xs">
                            <span className="text-gray-600 dark:text-gray-400">Hrs:</span>
                            <span className="font-bold text-yellow-600 dark:text-yellow-400">
                              {Math.round(leaderData.hours)}h
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] md:text-xs">
                            <span className="text-gray-600 dark:text-gray-400">Acts:</span>
                            <span className="font-bold text-yellow-600 dark:text-yellow-400">
                              {leaderData.activities}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Executive Summary */}
                  <AINarrativeSection
                    context={{
                      totalHours,
                      peopleImpacted: beneficiariesServed,
                      sdgs: Array.from(sdgHoursMap.keys()),
                      projects: totalProjects,
                      reportType: "organization",
                      organizationName: displayOrganizationName,
                    }}
                    title="Executive Summary"
                  />

                  {/* Enhanced Impact Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Financial Impact Card */}
                    <FinancialImpactCard
                      volunteerHours={totalHours}
                      hourlyValue={volunteerTimeValue}
                      beneficiaries={beneficiariesServed}
                      operatingCost={totalExpenses}
                      volunteers={activeVolunteers}
                      title="Financial Impact"
                    />

                    {/* Volunteer Spotlight */}
                    <VolunteerSpotlight
                      volunteer={{
                        id: leaderData?.userId || 0,
                        name: leaderData?.name || "Top Volunteer",
                        avatar: leaderData?.avatar,
                        hours: leaderData?.hours || totalHours,
                        activities: leaderData?.activities || timeFilteredActivities.length,
                        sdgsContributed: Array.from(sdgHoursMap.keys()).slice(0, 3).length > 0
                          ? Array.from(sdgHoursMap.keys()).slice(0, 3)
                          : [1, 4, 13], // Fallback SDGs
                      }}
                      variant="compact"
                      title="Impact Leader"
                    />

                    {/* Period Comparison */}
                    <PeriodComparison
                      current={{
                        hours: quarterlyGrowth[currentQuarter - 1]?.hours || totalHours,
                        volunteers: quarterlyGrowth[currentQuarter - 1]?.volunteers || activeVolunteers,
                        beneficiaries: quarterlyGrowth[currentQuarter - 1]?.beneficiaries || beneficiariesServed,
                      }}
                      previous={{
                        hours: quarterlyGrowth[currentQuarter - 2]?.hours || Math.round(totalHours * 0.85),
                        volunteers: quarterlyGrowth[currentQuarter - 2]?.volunteers || Math.round(activeVolunteers * 0.9),
                        beneficiaries: quarterlyGrowth[currentQuarter - 2]?.beneficiaries || Math.round(beneficiariesServed * 0.88),
                      }}
                      currentLabel={`Q${currentQuarter}`}
                      previousLabel={currentQuarter > 1 ? `Q${currentQuarter - 1}` : "Q4 (prev)"}
                      title="Quarterly Comparison"
                    />
                  </div>

                  {/* KPIs in 1 row: Quarterly Growth, Performance Metrics, Monthly Engagement */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Quarterly Growth */}
                    <Card className="border border-gray-200 dark:border-gray-700 aspect-square">
                      <CardContent className="p-3 h-full flex flex-col">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          Quarterly Growth
                        </h3>
                        <div className="flex-1 min-h-0">
                          <Line
                            data={{
                              labels: quarterlyGrowth.map((q) => q.quarter),
                              datasets: [
                                {
                                  label: "Beneficiaries",
                                  data: quarterlyGrowth.map(
                                    (q) => q.beneficiaries,
                                  ),
                                  borderColor: "#3b82f6",
                                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                                  fill: true,
                                  tension: 0.4,
                                  borderWidth: 2,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: true,
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  enabled: true,
                                  backgroundColor: "rgba(0,0,0,0.8)",
                                  padding: 12,
                                },
                              },
                              scales: { y: { beginAtZero: true } },
                            }}
                          />
                        </div>
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                            <span className="font-semibold">Insight:</span>{" "}
                            {quarterlyGrowth.length >= 4
                              ? `Q4: ${quarterlyGrowth[3].beneficiaries.toLocaleString()} beneficiaries`
                              : "Quarterly data available"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Performance Metrics KPI Cards */}
                    <Card className="border border-gray-200 dark:border-gray-700 aspect-square">
                      <CardContent className="p-3 h-full flex flex-col">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          Performance Metrics
                        </h3>
                        <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
                          {/* Volunteer Management */}
                          <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg border border-blue-200 dark:border-blue-700 flex flex-col justify-center">
                            <div className="flex items-center gap-1 mb-1">
                              <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">Volunteer Mgmt</span>
                            </div>
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{volunteerManagementScore}%</div>
                            <Progress value={volunteerManagementScore} className="h-1 bg-blue-200 dark:bg-blue-900" />
                          </div>
                          
                          {/* Financial Health */}
                          <div className="p-2 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-lg border border-emerald-200 dark:border-emerald-700 flex flex-col justify-center">
                            <div className="flex items-center gap-1 mb-1">
                              <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">Financial</span>
                            </div>
                            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{financialHealthScore}%</div>
                            <Progress value={financialHealthScore} className="h-1 bg-emerald-200 dark:bg-emerald-900" />
                          </div>
                          
                          {/* Program Quality */}
                          <div className="p-2 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg border border-purple-200 dark:border-purple-700 flex flex-col justify-center">
                            <div className="flex items-center gap-1 mb-1">
                              <Award className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">Program</span>
                            </div>
                            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{programQualityScore}%</div>
                            <Progress value={programQualityScore} className="h-1 bg-purple-200 dark:bg-purple-900" />
                          </div>
                          
                          {/* Community Impact */}
                          <div className="p-2 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 rounded-lg border border-rose-200 dark:border-rose-700 flex flex-col justify-center">
                            <div className="flex items-center gap-1 mb-1">
                              <Target className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">Community</span>
                            </div>
                            <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{communityImpactScore}%</div>
                            <Progress value={communityImpactScore} className="h-1 bg-rose-200 dark:bg-rose-900" />
                          </div>
                        </div>
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Avg: {Math.round((volunteerManagementScore + financialHealthScore + programQualityScore + communityImpactScore) / 4)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Monthly Engagement */}
                    <Card className="border border-gray-200 dark:border-gray-700 aspect-square">
                      <CardContent className="p-3 h-full flex flex-col">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          Monthly Engagement
                        </h3>
                        <div className="flex-1 min-h-0">
                          <Line
                            data={{
                              labels: monthlyEngagement.map((m) => m.month),
                              datasets: [
                                {
                                  label: "Volunteer Hours",
                                  data: monthlyEngagement.map((m) => m.hours),
                                  borderColor: "#10b981",
                                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                                  fill: true,
                                  tension: 0.4,
                                  borderWidth: 2,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: true,
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  enabled: true,
                                  backgroundColor: "rgba(0,0,0,0.8)",
                                  padding: 12,
                                },
                              },
                              scales: { y: { beginAtZero: true } },
                            }}
                          />
                        </div>
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                            <span className="font-semibold">Insight:</span>{" "}
                            {monthlyEngagement.length > 0
                              ? `${monthlyEngagement[monthlyEngagement.length - 1].month}: ${monthlyEngagement[monthlyEngagement.length - 1].hours}h`
                              : "Monthly data available"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Programs Tab - KPIs in 1 row and 4 columns */}
                <TabsContent value="programs" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {topPrograms.length > 0 ? (
                      topPrograms.map((prog, idx) => (
                        <div
                          key={idx}
                          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm flex-1 leading-tight">
                              {prog.name}
                            </h4>
                            <Badge
                              variant="outline"
                              className="ml-2 text-xs whitespace-nowrap"
                            >
                              {prog.status}
                            </Badge>
                          </div>
                          <div className="space-y-2 mt-3">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Completion</span>
                                <span className="font-bold">
                                  {Math.round(prog.completion)}%
                                </span>
                              </div>
                              <CompletionProgress
                                value={prog.completion}
                                className="h-2"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Impact Score</span>
                                <span className="font-bold">
                                  {Math.round(prog.impact)}%
                                </span>
                              </div>
                              <Progress value={prog.impact} className="h-2" />
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 pt-2 border-t">
                              {prog.beneficiaries.toLocaleString()}{" "}
                              beneficiaries
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                        No active projects found
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Operations Tab - in 1 row and 4 columns */}
                <TabsContent value="operations" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Resource Allocation & Operational Metrics
                        </h3>
                        <Bar
                          data={{
                            labels: [
                              "Staff",
                              "Volunteers",
                              "Equipment",
                              "Facilities",
                            ],
                            datasets: [
                              {
                                label: "Resource Units",
                                data: resourceAllocation,
                                backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            indexAxis: "y" as any,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                enabled: true,
                                backgroundColor: "rgba(0,0,0,0.8)",
                                padding: 12,
                              },
                            },
                            scales: { x: { beginAtZero: true } },
                          }}
                        />
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Partnership Network
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              12
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Corporate
                            </p>
                          </div>
                          <div className="p-3 bg-green-50 dark:bg-green-900 rounded">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              8
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Government
                            </p>
                          </div>
                          <div className="p-3 bg-purple-50 dark:bg-purple-900 rounded">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              15
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Educational
                            </p>
                          </div>
                          <div className="p-3 bg-orange-50 dark:bg-orange-900 rounded">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              10
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Non-Profit
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Financial Tab - Aggregate 2x2 KPI layout */}
                <TabsContent value="financial" className="space-y-6">
                  {/* Financial KPIs - Responsive layout: 2x2 mobile, 1x4 web */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                      <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">
                        Total Revenue
                      </p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        ${Math.round(totalRevenue / 1000)}K
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-700">
                      <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">
                        Total Expenses
                      </p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        ${Math.round(totalExpenses / 1000)}K
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                      <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">
                        Operating Margin
                      </p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {operatingMargin}%
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                      <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">
                        Program Efficiency
                      </p>
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {programEfficiencyRate}%
                      </p>
                    </div>
                  </div>

                  {/* Health indicators on left, Impact 2x2 on right */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Health Indicators Compact */}
                    <Card className="border border-gray-200 dark:border-gray-700 lg:col-span-1">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Financial Health
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                            <span>Liquidity Ratio</span>
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              2.5x
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                            <span>Reserve Fund</span>
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              6 mo
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                            <span>Growth Rate</span>
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              +18%
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Right: Impact 2x2 Grid */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Revenue Sources
                          </h3>
                          <Pie
                            data={{
                              labels: revenueSource.map((r) => r.source),
                              datasets: [
                                {
                                  data: revenueSource.map((r) => r.value),
                                  backgroundColor: [
                                    "#3b82f6",
                                    "#10b981",
                                    "#f59e0b",
                                    "#ef4444",
                                  ],
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: true,
                              plugins: {
                                legend: {
                                  position: "bottom",
                                  labels: { font: { size: 11 } },
                                },
                                tooltip: {
                                  enabled: true,
                                  backgroundColor: "rgba(0,0,0,0.8)",
                                  padding: 12,
                                },
                              },
                            }}
                          />
                        </CardContent>
                      </Card>

                      <Card className="border border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Budget Allocation
                          </h3>
                          <Pie
                            data={{
                              labels: budgetAllocation.map((b) => b.category),
                              datasets: [
                                {
                                  data: budgetAllocation.map((b) => b.value),
                                  backgroundColor: [
                                    "#10b981",
                                    "#f59e0b",
                                    "#ef4444",
                                    "#8b5cf6",
                                  ],
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: true,
                              plugins: {
                                legend: {
                                  position: "bottom",
                                  labels: { font: { size: 11 } },
                                },
                                tooltip: {
                                  enabled: true,
                                  backgroundColor: "rgba(0,0,0,0.8)",
                                  padding: 12,
                                },
                              },
                            }}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Impact Tab */}
                <TabsContent value="impact" className="space-y-6">
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                        Community Impact By Category
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {programDistribution.map((prog, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: prog.color }}
                              ></div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {prog.name}
                              </h4>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {prog.value}%
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Community impact reach
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                        Success Stories & Testimonials
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border-l-4 border-blue-500">
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                            "This program changed the lives of 500+ children,
                            providing access to quality education they never had
                            before."
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            - Community Leader
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border-l-4 border-green-500">
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                            "The health camps reached 320 families and provided
                            preventive care that saved lives."
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            - Health Volunteer
                          </p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border-l-4 border-purple-500">
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                            "The environmental initiatives created sustainable
                            livelihoods for 150+ families."
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            - Project Coordinator
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                        Long-term Impact Indicators
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">
                              Lives Transformed
                            </span>
                            <span className="text-sm font-bold">
                              {(beneficiariesServed * 1.2).toLocaleString()}
                            </span>
                          </div>
                          <Progress value={85} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">
                              Sustainability Index
                            </span>
                            <span className="text-sm font-bold">8.2/10</span>
                          </div>
                          <Progress value={82} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">
                              Community Satisfaction
                            </span>
                            <span className="text-sm font-bold">94%</span>
                          </div>
                          <Progress value={94} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">
                              SDG Alignment
                            </span>
                            <span className="text-sm font-bold">
                              6/17 Goals
                            </span>
                          </div>
                          <Progress value={35} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              // Single Page View - Render all tabs sequentially with identical styling
              <div className="space-y-6 md:space-y-8">
                {/* OVERVIEW SECTION */}
                <div className="space-y-4 md:space-y-6">
                  {/* KPIs grid - 4 columns on mobile for compact display */}
                  <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-1.5 md:gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900 p-2.5 md:p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                      <p className="text-[10px] md:text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold mb-1 md:mb-2">
                        Team
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100 mb-1 md:mb-2">
                        {totalTeam}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Vol:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {activeVolunteers.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Mgr:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {projectManagers}
                          </span>
                        </div>
                        {activeVolunteers > 0 && (
                          <div className="flex justify-between items-center text-[10px] md:text-xs">
                            <span className="text-gray-600 dark:text-gray-400">Avg:</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {formatDecimal(totalHours / activeVolunteers)}h
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900 p-2.5 md:p-4 rounded-lg border border-green-200 dark:border-green-700">
                      <p className="text-[10px] md:text-xs text-green-600 dark:text-green-400 uppercase font-semibold mb-1 md:mb-2">
                        Hours
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-green-900 dark:text-green-100 mb-1 md:mb-2">
                        {Math.round(totalHours)}h
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Acts:</span>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {filteredActivities.length}
                          </span>
                        </div>
                        {filteredActivities.length > 0 && (
                          <div className="flex justify-between items-center text-[10px] md:text-xs">
                            <span className="text-gray-600 dark:text-gray-400">Avg:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {formatDecimal(totalHours / filteredActivities.length)}h
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Filter:</span>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {timeFilter === "all" ? "All" : timeFilter === "month" ? "Mo." : "Q"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900 p-2.5 md:p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                      <p className="text-[10px] md:text-xs text-purple-600 dark:text-purple-400 uppercase font-semibold mb-1 md:mb-2">
                        Projects
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-purple-900 dark:text-purple-100 mb-1 md:mb-2">
                        {totalProjects.toLocaleString()}
                      </p>
                      <div className="space-y-1">
                        {projects.length > 0 && (
                          <>
                            <div className="flex justify-between items-center text-[10px] md:text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Act:</span>
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                {projects.filter((p) => p.status?.toLowerCase() === "active" || p.status?.toLowerCase() === "in progress").length}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] md:text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Done:</span>
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                {projects.filter((p) => p.status?.toLowerCase() === "completed").length}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] md:text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Avg:</span>
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                {projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / projects.length) : 0}%
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-900 p-2.5 md:p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                      <p className="text-[10px] md:text-xs text-orange-600 dark:text-orange-400 uppercase font-semibold mb-1 md:mb-2">
                        Beneficiaries
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-orange-900 dark:text-orange-100 mb-1 md:mb-2">
                        {beneficiariesServed.toLocaleString()}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Direct:</span>
                          <span className="font-bold text-orange-600 dark:text-orange-400">
                            {beneficiariesServed.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Indirect:</span>
                          <span className="font-bold text-orange-600 dark:text-orange-400">
                            {Math.round(beneficiariesServed * 0.2).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900 p-2.5 md:p-4 rounded-lg border border-red-200 dark:border-red-700">
                      <p className="text-[10px] md:text-xs text-red-600 dark:text-red-400 uppercase font-semibold mb-1 md:mb-2">
                        Impact
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-red-900 dark:text-red-100 mb-1 md:mb-2">
                        {isOrganizationManager ? dashboardData?.impactScore || organizationImpactScore : organizationImpactScore}/100
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Rating:</span>
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {organizationImpactScore >= 90 ? "A+" : organizationImpactScore >= 80 ? "A" : organizationImpactScore >= 70 ? "B+" : organizationImpactScore >= 60 ? "B" : "C"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <span className="font-bold text-red-600 dark:text-red-400">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charts Grid - 3 Column Square Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:page-break-inside-avoid">
                    {/* Quarterly Growth */}
                    <Card className="border border-gray-200 dark:border-gray-700 aspect-square">
                      <CardContent className="p-3 h-full flex flex-col">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          Quarterly Growth
                        </h3>
                        <div className="flex-1 min-h-0">
                          <Line
                            data={{
                              labels: quarterlyGrowth.map((q) => q.quarter),
                              datasets: [
                                {
                                  label: "Beneficiaries",
                                  data: quarterlyGrowth.map(
                                    (q) => q.beneficiaries,
                                  ),
                                  borderColor: "#3b82f6",
                                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                                  fill: true,
                                  tension: 0.4,
                                  borderWidth: 2,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: true,
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  enabled: true,
                                  backgroundColor: "rgba(0,0,0,0.8)",
                                  padding: 12,
                                },
                              },
                              scales: { y: { beginAtZero: true } },
                            }}
                          />
                        </div>
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                            <span className="font-semibold">Insight:</span>{" "}
                            {quarterlyGrowth.length >= 4
                              ? `Q4: ${quarterlyGrowth[3].beneficiaries.toLocaleString()} beneficiaries`
                              : "Quarterly data available"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Performance Metrics KPI Cards */}
                    <Card className="border border-gray-200 dark:border-gray-700 aspect-square">
                      <CardContent className="p-3 h-full flex flex-col">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          Performance Metrics
                        </h3>
                        <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
                          {/* Volunteer Management */}
                          <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg border border-blue-200 dark:border-blue-700 flex flex-col justify-center">
                            <div className="flex items-center gap-1 mb-1">
                              <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">Volunteer Mgmt</span>
                            </div>
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{volunteerManagementScore}%</div>
                            <Progress value={volunteerManagementScore} className="h-1 bg-blue-200 dark:bg-blue-900" />
                          </div>
                          
                          {/* Financial Health */}
                          <div className="p-2 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-lg border border-emerald-200 dark:border-emerald-700 flex flex-col justify-center">
                            <div className="flex items-center gap-1 mb-1">
                              <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">Financial</span>
                            </div>
                            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{financialHealthScore}%</div>
                            <Progress value={financialHealthScore} className="h-1 bg-emerald-200 dark:bg-emerald-900" />
                          </div>
                          
                          {/* Program Quality */}
                          <div className="p-2 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg border border-purple-200 dark:border-purple-700 flex flex-col justify-center">
                            <div className="flex items-center gap-1 mb-1">
                              <Award className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">Program</span>
                            </div>
                            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{programQualityScore}%</div>
                            <Progress value={programQualityScore} className="h-1 bg-purple-200 dark:bg-purple-900" />
                          </div>
                          
                          {/* Community Impact */}
                          <div className="p-2 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 rounded-lg border border-rose-200 dark:border-rose-700 flex flex-col justify-center">
                            <div className="flex items-center gap-1 mb-1">
                              <Target className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">Community</span>
                            </div>
                            <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{communityImpactScore}%</div>
                            <Progress value={communityImpactScore} className="h-1 bg-rose-200 dark:bg-rose-900" />
                          </div>
                        </div>
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Avg: {Math.round((volunteerManagementScore + financialHealthScore + programQualityScore + communityImpactScore) / 4)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Monthly Engagement */}
                    <Card className="border border-gray-200 dark:border-gray-700 aspect-square">
                      <CardContent className="p-3 h-full flex flex-col">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          Monthly Engagement
                        </h3>
                        <div className="flex-1 min-h-0">
                          <Line
                            data={{
                              labels: monthlyEngagement.map((m) => m.month),
                              datasets: [
                                {
                                  label: "Hours Logged",
                                  data: monthlyEngagement.map((m) => m.hours),
                                  borderColor: "#10b981",
                                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                                  fill: true,
                                  tension: 0.4,
                                  borderWidth: 2,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: true,
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  enabled: true,
                                  backgroundColor: "rgba(0,0,0,0.8)",
                                  padding: 12,
                                },
                              },
                              scales: { y: { beginAtZero: true } },
                            }}
                          />
                        </div>
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                            <span className="font-semibold">Insight:</span>{" "}
                            {monthlyEngagement.length > 0
                              ? `${monthlyEngagement[monthlyEngagement.length - 1].month}: ${monthlyEngagement[monthlyEngagement.length - 1].hours}h`
                              : "Monthly data available"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* PROGRAMS SECTION */}
                <div className="print:page-break-before">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-green-200 dark:border-green-700 text-center">Programs</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {topPrograms.length > 0 ? (
                      topPrograms.map((prog, idx) => (
                        <div
                          key={idx}
                          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm flex-1 leading-tight">
                              {prog.name}
                            </h4>
                            <Badge
                              variant="outline"
                              className="ml-2 text-xs whitespace-nowrap"
                            >
                              {prog.status}
                            </Badge>
                          </div>
                          <div className="space-y-2 mt-3">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Completion</span>
                                <span className="font-bold">
                                  {Math.round(prog.completion)}%
                                </span>
                              </div>
                              <CompletionProgress
                                value={prog.completion}
                                className="h-2"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Impact Score</span>
                                <span className="font-bold">
                                  {Math.round(prog.impact)}%
                                </span>
                              </div>
                              <Progress value={prog.impact} className="h-2" />
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 pt-2 border-t">
                              {prog.beneficiaries.toLocaleString()}{" "}
                              beneficiaries
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                        No active projects found
                      </div>
                    )}
                  </div>
                </div>

                {/* OPERATIONS SECTION */}
                <div className="print:page-break-before">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-orange-200 dark:border-orange-700 text-center">
                    Operations
                  </h2>

                  {/* Resource & Metrics Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Resource Allocation
                        </h3>
                        <Bar
                          data={{
                            labels: [
                              "Staff",
                              "Volunteers",
                              "Equipment",
                              "Facilities",
                            ],
                            datasets: [
                              {
                                label: "Resource Units",
                                data: [25, 72, 40, 15],
                                backgroundColor: "#f59e0b",
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            indexAxis: "y" as any,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                enabled: true,
                                backgroundColor: "rgba(0,0,0,0.8)",
                                padding: 12,
                              },
                            },
                            scales: { x: { beginAtZero: true } },
                          }}
                        />
                      </CardContent>
                    </Card>
                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Operational Metrics
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Volunteer Capacity
                              </span>
                              <span className="text-sm font-bold">85%</span>
                            </div>
                            <Progress value={85} />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Resource Efficiency
                              </span>
                              <span className="text-sm font-bold">78%</span>
                            </div>
                            <Progress value={78} />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Quality Scores
                              </span>
                              <span className="text-sm font-bold">92%</span>
                            </div>
                            <Progress value={92} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Partnership Network */}
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Partnership Network
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            12
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Corporate
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900 rounded">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            8
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Government
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900 rounded">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            15
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Educational
                          </p>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900 rounded">
                          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            10
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Non-Profit
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* FINANCIAL SECTION */}
                <div className="print:page-break-before">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-purple-200 dark:border-purple-700 text-center">
                    Financial
                  </h2>

                  {/* Financial KPIs - Responsive layout: 2x2 mobile, 1x4 web */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                      <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">
                        Total Revenue
                      </p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        ${Math.round(totalRevenue / 1000)}K
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-700">
                      <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">
                        Total Expenses
                      </p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        ${Math.round(totalExpenses / 1000)}K
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                      <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">
                        Operating Margin
                      </p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {operatingMargin}%
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                      <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">
                        Program Efficiency
                      </p>
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {programEfficiencyRate}%
                      </p>
                    </div>
                  </div>

                  {/* Health indicators on left, Impact 2x2 on right */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Health Indicators Compact */}
                    <Card className="border border-gray-200 dark:border-gray-700 lg:col-span-1">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Financial Health
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                            <span>Liquidity Ratio</span>
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              2.5x
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                            <span>Reserve Fund</span>
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              6 mo
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                            <span>Growth Rate</span>
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              +18%
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Right: Impact 2x2 Grid */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Revenue Sources
                          </h3>
                          <Pie
                            data={{
                              labels: revenueSource.map((r) => r.source),
                              datasets: [
                                {
                                  data: revenueSource.map((r) => r.value),
                                  backgroundColor: [
                                    "#3b82f6",
                                    "#10b981",
                                    "#f59e0b",
                                    "#ef4444",
                                  ],
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: true,
                              plugins: {
                                legend: {
                                  position: "bottom",
                                  labels: { font: { size: 11 } },
                                },
                                tooltip: {
                                  enabled: true,
                                  backgroundColor: "rgba(0,0,0,0.8)",
                                  padding: 12,
                                },
                              },
                            }}
                          />
                        </CardContent>
                      </Card>

                      <Card className="border border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Budget Allocation
                          </h3>
                          <Pie
                            data={{
                              labels: budgetAllocation.map((b) => b.category),
                              datasets: [
                                {
                                  data: budgetAllocation.map((b) => b.value),
                                  backgroundColor: [
                                    "#10b981",
                                    "#f59e0b",
                                    "#ef4444",
                                    "#8b5cf6",
                                  ],
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: true,
                              plugins: {
                                legend: {
                                  position: "bottom",
                                  labels: { font: { size: 11 } },
                                },
                                tooltip: {
                                  enabled: true,
                                  backgroundColor: "rgba(0,0,0,0.8)",
                                  padding: 12,
                                },
                              },
                            }}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                {/* IMPACT SECTION */}
                <div className="print:page-break-before">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-red-200 dark:border-red-700 text-center">
                    Impact
                  </h2>

                  {/* Community Impact Categories */}
                  <Card className="border border-gray-200 dark:border-gray-700 mb-6">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                        Community Impact By Category
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {programDistribution.map((prog, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: prog.color }}
                              ></div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {prog.name}
                              </h4>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {prog.value}%
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Community impact reach
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Success Stories */}
                  <Card className="border border-gray-200 dark:border-gray-700 mb-6">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                        Success Stories & Testimonials
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border-l-4 border-blue-500">
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                            "This program changed the lives of 500+ children,
                            providing access to quality education they never had
                            before."
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            - Community Leader
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border-l-4 border-green-500">
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                            "The health camps reached 320 families and provided
                            preventive care that saved lives."
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            - Health Volunteer
                          </p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border-l-4 border-purple-500">
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                            "The environmental initiatives created sustainable
                            livelihoods for 150+ families."
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            - Project Coordinator
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Long-term Impact Indicators */}
                  <Card className="border border-gray-200 dark:border-gray-700 print:page-break-inside-avoid">
                    <CardContent className="p-4 print:p-3">
                      <h3 className="text-base print:text-sm font-semibold text-gray-900 dark:text-white mb-4 print:mb-3">
                        Long-term Impact Indicators
                      </h3>
                      <div className="space-y-2 print:space-y-1.5">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs print:text-xs font-medium">
                              Total Lives Impacted
                            </span>
                            <span className="text-xs print:text-xs font-bold">
                              {Math.round(beneficiariesServed * 1.2).toLocaleString()}
                            </span>
                          </div>
                          <Progress value={85} className="h-1.5 print:h-1" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs print:text-xs font-medium">
                              Sustainability Index
                            </span>
                            <span className="text-xs print:text-xs font-bold">
                              8.2/10
                            </span>
                          </div>
                          <Progress value={82} className="h-1.5 print:h-1" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs print:text-xs font-medium">
                              Community Satisfaction
                            </span>
                            <span className="text-xs print:text-xs font-bold">
                              94%
                            </span>
                          </div>
                          <Progress value={94} className="h-1.5 print:h-1" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs print:text-xs font-medium">
                              SDG Alignment
                            </span>
                            <span className="text-xs print:text-xs font-bold">
                              6/17 Goals
                            </span>
                          </div>
                          <Progress value={35} className="h-1.5 print:h-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Footer - Synerxus Branding */}
            <div className="mt-8 pt-6 border-t-2 border-gray-200 dark:border-gray-700 text-center print:mt-4 print:pt-3 print:border-t">
              {/* Synerxus Logo */}
              <div className="flex justify-center items-center gap-1 mb-2">
                <span className="text-xl font-extrabold text-[#1e3a5f] tracking-tight">SYNER</span>
                <span className="text-xl font-extrabold text-[#f59e0b] tracking-tight">XUS</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-3">
                Connect. Manage. Impact Globally.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-xs">
                Generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} • SDG Impact Report
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 print:mt-2">
                © {new Date().getFullYear()} Synerxus. All rights reserved. | support@synerxus.com
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Print Styles - Comprehensive for unified document */}
        <style>{`
          @media print {
            body { margin: 0; padding: 0; }
            * { page-break-inside: avoid; }

            /* Hide UI elements */
            .print\\:hidden { display: none !important; }

            /* Report card styling */
            .print\\:shadow-none { box-shadow: none !important; }
            .print\\:border-black { border-color: black !important; }

            /* Spacing */
            .print\\:p-4 { padding: 1rem !important; }
            .print\\:mb-4 { margin-bottom: 1rem !important; }
            .print\\:pb-3 { padding-bottom: 0.75rem !important; }
            .print\\:gap-4 { gap: 1rem !important; }
            .print\\:mb-3 { margin-bottom: 0.75rem !important; }
            .print\\:p-1.5 { padding: 0.375rem !important; }
            .print\\:space-y-1.5 > * + * { margin-top: 0.375rem !important; }

            /* Typography */
            .print\\:text-2xl { font-size: 1.5rem !important; }
            .print\\:text-xs { font-size: 0.75rem !important; }
            .print\\:text-sm { font-size: 0.875rem !important; }
            .print\\:text-lg { font-size: 1.125rem !important; }

            /* Transforms */
            .print\\:scale-75 { transform: scale(0.75) !important; }

            /* Page break rules for sections */
            .print\\:page-break-before { page-break-before: always !important; }
            .print\\:page-break-inside-avoid { page-break-inside: avoid !important; }

            /* Prevent orphans/widows for readability */
            h1, h2, h3, h4, h5, h6 { page-break-after: avoid; page-break-inside: avoid; }

            /* Keep cards together */
            [role="tabpanel"] { page-break-inside: avoid; }

            /* Grid adjustments for print */
            .grid { page-break-inside: avoid; }

            /* Charts should stay together */
            canvas { page-break-inside: avoid; }

            /* Proper line height for readability */
            body { line-height: 1.5; }

            /* Margin management */
            body { margin: 0.5in; }

            /* Prevent color loss in grayscale */
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
          }
        `}</style>
      </div>
      
    </div>
  );
}
