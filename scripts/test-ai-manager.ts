/**
 * 🧪 AI Manager Test Script
 * 
 * Script để test AI Manager và khả năng chuyển đổi giữa các AI providers
 */

import dotenv from 'dotenv';
import AIFactory from '../src/ai/AIFactory';
import { AIProviderType } from '../src/ai/interfaces/IAIProvider';
import Logger from '../src/utils/Logger';

// Load environment variables
dotenv.config();

/**
 * Test data mẫu
 */
const sampleMarketData = {
    symbol: 'BTC/USDT',
    currentPrice: 45000,
    timestamp: Date.now()
};

/**
 * Test AI Factory
 */
async function testAIFactory() {
    console.log('\n🏭 Testing AI Factory...');

    try {
        const factory = AIFactory.getInstance();

        // Test available providers
        const availableProviders = factory.getAvailableProviders();
        console.log('✅ Available providers:', availableProviders);

        // Test provider recommendations
        const costEffective = factory.getProviderRecommendations('cost-effective');
        console.log('💰 Cost-effective recommendation:', costEffective);

        const highAccuracy = factory.getProviderRecommendations('high-accuracy');
        console.log('🎯 High-accuracy recommendation:', highAccuracy);

        const fastResponse = factory.getProviderRecommendations('fast-response');
        console.log('⚡ Fast-response recommendation:', fastResponse);

        const offline = factory.getProviderRecommendations('offline');
        console.log('📴 Offline recommendation:', offline);

        return factory;
    } catch (error) {
        console.error('❌ AI Factory test failed:', error);
        throw error;
    }
}

/**
 * Test individual AI providers
 */
async function testIndividualProviders() {
    console.log('\n🤖 Testing Individual Providers...');

    const factory = AIFactory.getInstance();
    const availableProviders = factory.getAvailableProviders();

    for (const providerType of availableProviders) {
        try {
            console.log(`\n--- Testing ${providerType} ---`);

            // Validate config
            const isValid = factory.validateProviderConfig(providerType, {});
            console.log(`Config validation: ${isValid ? '✅' : '❌'}`);

            if (!isValid) {
                console.log(`⚠️ Skipping ${providerType} due to invalid config`);
                continue;
            }

            // Create provider
            const provider = await factory.createProvider(providerType);

            // Test connection
            const connectionTest = await provider.testConnection();
            console.log(`Connection test: ${connectionTest ? '✅' : '❌'}`);

            if (!connectionTest) {
                console.log(`⚠️ Skipping ${providerType} due to connection failure`);
                continue;
            }

            // Test prediction
            const startTime = Date.now();
            const prediction = await provider.predict(sampleMarketData);
            const responseTime = Date.now() - startTime;

            console.log(`Prediction result:`, {
                signal: prediction.signal,
                confidence: prediction.confidence,
                responseTime: `${responseTime}ms`,
                reasoning: prediction.reasoning?.substring(0, 100) + '...'
            });

            // Test cost estimation
            const cost = provider.getEstimatedCost();
            console.log(`Estimated cost: $${cost.toFixed(6)}`);

            // Get provider info
            const info = await provider.getInfo();
            console.log(`Provider info:`, {
                name: info.name,
                version: info.version,
                status: info.status
            });

        } catch (error) {
            console.error(`❌ ${providerType} test failed:`, error);
        }
    }
}

/**
 * Test AI Manager
 */
async function testAIManager() {
    console.log('\n🎛️ Testing AI Manager...');

    try {
        const factory = AIFactory.getInstance();

        // Create AI Manager from environment
        const aiManager = await factory.createAIManagerFromEnv();

        console.log('✅ AI Manager created successfully');

        // Test prediction
        console.log('\n--- Testing AI Manager Prediction ---');
        const startTime = Date.now();
        const prediction = await aiManager.predict(sampleMarketData);
        const responseTime = Date.now() - startTime;

        console.log('Prediction result:', {
            signal: prediction.signal,
            confidence: prediction.confidence,
            responseTime: `${responseTime}ms`,
            reasoning: prediction.reasoning?.substring(0, 150) + '...'
        });

        // Test provider switching
        console.log('\n--- Testing Provider Switching ---');
        const stats = aiManager.getStats();
        const currentProvider = stats.currentProvider;
        console.log(`Current provider: ${currentProvider}`);

        const availableProviders = factory.getAvailableProviders();
        const otherProviders = availableProviders.filter(p => p !== currentProvider);

        if (otherProviders.length > 0) {
            const newProvider = otherProviders[0];
            console.log(`Switching to: ${newProvider}`);

            await aiManager.switchProvider(newProvider);
            console.log(`✅ Switched to ${newProvider}`);

            // Test prediction with new provider
            const newPrediction = await aiManager.predict(sampleMarketData);
            console.log('New provider prediction:', {
                signal: newPrediction.signal,
                confidence: newPrediction.confidence
            });
        }

        // Get statistics
        console.log('\n--- AI Manager Statistics ---');
        const finalStats = aiManager.getStats();
        console.log('Statistics:', {
            currentProvider: finalStats.currentProvider,
            requestCount: finalStats.requestCount,
            errorCount: finalStats.errorCount,
            dailyCost: `$${finalStats.dailyCost.toFixed(6)}`,
            successRate: finalStats.successRate,
            availableProviders: finalStats.availableProviders,
            readyProviders: finalStats.readyProviders
        });

        return aiManager;
    } catch (error) {
        console.error('❌ AI Manager test failed:', error);
        throw error;
    }
}

