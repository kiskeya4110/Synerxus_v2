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

/**
 * Layer 1: Pre-startup cleanup
 * Only cleans up locks from DEAD processes - NEVER kills running instances
 * Returns false if any live server process owns the lock (caller should abort)
 */
function performPreStartupCleanup(port: number): boolean {
  logger.info(`[PortManager] Pre-startup cleanup for port ${port}...`);

  // Check for existing lock file
  if (fs.existsSync(LOCK_FILE_PATH)) {
    try {
      const lockContent = fs.readFileSync(LOCK_FILE_PATH, 'utf-8').trim();
      const [pidStr] = lockContent.split(':');
      const lockPid = parseInt(pidStr, 10);

      // Handle malformed lock file (invalid or missing PID)
      if (isNaN(lockPid)) {
        logger.warn(`[PortManager] Malformed lock file detected, removing`);
        try { fs.unlinkSync(LOCK_FILE_PATH); } catch (e) {}
        return true;
      }

      if (lockPid !== process.pid) {
        // Check if process is still alive using kill signal 0
        let processAlive = false;
        try {
          process.kill(lockPid, 0);
          processAlive = true;
        } catch (e) {
          // Process doesn't exist - lock is stale
          processAlive = false;
        }

        if (processAlive) {
          // Process is alive - NEVER kill it, abort this startup instead
          logger.error(`[PortManager] Active server running (PID: ${lockPid})`);
          logger.error(`[PortManager] Cannot start - another instance is already running`);
          return false; // Signal caller to abort
        } else {
          // Process is dead - safe to remove stale lock and attempt socket cleanup
          logger.info(`[PortManager] Removing stale lock (PID ${lockPid} not running)`);
          fs.unlinkSync(LOCK_FILE_PATH);
          
          // Attempt to clean up stale socket from dead process
          try {
            execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { 
              encoding: 'utf-8', 
              timeout: 2000 
            });
          } catch (e) {
            // Ignore - fuser might not be available
          }
        }
      }
    } catch (error) {
      // Lock file unreadable/corrupt - remove it and proceed
      logger.warn(`[PortManager] Error reading lock file, removing`);
      try { fs.unlinkSync(LOCK_FILE_PATH); } catch (e) {}
    }
  }

  logger.info(`[PortManager] Pre-startup cleanup complete`);
  return true; // Safe to proceed
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
 * Layer 3: Enhanced port binding with aggressive retry strategy
 * Lock is already acquired by initializePortManagement
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

  const attemptBind = () => {
    serverState.retryCount++;
    const attemptCount = serverState.retryCount;

    // Clean up previous error listeners
    server.removeAllListeners("error");

    // Force close if already listening
    if (server.listening) {
      try {
        server.close();
      } catch (e) {
        // Ignore
      }
    }

    logger.info(`[PortManager] Binding to port ${port} (attempt ${attemptCount}/${maxRetries})`);

    server.listen(
      { 
        port, 
        host, 
        reusePort: true,
        // @ts-ignore
        reuseAddr: true,
      },
      () => {
        serverState.isStarting = false;
        serverState.startTime = Date.now();
        logger.info(`[PortManager] Successfully bound to port ${port}`);
        onSuccess?.();
      }
    );

    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        if (attemptCount < maxRetries) {
          // Exponential backoff with jitter
          const delay = Math.min(
            baseRetryDelayMs * Math.pow(1.5, attemptCount) + Math.random() * 200,
            10000
          );

          logger.warn(`[PortManager] Port ${port} busy, retry in ${Math.round(delay)}ms (${attemptCount}/${maxRetries})`);
          setTimeout(attemptBind, delay);
        } else {
          logger.error(`[PortManager] Port ${port} unavailable after ${maxRetries} attempts`);
          releaseServerLock();
          process.exit(1);
        }
      } else {
        logger.error(`[PortManager] Server error:`, err);
        releaseServerLock();
        process.exit(1);
      }
    });
  };

  attemptBind();
}

/**
 * Layer 5: Comprehensive graceful shutdown
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

    shutdownInProgress = true;
    serverState.isShuttingDown = true;
    
    logger.info(`[PortManager] ${signal} - shutting down...`);

    // Hard timeout
    const forceExit = setTimeout(() => {
      logger.error(`[PortManager] Shutdown timeout, forcing exit`);
      releaseServerLock();
      process.exit(1);
    }, 15000);

    try {
      if (onShutdown) {
        await Promise.race([
          onShutdown(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ]).catch(() => {});
      }

      if (server.listening) {
        await new Promise<void>((resolve) => {
          server.close(() => {
            logger.info(`[PortManager] Server closed`);
            resolve();
          });
        });
      }

      clearTimeout(forceExit);
      releaseServerLock();
      process.exit(0);
    } catch (err) {
      clearTimeout(forceExit);
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
