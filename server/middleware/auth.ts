import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import { logger } from "../logger";
import { verifyFirebaseIdToken } from "../lib/firebase-admin";
import { cache, CACHE_TTL, cacheKeys } from "../cache";
import { tokenBlacklist } from "./security";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        userType: string;
        organizationId?: number | null;
        firebaseUid?: string | null;
      };
      userId?: number;
    }
  }
}

// JWT secret - REQUIRED in all environments for security
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  // SECURITY: Always require JWT_SECRET to prevent using weak hardcoded fallback
  const errorMessage = "CRITICAL: JWT_SECRET or SESSION_SECRET environment variable is required";
  console.error(`[SECURITY] ${errorMessage}`);
  if (process.env.NODE_ENV === "production") {
    throw new Error(errorMessage);
  }
  // In development, log loud warning but generate a random secret for this session
  console.warn("[SECURITY] Generating random JWT secret for this session - tokens will be invalid after restart");
}
const JWT_SECRET_VALUE = JWT_SECRET || require('crypto').randomBytes(64).toString('hex');
/**
 * Verify JWT token
 */
export function verifyToken(token: string): jwt.JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_VALUE, { algorithms: ["HS256"] });
    return decoded as jwt.JwtPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware - verifies JWT token
 * Supports multiple authentication methods for backward compatibility:
 * 1. Bearer token in Authorization header (preferred)
 * 2. Firebase UID verification (for Firebase-authenticated users)
 * 3. Session-based userId (legacy, will be deprecated)
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let userId: number | null = null;
    let userFromToken = false;

    // Method 1: Check Authorization header for Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);

      // Check blacklist before accepting the token
      if (await tokenBlacklist.isBlacklisted(token)) {
        res.status(401).json({
          error: "TOKEN_REVOKED",
          message: "This token has been revoked. Please log in again.",
        });
        return;
      }

      // First try to verify as our own JWT token
      const jwtDecoded = verifyToken(token);
      if (jwtDecoded?.userId) {
        userId = jwtDecoded.userId;
        userFromToken = true;
        logger.debug(`[Auth] JWT verified, userId: ${userId}`);
      } else {
        // Try to verify as Firebase ID token (cryptographically signed)
        const firebaseDecoded = await verifyFirebaseIdToken(token);
        if (firebaseDecoded?.uid) {
          // Look up user by Firebase UID using efficient indexed query
          const user = await storage.getUserByFirebaseUid(firebaseDecoded.uid);
          if (user) {
            userId = user.id;
            userFromToken = true;
            logger.debug(`[Auth] Firebase token verified, userId: ${userId}`);
          } else {
            logger.warn(`[Auth] Firebase user not found for UID: ${firebaseDecoded.uid}`);
          }
        } else {
          logger.debug(`[Auth] Token verification failed (JWT and Firebase)`);
        }
      }
    }

    // Method 2: httpOnly cookie JWT (demo/non-Firebase users; XSS-safe fallback)
    // Only checked when no Authorization header was present or valid.
    if (!userId && req.cookies?.authToken) {
      const cookieToken = req.cookies.authToken;
      if (await tokenBlacklist.isBlacklisted(cookieToken)) {
        res.status(401).json({
          error: "TOKEN_REVOKED",
          message: "This token has been revoked. Please log in again.",
        });
        return;
      }
      const cookieDecoded = verifyToken(cookieToken);
      if (cookieDecoded?.userId) {
        userId = cookieDecoded.userId;
        userFromToken = true;
        logger.debug(`[Auth] Cookie JWT verified, userId: ${userId}`);
      }
    }

    // SECURITY: Development auth bypass REMOVED
    // The previous fallback that allowed userId from request body/query/headers
    // was a security vulnerability that could enable user impersonation if
    // NODE_ENV was misconfigured. This has been removed to prevent such attacks.

    if (!userId) {
      logger.debug(`[Auth] No valid authentication found`);
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required. Please provide a valid token.",
      });
      return;
    }

    // Fetch user from cache or database
    const userCacheKey = cacheKeys.userProfile(userId);
    let user = cache.get<{ id: number; email: string; userType: string; organizationId: number | null; firebaseUid: string | null }>(userCacheKey);
    if (!user) {
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        res.status(401).json({
          error: "UNAUTHORIZED",
          message: "User not found. Please log in again.",
        });
        return;
      }
      user = { id: dbUser.id, email: dbUser.email, userType: dbUser.userType || "volunteer", organizationId: dbUser.organizationId ?? null, firebaseUid: dbUser.firebaseUid ?? null };
      cache.set(userCacheKey, user, CACHE_TTL.USER_PROFILE);
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      userType: user.userType,
      organizationId: user.organizationId,
      firebaseUid: user.firebaseUid,
    };
    req.userId = user.id;

    next();
  } catch (error) {
    logger.error("[Auth] Authentication error:", error);
    res.status(500).json({
      error: "AUTH_ERROR",
      message: "Authentication failed. Please try again.",
    });
  }
}

