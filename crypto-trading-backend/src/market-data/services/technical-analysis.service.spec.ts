import { TechnicalAnalysisService } from './technical-analysis.service';
import { TechnicalIndicatorsService } from './technical-indicators.service';
import { CandlesService } from './candles.service';
import { LoggingService } from '../../logging/logging.service';

function makeCandles(count: number, opts?: { rsiLow?: boolean; macdPos?: boolean; volSpike?: boolean; bodyPct?: number }) {
  const candles: any[] = [];
  const baseOpen = 50000;
  for (let i = 0; i < count; i++) {
    const open = baseOpen + i * 10;
    const close = open + (opts?.bodyPct ? open * (opts.bodyPct / 100) : 60);
    candles.push({
      timestamp: new Date(Date.now() - (count - i) * 60_000),
      symbol: 'BTC/USDT',
      timeframe: '1h',
      open,
      high: close + 30,
      low: open - 30,
      close,
      volume: opts?.volSpike ? 2000 : 1000,
    });
  }
  return candles as any;
}

describe('TechnicalAnalysisService', () => {
  let service: TechnicalAnalysisService;
  let mockCandlesService: any;
  let mockIndicatorsService: any;
  let mockLogging: any;

  beforeEach(() => {
    mockCandlesService = { getCandles: jest.fn() } as Partial<CandlesService>;
    mockIndicatorsService = {
      calculateIndicators: jest.fn(),
    } as Partial<TechnicalIndicatorsService>;
    mockLogging = {
      log: jest.fn(),
      logError: jest.fn(),
    } as Partial<LoggingService>;

    service = new TechnicalAnalysisService(
      mockCandlesService as any,
      mockIndicatorsService as any,
      mockLogging as any,
    );
  });

  it('returns NEUTRAL when no candles', async () => {
    (mockCandlesService.getCandles as jest.Mock).mockResolvedValue([]);
    const res = await service.analyze('BTC/USDT', '1h');
    expect(res.signal).toBe('NEUTRAL');
    expect(res.reason).toMatch(/No candle data/);
  });

  it('returns BUY when strict criteria met', async () => {
    const candles = makeCandles(50, { volSpike: true, bodyPct: 0.6 });
    (mockCandlesService.getCandles as jest.Mock).mockResolvedValue(candles);
    (mockIndicatorsService.calculateIndicators as jest.Mock).mockReturnValue({
      rsi: 25,
      macd: { MACD: 1, signal: 0.5, histogram: 0.3 },
      volumeMA: 1000,
    });
    const res = await service.analyze('BTC/USDT', '1h');
    expect(res.signal).toBe('BUY');
  });

  it('returns SELL when RSI>70 and MACD histogram<0', async () => {
    const candles = makeCandles(50, { volSpike: false, bodyPct: 0.1 });
    (mockCandlesService.getCandles as jest.Mock).mockResolvedValue(candles);
    (mockIndicatorsService.calculateIndicators as jest.Mock).mockReturnValue({
      rsi: 75,
      macd: { MACD: -0.5, signal: -0.2, histogram: -0.3 },
      volumeMA: 1000,
    });
    const res = await service.analyze('BTC/USDT', '1h');
    expect(res.signal).toBe('SELL');
  });
});

