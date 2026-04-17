import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import pg from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";
import { logger } from "./logger";

const { Pool: PgPool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect if using Neon (contains neon.tech) or local PostgreSQL
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') ||
                       process.env.DATABASE_URL.includes('neon.') ||
                       process.env.DATABASE_URL.includes('neondb');

// Pool configuration optimized for high concurrency and stability
const POOL_CONFIG = {
  max: parseInt(process.env.DB_POOL_MAX || '50', 10),
  min: 5,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
};

// Configure and create the appropriate pool
function createPool(): NeonPool | pg.Pool {
  if (isNeonDatabase) {
    // Neon serverless configuration
    neonConfig.webSocketConstructor = ws;
    neonConfig.wsProxy = (host) => host;
    neonConfig.pipelineConnect = false;

    console.log('[DB] Using Neon serverless driver');
    return new NeonPool({
      connectionString: process.env.DATABASE_URL,
      ...POOL_CONFIG,
    });
  } else {
    // Standard PostgreSQL configuration
    console.log('[DB] Using standard PostgreSQL driver');
    return new PgPool({
      connectionString: process.env.DATABASE_URL,
      ...POOL_CONFIG,
    });
  }
}

export const pool = createPool();

// Track pool health metrics
let poolMetrics = {
  totalConnections: 0,
  errorCount: 0,
  lastError: null as Error | null,
  lastErrorTime: 0,
  connectionAttempts: 0,
  successfulConnections: 0,
};

// Helper to safely serialize errors for logging
function serializeError(err: unknown): string {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}${err.stack ? '\n' + err.stack : ''}`;
  }
  if (typeof err === 'object' && err !== null) {
    try {
      return JSON.stringify(err, Object.getOwnPropertyNames(err));
    } catch {
      return String(err);
    }
  }
  return String(err);
}

// Log pool events for monitoring - handle errors without crashing
(pool as NodeJS.EventEmitter).on('error', (err) => {
  poolMetrics.errorCount++;
  poolMetrics.lastError = err instanceof Error ? err : new Error(String(err));
  poolMetrics.lastErrorTime = Date.now();
  // Log but don't crash - pool errors on idle clients are often recoverable
  // Use serializeError for proper logging of all error types
  logger.error('[DB Pool] Unexpected error on idle client:', serializeError(err));
  // The pool will automatically handle reconnection
});

pool.on('connect', () => {
  poolMetrics.totalConnections++;
  poolMetrics.successfulConnections++;
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB Pool] New client connected');
  }
});

// Handle pool removal (connection cleanup)
pool.on('remove', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB Pool] Client removed from pool');
  }
});

// Create Drizzle instance with appropriate driver
export const db = isNeonDatabase
  ? drizzleNeon({ client: pool as NeonPool, schema })
  : drizzlePg({ client: pool as InstanceType<typeof PgPool>, schema });

// Export pool stats for monitoring
export function getPoolStats() {
  const stats = {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    maxConnections: POOL_CONFIG.max,
    utilizationPercent: Math.round((pool.totalCount / POOL_CONFIG.max) * 100),
    metrics: {
      totalConnections: poolMetrics.totalConnections,
      errorCount: poolMetrics.errorCount,
      successfulConnections: poolMetrics.successfulConnections,
      lastErrorTime: poolMetrics.lastErrorTime ? new Date(poolMetrics.lastErrorTime).toISOString() : null,
    },
    health: {
      isHealthy: pool.waitingCount < 10 && poolMetrics.errorCount < 50,
      isNearCapacity: pool.totalCount >= POOL_CONFIG.max - 2,
      hasRecentErrors: poolMetrics.lastErrorTime > Date.now() - 60000,
    },
  };
  return stats;
}

// Check if pool is under pressure (for circuit breaker integration)
export function isPoolUnderPressure(): boolean {
  return pool.waitingCount > 5 || pool.totalCount >= POOL_CONFIG.max - 2;
}

// Export serializeError for use in other modules
export { serializeError };

// Retry wrapper for database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(serializeError(error));

      // Don't retry on validation errors or client errors
      if (error.code === '23505' || // Unique violation
          error.code === '23503' || // Foreign key violation
          error.code === '22P02') { // Invalid text representation
        throw error;
      }

      // Also don't retry on timeout errors if they've occurred multiple times
      const isTimeoutError = error.message?.includes('timeout');

      // Retry on connection errors
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`[DB] Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, serializeError(error));
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Health check for database connection
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    logger.error('[DB] Health check failed:', error);
    return false;
  }
}

// Transaction types for Drizzle
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Execute operations within a database transaction
 * Automatically rolls back on error
 *
 * @param callback - Function containing database operations
 * @returns Result of the callback
 * @throws Rolls back transaction and re-throws on error
 *
 * @example
 * const result = await withTransaction(async (tx) => {
 *   const user = await tx.insert(users).values({...}).returning();
 *   const profile = await tx.insert(profiles).values({userId: user[0].id}).returning();
 *   return { user: user[0], profile: profile[0] };
 * });
 */
export async function withTransaction<T>(
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    try {
      return await callback(tx);
    } catch (error) {
      // Transaction will be automatically rolled back by Drizzle
      logger.error('[DB Transaction] Error, rolling back:', error);
      throw error;
    }
  });
}

/**
 * Execute operations within a transaction with retry logic
 * Useful for handling transient failures (deadlocks, connection issues)
 *
 * @param callback - Function containing database operations
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Result of the callback
 */
export async function withTransactionRetry<T>(
  callback: (tx: Transaction) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(callback);
    } catch (error: any) {
      lastError = error;

      // Don't retry on validation errors
      if (error.code === '23505' || // Unique violation
          error.code === '23503' || // Foreign key violation
          error.code === '22P02') { // Invalid text representation
        throw error;
      }

      // Retry on deadlock or serialization failure
      if (error.code === '40001' || // Serialization failure
          error.code === '40P01') { // Deadlock detected
        if (attempt < maxRetries) {
          const delay = 100 * Math.pow(2, attempt - 1);
          console.warn(`[DB Transaction] Retrying after ${error.code} (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // For other errors, don't retry
      throw error;
    }
  }

  throw lastError;
}
