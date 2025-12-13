/**
 * Cluster Entry Point - sat1325upgrade Phase 2
 *
 * Run with: node dist/index-cluster.js
 *
 * This spawns multiple worker processes to utilize all CPU cores.
 * Expected improvement: 2-4x throughput on multi-core systems.
 */

import cluster from 'cluster';
import os from 'os';
import http from 'http';
import { logger } from './logger';

const numCPUs = os.cpus().length;
const WORKERS = Math.min(numCPUs, parseInt(process.env.CLUSTER_WORKERS || '4', 10));

if (cluster.isPrimary) {
  logger.info(`[Cluster] Primary process ${process.pid} starting`);
  logger.info(`[Cluster] Detected ${numCPUs} CPU cores, spawning ${WORKERS} workers`);

  // Fork workers
  for (let i = 0; i < WORKERS; i++) {
    cluster.fork();
  }

  // Track worker stats
  let restarts = 0;
  const startTime = Date.now();

  cluster.on('online', (worker) => {
    logger.info(`[Cluster] Worker ${worker.process.pid} is online`);
  });

  cluster.on('exit', (worker, code, signal) => {
    restarts++;
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    logger.warn(`[Cluster] Worker ${worker.process.pid} died (code: ${code}, signal: ${signal})`);
    logger.info(`[Cluster] Total restarts: ${restarts}, uptime: ${uptime}s`);

    // Respawn worker if it crashed (not graceful shutdown)
    if (code !== 0 && !worker.exitedAfterDisconnect) {
      logger.info('[Cluster] Spawning replacement worker...');
      setTimeout(() => cluster.fork(), 1000); // 1s delay to prevent rapid restarts
    }
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info(`[Cluster] ${signal} received, shutting down gracefully...`);
    for (const id in cluster.workers) {
      cluster.workers[id]?.process.kill('SIGTERM');
    }
    setTimeout(() => {
      logger.info('[Cluster] Force exiting after timeout');
      process.exit(0);
    }, 30000); // 30s timeout
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Cluster health check endpoint on port 5001
  http.createServer((req, res) => {
    if (req.url === '/cluster-health') {
      const workers = Object.values(cluster.workers || {}).filter(Boolean).length;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: workers === WORKERS ? 'healthy' : 'degraded',
        mode: 'cluster',
        workers: {
          target: WORKERS,
          active: workers,
        },
        restarts,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        version: 'sat1325upgrade',
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  }).listen(5001, '0.0.0.0', () => {
    logger.info('[Cluster] Health check available at http://localhost:5001/cluster-health');
  });

} else {
  // Worker process - import and run the main server
  logger.info(`[Cluster] Worker ${process.pid} starting server`);
  import('./index');
}
