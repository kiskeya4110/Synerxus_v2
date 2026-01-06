import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";

// Experiment configuration
export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number; // Percentage weight (0-100)
  config: Record<string, any>;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

// Metrics tracking
export interface ExperimentMetrics {
  experimentId: string;
  variantId: string;
  userId: string;
  assignedAt: string;
  events: ExperimentEvent[];
}

export interface ExperimentEvent {
  eventType: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ABTestingContextType {
  getVariant: (experimentId: string) => ExperimentVariant | null;
  trackEvent: (experimentId: string, eventType: string, metadata?: Record<string, any>) => void;
  getMetrics: (experimentId: string) => ExperimentMetrics | null;
  isInVariant: (experimentId: string, variantId: string) => boolean;
  experiments: Record<string, Experiment>;
}

const ABTestingContext = createContext<ABTestingContextType | undefined>(undefined);

// Define experiments
const EXPERIMENTS: Record<string, Experiment> = {
  'onboarding-flow': {
    id: 'onboarding-flow',
    name: 'Onboarding Tutorial Flow',
    description: 'Test different onboarding tutorial experiences',
    isActive: true,
    variants: [
      {
        id: 'control',
        name: 'Control - Standard Flow',
        weight: 33,
        config: {
          stepCount: 'full',        // All steps
          autoAdvance: false,       // Manual navigation
          showSkipButton: true,     // Can skip tutorial
          highlightStyle: 'pulse',  // Pulsing highlight
          tooltipPosition: 'auto',  // Auto-position tooltip
          showProgress: true,       // Show progress bar
          delayBetweenSteps: 0,     // No delay
        }
      },
      {
        id: 'streamlined',
        name: 'Variant A - Streamlined',
        weight: 33,
        config: {
          stepCount: 'minimal',     // Only essential steps (4-5)
          autoAdvance: false,       // Manual navigation
          showSkipButton: true,     // Can skip tutorial
          highlightStyle: 'glow',   // Glowing highlight
          tooltipPosition: 'auto',  // Auto-position tooltip
          showProgress: true,       // Show progress bar
          delayBetweenSteps: 0,     // No delay
        }
      },
      {
        id: 'guided',
        name: 'Variant B - Guided Tour',
        weight: 34,
        config: {
          stepCount: 'full',        // All steps
          autoAdvance: true,        // Auto-advance after interaction
          showSkipButton: false,    // No skip (encourage completion)
          highlightStyle: 'spotlight', // Spotlight effect
          tooltipPosition: 'fixed', // Fixed position tooltip
          showProgress: true,       // Show progress bar
          delayBetweenSteps: 500,   // 500ms delay between steps
        }
      }
    ]
  }
};

// Get or generate user ID for experiment assignment
function getExperimentUserId(): string {
  let userId = localStorage.getItem('ab_experiment_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('ab_experiment_user_id', userId);
  }
  return userId;
}

// Deterministic variant assignment based on user ID
function assignVariant(experiment: Experiment, userId: string): ExperimentVariant {
  // Create a hash from experiment ID + user ID for consistent assignment
  const hashString = `${experiment.id}:${userId}`;
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert hash to a number between 0-100
  const bucket = Math.abs(hash) % 100;

  // Assign variant based on weight
  let cumulativeWeight = 0;
  for (const variant of experiment.variants) {
    cumulativeWeight += variant.weight;
    if (bucket < cumulativeWeight) {
      return variant;
    }
  }

  // Fallback to first variant
  return experiment.variants[0];
}

export function ABTestingProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState<Record<string, ExperimentMetrics>>({});
  const userId = useMemo(() => getExperimentUserId(), []);

  // Load saved assignments and metrics on mount
  useEffect(() => {
    const savedAssignments = localStorage.getItem('ab_experiment_assignments');
    const savedMetrics = localStorage.getItem('ab_experiment_metrics');

    if (savedAssignments) {
      try {
        setAssignments(JSON.parse(savedAssignments));
      } catch (e) {
        console.error('Failed to parse saved assignments:', e);
      }
    }

    if (savedMetrics) {
      try {
        setMetrics(JSON.parse(savedMetrics));
      } catch (e) {
        console.error('Failed to parse saved metrics:', e);
      }
    }
  }, []);

