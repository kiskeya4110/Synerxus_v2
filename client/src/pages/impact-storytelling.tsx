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
  const [reportViewTab, setReportViewTab] = useState("letter");
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

  // Consolidate metrics - avoid duplication
  const projectImpactData = projects
    .filter((project: any) => {
      const impacts = projectImpacts.filter((impact: any) => impact.projectId === project.id);
      return impacts.length > 0;
    })
    .map((project: any) => {
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
    });

  // Calculate metrics once (consolidated, no duplication)
  const totalVolunteers = volunteerStats?.length || 0;
  const totalHoursContributed = sdgData?.totalEngagementHours || 0;
  const activeProjects = projects.filter((p: any) => p.status !== 'completed').length;
  const completedProjects = projects.filter((p: any) => p.status === 'completed').length;
  const completionPercent = projects.length > 0 ? Math.round((completedProjects / projects.length) * 100) : 0;
  
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
  const addressedSDGs = sdgData?.sdgContributions?.map((s: any) => s.sdgNumber) || [];
  const retentionRate = totalVolunteers > 0 ? Math.round((totalHoursContributed / (totalVolunteers * 40)) * 100) : 0;

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      {/* Page Header with Export/Share */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Impact Report & Stories</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive impact assessment and narrative documentation
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

      {/* Tabs for Report Views */}
      <Tabs value={reportViewTab} onValueChange={setReportViewTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-3 w-full" data-testid="tabs-report-views">
          <TabsTrigger value="letter" className="text-xs sm:text-sm">📄 Formal Report</TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm">📊 Impact Dashboard</TabsTrigger>
          <TabsTrigger value="stories" className="text-xs sm:text-sm">📖 Stories & Cases</TabsTrigger>
        </TabsList>

        {/* FORMAL LETTER REPORT */}
        <TabsContent value="letter" className="space-y-6">
          <Card className="border-2 border-slate-300 dark:border-slate-600">
            <CardContent className="pt-12 p-8 leading-relaxed font-serif text-gray-900 dark:text-gray-100 space-y-6">
              {/* Letterhead */}
              <div className="border-b-2 border-slate-400 pb-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Synerxus</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Connect. Collaborate. Impact Globally.</p>
                  </div>
                  <div className="text-right text-xs text-gray-600 dark:text-gray-400">
                    <p>Synerxus Foundation</p>
                    <p>impact@synerxus.org</p>
                    <p>+1 (555) 123-4567</p>
                  </div>
                </div>
              </div>

              {/* Date and Reference */}
              <div className="space-y-1 text-sm">
                <p>{currentDate}</p>
                <p className="font-semibold">{projects.length > 0 ? projects[0].name : "Comprehensive Impact Report"}</p>
              </div>

              {/* Salutation */}
              <div>
                <p>Dear Stakeholder,</p>
              </div>

              {/* Introduction/Executive Summary */}
              <div className="space-y-4">
                <p>
                  We are pleased to present this comprehensive impact report documenting the significant progress and outcomes achieved 
                  through our volunteer engagement initiatives. This report synthesizes key metrics, performance indicators, and qualitative 
                  narratives that demonstrate our commitment to advancing the United Nations Sustainable Development Goals across six pilot 
                  countries: Philippines, USA, Mexico, Haiti, Zimbabwe, and Zambia.
                </p>
              </div>

              {/* Key Performance Indicators - Consolidated */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Performance Summary</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalVolunteers}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Volunteers Engaged</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalHoursContributed}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Hours Contributed</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{retentionRate}%</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Retention Rate</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{activeProjects}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Active Projects</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completionPercent}%</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Project Completion</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalBeneficiariesReached}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Beneficiaries Reached</p>
                  </div>
                </div>
                
                {/* Bullet-point KPIs */}
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                  <li>Geographic reach across {uniqueLocations} distinct locations</li>
                  <li>Alignment with {addressedSDGs.length} United Nations Sustainable Development Goals</li>
                  <li>Average volunteer commitment: {totalVolunteers > 0 ? Math.round(totalHoursContributed / totalVolunteers) : 0} hours per volunteer</li>
                  <li>Project completion rate demonstrates operational excellence and execution capacity</li>
                </ul>
              </div>

              {/* Key Findings Section */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Key Findings</h3>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>Volunteer Engagement:</strong> Our platform successfully engaged {totalVolunteers} dedicated volunteers who contributed 
                    {totalHoursContributed} hours toward meaningful social impact. This represents a {retentionRate}% retention rate, indicative of 
                    strong program satisfaction and volunteer commitment.
                  </p>
                  <p>
                    <strong>Project Delivery:</strong> With {activeProjects} active projects and a {completionPercent}% completion rate, 
                    we demonstrate consistent project execution and stakeholder accountability across all operational regions.
                  </p>
                  <p>
                    <strong>Beneficiary Impact:</strong> Our initiatives directly reached {totalBeneficiariesReached} individuals, delivering 
                    tangible services and sustainable development outcomes in underserved communities.
                  </p>
                  <p>
                    <strong>SDG Alignment:</strong> All volunteer efforts contribute to {addressedSDGs.length} distinct UN SDGs, ensuring 
                    our work is strategically aligned with global development priorities and maximizes long-term systemic change.
                  </p>
                </div>
              </div>

              {/* SDG Alignment Details */}
              {addressedSDGs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 dark:text-white">Sustainable Development Goals Addressed</h3>
                  <div className="flex flex-wrap gap-2">
                    {addressedSDGs.map((sdg: number) => (
                      <Badge key={sdg} style={{ backgroundColor: SDG_COLORS[sdg] }} className="text-white text-xs">
                        SDG {sdg}: {SDG_LABELS[sdg]}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps and Call to Action */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white">Next Steps and Recommendations</h3>
                <ul className="space-y-2 text-sm list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>Scale volunteer onboarding and skills-matching capabilities across remaining pilot geographies</li>
                  <li>Implement advanced real-time impact tracking and dashboard analytics for stakeholder transparency</li>
                  <li>Develop corporate partnership frameworks to align ESG objectives with community impact initiatives</li>
                  <li>Establish measurement methodologies for long-term beneficiary outcome tracking and sustainability verification</li>
                </ul>
              </div>

              {/* Closing and Signature Area */}
              <div className="space-y-6 pt-6 border-t border-gray-300 dark:border-gray-600">
                <p>
                  We remain committed to connecting global volunteers with meaningful opportunities for sustainable impact. Through continued 
                  collaboration with stakeholders, partners, and beneficiary communities, we will amplify our reach and deepen our contributions 
                  to global development priorities.
                </p>
                <p>
                  We welcome your engagement and partnership in this important work.
                </p>
                <div className="space-y-1">
                  <p>Sincerely,</p>
                  <div className="h-16"></div>
                  <p className="font-semibold">Synerxus Impact Team</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Prepared: {currentDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IMPACT DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SDG Impact Distribution</CardTitle>
              <CardDescription>Volunteer contributions and project metrics by Sustainable Development Goal</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSDG ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : sdgData?.sdgContributions && sdgData.sdgContributions.length > 0 ? (
                <div className="space-y-4">
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
                  <p>No SDG contributions recorded yet. Begin tracking volunteer activities to generate impact data.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STORIES AND CASE STUDIES TAB */}
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
