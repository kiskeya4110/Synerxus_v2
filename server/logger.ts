/**
 * Application logger utility
 * Provides environment-aware logging with different levels
 */

import fs from "fs";

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const LOG_FILE = '/tmp/server-debug.log';

class Logger {
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  private writeToFile(formatted: string, ...args: any[]): void {
    try {
      const extra = args.length > 0 ? ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') : '';
      fs.appendFileSync(LOG_FILE, formatted + extra + '\n');
    } catch {}
  }

  /**
   * Log informational messages
   * Only shown in development
   */
  info(message: string, ...args: any[]): void {
    const fmt = this.formatMessage('info', message);
    this.writeToFile(fmt, ...args);
    if (isDevelopment) {
      console.log(fmt, ...args);
    }
  }

  /**
   * Log warning messages
   * Shown in all environments
   */
  warn(message: string, ...args: any[]): void {
    const fmt = this.formatMessage('warn', message);
    this.writeToFile(fmt, ...args);
    console.warn(fmt, ...args);
  }

  /**
   * Log error messages
   * Shown in all environments
   */
  error(message: string, ...args: any[]): void {
    const fmt = this.formatMessage('error', message);
    this.writeToFile(fmt, ...args);
    console.error(fmt, ...args);
  }

  /**
   * Log debug messages
   * Only shown in development
   */
  debug(message: string, ...args: any[]): void {
    const fmt = this.formatMessage('debug', message);
    this.writeToFile(fmt, ...args);
    if (isDevelopment) {
      console.debug(fmt, ...args);
    }
  }

  /**
   * Log WebSocket events
   * Only shown in development
   */
  ws(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log(this.formatMessage('info', `[WebSocket] ${message}`), ...args);
    }
  }

  /**
   * Log API requests
   * Only shown in development
   */
  api(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log(this.formatMessage('info', `[API] ${message}`), ...args);
    }
  }

  /**
   * Log database operations
   * Only shown in development
   */
  db(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log(this.formatMessage('debug', `[DB] ${message}`), ...args);
    }
  }
}

export const logger = new Logger();
