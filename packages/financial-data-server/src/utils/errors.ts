/**
 * Structured Error Handling Framework
 */

import { z } from 'zod';
import { Logger } from './logger.js';

// Error categories for financial data server
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATA_PROVIDER = 'data_provider',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  INTERNAL = 'internal',
  CONFIGURATION = 'configuration',
  SECURITY = 'security',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Base error interface
export interface ErrorDetails {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  cause?: Error;
  timestamp: string;
  requestId?: string;
  userId?: string;
}

// MCP Error codes (following MCP specification)
export const MCPErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  MCP_TOOL_ERROR: -32002,
  MCP_RESOURCE_ERROR: -32001,
} as const;

/**
 * Base Financial Data Server Error
 */
export class FinancialDataError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly requestId?: string;
  public readonly userId?: string;

  constructor(details: ErrorDetails) {
    super(details.message);
    
    this.name = 'FinancialDataError';
    this.code = details.code;
    this.category = details.category;
    this.severity = details.severity;
    this.context = details.context || {};
    this.timestamp = details.timestamp;
    this.requestId = details.requestId;
    this.userId = details.userId;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FinancialDataError);
    }

    // Chain cause if provided
    if (details.cause) {
      this.cause = details.cause;
    }
  }

  /**
   * Convert to JSON for logging
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      requestId: this.requestId,
      userId: this.userId,
      stack: this.stack,
    };
  }

  /**
   * Convert to MCP error response format
   */
  public toMCPError(): { code: number; message: string; data?: Record<string, unknown> } {
    let mcpCode: number = MCPErrorCodes.INTERNAL_ERROR;
    
    switch (this.category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        mcpCode = MCPErrorCodes.INVALID_PARAMS;
        break;
      case ErrorCategory.VALIDATION:
        mcpCode = MCPErrorCodes.INVALID_PARAMS;
        break;
      case ErrorCategory.DATA_PROVIDER:
        mcpCode = MCPErrorCodes.MCP_TOOL_ERROR;
        break;
      default:
        mcpCode = MCPErrorCodes.INTERNAL_ERROR;
    }

    return {
      code: mcpCode,
      message: this.message,
      data: {
        errorCode: this.code,
        category: this.category,
        severity: this.severity,
        timestamp: this.timestamp,
        ...(this.requestId && { requestId: this.requestId }),
      },
    };
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends FinancialDataError {
  constructor(message: string, context?: Record<string, unknown>, cause?: Error) {
    super({
      code: 'AUTH_FAILED',
      message,
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      context,
      cause,
      timestamp: new Date().toISOString(),
    });
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends FinancialDataError {
  constructor(message: string, requiredScopes?: string[], context?: Record<string, unknown>) {
    super({
      code: 'AUTHORIZATION_FAILED',
      message,
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      context: {
        ...context,
        ...(requiredScopes && { requiredScopes }),
      },
      timestamp: new Date().toISOString(),
    });
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation Error
 */
export class ValidationError extends FinancialDataError {
  constructor(message: string, validationErrors?: z.ZodError, context?: Record<string, unknown>) {
    super({
      code: 'VALIDATION_FAILED',
      message,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      context: {
        ...context,
        ...(validationErrors && { 
          validationErrors: validationErrors.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          }))
        }),
      },
      timestamp: new Date().toISOString(),
    });
    this.name = 'ValidationError';
  }
}

/**
 * Data Provider Error
 */
export class DataProviderError extends FinancialDataError {
  constructor(
    provider: string, 
    operation: string, 
    message: string, 
    context?: Record<string, unknown>, 
    cause?: Error
  ) {
    super({
      code: 'DATA_PROVIDER_ERROR',
      message: `${provider} error: ${message}`,
      category: ErrorCategory.DATA_PROVIDER,
      severity: ErrorSeverity.HIGH,
      context: {
        provider,
        operation,
        ...context,
      },
      cause,
      timestamp: new Date().toISOString(),
    });
    this.name = 'DataProviderError';
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends FinancialDataError {
  constructor(
    limit: number, 
    windowMs: number, 
    retryAfter?: number, 
    context?: Record<string, unknown>
  ) {
    super({
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded: ${limit} requests per ${windowMs}ms`,
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      context: {
        limit,
        windowMs,
        retryAfter,
        ...context,
      },
      timestamp: new Date().toISOString(),
    });
    this.name = 'RateLimitError';
  }
}

/**
 * Network Error
 */
export class NetworkError extends FinancialDataError {
  constructor(message: string, statusCode?: number, context?: Record<string, unknown>, cause?: Error) {
    super({
      code: 'NETWORK_ERROR',
      message,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      context: {
        ...context,
        ...(statusCode && { statusCode }),
      },
      cause,
      timestamp: new Date().toISOString(),
    });
    this.name = 'NetworkError';
  }
}

/**
 * Configuration Error
 */
export class ConfigurationError extends FinancialDataError {
  constructor(message: string, configKey?: string, context?: Record<string, unknown>) {
    super({
      code: 'CONFIGURATION_ERROR',
      message,
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      context: {
        ...context,
        ...(configKey && { configKey }),
      },
      timestamp: new Date().toISOString(),
    });
    this.name = 'ConfigurationError';
  }
}

/**
 * Security Error
 */
export class SecurityError extends FinancialDataError {
  constructor(message: string, context?: Record<string, unknown>, cause?: Error) {
    super({
      code: 'SECURITY_VIOLATION',
      message,
      category: ErrorCategory.SECURITY,
      severity: ErrorSeverity.CRITICAL,
      context,
      cause,
      timestamp: new Date().toISOString(),
    });
    this.name = 'SecurityError';
  }
}

/**
 * Error Factory for creating typed errors
 */
export class ErrorFactory {
  /**
   * Create authentication error
   */
  public static authentication(message: string, context?: Record<string, unknown>, cause?: Error): AuthenticationError {
    return new AuthenticationError(message, context, cause);
  }

  /**
   * Create authorization error
   */
  public static authorization(message: string, requiredScopes?: string[], context?: Record<string, unknown>): AuthorizationError {
    return new AuthorizationError(message, requiredScopes, context);
  }

  /**
   * Create validation error
   */
  public static validation(message: string, validationErrors?: z.ZodError, context?: Record<string, unknown>): ValidationError {
    return new ValidationError(message, validationErrors, context);
  }

  /**
   * Create data provider error
   */
  public static dataProvider(provider: string, operation: string, message: string, context?: Record<string, unknown>, cause?: Error): DataProviderError {
    return new DataProviderError(provider, operation, message, context, cause);
  }

  /**
   * Create rate limit error
   */
  public static rateLimit(limit: number, windowMs: number, retryAfter?: number, context?: Record<string, unknown>): RateLimitError {
    return new RateLimitError(limit, windowMs, retryAfter, context);
  }

  /**
   * Create network error
   */
  public static network(message: string, statusCode?: number, context?: Record<string, unknown>, cause?: Error): NetworkError {
    return new NetworkError(message, statusCode, context, cause);
  }

  /**
   * Create configuration error
   */
  public static configuration(message: string, configKey?: string, context?: Record<string, unknown>): ConfigurationError {
    return new ConfigurationError(message, configKey, context);
  }

  /**
   * Create security error
   */
  public static security(message: string, context?: Record<string, unknown>, cause?: Error): SecurityError {
    return new SecurityError(message, context, cause);
  }
}

/**
 * Global error handler for unhandled errors
 */
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private logger?: Logger;

  private constructor() {
    // Logger will be injected when available
  }

  public static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * Handle uncaught exceptions
   */
  public handleUncaughtException(error: Error): void {
    console.error('Uncaught Exception:', error);
    
    if (this.logger) {
      this.logger.logSecurity('uncaught_exception', 'critical', {
        error: error.message,
        stack: error.stack,
      });
    }

    // Graceful shutdown
    process.exit(1);
  }

  /**
   * Handle unhandled promise rejections
   */
  public handleUnhandledRejection(reason: unknown, promise: Promise<unknown>): void {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    if (this.logger) {
      this.logger.logSecurity('unhandled_rejection', 'critical', {
        reason: reason instanceof Error ? reason.message : String(reason),
      });
    }

    // Graceful shutdown
    process.exit(1);
  }

  /**
   * Set logger instance
   */
  public setLogger(logger: Logger): void {
    this.logger = logger;
  }
}