import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export interface UserValidationResult {
  isValid: boolean;
  userId?: number;
  discrepancies: DataDiscrepancy[];
}

export interface DataDiscrepancy {
  type: "name_mismatch" | "id_mismatch" | "data_conflict" | "missing_profile";
  field: string;
  expectedValue: string;
  actualValue: string;
  severity: "warning" | "error";
  message: string;
}

export async function logUserDataChange(
  userId: number,
  action: string,
  tableName: string,
  recordId: number | null,
  previousData: any,
  newData: any,
  discrepancyType?: string,
  discrepancyDetails?: string,
  req?: Request
): Promise<void> {
  try {
    await storage.createUserDataAuditLog({
      userId,
      action,
      tableName,
      recordId,
      previousData,
      newData,
      discrepancyType: discrepancyType || null,
      discrepancyDetails: discrepancyDetails || null,
      resolvedAt: null,
      resolvedBy: null,
      ipAddress: req?.ip || null,
      userAgent: req?.get("user-agent") || null
    });
    console.log(`[Audit] ${action} on ${tableName} for user ${userId}${discrepancyType ? ` (${discrepancyType})` : ""}`);
  } catch (err) {
    console.error("Failed to log user data change:", err);
  }
}

export function normalizeDisplayName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function validateUserDataConsistency(userId: number): Promise<UserValidationResult> {
  const discrepancies: DataDiscrepancy[] = [];

  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return {
        isValid: false,
        discrepancies: [{
          type: "id_mismatch",
          field: "userId",
          expectedValue: String(userId),
          actualValue: "not found",
          severity: "error",
          message: `User with ID ${userId} not found in database`
        }]
      };
    }

    const volunteerProfile = await storage.getVolunteerProfileByUserId(userId);
    
    if (user.userType === "volunteer" && volunteerProfile) {
      const userName = normalizeDisplayName(user.displayName);
      const profileName = normalizeDisplayName(volunteerProfile.volunteerName);
      
      if (userName && profileName && userName !== profileName) {
        discrepancies.push({
          type: "name_mismatch",
          field: "displayName",
          expectedValue: user.displayName || "",
          actualValue: volunteerProfile.volunteerName || "",
          severity: "warning",
          message: `User display name "${user.displayName}" does not match profile name "${volunteerProfile.volunteerName}"`
        });
        
        await logUserDataChange(
          userId,
          "name_mismatch",
          "volunteer_profiles",
          volunteerProfile.id,
          { displayName: user.displayName },
          { volunteerName: volunteerProfile.volunteerName },
          "name_mismatch",
          `Name mismatch detected: "${user.displayName}" vs "${volunteerProfile.volunteerName}"`
        );
      }
    }

    if (user.userType === "volunteer" && !volunteerProfile) {
      discrepancies.push({
        type: "missing_profile",
        field: "volunteerProfile",
        expectedValue: "exists",
        actualValue: "missing",
        severity: "warning",
        message: "Volunteer user is missing their volunteer profile"
      });
    }

    if (user.userType === "organization" && user.organizationId) {
      const orgProfile = await storage.getOrganizationProfileByOrgId(user.organizationId);
      if (!orgProfile) {
        discrepancies.push({
          type: "missing_profile",
          field: "organizationProfile",
          expectedValue: "exists",
          actualValue: "missing",
          severity: "warning",
          message: "Organization user is missing their organization profile"
        });
      }
    }

    return {
      isValid: discrepancies.filter(d => d.severity === "error").length === 0,
      userId,
      discrepancies
    };
  } catch (err) {
    console.error("Error validating user data consistency:", err);
    return {
      isValid: false,
      discrepancies: [{
        type: "data_conflict",
        field: "validation",
        expectedValue: "success",
        actualValue: "error",
        severity: "error",
        message: `Validation error: ${err instanceof Error ? err.message : "Unknown error"}`
      }]
    };
  }
}

export function extractUserId(req: Request): number | null {
  const userIdParam = req.query.userId as string;
  if (userIdParam) {
    const parsed = parseInt(userIdParam);
    return isNaN(parsed) ? null : parsed;
  }
  
  const bodyUserId = req.body?.userId;
  if (bodyUserId) {
    const parsed = typeof bodyUserId === "number" ? bodyUserId : parseInt(bodyUserId);
    return isNaN(parsed) ? null : parsed;
  }
  
  const currentUserId = req.headers["x-current-user-id"] as string;
  if (currentUserId) {
    const parsed = parseInt(currentUserId);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

export function requireUserId(req: Request, res: Response): number | null {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(400).json({ 
      message: "userId parameter is required",
      error: "MISSING_USER_ID"
    });
    return null;
  }
  return userId;
}

export function validateUserIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = extractUserId(req);
  
  if (!userId && requiresUserValidation(req.path)) {
    return res.status(400).json({
      message: "userId parameter is required for this endpoint",
      error: "MISSING_USER_ID"
    });
  }
  
  (req as any).validatedUserId = userId;
  next();
}

function requiresUserValidation(path: string): boolean {
  const userRequiredPaths = [
    "/api/intake/volunteer-profile",
    "/api/intake/volunteer",
    "/api/intake/organization-profile",
    "/api/profile/volunteer",
    "/api/profile/organization",
    "/api/dashboard/summary",
    "/api/notifications"
  ];
  
  return userRequiredPaths.some(p => path.startsWith(p));
}

export async function syncUserDisplayName(userId: number, newDisplayName: string): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return false;
    
    const previousDisplayName = user.displayName;
    
    await storage.updateUser(userId, { displayName: newDisplayName });
    
    if (user.userType === "volunteer") {
      const profile = await storage.getVolunteerProfileByUserId(userId);
      if (profile) {
        await storage.updateVolunteerProfile(profile.id, { volunteerName: newDisplayName });
        
        await logUserDataChange(
          userId,
          "data_sync",
          "volunteer_profiles",
          profile.id,
          { volunteerName: profile.volunteerName },
          { volunteerName: newDisplayName },
          undefined,
          `Synced volunteer profile name to match user display name`
        );
      }
    }
    
    await logUserDataChange(
      userId,
      "update",
      "users",
      userId,
      { displayName: previousDisplayName },
      { displayName: newDisplayName },
      undefined,
      "Display name updated"
    );
    
    return true;
  } catch (err) {
    console.error("Error syncing user display name:", err);
    return false;
  }
}

export function validateNameFormat(name: string): { isValid: boolean; message?: string } {
  if (!name || typeof name !== "string") {
    return { isValid: false, message: "Name is required" };
  }
  
  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return { isValid: false, message: "Name must be at least 2 characters" };
  }
  
  if (trimmedName.length > 100) {
    return { isValid: false, message: "Name must be less than 100 characters" };
  }
  
  const nameRegex = /^[a-zA-Z\s\-'.]+$/;
  if (!nameRegex.test(trimmedName)) {
    return { isValid: false, message: "Name contains invalid characters" };
  }
  
  return { isValid: true };
}

export function validateEmail(email: string): { isValid: boolean; message?: string } {
  if (!email || typeof email !== "string") {
    return { isValid: false, message: "Email is required" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: "Invalid email format" };
  }
  
  return { isValid: true };
}
