# Claude Code Configuration for MCP Builder

This file contains project-specific configuration for Claude Code to enhance development productivity and maintain consistency across the MCP Builder repository.

## Project Commands

### Development Commands
- `npm run create-server <name>` - Generate a new MCP server from template
- `npm run build` - Build all packages in the monorepo
- `npm run test` - Run all tests across packages
- `npm run test:coverage` - Run tests with coverage reporting
- `npm run lint` - Lint all TypeScript files
- `npm run type-check` - Run TypeScript type checking
- `npm run dev` - Start development mode with file watching

### Package-Specific Commands
- `npm run test:package <package-name>` - Test specific package
- `npm run build:package <package-name>` - Build specific package
- `npm run dev:package <package-name>` - Dev mode for specific package

### Setup and Maintenance
- `./scripts/setup.sh` - Initial repository setup
- `npm run clean` - Clean build artifacts and node_modules
- `npm run reset` - Reset and reinstall all dependencies

## Project Structure

### Key Directories
- `packages/shared/` - Common utilities, types, and shared code
- `packages/template-basic/` - Basic MCP server template
- `packages/template-advanced/` - Advanced MCP server template with auth
- `packages/examples/` - Example server implementations
- `tools/` - Development tools and generators
- `tests/` - Global testing infrastructure
- `config/` - Shared configuration files
- `scripts/` - Automation scripts
- `docs/` - Project documentation

### Important Files
- `lerna.json` - Monorepo configuration
- `tsconfig.json` - TypeScript configuration with path mapping
- `package.json` - Root package with workspace configuration
- `.github/workflows/ci.yml` - CI/CD pipeline

## Development Guidelines

### MCP Server Development
1. Always use the shared utilities from `@mcp-builder/shared`
2. Follow the established patterns in the templates
3. Include comprehensive tests for all tools and resources
4. Document all public APIs and configuration options
5. Validate all inputs using the shared validation utilities

### Code Quality Standards
- TypeScript strict mode is enabled
- ESLint configuration enforces consistent style
- All public functions must have JSDoc comments
- Test coverage target is 80%+
- All MCP protocol interactions must be properly typed

### Testing Requirements
- Unit tests for all utilities and business logic
- Integration tests for MCP server functionality
- End-to-end tests for complete server workflows
- Mock external dependencies in tests
- Use the shared testing utilities from `@mcp-builder/shared`

## MCP Protocol Implementation

### Core Components
- **Resources**: Use `McpResource` type from shared package
- **Tools**: Use `McpTool` type with proper validation
- **Prompts**: Use `McpPrompt` type for templated messages
- **JSON-RPC**: Use shared JSON-RPC utilities for protocol compliance

### Authentication Patterns
- Implement OAuth2 resource server patterns for secure servers
- Use environment variables for sensitive configuration
- Validate all authorization tokens properly
- Implement proper consent flows for resource access

### Error Handling
- Use structured error responses following MCP specification
- Log errors appropriately for debugging
- Provide helpful error messages to clients
- Handle network failures gracefully

## Build and Deployment

### Local Development
1. Run `./scripts/setup.sh` for initial setup
2. Use `npm run dev` for development with hot reloading
3. Test changes with `npm test` before committing
4. Use `npm run build` to verify production builds

### CI/CD Pipeline
- Automated testing on pull requests
- Type checking and linting enforcement
- Security scanning of dependencies
- Automated publishing to npm registry
- Docker image building and publishing

### Docker Deployment
- Each template includes optimized Dockerfile
- Multi-stage builds for minimal production images
- Health checks and proper signal handling
- Environment-based configuration

## Environment Configuration

### Development Environment
```bash
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000
```

### Testing Environment
```bash
NODE_ENV=test
LOG_LEVEL=error
```

### Production Environment
```bash
NODE_ENV=production
LOG_LEVEL=info
PORT=8080
API_TIMEOUT=30000
```

## Common Tasks

### Creating a New MCP Server
1. Use the CLI: `npm run create-server my-server`
2. Or copy template: `cp -r packages/template-basic packages/my-server`
3. Update package.json with new name and description
4. Customize server.ts with your tools and resources
5. Add tests in the `tests/` directory
6. Update documentation

### Adding New Shared Utilities
1. Add code to `packages/shared/src/`
2. Export from appropriate index.ts files
3. Add unit tests
4. Update shared package version
5. Update dependent packages

### Debugging MCP Servers
1. Enable debug logging: `LOG_LEVEL=debug`
2. Use the MCP inspector tools
3. Check JSON-RPC message format
4. Validate against MCP specification
5. Test with official MCP clients

## Security Considerations

### Input Validation
- Validate all tool parameters using Zod schemas
- Sanitize file paths and prevent directory traversal
- Validate resource identifiers properly
- Implement rate limiting for expensive operations

### Authentication & Authorization
- Never log sensitive authentication tokens
- Use environment variables for API keys
- Implement proper RBAC for multi-tenant servers
- Validate permissions before resource access

### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all network communication
- Implement proper session management
- Follow GDPR/privacy requirements for user data

## Troubleshooting

### Common Issues
- **MCP client connection failures**: Check JSON-RPC message format
- **Type errors**: Ensure shared types are properly imported
- **Build failures**: Run `npm run clean` and reinstall dependencies
- **Test failures**: Check mock configurations and test environment

### Debug Commands
- `npm run type-check` - Verify TypeScript compilation
- `npm run lint -- --fix` - Fix linting issues automatically
- `npm test -- --verbose` - Run tests with detailed output
- `npm run build -- --verbose` - Build with detailed logging

This configuration ensures consistent development practices and helps maintain the high quality standards expected for MCP server development.