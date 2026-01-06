/**
 * Memory Monitor - Track and manage server memory usage
 *
 * Features:
 * - Periodic memory usage tracking
 * - Warning thresholds for high memory usage
 * - Automatic garbage collection hints when memory is high
 * - Memory stats for health endpoint
 */

import { logger } from './logger';

interface MemoryStats {
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  externalMB: number;
  arrayBuffersMB: number;
  heapUsedPercent: number;
  timestamp: number;
}

interface MemoryConfig {
  warningThresholdPercent: number;  // Warn when heap exceeds this % of total
  criticalThresholdPercent: number; // Critical when heap exceeds this %
  checkIntervalMs: number;          // How often to check memory
  historySize: number;              // Keep last N measurements
}

const DEFAULT_CONFIG: MemoryConfig = {
  warningThresholdPercent: 85,   // Higher threshold to reduce noise
  criticalThresholdPercent: 95,  // Higher threshold to reduce noise
  checkIntervalMs: 30000,  // Every 30 seconds (less frequent checks)
  historySize: 60,         // Keep last 60 measurements
};

// Minimum heap size (MB) before percentage-based checks apply
// Higher threshold to avoid noise on startup
const MIN_HEAP_SIZE_FOR_ALERTS_MB = 200;

// Callback for system health updates
let healthUpdateCallback: ((pressure: boolean) => void) | null = null;

/**
 * Register callback for health updates (circuit breaker integration)
 */
export function onMemoryPressureChange(callback: (pressure: boolean) => void): void {
  healthUpdateCallback = callback;
}

class MemoryMonitor {
  private config: MemoryConfig;
  private history: MemoryStats[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private lastWarningTime: number = 0;
  private warningCooldownMs: number = 60000; // Only warn once per minute

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start monitoring memory usage
   */
  start(): void {
    if (this.intervalId) {
      return; // Already running
    }

    logger.info('[MemoryMonitor] Starting memory monitoring', {
      checkIntervalMs: this.config.checkIntervalMs,
      warningThreshold: `${this.config.warningThresholdPercent}%`,
      criticalThreshold: `${this.config.criticalThresholdPercent}%`,
    });

    // Initial check
    this.checkMemory();

    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.checkMemory();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('[MemoryMonitor] Stopped memory monitoring');
    }
  }

  /**
   * Get current memory stats
   */
  getCurrentStats(): MemoryStats {
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);

