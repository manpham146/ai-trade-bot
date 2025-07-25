import * as ccxt from 'ccxt';
import * as cron from 'node-cron';
import MarketAnalyzer from './MarketAnalyzer.js';
import AIPredictor from '../ai/AIPredictor.js';
import RiskManager from './RiskManager.js';
import Logger from '../utils/Logger.js';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * TradingBot - Class chính điều khiển toàn bộ hoạt động giao dịch
 * Tích hợp AI để đưa ra quyết định mua/bán thông minh
 * Phiên bản cập nhật với web dashboard và logging cải tiến
 */

interface BotConfig {
    exchange: string;
    symbol: string;
    apiKey: string;
    secret: string;
    passphrase: string;
    sandbox: boolean;
}

interface Position {
    entryPrice: number;
    entryTime: number;
    stopLoss?: number;
    takeProfit?: number;
    amount: number;
    side: 'BUY' | 'SELL';
    id?: string;
}

interface TradingStats {
    totalTrades: number;
    winTrades: number;
    lossTrades: number;
    totalProfit: number;
    startBalance: number;
    currentBalance: number;
    winRate: number;
    dailyProfit: number;
    weeklyProfit: number;
    roi: number;
}

interface MarketData {
    symbol: string;
    price: number;
    currentPrice: number;
    volume: number;
    timestamp: number;
    ohlcv: [number, number, number, number, number, number][];
}

interface TechnicalAnalysis {
    rsi: number;
    macd: {
        macd: number;
        signal: number;
        histogram: number;
    };
    bollinger: {
        upper: number;
        middle: number;
        lower: number;
    };
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
}

interface AIPrediction {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    rawPrediction: number;
    timestamp: number;
    note?: string;
}

interface RiskAssessment {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    score: number;
    factors: string[];
    recommendations: string[];
    positionSizing: number;
    stopLoss: number;
    takeProfit: number;
    error?: string;
}

interface TradingDecision {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    amount?: number;
    price?: number;
    reasoning: string;
}

interface Trade {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    amount: number;
    price: number;
    timestamp: number;
    profit?: number;
    profitPercentage?: number;
}

class TradingBot {
    private config: BotConfig;
    private exchange: ccxt.Exchange | null = null;
    private marketAnalyzer: MarketAnalyzer;
    private aiPredictor: AIPredictor;
    private riskManager: RiskManager;
    private isRunning: boolean = false;
    private currentPosition: Position | null = null;
    private tradingEnabled: boolean;
    private lastMarketData: MarketData | null = null;
    private lastAIPrediction: AIPrediction | null = null;
    private lastTechnicalAnalysis: TechnicalAnalysis | null = null;
    private cronJob: cron.ScheduledTask | null = null;
    private dataPath: string;

    // Thống kê
    private stats: TradingStats = {
        totalTrades: 0,
        winTrades: 0,
        lossTrades: 0,
        totalProfit: 0,
        startBalance: 0,
        currentBalance: 0,
        winRate: 0,
        dailyProfit: 0,
        weeklyProfit: 0,
        roi: 0
    };

    constructor(config: BotConfig) {
        this.config = config;
        this.marketAnalyzer = new MarketAnalyzer();
        this.aiPredictor = new AIPredictor();
        this.riskManager = new RiskManager();
        this.tradingEnabled = process.env.TRADING_ENABLED === 'true';

        // Lưu trữ dữ liệu cho dashboard
        this.dataPath = path.join(__dirname, '../../data');
        this.ensureDataDirectory();
    }

    /**
     * Khởi tạo kết nối với sàn giao dịch
     */
    async initializeExchange(): Promise<void> {
        try {
            Logger.info(`🔗 Đang kết nối với sàn ${this.config.exchange.toUpperCase()}...`);

            this.exchange = new ccxt.okx({
                apiKey: this.config.apiKey,
                secret: this.config.secret,
                password: this.config.passphrase,
                sandbox: this.config.sandbox
            });

            // Test kết nối
            const balance = await this.exchange.fetchBalance();
            this.stats.startBalance = balance.USDT?.free || 0;
            this.stats.currentBalance = this.stats.startBalance;

            Logger.info(`✅ Kết nối thành công! Balance: ${this.stats.currentBalance} USDT`);
        } catch (error) {
            Logger.error('❌ Lỗi kết nối sàn giao dịch:', error as Error);
            throw error;
        }
    }

