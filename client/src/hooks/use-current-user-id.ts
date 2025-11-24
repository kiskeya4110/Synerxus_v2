/**
 * Centralized hook for accessing current user ID
 * Replaces scattered localStorage calls throughout the app
 */
export function useCurrentUserId(): string | null {
  return localStorage.getItem('currentUserId');
}
