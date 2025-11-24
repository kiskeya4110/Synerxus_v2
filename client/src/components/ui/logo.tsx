import { useState } from "react";
import { cn } from "@/lib/utils";
import logoImage from "@assets/Synerxus Modern Logo  NBG_1763706841211.png";

interface LogoProps {
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  isButton?: boolean;
  showMotto?: boolean;
}

export default function Logo({
  className,
  showIcon = true,
  size = "md",
  onClick,
  isButton = false,
  showMotto = false,
}: LogoProps) {
  const [imageError, setImageError] = useState(false);

  const sizes = {
    sm: {
      logo: "h-10",
      text: "text-[1.6rem]",
      letterSpacing: "0.02em",
      motto: "text-[7px]",
      mottoLineHeight: "leading-tight",
    },
    md: {
      logo: "h-14 sm:h-12",
      text: "text-[2.4rem] sm:text-[2.2rem]",
      letterSpacing: "0.03em",
      motto: "text-[10px]",
      mottoLineHeight: "leading-tight",
    },
    lg: {
      logo: "h-16",
      text: "text-[2.85rem]",
      letterSpacing: "0.04em",
      motto: "text-[12px]",
      mottoLineHeight: "leading-tight",
    },
  };

  const sizeClasses = sizes[size];

  const content = (
    <div className="flex items-start gap-2.5">
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
      <div className="flex flex-col items-start justify-start pt-0.5">
        <span
          className={cn(
            "font-bold whitespace-nowrap leading-none",
            sizeClasses.text,
          )}
          style={{ letterSpacing: sizeClasses.letterSpacing }}
        >
          <span style={{ color: "#1e3a8a" }}>SYNER</span>
          <span style={{ color: "#b45309" }}>XUS</span>
        </span>
        {showMotto && (
          <p className={cn("font-bold whitespace-nowrap", sizeClasses.motto, sizeClasses.mottoLineHeight)} style={{ marginTop: "-2px" }}>
            <span style={{ color: "#1e3a8a" }}>Connect. Manage. </span>
            <span style={{ color: "#b45309" }}>Impact Globally</span>
          </p>
        )}
      </div>
    </div>
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
