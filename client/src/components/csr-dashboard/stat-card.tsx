/**
 * Stat Card Component
 * Reusable card for displaying KPI metrics with trends
 */

import { memo, ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCompact } from "@/lib/format-utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: ReactNode;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  trendLabel?: string;
  onClick?: () => void;
  className?: string;
  valueFormatter?: (value: number | string) => string;
  color?: "blue" | "green" | "purple" | "amber" | "rose" | "slate";
}

const colorClasses = {
  blue: {
    icon: "text-blue-600 bg-blue-100",
    trend: "text-blue-600",
  },
  green: {
    icon: "text-green-600 bg-green-100",
    trend: "text-green-600",
  },
  purple: {
    icon: "text-purple-600 bg-purple-100",
    trend: "text-purple-600",
  },
  amber: {
    icon: "text-amber-600 bg-amber-100",
    trend: "text-amber-600",
  },
  rose: {
    icon: "text-rose-600 bg-rose-100",
    trend: "text-rose-600",
  },
  slate: {
    icon: "text-slate-600 bg-slate-100",
    trend: "text-slate-600",
  },
};

export const StatCard = memo(({
  title,
  value,
  icon,
  trend,
  trendValue,
  trendLabel,
  onClick,
  className = "",
  valueFormatter = (v) => typeof v === "number" ? formatCompact(v) : v,
  color = "blue",
}: StatCardProps) => {
  const colors = colorClasses[color];

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const trendColor =
    trend === "up"
      ? "text-green-600"
      : trend === "down"
      ? "text-red-600"
      : "text-slate-500";

  const baseClasses = `
    p-4 bg-white rounded-lg border border-slate-200
    transition-all duration-200
    ${onClick ? "cursor-pointer hover:shadow-md hover:border-slate-300" : ""}
    ${className}
  `;

  return (
    <div
      className={baseClasses}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500 font-medium">{title}</span>
        {icon && (
          <div className={`p-2 rounded-lg ${colors.icon}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="text-2xl font-bold text-slate-900 mb-1">
        {valueFormatter(value)}
      </div>

      {(trend || trendValue || trendLabel) && (
        <div className="flex items-center text-sm">
          {trend && (
            <TrendIcon className={`h-4 w-4 mr-1 ${trendColor}`} />
          )}
          {trendValue && (
            <span className={`font-medium ${trendColor}`}>
              {trendValue}
            </span>
          )}
          {trendLabel && (
            <span className="text-slate-500 ml-1">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
});

StatCard.displayName = "StatCard";

/**
 * Stat Card Grid
 * Container for arranging multiple stat cards
 */
interface StatCardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

export const StatCardGrid = memo(({
  children,
  columns = 4,
  className = "",
}: StatCardGridProps) => {
  const colClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  };

  return (
    <div className={`grid gap-4 ${colClasses[columns]} ${className}`}>
      {children}
    </div>
  );
});

StatCardGrid.displayName = "StatCardGrid";

export default StatCard;
