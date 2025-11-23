import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Candle, CandleDocument } from '../schemas/candle.schema';
import { LoggingService } from '../../logging/logging.service';

@Injectable()
export class CandlesService {
  private readonly logger = new Logger(CandlesService.name);

  constructor(
    @InjectModel(Candle.name) private candleModel: Model<CandleDocument>,
    private loggingService: LoggingService,
  ) {}

  /**
   * Save multiple candles to the database
   * @param candles Array of candle data
   * @param symbol Trading pair symbol (e.g., 'BTC/USDT')
   * @param timeframe Timeframe (e.g., '1h', '4h')
   * @returns Number of candles saved
   */
  async saveCandles(
    candles: Array<{
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>,
    symbol: string,
    timeframe: string,
  ): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Convert CCXT format to our schema format
      const candleDocuments = candles.map(candle => ({
        symbol,
        timeframe,
        timestamp: new Date(candle.timestamp),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }));

      // Use bulk write with upsert to avoid duplicates
      const bulkOps = candleDocuments.map(candle => ({
        updateOne: {
          filter: {
            symbol: candle.symbol,
            timeframe: candle.timeframe,
            timestamp: candle.timestamp,
          },
          update: { $set: candle },
          upsert: true,
        },
      }));

      const result = await this.candleModel.bulkWrite(bulkOps);
      const duration = Date.now() - startTime;
      
      this.loggingService.logDatabase('bulkWrite', 'candles', duration, {
        symbol,
        timeframe,
        insertedCount: result.insertedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        totalCandles: candles.length,
      });

      this.logger.log(`Saved ${candles.length} candles for ${symbol} (${timeframe})`, 'CandlesService', {
        symbol,
        timeframe,
        duration,
        inserted: result.insertedCount,
        modified: result.modifiedCount,
      });

      return candles.length;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.loggingService.logError(error as Error, 'CandlesService.saveCandles', {
        symbol,
        timeframe,
        duration,
        candlesCount: candles.length,
      });
      throw error;
    }
  }

  /**
   * Get the latest candle for a symbol and timeframe
   * @param symbol Trading pair symbol
   * @param timeframe Timeframe
   * @returns Latest candle or null
   */
  async getLatestCandle(symbol: string, timeframe: string): Promise<Candle | null> {
    try {
      const startTime = Date.now();
      const candle = await this.candleModel
        .findOne({ symbol, timeframe })
        .sort({ timestamp: -1 })
        .exec();

      const duration = Date.now() - startTime;
      this.loggingService.logDatabase('findOne', 'candles', duration, {
        symbol,
        timeframe,
        operation: 'getLatestCandle',
        found: !!candle,
      });

      return candle;
    } catch (error) {
      this.loggingService.logError(error as Error, 'CandlesService.getLatestCandle', {
        symbol,
        timeframe,
      });
      throw error;
    }
  }

  /**
   * Get candles for a specific time range
   * @param symbol Trading pair symbol
   * @param timeframe Timeframe
   * @param startTime Start timestamp
   * @param endTime End timestamp
   * @param limit Maximum number of candles
   * @returns Array of candles
   */
  async getCandles(
    symbol: string,
    timeframe: string,
    startTime?: Date,
    endTime?: Date,
    limit?: number,
  ): Promise<Candle[]> {
    try {
      const startTimeQuery = Date.now();
      const query: any = { symbol, timeframe };

      if (startTime || endTime) {
        query.timestamp = {};
        if (startTime) query.timestamp.$gte = startTime;
        if (endTime) query.timestamp.$lte = endTime;
      }

      let queryBuilder = this.candleModel.find(query).sort({ timestamp: 1 });
      if (limit) {
        queryBuilder = queryBuilder.limit(limit);
      }

      const candles = await queryBuilder.exec();
      const duration = Date.now() - startTimeQuery;

      this.loggingService.logDatabase('find', 'candles', duration, {
        symbol,
        timeframe,
        startTime: startTime?.toISOString(),
        endTime: endTime?.toISOString(),
        limit,
        resultCount: candles.length,
      });

      return candles;
    } catch (error) {
      this.loggingService.logError(error as Error, 'CandlesService.getCandles', {
        symbol,
        timeframe,
        startTime: startTime?.toISOString(),
        endTime: endTime?.toISOString(),
        limit,
      });
      throw error;
    }
  }

  /**
   * Get the count of candles for a symbol and timeframe
   * @param symbol Trading pair symbol
   * @param timeframe Timeframe
   * @returns Number of candles
   */
  async getCandlesCount(symbol: string, timeframe: string): Promise<number> {
    try {
      const startTime = Date.now();
      const count = await this.candleModel.countDocuments({ symbol, timeframe }).exec();
      const duration = Date.now() - startTime;

      this.loggingService.logDatabase('countDocuments', 'candles', duration, {
        symbol,
        timeframe,
        count,
      });

      return count;
    } catch (error) {
      this.loggingService.logError(error as Error, 'CandlesService.getCandlesCount', {
        symbol,
        timeframe,
      });
      throw error;
    }
  }
}