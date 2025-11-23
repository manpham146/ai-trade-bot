import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketDataService } from './market-data.service';
import { TechnicalAnalysisService } from './technical-analysis.service';
import { AiService } from './ai.service';
import { TradingService } from './trading.service';
import { LoggingService } from '../../logging/logging.service';

@Injectable()
export class BotOrchestratorService {
  private readonly logger = new Logger(BotOrchestratorService.name);
  private readonly symbols = ['BTC/USDT', 'ETH/USDT'];
  private readonly timeframes = ['1h', '4h'];

  constructor(
    private marketDataService: MarketDataService,
    private loggingService: LoggingService,
    private technicalAnalysisService: TechnicalAnalysisService,
    private aiService: AiService,
    private tradingService: TradingService,
  ) {}

  /**
   * CRITICAL: H1 cron job to sync 1h candle data
   * Runs every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
   */
  @Cron('0 * * * *')
  async handleH1Sync() {
    await this.syncTimeframe('1h');
  }

  /**
   * CRITICAL: H4 cron job to sync 4h candle data
   * Runs every 4 hours at minute 0 (e.g., 0:00, 4:00, 8:00, 12:00, 16:00, 20:00)
   */
  @Cron('0 */4 * * *')
  async handleH4Sync() {
    await this.syncTimeframe('4h');
  }

