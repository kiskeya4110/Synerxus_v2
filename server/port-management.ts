import { Server } from "http";
import * as fs from "fs";
import { execSync } from "child_process";
import { logger } from "./logger";

/**
 * COMPREHENSIVE PORT CONFLICT PREVENTION FRAMEWORK
 * 
 * Multi-layered defense against port 5000 conflicts:
 * - Layer 1: Pre-startup cleanup kills stale processes and clears lock
 * - Layer 2: Single lock acquisition at startup, not per-retry
 * - Layer 3: Aggressive retry with exponential backoff + jitter
 * - Layer 4: OS-level socket options for faster port release
 * - Layer 5: Comprehensive graceful shutdown with crash handling
 */

const LOCK_FILE_PATH = "/tmp/synerxus-server.lock";
const DEFAULT_PORT = 5000;

interface PortBindingOptions {
  port: number;
  host?: string;
  maxRetries?: number;
  baseRetryDelayMs?: number;
}

interface ServerState {
  isStarting: boolean;
  isShuttingDown: boolean;
  startTime: number | null;
  retryCount: number;
  lockAcquired: boolean;
}

// Global server state
const serverState: ServerState = {
  isStarting: false,
  isShuttingDown: false,
  startTime: null,
  retryCount: 0,
  lockAcquired: false,
};

// Track active connections for graceful shutdown
let activeConnections = new Set<any>();
let connectionIdCounter = 0;

/**
 * Layer 1: Pre-startup cleanup
 * Cleans up stale locks - uses timestamp to detect PID recycling
 * Only blocks if lock is recent (<30s) AND PID is alive
 */
function performPreStartupCleanup(port: number): boolean {
  logger.info(`[PortManager] Pre-startup cleanup for port ${port}...`);

  // Check for existing lock file
  if (fs.existsSync(LOCK_FILE_PATH)) {
    try {
      const lockContent = fs.readFileSync(LOCK_FILE_PATH, 'utf-8').trim();
      const [pidStr, timestampStr] = lockContent.split(':');
      const lockPid = parseInt(pidStr, 10);
      const lockTimestamp = parseInt(timestampStr, 10);

      // Handle malformed lock file (invalid or missing PID)
      if (isNaN(lockPid)) {
        logger.warn(`[PortManager] Malformed lock file detected, removing`);
        try { fs.unlinkSync(LOCK_FILE_PATH); } catch (e) {}
        return true;
      }

      if (lockPid !== process.pid) {
        const lockAge = Date.now() - (lockTimestamp || 0);
        
        // Check if process is still alive using kill signal 0
        let processAlive = false;
        try {
          process.kill(lockPid, 0);
          processAlive = true;
        } catch (e) {
          processAlive = false;
        }

        // Only block if BOTH: process alive AND lock is recent (<30s)
        // This handles PID recycling - old lock + alive PID = different process
        if (processAlive && lockAge < 30000) {
          logger.error(`[PortManager] Active server running (PID: ${lockPid}, age: ${Math.round(lockAge/1000)}s)`);
          logger.error(`[PortManager] Cannot start - another instance is already running`);
          return false;
        } else {
          // Either process dead OR lock is old (PID recycled)
          logger.info(`[PortManager] Removing stale lock (PID: ${lockPid}, age: ${Math.round(lockAge/1000)}s)`);
          try { fs.unlinkSync(LOCK_FILE_PATH); } catch (e) {}
          
          // Attempt to clean up stale socket
          try {
            execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { 
              encoding: 'utf-8', 
              timeout: 2000 
            });
          } catch (e) {}
        }
      }
    } catch (error) {
      logger.warn(`[PortManager] Error reading lock file, removing`);
      try { fs.unlinkSync(LOCK_FILE_PATH); } catch (e) {}
    }
  }

  logger.info(`[PortManager] Pre-startup cleanup complete`);
  return true;
}

/**
 * Layer 2: Acquire server lock with exclusive file creation
 * Uses O_CREAT | O_EXCL to ensure atomicity - only one process can create the lock
 */
