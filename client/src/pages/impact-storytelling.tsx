import { useQuery } from "@tanstack/react-query";
import ImpactStorytelling from "@/components/impact/impact-storytelling";

export default function ImpactStorytellingPage() {
  // Fetch projects with impact data
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"]
  });

  // Fetch project impacts
  const { data: projectImpacts = [] } = useQuery<any[]>({
    queryKey: ["/api/project-impacts"]
  });

  // Fetch impact metrics for labels
  const { data: impactMetrics = [] } = useQuery<any[]>({
    queryKey: ["/api/impact-metrics"]
  });

  // Transform project impact data into format expected by component
  const projectImpactData = projects.map((project: any) => {
    const impacts = projectImpacts.filter((impact: any) => impact.projectId === project.id);
    
    const metrics = impacts.map((impact: any) => {
      const metric = impactMetrics.find((m: any) => m.id === impact.metricId);
      return {
        label: metric?.name || "Impact Metric",
        before: impact.baselineValue || 0,
        after: impact.currentValue || 0,
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