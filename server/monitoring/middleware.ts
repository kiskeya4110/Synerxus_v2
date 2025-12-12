/**
 * Monitoring Middleware
 *
 * Express middleware to automatically track:
 * - Request metrics
 * - Database queries
 * - Cache operations
 * - Security events
 */

import { Request, Response, NextFunction } from 'express';
import { metricsCollector } from './metrics-collector';
import { securityMetrics } from './security-metrics';
import { businessMetrics } from './business-metrics';

// =============================================================================
// REQUEST TRACKING MIDDLEWARE
// =============================================================================

/**
 * Middleware to track request metrics
 */
export function requestMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const userId = (req as any).authenticatedUser?.id;

  // Track response
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;

    metricsCollector.recordRequest({
      method: req.method,
      path: req.route?.path || req.path,
      statusCode: res.statusCode,
      durationMs,
      timestamp: Date.now(),
      userId,
      ip: req.ip || req.socket.remoteAddress,
    });

    // Track business events based on request
    if (userId) {
      businessMetrics.trackVolunteerActive(userId);
    }

    // Track security events for errors
    if (res.statusCode === 401) {
      securityMetrics.recordAuthenticationError(
        req.ip || 'unknown',
        'Unauthorized request',
        req.path
      );
    } else if (res.statusCode === 403) {
      if (userId) {
        securityMetrics.recordAuthorizationFailure(
          req.ip || 'unknown',
          userId,
          req.path,
          req.method
        );
      }
    } else if (res.statusCode === 429) {
      securityMetrics.recordRateLimitExceeded(
        req.ip || 'unknown',
        req.path,
        userId
      );
    }
  });

  next();
}

/**
 * Middleware to detect and track suspicious requests
 */
export function securityDetectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Check if IP is blocked
  if (securityMetrics.isIPBlocked(ip)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Your IP has been blocked due to suspicious activity',
    });
    return;
  }

  // Check for common attack patterns in query/body
  const suspiciousPatterns = [
    // SQL Injection patterns
    { pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b.*\b(FROM|INTO|WHERE|SET|TABLE)\b)/i, type: 'sql_injection' as const },
    { pattern: /(--|#|\/\*|\*\/|;)/g, type: 'sql_injection' as const },
    // XSS patterns
    { pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, type: 'xss' as const },
    { pattern: /javascript:/gi, type: 'xss' as const },
    { pattern: /on\w+\s*=/gi, type: 'xss' as const },
    // Path traversal
    { pattern: /\.\.[\/\\]/g, type: 'path_traversal' as const },
  ];

  const checkValue = (value: string): { type: 'sql_injection' | 'xss' | 'path_traversal' | 'other'; pattern: string } | null => {
    for (const { pattern, type } of suspiciousPatterns) {
      if (pattern.test(value)) {
        return { type, pattern: pattern.toString() };
      }
    }
    return null;
  };

  // Check URL
  const urlCheck = checkValue(req.url);
  if (urlCheck) {
    securityMetrics.recordSuspiciousRequest(ip, urlCheck.type, req.path, req.url);
  }

  // Check query parameters
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      const check = checkValue(value);
      if (check) {
        securityMetrics.recordSuspiciousRequest(ip, check.type, req.path, `${key}=${value}`);
      }
    }
  }

  // Check body (if present and is object)
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body);
    const bodyCheck = checkValue(bodyStr);
    if (bodyCheck) {
      securityMetrics.recordSuspiciousRequest(ip, bodyCheck.type, req.path, bodyStr.substring(0, 200));
    }
  }

  next();
}

/**
 * Track login attempts
 */
export function trackLoginAttempt(
  success: boolean,
  ip: string,
  userId?: number,
  reason?: string
): void {
  if (success && userId) {
    securityMetrics.recordSuccessfulLogin(ip, userId);
    businessMetrics.trackLogin(userId, 'volunteer');
  } else {
    securityMetrics.recordFailedLogin(ip, userId, reason);
  }
}

/**
 * Track hours logged
 */
export function trackHoursLogged(
  volunteerId: number,
  hours: number,
  projectId?: number,
  sdgGoals?: number[]
): void {
  businessMetrics.trackHoursLogged(volunteerId, hours, projectId, sdgGoals);
}

/**
 * Track task completion
 */
export function trackTaskCompleted(
  taskId: number,
  volunteerId: number,
  projectId?: number
): void {
  businessMetrics.trackTaskCompleted(taskId, volunteerId, projectId);
}

/**
 * Track organization created
 */
export function trackOrganizationCreated(
  organizationId: number,
  name: string
): void {
  businessMetrics.trackOrganizationCreated(organizationId, name);
}

/**
 * Track volunteer registration
 */
export function trackVolunteerRegistration(
  volunteerId: number,
  referralSource?: string
): void {
  businessMetrics.trackVolunteerRegistration(volunteerId, referralSource);
}

/**
 * Track application submitted
 */
export function trackApplicationSubmitted(
  applicationId: number,
  volunteerId: number,
  opportunityId: number
): void {
  businessMetrics.trackApplicationSubmitted(applicationId, volunteerId, opportunityId);
}

/**
 * Track application outcome
 */
export function trackApplicationOutcome(
  applicationId: number,
  outcome: 'accepted' | 'rejected'
): void {
  businessMetrics.trackApplicationOutcome(applicationId, outcome);
}

export default {
  requestMetricsMiddleware,
  securityDetectionMiddleware,
  trackLoginAttempt,
  trackHoursLogged,
  trackTaskCompleted,
  trackOrganizationCreated,
  trackVolunteerRegistration,
  trackApplicationSubmitted,
  trackApplicationOutcome,
};
