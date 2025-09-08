# Financial Data MCP Server

A production-ready Model Context Protocol (MCP) server for financial data access with OAuth 2.1 authentication, real-time market data, and comprehensive security features.

## 🚀 Features

- **OAuth 2.1 Authentication** with PKCE support
- **Real-time Financial Data** access via multiple providers
- **Comprehensive Rate Limiting** with Redis backend  
- **Type-safe TypeScript** implementation with strict validation
- **Production Security** with encryption, input sanitization, and audit logging
- **Comprehensive Testing** with 80%+ coverage target
- **Docker Support** with multi-stage builds
- **Monitoring & Logging** with structured JSON logging

## 📋 Supported Data Types

### Stock Market Data
- Real-time and historical stock prices
- Company information and profiles
- Financial statements (income, balance sheet, cash flow)
- SEC filings (10-K, 10-Q, 8-K)
- Earnings data and transcripts

### Data Providers
- **Alpha Vantage** (primary)
- **Yahoo Finance** (secondary)
- **Financial Modeling Prep** (optional)
- **IEX Cloud** (optional)

## 🔧 Installation

### Prerequisites
- Node.js 18+
- Redis server
- Docker (optional)

### Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Redis server:**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:7-alpine
   
   # Or using local Redis
   redis-server
   ```

4. **Run the server:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm run build
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

#### Application Settings
```bash
NODE_ENV=development          # Environment: development, production, test
LOG_LEVEL=debug              # Logging level: error, warn, info, debug
PORT=3000                    # Server port
SERVER_NAME=financial-data-server
SERVER_VERSION=1.0.0
```

#### OAuth 2.1 Configuration
```bash
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_ISSUER_URL=https://your-oauth-provider.com
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
OAUTH_SCOPES=read:financial-data
```

#### Data Provider APIs
```bash
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
ALPHA_VANTAGE_BASE_URL=https://www.alphavantage.co/query

# Optional providers
YAHOO_FINANCE_API_KEY=your-yahoo-finance-key
FINANCIAL_MODELING_PREP_API_KEY=your-fmp-key
IEX_CLOUD_API_KEY=your-iex-cloud-key
```

#### Redis Configuration
```bash
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
```

#### Security Configuration
```bash
JWT_SECRET=your-jwt-secret-key-32-characters-minimum
ENCRYPTION_KEY=your-encryption-key-exactly-32-chars
```

### Docker Deployment

1. **Using Docker Compose (recommended):**
   ```bash
   docker-compose up -d
   ```

2. **Manual Docker build:**
   ```bash
   docker build -t financial-data-server .
   docker run -p 3000:3000 --env-file .env financial-data-server
   ```

## 🔐 Authentication

### OAuth 2.1 Flow

1. **Authorization Request:**
   ```
   GET /auth/authorize?response_type=code&client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&scope=read:financial-data&state=STATE&code_challenge=CHALLENGE&code_challenge_method=S256
   ```

2. **Token Exchange:**
   ```bash
   POST /auth/token
   Content-Type: application/x-www-form-urlencoded
   
   grant_type=authorization_code&code=AUTH_CODE&redirect_uri=REDIRECT_URI&client_id=CLIENT_ID&code_verifier=VERIFIER
   ```

3. **Using Access Token:**
   ```bash
   Authorization: Bearer YOUR_ACCESS_TOKEN
   ```

### Scopes

- `read:stock-prices` - Access to stock price data
- `read:company-info` - Access to company information
- `read:financials` - Access to financial statements
- `read:sec-filings` - Access to SEC filings
- `read:earnings` - Access to earnings data
- `read:financial-data` - Access to all financial data (read permissions)
- `admin:financial-data` - Full administrative access

## 🛠️ MCP Tools

### getPriceSnapshot
Get current or historical stock prices.

```json
{
  \"name\": \"getPriceSnapshot\",
  \"arguments\": {
    \"symbols\": [\"AAPL\", \"GOOGL\", \"MSFT\"],
    \"includeExtendedHours\": true,
    \"includePreviousClose\": true
  }
}
```

### getCompanyInfo
Retrieve comprehensive company information.

```json
{
  \"name\": \"getCompanyInfo\",
  \"arguments\": {
    \"symbol\": \"AAPL\"
  }
}
```

### getFinancials
Access financial statements and key metrics.

```json
{
  \"name\": \"getFinancials\",
  \"arguments\": {
    \"symbol\": \"AAPL\",
    \"period\": \"quarterly\",
    \"limit\": 4
  }
}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.test.ts
```

### Test Structure

- `tests/setup.ts` - Global test configuration
- `tests/__tests__/` - Unit and integration tests
- `src/**/__tests__/` - Component-specific tests

### Test Coverage

- **Target:** 80%+ coverage across all metrics
- **Branches:** 80%+
- **Functions:** 80%+
- **Lines:** 80%+
- **Statements:** 80%+

## 📊 Rate Limiting

### Default Limits

- **Global:** 1000 requests per minute
- **Per User:** 500 requests per minute
- **Per Endpoint:** Varies by endpoint complexity

### User Tiers

- **Free:** 50 requests per minute
- **Premium:** 250 requests per minute  
- **Enterprise:** 1000 requests per minute

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
X-RateLimit-RetryAfter: 60
```

