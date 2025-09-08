/**
 * Authentication utilities for MCP servers
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export interface AuthConfig {
  type: 'none' | 'api-key' | 'bearer' | 'custom';
  secret?: string;
  customValidator?: (token: string) => Promise<boolean>;
}

export class AuthManager {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  async authenticate(token?: string): Promise<boolean> {
    switch (this.config.type) {
      case 'none':
        return true;
        
      case 'api-key':
        return this.validateApiKey(token);
        
      case 'bearer':
        return this.validateBearerToken(token);
        
      case 'custom':
        if (!this.config.customValidator) {
          throw new Error('Custom validator not provided');
        }
        return token ? this.config.customValidator(token) : false;
        
      default:
        return false;
    }
  }

  private validateApiKey(token?: string): boolean {
    if (!token || !this.config.secret) {
      return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    try {
      const expected = Buffer.from(this.config.secret, 'utf8');
      const actual = Buffer.from(token, 'utf8');
      
      if (expected.length !== actual.length) {
        return false;
      }
      
      return timingSafeEqual(expected, actual);
    } catch {
      return false;
    }
  }

  private validateBearerToken(token?: string): boolean {
    // Simple bearer token validation - in production, you'd validate against a JWT or external service
    return token === this.config.secret;
  }
}

export function generateApiKey(length = 32): string {
  return randomBytes(length).toString('hex');
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(password + actualSalt)
    .digest('hex');
    
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: newHash } = hashPassword(password, salt);
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(newHash, 'hex'));
}