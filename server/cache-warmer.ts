/**
 * Cache Warming and Background Refresh Service
 *
 * Pre-warms critical caches on server startup and periodically refreshes
 * frequently accessed data to ensure fast response times.
 */

import { cache, CACHE_TTL, cacheKeys } from './cache';
import { storage } from './storage';
import { logger } from './logger';

// Configuration - use environment variables for flexibility
const WARM_UP_DELAY = 5000; // Wait 5 seconds after server start before warming
const BACKGROUND_REFRESH_INTERVAL = parseInt(process.env.CACHE_REFRESH_INTERVAL || '300000', 10); // Default: 5 minutes (was 60s)
const MAX_USERS_TO_WARM = 50; // Limit number of user dashboards to pre-warm
const DISABLE_CACHE_WARMER = process.env.DISABLE_CACHE_WARMER === 'true' || process.env.NODE_ENV === 'development';

let refreshInterval: NodeJS.Timeout | null = null;
let isWarming = false;

/**
 * Pre-warm critical caches on server startup
 */
export async function warmupCache(): Promise<void> {
  if (DISABLE_CACHE_WARMER) {
    logger.info('[CacheWarmer] Cache warming disabled (development mode or DISABLE_CACHE_WARMER=true)');
    return;
  }

  if (isWarming) {
    logger.info('[CacheWarmer] Cache warming already in progress, skipping...');
    return;
  }

  isWarming = true;
  const startTime = Date.now();
  logger.info('[CacheWarmer] Starting cache warm-up...');

  try {
    // Warm up in parallel where possible
    await Promise.all([
      warmOrganizations(),
      warmUsers(),
      warmImpactMetrics(),
      warmProjects(),
      warmOpportunities(),
    ]);

    const duration = Date.now() - startTime;
    const stats = cache.getStats();
    logger.info(`[CacheWarmer] Cache warm-up complete in ${duration}ms`, {
      cacheSize: stats.size,
      hitRate: stats.hitRate,
    });
  } catch (error) {
    logger.error('[CacheWarmer] Error during cache warm-up:', error);
  } finally {
    isWarming = false;
  }
}

/**
 * Warm organizations cache
 */
async function warmOrganizations(): Promise<void> {
  try {
    const organizations = await storage.listOrganizations();
    cache.set('organizations:all', organizations, CACHE_TTL.STATIC);
    logger.info(`[CacheWarmer] Warmed ${organizations.length} organizations`);
  } catch (error) {
    logger.error('[CacheWarmer] Failed to warm organizations:', error);
  }
}

/**
 * Warm users cache by type
 */
async function warmUsers(): Promise<void> {
  try {
    const users = await storage.listUsers();
    cache.set('users:all', users, CACHE_TTL.USER_PROFILE);

    // Cache by type
    const volunteers = users.filter(u => u.userType === 'volunteer');
    const orgUsers = users.filter(u => u.userType === 'organization');
    const csrUsers = users.filter(u => u.userType === 'corporate-partner');

    cache.set('users:type:volunteer', volunteers, CACHE_TTL.USER_PROFILE);
    cache.set('users:type:organization', orgUsers, CACHE_TTL.USER_PROFILE);
    cache.set('users:type:corporate-partner', csrUsers, CACHE_TTL.USER_PROFILE);

    logger.info(`[CacheWarmer] Warmed ${users.length} users (${volunteers.length} volunteers, ${orgUsers.length} org, ${csrUsers.length} CSR)`);
  } catch (error) {
    logger.error('[CacheWarmer] Failed to warm users:', error);
  }
}

/**
 * Warm impact metrics cache (rarely changes)
 */
async function warmImpactMetrics(): Promise<void> {
  try {
    const metrics = await storage.listImpactMetrics();
    cache.set(cacheKeys.impactMetrics(), metrics, CACHE_TTL.STATIC);
    logger.info(`[CacheWarmer] Warmed ${metrics.length} impact metrics`);
  } catch (error) {
    logger.error('[CacheWarmer] Failed to warm impact metrics:', error);
  }
}

/**
 * Warm projects cache
 */
