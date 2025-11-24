import { useOnboarding } from "@/contexts/onboarding-context";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingTriggerProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  showText?: boolean;
}

export default function OnboardingTrigger({
  variant = "outline",
  size = "sm",
  showText = true,
}: OnboardingTriggerProps) {
  const { startOnboarding } = useOnboarding();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={startOnboarding}
      className="flex items-center gap-2"
      data-testid="button-restart-onboarding"
    >
      <HelpCircle className="w-4 h-4" />
      {showText && "Guide"}
    </Button>
  );
}
