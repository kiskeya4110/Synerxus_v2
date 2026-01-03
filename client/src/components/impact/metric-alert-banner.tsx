import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, X, ChevronRight, TrendingDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MetricAlert {
  id: string;
  metric: string;
  current: number;
  target: number;
  severity: "warning" | "critical";
  recommendation: string;
  trend?: "declining" | "stagnant" | "improving";
}

interface MetricAlertBannerProps {
  alerts: MetricAlert[];
  onDismiss?: (id: string) => void;
  onAction?: (alert: MetricAlert) => void;
  maxVisible?: number;
  title?: string;
}

export function MetricAlertBanner({
  alerts,
  onDismiss,
  onAction,
  maxVisible = 3,
  title = "Action Required",
}: MetricAlertBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));
  const displayAlerts = expanded ? visibleAlerts : visibleAlerts.slice(0, maxVisible);
  const hasMore = visibleAlerts.length > maxVisible;

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const newSet = new Set(Array.from(prev));
      newSet.add(id);
      return newSet;
    });
    onDismiss?.(id);
  };

  if (visibleAlerts.length === 0) return null;

  const getSeverityStyles = (severity: "warning" | "critical") => {
    if (severity === "critical") {
      return {
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-800",
        icon: "text-red-500",
        text: "text-red-700 dark:text-red-300",
        badge: "bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200",
      };
    }
    return {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      icon: "text-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      badge: "bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200",
    };
  };

  const formatPercentage = (current: number, target: number): string => {
    const percent = ((current / target) * 100).toFixed(0);
    return `${percent}% of target`;
  };

  const formatGap = (current: number, target: number): string => {
    const gap = target - current;
    if (gap >= 1000) {
      return `${(gap / 1000).toFixed(1)}K below target`;
    }
    return `${gap.toFixed(0)} below target`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {title}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
            {visibleAlerts.length} {visibleAlerts.length === 1 ? "alert" : "alerts"}
          </span>
        </div>
      </div>

      {/* Alert cards */}
      <AnimatePresence mode="popLayout">
        {displayAlerts.map((alert, index) => {
          const styles = getSeverityStyles(alert.severity);
          const Icon = alert.severity === "critical" ? AlertCircle : AlertTriangle;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={`relative p-4 rounded-lg border ${styles.bg} ${styles.border}`}
            >
              {/* Dismiss button */}
              <button
                onClick={() => handleDismiss(alert.id)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>

              <div className="flex items-start gap-3 pr-6">
                {/* Icon */}
                <div className={`p-2 rounded-full ${styles.badge}`}>
                  <Icon className={`h-4 w-4 ${styles.icon}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium ${styles.text}`}>
                      {alert.metric}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge}`}>
                      {alert.severity === "critical" ? "Critical" : "Warning"}
                    </span>
                  </div>

                  {/* Metric details */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>
                      Current: <strong>{alert.current.toLocaleString()}</strong>
                    </span>
                    <span>
                      Target: <strong>{alert.target.toLocaleString()}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      {formatGap(alert.current, alert.target)}
                    </span>
                  </div>

                  {/* Recommendation */}
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {alert.recommendation}
                  </p>

                  {/* Action button */}
                  {onAction && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onAction(alert)}
                      className={`mt-2 p-0 h-auto ${styles.text} hover:opacity-80`}
                    >
                      Take Action
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress indicator */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{formatPercentage(alert.current, alert.target)}</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${alert.severity === "critical" ? "bg-red-500" : "bg-amber-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((alert.current / alert.target) * 100, 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Show more/less */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {expanded
            ? "Show Less"
            : `Show ${visibleAlerts.length - maxVisible} More Alerts`}
        </Button>
      )}
    </motion.div>
  );
}

export default MetricAlertBanner;
