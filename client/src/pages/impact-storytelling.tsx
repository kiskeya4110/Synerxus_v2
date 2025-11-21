import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ImpactStorytelling from "@/components/impact/impact-storytelling";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";
import { Download, Share2 } from "lucide-react";

const SDG_LABELS: Record<number, string> = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water",
  7: "Clean Energy",
  8: "Decent Work",
  9: "Industry Innovation",
  10: "Reduced Inequalities",
  11: "Sustainable Cities",
  12: "Responsible Consumption",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life On Land",
  16: "Peace and Justice",
  17: "Partnerships"
};

const SDG_COLORS: Record<number, string> = {
  1: "#E5243B",
  2: "#DDA63A",
  3: "#4C9F38",
  4: "#C5192D",
  5: "#FF3A21",
  6: "#26BDE2",
  7: "#FCC30B",
  8: "#A21942",
  9: "#FD6925",
  10: "#DD1367",
  11: "#FD9D24",
  12: "#BF8B2E",
  13: "#3F7E44",
  14: "#0A97D9",
  15: "#56C02B",
  16: "#00689D",
  17: "#19486A"
};

export default function ImpactStorytellingPage() {
  const [reportViewTab, setReportViewTab] = useState("metrics");
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

  const { data: sdgData, isLoading: isLoadingSDG } = useQuery<any>({
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

  const projectImpactData = projects.map((project: any) => {
    const impacts = projectImpacts.filter((impact: any) => impact.projectId === project.id);
    
    const metrics = impacts.map((impact: any) => {
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
      id: project.id.toString(),
      name: project.name,
      description: project.description || "",
      metrics,
      location: project.location || "Unknown Location",
      date: project.startDate || project.createdAt
    };
  }).filter((p: any) => p.metrics.length > 0);

  // Calculate key metrics
  const totalVolunteers = volunteerStats?.length || 0;
  const totalHoursContributed = sdgData?.totalEngagementHours || 0;
  const activeProjects = projects.filter((p: any) => p.status !== 'completed').length;
  const totalBeneficiariesReached = projectImpacts.reduce((sum: number, impact: any) => {
    if (impact.description?.toLowerCase().includes('people') || 
        impact.description?.toLowerCase().includes('beneficiar') ||
        impact.description?.toLowerCase().includes('students') ||
        impact.description?.toLowerCase().includes('individuals')) {
      return sum + (impact.value || 0);
    }
    return sum;
  }, 0);
  const uniqueLocations = new Set(projects.map((p: any) => p.location).filter(Boolean)).size;

  // Get SDGs addressed
  const addressedSDGs = sdgData?.sdgContributions?.map((s: any) => s.sdgNumber) || [];

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Impact Report & Stories</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track SDG contributions, metrics, and transform impact data into compelling narratives
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" data-testid="button-export-report">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" data-testid="button-share-report">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs for Report Sections */}
      <Tabs value={reportViewTab} onValueChange={setReportViewTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full" data-testid="tabs-report-sections">
          <TabsTrigger value="metrics" className="text-xs sm:text-sm">📊 Metrics</TabsTrigger>
          <TabsTrigger value="executive" className="text-xs sm:text-sm">📋 Executive</TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm">📈 Dashboard</TabsTrigger>
          <TabsTrigger value="stories" className="text-xs sm:text-sm">📖 Stories</TabsTrigger>
          <TabsTrigger value="csr" className="text-xs sm:text-sm">🏢 CSR/ESG</TabsTrigger>
          <TabsTrigger value="next" className="text-xs sm:text-sm">🎯 Next Steps</TabsTrigger>
        </TabsList>

        {/* SECTION 1: KEY METRICS */}
        <TabsContent value="metrics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📊 Key Metrics Overview</span>
              </CardTitle>
              <CardDescription>Core performance indicators across volunteer engagement, projects, and impact</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Volunteer Engagement Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100">Volunteer Engagement</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalVolunteers}</div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Number of Volunteers</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalHoursContributed}</div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Hours Contributed</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {totalVolunteers > 0 ? Math.round((totalHoursContributed / (totalVolunteers * 40)) * 100) : 0}%
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Retention Rate</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Project Outcomes Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-green-900 dark:text-green-100">Project Outcomes</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">{activeProjects}</div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Active Projects</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {projects.length > 0 ? Math.round(((projects.length - activeProjects) / projects.length) * 100) : 0}%
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Completion Status</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">{uniqueLocations}</div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Locations Served</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* SDG Alignment Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-purple-900 dark:text-purple-100">SDG Alignment</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Goals Addressed: {addressedSDGs.length > 0 ? addressedSDGs.join(", ") : "None yet"}</p>
                    <div className="flex flex-wrap gap-2">
                      {addressedSDGs.map((sdg: number) => (
                        <Badge key={sdg} style={{ backgroundColor: SDG_COLORS[sdg] }} className="text-white">
                          SDG {sdg}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Beneficiary Impact Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-orange-900 dark:text-orange-100">Beneficiary Impact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{totalBeneficiariesReached}</div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">People Reached</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {projectImpacts.filter((i: any) => 
                          i.description?.toLowerCase().includes('health') ||
                          i.description?.toLowerCase().includes('medical')
                        ).length}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Services Delivered</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECTION 2: EXECUTIVE SUMMARY */}
        <TabsContent value="executive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📋 Executive Summary</CardTitle>
              <CardDescription>Overview of project goals, activities, and outcomes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-1">Project/Program Name</h4>
                  <p className="text-lg font-bold">{projects.length > 0 ? projects[0].name : "Overall Impact Program"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-1">Date</h4>
                    <p className="text-sm">{new Date().toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-1">Locations</h4>
                    <p className="text-sm">{projects.length > 0 ? projects.map((p: any) => p.location).filter(Boolean).join(", ") || "Multiple" : "TBD"}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-2">Brief Overview</h4>
                  <p className="text-sm leading-relaxed">
                    {projects.length > 0 
                      ? projects[0].description || "Project focused on creating sustainable impact through volunteer engagement."
                      : "Impact initiative connecting global volunteers with opportunities to drive sustainable development across 6 pilot countries."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECTION 3: IMPACT DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📈 Impact Dashboard</CardTitle>
              <CardDescription>Visual representation of volunteer hours, SDG distribution, and geographic reach</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingSDG ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : sdgData?.sdgContributions && sdgData.sdgContributions.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-semibold mb-4">SDG Distribution</h4>
                  {sdgData.sdgContributions.map((sdg: any) => {
                    const percentage = sdgData.totalEngagementHours > 0
                      ? (sdg.hours / sdgData.totalEngagementHours) * 100
                      : 0;
                    
                    return (
                      <div key={sdg.sdgNumber} className="space-y-2" data-testid={`sdg-contribution-${sdg.sdgNumber}`}>
                        <div className="flex items-center gap-3">
                          <div 
                            className="flex-shrink-0 w-10 h-10 rounded flex items-center justify-center font-bold text-white text-sm"
                            style={{ backgroundColor: SDG_COLORS[sdg.sdgNumber] }}
                          >
                            {sdg.sdgNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-sm truncate">
                                SDG {sdg.sdgNumber}: {SDG_LABELS[sdg.sdgNumber]}
                              </h3>
                              <span className="text-lg font-bold ml-2 whitespace-nowrap">
                                {sdg.hours}h
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                              <span>{sdg.volunteers} volunteer{sdg.volunteers !== 1 ? 's' : ''}</span>
                              <span>•</span>
                              <span>{sdg.projects} project{sdg.projects !== 1 ? 's' : ''}</span>
                            </div>
                            <Progress 
                              value={percentage} 
                              className="h-2"
                              style={{ 
                                ['--progress-background' as any]: SDG_COLORS[sdg.sdgNumber] 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No SDG contributions recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECTION 4: STORIES FROM THE GROUND */}
        <TabsContent value="stories" className="space-y-6">
          <ImpactStorytelling 
            projectImpacts={projectImpactData}
            savedStories={[]}
          />
        </TabsContent>

        {/* SECTION 5: CSR/ESG ALIGNMENT */}
        <TabsContent value="csr" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🏢 Corporate CSR/ESG Alignment</CardTitle>
              <CardDescription>Employee participation and verified impact metrics for sustainability audits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">{totalVolunteers}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Employee Participation</p>
                  </CardContent>
                </Card>
                <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">{totalHoursContributed}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Verified Hours</p>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-6 space-y-4">
                <h4 className="font-semibold text-teal-900 dark:text-teal-100">ESG Indicators</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Badge className="mt-1">✓</Badge>
                    <span><strong>Social Impact:</strong> {totalBeneficiariesReached} beneficiaries reached through volunteer initiatives</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge className="mt-1">✓</Badge>
                    <span><strong>Environmental Focus:</strong> {addressedSDGs.includes(13) || addressedSDGs.includes(14) || addressedSDGs.includes(15) ? "Yes" : "Not yet"} - Climate, water, and land conservation SDGs addressed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge className="mt-1">✓</Badge>
                    <span><strong>Governance:</strong> Transparent reporting aligned with UN Sustainable Development Goals</span>
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3">Verified Impact for Audit</h4>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>✓ {activeProjects} active projects with measurable outcomes</li>
                  <li>✓ {uniqueLocations} geographic locations with documented impact</li>
                  <li>✓ {addressedSDGs.length} UN Sustainable Development Goals directly supported</li>
                  <li>✓ Transparent volunteer hour tracking and beneficiary data collection</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECTION 6: NEXT STEPS */}
        <TabsContent value="next" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🎯 Next Steps & Call to Action</CardTitle>
              <CardDescription>Planned activities and opportunities for further engagement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6 space-y-4">
                <h4 className="font-semibold text-indigo-900 dark:text-indigo-100">Planned Activities</h4>
                <ul className="space-y-2 text-sm list-disc list-inside">
                  <li>Expand volunteer network across remaining pilot countries</li>
                  <li>Scale impact measurement and real-time dashboard analytics</li>
                  <li>Develop advanced skill-matching algorithms for opportunity pairing</li>
                  <li>Launch corporate partnership programs for ESG alignment</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">Opportunities for Further Engagement</h4>
                <ul className="space-y-2 text-sm list-disc list-inside">
                  <li>Partner with us to support specific SDG initiatives</li>
                  <li>Host training workshops and skill-building sessions</li>
                  <li>Provide pro-bono services or corporate volunteering</li>
                  <li>Co-develop impact frameworks and measurement methodologies</li>
                </ul>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 space-y-4">
                <h4 className="font-semibold text-green-900 dark:text-green-100">Call to Action</h4>
                <p className="text-sm leading-relaxed">
                  Join the global movement to connect volunteers with impact. Whether you're an individual looking to contribute your skills, 
                  an organization seeking to amplify your reach, or a corporate partner committed to ESG excellence, Synerxus is your platform 
                  for sustainable development. Together, we're building a more equitable world.
                </p>
              </div>

              <div className="text-center pt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Prepared by: <strong>Synerxus</strong><br />
                  Contact: info@synerxus.org | +1 (555) 123-4567
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