async function warmProjects(): Promise<void> {
  try {
    const projects = await storage.listProjects();
    cache.set('projects:all', projects, CACHE_TTL.PROJECTS_LIST);

    // Group by organization for faster org-specific lookups
    const projectsByOrg = new Map<number, typeof projects>();
    for (const project of projects) {
      if (project.organizationId) {
        const orgProjects = projectsByOrg.get(project.organizationId) || [];
        orgProjects.push(project);
        projectsByOrg.set(project.organizationId, orgProjects);
      }
    }

    // Cache each organization's projects
    projectsByOrg.forEach((orgProjects, orgId) => {
      cache.set(cacheKeys.projectsList(orgId), orgProjects, CACHE_TTL.PROJECTS_LIST);
    });

    logger.info(`[CacheWarmer] Warmed ${projects.length} projects across ${projectsByOrg.size} organizations`);
  } catch (error) {
    logger.error('[CacheWarmer] Failed to warm projects:', error);
  }
}

/**
 * Warm opportunities cache
 */
async function warmOpportunities(): Promise<void> {
  try {
    const opportunities = await storage.listOpportunities();
    cache.set('opportunities:all', opportunities, CACHE_TTL.OPPORTUNITIES);

    // Filter open opportunities
    const openOpportunities = opportunities.filter(o => o.status === 'open');
    cache.set('opportunities:open', openOpportunities, CACHE_TTL.OPPORTUNITIES);

    logger.info(`[CacheWarmer] Warmed ${opportunities.length} opportunities (${openOpportunities.length} open)`);
  } catch (error) {
    logger.error('[CacheWarmer] Failed to warm opportunities:', error);
  }
}

/**
 * Start background cache refresh
 */
export function startBackgroundRefresh(): void {
  if (DISABLE_CACHE_WARMER) {
    logger.info('[CacheWarmer] Background refresh disabled (development mode or DISABLE_CACHE_WARMER=true)');
    return;
  }

  if (refreshInterval) {
    logger.warn('[CacheWarmer] Background refresh already running');
    return;
  }

  logger.info(`[CacheWarmer] Starting background refresh (every ${BACKGROUND_REFRESH_INTERVAL / 1000}s)`);

  refreshInterval = setInterval(async () => {
    try {
      const stats = cache.getStats();

      // Only refresh if cache hit rate is good (means data is being used)
      const hitRateNum = parseFloat(stats.hitRate);
      if (hitRateNum > 50) {
        logger.debug('[CacheWarmer] Running background refresh...', { hitRate: stats.hitRate });
        await refreshCriticalCaches();
      } else {
        logger.debug('[CacheWarmer] Skipping refresh (low hit rate)', { hitRate: stats.hitRate });
      }
    } catch (error) {
      logger.error('[CacheWarmer] Background refresh error:', error);
    }
  }, BACKGROUND_REFRESH_INTERVAL);
}

/**
 * Refresh only the most critical caches
 */
async function refreshCriticalCaches(): Promise<void> {
  // Refresh in sequence to avoid overwhelming the database
  await warmUsers();
  await warmProjects();
  await warmOpportunities();
}

/**
 * Stop background cache refresh
 */
export function stopBackgroundRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    logger.info('[CacheWarmer] Background refresh stopped');
  }
}

/**
 * Initialize cache warming after server startup
 */
export function initCacheWarming(): void {
  // Delay warming to allow server to fully start
  setTimeout(async () => {
    await warmupCache();
    startBackgroundRefresh();
  }, WARM_UP_DELAY);

  logger.info(`[CacheWarmer] Cache warming scheduled (starting in ${WARM_UP_DELAY / 1000}s)`);
}

/**
 * Get cache warmer status
 */
export function getCacheWarmerStatus(): {
  isWarming: boolean;
  refreshRunning: boolean;
  disabled: boolean;
  refreshIntervalMs: number;
  cacheStats: ReturnType<typeof cache.getStats>;
} {
  return {
    isWarming,
    refreshRunning: refreshInterval !== null,
    disabled: DISABLE_CACHE_WARMER,
    refreshIntervalMs: BACKGROUND_REFRESH_INTERVAL,
    cacheStats: cache.getStats(),
  };
}

export default {
  warmupCache,
  startBackgroundRefresh,
  stopBackgroundRefresh,
  initCacheWarming,
  getCacheWarmerStatus,
};