## 📈 Monitoring

### Health Check
```bash
GET /health
```

### Metrics Endpoint
```bash
GET /metrics
```

### Logging

Structured JSON logging with the following levels:
- `error` - Error conditions
- `warn` - Warning conditions
- `info` - Informational messages
- `debug` - Debug information

## 🔒 Security Features

### Input Validation
- Zod schema validation for all inputs
- SQL injection prevention
- XSS protection
- Path traversal prevention

### Authentication & Authorization
- OAuth 2.1 with PKCE
- JWT token validation
- Scope-based access control
- Token refresh mechanism

### Data Protection
- Encryption at rest for sensitive data
- TLS 1.3 for data in transit
- Secure token storage in Redis
- PII data redaction in logs

### Security Headers
- Content Security Policy
- Strict Transport Security
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection

## 🚀 Performance

### Caching Strategy
- Redis-based caching with TTL
- Cache warming for popular data
- Intelligent cache invalidation
- Memory-efficient storage

### Optimization Features
- Connection pooling
- Request batching
- Response compression
- Lazy loading

## 🐛 Troubleshooting

### Common Issues

#### Authentication Failures
```bash
# Check token validity
curl -H \"Authorization: Bearer YOUR_TOKEN\" http://localhost:3000/health

# Check OAuth configuration
npm run debug:auth
```

#### Rate Limit Errors
```bash
# Check current rate limit status
curl -H \"Authorization: Bearer YOUR_TOKEN\" http://localhost:3000/rate-limit/status

# Reset rate limits (admin only)
curl -X POST -H \"Authorization: Bearer ADMIN_TOKEN\" http://localhost:3000/admin/rate-limit/reset
```

#### Data Provider Issues
```bash
# Test provider connectivity
npm run debug:providers

# Check provider health
curl http://localhost:3000/providers/health
```

### Debug Commands
```bash
# Enable debug logging
DEBUG=financial-data-server:* npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📚 API Documentation

Comprehensive API documentation is available at:
- Development: http://localhost:3000/docs
- Production: https://your-domain.com/docs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Run linting: `npm run lint`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues:** Report bugs and request features on GitHub Issues
- **Documentation:** Check the `docs/` directory for detailed guides
- **Security:** Report security issues to security@example.com

## 🔗 Related Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Alpha Vantage API](https://www.alphavantage.co/documentation/)
- [OAuth 2.1 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Financial Data Standards](https://www.fixtrading.org/)

---

**Built with ❤️ for the MCP ecosystem**