/**
 * Optional authentication - allows unauthenticated access but attaches user if token present
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);

      // Check blacklist before accepting the token
      if (await tokenBlacklist.isBlacklisted(token)) {
        logger.debug(`[OptionalAuth] Token is blacklisted, skipping`);
        next();
        return;
      }

      // First try to verify as our own JWT token
      const jwtDecoded = verifyToken(token);
      if (jwtDecoded?.userId) {
        logger.debug(`[OptionalAuth] JWT verified, userId: ${jwtDecoded.userId}`);
        const optCacheKey = cacheKeys.userProfile(jwtDecoded.userId);
        let optUser = cache.get<{ id: number; email: string; userType: string; organizationId: number | null; firebaseUid: string | null }>(optCacheKey);
        if (!optUser) {
          const dbUser = await storage.getUser(jwtDecoded.userId);
          if (dbUser) {
            optUser = { id: dbUser.id, email: dbUser.email, userType: dbUser.userType || "volunteer", organizationId: dbUser.organizationId ?? null, firebaseUid: dbUser.firebaseUid ?? null };
            cache.set(optCacheKey, optUser, CACHE_TTL.USER_PROFILE);
          }
        }
        if (optUser) {
          req.user = { id: optUser.id, email: optUser.email, userType: optUser.userType, organizationId: optUser.organizationId, firebaseUid: optUser.firebaseUid };
          req.userId = optUser.id;
          logger.debug(`[OptionalAuth] User attached: ${optUser.id}`);
        }
      } else {
        // Try to verify as Firebase ID token (cryptographically signed)
        logger.debug(`[OptionalAuth] JWT failed, trying Firebase token verification`);
        const firebaseDecoded = await verifyFirebaseIdToken(token);
        if (firebaseDecoded?.uid) {
          logger.debug(`[OptionalAuth] Firebase token verified, uid: ${firebaseDecoded.uid}`);
          // Efficient indexed query instead of fetching all users
          const user = await storage.getUserByFirebaseUid(firebaseDecoded.uid);
          if (user) {
            req.user = {
              id: user.id,
              email: user.email,
              userType: user.userType || "volunteer",
              organizationId: user.organizationId,
              firebaseUid: user.firebaseUid,
            };
            req.userId = user.id;
            logger.debug(`[OptionalAuth] Firebase user attached: ${user.id}`);
          } else {
            logger.warn(`[OptionalAuth] Firebase user not found in DB for uid: ${firebaseDecoded.uid}`);
          }
        } else {
          logger.warn(`[OptionalAuth] Both JWT and Firebase token verification failed`);
        }
      }
    } else if (authHeader) {
    }

    // Cookie JWT fallback for optional auth (same as authMiddleware)
    if (!req.user && req.cookies?.authToken) {
      const cookieToken = req.cookies.authToken;
      if (await tokenBlacklist.isBlacklisted(cookieToken)) {
        logger.debug(`[OptionalAuth] Cookie token is blacklisted, skipping`);
        next();
        return;
      }
      const cookieDecoded = verifyToken(cookieToken);
      if (cookieDecoded?.userId) {
        const optCookieCacheKey = cacheKeys.userProfile(cookieDecoded.userId);
        let optCookieUser = cache.get<{ id: number; email: string; userType: string; organizationId: number | null; firebaseUid: string | null }>(optCookieCacheKey);
        if (!optCookieUser) {
          const dbUser = await storage.getUser(cookieDecoded.userId);
          if (dbUser) {
            optCookieUser = { id: dbUser.id, email: dbUser.email, userType: dbUser.userType || "volunteer", organizationId: dbUser.organizationId ?? null, firebaseUid: dbUser.firebaseUid ?? null };
            cache.set(optCookieCacheKey, optCookieUser, CACHE_TTL.USER_PROFILE);
          }
        }
        if (optCookieUser) {
          req.user = { id: optCookieUser.id, email: optCookieUser.email, userType: optCookieUser.userType, organizationId: optCookieUser.organizationId, firebaseUid: optCookieUser.firebaseUid };
          req.userId = optCookieUser.id;
        }
      }
    }

    // SECURITY: Legacy x-user-id and x-firebase-uid header authentication REMOVED
    // These were vulnerabilities allowing user impersonation

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    logger.error(`[OptionalAuth] Error during authentication:`, error);
    next();
  }
}

/**
 * Require specific user type
 */
