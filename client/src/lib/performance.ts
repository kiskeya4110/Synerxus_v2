/**
 * Performance Utilities
 * Helpers for optimizing React component performance
 */

import { useRef, useCallback, useMemo, useEffect } from "react";

/**
 * Deep comparison for memoization
 * More efficient than JSON.stringify for most cases
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (typeof a !== typeof b) return false;

  if (a === null || b === null) return a === b;

  if (typeof a !== "object") return a === b;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
}

/**
 * Custom hook for deep memoization
 * Only recalculates when deep comparison detects changes
 */
export function useDeepMemo<T>(factory: () => T, deps: unknown[]): T {
  const ref = useRef<{ deps: unknown[]; value: T }>();

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
}

/**
 * Custom hook for deep callback memoization
 */
export function useDeepCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: unknown[]
): T {
  const ref = useRef<{ deps: unknown[]; callback: T }>();

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps, callback };
  }

  return ref.current.callback;
}

/**
 * Debounce hook for expensive operations
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook for rate-limiting updates
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdated.current >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - (now - lastUpdated.current));
      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

// Import useState for hooks that need it
import { useState } from "react";

/**
 * Create a stable callback reference that doesn't change identity
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Memoize expensive calculations with cache
 */
export function createMemoizer<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  keyFn?: (...args: TArgs) => string
): (...args: TArgs) => TResult {
  const cache = new Map<string, TResult>();
  const defaultKeyFn = (...args: TArgs) => JSON.stringify(args);

  return (...args: TArgs): TResult => {
    const key = (keyFn || defaultKeyFn)(...args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * LRU Cache implementation for bounded memoization
 */
export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Batch updates to prevent excessive re-renders
 */
export function batchUpdates<T>(
  updates: T[],
  processFn: (items: T[]) => void,
  batchSize = 10,
  delayMs = 0
): void {
  let index = 0;

  const processNextBatch = () => {
    const batch = updates.slice(index, index + batchSize);
    if (batch.length === 0) return;

    processFn(batch);
    index += batchSize;

    if (index < updates.length) {
      if (delayMs > 0) {
        setTimeout(processNextBatch, delayMs);
      } else {
        requestAnimationFrame(processNextBatch);
      }
    }
  };

  processNextBatch();
}

/**
 * Lazy initialization helper
 */
export function lazy<T>(factory: () => T): () => T {
  let instance: T | undefined;
  let initialized = false;

  return () => {
    if (!initialized) {
      instance = factory();
      initialized = true;
    }
    return instance!;
  };
}

/**
 * Performance measurement utility
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T,
  logThreshold = 16 // 16ms = 1 frame at 60fps
): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  if (duration > logThreshold) {
    console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Async performance measurement
 */
export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>,
  logThreshold = 100
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (duration > logThreshold) {
    console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

// =============================================================================
// API TIMING UTILITIES
// =============================================================================

/**
 * Timed fetch wrapper that returns timing metrics
 */
export async function timedFetch<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T; timing: { total: number; ttfb: number }; status: number }> {
  const startTime = performance.now();

  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...options?.headers,
    },
  });

  const ttfb = performance.now() - startTime;
  const data = await response.json();
  const total = performance.now() - startTime;

  // Report slow API calls
  if (total > 200) {
    console.warn(`[SLOW API] ${url} took ${total.toFixed(0)}ms (TTFB: ${ttfb.toFixed(0)}ms)`);
  }

  return { data, timing: { total, ttfb }, status: response.status };
}

/**
 * API Performance Tracker for monitoring endpoint performance
 */
class APIPerformanceTracker {
  private metrics: Map<string, { count: number; totalMs: number; maxMs: number; minMs: number }> = new Map();

  track(endpoint: string, durationMs: number): void {
    const existing = this.metrics.get(endpoint) || { count: 0, totalMs: 0, maxMs: 0, minMs: Infinity };
    this.metrics.set(endpoint, {
      count: existing.count + 1,
      totalMs: existing.totalMs + durationMs,
      maxMs: Math.max(existing.maxMs, durationMs),
      minMs: Math.min(existing.minMs, durationMs),
    });
  }

