import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  actions?: string[];
  userType?: 'volunteer' | 'organization';
}

interface OnboardingContextType {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: OnboardingStep | null;
  isCompleted: boolean;
  startOnboarding: () => void;
  skipOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  steps: OnboardingStep[];
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children, steps }: { children: ReactNode; steps: OnboardingStep[] }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Load onboarding state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('onboarding_completed');
    const savedActive = localStorage.getItem('onboarding_active');
    if (savedState === 'true') {
      setIsCompleted(true);
    }
    if (savedActive === 'true') {
      setIsActive(true);
    }
  }, []);

  const startOnboarding = () => {
    setIsActive(true);
    setCurrentStepIndex(0);
    localStorage.setItem('onboarding_active', 'true');
  };

  const skipOnboarding = () => {
    setIsActive(false);
    setIsCompleted(true);
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_active', 'false');
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const completeOnboarding = () => {
    setIsActive(false);
    setIsCompleted(true);
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_active', 'false');
  };

  const resetOnboarding = () => {
    setIsActive(false);
    setIsCompleted(false);
    setCurrentStepIndex(0);
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('onboarding_active');
  };

  const currentStep = steps[currentStepIndex] || null;

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStepIndex,
        currentStep,
        isCompleted,
        startOnboarding,
        skipOnboarding,
        nextStep,
        prevStep,
        completeOnboarding,
        resetOnboarding,
        steps,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
