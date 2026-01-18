/**
 * Enhanced In-Memory Cache Service
 *
 * Features:
 * - LRU (Least Recently Used) eviction with access-time tracking
 * - TTL (Time To Live) support
 * - Disk persistence (survives restarts)
 * - Cluster worker synchronization via IPC
 * - Memory size estimation and limits
 * - In-flight request deduplication
 * - Comprehensive statistics
 *
 * For production at extreme scale (10K+ users), consider Redis.
 */

import cluster from 'cluster';
import fs from 'fs';
import path from 'path';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
  lastAccessedAt: number;  // For true LRU eviction
  size: number;            // Estimated size in bytes
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  persistedLoads: number;
  persistedSaves: number;
  clusterSyncs: number;
}

interface CacheConfig {
  maxSize?: number;
  maxMemoryMB?: number;
  defaultTTL?: number;
  persistPath?: string;
  persistInterval?: number;
  enableClusterSync?: boolean;
}

// IPC message types for cluster synchronization
interface CacheIPCMessage {
  type: 'cache:set' | 'cache:delete' | 'cache:deletePattern' | 'cache:clear';
  key?: string;
  pattern?: string;
  data?: any;
  ttl?: number;
  fromWorker: number;
}

class EnhancedMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private inflight: Map<string, Promise<any>> = new Map();
  private prefixIndex: Map<string, Set<string>> = new Map();

  private maxSize: number;
  private maxMemoryBytes: number;
  private currentMemoryBytes: number = 0;
  private defaultTTL: number;
  private persistPath: string | null;
  private enableClusterSync: boolean;

  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    persistedLoads: 0,
    persistedSaves: 0,
    clusterSyncs: 0,
  };

  private dedupeCount: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private persistInterval: NodeJS.Timeout | null = null;
  private lastPersistHash: string = '';

  constructor(config: CacheConfig = {}) {
    // Increased defaults for better performance at scale
    this.maxSize = config.maxSize || 5000;           // Increased from 2000
    this.maxMemoryBytes = (config.maxMemoryMB || 100) * 1024 * 1024; // 100MB default
    this.defaultTTL = config.defaultTTL || 30000;
    this.persistPath = config.persistPath || null;
    this.enableClusterSync = config.enableClusterSync ?? true;

    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => this.cleanup(), 30000);

    // Persistence interval (save every 60 seconds if changed)
    if (this.persistPath) {
      this.loadFromDisk();
      this.persistInterval = setInterval(() => this.saveToDisk(), 60000);
    }

    // Setup cluster IPC for cache synchronization
    if (this.enableClusterSync) {
      this.setupClusterSync();
    }
  }

  /**
   * Setup cluster worker synchronization via IPC
   */
  private setupClusterSync(): void {
    if (cluster.isWorker) {
      // Worker receives messages from primary
      process.on('message', (msg: CacheIPCMessage) => {
        if (!msg || !msg.type?.startsWith('cache:')) return;
        if (msg.fromWorker === cluster.worker?.id) return; // Skip own messages

        this.stats.clusterSyncs++;

        switch (msg.type) {
          case 'cache:set':
            if (msg.key && msg.data !== undefined) {
              this.setLocal(msg.key, msg.data, msg.ttl);
            }
            break;
          case 'cache:delete':
            if (msg.key) {
              this.deleteLocal(msg.key);
            }
            break;
          case 'cache:deletePattern':
            if (msg.pattern) {
              this.deletePatternLocal(msg.pattern);
            }
            break;
          case 'cache:clear':
            this.clearLocal();
            break;
        }
      });
    } else if (cluster.isPrimary) {
      // Primary forwards messages to all workers
      cluster.on('message', (worker, msg: CacheIPCMessage) => {
        if (!msg || !msg.type?.startsWith('cache:')) return;

        // Broadcast to all other workers
        for (const id in cluster.workers) {
          const w = cluster.workers[id];
          if (w && w.id !== worker.id) {
            w.send(msg);
          }
        }
      });
    }
  }

  /**
   * Broadcast cache operation to other cluster workers
   */
  private broadcastToCluster(msg: Omit<CacheIPCMessage, 'fromWorker'>): void {
    if (!this.enableClusterSync || !cluster.isWorker) return;

    try {
      process.send?.({
        ...msg,
        fromWorker: cluster.worker?.id || 0,
      });
    } catch (e) {
      // Ignore IPC errors (primary might be restarting)
    }
  }

  /**
   * Estimate the size of a value in bytes
   */
  private estimateSize(data: any): number {
    try {
      const json = JSON.stringify(data);
      return json.length * 2; // Approximate UTF-16 size
    } catch {
      return 1000; // Default estimate for non-serializable data
    }
  }

  /**
   * Get a value from cache (updates access time for LRU)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.deleteLocal(key);
      this.stats.misses++;
      return null;
    }

    // Update access time for LRU
    entry.lastAccessedAt = Date.now();
    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set a value in cache (local only, no broadcast)
   */
  private setLocal<T>(key: string, data: T, ttlMs?: number): void {
    const size = this.estimateSize(data);
    const ttl = ttlMs || this.defaultTTL;

    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.currentMemoryBytes -= oldEntry.size;
      this.removeFromPrefixIndex(key);
    }

    // Evict entries if over limits
    while (
      (this.cache.size >= this.maxSize || this.currentMemoryBytes + size > this.maxMemoryBytes) &&
      this.cache.size > 0
    ) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      expiresAt: now + ttl,
      createdAt: now,
      lastAccessedAt: now,
      size,
    });

    this.currentMemoryBytes += size;
    this.addToPrefixIndex(key);
    this.stats.sets++;
  }

  /**
   * Set a value in cache with cluster broadcast
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    this.setLocal(key, data, ttlMs);
    this.broadcastToCluster({ type: 'cache:set', key, data, ttl: ttlMs });
  }

  /**
   * Delete a key (local only)
   */
  private deleteLocal(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemoryBytes -= entry.size;
      this.cache.delete(key);
      this.removeFromPrefixIndex(key);
      return true;
    }
    return false;
  }

  /**
   * Delete a key with cluster broadcast
   */
  delete(key: string): boolean {
    const deleted = this.deleteLocal(key);
    if (deleted) {
      this.broadcastToCluster({ type: 'cache:delete', key });
    }
    return deleted;
  }

  /**
   * Delete pattern (local only)
   */
  private deletePatternLocal(pattern: string): number {
    let deleted = 0;

    // Try prefix index first
    if (pattern.endsWith(':')) {
      const prefixSet = this.prefixIndex.get(pattern);
      if (prefixSet) {
        for (const key of Array.from(prefixSet)) {
          const entry = this.cache.get(key);
          if (entry) {
            this.currentMemoryBytes -= entry.size;
          }
          this.cache.delete(key);
          deleted++;
        }
        this.prefixIndex.delete(pattern);
        return deleted;
      }
    }

    // Fallback to scanning
    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    });

    for (const key of keysToDelete) {
      this.deleteLocal(key);
      deleted++;
    }

    return deleted;
  }

  /**
   * Delete all keys matching a pattern with cluster broadcast
   */
  deletePattern(pattern: string): number {
    const deleted = this.deletePatternLocal(pattern);
    if (deleted > 0) {
      this.broadcastToCluster({ type: 'cache:deletePattern', pattern });
    }
    return deleted;
  }

  /**
   * Clear local cache
   */
  private clearLocal(): void {
    this.cache.clear();
    this.prefixIndex.clear();
    this.inflight.clear();
    this.currentMemoryBytes = 0;
  }

  /**
   * Clear entire cache with cluster broadcast
   */
  clear(): void {
    this.clearLocal();
    this.broadcastToCluster({ type: 'cache:clear' });
  }

  /**
   * Add key to prefix index
   */
  private addToPrefixIndex(key: string): void {
    const colonIndex = key.indexOf(':');
    if (colonIndex > 0) {
      const prefix = key.substring(0, colonIndex + 1);
      if (!this.prefixIndex.has(prefix)) {
        this.prefixIndex.set(prefix, new Set());
      }
      this.prefixIndex.get(prefix)!.add(key);
    }
  }

  /**
   * Remove key from prefix index
   */
  private removeFromPrefixIndex(key: string): void {
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

  /**
   * Evict the least recently used entry (true LRU)
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    // Find least recently accessed entry
    this.cache.forEach((entry, key) => {
      if (entry.lastAccessedAt < lruTime) {
        lruTime = entry.lastAccessedAt;
        lruKey = key;
      }
    });

    if (lruKey) {
      const entry = this.cache.get(lruKey);
      if (entry) {
        this.currentMemoryBytes -= entry.size;
      }
      this.cache.delete(lruKey);
      this.removeFromPrefixIndex(lruKey);
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

    for (const key of keysToDelete) {
      this.deleteLocal(key);
    }
  }

  /**
   * Load cache from disk (for persistence across restarts)
   */
  private loadFromDisk(): void {
    if (!this.persistPath) return;

    try {
      const filePath = path.resolve(this.persistPath);
      if (!fs.existsSync(filePath)) return;

      const data = fs.readFileSync(filePath, 'utf-8');
      const entries = JSON.parse(data) as Array<{ key: string; entry: CacheEntry<any> }>;

      const now = Date.now();
      let loaded = 0;

      for (const { key, entry } of entries) {
        // Skip expired entries
        if (entry.expiresAt > now) {
          this.cache.set(key, entry);
          this.currentMemoryBytes += entry.size;
          this.addToPrefixIndex(key);
          loaded++;
        }
      }

      this.stats.persistedLoads++;
      console.log(`[Cache] Loaded ${loaded} entries from disk`);
    } catch (e) {
      console.warn('[Cache] Failed to load from disk:', e);
    }
  }

  /**
   * Save cache to disk (for persistence across restarts)
   */
  private saveToDisk(): void {
    if (!this.persistPath) return;

    try {
      const entries: Array<{ key: string; entry: CacheEntry<any> }> = [];
      const now = Date.now();

      // Only save non-expired entries
      this.cache.forEach((entry, key) => {
        if (entry.expiresAt > now) {
          entries.push({ key, entry });
        }
      });

      // Check if changed since last save
      const hash = JSON.stringify(entries.length);
      if (hash === this.lastPersistHash) return;

      const filePath = path.resolve(this.persistPath);
      const dir = path.dirname(filePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(entries), 'utf-8');
      this.lastPersistHash = hash;
      this.stats.persistedSaves++;
    } catch (e) {
      console.warn('[Cache] Failed to save to disk:', e);
    }
  }

  /**
   * Force save to disk (for graceful shutdown)
   */
  forceSave(): void {
    this.lastPersistHash = ''; // Force save
    this.saveToDisk();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & {
    size: number;
    maxSize: number;
    memoryUsedMB: string;
    maxMemoryMB: number;
    hitRate: string;
    inflight: number;
    deduplicated: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%';
    const memoryUsedMB = (this.currentMemoryBytes / 1024 / 1024).toFixed(2);

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsedMB: memoryUsedMB + ' MB',
      maxMemoryMB: Math.round(this.maxMemoryBytes / 1024 / 1024),
      hitRate,
      inflight: this.inflight.size,
      deduplicated: this.dedupeCount,
    };
  }

  /**
   * Get or set with in-flight deduplication
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check in-flight requests
    const inflight = this.inflight.get(key);
    if (inflight) {
      this.dedupeCount++;
      return inflight as Promise<T>;
    }

    // Create new fetch promise
    const promise = (async () => {
      try {
        const data = await fetchFn();
        this.set(key, data, ttlMs);
        return data;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  /**
   * Alias for getOrSet
   */
  async dedupedFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    return this.getOrSet(key, fetchFn, ttlMs);
  }

  /**
   * Stop all intervals (for graceful shutdown)
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.persistInterval) {
      clearInterval(this.persistInterval);
      this.persistInterval = null;
    }
    // Final save before shutdown
    this.forceSave();
  }

  /**
   * Check if cache has a valid (non-expired) entry
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.deleteLocal(key);
      return false;
    }
    return true;
  }

  /**
   * Get remaining TTL for a key in milliseconds
   */
  getTTL(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : null;
  }

  /**
   * Touch a key to extend its TTL without changing the data
   */
  touch(key: string, ttlMs?: number): boolean {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) return false;

    entry.expiresAt = Date.now() + (ttlMs || this.defaultTTL);
    entry.lastAccessedAt = Date.now();
    return true;
  }

  /**
   * Get all keys matching a pattern
   */
  keys(pattern?: string): string[] {
    if (!pattern) {
      return Array.from(this.cache.keys());
    }

    // Use prefix index if exact prefix
    if (pattern.endsWith(':')) {
      const prefixSet = this.prefixIndex.get(pattern);
      return prefixSet ? Array.from(prefixSet) : [];
    }

    // Scan for partial pattern
    const matchingKeys: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(pattern)) {
        matchingKeys.push(key);
      }
    });
    return matchingKeys;
  }
}

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  DASHBOARD: 30 * 1000,         // 30 seconds - dashboard data
  USER_PROFILE: 5 * 60 * 1000,  // 5 minutes - user profiles
  PROJECTS_LIST: 60 * 1000,     // 1 minute - project lists
  METRICS: 5 * 60 * 1000,       // 5 minutes - impact metrics
  OPPORTUNITIES: 2 * 60 * 1000, // 2 minutes - opportunities
  STATIC: 30 * 60 * 1000,       // 30 minutes - static reference data
  NOTIFICATIONS: 30 * 1000,     // 30 seconds - notifications
  MESSAGES: 15 * 1000,          // 15 seconds - messages (more dynamic)
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
  tasksOrg: (orgId: number) => `tasks:org:${orgId}`,
  tasksProject: (projectId: number) => `tasks:project:${projectId}`,
  tasksAll: () => 'tasks:all',
  notifications: (userId: number) => `notifications:${userId}`,
  notificationsCount: (userId: number) => `notifications:count:${userId}`,
  messages: (userId: number) => `messages:${userId}`,
  messagesThread: (threadId: number) => `messages:thread:${threadId}`,
};

