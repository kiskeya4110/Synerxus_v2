/**
 * Firebase Authentication Middleware
 *
 * Verifies Firebase ID tokens on the server side.
 * This ensures that only authenticated users can access protected endpoints.
 *
 * Setup required:
 * 1. Set FIREBASE_PROJECT_ID environment variable
 * 2. Set FIREBASE_CLIENT_EMAIL environment variable
 * 3. Set FIREBASE_PRIVATE_KEY environment variable
 *
 * If Firebase Admin is not configured, falls back to header-based auth (development only).
 */

import { type Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { logger } from '../logger';

// Firebase Admin SDK - dynamically imported to handle missing credentials gracefully
let admin: typeof import('firebase-admin') | null = null;
let firebaseInitialized = false;
let firebaseInitError: string | null = null;

/**
 * Initialize Firebase Admin SDK
 */
async function initializeFirebase(): Promise<boolean> {
  if (firebaseInitialized) return true;
  if (firebaseInitError) return false;

  try {
    admin = await import('firebase-admin');

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      firebaseInitError = 'Firebase Admin credentials not configured';
      logger.warn('Firebase Admin not configured - using fallback authentication');
      return false;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized successfully');
    return true;
  } catch (error: any) {
    firebaseInitError = error.message;
    logger.error('Failed to initialize Firebase Admin:', error.message);
    return false;
  }
}

// Initialize on module load
initializeFirebase();

/**
 * Extract user ID from request headers (fallback method)
 */
function extractUserIdFromHeaders(req: Request): number | null {
  const userIdStr =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string);

  if (!userIdStr) return null;

  const userId = parseInt(userIdStr);
  return isNaN(userId) ? null : userId;
}

/**
 * Verify Firebase ID token and attach user to request
 */
export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try to initialize Firebase if not already done
    const isFirebaseReady = await initializeFirebase();

    const authHeader = req.headers.authorization;

    // If Firebase is configured and we have a Bearer token, verify it
    if (isFirebaseReady && admin && authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];

      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        // Get user from database using Firebase UID
        const user = await storage.getUserByFirebaseUid(decodedToken.uid);

        if (!user) {
          res.status(401).json({
            message: 'User not found in database. Please complete registration.',
            code: 'USER_NOT_REGISTERED',
          });
          return;
        }

        // Attach verified user to request
        req.authenticatedUser = user;
        req.firebaseUser = decodedToken;
        req.isAuthenticated = true;

        return next();
      } catch (tokenError: any) {
        // Handle specific token errors
        if (tokenError.code === 'auth/id-token-expired') {
          res.status(401).json({
            message: 'Token expired. Please sign in again.',
            code: 'TOKEN_EXPIRED',
          });
          return;
        }

        if (tokenError.code === 'auth/argument-error') {
          res.status(401).json({
            message: 'Invalid token format.',
            code: 'INVALID_TOKEN_FORMAT',
          });
          return;
        }

        logger.warn('Firebase token verification failed:', tokenError.message);
        res.status(401).json({
          message: 'Invalid authentication token.',
          code: 'INVALID_TOKEN',
        });
        return;
      }
    }

    // Fallback to header-based auth (for development or when Firebase Admin not configured)
    const userId = extractUserIdFromHeaders(req);

    if (!userId) {
      res.status(401).json({
        message: 'Authentication required. Please sign in.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const user = await storage.getUser(userId);

    if (!user) {
      res.status(401).json({
        message: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Log fallback auth usage in production
    if (process.env.NODE_ENV === 'production' && !isFirebaseReady) {
      logger.warn({
        type: 'SECURITY_FALLBACK_AUTH',
        userId: user.id,
        endpoint: `${req.method} ${req.path}`,
        note: 'Using header-based auth - configure Firebase Admin for production',
      });
    }

    req.authenticatedUser = user;
    req.isAuthenticated = true;

    next();
  } catch (error: any) {
    logger.error('Authentication middleware error:', error.message);
    res.status(500).json({
      message: 'Authentication service error.',
      code: 'AUTH_SERVICE_ERROR',
    });
  }
}

/**
 * Optional Firebase authentication
 * Attaches user if token present, continues otherwise
 */
export async function optionalFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const isFirebaseReady = await initializeFirebase();
    const authHeader = req.headers.authorization;

    // Try Firebase token verification
    if (isFirebaseReady && admin && authHeader?.startsWith('Bearer ')) {
      try {
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const user = await storage.getUserByFirebaseUid(decodedToken.uid);

        if (user) {
          req.authenticatedUser = user;
          req.firebaseUser = decodedToken;
          req.isAuthenticated = true;
        }
      } catch {
        // Silently fail for optional auth
      }
    } else {
      // Fallback to header-based auth
      const userId = extractUserIdFromHeaders(req);
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          req.authenticatedUser = user;
          req.isAuthenticated = true;
        }
      }
    }

    next();
  } catch {
    // Silently fail for optional auth
    next();
  }
}

/**
 * Require specific user type after authentication
 */
export function requireUserType(allowedTypes: string | string[]) {
  const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.authenticatedUser;

    if (!user) {
      res.status(401).json({
        message: 'Authentication required.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!types.includes(user.userType)) {
      res.status(403).json({
        message: `Access denied. Required: ${types.join(' or ')}`,
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
export const requireOrganization = [verifyFirebaseToken, requireUserType('organization')];

/**
 * Require volunteer user
 */
export const requireVolunteer = [verifyFirebaseToken, requireUserType('volunteer')];

/**
 * Require corporate partner user
 */
export const requireCorporatePartner = [verifyFirebaseToken, requireUserType('corporate-partner')];

/**
 * Check if Firebase Admin is properly configured
 */
export function isFirebaseAdminConfigured(): boolean {
  return firebaseInitialized && !firebaseInitError;
}

/**
 * Get Firebase initialization status for health checks
 */
export function getFirebaseStatus(): { initialized: boolean; error: string | null } {
  return {
    initialized: firebaseInitialized,
    error: firebaseInitError,
  };
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: any;
      firebaseUser?: any;
      isAuthenticated?: boolean;
    }
  }
}

export default {
  verifyFirebaseToken,
  optionalFirebaseAuth,
  requireUserType,
  requireOrganization,
  requireVolunteer,
  requireCorporatePartner,
  isFirebaseAdminConfigured,
  getFirebaseStatus,
};
