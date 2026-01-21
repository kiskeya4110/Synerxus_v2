/**
 * Feature Flags React Hook
 *
 * Provides React components with access to feature flags.
 *
 * NOTE: AIU (Attributable Impact Units) terminology is hidden until post-pilot phase.
 * All user-facing displays use "Impact Score" terminology instead.
 * The underlying calculation system remains unchanged - only the display labels are affected.
 */

import { useMemo } from 'react';

/**
 * Standard labels for Impact Score display
 * These are the primary labels used throughout the platform
 */
export const IMPACT_SCORE_LABELS = {
  // Primary labels
  PRIMARY: 'Impact Score',
  FULL_NAME: 'Verified Social Impact',
  DESCRIPTION: 'A measure of your verified contribution to social and environmental outcomes',

  // Display variants
  EARNED: 'Impact Score Earned',
  TOTAL: 'Total Impact Score',
  PER_PROJECT: 'Score/Project',
  PER_VOLUNTEER: 'Score/Volunteer',
  PER_HOUR: 'Score/Hour',

  // Explanatory text
  TOOLTIP: 'Your Impact Score measures verified contributions to social and environmental outcomes based on hours, SDG alignment, and verified results.',

  // Action labels
  VIEW_DETAILS: 'View Impact Details',
  VIEW_BREAKDOWN: 'View Impact Breakdown',
} as const;

/**
 * @deprecated Use IMPACT_SCORE_LABELS instead
 * Kept for backward compatibility during transition
 */
export const SHADOW_MODE_LABELS = {
  AIU_REPLACEMENT: IMPACT_SCORE_LABELS.PRIMARY,
  AIU_FULL_NAME_REPLACEMENT: IMPACT_SCORE_LABELS.FULL_NAME,
  AIU_DESCRIPTION: IMPACT_SCORE_LABELS.DESCRIPTION,
  SOCIAL_VALUE_ESTIMATE: 'Social Value Estimate',
  IMPACT_SCORE: IMPACT_SCORE_LABELS.PRIMARY,
  CONTRIBUTION_INDEX: 'Contribution Index',
} as const;

/**
 * Hook to access feature flags in React components
 * NOTE: AIU display is always disabled until post-pilot
 */
export function useFeatureFlags() {
  return useMemo(() => ({
    // AIU display is permanently disabled until post-pilot
    isAIUDisplayEnabled: false,
  }), []);
}

/**
 * Hook specifically for AIU display feature flag
 * NOTE: Always returns false - AIU terminology is hidden until post-pilot
 * @returns false - Impact Score terminology is always used
 */
export function useAIUDisplay(): boolean {
  // Always return false - we use Impact Score terminology until post-pilot
  return false;
}

/**
 * Hook to get Impact Score labels
 * Use this hook in components that need to display impact metrics
 */
export function useImpactScoreLabels() {
  return useMemo(() => IMPACT_SCORE_LABELS, []);
}
