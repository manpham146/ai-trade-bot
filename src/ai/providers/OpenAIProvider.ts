/**
 * 🤖 OpenAI Provider
 *
 * Provider cho OpenAI GPT models
 * Implements IAIProvider interface
 */

import { IAIProvider, MarketData, AIPrediction, AIProviderConfig, AIProviderInfo } from '../interfaces/IAIProvider';
import Logger from '../../utils/Logger';

interface OpenAIConfig {
    apiKey: string;
    model: string;
    timeout: number;
    maxRetries: number;
    rateLimitPerMinute: number;
    temperature: number;
    maxTokens: number;
    organization?: string;
}

/**
 * Rate limiter for OpenAI API calls
 */
class RateLimiter {
    private requests: number[] = [];
    private maxRequests: number;
    private timeWindow: number = 60000; // 1 minute

    constructor(maxRequestsPerMinute: number = 60) {
        this.maxRequests = maxRequestsPerMinute;
    }

    canMakeRequest(): boolean {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        return this.requests.length < this.maxRequests;
    }

    recordRequest(): void {
        this.requests.push(Date.now());
    }

    getWaitTime(): number {
        if (this.canMakeRequest()) { return 0; }
        const oldestRequest = Math.min(...this.requests);
        return this.timeWindow - (Date.now() - oldestRequest);
    }
}

export class OpenAIProvider implements IAIProvider {
    private config: OpenAIConfig;
    private rateLimiter: RateLimiter;
    private isInitialized: boolean = false;
    private requestCount: number = 0;
    private lastError: string | null = null;
    private initTime: number = 0;
    private totalCost: number = 0;

    constructor(config: AIProviderConfig = {}) {
        this.config = {
            apiKey: process.env.OPENAI_API_KEY || config.apiKey || '',
            model: process.env.OPENAI_MODEL || config.model || 'gpt-3.5-turbo',
            timeout: parseInt(process.env.AI_TIMEOUT || '30000') || config.timeout || 30000,
            maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3') || config.maxRetries || 3,
            rateLimitPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT || '60') || config.rateLimitPerMinute || 60,
            temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3') || config.temperature || 0.3,
            maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000') || config.maxTokens || 1000,
            organization: process.env.OPENAI_ORGANIZATION || config.organization
        };

