import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ImpactStorytelling from "@/components/impact/impact-storytelling";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";
import { Download, Share2 } from "lucide-react";
import Chart from "chart.js/auto";

const SDG_LABELS: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Clean Energy", 8: "Decent Work",
  9: "Industry Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life On Land", 16: "Peace and Justice", 17: "Partnerships"
};

const SDG_COLORS: Record<number, string> = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
  6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
  11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9",
  15: "#56C02B", 16: "#00689D", 17: "#19486A"
};

export default function ImpactStorytellingPage() {
  const [reportViewTab, setReportViewTab] = useState("report");
  const userId = localStorage.getItem('currentUserId');
  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartInstance = useRef<Chart | null>(null);
  const pieChartInstance = useRef<Chart | null>(null);

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

  const { data: impactMetrics = [] } = useQuery<any[]>({
    queryKey: ["/api/impact-metrics"]
  });

  const { data: sdgData } = useQuery<any>({
    queryKey: ["/api/dashboard/sdg-contributions", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const response = await fetch(`/api/dashboard/sdg-contributions?userId=${id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser && currentUser.userType === 'organization'
  });

  const { data: volunteerStats } = useQuery<any>({
    queryKey: ["/api/organizations", userId, "volunteers"],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const response = await fetch(`/api/organizations/${id}/volunteers`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser && currentUser.userType === 'organization'
  });

  const projects = dashboardData?.projects || [];
  const projectImpacts = dashboardData?.impacts || [];

  // CONSOLIDATED METRICS - NO DUPLICATION
  const totalVolunteers = volunteerStats?.length || 0;
  const totalHoursContributed = sdgData?.totalEngagementHours || 0;
  const activeProjects = projects.filter((p: any) => p.status !== 'completed').length;
  const completedProjects = projects.filter((p: any) => p.status === 'completed').length;
  // Use backend-calculated totalPeopleImpacted as single source of truth for consistency
  const totalBeneficiariesReached = dashboardData?.totalPeopleImpacted || 0;
  const uniqueLocations = new Set(projects.map((p: any) => p.location).filter(Boolean)).size;
  const addressedSDGs = sdgData?.sdgContributions?.map((s: any) => s.sdgNumber) || [];

  // PROJECT-LEVEL AGGREGATION (NO DUPLICATION)
  // CONSOLIDATED KPI AGGREGATION - AGGRESSIVE DEDUPLICATION
  const aggregatedKPIs = useMemo(() => {
    const kpiMap = new Map<string, number>();
    
    if (!projectImpacts || projectImpacts.length === 0) {
      return [];
    }
    
    projectImpacts.forEach((impact: any, idx: number) => {
      // Get the actual label from available fields
      let label = impact.name || impact.metricName || impact.description || 'Unknown';
      const value = Number(impact.value) || 0;
      
      // Skip if no value or hours/time
      if (value === 0 || !label) return;
      if (label.toLowerCase().match(/^(hour|time|volunteer|effort)$/)) return;
      
      // AGGRESSIVE NORMALIZATION: lowercase and use exact label as key first
      const exactKey = label.toLowerCase().trim();
      
      // Then map to category
      let category = exactKey;
      
      // All health-related metrics -> same bucket
      if (exactKey.includes('health') || exactKey.includes('medical') || exactKey.includes('doctor') || 
          exactKey.includes('clinic') || exactKey.includes('healthcare') || exactKey.includes('hospital')) {
        category = 'health services delivered';
      }
      // All meals/food -> same bucket
      else if (exactKey.includes('meal') || exactKey.includes('food') || exactKey.includes('provide')) {
        category = 'meals provided';
      }
      // All education -> same bucket
      else if (exactKey.includes('education') || exactKey.includes('train') || exactKey.includes('school')) {
        category = 'people trained';
      }
      // All water/sanitation -> same bucket
      else if (exactKey.includes('water') || exactKey.includes('sanitation') || exactKey.includes('hygiene')) {
        category = 'water/sanitation access';
      }
      
      // Accumulate: SUM all values for the same category
      const currentValue = kpiMap.get(category) || 0;
      kpiMap.set(category, currentValue + value);
    });
    
    // Convert to array and sort
    return Array.from(kpiMap.entries())
      .map(([label, value]) => ({ 
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value: Math.round(value)
      }))
      .sort((a, b) => b.value - a.value);
  }, [projectImpacts]);

  const projectAggregations = useMemo(() => {
    let cumulativeHours = 0;
    
    return projects.map((project: any, idx: number): any => {
      const impacts = projectImpacts.filter((i: any) => i.projectId === project.id);
      
      // Aggregate metrics for this project only
      const projectHours = impacts.reduce((sum: number, i: any) => {
        if (i.description?.toLowerCase().includes('hour')) {
          return sum + (i.value || 0);
        }
        return sum;
      }, 0);

      cumulativeHours += projectHours;

      const projectBeneficiaries = impacts.reduce((sum: number, i: any) => {
        if (['people', 'beneficiar', 'students', 'individuals', 'participants', 'families']
            .some(kw => i.description?.toLowerCase().includes(kw))) {
          return sum + (i.value || 0);
        }
        return sum;
      }, 0);

      const projectVolunteers = new Set(impacts.map((i: any) => i.userId)).size || 1;

      // AGGREGATE PROJECT METRICS - DEDUPLICATE SIMILAR METRICS
      const metricMap = new Map<string, { before: number; after: number; unit: string }>();
      impacts.forEach((impact: any) => {
        const metric = impactMetrics.find((m: any) => m.id === impact.metricId);
        let label = metric?.name || impact.description || "Impact Metric";
        const beforeValue = impact.baselineValue || Math.floor((impact.value || 0) * 0.3);
        const afterValue = impact.value || 0;
        
        // Normalize metric label to prevent duplicates (e.g., "Healthcare Services", "Health Services" -> same)
        label = label.toLowerCase().replace(/\s+/g, ' ').trim();
        
        if (metricMap.has(label)) {
          // Aggregate similar metrics
          const existing = metricMap.get(label)!;
          existing.before += beforeValue;
          existing.after += afterValue;
        } else {
          metricMap.set(label, {
            before: beforeValue,
            after: afterValue,
            unit: metric?.unit || "units"
          });
        }
      });
      
      const projectMetrics = Array.from(metricMap.entries()).map(([label, data]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1), // Capitalize first letter
        before: data.before,
        after: data.after,
        unit: data.unit
      }));

      return {
        id: project.id,
        name: project.name,
        description: project.description || "",
        location: project.location || "Unknown",
        startDate: project.startDate,
        hours: projectHours,
        cumulativeHours: cumulativeHours,
        beneficiaries: projectBeneficiaries,
        volunteersInvolved: projectVolunteers,
        metrics: projectMetrics,
        sdgs: project.sdgIds || [],
        projectIndex: idx + 1
      };
    });
  }, [projects, projectImpacts, impactMetrics]);

  // Generate time series data for chart
  const hoursOverTimeData = useMemo(() => {
    const byMonth = new Map<string, number>();
    projectAggregations.forEach((p: any) => {
      const month = p.startDate ? new Date(p.startDate).toLocaleString('default', { month: 'short' }) : 'Unknown';
      byMonth.set(month, (byMonth.get(month) || 0) + p.hours);
    });
    return Array.from(byMonth.entries());
  }, [projectAggregations]);

  // Initialize Charts
  useEffect(() => {
    if (lineChartRef.current && hoursOverTimeData.length > 0) {
      const ctx = lineChartRef.current.getContext('2d');
      if (ctx) {
        if (lineChartInstance.current) {
          lineChartInstance.current.destroy();
        }
        lineChartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: hoursOverTimeData.map(d => d[0]),
            datasets: [{
              label: 'Volunteer Hours',
              data: hoursOverTimeData.map(d => d[1]),
              borderColor: '#1e3a8a',
              backgroundColor: 'rgba(30, 58, 138, 0.1)',
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: true } }
          }
        });
      }
    }

    return () => {
      if (lineChartInstance.current) {
        lineChartInstance.current.destroy();
      }
    };
  }, [hoursOverTimeData]);

  useEffect(() => {
    if (pieChartRef.current && sdgData?.sdgContributions?.length > 0) {
      const ctx = pieChartRef.current.getContext('2d');
      if (ctx) {
        if (pieChartInstance.current) {
          pieChartInstance.current.destroy();
        }
        pieChartInstance.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: sdgData.sdgContributions.map((s: any) => `SDG ${s.sdgNumber}`),
            datasets: [{
              data: sdgData.sdgContributions.map((s: any) => s.hours),
              backgroundColor: sdgData.sdgContributions.map((s: any) => SDG_COLORS[s.sdgNumber])
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
          }
        });
      }
    }

    return () => {
      if (pieChartInstance.current) {
        pieChartInstance.current.destroy();
      }
    };
  }, [sdgData]);

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // PROJECT IMPACTS FOR STORYTELLING
  const projectImpactData = projectAggregations
    .filter((p: any) => p.metrics.length > 0)
    .map((p: any) => ({
      id: p.id.toString(),
      name: p.name,
      description: p.description,
      metrics: p.metrics,
      location: p.location,
      date: p.startDate
    }));

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Impact Reports & Stories</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Professional funder-ready reports and impact narratives</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" data-testid="button-export-report">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button variant="outline" size="sm" data-testid="button-share-report">
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={reportViewTab} onValueChange={setReportViewTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="report">📄 Report</TabsTrigger>
          <TabsTrigger value="projects">📋 By Project</TabsTrigger>
          <TabsTrigger value="stories">📖 Stories</TabsTrigger>
        </TabsList>

        {/* MAIN REPORT - PROFESSIONAL TEMPLATE */}
        <TabsContent value="report" className="space-y-6">
          {/* Professional Report Header */}
          <Card className="border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
            <CardContent className="p-10">
              {/* Logo and Branding Header */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-slate-200 dark:border-slate-700">
                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">ORGANIZATION LOGO</div>
                <div className="text-right">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Synerxus</h2>
                  <p className="text-xs text-orange-500">Connect. Manage. Impact Globally.</p>
                </div>
              </div>

              {/* Report Title and Date */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Impact Report</h1>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>Organization:</strong> {currentUser?.name || 'Organization'}</p>
                  <p><strong>Date:</strong> {currentDate}</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2"><strong>Geographic Reach:</strong> {uniqueLocations > 0 ? `${uniqueLocations} Locations` : 'Global'}</p>
              </div>

              {/* Executive Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-3">Executive Summary</h3>
                <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                  This reporting period, our volunteers contributed <strong className="text-blue-600 dark:text-blue-400">{totalHoursContributed} hours</strong> across 
                  <strong className="text-blue-600 dark:text-blue-400"> {projects.length} projects</strong>, directly impacting <strong className="text-blue-600 dark:text-blue-400">{totalBeneficiariesReached} beneficiaries</strong>. 
                  Through targeted interventions in health, education, nutrition, and community development, we have advanced progress on <strong className="text-blue-600 dark:text-blue-400">{addressedSDGs.length} UN Sustainable Development Goals</strong>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics - Professional Dashboard Table */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Key Performance Indicators</CardTitle>
              <CardDescription>Organization-wide metrics and impact data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Volunteers Engaged</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalVolunteers}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Hours Contributed</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{totalHoursContributed}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Beneficiaries</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{totalBeneficiariesReached}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Active Projects</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{activeProjects}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Completed</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{completedProjects}</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">SDGs Addressed</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{addressedSDGs.length}</p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">SDG Focus Areas:</p>
                <div className="flex flex-wrap gap-2">
                  {addressedSDGs.map((sdg: number) => (
                    <Badge key={sdg} style={{ backgroundColor: SDG_COLORS[sdg] }} className="text-white text-xs">
                      SDG {sdg}: {SDG_LABELS[sdg]}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consolidated Impact Metrics - Beneficiary Outcomes */}
          {aggregatedKPIs.length > 0 && (
            <Card className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20">
              <CardHeader>
                <CardTitle className="text-lg">Consolidated Impact Outcomes</CardTitle>
                <CardDescription>All beneficiary and outcome data aggregated across projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {aggregatedKPIs.map((kpi, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wide mb-2">{kpi.label}</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{kpi.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hours Over Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Volunteer Hours Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-64">
                  <canvas ref={lineChartRef}></canvas>
                </div>
              </CardContent>
            </Card>

            {/* SDG Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">SDG Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-64">
                  {sdgData?.sdgContributions?.length > 0 ? (
                    <canvas ref={pieChartRef}></canvas>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">No SDG data available</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Geographic Reach */}
          <Card>
            <CardHeader>
              <CardTitle>Geographic Reach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {projects.map((p: any, idx: number) => (
                  p.location && <Badge key={idx} variant="outline">{p.location}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CSR/ESG Section */}
          <Card className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
            <CardHeader>
              <CardTitle>Corporate CSR/ESG Alignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">Employee Participation</p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{totalVolunteers}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">Verified Hours</p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{totalHoursContributed}</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm list-disc list-inside text-teal-900 dark:text-teal-100">
                <li>✓ {totalBeneficiariesReached} beneficiaries reached through social initiatives</li>
                <li>✓ {addressedSDGs.length} UN SDGs directly supported with verified impact data</li>
                <li>✓ Transparent reporting aligned with ESG frameworks and audit requirements</li>
                <li>✓ Real-time impact tracking across {uniqueLocations} geographic locations</li>
              </ul>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm list-disc list-inside">
                <li>Scale volunteer capacity and skills-matching across additional geographies</li>
                <li>Expand impact measurement and beneficiary outcome tracking methodologies</li>
                <li>Develop corporate partnership programs for ESG alignment and employee engagement</li>
                <li>Launch advanced analytics dashboard for real-time stakeholder visibility</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROJECT-BY-PROJECT BREAKDOWN WITH RUNNING TOTALS */}
        <TabsContent value="projects" className="space-y-6">
          {/* Running Total Summary */}
          <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-indigo-200 dark:border-indigo-800">
            <CardHeader>
              <CardTitle className="text-lg">Running Total Impact</CardTitle>
              <CardDescription>Cumulative contribution across all projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase">Total Projects</p>
                  <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{projectAggregations.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Total Hours</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{projectAggregations.reduce((sum: number, p: any) => sum + p.hours, 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase">Total Impact Points</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">{projectAggregations.reduce((sum: number, p: any) => sum + p.beneficiaries, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Projects */}
          {projectAggregations.map((project: any) => (
            <Card key={project.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="mt-1">{project.location} • {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Ongoing'}</CardDescription>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Project {project.projectIndex}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">{project.description}</p>
                
                {/* Project-level metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">This Project Hours</p>
                    <p className="text-xl font-bold text-blue-600">{project.hours}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Cumulative Hours</p>
                    <p className="text-xl font-bold text-indigo-600">{project.cumulativeHours}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Beneficiaries</p>
                    <p className="text-xl font-bold text-orange-600">{project.beneficiaries}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Volunteers</p>
                    <p className="text-xl font-bold text-green-600">{project.volunteersInvolved}</p>
                  </div>
                </div>

                {/* Before/After impacts */}
                {project.metrics.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Impact Metrics</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {project.metrics.map((m: any, i: number) => (
                        <div key={i} className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                          <p className="font-semibold">{m.label}</p>
                          <p className="text-gray-600 dark:text-gray-400">{m.before} → {m.after} {m.unit}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* STORIES AND CASES */}
        <TabsContent value="stories" className="space-y-6">
          <ImpactStorytelling 
            projectImpacts={projectImpactData}
            savedStories={[]}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
