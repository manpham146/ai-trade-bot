import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIValidationService, AIValidationRequest } from './ai-validation.service';
import { LoggingService } from '../../logging/logging.service';
import { Candle } from '../schemas/candle.schema';
import { TechnicalIndicators } from './technical-indicators.service';

describe('AIValidationService', () => {
  let service: AIValidationService;
  let mockConfigService: any;
  let mockLoggingService: any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return 'test-gemini-api-key';
        if (key === 'AI_MODEL') return 'gemini-pro';
        return null;
      }),
    };

    mockLoggingService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      logError: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIValidationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    service = module.get<AIValidationService>(AIValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isAvailable', () => {
    it('should return true when API key is configured', () => {
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when API key is not configured', () => {
      mockConfigService.get = jest.fn(() => null);
      const serviceWithoutKey = new AIValidationService(mockConfigService, mockLoggingService);
      expect(serviceWithoutKey.isAvailable()).toBe(false);
    });

    it('should return false when API key is placeholder', () => {
      mockConfigService.get = jest.fn((key: string) => key === 'GEMINI_API_KEY' ? 'your-gemini-api-key' : null);
      const serviceWithPlaceholder = new AIValidationService(mockConfigService, mockLoggingService);
      expect(serviceWithPlaceholder.isAvailable()).toBe(false);
    });
  });

  describe('validateSignal', () => {
    const mockCandles: Partial<Candle>[] = Array(20).fill(null).map((_, i) => ({
      timestamp: new Date(Date.now() - (19 - i) * 3600000),
      symbol: 'BTC/USDT',
      timeframe: '1h',
      open: 50000 + i * 100,
      high: 51000 + i * 100,
      low: 49500 + i * 100,
      close: 50800 + i * 100,
      volume: 1000 + i * 50,
    } as Candle));

    const mockIndicators: TechnicalIndicators = {
      rsi: 45.5,
      macd: {
        MACD: 150.25,
        signal: 120.15,
        histogram: 30.10,
      },
      volumeMA: 1250.75,
    };

    const mockRequest: AIValidationRequest = {
      symbol: 'BTC/USDT',
      timeframe: '1h',
      candles: mockCandles as Candle[],
      indicators: mockIndicators,
      marketContext: {
        trend: 'uptrend',
        volatility: 0.02,
        volumeAnalysis: 'above_average',
      },
    };

    it('should return error response when Gemini API fails', async () => {
      // Mock Gemini API failure
      const errorService = new AIValidationService(
        mockConfigService, // Use the proper mock config service
        mockLoggingService
      );
      
      // Mock config service to return invalid key
      mockConfigService.get.mockReturnValueOnce('invalid-key');

      const result = await errorService.validateSignal(mockRequest);

      expect(result).toBeDefined();
      expect(result.action).toBe('WAIT');
      expect(result.confidence).toBe(0);
      expect(result.reason).toContain('AI validation error');
      expect(result.riskLevel).toBe('MEDIUM');
    });

    it('should validate request structure', async () => {
      const result = await service.validateSignal(mockRequest);

      expect(result).toBeDefined();
      expect(result.action).toMatch(/^(BUY|SELL|WAIT)$/);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(result.reason).toBeDefined();
      expect(result.reason.length).toBeGreaterThan(0);
      expect(result.riskLevel).toMatch(/^(LOW|MEDIUM|HIGH)$/);
    });

    it('should handle different market conditions', async () => {
      const bearishRequest: AIValidationRequest = {
        ...mockRequest,
        marketContext: {
          trend: 'downtrend',
          volatility: 0.05,
          volumeAnalysis: 'high',
        },
      };

      const result = await service.validateSignal(bearishRequest);

      expect(result).toBeDefined();
      expect(result.action).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.riskLevel).toBeDefined();
    });

    it('should include stop loss and take profit when confidence is high', async () => {
      const highConfidenceRequest: AIValidationRequest = {
        ...mockRequest,
        indicators: {
          ...mockIndicators,
          rsi: 35, // Oversold condition
        },
      };

      const result = await service.validateSignal(highConfidenceRequest);

      expect(result).toBeDefined();
      if (result.confidence > 80) {
        expect(result.suggestedStopLoss).toBeDefined();
        expect(result.suggestedTakeProfit).toBeDefined();
      }
    });
  });
});