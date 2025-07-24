const Logger = require('../utils/Logger');

/**
 * MarketAnalyzer - Phân tích kỹ thuật thị trường
 * Tính toán các chỉ báo kỹ thuật phổ biến để hỗ trợ quyết định giao dịch
 */

class MarketAnalyzer {
    constructor() {
        this.indicators = {};
    }

    /**
     * Phân tích toàn diện dữ liệu thị trường
     */
    async analyze(marketData) {
        try {
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
                currentPrice: marketData.currentPrice
            });

            return {
                indicators: {
                    rsi: rsi[rsi.length - 1],
                    macd: {
                        macd: macd.macd[macd.macd.length - 1],
                        signal: macd.signal[macd.signal.length - 1],
                        histogram: macd.histogram[macd.histogram.length - 1]
                    },
                    sma20: sma20[sma20.length - 1],
                    sma50: sma50[sma50.length - 1],
                    bollinger: {
                        upper: bollinger.upper[bollinger.upper.length - 1],
                        middle: bollinger.middle[bollinger.middle.length - 1],
                        lower: bollinger.lower[bollinger.lower.length - 1]
                    },
                    stochastic: {
                        k: stochastic.k[stochastic.k.length - 1],
                        d: stochastic.d[stochastic.d.length - 1]
                    }
                },
                trend: trend,
                volumeAnalysis: volumeAnalysis,
                signal: signals.overall,
                strength: signals.strength,
                signals: signals.individual
            };

        } catch (error) {
            Logger.error('❌ Lỗi phân tích thị trường:', error.message);
            return {
                signal: 'HOLD',
                strength: 0,
                error: error.message
            };
        }
    }

    /**
     * Tính toán RSI (Relative Strength Index)
     */
    calculateRSI(prices, period = 14) {
        const rsi = [];
        const gains = [];
        const losses = [];

        // Tính toán gains và losses
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

        // Tính toán RSI
        for (let i = period - 1; i < gains.length; i++) {
            const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
            const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;

            if (avgLoss === 0) {
                rsi.push(100);
            } else {
                const rs = avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            }
        }

        return rsi;
    }

    /**
     * Tính toán MACD (Moving Average Convergence Divergence)
     */
    calculateMACD(prices) {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);

        const macd = [];
        const startIndex = Math.max(0, ema26.length - ema12.length);

        for (let i = startIndex; i < ema12.length; i++) {
            macd.push(ema12[i] - ema26[i - startIndex]);
        }

        const signal = this.calculateEMA(macd, 9);
        const histogram = [];

        for (let i = 0; i < signal.length; i++) {
            histogram.push(macd[macd.length - signal.length + i] - signal[i]);
        }

        return { macd, signal, histogram };
    }

    /**
     * Tính toán SMA (Simple Moving Average)
     */
    calculateSMA(prices, period) {
        const sma = [];
        for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b);
            sma.push(sum / period);
        }
        return sma;
    }

    /**
     * Tính toán EMA (Exponential Moving Average)
     */
    calculateEMA(prices, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);

        // Giá trị EMA đầu tiên là SMA
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += prices[i];
        }
        ema.push(sum / period);

        // Tính toán EMA cho các giá trị tiếp theo
        for (let i = period; i < prices.length; i++) {
            const currentEMA = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
            ema.push(currentEMA);
        }

        return ema;
    }

    /**
     * Tính toán Bollinger Bands
     */
    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        const sma = this.calculateSMA(prices, period);
        const upper = [];
        const lower = [];

        for (let i = 0; i < sma.length; i++) {
            const slice = prices.slice(i, i + period);
            const mean = sma[i];
            const variance = slice.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / period;
            const standardDeviation = Math.sqrt(variance);

            upper.push(mean + (standardDeviation * stdDev));
            lower.push(mean - (standardDeviation * stdDev));
        }

        return {
            upper,
            middle: sma,
            lower
        };
    }

    /**
     * Tính toán Stochastic Oscillator
     */
    calculateStochastic(highs, lows, closes, period = 14) {
        const k = [];

        for (let i = period - 1; i < closes.length; i++) {
            const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
            const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
            const currentClose = closes[i];

            const kValue = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
            k.push(kValue);
        }

        const d = this.calculateSMA(k, 3);

        return { k, d };
    }

    /**
     * Phân tích xu hướng
     */
    analyzeTrend(closes, sma20, sma50) {
        const currentPrice = closes[closes.length - 1];
        const currentSMA20 = sma20[sma20.length - 1];
        const currentSMA50 = sma50[sma50.length - 1];

        let trend = 'SIDEWAYS';
        let strength = 0;

        if (currentPrice > currentSMA20 && currentSMA20 > currentSMA50) {
            trend = 'UPTREND';
            strength = Math.min(((currentPrice - currentSMA50) / currentSMA50) * 100, 10);
        } else if (currentPrice < currentSMA20 && currentSMA20 < currentSMA50) {
            trend = 'DOWNTREND';
            strength = Math.min(((currentSMA50 - currentPrice) / currentSMA50) * 100, 10);
        }

        return { direction: trend, strength: Math.abs(strength) };
    }

    /**
     * Phân tích khối lượng
     */
    analyzeVolume(volumes, closes) {
        const avgVolume = volumes.slice(-20).reduce((a, b) => a + b) / 20;
        const currentVolume = volumes[volumes.length - 1];
        const volumeRatio = currentVolume / avgVolume;

        const priceChange = (closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2];

        return {
            ratio: volumeRatio,
            trend: volumeRatio > 1.5 ? 'HIGH' : volumeRatio < 0.5 ? 'LOW' : 'NORMAL',
            priceVolumeAlignment: (priceChange > 0 && volumeRatio > 1) || (priceChange < 0 && volumeRatio > 1)
        };
    }

    /**
     * Tổng hợp tín hiệu từ các chỉ báo
     */
    generateSignals(data) {
        const signals = {
            individual: {},
            scores: [],
            overall: 'HOLD',
            strength: 0
        };

        // RSI Signal
        if (data.rsi < 30) {
            signals.individual.rsi = 'BUY';
            signals.scores.push(1);
        } else if (data.rsi > 70) {
            signals.individual.rsi = 'SELL';
            signals.scores.push(-1);
        } else {
            signals.individual.rsi = 'NEUTRAL';
            signals.scores.push(0);
        }

        // MACD Signal
        if (data.macd.histogram > 0 && data.macd.macd > data.macd.signal) {
            signals.individual.macd = 'BUY';
            signals.scores.push(1);
        } else if (data.macd.histogram < 0 && data.macd.macd < data.macd.signal) {
            signals.individual.macd = 'SELL';
            signals.scores.push(-1);
        } else {
            signals.individual.macd = 'NEUTRAL';
            signals.scores.push(0);
        }

        // Moving Average Signal
        if (data.currentPrice > data.sma20 && data.sma20 > data.sma50) {
            signals.individual.ma = 'BUY';
            signals.scores.push(1);
        } else if (data.currentPrice < data.sma20 && data.sma20 < data.sma50) {
            signals.individual.ma = 'SELL';
            signals.scores.push(-1);
        } else {
            signals.individual.ma = 'NEUTRAL';
            signals.scores.push(0);
        }

        // Bollinger Bands Signal
        if (data.currentPrice < data.bollinger.lower) {
            signals.individual.bollinger = 'BUY';
            signals.scores.push(1);
        } else if (data.currentPrice > data.bollinger.upper) {
            signals.individual.bollinger = 'SELL';
            signals.scores.push(-1);
        } else {
            signals.individual.bollinger = 'NEUTRAL';
            signals.scores.push(0);
        }

        // Stochastic Signal
        if (data.stochastic.k < 20 && data.stochastic.d < 20) {
            signals.individual.stochastic = 'BUY';
            signals.scores.push(1);
        } else if (data.stochastic.k > 80 && data.stochastic.d > 80) {
            signals.individual.stochastic = 'SELL';
            signals.scores.push(-1);
        } else {
            signals.individual.stochastic = 'NEUTRAL';
            signals.scores.push(0);
        }

        // Tính toán tín hiệu tổng thể
        const totalScore = signals.scores.reduce((a, b) => a + b, 0);
        const maxScore = signals.scores.length;

        if (totalScore >= 2) {
            signals.overall = 'BUY';
        } else if (totalScore <= -2) {
            signals.overall = 'SELL';
        } else {
            signals.overall = 'HOLD';
        }

        signals.strength = Math.abs(totalScore) / maxScore;

        return signals;
    }
}

module.exports = MarketAnalyzer;
