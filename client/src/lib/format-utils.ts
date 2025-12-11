/**
 * Formatting Utilities
 * Centralized functions for number, date, and text formatting
 */

/**
 * Format number with locale-specific thousands separators
 * @example formatNumber(1234567) => "1,234,567"
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return "0";
  return value.toLocaleString();
}

/**
 * Format number as currency
 * @example formatCurrency(1234.56) => "$1,234.56"
 */
export function formatCurrency(
  value: number | undefined | null,
  currency: string = "USD"
): string {
  if (value === undefined || value === null || isNaN(value)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

/**
 * Format number as percentage
 * @example formatPercentage(0.1234) => "12.3%"
 */
export function formatPercentage(
  value: number | undefined | null,
  decimals: number = 1
): string {
  if (value === undefined || value === null || isNaN(value)) return "0%";
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format number with suffix (K, M, B)
 * @example formatCompact(1234567) => "1.2M"
 */
export function formatCompact(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return "0";

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format hours with proper units
 * @example formatHours(125) => "125 hours"
 */
export function formatHours(hours: number | undefined | null): string {
  if (!hours || hours === 0) return "0 hours";
  if (hours === 1) return "1 hour";
  return `${formatNumber(hours)} hours`;
}

/**
 * Format date as relative time
 * @example formatRelativeTime(new Date()) => "just now"
 */
export function formatRelativeTime(date: Date | string | undefined | null): string {
  if (!date) return "Unknown";

  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  if (diffDay < 365) {
    const months = Math.floor(diffDay / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(diffDay / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

/**
 * Format date as short date string
 * @example formatShortDate(new Date()) => "Dec 6, 2025"
 */
export function formatShortDate(date: Date | string | undefined | null): string {
  if (!date) return "Unknown";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dateObj);
}

/**
 * Format date as long date string
 * @example formatLongDate(new Date()) => "December 6, 2025"
 */
export function formatLongDate(date: Date | string | undefined | null): string {
  if (!date) return "Unknown";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dateObj);
}

/**
 * Format date with time
 * @example formatDateTime(new Date()) => "Dec 6, 2025 at 3:45 PM"
 */
export function formatDateTime(date: Date | string | undefined | null): string {
  if (!date) return "Unknown";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(dateObj);
}

/**
 * Get initials from name
 * @example getInitials("John Doe") => "JD"
 */
export function getInitials(name: string | undefined | null): string {
  if (!name) return "??";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text with ellipsis
 * @example truncate("Long text here", 10) => "Long text..."
 */
export function truncate(text: string | undefined | null, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Pluralize word based on count
 * @example pluralize(1, "item") => "item"
 * @example pluralize(2, "item") => "items"
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

/**
 * Format file size
 * @example formatFileSize(1024) => "1 KB"
 */
export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes || bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, index);

  return `${size.toFixed(2)} ${units[index]}`;
}

/**
 * Calculate percentage of total
 * @example calculatePercentage(25, 100) => 25
 */
export function calculatePercentage(
  value: number,
  total: number,
  decimals: number = 0
): number {
  if (total === 0) return 0;
  return parseFloat(((value / total) * 100).toFixed(decimals));
}

/**
 * Format time duration in seconds to human readable format
 * @example formatDuration(3665) => "1h 1m 5s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

/**
 * Format AIU (Adjusted Impact Units) value with precision
 * @example formatAIU(1.23456) => "1.23"
 * @example formatAIU(0) => "0.00"
 */
export function formatAIU(
  value: number | undefined | null,
  decimals: number = 2
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return "0.00";
  }
  return value.toFixed(decimals);
}

/**
 * Format AIU for display (standard 2 decimal version)
 * @example formatAIUShort(1.2345678901) => "1.23"
 */
export function formatAIUShort(
  value: number | undefined | null,
  decimals: number = 2
): string {
  if (value === undefined || value === null || isNaN(value)) return "0.00";
  return value.toFixed(decimals);
}

/**
 * Format AIU with standard precision for all views
 * @example formatAIUFull(1.2345678901234) => "1.23"
 */
export function formatAIUFull(value: number | undefined | null): string {
  return formatAIU(value, 2);
}
