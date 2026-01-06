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
 * Format decimal number with smart precision:
 * - Numbers >= 1000: Use compact notation with 3 significant digits (1.23K, 12.3K, 123K)
 * - Numbers < 1 (non-zero): Always show 2 decimal places (0.05, 0.50)
 * - Numbers < 1000: Use 2 decimal places (3.14, 99.99)
 * - Whole numbers: No decimal places (100, 50)
 * @example formatDecimal(1234.5678) => "1.23K"
 * @example formatDecimal(99.9876) => "99.99"
 * @example formatDecimal(0.05) => "0.05"
 * @example formatDecimal(100) => "100"
 */
export function formatDecimal(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return "0.00";

  const absValue = Math.abs(value);

  // For large numbers (1000+), use compact notation with 3 significant digits
  if (absValue >= 1_000_000_000) {
    const compact = value / 1_000_000_000;
    return formatWithSignificantDigits(compact, 3) + "B";
  }
  if (absValue >= 1_000_000) {
    const compact = value / 1_000_000;
    return formatWithSignificantDigits(compact, 3) + "M";
  }
  if (absValue >= 1_000) {
    const compact = value / 1_000;
    return formatWithSignificantDigits(compact, 3) + "K";
  }

  // For values less than 1 (but greater than 0), always show 2 decimal places
  // This ensures small values like 0.05 don't appear as 0
  if (absValue > 0 && absValue < 1) {
    return value.toFixed(2);
  }

  // For numbers < 1000, use 2 decimal places
  // If it's a whole number, don't show decimals
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(2);
}

/**
 * Format number with specified significant digits
 * @example formatWithSignificantDigits(1.2345, 3) => "1.23"
 * @example formatWithSignificantDigits(12.345, 3) => "12.3"
 * @example formatWithSignificantDigits(123.45, 3) => "123"
 */
function formatWithSignificantDigits(value: number, significantDigits: number): string {
  if (value === 0) return "0";

  const absValue = Math.abs(value);
  const magnitude = Math.floor(Math.log10(absValue));
  const decimals = Math.max(0, significantDigits - magnitude - 1);

  return value.toFixed(decimals);
}

/**
 * Format metric value for dashboard display
 * Smart formatting: 2 decimals for small numbers, 3 significant digits for large (K/M/B)
 * @example formatMetric(1234.567) => "1.23K"
 * @example formatMetric(99.876) => "99.88"
 * @example formatMetric(5) => "5"
 */
export function formatMetric(value: number | undefined | null): string {
  return formatDecimal(value);
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
 * Format number with suffix (K, M, B) using 3 significant digits
 * @example formatCompact(1234567) => "1.23M"
 * @example formatCompact(12345) => "12.3K"
 * @example formatCompact(123456) => "123K"
 * @example formatCompact(0.05) => "0.05"
 */
export function formatCompact(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return "0.00";

  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000) {
    return formatWithSignificantDigits(value / 1_000_000_000, 3) + "B";
  }
  if (absValue >= 1_000_000) {
    return formatWithSignificantDigits(value / 1_000_000, 3) + "M";
  }
  if (absValue >= 1_000) {
    return formatWithSignificantDigits(value / 1_000, 3) + "K";
  }
  // For values less than 1 (but greater than 0), always show 2 decimal places
  if (absValue > 0 && absValue < 1) {
    return value.toFixed(2);
  }
  // For numbers < 1000, show 2 decimal places if not a whole number
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(2);
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
 * Format AIU (Attributable Impact Units) value with precision
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
