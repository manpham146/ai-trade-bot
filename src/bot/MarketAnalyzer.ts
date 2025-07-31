import Logger from '../utils/Logger';

/**
 * MarketAnalyzer - Phân tích kỹ thuật thị trường
 * Tính toán các chỉ báo kỹ thuật phổ biến để hỗ trợ quyết định giao dịch
 */

interface MarketData {
    symbol: string;
    price: number;
    volume: number;
    timestamp: number;
    ohlcv?: number[][];
}

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

interface TechnicalAnalysis {
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
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string[];
    dailyTrend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
    entryCondition: boolean;
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

class MarketAnalyzer {
    private indicators: Record<string, any> = {};

    /**
     * Phân tích toàn diện dữ liệu thị trường
     */
    async analyze(marketData: MarketData): Promise<TechnicalAnalysis> {
        try {
            if (!marketData.ohlcv || marketData.ohlcv.length === 0) {
                throw new Error('OHLCV data is required for analysis');
            }

            const ohlcv = marketData.ohlcv;
            const closes = ohlcv.map(candle => candle[4]); // Giá đóng cửa
            const highs = ohlcv.map(candle => candle[2]); // Giá cao nhất
            const lows = ohlcv.map(candle => candle[3]); // Giá thấp nhất
            const volumes = ohlcv.map(candle => candle[5]); // Khối lượng

            // Tính toán các chỉ báo kỹ thuật
            const rsi = this.calculateRSI(closes, 14);
            const macd = this.calculateMACD(closes);
            const sma20 = this.calculateSMA(closes, 20);
            const sma50 = this.calculateSMA(closes, 50);
            const ema12 = this.calculateEMA(closes, 12);
            const ema26 = this.calculateEMA(closes, 26);
            const ema20 = this.calculateEMA(closes, 20);

            // Tính MA50 và MA200 cho D1 (giả sử dữ liệu hiện tại là H1)
            const ma50_d1 = this.calculateSMA(closes, 50);
            const ma200_d1 = this.calculateSMA(closes, 200);

            const bollinger = this.calculateBollingerBands(closes, 20, 2);
            const stochastic = this.calculateStochastic(highs, lows, closes, 14);

            // Phân tích xu hướng D1
            const dailyTrend = this.analyzeDailyTrend(marketData.price, ma50_d1, ma200_d1);

            // Phân tích xu hướng H1
            const trend = this.analyzeTrend(closes, sma20, sma50);

            // Phân tích khối lượng
            const volumeAnalysis = this.analyzeVolume(volumes, closes);

            // Kiểm tra điều kiện vào lệnh
            const entryCondition = this.checkEntryCondition(
                marketData.price,
                ema20,
                rsi,
                dailyTrend
            );

            // Tổng hợp tín hiệu
            const signals = this.generateSignals({
                rsi,
                macd,
                sma20,
                sma50,
                ema12,
                ema26,
                ema20,
                ma50_d1,
                ma200_d1,
                bollinger,
                stochastic,
                trend,
                volumeAnalysis,
                currentPrice: marketData.price,
                dailyTrend
            });

            const analysis: TechnicalAnalysis = {
                rsi,
                macd,
                sma20,
                sma50,
                ema12,
                ema26,
                ema20,
                ma50_d1,
                ma200_d1,
                bollinger,
                stochastic,
                trend,
                volumeAnalysis,
                signal: signals.signal,
                confidence: signals.confidence,
                reasoning: signals.reasoning,
                dailyTrend,
                entryCondition
            };

            Logger.debug('📊 Phân tích kỹ thuật hoàn thành', {
                signal: analysis.signal,
                confidence: analysis.confidence,
                rsi: analysis.rsi.toFixed(2),
                trend: analysis.trend.direction
            });

            return analysis;
        } catch (error) {
            Logger.error('❌ Lỗi phân tích thị trường:', error as Error);
            throw error;
        }
    }

