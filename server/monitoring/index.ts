/**
 * Monitoring Module
 *
 * Comprehensive monitoring for Synerxus platform including:
 * - Application metrics (request rate, response time, errors)
 * - Business metrics (volunteers, hours, organizations, SDG goals)
 * - Security metrics (failed logins, API abuse, anomaly detection)
 * - Alerting rules engine with configurable thresholds
 * - Prometheus-compatible metrics endpoint
 */

// Core services
export { metricsCollector, type MetricsSummary, type RequestMetric, type DatabaseMetric, type CacheMetric } from './metrics-collector';
export { businessMetrics, type BusinessMetricsSummary, type BusinessEventType } from './business-metrics';
export { securityMetrics, type SecurityMetricsSummary, type SecurityEvent, type SecurityEventType } from './security-metrics';
export { alertingEngine, type Alert, type AlertRule, type AlertSeverity } from './alerting';

// Middleware
export {
  requestMetricsMiddleware,
  securityDetectionMiddleware,
  trackLoginAttempt,
  trackHoursLogged,
  trackTaskCompleted,
  trackOrganizationCreated,
  trackVolunteerRegistration,
  trackApplicationSubmitted,
  trackApplicationOutcome,
} from './middleware';

// Prometheus endpoint
export { prometheusRouter } from './prometheus-exporter';

// =============================================================================
// INITIALIZATION
// =============================================================================

import { metricsCollector } from './metrics-collector';
import { businessMetrics } from './business-metrics';
import { securityMetrics } from './security-metrics';
import { alertingEngine } from './alerting';
import { logger } from '../logger';

/**
 * Initialize the monitoring system
 */
export function initializeMonitoring(): void {
  logger.info('Initializing monitoring system...');

  // Start the alerting engine
  alertingEngine.start();

  // Set up event handlers for important events
  alertingEngine.on('alert_fired', (alert) => {
    logger.warn(`[ALERT FIRED] ${alert.name}: ${alert.message}`);
  });

  alertingEngine.on('alert_resolved', (alert) => {
    logger.info(`[ALERT RESOLVED] ${alert.name}`);
  });

  securityMetrics.on('anomaly_detected', ({ rule, anomaly }) => {
    logger.warn(`[SECURITY ANOMALY] ${rule}: ${JSON.stringify(anomaly.details)}`);
  });

  securityMetrics.on('ip_blocked', ({ ip, reason }) => {
    logger.warn(`[IP BLOCKED] ${ip}: ${reason}`);
  });

  logger.info('Monitoring system initialized');
}

/**
 * Shutdown the monitoring system
 */
export function shutdownMonitoring(): void {
  logger.info('Shutting down monitoring system...');

  alertingEngine.stop();
  metricsCollector.stop();
  businessMetrics.stop();
  securityMetrics.stop();

  logger.info('Monitoring system shutdown complete');
}

/**
 * Get monitoring health status
 */
export function getMonitoringHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, boolean>;
} {
  return {
    status: 'healthy',
    components: {
      metricsCollector: true,
      businessMetrics: true,
      securityMetrics: true,
      alertingEngine: true,
    },
  };
}
