import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDigestScheduler } from "./digest-scheduler";
import { logger } from "./logger";
import { cache } from "./cache";
import { redisCache } from "./redis-cache";
import { closePool } from "./db";
import { csrfProtection, csrfTokenHandler } from "./middleware/csrf";
import { verifyFirebaseToken, optionalFirebaseAuth } from "./middleware/firebase-auth";
import { jobQueue } from "./jobs/job-queue";
import { apiResponseMiddleware } from "./utils/api-response";
import {
  createTieredRateLimiter,
  authRateLimiter as tieredAuthLimiter,
  expensiveOpRateLimiter,
  getRateLimitInfo,
} from "./middleware/tiered-rate-limit";
import {
  initializeMonitoring,
  shutdownMonitoring,
  requestMetricsMiddleware,
  securityDetectionMiddleware,
  prometheusRouter,
  alertingEngine,
} from "./monitoring";

const app = express();

// =============================================================================
// SECURITY: HELMET - Enterprise-grade security headers
// Target: A+ on securityheaders.com
// =============================================================================
app.use(helmet({
  // Content Security Policy - Prevents XSS and injection attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for React in dev, consider removing in strict production
        "https://apis.google.com",
        "https://*.firebaseapp.com",
        "https://*.firebase.com",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind CSS inline styles
        "https://fonts.googleapis.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "https://*.googleapis.com",
        "https://*.gstatic.com",
      ],
      connectSrc: [
        "'self'",
        "https://*.firebaseio.com",
        "https://*.googleapis.com",
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com",
        "wss://*.firebaseio.com",
        "wss:",
        "ws:",
      ],
      frameSrc: [
        "'self'",
        "https://*.firebaseapp.com",
        "https://accounts.google.com",
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["blob:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  // Strict Transport Security - Forces HTTPS
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // Prevent MIME type sniffing
  xContentTypeOptions: true,
  // Prevent clickjacking
  xFrameOptions: { action: "deny" },
  // Enable XSS filter in browsers
  xXssProtection: true,
  // Control referrer information
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  // Disable DNS prefetching
  dnsPrefetchControl: { allow: false },
  // IE no-open for downloads
  ieNoOpen: true,
  // Hide X-Powered-By header
  hidePoweredBy: true,
  // Permissions Policy (formerly Feature Policy)
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  crossOriginEmbedderPolicy: false, // Disabled for Firebase compatibility
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // Allow OAuth popups
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
}));

// Custom Permissions-Policy header (not fully supported by helmet)
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );
  next();
});

// =============================================================================
// SECURITY: CORS - Cross-Origin Resource Sharing
// Strict origin validation for production security
// =============================================================================
const ALLOWED_ORIGINS = [
  // Production domains (add your actual domains here)
  process.env.FRONTEND_URL,
  // Development
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5000',
  // Replit domains
  /\.replit\.dev$/,
  /\.repl\.co$/,
  /\.replit\.app$/,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check against allowed origins
    const isAllowed = ALLOWED_ORIGINS.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies for session auth
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-user-id',
    'x-request-id',
    'x-csrf-token',
    'If-None-Match',
    'Cache-Control',
  ],
  exposedHeaders: [
    'ETag',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-RateLimit-Tier',
    'X-RateLimit-Burst-Active',
    'X-RateLimit-Burst-Remaining',
    'Retry-After',
  ],
  maxAge: 86400, // Cache preflight for 24 hours
}));

// =============================================================================
// SECURITY: REQUEST BODY LIMITS - Prevents payload attacks
// =============================================================================
app.use(express.json({ limit: '10mb' })); // 10MB limit for JSON
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// =============================================================================
// SECURITY: COOKIE PARSER - Required for CSRF protection
// =============================================================================
app.use(cookieParser());

// =============================================================================
// SECURITY: CSRF PROTECTION - Prevents cross-site request forgery
// Uses double-submit cookie pattern for stateless CSRF protection
// =============================================================================
// CSRF token endpoint (must be before CSRF protection middleware)
app.get('/api/csrf-token', csrfTokenHandler);

// Apply CSRF protection to all API routes except webhooks and health checks
const CSRF_EXEMPT_PATHS = [
  '/api/csrf-token',
  '/api/webhooks',
  '/health',
  '/ready',
];
app.use('/api/', (req, res, next) => {
  // Skip CSRF for exempt paths
  if (CSRF_EXEMPT_PATHS.some(path => req.path.startsWith(path.replace('/api', '')))) {
    return next();
  }
  return csrfProtection(req, res, next);
});