    /**
     * Khởi động bot
     */
    async start(): Promise<void> {
        try {
            Logger.info('🚀 Đang khởi động Trading Bot...');

            await this.initializeExchange();
            await this.loadData();

            this.isRunning = true;

            // Chạy phân tích ngay lập tức
            await this.analyzeAndTrade();

            // Lên lịch chạy mỗi 5 phút
            this.cronJob = cron.schedule('*/5 * * * *', async () => {
                if (this.isRunning) {
                    await this.analyzeAndTrade();
                }
            });

            Logger.info('✅ Bot đã khởi động thành công!');
        } catch (error) {
            Logger.error('❌ Lỗi khởi động bot:', error as Error);
            throw error;
        }
    }

    /**
     * Phân tích thị trường và thực hiện giao dịch
     */
    async analyzeAndTrade(): Promise<void> {
        try {
            Logger.info('📊 Bắt đầu phân tích thị trường...');

            // 1. Lấy dữ liệu thị trường
            const marketData = await this.getMarketData();
            this.lastMarketData = marketData;

            // 2. Phân tích kỹ thuật
            const technicalAnalysis = await this.marketAnalyzer.analyze(marketData);
            this.lastTechnicalAnalysis = technicalAnalysis;

            // 3. Dự đoán AI
            const aiPrediction = await this.aiPredictor.predict(marketData);
            this.lastAIPrediction = aiPrediction;
            await this.saveAIPrediction(aiPrediction);

            // 4. Đánh giá rủi ro
            const riskAssessment = await this.riskManager.assess({
                marketData,
                technicalAnalysis,
                aiPrediction,
                currentPosition: this.currentPosition || undefined
            });

            // 5. Đưa ra quyết định
            const decision = this.makeDecision({
                technical: technicalAnalysis,
                ai: aiPrediction,
                risk: riskAssessment
            });

            Logger.info(`🎯 Quyết định: ${decision.action} (Confidence: ${(decision.confidence * 100).toFixed(1)}%)`);
            Logger.info(`💭 Lý do: ${decision.reasoning}`);

            // 6. Thực hiện giao dịch (nếu được bật)
            if (this.tradingEnabled && decision.action !== 'HOLD') {
                await this.executeTrade(decision);
            }

            // 7. Lưu dữ liệu
            await this.saveData();
            this.updateStats();
            this.printStats();

        } catch (error) {
            Logger.error('❌ Lỗi trong quá trình phân tích:', error as Error);
        }
    }

    /**
     * Lấy dữ liệu thị trường
     */
    async getMarketData(): Promise<MarketData> {
        if (!this.exchange) {
            throw new Error('Exchange not initialized');
        }

        const ticker = await this.exchange.fetchTicker(this.config.symbol);
        const ohlcv = await this.exchange.fetchOHLCV(this.config.symbol, '1h', undefined, 100);

        return {
            symbol: this.config.symbol,
            price: ticker.last || 0,
            currentPrice: ticker.last || 0,
            volume: ticker.baseVolume || 0,
            timestamp: Date.now(),
            ohlcv: ohlcv as [number, number, number, number, number, number][]
        };
    }

    /**
     * Đưa ra quyết định giao dịch
     */
    makeDecision({ technical, ai, risk }: {
        technical: TechnicalAnalysis;
        ai: AIPrediction;
        risk: RiskAssessment;
    }): TradingDecision {
        // Nếu rủi ro quá cao, không giao dịch
        if (risk.level === 'HIGH') {
            return {
                action: 'HOLD',
                confidence: 0,
                reasoning: `Rủi ro quá cao (${risk.level})`
            };
        }

        // Kết hợp tín hiệu từ technical analysis và AI
        const signals = [technical.signal, ai.signal];
        const buySignals = signals.filter(s => s === 'BUY').length;
        const sellSignals = signals.filter(s => s === 'SELL').length;

        const avgConfidence = (technical.confidence + ai.confidence) / 2;

        if (buySignals >= 2 && avgConfidence > 0.7) {
            return {
                action: 'BUY',
                confidence: avgConfidence,
                amount: risk.positionSizing,
                reasoning: 'Tín hiệu mua mạnh từ cả technical và AI'
            };
        } else if (sellSignals >= 2 && avgConfidence > 0.7) {
            return {
                action: 'SELL',
                confidence: avgConfidence,
                reasoning: 'Tín hiệu bán mạnh từ cả technical và AI'
            };
        }

        return {
            action: 'HOLD',
            confidence: avgConfidence,
            reasoning: 'Tín hiệu không đủ mạnh hoặc mâu thuẫn'
        };
    }

