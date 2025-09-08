/**
 * Logging utilities for MCP servers
 */

import winston from 'winston';
import { Logger, LoggingConfig } from '../types';

export class MCPLogger implements Logger {
  private logger: winston.Logger;

  constructor(config: LoggingConfig) {
    this.logger = winston.createLogger({
      level: config.level,
      format: config.format === 'json' 
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        : winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.simple()
          ),
      transports: [
        new winston.transports.Console(),
        ...(config.file ? [new winston.transports.File({ filename: config.file })] : [])
      ]
    });
  }

  error(message: string, ...args: unknown[]): void {
    this.logger.error(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.logger.warn(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.logger.info(message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.logger.debug(message, ...args);
  }
}

export function createLogger(config: LoggingConfig): Logger {
  return new MCPLogger(config);
}