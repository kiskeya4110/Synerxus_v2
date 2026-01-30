import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { formatDecimal } from "@/lib/format-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CompletionProgress } from "@/components/ui/completion-progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/components/layout/theme-provider";
import OrganizationNav from "@/components/layout/organization-nav";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import MobileMetricsGrid from "@/components/layout/mobile-metrics-grid";
import OfflineBanner from "@/components/layout/offline-banner";
import Footer from "@/components/layout/footer";
import PWAHeader from "@/components/pwa/pwa-header";
import VolunteerPWANav from "@/components/layout/volunteer-pwa-nav";
import { useViewportDetection } from "@/hooks/use-mobile";
import { Loader2, BarChart, ExternalLink, Filter, FolderOpen, CheckCircle2, Target, TrendingUp, Sparkles, AlertCircle, Users, Clock, Globe, Award, FileBarChart, ChevronRight } from "lucide-react";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";
import StatsCard from "@/components/dashboard/stats-card";
import { getSDGName, getSDGColor, suggestSDGsFromText, SDG_GOALS } from "@shared/sdg-goals";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Radar, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

// SDG metadata (titles, descriptions)
const SDG_METADATA: Record<number, { title: string; description: string }> = {
  1: { title: "No Poverty", description: "End poverty in all its forms everywhere" },
  2: { title: "Zero Hunger", description: "End hunger, achieve food security and improved nutrition" },
  3: { title: "Good Health and Well-being", description: "Ensure healthy lives and promote well-being for all" },
  4: { title: "Quality Education", description: "Ensure inclusive and equitable quality education" },
  5: { title: "Gender Equality", description: "Achieve gender equality and empower all women and girls" },
  6: { title: "Clean Water and Sanitation", description: "Ensure availability and sustainable management of water" },
  7: { title: "Affordable and Clean Energy", description: "Ensure access to affordable, reliable, sustainable energy" },
  8: { title: "Decent Work and Economic Growth", description: "Promote sustained, inclusive economic growth and employment" },
  9: { title: "Industry, Innovation and Infrastructure", description: "Build resilient infrastructure and promote innovation" },
  10: { title: "Reduced Inequalities", description: "Reduce inequality within and among countries" },
  11: { title: "Sustainable Cities and Communities", description: "Make cities and human settlements inclusive and sustainable" },
  12: { title: "Responsible Consumption and Production", description: "Ensure sustainable consumption and production patterns" },
  13: { title: "Climate Action", description: "Take urgent action to combat climate change" },
  14: { title: "Life Below Water", description: "Conserve and sustainably use the oceans, seas and marine resources" },
  15: { title: "Life on Land", description: "Protect, restore and promote sustainable use of terrestrial ecosystems" },
  16: { title: "Peace, Justice and Strong Institutions", description: "Promote peaceful and inclusive societies for sustainable development" },
  17: { title: "Partnerships for the Goals", description: "Strengthen the means of implementation and revitalize global partnerships" },
};

