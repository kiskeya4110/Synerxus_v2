/**
 * Circuit Breaker Implementation - sat1325upgrade
 *
 * Prevents cascade failures by failing fast when services are unhealthy.
 * Instead of crashing, the system gracefully degrades.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service unhealthy, requests fail immediately with fallback
 * - HALF-OPEN: Testing if service recovered
 */

import CircuitBreaker from 'opossum';
import { logger } from './logger';

// Circuit breaker configuration optimized for high concurrency
const DEFAULT_OPTIONS: CircuitBreaker.Options = {
  timeout: 10000,           // 10s timeout for operations
  errorThresholdPercentage: 50,  // Open circuit if 50% of requests fail
  resetTimeout: 30000,      // Try again after 30s
  volumeThreshold: 10,      // Minimum requests before tripping
  rollingCountTimeout: 10000,    // Window for error calculation
  rollingCountBuckets: 10,  // Buckets for rolling window
};

// Track all circuit breakers for monitoring
const breakers = new Map<string, CircuitBreaker>();

/**
 * Create a circuit breaker for an async function
 */
export function createCircuitBreaker<T>(
  name: string,
  fn: (...args: any[]) => Promise<T>,
  options?: Partial<CircuitBreaker.Options>,
  fallback?: (...args: any[]) => T
): CircuitBreaker {
  const breaker = new CircuitBreaker(fn, {
    ...DEFAULT_OPTIONS,
    ...options,
    name,
  });

  // Set fallback if provided
  if (fallback) {
    breaker.fallback(fallback);
  }

  // Event logging
  breaker.on('success', () => {
    logger.debug(`[CircuitBreaker:${name}] Success`);
  });

  breaker.on('timeout', () => {
    logger.warn(`[CircuitBreaker:${name}] Timeout - operation took too long`);
  });

  breaker.on('reject', () => {
    logger.warn(`[CircuitBreaker:${name}] Rejected - circuit is open`);
  });

  breaker.on('open', () => {
    logger.error(`[CircuitBreaker:${name}] OPEN - too many failures, failing fast`);
  });

  breaker.on('halfOpen', () => {
    logger.info(`[CircuitBreaker:${name}] Half-Open - testing recovery`);
  });

  breaker.on('close', () => {
    logger.info(`[CircuitBreaker:${name}] CLOSED - service recovered`);
  });

  breaker.on('fallback', () => {
    logger.warn(`[CircuitBreaker:${name}] Using fallback response`);
  });

  breakers.set(name, breaker);
  return breaker;
}

/**
 * Get circuit breaker stats for monitoring
 */
export function getCircuitBreakerStats(): Record<string, any> {
  const stats: Record<string, any> = {};

  breakers.forEach((breaker, name) => {
    const s = breaker.stats;
    stats[name] = {
      state: breaker.opened ? 'OPEN' : (breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED'),
      successful: s.successes,
      failed: s.failures,
      rejected: s.rejects,
      timeout: s.timeouts,
      fallback: s.fallbacks,
      latencyMean: Math.round(s.latencyMean),
      latencyP99: s.percentiles ? Math.round(s.percentiles['99'] || 0) : 0,
    };
  });

  return stats;
}

// Track system-wide health indicators
let systemHealthIndicators = {
  dbPoolUnderPressure: false,
  memoryPressure: false,
  lastHealthCheck: 0,
};

/**
 * Update system health indicators (called periodically)
 */
export function updateSystemHealth(indicators: Partial<typeof systemHealthIndicators>): void {
  Object.assign(systemHealthIndicators, indicators, { lastHealthCheck: Date.now() });
}

/**
 * Health check - returns false if any critical circuit is open or system is under pressure
 */
export function isSystemHealthy(): boolean {
  // Check circuit breakers
  let circuitHealthy = true;
  breakers.forEach((breaker, name) => {
    if (name.startsWith('db:') && breaker.opened) {
      circuitHealthy = false;
    }
  });

  // Check system-wide indicators
  const systemHealthy = !systemHealthIndicators.dbPoolUnderPressure &&
                         !systemHealthIndicators.memoryPressure;

  return circuitHealthy && systemHealthy;
}

/**
 * Get detailed health status
 */
export function getDetailedHealthStatus(): {
  circuitsHealthy: boolean;
  systemHealthy: boolean;
  indicators: typeof systemHealthIndicators;
  openCircuits: string[];
} {
  const openCircuits: string[] = [];

  breakers.forEach((breaker, name) => {
    if (breaker.opened) {
      openCircuits.push(name);
    }
  });

  return {
    circuitsHealthy: openCircuits.length === 0,
    systemHealthy: !systemHealthIndicators.dbPoolUnderPressure && !systemHealthIndicators.memoryPressure,
    indicators: { ...systemHealthIndicators },
    openCircuits,
  };
}

/**
 * Wrap a storage method with circuit breaker protection
 */
export function wrapWithCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
  fallbackValue?: ReturnType<T> extends Promise<infer U> ? U : never
): T {
  const breaker = createCircuitBreaker(
    name,
    fn,
    undefined,
    fallbackValue !== undefined ? () => fallbackValue : undefined
  );

  return ((...args: Parameters<T>) => breaker.fire(...args)) as T;
}

export default {
  createCircuitBreaker,
  getCircuitBreakerStats,
  isSystemHealthy,
  wrapWithCircuitBreaker,
};
