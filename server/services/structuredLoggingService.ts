/**
 * Structured Logging Service
 * 
 * Provides JSON structured logging with log levels, context, and aggregation.
 */

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Log entry interface
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  source?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  tags?: string[];
}

// Log configuration
interface LogConfig {
  minLevel: LogLevel;
  maxLogs: number;
  enableConsole: boolean;
  enableFile: boolean;
  includeStack: boolean;
  redactFields: string[];
}

// Log level priorities
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

class StructuredLoggingService {
  private logs: LogEntry[] = [];
  private config: LogConfig = {
    minLevel: 'info',
    maxLogs: 5000,
    enableConsole: true,
    enableFile: false,
    includeStack: true,
    redactFields: ['password', 'token', 'secret', 'apiKey', 'authorization'],
  };

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LogConfig>): LogConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  /**
   * Get configuration
   */
  getConfig(): LogConfig {
    return { ...this.config };
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  /**
   * Redact sensitive fields
   */
  private redactSensitive(obj: Record<string, any>): Record<string, any> {
    const redacted = { ...obj };
    for (const key of Object.keys(redacted)) {
      if (this.config.redactFields.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactSensitive(redacted[key]);
      }
    }
    return redacted;
  }

  /**
   * Create log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    options?: {
      source?: string;
      userId?: string;
      requestId?: string;
      duration?: number;
      tags?: string[];
    }
  ): LogEntry {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? this.redactSensitive(context) : undefined,
      source: options?.source,
      userId: options?.userId,
      requestId: options?.requestId,
      duration: options?.duration,
      tags: options?.tags,
    };
  }

  /**
   * Write log entry
   */
  private writeLog(entry: LogEntry): void {
    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.config.maxLogs) {
      this.logs.shift();
    }

    // Console output
    if (this.config.enableConsole) {
      const jsonLog = JSON.stringify(entry);
      switch (entry.level) {
        case 'debug':
          console.debug(jsonLog);
          break;
        case 'info':
          console.info(jsonLog);
          break;
        case 'warn':
          console.warn(jsonLog);
          break;
        case 'error':
        case 'fatal':
          console.error(jsonLog);
          break;
      }
    }
  }

  /**
   * Log at specified level
   */
  log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    options?: {
      source?: string;
      userId?: string;
      requestId?: string;
      duration?: number;
      tags?: string[];
    }
  ): LogEntry | null {
    if (!this.shouldLog(level)) return null;

    const entry = this.createEntry(level, message, context, options);
    this.writeLog(entry);
    return entry;
  }

  /**
   * Debug level log
   */
  debug(message: string, context?: Record<string, any>, options?: { source?: string; tags?: string[] }): LogEntry | null {
    return this.log('debug', message, context, options);
  }

  /**
   * Info level log
   */
  info(message: string, context?: Record<string, any>, options?: { source?: string; tags?: string[] }): LogEntry | null {
    return this.log('info', message, context, options);
  }

  /**
   * Warn level log
   */
  warn(message: string, context?: Record<string, any>, options?: { source?: string; tags?: string[] }): LogEntry | null {
    return this.log('warn', message, context, options);
  }

  /**
   * Error level log
   */
  error(message: string, context?: Record<string, any>, options?: { source?: string; tags?: string[] }): LogEntry | null {
    return this.log('error', message, context, options);
  }

  /**
   * Fatal level log
   */
  fatal(message: string, context?: Record<string, any>, options?: { source?: string; tags?: string[] }): LogEntry | null {
    return this.log('fatal', message, context, options);
  }

  /**
   * Log HTTP request
   */
  logRequest(req: {
    method: string;
    path: string;
    userId?: string;
    requestId?: string;
    duration?: number;
    statusCode?: number;
    userAgent?: string;
    ip?: string;
  }): LogEntry | null {
    const level: LogLevel = req.statusCode && req.statusCode >= 500 ? 'error' : 
                           req.statusCode && req.statusCode >= 400 ? 'warn' : 'info';
    
    return this.log(level, `${req.method} ${req.path}`, {
      statusCode: req.statusCode,
      duration: req.duration,
      userAgent: req.userAgent,
      ip: req.ip,
    }, {
      source: 'http',
      userId: req.userId,
      requestId: req.requestId,
      duration: req.duration,
      tags: ['request'],
    });
  }

  /**
   * Log database query
   */
  logQuery(query: {
    sql: string;
    duration: number;
    rowCount?: number;
    source?: string;
  }): LogEntry | null {
    const level: LogLevel = query.duration > 1000 ? 'warn' : 'debug';
    
    return this.log(level, 'Database query', {
      sql: query.sql.substring(0, 500),
      duration: query.duration,
      rowCount: query.rowCount,
    }, {
      source: query.source || 'database',
      duration: query.duration,
      tags: ['query', query.duration > 1000 ? 'slow' : 'normal'],
    });
  }

  /**
   * Get logs
   */
  getLogs(options?: {
    level?: LogLevel;
    source?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    tags?: string[];
    search?: string;
    limit?: number;
  }): LogEntry[] {
    let logs = [...this.logs];

    if (options?.level) {
      const minPriority = LOG_LEVELS[options.level];
      logs = logs.filter((l) => LOG_LEVELS[l.level] >= minPriority);
    }

    if (options?.source) {
      logs = logs.filter((l) => l.source === options.source);
    }

    if (options?.userId) {
      logs = logs.filter((l) => l.userId === options.userId);
    }

    if (options?.startDate) {
      logs = logs.filter((l) => new Date(l.timestamp) >= options.startDate!);
    }

    if (options?.endDate) {
      logs = logs.filter((l) => new Date(l.timestamp) <= options.endDate!);
    }

    if (options?.tags && options.tags.length > 0) {
      logs = logs.filter((l) => l.tags?.some((t) => options.tags!.includes(t)));
    }

    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      logs = logs.filter((l) => 
        l.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(l.context).toLowerCase().includes(searchLower)
      );
    }

    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options?.limit) {
      logs = logs.slice(0, options.limit);
    }

    return logs;
  }

  /**
   * Get log statistics
   */
  getStats(): {
    totalLogs: number;
    byLevel: Record<LogLevel, number>;
    bySource: Record<string, number>;
    recentErrors: number;
    avgDuration: number;
    logsPerMinute: number;
  } {
    const stats = {
      totalLogs: this.logs.length,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 } as Record<LogLevel, number>,
      bySource: {} as Record<string, number>,
      recentErrors: 0,
      avgDuration: 0,
      logsPerMinute: 0,
    };

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    let totalDuration = 0;
    let durationCount = 0;

    this.logs.forEach((log) => {
      stats.byLevel[log.level]++;

      if (log.source) {
        stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;
      }

      if ((log.level === 'error' || log.level === 'fatal') && new Date(log.timestamp) >= fiveMinutesAgo) {
        stats.recentErrors++;
      }

      if (log.duration) {
        totalDuration += log.duration;
        durationCount++;
      }
    });

    stats.avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    // Calculate logs per minute
    const logsLastHour = this.logs.filter((l) => 
      new Date(l.timestamp) >= new Date(Date.now() - 60 * 60 * 1000)
    ).length;
    stats.logsPerMinute = Math.round((logsLastHour / 60) * 100) / 100;

    return stats;
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(options?: {
    level?: LogLevel;
    startDate?: Date;
    endDate?: Date;
  }): string {
    const logs = this.getLogs(options);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Create child logger with preset context
   */
  child(context: { source?: string; userId?: string; requestId?: string }): {
    debug: (message: string, ctx?: Record<string, any>) => LogEntry | null;
    info: (message: string, ctx?: Record<string, any>) => LogEntry | null;
    warn: (message: string, ctx?: Record<string, any>) => LogEntry | null;
    error: (message: string, ctx?: Record<string, any>) => LogEntry | null;
    fatal: (message: string, ctx?: Record<string, any>) => LogEntry | null;
  } {
    return {
      debug: (message: string, ctx?: Record<string, any>) => 
        this.log('debug', message, ctx, context),
      info: (message: string, ctx?: Record<string, any>) => 
        this.log('info', message, ctx, context),
      warn: (message: string, ctx?: Record<string, any>) => 
        this.log('warn', message, ctx, context),
      error: (message: string, ctx?: Record<string, any>) => 
        this.log('error', message, ctx, context),
      fatal: (message: string, ctx?: Record<string, any>) => 
        this.log('fatal', message, ctx, context),
    };
  }
}

// Singleton instance
export const logger = new StructuredLoggingService();

// Export convenience functions
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logFatal = logger.fatal.bind(logger);
export const logRequest = logger.logRequest.bind(logger);
export const logQuery = logger.logQuery.bind(logger);
export const getLogs = logger.getLogs.bind(logger);
export const getLogStats = logger.getStats.bind(logger);
export const clearLogs = logger.clearLogs.bind(logger);
export const exportLogs = logger.exportLogs.bind(logger);
export const createChildLogger = logger.child.bind(logger);
export const updateLogConfig = logger.updateConfig.bind(logger);
export const getLogConfig = logger.getConfig.bind(logger);
