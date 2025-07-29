#!/usr/bin/env node

/**
 * 🧪 External AI Test Script
 *
 * Kiểm tra cấu hình External AI và khả năng kết nối
 */

import dotenv from 'dotenv';
import AIFactory from '../ai/AIFactory.js';
import Logger from '../utils/Logger.js';
import { AIProviderType } from '../ai/interfaces/IAIProvider.js';

// Load environment variables
dotenv.config();

interface TestResult {
    provider: string;
    status: 'SUCCESS' | 'FAILED';
    responseTime?: number;
    confidence?: number;
    error?: string;
}

class ExternalAITester {
    private results: TestResult[] = [];

    async runAllTests(): Promise<void> {
        console.log('🧪 Bắt đầu kiểm tra External AI Configuration...');
        console.log('='.repeat(60));

        // Test 1: Environment Configuration
        await this.testEnvironmentConfig();

        // Test 2: AI Manager Initialization
        await this.testAIManagerInit();

        // Test 3: AI Prediction
        await this.testAIPrediction();

        // Test 4: Provider Switching
        await this.testProviderSwitching();

        // Test 5: Cost Monitoring
        await this.testCostMonitoring();

        // Summary
        this.printSummary();
    }

    private async testEnvironmentConfig(): Promise<void> {
        console.log('\n📋 Test 1: Environment Configuration');
        console.log('-'.repeat(40));

        const requiredVars = [
            'AI_PRIMARY_PROVIDER',
            'AI_FALLBACK_PROVIDER',
            'EXTERNAL_AI_SERVICE',
            'GEMINI_API_KEY'
        ];

        let allConfigured = true;

        for (const varName of requiredVars) {
            const value = process.env[varName];
            if (value && value !== 'your_gemini_api_key_here') {
                console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
            } else {
                console.log(`❌ ${varName}: Not configured`);
                allConfigured = false;
            }
        }

        // Check AI provider settings
        const primaryProvider = process.env.AI_PRIMARY_PROVIDER;
        const externalService = process.env.EXTERNAL_AI_SERVICE;

        if (primaryProvider === 'external') {
            console.log('✅ Primary provider: External AI');
        } else {
            console.log('❌ Primary provider: Not set to external');
            allConfigured = false;
        }

        if (externalService === 'gemini') {
            console.log('✅ External service: Gemini AI');
        } else {
            console.log(`⚠️ External service: ${externalService || 'Not set'}`);
        }

        this.results.push({
            provider: 'Environment Config',
            status: allConfigured ? 'SUCCESS' : 'FAILED',
            error: allConfigured ? undefined : 'Missing required environment variables'
        });
    }

    private async testAIManagerInit(): Promise<void> {
        console.log('\n🤖 Test 2: AI Manager Initialization');
        console.log('-'.repeat(40));

        try {
            const startTime = Date.now();
            const factory = AIFactory.getInstance();
            const aiManager = await factory.createAIManagerFromEnv();
            const endTime = Date.now();

            const responseTime = endTime - startTime;
            console.log(`✅ AI Manager initialized successfully in ${responseTime}ms`);

            // Get provider info
            const stats = aiManager.getStats();
            console.log(`✅ Current provider: ${stats.currentProvider}`);
            console.log(`✅ Available providers: ${stats.availableProviders.length}`);
            console.log(`✅ Ready providers: ${stats.readyProviders.length}`);

            this.results.push({
                provider: 'AI Manager',
                status: 'SUCCESS',
                responseTime
            });
        } catch (error) {
            console.log(`❌ Failed to initialize AI Manager: ${(error as Error).message}`);
            this.results.push({
                provider: 'AI Manager',
                status: 'FAILED',
                error: (error as Error).message
            });
        }
    }

