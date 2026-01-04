import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Get current Firebase user's ID token for API authentication
 * Returns null if user is not authenticated
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (user) {
      // Get fresh ID token (Firebase automatically refreshes expired tokens)
      return await user.getIdToken();
    }
  } catch (error) {
    console.error("Error getting auth token:", error);
  }
  return null;
}

/**
 * Get Firebase UID for API authentication (fallback)
 */
function getFirebaseUid(): string | null {
  const user = auth.currentUser;
  return user?.uid || null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // SECURITY: Use Firebase ID token for secure authentication
  // ID tokens are cryptographically signed and can be verified on the backend
  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // SECURITY: Use Firebase ID token for secure authentication
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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
    
    const res = await fetch(url, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // OPTIMIZATION: Use realistic stale times to reduce API calls
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache for reuse (formerly cacheTime)
      // Smart retry with exponential backoff for network errors only
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.message?.startsWith('4')) return false;
        // Retry up to 2 times for network/server errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Only retry on network errors, not validation errors
        if (error?.message?.startsWith('4')) return false;
        return failureCount < 1;
      },
      retryDelay: 1000,
    },
  },
});

// Prefetch common queries on app load for faster initial render
export const prefetchCommonQueries = async (userId: string | null) => {
  if (!userId) return;

  // Prefetch in parallel for faster loading
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ["/api/users/me", userId],
      staleTime: 10 * 60 * 1000, // User data stays fresh longer
    }),
    queryClient.prefetchQuery({
      queryKey: ["/api/dashboard/summary", userId],
      staleTime: 2 * 60 * 1000, // Dashboard updates more frequently
    }),
  ]);
};