  // Save assignments when they change
  useEffect(() => {
    if (Object.keys(assignments).length > 0) {
      localStorage.setItem('ab_experiment_assignments', JSON.stringify(assignments));
    }
  }, [assignments]);

  // Save metrics when they change
  useEffect(() => {
    if (Object.keys(metrics).length > 0) {
      localStorage.setItem('ab_experiment_metrics', JSON.stringify(metrics));
    }
  }, [metrics]);

  // Get variant for an experiment (assigns if not already assigned)
  const getVariant = useCallback((experimentId: string): ExperimentVariant | null => {
    const experiment = EXPERIMENTS[experimentId];
    if (!experiment || !experiment.isActive) return null;

    // Check if already assigned
    if (assignments[experimentId]) {
      const variant = experiment.variants.find(v => v.id === assignments[experimentId]);
      if (variant) return variant;
    }

    return null; // Return null if not assigned to avoid side effects in render
  }, [assignments]);

  // Effect to handle initial assignments
  useEffect(() => {
    Object.values(EXPERIMENTS).forEach(experiment => {
      if (experiment.isActive && !assignments[experiment.id]) {
        const variant = assignVariant(experiment, userId);
        setAssignments(prev => ({ ...prev, [experiment.id]: variant.id }));
        
        // Initialize metrics
        setMetrics(prev => ({
          ...prev,
          [experiment.id]: {
            experimentId: experiment.id,
            variantId: variant.id,
            userId,
            assignedAt: new Date().toISOString(),
            events: [{ eventType: 'assigned', timestamp: new Date().toISOString() }]
          }
        }));
      }
    });
  }, [userId]);

  // Track an event for an experiment
  const trackEvent = useCallback((
    experimentId: string,
    eventType: string,
    metadata?: Record<string, any>
  ) => {
    setMetrics(prev => {
      const existing = prev[experimentId];
      if (!existing) return prev;

      return {
        ...prev,
        [experimentId]: {
          ...existing,
          events: [
            ...existing.events,
            {
              eventType,
              timestamp: new Date().toISOString(),
              metadata
            }
          ]
        }
      };
    });

    // Also log to console for debugging
    console.log(`[A/B Test] ${experimentId} - ${eventType}`, metadata || '');
  }, []);

  // Get metrics for an experiment
  const getMetrics = useCallback((experimentId: string): ExperimentMetrics | null => {
    return metrics[experimentId] || null;
  }, [metrics]);

  // Check if user is in a specific variant
  const isInVariant = useCallback((experimentId: string, variantId: string): boolean => {
    return assignments[experimentId] === variantId;
  }, [assignments]);

  const value = useMemo(() => ({
    getVariant,
    trackEvent,
    getMetrics,
    isInVariant,
    experiments: EXPERIMENTS
  }), [getVariant, trackEvent, getMetrics, isInVariant]);

  return (
    <ABTestingContext.Provider value={value}>
      {children}
    </ABTestingContext.Provider>
  );
}

export function useABTesting() {
  const context = useContext(ABTestingContext);
  if (context === undefined) {
    throw new Error("useABTesting must be used within an ABTestingProvider");
  }
  return context;
}

// Hook specifically for onboarding experiment
export function useOnboardingExperiment() {
  const { getVariant, trackEvent, getMetrics } = useABTesting();

  const variant = getVariant('onboarding-flow');
  const config = variant?.config || {
    stepCount: 'full',
    autoAdvance: false,
    showSkipButton: true,
    highlightStyle: 'pulse',
    tooltipPosition: 'auto',
    showProgress: true,
    delayBetweenSteps: 0,
  };

  const track = useCallback((eventType: string, metadata?: Record<string, any>) => {
    trackEvent('onboarding-flow', eventType, metadata);
  }, [trackEvent]);

  return {
    variant,
    config,
    track,
    metrics: getMetrics('onboarding-flow')
  };
}
