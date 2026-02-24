/**
 * Centralized Error Handler for CPK/SPC Calculator
 * Provides consistent error handling and reporting across the application
 */

import { TRPCError } from "@trpc/server";
import { createLogger } from "./logger";

const logger = createLogger("ErrorHandler");

// Custom error types
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = "INTERNAL_ERROR",
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, true, context);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTHENTICATION_ERROR", 401, true);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Permission denied") {
    super(message, "AUTHORIZATION_ERROR", 403, true);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, "NOT_FOUND", 404, true, { resource, id });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "CONFLICT", 409, true, context);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super("Too many requests, please try again later", "RATE_LIMIT", 429, true, { retryAfter });
    this.name = "RateLimitError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, "DATABASE_ERROR", 500, false, {
      originalError: originalError?.message,
    });
    this.name = "DatabaseError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, originalError?: Error) {
    super(`External service error (${service}): ${message}`, "EXTERNAL_SERVICE_ERROR", 502, false, {
      service,
      originalError: originalError?.message,
    });
    this.name = "ExternalServiceError";
  }
}

// Error code to TRPC error code mapping
const errorCodeToTRPCCode: Record<string, TRPCError["code"]> = {
  VALIDATION_ERROR: "BAD_REQUEST",
  AUTHENTICATION_ERROR: "UNAUTHORIZED",
  AUTHORIZATION_ERROR: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMIT: "TOO_MANY_REQUESTS",
  DATABASE_ERROR: "INTERNAL_SERVER_ERROR",
  EXTERNAL_SERVICE_ERROR: "INTERNAL_SERVER_ERROR",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
};

/**
 * Convert any error to a TRPC error
 */
export function toTRPCError(error: unknown): TRPCError {
  // Already a TRPC error
  if (error instanceof TRPCError) {
    return error;
  }

  // Our custom AppError
  if (error instanceof AppError) {
    const code = errorCodeToTRPCCode[error.code] || "INTERNAL_SERVER_ERROR";
    return new TRPCError({
      code,
      message: error.message,
      cause: error,
    });
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
        cause: error,
      });
    }

    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : error.message,
      cause: error,
    });
  }

  // Unknown error type
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}

/**
 * Log and handle error
 */
export function handleError(
  error: unknown,
  context?: {
    module?: string;
    operation?: string;
    userId?: number;
    requestId?: string;
    data?: Record<string, unknown>;
  }
): AppError {
  const module = context?.module || "Unknown";
  const operation = context?.operation || "unknown operation";

  // Convert to AppError if needed
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new AppError(error.message, "INTERNAL_ERROR", 500, false, {
      originalError: error.name,
    });
  } else {
    appError = new AppError("An unexpected error occurred", "INTERNAL_ERROR", 500, false);
  }

  // Log the error
  logger.error(`Error in ${operation}`, {
    error: error instanceof Error ? error : new Error(String(error)),
    userId: context?.userId,
    requestId: context?.requestId,
    data: {
      ...context?.data,
      errorCode: appError.code,
      isOperational: appError.isOperational,
      context: appError.context,
    },
  });

  return appError;
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: { module?: string; operation?: string }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleError(error, context);
    }
  }) as T;
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Assert condition or throw error
 */
export function assert(condition: boolean, message: string, ErrorClass: typeof AppError = AppError): asserts condition {
  if (!condition) {
    throw new ErrorClass(message);
  }
}

/**
 * Assert value is not null/undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = "Value is required"
): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(message);
  }
}

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  toTRPCError,
  handleError,
  withErrorHandling,
  safeJsonParse,
  assert,
  assertDefined,
};
