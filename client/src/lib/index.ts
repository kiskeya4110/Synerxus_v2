/**
 * Library Index
 *
 * Central export point for commonly used utilities.
 * Import from "@/lib" instead of individual files.
 */

// Safe array utilities - prevent runtime errors from undefined arrays
export {
  safeArray,
  safeMap,
  safeFilter,
  safeReduce,
  safeFind,
  safeEvery,
  safeSome,
  safeIncludes,
  safeLength,
  safeFirst,
  safeLast,
  isNonEmptyArray,
  safeFlatten,
  safeConcat,
} from "./safe-array";

// API error handling
export {
  handleAPIError,
  parseAPIError,
  withErrorHandler,
  safeFetch,
  getStatusMessage,
  isNetworkError,
  isAuthError,
  isValidationError,
  type APIError,
  type APIErrorOptions,
} from "./api-error-handler";

// Performance utilities
export {
  useDebounce,
  useThrottle,
  useDeepMemo,
  useDeepCallback,
  useStableCallback,
  createMemoizer,
  LRUCache,
  batchUpdates,
  lazy,
  measurePerformance,
  measureAsyncPerformance,
  deepEqual,
} from "./performance";

// Logger
export {
  debug,
  info,
  warn,
  error,
  log,
  createLogger,
  configureLogger,
  time,
  group,
  table,
  default as logger,
} from "./logger";

// General utilities
export { cn } from "./utils";

// Format utilities
export * from "./format-utils";

// SDG utilities
export * from "./sdg-utils";
