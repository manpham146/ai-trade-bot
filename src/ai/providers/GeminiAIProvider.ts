/**
 * 🤖 Gemini AI Provider
 * 
 * Wrapper cho GeminiPredictor hiện tại
 * Implements IAIProvider interface
 */

import { IAIProvider, MarketData, AIPrediction, AIProviderConfig, AIProviderInfo } from '../interfaces/IAIProvider';
import { GeminiPredictor, GeminiConfig } from '../GeminiPredictor';
import Logger from '../../utils/Logger';

export class GeminiAIProvider implements IAIProvider {
    private geminiPredictor: GeminiPredictor | null = null;
    private config: AIProviderConfig;
    private isInitialized: boolean = false;
    private requestCount: number = 0;
    private lastError: string | null = null;
    private initTime: number = 0;
    private totalCost: number = 0;

    constructor(config: AIProviderConfig = {}) {
        this.config = {
            apiKey: process.env.GEMINI_API_KEY || config.apiKey || '',
            model: process.env.GEMINI_MODEL || config.model || 'gemini-pro',
            timeout: parseInt(process.env.AI_TIMEOUT || '30000') || config.timeout || 30000,
            maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3') || config.maxRetries || 3,
            rateLimitPerMinute: parseInt(process.env.GEMINI_RATE_LIMIT || '60') || config.rateLimitPerMinute || 60,
            temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3') || config.temperature || 0.3,
            maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000') || config.maxTokens || 1000,
            ...config
        };
    }

    /**
     * Khởi tạo Gemini AI Provider
     */
    async initialize(): Promise<void> {
        try {
            const startTime = Date.now();
            Logger.info('🤖 Initializing Gemini AI Provider...');

            if (!this.config.apiKey) {
                throw new Error('GEMINI_API_KEY is required. Please set it in your .env file.');
            }

            // Tạo GeminiPredictor instance
            const geminiConfig: Partial<GeminiConfig> = {
                apiKey: this.config.apiKey,
                model: this.config.model,
                timeout: this.config.timeout,
                maxRetries: this.config.maxRetries,
                rateLimitPerMinute: this.config.rateLimitPerMinute
            };

            this.geminiPredictor = new GeminiPredictor(geminiConfig);

            // Test connection
            await this.testConnection();

            this.isInitialized = true;
            this.initTime = Date.now() - startTime;
            this.lastError = null;

            Logger.info('✅ Gemini AI Provider initialized successfully', {
                model: this.config.model,
                initTime: this.initTime + 'ms'
            });
        } catch (error) {
            this.lastError = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('❌ Failed to initialize Gemini AI Provider:', error as any);
            throw error;
        }
    }

    /**
     * Dự đoán xu hướng thị trường
     */
    async predict(marketData: MarketData): Promise<AIPrediction> {
        try {
            if (!this.isInitialized || !this.geminiPredictor) {
                throw new Error('Gemini AI Provider not initialized');
            }

            this.requestCount++;

            // Convert MarketData to format expected by GeminiPredictor
            const geminiData = {
                symbol: marketData.symbol,
                price: marketData.currentPrice,
                volume: marketData.volume || 0,
                rsi: marketData.rsi || 50,
                macd: marketData.macd || 0,
                sma20: marketData.sma20 || marketData.currentPrice,
                sma50: marketData.sma50 || marketData.currentPrice,
                timestamp: marketData.timestamp || Date.now(),
                high24h: marketData.high24h,
                low24h: marketData.low24h,
                change24h: marketData.change24h
            };

            const prediction = await this.geminiPredictor.predict(geminiData);

            // Update cost tracking
            this.totalCost += this.getEstimatedCost();

            // Convert to standard AIPrediction format
            const result: AIPrediction = {
                signal: prediction.signal,
                confidence: prediction.confidence / 100, // Convert from 0-100 to 0-1
                reasoning: prediction.reasoning,
                timestamp: prediction.timestamp,
                provider: 'gemini',
                riskLevel: prediction.riskLevel,
                targetPrice: prediction.targetPrice,
                stopLoss: prediction.stopLoss,
                timeframe: prediction.timeframe
            };

            Logger.info('Gemini AI prediction completed', {
                signal: result.signal,
                confidence: result.confidence,
                requestCount: this.requestCount,
                totalCost: this.totalCost.toFixed(4)
            });

            return result;
        } catch (error) {
            this.lastError = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('❌ Gemini AI prediction failed:', error as any);
            throw error;
        }
    }

