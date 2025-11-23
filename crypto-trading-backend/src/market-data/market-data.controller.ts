import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketDataService } from './services/market-data.service';
import { BotOrchestratorService } from './services/bot-orchestrator.service';
import { ExchangeService } from './services/exchange.service';
import { CandlesService } from './services/candles.service';
import { LoggingService } from '../logging/logging.service';
import { AIValidationService } from './services/ai-validation.service';

@Controller('market-data')
export class MarketDataController {
  private readonly logger = new Logger(MarketDataController.name);

  constructor(
    private marketDataService: MarketDataService,
    private botOrchestratorService: BotOrchestratorService,
    private exchangeService: ExchangeService,
    private candlesService: CandlesService,
    private loggingService: LoggingService,
    private aiValidationService: AIValidationService,
    private configService: ConfigService,
  ) {}

  @Get('exchange-info')
  async getExchangeInfo() {
    this.loggingService.log('Exchange info requested', 'MarketDataController', {
      endpoint: '/market-data/exchange-info',
      method: 'GET',
    });

    try {
      const info = await this.exchangeService.getExchangeInfo();
      return {
        success: true,
        data: info,
      };
    } catch (error) {
      this.loggingService.logError(error as Error, 'MarketDataController.getExchangeInfo');
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('sync')
  async syncMarketData(
    @Query('symbols') symbols?: string,
    @Query('timeframes') timeframes?: string,
    @Query('limit') limit?: string,
  ) {
    const symbolArray = symbols ? symbols.split(',') : ['BTC/USDT', 'ETH/USDT'];
    const timeframeArray = timeframes ? timeframes.split(',') : ['1h', '4h'];
    const limitNumber = limit ? parseInt(limit, 10) : 100;

    this.loggingService.log('Manual sync requested', 'MarketDataController', {
      endpoint: '/market-data/sync',
      method: 'POST',
      symbols: symbolArray,
      timeframes: timeframeArray,
      limit: limitNumber,
    });

    try {
      const result = await this.botOrchestratorService.manualSync(
        symbolArray,
        timeframeArray,
        limitNumber,
      );

      return {
        success: result.success,
        data: result,
      };
    } catch (error) {
      this.loggingService.logError(error as Error, 'MarketDataController.syncMarketData', {
        symbols: symbolArray,
        timeframes: timeframeArray,
        limit: limitNumber,
      });
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('stats')
  async getMarketDataStats() {
    this.loggingService.log('Market data stats requested', 'MarketDataController', {
      endpoint: '/market-data/stats',
      method: 'GET',
    });

    try {
      const status = await this.botOrchestratorService.getStatus();
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.loggingService.logError(error as Error, 'MarketDataController.getMarketDataStats');
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('candles')
  async getCandles(
    @Query('symbol') symbol: string,
    @Query('timeframe') timeframe: string,
    @Query('limit') limit?: string,
  ) {
    if (!symbol || !timeframe) {
      return {
        success: false,
        error: 'Symbol and timeframe are required parameters',
      };
    }

    const limitNumber = limit ? parseInt(limit, 10) : 100;

    this.loggingService.log('Candles requested', 'MarketDataController', {
      endpoint: '/market-data/candles',
      method: 'GET',
      symbol,
      timeframe,
      limit: limitNumber,
    });

    try {
      const candles = await this.candlesService.getCandles(symbol, timeframe, undefined, undefined, limitNumber);
      return {
        success: true,
        data: {
          symbol,
          timeframe,
          count: candles.length,
          candles: candles.map(candle => ({
            timestamp: candle.timestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
          })),
        },
      };
    } catch (error) {
      this.loggingService.logError(error as Error, 'MarketDataController.getCandles', {
        symbol,
        timeframe,
        limit: limitNumber,
      });
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('test-cron')
  async testCronJob() {
    this.loggingService.log('Cron job test requested', 'MarketDataController', {
      endpoint: '/market-data/test-cron',
      method: 'POST',
    });

    try {
      await this.botOrchestratorService.testCronJob();
      return {
        success: true,
        message: 'Cron job test completed. Check logs for details.',
      };
    } catch (error) {
      this.loggingService.logError(error as Error, 'MarketDataController.testCronJob');
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('health/exchange')
  async checkExchangeHealth() {
    const startTime = Date.now();
    
    try {
      this.loggingService.log('Exchange health check requested', 'MarketDataController', {
        endpoint: '/market-data/health/exchange',
        method: 'GET',
      });

      // Test kết nối exchange bằng cách lấy thông tin cơ bản
      const info = await this.exchangeService.getExchangeInfo();
      const duration = Date.now() - startTime;
      
      this.loggingService.log('Exchange health check completed', 'MarketDataController', {
        duration,
        symbolsCount: info.symbols?.length || 0,
        status: 'healthy',
      });

      return {
        success: true,
        status: 'healthy',
        data: {
          exchangeId: info.exchangeId,
          symbolsCount: info.symbols?.length || 0,
          timeframes: info.timeframes,
          hasOHLCV: info.hasOHLCV,
          responseTime: duration,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(error as Error, 'MarketDataController.checkExchangeHealth', {
        duration,
        status: 'unhealthy',
      });

      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        responseTime: duration,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('health/ai')
  async checkAIHealth() {
    const startTime = Date.now();
    
    try {
      this.loggingService.log('AI health check requested', 'MarketDataController', {
        endpoint: '/market-data/health/ai',
        method: 'GET',
      });

      const isAvailable = this.aiValidationService.isAvailable();
      
      if (!isAvailable) {
        const duration = Date.now() - startTime;
        
        this.loggingService.log('AI health check - AI not available', 'MarketDataController', {
          duration,
          status: 'unavailable',
        });

        return {
          success: true,
          status: 'unavailable',
          message: 'AI service is not configured or unavailable',
          responseTime: duration,
          timestamp: new Date().toISOString(),
        };
      }

      const testPrompt = 'Test connection. Please respond with: "AI connection successful"';
      
      try {
        let text = '';
        if (this.aiValidationService.isAvailable()) {
          const model = (this.aiValidationService as any)['model'];
          const result = await model.generateContent({
            contents: [{
              role: 'user',
              parts: [{ text: testPrompt }]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 50,
            }
          });
          const response = await (result as any).response;
          text = response.text();
        } else {
          const apiKey = this.configService.get<string>('GEMINI_API_KEY');
          const body = {
            contents: [
              {
                parts: [
                  { text: testPrompt }
                ]
              }
            ]
          };
          const res = await (global as any).fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
            method: 'POST',
            headers: {
              'x-goog-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          const json = await res.json();
          text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
        
        const duration = Date.now() - startTime;
        
        this.loggingService.log('AI health check completed', 'MarketDataController', {
          duration,
          status: 'healthy',
          response: text?.substring(0, 100), // Log phần đầu của response
        });

        return {
          success: true,
          status: 'healthy',
          data: {
            message: 'AI connection successful',
            response: text,
            responseTime: duration,
            timestamp: new Date().toISOString(),
          },
        };
      } catch (aiError) {
        const duration = Date.now() - startTime;
        
        this.loggingService.logError(aiError as Error, 'MarketDataController.checkAIHealth', {
          duration,
          status: 'unhealthy',
        });

        return {
          success: false,
          status: 'unhealthy',
          error: aiError.message,
          responseTime: duration,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(error as Error, 'MarketDataController.checkAIHealth', {
        duration,
        status: 'error',
      });

      return {
        success: false,
        status: 'error',
        error: error.message,
        responseTime: duration,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('health')
  async getHealth() {
    const startTime = Date.now();
    try {
      const exchangeInfo = await this.exchangeService.getExchangeInfo();
      const exchangeDuration = Date.now() - startTime;

      const aiAvailable = this.aiValidationService.isAvailable();

      return {
        success: true,
        exchange: {
          status: 'healthy',
          symbolsCount: exchangeInfo.symbols?.length || 0,
          responseTime: exchangeDuration,
        },
        ai: {
          status: aiAvailable ? 'healthy' : 'unavailable',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
