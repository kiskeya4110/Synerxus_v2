/**
 * CSRF Protection Middleware
 *
 * Implements double-submit cookie pattern for CSRF protection.
 * All state-changing requests (POST, PUT, PATCH, DELETE) require a valid CSRF token.
 *
 * Usage:
 * 1. Client fetches CSRF token from GET /api/csrf-token
 * 2. Client includes token in X-CSRF-Token header for state-changing requests
 * 3. Server validates token matches the cookie
 */

import { type Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// CSRF token cookie name
const CSRF_COOKIE_NAME = '_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Set CSRF cookie if not present
 */
function ensureCsrfCookie(req: Request, res: Response): string {
  let token = req.cookies?.[CSRF_COOKIE_NAME];

  if (!token) {
    token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 * 1000, // 1 hour
      path: '/',
    });
  }

  return token;
}

/**
 * CSRF protection middleware
 * Validates CSRF token for state-changing requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Ensure CSRF cookie exists
  const cookieToken = ensureCsrfCookie(req, res);

  // Skip validation for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    // Attach token getter for use in routes
    req.csrfToken = () => cookieToken;
    return next();
  }

  // Validate token for state-changing methods
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!headerToken) {
    res.status(403).json({
      message: 'CSRF token missing',
      code: 'CSRF_MISSING',
    });
    return;
  }

  // Timing-safe comparison to prevent timing attacks
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (cookieBuffer.length !== headerBuffer.length ||
      !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    res.status(403).json({
      message: 'CSRF token invalid',
      code: 'CSRF_INVALID',
    });
    return;
  }

  // Token is valid
  req.csrfToken = () => cookieToken;
  next();
}

/**
 * Middleware to skip CSRF for specific routes (e.g., webhooks)
 */
export function skipCsrf(
  paths: string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (paths.some(path => req.path.startsWith(path))) {
      return next();
    }
    return csrfProtection(req, res, next);
  };
}

/**
 * Route handler to get CSRF token
 */
export function csrfTokenHandler(req: Request, res: Response): void {
  const token = ensureCsrfCookie(req, res);
  res.json({ csrfToken: token });
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      csrfToken?: () => string;
    }
  }
}

export default {
  csrfProtection,
  skipCsrf,
  csrfTokenHandler,
};
