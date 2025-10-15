import { useEffect, useRef } from "react";
import { useTheme } from "@/components/layout/theme-provider";
import Chart from "chart.js/auto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ImpactChartProps {
  userType?: "volunteer" | "organization";
}

export default function ImpactChart({ userType = "volunteer" }: ImpactChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      
      if (ctx) {
        // Destroy previous chart instance if it exists
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
        
        // Create new chart with optimized colors for better KPI distinction
        const isOrg = userType === "organization";
        
        chartInstance.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
            datasets: [
              {
                label: isOrg ? "Total Volunteer Hours" : "My Hours",
                data: isOrg ? [1200, 1590, 1830, 2290, 2820, 3410, 3950] : [12, 19, 23, 29, 32, 41, 45],
                borderColor: "#3B82F6", // Blue for hours
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
                label: "People Impacted",
                data: isOrg ? [2500, 3810, 5400, 7550, 10680, 13720, 15850] : [25, 38, 54, 75, 106, 137, 158],
                borderColor: "#10B981", // Green for impact
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "#10B981",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
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
                  color: theme === "dark" ? "#f3f4f6" : "#1f2937"
                }
              }
            }
          }
        });
      }
    }
    
    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [theme, userType]);

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-lg font-semibold">Impact Over Time</CardTitle>
        <Select defaultValue="all">
          <SelectTrigger className="h-8 w-[180px] text-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
            <SelectValue placeholder="Select Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="water">Clean Water Initiative</SelectItem>
            <SelectItem value="education">Education Access Program</SelectItem>
            <SelectItem value="medical">Medical Outreach</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-4">
        <div className="chart-container">
          <canvas ref={chartRef} id="impactChart"></canvas>
        </div>
      </CardContent>
    </Card>
  );
}
