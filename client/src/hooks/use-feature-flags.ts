/**
 * Feature Flags React Hook
 *
 * Provides React components with access to feature flags.
 * Handles client-side detection of feature flag state.
 *
 * TODO (Post-Pilot): Enable AIU display once marketing materials are ready.
 */

import { useMemo } from 'react';
import { FEATURE_FLAGS } from '@shared/constants';

/**
 * Check if AIU display is enabled (client-side)
 *
 * @returns boolean - true if AIU should be displayed to users
 */
function isAIUDisplayEnabled(): boolean {
  // Check environment variable (NEXT_PUBLIC_ prefix makes it available in browser)
  const envValue = typeof window !== 'undefined'
    ? (import.meta as any).env?.VITE_ENABLE_AIU_DISPLAY
      || (import.meta as any).env?.NEXT_PUBLIC_ENABLE_AIU_DISPLAY
      || (window as any).__ENV__?.NEXT_PUBLIC_ENABLE_AIU_DISPLAY
    : undefined;

  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1' || envValue === true;
  }

  // Fall back to compile-time constant
  return FEATURE_FLAGS.ENABLE_AIU_DISPLAY;
}

/**
 * Hook to access feature flags in React components
 *
 * @returns Object containing feature flag values
 */
export function useFeatureFlags() {
  return useMemo(() => ({
    isAIUDisplayEnabled: isAIUDisplayEnabled(),
    // Add more feature flags as needed
  }), []);
}

/**
 * Hook specifically for AIU display feature flag
 *
 * @returns boolean - true if AIU should be displayed
 */
export function useAIUDisplay(): boolean {
  return useMemo(() => isAIUDisplayEnabled(), []);
}

/**
 * Labels for alternative metrics when AIU is hidden
 * These are used to maintain layout while hiding AIU terminology
 */
export const SHADOW_MODE_LABELS = {
  // Replace "AIU" with these generic terms
  AIU_REPLACEMENT: 'Impact Score',
  AIU_FULL_NAME_REPLACEMENT: 'Verified Social Impact',
  AIU_DESCRIPTION: 'A measure of your verified contribution to social and environmental outcomes',

  // Alternative metric labels
  SOCIAL_VALUE_ESTIMATE: 'Social Value Estimate',
  IMPACT_SCORE: 'Impact Score',
  CONTRIBUTION_INDEX: 'Contribution Index',
} as const;
