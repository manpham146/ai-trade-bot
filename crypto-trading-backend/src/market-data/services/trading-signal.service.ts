import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TechnicalIndicatorsService, TechnicalIndicators } from './technical-indicators.service';
import { AIValidationService, AIValidationRequest, AIValidationResponse } from './ai-validation.service';
import { CandlesService } from './candles.service';
import { LoggingService } from '../../logging/logging.service';
import { Candle } from '../schemas/candle.schema';

export interface TradingSignal {
  symbol: string;
  timeframe: string;
  action: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  reason: string;
  technicalIndicators: TechnicalIndicators;
  aiValidation?: AIValidationResponse;
  hardFilterPassed: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedStopLoss?: number;
  suggestedTakeProfit?: number;
  timestamp: Date;
}

export interface HardFilterCriteria {
  minRSI: number;
  maxRSI: number;
  minVolumeRatio: number; // Current volume vs MA volume
  minPriceChange: number; // Minimum price change percentage
}

@Injectable()
export class TradingSignalService {
  private readonly logger = new Logger(TradingSignalService.name);
  private readonly tradingMode: string;
  private readonly hardFilterCriteria: HardFilterCriteria = {
    minRSI: 30,
    maxRSI: 70,
    minVolumeRatio: 1.2, // Volume must be 20% above average
    minPriceChange: 0.5, // Minimum 0.5% price change
  };

  constructor(
    private configService: ConfigService,
    private technicalIndicatorsService: TechnicalIndicatorsService,
    private aiValidationService: AIValidationService,
    private candlesService: CandlesService,
    private loggingService: LoggingService,
  ) {
    this.tradingMode = this.configService.get<string>('TRADING_MODE', 'PAPER');
  }

