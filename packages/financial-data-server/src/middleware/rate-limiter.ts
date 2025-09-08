/**
 * Rate Limiting Middleware for Financial Data Server
 */

import { createClient } from 'redis';
import { z } from 'zod';
import { RateLimitError } from '../utils/errors.js';
import { Logger } from '../utils/logger.js';
import { AuthContext } from '../types/auth.js';
import { config } from '../config/environment.js';

// Rate limit configuration schema
const RateLimitConfigSchema = z.object({
  windowMs: z.number().positive(),
  maxRequests: z.number().positive(),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false),
  keyGenerator: z.function().optional(),
});

type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

// Rate limit result
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  private readonly redis: ReturnType<typeof createClient>;
  private readonly logger: Logger;
  private readonly defaultConfig: RateLimitConfig;

  constructor(redis: ReturnType<typeof createClient>, logger: Logger) {
    this.redis = redis;
    this.logger = logger.child('rate-limiter');
    
    this.defaultConfig = {
      windowMs: config.rateLimit.windowMs,
      maxRequests: config.rateLimit.maxRequests,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    };
  }

  /**
   * Check rate limit for a user/endpoint combination
   */
  public async checkRateLimit(
    userId: string,
    clientId: string,
    endpoint: string,
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    const rateLimitConfig = { ...this.defaultConfig, ...customConfig };
    const key = this.generateKey(userId, clientId, endpoint);
    const now = Date.now();
    const windowStart = now - rateLimitConfig.windowMs;

    try {
      // Use Redis for distributed rate limiting
      const script = `
        local key = KEYS[1]
        local window_start = ARGV[1]
        local now = ARGV[2]
        local max_requests = tonumber(ARGV[3])
        local window_ms = tonumber(ARGV[4])
        
        -- Remove expired entries
        redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
        
        -- Count current requests in window
        local current = redis.call('ZCARD', key)
        
        if current < max_requests then
          -- Add current request
          redis.call('ZADD', key, now, now)
          redis.call('EXPIRE', key, math.ceil(window_ms / 1000))
          return {1, current + 1, max_requests - current - 1, now + window_ms}
        else
          -- Rate limit exceeded
          local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')[2]
          local reset_time = oldest and (tonumber(oldest) + window_ms) or (now + window_ms)
          return {0, current, 0, reset_time}
        end
      `;

      const result = await this.redis.eval(
        script,
        { keys: [key], arguments: [
          windowStart.toString(),
          now.toString(),
          rateLimitConfig.maxRequests.toString(),
          rateLimitConfig.windowMs.toString(),
        ]},
      ) as number[];

      const [allowed, current, remaining, resetTime] = result;
      const rateLimitResult: RateLimitResult = {
        allowed: allowed === 1,
        limit: rateLimitConfig.maxRequests,
        current: current || 0,
        remaining: remaining || 0,
        resetTime: resetTime || now + rateLimitConfig.windowMs,
      };

      // Add retry after if rate limited
      if (!rateLimitResult.allowed && resetTime) {
        rateLimitResult.retryAfter = Math.ceil((resetTime - now) / 1000);
      }

      this.logger.logRateLimit(userId, endpoint, !rateLimitResult.allowed, {
        clientId,
        limit: rateLimitResult.limit,
        current: rateLimitResult.current,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      });

      return rateLimitResult;
    } catch (error) {
      this.logger.error('Rate limit check failed', {
        error,
        userId,
        clientId,
        endpoint,
      });

      // Fail open - allow request if Redis is unavailable
      return {
        allowed: true,
        limit: rateLimitConfig.maxRequests,
        current: 0,
        remaining: rateLimitConfig.maxRequests,
        resetTime: now + rateLimitConfig.windowMs,
      };
    }
  }

  /**
   * Middleware factory for rate limiting
   */
  public createMiddleware(customConfig?: Partial<RateLimitConfig>) {
    return async (
      authContext: AuthContext,
      endpoint: string
    ): Promise<{ allowed: boolean; rateLimitResult: RateLimitResult }> => {
      const result = await this.checkRateLimit(
        authContext.userId,
        authContext.clientId,
        endpoint,
        customConfig
      );

      return {
        allowed: result.allowed,
        rateLimitResult: result,
      };
    };
  }

  /**
   * Per-user rate limiting with custom limits based on user tier
   */
  public async checkUserRateLimit(
    authContext: AuthContext,
    endpoint: string,
    userTier: 'free' | 'premium' | 'enterprise' = 'free'
  ): Promise<RateLimitResult> {
    // Different limits based on user tier
    const tierLimits = {
      free: config.rateLimit.perUser,
      premium: config.rateLimit.perUser * 5,
      enterprise: config.rateLimit.perUser * 20,
    };

    const customConfig: Partial<RateLimitConfig> = {
      maxRequests: tierLimits[userTier],
    };

    return this.checkRateLimit(
      authContext.userId,
      authContext.clientId,
      endpoint,
      customConfig
    );
  }

  /**
   * Global rate limiting (across all users)
   */
  public async checkGlobalRateLimit(endpoint: string): Promise<RateLimitResult> {
    const globalKey = `global:${endpoint}`;
    
    return this.checkRateLimit(
      'global',
      'system',
      globalKey,
      {
        maxRequests: config.rateLimit.maxRequests * 10, // Higher global limit
      }
    );
  }

  /**
   * API endpoint specific rate limiting
   */
  public async checkEndpointRateLimit(
    authContext: AuthContext,
    endpoint: string
  ): Promise<RateLimitResult> {
    // Different limits for different endpoints
    const endpointLimits: Record<string, number> = {
      'getPriceSnapshot': 100,
      'getCompanyInfo': 50,
      'getFinancials': 20,
      'getSecFilings': 10,
      'getEarnings': 30,
    };

    const limit = endpointLimits[endpoint] || config.rateLimit.perUser;
    
    return this.checkRateLimit(
      authContext.userId,
      authContext.clientId,
      endpoint,
      { maxRequests: limit }
    );
  }

  /**
   * Reset rate limit for a user/endpoint (admin function)
   */
  public async resetRateLimit(
    userId: string,
    clientId: string,
    endpoint: string
  ): Promise<void> {
    const key = this.generateKey(userId, clientId, endpoint);
    
    try {
      await this.redis.del(key);
      
      this.logger.info('Rate limit reset', {
        userId,
        clientId,
        endpoint,
      });
    } catch (error) {
      this.logger.error('Failed to reset rate limit', {
        error,
        userId,
        clientId,
        endpoint,
      });
      throw new Error('Failed to reset rate limit');
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  public async getRateLimitStatus(
    userId: string,
    clientId: string,
    endpoint: string
  ): Promise<RateLimitResult> {
    const key = this.generateKey(userId, clientId, endpoint);
    const now = Date.now();
    const windowStart = now - this.defaultConfig.windowMs;

    try {
      // Get current count without incrementing
      await this.redis.zRemRangeByScore(key, '-inf', windowStart);
      const current = await this.redis.zCard(key);
      const remaining = Math.max(0, this.defaultConfig.maxRequests - current);
      
      return {
        allowed: remaining > 0,
        limit: this.defaultConfig.maxRequests,
        current,
        remaining,
        resetTime: now + this.defaultConfig.windowMs,
      };
    } catch (error) {
      this.logger.error('Failed to get rate limit status', {
        error,
        userId,
        clientId,
        endpoint,
      });

      // Return default status if Redis is unavailable
      return {
        allowed: true,
        limit: this.defaultConfig.maxRequests,
        current: 0,
        remaining: this.defaultConfig.maxRequests,
        resetTime: now + this.defaultConfig.windowMs,
      };
    }
  }

  /**
   * Generate Redis key for rate limiting
   */
  private generateKey(userId: string, clientId: string, endpoint: string): string {
    return `rate_limit:${clientId}:${userId}:${endpoint}`;
  }

  /**
   * Throw rate limit error with proper context
   */
  public static throwRateLimitError(result: RateLimitResult, context?: Record<string, unknown>): never {
    throw new RateLimitError(
      result.limit,
      config.rateLimit.windowMs,
      result.retryAfter,
      {
        current: result.current,
        remaining: result.remaining,
        resetTime: result.resetTime,
        ...context,
      }
    );
  }
}