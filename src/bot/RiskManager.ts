import Logger from '../utils/Logger';

/**
 * RiskManager - Quản lý rủi ro giao dịch
 * Đánh giá và kiểm soát rủi ro để bảo vệ vốn đầu tư
 */

interface MarketData {
    currentPrice: number;
    ohlcv?: number[][];
    volume?: number;
    symbol?: string;
    timestamp?: number;
}

interface TechnicalAnalysis {
    indicators?: {
        rsi?: number;
        macd?: {
            histogram: number;
        };
        bollinger?: {
            upper: number;
            lower: number;
            middle: number;
        };
    };
    trend?: {
        direction: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
    };
    currentPrice?: number;
}

interface AIPrediction {
    confidence: number;
    signal: 'BUY' | 'SELL' | 'HOLD';
    timestamp?: number;
}

interface Position {
    entryPrice: number;
    entryTime: number;
    stopLoss?: number;
    takeProfit?: number;
    amount: number;
    side: 'BUY' | 'SELL';
}

interface Trade {
    id?: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    amount: number;
    price: number;
    timestamp?: number;
    profit?: number;
}

interface RiskFactor {
    score: number;
    reason: string;
    [key: string]: any;
}

interface RiskAssessmentData {
    marketData: MarketData;
    technicalAnalysis: TechnicalAnalysis;
    aiPrediction: AIPrediction;
    currentPosition?: Position;
}

interface RiskBreakdown {
    volatility: RiskFactor;
    technical: RiskFactor;
    aiConfidence: RiskFactor;
    position: RiskFactor;
    frequency: RiskFactor;
}

interface OverallRisk {
    score: number;
    factors: string[];
    breakdown: RiskBreakdown;
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

class RiskManager {
    private maxPositionSize: number;
    private stopLossPercentage: number;
    private takeProfitPercentage: number;
    private maxTradesPerDay: number;
    private dailyTradeCount: number = 0;
    private lastTradeDate: string | null = null;
    private tradeHistory: (Trade & { timestamp: number })[] = [];
    private maxHistoryLength: number = 100;

    constructor() {
        this.maxPositionSize = parseFloat(process.env.MAX_POSITION_SIZE || '100');
        this.stopLossPercentage = parseFloat(process.env.STOP_LOSS_PERCENTAGE || '2');
        this.takeProfitPercentage = parseFloat(process.env.TAKE_PROFIT_PERCENTAGE || '3');
        this.maxTradesPerDay = parseInt(process.env.MAX_TRADES_PER_DAY || '5');
    }

    /**
     * Đánh giá rủi ro tổng thể
     */
    async assess(data: RiskAssessmentData): Promise<RiskAssessment> {
        try {
            const { marketData, technicalAnalysis, aiPrediction, currentPosition } = data;

            // Đánh giá các yếu tố rủi ro
            const volatilityRisk = this.assessVolatilityRisk(marketData);
            const technicalRisk = this.assessTechnicalRisk(technicalAnalysis);
            const aiConfidenceRisk = this.assessAIConfidenceRisk(aiPrediction);
            const positionRisk = this.assessPositionRisk(currentPosition, marketData);
            const tradingFrequencyRisk = this.assessTradingFrequencyRisk();

            // Tính toán điểm rủi ro tổng thể
            const overallRisk = this.calculateOverallRisk({
                volatility: volatilityRisk,
                technical: technicalRisk,
                aiConfidence: aiConfidenceRisk,
                position: positionRisk,
                frequency: tradingFrequencyRisk
            });

            return {
                level: this.getRiskLevel(overallRisk.score),
                score: overallRisk.score,
                factors: overallRisk.factors,
                recommendations: this.getRecommendations(overallRisk),
                positionSizing: this.calculatePositionSize(overallRisk.score, marketData),
                stopLoss: this.calculateDynamicStopLoss(overallRisk.score, marketData),
                takeProfit: this.calculateDynamicTakeProfit(overallRisk.score, marketData)
            };

        } catch (error) {
            Logger.error('❌ Lỗi đánh giá rủi ro:', (error as Error).message);
            return {
                level: 'HIGH',
                score: 0.8,
                factors: [],
                recommendations: [],
                positionSizing: 0,
                stopLoss: 0,
                takeProfit: 0,
                error: (error as Error).message
            };
        }
    }

