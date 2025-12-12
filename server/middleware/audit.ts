/**
 * Security Audit Logging Middleware
 *
 * Tracks sensitive operations for security monitoring and compliance.
 * Logs authentication events, data access, and administrative actions.
 *
 * Features:
 * - Request correlation IDs for tracing
 * - Structured logging for SIEM integration
 * - PII masking in logs
 * - Performance impact tracking
 */

import { type Request, Response, NextFunction } from "express";
import { logger } from "../logger";
import crypto from "crypto";

// Sensitive endpoints that require audit logging
const AUDITABLE_ENDPOINTS = [
  // Authentication
  { pattern: /^\/api\/users\/firebase-sync$/, action: 'AUTH_SYNC' },
  { pattern: /^\/api\/users\/login$/, action: 'AUTH_LOGIN' },
  { pattern: /^\/api\/users\/register$/, action: 'AUTH_REGISTER' },
  { pattern: /^\/api\/users\/logout$/, action: 'AUTH_LOGOUT' },

  // User management
  { pattern: /^\/api\/users\/\d+$/, action: 'USER_ACCESS', methods: ['GET'] },
  { pattern: /^\/api\/users\/\d+$/, action: 'USER_UPDATE', methods: ['PATCH', 'PUT'] },
  { pattern: /^\/api\/users\/\d+$/, action: 'USER_DELETE', methods: ['DELETE'] },

  // Profile access
  { pattern: /^\/api\/intake\/volunteer-profile/, action: 'PROFILE_ACCESS' },
  { pattern: /^\/api\/intake\/organization-profile/, action: 'PROFILE_ACCESS' },
  { pattern: /^\/api\/profile/, action: 'PROFILE_UPDATE', methods: ['POST', 'PATCH', 'PUT'] },

  // Admin operations
  { pattern: /^\/api\/admin/, action: 'ADMIN_OPERATION' },

  // Data exports
  { pattern: /^\/api\/aiu\/export/, action: 'DATA_EXPORT' },
  { pattern: /^\/api\/csr\/reports/, action: 'REPORT_GENERATE' },

  // Bulk operations
  { pattern: /^\/api\/.*\/bulk/, action: 'BULK_OPERATION' },

  // File uploads
  { pattern: /^\/api\/storage\/upload/, action: 'FILE_UPLOAD' },
];

/**
 * Generate a unique request correlation ID
 */
function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Mask sensitive data in objects
 */
function maskSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = [
    'password', 'token', 'secret', 'apiKey', 'authorization',
    'ssn', 'socialSecurityNumber', 'creditCard', 'cvv',
  ];

  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      masked[key] = '[REDACTED]';
    } else if (lowerKey === 'email' && typeof value === 'string') {
      // Partially mask emails
      const [local, domain] = value.split('@');
      masked[key] = local.substring(0, 2) + '***@' + domain;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      masked[key] = maskSensitiveData(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Determine if an endpoint should be audited
 */
function getAuditAction(path: string, method: string): string | null {
  for (const endpoint of AUDITABLE_ENDPOINTS) {
    if (endpoint.pattern.test(path)) {
      // Check if method restriction applies
      if (endpoint.methods && !endpoint.methods.includes(method)) {
        continue;
      }
      return endpoint.action;
    }
  }
  return null;
}

/**
 * Extract user context from request
 */
function getUserContext(req: Request): {
  userId: string | null;
  userType: string | null;
  ip: string;
  userAgent: string;
} {
  return {
    userId: (req.headers['x-user-id'] as string) || null,
    userType: (req.headers['x-user-type'] as string) || null,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };
}

/**
 * Security audit middleware
 */
export function auditLog(req: Request, res: Response, next: NextFunction): void {
  const action = getAuditAction(req.path, req.method);

  // If not an auditable endpoint, skip
  if (!action) {
    return next();
  }

  // Generate correlation ID
  const correlationId = generateCorrelationId();
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  const startTime = Date.now();
  const userContext = getUserContext(req);

  // Log request start
  const auditEntry = {
    type: 'SECURITY_AUDIT',
    correlationId,
    action,
    phase: 'REQUEST',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query ? maskSensitiveData(req.query as Record<string, unknown>) : {},
    body: req.body ? maskSensitiveData(req.body) : {},
    user: userContext,
  };

  logger.info(auditEntry);

  // Capture response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, callback?: any) {
    const duration = Date.now() - startTime;

    // Log response
    const responseAudit = {
      type: 'SECURITY_AUDIT',
      correlationId,
      action,
      phase: 'RESPONSE',
      timestamp: new Date().toISOString(),
      statusCode: res.statusCode,
      duration,
      success: res.statusCode < 400,
      user: userContext,
    };

    // Log security events
    if (res.statusCode === 401) {
      logger.warn({
        ...responseAudit,
        type: 'SECURITY_AUTH_FAILURE',
      });
    } else if (res.statusCode === 403) {
      logger.warn({
        ...responseAudit,
        type: 'SECURITY_ACCESS_DENIED',
      });
    } else if (res.statusCode >= 500) {
      logger.error({
        ...responseAudit,
        type: 'SECURITY_SERVER_ERROR',
      });
    } else {
      logger.info(responseAudit);
    }

    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
}

/**
 * Middleware to add request ID to all requests (not just auditable ones)
 */
export function addRequestId(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || generateCorrelationId();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

/**
 * Log specific security events
 */
export const securityEvents = {
  loginAttempt: (req: Request, success: boolean, userId?: number) => {
    logger.info({
      type: success ? 'SECURITY_LOGIN_SUCCESS' : 'SECURITY_LOGIN_FAILURE',
      timestamp: new Date().toISOString(),
      userId,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  },

  passwordChange: (req: Request, userId: number) => {
    logger.info({
      type: 'SECURITY_PASSWORD_CHANGE',
      timestamp: new Date().toISOString(),
      userId,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  },

  sessionCreated: (req: Request, userId: number, sessionId: string) => {
    logger.info({
      type: 'SECURITY_SESSION_CREATED',
      timestamp: new Date().toISOString(),
      userId,
      sessionId: sessionId.substring(0, 8) + '...',
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  },

  sessionDestroyed: (req: Request, userId: number, sessionId: string) => {
    logger.info({
      type: 'SECURITY_SESSION_DESTROYED',
      timestamp: new Date().toISOString(),
      userId,
      sessionId: sessionId.substring(0, 8) + '...',
      ip: req.ip || req.socket.remoteAddress,
    });
  },

  dataExport: (req: Request, userId: number, exportType: string, recordCount: number) => {
    logger.info({
      type: 'SECURITY_DATA_EXPORT',
      timestamp: new Date().toISOString(),
      userId,
      exportType,
      recordCount,
      ip: req.ip || req.socket.remoteAddress,
    });
  },

  adminAction: (req: Request, userId: number, action: string, targetId?: number) => {
    logger.warn({
      type: 'SECURITY_ADMIN_ACTION',
      timestamp: new Date().toISOString(),
      userId,
      action,
      targetId,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  },

  suspiciousActivity: (req: Request, reason: string, details?: Record<string, unknown>) => {
    logger.warn({
      type: 'SECURITY_SUSPICIOUS_ACTIVITY',
      timestamp: new Date().toISOString(),
      reason,
      details,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
    });
  },
};

export default {
  auditLog,
  addRequestId,
  securityEvents,
};
