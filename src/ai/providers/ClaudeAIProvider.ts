/**
 * 🤖 Claude AI Provider
 * 
 * Provider cho Anthropic Claude AI
 * Implements IAIProvider interface
 */

import { IAIProvider, MarketData, AIPrediction, AIProviderConfig, AIProviderInfo } from '../interfaces/IAIProvider';
import Logger from '../../utils/Logger';

interface ClaudeConfig {
    apiKey: string;
    model: string;
    timeout: number;
    maxRetries: number;
    rateLimitPerMinute: number;
    temperature: number;
    maxTokens: number;
}

/**
 * Rate limiter for Claude API calls
 */
class RateLimiter {
    private requests: number[] = [];
    private maxRequests: number;
    private timeWindow: number = 60000; // 1 minute

    constructor(maxRequestsPerMinute: number = 50) {
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
        if (this.canMakeRequest()) return 0;
        const oldestRequest = Math.min(...this.requests);
        return this.timeWindow - (Date.now() - oldestRequest);
    }
}

export class ClaudeAIProvider implements IAIProvider {
    private config: ClaudeConfig;
    private rateLimiter: RateLimiter;
    private isInitialized: boolean = false;
    private requestCount: number = 0;
    private lastError: string | null = null;
    private initTime: number = 0;
    private totalCost: number = 0;

    constructor(config: AIProviderConfig = {}) {
        this.config = {
            apiKey: process.env.CLAUDE_API_KEY || config.apiKey || '',
            model: process.env.CLAUDE_MODEL || config.model || 'claude-3-haiku-20240307',
            timeout: parseInt(process.env.AI_TIMEOUT || '30000') || config.timeout || 30000,
            maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3') || config.maxRetries || 3,
            rateLimitPerMinute: parseInt(process.env.CLAUDE_RATE_LIMIT || '50') || config.rateLimitPerMinute || 50,
            temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3') || config.temperature || 0.3,
            maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000') || config.maxTokens || 1000
        };

        this.rateLimiter = new RateLimiter(this.config.rateLimitPerMinute);
    }

    /**
     * Khởi tạo Claude AI Provider
     */
    async initialize(): Promise<void> {
        try {
            const startTime = Date.now();
            Logger.info('🤖 Initializing Claude AI Provider...');

            if (!this.config.apiKey) {
                throw new Error('CLAUDE_API_KEY is required. Please set it in your .env file.');
            }

            // Test connection
            await this.testConnection();

            this.isInitialized = true;
            this.initTime = Date.now() - startTime;
            this.lastError = null;

            Logger.info('✅ Claude AI Provider initialized successfully', {
                model: this.config.model,
                initTime: this.initTime + 'ms'
            });
        } catch (error) {
            this.lastError = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('❌ Failed to initialize Claude AI Provider:', error as any);
            throw error;
        }
    }

    /**
     * Dự đoán xu hướng thị trường
     */
    async predict(marketData: MarketData): Promise<AIPrediction> {
        try {
            if (!this.isInitialized) {
                throw new Error('Claude AI Provider not initialized');
            }

            // Check rate limiting
            if (!this.rateLimiter.canMakeRequest()) {
                const waitTime = this.rateLimiter.getWaitTime();
                Logger.warn(`Claude rate limit exceeded. Waiting ${waitTime}ms`);
                await this.sleep(waitTime);
            }

            this.requestCount++;

            const prediction = await this.makePredictionRequest(marketData);
            this.rateLimiter.recordRequest();

            // Update cost tracking
            this.totalCost += this.getEstimatedCost();

            Logger.info('Claude AI prediction completed', {
                signal: prediction.signal,
                confidence: prediction.confidence,
                requestCount: this.requestCount,
                totalCost: this.totalCost.toFixed(4)
            });

            return prediction;
        } catch (error) {
            this.lastError = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('❌ Claude AI prediction failed:', error as any);
            throw error;
        }
    }

