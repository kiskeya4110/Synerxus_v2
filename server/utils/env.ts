/**
 * Environment Variable Validation
 *
 * Validates required environment variables on startup
 * and provides typed access to configuration.
 */

import { z } from "zod";

// ============================================
// Environment Schema
// ============================================

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000").transform(Number),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Authentication (optional in development)
  JWT_SECRET: z.string().optional(),
  SESSION_SECRET: z.string().optional(),

  // External Services (optional)
  SENTRY_DSN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().optional().default("100").transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().optional().default("60000").transform(Number),

  // Cluster Mode
  CLUSTER_MODE: z.string().optional().transform((val) => val === "true"),
  CLUSTER_WORKERS: z.string().optional().default("0").transform(Number),
});

export type Env = z.infer<typeof envSchema>;

// ============================================
// Validation Functions
// ============================================

let cachedEnv: Env | null = null;

/**
 * Validate environment variables and return typed config
 * Caches result after first call
 */
export function validateEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `  - ${e.path.join(".")}: ${e.message}`);
    console.error("\n❌ Environment validation failed:");
    console.error(errors.join("\n"));
    console.error("\nPlease check your environment variables and try again.\n");

    // In production, fail fast
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }

    // In development, use defaults where possible
    console.warn("⚠️  Running with partial configuration in development mode\n");
  }

  cachedEnv = result.success ? result.data : (envSchema.parse({
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://localhost:5432/dev",
  }) as Env);

  return cachedEnv;
}

/**
 * Get a specific environment variable with type safety
 */
export function getEnv(): Env {
  return validateEnv();
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === "development";
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getEnv().NODE_ENV === "test";
}

/**
 * Get JWT secret with fallback for development
 */
export function getJWTSecret(): string {
  const env = getEnv();
  if (env.JWT_SECRET) return env.JWT_SECRET;

  if (isProduction()) {
    throw new Error("JWT_SECRET is required in production");
  }

  // Development fallback
  return "development-jwt-secret-do-not-use-in-production";
}

/**
 * Get session secret with fallback for development
 */
export function getSessionSecret(): string {
  const env = getEnv();
  if (env.SESSION_SECRET) return env.SESSION_SECRET;

  if (isProduction()) {
    throw new Error("SESSION_SECRET is required in production");
  }

  // Development fallback
  return "development-session-secret-do-not-use-in-production";
}

// ============================================
// Startup Validation
// ============================================

/**
 * Run environment validation on module load
 * This ensures early failure if config is invalid
 */
export function initializeEnv(): void {
  console.log("[Config] Validating environment variables...");

  const env = validateEnv();

  console.log(`[Config] Environment: ${env.NODE_ENV}`);
  console.log(`[Config] Port: ${env.PORT}`);
  console.log(`[Config] Database: ${env.DATABASE_URL ? "configured" : "missing"}`);
  console.log(`[Config] Sentry: ${env.SENTRY_DSN ? "enabled" : "disabled"}`);
  console.log(`[Config] Rate Limit: ${env.RATE_LIMIT_MAX} requests per ${env.RATE_LIMIT_WINDOW_MS}ms`);

  if (env.CLUSTER_MODE) {
    console.log(`[Config] Cluster Mode: enabled (${env.CLUSTER_WORKERS || "auto"} workers)`);
  }

  console.log("[Config] Environment validation complete\n");
}
