/**
 * Security Metrics and Anomaly Detection
 *
 * Tracks security-related metrics:
 * - Failed login attempts
 * - API abuse attempts
 * - Unusual traffic patterns
 * - Authentication errors
 * - Authorization failures
 *
 * Includes anomaly detection for suspicious activity
 */

import { EventEmitter } from 'events';
import { logger } from '../logger';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  ip: string;
  userId?: number;
  path?: string;
  method?: string;
  userAgent?: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type SecurityEventType =
  | 'failed_login'
  | 'successful_login'
  | 'rate_limit_exceeded'
  | 'authentication_error'
  | 'authorization_failure'
  | 'invalid_token'
  | 'suspicious_request'
  | 'sql_injection_attempt'
  | 'xss_attempt'
  | 'csrf_failure'
  | 'brute_force_detected'
  | 'account_lockout'
  | 'password_reset_request'
  | 'unusual_activity';

export interface IPStats {
  ip: string;
  requestCount: number;
  failedLogins: number;
  rateLimitHits: number;
  authErrors: number;
  authzFailures: number;
  lastSeen: number;
  suspicious: boolean;
  blocked: boolean;
}

export interface SecurityMetricsSummary {
  timestamp: string;
  period: string;
  failedLogins: {
    total: number;
    byIP: Record<string, number>;
    byUser: Record<string, number>;
    perMinute: number;
  };
  apiAbuse: {
    rateLimitExceeded: number;
    suspiciousRequests: number;
    blockedIPs: number;
  };
  authentication: {
    errors: number;
    invalidTokens: number;
    successfulLogins: number;
    failureRate: number;
  };
  authorization: {
    failures: number;
    byPath: Record<string, number>;
  };
  anomalies: {
    detected: number;
    byType: Record<string, number>;
    activeThreats: SecurityEvent[];
  };
  topThreatIPs: IPStats[];
}

