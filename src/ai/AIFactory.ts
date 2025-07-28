/**
 * 🤖 AI Factory
 * 
 * Factory pattern để tạo và quản lý AI providers
 * Hỗ trợ dynamic loading và configuration
 */

import { IAIProvider, AIProviderType, AIProviderConfig, ExternalAIConfig, AIManagerConfig, ExternalAIService } from './interfaces/IAIProvider';
import AIManager from './AIManager';
import Logger from '../utils/Logger';

export class AIFactory {
    private static instance: AIFactory;
    private providers: Map<string, IAIProvider> = new Map();

    private constructor() { }

    /**
     * Singleton pattern
     */
    static getInstance(): AIFactory {
        if (!AIFactory.instance) {
            AIFactory.instance = new AIFactory();
        }
        return AIFactory.instance;
    }

    /**
     * Tạo AI Provider dựa trên type
     */
    async createProvider(type: AIProviderType, config: AIProviderConfig = {}): Promise<IAIProvider> {
        try {
            Logger.info(`Creating AI Provider: ${type}`);

            let provider: IAIProvider;

            switch (type) {
                case AIProviderType.EXTERNAL:
                    const { ExternalAIProvider } = await import('./providers/ExternalAIProvider');
                    if (!config || !(config as ExternalAIConfig).service) {
                        throw new Error('ExternalAIProvider requires service configuration');
                    }
                    provider = new ExternalAIProvider(config as ExternalAIConfig);
                    break;

                default:
                    throw new Error(`Unsupported AI provider type: ${type}. Only EXTERNAL provider is supported.`);
            }

            // Cache provider
            const cacheKey = `${type}_${JSON.stringify(config)}`;
            this.providers.set(cacheKey, provider);

            Logger.info(`✅ AI Provider ${type} created successfully`);
            return provider;
        } catch (error) {
            Logger.error(`❌ Failed to create AI Provider ${type}:`, error as any);
            throw error;
        }
    }

    /**
     * Tạo AI Manager với cấu hình
     */
    async createAIManager(config: {
        primaryProvider: AIProviderType;
        fallbackProvider?: AIProviderType;
        autoSwitchOnError?: boolean;
        maxRetries?: number;
        healthCheckInterval?: number;
        costThreshold?: number;
        // Internal AI config removed - only external AI supported
        externalConfig?: ExternalAIConfig;
    }): Promise<AIManager> {
        try {
            Logger.info('Creating AI Manager with config:', config);

            const managerConfig: AIManagerConfig = {
                primaryProvider: config.primaryProvider,
                fallbackProvider: config.fallbackProvider,
                autoSwitchOnError: config.autoSwitchOnError ?? true,
                maxRetries: config.maxRetries || 3,
                healthCheckInterval: config.healthCheckInterval || 300000, // 5 minutes
                costThreshold: config.costThreshold,
                externalConfig: config.externalConfig || { service: ExternalAIService.GEMINI }
            };

            const aiManager = new AIManager(managerConfig);
            await aiManager.initialize();

            Logger.info('✅ AI Manager created and initialized successfully');
            return aiManager;
        } catch (error) {
            Logger.error('❌ Failed to create AI Manager:', error as any);
            throw error;
        }
    }

