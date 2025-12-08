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
};
