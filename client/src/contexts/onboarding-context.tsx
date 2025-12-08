import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  actions?: string[];
  userType?: 'volunteer' | 'organization' | 'corporate-partner';
}

interface OnboardingContextType {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: OnboardingStep | null;
  isCompleted: boolean;
  totalSteps: number;
  progress: number;
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
  const [hasCheckedFirstTime, setHasCheckedFirstTime] = useState(false);

  // Get user type for per-role onboarding tracking
  const getUserType = () => localStorage.getItem('userType') || 'volunteer';

  // Load onboarding state from localStorage (per user type)
  useEffect(() => {
    const userType = getUserType();
    const savedState = localStorage.getItem(`onboarding_completed_${userType}`);
    const savedActive = localStorage.getItem(`onboarding_active_${userType}`);
    
    if (savedState === 'true') {
      setIsCompleted(true);
    } else if (savedActive === 'true') {
      setIsActive(true);
    }
    
    setHasCheckedFirstTime(true);
  }, []);

  // Auto-start onboarding for first-time users after dashboard loads
  useEffect(() => {
    if (!hasCheckedFirstTime) return;
    
    const userType = getUserType();
    const savedState = localStorage.getItem(`onboarding_completed_${userType}`);
    const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${userType}`);
    const currentPath = window.location.pathname;
    const isDashboard = currentPath.includes('dashboard');
    
    // Only auto-start on dashboard pages for users who haven't completed or seen onboarding
    if (isDashboard && !savedState && !hasSeenOnboarding && !isActive && !isCompleted) {
      // Delay auto-start to let the dashboard render first
      const timer = setTimeout(() => {
        localStorage.setItem(`onboarding_seen_${userType}`, 'true');
        setIsActive(true);
        localStorage.setItem(`onboarding_active_${userType}`, 'true');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasCheckedFirstTime, isActive, isCompleted]);

  const startOnboarding = () => {
    const userType = getUserType();
    setIsActive(true);
    setCurrentStepIndex(0);
    localStorage.setItem(`onboarding_active_${userType}`, 'true');
  };

  const skipOnboarding = () => {
    const userType = getUserType();
    setIsActive(false);
    setIsCompleted(true);
    localStorage.setItem(`onboarding_completed_${userType}`, 'true');
    localStorage.setItem(`onboarding_active_${userType}`, 'false');
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
    const userType = getUserType();
    setIsActive(false);
    setIsCompleted(true);
    localStorage.setItem(`onboarding_completed_${userType}`, 'true');
    localStorage.setItem(`onboarding_active_${userType}`, 'false');
  };

  const resetOnboarding = () => {
    const userType = getUserType();
    setIsActive(false);
    setIsCompleted(false);
    setCurrentStepIndex(0);
    localStorage.removeItem(`onboarding_completed_${userType}`);
    localStorage.removeItem(`onboarding_active_${userType}`);
    localStorage.removeItem(`onboarding_seen_${userType}`);
  };

  const currentStep = steps[currentStepIndex] || null;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStepIndex,
        currentStep,
        isCompleted,
        totalSteps,
        progress,
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
