import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { logger } from "../logger";
import { getRedisClient } from "../redis";

// ============================================
// Token Blacklist (Redis-backed, in-memory fallback)
// Uses Redis when REDIS_URL is set; falls back to in-memory
// for single-instance dev/staging deployments.
// ============================================

class TokenBlacklist {
  // In-memory fallback map (used when Redis is unavailable)
  private fallback: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically sweep the in-memory fallback
    this.cleanupInterval = setInterval(() => this._sweepFallback(), 5 * 60 * 1000).unref();
  }

  async add(token: string, expiresAt: number): Promise<void> {
    const ttlSeconds = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));
    try {
      const redis = await getRedisClient();
      await redis.set(`bl:${token}`, "1", "EX", ttlSeconds);
    } catch {
      this.fallback.set(token, expiresAt);
    }
  }

  async isBlacklisted(token: string): Promise<boolean> {
    try {
      const redis = await getRedisClient();
      return (await redis.exists(`bl:${token}`)) === 1;
    } catch {
      const exp = this.fallback.get(token);
      if (exp === undefined) return false;
      if (exp < Date.now()) { this.fallback.delete(token); return false; }
      return true;
    }
  }

  private _sweepFallback(): void {
    const now = Date.now();
    Array.from(this.fallback.entries()).forEach(([token, expiresAt]) => {
      if (expiresAt < now) this.fallback.delete(token);
    });
  }

  size(): number { return this.fallback.size; }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const tokenBlacklist = new TokenBlacklist();

// ============================================
// Refresh Token Support
// ============================================

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
const JWT_SECRET_VALUE = JWT_SECRET || crypto.randomBytes(64).toString('hex');

// REFRESH_TOKEN_SECRET must be independent from JWT_SECRET
if (!process.env.REFRESH_TOKEN_SECRET) {
  const msg = "CRITICAL: REFRESH_TOKEN_SECRET environment variable is required and must be independent from JWT_SECRET";
  console.error(`[SECURITY] ${msg}`);
  if (process.env.NODE_ENV === "production") {
    throw new Error(msg);
  }
  console.warn("[SECURITY] Generating random REFRESH_TOKEN_SECRET for this session — tokens will be invalid after restart");
}
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || crypto.randomBytes(64).toString('hex');

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface TokenPayload {
  userId: number;
  email: string;
  userType: string;
  organizationId?: number | null;
  type?: "access" | "refresh";
}

/**
 * Generate access and refresh token pair
 */
export function generateTokenPair(user: {
  id: number;
  email: string;
  userType: string;
  organizationId?: number | null;
}): TokenPair {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    userType: user.userType,
    organizationId: user.organizationId,
  };

  const accessToken = jwt.sign(
    { ...payload, type: "access" },
    JWT_SECRET_VALUE,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { ...payload, type: "refresh" },
    REFRESH_SECRET,
    { expiresIn: "30d" }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60,
  };
}

/**
 * Verify refresh token — async due to Redis blacklist check
 */
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    if (await tokenBlacklist.isBlacklisted(token)) {
      return null;
    }

    const decoded = jwt.verify(token, REFRESH_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
    if (decoded.type !== "refresh") {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Blacklist a token (for logout) — async, Redis-backed
 */
export async function blacklistToken(token: string): Promise<void> {
  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
    await tokenBlacklist.add(token, expiresAt);
  } catch {
    await tokenBlacklist.add(token, Date.now() + 24 * 60 * 60 * 1000);
  }
}

/**
 * Middleware to check token blacklist — async
 */
export async function checkTokenBlacklist(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    if (await tokenBlacklist.isBlacklisted(token)) {
      res.status(401).json({
        error: "TOKEN_REVOKED",
        message: "This token has been revoked. Please log in again.",
      });
      return;
    }
  }

  next();
}

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupSecurity(): void {
  tokenBlacklist.stop();
  logger.info("[Security] Cleanup complete");
}

