/**
 * Rate limiting utility for API calls
 * Implements token bucket algorithm with configurable limits
 */

import { LoggingService } from '../../logging/logging.service';

export interface RateLimitOptions {
  maxRequests: number;      // Maximum number of requests allowed
  windowMs: number;       // Time window in milliseconds
  loggingService?: LoggingService;
  serviceName?: string;
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly loggingService?: LoggingService;
  private readonly serviceName: string;
  private queue: Array<() => void> = [];
  private processing = false;

  constructor(options: RateLimitOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
    this.tokens = options.maxRequests;
    this.lastRefill = Date.now();
    this.loggingService = options.loggingService;
    this.serviceName = options.serviceName || 'UnknownService';
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor((elapsed / this.windowMs) * this.maxRequests);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxRequests, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Check if request can be made
   */
  private canMakeRequest(): boolean {
    this.refillTokens();
    return this.tokens > 0;
  }

  /**
   * Consume a token
   */
  private consumeToken(): void {
    this.tokens--;
    
    if (this.loggingService && this.tokens <= this.maxRequests * 0.2) {
      // Log warning when 80% of rate limit is used
      this.loggingService.logRateLimit(
        this.serviceName,
        this.maxRequests,
        this.tokens,
        new Date(Date.now() + this.windowMs)
      );
    }
  }

  /**
   * Execute function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const attemptExecution = async () => {
        if (this.canMakeRequest()) {
          this.consumeToken();
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        } else {
          // Add to queue and process later
          this.queue.push(attemptExecution);
          this.processQueue();
        }
      };

      attemptExecution();
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
      
      if (this.canMakeRequest() && this.queue.length > 0) {
        const nextExecution = this.queue.shift();
        if (nextExecution) {
          nextExecution();
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get current rate limit status
   */
  getStatus(): { remaining: number; max: number; resetTime: Date } {
    this.refillTokens();
    return {
      remaining: this.tokens,
      max: this.maxRequests,
      resetTime: new Date(this.lastRefill + this.windowMs),
    };
  }

  /**
   * Create rate limiter for common exchange API limits (60 requests per minute)
   */
  static forExchangeAPI(loggingService?: LoggingService, serviceName?: string): RateLimiter {
    return new RateLimiter({
      maxRequests: 60,
      windowMs: 60000, // 1 minute
      loggingService,
      serviceName: serviceName || 'ExchangeAPI',
    });
  }

  /**
   * Create rate limiter for AI API calls (lower limit to be safe)
   */
  static forAIAPI(loggingService?: LoggingService, serviceName?: string): RateLimiter {
    return new RateLimiter({
      maxRequests: 30,
      windowMs: 60000, // 1 minute
      loggingService,
      serviceName: serviceName || 'AIAPI',
    });
  }
}