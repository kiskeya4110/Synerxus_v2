/**
 * Application Metrics Collector
 *
 * Collects and exposes metrics for:
 * - Request rate (requests/second)
 * - Response time (p50, p95, p99)
 * - Error rate (4xx, 5xx)
 * - Active users (real-time)
 * - Database query performance
 * - Cache hit/miss ratio
 * - Memory usage
 * - CPU usage
 */

import { EventEmitter } from 'events';
import os from 'os';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
  userId?: number;
  ip?: string;
}

export interface DatabaseMetric {
  query: string;
  durationMs: number;
  timestamp: number;
  success: boolean;
  rowCount?: number;
}

export interface CacheMetric {
  operation: 'get' | 'set' | 'delete';
  key: string;
  hit: boolean;
  durationMs: number;
  timestamp: number;
}

export interface PercentileStats {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface MetricsSummary {
  timestamp: string;
  uptime: number;
  requests: {
    total: number;
    rate: number; // requests per second
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
    errorRate: number;
    responseTime: PercentileStats;
  };
  activeUsers: {
    count: number;
    userIds: number[];
  };
  database: {
    totalQueries: number;
    queryRate: number;
    errorRate: number;
    responseTime: PercentileStats;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    operations: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    memoryUsedMB: number;
    memoryTotalMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
    loadAverage: number[];
  };
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const METRICS_WINDOW_MS = 60000; // 1 minute window for rate calculations
const CLEANUP_INTERVAL_MS = 10000; // Clean old metrics every 10 seconds
const ACTIVE_USER_TIMEOUT_MS = 300000; // User considered active for 5 minutes

// =============================================================================
// METRICS COLLECTOR CLASS
// =============================================================================

class MetricsCollector extends EventEmitter {
  private requests: RequestMetric[] = [];
  private databaseMetrics: DatabaseMetric[] = [];
  private cacheMetrics: CacheMetric[] = [];
  private activeUsers: Map<number, number> = new Map(); // userId -> lastActiveTimestamp
  private startTime: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startTime = Date.now();
    this.startCleanup();
  }

  // ===========================================================================
  // REQUEST METRICS
  // ===========================================================================

  /**
   * Record a request metric
   */
  recordRequest(metric: RequestMetric): void {
    this.requests.push(metric);

    // Track active user
    if (metric.userId) {
      this.activeUsers.set(metric.userId, metric.timestamp);
    }

    // Emit for real-time monitoring
    this.emit('request', metric);

    // Emit error event for alerting
    if (metric.statusCode >= 400) {
      this.emit('error', metric);
    }
  }

  /**
   * Get request statistics for the current window
   */
  getRequestStats(): MetricsSummary['requests'] {
    const windowStart = Date.now() - METRICS_WINDOW_MS;
    const windowRequests = this.requests.filter(r => r.timestamp > windowStart);

    const byMethod: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const durations: number[] = [];

    let errorCount = 0;

    for (const req of windowRequests) {
      // By method
      byMethod[req.method] = (byMethod[req.method] || 0) + 1;

      // By status code category
      const statusCategory = `${Math.floor(req.statusCode / 100)}xx`;
      byStatus[statusCategory] = (byStatus[statusCategory] || 0) + 1;

      // Track errors
      if (req.statusCode >= 400) {
        errorCount++;
      }

      durations.push(req.durationMs);
    }

    return {
      total: windowRequests.length,
      rate: windowRequests.length / (METRICS_WINDOW_MS / 1000),
      byMethod,
      byStatus,
      errorRate: windowRequests.length > 0 ? (errorCount / windowRequests.length) * 100 : 0,
      responseTime: this.calculatePercentiles(durations),
    };
  }

  // ===========================================================================
  // DATABASE METRICS
  // ===========================================================================

  /**
   * Record a database query metric
   */
  recordDatabaseQuery(metric: DatabaseMetric): void {
    this.databaseMetrics.push(metric);
    this.emit('database', metric);

    if (!metric.success) {
      this.emit('database_error', metric);
    }
  }

  /**
   * Get database statistics for the current window
   */
  getDatabaseStats(): MetricsSummary['database'] {
    const windowStart = Date.now() - METRICS_WINDOW_MS;
    const windowQueries = this.databaseMetrics.filter(q => q.timestamp > windowStart);

    const durations: number[] = [];
    let errorCount = 0;

    for (const query of windowQueries) {
      durations.push(query.durationMs);
      if (!query.success) {
        errorCount++;
      }
    }

    return {
      totalQueries: windowQueries.length,
      queryRate: windowQueries.length / (METRICS_WINDOW_MS / 1000),
      errorRate: windowQueries.length > 0 ? (errorCount / windowQueries.length) * 100 : 0,
      responseTime: this.calculatePercentiles(durations),
    };
  }

