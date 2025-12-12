/**
 * Pagination Utilities
 *
 * Provides standardized pagination for API endpoints.
 * Supports both offset-based and cursor-based pagination.
 */

import { Request } from 'express';

// Default pagination settings
export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
} as const;

/**
 * Pagination parameters extracted from request
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Extract pagination parameters from request query
 *
 * @param req - Express request object
 * @returns Pagination parameters with defaults applied
 *
 * @example
 * // GET /api/users?page=2&limit=20
 * const { page, limit, offset } = getPaginationParams(req);
 * // page: 2, limit: 20, offset: 20
 */
export function getPaginationParams(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  let limit = parseInt(req.query.limit as string) || PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE;

  // Enforce min/max limits
  limit = Math.min(PAGINATION_DEFAULTS.MAX_PAGE_SIZE, Math.max(PAGINATION_DEFAULTS.MIN_PAGE_SIZE, limit));

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Create a paginated response from data array
 *
 * @param data - Array of items (already paginated slice)
 * @param total - Total count of all items
 * @param params - Pagination parameters used
 * @returns Formatted paginated response
 *
 * @example
 * const users = await db.select().from(users).limit(limit).offset(offset);
 * const total = await db.select({ count: count() }).from(users);
 * return createPaginatedResponse(users, total[0].count, { page, limit, offset });
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);

  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}

/**
 * Apply pagination to an array (for in-memory pagination)
 * Use this when data is already loaded and needs to be paginated client-side
 *
 * @param items - Full array of items
 * @param params - Pagination parameters
 * @returns Paginated response with sliced data
 */
export function paginateArray<T>(
  items: T[],
  params: PaginationParams
): PaginatedResponse<T> {
  const { offset, limit, page } = params;
  const data = items.slice(offset, offset + limit);
  return createPaginatedResponse(data, items.length, { page, limit, offset });
}

/**
 * Sort parameters extracted from request
 */
export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Extract sort parameters from request query
 *
 * @param req - Express request object
 * @param defaultSortBy - Default field to sort by
 * @param defaultOrder - Default sort order
 * @returns Sort parameters
 *
 * @example
 * // GET /api/users?sortBy=createdAt&sortOrder=desc
 * const { sortBy, sortOrder } = getSortParams(req, 'id', 'asc');
 */
export function getSortParams(
  req: Request,
  defaultSortBy: string = 'id',
  defaultOrder: 'asc' | 'desc' = 'asc'
): SortParams {
  const sortBy = (req.query.sortBy as string) || defaultSortBy;
  const sortOrder = ((req.query.sortOrder as string) || defaultOrder).toLowerCase() as 'asc' | 'desc';

  // Validate sort order
  const validOrder = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : defaultOrder;

  return { sortBy, sortOrder: validOrder };
}

/**
 * Filter parameters for common list queries
 */
export interface FilterParams {
  search?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  [key: string]: any;
}

/**
 * Extract common filter parameters from request query
 *
 * @param req - Express request object
 * @returns Filter parameters
 */
export function getFilterParams(req: Request): FilterParams {
  const filters: FilterParams = {};

  if (req.query.search) {
    filters.search = req.query.search as string;
  }

  if (req.query.status) {
    filters.status = req.query.status as string;
  }

  if (req.query.startDate) {
    filters.startDate = new Date(req.query.startDate as string);
  }

  if (req.query.endDate) {
    filters.endDate = new Date(req.query.endDate as string);
  }

  return filters;
}

/**
 * Combined query parameters for list endpoints
 */
export interface ListQueryParams extends PaginationParams, SortParams {
  filters: FilterParams;
}

/**
 * Extract all list query parameters from request
 *
 * @param req - Express request object
 * @param defaults - Default values for sort
 * @returns Combined query parameters
 */
export function getListQueryParams(
  req: Request,
  defaults: { sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
): ListQueryParams {
  return {
    ...getPaginationParams(req),
    ...getSortParams(req, defaults.sortBy, defaults.sortOrder),
    filters: getFilterParams(req),
  };
}

// =============================================================================
// CURSOR-BASED PAGINATION
// Recommended for large datasets and real-time data
// =============================================================================

/**
 * Cursor data structure for cursor-based pagination
 */
export interface CursorData {
  id: number | string;
  [key: string]: unknown;
}

/**
 * Cursor pagination parameters
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
  direction: 'next' | 'prev';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Cursor-paginated response structure
 */
export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor: string | null;
    previousCursor: string | null;
    totalCount?: number;
    pageSize: number;
  };
  meta: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    returnedCount: number;
  };
}

