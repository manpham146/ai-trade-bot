import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trade, TradeDocument } from './schemas/trade.schema';
import { ExchangeService } from './services/exchange.service';
import { BotOrchestratorService } from './services/bot-orchestrator.service';
import { LoggingService } from '../logging/logging.service';

@Controller('api')
export class DashboardController {
  constructor(
    @InjectModel(Trade.name) private tradeModel: Model<TradeDocument>,
    private exchangeService: ExchangeService,
    private orchestrator: BotOrchestratorService,
    private loggingService: LoggingService,
  ) {}

  @Get('trades')
  async getTrades() {
    const trades = await this.tradeModel.find({}).sort({ openTime: -1 }).lean().exec();
    return { success: true, data: trades };
  }

  @Get('stats')
  async getStats() {
    const all = await this.tradeModel.find({}).lean().exec();
    const closed = all.filter(t => t.status === 'CLOSED');
    const open = all.filter(t => t.status === 'OPEN');
    const totalTrades = all.length;
    const wins = closed.filter(t => (t.pnl ?? 0) > 0).length;
    const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;
    let currentPnL = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    for (const t of open) {
      try {
        const current = await this.exchangeService.getCurrentPrice(t.symbol);
        currentPnL += (current - t.entryPrice) * t.size;
      } catch (e) {
        this.loggingService.logError(e as any, 'DashboardController.getStats', { symbol: t.symbol });
      }
    }
    const activePositionsCount = open.length;
    return { success: true, data: { totalTrades, winRate, currentPnL, activePositionsCount } };
  }

  @Get('status')
  async getStatus() {
    const status = await this.orchestrator.getStatus();
    return { success: true, data: status };
  }
}