    /**
     * Tính toán RSI (Relative Strength Index)
     */
    private calculateRSI(prices: number[], period: number = 14): number {
        if (prices.length < period + 1) {
            return 50; // Giá trị trung tính nếu không đủ dữ liệu
        }

        let gains = 0;
        let losses = 0;

        // Tính toán gains và losses ban đầu
        for (let i = 1; i <= period; i++) {
            const change = prices[i] - prices[i - 1];
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        // Tính toán RSI cho các giá trị tiếp theo
        for (let i = period + 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? Math.abs(change) : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
        }

        if (avgLoss === 0) {
            return 100;
        }
        const rs = avgGain / avgLoss;
        return 100 - 100 / (1 + rs);
    }

    /**
     * Tính toán MACD (Moving Average Convergence Divergence)
     */
    private calculateMACD(prices: number[]): MACDResult {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macd = ema12 - ema26;

        // Tính signal line (EMA 9 của MACD)
        const macdHistory = [];
        for (let i = 26; i < prices.length; i++) {
            const ema12_i = this.calculateEMAAtIndex(prices, 12, i);
            const ema26_i = this.calculateEMAAtIndex(prices, 26, i);
            macdHistory.push(ema12_i - ema26_i);
        }

        const signal = this.calculateEMA(macdHistory, 9);
        const histogram = macd - signal;

        return {
            macd,
            signal,
            histogram
        };
    }

    /**
     * Tính toán SMA (Simple Moving Average)
     */
    private calculateSMA(prices: number[], period: number): number {
        if (prices.length < period) {
            return prices[prices.length - 1] || 0;
        }

        const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
        return sum / period;
    }

    /**
     * Tính toán EMA (Exponential Moving Average)
     */
    private calculateEMA(prices: number[], period: number): number {
        if (prices.length === 0) {
            return 0;
        }
        if (prices.length < period) {
            return this.calculateSMA(prices, prices.length);
        }

        const multiplier = 2 / (period + 1);
        let ema = this.calculateSMA(prices.slice(0, period), period);

        for (let i = period; i < prices.length; i++) {
            ema = prices[i] * multiplier + ema * (1 - multiplier);
        }

        return ema;
    }

    /**
     * Tính toán EMA tại một index cụ thể
     */
    private calculateEMAAtIndex(prices: number[], period: number, index: number): number {
        if (index < period - 1) {
            return this.calculateSMA(prices.slice(0, index + 1), index + 1);
        }

        const multiplier = 2 / (period + 1);
        let ema = this.calculateSMA(prices.slice(0, period), period);

        for (let i = period; i <= index; i++) {
            ema = prices[i] * multiplier + ema * (1 - multiplier);
        }

        return ema;
    }

    /**
     * Tính toán Bollinger Bands
     */
    private calculateBollingerBands(
        prices: number[],
        period: number = 20,
        stdDev: number = 2
    ): BollingerBands {
        const sma = this.calculateSMA(prices, period);
        const recentPrices = prices.slice(-period);

        // Tính độ lệch chuẩn
        const variance =
            recentPrices.reduce((acc, price) => {
                return acc + Math.pow(price - sma, 2);
            }, 0) / period;

        const standardDeviation = Math.sqrt(variance);

        return {
            upper: sma + standardDeviation * stdDev,
            middle: sma,
            lower: sma - standardDeviation * stdDev
        };
    }

    /**
     * Tính toán Stochastic Oscillator
     */
    private calculateStochastic(
        highs: number[],
        lows: number[],
        closes: number[],
        period: number = 14
    ): StochasticResult {
        if (closes.length < period) {
            return { k: 50, d: 50 };
        }

        const recentHighs = highs.slice(-period);
        const recentLows = lows.slice(-period);
        const currentClose = closes[closes.length - 1];

        const highestHigh = Math.max(...recentHighs);
        const lowestLow = Math.min(...recentLows);

        const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;

        // Tính %D (SMA 3 của %K)
        const kValues = [];
        for (let i = period - 1; i < closes.length; i++) {
            const periodHighs = highs.slice(i - period + 1, i + 1);
            const periodLows = lows.slice(i - period + 1, i + 1);
            const periodHigh = Math.max(...periodHighs);
            const periodLow = Math.min(...periodLows);
            const kValue = ((closes[i] - periodLow) / (periodHigh - periodLow)) * 100;
            kValues.push(kValue);
        }

        const d = this.calculateSMA(kValues.slice(-3), 3);

        return { k, d };
    }

    /**
     * Phân tích xu hướng D1 dựa trên MA50 và MA200
     */
    private analyzeDailyTrend(
        currentPrice: number,
        ma50: number,
        ma200: number
    ): 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' {
        if (currentPrice > ma50 && ma50 > ma200) {
            return 'UPTREND';
        } else if (currentPrice < ma50 && ma50 < ma200) {
            return 'DOWNTREND';
        } else {
            return 'SIDEWAYS';
        }
    }

