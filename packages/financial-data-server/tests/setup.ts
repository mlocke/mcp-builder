/**
 * Jest Test Setup and Global Configuration
 */

import { config } from 'dotenv';
import { GlobalErrorHandler } from '../src/utils/errors';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Mock Redis for tests
jest.mock('redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  })),
}));

// Mock axios for HTTP requests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  isAxiosError: jest.fn(),
}));

// Global test timeout
jest.setTimeout(10000);

// Setup global error handling
GlobalErrorHandler.getInstance();

// Suppress console output during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Global test utilities
global.testUtils = {
  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock timestamp
  mockDate: (date: string | Date) => {
    const mockDate = new Date(date);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    return mockDate;
  },
  
  // Restore Date
  restoreDate: () => {
    (global.Date as any).mockRestore();
  },
  
  // Generate test JWT token
  generateTestToken: () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      sub: 'test-user-123',
      iss: 'http://localhost:8080/auth',
      aud: 'financial-data-server',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      iat: Math.floor(Date.now() / 1000),
      scope: 'read:financial-data',
      email: 'test@example.com',
      name: 'Test User',
    })).toString('base64');
    const signature = 'test-signature';
    
    return `${header}.${payload}.${signature}`;
  },
  
  // Generate test stock data
  generateTestStockData: (symbol: string = 'AAPL') => ({
    symbol,
    price: 150.25,
    currency: 'USD',
    timestamp: new Date().toISOString(),
    open: 149.50,
    high: 151.00,
    low: 148.75,
    close: 150.25,
    volume: 1000000,
    change: 0.75,
    changePercent: 0.5,
  }),
  
  // Generate test company data
  generateTestCompanyData: (symbol: string = 'AAPL') => ({
    symbol,
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    marketCap: 3000000000000,
    employees: 150000,
    description: 'Technology company',
    website: 'https://www.apple.com',
    ceo: 'Tim Cook',
    founded: 1976,
    country: 'United States',
    address: 'Cupertino, CA',
    phone: '+1-408-996-1010',
  }),
};

// Custom Jest matchers
expect.extend({
  toBeValidISODate(received: string) {
    const pass = !isNaN(Date.parse(received)) && received.includes('T') && received.includes('Z');
    return {
      message: () => `expected ${received} to be a valid ISO date string`,
      pass,
    };
  },
  
  toBeFinancialNumber(received: number) {
    const pass = typeof received === 'number' && !isNaN(received) && isFinite(received);
    return {
      message: () => `expected ${received} to be a valid financial number`,
      pass,
    };
  },
  
  toHaveRequiredStockFields(received: any) {
    const requiredFields = ['symbol', 'price', 'currency', 'timestamp'];
    const missingFields = requiredFields.filter(field => !(field in received));
    const pass = missingFields.length === 0;
    
    return {
      message: () => `expected object to have required stock fields: ${requiredFields.join(', ')}. Missing: ${missingFields.join(', ')}`,
      pass,
    };
  },
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidISODate(): R;
      toBeFinancialNumber(): R;
      toHaveRequiredStockFields(): R;
    }
  }
  
  var testUtils: {
    wait: (ms: number) => Promise<void>;
    mockDate: (date: string | Date) => Date;
    restoreDate: () => void;
    generateTestToken: () => string;
    generateTestStockData: (symbol?: string) => any;
    generateTestCompanyData: (symbol?: string) => any;
  };
}

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  testUtils.restoreDate();
});

// Cleanup after all tests
afterAll(async () => {
  // Clean up any persistent connections
  jest.clearAllMocks();
  jest.restoreAllMocks();
});