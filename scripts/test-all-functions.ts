#!/usr/bin/env ts-node

/**
 * 🧪 Comprehensive Test Suite
 * Tests all major bot functions to ensure everything is working properly
 */

import { config } from 'dotenv';
import Logger from '../src/utils/Logger';
import AIFactory from '../src/ai/AIFactory';
import HealthChecker from '../src/utils/healthCheck';
import MarketAnalyzer from '../src/bot/MarketAnalyzer';
import ccxt from 'ccxt';
import axios from 'axios';

// Load environment variables
config();

// Logger is already a static class, no need for getInstance

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
}

class ComprehensiveTestSuite {
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    Logger.info('🚀 Starting Comprehensive Test Suite');
  }

  private async runTest(testName: string, testFunction: () => Promise<void>): Promise<void> {
    const start = Date.now();
    try {
      Logger.info(`\n🧪 Testing: ${testName}`);
      await testFunction();
      const duration = Date.now() - start;
      this.results.push({
        name: testName,
        status: 'PASS',
        message: 'Test completed successfully',
        duration
      });
      Logger.info(`✅ ${testName} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - start;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.results.push({
        name: testName,
        status: 'FAIL',
        message,
        duration
      });
      Logger.error(`❌ ${testName} - FAILED: ${message} (${duration}ms)`);
    }
  }

  private async testEnvironmentVariables(): Promise<void> {
    const requiredVars = [
      'OKX_API_KEY',
      'OKX_SECRET_KEY',
      'OKX_PASSPHRASE'
    ];

    const optionalVars = [
      'GEMINI_API_KEY',
      'CLAUDE_API_KEY',
      'OPENAI_API_KEY'
    ];

    // Check required variables
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Required environment variable ${varName} is not set`);
      }
    }

    // Check optional variables (at least one AI provider should be available)
    const hasAIProvider = optionalVars.some(varName => process.env[varName]);
    if (!hasAIProvider) {
      throw new Error('At least one AI provider API key should be set');
    }

    Logger.info('✓ Environment variables are properly configured');
  }

  private async testOKXConnection(): Promise<void> {
    const exchange = new ccxt.okx({
      apiKey: process.env.OKX_API_KEY,
      secret: process.env.OKX_SECRET_KEY,
      password: process.env.OKX_PASSPHRASE,
      sandbox: process.env.OKX_SANDBOX === 'true'
    });

    // Test connection
    const markets = await exchange.loadMarkets();
    if (!markets['BTC/USDT']) {
      throw new Error('BTC/USDT market not found');
    }

    // Test ticker fetch
    const ticker = await exchange.fetchTicker('BTC/USDT');
    if (!ticker.last || ticker.last <= 0) {
      throw new Error('Invalid ticker data received');
    }

    // Test balance (should work even with 0 balance)
    const balance = await exchange.fetchBalance();
    if (typeof balance.free !== 'object') {
      throw new Error('Invalid balance data received');
    }

    Logger.info(`✓ OKX connection successful - BTC price: $${ticker.last}`);
  }

  private async testAISystem(): Promise<void> {
    const factory = AIFactory.getInstance();
    
    // Test AI Manager creation
    const aiManager = await factory.createAIManagerFromEnv();
    if (!aiManager) {
      throw new Error('Failed to create AI Manager');
    }

    // Test AI prediction
    const testMarketData = {
      symbol: 'BTC/USDT',
      currentPrice: 45000,
      timestamp: Date.now(),
      volume: 1000000,
      high24h: 46000,
      low24h: 44000,
      change24h: 2.5
    };

    const prediction = await aiManager.predict(testMarketData);
    if (!prediction || !prediction.signal || typeof prediction.confidence !== 'number') {
      throw new Error('Invalid AI prediction response');
    }

    if (prediction.confidence < 0 || prediction.confidence > 1) {
      throw new Error('AI confidence should be between 0 and 1');
    }

    const validSignals = ['BUY', 'SELL', 'HOLD'];
    if (!validSignals.includes(prediction.signal)) {
      throw new Error(`Invalid signal: ${prediction.signal}`);
    }

    // Test provider switching if multiple providers available
    const stats = aiManager.getStats();
    if (!stats || typeof stats.requestCount !== 'number') {
      throw new Error('Invalid AI Manager stats');
    }

    Logger.info(`✓ AI System working - Signal: ${prediction.signal}, Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
  }

  private async testHealthCheck(): Promise<void> {
    const healthChecker = new HealthChecker();
    const healthResult = await healthChecker.runAllChecks();
    
    if (healthResult.overall === 'CRITICAL') {
      throw new Error('Overall health check failed');
    }

    // Check for errors
    if (healthResult.errors.length > 0) {
      throw new Error(`Health check errors: ${healthResult.errors.join(', ')}`);
    }

    Logger.info('✓ Health check passed for all components');
  }

  private async testNetworkConnectivity(): Promise<void> {
    // Test internet connectivity
    const isSandbox = process.env.OKX_SANDBOX === 'true';
    const okxApiUrl = isSandbox 
      ? 'https://www.okx.com/api/v5/public/time'
      : 'https://api.okx.com/api/v5/public/time';
    
    try {
      await axios.get(okxApiUrl, { timeout: 5000 });
      Logger.info(`✓ OKX API connectivity verified (${isSandbox ? 'sandbox' : 'production'} mode)`);
    } catch (error) {
      throw new Error(`Failed to connect to OKX API (${isSandbox ? 'sandbox' : 'production'} mode)`);
    }

    // Test AI provider connectivity (if available)
    if (process.env.GEMINI_API_KEY) {
      try {
        await axios.get('https://generativelanguage.googleapis.com/v1/models', {
          headers: {
            'x-goog-api-key': process.env.GEMINI_API_KEY
          },
          timeout: 5000
        });
        Logger.info('✓ Gemini API connectivity verified');
      } catch (error) {
        Logger.warn('⚠️ Gemini API connectivity issue (but not critical)');
      }
    }

    Logger.info('✓ Network connectivity tests passed');
  }

  private async testTradingLogic(): Promise<void> {
    // Import and test basic trading components
    const MarketAnalyzerClass = (await import('../src/bot/MarketAnalyzer')).default;
    const RiskManagerClass = (await import('../src/bot/RiskManager')).default;

    // Test Market Analyzer
    const analyzer = new MarketAnalyzerClass();
    const testCandles = [
      { open: 44000, high: 45000, low: 43500, close: 44800, volume: 100, timestamp: Date.now() - 4 * 60000 },
      { open: 44800, high: 45200, low: 44600, close: 45000, volume: 120, timestamp: Date.now() - 3 * 60000 },
      { open: 45000, high: 45500, low: 44900, close: 45200, volume: 110, timestamp: Date.now() - 2 * 60000 },
      { open: 45200, high: 45800, low: 45100, close: 45600, volume: 130, timestamp: Date.now() - 1 * 60000 },
      { open: 45600, high: 46000, low: 45400, close: 45800, volume: 140, timestamp: Date.now() }
    ];

    const analysis = await analyzer.analyze({
      symbol: 'BTC/USDT',
      price: 44800,
      volume: 100,
      timestamp: Date.now(),
      ohlcv: testCandles.map(c => [c.timestamp, c.open, c.high, c.low, c.close, c.volume])
    });
    if (!analysis || typeof analysis.trend === 'undefined') {
      throw new Error('Market analysis failed');
    }

    // Test Risk Manager
    const riskManager = new RiskManagerClass();

    const riskAssessment = await riskManager.assess({
      marketData: {
        currentPrice: 44800,
        ohlcv: testCandles.map(c => [c.timestamp, c.open, c.high, c.low, c.close, c.volume])
      },
      technicalAnalysis: analysis,
      aiPrediction: {
        signal: 'BUY' as const,
        confidence: 0.8
      }
    });

    if (!riskAssessment || typeof riskAssessment.level === 'undefined') {
            throw new Error('Risk assessment failed');
        }

    Logger.info('✓ Trading logic components working correctly');
  }

  private async testFileSystem(): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Test log directory
    const logDir = path.join(process.cwd(), 'logs');
    try {
      await fs.access(logDir);
    } catch {
      await fs.mkdir(logDir, { recursive: true });
    }

    // Test write permissions
    const testFile = path.join(logDir, 'test-write.tmp');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);

    Logger.info('✓ File system access and permissions verified');
  }

  private async testAIAdvisorToggle(): Promise<void> {
    // Import TradingBot for testing
    const TradingBotClass = (await import('../src/bot/TradingBot')).default;
    
    // Store original environment value
    const originalValue = process.env.AI_ADVISOR_ENABLED;
    
    try {
      // Test 1: AI Advisor enabled
      process.env.AI_ADVISOR_ENABLED = 'true';
      const botEnabled = new TradingBotClass({
        exchange: 'okx',
        symbol: 'BTC/USDT',
        apiKey: process.env.OKX_API_KEY || '',
        secret: process.env.OKX_SECRET_KEY || '',
        passphrase: process.env.OKX_PASSPHRASE || '',
        sandbox: process.env.OKX_SANDBOX === 'true'
      });
      
      await botEnabled.initializeAI();
      const hasAIManagerEnabled = (botEnabled as any).aiManager !== null;
      
      if (!hasAIManagerEnabled) {
        throw new Error('AI Manager should be initialized when AI_ADVISOR_ENABLED=true');
      }
      
      // Test 2: AI Advisor disabled
      process.env.AI_ADVISOR_ENABLED = 'false';
      const botDisabled = new TradingBotClass({
        exchange: 'okx',
        symbol: 'BTC/USDT',
        apiKey: process.env.OKX_API_KEY || '',
        secret: process.env.OKX_SECRET_KEY || '',
        passphrase: process.env.OKX_PASSPHRASE || '',
        sandbox: process.env.OKX_SANDBOX === 'true'
      });
      
      await botDisabled.initializeAI();
      const hasAIManagerDisabled = (botDisabled as any).aiManager !== null;
      
      if (hasAIManagerDisabled) {
        throw new Error('AI Manager should be null when AI_ADVISOR_ENABLED=false');
      }
      
      // Test 3: Fallback prediction functionality
      const mockTechnicalAnalysis = {
        rsi: 30,
        macd: { macd: 0.1, signal: 0.05, histogram: 0.05 },
        bollinger: { upper: 45000, middle: 44000, lower: 43000 },
        signal: 'BUY' as const,
        confidence: 0.75
      };
      
      const fallbackPrediction = (botDisabled as any).getFallbackAIPrediction(mockTechnicalAnalysis);
      const currentTime = Date.now();
      const timeDiff = Math.abs(fallbackPrediction.timestamp - currentTime);
      
      if (!fallbackPrediction || 
          fallbackPrediction.signal !== 'BUY' ||
          Math.abs(fallbackPrediction.confidence - 0.6) > 0.01 ||
          !fallbackPrediction.note?.includes('AI Advisor disabled') ||
          timeDiff > 5000) {
        throw new Error('Fallback prediction not working correctly');
      }
      
      Logger.info('✓ AI Advisor toggle functionality working correctly');
      
    } finally {
      // Restore original environment value
      if (originalValue !== undefined) {
        process.env.AI_ADVISOR_ENABLED = originalValue;
      } else {
        delete process.env.AI_ADVISOR_ENABLED;
      }
    }
  }

  private async testGenerateSignals(): Promise<void> {
    Logger.info('Testing signal generation with market analysis...');
    
    const analyzer = new MarketAnalyzer();
    
    // Test with sample market data
    const marketData = {
      symbol: 'BTC/USDT',
      price: 50000,
      volume: 1000000,
      timestamp: Date.now(),
      ohlcv: [
        [Date.now() - 86400000 * 20, 48000, 48500, 47500, 48200, 800000],
        [Date.now() - 86400000 * 19, 48200, 48800, 48000, 48600, 850000],
        [Date.now() - 86400000 * 18, 48600, 49200, 48400, 49000, 900000],
        [Date.now() - 86400000 * 17, 49000, 49500, 48800, 49300, 950000],
        [Date.now() - 86400000 * 16, 49300, 49800, 49100, 49600, 1000000],
        [Date.now() - 86400000 * 15, 49600, 50200, 49400, 49900, 1050000],
        [Date.now() - 86400000 * 14, 49900, 50500, 49700, 50200, 1100000],
        [Date.now() - 86400000 * 13, 50200, 50800, 50000, 50500, 1150000],
        [Date.now() - 86400000 * 12, 50500, 51000, 50300, 50800, 1200000],
        [Date.now() - 86400000 * 11, 50800, 51200, 50600, 51000, 1250000],
        [Date.now() - 86400000 * 10, 51000, 51500, 50800, 51200, 1300000],
        [Date.now() - 86400000 * 9, 51200, 51800, 51000, 51500, 1350000],
        [Date.now() - 86400000 * 8, 51500, 52000, 51300, 51800, 1400000],
        [Date.now() - 86400000 * 7, 51800, 52200, 51600, 52000, 1450000],
        [Date.now() - 86400000 * 6, 52000, 52500, 51800, 52200, 1500000],
        [Date.now() - 86400000 * 5, 52200, 52800, 52000, 52500, 1550000],
        [Date.now() - 86400000 * 4, 52500, 53000, 52300, 52800, 1600000],
        [Date.now() - 86400000 * 3, 52800, 53200, 52600, 53000, 1650000],
        [Date.now() - 86400000 * 2, 53000, 53500, 52800, 53200, 1700000],
        [Date.now() - 86400000 * 1, 53200, 53800, 53000, 50000, 1000000]
      ]
    };
    
    // Test market analysis
    const result = await analyzer.analyze(marketData);
    
    // Verify result structure
    if (!result || typeof result !== 'object') {
      throw new Error('analyze should return an object');
    }
    
    if (!['BUY', 'SELL', 'HOLD'].includes(result.signal)) {
      throw new Error(`Invalid signal: ${result.signal}`);
    }
    
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 100) {
      throw new Error(`Invalid confidence: ${result.confidence}`);
    }
    
    if (!Array.isArray(result.reasoning) || result.reasoning.length === 0) {
      throw new Error('Missing or invalid reasoning array');
    }
    
    Logger.info(`✓ Signal generated: ${result.signal} (${result.confidence}% confidence)`);
    Logger.info(`✓ Reasoning: ${result.reasoning.join(', ')}`);
    Logger.info(`✓ RSI: ${result.rsi}`);
    Logger.info(`✓ Daily trend: ${result.dailyTrend}`);
    
    // Verify technical indicators are calculated
    if (typeof result.rsi !== 'number' || result.rsi < 0 || result.rsi > 100) {
      throw new Error(`Invalid RSI: ${result.rsi}`);
    }
    
    if (!result.macd || typeof result.macd.macd !== 'number') {
      throw new Error('Invalid MACD data');
    }
    
    if (!result.bollinger || typeof result.bollinger.upper !== 'number') {
      throw new Error('Invalid Bollinger Bands data');
    }
    
    Logger.info('✅ Generate signals test completed successfully');
  }

  public async runAllTests(): Promise<void> {
    this.startTime = Date.now();
    
    Logger.info('🔍 Running comprehensive test suite...');
    Logger.info('=' .repeat(60));

    // Run all tests
    await this.runTest('Environment Variables', () => this.testEnvironmentVariables());
    await this.runTest('Network Connectivity', () => this.testNetworkConnectivity());
    await this.runTest('File System Access', () => this.testFileSystem());
    await this.runTest('OKX Exchange Connection', () => this.testOKXConnection());
    await this.runTest('AI System', () => this.testAISystem());
    await this.runTest('AI Advisor Toggle', () => this.testAIAdvisorToggle());
    await this.runTest('Trading Logic', () => this.testTradingLogic());
    await this.runTest('Generate Signals', () => this.testGenerateSignals());
    await this.runTest('Health Check System', () => this.testHealthCheck());

    // Generate report
    this.generateReport();
  }

  private generateReport(): void {
    const totalTime = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;

    Logger.info('\n' + '=' .repeat(60));
    Logger.info('📊 TEST RESULTS SUMMARY');
    Logger.info('=' .repeat(60));
    
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      const duration = `${result.duration}ms`;
      Logger.info(`${icon} ${result.name.padEnd(30)} ${result.status.padEnd(6)} ${duration.padStart(8)}`);
      if (result.status === 'FAIL') {
        Logger.error(`   └─ ${result.message}`);
      }
    });

    Logger.info('\n' + '-'.repeat(60));
    Logger.info(`📈 TOTAL: ${this.results.length} tests`);
    Logger.info(`✅ PASSED: ${passed}`);
    Logger.info(`❌ FAILED: ${failed}`);
    Logger.info(`⏭️ SKIPPED: ${skipped}`);
    Logger.info(`⏱️ DURATION: ${totalTime}ms`);
    Logger.info(`🎯 SUCCESS RATE: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    if (failed === 0) {
      Logger.info('\n🎉 ALL TESTS PASSED! Bot is ready for operation.');
    } else {
      Logger.error('\n⚠️ SOME TESTS FAILED! Please fix the issues before running the bot.');
      process.exit(1);
    }
  }
}

// Run the test suite
async function main() {
  try {
    const testSuite = new ComprehensiveTestSuite();
    await testSuite.runAllTests();
  } catch (error) {
    Logger.error('💥 Test suite crashed:', error as Error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ComprehensiveTestSuite };