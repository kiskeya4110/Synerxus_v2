import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import logoImage from "@assets/generated_images/synerxus_infinity_loop_logo.png";

interface LogoProps {
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  isButton?: boolean;
  showMotto?: boolean;
  clickable?: boolean; // New prop to make logo clickable by default
}

export default function Logo({
  className,
  showIcon = true,
  size = "md",
  onClick,
  isButton = false,
  showMotto = false,
  clickable = true, // Default to clickable
}: LogoProps) {
  const [, navigate] = useLocation();
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
          <span style={{ color: "#2A4B7F" }}>SYNER</span>
          <span style={{ color: "#F59E0B" }}>XUS</span>
        </span>
        {showMotto && (
          <p className={cn("font-bold whitespace-nowrap", sizeClasses.motto, sizeClasses.mottoLineHeight)} style={{ marginTop: "-2px" }}>
            <span style={{ color: "#2A4B7F" }}>Connect. Manage. </span>
            <span style={{ color: "#F59E0B" }}>Impact Globally</span>
          </p>
        )}
      </div>
    </div>
  );

  // Handle click - custom onClick or navigate to dashboard
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (clickable) {
      const userType = localStorage.getItem('userType');
      if (userType === 'corporate-partner') {
        navigate('/csr-dashboard');
      } else if (userType === 'organization') {
        navigate('/organization-dashboard');
      } else {
        navigate('/volunteer-dashboard');
      }
    }
  };

  // If clickable or is a button, render as button
  if (clickable || isButton) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-2 cursor-pointer transition-all duration-200",
          "hover:scale-105 active:scale-95",
          className
        )}
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