    /**
     * Đánh giá rủi ro từ độ biến động
     */
    private assessVolatilityRisk(marketData: MarketData): RiskFactor {
        try {
            const ohlcv = marketData.ohlcv || [];
            if (ohlcv.length < 20) {
                return { score: 0.5, reason: 'Không đủ dữ liệu lịch sử' };
            }

            // Tính toán volatility trong 24h qua
            const recent24h = ohlcv.slice(-24);
            const volatilities = recent24h.map(candle => {
                const [, , high, low, close] = candle;
                return (high - low) / close;
            });

            const avgVolatility = volatilities.reduce((a, b) => a + b, 0) / volatilities.length;
            const currentVolatility = volatilities[volatilities.length - 1];

            // Tính toán True Range để đánh giá volatility
            let totalTR = 0;
            for (let i = 1; i < recent24h.length; i++) {
                const [, , high, low, close] = recent24h[i];
                const prevClose = recent24h[i - 1][4];

                const tr = Math.max(
                    high - low,
                    Math.abs(high - prevClose),
                    Math.abs(low - prevClose)
                );
                totalTR += tr / close; // Normalized TR
            }

            const atr = totalTR / (recent24h.length - 1);

            // Đánh giá rủi ro dựa trên volatility
            let riskScore = 0;
            let reason = '';

            if (atr > 0.05) { // ATR > 5%
                riskScore = 0.8;
                reason = 'Volatility rất cao';
            } else if (atr > 0.03) { // ATR > 3%
                riskScore = 0.6;
                reason = 'Volatility cao';
            } else if (atr > 0.02) { // ATR > 2%
                riskScore = 0.4;
                reason = 'Volatility trung bình';
            } else {
                riskScore = 0.2;
                reason = 'Volatility thấp';
            }

            return {
                score: riskScore,
                atr: atr,
                currentVolatility: currentVolatility,
                avgVolatility: avgVolatility,
                reason: reason
            };

        } catch (error) {
            Logger.error('❌ Lỗi đánh giá volatility risk:', (error as Error).message);
            return { score: 0.5, reason: 'Lỗi tính toán volatility' };
        }
    }

    /**
     * Đánh giá rủi ro từ phân tích kỹ thuật
     */
    private assessTechnicalRisk(technicalAnalysis: TechnicalAnalysis): RiskFactor {
        try {
            if (!technicalAnalysis || !technicalAnalysis.indicators) {
                return { score: 0.5, reason: 'Không có dữ liệu kỹ thuật' };
            }

            const indicators = technicalAnalysis.indicators;
            const riskFactors: string[] = [];
            let riskScore = 0;

            // Đánh giá RSI
            if (indicators.rsi) {
                if (indicators.rsi > 80 || indicators.rsi < 20) {
                    riskFactors.push('RSI ở vùng cực trị');
                    riskScore += 0.3;
                } else if (indicators.rsi > 70 || indicators.rsi < 30) {
                    riskFactors.push('RSI ở vùng quá mua/quá bán');
                    riskScore += 0.2;
                }
            }

            // Đánh giá MACD
            if (indicators.macd) {
                const { histogram } = indicators.macd;
                if (Math.abs(histogram) < 0.001) {
                    riskFactors.push('MACD gần điểm giao cắt');
                    riskScore += 0.2;
                }
            }

            // Đánh giá Bollinger Bands
            if (indicators.bollinger) {
                const { upper, lower, middle } = indicators.bollinger;
                const currentPrice = technicalAnalysis.currentPrice || 0;
                const bandWidth = (upper - lower) / middle;

                if (bandWidth < 0.02) {
                    riskFactors.push('Bollinger Bands co hẹp - có thể breakout');
                    riskScore += 0.3;
                }

                if (currentPrice > upper || currentPrice < lower) {
                    riskFactors.push('Giá ngoài Bollinger Bands');
                    riskScore += 0.2;
                }
            }

            // Đánh giá xu hướng
            if (technicalAnalysis.trend) {
                if (technicalAnalysis.trend.direction === 'SIDEWAYS') {
                    riskFactors.push('Thị trường đi ngang - khó dự đoán');
                    riskScore += 0.2;
                }
            }

            return {
                score: Math.min(riskScore, 1),
                factors: riskFactors,
                reason: riskFactors.length > 0 ? riskFactors.join(', ') : 'Tín hiệu kỹ thuật ổn định'
            };

        } catch (error) {
            Logger.error('❌ Lỗi đánh giá technical risk:', (error as Error).message);
            return { score: 0.5, reason: 'Lỗi phân tích kỹ thuật' };
        }
    }

