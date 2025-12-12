/**
 * Redis Cache Service
 *
 * Enterprise-grade caching layer with Redis as primary storage.
 * Falls back to in-memory cache if Redis is unavailable.
 *
 * Features:
 * - Connection pooling and retry logic
 * - TTL-based expiration
 * - Pattern-based cache invalidation
 * - Health monitoring
 * - Cluster support ready
 * - Circuit breaker pattern
 */

import Redis from "ioredis";
import { logger } from "./logger";

// Cache configuration
interface RedisCacheConfig {
  url?: string;
  keyPrefix?: string;
  defaultTTL?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableOfflineQueue?: boolean;
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  connected: boolean;
  mode: 'redis' | 'memory';
}

// In-memory fallback cache
class MemoryFallback {
  private cache: Map<string, { data: string; expiresAt: number }> = new Map();
  private maxSize = 2000;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return JSON.parse(entry.data) as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      data: JSON.stringify(value),
      expiresAt: Date.now() + ttlMs,
    });
  }

  del(key: string): boolean {
    return this.cache.delete(key);
  }

  keys(pattern: string): string[] {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  flushAll(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

class RedisCache {
  private redis: Redis | null = null;
  private fallback: MemoryFallback;
  private config: Required<RedisCacheConfig>;
  private stats: CacheStats;
  private circuitOpen = false;
  private circuitOpenTime = 0;
  private circuitTimeout = 30000; // 30 seconds
  private consecutiveErrors = 0;
  private errorThreshold = 5;

  constructor(config: RedisCacheConfig = {}) {
    this.config = {
      url: config.url || process.env.REDIS_URL || '',
      keyPrefix: config.keyPrefix || 'synerxus:',
      defaultTTL: config.defaultTTL || 60000, // 1 minute default
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      enableOfflineQueue: config.enableOfflineQueue ?? true,
    };

    this.fallback = new MemoryFallback();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      connected: false,
      mode: 'memory',
    };

    this.initializeRedis();
  }

  private initializeRedis(): void {
    if (!this.config.url) {
      logger.warn('REDIS_URL not configured, using in-memory cache fallback');
      return;
    }

    try {
      this.redis = new Redis(this.config.url, {
        maxRetriesPerRequest: this.config.maxRetries,
        retryStrategy: (times) => {
          if (times > this.config.maxRetries) {
            logger.error(`Redis connection failed after ${times} attempts`);
            return null; // Stop retrying
          }
          return Math.min(times * this.config.retryDelay, 30000);
        },
        enableOfflineQueue: this.config.enableOfflineQueue,
        lazyConnect: false,
        connectTimeout: 10000,
        keyPrefix: this.config.keyPrefix,
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected');
        this.stats.connected = true;
        this.stats.mode = 'redis';
        this.resetCircuitBreaker();
      });

      this.redis.on('error', (error) => {
        logger.error('Redis error:', error.message);
        this.stats.errors++;
        this.handleError();
      });

      this.redis.on('close', () => {
        logger.warn('Redis connection closed');
        this.stats.connected = false;
      });

      this.redis.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.stats.mode = 'memory';
    }
  }

  private handleError(): void {
    this.consecutiveErrors++;
    if (this.consecutiveErrors >= this.errorThreshold) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    if (!this.circuitOpen) {
      logger.warn('Circuit breaker opened - falling back to memory cache');
      this.circuitOpen = true;
      this.circuitOpenTime = Date.now();
      this.stats.mode = 'memory';
    }
  }

  private resetCircuitBreaker(): void {
    this.circuitOpen = false;
    this.consecutiveErrors = 0;
    this.stats.mode = 'redis';
  }

  private shouldUseRedis(): boolean {
    // Check circuit breaker
    if (this.circuitOpen) {
      // Try to close circuit after timeout
      if (Date.now() - this.circuitOpenTime > this.circuitTimeout) {
        logger.info('Attempting to close circuit breaker');
        this.circuitOpen = false;
        this.consecutiveErrors = 0;
      } else {
        return false;
      }
    }

    return this.redis !== null && this.stats.connected;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.shouldUseRedis()) {
        const value = await this.redis!.get(key);
        if (value) {
          this.stats.hits++;
          this.consecutiveErrors = 0;
          return JSON.parse(value) as T;
        }
        this.stats.misses++;
        return null;
      } else {
        // Fallback to memory
        const value = this.fallback.get<T>(this.config.keyPrefix + key);
        if (value) {
          this.stats.hits++;
        } else {
          this.stats.misses++;
        }
        return value;
      }
    } catch (error) {
      this.stats.errors++;
      this.handleError();
      logger.error('Cache get error:', error);
      // Fallback to memory on error
      return this.fallback.get<T>(this.config.keyPrefix + key);
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const ttl = ttlMs || this.config.defaultTTL;

    try {
      if (this.shouldUseRedis()) {
        await this.redis!.set(
          key,
          JSON.stringify(value),
          'PX',
          ttl
        );
        this.stats.sets++;
        this.consecutiveErrors = 0;
      } else {
        // Fallback to memory
        this.fallback.set(this.config.keyPrefix + key, value, ttl);
        this.stats.sets++;
      }
    } catch (error) {
      this.stats.errors++;
      this.handleError();
      logger.error('Cache set error:', error);
      // Fallback to memory on error
      this.fallback.set(this.config.keyPrefix + key, value, ttl);
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      if (this.shouldUseRedis()) {
        const result = await this.redis!.del(key);
        this.stats.deletes++;
        this.consecutiveErrors = 0;
        return result > 0;
      } else {
        const result = this.fallback.del(this.config.keyPrefix + key);
        this.stats.deletes++;
        return result;
      }
    } catch (error) {
      this.stats.errors++;
      this.handleError();
      logger.error('Cache delete error:', error);
      return this.fallback.del(this.config.keyPrefix + key);
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      if (this.shouldUseRedis()) {
        const keys = await this.redis!.keys(pattern);
        if (keys.length === 0) return 0;

        // Remove prefix from keys for deletion
        const keysToDelete = keys.map(k =>
          k.replace(this.config.keyPrefix, '')
        );

        const result = await this.redis!.del(...keysToDelete);
        this.stats.deletes += result;
        this.consecutiveErrors = 0;
        return result;
      } else {
        const keys = this.fallback.keys(this.config.keyPrefix + pattern);
        keys.forEach(k => this.fallback.del(k));
        this.stats.deletes += keys.length;
        return keys.length;
      }
    } catch (error) {
      this.stats.errors++;
      this.handleError();
      logger.error('Cache deletePattern error:', error);
      const keys = this.fallback.keys(this.config.keyPrefix + pattern);
      keys.forEach(k => this.fallback.del(k));
      return keys.length;
    }
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    await this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      if (this.shouldUseRedis()) {
        // Only clear keys with our prefix
        const keys = await this.redis!.keys('*');
        if (keys.length > 0) {
          const keysToDelete = keys.map(k =>
            k.replace(this.config.keyPrefix, '')
          );
          await this.redis!.del(...keysToDelete);
        }
        this.consecutiveErrors = 0;
      }
      this.fallback.flushAll();
    } catch (error) {
      this.stats.errors++;
      this.handleError();
      logger.error('Cache clear error:', error);
      this.fallback.flushAll();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { size: number; hitRate: string } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%';

    return {
      ...this.stats,
      size: this.fallback.size,
      hitRate,
    };
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    if (!this.shouldUseRedis()) {
      return true; // Memory fallback is always "healthy"
    }

    try {
      const result = await this.redis!.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
    this.fallback.flushAll();
  }
}

// TTL constants (in milliseconds)
export const CACHE_TTL = {
  DASHBOARD: 60 * 1000,           // 1 minute
  DASHBOARD_STATS: 2 * 60 * 1000, // 2 minutes
  USER_PROFILE: 10 * 60 * 1000,   // 10 minutes
  PROJECTS_LIST: 2 * 60 * 1000,   // 2 minutes
  METRICS: 15 * 60 * 1000,        // 15 minutes
  OPPORTUNITIES: 3 * 60 * 1000,   // 3 minutes
  STATIC: 60 * 60 * 1000,         // 1 hour
  SDG_DATA: 30 * 60 * 1000,       // 30 minutes
  LEADERBOARD: 5 * 60 * 1000,     // 5 minutes
  NOTIFICATIONS: 30 * 1000,       // 30 seconds
  MATCH_SCORES: 10 * 60 * 1000,   // 10 minutes
  AIU_CALCULATION: 5 * 60 * 1000, // 5 minutes
  SESSION: 24 * 60 * 60 * 1000,   // 24 hours
  RATE_LIMIT: 60 * 1000,          // 1 minute
} as const;

// Cache key generators
export const cacheKeys = {
  // Dashboard caches
  dashboard: (userId: number) => `dashboard:${userId}`,
  dashboardOrg: (orgId: number) => `dashboard:org:${orgId}`,
  dashboardVolunteer: (userId: number) => `dashboard:volunteer:${userId}`,
  dashboardStats: (orgId: number) => `dashboard:stats:${orgId}`,

  // User/Profile caches
  userProfile: (userId: number) => `user:${userId}`,
  volunteerProfile: (userId: number) => `volunteer-profile:${userId}`,
  orgProfile: (orgId: number) => `org-profile:${orgId}`,

  // List caches
  projectsList: (orgId?: number) => orgId ? `projects:org:${orgId}` : 'projects:all',
  tasksList: (projectId?: number) => projectId ? `tasks:project:${projectId}` : 'tasks:all',
  opportunitiesList: (orgId?: number) => orgId ? `opportunities:org:${orgId}` : 'opportunities:all',
  applicationsList: (oppId?: number) => oppId ? `applications:opp:${oppId}` : 'applications:all',

  // Static/Reference data
  impactMetrics: () => 'impact-metrics:all',
  sdgGoals: () => 'sdg-goals:all',
  sdgContributions: (orgId: number) => `sdg:contributions:${orgId}`,

  // Computed data
  aiuSummary: (userId: number) => `aiu:${userId}`,
  aiuProject: (projectId: number) => `aiu:project:${projectId}`,
  matchScores: (volunteerId: number) => `matches:${volunteerId}`,
  leaderboard: (type: string) => `leaderboard:${type}`,

  // Engagement metrics
  engagementMetrics: (projectId: number) => `engagement:project:${projectId}`,
  volunteerStats: (userId: number) => `volunteer:stats:${userId}`,
  orgStats: (orgId: number) => `org:stats:${orgId}`,

  // Sessions
  session: (sessionId: string) => `session:${sessionId}`,

  // Rate limiting
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
};

// Create singleton instance
export const redisCache = new RedisCache();

// Invalidation helpers
export const invalidateCache = {
  forUser: async (userId: number) => {
    await Promise.all([
      redisCache.deletePattern(`dashboard:${userId}*`),
      redisCache.deletePattern(`dashboard:volunteer:${userId}*`),
      redisCache.delete(cacheKeys.userProfile(userId)),
      redisCache.delete(cacheKeys.volunteerProfile(userId)),
      redisCache.delete(cacheKeys.aiuSummary(userId)),
      redisCache.delete(cacheKeys.volunteerStats(userId)),
      redisCache.delete(cacheKeys.matchScores(userId)),
    ]);
  },

  forOrganization: async (orgId: number) => {
    await Promise.all([
      redisCache.deletePattern(`dashboard:org:${orgId}*`),
      redisCache.deletePattern(`dashboard:stats:${orgId}*`),
      redisCache.delete(cacheKeys.orgProfile(orgId)),
      redisCache.delete(cacheKeys.projectsList(orgId)),
      redisCache.delete(cacheKeys.opportunitiesList(orgId)),
      redisCache.delete(cacheKeys.sdgContributions(orgId)),
      redisCache.delete(cacheKeys.orgStats(orgId)),
    ]);
  },

  forProject: async (projectId: number, orgId?: number) => {
    await Promise.all([
      redisCache.delete(cacheKeys.tasksList(projectId)),
      redisCache.delete(cacheKeys.aiuProject(projectId)),
      redisCache.delete(cacheKeys.engagementMetrics(projectId)),
      orgId ? redisCache.delete(cacheKeys.projectsList(orgId)) : Promise.resolve(),
      orgId ? redisCache.deletePattern(`dashboard:org:${orgId}*`) : Promise.resolve(),
      redisCache.delete(cacheKeys.projectsList()),
    ]);
  },

  forActivity: async (userId: number, orgId?: number, projectId?: number) => {
    await Promise.all([
      redisCache.deletePattern(`dashboard:${userId}*`),
      redisCache.deletePattern(`dashboard:volunteer:${userId}*`),
      redisCache.delete(cacheKeys.aiuSummary(userId)),
      redisCache.delete(cacheKeys.volunteerStats(userId)),
      orgId ? redisCache.deletePattern(`dashboard:org:${orgId}*`) : Promise.resolve(),
      orgId ? redisCache.delete(cacheKeys.orgStats(orgId)) : Promise.resolve(),
      projectId ? redisCache.delete(cacheKeys.aiuProject(projectId)) : Promise.resolve(),
      projectId ? redisCache.delete(cacheKeys.engagementMetrics(projectId)) : Promise.resolve(),
    ]);
  },

  forLeaderboard: async () => {
    await redisCache.deletePattern('leaderboard:*');
  },

  all: async () => {
    await redisCache.clear();
  },
};

export default redisCache;
