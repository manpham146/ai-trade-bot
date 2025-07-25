import * as tf from '@tensorflow/tfjs';
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
            const modelsDir = './models';
            const modelPath = `${modelsDir}/btc_prediction_model.json`;
            const weightsPath = `${modelsDir}/btc_prediction_weights.json`;
            const scalerPath = `${modelsDir}/scaler.json`;
            
            // Kiểm tra xem mô hình có tồn tại không
            try {
                await fs.access(modelPath);
            } catch {
                Logger.warn('⚠️ Không tìm thấy mô hình đã huấn luyện');
                return;
            }

            // Tải cấu trúc mô hình
            const modelData = await fs.readFile(modelPath, 'utf-8');
            const modelConfig = JSON.parse(modelData);
            
            // Tạo lại mô hình từ config
            this.model = await tf.models.modelFromJSON(modelConfig);
            
            // Tải weights nếu có
            try {
                const weightsData = await fs.readFile(weightsPath, 'utf-8');
                const weights = JSON.parse(weightsData);
                const tensors = weights.map((w: number[], i: number) => {
                    const shape = this.model!.getWeights()[i].shape;
                    return tf.tensor(w, shape);
                });
                this.model.setWeights(tensors);
                
                // Cleanup tensors
                tensors.forEach((t: tf.Tensor) => t.dispose());
            } catch {
                Logger.warn('⚠️ Không tìm thấy weights, sử dụng weights ngẫu nhiên');
            }
            
            // Tải scaler parameters
            try {
                const scalerData = await fs.readFile(scalerPath, 'utf-8');
                this.scaler = JSON.parse(scalerData);
            } catch {
                Logger.warn('⚠️ Không tìm thấy scaler parameters');
            }

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
            // Tạo mô hình đơn giản hơn để tránh lỗi
            const model = tf.sequential({
                layers: [
                    tf.layers.dense({
                        units: 32,
                        activation: 'relu',
                        inputShape: [this.features.length]
                    }),
                    tf.layers.dropout({ rate: 0.2 }),
                    tf.layers.dense({
                        units: 16,
                        activation: 'relu'
                    }),
                    tf.layers.dropout({ rate: 0.2 }),
                    tf.layers.dense({
                        units: 1,
                        activation: 'sigmoid'
                    })
                ]
            });

            // Compile model với cấu hình đơn giản
            model.compile({
                optimizer: 'adam',
                loss: 'binaryCrossentropy',
                metrics: ['accuracy']
            });

            this.model = model;

            Logger.info('✅ Mô hình đơn giản đã được tạo');
            Logger.info(`📊 Tổng số parameters: ${model.countParams()}`);

        } catch (error) {
            Logger.error('❌ Lỗi tạo mô hình:', (error as Error).message);
            // Fallback to simple model
            await this.createSimpleModel();
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
     * Set model từ bên ngoài (sau khi training)
     */
    public setModel(model: tf.LayersModel): void {
        try {
            // Dispose model cũ nếu có
            if (this.model) {
                this.model.dispose();
            }
            
            this.model = model;
            this.isModelLoaded = true;
            Logger.info('✅ Model đã được set thành công');
            
        } catch (error) {
            Logger.error('❌ Lỗi set model:', (error as Error).message);
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

            // Always use simple input data for dense model
            return this.prepareSimpleInputData(marketData);

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

            // Tạo thư mục models nếu chưa có
            const modelsDir = './models';
            try {
                await fs.access(modelsDir);
            } catch {
                await fs.mkdir(modelsDir, { recursive: true });
            }

            // Lưu mô hình dưới dạng JSON
            const modelJson = await this.model.toJSON();
            const modelPath = `${modelsDir}/btc_prediction_model.json`;
            await fs.writeFile(modelPath, JSON.stringify(modelJson, null, 2));
            
            // Lưu weights
            const weights = this.model.getWeights();
            const weightsData = weights.map(w => Array.from(w.dataSync()));
            const weightsPath = `${modelsDir}/btc_prediction_weights.json`;
            await fs.writeFile(weightsPath, JSON.stringify(weightsData, null, 2));
            
            // Lưu scaler parameters
            const scalerPath = `${modelsDir}/scaler.json`;
            await fs.writeFile(scalerPath, JSON.stringify(this.scaler || {}, null, 2));
            
            Logger.info(`✅ Đã lưu mô hình tại: ${modelPath}`);
            
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