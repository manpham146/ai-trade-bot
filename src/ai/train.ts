import 'dotenv/config';
import * as tf from '@tensorflow/tfjs-node';
import * as ccxt from 'ccxt';
import AIPredictor from './AIPredictor';
import MarketAnalyzer from '../bot/MarketAnalyzer';
import Logger from '../utils/Logger';

/**
 * AI Training Script - Huấn luyện mô hình AI với dữ liệu lịch sử
 * Script này sẽ tải dữ liệu lịch sử từ OKX và huấn luyện mô hình LSTM
 */

interface TrainingConfig {
    symbol: string;
    trainingDays: number;
    sequenceLength: number;
    batchSize: number;
    epochs: number;
    validationSplit: number;
}

interface MarketData {
    symbol: string;
    price: number;
    currentPrice: number;
    ohlcv: [number, number, number, number, number, number][];
    volume: number;
    timestamp: number;
}

interface TechnicalIndicators {
    rsi: number[];
    macd: {
        macd: number[];
        signal: number[];
        histogram: number[];
    };
    sma20: number[];
}

interface TrainingData {
    features: number[][][];
    labels: number[];
}

interface TrainingResults {
    loss: number;
    accuracy: number;
    history: any;
}

interface TestPrediction {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    rawPrediction: number;
}

class AITrainer {
    private exchange: ccxt.okx | null = null;
    private aiPredictor: AIPredictor;
    private marketAnalyzer: MarketAnalyzer;
    private config: TrainingConfig;

    constructor() {
        this.aiPredictor = new AIPredictor();
        this.marketAnalyzer = new MarketAnalyzer();
        this.config = {
            symbol: process.env.TRADING_PAIR || 'BTC/USDT',
            trainingDays: parseInt(process.env.TRAINING_DATA_DAYS || '30'),
            sequenceLength: 60,
            batchSize: 32,
            epochs: 50,
            validationSplit: 0.2
        };
    }

    /**
     * Khởi tạo kết nối exchange
     */
    async initializeExchange(): Promise<void> {
        try {
            Logger.info('🔗 Đang kết nối với OKX để lấy dữ liệu...');

            this.exchange = new ccxt.okx({
                apiKey: process.env.OKX_API_KEY,
                secret: process.env.OKX_SECRET_KEY,
                password: process.env.OKX_PASSPHRASE,
                sandbox: false, // Sử dụng dữ liệu thật cho training
                enableRateLimit: true
            });

            await this.exchange.loadMarkets();
            Logger.info('✅ Kết nối OKX thành công!');

        } catch (error) {
            Logger.error('❌ Lỗi kết nối OKX:', (error as Error).message);
            throw error;
        }
    }

