import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Pool configuration optimized for high concurrency and stability
// Increased pool size to handle 500+ concurrent users
const POOL_CONFIG = {
  max: parseInt(process.env.DB_POOL_MAX || '50', 10), // Increased for high concurrency
  min: 5,                         // Keep more connections warm
  idleTimeoutMillis: 60000,       // Close idle connections after 60s
  connectionTimeoutMillis: 10000, // Allow more time for connection under load
  maxUses: 10000,                 // Recycle connections to prevent memory leaks
  allowExitOnIdle: false,         // Keep pool alive even when idle
};

// Optimized connection pool for high concurrency
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...POOL_CONFIG,
});

// Track pool health metrics
let poolMetrics = {
  totalConnections: 0,
  errorCount: 0,
  lastError: null as Error | null,
  lastErrorTime: 0,
  connectionAttempts: 0,
  successfulConnections: 0,
};

// Log pool events for monitoring - handle errors without crashing
pool.on('error', (err) => {
  poolMetrics.errorCount++;
  poolMetrics.lastError = err;
  poolMetrics.lastErrorTime = Date.now();
  // Log but don't crash - pool errors on idle clients are often recoverable
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
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

export const db = drizzle({ client: pool, schema });

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
      lastError = error;

      // Don't retry on validation errors or client errors
      if (error.code === '23505' || // Unique violation
          error.code === '23503' || // Foreign key violation
          error.code === '22P02') { // Invalid text representation
        throw error;
      }

      // Retry on connection errors
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`[DB] Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error.message);
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
    console.error('[DB] Health check failed:', error);
    return false;
  }
}
