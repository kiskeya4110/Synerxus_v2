import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-lg border bg-background text-foreground ring-offset-background transition-all duration-200 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary",
        filled: "border-transparent bg-secondary hover:bg-secondary/80 focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-primary",
        ghost: "border-transparent bg-transparent hover:bg-white/5 focus-visible:bg-white/5 focus-visible:ring-2 focus-visible:ring-primary",
        error: "border-destructive bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive",
      },
      inputSize: {
        default: "h-10 px-3 py-2 text-sm",
        sm: "h-8 px-2 py-1 text-xs",
        lg: "h-12 px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, icon, iconPosition = "left", ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative">
          {iconPosition === "left" && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ variant, inputSize }),
              iconPosition === "left" && "pl-10",
              iconPosition === "right" && "pr-10",
              className
            )}
            ref={ref}
            {...props}
          />
          {iconPosition === "right" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}
        </div>
      )
    }

    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
