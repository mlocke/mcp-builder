# MCP Server Builder

A comprehensive toolkit for building, testing, and deploying Model Context Protocol (MCP) servers with best practices and modern development workflows.

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd mcp-builder

# Setup the development environment
chmod +x scripts/setup.sh
./scripts/setup.sh

# Create your first MCP server
npm run create-server my-first-server
```

## 📋 What is MCP?

The Model Context Protocol (MCP) is an open standard introduced by Anthropic that provides a standardized way to connect AI assistants to data sources and tools. MCP servers can provide:

- **Resources**: File-like data sources
- **Tools**: Executable functions that the AI can call
- **Prompts**: Templated messages for AI interactions

## 🏗️ Repository Structure

This monorepo contains everything you need to build production-ready MCP servers:

```
mcp-builder/
├── packages/
│   ├── shared/              # Shared utilities, types, and common code
│   ├── template-basic/      # Basic MCP server template
│   ├── template-advanced/   # Advanced MCP server template
│   └── examples/           # Example server implementations
├── tools/                  # Development tools and generators
├── tests/                 # Global testing infrastructure
├── config/                # Shared configuration files
├── scripts/               # Build and deployment scripts
├── docs/                  # Documentation
└── .github/workflows/     # CI/CD pipelines
```

## 📦 Packages

### Core Packages

- **`@mcp-builder/shared`** - Common utilities, types, and helper functions
- **`@mcp-builder/template-basic`** - Minimal MCP server template
- **`@mcp-builder/template-advanced`** - Feature-rich MCP server template with auth

### Templates

Each template provides a complete, working MCP server that you can customize:

- **Basic Template**: Simple server with resource and tool examples
- **Advanced Template**: Production-ready server with authentication, validation, and advanced features

## 🛠️ Development Tools

- **Server Generator**: CLI tool to create new MCP servers from templates
- **Validation Tools**: Schema validation and protocol compliance checking
- **Testing Infrastructure**: Comprehensive test setup with fixtures and helpers
- **Build Scripts**: Automated building, testing, and deployment

## 📖 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- TypeScript knowledge

### Creating a New MCP Server

1. **Use the CLI generator** (recommended):
   ```bash
   npm run create-server my-server-name
   ```

2. **Or copy a template manually**:
   ```bash
   cp -r packages/template-basic packages/my-server
   cd packages/my-server
   npm install
   ```

### Development Workflow

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development mode**:
   ```bash
   cd packages/your-server
   npm run dev
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## 🧪 Testing

The repository includes comprehensive testing infrastructure:

```bash
# Run all tests
npm test

# Run tests for a specific package
npm run test:package template-basic

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Docker Deployment

Each template includes Docker support:

```bash
# Build Docker image
docker build -t my-mcp-server .

# Run container
docker run -p 3000:3000 my-mcp-server
```

### NPM Package

Publish your MCP server as an npm package:

```bash
npm run build
npm publish
```

## 🔧 Configuration

### MCP Client Configuration

Add your server to your MCP client configuration:

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "command": "node",
        "args": ["/path/to/your/server/dist/index.js"],
        "env": {
          "API_KEY": "your-api-key"
        }
      }
    }
  }
}
```

### Environment Variables

Common environment variables used across templates:

```bash
# API Keys
API_KEY=your-api-key-here

# Database
DATABASE_URL=your-database-url

# Logging
LOG_LEVEL=info

# Authentication
AUTH_SECRET=your-secret-key
```

## 📚 Examples

Check out the `packages/examples/` directory for real-world MCP server implementations:

- **File System Server**: Provides file operations as MCP tools
- **Database Server**: SQL database access via MCP
- **API Proxy Server**: Proxy external APIs through MCP interface
- **Authentication Server**: User management and authentication

## 🔍 Best Practices

This repository follows MCP development best practices:

- **Security First**: Proper authentication and authorization patterns
- **Type Safety**: Full TypeScript support with comprehensive types
- **Testing**: Extensive test coverage with integration tests
- **Documentation**: Clear API documentation and usage examples  
- **Performance**: Optimized for production deployment
- **Standards Compliance**: Full MCP protocol compliance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` directory for detailed guides
- **Issues**: Report bugs and request features on GitHub Issues
- **Examples**: Browse the `packages/examples/` directory
- **Community**: Join the MCP community discussions

## 🔗 Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Anthropic MCP Documentation](https://modelcontextprotocol.io/)
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [MCP Community](https://github.com/modelcontextprotocol)

---

**Happy Building! 🛠️** Start creating powerful MCP servers that extend AI capabilities.