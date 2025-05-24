import { useEffect, useRef } from "react";
import { useTheme } from "@/components/layout/theme-provider";
import Chart from "chart.js/auto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ImpactChart() {
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
        
        // Create new chart
        chartInstance.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
            datasets: [
              {
                label: "Volunteer Hours",
                data: [120, 190, 230, 290, 320, 410, 450],
                borderColor: "hsl(var(--chart-1))",
                backgroundColor: "hsla(var(--chart-1) / 0.1)",
                borderWidth: 2,
                fill: true,
                tension: 0.4
              },
              {
                label: "People Impacted",
                data: [250, 310, 400, 550, 680, 720, 850],
                borderColor: "hsl(var(--chart-2))",
                backgroundColor: "hsla(var(--chart-2) / 0.1)",
                borderWidth: 2,
                fill: true,
                tension: 0.4
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
  }, [theme]);

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
