/**
 * Basic MCP Server Implementation
 */

import { EventEmitter } from 'events';
import {
  MCPServerConfig,
  MCPRequest,
  MCPResponse,
  MCPTool,
  ToolCallRequest,
  ToolCallResult,
  Logger,
  createResponse,
  createErrorResponse,
  ErrorCodes,
  isRequest,
  validateRequest,
  validateToolCall
} from '@mcp-builder/shared';

export class MCPServer extends EventEmitter {
  private config: MCPServerConfig;
  private logger: Logger;
  private tools = new Map<string, MCPTool>();
  private running = false;

  constructor(config: MCPServerConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    
    // Register default tools
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    // Echo tool - simple example
    this.registerTool({
      name: 'echo',
      description: 'Echoes back the provided text',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text to echo back'
          }
        },
        required: ['text']
      }
    }, this.handleEcho.bind(this));

    // Get server info tool
    this.registerTool({
      name: 'get_server_info',
      description: 'Returns information about this MCP server',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    }, this.handleGetServerInfo.bind(this));
  }

  public registerTool(tool: MCPTool, handler: (request: ToolCallRequest) => Promise<ToolCallResult>): void {
    this.tools.set(tool.name, tool);
    this.on(`tool:${tool.name}`, handler);
    this.logger.debug(`Registered tool: ${tool.name}`);
  }

  private async handleEcho(request: ToolCallRequest): Promise<ToolCallResult> {
    const text = request.arguments?.text as string;
    
    return {
      content: [{
        type: 'text',
        text: `Echo: ${text}`
      }]
    };
  }

  private async handleGetServerInfo(): Promise<ToolCallResult> {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          name: this.config.name,
          version: this.config.version,
          description: this.config.description,
          capabilities: this.config.capabilities,
          tools: Array.from(this.tools.keys())
        }, null, 2)
      }]
    };
  }

  public async start(): Promise<void> {
    if (this.running) {
      throw new Error('Server is already running');
    }

    this.logger.info(`Starting ${this.config.name} v${this.config.version}`);

    // Set up stdio transport
    if (this.config.transport?.type === 'stdio') {
      this.setupStdioTransport();
    } else {
      throw new Error(`Transport type ${this.config.transport?.type} not supported`);
    }

    this.running = true;
    this.emit('started');
  }

  public async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.logger.info('Stopping MCP server...');
    this.running = false;
    this.emit('stopped');
  }

  private setupStdioTransport(): void {
    let buffer = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => {
      buffer += chunk;
      
      const lines = buffer.split('\\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          this.handleMessage(line.trim()).catch(error => {
            this.logger.error('Error handling message:', error);
          });
        }
      }
    });

    process.stdin.on('end', () => {
      this.stop().catch(error => {
        this.logger.error('Error stopping server:', error);
      });
    });
  }

  private async handleMessage(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      
      if (!isRequest(data)) {
        this.logger.warn('Received invalid request:', data);
        return;
      }

      const request = validateRequest(data);
      const response = await this.processRequest(request);
      
      this.sendResponse(response);
    } catch (error) {
      this.logger.error('Error parsing message:', error);
      
      // Send error response if we can determine the request ID
      try {
        const data = JSON.parse(message);
        if (data.id) {
          const errorResponse = createErrorResponse(data.id, {
            code: ErrorCodes.PARSE_ERROR,
            message: 'Parse error'
          });
          this.sendResponse(errorResponse);
        }
      } catch {
        // Cannot recover
      }
    }
  }

  private async processRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);
          
        case 'tools/list':
          return this.handleListTools(request);
          
        case 'tools/call':
          return await this.handleToolCall(request);
          
        default:
          return createErrorResponse(request.id, {
            code: ErrorCodes.METHOD_NOT_FOUND,
            message: `Method '${request.method}' not found`
          });
      }
    } catch (error) {
      this.logger.error(`Error processing request ${request.method}:`, error);
      
      return createErrorResponse(request.id, {
        code: ErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Internal error'
      });
    }
  }

  private handleInitialize(request: MCPRequest): MCPResponse {
    return createResponse(request.id, {
      protocolVersion: '2024-11-05',
      capabilities: this.config.capabilities,
      serverInfo: {
        name: this.config.name,
        version: this.config.version
      }
    });
  }

  private handleListTools(request: MCPRequest): MCPResponse {
    const tools = Array.from(this.tools.values());
    return createResponse(request.id, { tools });
  }

  private async handleToolCall(request: MCPRequest): Promise<MCPResponse> {
    try {
      const toolCall = validateToolCall(request.params);
      
      if (!this.tools.has(toolCall.name)) {
        return createErrorResponse(request.id, {
          code: ErrorCodes.MCP_TOOL_ERROR,
          message: `Tool '${toolCall.name}' not found`
        });
      }

      const result = await this.executeToolCall(toolCall);
      return createResponse(request.id, result);
    } catch (error) {
      return createErrorResponse(request.id, {
        code: ErrorCodes.MCP_TOOL_ERROR,
        message: error instanceof Error ? error.message : 'Tool execution failed'
      });
    }
  }

  private async executeToolCall(toolCall: ToolCallRequest): Promise<ToolCallResult> {
    const handler = this.listeners(`tool:${toolCall.name}`)[0] as 
      ((request: ToolCallRequest) => Promise<ToolCallResult>) | undefined;

    if (!handler) {
      throw new Error(`No handler found for tool: ${toolCall.name}`);
    }

    return await handler(toolCall);
  }

  private sendResponse(response: MCPResponse): void {
    const message = JSON.stringify(response);
    process.stdout.write(message + '\\n');
  }
}