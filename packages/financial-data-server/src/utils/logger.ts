/**
 * Structured Logger Implementation for Financial Data Server
 */

import { config } from '../config/environment.js';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class Logger {
  private readonly name: string;
  private readonly logLevel: LogLevel;
  private readonly isProduction: boolean;

  constructor(name: string = 'financial-data-server') {
    this.name = name;
    this.logLevel = config.app.logLevel;
    this.isProduction = config.app.isProduction;
  }

  /**
   * Log error message
   */
  public error(message: string, context?: LogContext | Error): void {
    this.log('error', message, context);
  }

  /**
   * Log warning message
   */
  public warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log info message
   */
  public info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log debug message
   */
  public debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log authentication events
   */
  public logAuth(event: 'login' | 'logout' | 'token_refresh' | 'auth_failure', context: LogContext): void {
    this.info(`Auth: ${event}`, {
      ...context,
      event_type: 'authentication',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log API requests
   */
  public logRequest(method: string, endpoint: string, statusCode: number, duration: number, context?: LogContext): void {
    const logContext = {
      method,
      endpoint,
      status_code: statusCode,
      duration_ms: duration,
      event_type: 'api_request',
      ...context,
    };

    if (statusCode >= 400) {
      this.warn(`Request failed: ${method} ${endpoint}`, logContext);
    } else {
      this.info(`Request completed: ${method} ${endpoint}`, logContext);
    }
  }

  /**
   * Log rate limiting events
   */
  public logRateLimit(userId: string, endpoint: string, isBlocked: boolean, context?: LogContext): void {
    const logContext = {
      user_id: userId,
      endpoint,
      blocked: isBlocked,
      event_type: 'rate_limit',
      ...context,
    };

    if (isBlocked) {
      this.warn('Rate limit exceeded', logContext);
    } else {
      this.debug('Rate limit check', logContext);
    }
  }

  /**
   * Log data provider interactions
   */
  public logDataProvider(provider: string, operation: string, success: boolean, context?: LogContext): void {
    const logContext = {
      provider,
      operation,
      success,
      event_type: 'data_provider',
      ...context,
    };

    if (success) {
      this.debug(`Data provider success: ${provider}.${operation}`, logContext);
    } else {
      this.error(`Data provider failure: ${provider}.${operation}`, logContext);
    }
  }

  /**
   * Log security events
   */
  public logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context: LogContext): void {
    const logContext = {
      security_event: event,
      severity,
      event_type: 'security',
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (severity === 'critical' || severity === 'high') {
      this.error(`Security: ${event}`, logContext);
    } else if (severity === 'medium') {
      this.warn(`Security: ${event}`, logContext);
    } else {
      this.info(`Security: ${event}`, logContext);
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext | Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = this.createLogEntry(level, message, context);
    
    if (config.app.logFormat === 'json') {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(this.formatTextLog(logEntry));
    }

    // In production, also write to stderr for errors
    if (this.isProduction && level === 'error') {
      console.error(JSON.stringify(logEntry));
    }
  }

  /**
   * Check if log level should be written
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };

    return levels[level] <= levels[this.logLevel];
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(level: LogLevel, message: string, context?: LogContext | Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (this.name) {
      (entry as any).logger = this.name;
    }

    if (context) {
      if (context instanceof Error) {
        entry.error = {
          name: context.name,
          message: context.message,
          stack: context.stack,
        };
      } else {
        entry.context = this.sanitizeContext(context);
      }
    }

    return entry;
  }

  /**
   * Format log entry for text output
   */
  private formatTextLog(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const logger = this.name ? `[${this.name}]` : '';
    
    let output = `${timestamp} ${level} ${logger} ${entry.message}`;
    
    if (entry.context) {
      output += ` ${JSON.stringify(entry.context)}`;
    }
    
    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack && !this.isProduction) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    return output;
  }

  /**
   * Sanitize context to remove sensitive information
   */
  private sanitizeContext(context: LogContext): LogContext {
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'api_key',
      'apikey',
      'client_secret',
      'refresh_token',
      'access_token',
    ];

    const sanitized: LogContext = {};
    
    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = `[TRUNCATED:${value.length}]`;
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Create child logger with additional context
   */
  public child(name: string): Logger {
    return new Logger(`${this.name}:${name}`);
  }
}