/**
 * Rate limiter for general API endpoints
 * 100 requests per 15 minutes per IP
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "RATE_LIMITED",
    message: "Too many requests. Please try again later.",
  },
  handler: (req, res) => {
    logger.warn(`[RateLimit] IP ${req.ip} exceeded general rate limit`);
    res.status(429).json({
      error: "RATE_LIMITED",
      message: "Too many requests. Please try again in 15 minutes.",
    });
  },
});

/**
 * Rate limiter for authentication endpoints
 * 50 requests per 15 minutes per IP (more lenient for better UX)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 50, // More lenient in development
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "RATE_LIMITED",
    message: "Too many authentication attempts. Please try again later.",
  },
  handler: (req, res) => {
    logger.warn(`[RateLimit] IP ${req.ip} exceeded auth rate limit`);
    res.status(429).json({
      error: "RATE_LIMITED",
      message: "Too many authentication attempts. Please try again in 15 minutes.",
    });
  },
});

/**
 * Rate limiter for sensitive operations (password reset, email, etc.)
 * 5 requests per hour per IP
 */
export const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "RATE_LIMITED",
    message: "Too many requests for this operation. Please try again later.",
  },
  handler: (req, res) => {
    logger.warn(`[RateLimit] IP ${req.ip} exceeded sensitive operation rate limit`);
    res.status(429).json({
      error: "RATE_LIMITED",
      message: "Too many requests. Please try again in 1 hour.",
    });
  },
});

/**
 * Rate limiter for data export operations
 * 10 requests per hour per IP
 */
export const exportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 exports per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "RATE_LIMITED",
    message: "Too many export requests. Please try again later.",
  },
});

/**
 * Security headers middleware
 */
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // X-XSS-Protection is deprecated in modern browsers and removed — rely on CSP instead

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Restrict access to browser features not needed by this app
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()");

  // Content Security Policy - Strengthened to reduce XSS attack surface
  // Note: 'unsafe-inline' for styles is kept for React's CSS-in-JS compatibility
  // In development, 'unsafe-inline' and 'unsafe-eval' are needed for Vite HMR
  const isDev = process.env.NODE_ENV !== "production";
  
  const cspDirectives = [
    "default-src 'self'",
    // Scripts: In dev, allow inline scripts for Vite HMR; in prod, only trusted sources
    isDev 
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://replit.com https://apis.google.com"
      : "script-src 'self' https://cdnjs.cloudflare.com https://replit.com https://apis.google.com",
    // Styles: unsafe-inline needed for CSS-in-JS (React/Emotion/styled-components)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Images: Allow data URIs for inline images and any HTTPS source
    "img-src 'self' data: blob: https:",
    // Fonts: Self, data URIs, and Google Fonts
    "font-src 'self' data: https://fonts.gstatic.com",
    // API connections: Self plus specific trusted external services only
    // Restricting to known hosts prevents data exfiltration via XSS
    // wss: is locked to the app's own origin; set APP_ORIGIN in production for the exact domain
    ...(process.env.APP_ORIGIN
      ? [`connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com https://firebase.googleapis.com wss://${new URL(process.env.APP_ORIGIN).host}`]
      : ["connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com https://firebase.googleapis.com wss:"]),
    // Prevent clickjacking via frames
    "frame-ancestors 'none'",
    // Restrict form submissions to same origin
    "form-action 'self'",
    // Restrict base URI to prevent base tag hijacking
    "base-uri 'self'",
    // Upgrade HTTP requests to HTTPS (only in production)
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  res.setHeader("Content-Security-Policy", cspDirectives);

  // Strict Transport Security (for HTTPS) — includeSubDomains + preload for maximum protection
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  next();
}

/**
 * Request sanitization middleware
 * Removes potentially dangerous characters from inputs
 */
export function sanitizeInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Sanitize query parameters
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (typeof req.query[key] === "string") {
        (req.query as Record<string, string>)[key] = sanitizeString(req.query[key] as string);
      }
    }
  }

  // Sanitize body (for JSON)
  if (req.body && typeof req.body === "object") {
    sanitizeObject(req.body);
  }

  next();
}

/**
 * Sanitize a string value
 */
