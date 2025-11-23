import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trade, TradeDocument } from '../schemas/trade.schema';
import { ExchangeService } from './exchange.service';
import { LoggingService } from '../../logging/logging.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);

  constructor(
    @InjectModel(Trade.name) private tradeModel: Model<TradeDocument>,
    private exchangeService: ExchangeService,
    private loggingService: LoggingService,
  ) {}

  async executeBuy(symbol: string, price?: number, size: number = 1) {
    try {
      const existing = await this.tradeModel.findOne({ symbol, status: 'OPEN' }).exec();
      if (existing) {
        this.logger.log(`Skip buy: existing OPEN trade for ${symbol}`);
        return { skipped: true };
      }

      const entryPrice = price ?? await this.getCurrentPriceSafe(symbol);
      const now = new Date();
      const trade = new this.tradeModel({
        symbol,
        entryPrice,
        size,
        status: 'OPEN',
        pnl: 0,
        openTime: now,
      });
      await trade.save();
      this.loggingService.log('Trade opened', 'TradingService', {
        symbol,
        entryPrice,
        size,
        openTime: now.toISOString(),
      });
      return { opened: true, tradeId: trade._id };
    } catch (error) {
      this.loggingService.logError(error as Error, 'TradingService.executeBuy', { symbol });
      throw error;
    }
  }

  @Cron('*/1 * * * *')
  async monitorPositions() {
    const start = Date.now();
    try {
      const openTrades = await this.tradeModel.find({ status: 'OPEN' }).exec();
      for (const t of openTrades) {
        const current = await this.getCurrentPriceSafe(t.symbol);
        const tp = t.entryPrice * 1.06;
        const sl = t.entryPrice * 0.97;
        if (current > tp || current < sl) {
          const pnl = (current - t.entryPrice) * t.size;
          t.status = 'CLOSED';
          t.pnl = pnl;
          t.closeTime = new Date();
          await t.save();
          this.loggingService.log('Trade closed', 'TradingService', {
            symbol: t.symbol,
            entryPrice: t.entryPrice,
            exitPrice: current,
            size: t.size,
            pnl,
            reason: current > tp ? 'TAKE_PROFIT' : 'STOP_LOSS',
          });
        }
      }
      const duration = Date.now() - start;
      this.logger.log(`Position monitor tick in ${duration}ms`);
    } catch (error) {
      this.loggingService.logError(error as Error, 'TradingService.monitorPositions');
    }
  }

  private async getCurrentPriceSafe(symbol: string): Promise<number> {
    try {
      const price = await (this.exchangeService as any).getCurrentPrice?.(symbol);
      if (typeof price === 'number' && price > 0) return price;
      // Fallback to last close from OHLCV
      const ohlcv = await this.exchangeService.fetchOHLCV(symbol, '1m', undefined, 1);
      return ohlcv[0]?.close ?? ohlcv[0]?.[4];
    } catch (e) {
      // Fallback hard if exchange fails
      const ohlcv = await this.exchangeService.fetchOHLCV(symbol, '1m', undefined, 1);
      return ohlcv[0]?.close ?? ohlcv[0]?.[4];
    }
  }
}

