/**
 * Tiered Rate Limiting Middleware
 *
 * Implements user-tier-based rate limiting with:
 * - Free tier: 60 requests/minute
 * - Pro tier: 300 requests/minute
 * - Enterprise: 1000 requests/minute
 * - Burst allowance: 2x for 10 seconds
 *
 * Uses sliding window algorithm with Redis for distributed rate limiting.
 */

import { Request, Response, NextFunction } from 'express';
import { redisCache } from '../redis-cache';
import { logger } from '../logger';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type UserTier = 'free' | 'pro' | 'enterprise' | 'admin';

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstMultiplier: number;
  burstDurationMs: number;
}

export interface RateLimitInfo {
  tier: UserTier;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
  burstActive: boolean;
  burstRemaining?: number;
}

export interface SlidingWindowData {
  requests: number[];
  burstStart?: number;
  burstUsed?: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export const TIER_LIMITS: Record<UserTier, RateLimitConfig> = {
  free: {
    requestsPerMinute: 60,
    burstMultiplier: 2,
    burstDurationMs: 10000, // 10 seconds
  },
  pro: {
    requestsPerMinute: 300,
    burstMultiplier: 2,
    burstDurationMs: 10000,
  },
  enterprise: {
    requestsPerMinute: 1000,
    burstMultiplier: 2,
    burstDurationMs: 10000,
  },
  admin: {
    requestsPerMinute: 10000, // Effectively unlimited
    burstMultiplier: 1,
    burstDurationMs: 0,
  },
};

const WINDOW_SIZE_MS = 60000; // 1 minute sliding window
const CLEANUP_INTERVAL_MS = 5000; // Clean old entries every 5 seconds

// In-memory fallback for when Redis is unavailable
const memoryStore = new Map<string, SlidingWindowData>();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the user's tier from the authenticated user or API key
 */
function getUserTier(req: Request): UserTier {
  // Check authenticated user's subscription tier
  const user = req.authenticatedUser;
  if (user) {
    // Admin users get highest tier
    if (user.role === 'admin' || user.isAdmin) {
      return 'admin';
    }

    // Check subscription/tier field
    if (user.subscriptionTier) {
      return user.subscriptionTier as UserTier;
    }

    // Check organization tier if user belongs to one
    if (user.organizationTier) {
      return user.organizationTier as UserTier;
    }
  }

  // Check API key tier (for machine-to-machine auth)
  const apiKeyTier = req.headers['x-api-tier'] as UserTier | undefined;
  if (apiKeyTier && TIER_LIMITS[apiKeyTier]) {
    return apiKeyTier;
  }

  // Default to free tier
  return 'free';
}

/**
 * Generate a rate limit key for the user/IP
 */
function getRateLimitKey(req: Request): string {
  // Prefer user ID for authenticated requests
  const user = req.authenticatedUser;
  if (user?.id) {
    return `ratelimit:user:${user.id}`;
  }

  // Fall back to IP address
  const ip = req.ip ||
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';

  return `ratelimit:ip:${ip}`;
}

/**
 * Get current window data from Redis or memory
 */
async function getWindowData(key: string): Promise<SlidingWindowData> {
  try {
    const data = await redisCache.get<SlidingWindowData>(key);
    if (data) {
      return data;
    }
  } catch (error) {
    logger.warn('Rate limit Redis error, using memory fallback:', error);
  }

  // Fallback to memory
  return memoryStore.get(key) || { requests: [] };
}

/**
 * Save window data to Redis and memory
 */
async function saveWindowData(key: string, data: SlidingWindowData): Promise<void> {
  // Always update memory store for fallback
  memoryStore.set(key, data);

  try {
    await redisCache.set(key, data, WINDOW_SIZE_MS * 2); // TTL: 2x window size
  } catch (error) {
    logger.warn('Rate limit Redis save error:', error);
  }
}

/**
 * Clean old requests from the sliding window
 */
function cleanWindow(data: SlidingWindowData): number[] {
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE_MS;
  return data.requests.filter(timestamp => timestamp > windowStart);
}

/**
 * Check if burst mode is active and available
 */
function checkBurst(
  data: SlidingWindowData,
  config: RateLimitConfig,
  currentRequests: number
): { burstActive: boolean; burstRemaining: number } {
  const now = Date.now();

  // Check if burst mode was recently started
  if (data.burstStart && now - data.burstStart < config.burstDurationMs) {
    const burstLimit = config.requestsPerMinute * config.burstMultiplier;
    const burstUsed = data.burstUsed || 0;
    const burstRemaining = Math.max(0, burstLimit - currentRequests - burstUsed);

    return {
      burstActive: true,
      burstRemaining,
    };
  }

  // Burst not active - check if user exceeded normal limit (triggers burst)
  if (currentRequests >= config.requestsPerMinute) {
    return {
      burstActive: false,
      burstRemaining: config.requestsPerMinute * (config.burstMultiplier - 1),
    };
  }

  return {
    burstActive: false,
    burstRemaining: 0,
  };
}

// =============================================================================
// MAIN RATE LIMITER
// =============================================================================

/**
 * Create tiered rate limiter middleware
 */
export function createTieredRateLimiter(options?: {
  skipPaths?: string[];
  keyGenerator?: (req: Request) => string;
  tierResolver?: (req: Request) => UserTier;
  onRateLimit?: (req: Request, info: RateLimitInfo) => void;
}) {
  const skipPaths = options?.skipPaths || ['/health', '/ready', '/api/metrics'];
  const keyGenerator = options?.keyGenerator || getRateLimitKey;
  const tierResolver = options?.tierResolver || getUserTier;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip rate limiting for certain paths
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const key = keyGenerator(req);
    const tier = tierResolver(req);
    const config = TIER_LIMITS[tier];
    const now = Date.now();

    try {
      // Get current window data
      const data = await getWindowData(key);

      // Clean old entries
      data.requests = cleanWindow(data);

      // Count requests in current window
      const currentRequests = data.requests.length;

      // Check burst status
      const { burstActive, burstRemaining } = checkBurst(data, config, currentRequests);

      // Determine effective limit
      let effectiveLimit = config.requestsPerMinute;

      if (burstActive) {
        effectiveLimit = config.requestsPerMinute * config.burstMultiplier;
      } else if (currentRequests >= config.requestsPerMinute && burstRemaining > 0) {
        // Activate burst mode
        data.burstStart = now;
        data.burstUsed = 0;
        effectiveLimit = config.requestsPerMinute * config.burstMultiplier;
      }

      // Calculate remaining requests
      const remaining = Math.max(0, effectiveLimit - currentRequests - 1);

      // Calculate reset time (oldest request + window size)
      const oldestRequest = data.requests[0] || now;
      const resetTime = Math.ceil((oldestRequest + WINDOW_SIZE_MS) / 1000);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', effectiveLimit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);
      res.setHeader('X-RateLimit-Tier', tier);

      if (burstActive) {
        res.setHeader('X-RateLimit-Burst-Active', 'true');
        res.setHeader('X-RateLimit-Burst-Remaining', burstRemaining);
      }

      // Check if rate limited
      if (currentRequests >= effectiveLimit) {
        const retryAfter = Math.ceil((oldestRequest + WINDOW_SIZE_MS - now) / 1000);

        const info: RateLimitInfo = {
          tier,
          limit: effectiveLimit,
          remaining: 0,
          reset: resetTime,
          retryAfter,
          burstActive,
          burstRemaining: 0,
        };

        // Log rate limit event
        logger.warn({
          type: 'RATE_LIMIT_EXCEEDED',
          key,
          tier,
          limit: effectiveLimit,
          requests: currentRequests,
          path: req.path,
          method: req.method,
        });

        options?.onRateLimit?.(req, info);

        res.setHeader('Retry-After', retryAfter);
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
            tier,
            limit: effectiveLimit,
            retryAfter,
          },
        });
        return;
      }

      // Record this request
      data.requests.push(now);

      // Update burst usage if in burst mode
      if (burstActive && data.burstUsed !== undefined) {
        data.burstUsed++;
      }

      // Save updated data
      await saveWindowData(key, data);

      next();
    } catch (error) {
      // On error, allow the request through but log the issue
      logger.error('Rate limiter error:', error);
      next();
    }
  };
}

