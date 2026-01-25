import * as React from "react"
import { cn } from "@/lib/utils"

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  spacing?: "none" | "sm" | "default" | "lg"
}

function Section({
  title,
  description,
  action,
  children,
  spacing = "default",
  className,
  ...props
}: SectionProps) {
  const spacingClasses = {
    none: "gap-0",
    sm: "gap-3",
    default: "gap-6",
    lg: "gap-8",
  }

  return (
    <section
      className={cn("flex flex-col", spacingClasses[spacing], className)}
      {...props}
    >
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {title && (
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

// SectionHeader - Standalone section header
interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: React.ReactNode
}

function SectionHeader({ title, description, action, className, ...props }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)} {...props}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// Divider - Horizontal divider with optional label
interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  labelPosition?: "left" | "center" | "right"
}

function Divider({ label, labelPosition = "center", className, ...props }: DividerProps) {
  if (!label) {
    return (
      <div
        className={cn("h-px bg-border", className)}
        role="separator"
        {...props}
      />
    )
  }

  const positionClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }

  return (
    <div
      className={cn("relative flex items-center", positionClasses[labelPosition], className)}
      role="separator"
      {...props}
    >
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <span className="relative bg-background px-3 text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}

// PageHeader - Top-level page header
interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  breadcrumb?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
}

function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  children,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {breadcrumb}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
      {children}
    </div>
  )
}

// Grid - Responsive grid layout
interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4 | 6
  gap?: "sm" | "default" | "lg"
}

function Grid({ columns = 3, gap = "default", className, children, ...props }: GridProps) {
  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  }

  const gapClasses = {
    sm: "gap-3",
    default: "gap-4 md:gap-6",
    lg: "gap-6 md:gap-8",
  }

  return (
    <div
      className={cn("grid", columnClasses[columns], gapClasses[gap], className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Stack - Vertical stack layout
interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: "none" | "xs" | "sm" | "default" | "lg" | "xl"
}

function Stack({ spacing = "default", className, children, ...props }: StackProps) {
  const spacingClasses = {
    none: "gap-0",
    xs: "gap-1",
    sm: "gap-2",
    default: "gap-4",
    lg: "gap-6",
    xl: "gap-8",
  }

  return (
    <div className={cn("flex flex-col", spacingClasses[spacing], className)} {...props}>
      {children}
    </div>
  )
}

export { Section, SectionHeader, Divider, PageHeader, Grid, Stack }
