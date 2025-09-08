/**
 * Async utilities for MCP server development
 */

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) {
        throw lastError;
      }

      await sleep(delayMs * attempt); // Exponential backoff
    }
  }

  throw lastError!;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class AsyncQueue<T> {
  private queue: Array<() => Promise<T>> = [];
  private maxConcurrency: number;
  private currentRunning = 0;

  constructor(maxConcurrency = 1) {
    this.maxConcurrency = maxConcurrency;
  }

  async add(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });

      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.currentRunning >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    this.currentRunning++;
    const operation = this.queue.shift();

    if (operation) {
      try {
        await operation();
      } catch {
        // Error already handled in the operation wrapper
      } finally {
        this.currentRunning--;
        this.process(); // Process next item
      }
    }
  }
}