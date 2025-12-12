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
  min: 0, // Don't maintain minimum connections (allows graceful degradation when DB unavailable)
  // Timeouts
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Connection timeout of 10 seconds
  // Keep-alive settings for serverless
  allowExitOnIdle: true, // Allow pool to be idle when database unavailable
});

// Track database availability
export let isDatabaseAvailable = false;

// Pool error handling - handle connection termination gracefully
pool.on('error', (err: Error & { code?: string }) => {
  const errorMessage = err?.message || '';
  const isEndpointDisabled =
    errorMessage.includes('endpoint has been disabled') ||
    errorMessage.includes('Connection terminated') ||
    errorMessage.includes('connection terminated unexpectedly') ||
    err?.code === 'XX000';

  if (isEndpointDisabled) {
    console.warn('[DB Pool] Database endpoint unavailable - operating in degraded mode');
    isDatabaseAvailable = false;
  } else {
    console.error('[DB Pool] Unexpected error on idle client:', err.message);
  }
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
let poolClosed = false;
export async function closePool(): Promise<void> {
  if (poolClosed) {
    console.log('[DB Pool] Pool already closed');
    return;
  }
  poolClosed = true;
  console.log('[DB Pool] Closing connection pool...');
  try {
    await pool.end();
    console.log('[DB Pool] Connection pool closed');
  } catch (error) {
    console.error('[DB Pool] Error closing pool:', error);
  }
}

// Health check function
export async function checkPoolHealth(): Promise<{
  healthy: boolean;
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}> {
  try {
    // Test connection with timeout
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    isDatabaseAvailable = true;
    return {
      healthy: true,
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  } catch (error: any) {
    const errorMessage = error?.message || '';
    const isEndpointDisabled =
      errorMessage.includes('endpoint has been disabled') ||
      errorMessage.includes('Connection terminated') ||
      error?.code === 'XX000';

    if (isEndpointDisabled) {
      console.warn('[DB Pool] Database endpoint unavailable');
    } else {
      console.error('[DB Pool] Health check failed:', errorMessage);
    }

    isDatabaseAvailable = false;
    return {
      healthy: false,
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }
}

export const db = drizzle({ client: pool, schema });
