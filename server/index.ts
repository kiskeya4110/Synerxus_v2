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
import { startMemoryMonitoring, getMemorySummary } from "./memory-monitor";
import {
  initializePortManagement,
  bindPortWithRetry,
  setupGracefulShutdown,
  getServerState,
  trackConnection,
  getActiveConnectionCount
} from "./port-management";
import { updateSystemHealth } from "./circuit-breaker";
import { onMemoryPressureChange } from "./memory-monitor";
import { isPoolUnderPressure } from "./db";
import { randomBytes } from "crypto";

// Initialize port management framework FIRST (before any other code)
// This performs pre-startup cleanup and acquires the process lock
initializePortManagement(5000);

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

// Trust proxy for accurate rate limiting behind reverse proxies (Replit, Heroku, etc.)
app.set('trust proxy', 1);

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

// Request ID middleware for tracing
app.use((req, res, next) => {
  // Generate a unique request ID
  const requestId = req.headers['x-request-id'] as string ||
    `req-${randomBytes(8).toString('hex')}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Request timeout middleware (30 second default for API)
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);
app.use('/api', (req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      logger.warn(`[Request] Timeout after ${REQUEST_TIMEOUT_MS}ms`, {
        requestId: req.headers['x-request-id'],
        path: req.path,
        method: req.method,
      });
      res.status(504).json({
        error: 'Gateway Timeout',
        message: 'Request processing took too long',
        requestId: req.headers['x-request-id'],
      });
    }
  }, REQUEST_TIMEOUT_MS);

  // Clear timeout when response finishes
  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));

  next();
});

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
// sat1325upgrade: Added circuit breaker, queue stats, and memory monitoring
app.get('/health', (req, res) => {
  const poolStats = getPoolStats();
  const cacheStats = cache.getStats();
  const circuitBreakerStats = getCircuitBreakerStats();
  const queueStats = getQueueStats();
  const memorySummary = getMemorySummary();
  const systemHealthy = isSystemHealthy();
  const overloaded = isOverloaded();
  const memoryHealthy = memorySummary.isHealthy;
  const serverState = getServerState();
  const activeConnections = getActiveConnectionCount();

  // Return 503 if system is unhealthy (for load balancer health checks)
  const statusCode = systemHealthy && !overloaded && memoryHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: systemHealthy && !overloaded && memoryHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      current: {
        heapUsed: `${memorySummary.current.heapUsedMB}MB`,
        heapTotal: `${memorySummary.current.heapTotalMB}MB`,
        rss: `${memorySummary.current.rssMB}MB`,
        heapUsedPercent: `${memorySummary.current.heapUsedPercent}%`,
      },
      average: {
        heapUsed: `${memorySummary.average.heapUsedMB}MB`,
        heapUsedPercent: `${memorySummary.average.heapUsedPercent}%`,
      },
      peak: {
        heapUsed: `${memorySummary.peak.heapUsedMB}MB`,
      },
      trend: memorySummary.trend,
      healthy: memoryHealthy,
    },
    database: poolStats,
    cache: cacheStats,
    circuitBreakers: circuitBreakerStats,
    queues: queueStats,
    connections: {
      active: activeConnections,
      serverState: serverState.isStarting ? 'starting' : serverState.isShuttingDown ? 'shutting_down' : 'running',
    },
    flags: {
      systemHealthy,
      overloaded,
      memoryHealthy,
      dbPoolHealthy: poolStats.health?.isHealthy ?? true,
    },
    pid: process.pid,
    version: 'sat1325upgrade-v2',
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
  let server;
  try {
    server = await registerRoutes(app);
  } catch (err) {
    logger.error('Failed to register routes:', err);
    process.exit(1);
  }

  // Start memory monitoring for health tracking
  startMemoryMonitoring();
  logger.info('[Server] Memory monitoring started');

  // Wire up memory pressure to circuit breaker
  onMemoryPressureChange((pressure) => {
    updateSystemHealth({ memoryPressure: pressure });
  });

  // Periodic DB pool health check for circuit breaker
  setInterval(() => {
    updateSystemHealth({ dbPoolUnderPressure: isPoolUnderPressure() });
  }, 5000);

  logger.info('[Server] Health monitoring integration active');

  // Initialize digest scheduler for weekly email digests (production only, deferred)
  // In development, skip to speed up server startup
  if (process.env.NODE_ENV === 'production') {
    // Defer scheduler initialization to avoid blocking server startup
    setImmediate(() => {
      try {
        initializeDigestScheduler();
      } catch (err) {
        logger.error('Failed to initialize digest scheduler:', err);
      }
    });
  } else {
    logger.info('Skipping digest scheduler in development mode');
  }

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

  // Use comprehensive port management framework for resilient binding
  // Features: process lock, aggressive retry with exponential backoff, graceful shutdown
  bindPortWithRetry(server, {
    port,
    host: "0.0.0.0",
    maxRetries: 10,           // 10 retry attempts with exponential backoff
    baseRetryDelayMs: 500,    // Start with 500ms delay, grows exponentially
  }, () => {
    log(`serving on port ${port}`);
    logger.info(`[Server] Port management framework active - PID: ${process.pid}`);

    // Track connections for graceful shutdown
    server.on('connection', (conn) => {
      trackConnection(conn);
    });

    logger.info(`[Server] Connection tracking enabled`);
  });

  // Setup comprehensive graceful shutdown handlers
  // Handles SIGTERM, SIGINT, SIGHUP, uncaught exceptions, and exit
  setupGracefulShutdown(server, async () => {
    logger.info('[Server] Draining request queues before shutdown...');
    await drainQueues(10000);
    logger.info('[Server] Request queues drained');
  });
})().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
