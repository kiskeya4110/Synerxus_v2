/**
 * Alerting Rules Engine
 *
 * Monitors metrics and triggers alerts for:
 * - Error rate > 1%
 * - Response time p95 > 500ms
 * - CPU usage > 80%
 * - Memory usage > 85%
 * - Database connections > 80% pool
 * - Failed logins > 10/minute from same IP
 * - 0 requests for > 5 minutes (availability)
 */

import { EventEmitter } from 'events';
import { metricsCollector, MetricsSummary } from './metrics-collector';
import { securityMetrics, SecurityMetricsSummary } from './security-metrics';
import { businessMetrics } from './business-metrics';
import { logger } from '../logger';
import { checkPoolHealth } from '../db';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AlertStatus = 'firing' | 'resolved' | 'acknowledged';

export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  value: number | string;
  threshold: number | string;
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  name: string;
  description: string;
  severity: AlertSeverity;
  condition: (metrics: MetricsContext) => Promise<AlertConditionResult>;
  cooldownMs: number; // Minimum time between repeated alerts
  enabled: boolean;
}

export interface AlertConditionResult {
  triggered: boolean;
  value: number | string;
  threshold: number | string;
  message: string;
  metadata?: Record<string, any>;
}

export interface MetricsContext {
  application: MetricsSummary;
  security: SecurityMetricsSummary;
  database: {
    healthy: boolean;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
    maxConnections: number;
  };
}