    return {
      heapUsedMB,
      heapTotalMB,
      rssMB: Math.round(mem.rss / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024),
      arrayBuffersMB: Math.round(mem.arrayBuffers / 1024 / 1024),
      heapUsedPercent: Math.round((heapUsedMB / heapTotalMB) * 100),
      timestamp: Date.now(),
    };
  }

  /**
   * Get memory history
   */
  getHistory(): MemoryStats[] {
    return [...this.history];
  }

  /**
   * Check if memory is healthy
   * Only considers percentage-based thresholds when heap is large enough
   * Small heaps with high percentages are normal in Node.js
   */
  private isMemoryHealthy(stats: MemoryStats): boolean {
    // Only apply percentage-based checks when heap is large enough
    // Small heaps naturally run at high percentages
    if (stats.heapTotalMB < MIN_HEAP_SIZE_FOR_ALERTS_MB) {
      return true; // Small heap = healthy (it will grow as needed)
    }
    return stats.heapUsedPercent < this.config.criticalThresholdPercent;
  }

  /**
   * Get summary stats
   */
  getSummary(): {
    current: MemoryStats;
    average: { heapUsedMB: number; heapUsedPercent: number };
    peak: { heapUsedMB: number; timestamp: number };
    trend: 'stable' | 'increasing' | 'decreasing';
    isHealthy: boolean;
  } {
    const current = this.getCurrentStats();

    // Calculate averages
    const avgHeapUsed = this.history.length > 0
      ? this.history.reduce((sum, s) => sum + s.heapUsedMB, 0) / this.history.length
      : current.heapUsedMB;
    const avgHeapPercent = this.history.length > 0
      ? this.history.reduce((sum, s) => sum + s.heapUsedPercent, 0) / this.history.length
      : current.heapUsedPercent;

    // Find peak
    const peak = this.history.reduce(
      (max, s) => s.heapUsedMB > max.heapUsedMB ? s : max,
      { heapUsedMB: current.heapUsedMB, timestamp: current.timestamp }
    );

    // Calculate trend (compare recent vs older measurements)
    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (this.history.length >= 10) {
      const recentAvg = this.history.slice(-5).reduce((sum, s) => sum + s.heapUsedMB, 0) / 5;
      const olderAvg = this.history.slice(-10, -5).reduce((sum, s) => sum + s.heapUsedMB, 0) / 5;
      const diff = recentAvg - olderAvg;
      if (diff > 10) trend = 'increasing';
      else if (diff < -10) trend = 'decreasing';
    }

    return {
      current,
      average: {
        heapUsedMB: Math.round(avgHeapUsed),
        heapUsedPercent: Math.round(avgHeapPercent),
      },
      peak: {
        heapUsedMB: peak.heapUsedMB,
        timestamp: peak.timestamp,
      },
      trend,
      isHealthy: this.isMemoryHealthy(current),
    };
  }

  /**
   * Check memory and take action if needed
   */
  private checkMemory(): void {
    const stats = this.getCurrentStats();

    // Add to history
    this.history.push(stats);
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }

    // Skip percentage-based alerts for small heaps (normal in Node.js)
    if (stats.heapTotalMB < MIN_HEAP_SIZE_FOR_ALERTS_MB) {
      // Still notify circuit breaker that memory is fine
      if (healthUpdateCallback) {
        healthUpdateCallback(false);
      }
      return;
    }

    // Determine if under memory pressure
    const underPressure = stats.heapUsedPercent >= this.config.warningThresholdPercent;

    // Notify circuit breaker of memory pressure state
    if (healthUpdateCallback) {
      healthUpdateCallback(underPressure);
    }

    // Check thresholds
    const now = Date.now();
    if (stats.heapUsedPercent >= this.config.criticalThresholdPercent) {
      if (now - this.lastWarningTime > this.warningCooldownMs) {
        logger.error('[MemoryMonitor] CRITICAL: Memory usage is very high!', {
          heapUsed: `${stats.heapUsedMB}MB`,
          heapTotal: `${stats.heapTotalMB}MB`,
          percent: `${stats.heapUsedPercent}%`,
          rss: `${stats.rssMB}MB`,
        });
        this.lastWarningTime = now;
      }

      // Hint garbage collection if available (requires --expose-gc flag)
      if (global.gc) {
        logger.info('[MemoryMonitor] Triggering garbage collection');
        global.gc();
      }
    } else if (stats.heapUsedPercent >= this.config.warningThresholdPercent) {
      if (now - this.lastWarningTime > this.warningCooldownMs) {
        logger.warn('[MemoryMonitor] WARNING: Memory usage is elevated', {
          heapUsed: `${stats.heapUsedMB}MB`,
          heapTotal: `${stats.heapTotalMB}MB`,
          percent: `${stats.heapUsedPercent}%`,
        });
        this.lastWarningTime = now;
      }
    }
  }
}

// Create singleton instance
export const memoryMonitor = new MemoryMonitor();

// Export convenience functions
export function getMemoryStats() {
  return memoryMonitor.getCurrentStats();
}

export function getMemorySummary() {
  return memoryMonitor.getSummary();
}

export function getMemoryHistory() {
  return memoryMonitor.getHistory();
}

export function startMemoryMonitoring() {
  memoryMonitor.start();
}

export function stopMemoryMonitoring() {
  memoryMonitor.stop();
}

export default memoryMonitor;
