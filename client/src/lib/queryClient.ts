import { QueryClient, QueryFunction } from "@tanstack/react-query";

// =============================================================================
// ETAG CACHE - Store ETags for conditional requests (304 optimization)
// =============================================================================
const etagCache = new Map<string, { etag: string; data: any }>();

// =============================================================================
// CSRF TOKEN MANAGEMENT - Secure state-changing requests
// =============================================================================
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

/**
 * Fetch CSRF token from the server
 * Uses a singleton promise to prevent multiple concurrent fetches
 */
async function fetchCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;

  if (csrfTokenPromise) return csrfTokenPromise;

  csrfTokenPromise = (async () => {
    try {
      const res = await fetch('/api/csrf-token', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        csrfToken = data.csrfToken;
        return csrfToken;
      }
    } catch (error) {
      console.warn('Failed to fetch CSRF token:', error);
    }
    return null;
  })();

  return csrfTokenPromise;
}

/**
 * Clear CSRF token (call on logout)
 */
export function clearCsrfToken(): void {
  csrfToken = null;
  csrfTokenPromise = null;
}

/**
 * Initialize CSRF token (call on app load)
 */
export async function initializeCsrfToken(): Promise<void> {
  await fetchCsrfToken();
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok && res.status !== 304) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const userId = localStorage.getItem('currentUserId');
  const headers: Record<string, string> = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  if (userId) {
    headers["x-user-id"] = userId;
  }

  // Add CSRF token for state-changing requests (POST, PUT, PATCH, DELETE)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    const token = await fetchCsrfToken();
    if (token) {
      headers["X-CSRF-Token"] = token;
    }
  }

  // Add ETag for conditional requests on GET
  if (method === 'GET') {
    const cached = etagCache.get(url);
    if (cached?.etag) {
      headers["If-None-Match"] = cached.etag;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // If CSRF token expired, refresh it and retry once
  if (res.status === 403) {
    const errorText = await res.clone().text();
    if (errorText.includes('CSRF')) {
      clearCsrfToken();
      const newToken = await fetchCsrfToken();
      if (newToken) {
        headers["X-CSRF-Token"] = newToken;
        const retryRes = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });
        await throwIfResNotOk(retryRes);
        return retryRes;
      }
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const userId = localStorage.getItem('currentUserId');
    const headers: Record<string, string> = {};

    if (userId) {
      headers["x-user-id"] = userId;
    }

    // Build URL with query parameters from queryKey
    let url = queryKey[0] as string;

    // Handle special cases for intake endpoints with IDs
    if (queryKey.length > 1) {
      if (url.includes('/intake/volunteer-profile') && queryKey[1]) {
        url = `${url}?userId=${queryKey[1]}`;
      } else if (url.includes('/intake/organization-profile') && queryKey[1]) {
        url = `${url}?organizationId=${queryKey[1]}`;
      }
    }

    // OPTIMIZATION: Add ETag for conditional requests (304 Not Modified)
    const cached = etagCache.get(url);
    if (cached?.etag) {
      headers["If-None-Match"] = cached.etag;
    }

    const res = await fetch(url, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // Handle 304 Not Modified - return cached data
    if (res.status === 304 && cached?.data) {
      return cached.data;
    }

    await throwIfResNotOk(res);
    const data = await res.json();

    // Store ETag and data for future conditional requests
    const etag = res.headers.get('ETag');
    if (etag) {
      etagCache.set(url, { etag, data });
    }

    return data;
  };

// =============================================================================
// QUERY CLIENT - OPTIMIZED for 95%+ performance
// =============================================================================
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // OPTIMIZATION: Aggressive stale times for better cache utilization
      staleTime: 2 * 60 * 1000, // 2 minutes - allow more cache hits
      gcTime: 10 * 60 * 1000,   // 10 minutes - keep data in memory longer
      retry: 1,                  // Retry once on failure
      retryDelay: 1000,          // 1 second delay between retries
      // Structural sharing for better memory efficiency
      structuralSharing: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// =============================================================================
// PREFETCH UTILITIES - Warm cache before navigation
// =============================================================================
export const prefetchQueries = {
  // Prefetch dashboard data
  dashboard: (userId: number) => {
    queryClient.prefetchQuery({
      queryKey: [`/api/dashboard?userId=${userId}`],
      staleTime: 60 * 1000,
    });
  },

  // Prefetch user profile
  userProfile: (userId: number) => {
    queryClient.prefetchQuery({
      queryKey: [`/api/users/${userId}`],
      staleTime: 5 * 60 * 1000,
    });
  },

  // Prefetch opportunities for volunteer
  opportunities: (userId: number) => {
    queryClient.prefetchQuery({
      queryKey: [`/api/opportunities?userId=${userId}`],
      staleTime: 2 * 60 * 1000,
    });
  },

  // Prefetch projects for organization
  projects: (orgId: number) => {
    queryClient.prefetchQuery({
      queryKey: [`/api/projects?organizationId=${orgId}`],
      staleTime: 2 * 60 * 1000,
    });
  },
};

// Clear caches (call on logout)
export const clearEtagCache = () => {
  etagCache.clear();
};

// Clear all security-related caches (call on logout)
export const clearSecurityCaches = () => {
  etagCache.clear();
  clearCsrfToken();
};