    /**
     * Đánh giá rủi ro từ độ tin cậy AI
     */
    private assessAIConfidenceRisk(aiPrediction: AIPrediction): RiskFactor {
        try {
            if (!aiPrediction || typeof aiPrediction.confidence !== 'number') {
                return { score: 0.7, reason: 'Không có dự đoán AI' };
            }

            const confidence = aiPrediction.confidence;
            let riskScore = 0;
            let reason = '';

            if (confidence < 0.5) {
                riskScore = 0.8;
                reason = 'Độ tin cậy AI rất thấp';
            } else if (confidence < 0.6) {
                riskScore = 0.6;
                reason = 'Độ tin cậy AI thấp';
            } else if (confidence < 0.7) {
                riskScore = 0.4;
                reason = 'Độ tin cậy AI trung bình';
            } else if (confidence < 0.8) {
                riskScore = 0.2;
                reason = 'Độ tin cậy AI cao';
            } else {
                riskScore = 0.1;
                reason = 'Độ tin cậy AI rất cao';
            }

            return {
                score: riskScore,
                confidence: confidence,
                signal: aiPrediction.signal,
                reason: reason
            };

        } catch (error) {
            Logger.error('❌ Lỗi đánh giá AI confidence risk:', (error as Error).message);
            return { score: 0.7, reason: 'Lỗi đánh giá AI' };
        }
    }

    /**
     * Đánh giá rủi ro vị thế hiện tại
     */
    private assessPositionRisk(currentPosition: Position | undefined, marketData: MarketData): RiskFactor {
        try {
            if (!currentPosition) {
                return { score: 0, reason: 'Không có vị thế mở' };
            }

            const currentPrice = marketData.currentPrice;
            const entryPrice = currentPosition.entryPrice;
            const unrealizedPnL = (currentPrice - entryPrice) / entryPrice;

            let riskScore = 0;
            let reason = '';

            // Đánh giá theo thời gian giữ vị thế
            const holdingTime = Date.now() - currentPosition.entryTime;
            const holdingHours = holdingTime / (1000 * 60 * 60);

            if (holdingHours > 24) {
                riskScore += 0.3;
                reason += 'Giữ vị thế quá lâu; ';
            }

            // Đánh giá theo P&L
            if (unrealizedPnL < -0.05) { // Lỗ > 5%
                riskScore += 0.5;
                reason += 'Lỗ lớn; ';
            } else if (unrealizedPnL < -0.02) { // Lỗ > 2%
                riskScore += 0.3;
                reason += 'Đang lỗ; ';
            }

            // Kiểm tra stop loss và take profit
            if (currentPosition.stopLoss && currentPrice <= currentPosition.stopLoss) {
                riskScore += 0.8;
                reason += 'Chạm stop loss; ';
            }

            if (currentPosition.takeProfit && currentPrice >= currentPosition.takeProfit) {
                riskScore -= 0.2; // Giảm rủi ro khi chạm take profit
                reason += 'Chạm take profit; ';
            }

            return {
                score: Math.max(0, Math.min(riskScore, 1)),
                unrealizedPnL: unrealizedPnL,
                holdingHours: holdingHours,
                reason: reason || 'Vị thế ổn định'
            };

        } catch (error) {
            Logger.error('❌ Lỗi đánh giá position risk:', (error as Error).message);
            return { score: 0.5, reason: 'Lỗi đánh giá vị thế' };
        }
    }

    /**
     * Đánh giá rủi ro tần suất giao dịch
     */
    private assessTradingFrequencyRisk(): RiskFactor {
        try {
            const today = new Date().toDateString();

            // Reset counter nếu là ngày mới
            if (this.lastTradeDate !== today) {
                this.dailyTradeCount = 0;
                this.lastTradeDate = today;
            }

            let riskScore = 0;
            let reason = '';

            if (this.dailyTradeCount >= this.maxTradesPerDay) {
                riskScore = 1;
                reason = 'Đã đạt giới hạn giao dịch trong ngày';
            } else if (this.dailyTradeCount >= this.maxTradesPerDay * 0.8) {
                riskScore = 0.6;
                reason = 'Gần đạt giới hạn giao dịch';
            } else if (this.dailyTradeCount >= this.maxTradesPerDay * 0.5) {
                riskScore = 0.3;
                reason = 'Tần suất giao dịch cao';
            } else {
                riskScore = 0.1;
                reason = 'Tần suất giao dịch bình thường';
            }

            return {
                score: riskScore,
                dailyCount: this.dailyTradeCount,
                maxDaily: this.maxTradesPerDay,
                reason: reason
            };

        } catch (error) {
            Logger.error('❌ Lỗi đánh giá frequency risk:', (error as Error).message);
            return { score: 0.3, reason: 'Lỗi đánh giá tần suất' };
        }
    }

