import { Injectable, LoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class LoggingService implements LoggerService {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  log(message: string, context?: string, meta?: any) {
    this.logger.log(message, context, meta);
  }

  error(message: string, trace?: string, context?: string, meta?: any) {
    this.logger.error(message, trace, context, meta);
  }

  warn(message: string, context?: string, meta?: any) {
    this.logger.warn(message, context, meta);
  }

  debug(message: string, context?: string, meta?: any) {
    this.logger.debug(message, context, meta);
  }

  verbose(message: string, context?: string, meta?: any) {
    this.logger.verbose(message, context, meta);
  }

  // Additional utility methods for structured logging
  logRequest(method: string, url: string, statusCode: number, duration: number, meta?: any) {
    this.logger.log('HTTP Request', 'HTTP', {
      method,
      url,
      statusCode,
      duration,
      type: 'http_request',
      ...meta,
    });
  }

  logDatabase(operation: string, collection: string, duration: number, meta?: any) {
    this.logger.log('Database Operation', 'Database', {
      operation,
      collection,
      duration,
      type: 'database_operation',
      ...meta,
    });
  }

  logTrading(action: string, symbol: string, price: number, confidence: number, meta?: any) {
    this.logger.log('Trading Decision', 'Trading', {
      action,
      symbol,
      price,
      confidence,
      type: 'trading_decision',
      ...meta,
    });
  }

  logError(error: Error, context?: string, meta?: any) {
    this.logger.error('Application Error', error.stack, context, {
      message: error.message,
      type: 'application_error',
      ...meta,
    });
  }

  // Enhanced logging methods for crypto trading context
  logHealthCheck(service: string, status: string, details?: any) {
    this.logger.log('Health Check', 'Health', {
      service,
      status,
      type: 'health_check',
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  logPositionMonitoring(symbol: string, action: string, details?: any) {
    this.logger.log('Position Monitoring', 'Monitoring', {
      symbol,
      action,
      type: 'position_monitoring',
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  logRateLimit(service: string, limit: number, remaining: number, resetTime?: Date) {
    this.logger.warn('Rate Limit Warning', 'RateLimit', {
      service,
      limit,
      remaining,
      resetTime: resetTime?.toISOString(),
      type: 'rate_limit',
      timestamp: new Date().toISOString(),
    });
  }

  logRetryAttempt(service: string, attempt: number, maxRetries: number, delay: number, error?: string) {
    this.logger.warn('Retry Attempt', 'Retry', {
      service,
      attempt,
      maxRetries,
      delay,
      error,
      type: 'retry_attempt',
      timestamp: new Date().toISOString(),
    });
  }

  logMarketDataSync(symbol: string, timeframe: string, candles: number, duration: number, status: string) {
    this.logger.log('Market Data Sync', 'MarketData', {
      symbol,
      timeframe,
      candles,
      duration,
      status,
      type: 'market_data_sync',
      timestamp: new Date().toISOString(),
    });
  }
}