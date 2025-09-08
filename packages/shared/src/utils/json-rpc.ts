/**
 * JSON-RPC utilities for MCP protocol implementation
 */

import { MCPRequest, MCPResponse, MCPError, MCPNotification } from '../types';

export class JSONRPCError extends Error {
  public code: number;
  public data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'JSONRPCError';
    this.code = code;
    this.data = data;
  }
}

// Standard JSON-RPC error codes
export const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // MCP specific error codes
  MCP_TOOL_ERROR: -32000,
  MCP_RESOURCE_ERROR: -32001,
  MCP_PROMPT_ERROR: -32002
} as const;

export function createRequest(
  id: string | number,
  method: string,
  params?: Record<string, unknown>
): MCPRequest {
  const request: MCPRequest = {
    jsonrpc: '2.0',
    id,
    method
  };

  if (params !== undefined) {
    request.params = params;
  }

  return request;
}

export function createResponse(
  id: string | number,
  result?: unknown
): MCPResponse {
  return {
    jsonrpc: '2.0',
    id,
    result
  };
}

export function createErrorResponse(
  id: string | number,
  error: MCPError
): MCPResponse {
  return {
    jsonrpc: '2.0',
    id,
    error
  };
}

export function createNotification(
  method: string,
  params?: Record<string, unknown>
): MCPNotification {
  const notification: MCPNotification = {
    jsonrpc: '2.0',
    method
  };

  if (params !== undefined) {
    notification.params = params;
  }

  return notification;
}

export function isRequest(obj: unknown): obj is MCPRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'jsonrpc' in obj &&
    'id' in obj &&
    'method' in obj &&
    (obj as MCPRequest).jsonrpc === '2.0'
  );
}

export function isResponse(obj: unknown): obj is MCPResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'jsonrpc' in obj &&
    'id' in obj &&
    (obj as MCPResponse).jsonrpc === '2.0' &&
    ('result' in obj || 'error' in obj)
  );
}

export function isNotification(obj: unknown): obj is MCPNotification {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'jsonrpc' in obj &&
    'method' in obj &&
    !('id' in obj) &&
    (obj as MCPNotification).jsonrpc === '2.0'
  );
}