    /**
     * Tính toán điểm rủi ro tổng thể
     */
    private calculateOverallRisk(risks: RiskBreakdown): OverallRisk {
        const weights = {
            volatility: 0.25,
            technical: 0.2,
            aiConfidence: 0.2,
            position: 0.25,
            frequency: 0.1
        };

        let totalScore = 0;
        const factors: string[] = [];

        for (const [type, risk] of Object.entries(risks)) {
            if (risk && typeof risk.score === 'number') {
                totalScore += risk.score * weights[type as keyof typeof weights];
                if (risk.reason) {
                    factors.push(`${type}: ${risk.reason}`);
                }
            }
        }

        return {
            score: Math.min(totalScore, 1),
            factors: factors,
            breakdown: risks
        };
    }

    /**
     * Xác định mức độ rủi ro
     */
    private getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
        if (score >= 0.7) { return 'HIGH'; }
        if (score >= 0.4) { return 'MEDIUM'; }
        return 'LOW';
    }

    /**
     * Đưa ra khuyến nghị dựa trên đánh giá rủi ro
     */
    private getRecommendations(riskAssessment: OverallRisk): string[] {
        const recommendations: string[] = [];
        const score = riskAssessment.score;

        if (score >= 0.7) {
            recommendations.push('Tránh giao dịch trong điều kiện rủi ro cao');
            recommendations.push('Chờ thị trường ổn định hơn');
        } else if (score >= 0.5) {
            recommendations.push('Giảm kích thước vị thế');
            recommendations.push('Đặt stop loss chặt chẽ hơn');
        } else if (score >= 0.3) {
            recommendations.push('Giao dịch với kích thước vị thế bình thường');
            recommendations.push('Theo dõi chặt chẽ các tín hiệu');
        } else {
            recommendations.push('Điều kiện thuận lợi cho giao dịch');
            recommendations.push('Có thể tăng kích thước vị thế nhẹ');
        }

        return recommendations;
    }

    /**
     * Tính toán kích thước vị thế dựa trên rủi ro
     */
    private calculatePositionSize(riskScore: number, _marketData: MarketData): number {
        const baseAmount = parseFloat(process.env.TRADE_AMOUNT || '10');
        let multiplier = 1;

        if (riskScore >= 0.7) {
            multiplier = 0.2; // Giảm 80% kích thước
        } else if (riskScore >= 0.5) {
            multiplier = 0.5; // Giảm 50% kích thước
        } else if (riskScore >= 0.3) {
            multiplier = 0.8; // Giảm 20% kích thước
        } else {
            multiplier = 1.2; // Tăng 20% kích thước
        }

        const adjustedAmount = baseAmount * multiplier;
        return Math.min(adjustedAmount, this.maxPositionSize);
    }

    /**
     * Tính toán stop loss động
     */
    private calculateDynamicStopLoss(riskScore: number, _marketData: MarketData): number {
        let stopLossPercentage = this.stopLossPercentage;

        // Điều chỉnh stop loss dựa trên rủi ro
        if (riskScore >= 0.7) {
            stopLossPercentage *= 0.5; // Stop loss chặt hơn
        } else if (riskScore >= 0.5) {
            stopLossPercentage *= 0.7;
        } else if (riskScore <= 0.2) {
            stopLossPercentage *= 1.5; // Stop loss rộng hơn
        }

        return stopLossPercentage;
    }

    /**
     * Tính toán take profit động
     */
    private calculateDynamicTakeProfit(riskScore: number, _marketData: MarketData): number {
        let takeProfitPercentage = this.takeProfitPercentage;

        // Điều chỉnh take profit dựa trên rủi ro
        if (riskScore >= 0.7) {
            takeProfitPercentage *= 0.7; // Take profit gần hơn
        } else if (riskScore <= 0.2) {
            takeProfitPercentage *= 1.3; // Take profit xa hơn
        }

        return takeProfitPercentage;
    }

    /**
     * Ghi nhận giao dịch mới
     */
    recordTrade(trade: Trade): void {
        this.dailyTradeCount++;
        this.tradeHistory.push({
            ...trade,
            timestamp: Date.now()
        });

        // Giới hạn lịch sử
        if (this.tradeHistory.length > this.maxHistoryLength) {
            this.tradeHistory.shift();
        }
    }

    /**
     * Lấy thống kê rủi ro
     */
    getRiskStats(): {
        dailyTradeCount: number;
        maxTradesPerDay: number;
        tradeHistoryLength: number;
        lastTradeDate: string | null;
    } {
        return {
            dailyTradeCount: this.dailyTradeCount,
            maxTradesPerDay: this.maxTradesPerDay,
            tradeHistoryLength: this.tradeHistory.length,
            lastTradeDate: this.lastTradeDate
        };
    }
}

export default RiskManager;