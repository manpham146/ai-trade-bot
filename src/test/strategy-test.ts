import MarketAnalyzer from '../bot/MarketAnalyzer';
import RiskManager from '../bot/RiskManager';
import Logger from '../utils/Logger';

/**
 * Test chiến lược giao dịch mới
 * Kiểm tra logic trend following với MA50/MA200 và EMA20
 */
class StrategyTest {
    private marketAnalyzer: MarketAnalyzer;
    private riskManager: RiskManager;

    constructor() {
        this.marketAnalyzer = new MarketAnalyzer();
        this.riskManager = new RiskManager();
    }

    /**
     * Test dữ liệu mẫu cho BTC/USDT
     */
    private generateTestData() {
        // Dữ liệu giá mẫu cho test
        const prices = [];
        let basePrice = 45000;

        // Tạo 200 nến giá (cho MA200)
        for (let i = 0; i < 200; i++) {
            const variation = (Math.random() - 0.5) * 1000; // Biến động ±500
            basePrice += variation;

            prices.push({
                timestamp: Date.now() - (200 - i) * 3600000, // 1h mỗi nến
                open: basePrice - Math.random() * 100,
                high: basePrice + Math.random() * 200,
                low: basePrice - Math.random() * 200,
                close: basePrice,
                volume: 1000 + Math.random() * 500
            });
        }

        return prices;
    }

    /**
     * Test phân tích xu hướng D1
     */
    async testDailyTrendAnalysis(): Promise<any> {
        Logger.info('🧪 Test phân tích xu hướng D1...');

        const testData = this.generateTestData();
        const marketData = {
            symbol: 'BTC/USDT',
            price: testData[testData.length - 1].close,
            volume: testData[testData.length - 1].volume,
            timestamp: Date.now(),
            ohlcv: testData.map(d => [d.timestamp, d.open, d.high, d.low, d.close, d.volume])
        };
        const analysis = await this.marketAnalyzer.analyze(marketData);

        Logger.info('📊 Kết quả phân tích:');
        Logger.info(`- Xu hướng D1: ${(analysis as any).dailyTrend}`);
        Logger.info(`- MA50 D1: ${(analysis as any).ma50_d1?.toFixed(2)}`);
        Logger.info(`- MA200 D1: ${(analysis as any).ma200_d1?.toFixed(2)}`);
        Logger.info(`- EMA20 H1: ${(analysis as any).ema20?.toFixed(2)}`);
        Logger.info(`- Điều kiện vào lệnh: ${(analysis as any).entryCondition}`);
        Logger.info(`- Tín hiệu: ${analysis.signal}`);
        Logger.info(`- Độ tin cậy: ${(analysis.confidence * 100).toFixed(1)}%`);

        return analysis;
    }

    /**
     * Test quản lý rủi ro
     */
    async testRiskManagement() {
        Logger.info('🛡️ Test quản lý rủi ro...');

        const balance = 10000; // $10,000
        const entryPrice = 45000;
        const stopLoss = 44550; // 1% stop loss

        // Test position size calculation
        const safeSize = this.riskManager.calculateSafePositionSize(balance, entryPrice, stopLoss);
        const riskAmount = Math.abs(entryPrice - stopLoss) * (safeSize / entryPrice);
        const riskPercent = (riskAmount / balance) * 100;

        Logger.info(`💰 Tài khoản: $${balance.toLocaleString()}`);
        Logger.info(`📈 Giá vào lệnh: $${entryPrice.toLocaleString()}`);
        Logger.info(`🛑 Stop Loss: $${stopLoss.toLocaleString()}`);
        Logger.info(`📊 Position size an toàn: $${safeSize.toFixed(2)}`);
        Logger.info(`⚠️ Rủi ro thực tế: ${riskPercent.toFixed(3)}% (mục tiêu ≤ 0.5%)`);

        // Test weekly loss limit
        const weeklyProfit = -120; // Lỗ $120
        const withinLimit = this.riskManager.checkWeeklyLossLimit(balance, weeklyProfit);
        const weeklyLossPercent = (weeklyProfit / balance) * 100;

        Logger.info(`📅 Lỗ tuần: $${Math.abs(weeklyProfit)} (${weeklyLossPercent.toFixed(2)}%)`);
        Logger.info(`✅ Trong giới hạn 1.5%: ${withinLimit ? 'CÓ' : 'KHÔNG'}`);

        return {
            safeSize,
            riskPercent,
            withinLimit,
            weeklyLossPercent
        };
    }

