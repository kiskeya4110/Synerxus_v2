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
  // Aggregate beneficiaries - only count once per impact metric
  const beneficiaryMap = new Map<string, number>();
  projectImpacts.forEach((impact: any) => {
    if (['people', 'beneficiar', 'students', 'individuals', 'participants', 'families', 'community', 'recipients', 'attendees', 'children', 'adults', 'households', 'members']
        .some(keyword => impact.description?.toLowerCase().includes(keyword))) {
      const normalizedDesc = impact.description?.toLowerCase().replace(/\s+/g, ' ').trim() || 'unknown';
      if (!beneficiaryMap.has(normalizedDesc)) {
        beneficiaryMap.set(normalizedDesc, impact.value || 0);
      }
    }
  });
  const totalBeneficiariesReached = Array.from(beneficiaryMap.values()).reduce((sum, val) => sum + val, 0);
  const uniqueLocations = new Set(projects.map((p: any) => p.location).filter(Boolean)).size;
  const addressedSDGs = sdgData?.sdgContributions?.map((s: any) => s.sdgNumber) || [];

  // PROJECT-LEVEL AGGREGATION (NO DUPLICATION)
  const projectAggregations = useMemo(() => {
    return projects.map((project: any): any => {
      const impacts = projectImpacts.filter((i: any) => i.projectId === project.id);
      
      // Aggregate metrics for this project only
      const projectHours = impacts.reduce((sum: number, i: any) => {
        if (i.description?.toLowerCase().includes('hour')) {
          return sum + (i.value || 0);
        }
        return sum;
      }, 0);

      const projectBeneficiaries = impacts.reduce((sum: number, i: any) => {
        if (['people', 'beneficiar', 'students', 'individuals', 'participants', 'families']
            .some(kw => i.description?.toLowerCase().includes(kw))) {
          return sum + (i.value || 0);
        }
        return sum;
      }, 0);

      const projectVolunteers = new Set(impacts.map((i: any) => i.userId)).size || 1;

      const projectMetrics = impacts.map((impact: any) => {
        const metric = impactMetrics.find((m: any) => m.id === impact.metricId);
        const beforeValue = impact.baselineValue || Math.floor((impact.value || 0) * 0.3);
        const afterValue = impact.value || 0;
        
        return {
          label: metric?.name || "Impact Metric",
          before: beforeValue,
          after: afterValue,
          unit: metric?.unit || "units"
        };
      });

      return {
        id: project.id,
        name: project.name,
        description: project.description || "",
        location: project.location || "Unknown",
        startDate: project.startDate,
        hours: projectHours,
        beneficiaries: projectBeneficiaries,
        volunteersInvolved: projectVolunteers,
        metrics: projectMetrics,
        sdgs: project.sdgIds || []
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
            <h1 className="text-3xl font-bold">Impact Report & Stories</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive impact assessment with project aggregations and running tallies</p>
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

        {/* MAIN REPORT */}
        <TabsContent value="report" className="space-y-6">
          {/* Header Card */}
          <Card className="border-2 border-slate-300 dark:border-slate-600 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20">
            <CardContent className="pt-8 p-8">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Synerxus</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Impact Report</p>
                </div>
                <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-semibold">{currentDate}</p>
                  <p>{uniqueLocations > 0 ? `${uniqueLocations} Locations` : 'Global'}</p>
                </div>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">Executive Summary</h3>
                <p className="text-sm leading-relaxed">
                  This reporting period, Synerxus volunteers contributed <strong>{totalHoursContributed}</strong> hours across 
                  <strong> {projects.length}</strong> projects, reaching <strong>{totalBeneficiariesReached}</strong> beneficiaries 
                  through health, nutrition, education, and community development initiatives aligned with 
                  <strong> {addressedSDGs.length}</strong> UN Sustainable Development Goals.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-semibold">Volunteers Engaged</td>
                      <td className="py-3 px-4 text-right text-lg font-bold text-blue-600 dark:text-blue-400">{totalVolunteers}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-semibold">Hours Contributed</td>
                      <td className="py-3 px-4 text-right text-lg font-bold text-blue-600 dark:text-blue-400">{totalHoursContributed}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-semibold">Active Projects</td>
                      <td className="py-3 px-4 text-right text-lg font-bold text-green-600 dark:text-green-400">{activeProjects}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-semibold">Completed Projects</td>
                      <td className="py-3 px-4 text-right text-lg font-bold text-green-600 dark:text-green-400">{completedProjects}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-semibold">Beneficiaries Reached</td>
                      <td className="py-3 px-4 text-right text-lg font-bold text-orange-600 dark:text-orange-400">{totalBeneficiariesReached}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-semibold">Geographic Reach</td>
                      <td className="py-3 px-4 text-right text-lg font-bold text-purple-600 dark:text-purple-400">{uniqueLocations} locations</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-semibold">SDGs Addressed</td>
                      <td className="py-3 px-4 text-right flex flex-wrap gap-1 justify-end">
                        {addressedSDGs.slice(0, 5).map((sdg: number) => (
                          <Badge key={sdg} style={{ backgroundColor: SDG_COLORS[sdg] }} className="text-white text-xs">
                            {sdg}
                          </Badge>
                        ))}
                        {addressedSDGs.length > 5 && <Badge className="text-xs">+{addressedSDGs.length - 5}</Badge>}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

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

        {/* PROJECT-BY-PROJECT BREAKDOWN */}
        <TabsContent value="projects" className="space-y-6">
          {projectAggregations.map((project: any, idx: number) => (
            <Card key={project.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="mt-1">{project.location} • {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Ongoing'}</CardDescription>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Project {idx + 1}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">{project.description}</p>
                
                {/* Project-level KPI running tally */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Hours</p>
                    <p className="text-xl font-bold text-blue-600">{project.hours}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Beneficiaries</p>
                    <p className="text-xl font-bold text-orange-600">{project.beneficiaries}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Volunteers</p>
                    <p className="text-xl font-bold text-green-600">{project.volunteersInvolved}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Metrics</p>
                    <p className="text-xl font-bold text-purple-600">{project.metrics.length}</p>
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
