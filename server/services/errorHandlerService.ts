/**
 * Centralized Error Handler Service
 * 
 * Provides unified error handling, custom error types, and user-friendly messages.
 */

// Custom error types
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Domain-specific error classes
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 401, true, context);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied', context?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', 403, true, context);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, any>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, true, context);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFLICT', 409, true, context);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', context?: Record<string, any>) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, true, context);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 500, true, context);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(`${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, true, context);
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', 500, false, context);
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

// Error log entry
export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  code: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  isOperational: boolean;
}

// User-friendly error messages mapping
const userFriendlyMessages: Record<string, string> = {
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin đã nhập.',
  AUTHENTICATION_ERROR: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  AUTHORIZATION_ERROR: 'Bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
  CONFLICT: 'Dữ liệu bị trùng lặp hoặc xung đột.',
  RATE_LIMIT_EXCEEDED: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
  DATABASE_ERROR: 'Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau.',
  EXTERNAL_SERVICE_ERROR: 'Dịch vụ bên ngoài không khả dụng. Vui lòng thử lại sau.',
  CONFIGURATION_ERROR: 'Lỗi cấu hình hệ thống. Vui lòng liên hệ quản trị viên.',
  UNKNOWN_ERROR: 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.',
};

class ErrorHandlerService {
  private errorLogs: ErrorLogEntry[] = [];
  private maxLogs: number = 1000;
  private errorCallbacks: ((error: ErrorLogEntry) => void)[] = [];

  /**
   * Handle and log an error
   */
  handleError(
    error: Error | AppError,
    context?: {
      userId?: string;
      requestId?: string;
      path?: string;
      method?: string;
    }
  ): ErrorLogEntry {
    const isAppError = error instanceof AppError;
    
    const logEntry: ErrorLogEntry = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      code: isAppError ? error.code : 'UNKNOWN_ERROR',
      message: error.message,
      stack: error.stack,
      context: isAppError ? error.context : undefined,
      userId: context?.userId,
      requestId: context?.requestId,
      path: context?.path,
      method: context?.method,
      isOperational: isAppError ? error.isOperational : false,
    };

    // Add to logs
    this.errorLogs.push(logEntry);
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs.shift();
    }

    // Log to console
    if (isAppError && error.isOperational) {
      console.warn(`[AppError] ${error.code}: ${error.message}`);
    } else {
      console.error(`[Error] ${error.message}`, error.stack);
    }

    // Notify callbacks
    this.errorCallbacks.forEach((cb) => {
      try {
        cb(logEntry);
      } catch (e) {
        console.error('Error callback failed:', e);
      }
    });

    return logEntry;
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: Error | AppError): string {
    if (error instanceof AppError) {
      return userFriendlyMessages[error.code] || error.message;
    }
    return userFriendlyMessages.UNKNOWN_ERROR;
  }

  /**
   * Get error response for API
   */
  getErrorResponse(error: Error | AppError): {
    success: false;
    error: {
      code: string;
      message: string;
      userMessage: string;
      details?: Record<string, any>;
    };
  } {
    const isAppError = error instanceof AppError;
    
    return {
      success: false,
      error: {
        code: isAppError ? error.code : 'UNKNOWN_ERROR',
        message: error.message,
        userMessage: this.getUserFriendlyMessage(error),
        details: isAppError ? error.context : undefined,
      },
    };
  }

  /**
   * Get error logs
   */
  getErrorLogs(options?: {
    code?: string;
    isOperational?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): ErrorLogEntry[] {
    let logs = [...this.errorLogs];

    if (options?.code) {
      logs = logs.filter((l) => l.code === options.code);
    }

    if (options?.isOperational !== undefined) {
      logs = logs.filter((l) => l.isOperational === options.isOperational);
    }

    if (options?.startDate) {
      logs = logs.filter((l) => l.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      logs = logs.filter((l) => l.timestamp <= options.endDate!);
    }

    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      logs = logs.slice(0, options.limit);
    }

    return logs;
  }

  /**
   * Get error statistics
   */
  getStats(): {
    totalErrors: number;
    operationalErrors: number;
    nonOperationalErrors: number;
    errorsByCode: Record<string, number>;
    recentErrors: number;
    errorRate: number; // errors per minute in last hour
  } {
    const stats = {
      totalErrors: this.errorLogs.length,
      operationalErrors: 0,
      nonOperationalErrors: 0,
      errorsByCode: {} as Record<string, number>,
      recentErrors: 0,
      errorRate: 0,
    };

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    this.errorLogs.forEach((log) => {
      if (log.isOperational) {
        stats.operationalErrors++;
      } else {
        stats.nonOperationalErrors++;
      }

      stats.errorsByCode[log.code] = (stats.errorsByCode[log.code] || 0) + 1;

      if (log.timestamp >= fiveMinutesAgo) {
        stats.recentErrors++;
      }
    });

    // Calculate error rate
    const errorsLastHour = this.errorLogs.filter((l) => l.timestamp >= oneHourAgo).length;
    stats.errorRate = Math.round((errorsLastHour / 60) * 100) / 100;

    return stats;
  }

  /**
   * Clear error logs
   */
  clearLogs(): void {
    this.errorLogs = [];
  }

  /**
   * Register error callback
   */
  onError(callback: (error: ErrorLogEntry) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Check if error is operational (expected)
   */
  isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Wrap async function with error handling
   */
  wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: { userId?: string; path?: string }
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(error as Error, context);
        throw error;
      }
    }) as T;
  }
}

// Singleton instance
export const errorHandlerService = new ErrorHandlerService();

// Export functions
export const handleError = errorHandlerService.handleError.bind(errorHandlerService);
export const getUserFriendlyMessage = errorHandlerService.getUserFriendlyMessage.bind(errorHandlerService);
export const getErrorResponse = errorHandlerService.getErrorResponse.bind(errorHandlerService);
export const getErrorLogs = errorHandlerService.getErrorLogs.bind(errorHandlerService);
export const getErrorStats = errorHandlerService.getStats.bind(errorHandlerService);
export const clearErrorLogs = errorHandlerService.clearLogs.bind(errorHandlerService);
export const onError = errorHandlerService.onError.bind(errorHandlerService);
export const isOperationalError = errorHandlerService.isOperationalError.bind(errorHandlerService);
export const wrapAsync = errorHandlerService.wrapAsync.bind(errorHandlerService);
