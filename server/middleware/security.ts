import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { logger } from "../logger";

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
 * Strict rate limiter for authentication endpoints
 * 10 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per window
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

  // Enable XSS filter
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy (adjust as needed)
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https:;"
  );

  // Strict Transport Security (for HTTPS)
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
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
    for (const key in req.query) {
      if (typeof req.query[key] === "string") {
        req.query[key] = sanitizeString(req.query[key] as string);
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

  for (const key in obj) {
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

    // In production, check against whitelist
    const whitelist = (process.env.CORS_WHITELIST || "").split(",").filter(Boolean);

    if (whitelist.length === 0 || whitelist.includes(origin)) {
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