    /**
     * Test tích hợp AI (mô phỏng)
     */
    async testAIIntegration(): Promise<any> {
        Logger.info('🤖 Test tích hợp AI...');

        // Mô phỏng dữ liệu AI
        const aiPrediction = {
            direction: 'UP' as const,
            confidence: 0.75,
            reasoning: 'Xu hướng tăng mạnh, RSI oversold, volume tăng'
        };

        const technicalSignal = await this.testDailyTrendAnalysis();

        // Logic xác nhận AI
        const aiConfirms =
            aiPrediction.confidence > 0.6 &&
            aiPrediction.direction === 'UP' &&
            technicalSignal.signal === 'BUY';

        Logger.info(`🎯 AI dự đoán: ${aiPrediction.direction}`);
        Logger.info(`🔍 Độ tin cậy AI: ${(aiPrediction.confidence * 100).toFixed(1)}%`);
        Logger.info(`📊 Tín hiệu kỹ thuật: ${technicalSignal.signal}`);
        Logger.info(`✅ AI xác nhận: ${aiConfirms ? 'CÓ' : 'KHÔNG'}`);

        return {
            aiPrediction,
            technicalSignal,
            aiConfirms
        };
    }

    /**
     * Test tổng hợp chiến lược
     */
    async runFullStrategyTest() {
        Logger.info('🚀 Bắt đầu test tổng hợp chiến lược mới...');
        Logger.info('='.repeat(50));

        try {
            // 1. Test phân tích kỹ thuật
            const technicalResult = await this.testDailyTrendAnalysis();
            Logger.info('');

            // 2. Test quản lý rủi ro
            const riskResult = await this.testRiskManagement();
            Logger.info('');

            // 3. Test tích hợp AI
            const aiResult = await this.testAIIntegration();
            Logger.info('');

            // 4. Kết luận
            Logger.info('📋 KẾT LUẬN TEST:');
            Logger.info('='.repeat(30));

            const canTrade =
                (technicalResult as any).dailyTrend !== 'SIDEWAYS' &&
                (technicalResult as any).entryCondition &&
                riskResult.riskPercent <= 0.5 &&
                riskResult.withinLimit &&
                aiResult.aiConfirms;

            if (canTrade) {
                Logger.info('✅ CHIẾN LƯỢC SẴN SÀNG GIAO DỊCH');
                Logger.info('🎯 Tất cả điều kiện đều thỏa mãn');
                Logger.info('💡 Có thể tiến hành Paper Trading');
            } else {
                Logger.info('⚠️ CHƯA ĐỦ ĐIỀU KIỆN GIAO DỊCH');
                Logger.info('🔍 Cần kiểm tra lại các điều kiện:');

                if ((technicalResult as any).dailyTrend === 'SIDEWAYS') {
                    Logger.info('  - Thị trường đang sideway');
                }
                if (!(technicalResult as any).entryCondition) {
                    Logger.info('  - Chưa có điều kiện vào lệnh');
                }
                if (riskResult.riskPercent > 0.5) {
                    Logger.info('  - Rủi ro vượt quá 0.5%');
                }
                if (!riskResult.withinLimit) {
                    Logger.info('  - Vượt giới hạn lỗ tuần');
                }
                if (!aiResult.aiConfirms) {
                    Logger.info('  - AI chưa xác nhận tín hiệu');
                }
            }

            Logger.info('='.repeat(50));
            Logger.info('✨ Hoàn thành test chiến lược!');
        } catch (error) {
            Logger.error('❌ Lỗi trong quá trình test:', (error as Error).message);
        }
    }
}

// Chạy test nếu file được gọi trực tiếp
if (require.main === module) {
    const test = new StrategyTest();
    test.runFullStrategyTest();
}

export { StrategyTest };
