import { useEffect, useRef, useMemo, useState } from "react";
import { useTheme } from "@/components/layout/theme-provider";
import Chart from "chart.js/auto";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getSDGName, getSDGFullName, getSDGColor, getSDGNameWithNumber } from "@shared/sdg-goals";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";
import { Target, Clock, Briefcase, TrendingUp } from "lucide-react";

export interface SDGChartProps {
  projects?: any[];
  organizationSdgs?: number[]; // Organization's selected primary SDGs
}

export default function SDGChart({ projects = [], organizationSdgs }: SDGChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { theme } = useTheme();
  const [selectedSDG, setSelectedSDG] = useState<{ sdg: number; projectList: any[]; hours: number } | null>(null);

  // Process SDG data from projects with enhanced metrics
  const sdgData = useMemo(() => {
    const sdgMetrics: Record<number, { count: number; hours: number; projects: any[] }> = {};
    let totalHours = 0;

    projects.forEach((project: any) => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        const projectHours = project.totalHours || project.hours || 0;
        totalHours += projectHours;

        project.sdgGoals.forEach((goal: number) => {
          if (!sdgMetrics[goal]) {
            sdgMetrics[goal] = { count: 0, hours: 0, projects: [] };
          }
          sdgMetrics[goal].count += 1;
          sdgMetrics[goal].hours += projectHours / project.sdgGoals.length; // Distribute hours across SDGs
          sdgMetrics[goal].projects.push(project);
        });
      }
    });

    // If organizationSdgs is provided, only show those SDGs
    let sdgsToShow: [string, { count: number; hours: number; projects: any[] }][] = Object.entries(sdgMetrics) as any;

    if (organizationSdgs && organizationSdgs.length > 0) {
      // Filter to only show organization's selected SDGs
      const filtered = organizationSdgs.map(sdg => {
        const metrics = sdgMetrics[sdg] || { count: 0, hours: 0, projects: [] };
        return [sdg.toString(), metrics] as [string, { count: number; hours: number; projects: any[] }];
      }).filter(([, metrics]) => metrics.count > 0);
      // Sort by count, descending
      sdgsToShow = filtered.sort(([, a], [, b]) => b.count - a.count);
    } else {
      // Get top 6 SDGs from projects
      sdgsToShow = sdgsToShow
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 6);
    }

    if (sdgsToShow.length === 0) {
      return {
        labels: ["No SDG data"],
        values: [1],
        colors: ["#E5E7EB"],
        sdgIds: [],
        metrics: {},
        totalProjects: 0,
        totalHours: 0,
        uniqueSDGs: 0,
      };
    }

    return {
      labels: sdgsToShow.map(([sdg]) => `SDG ${sdg}`),
      values: sdgsToShow.map(([, metrics]) => metrics.count),
      colors: sdgsToShow.map(([sdg]) => getSDGColor(parseInt(sdg))),
      sdgIds: sdgsToShow.map(([sdg]) => parseInt(sdg)),
      metrics: sdgMetrics,
      totalProjects: projects.length,
      totalHours: Math.round(totalHours),
      uniqueSDGs: Object.keys(sdgMetrics).length,
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
          type: "doughnut",
          data: {
            labels: sdgData.labels,
            datasets: [{
              data: sdgData.values,
              backgroundColor: sdgData.colors,
              borderWidth: 3,
              borderColor: theme === "dark" ? "#1f2937" : "#ffffff",
              hoverBorderWidth: 4,
              hoverOffset: 8,
              borderRadius: 4,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            onClick: (event: any, elements: any) => {
              if (elements.length > 0 && sdgData.sdgIds.length > 0) {
                const index = elements[0].index;
                const sdgNumber = sdgData.sdgIds[index];
                const metrics = sdgData.metrics[sdgNumber] || { count: 0, hours: 0, projects: [] };

                setSelectedSDG({
                  sdg: sdgNumber,
                  projectList: metrics.projects,
                  hours: Math.round(metrics.hours)
                });
              }
            },
            plugins: {
              legend: {
                display: false, // We'll show custom legend
              },
              tooltip: {
                enabled: true,
                backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
                titleColor: theme === "dark" ? "#f3f4f6" : "#1f2937",
                bodyColor: theme === "dark" ? "#d1d5db" : "#4b5563",
                borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
                callbacks: {
                  title: function(context: any) {
                    const index = context[0].dataIndex;
                    const sdgNumber = sdgData.sdgIds[index];
                    return sdgNumber ? `SDG ${sdgNumber}: ${getSDGName(sdgNumber)}` : context[0].label;
                  },
                  label: function(context: any) {
                    const value = context.parsed || 0;
                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                    return `${value} project${value !== 1 ? 's' : ''} (${percentage}%)`;
                  },
                  afterLabel: function(context: any) {
                    const index = context.dataIndex;
                    const sdgNumber = sdgData.sdgIds[index];
                    if (sdgNumber && sdgData.metrics[sdgNumber]) {
                      const hours = Math.round(sdgData.metrics[sdgNumber].hours);
                      return `${hours} hours contributed`;
                    }
                    return '';
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

  const totalValue = sdgData.values.reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="relative">
        {/* Chart Container */}
        <div className="relative h-[220px] flex items-center justify-center">
          <canvas ref={chartRef}></canvas>

          {/* Center KPI Display */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {sdgData.uniqueSDGs}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                SDGs
              </div>
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
              <Briefcase className="h-3 w-3" />
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{sdgData.totalProjects}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Projects</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1">
              <Clock className="h-3 w-3" />
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{sdgData.totalHours}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Hours</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-purple-600 dark:text-purple-400 mb-1">
              <TrendingUp className="h-3 w-3" />
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {sdgData.totalProjects > 0 ? Math.round(sdgData.totalHours / sdgData.totalProjects) : 0}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Hrs/Project</div>
          </div>
        </div>

        {/* Custom Legend - SDG Breakdown */}
        <div className="mt-4 space-y-1.5">
          {sdgData.sdgIds.map((sdgId, index) => {
            const percentage = totalValue > 0 ? Math.round((sdgData.values[index] / totalValue) * 100) : 0;
            const metrics = sdgData.metrics[sdgId] || { count: 0, hours: 0 };
            return (
              <div
                key={sdgId}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                onClick={() => {
                  const projectsForSDG = projects.filter((project: any) =>
                    project.sdgGoals && project.sdgGoals.includes(sdgId)
                  );
                  setSelectedSDG({ sdg: sdgId, projectList: projectsForSDG, hours: Math.round(metrics.hours) });
                }}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getSDGColor(sdgId) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                      SDG {sdgId}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {sdgData.values[index]} proj • {percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                    <div
                      className="h-1 rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: getSDGColor(sdgId)
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {sdgData.sdgIds.length === 0 && (
          <div className="text-center py-4">
            <Target className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No SDG data available</p>
          </div>
        )}
      </div>

      {/* SDG Projects Dialog */}
      <Dialog open={!!selectedSDG} onOpenChange={(open) => !open && setSelectedSDG(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedSDG && UN_SDG_ICONS[selectedSDG.sdg] && (
                <img
                  src={UN_SDG_ICONS[selectedSDG.sdg]}
                  alt={`SDG ${selectedSDG.sdg}`}
                  className="w-12 h-12 rounded-lg"
                />
              )}
              <div>
                <DialogTitle className="text-xl">
                  {selectedSDG && `SDG ${selectedSDG.sdg}: ${getSDGFullName(selectedSDG.sdg)}`}
                </DialogTitle>
                <DialogDescription>
                  Projects contributing to this Sustainable Development Goal
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* SDG Summary Stats */}
          {selectedSDG && (
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {selectedSDG.projectList.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Projects</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedSDG.hours}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Hours</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {totalValue > 0 ? Math.round((selectedSDG.projectList.length / totalValue) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">of Portfolio</div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {selectedSDG?.projectList && selectedSDG.projectList.length > 0 ? (
              selectedSDG.projectList.map((project: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-base">{project.name}</h3>
                      {project.completionPercentage !== undefined && (
                        <Badge variant="outline" className="ml-2">
                          {project.completionPercentage}% complete
                        </Badge>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{project.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 items-center pt-1">
                      {project.location && (
                        <Badge variant="outline" className="text-xs">{project.location}</Badge>
                      )}
                      {project.status && (
                        <Badge variant="secondary" className="text-xs">{project.status}</Badge>
                      )}
                      {project.totalHours !== undefined && (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          {project.totalHours} hrs
                        </Badge>
                      )}
                    </div>
                    {project.sdgGoals && project.sdgGoals.length > 1 && (
                      <div className="flex gap-1 flex-wrap pt-2 border-t mt-2">
                        <span className="text-xs text-gray-500 mr-1">Also addresses:</span>
                        {project.sdgGoals.filter((g: number) => g !== selectedSDG?.sdg).slice(0, 4).map((goal: number) => (
                          <div key={goal} className="inline-block" title={`SDG ${goal}: ${getSDGFullName(goal)}`}>
                            {UN_SDG_ICONS[goal] ?
                              <img
                                src={UN_SDG_ICONS[goal]}
                                alt={`SDG ${goal}`}
                                className="w-6 h-6 rounded"
                              />
                              :
                              <Badge
                                className="text-[10px] px-1.5 py-0"
                                style={{
                                  backgroundColor: getSDGColor(goal),
                                  color: '#ffffff'
                                }}
                              >
                                {goal}
                              </Badge>
                            }
                          </div>
                        ))}
                        {project.sdgGoals.length > 5 && (
                          <span className="text-xs text-gray-400">+{project.sdgGoals.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No projects found for this SDG</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
