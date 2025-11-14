import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ className, showIcon = true, size = "md" }: LogoProps) {
  const sizes = {
    sm: {
      logo: "h-8 w-8",
      text: "text-base",
      letterSpacing: "0.02em"
    },
    md: {
      logo: "h-10 w-10 sm:h-12 sm:w-12",
      text: "text-lg sm:text-xl",
      letterSpacing: "0.03em"
    },
    lg: {
      logo: "h-16 w-16",
      text: "text-2xl sm:text-3xl",
      letterSpacing: "0.04em"
    }
  };

  const sizeClasses = sizes[size];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {showIcon && (
        <img 
          src="/attached_assets/Synerxus Modern Logo 2_1763102516922.png" 
          alt="Synerxus Logo" 
          className={cn(sizeClasses.logo, "object-contain flex-shrink-0")}
          style={{ maxWidth: '100%', height: 'auto' }}
          loading="eager"
        />
      )}
      <span 
        className={cn(sizeClasses.text, "font-bold whitespace-nowrap")}
        style={{ letterSpacing: sizeClasses.letterSpacing }}
      >
        <span style={{ color: '#1e3a8a' }}>SYNER</span>
        <span style={{ color: '#b45309' }}>XUS</span>
      </span>
    </div>
  );
}