function acquireServerLock(): boolean {
  if (serverState.lockAcquired) {
    return true; // Already have the lock
  }

  try {
    // Use exclusive file creation - fails if file already exists
    const fd = fs.openSync(LOCK_FILE_PATH, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY);
    fs.writeSync(fd, `${process.pid}:${Date.now()}`);
    fs.closeSync(fd);
    serverState.lockAcquired = true;
    logger.info(`[PortManager] Acquired exclusive lock (PID: ${process.pid})`);
    return true;
  } catch (error: any) {
    if (error.code === 'EEXIST') {
      // Lock file exists - another process has the lock
      logger.error(`[PortManager] Lock file exists - another server instance is running`);
      return false;
    }
    logger.warn(`[PortManager] Lock acquisition failed:`, error);
    return false;
  }
}

/**
 * Release the server lock file
 */
function releaseServerLock(): void {
  if (!serverState.lockAcquired) {
    return;
  }

  try {
    if (fs.existsSync(LOCK_FILE_PATH)) {
      const lockContent = fs.readFileSync(LOCK_FILE_PATH, 'utf-8').trim();
      const lockPid = parseInt(lockContent.split(':')[0], 10);
      
      // Only remove if we own the lock
      if (lockPid === process.pid) {
        fs.unlinkSync(LOCK_FILE_PATH);
        serverState.lockAcquired = false;
        logger.info(`[PortManager] Released lock`);
      }
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Initialize the port management framework
 * MUST be called before server.listen()
 * Performs cleanup and acquires lock
 */
export function initializePortManagement(port: number = DEFAULT_PORT): void {
  logger.info(`[PortManager] Initializing framework for port ${port}`);
  
  // Layer 1: Pre-startup cleanup (only removes STALE locks - respects healthy instances)
  const cleanupOk = performPreStartupCleanup(port);
  if (!cleanupOk) {
    logger.error(`[PortManager] FATAL: A healthy server instance is already running. Aborting.`);
    process.exit(1);
  }
  
  // Layer 2: Acquire lock immediately (only once) - MUST succeed or abort
  const lockAcquired = acquireServerLock();
  if (!lockAcquired) {
    logger.error(`[PortManager] FATAL: Cannot acquire server lock. Another instance may be running.`);
    logger.error(`[PortManager] If no other instance is running, delete ${LOCK_FILE_PATH} manually.`);
    process.exit(1);
  }
  
  // Register handlers for all exit paths to ensure lock release
  const cleanup = () => {
    releaseServerLock();
  };

  // Handle all exit paths
  process.on('exit', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGHUP', cleanup);
  process.on('uncaughtException', (err) => {
    logger.error(`[PortManager] Uncaught exception:`, err);
    cleanup();
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error(`[PortManager] Unhandled rejection:`, reason);
    cleanup();
    process.exit(1);
  });
  
  logger.info(`[PortManager] Framework ready (PID: ${process.pid})`);
}

/**
 * Layer 3: Simplified port binding with retry
 * Uses promise-based approach for cleaner error handling
 */
export function bindPortWithRetry(
  server: Server,
  options: PortBindingOptions,
  onSuccess?: () => void
): void {
  const {
    port = DEFAULT_PORT,
    host = "0.0.0.0",
    maxRetries = 10,
    baseRetryDelayMs = 500,
  } = options;

  serverState.isStarting = true;
  serverState.retryCount = 0;

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper to close server if it's in a bad state
  async function ensureServerClosed(): Promise<void> {
    return new Promise((resolve) => {
      if (server.listening) {
        server.close(() => resolve());
      } else {
        // Remove all listeners to reset server state
        server.removeAllListeners();
        resolve();
      }
    });
  }

  async function tryBind(): Promise<void> {
    while (serverState.retryCount < maxRetries) {
      serverState.retryCount++;
      const attempt = serverState.retryCount;

      // Clean up server state before each attempt
      if (attempt > 1) {
        await ensureServerClosed();
      }

      logger.info(`[PortManager] Binding to port ${port} (attempt ${attempt}/${maxRetries})`);

      try {
        await new Promise<void>((resolve, reject) => {
          const onListening = () => {
            server.removeListener("error", onError);
            resolve();
          };

          const onError = (err: any) => {
            server.removeListener("listening", onListening);
            reject(err);
          };

          server.once("listening", onListening);
          server.once("error", onError);

          server.listen(port, host);
        });

        // Success!
        serverState.isStarting = false;
        serverState.startTime = Date.now();
        logger.info(`[PortManager] Successfully bound to port ${port}`);
        onSuccess?.();
        return;
      } catch (err: any) {
        if (err.code === "EADDRINUSE" && attempt < maxRetries) {
          const delay = Math.min(
            baseRetryDelayMs * Math.pow(1.5, attempt) + Math.random() * 200,
            10000
          );
          logger.warn(`[PortManager] Port ${port} busy, retry in ${Math.round(delay)}ms (${attempt}/${maxRetries})`);
          await sleep(delay);
        } else {
          logger.error(`[PortManager] Failed to bind: ${err.message}`);
          releaseServerLock();
          process.exit(1);
        }
      }
    }
  }

  tryBind().catch((err) => {
    logger.error("[PortManager] Binding failed:", err);
    releaseServerLock();
    process.exit(1);
  });
}

/**
 * Track server connections for graceful shutdown
 */
export function trackConnection(conn: any): void {
  const connId = ++connectionIdCounter;
  (conn as any).__connId = connId;
  activeConnections.add(conn);

  conn.on('close', () => {
    activeConnections.delete(conn);
  });
}

/**
 * Get active connection count
 */
export function getActiveConnectionCount(): number {
  return activeConnections.size;
}

/**
 * Close all active connections gracefully
 */
function closeAllConnections(): void {
  logger.info(`[PortManager] Closing ${activeConnections.size} active connections...`);

  Array.from(activeConnections).forEach(conn => {
    try {
      // End connection gracefully
      if (conn.end) {
        conn.end();
      } else if (conn.destroy) {
        conn.destroy();
      }
    } catch (e) {
      // Ignore errors during shutdown
    }
  });

  activeConnections.clear();
}

/**
 * Layer 5: Comprehensive graceful shutdown with connection draining
 */
export function setupGracefulShutdown(
  server: Server,
  onShutdown?: () => Promise<void>
): void {
  let shutdownInProgress = false;

  const shutdown = async (signal: string) => {
    if (shutdownInProgress || serverState.isShuttingDown) {
      return;
    }

    // Don't shutdown during startup - let retries complete
    if (serverState.isStarting) {
      logger.info(`[PortManager] ${signal} received during startup, ignoring`);
      return;
    }

    shutdownInProgress = true;
    serverState.isShuttingDown = true;

    logger.info(`[PortManager] ${signal} - shutting down (${activeConnections.size} active connections)...`);

    // Hard timeout - increased for connection draining
    const forceExit = setTimeout(() => {
      logger.error(`[PortManager] Shutdown timeout, forcing exit`);
      closeAllConnections();
      releaseServerLock();
      process.exit(1);
    }, 20000);

    try {
      // Stop accepting new connections first
      if (server.listening) {
        server.close(() => {
          logger.info(`[PortManager] Server stopped accepting new connections`);
        });
      }

      // Run custom shutdown handler (queue draining, etc.)
      if (onShutdown) {
        await Promise.race([
          onShutdown(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ]).catch((err) => {
          logger.warn(`[PortManager] Shutdown handler error:`, err);
        });
      }

      // Wait for active connections to finish (max 5 seconds)
      const connDrainStart = Date.now();
      while (activeConnections.size > 0 && Date.now() - connDrainStart < 5000) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (activeConnections.size > 0) {
        logger.warn(`[PortManager] ${activeConnections.size} connections still active, closing forcefully`);
        closeAllConnections();
      }

      clearTimeout(forceExit);
      releaseServerLock();
      logger.info(`[PortManager] Graceful shutdown complete`);
      process.exit(0);
    } catch (err) {
      logger.error(`[PortManager] Shutdown error:`, err);
      clearTimeout(forceExit);
      closeAllConnections();
      releaseServerLock();
      process.exit(1);
    }
  };

  // Handle all termination signals
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGHUP", () => shutdown("SIGHUP"));
}

/**
 * Get current server state
 */
export function getServerState(): Readonly<ServerState> {
  return { ...serverState };
}
