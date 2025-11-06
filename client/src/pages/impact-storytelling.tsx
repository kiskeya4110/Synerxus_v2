import { useQuery } from "@tanstack/react-query";
import ImpactStorytelling from "@/components/impact/impact-storytelling";

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
        <h1 className="text-2xl font-bold">AI Impact Storytelling</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Transform raw impact data into compelling narratives for different audiences
        </p>
      </div>

      {/* Main Content */}
      <ImpactStorytelling 
        projectImpacts={projectImpactData}
        savedStories={[]}
      />
    </>
  );
}