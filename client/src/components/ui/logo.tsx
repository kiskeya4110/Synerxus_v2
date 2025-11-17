import { cn } from "@/lib/utils";
import logoImage from "@assets/New Modern Synerxus Logo.jpg";

interface LogoProps {
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function Logo({
  className,
  showIcon = true,
  size = "md",
}: LogoProps) {
  const sizes = {
    sm: {
      logo: "h-8",
      text: "text-[1.4rem]",
      letterSpacing: "0.02em",
    },
    md: {
      logo: "h-14 sm:h-12",
      text: "text-[2.4rem] sm:text-[2.2rem]",
      letterSpacing: "0.03em",
    },
    lg: {
      logo: "h-16",
      text: "text-[2.85rem]",
      letterSpacing: "0.04em",
    },
  };

  const sizeClasses = sizes[size];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {showIcon && (
        <img
          src={logoImage}
          alt="Synerxus Logo"
          className={cn(
            sizeClasses.logo,
            "w-auto object-contain flex-shrink-0",
          )}
          loading="eager"
        />
      )}
      <span
        className={cn(
          "font-bold whitespace-nowrap leading-none flex items-center",
          sizeClasses.text,
        )}
        style={{ letterSpacing: sizeClasses.letterSpacing }}
      >
        <span style={{ color: "#1e3a8a" }}>SYNER</span>
        <span style={{ color: "#b45309" }}>XUS</span>
      </span>
    </div>
  );
}
