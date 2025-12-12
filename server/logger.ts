/**
 * Application logger utility
 * Provides environment-aware logging with different levels
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

class Logger {
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  /**
   * Log informational messages
   * Only shown in development
   */
  info(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  /**
   * Log warning messages
   * Shown in all environments
   */
  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('warn', message), ...args);
  }

  /**
   * Log error messages
   * Shown in all environments
   */
  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('error', message), ...args);
  }

  /**
   * Log debug messages
   * Only shown in development
   */
  debug(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.debug(this.formatMessage('debug', message), ...args);
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
