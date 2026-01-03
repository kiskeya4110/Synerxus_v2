import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  period = "1y",
  title = "Activity",
}: ActivityHeatmapProps) {
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

  const cellSize = 12;
  const cellGap = 3;
  const dayLabelWidth = 30;

  return (
    <div className="w-full">
      {/* Header with title and stats */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h3>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>{totals.totalHours.toFixed(1)} hours</span>
          <span>{totals.totalActivities} activities</span>
          <span>{totals.activeDays} active days</span>
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
    </div>
  );
}

export default ActivityHeatmap;
