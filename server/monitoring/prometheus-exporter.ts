/**
 * Prometheus Metrics Exporter
 *
 * Exports all metrics in Prometheus format for scraping.
 * Compatible with Prometheus, Grafana, and other monitoring systems.
 */

import { Router, Request, Response } from 'express';
import { metricsCollector } from './metrics-collector';
import { businessMetrics } from './business-metrics';
import { securityMetrics } from './security-metrics';
import { alertingEngine } from './alerting';
import { checkPoolHealth } from '../db';
import { cache } from '../cache';
import { redisCache } from '../redis-cache';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface PrometheusMetric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels?: Record<string, string>;
  value: number;
  timestamp?: number;
}

// =============================================================================
// PROMETHEUS FORMAT HELPERS
// =============================================================================

/**
 * Format a metric value for Prometheus
 */
function formatValue(value: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return '0';
  }
  return value.toString();
}

/**
 * Format labels for Prometheus
 */
function formatLabels(labels?: Record<string, string>): string {
  if (!labels || Object.keys(labels).length === 0) {
    return '';
  }

  const parts = Object.entries(labels)
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(',');

  return `{${parts}}`;
}

/**
 * Escape label value for Prometheus
 */
function escapeLabel(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/**
 * Format a single metric line
 */
function formatMetricLine(
  name: string,
  value: number,
  labels?: Record<string, string>,
  timestamp?: number
): string {
  const labelStr = formatLabels(labels);
  const timestampStr = timestamp ? ` ${timestamp}` : '';
  return `${name}${labelStr} ${formatValue(value)}${timestampStr}`;
}

/**
 * Format metric with HELP and TYPE
 */
function formatMetricBlock(metric: PrometheusMetric): string[] {
  const lines: string[] = [];
  lines.push(`# HELP ${metric.name} ${metric.help}`);
  lines.push(`# TYPE ${metric.name} ${metric.type}`);
  lines.push(formatMetricLine(metric.name, metric.value, metric.labels, metric.timestamp));
  return lines;
}

// =============================================================================
// METRICS GENERATION
// =============================================================================

/**
 * Generate all Prometheus metrics
 */
async function generatePrometheusMetrics(): Promise<string> {
  const lines: string[] = [];
  const timestamp = Date.now();

  // Gather all metrics with error handling
  const appMetrics = metricsCollector.getSummary();
  const secMetrics = securityMetrics.getMetrics();
  const bizMetrics = await businessMetrics.getMetrics();

  // Database health with fallback
  let dbHealth = {
    healthy: false,
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  };
  try {
    dbHealth = await checkPoolHealth();
  } catch {
    // Database unavailable
  }

  const memoryCacheStats = cache.getStats();
  const redisCacheStats = redisCache.getStats();
  const alertSummary = alertingEngine.getSummary();

  // ==========================================================================
  // APPLICATION METRICS
  // ==========================================================================

  // Request rate
  lines.push(...formatMetricBlock({
    name: 'synerxus_http_requests_total',
    help: 'Total number of HTTP requests',
    type: 'counter',
    value: appMetrics.requests.total,
  }));

  // Request rate per second
  lines.push(...formatMetricBlock({
    name: 'synerxus_http_requests_per_second',
    help: 'HTTP requests per second',
    type: 'gauge',
    value: appMetrics.requests.rate,
  }));

  // Requests by method
  lines.push(`# HELP synerxus_http_requests_by_method HTTP requests by method`);
  lines.push(`# TYPE synerxus_http_requests_by_method counter`);
  for (const [method, count] of Object.entries(appMetrics.requests.byMethod)) {
    lines.push(formatMetricLine('synerxus_http_requests_by_method', count, { method }));
  }

  // Requests by status code
  lines.push(`# HELP synerxus_http_requests_by_status HTTP requests by status code category`);
  lines.push(`# TYPE synerxus_http_requests_by_status counter`);
  for (const [status, count] of Object.entries(appMetrics.requests.byStatus)) {
    lines.push(formatMetricLine('synerxus_http_requests_by_status', count, { status }));
  }

  // Error rate
  lines.push(...formatMetricBlock({
    name: 'synerxus_http_error_rate_percent',
    help: 'HTTP error rate percentage',
    type: 'gauge',
    value: appMetrics.requests.errorRate,
  }));

  // Response time percentiles
  lines.push(...formatMetricBlock({
    name: 'synerxus_http_response_time_p50_ms',
    help: 'HTTP response time 50th percentile in milliseconds',
    type: 'gauge',
    value: appMetrics.requests.responseTime.p50,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_http_response_time_p95_ms',
    help: 'HTTP response time 95th percentile in milliseconds',
    type: 'gauge',
    value: appMetrics.requests.responseTime.p95,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_http_response_time_p99_ms',
    help: 'HTTP response time 99th percentile in milliseconds',
    type: 'gauge',
    value: appMetrics.requests.responseTime.p99,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_http_response_time_avg_ms',
    help: 'HTTP response time average in milliseconds',
    type: 'gauge',
    value: appMetrics.requests.responseTime.avg,
  }));

  // Active users
  lines.push(...formatMetricBlock({
    name: 'synerxus_active_users',
    help: 'Number of active users in the last 5 minutes',
    type: 'gauge',
    value: appMetrics.activeUsers.count,
  }));

  // ==========================================================================
  // DATABASE METRICS
  // ==========================================================================

  // Database health
  lines.push(...formatMetricBlock({
    name: 'synerxus_db_healthy',
    help: 'Database connection health (1 = healthy, 0 = unhealthy)',
    type: 'gauge',
    value: dbHealth.healthy ? 1 : 0,
  }));

  // Database connections
  lines.push(...formatMetricBlock({
    name: 'synerxus_db_connections_total',
    help: 'Total database connections',
    type: 'gauge',
    value: dbHealth.totalCount,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_db_connections_idle',
    help: 'Idle database connections',
    type: 'gauge',
    value: dbHealth.idleCount,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_db_connections_waiting',
    help: 'Waiting database connections',
    type: 'gauge',
    value: dbHealth.waitingCount,
  }));

  // Database query metrics
  lines.push(...formatMetricBlock({
    name: 'synerxus_db_queries_total',
    help: 'Total database queries',
    type: 'counter',
    value: appMetrics.database.totalQueries,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_db_queries_per_second',
    help: 'Database queries per second',
    type: 'gauge',
    value: appMetrics.database.queryRate,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_db_error_rate_percent',
    help: 'Database query error rate percentage',
    type: 'gauge',
    value: appMetrics.database.errorRate,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_db_query_time_p95_ms',
    help: 'Database query time 95th percentile in milliseconds',
    type: 'gauge',
    value: appMetrics.database.responseTime.p95,
  }));

  // ==========================================================================
  // CACHE METRICS
  // ==========================================================================

  // Memory cache
  lines.push(...formatMetricBlock({
    name: 'synerxus_memory_cache_size',
    help: 'Number of items in memory cache',
    type: 'gauge',
    value: memoryCacheStats.size,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_memory_cache_hit_rate_percent',
    help: 'Memory cache hit rate percentage',
    type: 'gauge',
    value: typeof memoryCacheStats.hitRate === 'string' ? parseFloat(memoryCacheStats.hitRate) || 0 : memoryCacheStats.hitRate,
  }));

  // Redis cache
  lines.push(...formatMetricBlock({
    name: 'synerxus_redis_connected',
    help: 'Redis connection status (1 = connected, 0 = disconnected)',
    type: 'gauge',
    value: redisCacheStats.connected ? 1 : 0,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_redis_hit_rate_percent',
    help: 'Redis cache hit rate percentage',
    type: 'gauge',
    value: typeof redisCacheStats.hitRate === 'string' ? parseFloat(redisCacheStats.hitRate) || 0 : redisCacheStats.hitRate,
  }));

  // Combined cache metrics from collector
  lines.push(...formatMetricBlock({
    name: 'synerxus_cache_hits_total',
    help: 'Total cache hits',
    type: 'counter',
    value: appMetrics.cache.hits,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_cache_misses_total',
    help: 'Total cache misses',
    type: 'counter',
    value: appMetrics.cache.misses,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_cache_hit_rate_percent',
    help: 'Overall cache hit rate percentage',
    type: 'gauge',
    value: appMetrics.cache.hitRate,
  }));

  // ==========================================================================
  // SYSTEM METRICS
  // ==========================================================================

  lines.push(...formatMetricBlock({
    name: 'synerxus_cpu_usage_percent',
    help: 'CPU usage percentage',
    type: 'gauge',
    value: appMetrics.system.cpuUsage,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_memory_usage_percent',
    help: 'Memory usage percentage',
    type: 'gauge',
    value: appMetrics.system.memoryUsage,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_memory_used_mb',
    help: 'Memory used in megabytes',
    type: 'gauge',
    value: appMetrics.system.memoryUsedMB,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_heap_used_mb',
    help: 'Heap memory used in megabytes',
    type: 'gauge',
    value: appMetrics.system.heapUsedMB,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_uptime_seconds',
    help: 'Application uptime in seconds',
    type: 'counter',
    value: appMetrics.uptime,
  }));

  // Load average
  lines.push(`# HELP synerxus_load_average System load average`);
  lines.push(`# TYPE synerxus_load_average gauge`);
  lines.push(formatMetricLine('synerxus_load_average', appMetrics.system.loadAverage[0], { interval: '1m' }));
  lines.push(formatMetricLine('synerxus_load_average', appMetrics.system.loadAverage[1], { interval: '5m' }));
  lines.push(formatMetricLine('synerxus_load_average', appMetrics.system.loadAverage[2], { interval: '15m' }));

  // ==========================================================================
  // BUSINESS METRICS
  // ==========================================================================

  // Volunteers
  lines.push(...formatMetricBlock({
    name: 'synerxus_volunteers_total',
    help: 'Total number of volunteers',
    type: 'gauge',
    value: bizMetrics.volunteers.totalVolunteers,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_volunteers_active',
    help: 'Active volunteers in last 30 days',
    type: 'gauge',
    value: bizMetrics.volunteers.activeVolunteers,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_volunteers_new_this_month',
    help: 'New volunteers this month',
    type: 'gauge',
    value: bizMetrics.volunteers.newVolunteersThisMonth,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_volunteer_retention_rate_percent',
    help: 'Volunteer retention rate percentage',
    type: 'gauge',
    value: bizMetrics.volunteers.retentionRate,
  }));

  // Hours
  lines.push(...formatMetricBlock({
    name: 'synerxus_hours_logged_today',
    help: 'Volunteer hours logged today',
    type: 'gauge',
    value: bizMetrics.hours.today,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_hours_logged_this_week',
    help: 'Volunteer hours logged this week',
    type: 'gauge',
    value: bizMetrics.hours.thisWeek,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_hours_logged_this_month',
    help: 'Volunteer hours logged this month',
    type: 'gauge',
    value: bizMetrics.hours.thisMonth,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_hours_logged_all_time',
    help: 'Total volunteer hours logged all time',
    type: 'counter',
    value: bizMetrics.hours.allTime,
  }));

  // Organizations
  lines.push(...formatMetricBlock({
    name: 'synerxus_organizations_total',
    help: 'Total number of organizations',
    type: 'gauge',
    value: bizMetrics.organizations.totalOrganizations,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_organizations_active',
    help: 'Active organizations',
    type: 'gauge',
    value: bizMetrics.organizations.activeOrganizations,
  }));

  // SDG metrics
  lines.push(...formatMetricBlock({
    name: 'synerxus_sdg_goals_impacted',
    help: 'Number of SDG goals impacted',
    type: 'gauge',
    value: bizMetrics.sdg.goalsImpacted.length,
  }));

  // SDG hours per goal
  lines.push(`# HELP synerxus_sdg_hours_per_goal Hours logged per SDG goal`);
  lines.push(`# TYPE synerxus_sdg_hours_per_goal gauge`);
  for (const [goal, hours] of Object.entries(bizMetrics.sdg.hoursPerGoal)) {
    lines.push(formatMetricLine('synerxus_sdg_hours_per_goal', hours, { goal }));
  }

  // Engagement score
  lines.push(...formatMetricBlock({
    name: 'synerxus_engagement_score',
    help: 'Overall user engagement score (0-100)',
    type: 'gauge',
    value: bizMetrics.engagement.overallScore,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_task_completion_rate_percent',
    help: 'Task completion rate percentage',
    type: 'gauge',
    value: bizMetrics.engagement.taskCompletionRate,
  }));

  // ==========================================================================
  // SECURITY METRICS
  // ==========================================================================

  lines.push(...formatMetricBlock({
    name: 'synerxus_failed_logins_total',
    help: 'Total failed login attempts',
    type: 'counter',
    value: secMetrics.failedLogins.total,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_failed_logins_per_minute',
    help: 'Failed login attempts per minute',
    type: 'gauge',
    value: secMetrics.failedLogins.perMinute,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_rate_limit_exceeded_total',
    help: 'Total rate limit exceeded events',
    type: 'counter',
    value: secMetrics.apiAbuse.rateLimitExceeded,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_suspicious_requests_total',
    help: 'Total suspicious requests detected',
    type: 'counter',
    value: secMetrics.apiAbuse.suspiciousRequests,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_blocked_ips',
    help: 'Number of blocked IP addresses',
    type: 'gauge',
    value: secMetrics.apiAbuse.blockedIPs,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_auth_errors_total',
    help: 'Total authentication errors',
    type: 'counter',
    value: secMetrics.authentication.errors,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_auth_failure_rate_percent',
    help: 'Authentication failure rate percentage',
    type: 'gauge',
    value: secMetrics.authentication.failureRate,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_authz_failures_total',
    help: 'Total authorization failures',
    type: 'counter',
    value: secMetrics.authorization.failures,
  }));

  lines.push(...formatMetricBlock({
    name: 'synerxus_security_anomalies_detected',
    help: 'Number of security anomalies detected',
    type: 'gauge',
    value: secMetrics.anomalies.detected,
  }));

  // ==========================================================================
  // ALERTING METRICS
  // ==========================================================================

  lines.push(...formatMetricBlock({
    name: 'synerxus_alerts_active',
    help: 'Number of active alerts',
    type: 'gauge',
    value: alertSummary.active,
  }));

  lines.push(`# HELP synerxus_alerts_by_severity Active alerts by severity`);
  lines.push(`# TYPE synerxus_alerts_by_severity gauge`);
  for (const [severity, count] of Object.entries(alertSummary.bySeverity)) {
    lines.push(formatMetricLine('synerxus_alerts_by_severity', count, { severity }));
  }

  return lines.join('\n') + '\n';
}

// =============================================================================
// EXPRESS ROUTER
// =============================================================================

export const prometheusRouter = Router();

/**
 * GET /metrics - Prometheus metrics endpoint
 */
prometheusRouter.get('/', async (req: Request, res: Response) => {
  try {
    const metrics = await generatePrometheusMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error generating metrics');
  }
});

/**
 * GET /metrics/json - JSON format metrics (for debugging)
 */
prometheusRouter.get('/json', async (req: Request, res: Response) => {
  try {
    const appMetrics = metricsCollector.getSummary();
    const secMetrics = securityMetrics.getMetrics();
    const bizMetrics = await businessMetrics.getMetrics();

    // Database health with fallback
    let dbHealth = {
      healthy: false,
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    };
    try {
      dbHealth = await checkPoolHealth();
    } catch {
      // Database unavailable
    }

    const alertSummary = alertingEngine.getSummary();

    res.json({
      timestamp: new Date().toISOString(),
      application: appMetrics,
      security: secMetrics,
      business: bizMetrics,
      database: dbHealth,
      alerts: alertSummary,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generating metrics' });
  }
});

export default prometheusRouter;
