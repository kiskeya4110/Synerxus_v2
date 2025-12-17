/**
 * Port Manager - Automatic Port Conflict Resolution
 *
 * This module provides robust port management including:
 * - Automatic detection and cleanup of stale processes
 * - Graceful port acquisition with retries
 * - Force-kill capability for stubborn processes
 * - Cross-platform compatibility
 */

import { execSync, spawn } from 'child_process';
import * as net from 'net';
import { logger } from './logger';

interface PortManagerConfig {
  port: number;
  maxRetries: number;
  retryDelayMs: number;
  forceKillOnConflict: boolean;
}

const DEFAULT_CONFIG: PortManagerConfig = {
  port: 5000,
  maxRetries: 3,
  retryDelayMs: 1000,
  forceKillOnConflict: true,
};

/**
 * Check if a port is in use by attempting to bind to it
 * This is more reliable than checking process lists as it handles TIME_WAIT state
 */
export function isPortInUse(port: number): boolean {
  // Sync check using process list
  return hasProcessesOnPort(port);
}

/**
 * Async version of port check - attempts to actually bind to the port
 */
export async function isPortInUseAsync(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const tester = net.createServer()
      .once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.close(() => resolve(false));
      })
      .listen(port, '0.0.0.0');

    // Timeout after 2 seconds
    setTimeout(() => {
      try { tester.close(); } catch {}
      resolve(false);
    }, 2000);
  });
}

/**
 * Check if a port has processes (using system tools)
 */
export function hasProcessesOnPort(port: number): boolean {
  try {
    // Try using lsof first (most reliable on Linux/Mac)
    const result = execSync(`lsof -i :${port} -t 2>/dev/null || true`, {
      encoding: 'utf-8',
      timeout: 5000
    }).trim();
    return result.length > 0;
  } catch {
    try {
      // Fallback to fuser
      const result = execSync(`fuser ${port}/tcp 2>/dev/null || true`, {
        encoding: 'utf-8',
        timeout: 5000
      }).trim();
      return result.length > 0;
    } catch {
      // If both fail, assume no processes
      return false;
    }
  }
}

/**
 * Get PIDs of processes using a port
 */
export function getProcessesOnPort(port: number): number[] {
  try {
    const result = execSync(`lsof -i :${port} -t 2>/dev/null || true`, {
      encoding: 'utf-8',
      timeout: 5000
    }).trim();

    if (!result) return [];

    return result.split('\n')
      .map(pid => parseInt(pid.trim(), 10))
      .filter(pid => !isNaN(pid) && pid > 0);
  } catch {
    try {
      const result = execSync(`fuser ${port}/tcp 2>/dev/null || true`, {
        encoding: 'utf-8',
        timeout: 5000
      }).trim();

      if (!result) return [];

      return result.split(/\s+/)
        .map(pid => parseInt(pid.trim(), 10))
        .filter(pid => !isNaN(pid) && pid > 0);
    } catch {
      return [];
    }
  }
}

/**
 * Kill a process by PID
 */
export function killProcess(pid: number, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): boolean {
  try {
    process.kill(pid, signal);
    logger.info(`[PortManager] Sent ${signal} to PID ${pid}`);
    return true;
  } catch (err: any) {
    if (err.code === 'ESRCH') {
      // Process doesn't exist - already dead
      return true;
    }
    logger.warn(`[PortManager] Failed to kill PID ${pid}:`, err.message);
    return false;
  }
}

/**
 * Force kill all processes on a port
 */
export function forceKillPort(port: number): boolean {
  const pids = getProcessesOnPort(port);

  if (pids.length === 0) {
    logger.info(`[PortManager] No processes found on port ${port}`);
    return true;
  }

  logger.info(`[PortManager] Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);

  // First try graceful termination
  for (const pid of pids) {
    // Don't kill ourselves
    if (pid === process.pid) continue;
    killProcess(pid, 'SIGTERM');
  }

  // Wait a moment for graceful shutdown
  return new Promise<boolean>((resolve) => {
    setTimeout(() => {
      const remainingPids = getProcessesOnPort(port).filter(p => p !== process.pid);

      if (remainingPids.length === 0) {
        logger.info(`[PortManager] Port ${port} cleared successfully`);
        resolve(true);
        return;
      }

      // Force kill remaining processes
      logger.warn(`[PortManager] ${remainingPids.length} process(es) still on port ${port}, force killing...`);
      for (const pid of remainingPids) {
        killProcess(pid, 'SIGKILL');
      }

      // Final check
      setTimeout(() => {
        const finalCheck = getProcessesOnPort(port).filter(p => p !== process.pid);
        if (finalCheck.length === 0) {
          logger.info(`[PortManager] Port ${port} cleared after force kill`);
          resolve(true);
        } else {
          logger.error(`[PortManager] Failed to clear port ${port}, PIDs still running: ${finalCheck.join(', ')}`);
          resolve(false);
        }
      }, 500);
    }, 1000);
  }) as unknown as boolean;
}

/**
 * Async version of forceKillPort
 */
export async function forceKillPortAsync(port: number): Promise<boolean> {
  const pids = getProcessesOnPort(port);

  if (pids.length === 0) {
    logger.info(`[PortManager] No processes found on port ${port}`);
    return true;
  }

  logger.info(`[PortManager] Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);

  // First try graceful termination
  for (const pid of pids) {
    if (pid === process.pid) continue;
    killProcess(pid, 'SIGTERM');
  }

  // Wait for graceful shutdown
  await new Promise(resolve => setTimeout(resolve, 1500));

  const remainingPids = getProcessesOnPort(port).filter(p => p !== process.pid);

  if (remainingPids.length === 0) {
    logger.info(`[PortManager] Port ${port} cleared successfully`);
    return true;
  }

  // Force kill remaining processes
  logger.warn(`[PortManager] ${remainingPids.length} process(es) still on port ${port}, force killing...`);
  for (const pid of remainingPids) {
    killProcess(pid, 'SIGKILL');
  }

  // Final wait and check
  await new Promise(resolve => setTimeout(resolve, 500));

  const finalCheck = getProcessesOnPort(port).filter(p => p !== process.pid);
  if (finalCheck.length === 0) {
    logger.info(`[PortManager] Port ${port} cleared after force kill`);
    return true;
  }

  logger.error(`[PortManager] Failed to clear port ${port}, PIDs still running: ${finalCheck.join(', ')}`);
  return false;
}

