"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-[10px]",
        sm: "h-8 w-8 text-xs",
        default: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-16 w-16 text-lg",
        "2xl": "h-20 w-20 text-xl",
      },
      ring: {
        none: "",
        default: "ring-2 ring-border ring-offset-2 ring-offset-background",
        primary: "ring-2 ring-primary ring-offset-2 ring-offset-background",
        success: "ring-2 ring-success ring-offset-2 ring-offset-background",
        accent: "ring-2 ring-accent ring-offset-2 ring-offset-background",
      },
    },
    defaultVariants: {
      size: "default",
      ring: "none",
    },
  }
)

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, ring, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size, ring }), className)}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, ...props }, ref) => {
  const [error, setError] = React.useState(false);

  // Reset error state when src changes
  React.useEffect(() => {
    setError(false);
  }, [src]);

  if (error || !src) {
    return null;
  }

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={src}
      className={cn("aspect-square h-full w-full object-cover", className)}
      onError={() => setError(true)}
      onLoad={() => setError(false)}
      loading="lazy"
      {...props}
    />
  );
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-secondary text-secondary-foreground font-medium",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

// UserAvatar - Higher-level component with name parsing
interface UserAvatarProps extends VariantProps<typeof avatarVariants> {
  src?: string | null
  name?: string
  className?: string
}

function UserAvatar({ src, name, size, ring, className }: UserAvatarProps) {
  const initials = React.useMemo(() => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }, [name])

  return (
    <Avatar size={size} ring={ring} className={className}>
      <AvatarImage src={src || undefined} alt={name || "User"} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}

// AvatarGroup - Display multiple avatars with overlap
interface AvatarGroupProps {
  children: React.ReactNode
  max?: number
  size?: VariantProps<typeof avatarVariants>["size"]
  className?: string
}

function AvatarGroup({ children, max = 4, size = "default", className }: AvatarGroupProps) {
  const childrenArray = React.Children.toArray(children)
  const visibleChildren = childrenArray.slice(0, max)
  const remainingCount = childrenArray.length - max

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visibleChildren.map((child, index) => (
        <div key={index} className="relative" style={{ zIndex: max - index }}>
          {React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<AvatarProps>, { size, ring: "default" })
            : child}
        </div>
      ))}
      {remainingCount > 0 && (
        <Avatar size={size} ring="default" className="bg-secondary">
          <AvatarFallback className="bg-secondary text-muted-foreground text-xs">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

export { Avatar, AvatarImage, AvatarFallback, UserAvatar, AvatarGroup, avatarVariants }
