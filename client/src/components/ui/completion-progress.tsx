"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

const CompletionProgress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={`relative h-4 w-full overflow-hidden rounded-full bg-gray-300 dark:bg-gray-600 ${className || ""}`}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-emerald-600 dark:bg-emerald-500 transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
CompletionProgress.displayName = "CompletionProgress"

export { CompletionProgress }
