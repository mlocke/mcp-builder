module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    jest: true,
    es2022: true
  },
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Financial-specific rules
    '@typescript-eslint/no-magic-numbers': ['warn', { 
      ignoreArrayIndexes: true,
      ignoreDefaultValues: true,
      ignoreNumericLiteralTypes: true,
      ignore: [0, 1, -1, 100, 1000] // Common financial constants
    }],
    
    // Security rules for financial data
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    
    // API security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // Data validation
    '@typescript-eslint/strict-boolean-expressions': 'warn'
  }
};