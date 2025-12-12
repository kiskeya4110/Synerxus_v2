/**
 * Authorization Middleware
 *
 * Provides middleware for:
 * - Requiring authentication
 * - Verifying resource ownership
 * - Role-based access control
 * - Organization membership verification
 *
 * Note: For production, integrate with Firebase Admin SDK for token verification.
 * See firebase-auth.ts for full implementation.
 */

import { type Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { logger } from '../logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: any;
      isAuthenticated?: boolean;
    }
  }
}

/**
 * Extract user ID from request
 * In production, this should verify Firebase token instead
 */
function extractUserId(req: Request): number | null {
  // Priority: Authorization header > x-user-id header > query param
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    // TODO: Verify Firebase token and extract user
    // For now, fall through to header-based auth
  }

  const userIdStr =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    (req.body?.userId as string);

  if (!userIdStr) return null;

  const userId = parseInt(userIdStr);
  return isNaN(userId) ? null : userId;
}

/**
 * Require authentication middleware
 * Attaches authenticated user to request
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = extractUserId(req);

    if (!userId) {
      res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const user = await storage.getUser(userId);

    if (!user) {
      res.status(401).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Attach user to request
    req.authenticatedUser = user;
    req.isAuthenticated = true;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      message: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Optional authentication - attaches user if present, continues otherwise
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = extractUserId(req);

    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        req.authenticatedUser = user;
        req.isAuthenticated = true;
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

/**
 * Require specific user type
 */
export function requireUserType(allowedTypes: string | string[]) {
  const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.authenticatedUser;

    if (!user) {
      res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!types.includes(user.userType)) {
      res.status(403).json({
        message: `Access denied. Required user type: ${types.join(' or ')}`,
        code: 'WRONG_USER_TYPE',
      });
      return;
    }

    next();
  };
}

/**
 * Require organization user
 */
export const requireOrganization = requireUserType('organization');

/**
 * Require volunteer user
 */
export const requireVolunteer = requireUserType('volunteer');

/**
 * Require corporate partner user
 */
export const requireCorporatePartner = requireUserType('corporate-partner');

/**
 * Verify the authenticated user owns the resource
 */
export function requireOwnership(userIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.authenticatedUser;

    if (!user) {
      res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Get resource user ID from params, query, or body
    const resourceUserId =
      parseInt(req.params[userIdParam]) ||
      parseInt(req.query[userIdParam] as string) ||
      parseInt(req.body?.[userIdParam]);

    if (!resourceUserId) {
      res.status(400).json({
        message: 'Resource user ID required',
        code: 'MISSING_USER_ID',
      });
      return;
    }

    if (resourceUserId !== user.id) {
      logger.warn({
        type: 'SECURITY_ACCESS_DENIED',
        userId: user.id,
        attemptedResource: resourceUserId,
        endpoint: `${req.method} ${req.path}`,
      });

      res.status(403).json({
        message: 'Access denied',
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
}

/**
 * Verify user belongs to the specified organization
 */
export function requireOrgMembership(orgIdParam: string = 'organizationId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.authenticatedUser;

    if (!user) {
      res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!user.organizationId) {
      res.status(403).json({
        message: 'Organization membership required',
        code: 'NO_ORG_MEMBERSHIP',
      });
      return;
    }

    // Get target organization ID
    const targetOrgId =
      parseInt(req.params[orgIdParam]) ||
      parseInt(req.query[orgIdParam] as string) ||
      parseInt(req.body?.[orgIdParam]);

    // If target org specified, verify membership
    if (targetOrgId && targetOrgId !== user.organizationId) {
      logger.warn({
        type: 'SECURITY_ORG_ACCESS_DENIED',
        userId: user.id,
        userOrgId: user.organizationId,
        attemptedOrgId: targetOrgId,
        endpoint: `${req.method} ${req.path}`,
      });

      res.status(403).json({
        message: 'Not authorized for this organization',
        code: 'WRONG_ORG',
      });
      return;
    }

    next();
  };
}

/**
 * Verify resource ownership by organization
 */
export function requireResourceOrgOwnership(
  getResourceOrgId: (req: Request) => Promise<number | null>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.authenticatedUser;

    if (!user || !user.organizationId) {
      res.status(403).json({
        message: 'Organization authorization required',
        code: 'ORG_REQUIRED',
      });
      return;
    }

    try {
      const resourceOrgId = await getResourceOrgId(req);

      if (!resourceOrgId) {
        res.status(404).json({
          message: 'Resource not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      if (resourceOrgId !== user.organizationId) {
        res.status(403).json({
          message: 'Resource not owned by your organization',
          code: 'NOT_OWNER',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Resource ownership check failed:', error);
      res.status(500).json({
        message: 'Authorization error',
        code: 'AUTH_ERROR',
      });
    }
  };
}

/**
 * Rate limit by authenticated user
 * Uses user ID as key instead of IP
 */
export function userRateLimit(
  windowMs: number,
  maxRequests: number
) {
  const requests = new Map<number, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.authenticatedUser;
    if (!user) {
      return next();
    }

    const now = Date.now();
    const userLimit = requests.get(user.id);

    if (!userLimit || now > userLimit.resetAt) {
      requests.set(user.id, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      res.status(429).json({
        message: 'Too many requests',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((userLimit.resetAt - now) / 1000),
      });
      return;
    }

    userLimit.count++;
    next();
  };
}

export default {
  requireAuth,
  optionalAuth,
  requireUserType,
  requireOrganization,
  requireVolunteer,
  requireCorporatePartner,
  requireOwnership,
  requireOrgMembership,
  requireResourceOrgOwnership,
  userRateLimit,
};
