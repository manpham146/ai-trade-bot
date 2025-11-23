import { Injectable, Logger } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { CandlesService } from './candles.service';
import { LoggingService } from '../../logging/logging.service';

export interface SyncCandlesOptions {
  symbol: string;
  timeframe: string;
  limit?: number;
  since?: number;
}

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    private exchangeService: ExchangeService,
    private candlesService: CandlesService,
    private loggingService: LoggingService,
  ) {}

  /**
   * Sync candles from exchange to database
   * @param options Sync options including symbol, timeframe, and optional parameters
   * @returns Number of candles synced
   */
  async syncCandles(options: SyncCandlesOptions): Promise<number> {
    const { symbol, timeframe, limit = 100, since } = options;
    const startTime = Date.now();

    try {
      this.loggingService.log('Starting candle sync', 'MarketDataService', {
        symbol,
        timeframe,
        limit,
        since: since ? new Date(since).toISOString() : 'latest',
      });

      // Validate symbol and timeframe
      if (!this.exchangeService.isSymbolAvailable(symbol)) {
        throw new Error(`Symbol ${symbol} is not available on the exchange`);
      }

      // Get the latest candle from database to determine sync start point
      const latestCandle = await this.candlesService.getLatestCandle(symbol, timeframe);
      let syncSince = since;

      if (latestCandle && !since) {
        // If we have existing data and no specific since parameter, start from the next candle
        syncSince = latestCandle.timestamp.getTime() + this.getTimeframeMs(timeframe);
        this.logger.log(`Resuming sync from ${new Date(syncSince).toISOString()}`);
      }

      // Fetch OHLCV data from exchange
      const ohlcvData = await this.exchangeService.fetchOHLCV(symbol, timeframe, syncSince, limit);

      if (ohlcvData.length === 0) {
        this.loggingService.log('No new candles to sync', 'MarketDataService', {
          symbol,
          timeframe,
          duration: Date.now() - startTime,
        });
        return 0;
      }

      // Save candles to database
      const savedCount = await this.candlesService.saveCandles(ohlcvData, symbol, timeframe);

      const duration = Date.now() - startTime;
      
      this.loggingService.log('Candle sync completed successfully', 'MarketDataService', {
        symbol,
        timeframe,
        candlesSynced: savedCount,
        duration,
        firstCandle: ohlcvData[0] ? new Date(ohlcvData[0].timestamp).toISOString() : null,
        lastCandle: ohlcvData[ohlcvData.length - 1] ? new Date(ohlcvData[ohlcvData.length - 1].timestamp).toISOString() : null,
      });

      this.logger.log(`Synced ${savedCount} candles for ${symbol} (${timeframe}) in ${duration}ms`);
      
      return savedCount;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(error as Error, 'MarketDataService.syncCandles', {
        symbol,
        timeframe,
        limit,
        since,
        duration,
      });

      throw new Error(`Failed to sync candles for ${symbol} (${timeframe}): ${error.message}`);
    }
  }

  /**
   * Sync multiple symbols and timeframes
   * @param symbols Array of trading symbols
   * @param timeframes Array of timeframes
   * @param limit Number of candles per sync
   * @returns Summary of sync results
   */
  async syncMultipleCandles(
    symbols: string[],
    timeframes: string[],
    limit: number = 100,
  ): Promise<Record<string, number>> {
    const startTime = Date.now();
    const results: Record<string, number> = {};

    try {
      this.loggingService.log('Starting multiple candle sync', 'MarketDataService', {
        symbols,
        timeframes,
        limit,
      });

      for (const symbol of symbols) {
        for (const timeframe of timeframes) {
          const key = `${symbol}_${timeframe}`;
          try {
            const count = await this.syncCandles({ symbol, timeframe, limit });
            results[key] = count;
          } catch (error) {
            this.loggingService.logError(error as Error, 'MarketDataService.syncMultipleCandles', {
              symbol,
              timeframe,
            });
            results[key] = -1; // Indicate error
          }
        }
      }

      const duration = Date.now() - startTime;
      const totalSynced = Object.values(results).filter(count => count > 0).reduce((sum, count) => sum + count, 0);

      this.loggingService.log('Multiple candle sync completed', 'MarketDataService', {
        symbols,
        timeframes,
        results,
        totalSynced,
        duration,
      });

      this.logger.log(`Synced ${totalSynced} total candles across ${symbols.length} symbols and ${timeframes.length} timeframes in ${duration}ms`);
      
      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(error as Error, 'MarketDataService.syncMultipleCandles', {
        symbols,
        timeframes,
        limit,
        duration,
      });

      throw error;
    }
  }

  /**
   * Get market data statistics
   * @param symbol Trading symbol
   * @param timeframe Timeframe
   * @returns Statistics about stored data
   */
  async getMarketDataStats(symbol: string, timeframe: string) {
    try {
      const candleCount = await this.candlesService.getCandlesCount(symbol, timeframe);
      const latestCandle = await this.candlesService.getLatestCandle(symbol, timeframe);

      return {
        symbol,
        timeframe,
        totalCandles: candleCount,
        latestCandle: latestCandle ? {
          timestamp: latestCandle.timestamp,
          open: latestCandle.open,
          high: latestCandle.high,
          low: latestCandle.low,
          close: latestCandle.close,
          volume: latestCandle.volume,
        } : null,
      };
    } catch (error) {
      this.loggingService.logError(error as Error, 'MarketDataService.getMarketDataStats', {
        symbol,
        timeframe,
      });
      throw error;
    }
  }

  /**
   * Convert timeframe to milliseconds
   * @param timeframe Timeframe string (e.g., '1h', '4h', '1d')
   * @returns Timeframe in milliseconds
   */
  private getTimeframeMs(timeframe: string): number {
    const timeframeMap: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '8h': 8 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
    };

    return timeframeMap[timeframe] || 60 * 60 * 1000; // Default to 1 hour
  }
}