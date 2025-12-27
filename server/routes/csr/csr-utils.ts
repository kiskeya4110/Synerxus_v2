/**
 * CSR Router Utility Functions
 * Shared helper functions for CSR-related routes
 */

import { storage } from "../../storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

/**
 * Safe parseInt with NaN validation
 * Returns null if parsing fails or value is NaN
 */
export function safeParseInt(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Safe date parsing with validation
 * Returns null if date is invalid
 */
export function safeParseDate(value: any): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Safe array access - ensures array is valid before operations
 */
export function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Create standardized error response
 */
export function createErrorResponse(code: string, message: string, details?: any) {
  return {
    error: code,
    message,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get human-readable time ago string
 */
export function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

/**
 * Helper function to handle validation and authorization errors
 */
export function handleValidationError(err: unknown) {
  // Handle authorization errors (plain objects with status/message)
  if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
    return {
      status: (err as any).status,
      message: (err as any).message
    };
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return {
      status: 400,
      message: validationError.message
    };
  }

  // Handle unknown errors
  return {
    status: 500,
    message: err instanceof Error ? err.message : "Unknown error occurred"
  };
}

/**
 * Convert timePeriod string to date range for filtering
 * @param timePeriod - '30d', '90d', '1y', or 'all'
 * @returns { startDate: Date, endDate: Date, shouldFilter: boolean }
 */
export function getDateRangeFromTimePeriod(timePeriod: string | undefined): { startDate: Date; endDate: Date; shouldFilter: boolean } {
  const endDate = new Date();
  let startDate = new Date(0); // Beginning of time for 'all'
  let shouldFilter = false;

  if (timePeriod && timePeriod !== 'all') {
    shouldFilter = true;
    const now = new Date();

    switch (timePeriod) {
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        shouldFilter = false;
    }
  }

  return { startDate, endDate, shouldFilter };
}

/**
 * Helper function to get all employee user IDs linked to a CSR partner
 * Combines both direct links (volunteerProfiles.employerId) and explicit links (volunteerEmployerLinks)
 */
export async function getLinkedEmployeeUserIds(partnerId: number): Promise<Set<number>> {
  const volunteerProfiles = await storage.listVolunteerProfiles?.() || [];
  const employerLinks = await storage.listVolunteerEmployerLinks?.() || [];

  const employeeUserIds = new Set<number>();

  // Method 1: Direct link via volunteerProfiles.employerId
  volunteerProfiles.forEach((vp: any) => {
    if (vp.employerId === partnerId) {
      employeeUserIds.add(vp.userId);
    }
  });

  // Method 2: Explicit link via volunteerEmployerLinks table
  employerLinks.forEach((link: any) => {
    if (link.partnerId === partnerId && link.verificationStatus !== 'rejected') {
      // Get the userId from the volunteer profile
      const profile = volunteerProfiles.find((vp: any) => vp.id === link.volunteerId);
      if (profile?.userId) {
        employeeUserIds.add(profile.userId);
      }
    }
  });

  return employeeUserIds;
}
