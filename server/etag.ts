/**
 * ETag Middleware for API Response Caching
 *
 * Generates ETags for GET responses and handles conditional requests.
 * When client sends If-None-Match header matching current ETag,
 * returns 304 Not Modified instead of full response (saves bandwidth).
 *
 * Expected improvement: 20-30% bandwidth reduction for repeated requests.
 */

import { createHash } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Generate a weak ETag from response body
 * Uses MD5 hash truncated to 16 chars for speed
 */
export function generateETag(body: any): string {
  if (body === undefined || body === null) {
    return `W/"${createHash('md5').update('empty').digest('hex').slice(0, 16)}"`;
  }

  try {
    let content: string;
    if (typeof body === 'string') {
      content = body;
    } else if (typeof body === 'object') {
      // Safely stringify, handling circular references
      try {
        content = JSON.stringify(body);
      } catch (stringifyErr) {
        // Fallback for circular references or other stringify issues
        content = `object-${Date.now()}`;
      }
    } else {
      content = String(body);
    }

    // Ensure content is never undefined/null for the hash
    if (!content) {
      content = 'empty';
    }

    const hash = createHash('md5').update(content).digest('hex').slice(0, 16);
    return `W/"${hash}"`;
  } catch (err) {
    console.error('[ETag] Error generating ETag:', err);
    return `W/"error-${Date.now().toString(16)}"`;
  }
}

/**
 * Check if client's cached ETag matches current ETag
 */
export function isETagMatch(clientETag: string | undefined, serverETag: string): boolean {
  if (!clientETag) return false;

  // Handle multiple ETags in If-None-Match header
  const clientETags = clientETag.split(',').map(tag => tag.trim());

  // Check for wildcard
  if (clientETags.includes('*')) return true;

  // Compare ETags (weak comparison - ignore W/ prefix)
  const normalizedServerETag = serverETag.replace(/^W\//, '');
  return clientETags.some(tag => {
    const normalizedClientTag = tag.replace(/^W\//, '');
    return normalizedClientTag === normalizedServerETag ||
           normalizedClientTag === serverETag ||
           tag === serverETag;
  });
}

/**
 * ETag middleware for Express
 *
 * Wraps res.json() to:
 * 1. Generate ETag for response
 * 2. Check If-None-Match header
 * 3. Return 304 if ETag matches
 * 4. Add ETag header to response
 */
export function etagMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only apply to GET requests for API endpoints
    if (req.method !== 'GET' || !req.path.startsWith('/api')) {
      return next();
    }

    // Skip certain endpoints that shouldn't be cached
    const skipPaths = ['/api/health', '/api/ws', '/api/auth'];
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const originalJson = res.json.bind(res);

    res.json = function(body: any) {
      // Generate ETag for the response body
      const etag = generateETag(body);

      // Check if client has matching ETag
      const clientETag = req.headers['if-none-match'] as string | undefined;

      if (isETagMatch(clientETag, etag)) {
        // Client has current version - return 304
        res.status(304);
        res.setHeader('ETag', etag);
        res.end();
        return res;
      }

      // Set ETag header
      res.setHeader('ETag', etag);

      // Continue with normal response
      return originalJson(body);
    };

    next();
  };
}

/**
 * Stats tracking for ETag effectiveness
 */
interface ETagStats {
  requests: number;
  hits: number;
  misses: number;
  bytesSaved: number;
}

const stats: ETagStats = {
  requests: 0,
  hits: 0,
  misses: 0,
  bytesSaved: 0,
};

/**
 * Enhanced ETag middleware with stats tracking
 */
export function etagMiddlewareWithStats() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || !req.path.startsWith('/api')) {
      return next();
    }

    const skipPaths = ['/api/health', '/api/ws', '/api/auth'];
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    stats.requests++;
    const originalJson = res.json.bind(res);

    res.json = function(body: any) {
      const bodyStr = JSON.stringify(body);
      const etag = generateETag(bodyStr);
      const clientETag = req.headers['if-none-match'] as string | undefined;

      if (isETagMatch(clientETag, etag)) {
        stats.hits++;
        stats.bytesSaved += Buffer.byteLength(bodyStr, 'utf8');
        res.status(304);
        res.setHeader('ETag', etag);
        res.end();
        return res;
      }

      stats.misses++;
      res.setHeader('ETag', etag);
      return originalJson(body);
    };

    next();
  };
}

/**
 * Get ETag stats
 */
export function getETagStats(): ETagStats & { hitRate: string; bytesSavedMB: string } {
  const total = stats.hits + stats.misses;
  const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(2) + '%' : '0%';
  const bytesSavedMB = (stats.bytesSaved / (1024 * 1024)).toFixed(2) + 'MB';

  return {
    ...stats,
    hitRate,
    bytesSavedMB,
  };
}

/**
 * Reset ETag stats (for testing)
 */
export function resetETagStats(): void {
  stats.requests = 0;
  stats.hits = 0;
  stats.misses = 0;
  stats.bytesSaved = 0;
}

export default etagMiddleware;
