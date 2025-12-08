/**
 * API Error Handler
 * Provides consistent error handling for API calls
 */

import { toast } from "@/hooks/use-toast";

export interface APIError {
  message: string;
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
}

export interface APIErrorOptions {
  showToast?: boolean;
  toastTitle?: string;
  logError?: boolean;
  rethrow?: boolean;
}

const DEFAULT_OPTIONS: APIErrorOptions = {
  showToast: true,
  toastTitle: "Error",
  logError: true,
  rethrow: false,
};

/**
 * Parse error response from API
 */
export function parseAPIError(error: unknown): APIError {
  // Handle Response objects
  if (error instanceof Response) {
    return {
      message: `Request failed with status ${error.status}`,
      status: error.status,
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  // Handle API error responses
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    return {
      message: (err.message as string) || "An unknown error occurred",
      status: err.status as number | undefined,
      code: err.code as string | undefined,
      details: err.details as Record<string, unknown> | undefined,
    };
  }

  // Handle string errors
  if (typeof error === "string") {
    return { message: error };
  }

  return { message: "An unknown error occurred" };
}

/**
 * Handle API errors consistently
 */
export function handleAPIError(
  error: unknown,
  options: APIErrorOptions = {}
): APIError {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parsedError = parseAPIError(error);

  // Log error if enabled
  if (opts.logError) {
    console.error("API Error:", parsedError);
  }

  // Show toast if enabled
  if (opts.showToast) {
    toast({
      title: opts.toastTitle,
      description: parsedError.message,
      variant: "destructive",
    });
  }

  // Rethrow if needed
  if (opts.rethrow) {
    throw error;
  }

  return parsedError;
}

/**
 * Create an async error handler wrapper
 */
export function withErrorHandler<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: APIErrorOptions = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    try {
      return await fn(...args) as ReturnType<T>;
    } catch (error) {
      handleAPIError(error, options);
      return undefined;
    }
  }) as T;
}

/**
 * Safe fetch wrapper that handles errors consistently
 */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit,
  errorOptions?: APIErrorOptions
): Promise<{ data: T | null; error: APIError | null }> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: APIError = {
        message: errorData.message || `Request failed with status ${response.status}`,
        status: response.status,
        code: errorData.code,
        details: errorData.details,
      };

      if (errorOptions?.showToast !== false) {
        handleAPIError(error, { ...errorOptions, rethrow: false });
      }

      return { data: null, error };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    const parsedError = handleAPIError(error, errorOptions);
    return { data: null, error: parsedError };
  }
}

/**
 * Map HTTP status codes to user-friendly messages
 */
export function getStatusMessage(status: number): string {
  const messages: Record<number, string> = {
    400: "Invalid request. Please check your input.",
    401: "You need to log in to perform this action.",
    403: "You don't have permission to perform this action.",
    404: "The requested resource was not found.",
    408: "The request timed out. Please try again.",
    409: "There was a conflict with the current state.",
    422: "The provided data was invalid.",
    429: "Too many requests. Please wait and try again.",
    500: "A server error occurred. Please try again later.",
    502: "The server is temporarily unavailable.",
    503: "The service is temporarily unavailable.",
    504: "The request timed out. Please try again.",
  };

  return messages[status] || `An error occurred (status ${status})`;
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.includes("fetch") || error.message.includes("network");
  }
  return false;
}

/**
 * Check if an error is an authentication error
 */
export function isAuthError(error: APIError): boolean {
  return error.status === 401 || error.status === 403;
}

/**
 * Check if an error is a validation error
 */
export function isValidationError(error: APIError): boolean {
  return error.status === 400 || error.status === 422;
}

export default {
  parseAPIError,
  handleAPIError,
  withErrorHandler,
  safeFetch,
  getStatusMessage,
  isNetworkError,
  isAuthError,
  isValidationError,
};
