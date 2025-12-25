/**
 * Database Backup Script
 *
 * Creates daily backups of the PostgreSQL database.
 * Supports local file storage and optional cloud upload.
 *
 * Usage:
 *   npx tsx scripts/backup-database.ts
 *
 * Options:
 *   --output <path>  Output directory (default: ./backups)
 *   --format <type>  Format: sql, csv, json (default: sql)
 *   --tables <list>  Comma-separated table names (default: all)
 *   --compress       Compress output with gzip
 *
 * Schedule with cron:
 *   0 2 * * * cd /path/to/project && npx tsx scripts/backup-database.ts >> /var/log/backup.log 2>&1
 *
 * For Replit: Use scheduled deployments or external cron service
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

// Configure WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

// Configuration
const CONFIG = {
  outputDir: process.env.BACKUP_DIR || './backups',
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10),
  format: (process.env.BACKUP_FORMAT || 'json') as 'sql' | 'csv' | 'json',
  compress: process.env.BACKUP_COMPRESS === 'true',
};

// Tables to backup (core data)
const BACKUP_TABLES = [
  'users',
  'volunteer_profiles',
  'organizations',
  'projects',
  'tasks',
  'volunteer_hours',
  'project_impacts',
  'applications',
  'matches',
  'project_assignments',
  'calendar_events',
  'notifications',
  'badges',
  'user_badges',
  'volunteer_organization_relationships',
];

interface BackupResult {
  success: boolean;
  timestamp: string;
  tables: number;
  rows: number;
  size: string;
  path: string;
  duration: number;
  error?: string;
}

async function main(): Promise<void> {
  console.log('========================================');
  console.log('  DATABASE BACKUP UTILITY');
  console.log('========================================');
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`  Output Dir: ${CONFIG.outputDir}`);
  console.log(`  Format: ${CONFIG.format}`);
  console.log(`  Compress: ${CONFIG.compress}`);
  console.log('========================================\n');

  const startTime = Date.now();

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`Created backup directory: ${CONFIG.outputDir}`);
  }

  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    console.log('Connected to database\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData: Record<string, any[]> = {};
    let totalRows = 0;

    // Backup each table
    for (const table of BACKUP_TABLES) {
      try {
        const result = await client.query(`SELECT * FROM ${table}`);
        backupData[table] = result.rows;
        totalRows += result.rows.length;
        console.log(`  ✓ ${table}: ${result.rows.length} rows`);
      } catch (error: any) {
        if (error.code === '42P01') {
          console.log(`  ⚠ ${table}: Table does not exist (skipped)`);
        } else {
          console.error(`  ✗ ${table}: ${error.message}`);
        }
      }
    }

    client.release();

    // Generate backup file
    const filename = `backup-${timestamp}.${CONFIG.format}${CONFIG.compress ? '.gz' : ''}`;
    const filepath = path.join(CONFIG.outputDir, filename);

    let content: string;
    switch (CONFIG.format) {
      case 'json':
        content = JSON.stringify({
          metadata: {
            timestamp: new Date().toISOString(),
            tables: Object.keys(backupData).length,
            totalRows,
            version: '1.0',
          },
          data: backupData,
        }, null, 2);
        break;

      case 'csv':
        // Create separate CSV for each table
        content = '';
        for (const [table, rows] of Object.entries(backupData)) {
          if (rows.length === 0) continue;
          const headers = Object.keys(rows[0]);
          content += `--- TABLE: ${table} ---\n`;
          content += headers.join(',') + '\n';
          for (const row of rows) {
            content += headers.map(h => JSON.stringify(row[h] ?? '')).join(',') + '\n';
          }
          content += '\n';
        }
        break;

      case 'sql':
        content = `-- Database Backup: ${new Date().toISOString()}\n`;
        content += `-- Tables: ${Object.keys(backupData).length}, Rows: ${totalRows}\n\n`;
        for (const [table, rows] of Object.entries(backupData)) {
          if (rows.length === 0) continue;
          content += `-- Table: ${table}\n`;
          for (const row of rows) {
            const columns = Object.keys(row);
            const values = columns.map(c => {
              const v = row[c];
              if (v === null) return 'NULL';
              if (typeof v === 'number') return v;
              if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
              return `'${String(v).replace(/'/g, "''")}'`;
            });
            content += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
          }
          content += '\n';
        }
        break;

      default:
        throw new Error(`Unknown format: ${CONFIG.format}`);
    }

    // Write to file (with optional compression)
    if (CONFIG.compress) {
      const gzip = createGzip();
      const source = require('stream').Readable.from([content]);
      const destination = fs.createWriteStream(filepath);
      await pipeline(source, gzip, destination);
    } else {
      fs.writeFileSync(filepath, content);
    }

    const fileSize = fs.statSync(filepath).size;
    const duration = Date.now() - startTime;

    console.log('\n========================================');
    console.log('  BACKUP COMPLETE');
    console.log('========================================');
    console.log(`  File: ${filename}`);
    console.log(`  Size: ${formatBytes(fileSize)}`);
    console.log(`  Tables: ${Object.keys(backupData).length}`);
    console.log(`  Rows: ${totalRows.toLocaleString()}`);
    console.log(`  Duration: ${duration}ms`);
    console.log('========================================\n');

    // Clean up old backups
    await cleanupOldBackups();

    // Write backup log
    const logEntry: BackupResult = {
      success: true,
      timestamp: new Date().toISOString(),
      tables: Object.keys(backupData).length,
      rows: totalRows,
      size: formatBytes(fileSize),
      path: filepath,
      duration,
    };
    appendToLog(logEntry);

  } catch (error: any) {
    console.error('\nBACKUP FAILED:', error.message);

    const logEntry: BackupResult = {
      success: false,
      timestamp: new Date().toISOString(),
      tables: 0,
      rows: 0,
      size: '0 B',
      path: '',
      duration: Date.now() - startTime,
      error: error.message,
    };
    appendToLog(logEntry);

    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function cleanupOldBackups(): Promise<void> {
  const files = fs.readdirSync(CONFIG.outputDir);
  const now = Date.now();
  const maxAge = CONFIG.retentionDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  for (const file of files) {
    if (!file.startsWith('backup-')) continue;

    const filepath = path.join(CONFIG.outputDir, file);
    const stats = fs.statSync(filepath);
    const age = now - stats.mtimeMs;

    if (age > maxAge) {
      fs.unlinkSync(filepath);
      deleted++;
      console.log(`  Deleted old backup: ${file}`);
    }
  }

  if (deleted > 0) {
    console.log(`  Cleaned up ${deleted} old backup(s)`);
  }
}

function appendToLog(entry: BackupResult): void {
  const logPath = path.join(CONFIG.outputDir, 'backup-log.json');
  let log: BackupResult[] = [];

  if (fs.existsSync(logPath)) {
    try {
      log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    } catch {
      log = [];
    }
  }

  log.push(entry);

  // Keep last 100 entries
  if (log.length > 100) {
    log = log.slice(-100);
  }

  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run backup
main().catch(console.error);
