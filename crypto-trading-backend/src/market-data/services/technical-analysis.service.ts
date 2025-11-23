import { Injectable, Logger } from '@nestjs/common';
import { CandlesService } from './candles.service';
import { TechnicalIndicatorsService, TechnicalIndicators } from './technical-indicators.service';
import { Candle } from '../schemas/candle.schema';
import { LoggingService } from '../../logging/logging.service';

export interface AnalysisResult {
  rsi: number;
  macd: number; // MACD histogram
  volumeRatio: number;
  priceChangePct: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  reason: string;
}

@Injectable()
export class TechnicalAnalysisService {
  private readonly logger = new Logger(TechnicalAnalysisService.name);

  constructor(
    private candlesService: CandlesService,
    private indicatorsService: TechnicalIndicatorsService,
    private loggingService: LoggingService,
  ) {}

  async analyze(symbol: string, timeframe: string): Promise<AnalysisResult> {
    const startTime = Date.now();
    try {
      const candles: Candle[] = await this.candlesService.getCandles(symbol, timeframe, undefined, undefined, 100);

      if (!candles || candles.length === 0) {
        return {
          rsi: 0,
          macd: 0,
          volumeRatio: 0,
          priceChangePct: 0,
          signal: 'NEUTRAL',
          reason: 'No candle data',
        };
      }

      const indicators: TechnicalIndicators = this.indicatorsService.calculateIndicators(candles);

      const latest = candles[candles.length - 1];
      const priceChangePct = Math.abs((latest.close - latest.open) / latest.open) * 100;
      const volumeRatio = indicators.volumeMA > 0 ? latest.volume / indicators.volumeMA : 0;
      const rsi = indicators.rsi;
      const macdHistogram = indicators.macd.histogram;

      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
      let reason = 'Does not meet strict hard filter criteria';

      if (rsi < 30 && macdHistogram > 0 && volumeRatio >= 1.2 && priceChangePct >= 0.5) {
        signal = 'BUY';
        reason = 'Oversold with positive momentum, strong volume and significant body move';
      } else if (rsi > 70 && macdHistogram < 0) {
        signal = 'SELL';
        reason = 'Overbought with weakening momentum';
      }

      const duration = Date.now() - startTime;
      this.loggingService.log('Technical analysis completed', 'TechnicalAnalysisService', {
        symbol,
        timeframe,
        rsi,
        macdHistogram,
        volumeRatio,
        priceChangePct,
        signal,
        duration,
      });

      return {
        rsi,
        macd: macdHistogram,
        volumeRatio,
        priceChangePct,
        signal,
        reason,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.loggingService.logError(error as Error, 'TechnicalAnalysisService.analyze', {
        symbol,
        timeframe,
        duration,
      });
      return {
        rsi: 0,
        macd: 0,
        volumeRatio: 0,
        priceChangePct: 0,
        signal: 'NEUTRAL',
        reason: `Analysis error: ${ (error as Error).message }`,
      };
    }
  }
}

