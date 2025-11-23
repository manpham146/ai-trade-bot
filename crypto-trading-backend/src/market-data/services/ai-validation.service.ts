import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Candle } from '../schemas/candle.schema';
import { TechnicalIndicators } from './technical-indicators.service';
import { LoggingService } from '../../logging/logging.service';
import { withRetry } from '../../common/utils/retry.utils';

export interface AIValidationRequest {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  indicators: TechnicalIndicators;
  marketContext: {
    trend: string;
    volatility: number;
    volumeAnalysis: string;
  };
}

export interface AIValidationResponse {
  action: 'BUY' | 'SELL' | 'WAIT';
  confidence: number; // 0-100
  reason: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedStopLoss?: number;
  suggestedTakeProfit?: number;
}

@Injectable()
export class AIValidationService {
  private readonly logger = new Logger(AIValidationService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;
  private readonly aiTimeout = 10000; // 10 seconds timeout
  private readonly minConfidence = 80; // Minimum confidence threshold
  private readonly nodeEnv: string | undefined;

  constructor(
    private configService: ConfigService,
    private loggingService: LoggingService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const modelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
    this.nodeEnv = this.configService.get<string>('NODE_ENV') || process.env.NODE_ENV;
    if (this.nodeEnv === 'test') {
      this.logger.warn('AI disabled in test environment');
      this.genAI = null;
      this.model = null;
      return;
    }
    if (!apiKey || apiKey === 'your-gemini-api-key') {
      this.logger.warn('Gemini API key not configured. AI validation will be disabled.');
      this.genAI = null;
      this.model = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      try {
        this.model = this.genAI.getGenerativeModel({ model: modelName });
        this.logger.log(`Gemini model initialized: ${modelName}`);
      } catch (e) {
        this.logger.error(`Failed to initialize Gemini model '${modelName}': ${e.message}`);
        this.model = null;
      }
    }
  }

  /**
   * Validate trading signal using AI analysis
   * @param request AI validation request
   * @returns AI validation response
   */
  async validateSignal(request: AIValidationRequest): Promise<AIValidationResponse> {
    const startTime = Date.now();
    
    try {
      this.loggingService.log('Starting AI validation', 'AIValidationService', {
        symbol: request.symbol,
        timeframe: request.timeframe,
        candleCount: request.candles.length,
        indicators: request.indicators,
      });

      if (!this.model) {
        const reason = this.nodeEnv === 'test'
          ? 'AI validation error: AI disabled in test environment'
          : 'AI validation disabled - API key not configured';
        this.logger.warn(reason);
        return {
          action: 'WAIT',
          confidence: 0,
          reason,
          riskLevel: 'MEDIUM',
        };
      }

      // Prepare the prompt for AI analysis
      const prompt = this.buildAnalysisPrompt(request);
      
      this.logger.log(`Sending AI validation request for ${request.symbol} (${request.timeframe})`);

      const systemPrompt = `You are an expert cryptocurrency trading analyst. Analyze the provided market data and technical indicators to make trading decisions.

Rules:
1. Only recommend BUY if confidence is ≥ ${this.minConfidence}%
2. Consider multiple factors: price action, volume, indicators, market context
3. Provide clear reasoning for your decision
4. Suggest appropriate stop loss and take profit levels
5. Assess risk level based on market conditions

Response must be valid JSON with this exact structure:
{
  "action": "BUY" | "SELL" | "WAIT",
  "confidence": 0-100,
  "reason": "detailed analysis",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "suggestedStopLoss": number (optional),
  "suggestedTakeProfit": number (optional)
}`;

      let aiResponse: string = '';
      try {
        const result = await withRetry(
          () => this.model.generateContent({
            contents: [{
              role: 'user',
              parts: [{ text: systemPrompt + '\n\n' + prompt }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500,
            },
          }),
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 15000,
            backoffFactor: 2,
            retryableErrors: ['timeout', 'network', 'connection', 'rate limit', 'too many requests', 'API key not valid'],
          },
          `AIValidation-${request.symbol}-${request.timeframe}`
        );

        const response = await (result as any).response;
        aiResponse = response.text();
      } catch (sdkError) {
        this.logger.warn(`SDK generateContent failed, using REST fallback: ${sdkError?.message}`);
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        const modelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
        const body = {
          contents: [
            {
              parts: [
                { text: systemPrompt + '\n\n' + prompt }
              ]
            }
          ]
        };
        const res = await (global as any).fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        aiResponse = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
      
      if (!aiResponse) {
        throw new Error('Empty AI response');
      }

      // Parse the AI response
      let parsedResponse: AIValidationResponse;
      try {
        const sanitized = aiResponse
          .replace(/^```json\n?/i, '')
          .replace(/^```\n?/i, '')
          .replace(/\n?```$/i, '')
          .trim();
        parsedResponse = JSON.parse(sanitized);
      } catch (parseError) {
        this.logger.error(`Failed to parse AI response: ${aiResponse}`);
        throw new Error(`Invalid AI response format: ${parseError.message}`);
      }

      // Validate the response structure
      this.validateAIResponse(parsedResponse);

      const duration = Date.now() - startTime;
      
      this.loggingService.log('AI validation completed', 'AIValidationService', {
        symbol: request.symbol,
        timeframe: request.timeframe,
        response: parsedResponse,
        duration,
      });

      this.logger.log(`AI validation completed in ${duration}ms: ${parsedResponse.action} (${parsedResponse.confidence}% confidence)`);
      
      return parsedResponse;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(error as Error, 'AIValidationService.validateSignal', {
        symbol: request.symbol,
        timeframe: request.timeframe,
        duration,
      });

      this.logger.error(`AI validation failed for ${request.symbol} (${request.timeframe}): ${error.message}`);
      
      // Return safe default on AI error
      return {
        action: 'WAIT',
        confidence: 0,
        reason: `AI validation error: ${error.message}`,
        riskLevel: 'MEDIUM',
      };
    }
  }

  /**
   * Build analysis prompt for AI
   */
  private buildAnalysisPrompt(request: AIValidationRequest): string {
    const { symbol, timeframe, candles, indicators, marketContext } = request;
    
    // Get latest candle data
    const latestCandle = candles[candles.length - 1];
    const previousCandle = candles[candles.length - 2];
    
    const priceChange = ((latestCandle.close - previousCandle.close) / previousCandle.close) * 100;
    const volumeChange = ((latestCandle.volume - previousCandle.volume) / previousCandle.volume) * 100;

    return `Analyze the following cryptocurrency market data for ${symbol} on ${timeframe} timeframe:

LATEST CANDLE DATA:
- Time: ${latestCandle.timestamp.toISOString()}
- Open: $${latestCandle.open.toFixed(2)}
- High: $${latestCandle.high.toFixed(2)}
- Low: $${latestCandle.low.toFixed(2)}
- Close: $${latestCandle.close.toFixed(2)}
- Volume: ${latestCandle.volume.toFixed(4)}
- Price Change: ${priceChange.toFixed(2)}%
- Volume Change: ${volumeChange.toFixed(2)}%

TECHNICAL INDICATORS:
- RSI(${indicators.rsi}): ${this.getRSIAnalysis(indicators.rsi)}
- MACD: ${indicators.macd.MACD.toFixed(4)} | Signal: ${indicators.macd.signal.toFixed(4)} | Histogram: ${indicators.macd.histogram.toFixed(4)}
- Volume MA(20): ${indicators.volumeMA.toFixed(4)}

MARKET CONTEXT:
- Trend: ${marketContext.trend}
- Volatility: ${marketContext.volatility.toFixed(2)}%
- Volume Analysis: ${marketContext.volumeAnalysis}

RECENT PRICE ACTION (Last 5 candles):
${this.getRecentPriceAction(candles.slice(-5))}

Based on this analysis, should we BUY, SELL, or WAIT? Provide your reasoning and confidence level.`;
  }

  /**
   * Get RSI analysis interpretation
   */
  private getRSIAnalysis(rsi: number): string {
    if (rsi > 70) return 'Overbought';
    if (rsi < 30) return 'Oversold';
    if (rsi > 50) return 'Bullish momentum';
    return 'Bearish momentum';
  }

  /**
   * Get recent price action summary
   */
  private getRecentPriceAction(recentCandles: Candle[]): string {
    return recentCandles.map((candle, index) => {
      const change = index > 0 ? ((candle.close - recentCandles[index - 1].close) / recentCandles[index - 1].close) * 100 : 0;
      return `  ${index + 1}. Close: $${candle.close.toFixed(2)} | Volume: ${candle.volume.toFixed(4)} | Change: ${change.toFixed(2)}%`;
    }).join('\n');
  }

  /**
   * Validate AI response structure
   */
  private validateAIResponse(response: any): void {
    const requiredFields = ['action', 'confidence', 'reason', 'riskLevel'];
    
    for (const field of requiredFields) {
      if (!(field in response)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate action
    const validActions = ['BUY', 'SELL', 'WAIT'];
    if (!validActions.includes(response.action)) {
      throw new Error(`Invalid action: ${response.action}. Must be one of: ${validActions.join(', ')}`);
    }

    // Validate confidence
    if (typeof response.confidence !== 'number' || response.confidence < 0 || response.confidence > 100) {
      throw new Error(`Invalid confidence: ${response.confidence}. Must be a number between 0-100`);
    }

    // Validate risk level
    const validRiskLevels = ['LOW', 'MEDIUM', 'HIGH'];
    if (!validRiskLevels.includes(response.riskLevel)) {
      throw new Error(`Invalid riskLevel: ${response.riskLevel}. Must be one of: ${validRiskLevels.join(', ')}`);
    }

    // Validate optional numeric fields
    if (response.suggestedStopLoss !== undefined && typeof response.suggestedStopLoss !== 'number') {
      throw new Error('suggestedStopLoss must be a number');
    }

    if (response.suggestedTakeProfit !== undefined && typeof response.suggestedTakeProfit !== 'number') {
      throw new Error('suggestedTakeProfit must be a number');
    }
  }

  /**
   * Check if AI validation is available (API key configured)
   */
  isAvailable(): boolean {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    return !!apiKey && apiKey !== 'your-gemini-api-key';
  }

  /**
   * Get minimum confidence threshold
   */
  getMinConfidence(): number {
    return this.minConfidence;
  }

  /**
   * Batch validate multiple signals
   */
  async validateSignalsBatch(requests: AIValidationRequest[]): Promise<AIValidationResponse[]> {
    const startTime = Date.now();
    
    this.loggingService.log('Starting batch AI validation', 'AIValidationService', {
      batchSize: requests.length,
    });

    const results = await Promise.allSettled(
      requests.map(request => this.validateSignal(request))
    );

    const responses = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        this.logger.error(`AI validation failed for request ${index}: ${result.reason}`);
        return {
          action: 'WAIT' as const,
          confidence: 0,
          reason: `AI validation error: ${result.reason}`,
          riskLevel: 'MEDIUM' as const,
        };
      }
    });

    const duration = Date.now() - startTime;
    const successful = responses.filter(r => r.confidence >= this.minConfidence).length;
    
    this.loggingService.log('Batch AI validation completed', 'AIValidationService', {
      total: requests.length,
      successful,
      failed: requests.length - successful,
      duration,
    });

    this.logger.log(`Processed ${requests.length} AI validations in ${duration}ms (${successful} successful)`);
    
    return responses;
  }
}
