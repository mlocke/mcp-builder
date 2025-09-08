/**
 * Validation utilities using Zod for MCP server input validation
 */

import { z } from 'zod';

// Common validation schemas
export const mcpRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.unknown()).optional()
});

export const mcpResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.unknown().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional()
  }).optional()
});

export const toolCallRequestSchema = z.object({
  name: z.string(),
  arguments: z.record(z.unknown()).optional()
});

// Validation helper functions
export function validateRequest(data: unknown): z.infer<typeof mcpRequestSchema> {
  return mcpRequestSchema.parse(data);
}

export function validateResponse(data: unknown): z.infer<typeof mcpResponseSchema> {
  return mcpResponseSchema.parse(data);
}

export function validateToolCall(data: unknown): z.infer<typeof toolCallRequestSchema> {
  return toolCallRequestSchema.parse(data);
}

// Generic validation wrapper
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation failed: ${error.message}`);
      }
      throw error;
    }
  };
}

// Common schema builders
export function createObjectSchema(properties: Record<string, z.ZodTypeAny>): z.ZodObject<any> {
  return z.object(properties);
}

export function createArraySchema<T>(itemSchema: z.ZodSchema<T>): z.ZodArray<z.ZodSchema<T>> {
  return z.array(itemSchema);
}

export function createOptionalSchema<T>(schema: z.ZodSchema<T>): z.ZodOptional<z.ZodSchema<T>> {
  return schema.optional();
}