import { ArrowUp } from "lucide-react";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgClass?: string;
  iconColor?: string;
  trend?: string;
  onClick?: () => void;
  compact?: boolean;
  change?: {
    value: string;
    isPositive?: boolean;
    label: string;
  };
  gradient?: string;
  textColor?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  iconBgClass = "bg-primary-100 dark:bg-primary-900",
  iconColor = "text-primary-600 dark:text-primary-400",
  trend,
  onClick,
  compact = false,
  change,
  gradient,
  textColor = "text-gray-900 dark:text-white"
}: StatsCardProps) {
  const cardClass = onClick 
    ? `rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200 ${gradient || "bg-white dark:bg-gray-800"} ${compact ? "p-3 sm:p-4 md:p-5" : "p-4"}`
    : `rounded-xl shadow-md ${gradient || "bg-white dark:bg-gray-800"} ${compact ? "p-3 sm:p-4 md:p-5" : "p-4"}`;
    
  return (
    <div className={cardClass} onClick={onClick}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className={`font-medium ${gradient ? "text-white/80" : "text-gray-500 dark:text-gray-400"} ${compact ? "text-xs sm:text-sm" : "text-sm"}`}>{title}</p>
          <p className={`font-bold ${gradient ? "text-white" : textColor} ${compact ? "text-lg sm:text-xl md:text-2xl mt-0.5" : "text-2xl mt-1"}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {trend && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center">
              <ArrowUp className="h-3 w-3 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={`flex-shrink-0 rounded-lg ${compact ? "p-2 sm:p-2.5 md:p-3" : "p-3"} ${iconBgClass} ${iconColor}`}>
          <div className={compact ? "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" : ""}>{icon}</div>
        </div>
      </div>
      {change && (
        <div className="mt-2 flex items-center text-sm">
          {change.isPositive !== false && (
            <span className="text-success-500 dark:text-success-400 flex items-center">
              <ArrowUp className="mr-1 h-3 w-3" />
              {change.value}
            </span>
          )}
          {change.isPositive === false && (
            <span className="text-destructive flex items-center">
              <ArrowUp className="mr-1 h-3 w-3 rotate-180" />
              {change.value}
            </span>
          )}
          <span className="text-gray-500 dark:text-gray-400 ml-2">{change.label}</span>
        </div>
      )}
    </div>
  );
}
