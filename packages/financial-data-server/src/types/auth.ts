/**
 * Authentication and authorization types for the Financial Data Server
 */

import { z } from 'zod';

// OAuth 2.1 Configuration Schema
export const OAuthConfigSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  issuerUrl: z.string().url('Invalid issuer URL'),
  redirectUri: z.string().url('Invalid redirect URI'),
  scopes: z.array(z.string()).default(['read:financial-data']),
  tokenEndpoint: z.string().url().optional(),
  authorizationEndpoint: z.string().url().optional(),
  userinfoEndpoint: z.string().url().optional(),
  jwksUri: z.string().url().optional(),
});

export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;

// Token schemas
export const AccessTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default('Bearer'),
  expires_in: z.number().positive(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export type AccessToken = z.infer<typeof AccessTokenSchema>;

export const RefreshTokenSchema = z.object({
  refresh_token: z.string(),
  client_id: z.string(),
});

export type RefreshToken = z.infer<typeof RefreshTokenSchema>;

// JWT Claims
export const JWTClaimsSchema = z.object({
  sub: z.string(), // Subject (user ID)
  iss: z.string(), // Issuer
  aud: z.union([z.string(), z.array(z.string())]), // Audience
  exp: z.number(), // Expiration time
  iat: z.number(), // Issued at
  nbf: z.number().optional(), // Not before
  jti: z.string().optional(), // JWT ID
  scope: z.string().optional(), // OAuth scopes
  email: z.string().email().optional(),
  name: z.string().optional(),
  preferred_username: z.string().optional(),
});

export type JWTClaims = z.infer<typeof JWTClaimsSchema>;

// Authorization context
export const AuthContextSchema = z.object({
  userId: z.string(),
  scopes: z.array(z.string()),
  tokenType: z.string().default('Bearer'),
  issuedAt: z.number(),
  expiresAt: z.number(),
  clientId: z.string(),
  email: z.string().email().optional(),
  name: z.string().optional(),
});

export type AuthContext = z.infer<typeof AuthContextSchema>;

// PKCE (Proof Key for Code Exchange) types
export const PKCESchema = z.object({
  code_verifier: z.string().min(43).max(128),
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.enum(['S256', 'plain']).default('S256'),
  state: z.string().min(1),
});

export type PKCE = z.infer<typeof PKCESchema>;

// Authorization request
export const AuthorizationRequestSchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string(),
  redirect_uri: z.string().url(),
  scope: z.string().optional(),
  state: z.string(),
  code_challenge: z.string(),
  code_challenge_method: z.enum(['S256', 'plain']),
});

export type AuthorizationRequest = z.infer<typeof AuthorizationRequestSchema>;

// Token request
export const TokenRequestSchema = z.object({
  grant_type: z.enum(['authorization_code', 'refresh_token']),
  code: z.string().optional(), // Required for authorization_code
  redirect_uri: z.string().url().optional(), // Required for authorization_code
  client_id: z.string(),
  code_verifier: z.string().optional(), // Required for authorization_code with PKCE
  refresh_token: z.string().optional(), // Required for refresh_token grant
});

export type TokenRequest = z.infer<typeof TokenRequestSchema>;

// Error responses
export const OAuthErrorSchema = z.object({
  error: z.enum([
    'invalid_request',
    'invalid_client',
    'invalid_grant',
    'unauthorized_client',
    'unsupported_grant_type',
    'invalid_scope',
    'access_denied',
    'unsupported_response_type',
    'server_error',
    'temporarily_unavailable',
  ]),
  error_description: z.string().optional(),
  error_uri: z.string().url().optional(),
  state: z.string().optional(),
});

export type OAuthError = z.infer<typeof OAuthErrorSchema>;

// Scopes for financial data access
export const FinancialScopes = {
  READ_STOCK_PRICES: 'read:stock-prices',
  READ_COMPANY_INFO: 'read:company-info',
  READ_FINANCIALS: 'read:financials',
  READ_SEC_FILINGS: 'read:sec-filings',
  READ_EARNINGS: 'read:earnings',
  READ_ALL: 'read:financial-data',
  ADMIN: 'admin:financial-data',
} as const;

export type FinancialScope = typeof FinancialScopes[keyof typeof FinancialScopes];

// Rate limiting context
export const RateLimitContextSchema = z.object({
  userId: z.string(),
  clientId: z.string(),
  endpoint: z.string(),
  requestCount: z.number().nonnegative(),
  windowStart: z.number(),
  windowEnd: z.number(),
  maxRequests: z.number().positive(),
});

export type RateLimitContext = z.infer<typeof RateLimitContextSchema>;

// Security headers
export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'Strict-Transport-Security'?: string;
  'X-Content-Type-Options'?: string;
  'X-Frame-Options'?: string;
  'X-XSS-Protection'?: string;
  'Referrer-Policy'?: string;
}

// Authentication middleware options
export interface AuthMiddlewareOptions {
  required?: boolean;
  scopes?: FinancialScope[];
  skipPaths?: string[];
  validateScopes?: boolean;
}