function sanitizeString(value: string): string {
  // Remove null bytes
  let sanitized = value.replace(/\0/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length to prevent DoS
  if (sanitized.length > 10000) {
    sanitized = sanitized.slice(0, 10000);
  }

  return sanitized;
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: Record<string, any>, depth = 0): void {
  // Prevent deep recursion attacks
  if (depth > 10) return;

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (typeof value === "string") {
      obj[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "string") {
          value[index] = sanitizeString(item);
        } else if (typeof item === "object" && item !== null) {
          sanitizeObject(item, depth + 1);
        }
      });
    } else if (typeof value === "object" && value !== null) {
      sanitizeObject(value, depth + 1);
    }
  }
}

/**
 * CORS configuration for API
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // In development, allow localhost
    if (process.env.NODE_ENV === "development") {
      callback(null, true);
      return;
    }

    // In production, check against whitelist — fail closed if not configured
    const whitelist = (process.env.CORS_WHITELIST || "").split(",").filter(Boolean);

    if (whitelist.length === 0) {
      logger.error("[CORS] CORS_WHITELIST is not set in production — blocking all cross-origin requests");
      callback(new Error("CORS not configured"));
      return;
    }

    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Firebase-UID",
    "X-CSRF-Token",
  ],
  exposedHeaders: ["X-Total-Count", "X-Page", "X-Page-Size"],
  maxAge: 86400, // 24 hours
};

/**
 * CORS middleware — enforces corsOptions without requiring the cors package
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin as string | undefined;

  corsOptions.origin(origin, (err, allow) => {
    if (err || !allow) {
      // No CORS headers — browser will block the request
      if (req.method === "OPTIONS") {
        res.status(204).end();
      } else {
        next();
      }
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", corsOptions.methods.join(", "));
    res.setHeader("Access-Control-Allow-Headers", corsOptions.allowedHeaders.join(", "));
    res.setHeader("Access-Control-Expose-Headers", corsOptions.exposedHeaders.join(", "));
    res.setHeader("Access-Control-Max-Age", String(corsOptions.maxAge));

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });
}

/**
 * Log suspicious activity
 */
export function logSuspiciousActivity(
  req: Request,
  reason: string,
  details?: Record<string, any>
): void {
  logger.warn(`[Security] Suspicious activity detected`, {
    reason,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ...details,
  });
}

/**
 * Validate integer parameter
 */
export function validateIntParam(
  value: string | undefined,
  paramName: string
): { valid: boolean; value?: number; error?: string } {
  if (!value) {
    return { valid: false, error: `${paramName} is required` };
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    return { valid: false, error: `${paramName} must be a valid number` };
  }

  if (parsed < 0) {
    return { valid: false, error: `${paramName} must be a positive number` };
  }

  if (parsed > Number.MAX_SAFE_INTEGER) {
    return { valid: false, error: `${paramName} is too large` };
  }

  return { valid: true, value: parsed };
}

/**
 * Secure cookie options for session/auth cookies
 */
export const secureCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

/**
 * CSRF Protection Middleware
 * Uses the Synchronizer Token Pattern with Double Submit Cookie
 * Note: Since the app uses JWT tokens in Authorization headers (not cookies),
 * the CSRF risk is already mitigated. This provides defense-in-depth.
 */
const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * CSRF token generation middleware
 * Sets a CSRF token cookie for use in forms/requests
 */
export function csrfTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only generate token if not already present
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      ...secureCookieOptions,
      httpOnly: false, // Client needs to read this for the header
    });
  }
  next();
}

/**
 * CSRF validation middleware
 * Validates that the CSRF token in the header matches the cookie
 * Only applies to state-changing methods (POST, PUT, PATCH, DELETE)
 */
export function csrfValidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip CSRF validation for safe methods
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for API requests with Bearer token (already protected)
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return next();
  }

  // Note: x-firebase-uid header bypass removed — presence of an arbitrary header
  // is not a sufficient trust signal. Bearer token bypass above is sufficient.

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!cookieToken || !headerToken) {
    logger.warn(`[CSRF] Missing token - cookie: ${!!cookieToken}, header: ${!!headerToken}`);
    res.status(403).json({
      error: "CSRF_VALIDATION_FAILED",
      message: "CSRF token validation failed. Please refresh and try again.",
    });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    logger.warn(`[CSRF] Token mismatch for ${req.path}`);
    res.status(403).json({
      error: "CSRF_VALIDATION_FAILED",
      message: "CSRF token validation failed. Please refresh and try again.",
    });
    return;
  }

  next();
}
