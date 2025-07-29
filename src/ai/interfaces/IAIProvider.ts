/**
 * 🤖 AI Provider Interface
 *
 * Interface chung cho tất cả các AI providers (Gemini, Claude, Local AI, etc.)
 * Cho phép chuyển đổi dễ dàng giữa các model AI khác nhau
 */

export interface MarketData {
    symbol: string;
    currentPrice: number;
    volume?: number;
    change24h?: number;
    ohlcv?: number[][];
    timestamp?: number;
    high24h?: number;
    low24h?: number;
    rsi?: number;
    macd?: number;
    sma20?: number;
    sma50?: number;
}

export interface AIPrediction {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number; // 0-1 (0-100%)
    reasoning?: string;
    rawPrediction?: number;
    timestamp: number;
    note?: string;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    targetPrice?: number;
    stopLoss?: number;
    timeframe?: string;
    provider: string; // Tên provider (gemini, claude, local, etc.)
}

export interface AIProviderConfig {
    apiKey?: string;
    model?: string;
    timeout?: number;
    maxRetries?: number;
    rateLimitPerMinute?: number;
    temperature?: number;
    [key: string]: any; // Cho phép thêm config tùy chỉnh
}

export interface AIProviderInfo {
    name: string;
    version: string;
    status: 'ready' | 'initializing' | 'error' | 'offline';
    description: string;
    capabilities: string[];
    costPerRequest?: number;
    averageResponseTime?: number;
    lastError?: string;
    requestCount?: number;
}

/**
 * Interface chung cho tất cả AI Providers
 */
export interface IAIProvider {
    /**
     * Khởi tạo AI Provider
     */
    initialize(): Promise<void>;

    /**
     * Dự đoán xu hướng thị trường
     */
    predict(marketData: MarketData): Promise<AIPrediction>;

    /**
     * Kiểm tra trạng thái provider
     */
    isReady(): boolean;

    /**
     * Lấy thông tin provider
     */
    getInfo(): AIProviderInfo;

    /**
     * Cập nhật cấu hình
     */
    updateConfig(config: Partial<AIProviderConfig>): void;

    /**
     * Dọn dẹp tài nguyên
     */
    dispose(): Promise<void>;

    /**
     * Test kết nối
     */
    testConnection(): Promise<boolean>;

    /**
     * Lấy chi phí ước tính cho một request
     */
    getEstimatedCost(): number;
}

/**
 * Enum các loại AI Provider - External AI only
 */
export enum AIProviderType {
    EXTERNAL = 'external'  // External AI (Gemini, Claude, OpenAI)
}

/**
 * External AI Service Types
 */
export enum ExternalAIService {
    GEMINI = 'gemini',
    CLAUDE = 'claude',
    OPENAI = 'openai'
}

/**
 * Configuration cho External AI Provider
 */
export interface ExternalAIConfig extends AIProviderConfig {
    service: ExternalAIService;
    fallbackServices?: ExternalAIService[];
}

/**
 * Configuration cho AI Manager
 */
export interface AIManagerConfig {
    primaryProvider: AIProviderType;
    fallbackProvider?: AIProviderType;
    autoSwitchOnError: boolean;
    maxRetries: number;
    healthCheckInterval: number; // milliseconds
    costThreshold?: number; // Maximum cost per day
    externalConfig: ExternalAIConfig; // Required since only external AI is supported
}
