import * as tf from '@tensorflow/tfjs-node';
import Logger from '../utils/Logger';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * AIPredictor - Mô hình AI dự đoán giá Bitcoin
 * Sử dụng LSTM Neural Network để phân tích dữ liệu lịch sử và dự đoán xu hướng
 */

interface MarketData {
    currentPrice: number;
    volume?: number;
    change24h?: number;
    ohlcv?: number[][];
    symbol?: string;
    timestamp?: number;
}

interface AIPrediction {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    rawPrediction: number;
    timestamp: number;
    note?: string;
}

interface ScalerParams {
    min: Record<string, number>;
    max: Record<string, number>;
}

interface ModelInfo {
    status: string;
    inputShape?: tf.Shape;
    outputShape?: tf.Shape;
    totalParams?: number;
    layers?: number;
    sequenceLength?: number;
    features?: string[];
}

class AIPredictor {
    private model: tf.LayersModel | null = null;
    private isModelLoaded: boolean = false;
    private sequenceLength: number = 60; // Sử dụng 60 điểm dữ liệu để dự đoán
    private features: string[] = ['price', 'volume', 'rsi', 'macd', 'sma20', 'sma50'];
    private scaler: ScalerParams = {
        min: {},
        max: {}
    };
    private modelPath: string;

    constructor() {
        this.modelPath = process.env.AI_MODEL_PATH || './models/btc_prediction_model';
    }

    /**
     * Khởi tạo AI Predictor
     */
    async initialize(): Promise<void> {
        try {
            Logger.info('🤖 Đang khởi tạo AI Predictor...');

            // Thử tải mô hình đã huấn luyện
            const modelExists = await this.checkModelExists();

            if (modelExists) {
                await this.loadModel();
                Logger.info('✅ Đã tải mô hình AI từ file');
            } else {
                Logger.warn('⚠️ Không tìm thấy mô hình đã huấn luyện');
                Logger.info('🔧 Tạo mô hình mới...');
                await this.createModel();
                Logger.info('💡 Gợi ý: Chạy "npm run train-ai" để huấn luyện mô hình với dữ liệu lịch sử');
            }

            this.isModelLoaded = true;

        } catch (error) {
            Logger.error('❌ Lỗi khởi tạo AI Predictor:', (error as Error).message);
            // Tạo mô hình đơn giản để bot vẫn có thể hoạt động
            await this.createSimpleModel();
        }
    }

    /**
     * Kiểm tra xem mô hình đã tồn tại chưa
     */
    private async checkModelExists(): Promise<boolean> {
        try {
            await fs.access(path.join(this.modelPath, 'model.json'));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Tải mô hình đã huấn luyện
     */
    private async loadModel(): Promise<void> {
        try {
            this.model = await tf.loadLayersModel(`file://${this.modelPath}/model.json`);

            // Tải scaler parameters
            const scalerPath = path.join(this.modelPath, 'scaler.json');
            const scalerData = await fs.readFile(scalerPath, 'utf8');
            this.scaler = JSON.parse(scalerData);

            Logger.info('✅ Mô hình AI đã được tải thành công');

        } catch (error) {
            Logger.error('❌ Lỗi tải mô hình:', (error as Error).message);
            throw error;
        }
    }

    /**
     * Tạo mô hình LSTM mới
     */
    private async createModel(): Promise<void> {
        try {
            const model = tf.sequential();

            // LSTM Layer 1
            model.add(tf.layers.lstm({
                units: 50,
                returnSequences: true,
                inputShape: [this.sequenceLength, this.features.length]
            }));

            model.add(tf.layers.dropout({ rate: 0.2 }));

            // LSTM Layer 2
            model.add(tf.layers.lstm({
                units: 50,
                returnSequences: true
            }));

            model.add(tf.layers.dropout({ rate: 0.2 }));

            // LSTM Layer 3
            model.add(tf.layers.lstm({
                units: 50,
                returnSequences: false
            }));

            model.add(tf.layers.dropout({ rate: 0.2 }));

            // Dense Layers
            model.add(tf.layers.dense({ units: 25, activation: 'relu' }));
            model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

            // Compile model
            model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'meanSquaredError',
                metrics: ['mae']
            });

            this.model = model;

            Logger.info('✅ Mô hình LSTM đã được tạo');
            Logger.info(`📊 Tổng số parameters: ${model.countParams()}`);

        } catch (error) {
            Logger.error('❌ Lỗi tạo mô hình:', (error as Error).message);
            throw error;
        }
    }