    /**
     * Lấy dữ liệu lịch sử
     */
    async fetchHistoricalData(): Promise<number[][]> {
        try {
            if (!this.exchange) {
                throw new Error('Exchange not initialized');
            }

            Logger.info(`📊 Đang tải dữ liệu lịch sử ${this.config.trainingDays} ngày cho ${this.config.symbol}...`);

            const since = Date.now() - (this.config.trainingDays * 24 * 60 * 60 * 1000);
            const timeframe = '5m'; // 5 phút
            const limit = 1000;

            let allData: number[][] = [];
            let currentSince = since;

            while (currentSince < Date.now()) {
                const ohlcv = await this.exchange.fetchOHLCV(
                    this.config.symbol,
                    timeframe,
                    currentSince,
                    limit
                );

                if (ohlcv.length === 0) { break; }

                allData = allData.concat(ohlcv as number[][]);
                const lastCandle = ohlcv[ohlcv.length - 1];
                currentSince = (lastCandle && lastCandle[0]) ? lastCandle[0] + 1 : Date.now();

                Logger.info(`📈 Đã tải ${allData.length} điểm dữ liệu...`);

                // Tránh rate limit
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            Logger.info(`✅ Hoàn thành tải dữ liệu: ${allData.length} điểm`);
            return allData;

        } catch (error) {
            Logger.error('❌ Lỗi tải dữ liệu lịch sử:', error as Error);
            throw error;
        }
    }

    /**
     * Chuẩn bị dữ liệu training
     */
    async prepareTrainingData(ohlcv: number[][]): Promise<TrainingData> {
        try {
            Logger.info('🔧 Đang chuẩn bị dữ liệu training...');

            // Tính toán các chỉ báo kỹ thuật
            const closes = ohlcv.map(candle => candle[4]);

            // Tính toán RSI
            const rsi = this.calculateRSI(closes, 14);

            // Tính toán MACD
            const macd = this.calculateMACD(closes);

            // Calculate technical indicators for features
            const sma20 = this.calculateSMA(closes, 20);

            // Tạo features và labels
            const features: number[][][] = [];
            const labels: number[] = [];

            const startIndex = Math.max(this.config.sequenceLength, 60); // Đảm bảo có đủ dữ liệu cho indicators

            for (let i = startIndex; i < ohlcv.length - 1; i++) {
                // Features cho sequence
                const sequence: number[][] = [];

                for (let j = i - this.config.sequenceLength; j < i; j++) {
                    const [, open, high, low, close, volume] = ohlcv[j];

                    // Chuẩn hóa giá theo close price hiện tại
                    const normalizedOpen = (open - close) / close;
                    const normalizedHigh = (high - close) / close;
                    const normalizedLow = (low - close) / close;
                    const normalizedVolume = Math.log(volume + 1) / 20; // Log normalize volume

                    // Thêm indicators nếu có
                    const rsiIndex = j - (closes.length - rsi.length);
                    const macdIndex = j - (closes.length - macd.macd.length);
                    const smaIndex = j - (closes.length - sma20.length);

                    const normalizedRSI = rsiIndex >= 0 ? (rsi[rsiIndex] - 50) / 50 : 0;
                    const normalizedMACD = macdIndex >= 0 ? macd.macd[macdIndex] / close : 0;
                    const normalizedSMA = smaIndex >= 0 ? (sma20[smaIndex] - close) / close : 0;

                    sequence.push([
                        normalizedOpen,
                        normalizedHigh,
                        normalizedLow,
                        normalizedVolume,
                        normalizedRSI,
                        normalizedMACD,
                        normalizedSMA
                    ]);
                }

                features.push(sequence);

                // Label: Giá sẽ tăng hay giảm trong 5 periods tiếp theo
                const currentPrice = ohlcv[i][4];
                const futurePrice = ohlcv[i + 1][4];
                const priceChange = (futurePrice - currentPrice) / currentPrice;

                // Binary classification: 1 nếu tăng > 0.1%, 0 nếu giảm < -0.1%, 0.5 nếu sideways
                let label: number;
                if (priceChange > 0.001) {
                    label = 1; // BUY
                } else if (priceChange < -0.001) {
                    label = 0; // SELL
                } else {
                    label = 0.5; // HOLD
                }

                labels.push(label);
            }

            Logger.info(`✅ Chuẩn bị xong ${features.length} samples training data`);

            return { features, labels };

        } catch (error) {
            Logger.error('❌ Lỗi chuẩn bị dữ liệu:', error as Error);
            throw error;
        }
    }

    /**
     * Huấn luyện mô hình
     */
    async trainModel(features: number[][][], labels: number[]): Promise<TrainingResults> {
        try {
            Logger.info('🤖 Bắt đầu huấn luyện mô hình AI...');

            // Chuyển đổi dữ liệu thành tensors
            const xs = tf.tensor3d(features);
            const ys = tf.tensor2d(labels.map(label => [label]));

            Logger.info(`📊 Input shape: [${xs.shape.join(', ')}]`);
            Logger.info(`📊 Output shape: [${ys.shape.join(', ')}]`);

            // Tạo mô hình
            await this.aiPredictor.initialize();

            // Cấu hình callbacks
            const callbacks: tf.CustomCallbackArgs = {
                onEpochEnd: (epoch: number, logs?: tf.Logs) => {
                    if (logs) {
                        Logger.info(`Epoch ${epoch + 1}/${this.config.epochs} - Loss: ${logs.loss.toFixed(4)} - Val Loss: ${logs.val_loss.toFixed(4)}`);
                    }
                },
                onTrainEnd: () => {
                    Logger.info('✅ Hoàn thành huấn luyện!');
                }
            };

            // Create a simple model for training
            const model = tf.sequential({
                layers: [
                    tf.layers.lstm({
                        units: 50,
                        returnSequences: true,
                        inputShape: [this.config.sequenceLength, 7]
                    }),
                    tf.layers.dropout({ rate: 0.2 }),
                    tf.layers.lstm({ units: 50, returnSequences: false }),
                    tf.layers.dropout({ rate: 0.2 }),
                    tf.layers.dense({ units: 1, activation: 'sigmoid' })
                ]
            });
            
            model.compile({
                optimizer: 'adam',
                loss: 'binaryCrossentropy',
                metrics: ['accuracy']
            });

            // Huấn luyện mô hình
            const history = await model.fit(xs, ys, {
                epochs: this.config.epochs,
                batchSize: this.config.batchSize,
                validationSplit: this.config.validationSplit,
                shuffle: true,
                callbacks: callbacks,
                verbose: 0
            });

            // Đánh giá mô hình
            const evaluation = await model.evaluate(xs, ys) as tf.Scalar[];
            const finalLoss = await evaluation[0].data();
            const finalAccuracy = await evaluation[1].data();

            Logger.info(`📊 Final Loss: ${finalLoss[0].toFixed(4)}`);
            Logger.info(`📊 Final Accuracy: ${finalAccuracy[0].toFixed(4)}`);

            // Lưu mô hình
            await this.aiPredictor.saveModel();

            // Cleanup
            xs.dispose();
            ys.dispose();

            return {
                loss: finalLoss[0],
                accuracy: finalAccuracy[0],
                history: history.history
            };

        } catch (error) {
            Logger.error('❌ Lỗi huấn luyện mô hình:', error as Error);
            throw error;
        }
    }

    /**
     * Test mô hình với dữ liệu mới
     */
    async testModel(): Promise<TestPrediction> {
        try {
            if (!this.exchange) {
                throw new Error('Exchange not initialized');
            }

            Logger.info('🧪 Đang test mô hình...');

            // Lấy dữ liệu test (1 ngày gần nhất)
            const testData = await this.exchange.fetchOHLCV(
                this.config.symbol,
                '5m',
                Date.now() - (24 * 60 * 60 * 1000),
                100
            );

            // Tạo mock market data
            const marketData: MarketData = {
                symbol: this.config.symbol,
                price: testData[testData.length - 1]![4] || 0,
                currentPrice: testData[testData.length - 1]![4] || 0,
                ohlcv: testData as [number, number, number, number, number, number][],
                volume: testData[testData.length - 1]![5] || 0,
                timestamp: Date.now()
            };

            // Thực hiện dự đoán
            const prediction = await this.aiPredictor.predict(marketData);

            Logger.info('🔮 Kết quả test:');
            Logger.info(`   Signal: ${prediction.signal}`);
            Logger.info(`   Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
            Logger.info(`   Raw Prediction: ${prediction.rawPrediction}`);

            return prediction as TestPrediction;

        } catch (error) {
            Logger.error('❌ Lỗi test mô hình:', error as Error);
            throw error;
        }
    }

    /**
     * Chạy toàn bộ quá trình training
     */
    async run(): Promise<TrainingResults> {
        try {
            Logger.info('🚀 Bắt đầu quá trình huấn luyện AI Trading Bot...');

            // 1. Khởi tạo
            await this.initializeExchange();
            await this.aiPredictor.initialize();

            // 2. Lấy dữ liệu
            const historicalData = await this.fetchHistoricalData();

            // 3. Chuẩn bị dữ liệu
            const { features, labels } = await this.prepareTrainingData(historicalData);

            // 4. Huấn luyện
            const results = await this.trainModel(features, labels);

            // 5. Test
            await this.testModel();

            Logger.info('🎉 Hoàn thành huấn luyện AI Trading Bot!');
            Logger.info(`📊 Kết quả cuối cùng:`);
            Logger.info(`   Loss: ${results.loss.toFixed(4)}`);
            Logger.info(`   Accuracy: ${(results.accuracy * 100).toFixed(1)}%`);

            return results;

        } catch (error) {
            Logger.error('❌ Lỗi trong quá trình training:', error as Error);
            process.exit(1);
        }
    }

    // Helper methods cho indicators
    private calculateRSI(prices: number[], period: number = 14): number[] {
        const rsi: number[] = [];
        const gains: number[] = [];
        const losses: number[] = [];

        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

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

    private calculateMACD(prices: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);

        const macd: number[] = [];
        const startIndex = Math.max(0, ema26.length - ema12.length);

        for (let i = startIndex; i < ema12.length; i++) {
            macd.push(ema12[i] - ema26[i - startIndex]);
        }

        const signal = this.calculateEMA(macd, 9);
        const histogram: number[] = [];

        for (let i = 0; i < signal.length; i++) {
            histogram.push(macd[macd.length - signal.length + i] - signal[i]);
        }

        return { macd, signal, histogram };
    }

    private calculateSMA(prices: number[], period: number): number[] {
        const sma: number[] = [];
        for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b);
            sma.push(sum / period);
        }
        return sma;
    }

    private calculateEMA(prices: number[], period: number): number[] {
        const ema: number[] = [];
        const multiplier = 2 / (period + 1);

        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += prices[i];
        }
        ema.push(sum / period);

        for (let i = period; i < prices.length; i++) {
            const currentEMA = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
            ema.push(currentEMA);
        }

        return ema;
    }
}

// Chạy training nếu file được gọi trực tiếp
if (require.main === module) {
    const trainer = new AITrainer();
    trainer.run().then(() => {
        Logger.info('✅ Training hoàn thành!');
        process.exit(0);
    }).catch(error => {
        Logger.error('❌ Training thất bại:', error as Error);
        process.exit(1);
    });
}

export default AITrainer;