export default function SDGMapping() {
  const { theme } = useTheme();
  const { toast } = useToast();
  const { isMobile, isLoading: isViewportLoading } = useViewportDetection();
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [statsDialogData, setStatsDialogData] = useState<{ title: string; items: any[] } | null>(null);
  const [, navigate] = useLocation();
  
  // New state for SDG alignment tool
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedGoalForConnection, setSelectedGoalForConnection] = useState<number[]>([]);
  const [recommendedSDGs, setRecommendedSDGs] = useState<number[]>([]);
  
  
  // Fetch current user to get organization ID
  const userId = localStorage.getItem('currentUserId');
  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) throw new Error("No user ID found");
      const response = await fetch(`/api/users/me?userId=${id}`);
      if (!response.ok) throw new Error("User not found");
      return response.json();
    },
    enabled: !!userId
  });
  
  // Fetch organization profile to get their selected SDGs
  const { data: orgProfile } = useQuery({
    queryKey: ["/api/profile/organization", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const response = await fetch(`/api/profile/organization?userId=${id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser && currentUser.userType === 'organization'
  });
  
  // Fetch organization-scoped projects
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["/api/projects", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const response = await fetch(`/api/projects?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser && !!userId
  });

  // Fetch organization dashboard data for accurate volunteer/hours metrics
  const { data: dashboardData } = useQuery<any>({
    queryKey: ["/api/organization/dashboard", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const response = await fetch(`/api/organization/dashboard?userId=${id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser && currentUser.userType === 'organization'
  });

  // Fetch project impacts
  const { data: projectImpacts = [], isLoading: loadingImpacts } = useQuery({
    queryKey: ["/api/project-impacts"],
  });
  
  // Use scoped data from queries
  const organizationProjects = projects;
  
  // Filter projects based on selectedProjectFilter
  const filteredProjects = useMemo(() => {
    if (!organizationProjects || organizationProjects.length === 0) return [];
    if (selectedProjectFilter === "all") {
      return organizationProjects;
    }
    return organizationProjects.filter((p: any) => p.id.toString() === selectedProjectFilter);
  }, [organizationProjects, selectedProjectFilter]);
  
  // Fetch impact metrics
  const { data: impactMetrics = [], isLoading: loadingMetrics } = useQuery({
    queryKey: ["/api/impact-metrics"],
  });
  
  // Get organization's selected SDGs from their Settings
  const organizationSDGs = useMemo(() => {
    // Check organizationProfile first (most likely location for SDG settings)
    if (orgProfile?.organizationProfile?.primarySdgs && orgProfile.organizationProfile.primarySdgs.length > 0) {
      return orgProfile.organizationProfile.primarySdgs;
    }
    // Then try organization table
    if (orgProfile?.organization?.primarySdgs && orgProfile.organization.primarySdgs.length > 0) {
      return orgProfile.organization.primarySdgs;
    }
    // Finally fallback to matchableOrganization (uses sdgFocus field name)
    if (orgProfile?.matchableOrganization?.sdgFocus && orgProfile.matchableOrganization.sdgFocus.length > 0) {
      return orgProfile.matchableOrganization.sdgFocus;
    }
    return [];
  }, [orgProfile]);
  
  // Calculate SDG data from real projects
  const sdgData = useMemo(() => {
    const sdgMap = new Map<number, {
      id: number;
      title: string;
      description: string;
      color: string;
      projectCount: number;
      avgCompletion: number;
      impactMetrics: any[];
    }>();

    // Initialize ONLY organization's selected SDGs from Settings
    const sdgsToShow = organizationSDGs.length > 0 ? organizationSDGs : [];

    // If organization hasn't selected SDGs yet, show empty state
    if (sdgsToShow.length === 0) {
      return [];
    }

    sdgsToShow.forEach((sdgId: number) => {
      const metadata = SDG_METADATA[sdgId] || { title: `SDG ${sdgId}`, description: "" };
      sdgMap.set(sdgId, {
        id: sdgId,
        title: metadata.title,
        description: metadata.description,
        color: getSDGColor(sdgId),
        projectCount: 0,
        avgCompletion: 0,
        impactMetrics: []
      });
    });

    // Create a Set of filtered project IDs for filtering
    const orgProjectIds = new Set(filteredProjects.map((p: any) => p.id));

    // Count projects per SDG and calculate average completion (using filtered projects)
    const sdgCompletions = new Map<number, number[]>();
    filteredProjects.forEach((project: any) => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        project.sdgGoals.forEach((sdg: number) => {
          const existing = sdgMap.get(sdg);
          if (existing) {
            existing.projectCount++;
            // Track completion for average calculation
            if (!sdgCompletions.has(sdg)) {
              sdgCompletions.set(sdg, []);
            }
            const completionsArr = sdgCompletions.get(sdg);
            if (completionsArr) {
              completionsArr.push(project.completionPercentage || 0);
            }
          }
        });
      }
    });

    // Calculate average completion for each SDG
    sdgCompletions.forEach((completions, sdgId) => {
      const existing = sdgMap.get(sdgId);
      if (existing && completions.length > 0) {
        existing.avgCompletion = Math.round(completions.reduce((a, b) => a + b, 0) / completions.length);
      }
    });
    
    // Filter project impacts to only include impacts from organization's projects
    const orgProjectImpacts = (projectImpacts as any[]).filter((pi: any) => 
      orgProjectIds.has(pi.projectId)
    );
    
    // Add impact metrics for each SDG (only from organization's projects)
    (impactMetrics as any[]).forEach((metric: any) => {
      if (metric.sdgGoal) {
        const existing = sdgMap.get(metric.sdgGoal);
        if (existing) {
          // Find all impacts for this metric from organization's projects only
          const metricsImpacts = orgProjectImpacts.filter((pi: any) => pi.metricId === metric.id);
          const totalValue = metricsImpacts.reduce((sum: number, pi: any) => sum + (pi.value || 0), 0);
          
          // Only add metric if there's actual data
          if (totalValue > 0) {
            existing.impactMetrics.push({
              name: metric.name,
              value: totalValue,
              unit: metric.unit || "units",
              metricId: metric.id
            });
          }
        }
      }
    });
    
    return Array.from(sdgMap.values()).sort((a, b) => a.id - b.id);
  }, [filteredProjects, impactMetrics, projectImpacts, organizationSDGs]);
  
  // Auto-select first SDG if none selected and data is available
  const effectiveSelectedSDG = selectedSDG ?? (sdgData.length > 0 ? sdgData[0].id : null);
  
  // Compute AI recommendations when project is selected
  useEffect(() => {
    if (selectedProjectId && organizationProjects && organizationProjects.length > 0) {
      const project = organizationProjects.find((p: any) => p.id.toString() === selectedProjectId);
      if (project) {
        const projectText = `${project.name} ${project.description || ""}`;
        const suggestions = suggestSDGsFromText(projectText);
        setRecommendedSDGs(suggestions);
        
        // Pre-select recommended SDGs
        setSelectedGoalForConnection(suggestions.length > 0 ? [suggestions[0]] : []);
      }
    } else {
      setRecommendedSDGs([]);
      setSelectedGoalForConnection([]);
    }
  }, [selectedProjectId]);
  
  // Mutation to update project SDGs
  const updateProjectSDGs = useMutation({
    mutationFn: async ({ projectId, sdgGoals }: { projectId: number; sdgGoals: number[] }) => {
      return await apiRequest('PATCH', `/api/projects/${projectId}`, { sdgGoals });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project SDG alignment updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-impacts"] });
      setSelectedProjectId("");
      setSelectedGoalForConnection([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project SDG alignment",
        variant: "destructive",
      });
    }
  });
  
  // Handle connect button click
  const handleConnectSDG = () => {
    if (!selectedProjectId) {
      toast({
        title: "No Project Selected",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedGoalForConnection.length === 0) {
      toast({
        title: "No SDG Selected",
        description: "Please select at least one SDG goal",
        variant: "destructive",
      });
      return;
    }
    
    const project = organizationProjects.find((p: any) => p.id.toString() === selectedProjectId);
    if (project) {
      // Merge with existing SDGs
      const existingSDGs = project.sdgGoals || [];
      const uniqueSDGSet = new Set([...existingSDGs, ...selectedGoalForConnection]);
      const newSDGs = Array.from(uniqueSDGSet);
      updateProjectSDGs.mutate({ projectId: project.id, sdgGoals: newSDGs });
    }
  };

  // Handle statistics card click
  const handleStatsClick = (title: string) => {
    let items: any[] = [];
    
    switch (title) {
      case "Total Projects":
        items = filteredProjects.map((p: any) => ({
          label: p.name,
          value: p.status || "No Status",
          completion: p.completionPercentage || 0
        }));
        break;
      case "Completed Projects":
        items = filteredProjects
          .filter((p: any) => p.status?.toLowerCase() === 'completed')
          .map((p: any) => ({
            label: p.name,
            value: `${p.completionPercentage || 0}% complete`
          }));
        break;
      case "Active Projects":
        items = filteredProjects
          .filter((p: any) => 
            p.status?.toLowerCase() === 'active' || p.status?.toLowerCase() === 'in progress'
          )
          .map((p: any) => ({
            label: p.name,
            value: `${p.completionPercentage || 0}% complete`
          }));
        break;
      case "Avg. Completion":
        items = filteredProjects.map((p: any) => ({
          label: p.name,
          value: `${p.completionPercentage || 0}%`
        }));
        break;
    }
    
    setStatsDialogData({ title, items });
    setStatsDialogOpen(true);
  };

  const selectedData = effectiveSelectedSDG ? sdgData.find(sdg => sdg.id === effectiveSelectedSDG) : null;
  const relatedProjects = effectiveSelectedSDG ? filteredProjects.filter((project: any) => 
    project.sdgGoals && Array.isArray(project.sdgGoals) && project.sdgGoals.includes(effectiveSelectedSDG)
  ) : [];
  
  // Chart data: Compare organization's selected SDGs vs actual project distribution
  // Adapts to use Bar chart for 1-2 SDGs, Radar for 3+ SDGs
  const chartData = useMemo(() => {
    if (organizationSDGs.length === 0) return null;

    // Calculate project distribution across SDGs
    const projectDistribution = new Map<number, number>();
    organizationSDGs.forEach((sdgId: number) => {
      projectDistribution.set(sdgId, 0);
    });

    // Count projects per SDG (1 per each, using filtered projects)
    filteredProjects.forEach((project: any) => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        project.sdgGoals.forEach((sdg: number) => {
          if (projectDistribution.has(sdg)) {
            projectDistribution.set(sdg, (projectDistribution.get(sdg) || 0) + 1);
          }
        });
      }
    });

    // Find max for baseline reference (keeping selectedData at this max)
    const maxProjects = Math.max(...Array.from(projectDistribution.values()), 1);

    const labels = organizationSDGs.map((sdgId: number) => {
      const metadata = SDG_METADATA[sdgId];
      return metadata ? metadata.title : `SDG ${sdgId}`;
    });

    // Get SDG colors for bar charts
    const sdgColors = organizationSDGs.map((sdgId: number) => getSDGColor(sdgId));

    // Actual project distribution counts (raw numbers for bar chart)
    const actualCounts = organizationSDGs.map((sdgId: number) => {
      return projectDistribution.get(sdgId) || 0;
    });

    // For radar chart, apply log transformation for better visibility
    const selectedDataLog = organizationSDGs.map(() => Math.log10(maxProjects + 1));
    const actualDataLog = organizationSDGs.map((sdgId: number) => {
      const count = projectDistribution.get(sdgId) || 0;
      return Math.log10(count + 1);
    });

    const sdgCount = organizationSDGs.length;

    // Bar chart data for 1-2 SDGs
    if (sdgCount <= 2) {
      return {
        type: 'bar' as const,
        sdgCount,
        labels,
        datasets: [
          {
            label: 'Focus Target',
            data: organizationSDGs.map(() => maxProjects),
            backgroundColor: sdgColors.map((c: string) => `${c}40`), // 25% opacity
            borderColor: sdgColors,
            borderWidth: 2,
            borderRadius: 8,
            barPercentage: sdgCount === 1 ? 0.5 : 0.8,
            categoryPercentage: sdgCount === 1 ? 0.6 : 0.9,
          },
          {
            label: 'Actual Projects',
            data: actualCounts,
            backgroundColor: sdgColors,
            borderColor: sdgColors.map((c: string) => `${c}cc`),
            borderWidth: 2,
            borderRadius: 8,
            barPercentage: sdgCount === 1 ? 0.5 : 0.8,
            categoryPercentage: sdgCount === 1 ? 0.6 : 0.9,
          },
        ],
      };
    }

    // Radar chart data for 3+ SDGs
    return {
      type: 'radar' as const,
      sdgCount,
      labels,
      datasets: [
        {
          label: 'Selected SDG Focus Areas (Settings)',
          data: selectedDataLog,
          backgroundColor: 'rgba(30, 58, 138, 0.2)', // SYNER blue with transparency
          borderColor: '#1e3a8a', // SYNER blue
          borderWidth: 2,
          pointBackgroundColor: '#1e3a8a',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#1e3a8a',
        },
        {
          label: 'Actual Project Distribution',
          data: actualDataLog,
          backgroundColor: 'rgba(180, 83, 9, 0.2)', // XUS orange-gold with transparency
          borderColor: '#b45309', // XUS orange-gold
          borderWidth: 2,
          pointBackgroundColor: '#b45309',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#b45309',
        },
      ],
    };
  }, [organizationSDGs, filteredProjects]);
  
  const isLoading = loadingUser || loadingProjects || loadingImpacts || loadingMetrics;

  const isOrganization = currentUser?.userType === 'organization';
  // Use localStorage as fallback for PWA layout detection during initial load
  const userType = localStorage.getItem('userType');
  const isOrganizationForLayout = isOrganization || userType === 'organization';

  if (isLoading) {
    if (isOrganizationForLayout && isMobile) {
      return (
        <OrganizationPWALayout activeTab="home">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </OrganizationPWALayout>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state when organization hasn't selected SDGs in Settings
  if (sdgData.length === 0) {
    if (isOrganizationForLayout && isMobile) {
      return (
        <OrganizationPWALayout activeTab="home">
          <div className="p-4">
            <div className="mb-4">
              <h1 className="text-xl font-bold text-stone-900">SDG Mapping</h1>
              <p className="text-sm text-stone-600">
                Connect volunteer activities to Sustainable Development Goals
              </p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
              <BarChart className="h-16 w-16 text-stone-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-stone-900">No SDGs Selected</h3>
              <p className="text-stone-600 text-center max-w-md mx-auto mb-4">
                Please select your organization's primary SDG focus areas in Settings to view SDG mapping and impact tracking.
              </p>
              <Link href="/organization-profile">
                <Button>Go to Settings</Button>
              </Link>
            </div>
          </div>
        </OrganizationPWALayout>
      );
    }
    return (
      <div className="h-screen overflow-y-auto pb-36">
        <OrganizationNav />
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900">SDG Mapping</h1>
            <p className="text-sm sm:text-base text-stone-600">
              Connect volunteer activities to Sustainable Development Goals and track impact
            </p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart className="h-16 w-16 text-stone-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-stone-900">No SDGs Selected</h3>
              <p className="text-stone-600 text-center max-w-md mb-4">
                Please select your organization's primary SDG focus areas in Settings to view SDG mapping and impact tracking.
              </p>
              <Link href="/organization-profile">
                <Button>Go to Settings</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
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

  // Mobile organization PWA view - Enhanced with better KPIs
  if (isOrganizationForLayout && isMobile) {
    // Calculate mobile-specific metrics using project-filtered data
    const activeProjectsCount = filteredProjects.filter((p: any) =>
      p.status?.toLowerCase() === 'active' || p.status?.toLowerCase() === 'in progress'
    ).length;
    const completedProjectsCount = filteredProjects.filter((p: any) =>
      p.status?.toLowerCase() === 'completed'
    ).length;
    const avgCompletion = filteredProjects.length > 0
      ? Math.round(filteredProjects.reduce((sum: number, p: any) => sum + (p.completionPercentage || 0), 0) / filteredProjects.length)
      : 0;

    // Calculate additional impact metrics
    const orgProjectIds = new Set(filteredProjects.map((p: any) => p.id));
    const orgImpacts = (projectImpacts as any[]).filter((pi: any) => orgProjectIds.has(pi.projectId));

    // Check if project filter is applied
    const isFiltered = selectedProjectFilter !== 'all';
    const selectedProjectName = organizationProjects.find((p: any) => p.id.toString() === selectedProjectFilter)?.name || '';

    // When filtered, compute metrics from filteredProjects only; otherwise use dashboard data
    const totalVolunteers = isFiltered
      ? filteredProjects.reduce((sum: number, p: any) => sum + (p.volunteerCount || 0), 0)
      : (dashboardData?.keyMetrics?.activeVolunteers ||
         filteredProjects.reduce((sum: number, p: any) => sum + (p.volunteerCount || 0), 0));
    const totalHours = isFiltered
      ? filteredProjects.reduce((sum: number, p: any) => sum + (p.totalHours || 0), 0)
      : (dashboardData?.keyMetrics?.totalHours ||
         filteredProjects.reduce((sum: number, p: any) => sum + (p.totalHours || 0), 0));
    const totalBeneficiaries = isFiltered
      ? orgImpacts.reduce((sum: number, pi: any) => sum + (pi.value || 0), 0)
      : (dashboardData?.keyMetrics?.peopleImpacted ||
         orgImpacts.reduce((sum: number, pi: any) => sum + (pi.value || 0), 0));

    // SDGs addressed: when filtered by project, count unique SDGs from that project
    const filteredSdgs = new Set<number>();
    filteredProjects.forEach((p: any) => {
      if (p.sdgGoals && Array.isArray(p.sdgGoals)) {
        p.sdgGoals.forEach((sdg: number) => filteredSdgs.add(sdg));
      }
    });
    const sdgsAddressed = isFiltered ? filteredSdgs.size : (dashboardData?.keyMetrics?.sdgsAddressed || organizationSDGs.length);

    // Calculate total AIU from filtered projects or dashboard
    const totalAIU = isFiltered
      ? filteredProjects.reduce((sum: number, p: any) => sum + (p.aiuEarned || p.totalAiu || 0), 0)
      : (dashboardData?.keyMetrics?.aiuEarned ||
         filteredProjects.reduce((sum: number, p: any) => sum + (p.aiuEarned || p.totalAiu || 0), 0));

    // Get projects for the selected SDG detail card (when clicking on an SDG icon)
    const selectedSDGProjects = selectedSDG
      ? filteredProjects.filter((p: any) => p.sdgGoals?.includes(selectedSDG))
      : filteredProjects;

    // Mobile stats dialog handler - uses project-filtered data
    const handleMobileStatsClick = (type: string) => {
      let title = '';
      let items: any[] = [];
      const filterLabel = isFiltered ? ` (${selectedProjectName})` : '';

      switch (type) {
        case 'projects':
          title = `All Projects${filterLabel}`;
          items = filteredProjects.map((p: any) => ({
            label: p.name,
            value: p.status || 'No Status',
            subValue: `${p.completionPercentage || 0}% complete`,
            id: p.id
          }));
          break;
        case 'active':
          title = `Active Projects${filterLabel}`;
          items = filteredProjects
            .filter((p: any) => p.status?.toLowerCase() === 'active' || p.status?.toLowerCase() === 'in progress')
            .map((p: any) => ({
              label: p.name,
              value: `${p.completionPercentage || 0}% complete`,
              subValue: p.location || 'No location',
              id: p.id
            }));
          break;
        case 'completed':
          title = `Completed Projects${filterLabel}`;
          items = filteredProjects
            .filter((p: any) => p.status?.toLowerCase() === 'completed')
            .map((p: any) => ({
              label: p.name,
              value: '100% complete',
              subValue: p.location || 'No location',
              id: p.id
            }));
          break;
        case 'progress':
          title = `Project Progress${filterLabel}`;
          items = filteredProjects
            .sort((a: any, b: any) => (b.completionPercentage || 0) - (a.completionPercentage || 0))
            .map((p: any) => ({
              label: p.name,
              value: `${p.completionPercentage || 0}%`,
              subValue: p.status || 'No Status',
              id: p.id
            }));
          break;
        case 'volunteers':
          title = isFiltered ? `Project Volunteers${filterLabel}` : 'Active Volunteers';
          // When filtered, show project-based volunteer data
          if (isFiltered) {
            items = filteredProjects
              .filter((p: any) => (p.volunteerCount || 0) > 0)
              .sort((a: any, b: any) => (b.volunteerCount || 0) - (a.volunteerCount || 0))
              .map((p: any) => ({
                label: p.name,
                value: `${p.volunteerCount || 0} volunteers`,
                subValue: `${p.totalHours || 0} hours`,
                id: p.id
              }));
          } else if (dashboardData?.volunteerSummaries && dashboardData.volunteerSummaries.length > 0) {
            // Use volunteer summaries from dashboard when not filtered
            items = dashboardData.volunteerSummaries
              .sort((a: any, b: any) => (b.hours || 0) - (a.hours || 0))
              .map((v: any) => ({
                label: v.name || `Volunteer ${v.id}`,
                value: `${v.hours || 0} hours`,
                subValue: `${v.projects || 0} projects`,
                id: v.id
              }));
          } else {
            // Fallback to project-based data
            items = filteredProjects
              .filter((p: any) => (p.volunteerCount || 0) > 0)
              .sort((a: any, b: any) => (b.volunteerCount || 0) - (a.volunteerCount || 0))
              .map((p: any) => ({
                label: p.name,
                value: `${p.volunteerCount || 0} volunteers`,
                subValue: `${p.totalHours || 0} hours`,
                id: p.id
              }));
          }
          break;
        case 'hours':
          title = isFiltered ? `Project Hours${filterLabel}` : 'Hours Breakdown';
          // When filtered, show project-based hours data
          if (isFiltered) {
            items = filteredProjects
              .filter((p: any) => (p.totalHours || 0) > 0)
              .sort((a: any, b: any) => (b.totalHours || 0) - (a.totalHours || 0))
              .map((p: any) => ({
                label: p.name,
                value: `${(p.totalHours || 0).toLocaleString()} hours`,
                subValue: `${p.volunteerCount || 0} volunteers`,
                id: p.id
              }));
          } else if (dashboardData?.volunteerSummaries && dashboardData.volunteerSummaries.length > 0) {
            // Use volunteer summaries for hours breakdown when not filtered
            items = dashboardData.volunteerSummaries
              .filter((v: any) => (v.hours || 0) > 0)
              .sort((a: any, b: any) => (b.hours || 0) - (a.hours || 0))
              .map((v: any) => ({
                label: v.name || `Volunteer ${v.id}`,
                value: `${(v.hours || 0).toLocaleString()} hours`,
                subValue: `${v.projects || 0} projects completed`,
                id: v.id
              }));
          } else {
            // Fallback to project-based data
            items = filteredProjects
              .filter((p: any) => (p.totalHours || 0) > 0)
              .sort((a: any, b: any) => (b.totalHours || 0) - (a.totalHours || 0))
              .map((p: any) => ({
                label: p.name,
                value: `${(p.totalHours || 0).toLocaleString()} hours`,
                subValue: `${p.volunteerCount || 0} volunteers`,
                id: p.id
              }));
          }
          break;
        case 'beneficiaries':
          title = isFiltered ? `Project Beneficiaries${filterLabel}` : 'People Reached by Project';
          const projectImpactMap = new Map<number, number>();
          orgImpacts.forEach((impact: any) => {
            const current = projectImpactMap.get(impact.projectId) || 0;
            projectImpactMap.set(impact.projectId, current + (impact.value || 0));
          });
          items = filteredProjects
            .map((p: any) => ({
              label: p.name,
              value: `${(projectImpactMap.get(p.id) || 0).toLocaleString()} people`,
              subValue: p.sdgGoals?.map((s: number) => `SDG ${s}`).join(', ') || 'No SDGs',
              id: p.id
            }))
            .filter((item: any) => parseInt(item.value) > 0)
            .sort((a: any, b: any) => parseInt(b.value.replace(/,/g, '')) - parseInt(a.value.replace(/,/g, '')));
          break;
        case 'sdgs':
          title = isFiltered ? `Project SDG Coverage${filterLabel}` : 'SDG Coverage';
          // When filtered, show only SDGs from filtered projects
          const sdgsToShow = isFiltered
            ? Array.from(filteredSdgs).sort((a, b) => a - b)
            : organizationSDGs;
          items = sdgsToShow.map((sdgNum: number) => {
            const projectCount = filteredProjects.filter((p: any) => p.sdgGoals?.includes(sdgNum)).length;
            return {
              label: `SDG ${sdgNum}: ${SDG_METADATA[sdgNum]?.title || 'Unknown'}`,
              value: `${projectCount} project${projectCount !== 1 ? 's' : ''}`,
              subValue: SDG_METADATA[sdgNum]?.description || '',
              sdgNum
            };
          });
          break;
        case 'aiu':
          title = isFiltered ? `Project AIU${filterLabel}` : 'AIU Breakdown';
          // When filtered, use filteredProjects; otherwise use dashboard data
          if (isFiltered) {
            items = filteredProjects
              .filter((p: any) => (p.aiuEarned || p.totalAiu || 0) > 0)
              .sort((a: any, b: any) => ((b.aiuEarned || b.totalAiu || 0)) - ((a.aiuEarned || a.totalAiu || 0)))
              .map((p: any) => ({
                label: p.name,
                value: `${(p.aiuEarned || p.totalAiu || 0).toLocaleString()} AIU`,
                subValue: `${p.totalHours || 0} hours • ${p.sdgGoals?.length || 0} SDGs`,
                id: p.id
              }));
            // If no AIU data, show summary
            if (items.length === 0) {
              items = [
                { label: 'Total AIU Earned', value: `${totalAIU.toLocaleString()} AIU`, subValue: 'For filtered project(s)', isHighlight: true },
                { label: 'Volunteer Hours', value: `${totalHours.toLocaleString()} hrs`, subValue: 'Time investment factor' },
                { label: 'SDGs Addressed', value: `${sdgsAddressed} goals`, subValue: 'UN Sustainable Development Goals alignment' },
                { label: 'People Reached', value: `${totalBeneficiaries.toLocaleString()}`, subValue: 'Direct beneficiaries impacted' },
              ];
            }
          } else if (dashboardData?.projects && dashboardData.projects.length > 0) {
            items = dashboardData.projects
              .filter((p: any) => (p.aiuEarned || 0) > 0)
              .sort((a: any, b: any) => (b.aiuEarned || 0) - (a.aiuEarned || 0))
              .map((p: any) => ({
                label: p.name,
                value: `${(p.aiuEarned || 0).toLocaleString()} AIU`,
                subValue: `${p.totalHours || 0} hours • ${p.sdgGoals?.length || 0} SDGs`,
                id: p.id
              }));
            // If no projects have AIU, show factors that contribute to AIU
            if (items.length === 0 && totalAIU > 0) {
              items = [
                { label: 'Total AIU Earned', value: `${totalAIU.toLocaleString()} AIU`, subValue: 'Calculated using proprietary impact formula', isHighlight: true },
                { label: 'Volunteer Hours', value: `${totalHours.toLocaleString()} hrs`, subValue: 'Time investment factor' },
                { label: 'SDGs Addressed', value: `${sdgsAddressed} goals`, subValue: 'UN Sustainable Development Goals alignment' },
                { label: 'People Reached', value: `${totalBeneficiaries.toLocaleString()}`, subValue: 'Direct beneficiaries impacted' },
              ];
            }
          } else {
            // Fallback: Show AIU factors (proprietary formula - don't show fake calculations)
            items = [
              { label: 'Total AIU Earned', value: `${totalAIU.toLocaleString()} AIU`, subValue: 'Calculated using proprietary impact formula', isHighlight: true },
              { label: 'Volunteer Hours', value: `${totalHours.toLocaleString()} hrs`, subValue: 'Time investment factor' },
              { label: 'SDGs Addressed', value: `${sdgsAddressed} goals`, subValue: 'UN Sustainable Development Goals alignment' },
              { label: 'People Reached', value: `${totalBeneficiaries.toLocaleString()}`, subValue: 'Direct beneficiaries impacted' },
            ];
          }
          break;
        case 'impact':
          title = isFiltered ? 'Filtered Impact Summary' : 'Overall Impact Summary';
          items = [
            { label: 'Total Volunteers', value: totalVolunteers.toLocaleString(), subValue: isFiltered ? 'For filtered project(s)' : 'Across all projects' },
            { label: 'Total Hours', value: totalHours.toLocaleString(), subValue: 'Hours contributed' },
            { label: 'People Reached', value: totalBeneficiaries.toLocaleString(), subValue: 'Direct beneficiaries' },
            { label: 'SDGs Addressed', value: `${sdgsAddressed}/17`, subValue: 'UN Goals aligned' },
            { label: 'Total AIU', value: totalAIU.toLocaleString(), subValue: 'Impact units earned' },
          ];
          break;
      }

      setStatsDialogData({ title, items });
      setStatsDialogOpen(true);
    };

    return (
      <OrganizationPWALayout activeTab="home">
        <div className="p-4 pb-36">
          {/* Header with filters */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-stone-900">SDG Mapping</h1>
              <p className="text-xs text-stone-600">Track UN Goals alignment</p>
            </div>
            <div className="flex gap-2">
              {/* Project Filter Dropdown */}
              <Select
                value={selectedProjectFilter}
                onValueChange={setSelectedProjectFilter}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {organizationProjects && organizationProjects.length > 0 ? (
                    organizationProjects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()} className="text-xs">
                        {project.name?.substring(0, 20) || `Project ${project.id}`}{project.name?.length > 20 ? '...' : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled className="text-xs text-gray-400">
                      No projects available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter indicator */}
          {selectedProjectFilter !== 'all' && (
            <div className="flex items-center justify-between mb-3 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">
                  Filtering: {organizationProjects.find((p: any) => p.id.toString() === selectedProjectFilter)?.name || 'Selected Project'}
                </span>
              </div>
              <button
                onClick={() => setSelectedProjectFilter('all')}
                className="text-xs text-blue-600 font-medium hover:text-blue-800"
              >
                Clear
              </button>
            </div>
          )}

          {/* KPI Cards Grid - Enhanced 3x2 with more metrics - All Interactive */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Card
              className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
              onClick={() => handleMobileStatsClick('projects')}
            >
              <CardContent className="p-2.5">
                <div className="flex flex-col items-center text-center">
                  <div className="p-1.5 bg-blue-500 rounded-lg mb-1">
                    <FolderOpen className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-xl font-bold text-blue-700">{filteredProjects.length}</p>
                  <p className="text-[9px] text-blue-600 font-medium">{isFiltered ? 'Filtered' : 'Projects'}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
              onClick={() => handleMobileStatsClick('active')}
            >
              <CardContent className="p-2.5">
                <div className="flex flex-col items-center text-center">
                  <div className="p-1.5 bg-orange-500 rounded-lg mb-1">
                    <Target className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-xl font-bold text-orange-700">{activeProjectsCount}</p>
                  <p className="text-[9px] text-orange-600 font-medium">Active</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
              onClick={() => handleMobileStatsClick('completed')}
            >
              <CardContent className="p-2.5">
                <div className="flex flex-col items-center text-center">
                  <div className="p-1.5 bg-green-500 rounded-lg mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-xl font-bold text-green-700">{completedProjectsCount}</p>
                  <p className="text-[9px] text-green-600 font-medium">Completed</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
              onClick={() => handleMobileStatsClick('progress')}
            >
              <CardContent className="p-2.5">
                <div className="flex flex-col items-center text-center">
                  <div className="p-1.5 bg-purple-500 rounded-lg mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-xl font-bold text-purple-700">{avgCompletion}%</p>
                  <p className="text-[9px] text-purple-600 font-medium">Avg Progress</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-200 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
              onClick={() => handleMobileStatsClick('volunteers')}
            >
              <CardContent className="p-2.5">
                <div className="flex flex-col items-center text-center">
                  <div className="p-1.5 bg-emerald-500 rounded-lg mb-1">
                    <Users className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-xl font-bold text-emerald-700">{totalVolunteers.toLocaleString()}</p>
                  <p className="text-[9px] text-emerald-600 font-medium">Volunteers</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gradient-to-br from-cyan-50 to-sky-100 border-cyan-200 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
              onClick={() => handleMobileStatsClick('hours')}
            >
              <CardContent className="p-2.5">
                <div className="flex flex-col items-center text-center">
                  <div className="p-1.5 bg-cyan-500 rounded-lg mb-1">
                    <Clock className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-xl font-bold text-cyan-700">{totalHours.toLocaleString()}</p>
                  <p className="text-[9px] text-cyan-600 font-medium">Hours</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary KPIs Row - Beneficiaries, SDGs, AIU - All Interactive */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <Card
              className="flex-shrink-0 bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
              onClick={() => handleMobileStatsClick('beneficiaries')}
            >
              <CardContent className="p-2.5 flex items-center gap-2">
                <div className="p-1.5 bg-rose-500 rounded-lg">
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-rose-700">{totalBeneficiaries.toLocaleString()}</p>
                  <p className="text-[9px] text-rose-600 font-medium">People Reached</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="flex-shrink-0 bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-200 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
              onClick={() => handleMobileStatsClick('sdgs')}
            >
              <CardContent className="p-2.5 flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500 rounded-lg">
                  <Globe className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-indigo-700">{sdgsAddressed}/17</p>
                  <p className="text-[9px] text-indigo-600 font-medium">SDGs Addressed</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="flex-shrink-0 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
              onClick={() => handleMobileStatsClick('aiu')}
            >
              <CardContent className="p-2.5 flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 rounded-lg">
                  <Award className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-700">{totalAIU.toLocaleString()}</p>
                  <p className="text-[9px] text-amber-600 font-medium">Total AIU</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SDG Impact Report Quick Access */}
          <button
            onClick={() => navigate('/impact-report')}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-3 shadow-lg flex items-center justify-between hover:shadow-xl transition-shadow active:scale-[0.99] mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                <FileBarChart className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">SDG Impact Report</p>
                <p className="text-purple-100 text-[10px]">View your UN SDG contributions & metrics</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* SDG Focus Summary - Horizontal scroll */}
          <Card className="mb-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-emerald-800">Your SDG Focus Areas</p>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]">
                  {organizationSDGs.length} of 17
                </Badge>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {organizationSDGs.length > 0 ? (
                  organizationSDGs.map((sdgNum: number) => {
                    const projectCount = filteredProjects.filter((p: any) => p.sdgGoals?.includes(sdgNum)).length;
                    return (
                      <button
                        key={sdgNum}
                        onClick={() => setSelectedSDG(sdgNum === selectedSDG ? null : sdgNum)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all ${
                          selectedSDG === sdgNum
                            ? 'bg-white border-emerald-400 shadow-md'
                            : 'bg-white/50 border-transparent hover:bg-white'
                        }`}
                      >
                        <img src={UN_SDG_ICONS[sdgNum]} alt={`SDG ${sdgNum}`} className="w-6 h-6 rounded" />
                        <div className="text-left">
                          <p className="text-[10px] font-semibold text-slate-700">SDG {sdgNum}</p>
                          <p className="text-[9px] text-slate-500">{projectCount} project{projectCount !== 1 ? 's' : ''}</p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-emerald-600 py-2">
                    No SDGs selected yet. Configure in Settings.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* All 17 SDGs Grid - Compact */}
          <Card className="mb-4">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>UN Sustainable Development Goals</span>
                <span className="text-[10px] font-normal text-gray-500">Tap to explore</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 17 }, (_, i) => i + 1).map((sdgNum) => {
                  const isActive = organizationSDGs.includes(sdgNum);
                  const projectCount = filteredProjects.filter((p: any) =>
                    p.sdgGoals?.includes(sdgNum)
                  ).length;

                  return (
                    <button
                      key={sdgNum}
                      onClick={() => setSelectedSDG(sdgNum === selectedSDG ? null : sdgNum)}
                      className={`relative rounded-lg overflow-hidden transition-all aspect-square ${
                        isActive ? 'ring-2 ring-emerald-500 shadow-sm' : 'opacity-30 grayscale'
                      } ${selectedSDG === sdgNum ? 'scale-110 z-10 ring-2 ring-blue-500' : ''}`}
                    >
                      <img
                        src={UN_SDG_ICONS[sdgNum]}
                        alt={`SDG ${sdgNum}`}
                        className="w-full h-full object-cover"
                      />
                      {projectCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[7px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5">
                          {projectCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected SDG Details - Enhanced */}
          {selectedSDG && (
            <Card className="mb-4 border-2" style={{ borderColor: getSDGColor(selectedSDG) }}>
              <CardHeader className="pb-2 px-3 pt-3">
                <div className="flex items-start gap-3">
                  <img
                    src={UN_SDG_ICONS[selectedSDG]}
                    alt={`SDG ${selectedSDG}`}
                    className="w-14 h-14 rounded-lg shadow-md flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-bold" style={{ color: getSDGColor(selectedSDG) }}>
                      SDG {selectedSDG}: {SDG_METADATA[selectedSDG]?.title}
                    </CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                      {SDG_METADATA[selectedSDG]?.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {/* SDG Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <p className="text-lg font-bold text-slate-800">{selectedSDGProjects.length}</p>
                    <p className="text-[9px] text-slate-500">Projects</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <p className="text-lg font-bold text-slate-800">
                      {selectedSDGProjects.length > 0
                        ? Math.round(selectedSDGProjects.reduce((sum: number, p: any) => sum + (p.completionPercentage || 0), 0) / selectedSDGProjects.length)
                        : 0}%
                    </p>
                    <p className="text-[9px] text-slate-500">Avg Progress</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <p className="text-lg font-bold text-slate-800">
                      {selectedSDGProjects.filter((p: any) => p.status?.toLowerCase() === 'completed').length}
                    </p>
                    <p className="text-[9px] text-slate-500">Completed</p>
                  </div>
                </div>

                {/* Projects List */}
                {selectedSDGProjects.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Aligned Projects</p>
                    {selectedSDGProjects.slice(0, 5).map((project: any) => (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-800 truncate">{project.name}</p>
                            <p className="text-[10px] text-slate-500">{project.location || 'No location'}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <div className="w-16">
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${project.completionPercentage || 0}%`,
                                    backgroundColor: getSDGColor(selectedSDG)
                                  }}
                                />
                              </div>
                              <p className="text-[9px] text-slate-500 text-right mt-0.5">
                                {project.completionPercentage || 0}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {selectedSDGProjects.length > 5 && (
                      <p className="text-[10px] text-center text-slate-500">
                        +{selectedSDGProjects.length - 5} more projects
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No projects aligned with this SDG yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Impact Summary Card - Interactive */}
          {totalVolunteers > 0 || totalHours > 0 ? (
            <Card
              className="bg-gradient-to-br from-slate-800 to-slate-900 text-white cursor-pointer hover:shadow-lg active:scale-[0.99] transition-all"
              onClick={() => handleMobileStatsClick('impact')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-300">Overall Impact</p>
                  <span className="text-[9px] text-slate-400">Tap for details</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{totalVolunteers.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Total Volunteers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalHours.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Hours Contributed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Mobile Stats Dialog */}
        <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
          <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-lg">{statsDialogData?.title}</DialogTitle>
              <DialogDescription className="text-xs">
                {statsDialogData?.items.length || 0} item{(statsDialogData?.items.length || 0) !== 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              {statsDialogData?.items.map((item: any, index: number) => (
                <div
                  key={index}
                  onClick={() => {
                    if (item.id) {
                      setStatsDialogOpen(false);
                      navigate(`/projects/${item.id}`);
                    } else if (item.sdgNum) {
                      setStatsDialogOpen(false);
                      setSelectedSDG(item.sdgNum);
                    }
                  }}
                  className={`p-3 bg-slate-50 rounded-lg border border-slate-100 ${
                    item.id || item.sdgNum ? 'cursor-pointer hover:bg-slate-100 active:scale-[0.99] transition-all' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm text-slate-800 flex-1 pr-2">{item.label}</span>
                    <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{item.value}</span>
                  </div>
                  {item.subValue && (
                    <p className="text-xs text-slate-500 mt-1">{item.subValue}</p>
                  )}
                </div>
              ))}
              {(!statsDialogData?.items || statsDialogData.items.length === 0) && (
                <div className="text-center py-8">
                  <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No data available</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </OrganizationPWALayout>
    );
  }

  // Volunteer Mobile PWA View - Enhanced SDG tracking
  const isVolunteer = currentUser?.userType === 'volunteer';
  if (isVolunteer && isMobile) {
    // Calculate volunteer-specific metrics
    const volunteerProjects = filteredProjects;
    const activeProjectsCount = volunteerProjects.filter((p: any) =>
      p.status?.toLowerCase() === 'active' || p.status?.toLowerCase() === 'in progress'
    ).length;
    const completedProjectsCount = volunteerProjects.filter((p: any) =>
      p.status?.toLowerCase() === 'completed'
    ).length;
    const totalHours = volunteerProjects.reduce((sum: number, p: any) => sum + (p.totalHours || p.volunteerHours || 0), 0);

    // Get unique SDGs from all projects volunteer has worked on
    const volunteerSdgs = new Set<number>();
    volunteerProjects.forEach((project: any) => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        project.sdgGoals.forEach((sdg: number) => volunteerSdgs.add(sdg));
      }
    });
    const sdgsContributed = Array.from(volunteerSdgs).sort((a, b) => a - b);

    // Calculate total AIU for volunteer
    const totalAIU = volunteerProjects.reduce((sum: number, p: any) => sum + (p.aiuEarned || p.volunteerAiu || 0), 0);

    // Get projects for selected SDG
    const selectedSDGProjects = selectedSDG
      ? volunteerProjects.filter((p: any) => p.sdgGoals?.includes(selectedSDG))
      : [];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* PWA Header */}
        <PWAHeader />

        {/* Spacer for fixed header */}
        <div className="pt-20 pb-36">
        <div className="p-4">
          {/* Page Title */}
          <div className="mb-4">
            <h1 className="text-lg font-bold text-slate-800">My SDG Impact</h1>
            <p className="text-xs text-slate-500">Track your UN Goals contributions</p>
          </div>
          {/* KPI Cards - 3 column grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-2.5">
                <div className="flex flex-col items-center text-center">
                  <div className="p-1.5 bg-blue-500 rounded-lg mb-1">
                    <FolderOpen className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-xl font-bold text-blue-700">{volunteerProjects.length}</p>
                  <p className="text-[9px] text-blue-600 font-medium">Projects</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-200">
              <CardContent className="p-2.5">
                <div className="flex flex-col items-center text-center">
                  <div className="p-1.5 bg-emerald-500 rounded-lg mb-1">
                    <Globe className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-xl font-bold text-emerald-700">{sdgsContributed.length}</p>
                  <p className="text-[9px] text-emerald-600 font-medium">SDGs</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-50 to-sky-100 border-cyan-200">
              <CardContent className="p-2.5">
                <div className="flex flex-col items-center text-center">
                  <div className="p-1.5 bg-cyan-500 rounded-lg mb-1">
                    <Clock className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-xl font-bold text-cyan-700">{totalHours}</p>
                  <p className="text-[9px] text-cyan-600 font-medium">Hours</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary row - Active, Completed, AIU */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <Card className="flex-shrink-0 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
              <CardContent className="p-2.5 flex items-center gap-2">
                <div className="p-1.5 bg-orange-500 rounded-lg">
                  <Target className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-orange-700">{activeProjectsCount}</p>
                  <p className="text-[9px] text-orange-600 font-medium">Active</p>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-shrink-0 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-2.5 flex items-center gap-2">
                <div className="p-1.5 bg-green-500 rounded-lg">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-green-700">{completedProjectsCount}</p>
                  <p className="text-[9px] text-green-600 font-medium">Completed</p>
                </div>
              </CardContent>
            </Card>

            {totalAIU > 0 && (
              <Card className="flex-shrink-0 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
                <CardContent className="p-2.5 flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500 rounded-lg">
                    <Award className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-700">{formatDecimal(totalAIU)}</p>
                    <p className="text-[9px] text-amber-600 font-medium">AIU Earned</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* SDGs You've Contributed To */}
          <Card className="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-indigo-800">SDGs You've Supported</p>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-[10px]">
                  {sdgsContributed.length} of 17
                </Badge>
              </div>
              {sdgsContributed.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {sdgsContributed.map((sdgNum: number) => {
                    const projectCount = volunteerProjects.filter((p: any) => p.sdgGoals?.includes(sdgNum)).length;
                    return (
                      <button
                        key={sdgNum}
                        onClick={() => setSelectedSDG(sdgNum === selectedSDG ? null : sdgNum)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all ${
                          selectedSDG === sdgNum
                            ? 'bg-white border-indigo-400 shadow-md'
                            : 'bg-white/50 border-transparent hover:bg-white'
                        }`}
                      >
                        <img src={UN_SDG_ICONS[sdgNum]} alt={`SDG ${sdgNum}`} className="w-6 h-6 rounded" />
                        <div className="text-left">
                          <p className="text-[10px] font-semibold text-slate-700">SDG {sdgNum}</p>
                          <p className="text-[9px] text-slate-500">{projectCount} project{projectCount !== 1 ? 's' : ''}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Globe className="h-8 w-8 text-indigo-200 mx-auto mb-2" />
                  <p className="text-xs text-indigo-600">Join projects to contribute to SDGs</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* All 17 SDGs Grid */}
          <Card className="mb-4">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>UN Sustainable Development Goals</span>
                <span className="text-[10px] font-normal text-gray-500">Tap to explore</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 17 }, (_, i) => i + 1).map((sdgNum) => {
                  const hasContributed = sdgsContributed.includes(sdgNum);
                  const projectCount = volunteerProjects.filter((p: any) =>
                    p.sdgGoals?.includes(sdgNum)
                  ).length;

                  return (
                    <button
                      key={sdgNum}
                      onClick={() => setSelectedSDG(sdgNum === selectedSDG ? null : sdgNum)}
                      className={`relative rounded-lg overflow-hidden transition-all aspect-square ${
                        hasContributed ? 'ring-2 ring-indigo-500 shadow-sm' : 'opacity-30 grayscale'
                      } ${selectedSDG === sdgNum ? 'scale-110 z-10 ring-2 ring-blue-500' : ''}`}
                    >
                      <img
                        src={UN_SDG_ICONS[sdgNum]}
                        alt={`SDG ${sdgNum}`}
                        className="w-full h-full object-cover"
                      />
                      {projectCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-indigo-500 text-white text-[7px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5">
                          {projectCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected SDG Details */}
          {selectedSDG && (
            <Card className="mb-4 border-2" style={{ borderColor: getSDGColor(selectedSDG) }}>
              <CardHeader className="pb-2 px-3 pt-3">
                <div className="flex items-start gap-3">
                  <img
                    src={UN_SDG_ICONS[selectedSDG]}
                    alt={`SDG ${selectedSDG}`}
                    className="w-14 h-14 rounded-lg shadow-md flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-bold" style={{ color: getSDGColor(selectedSDG) }}>
                      SDG {selectedSDG}: {SDG_METADATA[selectedSDG]?.title}
                    </CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                      {SDG_METADATA[selectedSDG]?.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {/* Your contribution stats */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <p className="text-lg font-bold text-slate-800">{selectedSDGProjects.length}</p>
                    <p className="text-[9px] text-slate-500">Projects</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <p className="text-lg font-bold text-slate-800">
                      {selectedSDGProjects.reduce((sum: number, p: any) => sum + (p.totalHours || p.volunteerHours || 0), 0)}
                    </p>
                    <p className="text-[9px] text-slate-500">Hours</p>
                  </div>
                </div>

                {/* Projects List */}
                {selectedSDGProjects.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Your Projects</p>
                    {selectedSDGProjects.slice(0, 5).map((project: any) => (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-800 truncate">{project.name}</p>
                            <p className="text-[10px] text-slate-500">{project.organizationName || 'Project'}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] ml-2">
                            {project.status || 'Active'}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">You haven't contributed to this SDG yet</p>
                    <p className="text-[10px] text-slate-400 mt-1">Find projects aligned with SDG {selectedSDG}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Call to Action */}
          {volunteerProjects.length === 0 && (
            <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <CardContent className="p-4 text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <p className="font-semibold mb-1">Start Your Impact Journey</p>
                <p className="text-xs text-indigo-100 mb-3">
                  Join projects aligned with UN Sustainable Development Goals
                </p>
                <Link href="/discover-opportunities/pwa">
                  <Button variant="secondary" size="sm" className="w-full">
                    Discover Opportunities
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

        </div>
        </div>
        <VolunteerPWANav activeTab="home" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto pb-36">
      <OfflineBanner />
      <OrganizationNav />
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 16px' }}>
        {/* Page Header with integrated filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">SDG Mapping</h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Track SDG alignment and project impact
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Impact Report Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/organization-impact-report')}
              className="bg-gradient-to-r from-amber-50 to-blue-50 border-blue-200 hover:from-amber-100 hover:to-blue-100 text-blue-800"
            >
              <BarChart className="h-4 w-4 mr-2" />
              Impact Report
            </Button>
            {/* Project Filter - Inline */}
            {organizationProjects.length > 1 && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
                  <SelectTrigger className="w-48 sm:w-56 h-9" data-testid="select-project-filter">
                    <SelectValue placeholder="Filter project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects ({organizationProjects.length})</SelectItem>
                    {organizationProjects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        
        {/* SDG Chart - Adapts based on SDG count: Bar for 1-2 SDGs, Radar for 3+ */}
        {chartData && (
          <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">
              SDG Focus vs. Project Distribution
              {chartData.sdgCount <= 2 && (
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  ({chartData.sdgCount} SDG{chartData.sdgCount > 1 ? 's' : ''})
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Compare SDG focus areas with actual project distribution ({filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'})
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {/* Stats and Chart in side-by-side layout on larger screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Stats Cards - Compact 2x2 grid */}
              <div className="grid grid-cols-2 gap-2">
                <StatsCard
                  title="Total"
                  value={filteredProjects.length}
                  icon={<FolderOpen className="h-4 w-4" />}
                  iconBgClass="bg-blue-50 dark:bg-blue-950"
                  iconColor="text-blue-600 dark:text-blue-400"
                  onClick={() => handleStatsClick("Total Projects")}
                  data-testid="stats-total-projects"
                />
                <StatsCard
                  title="Completed"
                  value={filteredProjects.filter((p: any) => p.status?.toLowerCase() === 'completed').length}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  iconBgClass="bg-green-50 dark:bg-green-950"
                  iconColor="text-green-600 dark:text-green-400"
                  onClick={() => handleStatsClick("Completed Projects")}
                  data-testid="stats-completed-projects"
                />
                <StatsCard
                  title="Active"
                  value={filteredProjects.filter((p: any) =>
                    p.status?.toLowerCase() === 'active' || p.status?.toLowerCase() === 'in progress'
                  ).length}
                  icon={<Target className="h-4 w-4" />}
                  iconBgClass="bg-orange-50 dark:bg-orange-950"
                  iconColor="text-orange-600 dark:text-orange-400"
                  onClick={() => handleStatsClick("Active Projects")}
                  data-testid="stats-active-projects"
                />
                <StatsCard
                  title="Avg. %"
                  value={`${filteredProjects.length > 0
                    ? Math.round(
                        filteredProjects.reduce((sum: number, p: any) => sum + (p.completionPercentage || 0), 0) /
                        filteredProjects.length
                      )
                    : 0}%`}
                  icon={<TrendingUp className="h-4 w-4" />}
                  iconBgClass="bg-purple-50 dark:bg-purple-950"
                  iconColor="text-purple-600 dark:text-purple-400"
                  onClick={() => handleStatsClick("Avg. Completion")}
                  data-testid="stats-avg-completion"
                />
              </div>

              {/* Adaptive Chart - Bar for 1-2 SDGs, Radar for 3+ */}
              <div className="w-full" style={{ height: chartData.type === 'bar' ? '240px' : '280px' }}>
                {chartData.type === 'bar' ? (
                  <Bar
                    data={{
                      labels: chartData.labels,
                      datasets: chartData.datasets,
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: chartData.sdgCount === 1 ? 'y' as const : 'x' as const,
                      scales: {
                        x: {
                          grid: {
                            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          },
                          ticks: {
                            color: theme === 'dark' ? '#9CA3AF' : '#4B5563',
                            font: { size: 11 },
                          },
                        },
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          },
                          ticks: {
                            color: theme === 'dark' ? '#9CA3AF' : '#4B5563',
                            stepSize: 1,
                            font: { size: 11 },
                          },
                          title: {
                            display: chartData.sdgCount === 1,
                            text: 'Projects',
                            color: theme === 'dark' ? '#D1D5DB' : '#1F2937',
                            font: { size: 12 },
                          },
                        },
                      },
                      plugins: {
                        legend: {
                          position: 'top' as const,
                          labels: {
                            color: theme === 'dark' ? '#D1D5DB' : '#1F2937',
                            padding: 16,
                            font: { size: 12 },
                            usePointStyle: true,
                            pointStyle: 'rectRounded',
                          },
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const label = context.dataset.label || '';
                              const value = context.parsed.y ?? context.parsed.x;
                              return `${label}: ${value} project${value !== 1 ? 's' : ''}`;
                            },
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <Radar
                    data={{
                      labels: chartData.labels,
                      datasets: chartData.datasets,
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        r: {
                          beginAtZero: true,
                          ticks: {
                            color: theme === 'dark' ? '#9CA3AF' : '#4B5563',
                            callback: function(value: any) {
                              // Convert log scale back to actual project count for display
                              const actualValue = Math.round(Math.pow(10, value) - 1);
                              return actualValue;
                            }
                          },
                          grid: {
                            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          },
                          pointLabels: {
                            color: theme === 'dark' ? '#D1D5DB' : '#1F2937',
                            font: {
                              size: 12,
                            },
                            callback: function(label: string) {
                              // Wrap labels to max 2 words per line for better visibility
                              const words = label.split(' ');
                              if (words.length <= 2) return label;

                              const lines: string[] = [];
                              for (let i = 0; i < words.length; i += 2) {
                                lines.push(words.slice(i, i + 2).join(' '));
                              }
                              return lines;
                            },
                          },
                        },
                      },
                      plugins: {
                        legend: {
                          position: 'top' as const,
                          labels: {
                            color: theme === 'dark' ? '#D1D5DB' : '#1F2937',
                            padding: 20,
                            font: {
                              size: 14,
                            },
                          },
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              let label = context.dataset.label || '';
                              if (label) {
                                label += ': ';
                              }
                              if (context.parsed.r !== null) {
                                // Convert log scale back to project count
                                const actualValue = Math.round(Math.pow(10, context.parsed.r) - 1);
                                label += actualValue + ' project' + (actualValue !== 1 ? 's' : '');
                              }
                              return label;
                            }
                          }
                        }
                      },
                    }}
                  />
                )}
              </div>
            </div>
            {/* Legend - Compact */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              {chartData.type === 'bar' ? (
                <>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: organizationSDGs.length > 0 ? `${getSDGColor(organizationSDGs[0])}40` : '#1e3a8a40', border: `2px solid ${organizationSDGs.length > 0 ? getSDGColor(organizationSDGs[0]) : '#1e3a8a'}` }}></span>
                    Focus Target
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: organizationSDGs.length > 0 ? getSDGColor(organizationSDGs[0]) : '#b45309' }}></span>
                    Actual Projects
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#1e3a8a' }}></span>
                    Selected SDGs (Settings)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#b45309' }}></span>
                    Actual Distribution
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* SDG Selection Grid - Compact with metrics */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 sm:gap-3 mb-4">
        {sdgData.map((sdg: any) => (
          <button
            key={sdg.id}
            onClick={() => setSelectedSDG(sdg.id)}
            className={`p-2 sm:p-3 rounded-lg border active:scale-95 transition-all ${
              effectiveSelectedSDG === sdg.id
                ? 'ring-2 ring-primary border-primary'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            style={{ backgroundColor: effectiveSelectedSDG === sdg.id ? `${sdg.color}15` : '' }}
            data-testid={`button-sdg-${sdg.id}`}
          >
            {UN_SDG_ICONS[sdg.id] ?
              <div className="flex justify-center">
                <img
                  src={UN_SDG_ICONS[sdg.id]}
                  alt={`SDG ${sdg.id}`}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded"
                />
              </div>
              :
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-full flex items-center justify-center text-white text-base sm:text-lg font-bold"
                style={{ backgroundColor: sdg.color }}
              >
                {sdg.id}
              </div>
            }
            <p className="mt-1 text-[10px] sm:text-xs font-medium text-center line-clamp-1">{sdg.title}</p>
            {/* Project count and completion percentage */}
            <div className="mt-1 flex items-center justify-center gap-1">
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                {sdg.projectCount} proj
              </span>
              {sdg.projectCount > 0 && (
                <span
                  className="text-[10px] sm:text-xs font-semibold px-1 rounded"
                  style={{
                    backgroundColor: `${sdg.color}20`,
                    color: sdg.color
                  }}
                >
                  {sdg.avgCompletion}%
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {/* Selected SDG Detail View - Compact */}
      {selectedData && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* SDG Information */}
        <Card className="lg:col-span-2">
          <CardHeader style={{ backgroundColor: `${selectedData.color}15` }} className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {UN_SDG_ICONS[selectedData.id] ?
                  <img
                    src={UN_SDG_ICONS[selectedData.id]}
                    alt={`SDG ${selectedData.id}`}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded"
                  />
                  :
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-base sm:text-lg font-bold"
                    style={{ backgroundColor: selectedData.color }}
                  >
                    {selectedData.id}
                  </div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    className="text-[10px] px-1.5 py-0"
                    style={{
                      backgroundColor: selectedData.color,
                      color: 'white'
                    }}
                  >
                    Goal {selectedData.id}
                  </Badge>
                  <span className="text-xs font-semibold px-1.5 rounded" style={{ backgroundColor: `${selectedData.color}20`, color: selectedData.color }}>
                    {selectedData.avgCompletion}% avg
                  </span>
                </div>
                <CardTitle className="text-base sm:text-lg">{selectedData.title}</CardTitle>
                <CardDescription className="text-xs line-clamp-1">{selectedData.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {/* Impact Metrics and Connected Projects side by side on larger screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Impact Metrics */}
              <div>
                <h3 className="text-sm font-semibold mb-2 text-slate-800 dark:text-white">Impact Metrics</h3>
                {selectedData.impactMetrics.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedData.impactMetrics.map((metric, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        <span className="font-medium text-xs">{metric.name}</span>
                        <span className="font-bold text-primary text-sm">
                          {metric.value.toLocaleString()} <span className="text-xs text-gray-500">{metric.unit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    No impact metrics recorded yet.
                  </p>
                )}
              </div>

              {/* Connected Projects */}
              <div>
                <h3 className="text-sm font-semibold mb-2 text-slate-800 dark:text-white">
                  Projects ({relatedProjects.length})
                </h3>
                {relatedProjects.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {relatedProjects.map((project: any) => (
                      <div
                        key={project.id}
                        className="border border-gray-200 dark:border-gray-700 rounded p-2 hover:border-primary transition-all cursor-pointer group"
                        onClick={() => navigate(`/projects/${project.id}`)}
                        data-testid={`project-${project.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-xs group-hover:text-primary transition-colors truncate">
                              {project.name}
                            </h4>
                            {project.location && (
                              <p className="text-[10px] text-gray-500 truncate">📍 {project.location}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs font-semibold" style={{ color: selectedData.color }}>
                              {project.completionPercentage || 0}%
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {project.status}
                            </Badge>
                          </div>
                        </div>
                        <CompletionProgress value={project.completionPercentage || 0} className="h-1 mt-1" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    No projects aligned with this SDG.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Action Panel - Compact */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2 p-3">
              <CardTitle className="text-sm">SDG Alignment Tools</CardTitle>
              <CardDescription className="text-xs">
                Connect projects to SDGs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <Tabs defaultValue="connect">
                <TabsList className="grid grid-cols-2 mb-2 h-8">
                  <TabsTrigger value="connect" className="text-xs">Connect</TabsTrigger>
                  <TabsTrigger value="report" className="text-xs">Report</TabsTrigger>
                </TabsList>

                <TabsContent value="connect" className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Project</label>
                    <select
                      className="w-full p-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      data-testid="select-project"
                    >
                      <option value="">Select a project</option>
                      {organizationProjects.map((project: any) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* AI Recommendations - Compact */}
                  {selectedProjectId && recommendedSDGs.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2">
                      <div className="flex items-start gap-1.5">
                        <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                            AI Recommendations
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {recommendedSDGs.map(sdgId => (
                              <Badge
                                key={sdgId}
                                className="text-[10px] px-1 py-0 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200"
                                style={{ borderColor: getSDGColor(sdgId) }}
                              >
                                {sdgId}: {SDG_GOALS[sdgId]?.shortName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select SDG Goals</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Choose one or more SDGs to connect with this project
                    </p>
                    
                    <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      {/* Show all 17 SDGs */}
                      {Object.values(SDG_GOALS).map((sdg) => {
                        const isRecommended = recommendedSDGs.includes(sdg.id);
                        const isOrgFocus = organizationSDGs.includes(sdg.id);
                        const isSelected = selectedGoalForConnection.includes(sdg.id);
                        const project = organizationProjects.find((p: any) => p.id.toString() === selectedProjectId);
                        const isAlreadyLinked = project?.sdgGoals?.includes(sdg.id);
                        
                        return (
                          <div
                            key={sdg.id}
                            onClick={() => {
                              if (isAlreadyLinked) return;
                              setSelectedGoalForConnection(prev =>
                                prev.includes(sdg.id)
                                  ? prev.filter(id => id !== sdg.id)
                                  : [...prev, sdg.id]
                              );
                            }}
                            className={`
                              flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors
                              ${isSelected ? 'bg-primary/10 border-2 border-primary' : 'border border-gray-200 dark:border-gray-700'}
                              ${isAlreadyLinked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
                            `}
                            data-testid={`sdg-option-${sdg.id}`}
                          >
                            <div 
                              className="w-1 h-8 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: sdg.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">Goal {sdg.id}</span>
                                <span className="text-sm text-gray-700 dark:text-gray-300">{sdg.name}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                {isRecommended && (
                                  <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    AI Recommended
                                  </Badge>
                                )}
                                {isOrgFocus && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700">
                                    Org Focus
                                  </Badge>
                                )}
                                {isAlreadyLinked && (
                                  <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Already Linked
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isAlreadyLinked}
                              readOnly
                              className="h-4 w-4 flex-shrink-0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Warning for non-recommended selections */}
                  {selectedGoalForConnection.some(id => !recommendedSDGs.includes(id) && !organizationSDGs.includes(id)) && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        You've selected SDGs that are not recommended by AI or in your organization's focus areas. You can still proceed with these selections.
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleConnectSDG}
                    disabled={!selectedProjectId || selectedGoalForConnection.length === 0 || updateProjectSDGs.isPending}
                    className="w-full"
                    data-testid="button-connect-sdg"
                  >
                    {updateProjectSDGs.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>Connect to SDG{selectedGoalForConnection.length > 1 ? 's' : ''}</>
                    )}
                  </Button>
                </TabsContent>
                
                <TabsContent value="report" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Generate Report For</label>
                    <select className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                      <option value="sdg">This SDG (Goal {effectiveSelectedSDG})</option>
                      <option value="all">All SDGs</option>
                      <option value="project">Specific Project</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Report Type</label>
                    <select className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                      <option value="summary">Summary Report</option>
                      <option value="detailed">Detailed Report</option>
                      <option value="impact">Impact Metrics</option>
                      <option value="visual">Visual Dashboard</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time Period</label>
                    <select className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                      <option value="month">Last Month</option>
                      <option value="quarter">Last Quarter</option>
                      <option value="year">Last Year</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>
                  
                  <button className="w-full mt-4 bg-primary text-white py-2 rounded-md hover:bg-primary-700">
                    Generate Report
                  </button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>SDG Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li>
                  <a 
                    href={`https://sdgs.un.org/goals/goal${effectiveSelectedSDG}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center group"
                    data-testid="link-sdg-indicators"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="flex-1">SDG {effectiveSelectedSDG} Official Indicators</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
                <li>
                  <a 
                    href={`https://www.youtube.com/results?search_query=measuring+impact+SDG+${effectiveSelectedSDG}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center group"
                    data-testid="link-sdg-videos"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="flex-1">Video: Measuring Impact for SDG {effectiveSelectedSDG}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
                <li>
                  <a 
                    href={`https://sdgs.un.org/goals/goal${effectiveSelectedSDG}#targets_and_indicators`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center group"
                    data-testid="link-sdg-best-practices"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    <span className="flex-1">Best Practices Guide</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
                <li>
                  <a 
                    href={`https://sustainabledevelopment.un.org/partnerships/goal${effectiveSelectedSDG}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center group"
                    data-testid="link-sdg-partners"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="flex-1">Connect with SDG {effectiveSelectedSDG} Partners</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      )}
      
      {/* Guard: Show message when no SDG is selected */}
      {!selectedData && sdgData.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Select an SDG above to view details</p>
          </CardContent>
        </Card>
      )}
      
        {/* Statistics Detail Dialog */}
        <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{statsDialogData?.title}</DialogTitle>
              <DialogDescription>
                Detailed breakdown of {statsDialogData?.title.toLowerCase()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              {statsDialogData?.items.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <span className="font-medium text-sm">{item.label}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.value}</span>
                </div>
              ))}
              {statsDialogData?.items.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No data available
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {/* Footer - Desktop only */}
      {!isMobile && <Footer />}
    </div>
  );
}