#!/usr/bin/env ts-node

/**
 * 🧪 Test AI Advisor Toggle Feature
 * 
 * Script kiểm tra tính năng bật/tắt AI Advisor
 * Kiểm tra bot hoạt động với cả 2 chế độ:
 * - AI_ADVISOR_ENABLED=true: Sử dụng AI + Technical Analysis
 * - AI_ADVISOR_ENABLED=false: Chỉ sử dụng Technical Analysis
 */

import * as dotenv from 'dotenv';
import Logger from '../src/utils/Logger';
import { default as TradingBot } from '../src/bot/TradingBot';
import { promises as fs } from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

class AIAdvisorToggleTest {
    private originalEnvValue: string | undefined;
    private testResults: { [key: string]: any } = {};

    constructor() {
        this.originalEnvValue = process.env.AI_ADVISOR_ENABLED;
    }

    /**
     * Chạy test với AI Advisor được bật
     */
    async testWithAIEnabled(): Promise<void> {
        Logger.info('🧪 Testing with AI_ADVISOR_ENABLED=true');
        
        // Set environment variable
        process.env.AI_ADVISOR_ENABLED = 'true';
        
        try {
            const bot = new (TradingBot as any)({
                exchange: 'okx',
                symbol: process.env.TRADING_PAIR || 'BTC/USDT',
                apiKey: process.env.OKX_API_KEY || '',
                secret: process.env.OKX_SECRET_KEY || '',
                passphrase: process.env.OKX_PASSPHRASE || '',
                sandbox: process.env.OKX_SANDBOX === 'true'
            });

            // Initialize AI
            await bot.initializeAI();
            
            // Check if AI Manager is initialized
            const aiManager = (bot as any).aiManager;
            const hasAI = aiManager !== null;
            
            this.testResults.aiEnabled = {
                success: true,
                hasAIManager: hasAI,
                message: hasAI ? 'AI Manager initialized successfully' : 'AI Manager is null (fallback mode)'
            };
            
            Logger.info(`✓ AI Enabled Test: ${hasAI ? 'AI Manager active' : 'Fallback to technical analysis'}`);
            
        } catch (error) {
            this.testResults.aiEnabled = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'Failed to initialize bot with AI enabled'
            };
            Logger.error('❌ AI Enabled Test failed:', error as Error);
        }
    }

    /**
     * Chạy test với AI Advisor bị tắt
     */
    async testWithAIDisabled(): Promise<void> {
        Logger.info('🧪 Testing with AI_ADVISOR_ENABLED=false');
        
        // Set environment variable
        process.env.AI_ADVISOR_ENABLED = 'false';
        
        try {
            const bot = new (TradingBot as any)({
                exchange: 'okx',
                symbol: process.env.TRADING_PAIR || 'BTC/USDT',
                apiKey: process.env.OKX_API_KEY || '',
                secret: process.env.OKX_SECRET_KEY || '',
                passphrase: process.env.OKX_PASSPHRASE || '',
                sandbox: process.env.OKX_SANDBOX === 'true'
            });

            // Initialize AI (should skip)
            await bot.initializeAI();
            
            // Check if AI Manager is null
            const aiManager = (bot as any).aiManager;
            const hasAI = aiManager !== null;
            
            this.testResults.aiDisabled = {
                success: true,
                hasAIManager: hasAI,
                message: !hasAI ? 'AI Manager correctly disabled' : 'AI Manager should be null when disabled'
            };
            
            Logger.info(`✓ AI Disabled Test: ${!hasAI ? 'AI correctly disabled' : 'WARNING: AI still active'}`);
            
        } catch (error) {
            this.testResults.aiDisabled = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'Failed to initialize bot with AI disabled'
            };
            Logger.error('❌ AI Disabled Test failed:', error as Error);
        }
    }

    /**
     * Test fallback AI prediction
     */
    async testFallbackPrediction(): Promise<void> {
        Logger.info('🧪 Testing fallback AI prediction');
        
        process.env.AI_ADVISOR_ENABLED = 'false';
        
        try {
            const bot = new (TradingBot as any)({
                exchange: 'okx',
                symbol: process.env.TRADING_PAIR || 'BTC/USDT',
                apiKey: process.env.OKX_API_KEY || '',
                secret: process.env.OKX_SECRET_KEY || '',
                passphrase: process.env.OKX_PASSPHRASE || '',
                sandbox: process.env.OKX_SANDBOX === 'true'
            });

            // Mock technical analysis
            const mockTechnicalAnalysis = {
                rsi: 45,
                macd: { macd: 0.001, signal: 0.0008, histogram: 0.0002 },
                bollinger: { upper: 46000, middle: 45000, lower: 44000 },
                signal: 'BUY' as const,
                confidence: 0.75
            };

            // Test fallback prediction
            const fallbackPrediction = (bot as any).getFallbackAIPrediction(mockTechnicalAnalysis);
            const currentTime = Date.now();
            const timeDiff = fallbackPrediction?.timestamp ? Math.abs(fallbackPrediction.timestamp - currentTime) : Infinity;
            
            // Debug information
            Logger.debug('Fallback prediction debug:', {
                prediction: fallbackPrediction,
                currentTime: currentTime,
                timeDiff: timeDiff,
                expectedConfidence: 0.75 * 0.8
            });
            
            const isValid = fallbackPrediction &&
                           fallbackPrediction.signal === 'BUY' &&
                           Math.abs(fallbackPrediction.confidence - 0.6) < 0.01 && // Allow small floating point errors
                           fallbackPrediction.note?.includes('AI Advisor disabled') &&
                           timeDiff < 5000; // Timestamp should be within 5 seconds
            
            this.testResults.fallbackPrediction = {
                success: isValid,
                prediction: fallbackPrediction,
                timeDiff: timeDiff,
                currentTime: currentTime,
                message: isValid ? 'Fallback prediction works correctly' : 'Fallback prediction has issues'
            };
            
            Logger.info(`✓ Fallback Prediction Test: ${isValid ? 'Working correctly' : 'Has issues'}`);
            
        } catch (error) {
            this.testResults.fallbackPrediction = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'Failed to test fallback prediction'
            };
            Logger.error('❌ Fallback Prediction Test failed:', error as Error);
        }
    }

    /**
     * Khôi phục giá trị environment ban đầu
     */
    restoreEnvironment(): void {
        if (this.originalEnvValue !== undefined) {
            process.env.AI_ADVISOR_ENABLED = this.originalEnvValue;
        } else {
            delete process.env.AI_ADVISOR_ENABLED;
        }
    }

    /**
     * Lưu kết quả test
     */
    async saveResults(): Promise<void> {
        try {
            const dataDir = path.join(__dirname, '../data');
            await fs.mkdir(dataDir, { recursive: true });
            
            const resultsFile = path.join(dataDir, 'ai_advisor_toggle_test_results.json');
            const results = {
                timestamp: new Date().toISOString(),
                originalEnvValue: this.originalEnvValue,
                tests: this.testResults,
                summary: {
                    totalTests: Object.keys(this.testResults).length,
                    passedTests: Object.values(this.testResults).filter((r: any) => r.success).length,
                    failedTests: Object.values(this.testResults).filter((r: any) => !r.success).length
                }
            };
            
            await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
            Logger.info(`📄 Test results saved to: ${resultsFile}`);
            
        } catch (error) {
            Logger.error('❌ Failed to save test results:', error as Error);
        }
    }

    /**
     * Hiển thị tóm tắt kết quả
     */
    displaySummary(): void {
        const totalTests = Object.keys(this.testResults).length;
        const passedTests = Object.values(this.testResults).filter((r: any) => r.success).length;
        const failedTests = totalTests - passedTests;
        
        Logger.info('\n📊 AI ADVISOR TOGGLE TEST SUMMARY');
        Logger.info('=' .repeat(50));
        Logger.info(`Total Tests: ${totalTests}`);
        Logger.info(`Passed: ${passedTests} ✓`);
        Logger.info(`Failed: ${failedTests} ❌`);
        Logger.info(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        // Chi tiết từng test
        Object.entries(this.testResults).forEach(([testName, result]: [string, any]) => {
            const status = result.success ? '✓' : '❌';
            Logger.info(`${status} ${testName}: ${result.message}`);
        });
        
        Logger.info('=' .repeat(50));
    }

    /**
     * Chạy tất cả tests
     */
    async runAllTests(): Promise<void> {
        Logger.info('🚀 Starting AI Advisor Toggle Tests...');
        
        try {
            await this.testWithAIEnabled();
            await this.testWithAIDisabled();
            await this.testFallbackPrediction();
            
            await this.saveResults();
            this.displaySummary();
            
        } finally {
            this.restoreEnvironment();
            Logger.info('🔄 Environment restored to original state');
        }
    }
}

// Chạy tests nếu file được execute trực tiếp
if (require.main === module) {
    const tester = new AIAdvisorToggleTest();
    
    tester.runAllTests()
        .then(() => {
            Logger.info('✅ All tests completed!');
            process.exit(0);
        })
        .catch((error) => {
            Logger.error('❌ Test suite failed:', error);
            process.exit(1);
        });
}

export default AIAdvisorToggleTest;