        this.rateLimiter = new RateLimiter(this.config.rateLimitPerMinute);
    }

    /**
     * Khởi tạo OpenAI Provider
     */
    async initialize(): Promise<void> {
        try {
            const startTime = Date.now();
            Logger.info('🤖 Initializing OpenAI Provider...');

            if (!this.config.apiKey) {
                throw new Error('OPENAI_API_KEY is required. Please set it in your .env file.');
            }

            // Test connection
            await this.testConnection();

            this.isInitialized = true;
            this.initTime = Date.now() - startTime;
            this.lastError = null;

            Logger.info('✅ OpenAI Provider initialized successfully', {
                model: this.config.model,
                initTime: `${this.initTime}ms`
            });
        } catch (error) {
            this.lastError = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('❌ Failed to initialize OpenAI Provider:', error as any);
            throw error;
        }
    }

    /**
     * Dự đoán xu hướng thị trường
     */
    async predict(marketData: MarketData): Promise<AIPrediction> {
        try {
            if (!this.isInitialized) {
                throw new Error('OpenAI Provider not initialized');
            }

            // Check rate limiting
            if (!this.rateLimiter.canMakeRequest()) {
                const waitTime = this.rateLimiter.getWaitTime();
                Logger.warn(`OpenAI rate limit exceeded. Waiting ${waitTime}ms`);
                await this.sleep(waitTime);
            }

            this.requestCount++;

            const prediction = await this.makePredictionRequest(marketData);
            this.rateLimiter.recordRequest();

            // Update cost tracking
            this.totalCost += this.getEstimatedCost();

            Logger.info('OpenAI prediction completed', {
                signal: prediction.signal,
                confidence: prediction.confidence,
                requestCount: this.requestCount,
                totalCost: this.totalCost.toFixed(4)
            });

            return prediction;
        } catch (error) {
            this.lastError = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('❌ OpenAI prediction failed:', error as any);
            throw error;
        }
    }

    /**
     * Thực hiện request dự đoán tới OpenAI API
     */
    private async makePredictionRequest(marketData: MarketData): Promise<AIPrediction> {
        const prompt = this.createTradingPrompt(marketData);

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await this.callOpenAIAPI(prompt);
                return this.parseOpenAIResponse(response, marketData);
            } catch (error) {
                Logger.warn(`OpenAI API attempt ${attempt}/${this.config.maxRetries} failed:`, error as any);

                if (attempt === this.config.maxRetries) {
                    throw error;
                }

                // Exponential backoff
                await this.sleep(Math.pow(2, attempt) * 1000);
            }
        }

        throw new Error('All OpenAI API attempts failed');
    }

    /**
     * Gọi OpenAI API
     */
    private async callOpenAIAPI(prompt: string): Promise<string> {
        const url = 'https://api.openai.com/v1/chat/completions';

        const requestBody = {
            model: this.config.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert cryptocurrency trading analyst. Provide precise, data-driven trading recommendations.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
            response_format: { type: 'json_object' }
        };

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
        };

        if (this.config.organization) {
            headers['OpenAI-Organization'] = this.config.organization;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
            }

            const data = await response.json() as any;

            if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                throw new Error('Invalid response format from OpenAI API');
            }

            return data.choices[0].message.content;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Tạo prompt cho trading analysis
     */
    private createTradingPrompt(marketData: MarketData): string {
        return `Analyze the following cryptocurrency market data for ${marketData.symbol} and provide a trading recommendation.

Market Data:
- Current Price: $${marketData.currentPrice}
- Volume: ${marketData.volume || 'N/A'}
- 24h Change: ${marketData.change24h || 'N/A'}%
- 24h High: $${marketData.high24h || 'N/A'}
- 24h Low: $${marketData.low24h || 'N/A'}
- RSI: ${marketData.rsi || 'N/A'}
- MACD: ${marketData.macd || 'N/A'}
- SMA20: $${marketData.sma20 || 'N/A'}
- SMA50: $${marketData.sma50 || 'N/A'}
- Timestamp: ${new Date(marketData.timestamp || Date.now()).toISOString()}

Provide your analysis as a JSON object with the following structure:
{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": 0-100,
  "reasoning": "Detailed explanation of your analysis",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "timeframe": "Recommended holding period",
  "targetPrice": "Optional target price (number)",
  "stopLoss": "Optional stop loss price (number)"
}

Analysis criteria:
1. Technical indicators (RSI, MACD, SMA)
2. Price action and momentum
3. Volume analysis
4. Risk assessment
5. Market structure

Prioritize capital preservation. Only recommend strong BUY/SELL signals when technical indicators align clearly.`;
    }

    /**
     * Parse response từ OpenAI API
     */
    private parseOpenAIResponse(response: string, marketData: MarketData): AIPrediction {
        try {
            const parsed = JSON.parse(response);

            // Validate required fields
            if (!parsed.signal || !['BUY', 'SELL', 'HOLD'].includes(parsed.signal)) {
                throw new Error('Invalid signal in OpenAI response');
            }

            const confidence = Math.max(0, Math.min(1, (parsed.confidence || 50) / 100));

            return {
                signal: parsed.signal,
                confidence,
                reasoning: parsed.reasoning || 'OpenAI GPT analysis',
                timestamp: Date.now(),
                provider: 'openai',
                riskLevel: parsed.riskLevel || 'MEDIUM',
                timeframe: parsed.timeframe || '1h-4h',
                targetPrice: parsed.targetPrice ? parseFloat(parsed.targetPrice) : undefined,
                stopLoss: parsed.stopLoss ? parseFloat(parsed.stopLoss) : undefined
            };
        } catch (error) {
            Logger.warn('Failed to parse OpenAI response, using fallback:', error as any);

            // Try to extract signal from text response
            const textResponse = response.toLowerCase();
            let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

            if (textResponse.includes('buy') && !textResponse.includes('don\'t buy')) {
                signal = 'BUY';
            } else if (textResponse.includes('sell')) {
                signal = 'SELL';
            }

            return {
                signal,
                confidence: 0.5,
                reasoning: 'Fallback analysis from OpenAI text response',
                timestamp: Date.now(),
                provider: 'openai',
                riskLevel: 'HIGH',
                note: `Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Kiểm tra trạng thái provider
     */
    isReady(): boolean {
        return this.isInitialized && !!this.config.apiKey;
    }

    /**
     * Lấy thông tin provider
     */
    getInfo(): AIProviderInfo {
        return {
            name: 'OpenAI GPT',
            version: '1.0.0',
            status: this.isInitialized ? 'ready' : 'offline',
            description: 'OpenAI GPT models for intelligent trading analysis',
            capabilities: [
                'Advanced Language Understanding',
                'Pattern Recognition',
                'Multi-factor Analysis',
                'Risk Assessment',
                'Market Sentiment Analysis',
                'Structured Responses'
            ],
            costPerRequest: this.getEstimatedCost(),
            averageResponseTime: 2500, // ms
            lastError: this.lastError || undefined,
            requestCount: this.requestCount
        };
    }

    /**
     * Cập nhật cấu hình
     */
    updateConfig(config: Partial<AIProviderConfig>): void {
        this.config = { ...this.config, ...config };

        // Update rate limiter if needed
        if (config.rateLimitPerMinute) {
            this.rateLimiter = new RateLimiter(config.rateLimitPerMinute);
        }

        Logger.info('OpenAI Provider config updated');
    }

    /**
     * Test kết nối với OpenAI API
     */
    async testConnection(): Promise<boolean> {
        try {
            const testPrompt = 'Please respond with a JSON object containing {"status": "ok"} to confirm the connection.';
            const response = await this.callOpenAIAPI(testPrompt);
            const parsed = JSON.parse(response);
            return parsed.status === 'ok';
        } catch (error) {
            Logger.warn('OpenAI connection test failed:', error as any);
            this.lastError = error instanceof Error ? error.message : 'Connection test failed';
            return false;
        }
    }

    /**
     * Lấy chi phí ước tính cho một request
     * GPT-3.5-turbo: $0.0015 per 1K input tokens, $0.002 per 1K output tokens
     * GPT-4: $0.03 per 1K input tokens, $0.06 per 1K output tokens
     */
    getEstimatedCost(): number {
        // Estimated cost per request in USD
        const inputTokens = 800; // Estimated input tokens
        const outputTokens = 300; // Estimated output tokens

        if (this.config.model.includes('gpt-4')) {
            // GPT-4 pricing
            return (inputTokens * 0.00003) + (outputTokens * 0.00006);
        } else if (this.config.model.includes('gpt-3.5-turbo')) {
            // GPT-3.5-turbo pricing
            return (inputTokens * 0.0000015) + (outputTokens * 0.000002);
        }

        return 0.002; // Default estimate
    }

    /**
     * Dọn dẹp tài nguyên
     */
    async dispose(): Promise<void> {
        try {
            this.isInitialized = false;

            Logger.info('OpenAI Provider disposed', {
                totalRequests: this.requestCount,
                totalCost: this.totalCost.toFixed(4)
            });
        } catch (error) {
            Logger.warn('Error disposing OpenAI Provider:', error as any);
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
        Logger.info('OpenAI cost tracking reset');
    }
}

export default OpenAIProvider;
