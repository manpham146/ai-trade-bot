import { AiService } from './ai.service';
import { ConfigService } from '@nestjs/config';
import { LoggingService } from '../../logging/logging.service';
import { AnalysisResult } from './technical-analysis.service';

describe('AiService', () => {
  let service: AiService;
  let mockConfig: any;
  let mockLogging: any;
  const originalFetch = (global as any).fetch;

  beforeEach(() => {
    mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return 'test-key';
        if (key === 'GEMINI_MODEL') return 'gemini-2.5-flash';
        return undefined;
      }),
    } as Partial<ConfigService>;

    mockLogging = {
      log: jest.fn(),
      logError: jest.fn(),
    } as Partial<LoggingService>;

    service = new AiService(mockConfig as any, mockLogging as any);
    // Force fallback REST
    (service as any).model = null;
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('parses strict JSON with code fences', async () => {
    const analysis: AnalysisResult = {
      rsi: 25,
      macd: 0.3,
      volumeRatio: 1.5,
      priceChangePct: 0.7,
      signal: 'BUY',
      reason: 'test',
    } as any;

    (global as any).fetch = jest.fn(async () => ({
      json: async () => ({
        candidates: [
          { content: { parts: [ { text: '```json\n{"action":"BUY","confidence":85,"reason":"Strong move","riskLevel":"MEDIUM"}\n```' } ] } }
        ]
      })
    }));

    const decision = await service.validateSignal('BTC/USDT', analysis);
    expect(decision.action).toBe('BUY');
    expect(decision.confidence).toBeGreaterThanOrEqual(80);
    expect(['LOW','MEDIUM','HIGH']).toContain(decision.riskLevel);
  });

  it('returns WAIT on empty AI response', async () => {
    const analysis: AnalysisResult = {
      rsi: 25,
      macd: 0.3,
      volumeRatio: 1.5,
      priceChangePct: 0.7,
      signal: 'BUY',
      reason: 'test',
    } as any;

    (global as any).fetch = jest.fn(async () => ({ json: async () => ({}) }));

    const decision = await service.validateSignal('BTC/USDT', analysis);
    expect(decision.action).toBe('WAIT');
    expect(decision.confidence).toBe(0);
    expect(decision.reason).toMatch(/AI validation error/);
  });
});

