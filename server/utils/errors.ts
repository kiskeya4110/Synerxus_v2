/**
 * Typed Error Handling Utilities
 *
 * Provides consistent error handling patterns across the application
 * with proper TypeScript types and standardized error responses.
 */

import { Response } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// ============================================
// Error Types
// ============================================

export enum ErrorCode {
  // Client Errors (4xx)
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMITED = "RATE_LIMITED",

  // Server Errors (5xx)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  DATABASE_ERROR = "DATABASE_ERROR",
}

export interface AppError {
  code: ErrorCode;
  message: string;
  status: number;
  details?: unknown;
  timestamp: string;
  requestId?: string;
}

// ============================================
// Custom Error Classes
// ============================================

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;

    // Maintains proper stack trace for V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string | number) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, message, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Authentication required") {
    super(ErrorCode.UNAUTHORIZED, message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "You do not have permission to perform this action") {
    super(ErrorCode.FORBIDDEN, message, 403);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.CONFLICT, message, 409, details);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super(
      ErrorCode.RATE_LIMITED,
      "Too many requests. Please try again later.",
      429,
      retryAfter ? { retryAfter } : undefined
    );
    this.name = "RateLimitError";
  }
}

export class DatabaseError extends ApiError {
  constructor(message = "Database operation failed", details?: unknown) {
    super(ErrorCode.DATABASE_ERROR, message, 500, details);
    this.name = "DatabaseError";
  }
}

// ============================================
// Error Handling Functions
// ============================================

/**
 * Convert any error to a standardized AppError format
 */
export function normalizeError(err: unknown): AppError {
  const timestamp = new Date().toISOString();

  // Handle ApiError instances
  if (err instanceof ApiError) {
    return {
      code: err.code,
      message: err.message,
      status: err.status,
      details: err.details,
      timestamp,
    };
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return {
      code: ErrorCode.VALIDATION_ERROR,
      message: validationError.message,
      status: 400,
      details: err.errors,
      timestamp,
    };
  }

  // Handle plain Error objects
  if (err instanceof Error) {
    return {
      code: ErrorCode.INTERNAL_ERROR,
      message: err.message,
      status: 500,
      timestamp,
    };
  }

  // Handle objects with status/message properties (legacy error format)
  if (err && typeof err === "object" && "status" in err && "message" in err) {
    return {
      code: ErrorCode.BAD_REQUEST,
      message: String((err as any).message),
      status: Number((err as any).status) || 400,
      timestamp,
    };
  }

  // Handle unknown error types
  return {
    code: ErrorCode.INTERNAL_ERROR,
    message: "An unexpected error occurred",
    status: 500,
    timestamp,
  };
}

/**
 * Send a standardized error response
 */
export function sendErrorResponse(res: Response, err: unknown): void {
  const normalizedError = normalizeError(err);

  // Log server errors
  if (normalizedError.status >= 500) {
    console.error(`[${normalizedError.code}] ${normalizedError.message}`, {
      status: normalizedError.status,
      details: normalizedError.details,
      timestamp: normalizedError.timestamp,
    });
  }

  res.status(normalizedError.status).json({
    error: normalizedError.code,
    message: normalizedError.message,
    details: normalizedError.details,
    timestamp: normalizedError.timestamp,
  });
}

/**
 * Async handler wrapper that catches errors and passes them to error handling
 */
export function asyncHandler<T>(
  handler: (req: any, res: Response, next?: any) => Promise<T>
): (req: any, res: Response, next?: any) => void {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((err) => {
      sendErrorResponse(res, err);
    });
  };
}

/**
 * Create a not found error for a specific resource
 */
export function resourceNotFound(resource: string, id?: string | number): never {
  throw new NotFoundError(resource, id);
}

/**
 * Assert a condition, throwing an error if it fails
 */
export function assertExists<T>(
  value: T | null | undefined,
  resource: string,
  id?: string | number
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resource, id);
  }
}

/**
 * Type guard for checking if value is a valid ID (positive integer)
 */
export function isValidId(value: unknown): value is number {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0;
  }
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return !isNaN(parsed) && parsed > 0;
  }
  return false;
}

/**
 * Parse and validate an ID parameter
 */
export function parseId(value: unknown, paramName = "id"): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  throw new ValidationError(`Invalid ${paramName}: must be a positive integer`);
}

/**
 * Safely parse an optional ID (returns undefined if not provided/invalid)
 */
export function parseOptionalId(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  try {
    return parseId(value);
  } catch {
    return undefined;
  }
}

// ============================================
// Result Type Pattern (for functional error handling)
// ============================================

export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Wrap a promise in a Result type
 */
export async function tryCatch<T>(promise: Promise<T>): Promise<Result<T, AppError>> {
  try {
    const data = await promise;
    return success(data);
  } catch (err) {
    return failure(normalizeError(err));
  }
}
