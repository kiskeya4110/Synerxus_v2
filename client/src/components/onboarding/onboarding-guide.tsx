import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useOnboarding } from "@/contexts/onboarding-context";
import { useOnboardingExperiment } from "@/contexts/ab-testing-context";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, MousePointerClick, Navigation, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Route mappings for steps that require navigation
const STEP_ROUTES: Record<string, string> = {
  "dashboard-kpis": "/volunteer-dashboard",
  "discover-opportunities": "/discover-opportunities",
  "log-activity": "/log-activity",
  "view-projects": "/projects",
  "track-impact": "/impact-visualization",
  "manage-profile": "/volunteer-profile-settings",
  "messages": "/volunteer-messages",
  "sdg-alignment": "/volunteer-dashboard",
  // Organization routes
  "dashboard-overview": "/organization-dashboard",
  "quick-actions": "/organization-dashboard",
  "create-projects": "/organization-dashboard",
  "manage-volunteers": "/volunteers",
  "create-tasks": "/my-work",
  "review-applications": "/applications",
  "generate-reports": "/impact-visualization",
  "sdg-mapping": "/sdg-mapping",
  // CSR routes
  "employee-engagement": "/csr-dashboard",
  "leaderboard": "/csr-dashboard",
  "geographic-map": "/csr-dashboard",
  "impact-reports": "/csr-reports-exports",
};

