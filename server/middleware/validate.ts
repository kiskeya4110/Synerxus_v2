/**
 * Request Validation Middleware
 *
 * Provides type-safe request validation using Zod schemas
 * for body, query, and params validation.
 */

import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema, ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import { sendErrorResponse, ValidationError } from "../utils/errors";

// ============================================
// Validation Types
// ============================================

interface ValidatedRequest<TBody = any, TQuery = any, TParams = any> extends Request {
  validatedBody: TBody;
  validatedQuery: TQuery;
  validatedParams: TParams;
}

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

// ============================================
// Validation Middleware
// ============================================

/**
 * Create a validation middleware for request body, query, and/or params
 *
 * @example
 * ```ts
 * const createUserSchema = {
 *   body: z.object({
 *     email: z.string().email(),
 *     name: z.string().min(1),
 *   }),
 * };
 *
 * router.post("/users", validate(createUserSchema), (req, res) => {
 *   const { email, name } = req.validatedBody;
 *   // Types are inferred from the schema
 * });
 * ```
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (schemas.body) {
        (req as ValidatedRequest).validatedBody = schemas.body.parse(req.body);
      }

      // Validate query
      if (schemas.query) {
        (req as ValidatedRequest).validatedQuery = schemas.query.parse(req.query);
      }

      // Validate params
      if (schemas.params) {
        (req as ValidatedRequest).validatedParams = schemas.params.parse(req.params);
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        return sendErrorResponse(res, new ValidationError(validationError.message, err.errors));
      }
      sendErrorResponse(res, err);
    }
  };
}

/**
 * Validate request body only
 */
export function validateBody<T extends ZodSchema>(schema: T): RequestHandler {
  return validate({ body: schema });
}

/**
 * Validate query parameters only
 */
export function validateQuery<T extends ZodSchema>(schema: T): RequestHandler {
  return validate({ query: schema });
}

/**
 * Validate URL params only
 */
export function validateParams<T extends ZodSchema>(schema: T): RequestHandler {
  return validate({ params: schema });
}

// ============================================
// Common Validation Schemas
// ============================================

/**
 * Common ID parameter schema
 */
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a positive integer").transform(Number),
});

/**
 * Pagination query schema
 */
export const paginationSchema = z.object({
  page: z.string().optional().default("1").transform(Number),
  limit: z.string().optional().default("20").transform(Number),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

/**
 * Time period filter schema
 */
export const timePeriodSchema = z.object({
  timePeriod: z.enum(["7d", "30d", "90d", "1y", "all"]).optional().default("all"),
});

/**
 * User ID query schema
 */
export const userIdQuerySchema = z.object({
  userId: z.string().regex(/^\d+$/, "userId must be a positive integer").transform(Number),
});

/**
 * Optional user ID query schema
 */
export const optionalUserIdQuerySchema = z.object({
  userId: z.string().regex(/^\d+$/, "userId must be a positive integer").transform(Number).optional(),
});

/**
 * Organization ID query schema
 */
export const organizationIdQuerySchema = z.object({
  organizationId: z.string().regex(/^\d+$/, "organizationId must be a positive integer").transform(Number),
});

/**
 * Project ID query schema
 */
export const projectIdQuerySchema = z.object({
  projectId: z.string().regex(/^\d+$/, "projectId must be a positive integer").transform(Number),
});

// ============================================
// Input Sanitization
// ============================================

/**
 * Sanitize a string to prevent XSS
 * Removes potentially dangerous HTML/JS content
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return input;

  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Create a Zod string transformer that sanitizes input
 */
export const sanitizedString = z.string().transform(sanitizeString);

/**
 * Create a Zod schema for a non-empty sanitized string
 */
export const requiredSanitizedString = z
  .string()
  .min(1, "This field is required")
  .transform(sanitizeString);

/**
 * Email schema with validation and lowercase transformation
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .transform((val) => val.toLowerCase().trim());

/**
 * URL schema with validation
 */
export const urlSchema = z.string().url("Invalid URL");

/**
 * Phone number schema (basic validation)
 */
export const phoneSchema = z
  .string()
  .regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number format")
  .transform((val) => val.replace(/\s/g, ""));

// ============================================
// Type Helpers
// ============================================

/**
 * Extract the validated body type from a schema
 */
export type ValidatedBody<T extends ZodSchema> = z.infer<T>;

/**
 * Extract the validated query type from a schema
 */
export type ValidatedQuery<T extends ZodSchema> = z.infer<T>;

/**
 * Extract the validated params type from a schema
 */
export type ValidatedParams<T extends ZodSchema> = z.infer<T>;
