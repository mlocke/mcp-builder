/**
 * Environment configuration and validation for the Financial Data Server
 */

import { z } from 'zod';
import * as dotenv from 'dotenv';
import { OAuthConfigSchema } from '../types/auth.js';

// Load environment variables
dotenv.config();

// Environment schema validation
const EnvironmentSchema = z.object({
  // Application settings
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(65535)).default('3000'),
  SERVER_NAME: z.string().default('financial-data-server'),
  SERVER_VERSION: z.string().default('1.0.0'),

  // OAuth configuration
  OAUTH_CLIENT_ID: z.string().min(1, 'OAuth client ID is required'),
  OAUTH_CLIENT_SECRET: z.string().min(1, 'OAuth client secret is required'),
  OAUTH_ISSUER_URL: z.string().url('Invalid OAuth issuer URL'),
  OAUTH_REDIRECT_URI: z.string().url('Invalid OAuth redirect URI'),
  OAUTH_SCOPES: z.string().default('read:financial-data'),

  // Data provider APIs
  ALPHA_VANTAGE_API_KEY: z.string().min(1, 'Alpha Vantage API key is required'),
  ALPHA_VANTAGE_BASE_URL: z.string().url().default('https://www.alphavantage.co/query'),

  // Optional data providers
  YAHOO_FINANCE_API_KEY: z.string().optional(),
  FINANCIAL_MODELING_PREP_API_KEY: z.string().optional(),
  IEX_CLOUD_API_KEY: z.string().optional(),

  // Redis configuration
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(0).max(15)).default('0'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()).default('100'),
  RATE_LIMIT_PER_USER: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()).default('50'),

  // Security
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().length(32, 'Encryption key must be exactly 32 characters'),

  // API settings
  API_TIMEOUT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()).default('30000'),
  CACHE_TTL: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()).default('300000'),

  // Monitoring
  ENABLE_METRICS: z.string().transform(val => val === 'true').pipe(z.boolean()).default('true'),
  METRICS_PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(65535)).default('9090'),
  LOG_FORMAT: z.enum(['text', 'json']).default('json'),

  // Development
  DEBUG: z.string().optional(),
  MOCK_DATA_PROVIDERS: z.string().transform(val => val === 'true').pipe(z.boolean()).default('false'),
});

type Environment = z.infer<typeof EnvironmentSchema>;

// Validate and parse environment variables
function parseEnvironment(): Environment {
  try {
    const env = EnvironmentSchema.parse(process.env);
    
    // Additional validation for production
    if (env.NODE_ENV === 'production') {
      if (env.JWT_SECRET.includes('dev') || env.JWT_SECRET.includes('test')) {
        throw new Error('Production environment cannot use development JWT secret');
      }
      
      if (env.ENCRYPTION_KEY.includes('dev') || env.ENCRYPTION_KEY.includes('test')) {
        throw new Error('Production environment cannot use development encryption key');
      }
    }
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      throw new Error(`Environment validation failed:\n${issues.join('\n')}`);
    }
    throw error;
  }
}

// Export parsed environment
export const env = parseEnvironment();

// OAuth configuration derived from environment
export const oauthConfig = OAuthConfigSchema.parse({
  clientId: env.OAUTH_CLIENT_ID,
  clientSecret: env.OAUTH_CLIENT_SECRET,
  issuerUrl: env.OAUTH_ISSUER_URL,
  redirectUri: env.OAUTH_REDIRECT_URI,
  scopes: env.OAUTH_SCOPES.split(' ').filter(Boolean),
});

// Application configuration
export const appConfig = {
  name: env.SERVER_NAME,
  version: env.SERVER_VERSION,
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  logLevel: env.LOG_LEVEL,
  logFormat: env.LOG_FORMAT,
  enableMetrics: env.ENABLE_METRICS,
  metricsPort: env.METRICS_PORT,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
} as const;

// Data provider configuration
export const dataProviderConfig = {
  alphaVantage: {
    apiKey: env.ALPHA_VANTAGE_API_KEY,
    baseUrl: env.ALPHA_VANTAGE_BASE_URL,
  },
  yahooFinance: {
    apiKey: env.YAHOO_FINANCE_API_KEY,
  },
  financialModelingPrep: {
    apiKey: env.FINANCIAL_MODELING_PREP_API_KEY,
  },
  iexCloud: {
    apiKey: env.IEX_CLOUD_API_KEY,
  },
  mockProviders: env.MOCK_DATA_PROVIDERS,
  timeout: env.API_TIMEOUT,
} as const;

// Redis configuration
export const redisConfig = {
  url: env.REDIS_URL,
  password: env.REDIS_PASSWORD,
  db: env.REDIS_DB,
} as const;

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  perUser: env.RATE_LIMIT_PER_USER,
} as const;

// Security configuration
export const securityConfig = {
  jwtSecret: env.JWT_SECRET,
  encryptionKey: env.ENCRYPTION_KEY,
} as const;

// Cache configuration
export const cacheConfig = {
  ttl: env.CACHE_TTL,
} as const;

// Debug configuration
export const debugConfig = {
  debug: env.DEBUG,
} as const;

// Export all configurations
export const config = {
  app: appConfig,
  oauth: oauthConfig,
  dataProviders: dataProviderConfig,
  redis: redisConfig,
  rateLimit: rateLimitConfig,
  security: securityConfig,
  cache: cacheConfig,
  debug: debugConfig,
} as const;

export type Config = typeof config;