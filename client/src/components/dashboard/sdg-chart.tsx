import { useEffect, useRef, useMemo, useState } from "react";
import { useTheme } from "@/components/layout/theme-provider";
import Chart from "chart.js/auto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getSDGName, getSDGFullName, getSDGColor, getSDGNameWithNumber } from "@shared/sdg-goals";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";

export interface SDGChartProps {
  projects?: any[];
  organizationSdgs?: number[]; // Organization's selected primary SDGs
}

export default function SDGChart({ projects = [], organizationSdgs }: SDGChartProps) {
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

    // If organizationSdgs is provided, only show those SDGs
    let sdgsToShow = Object.entries(sdgCounts);
    
    if (organizationSdgs && organizationSdgs.length > 0) {
      // Filter to only show organization's selected SDGs
      sdgsToShow = organizationSdgs.map(sdg => {
        const count = sdgCounts[sdg] || 0;
        return [sdg.toString(), count];
      });
      // Sort by count, descending
      sdgsToShow.sort(([, a], [, b]) => (b as number) - (a as number));
    } else {
      // Get top 5 SDGs from projects
      sdgsToShow = sdgsToShow
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
    }

    if (sdgsToShow.length === 0) {
      return {
        labels: ["No data"],
        values: [1],
        colors: ["#CBD5E1"],
        sdgIds: [],
      };
    }

    return {
      labels: sdgsToShow.map(([sdg]) => getSDGNameWithNumber(parseInt(sdg))),
      values: sdgsToShow.map(([, count]) => count as number),
      colors: sdgsToShow.map(([sdg]) => getSDGColor(parseInt(sdg))),
      sdgIds: sdgsToShow.map(([sdg]) => parseInt(sdg)),
    };
  }, [projects, organizationSdgs]);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      
      if (ctx) {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
        
        chartInstance.current = new Chart(ctx, {
          type: "pie",
          data: {
            labels: sdgData.labels,
            datasets: [{
              data: sdgData.values,
              backgroundColor: sdgData.colors,
              borderWidth: 2,
              borderColor: theme === "dark" ? "#1f2937" : "#ffffff",
              hoverBorderWidth: 3,
              hoverOffset: 10
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event: any, elements: any) => {
              if (elements.length > 0 && sdgData.sdgIds.length > 0) {
                const index = elements[0].index;
                const sdgNumber = sdgData.sdgIds[index];
                
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
          <CardTitle className="text-lg font-semibold">SDG Distribution (Click segments to view projects)</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[350px] flex items-center justify-center">
            <canvas ref={chartRef}></canvas>
          </div>
        </CardContent>
      </Card>

      {/* SDG Projects Dialog */}
      <Dialog open={!!selectedSDG} onOpenChange={(open) => !open && setSelectedSDG(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedSDG && `SDG ${selectedSDG.sdg}: ${getSDGFullName(selectedSDG.sdg)}`}
            </DialogTitle>
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
                            <div key={goal} className="inline-block" title={`SDG ${goal}: ${getSDGFullName(goal)}`}>
                              {UN_SDG_ICONS[goal] ? 
                                <img 
                                  src={UN_SDG_ICONS[goal]} 
                                  alt={`SDG ${goal}`}
                                  className="w-10 h-10 rounded"
                                />
                                : 
                                <Badge 
                                  style={{ 
                                    backgroundColor: getSDGColor(goal),
                                    color: '#ffffff'
                                  }}
                                >
                                  {getSDGName(goal)}
                                </Badge>
                              }
                            </div>
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
