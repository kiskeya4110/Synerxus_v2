import { useEffect, useState, useRef } from "react";
import { useOnboarding } from "@/contexts/onboarding-context";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OnboardingGuide() {
  const { isActive, currentStep, currentStepIndex, steps, nextStep, prevStep, skipOnboarding, completeOnboarding } = useOnboarding();
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !currentStep?.targetSelector) {
      return;
    }

    const updatePosition = () => {
      const target = document.querySelector(currentStep.targetSelector!);
      if (target) {
        const rect = target.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

        setPosition({
          top: rect.top + scrollTop,
          left: rect.left + scrollLeft,
          width: rect.width,
          height: rect.height,
        });
        targetRef.current = target as HTMLElement;
      }
    };

    updatePosition();
    const timer = setTimeout(updatePosition, 500);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isActive, currentStep?.targetSelector]);

  if (!isActive || !currentStep) return null;

  const totalSteps = steps.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  // Calculate tooltip position based on target
  const tooltipTop = position.top + position.height + 20;
  const tooltipLeft = Math.max(10, position.left + position.width / 2 - 150);

  return (
    <>
      {/* Overlay highlighting the target element */}
      <AnimatePresence>
        {currentStep.targetSelector && (
          <>
            {/* Semi-transparent overlay */}
            <motion.div
              className="fixed inset-0 z-40 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                background: "radial-gradient(circle at var(--highlight-x, 50%) var(--highlight-y, 50%), transparent 100px, rgba(0, 0, 0, 0.7) 100%)",
                "--highlight-x": `${position.left + position.width / 2}px`,
                "--highlight-y": `${position.top + position.height / 2}px`,
              } as any}
            />
            {/* Highlight box around target */}
            <motion.div
              className="fixed z-41 border-2 border-primary rounded-lg pointer-events-none"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                top: position.top - 4,
                left: position.left - 4,
                width: position.width + 8,
                height: position.height + 8,
                boxShadow: "0 0 0 4px rgba(var(--primary-rgb), 0.2), 0 0 20px rgba(var(--primary-rgb), 0.4)",
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence>
        <motion.div
          className="fixed z-50 bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-6 max-w-sm w-96"
          style={{
            top: tooltipTop,
            left: tooltipLeft,
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
              <button
                onClick={skipOnboarding}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                data-testid="button-skip-onboarding"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{currentStep.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{currentStep.description}</p>

            {/* Actions */}
            {currentStep.actions && currentStep.actions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">Next step:</p>
                <ul className="space-y-1">
                  {currentStep.actions.map((action, idx) => (
                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-2"
              data-testid="button-onboarding-prev"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={skipOnboarding}
              data-testid="button-onboarding-skip"
            >
              Skip
            </Button>

            <Button
              size="sm"
              onClick={currentStepIndex === totalSteps - 1 ? completeOnboarding : nextStep}
              className="flex items-center gap-2 flex-1"
              data-testid="button-onboarding-next"
            >
              {currentStepIndex === totalSteps - 1 ? "Get Started!" : "Next"}
              {currentStepIndex < totalSteps - 1 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>

          {/* Tip */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            💡 Tip: You can restart this guide anytime from your settings.
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
