import { useEffect, useRef, useMemo } from "react";
import { useTheme } from "@/components/layout/theme-provider";
import Chart from "chart.js/auto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ImpactChartProps {
  monthlyImpactData?: Array<{
    month: string;
    hours: number;
    peopleImpacted: number;
  }>;
  monthlyImpactTrend?: Array<{ month: string; score: number }>;
  userType?: "volunteer" | "organization";
  narrative?: string;
}

export default function ImpactChart({
  monthlyImpactData = [],
  monthlyImpactTrend = [],
  userType = "organization",
  narrative = "",
}: ImpactChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { theme } = useTheme();

  // Dynamic labels based on user type
  const labels = useMemo(
    () => ({
      hours:
        userType === "volunteer"
          ? "Your Hours (Entered Data)"
          : "Volunteer Hours (Entered Data)",
      impact:
        userType === "volunteer"
          ? "People You Impacted (Entered Data)"
          : "People Impacted (Entered Data)",
      score:
        userType === "volunteer"
          ? "Your Impact Score (Algorithm)"
          : "Impact Score (Algorithm Evaluation)",
    }),
    [userType],
  );

  // Process backend-computed data for chart
  const chartData = useMemo(() => {
    // Create a map of algorithm scores by month key for easy lookup
    const algorithmScoreMap = new Map(
      monthlyImpactTrend.map((item) => [item.month, item.score]),
    );

    return {
      labels: monthlyImpactData.map((item) => {
        const [year, month] = item.month.split("-");
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleString(
          "default",
          { month: "short" },
        );
      }),
      hours: monthlyImpactData.map((item) => item.hours),
      impact: monthlyImpactData.map((item) => item.peopleImpacted),
      algorithmScores: monthlyImpactData.map(
        (item) => algorithmScoreMap.get(item.month) || 0,
      ),
    };
  }, [monthlyImpactData, monthlyImpactTrend]);

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
                label: labels.hours,
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
                pointHoverRadius: 6,
              },
              {
                label: labels.impact,
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
                pointHoverRadius: 6,
              },
              {
                label: labels.score,
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
                pointStyle: "rect", // Different point style
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color:
                    theme === "dark"
                      ? "rgba(75, 85, 99, 0.2)"
                      : "rgba(160, 174, 192, 0.2)",
                },
                ticks: {
                  color: theme === "dark" ? "#d1d5db" : "#4b5563",
                },
              },
              x: {
                grid: {
                  display: false,
                },
                ticks: {
                  color: theme === "dark" ? "#d1d5db" : "#4b5563",
                },
              },
            },
            plugins: {
              legend: {
                position: "top",
                labels: {
                  color: theme === "dark" ? "#f3f4f6" : "#1f2937",
                  usePointStyle: false,
                  boxWidth: 18,
                  boxHeight: 12,
                  padding: 15,
                  borderRadius: 2,
                  generateLabels: (chart: any) => {
                    return chart.data.datasets.map((dataset: any, i: number) => ({
                      text: dataset.label,
                      fillStyle: dataset.borderColor,
                      hidden: false,
                      index: i,
                      borderColor: dataset.borderColor,
                      borderWidth: 2,
                    }));
                  },
                },
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
                  label: function (context: any) {
                    let label = context.dataset.label || "";
                    if (label) {
                      label += ": ";
                    }
                    if (context.parsed.y !== null) {
                      label += Math.round(context.parsed.y);
                    }
                    return label;
                  },
                },
              },
            },
          },
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [theme, chartData, labels]);

  const cardTitle =
    userType === "volunteer" ? "Your Impact Over Time" : "Impact Over Time";

  return (
    <Card>
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-lg font-semibold">{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="h-[300px]">
          <canvas ref={chartRef}></canvas>
        </div>
        {narrative && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {narrative}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