export interface AlertNotificationChannel {
  name: string;
  send: (alert: Alert) => Promise<void>;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
const DEFAULT_COOLDOWN_MS = 300000; // 5 minutes default cooldown
const MAX_ALERTS_HISTORY = 1000;
const DB_MAX_CONNECTIONS = 20; // Default pool size

// =============================================================================
// ALERTING ENGINE
// =============================================================================

class AlertingEngine extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private notificationChannels: AlertNotificationChannel[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private lastRequestCount: number = 0;
  private lastRequestTime: number = Date.now();
  private noRequestsStartTime: number | null = null;

  constructor() {
    super();
    this.registerDefaultRules();
  }

  // ===========================================================================
  // RULE MANAGEMENT
  // ===========================================================================

  /**
   * Register an alert rule
   */
  registerRule(rule: AlertRule): void {
    this.rules.set(rule.name, rule);
    logger.info(`Alert rule registered: ${rule.name}`);
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(name: string, enabled: boolean): void {
    const rule = this.rules.get(name);
    if (rule) {
      rule.enabled = enabled;
      logger.info(`Alert rule ${name} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get all rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Register default alert rules
   */
  private registerDefaultRules(): void {
    // Error rate > 1%
    this.registerRule({
      name: 'high_error_rate',
      description: 'Error rate exceeds 1%',
      severity: 'error',
      cooldownMs: DEFAULT_COOLDOWN_MS,
      enabled: true,
      condition: async (ctx) => {
        const errorRate = ctx.application.requests.errorRate;
        return {
          triggered: errorRate > 1,
          value: errorRate.toFixed(2),
          threshold: '1',
          message: `Error rate is ${errorRate.toFixed(2)}% (threshold: 1%)`,
          metadata: { byStatus: ctx.application.requests.byStatus },
        };
      },
    });

    // Response time p95 > 500ms
    this.registerRule({
      name: 'slow_response_time',
      description: 'Response time P95 exceeds 500ms',
      severity: 'warning',
      cooldownMs: DEFAULT_COOLDOWN_MS,
      enabled: true,
      condition: async (ctx) => {
        const p95 = ctx.application.requests.responseTime.p95;
        return {
          triggered: p95 > 500,
          value: p95.toFixed(0),
          threshold: '500',
          message: `Response time P95 is ${p95.toFixed(0)}ms (threshold: 500ms)`,
          metadata: {
            p50: ctx.application.requests.responseTime.p50,
            p99: ctx.application.requests.responseTime.p99,
          },
        };
      },
    });

    // CPU usage > 80%
    this.registerRule({
      name: 'high_cpu_usage',
      description: 'CPU usage exceeds 80%',
      severity: 'warning',
      cooldownMs: DEFAULT_COOLDOWN_MS,
      enabled: true,
      condition: async (ctx) => {
        const cpuUsage = ctx.application.system.cpuUsage;
        return {
          triggered: cpuUsage > 80,
          value: cpuUsage.toFixed(1),
          threshold: '80',
          message: `CPU usage is ${cpuUsage.toFixed(1)}% (threshold: 80%)`,
          metadata: { loadAverage: ctx.application.system.loadAverage },
        };
      },
    });

    // Memory usage > 85%
    this.registerRule({
      name: 'high_memory_usage',
      description: 'Memory usage exceeds 85%',
      severity: 'error',
      cooldownMs: DEFAULT_COOLDOWN_MS,
      enabled: true,
      condition: async (ctx) => {
        const memoryUsage = ctx.application.system.memoryUsage;
        return {
          triggered: memoryUsage > 85,
          value: memoryUsage.toFixed(1),
          threshold: '85',
          message: `Memory usage is ${memoryUsage.toFixed(1)}% (threshold: 85%)`,
          metadata: {
            usedMB: ctx.application.system.memoryUsedMB,
            totalMB: ctx.application.system.memoryTotalMB,
            heapUsedMB: ctx.application.system.heapUsedMB,
          },
        };
      },
    });

    // Database connections > 80% pool
    this.registerRule({
      name: 'high_db_connections',
      description: 'Database connections exceed 80% of pool',
      severity: 'error',
      cooldownMs: DEFAULT_COOLDOWN_MS,
      enabled: true,
      condition: async (ctx) => {
        const usagePercent = (ctx.database.totalCount / ctx.database.maxConnections) * 100;
        return {
          triggered: usagePercent > 80,
          value: usagePercent.toFixed(1),
          threshold: '80',
          message: `Database pool usage is ${usagePercent.toFixed(1)}% (${ctx.database.totalCount}/${ctx.database.maxConnections})`,
          metadata: {
            total: ctx.database.totalCount,
            idle: ctx.database.idleCount,
            waiting: ctx.database.waitingCount,
          },
        };
      },
    });

    // Failed logins > 10/minute from same IP
    this.registerRule({
      name: 'brute_force_attempt',
      description: 'Failed logins exceed 10/minute from same IP',
      severity: 'critical',
      cooldownMs: 60000, // 1 minute cooldown
      enabled: true,
      condition: async (ctx) => {
        const failedLoginsByIP = ctx.security.failedLogins.byIP;
        const highestCount = Math.max(0, ...Object.values(failedLoginsByIP));
        const worstIP = Object.entries(failedLoginsByIP)
          .find(([_, count]) => count === highestCount)?.[0] || 'none';

        return {
          triggered: highestCount > 10,
          value: highestCount.toString(),
          threshold: '10',
          message: `IP ${worstIP} has ${highestCount} failed logins in the last minute`,
          metadata: { ip: worstIP, allIPs: failedLoginsByIP },
        };
      },
    });

    // 0 requests for > 5 minutes (availability)
    this.registerRule({
      name: 'no_requests_received',
      description: 'No requests received for more than 5 minutes',
      severity: 'critical',
      cooldownMs: 300000, // 5 minutes cooldown
      enabled: true,
      condition: async (ctx) => {
        const currentRequests = ctx.application.requests.total;
        const now = Date.now();

        // Track no-request periods
        if (currentRequests === 0 || currentRequests === this.lastRequestCount) {
          if (!this.noRequestsStartTime) {
            this.noRequestsStartTime = now;
          }
        } else {
          this.noRequestsStartTime = null;
          this.lastRequestCount = currentRequests;
        }

        const noRequestsDuration = this.noRequestsStartTime
          ? now - this.noRequestsStartTime
          : 0;
        const noRequestsMinutes = noRequestsDuration / 60000;

        return {
          triggered: noRequestsMinutes > 5,
          value: noRequestsMinutes.toFixed(1),
          threshold: '5',
          message: `No requests received for ${noRequestsMinutes.toFixed(1)} minutes`,
          metadata: { lastRequestCount: this.lastRequestCount },
        };
      },
    });

    // Database unhealthy
    this.registerRule({
      name: 'database_unhealthy',
      description: 'Database connection is unhealthy',
      severity: 'critical',
      cooldownMs: 60000,
      enabled: true,
      condition: async (ctx) => {
        return {
          triggered: !ctx.database.healthy,
          value: 'unhealthy',
          threshold: 'healthy',
          message: 'Database connection is unhealthy',
          metadata: ctx.database,
        };
      },
    });

    // Low cache hit rate
    this.registerRule({
      name: 'low_cache_hit_rate',
      description: 'Cache hit rate below 50%',
      severity: 'warning',
      cooldownMs: DEFAULT_COOLDOWN_MS,
      enabled: true,
      condition: async (ctx) => {
        const hitRate = ctx.application.cache.hitRate;
        const totalOps = ctx.application.cache.operations;

        // Only alert if there are enough operations to be meaningful
        return {
          triggered: totalOps > 100 && hitRate < 50,
          value: hitRate.toFixed(1),
          threshold: '50',
          message: `Cache hit rate is ${hitRate.toFixed(1)}% (threshold: 50%)`,
          metadata: {
            hits: ctx.application.cache.hits,
            misses: ctx.application.cache.misses,
          },
        };
      },
    });

    // Security anomaly detected
    this.registerRule({
      name: 'security_anomaly',
      description: 'Security anomaly detected',
      severity: 'critical',
      cooldownMs: 60000,
      enabled: true,
      condition: async (ctx) => {
        const anomalyCount = ctx.security.anomalies.detected;

        return {
          triggered: anomalyCount > 0,
          value: anomalyCount.toString(),
          threshold: '0',
          message: `${anomalyCount} security anomalies detected`,
          metadata: {
            byType: ctx.security.anomalies.byType,
            activeThreats: ctx.security.anomalies.activeThreats,
          },
        };
      },
    });

    // High database query error rate
    this.registerRule({
      name: 'high_db_error_rate',
      description: 'Database query error rate exceeds 5%',
      severity: 'error',
      cooldownMs: DEFAULT_COOLDOWN_MS,
      enabled: true,
      condition: async (ctx) => {
        const errorRate = ctx.application.database.errorRate;

        return {
          triggered: errorRate > 5,
          value: errorRate.toFixed(2),
          threshold: '5',
          message: `Database query error rate is ${errorRate.toFixed(2)}% (threshold: 5%)`,
          metadata: {
            totalQueries: ctx.application.database.totalQueries,
          },
        };
      },
    });
  }

  // ===========================================================================
  // NOTIFICATION CHANNELS
  // ===========================================================================

  /**
   * Register a notification channel
   */
  registerNotificationChannel(channel: AlertNotificationChannel): void {
    this.notificationChannels.push(channel);
    logger.info(`Notification channel registered: ${channel.name}`);
  }

  /**
   * Send alert to all notification channels
   */
  private async sendNotifications(alert: Alert): Promise<void> {
    for (const channel of this.notificationChannels) {
      try {
        await channel.send(alert);
      } catch (error) {
        logger.error(`Failed to send alert via ${channel.name}:`, error);
      }
    }
  }

  // ===========================================================================
  // ALERT MANAGEMENT
  // ===========================================================================

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && alert.status === 'firing') {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = acknowledgedBy;
      this.emit('alert_acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(ruleName: string): string {
    return `${ruleName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===========================================================================
  // CHECK ENGINE
  // ===========================================================================

  /**
   * Start the alerting engine
   */
  start(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => this.checkAllRules(), CHECK_INTERVAL_MS);
    logger.info('Alerting engine started');
    this.emit('started');

    // Run initial check
    this.checkAllRules();
  }

  /**
   * Stop the alerting engine
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Alerting engine stopped');
      this.emit('stopped');
    }
  }

  /**
   * Check all alert rules
   */
  private async checkAllRules(): Promise<void> {
    try {
      // Gather metrics context
      const context = await this.gatherMetricsContext();

      const entries = Array.from(this.rules.entries());
      for (const [name, rule] of entries) {
        if (!rule.enabled) continue;

        try {
          await this.checkRule(rule, context);
        } catch (error) {
          logger.error(`Alert rule ${name} check failed:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to gather metrics context:', error);
    }
  }

  /**
   * Gather all metrics for context
   */
  private async gatherMetricsContext(): Promise<MetricsContext> {
    // Get database health with error handling
    let dbHealth = {
      healthy: false,
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    };

    try {
      dbHealth = await checkPoolHealth();
    } catch (error) {
      // Database unavailable - return unhealthy status
      logger.debug('Database health check failed:', error);
    }

    return {
      application: metricsCollector.getSummary(),
      security: securityMetrics.getMetrics(),
      database: {
        ...dbHealth,
        maxConnections: DB_MAX_CONNECTIONS,
      },
    };
  }

  /**
   * Check a single rule
   */
  private async checkRule(rule: AlertRule, context: MetricsContext): Promise<void> {
    const result = await rule.condition(context);
    const existingAlert = this.activeAlerts.get(rule.name);
    const now = Date.now();

    if (result.triggered) {
      // Check cooldown
      const lastAlert = this.lastAlertTime.get(rule.name);
      if (lastAlert && now - lastAlert < rule.cooldownMs) {
        return; // Still in cooldown
      }

      if (!existingAlert || existingAlert.status === 'resolved') {
        // Create new alert
        const alert: Alert = {
          id: this.generateAlertId(rule.name),
          name: rule.name,
          severity: rule.severity,
          status: 'firing',
          message: result.message,
          value: result.value,
          threshold: result.threshold,
          triggeredAt: new Date(),
          metadata: result.metadata,
        };

        this.activeAlerts.set(rule.name, alert);
        this.alertHistory.push(alert);
        this.lastAlertTime.set(rule.name, now);

        // Trim history if needed
        if (this.alertHistory.length > MAX_ALERTS_HISTORY) {
          this.alertHistory = this.alertHistory.slice(-MAX_ALERTS_HISTORY);
        }

        this.emit('alert_fired', alert);
        await this.sendNotifications(alert);

        logger.warn(`Alert fired: ${rule.name}`, {
          severity: alert.severity,
          value: alert.value,
          threshold: alert.threshold,
        });
      }
    } else if (existingAlert && existingAlert.status !== 'resolved') {
      // Resolve alert
      existingAlert.status = 'resolved';
      existingAlert.resolvedAt = new Date();

      this.emit('alert_resolved', existingAlert);

      logger.info(`Alert resolved: ${rule.name}`);
    }
  }

  /**
   * Get alert summary
   */
  getSummary(): {
    active: number;
    bySeverity: Record<AlertSeverity, number>;
    recentAlerts: Alert[];
  } {
    const active = this.getActiveAlerts().filter(a => a.status === 'firing');
    const bySeverity: Record<AlertSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    for (const alert of active) {
      bySeverity[alert.severity]++;
    }

    return {
      active: active.length,
      bySeverity,
      recentAlerts: this.getAlertHistory(10),
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const alertingEngine = new AlertingEngine();

// =============================================================================
// DEFAULT NOTIFICATION CHANNELS
// =============================================================================

// Console/Logger notification channel
alertingEngine.registerNotificationChannel({
  name: 'logger',
  send: async (alert) => {
    const logMethod = alert.severity === 'critical' || alert.severity === 'error'
      ? logger.error.bind(logger)
      : logger.warn.bind(logger);

    logMethod(`[ALERT] ${alert.name}: ${alert.message}`, {
      alertId: alert.id,
      severity: alert.severity,
      value: alert.value,
      threshold: alert.threshold,
    });
  },
});

export default alertingEngine;
