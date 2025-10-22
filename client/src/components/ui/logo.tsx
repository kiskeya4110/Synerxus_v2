import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ className, showIcon = true, size = "md" }: LogoProps) {
  const sizes = {
    sm: {
      icon: "h-4 w-4",
      text: "text-base"
    },
    md: {
      icon: "h-5 w-5 sm:h-6 sm:w-6",
      text: "text-lg sm:text-xl"
    },
    lg: {
      icon: "h-8 w-8",
      text: "text-2xl sm:text-3xl"
    }
  };

  const sizeClasses = sizes[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 rounded-lg blur-sm" />
          <div className="relative bg-gradient-to-br from-primary to-purple-600 rounded-lg p-1">
            <Sparkles className={cn(sizeClasses.icon, "text-white")} />
          </div>
        </div>
      )}
      <span className={cn(sizeClasses.text, "font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent")}>
        Synerxus
      </span>
    </div>
  );
}
