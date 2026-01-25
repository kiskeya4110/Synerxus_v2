"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const progressVariants = cva(
  "relative w-full overflow-hidden rounded-full bg-secondary transition-all",
  {
    variants: {
      size: {
        xs: "h-1",
        sm: "h-2",
        default: "h-3",
        lg: "h-4",
        xl: "h-6",
      },
      variant: {
        default: "",
        striped: "",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

const indicatorVariants = cva(
  "h-full w-full flex-1 transition-all duration-500 ease-out",
  {
    variants: {
      indicatorColor: {
        primary: "bg-primary",
        success: "bg-success",
        accent: "bg-accent",
        destructive: "bg-destructive",
        cyan: "bg-[#22D3EE]",
        gradient: "bg-gradient-to-r from-primary via-accent to-success",
      },
      animated: {
        true: "animate-pulse",
        false: "",
      },
    },
    defaultVariants: {
      indicatorColor: "primary",
      animated: false,
    },
  }
)

export interface ProgressProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, "color">,
    VariantProps<typeof progressVariants> {
  indicatorColor?: "primary" | "success" | "accent" | "destructive" | "cyan" | "gradient"
  animated?: boolean
  showValue?: boolean
  formatValue?: (value: number) => string
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, size, variant, indicatorColor, animated, showValue, formatValue, ...props }, ref) => {
  const displayValue = formatValue ? formatValue(value || 0) : `${value || 0}%`

  return (
    <div className="relative">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ size, variant }), className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(indicatorVariants({ indicatorColor, animated }))}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
      {showValue && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground ml-2 -mr-10">
          {displayValue}
        </span>
      )}
    </div>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

// CircularProgress - For circular progress indicators
interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  color?: "primary" | "success" | "accent" | "destructive" | "cyan"
  showValue?: boolean
  className?: string
}

const colorMap = {
  primary: "stroke-primary",
  success: "stroke-success",
  accent: "stroke-accent",
  destructive: "stroke-destructive",
  cyan: "stroke-[#22D3EE]",
}

function CircularProgress({
  value,
  size = 48,
  strokeWidth = 4,
  color = "primary",
  showValue = false,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(colorMap[color], "transition-all duration-500 ease-out")}
        />
      </svg>
      {showValue && (
        <span className="absolute text-xs font-semibold text-foreground">
          {Math.round(value)}%
        </span>
      )}
    </div>
  )
}

// ProgressWithLabel - Progress bar with label and value
interface ProgressWithLabelProps extends ProgressProps {
  label: string
}

function ProgressWithLabel({ label, value, ...props }: ProgressWithLabelProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <Progress value={value} {...props} />
    </div>
  )
}

export { Progress, CircularProgress, ProgressWithLabel, progressVariants, indicatorVariants }