    /**
     * Kiểm tra điều kiện vào lệnh theo chiến lược mới (bao gồm sideway)
     */
    private checkEntryCondition(
        currentPrice: number,
        ema20: number,
        rsi: number,
        dailyTrend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS'
    ): boolean {
        // Điều kiện LONG: xu hướng tăng D1 + giá pullback về EMA20 + RSI < 40
        if (dailyTrend === 'UPTREND') {
            const nearEMA20 = Math.abs(currentPrice - ema20) / ema20 <= 0.002; // Trong vòng 0.2% của EMA20
            return nearEMA20 && rsi < 40;
        }

        // Điều kiện SHORT: xu hướng giảm D1 + giá hồi về EMA20 + RSI > 60
        if (dailyTrend === 'DOWNTREND') {
            const nearEMA20 = Math.abs(currentPrice - ema20) / ema20 <= 0.002; // Trong vòng 0.2% của EMA20
            return nearEMA20 && rsi > 60;
        }

        // Điều kiện SIDEWAYS: Cho phép giao dịch linh hoạt dựa trên tín hiệu ngắn hạn
        if (dailyTrend === 'SIDEWAYS') {
            const nearEMA20 = Math.abs(currentPrice - ema20) / ema20 <= 0.001; // Gần EMA20 hơn (0.1%)
            
            // LONG trong sideway: RSI oversold + gần EMA20
            const longCondition = nearEMA20 && rsi < 35; // RSI thấp hơn cho sideway
            
            // SHORT trong sideway: RSI overbought + gần EMA20
            const shortCondition = nearEMA20 && rsi > 65; // RSI cao hơn cho sideway
            
            return longCondition || shortCondition;
        }

        return false;
    }

    /**
     * Tạo tín hiệu giao dịch cho thị trường sideway
     */
    private generateSidewaySignals(data: SignalData, reasoning: string[]): {
        signal: 'BUY' | 'SELL' | 'HOLD';
        confidence: number;
        reasoning: string[];
    } {
        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = 0;

        // Kiểm tra điều kiện gần EMA20
        const nearEMA20 = Math.abs(data.currentPrice - data.ema20) / data.ema20 <= 0.001;
        reasoning.push(`Khoảng cách đến EMA20: ${((Math.abs(data.currentPrice - data.ema20) / data.ema20) * 100).toFixed(3)}%`);

        // Phân tích RSI cho sideway
        if (data.rsi < 35 && nearEMA20) {
            // Tín hiệu LONG trong sideway
            signal = 'BUY';
            confidence = 0.6; // Confidence thấp hơn cho sideway
            reasoning.push(`🎯 LONG Sideway: RSI oversold (${data.rsi.toFixed(1)}) + gần EMA20`);
            
            // Tăng confidence nếu có volume cao
            if (data.volumeAnalysis.strength === 'HIGH') {
                confidence += 0.1;
                reasoning.push('📊 Volume cao xác nhận tín hiệu');
            }
            
            // Kiểm tra MACD hỗ trợ
            if (data.macd.macd > data.macd.signal) {
                confidence += 0.1;
                reasoning.push('📈 MACD hỗ trợ tín hiệu tăng');
            }
            
        } else if (data.rsi > 65 && nearEMA20) {
            // Tín hiệu SHORT trong sideway
            signal = 'SELL';
            confidence = 0.6; // Confidence thấp hơn cho sideway
            reasoning.push(`🎯 SHORT Sideway: RSI overbought (${data.rsi.toFixed(1)}) + gần EMA20`);
            
            // Tăng confidence nếu có volume cao
            if (data.volumeAnalysis.strength === 'HIGH') {
                confidence += 0.1;
                reasoning.push('📊 Volume cao xác nhận tín hiệu');
            }
            
            // Kiểm tra MACD hỗ trợ
            if (data.macd.macd < data.macd.signal) {
                confidence += 0.1;
                reasoning.push('📉 MACD hỗ trợ tín hiệu giảm');
            }
            
        } else {
            // Chưa đủ điều kiện
            reasoning.push(`⏳ Chờ tín hiệu sideway: RSI cần < 35 hoặc > 65 (hiện tại: ${data.rsi.toFixed(1)})`);
            if (!nearEMA20) {
                reasoning.push('⏳ Chờ giá về gần EMA20 để vào lệnh');
            }
        }

        // Kiểm tra Bollinger Bands để tránh vùng cực đoan
        if (signal === 'BUY' && data.currentPrice <= data.bollinger.lower) {
            reasoning.push('⚠️ Giá ở Bollinger Lower - Tăng confidence');
            confidence += 0.1;
        } else if (signal === 'SELL' && data.currentPrice >= data.bollinger.upper) {
            reasoning.push('⚠️ Giá ở Bollinger Upper - Tăng confidence');
            confidence += 0.1;
        }

        // Giới hạn confidence tối đa cho sideway
        confidence = Math.min(confidence, 0.8);

        return { signal, confidence, reasoning };
    }

