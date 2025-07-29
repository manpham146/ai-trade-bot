/**
 * 🌐 External AI Provider
 *
 * Provider thống nhất cho tất cả AI services bên ngoài
 * Quản lý Gemini, Claude, OpenAI với fallback tự động
 */

import {
    IAIProvider,
    MarketData,
    AIPrediction,
    AIProviderConfig,
    AIProviderInfo,
    ExternalAIService,
    ExternalAIConfig
} from '../interfaces/IAIProvider';
import GeminiAIProvider from './GeminiAIProvider';
import ClaudeAIProvider from './ClaudeAIProvider';
import OpenAIProvider from './OpenAIProvider';
import Logger from '../../utils/Logger';

export class ExternalAIProvider implements IAIProvider {
    private providers: Map<ExternalAIService, IAIProvider> = new Map();
    private config: ExternalAIConfig;
    private currentService: ExternalAIService;
    private isInitialized: boolean = false;
    private requestCount: number = 0;
    private errorCount: number = 0;
    private lastError: string | null = null;
    private totalCost: number = 0;
    private initTime: number = 0;

    constructor(config: ExternalAIConfig) {
        this.config = {
            ...config,
            service: config.service || ExternalAIService.GEMINI,
            fallbackServices: config.fallbackServices || [ExternalAIService.CLAUDE, ExternalAIService.OPENAI],
            timeout: parseInt(process.env.AI_TIMEOUT || '30000') || config.timeout || 30000,
            maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3') || config.maxRetries || 3,
            temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3') || config.temperature || 0.3,
            maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000') || config.maxTokens || 1000
        };

        this.currentService = this.config.service;
    }

    /**
     * Khởi tạo External AI Provider
     */
    async initialize(): Promise<void> {
        try {
            const startTime = Date.now();
            Logger.info('🌐 Initializing External AI Provider...');

            // Khởi tạo primary service
            await this.initializeService(this.config.service);

            // Khởi tạo fallback services (optional)
            if (this.config.fallbackServices) {
                for (const service of this.config.fallbackServices) {
                    try {
                        await this.initializeService(service);
                    } catch (error) {
                        Logger.warn(`Failed to initialize fallback service ${service}:`, error as any);
                    }
                }
            }

            this.isInitialized = true;
            this.initTime = Date.now() - startTime;
            this.lastError = null;

            Logger.info('✅ External AI Provider initialized successfully', {
                primaryService: this.config.service,
                availableServices: Array.from(this.providers.keys()),
                initTime: `${this.initTime}ms`
            });
        } catch (error) {
            this.lastError = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('❌ Failed to initialize External AI Provider:', error as any);
            throw error;
        }
    }

    /**
     * Khởi tạo một service cụ thể
     */
    private async initializeService(service: ExternalAIService): Promise<void> {
        let provider: IAIProvider;

        switch (service) {
            case ExternalAIService.GEMINI:
                provider = new GeminiAIProvider(this.config);
                break;
            case ExternalAIService.CLAUDE:
                provider = new ClaudeAIProvider(this.config);
                break;
            case ExternalAIService.OPENAI:
                provider = new OpenAIProvider(this.config);
                break;
            default:
                throw new Error(`Unsupported external AI service: ${service}`);
        }

        await provider.initialize();
        this.providers.set(service, provider);

        Logger.info(`✅ External AI service ${service} initialized`);
    }

    /**
     * Dự đoán xu hướng thị trường với fallback
     */
    async predict(marketData: MarketData): Promise<AIPrediction> {
        if (!this.isInitialized) {
            throw new Error('External AI Provider not initialized');
        }

        this.requestCount++;

        // Thử current service trước
        const currentProvider = this.providers.get(this.currentService);
        if (currentProvider && currentProvider.isReady()) {
            try {
                const prediction = await currentProvider.predict(marketData);
                this.totalCost += currentProvider.getEstimatedCost();

                Logger.info('External AI prediction completed', {
                    service: this.currentService,
                    signal: prediction.signal,
                    confidence: prediction.confidence,
                    requestCount: this.requestCount
                });

                return prediction;
            } catch (error) {
                this.errorCount++;
                Logger.warn(`External AI service ${this.currentService} failed:`, error as any);

                // Thử fallback services
                if (this.config.fallbackServices) {
                    for (const fallbackService of this.config.fallbackServices) {
                        if (fallbackService === this.currentService) { continue; }

                        const fallbackProvider = this.providers.get(fallbackService);
                        if (fallbackProvider && fallbackProvider.isReady()) {
                            try {
                                Logger.info(`Trying fallback service: ${fallbackService}`);
                                const prediction = await fallbackProvider.predict(marketData);
                                this.totalCost += fallbackProvider.getEstimatedCost();

                                // Switch to working service
                                this.currentService = fallbackService;

                                Logger.info('External AI fallback prediction completed', {
                                    service: fallbackService,
                                    signal: prediction.signal,
                                    confidence: prediction.confidence
                                });

                                return prediction;
                            } catch (fallbackError) {
                                Logger.warn(`Fallback service ${fallbackService} also failed:`, fallbackError as any);
                            }
                        }
                    }
                }

                // Nếu tất cả services đều fail
                this.lastError = error instanceof Error ? error.message : 'All external services failed';
                throw new Error('All external AI services failed');
            }
        }

        throw new Error('No external AI services available');
    }

