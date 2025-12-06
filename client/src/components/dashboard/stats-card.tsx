import { ArrowUp } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";

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
  animated?: boolean;
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
  textColor = "text-gray-900 dark:text-white",
  animated = true,
}: StatsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: "-50px" });

  // Number animation for numeric values
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  const isNumeric = !isNaN(numericValue) && isFinite(numericValue);

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
  });

  const [displayValue, setDisplayValue] = useState(isNumeric ? 0 : numericValue);

  useEffect(() => {
    if (isInView && animated && isNumeric) {
      motionValue.set(numericValue);
    }
  }, [isInView, animated, isNumeric, numericValue, motionValue]);

  useEffect(() => {
    if (animated && isNumeric) {
      const unsubscribe = springValue.on("change", (latest) => {
        setDisplayValue(latest);
      });
      return unsubscribe;
    }
  }, [springValue, animated, isNumeric]);

  const cardClass = onClick
    ? `rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] ${gradient || "bg-white dark:bg-gray-800"} ${compact ? "p-3 sm:p-4 md:p-5" : "p-4"}`
    : `rounded-xl shadow-md ${gradient || "bg-white dark:bg-gray-800"} ${compact ? "p-3 sm:p-4 md:p-5" : "p-4"}`;

  return (
    <motion.div
      ref={cardRef}
      className={cardClass}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className={`font-medium ${gradient ? "text-white/80" : "text-gray-500 dark:text-gray-400"} ${compact ? "text-xs sm:text-sm" : "text-sm"}`}>{title}</p>
          <p className={`font-bold ${gradient ? "text-white" : textColor} ${compact ? "text-lg sm:text-xl md:text-2xl mt-0.5" : "text-2xl mt-1"}`}>
            {animated && isNumeric && isFinite(displayValue) ? (
              Math.round(displayValue).toLocaleString()
            ) : (
              typeof value === 'number' ? value.toLocaleString() : value
            )}
          </p>
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
    </motion.div>
  );
}
