import type { Request, Response } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { projectAiuSettings } from "../../shared/schema";

/**
 * Authenticated user type from auth middleware
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
  userType: string;
  organizationId?: number | null;
  firebaseUid?: string | null;
}

/**
 * Get authenticated user from request with null safety.
 * Returns the user if authenticated, or sends 401 and returns null.
 * Use this instead of req.user! to prevent crashes.
 *
 * @example
 * const user = getAuthenticatedUser(req, res);
 * if (!user) return; // Response already sent
 * // user is now safely typed
 */
export function getAuthenticatedUser(req: Request, res: Response): AuthenticatedUser | null {
  if (!req.user) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Authentication required. Please provide a valid token.",
    });
    return null;
  }
  return req.user as AuthenticatedUser;
}

/**
 * Require authenticated user - throws if not authenticated.
 * Use this when you're certain auth middleware ran but want type safety.
 * Prefer getAuthenticatedUser() for route handlers.
 */
export function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new Error("Authentication required - middleware may not have run");
  }
  return req.user as AuthenticatedUser;
}

/**
 * Detects duplicate impacts within a time window (±6 hours)
 * Returns a dedup group ID if duplicates are found, null otherwise
 */
export async function detectDuplicateImpact(
  projectId: number,
  userId: number,
  metricId: number,
  outcomeType: string,
  loggedDate: Date,
  storage: any
): Promise<{ isDuplicate: boolean; dedupGroupId?: number; matchingImpacts?: any[] }> {
  try {
    // Use scoped query by projectId to avoid full-table scan
    const allProjectImpacts = await storage.listProjectImpactsByProject(projectId);
    const projectImpacts = allProjectImpacts.filter((i: any) => i.metricId === metricId);

    if (outcomeType === 'shared') {
      const timeWindowMs = 6 * 60 * 60 * 1000; // ±6 hours
      const loggedTime = loggedDate.getTime();

      const duplicates = projectImpacts.filter((impact: any) => {
        const impactTime = new Date(impact.date).getTime();
        const timeDiff = Math.abs(loggedTime - impactTime);
        return timeDiff <= timeWindowMs && impact.outcomeType === 'shared';
      });

      if (duplicates.length > 0) {
        return {
          isDuplicate: true,
          dedupGroupId: duplicates[0].dedupGroupId || duplicates[0].id,
          matchingImpacts: duplicates
        };
      }
    }

    return { isDuplicate: false };
  } catch (err) {
    console.error("Error detecting duplicate impacts:", err);
    return { isDuplicate: false };
  }
}

/**
 * Applies role-based attribution weighting
 * Lead Role: 100% attribution
 * Support Role: 50% attribution
 * Observer Role: 0% (logged for participation only)
 */
export function applyRoleBasedAttribution(value: number, role: string): number {
  switch (role) {
    case 'lead':
      return value;
    case 'support':
      return Math.round(value * 0.5);
    case 'observer':
      return 0;
    default:
      return value;
  }
}

/**
 * Calculate volunteer profile completion percentage
 */
export function calculateProfileCompletion(profile: Record<string, any>): number {
  let completedFields = 0;
  const totalFields = 7;

  if (profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) completedFields++;
  if (profile.location) completedFields++;
  if (profile.bio) completedFields++;
  if (profile.preferredSdgs && Array.isArray(profile.preferredSdgs) && profile.preferredSdgs.length > 0) completedFields++;
  if (profile.interests && Array.isArray(profile.interests) && profile.interests.length > 0) completedFields++;
  if (typeof profile.weeklyAvailability === 'number' && profile.weeklyAvailability > 0) completedFields++;
  if (profile.preferredWorkStyle) completedFields++;

  return Math.min(100, Math.round((completedFields / totalFields) * 100));
}

/**
 * Handle validation and authorization errors
 */
export function handleValidationError(err: unknown) {
  if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
    return {
      status: (err as any).status,
      message: (err as any).message
    };
  }

  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return {
      status: 400,
      message: validationError.message
    };
  }

  return {
    status: 500,
    message: err instanceof Error ? err.message : "Unknown error occurred"
  };
}

/**
 * Extract userId from request — only from verified JWT auth middleware.
 * @deprecated Use getAuthenticatedUser() instead for full user object.
 */
export function extractUserId(req: Request): number | null {
  // SECURITY: Only return the userId set by authMiddleware — never from user-controlled sources.
  // Legacy fallback reading from req.body/query/headers removed: it allowed user impersonation.
  return (req as any).user?.id ?? null;
}

/**
 * Milestone type for project completion tracking
 */
interface ProjectMilestone {
  id: string | number;
  name: string;
  targetDate?: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  weight?: number; // Optional custom weight (percentage)
}

/**
 * Calculate project completion percentage based on hours + milestones
 *
 * Formula: (hoursWeight% × hoursProgress) + (milestonesWeight% × milestoneProgress)
 * Default weights: 60% hours, 40% milestones (configurable per project)
 *
 * - Hours Progress: (hours logged / expected hours) × 100
 * - Milestone Progress: (completed milestones / total milestones) × 100
 *   OR weighted: Σ(completed milestone weights) / Σ(all milestone weights) × 100
 */
