// ============================================================================
// SYNERXUS MVP - BADGES/GAMIFICATION DISABLED
// ============================================================================
// Per MVP spec: No gamification / badges / points
// This hook is a no-op to maintain compatibility with existing code
// ============================================================================

/**
 * Hook disabled for MVP - badges/gamification not included.
 * Returns null and does nothing.
 */
export function useBadgeCelebration(_userId: number | null | undefined) {
  // No-op in MVP - gamification disabled
  return null;
}
