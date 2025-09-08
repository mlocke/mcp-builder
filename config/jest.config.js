module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/tools', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx}',
    'tools/**/*.{ts,tsx}',
    '!packages/**/node_modules/**',
    '!packages/**/dist/**',
    '!packages/**/*.d.ts',
    '!packages/**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@tools/(.*)$': '<rootDir>/tools/$1/src',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  testTimeout: 10000,
  maxWorkers: '50%',
  verbose: true
};