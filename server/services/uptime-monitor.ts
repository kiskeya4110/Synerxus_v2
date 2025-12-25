/**
 * Uptime Monitoring Service
 *
 * Provides endpoints and utilities for external uptime monitoring services.
 * Compatible with: UptimeRobot, Pingdom, StatusCake, etc.
 *
 * Setup for UptimeRobot (Free):
 * 1. Create account at https://uptimerobot.com
 * 2. Add new monitor:
 *    - Monitor Type: HTTP(s)
 *    - URL: https://your-domain.com/api/ping
 *    - Monitoring Interval: 5 minutes
 * 3. Set up alert contacts (email, SMS, Slack, etc.)
 *
 * Endpoints:
 * - GET /api/ping - Simple health check (fast, no auth)
 * - GET /api/status - Detailed status page
 */

import { Router, Request, Response } from 'express';
import { getPoolStats } from '../db';
import { cache } from '../cache';
import { getMemorySummary } from '../memory-monitor';
import { isSystemHealthy, getCircuitBreakerStats } from '../circuit-breaker';
import { getQueueStats, isOverloaded } from '../request-queue';
import { logger } from '../logger';

const router = Router();

// Track uptime
const startTime = Date.now();
let lastPingTime = Date.now();
let pingCount = 0;

/**
 * Simple ping endpoint for uptime monitoring
 * - Fast response (no DB queries)
 * - Returns 200 if healthy, 503 if degraded
 * - Includes basic metrics in headers
 */
router.get('/ping', (req: Request, res: Response) => {
  pingCount++;
  lastPingTime = Date.now();

  const memoryUsage = process.memoryUsage();
  const healthy = isSystemHealthy() && !isOverloaded();

  // Set monitoring headers
  res.set({
    'X-Uptime-Seconds': Math.floor((Date.now() - startTime) / 1000).toString(),
    'X-Memory-MB': Math.round(memoryUsage.heapUsed / 1024 / 1024).toString(),
    'X-Ping-Count': pingCount.toString(),
    'X-Status': healthy ? 'healthy' : 'degraded',
  });

  if (!healthy) {
    return res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Detailed status endpoint for status pages
 * Returns comprehensive system health information
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const poolStats = getPoolStats();
    const memorySummary = getMemorySummary();
    const cacheStats = cache.getStats();
    const queueStats = getQueueStats();
    const circuitBreaker = getCircuitBreakerStats();

    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const healthy = isSystemHealthy() && !isOverloaded() && memorySummary.isHealthy;

    // Calculate component statuses
    const components = {
      server: {
        status: 'operational',
        uptime: formatUptime(uptimeSeconds),
        memory: `${memorySummary.current.heapUsedMB}MB / ${memorySummary.current.heapTotalMB}MB`,
      },
      database: {
        status: poolStats.health?.isHealthy ? 'operational' : 'degraded',
        connections: `${poolStats.totalCount}/${poolStats.maxConnections}`,
        waiting: poolStats.waitingCount,
      },
      cache: {
        status: 'operational',
        size: cacheStats.size,
        hitRate: cacheStats.hitRate,
      },
      queues: {
        status: isOverloaded() ? 'degraded' : 'operational',
        heavy: queueStats.heavy.pending,
        standard: queueStats.standard.pending,
        light: queueStats.light.pending,
      },
    };

    // Overall status
    const overallStatus = healthy ? 'operational' : 'degraded';

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptimeSeconds,
        formatted: formatUptime(uptimeSeconds),
        since: new Date(startTime).toISOString(),
      },
      monitoring: {
        lastPing: new Date(lastPingTime).toISOString(),
        pingCount,
      },
      components,
      metrics: {
        memory: memorySummary,
        database: poolStats,
        cache: cacheStats,
        circuitBreaker,
      },
    });
  } catch (error) {
    logger.error('[UptimeMonitor] Status check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve status',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Webhook endpoint for UptimeRobot alerts
 * Can be used to trigger internal notifications
 */
router.post('/webhook/uptime', (req: Request, res: Response) => {
  const { monitorFriendlyName, alertType, alertDetails } = req.body;

  logger.info('[UptimeMonitor] Webhook received:', {
    monitor: monitorFriendlyName,
    type: alertType,
    details: alertDetails,
  });

  // You can add custom logic here:
  // - Send to Slack
  // - Update internal status
  // - Trigger incident response

  res.json({ received: true });
});

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Get uptime statistics
 */
export function getUptimeStats() {
  return {
    startTime: new Date(startTime).toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    lastPingTime: new Date(lastPingTime).toISOString(),
    pingCount,
  };
}

export default router;
