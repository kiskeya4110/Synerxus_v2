/**
 * Node.js Cluster Mode for Multi-Core Performance
 *
 * This enables the server to use all available CPU cores,
 * dramatically improving performance under high load.
 *
 * Industry standard: 1 worker per CPU core
 * Expected improvement: 2-4x throughput on multi-core systems
 */

import cluster from 'cluster';
import os from 'os';

const numCPUs = os.cpus().length;
const WORKERS = Math.min(numCPUs, 4); // Cap at 4 workers to avoid overwhelming the DB

export function setupCluster(startWorker: () => void): void {
  if (cluster.isPrimary) {
    console.log(`[Cluster] Primary process ${process.pid} starting`);
    console.log(`[Cluster] Detected ${numCPUs} CPU cores, spawning ${WORKERS} workers`);

    // Fork workers
    for (let i = 0; i < WORKERS; i++) {
      cluster.fork();
    }

    // Track worker stats
    let restarts = 0;
    const startTime = Date.now();

    cluster.on('online', (worker) => {
      console.log(`[Cluster] Worker ${worker.process.pid} is online`);
    });

    cluster.on('exit', (worker, code, signal) => {
      restarts++;
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      console.log(`[Cluster] Worker ${worker.process.pid} died (code: ${code}, signal: ${signal})`);
      console.log(`[Cluster] Total restarts: ${restarts}, uptime: ${uptime}s`);

      // Respawn worker if it crashed
      if (code !== 0 && !worker.exitedAfterDisconnect) {
        console.log('[Cluster] Spawning replacement worker...');
        cluster.fork();
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[Cluster] SIGTERM received, shutting down gracefully...');
      for (const id in cluster.workers) {
        cluster.workers[id]?.process.kill('SIGTERM');
      }
    });

    // Health check endpoint for the primary
    const http = require('http');
    http.createServer((req: any, res: any) => {
      if (req.url === '/cluster-health') {
        const workers = Object.values(cluster.workers || {}).filter(Boolean).length;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          workers,
          restarts,
          uptime: Math.floor((Date.now() - startTime) / 1000),
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    }).listen(5001, () => {
      console.log('[Cluster] Health check available at http://localhost:5001/cluster-health');
    });

  } else {
    // Worker process - run the actual server
    console.log(`[Cluster] Worker ${process.pid} starting`);
    startWorker();
  }
}

// For non-cluster mode (development)
export function isClusterEnabled(): boolean {
  return process.env.CLUSTER_MODE === 'true';
}
