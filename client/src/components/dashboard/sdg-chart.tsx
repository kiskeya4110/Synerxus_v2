import { useEffect, useRef, useMemo, useState } from "react";
import { useTheme } from "@/components/layout/theme-provider";
import Chart from "chart.js/auto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export interface SDGChartProps {
  projects?: any[];
}

const SDG_COLORS: Record<number, string> = {
  1: "#E5243B",  // No Poverty
  2: "#DDA63A",  // Zero Hunger
  3: "#4C9F38",  // Good Health
  4: "#C5192D",  // Quality Education
  5: "#FF3A21",  // Gender Equality
  6: "#26BDE2",  // Clean Water
  7: "#FCC30B",  // Affordable Energy
  8: "#A21942",  // Decent Work
  9: "#FD6925",  // Industry Innovation
  10: "#DD1367", // Reduced Inequalities
  11: "#FD9D24", // Sustainable Cities
  12: "#BF8B2E", // Responsible Consumption
  13: "#3F7E44", // Climate Action
  14: "#0A97D9", // Life Below Water
  15: "#56C02B", // Life on Land
  16: "#00689D", // Peace and Justice
  17: "#19486A", // Partnerships
};

export default function SDGChart({ projects = [] }: SDGChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { theme } = useTheme();
  const [selectedSDG, setSelectedSDG] = useState<{ sdg: number; projectList: any[] } | null>(null);

  // Process SDG data from projects
  const sdgData = useMemo(() => {
    const sdgCounts: Record<number, number> = {};
    
    projects.forEach((project: any) => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        project.sdgGoals.forEach((goal: number) => {
          sdgCounts[goal] = (sdgCounts[goal] || 0) + 1;
        });
      }
    });

    // Get top 5 SDGs
    const topSDGs = Object.entries(sdgCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (topSDGs.length === 0) {
      return {
        labels: ["No data"],
        values: [1],
        colors: ["#CBD5E1"],
      };
    }

    return {
      labels: topSDGs.map(([sdg]) => `SDG ${sdg}`),
      values: topSDGs.map(([, count]) => count),
      colors: topSDGs.map(([sdg]) => SDG_COLORS[parseInt(sdg)] || "#CBD5E1"),
    };
  }, [projects]);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      
      if (ctx) {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
        
        chartInstance.current = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: sdgData.labels,
            datasets: [{
              data: sdgData.values,
              backgroundColor: sdgData.colors,
              borderWidth: 3,
              borderColor: theme === "dark" ? "#1f2937" : "#ffffff",
              hoverBorderWidth: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            onClick: (event: any, elements: any) => {
              if (elements.length > 0) {
                const index = elements[0].index;
                const sdgLabel = sdgData.labels[index];
                const sdgNumber = parseInt(sdgLabel.replace('SDG ', ''));
                
                const projectsForSDG = projects.filter((project: any) => 
                  project.sdgGoals && project.sdgGoals.includes(sdgNumber)
                );
                
                setSelectedSDG({ sdg: sdgNumber, projectList: projectsForSDG });
              }
            },
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  color: theme === "dark" ? "#f3f4f6" : "#1f2937",
                  padding: 15,
                  font: {
                    size: 12
                  }
                }
              },
              tooltip: {
                enabled: true,
                backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
                titleColor: theme === "dark" ? "#f3f4f6" : "#1f2937",
                bodyColor: theme === "dark" ? "#d1d5db" : "#4b5563",
                borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                  label: function(context: any) {
                    const label = context.label || '';
                    const value = context.parsed || 0;
                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                    return `${label}: ${value} projects (${percentage}%)`;
                  }
                }
              }
            }
          }
        });
      }
    }
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [theme, sdgData]);

  return (
    <>
      <Card>
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-lg font-semibold">SDG Contributions (Click to view projects)</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[300px]">
            <canvas ref={chartRef}></canvas>
          </div>
        </CardContent>
      </Card>

      {/* SDG Projects Dialog */}
      <Dialog open={!!selectedSDG} onOpenChange={(open) => !open && setSelectedSDG(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">SDG {selectedSDG?.sdg} - Projects</DialogTitle>
            <DialogDescription>
              Projects contributing to this Sustainable Development Goal
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {selectedSDG?.projectList && selectedSDG.projectList.length > 0 ? (
              selectedSDG.projectList.map((project: any, index: number) => (
                <Card key={index} className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{project.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 items-center">
                      {project.location && (
                        <Badge variant="outline">{project.location}</Badge>
                      )}
                      {project.status && (
                        <Badge variant="secondary">{project.status}</Badge>
                      )}
                      {project.sdgGoals && project.sdgGoals.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {project.sdgGoals.map((goal: number) => (
                            <Badge 
                              key={goal} 
                              style={{ 
                                backgroundColor: SDG_COLORS[goal],
                                color: '#ffffff'
                              }}
                            >
                              SDG {goal}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-center text-gray-500">No projects found for this SDG</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
