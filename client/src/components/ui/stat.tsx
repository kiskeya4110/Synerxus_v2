import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

const statVariants = cva(
  "flex flex-col",
  {
    variants: {
      size: {
        sm: "gap-0.5",
        default: "gap-1",
        lg: "gap-2",
      },
      align: {
        left: "items-start text-left",
        center: "items-center text-center",
        right: "items-end text-right",
      },
    },
    defaultVariants: {
      size: "default",
      align: "left",
    },
  }
)

const valueVariants = cva(
  "font-bold tabular-nums text-foreground",
  {
    variants: {
      size: {
        sm: "text-xl",
        default: "text-3xl",
        lg: "text-4xl",
        xl: "text-5xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface StatProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statVariants> {
  label: string
  value: string | number
  previousValue?: number
  trend?: {
    value: number
    direction: "up" | "down" | "neutral"
  }
  suffix?: string
  prefix?: string
  description?: string
  valueSize?: "sm" | "default" | "lg" | "xl"
  loading?: boolean
}

function Stat({
  className,
  size,
  align,
  label,
  value,
  previousValue,
  trend,
  suffix,
  prefix,
  description,
  valueSize,
  loading = false,
  ...props
}: StatProps) {
  // Calculate trend if previousValue is provided
  const calculatedTrend = React.useMemo(() => {
    if (trend) return trend
    if (previousValue !== undefined && typeof value === "number") {
      const change = ((value - previousValue) / previousValue) * 100
      return {
        value: Math.abs(Math.round(change * 10) / 10),
        direction: change > 0 ? "up" : change < 0 ? "down" : "neutral",
      } as const
    }
    return undefined
  }, [trend, previousValue, value])

  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  }

  const TrendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  }

  if (loading) {
    return (
      <div className={cn(statVariants({ size, align }), className)} {...props}>
        <div className="h-3 w-16 bg-secondary rounded animate-pulse" />
        <div className="h-8 w-24 bg-secondary rounded animate-pulse" />
        {description && <div className="h-3 w-20 bg-secondary rounded animate-pulse" />}
      </div>
    )
  }

  return (
    <div className={cn(statVariants({ size, align }), className)} {...props}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-lg text-muted-foreground">{prefix}</span>}
        <span className={cn(valueVariants({ size: valueSize || (size === "lg" ? "lg" : "default") }))}>
          {value}
        </span>
        {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
      </div>
      {calculatedTrend && (
        <div className={cn("flex items-center gap-1 text-sm font-medium", trendColors[calculatedTrend.direction])}>
          {React.createElement(TrendIcon[calculatedTrend.direction], { className: "h-3 w-3" })}
          <span>{calculatedTrend.value}%</span>
          {previousValue !== undefined && (
            <span className="text-muted-foreground font-normal">vs prev</span>
          )}
        </div>
      )}
      {description && (
        <span className="text-sm text-muted-foreground">{description}</span>
      )}
    </div>
  )
}

// StatGroup - Group multiple stats together
interface StatGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5
  dividers?: boolean
}

function StatGroup({ children, columns = 4, dividers = true, className, ...props }: StatGroupProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-5",
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        gridCols[columns],
        dividers && "divide-x divide-border",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child, index) => (
        <div className={cn(index > 0 && dividers && "pl-4")}>
          {child}
        </div>
      ))}
    </div>
  )
}

// CompactStat - Smaller inline stat for lists
interface CompactStatProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  className?: string
}

function CompactStat({ label, value, icon, className }: CompactStatProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon && (
        <div className="flex-shrink-0 p-1.5 rounded-md bg-white/5">
          {icon}
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
      </div>
    </div>
  )
}

export { Stat, StatGroup, CompactStat, statVariants, valueVariants }