    /**
     * Phân tích xu hướng H1
     */
    private analyzeTrend(closes: number[], sma20: number, sma50: number): TrendAnalysis {
        const currentPrice = closes[closes.length - 1];
        const priceChange = closes.length > 1 ? currentPrice - closes[closes.length - 2] : 0;
        const recentPrices = closes.slice(-10);

        let direction: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
        let strength: 'STRONG' | 'WEAK' | 'MODERATE';

        // Xác định hướng xu hướng
        if (currentPrice > sma20 && sma20 > sma50) {
            direction = 'UPTREND';
        } else if (currentPrice < sma20 && sma20 < sma50) {
            direction = 'DOWNTREND';
        } else {
            direction = 'SIDEWAYS';
        }

        // Xác định độ mạnh xu hướng
        const priceChangePercent = Math.abs(priceChange / currentPrice) * 100;
        if (priceChangePercent > 2) {
            strength = 'STRONG';
        } else if (priceChangePercent > 0.5) {
            strength = 'MODERATE';
        } else {
            strength = 'WEAK';
        }

        // Tính support và resistance
        const support = Math.min(...recentPrices);
        const resistance = Math.max(...recentPrices);

        return {
            direction,
            strength,
            support,
            resistance
        };
    }

    /**
     * Phân tích khối lượng
     */
    private analyzeVolume(volumes: number[], closes: number[]): VolumeAnalysis {
        const currentVolume = volumes[volumes.length - 1];
        const avgVolume = this.calculateSMA(volumes, Math.min(20, volumes.length));

        const recentVolumes = volumes.slice(-5);
        const volumeTrend =
            recentVolumes[recentVolumes.length - 1] > recentVolumes[0]
                ? 'INCREASING'
                : 'DECREASING';

        let strength: 'HIGH' | 'MEDIUM' | 'LOW';
        if (currentVolume > avgVolume * 1.5) {
            strength = 'HIGH';
        } else if (currentVolume > avgVolume * 0.8) {
            strength = 'MEDIUM';
        } else {
            strength = 'LOW';
        }

        return {
            trend: volumeTrend,
            strength,
            avgVolume,
            currentVolume
        };
    }

