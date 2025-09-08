/**
 * Testing utilities for MCP server development
 */

import { MCPRequest, MCPResponse, MCPTool, Logger } from '../types';

export class MockLogger implements Logger {
  public logs: Array<{ level: string; message: string; args: unknown[] }> = [];

  error(message: string, ...args: unknown[]): void {
    this.logs.push({ level: 'error', message, args });
  }

  warn(message: string, ...args: unknown[]): void {
    this.logs.push({ level: 'warn', message, args });
  }

  info(message: string, ...args: unknown[]): void {
    this.logs.push({ level: 'info', message, args });
  }

  debug(message: string, ...args: unknown[]): void {
    this.logs.push({ level: 'debug', message, args });
  }

  clear(): void {
    this.logs = [];
  }

  getLogsByLevel(level: string): Array<{ message: string; args: unknown[] }> {
    return this.logs
      .filter(log => log.level === level)
      .map(log => ({ message: log.message, args: log.args }));
  }
}

export class MCPTestClient {
  private requestId = 0;

  generateId(): number {
    return ++this.requestId;
  }

  createRequest(method: string, params?: Record<string, unknown>): MCPRequest {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.generateId(),
      method,
      params: params ?? {}
    };
    return request;
  }

  createToolCallRequest(toolName: string, args?: Record<string, unknown>): MCPRequest {
    return this.createRequest('tools/call', {
      name: toolName,
      arguments: args
    });
  }

  createListToolsRequest(): MCPRequest {
    return this.createRequest('tools/list');
  }

  createListResourcesRequest(): MCPRequest {
    return this.createRequest('resources/list');
  }

  createReadResourceRequest(uri: string): MCPRequest {
    return this.createRequest('resources/read', { uri });
  }
}

export function createMockTool(name: string, description = 'Mock tool'): MCPTool {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  };
}

export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

export function expectValidMCPResponse(response: unknown): asserts response is MCPResponse {
  if (typeof response !== 'object' || response === null) {
    throw new Error('Response is not an object');
  }

  const r = response as Record<string, unknown>;

  if (r.jsonrpc !== '2.0') {
    throw new Error('Invalid jsonrpc version');
  }

  if (typeof r.id !== 'string' && typeof r.id !== 'number') {
    throw new Error('Invalid id');
  }

  if (!('result' in r) && !('error' in r)) {
    throw new Error('Response must have either result or error');
  }
}

export class TestFixtures {
  static readonly SAMPLE_TOOLS: MCPTool[] = [
    createMockTool('test-tool-1', 'First test tool'),
    createMockTool('test-tool-2', 'Second test tool')
  ];

  static readonly SAMPLE_REQUEST: MCPRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'test/method',
    params: { test: 'value' }
  };

  static readonly SAMPLE_RESPONSE: MCPResponse = {
    jsonrpc: '2.0',
    id: 1,
    result: { success: true }
  };
}