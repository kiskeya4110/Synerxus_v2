import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import logoImage from "@assets/Synerxus Modern Logo_1762068075617.png";

interface LogoProps {
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  isButton?: boolean;
  showMotto?: boolean;
  clickable?: boolean;
}

export default function Logo({
  className,
  showIcon = true,
  size = "md",
  onClick,
  isButton = false,
  showMotto = false,
  clickable = true,
}: LogoProps) {
  const [, navigate] = useLocation();
  const [imageError, setImageError] = useState(false);

  const sizes = {
    sm: "h-10",
    md: "h-14 sm:h-12",
    lg: "h-16",
  };

  const content = (
    <div className="flex items-center">
      {!imageError && (
        <img
          src={logoImage}
          alt="Synerxus Logo"
          className={cn(
            sizes[size],
            "w-auto object-contain flex-shrink-0",
          )}
          loading="eager"
          onError={() => setImageError(true)}
        />
      )}
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