    /**
     * Tổng hợp tín hiệu theo chiến lược mới: Giao dịch thuận xu hướng với xác nhận rõ ràng
     */
    private generateSignals(data: SignalData): {
        signal: 'BUY' | 'SELL' | 'HOLD';
        confidence: number;
        reasoning: string[];
    } {
        const reasoning: string[] = [];
        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = 0;

        // Bước 1: Kiểm tra xu hướng D1
        reasoning.push(`Xu hướng D1: ${data.dailyTrend}`);

        // Xử lý đặc biệt cho thị trường sideway
        if (data.dailyTrend === 'SIDEWAYS') {
            reasoning.push('📊 Thị trường sideway - Áp dụng chiến lược scalping');
            return this.generateSidewaySignals(data, reasoning);
        }

        // Bước 2: Tính điểm số từ các chỉ báo
        let buySignals = 0;
        let sellSignals = 0;
        let totalSignals = 0;

        // RSI Analysis
        totalSignals++;
        if (data.rsi < 30) {
            buySignals++;
            reasoning.push('RSI oversold (<30)');
        } else if (data.rsi > 70) {
            sellSignals++;
            reasoning.push('RSI overbought (>70)');
        } else {
            reasoning.push(`RSI neutral (${data.rsi.toFixed(1)})`);
        }

        // MACD Analysis
        totalSignals++;
        if (data.macd.macd > data.macd.signal && data.macd.histogram > 0) {
            buySignals++;
            reasoning.push('MACD bullish crossover');
        } else if (data.macd.macd < data.macd.signal && data.macd.histogram < 0) {
            sellSignals++;
            reasoning.push('MACD bearish crossover');
        } else {
            reasoning.push('MACD neutral');
        }

        // Moving Average Analysis
        totalSignals++;
        if (data.currentPrice > data.sma20 && data.sma20 > data.sma50) {
            buySignals++;
            reasoning.push('Price above MA20 > MA50 (bullish)');
        } else if (data.currentPrice < data.sma20 && data.sma20 < data.sma50) {
            sellSignals++;
            reasoning.push('Price below MA20 < MA50 (bearish)');
        } else {
            reasoning.push('Moving averages mixed');
        }

        // Stochastic Analysis
        totalSignals++;
        if (data.stochastic.k < 20 && data.stochastic.d < 20) {
            buySignals++;
            reasoning.push('Stochastic oversold');
        } else if (data.stochastic.k > 80 && data.stochastic.d > 80) {
            sellSignals++;
            reasoning.push('Stochastic overbought');
        } else {
            reasoning.push('Stochastic neutral');
        }

        // Bước 3: Kiểm tra điều kiện vào lệnh (EMA20 pullback)
        const nearEMA20 = Math.abs(data.currentPrice - data.ema20) / data.ema20 <= 0.002;

        // Bước 4: Kết hợp với điều kiện xu hướng và entry condition
        const buyRatio = buySignals / totalSignals;
        const sellRatio = sellSignals / totalSignals;

        if (data.dailyTrend === 'UPTREND') {
            reasoning.push(
                `✅ Xu hướng tăng D1: Giá (${data.currentPrice.toFixed(2)}) > MA50 (${data.ma50_d1.toFixed(2)}) > MA200 (${data.ma200_d1.toFixed(2)})`
            );

            // Điều kiện LONG: buyRatio >= 0.6 + pullback về EMA20 + RSI < 50
            if (buyRatio >= 0.6 && nearEMA20 && data.rsi < 50) {
                signal = 'BUY';
                confidence = buyRatio * 0.8;
                reasoning.push(
                    `🎯 Tín hiệu LONG: Pullback về EMA20 (${data.ema20.toFixed(2)}) + Tỷ lệ buy signals: ${(buyRatio * 100).toFixed(1)}%`
                );

                // Tăng confidence nếu có volume cao
                if (data.volumeAnalysis.strength === 'HIGH') {
                    confidence += 0.1;
                    reasoning.push('📊 Khối lượng cao xác nhận');
                }
            } else {
                reasoning.push(
                    `⏳ Chờ điều kiện LONG: Cần pullback về EMA20 + tỷ lệ buy signals >= 60% (hiện tại: ${(buyRatio * 100).toFixed(1)}%)`
                );
            }
        } else if (data.dailyTrend === 'DOWNTREND') {
            reasoning.push(
                `✅ Xu hướng giảm D1: Giá (${data.currentPrice.toFixed(2)}) < MA50 (${data.ma50_d1.toFixed(2)}) < MA200 (${data.ma200_d1.toFixed(2)})`
            );

            // Điều kiện SHORT: sellRatio >= 0.6 + hồi về EMA20 + RSI > 50
            if (sellRatio >= 0.6 && nearEMA20 && data.rsi > 50) {
                signal = 'SELL';
                confidence = sellRatio * 0.8;
                reasoning.push(
                    `🎯 Tín hiệu SHORT: Hồi về EMA20 (${data.ema20.toFixed(2)}) + Tỷ lệ sell signals: ${(sellRatio * 100).toFixed(1)}%`
                );

                // Tăng confidence nếu có volume cao
                if (data.volumeAnalysis.strength === 'HIGH') {
                    confidence += 0.1;
                    reasoning.push('📊 Khối lượng cao xác nhận');
                }
            } else {
                reasoning.push(
                    `⏳ Chờ điều kiện SHORT: Cần hồi về EMA20 + tỷ lệ sell signals >= 60% (hiện tại: ${(sellRatio * 100).toFixed(1)}%)`
                );
            }
        }

        // Bước 5: Kiểm tra các điều kiện an toàn bổ sung
        if (signal !== 'HOLD') {
            // Kiểm tra Bollinger Bands để tránh vào lệnh ở vùng quá mua/quá bán
            if (signal === 'BUY' && data.currentPrice > data.bollinger.upper) {
                signal = 'HOLD';
                confidence = 0;
                reasoning.push('⚠️ Hủy tín hiệu LONG: Giá đã vượt Bollinger Upper Band');
            }

            if (signal === 'SELL' && data.currentPrice < data.bollinger.lower) {
                signal = 'HOLD';
                confidence = 0;
                reasoning.push('⚠️ Hủy tín hiệu SHORT: Giá đã dưới Bollinger Lower Band');
            }

            // Giới hạn confidence tối đa
            confidence = Math.min(confidence, 1.0);
        }

        // Bước 6: Ghi nhận lý do cuối cùng
        if (signal === 'HOLD' && confidence === 0) {
            reasoning.push('🛡️ Ưu tiên an toàn vốn - Chờ tín hiệu rõ ràng hơn');
        }

        return {
            signal,
            confidence,
            reasoning
        };
    }
}

export default MarketAnalyzer;
