/**
 * Profile Cache Utility
 * Provides localStorage-based caching for profile data to enable instant loading
 */

// Cache keys for different profile types
const CACHE_KEYS = {
  VOLUNTEER_PROFILE: 'cachedVolunteerProfile',
  ORGANIZATION_PROFILE: 'cachedOrganizationProfile',
  CORPORATE_PARTNER_PROFILE: 'cachedCorporatePartnerProfile',
  USER_PROFILE: 'cachedUserProfile',
  CACHE_TIMESTAMP: 'profileCacheTimestamp',
} as const;

// Cache duration: 5 minutes in milliseconds
const CACHE_DURATION = 5 * 60 * 1000;

// React Query cache settings for profile data
// These provide a good balance between freshness and instant loading
export const PROFILE_QUERY_CONFIG = {
  staleTime: CACHE_DURATION, // Data considered fresh for 5 minutes
  gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes after last use
  refetchOnMount: 'always' as const, // Always check for updates on mount
  refetchOnWindowFocus: false, // Don't refetch on window focus (too disruptive)
};

// Shorter cache for data that changes more frequently
export const PROFILE_ACTIVITY_QUERY_CONFIG = {
  staleTime: 60 * 1000, // 1 minute for activity data
  gcTime: 5 * 60 * 1000, // 5 minutes in cache
  refetchOnMount: true,
};

/**
 * Get user-specific cache key
 */
function getUserCacheKey(baseKey: string, userId: string | null): string {
  return userId ? `${baseKey}_${userId}` : baseKey;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(userId: string | null): boolean {
  const timestampKey = getUserCacheKey(CACHE_KEYS.CACHE_TIMESTAMP, userId);
  const timestamp = localStorage.getItem(timestampKey);
  if (!timestamp) return false;

  const cacheTime = parseInt(timestamp, 10);
  return Date.now() - cacheTime < CACHE_DURATION;
}

/**
 * Update cache timestamp
 */
function updateCacheTimestamp(userId: string | null): void {
  const timestampKey = getUserCacheKey(CACHE_KEYS.CACHE_TIMESTAMP, userId);
  localStorage.setItem(timestampKey, Date.now().toString());
}

/**
 * Save volunteer profile to cache
 */
export function cacheVolunteerProfile(userId: string | null, data: any): void {
  if (!userId || !data) return;
  try {
    const key = getUserCacheKey(CACHE_KEYS.VOLUNTEER_PROFILE, userId);
    localStorage.setItem(key, JSON.stringify(data));
    updateCacheTimestamp(userId);
  } catch (error) {
    console.warn('[ProfileCache] Failed to cache volunteer profile:', error);
  }
}

/**
 * Get cached volunteer profile
 */
export function getCachedVolunteerProfile(userId: string | null): any | null {
  if (!userId) return null;
  try {
    const key = getUserCacheKey(CACHE_KEYS.VOLUNTEER_PROFILE, userId);
    const cached = localStorage.getItem(key);
    if (cached && isCacheValid(userId)) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.warn('[ProfileCache] Failed to read cached volunteer profile:', error);
    return null;
  }
}

/**
 * Save organization profile to cache
 */
export function cacheOrganizationProfile(userId: string | null, data: any): void {
  if (!userId || !data) return;
  try {
    const key = getUserCacheKey(CACHE_KEYS.ORGANIZATION_PROFILE, userId);
    localStorage.setItem(key, JSON.stringify(data));
    updateCacheTimestamp(userId);
  } catch (error) {
    console.warn('[ProfileCache] Failed to cache organization profile:', error);
  }
}

/**
 * Get cached organization profile
 */
export function getCachedOrganizationProfile(userId: string | null): any | null {
  if (!userId) return null;
  try {
    const key = getUserCacheKey(CACHE_KEYS.ORGANIZATION_PROFILE, userId);
    const cached = localStorage.getItem(key);
    if (cached && isCacheValid(userId)) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.warn('[ProfileCache] Failed to read cached organization profile:', error);
    return null;
  }
}

/**
 * Save corporate partner profile to cache
 */
export function cacheCorporatePartnerProfile(userId: string | null, data: any): void {
  if (!userId || !data) return;
  try {
    const key = getUserCacheKey(CACHE_KEYS.CORPORATE_PARTNER_PROFILE, userId);
    localStorage.setItem(key, JSON.stringify(data));
    updateCacheTimestamp(userId);
  } catch (error) {
    console.warn('[ProfileCache] Failed to cache corporate partner profile:', error);
  }
}

/**
 * Get cached corporate partner profile
 */
export function getCachedCorporatePartnerProfile(userId: string | null): any | null {
  if (!userId) return null;
  try {
    const key = getUserCacheKey(CACHE_KEYS.CORPORATE_PARTNER_PROFILE, userId);
    const cached = localStorage.getItem(key);
    if (cached && isCacheValid(userId)) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.warn('[ProfileCache] Failed to read cached corporate partner profile:', error);
    return null;
  }
}

/**
 * Save user data to cache
 */
export function cacheUserProfile(userId: string | null, data: any): void {
  if (!userId || !data) return;
  try {
    const key = getUserCacheKey(CACHE_KEYS.USER_PROFILE, userId);
    localStorage.setItem(key, JSON.stringify(data));
    updateCacheTimestamp(userId);
  } catch (error) {
    console.warn('[ProfileCache] Failed to cache user profile:', error);
  }
}

/**
 * Get cached user data
 */
export function getCachedUserProfile(userId: string | null): any | null {
  if (!userId) return null;
  try {
    const key = getUserCacheKey(CACHE_KEYS.USER_PROFILE, userId);
    const cached = localStorage.getItem(key);
    if (cached && isCacheValid(userId)) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.warn('[ProfileCache] Failed to read cached user profile:', error);
    return null;
  }
}

/**
 * Clear all profile caches for a user
 */
export function clearProfileCache(userId: string | null): void {
  if (!userId) return;
  try {
    Object.values(CACHE_KEYS).forEach(baseKey => {
      const key = getUserCacheKey(baseKey, userId);
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('[ProfileCache] Failed to clear profile cache:', error);
  }
}

/**
 * Clear all profile caches (for logout)
 */
export function clearAllProfileCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && Object.values(CACHE_KEYS).some(cacheKey => key.startsWith(cacheKey))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('[ProfileCache] Failed to clear all profile caches:', error);
  }
}
