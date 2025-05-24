import { useEffect, useRef } from "react";
import { useTheme } from "@/components/layout/theme-provider";
import Chart from "chart.js/auto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SDGChart() {
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
          type: "doughnut",
          data: {
            labels: ["Clean Water & Sanitation", "Good Health & Well-being", "Quality Education", "Others"],
            datasets: [{
              data: [35, 25, 20, 20],
              backgroundColor: [
                "hsl(var(--chart-1))", // Blue
                "hsl(var(--chart-3))", // Red
                "hsl(var(--chart-2))", // Green
                "hsl(var(--chart-4))"  // Yellow
              ],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            plugins: {
              legend: {
                display: false,
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
    <Card>
      <CardHeader className="pb-2 border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-lg font-semibold">SDG Contributions</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="chart-container">
          <canvas ref={chartRef} id="sdgChart"></canvas>
        </div>
      </CardContent>
      <div className="px-4 pb-4 pt-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center mb-1">
            <span className="w-3 h-3 bg-[hsl(var(--chart-1))] rounded-full mr-2"></span>
            <span>SDG 6: Clean Water & Sanitation</span>
          </div>
          <div className="flex items-center mb-1">
            <span className="w-3 h-3 bg-[hsl(var(--chart-3))] rounded-full mr-2"></span>
            <span>SDG 3: Good Health & Well-being</span>
          </div>
          <div className="flex items-center mb-1">
            <span className="w-3 h-3 bg-[hsl(var(--chart-2))] rounded-full mr-2"></span>
            <span>SDG 4: Quality Education</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-[hsl(var(--chart-4))] rounded-full mr-2"></span>
            <span>Others</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