  // ===========================================================================
  // CACHE METRICS
  // ===========================================================================

  /**
   * Record a cache operation metric
   */
  recordCacheOperation(metric: CacheMetric): void {
    this.cacheMetrics.push(metric);
    this.emit('cache', metric);
  }

  /**
   * Get cache statistics for the current window
   */
  getCacheStats(): MetricsSummary['cache'] {
    const windowStart = Date.now() - METRICS_WINDOW_MS;
    const windowOps = this.cacheMetrics.filter(c => c.timestamp > windowStart);

    let hits = 0;
    let misses = 0;

    for (const op of windowOps) {
      if (op.operation === 'get') {
        if (op.hit) {
          hits++;
        } else {
          misses++;
        }
      }
    }

    const totalGets = hits + misses;

    return {
      hits,
      misses,
      hitRate: totalGets > 0 ? (hits / totalGets) * 100 : 0,
      operations: windowOps.length,
    };
  }

  // ===========================================================================
  // ACTIVE USERS
  // ===========================================================================

  /**
   * Get active users count
   */
  getActiveUsers(): MetricsSummary['activeUsers'] {
    const cutoff = Date.now() - ACTIVE_USER_TIMEOUT_MS;
    const activeUserIds: number[] = [];

    for (const [userId, lastActive] of this.activeUsers.entries()) {
      if (lastActive > cutoff) {
        activeUserIds.push(userId);
      }
    }

    return {
      count: activeUserIds.length,
      userIds: activeUserIds,
    };
  }

  // ===========================================================================
  // SYSTEM METRICS
  // ===========================================================================

  /**
   * Get system resource usage
   */
  getSystemStats(): MetricsSummary['system'] {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Calculate CPU usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    const cpuUsage = ((totalTick - totalIdle) / totalTick) * 100;

    return {
      cpuUsage: Math.round(cpuUsage * 100) / 100,
      memoryUsage: Math.round((usedMemory / totalMemory) * 100 * 100) / 100,
      memoryUsedMB: Math.round(usedMemory / 1024 / 1024),
      memoryTotalMB: Math.round(totalMemory / 1024 / 1024),
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      loadAverage: os.loadavg(),
    };
  }

  // ===========================================================================
  // SUMMARY
  // ===========================================================================

  /**
   * Get complete metrics summary
   */
  getSummary(): MetricsSummary {
    return {
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000,
      requests: this.getRequestStats(),
      activeUsers: this.getActiveUsers(),
      database: this.getDatabaseStats(),
      cache: this.getCacheStats(),
      system: this.getSystemStats(),
    };
  }

  // ===========================================================================
  // HELPER FUNCTIONS
  // ===========================================================================

  /**
   * Calculate percentile statistics from an array of numbers
   */
  private calculatePercentiles(values: number[]): PercentileStats {
    if (values.length === 0) {
      return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0, count: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      avg: Math.round((sum / sorted.length) * 100) / 100,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: sorted.length,
    };
  }

  /**
   * Calculate specific percentile from sorted array
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return Math.round(sorted[Math.max(0, index)] * 100) / 100;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanup(): void {
    const cutoff = Date.now() - METRICS_WINDOW_MS * 2; // Keep 2x window for safety

    this.requests = this.requests.filter(r => r.timestamp > cutoff);
    this.databaseMetrics = this.databaseMetrics.filter(d => d.timestamp > cutoff);
    this.cacheMetrics = this.cacheMetrics.filter(c => c.timestamp > cutoff);

    // Clean up inactive users
    const userCutoff = Date.now() - ACTIVE_USER_TIMEOUT_MS;
    const entries = Array.from(this.activeUsers.entries());
    for (const [userId, lastActive] of entries) {
      if (lastActive < userCutoff) {
        this.activeUsers.delete(userId);
      }
    }
  }

  /**
   * Stop the metrics collector
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.requests = [];
    this.databaseMetrics = [];
    this.cacheMetrics = [];
    this.activeUsers.clear();
    this.startTime = Date.now();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const metricsCollector = new MetricsCollector();

export default metricsCollector;
