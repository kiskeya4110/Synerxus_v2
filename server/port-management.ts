import { Server } from "http";
import { logger } from "./logger";

interface PortBindingOptions {
  port: number;
  host?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Enhanced port binding with automatic recovery from conflicts
 * Implements exponential backoff and graceful cleanup
 */
export function bindPortWithRetry(
  server: Server,
  options: PortBindingOptions,
  onSuccess?: () => void
): void {
  const {
    port,
    host = "0.0.0.0",
    maxRetries = 5,
    retryDelayMs = 1000,
  } = options;

  let attemptCount = 0;
  let lastError: NodeJS.ErrnoException | null = null;

  const attemptBind = () => {
    attemptCount++;
    
    // Clean up previous error listeners to prevent duplicates
    server.removeAllListeners("error");

    // Force close any existing connections
    if (server.listening) {
      server.close();
    }

    server.listen(
      { port, host, reusePort: true, reuseAddr: true },
      () => {
        logger.info(`[Port] Successfully bound to port ${port}`);
        onSuccess?.();
      }
    );

    // Use once() to prevent duplicate error handlers
    server.once("error", (err: NodeJS.ErrnoException) => {
      lastError = err;

      if (err.code === "EADDRINUSE") {
        logger.warn(
          `[Port] Port ${port} in use, retrying in ${retryDelayMs}ms (attempt ${attemptCount}/${maxRetries})`
        );

        if (attemptCount < maxRetries) {
          // Exponential backoff: increase delay with each retry
          const backoffDelay = retryDelayMs * attemptCount;
          setTimeout(() => attemptBind(), backoffDelay);
        } else {
          logger.error(
            `[Port] Port ${port} still in use after ${maxRetries} attempts. Force exiting...`
          );

          // Attempt graceful cleanup
          const exitTimeout = setTimeout(() => {
            logger.error(
              "[Port] Forced exit due to port binding timeout"
            );
            process.exit(1);
          }, 5000);

          server.close(() => {
            clearTimeout(exitTimeout);
            logger.error("[Port] Server closed");
            process.exit(1);
          });
        }
      } else {
        logger.error("[Port] Unexpected server error:", err);
        process.exit(1);
      }
    });
  };

  // Initial attempt
  attemptBind();
}

/**
 * Setup graceful shutdown handlers for port cleanup
 */
export function setupGracefulShutdown(
  server: Server,
  onShutdown?: () => Promise<void>
): void {
  const shutdown = async (signal: string) => {
    logger.info(`[Shutdown] ${signal} received, starting graceful shutdown...`);

    try {
      // Run custom shutdown logic
      if (onShutdown) {
        await onShutdown();
      }

      // Close server
      if (server.listening) {
        server.close(() => {
          logger.info("[Shutdown] Server closed");
          process.exit(0);
        });

        // Force exit after timeout
        setTimeout(() => {
          logger.error("[Shutdown] Forced exit after timeout");
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    } catch (err) {
      logger.error("[Shutdown] Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