export function requireUserType(...allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required.",
      });
      return;
    }

    if (!allowedTypes.includes(req.user.userType)) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: `Access denied. Required user type: ${allowedTypes.join(" or ")}`,
      });
      return;
    }

    next();
  };
}

/**
 * Require organization user with specific organization access
 */
export function requireOrganizationAccess(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Authentication required.",
    });
    return;
  }

  if (req.user.userType !== "organization") {
    res.status(403).json({
      error: "FORBIDDEN",
      message: "Organization access required.",
    });
    return;
  }

  if (!req.user.organizationId) {
    res.status(403).json({
      error: "FORBIDDEN",
      message: "No organization associated with this account.",
    });
    return;
  }

  next();
}

/**
 * Require CSR partner access
 */
export function requireCSRAccess(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Authentication required.",
    });
    return;
  }

  if (req.user.userType !== "corporate-partner") {
    res.status(403).json({
      error: "FORBIDDEN",
      message: "CSR partner access required.",
    });
    return;
  }

  next();
}

/**
 * Verify resource ownership - checks if user owns or has access to a resource
 */
export async function verifyResourceAccess(
  req: Request,
  resourceType: "activity" | "project" | "application" | "message",
  resourceId: number
): Promise<boolean> {
  if (!req.user) return false;

  const userId = req.user.id;
  const userType = req.user.userType;
  const organizationId = req.user.organizationId;

  switch (resourceType) {
    case "activity": {
      const activities = await storage.listVolunteerActivitiesByUser(userId);
      return activities.some((a) => a.id === resourceId);
    }

    case "project": {
      const project = await storage.getProject(resourceId);
      if (!project) return false;

      // Volunteer can access if assigned
      if (userType === "volunteer") {
        const assignments = await storage.listProjectAssignmentsByVolunteer(userId);
        return assignments.some((a) => a.projectId === resourceId);
      }

      // Organization can access their own projects
      if (userType === "organization" && organizationId) {
        return project.organizationId === organizationId;
      }

      return false;
    }

    case "application": {
      const applications = await storage.listApplicationsByVolunteer(userId);
      const app = applications.find((a) => a.id === resourceId);

      if (app) return true;

      // Organizations can also access applications to their opportunities
      if (userType === "organization" && organizationId) {
        const targetApp = await storage.getApplication(resourceId);
        if (targetApp) {
          const opportunity = await storage.getOpportunity(targetApp.opportunityId);
          return opportunity?.organizationId === organizationId;
        }
      }

      return false;
    }

    case "message": {
      // Check if user is participant in the conversation thread
      if (userType === "volunteer") {
        const threads = await storage.listConversationThreadsByVolunteer(userId);
        return threads.some((t) => t.id === resourceId);
      } else if (userType === "organization" && organizationId) {
        const threads = await storage.listConversationThreadsByOrganization(organizationId);
        return threads.some((t) => t.id === resourceId);
      }
      return false;
    }

    default:
      return false;
  }
}

/**
 * Secure user ID extraction - only from verified sources
 */
export function getVerifiedUserId(req: Request): number | null {
  // Only return userId if properly authenticated
  if (req.user?.id) {
    return req.user.id;
  }
  return null;
}

/**
 * Require GDPR data-processing consent before accessing personal data routes.
 * Must run after authMiddleware (requires req.user).
 */
export async function requireDataConsent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required." });
    return;
  }
  const user = await storage.getUser(req.user.id);
  if (!user?.dataConsent) {
    res.status(403).json({
      error: "CONSENT_REQUIRED",
      message: "Data processing consent is required to access this resource.",
    });
    return;
  }
  next();
}

/**
 * Get user ID - only from verified sources (no legacy fallback)
 * @deprecated Use getVerifiedUserId instead
 */
export function extractUserIdSecure(req: Request): number | null {
  // SECURITY: Only return verified user ID - no legacy fallback
  // Legacy x-user-id header authentication was removed as it allowed impersonation
  if (req.user?.id) {
    return req.user.id;
  }
  return null;
}
