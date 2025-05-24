import { ArrowUp } from "lucide-react";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgClass: string;
  iconColor: string;
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
  iconBgClass,
  iconColor,
  change
}: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg ${iconBgClass} ${iconColor}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-semibold">{value}</p>
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