export interface AnomalyRule {
  name: string;
  condition: (events: SecurityEvent[], ipStats: Map<string, IPStats>) => SecurityEvent[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const METRICS_WINDOW_MS = 60000; // 1 minute window
const IP_TRACKING_WINDOW_MS = 3600000; // 1 hour tracking per IP
const FAILED_LOGIN_THRESHOLD = 10; // Per minute per IP
const RATE_LIMIT_THRESHOLD = 5; // Rate limit hits to be suspicious
const AUTH_ERROR_THRESHOLD = 20; // Auth errors to be suspicious
const CLEANUP_INTERVAL_MS = 60000; // Cleanup every minute

// =============================================================================
// SECURITY METRICS SERVICE
// =============================================================================

class SecurityMetricsService extends EventEmitter {
  private events: SecurityEvent[] = [];
  private ipStats: Map<string, IPStats> = new Map();
  private blockedIPs: Set<string> = new Set();
  private anomalyRules: AnomalyRule[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.registerDefaultAnomalyRules();
    this.startCleanup();
  }

  // ===========================================================================
  // EVENT TRACKING
  // ===========================================================================

  /**
   * Record a security event
   */
  recordEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.push(fullEvent);
    this.updateIPStats(fullEvent);
    this.emit('security_event', fullEvent);

    // Log high severity events
    if (fullEvent.severity === 'high' || fullEvent.severity === 'critical') {
      logger.warn('Security event', {
        type: fullEvent.type,
        severity: fullEvent.severity,
        ip: fullEvent.ip,
        userId: fullEvent.userId,
        details: fullEvent.details,
      });
    }

    // Check for anomalies
    this.checkAnomalies();
  }

  /**
   * Record failed login attempt
   */
  recordFailedLogin(ip: string, userId?: number, reason?: string): void {
    this.recordEvent({
      type: 'failed_login',
      ip,
      userId,
      details: { reason },
      severity: 'medium',
    });
  }

  /**
   * Record successful login
   */
  recordSuccessfulLogin(ip: string, userId: number): void {
    this.recordEvent({
      type: 'successful_login',
      ip,
      userId,
      severity: 'low',
    });
  }

  /**
   * Record rate limit exceeded
   */
  recordRateLimitExceeded(ip: string, path: string, userId?: number): void {
    this.recordEvent({
      type: 'rate_limit_exceeded',
      ip,
      userId,
      path,
      severity: 'medium',
    });
  }

  /**
   * Record authentication error
   */
  recordAuthenticationError(ip: string, reason: string, path?: string): void {
    this.recordEvent({
      type: 'authentication_error',
      ip,
      path,
      details: { reason },
      severity: 'medium',
    });
  }

  /**
   * Record authorization failure
   */
  recordAuthorizationFailure(ip: string, userId: number, path: string, method: string): void {
    this.recordEvent({
      type: 'authorization_failure',
      ip,
      userId,
      path,
      method,
      severity: 'high',
    });
  }

  /**
   * Record invalid token
   */
  recordInvalidToken(ip: string, tokenType: string): void {
    this.recordEvent({
      type: 'invalid_token',
      ip,
      details: { tokenType },
      severity: 'medium',
    });
  }

  /**
   * Record suspicious request (potential attack)
   */
  recordSuspiciousRequest(
    ip: string,
    attackType: 'sql_injection' | 'xss' | 'path_traversal' | 'other',
    path: string,
    payload?: string
  ): void {
    const type: SecurityEventType = attackType === 'sql_injection'
      ? 'sql_injection_attempt'
      : attackType === 'xss'
        ? 'xss_attempt'
        : 'suspicious_request';

    this.recordEvent({
      type,
      ip,
      path,
      details: { attackType, payload: payload?.substring(0, 100) },
      severity: 'high',
    });
  }

  /**
   * Record CSRF failure
   */
  recordCSRFFailure(ip: string, path: string): void {
    this.recordEvent({
      type: 'csrf_failure',
      ip,
      path,
      severity: 'high',
    });
  }

  // ===========================================================================
  // IP TRACKING
  // ===========================================================================

  /**
   * Update IP statistics
   */
  private updateIPStats(event: SecurityEvent): void {
    let stats = this.ipStats.get(event.ip);

    if (!stats) {
      stats = {
        ip: event.ip,
        requestCount: 0,
        failedLogins: 0,
        rateLimitHits: 0,
        authErrors: 0,
        authzFailures: 0,
        lastSeen: event.timestamp,
        suspicious: false,
        blocked: this.blockedIPs.has(event.ip),
      };
      this.ipStats.set(event.ip, stats);
    }

    stats.requestCount++;
    stats.lastSeen = event.timestamp;

    switch (event.type) {
      case 'failed_login':
        stats.failedLogins++;
        break;
      case 'rate_limit_exceeded':
        stats.rateLimitHits++;
        break;
      case 'authentication_error':
      case 'invalid_token':
        stats.authErrors++;
        break;
      case 'authorization_failure':
        stats.authzFailures++;
        break;
    }

    // Check if IP should be marked suspicious
    stats.suspicious = this.isIPSuspicious(stats);

    // Auto-block severely suspicious IPs
    if (this.shouldBlockIP(stats)) {
      this.blockIP(event.ip, 'Automated block due to suspicious activity');
    }
  }

  /**
   * Check if an IP is suspicious
   */
  private isIPSuspicious(stats: IPStats): boolean {
    return (
      stats.failedLogins >= FAILED_LOGIN_THRESHOLD ||
      stats.rateLimitHits >= RATE_LIMIT_THRESHOLD ||
      stats.authErrors >= AUTH_ERROR_THRESHOLD
    );
  }

  /**
   * Check if an IP should be auto-blocked
   */
  private shouldBlockIP(stats: IPStats): boolean {
    return (
      stats.failedLogins >= FAILED_LOGIN_THRESHOLD * 3 ||
      stats.rateLimitHits >= RATE_LIMIT_THRESHOLD * 5
    );
  }

  /**
   * Block an IP address
   */
  blockIP(ip: string, reason: string): void {
    this.blockedIPs.add(ip);

    const stats = this.ipStats.get(ip);
    if (stats) {
      stats.blocked = true;
    }

    this.emit('ip_blocked', { ip, reason, timestamp: Date.now() });
    logger.warn(`IP blocked: ${ip} - Reason: ${reason}`);
  }

  /**
   * Unblock an IP address
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);

    const stats = this.ipStats.get(ip);
    if (stats) {
      stats.blocked = false;
    }

    this.emit('ip_unblocked', { ip, timestamp: Date.now() });
    logger.info(`IP unblocked: ${ip}`);
  }

  /**
   * Check if an IP is blocked
   */
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  /**
   * Get IP statistics
   */
  getIPStats(ip: string): IPStats | undefined {
    return this.ipStats.get(ip);
  }

  // ===========================================================================
  // ANOMALY DETECTION
  // ===========================================================================

  /**
   * Register a custom anomaly detection rule
   */
  registerAnomalyRule(rule: AnomalyRule): void {
    this.anomalyRules.push(rule);
  }

  /**
   * Register default anomaly detection rules
   */
  private registerDefaultAnomalyRules(): void {
    // Brute force detection
    this.anomalyRules.push({
      name: 'brute_force_detection',
      severity: 'critical',
      condition: (events) => {
        const windowStart = Date.now() - METRICS_WINDOW_MS;
        const recentFailedLogins = events.filter(
          e => e.type === 'failed_login' && e.timestamp > windowStart
        );

        // Group by IP
        const byIP: Record<string, SecurityEvent[]> = {};
        for (const event of recentFailedLogins) {
          if (!byIP[event.ip]) {
            byIP[event.ip] = [];
          }
          byIP[event.ip].push(event);
        }

        // Flag IPs with > threshold failed logins in window
        const anomalies: SecurityEvent[] = [];
        for (const [ip, ipEvents] of Object.entries(byIP)) {
          if (ipEvents.length >= FAILED_LOGIN_THRESHOLD) {
            anomalies.push({
              type: 'brute_force_detected',
              timestamp: Date.now(),
              ip,
              severity: 'critical',
              details: {
                failedAttempts: ipEvents.length,
                windowMinutes: METRICS_WINDOW_MS / 60000,
              },
            });
          }
        }

        return anomalies;
      },
    });

    // Distributed attack detection (multiple IPs, same target)
    this.anomalyRules.push({
      name: 'distributed_attack_detection',
      severity: 'critical',
      condition: (events) => {
        const windowStart = Date.now() - METRICS_WINDOW_MS * 5;
        const recentFailedLogins = events.filter(
          e => e.type === 'failed_login' && e.timestamp > windowStart && e.userId
        );

        // Group by user
        const byUser: Record<number, Set<string>> = {};
        for (const event of recentFailedLogins) {
          if (event.userId) {
            if (!byUser[event.userId]) {
              byUser[event.userId] = new Set();
            }
            byUser[event.userId].add(event.ip);
          }
        }

        // Flag users targeted from multiple IPs
        const anomalies: SecurityEvent[] = [];
        for (const [userId, ips] of Object.entries(byUser)) {
          if (ips.size >= 5) {
            anomalies.push({
              type: 'unusual_activity',
              timestamp: Date.now(),
              ip: 'multiple',
              userId: Number(userId),
              severity: 'critical',
              details: {
                description: 'Distributed attack detected',
                uniqueIPs: ips.size,
                ips: Array.from(ips).slice(0, 10),
              },
            });
          }
        }

        return anomalies;
      },
    });

    // Unusual traffic pattern detection
    this.anomalyRules.push({
      name: 'traffic_spike_detection',
      severity: 'high',
      condition: (events) => {
        const windowStart = Date.now() - METRICS_WINDOW_MS;
        const previousWindowStart = windowStart - METRICS_WINDOW_MS;

        const currentWindow = events.filter(e => e.timestamp > windowStart);
        const previousWindow = events.filter(
          e => e.timestamp > previousWindowStart && e.timestamp <= windowStart
        );

        // Spike detection: current > 3x previous
        if (previousWindow.length > 10 && currentWindow.length > previousWindow.length * 3) {
          return [{
            type: 'unusual_activity',
            timestamp: Date.now(),
            ip: 'system',
            severity: 'high',
            details: {
              description: 'Traffic spike detected',
              currentCount: currentWindow.length,
              previousCount: previousWindow.length,
              ratio: (currentWindow.length / previousWindow.length).toFixed(2),
            },
          }];
        }

        return [];
      },
    });

    // Authorization failure pattern detection
    this.anomalyRules.push({
      name: 'authz_failure_pattern',
      severity: 'high',
      condition: (events) => {
        const windowStart = Date.now() - METRICS_WINDOW_MS * 5;
        const authzFailures = events.filter(
          e => e.type === 'authorization_failure' && e.timestamp > windowStart
        );

        // Group by user
        const byUser: Record<number, SecurityEvent[]> = {};
        for (const event of authzFailures) {
          if (event.userId) {
            if (!byUser[event.userId]) {
              byUser[event.userId] = [];
            }
            byUser[event.userId].push(event);
          }
        }

        // Flag users with many authorization failures (possible privilege escalation attempt)
        const anomalies: SecurityEvent[] = [];
        for (const [userId, userEvents] of Object.entries(byUser)) {
          if (userEvents.length >= 5) {
            anomalies.push({
              type: 'unusual_activity',
              timestamp: Date.now(),
              ip: userEvents[0].ip,
              userId: Number(userId),
              severity: 'high',
              details: {
                description: 'Possible privilege escalation attempt',
                failureCount: userEvents.length,
                paths: Array.from(new Set(userEvents.map(e => e.path).filter((p): p is string => p !== undefined))).slice(0, 5),
              },
            });
          }
        }

        return anomalies;
      },
    });
  }

  /**
   * Check all anomaly rules
   */
  private checkAnomalies(): void {
    for (const rule of this.anomalyRules) {
      try {
        const anomalies = rule.condition(this.events, this.ipStats);

        for (const anomaly of anomalies) {
          // Prevent duplicate anomaly events
          const recentSimilar = this.events.find(
            e =>
              e.type === anomaly.type &&
              e.ip === anomaly.ip &&
              e.userId === anomaly.userId &&
              Date.now() - e.timestamp < METRICS_WINDOW_MS
          );

          if (!recentSimilar) {
            this.events.push(anomaly);
            this.emit('anomaly_detected', { rule: rule.name, anomaly });

            logger.warn('Anomaly detected', {
              rule: rule.name,
              severity: anomaly.severity,
              details: anomaly.details,
            });
          }
        }
      } catch (error) {
        logger.error(`Anomaly rule ${rule.name} failed:`, error);
      }
    }
  }

  // ===========================================================================
  // METRICS SUMMARY
  // ===========================================================================

  /**
   * Get security metrics summary
   */
  getMetrics(): SecurityMetricsSummary {
    const windowStart = Date.now() - METRICS_WINDOW_MS;
    const recentEvents = this.events.filter(e => e.timestamp > windowStart);

    // Failed logins
    const failedLogins = recentEvents.filter(e => e.type === 'failed_login');
    const failedLoginsByIP: Record<string, number> = {};
    const failedLoginsByUser: Record<string, number> = {};

    for (const event of failedLogins) {
      failedLoginsByIP[event.ip] = (failedLoginsByIP[event.ip] || 0) + 1;
      if (event.userId) {
        failedLoginsByUser[event.userId] = (failedLoginsByUser[event.userId] || 0) + 1;
      }
    }

    // Authentication metrics
    const successfulLogins = recentEvents.filter(e => e.type === 'successful_login').length;
    const authErrors = recentEvents.filter(
      e => e.type === 'authentication_error' || e.type === 'invalid_token'
    ).length;
    const totalAuthAttempts = failedLogins.length + successfulLogins;

    // Authorization failures
    const authzFailures = recentEvents.filter(e => e.type === 'authorization_failure');
    const authzByPath: Record<string, number> = {};
    for (const event of authzFailures) {
      if (event.path) {
        authzByPath[event.path] = (authzByPath[event.path] || 0) + 1;
      }
    }

    // Anomalies
    const anomalies = recentEvents.filter(
      e => e.type === 'brute_force_detected' || e.type === 'unusual_activity'
    );
    const anomalyByType: Record<string, number> = {};
    for (const anomaly of anomalies) {
      anomalyByType[anomaly.type] = (anomalyByType[anomaly.type] || 0) + 1;
    }

    // Top threat IPs
    const threatIPs = Array.from(this.ipStats.values())
      .filter(stats => stats.suspicious || stats.blocked)
      .sort((a, b) => (b.failedLogins + b.authErrors) - (a.failedLogins + a.authErrors))
      .slice(0, 10);

    return {
      timestamp: new Date().toISOString(),
      period: `last_${METRICS_WINDOW_MS / 1000}_seconds`,
      failedLogins: {
        total: failedLogins.length,
        byIP: failedLoginsByIP,
        byUser: failedLoginsByUser,
        perMinute: failedLogins.length / (METRICS_WINDOW_MS / 60000),
      },
      apiAbuse: {
        rateLimitExceeded: recentEvents.filter(e => e.type === 'rate_limit_exceeded').length,
        suspiciousRequests: recentEvents.filter(
          e => e.type === 'suspicious_request' ||
               e.type === 'sql_injection_attempt' ||
               e.type === 'xss_attempt'
        ).length,
        blockedIPs: this.blockedIPs.size,
      },
      authentication: {
        errors: authErrors,
        invalidTokens: recentEvents.filter(e => e.type === 'invalid_token').length,
        successfulLogins,
        failureRate: totalAuthAttempts > 0
          ? Math.round((failedLogins.length / totalAuthAttempts) * 100)
          : 0,
      },
      authorization: {
        failures: authzFailures.length,
        byPath: authzByPath,
      },
      anomalies: {
        detected: anomalies.length,
        byType: anomalyByType,
        activeThreats: anomalies.slice(0, 5),
      },
      topThreatIPs: threatIPs,
    };
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up old data
   */
  private cleanup(): void {
    const eventCutoff = Date.now() - METRICS_WINDOW_MS * 60; // Keep 1 hour of events
    const ipCutoff = Date.now() - IP_TRACKING_WINDOW_MS;

    this.events = this.events.filter(e => e.timestamp > eventCutoff);

    // Clean up old IP stats
    const entries = Array.from(this.ipStats.entries());
    for (const [ip, stats] of entries) {
      if (stats.lastSeen < ipCutoff && !stats.blocked) {
        this.ipStats.delete(ip);
      }
    }
  }

  /**
   * Stop the service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get list of blocked IPs
   */
  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const securityMetrics = new SecurityMetricsService();

export default securityMetrics;
