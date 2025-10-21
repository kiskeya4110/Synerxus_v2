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
  change?: {
    value: string;
    isPositive?: boolean;
    label: string;
  };
}

export default function StatsCard({
  title,
  value,
  icon,
  iconBgClass = "bg-primary-100 dark:bg-primary-900",
  iconColor = "text-primary-600 dark:text-primary-400",
  trend,
  onClick,
  change
}: StatsCardProps) {
  const cardClass = onClick 
    ? "bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition-shadow duration-200"
    : "bg-white dark:bg-gray-800 rounded-lg shadow p-4";
    
  return (
    <div className={cardClass} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center">
              <ArrowUp className="h-3 w-3 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={`flex-shrink-0 p-3 rounded-lg ${iconBgClass} ${iconColor}`}>
          {icon}
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
