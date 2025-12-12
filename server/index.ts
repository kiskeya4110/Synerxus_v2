import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDigestScheduler } from "./digest-scheduler";
import { logger } from "./logger";
import { cache } from "./cache";

const app = express();

// =============================================================================
// SECURITY: REQUEST BODY LIMITS - Prevents payload attacks
// =============================================================================
app.use(express.json({ limit: '10mb' })); // 10MB limit for JSON
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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
// RATE LIMITING - Prevents API abuse and DDoS
// =============================================================================

// General API rate limit: 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and metrics
    return req.path === '/api/metrics' || req.path === '/health';
  },
});

// Stricter limit for authentication endpoints: 10 requests per minute
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  message: { message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for expensive operations: 20 requests per minute
const expensiveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per window
  message: { message: 'Too many requests for this resource, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters to specific routes
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
app.use('/api/dashboard', expensiveLimiter);
app.use('/api/matchmaker', expensiveLimiter);
app.use('/api/aiu', expensiveLimiter);
app.use('/api/', apiLimiter); // General API limiter (applied last)

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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