/**
 * Test fallback mechanism
 */
async function testFallbackMechanism() {
    console.log('\n🔄 Testing Fallback Mechanism...');

    try {
        const factory = AIFactory.getInstance();
        const availableProviders = factory.getAvailableProviders();

        if (availableProviders.length < 2) {
            console.log('⚠️ Need at least 2 providers to test fallback');
            return;
        }

        // Create AI Manager with specific fallback config
        const aiManager = await factory.createAIManager({
            primaryProvider: availableProviders[0],
            fallbackProvider: availableProviders[1],
            autoSwitchOnError: true,
            maxRetries: 2,
            healthCheckInterval: 0
        });

        console.log(`Primary: ${availableProviders[0]}, Fallback: ${availableProviders[1]}`);

        // Test multiple predictions to trigger potential fallbacks
        for (let i = 0; i < 3; i++) {
            try {
                console.log(`\nPrediction ${i + 1}:`);
                const prediction = await aiManager.predict({
                    ...sampleMarketData,
                    currentPrice: sampleMarketData.currentPrice + (Math.random() * 1000)
                });

                console.log(`✅ Success: ${prediction.signal} (${(prediction.confidence * 100).toFixed(1)}%)`);
            } catch (error) {
                console.log(`❌ Failed: ${error}`);
            }
        }

        // Check final statistics
        const stats = aiManager.getStats();
        console.log('\nFallback test results:', {
            requestCount: stats.requestCount,
            errorCount: stats.errorCount,
            successRate: stats.successRate,
            currentProvider: stats.currentProvider,
            readyProviders: stats.readyProviders
        });

    } catch (error) {
        console.error('❌ Fallback test failed:', error);
    }
}

/**
 * Test performance comparison
 */
async function testPerformanceComparison() {
    console.log('\n⚡ Testing Performance Comparison...');

    try {
        const factory = AIFactory.getInstance();
        const availableProviders = factory.getAvailableProviders();

        const results: any[] = [];

        for (const providerType of availableProviders) {
            try {
                // Skip if config is invalid
                if (!factory.validateProviderConfig(providerType, {})) {
                    continue;
                }

                const provider = await factory.createProvider(providerType);

                // Test connection first
                if (!(await provider.testConnection())) {
                    continue;
                }

                // Run multiple predictions for average
                const iterations = 3;
                let totalTime = 0;
                let totalCost = 0;
                let successCount = 0;

                for (let i = 0; i < iterations; i++) {
                    try {
                        const startTime = Date.now();
                        const prediction = await provider.predict({
                            ...sampleMarketData,
                            currentPrice: sampleMarketData.currentPrice + (Math.random() * 1000)
                        });
                        const responseTime = Date.now() - startTime;

                        totalTime += responseTime;
                        totalCost += provider.getEstimatedCost();
                        successCount++;
                    } catch (error) {
                        console.log(`${providerType} iteration ${i + 1} failed:`, error);
                    }
                }

                if (successCount > 0) {
                    results.push({
                        provider: providerType,
                        avgResponseTime: Math.round(totalTime / successCount),
                        avgCost: totalCost / successCount,
                        successRate: (successCount / iterations) * 100
                    });
                }

            } catch (error) {
                console.log(`${providerType} performance test failed:`, error);
            }
        }

        // Display results
        console.log('\n📊 Performance Comparison Results:');
        console.table(results);

        // Recommendations
        if (results.length > 0) {
            const fastest = results.reduce((prev, curr) =>
                prev.avgResponseTime < curr.avgResponseTime ? prev : curr
            );

            const cheapest = results.reduce((prev, curr) =>
                prev.avgCost < curr.avgCost ? prev : curr
            );

            const mostReliable = results.reduce((prev, curr) =>
                prev.successRate > curr.successRate ? prev : curr
            );

            console.log('\n🏆 Recommendations:');
            console.log(`⚡ Fastest: ${fastest.provider} (${fastest.avgResponseTime}ms)`);
            console.log(`💰 Cheapest: ${cheapest.provider} ($${cheapest.avgCost.toFixed(6)})`);
            console.log(`🎯 Most Reliable: ${mostReliable.provider} (${mostReliable.successRate}%)`);
        }

    } catch (error) {
        console.error('❌ Performance comparison failed:', error);
    }
}

/**
 * Main test function
 */
async function main() {
    console.log('🚀 Starting AI Manager Test Suite...');
    console.log('=====================================');

    try {
        // Test AI Factory
        await testAIFactory();

        // Test individual providers
        await testIndividualProviders();

        // Test AI Manager
        await testAIManager();

        // Test fallback mechanism
        await testFallbackMechanism();

        // Test performance comparison
        await testPerformanceComparison();

        console.log('\n✅ All tests completed successfully!');

    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Run tests
if (require.main === module) {
    main().catch(console.error);
}

export { main as runAIManagerTests };