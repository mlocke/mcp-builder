/**
 * Jest setup file for MCP server tests
 */

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
});

// Global test cleanup
afterAll(() => {
  // Clean up any resources
});

// Suppress console.log during tests unless debugging
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: process.env.DEBUG_TESTS ? originalConsole.log : jest.fn(),
  debug: process.env.DEBUG_TESTS ? originalConsole.debug : jest.fn(),
  info: process.env.DEBUG_TESTS ? originalConsole.info : jest.fn(),
  warn: originalConsole.warn,
  error: originalConsole.error
};