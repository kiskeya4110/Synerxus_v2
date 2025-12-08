/**
 * Client-side Logger
 *
 * Provides structured logging that can be:
 * - Disabled in production
 * - Filtered by log level
 * - Extended to send to external logging services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  prefix: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Default configuration - can be overridden
const config: LoggerConfig = {
  enabled: import.meta.env.DEV, // Only enable in development
  minLevel: 'debug',
  prefix: '[Synerxus]',
};

/**
 * Configure the logger
 */
export function configureLogger(newConfig: Partial<LoggerConfig>): void {
  Object.assign(config, newConfig);
}

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

/**
 * Format log message with timestamp and prefix
 */
function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  return `${config.prefix} [${timestamp}] [${level.toUpperCase()}] ${message}`;
}

/**
 * Debug log - for detailed debugging information
 */
export function debug(message: string, ...args: unknown[]): void {
  if (shouldLog('debug')) {
    console.log(formatMessage('debug', message), ...args);
  }
}

/**
 * Info log - for general information
 */
export function info(message: string, ...args: unknown[]): void {
  if (shouldLog('info')) {
    console.info(formatMessage('info', message), ...args);
  }
}

/**
 * Warning log - for potential issues
 */
export function warn(message: string, ...args: unknown[]): void {
  if (shouldLog('warn')) {
    console.warn(formatMessage('warn', message), ...args);
  }
}

/**
 * Error log - for errors (always logged)
 */
export function error(message: string, ...args: unknown[]): void {
  // Errors are always logged regardless of config
  console.error(formatMessage('error', message), ...args);
}

/**
 * Log with custom level
 */
export function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (!shouldLog(level)) return;

  const formatted = formatMessage(level, message);
  switch (level) {
    case 'debug':
    case 'info':
      console.log(formatted, ...args);
      break;
    case 'warn':
      console.warn(formatted, ...args);
      break;
    case 'error':
      console.error(formatted, ...args);
      break;
  }
}

/**
 * Create a scoped logger with a specific prefix
 */
export function createLogger(scope: string) {
  const scopePrefix = `[${scope}]`;

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog('debug')) {
        console.log(`${config.prefix} ${scopePrefix} ${message}`, ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (shouldLog('info')) {
        console.info(`${config.prefix} ${scopePrefix} ${message}`, ...args);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog('warn')) {
        console.warn(`${config.prefix} ${scopePrefix} ${message}`, ...args);
      }
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(`${config.prefix} ${scopePrefix} ${message}`, ...args);
    },
  };
}

/**
 * Performance timing utility
 */
export function time(label: string): () => void {
  if (!shouldLog('debug')) {
    return () => {}; // No-op in production
  }

  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    debug(`${label}: ${duration.toFixed(2)}ms`);
  };
}

/**
 * Group related logs together
 */
export function group(label: string, fn: () => void): void {
  if (!shouldLog('debug')) {
    fn();
    return;
  }

  console.group(formatMessage('debug', label));
  try {
    fn();
  } finally {
    console.groupEnd();
  }
}

/**
 * Log an object as a table (useful for arrays of objects)
 */
export function table(data: unknown[], columns?: string[]): void {
  if (!shouldLog('debug')) return;
  console.table(data, columns);
}

// Default export for convenience
const logger = {
  debug,
  info,
  warn,
  error,
  log,
  createLogger,
  configure: configureLogger,
  time,
  group,
  table,
};

export default logger;
