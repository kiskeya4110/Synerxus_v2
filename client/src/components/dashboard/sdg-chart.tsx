import { useEffect, useRef } from "react";
import { useTheme } from "@/components/layout/theme-provider";
import Chart from "chart.js/auto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SDGChartProps {
  userType?: "volunteer" | "organization";
  selectedProject?: string;
}

export default function SDGChart({ userType = "volunteer", selectedProject = "all" }: SDGChartProps) {
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
        
        // Create new chart with optimized SDG colors
        const isOrg = userType === "organization";
        
        // Adjust SDG data based on selected project
        const getSdgData = () => {
          if (selectedProject === "all") {
            return isOrg ? [35, 25, 20, 20] : [40, 30, 20, 10];
          }
          // Project-specific SDG distribution
          if (selectedProject === "1") return [60, 20, 10, 10]; // Clean Water Initiative - mostly SDG 6
          if (selectedProject === "2") return [10, 15, 65, 10]; // Education Access - mostly SDG 4
          if (selectedProject === "3") return [15, 70, 10, 5];  // Medical Outreach - mostly SDG 3
          return [25, 25, 25, 25]; // Default balanced
        };
        
        const sdgData = getSdgData();
        
        chartInstance.current = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: ["Clean Water & Sanitation", "Good Health & Well-being", "Quality Education", "Others"],
            datasets: [{
              data: sdgData,
              backgroundColor: [
                "#26BDE2", // SDG 6 - Clean Water (Cyan)
                "#4C9F38", // SDG 3 - Good Health (Green)
                "#C5192D", // SDG 4 - Quality Education (Red)
                "#FCC30B"  // Others (Gold)
              ],
              borderWidth: 3,
              borderColor: theme === "dark" ? "#1f2937" : "#ffffff",
              hoverBorderWidth: 4
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
  }, [theme, userType, selectedProject]);

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
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {(() => {
            const getSdgPercentages = () => {
              if (selectedProject === "all") {
                return userType === "organization" ? [35, 25, 20, 20] : [40, 30, 20, 10];
              }
              if (selectedProject === "1") return [60, 20, 10, 10];
              if (selectedProject === "2") return [10, 15, 65, 10];
              if (selectedProject === "3") return [15, 70, 10, 5];
              return [25, 25, 25, 25];
            };
            const percentages = getSdgPercentages();
            
            return (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#26BDE2' }}></span>
                    <span>SDG 6: Clean Water & Sanitation</span>
                  </div>
                  <span className="font-semibold">{percentages[0]}%</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#4C9F38' }}></span>
                    <span>SDG 3: Good Health & Well-being</span>
                  </div>
                  <span className="font-semibold">{percentages[1]}%</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#C5192D' }}></span>
                    <span>SDG 4: Quality Education</span>
                  </div>
                  <span className="font-semibold">{percentages[2]}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#FCC30B' }}></span>
                    <span>Others</span>
                  </div>
                  <span className="font-semibold">{percentages[3]}%</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </Card>
  );
}
