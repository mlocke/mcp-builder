#!/bin/bash

# MCP Server Repository Setup Script
set -e

echo "🚀 Setting up MCP Server Development Environment..."

# Check Node.js version
node_version=$(node -v | cut -d 'v' -f 2)
required_version="18.0.0"

if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Node.js version $node_version is too old. Please install Node.js >= $required_version"
    exit 1
fi

echo "✅ Node.js version: $node_version"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Bootstrap Lerna packages
echo "🔗 Bootstrapping Lerna packages..."
npx lerna bootstrap

# Build shared package first
echo "🏗️  Building shared packages..."
cd packages/shared && npm run build && cd ../..

# Run initial linting
echo "🔍 Running linting..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm run test

# Create initial git hooks (if using husky)
if command -v husky &> /dev/null; then
    echo "🪝 Setting up Git hooks..."
    npx husky install
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "  • Create your first MCP server: npm run create-server <name>"
echo "  • Start development: npm run dev"
echo "  • View documentation: open docs/README.md"
echo ""