    /**
     * Thực hiện giao dịch
     */
    async executeTrade(decision: TradingDecision): Promise<void> {
        try {
            if (decision.action === 'BUY' && !this.currentPosition) {
                await this.buy(decision.price || this.lastMarketData?.price || 0, decision.amount || 0);
            } else if (decision.action === 'SELL' && this.currentPosition) {
                await this.sell(decision.price || this.lastMarketData?.price || 0);
            }
        } catch (error) {
            Logger.error('❌ Lỗi thực hiện giao dịch:', error as Error);
        }
    }

    /**
     * Thực hiện lệnh mua
     */
    async buy(price: number, amount: number): Promise<void> {
        if (!this.exchange) {
            throw new Error('Exchange not initialized');
        }

        try {
            Logger.info(`📈 Thực hiện lệnh MUA: ${amount} ${this.config.symbol} @ ${price}`);

            const order = await this.exchange.createMarketBuyOrder(this.config.symbol, amount);

            this.currentPosition = {
                side: 'BUY',
                amount: order.amount || amount,
                entryPrice: order.price || price,
                entryTime: Date.now(),
                id: order.id
            };

            const trade: Trade = {
                id: order.id || '',
                symbol: this.config.symbol,
                side: 'BUY',
                amount: order.amount || amount,
                price: order.price || price,
                timestamp: Date.now()
            };

            await this.saveTrade(trade);
            Logger.trade('BUY', this.config.symbol, price, amount);

        } catch (error) {
            Logger.error('❌ Lỗi thực hiện lệnh mua:', error as Error);
            throw error;
        }
    }

    /**
     * Thực hiện lệnh bán
     */
    async sell(price: number): Promise<void> {
        if (!this.exchange || !this.currentPosition) {
            throw new Error('No position to sell or exchange not initialized');
        }

        try {
            Logger.info(`📉 Thực hiện lệnh BÁN: ${this.currentPosition.amount} ${this.config.symbol} @ ${price}`);

            const order = await this.exchange.createMarketSellOrder(
                this.config.symbol,
                this.currentPosition.amount
            );

            const profit = (this.currentPosition.entryPrice - price) * this.currentPosition.amount;
            const profitPercentage = (profit / (this.currentPosition.entryPrice * this.currentPosition.amount)) * 100;

            const trade: Trade = {
                id: order.id || '',
                symbol: this.config.symbol,
                side: 'SELL',
                amount: order.amount || this.currentPosition.amount,
                price: order.price || price,
                timestamp: Date.now(),
                profit,
                profitPercentage
            };

            await this.saveTrade(trade);

            if (profit > 0) {
                Logger.profit(profit, profitPercentage);
                this.stats.winTrades++;
            } else {
                Logger.loss(Math.abs(profit), Math.abs(profitPercentage));
                this.stats.lossTrades++;
            }

            this.stats.totalProfit += profit;
            this.currentPosition = null;

            Logger.trade('SELL', this.config.symbol, price, trade.amount);

        } catch (error) {
            Logger.error('❌ Lỗi thực hiện lệnh bán:', error as Error);
            throw error;
        }
    }

    /**
     * Dừng bot
     */
    async stop(): Promise<void> {
        Logger.info('🛑 Đang dừng Trading Bot...');
        this.isRunning = false;

        if (this.cronJob) {
            this.cronJob.stop();
        }

        await this.saveData();
        Logger.info('✅ Bot đã dừng thành công!');
    }

    /**
     * Đảm bảo thư mục data tồn tại
     */
    private async ensureDataDirectory(): Promise<void> {
        try {
            await fs.access(this.dataPath);
        } catch {
            await fs.mkdir(this.dataPath, { recursive: true });
            Logger.info(`📁 Đã tạo thư mục data: ${this.dataPath}`);
        }
    }

    /**
     * Lưu thông tin giao dịch
     */
    private async saveTrade(trade: Trade): Promise<void> {
        try {
            const tradesFile = path.join(this.dataPath, 'trades.json');
            let trades: Trade[] = [];

            try {
                const data = await fs.readFile(tradesFile, 'utf8');
                trades = JSON.parse(data);
            } catch {
                // File không tồn tại, tạo mới
            }

            trades.push(trade);
            await fs.writeFile(tradesFile, JSON.stringify(trades, null, 2));

            this.stats.totalTrades++;
            Logger.debug('💾 Đã lưu thông tin giao dịch');
        } catch (error) {
            Logger.error('❌ Lỗi lưu giao dịch:', error as Error);
        }
    }