  getStats(): Record<string, { count: number; avgMs: string; maxMs: string; minMs: string }> {
    const stats: Record<string, { count: number; avgMs: string; maxMs: string; minMs: string }> = {};
    this.metrics.forEach((data, endpoint) => {
      stats[endpoint] = {
        count: data.count,
        avgMs: (data.totalMs / data.count).toFixed(2),
        maxMs: data.maxMs.toFixed(2),
        minMs: data.minMs === Infinity ? '0' : data.minMs.toFixed(2),
      };
    });
    return stats;
  }

  clear(): void {
    this.metrics.clear();
  }
}

export const apiTracker = new APIPerformanceTracker();

// =============================================================================
// COMPONENT RENDER TRACKING
// =============================================================================

/**
 * Hook to track component render times
 * Usage: useRenderTiming('MyComponent')
 */
export function useRenderTiming(componentName: string, logThreshold = 16): void {
  const renderStart = useRef(performance.now());
  const renderCount = useRef(0);

  useEffect(() => {
    const renderTime = performance.now() - renderStart.current;
    renderCount.current++;

    if (renderTime > logThreshold) {
      console.warn(`[SLOW RENDER] ${componentName}: ${renderTime.toFixed(2)}ms (render #${renderCount.current})`);
    }

    // Reset for next render
    renderStart.current = performance.now();
  });
}

/**
 * Hook to track component mount time
 */
export function useMountTiming(componentName: string): void {
  useEffect(() => {
    const mountTime = performance.now();
    console.log(`[MOUNT] ${componentName} mounted at ${mountTime.toFixed(2)}ms from page load`);

    return () => {
      console.log(`[UNMOUNT] ${componentName} unmounted`);
    };
  }, [componentName]);
}

// =============================================================================
// WEBSOCKET CLIENT UTILITIES
// =============================================================================

/**
 * WebSocket connection manager for real-time updates
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private isAuthenticated = false;

  constructor(private url: string) {}

  connect(userId: number, userType: string, organizationId?: number): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;

        // Authenticate
        this.send({
          type: 'auth',
          userId,
          userType,
          organizationId,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'auth_success') {
            this.isAuthenticated = true;
            console.log('[WebSocket] Authenticated successfully');
          }

          // Dispatch to handlers
          const handlers = this.messageHandlers.get(message.type) || [];
          handlers.forEach((handler) => handler(message.data));

          // Dispatch to wildcard handlers
          const wildcardHandlers = this.messageHandlers.get('*') || [];
          wildcardHandlers.forEach((handler) => handler(message));
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.isAuthenticated = false;
        this.attemptReconnect(userId, userType, organizationId);
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
    }
  }

  private attemptReconnect(userId: number, userType: string, organizationId?: number): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect(userId, userType, organizationId);
    }, delay);
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Not connected, cannot send message');
    }
  }

  subscribe(type: string, handler: (data: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get authenticated(): boolean {
    return this.isAuthenticated;
  }
}

// Create singleton instance for production
export const wsManager = typeof window !== 'undefined'
  ? new WebSocketManager(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`)
  : null;

// =============================================================================
// REACT QUERY INTEGRATION HELPERS
// =============================================================================

/**
 * Create optimized query options with performance tracking
 */
export function createTrackedQueryOptions<T>(
  endpoint: string,
  options: {
    staleTime?: number;
    cacheTime?: number;
    refetchInterval?: number;
  } = {}
) {
  return {
    queryKey: [endpoint],
    queryFn: async () => {
      const startTime = performance.now();
      const response = await fetch(endpoint);
      const data = await response.json();
      const duration = performance.now() - startTime;

      apiTracker.track(endpoint, duration);

      if (duration > 100) {
        console.warn(`[Query] ${endpoint} took ${duration.toFixed(2)}ms`);
      }

      return data as T;
    },
    staleTime: options.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: options.cacheTime ?? 10 * 60 * 1000, // 10 minutes default
    refetchInterval: options.refetchInterval,
  };
}

export default {
  deepEqual,
  useDeepMemo,
  useDeepCallback,
  useDebounce,
  useThrottle,
  useStableCallback,
  createMemoizer,
  LRUCache,
  batchUpdates,
  lazy,
  measurePerformance,
  measureAsyncPerformance,
  timedFetch,
  apiTracker,
  useRenderTiming,
  useMountTiming,
  WebSocketManager,
  wsManager,
  createTrackedQueryOptions,
};
