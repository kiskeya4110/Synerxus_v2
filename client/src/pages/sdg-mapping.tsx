import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CompletionProgress } from "@/components/ui/completion-progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/components/layout/theme-provider";
import OrganizationHeader from "@/components/layout/organization-header";
import MobileMetricsGrid from "@/components/layout/mobile-metrics-grid";
import OfflineBanner from "@/components/layout/offline-banner";
import Footer from "@/components/layout/footer";
import { Loader2, BarChart, ExternalLink, Filter, FolderOpen, CheckCircle2, Target, TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";
import StatsCard from "@/components/dashboard/stats-card";
import { getSDGName, getSDGColor, suggestSDGsFromText, SDG_GOALS } from "@shared/sdg-goals";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
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
    // Try organization first (Settings), fallback to matchableOrganization
    if (orgProfile?.organization?.primarySdgs && orgProfile.organization.primarySdgs.length > 0) {
      return orgProfile.organization.primarySdgs;
    }
    if (orgProfile?.matchableOrganization?.primarySdgs) {
      return orgProfile.matchableOrganization.primarySdgs;
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
        impactMetrics: []
      });
    });
    
    // Create a Set of filtered project IDs for filtering
    const orgProjectIds = new Set(filteredProjects.map((p: any) => p.id));
    
    // Count projects per SDG (using filtered projects)
    filteredProjects.forEach((project: any) => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        project.sdgGoals.forEach((sdg: number) => {
          const existing = sdgMap.get(sdg);
          if (existing) {
            existing.projectCount++;
          }
        });
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
  
  // Radar chart data: Compare organization's selected SDGs vs actual project distribution
  const radarChartData = useMemo(() => {
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
    
    // Apply log transformation for better visibility when values differ greatly
    // Using log10(x + 1) to handle zero values
    const selectedData = organizationSDGs.map(() => Math.log10(maxProjects + 1));
    
    // Actual project distribution with log transformation (counts as 1 per each)
    const actualData = organizationSDGs.map((sdgId: number) => {
      const count = projectDistribution.get(sdgId) || 0;
      return Math.log10(count + 1);
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Selected SDG Focus Areas (Settings)',
          data: selectedData,
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
          data: actualData,
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
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Empty state when organization hasn't selected SDGs in Settings
  if (sdgData.length === 0) {
    return (
      <div className="h-screen overflow-y-auto">
        <OrganizationHeader activeTab="sdgs" />
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold">SDG Mapping</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Connect volunteer activities to Sustainable Development Goals and track impact
            </p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No SDGs Selected</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-4">
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
  
  return (
    <div className="h-screen overflow-y-auto">
      <OfflineBanner />
      <OrganizationHeader activeTab="sdgs" />
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 24px' }}>
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">SDG Mapping</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Connect volunteer activities to Sustainable Development Goals and track impact
          </p>
        </div>

        {/* Project Filter */}
        {organizationProjects.length > 1 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Filter className="h-5 w-5 text-gray-500" />
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Filter by Project</label>
                  <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
                    <SelectTrigger className="w-full sm:w-80" data-testid="select-project-filter">
                      <SelectValue placeholder="Select project to filter" />
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
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Spider Web Chart - SDG Comparison */}
        {radarChartData && (
          <Card className="mb-6">
          <CardHeader>
            <CardTitle>SDG Focus vs. Project Distribution</CardTitle>
            <CardDescription>
              Compare your organization's selected SDG focus areas from Settings with your actual project distribution across {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'} {selectedProjectFilter !== 'all' ? '(filtered)' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <StatsCard
                title="Total Projects"
                value={filteredProjects.length}
                icon={<FolderOpen className="h-5 w-5" />}
                iconBgClass="bg-blue-50 dark:bg-blue-950"
                iconColor="text-blue-600 dark:text-blue-400"
                onClick={() => handleStatsClick("Total Projects")}
                data-testid="stats-total-projects"
              />
              <StatsCard
                title="Completed Projects"
                value={filteredProjects.filter((p: any) => p.status?.toLowerCase() === 'completed').length}
                icon={<CheckCircle2 className="h-5 w-5" />}
                iconBgClass="bg-green-50 dark:bg-green-950"
                iconColor="text-green-600 dark:text-green-400"
                onClick={() => handleStatsClick("Completed Projects")}
                data-testid="stats-completed-projects"
              />
              <StatsCard
                title="Active Projects"
                value={filteredProjects.filter((p: any) => 
                  p.status?.toLowerCase() === 'active' || p.status?.toLowerCase() === 'in progress'
                ).length}
                icon={<Target className="h-5 w-5" />}
                iconBgClass="bg-orange-50 dark:bg-orange-950"
                iconColor="text-orange-600 dark:text-orange-400"
                onClick={() => handleStatsClick("Active Projects")}
                data-testid="stats-active-projects"
              />
              <StatsCard
                title="Avg. Completion"
                value={`${filteredProjects.length > 0 
                  ? Math.round(
                      filteredProjects.reduce((sum: number, p: any) => sum + (p.completionPercentage || 0), 0) / 
                      filteredProjects.length
                    )
                  : 0}%`}
                icon={<TrendingUp className="h-5 w-5" />}
                iconBgClass="bg-purple-50 dark:bg-purple-950"
                iconColor="text-purple-600 dark:text-purple-400"
                onClick={() => handleStatsClick("Avg. Completion")}
                data-testid="stats-avg-completion"
              />
            </div>
            
            <div className="w-full max-w-2xl mx-auto" style={{ height: '400px' }}>
              <Radar
                data={radarChartData}
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
                            label += Math.round(context.parsed.r) + '%';
                          }
                          return label;
                        }
                      }
                    }
                  },
                }}
              />
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
              <p className="flex items-center justify-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#1e3a8a' }}></span>
                Selected SDGs represent your organization's commitment from Settings
              </p>
              <p className="flex items-center justify-center gap-2 mt-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#b45309' }}></span>
                Project Distribution shows where you're actually making impact
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* SDG Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {sdgData.map((sdg: any) => (
          <button
            key={sdg.id}
            onClick={() => setSelectedSDG(sdg.id)}
            className={`p-3 sm:p-4 rounded-lg border min-h-[120px] sm:min-h-auto active:scale-95 transition-all ${
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
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded"
                />
              </div>
              :
              <div 
                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-bold"
                style={{ backgroundColor: sdg.color }}
              >
                {sdg.id}
              </div>
            }
            <p className="mt-2 text-xs sm:text-sm font-medium text-center line-clamp-2">{sdg.title}</p>
          </button>
        ))}
      </div>
      
      {/* Selected SDG Detail View */}
      {selectedData && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* SDG Information */}
        <Card className="lg:col-span-2">
          <CardHeader style={{ backgroundColor: `${selectedData.color}15` }} className="p-4 sm:p-6">
            <div className="flex items-start sm:items-center flex-col sm:flex-row gap-3 sm:gap-0">
              <div className="sm:mr-4">
                {UN_SDG_ICONS[selectedData.id] ? 
                  <img 
                    src={UN_SDG_ICONS[selectedData.id]} 
                    alt={`SDG ${selectedData.id}`}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded"
                  />
                  : 
                  <div 
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-bold"
                    style={{ backgroundColor: selectedData.color }}
                  >
                    {selectedData.id}
                  </div>
                }
              </div>
              <div>
                <Badge 
                  className="mb-2 text-xs"
                  style={{ 
                    backgroundColor: selectedData.color,
                    color: 'white'
                  }}
                >
                  Goal {selectedData.id}
                </Badge>
                <CardTitle className="text-lg sm:text-xl">{selectedData.title}</CardTitle>
                <CardDescription className="mt-1 text-sm">{selectedData.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Impact Metrics</h3>
            {selectedData.impactMetrics.length > 0 ? (
              <div className="space-y-3">
                {selectedData.impactMetrics.map((metric, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <span className="text-lg font-bold text-primary">
                      {metric.value.toLocaleString()} <span className="text-sm text-gray-500">{metric.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No impact metrics recorded for this SDG yet.
              </p>
            )}
            
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                Connected Projects ({relatedProjects.length})
              </h3>
              {relatedProjects.length > 0 ? (
                <div className="space-y-3">
                  {relatedProjects.map((project: any) => (
                    <div 
                      key={project.id} 
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => navigate(`/projects/${project.id}`)}
                      data-testid={`project-${project.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-base group-hover:text-primary transition-colors">
                              {project.name}
                            </h4>
                            <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          {project.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-2 whitespace-nowrap">
                          {project.status}
                        </Badge>
                      </div>
                      
                      <div className="mt-3 space-y-2">
                        {project.location && (
                          <p className="text-xs text-gray-500">📍 {project.location}</p>
                        )}
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span>Completion</span>
                            <span className="font-semibold">{project.completionPercentage || 0}%</span>
                          </div>
                          <CompletionProgress value={project.completionPercentage || 0} className="h-2" />
                        </div>
                        
                        {project.sdgGoals && project.sdgGoals.length > 1 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs text-gray-500">Also aligned with:</span>
                            {project.sdgGoals
                              .filter((sdg: number) => sdg !== effectiveSelectedSDG)
                              .slice(0, 3)
                              .map((sdg: number) => (
                                <Badge 
                                  key={sdg} 
                                  variant="outline" 
                                  className="text-xs px-1.5 py-0"
                                  style={{ borderColor: getSDGColor(sdg) }}
                                >
                                  SDG {sdg}
                                </Badge>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No projects are currently aligned with SDG {effectiveSelectedSDG}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Action Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>SDG Alignment Tools</CardTitle>
              <CardDescription>
                Connect your projects and activities to SDGs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="connect">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="connect">Connect</TabsTrigger>
                  <TabsTrigger value="report">Report</TabsTrigger>
                </TabsList>
                
                <TabsContent value="connect" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project</label>
                    <select 
                      className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
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
                  
                  {/* AI Recommendations */}
                  {selectedProjectId && recommendedSDGs.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                            AI-Recommended SDGs
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {recommendedSDGs.map(sdgId => (
                              <Badge 
                                key={sdgId}
                                className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700"
                                style={{ borderColor: getSDGColor(sdgId) }}
                              >
                                <span className="mr-1">✨</span>
                                Goal {sdgId}: {SDG_GOALS[sdgId]?.shortName}
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
      
      {/* Mobile Metrics Grid */}
      <div className="md:hidden" style={{ 
        padding: '16px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        paddingBottom: '0'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', margin: '0 0 16px 0' }}>
          SDG Impact
        </h2>
      </div>
      <MobileMetricsGrid activeProjects={0} totalHours={0} sdgsAddressed={0} livesTouched={0} />
      
      {/* Footer - Hidden on Mobile */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}