    /**
     * Tạo AI Manager từ environment variables
     */
    async createAIManagerFromEnv(): Promise<AIManager> {
        try {
            // Đọc cấu hình từ environment variables
            const primaryProvider = (process.env.AI_PRIMARY_PROVIDER as AIProviderType) || AIProviderType.EXTERNAL;
            const fallbackProvider = process.env.AI_FALLBACK_PROVIDER as AIProviderType || AIProviderType.EXTERNAL;

            const autoSwitchOnError = process.env.AI_AUTO_SWITCH !== 'false';
            const maxRetries = parseInt(process.env.AI_MAX_RETRIES || '3');
            const healthCheckInterval = parseInt(process.env.AI_HEALTH_CHECK_INTERVAL || '300000');
            const costThreshold = process.env.AI_COST_THRESHOLD ? parseFloat(process.env.AI_COST_THRESHOLD) : undefined;

            // No internal AI config needed anymore

            // External AI config - determine primary service
            let externalService = process.env.EXTERNAL_AI_SERVICE as ExternalAIService;
            if (!externalService) {
                // Auto-detect based on available API keys
                if (process.env.GEMINI_API_KEY) {
                    externalService = ExternalAIService.GEMINI;
                } else if (process.env.CLAUDE_API_KEY) {
                    externalService = ExternalAIService.CLAUDE;
                } else if (process.env.OPENAI_API_KEY) {
                    externalService = ExternalAIService.OPENAI;
                } else {
                    externalService = ExternalAIService.GEMINI; // default
                }
            }

            const externalConfig: ExternalAIConfig = {
                service: externalService,
                fallbackServices: [ExternalAIService.GEMINI, ExternalAIService.CLAUDE, ExternalAIService.OPENAI].filter(s => s !== externalService)
            };

            const config = {
                primaryProvider,
                fallbackProvider,
                autoSwitchOnError,
                maxRetries,
                healthCheckInterval,
                costThreshold,
                externalConfig
            };

            Logger.info('Creating AI Manager from environment config:', {
                primaryProvider,
                fallbackProvider,
                externalService
            });

            return await this.createAIManager(config);
        } catch (error) {
            Logger.error('❌ Failed to create AI Manager from environment:', error as any);
            throw error;
        }
    }

    /**
     * Validate provider configuration
     */
    validateProviderConfig(type: AIProviderType, config: AIProviderConfig): boolean {
        try {
            switch (type) {
                case AIProviderType.EXTERNAL:
                    // Check if at least one external AI service has API key
                    const hasGemini = !!process.env.GEMINI_API_KEY;
                    const hasClaude = !!process.env.CLAUDE_API_KEY;
                    const hasOpenAI = !!process.env.OPENAI_API_KEY;

                    if (!hasGemini && !hasClaude && !hasOpenAI) {
                        Logger.warn('No external AI API keys found');
                        return false;
                    }
                    return true;

                default:
                    Logger.warn(`Unknown provider type: ${type}. Only EXTERNAL provider is supported.`);
                    return false;
            }
        } catch (error) {
            Logger.error(`Error validating config for ${type}:`, error as any);
            return false;
        }
    }

    /**
     * Lấy danh sách providers có sẵn
     */
    getAvailableProviders(): AIProviderType[] {
        const available: AIProviderType[] = [];

        // Kiểm tra API keys cho external AI
        const hasExternalAPI = process.env.GEMINI_API_KEY || process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY;
        if (hasExternalAPI) {
            available.push(AIProviderType.EXTERNAL);
        }

        return available;
    }

    /**
     * Lấy provider recommendations dựa trên use case
     */
    getProviderRecommendations(useCase: 'cost-effective' | 'high-accuracy' | 'fast-response' | 'offline'): {
        primary: AIProviderType;
        fallback?: AIProviderType;
        reasoning: string;
    } {
        const available = this.getAvailableProviders();

        if (!available.includes(AIProviderType.EXTERNAL)) {
            throw new Error('No external AI providers available. Please configure API keys.');
        }

        switch (useCase) {
            case 'cost-effective':
            case 'high-accuracy':
            case 'fast-response':
                return {
                    primary: AIProviderType.EXTERNAL,
                    reasoning: 'External AI provides high accuracy and sophisticated analysis'
                };

            case 'offline':
                throw new Error('Offline mode is not supported. Only external AI providers are available.');
        }

        // Default fallback
        return {
            primary: AIProviderType.EXTERNAL,
            reasoning: 'External AI is the only available provider'
        };
    }

    /**
     * Clear cached providers
     */
    clearCache(): void {
        this.providers.clear();
        Logger.info('AI Factory cache cleared');
    }

    /**
     * Get cached providers info
     */
    getCacheInfo() {
        return {
            cachedProviders: this.providers.size,
            cacheKeys: Array.from(this.providers.keys())
        };
    }
}

export default AIFactory;