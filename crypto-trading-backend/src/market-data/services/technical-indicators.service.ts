import { Injectable, Logger } from '@nestjs/common';
import { rsi, macd, sma } from 'technicalindicators';
import { Candle } from '../schemas/candle.schema';
import { LoggingService } from '../../logging/logging.service';

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    MACD: number;
    signal: number;
    histogram: number;
  };
  volumeMA: number;
}

export interface IndicatorConfig {
  rsiPeriod: number;
  macdFastPeriod: number;
  macdSlowPeriod: number;
  macdSignalPeriod: number;
  volumeMAPeriod: number;
}

@Injectable()
export class TechnicalIndicatorsService {
  private readonly logger = new Logger(TechnicalIndicatorsService.name);
  private readonly config: IndicatorConfig = {
    rsiPeriod: 14,
    macdFastPeriod: 12,
    macdSlowPeriod: 26,
    macdSignalPeriod: 9,
    volumeMAPeriod: 20,
  };

  constructor(private loggingService: LoggingService) {}

  /**
   * Calculate technical indicators for the given candles
   * @param candles Array of candle data (must have enough history for indicators)
   * @returns Technical indicators object
   */
  calculateIndicators(candles: Candle[]): TechnicalIndicators {
    const startTime = Date.now();
    
    try {
      this.loggingService.log('Calculating technical indicators', 'TechnicalIndicatorsService', {
        candleCount: candles.length,
        requiredHistory: this.getRequiredHistory(),
        config: this.config,
      });

      if (candles.length < this.getRequiredHistory()) {
        throw new Error(`Insufficient candle data. Need ${this.getRequiredHistory()} candles, got ${candles.length}`);
      }

      // Sort candles by timestamp to ensure correct order
      const sortedCandles = [...candles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Extract price and volume data
      const closes = sortedCandles.map(c => c.close);
      const volumes = sortedCandles.map(c => c.volume);

      // Calculate RSI(14)
      const rsiValues = rsi({
        values: closes,
        period: this.config.rsiPeriod,
      });

      // Calculate MACD(12,26,9)
      const macdValues = macd({
        values: closes,
        fastPeriod: this.config.macdFastPeriod,
        slowPeriod: this.config.macdSlowPeriod,
        signalPeriod: this.config.macdSignalPeriod,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      });

      // Calculate Volume MA(20)
      const volumeMAValues = sma({
        values: volumes,
        period: this.config.volumeMAPeriod,
      });

      // Get the latest values
      const latestRSI = rsiValues[rsiValues.length - 1];
      const latestMACD = macdValues[macdValues.length - 1];
      const latestVolumeMA = volumeMAValues[volumeMAValues.length - 1];

      const indicators: TechnicalIndicators = {
        rsi: latestRSI,
        macd: {
          MACD: latestMACD.MACD,
          signal: latestMACD.signal,
          histogram: latestMACD.histogram,
        },
        volumeMA: latestVolumeMA,
      };

      const duration = Date.now() - startTime;
      
      this.loggingService.log('Technical indicators calculated successfully', 'TechnicalIndicatorsService', {
        indicators,
        duration,
        latestCandle: sortedCandles[sortedCandles.length - 1].timestamp,
      });

      this.logger.log(`Calculated technical indicators in ${duration}ms`);
      
      return indicators;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(error as Error, 'TechnicalIndicatorsService.calculateIndicators', {
        candleCount: candles.length,
        duration,
      });

      this.logger.error(`Failed to calculate technical indicators: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the minimum number of candles required for indicator calculations
   */
  getRequiredHistory(): number {
    // Need maximum of all periods plus some buffer
    const periods = [
      this.config.rsiPeriod,
      this.config.macdSlowPeriod,
      this.config.volumeMAPeriod,
    ];
    
    return Math.max(...periods) + 10; // Add 10 candle buffer
  }

  /**
   * Validate if candles have sufficient history for indicator calculations
   */
  validateCandleHistory(candles: Candle[]): boolean {
    return candles.length >= this.getRequiredHistory();
  }

  /**
   * Get indicator configuration
   */
  getConfig(): IndicatorConfig {
    return { ...this.config };
  }

  /**
   * Calculate indicators for multiple symbol/timeframe combinations
   */
  async calculateIndicatorsBatch(
    data: Array<{ symbol: string; timeframe: string; candles: Candle[] }>
  ): Promise<Array<{ symbol: string; timeframe: string; indicators: TechnicalIndicators | null; error?: string }>> {
    const startTime = Date.now();
    
    this.loggingService.log('Starting batch indicator calculation', 'TechnicalIndicatorsService', {
      batchSize: data.length,
    });

    const results = await Promise.all(
      data.map(async ({ symbol, timeframe, candles }) => {
        try {
          if (!this.validateCandleHistory(candles)) {
            return {
              symbol,
              timeframe,
              indicators: null,
              error: `Insufficient candle history. Need ${this.getRequiredHistory()}, got ${candles.length}`,
            };
          }

          const indicators = this.calculateIndicators(candles);
          
          return {
            symbol,
            timeframe,
            indicators,
          };
        } catch (error) {
          this.loggingService.logError(error as Error, `TechnicalIndicatorsService.batch.${symbol}.${timeframe}`, {
            candleCount: candles.length,
          });

          return {
            symbol,
            timeframe,
            indicators: null,
            error: error.message,
          };
        }
      })
    );

    const duration = Date.now() - startTime;
    const successful = results.filter(r => r.indicators !== null).length;
    
    this.loggingService.log('Batch indicator calculation completed', 'TechnicalIndicatorsService', {
      total: results.length,
      successful,
      failed: results.length - successful,
      duration,
    });

    this.logger.log(`Processed ${results.length} indicator calculations in ${duration}ms (${successful} successful)`);
    
    return results;
  }
}