// Invalidation helpers
export const invalidateCache = {
  forUser: (userId: number) => {
    cache.deletePattern(`dashboard:${userId}`);
    cache.deletePattern(`dashboard:volunteer:${userId}`);
    cache.delete(cacheKeys.userProfile(userId));
    cache.delete(cacheKeys.volunteerProfile(userId));
    cache.delete(cacheKeys.aiuSummary(userId));
    cache.delete(cacheKeys.notifications(userId));
    cache.delete(cacheKeys.notificationsCount(userId));
    cache.delete(cacheKeys.messages(userId));
  },

  forOrganization: (orgId: number) => {
    cache.deletePattern(`dashboard:org:${orgId}`);
    cache.delete(cacheKeys.orgProfile(orgId));
    cache.delete(cacheKeys.projectsList(orgId));
    cache.delete(cacheKeys.opportunities(orgId));
    cache.delete(`tasks:org:${orgId}`);
  },

  forProject: (orgId: number) => {
    cache.delete(cacheKeys.projectsList(orgId));
    cache.delete(cacheKeys.projectsList());
    cache.deletePattern('dashboard:');
    cache.delete(`tasks:org:${orgId}`);
    cache.deletePattern('tasks:');
  },

  forTasks: (orgId?: number, projectId?: number) => {
    if (orgId) cache.delete(`tasks:org:${orgId}`);
    if (projectId) cache.delete(`tasks:project:${projectId}`);
    cache.deletePattern('dashboard:');
  },

  forActivity: (userId: number, orgId?: number) => {
    cache.deletePattern(`dashboard:${userId}`);
    cache.deletePattern(`dashboard:volunteer:${userId}`);
    cache.delete(cacheKeys.aiuSummary(userId));
    if (orgId) cache.deletePattern(`dashboard:org:${orgId}`);
  },

  forNotifications: (userId: number) => {
    cache.delete(cacheKeys.notifications(userId));
    cache.delete(cacheKeys.notificationsCount(userId));
  },

  forMessages: (userId: number, threadId?: number) => {
    cache.delete(cacheKeys.messages(userId));
    if (threadId) cache.delete(cacheKeys.messagesThread(threadId));
  },

  all: () => {
    cache.clear();
  },
};

// Determine persistence path based on environment
const getPersistPath = (): string | undefined => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.CACHE_PERSIST_PATH || '/tmp/synerxus-cache.json';
  }
  // No persistence in development to avoid stale data issues
  return undefined;
};

// Export singleton instance with enhanced configuration
export const cache = new EnhancedMemoryCache({
  maxSize: 5000,                    // Increased from 2000 for better hit rate
  maxMemoryMB: 100,                 // 100MB memory limit
  defaultTTL: CACHE_TTL.DASHBOARD,
  persistPath: getPersistPath(),    // Disk persistence in production
  enableClusterSync: true,          // Sync across cluster workers
});

export default cache;
