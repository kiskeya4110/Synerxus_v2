/**
 * Application logger utility
 * Provides environment-aware logging with different levels
 * Supports both string messages and structured logging objects
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogMessage = string | Record<string, unknown>;

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

class Logger {
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  private formatStructured(level: LogLevel, obj: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    // In production, output JSON for log aggregation systems
    if (isProduction) {
      return JSON.stringify({ timestamp, level, ...obj });
    }
    // In development, pretty print
    const type = obj.type || 'LOG';
    delete obj.type;
    return `[${timestamp}] [${level.toUpperCase()}] [${type}] ${JSON.stringify(obj, null, 2)}`;
  }

  private log(level: LogLevel, message: LogMessage, args: any[], consoleMethod: typeof console.log): void {
    if (typeof message === 'string') {
      consoleMethod(this.formatMessage(level, message), ...args);
    } else {
      consoleMethod(this.formatStructured(level, message), ...args);
    }
  }

  /**
   * Log informational messages
   * Only shown in development (unless it's a security event)
   */
  info(message: LogMessage, ...args: any[]): void {
    // Always log security events, otherwise only in development
    const isSecurityEvent = typeof message === 'object' &&
      (message.type as string)?.startsWith('SECURITY_');

    if (isDevelopment || isSecurityEvent) {
      this.log('info', message, args, console.log);
    }
  }

  /**
   * Log warning messages
   * Shown in all environments
   */
  warn(message: LogMessage, ...args: any[]): void {
    this.log('warn', message, args, console.warn);
  }

  /**
   * Log error messages
   * Shown in all environments
   */
  error(message: LogMessage, ...args: any[]): void {
    this.log('error', message, args, console.error);
  }

  /**
   * Log debug messages
   * Only shown in development
   */
  debug(message: LogMessage, ...args: any[]): void {
    if (isDevelopment) {
      this.log('debug', message, args, console.debug);
    }
  }

  /**
   * Log security events
   * Always shown in all environments
   */
  security(message: LogMessage, ...args: any[]): void {
    if (typeof message === 'object') {
      message.category = 'SECURITY';
    }
    this.log('warn', message, args, console.warn);
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
