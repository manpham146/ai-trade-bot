import { Test, TestingModule } from '@nestjs/testing';
import { TechnicalIndicatorsService } from './technical-indicators.service';
import { LoggingService } from '../../logging/logging.service';
import { Candle } from '../schemas/candle.schema';

describe('TechnicalIndicatorsService', () => {
  let service: TechnicalIndicatorsService;
  let mockLoggingService: any;

  beforeEach(async () => {
    mockLoggingService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      logError: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicalIndicatorsService,
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    service = module.get<TechnicalIndicatorsService>(TechnicalIndicatorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateIndicators', () => {
    it('should throw error when insufficient candle data', async () => {
      const insufficientCandles: Partial<Candle>[] = Array(10).fill(null).map((_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000),
        symbol: 'BTC/USDT',
        timeframe: '1h',
        open: 50000,
        high: 51000,
        low: 49500,
        close: 50800,
        volume: 1000,
      } as Candle));

      try {
        await service.calculateIndicators(insufficientCandles as Candle[]);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Insufficient candle data');
      }
    });

    it('should calculate technical indicators with sufficient data', async () => {
      const sufficientCandles: Partial<Candle>[] = Array(40).fill(null).map((_, i) => ({
        timestamp: new Date(Date.now() - (39 - i) * 3600000), // Oldest first
        symbol: 'BTC/USDT',
        timeframe: '1h',
        open: 50000 + i * 100,
        high: 51000 + i * 100,
        low: 49500 + i * 100,
        close: 50800 + i * 100,
        volume: 1000 + i * 50,
      } as Candle));

      const result = await service.calculateIndicators(sufficientCandles as Candle[]);

      expect(result).toBeDefined();
      expect(result.rsi).toBeDefined();
      expect(result.macd).toBeDefined();
      expect(result.macd.MACD).toBeDefined();
      expect(result.macd.signal).toBeDefined();
      expect(result.macd.histogram).toBeDefined();
      expect(result.volumeMA).toBeDefined();
      expect(result.rsi).toBeGreaterThanOrEqual(0);
      expect(result.rsi).toBeLessThanOrEqual(100);
    });

    it('should calculate RSI correctly for oversold conditions', async () => {
      // Create candles with declining prices (oversold)
      const decliningCandles: Partial<Candle>[] = Array(40).fill(null).map((_, i) => ({
        timestamp: new Date(Date.now() - (39 - i) * 3600000),
        symbol: 'BTC/USDT',
        timeframe: '1h',
        open: 50000 - i * 200,
        high: 51000 - i * 200,
        low: 49500 - i * 200,
        close: 50800 - i * 200,
        volume: 1000,
      } as Candle));

      const result = await service.calculateIndicators(decliningCandles as Candle[]);
      
      // RSI should be low for declining prices
      expect(result.rsi).toBeLessThan(50);
    });

    it('should calculate RSI correctly for overbought conditions', async () => {
      // Create candles with rising prices (overbought)
      const risingCandles: Partial<Candle>[] = Array(40).fill(null).map((_, i) => ({
        timestamp: new Date(Date.now() - (39 - i) * 3600000),
        symbol: 'BTC/USDT',
        timeframe: '1h',
        open: 50000 + i * 200,
        high: 51000 + i * 200,
        low: 49500 + i * 200,
        close: 50800 + i * 200,
        volume: 1000,
      } as Candle));

      const result = await service.calculateIndicators(risingCandles as Candle[]);
      
      // RSI should be high for rising prices
      expect(result.rsi).toBeGreaterThan(50);
    });
  });

  describe('getRequiredHistory', () => {
    it('should return correct required history length', () => {
      const requiredHistory = service.getRequiredHistory();
      expect(requiredHistory).toBe(36); // Based on MACD slow period (26) + signal period (9) + 1
    });
  });
});