    /**
     * Kiểm tra trạng thái provider
     */
    isReady(): boolean {
        if (!this.isInitialized) { return false; }

        // Kiểm tra ít nhất 1 service có sẵn
        for (const provider of this.providers.values()) {
            if (provider.isReady()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Lấy thông tin provider
     */
    getInfo(): AIProviderInfo {
        const availableServices = Array.from(this.providers.keys()).filter(
            service => this.providers.get(service)?.isReady()
        );

        return {
            name: 'External AI Provider',
            version: '1.0.0',
            status: this.isInitialized ? 'ready' : 'offline',
            description: `Unified external AI provider managing ${availableServices.join(', ')} services with automatic fallback`,
            capabilities: [
                'Multi-Service Management',
                'Automatic Fallback',
                'Cost Optimization',
                'Advanced NLP Analysis',
                'Real-time Processing',
                'Risk Assessment',
                'Market Sentiment Analysis'
            ],
            costPerRequest: this.getAverageCostPerRequest(),
            averageResponseTime: 2000, // ms
            lastError: this.lastError || undefined,
            requestCount: this.requestCount
        };
    }

    /**
     * Tính chi phí trung bình per request
     */
    private getAverageCostPerRequest(): number {
        if (this.requestCount === 0) { return 0; }
        return this.totalCost / this.requestCount;
    }

    /**
     * Cập nhật cấu hình
     */
    updateConfig(config: Partial<ExternalAIConfig>): void {
        this.config = { ...this.config, ...config };

        // Cập nhật config cho tất cả providers
        for (const provider of this.providers.values()) {
            provider.updateConfig(config);
        }

        Logger.info('External AI Provider config updated');
    }

    /**
     * Test kết nối
     */
    async testConnection(): Promise<boolean> {
        try {
            const currentProvider = this.providers.get(this.currentService);
            if (currentProvider) {
                return await currentProvider.testConnection();
            }
            return false;
        } catch (error) {
            Logger.warn('External AI connection test failed:', error as any);
            return false;
        }
    }

    /**
     * Lấy chi phí ước tính
     */
    getEstimatedCost(): number {
        const currentProvider = this.providers.get(this.currentService);
        return currentProvider ? currentProvider.getEstimatedCost() : 0;
    }

    /**
     * Dọn dẹp tài nguyên
     */
    async dispose(): Promise<void> {
        try {
            // Dispose tất cả providers
            for (const [service, provider] of this.providers.entries()) {
                try {
                    await provider.dispose();
                    Logger.info(`External AI service ${service} disposed`);
                } catch (error) {
                    Logger.warn(`Error disposing service ${service}:`, error as any);
                }
            }

            this.providers.clear();
            this.isInitialized = false;

            Logger.info('External AI Provider disposed', {
                totalRequests: this.requestCount,
                totalErrors: this.errorCount,
                totalCost: this.totalCost.toFixed(4),
                successRate: `${((this.requestCount - this.errorCount) / this.requestCount * 100).toFixed(2)}%`
            });
        } catch (error) {
            Logger.warn('Error disposing External AI Provider:', error as any);
        }
    }

    /**
     * Chuyển đổi service chính
     */
    async switchService(service: ExternalAIService): Promise<void> {
        if (!this.providers.has(service)) {
            await this.initializeService(service);
        }

        const provider = this.providers.get(service);
        if (provider && provider.isReady()) {
            this.currentService = service;
            Logger.info(`Switched to external AI service: ${service}`);
        } else {
            throw new Error(`Cannot switch to service ${service}: not available`);
        }
    }

    /**
     * Lấy thống kê chi tiết
     */
    getDetailedStats() {
        const serviceStats: Record<string, any> = {};

        for (const [service, provider] of this.providers.entries()) {
            serviceStats[service] = {
                ready: provider.isReady(),
                info: provider.getInfo(),
                estimatedCost: provider.getEstimatedCost()
            };
        }

        return {
            currentService: this.currentService,
            totalRequests: this.requestCount,
            totalErrors: this.errorCount,
            totalCost: this.totalCost,
            successRate: this.requestCount > 0 ? (this.requestCount - this.errorCount) / this.requestCount : 0,
            averageCostPerRequest: this.getAverageCostPerRequest(),
            services: serviceStats
        };
    }

    /**
     * Lấy service hiện tại
     */
    getCurrentService(): ExternalAIService {
        return this.currentService;
    }

    /**
     * Lấy danh sách services có sẵn
     */
    getAvailableServices(): ExternalAIService[] {
        return Array.from(this.providers.keys()).filter(
            service => this.providers.get(service)?.isReady()
        );
    }
}

export default ExternalAIProvider;