    /**
     * Lưu dự đoán AI
     */
    private async saveAIPrediction(prediction: AIPrediction): Promise<void> {
        try {
            const predictionsFile = path.join(this.dataPath, 'ai_predictions.json');
            let predictions: (AIPrediction & { timestamp: number })[] = [];

            try {
                const data = await fs.readFile(predictionsFile, 'utf8');
                predictions = JSON.parse(data);
            } catch {
                // File không tồn tại, tạo mới
            }

            predictions.push({
                ...prediction,
                timestamp: Date.now()
            });

            // Chỉ giữ lại 1000 dự đoán gần nhất
            if (predictions.length > 1000) {
                predictions = predictions.slice(-1000);
            }

            await fs.writeFile(predictionsFile, JSON.stringify(predictions, null, 2));
            Logger.aiPrediction(prediction.signal, prediction.confidence);
        } catch (error) {
            Logger.error('❌ Lỗi lưu dự đoán AI:', error as Error);
        }
    }

    /**
     * Lưu dữ liệu tổng hợp
     */
    private async saveData(): Promise<void> {
        try {
            const data = {
                stats: this.stats,
                currentPosition: this.currentPosition,
                lastMarketData: this.lastMarketData,
                lastAIPrediction: this.lastAIPrediction,
                lastTechnicalAnalysis: this.lastTechnicalAnalysis,
                timestamp: Date.now()
            };

            const dataFile = path.join(this.dataPath, 'bot_data.json');
            await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            Logger.error('❌ Lỗi lưu dữ liệu:', error as Error);
        }
    }

    /**
     * Tải dữ liệu đã lưu
     */
    private async loadData(): Promise<void> {
        try {
            const dataFile = path.join(this.dataPath, 'bot_data.json');
            const data = await fs.readFile(dataFile, 'utf8');
            const parsedData = JSON.parse(data);

            this.stats = { ...this.stats, ...parsedData.stats };
            this.currentPosition = parsedData.currentPosition;
            this.lastMarketData = parsedData.lastMarketData;
            this.lastAIPrediction = parsedData.lastAIPrediction;
            this.lastTechnicalAnalysis = parsedData.lastTechnicalAnalysis;

            Logger.info('📂 Đã tải dữ liệu bot từ file');
        } catch {
            Logger.info('📂 Không tìm thấy dữ liệu cũ, bắt đầu mới');
        }
    }

    /**
     * Cập nhật thống kê
     */
    private updateStats(trade: Trade | null = null): void {
        if (trade && trade.profit !== undefined) {
            this.stats.totalProfit += trade.profit;
        }

        this.stats.winRate = this.stats.totalTrades > 0 ?
            (this.stats.winTrades / this.stats.totalTrades) * 100 : 0;

        this.stats.roi = this.stats.startBalance > 0 ?
            (this.stats.totalProfit / this.stats.startBalance) * 100 : 0;
    }

    /**
     * In thống kê
     */
    private printStats(): void {
        Logger.info('📊 === THỐNG KÊ TRADING BOT ===');
        Logger.info(`💰 Tổng lợi nhuận: ${this.stats.totalProfit.toFixed(2)} USDT`);
        Logger.info(`📈 Tỷ lệ thắng: ${this.stats.winRate.toFixed(1)}%`);
        Logger.info(`🎯 ROI: ${this.stats.roi.toFixed(2)}%`);
        Logger.info(`🔢 Tổng giao dịch: ${this.stats.totalTrades}`);
        Logger.info(`✅ Thắng: ${this.stats.winTrades} | ❌ Thua: ${this.stats.lossTrades}`);
    }

    // Getter methods for dashboard
    public getStats(): TradingStats {
        return { ...this.stats };
    }

    public getCurrentPosition(): Position | null {
        return this.currentPosition;
    }

    public getLastMarketData(): MarketData | null {
        return this.lastMarketData;
    }

    public getLastAIPrediction(): AIPrediction | null {
        return this.lastAIPrediction;
    }

    public getLastTechnicalAnalysis(): TechnicalAnalysis | null {
        return this.lastTechnicalAnalysis;
    }

    public isRunningStatus(): boolean {
        return this.isRunning;
    }
}

export default TradingBot;