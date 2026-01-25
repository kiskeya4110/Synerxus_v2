import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  size?: "sm" | "default" | "lg"
}

function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = "default",
  className,
  children,
  ...props
}: EmptyStateProps) {
  const sizeClasses = {
    sm: "py-6 gap-2",
    default: "py-12 gap-4",
    lg: "py-20 gap-6",
  }

  const iconSizeClasses = {
    sm: "h-8 w-8",
    default: "h-12 w-12",
    lg: "h-16 w-16",
  }

  const titleSizeClasses = {
    sm: "text-sm",
    default: "text-lg",
    lg: "text-xl",
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {icon && (
        <div className={cn(
          "flex items-center justify-center rounded-full bg-secondary p-4 text-muted-foreground",
          iconSizeClasses[size]
        )}>
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className={cn("font-semibold text-foreground", titleSizeClasses[size])}>
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2">
          {action && (
            <Button onClick={action.onClick} size={size === "sm" ? "sm" : "default"}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              size={size === "sm" ? "sm" : "default"}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

// LoadingState - For when content is loading
interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string
  size?: "sm" | "default" | "lg"
}

function LoadingState({ message = "Loading...", size = "default", className, ...props }: LoadingStateProps) {
  const sizeClasses = {
    sm: "py-6",
    default: "py-12",
    lg: "py-20",
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <div className="relative">
        <div className="h-10 w-10 rounded-full border-4 border-secondary" />
        <div className="absolute inset-0 h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

// ErrorState - For when something goes wrong
interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  message?: string
  retry?: () => void
  size?: "sm" | "default" | "lg"
}

function ErrorState({
  title = "Something went wrong",
  message = "We encountered an error while loading this content.",
  retry,
  size = "default",
  className,
  ...props
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-6 w-6 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      }
      title={title}
      description={message}
      action={retry ? { label: "Try again", onClick: retry } : undefined}
      size={size}
      className={className}
      {...props}
    />
  )
}

// NoDataState - Specific empty state for when there's no data
interface NoDataStateProps extends Omit<EmptyStateProps, "title" | "icon"> {
  title?: string
}

function NoDataState({
  title = "No data available",
  description = "There's nothing to display here yet.",
  ...props
}: NoDataStateProps) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      }
      title={title}
      description={description}
      {...props}
    />
  )
}

export { EmptyState, LoadingState, ErrorState, NoDataState }
