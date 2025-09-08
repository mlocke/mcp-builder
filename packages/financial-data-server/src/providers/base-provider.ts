/**
 * Abstract Base Data Provider Interface
 * Defines the contract for all financial data providers
 */

import { z } from 'zod';
import { Logger } from '../utils/logger.js';
import { DataProviderError } from '../utils/errors.js';

// Common data schemas
export const StockPriceSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  currency: z.string().default('USD'),
  timestamp: z.string().datetime(),
  open: z.number().optional(),
  high: z.number().optional(),
  low: z.number().optional(),
  close: z.number().optional(),
  volume: z.number().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
});

export type StockPrice = z.infer<typeof StockPriceSchema>;

export const CompanyInfoSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string().optional(),
  sector: z.string().optional(),
  industry: z.string().optional(),
  marketCap: z.number().optional(),
  employees: z.number().optional(),
  description: z.string().optional(),
  website: z.string().url().optional(),
  ceo: z.string().optional(),
  founded: z.number().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export type CompanyInfo = z.infer<typeof CompanyInfoSchema>;

export const FinancialStatementSchema = z.object({
  symbol: z.string(),
  period: z.enum(['quarterly', 'annual']),
  year: z.number(),
  quarter: z.number().optional(),
  currency: z.string().default('USD'),
  revenue: z.number().optional(),
  grossProfit: z.number().optional(),
  netIncome: z.number().optional(),
  totalAssets: z.number().optional(),
  totalDebt: z.number().optional(),
  shareholderEquity: z.number().optional(),
  operatingCashFlow: z.number().optional(),
  freeCashFlow: z.number().optional(),
  eps: z.number().optional(),
  reportedDate: z.string().datetime().optional(),
});

export type FinancialStatement = z.infer<typeof FinancialStatementSchema>;

// Provider configuration interface
export interface ProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl: string;
  timeout: number;
  rateLimitPerSecond: number;
  retryAttempts: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

// Provider capabilities
export interface ProviderCapabilities {
  stockPrices: boolean;
  companyInfo: boolean;
  financialStatements: boolean;
  secFilings: boolean;
  earnings: boolean;
  realTimeData: boolean;
  historicalData: boolean;
  internationalMarkets: boolean;
}

// Rate limiting context
export interface RateLimitStatus {
  requestsRemaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Provider health status
export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime?: number;
  errorRate?: number;
  message?: string;
}

/**
 * Abstract Base Provider Class
 * All financial data providers must extend this class
 */
export abstract class BaseDataProvider {
  protected readonly config: ProviderConfig;
  protected readonly logger: Logger;
  protected readonly capabilities: ProviderCapabilities;
  
  private requestCount = 0;
  private lastReset = Date.now();
  private health: ProviderHealth = {
    status: 'healthy',
    lastCheck: new Date().toISOString(),
  };

  constructor(config: ProviderConfig, capabilities: ProviderCapabilities, logger: Logger) {
    this.config = config;
    this.capabilities = capabilities;
    this.logger = logger.child(`provider:${config.name}`);
    
    this.logger.info('Provider initialized', {
      name: config.name,
      capabilities,
      rateLimitPerSecond: config.rateLimitPerSecond,
    });
  }

  // Abstract methods that must be implemented by concrete providers
  
  /**
   * Get current or historical stock price data
   */
  public abstract getPriceSnapshot(symbols: string[], options?: {
    includeExtendedHours?: boolean;
    includePreviousClose?: boolean;
  }): Promise<StockPrice[]>;

  /**
   * Get company information
   */
  public abstract getCompanyInfo(symbol: string): Promise<CompanyInfo>;

  /**
   * Get financial statements
   */
  public abstract getFinancialStatements(
    symbol: string, 
    period: 'quarterly' | 'annual',
    limit?: number
  ): Promise<FinancialStatement[]>;

  /**
   * Test provider connectivity and authentication
   */
  public abstract testConnection(): Promise<boolean>;

  // Common utility methods

  /**
   * Get provider name
   */
  public getName(): string {
    return this.config.name;
  }

