/**
 * 🤖 Gemini AI Predictor
 *
 * Thay thế AI training bằng Google Gemini API
 * Provides intelligent trading predictions using Google's Gemini Pro model
 */

import Logger from '../utils/Logger';

// Types
export interface MarketData {
    symbol: string;
    price: number;
    volume: number;
    rsi: number;
    macd: number;
    sma20: number;
    sma50: number;
    timestamp: number;
    high24h?: number;
    low24h?: number;
    change24h?: number;
}

export interface GeminiPrediction {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number; // 0-100
    reasoning: string;
    timeframe: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    targetPrice?: number;
    stopLoss?: number;
    timestamp: number;
}

export interface GeminiConfig {
    apiKey: string;
    model: string;
    timeout: number;
    maxRetries: number;
    rateLimitPerMinute: number;
}

/**
 * Rate limiter for Gemini API calls
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
        // Remove requests older than 1 minute
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        return this.requests.length < this.maxRequests;
    }

    recordRequest(): void {
        this.requests.push(Date.now());
    }

    getWaitTime(): number {
        if (this.canMakeRequest()) {
            return 0;
        }
        const oldestRequest = Math.min(...this.requests);
        return this.timeWindow - (Date.now() - oldestRequest);
    }
}

/**
 * Gemini AI Predictor Class
 */
export class GeminiPredictor {
    private config: GeminiConfig;
    private rateLimiter: RateLimiter;
    private requestCount: number = 0;
    private lastError: string | null = null;

    constructor(config?: Partial<GeminiConfig>) {
        this.config = {
            apiKey: process.env.GEMINI_API_KEY || '',
            model: process.env.GEMINI_MODEL || 'gemini-pro',
            timeout: parseInt(process.env.GEMINI_TIMEOUT || '30000'),
            maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3'),
            rateLimitPerMinute: parseInt(process.env.GEMINI_RATE_LIMIT || '60'),
            ...config
        };

        if (!this.config.apiKey) {
            throw new Error('GEMINI_API_KEY is required. Please set it in your .env file.');
        }

        this.rateLimiter = new RateLimiter(this.config.rateLimitPerMinute);

        Logger.info('Gemini AI Predictor initialized', {
            model: this.config.model,
            timeout: this.config.timeout,
            rateLimit: this.config.rateLimitPerMinute
        });
    }

    /**
     * Main prediction method
     */
    async predict(marketData: MarketData): Promise<GeminiPrediction> {
        try {
            // Check rate limiting
            if (!this.rateLimiter.canMakeRequest()) {
                const waitTime = this.rateLimiter.getWaitTime();
                Logger.warn(`Rate limit exceeded. Waiting ${waitTime}ms`);
                await this.sleep(waitTime);
            }

            const prediction = await this.makePredictionRequest(marketData);
            this.rateLimiter.recordRequest();
            this.requestCount++;

            Logger.info('Gemini prediction successful', {
                signal: prediction.signal,
                confidence: prediction.confidence,
                requestCount: this.requestCount
            });

            return prediction;
        } catch (error) {
            this.lastError = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('Gemini prediction failed:', error as any);
            return this.getFallbackPrediction(marketData);
        }
    }

