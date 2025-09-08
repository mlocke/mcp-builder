#!/usr/bin/env node

/**
 * Basic MCP Server Template
 * 
 * This is a minimal MCP server implementation that demonstrates:
 * - Basic server setup and configuration
 * - Tool registration and handling
 * - JSON-RPC communication
 * - Error handling and logging
 */

import { MCPServer } from './server';
import { createLogger } from '@mcp-builder/shared';

async function main(): Promise<void> {
  const logger = createLogger({
    level: process.env.LOG_LEVEL === 'debug' ? 'debug' : 'info',
    format: 'simple'
  });

  const server = new MCPServer({
    name: 'basic-mcp-server',
    version: '1.0.0',
    description: 'A basic MCP server template',
    capabilities: {
      tools: {
        listChanged: true
      }
    },
    transport: {
      type: 'stdio'
    },
    logging: {
      level: 'info',
      format: 'simple'
    }
  }, logger);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
    logger.info('MCP Server started successfully');
  } catch (error) {
    logger.error('Failed to start MCP Server:', error);
    process.exit(1);
  }
}

// Only run if this file is being executed directly
if (require.main === module) {
  main().catch(console.error);
}