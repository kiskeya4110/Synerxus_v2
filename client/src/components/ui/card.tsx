import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl border text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card border-border shadow-md",
        glass: "bg-card/80 backdrop-blur-sm border-white/10 shadow-lg",
        elevated: "bg-card border-border shadow-xl hover:shadow-2xl",
        outline: "bg-transparent border-border",
        ghost: "bg-transparent border-transparent",
        metric: "bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-white/5 shadow-lg",
      },
      interactive: {
        true: "cursor-pointer hover:border-primary/50 hover:shadow-glow-primary/20 active:scale-[0.99]",
        false: "",
      },
      glow: {
        none: "",
        primary: "shadow-glow-primary",
        accent: "shadow-glow-accent",
        success: "shadow-glow-success",
        cyan: "shadow-glow-cyan",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
      glow: "none",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, glow, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, interactive, glow }), className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Metric Card - specialized for KPI display
interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  icon?: React.ReactNode;
  accentColor?: "primary" | "accent" | "success" | "cyan";
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, label, value, subtitle, trend, icon, accentColor = "primary", ...props }, ref) => {
    const accentClasses = {
      primary: "border-l-primary",
      accent: "border-l-accent",
      success: "border-l-success",
      cyan: "border-l-[#22D3EE]",
    };

    const trendColors = {
      up: "text-success",
      down: "text-destructive",
      neutral: "text-muted-foreground",
    };

    return (
      <Card
        ref={ref}
        variant="metric"
        className={cn(
          "border-l-4 p-5",
          accentClasses[accentColor],
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-3xl font-bold text-foreground tabular-nums">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className={cn("flex items-center gap-1 text-sm font-medium", trendColors[trend.direction])}>
                {trend.direction === "up" && "↑"}
                {trend.direction === "down" && "↓"}
                {trend.value}%
              </div>
            )}
          </div>
          {icon && (
            <div className="p-2 rounded-lg bg-white/5">
              {icon}
            </div>
          )}
        </div>
      </Card>
    );
  }
)
MetricCard.displayName = "MetricCard"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, MetricCard, cardVariants }