  /**
   * Generic sync method for a specific timeframe
   */
  private async syncTimeframe(timeframe: string) {
    const startTime = Date.now();
    
    try {
      this.loggingService.log('Starting candle sync', 'BotOrchestratorService', {
        symbols: this.symbols,
        timeframe,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Starting ${timeframe} sync for symbols: ${this.symbols.join(', ')}`);

      // Sync candles for the specific timeframe
      const results = await this.marketDataService.syncMultipleCandles(
        this.symbols,
        [timeframe], // Only sync the specified timeframe
        100, // Fetch last 100 candles
      );

      const duration = Date.now() - startTime;
      const totalSynced = Object.values(results).filter(count => count > 0).reduce((sum, count) => sum + count, 0);

      this.loggingService.log('Candle sync completed', 'BotOrchestratorService', {
        symbols: this.symbols,
        timeframe,
        results,
        totalSynced,
        duration,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Data Sync Complete: ${totalSynced} candles synced in ${duration}ms`);
      this.logger.log(`Results: ${JSON.stringify(results, null, 2)}`);

      // Log individual symbol results for better visibility
      for (const [key, count] of Object.entries(results)) {
        const [symbol, tf] = key.split('_');
        if (count > 0) {
          this.logger.log(`✅ ${symbol} (${tf}): ${count} candles synced`);
        } else if (count === 0) {
          this.logger.log(`⏭️  ${symbol} (${tf}): No new candles`);
        } else {
          this.logger.error(`❌ ${symbol} (${tf}): Sync failed`);
        }
      }

      // After sync, analyze per symbol for the given timeframe
      for (const symbol of this.symbols) {
        const analysis = await this.technicalAnalysisService.analyze(symbol, timeframe);
        if (analysis.signal !== 'NEUTRAL') {
          this.logger.log(`Potential Signal Found: ${symbol} (${timeframe}) -> ${analysis.signal} [RSI=${analysis.rsi.toFixed(2)}, MACDhist=${analysis.macd.toFixed(4)}, VolRatio=${analysis.volumeRatio.toFixed(2)}, Body=${analysis.priceChangePct.toFixed(2)}%]`);
          this.loggingService.log('Potential Signal Found', 'BotOrchestratorService', {
            symbol,
            timeframe,
            analysis,
          });
          const aiDecision = await this.aiService.validateSignal(symbol, analysis);
          this.loggingService.log('AI Decision', 'BotOrchestratorService', {
            symbol,
            timeframe,
            aiDecision,
          });
          this.logger.log(`AI Decision: ${symbol} (${timeframe}) -> ${aiDecision.action} (${aiDecision.confidence}%)`);
          if (aiDecision.action === 'BUY' && aiDecision.confidence >= 80) {
            const price = await (this.marketDataService as any).exchangeService?.getCurrentPrice?.(symbol);
            await this.tradingService.executeBuy(symbol, price);
          }
        }
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(error as Error, `BotOrchestratorService.syncTimeframe(${timeframe})`, {
        symbols: this.symbols,
        timeframe,
        duration,
        timestamp: new Date().toISOString(),
      });

      this.logger.error(`${timeframe} sync failed after ${duration}ms: ${error.message}`);
      
      // Re-throw to ensure the error is properly logged by NestJS
      throw error;
    }
  }

  /**
   * Manual sync method for testing or forced synchronization
   * @param symbols Array of symbols to sync
   * @param timeframes Array of timeframes to sync
   * @param limit Number of candles to fetch
   * @returns Sync results
   */
  async manualSync(
    symbols: string[] = this.symbols,
    timeframes: string[] = this.timeframes,
    limit: number = 100,
  ) {
    const startTime = Date.now();
    
    try {
      this.loggingService.log('Starting manual candle sync', 'BotOrchestratorService', {
        symbols,
        timeframes,
        limit,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Starting manual sync for symbols: ${symbols.join(', ')}`);

      const results = await this.marketDataService.syncMultipleCandles(symbols, timeframes, limit);

      const duration = Date.now() - startTime;
      const totalSynced = Object.values(results).filter(count => count > 0).reduce((sum, count) => sum + count, 0);

      this.loggingService.log('Manual candle sync completed', 'BotOrchestratorService', {
        symbols,
        timeframes,
        results,
        totalSynced,
        duration,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Manual sync completed: ${totalSynced} candles synced in ${duration}ms`);

      // After manual sync, analyze each symbol/timeframe
      for (const symbol of symbols) {
        for (const tf of timeframes) {
          const analysis = await this.technicalAnalysisService.analyze(symbol, tf);
          if (analysis.signal !== 'NEUTRAL') {
            this.logger.log(`Potential Signal Found: ${symbol} (${tf}) -> ${analysis.signal} [RSI=${analysis.rsi.toFixed(2)}, MACDhist=${analysis.macd.toFixed(4)}, VolRatio=${analysis.volumeRatio.toFixed(2)}, Body=${analysis.priceChangePct.toFixed(2)}%]`);
            this.loggingService.log('Potential Signal Found', 'BotOrchestratorService', {
              symbol,
              timeframe: tf,
              analysis,
            });
            const aiDecision = await this.aiService.validateSignal(symbol, analysis);
            this.loggingService.log('AI Decision', 'BotOrchestratorService', {
              symbol,
              timeframe: tf,
              aiDecision,
            });
            this.logger.log(`AI Decision: ${symbol} (${tf}) -> ${aiDecision.action} (${aiDecision.confidence}%)`);
            if (aiDecision.action === 'BUY' && aiDecision.confidence >= 80) {
              const price = await (this.marketDataService as any).exchangeService?.getCurrentPrice?.(symbol);
              await this.tradingService.executeBuy(symbol, price);
            }
          }
        }
      }
      
      return {
        success: true,
        results,
        totalSynced,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(error as Error, 'BotOrchestratorService.manualSync', {
        symbols,
        timeframes,
        limit,
        duration,
        timestamp: new Date().toISOString(),
      });

      this.logger.error(`Manual sync failed after ${duration}ms: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        duration,
      };
    }
  }

  /**
   * Get orchestrator status and statistics
   * @returns Status information
   */
  async getStatus() {
    try {
      const stats = {};
      
      // Get market data statistics for each symbol and timeframe
      for (const symbol of this.symbols) {
        for (const timeframe of this.timeframes) {
          const key = `${symbol}_${timeframe}`;
          try {
            const stat = await this.marketDataService.getMarketDataStats(symbol, timeframe);
            stats[key] = stat;
          } catch (error) {
            stats[key] = { error: error.message };
          }
        }
      }

      return {
        status: 'active',
        symbols: this.symbols,
        timeframes: this.timeframes,
        lastSync: new Date().toISOString(),
        stats,
      };
    } catch (error) {
      this.loggingService.logError(error as Error, 'BotOrchestratorService.getStatus');
      
      return {
        status: 'error',
        error: error.message,
        symbols: this.symbols,
        timeframes: this.timeframes,
      };
    }
  }

  /**
   * Test method to verify the cron job is working
   * This can be called manually to test the scheduling
   */
  async testCronJob() {
    this.logger.log('Testing cron jobs...');
    await this.handleH1Sync();
    await this.handleH4Sync();
    this.logger.log('Cron job test completed');
  }
}
