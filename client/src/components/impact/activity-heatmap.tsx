import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Clock, Activity } from "lucide-react";

interface ActivityData {
  date: string; // ISO date string (YYYY-MM-DD)
  hours: number;
  count?: number; // Number of activities
}

interface ActivityHeatmapProps {
  activities: ActivityData[];
  colorScale?: string[]; // 5 colors from light to dark
  showTooltip?: boolean;
  period?: "3m" | "6m" | "1y";
  title?: string;
  showPeriodSelector?: boolean;
  showMonthlyBreakdown?: boolean;
}

// Default green color scale (GitHub-style)
const DEFAULT_COLORS = [
  "#ebedf0", // 0 - no activity
  "#9be9a8", // 1 - light
  "#40c463", // 2 - medium-light
  "#30a14e", // 3 - medium
  "#216e39", // 4 - dark
];

const DARK_MODE_COLORS = [
  "#161b22", // 0 - no activity
  "#0e4429", // 1 - light
  "#006d32", // 2 - medium-light
  "#26a641", // 3 - medium
  "#39d353", // 4 - dark
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ActivityHeatmap({
  activities,
  colorScale = DEFAULT_COLORS,
  showTooltip = true,
  period: initialPeriod = "1y",
  title = "Activity",
  showPeriodSelector = true,
  showMonthlyBreakdown = true,
}: ActivityHeatmapProps) {
  const [period, setPeriod] = useState<"3m" | "6m" | "1y">(initialPeriod);
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    hours: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Calculate date range based on period
  const { startDate, endDate, weeks } = useMemo(() => {
    const end = new Date();
    const periodDays = period === "3m" ? 90 : period === "6m" ? 180 : 365;
    const start = new Date(end);
    start.setDate(start.getDate() - periodDays);

    // Adjust start to beginning of week (Sunday)
    start.setDate(start.getDate() - start.getDay());

    // Calculate number of weeks
    const weekCount = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));

    return { startDate: start, endDate: end, weeks: weekCount };
  }, [period]);

  // Build activity map for quick lookup
  const activityMap = useMemo(() => {
    const map = new Map<string, { hours: number; count: number }>();
    activities.forEach((a) => {
      const dateKey = a.date.split("T")[0]; // Normalize to YYYY-MM-DD
      const existing = map.get(dateKey);
      if (existing) {
        existing.hours += a.hours;
        existing.count += a.count || 1;
      } else {
        map.set(dateKey, { hours: a.hours, count: a.count || 1 });
      }
    });
    return map;
  }, [activities]);

  // Calculate max hours for color intensity scaling
  const maxHours = useMemo(() => {
    let max = 0;
    activityMap.forEach((v) => {
      if (v.hours > max) max = v.hours;
    });
    return max || 8; // Default max of 8 hours if no data
  }, [activityMap]);

  // Get color based on hours
  const getColor = (hours: number): string => {
    if (hours === 0) return colorScale[0];
    const intensity = Math.min(hours / maxHours, 1);
    if (intensity <= 0.25) return colorScale[1];
    if (intensity <= 0.5) return colorScale[2];
    if (intensity <= 0.75) return colorScale[3];
    return colorScale[4];
  };

  // Build grid data
  const gridData = useMemo(() => {
    const data: { date: Date; dateStr: string; hours: number; count: number; week: number; day: number }[] = [];
    const current = new Date(startDate);

    let weekIndex = 0;
    while (current <= endDate) {
      const dateStr = current.toISOString().split("T")[0];
      const activity = activityMap.get(dateStr);

      data.push({
        date: new Date(current),
        dateStr,
        hours: activity?.hours || 0,
        count: activity?.count || 0,
        week: weekIndex,
        day: current.getDay(),
      });

      current.setDate(current.getDate() + 1);
      if (current.getDay() === 0) weekIndex++;
    }

    return data;
  }, [startDate, endDate, activityMap]);

  // Get month labels for header
  const monthLabels = useMemo(() => {
    const labels: { month: string; week: number }[] = [];
    let lastMonth = -1;

    gridData.forEach((d) => {
      if (d.day === 0 && d.date.getMonth() !== lastMonth) {
        labels.push({
          month: MONTHS[d.date.getMonth()],
          week: d.week,
        });
        lastMonth = d.date.getMonth();
      }
    });

    return labels;
  }, [gridData]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalHours = 0;
    let totalActivities = 0;
    let activeDays = 0;

    activityMap.forEach((v) => {
      totalHours += v.hours;
      totalActivities += v.count;
      activeDays++;
    });

    return { totalHours, totalActivities, activeDays };
  }, [activityMap]);

  // Calculate monthly breakdown
  const monthlyBreakdown = useMemo(() => {
    const breakdown: { month: string; year: number; hours: number; activities: number; days: number }[] = [];
    const monthMap = new Map<string, { hours: number; activities: number; days: number }>();

    gridData.forEach((cell) => {
      if (cell.hours > 0 || cell.count > 0) {
        const monthKey = `${cell.date.getFullYear()}-${cell.date.getMonth()}`;
        const existing = monthMap.get(monthKey);
        if (existing) {
          existing.hours += cell.hours;
          existing.activities += cell.count;
          existing.days += 1;
        } else {
          monthMap.set(monthKey, {
            hours: cell.hours,
            activities: cell.count,
            days: 1,
          });
        }
      }
    });

    monthMap.forEach((data, key) => {
      const [year, month] = key.split("-").map(Number);
      breakdown.push({
        month: MONTHS[month],
        year,
        ...data,
      });
    });

    // Sort by date (newest first)
    return breakdown.sort((a, b) => {
      const aIdx = MONTHS.indexOf(a.month) + a.year * 12;
      const bIdx = MONTHS.indexOf(b.month) + b.year * 12;
      return bIdx - aIdx;
    }).slice(0, 6); // Show last 6 months max
  }, [gridData]);

  // Calculate streaks
  const streaks = useMemo(() => {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const sortedDates = [...gridData].sort((a, b) =>
      new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime()
    );

    // Calculate current streak (from today backwards)
    for (const cell of sortedDates) {
      if (cell.hours > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    gridData.forEach((cell) => {
      if (cell.hours > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    });

    return { currentStreak, longestStreak };
  }, [gridData]);

  const cellSize = 12;
  const cellGap = 3;
  const dayLabelWidth = 30;

  return (
    <div className="w-full">
      {/* Header with title, period selector, and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            {title}
          </h3>
          {showPeriodSelector && (
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              {(["3m", "6m", "1y"] as const).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  className="h-6 px-2 text-xs"
                >
                  {p === "3m" ? "3 Mo" : p === "6m" ? "6 Mo" : "1 Year"}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            {totals.totalHours.toFixed(1)}h logged
          </span>
          <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
            <Calendar className="h-3 w-3" />
            {totals.activeDays} active days
          </span>
          <span className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
            <TrendingUp className="h-3 w-3" />
            {streaks.currentStreak} day streak
          </span>
        </div>
      </div>

      {/* Heatmap container */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex flex-col" style={{ minWidth: `${dayLabelWidth + weeks * (cellSize + cellGap)}px` }}>
          {/* Month labels */}
          <div className="flex mb-1" style={{ marginLeft: `${dayLabelWidth}px` }}>
            {monthLabels.map((label, i) => (
              <span
                key={i}
                className="text-xs text-gray-400 dark:text-gray-500"
                style={{
                  position: "absolute",
                  left: `${dayLabelWidth + label.week * (cellSize + cellGap)}px`,
                }}
              >
                {label.month}
              </span>
            ))}
          </div>

          {/* Grid with day labels */}
          <div className="flex mt-4">
            {/* Day labels */}
            <div className="flex flex-col justify-between pr-1" style={{ width: `${dayLabelWidth}px` }}>
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <span
                  key={day}
                  className="text-xs text-gray-400 dark:text-gray-500"
                  style={{ height: `${cellSize}px`, lineHeight: `${cellSize}px` }}
                >
                  {day % 2 === 1 ? DAYS[day].slice(0, 1) : ""}
                </span>
              ))}
            </div>

            {/* Cells grid */}
            <TooltipProvider delayDuration={100}>
              <div
                className="grid gap-[3px]"
                style={{
                  gridTemplateColumns: `repeat(${weeks}, ${cellSize}px)`,
                  gridTemplateRows: `repeat(7, ${cellSize}px)`,
                  gridAutoFlow: "column",
                }}
              >
                {gridData.map((cell, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <motion.div
                        className="rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-gray-400 dark:hover:ring-gray-500"
                        style={{
                          width: `${cellSize}px`,
                          height: `${cellSize}px`,
                          backgroundColor: getColor(cell.hours),
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: i * 0.001 }}
                        whileHover={{ scale: 1.2 }}
                      />
                    </TooltipTrigger>
                    {showTooltip && (
                      <TooltipContent side="top" className="text-xs">
                        <div className="font-medium">
                          {cell.date.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        {cell.hours > 0 ? (
                          <div className="text-gray-400">
                            {cell.hours.toFixed(1)} hours • {cell.count} {cell.count === 1 ? "activity" : "activities"}
                          </div>
                        ) : (
                          <div className="text-gray-400">No activity</div>
                        )}
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1 mt-3">
            <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">Less</span>
            {colorScale.map((color, i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  backgroundColor: color,
                }}
              />
            ))}
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">More</span>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      {showMonthlyBreakdown && monthlyBreakdown.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Monthly Breakdown
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {monthlyBreakdown.map((m, i) => (
              <div
                key={`${m.month}-${m.year}`}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5 text-center border border-gray-200 dark:border-gray-700"
              >
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {m.month} {m.year !== new Date().getFullYear() && m.year}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                  {m.hours.toFixed(1)}h
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {m.activities} {m.activities === 1 ? "activity" : "activities"}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  {m.days} {m.days === 1 ? "day" : "days"} active
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streak and Stats Summary */}
      {totals.activeDays > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span className="font-medium">Best streak:</span>
            <span className="text-purple-600 dark:text-purple-400 font-bold">{streaks.longestStreak} days</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span className="font-medium">Avg per active day:</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              {(totals.totalHours / totals.activeDays).toFixed(1)}h
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span className="font-medium">Total activities:</span>
            <span className="text-green-600 dark:text-green-400 font-bold">{totals.totalActivities}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityHeatmap;
