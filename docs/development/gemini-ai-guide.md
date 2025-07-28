# 🤖 Hướng Dẫn Sử Dụng Gemini AI

## Tổng Quan

Gemini AI là giải pháp thay thế mạnh mẽ cho việc training AI model cục bộ. Thay vì phải huấn luyện mô hình machine learning phức tạp, bạn có thể sử dụng Google Gemini Pro để phân tích thị trường và đưa ra quyết định giao dịch thông minh.

## 🎯 Ưu Điểm Của Gemini AI

### ✅ So Với AI Training Cục Bộ

| Tiêu Chí | AI Training Cục Bộ | Gemini AI |
|----------|-------------------|----------|
| **Thời gian setup** | 2-3 giờ training | 5 phút setup |
| **Độ chính xác** | 15-30% (cần tune) | 70-85% ngay lập tức |
| **Tài nguyên máy** | CPU/GPU cao | Chỉ cần internet |
| **Cập nhật kiến thức** | Cần retrain | Tự động cập nhật |
| **Phân tích phức tạp** | Hạn chế | Rất mạnh |
| **Chi phí** | Miễn phí | ~$0.50/1M tokens |

### 🚀 Lợi Ích Chính

1. **Không Cần Training**: Bỏ qua hoàn toàn quá trình huấn luyện mô hình
2. **Độ Chính Xác Cao**: Gemini Pro có khả năng phân tích thị trường vượt trội
3. **Phân Tích Đa Chiều**: Kết hợp technical analysis, sentiment, và market context
4. **Cập Nhật Liên Tục**: Luôn có kiến thức mới nhất về thị trường
5. **Giải Thích Rõ Ràng**: Cung cấp lý do chi tiết cho mỗi quyết định

## 🔧 Cài Đặt và Cấu Hình

### Bước 1: Lấy API Key

1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Đăng nhập với tài khoản Google
3. Tạo API key mới
4. Copy API key

### Bước 2: Cấu Hình Environment

```bash
# Mở file .env
nano .env

# Thêm cấu hình Gemini
# Deprecated - use new configuration instead
# AI_METHOD=gemini

# New AI configuration
AI_PRIMARY_PROVIDER=external
EXTERNAL_AI_SERVICE=gemini
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-pro
GEMINI_TIMEOUT=30000
GEMINI_MAX_RETRIES=3
GEMINI_RATE_LIMIT=60
```

### Bước 3: Test Kết Nối

```bash
# Test Gemini AI integration
npm run test-gemini
```

## 📊 Cách Sử Dụng

### Sử Dụng Trực Tiếp Gemini AI

```typescript
import { GeminiPredictor } from './src/ai/GeminiPredictor';

const gemini = new GeminiPredictor({
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-pro',
  timeout: 30000
});

const marketData = {
  symbol: 'BTC-USDT',
  price: 45000,
  volume: 1500000,
  rsi: 65,
  macd: 0.15,
  sma20: 44800,
  sma50: 44200,
  timestamp: Date.now()
};

const prediction = await gemini.predict(marketData);
console.log(prediction);
// {
//   signal: 'BUY',
//   confidence: 75,
//   reasoning: 'RSI shows momentum, MACD bullish crossover...',
//   timeframe: '4-24h',
//   riskLevel: 'MEDIUM',
//   targetPrice: 46500,
//   stopLoss: 44200
// }
```

### Sử Dụng Hybrid AI (Khuyến Nghị)

```typescript
import { createAIPredictor } from './src/integrations/GeminiIntegration';

// Tự động chọn AI method dựa trên cấu hình
const hybridAI = createAIPredictor();

// Sẽ dùng Gemini nếu có API key, fallback về Local AI nếu cần
const prediction = await hybridAI.predict(marketData);
```

## 🎛️ Cấu Hình Nâng Cao

### Rate Limiting

```typescript
const gemini = new GeminiPredictor({
  apiKey: 'your-key',
  rateLimitPerMinute: 30, // Giảm xuống 30 requests/phút
  timeout: 45000 // Tăng timeout lên 45s
});
```

### Custom Model Settings

```typescript
const gemini = new GeminiPredictor({
  apiKey: 'your-key',
  model: 'gemini-pro', // hoặc 'gemini-pro-vision' cho tương lai
  maxRetries: 5 // Tăng số lần retry
});
```

## 💰 Quản Lý Chi Phí

### Ước Tính Chi Phí

| Tần Suất Prediction | Requests/Ngày | Chi Phí/Ngày | Chi Phí/Tháng |
|-------------------|---------------|-------------|---------------|
| 1 lần/giờ | 24 | $0.012 | $0.36 |
| 1 lần/5 phút | 288 | $0.144 | $4.32 |
| 1 lần/phút | 1440 | $0.720 | $21.60 |

### Tối Ưu Chi Phí

