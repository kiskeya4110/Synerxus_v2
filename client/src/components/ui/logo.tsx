import { useState } from "react";
import { cn } from "@/lib/utils";
import logoImage from "@assets/Synerxus Modern Logo  NBG_1763706841211.png";

interface LogoProps {
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  isButton?: boolean;
}

export default function Logo({
  className,
  showIcon = true,
  size = "md",
  onClick,
  isButton = false,
}: LogoProps) {
  const [imageError, setImageError] = useState(false);

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

  const content = (
    <>
      {showIcon && !imageError && (
        <img
          src={logoImage}
          alt="Synerxus Logo"
          className={cn(
            sizeClasses.logo,
            "w-auto object-contain flex-shrink-0",
          )}
          loading="eager"
          onError={() => setImageError(true)}
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
    </>
  );

  if (isButton && onClick) {
    return (
      <button 
        onClick={onClick}
        className={cn("inline-flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity", className)}
        data-testid="button-logo"
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {content}
    </div>
  );
}
