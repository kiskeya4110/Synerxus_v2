/**
 * API Response Utilities
 *
 * Provides standardized response handling with:
 * - Sparse fieldsets (GraphQL-style field selection)
 * - Response streaming for large datasets
 * - Cursor-based pagination
 * - ETag generation and conditional responses
 * - Response compression metadata
 */

import { Response, Request } from 'express';
import crypto from 'crypto';
import { Transform, Readable } from 'stream';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface PaginationMeta {
  cursor: string | null;
  nextCursor: string | null;
  prevCursor: string | null;
  hasNext: boolean;
  hasPrev: boolean;
  totalCount?: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    timing?: {
      startTime: number;
      endTime: number;
      durationMs: number;
    };
    etag?: string;
    cached?: boolean;
    version?: string;
  };
  errors?: ApiError[];
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface CursorPaginationOptions {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface FieldSelectionOptions {
  fields?: string;
  include?: string;
  exclude?: string;
}

// =============================================================================
// SPARSE FIELDSETS (GraphQL-style field selection)
// =============================================================================

/**
 * Select specific fields from an object (supports nested paths with dot notation)
 */
export function selectFields<T extends Record<string, any>>(
  data: T,
  fields: string[]
): Partial<T> {
  if (!fields || fields.length === 0) return data;

  const result: Record<string, any> = {};

  for (const field of fields) {
    const value = getNestedValue(data, field);
    if (value !== undefined) {
      setNestedValue(result, field, value);
    }
  }

  return result as Partial<T>;
}

/**
 * Exclude specific fields from an object
 */
export function excludeFields<T extends Record<string, any>>(
  data: T,
  fieldsToExclude: string[]
): Partial<T> {
  if (!fieldsToExclude || fieldsToExclude.length === 0) return data;

  const result = { ...data };

  for (const field of fieldsToExclude) {
    deleteNestedValue(result, field);
  }

  return result as Partial<T>;
}

/**
 * Parse field selection from query parameters
 */
export function parseFieldSelection(req: Request): FieldSelectionOptions {
  return {
    fields: req.query.fields as string | undefined,
    include: req.query.include as string | undefined,
    exclude: req.query.exclude as string | undefined,
  };
}

/**
 * Apply field selection to data based on request query params
 */
export function applyFieldSelection<T extends Record<string, any>>(
  data: T | T[],
  options: FieldSelectionOptions
): Partial<T> | Partial<T>[] {
  const { fields, include, exclude } = options;

  // Parse field lists
  const includeFields = fields
    ? fields.split(',').map(f => f.trim())
    : include
    ? include.split(',').map(f => f.trim())
    : [];

  const excludeFieldsList = exclude
    ? exclude.split(',').map(f => f.trim())
    : [];

  const processItem = (item: T): Partial<T> => {
    let result = item;

    // Apply include fields (whitelist)
    if (includeFields.length > 0) {
      result = selectFields(result, includeFields) as T;
    }

    // Apply exclude fields (blacklist)
    if (excludeFieldsList.length > 0) {
      result = excludeFields(result, excludeFieldsList) as T;
    }

    return result;
  };

  if (Array.isArray(data)) {
    return data.map(processItem);
  }

  return processItem(data);
}

// =============================================================================
// CURSOR-BASED PAGINATION
// =============================================================================

/**
 * Encode a cursor from an object (typically contains id and timestamp)
 */
export function encodeCursor(data: Record<string, any>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

/**
 * Decode a cursor back to an object
 */
export function decodeCursor<T = Record<string, any>>(cursor: string): T | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as T;
  } catch {
    return null;
  }
}

/**
 * Parse cursor pagination options from request
 */
export function parseCursorPagination(req: Request): CursorPaginationOptions {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit as string) || 20, 1),
    100 // Max page size
  );

  return {
    cursor: req.query.cursor as string | undefined,
    limit,
    direction: (req.query.direction as 'forward' | 'backward') || 'forward',
    orderBy: req.query.orderBy as string || 'id',
    orderDir: (req.query.orderDir as 'asc' | 'desc') || 'desc',
  };
}