export default function OnboardingGuide() {
  const { isActive, currentStep, currentStepIndex, steps, nextStep, prevStep, skipOnboarding, completeOnboarding } = useOnboarding();
  const { variant, config, track } = useOnboardingExperiment();
  const [location, navigate] = useLocation();
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [targetFound, setTargetFound] = useState(false);
  const [isOnCorrectPage, setIsOnCorrectPage] = useState(true);
  const [clickHintVisible, setClickHintVisible] = useState(false);
  const [startTime] = useState(() => Date.now());
  const targetRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  // Track onboarding start
  useEffect(() => {
    if (isActive && currentStepIndex === 0) {
      track('onboarding_started', { variant: variant?.id, totalSteps: steps.length });
    }
  }, [isActive, currentStepIndex, track, variant?.id, steps.length]);

  // Track step views
  useEffect(() => {
    if (isActive && currentStep) {
      track('step_viewed', {
        stepId: currentStep.id,
        stepIndex: currentStepIndex,
        variant: variant?.id
      });
    }
  }, [isActive, currentStep, currentStepIndex, track, variant?.id]);

  // Track completion/skip with timing
  const handleComplete = useCallback(() => {
    const duration = Math.round((Date.now() - startTime) / 1000);
    track('onboarding_completed', {
      variant: variant?.id,
      stepsCompleted: currentStepIndex + 1,
      totalSteps: steps.length,
      durationSeconds: duration
    });
    completeOnboarding();
  }, [track, variant?.id, currentStepIndex, steps.length, startTime, completeOnboarding]);

  const handleSkip = useCallback(() => {
    const duration = Math.round((Date.now() - startTime) / 1000);
    track('onboarding_skipped', {
      variant: variant?.id,
      stepsCompleted: currentStepIndex,
      skipAtStep: currentStep?.id,
      durationSeconds: duration
    });
    skipOnboarding();
  }, [track, variant?.id, currentStepIndex, currentStep?.id, startTime, skipOnboarding]);

  const handleNext = useCallback(() => {
    track('step_completed', { stepId: currentStep?.id, stepIndex: currentStepIndex });
    if (currentStepIndex === steps.length - 1) {
      handleComplete();
    } else {
      // Apply delay if configured (for guided variant)
      if (config.delayBetweenSteps > 0) {
        setTimeout(nextStep, config.delayBetweenSteps);
      } else {
        nextStep();
      }
    }
  }, [track, currentStep?.id, currentStepIndex, steps.length, handleComplete, config.delayBetweenSteps, nextStep]);

  // Find and position target element
  const findAndPositionTarget = useCallback(() => {
    if (!currentStep?.targetSelector) {
      setTargetFound(false);
      return;
    }

    const target = document.querySelector(currentStep.targetSelector);
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
      setTargetFound(true);

      // Scroll target into view smoothly
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

      // Show click hint after a delay
      setTimeout(() => setClickHintVisible(true), 1000);
    } else {
      setTargetFound(false);
      setClickHintVisible(false);
    }
  }, [currentStep?.targetSelector]);

  // Check if on correct page for current step
  useEffect(() => {
    if (!isActive || !currentStep) return;

    const expectedRoute = STEP_ROUTES[currentStep.id];
    if (expectedRoute) {
      const isCorrect = location.includes(expectedRoute.replace("/", "")) ||
                        location === expectedRoute ||
                        (expectedRoute.includes("dashboard") && location.includes("dashboard"));
      setIsOnCorrectPage(isCorrect);
    } else {
      setIsOnCorrectPage(true);
    }
  }, [isActive, currentStep, location]);

  // Set up element observation and positioning
  useEffect(() => {
    if (!isActive || !currentStep?.targetSelector) {
      setTargetFound(false);
      return;
    }

    // Initial search
    findAndPositionTarget();

    // Set up delayed retry for dynamically loaded elements
    const retryTimers = [100, 300, 500, 1000, 2000].map(delay =>
      setTimeout(findAndPositionTarget, delay)
    );

    // Set up mutation observer to detect when target appears
    observerRef.current = new MutationObserver(() => {
      findAndPositionTarget();
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-testid", "class"],
    });

    // Update position on scroll/resize
    window.addEventListener("resize", findAndPositionTarget);
    window.addEventListener("scroll", findAndPositionTarget);

    return () => {
      retryTimers.forEach(clearTimeout);
      observerRef.current?.disconnect();
      window.removeEventListener("resize", findAndPositionTarget);
      window.removeEventListener("scroll", findAndPositionTarget);
    };
  }, [isActive, currentStep?.targetSelector, findAndPositionTarget]);

  // Handle clicking on the highlighted target to advance
  useEffect(() => {
    if (!isActive || !targetRef.current || !targetFound) return;

    const handleTargetClick = (e: Event) => {
      e.stopPropagation();
      // Small delay to let any button action complete
      setTimeout(() => {
        if (currentStepIndex === steps.length - 1) {
          completeOnboarding();
        } else {
          nextStep();
        }
      }, 300);
    };

    const target = targetRef.current;
    target.addEventListener("click", handleTargetClick, { once: true });

    return () => {
      target.removeEventListener("click", handleTargetClick);
    };
  }, [isActive, targetFound, currentStepIndex, steps.length, nextStep, completeOnboarding]);

  // Navigate to correct page
  const handleNavigateToStep = () => {
    const expectedRoute = STEP_ROUTES[currentStep?.id || ""];
    if (expectedRoute) {
      navigate(expectedRoute);
    }
  };

  if (!isActive || !currentStep) return null;

  const totalSteps = steps.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  // Calculate tooltip position
  const hasTarget = currentStep.targetSelector && targetFound && (position.width > 0 || position.height > 0);

  // Position tooltip below or above target based on available space
  const viewportHeight = window.innerHeight;
  const tooltipHeight = 320;
  const targetBottom = position.top + position.height;
  const spaceBelow = viewportHeight - (targetBottom - window.scrollY);
  const positionAbove = spaceBelow < tooltipHeight && position.top > tooltipHeight;

  const tooltipTop = hasTarget
    ? positionAbove
      ? position.top - tooltipHeight - 20
      : position.top + position.height + 20
    : window.innerHeight / 2 - 150;

  const tooltipLeft = hasTarget
    ? Math.min(Math.max(16, position.left + position.width / 2 - 200), window.innerWidth - 416)
    : Math.max(16, window.innerWidth / 2 - 200);

  return (
    <>
      {/* Overlay and highlighting - Style varies by A/B test variant */}
      <AnimatePresence>
        {hasTarget && (
          <>
            {/* Dark overlay with spotlight cutout */}
            <motion.div
              className="fixed inset-0 z-[9990] pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                background: config.highlightStyle === 'spotlight'
                  ? `radial-gradient(ellipse 250px 180px at ${position.left + position.width / 2}px ${position.top + position.height / 2 - window.scrollY}px, transparent 0%, rgba(0, 0, 0, 0.85) 100%)`
                  : `radial-gradient(ellipse 300px 200px at ${position.left + position.width / 2}px ${position.top + position.height / 2 - window.scrollY}px, transparent 0%, rgba(0, 0, 0, 0.75) 100%)`,
              }}
            />

            {/* Highlight ring - Different styles based on variant */}
            <motion.div
              className="fixed z-[9991] rounded-lg pointer-events-none"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                boxShadow: config.highlightStyle === 'glow'
                  ? [
                      "0 0 0 2px rgba(16, 185, 129, 0.6), 0 0 30px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.2)",
                      "0 0 0 4px rgba(16, 185, 129, 0.4), 0 0 50px rgba(16, 185, 129, 0.6), 0 0 80px rgba(16, 185, 129, 0.3)",
                      "0 0 0 2px rgba(16, 185, 129, 0.6), 0 0 30px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.2)",
                    ]
                  : config.highlightStyle === 'spotlight'
                  ? [
                      "0 0 0 3px rgba(251, 191, 36, 0.7), 0 0 25px rgba(251, 191, 36, 0.5)",
                      "0 0 0 5px rgba(251, 191, 36, 0.5), 0 0 35px rgba(251, 191, 36, 0.7)",
                      "0 0 0 3px rgba(251, 191, 36, 0.7), 0 0 25px rgba(251, 191, 36, 0.5)",
                    ]
                  : [
                      "0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)",
                      "0 0 0 8px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.5)",
                      "0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)",
                    ]
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                boxShadow: { duration: config.highlightStyle === 'glow' ? 1.5 : 2, repeat: Infinity, ease: "easeInOut" }
              }}
              style={{
                top: position.top - 6 - window.scrollY,
                left: position.left - 6,
                width: position.width + 12,
                height: position.height + 12,
                border: config.highlightStyle === 'glow'
                  ? "3px solid rgb(16, 185, 129)"
                  : config.highlightStyle === 'spotlight'
                  ? "3px solid rgb(251, 191, 36)"
                  : "3px solid rgb(59, 130, 246)",
                position: "fixed",
              }}
            />

            {/* Click hint indicator */}
            <AnimatePresence>
              {clickHintVisible && (
                <motion.div
                  className="fixed z-[9992] flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-full shadow-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{
                    top: position.top - 35 - window.scrollY,
                    left: position.left + position.width / 2 - 50,
                  }}
                >
                  <MousePointerClick className="w-3.5 h-3.5" />
                  Click to continue
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pointer arrow */}
            <motion.div
              className="fixed z-[9991] pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                y: [0, -8, 0],
              }}
              transition={{
                y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
              }}
              style={{
                top: positionAbove ? position.top - window.scrollY + position.height + 8 : position.top - 20 - window.scrollY,
                left: position.left + position.width / 2 - 10,
              }}
            >
              <div
                className={`w-0 h-0 border-l-[10px] border-r-[10px] border-l-transparent border-r-transparent ${
                  positionAbove
                    ? "border-t-[12px] border-t-blue-500"
                    : "border-b-[12px] border-b-blue-500"
                }`}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          className="fixed z-[9995] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          style={{
            top: tooltipTop - window.scrollY,
            left: tooltipLeft,
            width: "400px",
            maxWidth: "calc(100vw - 32px)",
          }}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Progress header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/90 text-sm font-medium">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
              <button
                onClick={skipOnboarding}
                className="text-white/70 hover:text-white transition p-1 rounded-full hover:bg-white/20"
                data-testid="button-skip-onboarding"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full bg-white/30 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {currentStep.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {currentStep.description}
            </p>

            {/* Navigation prompt if on wrong page */}
            {!isOnCorrectPage && STEP_ROUTES[currentStep.id] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
              >
                <div className="flex items-start gap-2">
                  <Navigation className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                      Navigate to see this feature
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleNavigateToStep}
                      className="mt-2 text-amber-700 border-amber-300 hover:bg-amber-100"
                    >
                      Go to page
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Actions list */}
            {currentStep.actions && currentStep.actions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide mb-2">
                  Try it out:
                </p>
                <ul className="space-y-1.5">
                  {currentStep.actions.map((action, idx) => (
                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-1.5"
              data-testid="button-onboarding-prev"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={skipOnboarding}
              className="text-gray-500"
              data-testid="button-onboarding-skip"
            >
              Skip Tour
            </Button>

            <Button
              size="sm"
              onClick={currentStepIndex === totalSteps - 1 ? completeOnboarding : nextStep}
              className="flex items-center gap-1.5 flex-1 bg-blue-600 hover:bg-blue-700"
              data-testid="button-onboarding-next"
            >
              {currentStepIndex === totalSteps - 1 ? "Get Started!" : "Next"}
              {currentStepIndex < totalSteps - 1 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>

          {/* Interactive hint */}
          {hasTarget && (
            <div className="px-5 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>Click the highlighted element to advance, or use the buttons above</span>
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Backdrop click handler to allow closing */}
      <div
        className="fixed inset-0 z-[9989]"
        onClick={(e) => {
          // Only close if clicking the backdrop, not the tooltip
          if (e.target === e.currentTarget) {
            // Don't close on backdrop click - user must use buttons
          }
        }}
      />
    </>
  );
}
