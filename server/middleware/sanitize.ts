/**
 * Input Sanitization Middleware
 *
 * Provides XSS protection by sanitizing all incoming request data.
 * Works in conjunction with Zod validation to provide defense-in-depth.
 *
 * Security Features:
 * - HTML entity encoding for XSS prevention
 * - SQL injection pattern detection (logged, not blocked - ORM handles prevention)
 * - Recursive sanitization of nested objects and arrays
 * - Preserves data types (numbers, booleans remain intact)
 */

import { type Request, Response, NextFunction } from "express";
import { logger } from "../logger";

// HTML entities that need escaping
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

// Suspicious patterns that indicate potential attacks
const SUSPICIOUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
  /javascript:/gi, // JavaScript URLs
  /on\w+\s*=/gi, // Event handlers
  /data:/gi, // Data URLs (can contain scripts)
  /vbscript:/gi, // VBScript URLs
  /expression\s*\(/gi, // CSS expressions
  /url\s*\(/gi, // CSS url() with potential javascript:
];

// SQL injection patterns (for logging only - ORM prevents actual injection)
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b)/i,
  /(\b(UNION|JOIN)\b.*\b(SELECT)\b)/i,
  /('|"|;|--|\*|\/\*)/,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
];

/**
 * Escape HTML entities in a string
 */
function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Check for suspicious patterns and log them
 */
function detectSuspiciousPatterns(value: string, path: string, req: Request): void {
  // Check for XSS patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(value)) {
      logger.warn({
        type: 'SECURITY_XSS_ATTEMPT',
        path,
        pattern: pattern.toString(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        endpoint: `${req.method} ${req.path}`,
        userId: req.headers['x-user-id'],
      });
      break;
    }
  }

  // Check for SQL injection patterns (informational only)
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      logger.warn({
        type: 'SECURITY_SQL_PATTERN_DETECTED',
        path,
        ip: req.ip,
        endpoint: `${req.method} ${req.path}`,
        userId: req.headers['x-user-id'],
        note: 'Pattern detected but ORM provides protection',
      });
      break;
    }
  }
}

/**
 * Recursively sanitize a value
 */
function sanitizeValue(value: unknown, path: string, req: Request): unknown {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle strings - main sanitization target
  if (typeof value === 'string') {
    // Detect suspicious patterns before sanitizing
    detectSuspiciousPatterns(value, path, req);

    // Trim whitespace
    let sanitized = value.trim();

    // Escape HTML entities
    sanitized = escapeHtml(sanitized);

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    return sanitized;
  }

  // Handle numbers - preserve as-is
  if (typeof value === 'number') {
    return value;
  }

  // Handle booleans - preserve as-is
  if (typeof value === 'boolean') {
    return value;
  }

  // Handle arrays - recursively sanitize each element
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      sanitizeValue(item, `${path}[${index}]`, req)
    );
  }

  // Handle objects - recursively sanitize each property
  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Also sanitize the key (prevent prototype pollution)
      const sanitizedKey = key === '__proto__' || key === 'constructor' || key === 'prototype'
        ? `_blocked_${key}`
        : key;
      sanitized[sanitizedKey] = sanitizeValue(val, `${path}.${key}`, req);
    }
    return sanitized;
  }

  // Return other types as-is
  return value;
}

/**
 * Middleware to sanitize request body
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body, 'body', req);
  }
  next();
}

/**
 * Middleware to sanitize request query parameters
 */
export function sanitizeQuery(req: Request, res: Response, next: NextFunction): void {
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query, 'query', req) as typeof req.query;
  }
  next();
}

/**
 * Middleware to sanitize request params
 */
export function sanitizeParams(req: Request, res: Response, next: NextFunction): void {
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params, 'params', req) as typeof req.params;
  }
  next();
}

/**
 * Combined middleware that sanitizes body, query, and params
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction): void {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body, 'body', req);
  }

  // Sanitize query
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query, 'query', req) as typeof req.query;
  }

  // Sanitize params
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params, 'params', req) as typeof req.params;
  }

  next();
}

/**
 * Utility function to sanitize a single string value
 * Can be used directly in route handlers for specific fields
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') {
    return String(value);
  }
  return escapeHtml(value.trim()).replace(/\0/g, '');
}

/**
 * Utility to check if a string contains potentially dangerous content
 */
export function containsDangerousContent(value: string): boolean {
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Validate and sanitize email format
 */
export function sanitizeEmail(email: string): string | null {
  const sanitized = sanitizeString(email).toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : null;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const sanitized = sanitizeString(url);
    const parsed = new URL(sanitized);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export default {
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeRequest,
  sanitizeString,
  containsDangerousContent,
  sanitizeEmail,
  sanitizeUrl,
};
