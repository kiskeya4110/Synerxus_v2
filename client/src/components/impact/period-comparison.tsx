import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus, TrendingUp } from "lucide-react";

interface PeriodMetrics {
  hours: number;
  volunteers: number;
  beneficiaries: number;
  aiu?: number;
  projects?: number;
}

interface PeriodComparisonProps {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  currentLabel?: string;
  previousLabel?: string;
  title?: string;
}

interface MetricChange {
  label: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  format?: "number" | "decimal";
}

export function PeriodComparison({
  current,
  previous,
  currentLabel = "This Period",
  previousLabel = "Last Period",
  title = "Period Comparison",
}: PeriodComparisonProps) {
  const metrics: MetricChange[] = useMemo(() => {
    const calculate = (
      label: string,
      curr: number,
      prev: number,
      format: "number" | "decimal" = "number"
    ): MetricChange => {
      const change = curr - prev;
      const changePercent = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
      return { label, current: curr, previous: prev, change, changePercent, format };
    };

    return [
      calculate("Hours", current.hours, previous.hours),
      calculate("Volunteers", current.volunteers, previous.volunteers),
      calculate("Beneficiaries", current.beneficiaries, previous.beneficiaries),
      ...(current.aiu !== undefined && previous.aiu !== undefined
        ? [calculate("Contribution Score", current.aiu, previous.aiu, "decimal")]
        : []),
      ...(current.projects !== undefined && previous.projects !== undefined
        ? [calculate("Projects", current.projects, previous.projects)]
        : []),
    ];
  }, [current, previous]);

  const formatValue = (value: number, format: "number" | "decimal" = "number"): string => {
    if (format === "decimal") {
      return value.toFixed(1);
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return "text-green-600 dark:text-green-400";
    if (change < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-500 dark:text-gray-400";
  };

  const getChangeBgColor = (change: number): string => {
    if (change > 0) return "bg-green-100 dark:bg-green-900/30";
    if (change < 0) return "bg-red-100 dark:bg-red-900/30";
    return "bg-gray-100 dark:bg-gray-800";
  };

  const ChangeIcon = ({ change }: { change: number }) => {
    if (change > 0) return <ArrowUp className="h-3 w-3" />;
    if (change < 0) return <ArrowDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentLabel} vs {previousLabel}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {metric.label}
              </span>

              <div className="flex items-center gap-4">
                {/* Previous value */}
                <div className="text-right">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {previousLabel}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatValue(metric.previous, metric.format)}
                  </p>
                </div>

                {/* Arrow */}
                <div className="text-gray-300 dark:text-gray-600">→</div>

                {/* Current value */}
                <div className="text-right">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {currentLabel}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatValue(metric.current, metric.format)}
                  </p>
                </div>

                {/* Change badge */}
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getChangeBgColor(metric.change)} ${getChangeColor(metric.change)}`}
                >
                  <ChangeIcon change={metric.change} />
                  {metric.changePercent >= 0 ? "+" : ""}
                  {metric.changePercent.toFixed(0)}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Overall Trend
            </span>
            {(() => {
              const avgChange = metrics.reduce((sum, m) => sum + m.changePercent, 0) / metrics.length;
              const isPositive = avgChange > 0;
              const isNeutral = Math.abs(avgChange) < 5;

              return (
                <div className={`flex items-center gap-1 ${isNeutral ? "text-gray-500" : isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {isNeutral ? (
                    <>
                      <Minus className="h-4 w-4" />
                      <span className="font-medium">Stable</span>
                    </>
                  ) : isPositive ? (
                    <>
                      <ArrowUp className="h-4 w-4" />
                      <span className="font-medium">Growing (+{avgChange.toFixed(0)}%)</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="h-4 w-4" />
                      <span className="font-medium">Declining ({avgChange.toFixed(0)}%)</span>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

export default PeriodComparison;
