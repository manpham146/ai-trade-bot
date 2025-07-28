import MarketAnalyzer from '../src/bot/MarketAnalyzer';
import Logger from '../src/utils/Logger';

/**
 * Test script để kiểm tra chất lượng và lỗi của hàm generateSignals
 * Kiểm tra các trường hợp edge cases và logic xử lý
 */

interface MACDResult {
    macd: number;
    signal: number;
    histogram: number;
}

interface BollingerBands {
    upper: number;
    middle: number;
    lower: number;
}

interface StochasticResult {
    k: number;
    d: number;
}

interface TrendAnalysis {
    direction: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
    strength: 'STRONG' | 'WEAK' | 'MODERATE';
    support: number;
    resistance: number;
}

interface VolumeAnalysis {
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
    strength: 'HIGH' | 'MEDIUM' | 'LOW';
    avgVolume: number;
    currentVolume: number;
}

interface SignalData {
    rsi: number;
    macd: MACDResult;
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
    ema20: number;
    ma50_d1: number;
    ma200_d1: number;
    bollinger: BollingerBands;
    stochastic: StochasticResult;
    trend: TrendAnalysis;
    volumeAnalysis: VolumeAnalysis;
    currentPrice: number;
    dailyTrend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
}

class GenerateSignalsQualityTest {
    private analyzer: MarketAnalyzer;
    private testResults: { name: string; passed: boolean; error?: string; details?: any }[] = [];

    constructor() {
        this.analyzer = new MarketAnalyzer();
    }

    /**
     * Tạo dữ liệu test mẫu
     */
    private createTestData(overrides: Partial<SignalData> = {}): SignalData {
        const baseData: SignalData = {
            rsi: 50,
            macd: { macd: 0, signal: 0, histogram: 0 },
            sma20: 50000,
            sma50: 49000,
            ema12: 50100,
            ema26: 49900,
            ema20: 50050,
            ma50_d1: 49500,
            ma200_d1: 48000,
            bollinger: { upper: 52000, middle: 50000, lower: 48000 },
            stochastic: { k: 50, d: 50 },
            trend: { direction: 'UPTREND', strength: 'MODERATE', support: 48000, resistance: 52000 },
            volumeAnalysis: { trend: 'STABLE', strength: 'MEDIUM', avgVolume: 1000000, currentVolume: 1000000 },
            currentPrice: 50000,
            dailyTrend: 'UPTREND'
        };

        return { ...baseData, ...overrides };
    }

