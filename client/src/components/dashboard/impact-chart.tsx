import { useEffect, useRef, useMemo } from "react";
import { useTheme } from "@/components/layout/theme-provider";
import Chart from "chart.js/auto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ImpactChartProps {
  activities?: any[];
  projectImpacts?: any[];
  monthlyImpactTrend?: Array<{ month: string; score: number }>;
}

// Numeric coercion helper to safely convert values to numbers
function coerceNumber(value: any, fallback: number = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export default function ImpactChart({ activities = [], projectImpacts = [], monthlyImpactTrend = [] }: ImpactChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { theme } = useTheme();

  // Process data for chart
  const chartData = useMemo(() => {
    // Group activities by month
    const monthlyHours: Record<string, number> = {};
    const monthlyImpact: Record<string, number> = {};
    
    activities.forEach((activity: any) => {
      const date = new Date(activity.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyHours[monthKey] = (monthlyHours[monthKey] || 0) + coerceNumber(activity.hours);
    });

    projectImpacts.forEach((impact: any) => {
      const date = new Date(impact.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyImpact[monthKey] = (monthlyImpact[monthKey] || 0) + coerceNumber(impact.value);
    });

    // Get last 7 months
    const months: string[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // Create a map of algorithm scores by month key for easy lookup
    const algorithmScoreMap = new Map(monthlyImpactTrend.map(item => [item.month, item.score]));

    return {
      labels: months.map(m => {
        const [year, month] = m.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short' });
      }),
      hours: months.map(m => monthlyHours[m] || 0),
      impact: months.map(m => monthlyImpact[m] || 0),
      algorithmScores: months.map(m => algorithmScoreMap.get(m) || 0),
    };
  }, [activities, projectImpacts, monthlyImpactTrend]);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      
      if (ctx) {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
        
        chartInstance.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: chartData.labels,
            datasets: [
              {
                label: "Volunteer Hours (Entered Data)",
                data: chartData.hours,
                borderColor: "#3B82F6",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "#3B82F6",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
              },
              {
                label: "People Impacted (Entered Data)",
                data: chartData.impact,
                borderColor: "#10B981",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "#10B981",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
              },
              {
                label: "Impact Score (Algorithm Evaluation)",
                data: chartData.algorithmScores,
                borderColor: "#F59E0B",
                backgroundColor: "rgba(245, 158, 11, 0.05)",
                borderWidth: 3,
                borderDash: [10, 5], // Dashed line to differentiate
                fill: false,
                tension: 0.4,
                pointBackgroundColor: "#F59E0B",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointStyle: 'rect' // Different point style
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: theme === "dark" ? "rgba(75, 85, 99, 0.2)" : "rgba(160, 174, 192, 0.2)"
                },
                ticks: {
                  color: theme === "dark" ? "#d1d5db" : "#4b5563"
                }
              },
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  color: theme === "dark" ? "#d1d5db" : "#4b5563"
                }
              }
            },
            plugins: {
              legend: {
                position: "top",
                labels: {
                  color: theme === "dark" ? "#f3f4f6" : "#1f2937",
                  usePointStyle: false,
                  boxWidth: 40,
                  padding: 15
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
                    let label = context.dataset.label || '';
                    if (label) {
                      label += ': ';
                    }
                    if (context.parsed.y !== null) {
                      label += Math.round(context.parsed.y);
                    }
                    return label;
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
  }, [theme, chartData]);

  return (
    <Card>
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-lg font-semibold">Impact Over Time</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[300px]">
          <canvas ref={chartRef}></canvas>
        </div>
      </CardContent>
    </Card>
  );
}
