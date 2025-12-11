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
