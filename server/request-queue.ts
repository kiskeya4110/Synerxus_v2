/**
 * Request Queue Implementation - sat1325upgrade
 *
 * Prevents server overload by queuing requests instead of processing all at once.
 * This prevents memory exhaustion and ensures fair resource allocation.
 *
 * Features:
 * - Configurable concurrency limits per endpoint type
 * - Request timeout with graceful rejection
 * - Queue overflow protection
 * - Priority queue support
 */

import type { Request, Response, NextFunction } from 'express';
import PQueue from 'p-queue';
import { logger } from './logger';

// Queue configurations for different endpoint types
const QUEUE_CONFIG = {
  // Heavy operations (AI matching, report generation)
  heavy: {
    concurrency: 5,
    timeout: 30000,
    maxQueueSize: 50,
  },
  // Standard API operations
  standard: {
    concurrency: 50,
    timeout: 15000,
    maxQueueSize: 500,
  },
  // Light operations (health checks, simple reads)
  light: {
    concurrency: 100,
    timeout: 5000,
    maxQueueSize: 1000,
  },
};

// Create queues
const queues = {
  heavy: new PQueue({
    concurrency: QUEUE_CONFIG.heavy.concurrency,
    timeout: QUEUE_CONFIG.heavy.timeout,
  }),
  standard: new PQueue({
    concurrency: QUEUE_CONFIG.standard.concurrency,
    timeout: QUEUE_CONFIG.standard.timeout,
  }),
  light: new PQueue({
    concurrency: QUEUE_CONFIG.light.concurrency,
    timeout: QUEUE_CONFIG.light.timeout,
  }),
};

type QueueType = keyof typeof queues;

/**
 * Get queue stats for monitoring
 */
export function getQueueStats(): Record<string, any> {
  return {
    heavy: {
      pending: queues.heavy.pending,
      size: queues.heavy.size,
      concurrency: QUEUE_CONFIG.heavy.concurrency,
      isPaused: queues.heavy.isPaused,
    },
    standard: {
      pending: queues.standard.pending,
      size: queues.standard.size,
      concurrency: QUEUE_CONFIG.standard.concurrency,
      isPaused: queues.standard.isPaused,
    },
    light: {
      pending: queues.light.pending,
      size: queues.light.size,
      concurrency: QUEUE_CONFIG.light.concurrency,
      isPaused: queues.light.isPaused,
    },
  };
}

/**
 * Check if queues are overloaded
 */
export function isOverloaded(): boolean {
  return (
    queues.heavy.pending >= QUEUE_CONFIG.heavy.maxQueueSize ||
    queues.standard.pending >= QUEUE_CONFIG.standard.maxQueueSize
  );
}

/**
 * Express middleware factory for request queuing
 */
export function queueMiddleware(queueType: QueueType = 'standard') {
  const queue = queues[queueType];
  const config = QUEUE_CONFIG[queueType];

  return async (req: Request, res: Response, next: NextFunction) => {
    // Check queue overflow
    if (queue.pending >= config.maxQueueSize) {
      logger.warn(`[Queue:${queueType}] Queue overflow - rejecting request`, {
        pending: queue.pending,
        maxSize: config.maxQueueSize,
        path: req.path,
      });

      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Server is at capacity, please retry in a few seconds',
        retryAfter: 5,
      });
    }

    try {
      await queue.add(async () => {
        return new Promise<void>((resolve, reject) => {
          // Track when response finishes
          res.on('finish', resolve);
          res.on('error', reject);

          // Pass to next middleware
          next();
        });
      });
    } catch (error: any) {
      if (error.message === 'Promise timed out') {
        logger.error(`[Queue:${queueType}] Request timeout`, {
          path: req.path,
          timeout: config.timeout,
        });

        if (!res.headersSent) {
          return res.status(504).json({
            error: 'Gateway Timeout',
            message: 'Request took too long to process',
          });
        }
      } else {
        logger.error(`[Queue:${queueType}] Queue error`, { error: error.message });
        if (!res.headersSent) {
          return res.status(500).json({
            error: 'Internal Server Error',
            message: 'An error occurred processing your request',
          });
        }
      }
    }
  };
}

/**
 * Wrapper for async route handlers with queue protection
 */
export function withQueue<T>(
  queueType: QueueType,
  fn: () => Promise<T>
): Promise<T> {
  const queue = queues[queueType];
  const config = QUEUE_CONFIG[queueType];

  if (queue.pending >= config.maxQueueSize) {
    return Promise.reject(new Error('Queue overflow'));
  }

  return queue.add(fn) as Promise<T>;
}

/**
 * Graceful shutdown - wait for queues to drain
 */
export async function drainQueues(timeout = 30000): Promise<void> {
  logger.info('[Queue] Draining queues before shutdown...');

  const drainPromises = Object.entries(queues).map(async ([name, queue]) => {
    queue.pause();
    const start = Date.now();

    while (queue.pending > 0 && Date.now() - start < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (queue.pending > 0) {
      logger.warn(`[Queue:${name}] Timeout draining, ${queue.pending} requests dropped`);
    } else {
      logger.info(`[Queue:${name}] Drained successfully`);
    }
  });

  await Promise.all(drainPromises);
}

export default {
  queueMiddleware,
  withQueue,
  getQueueStats,
  isOverloaded,
  drainQueues,
};
