/**
 * 🤖 AI Manager
 *
 * Quản lý External AI providers (Gemini, Claude, OpenAI)
 * Hỗ trợ fallback, load balancing, và monitoring
 */

import {
    IAIProvider,
    AIProviderType,
    AIManagerConfig,
    MarketData,
    AIPrediction,
    AIProviderInfo
} from './interfaces/IAIProvider';
import { ExternalAIProvider } from './providers/ExternalAIProvider';
import Logger from '../utils/Logger';

export class AIManager {
    private providers: Map<AIProviderType, IAIProvider> = new Map();
    private config: AIManagerConfig;
    private currentProvider: AIProviderType;
    private healthCheckTimer?: NodeJS.Timeout;
    private dailyCost: number = 0;
    private lastCostReset: number = Date.now();
    private requestCount: number = 0;
    private errorCount: number = 0;

    constructor(config: AIManagerConfig) {
        this.config = config;
        this.currentProvider = config.primaryProvider;

        Logger.info('AI Manager initialized', {
            primaryProvider: config.primaryProvider,
            fallbackProvider: config.fallbackProvider,
            autoSwitch: config.autoSwitchOnError
        });
    }

    /**
     * Khởi tạo AI Manager và tất cả providers
     */
    async initialize(): Promise<void> {
        try {
            Logger.info('🤖 Initializing AI Manager...');

            // Khởi tạo primary provider
            await this.initializeProvider(this.config.primaryProvider);

            // Khởi tạo fallback provider
            if (this.config.fallbackProvider) {
                try {
                    await this.initializeProvider(this.config.fallbackProvider);
                } catch (error) {
                    Logger.warn(
                        `Failed to initialize fallback provider ${this.config.fallbackProvider}:`,
                        error as any
                    );
                }
            }

            // Bắt đầu health check
            if (this.config.healthCheckInterval > 0) {
                this.startHealthCheck();
            }

            Logger.info('✅ AI Manager initialized successfully');
        } catch (error) {
            Logger.error('❌ Failed to initialize AI Manager:', error as any);
            throw error;
        }
    }

    /**
     * Khởi tạo một provider cụ thể
     */
    private async initializeProvider(providerType: AIProviderType): Promise<void> {
        try {
            const provider = await this.createProvider(providerType);
            await provider.initialize();
            this.providers.set(providerType, provider);

            Logger.info(`✅ Provider ${providerType} initialized`);
        } catch (error) {
            Logger.error(`❌ Failed to initialize provider ${providerType}:`, error as any);
            throw error;
        }
    }

    /**
     * Tạo provider instance dựa trên type
     */
    private async createProvider(providerType: AIProviderType): Promise<IAIProvider> {
        switch (providerType) {
            case AIProviderType.EXTERNAL:
                if (!this.config.externalConfig?.service) {
                    throw new Error('External AI service must be specified in config');
                }
                return new ExternalAIProvider(this.config.externalConfig);

            default:
                throw new Error(
                    `Unsupported provider type: ${providerType}. Only EXTERNAL provider is supported.`
                );
        }
    }

    /**
     * Dự đoán với fallback logic
     */
    async predict(marketData: MarketData): Promise<AIPrediction> {
        this.requestCount++;

        // Kiểm tra cost threshold
        if (this.config.costThreshold && this.dailyCost > this.config.costThreshold) {
            Logger.warn('Daily cost threshold exceeded, using fallback');
            return this.getFallbackPrediction(marketData);
        }

        // Reset daily cost nếu qua ngày mới
        this.resetDailyCostIfNeeded();

        let lastError: Error | null = null;
        const providersToTry = this.config.fallbackProvider
            ? [this.currentProvider, this.config.fallbackProvider]
            : [this.currentProvider];

        for (const providerType of providersToTry) {
            const provider = this.providers.get(providerType);

            if (!provider || !provider.isReady()) {
                Logger.warn(`Provider ${providerType} not ready, skipping`);
                continue;
            }

            try {
                const prediction = await provider.predict(marketData);

                // Cập nhật cost
                this.dailyCost += provider.getEstimatedCost();

                // Chuyển về primary provider nếu đang dùng fallback
                if (providerType !== this.currentProvider && this.config.autoSwitchOnError) {
                    await this.switchToPrimaryIfReady();
                }

                Logger.info(`Prediction successful with ${providerType}`, {
                    signal: prediction.signal,
                    confidence: prediction.confidence,
                    provider: providerType
                });

                return prediction;
            } catch (error) {
                lastError = error as Error;
                this.errorCount++;

                Logger.warn(`Provider ${providerType} failed:`, error as any);

                // Auto switch nếu primary provider fail
                if (providerType === this.currentProvider && this.config.autoSwitchOnError) {
                    await this.switchToFallback();
                }
            }
        }

        // Tất cả providers đều fail
        Logger.error('All AI providers failed, using fallback prediction');
        return this.getFallbackPrediction(marketData, lastError?.message);
    }

