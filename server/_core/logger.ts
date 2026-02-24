/**
 * Structured Logger for CPK/SPC Calculator
 * Provides consistent logging format across the application
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  requestId?: string;
  userId?: number;
  duration?: number;
}

// In-memory log buffer for recent logs
const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 1000;

// Log level priority
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Current log level (can be configured via env)
const currentLogLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
}

function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, module, message, data, error, requestId, userId, duration } = entry;
  
  let logLine = `[${timestamp}] [${level.toUpperCase()}] [${module}]`;
  
  if (requestId) logLine += ` [req:${requestId}]`;
  if (userId) logLine += ` [user:${userId}]`;
  
  logLine += ` ${message}`;
  
  if (duration !== undefined) logLine += ` (${duration}ms)`;
  
  if (data && Object.keys(data).length > 0) {
    logLine += ` ${JSON.stringify(data)}`;
  }
  
  if (error) {
    logLine += ` | Error: ${error.name}: ${error.message}`;
    if (error.stack && process.env.NODE_ENV !== 'production') {
      logLine += `\n${error.stack}`;
    }
  }
  
  return logLine;
}

function addToBuffer(entry: LogEntry) {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

function createLogEntry(
  level: LogLevel,
  module: string,
  message: string,
  options?: {
    data?: Record<string, unknown>;
    error?: Error;
    requestId?: string;
    userId?: number;
    duration?: number;
  }
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    data: options?.data,
    error: options?.error ? {
      name: options.error.name,
      message: options.error.message,
      stack: options.error.stack,
    } : undefined,
    requestId: options?.requestId,
    userId: options?.userId,
    duration: options?.duration,
  };
}

function log(
  level: LogLevel,
  module: string,
  message: string,
  options?: {
    data?: Record<string, unknown>;
    error?: Error;
    requestId?: string;
    userId?: number;
    duration?: number;
  }
) {
  if (!shouldLog(level)) return;
  
  const entry = createLogEntry(level, module, message, options);
  addToBuffer(entry);
  
  const formatted = formatLogEntry(entry);
  
  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.log(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

/**
 * Create a logger instance for a specific module
 */
export function createLogger(module: string) {
  return {
    debug: (message: string, options?: { data?: Record<string, unknown>; requestId?: string; userId?: number }) => 
      log('debug', module, message, options),
    
    info: (message: string, options?: { data?: Record<string, unknown>; requestId?: string; userId?: number; duration?: number }) => 
      log('info', module, message, options),
    
    warn: (message: string, options?: { data?: Record<string, unknown>; error?: Error; requestId?: string; userId?: number }) => 
      log('warn', module, message, options),
    
    error: (message: string, options?: { data?: Record<string, unknown>; error?: Error; requestId?: string; userId?: number }) => 
      log('error', module, message, options),
    
    // Helper for timing operations
    time: (operation: string) => {
      const start = Date.now();
      return {
        end: (message?: string, data?: Record<string, unknown>) => {
          const duration = Date.now() - start;
          log('info', module, message || `${operation} completed`, { data, duration });
          return duration;
        },
        endWithError: (error: Error, message?: string) => {
          const duration = Date.now() - start;
          log('error', module, message || `${operation} failed`, { error, duration });
          return duration;
        },
      };
    },
  };
}

/**
 * Get recent logs from buffer
 */
export function getRecentLogs(count: number = 100, level?: LogLevel): LogEntry[] {
  let logs = logBuffer.slice(-count);
  
  if (level) {
    logs = logs.filter(l => l.level === level);
  }
  
  return logs.reverse();
}

/**
 * Clear log buffer
 */
export function clearLogBuffer() {
  logBuffer.length = 0;
}

/**
 * Get log statistics
 */
export function getLogStats(): { total: number; byLevel: Record<LogLevel, number> } {
  const byLevel: Record<LogLevel, number> = {
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
  };
  
  for (const entry of logBuffer) {
    byLevel[entry.level]++;
  }
  
  return {
    total: logBuffer.length,
    byLevel,
  };
}

// Default logger for general use
export const logger = createLogger('App');
