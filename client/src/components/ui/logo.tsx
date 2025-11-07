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
      text: "text-base"
    },
    md: {
      logo: "h-10 w-10 sm:h-12 sm:w-12",
      text: "text-lg sm:text-xl"
    },
    lg: {
      logo: "h-16 w-16",
      text: "text-2xl sm:text-3xl"
    }
  };

  const sizeClasses = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showIcon && (
        <img 
          src="/attached_assets/Synerxus Modern Logo_1762068075617.png" 
          alt="Synerxus Logo" 
          className={cn(sizeClasses.logo, "object-contain flex-shrink-0")}
        />
      )}
      <span className={cn(sizeClasses.text, "font-bold whitespace-nowrap")}>
        <span style={{ color: '#1e3a8a' }}>SYNER</span>
        <span style={{ color: '#b45309' }}>XUS</span>
      </span>
    </div>
  );
}
