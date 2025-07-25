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
    bollinger: BollingerBands;
    stochastic: StochasticResult;
    trend: TrendAnalysis;
    volumeAnalysis: VolumeAnalysis;
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string[];
}

interface SignalData {
    rsi: number;
    macd: MACDResult;
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
    bollinger: BollingerBands;
    stochastic: StochasticResult;
    trend: TrendAnalysis;
    volumeAnalysis: VolumeAnalysis;
    currentPrice: number;
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
            const highs = ohlcv.map(candle => candle[2]);   // Giá cao nhất
            const lows = ohlcv.map(candle => candle[3]);    // Giá thấp nhất
            const volumes = ohlcv.map(candle => candle[5]); // Khối lượng

            // Tính toán các chỉ báo kỹ thuật
            const rsi = this.calculateRSI(closes, 14);
            const macd = this.calculateMACD(closes);
            const sma20 = this.calculateSMA(closes, 20);
            const sma50 = this.calculateSMA(closes, 50);
            const ema12 = this.calculateEMA(closes, 12);
            const ema26 = this.calculateEMA(closes, 26);
            const bollinger = this.calculateBollingerBands(closes, 20, 2);
            const stochastic = this.calculateStochastic(highs, lows, closes, 14);

            // Phân tích xu hướng
            const trend = this.analyzeTrend(closes, sma20, sma50);

            // Phân tích khối lượng
            const volumeAnalysis = this.analyzeVolume(volumes, closes);

            // Tổng hợp tín hiệu
            const signals = this.generateSignals({
                rsi,
                macd,
                sma20,
                sma50,
                ema12,
                ema26,
                bollinger,
                stochastic,
                trend,
                volumeAnalysis,
                currentPrice: marketData.price
            });

            const analysis: TechnicalAnalysis = {
                rsi,
                macd,
                sma20,
                sma50,
                ema12,
                ema26,
                bollinger,
                stochastic,
                trend,
                volumeAnalysis,
                signal: signals.signal,
                confidence: signals.confidence,
                reasoning: signals.reasoning
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

        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
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
        if (prices.length === 0) return 0;
        if (prices.length < period) {
            return this.calculateSMA(prices, prices.length);
        }

        const multiplier = 2 / (period + 1);
        let ema = this.calculateSMA(prices.slice(0, period), period);

        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
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
            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
        }

        return ema;
    }

    /**
     * Tính toán Bollinger Bands
     */
    private calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): BollingerBands {
        const sma = this.calculateSMA(prices, period);
        const recentPrices = prices.slice(-period);

        // Tính độ lệch chuẩn
        const variance = recentPrices.reduce((acc, price) => {
            return acc + Math.pow(price - sma, 2);
        }, 0) / period;

        const standardDeviation = Math.sqrt(variance);

        return {
            upper: sma + (standardDeviation * stdDev),
            middle: sma,
            lower: sma - (standardDeviation * stdDev)
        };
    }

    /**
     * Tính toán Stochastic Oscillator
     */
    private calculateStochastic(highs: number[], lows: number[], closes: number[], period: number = 14): StochasticResult {
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
     * Phân tích xu hướng
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
        const volumeTrend = recentVolumes[recentVolumes.length - 1] > recentVolumes[0] ? 'INCREASING' : 'DECREASING';
        
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
     * Tổng hợp tín hiệu từ các chỉ báo
     */
    private generateSignals(data: SignalData): { signal: 'BUY' | 'SELL' | 'HOLD'; confidence: number; reasoning: string[] } {
        const reasoning: string[] = [];
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

        // Bollinger Bands Analysis
        totalSignals++;
        if (data.currentPrice < data.bollinger.lower) {
            buySignals++;
            reasoning.push('Price below Bollinger lower band');
        } else if (data.currentPrice > data.bollinger.upper) {
            sellSignals++;
            reasoning.push('Price above Bollinger upper band');
        } else {
            reasoning.push('Price within Bollinger bands');
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

        // Trend Analysis
        totalSignals++;
        if (data.trend.direction === 'UPTREND' && data.trend.strength !== 'WEAK') {
            buySignals++;
            reasoning.push(`Strong uptrend (${data.trend.strength})`);
        } else if (data.trend.direction === 'DOWNTREND' && data.trend.strength !== 'WEAK') {
            sellSignals++;
            reasoning.push(`Strong downtrend (${data.trend.strength})`);
        } else {
            reasoning.push(`Trend: ${data.trend.direction} (${data.trend.strength})`);
        }

        // Volume Analysis
        if (data.volumeAnalysis.strength === 'HIGH') {
            if (buySignals > sellSignals) {
                reasoning.push('High volume supports bullish signals');
            } else if (sellSignals > buySignals) {
                reasoning.push('High volume supports bearish signals');
            }
        }

        // Determine final signal
        const buyRatio = buySignals / totalSignals;
        const sellRatio = sellSignals / totalSignals;
        
        let signal: 'BUY' | 'SELL' | 'HOLD';
        let confidence: number;

        if (buyRatio >= 0.6) {
            signal = 'BUY';
            confidence = buyRatio;
        } else if (sellRatio >= 0.6) {
            signal = 'SELL';
            confidence = sellRatio;
        } else {
            signal = 'HOLD';
            confidence = Math.max(buyRatio, sellRatio);
        }

        // Adjust confidence based on volume
        if (data.volumeAnalysis.strength === 'HIGH') {
            confidence = Math.min(confidence * 1.2, 1.0);
        } else if (data.volumeAnalysis.strength === 'LOW') {
            confidence = confidence * 0.8;
        }

        return {
            signal,
            confidence,
            reasoning
        };
    }
}

export default MarketAnalyzer;