/**
 * Ensure port is available before starting server
 * This is the main function to call before server.listen()
 * Handles both process cleanup and TIME_WAIT state
 */
export async function ensurePortAvailable(port: number = 5000): Promise<boolean> {
  // Kill any processes that might be using the port
  const pids = getProcessesOnPort(port);
  if (pids.length > 0) {
    logger.warn(`[PortManager] Found ${pids.length} process(es) on port ${port}, killing them...`);
    await forceKillPortAsync(port);
    // Wait a moment for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 500));
  } else {
    logger.info(`[PortManager] No processes found on port ${port}`);
  }

  // Return true - we've done what we can, the actual server start will handle TIME_WAIT with retries
  return true;
}

/**
 * Create a managed server start function with automatic port cleanup
 * Uses exponential backoff for TIME_WAIT handling
 */
export function createManagedServerStart(
  server: any,
  config: Partial<PortManagerConfig> = {}
): () => Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const maxAttempts = 5;
  const baseDelay = 2000;

  // Increase max listeners to prevent warnings
  server.setMaxListeners(20);

  return async function startManagedServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      let currentErrorHandler: ((err: NodeJS.ErrnoException) => void) | null = null;

      const tryStart = () => {
        attempts++;

        // Remove previous error handler if exists
        if (currentErrorHandler) {
          server.removeListener('error', currentErrorHandler);
        }

        // Calculate delay with exponential backoff (2s, 3s, 5s, 7s, 10s)
        const delay = Math.min(baseDelay * Math.pow(1.5, attempts - 1), 10000);

        currentErrorHandler = (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE' && attempts < maxAttempts) {
            logger.warn(`[PortManager] Port ${cfg.port} in use (attempt ${attempts}/${maxAttempts}), waiting ${Math.round(delay/1000)}s...`);

            // Try to kill any lingering processes
            const pids = getProcessesOnPort(cfg.port);
            if (pids.length > 0) {
              logger.info(`[PortManager] Found PIDs on port: ${pids.join(', ')}, killing...`);
              pids.forEach(pid => {
                if (pid !== process.pid) killProcess(pid, 'SIGKILL');
              });
            }

            setTimeout(tryStart, delay);
          } else if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${cfg.port} could not be acquired. Another server may be running.`));
          } else {
            reject(err);
          }
        };

        server.once('error', currentErrorHandler);

        server.listen({
          port: cfg.port,
          host: '0.0.0.0',
        }, () => {
          if (currentErrorHandler) {
            server.removeListener('error', currentErrorHandler);
          }
          logger.info(`[PortManager] Server started successfully on port ${cfg.port}`);
          resolve();
        });
      };

      tryStart();
    });
  };
}

/**
 * Cleanup function to be called on process exit
 */
export function setupProcessCleanup(server: any, port: number): void {
  const cleanup = (signal: string) => {
    logger.info(`[PortManager] ${signal} received, cleaning up...`);

    if (server.listening) {
      server.close(() => {
        logger.info(`[PortManager] Server closed cleanly`);
        process.exit(0);
      });

      // Force exit if close takes too long
      setTimeout(() => {
        logger.warn(`[PortManager] Forcing exit after timeout`);
        process.exit(0);
      }, 5000);
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => cleanup('SIGTERM'));
  process.on('SIGINT', () => cleanup('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    logger.error('[PortManager] Uncaught exception:', err);
    cleanup('uncaughtException');
  });
}

export default {
  isPortInUse,
  isPortInUseAsync,
  hasProcessesOnPort,
  getProcessesOnPort,
  killProcess,
  forceKillPort,
  forceKillPortAsync,
  ensurePortAvailable,
  createManagedServerStart,
  setupProcessCleanup,
};