    /**
     * Thực hiện request dự đoán tới Claude API
     */
    private async makePredictionRequest(marketData: MarketData): Promise<AIPrediction> {
        const prompt = this.createTradingPrompt(marketData);

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await this.callClaudeAPI(prompt);
                return this.parseClaudeResponse(response, marketData);
            } catch (error) {
                Logger.warn(`Claude API attempt ${attempt}/${this.config.maxRetries} failed:`, error as any);

                if (attempt === this.config.maxRetries) {
                    throw error;
                }

                // Exponential backoff
                await this.sleep(Math.pow(2, attempt) * 1000);
            }
        }

        throw new Error('All Claude API attempts failed');
    }

    /**
     * Gọi Claude API
     */
    private async callClaudeAPI(prompt: string): Promise<string> {
        const url = 'https://api.anthropic.com/v1/messages';

        const requestBody = {
            model: this.config.model,
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.config.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Claude API error: ${response.status} - ${errorData}`);
            }

            const data = await response.json() as any;

            if (!data.content || !data.content[0] || !data.content[0].text) {
                throw new Error('Invalid response format from Claude API');
            }

            return data.content[0].text;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Tạo prompt cho trading analysis
     */
    private createTradingPrompt(marketData: MarketData): string {
        return `You are an expert cryptocurrency trading analyst. Analyze the following market data for ${marketData.symbol} and provide a trading recommendation.

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

Please provide your analysis in the following JSON format:
{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": 0-100,
  "reasoning": "Detailed explanation of your analysis",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "timeframe": "Recommended holding period",
  "targetPrice": "Optional target price",
  "stopLoss": "Optional stop loss price"
}

Focus on:
1. Technical indicators analysis
2. Market momentum
3. Risk assessment
4. Entry/exit points
5. Market sentiment

Be conservative and prioritize capital preservation. Only recommend BUY/SELL with high confidence when signals are clear.`;
    }

    /**
     * Parse response từ Claude API
     */
    private parseClaudeResponse(response: string, marketData: MarketData): AIPrediction {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in Claude response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Validate required fields
            if (!parsed.signal || !['BUY', 'SELL', 'HOLD'].includes(parsed.signal)) {
                throw new Error('Invalid signal in Claude response');
            }

            const confidence = Math.max(0, Math.min(1, (parsed.confidence || 50) / 100));

            return {
                signal: parsed.signal,
                confidence,
                reasoning: parsed.reasoning || 'Claude AI analysis',
                timestamp: Date.now(),
                provider: 'claude',
                riskLevel: parsed.riskLevel || 'MEDIUM',
                timeframe: parsed.timeframe || '1h-4h',
                targetPrice: parsed.targetPrice ? parseFloat(parsed.targetPrice) : undefined,
                stopLoss: parsed.stopLoss ? parseFloat(parsed.stopLoss) : undefined
            };
        } catch (error) {
            Logger.warn('Failed to parse Claude response, using fallback:', error as any);

            // Fallback prediction
            return {
                signal: 'HOLD',
                confidence: 0.5,
                reasoning: 'Failed to parse Claude response, using conservative HOLD',
                timestamp: Date.now(),
                provider: 'claude',
                riskLevel: 'HIGH',
                note: 'Parsing error: ' + (error instanceof Error ? error.message : 'Unknown error')
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
            name: 'Anthropic Claude AI',
            version: '1.0.0',
            status: this.isInitialized ? 'ready' : 'offline',
            description: 'Anthropic Claude AI for sophisticated trading analysis',
            capabilities: [
                'Advanced Reasoning',
                'Multi-factor Analysis',
                'Risk Assessment',
                'Market Sentiment Analysis',
                'Conservative Trading Approach',
                'Detailed Explanations'
            ],
            costPerRequest: this.getEstimatedCost(),
            averageResponseTime: 3000, // ms
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

        Logger.info('Claude AI Provider config updated');
    }

    /**
     * Test kết nối với Claude API
     */
    async testConnection(): Promise<boolean> {
        try {
            const testPrompt = 'Please respond with "OK" to confirm the connection.';
            const response = await this.callClaudeAPI(testPrompt);
            return response.toLowerCase().includes('ok');
        } catch (error) {
            Logger.warn('Claude AI connection test failed:', error as any);
            this.lastError = error instanceof Error ? error.message : 'Connection test failed';
            return false;
        }
    }

    /**
     * Lấy chi phí ước tính cho một request
     * Claude Haiku: ~$0.00025 per 1K input tokens, ~$0.00125 per 1K output tokens
     */
    getEstimatedCost(): number {
        // Estimated cost per request in USD
        // Input tokens: ~800 tokens * $0.00025 = $0.0002
        // Output tokens: ~300 tokens * $0.00125 = $0.000375
        // Total: ~$0.000575 per request for Haiku

        if (this.config.model.includes('haiku')) {
            return 0.000575;
        } else if (this.config.model.includes('sonnet')) {
            return 0.003; // Sonnet is more expensive
        } else if (this.config.model.includes('opus')) {
            return 0.015; // Opus is most expensive
        }

        return 0.001; // Default estimate
    }

    /**
     * Dọn dẹp tài nguyên
     */
    async dispose(): Promise<void> {
        try {
            this.isInitialized = false;

            Logger.info('Claude AI Provider disposed', {
                totalRequests: this.requestCount,
                totalCost: this.totalCost.toFixed(4)
            });
        } catch (error) {
            Logger.warn('Error disposing Claude AI Provider:', error as any);
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
        Logger.info('Claude AI cost tracking reset');
    }
}

export default ClaudeAIProvider;