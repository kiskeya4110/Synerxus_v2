import { Link2 } from "lucide-react";
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
          <Link2 className={cn(sizeClasses.icon, "text-primary rotate-45")} />
          <div className="absolute -inset-1 bg-primary/10 rounded-full -z-10" />
        </div>
      )}
      <span className={cn(sizeClasses.text, "font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent")}>
        aBridge
      </span>
    </div>
  );
}