    /**
     * Tạo mô hình đơn giản cho trường hợp khẩn cấp
     */
    private async createSimpleModel(): Promise<void> {
        try {
            const model = tf.sequential();

            model.add(tf.layers.dense({
                units: 32,
                activation: 'relu',
                inputShape: [this.features.length]
            }));

            model.add(tf.layers.dense({
                units: 16,
                activation: 'relu'
            }));

            model.add(tf.layers.dense({
                units: 1,
                activation: 'sigmoid'
            }));

            model.compile({
                optimizer: 'adam',
                loss: 'binaryCrossentropy',
                metrics: ['accuracy']
            });

            this.model = model;
            Logger.info('✅ Mô hình đơn giản đã được tạo');

        } catch (error) {
            Logger.error('❌ Lỗi tạo mô hình đơn giản:', (error as Error).message);
        }
    }

    /**
     * Dự đoán xu hướng giá dựa trên dữ liệu thị trường
     */
    async predict(marketData: MarketData): Promise<AIPrediction> {
        try {
            if (!this.isModelLoaded || !this.model) {
                return this.getDefaultPrediction();
            }

            // Chuẩn bị dữ liệu đầu vào
            const inputData = this.prepareInputData(marketData);

            if (!inputData) {
                return this.getDefaultPrediction();
            }

            // Thực hiện dự đoán
            const prediction = await this.model.predict(inputData) as tf.Tensor;
            const predictionData = await prediction.data();

            // Xử lý kết quả dự đoán
            const result = this.interpretPrediction(predictionData[0], marketData);

            // Cleanup tensor
            inputData.dispose();
            prediction.dispose();

            return result;

        } catch (error) {
            Logger.error('❌ Lỗi dự đoán AI:', (error as Error).message);
            return this.getDefaultPrediction();
        }
    }

    /**
     * Chuẩn bị dữ liệu đầu vào cho mô hình
     */
    private prepareInputData(marketData: MarketData): tf.Tensor | null {
        try {
            // Tính toán các features từ dữ liệu thị trường
            const features = this.extractFeatures(marketData);

            if (features.length < this.sequenceLength) {
                // Nếu không đủ dữ liệu lịch sử, sử dụng mô hình đơn giản
                return this.prepareSimpleInputData(marketData);
            }

            // Chuẩn hóa dữ liệu
            const normalizedFeatures = this.normalizeData(features);

            // Tạo sequence cho LSTM
            const sequence = normalizedFeatures.slice(-this.sequenceLength);

            // Chuyển đổi thành tensor
            const inputTensor = tf.tensor3d([sequence]);

            return inputTensor;

        } catch (error) {
            Logger.error('❌ Lỗi chuẩn bị dữ liệu:', (error as Error).message);
            return null;
        }
    }

    /**
     * Chuẩn bị dữ liệu đơn giản cho mô hình dự phòng
     */
    private prepareSimpleInputData(marketData: MarketData): tf.Tensor | null {
        try {
            const currentPrice = marketData.currentPrice;
            const volume = marketData.volume || 0;
            const change24h = marketData.change24h || 0;

            // Tính toán các chỉ báo đơn giản
            const ohlcv = marketData.ohlcv || [];
            const closes = ohlcv.map(candle => candle[4]);

            let rsi = 50; // Giá trị mặc định
            let sma20 = currentPrice;

            if (closes.length >= 20) {
                // Tính RSI đơn giản
                const gains: number[] = [];
                const losses: number[] = [];
                for (let i = 1; i < Math.min(closes.length, 15); i++) {
                    const change = closes[i] - closes[i - 1];
                    gains.push(change > 0 ? change : 0);
                    losses.push(change < 0 ? Math.abs(change) : 0);
                }
                const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
                const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
                if (avgLoss > 0) {
                    const rs = avgGain / avgLoss;
                    rsi = 100 - (100 / (1 + rs));
                }

                // Tính SMA20
                sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
            }

            // Chuẩn hóa features
            const features = [
                (currentPrice - sma20) / sma20, // Price relative to SMA
                Math.min(Math.max(volume / 1000000, 0), 1), // Normalized volume
                (rsi - 50) / 50, // Normalized RSI
                Math.min(Math.max(change24h / 100, -1), 1), // Normalized 24h change
                Math.sin(new Date().getHours() * Math.PI / 12), // Time of day
                Math.cos(new Date().getDay() * Math.PI / 3.5) // Day of week
            ];

            return tf.tensor2d([features]);

        } catch (error) {
            Logger.error('❌ Lỗi chuẩn bị dữ liệu đơn giản:', (error as Error).message);
            return null;
        }
    }

