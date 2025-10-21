import { useEffect, useRef, useMemo } from "react";
import { useTheme } from "@/components/layout/theme-provider";
import Chart from "chart.js/auto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-lg font-semibold">SDG Contributions</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[300px]">
          <canvas ref={chartRef}></canvas>
        </div>
      </CardContent>
    </Card>
  );
}
