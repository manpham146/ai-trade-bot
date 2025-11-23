import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TradingSignalService } from './trading-signal.service';
import { TechnicalIndicatorsService } from './technical-indicators.service';
import { AIValidationService } from './ai-validation.service';
import { CandlesService } from './candles.service';
import { LoggingService } from '../../logging/logging.service';
import { Candle } from '../schemas/candle.schema';

describe('TradingSignalService', () => {
  let service: TradingSignalService;
  let mockConfigService: any;
  let mockTechnicalIndicatorsService: any;
  let mockAIValidationService: any;
  let mockCandlesService: any;
  let mockLoggingService: any;

  // Define mock data at the top level for reuse across all tests
  const mockCandles: Partial<Candle>[] = Array(40).fill(null).map((_, i) => ({
    timestamp: new Date(Date.now() - (39 - i) * 3600000),
    symbol: 'BTC/USDT',
    timeframe: '1h',
    open: 50000 + i * 100,
    high: 51000 + i * 100,
    low: 49500 + i * 100,
    close: 50800 + i * 100,
    volume: 1000 + i * 50,
  } as Candle));

  const mockIndicators = {
    rsi: 45.5,
    macd: {
      MACD: 150.25,
      signal: 120.15,
      histogram: 30.10,
    },
    volumeMA: 1250.75,
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'TRADING_MODE') return 'PAPER';
        return null;
      }),
    };

    mockTechnicalIndicatorsService = {
      calculateIndicators: jest.fn(),
      getRequiredHistory: jest.fn(() => 36),
    };

    mockAIValidationService = {
      validateSignal: jest.fn(),
      isAvailable: jest.fn(() => true),
      getMinConfidence: jest.fn(() => 80),
    };

    mockCandlesService = {
      getCandles: jest.fn(),
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
        TradingSignalService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TechnicalIndicatorsService,
          useValue: mockTechnicalIndicatorsService,
        },
        {
          provide: AIValidationService,
          useValue: mockAIValidationService,
        },
        {
          provide: CandlesService,
          useValue: mockCandlesService,
        },
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    service = module.get<TradingSignalService>(TradingSignalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSignal', () => {
    const mockAIValidation = {
      action: 'BUY' as const,
      confidence: 85,
      reason: 'Strong bullish momentum',
      riskLevel: 'LOW' as const,
      suggestedStopLoss: 50000,
      suggestedTakeProfit: 52000,
    };

    beforeEach(() => {
      mockCandlesService.getCandles.mockResolvedValue(mockCandles as Candle[]);
      mockTechnicalIndicatorsService.calculateIndicators.mockResolvedValue(mockIndicators);
      mockAIValidationService.validateSignal.mockResolvedValue(mockAIValidation);
    });

    it('should generate signal successfully when all conditions are met', async () => {
      // Mock indicators that pass hard filter
      const passingIndicators = {
        rsi: 45, // Within 30-70 range
        macd: mockIndicators.macd,
        volumeMA: 1000,
      };
      
      // Create candles that meet all hard filter criteria - be very explicit
      const passingCandles = mockCandles.map((c, i) => {
        const baseClose = 50800 + i * 100;
        const baseVolume = 1200 + (i * 10);
        return {
          ...c,
          volume: baseVolume, // Volume ratio >= 1.2
          close: baseClose,
          open: baseClose,
        } as Candle;
      });
      
      // Ensure the last two candles have the right price change
      const lastIndex = passingCandles.length - 1;
      const secondLastIndex = passingCandles.length - 2;
      passingCandles[lastIndex].close = passingCandles[secondLastIndex].close * 1.02; // 2% price change (well above 0.5%)
      
      mockCandlesService.getCandles.mockResolvedValue(passingCandles);
      mockTechnicalIndicatorsService.calculateIndicators.mockResolvedValue(passingIndicators);

      const result = await service.generateSignal('BTC/USDT', '1h');

      expect(result).toBeDefined();
      expect(result.symbol).toBe('BTC/USDT');
      expect(result.timeframe).toBe('1h');
      expect(result.action).toBe('BUY');
      expect(result.confidence).toBe(85);
      expect(result.hardFilterPassed).toBe(true);
      expect(result.aiValidation).toEqual(mockAIValidation);
    });

    it('should return WAIT signal when hard filter fails', async () => {
      // Mock indicators that fail hard filter (RSI too low)
      const failingIndicators = {
        ...mockIndicators,
        rsi: 20, // Below 30 threshold
      };
      mockTechnicalIndicatorsService.calculateIndicators.mockResolvedValue(failingIndicators);

      const result = await service.generateSignal('BTC/USDT', '1h');

      expect(result).toBeDefined();
      expect(result.action).toBe('WAIT');
      expect(result.confidence).toBe(0);
      expect(result.hardFilterPassed).toBe(false);
      expect(result.reason).toContain('Hard filter criteria not met');
      expect(mockAIValidationService.validateSignal).not.toHaveBeenCalled();
    });

    it('should handle insufficient candle data', async () => {
      const insufficientCandles = Array(10).fill(null).map((_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000),
        symbol: 'BTC/USDT',
        timeframe: '1h',
        open: 50000,
        high: 51000,
        low: 49500,
        close: 50800,
        volume: 1000,
      } as Candle));
      mockCandlesService.getCandles.mockResolvedValue(insufficientCandles as Candle[]);

      // Should return WAIT signal instead of throwing error
      const result = await service.generateSignal('BTC/USDT', '1h');
      expect(result.action).toBe('WAIT');
      expect(result.confidence).toBe(0);
      expect(result.reason).toContain('Insufficient candle data');
    });

    it('should skip AI validation when AI service is unavailable', async () => {
      mockAIValidationService.isAvailable.mockReturnValue(false);

      const result = await service.generateSignal('BTC/USDT', '1h');

      expect(result).toBeDefined();
      expect(result.action).toBe('WAIT'); // Should be WAIT when AI is unavailable and no hard filter
      expect(result.aiValidation).toBeUndefined();
      expect(mockAIValidationService.validateSignal).not.toHaveBeenCalled();
    });

    it('should handle AI validation errors gracefully', async () => {
      // Ensure hard filter passes first
      const passingIndicators = {
        rsi: 45, // Within 30-70 range
        macd: mockIndicators.macd,
        volumeMA: 1000,
      };
      mockTechnicalIndicatorsService.calculateIndicators.mockResolvedValue(passingIndicators);
      
      // Create candles that meet all hard filter criteria - be more explicit
      const passingCandles = mockCandles.map((c, i) => {
        const baseClose = 50800 + i * 100;
        const baseVolume = 1200 + (i * 10);
        return {
          ...c,
          volume: baseVolume, // Volume ratio >= 1.2
          close: i >= 38 ? baseClose * 1.01 : baseClose, // Price change >= 1.0%
          open: baseClose,
        } as Candle;
      });
      
      // Ensure the last two candles have the right price change
      const lastIndex = passingCandles.length - 1;
      const secondLastIndex = passingCandles.length - 2;
      passingCandles[lastIndex].close = passingCandles[secondLastIndex].close * 1.01; // 1% price change
      
      mockCandlesService.getCandles.mockResolvedValue(passingCandles);
      
      mockAIValidationService.validateSignal.mockRejectedValue(new Error('AI API error'));

      const result = await service.generateSignal('BTC/USDT', '1h');

      expect(result).toBeDefined();
      expect(result.action).toBe('WAIT'); // Should be WAIT when AI fails
      expect(result.aiValidation).toBeUndefined();
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });

    it('should apply hard filter criteria correctly', async () => {
      // Test RSI filter
      const highRSI = { ...mockIndicators, rsi: 80 }; // Above 70
      mockTechnicalIndicatorsService.calculateIndicators.mockResolvedValue(highRSI);

      let result = await service.generateSignal('BTC/USDT', '1h');
      expect(result.hardFilterPassed).toBe(false);

      // Test volume filter
      const lowVolume = { ...mockIndicators, volumeMA: 2000 };
      const lowVolumeCandles = mockCandles.map(c => ({ ...c, volume: 100 })); // Low volume
      mockCandlesService.getCandles.mockResolvedValue(lowVolumeCandles);
      mockTechnicalIndicatorsService.calculateIndicators.mockResolvedValue(lowVolume);

      result = await service.generateSignal('BTC/USDT', '1h');
      expect(result.hardFilterPassed).toBe(false);
    });
  });

  describe('hard filter validation', () => {
    it('should fail hard filter when RSI is outside range', async () => {
      // Mock indicators with RSI outside range
      const highRSI = { ...mockIndicators, rsi: 80 }; // Above 70
      mockTechnicalIndicatorsService.calculateIndicators.mockResolvedValue(highRSI);

      const result = await service.generateSignal('BTC/USDT', '1h');
      expect(result.hardFilterPassed).toBe(false);
      expect(result.action).toBe('WAIT');
    });

    it('should fail hard filter when volume ratio is too low', async () => {
      // Mock low volume candles
      const lowVolumeCandles = mockCandles.map(c => ({ ...c, volume: 100 })); // Low volume
      mockCandlesService.getCandles.mockResolvedValue(lowVolumeCandles as Candle[]);

      const result = await service.generateSignal('BTC/USDT', '1h');
      expect(result.hardFilterPassed).toBe(false);
      expect(result.action).toBe('WAIT');
    });

    it('should pass hard filter when all criteria are met', async () => {
      // Mock indicators that pass all hard filter criteria
      const passingIndicators = {
        rsi: 45, // Within 30-70 range
        macd: mockIndicators.macd,
        volumeMA: 1000,
      };
      
      // Create candles that meet all hard filter criteria
      const passingCandles = mockCandles.map((c, i) => {
        const baseClose = 50800 + i * 100;
        const baseVolume = 1200 + (i * 10);
        return {
          ...c,
          volume: baseVolume, // Volume ratio >= 1.2 (1200/1000 = 1.2)
          close: baseClose,
          open: baseClose,
        } as Candle;
      });
      
      // Ensure the last two candles have the right price change
      const lastIndex = passingCandles.length - 1;
      const secondLastIndex = passingCandles.length - 2;
      passingCandles[lastIndex].close = passingCandles[secondLastIndex].close * 1.02; // 2% price change (well above 0.5%)
      
      mockCandlesService.getCandles.mockResolvedValue(passingCandles);
      mockTechnicalIndicatorsService.calculateIndicators.mockResolvedValue(passingIndicators);
      
      // Ensure AI validation is properly mocked for this test
      mockAIValidationService.validateSignal.mockResolvedValue({
        action: 'BUY' as const,
        confidence: 85,
        reason: 'Strong bullish momentum',
        riskLevel: 'LOW' as const,
        suggestedStopLoss: 50000,
        suggestedTakeProfit: 52000,
      });

      const result = await service.generateSignal('BTC/USDT', '1h');
      
      expect(result.hardFilterPassed).toBe(true);
      expect(result.action).toBe('BUY');
    });
  });
});