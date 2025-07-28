#!/usr/bin/env node

/**
 * 🤖 Gemini AI Integration Test Script
 * 
 * Script này test khả năng tích hợp Gemini AI vào trading bot
 * và so sánh performance với local AI model
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Mock market data for testing
const mockMarketData = {
  symbol: 'BTC-USDT',
  price: 45234.56,
  volume: 1250000,
  rsi: 68.5,
  macd: 0.0023,
  sma20: 44890.12,
  sma50: 44567.89,
  timestamp: Date.now()
};

class GeminiTester {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      console.log('❌ GEMINI_API_KEY not found in .env file');
      console.log('📝 Please add: GEMINI_API_KEY=your_api_key_here');
      process.exit(1);
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async testConnection() {
    console.log('🔗 Testing Gemini API connection...');
    try {
      const result = await this.model.generateContent('Hello, this is a connection test.');
      const response = await result.response;
      const text = response.text();

      if (text && text.length > 0) {
        console.log('✅ Gemini API connection successful!');
        console.log(`📝 Response: ${text.substring(0, 100)}...`);
        return true;
      }
    } catch (error) {
      console.log('❌ Gemini API connection failed:', error.message);
      return false;
    }
  }

  createTradingPrompt(data) {
    return `
Bạn là một chuyên gia phân tích kỹ thuật cryptocurrency với 10 năm kinh nghiệm.
Hãy phân tích dữ liệu thị trường sau và đưa ra dự đoán trading:

📊 THÔNG TIN THỊ TRƯỜNG:
- Symbol: ${data.symbol}
- Giá hiện tại: $${data.price.toFixed(2)}
- Volume 24h: ${data.volume.toLocaleString()}
- RSI (14): ${data.rsi.toFixed(2)}
- MACD: ${data.macd.toFixed(4)}
- SMA 20: $${data.sma20.toFixed(2)}
- SMA 50: $${data.sma50.toFixed(2)}
- Timestamp: ${new Date(data.timestamp).toISOString()}

🎯 YÊU CẦU PHÂN TÍCH:
1. Đánh giá xu hướng ngắn hạn (4-24h)
2. Xác định tín hiệu BUY/SELL/HOLD
3. Đưa ra mức độ tin cậy (0-100%)
4. Giải thích lý do quyết định
5. Đánh giá mức độ rủi ro

📋 ĐỊNH DẠNG RESPONSE (JSON):
{
  "signal": "BUY|SELL|HOLD",
  "confidence": 85,
  "reasoning": "Giải thích chi tiết lý do",
  "timeframe": "4-24h",
  "riskLevel": "LOW|MEDIUM|HIGH"
}

⚠️ LƯU Ý:
- Ưu tiên bảo toàn vốn
- Chỉ đưa ra tín hiệu BUY/SELL khi confidence > 70%
- Xem xét tất cả indicators
- Không đưa ra lời khuyên tài chính
`;
  }

  async testTradingPrediction() {
    console.log('\n🧠 Testing Gemini trading prediction...');
    console.log('📊 Market Data:', JSON.stringify(mockMarketData, null, 2));

    try {
      const prompt = this.createTradingPrompt(mockMarketData);
      const startTime = Date.now();

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`⏱️  Response time: ${responseTime}ms`);
      console.log('🤖 Gemini Response:');
      console.log('='.repeat(50));
      console.log(text);
      console.log('='.repeat(50));

      // Try to parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('\n✅ Parsed Prediction:');
          console.log(`📈 Signal: ${parsed.signal}`);
          console.log(`🎯 Confidence: ${parsed.confidence}%`);
          console.log(`⏰ Timeframe: ${parsed.timeframe}`);
          console.log(`⚠️  Risk Level: ${parsed.riskLevel}`);
          console.log(`💭 Reasoning: ${parsed.reasoning}`);

          return {
            success: true,
            prediction: parsed,
            responseTime,
            rawResponse: text
          };
        } catch (parseError) {
          console.log('⚠️  JSON parsing failed, but got response');
        }
      }

      return {
        success: true,
        prediction: null,
        responseTime,
        rawResponse: text
      };

    } catch (error) {
      console.log('❌ Gemini prediction failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testMultiplePredictions(count = 3) {
    console.log(`\n🔄 Testing ${count} consecutive predictions...`);
    const results = [];

    for (let i = 1; i <= count; i++) {
      console.log(`\n--- Prediction ${i}/${count} ---`);

      // Slightly modify market data for each test
      const testData = {
        ...mockMarketData,
        price: mockMarketData.price + (Math.random() - 0.5) * 1000,
        rsi: Math.max(0, Math.min(100, mockMarketData.rsi + (Math.random() - 0.5) * 20)),
        timestamp: Date.now()
      };

      const result = await this.testTradingPrediction();
      results.push(result);

      // Wait 2 seconds between requests to avoid rate limiting
      if (i < count) {
        console.log('⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Analyze results
    console.log('\n📊 SUMMARY ANALYSIS:');
    console.log('='.repeat(50));

    const successful = results.filter(r => r.success).length;
    const avgResponseTime = results
      .filter(r => r.responseTime)
      .reduce((sum, r) => sum + r.responseTime, 0) / successful;

    console.log(`✅ Success Rate: ${successful}/${count} (${(successful / count * 100).toFixed(1)}%)`);
    console.log(`⏱️  Average Response Time: ${avgResponseTime.toFixed(0)}ms`);

    const predictions = results
      .filter(r => r.prediction)
      .map(r => r.prediction);

    if (predictions.length > 0) {
      const signals = predictions.map(p => p.signal);
      const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

      console.log(`📈 Signals: ${signals.join(', ')}`);
      console.log(`🎯 Average Confidence: ${avgConfidence.toFixed(1)}%`);
    }

    return results;
  }

  async runFullTest() {
    console.log('🚀 Starting Gemini AI Integration Test');
    console.log('='.repeat(50));

    // Test 1: Connection
    const connectionOk = await this.testConnection();
    if (!connectionOk) {
      console.log('❌ Cannot proceed without API connection');
      return;
    }

    // Test 2: Single prediction
    await this.testTradingPrediction();

    // Test 3: Multiple predictions
    await this.testMultiplePredictions(3);

    console.log('\n🎉 Gemini AI Integration Test Complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Review the predictions quality');
    console.log('   2. Adjust prompts if needed');
    console.log('   3. Implement rate limiting');
    console.log('   4. Add error handling');
    console.log('   5. Integrate into TradingBot.ts');

    console.log('\n💡 Tips:');
    console.log('   - Monitor API usage and costs');
    console.log('   - Implement caching for repeated requests');
    console.log('   - Always have fallback to local AI');
    console.log('   - Test thoroughly before live trading');
  }
}

// Cost calculator
function calculateCosts() {
  console.log('\n💰 GEMINI API COST ANALYSIS:');
  console.log('='.repeat(40));

  const costPerRequest = 0.001; // $0.001 per request
  const requestsPerDay = {
    'Conservative (1/hour)': 24,
    'Moderate (1/15min)': 96,
    'Aggressive (1/5min)': 288,
    'Very Aggressive (1/min)': 1440
  };

  Object.entries(requestsPerDay).forEach(([strategy, requests]) => {
    const dailyCost = requests * costPerRequest;
    const monthlyCost = dailyCost * 30;
    const yearlyCost = dailyCost * 365;

    console.log(`\n📊 ${strategy}:`);
    console.log(`   Daily: ${requests} requests = $${dailyCost.toFixed(2)}`);
    console.log(`   Monthly: $${monthlyCost.toFixed(2)}`);
    console.log(`   Yearly: $${yearlyCost.toFixed(2)}`);
  });

  console.log('\n💡 Free Tier: 60 requests/minute, 1000 requests/day');
}

// Main execution
async function main() {
  try {
    // Check if Gemini package is installed
    try {
      require('@google/generative-ai');
    } catch (error) {
      console.log('❌ @google/generative-ai package not found');
      console.log('📦 Please install: npm install @google/generative-ai');
      process.exit(1);
    }

    const tester = new GeminiTester();
    await tester.runFullTest();

    calculateCosts();

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check GEMINI_API_KEY in .env');
    console.log('   2. Verify internet connection');
    console.log('   3. Check API quota limits');
    console.log('   4. Ensure @google/generative-ai is installed');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { GeminiTester };