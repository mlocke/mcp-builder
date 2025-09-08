/**
 * Shared TypeScript types for MCP server development
 */

// MCP Protocol Types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

// MCP Server Configuration
export interface MCPServerConfig {
  name: string;
  version: string;
  description?: string;
  capabilities: MCPCapabilities;
  transport?: TransportConfig;
  logging?: LoggingConfig;
}

export interface MCPCapabilities {
  tools?: ToolCapabilities;
  resources?: ResourceCapabilities;
  prompts?: PromptCapabilities;
}

export interface ToolCapabilities {
  listChanged?: boolean;
}

export interface ResourceCapabilities {
  subscribe?: boolean;
  listChanged?: boolean;
}

export interface PromptCapabilities {
  listChanged?: boolean;
}

// Transport Configuration
export interface TransportConfig {
  type: 'stdio' | 'http' | 'websocket';
  options?: Record<string, unknown>;
}

// Logging Configuration
export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format?: 'json' | 'simple';
  file?: string;
}

// Tool Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCallRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface ToolCallResult {
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// Resource Types
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

// Prompt Types
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text' | 'image';
    text?: string;
    data?: string;
    mimeType?: string;
  };
}

// Common Utility Types
export type Awaitable<T> = T | Promise<T>;

export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonValue[] 
  | { [key: string]: JsonValue };

export interface Logger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}