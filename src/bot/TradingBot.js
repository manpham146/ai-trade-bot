const ccxt = require('ccxt');
const Logger = require('../utils/Logger');
const MarketAnalyzer = require('./MarketAnalyzer');
const AIPredictor = require('../ai/AIPredictor');
const RiskManager = require('./RiskManager');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

/**
 * TradingBot - Class chính điều khiển toàn bộ hoạt động giao dịch
 * Tích hợp AI để đưa ra quyết định mua/bán thông minh
 * Phiên bản cập nhật với web dashboard và logging cải tiến
 */

class TradingBot {
    constructor(config) {
        this.config = config;
        this.exchange = null;
        this.marketAnalyzer = new MarketAnalyzer();
        this.aiPredictor = new AIPredictor();
        this.riskManager = new RiskManager();
        this.isRunning = false;
        this.currentPosition = null;
        this.tradingEnabled = process.env.TRADING_ENABLED === 'true';
        this.lastMarketData = null;
        this.lastAIPrediction = null;
        this.lastTechnicalAnalysis = null;

        // Thống kê
        this.stats = {
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

        // Lưu trữ dữ liệu cho dashboard
        this.dataPath = path.join(__dirname, '../../data');
        this.ensureDataDirectory();
    }

    /**
     * Khởi tạo kết nối với sàn giao dịch
     */
    async initializeExchange() {
        try {
            Logger.info('🔗 Đang kết nối với OKX...');

            this.exchange = new ccxt.okx({
                apiKey: this.config.apiKey,
                secret: this.config.secret,
                password: this.config.passphrase,
                sandbox: this.config.sandbox,
                enableRateLimit: true,
                options: {
                    defaultType: 'spot' // Giao dịch spot
                }
            });

            // Test kết nối
            await this.exchange.loadMarkets();
            const balance = await this.exchange.fetchBalance();

            this.stats.startBalance = balance.USDT?.free || 0;
            this.stats.currentBalance = this.stats.startBalance;

            Logger.info('✅ Kết nối OKX thành công!');
            Logger.info(`💰 Số dư USDT: ${this.stats.currentBalance}`);

        } catch (error) {
            Logger.error('❌ Lỗi kết nối OKX:', error.message);
            throw error;
        }
    }

    /**
     * Khởi động bot
     */
    async start() {
        try {
            await this.initializeExchange();
            await this.aiPredictor.initialize();

            // Tải dữ liệu từ lần chạy trước
            await this.loadData();

            // Thiết lập global instance cho web dashboard
            global.botInstance = this;

            this.isRunning = true;

            // Lên lịch phân tích thị trường mỗi 5 phút
            cron.schedule('*/5 * * * *', async() => {
                if (this.isRunning) {
                    await this.analyzeAndTrade();
                }
            });

            // Chạy phân tích đầu tiên ngay lập tức
            await this.analyzeAndTrade();

            Logger.info('🚀 Bot đã khởi động thành công!');
            Logger.info(`📊 Cặp giao dịch: ${this.config.symbol}`);
            Logger.info(`💰 Số tiền giao dịch: $${this.config.tradeAmount}`);
            Logger.info(`🛡️ Stop Loss: ${this.config.stopLoss * 100}%`);
            Logger.info(`🎯 Take Profit: ${this.config.takeProfit * 100}%`);
            Logger.info(`⚙️ Chế độ: ${this.tradingEnabled ? 'LIVE TRADING' : 'DEMO MODE'}`);
            Logger.info(`🌐 Web Dashboard: http://localhost:${process.env.WEB_PORT || 3000}`);

        } catch (error) {
            Logger.error('❌ Lỗi khởi động bot:', error.message);
            throw error;
        }
    }

    /**
     * Phân tích thị trường và đưa ra quyết định giao dịch
     */
    async analyzeAndTrade() {
        try {
            Logger.info('📊 Đang phân tích thị trường...');

            // 1. Lấy dữ liệu thị trường
            const marketData = await this.getMarketData();
            this.lastMarketData = marketData;

            // 2. Phân tích kỹ thuật
            const technicalAnalysis = await this.marketAnalyzer.analyze(marketData);
            this.lastTechnicalAnalysis = technicalAnalysis;

            // 3. Dự đoán AI
            const aiPrediction = await this.aiPredictor.predict(marketData);
            this.lastAIPrediction = aiPrediction;

            // Lưu dự đoán AI
            await this.saveAIPrediction(aiPrediction);

            // 4. Đánh giá rủi ro
            const riskAssessment = await this.riskManager.assess({
                marketData,
                technicalAnalysis,
                aiPrediction,
                currentPosition: this.currentPosition
            });

            // 5. Đưa ra quyết định giao dịch
            const decision = this.makeDecision({
                technical: technicalAnalysis,
                ai: aiPrediction,
                risk: riskAssessment
            });

            Logger.aiPrediction(
                aiPrediction.signal,
                aiPrediction.confidence,
                { price: marketData.currentPrice, decision: decision.action }
            );

            // 6. Thực hiện giao dịch (nếu được bật)
            if (this.tradingEnabled && decision.action !== 'HOLD') {
                await this.executeTrade(decision);
            } else {
                Logger.info(`📋 Quyết định: ${decision.action} (${decision.reason})`);
            }

            // Lưu dữ liệu định kỳ
            await this.saveData();

        } catch (error) {
            Logger.error('❌ Lỗi phân tích thị trường:', error.message);
        }
    }

    /**
     * Lấy dữ liệu thị trường hiện tại
     */
    async getMarketData() {
        const ticker = await this.exchange.fetchTicker(this.config.symbol);
        const ohlcv = await this.exchange.fetchOHLCV(this.config.symbol, '5m', undefined, 100);
        const orderbook = await this.exchange.fetchOrderBook(this.config.symbol);

        return {
            symbol: this.config.symbol,
            currentPrice: ticker.last,
            volume: ticker.baseVolume,
            change24h: ticker.percentage,
            ohlcv: ohlcv,
            bid: orderbook.bids[0] ? orderbook.bids[0][0] : ticker.last,
            ask: orderbook.asks[0] ? orderbook.asks[0][0] : ticker.last,
            timestamp: Date.now()
        };
    }

    /**
     * Đưa ra quyết định giao dịch dựa trên tất cả các yếu tố
     */
    makeDecision({ technical, ai, risk }) {
        // Logic kết hợp AI và phân tích kỹ thuật
        const aiWeight = 0.6; // AI có trọng số 60%
        const technicalWeight = 0.4; // Kỹ thuật có trọng số 40%

        let score = 0;

        // Điểm từ AI
        if (ai.signal === 'BUY') { score += aiWeight * ai.confidence; } else if (ai.signal === 'SELL') { score -= aiWeight * ai.confidence; }

        // Điểm từ phân tích kỹ thuật
        if (technical.signal === 'BUY') { score += technicalWeight * technical.strength; } else if (technical.signal === 'SELL') { score -= technicalWeight * technical.strength; }

        // Áp dụng đánh giá rủi ro
        if (risk.level === 'HIGH') {
            return { action: 'HOLD', reason: 'Rủi ro cao' };
        }

        // Quyết định cuối cùng
        if (score > 0.5) {
            return { action: 'BUY', reason: `Tín hiệu mua mạnh (${(score * 100).toFixed(1)}%)`, confidence: score };
        } else if (score < -0.5) {
            return { action: 'SELL', reason: `Tín hiệu bán mạnh (${(Math.abs(score) * 100).toFixed(1)}%)`, confidence: Math.abs(score) };
        } else {
            return { action: 'HOLD', reason: 'Tín hiệu không rõ ràng' };
        }
    }

    /**
     * Thực hiện giao dịch
     */
    async executeTrade(decision) {
        try {
            const marketData = await this.getMarketData();
            const amount = parseFloat(process.env.TRADE_AMOUNT) || 10;

            let result = null;

            if (decision.action === 'BUY' && !this.currentPosition) {
                result = await this.buy(marketData.currentPrice, amount);
            } else if (decision.action === 'SELL' && this.currentPosition) {
                result = await this.sell(marketData.currentPrice);
            }

            if (result) {
                // Tính P&L cho giao dịch bán
                let pnl = 0;
                if (result.side === 'sell' && this.currentPosition) {
                    pnl = (result.price - this.currentPosition.entryPrice) * result.amount;
                    Logger.profit(`💰 P&L: $${pnl.toFixed(2)}`);
                }

                // Lưu giao dịch
                const trade = {
                    side: result.side,
                    amount: result.amount,
                    price: result.price,
                    cost: result.cost,
                    fee: result.fee,
                    pnl: pnl,
                    symbol: this.config.symbol
                };

                await this.saveTrade(trade);

                // Cập nhật thống kê
                this.updateStats(trade);
            }

        } catch (error) {
            Logger.error('❌ Lỗi thực hiện giao dịch:', error.message);
        }
    }

    /**
     * Thực hiện lệnh mua
     */
    async buy(price, amount) {
        try {
            const quantity = amount / price;

            Logger.trade('BUY', this.config.symbol, price, quantity.toFixed(6));

            // Thực hiện lệnh mua (chỉ khi không phải sandbox)
            if (!this.config.sandbox) {
                const order = await this.exchange.createMarketBuyOrder(this.config.symbol, quantity);
                Logger.info('✅ Lệnh mua đã được thực hiện:', order.id);
            }

            // Cập nhật vị thế hiện tại
            this.currentPosition = {
                type: 'LONG',
                entryPrice: price,
                quantity: quantity,
                entryTime: Date.now(),
                stopLoss: price * (1 - parseFloat(process.env.STOP_LOSS_PERCENTAGE) / 100),
                takeProfit: price * (1 + parseFloat(process.env.TAKE_PROFIT_PERCENTAGE) / 100)
            };

            this.stats.totalTrades++;

        } catch (error) {
            Logger.error('❌ Lỗi thực hiện lệnh mua:', error.message);
        }
    }

    /**
     * Thực hiện lệnh bán
     */
    async sell(price) {
        try {
            if (!this.currentPosition) { return; }

            const quantity = this.currentPosition.quantity;

            Logger.trade('SELL', this.config.symbol, price, quantity.toFixed(6));

            // Thực hiện lệnh bán (chỉ khi không phải sandbox)
            if (!this.config.sandbox) {
                const order = await this.exchange.createMarketSellOrder(this.config.symbol, quantity);
                Logger.info('✅ Lệnh bán đã được thực hiện:', order.id);
            }

            // Tính toán lợi nhuận/lỗ
            const profit = (price - this.currentPosition.entryPrice) * quantity;
            const profitPercentage = ((price - this.currentPosition.entryPrice) / this.currentPosition.entryPrice) * 100;

            if (profit > 0) {
                Logger.profit(profit.toFixed(2), profitPercentage.toFixed(2));
                this.stats.winTrades++;
            } else {
                Logger.loss(Math.abs(profit).toFixed(2), Math.abs(profitPercentage).toFixed(2));
                this.stats.lossTrades++;
            }

            this.stats.totalProfit += profit;
            this.stats.currentBalance += profit;

            // Reset vị thế
            this.currentPosition = null;

        } catch (error) {
            Logger.error('❌ Lỗi thực hiện lệnh bán:', error.message);
        }
    }

    /**
     * Dừng bot
     */
    async stop() {
        this.isRunning = false;
        Logger.info('🛑 Bot đã dừng hoạt động');

        // Lưu dữ liệu cuối cùng
        await this.saveData();

        // In thống kê cuối cùng
        this.printStats();
    }

    /**
     * Đảm bảo thư mục data tồn tại
     */
    async ensureDataDirectory() {
        try {
            await fs.mkdir(this.dataPath, { recursive: true });
        } catch (error) {
            Logger.error('❌ Lỗi tạo thư mục data:', error.message);
        }
    }

    /**
     * Lưu dữ liệu giao dịch
     */
    async saveTrade(trade) {
        try {
            const tradesFile = path.join(this.dataPath, 'trades.json');
            let trades = [];

            try {
                const data = await fs.readFile(tradesFile, 'utf8');
                trades = JSON.parse(data);
            } catch (error) {
                // File không tồn tại, tạo mới
            }

            trades.push({
                ...trade,
                timestamp: Date.now(),
                id: require('crypto').randomUUID()
            });

            // Giữ lại 1000 giao dịch gần nhất
            if (trades.length > 1000) {
                trades = trades.slice(-1000);
            }

            await fs.writeFile(tradesFile, JSON.stringify(trades, null, 2));
        } catch (error) {
            Logger.error('❌ Lỗi lưu giao dịch:', error.message);
        }
    }

    /**
     * Lưu dự đoán AI
     */
    async saveAIPrediction(prediction) {
        try {
            const predictionsFile = path.join(this.dataPath, 'predictions.json');
            let predictions = [];

            try {
                const data = await fs.readFile(predictionsFile, 'utf8');
                predictions = JSON.parse(data);
            } catch (error) {
                // File không tồn tại, tạo mới
            }

            predictions.push({
                ...prediction,
                timestamp: Date.now()
            });

            // Giữ lại 500 dự đoán gần nhất
            if (predictions.length > 500) {
                predictions = predictions.slice(-500);
            }

            await fs.writeFile(predictionsFile, JSON.stringify(predictions, null, 2));
        } catch (error) {
            Logger.error('❌ Lỗi lưu dự đoán AI:', error.message);
        }
    }

    /**
     * Lưu tất cả dữ liệu
     */
    async saveData() {
        try {
            const dataFile = path.join(this.dataPath, 'bot_data.json');
            const data = {
                stats: this.stats,
                lastMarketData: this.lastMarketData,
                lastAIPrediction: this.lastAIPrediction,
                lastTechnicalAnalysis: this.lastTechnicalAnalysis,
                currentPosition: this.currentPosition,
                isRunning: this.isRunning,
                timestamp: Date.now()
            };

            await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            Logger.error('❌ Lỗi lưu dữ liệu bot:', error.message);
        }
    }

    /**
     * Tải dữ liệu đã lưu
     */
    async loadData() {
        try {
            const dataFile = path.join(this.dataPath, 'bot_data.json');
            const data = await fs.readFile(dataFile, 'utf8');
            const parsedData = JSON.parse(data);

            // Khôi phục stats
            this.stats = { ...this.stats, ...parsedData.stats };
            this.currentPosition = parsedData.currentPosition;

            Logger.info('✅ Đã tải dữ liệu bot từ lần chạy trước');
        } catch (error) {
            Logger.info('ℹ️ Không tìm thấy dữ liệu cũ, bắt đầu mới');
        }
    }

    /**
     * Cập nhật thống kê
     */
    updateStats(trade = null) {
        if (trade) {
            this.stats.totalTrades++;

            if (trade.pnl > 0) {
                this.stats.winTrades++;
                this.stats.totalProfit += trade.pnl;
            } else if (trade.pnl < 0) {
                this.stats.lossTrades++;
                this.stats.totalProfit += trade.pnl;
            }
        }

        // Tính tỷ lệ thắng
        this.stats.winRate = this.stats.totalTrades > 0 ?
            (this.stats.winTrades / this.stats.totalTrades) * 100 : 0;

        // Tính ROI
        if (this.stats.startBalance > 0) {
            this.stats.roi = ((this.stats.currentBalance - this.stats.startBalance) / this.stats.startBalance) * 100;
        }
    }

    /**
     * In thống kê giao dịch
     */
    printStats() {
        const winRate = this.stats.totalTrades > 0 ? (this.stats.winTrades / this.stats.totalTrades * 100).toFixed(1) : 0;
        const totalReturn = this.stats.startBalance > 0 ? ((this.stats.currentBalance - this.stats.startBalance) / this.stats.startBalance * 100).toFixed(2) : 0;

        Logger.info('📊 THỐNG KÊ GIAO DỊCH:');
        Logger.info(`   Tổng số giao dịch: ${this.stats.totalTrades}`);
        Logger.info(`   Giao dịch thắng: ${this.stats.winTrades}`);
        Logger.info(`   Giao dịch thua: ${this.stats.lossTrades}`);
        Logger.info(`   Tỷ lệ thắng: ${winRate}%`);
        Logger.info(`   Lợi nhuận tổng: ${this.stats.totalProfit.toFixed(2)} USDT`);
        Logger.info(`   Tỷ suất sinh lời: ${totalReturn}%`);
    }
}

module.exports = TradingBot;
