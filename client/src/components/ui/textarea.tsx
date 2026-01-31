import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex min-h-[80px] w-full rounded-lg border bg-background text-foreground ring-offset-background transition-all duration-200 ease-out placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none",
  {
    variants: {
      variant: {
        default: "border-input hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary",
        filled: "border-transparent bg-secondary hover:bg-secondary/80 focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-primary",
        ghost: "border-transparent bg-transparent hover:bg-stone-100 focus-visible:bg-stone-50 focus-visible:ring-2 focus-visible:ring-primary",
        error: "border-destructive bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive",
      },
      textareaSize: {
        default: "px-3 py-2 text-sm",
        sm: "px-2 py-1.5 text-xs min-h-[60px]",
        lg: "px-4 py-3 text-base min-h-[120px]",
      },
    },
    defaultVariants: {
      variant: "default",
      textareaSize: "default",
    },
  }
)

export interface TextareaProps
  extends Omit<React.ComponentProps<"textarea">, "size">,
    VariantProps<typeof textareaVariants> {
  showCount?: boolean
  maxLength?: number
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, textareaSize, showCount, maxLength, value, onChange, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value || "")

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInternalValue(e.target.value)
      onChange?.(e)
    }

    const currentLength = String(value ?? internalValue).length

    if (showCount && maxLength) {
      return (
        <div className="relative">
          <textarea
            className={cn(textareaVariants({ variant, textareaSize }), "pb-6", className)}
            ref={ref}
            value={value}
            onChange={handleChange}
            maxLength={maxLength}
            {...props}
          />
          <span className={cn(
            "absolute bottom-2 right-3 text-xs",
            currentLength >= maxLength ? "text-destructive" : "text-muted-foreground"
          )}>
            {currentLength}/{maxLength}
          </span>
        </div>
      )
    }

    return (
      <textarea
        className={cn(textareaVariants({ variant, textareaSize }), className)}
        ref={ref}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
