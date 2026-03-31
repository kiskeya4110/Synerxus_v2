/**
 * Redis client with graceful in-memory fallback.
 *
 * If REDIS_URL is set, a real Redis connection is used.
 * If not, all calls fall back to in-memory equivalents so the app
 * starts cleanly without Redis provisioned.
 *
 * Used by: token blacklist, distributed rate limiting.
 */

import { logger } from "./logger";

interface RedisLike {
  set(key: string, value: string, mode: "EX", ttlSeconds: number): Promise<any>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<any>;
  exists(key: string): Promise<number>;
  quit(): Promise<any>;
  isConnected: boolean;
}

// ── In-Memory Fallback ────────────────────────────────────────────────────────

class InMemoryRedis implements RedisLike {
  private store = new Map<string, { value: string; expiresAt: number }>();
  readonly isConnected = false;

  constructor() {
    // Sweep expired keys every minute
    setInterval(() => this._sweep(), 60_000).unref();
  }

  private _sweep() {
    const now = Date.now();
    Array.from(this.store.entries()).forEach(([k, v]) => {
      if (v.expiresAt < now) this.store.delete(k);
    });
  }

  async set(key: string, value: string, _mode: "EX", ttlSeconds: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return "OK";
  }

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) { this.store.delete(key); return null; }
    return entry.value;
  }

  async del(key: string) {
    this.store.delete(key);
    return 1;
  }

  async exists(key: string) {
    const entry = this.store.get(key);
    if (!entry) return 0;
    if (entry.expiresAt < Date.now()) { this.store.delete(key); return 0; }
    return 1;
  }

  async quit() { this.store.clear(); }
}

// ── Real Redis Client ─────────────────────────────────────────────────────────

let redisClient: RedisLike;

async function createRedisClient(): Promise<RedisLike> {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn("[Redis] REDIS_URL not set — using in-memory fallback. Set REDIS_URL in production for distributed rate limiting and token blacklist.");
    return new InMemoryRedis();
  }

  try {
    const { default: Redis } = await import("ioredis");
    const client = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    await client.connect();

    client.on("error", (err) => {
      logger.error("[Redis] Connection error:", err.message);
    });

    logger.info("[Redis] Connected successfully");

    // Wrap to match our interface
    return {
      set: (k, v, mode, ttl) => client.set(k, v, mode, ttl),
      get: (k) => client.get(k),
      del: (k) => client.del(k),
      exists: (k) => client.exists(k),
      quit: () => client.quit(),
      isConnected: true,
    };
  } catch (err: any) {
    logger.error(`[Redis] Failed to connect (${err.message}) — falling back to in-memory`);
    return new InMemoryRedis();
  }
}

// Singleton — initialised once at startup
let _clientPromise: Promise<RedisLike> | null = null;

export function getRedisClient(): Promise<RedisLike> {
  if (!_clientPromise) {
    _clientPromise = createRedisClient();
  }
  return _clientPromise;
}

export async function closeRedis(): Promise<void> {
  if (_clientPromise) {
    const client = await _clientPromise;
    await client.quit();
    _clientPromise = null;
  }
}
