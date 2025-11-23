import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ccxt from 'ccxt';
import { LoggingService } from '../../logging/logging.service';
import { withRetry } from '../../common/utils/retry.utils';
import { RateLimiter } from '../../common/utils/rate-limiter.utils';

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable()
export class ExchangeService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeService.name);
  private exchange: ccxt.Exchange;
  private exchangeId: string;
  private rateLimiter: RateLimiter;

  constructor(
    private configService: ConfigService,
    private loggingService: LoggingService,
  ) {}

  onModuleInit() {
    this.exchangeId = this.configService.get<string>('EXCHANGE_ID', 'binance');
    
    // Initialize rate limiter (60 requests per minute as per context)
    this.rateLimiter = RateLimiter.forExchangeAPI(this.loggingService, 'ExchangeService');
    
    try {
      // Initialize CCXT exchange with rate limiting enabled
      this.exchange = new ccxt[this.exchangeId]({
        enableRateLimit: true,
        rateLimit: 1000, // 1 second between requests
      });

      this.loggingService.log('Exchange initialized successfully', 'ExchangeService', {
        exchangeId: this.exchangeId,
        rateLimit: this.exchange.rateLimit,
        hasFetchOHLCV: this.exchange.has['fetchOHLCV'],
        timeframes: this.exchange.timeframes,
        rateLimiterStatus: this.rateLimiter.getStatus(),
      });

      this.logger.log(`Exchange ${this.exchangeId} initialized with rate limiting enabled`);
    } catch (error) {
      this.loggingService.logError(error as Error, 'ExchangeService.onModuleInit', {
        exchangeId: this.exchangeId,
      });
      throw new Error(`Failed to initialize exchange ${this.exchangeId}: ${error.message}`);
    }
  }

  /**
   * Fetch OHLCV (Open, High, Low, Close, Volume) data from the exchange
   * @param symbol Trading pair symbol (e.g., 'BTC/USDT')
   * @param timeframe Timeframe (e.g., '1h', '4h', '1d')
   * @param since Timestamp in milliseconds (optional)
   * @param limit Number of candles to fetch (default: 100, max: 1000)
   * @returns Array of OHLCV data
   */
  async fetchOHLCV(
    symbol: string,
    timeframe: string,
    since?: number,
    limit: number = 100,
  ): Promise<OHLCVData[]> {
    const startTime = Date.now();
    
    try {
      // Validate timeframe
      if (!this.exchange.timeframes || !this.exchange.timeframes[timeframe]) {
        throw new Error(`Invalid timeframe: ${timeframe}. Available: ${Object.keys(this.exchange.timeframes || {}).join(', ')}`);
      }

      // Validate symbol
      if (!symbol.includes('/')) {
        throw new Error(`Invalid symbol format: ${symbol}. Expected format: BASE/QUOTE (e.g., BTC/USDT)`);
      }

      this.loggingService.log('Fetching OHLCV data', 'ExchangeService', {
        symbol,
        timeframe,
        since: since ? new Date(since).toISOString() : 'latest',
        limit,
        exchangeId: this.exchangeId,
      });

      // Fetch OHLCV data from exchange with rate limiting and exponential backoff retry
      const ohlcvData = await this.rateLimiter.execute(() =>
        withRetry(
          () => this.exchange.fetchOHLCV(symbol, timeframe, since, limit),
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2,
            retryableErrors: ['timeout', 'network', 'connection', 'rate limit', 'too many requests', 'fetchOHLCV'],
            loggingService: this.loggingService,
          },
          `fetchOHLCV-${symbol}-${timeframe}`
        )
      );
      
      // Transform CCXT format to our format
      const transformedData: OHLCVData[] = ohlcvData.map(candle => ({
        timestamp: candle[0], // Unix timestamp in milliseconds
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
      }));

      const duration = Date.now() - startTime;
      
      this.loggingService.log('OHLCV data fetched successfully', 'ExchangeService', {
        symbol,
        timeframe,
        candlesCount: transformedData.length,
        duration,
        firstCandle: transformedData[0] ? new Date(transformedData[0].timestamp).toISOString() : null,
        lastCandle: transformedData[transformedData.length - 1] ? new Date(transformedData[transformedData.length - 1].timestamp).toISOString() : null,
      });

      this.logger.log(`Fetched ${transformedData.length} candles for ${symbol} (${timeframe}) in ${duration}ms`);
      
      return transformedData;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(error as Error, 'ExchangeService.fetchOHLCV', {
        symbol,
        timeframe,
        since,
        limit,
        duration,
        exchangeId: this.exchangeId,
      });

      throw new Error(`Failed to fetch OHLCV data for ${symbol} (${timeframe}): ${error.message}`);
    }
  }

  /**
   * Get exchange information
   * @returns Exchange info including available symbols and timeframes
   */
  async getExchangeInfo() {
    try {
      await this.exchange.loadMarkets();
      
      return {
        exchangeId: this.exchangeId,
        symbols: Object.keys(this.exchange.markets),
        timeframes: this.exchange.timeframes,
        hasOHLCV: this.exchange.has['fetchOHLCV'],
        rateLimit: this.exchange.rateLimit,
      };
    } catch (error) {
      this.loggingService.logError(error as Error, 'ExchangeService.getExchangeInfo');
      throw error;
    }
  }

  /**
   * Get available symbols for trading
   * @returns Array of available trading symbols
   */
  getAvailableSymbols(): string[] {
    if (!this.exchange.markets) {
      return [];
    }
    return Object.keys(this.exchange.markets);
  }

  /**
   * Get available timeframes
   * @returns Object with available timeframes
   */
  getAvailableTimeframes(): Record<string, string> {
    const timeframes = this.exchange.timeframes || {};
    const result: Record<string, string> = {};
    for (const key in timeframes) {
      if (typeof timeframes[key] === 'string') {
        result[key] = timeframes[key] as string;
      }
    }
    return result;
  }

  /**
   * Check if symbol is available on the exchange
   * @param symbol Trading pair symbol
   * @returns Boolean indicating availability
   */
  isSymbolAvailable(symbol: string): boolean {
    return this.exchange.markets && !!this.exchange.markets[symbol];
  }

  /**
   * Get rate limiter status
   * @returns Current rate limit status
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Get current market price for a symbol using ticker
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    const startTime = Date.now();
    try {
      const ticker: any = await this.rateLimiter.execute(() =>
        withRetry(
          () => this.exchange.fetchTicker(symbol),
          {
            maxRetries: 3,
            initialDelay: 500,
            maxDelay: 5000,
            backoffFactor: 2,
            retryableErrors: ['timeout', 'network', 'connection', 'rate limit', 'too many requests', 'fetchTicker'],
            loggingService: this.loggingService,
          },
          `fetchTicker-${symbol}`
        )
      );
      const price = ticker.last ?? ticker.close ?? ticker.bid ?? ticker.ask;
      const duration = Date.now() - startTime;
      this.loggingService.log('Current price fetched', 'ExchangeService', {
        symbol,
        price,
        duration,
      });
      if (typeof price !== 'number' || !isFinite(price)) {
        throw new Error('Invalid price from ticker');
      }
      return price;
    } catch (error) {
      this.loggingService.logError(error as Error, 'ExchangeService.getCurrentPrice', { symbol });
      throw error;
    }
  }
}