  /**
   * Get provider capabilities
   */
  public getCapabilities(): ProviderCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Get provider configuration (without sensitive data)
   */
  public getConfig(): Omit<ProviderConfig, 'apiKey'> {
    const { apiKey, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Check if provider supports a specific capability
   */
  public supportsCapability(capability: keyof ProviderCapabilities): boolean {
    return this.capabilities[capability] === true;
  }

  /**
   * Get current rate limit status
   */
  public getRateLimitStatus(): RateLimitStatus {
    const now = Date.now();
    const windowMs = 1000; // 1 second window
    
    // Reset counter if window has passed
    if (now - this.lastReset >= windowMs) {
      this.requestCount = 0;
      this.lastReset = now;
    }

    const requestsRemaining = Math.max(0, this.config.rateLimitPerSecond - this.requestCount);
    const resetTime = this.lastReset + windowMs;

    return {
      requestsRemaining,
      resetTime,
      ...(requestsRemaining === 0 && { retryAfter: Math.ceil((resetTime - now) / 1000) }),
    };
  }

  /**
   * Check if request can be made without exceeding rate limit
   */
  public canMakeRequest(): boolean {
    const status = this.getRateLimitStatus();
    return status.requestsRemaining > 0;
  }

  /**
   * Record a request for rate limiting
   */
  protected recordRequest(): void {
    this.requestCount++;
    this.logger.debug('Request recorded', {
      requestCount: this.requestCount,
      limit: this.config.rateLimitPerSecond,
      remaining: Math.max(0, this.config.rateLimitPerSecond - this.requestCount),
    });
  }

  /**
   * Get provider health status
   */
  public async getHealth(): Promise<ProviderHealth> {
    try {
      const startTime = Date.now();
      const isHealthy = await this.testConnection();
      const responseTime = Date.now() - startTime;

      this.health = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime,
        message: isHealthy ? 'Provider is operational' : 'Provider connection failed',
      };

      this.logger.debug('Health check completed', this.health as any);
      return this.health;
    } catch (error) {
      this.health = {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Health check failed',
      };

      this.logger.error('Health check failed', { error });
      return this.health;
    }
  }

  /**
   * Validate symbol format
   */
  protected validateSymbol(symbol: string): string {
    if (!symbol || typeof symbol !== 'string') {
      throw new DataProviderError(
        this.config.name,
        'validateSymbol',
        'Symbol must be a non-empty string',
        { symbol }
      );
    }

    const cleanSymbol = symbol.trim().toUpperCase();
    
    if (cleanSymbol.length === 0) {
      throw new DataProviderError(
        this.config.name,
        'validateSymbol',
        'Symbol cannot be empty',
        { symbol }
      );
    }

    // Basic symbol validation (letters, numbers, dots, hyphens)
    if (!/^[A-Z0-9.-]+$/.test(cleanSymbol)) {
      throw new DataProviderError(
        this.config.name,
        'validateSymbol',
        'Symbol contains invalid characters',
        { symbol, cleanSymbol }
      );
    }

    return cleanSymbol;
  }

  /**
   * Validate multiple symbols
   */
  protected validateSymbols(symbols: string[]): string[] {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw new DataProviderError(
        this.config.name,
        'validateSymbols',
        'Symbols must be a non-empty array',
        { symbols }
      );
    }

    return symbols.map(symbol => this.validateSymbol(symbol));
  }

  /**
   * Handle provider errors with context
   */
  protected handleProviderError(operation: string, error: unknown, context?: Record<string, unknown>): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    this.logger.error(`Provider operation failed: ${operation}`, {
      error: errorMessage,
      ...context,
    });

    throw new DataProviderError(
      this.config.name,
      operation,
      errorMessage,
      context,
      error instanceof Error ? error : undefined
    );
  }

  /**
   * Sleep for rate limiting
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for rate limit reset if needed
   */
  protected async waitForRateLimit(): Promise<void> {
    const status = this.getRateLimitStatus();
    
    if (status.requestsRemaining === 0 && status.retryAfter) {
      this.logger.debug('Rate limit exceeded, waiting', {
        retryAfter: status.retryAfter,
      });
      
      await this.sleep(status.retryAfter * 1000);
    }
  }
}