/**
 * OAuth 2.1 Client Implementation with PKCE support
 */

import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import {
  OAuthConfig,
  AccessToken,
  PKCE,
  AuthorizationRequest,
  TokenRequest,
  OAuthError,
  AccessTokenSchema,
  PKCESchema,
  AuthorizationRequestSchema,
  TokenRequestSchema,
  OAuthErrorSchema,
} from '../types/auth.js';
import { Logger } from '../utils/logger.js';

export class OAuthClient {
  private readonly config: OAuthConfig;
  private readonly logger: Logger;
  private readonly httpClient: AxiosInstance;

  constructor(config: OAuthConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'financial-data-server/1.0.0',
      },
    });
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  public generatePKCE(): PKCE {
    // Generate code verifier (43-128 characters)
    const codeVerifier = this.base64URLEncode(crypto.randomBytes(32));
    
    // Generate code challenge using S256 method
    const codeChallenge = this.base64URLEncode(
      crypto.createHash('sha256').update(codeVerifier).digest()
    );
    
    // Generate state parameter
    const state = this.base64URLEncode(crypto.randomBytes(16));

    const pkce = {
      code_verifier: codeVerifier,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256' as const,
      state,
    };

    return PKCESchema.parse(pkce);
  }

  /**
   * Generate authorization URL with PKCE
   */
  public generateAuthorizationUrl(pkce: PKCE): string {
    const authRequest: AuthorizationRequest = {
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: pkce.state,
      code_challenge: pkce.code_challenge,
      code_challenge_method: pkce.code_challenge_method,
    };

    const validatedRequest = AuthorizationRequestSchema.parse(authRequest);
    
    const authEndpoint = this.config.authorizationEndpoint || 
      `${this.config.issuerUrl}/oauth2/authorize`;
    
    const params = new URLSearchParams(validatedRequest as Record<string, string>);
    const url = `${authEndpoint}?${params.toString()}`;
    
    this.logger.debug('Generated authorization URL', { 
      endpoint: authEndpoint,
      clientId: this.config.clientId,
      state: pkce.state 
    });
    
    return url;
  }

  /**
   * Exchange authorization code for access token
   */
  public async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    state: string
  ): Promise<AccessToken> {
    const tokenEndpoint = this.config.tokenEndpoint || 
      `${this.config.issuerUrl}/oauth2/token`;

    const tokenRequest: TokenRequest = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      code_verifier: codeVerifier,
    };

    const validatedRequest = TokenRequestSchema.parse(tokenRequest);

    try {
      this.logger.debug('Exchanging authorization code for token', {
        endpoint: tokenEndpoint,
        clientId: this.config.clientId,
        state,
      });

      const response = await this.httpClient.post(
        tokenEndpoint,
        new URLSearchParams(validatedRequest as Record<string, string>),
        {
          auth: {
            username: this.config.clientId,
            password: this.config.clientSecret,
          },
        }
      );

      const tokenData = AccessTokenSchema.parse(response.data);
      
      this.logger.info('Successfully exchanged code for token', {
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
        hasRefreshToken: !!tokenData.refresh_token,
      });

      return tokenData;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const oauthError = this.parseOAuthError(error.response.data);
        this.logger.error('OAuth token exchange failed', { error: oauthError });
        throw new Error(`OAuth error: ${oauthError.error} - ${oauthError.error_description || 'Unknown error'}`);
      }
      
      this.logger.error('Token exchange request failed', { error });
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshToken(refreshToken: string): Promise<AccessToken> {
    const tokenEndpoint = this.config.tokenEndpoint || 
      `${this.config.issuerUrl}/oauth2/token`;

    const tokenRequest: TokenRequest = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
    };

    const validatedRequest = TokenRequestSchema.parse(tokenRequest);

    try {
      this.logger.debug('Refreshing access token', {
        endpoint: tokenEndpoint,
        clientId: this.config.clientId,
      });

      const response = await this.httpClient.post(
        tokenEndpoint,
        new URLSearchParams(validatedRequest as Record<string, string>),
        {
          auth: {
            username: this.config.clientId,
            password: this.config.clientSecret,
          },
        }
      );

      const tokenData = AccessTokenSchema.parse(response.data);
      
      this.logger.info('Successfully refreshed token', {
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
        hasRefreshToken: !!tokenData.refresh_token,
      });

      return tokenData;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const oauthError = this.parseOAuthError(error.response.data);
        this.logger.error('OAuth token refresh failed', { error: oauthError });
        throw new Error(`OAuth error: ${oauthError.error} - ${oauthError.error_description || 'Unknown error'}`);
      }
      
      this.logger.error('Token refresh request failed', { error });
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Revoke access or refresh token
   */
  public async revokeToken(token: string, tokenTypeHint?: 'access_token' | 'refresh_token'): Promise<void> {
    const revokeEndpoint = `${this.config.issuerUrl}/oauth2/revoke`;
    
    const params = new URLSearchParams({
      token,
      client_id: this.config.clientId,
      ...(tokenTypeHint && { token_type_hint: tokenTypeHint }),
    });

    try {
      this.logger.debug('Revoking token', {
        endpoint: revokeEndpoint,
        tokenTypeHint,
      });

      await this.httpClient.post(revokeEndpoint, params, {
        auth: {
          username: this.config.clientId,
          password: this.config.clientSecret,
        },
      });

      this.logger.info('Successfully revoked token', { tokenTypeHint });
    } catch (error) {
      this.logger.error('Token revocation failed', { error });
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * Get user information from userinfo endpoint
   */
  public async getUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    const userinfoEndpoint = this.config.userinfoEndpoint || 
      `${this.config.issuerUrl}/oauth2/userinfo`;

    try {
      this.logger.debug('Fetching user info', { endpoint: userinfoEndpoint });

      const response = await this.httpClient.get(userinfoEndpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      this.logger.debug('Successfully fetched user info');
      return response.data as Record<string, unknown>;
    } catch (error) {
      this.logger.error('Failed to fetch user info', { error });
      throw new Error('Failed to fetch user information');
    }
  }

  /**
   * Base64 URL encode (RFC 4648)
   */
  private base64URLEncode(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Parse OAuth error response
   */
  private parseOAuthError(errorData: unknown): OAuthError {
    try {
      return OAuthErrorSchema.parse(errorData);
    } catch {
      return {
        error: 'server_error',
        error_description: 'Unknown OAuth error occurred',
      };
    }
  }
}