// =============================================================================
// ENDPOINT-SPECIFIC RATE LIMITERS
// =============================================================================

/**
 * Stricter rate limiter for authentication endpoints
 */
export const authRateLimiter = createTieredRateLimiter({
  keyGenerator: (req) => {
    const ip = req.ip ||
      req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      'unknown';
    return `ratelimit:auth:${ip}`;
  },
  tierResolver: () => 'free', // Always use lowest tier for auth endpoints
  skipPaths: [],
});

/**
 * Relaxed rate limiter for read-heavy endpoints
 */
export const readRateLimiter = createTieredRateLimiter({
  tierResolver: (req) => {
    const baseTier = getUserTier(req);
    // Double the limit for read operations
    const tierUpgrade: Record<UserTier, UserTier> = {
      free: 'pro',
      pro: 'enterprise',
      enterprise: 'enterprise',
      admin: 'admin',
    };
    return tierUpgrade[baseTier];
  },
});

/**
 * Stricter rate limiter for write operations
 */
export const writeRateLimiter = createTieredRateLimiter({
  tierResolver: (req) => {
    const baseTier = getUserTier(req);
    // Halve the limit for write operations
    const tierDowngrade: Record<UserTier, UserTier> = {
      free: 'free',
      pro: 'free',
      enterprise: 'pro',
      admin: 'admin',
    };
    return tierDowngrade[baseTier];
  },
});

