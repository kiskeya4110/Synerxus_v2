import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onError" | "onLoad"> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  fallbackElement?: React.ReactNode;
  showSkeleton?: boolean;
  aspectRatio?: "square" | "video" | "wide" | number;
  objectFit?: "cover" | "contain" | "fill" | "none";
  lazyLoad?: boolean;
  lazyLoadThreshold?: string; // IntersectionObserver rootMargin
  onLoadSuccess?: () => void;
  onLoadError?: () => void;
}

/**
 * Optimized Image Component
 *
 * Features:
 * - Lazy loading with IntersectionObserver
 * - Skeleton loading state
 * - Fallback image/element on error
 * - Aspect ratio control
 * - Object-fit support
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  fallbackElement,
  showSkeleton = true,
  aspectRatio,
  objectFit = "cover",
  lazyLoad = true,
  lazyLoadThreshold = "200px",
  className,
  style,
  onLoadSuccess,
  onLoadError,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazyLoad);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update src when prop changes
  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazyLoad || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: lazyLoadThreshold,
        threshold: 0,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazyLoad, isInView, lazyLoadThreshold]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoadSuccess?.();
  };

  const handleError = () => {
    setIsLoading(false);

    // Try fallback if available and not already using it
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsLoading(true);
    } else {
      setHasError(true);
      onLoadError?.();
    }
  };

  // Calculate aspect ratio padding
  const getAspectRatioPadding = () => {
    if (!aspectRatio) return undefined;

    if (typeof aspectRatio === "number") {
      return `${(1 / aspectRatio) * 100}%`;
    }

    switch (aspectRatio) {
      case "square":
        return "100%";
      case "video":
        return "56.25%"; // 16:9
      case "wide":
        return "42.86%"; // 21:9
      default:
        return undefined;
    }
  };

  const objectFitClass = {
    cover: "object-cover",
    contain: "object-contain",
    fill: "object-fill",
    none: "object-none",
  }[objectFit];

  const aspectPadding = getAspectRatioPadding();

  // Render error fallback
  if (hasError) {
    if (fallbackElement) {
      return <>{fallbackElement}</>;
    }

    return (
      <div
        ref={containerRef}
        className={cn(
          "bg-muted flex items-center justify-center",
          className
        )}
        style={{
          ...style,
          paddingBottom: aspectPadding,
          position: aspectPadding ? "relative" : undefined,
        }}
      >
        <div
          className={cn(
            "text-muted-foreground text-sm",
            aspectPadding && "absolute inset-0 flex items-center justify-center"
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-50"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{
        ...style,
        paddingBottom: aspectPadding,
      }}
    >
      {/* Skeleton loader */}
      {showSkeleton && isLoading && (
        <div
          className={cn(
            "bg-muted animate-pulse",
            aspectPadding ? "absolute inset-0" : "w-full h-full"
          )}
        />
      )}

      {/* Actual image - only render when in view */}
      {isInView && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          loading={lazyLoad ? "lazy" : "eager"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            objectFitClass,
            "transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100",
            aspectPadding ? "absolute inset-0 w-full h-full" : "w-full h-full"
          )}
          {...props}
        />
      )}
    </div>
  );
}

/**
 * Avatar-specific optimized image
 */
interface OptimizedAvatarProps {
  src?: string;
  alt: string;
  fallbackInitials?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function OptimizedAvatar({
  src,
  alt,
  fallbackInitials,
  size = "md",
  className,
}: OptimizedAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!src);

  useEffect(() => {
    if (src) {
      setHasError(false);
      setIsLoading(true);
    }
  }, [src]);

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  };

  const initials = fallbackInitials?.slice(0, 2).toUpperCase() || alt.slice(0, 2).toUpperCase();

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground",
          sizeClasses[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden bg-muted relative",
        sizeClasses[size],
        className
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-200",
          isLoading ? "opacity-0" : "opacity-100"
        )}
      />
    </div>
  );
}

/**
 * Background image component with lazy loading
 */
interface OptimizedBackgroundProps {
  src: string;
  fallbackSrc?: string;
  children?: React.ReactNode;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}

export function OptimizedBackground({
  src,
  fallbackSrc,
  children,
  className,
  overlay = false,
  overlayOpacity = 0.5,
}: OptimizedBackgroundProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentSrc(src);
    setIsLoaded(false);
  }, [src]);

  // Lazy load with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "100px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Preload image when in view
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => {
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
      }
    };
    img.src = currentSrc;
  }, [isInView, currentSrc, fallbackSrc]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{
        backgroundImage: isLoaded ? `url(${currentSrc})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Loading placeholder */}
      {!isLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}

      {/* Overlay */}
      {overlay && isLoaded && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default OptimizedImage;
