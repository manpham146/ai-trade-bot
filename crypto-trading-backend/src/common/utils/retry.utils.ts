/**
 * Exponential backoff retry utility
 * Implements retry logic with exponential backoff for API calls
 */

import { LoggingService } from '../../logging/logging.service';

export interface RetryOptions {
  maxRetries?: number;      // Maximum number of retry attempts (default: 3)
  initialDelay?: number;    // Initial delay in milliseconds (default: 1000)
  maxDelay?: number;       // Maximum delay in milliseconds (default: 30000)
  backoffFactor?: number;   // Backoff multiplier (default: 2)
  retryableErrors?: string[]; // Error messages that should trigger retry
  loggingService?: LoggingService; // Optional logging service for retry attempts
}

/**
 * Sleep utility function
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Calculate exponential backoff delay
 */
const calculateDelay = (attempt: number, options: Required<RetryOptions>): number => {
  const delay = options.initialDelay * Math.pow(options.backoffFactor, attempt);
  return Math.min(delay, options.maxDelay);
};

/**
 * Check if error is retryable based on error message
 */
const isRetryableError = (error: any, retryableErrors: string[]): boolean => {
  if (!error?.message) return true; // Default to retry if no message
  
  const errorMessage = error.message.toLowerCase();
  return retryableErrors.some(retryable => errorMessage.includes(retryable.toLowerCase()));
};

/**
 * Execute function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  context?: string,
): Promise<T> {
  const opts = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryableErrors: ['timeout', 'network', 'connection', 'rate limit', 'too many requests'],
    loggingService: undefined as LoggingService | undefined,
    ...options,
  };

  let lastError: any;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on the last attempt
      if (attempt === opts.maxRetries) {
        break;
      }
      
      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        throw error;
      }
      
      const delay = calculateDelay(attempt, opts);
      const contextStr = context ? ` [${context}]` : '';
      
      // Use logging service if available, otherwise console.log
      if (opts.loggingService) {
        opts.loggingService.logRetryAttempt(context || 'Unknown', attempt + 1, opts.maxRetries, delay, error.message);
      } else {
        console.log(`Retry attempt ${attempt + 1}/${opts.maxRetries}${contextStr} after ${delay}ms. Error: ${error.message}`);
      }
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Create a retry wrapper for API functions
 */
export function createRetryWrapper(options: RetryOptions = {}) {
  return <T extends (...args: any[]) => Promise<any>>(fn: T, context?: string): T => {
    return (async (...args: Parameters<T>) => {
      return withRetry(() => fn(...args), options, context);
    }) as T;
  };
}