import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { Candle, CandleSchema } from './schemas/candle.schema';
import { Trade, TradeSchema } from './schemas/trade.schema';
import { ExchangeService } from './services/exchange.service';
import { CandlesService } from './services/candles.service';
import { MarketDataService } from './services/market-data.service';
import { BotOrchestratorService } from './services/bot-orchestrator.service';
import { TechnicalIndicatorsService } from './services/technical-indicators.service';
import { TechnicalAnalysisService } from './services/technical-analysis.service';
import { AiService } from './services/ai.service';
import { TradingService } from './services/trading.service';
import { AIValidationService } from './services/ai-validation.service';
import { TradingSignalService } from './services/trading-signal.service';
import { MarketDataController } from './market-data.controller';
import { DashboardController } from './dashboard.controller';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Candle.name, schema: CandleSchema }, { name: Trade.name, schema: TradeSchema }]),
    ScheduleModule.forRoot(), // Enable cron jobs
    LoggingModule,
  ],
  controllers: [MarketDataController, DashboardController],
  providers: [
    ExchangeService,
    CandlesService,
    MarketDataService,
    BotOrchestratorService,
    TechnicalIndicatorsService,
    TechnicalAnalysisService,
    AiService,
    TradingService,
    AIValidationService,
    TradingSignalService,
  ],
  exports: [
    ExchangeService,
    CandlesService,
    MarketDataService,
    BotOrchestratorService,
    TechnicalIndicatorsService,
    TechnicalAnalysisService,
    AiService,
    TradingService,
    AIValidationService,
    TradingSignalService,
  ],
})
export class MarketDataModule {}