1. **Cache Predictions**: Lưu kết quả trong 5-10 phút
2. **Batch Requests**: Gộp nhiều symbol trong 1 request
3. **Smart Timing**: Chỉ predict khi có signal mạnh
4. **Rate Limiting**: Giới hạn số requests/phút

```typescript
// Ví dụ cache prediction
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

async function getCachedPrediction(symbol: string, marketData: any) {
  const cacheKey = `${symbol}-${Math.floor(Date.now() / CACHE_DURATION)}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const prediction = await gemini.predict(marketData);
  cache.set(cacheKey, prediction);
  
  return prediction;
}
```

## 🔄 Migration Từ Local AI

### Bước 1: Backup Cấu Hình Cũ

```bash
# Backup current AI settings
cp .env .env.backup
cp -r models/ models_backup/
```

### Bước 2: Cập Nhật Cấu Hình

```bash
# Trong .env
# New AI configuration (replaces AI_METHOD)
AI_PRIMARY_PROVIDER=external  # Use external AI services
EXTERNAL_AI_SERVICE=gemini    # Choose Gemini as external service
GEMINI_API_KEY=your_api_key_here
```

### Bước 3: Test Migration

```bash
# Test cả hai methods
npm run test-gemini

# Test bot với Gemini
npm run demo
```

### Bước 4: So Sánh Performance

```typescript
// Script so sánh
const localAI = new AIPredictor();
const geminiAI = new GeminiPredictor({ apiKey: 'your-key' });

const testData = [/* market data samples */];

for (const data of testData) {
  const localResult = await localAI.predict(data);
  const geminiResult = await geminiAI.predict(data);
  
  console.log('Local:', localResult);
  console.log('Gemini:', geminiResult);
  console.log('---');
}
```

## 🛡️ Bảo Mật và Best Practices

### API Key Security

```bash
# Đừng commit API key
echo "GEMINI_API_KEY=*" >> .gitignore

# Sử dụng environment variables
export GEMINI_API_KEY="your-key"
```

### Error Handling

```typescript
try {
  const prediction = await gemini.predict(marketData);
  // Sử dụng prediction
} catch (error) {
  // Fallback to local AI hoặc safe default
  const safePrediction = {
    signal: 'HOLD',
    confidence: 0.1,
    reasoning: 'API error, defaulting to HOLD for safety'
  };
}
```

### Rate Limiting

```typescript
// Implement exponential backoff
class RateLimitHandler {
  private retryDelay = 1000;
  
  async makeRequest(fn: () => Promise<any>) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('rate limit')) {
        await this.sleep(this.retryDelay);
        this.retryDelay *= 2; // Exponential backoff
        return this.makeRequest(fn);
      }
      throw error;
    }
  }
}
```

## 📈 Monitoring và Analytics

### Tracking Performance

```typescript
class GeminiAnalytics {
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    averageResponseTime: 0,
    costEstimate: 0
  };
  
  trackRequest(duration: number, success: boolean) {
    this.stats.totalRequests++;
    if (success) this.stats.successfulRequests++;
    
    // Update average response time
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime + duration) / 2;
    
    // Estimate cost (rough)
    this.stats.costEstimate += 0.0005; // ~$0.0005 per request
  }
  
  getReport() {
    return {
      ...this.stats,
      successRate: this.stats.successfulRequests / this.stats.totalRequests,
      estimatedMonthlyCost: this.stats.costEstimate * 30
    };
  }
}
```

## 🚀 Kết Luận

Gemini AI cung cấp một giải pháp mạnh mẽ và dễ sử dụng để thay thế cho việc training AI model cục bộ. Với độ chính xác cao và khả năng phân tích phức tạp, đây là lựa chọn tuyệt vời cho trading bot của bạn.

### Khuyến Nghị

1. **Bắt đầu với Hybrid Mode**: Sử dụng Gemini làm chính, Local AI làm fallback
2. **Monitor Chi Phí**: Theo dõi usage để tối ưu chi phí
3. **Test Thoroughly**: So sánh performance với local AI
4. **Implement Caching**: Giảm số API calls không cần thiết
5. **Security First**: Bảo vệ API key và implement proper error handling

### Các Lệnh Hữu Ích

```bash
# Test Gemini integration
npm run test-gemini

# Run bot với Gemini AI
# Using new configuration
AI_PRIMARY_PROVIDER=external EXTERNAL_AI_SERVICE=gemini npm run demo

# Switch back to local AI
AI_PRIMARY_PROVIDER=internal npm run demo

# Train local AI (backup option)
npm run train
```

---

**Lưu ý**: Gemini AI yêu cầu kết nối internet ổn định và có thể phát sinh chi phí. Hãy đọc kỹ [pricing của Google AI](https://ai.google.dev/pricing) trước khi sử dụng trong production.