/**
 * Rate limiter for expensive operations (reports, exports)
 */
export const expensiveOpRateLimiter = createTieredRateLimiter({
  tierResolver: () => 'free', // Use strictest limit
  skipPaths: [],
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get rate limit info for a request without consuming a request
 */
export async function getRateLimitInfo(req: Request): Promise<RateLimitInfo> {
  const key = getRateLimitKey(req);
  const tier = getUserTier(req);
  const config = TIER_LIMITS[tier];
  const now = Date.now();

  const data = await getWindowData(key);
  data.requests = cleanWindow(data);

  const currentRequests = data.requests.length;
  const { burstActive, burstRemaining } = checkBurst(data, config, currentRequests);

  const effectiveLimit = burstActive
    ? config.requestsPerMinute * config.burstMultiplier
    : config.requestsPerMinute;

  const oldestRequest = data.requests[0] || now;
  const resetTime = Math.ceil((oldestRequest + WINDOW_SIZE_MS) / 1000);

  return {
    tier,
    limit: effectiveLimit,
    remaining: Math.max(0, effectiveLimit - currentRequests),
    reset: resetTime,
    burstActive,
    burstRemaining,
  };
}

/**
 * Reset rate limit for a specific key (admin function)
 */
export async function resetRateLimit(key: string): Promise<void> {
  memoryStore.delete(key);
  await redisCache.delete(key);
}

/**
 * Cleanup old entries from memory store (run periodically)
 */
function cleanupMemoryStore(): void {
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE_MS;

  const entries = Array.from(memoryStore.entries());
  for (const [key, data] of entries) {
    data.requests = data.requests.filter((timestamp: number) => timestamp > windowStart);

    if (data.requests.length === 0) {
      memoryStore.delete(key);
    }
  }
}

// Run cleanup periodically
setInterval(cleanupMemoryStore, CLEANUP_INTERVAL_MS);

// =============================================================================
// EXPORTS
// =============================================================================

export default createTieredRateLimiter;