    /**
     * Test 1: Kiểm tra trường hợp SIDEWAYS market
     */
    private testSidewaysMarket(): void {
        try {
            const testData = this.createTestData({ dailyTrend: 'SIDEWAYS' });
            const result = (this.analyzer as any).generateSignals(testData);

            const passed = result.signal === 'HOLD' && 
                          result.confidence === 0 && 
                          result.reasoning.some((r: string) => r.includes('sideway'));

            this.testResults.push({
                name: 'Sideways Market Test',
                passed,
                details: { signal: result.signal, confidence: result.confidence, reasoning: result.reasoning }
            });
        } catch (error) {
            this.testResults.push({
                name: 'Sideways Market Test',
                passed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Test 2: Kiểm tra tín hiệu BUY trong uptrend
     */
    private testBuySignalUptrend(): void {
        try {
            const testData = this.createTestData({
                dailyTrend: 'UPTREND',
                currentPrice: 50050, // Gần EMA20
                ema20: 50000,
                rsi: 35, // < 50 cho LONG
                macd: { macd: 100, signal: 50, histogram: 50 }, // Bullish
                stochastic: { k: 15, d: 15 }, // Oversold
                sma20: 50000,
                sma50: 49000, // Price > SMA20 > SMA50
                volumeAnalysis: { trend: 'INCREASING', strength: 'HIGH', avgVolume: 1000000, currentVolume: 1500000 }
            });

            const result = (this.analyzer as any).generateSignals(testData);

            const passed = result.signal === 'BUY' && 
                          result.confidence > 0 && 
                          result.reasoning.some((r: string) => r.includes('LONG'));

            this.testResults.push({
                name: 'Buy Signal Uptrend Test',
                passed,
                details: { signal: result.signal, confidence: result.confidence, reasoning: result.reasoning }
            });
        } catch (error) {
            this.testResults.push({
                name: 'Buy Signal Uptrend Test',
                passed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Test 3: Kiểm tra tín hiệu SELL trong downtrend
     */
    private testSellSignalDowntrend(): void {
        try {
            const testData = this.createTestData({
                dailyTrend: 'DOWNTREND',
                currentPrice: 49950, // Gần EMA20
                ema20: 50000,
                rsi: 65, // > 50 cho SHORT
                macd: { macd: -100, signal: -50, histogram: -50 }, // Bearish
                stochastic: { k: 85, d: 85 }, // Overbought
                sma20: 50000,
                sma50: 51000, // Price < SMA20 < SMA50
                ma50_d1: 51000,
                ma200_d1: 52000, // Downtrend D1
                volumeAnalysis: { trend: 'INCREASING', strength: 'HIGH', avgVolume: 1000000, currentVolume: 1500000 }
            });

            const result = (this.analyzer as any).generateSignals(testData);

            const passed = result.signal === 'SELL' && 
                          result.confidence > 0 && 
                          result.reasoning.some((r: string) => r.includes('SHORT'));

            this.testResults.push({
                name: 'Sell Signal Downtrend Test',
                passed,
                details: { signal: result.signal, confidence: result.confidence, reasoning: result.reasoning }
            });
        } catch (error) {
            this.testResults.push({
                name: 'Sell Signal Downtrend Test',
                passed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Test 4: Kiểm tra Bollinger Bands safety check
     */
    private testBollingerBandsSafety(): void {
        try {
            // Test BUY signal bị hủy do giá > Bollinger Upper
            const testDataBuy = this.createTestData({
                dailyTrend: 'UPTREND',
                currentPrice: 52500, // > Bollinger Upper
                ema20: 52400,
                rsi: 35,
                macd: { macd: 100, signal: 50, histogram: 50 },
                stochastic: { k: 15, d: 15 },
                bollinger: { upper: 52000, middle: 50000, lower: 48000 }
            });

            const resultBuy = (this.analyzer as any).generateSignals(testDataBuy);

            // Test SELL signal bị hủy do giá < Bollinger Lower
            const testDataSell = this.createTestData({
                dailyTrend: 'DOWNTREND',
                currentPrice: 47500, // < Bollinger Lower
                ema20: 47550, // Gần currentPrice để thỏa mãn pullback condition
                rsi: 65,
                macd: { macd: -100, signal: -50, histogram: -50 },
                stochastic: { k: 85, d: 85 },
                sma20: 48000,
                sma50: 49000, // currentPrice < sma20 < sma50 để có đủ sell signals
                bollinger: { upper: 52000, middle: 50000, lower: 48000 },
                ma50_d1: 51000,
                ma200_d1: 52000
            });

            const resultSell = (this.analyzer as any).generateSignals(testDataSell);

            const passed = resultBuy.signal === 'HOLD' && 
                          resultSell.signal === 'HOLD' &&
                          resultBuy.reasoning.some((r: string) => r.includes('Bollinger Upper')) &&
                          resultSell.reasoning.some((r: string) => r.includes('Bollinger Lower'));

            this.testResults.push({
                name: 'Bollinger Bands Safety Test',
                passed,
                details: { 
                    buyResult: { signal: resultBuy.signal, reasoning: resultBuy.reasoning },
                    sellResult: { signal: resultSell.signal, reasoning: resultSell.reasoning }
                }
            });
        } catch (error) {
            this.testResults.push({
                name: 'Bollinger Bands Safety Test',
                passed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Test 5: Kiểm tra confidence calculation
     */
    private testConfidenceCalculation(): void {
        try {
            const testData = this.createTestData({
                dailyTrend: 'UPTREND',
                currentPrice: 50050,
                ema20: 50000,
                rsi: 25, // Oversold
                macd: { macd: 100, signal: 50, histogram: 50 }, // Bullish
                stochastic: { k: 15, d: 15 }, // Oversold
                sma20: 50000,
                sma50: 49000, // Bullish MA
                volumeAnalysis: { trend: 'INCREASING', strength: 'HIGH', avgVolume: 1000000, currentVolume: 1500000 }
            });

            const result = (this.analyzer as any).generateSignals(testData);

            // Với 4/4 buy signals (100%), confidence base = 0.8, + 0.1 cho volume = 0.9
            const expectedConfidence = 0.9;
            const confidenceOk = Math.abs(result.confidence - expectedConfidence) < 0.1;
            const maxConfidenceOk = result.confidence <= 1.0;

            const passed = result.signal === 'BUY' && confidenceOk && maxConfidenceOk;

            this.testResults.push({
                name: 'Confidence Calculation Test',
                passed,
                details: { 
                    signal: result.signal, 
                    confidence: result.confidence, 
                    expected: expectedConfidence,
                    reasoning: result.reasoning
                }
            });
        } catch (error) {
            this.testResults.push({
                name: 'Confidence Calculation Test',
                passed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Test 6: Kiểm tra edge cases với dữ liệu không hợp lệ
     */
    private testEdgeCases(): void {
        try {
            // Test với RSI = NaN
            const testDataNaN = this.createTestData({
                rsi: NaN,
                dailyTrend: 'UPTREND'
            });

            const resultNaN = (this.analyzer as any).generateSignals(testDataNaN);

            // Test với giá âm
            const testDataNegative = this.createTestData({
                currentPrice: -1000,
                dailyTrend: 'UPTREND'
            });

            const resultNegative = (this.analyzer as any).generateSignals(testDataNegative);

            // Test với EMA20 = 0
            const testDataZeroEMA = this.createTestData({
                ema20: 0,
                dailyTrend: 'UPTREND'
            });

            const resultZeroEMA = (this.analyzer as any).generateSignals(testDataZeroEMA);

            // Kiểm tra function không crash và trả về kết quả hợp lệ
            const passed = resultNaN && resultNegative && resultZeroEMA &&
                          ['BUY', 'SELL', 'HOLD'].includes(resultNaN.signal) &&
                          ['BUY', 'SELL', 'HOLD'].includes(resultNegative.signal) &&
                          ['BUY', 'SELL', 'HOLD'].includes(resultZeroEMA.signal);

            this.testResults.push({
                name: 'Edge Cases Test',
                passed,
                details: {
                    nanResult: resultNaN?.signal,
                    negativeResult: resultNegative?.signal,
                    zeroEMAResult: resultZeroEMA?.signal
                }
            });
        } catch (error) {
            this.testResults.push({
                name: 'Edge Cases Test',
                passed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Test 7: Kiểm tra EMA20 pullback logic
     */
    private testEMA20PullbackLogic(): void {
        try {
            // Test khi giá quá xa EMA20 (> 0.2%)
            const testDataFarFromEMA = this.createTestData({
                dailyTrend: 'UPTREND',
                currentPrice: 50200, // 0.4% xa EMA20
                ema20: 50000,
                rsi: 35,
                macd: { macd: 100, signal: 50, histogram: 50 },
                stochastic: { k: 15, d: 15 },
                sma20: 50000,
                sma50: 49000
            });

            const resultFar = (this.analyzer as any).generateSignals(testDataFarFromEMA);

            // Test khi giá gần EMA20 (<= 0.2%)
            const testDataNearEMA = this.createTestData({
                dailyTrend: 'UPTREND',
                currentPrice: 50050, // 0.1% gần EMA20
                ema20: 50000,
                rsi: 35,
                macd: { macd: 100, signal: 50, histogram: 50 },
                stochastic: { k: 15, d: 15 },
                sma20: 50000,
                sma50: 49000
            });

            const resultNear = (this.analyzer as any).generateSignals(testDataNearEMA);

            const passed = resultFar.signal === 'HOLD' && // Xa EMA20 -> HOLD
                          resultNear.signal === 'BUY' && // Gần EMA20 -> BUY
                          resultFar.reasoning.some((r: string) => r.includes('Chờ điều kiện'));

            this.testResults.push({
                name: 'EMA20 Pullback Logic Test',
                passed,
                details: {
                    farFromEMA: { signal: resultFar.signal, reasoning: resultFar.reasoning },
                    nearEMA: { signal: resultNear.signal, reasoning: resultNear.reasoning }
                }
            });
        } catch (error) {
            this.testResults.push({
                name: 'EMA20 Pullback Logic Test',
                passed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Chạy tất cả các test
     */
    public async runAllTests(): Promise<void> {
        Logger.info('🧪 Bắt đầu kiểm tra chất lượng hàm generateSignals...');
        
        this.testSidewaysMarket();
        this.testBuySignalUptrend();
        this.testSellSignalDowntrend();
        this.testBollingerBandsSafety();
        this.testConfidenceCalculation();
        this.testEdgeCases();
        this.testEMA20PullbackLogic();

        this.generateReport();
    }

    /**
     * Tạo báo cáo kết quả test
     */
    private generateReport(): void {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(test => test.passed).length;
        const failedTests = totalTests - passedTests;

        Logger.info('\n📊 BÁO CÁO KIỂM TRA CHẤT LƯỢNG GENERATE SIGNALS');
        Logger.info('=' .repeat(60));
        Logger.info(`Tổng số test: ${totalTests}`);
        Logger.info(`✅ Passed: ${passedTests}`);
        Logger.info(`❌ Failed: ${failedTests}`);
        Logger.info(`📈 Tỷ lệ thành công: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        Logger.info('=' .repeat(60));

        this.testResults.forEach((test, index) => {
            const status = test.passed ? '✅' : '❌';
            Logger.info(`${index + 1}. ${status} ${test.name}`);
            
            if (!test.passed && test.error) {
                Logger.error(`   Lỗi: ${test.error}`);
            }
            
            if (test.details) {
                Logger.info(`   Chi tiết: ${JSON.stringify(test.details, null, 2)}`);
            }
        });

        Logger.info('\n🎯 KẾT LUẬN:');
        if (passedTests === totalTests) {
            Logger.info('🎉 Tất cả test đều PASS! Hàm generateSignals hoạt động tốt.');
        } else {
            Logger.warn(`⚠️  Có ${failedTests} test FAILED. Cần kiểm tra và sửa lỗi.`);
        }
    }
}

// Chạy test
const tester = new GenerateSignalsQualityTest();
tester.runAllTests().catch(error => {
    Logger.error('Lỗi khi chạy test:', error);
    process.exit(1);
});