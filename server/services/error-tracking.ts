/**
 * Error Tracking Service - Sentry Integration
 *
 * Provides centralized error tracking and monitoring for the application.
 * Free tier: 5,000 errors/month, 10,000 performance transactions
 *
 * Setup:
 * 1. Create account at https://sentry.io
 * 2. Create a Node.js project
 * 3. Set SENTRY_DSN environment variable
 */

import * as Sentry from '@sentry/node';
import { logger } from '../logger';

// Check if Sentry is configured
const SENTRY_DSN = process.env.SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let isInitialized = false;

/**
 * Initialize Sentry error tracking
 */
export function initErrorTracking(): void {
  if (!SENTRY_DSN) {
    logger.info('[Sentry] SENTRY_DSN not set - error tracking disabled');
    logger.info('[Sentry] To enable: Set SENTRY_DSN environment variable');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version || '1.0.0',

      // Performance monitoring (free tier includes 10k transactions/month)
      tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // 10% in prod, 100% in dev

      // Only send errors in production, or if explicitly enabled
      enabled: IS_PRODUCTION || process.env.SENTRY_ENABLED === 'true',

      // Filter out common non-actionable errors
      beforeSend(event, hint) {
        const error = hint.originalException as Error;

        // Don't send 404s or validation errors
        if (error?.message?.includes('not found') ||
            error?.message?.includes('validation')) {
          return null;
        }

        return event;
      },

      // Integrations
      integrations: [
        // Capture unhandled promise rejections
        Sentry.captureConsoleIntegration({ levels: ['error'] }),
      ],
    });

    isInitialized = true;
    logger.info('[Sentry] Error tracking initialized successfully');
  } catch (error) {
    logger.error('[Sentry] Failed to initialize:', error);
  }
}

/**
 * Capture an exception and send to Sentry
 */
export function captureException(error: Error, context?: Record<string, any>): string | null {
  if (!isInitialized) {
    logger.error('[Error]', error.message, context);
    return null;
  }

  const eventId = Sentry.captureException(error, {
    extra: context,
  });

  return eventId;
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (!isInitialized) {
    logger.info(`[${level}] ${message}`);
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error reports
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  if (!isInitialized) return;
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging context
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}): void {
  if (!isInitialized) return;
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Create a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string): any {
  if (!isInitialized) return null;
  return Sentry.startInactiveSpan({ name, op });
}

/**
 * Express error handler middleware for Sentry
 */
export function sentryErrorHandler() {
  return Sentry.expressErrorHandler();
}

/**
 * Express request handler middleware for Sentry
 */
export function sentryRequestHandler() {
  return Sentry.expressIntegration();
}

/**
 * Flush pending events before shutdown
 */
export async function flushErrors(timeout = 2000): Promise<void> {
  if (!isInitialized) return;
  await Sentry.flush(timeout);
}

export default {
  init: initErrorTracking,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  startTransaction,
  sentryErrorHandler,
  sentryRequestHandler,
  flush: flushErrors,
};