    private async testAIPrediction(): Promise<void> {
        console.log('\n📊 Test 3: AI Prediction');
        console.log('-'.repeat(40));

        try {
            const factory = AIFactory.getInstance();
            const aiManager = await factory.createAIManagerFromEnv();

            // Mock market data
            const marketData = {
                symbol: 'BTC/USDT',
                currentPrice: 45000,
                volume: 1000000,
                timestamp: Date.now(),
                ohlcv: [
                    [Date.now() - 3600000, 44000, 45500, 43500, 45000, 1000],
                    [Date.now() - 1800000, 45000, 45200, 44800, 45100, 800],
                    [Date.now(), 45100, 45300, 44900, 45000, 1200]
                ] as [number, number, number, number, number, number][]
            };

            console.log('📈 Testing with mock BTC/USDT data...');
            console.log(`💰 Price: $${marketData.currentPrice.toLocaleString()}`);

            const startTime = Date.now();
            const prediction = await aiManager.predict(marketData);
            const endTime = Date.now();

            const responseTime = endTime - startTime;
            console.log(`✅ Prediction received in ${responseTime}ms`);
            console.log(`🎯 Signal: ${prediction.signal}`);
            console.log(`📊 Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
            if (prediction.note) {
                console.log(`💭 Note: ${prediction.note}`);
            }

            this.results.push({
                provider: 'AI Prediction',
                status: 'SUCCESS',
                responseTime,
                confidence: prediction.confidence
            });
        } catch (error) {
            console.log(`❌ Failed to get AI prediction: ${(error as Error).message}`);
            this.results.push({
                provider: 'AI Prediction',
                status: 'FAILED',
                error: (error as Error).message
            });
        }
    }

    private async testProviderSwitching(): Promise<void> {
        console.log('\n🔄 Test 4: Provider Switching');
        console.log('-'.repeat(40));

        try {
            const factory = AIFactory.getInstance();
            const aiManager = await factory.createAIManagerFromEnv();

            // Get current provider
            const initialStats = aiManager.getStats();
            console.log(`📍 Initial provider: ${initialStats.currentProvider}`);

            // Test switching (if multiple providers available)
            const availableProviders = initialStats.availableProviders;
            console.log(`🔧 Available providers: ${availableProviders.join(', ')}`);

            if (availableProviders.length > 1) {
                const targetProvider = availableProviders.find(
                    p => p !== initialStats.currentProvider
                );
                if (targetProvider) {
                    console.log(`🔄 Attempting to switch to: ${targetProvider}`);
                    const switched = await aiManager.switchProvider(
                        targetProvider as AIProviderType
                    );
                    if (switched) {
                        console.log(`✅ Successfully switched to: ${targetProvider}`);
                    } else {
                        console.log(`⚠️ Failed to switch to: ${targetProvider}`);
                    }
                }
            } else {
                console.log('ℹ️ Only one provider configured, skipping switch test');
            }

            this.results.push({
                provider: 'Provider Switching',
                status: 'SUCCESS'
            });
        } catch (error) {
            console.log(`❌ Provider switching test failed: ${(error as Error).message}`);
            this.results.push({
                provider: 'Provider Switching',
                status: 'FAILED',
                error: (error as Error).message
            });
        }
    }

    private async testCostMonitoring(): Promise<void> {
        console.log('\n💰 Test 5: Cost Monitoring');
        console.log('-'.repeat(40));

        try {
            const factory = AIFactory.getInstance();
            const aiManager = await factory.createAIManagerFromEnv();

            const stats = aiManager.getStats();
            console.log(`💸 Daily cost: $${stats.dailyCost?.toFixed(4) || '0.0000'}`);
            console.log(`📊 Request count: ${stats.requestCount || 0}`);
            console.log(`❌ Error count: ${stats.errorCount || 0}`);
            console.log(`🎯 Success rate: ${stats.successRate || '0%'}`);

            // Check cost threshold
            const costThreshold = parseFloat(process.env.AI_COST_THRESHOLD || '10.0');
            console.log(`🚨 Cost threshold: $${costThreshold}`);

            if ((stats.dailyCost || 0) < costThreshold) {
                console.log('✅ Cost within threshold');
            } else {
                console.log('⚠️ Cost approaching threshold');
            }

            this.results.push({
                provider: 'Cost Monitoring',
                status: 'SUCCESS'
            });
        } catch (error) {
            console.log(`❌ Cost monitoring test failed: ${(error as Error).message}`);
            this.results.push({
                provider: 'Cost Monitoring',
                status: 'FAILED',
                error: (error as Error).message
            });
        }
    }

    private printSummary(): void {
        console.log('\n📋 Test Summary');
        console.log('='.repeat(60));

        const successCount = this.results.filter(r => r.status === 'SUCCESS').length;
        const totalCount = this.results.length;

        console.log(`\n🎯 Overall Result: ${successCount}/${totalCount} tests passed`);

        if (successCount === totalCount) {
            console.log('🎉 All tests passed! External AI is ready to use.');
        } else {
            console.log('⚠️ Some tests failed. Please check the configuration.');
        }

        console.log('\n📊 Detailed Results:');
        this.results.forEach(result => {
            const status = result.status === 'SUCCESS' ? '✅' : '❌';
            const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
            const confidence = result.confidence
                ? ` - ${(result.confidence * 100).toFixed(1)}%`
                : '';
            console.log(`${status} ${result.provider}${time}${confidence}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });

        console.log('\n💡 Next Steps:');
        if (successCount === totalCount) {
            console.log('1. ✅ Run the trading bot: npm run demo');
            console.log('2. ✅ Monitor AI usage and costs');
            console.log('3. ✅ Adjust rate limits if needed');
        } else {
            console.log('1. ❌ Fix configuration issues above');
            console.log('2. ❌ Check API keys in .env file');
            console.log('3. ❌ Verify internet connection');
            console.log('4. ❌ Run test again: npm run test-external-ai');
        }

        console.log('\n📚 Documentation: ./EXTERNAL_AI_ONLY_SETUP.md');
        console.log('🔧 Configuration: ./.env');
    }
}

// Run tests if called directly
if (process.argv[1] && process.argv[1].endsWith('external-ai-test.ts')) {
    const tester = new ExternalAITester();
    tester.runAllTests().catch(error => {
        Logger.error('Test execution failed:', error);
        process.exit(1);
    });
}

export default ExternalAITester;
