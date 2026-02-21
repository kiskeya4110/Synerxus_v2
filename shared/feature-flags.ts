/**
 * Feature Flags Utility
 *
 * Centralized feature flag management for controlling feature visibility.
 * Supports environment variable overrides for deployment flexibility.
 *
 * TODO (Post-Pilot): Enable AIU display once marketing materials are ready.
 */

import { FEATURE_FLAGS } from './constants';

/**
 * Check if AIU display is enabled
 *
 * Checks in order:
 * 1. Environment variable NEXT_PUBLIC_ENABLE_AIU_DISPLAY (for runtime override)
 * 2. Falls back to FEATURE_FLAGS.ENABLE_AIU_DISPLAY constant
 *
 * @returns boolean - true if AIU should be displayed to users
 */
export function isAIUDisplayEnabled(): boolean {
  // Check environment variable first (allows runtime override)
  // Works in both Node.js and browser (with NEXT_PUBLIC_ prefix)
  const envValue = typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_ENABLE_AIU_DISPLAY
    : undefined;

  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }

  // Fall back to compile-time constant
  return FEATURE_FLAGS.ENABLE_AIU_DISPLAY;
}

/**
 * Get feature flag value with environment override support
 *
 * @param flagName - The name of the feature flag
 * @returns boolean - The flag value
 */
export function getFeatureFlag(flagName: keyof typeof FEATURE_FLAGS): boolean {
  switch (flagName) {
    case 'ENABLE_AIU_DISPLAY':
      return isAIUDisplayEnabled();
    default:
      return FEATURE_FLAGS[flagName];
  }
}

/**
 * Labels for alternative metrics when AIU is hidden
 * These are used to maintain layout while hiding AIU terminology
 */
export const SHADOW_MODE_LABELS = {
  // Replace "AIU" with these generic terms
  AIU_REPLACEMENT: 'Impact Score',
  AIU_FULL_NAME_REPLACEMENT: 'Ground-Truth Outcomes',
  AIU_DESCRIPTION: 'A measure of your verified contribution to ground-truth outcomes confirmed by NGOs',

  // Alternative metric labels
  SOCIAL_VALUE_ESTIMATE: 'Social Value Estimate',
  IMPACT_SCORE: 'Impact Score',
  CONTRIBUTION_INDEX: 'Contribution Index',
} as const;
