import type { Request } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { storage } from "../storage";

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
    const allImpacts = await storage.listProjectImpacts();
    const projectImpacts = allImpacts.filter((i: any) => i.projectId === projectId && i.metricId === metricId);

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
 * Extract userId from request
 */
export function extractUserId(req: Request): number | null {
  const userIdStr = (req.body as Record<string, any>).userId || (req.query.userId as string) || (req.headers['x-user-id'] as string);
  if (!userIdStr) return null;
  const userId = parseInt(userIdStr);
  return isNaN(userId) ? null : userId;
}

/**
 * Calculate project completion percentage based on multiple factors
 */
export async function calculateProjectProgress(projectId: number): Promise<number> {
  try {
    const project = await storage.getProject(projectId);
    if (!project) return 0;

    const tasks = (await storage.listTasks()).filter((t) => t.projectId === projectId);
    const activities = (await storage.listVolunteerActivities()).filter((a) => a.projectId === projectId);
    const impacts = await storage.listProjectImpactsByProject(projectId);

    let progressScore = 0;

    // 40% Weight: Task Completion Ratio
    if (tasks.length > 0) {
      const completedTasks = tasks.filter((t) => t.status?.toLowerCase() === "completed").length;
      const taskProgress = (completedTasks / tasks.length) * 100;
      progressScore += taskProgress * 0.4;
    }

    // 35% Weight: Hours Logged vs Expected Hours
    const totalHoursLogged = activities.reduce((sum: number, a) => sum + (a.hours || 0), 0);
    if (project.projectTotalHours || (project.ongoingHoursPerWeek && project.ongoingHoursPerWeek > 0)) {
      const expectedHours = project.projectTotalHours || (project.ongoingHoursPerWeek! * 4);
      const hoursProgress = Math.min((totalHoursLogged / expectedHours) * 100, 100);
      progressScore += hoursProgress * 0.35;
    } else {
      progressScore += Math.min(totalHoursLogged * 5, 100) * 0.35;
    }

    // 25% Weight: Impact Metrics Logged
    const impactProgress = impacts.length > 0 ? 100 : Math.min(totalHoursLogged * 2, 50);
    progressScore += impactProgress * 0.25;

    return Math.round(Math.min(progressScore, 100));
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
