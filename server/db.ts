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

// Optimized connection pool for high concurrency
// These settings allow handling up to 10,000 concurrent users efficiently
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Maximum connections in pool (Neon free tier limit)
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail fast if can't connect in 5s
  maxUses: 7500,              // Recycle connections to prevent memory leaks
});

// Log pool events for monitoring - handle errors without crashing
pool.on('error', (err) => {
  // Log but don't crash - pool errors on idle clients are often recoverable
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
  // The pool will automatically handle reconnection
});

pool.on('connect', () => {
  console.log('[DB Pool] New client connected');
});

// Handle pool removal (connection cleanup)
pool.on('remove', () => {
  console.log('[DB Pool] Client removed from pool');
});

export const db = drizzle({ client: pool, schema });

// Export pool stats for monitoring
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
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
