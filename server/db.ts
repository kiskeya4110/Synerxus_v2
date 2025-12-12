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

// =============================================================================
// OPTIMIZED DATABASE CONNECTION POOL
// =============================================================================
// Configuration tuned for Replit environment and Neon serverless PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool size - optimized for Replit limits
  max: 10, // Maximum number of connections in the pool
  min: 2, // Minimum number of connections to maintain
  // Timeouts
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Connection timeout of 10 seconds
  // Keep-alive settings for serverless
  allowExitOnIdle: false, // Don't close pool when idle
});

// Pool error handling
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err);
});

// Pool connection monitoring (development only)
if (process.env.NODE_ENV === 'development') {
  pool.on('connect', () => {
    console.log('[DB Pool] New client connected');
  });

  pool.on('remove', () => {
    console.log('[DB Pool] Client removed from pool');
  });
}

// Graceful shutdown helper
export async function closePool(): Promise<void> {
  console.log('[DB Pool] Closing connection pool...');
  await pool.end();
  console.log('[DB Pool] Connection pool closed');
}

// Health check function
export async function checkPoolHealth(): Promise<{
  healthy: boolean;
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}> {
  try {
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    return {
      healthy: true,
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  } catch (error) {
    console.error('[DB Pool] Health check failed:', error);
    return {
      healthy: false,
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }
}

export const db = drizzle({ client: pool, schema });