    /**
     * Trích xuất features từ dữ liệu thị trường
     */
    private extractFeatures(marketData: MarketData): number[][] {
        const ohlcv = marketData.ohlcv || [];
        const features: number[][] = [];

        for (let i = 0; i < ohlcv.length; i++) {
            const [, , high, low, close, volume] = ohlcv[i];

            // Tính toán các chỉ báo cơ bản
            const priceChange = i > 0 ? (close - ohlcv[i - 1][4]) / ohlcv[i - 1][4] : 0;
            const volatility = (high - low) / close;

            features.push([
                close,
                volume,
                priceChange,
                volatility,
                (high + low + close) / 3, // Typical price
                volume * close // Money flow
            ]);
        }

        return features;
    }

    /**
     * Chuẩn hóa dữ liệu
     */
    private normalizeData(data: number[][]): number[][] {
        const normalized: number[][] = [];

        for (let featureIndex = 0; featureIndex < this.features.length; featureIndex++) {
            const featureValues = data.map(row => row[featureIndex] || 0);
            const min = Math.min(...featureValues);
            const max = Math.max(...featureValues);

            // Lưu scaler parameters
            this.scaler.min[this.features[featureIndex]] = min;
            this.scaler.max[this.features[featureIndex]] = max;
        }

        for (let i = 0; i < data.length; i++) {
            const normalizedRow: number[] = [];
            for (let j = 0; j < this.features.length; j++) {
                const value = data[i][j] || 0;
                const min = this.scaler.min[this.features[j]];
                const max = this.scaler.max[this.features[j]];
                const normalizedValue = max > min ? (value - min) / (max - min) : 0;
                normalizedRow.push(normalizedValue);
            }
            normalized.push(normalizedRow);
        }

        return normalized;
    }

    /**
     * Giải thích kết quả dự đoán
     */
    private interpretPrediction(prediction: number, _marketData: MarketData): AIPrediction {
        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = 0.5;

        if (this.model && this.model.outputShape[1] === 1) {
            const lastLayer = this.model.layers[this.model.layers.length - 1];
            const activation = (lastLayer as any).activation;
            
            if (activation && activation.getClassName && activation.getClassName() === 'sigmoid') {
                // Mô hình classification (sigmoid output)
                confidence = Math.abs(prediction - 0.5) * 2;
                signal = prediction > 0.6 ? 'BUY' : prediction < 0.4 ? 'SELL' : 'HOLD';
            } else {
                // Mô hình regression (linear output)
                const predictedChange = prediction;

                confidence = Math.min(Math.abs(predictedChange) * 10, 1);

                if (predictedChange > 0.02) {
                    signal = 'BUY';
                } else if (predictedChange < -0.02) {
                    signal = 'SELL';
                } else {
                    signal = 'HOLD';
                }
            }
        }

        // Áp dụng ngưỡng confidence
        const minConfidence = parseFloat(process.env.PREDICTION_CONFIDENCE_THRESHOLD || '0.7');
        if (confidence < minConfidence) {
            signal = 'HOLD';
            confidence = 0.5;
        }

        return {
            signal,
            confidence,
            rawPrediction: prediction,
            timestamp: Date.now()
        };
    }

    /**
     * Trả về dự đoán mặc định khi có lỗi
     */
    private getDefaultPrediction(): AIPrediction {
        return {
            signal: 'HOLD',
            confidence: 0.5,
            rawPrediction: 0.5,
            timestamp: Date.now(),
            note: 'Sử dụng dự đoán mặc định do lỗi AI'
        };
    }

    /**
     * Lưu mô hình đã huấn luyện
     */
    async saveModel(): Promise<void> {
        try {
            if (!this.model) {
                throw new Error('Không có mô hình để lưu');
            }

            // Tạo thư mục nếu chưa tồn tại
            await fs.mkdir(this.modelPath, { recursive: true });

            // Lưu mô hình
            await this.model.save(`file://${this.modelPath}`);

            // Lưu scaler parameters
            const scalerPath = path.join(this.modelPath, 'scaler.json');
            await fs.writeFile(scalerPath, JSON.stringify(this.scaler, null, 2));

            Logger.info('✅ Mô hình đã được lưu thành công');

        } catch (error) {
            Logger.error('❌ Lỗi lưu mô hình:', (error as Error).message);
            throw error;
        }
    }

    /**
     * Lấy thông tin mô hình
     */
    getModelInfo(): ModelInfo {
        if (!this.model) {
            return { status: 'Chưa khởi tạo' };
        }

        return {
            status: 'Đã sẵn sàng',
            totalParams: this.model.countParams(),
            layers: this.model.layers.length,
            sequenceLength: this.sequenceLength,
            features: this.features
        };
    }
}

export default AIPredictor;