/**
 * Apply cursor-based pagination to a dataset
 */
export function applyCursorPagination<T extends { id: number; [key: string]: any }>(
  data: T[],
  options: CursorPaginationOptions
): { items: T[]; meta: PaginationMeta } {
  const { cursor, limit = 20, direction = 'forward', orderBy = 'id', orderDir = 'desc' } = options;

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    const aVal = a[orderBy];
    const bVal = b[orderBy];

    if (orderDir === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  let startIndex = 0;

  // Find starting position from cursor
  if (cursor) {
    const cursorData = decodeCursor<{ id: number; value: any }>(cursor);
    if (cursorData) {
      const cursorIndex = sortedData.findIndex(item => item.id === cursorData.id);
      if (cursorIndex !== -1) {
        startIndex = direction === 'forward' ? cursorIndex + 1 : Math.max(0, cursorIndex - limit);
      }
    }
  }

  // Extract page
  const items = sortedData.slice(startIndex, startIndex + limit);
  const hasNext = startIndex + limit < sortedData.length;
  const hasPrev = startIndex > 0;

  // Generate cursors
  const firstItem = items[0];
  const lastItem = items[items.length - 1];

  return {
    items,
    meta: {
      cursor: cursor || null,
      nextCursor: hasNext && lastItem
        ? encodeCursor({ id: lastItem.id, value: lastItem[orderBy] })
        : null,
      prevCursor: hasPrev && firstItem
        ? encodeCursor({ id: firstItem.id, value: firstItem[orderBy] })
        : null,
      hasNext,
      hasPrev,
      totalCount: sortedData.length,
      pageSize: limit,
    },
  };
}

// =============================================================================
// ETAG GENERATION
// =============================================================================

/**
 * Generate an ETag from data
 */
export function generateETag(data: any): string {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
  return `"${hash}"`;
}

/**
 * Generate a weak ETag (for semantically equivalent content)
 */
export function generateWeakETag(data: any): string {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 16);
  return `W/"${hash}"`;
}

/**
 * Check if client's ETag matches (for conditional requests)
 */
export function checkETagMatch(req: Request, etag: string): boolean {
  const clientETag = req.headers['if-none-match'];
  if (!clientETag) return false;

  // Handle multiple ETags
  const clientETags = clientETag.split(',').map(t => t.trim());
  return clientETags.includes(etag) || clientETags.includes('*');
}

// =============================================================================
// RESPONSE STREAMING
// =============================================================================

/**
 * Stream large datasets as NDJSON (Newline Delimited JSON)
 */
export function streamNDJSON<T>(
  res: Response,
  dataStream: AsyncIterable<T> | T[],
  options?: {
    onStart?: () => void;
    onEnd?: (count: number) => void;
    onError?: (error: Error) => void;
  }
): void {
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  let count = 0;
  options?.onStart?.();

  const processStream = async () => {
    try {
      for await (const item of dataStream) {
        res.write(JSON.stringify(item) + '\n');
        count++;
      }
      res.end();
      options?.onEnd?.(count);
    } catch (error) {
      options?.onError?.(error as Error);
      res.status(500).end();
    }
  };

  processStream();
}

/**
 * Stream JSON array with proper formatting
 */
export function streamJSONArray<T>(
  res: Response,
  dataStream: AsyncIterable<T> | T[],
  options?: {
    onStart?: () => void;
    onEnd?: (count: number) => void;
    onError?: (error: Error) => void;
  }
): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');

  let count = 0;
  let isFirst = true;
  options?.onStart?.();

  const processStream = async () => {
    try {
      res.write('[');

      for await (const item of dataStream) {
        if (!isFirst) {
          res.write(',');
        }
        res.write(JSON.stringify(item));
        isFirst = false;
        count++;
      }

      res.write(']');
      res.end();
      options?.onEnd?.(count);
    } catch (error) {
      options?.onError?.(error as Error);
      // Try to close the array properly
      if (!isFirst) {
        res.write(']');
      }
      res.status(500).end();
    }
  };

  processStream();
}

