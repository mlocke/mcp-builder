/**
 * Authentication and Authorization Middleware
 */

import jwt from 'jsonwebtoken';
import { z } from 'zod';
import {
  AuthContext,
  JWTClaims,
  FinancialScope,
  AuthMiddlewareOptions,
  JWTClaimsSchema,
  AuthContextSchema,
} from '../types/auth.js';
import { Logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

export interface AuthenticatedRequest {
  auth?: AuthContext;
  headers: Record<string, string>;
}

export interface AuthenticationResult {
  success: boolean;
  context?: AuthContext;
  error?: string;
}

export class AuthMiddleware {
  private readonly logger: Logger;
  private readonly jwtSecret: string;
  private readonly issuer: string;

  constructor(logger: Logger) {
    this.logger = logger;
    this.jwtSecret = config.security.jwtSecret;
    this.issuer = config.oauth.issuerUrl;
  }

  /**
   * Authenticate request using Bearer token
   */
  public async authenticate(request: AuthenticatedRequest): Promise<AuthenticationResult> {
    try {
      const token = this.extractBearerToken(request.headers);
      
      if (!token) {
        return { success: false, error: 'Missing or invalid Authorization header' };
      }

      const claims = await this.validateJWT(token);
      const context = this.buildAuthContext(claims);

      this.logger.debug('Authentication successful', {
        userId: context.userId,
        clientId: context.clientId,
        scopes: context.scopes,
      });

      return { success: true, context };
    } catch (error) {
      this.logger.warn('Authentication failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  }

  /**
   * Authorize request against required scopes
   */
  public authorize(context: AuthContext, requiredScopes: FinancialScope[]): boolean {
    if (requiredScopes.length === 0) {
      return true;
    }

    // Check if user has admin scope (grants all permissions)
    if (context.scopes.includes('admin:financial-data')) {
      return true;
    }

    // Check if user has 'read:financial-data' scope (grants all read permissions)
    if (context.scopes.includes('read:financial-data') && 
        requiredScopes.every(scope => scope.startsWith('read:'))) {
      return true;
    }

    // Check individual scopes
    const hasRequiredScopes = requiredScopes.every(scope => context.scopes.includes(scope));
    
    this.logger.debug('Authorization check', {
      userId: context.userId,
      requiredScopes,
      userScopes: context.scopes,
      authorized: hasRequiredScopes,
    });

    return hasRequiredScopes;
  }

  /**
   * Middleware factory for MCP request authentication
   */
  public createMiddleware(options: AuthMiddlewareOptions = {}) {
    const { required = true, scopes = [], validateScopes = true } = options;

    return async (request: AuthenticatedRequest): Promise<{ authorized: boolean; context?: AuthContext; error?: string }> => {
      // Skip authentication for non-required endpoints
      if (!required) {
        return { authorized: true };
      }

      // Authenticate the request
      const authResult = await this.authenticate(request);
      
      if (!authResult.success || !authResult.context) {
        return { 
          authorized: false, 
          error: authResult.error || 'Authentication required' 
        };
      }

      // Check token expiration
      if (this.isTokenExpired(authResult.context)) {
        return { 
          authorized: false, 
          error: 'Token has expired' 
        };
      }

      // Validate scopes if required
      if (validateScopes && scopes.length > 0) {
        const authorized = this.authorize(authResult.context, scopes);
        if (!authorized) {
          return {
            authorized: false,
            error: `Insufficient permissions. Required scopes: ${scopes.join(', ')}`
          };
        }
      }

      return { 
        authorized: true, 
        context: authResult.context 
      };
    };
  }

  /**
   * Extract Bearer token from Authorization header
   */
  private extractBearerToken(headers: Record<string, string>): string | null {
    const authHeader = headers.authorization || headers.Authorization;
    
    if (!authHeader) {
      return null;
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/);
    return match?.[1] || null;
  }

  /**
   * Validate JWT token and extract claims
   */
  private async validateJWT(token: string): Promise<JWTClaims> {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        issuer: this.issuer,
        algorithms: ['HS256', 'RS256'],
      });

      if (typeof payload === 'string') {
        throw new Error('Invalid token payload');
      }

      return JWTClaimsSchema.parse(payload);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Invalid token: ${error.message}`);
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.NotBeforeError) {
        throw new Error('Token not yet valid');
      }
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid token claims: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Build authentication context from JWT claims
   */
  private buildAuthContext(claims: JWTClaims): AuthContext {
    const scopes = claims.scope ? claims.scope.split(' ').filter(Boolean) : [];
    
    const context = {
      userId: claims.sub,
      scopes,
      tokenType: 'Bearer',
      issuedAt: claims.iat,
      expiresAt: claims.exp,
      clientId: claims.aud as string, // Assuming audience is client ID
      email: claims.email,
      name: claims.name,
    };

    return AuthContextSchema.parse(context);
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(context: AuthContext): boolean {
    const now = Math.floor(Date.now() / 1000);
    return context.expiresAt <= now;
  }

  /**
   * Get remaining token lifetime in seconds
   */
  public getTokenLifetime(context: AuthContext): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, context.expiresAt - now);
  }

  /**
   * Check if token needs refresh (expires within threshold)
   */
  public shouldRefreshToken(context: AuthContext, thresholdSeconds: number = 300): boolean {
    const lifetime = this.getTokenLifetime(context);
    return lifetime <= thresholdSeconds;
  }
}