// =============================================================================
// SECURITY: INPUT SANITIZATION - XSS and injection prevention
// =============================================================================
import { sanitizeRequest } from "./middleware/sanitize";
app.use('/api/', sanitizeRequest);

// =============================================================================
// SECURITY: AUDIT LOGGING - Track sensitive operations
// =============================================================================
import { auditLog, addRequestId } from "./middleware/audit";
app.use(addRequestId); // Add request ID to all requests
app.use('/api/', auditLog); // Audit logging for sensitive operations

// =============================================================================
// API RESPONSE UTILITIES - Sparse fieldsets, pagination, ETags
// =============================================================================
app.use('/api/', apiResponseMiddleware);

// =============================================================================
// MONITORING - Request metrics and security detection
// =============================================================================
app.use(requestMetricsMiddleware);
app.use(securityDetectionMiddleware);

// =============================================================================
// COMPRESSION MIDDLEWARE - OPTIMIZED for 95%+ performance
// Reduces response size by 60-80% with aggressive settings
// =============================================================================
app.use(compression({
  filter: (req, res) => {
    // Don't compress if client requests no compression
    if (req.headers['x-no-compression']) return false;
    // Compress all API responses regardless of content type
    if (req.path.startsWith('/api/')) return true;
    // Use default filter for other content
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression ratio (1-9)
  threshold: 512, // Compress responses > 512 bytes (more aggressive)
  memLevel: 8, // Use more memory for better compression
  chunkSize: 16 * 1024, // 16KB chunks for better streaming
}));

// =============================================================================
// STATIC ASSET CACHING HEADERS - Aggressive browser caching
// =============================================================================
app.use((req, res, next) => {
  // Cache static assets for 1 year (immutable with hash-based filenames)
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Cache API responses for short duration (client can override with ETag)
  else if (req.path.startsWith('/api/') && req.method === 'GET') {
    res.set('Cache-Control', 'private, max-age=30');
  }
  next();
});

// =============================================================================
// RATE LIMITING - Enterprise-grade API abuse prevention
// Tiered rate limiting based on endpoint sensitivity
// =============================================================================

// Helper to create consistent rate limiter configurations
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  skipPaths?: string[];
}) => rateLimit({
  windowMs: options.windowMs,
  max: options.max,
  message: { message: options.message, retryAfter: Math.ceil(options.windowMs / 1000) },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default keyGenerator which handles IPv6 properly
  // Trust X-Forwarded-For header for proxy support
  validate: { xForwardedForHeader: false },
  skip: (req) => {
    const skipPaths = options.skipPaths || ['/api/metrics', '/health', '/ready'];
    return skipPaths.includes(req.path);
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded: ${req.ip} on ${req.method} ${req.path}`);
    res.status(429).json(options.message);
  },
});

// General API rate limit: 100 requests per minute per IP
const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

// Stricter limit for authentication endpoints: 10 requests per minute
const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
});

// Stricter limit for expensive operations: 20 requests per minute
const expensiveLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many requests for this resource, please try again later.',
});

// Mutation rate limit: 50 POST/PUT/PATCH/DELETE requests per minute
const mutationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 50,
  message: 'Too many write operations, please try again later.',
});

// Upload rate limit: 10 uploads per minute
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many uploads, please try again later.',
});

// Apply rate limiters to specific routes
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
app.use('/api/users/firebase-sync', authLimiter);
app.use('/api/dashboard', expensiveLimiter);
app.use('/api/matchmaker', expensiveLimiter);
app.use('/api/aiu', expensiveLimiter);
app.use('/api/storage', uploadLimiter);

// Apply mutation limiter to all POST/PUT/PATCH/DELETE requests
app.use('/api/', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return mutationLimiter(req, res, next);
  }
  next();
});

// General API limiter (applied last, catches remaining requests)
app.use('/api/', apiLimiter);

// =============================================================================
// HEALTH CHECK ENDPOINTS - For load balancers and Kubernetes
// =============================================================================
import { checkPoolHealth } from "./db";

// Liveness probe - Is the server running?
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness probe - Is the server ready to accept traffic?
app.get('/ready', async (req, res) => {
  try {
    const dbHealth = await checkPoolHealth();
    const memoryCacheStats = cache.getStats();
    const redisCacheStats = redisCache.getStats();
    const redisHealthy = await redisCache.isHealthy();

    const isReady = dbHealth.healthy;

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbHealth.healthy ? 'healthy' : 'unhealthy',
          connections: {
            total: dbHealth.totalCount,
            idle: dbHealth.idleCount,
            waiting: dbHealth.waitingCount,
          },
        },
        redis: {
          status: redisHealthy ? 'healthy' : 'degraded',
          mode: redisCacheStats.mode,
          connected: redisCacheStats.connected,
          hitRate: redisCacheStats.hitRate,
          errors: redisCacheStats.errors,
        },
        memoryCache: {
          status: 'healthy',
          size: memoryCacheStats.size,
          hitRate: memoryCacheStats.hitRate,
        },
      },
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// =============================================================================
// PERFORMANCE MONITORING MIDDLEWARE
// =============================================================================
interface PerformanceMetric {
  count: number;
  totalMs: number;
  maxMs: number;
  minMs: number;
  errors: number;
}

const performanceMetrics: Map<string, PerformanceMetric> = new Map();
const SLOW_REQUEST_THRESHOLD_MS = 100;
const HIGH_MEMORY_THRESHOLD_MB = 256;

// Performance tracking middleware
app.use((req, res, next) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  res.on("finish", () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds
    const endMemory = process.memoryUsage();

    // Track metrics per endpoint pattern
    const routePath = req.route?.path || req.path;
    const key = `${req.method} ${routePath}`;

    const existing = performanceMetrics.get(key) || {
      count: 0,
      totalMs: 0,
      maxMs: 0,
      minMs: Infinity,
      errors: 0
    };

    performanceMetrics.set(key, {
      count: existing.count + 1,
      totalMs: existing.totalMs + durationMs,
      maxMs: Math.max(existing.maxMs, durationMs),
      minMs: Math.min(existing.minMs, durationMs),
      errors: existing.errors + (res.statusCode >= 400 ? 1 : 0),
    });

    // Log slow API requests
    if (durationMs > SLOW_REQUEST_THRESHOLD_MS && req.path.startsWith('/api')) {
      logger.warn(`[SLOW] ${key} took ${durationMs.toFixed(2)}ms (status: ${res.statusCode})`);
    }

    // Log high memory usage
    const heapUsedMB = endMemory.heapUsed / 1024 / 1024;
    if (heapUsedMB > HIGH_MEMORY_THRESHOLD_MB) {
      logger.warn(`[MEMORY] High heap usage: ${heapUsedMB.toFixed(2)}MB after ${key}`);
    }
  });

  next();
});

// =============================================================================
// PERFORMANCE METRICS ENDPOINT
// =============================================================================
app.get("/api/metrics", (req, res) => {
  const metrics = Array.from(performanceMetrics.entries())
    .map(([endpoint, data]) => ({
      endpoint,
      requests: data.count,
      avgMs: data.count > 0 ? (data.totalMs / data.count).toFixed(2) : '0',
      minMs: data.minMs === Infinity ? '0' : data.minMs.toFixed(2),
      maxMs: data.maxMs.toFixed(2),
      errors: data.errors,
      errorRate: data.count > 0 ? ((data.errors / data.count) * 100).toFixed(2) + '%' : '0%',
    }))
    .sort((a, b) => parseFloat(b.avgMs) - parseFloat(a.avgMs));

  const memoryUsage = process.memoryUsage();
  const cacheStats = cache.getStats();

  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsedMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
      rssMB: (memoryUsage.rss / 1024 / 1024).toFixed(2),
      externalMB: (memoryUsage.external / 1024 / 1024).toFixed(2),
    },
    cache: cacheStats,
    endpoints: metrics,
    summary: {
      totalRequests: metrics.reduce((sum, m) => sum + m.requests, 0),
      totalErrors: metrics.reduce((sum, m) => sum + m.errors, 0),
      avgResponseTime: metrics.length > 0
        ? (metrics.reduce((sum, m) => sum + parseFloat(m.avgMs) * m.requests, 0) /
           metrics.reduce((sum, m) => sum + m.requests, 0)).toFixed(2)
        : '0',
    },
  });
});

// Reset metrics endpoint (for testing)
app.post("/api/metrics/reset", (req, res) => {
  performanceMetrics.clear();
  res.json({ message: "Metrics reset successfully" });
});

// =============================================================================
// PROMETHEUS METRICS ENDPOINT - For monitoring stack integration
// =============================================================================
app.use("/metrics", prometheusRouter);

// =============================================================================
// ALERTING ENDPOINTS - Alert management
// =============================================================================

// Get active alerts
app.get("/api/alerts", (req, res) => {
  const alerts = alertingEngine.getActiveAlerts();
  const summary = alertingEngine.getSummary();
  res.json({
    timestamp: new Date().toISOString(),
    summary,
    alerts,
  });
});

// Get alert history
app.get("/api/alerts/history", (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const history = alertingEngine.getAlertHistory(limit);
  res.json({
    timestamp: new Date().toISOString(),
    count: history.length,
    history,
  });
});

// Acknowledge an alert
app.post("/api/alerts/:id/acknowledge", (req, res) => {
  const { id } = req.params;
  const { acknowledgedBy } = req.body;

  const success = alertingEngine.acknowledgeAlert(id, acknowledgedBy || 'system');

  if (success) {
    res.json({ message: "Alert acknowledged" });
  } else {
    res.status(404).json({ message: "Alert not found or already acknowledged" });
  }
});

// =============================================================================
// JOB QUEUE ENDPOINTS - Background job management
// =============================================================================

// Get job queue statistics
app.get("/api/jobs/stats", (req, res) => {
  const stats = jobQueue.getStats();
  res.json({
    timestamp: new Date().toISOString(),
    ...stats,
  });
});

// Get rate limit info for current user (without consuming request)
app.get("/api/rate-limit/info", async (req, res) => {
  try {
    const info = await getRateLimitInfo(req);
    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit info',
    });
  }
});

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

  // Start background job queue
  jobQueue.start();
  logger.info('Background job queue started');

  // Set up job queue event handlers for monitoring
  jobQueue.on('job:completed', (job) => {
    logger.info(`Job ${job.id} (${job.type}) completed successfully`);
  });
  jobQueue.on('job:failed', (job) => {
    logger.error(`Job ${job.id} (${job.type}) failed: ${job.error}`);
  });

  // Initialize monitoring system (metrics, alerting, anomaly detection)
  initializeMonitoring();
  logger.info('Monitoring system initialized');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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

  // Handle server errors
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${port} is already in use. Please stop the existing server first.`);
      process.exit(1);
    } else {
      logger.error('Server error:', error);
    }
  });

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // =============================================================================
  // GRACEFUL SHUTDOWN - Clean termination for zero-downtime deployments
  // =============================================================================
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    // Prevent multiple shutdown calls
    if (isShuttingDown) {
      logger.info(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }
    isShuttingDown = true;

    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Stop monitoring system first (prevents further DB checks)
        try {
          shutdownMonitoring();
          logger.info('Monitoring system stopped');
        } catch (e) {
          logger.warn('Error stopping monitoring:', e);
        }

        // Stop job queue (allow current jobs to complete)
        try {
          jobQueue.stop();
          logger.info('Job queue stopped');
        } catch (e) {
          logger.warn('Error stopping job queue:', e);
        }

        // Close database connections
        try {
          await closePool();
          logger.info('Database pool closed');
        } catch (e) {
          logger.warn('Error closing database pool:', e);
        }

        // Close Redis connection
        try {
          await redisCache.close();
          logger.info('Redis connection closed');
        } catch (e) {
          logger.warn('Error closing Redis:', e);
        }

        // Clear memory cache
        cache.clear();
        logger.info('Memory cache cleared');

        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  // Handle termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions - log but don't crash on all exceptions
  process.on('uncaughtException', (error: Error & { code?: string }) => {
    const errorMessage = error?.message || '';
    const isDatabaseError =
      errorMessage.includes('Connection terminated') ||
      errorMessage.includes('endpoint has been disabled') ||
      errorMessage.includes('connection terminated unexpectedly') ||
      error?.code === 'XX000' ||
      error?.code === '57P01';

    if (isDatabaseError) {
      logger.warn('Database connection error (non-fatal):', errorMessage);
      return; // Don't crash on database connection issues
    }

    logger.error('Uncaught Exception:', error);
    // Only shutdown for critical errors
    if (errorMessage.includes('EADDRINUSE')) {
      shutdown('uncaughtException');
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't shutdown on unhandled rejection, just log it
  });
})();
