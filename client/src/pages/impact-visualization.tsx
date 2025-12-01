import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Share2, Download, Twitter, Linkedin, Facebook, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BeforeAfterComparison from "@/components/impact/before-after-comparison";
import { Link, useLocation } from "wouter";
import { Line, Bar, Radar } from "react-chartjs-2";
import { useToast } from "@/hooks/use-toast";
import OrganizationHeader from "@/components/layout/organization-header";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { getSDGName, getSDGFullName, getSDGColor } from "@shared/sdg-goals";
declare const html2pdf: any;

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);


export default function ImpactVisualization() {
  const { toast } = useToast();
  const userType = localStorage.getItem('userType');
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("before-after");
  const [selectedMetric, setSelectedMetric] = useState<any>(null);
  const [selectedProjectIdForStories, setSelectedProjectIdForStories] = useState<string>("all");
  const contentRef = useRef<HTMLDivElement>(null);

  // Redirect non-organizations
  if (userType !== 'organization') {
    return null;
  }

  // Get current user to filter their projects
  const userId = localStorage.getItem('currentUserId');
  const { data: currentUser } = useQuery<any>({
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

  // Fetch organization-scoped dashboard data
  const { data: dashboardData } = useQuery<any>({
    queryKey: ["/api/dashboard/summary", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const response = await fetch(`/api/dashboard/summary?userId=${id}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      return response.json();
    },
    enabled: !!currentUser && !!userId
  });

  // Use scoped data from dashboard
  const projects = dashboardData?.projects || [];
  const volunteerActivities = dashboardData?.activities || [];
  const projectImpacts = dashboardData?.impacts || [];
    
  const { data: impactMetrics = [] } = useQuery<any[]>({ queryKey: ["/api/impact-metrics"] });

  // Calculate aggregated metrics from real data
  const aggregatedMetrics = useMemo(() => {
    // Use backend-calculated totalPeopleImpacted (uses keyword-based filtering)
    // instead of frontend recalculation with restrictive category filtering
    const totalPeople = dashboardData?.totalPeopleImpacted || 0;

    const communitiesServed = new Set(projects.map((p: any) => p.location)).size;
    const totalHours = volunteerActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
    const uniqueSDGs = new Set();
    projects.forEach((p: any) => {
      if (p.sdgGoals && Array.isArray(p.sdgGoals)) {
        p.sdgGoals.forEach((sdg: number) => uniqueSDGs.add(sdg));
      }
    });

    return {
      totalPeople,
      communitiesServed,
      totalHours,
      sdgsAddressed: uniqueSDGs.size,
    };
  }, [projects, projectImpacts, volunteerActivities, impactMetrics, dashboardData?.totalPeopleImpacted]);

  // Process project outcomes from real data with metric combination
  const projectOutcomes = useMemo(() => {
    return projects.slice(0, 3).map((project: any) => {
      const impacts = projectImpacts.filter((i: any) => i.projectId === project.id);
      const activities = volunteerActivities.filter((a: any) => a.projectId === project.id);
      
      // Group impacts by metric name and combine similar metrics
      const metricMap = new Map<string, { value: number; unit: string }>();
      
      impacts.forEach((impact: any) => {
        const metric = impactMetrics.find((m: any) => m.id === impact.metricId);
        const metricName = metric?.name || "Unknown Metric";
        const unit = metric?.unit || "";
        
        if (metricMap.has(metricName)) {
          // Combine with existing metric
          const existing = metricMap.get(metricName)!;
          existing.value += impact.value || 0;
        } else {
          // Add new metric
          metricMap.set(metricName, {
            value: impact.value || 0,
            unit
          });
        }
      });

      // Convert map to array of outcomes
      const outcomes = Array.from(metricMap.entries()).map(([metricName, data]) => ({
        metric: metricName,
        value: data.value,
        unit: data.unit,
      }));

      // Add volunteer hours as a separate metric
      if (activities.length > 0) {
        outcomes.push({
          metric: "Volunteer Hours",
          value: activities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0),
          unit: "hours",
        });
      }

      return {
        id: project.id,
        title: project.name,
        sdgs: project.sdgGoals || [],
        outcomes,
      };
    });
  }, [projects, projectImpacts, volunteerActivities, impactMetrics]);

  // Prepare before/after comparison data from projects
  const beforeAfterData = useMemo(() => {
    if (projects.length === 0) {
      return [];
    }

    return projects
      .map((project: any) => {
        const impacts = projectImpacts.filter((i: any) => i.projectId === project.id);
        
        // Group metrics by name to combine similar metrics
        const beforeMetricMap = new Map<string, { value: number; unit: string }>();
        const afterMetricMap = new Map<string, { value: number; unit: string }>();
        
        // Collect all evidence URLs for images
        const allEvidenceUrls: string[] = [];
        impacts.forEach((impact: any) => {
          if (impact.evidenceUrls && Array.isArray(impact.evidenceUrls)) {
            allEvidenceUrls.push(...impact.evidenceUrls);
          }
        });
        
        impacts.forEach((impact: any) => {
          const metric = impactMetrics.find((m: any) => m.id === impact.metricId);
          if (metric) {
            const metricName = metric.name;
            const unit = metric.unit || "";
            // Use baseline value if available, otherwise calculate as 30% for demonstration
            const beforeValue = impact.baselineValue || Math.floor((impact.value || 0) * 0.3);
            const afterValue = impact.value || 0;
            
            // Combine similar metrics by name
            if (beforeMetricMap.has(metricName)) {
              beforeMetricMap.get(metricName)!.value += beforeValue;
            } else {
              beforeMetricMap.set(metricName, { value: beforeValue, unit });
            }
            
            if (afterMetricMap.has(metricName)) {
              afterMetricMap.get(metricName)!.value += afterValue;
            } else {
              afterMetricMap.set(metricName, { value: afterValue, unit });
            }
          }
        });
        
        // Convert maps to arrays
        const beforeMetrics = Array.from(beforeMetricMap.entries()).map(([label, data]) => ({
          label,
          value: data.value,
          unit: data.unit
        }));
        
        const afterMetrics = Array.from(afterMetricMap.entries()).map(([label, data]) => ({
          label,
          value: data.value,
          unit: data.unit
        }));

        // Use evidence URLs if available, otherwise fall back to coverImage or placeholder
        const beforeImage = allEvidenceUrls[0] || project.coverImage || "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800";
        const afterImage = allEvidenceUrls[1] || allEvidenceUrls[0] || project.coverImage || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800";

        return {
          id: String(project.id),
          title: project.name || "Project",
          description: project.description || "No description available",
          location: project.location || "Location not specified",
          date: project.startDate ? new Date(project.startDate).toLocaleDateString() : "Date not specified",
          beforeImage,
          afterImage,
          beforeMetrics,
          afterMetrics,
          hasImpactData: beforeMetrics.length > 0 || afterMetrics.length > 0
        };
      })
      .filter((project: any) => project.hasImpactData); // Only include projects with impact data
  }, [projects, projectImpacts, impactMetrics]);

  // Prepare time series chart data
  const impactOverTimeData = useMemo(() => {
    const datasetLabel = currentUser?.userType === 'volunteer' ? 'People You Impacted' : 'People Impacted';
    
    // Use backend-computed monthlyImpactData for both volunteers and organizations
    if (dashboardData?.monthlyImpactData) {
      const labels = dashboardData.monthlyImpactData.map((m: any) => {
        const [year, monthNum] = m.month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      });
      const values = dashboardData.monthlyImpactData.map((m: any) => m.peopleImpacted);

      return {
        labels,
        datasets: [{
          label: datasetLabel,
          data: values,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        }],
      };
    }

    // Empty fallback if no data
    return {
      labels: [],
      datasets: [{
        label: datasetLabel,
        data: [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      }],
    };
  }, [dashboardData, currentUser]);

  // Prepare volunteer hours chart data
  const volunteerHoursData = useMemo(() => {
    const datasetLabel = currentUser?.userType === 'volunteer' ? 'Your Hours' : 'Volunteer Hours';
    
    // Use backend-computed monthlyImpactData for both volunteers and organizations
    if (dashboardData?.monthlyImpactData) {
      const labels = dashboardData.monthlyImpactData.map((m: any) => {
        const [year, monthNum] = m.month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleDateString('en-US', { month: 'short' });
      });
      const values = dashboardData.monthlyImpactData.map((m: any) => m.hours);

      return {
        labels,
        datasets: [{
          label: datasetLabel,
          data: values,
          backgroundColor: 'rgba(147, 51, 234, 0.8)',
        }],
      };
    }

    // Empty fallback if no data
    return {
      labels: [],
      datasets: [{
        label: datasetLabel,
        data: [],
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
      }],
    };
  }, [dashboardData, currentUser]);

  // Prepare SDG radar chart data
  const sdgRadarData = useMemo(() => {
    const datasetLabel = currentUser?.userType === 'volunteer' ? 'Your Impact Score' : 'Impact Score';
    
    // For organizations, use backend-computed impactBySDG if available
    if (currentUser?.userType === 'organization' && dashboardData?.impactBySDG) {
      const sortedSDGs = dashboardData.impactBySDG.sort((a: any, b: any) => a.sdgGoal - b.sdgGoal);
      const labels = sortedSDGs.map((item: any) => getSDGName(item.sdgGoal));
      const values = sortedSDGs.map((item: any) => item.peopleImpacted || item.hours);

      return {
        labels,
        datasets: [{
          label: datasetLabel,
          data: values,
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2,
        }],
      };
    }

    // Fallback: compute manually from projects and projectImpacts
    const sdgImpacts = new Map();
    projects.forEach((project: any) => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        project.sdgGoals.forEach((sdg: number) => {
          if (!sdgImpacts.has(sdg)) {
            sdgImpacts.set(sdg, 0);
          }
          const impacts = projectImpacts.filter((i: any) => i.projectId === project.id);
          const totalImpact = impacts.reduce((sum: number, i: any) => sum + (i.value || 0), 0);
          sdgImpacts.set(sdg, sdgImpacts.get(sdg) + totalImpact);
        });
      }
    });

    const sortedSDGs = Array.from(sdgImpacts.entries()).sort((a, b) => a[0] - b[0]);
    const labels = sortedSDGs.map(([sdg]) => getSDGName(sdg));
    const values = sortedSDGs.map(([, impact]) => impact);

    return {
      labels,
      datasets: [{
        label: datasetLabel,
        data: values,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
      }],
    };
  }, [projects, projectImpacts, dashboardData, currentUser]);

  // PDF Export Function
  const handleExportPDF = () => {
    const element = contentRef.current;
    if (!element) return;

    const opt = {
      margin: 10,
      filename: `impact-visualization-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
    toast({
      title: "PDF Export",
      description: "Your impact visualization has been downloaded!"
    });
  };

  // Social Media Sharing
  const handleShareSocial = (platform: 'twitter' | 'linkedin' | 'facebook') => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/impact-visualization';
    const shareUrl = `${baseUrl}${currentPath}`;
    
    const text = `Check out my Impact Visualization! I've made a difference in ${aggregatedMetrics?.totalPeople || 0} people's lives and contributed ${aggregatedMetrics?.totalHours || 0} volunteer hours.`;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(text);
    
    let shareLink = '';
    switch(platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
    }
    
    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400');
    }
  };

  // Copy Share Link
  const handleCopyLink = () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied",
      description: "Share link copied to clipboard!"
    });
  };

  const handleMetricClick = (metricName: string, value: number) => {
    let details: any = { title: metricName, items: [] };

    switch (metricName) {
      case "Total People Impacted":
        details.items = projectImpacts
          .filter((i: any) => {
            const metric = impactMetrics.find((m: any) => m.id === i.metricId);
            return metric && (metric.category === "Health" || metric.category === "Education" || metric.category === "Water & Sanitation");
          })
          .map((i: any) => {
            const metric = impactMetrics.find((m: any) => m.id === i.metricId);
            const project = projects.find((p: any) => p.id === i.projectId);
            return {
              label: metric?.name || "Unknown",
              value: `${i.value} ${metric?.unit || ""}`,
              project: project?.name || "Unknown Project",
            };
          });
        break;
      case "Communities Served":
        const communities = new Map();
        projects.forEach((p: any) => {
          if (!communities.has(p.location)) {
            communities.set(p.location, []);
          }
          communities.get(p.location).push(p.name);
        });
        details.items = Array.from(communities.entries()).map(([location, projectNames]) => ({
          label: location,
          value: `${projectNames.length} projects`,
          project: projectNames.join(", "),
        }));
        break;
      case "Volunteer Hours":
        details.items = volunteerActivities.slice(0, 20).map((a: any) => {
          const project = projects.find((p: any) => p.id === a.projectId);
          return {
            label: new Date(a.date).toLocaleDateString(),
            value: `${a.hours} hours`,
            project: project?.name || "Unknown Project",
          };
        });
        break;
      case "SDGs Addressed":
        const sdgProjects = new Map();
        projects.forEach((p: any) => {
          if (p.sdgGoals && Array.isArray(p.sdgGoals)) {
            p.sdgGoals.forEach((sdg: number) => {
              if (!sdgProjects.has(sdg)) {
                sdgProjects.set(sdg, []);
              }
              sdgProjects.get(sdg).push(p.name);
            });
          }
        });
        details.items = Array.from(sdgProjects.entries()).map(([sdg, projectNames]) => ({
          label: `${getSDGName(sdg)} (SDG ${sdg})`,
          value: `${projectNames.length} projects`,
          project: projectNames.slice(0, 3).join(", ") + (projectNames.length > 3 ? "..." : ""),
        }));
        break;
    }

    setSelectedMetric(details);
  };

  // Check if we have any data to display (use backend monthlyImpactData as primary source)
  const hasData = 
    (dashboardData?.monthlyImpactData && dashboardData.monthlyImpactData.length > 0) ||
    projects.length > 0 || 
    projectImpacts.length > 0 || 
    volunteerActivities.length > 0;

  return (
    <div style={{ maxHeight: '100vh', overflowY: 'auto', backgroundColor: '#f9fafb' }}>
      <OrganizationHeader activeTab="reports" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header with Action Buttons */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Impact Visualization</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Visualize the concrete results and impacts of volunteer efforts
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF}
              data-testid="button-export-pdf"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
            
            <div className="flex gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleShareSocial('twitter')}
                data-testid="button-share-twitter"
                title="Share on Twitter"
              >
                <Twitter className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleShareSocial('linkedin')}
                data-testid="button-share-linkedin"
                title="Share on LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleShareSocial('facebook')}
                data-testid="button-share-facebook"
                title="Share on Facebook"
              >
                <Facebook className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCopyLink}
                data-testid="button-copy-link"
                title="Copy link"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!hasData && (
        <Card className="p-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <BarChart className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Impact Data Yet</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
              Start tracking impact by creating projects, logging volunteer activities, and recording impact metrics. 
              Your visualizations will appear here once you have data.
            </p>
            <div className="flex gap-3">
              <Link href="/projects">
                <Button>Create Project</Button>
              </Link>
              <Link href="/mobile-data-collection">
                <Button variant="outline">Log Activity</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {hasData && (
      <div ref={contentRef}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto min-h-[44px]">
          <TabsTrigger value="before-after" className="text-xs sm:text-sm min-h-[44px]">Before & After</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs sm:text-sm min-h-[44px]">Outcomes</TabsTrigger>
          <TabsTrigger value="time-series" className="text-xs sm:text-sm min-h-[44px]">Time Series</TabsTrigger>
        </TabsList>

        <TabsContent value="before-after" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <BeforeAfterComparison data={beforeAfterData} />
            
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-lg sm:text-xl">Impact Stories</CardTitle>
                  <Select 
                    value={selectedProjectIdForStories} 
                    onValueChange={setSelectedProjectIdForStories}
                  >
                    <SelectTrigger className="w-full sm:w-[250px]" data-testid="select-project-impact-stories">
                      <SelectValue placeholder="Choose a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {(() => {
                  const filteredStories = beforeAfterData.filter((item: any) => 
                    selectedProjectIdForStories === "all" || 
                    item.id === selectedProjectIdForStories
                  );
                  
                  if (filteredStories.length === 0) {
                    return (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No impact stories available for this project
                      </p>
                    );
                  }
                  
                  return (
                    <div className="space-y-3 sm:space-y-4">
                      {filteredStories.map((item: any) => (
                        <div key={item.id} className="border-b border-gray-200 dark:border-gray-700 pb-3 sm:pb-4 last:border-0 last:pb-0">
                          <h3 className="font-medium mb-1 text-sm sm:text-base">{item.title}</h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">{item.description}</p>
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm">
                            <span className="text-gray-500 dark:text-gray-400">{item.location}</span>
                            <span className="text-gray-500 dark:text-gray-400">{item.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {projectOutcomes.map((project: any) => (
              <Card key={project.id} className="min-h-[200px] w-full">
                <CardHeader className="pb-3 p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">{project.title}</CardTitle>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {project.sdgs.map((sdg: number) => (
                      <div 
                        key={sdg}
                        className="px-2 py-1 rounded text-white text-xs font-semibold"
                        style={{ 
                          backgroundColor: getSDGColor(sdg)
                        }}
                      >
                        {getSDGName(sdg)}
                      </div>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="space-y-3">
                    {project.outcomes.map((outcome: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center gap-2 min-h-[24px]">
                        <span className="text-xs sm:text-sm">{outcome.metric}</span>
                        <span className="font-medium text-sm sm:text-base whitespace-nowrap">
                          {outcome.value} {outcome.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Impact Score Algorithm Card */}
          {dashboardData?.impactScore !== undefined && (
            <Card className="border-2 border-primary/20">
              <CardHeader className="p-4 sm:p-6 pb-3">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  Impact Score Algorithm
                  <span className="text-3xl font-bold text-primary ml-auto">{dashboardData.impactScore}/100</span>
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Your impact score is calculated using a weighted algorithm combining multiple factors
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Volunteer Hours</span>
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300">35%</span>
                    </div>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {dashboardData.totalHours || 0} hrs
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total volunteer time</p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-red-700 dark:text-red-300">People Impacted</span>
                      <span className="text-xs font-bold text-red-700 dark:text-red-300">30%</span>
                    </div>
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">
                      {aggregatedMetrics?.totalPeople || 0}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Lives directly impacted</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-green-700 dark:text-green-300">Task Completion</span>
                      <span className="text-xs font-bold text-green-700 dark:text-green-300">20%</span>
                    </div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {Math.round(((dashboardData?.completedTasks || 0) / (dashboardData?.totalTasks || 1)) * 100)}%
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Tasks completed</p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">SDG Coverage</span>
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">10%</span>
                    </div>
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {dashboardData?.sdgsAddressed || 0}/17
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">UN SDG goals</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Match Acceptance</span>
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300">5%</span>
                    </div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {(dashboardData?.acceptedApplications || dashboardData?.applicationStats?.accepted || 0)}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Matches accepted</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    <strong>Formula:</strong> Impact Score = (Hours × 0.35) + (People Impacted × 0.30) + (Task Completion × 0.20) + (SDG Coverage × 0.10) + (Match Rate × 0.05)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">
                {currentUser?.userType === 'volunteer' ? 'Your Impact Metrics' : 'Organization Impact Metrics'}
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {currentUser?.userType === 'volunteer' 
                  ? 'Track the impact of your volunteer contributions' 
                  : 'Track your organization\'s collective impact'
                }
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  className="bg-primary/10 border-primary/30 p-4 rounded-lg h-auto flex flex-col items-start hover:bg-primary/20 hover:border-primary/60 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer"
                  onClick={() => handleMetricClick("Total People Impacted", aggregatedMetrics.totalPeople)}
                  data-testid="metric-people-impacted"
                >
                  <div className="text-xs sm:text-sm font-semibold text-primary dark:text-primary-400 mb-1">
                    {currentUser?.userType === 'volunteer' ? 'People You Impacted' : 'Total People Impacted'}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary mt-1">
                    {aggregatedMetrics.totalPeople.toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-primary/70 dark:text-primary-400/70 mt-2 flex items-center gap-1">
                    Click for details →
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="bg-green-500/10 border-green-500/30 p-4 rounded-lg h-auto flex flex-col items-start hover:bg-green-500/20 hover:border-green-500/60 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer"
                  onClick={() => handleMetricClick("Communities Served", aggregatedMetrics.communitiesServed)}
                  data-testid="metric-communities"
                >
                  <div className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400 mb-1">
                    {currentUser?.userType === 'volunteer' ? 'Communities You Served' : 'Communities Served'}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-green-500 mt-1">{aggregatedMetrics.communitiesServed}</div>
                  <div className="text-xs sm:text-sm text-green-600/70 dark:text-green-400/70 mt-2 flex items-center gap-1">
                    Click for details →
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="bg-purple-500/10 border-purple-500/30 p-4 rounded-lg h-auto flex flex-col items-start hover:bg-purple-500/20 hover:border-purple-500/60 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer"
                  onClick={() => handleMetricClick("Volunteer Hours", aggregatedMetrics.totalHours)}
                  data-testid="metric-hours"
                >
                  <div className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400 mb-1">
                    {currentUser?.userType === 'volunteer' ? 'Your Volunteer Hours' : 'Total Volunteer Hours'}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-purple-500 mt-1">
                    {aggregatedMetrics.totalHours.toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-purple-600/70 dark:text-purple-400/70 mt-2 flex items-center gap-1">
                    Click for details →
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="bg-amber-500/10 border-amber-500/30 p-4 rounded-lg h-auto flex flex-col items-start hover:bg-amber-500/20 hover:border-amber-500/60 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer"
                  onClick={() => handleMetricClick("SDGs Addressed", aggregatedMetrics.sdgsAddressed)}
                  data-testid="metric-sdgs"
                >
                  <div className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">SDGs Addressed</div>
                  <div className="text-2xl sm:text-3xl font-bold text-amber-500 mt-1">{aggregatedMetrics.sdgsAddressed}</div>
                  <div className="text-xs sm:text-sm text-amber-600/70 dark:text-amber-400/70 mt-2 flex items-center gap-1">
                    Click for details →
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time-series" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">
                {currentUser?.userType === 'volunteer' ? 'Your Impact Growth Over Time' : 'Organization Impact Growth Over Time'}
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {currentUser?.userType === 'volunteer' 
                  ? 'Track how your volunteer contributions have grown' 
                  : 'Track how your organization\'s impact has grown'
                }
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="h-[300px] sm:h-[400px]">
                <Line 
                  data={impactOverTimeData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      mode: 'index',
                      intersect: false,
                    },
                    plugins: {
                      legend: { display: true, position: 'top' },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        displayColors: true,
                        callbacks: {
                          label: function(context: any) {
                            return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} people`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: { beginAtZero: true },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">
                  {currentUser?.userType === 'volunteer' ? 'Your Hours by Month' : 'Volunteer Hours by Month'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="h-[250px] sm:h-[300px]">
                  <Bar 
                    data={volunteerHoursData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: 'index',
                        intersect: false,
                      },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          padding: 12,
                          titleColor: '#fff',
                          bodyColor: '#fff',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          borderWidth: 1,
                          callbacks: {
                            label: function(context: any) {
                              return `Hours: ${context.parsed.y.toLocaleString()}`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: { beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">
                  {currentUser?.userType === 'volunteer' ? 'Your Impact by SDG' : 'Organization Impact by SDG'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="h-[250px] sm:h-[300px]">
                  <Radar 
                    data={sdgRadarData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: 'index',
                        intersect: false,
                      },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          padding: 12,
                          titleColor: '#fff',
                          bodyColor: '#fff',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          borderWidth: 1,
                          callbacks: {
                            label: function(context: any) {
                              return `Impact Score: ${context.parsed.r.toLocaleString()}`;
                            }
                          }
                        }
                      },
                      scales: {
                        r: { beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
      )}

      {/* Metric Detail Dialog */}
      <Dialog open={!!selectedMetric} onOpenChange={(open) => !open && setSelectedMetric(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMetric?.title}</DialogTitle>
            <DialogDescription>
              Detailed breakdown of {selectedMetric?.title.toLowerCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMetric?.items.map((item: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{item.label}</h4>
                    {item.project && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Project: {item.project}
                      </p>
                    )}
                  </div>
                  {item.value && (
                    <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                      {item.value}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {selectedMetric?.items.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No detailed data available for this metric
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
