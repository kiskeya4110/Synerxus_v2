"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode
  containerClassName?: string
}

/**
 * LazyImage - Optimized image component with lazy loading and placeholder
 *
 * Features:
 * - Native lazy loading for better performance
 * - Loading placeholder with smooth fade-in
 * - Error handling with fallback
 * - Intersection Observer for more control (optional)
 */
const LazyImage = React.forwardRef<HTMLImageElement, LazyImageProps>(
  ({ className, containerClassName, src, alt, fallback, ...props }, ref) => {
    const [isLoaded, setIsLoaded] = React.useState(false)
    const [hasError, setHasError] = React.useState(false)

    // Reset state when src changes
    React.useEffect(() => {
      setIsLoaded(false)
      setHasError(false)
    }, [src])

    if (hasError) {
      return fallback ? (
        <>{fallback}</>
      ) : (
        <div
          className={cn(
            "bg-muted flex items-center justify-center text-muted-foreground",
            containerClassName,
            className
          )}
        >
          <span className="text-sm">Image unavailable</span>
        </div>
      )
    }

    return (
      <div className={cn("relative overflow-hidden", containerClassName)}>
        {/* Loading placeholder */}
        {!isLoaded && (
          <div
            className={cn(
              "absolute inset-0 bg-muted animate-pulse",
              className
            )}
          />
        )}

        {/* Actual image with lazy loading */}
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          {...props}
        />
      </div>
    )
  }
)
LazyImage.displayName = "LazyImage"

/**
 * ResponsiveImage - Image with srcSet support for different screen sizes
 * Automatically serves smaller images on smaller screens
 */
interface ResponsiveImageProps extends LazyImageProps {
  srcSet?: string
  sizes?: string
}

const ResponsiveImage = React.forwardRef<HTMLImageElement, ResponsiveImageProps>(
  ({ srcSet, sizes = "(max-width: 768px) 100vw, 50vw", ...props }, ref) => {
    return (
      <LazyImage
        ref={ref}
        srcSet={srcSet}
        sizes={sizes}
        {...props}
      />
    )
  }
)
ResponsiveImage.displayName = "ResponsiveImage"

export { LazyImage, ResponsiveImage }