    /**
     * Kiểm tra trạng thái provider
     */
    isReady(): boolean {
        return this.isInitialized && this.geminiPredictor !== null && !!this.config.apiKey;
    }

    /**
     * Lấy thông tin provider
     */
    getInfo(): AIProviderInfo {
        return {
            name: 'Google Gemini AI',
            version: '1.0.0',
            status: this.isInitialized ? 'ready' : 'offline',
            description: 'Google Gemini Pro model for advanced trading analysis',
            capabilities: [
                'Advanced Market Analysis',
                'Natural Language Reasoning',
                'Multi-factor Analysis',
                'Real-time Processing',
                'Risk Assessment',
                'Price Target Prediction'
            ],
            costPerRequest: this.getEstimatedCost(),
            averageResponseTime: 2000, // ms
            lastError: this.lastError || undefined,
            requestCount: this.requestCount
        };
    }

    /**
     * Cập nhật cấu hình
     */
    updateConfig(config: Partial<AIProviderConfig>): void {
        this.config = { ...this.config, ...config };

        // Recreate GeminiPredictor if API key changed
        if (config.apiKey && config.apiKey !== this.config.apiKey) {
            this.isInitialized = false;
            this.geminiPredictor = null;
        }

        Logger.info('Gemini AI Provider config updated');
    }

    /**
     * Test kết nối với Gemini API
     */
    async testConnection(): Promise<boolean> {
        try {
            if (!this.geminiPredictor) {
                return false;
            }

            // Test với dummy data
            const testData = {
                symbol: 'BTC/USDT',
                price: 50000,
                volume: 1000000,
                rsi: 50,
                macd: 0,
                sma20: 49500,
                sma50: 48000,
                timestamp: Date.now()
            };

            await this.geminiPredictor.predict(testData);
            return true;
        } catch (error) {
            Logger.warn('Gemini AI connection test failed:', error as any);
            this.lastError = error instanceof Error ? error.message : 'Connection test failed';
            return false;
        }
    }

    /**
     * Lấy chi phí ước tính cho một request
     * Gemini Pro: ~$0.0005 per request (estimate)
     */
    getEstimatedCost(): number {
        // Estimated cost per request in USD
        // Input tokens: ~500 tokens * $0.00025 = $0.000125
        // Output tokens: ~200 tokens * $0.0005 = $0.0001
        // Total: ~$0.0002 per request
        return 0.0002;
    }

    /**
     * Dọn dẹp tài nguyên
     */
    async dispose(): Promise<void> {
        try {
            this.geminiPredictor = null;
            this.isInitialized = false;

            Logger.info('Gemini AI Provider disposed', {
                totalRequests: this.requestCount,
                totalCost: this.totalCost.toFixed(4)
            });
        } catch (error) {
            Logger.warn('Error disposing Gemini AI Provider:', error as any);
        }
    }

    /**
     * Lấy thống kê chi phí
     */
    getCostStats() {
        return {
            totalCost: this.totalCost,
            costPerRequest: this.getEstimatedCost(),
            requestCount: this.requestCount,
            averageCostPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0
        };
    }

    /**
     * Reset cost tracking
     */
    resetCostTracking(): void {
        this.totalCost = 0;
        this.requestCount = 0;
        Logger.info('Gemini AI cost tracking reset');
    }
}

export default GeminiAIProvider;