    /**
     * Make actual API request to Gemini
     */
    private async makePredictionRequest(marketData: MarketData): Promise<GeminiPrediction> {
        const prompt = this.createTradingPrompt(marketData);

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await this.callGeminiAPI(prompt);
                return this.parseGeminiResponse(response, marketData);
            } catch (error) {
                Logger.warn(
                    `Gemini API attempt ${attempt}/${this.config.maxRetries} failed:`,
                    error as any
                );

                if (attempt === this.config.maxRetries) {
                    throw error;
                }

                // Exponential backoff
                await this.sleep(Math.pow(2, attempt) * 1000);
            }
        }

        throw new Error('All Gemini API attempts failed');
    }

    /**
     * Call Gemini API using fetch (Node.js 18+ compatible)
     */
    private async callGeminiAPI(prompt: string): Promise<string> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.3, // Lower temperature for more consistent predictions
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                }
            ]
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
            }

            const data: any = await response.json();

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response format from Gemini API');
            }

            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Create trading analysis prompt for Gemini
     */
    private createTradingPrompt(data: MarketData): string {
        const marketTrend = this.analyzeTrend(data);
        const rsiSignal = this.getRSISignal(data.rsi);
        const macdSignal = this.getMACDSignal(data.macd);

        return `
You are a professional cryptocurrency technical analyst with 10+ years of experience.
Analyze the following market data and provide a trading prediction.

📊 MARKET DATA:
- Symbol: ${data.symbol}
- Current Price: $${data.price.toFixed(2)}
- 24h Volume: ${data.volume.toLocaleString()}
- RSI (14): ${data.rsi.toFixed(2)} (${rsiSignal})
- MACD: ${data.macd.toFixed(6)} (${macdSignal})
- SMA 20: $${data.sma20.toFixed(2)}
- SMA 50: $${data.sma50.toFixed(2)}
- Market Trend: ${marketTrend}
- Timestamp: ${new Date(data.timestamp).toISOString()}

🎯 ANALYSIS REQUIREMENTS:
1. Evaluate short-term trend (4-24 hours)
2. Determine BUY/SELL/HOLD signal
3. Provide confidence level (0-100%)
4. Explain reasoning clearly
5. Assess risk level
6. Suggest target price and stop-loss if applicable

📋 RESPONSE FORMAT (JSON only):
{
  "signal": "BUY|SELL|HOLD",
  "confidence": 75,
  "reasoning": "Detailed explanation of the decision",
  "timeframe": "4-24h",
  "riskLevel": "LOW|MEDIUM|HIGH",
  "targetPrice": 46000,
  "stopLoss": 44000
}

⚠️ IMPORTANT RULES:
- Capital preservation is the top priority
- Only suggest BUY/SELL when confidence > 70%
- Consider ALL technical indicators
- Account for market volatility
- This is NOT financial advice
- Respond with JSON only, no additional text

Provide your analysis now:
`;
    }

    /**
     * Parse Gemini response and extract prediction
     */
    private parseGeminiResponse(text: string, marketData: MarketData): GeminiPrediction {
        try {
            // Clean the response text
            let cleanText = text.trim();

            // Remove markdown code blocks if present
            cleanText = cleanText.replace(/```json\s*|```\s*/g, '');

            // Find JSON in the response
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                return {
                    signal: this.validateSignal(parsed.signal),
                    confidence: this.validateConfidence(parsed.confidence),
                    reasoning: parsed.reasoning || 'No reasoning provided',
                    timeframe: parsed.timeframe || '4-24h',
                    riskLevel: this.validateRiskLevel(parsed.riskLevel),
                    targetPrice: parsed.targetPrice || undefined,
                    stopLoss: parsed.stopLoss || undefined,
                    timestamp: Date.now()
                };
            }
        } catch (error) {
            Logger.warn('Failed to parse Gemini JSON response:', error as any);
        }

        // Fallback: extract signal from text
        return this.extractSignalFromText(text, marketData);
    }

    /**
     * Extract trading signal from text when JSON parsing fails
     */
    private extractSignalFromText(text: string, marketData: MarketData): GeminiPrediction {
        const upperText = text.toUpperCase();

        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = 50;
        let reasoning = 'Extracted from text analysis';

        // Look for clear signals
        if (
            upperText.includes('BUY') &&
            !upperText.includes('NOT BUY') &&
            !upperText.includes("DON'T BUY")
        ) {
            signal = 'BUY';
            confidence = 65;
            reasoning = 'Text analysis suggests bullish sentiment';
        } else if (
            upperText.includes('SELL') &&
            !upperText.includes('NOT SELL') &&
            !upperText.includes("DON'T SELL")
        ) {
            signal = 'SELL';
            confidence = 65;
            reasoning = 'Text analysis suggests bearish sentiment';
        }

        // Adjust confidence based on technical indicators
        if (marketData.rsi > 70) {
            confidence = Math.max(confidence - 10, 30);
        }
        if (marketData.rsi < 30) {
            confidence = Math.max(confidence - 10, 30);
        }

        return {
            signal,
            confidence,
            reasoning: `${reasoning}. ${text.substring(0, 150)}...`,
            timeframe: '4-24h',
            riskLevel: 'MEDIUM',
            timestamp: Date.now()
        };
    }

    /**
     * Get fallback prediction when Gemini fails
     */
    private getFallbackPrediction(marketData: MarketData): GeminiPrediction {
        // Simple technical analysis fallback
        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = 30;
        let reasoning = 'Fallback analysis: ';

        // RSI-based signal
        if (marketData.rsi < 30) {
            signal = 'BUY';
            confidence = 40;
            reasoning += 'RSI oversold condition. ';
        } else if (marketData.rsi > 70) {
            signal = 'SELL';
            confidence = 40;
            reasoning += 'RSI overbought condition. ';
        }

        // SMA trend confirmation
        if (marketData.price > marketData.sma20 && marketData.sma20 > marketData.sma50) {
            if (signal === 'BUY') {
                confidence += 10;
            }
            reasoning += 'Uptrend confirmed by SMA. ';
        } else if (marketData.price < marketData.sma20 && marketData.sma20 < marketData.sma50) {
            if (signal === 'SELL') {
                confidence += 10;
            }
            reasoning += 'Downtrend confirmed by SMA. ';
        }

        reasoning += `Gemini API unavailable (${this.lastError}). Using technical analysis fallback.`;

        return {
            signal,
            confidence,
            reasoning,
            timeframe: '4-24h',
            riskLevel: 'HIGH',
            timestamp: Date.now()
        };
    }

    // Helper methods
    private analyzeTrend(data: MarketData): string {
        if (data.price > data.sma20 && data.sma20 > data.sma50) {
            return 'Uptrend';
        }
        if (data.price < data.sma20 && data.sma20 < data.sma50) {
            return 'Downtrend';
        }
        return 'Sideways';
    }

    private getRSISignal(rsi: number): string {
        if (rsi > 70) {
            return 'Overbought';
        }
        if (rsi < 30) {
            return 'Oversold';
        }
        return 'Neutral';
    }

    private getMACDSignal(macd: number): string {
        return macd > 0 ? 'Bullish' : 'Bearish';
    }

    private validateSignal(signal: any): 'BUY' | 'SELL' | 'HOLD' {
        if (['BUY', 'SELL', 'HOLD'].includes(signal)) {
            return signal;
        }
        return 'HOLD';
    }

    private validateConfidence(confidence: any): number {
        const num = Number(confidence);
        if (isNaN(num)) {
            return 50;
        }
        return Math.max(0, Math.min(100, num));
    }

    private validateRiskLevel(riskLevel: any): 'LOW' | 'MEDIUM' | 'HIGH' {
        if (['LOW', 'MEDIUM', 'HIGH'].includes(riskLevel)) {
            return riskLevel;
        }
        return 'MEDIUM';
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test connection to Gemini API
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await this.callGeminiAPI(
                'Hello, this is a connection test. Please respond with "Connection successful".'
            );
            return (
                response.toLowerCase().includes('connection') ||
                response.toLowerCase().includes('successful')
            );
        } catch (error) {
            Logger.error('Gemini connection test failed:', error as any);
            return false;
        }
    }

    /**
     * Get usage statistics
     */
    getStats() {
        return {
            requestCount: this.requestCount,
            lastError: this.lastError,
            rateLimitRemaining:
                this.config.rateLimitPerMinute - this.rateLimiter['requests'].length,
            config: {
                model: this.config.model,
                timeout: this.config.timeout,
                maxRetries: this.config.maxRetries
            }
        };
    }
}

// Export for compatibility with existing AIPredictor interface
export interface PredictionResult {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning?: string;
}

/**
 * Adapter to make GeminiPredictor compatible with existing AIPredictor interface
 */
export class GeminiAIAdapter {
    private geminiPredictor: GeminiPredictor;

    constructor(config?: Partial<GeminiConfig>) {
        this.geminiPredictor = new GeminiPredictor(config);
    }

    async predict(marketData: any): Promise<PredictionResult> {
        const geminiData: MarketData = {
            symbol: marketData.symbol || 'BTC-USDT',
            price: marketData.close || marketData.price,
            volume: marketData.volume || 0,
            rsi: marketData.rsi || 50,
            macd: marketData.macd || 0,
            sma20: marketData.sma20 || marketData.close,
            sma50: marketData.sma50 || marketData.close,
            timestamp: Date.now()
        };

        const prediction = await this.geminiPredictor.predict(geminiData);

        return {
            signal: prediction.signal,
            confidence: prediction.confidence / 100, // Convert to 0-1 range
            reasoning: prediction.reasoning
        };
    }

    async testConnection(): Promise<boolean> {
        return this.geminiPredictor.testConnection();
    }

    getStats() {
        return this.geminiPredictor.getStats();
    }
}
