import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDigestScheduler } from "./digest-scheduler";
import { logger } from "./logger";
import { getPoolStats } from "./db";
import { cache } from "./cache";
import { getCircuitBreakerStats, isSystemHealthy } from "./circuit-breaker";
import { getQueueStats, isOverloaded, drainQueues } from "./request-queue";

// Global error handlers to prevent crashes from unhandled rejections/exceptions
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack
  });
  // Don't exit - log and continue
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });
  // For uncaught exceptions in critical paths, we may need to exit gracefully
  // But for now, log and attempt to continue
});

// sat1325upgrade: Graceful shutdown handling
let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`[Shutdown] ${signal} received, starting graceful shutdown...`);

  // Stop accepting new requests
  // Drain request queues
  await drainQueues(10000);

  logger.info('[Shutdown] Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const app = express();

// Enable gzip/brotli compression for all responses (40-70% size reduction)
app.use(compression({
  level: 6, // Balanced compression level (1-9, higher = more compression but slower)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't accept encoding
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression's default filter (compresses text, json, etc.)
    return compression.filter(req, res);
  }
}));

// Rate limiting to prevent abuse and ensure fair resource allocation
// Configurable via environment variable for different deployment scenarios
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '1000', 10);
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: RATE_LIMIT_MAX, // requests per minute per IP (default 1000, production use 200)
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: { error: 'Too many requests, please try again later' },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// HTTP caching headers middleware for API responses
app.use('/api', (req, res, next) => {
  // Skip caching for mutations (POST, PUT, DELETE, PATCH)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    res.set('Cache-Control', 'no-store');
    return next();
  }

  // Set cache headers for GET requests
  // private = only browser can cache, not CDNs
  // max-age=30 = cache for 30 seconds
  // must-revalidate = check with server after max-age expires
  res.set('Cache-Control', 'private, max-age=30, must-revalidate');
  res.set('Vary', 'Accept-Encoding, Authorization');
  next();
});

// Health check endpoint for load balancers and monitoring
// sat1325upgrade: Added circuit breaker and queue stats
app.get('/health', (req, res) => {
  const poolStats = getPoolStats();
  const cacheStats = cache.getStats();
  const circuitBreakerStats = getCircuitBreakerStats();
  const queueStats = getQueueStats();
  const systemHealthy = isSystemHealthy();
  const overloaded = isOverloaded();

  // Return 503 if system is unhealthy (for load balancer health checks)
  const statusCode = systemHealthy && !overloaded ? 200 : 503;

  res.status(statusCode).json({
    status: systemHealthy && !overloaded ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
    },
    database: poolStats,
    cache: cacheStats,
    circuitBreakers: circuitBreakerStats,
    queues: queueStats,
    flags: {
      systemHealthy,
      overloaded,
    },
    pid: process.pid,
    version: 'sat1325upgrade',
  });
});

// API health endpoint (for API-specific checks)
app.get('/api/health', (req, res) => {
  const systemHealthy = isSystemHealthy();
  const overloaded = isOverloaded();

  if (!systemHealthy || overloaded) {
    return res.status(503).json({
      status: 'degraded',
      timestamp: Date.now(),
      reason: !systemHealthy ? 'circuit_open' : 'overloaded',
    });
  }

  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Initialize digest scheduler for weekly email digests
  initializeDigestScheduler();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error but don't re-throw it - re-throwing causes unhandled exceptions
    // that crash the server
    logger.error('Unhandled error:', {
      status,
      message,
      stack: err.stack,
      name: err.name
    });

    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
