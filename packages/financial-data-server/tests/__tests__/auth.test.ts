/**
 * Authentication Tests
 */

import { AuthMiddleware } from '../../src/middleware/auth-middleware';
import { Logger } from '../../src/utils/logger';
import { AuthenticationError } from '../../src/utils/errors';

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      child: jest.fn().mockReturnThis(),
    } as any;

    authMiddleware = new AuthMiddleware(mockLogger);
  });

  describe('authenticate', () => {
    it('should successfully authenticate with valid bearer token', async () => {
      const testToken = testUtils.generateTestToken();
      const request = {
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      };

      // Mock JWT verification
      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        sub: 'test-user-123',
        iss: 'http://localhost:8080/auth',
        aud: 'financial-data-server',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        scope: 'read:financial-data',
        email: 'test@example.com',
        name: 'Test User',
      });

      const result = await authMiddleware.authenticate(request);

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context?.userId).toBe('test-user-123');
      expect(result.context?.scopes).toContain('read:financial-data');
    });

    it('should fail authentication with missing authorization header', async () => {
      const request = {
        headers: {},
      };

      const result = await authMiddleware.authenticate(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing or invalid Authorization header');
    });

    it('should fail authentication with invalid token format', async () => {
      const request = {
        headers: {
          authorization: 'InvalidToken',
        },
      };

      const result = await authMiddleware.authenticate(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing or invalid Authorization header');
    });

    it('should fail authentication with expired token', async () => {
      const testToken = testUtils.generateTestToken();
      const request = {
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      };

      // Mock JWT verification to throw expired error
      jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => {
        const error = new Error('Token has expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const result = await authMiddleware.authenticate(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token has expired');
    });
  });

  describe('authorize', () => {
    const mockAuthContext = {
      userId: 'test-user-123',
      scopes: ['read:stock-prices', 'read:company-info'],
      tokenType: 'Bearer',
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      clientId: 'test-client',
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should authorize user with required scopes', () => {
      const result = authMiddleware.authorize(mockAuthContext, ['read:stock-prices']);

      expect(result).toBe(true);
    });

    it('should deny user without required scopes', () => {
      const result = authMiddleware.authorize(mockAuthContext, ['read:sec-filings']);

      expect(result).toBe(false);
    });

    it('should authorize admin user for all scopes', () => {
      const adminContext = {
        ...mockAuthContext,
        scopes: ['admin:financial-data'],
      };

      const result = authMiddleware.authorize(adminContext, ['read:sec-filings', 'read:earnings']);

      expect(result).toBe(true);
    });

    it('should authorize user with global read scope for all read permissions', () => {
      const globalReadContext = {
        ...mockAuthContext,
        scopes: ['read:financial-data'],
      };

      const result = authMiddleware.authorize(globalReadContext, ['read:stock-prices', 'read:company-info']);

      expect(result).toBe(true);
    });

    it('should deny user with global read scope for non-read permissions', () => {
      const globalReadContext = {
        ...mockAuthContext,
        scopes: ['read:financial-data'],
      };

      const result = authMiddleware.authorize(globalReadContext, ['write:financial-data' as any]);

      expect(result).toBe(false);
    });
  });

  describe('createMiddleware', () => {
    it('should create middleware that allows request with valid auth', async () => {
      const testToken = testUtils.generateTestToken();
      const request = {
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      };

      // Mock JWT verification
      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        sub: 'test-user-123',
        iss: 'http://localhost:8080/auth',
        aud: 'financial-data-server',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        scope: 'read:financial-data',
        email: 'test@example.com',
        name: 'Test User',
      });

      const middleware = authMiddleware.createMiddleware({
        required: true,
        scopes: ['read:financial-data'],
      });

      const result = await middleware(request);

      expect(result.authorized).toBe(true);
      expect(result.context).toBeDefined();
    });

    it('should create middleware that denies request without auth when required', async () => {
      const request = {
        headers: {},
      };

      const middleware = authMiddleware.createMiddleware({
        required: true,
      });

      const result = await middleware(request);

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Missing or invalid Authorization header');
    });

    it('should create middleware that allows request without auth when not required', async () => {
      const request = {
        headers: {},
      };

      const middleware = authMiddleware.createMiddleware({
        required: false,
      });

      const result = await middleware(request);

      expect(result.authorized).toBe(true);
    });

    it('should create middleware that denies request with insufficient scopes', async () => {
      const testToken = testUtils.generateTestToken();
      const request = {
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      };

      // Mock JWT verification with limited scopes
      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        sub: 'test-user-123',
        iss: 'http://localhost:8080/auth',
        aud: 'financial-data-server',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        scope: 'read:stock-prices',
        email: 'test@example.com',
        name: 'Test User',
      });

      const middleware = authMiddleware.createMiddleware({
        required: true,
        scopes: ['read:sec-filings'],
        validateScopes: true,
      });

      const result = await middleware(request);

      expect(result.authorized).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });
  });

  describe('token lifetime utilities', () => {
    const mockAuthContext = {
      userId: 'test-user-123',
      scopes: ['read:financial-data'],
      tokenType: 'Bearer',
      issuedAt: Math.floor(Date.now() / 1000) - 1800, // 30 minutes ago
      expiresAt: Math.floor(Date.now() / 1000) + 1800, // 30 minutes from now
      clientId: 'test-client',
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should calculate correct token lifetime', () => {
      const lifetime = authMiddleware.getTokenLifetime(mockAuthContext);

      expect(lifetime).toBeCloseTo(1800, -1); // Approximately 30 minutes
    });

    it('should return 0 for expired token', () => {
      const expiredContext = {
        ...mockAuthContext,
        expiresAt: Math.floor(Date.now() / 1000) - 100,
      };

      const lifetime = authMiddleware.getTokenLifetime(expiredContext);

      expect(lifetime).toBe(0);
    });

    it('should indicate token needs refresh when close to expiry', () => {
      const soonToExpireContext = {
        ...mockAuthContext,
        expiresAt: Math.floor(Date.now() / 1000) + 200, // 200 seconds from now
      };

      const shouldRefresh = authMiddleware.shouldRefreshToken(soonToExpireContext, 300);

      expect(shouldRefresh).toBe(true);
    });

    it('should indicate token does not need refresh when not close to expiry', () => {
      const shouldRefresh = authMiddleware.shouldRefreshToken(mockAuthContext, 300);

      expect(shouldRefresh).toBe(false);
    });
  });
});