/**
 * Encode cursor data to a base64url string
 */
export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString('base64url');
}

/**
 * Decode a cursor string back to cursor data
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    return JSON.parse(json) as CursorData;
  } catch {
    return null;
  }
}

/**
 * Extract cursor pagination parameters from request
 */
export function getCursorPaginationParams(
  req: Request,
  defaults: { sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
): CursorPaginationParams {
  const cursor = req.query.cursor as string | undefined;
  let limit = parseInt(req.query.limit as string) || PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE;
  limit = Math.min(PAGINATION_DEFAULTS.MAX_PAGE_SIZE, Math.max(PAGINATION_DEFAULTS.MIN_PAGE_SIZE, limit));

  const direction = ((req.query.direction as string) || 'next').toLowerCase() as 'next' | 'prev';
  const sortBy = (req.query.sortBy as string) || defaults.sortBy || 'createdAt';
  const sortOrder = ((req.query.sortOrder as string) || defaults.sortOrder || 'desc').toLowerCase() as 'asc' | 'desc';

  return { cursor, limit, direction, sortBy, sortOrder };
}

/**
 * Build cursor-paginated response
 */
export function createCursorPaginatedResponse<T extends { id: number | string; [key: string]: unknown }>(
  data: T[],
  params: CursorPaginationParams,
  totalCount?: number,
  cursorFields: string[] = ['id']
): CursorPaginatedResponse<T> {
  const { limit, sortBy, sortOrder, cursor } = params;

  // Check if there are more pages (we fetch limit + 1 to check)
  const hasMore = data.length > limit;

  // Trim to requested limit
  const trimmedData = hasMore ? data.slice(0, limit) : data;

  let nextCursor: string | null = null;
  let previousCursor: string | null = null;

  if (trimmedData.length > 0) {
    const firstItem = trimmedData[0];
    const lastItem = trimmedData[trimmedData.length - 1];

    // Build cursor data including sort field
    const buildCursorData = (item: T): CursorData => {
      const cursorData: CursorData = { id: item.id };
      for (const field of cursorFields) {
        if (field !== 'id' && item[field] !== undefined) {
          cursorData[field] = item[field];
        }
      }
      if (sortBy !== 'id' && item[sortBy] !== undefined) {
        cursorData[sortBy] = item[sortBy];
      }
      return cursorData;
    };

    if (hasMore) {
      nextCursor = encodeCursor(buildCursorData(lastItem));
    }

    if (cursor) {
      previousCursor = encodeCursor(buildCursorData(firstItem));
    }
  }

  return {
    data: trimmedData,
    pagination: {
      hasNextPage: hasMore,
      hasPreviousPage: cursor !== undefined,
      nextCursor,
      previousCursor,
      totalCount,
      pageSize: limit,
    },
    meta: {
      sortBy,
      sortOrder,
      returnedCount: trimmedData.length,
    },
  };
}

/**
 * Build SQL WHERE clause for cursor pagination
 * For use with raw SQL queries
 */
export function buildCursorWhereClause(
  cursor: CursorData | null,
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  paramOffset: number = 0
): {
  whereClause: string;
  params: unknown[];
} {
  if (!cursor) {
    return { whereClause: '', params: [] };
  }

  const sortValue = cursor[sortBy];
  const id = cursor.id;

  // Determine comparison operator
  // For DESC: we want items LESS than cursor (older)
  // For ASC: we want items GREATER than cursor (newer)
  const operator = sortOrder === 'desc' ? '<' : '>';

  // Use tuple comparison for tie-breaking
  const whereClause = `(${sortBy}, id) ${operator} ($${paramOffset + 1}, $${paramOffset + 2})`;
  const params = [sortValue, id];

  return { whereClause, params };
}

/**
 * SQL helper for Drizzle ORM cursor pagination
 * Returns conditions to apply to a query
 */
export interface DrizzleCursorResult {
  cursorData: CursorData | null;
  queryLimit: number;
}

export function prepareDrizzleCursor(
  cursor: string | undefined,
  limit: number
): DrizzleCursorResult {
  return {
    cursorData: cursor ? decodeCursor(cursor) : null,
    queryLimit: limit + 1, // Fetch extra to check for more pages
  };
}
