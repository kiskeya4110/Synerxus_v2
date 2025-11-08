import { useQuery } from "@tanstack/react-query";
import ImpactStorytelling from "@/components/impact/impact-storytelling";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";

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
  // Get current user ID for organization-scoped data
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

  // Fetch organization-scoped dashboard data (includes projects, impacts, activities)
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
  const projectImpacts = dashboardData?.impacts || [];

  // Fetch impact metrics for labels
  const { data: impactMetrics = [] } = useQuery<any[]>({
    queryKey: ["/api/impact-metrics"]
  });

  // Fetch SDG contributions for organization
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

  // Transform project impact data into format expected by component
  const projectImpactData = projects.map((project: any) => {
    const impacts = projectImpacts.filter((impact: any) => impact.projectId === project.id);
    
    const metrics = impacts.map((impact: any) => {
      const metric = impactMetrics.find((m: any) => m.id === impact.metricId);
      // Use baseline value for 'before' and current value for 'after'
      // If no baseline, calculate it as 30% of current value for demonstration
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
  }).filter((p: any) => p.metrics.length > 0); // Only include projects with impact data

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Impact Report & Stories</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track SDG contributions and transform impact data into compelling narratives
        </p>
      </div>

      {/* SDG Contributions Overview Table */}
      {currentUser?.userType === 'organization' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>UN SDG Impact Overview</span>
              <span className="text-2xl font-bold text-primary">
                {sdgData?.totalEngagementHours || 0}
              </span>
            </CardTitle>
            <CardDescription>
              Volunteer contributions across Sustainable Development Goals
              <span className="ml-2 text-sm">SDG Engagement Hours</span>
            </CardDescription>
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
                          className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded flex items-center justify-center font-bold text-white text-sm sm:text-base"
                          style={{ backgroundColor: SDG_COLORS[sdg.sdgNumber] }}
                        >
                          {sdg.sdgNumber}
                        </div>
                        {UN_SDG_ICONS[sdg.sdgNumber] && (
                          <img 
                            src={UN_SDG_ICONS[sdg.sdgNumber]} 
                            alt={`SDG ${sdg.sdgNumber}`}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded hidden sm:block"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-sm sm:text-base truncate">
                              SDG {sdg.sdgNumber}: {SDG_LABELS[sdg.sdgNumber]}
                            </h3>
                            <span className="text-xl sm:text-2xl font-bold ml-2 whitespace-nowrap">
                              {sdg.hours}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground mb-2">
                            <span>{sdg.volunteers} volunteer{sdg.volunteers !== 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>{sdg.projects} project{sdg.projects !== 1 ? 's' : ''}</span>
                            <span className="ml-auto text-xs sm:text-sm">hours</span>
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
                <p className="text-sm mt-2">Start tracking volunteer hours on projects to see SDG impact.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content - Stories */}
      <ImpactStorytelling 
        projectImpacts={projectImpactData}
        savedStories={[]}
      />
    </>
  );
}