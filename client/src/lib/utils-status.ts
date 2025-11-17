/**
 * Utility functions for consistent status display across the application
 */

/**
 * Capitalize first letter of a string
 * e.g., "active" -> "Active", "pending" -> "Pending"
 */
export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format status for display with consistent capitalization
 * Handles both database values (lowercase/uppercase) and ensures consistent output
 */
export function formatStatus(status: string): string {
  if (!status) return '';
  return capitalizeFirst(status);
}