export async function calculateProjectProgress(projectId: number): Promise<number> {
  try {
    const project = await storage.getProject(projectId);
    if (!project) return 0;

    // If project is marked as completed, return 100%
    if (project.status === 'completed') {
      return 100;
    }

    // Get configurable weights (default: 60% hours, 40% milestones)
    const hoursWeight = (project as any).completionHoursWeight ?? 60;
    const milestonesWeight = (project as any).completionMilestonesWeight ?? 40;

    // ===== HOURS PROGRESS (default 60% weight) =====
    const activities = (await storage.listVolunteerActivities()).filter((a) => a.projectId === projectId);
    const totalHoursLogged = activities.reduce((sum: number, a) => sum + (a.hours || 0), 0);

    const expectedHours = project.projectTotalHours ||
                          (project.ongoingHoursPerWeek ? project.ongoingHoursPerWeek * 12 : 0);

    let hoursProgress = 0;
    if (expectedHours > 0) {
      hoursProgress = Math.min((totalHoursLogged / expectedHours) * 100, 100);
    } else if (totalHoursLogged > 0) {
      // No expected hours - use conservative estimate, cap at 50%
      hoursProgress = Math.min((totalHoursLogged / 200) * 100, 50);
    }

    // ===== MILESTONE PROGRESS (default 40% weight) =====
    const milestones = (project as any).milestones as ProjectMilestone[] | null | undefined;
    let milestoneProgress = 0;

    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      // Check if milestones have custom weights
      const hasCustomWeights = milestones.some(m => typeof m.weight === 'number' && m.weight > 0);

      if (hasCustomWeights) {
        // Weighted milestone calculation
        const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 0), 0);
        const completedWeight = milestones
          .filter(m => m.status === 'completed')
          .reduce((sum, m) => sum + (m.weight || 0), 0);

        milestoneProgress = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
      } else {
        // Equal weight milestone calculation
        const completedMilestones = milestones.filter(m => m.status === 'completed').length;
        milestoneProgress = (completedMilestones / milestones.length) * 100;
      }
    } else {
      // No milestones defined - hours get full weight
      // Redistribute milestone weight to hours
      const adjustedHoursWeight = hoursWeight + milestonesWeight;
      return Math.round(Math.min((hoursProgress * adjustedHoursWeight) / 100, 100));
    }

    // ===== COMBINED PROGRESS =====
    // Normalize weights to ensure they sum to 100
    const totalWeight = hoursWeight + milestonesWeight;
    const normalizedHoursWeight = (hoursWeight / totalWeight) * 100;
    const normalizedMilestonesWeight = (milestonesWeight / totalWeight) * 100;

    const combinedProgress =
      (normalizedHoursWeight / 100) * hoursProgress +
      (normalizedMilestonesWeight / 100) * milestoneProgress;

    return Math.round(Math.min(combinedProgress, 100));
  } catch (err) {
    console.error("Error calculating project progress:", err);
    return 0;
  }
}

/**
 * Require organization user authorization
 */
export async function requireOrgUser(req: Request) {
  const userId = extractUserId(req);
  if (!userId) {
    throw { status: 401, message: "Authentication required" };
  }

  const user = await storage.getUser(userId);
  if (!user) {
    throw { status: 401, message: "Authentication required" };
  }

  if (user.userType !== 'organization') {
    throw { status: 403, message: "Organization authorization required" };
  }

  if (!user.organizationId) {
    throw { status: 403, message: "Organization authorization required" };
  }

  return user;
}

/**
 * Verify resource ownership
 */
export function verifyOwnership(user: any, resource: any) {
  if (resource.organizationId !== user.organizationId) {
    throw { status: 403, message: "Resource not owned by your organization" };
  }
}

/**
 * Auto-update AIU kpiAfter value based on cumulative project impacts
 * Called when a new impact is logged
 */
export async function updateAiuKpiFromImpacts(projectId: number): Promise<void> {
  try {
    // Import dynamically to avoid circular dependencies
    const { db } = await import("../db");
    const { projectAiuSettings, projectImpacts } = await import("@shared/schema");
    const { eq, desc, and } = await import("drizzle-orm");

    // Check if project has AIU settings
    const [aiuSettings] = await db
      .select()
      .from(projectAiuSettings)
      .where(eq(projectAiuSettings.projectId, projectId))
      .orderBy(desc(projectAiuSettings.createdAt))
      .limit(1);

    if (!aiuSettings) {
      // No AIU settings configured for this project - skip
      return;
    }

    // Get non-duplicated impacts for this project using scoped query
    const allProjectImpacts = await storage.listProjectImpactsByProject(projectId);
    const projectImpactsList = allProjectImpacts.filter((i: any) => !i.isDuplicated);

    // Calculate total impact value from approved and pending records.
    // Approved records get full credit, pending records get 70%.
    let totalImpactValue = 0;
    for (const impact of projectImpactsList) {
      const value = impact.value || 0;
      const status = impact.verificationStatus || 'pending';

      if (status === 'verified' || status === 'approved') {
        totalImpactValue += value;
      } else if (status === 'pending' || status === 'self_reported') {
        totalImpactValue += value * 0.7; // 70% credit for pending
      }
      // Rejected impacts don't count
    }

    // Round to reasonable precision
    totalImpactValue = Math.round(totalImpactValue * 100) / 100;

    // Update kpiAfter if the new value is higher (progressive tracking)
    const newKpiAfter = aiuSettings.kpiBefore + totalImpactValue;

    // Only update if new value is higher (progress should not go backwards)
    if (!aiuSettings.kpiAfter || newKpiAfter > aiuSettings.kpiAfter) {
      await db
        .update(projectAiuSettings)
        .set({
          kpiAfter: newKpiAfter,
          kpiMeasurementDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(projectAiuSettings.id, aiuSettings.id));

      console.log(`[AIU Auto-Update] Project ${projectId}: kpiAfter updated to ${newKpiAfter}`);
    }
  } catch (err) {
    console.error("Error auto-updating AIU kpiAfter:", err);
    // Don't throw - this is a background operation that shouldn't fail the main request
  }
}
