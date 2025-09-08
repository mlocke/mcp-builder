/**
 * Secure Token Storage Implementation
 * Handles encrypted storage and retrieval of OAuth tokens using Redis
 */

import crypto from 'crypto';
import { createClient } from 'redis';
import { z } from 'zod';
import { AccessToken, AuthContext } from '../types/auth.js';
import { Logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

// Token storage schemas
const StoredTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  tokenType: z.string(),
  expiresAt: z.number(),
  scopes: z.array(z.string()),
  clientId: z.string(),
  userId: z.string(),
});

type StoredToken = z.infer<typeof StoredTokenSchema>;

export class TokenStorage {
  private readonly redis: ReturnType<typeof createClient>;
  private readonly logger: Logger;
  private readonly encryptionKey: Buffer;

  constructor(redis: ReturnType<typeof createClient>, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
    this.encryptionKey = Buffer.from(config.security.encryptionKey, 'utf8');
  }

  /**
   * Store encrypted access token and refresh token
   */
  public async storeToken(
    userId: string,
    clientId: string,
    accessToken: AccessToken,
    authContext: AuthContext
  ): Promise<void> {
    try {
      const storedToken: StoredToken = {
        accessToken: accessToken.access_token,
        refreshToken: accessToken.refresh_token,
        tokenType: accessToken.token_type,
        expiresAt: authContext.expiresAt,
        scopes: authContext.scopes,
        clientId,
        userId,
      };

      // Validate token data
      const validatedToken = StoredTokenSchema.parse(storedToken);

      // Encrypt the token data
      const encryptedData = this.encrypt(JSON.stringify(validatedToken));
      
      // Generate Redis keys
      const accessTokenKey = this.generateAccessTokenKey(userId, clientId);
      const refreshTokenKey = this.generateRefreshTokenKey(userId, clientId);
      
      // Calculate TTL (with buffer for refresh)
      const ttlSeconds = Math.max(60, authContext.expiresAt - Math.floor(Date.now() / 1000));

      // Store encrypted token data
      await this.redis.setEx(accessTokenKey, ttlSeconds, encryptedData);
      
      // Store refresh token mapping if available
      if (accessToken.refresh_token) {
        const refreshTTL = ttlSeconds + (24 * 60 * 60); // Refresh token valid 24h longer
        await this.redis.setEx(refreshTokenKey, refreshTTL, encryptedData);
      }

      this.logger.debug('Token stored successfully', {
        userId,
        clientId,
        expiresAt: authContext.expiresAt,
        hasRefreshToken: !!accessToken.refresh_token,
        ttlSeconds,
      });
    } catch (error) {
      this.logger.error('Failed to store token', { error, userId, clientId });
      throw new Error('Failed to store authentication token');
    }
  }

  /**
   * Retrieve and decrypt stored token
   */
  public async getToken(userId: string, clientId: string): Promise<StoredToken | null> {
    try {
      const accessTokenKey = this.generateAccessTokenKey(userId, clientId);
      const encryptedData = await this.redis.get(accessTokenKey);
      
      if (!encryptedData) {
        this.logger.debug('Token not found', { userId, clientId });
        return null;
      }

      // Decrypt and parse token data
      const decryptedData = this.decrypt(encryptedData);
      const tokenData = JSON.parse(decryptedData);
      const storedToken = StoredTokenSchema.parse(tokenData);

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (storedToken.expiresAt <= now) {
        this.logger.debug('Stored token is expired', { userId, clientId, expiresAt: storedToken.expiresAt });
        await this.deleteToken(userId, clientId);
        return null;
      }

      this.logger.debug('Token retrieved successfully', {
        userId,
        clientId,
        expiresAt: storedToken.expiresAt,
        hasRefreshToken: !!storedToken.refreshToken,
      });

      return storedToken;
    } catch (error) {
      this.logger.error('Failed to retrieve token', { error, userId, clientId });
      return null;
    }
  }

  /**
   * Update stored token (e.g., after refresh)
   */
  public async updateToken(
    userId: string,
    clientId: string,
    newAccessToken: AccessToken,
    newAuthContext: AuthContext
  ): Promise<void> {
    // Store updated token
    await this.storeToken(userId, clientId, newAccessToken, newAuthContext);
    
    this.logger.info('Token updated successfully', {
      userId,
      clientId,
      expiresAt: newAuthContext.expiresAt,
    });
  }

  /**
   * Delete stored token (logout/revoke)
   */
  public async deleteToken(userId: string, clientId: string): Promise<void> {
    try {
      const accessTokenKey = this.generateAccessTokenKey(userId, clientId);
      const refreshTokenKey = this.generateRefreshTokenKey(userId, clientId);

      // Delete both access and refresh token data
      await Promise.all([
        this.redis.del(accessTokenKey),
        this.redis.del(refreshTokenKey),
      ]);

      this.logger.info('Token deleted successfully', { userId, clientId });
    } catch (error) {
      this.logger.error('Failed to delete token', { error, userId, clientId });
      throw new Error('Failed to delete authentication token');
    }
  }

  /**
   * Get refresh token for user
   */
  public async getRefreshToken(userId: string, clientId: string): Promise<string | null> {
    const storedToken = await this.getToken(userId, clientId);
    return storedToken?.refreshToken || null;
  }

  /**
   * Check if token exists and is valid
   */
  public async isTokenValid(userId: string, clientId: string): Promise<boolean> {
    const token = await this.getToken(userId, clientId);
    if (!token) return false;

    const now = Math.floor(Date.now() / 1000);
    return token.expiresAt > now;
  }

  /**
   * Get token expiration time
   */
  public async getTokenExpiration(userId: string, clientId: string): Promise<number | null> {
    const token = await this.getToken(userId, clientId);
    return token?.expiresAt || null;
  }

  /**
   * Clean up expired tokens (maintenance task)
   */
  public async cleanupExpiredTokens(): Promise<void> {
    try {
      // This is handled automatically by Redis TTL, but we can add additional cleanup logic here
      this.logger.debug('Token cleanup completed');
    } catch (error) {
      this.logger.error('Token cleanup failed', { error });
    }
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine IV and encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error('Invalid encrypted data format');
    }
    
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate Redis key for access token
   */
  private generateAccessTokenKey(userId: string, clientId: string): string {
    return `auth:access_token:${clientId}:${userId}`;
  }

  /**
   * Generate Redis key for refresh token
   */
  private generateRefreshTokenKey(userId: string, clientId: string): string {
    return `auth:refresh_token:${clientId}:${userId}`;
  }
}