import fs from "fs";

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const isDevelopment = process.env.NODE_ENV === 'development';
const LOG_FILE = '/tmp/server-debug.log';

const PII_PATTERNS: [RegExp, string][] = [
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, '[email]'],
  [/\b(\+\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}\b/g, '[phone]'],
];

function sanitizePii(value: string): string {
  let result = value;
  for (const [pattern, replacement] of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function sanitizeArgs(args: any[]): any[] {
  return args.map(a => {
    if (typeof a === 'string') return sanitizePii(a);
    if (a instanceof Error) return sanitizePii(a.message);
    if (typeof a === 'object' && a !== null) {
      try { return sanitizePii(JSON.stringify(a)); } catch { return '[object]'; }
    }
    return a;
  });
}

function buildLogEntry(level: LogLevel, message: string, args: any[]): string {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  if (args.length > 0) {
    entry.extra = args.length === 1 ? args[0] : args;
  }
  return JSON.stringify(entry);
}

class Logger {
  private writeToFile(line: string): void {
    try {
      fs.appendFileSync(LOG_FILE, line + '\n');
    } catch {}
  }

  info(message: string, ...args: any[]): void {
    const line = buildLogEntry('info', message, args);
    this.writeToFile(line);
    if (isDevelopment) {
      console.log(line);
    }
  }

  warn(message: string, ...args: any[]): void {
    const line = buildLogEntry('warn', message, args);
    this.writeToFile(line);
    console.warn(line);
  }

  error(message: string, ...args: any[]): void {
    const safeMsg = sanitizePii(message);
    const safeArgs = sanitizeArgs(args);
    const line = buildLogEntry('error', safeMsg, safeArgs);
    this.writeToFile(line);
    console.error(line);
  }

  debug(message: string, ...args: any[]): void {
    const line = buildLogEntry('debug', message, args);
    this.writeToFile(line);
    if (isDevelopment) {
      console.debug(line);
    }
  }

  ws(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log(buildLogEntry('info', `[WebSocket] ${message}`, args));
    }
  }

  api(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log(buildLogEntry('info', `[API] ${message}`, args));
    }
  }

  db(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.debug(buildLogEntry('debug', `[DB] ${message}`, args));
    }
  }
}

export const logger = new Logger();