/**
 * Create a transform stream that applies field selection
 */
export function createFieldSelectionStream(
  options: FieldSelectionOptions
): Transform {
  return new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      try {
        const transformed = applyFieldSelection(chunk, options);
        callback(null, transformed);
      } catch (error) {
        callback(error as Error);
      }
    },
  });
}

// =============================================================================
// STANDARDIZED API RESPONSE BUILDER
// =============================================================================

export class ApiResponseBuilder<T = any> {
  private response: Partial<ApiResponse<T>> = {
    success: true,
    meta: {},
  };
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  data(data: T): this {
    this.response.data = data;
    return this;
  }

  pagination(meta: PaginationMeta): this {
    this.response.meta!.pagination = meta;
    return this;
  }

  cached(isCached: boolean): this {
    this.response.meta!.cached = isCached;
    return this;
  }

  version(version: string): this {
    this.response.meta!.version = version;
    return this;
  }

  error(code: string, message: string, field?: string, details?: Record<string, any>): this {
    this.response.success = false;
    if (!this.response.errors) {
      this.response.errors = [];
    }
    this.response.errors.push({ code, message, field, details });
    return this;
  }

  build(includeTimings: boolean = true): ApiResponse<T> {
    const endTime = Date.now();

    if (includeTimings) {
      this.response.meta!.timing = {
        startTime: this.startTime,
        endTime,
        durationMs: endTime - this.startTime,
      };
    }

    // Generate ETag if we have data
    if (this.response.data) {
      this.response.meta!.etag = generateWeakETag(this.response.data);
    }

    return this.response as ApiResponse<T>;
  }
}

// =============================================================================
// EXPRESS MIDDLEWARE HELPERS
// =============================================================================

/**
 * Middleware to add response helpers
 */
export function apiResponseMiddleware(req: Request, res: Response, next: Function): void {
  // Add helper to send paginated response
  (res as any).sendPaginated = <T>(
    data: T[],
    options: CursorPaginationOptions = {}
  ) => {
    const { items, meta } = applyCursorPagination(data as any[], options);
    const fieldOptions = parseFieldSelection(req);
    const filteredItems = applyFieldSelection(items, fieldOptions);

    const response = new ApiResponseBuilder()
      .data(filteredItems)
      .pagination(meta)
      .build();

    // Set ETag
    const etag = generateETag(response.data);
    res.setHeader('ETag', etag);

    // Check for conditional request
    if (checkETagMatch(req, etag)) {
      return res.status(304).end();
    }

    res.json(response);
  };

  // Add helper to send single item with field selection
  (res as any).sendWithFields = <T extends Record<string, any>>(data: T) => {
    const fieldOptions = parseFieldSelection(req);
    const filteredData = applyFieldSelection(data, fieldOptions);

    const response = new ApiResponseBuilder()
      .data(filteredData)
      .build();

    const etag = generateETag(response.data);
    res.setHeader('ETag', etag);

    if (checkETagMatch(req, etag)) {
      return res.status(304).end();
    }

    res.json(response);
  };

  next();
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

function deleteNestedValue(obj: any, path: string): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) return;
    current = current[key];
  }

  delete current[keys[keys.length - 1]];
}

export default {
  selectFields,
  excludeFields,
  parseFieldSelection,
  applyFieldSelection,
  encodeCursor,
  decodeCursor,
  parseCursorPagination,
  applyCursorPagination,
  generateETag,
  generateWeakETag,
  checkETagMatch,
  streamNDJSON,
  streamJSONArray,
  createFieldSelectionStream,
  ApiResponseBuilder,
  apiResponseMiddleware,
};
