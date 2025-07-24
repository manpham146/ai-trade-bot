const ccxt = require('ccxt');
const AIPredictor = require('../ai/AIPredictor');
const MarketAnalyzer = require('../bot/MarketAnalyzer');
const RiskManager = require('../bot/RiskManager');
const Logger = require('../utils/Logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * Backtest Engine
 * Kiểm thử chiến lược trading trên dữ liệu lịch sử
 */
class BacktestEngine {
    constructor(config = {}) {
        this.config = {
            symbol: config.symbol || 'BTC/USDT',
            timeframe: config.timeframe || '5m',
            startDate: config.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 ngày trước
            endDate: config.endDate || new Date(),
            initialBalance: config.initialBalance || 1000,
            tradeAmount: config.tradeAmount || 10,
            stopLoss: config.stopLoss || 0.02, // 2%
            takeProfit: config.takeProfit || 0.03, // 3%
            maxTradesPerDay: config.maxTradesPerDay || 3,
            ...config
        };

        this.marketAnalyzer = new MarketAnalyzer();
        this.aiPredictor = new AIPredictor();
        this.riskManager = new RiskManager();

        this.portfolio = {
            balance: this.config.initialBalance,
            btc: 0,
            totalValue: this.config.initialBalance,
            trades: [],
            dailyTrades: 0,
            lastTradeDate: null
        };

        this.results = {
            totalTrades: 0,
            winTrades: 0,
            lossTrades: 0,
            totalProfit: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            winRate: 0,
            avgProfit: 0,
            avgLoss: 0,
            profitFactor: 0,
            dailyReturns: []
        };
    }

    /**
     * Chạy backtest
     */
    async run() {
        try {
            Logger.info('🔄 Bắt đầu backtest...');
            Logger.info(`📅 Từ ${this.config.startDate.toDateString()} đến ${this.config.endDate.toDateString()}`);

            // Khởi tạo AI predictor
            await this.aiPredictor.initialize();

            // Lấy dữ liệu lịch sử
            const historicalData = await this.getHistoricalData();
            Logger.info(`📊 Đã tải ${historicalData.length} nến dữ liệu`);

            // Chạy simulation
            await this.simulate(historicalData);

            // Tính toán kết quả
            this.calculateResults();

            // Xuất báo cáo
            await this.generateReport();

            Logger.info('✅ Backtest hoàn thành!');
            return this.results;

        } catch (error) {
            Logger.error('❌ Lỗi backtest:', error.message);
            throw error;
        }
    }

    /**
     * Lấy dữ liệu lịch sử từ OKX
     */
    async getHistoricalData() {
        const exchange = new ccxt.okx({
            apiKey: process.env.OKX_API_KEY,
            secret: process.env.OKX_SECRET_KEY,
            password: process.env.OKX_PASSPHRASE,
            sandbox: process.env.OKX_SANDBOX === 'true'
        });

        const since = this.config.startDate.getTime();
        const limit = 1000;
        let allData = [];
        let currentSince = since;

        while (currentSince < this.config.endDate.getTime()) {
            const data = await exchange.fetchOHLCV(
                this.config.symbol,
                this.config.timeframe,
                currentSince,
                limit
            );

            if (data.length === 0) { break; }

            allData = allData.concat(data);
            currentSince = data[data.length - 1][0] + 1;

            // Tránh rate limit
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return allData.filter(candle =>
            candle[0] >= this.config.startDate.getTime() &&
            candle[0] <= this.config.endDate.getTime()
        );
    }

    /**
     * Chạy simulation trên dữ liệu lịch sử
     */
    async simulate(historicalData) {
        Logger.info('🎯 Bắt đầu simulation...');

        for (let i = 60; i < historicalData.length; i++) { // Bắt đầu từ nến thứ 60 để có đủ dữ liệu
            const currentCandle = historicalData[i];
            const currentTime = new Date(currentCandle[0]);
            const currentPrice = currentCandle[4]; // Close price

            // Cập nhật giá trị portfolio
            this.updatePortfolioValue(currentPrice);

            // Reset daily trades nếu sang ngày mới
            if (this.portfolio.lastTradeDate &&
                currentTime.toDateString() !== this.portfolio.lastTradeDate.toDateString()) {
                this.portfolio.dailyTrades = 0;
            }

            // Chuẩn bị dữ liệu cho phân tích
            const marketData = this.prepareMarketData(historicalData.slice(i - 60, i + 1));

            // Phân tích kỹ thuật
            const technicalAnalysis = await this.marketAnalyzer.analyze(marketData);

            // Dự đoán AI (giả lập)
            const aiPrediction = await this.simulateAIPrediction(marketData);

            // Đánh giá rủi ro
            const riskAssessment = await this.riskManager.assess({
                marketData,
                technicalAnalysis,
                aiPrediction,
                currentPosition: this.portfolio.btc > 0 ? 'LONG' : null,
                dailyTrades: this.portfolio.dailyTrades
            });

            // Đưa ra quyết định giao dịch
            const decision = this.makeDecision({
                technical: technicalAnalysis,
                ai: aiPrediction,
                risk: riskAssessment,
                currentPrice
            });

            // Thực hiện giao dịch
            if (decision.action !== 'HOLD') {
                await this.executeTrade(decision, currentTime, currentPrice);
            }

            // Log tiến độ
            if (i % 1000 === 0) {
                const progress = ((i / historicalData.length) * 100).toFixed(1);
                Logger.info(`📈 Tiến độ: ${progress}% - Portfolio: $${this.portfolio.totalValue.toFixed(2)}`);
            }
        }
    }

    /**
     * Chuẩn bị dữ liệu thị trường từ OHLCV
     */
    prepareMarketData(ohlcvData) {
        const latest = ohlcvData[ohlcvData.length - 1];

        return {
            symbol: this.config.symbol,
            price: latest[4], // Close price
            high: latest[2],
            low: latest[3],
            volume: latest[5],
            timestamp: latest[0],
            ohlcv: ohlcvData,
            bid: latest[4] * 0.999, // Giả lập bid/ask spread
            ask: latest[4] * 1.001
        };
    }

    /**
     * Giả lập dự đoán AI (vì không thể chạy AI thật trên dữ liệu lịch sử)
     */
    async simulateAIPrediction(marketData) {
        // Sử dụng một số chỉ báo đơn giản để giả lập AI
        const prices = marketData.ohlcv.map(candle => candle[4]);
        const sma20 = this.calculateSMA(prices, 20);
        const sma50 = this.calculateSMA(prices, 50);
        const rsi = this.calculateRSI(prices, 14);

        let signal = 'HOLD';
        let confidence = 0.5;

        // Logic đơn giản cho giả lập AI
        if (sma20 > sma50 && rsi < 70 && rsi > 30) {
            signal = 'BUY';
            confidence = 0.7;
        } else if (sma20 < sma50 && rsi > 30 && rsi < 70) {
            signal = 'SELL';
            confidence = 0.7;
        }

        return {
            signal,
            confidence,
            price: marketData.price,
            timestamp: marketData.timestamp
        };
    }

    /**
     * Đưa ra quyết định giao dịch
     */
    makeDecision({ technical, ai, risk, currentPrice }) {
        // Kiểm tra giới hạn giao dịch hàng ngày
        if (this.portfolio.dailyTrades >= this.config.maxTradesPerDay) {
            return { action: 'HOLD', reason: 'Đã đạt giới hạn giao dịch hàng ngày' };
        }

        // Kiểm tra rủi ro
        if (risk.level === 'HIGH') {
            return { action: 'HOLD', reason: 'Rủi ro cao' };
        }

        // Logic kết hợp AI và phân tích kỹ thuật
        const aiWeight = 0.6;
        const technicalWeight = 0.4;

        let score = 0;

        if (ai.signal === 'BUY') { score += aiWeight * ai.confidence; } else if (ai.signal === 'SELL') { score -= aiWeight * ai.confidence; }

        if (technical.signal === 'BUY') { score += technicalWeight * technical.strength; } else if (technical.signal === 'SELL') { score -= technicalWeight * technical.strength; }

        // Quyết định dựa trên điểm số
        if (score > 0.5 && this.portfolio.btc === 0) {
            return {
                action: 'BUY',
                amount: this.config.tradeAmount / currentPrice,
                price: currentPrice,
                reason: `Score: ${score.toFixed(2)}`
            };
        } else if (score < -0.5 && this.portfolio.btc > 0) {
            return {
                action: 'SELL',
                amount: this.portfolio.btc,
                price: currentPrice,
                reason: `Score: ${score.toFixed(2)}`
            };
        }

        return { action: 'HOLD', reason: 'Không đủ tín hiệu' };
    }

    /**
     * Thực hiện giao dịch trong backtest
     */
    async executeTrade(decision, timestamp, price) {
        const trade = {
            timestamp: timestamp.getTime(),
            side: decision.action.toLowerCase(),
            amount: decision.amount,
            price: price,
            cost: decision.amount * price,
            fee: decision.amount * price * 0.001, // 0.1% fee
            pnl: 0
        };

        if (decision.action === 'BUY') {
            if (this.portfolio.balance >= trade.cost + trade.fee) {
                this.portfolio.balance -= (trade.cost + trade.fee);
                this.portfolio.btc += trade.amount;
                trade.pnl = -(trade.cost + trade.fee);
            } else {
                return; // Không đủ tiền
            }
        } else if (decision.action === 'SELL') {
            if (this.portfolio.btc >= trade.amount) {
                this.portfolio.balance += (trade.cost - trade.fee);
                this.portfolio.btc -= trade.amount;

                // Tính P&L
                const buyTrade = this.portfolio.trades.slice().reverse().find(t => t.side === 'buy');
                if (buyTrade) {
                    trade.pnl = (trade.cost - trade.fee) - (buyTrade.cost + buyTrade.fee);
                }
            } else {
                return; // Không đủ BTC
            }
        }

        this.portfolio.trades.push(trade);
        this.portfolio.dailyTrades++;
        this.portfolio.lastTradeDate = new Date(timestamp);
        this.results.totalTrades++;

        if (trade.pnl > 0) {
            this.results.winTrades++;
        } else if (trade.pnl < 0) {
            this.results.lossTrades++;
        }
    }

    /**
     * Cập nhật giá trị portfolio
     */
    updatePortfolioValue(currentPrice) {
        this.portfolio.totalValue = this.portfolio.balance + (this.portfolio.btc * currentPrice);
    }

    /**
     * Tính toán kết quả backtest
     */
    calculateResults() {
        const finalValue = this.portfolio.totalValue;
        const initialValue = this.config.initialBalance;

        this.results.totalProfit = finalValue - initialValue;
        this.results.winRate = this.results.totalTrades > 0 ?
            (this.results.winTrades / this.results.totalTrades) * 100 : 0;

        // Tính toán các metrics khác
        const profits = this.portfolio.trades.filter(t => t.pnl > 0).map(t => t.pnl);
        const losses = this.portfolio.trades.filter(t => t.pnl < 0).map(t => Math.abs(t.pnl));

        this.results.avgProfit = profits.length > 0 ?
            profits.reduce((a, b) => a + b, 0) / profits.length : 0;
        this.results.avgLoss = losses.length > 0 ?
            losses.reduce((a, b) => a + b, 0) / losses.length : 0;

        this.results.profitFactor = this.results.avgLoss > 0 ?
            this.results.avgProfit / this.results.avgLoss : 0;

        // ROI
        this.results.roi = ((finalValue - initialValue) / initialValue) * 100;
    }

    /**
     * Tạo báo cáo backtest
     */
    async generateReport() {
        const report = {
            config: this.config,
            results: this.results,
            portfolio: this.portfolio,
            timestamp: new Date().toISOString()
        };

        // Lưu báo cáo
        const reportPath = path.join(__dirname, '../../data/backtest_report.json');
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        // In báo cáo
        console.log(`\n${'='.repeat(60)}`);
        console.log('📊 BÁO CÁO BACKTEST');
        console.log('='.repeat(60));
        console.log(`📅 Thời gian: ${this.config.startDate.toDateString()} - ${this.config.endDate.toDateString()}`);
        console.log(`💰 Vốn ban đầu: $${this.config.initialBalance}`);
        console.log(`💰 Giá trị cuối: $${this.portfolio.totalValue.toFixed(2)}`);
        console.log(`📈 Lợi nhuận: $${this.results.totalProfit.toFixed(2)} (${this.results.roi.toFixed(2)}%)`);
        console.log(`📊 Tổng giao dịch: ${this.results.totalTrades}`);
        console.log(`✅ Giao dịch thắng: ${this.results.winTrades}`);
        console.log(`❌ Giao dịch thua: ${this.results.lossTrades}`);
        console.log(`🎯 Tỷ lệ thắng: ${this.results.winRate.toFixed(2)}%`);
        console.log(`💵 Lợi nhuận TB: $${this.results.avgProfit.toFixed(2)}`);
        console.log(`💸 Lỗ TB: $${this.results.avgLoss.toFixed(2)}`);
        console.log(`⚖️ Profit Factor: ${this.results.profitFactor.toFixed(2)}`);
        console.log('='.repeat(60));

        Logger.info(`📄 Báo cáo đã được lưu tại: ${reportPath}`);
    }

    // Helper functions
    calculateSMA(prices, period) {
        if (prices.length < period) { return prices[prices.length - 1]; }
        const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
        return sum / period;
    }

    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) { return 50; }

        let gains = 0;
        let losses = 0;

        for (let i = prices.length - period; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            if (change > 0) { gains += change; } else { losses -= change; }
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;

        if (avgLoss === 0) { return 100; }

        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
}

// Chạy backtest nếu file được gọi trực tiếp
if (require.main === module) {
    const config = {
        symbol: process.env.TRADING_PAIR || 'BTC/USDT',
        timeframe: '5m',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 ngày trước
        endDate: new Date(),
        initialBalance: 1000,
        tradeAmount: 50,
        stopLoss: 0.02,
        takeProfit: 0.03,
        maxTradesPerDay: 5
    };

    const backtest = new BacktestEngine(config);
    backtest.run().catch(console.error);
}

module.exports = BacktestEngine;
