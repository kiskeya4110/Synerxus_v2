/**
 * In-Memory Cache Service
 *
 * A lightweight caching layer for dashboard and frequently accessed data.
 * Uses LRU (Least Recently Used) eviction strategy with TTL (Time To Live).
 *
 * For production at scale, consider replacing with Redis.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private inflight: Map<string, Promise<any>> = new Map(); // In-flight request deduplication
  private prefixIndex: Map<string, Set<string>> = new Map(); // Index for faster pattern deletion
  private maxSize: number;
  private defaultTTL: number;
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
  private dedupeCount: number = 0; // Track deduplicated requests
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: { maxSize?: number; defaultTTL?: number } = {}) {
    this.maxSize = options.maxSize || 2000; // Increased to 2000 entries for better hit rate
    this.defaultTTL = options.defaultTTL || 30000; // 30 seconds default

    // Periodic cleanup of expired entries - more frequent for better memory management
    this.cleanupInterval = setInterval(() => this.cleanup(), 30000); // Every 30 seconds
  }

  /**
   * Stop the cache cleanup interval (for graceful shutdown)
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const ttl = ttlMs || this.defaultTTL;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });

    // Update prefix index for faster pattern deletion
    const colonIndex = key.indexOf(':');
    if (colonIndex > 0) {
      const prefix = key.substring(0, colonIndex + 1);
      if (!this.prefixIndex.has(prefix)) {
        this.prefixIndex.set(prefix, new Set());
      }
      this.prefixIndex.get(prefix)!.add(key);
    }

    this.stats.sets++;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);

    // Remove from prefix index
    if (deleted) {
      const colonIndex = key.indexOf(':');
      if (colonIndex > 0) {
        const prefix = key.substring(0, colonIndex + 1);
        const prefixSet = this.prefixIndex.get(prefix);
        if (prefixSet) {
          prefixSet.delete(key);
          if (prefixSet.size === 0) {
            this.prefixIndex.delete(prefix);
          }
        }
      }
    }

    return deleted;
  }

  /**
   * Delete all keys matching a pattern (prefix)
   * Uses prefix index for O(k) deletion where k is number of matching keys
   */
  deletePattern(pattern: string): number {
    let deleted = 0;

    // Try to use prefix index first for exact prefix match
    const colonIndex = pattern.indexOf(':');
    if (colonIndex > 0 && pattern.endsWith(':')) {
      // Exact prefix match - use index
      const prefixSet = this.prefixIndex.get(pattern);
      if (prefixSet) {
        Array.from(prefixSet).forEach(key => {
          this.cache.delete(key);
          deleted++;
        });
        this.prefixIndex.delete(pattern);
        return deleted;
      }
    }

    // Fallback to scanning for partial patterns
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    });

    for (const key of keysToDelete) {
      this.cache.delete(key);

      // Update prefix index
      const keyColonIndex = key.indexOf(':');
      if (keyColonIndex > 0) {
        const prefix = key.substring(0, keyColonIndex + 1);
        const prefixSet = this.prefixIndex.get(prefix);
        if (prefixSet) {
          prefixSet.delete(key);
          if (prefixSet.size === 0) {
            this.prefixIndex.delete(prefix);
          }
        }
      }

      deleted++;
    }

    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.prefixIndex.clear();
    this.inflight.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { size: number; hitRate: string; inflight: number; deduplicated: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%';
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate,
      inflight: this.inflight.size,
      deduplicated: this.dedupeCount,
    };
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   * Includes in-flight request deduplication to prevent duplicate concurrent requests
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    // First check cache
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if there's already an in-flight request for this key
    const inflight = this.inflight.get(key);
    if (inflight) {
      this.dedupeCount++;
      return inflight as Promise<T>;
    }

    // Create new promise and track it
    const promise = (async () => {
      try {
        const data = await fetchFn();
        this.set(key, data, ttlMs);
        return data;
      } finally {
        // Clean up in-flight tracking
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  /**
   * Get or set with deduplication - alias for getOrSet with clearer naming
   */
  async dedupedFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    return this.getOrSet(key, fetchFn, ttlMs);
  }

  /**
   * Evict the oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  DASHBOARD: 30 * 1000,        // 30 seconds - dashboard data
  USER_PROFILE: 5 * 60 * 1000, // 5 minutes - user profiles
  PROJECTS_LIST: 60 * 1000,    // 1 minute - project lists
  METRICS: 5 * 60 * 1000,      // 5 minutes - impact metrics (rarely change)
  OPPORTUNITIES: 2 * 60 * 1000, // 2 minutes - opportunities
  STATIC: 30 * 60 * 1000,      // 30 minutes - static reference data
} as const;

// Cache key generators
export const cacheKeys = {
  dashboard: (userId: number) => `dashboard:${userId}`,
  dashboardOrg: (orgId: number) => `dashboard:org:${orgId}`,
  dashboardVolunteer: (userId: number) => `dashboard:volunteer:${userId}`,
  userProfile: (userId: number) => `user:${userId}`,
  volunteerProfile: (userId: number) => `volunteer-profile:${userId}`,
  orgProfile: (orgId: number) => `org-profile:${orgId}`,
  projectsList: (orgId?: number) => orgId ? `projects:org:${orgId}` : 'projects:all',
  impactMetrics: () => 'impact-metrics:all',
  opportunities: (orgId?: number) => orgId ? `opportunities:org:${orgId}` : 'opportunities:all',
  aiuSummary: (userId: number) => `aiu:${userId}`,
};

// Invalidation helpers
export const invalidateCache = {
  // Invalidate all dashboard caches for a user
  forUser: (userId: number) => {
    cache.deletePattern(`dashboard:${userId}`);
    cache.deletePattern(`dashboard:volunteer:${userId}`);
    cache.delete(cacheKeys.userProfile(userId));
    cache.delete(cacheKeys.volunteerProfile(userId));
    cache.delete(cacheKeys.aiuSummary(userId));
  },

  // Invalidate organization-related caches
  forOrganization: (orgId: number) => {
    cache.deletePattern(`dashboard:org:${orgId}`);
    cache.delete(cacheKeys.orgProfile(orgId));
    cache.delete(cacheKeys.projectsList(orgId));
    cache.delete(cacheKeys.opportunities(orgId));
  },

  // Invalidate project-related caches
  forProject: (orgId: number) => {
    cache.delete(cacheKeys.projectsList(orgId));
    cache.delete(cacheKeys.projectsList()); // All projects
    cache.deletePattern('dashboard:'); // All dashboards
  },

  // Invalidate activity-related caches (when hours logged, etc.)
  forActivity: (userId: number, orgId?: number) => {
    cache.deletePattern(`dashboard:${userId}`);
    cache.deletePattern(`dashboard:volunteer:${userId}`);
    cache.delete(cacheKeys.aiuSummary(userId));
    if (orgId) {
      cache.deletePattern(`dashboard:org:${orgId}`);
    }
  },

  // Clear all caches
  all: () => {
    cache.clear();
  },
};

// Export singleton instance with increased capacity for better performance
export const cache = new MemoryCache({
  maxSize: 2000,  // Increased from 500 for better hit rate
  defaultTTL: CACHE_TTL.DASHBOARD,
});

export default cache;
