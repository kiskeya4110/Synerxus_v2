import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/components/layout/theme-provider";
import { Loader2 } from "lucide-react";
import SDGIcons from "@/assets/sdg-icons";
import { getSDGName, getSDGColor } from "@shared/sdg-goals";

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
  const [selectedSDG, setSelectedSDG] = useState(1);
  
  // Fetch current user to get organization ID
  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ["/api/users/me"],
  });
  
  // Fetch projects (filtered by organization on backend)
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["/api/projects"],
  });
  
  // Fetch impact metrics
  const { data: impactMetrics = [], isLoading: loadingMetrics } = useQuery({
    queryKey: ["/api/impact-metrics"],
  });
  
  // Fetch project impacts
  const { data: projectImpacts = [], isLoading: loadingImpacts } = useQuery({
    queryKey: ["/api/project-impacts"],
  });
  
  // Filter projects by current user's organization
  const organizationProjects = useMemo(() => {
    // Return empty array until user data is loaded to prevent data leakage
    if (!currentUser) return [];
    const userOrg = (currentUser as any)?.organizationId;
    if (!userOrg) return [];
    return (projects as any[]).filter((p: any) => p.organizationId === userOrg);
  }, [projects, currentUser]);
  
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
    
    // Initialize all 17 SDGs
    for (let i = 1; i <= 17; i++) {
      const metadata = SDG_METADATA[i] || { title: `SDG ${i}`, description: "" };
      sdgMap.set(i, {
        id: i,
        title: metadata.title,
        description: metadata.description,
        color: getSDGColor(i),
        projectCount: 0,
        impactMetrics: []
      });
    }
    
    // Create a Set of organization project IDs for filtering
    const orgProjectIds = new Set(organizationProjects.map((p: any) => p.id));
    
    // Count projects per SDG
    organizationProjects.forEach((project: any) => {
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
    
    return Array.from(sdgMap.values());
  }, [organizationProjects, impactMetrics, projectImpacts]);
  
  const selectedData = sdgData.find(sdg => sdg.id === selectedSDG) || sdgData[0];
  const relatedProjects = organizationProjects.filter((project: any) => 
    project.sdgGoals && Array.isArray(project.sdgGoals) && project.sdgGoals.includes(selectedSDG)
  );
  
  const isLoading = loadingUser || loadingProjects || loadingMetrics || loadingImpacts;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <>
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">SDG Mapping</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Connect volunteer activities to Sustainable Development Goals and track impact
        </p>
      </div>
      
      {/* SDG Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {sdgData.map(sdg => (
          <button
            key={sdg.id}
            onClick={() => setSelectedSDG(sdg.id)}
            className={`p-3 sm:p-4 rounded-lg border min-h-[120px] sm:min-h-auto active:scale-95 transition-all ${
              selectedSDG === sdg.id 
                ? 'ring-2 ring-primary border-primary' 
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            style={{ backgroundColor: selectedSDG === sdg.id ? `${sdg.color}15` : '' }}
            data-testid={`button-sdg-${sdg.id}`}
          >
            {SDGIcons[sdg.id] ? 
              <div className="flex justify-center">
                {SDGIcons[sdg.id]({ width: 50, height: 50 })}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* SDG Information */}
        <Card className="lg:col-span-2">
          <CardHeader style={{ backgroundColor: `${selectedData.color}15` }} className="p-4 sm:p-6">
            <div className="flex items-start sm:items-center flex-col sm:flex-row gap-3 sm:gap-0">
              <div className="sm:mr-4">
                {SDGIcons[selectedData.id] ? 
                  SDGIcons[selectedData.id]({ width: 50, height: 50 }) 
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
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary transition-colors"
                      data-testid={`project-${project.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-base">{project.name}</h4>
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
                      {project.location && (
                        <p className="text-xs text-gray-500 mt-2">📍 {project.location}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No projects are currently aligned with SDG {selectedSDG}.
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
                    <select className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                      <option value="">Select a project</option>
                      {organizationProjects.map((project: any) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Activity Type</label>
                    <input 
                      type="text"
                      placeholder="e.g., Health Screening, Training Session"
                      className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SDG Goal</label>
                    <select 
                      className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      value={selectedSDG}
                      onChange={(e) => setSelectedSDG(Number(e.target.value))}
                    >
                      {sdgData.map(sdg => (
                        <option key={sdg.id} value={sdg.id}>Goal {sdg.id}: {sdg.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Impact Level</label>
                    <select className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  
                  <button className="w-full mt-4 bg-primary text-white py-2 rounded-md hover:bg-primary-700">
                    Connect Activity to SDG
                  </button>
                </TabsContent>
                
                <TabsContent value="report" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Generate Report For</label>
                    <select className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                      <option value="sdg">This SDG (Goal {selectedSDG})</option>
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
                  <a href="#" className="text-primary hover:underline flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    SDG {selectedSDG} Official Indicators
                  </a>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Video: Measuring Impact for SDG {selectedSDG}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    Best Practices Guide
                  </a>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Connect with SDG {selectedSDG} Partners
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}