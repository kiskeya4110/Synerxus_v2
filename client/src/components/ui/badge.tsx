import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { getSDGColor, getSDGName } from "@/lib/sdg-utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Primary - Indigo
        default: "border-transparent bg-primary text-primary-foreground",

        // Secondary - Subtle
        secondary: "border-transparent bg-secondary text-secondary-foreground",

        // Success - Green
        success: "border-transparent bg-success/20 text-success",

        // Warning - Amber
        warning: "border-transparent bg-accent/20 text-accent",

        // Destructive - Red
        destructive: "border-transparent bg-destructive/20 text-destructive",

        // Info - Cyan
        info: "border-transparent bg-[#22D3EE]/20 text-[#22D3EE]",

        // Outline variants
        outline: "border-border bg-transparent text-foreground",
        "outline-primary": "border-primary/50 bg-transparent text-primary",
        "outline-success": "border-success/50 bg-transparent text-success",
        "outline-warning": "border-accent/50 bg-transparent text-accent",
        "outline-destructive": "border-destructive/50 bg-transparent text-destructive",

        // Verified badge
        verified: "border-transparent bg-success text-white",

        // Pending badge
        pending: "border-transparent bg-accent/20 text-accent animate-pulse",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon}
      {children}
    </div>
  )
}

// SDG Badge - specialized for Sustainable Development Goals
interface SDGBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  sdg: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17
  showNumber?: boolean
  size?: "sm" | "default" | "lg"
}


function SDGBadge({ sdg, showNumber = true, size = "default", className, ...props }: SDGBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    default: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold text-white transition-all duration-200",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: getSDGColor(sdg) }}
      title={getSDGName(sdg)}
      {...props}
    >
      {showNumber && <span>SDG {sdg}</span>}
      {!showNumber && <span>{getSDGName(sdg)}</span>}
    </div>
  )
}

// Status Badge - for verification states
interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: string
  size?: "sm" | "default" | "lg"
}

function StatusBadge({ status, size = "default", className, ...props }: StatusBadgeProps) {
  const normalized = (status || "").toLowerCase();

  const statusConfig: Record<string, { variant: "verified" | "pending" | "destructive" | "secondary"; icon: string; label: string }> = {
    verified: { variant: "verified", icon: "✓", label: "Verified" },
    approved: { variant: "verified", icon: "✓", label: "Approved" },
    pending: { variant: "pending", icon: "○", label: "Pending" },
    rejected: { variant: "destructive", icon: "✕", label: "Rejected" },
    declined: { variant: "destructive", icon: "✕", label: "Declined" },
    draft: { variant: "secondary", icon: "◐", label: "Draft" },
  }

  const config = statusConfig[normalized] ?? { variant: "secondary" as const, icon: "◐", label: status || "Unknown" }

  return (
    <Badge variant={config.variant} size={size} className={className} {...props}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </Badge>
  )
}

export { Badge, badgeVariants, SDGBadge, StatusBadge }