    /**
     * Chuyển sang fallback provider
     */
    private async switchToFallback(): Promise<void> {
        if (this.config.fallbackProvider) {
            const provider = this.providers.get(this.config.fallbackProvider);
            if (provider && provider.isReady()) {
                this.currentProvider = this.config.fallbackProvider;
                Logger.info(`Switched to fallback provider: ${this.config.fallbackProvider}`);
                return;
            }
        }

        Logger.warn('No fallback provider available');
    }

    /**
     * Chuyển về primary provider nếu sẵn sàng
     */
    private async switchToPrimaryIfReady(): Promise<void> {
        const primaryProvider = this.providers.get(this.config.primaryProvider);
        if (primaryProvider && primaryProvider.isReady()) {
            this.currentProvider = this.config.primaryProvider;
            Logger.info(`Switched back to primary provider: ${this.config.primaryProvider}`);
        }
    }

    /**
     * Lấy prediction mặc định khi tất cả providers fail
     */
    private getFallbackPrediction(marketData: MarketData, errorMessage?: string): AIPrediction {
        return {
            signal: 'HOLD',
            confidence: 0.5,
            reasoning: 'All AI providers failed, using conservative HOLD signal',
            timestamp: Date.now(),
            note: errorMessage ? `Error: ${errorMessage}` : 'Fallback prediction',
            provider: 'fallback',
            riskLevel: 'LOW'
        };
    }

    /**
     * Bắt đầu health check định kỳ
     */
    private startHealthCheck(): void {
        this.healthCheckTimer = setInterval(async () => {
            await this.performHealthCheck();
        }, this.config.healthCheckInterval);

        Logger.info(`Health check started (interval: ${this.config.healthCheckInterval}ms)`);
    }

    /**
     * Thực hiện health check cho tất cả providers
     */
    private async performHealthCheck(): Promise<void> {
        for (const [providerType, provider] of this.providers) {
            try {
                const isHealthy = await provider.testConnection();
                if (!isHealthy) {
                    Logger.warn(`Provider ${providerType} health check failed`);
                }
            } catch (error) {
                Logger.warn(`Provider ${providerType} health check error:`, error as any);
            }
        }
    }

    /**
     * Reset daily cost nếu qua ngày mới
     */
    private resetDailyCostIfNeeded(): void {
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;

        if (now - this.lastCostReset > dayInMs) {
            this.dailyCost = 0;
            this.lastCostReset = now;
            Logger.info('Daily cost reset');
        }
    }

    /**
     * Chuyển đổi provider thủ công
     */
    async switchProvider(providerType: AIProviderType): Promise<boolean> {
        const provider = this.providers.get(providerType);

        if (!provider) {
            Logger.error(`Provider ${providerType} not found`);
            return false;
        }

        if (!provider.isReady()) {
            Logger.error(`Provider ${providerType} not ready`);
            return false;
        }

        this.currentProvider = providerType;
        Logger.info(`Manually switched to provider: ${providerType}`);
        return true;
    }

    /**
     * Lấy thông tin tất cả providers
     */
    getAllProvidersInfo(): { [key: string]: AIProviderInfo } {
        const info: { [key: string]: AIProviderInfo } = {};

        for (const [providerType, provider] of this.providers) {
            info[providerType] = provider.getInfo();
        }

        return info;
    }

    /**
     * Lấy thống kê AI Manager
     */
    getStats() {
        return {
            currentProvider: this.currentProvider,
            requestCount: this.requestCount,
            errorCount: this.errorCount,
            dailyCost: this.dailyCost,
            successRate:
                this.requestCount > 0
                    ? `${(((this.requestCount - this.errorCount) / this.requestCount) * 100).toFixed(2)}%`
                    : '0%',
            availableProviders: Array.from(this.providers.keys()),
            readyProviders: Array.from(this.providers.entries())
                .filter(([, provider]) => provider.isReady())
                .map(([type]) => type)
        };
    }

    /**
     * Cập nhật cấu hình
     */
    updateConfig(newConfig: Partial<AIManagerConfig>): void {
        this.config = { ...this.config, ...newConfig };
        Logger.info('AI Manager config updated');
    }

    /**
     * Dọn dẹp tài nguyên
     */
    async dispose(): Promise<void> {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }

        for (const [providerType, provider] of this.providers) {
            try {
                await provider.dispose();
                Logger.info(`Provider ${providerType} disposed`);
            } catch (error) {
                Logger.warn(`Error disposing provider ${providerType}:`, error as any);
            }
        }

        this.providers.clear();
        Logger.info('AI Manager disposed');
    }
}

export default AIManager;
