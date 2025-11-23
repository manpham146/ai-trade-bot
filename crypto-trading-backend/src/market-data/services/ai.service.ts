import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LoggingService } from '../../logging/logging.service';
import { withRetry } from '../../common/utils/retry.utils';
import { AnalysisResult } from './technical-analysis.service';

export interface AiDecision {
  action: 'BUY' | 'WAIT';
  confidence: number;
  reason: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor(
    private configService: ConfigService,
    private loggingService: LoggingService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const modelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
    if (apiKey && apiKey !== 'your-gemini-api-key') {
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

  async validateSignal(symbol: string, analysis: AnalysisResult): Promise<AiDecision> {
    const startTime = Date.now();
    try {
      const prompt = this.buildPrompt(symbol, analysis);

      let aiText = '';
      if (this.model) {
        const result = await withRetry(
          () => this.model.generateContent({
            contents: [{
              role: 'user',
              parts: [{ text: prompt }],
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 300,
            },
          }),
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 15000,
            backoffFactor: 2,
            retryableErrors: ['timeout', 'network', 'connection', 'rate limit', 'too many requests', 'API key not valid'],
          },
          `AiService-${symbol}`
        );
        const response = await (result as any).response;
        aiText = response.text();
      } else {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        const modelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
        const body = {
          contents: [
            {
              parts: [
                { text: prompt }
              ],
            },
          ],
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
        aiText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      if (!aiText) {
        throw new Error('Empty AI response');
      }

      const decision = this.parseDecision(aiText);

      const duration = Date.now() - startTime;
      this.loggingService.log('AI decision completed', 'AiService', {
        symbol,
        analysis,
        decision,
        duration,
      });

      return decision;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.loggingService.logError(error as Error, 'AiService.validateSignal', {
        symbol,
        analysis,
        duration,
      });
      return {
        action: 'WAIT',
        confidence: 0,
        reason: `AI validation error: ${ (error as Error).message }`,
        riskLevel: 'MEDIUM',
      };
    }
  }

  private buildPrompt(symbol: string, a: AnalysisResult): string {
    const instructions = `Return STRICT JSON only with fields: {"action":"BUY"|"WAIT","confidence":0-100,"reason":"string","riskLevel":"LOW"|"MEDIUM"|"HIGH"}. No extra text.`;
    const context = `Symbol: ${symbol}\nRSI: ${a.rsi.toFixed(2)}\nMACD Histogram: ${a.macd.toFixed(4)}\nVolume Ratio: ${a.volumeRatio.toFixed(2)}\nPrice Change Body %: ${a.priceChangePct.toFixed(2)}\nPhase3 Signal: ${a.signal}`;
    const guidance = `Recommend BUY only if confidence ≥ 80 and metrics support strong upside per constraints. Otherwise respond WAIT.`;
    return `${instructions}\n\n${context}\n\n${guidance}`;
  }

  private parseDecision(text: string): AiDecision {
    const sanitized = text
      .replace(/^```json\n?/i, '')
      .replace(/^```\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();
    const obj = JSON.parse(sanitized);
    const required = ['action', 'confidence', 'reason', 'riskLevel'];
    for (const f of required) {
      if (!(f in obj)) throw new Error(`Missing field: ${f}`);
    }
    const act = obj.action;
    if (!['BUY', 'WAIT'].includes(act)) throw new Error(`Invalid action: ${act}`);
    let conf = Number(obj.confidence);
    if (!Number.isFinite(conf)) conf = 0;
    conf = Math.max(0, Math.min(100, conf));
    const rl = obj.riskLevel;
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(rl)) throw new Error(`Invalid riskLevel: ${rl}`);
    return {
      action: act,
      confidence: conf,
      reason: String(obj.reason),
      riskLevel: rl,
    };
  }
}

