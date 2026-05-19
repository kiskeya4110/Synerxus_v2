import { useEffect, useRef, useMemo, useState } from "react";
import { useTheme } from "@/components/layout/theme-provider";
import Chart from "chart.js/auto";
import { Button } from "@/components/ui/button";
import { formatDecimal } from "@/lib/format-utils";
import { BarChart3, TrendingUp, Eye, EyeOff } from "lucide-react";

export interface ImpactChartProps {
  monthlyImpactData?: Array<{
    month: string;
    hours: number;
    peopleImpacted: number;
    aiu?: number;
  }>;
  monthlyImpactTrend?: Array<{ month: string; score: number }>;
  impactGrowthSeries?: Array<{
    month: string;
    cumulativeHours: number;
    cumulativePeople: number;
    cumulativeAiu?: number;
    monthlyHours: number;
    monthlyPeople: number;
    monthlyAiu?: number;
  }>;
  userType?: "volunteer" | "organization";
  narrative?: string;
  showFullProject?: boolean;
}

export default function ImpactChart({
  monthlyImpactData = [],
  monthlyImpactTrend = [],
  impactGrowthSeries = [],
  userType = "organization",
  narrative = "",
  showFullProject = true,
}: ImpactChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { theme } = useTheme();

  // Interactive state
  const [viewMode, setViewMode] = useState<'monthly' | 'cumulative'>('monthly');
  const [visibleSeries, setVisibleSeries] = useState({
    hours: true,
    people: true,
    aiu: true,
    score: true,
  });

  // Dynamic labels based on user type
  const labels = useMemo(
    () => ({
      hours: userType === "volunteer" ? "Your Hours" : "Volunteer Hours",
      impact: userType === "volunteer" ? "People Reached" : "People Reached",
      aiu: userType === "volunteer" ? "Activity Score" : "Organization Activity Score",
      score: userType === "volunteer" ? "Activity Score" : "Activity Score",
    }),
    [userType],
  );

  // Toggle series visibility
  const toggleSeries = (series: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({ ...prev, [series]: !prev[series] }));
  };

  // Process backend-computed data for chart
  const chartData = useMemo(() => {
    // Create a map of algorithm scores by month key for easy lookup
    const algorithmScoreMap = new Map(
      monthlyImpactTrend.map((item) => [item.month, item.score]),
    );

    // Use cumulative data if available and in cumulative mode
    const sourceData = viewMode === 'cumulative' && impactGrowthSeries.length > 0
      ? impactGrowthSeries
      : monthlyImpactData;

    // Format month labels properly
    const formatMonth = (monthStr: string) => {
      if (!monthStr) return '';
      const [year, month] = monthStr.split("-");
      if (!year || !month) return monthStr;
      const date = new Date(parseInt(year), parseInt(month) - 1);
      // Show year for January or if spanning multiple years
      const showYear = parseInt(month) === 1 ||
        (sourceData.length > 0 && sourceData[0].month?.split('-')[0] !== year);
      return date.toLocaleString("default", {
        month: "short",
        ...(showYear ? { year: '2-digit' } : {})
      });
    };

    if (viewMode === 'cumulative' && impactGrowthSeries.length > 0) {
      // Calculate cumulative algorithm scores
      let cumulativeScore = 0;
      const cumulativeScores = impactGrowthSeries.map((item) => {
        const monthlyScore = algorithmScoreMap.get(item.month) || 0;
        cumulativeScore += monthlyScore;
        return cumulativeScore;
      });

      return {
        labels: impactGrowthSeries.map((item) => formatMonth(item.month)),
        hours: impactGrowthSeries.map((item) => item.cumulativeHours),
        impact: impactGrowthSeries.map((item) => item.cumulativePeople),
        aiu: impactGrowthSeries.map((item) => item.cumulativeAiu || 0),
        algorithmScores: cumulativeScores,
      };
    }

    return {
      labels: monthlyImpactData.map((item) => formatMonth(item.month)),
      hours: monthlyImpactData.map((item) => item.hours),
      impact: monthlyImpactData.map((item) => item.peopleImpacted),
      aiu: monthlyImpactData.map((item) => item.aiu || 0),
      algorithmScores: monthlyImpactData.map(
        (item) => algorithmScoreMap.get(item.month) || 0,
      ),
    };
  }, [monthlyImpactData, monthlyImpactTrend, impactGrowthSeries, viewMode]);

  // Calculate summary totals - always from monthly data (not cumulative)
  const summaryTotals = useMemo(() => {
    const totalHours = monthlyImpactData.reduce((sum, m) => sum + (m.hours || 0), 0);
    const totalPeople = monthlyImpactData.reduce((sum, m) => sum + (m.peopleImpacted || 0), 0);
    const totalAiu = monthlyImpactData.reduce((sum, m) => sum + (m.aiu || 0), 0);
    const monthsActive = monthlyImpactData.filter(m => m.hours > 0 || m.peopleImpacted > 0).length;
    return { totalHours, totalPeople, totalAiu, monthsActive };
  }, [monthlyImpactData]);

  // Check if there's any data to display
  const hasData = useMemo(() => {
    return chartData.hours.some(h => h > 0) ||
           chartData.impact.some(p => p > 0) ||
           chartData.aiu.some(a => a > 0) ||
           chartData.algorithmScores.some(s => s > 0);
  }, [chartData]);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext("2d");

      if (ctx) {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        // Build datasets based on visibility
        const datasets: any[] = [];

        if (visibleSeries.hours) {
          datasets.push({
            label: labels.hours,
            data: chartData.hours,
            borderColor: "#3B82F6",
            backgroundColor: "rgba(59, 130, 246, 0.15)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#3B82F6",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8,
            yAxisID: 'y',
          });
        }

        if (visibleSeries.people) {
          datasets.push({
            label: labels.impact,
            data: chartData.impact,
            borderColor: "#10B981",
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#10B981",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8,
            yAxisID: 'y',
          });
        }

        if (visibleSeries.aiu && chartData.aiu.some(a => a > 0)) {
          datasets.push({
            label: labels.aiu,
            data: chartData.aiu,
            borderColor: "#8B5CF6",
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#8B5CF6",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8,
            yAxisID: 'y1',
          });
        }

        if (visibleSeries.score && chartData.algorithmScores.some(s => s > 0)) {
          datasets.push({
            label: labels.score,
            data: chartData.algorithmScores,
            borderColor: "#F59E0B",
            backgroundColor: "rgba(245, 158, 11, 0.05)",
            borderWidth: 3,
            borderDash: [8, 4],
            fill: false,
            tension: 0.4,
            pointBackgroundColor: "#F59E0B",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 9,
            pointStyle: "rectRot",
            yAxisID: 'y1',
          });
        }

        chartInstance.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: chartData.labels,
            datasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'index',
              intersect: false,
            },
            scales: {
              y: {
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true,
                title: {
                  display: true,
                  text: viewMode === 'cumulative' ? 'Cumulative (Hours/People)' : 'Monthly (Hours/People)',
                  color: theme === "dark" ? "#9ca3af" : "#6b7280",
                  font: { size: 11 },
                },
                grid: {
                  color: theme === "dark" ? "rgba(75, 85, 99, 0.3)" : "rgba(160, 174, 192, 0.3)",
                },
                ticks: {
                  color: theme === "dark" ? "#d1d5db" : "#4b5563",
                  callback: function(value: any) {
                    return value >= 1000 ? formatDecimal(value / 1000) + 'k' : value;
                  },
                },
              },
              y1: {
                type: 'linear',
                display: (visibleSeries.aiu && chartData.aiu.some(a => a > 0)) ||
                         (visibleSeries.score && chartData.algorithmScores.some(s => s > 0)),
                position: 'right',
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Contribution Score',
                  color: theme === "dark" ? "#9ca3af" : "#6b7280",
                  font: { size: 11 },
                },
                grid: {
                  drawOnChartArea: false,
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
                  maxRotation: 45,
                  minRotation: 0,
                },
              },
            },
            plugins: {
              legend: {
                position: "top",
                labels: {
                  color: theme === "dark" ? "#f3f4f6" : "#1f2937",
                  usePointStyle: true,
                  pointStyle: 'circle',
                  boxWidth: 8,
                  boxHeight: 8,
                  padding: 16,
                  font: { size: 12 },
                },
                onClick: (_, legendItem, legend) => {
                  // Custom click handler that also updates our state
                  const index = legendItem.datasetIndex;
                  if (index !== undefined) {
                    const meta = legend.chart.getDatasetMeta(index);
                    meta.hidden = !meta.hidden;
                    legend.chart.update();
                  }
                },
              },
              tooltip: {
                enabled: true,
                backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
                titleColor: theme === "dark" ? "#f3f4f6" : "#1f2937",
                bodyColor: theme === "dark" ? "#d1d5db" : "#4b5563",
                borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                borderWidth: 1,
                padding: 14,
                displayColors: true,
                usePointStyle: true,
                titleFont: { size: 13, weight: 'bold' },
                bodyFont: { size: 12 },
                callbacks: {
                  title: function(context: any) {
                    const monthLabel = context[0]?.label || '';
                    return viewMode === 'cumulative'
                      ? `Cumulative through ${monthLabel}`
                      : `${monthLabel}`;
                  },
                  label: function (context: any) {
                    let label = context.dataset.label || "";
                    if (label) {
                      label += ": ";
                    }
                    if (context.parsed.y !== null) {
                      const value = context.parsed.y;
                      if (context.dataset.label?.includes('Contribution Score')) {
                        label += formatDecimal(value);
                      } else if (value >= 1000) {
                        label += formatDecimal(value / 1000) + 'k';
                      } else {
                        label += Math.round(value);
                      }
                    }
                    return label;
                  },
                  afterBody: function(context: any) {
                    if (viewMode === 'monthly' && context.length > 0) {
                      const index = context[0].dataIndex;
                      const hours = chartData.hours[index] || 0;
                      const people = chartData.impact[index] || 0;
                      const aiu = chartData.aiu[index] || 0;

                      if (hours > 0 && people > 0) {
                        const efficiency = formatDecimal(people / hours);
                        return [``, `Impact efficiency: ${efficiency} people/hour`];
                      }
                    }
                    return [];
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
  }, [theme, chartData, labels, viewMode, visibleSeries]);

  return (
    <div className="space-y-4">
      {/* Interactive Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <Button
            variant={viewMode === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('monthly')}
            className="h-7 px-3 text-xs"
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            Monthly
          </Button>
          <Button
            variant={viewMode === 'cumulative' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cumulative')}
            className="h-7 px-3 text-xs"
            disabled={impactGrowthSeries.length === 0}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Cumulative
          </Button>
        </div>

        {/* Series Toggles */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => toggleSeries('hours')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
              visibleSeries.hours
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
            }`}
          >
            {visibleSeries.hours ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Hours
          </button>
          <button
            onClick={() => toggleSeries('people')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
              visibleSeries.people
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
            }`}
          >
            {visibleSeries.people ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            People
          </button>
          <button
            onClick={() => toggleSeries('aiu')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
              visibleSeries.aiu
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
            }`}
          >
            {visibleSeries.aiu ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Score
          </button>
          <button
            onClick={() => toggleSeries('score')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
              visibleSeries.score
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
            }`}
          >
            {visibleSeries.score ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Score
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-[320px] relative">
        {!hasData ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No impact data available yet</p>
            <p className="text-xs mt-1">Log activities to see your impact over time</p>
          </div>
        ) : (
          <canvas ref={chartRef}></canvas>
        )}
      </div>

      {/* Summary Stats - Always show totals from monthly data */}
      {hasData && (
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600">
              {summaryTotals.totalHours.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">{labels.hours}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">
              {summaryTotals.totalPeople.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">{labels.impact}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-violet-600">
              {formatDecimal(summaryTotals.totalAiu)}
            </p>
            <p className="text-xs text-gray-500">{labels.aiu}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600">
              {summaryTotals.monthsActive}
            </p>
            <p className="text-xs text-gray-500">Months Active</p>
          </div>
        </div>
      )}

      {/* Narrative */}
      {narrative && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {narrative}
          </p>
        </div>
      )}
    </div>
  );
}