  /**
   * Generate trading signal for a symbol/timeframe combination
   */
  async generateSignal(symbol: string, timeframe: string): Promise<TradingSignal> {
    const startTime = Date.now();
    
    try {
      this.loggingService.log('Generating trading signal', 'TradingSignalService', {
        symbol,
        timeframe,
        tradingMode: this.tradingMode,
      });

      // Step 1: Get candle data (last 50 candles for sufficient history)
      const candles = await this.candlesService.getCandles(symbol, timeframe, undefined, undefined, 50);
      
      if (candles.length < this.technicalIndicatorsService.getRequiredHistory()) {
        throw new Error(`Insufficient candle data. Need ${this.technicalIndicatorsService.getRequiredHistory()}, got ${candles.length}`);
      }

      // Step 2: Calculate technical indicators
      const technicalIndicators = this.technicalIndicatorsService.calculateIndicators(candles);

      // Step 3: Apply hard filter (pre-AI validation)
      const hardFilterPassed = this.applyHardFilter(candles, technicalIndicators);

      let aiValidation: AIValidationResponse | undefined;
      let finalAction: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
      let finalConfidence = 0;
      let finalReason = '';
      let finalRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
      let suggestedStopLoss: number | undefined;
      let suggestedTakeProfit: number | undefined;

      // Step 4: AI validation (only if hard filter passed)
      if (hardFilterPassed && this.aiValidationService.isAvailable()) {
        const marketContext = this.analyzeMarketContext(candles);
        
        const aiRequest: AIValidationRequest = {
          symbol,
          timeframe,
          candles: candles.slice(-20), // Last 20 candles for context
          indicators: technicalIndicators,
          marketContext,
        };

        aiValidation = await this.aiValidationService.validateSignal(aiRequest);

        // Step 5: Final decision logic
        if (aiValidation.action === 'BUY' && aiValidation.confidence >= this.aiValidationService.getMinConfidence()) {
          finalAction = 'BUY';
          finalConfidence = aiValidation.confidence;
          finalReason = `AI: ${aiValidation.reason}`;
          finalRiskLevel = aiValidation.riskLevel;
          suggestedStopLoss = aiValidation.suggestedStopLoss;
          suggestedTakeProfit = aiValidation.suggestedTakeProfit;
        } else {
          finalAction = 'WAIT';
          finalConfidence = aiValidation.confidence;
          finalReason = `AI validation failed: ${aiValidation.reason}`;
          finalRiskLevel = aiValidation.riskLevel;
        }
      } else if (!hardFilterPassed) {
        finalAction = 'WAIT';
        finalConfidence = 0;
        finalReason = 'Hard filter criteria not met';
        finalRiskLevel = 'HIGH';
      } else {
        finalAction = 'WAIT';
        finalConfidence = 0;
        finalReason = 'AI validation not available or disabled';
        finalRiskLevel = 'MEDIUM';
      }

      const signal: TradingSignal = {
        symbol,
        timeframe,
        action: finalAction,
        confidence: finalConfidence,
        reason: finalReason,
        technicalIndicators,
        aiValidation,
        hardFilterPassed,
        riskLevel: finalRiskLevel,
        suggestedStopLoss,
        suggestedTakeProfit,
        timestamp: new Date(),
      };

      const duration = Date.now() - startTime;
      
      this.loggingService.log('Trading signal generated', 'TradingSignalService', {
        symbol,
        timeframe,
        signal: {
          action: signal.action,
          confidence: signal.confidence,
          reason: signal.reason,
          riskLevel: signal.riskLevel,
          hardFilterPassed: signal.hardFilterPassed,
        },
        duration,
      });

      this.logger.log(`Generated ${signal.action} signal for ${symbol} (${timeframe}) with ${signal.confidence}% confidence in ${duration}ms`);
      
      return signal;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(error as Error, 'TradingSignalService.generateSignal', {
        symbol,
        timeframe,
        duration,
      });

      this.logger.error(`Failed to generate signal for ${symbol} (${timeframe}): ${error.message}`);
      
      // Return safe default signal on error
      return {
        symbol,
        timeframe,
        action: 'WAIT',
        confidence: 0,
        reason: `Error: ${error.message}`,
        technicalIndicators: {
          rsi: 50,
          macd: { MACD: 0, signal: 0, histogram: 0 },
          volumeMA: 0,
        },
        hardFilterPassed: false,
        riskLevel: 'HIGH',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Apply hard filter criteria before AI validation
   */
  private applyHardFilter(candles: Candle[], indicators: TechnicalIndicators): boolean {
    try {
      const latestCandle = candles[candles.length - 1];
      const previousCandle = candles[candles.length - 2];
      
      // RSI filter: avoid overbought/oversold conditions
      if (indicators.rsi < this.hardFilterCriteria.minRSI || indicators.rsi > this.hardFilterCriteria.maxRSI) {
        this.logger.log(`Hard filter failed: RSI ${indicators.rsi} outside range [${this.hardFilterCriteria.minRSI}, ${this.hardFilterCriteria.maxRSI}]`);
        return false;
      }

      // Volume filter: ensure sufficient volume
      const volumeRatio = latestCandle.volume / indicators.volumeMA;
      if (volumeRatio < this.hardFilterCriteria.minVolumeRatio) {
        this.logger.log(`Hard filter failed: Volume ratio ${volumeRatio.toFixed(2)} below minimum ${this.hardFilterCriteria.minVolumeRatio}`);
        return false;
      }

      // Price change filter: ensure minimum price movement
      const priceChange = Math.abs((latestCandle.close - previousCandle.close) / previousCandle.close) * 100;
      if (priceChange < this.hardFilterCriteria.minPriceChange) {
        this.logger.log(`Hard filter failed: Price change ${priceChange.toFixed(2)}% below minimum ${this.hardFilterCriteria.minPriceChange}%`);
        return false;
      }

      this.logger.log(`Hard filter passed for ${latestCandle.symbol} (${latestCandle.timeframe})`);
      return true;

    } catch (error) {
      this.logger.error(`Hard filter error: ${error.message}`);
      return false;
    }
  }

  /**
   * Analyze market context for AI validation
   */
  private analyzeMarketContext(candles: Candle[]): {
    trend: string;
    volatility: number;
    volumeAnalysis: string;
  } {
    try {
      const recentCandles = candles.slice(-10); // Last 10 candles
      const latestCandle = candles[candles.length - 1];
      
      // Trend analysis
      const priceChange = ((latestCandle.close - recentCandles[0].close) / recentCandles[0].close) * 100;
      let trend: string;
      if (priceChange > 2) trend = 'Strong Uptrend';
      else if (priceChange > 0.5) trend = 'Uptrend';
      else if (priceChange < -2) trend = 'Strong Downtrend';
      else if (priceChange < -0.5) trend = 'Downtrend';
      else trend = 'Sideways';

      // Volatility analysis
      const closes = recentCandles.map(c => c.close);
      const mean = closes.reduce((sum, price) => sum + price, 0) / closes.length;
      const variance = closes.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / closes.length;
      const volatility = Math.sqrt(variance) / mean * 100;

      // Volume analysis
      const avgVolume = recentCandles.slice(0, -1).reduce((sum, c) => sum + c.volume, 0) / (recentCandles.length - 1);
      const currentVolume = latestCandle.volume;
      const volumeRatio = currentVolume / avgVolume;
      
      let volumeAnalysis: string;
      if (volumeRatio > 1.5) volumeAnalysis = 'High Volume';
      else if (volumeRatio < 0.7) volumeAnalysis = 'Low Volume';
      else volumeAnalysis = 'Normal Volume';

      return {
        trend,
        volatility: Number(volatility.toFixed(2)),
        volumeAnalysis,
      };

    } catch (error) {
      this.logger.error(`Market context analysis error: ${error.message}`);
      return {
        trend: 'Unknown',
        volatility: 0,
        volumeAnalysis: 'Unknown',
      };
    }
  }

  /**
   * Generate signals for multiple symbols and timeframes
   */
  async generateSignals(symbols: string[], timeframes: string[]): Promise<TradingSignal[]> {
    const startTime = Date.now();
    
    this.loggingService.log('Generating trading signals batch', 'TradingSignalService', {
      symbols: symbols.length,
      timeframes: timeframes.length,
      total: symbols.length * timeframes.length,
    });

    const signals: TradingSignal[] = [];
    
    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        try {
          const signal = await this.generateSignal(symbol, timeframe);
          signals.push(signal);
        } catch (error) {
          this.logger.error(`Failed to generate signal for ${symbol} (${timeframe}): ${error.message}`);
          
          // Add error signal
          signals.push({
            symbol,
            timeframe,
            action: 'WAIT',
            confidence: 0,
            reason: `Error: ${error.message}`,
            technicalIndicators: {
              rsi: 50,
              macd: { MACD: 0, signal: 0, histogram: 0 },
              volumeMA: 0,
            },
            hardFilterPassed: false,
            riskLevel: 'HIGH',
            timestamp: new Date(),
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    const buySignals = signals.filter(s => s.action === 'BUY').length;
    
    this.loggingService.log('Trading signals batch completed', 'TradingSignalService', {
      total: signals.length,
      buySignals,
      waitSignals: signals.filter(s => s.action === 'WAIT').length,
      duration,
    });

    this.logger.log(`Generated ${signals.length} signals in ${duration}ms (${buySignals} BUY signals)`);
    
    return signals;
  }

  /**
   * Get hard filter criteria
   */
  getHardFilterCriteria(): HardFilterCriteria {
    return { ...this.hardFilterCriteria };
  }

  /**
   * Get trading mode
   */
  getTradingMode(): string {
    return this.tradingMode;
  }
}